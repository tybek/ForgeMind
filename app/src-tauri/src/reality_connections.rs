use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

const CONNECTIONS_FORMAT_VERSION: u32 = 1;
const CONNECTIONS_FILE_NAME: &str = "reality-connections-v1.json";

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RealitySource {
    Repository,
    Unity,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SetRealityConnectionRequest {
    pub root_path: String,
    pub project_id: String,
    pub source: RealitySource,
    pub selected_path: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DisconnectRealityConnectionRequest {
    pub root_path: String,
    pub project_id: String,
    pub source: RealitySource,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProjectConnections {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    repository_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    unity_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConnectionStore {
    format_version: u32,
    projects: BTreeMap<String, ProjectConnections>,
}

impl Default for ConnectionStore {
    fn default() -> Self {
        Self {
            format_version: CONNECTIONS_FORMAT_VERSION,
            projects: BTreeMap::new(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RealityConnectionSummary {
    pub configured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub folder_name: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RealityConnections {
    pub repository: RealityConnectionSummary,
    pub unity: RealityConnectionSummary,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RealityConnectionError {
    pub code: &'static str,
    pub message: String,
}

impl RealityConnectionError {
    fn storage() -> Self {
        Self {
            code: "REALITY_CONNECTION_STORAGE_FAILED",
            message: "ForgeMind could not access its local Reality connection settings.".to_owned(),
        }
    }

    pub fn invalid_path() -> Self {
        Self {
            code: "INVALID_REALITY_CONNECTION_PATH",
            message: "The selected Reality folder is unavailable or is not a directory.".to_owned(),
        }
    }
}

pub fn application_connections_path() -> Result<PathBuf, RealityConnectionError> {
    #[cfg(target_os = "windows")]
    let base = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);

    #[cfg(target_os = "macos")]
    let base = std::env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| home.join("Library").join("Application Support"));

    #[cfg(all(unix, not(target_os = "macos")))]
    let base = std::env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("HOME")
                .map(PathBuf::from)
                .map(|home| home.join(".local").join("share"))
        });

    base.map(|directory| directory.join("ForgeMind").join(CONNECTIONS_FILE_NAME))
        .ok_or_else(RealityConnectionError::storage)
}

pub fn load(project_id: &str) -> Result<RealityConnections, RealityConnectionError> {
    load_from(&application_connections_path()?, project_id)
}

pub fn set(project_id: &str, source: RealitySource, selected_path: &Path) -> Result<RealityConnections, RealityConnectionError> {
    set_in(&application_connections_path()?, project_id, source, selected_path)
}

pub fn disconnect(project_id: &str, source: RealitySource) -> Result<RealityConnections, RealityConnectionError> {
    disconnect_in(&application_connections_path()?, project_id, source)
}

pub fn resolved_path(workspace_root: &Path, project_id: &str, source: RealitySource) -> Result<PathBuf, RealityConnectionError> {
    resolved_path_from(&application_connections_path()?, workspace_root, project_id, source)
}

fn resolved_path_from(store_path: &Path, workspace_root: &Path, project_id: &str, source: RealitySource) -> Result<PathBuf, RealityConnectionError> {
    let store = read_store(store_path)?;
    let selected = store.projects.get(project_id).and_then(|connections| match source {
        RealitySource::Repository => connections.repository_path.as_deref(),
        RealitySource::Unity => connections.unity_path.as_deref(),
    });
    match selected {
        Some(path) => {
            let path = PathBuf::from(path);
            if path.is_dir() { Ok(path) } else { Err(RealityConnectionError::invalid_path()) }
        }
        None => Ok(workspace_root.to_path_buf()),
    }
}

fn load_from(path: &Path, project_id: &str) -> Result<RealityConnections, RealityConnectionError> {
    let store = read_store(path)?;
    Ok(summarize(store.projects.get(project_id).cloned().unwrap_or_default()))
}

fn set_in(path: &Path, project_id: &str, source: RealitySource, selected_path: &Path) -> Result<RealityConnections, RealityConnectionError> {
    if !selected_path.is_dir() {
        return Err(RealityConnectionError::invalid_path());
    }
    let selected_path = selected_path.canonicalize().map_err(|_| RealityConnectionError::invalid_path())?;
    let mut store = read_store(path)?;
    let connections = store.projects.entry(project_id.to_owned()).or_default();
    let value = selected_path.to_string_lossy().into_owned();
    match source {
        RealitySource::Repository => connections.repository_path = Some(value),
        RealitySource::Unity => connections.unity_path = Some(value),
    }
    let summary = summarize(connections.clone());
    write_store(path, &store)?;
    Ok(summary)
}

fn disconnect_in(path: &Path, project_id: &str, source: RealitySource) -> Result<RealityConnections, RealityConnectionError> {
    let mut store = read_store(path)?;
    let connections = store.projects.entry(project_id.to_owned()).or_default();
    match source {
        RealitySource::Repository => connections.repository_path = None,
        RealitySource::Unity => connections.unity_path = None,
    }
    let summary = summarize(connections.clone());
    if connections.repository_path.is_none() && connections.unity_path.is_none() {
        store.projects.remove(project_id);
    }
    write_store(path, &store)?;
    Ok(summary)
}

fn summarize(connections: ProjectConnections) -> RealityConnections {
    RealityConnections {
        repository: summary(connections.repository_path.as_deref()),
        unity: summary(connections.unity_path.as_deref()),
    }
}

fn summary(path: Option<&str>) -> RealityConnectionSummary {
    RealityConnectionSummary {
        configured: path.is_some(),
        folder_name: path.and_then(|value| Path::new(value).file_name())
            .map(|name| name.to_string_lossy().into_owned()),
    }
}

fn read_store(path: &Path) -> Result<ConnectionStore, RealityConnectionError> {
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(ConnectionStore::default()),
        Err(_) => return Err(RealityConnectionError::storage()),
    };
    let store: ConnectionStore = serde_json::from_str(&contents).map_err(|_| RealityConnectionError::storage())?;
    if store.format_version != CONNECTIONS_FORMAT_VERSION {
        return Err(RealityConnectionError::storage());
    }
    Ok(store)
}

fn write_store(path: &Path, store: &ConnectionStore) -> Result<(), RealityConnectionError> {
    let parent = path.parent().ok_or_else(RealityConnectionError::storage)?;
    fs::create_dir_all(parent).map_err(|_| RealityConnectionError::storage())?;
    let mut serialized = serde_json::to_vec_pretty(store).map_err(|_| RealityConnectionError::storage())?;
    serialized.push(b'\n');
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, serialized).map_err(|_| RealityConnectionError::storage())?;
    fs::rename(&temporary, path).or_else(|error| {
        if error.kind() == io::ErrorKind::AlreadyExists || path.exists() {
            fs::remove_file(path)?;
            fs::rename(&temporary, path)
        } else {
            Err(error)
        }
    }).map_err(|_| RealityConnectionError::storage())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn connections_are_scoped_per_project_and_do_not_modify_selected_sources() {
        let temp = TempDir::new().unwrap();
        let store = temp.path().join(CONNECTIONS_FILE_NAME);
        let repository = temp.path().join("repo");
        let unity = temp.path().join("unity");
        fs::create_dir(&repository).unwrap();
        fs::create_dir(&unity).unwrap();

        let first = set_in(&store, "project-a", RealitySource::Repository, &repository).unwrap();
        let second = set_in(&store, "project-b", RealitySource::Unity, &unity).unwrap();

        assert!(first.repository.configured);
        assert!(!load_from(&store, "project-a").unwrap().unity.configured);
        assert!(second.unity.configured);
        assert!(!load_from(&store, "project-b").unwrap().repository.configured);
        assert_eq!(fs::read_dir(&repository).unwrap().count(), 0);
        assert_eq!(fs::read_dir(&unity).unwrap().count(), 0);
    }

    #[test]
    fn disconnect_removes_only_the_selected_project_connection() {
        let temp = TempDir::new().unwrap();
        let store = temp.path().join(CONNECTIONS_FILE_NAME);
        let repository = temp.path().join("repo");
        let unity = temp.path().join("unity");
        fs::create_dir(&repository).unwrap();
        fs::create_dir(&unity).unwrap();
        set_in(&store, "project-a", RealitySource::Repository, &repository).unwrap();
        set_in(&store, "project-a", RealitySource::Unity, &unity).unwrap();

        let summary = disconnect_in(&store, "project-a", RealitySource::Repository).unwrap();

        assert!(!summary.repository.configured);
        assert!(summary.unity.configured);
    }

    #[test]
    fn missing_selected_folder_fails_safely() {
        let temp = TempDir::new().unwrap();
        let store = temp.path().join(CONNECTIONS_FILE_NAME);
        let error = set_in(&store, "project-a", RealitySource::Repository, &temp.path().join("missing")).unwrap_err();
        assert_eq!(error.code, "INVALID_REALITY_CONNECTION_PATH");
        assert!(!store.exists());
    }

    #[test]
    fn a_connected_folder_that_later_disappears_fails_without_falling_back() {
        let temp = TempDir::new().unwrap();
        let store = temp.path().join(CONNECTIONS_FILE_NAME);
        let workspace = temp.path().join("workspace");
        let repository = temp.path().join("repo");
        fs::create_dir(&workspace).unwrap();
        fs::create_dir(&repository).unwrap();
        set_in(&store, "project-a", RealitySource::Repository, &repository).unwrap();
        fs::remove_dir(&repository).unwrap();

        let error = resolved_path_from(&store, &workspace, "project-a", RealitySource::Repository).unwrap_err();

        assert_eq!(error.code, "INVALID_REALITY_CONNECTION_PATH");
        assert!(workspace.is_dir());
    }
}
