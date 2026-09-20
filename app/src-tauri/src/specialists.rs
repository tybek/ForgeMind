use crate::ai::{AIError, AIRequest, MAX_COMPLETION_TOKENS};
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

const AI_BEHAVIOR_DESIGNER_PROMPT: &str = r#"You are ForgeMind's AI Behavior Designer, a game-AI and behavior-design specialist.
Use only the supplied project context, approved decisions, and user scenario. Respect approved decisions. Never invent project facts; put uncertain inferences in assumptions. Treat the scenario as transient task input, not durable truth.
Prefer implementable behavior rules and better decision quality over arbitrary stat inflation when the supplied context supports that principle. Identify predictable or exploitable behavior and suggest deterministic tests. Do not claim to simulate or verify runtime behavior.
Keep the summary and every list item concise; each list item should normally be no more than one or two sentences. Do not repeat the scenario or project context. Do not repeat the same explanation across sections or restate a recommendation as a risk or exploit. Prefer implementable behavior rules over explanatory prose.
Return exactly one concise JSON object using this shape and exact field names:
{"summary":"Concise summary.","assumptions":[],"recommendations":[],"risks":[],"exploits":[],"openQuestions":[],"suggestedTests":[]}
Return one JSON object only: no markdown, code fences, or commentary before or after it. Arrays contain concise strings only; return [] when a section has no items. Use at most 5 items in each list except suggestedTests, which allows at most 8."#;

const REACTION_MODEL_PROMPT: &str = r#"For REACTION_MODEL, produce a compact deterministic state/rule model. Prioritize: (1) stimulus representation, (2) confidence and uncertainty, (3) escalation, (4) investigation, (5) information sharing, (6) decay and de-escalation, (7) tier differences, and (8) deterministic tests. Do not write long narrative examples. Omit padding and return [] for any section with nothing useful."#;

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
    pub task_guidance: Vec<SpecialistTaskGuidance>,
    pub max_run_completion_tokens: u32,
    #[serde(skip)]
    pub system_prompt: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialistTaskGuidance {
    pub task_type: SpecialistTaskType,
    pub preferred_completion_tokens: u32,
    pub recommended_compendium_areas: Vec<KnowledgeArea>,
    pub preferred_decision_areas: Vec<KnowledgeArea>,
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
    #[serde(default)]
    pub max_completion_tokens: Option<u32>,
    pub scenario: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BehaviorDesignerResult {
    pub summary: String,
    pub assumptions: Vec<String>,
    pub recommendations: Vec<String>,
    pub risks: Vec<String>,
    pub exploits: Vec<String>,
    pub open_questions: Vec<String>,
    pub suggested_tests: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpecialistNormalizationNotice {
    pub field: String,
    pub returned_items: usize,
    pub retained_items: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NormalizedSpecialistResult {
    pub result: BehaviorDesignerResult,
    pub normalization_notices: Vec<SpecialistNormalizationNotice>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialistAnalysisResult {
    pub profile_id: String,
    pub task_type: SpecialistTaskType,
    pub selected_knowledge_entry_ids: Vec<String>,
    pub selected_decision_ids: Vec<String>,
    pub result: BehaviorDesignerResult,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub normalization_notices: Vec<SpecialistNormalizationNotice>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub history_warning: Option<SpecialistHistoryWarning>,
    pub preferred_task_budget: u32,
    pub effective_completion_budget: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub known_model_max_completion_tokens: Option<u32>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialistHistoryWarning {
    pub code: String,
    pub message: String,
}

#[derive(Clone, Debug)]
pub struct PreparedSpecialistRequest {
    pub ai_request: AIRequest,
    pub profile_id: String,
    pub task_type: SpecialistTaskType,
    pub selected_knowledge_entry_ids: Vec<String>,
    pub selected_decision_ids: Vec<String>,
    pub budget: SpecialistBudgetResolution,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SpecialistBudgetResolution {
    pub preferred_task_budget: u32,
    pub configured_completion_budget: u32,
    pub effective_completion_budget: u32,
    pub known_model_max_completion_tokens: Option<u32>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialistError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diagnostics: Option<SpecialistDiagnostics>,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpecialistDiagnostics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readable_text_present: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub json_extraction_succeeded: Option<bool>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub missing_fields: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub invalid_field_types: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub unknown_fields: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_bound_exceeded: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation_issue: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_status: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_error_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rejected_parameter: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preferred_task_budget: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub configured_completion_budget: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_completion_budget: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub known_model_max_completion_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning_requested: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub structured_output_requested: Option<bool>,
}

impl SpecialistError {
    pub fn new(code: &str, message: &str) -> Self {
        Self { code: code.to_owned(), message: message.to_owned(), diagnostics: None }
    }

    fn invalid_request(message: &str) -> Self {
        Self::new("INVALID_SPECIALIST_REQUEST", message)
    }

    fn with_diagnostics(mut self, diagnostics: SpecialistDiagnostics) -> Self {
        self.diagnostics = Some(diagnostics);
        self
    }

    pub fn with_request_context(
        mut self,
        budget: SpecialistBudgetResolution,
        model_id: &str,
    ) -> Self {
        let diagnostics = self.diagnostics.get_or_insert_with(SpecialistDiagnostics::default);
        diagnostics.preferred_task_budget = Some(budget.preferred_task_budget);
        diagnostics.configured_completion_budget = Some(budget.configured_completion_budget);
        diagnostics.effective_completion_budget = Some(budget.effective_completion_budget);
        diagnostics.known_model_max_completion_tokens = budget.known_model_max_completion_tokens;
        diagnostics.model_id = Some(model_id.to_owned());
        diagnostics.reasoning_requested = Some(true);
        diagnostics.structured_output_requested = Some(false);
        self
    }

    pub fn from_ai_error(
        error: AIError,
        budget: SpecialistBudgetResolution,
        model_id: &str,
    ) -> Self {
        let diagnostics = error.diagnostics.map(|provider| SpecialistDiagnostics {
            finish_reason: provider.finish_reason,
            readable_text_present: Some(provider.message_content_present || provider.refusal_present),
            http_status: provider.http_status,
            provider_error_code: provider.provider_error_code,
            provider_error_type: provider.provider_error_type,
            rejected_parameter: provider.rejected_parameter,
            preferred_task_budget: Some(budget.preferred_task_budget),
            configured_completion_budget: Some(budget.configured_completion_budget),
            effective_completion_budget: Some(budget.effective_completion_budget),
            known_model_max_completion_tokens: budget.known_model_max_completion_tokens,
            model_id: Some(model_id.to_owned()),
            reasoning_requested: Some(true),
            structured_output_requested: Some(false),
            ..SpecialistDiagnostics::default()
        });
        Self { code: error.code, message: error.message, diagnostics }
            .with_request_context(budget, model_id)
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
    #[serde(default)]
    assumptions: Vec<String>,
    #[serde(default)]
    recommendations: Vec<String>,
    #[serde(default)]
    risks: Vec<String>,
    #[serde(default)]
    exploits: Vec<String>,
    #[serde(default)]
    open_questions: Vec<String>,
    #[serde(default)]
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
        task_guidance: task_guidance(),
        max_run_completion_tokens: MAX_COMPLETION_TOKENS,
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

pub fn completion_budget(task_type: SpecialistTaskType) -> u32 {
    match task_type {
        SpecialistTaskType::DesignBehavior | SpecialistTaskType::ReviewBehavior => 3_200,
        SpecialistTaskType::CompetenceTiers => 3_400,
        SpecialistTaskType::ReactionModel => 4_600,
        SpecialistTaskType::ExploitAnalysis => 3_800,
        SpecialistTaskType::BehaviorContract => 5_200,
    }
}

pub fn resolve_budget(
    task_type: SpecialistTaskType,
    model: &model_registry::ModelEntry,
    user_override: Option<u32>,
) -> Result<SpecialistBudgetResolution, SpecialistError> {
    let preferred = completion_budget(task_type);
    let known_model_max = model.capabilities.max_completion_tokens;
    let configured = user_override.unwrap_or(preferred);
    if configured == 0 || configured > MAX_COMPLETION_TOKENS {
        return Err(SpecialistError::invalid_request(
            "Max completion tokens must be within ForgeMind's safe run bound.",
        ));
    }
    if user_override.is_some() && known_model_max.is_some_and(|maximum| configured > maximum) {
        return Err(SpecialistError::invalid_request(
            "Max completion tokens exceed the selected model's configured limit.",
        ));
    }
    let effective = if user_override.is_some() {
        configured
    } else {
        known_model_max.map_or(configured, |maximum| configured.min(maximum))
    };
    Ok(SpecialistBudgetResolution {
        preferred_task_budget: preferred,
        configured_completion_budget: configured,
        effective_completion_budget: effective,
        known_model_max_completion_tokens: known_model_max,
    })
}

fn task_specific_prompt(task_type: SpecialistTaskType) -> Option<&'static str> {
    match task_type {
        SpecialistTaskType::ReactionModel => Some(REACTION_MODEL_PROMPT),
        _ => None,
    }
}

pub fn task_guidance() -> Vec<SpecialistTaskGuidance> {
    use KnowledgeArea::{Constraints, GameVision, PlayerExperience, Systems, Technical};
    vec![
        SpecialistTaskGuidance { task_type: SpecialistTaskType::DesignBehavior, preferred_completion_tokens: completion_budget(SpecialistTaskType::DesignBehavior), recommended_compendium_areas: vec![GameVision, PlayerExperience, Systems], preferred_decision_areas: vec![GameVision, Systems] },
        SpecialistTaskGuidance { task_type: SpecialistTaskType::ReviewBehavior, preferred_completion_tokens: completion_budget(SpecialistTaskType::ReviewBehavior), recommended_compendium_areas: vec![PlayerExperience, Systems, Constraints], preferred_decision_areas: vec![Systems, Constraints] },
        SpecialistTaskGuidance { task_type: SpecialistTaskType::CompetenceTiers, preferred_completion_tokens: completion_budget(SpecialistTaskType::CompetenceTiers), recommended_compendium_areas: vec![GameVision, PlayerExperience, Systems], preferred_decision_areas: vec![GameVision, PlayerExperience, Systems] },
        SpecialistTaskGuidance { task_type: SpecialistTaskType::ReactionModel, preferred_completion_tokens: completion_budget(SpecialistTaskType::ReactionModel), recommended_compendium_areas: vec![PlayerExperience, Systems], preferred_decision_areas: vec![PlayerExperience, Systems] },
        SpecialistTaskGuidance { task_type: SpecialistTaskType::ExploitAnalysis, preferred_completion_tokens: completion_budget(SpecialistTaskType::ExploitAnalysis), recommended_compendium_areas: vec![PlayerExperience, Systems, Constraints], preferred_decision_areas: vec![PlayerExperience, Systems, Constraints] },
        SpecialistTaskGuidance { task_type: SpecialistTaskType::BehaviorContract, preferred_completion_tokens: completion_budget(SpecialistTaskType::BehaviorContract), recommended_compendium_areas: vec![Systems, Technical, Constraints], preferred_decision_areas: vec![Systems, Technical, Constraints] },
    ]
}

pub fn build_ai_request(request: &SpecialistAnalysisRequest) -> Result<PreparedSpecialistRequest, SpecialistError> {
    let specialist = profile(request.profile_id.trim())?;
    if !specialist.supported_task_types.contains(&request.task_type) {
        return Err(SpecialistError::invalid_request("The selected task type is not supported by this specialist."));
    }
    let model = model_registry::enabled_model(request.model_id.trim())
        .map_err(|error| SpecialistError::new(error.code, &error.message))?;
    let budget = resolve_budget(request.task_type, &model, request.max_completion_tokens)?;
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

    let system_prompt = task_specific_prompt(request.task_type)
        .map(|instruction| format!("{}\n\n{}", specialist.system_prompt, instruction))
        .unwrap_or(specialist.system_prompt);

    Ok(PreparedSpecialistRequest {
        ai_request: AIRequest {
            model: request.model_id.trim().to_owned(),
            system_prompt: Some(system_prompt),
            user_prompt: prompt,
            temperature: Some(0.2),
            max_tokens: Some(budget.effective_completion_budget),
            reasoning_effort: Some("minimal".to_owned()),
        },
        profile_id: specialist.id,
        task_type: request.task_type,
        selected_knowledge_entry_ids: request.knowledge_entry_ids.clone(),
        selected_decision_ids: request.decision_ids.clone(),
        budget,
    })
}

pub fn normalize_result(text: &str) -> Result<BehaviorDesignerResult, SpecialistError> {
    normalize_result_with_finish_reason(text, None)
}

pub fn normalize_result_with_finish_reason(
    text: &str,
    finish_reason: Option<&str>,
) -> Result<BehaviorDesignerResult, SpecialistError> {
    normalize_result_with_notices(text, finish_reason).map(|normalized| normalized.result)
}

pub fn normalize_result_with_notices(
    text: &str,
    finish_reason: Option<&str>,
) -> Result<NormalizedSpecialistResult, SpecialistError> {
    let (candidate, extraction_succeeded) = match extract_single_json_object(text) {
        Ok(candidate) => (candidate, true),
        Err(ExtractionError::MultipleObjects) => {
            return Err(invalid_json(
                finish_reason,
                false,
                "The AI response contained multiple JSON objects, so ForgeMind could not choose one safely.",
            ));
        }
        Err(ExtractionError::NoObject | ExtractionError::UnbalancedObject) => {
            return Err(invalid_json(
                finish_reason,
                false,
                "The AI response did not contain one complete JSON object.",
            ));
        }
        Err(ExtractionError::NonObjectRoot) => {
            return Err(schema_error(
                finish_reason,
                SpecialistDiagnostics {
                    readable_text_present: Some(true),
                    json_extraction_succeeded: Some(false),
                    invalid_field_types: vec!["$root".to_owned()],
                    ..diagnostics_for_finish_reason(finish_reason)
                },
            ));
        }
    };

    let mut value: serde_json::Value = serde_json::from_str(candidate).map_err(|_| {
        invalid_json(
            finish_reason,
            extraction_succeeded,
            "The extracted specialist response was not valid JSON.",
        )
    })?;
    let object = value.as_object_mut().ok_or_else(|| schema_error(
        finish_reason,
        SpecialistDiagnostics {
            readable_text_present: Some(true),
            json_extraction_succeeded: Some(true),
            invalid_field_types: vec!["$root".to_owned()],
            ..diagnostics_for_finish_reason(finish_reason)
        },
    ))?;

    normalize_alias(object, "open_questions", "openQuestions", finish_reason)?;
    normalize_alias(object, "suggested_tests", "suggestedTests", finish_reason)?;
    validate_schema_shape(object, finish_reason)?;

    let raw: RawBehaviorDesignerResult = serde_json::from_value(value).map_err(|_| schema_error(
        finish_reason,
        SpecialistDiagnostics {
            readable_text_present: Some(true),
            json_extraction_succeeded: Some(true),
            validation_issue: Some("schema_deserialization_failed".to_owned()),
            ..diagnostics_for_finish_reason(finish_reason)
        },
    ))?;
    validate_output_text("summary", &raw.summary, MAX_SUMMARY_CHARS, finish_reason)?;
    let (assumptions, assumptions_notice) =
        normalize_output_list("assumptions", raw.assumptions, MAX_LIST_ITEMS, finish_reason)?;
    let (recommendations, recommendations_notice) = normalize_output_list(
        "recommendations",
        raw.recommendations,
        MAX_LIST_ITEMS,
        finish_reason,
    )?;
    let (risks, risks_notice) =
        normalize_output_list("risks", raw.risks, MAX_LIST_ITEMS, finish_reason)?;
    let (exploits, exploits_notice) =
        normalize_output_list("exploits", raw.exploits, MAX_LIST_ITEMS, finish_reason)?;
    let (open_questions, open_questions_notice) = normalize_output_list(
        "openQuestions",
        raw.open_questions,
        MAX_LIST_ITEMS,
        finish_reason,
    )?;
    let (suggested_tests, suggested_tests_notice) = normalize_output_list(
        "suggestedTests",
        raw.suggested_tests,
        MAX_TESTS,
        finish_reason,
    )?;
    let normalization_notices = [
        assumptions_notice,
        recommendations_notice,
        risks_notice,
        exploits_notice,
        open_questions_notice,
        suggested_tests_notice,
    ]
    .into_iter()
    .flatten()
    .collect();
    Ok(NormalizedSpecialistResult {
        result: BehaviorDesignerResult {
            summary: raw.summary.trim().to_owned(),
            assumptions,
            recommendations,
            risks,
            exploits,
            open_questions,
            suggested_tests,
        },
        normalization_notices,
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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ExtractionError {
    NoObject,
    MultipleObjects,
    NonObjectRoot,
    UnbalancedObject,
}

fn extract_single_json_object(text: &str) -> Result<&str, ExtractionError> {
    let trimmed = text.trim();
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
        return if value.is_object() { Ok(trimmed) } else { Err(ExtractionError::NonObjectRoot) };
    }
    let bytes = trimmed.as_bytes();
    let mut candidates = Vec::new();
    let mut start = None;
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;

    for (index, byte) in bytes.iter().enumerate() {
        if start.is_none() {
            match byte {
                b'{' => { start = Some(index); depth = 1; }
                b'}' => return Err(ExtractionError::UnbalancedObject),
                _ => {}
            }
            continue;
        }
        if in_string {
            if escaped { escaped = false; }
            else if *byte == b'\\' { escaped = true; }
            else if *byte == b'"' { in_string = false; }
            continue;
        }
        match byte {
            b'"' => in_string = true,
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    let object_start = start.take().expect("object start exists");
                    candidates.push((object_start, index + 1));
                }
            }
            _ => {}
        }
    }

    if start.is_some() || in_string { return Err(ExtractionError::UnbalancedObject); }
    match candidates.as_slice() {
        [] => Err(ExtractionError::NoObject),
        [(start, end)] => Ok(&trimmed[*start..*end]),
        _ => Err(ExtractionError::MultipleObjects),
    }
}

fn normalize_alias(
    object: &mut serde_json::Map<String, serde_json::Value>,
    alias: &str,
    canonical: &str,
    finish_reason: Option<&str>,
) -> Result<(), SpecialistError> {
    if object.contains_key(alias) && object.contains_key(canonical) {
        return Err(schema_error(finish_reason, SpecialistDiagnostics {
            readable_text_present: Some(true),
            json_extraction_succeeded: Some(true),
            validation_issue: Some(format!("duplicate_alias:{canonical}")),
            ..diagnostics_for_finish_reason(finish_reason)
        }));
    }
    if let Some(value) = object.remove(alias) { object.insert(canonical.to_owned(), value); }
    Ok(())
}

fn validate_schema_shape(
    object: &serde_json::Map<String, serde_json::Value>,
    finish_reason: Option<&str>,
) -> Result<(), SpecialistError> {
    const LIST_FIELDS: [&str; 6] = ["assumptions", "recommendations", "risks", "exploits", "openQuestions", "suggestedTests"];
    let mut diagnostics = SpecialistDiagnostics {
        readable_text_present: Some(true),
        json_extraction_succeeded: Some(true),
        ..diagnostics_for_finish_reason(finish_reason)
    };
    let allowed: HashSet<&str> = std::iter::once("summary").chain(LIST_FIELDS).collect();
    diagnostics.unknown_fields = object.keys().filter(|key| !allowed.contains(key.as_str())).cloned().collect();
    diagnostics.unknown_fields.sort();
    if !object.contains_key("summary") { diagnostics.missing_fields.push("summary".to_owned()); }
    if object.get("summary").is_some_and(|value| !value.is_string()) { diagnostics.invalid_field_types.push("summary".to_owned()); }
    for field in LIST_FIELDS {
        if let Some(value) = object.get(field) {
            if !value.as_array().is_some_and(|items| items.iter().all(serde_json::Value::is_string)) {
                diagnostics.invalid_field_types.push(field.to_owned());
            }
        }
    }
    if diagnostics.missing_fields.is_empty()
        && diagnostics.invalid_field_types.is_empty()
        && diagnostics.unknown_fields.is_empty() { Ok(()) }
    else { Err(schema_error(finish_reason, diagnostics)) }
}

fn validate_output_text(field: &str, value: &str, maximum: usize, finish_reason: Option<&str>) -> Result<(), SpecialistError> {
    let length = value.trim().chars().count();
    if length == 0 || length > maximum {
        return Err(schema_error(finish_reason, SpecialistDiagnostics {
            readable_text_present: Some(true),
            json_extraction_succeeded: Some(true),
            validation_issue: Some(format!("invalid_text:{field}")),
            ..diagnostics_for_finish_reason(finish_reason)
        }));
    }
    Ok(())
}

fn normalize_output_list(
    field: &str,
    mut items: Vec<String>,
    maximum: usize,
    finish_reason: Option<&str>,
) -> Result<(Vec<String>, Option<SpecialistNormalizationNotice>), SpecialistError> {
    if items.iter().any(|item| item.trim().is_empty() || item.trim().chars().count() > MAX_ITEM_CHARS) {
        return Err(schema_error(finish_reason, SpecialistDiagnostics {
            readable_text_present: Some(true),
            json_extraction_succeeded: Some(true),
            validation_issue: Some(format!("invalid_list_item:{field}")),
            ..diagnostics_for_finish_reason(finish_reason)
        }));
    }
    let returned_items = items.len();
    items.truncate(maximum);
    let notice = (returned_items > maximum).then(|| SpecialistNormalizationNotice {
        field: field.to_owned(),
        returned_items,
        retained_items: maximum,
    });
    Ok((trim_list(items), notice))
}

pub fn valid_normalization_notices(
    result: &BehaviorDesignerResult,
    notices: &[SpecialistNormalizationNotice],
) -> bool {
    let mut fields = HashSet::new();
    notices.iter().all(|notice| {
        let expected = match notice.field.as_str() {
            "assumptions" => Some((MAX_LIST_ITEMS, result.assumptions.len())),
            "recommendations" => Some((MAX_LIST_ITEMS, result.recommendations.len())),
            "risks" => Some((MAX_LIST_ITEMS, result.risks.len())),
            "exploits" => Some((MAX_LIST_ITEMS, result.exploits.len())),
            "openQuestions" => Some((MAX_LIST_ITEMS, result.open_questions.len())),
            "suggestedTests" => Some((MAX_TESTS, result.suggested_tests.len())),
            _ => None,
        };
        expected.is_some_and(|(maximum, actual)| {
            fields.insert(notice.field.as_str())
                && notice.returned_items > maximum
                && notice.retained_items == maximum
                && actual == maximum
        })
    })
}

fn diagnostics_for_finish_reason(finish_reason: Option<&str>) -> SpecialistDiagnostics {
    SpecialistDiagnostics { finish_reason: finish_reason.map(str::to_owned), ..SpecialistDiagnostics::default() }
}

fn invalid_json(finish_reason: Option<&str>, extraction_succeeded: bool, message: &str) -> SpecialistError {
    let diagnostics = SpecialistDiagnostics {
        readable_text_present: Some(true),
        json_extraction_succeeded: Some(extraction_succeeded),
        ..diagnostics_for_finish_reason(finish_reason)
    };
    if finish_reason == Some("length") {
        SpecialistError::new("OUTPUT_TRUNCATED", "The specialist response reached its output-token limit before returning one complete JSON object.")
            .with_diagnostics(diagnostics)
    } else {
        SpecialistError::new("INVALID_JSON", message).with_diagnostics(diagnostics)
    }
}

fn schema_error(finish_reason: Option<&str>, diagnostics: SpecialistDiagnostics) -> SpecialistError {
    if finish_reason == Some("length") && !diagnostics.missing_fields.is_empty() {
        SpecialistError::new("OUTPUT_TRUNCATED", "The specialist response reached its output-token limit before completing the required structure.")
            .with_diagnostics(diagnostics)
    } else {
        SpecialistError::new("INVALID_SPECIALIST_SCHEMA", "The AI response JSON did not match the required AI Behavior Designer schema.")
            .with_diagnostics(diagnostics)
    }
}

fn trim_list(items: Vec<String>) -> Vec<String> {
    items.into_iter().map(|item| item.trim().to_owned()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compendium::{CreateKnowledgeEntryRequest, KnowledgeArea, KnowledgeStatus};
    use crate::decisions::{CreateDecisionRequest, DecisionActionRequest};
    use crate::model_registry::{ModelCapabilities, ModelEntry};
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
            knowledge_entry_ids: Vec::new(), decision_ids: Vec::new(), max_completion_tokens: None,
            scenario: "A guard hears a sound without visual confirmation.".to_owned() }
    }

    fn valid_output() -> String {
        json!({"summary":"Investigate without assuming a target.","assumptions":["The sound is audible."],"recommendations":["Orient toward the sound."],
            "risks":["Immediate pursuit appears omniscient."],"exploits":["Repeated sounds may pin the guard."],"openQuestions":["How long is memory retained?"],
            "suggestedTests":["Verify no target is acquired from sound alone."]}).to_string()
    }

    fn model_with_limit(max_completion_tokens: Option<u32>) -> ModelEntry {
        ModelEntry {
            provider: "test-provider".to_owned(),
            model_id: "test/model".to_owned(),
            display_name: "Test Model".to_owned(),
            family: "test".to_owned(),
            vendor: None,
            category: None,
            availability: "configured".to_owned(),
            pricing: None,
            notes: None,
            capabilities: ModelCapabilities {
                max_completion_tokens,
                supports_reasoning_effort: Some(true),
                supports_structured_output: None,
            },
            enabled: true,
        }
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

    #[test]
    fn canonical_structured_output_validates() {
        assert_eq!(normalize_result(&valid_output()).unwrap().recommendations.len(), 1);
    }

    #[test]
    fn fenced_json_is_safely_normalized() {
        let output = format!("```json\n{}\n```", valid_output());
        assert_eq!(normalize_result(&output).unwrap().summary, "Investigate without assuming a target.");
    }

    #[test]
    fn whitespace_around_json_is_accepted() {
        assert!(normalize_result(&format!(" \n {} \t", valid_output())).is_ok());
    }

    #[test]
    fn one_json_object_is_extracted_from_harmless_wrapper_text() {
        let output = format!("Here is the requested object:\n{}\nEnd of response.", valid_output());
        assert!(normalize_result(&output).is_ok());
    }

    #[test]
    fn overlong_recommendations_retain_the_first_five_in_order() {
        let mut value: serde_json::Value = serde_json::from_str(&valid_output()).unwrap();
        value["recommendations"] = json!(["1", "2", "3", "4", "5", "6"]);
        let normalized = normalize_result_with_notices(&value.to_string(), None).unwrap();
        assert_eq!(
            normalized.result.recommendations,
            ["1", "2", "3", "4", "5"]
        );
        assert_eq!(
            normalized.normalization_notices,
            vec![SpecialistNormalizationNotice {
                field: "recommendations".to_owned(),
                returned_items: 6,
                retained_items: 5,
            }]
        );
    }

    #[test]
    fn multiple_overlong_lists_normalize_independently() {
        let mut value: serde_json::Value = serde_json::from_str(&valid_output()).unwrap();
        value["assumptions"] = json!(["a1", "a2", "a3", "a4", "a5", "a6"]);
        value["suggestedTests"] = json!(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9"]);
        let normalized = normalize_result_with_notices(&value.to_string(), None).unwrap();
        assert_eq!(normalized.result.assumptions, ["a1", "a2", "a3", "a4", "a5"]);
        assert_eq!(normalized.result.suggested_tests, ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"]);
        assert_eq!(normalized.normalization_notices, vec![
            SpecialistNormalizationNotice { field: "assumptions".to_owned(), returned_items: 6, retained_items: 5 },
            SpecialistNormalizationNotice { field: "suggestedTests".to_owned(), returned_items: 9, retained_items: 8 },
        ]);
    }

    #[test]
    fn exact_bound_list_is_unchanged_without_a_notice() {
        let mut value: serde_json::Value = serde_json::from_str(&valid_output()).unwrap();
        value["recommendations"] = json!(["1", "2", "3", "4", "5"]);
        let normalized = normalize_result_with_notices(&value.to_string(), None).unwrap();
        assert_eq!(normalized.result.recommendations, ["1", "2", "3", "4", "5"]);
        assert!(normalized.normalization_notices.is_empty());
    }

    #[test]
    fn malformed_json_is_rejected_as_invalid_json() {
        let error = normalize_result("{\"summary\":\"unfinished\"").unwrap_err();
        assert_eq!(error.code, "INVALID_JSON");
        assert_eq!(error.diagnostics.unwrap().json_extraction_succeeded, Some(false));
    }

    #[test]
    fn multiple_json_objects_are_rejected_as_ambiguous() {
        let error = normalize_result(&format!("{} {}", valid_output(), valid_output())).unwrap_err();
        assert_eq!(error.code, "INVALID_JSON");
        assert!(error.message.contains("multiple"));
    }

    #[test]
    fn missing_summary_is_rejected_with_safe_diagnostics() {
        let error = normalize_result("{\"recommendations\":[]}").unwrap_err();
        assert_eq!(error.code, "INVALID_SPECIALIST_SCHEMA");
        assert_eq!(error.diagnostics.unwrap().missing_fields, vec!["summary"]);
    }

    #[test]
    fn missing_optional_lists_normalize_to_empty_arrays() {
        let result = normalize_result("{\"summary\":\"Concise result.\"}").unwrap();
        assert!(result.assumptions.is_empty());
        assert!(result.recommendations.is_empty());
        assert!(result.risks.is_empty());
        assert!(result.exploits.is_empty());
        assert!(result.open_questions.is_empty());
        assert!(result.suggested_tests.is_empty());
    }

    #[test]
    fn explicit_snake_case_aliases_normalize_to_canonical_fields() {
        let result = normalize_result(r#"{"summary":"Concise.","open_questions":["Question?"],"suggested_tests":["Test it."]}"#).unwrap();
        assert_eq!(result.open_questions, vec!["Question?"]);
        assert_eq!(result.suggested_tests, vec!["Test it."]);
    }

    #[test]
    fn wrong_list_type_is_rejected_with_field_name_only() {
        let error = normalize_result("{\"summary\":\"Concise.\",\"risks\":\"none\"}").unwrap_err();
        assert_eq!(error.code, "INVALID_SPECIALIST_SCHEMA");
        assert_eq!(error.diagnostics.unwrap().invalid_field_types, vec!["risks"]);
    }

    #[test]
    fn unknown_fields_are_rejected() {
        let mut value: serde_json::Value = serde_json::from_str(&valid_output()).unwrap();
        value["secret"] = json!("should not pass");
        let error = normalize_result(&value.to_string()).unwrap_err();
        assert_eq!(error.code, "INVALID_SPECIALIST_SCHEMA");
        assert_eq!(error.diagnostics.unwrap().unknown_fields, vec!["secret"]);
    }

    #[test]
    fn non_object_json_root_is_rejected() {
        let error = normalize_result(&format!("[{}]", valid_output())).unwrap_err();
        assert_eq!(error.code, "INVALID_SPECIALIST_SCHEMA");
        assert_eq!(error.diagnostics.unwrap().invalid_field_types, vec!["$root"]);
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
        let serialized = serde_json::to_string(&normalize_result(&value.to_string()).unwrap_err()).unwrap();
        assert!(!serialized.contains("hidden chain"));
        assert!(serialized.contains("reasoning"));
    }

    #[test]
    fn diagnostics_never_include_raw_response_text() {
        let marker = "private-project-response-marker";
        let error = normalize_result(&format!("{{\"summary\":\"{marker}\"")).unwrap_err();
        let serialized = serde_json::to_string(&error).unwrap();
        assert!(!serialized.contains(marker));
    }

    #[test]
    fn incomplete_json_with_length_finish_reason_remains_output_truncated() {
        let error = normalize_result_with_finish_reason("{\"summary\":\"unfinished\"", Some("length")).unwrap_err();
        assert_eq!(error.code, "OUTPUT_TRUNCATED");
        assert_eq!(error.diagnostics.unwrap().finish_reason.as_deref(), Some("length"));
    }
    #[test]
    fn completion_budgets_are_bounded_and_task_specific() {
        assert_eq!(completion_budget(SpecialistTaskType::DesignBehavior), 3_200);
        assert_eq!(completion_budget(SpecialistTaskType::ReviewBehavior), 3_200);
        assert_eq!(completion_budget(SpecialistTaskType::CompetenceTiers), 3_400);
        assert_eq!(completion_budget(SpecialistTaskType::ReactionModel), 4_600);
        assert_eq!(completion_budget(SpecialistTaskType::ExploitAnalysis), 3_800);
        assert_eq!(completion_budget(SpecialistTaskType::BehaviorContract), 5_200);
    }

    #[test]
    fn known_smaller_model_maximum_clamps_the_task_preference() {
        let budget = resolve_budget(
            SpecialistTaskType::ReactionModel,
            &model_with_limit(Some(4_096)),
            None,
        ).unwrap();
        assert_eq!(budget.preferred_task_budget, 4_600);
        assert_eq!(budget.configured_completion_budget, 4_600);
        assert_eq!(budget.effective_completion_budget, 4_096);
        assert_eq!(budget.known_model_max_completion_tokens, Some(4_096));
    }

    #[test]
    fn larger_model_maximum_leaves_task_preference_unchanged() {
        assert_eq!(
            resolve_budget(SpecialistTaskType::ReactionModel, &model_with_limit(Some(8_000)), None)
                .unwrap().effective_completion_budget,
            4_600,
        );
    }

    #[test]
    fn unknown_model_maximum_preserves_task_preference() {
        let budget = resolve_budget(SpecialistTaskType::ReactionModel, &model_with_limit(None), None).unwrap();
        assert_eq!(budget.effective_completion_budget, 4_600);
        assert_eq!(budget.known_model_max_completion_tokens, None);
    }

    #[test]
    fn one_run_override_below_known_maximum_is_used() {
        let budget = resolve_budget(
            SpecialistTaskType::ReactionModel,
            &model_with_limit(Some(4_096)),
            Some(3_500),
        ).unwrap();
        assert_eq!(budget.configured_completion_budget, 3_500);
        assert_eq!(budget.effective_completion_budget, 3_500);
    }

    #[test]
    fn one_run_override_above_known_maximum_is_rejected_locally() {
        let error = resolve_budget(
            SpecialistTaskType::ReactionModel,
            &model_with_limit(Some(4_096)),
            Some(4_097),
        ).unwrap_err();
        assert_eq!(error.code, "INVALID_SPECIALIST_REQUEST");
    }

    #[test]
    fn specialist_budget_respects_the_global_safety_bound() {
        let error = resolve_budget(
            SpecialistTaskType::ReactionModel,
            &model_with_limit(None),
            Some(MAX_COMPLETION_TOKENS + 1),
        ).unwrap_err();
        assert_eq!(error.code, "INVALID_SPECIALIST_REQUEST");
    }

    #[test]
    fn provider_invalid_request_keeps_safe_request_context_only() {
        let budget = resolve_budget(
            SpecialistTaskType::ReactionModel,
            &model_with_limit(None),
            None,
        ).unwrap();
        let error = SpecialistError::from_ai_error(
            AIError {
                code: "INVALID_REQUEST".to_owned(),
                message: "Safe provider request failure.".to_owned(),
                diagnostics: Some(crate::ai::ProviderDiagnostics {
                    http_status: Some(400),
                    provider_error_code: Some("invalid_request".to_owned()),
                    provider_error_type: Some("invalid_request_error".to_owned()),
                    rejected_parameter: Some("max_completion_tokens".to_owned()),
                    ..crate::ai::ProviderDiagnostics::default()
                }),
            },
            budget,
            "test/model",
        );
        let diagnostics = error.diagnostics.unwrap();
        assert_eq!(diagnostics.http_status, Some(400));
        assert_eq!(diagnostics.rejected_parameter.as_deref(), Some("max_completion_tokens"));
        assert_eq!(diagnostics.configured_completion_budget, Some(4_600));
        assert_eq!(diagnostics.effective_completion_budget, Some(4_600));
        assert_eq!(diagnostics.model_id.as_deref(), Some("test/model"));
        assert_eq!(diagnostics.reasoning_requested, Some(true));
        assert_eq!(diagnostics.structured_output_requested, Some(false));
        assert!(!serde_json::to_string(&diagnostics).unwrap().contains("private-project"));
    }

    #[test]
    fn request_uses_task_budget_minimal_reasoning_and_concise_schema() {
        let (directory, project_id) = workspace();
        let prepared = build_ai_request(&request(directory.path(), &project_id)).unwrap();
        assert_eq!(prepared.ai_request.max_tokens, Some(4_600));
        assert_eq!(prepared.ai_request.reasoning_effort.as_deref(), Some("minimal"));
        assert_eq!(prepared.ai_request.temperature, Some(0.2));
        let prompt = prepared.ai_request.system_prompt.unwrap();
        assert!(prompt.contains("\"openQuestions\":[]"));
        assert!(prompt.contains("no markdown, code fences, or commentary"));
        assert!(prompt.contains("Do not repeat the same explanation"));
        assert!(prompt.contains("at most 5 items"));
        assert!(prompt.contains("compact deterministic state/rule model"));
        assert!(prompt.contains("Do not write long narrative examples"));
        assert!(prompt.contains("\"summary\":\"Concise summary.\",\"assumptions\":[],\"recommendations\":[],\"risks\":[],\"exploits\":[],\"openQuestions\":[],\"suggestedTests\":[]"));
    }

    #[test]
    fn request_uses_a_valid_one_run_override() {
        let (directory, project_id) = workspace();
        let mut input = request(directory.path(), &project_id);
        input.max_completion_tokens = Some(4_000);
        let prepared = build_ai_request(&input).unwrap();
        assert_eq!(prepared.ai_request.max_tokens, Some(4_000));
        assert_eq!(prepared.budget.preferred_task_budget, 4_600);
        assert_eq!(prepared.budget.effective_completion_budget, 4_000);
    }

    #[test]
    fn prepared_requests_use_the_configured_task_budgets() {
        let (directory, project_id) = workspace();
        for (task_type, expected) in [
            (SpecialistTaskType::DesignBehavior, 3_200),
            (SpecialistTaskType::CompetenceTiers, 3_400),
            (SpecialistTaskType::ReactionModel, 4_600),
            (SpecialistTaskType::ExploitAnalysis, 3_800),
            (SpecialistTaskType::BehaviorContract, 5_200),
        ] {
            let mut input = request(directory.path(), &project_id);
            input.task_type = task_type;
            assert_eq!(build_ai_request(&input).unwrap().ai_request.max_tokens, Some(expected));
        }
    }

    #[test]
    fn task_guidance_is_deterministic_and_bounded_to_known_areas() {
        let guidance = task_guidance();
        assert_eq!(guidance.len(), 6);
        let reaction = guidance.iter().find(|item| item.task_type == SpecialistTaskType::ReactionModel).unwrap();
        assert_eq!(reaction.recommended_compendium_areas, vec![KnowledgeArea::PlayerExperience, KnowledgeArea::Systems]);
        assert_eq!(reaction.preferred_decision_areas, vec![KnowledgeArea::PlayerExperience, KnowledgeArea::Systems]);
        assert!(guidance.iter().all(|item| item.recommended_compendium_areas.len() <= 3 && item.preferred_decision_areas.len() <= 3));
    }
}
