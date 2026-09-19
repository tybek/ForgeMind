use crate::interview::{self, CandidateArea, CandidateProvenance, CandidateStatus};
use crate::specialist_history::{self, SpecialistRunStatus};
use crate::workspace::{self, WorkspaceInspection};
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const COMPENDIUM_FORMAT_VERSION: u32 = 1;
const COMPENDIUM_FILE: &str = "compendium.json";

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum KnowledgeArea {
    Overview,
    GameVision,
    PlayerExperience,
    CoreLoop,
    Systems,
    WorldNarrative,
    Technical,
    Production,
    Constraints,
    CurrentPriorities,
    OpenQuestions,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KnowledgeStatus {
    Direction,
    Locked,
    Tbd,
    Deprecated,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KnowledgeProvenance {
    UserStated,
    AiInferred,
    Manual,
    Unresolved,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum KnowledgeSource {
    ProjectInterview,
    ManualEntry,
    Decision,
    SpecialistAnalysis,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeEntry {
    pub id: String,
    pub area: KnowledgeArea,
    pub title: String,
    pub statement: String,
    pub status: KnowledgeStatus,
    pub provenance: KnowledgeProvenance,
    pub source: KnowledgeSource,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompendiumDocument {
    pub format_version: u32,
    pub project_id: String,
    pub updated_at: String,
    pub entries: Vec<KnowledgeEntry>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateKnowledgeEntryRequest {
    pub root_path: String,
    pub project_id: String,
    pub area: KnowledgeArea,
    pub title: String,
    pub statement: String,
    pub status: KnowledgeStatus,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateKnowledgeEntryRequest {
    pub root_path: String,
    pub project_id: String,
    pub entry_id: String,
    pub area: KnowledgeArea,
    pub title: String,
    pub statement: String,
    pub status: KnowledgeStatus,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeEntryActionRequest {
    pub root_path: String,
    pub project_id: String,
    pub entry_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ImportInterviewRequest {
    pub root_path: String,
    pub project_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PromoteSpecialistFindingRequest {
    pub root_path: String,
    pub project_id: String,
    pub specialist_run_id: String,
    pub source_finding: String,
    pub area: KnowledgeArea,
    pub title: String,
    pub statement: String,
    pub status: KnowledgeStatus,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewImportResult {
    pub document: CompendiumDocument,
    pub imported_count: usize,
    pub skipped_duplicate_count: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompendiumError {
    pub code: String,
    pub message: String,
}

impl CompendiumError {
    fn new(code: &str, message: &str) -> Self {
        Self { code: code.to_owned(), message: message.to_owned() }
    }

    fn invalid_file() -> Self {
        Self::new(
            "INVALID_COMPENDIUM_FILE",
            "The existing ForgeMind Compendium file is invalid and was not changed.",
        )
    }
}

pub fn load(root: &Path) -> Result<Option<CompendiumDocument>, CompendiumError> {
    let project_id = workspace_project_id(root)?;
    load_for_project(root, &project_id)
}

pub fn create_entry(request: CreateKnowledgeEntryRequest) -> Result<CompendiumDocument, CompendiumError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_text(&request.title, 1, 120)?;
    validate_text(&request.statement, 1, 2_000)?;
    let mut document = load_for_project(root, &request.project_id)?
        .unwrap_or_else(|| empty_document(&request.project_id));
    let now = timestamp();
    document.entries.push(KnowledgeEntry {
        id: Uuid::new_v4().to_string(),
        area: request.area,
        title: request.title.trim().to_owned(),
        statement: request.statement.trim().to_owned(),
        status: request.status,
        provenance: KnowledgeProvenance::Manual,
        source: KnowledgeSource::ManualEntry,
        created_at: now.clone(),
        updated_at: now,
    });
    save(root, document)
}

pub fn update_entry(request: UpdateKnowledgeEntryRequest) -> Result<CompendiumDocument, CompendiumError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_text(&request.title, 1, 120)?;
    validate_text(&request.statement, 1, 2_000)?;
    let mut document = required_document(root, &request.project_id)?;
    let entry = document.entries.iter_mut().find(|entry| entry.id == request.entry_id)
        .ok_or_else(|| CompendiumError::new("KNOWLEDGE_ENTRY_NOT_FOUND", "The selected knowledge entry no longer exists."))?;
    entry.area = request.area;
    entry.title = request.title.trim().to_owned();
    entry.statement = request.statement.trim().to_owned();
    entry.status = request.status;
    entry.updated_at = timestamp();
    save(root, document)
}

pub fn deprecate_entry(request: KnowledgeEntryActionRequest) -> Result<CompendiumDocument, CompendiumError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let mut document = required_document(root, &request.project_id)?;
    let entry = document.entries.iter_mut().find(|entry| entry.id == request.entry_id)
        .ok_or_else(|| CompendiumError::new("KNOWLEDGE_ENTRY_NOT_FOUND", "The selected knowledge entry no longer exists."))?;
    entry.status = KnowledgeStatus::Deprecated;
    entry.updated_at = timestamp();
    save(root, document)
}

pub fn import_interview(request: ImportInterviewRequest) -> Result<InterviewImportResult, CompendiumError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let interview = interview::load(root)
        .map_err(|error| CompendiumError::new(&error.code, &error.message))?
        .ok_or_else(|| CompendiumError::new("INTERVIEW_NOT_FOUND", "No saved Project Interview knowledge is available to import."))?;
    let mut document = load_for_project(root, &request.project_id)?
        .unwrap_or_else(|| empty_document(&request.project_id));
    let mut imported_count = 0;
    let mut skipped_duplicate_count = 0;

    for candidate in interview.candidates {
        let title = candidate.title.trim();
        let statement = candidate.statement.trim();
        if is_duplicate(&document, title, statement) {
            skipped_duplicate_count += 1;
            continue;
        }
        let now = timestamp();
        let id = if document.entries.iter().any(|entry| entry.id == candidate.candidate_id) {
            Uuid::new_v4().to_string()
        } else {
            candidate.candidate_id
        };
        document.entries.push(KnowledgeEntry {
            id,
            area: area_from_candidate(candidate.area),
            title: title.to_owned(),
            statement: statement.to_owned(),
            status: status_from_candidate(candidate.status),
            provenance: provenance_from_candidate(candidate.provenance),
            source: KnowledgeSource::ProjectInterview,
            created_at: now.clone(),
            updated_at: now,
        });
        imported_count += 1;
    }

    let document = save(root, document)?;
    Ok(InterviewImportResult { document, imported_count, skipped_duplicate_count })
}

pub fn promote_specialist_finding(
    request: PromoteSpecialistFindingRequest,
) -> Result<CompendiumDocument, CompendiumError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_text(&request.title, 1, 120)?;
    validate_text(&request.statement, 1, 2_000)?;
    validate_text(&request.source_finding, 1, 1_200)?;

    let history = specialist_history::load(root)
        .map_err(|error| CompendiumError::new(&error.code, &error.message))?
        .ok_or_else(|| CompendiumError::new(
            "SPECIALIST_RUN_NOT_FOUND",
            "The selected specialist analysis run no longer exists.",
        ))?;
    let run = history.runs.iter().find(|run| run.id == request.specialist_run_id)
        .ok_or_else(|| CompendiumError::new(
            "SPECIALIST_RUN_NOT_FOUND",
            "The selected specialist analysis run no longer exists.",
        ))?;
    let result = run.result.as_ref().filter(|_| run.status == SpecialistRunStatus::Succeeded)
        .ok_or_else(|| CompendiumError::new(
            "SPECIALIST_RUN_NOT_PROMOTABLE",
            "Only findings from a successful specialist analysis can become project knowledge.",
        ))?;
    let source_finding = request.source_finding.trim();
    if !specialist_result_contains(result, source_finding) {
        return Err(CompendiumError::new(
            "SPECIALIST_FINDING_NOT_FOUND",
            "The selected finding is not part of that specialist analysis run.",
        ));
    }

    let mut document = load_for_project(root, &request.project_id)?
        .unwrap_or_else(|| empty_document(&request.project_id));
    let title = request.title.trim();
    let statement = request.statement.trim();
    if is_duplicate(&document, title, statement) {
        return Err(CompendiumError::new(
            "DUPLICATE_KNOWLEDGE_ENTRY",
            "An exact Compendium entry with this title and statement already exists.",
        ));
    }
    let now = timestamp();
    document.entries.push(KnowledgeEntry {
        id: Uuid::new_v4().to_string(),
        area: request.area,
        title: title.to_owned(),
        statement: statement.to_owned(),
        status: request.status,
        provenance: KnowledgeProvenance::AiInferred,
        source: KnowledgeSource::SpecialistAnalysis,
        created_at: now.clone(),
        updated_at: now,
    });
    save(root, document)
}

fn specialist_result_contains(
    result: &crate::specialists::BehaviorDesignerResult,
    finding: &str,
) -> bool {
    result.summary.trim() == finding
        || result.assumptions.iter()
            .chain(&result.recommendations)
            .chain(&result.risks)
            .chain(&result.exploits)
            .chain(&result.open_questions)
            .chain(&result.suggested_tests)
            .any(|item| item.trim() == finding)
}

fn is_duplicate(document: &CompendiumDocument, title: &str, statement: &str) -> bool {
    document.entries.iter().any(|entry| entry.title == title && entry.statement == statement)
}

fn save(root: &Path, mut document: CompendiumDocument) -> Result<CompendiumDocument, CompendiumError> {
    document.updated_at = timestamp();
    validate_document(&document, &document.project_id)?;
    let mut contents = serde_json::to_vec_pretty(&document)
        .map_err(|_| CompendiumError::new("COMPENDIUM_WRITE_FAILED", "ForgeMind could not prepare Compendium knowledge."))?;
    contents.push(b'\n');
    let path = compendium_path(root);
    let mut file = fs::File::create(path)
        .map_err(|_| CompendiumError::new("COMPENDIUM_WRITE_FAILED", "ForgeMind could not save Compendium knowledge."))?;
    file.write_all(&contents)
        .map_err(|_| CompendiumError::new("COMPENDIUM_WRITE_FAILED", "ForgeMind could not save Compendium knowledge."))?;
    Ok(document)
}

fn load_for_project(root: &Path, project_id: &str) -> Result<Option<CompendiumDocument>, CompendiumError> {
    let contents = match fs::read_to_string(compendium_path(root)) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(CompendiumError::new("COMPENDIUM_READ_FAILED", "ForgeMind could not read the Compendium file.")),
    };
    let document: CompendiumDocument = serde_json::from_str(&contents).map_err(|_| CompendiumError::invalid_file())?;
    validate_document(&document, project_id)?;
    Ok(Some(document))
}

fn required_document(root: &Path, project_id: &str) -> Result<CompendiumDocument, CompendiumError> {
    load_for_project(root, project_id)?.ok_or_else(|| {
        CompendiumError::new("COMPENDIUM_NOT_FOUND", "No Game Compendium exists for this workspace yet.")
    })
}

fn empty_document(project_id: &str) -> CompendiumDocument {
    CompendiumDocument {
        format_version: COMPENDIUM_FORMAT_VERSION,
        project_id: project_id.to_owned(),
        updated_at: timestamp(),
        entries: Vec::new(),
    }
}

fn validate_document(document: &CompendiumDocument, expected_project_id: &str) -> Result<(), CompendiumError> {
    let mut ids = HashSet::new();
    if document.format_version != COMPENDIUM_FORMAT_VERSION
        || document.project_id != expected_project_id
        || DateTime::parse_from_rfc3339(&document.updated_at).is_err()
        || document.entries.iter().any(|entry| {
            Uuid::parse_str(&entry.id).is_err()
                || !ids.insert(entry.id.as_str())
                || validate_text(&entry.title, 1, 120).is_err()
                || validate_text(&entry.statement, 1, 2_000).is_err()
                || DateTime::parse_from_rfc3339(&entry.created_at).is_err()
                || DateTime::parse_from_rfc3339(&entry.updated_at).is_err()
        })
    {
        return Err(CompendiumError::invalid_file());
    }
    Ok(())
}

fn verify_project(root: &Path, expected_project_id: &str) -> Result<(), CompendiumError> {
    if workspace_project_id(root)? != expected_project_id {
        return Err(CompendiumError::new("PROJECT_ID_MISMATCH", "Compendium data does not belong to the selected workspace."));
    }
    Ok(())
}

fn workspace_project_id(root: &Path) -> Result<String, CompendiumError> {
    match workspace::inspect(root).map_err(|_| CompendiumError::new("WORKSPACE_ACCESS_FAILED", "ForgeMind could not access the selected workspace."))? {
        WorkspaceInspection::Valid { project, .. } => Ok(project.project_id),
        _ => Err(CompendiumError::new("INVALID_WORKSPACE", "The Game Compendium requires a valid ForgeMind workspace.")),
    }
}

fn validate_text(value: &str, minimum: usize, maximum: usize) -> Result<(), CompendiumError> {
    let length = value.trim().chars().count();
    if length < minimum || length > maximum {
        return Err(CompendiumError::new("INVALID_KNOWLEDGE_ENTRY", "Compendium knowledge failed validation."));
    }
    Ok(())
}

fn compendium_path(root: &Path) -> PathBuf { root.join(".forgemind").join(COMPENDIUM_FILE) }
fn timestamp() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true) }

fn area_from_candidate(area: CandidateArea) -> KnowledgeArea {
    match area {
        CandidateArea::Overview => KnowledgeArea::Overview,
        CandidateArea::GameDesign => KnowledgeArea::GameVision,
        CandidateArea::Narrative => KnowledgeArea::WorldNarrative,
        CandidateArea::Technical => KnowledgeArea::Technical,
        CandidateArea::Roadmap => KnowledgeArea::CurrentPriorities,
    }
}

fn status_from_candidate(status: CandidateStatus) -> KnowledgeStatus {
    match status {
        CandidateStatus::Direction => KnowledgeStatus::Direction,
        CandidateStatus::Locked => KnowledgeStatus::Locked,
        CandidateStatus::Tbd => KnowledgeStatus::Tbd,
    }
}

fn provenance_from_candidate(provenance: CandidateProvenance) -> KnowledgeProvenance {
    match provenance {
        CandidateProvenance::UserStated => KnowledgeProvenance::UserStated,
        CandidateProvenance::AiInferred => KnowledgeProvenance::AiInferred,
        CandidateProvenance::Unresolved => KnowledgeProvenance::Unresolved,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::interview::{InterviewCandidate, ReviewDecision, ReviewedCandidate, SaveInterviewRequest};
    use crate::specialist_history::{SpecialistRunBudgetMetadata, SpecialistRunUsage};
    use crate::specialists::{BehaviorDesignerResult, SpecialistAnalysisRequest, SpecialistTaskType};
    use serde_json::{json, Value};
    use tempfile::TempDir;

    fn workspace() -> (TempDir, String) {
        let directory = TempDir::new().unwrap();
        let WorkspaceInspection::Valid { project, .. } = workspace::initialize(directory.path()).unwrap() else { panic!("valid workspace") };
        (directory, project.project_id)
    }

    fn create_request(root: &Path, project_id: &str) -> CreateKnowledgeEntryRequest {
        CreateKnowledgeEntryRequest {
            root_path: root.display().to_string(), project_id: project_id.to_owned(),
            area: KnowledgeArea::CoreLoop, title: "Action economy".to_owned(),
            statement: "Actions consume a shared point budget.".to_owned(), status: KnowledgeStatus::Direction,
        }
    }

    fn save_interview(root: &Path, project_id: &str) {
        interview::save(SaveInterviewRequest {
            root_path: root.display().to_string(), project_id: project_id.to_owned(),
            model_id: "deepseek-ai/DeepSeek-V4.1-Flash".to_owned(), overwrite: false,
            candidates: vec![ReviewedCandidate { decision: ReviewDecision::Approve, candidate: InterviewCandidate {
                candidate_id: "550e8400-e29b-41d4-a716-446655440000".to_owned(), area: CandidateArea::GameDesign,
                title: "Action economy".to_owned(), statement: "Actions consume a shared point budget.".to_owned(),
                status: CandidateStatus::Locked, provenance: CandidateProvenance::UserStated,
            }}],
        }).unwrap();
    }

    fn save_specialist_run(root: &Path, project_id: &str) -> (String, String) {
        let finding = "Orient before moving.".to_owned();
        let request = SpecialistAnalysisRequest {
            root_path: root.display().to_string(),
            project_id: project_id.to_owned(),
            profile_id: "ai_behavior_designer".to_owned(),
            task_type: SpecialistTaskType::ReactionModel,
            model_id: "test/model".to_owned(),
            knowledge_entry_ids: Vec::new(),
            decision_ids: Vec::new(),
            max_completion_tokens: Some(4600),
            scenario: "A guard hears a shot.".to_owned(),
        };
        let run = specialist_history::append_success(
            &request,
            BehaviorDesignerResult {
                summary: "Investigate under uncertainty.".to_owned(),
                assumptions: Vec::new(),
                recommendations: vec![finding.clone()],
                risks: Vec::new(),
                exploits: Vec::new(),
                open_questions: Vec::new(),
                suggested_tests: Vec::new(),
            },
            SpecialistRunUsage::default(),
            SpecialistRunBudgetMetadata::default(),
        ).unwrap();
        (run.id, finding)
    }

    #[test]
    fn valid_compendium_creation_and_entry_creation() {
        let (directory, project_id) = workspace();
        let document = create_entry(create_request(directory.path(), &project_id)).unwrap();
        assert_eq!(document.format_version, 1);
        assert_eq!(document.entries.len(), 1);
        assert_eq!(document.entries[0].provenance, KnowledgeProvenance::Manual);
        assert_eq!(load(directory.path()).unwrap(), Some(document));
    }

    #[test]
    fn missing_compendium_is_an_honest_empty_state() {
        let (directory, _) = workspace();
        assert_eq!(load(directory.path()).unwrap(), None);
        assert!(!compendium_path(directory.path()).exists());
    }

    #[test]
    fn entry_can_be_edited_and_status_changed() {
        let (directory, project_id) = workspace();
        let created = create_entry(create_request(directory.path(), &project_id)).unwrap();
        let updated = update_entry(UpdateKnowledgeEntryRequest {
            root_path: directory.path().display().to_string(), project_id, entry_id: created.entries[0].id.clone(),
            area: KnowledgeArea::Systems, title: "Action Point economy".to_owned(),
            statement: "Movement and combat share Action Points.".to_owned(), status: KnowledgeStatus::Locked,
        }).unwrap();
        assert_eq!(updated.entries[0].title, "Action Point economy");
        assert_eq!(updated.entries[0].status, KnowledgeStatus::Locked);
    }

    #[test]
    fn entry_can_be_deprecated_without_deletion() {
        let (directory, project_id) = workspace();
        let created = create_entry(create_request(directory.path(), &project_id)).unwrap();
        let document = deprecate_entry(KnowledgeEntryActionRequest {
            root_path: directory.path().display().to_string(), project_id, entry_id: created.entries[0].id.clone(),
        }).unwrap();
        assert_eq!(document.entries.len(), 1);
        assert_eq!(document.entries[0].status, KnowledgeStatus::Deprecated);
    }

    #[test]
    fn interview_import_preserves_status_and_provenance_and_is_duplicate_safe() {
        let (directory, project_id) = workspace();
        save_interview(directory.path(), &project_id);
        let request = ImportInterviewRequest { root_path: directory.path().display().to_string(), project_id };
        let first = import_interview(request.clone()).unwrap();
        assert_eq!(first.imported_count, 1);
        assert_eq!(first.document.entries[0].status, KnowledgeStatus::Locked);
        assert_eq!(first.document.entries[0].provenance, KnowledgeProvenance::UserStated);
        assert_eq!(first.document.entries[0].source, KnowledgeSource::ProjectInterview);
        let second = import_interview(request).unwrap();
        assert_eq!(second.imported_count, 0);
        assert_eq!(second.skipped_duplicate_count, 1);
        assert_eq!(second.document.entries.len(), 1);
    }

    #[test]
    fn interview_import_skips_an_exact_existing_manual_entry() {
        let (directory, project_id) = workspace();
        create_entry(create_request(directory.path(), &project_id)).unwrap();
        save_interview(directory.path(), &project_id);
        let imported = import_interview(ImportInterviewRequest {
            root_path: directory.path().display().to_string(), project_id,
        }).unwrap();
        assert_eq!(imported.imported_count, 0);
        assert_eq!(imported.skipped_duplicate_count, 1);
        assert_eq!(imported.document.entries.len(), 1);
        assert_eq!(imported.document.entries[0].source, KnowledgeSource::ManualEntry);
    }

    #[test]
    fn specialist_finding_promotion_is_explicit_truthful_and_duplicate_safe() {
        let (directory, project_id) = workspace();
        let (run_id, finding) = save_specialist_run(directory.path(), &project_id);
        let request = PromoteSpecialistFindingRequest {
            root_path: directory.path().display().to_string(),
            project_id: project_id.clone(),
            specialist_run_id: run_id,
            source_finding: finding,
            area: KnowledgeArea::Systems,
            title: "Guard investigation".to_owned(),
            statement: "Guards orient toward uncertain sounds before moving.".to_owned(),
            status: KnowledgeStatus::Locked,
        };
        let document = promote_specialist_finding(request.clone()).unwrap();
        assert_eq!(document.entries.len(), 1);
        assert_eq!(document.entries[0].provenance, KnowledgeProvenance::AiInferred);
        assert_eq!(document.entries[0].source, KnowledgeSource::SpecialistAnalysis);
        assert_eq!(document.entries[0].status, KnowledgeStatus::Locked);
        assert_eq!(promote_specialist_finding(request).unwrap_err().code, "DUPLICATE_KNOWLEDGE_ENTRY");
        assert_eq!(specialist_history::load(directory.path()).unwrap().unwrap().runs.len(), 1);
        assert!(crate::decisions::load(directory.path()).unwrap().is_none());
    }

    #[test]
    fn specialist_promotion_rejects_text_not_found_in_the_stored_run() {
        let (directory, project_id) = workspace();
        let (run_id, _) = save_specialist_run(directory.path(), &project_id);
        let error = promote_specialist_finding(PromoteSpecialistFindingRequest {
            root_path: directory.path().display().to_string(),
            project_id,
            specialist_run_id: run_id,
            source_finding: "Invented finding.".to_owned(),
            area: KnowledgeArea::Systems,
            title: "Invented".to_owned(),
            statement: "Invented statement.".to_owned(),
            status: KnowledgeStatus::Direction,
        }).unwrap_err();
        assert_eq!(error.code, "SPECIALIST_FINDING_NOT_FOUND");
        assert!(load(directory.path()).unwrap().is_none());
    }

    #[test]
    fn malformed_compendium_fails_safely() {
        let (directory, _) = workspace();
        fs::write(compendium_path(directory.path()), "{not json").unwrap();
        let before = fs::read(compendium_path(directory.path())).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_COMPENDIUM_FILE");
        assert_eq!(fs::read(compendium_path(directory.path())).unwrap(), before);
    }

    #[test]
    fn invalid_status_and_provenance_are_rejected() {
        let (directory, project_id) = workspace();
        let base = json!({"formatVersion":1,"projectId":project_id,"updatedAt":"2026-09-19T12:00:00Z","entries":[{
            "id":"550e8400-e29b-41d4-a716-446655440000","area":"overview","title":"Title","statement":"Statement",
            "status":"INVALID","provenance":"MANUAL","source":"manual_entry","createdAt":"2026-09-19T12:00:00Z","updatedAt":"2026-09-19T12:00:00Z"}]});
        fs::write(compendium_path(directory.path()), serde_json::to_vec_pretty(&base).unwrap()).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_COMPENDIUM_FILE");
        let mut invalid_provenance = base;
        invalid_provenance["entries"][0]["status"] = Value::String("DIRECTION".to_owned());
        invalid_provenance["entries"][0]["provenance"] = Value::String("UNKNOWN".to_owned());
        fs::write(compendium_path(directory.path()), serde_json::to_vec_pretty(&invalid_provenance).unwrap()).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_COMPENDIUM_FILE");
    }

    #[test]
    fn unsupported_compendium_version_is_rejected() {
        let (directory, project_id) = workspace();
        let value = json!({"formatVersion":2,"projectId":project_id,"updatedAt":"2026-09-19T12:00:00Z","entries":[]});
        fs::write(compendium_path(directory.path()), serde_json::to_vec_pretty(&value).unwrap()).unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_COMPENDIUM_FILE");
    }

    #[test]
    fn persisted_compendium_contains_no_root_path_or_secrets() {
        let (directory, project_id) = workspace();
        create_entry(create_request(directory.path(), &project_id)).unwrap();
        let contents = fs::read_to_string(compendium_path(directory.path())).unwrap();
        assert!(!contents.contains(&directory.path().display().to_string()));
        assert!(!contents.contains("NEBIUS_API_KEY"));
        assert!(!contents.contains("Authorization"));
    }
}
