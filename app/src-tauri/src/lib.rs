pub mod ai;
pub mod alignment;
pub mod compendium;
pub mod creator_ai;
pub mod decisions;
pub mod feature_contracts;
pub mod interview;
pub mod git_reality;
pub mod model_registry;
pub mod specialist_history;
pub mod specialists;
pub mod usage;
pub mod unity_groundtruth;
mod workspace;

use std::path::Path;
use std::sync::OnceLock;

use workspace::{WorkspaceError, WorkspaceInspection};

use ai::{AIError, AIRequest, AIResponse};
use alignment::{
    AlignmentCheck, AlignmentDocument, AlignmentError, AlignmentSourceCatalog,
    ReviewAlignmentRequest,
};
use compendium::{
    CompendiumDocument, CompendiumError, CreateKnowledgeEntryRequest,
    ImportInterviewRequest, InterviewImportResult, KnowledgeEntryActionRequest,
    ProjectFoundationInput, PromoteSpecialistFindingRequest, UpdateKnowledgeEntryRequest,
};
use creator_ai::{
    CreatorAiError, CreatorAiPreflight, CreatorAiPreflightRequest, CreatorAiRequest,
    CoreLoopProposalResult, PillarProposalResult,
};
use decisions::{
    CreateDecisionRequest, DecisionActionRequest, DecisionError, DecisionsDocument,
    UpdateDecisionRequest,
};
use feature_contracts::{
    CreateFeatureContractRequest, DeleteFeatureContractRequest, DraftFeatureContractWithAiRequest,
    FeatureContractAiDraftResult, FeatureContractError, FeatureContractSourceCatalog,
    FeatureContractsDocument, SetFeatureContractStatusRequest, UpdateFeatureContractRequest,
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

#[tauri::command]
async fn suggest_new_project_core_loops(
    request: CreatorAiRequest,
) -> Result<CoreLoopProposalResult, CreatorAiError> {
    creator_ai::suggest_core_loops(request).await
}

#[tauri::command]
async fn suggest_new_project_design_pillars(
    request: CreatorAiRequest,
) -> Result<PillarProposalResult, CreatorAiError> {
    creator_ai::suggest_pillars(request).await
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
    let normalized = match specialists::normalize_result_with_notices(
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
    let history_warning = specialist_history::append_success_with_normalization(
        &request,
        normalized.result.clone(),
        normalized.normalization_notices.clone(),
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
        result: normalized.result,
        normalization_notices: normalized.normalization_notices,
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
fn get_creator_ai_preflight(
    request: CreatorAiPreflightRequest,
) -> Result<CreatorAiPreflight, CreatorAiError> {
    creator_ai::preflight(request)
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

#[tauri::command]
fn load_alignment_sources(path: String) -> Result<AlignmentSourceCatalog, AlignmentError> {
    alignment::sources(Path::new(&path))
}

#[tauri::command]
fn load_alignment_results(path: String) -> Result<Option<AlignmentDocument>, AlignmentError> {
    alignment::load(Path::new(&path))
}

#[tauri::command]
fn create_alignment_review(request: AlignmentCheck) -> Result<AlignmentDocument, AlignmentError> {
    alignment::create(request)
}

#[tauri::command]
fn review_alignment_result(
    request: ReviewAlignmentRequest,
) -> Result<AlignmentDocument, AlignmentError> {
    alignment::review(request)
}

#[tauri::command]
fn load_feature_contract_sources(path: String) -> Result<FeatureContractSourceCatalog, FeatureContractError> {
    feature_contracts::sources(Path::new(&path))
}

#[tauri::command]
fn load_feature_contracts(path: String) -> Result<Option<FeatureContractsDocument>, FeatureContractError> {
    feature_contracts::load(Path::new(&path))
}

#[tauri::command]
fn create_feature_contract(request: CreateFeatureContractRequest) -> Result<FeatureContractsDocument, FeatureContractError> {
    feature_contracts::create(request)
}

#[tauri::command]
fn update_feature_contract(request: UpdateFeatureContractRequest) -> Result<FeatureContractsDocument, FeatureContractError> {
    feature_contracts::update(request)
}

#[tauri::command]
fn delete_feature_contract_draft(request: DeleteFeatureContractRequest) -> Result<FeatureContractsDocument, FeatureContractError> {
    feature_contracts::delete_draft(request)
}

#[tauri::command]
async fn draft_feature_contract_with_ai(
    request: DraftFeatureContractWithAiRequest,
) -> Result<FeatureContractAiDraftResult, FeatureContractError> {
    let prepared = feature_contracts::build_ai_draft_request(&request)?;
    let response = evaluate_registered(
        prepared.ai_request,
        Some(request.project_id),
        Some(TaskCategory::FeatureContract),
    )
    .await
    .map_err(FeatureContractError::from_ai_error)?;
    feature_contracts::normalize_ai_draft(
        &response.text,
        response.model,
        response.latency_ms,
        response.input_tokens,
        response.output_tokens,
        response.total_tokens,
    )
}

#[tauri::command]
fn set_feature_contract_status(request: SetFeatureContractStatusRequest) -> Result<FeatureContractsDocument, FeatureContractError> {
    feature_contracts::set_status(request)
}

pub(crate) fn session_id() -> &'static str {
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
fn initialize_workspace(
    path: String,
    foundation: Option<ProjectFoundationInput>,
) -> Result<WorkspaceInspection, WorkspaceError> {
    match foundation {
        Some(foundation) => workspace::initialize_with_foundation(Path::new(&path), &foundation),
        None => workspace::initialize(Path::new(&path)),
    }
}

#[tauri::command]
fn inspect_repository_reality(path: String) -> git_reality::RepositoryRealityResult {
    match workspace::inspect(Path::new(&path)) {
        Ok(WorkspaceInspection::Valid { .. }) => git_reality::inspect(Path::new(&path)),
        _ => git_reality::inspection_failed(),
    }
}

#[tauri::command]
fn inspect_unity_groundtruth(path: String) -> unity_groundtruth::UnityGroundTruthResult {
    match workspace::inspect(Path::new(&path)) {
        Ok(WorkspaceInspection::Valid { project, .. }) => {
            unity_groundtruth::inspect(Path::new(&path), &project.project_id)
        }
        _ => unity_groundtruth::inspection_failed(),
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
            inspect_unity_groundtruth,
            run_ai_evaluation,
            suggest_new_project_core_loops,
            suggest_new_project_design_pillars,
            get_creator_ai_preflight,
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
            load_alignment_sources,
            load_alignment_results,
            create_alignment_review,
            review_alignment_result,
            load_feature_contract_sources,
            load_feature_contracts,
            create_feature_contract,
            update_feature_contract,
            delete_feature_contract_draft,
            draft_feature_contract_with_ai,
            set_feature_contract_status,
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
