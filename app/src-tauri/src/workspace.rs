use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const CURRENT_FORMAT_VERSION: i64 = 1;
const METADATA_DIRECTORY: &str = ".forgemind";
const PROJECT_FILE: &str = "project.json";

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMetadata {
    pub format_version: i64,
    pub project_id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(
    tag = "status",
    rename_all = "SCREAMING_SNAKE_CASE",
    rename_all_fields = "camelCase"
)]
pub enum WorkspaceInspection {
    Uninitialized {
        root_path: String,
    },
    Valid {
        root_path: String,
        project: ProjectMetadata,
    },
    Invalid {
        root_path: String,
        message: String,
    },
    UnsupportedVersion {
        root_path: String,
        version: String,
        message: String,
    },
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceError {
    pub code: &'static str,
    pub message: String,
}

impl WorkspaceError {
    fn directory_access() -> Self {
        Self {
            code: "DIRECTORY_ACCESS_FAILED",
            message: "ForgeMind could not access the selected directory.".to_string(),
        }
    }

    fn initialization(message: impl Into<String>) -> Self {
        Self {
            code: "INITIALIZATION_FAILED",
            message: message.into(),
        }
    }

    fn already_exists() -> Self {
        Self {
            code: "METADATA_ALREADY_EXISTS",
            message: "ForgeMind workspace metadata already exists and was not overwritten."
                .to_string(),
        }
    }
}

pub fn inspect(root: &Path) -> Result<WorkspaceInspection, WorkspaceError> {
    ensure_directory(root)?;

    let root_path = display_path(root);
    let project_path = metadata_path(root);
    let contents = match fs::read_to_string(&project_path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            return Ok(WorkspaceInspection::Uninitialized { root_path });
        }
        Err(_) => return Err(WorkspaceError::directory_access()),
    };

    let value: Value = match serde_json::from_str(&contents) {
        Ok(value) => value,
        Err(_) => return Ok(invalid(root_path)),
    };

    let object = match value.as_object() {
        Some(object) => object,
        None => return Ok(invalid(root_path)),
    };

    let version = match object.get("formatVersion") {
        Some(Value::Number(number)) if number.is_i64() || number.is_u64() => number,
        _ => return Ok(invalid(root_path)),
    };

    if version.as_i64() != Some(CURRENT_FORMAT_VERSION) {
        let encountered = version.to_string();
        return Ok(WorkspaceInspection::UnsupportedVersion {
            root_path,
            version: encountered.clone(),
            message: format!(
                "ForgeMind workspace format version {encountered} is not supported."
            ),
        });
    }

    let project: ProjectMetadata = match serde_json::from_value(value) {
        Ok(project) => project,
        Err(_) => return Ok(invalid(root_path)),
    };

    if !is_valid_project(&project) {
        return Ok(invalid(root_path));
    }

    Ok(WorkspaceInspection::Valid { root_path, project })
}

pub fn initialize(root: &Path) -> Result<WorkspaceInspection, WorkspaceError> {
    ensure_directory(root)?;

    let name = root
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .ok_or_else(|| {
            WorkspaceError::initialization(
                "ForgeMind could not derive a project name from the selected directory.",
            )
        })?
        .to_string();

    let metadata_directory = root.join(METADATA_DIRECTORY);
    match fs::create_dir(&metadata_directory) {
        Ok(()) => {}
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
            if !metadata_directory.is_dir() {
                return Err(WorkspaceError::initialization(
                    "ForgeMind could not create its metadata directory.",
                ));
            }
        }
        Err(_) => {
            return Err(WorkspaceError::initialization(
                "ForgeMind could not create its metadata directory.",
            ));
        }
    }

    let project_path = metadata_directory.join(PROJECT_FILE);
    let project = ProjectMetadata {
        format_version: CURRENT_FORMAT_VERSION,
        project_id: Uuid::new_v4().to_string(),
        name,
        created_at: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
    };
    let mut serialized = serde_json::to_vec_pretty(&project).map_err(|_| {
        WorkspaceError::initialization("ForgeMind could not prepare workspace metadata.")
    })?;
    serialized.push(b'\n');

    let mut file = match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&project_path)
    {
        Ok(file) => file,
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
            return Err(WorkspaceError::already_exists());
        }
        Err(_) => {
            return Err(WorkspaceError::initialization(
                "ForgeMind could not create workspace metadata.",
            ));
        }
    };

    if file
        .write_all(&serialized)
        .and_then(|_| file.sync_all())
        .is_err()
    {
        drop(file);
        let _ = fs::remove_file(&project_path);
        return Err(WorkspaceError::initialization(
            "ForgeMind could not finish writing workspace metadata.",
        ));
    }

    Ok(WorkspaceInspection::Valid {
        root_path: display_path(root),
        project,
    })
}

fn ensure_directory(root: &Path) -> Result<(), WorkspaceError> {
    match fs::metadata(root) {
        Ok(metadata) if metadata.is_dir() => Ok(()),
        _ => Err(WorkspaceError::directory_access()),
    }
}

fn metadata_path(root: &Path) -> PathBuf {
    root.join(METADATA_DIRECTORY).join(PROJECT_FILE)
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn invalid(root_path: String) -> WorkspaceInspection {
    WorkspaceInspection::Invalid {
        root_path,
        message: "ForgeMind workspace metadata is invalid.".to_string(),
    }
}

fn is_valid_project(project: &ProjectMetadata) -> bool {
    project.format_version == CURRENT_FORMAT_VERSION
        && !project.project_id.trim().is_empty()
        && Uuid::parse_str(&project.project_id).is_ok()
        && !project.name.trim().is_empty()
        && DateTime::parse_from_rfc3339(&project.created_at).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;
    use tempfile::TempDir;

    fn valid_project(override_version: i64) -> String {
        format!(
            concat!(
                "{{\n",
                "  \"formatVersion\": {override_version},\n",
                "  \"projectId\": \"550e8400-e29b-41d4-a716-446655440000\",\n",
                "  \"name\": \"Example\",\n",
                "  \"createdAt\": \"2026-09-18T20:00:00Z\"\n",
                "}}\n"
            ),
            override_version = override_version
        )
    }

    fn write_metadata(root: &Path, contents: &str) {
        let directory = root.join(METADATA_DIRECTORY);
        fs::create_dir(&directory).unwrap();
        fs::write(directory.join(PROJECT_FILE), contents).unwrap();
    }

    #[test]
    fn empty_directory_is_uninitialized() {
        let directory = TempDir::new().unwrap();

        assert!(matches!(
            inspect(directory.path()).unwrap(),
            WorkspaceInspection::Uninitialized { .. }
        ));
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 0);
    }

    #[test]
    fn initialization_creates_only_expected_metadata_with_valid_values() {
        let parent = TempDir::new().unwrap();
        let root = parent.path().join("ExampleGame");
        fs::create_dir(&root).unwrap();

        let result = initialize(&root).unwrap();
        let WorkspaceInspection::Valid { project, .. } = result else {
            panic!("expected a valid workspace");
        };

        let root_entries = fs::read_dir(&root)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect::<BTreeSet<_>>();
        let metadata_entries = fs::read_dir(root.join(METADATA_DIRECTORY))
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect::<BTreeSet<_>>();

        assert_eq!(root_entries, BTreeSet::from([METADATA_DIRECTORY.to_string()]));
        assert_eq!(metadata_entries, BTreeSet::from([PROJECT_FILE.to_string()]));
        assert_eq!(project.format_version, CURRENT_FORMAT_VERSION);
        assert_eq!(project.name, "ExampleGame");
        assert!(Uuid::parse_str(&project.project_id).is_ok());
        assert!(DateTime::parse_from_rfc3339(&project.created_at).is_ok());
    }

    #[test]
    fn reopening_preserves_project_identity() {
        let directory = TempDir::new().unwrap();
        let initialized = initialize(directory.path()).unwrap();
        let reopened = inspect(directory.path()).unwrap();

        let WorkspaceInspection::Valid {
            project: initialized,
            ..
        } = initialized
        else {
            panic!("expected initialized workspace");
        };
        let WorkspaceInspection::Valid {
            project: reopened, ..
        } = reopened
        else {
            panic!("expected reopened workspace");
        };

        assert_eq!(initialized, reopened);
    }

    #[test]
    fn initialization_refuses_to_overwrite_existing_metadata() {
        let directory = TempDir::new().unwrap();
        write_metadata(directory.path(), "preserve me");
        let project_path = metadata_path(directory.path());
        let before = fs::read(&project_path).unwrap();

        let error = initialize(directory.path()).unwrap_err();

        assert_eq!(error.code, "METADATA_ALREADY_EXISTS");
        assert_eq!(fs::read(project_path).unwrap(), before);
    }

    #[test]
    fn malformed_metadata_is_invalid_and_unchanged() {
        let directory = TempDir::new().unwrap();
        write_metadata(directory.path(), "{not json");
        let project_path = metadata_path(directory.path());
        let before = fs::read(&project_path).unwrap();

        assert!(matches!(
            inspect(directory.path()).unwrap(),
            WorkspaceInspection::Invalid { .. }
        ));
        assert_eq!(fs::read(project_path).unwrap(), before);
    }

    #[test]
    fn unsupported_version_is_reported_and_unchanged() {
        let directory = TempDir::new().unwrap();
        write_metadata(directory.path(), &valid_project(2));
        let project_path = metadata_path(directory.path());
        let before = fs::read(&project_path).unwrap();

        let result = inspect(directory.path()).unwrap();

        assert!(matches!(
            result,
            WorkspaceInspection::UnsupportedVersion { ref version, .. } if version == "2"
        ));
        assert_eq!(fs::read(project_path).unwrap(), before);
    }
}
