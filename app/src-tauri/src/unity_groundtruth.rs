use chrono::DateTime;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Component, Path};

const GROUNDTRUTH_FORMAT_VERSION: u32 = 1;
const GROUNDTRUTH_FILE: &str = "unity-groundtruth.json";
const MAX_MANIFEST_BYTES: u64 = 10 * 1024 * 1024;
const MAX_OBSERVATIONS_PER_CATEGORY: usize = 10_000;
const MAX_COVERAGE_ERRORS: usize = 100;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UnityProjectStatus {
    Detected,
    NotDetected,
    InspectionFailed,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UnityVersionStatus {
    Available,
    Missing,
    Invalid,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GroundTruthManifestStatus {
    NotAttached,
    NotGenerated,
    Available,
    InvalidOrUnsupported,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnityProjectEvidence {
    pub assets: bool,
    pub packages: bool,
    pub project_settings: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnityVersionEvidence {
    pub status: UnityVersionStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroundTruthObservationCounts {
    pub scenes: usize,
    pub game_objects: usize,
    pub components: usize,
    pub serialized_fields: usize,
    pub prefab_references: usize,
    pub scriptable_objects: usize,
    pub tags: usize,
    pub layers: usize,
    pub input_actions: usize,
    pub tests: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroundTruthManifestSummary {
    pub format_version: u32,
    pub generated_at: String,
    pub unity_version: String,
    pub coverage_categories: Vec<GroundTruthCategory>,
    pub coverage_error_count: usize,
    pub coverage_issues: Vec<GroundTruthCoverageIssue>,
    pub observation_counts: GroundTruthObservationCounts,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GroundTruthCoverageIssueKind {
    BoundedTruncation,
    Unsupported,
    Error,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroundTruthCoverageIssue {
    pub category: GroundTruthCategory,
    pub code: String,
    pub kind: GroundTruthCoverageIssueKind,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroundTruthManifestEvidence {
    pub status: GroundTruthManifestStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<GroundTruthManifestSummary>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnityGroundTruthResult {
    pub status: UnityProjectStatus,
    pub evidence: UnityProjectEvidence,
    pub project_version: UnityVersionEvidence,
    pub manifest: GroundTruthManifestEvidence,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GroundTruthAlignmentEvidence {
    pub id: String,
    pub summary: String,
    pub generated_at: String,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GroundTruthCategory {
    Scenes,
    GameObjects,
    Components,
    SerializedFields,
    PrefabReferences,
    ScriptableObjects,
    TagsLayers,
    InputActions,
    Tests,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum GroundTruthSourceKind {
    UnityEditorExport,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GroundTruthSource {
    kind: GroundTruthSourceKind,
    tool_version: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GroundTruthCoverageError {
    category: GroundTruthCategory,
    code: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GroundTruthCoverage {
    categories: Vec<GroundTruthCategory>,
    errors: Vec<GroundTruthCoverageError>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SceneObservation {
    id: String,
    path: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GameObjectObservation {
    id: String,
    scene_id: String,
    hierarchy_path: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ComponentObservation {
    id: String,
    game_object_id: String,
    type_name: String,
    #[serde(default)]
    script_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SerializedFieldObservation {
    component_id: String,
    name: String,
    type_name: String,
    #[serde(default)]
    reference: Option<ProjectReference>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProjectReference {
    owner_id: String,
    path: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ScriptableObjectObservation {
    id: String,
    path: String,
    type_name: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LayerObservation {
    index: u8,
    name: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct InputActionObservation {
    asset_path: String,
    map_name: String,
    action_name: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TestMetadataObservation {
    assembly_name: String,
    platform: String,
    test_count: u32,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GroundTruthObservations {
    scenes: Vec<SceneObservation>,
    game_objects: Vec<GameObjectObservation>,
    components: Vec<ComponentObservation>,
    serialized_fields: Vec<SerializedFieldObservation>,
    prefab_references: Vec<ProjectReference>,
    scriptable_objects: Vec<ScriptableObjectObservation>,
    tags: Vec<String>,
    layers: Vec<LayerObservation>,
    input_actions: Vec<InputActionObservation>,
    tests: Vec<TestMetadataObservation>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GroundTruthManifest {
    format_version: u32,
    project_id: String,
    generated_at: String,
    unity_version: String,
    source: GroundTruthSource,
    coverage: GroundTruthCoverage,
    observations: GroundTruthObservations,
}

#[derive(Debug, PartialEq, Eq)]
enum ManifestLoadError {
    Invalid,
    UnsupportedVersion,
}

pub fn inspect(
    source_root: &Path,
    project_root: &Path,
    project_id: &str,
    detached_source: bool,
) -> UnityGroundTruthResult {
    let evidence = UnityProjectEvidence {
        assets: source_root.join("Assets").is_dir(),
        packages: source_root.join("Packages").is_dir(),
        project_settings: source_root.join("ProjectSettings").is_dir(),
    };
    let status = if evidence.assets && evidence.packages && evidence.project_settings {
        UnityProjectStatus::Detected
    } else {
        UnityProjectStatus::NotDetected
    };
    UnityGroundTruthResult {
        status,
        project_version: read_project_version(source_root),
        manifest: read_manifest_evidence(project_root, source_root, project_id, detached_source),
        evidence,
        message: (status == UnityProjectStatus::NotDetected).then(|| {
            "The active workspace does not contain all canonical Unity project directories. ForgeMind remains usable.".to_owned()
        }),
    }
}

pub fn inspection_failed() -> UnityGroundTruthResult {
    UnityGroundTruthResult {
        status: UnityProjectStatus::InspectionFailed,
        evidence: UnityProjectEvidence { assets: false, packages: false, project_settings: false },
        project_version: UnityVersionEvidence { status: UnityVersionStatus::Missing, version: None },
        manifest: GroundTruthManifestEvidence {
            status: GroundTruthManifestStatus::NotGenerated,
            summary: None,
            message: None,
        },
        message: Some("Unity GroundTruth could not be inspected. The ForgeMind workspace remains usable.".to_owned()),
    }
}

pub fn alignment_evidence(
    workspace_root: &Path,
    project_id: &str,
) -> Vec<GroundTruthAlignmentEvidence> {
    let path = workspace_root.join(".forgemind").join(GROUNDTRUTH_FILE);
    let Ok(manifest) = load_manifest(&path, project_id) else {
        return Vec::new();
    };
    let mut evidence = vec![GroundTruthAlignmentEvidence {
        id: format!("unity:manifest:{}", manifest.generated_at),
        summary: format!(
            "Unity GroundTruth snapshot {} from Unity {} contains {} scenes, {} GameObjects, and {} components.",
            manifest.generated_at,
            manifest.unity_version,
            manifest.observations.scenes.len(),
            manifest.observations.game_objects.len(),
            manifest.observations.components.len(),
        ),
        generated_at: manifest.generated_at.clone(),
    }];

    for scene in &manifest.observations.scenes {
        evidence.push(GroundTruthAlignmentEvidence {
            id: format!("unity:scene:{}", scene.id),
            summary: format!(
                "Unity GroundTruth observed scene {}.",
                scene.path,
            ),
            generated_at: manifest.generated_at.clone(),
        });
    }

    let mut component_types = BTreeMap::<String, usize>::new();
    for component in &manifest.observations.components {
        *component_types.entry(component.type_name.clone()).or_default() += 1;
    }
    for (index, (type_name, count)) in component_types.into_iter().enumerate() {
        evidence.push(GroundTruthAlignmentEvidence {
            id: format!("unity:component:{}:{index}", manifest.generated_at),
            summary: format!(
                "Unity GroundTruth observed component type {type_name} on {count} component{}; this proves presence only, not runtime behavior.",
                if count == 1 { "" } else { "s" },
            ),
            generated_at: manifest.generated_at.clone(),
        });
    }

    for scriptable_object in &manifest.observations.scriptable_objects {
        evidence.push(GroundTruthAlignmentEvidence {
            id: format!("unity:scriptable-object:{}", scriptable_object.id),
            summary: format!(
                "Unity GroundTruth observed ScriptableObject {} of type {}.",
                scriptable_object.path,
                scriptable_object.type_name,
            ),
            generated_at: manifest.generated_at.clone(),
        });
    }
    evidence
}

fn read_project_version(workspace_root: &Path) -> UnityVersionEvidence {
    let path = workspace_root.join("ProjectSettings").join("ProjectVersion.txt");
    if !path.is_file() {
        return UnityVersionEvidence { status: UnityVersionStatus::Missing, version: None };
    }
    let Ok(contents) = fs::read_to_string(path) else {
        return UnityVersionEvidence { status: UnityVersionStatus::Invalid, version: None };
    };
    let version = contents.lines().find_map(|line| {
        line.strip_prefix("m_EditorVersion:")
            .map(str::trim)
            .filter(|value| valid_version(value))
            .map(str::to_owned)
    });
    match version {
        Some(version) => UnityVersionEvidence { status: UnityVersionStatus::Available, version: Some(version) },
        None => UnityVersionEvidence { status: UnityVersionStatus::Invalid, version: None },
    }
}

fn read_manifest_evidence(
    project_root: &Path,
    source_root: &Path,
    project_id: &str,
    detached_source: bool,
) -> GroundTruthManifestEvidence {
    let path = project_root.join(".forgemind").join(GROUNDTRUTH_FILE);
    if !path.is_file() {
        if detached_source {
            let foreign_manifest_present = source_root
                .join(".forgemind")
                .join(GROUNDTRUTH_FILE)
                .is_file();
            return GroundTruthManifestEvidence {
                status: GroundTruthManifestStatus::NotAttached,
                summary: None,
                message: Some(if foreign_manifest_present {
                    "GroundTruth exists in the connected source, but is not attached to this ForgeMind project.".to_owned()
                } else {
                    "This ForgeMind project has no GroundTruth export attached yet.".to_owned()
                }),
            };
        }
        return GroundTruthManifestEvidence {
            status: GroundTruthManifestStatus::NotGenerated,
            summary: None,
            message: None,
        };
    }
    match load_manifest(&path, project_id) {
        Ok(manifest) => GroundTruthManifestEvidence {
            status: GroundTruthManifestStatus::Available,
            summary: Some(manifest_summary(&manifest)),
            message: None,
        },
        Err(ManifestLoadError::Invalid | ManifestLoadError::UnsupportedVersion) => GroundTruthManifestEvidence {
            status: GroundTruthManifestStatus::InvalidOrUnsupported,
            summary: None,
            message: Some("The Unity GroundTruth manifest is malformed or uses an unsupported format version.".to_owned()),
        },
    }
}

fn load_manifest(path: &Path, project_id: &str) -> Result<GroundTruthManifest, ManifestLoadError> {
    if fs::metadata(path).map_err(|_| ManifestLoadError::Invalid)?.len() > MAX_MANIFEST_BYTES {
        return Err(ManifestLoadError::Invalid);
    }
    let bytes = fs::read(path).map_err(|_| ManifestLoadError::Invalid)?;
    let value: serde_json::Value = serde_json::from_slice(&bytes).map_err(|_| ManifestLoadError::Invalid)?;
    if value.get("formatVersion").and_then(serde_json::Value::as_u64) != Some(GROUNDTRUTH_FORMAT_VERSION.into()) {
        return Err(ManifestLoadError::UnsupportedVersion);
    }
    let manifest: GroundTruthManifest = serde_json::from_value(value).map_err(|_| ManifestLoadError::Invalid)?;
    validate_manifest(&manifest, project_id)?;
    Ok(manifest)
}

fn validate_manifest(manifest: &GroundTruthManifest, project_id: &str) -> Result<(), ManifestLoadError> {
    if manifest.format_version != GROUNDTRUTH_FORMAT_VERSION
        || manifest.project_id != project_id
        || DateTime::parse_from_rfc3339(&manifest.generated_at).is_err()
        || !valid_version(&manifest.unity_version)
        || !valid_text(&manifest.source.tool_version, 64)
        || manifest.coverage.categories.len() > 9
        || manifest.coverage.errors.len() > MAX_COVERAGE_ERRORS
        || !unique(&manifest.coverage.categories)
        || manifest.coverage.errors.iter().any(|error| !valid_code(&error.code))
        || !valid_observations(&manifest.observations)
    {
        return Err(ManifestLoadError::Invalid);
    }
    Ok(())
}

fn valid_observations(observations: &GroundTruthObservations) -> bool {
    let within_bounds = [
        observations.scenes.len(), observations.game_objects.len(), observations.components.len(),
        observations.serialized_fields.len(), observations.prefab_references.len(),
        observations.scriptable_objects.len(), observations.tags.len(), observations.layers.len(),
        observations.input_actions.len(), observations.tests.len(),
    ].into_iter().all(|count| count <= MAX_OBSERVATIONS_PER_CATEGORY);
    within_bounds
        && observations.scenes.iter().all(|item| valid_identifier(&item.id) && valid_project_path(&item.path))
        && observations.game_objects.iter().all(|item| valid_identifier(&item.id) && valid_identifier(&item.scene_id) && valid_identifier(&item.hierarchy_path))
        && observations.components.iter().all(|item| valid_identifier(&item.id) && valid_identifier(&item.game_object_id) && valid_text(&item.type_name, 256) && item.script_path.as_deref().is_none_or(valid_project_path))
        && observations.serialized_fields.iter().all(|item| valid_identifier(&item.component_id) && valid_text(&item.name, 256) && valid_text(&item.type_name, 256) && item.reference.as_ref().is_none_or(valid_reference))
        && observations.prefab_references.iter().all(valid_reference)
        && observations.scriptable_objects.iter().all(|item| valid_identifier(&item.id) && valid_project_path(&item.path) && valid_text(&item.type_name, 256))
        && observations.tags.iter().all(|tag| valid_text(tag, 256))
        && observations.layers.iter().all(|layer| layer.index <= 31 && valid_text(&layer.name, 256))
        && observations.input_actions.iter().all(|item| valid_project_path(&item.asset_path) && valid_text(&item.map_name, 256) && valid_text(&item.action_name, 256))
        && observations.tests.iter().all(|item| valid_text(&item.assembly_name, 256) && valid_text(&item.platform, 64))
}

fn valid_reference(reference: &ProjectReference) -> bool {
    valid_identifier(&reference.owner_id) && valid_project_path(&reference.path)
}

fn valid_project_path(value: &str) -> bool {
    if value.is_empty() || value.len() > 512 || value.contains('\\') || value.chars().any(char::is_control) {
        return false;
    }
    let path = Path::new(value);
    !path.is_absolute() && path.components().all(|component| matches!(component, Component::Normal(_)))
}

fn valid_identifier(value: &str) -> bool {
    valid_text(value, 512)
        && !value.contains('\\')
        && !Path::new(value).is_absolute()
        && Path::new(value).components().all(|component| {
            !matches!(
                component,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
}

fn valid_text(value: &str, max: usize) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty() && trimmed == value && value.len() <= max && !value.chars().any(char::is_control)
}

fn valid_version(value: &str) -> bool {
    valid_text(value, 64) && value.chars().all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_' | '+'))
}

fn valid_code(value: &str) -> bool {
    !value.is_empty() && value.len() <= 64 && value.chars().all(|character| character.is_ascii_uppercase() || character.is_ascii_digit() || character == '_')
}

fn unique<T: Eq + std::hash::Hash>(values: &[T]) -> bool {
    let mut seen = HashSet::new();
    values.iter().all(|value| seen.insert(value))
}

fn manifest_summary(manifest: &GroundTruthManifest) -> GroundTruthManifestSummary {
    GroundTruthManifestSummary {
        format_version: manifest.format_version,
        generated_at: manifest.generated_at.clone(),
        unity_version: manifest.unity_version.clone(),
        coverage_categories: manifest.coverage.categories.clone(),
        coverage_error_count: manifest.coverage.errors.len(),
        coverage_issues: manifest
            .coverage
            .errors
            .iter()
            .map(|issue| GroundTruthCoverageIssue {
                category: issue.category,
                code: issue.code.clone(),
                kind: coverage_issue_kind(&issue.code),
            })
            .collect(),
        observation_counts: GroundTruthObservationCounts {
            scenes: manifest.observations.scenes.len(),
            game_objects: manifest.observations.game_objects.len(),
            components: manifest.observations.components.len(),
            serialized_fields: manifest.observations.serialized_fields.len(),
            prefab_references: manifest.observations.prefab_references.len(),
            scriptable_objects: manifest.observations.scriptable_objects.len(),
            tags: manifest.observations.tags.len(),
            layers: manifest.observations.layers.len(),
            input_actions: manifest.observations.input_actions.len(),
            tests: manifest.observations.tests.len(),
        },
    }
}

fn coverage_issue_kind(code: &str) -> GroundTruthCoverageIssueKind {
    if code.ends_with("_TRUNCATED") {
        GroundTruthCoverageIssueKind::BoundedTruncation
    } else if code.ends_with("_API_UNAVAILABLE") {
        GroundTruthCoverageIssueKind::Unsupported
    } else {
        GroundTruthCoverageIssueKind::Error
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    const PROJECT_ID: &str = "project-123";

    fn unity_project(version: Option<&str>) -> TempDir {
        let temp = tempfile::tempdir().unwrap();
        fs::create_dir(temp.path().join("Assets")).unwrap();
        fs::create_dir(temp.path().join("Packages")).unwrap();
        fs::create_dir(temp.path().join("ProjectSettings")).unwrap();
        if let Some(version) = version {
            fs::write(temp.path().join("ProjectSettings/ProjectVersion.txt"), version).unwrap();
        }
        temp
    }

    fn valid_manifest() -> serde_json::Value {
        json!({
            "formatVersion": 1,
            "projectId": PROJECT_ID,
            "generatedAt": "2026-09-20T12:00:00Z",
            "unityVersion": "6000.3.23f1",
            "source": { "kind": "UNITY_EDITOR_EXPORT", "toolVersion": "0.1.0" },
            "coverage": { "categories": ["SCENES", "COMPONENTS"], "errors": [] },
            "observations": {
                "scenes": [{ "id": "scene:main", "path": "Assets/Scenes/Main.unity" }],
                "gameObjects": [{ "id": "scene:main/Player", "sceneId": "scene:main", "hierarchyPath": "Player" }],
                "components": [{ "id": "scene:main/Player#Movement", "gameObjectId": "scene:main/Player", "typeName": "Game.Movement", "scriptPath": "Assets/Scripts/Movement.cs" }],
                "serializedFields": [{ "componentId": "scene:main/Player#Movement", "name": "speed", "typeName": "System.Single" }],
                "prefabReferences": [{ "ownerId": "scene:main/Player", "path": "Assets/Prefabs/Player.prefab" }],
                "scriptableObjects": [{ "id": "asset:settings", "path": "Assets/Data/Settings.asset", "typeName": "Game.Settings" }],
                "tags": ["Player"],
                "layers": [{ "index": 8, "name": "Gameplay" }],
                "inputActions": [{ "assetPath": "Assets/Input/Game.inputactions", "mapName": "Player", "actionName": "Move" }],
                "tests": [{ "assemblyName": "Game.Tests", "platform": "EDIT_MODE", "testCount": 12 }]
            }
        })
    }

    fn write_manifest(root: &Path, value: &serde_json::Value) {
        fs::create_dir_all(root.join(".forgemind")).unwrap();
        fs::write(root.join(".forgemind").join(GROUNDTRUTH_FILE), serde_json::to_vec_pretty(value).unwrap()).unwrap();
    }

    fn inspect_attached(root: &Path, project_id: &str) -> UnityGroundTruthResult {
        inspect(root, root, project_id, false)
    }

    #[test]
    fn non_unity_workspace_is_safe_and_usable() {
        let temp = tempfile::tempdir().unwrap();
        let result = inspect_attached(temp.path(), PROJECT_ID);
        assert_eq!(result.status, UnityProjectStatus::NotDetected);
        assert!(result.message.unwrap().contains("remains usable"));
        assert_eq!(result.manifest.status, GroundTruthManifestStatus::NotGenerated);
    }

    #[test]
    fn detects_canonical_unity_project_evidence_and_version() {
        let temp = unity_project(Some("m_EditorVersion: 6000.3.23f1\nm_EditorVersionWithRevision: ignored\n"));
        let result = inspect_attached(temp.path(), PROJECT_ID);
        assert_eq!(result.status, UnityProjectStatus::Detected);
        assert_eq!(result.project_version.status, UnityVersionStatus::Available);
        assert_eq!(result.project_version.version.as_deref(), Some("6000.3.23f1"));
        assert!(result.evidence.assets && result.evidence.packages && result.evidence.project_settings);
    }

    #[test]
    fn missing_and_corrupt_project_versions_are_distinct_safe_states() {
        let missing = unity_project(None);
        assert_eq!(inspect_attached(missing.path(), PROJECT_ID).project_version.status, UnityVersionStatus::Missing);
        let corrupt = unity_project(Some("not a Unity project version"));
        assert_eq!(inspect_attached(corrupt.path(), PROJECT_ID).project_version.status, UnityVersionStatus::Invalid);
    }

    #[test]
    fn loads_a_valid_versioned_manifest_as_a_safe_summary() {
        let temp = unity_project(Some("m_EditorVersion: 6000.3.23f1"));
        write_manifest(temp.path(), &valid_manifest());
        let result = inspect_attached(temp.path(), PROJECT_ID);
        assert_eq!(result.manifest.status, GroundTruthManifestStatus::Available);
        let summary = result.manifest.summary.as_ref().unwrap();
        assert_eq!(summary.observation_counts.scenes, 1);
        assert_eq!(summary.observation_counts.components, 1);
        let serialized = serde_json::to_string(&result).unwrap();
        assert!(!serialized.contains("Assets/Scenes/Main.unity"));
        assert!(!serialized.contains("Movement.cs"));
    }

    #[test]
    fn reports_capped_coverage_as_a_safe_partial_issue() {
        let mut manifest: GroundTruthManifest = serde_json::from_value(valid_manifest()).unwrap();
        let field = manifest.observations.serialized_fields[0].clone();
        manifest.observations.serialized_fields = vec![field; MAX_OBSERVATIONS_PER_CATEGORY];
        manifest.coverage.errors = vec![
            GroundTruthCoverageError {
                category: GroundTruthCategory::SerializedFields,
                code: "SERIALIZED_FIELDS_TRUNCATED".to_owned(),
            },
            GroundTruthCoverageError {
                category: GroundTruthCategory::InputActions,
                code: "INPUT_ACTION_API_UNAVAILABLE".to_owned(),
            },
            GroundTruthCoverageError {
                category: GroundTruthCategory::Tests,
                code: "TEST_DISCOVERY_FAILED".to_owned(),
            },
        ];

        let summary = manifest_summary(&manifest);
        assert_eq!(
            summary.observation_counts.serialized_fields,
            MAX_OBSERVATIONS_PER_CATEGORY
        );
        assert_eq!(
            summary.coverage_issues[0].kind,
            GroundTruthCoverageIssueKind::BoundedTruncation
        );
        assert_eq!(
            summary.coverage_issues[1].kind,
            GroundTruthCoverageIssueKind::Unsupported
        );
        assert_eq!(
            summary.coverage_issues[2].kind,
            GroundTruthCoverageIssueKind::Error
        );
        let serialized = serde_json::to_string(&summary).unwrap();
        assert!(serialized.contains("SERIALIZED_FIELDS_TRUNCATED"));
        assert!(!serialized.contains("Assets/"));
    }

    #[test]
    fn rejects_malformed_and_unsupported_manifests() {
        let temp = unity_project(Some("m_EditorVersion: 6000.3.23f1"));
        fs::create_dir_all(temp.path().join(".forgemind")).unwrap();
        let path = temp.path().join(".forgemind").join(GROUNDTRUTH_FILE);
        fs::write(&path, b"{not json").unwrap();
        assert_eq!(load_manifest(&path, PROJECT_ID), Err(ManifestLoadError::Invalid));
        let mut unsupported = valid_manifest();
        unsupported["formatVersion"] = json!(2);
        write_manifest(temp.path(), &unsupported);
        assert_eq!(load_manifest(&path, PROJECT_ID), Err(ManifestLoadError::UnsupportedVersion));
    }

    #[test]
    fn rejects_a_manifest_for_another_forgemind_project() {
        let temp = unity_project(Some("m_EditorVersion: 6000.3.23f1"));
        write_manifest(temp.path(), &valid_manifest());
        assert_eq!(
            load_manifest(
                &temp.path().join(".forgemind").join(GROUNDTRUTH_FILE),
                "another-project"
            ),
            Err(ManifestLoadError::Invalid)
        );
    }

    #[test]
    fn detached_source_keeps_portable_inspection_but_does_not_adopt_foreign_groundtruth() {
        let active_project = tempfile::tempdir().unwrap();
        let foreign_unity = unity_project(Some("m_EditorVersion: 6000.3.23f1"));
        write_manifest(foreign_unity.path(), &valid_manifest());

        let detached = inspect(foreign_unity.path(), active_project.path(), "project-a", true);
        assert_eq!(detached.status, UnityProjectStatus::Detected);
        assert_eq!(detached.project_version.version.as_deref(), Some("6000.3.23f1"));
        assert_eq!(detached.manifest.status, GroundTruthManifestStatus::NotAttached);
        assert!(detached.manifest.summary.is_none());
        assert!(detached
            .manifest
            .message
            .unwrap()
            .contains("not attached to this ForgeMind project"));
        assert!(alignment_evidence(active_project.path(), "project-a").is_empty());

        let owning_project = inspect_attached(foreign_unity.path(), PROJECT_ID);
        assert_eq!(owning_project.manifest.status, GroundTruthManifestStatus::Available);
        assert!(!alignment_evidence(foreign_unity.path(), PROJECT_ID).is_empty());
    }

    #[test]
    fn detached_source_still_loads_valid_groundtruth_owned_by_the_active_project() {
        let active_project = tempfile::tempdir().unwrap();
        let foreign_unity = unity_project(Some("m_EditorVersion: 6000.3.23f1"));
        let mut active_manifest = valid_manifest();
        active_manifest["projectId"] = json!("project-a");
        write_manifest(active_project.path(), &active_manifest);

        let result = inspect(foreign_unity.path(), active_project.path(), "project-a", true);
        assert_eq!(result.status, UnityProjectStatus::Detected);
        assert_eq!(result.manifest.status, GroundTruthManifestStatus::Available);
        assert!(result.manifest.summary.is_some());
    }

    #[test]
    fn rejects_absolute_parent_and_windows_paths() {
        for invalid in ["/private/scene.unity", "../scene.unity", "C:\\secret\\scene.unity"] {
            let temp = unity_project(Some("m_EditorVersion: 6000.3.23f1"));
            let mut manifest = valid_manifest();
            manifest["observations"]["scenes"][0]["path"] = json!(invalid);
            write_manifest(temp.path(), &manifest);
            assert_eq!(load_manifest(&temp.path().join(".forgemind").join(GROUNDTRUTH_FILE), PROJECT_ID), Err(ManifestLoadError::Invalid));
        }
    }

    #[test]
    fn rejects_secret_bearing_or_unknown_manifest_fields() {
        let temp = unity_project(Some("m_EditorVersion: 6000.3.23f1"));
        let mut manifest = valid_manifest();
        manifest["apiKey"] = json!("secret-token");
        write_manifest(temp.path(), &manifest);
        assert_eq!(load_manifest(&temp.path().join(".forgemind").join(GROUNDTRUTH_FILE), PROJECT_ID), Err(ManifestLoadError::Invalid));
    }
}
