pub mod ai;
pub mod interview;
pub mod model_registry;
pub mod usage;
mod workspace;

use std::path::Path;
use std::sync::OnceLock;

use workspace::{WorkspaceError, WorkspaceInspection};

use ai::{AIError, AIRequest, AIResponse};
use interview::{
    InterviewDocument, InterviewError, InterviewTurnRequest, InterviewTurnResult,
    SaveInterviewRequest,
};
use model_registry::{ModelEntry, ModelRegistryError};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            inspect_workspace,
            initialize_workspace,
            run_ai_evaluation,
            list_models,
            get_usage_summary,
            run_project_interview_turn,
            load_project_interview,
            save_project_interview,
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
