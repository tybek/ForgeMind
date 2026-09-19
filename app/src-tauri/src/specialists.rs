use crate::ai::AIRequest;
use crate::compendium::{self, KnowledgeArea, KnowledgeEntry, KnowledgeProvenance, KnowledgeSource, KnowledgeStatus};
use crate::decisions::{self, Decision, DecisionStatus};
use crate::model_registry;
use crate::usage::TaskCategory;
use crate::workspace::{self, WorkspaceInspection};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::Path;

pub const AI_BEHAVIOR_DESIGNER_ID: &str = "ai_behavior_designer";
const MAX_KNOWLEDGE_ENTRIES: usize = 8;
const MAX_DECISIONS: usize = 6;
const MAX_SCENARIO_CHARS: usize = 4_000;
const MAX_SUMMARY_CHARS: usize = 1_200;
const MAX_ITEM_CHARS: usize = 600;
const MAX_LIST_ITEMS: usize = 5;
const MAX_TESTS: usize = 8;
const MAX_COMPLETION_TOKENS: u32 = 1_600;

const AI_BEHAVIOR_DESIGNER_PROMPT: &str = r#"You are ForgeMind's AI Behavior Designer, a game-AI and behavior-design specialist.
Use only the supplied project context, approved decisions, and user scenario. Respect approved decisions. Never invent project facts; put uncertain inferences in assumptions. Treat the scenario as transient task input, not durable truth.
Prefer implementable behavior rules and better decision quality over arbitrary stat inflation when the supplied context supports that principle. Identify predictable or exploitable behavior and suggest deterministic tests. Do not claim to simulate or verify runtime behavior.
Return exactly one concise JSON object with these fields and no others:
{"summary":"string","assumptions":["string"],"recommendations":["string"],"risks":["string"],"exploits":["string"],"openQuestions":["string"],"suggestedTests":["string"]}
Use at most 5 items in each list except suggestedTests, which allows at most 8. Return JSON only, with no markdown or explanation."#;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SpecialistTaskType {
    DesignBehavior,
    ReviewBehavior,
    CompetenceTiers,
    ReactionModel,
    ExploitAnalysis,
    BehaviorContract,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialistProfile {
    pub id: String,
    pub display_name: String,
    pub description: String,
    pub supported_task_types: Vec<SpecialistTaskType>,
    pub default_task_type: SpecialistTaskType,
    #[serde(skip)]
    pub system_prompt: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpecialistAnalysisRequest {
    pub root_path: String,
    pub project_id: String,
    pub profile_id: String,
    pub task_type: SpecialistTaskType,
    pub model_id: String,
    #[serde(default)]
    pub knowledge_entry_ids: Vec<String>,
    #[serde(default)]
    pub decision_ids: Vec<String>,
    pub scenario: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BehaviorDesignerResult {
    pub summary: String,
    pub assumptions: Vec<String>,
    pub recommendations: Vec<String>,
    pub risks: Vec<String>,
    pub exploits: Vec<String>,
    pub open_questions: Vec<String>,
    pub suggested_tests: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialistAnalysisResult {
    pub profile_id: String,
    pub task_type: SpecialistTaskType,
    pub selected_knowledge_entry_ids: Vec<String>,
    pub selected_decision_ids: Vec<String>,
    pub result: BehaviorDesignerResult,
    pub model: String,
    pub latency_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
}

#[derive(Clone, Debug)]
pub struct PreparedSpecialistRequest {
    pub ai_request: AIRequest,
    pub profile_id: String,
    pub task_type: SpecialistTaskType,
    pub selected_knowledge_entry_ids: Vec<String>,
    pub selected_decision_ids: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialistError {
    pub code: String,
    pub message: String,
}

impl SpecialistError {
    pub fn new(code: &str, message: &str) -> Self {
        Self { code: code.to_owned(), message: message.to_owned() }
    }

    fn invalid_request(message: &str) -> Self {
        Self::new("INVALID_SPECIALIST_REQUEST", message)
    }

    fn invalid_output() -> Self {
        Self::new(
            "INVALID_SPECIALIST_OUTPUT",
            "The AI response did not match the required AI Behavior Designer structure.",
        )
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PromptContext<'a> {
    task_type: SpecialistTaskType,
    selected_knowledge: Vec<PromptKnowledge<'a>>,
    approved_decisions: Vec<PromptDecision<'a>>,
    scenario: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PromptKnowledge<'a> {
    id: &'a str,
    area: KnowledgeArea,
    title: &'a str,
    statement: &'a str,
    status: KnowledgeStatus,
    provenance: KnowledgeProvenance,
    source: KnowledgeSource,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PromptDecision<'a> {
    id: &'a str,
    area: KnowledgeArea,
    title: &'a str,
    statement: &'a str,
    rationale: &'a str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawBehaviorDesignerResult {
    summary: String,
    assumptions: Vec<String>,
    recommendations: Vec<String>,
    risks: Vec<String>,
    exploits: Vec<String>,
    open_questions: Vec<String>,
    suggested_tests: Vec<String>,
}

pub fn profiles() -> Vec<SpecialistProfile> {
    vec![SpecialistProfile {
        id: AI_BEHAVIOR_DESIGNER_ID.to_owned(),
        display_name: "AI Behavior Designer".to_owned(),
        description: "Analyze and critique tactical enemy and NPC behavior using explicitly selected project context.".to_owned(),
        supported_task_types: vec![
            SpecialistTaskType::DesignBehavior,
            SpecialistTaskType::ReviewBehavior,
            SpecialistTaskType::CompetenceTiers,
            SpecialistTaskType::ReactionModel,
            SpecialistTaskType::ExploitAnalysis,
            SpecialistTaskType::BehaviorContract,
        ],
        default_task_type: SpecialistTaskType::DesignBehavior,
        system_prompt: AI_BEHAVIOR_DESIGNER_PROMPT.to_owned(),
    }]
}

pub fn profile(profile_id: &str) -> Result<SpecialistProfile, SpecialistError> {
    profiles()
        .into_iter()
        .find(|profile| profile.id == profile_id)
        .ok_or_else(|| SpecialistError::new("UNKNOWN_SPECIALIST_PROFILE", "The selected specialist profile is not available."))
}

pub fn task_category() -> TaskCategory {
    TaskCategory::AiBehavior
}

pub fn build_ai_request(request: &SpecialistAnalysisRequest) -> Result<PreparedSpecialistRequest, SpecialistError> {
    let specialist = profile(request.profile_id.trim())?;
    if !specialist.supported_task_types.contains(&request.task_type) {
        return Err(SpecialistError::invalid_request("The selected task type is not supported by this specialist."));
    }
    model_registry::enabled_model(request.model_id.trim())
        .map_err(|error| SpecialistError::new(error.code, &error.message))?;
    let scenario = request.scenario.trim();
    if scenario.is_empty() || scenario.chars().count() > MAX_SCENARIO_CHARS {
        return Err(SpecialistError::invalid_request("Scenario text must contain 1 to 4000 characters."));
    }
    validate_selection(&request.knowledge_entry_ids, MAX_KNOWLEDGE_ENTRIES, "Compendium entries")?;
    validate_selection(&request.decision_ids, MAX_DECISIONS, "Decisions")?;

    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let compendium = compendium::load(root)
        .map_err(|error| SpecialistError::new(&error.code, &error.message))?;
    let decisions = decisions::load(root)
        .map_err(|error| SpecialistError::new(&error.code, &error.message))?;

    let selected_knowledge = select_knowledge(compendium.as_ref(), &request.knowledge_entry_ids)?;
    let selected_decisions = select_decisions(decisions.as_ref(), &request.decision_ids)?;
    let prompt = serde_json::to_string(&PromptContext {
        task_type: request.task_type,
        selected_knowledge: selected_knowledge.iter().map(|entry| PromptKnowledge {
            id: &entry.id,
            area: entry.area,
            title: &entry.title,
            statement: &entry.statement,
            status: entry.status,
            provenance: entry.provenance,
            source: entry.source,
        }).collect(),
        approved_decisions: selected_decisions.iter().map(|decision| PromptDecision {
            id: &decision.id,
            area: decision.area,
            title: &decision.title,
            statement: &decision.statement,
            rationale: &decision.rationale,
        }).collect(),
        scenario,
    })
    .map_err(|_| SpecialistError::invalid_request("ForgeMind could not prepare the selected specialist context."))?;

    Ok(PreparedSpecialistRequest {
        ai_request: AIRequest {
            model: request.model_id.trim().to_owned(),
            system_prompt: Some(specialist.system_prompt),
            user_prompt: prompt,
            temperature: Some(0.2),
            max_tokens: Some(MAX_COMPLETION_TOKENS),
            reasoning_effort: Some("minimal".to_owned()),
        },
        profile_id: specialist.id,
        task_type: request.task_type,
        selected_knowledge_entry_ids: request.knowledge_entry_ids.clone(),
        selected_decision_ids: request.decision_ids.clone(),
    })
}

pub fn normalize_result(text: &str) -> Result<BehaviorDesignerResult, SpecialistError> {
    let raw: RawBehaviorDesignerResult = serde_json::from_str(text.trim()).map_err(|_| SpecialistError::invalid_output())?;
    validate_text(&raw.summary, MAX_SUMMARY_CHARS)?;
    validate_list(&raw.assumptions, MAX_LIST_ITEMS)?;
    validate_list(&raw.recommendations, MAX_LIST_ITEMS)?;
    validate_list(&raw.risks, MAX_LIST_ITEMS)?;
    validate_list(&raw.exploits, MAX_LIST_ITEMS)?;
    validate_list(&raw.open_questions, MAX_LIST_ITEMS)?;
    validate_list(&raw.suggested_tests, MAX_TESTS)?;
    Ok(BehaviorDesignerResult {
        summary: raw.summary.trim().to_owned(),
        assumptions: trim_list(raw.assumptions),
        recommendations: trim_list(raw.recommendations),
        risks: trim_list(raw.risks),
        exploits: trim_list(raw.exploits),
        open_questions: trim_list(raw.open_questions),
        suggested_tests: trim_list(raw.suggested_tests),
    })
}

fn verify_project(root: &Path, expected_project_id: &str) -> Result<(), SpecialistError> {
    match workspace::inspect(root).map_err(|_| SpecialistError::invalid_request("ForgeMind could not access the workspace."))? {
        WorkspaceInspection::Valid { project, .. } if project.project_id == expected_project_id => Ok(()),
        _ => Err(SpecialistError::invalid_request("AI Behavior Designer requires the active ForgeMind workspace identity.")),
    }
}

fn validate_selection(ids: &[String], maximum: usize, label: &str) -> Result<(), SpecialistError> {
    let mut unique = HashSet::new();
    if ids.len() > maximum || ids.iter().any(|id| id.trim().is_empty() || !unique.insert(id)) {
        return Err(SpecialistError::invalid_request(&format!("Select at most {maximum} unique {label}.")));
    }
    Ok(())
}

fn select_knowledge(document: Option<&compendium::CompendiumDocument>, ids: &[String]) -> Result<Vec<KnowledgeEntry>, SpecialistError> {
    let entries = document.map(|document| document.entries.as_slice()).unwrap_or_default();
    ids.iter().map(|id| {
        let entry = entries.iter().find(|entry| &entry.id == id)
            .ok_or_else(|| SpecialistError::invalid_request("A selected Compendium entry no longer exists."))?;
        if entry.status == KnowledgeStatus::Deprecated {
            return Err(SpecialistError::invalid_request("Deprecated Compendium entries cannot be supplied as current context."));
        }
        Ok(entry.clone())
    }).collect()
}

fn select_decisions(document: Option<&decisions::DecisionsDocument>, ids: &[String]) -> Result<Vec<Decision>, SpecialistError> {
    let available = document.map(|document| document.decisions.as_slice()).unwrap_or_default();
    ids.iter().map(|id| {
        let decision = available.iter().find(|decision| &decision.id == id)
            .ok_or_else(|| SpecialistError::invalid_request("A selected Decision no longer exists."))?;
        if decision.status != DecisionStatus::Approved {
            return Err(SpecialistError::invalid_request("Only approved Decisions may be supplied as authoritative context."));
        }
        Ok(decision.clone())
    }).collect()
}

fn validate_text(value: &str, maximum: usize) -> Result<(), SpecialistError> {
    let length = value.trim().chars().count();
    if length == 0 || length > maximum { return Err(SpecialistError::invalid_output()); }
    Ok(())
}

fn validate_list(items: &[String], maximum: usize) -> Result<(), SpecialistError> {
    if items.len() > maximum || items.iter().any(|item| validate_text(item, MAX_ITEM_CHARS).is_err()) {
        return Err(SpecialistError::invalid_output());
    }
    Ok(())
}

fn trim_list(items: Vec<String>) -> Vec<String> {
    items.into_iter().map(|item| item.trim().to_owned()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compendium::{CreateKnowledgeEntryRequest, KnowledgeArea, KnowledgeStatus};
    use crate::decisions::{CreateDecisionRequest, DecisionActionRequest};
    use serde_json::json;
    use tempfile::TempDir;

    fn workspace() -> (TempDir, String) {
        let directory = TempDir::new().unwrap();
        let WorkspaceInspection::Valid { project, .. } = workspace::initialize(directory.path()).unwrap() else { panic!("valid workspace") };
        (directory, project.project_id)
    }

    fn add_knowledge(root: &Path, project_id: &str, title: &str) -> KnowledgeEntry {
        compendium::create_entry(CreateKnowledgeEntryRequest {
            root_path: root.display().to_string(), project_id: project_id.to_owned(), area: KnowledgeArea::Systems,
            title: title.to_owned(), statement: format!("{title} statement."), status: KnowledgeStatus::Direction,
        }).unwrap().entries.into_iter().find(|entry| entry.title == title).unwrap()
    }

    fn add_decision(root: &Path, project_id: &str, approved: bool) -> Decision {
        let created = decisions::create(CreateDecisionRequest {
            root_path: root.display().to_string(), project_id: project_id.to_owned(), title: "Perception uncertainty".to_owned(),
            statement: "Enemies act only on available information.".to_owned(), rationale: "Avoid omniscience.".to_owned(),
            area: KnowledgeArea::Systems, author: "Local User".to_owned(), supersedes_decision_id: None, related_knowledge_entry_ids: Vec::new(),
        }).unwrap();
        if approved {
            decisions::approve(DecisionActionRequest { root_path: root.display().to_string(), project_id: project_id.to_owned(), decision_id: created.decisions[0].id.clone() }).unwrap().decisions[0].clone()
        } else { created.decisions[0].clone() }
    }

    fn request(root: &Path, project_id: &str) -> SpecialistAnalysisRequest {
        SpecialistAnalysisRequest { root_path: root.display().to_string(), project_id: project_id.to_owned(), profile_id: AI_BEHAVIOR_DESIGNER_ID.to_owned(),
            task_type: SpecialistTaskType::ReactionModel, model_id: "deepseek-ai/DeepSeek-V4.1-Flash".to_owned(),
            knowledge_entry_ids: Vec::new(), decision_ids: Vec::new(), scenario: "A guard hears a sound without visual confirmation.".to_owned() }
    }

    fn valid_output() -> String {
        json!({"summary":"Investigate without assuming a target.","assumptions":["The sound is audible."],"recommendations":["Orient toward the sound."],
            "risks":["Immediate pursuit appears omniscient."],"exploits":["Repeated sounds may pin the guard."],"openQuestions":["How long is memory retained?"],
            "suggestedTests":["Verify no target is acquired from sound alone."]}).to_string()
    }

    #[test] fn valid_profile_lookup() { assert_eq!(profile(AI_BEHAVIOR_DESIGNER_ID).unwrap().display_name, "AI Behavior Designer"); }
    #[test] fn unknown_profile_is_rejected() { assert_eq!(profile("unknown").unwrap_err().code, "UNKNOWN_SPECIALIST_PROFILE"); }
    #[test] fn valid_task_type_deserializes() { assert_eq!(serde_json::from_str::<SpecialistTaskType>("\"REACTION_MODEL\"").unwrap(), SpecialistTaskType::ReactionModel); }
    #[test] fn invalid_task_type_is_rejected() { assert!(serde_json::from_str::<SpecialistTaskType>("\"AUTONOMOUS_AGENT\"").is_err()); }

    #[test]
    fn prompt_uses_only_selected_context_and_excludes_unrelated_entries() {
        let (directory, project_id) = workspace();
        let selected = add_knowledge(directory.path(), &project_id, "Selected perception");
        add_knowledge(directory.path(), &project_id, "Unrelated economy");
        let mut input = request(directory.path(), &project_id);
        input.knowledge_entry_ids.push(selected.id);
        let prepared = build_ai_request(&input).unwrap();
        assert!(prepared.ai_request.user_prompt.contains("Selected perception"));
        assert!(!prepared.ai_request.user_prompt.contains("Unrelated economy"));
    }

    #[test]
    fn only_approved_decisions_are_authoritative_context() {
        let (directory, project_id) = workspace();
        let proposed = add_decision(directory.path(), &project_id, false);
        let mut input = request(directory.path(), &project_id);
        input.decision_ids.push(proposed.id);
        assert_eq!(build_ai_request(&input).unwrap_err().code, "INVALID_SPECIALIST_REQUEST");
    }

    #[test]
    fn approved_decision_is_included() {
        let (directory, project_id) = workspace();
        let approved = add_decision(directory.path(), &project_id, true);
        let mut input = request(directory.path(), &project_id);
        input.decision_ids.push(approved.id);
        assert!(build_ai_request(&input).unwrap().ai_request.user_prompt.contains("Avoid omniscience."));
    }

    #[test] fn structured_output_validates() { assert_eq!(normalize_result(&valid_output()).unwrap().recommendations.len(), 1); }
    #[test]
    fn oversized_list_is_rejected() {
        let mut value: serde_json::Value = serde_json::from_str(&valid_output()).unwrap();
        value["recommendations"] = json!(["1", "2", "3", "4", "5", "6"]);
        assert_eq!(normalize_result(&value.to_string()).unwrap_err().code, "INVALID_SPECIALIST_OUTPUT");
    }
    #[test] fn malformed_json_is_rejected() { assert_eq!(normalize_result("not json").unwrap_err().code, "INVALID_SPECIALIST_OUTPUT"); }
    #[test]
    fn unknown_fields_are_rejected() {
        let mut value: serde_json::Value = serde_json::from_str(&valid_output()).unwrap();
        value["secret"] = json!("should not pass");
        assert_eq!(normalize_result(&value.to_string()).unwrap_err().code, "INVALID_SPECIALIST_OUTPUT");
    }
    #[test] fn specialist_usage_category_is_ai_behavior() { assert_eq!(task_category(), TaskCategory::AiBehavior); }
    #[test]
    fn normalized_output_contains_no_secret_fields() {
        let serialized = serde_json::to_string(&normalize_result(&valid_output()).unwrap()).unwrap();
        assert!(!serialized.contains("apiKey")); assert!(!serialized.contains("authorization"));
    }
    #[test]
    fn hidden_reasoning_is_not_exposed() {
        let mut value: serde_json::Value = serde_json::from_str(&valid_output()).unwrap();
        value["reasoning"] = json!("hidden chain");
        assert!(normalize_result(&value.to_string()).is_err());
    }
    #[test]
    fn request_is_bounded_and_uses_minimal_reasoning() {
        let (directory, project_id) = workspace();
        let prepared = build_ai_request(&request(directory.path(), &project_id)).unwrap();
        assert_eq!(prepared.ai_request.max_tokens, Some(1_600));
        assert_eq!(prepared.ai_request.reasoning_effort.as_deref(), Some("minimal"));
    }
}
