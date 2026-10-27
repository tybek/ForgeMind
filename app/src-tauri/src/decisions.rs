use crate::compendium::{self, DocumentedSourceTrace, KnowledgeArea};
use crate::workspace::{self, WorkspaceInspection};
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const DECISIONS_FORMAT_VERSION: u32 = 1;
const DECISIONS_FILE: &str = "decisions.json";

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DecisionStatus {
    Proposed,
    Approved,
    Superseded,
    Deprecated,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Decision {
    pub id: String,
    pub title: String,
    pub statement: String,
    pub rationale: String,
    pub status: DecisionStatus,
    pub area: KnowledgeArea,
    pub author: String,
    pub created_at: String,
    pub approved_at: Option<String>,
    pub supersedes_decision_id: Option<String>,
    pub related_knowledge_entry_ids: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub documented_sources: Vec<DocumentedSourceTrace>,
}

#[derive(Clone, Debug)]
pub struct CreateDocumentedDecisionRequest {
    pub root_path: String,
    pub project_id: String,
    pub title: String,
    pub statement: String,
    pub rationale: String,
    pub area: KnowledgeArea,
    pub documented_sources: Vec<DocumentedSourceTrace>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DecisionsDocument {
    pub format_version: u32,
    pub project_id: String,
    pub updated_at: String,
    pub decisions: Vec<Decision>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateDecisionRequest {
    pub root_path: String,
    pub project_id: String,
    pub title: String,
    pub statement: String,
    pub rationale: String,
    pub area: KnowledgeArea,
    pub author: String,
    #[serde(default)]
    pub supersedes_decision_id: Option<String>,
    #[serde(default)]
    pub related_knowledge_entry_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateDecisionRequest {
    pub root_path: String,
    pub project_id: String,
    pub decision_id: String,
    pub title: String,
    pub statement: String,
    pub rationale: String,
    pub area: KnowledgeArea,
    #[serde(default)]
    pub supersedes_decision_id: Option<String>,
    #[serde(default)]
    pub related_knowledge_entry_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DecisionActionRequest {
    pub root_path: String,
    pub project_id: String,
    pub decision_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecisionError {
    pub code: String,
    pub message: String,
}

impl DecisionError {
    fn new(code: &str, message: &str) -> Self {
        Self { code: code.to_owned(), message: message.to_owned() }
    }

    fn invalid_file() -> Self {
        Self::new(
            "INVALID_DECISIONS_FILE",
            "The existing ForgeMind Decisions file is invalid and was not changed.",
        )
    }
}

pub fn load(root: &Path) -> Result<Option<DecisionsDocument>, DecisionError> {
    let project_id = workspace_project_id(root)?;
    load_for_project(root, &project_id)
}

pub fn create(request: CreateDecisionRequest) -> Result<DecisionsDocument, DecisionError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_decision_text(&request.title, &request.statement, &request.rationale, &request.author)?;
    validate_related_knowledge(root, &request.related_knowledge_entry_ids)?;
    let mut document = load_for_project(root, &request.project_id)?
        .unwrap_or_else(|| empty_document(&request.project_id));
    validate_supersession_choice(&document, None, request.supersedes_decision_id.as_deref())?;
    let now = timestamp();
    document.decisions.push(Decision {
        id: Uuid::new_v4().to_string(),
        title: request.title.trim().to_owned(),
        statement: request.statement.trim().to_owned(),
        rationale: request.rationale.trim().to_owned(),
        status: DecisionStatus::Proposed,
        area: request.area,
        author: request.author.trim().to_owned(),
        created_at: now,
        approved_at: None,
        supersedes_decision_id: request.supersedes_decision_id,
        related_knowledge_entry_ids: unique_ids(request.related_knowledge_entry_ids)?,
        documented_sources: Vec::new(),
    });
    save(root, document)
}

pub fn create_documented(
    request: CreateDocumentedDecisionRequest,
) -> Result<(DecisionsDocument, String), DecisionError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_decision_text(&request.title, &request.statement, &request.rationale, "Knowledge Import")?;
    validate_documented_sources(&request.documented_sources)?;
    let mut document = load_for_project(root, &request.project_id)?
        .unwrap_or_else(|| empty_document(&request.project_id));
    let normalized_title = normalized_key(&request.title);
    let normalized_statement = normalized_key(&request.statement);
    if document.decisions.iter().any(|decision| {
        normalized_key(&decision.title) == normalized_title
            && normalized_key(&decision.statement) == normalized_statement
    }) {
        return Err(DecisionError::new("DUPLICATE_DECISION", "Matching Decision already exists."));
    }
    let id = Uuid::new_v4().to_string();
    document.decisions.push(Decision {
        id: id.clone(),
        title: request.title.trim().to_owned(),
        statement: request.statement.trim().to_owned(),
        rationale: request.rationale.trim().to_owned(),
        status: DecisionStatus::Proposed,
        area: request.area,
        author: "Knowledge Import".to_owned(),
        created_at: timestamp(),
        approved_at: None,
        supersedes_decision_id: None,
        related_knowledge_entry_ids: Vec::new(),
        documented_sources: request.documented_sources,
    });
    save(root, document).map(|document| (document, id))
}

pub fn update(request: UpdateDecisionRequest) -> Result<DecisionsDocument, DecisionError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_decision_text(&request.title, &request.statement, &request.rationale, "Local User")?;
    validate_related_knowledge(root, &request.related_knowledge_entry_ids)?;
    let mut document = required_document(root, &request.project_id)?;
    validate_supersession_choice(&document, Some(&request.decision_id), request.supersedes_decision_id.as_deref())?;
    let decision = document.decisions.iter_mut().find(|decision| decision.id == request.decision_id)
        .ok_or_else(|| DecisionError::new("DECISION_NOT_FOUND", "The selected Decision no longer exists."))?;
    if decision.status != DecisionStatus::Proposed {
        return Err(DecisionError::new("DECISION_NOT_EDITABLE", "Only proposed Decisions can be edited."));
    }
    decision.title = request.title.trim().to_owned();
    decision.statement = request.statement.trim().to_owned();
    decision.rationale = request.rationale.trim().to_owned();
    decision.area = request.area;
    decision.supersedes_decision_id = request.supersedes_decision_id;
    decision.related_knowledge_entry_ids = unique_ids(request.related_knowledge_entry_ids)?;
    save(root, document)
}

pub fn approve(request: DecisionActionRequest) -> Result<DecisionsDocument, DecisionError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let mut document = required_document(root, &request.project_id)?;
    let decision_index = document.decisions.iter().position(|decision| decision.id == request.decision_id)
        .ok_or_else(|| DecisionError::new("DECISION_NOT_FOUND", "The selected Decision no longer exists."))?;
    if document.decisions[decision_index].status != DecisionStatus::Proposed {
        return Err(DecisionError::new("DECISION_NOT_PROPOSED", "Only a proposed Decision can be approved."));
    }
    if let Some(predecessor_id) = document.decisions[decision_index].supersedes_decision_id.clone() {
        let predecessor_index = document.decisions.iter().position(|decision| decision.id == predecessor_id)
            .ok_or_else(|| DecisionError::new("INVALID_SUPERSESSION", "The Decision selected for supersession does not exist."))?;
        if predecessor_index == decision_index || document.decisions[predecessor_index].status != DecisionStatus::Approved {
            return Err(DecisionError::new("INVALID_SUPERSESSION", "Only an active approved Decision can be superseded."));
        }
        document.decisions[predecessor_index].status = DecisionStatus::Superseded;
    }
    document.decisions[decision_index].status = DecisionStatus::Approved;
    document.decisions[decision_index].approved_at = Some(timestamp());
    save(root, document)
}

pub fn deprecate(request: DecisionActionRequest) -> Result<DecisionsDocument, DecisionError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let mut document = required_document(root, &request.project_id)?;
    let decision = document.decisions.iter_mut().find(|decision| decision.id == request.decision_id)
        .ok_or_else(|| DecisionError::new("DECISION_NOT_FOUND", "The selected Decision no longer exists."))?;
    if decision.status == DecisionStatus::Superseded {
        return Err(DecisionError::new("DECISION_HISTORY_IMMUTABLE", "A superseded Decision remains preserved as history."));
    }
    decision.status = DecisionStatus::Deprecated;
    save(root, document)
}

fn save(root: &Path, mut document: DecisionsDocument) -> Result<DecisionsDocument, DecisionError> {
    document.updated_at = timestamp();
    validate_document(&document, &document.project_id)?;
    let mut contents = serde_json::to_vec_pretty(&document)
        .map_err(|_| DecisionError::new("DECISIONS_WRITE_FAILED", "ForgeMind could not prepare Decisions."))?;
    contents.push(b'\n');
    let mut file = fs::File::create(decisions_path(root))
        .map_err(|_| DecisionError::new("DECISIONS_WRITE_FAILED", "ForgeMind could not save Decisions."))?;
    file.write_all(&contents)
        .map_err(|_| DecisionError::new("DECISIONS_WRITE_FAILED", "ForgeMind could not save Decisions."))?;
    Ok(document)
}

fn load_for_project(root: &Path, project_id: &str) -> Result<Option<DecisionsDocument>, DecisionError> {
    let contents = match fs::read_to_string(decisions_path(root)) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(DecisionError::new("DECISIONS_READ_FAILED", "ForgeMind could not read the Decisions file.")),
    };
    let document: DecisionsDocument = serde_json::from_str(&contents).map_err(|_| DecisionError::invalid_file())?;
    validate_document(&document, project_id)?;
    Ok(Some(document))
}

fn required_document(root: &Path, project_id: &str) -> Result<DecisionsDocument, DecisionError> {
    load_for_project(root, project_id)?.ok_or_else(|| DecisionError::new("DECISIONS_NOT_FOUND", "No Decisions exist for this workspace yet."))
}

fn empty_document(project_id: &str) -> DecisionsDocument {
    DecisionsDocument { format_version: DECISIONS_FORMAT_VERSION, project_id: project_id.to_owned(), updated_at: timestamp(), decisions: Vec::new() }
}

fn validate_document(document: &DecisionsDocument, expected_project_id: &str) -> Result<(), DecisionError> {
    let mut ids = HashSet::new();
    if document.format_version != DECISIONS_FORMAT_VERSION
        || document.project_id != expected_project_id
        || DateTime::parse_from_rfc3339(&document.updated_at).is_err()
        || document.decisions.iter().any(|decision| {
            Uuid::parse_str(&decision.id).is_err()
                || !ids.insert(decision.id.as_str())
                || validate_decision_text(&decision.title, &decision.statement, &decision.rationale, &decision.author).is_err()
                || DateTime::parse_from_rfc3339(&decision.created_at).is_err()
                || decision.approved_at.as_ref().is_some_and(|date| DateTime::parse_from_rfc3339(date).is_err())
                || matches!(decision.status, DecisionStatus::Approved | DecisionStatus::Superseded) && decision.approved_at.is_none()
                || decision.status == DecisionStatus::Proposed && decision.approved_at.is_some()
                || decision.related_knowledge_entry_ids.iter().any(|id| Uuid::parse_str(id).is_err())
                || (!decision.documented_sources.is_empty() && validate_documented_sources(&decision.documented_sources).is_err())
        })
    {
        return Err(DecisionError::invalid_file());
    }
    for decision in &document.decisions {
        if let Some(predecessor_id) = &decision.supersedes_decision_id {
            if predecessor_id == &decision.id || !ids.contains(predecessor_id.as_str()) {
                return Err(DecisionError::invalid_file());
            }
        }
    }
    Ok(())
}

fn validate_supersession_choice(document: &DecisionsDocument, decision_id: Option<&str>, predecessor_id: Option<&str>) -> Result<(), DecisionError> {
    let Some(predecessor_id) = predecessor_id else { return Ok(()) };
    if decision_id == Some(predecessor_id) || Uuid::parse_str(predecessor_id).is_err() {
        return Err(DecisionError::new("INVALID_SUPERSESSION", "A Decision cannot supersede itself or an invalid predecessor."));
    }
    let predecessor = document.decisions.iter().find(|decision| decision.id == predecessor_id)
        .ok_or_else(|| DecisionError::new("INVALID_SUPERSESSION", "The Decision selected for supersession does not exist."))?;
    if predecessor.status != DecisionStatus::Approved {
        return Err(DecisionError::new("INVALID_SUPERSESSION", "Only an active approved Decision can be superseded."));
    }
    if document.decisions.iter().any(|decision| {
        decision.id != decision_id.unwrap_or("")
            && decision.supersedes_decision_id.as_deref() == Some(predecessor_id)
            && matches!(decision.status, DecisionStatus::Proposed | DecisionStatus::Approved)
    }) {
        return Err(DecisionError::new("INVALID_SUPERSESSION", "That Decision already has an active proposed or approved successor."));
    }
    Ok(())
}

fn validate_related_knowledge(root: &Path, ids: &[String]) -> Result<(), DecisionError> {
    let unique = unique_ids(ids.to_vec())?;
    if unique.is_empty() { return Ok(()) }
    let document = compendium::load(root)
        .map_err(|error| DecisionError::new(&error.code, &error.message))?
        .ok_or_else(|| DecisionError::new("INVALID_KNOWLEDGE_LINK", "Related Compendium knowledge does not exist."))?;
    if unique.iter().any(|id| !document.entries.iter().any(|entry| &entry.id == id)) {
        return Err(DecisionError::new("INVALID_KNOWLEDGE_LINK", "A related Compendium knowledge entry does not exist."));
    }
    Ok(())
}

fn unique_ids(ids: Vec<String>) -> Result<Vec<String>, DecisionError> {
    let mut seen = HashSet::new();
    let mut unique = Vec::new();
    for id in ids {
        if Uuid::parse_str(&id).is_err() {
            return Err(DecisionError::new("INVALID_RELATIONSHIP", "A Decision relationship identifier is invalid."));
        }
        if seen.insert(id.clone()) { unique.push(id); }
    }
    Ok(unique)
}

fn validate_decision_text(title: &str, statement: &str, rationale: &str, author: &str) -> Result<(), DecisionError> {
    if !valid_text(title, 1, 120) || !valid_text(statement, 1, 2_000) || !valid_text(rationale, 1, 2_000) || !valid_text(author, 1, 120) {
        return Err(DecisionError::new("INVALID_DECISION", "Decision data failed validation."));
    }
    Ok(())
}

fn valid_text(value: &str, minimum: usize, maximum: usize) -> bool {
    let length = value.trim().chars().count();
    length >= minimum && length <= maximum
}

fn normalized_key(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ").to_lowercase()
}

fn validate_documented_sources(sources: &[DocumentedSourceTrace]) -> Result<(), DecisionError> {
    if sources.is_empty() || sources.len() > 10 {
        return Err(DecisionError::new("INVALID_DECISION", "A documented Decision requires bounded source trace."));
    }
    let mut unique = HashSet::new();
    for source in sources {
        let path = Path::new(&source.source_id);
        if source.source_id.chars().count() > 500
            || path.is_absolute()
            || path.components().any(|component| !matches!(component, std::path::Component::Normal(_)))
            || !matches!(path.extension().and_then(|value| value.to_str()).map(str::to_ascii_lowercase).as_deref(), Some("md") | Some("markdown"))
            || !unique.insert(source.source_id.as_str())
            || source.section.as_ref().is_some_and(|value| !valid_text(value, 1, 160))
            || source.excerpt.as_ref().is_some_and(|value| !valid_text(value, 1, 500))
        {
            return Err(DecisionError::new("INVALID_DECISION", "Documented Decision source trace failed validation."));
        }
    }
    Ok(())
}

fn verify_project(root: &Path, expected_project_id: &str) -> Result<(), DecisionError> {
    if workspace_project_id(root)? != expected_project_id {
        return Err(DecisionError::new("PROJECT_ID_MISMATCH", "Decision data does not belong to the selected workspace."));
    }
    Ok(())
}

fn workspace_project_id(root: &Path) -> Result<String, DecisionError> {
    match workspace::inspect(root).map_err(|_| DecisionError::new("WORKSPACE_ACCESS_FAILED", "ForgeMind could not access the selected workspace."))? {
        WorkspaceInspection::Valid { project, .. } => Ok(project.project_id),
        _ => Err(DecisionError::new("INVALID_WORKSPACE", "Decisions require a valid ForgeMind workspace.")),
    }
}

fn decisions_path(root: &Path) -> PathBuf { root.join(".forgemind").join(DECISIONS_FILE) }
fn timestamp() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true) }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compendium::{CreateKnowledgeEntryRequest, KnowledgeStatus};
    use serde_json::{json, Value};
    use tempfile::TempDir;

    fn workspace() -> (TempDir, String) {
        let directory = TempDir::new().unwrap();
        let WorkspaceInspection::Valid { project, .. } = workspace::initialize(directory.path()).unwrap() else { panic!("valid workspace") };
        (directory, project.project_id)
    }

    fn request(root: &Path, project_id: &str) -> CreateDecisionRequest {
        CreateDecisionRequest {
            root_path: root.display().to_string(), project_id: project_id.to_owned(), title: "Action economy".to_owned(),
            statement: "All tactical actions consume Action Points.".to_owned(), rationale: "Keep trade-offs readable.".to_owned(),
            area: KnowledgeArea::Systems, author: "Local User".to_owned(), supersedes_decision_id: None,
            related_knowledge_entry_ids: Vec::new(),
        }
    }

    fn action(root: &Path, project_id: &str, decision_id: &str) -> DecisionActionRequest {
        DecisionActionRequest { root_path: root.display().to_string(), project_id: project_id.to_owned(), decision_id: decision_id.to_owned() }
    }

    #[test]
    fn valid_decision_creation_is_proposed_and_rationale_persists() {
        let (directory, project_id) = workspace();
        let document = create(request(directory.path(), &project_id)).unwrap();
        assert_eq!(document.decisions[0].status, DecisionStatus::Proposed);
        assert_eq!(document.decisions[0].rationale, "Keep trade-offs readable.");
        assert!(document.decisions[0].approved_at.is_none());
        assert_eq!(load(directory.path()).unwrap(), Some(document));
    }

    #[test]
    fn proposed_decision_can_be_edited_and_explicitly_approved() {
        let (directory, project_id) = workspace();
        let created = create(request(directory.path(), &project_id)).unwrap();
        let edited = update(UpdateDecisionRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), decision_id: created.decisions[0].id.clone(),
            title: "Shared action economy".to_owned(), statement: "Movement and combat consume Action Points.".to_owned(),
            rationale: "Preserve tactical trade-offs.".to_owned(), area: KnowledgeArea::CoreLoop,
            supersedes_decision_id: None, related_knowledge_entry_ids: Vec::new(),
        }).unwrap();
        assert_eq!(edited.decisions[0].status, DecisionStatus::Proposed);
        let approved = approve(action(directory.path(), &project_id, &edited.decisions[0].id)).unwrap();
        assert_eq!(approved.decisions[0].status, DecisionStatus::Approved);
        assert!(approved.decisions[0].approved_at.is_some());
    }

    #[test]
    fn approved_decision_cannot_be_edited() {
        let (directory, project_id) = workspace();
        let created = create(request(directory.path(), &project_id)).unwrap();
        let approved = approve(action(directory.path(), &project_id, &created.decisions[0].id)).unwrap();
        let error = update(UpdateDecisionRequest {
            root_path: directory.path().display().to_string(), project_id, decision_id: approved.decisions[0].id.clone(),
            title: "Rewrite history".to_owned(), statement: "Changed".to_owned(), rationale: "Changed".to_owned(),
            area: KnowledgeArea::Systems, supersedes_decision_id: None, related_knowledge_entry_ids: Vec::new(),
        }).unwrap_err();
        assert_eq!(error.code, "DECISION_NOT_EDITABLE");
    }

    #[test]
    fn decision_can_be_deprecated_without_deletion() {
        let (directory, project_id) = workspace();
        let created = create(request(directory.path(), &project_id)).unwrap();
        let deprecated = deprecate(action(directory.path(), &project_id, &created.decisions[0].id)).unwrap();
        assert_eq!(deprecated.decisions.len(), 1);
        assert_eq!(deprecated.decisions[0].status, DecisionStatus::Deprecated);
    }

    #[test]
    fn related_knowledge_links_persist() {
        let (directory, project_id) = workspace();
        let compendium = compendium::create_entry(CreateKnowledgeEntryRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), area: KnowledgeArea::Systems,
            title: "Action Points".to_owned(), statement: "Actions consume points.".to_owned(), status: KnowledgeStatus::Direction,
        }).unwrap();
        let mut create_request = request(directory.path(), &project_id);
        create_request.related_knowledge_entry_ids = vec![compendium.entries[0].id.clone()];
        let document = create(create_request).unwrap();
        assert_eq!(document.decisions[0].related_knowledge_entry_ids, vec![compendium.entries[0].id.clone()]);
    }

    #[test]
    fn approved_replacement_supersedes_and_retains_predecessor() {
        let (directory, project_id) = workspace();
        let first = create(request(directory.path(), &project_id)).unwrap();
        let first = approve(action(directory.path(), &project_id, &first.decisions[0].id)).unwrap();
        let predecessor_id = first.decisions[0].id.clone();
        let mut replacement = request(directory.path(), &project_id);
        replacement.title = "Revised action economy".to_owned();
        replacement.supersedes_decision_id = Some(predecessor_id.clone());
        let proposed = create(replacement).unwrap();
        assert_eq!(proposed.decisions[0].status, DecisionStatus::Approved);
        assert_eq!(proposed.decisions[1].status, DecisionStatus::Proposed);
        let approved = approve(action(directory.path(), &project_id, &proposed.decisions[1].id)).unwrap();
        assert_eq!(approved.decisions.len(), 2);
        assert_eq!(approved.decisions[0].status, DecisionStatus::Superseded);
        assert_eq!(approved.decisions[1].status, DecisionStatus::Approved);
        assert_eq!(approved.decisions[1].supersedes_decision_id.as_deref(), Some(predecessor_id.as_str()));
    }

    #[test]
    fn invalid_supersession_fails_safely() {
        let (directory, project_id) = workspace();
        let mut create_request = request(directory.path(), &project_id);
        create_request.supersedes_decision_id = Some("550e8400-e29b-41d4-a716-446655440000".to_owned());
        assert_eq!(create(create_request).unwrap_err().code, "INVALID_SUPERSESSION");
        assert!(!decisions_path(directory.path()).exists());
    }

    #[test]
    fn one_predecessor_cannot_have_parallel_active_successors() {
        let (directory, project_id) = workspace();
        let first = create(request(directory.path(), &project_id)).unwrap();
        let first = approve(action(directory.path(), &project_id, &first.decisions[0].id)).unwrap();
        let predecessor_id = first.decisions[0].id.clone();
        let mut successor = request(directory.path(), &project_id);
        successor.title = "First successor".to_owned();
        successor.supersedes_decision_id = Some(predecessor_id.clone());
        create(successor).unwrap();
        let mut competing = request(directory.path(), &project_id);
        competing.title = "Competing successor".to_owned();
        competing.supersedes_decision_id = Some(predecessor_id);
        assert_eq!(create(competing).unwrap_err().code, "INVALID_SUPERSESSION");
    }

    #[test]
    fn malformed_decisions_file_fails_safely() {
        let (directory, _) = workspace();
        fs::write(decisions_path(directory.path()), "{not json").unwrap();
        let before = fs::read(decisions_path(directory.path())).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_DECISIONS_FILE");
        assert_eq!(fs::read(decisions_path(directory.path())).unwrap(), before);
    }

    #[test]
    fn invalid_status_and_impossible_reference_are_rejected() {
        let (directory, project_id) = workspace();
        let base = json!({"formatVersion":1,"projectId":project_id,"updatedAt":"2026-09-19T12:00:00Z","decisions":[{
            "id":"550e8400-e29b-41d4-a716-446655440000","title":"Title","statement":"Statement","rationale":"Because",
            "status":"INVALID","area":"systems","author":"Local User","createdAt":"2026-09-19T12:00:00Z","approvedAt":null,
            "supersedesDecisionId":null,"relatedKnowledgeEntryIds":[]}]});
        fs::write(decisions_path(directory.path()), serde_json::to_vec_pretty(&base).unwrap()).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_DECISIONS_FILE");
        let mut impossible = base;
        impossible["decisions"][0]["status"] = Value::String("PROPOSED".to_owned());
        impossible["decisions"][0]["supersedesDecisionId"] = Value::String("4b0ca604-6aa6-44c5-b8e7-dc4ce59c5080".to_owned());
        fs::write(decisions_path(directory.path()), serde_json::to_vec_pretty(&impossible).unwrap()).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_DECISIONS_FILE");
    }

    #[test]
    fn persisted_decisions_contain_no_root_path_or_secrets() {
        let (directory, project_id) = workspace();
        create(request(directory.path(), &project_id)).unwrap();
        let contents = fs::read_to_string(decisions_path(directory.path())).unwrap();
        assert!(!contents.contains(&directory.path().display().to_string()));
        assert!(!contents.contains("NEBIUS_API_KEY"));
        assert!(!contents.contains("Authorization"));
    }
}
