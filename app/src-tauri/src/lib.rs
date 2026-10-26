pub mod ai;
pub mod ai_workspace;
pub mod alignment;
pub mod compendium;
pub mod creator_ai;
pub mod decisions;
pub mod feature_contracts;
pub mod interview;
pub mod git_reality;
pub mod model_registry;
pub mod reality_connections;
pub mod specialist_history;
pub mod specialists;
mod structured_output;
pub mod usage;
pub mod unity_groundtruth;
pub mod writers_room;
mod workspace;

use std::path::Path;
use std::sync::OnceLock;

use workspace::{WorkspaceError, WorkspaceInspection};

use ai::{AIError, AIRequest, AIResponse};
use ai_workspace::{
    AiWorkspaceContextPlan, AiWorkspaceDocument, AiWorkspaceError, AiWorkspaceProfile,
    AppendAiWorkspaceMessageRequest, BuildAiWorkspaceContextRequest,
    CreateAiWorkspaceProposalRequest, CreateAiWorkspaceSessionRequest,
    ReviewAiWorkspaceProposalRequest, AiWorkspaceSessionActionRequest,
    SetAiWorkspaceMarkdownContextRequest, ApplyAiWorkspaceProposalRequest,
    AiWorkspaceApplyResult, UpdateAiWorkspaceProposalRequest,
};
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
use reality_connections::{
    DisconnectRealityConnectionRequest, RealityConnectionError, RealityConnections,
    SetRealityConnectionRequest,
};
use specialist_history::{
    SpecialistRunBudgetMetadata, SpecialistRunUsage, SpecialistRunsDocument,
};
use specialists::{
    SpecialistAnalysisRequest, SpecialistAnalysisResult, SpecialistError, SpecialistHistoryWarning,
    SpecialistProfile,
};
use usage::{TaskCategory, UsageError, UsageSummary};
use writers_room::{
    WritersRoomPreflight, WritersRoomPreflightRequest, WritersRoomRunRequest,
    WritersRoomRunResult,
};

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
fn list_ai_workspace_profiles() -> Vec<AiWorkspaceProfile> {
    ai_workspace::profiles()
}

#[tauri::command]
fn load_ai_workspace_sessions(path: String) -> Result<Option<AiWorkspaceDocument>, AiWorkspaceError> {
    ai_workspace::load(Path::new(&path))
}

#[tauri::command]
fn create_ai_workspace_session(
    request: CreateAiWorkspaceSessionRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::create_session(request)
}

#[tauri::command]
fn append_ai_workspace_message(
    request: AppendAiWorkspaceMessageRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::append_message(request)
}

#[tauri::command]
fn archive_ai_workspace_session(
    request: AiWorkspaceSessionActionRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::archive_session(request)
}

#[tauri::command]
fn reopen_ai_workspace_session(
    request: AiWorkspaceSessionActionRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::reopen_session(request)
}

#[tauri::command]
fn delete_ai_workspace_session(
    request: AiWorkspaceSessionActionRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::delete_session(request)
}

#[tauri::command]
fn create_ai_workspace_proposal(
    request: CreateAiWorkspaceProposalRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::create_proposal(request)
}

#[tauri::command]
fn review_ai_workspace_proposal(
    request: ReviewAiWorkspaceProposalRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::review_proposal(request)
}

#[tauri::command]
fn update_ai_workspace_proposal(
    request: UpdateAiWorkspaceProposalRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::update_proposal(request)
}

#[tauri::command]
fn build_ai_workspace_context(
    request: BuildAiWorkspaceContextRequest,
) -> Result<AiWorkspaceContextPlan, AiWorkspaceError> {
    ai_workspace::build_context(request)
}

#[tauri::command]
fn archive_and_reset_ai_workspace_history(
    path: String,
) -> Result<ai_workspace::AiWorkspaceRecovery, AiWorkspaceError> {
    ai_workspace::archive_and_reset(Path::new(&path))
}

#[tauri::command]
fn set_ai_workspace_markdown_context(
    request: SetAiWorkspaceMarkdownContextRequest,
) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    ai_workspace::set_markdown_context(request)
}

#[tauri::command]
fn apply_ai_workspace_proposal(
    request: ApplyAiWorkspaceProposalRequest,
) -> Result<AiWorkspaceApplyResult, AiWorkspaceError> {
    ai_workspace::apply_proposal(request)
}

#[tauri::command]
fn get_writers_room_preflight(
    request: WritersRoomPreflightRequest,
) -> Result<WritersRoomPreflight, AiWorkspaceError> {
    writers_room::preflight(request)
}

#[tauri::command]
async fn run_writers_room(
    request: WritersRoomRunRequest,
) -> Result<WritersRoomRunResult, AiWorkspaceError> {
    let prepared = writers_room::prepare_run(request)?;
    let provider_result = ai::generate_with_nebius(prepared.ai_request.clone()).await;
    let normalized = provider_result
        .as_ref()
        .map_err(|error| AiWorkspaceError::from_ai(error.clone()))
        .and_then(|response| writers_room::normalize_response(response, &prepared));
    let usage_session_id = session_id();
    let mut record = usage::record_for_result(
        usage_session_id,
        Some(&prepared.project_id),
        &prepared.model,
        Some(writers_room::task_category()),
        &provider_result,
    );
    let normalized = normalized.map_err(|error| {
        error.with_structured_output_usage_reference(usage_session_id, &record.timestamp)
    });
    record.structured_output_success = provider_result.is_ok().then_some(normalized.is_ok());
    if provider_result.is_ok() {
        record.error_category = normalized.as_ref().err().map(|error| error.code.clone());
        record.structured_output_diagnostics = normalized
            .as_ref()
            .err()
            .and_then(|error| error.structured_output_diagnostics.clone());
    }
    usage::application_usage_path()
        .and_then(|path| usage::append_record(&path, &record))
        .map_err(|error| AiWorkspaceError::new(error.code, &error.message))?;
    let response = provider_result.map_err(AiWorkspaceError::from_ai)?;
    let normalized = normalized?;
    writers_room::complete_run(prepared, normalized, &record, &response)
}

#[tauri::command]
fn load_writers_room_usage(project_id: String) -> Result<Vec<usage::UsageRecord>, UsageError> {
    let records = usage::load_records(&usage::application_usage_path()?)?;
    Ok(records.into_iter().filter(|record| {
        record.project_id.as_deref() == Some(project_id.as_str())
            && record.task_category == Some(writers_room::task_category())
    }).collect())
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

fn validate_connection_project(
    root_path: &str,
    expected_project_id: Option<&str>,
) -> Result<workspace::ProjectMetadata, RealityConnectionError> {
    match workspace::inspect(Path::new(root_path)) {
        Ok(WorkspaceInspection::Valid { project, .. })
            if expected_project_id.map_or(true, |expected| expected == project.project_id) => Ok(project),
        _ => Err(RealityConnectionError {
            code: "INVALID_REALITY_CONNECTION_PROJECT",
            message: "Reality connections require the current valid ForgeMind project.".to_owned(),
        }),
    }
}

#[tauri::command]
fn get_reality_connections(path: String) -> Result<RealityConnections, RealityConnectionError> {
    let project = validate_connection_project(&path, None)?;
    reality_connections::load(&project.project_id)
}

#[tauri::command]
fn set_reality_connection(
    request: SetRealityConnectionRequest,
) -> Result<RealityConnections, RealityConnectionError> {
    validate_connection_project(&request.root_path, Some(&request.project_id))?;
    reality_connections::set(
        &request.project_id,
        request.source,
        Path::new(&request.selected_path),
    )
}

#[tauri::command]
fn disconnect_reality_connection(
    request: DisconnectRealityConnectionRequest,
) -> Result<RealityConnections, RealityConnectionError> {
    validate_connection_project(&request.root_path, Some(&request.project_id))?;
    reality_connections::disconnect(&request.project_id, request.source)
}

#[tauri::command]
fn inspect_repository_reality(path: String) -> git_reality::RepositoryRealityResult {
    match workspace::inspect(Path::new(&path)) {
        Ok(WorkspaceInspection::Valid { project, .. }) => {
            match reality_connections::resolved_path(
                Path::new(&path),
                &project.project_id,
                reality_connections::RealitySource::Repository,
            ) {
                Ok(source_path) => git_reality::inspect(&source_path),
                Err(_) => git_reality::inspection_failed(),
            }
        }
        _ => git_reality::inspection_failed(),
    }
}

#[tauri::command]
fn inspect_unity_groundtruth(path: String) -> unity_groundtruth::UnityGroundTruthResult {
    match workspace::inspect(Path::new(&path)) {
        Ok(WorkspaceInspection::Valid { project, .. }) => {
            let project_root = Path::new(&path);
            match reality_connections::resolved_path(
                project_root,
                &project.project_id,
                reality_connections::RealitySource::Unity,
            ) {
                Ok(source_path) => {
                    let detached_source =
                        source_path.canonicalize().ok() != project_root.canonicalize().ok();
                    unity_groundtruth::inspect(
                        &source_path,
                        project_root,
                        &project.project_id,
                        detached_source,
                    )
                }
                Err(_) => unity_groundtruth::inspection_failed(),
            }
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
            get_reality_connections,
            set_reality_connection,
            disconnect_reality_connection,
            inspect_repository_reality,
            inspect_unity_groundtruth,
            run_ai_evaluation,
            suggest_new_project_core_loops,
            suggest_new_project_design_pillars,
            get_creator_ai_preflight,
            list_models,
            list_specialist_profiles,
            list_ai_workspace_profiles,
            load_ai_workspace_sessions,
            create_ai_workspace_session,
            append_ai_workspace_message,
            archive_ai_workspace_session,
            reopen_ai_workspace_session,
            delete_ai_workspace_session,
            create_ai_workspace_proposal,
            review_ai_workspace_proposal,
            update_ai_workspace_proposal,
            build_ai_workspace_context,
            archive_and_reset_ai_workspace_history,
            set_ai_workspace_markdown_context,
            apply_ai_workspace_proposal,
            get_writers_room_preflight,
            run_writers_room,
            load_writers_room_usage,
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
