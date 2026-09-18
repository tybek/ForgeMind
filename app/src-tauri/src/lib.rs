mod ai;
mod workspace;

use std::path::Path;

use workspace::{WorkspaceError, WorkspaceInspection};

use ai::{AIError, AIRequest, AIResponse};

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
            run_ai_evaluation
        ])
        .run(tauri::generate_context!())
        .expect("error while running ForgeMind");
}
