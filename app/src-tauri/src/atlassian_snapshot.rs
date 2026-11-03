use crate::project_export::{self, ExportEntry, ProjectBrainExport};
use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Write;
use std::path::Path;

const SCHEMA_VERSION: u32 = 1;
const EXPORT_DIRECTORY: &str = "exports";
const SNAPSHOT_FILE: &str = "atlassian-project-snapshot.json";
const SECTION_IDS: [&str; 4] = ["project-knowledge", "decisions", "open-questions", "specialist-analysis"];
const CONTENT_DETAIL_KEYS: [&str; 7] = ["rationale", "assumptions", "recommendations", "risks", "exploits", "open_questions", "suggested_tests"];

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AtlassianProjectSnapshot {
    pub schema_version: u32,
    pub generated_at: String,
    pub source_export: SnapshotSourceExport,
    pub project: SnapshotProject,
    pub sections: Vec<SnapshotSection>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotSourceExport { pub schema_version: u32 }

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotProject { pub project_id: String, pub name: String }

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotSection {
    pub id: String,
    pub title: String,
    pub order: u32,
    pub entries: Vec<SnapshotEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotEntry {
    pub id: String,
    pub anchor: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub area: Option<String>,
    pub title: String,
    pub body: String,
    pub status: String,
    pub authority: String,
    pub provenance: SnapshotProvenance,
    pub timestamps: SnapshotTimestamps,
    pub details: Vec<SnapshotDetail>,
    pub references: Vec<SnapshotReference>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotProvenance {
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub provenance_type: Option<String>,
    pub source: String,
    pub documented_sources: Vec<SnapshotDocumentedSource>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotDocumentedSource {
    pub source_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub excerpt: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotTimestamps {
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approved_at: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotDetail { pub key: String, pub label: String, pub values: Vec<String> }

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SnapshotReference { pub relation: String, pub target_id: String, pub target_anchor: String }

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlassianSnapshotExportResult {
    pub schema_version: u32,
    pub generated_at: String,
    pub entry_count: usize,
    pub snapshot_path: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlassianSnapshotError { pub code: String, pub message: String }

impl AtlassianSnapshotError {
    fn new(code: &str, message: impl Into<String>) -> Self { Self { code: code.to_owned(), message: message.into() } }
}

pub fn export(root: &Path, project_id: &str) -> Result<AtlassianSnapshotExportResult, AtlassianSnapshotError> {
    let generated_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let source = project_export::build_contract(root, project_id, &generated_at)
        .map_err(|error| AtlassianSnapshotError::new(&error.code, error.message))?;
    let snapshot = from_project_export(source);
    validate(&snapshot)?;
    let mut json = serde_json::to_vec_pretty(&snapshot)
        .map_err(|_| AtlassianSnapshotError::new("SNAPSHOT_SERIALIZATION_FAILED", "ForgeMind could not prepare the Atlassian snapshot."))?;
    json.push(b'\n');

    let root = fs::canonicalize(root).map_err(|_| write_error())?;
    let metadata = fs::canonicalize(root.join(".forgemind")).map_err(|_| write_error())?;
    if !metadata.starts_with(&root) || !metadata.is_dir() { return Err(write_error()); }
    let export_directory = metadata.join(EXPORT_DIRECTORY);
    fs::create_dir_all(&export_directory).map_err(|_| write_error())?;
    let export_directory = fs::canonicalize(&export_directory).map_err(|_| write_error())?;
    if !export_directory.starts_with(&metadata) || !export_directory.is_dir() { return Err(write_error()); }
    write_managed_file(&export_directory.join(SNAPSHOT_FILE), &json)?;

    Ok(AtlassianSnapshotExportResult {
        schema_version: SCHEMA_VERSION,
        generated_at,
        entry_count: snapshot.sections.iter().map(|section| section.entries.len()).sum(),
        snapshot_path: format!(".forgemind/{EXPORT_DIRECTORY}/{SNAPSHOT_FILE}"),
    })
}

pub fn from_project_export(source: ProjectBrainExport) -> AtlassianProjectSnapshot {
    AtlassianProjectSnapshot {
        schema_version: SCHEMA_VERSION,
        generated_at: source.generated_at,
        source_export: SnapshotSourceExport { schema_version: source.schema_version },
        project: SnapshotProject { project_id: source.project.id, name: source.project.name },
        sections: source.sections.into_iter().enumerate().map(|(order, section)| SnapshotSection {
            id: section.id,
            title: section.title,
            order: order as u32,
            entries: section.entries.into_iter().map(map_entry).collect(),
        }).collect(),
    }
}

fn map_entry(entry: ExportEntry) -> SnapshotEntry {
    SnapshotEntry {
        id: entry.id,
        anchor: entry.anchor,
        kind: entry.kind,
        area: entry.area,
        title: entry.title,
        body: entry.body,
        status: entry.status,
        authority: entry.authority,
        provenance: SnapshotProvenance {
            provenance_type: entry.provenance,
            source: entry.source,
            documented_sources: entry.documented_sources.into_iter().map(|source| SnapshotDocumentedSource {
                source_id: source.source_id,
                section: source.section,
                excerpt: source.excerpt,
            }).collect(),
        },
        timestamps: SnapshotTimestamps {
            created_at: entry.timestamps.created_at,
            updated_at: entry.timestamps.updated_at,
            approved_at: entry.timestamps.approved_at,
        },
        details: entry.details.into_iter().filter(|detail| CONTENT_DETAIL_KEYS.contains(&detail.key.as_str())).map(|detail| SnapshotDetail {
            key: detail.key,
            label: detail.label,
            values: detail.values,
        }).collect(),
        references: entry.references.into_iter().map(|reference| SnapshotReference {
            relation: reference.relation,
            target_id: reference.target_id,
            target_anchor: reference.target_anchor,
        }).collect(),
    }
}

pub fn validate(snapshot: &AtlassianProjectSnapshot) -> Result<(), AtlassianSnapshotError> {
    if snapshot.schema_version != SCHEMA_VERSION || snapshot.source_export.schema_version != 1 {
        return Err(invalid("Only Atlassian snapshot schema version 1 and Project Brain schema version 1 are supported."));
    }
    required("project.projectId", &snapshot.project.project_id)?;
    required("project.name", &snapshot.project.name)?;
    required("generatedAt", &snapshot.generated_at)?;
    if snapshot.sections.len() != SECTION_IDS.len() { return Err(invalid("Snapshot sections must use the complete fixed order.")); }

    let mut ids = HashSet::new();
    let mut anchors = HashSet::new();
    let mut id_anchors = HashMap::new();
    for (index, section) in snapshot.sections.iter().enumerate() {
        if section.id != SECTION_IDS[index] || section.order != index as u32 { return Err(invalid("Snapshot sections must use the complete fixed order.")); }
        required("section.title", &section.title)?;
        for entry in &section.entries {
            for (field, value) in [("entry.id", &entry.id), ("entry.anchor", &entry.anchor), ("entry.kind", &entry.kind), ("entry.title", &entry.title), ("entry.body", &entry.body), ("entry.status", &entry.status), ("entry.authority", &entry.authority), ("entry.provenance.source", &entry.provenance.source), ("entry.timestamps.createdAt", &entry.timestamps.created_at)] { required(field, value)?; }
            if !ids.insert(entry.id.as_str()) { return Err(invalid("Entry IDs must be unique.")); }
            if !anchors.insert(entry.anchor.as_str()) { return Err(invalid("Entry anchors must be unique.")); }
            id_anchors.insert(entry.id.as_str(), entry.anchor.as_str());
            validate_authority(entry)?;
            if entry.details.iter().any(|detail| !CONTENT_DETAIL_KEYS.contains(&detail.key.as_str())) {
                return Err(invalid("Snapshot details must contain only content-oriented fields."));
            }
            for source in &entry.provenance.documented_sources {
                required("documentedSource.sourceId", &source.source_id)?;
                if unsafe_path(&source.source_id) { return Err(invalid("Documented source IDs must be safe project-relative identifiers.")); }
            }
        }
    }
    for entry in snapshot.sections.iter().flat_map(|section| &section.entries) {
        for reference in &entry.references {
            if id_anchors.get(reference.target_id.as_str()).copied() != Some(reference.target_anchor.as_str()) {
                return Err(invalid("Every reference must target a known entry ID and anchor."));
            }
        }
    }
    Ok(())
}

fn validate_authority(entry: &SnapshotEntry) -> Result<(), AtlassianSnapshotError> {
    let knowledge_authorities = ["USER_STATED", "AI_INFERRED", "MANUAL", "UNRESOLVED", "DOCUMENTED"];
    let knowledge_statuses = ["DIRECTION", "LOCKED", "TBD", "DEPRECATED"];
    let knowledge_sources = ["project_interview", "manual_entry", "decision", "specialist_analysis", "new_project_creator", "writers_room", "knowledge_import"];
    let valid = match entry.kind.as_str() {
        "KNOWLEDGE" => knowledge_authorities.contains(&entry.authority.as_str()) && knowledge_statuses.contains(&entry.status.as_str()) && entry.provenance.provenance_type.as_deref() == Some(entry.authority.as_str()) && knowledge_sources.contains(&entry.provenance.source.as_str()),
        "OPEN_QUESTION" => knowledge_authorities.contains(&entry.authority.as_str()) && knowledge_statuses.contains(&entry.status.as_str()) && entry.provenance.provenance_type.as_deref() == Some(entry.authority.as_str()) && knowledge_sources.contains(&entry.provenance.source.as_str()),
        "DECISION" => entry.authority == "DECISION_RECORD" && ["PROPOSED", "APPROVED", "SUPERSEDED", "DEPRECATED"].contains(&entry.status.as_str()) && entry.provenance.provenance_type.is_none() && entry.provenance.source == "decision",
        "SPECIALIST_ANALYSIS" => entry.authority == "AI_ANALYSIS" && entry.status == "SUCCEEDED" && entry.provenance.provenance_type.is_none() && entry.provenance.source == "specialist_analysis",
        _ => false,
    };
    if !valid { return Err(invalid("Entry kind, status, and authority must preserve ForgeMind semantics.")); }
    Ok(())
}

fn required(field: &str, value: &str) -> Result<(), AtlassianSnapshotError> {
    if value.trim().is_empty() { Err(invalid(format!("{field} is required."))) } else { Ok(()) }
}

fn unsafe_path(value: &str) -> bool {
    let normalized = value.replace('\\', "/");
    normalized.starts_with('/') || normalized.split('/').any(|part| part == "..") || normalized.contains("://") || normalized.to_ascii_lowercase().starts_with("file:") || (normalized.len() > 2 && normalized.as_bytes()[1] == b':' && normalized.as_bytes()[0].is_ascii_alphabetic())
}

fn invalid(message: impl Into<String>) -> AtlassianSnapshotError { AtlassianSnapshotError::new("INVALID_ATLASSIAN_SNAPSHOT", message) }
fn write_error() -> AtlassianSnapshotError { AtlassianSnapshotError::new("SNAPSHOT_WRITE_FAILED", "ForgeMind could not write the managed Atlassian snapshot.") }

fn write_managed_file(path: &Path, contents: &[u8]) -> Result<(), AtlassianSnapshotError> {
    if let Ok(metadata) = fs::symlink_metadata(path) {
        if metadata.file_type().is_symlink() || !metadata.is_file() { return Err(write_error()); }
    }
    let mut file = fs::OpenOptions::new().write(true).create(true).truncate(true).open(path).map_err(|_| write_error())?;
    file.write_all(contents).map_err(|_| write_error())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    fn golden() -> AtlassianProjectSnapshot {
        serde_json::from_str(include_str!("../../../contracts/fixtures/atlassian-project-snapshot-v1.json")).unwrap()
    }

    #[test]
    fn shared_golden_fixture_is_valid_and_round_trips() {
        let snapshot = golden();
        validate(&snapshot).unwrap();
        let serialized = serde_json::to_value(&snapshot).unwrap();
        let fixture: serde_json::Value = serde_json::from_str(include_str!("../../../contracts/fixtures/atlassian-project-snapshot-v1.json")).unwrap();
        assert_eq!(serialized, fixture);
    }

    #[test]
    fn rejects_version_identity_duplicates_references_authority_and_paths() {
        let mut snapshot = golden();
        snapshot.schema_version = 2;
        assert!(validate(&snapshot).is_err());
        let mut snapshot = golden();
        snapshot.project.project_id.clear();
        assert!(validate(&snapshot).is_err());
        let mut snapshot = golden();
        snapshot.sections[1].entries[0].id = snapshot.sections[0].entries[0].id.clone();
        assert!(validate(&snapshot).is_err());
        let mut snapshot = golden();
        snapshot.sections[1].entries[0].references[0].target_id = "missing".to_owned();
        assert!(validate(&snapshot).is_err());
        let mut snapshot = golden();
        snapshot.sections[3].entries[0].authority = "DECISION_RECORD".to_owned();
        assert!(validate(&snapshot).is_err());
        let mut snapshot = golden();
        snapshot.sections[0].entries[0].provenance.documented_sources[0].source_id = "C:\\private\\notes.md".to_owned();
        assert!(validate(&snapshot).is_err());
    }

    #[test]
    fn accepts_empty_sections_and_unicode_content() {
        let mut snapshot = golden();
        for section in &mut snapshot.sections { section.entries.clear(); }
        snapshot.project.name = "Żmija 港".to_owned();
        validate(&snapshot).unwrap();
    }

    #[test]
    fn accepts_documented_open_question_authority_from_compendium() {
        let mut snapshot = golden();
        let question = &mut snapshot.sections[2].entries[0];
        question.authority = "DOCUMENTED".to_owned();
        question.provenance.provenance_type = Some("DOCUMENTED".to_owned());
        question.provenance.source = "knowledge_import".to_owned();
        validate(&snapshot).unwrap();
    }

    #[test]
    fn producer_writes_only_the_managed_snapshot_and_returns_a_relative_path() {
        let directory = TempDir::new().unwrap();
        let project_id = "99999999-9999-4999-8999-999999999999";
        let metadata = directory.path().join(".forgemind");
        fs::create_dir(&metadata).unwrap();
        let project = serde_json::to_vec_pretty(&json!({
            "formatVersion": 1,
            "projectId": project_id,
            "name": "Synthetic Harbor",
            "createdAt": "2026-11-03T10:00:00.000Z"
        })).unwrap();
        fs::write(metadata.join("project.json"), &project).unwrap();

        let result = export(directory.path(), project_id).unwrap();
        assert_eq!(result.schema_version, 1);
        assert_eq!(result.entry_count, 0);
        assert_eq!(result.snapshot_path, ".forgemind/exports/atlassian-project-snapshot.json");
        assert_eq!(fs::read(metadata.join("project.json")).unwrap(), project);
        let saved: AtlassianProjectSnapshot = serde_json::from_slice(&fs::read(directory.path().join(&result.snapshot_path)).unwrap()).unwrap();
        validate(&saved).unwrap();
    }

    #[test]
    fn transform_omits_provider_process_details() {
        let source = ProjectBrainExport {
            schema_version: 1,
            generated_at: "2026-11-03T12:00:00.000Z".to_owned(),
            project: project_export::ExportProject { id: "project".to_owned(), name: "Project".to_owned(), created_at: "not-exported".to_owned() },
            sections: SECTION_IDS.iter().enumerate().map(|(index, id)| project_export::ExportSection {
                id: (*id).to_owned(),
                title: (*id).to_owned(),
                entries: if index == 3 { vec![ExportEntry {
                    id: "specialist:run".to_owned(), source_id: "internal-run-id".to_owned(), anchor: "specialist-run".to_owned(), kind: "SPECIALIST_ANALYSIS".to_owned(), area: None,
                    title: "Summary".to_owned(), body: "Summary".to_owned(), status: "SUCCEEDED".to_owned(), authority: "AI_ANALYSIS".to_owned(), provenance: None,
                    source: "specialist_analysis".to_owned(), author: Some("not-exported".to_owned()),
                    timestamps: project_export::ExportTimestamps { created_at: "2026-11-03T12:00:00.000Z".to_owned(), updated_at: None, approved_at: None },
                    documented_sources: Vec::new(),
                    details: vec![
                        project_export::ExportDetail { key: "model".to_owned(), label: "Model".to_owned(), values: vec!["provider/model".to_owned()] },
                        project_export::ExportDetail { key: "recommendations".to_owned(), label: "Recommendations".to_owned(), values: vec!["Keep".to_owned()] },
                    ], references: Vec::new(),
                }] } else { Vec::new() },
            }).collect(),
        };
        let snapshot = from_project_export(source);
        let entry = &snapshot.sections[3].entries[0];
        assert_eq!(entry.details.iter().map(|detail| detail.key.as_str()).collect::<Vec<_>>(), vec!["recommendations"]);
        let serialized = serde_json::to_string(&snapshot).unwrap();
        assert!(!serialized.contains("provider/model"));
        assert!(!serialized.contains("internal-run-id"));
        assert!(!serialized.contains("not-exported"));
    }
}
