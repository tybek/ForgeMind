use crate::compendium::{self, DocumentedSourceTrace, KnowledgeArea, KnowledgeEntry, KnowledgeProvenance};
use crate::decisions::{self, Decision};
use crate::specialist_history::{self, SpecialistRun, SpecialistRunStatus};
use crate::workspace::{self, WorkspaceInspection};
use chrono::{SecondsFormat, Utc};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::Path;

const EXPORT_SCHEMA_VERSION: u32 = 1;
const EXPORT_DIRECTORY: &str = "exports";
const MARKDOWN_FILE: &str = "project-brain.md";
const MANIFEST_FILE: &str = "project-brain.manifest.json";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBrainExport {
    pub schema_version: u32,
    pub generated_at: String,
    pub project: ExportProject,
    pub sections: Vec<ExportSection>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportProject {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSection {
    pub id: String,
    pub title: String,
    pub entries: Vec<ExportEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportEntry {
    pub id: String,
    pub source_id: String,
    pub anchor: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub area: Option<String>,
    pub title: String,
    pub body: String,
    pub status: String,
    pub authority: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provenance: Option<String>,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    pub timestamps: ExportTimestamps,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub documented_sources: Vec<DocumentedSourceTrace>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub details: Vec<ExportDetail>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub references: Vec<ExportReference>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTimestamps {
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approved_at: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportDetail {
    pub key: String,
    pub label: String,
    pub values: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportReference {
    pub relation: String,
    pub target_id: String,
    pub target_anchor: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBrainManifest {
    pub schema_version: u32,
    pub project_id: String,
    pub generated_at: String,
    pub included_sections: Vec<String>,
    pub entry_count: usize,
    pub entries: Vec<ManifestEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestEntry {
    pub id: String,
    pub anchor: String,
    pub section_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBrainExportResult {
    pub schema_version: u32,
    pub generated_at: String,
    pub entry_count: usize,
    pub markdown_path: String,
    pub manifest_path: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBrainExportError {
    pub code: String,
    pub message: String,
}

impl ProjectBrainExportError {
    fn new(code: &str, message: &str) -> Self {
        Self { code: code.to_owned(), message: message.to_owned() }
    }
}

pub fn export(root: &Path, project_id: &str) -> Result<ProjectBrainExportResult, ProjectBrainExportError> {
    let generated_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let contract = build_contract(root, project_id, &generated_at)?;
    let manifest = build_manifest(&contract);
    let markdown = render_markdown(&contract);
    let mut manifest_json = serde_json::to_vec_pretty(&manifest).map_err(|_| {
        ProjectBrainExportError::new("EXPORT_SERIALIZATION_FAILED", "ForgeMind could not prepare the Project Brain export.")
    })?;
    manifest_json.push(b'\n');

    let metadata_directory = confined_directory(root, &root.join(".forgemind"))?;
    let export_directory = root.join(".forgemind").join(EXPORT_DIRECTORY);
    fs::create_dir_all(&export_directory).map_err(|_| write_error())?;
    let export_directory = confined_directory(&metadata_directory, &export_directory)?;
    write_managed_file(&export_directory.join(MARKDOWN_FILE), markdown.as_bytes())?;
    write_managed_file(&export_directory.join(MANIFEST_FILE), &manifest_json)?;

    Ok(ProjectBrainExportResult {
        schema_version: EXPORT_SCHEMA_VERSION,
        generated_at,
        entry_count: manifest.entry_count,
        markdown_path: format!(".forgemind/{EXPORT_DIRECTORY}/{MARKDOWN_FILE}"),
        manifest_path: format!(".forgemind/{EXPORT_DIRECTORY}/{MANIFEST_FILE}"),
    })
}

pub(crate) fn build_contract(root: &Path, project_id: &str, generated_at: &str) -> Result<ProjectBrainExport, ProjectBrainExportError> {
    let project = match workspace::inspect(root).map_err(|_| invalid_workspace())? {
        WorkspaceInspection::Valid { project, .. } if project.project_id == project_id => project,
        WorkspaceInspection::Valid { .. } => return Err(ProjectBrainExportError::new("PROJECT_ID_MISMATCH", "The selected workspace does not match the active ForgeMind project.")),
        _ => return Err(invalid_workspace()),
    };
    let knowledge = compendium::load(root).map_err(|error| source_error("Compendium", &error.message))?.map(|document| document.entries).unwrap_or_default();
    let decisions = decisions::load(root).map_err(|error| source_error("Decisions", &error.message))?.map(|document| document.decisions).unwrap_or_default();
    let runs = specialist_history::load(root).map_err(|error| source_error("Specialist History", &error.message))?.map(|document| document.runs).unwrap_or_default();

    let mut anchors = HashMap::new();
    for entry in &knowledge { anchors.insert(format!("knowledge:{}", entry.id), anchor("knowledge", &entry.id, &entry.title)); }
    for decision in &decisions { anchors.insert(format!("decision:{}", decision.id), anchor("decision", &decision.id, &decision.title)); }
    for run in &runs {
        if run.status == SpecialistRunStatus::Succeeded && run.result.is_some() {
            anchors.insert(format!("specialist:{}", run.id), anchor("specialist", &run.id, run.result.as_ref().map(|result| result.summary.as_str()).unwrap_or("analysis")));
        }
    }

    let mut project_knowledge = Vec::new();
    let mut open_questions = Vec::new();
    for entry in knowledge {
        let exported = knowledge_entry(entry.clone(), &anchors);
        if entry.area == KnowledgeArea::OpenQuestions || entry.provenance == KnowledgeProvenance::Unresolved { open_questions.push(exported); }
        else { project_knowledge.push(exported); }
    }
    let mut decision_entries = decisions.into_iter().map(|decision| decision_entry(decision, &anchors)).collect::<Vec<_>>();
    let mut specialist_entries = runs.into_iter().filter_map(|run| specialist_entry(run, &anchors)).collect::<Vec<_>>();
    sort_entries(&mut project_knowledge);
    sort_entries(&mut decision_entries);
    sort_entries(&mut open_questions);
    sort_entries(&mut specialist_entries);

    Ok(ProjectBrainExport {
        schema_version: EXPORT_SCHEMA_VERSION,
        generated_at: generated_at.to_owned(),
        project: ExportProject { id: project.project_id, name: project.name, created_at: project.created_at },
        sections: vec![
            section("project-knowledge", "Project Knowledge", project_knowledge),
            section("decisions", "Decisions", decision_entries),
            section("open-questions", "Open Questions", open_questions),
            section("specialist-analysis", "Specialist Analysis", specialist_entries),
        ],
    })
}

fn knowledge_entry(entry: KnowledgeEntry, anchors: &HashMap<String, String>) -> ExportEntry {
    let id = format!("knowledge:{}", entry.id);
    ExportEntry {
        anchor: anchors[&id].clone(), id, source_id: entry.id, kind: if entry.area == KnowledgeArea::OpenQuestions || entry.provenance == KnowledgeProvenance::Unresolved { "OPEN_QUESTION" } else { "KNOWLEDGE" }.to_owned(),
        area: Some(enum_value(entry.area)), title: entry.title, body: entry.statement,
        status: enum_value(entry.status), authority: enum_value(entry.provenance),
        provenance: Some(enum_value(entry.provenance)), source: enum_value(entry.source), author: None,
        timestamps: ExportTimestamps { created_at: entry.created_at, updated_at: Some(entry.updated_at), approved_at: None },
        documented_sources: entry.documented_sources, details: Vec::new(), references: Vec::new(),
    }
}

fn decision_entry(decision: Decision, anchors: &HashMap<String, String>) -> ExportEntry {
    let id = format!("decision:{}", decision.id);
    let mut references = Vec::new();
    if let Some(target) = &decision.supersedes_decision_id { push_reference(&mut references, "SUPERSEDES", &format!("decision:{target}"), anchors); }
    for target in &decision.related_knowledge_entry_ids { push_reference(&mut references, "RELATED_KNOWLEDGE", &format!("knowledge:{target}"), anchors); }
    references.sort_by(|a, b| (&a.relation, &a.target_id).cmp(&(&b.relation, &b.target_id)));
    ExportEntry {
        anchor: anchors[&id].clone(), id, source_id: decision.id, kind: "DECISION".to_owned(), area: Some(enum_value(decision.area)),
        title: decision.title, body: decision.statement, status: enum_value(decision.status), authority: "DECISION_RECORD".to_owned(),
        provenance: None, source: "decision".to_owned(), author: Some(decision.author),
        timestamps: ExportTimestamps { created_at: decision.created_at, updated_at: None, approved_at: decision.approved_at },
        documented_sources: decision.documented_sources,
        details: vec![ExportDetail { key: "rationale".to_owned(), label: "Rationale".to_owned(), values: vec![decision.rationale] }], references,
    }
}

fn specialist_entry(run: SpecialistRun, anchors: &HashMap<String, String>) -> Option<ExportEntry> {
    if run.status != SpecialistRunStatus::Succeeded { return None; }
    let result = run.result?;
    let id = format!("specialist:{}", run.id);
    let mut references = Vec::new();
    for target in &run.selected_knowledge_entry_ids { push_reference(&mut references, "USED_KNOWLEDGE", &format!("knowledge:{target}"), anchors); }
    for target in &run.selected_decision_ids { push_reference(&mut references, "USED_DECISION", &format!("decision:{target}"), anchors); }
    references.sort_by(|a, b| (&a.relation, &a.target_id).cmp(&(&b.relation, &b.target_id)));
    let mut details = vec![
        detail("profile", "Specialist Profile", vec![run.specialist_profile_id]),
        detail("task_type", "Task Type", vec![enum_value(run.task_type)]),
        detail("model", "Model", vec![run.model_id]),
    ];
    for (key, label, values) in [
        ("assumptions", "Assumptions", result.assumptions), ("recommendations", "Recommendations", result.recommendations),
        ("risks", "Risks", result.risks), ("exploits", "Exploits", result.exploits),
        ("open_questions", "Open Questions", result.open_questions), ("suggested_tests", "Suggested Tests", result.suggested_tests),
    ] { if !values.is_empty() { details.push(detail(key, label, values)); } }
    Some(ExportEntry {
        anchor: anchors[&id].clone(), id, source_id: run.id, kind: "SPECIALIST_ANALYSIS".to_owned(), area: None,
        title: result.summary.clone(), body: result.summary, status: "SUCCEEDED".to_owned(), authority: "AI_ANALYSIS".to_owned(),
        provenance: None, source: "specialist_analysis".to_owned(), author: None,
        timestamps: ExportTimestamps { created_at: run.created_at, updated_at: None, approved_at: None },
        documented_sources: Vec::new(), details, references,
    })
}

fn build_manifest(contract: &ProjectBrainExport) -> ProjectBrainManifest {
    let entries = contract.sections.iter().flat_map(|section| section.entries.iter().map(move |entry| ManifestEntry {
        id: entry.id.clone(), anchor: entry.anchor.clone(), section_id: section.id.clone(),
    })).collect::<Vec<_>>();
    ProjectBrainManifest {
        schema_version: contract.schema_version, project_id: contract.project.id.clone(), generated_at: contract.generated_at.clone(),
        included_sections: contract.sections.iter().map(|section| section.id.clone()).collect(), entry_count: entries.len(), entries,
    }
}

fn render_markdown(contract: &ProjectBrainExport) -> String {
    let mut output = String::new();
    output.push_str(&format!("# {} — Project Brain\n\n", escape_inline(&contract.project.name)));
    output.push_str(&format!("- Schema version: {}\n- Project ID: `{}`\n- Generated at: `{}`\n\n", contract.schema_version, escape_code(&contract.project.id), escape_code(&contract.generated_at)));
    output.push_str("> Derived export. ForgeMind's Project Metadata, Compendium, Decisions, and Specialist History remain authoritative.\n\n");
    for section in &contract.sections {
        output.push_str(&format!("## {}\n\n", escape_inline(&section.title)));
        if section.entries.is_empty() { output.push_str("_No entries._\n\n"); continue; }
        for entry in &section.entries {
            output.push_str(&format!("<a id=\"{}\"></a>\n### {}\n\n", entry.anchor, escape_inline(&entry.title)));
            output.push_str(&format!("- Stable ID: `{}`\n- Kind: {}\n", escape_code(&entry.id), entry.kind));
            if let Some(value) = &entry.area { output.push_str(&format!("- Area: {}\n", value)); }
            output.push_str(&format!("- Status: {}\n- Authority: {}\n", entry.status, entry.authority));
            if let Some(value) = &entry.provenance { output.push_str(&format!("- Provenance: {}\n", value)); }
            output.push_str(&format!("- Source: {}\n- Created: `{}`\n", entry.source, escape_code(&entry.timestamps.created_at)));
            if let Some(value) = &entry.timestamps.updated_at { output.push_str(&format!("- Updated: `{}`\n", escape_code(value))); }
            if let Some(value) = &entry.timestamps.approved_at { output.push_str(&format!("- Approved: `{}`\n", escape_code(value))); }
            if let Some(value) = &entry.author { output.push_str(&format!("- Author: {}\n", escape_inline(value))); }
            output.push('\n');
            output.push_str(&escape_block(&entry.body)); output.push_str("\n\n");
            for detail in &entry.details {
                output.push_str(&format!("#### {}\n\n", escape_inline(&detail.label)));
                for value in &detail.values { output.push_str(&format!("- {}\n", escape_inline(value))); }
                output.push('\n');
            }
            if !entry.documented_sources.is_empty() {
                output.push_str("#### Documented Sources\n\n");
                for source in &entry.documented_sources {
                    let mut value = format!("`{}`", escape_code(&source.source_id));
                    if let Some(section) = &source.section { value.push_str(&format!(" — {}", escape_inline(section))); }
                    if let Some(excerpt) = &source.excerpt { value.push_str(&format!(": {}", escape_inline(excerpt))); }
                    output.push_str(&format!("- {value}\n"));
                }
                output.push('\n');
            }
            if !entry.references.is_empty() {
                output.push_str("#### References\n\n");
                for reference in &entry.references { output.push_str(&format!("- {}: [`{}`](#{})\n", reference.relation, escape_code(&reference.target_id), reference.target_anchor)); }
                output.push('\n');
            }
        }
    }
    output
}

fn section(id: &str, title: &str, entries: Vec<ExportEntry>) -> ExportSection { ExportSection { id: id.to_owned(), title: title.to_owned(), entries } }
fn detail(key: &str, label: &str, values: Vec<String>) -> ExportDetail { ExportDetail { key: key.to_owned(), label: label.to_owned(), values } }
fn push_reference(output: &mut Vec<ExportReference>, relation: &str, target_id: &str, anchors: &HashMap<String, String>) { if let Some(target_anchor) = anchors.get(target_id) { output.push(ExportReference { relation: relation.to_owned(), target_id: target_id.to_owned(), target_anchor: target_anchor.clone() }); } }
fn sort_entries(entries: &mut [ExportEntry]) { entries.sort_by(|a, b| (status_rank(&a.status), a.title.to_lowercase(), &a.title, &a.id).cmp(&(status_rank(&b.status), b.title.to_lowercase(), &b.title, &b.id))); }
fn status_rank(status: &str) -> u8 { match status { "LOCKED" | "DIRECTION" | "APPROVED" | "SUCCEEDED" => 0, "TBD" | "PROPOSED" => 1, "SUPERSEDED" | "DEPRECATED" => 2, _ => 3 } }
fn enum_value<T: Serialize>(value: T) -> String { serde_json::to_value(value).ok().and_then(|value| value.as_str().map(str::to_owned)).unwrap_or_else(|| "UNKNOWN".to_owned()) }
fn anchor(kind: &str, id: &str, title: &str) -> String { let slug = slug(title); format!("{kind}-{}-{slug}", id.chars().map(|character| if character.is_ascii_alphanumeric() { character.to_ascii_lowercase() } else { '-' }).collect::<String>().trim_matches('-')) }
fn slug(value: &str) -> String { let slug = value.chars().flat_map(char::to_lowercase).map(|character| if character.is_ascii_alphanumeric() { character } else { '-' }).collect::<String>().split('-').filter(|part| !part.is_empty()).take(8).collect::<Vec<_>>().join("-"); if slug.is_empty() { "entry".to_owned() } else { slug } }
fn escape_inline(value: &str) -> String { value.replace('\\', "\\\\").replace('`', "\\`").replace('*', "\\*").replace('_', "\\_").replace('[', "\\[").replace(']', "\\]").replace('<', "&lt;").replace('>', "&gt;").replace('#', "\\#").replace('\n', " ").replace('\r', "") }
fn escape_block(value: &str) -> String { value.replace("\r\n", "\n").replace('\r', "\n").lines().map(escape_inline).collect::<Vec<_>>().join("\n") }
fn escape_code(value: &str) -> String { value.replace('`', "\\`").replace('\n', " ").replace('\r', "") }
fn invalid_workspace() -> ProjectBrainExportError { ProjectBrainExportError::new("INVALID_WORKSPACE", "ForgeMind could not export an invalid or unsupported workspace.") }
fn source_error(source: &str, message: &str) -> ProjectBrainExportError { ProjectBrainExportError::new("EXPORT_SOURCE_INVALID", &format!("{source}: {message}")) }
fn write_error() -> ProjectBrainExportError { ProjectBrainExportError::new("EXPORT_WRITE_FAILED", "ForgeMind could not write the managed Project Brain export.") }

fn confined_directory(parent: &Path, directory: &Path) -> Result<std::path::PathBuf, ProjectBrainExportError> {
    let parent = fs::canonicalize(parent).map_err(|_| write_error())?;
    let directory = fs::canonicalize(directory).map_err(|_| write_error())?;
    if !directory.starts_with(&parent) || !directory.is_dir() {
        return Err(write_error());
    }
    Ok(directory)
}

fn write_managed_file(path: &Path, contents: &[u8]) -> Result<(), ProjectBrainExportError> {
    if let Ok(metadata) = fs::symlink_metadata(path) {
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err(write_error());
        }
    }
    let mut file = fs::OpenOptions::new().write(true).create(true).truncate(true).open(path).map_err(|_| write_error())?;
    file.write_all(contents).map_err(|_| write_error())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    fn fixture() -> (TempDir, String) {
        let directory = tempfile::tempdir().unwrap();
        let project_id = "11111111-1111-4111-8111-111111111111".to_owned();
        let metadata = directory.path().join(".forgemind");
        fs::create_dir(&metadata).unwrap();
        fs::write(metadata.join("project.json"), serde_json::to_vec_pretty(&json!({"formatVersion":1,"projectId":project_id,"name":"Hollow Reach","createdAt":"2026-01-01T00:00:00.000Z"})).unwrap()).unwrap();
        fs::write(metadata.join("compendium.json"), serde_json::to_vec_pretty(&json!({"formatVersion":1,"projectId":project_id,"updatedAt":"2026-01-03T00:00:00.000Z","entries":[
            {"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","area":"systems","title":"Žar & Alert","statement":"Unicode survives. Root is user-authored only.","status":"LOCKED","provenance":"MANUAL","source":"manual_entry","createdAt":"2026-01-02T00:00:00.000Z","updatedAt":"2026-01-03T00:00:00.000Z"},
            {"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","area":"open_questions","title":"Alert cadence?","statement":"How quickly?","status":"TBD","provenance":"UNRESOLVED","source":"manual_entry","createdAt":"2026-01-02T00:00:00.000Z","updatedAt":"2026-01-02T00:00:00.000Z"}
        ]})).unwrap()).unwrap();
        fs::write(metadata.join("decisions.json"), serde_json::to_vec_pretty(&json!({"formatVersion":1,"projectId":project_id,"updatedAt":"2026-01-04T00:00:00.000Z","decisions":[
            {"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","title":"No omniscience","statement":"Only perceived facts.","rationale":"Fair play.","status":"APPROVED","area":"systems","author":"Designer","createdAt":"2026-01-04T00:00:00.000Z","approvedAt":"2026-01-04T01:00:00.000Z","supersedesDecisionId":null,"relatedKnowledgeEntryIds":["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"]}
        ]})).unwrap()).unwrap();
        fs::write(metadata.join("specialist-runs.json"), serde_json::to_vec_pretty(&json!({"formatVersion":1,"projectId":project_id,"updatedAt":"2026-01-05T00:00:00.000Z","runs":[
            {"id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","createdAt":"2026-01-05T00:00:00.000Z","specialistProfileId":"ai_behavior_designer","taskType":"REACTION_MODEL","modelId":"synthetic/model","selectedKnowledgeEntryIds":["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],"selectedDecisionIds":["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],"scenario":"Synthetic","status":"SUCCEEDED","result":{"summary":"Investigate uncertainty","assumptions":[],"recommendations":["Orient first."],"risks":[],"exploits":[],"openQuestions":[],"suggestedTests":["Repeatable test."]},"usage":{}},
            {"id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","createdAt":"2026-01-05T00:00:00.000Z","specialistProfileId":"ai_behavior_designer","taskType":"REACTION_MODEL","modelId":"synthetic/model","selectedKnowledgeEntryIds":[],"selectedDecisionIds":[],"scenario":"Failed","status":"FAILED","safeError":{"code":"SYNTHETIC"},"usage":{}}
        ]})).unwrap()).unwrap();
        (directory, project_id)
    }

    #[test]
    fn builds_versioned_deterministic_contract_with_stable_anchors_and_existing_references() {
        let (directory, project_id) = fixture();
        let first = build_contract(directory.path(), &project_id, "2026-02-01T00:00:00.000Z").unwrap();
        let second = build_contract(directory.path(), &project_id, "2026-02-01T00:00:00.000Z").unwrap();
        assert_eq!(first, second);
        assert_eq!(first.schema_version, 1);
        assert_eq!(first.sections.iter().map(|section| section.id.as_str()).collect::<Vec<_>>(), vec!["project-knowledge", "decisions", "open-questions", "specialist-analysis"]);
        assert_eq!(first.sections[3].entries.len(), 1);
        assert!(first.sections.iter().flat_map(|section| &section.entries).all(|entry| entry.anchor.contains(&entry.source_id.to_lowercase())));
        let decision = &first.sections[1].entries[0];
        assert_eq!(decision.references[0].target_id, "knowledge:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

        let mut later = build_contract(directory.path(), &project_id, "2026-02-02T00:00:00.000Z").unwrap();
        later.generated_at = first.generated_at.clone();
        assert_eq!(first, later);
    }

    #[test]
    fn anchors_are_collision_safe_for_duplicate_and_unicode_titles() {
        let first = anchor("knowledge", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "Żar");
        let second = anchor("knowledge", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "Żar");
        assert_ne!(first, second);
        assert!(first.ends_with("-ar"));
    }

    #[test]
    fn renderer_uses_only_contract_and_handles_unicode_and_empty_sections() {
        let contract = ProjectBrainExport { schema_version: 1, generated_at: "now".to_owned(), project: ExportProject { id: "project".to_owned(), name: "Żmija".to_owned(), created_at: "then".to_owned() }, sections: vec![section("empty", "Empty", Vec::new())] };
        let markdown = render_markdown(&contract);
        assert!(markdown.contains("# Żmija — Project Brain"));
        assert!(markdown.contains("_No entries._"));
    }

    #[test]
    fn manifest_is_stable_and_matches_contract_counts() {
        let (directory, project_id) = fixture();
        let contract = build_contract(directory.path(), &project_id, "fixed").unwrap();
        let manifest = build_manifest(&contract);
        assert_eq!(manifest.entry_count, 4);
        assert_eq!(manifest.entries.len(), 4);
        assert_eq!(manifest.included_sections, vec!["project-knowledge", "decisions", "open-questions", "specialist-analysis"]);
    }

    #[test]
    fn export_writes_only_managed_outputs_and_does_not_mutate_sources_or_leak_root_path() {
        let (directory, project_id) = fixture();
        let metadata = directory.path().join(".forgemind");
        let sources = ["project.json", "compendium.json", "decisions.json", "specialist-runs.json"];
        let before = sources.iter().map(|name| fs::read(metadata.join(name)).unwrap()).collect::<Vec<_>>();
        let result = export(directory.path(), &project_id).unwrap();
        let after = sources.iter().map(|name| fs::read(metadata.join(name)).unwrap()).collect::<Vec<_>>();
        assert_eq!(before, after);
        assert_eq!(result.entry_count, 4);
        let markdown = fs::read_to_string(metadata.join(EXPORT_DIRECTORY).join(MARKDOWN_FILE)).unwrap();
        let manifest = fs::read_to_string(metadata.join(EXPORT_DIRECTORY).join(MANIFEST_FILE)).unwrap();
        let root = directory.path().display().to_string();
        assert!(!markdown.contains(&root));
        assert!(!manifest.contains(&root));
        assert!(!markdown.contains("safeError"));
    }

    #[test]
    fn rejects_project_identity_mismatch_without_writing() {
        let (directory, _) = fixture();
        let error = export(directory.path(), "wrong-project").unwrap_err();
        assert_eq!(error.code, "PROJECT_ID_MISMATCH");
        assert!(!directory.path().join(".forgemind").join(EXPORT_DIRECTORY).exists());
    }

    #[test]
    fn missing_optional_sources_produce_explicit_empty_sections() {
        let directory = tempfile::tempdir().unwrap();
        let project_id = "11111111-1111-4111-8111-111111111111";
        let metadata = directory.path().join(".forgemind");
        fs::create_dir(&metadata).unwrap();
        fs::write(metadata.join("project.json"), serde_json::to_vec(&json!({"formatVersion":1,"projectId":project_id,"name":"Empty","createdAt":"2026-01-01T00:00:00.000Z"})).unwrap()).unwrap();
        let contract = build_contract(directory.path(), project_id, "fixed").unwrap();
        assert_eq!(contract.sections.len(), 4);
        assert!(contract.sections.iter().all(|section| section.entries.is_empty()));
        assert_eq!(build_manifest(&contract).entry_count, 0);
    }

    #[test]
    fn malformed_source_fails_without_creating_export_directory() {
        let (directory, project_id) = fixture();
        fs::write(directory.path().join(".forgemind").join("compendium.json"), b"not-json").unwrap();
        let error = export(directory.path(), &project_id).unwrap_err();
        assert_eq!(error.code, "EXPORT_SOURCE_INVALID");
        assert!(!directory.path().join(".forgemind").join(EXPORT_DIRECTORY).exists());
    }

    #[test]
    fn refuses_an_output_path_that_is_not_a_managed_directory() {
        let (directory, project_id) = fixture();
        fs::write(directory.path().join(".forgemind").join(EXPORT_DIRECTORY), b"not-a-directory").unwrap();
        let error = export(directory.path(), &project_id).unwrap_err();
        assert_eq!(error.code, "EXPORT_WRITE_FAILED");
    }
}
