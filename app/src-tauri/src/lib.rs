pub mod ai;
pub mod compendium;
pub mod decisions;
pub mod interview;
pub mod git_reality;
pub mod model_registry;
pub mod specialist_history;
pub mod specialists;
pub mod usage;
mod workspace;

use std::path::Path;
use std::sync::OnceLock;

use workspace::{WorkspaceError, WorkspaceInspection};

use ai::{AIError, AIRequest, AIResponse};
use compendium::{
    CompendiumDocument, CompendiumError, CreateKnowledgeEntryRequest,
    ImportInterviewRequest, InterviewImportResult, KnowledgeEntryActionRequest,
    PromoteSpecialistFindingRequest, UpdateKnowledgeEntryRequest,
};
use decisions::{
    CreateDecisionRequest, DecisionActionRequest, DecisionError, DecisionsDocument,
    UpdateDecisionRequest,
};
use interview::{
    InterviewDocument, InterviewError, InterviewTurnRequest, InterviewTurnResult,
    SaveInterviewRequest,
};
use model_registry::{ModelEntry, ModelRegistryError};
use specialist_history::{
    SpecialistRunBudgetMetadata, SpecialistRunUsage, SpecialistRunsDocument,
};
use specialists::{
    SpecialistAnalysisRequest, SpecialistAnalysisResult, SpecialistError, SpecialistHistoryWarning,
    SpecialistProfile,
};
use usage::{TaskCategory, UsageError, UsageSummary};

static SESSION_ID: OnceLock<String> = OnceLock::new();

#[cfg(debug_assertions)]
const DEVELOPMENT_WORKSPACE_ENVIRONMENT_VARIABLE: &str = "FORGEMIND_TEST_WORKSPACE";

#[tauri::command]
fn development_workspace_path() -> Option<String> {
    #[cfg(debug_assertions)]
    {
        return configured_development_workspace(
            std::env::var(DEVELOPMENT_WORKSPACE_ENVIRONMENT_VARIABLE).ok(),
        );
    }

    #[cfg(not(debug_assertions))]
    None
}

#[cfg(debug_assertions)]
fn configured_development_workspace(value: Option<String>) -> Option<String> {
    value
        .map(|path| path.trim().to_owned())
        .filter(|path| !path.is_empty())
}

#[tauri::command]
async fn run_ai_evaluation(
    request: AIRequest,
    project_id: Option<String>,
    task_category: Option<TaskCategory>,
) -> Result<AIResponse, AIError> {
    evaluate_registered(request, project_id, task_category).await
}

pub async fn evaluate_registered(
    request: AIRequest,
    project_id: Option<String>,
    task_category: Option<TaskCategory>,
) -> Result<AIResponse, AIError> {
    let model = model_registry::enabled_model(&request.model)
        .map_err(|error| AIError::new(error.code, &error.message))?;
    let result = ai::generate_with_nebius(request).await;
    let record = usage::record_for_result(
        session_id(),
        project_id.as_deref(),
        &model,
        task_category,
        &result,
    );
    let storage_result = usage::application_usage_path()
        .map_err(usage_as_ai_error)
        .and_then(|path| usage::append_record(&path, &record).map_err(usage_as_ai_error));

    match (result, storage_result) {
        (Ok(response), Ok(())) => Ok(response),
        (Ok(_), Err(error)) => Err(error),
        (Err(error), _) => Err(error),
    }
}

#[tauri::command]
fn list_models() -> Result<Vec<ModelEntry>, ModelRegistryError> {
    model_registry::models()
}

#[tauri::command]
fn list_specialist_profiles() -> Vec<SpecialistProfile> {
    specialists::profiles()
}

#[tauri::command]
async fn run_specialist_analysis(
    request: SpecialistAnalysisRequest,
) -> Result<SpecialistAnalysisResult, SpecialistError> {
    let prepared = specialists::build_ai_request(&request)?;
    let budget = prepared.budget;
    let history_budget = SpecialistRunBudgetMetadata::from(budget);
    let model = model_registry::enabled_model(&request.model_id)
        .map_err(|error| SpecialistError::new(error.code, &error.message))?;
    let response = match evaluate_registered(
        prepared.ai_request,
        Some(request.project_id.clone()),
        Some(specialists::task_category()),
    )
    .await {
        Ok(response) => response,
        Err(error) => {
            let error = SpecialistError::from_ai_error(error, budget, &request.model_id);
            let _ = specialist_history::append_failure(
                &request,
                &error,
                SpecialistRunUsage::default(),
                history_budget,
            );
            return Err(error);
        }
    };
    let estimated_cost_usd = usage::estimate_cost(
        model.pricing.as_ref(),
        response.input_tokens,
        response.output_tokens,
    );
    let run_usage = SpecialistRunUsage {
        input_tokens: response.input_tokens,
        output_tokens: response.output_tokens,
        total_tokens: response.total_tokens,
        latency_ms: Some(response.latency_ms),
        estimated_cost_usd,
    };
    let result = match specialists::normalize_result_with_finish_reason(
        &response.text,
        response.finish_reason.as_deref(),
    ) {
        Ok(result) => result,
        Err(error) => {
            let error = error.with_request_context(budget, &request.model_id);
            let _ = specialist_history::append_failure(&request, &error, run_usage, history_budget);
            return Err(error);
        }
    };
    let history_warning = specialist_history::append_success(
        &request,
        result.clone(),
        run_usage,
        history_budget,
    )
        .err()
        .map(|error| SpecialistHistoryWarning { code: error.code, message: error.message });

    Ok(SpecialistAnalysisResult {
        profile_id: prepared.profile_id,
        task_type: prepared.task_type,
        selected_knowledge_entry_ids: prepared.selected_knowledge_entry_ids,
        selected_decision_ids: prepared.selected_decision_ids,
        result,
        model: response.model,
        latency_ms: response.latency_ms,
        input_tokens: response.input_tokens,
        output_tokens: response.output_tokens,
        total_tokens: response.total_tokens,
        finish_reason: response.finish_reason,
        history_warning,
        preferred_task_budget: budget.preferred_task_budget,
        effective_completion_budget: budget.effective_completion_budget,
        known_model_max_completion_tokens: budget.known_model_max_completion_tokens,
    })
}

#[tauri::command]
fn load_specialist_runs(path: String) -> Result<Option<SpecialistRunsDocument>, SpecialistError> {
    specialist_history::load(Path::new(&path))
}

#[tauri::command]
fn promote_specialist_finding(
    request: PromoteSpecialistFindingRequest,
) -> Result<CompendiumDocument, CompendiumError> {
    compendium::promote_specialist_finding(request)
}

#[tauri::command]
fn archive_and_reset_specialist_history(
    path: String,
) -> Result<specialist_history::SpecialistHistoryRecovery, SpecialistError> {
    specialist_history::archive_and_reset(Path::new(&path))
}

#[tauri::command]
fn get_usage_summary(
    project_id: Option<String>,
) -> Result<UsageSummary, UsageError> {
    let records = usage::load_records(&usage::application_usage_path()?)?;
    Ok(usage::summarize(
        &records,
        session_id(),
        project_id.as_deref(),
    ))
}

#[tauri::command]
async fn run_project_interview_turn(
    request: InterviewTurnRequest,
) -> Result<InterviewTurnResult, InterviewError> {
    let ai_request = interview::build_ai_request(&request)?;
    let response = evaluate_registered(
        ai_request,
        Some(request.project_id),
        Some(TaskCategory::ProjectInterview),
    )
    .await
    .map_err(|error| InterviewError::new(&error.code, &error.message))?;

    interview::normalize_turn(
        &response.text,
        response.model,
        response.latency_ms,
        response.input_tokens,
        response.output_tokens,
        response.total_tokens,
    )
}

#[tauri::command]
fn load_project_interview(path: String) -> Result<Option<InterviewDocument>, InterviewError> {
    interview::load(Path::new(&path))
}

#[tauri::command]
fn save_project_interview(
    request: SaveInterviewRequest,
) -> Result<InterviewDocument, InterviewError> {
    interview::save(request)
}

#[tauri::command]
fn load_compendium(path: String) -> Result<Option<CompendiumDocument>, CompendiumError> {
    compendium::load(Path::new(&path))
}

#[tauri::command]
fn create_knowledge_entry(
    request: CreateKnowledgeEntryRequest,
) -> Result<CompendiumDocument, CompendiumError> {
    compendium::create_entry(request)
}

#[tauri::command]
fn update_knowledge_entry(
    request: UpdateKnowledgeEntryRequest,
) -> Result<CompendiumDocument, CompendiumError> {
    compendium::update_entry(request)
}

#[tauri::command]
fn deprecate_knowledge_entry(
    request: KnowledgeEntryActionRequest,
) -> Result<CompendiumDocument, CompendiumError> {
    compendium::deprecate_entry(request)
}

#[tauri::command]
fn import_interview_to_compendium(
    request: ImportInterviewRequest,
) -> Result<InterviewImportResult, CompendiumError> {
    compendium::import_interview(request)
}

#[tauri::command]
fn load_decisions(path: String) -> Result<Option<DecisionsDocument>, DecisionError> {
    decisions::load(Path::new(&path))
}

#[tauri::command]
fn create_decision(request: CreateDecisionRequest) -> Result<DecisionsDocument, DecisionError> {
    decisions::create(request)
}

#[tauri::command]
fn update_decision(request: UpdateDecisionRequest) -> Result<DecisionsDocument, DecisionError> {
    decisions::update(request)
}

#[tauri::command]
fn approve_decision(request: DecisionActionRequest) -> Result<DecisionsDocument, DecisionError> {
    decisions::approve(request)
}

#[tauri::command]
fn deprecate_decision(request: DecisionActionRequest) -> Result<DecisionsDocument, DecisionError> {
    decisions::deprecate(request)
}

fn session_id() -> &'static str {
    SESSION_ID.get_or_init(|| uuid::Uuid::new_v4().to_string())
}

fn usage_as_ai_error(error: UsageError) -> AIError {
    AIError::new(error.code, &error.message)
}

#[tauri::command]
fn inspect_workspace(path: String) -> Result<WorkspaceInspection, WorkspaceError> {
    workspace::inspect(Path::new(&path))
}

#[tauri::command]
fn initialize_workspace(path: String) -> Result<WorkspaceInspection, WorkspaceError> {
    workspace::initialize(Path::new(&path))
}

#[tauri::command]
fn inspect_repository_reality(path: String) -> git_reality::RepositoryRealityResult {
    match workspace::inspect(Path::new(&path)) {
        Ok(WorkspaceInspection::Valid { .. }) => git_reality::inspect(Path::new(&path)),
        _ => git_reality::inspection_failed(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            inspect_workspace,
            initialize_workspace,
            inspect_repository_reality,
            run_ai_evaluation,
            list_models,
            list_specialist_profiles,
            run_specialist_analysis,
            load_specialist_runs,
            promote_specialist_finding,
            archive_and_reset_specialist_history,
            get_usage_summary,
            run_project_interview_turn,
            load_project_interview,
            save_project_interview,
            load_compendium,
            create_knowledge_entry,
            update_knowledge_entry,
            deprecate_knowledge_entry,
            import_interview_to_compendium,
            load_decisions,
            create_decision,
            update_decision,
            approve_decision,
            deprecate_decision,
            development_workspace_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running ForgeMind");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn development_workspace_ignores_missing_or_blank_paths() {
        assert_eq!(configured_development_workspace(None), None);
        assert_eq!(configured_development_workspace(Some("  ".to_owned())), None);
        assert_eq!(
            configured_development_workspace(Some(" D:\\Game ".to_owned())),
            Some("D:\\Game".to_owned())
        );
    }
}
