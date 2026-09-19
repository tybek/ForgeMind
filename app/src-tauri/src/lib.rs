pub mod ai;
mod workspace;

use std::path::Path;

use workspace::{WorkspaceError, WorkspaceInspection};

use ai::{AIError, AIRequest, AIResponse};

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
async fn run_ai_evaluation(request: AIRequest) -> Result<AIResponse, AIError> {
    ai::generate_with_nebius(request).await
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
