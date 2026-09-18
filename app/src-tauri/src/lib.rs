mod workspace;

use std::path::Path;

use workspace::{WorkspaceError, WorkspaceInspection};

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
            initialize_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running ForgeMind");
}
