use crate::specialists::{
    normalize_result, valid_normalization_notices, BehaviorDesignerResult,
    SpecialistAnalysisRequest, SpecialistDiagnostics, SpecialistBudgetResolution, SpecialistError,
    SpecialistNormalizationNotice, SpecialistTaskType, AI_BEHAVIOR_DESIGNER_ID,
};
use crate::workspace::{self, WorkspaceInspection};
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const SPECIALIST_RUNS_FORMAT_VERSION: u32 = 1;
const SPECIALIST_RUNS_FILE: &str = "specialist-runs.json";
const MAX_KNOWLEDGE_REFERENCES: usize = 8;
const MAX_DECISION_REFERENCES: usize = 6;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecialistHistoryRecovery {
    pub document: SpecialistRunsDocument,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archived_file_name: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SpecialistRunStatus {
    Succeeded,
    Failed,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpecialistRunUsage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_cost_usd: Option<f64>,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct SpecialistRunBudgetMetadata {
    pub preferred_task_budget: Option<u32>,
    pub effective_completion_budget: Option<u32>,
    pub known_model_max_completion_tokens: Option<u32>,
}

impl From<SpecialistBudgetResolution> for SpecialistRunBudgetMetadata {
    fn from(value: SpecialistBudgetResolution) -> Self {
        Self {
            preferred_task_budget: Some(value.preferred_task_budget),
            effective_completion_budget: Some(value.effective_completion_budget),
            known_model_max_completion_tokens: value.known_model_max_completion_tokens,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpecialistSafeError {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diagnostics: Option<SpecialistDiagnostics>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpecialistRun {
    pub id: String,
    pub created_at: String,
    pub specialist_profile_id: String,
    pub task_type: SpecialistTaskType,
    pub model_id: String,
    pub selected_knowledge_entry_ids: Vec<String>,
    pub selected_decision_ids: Vec<String>,
    pub scenario: String,
    pub status: SpecialistRunStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<BehaviorDesignerResult>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub normalization_notices: Vec<SpecialistNormalizationNotice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub safe_error: Option<SpecialistSafeError>,
    pub usage: SpecialistRunUsage,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preferred_task_budget: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effective_completion_budget: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub known_model_max_completion_tokens: Option<u32>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpecialistRunsDocument {
    pub format_version: u32,
    pub project_id: String,
    pub updated_at: String,
    pub runs: Vec<SpecialistRun>,
}

pub fn load(root: &Path) -> Result<Option<SpecialistRunsDocument>, SpecialistError> {
    let project_id = workspace_project_id(root)?;
    load_for_project(root, &project_id)
}

pub fn archive_and_reset(root: &Path) -> Result<SpecialistHistoryRecovery, SpecialistError> {
    let project_id = workspace_project_id(root)?;
    let current_path = history_path(root);
    let archived_file_name = if current_path.exists() {
        let name = format!(
            "specialist-runs.invalid-{}-{}.json",
            Utc::now().format("%Y%m%dT%H%M%S%3fZ"),
            Uuid::new_v4(),
        );
        fs::rename(&current_path, root.join(".forgemind").join(&name)).map_err(|_| {
            SpecialistError::new(
                "SPECIALIST_HISTORY_RECOVERY_FAILED",
                "ForgeMind could not archive the existing specialist analysis history.",
            )
        })?;
        Some(name)
    } else {
        None
    };
    let document = save(root, empty_document(&project_id))?;
    Ok(SpecialistHistoryRecovery { document, archived_file_name })
}

pub fn append_success(
    request: &SpecialistAnalysisRequest,
    result: BehaviorDesignerResult,
    usage: SpecialistRunUsage,
    budget: SpecialistRunBudgetMetadata,
) -> Result<SpecialistRun, SpecialistError> {
    append_success_with_normalization(request, result, Vec::new(), usage, budget)
}

pub fn append_success_with_normalization(
    request: &SpecialistAnalysisRequest,
    result: BehaviorDesignerResult,
    normalization_notices: Vec<SpecialistNormalizationNotice>,
    usage: SpecialistRunUsage,
    budget: SpecialistRunBudgetMetadata,
) -> Result<SpecialistRun, SpecialistError> {
    append(
        request,
        SpecialistRunStatus::Succeeded,
        Some(result),
        normalization_notices,
        None,
        usage,
        budget,
    )
}

pub fn append_failure(
    request: &SpecialistAnalysisRequest,
    error: &SpecialistError,
    usage: SpecialistRunUsage,
    budget: SpecialistRunBudgetMetadata,
) -> Result<SpecialistRun, SpecialistError> {
    append(
        request,
        SpecialistRunStatus::Failed,
        None,
        Vec::new(),
        Some(SpecialistSafeError { code: error.code.clone(), diagnostics: error.diagnostics.clone() }),
        usage,
        budget,
    )
}

fn append(
    request: &SpecialistAnalysisRequest,
    status: SpecialistRunStatus,
    result: Option<BehaviorDesignerResult>,
    normalization_notices: Vec<SpecialistNormalizationNotice>,
    safe_error: Option<SpecialistSafeError>,
    usage: SpecialistRunUsage,
    budget: SpecialistRunBudgetMetadata,
) -> Result<SpecialistRun, SpecialistError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let mut document = load_for_project(root, &request.project_id)?
        .unwrap_or_else(|| empty_document(&request.project_id));
    let run = SpecialistRun {
        id: Uuid::new_v4().to_string(),
        created_at: timestamp(),
        specialist_profile_id: request.profile_id.clone(),
        task_type: request.task_type,
        model_id: request.model_id.trim().to_owned(),
        selected_knowledge_entry_ids: request.knowledge_entry_ids.clone(),
        selected_decision_ids: request.decision_ids.clone(),
        scenario: request.scenario.trim().to_owned(),
        status,
        result,
        normalization_notices,
        safe_error,
        usage,
        preferred_task_budget: budget.preferred_task_budget,
        effective_completion_budget: budget.effective_completion_budget,
        known_model_max_completion_tokens: budget.known_model_max_completion_tokens,
    };
    document.runs.push(run.clone());
    save(root, document)?;
    Ok(run)
}

fn save(root: &Path, mut document: SpecialistRunsDocument) -> Result<SpecialistRunsDocument, SpecialistError> {
    document.updated_at = timestamp();
    validate_document(&document, &document.project_id)?;
    let mut contents = serde_json::to_vec_pretty(&document).map_err(|_| write_error())?;
    contents.push(b'\n');
    let mut file = fs::File::create(history_path(root)).map_err(|_| write_error())?;
    file.write_all(&contents).map_err(|_| write_error())?;
    Ok(document)
}

fn load_for_project(root: &Path, project_id: &str) -> Result<Option<SpecialistRunsDocument>, SpecialistError> {
    let contents = match fs::read_to_string(history_path(root)) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(SpecialistError::new("SPECIALIST_HISTORY_READ_FAILED", "ForgeMind could not read specialist analysis history.")),
    };
    let document: SpecialistRunsDocument = serde_json::from_str(&contents).map_err(|_| invalid_file())?;
    validate_document(&document, project_id)?;
    Ok(Some(document))
}

fn validate_document(document: &SpecialistRunsDocument, expected_project_id: &str) -> Result<(), SpecialistError> {
    let mut ids = HashSet::new();
    if document.format_version != SPECIALIST_RUNS_FORMAT_VERSION
        || document.project_id != expected_project_id
        || DateTime::parse_from_rfc3339(&document.updated_at).is_err()
        || document.runs.iter().any(|run| {
            Uuid::parse_str(&run.id).is_err()
                || !ids.insert(run.id.as_str())
                || DateTime::parse_from_rfc3339(&run.created_at).is_err()
                || run.specialist_profile_id != AI_BEHAVIOR_DESIGNER_ID
                || !valid_text(&run.model_id, 1, 240)
                || !valid_text(&run.scenario, 1, 4_000)
                || !valid_references(&run.selected_knowledge_entry_ids, MAX_KNOWLEDGE_REFERENCES)
                || !valid_references(&run.selected_decision_ids, MAX_DECISION_REFERENCES)
                || !valid_usage(&run.usage)
                || !valid_budget_metadata(run)
                || !valid_run_payload(run)
        })
    {
        return Err(invalid_file());
    }
    Ok(())
}

fn valid_budget_metadata(run: &SpecialistRun) -> bool {
    match (run.preferred_task_budget, run.effective_completion_budget) {
        (None, None) => run.known_model_max_completion_tokens.is_none(),
        (Some(preferred), Some(effective)) => {
            preferred > 0
                && preferred <= crate::ai::MAX_COMPLETION_TOKENS
                && effective > 0
                && effective <= crate::ai::MAX_COMPLETION_TOKENS
                && run.known_model_max_completion_tokens.map_or(true, |maximum| {
                    maximum > 0
                        && effective <= maximum
                })
        }
        _ => false,
    }
}

fn valid_run_payload(run: &SpecialistRun) -> bool {
    match run.status {
        SpecialistRunStatus::Succeeded => run.safe_error.is_none()
            && run.result.as_ref().is_some_and(|result| {
                serde_json::to_string(result)
                    .ok()
                    .and_then(|value| normalize_result(&value).ok())
                    .as_ref() == Some(result)
                    && valid_normalization_notices(result, &run.normalization_notices)
            }),
        SpecialistRunStatus::Failed => run.result.is_none()
            && run.normalization_notices.is_empty()
            && run.safe_error.as_ref().is_some_and(|error| {
                valid_text(&error.code, 1, 80)
                    && error.diagnostics.as_ref().map_or(true, valid_diagnostics)
            }),
    }
}

fn valid_diagnostics(diagnostics: &SpecialistDiagnostics) -> bool {
    diagnostics.finish_reason.as_deref().map_or(true, |value| valid_text(value, 1, 80))
        && diagnostics.list_bound_exceeded.as_deref().map_or(true, |value| valid_text(value, 1, 80))
        && diagnostics.validation_issue.as_deref().map_or(true, |value| valid_text(value, 1, 500))
        && diagnostics.provider_error_code.as_deref().map_or(true, |value| valid_text(value, 1, 200))
        && diagnostics.provider_error_type.as_deref().map_or(true, |value| valid_text(value, 1, 200))
        && diagnostics.rejected_parameter.as_deref().map_or(true, |value| valid_text(value, 1, 200))
        && diagnostics.model_id.as_deref().map_or(true, |value| valid_text(value, 1, 240))
        && diagnostics.preferred_task_budget.map_or(true, |value| value > 0 && value <= crate::ai::MAX_COMPLETION_TOKENS)
        && diagnostics.configured_completion_budget.map_or(true, |value| value > 0 && value <= crate::ai::MAX_COMPLETION_TOKENS)
        && diagnostics.effective_completion_budget.map_or(true, |value| value > 0 && value <= crate::ai::MAX_COMPLETION_TOKENS)
        && diagnostics.known_model_max_completion_tokens.map_or(true, |value| value > 0)
        && match (diagnostics.effective_completion_budget, diagnostics.known_model_max_completion_tokens) {
            (Some(effective), Some(maximum)) => effective <= maximum,
            _ => true,
        }
        && valid_diagnostic_fields(&diagnostics.missing_fields)
        && valid_diagnostic_fields(&diagnostics.invalid_field_types)
        && valid_diagnostic_fields(&diagnostics.unknown_fields)
}

fn valid_diagnostic_fields(fields: &[String]) -> bool {
    fields.len() <= 8 && fields.iter().all(|field| valid_text(field, 1, 80))
}

fn valid_usage(usage: &SpecialistRunUsage) -> bool {
    usage
        .estimated_cost_usd
        .map_or(true, |cost| cost.is_finite() && cost >= 0.0)
}

fn valid_references(ids: &[String], maximum: usize) -> bool {
    let mut unique = HashSet::new();
    ids.len() <= maximum
        && ids.iter().all(|id| Uuid::parse_str(id).is_ok() && unique.insert(id.as_str()))
}

fn valid_text(value: &str, minimum: usize, maximum: usize) -> bool {
    let length = value.trim().chars().count();
    length >= minimum && length <= maximum
}

fn verify_project(root: &Path, expected_project_id: &str) -> Result<(), SpecialistError> {
    if workspace_project_id(root)? != expected_project_id {
        return Err(SpecialistError::new("PROJECT_ID_MISMATCH", "Specialist history does not belong to the selected workspace."));
    }
    Ok(())
}

fn workspace_project_id(root: &Path) -> Result<String, SpecialistError> {
    match workspace::inspect(root).map_err(|_| SpecialistError::new("WORKSPACE_ACCESS_FAILED", "ForgeMind could not access the selected workspace."))? {
        WorkspaceInspection::Valid { project, .. } => Ok(project.project_id),
        _ => Err(SpecialistError::new("INVALID_WORKSPACE", "Specialist history requires a valid ForgeMind workspace.")),
    }
}

fn empty_document(project_id: &str) -> SpecialistRunsDocument {
    SpecialistRunsDocument { format_version: SPECIALIST_RUNS_FORMAT_VERSION, project_id: project_id.to_owned(), updated_at: timestamp(), runs: Vec::new() }
}

fn invalid_file() -> SpecialistError {
    SpecialistError::new("INVALID_SPECIALIST_HISTORY", "The existing specialist analysis history is invalid and was not changed.")
}

fn write_error() -> SpecialistError {
    SpecialistError::new("SPECIALIST_HISTORY_WRITE_FAILED", "ForgeMind could not save specialist analysis history.")
}

fn history_path(root: &Path) -> PathBuf { root.join(".forgemind").join(SPECIALIST_RUNS_FILE) }
fn timestamp() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true) }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::specialists::{SpecialistTaskType, AI_BEHAVIOR_DESIGNER_ID};
    use std::fs;
    use tempfile::TempDir;

    fn workspace() -> (TempDir, String) {
        let directory = TempDir::new().unwrap();
        let WorkspaceInspection::Valid { project, .. } = workspace::initialize(directory.path()).unwrap() else { panic!("valid workspace") };
        (directory, project.project_id)
    }

    fn request(root: &Path, project_id: &str) -> SpecialistAnalysisRequest {
        SpecialistAnalysisRequest {
            root_path: root.display().to_string(), project_id: project_id.to_owned(), profile_id: AI_BEHAVIOR_DESIGNER_ID.to_owned(),
            task_type: SpecialistTaskType::ReactionModel, model_id: "test/model".to_owned(),
            knowledge_entry_ids: vec!["550e8400-e29b-41d4-a716-446655440000".to_owned()],
            decision_ids: vec!["550e8400-e29b-41d4-a716-446655440001".to_owned()], max_completion_tokens: None,
            scenario: "A guard hears a sound.".to_owned(),
        }
    }

    fn result() -> BehaviorDesignerResult {
        BehaviorDesignerResult { summary: "Investigate under uncertainty.".to_owned(), assumptions: vec!["The sound is audible.".to_owned()],
            recommendations: vec!["Orient before moving.".to_owned()], risks: Vec::new(), exploits: Vec::new(), open_questions: Vec::new(),
            suggested_tests: vec!["Verify no target is acquired from sound alone.".to_owned()] }
    }

    fn usage() -> SpecialistRunUsage {
        SpecialistRunUsage { input_tokens: Some(10), output_tokens: Some(20), total_tokens: Some(30), latency_ms: Some(40), estimated_cost_usd: None }
    }

    fn budget() -> SpecialistRunBudgetMetadata {
        SpecialistRunBudgetMetadata {
            preferred_task_budget: Some(4_600),
            effective_completion_budget: Some(4_600),
            known_model_max_completion_tokens: None,
        }
    }

    #[test]
    fn successful_run_persists_and_reloads_normalized_output() {
        let (directory, project_id) = workspace();
        let saved = append_success(&request(directory.path(), &project_id), result(), usage(), budget()).unwrap();
        let loaded = load(directory.path()).unwrap().unwrap();
        assert_eq!(loaded.runs, vec![saved]);
        assert_eq!(loaded.runs[0].result.as_ref().unwrap().summary, "Investigate under uncertainty.");
        assert_eq!(loaded.runs[0].preferred_task_budget, Some(4_600));
        assert_eq!(loaded.runs[0].effective_completion_budget, Some(4_600));
        assert_eq!(loaded.runs[0].known_model_max_completion_tokens, None);
    }

    #[test]
    fn normalization_notices_persist_with_the_bounded_result() {
        let (directory, project_id) = workspace();
        let notice = SpecialistNormalizationNotice {
            field: "recommendations".to_owned(),
            returned_items: 7,
            retained_items: 5,
        };
        let mut normalized_result = result();
        normalized_result.recommendations = vec!["1", "2", "3", "4", "5"]
            .into_iter()
            .map(str::to_owned)
            .collect();
        append_success_with_normalization(
            &request(directory.path(), &project_id),
            normalized_result,
            vec![notice.clone()],
            usage(),
            budget(),
        )
        .unwrap();
        let loaded = load(directory.path()).unwrap().unwrap();
        assert_eq!(loaded.runs[0].normalization_notices, vec![notice]);
        assert_eq!(
            loaded.runs[0].result.as_ref().unwrap().recommendations,
            ["1", "2", "3", "4", "5"]
        );
    }

    #[test]
    fn inconsistent_normalization_metadata_is_rejected() {
        let (directory, project_id) = workspace();
        append_success(
            &request(directory.path(), &project_id),
            result(),
            usage(),
            budget(),
        )
        .unwrap();
        let path = history_path(directory.path());
        let mut document: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        document["runs"][0]["normalizationNotices"] = serde_json::json!([{
            "field": "recommendations",
            "returnedItems": 7,
            "retainedItems": 5
        }]);
        fs::write(path, serde_json::to_vec_pretty(&document).unwrap()).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_SPECIALIST_HISTORY");
    }

    #[test]
    fn failed_run_persists_only_safe_error_category() {
        let (directory, project_id) = workspace();
        let error = SpecialistError::new("OUTPUT_TRUNCATED", "safe message");
        let saved = append_failure(&request(directory.path(), &project_id), &error, SpecialistRunUsage::default(), budget()).unwrap();
        assert_eq!(saved.status, SpecialistRunStatus::Failed);
        assert_eq!(saved.safe_error.unwrap().code, "OUTPUT_TRUNCATED");
        let contents = fs::read_to_string(history_path(directory.path())).unwrap();
        assert!(!contents.contains("safe message"));
    }

    #[test]
    fn selected_context_and_scenario_persist() {
        let (directory, project_id) = workspace();
        let input = request(directory.path(), &project_id);
        let saved = append_success(&input, result(), usage(), budget()).unwrap();
        assert_eq!(saved.selected_knowledge_entry_ids, input.knowledge_entry_ids);
        assert_eq!(saved.selected_decision_ids, input.decision_ids);
        assert_eq!(saved.scenario, input.scenario);
    }

    #[test]
    fn persisted_history_contains_no_raw_provider_data_reasoning_or_credentials() {
        let (directory, project_id) = workspace();
        append_success(&request(directory.path(), &project_id), result(), usage(), budget()).unwrap();
        let contents = fs::read_to_string(history_path(directory.path())).unwrap();
        let absolute_path = directory.path().display().to_string();
        for forbidden in ["rawResponse", "reasoning", "NEBIUS_API_KEY", "authorization", absolute_path.as_str()] {
            assert!(!contents.contains(forbidden));
        }
    }

    #[test]
    fn failure_diagnostics_are_preserved_without_raw_provider_content() {
        let (directory, project_id) = workspace();
        let error = SpecialistError {
            code: "INVALID_JSON".to_owned(),
            message: "do not persist this response".to_owned(),
            diagnostics: Some(SpecialistDiagnostics {
                finish_reason: Some("stop".to_owned()),
                readable_text_present: Some(true),
                json_extraction_succeeded: Some(false),
                validation_issue: Some("One complete JSON object was not found.".to_owned()),
                ..SpecialistDiagnostics::default()
            }),
        };
        let saved = append_failure(&request(directory.path(), &project_id), &error, usage(), budget()).unwrap();
        let diagnostics = saved.safe_error.unwrap().diagnostics.unwrap();
        assert_eq!(diagnostics.finish_reason.as_deref(), Some("stop"));
        assert_eq!(diagnostics.json_extraction_succeeded, Some(false));
        let contents = fs::read_to_string(history_path(directory.path())).unwrap();
        assert!(!contents.contains("do not persist this response"));
    }

    #[test]
    fn previously_written_failure_diagnostics_with_omitted_empty_lists_load() {
        let (directory, project_id) = workspace();
        let document = serde_json::json!({
            "formatVersion": 1,
            "projectId": project_id,
            "updatedAt": timestamp(),
            "runs": [{
                "id": Uuid::new_v4().to_string(),
                "createdAt": timestamp(),
                "specialistProfileId": AI_BEHAVIOR_DESIGNER_ID,
                "taskType": "REACTION_MODEL",
                "modelId": "test/model",
                "selectedKnowledgeEntryIds": [],
                "selectedDecisionIds": [],
                "scenario": "A guard hears a sound.",
                "status": "FAILED",
                "safeError": {
                    "code": "OUTPUT_TRUNCATED",
                    "diagnostics": {
                        "finishReason": "length",
                        "readableTextPresent": true,
                        "jsonExtractionSucceeded": false
                    }
                },
                "usage": { "inputTokens": 10, "outputTokens": 20, "totalTokens": 30, "latencyMs": 40 }
            }]
        });
        fs::write(history_path(directory.path()), serde_json::to_vec_pretty(&document).unwrap()).unwrap();
        let loaded = load(directory.path()).unwrap().unwrap();
        let diagnostics = loaded.runs[0].safe_error.as_ref().unwrap().diagnostics.as_ref().unwrap();
        assert!(diagnostics.missing_fields.is_empty());
        assert!(diagnostics.invalid_field_types.is_empty());
        assert!(diagnostics.unknown_fields.is_empty());
        assert_eq!(loaded.runs[0].preferred_task_budget, None);
        assert_eq!(loaded.runs[0].effective_completion_budget, None);
    }

    #[test]
    fn archive_and_reset_replaces_only_history_and_returns_no_file_contents_or_path() {
        let (directory, project_id) = workspace();
        let metadata = directory.path().join(".forgemind");
        let project_path = metadata.join("project.json");
        let compendium_path = metadata.join("compendium.json");
        let decisions_path = metadata.join("decisions.json");
        let interview_path = metadata.join("interview.json");
        fs::write(&compendium_path, "compendium sentinel").unwrap();
        fs::write(&decisions_path, "decisions sentinel").unwrap();
        fs::write(&interview_path, "interview sentinel").unwrap();
        let project_before = fs::read(&project_path).unwrap();
        let invalid_contents = "malformed raw-provider-marker NEBIUS_API_KEY=x";
        fs::write(history_path(directory.path()), invalid_contents).unwrap();

        let recovery = archive_and_reset(directory.path()).unwrap();

        assert_eq!(recovery.document.project_id, project_id);
        assert!(recovery.document.runs.is_empty());
        assert!(load(directory.path()).unwrap().unwrap().runs.is_empty());
        assert_eq!(fs::read(&project_path).unwrap(), project_before);
        assert_eq!(fs::read_to_string(&compendium_path).unwrap(), "compendium sentinel");
        assert_eq!(fs::read_to_string(&decisions_path).unwrap(), "decisions sentinel");
        assert_eq!(fs::read_to_string(&interview_path).unwrap(), "interview sentinel");

        let archived_name = recovery.archived_file_name.as_deref().unwrap();
        assert!(!archived_name.contains('/') && !archived_name.contains('\\'));
        assert_eq!(fs::read_to_string(metadata.join(archived_name)).unwrap(), invalid_contents);
        let response = serde_json::to_string(&recovery).unwrap();
        assert!(!response.contains("raw-provider-marker"));
        assert!(!response.contains("secret"));
        assert!(!response.contains(&directory.path().display().to_string()));
    }

    #[test]
    fn reset_without_existing_history_creates_valid_empty_history() {
        let (directory, _) = workspace();
        let recovery = archive_and_reset(directory.path()).unwrap();
        assert!(recovery.archived_file_name.is_none());
        assert!(load(directory.path()).unwrap().unwrap().runs.is_empty());
    }

    #[test]
    fn malformed_history_fails_safely() {
        let (directory, _) = workspace();
        fs::write(history_path(directory.path()), "not json").unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_SPECIALIST_HISTORY");
    }

    #[test]
    fn unsupported_history_version_fails_safely() {
        let (directory, project_id) = workspace();
        let document = serde_json::json!({"formatVersion": 2, "projectId": project_id, "updatedAt": timestamp(), "runs": []});
        fs::write(history_path(directory.path()), document.to_string()).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_SPECIALIST_HISTORY");
    }

    #[test]
    fn registry_and_profile_lookup_remain_available_when_history_is_invalid() {
        let (directory, _) = workspace();
        fs::write(history_path(directory.path()), "not json").unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_SPECIALIST_HISTORY");
        assert!(!crate::specialists::profiles().is_empty());
        assert!(crate::model_registry::models().is_ok());
    }

    #[test]
    fn unbounded_failure_diagnostics_are_rejected() {
        let (directory, project_id) = workspace();
        let error = SpecialistError {
            code: "INVALID_JSON".to_owned(),
            message: "safe".to_owned(),
            diagnostics: Some(SpecialistDiagnostics {
                validation_issue: Some("x".repeat(501)),
                ..SpecialistDiagnostics::default()
            }),
        };
        assert_eq!(
            append_failure(&request(directory.path(), &project_id), &error, usage(), budget()).unwrap_err().code,
            "INVALID_SPECIALIST_HISTORY",
        );
    }
}
