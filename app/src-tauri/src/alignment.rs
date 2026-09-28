use crate::compendium::{self, KnowledgeArea, KnowledgeStatus};
use crate::decisions::{self, DecisionStatus};
use crate::git_reality::{self, RepositoryRealityStatus};
use crate::reality_connections::{self, RealitySource as ConnectionSource};
use crate::unity_groundtruth;
use crate::workspace::{self, WorkspaceInspection};
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const ALIGNMENT_FORMAT_VERSION: u32 = 1;
const ALIGNMENT_FILE: &str = "alignment.json";

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IntentSourceType {
    Compendium,
    Decision,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RealitySource {
    Git,
    Unity,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EvidenceAssessment {
    Supports,
    Contradicts,
    Insufficient,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AlignmentStatus {
    Aligned,
    Unverified,
    OutOfSync,
    Conflict,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AlignmentConfidence {
    Low,
    Medium,
    High,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AlignmentReviewState {
    PendingReview,
    Approved,
    Rejected,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AlignmentProvenance {
    Documented,
    ApprovedIntent,
    VerifiedFromGit,
    VerifiedFromUnity,
    ManualAssessment,
    AiInference,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntentSourceOption {
    pub source_type: IntentSourceType,
    pub source_id: String,
    pub title: String,
    pub statement: String,
    pub status: String,
    pub area: KnowledgeArea,
    pub provenance: AlignmentProvenance,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RealityEvidenceCandidate {
    pub id: String,
    pub source: RealitySource,
    pub summary: String,
    pub captured_at: String,
    pub provenance: AlignmentProvenance,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlignmentSourceCatalog {
    pub project_id: String,
    pub intent_sources: Vec<IntentSourceOption>,
    pub reality_evidence: Vec<RealityEvidenceCandidate>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IntentSourceReference {
    pub source_type: IntentSourceType,
    pub source_id: String,
    pub title: String,
    pub statement: String,
    pub status: String,
    pub area: KnowledgeArea,
    pub provenance: AlignmentProvenance,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RealityEvidenceReference {
    pub evidence_id: String,
    pub source: RealitySource,
    pub summary: String,
    pub captured_at: String,
    pub provenance: AlignmentProvenance,
    pub assessment: EvidenceAssessment,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AlignmentResult {
    pub id: String,
    pub created_at: String,
    pub intent: IntentSourceReference,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub conflicting_intent: Option<IntentSourceReference>,
    pub evidence: Vec<RealityEvidenceReference>,
    pub status: AlignmentStatus,
    pub rationale: String,
    pub confidence: AlignmentConfidence,
    pub uncertainty: String,
    pub provenance: Vec<AlignmentProvenance>,
    pub review_state: AlignmentReviewState,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reviewed_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AlignmentDocument {
    pub format_version: u32,
    pub project_id: String,
    pub updated_at: String,
    pub results: Vec<AlignmentResult>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EvidenceSelection {
    pub evidence_id: String,
    pub assessment: EvidenceAssessment,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AlignmentCheck {
    pub root_path: String,
    pub project_id: String,
    pub intent_source_type: IntentSourceType,
    pub intent_source_id: String,
    #[serde(default)]
    pub conflicting_decision_id: Option<String>,
    pub evidence: Vec<EvidenceSelection>,
    pub rationale: String,
    pub confidence: AlignmentConfidence,
    pub uncertainty: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReviewAlignmentRequest {
    pub root_path: String,
    pub project_id: String,
    pub result_id: String,
    pub review_state: AlignmentReviewState,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlignmentError {
    pub code: String,
    pub message: String,
}

impl AlignmentError {
    fn new(code: &str, message: &str) -> Self {
        Self { code: code.to_owned(), message: message.to_owned() }
    }

    fn invalid_file() -> Self {
        Self::new(
            "INVALID_ALIGNMENT_FILE",
            "The existing ForgeMind Alignment file is invalid and was not changed.",
        )
    }
}

pub fn sources(root: &Path) -> Result<AlignmentSourceCatalog, AlignmentError> {
    let project_id = workspace_project_id(root)?;
    let mut intent_sources = Vec::new();
    if let Some(document) = compendium::load(root).map_err(map_compendium_error)? {
        intent_sources.extend(
            document
                .entries
                .into_iter()
                .filter(|entry| entry.status != KnowledgeStatus::Deprecated)
                .map(|entry| IntentSourceOption {
                    source_type: IntentSourceType::Compendium,
                    source_id: entry.id,
                    title: entry.title,
                    statement: entry.statement,
                    status: knowledge_status(entry.status).to_owned(),
                    area: entry.area,
                    provenance: AlignmentProvenance::Documented,
                }),
        );
    }
    if let Some(document) = decisions::load(root).map_err(map_decision_error)? {
        intent_sources.extend(
            document
                .decisions
                .into_iter()
                .filter(|decision| decision.status == DecisionStatus::Approved)
                .map(|decision| IntentSourceOption {
                    source_type: IntentSourceType::Decision,
                    source_id: decision.id,
                    title: decision.title,
                    statement: decision.statement,
                    status: "APPROVED".to_owned(),
                    area: decision.area,
                    provenance: AlignmentProvenance::ApprovedIntent,
                }),
        );
    }
    intent_sources.sort_by(|left, right| left.title.cmp(&right.title).then(left.source_id.cmp(&right.source_id)));

    let repository_root = reality_connections::resolved_path(root, &project_id, ConnectionSource::Repository).ok();
    let mut reality_evidence = repository_root.as_deref().map(git_evidence).unwrap_or_default();
    reality_evidence.extend(
        unity_groundtruth::alignment_evidence(root, &project_id)
            .into_iter()
            .map(|item| RealityEvidenceCandidate {
                id: item.id,
                source: RealitySource::Unity,
                summary: item.summary,
                captured_at: item.generated_at,
                provenance: AlignmentProvenance::VerifiedFromUnity,
            }),
    );

    Ok(AlignmentSourceCatalog { project_id, intent_sources, reality_evidence })
}

pub fn load(root: &Path) -> Result<Option<AlignmentDocument>, AlignmentError> {
    let project_id = workspace_project_id(root)?;
    load_for_project(root, &project_id)
}

pub fn create(check: AlignmentCheck) -> Result<AlignmentDocument, AlignmentError> {
    let root = Path::new(&check.root_path);
    verify_project(root, &check.project_id)?;
    validate_text(&check.rationale, 1, 2_000, "INVALID_ALIGNMENT_CHECK")?;
    validate_text(&check.uncertainty, 1, 1_000, "INVALID_ALIGNMENT_CHECK")?;
    if check.evidence.is_empty() || check.evidence.len() > 50 {
        return Err(AlignmentError::new(
            "INVALID_EVIDENCE_SELECTION",
            "Select at least one and at most 50 current Reality evidence items.",
        ));
    }

    let catalog = sources(root)?;
    let intent = catalog
        .intent_sources
        .iter()
        .find(|source| {
            source.source_type == check.intent_source_type && source.source_id == check.intent_source_id
        })
        .cloned()
        .ok_or_else(|| AlignmentError::new(
            "INVALID_INTENT_SOURCE",
            "Select current Compendium knowledge or an approved Decision as Intent.",
        ))?;
    let conflicting_intent = match check.conflicting_decision_id.as_deref() {
        Some(id) => {
            let source = catalog.intent_sources.iter().find(|source| {
                source.source_type == IntentSourceType::Decision && source.source_id == id
            }).cloned().ok_or_else(|| AlignmentError::new(
                "INVALID_CONFLICTING_INTENT",
                "Only a distinct approved Decision can be selected as conflicting Intent.",
            ))?;
            if source.source_id == intent.source_id && intent.source_type == IntentSourceType::Decision {
                return Err(AlignmentError::new(
                    "INVALID_CONFLICTING_INTENT",
                    "Only a distinct approved Decision can be selected as conflicting Intent.",
                ));
            }
            Some(source)
        }
        None => None,
    };

    let mut selected_ids = HashSet::new();
    let mut evidence = Vec::new();
    for selection in &check.evidence {
        if !selected_ids.insert(selection.evidence_id.as_str()) {
            return Err(AlignmentError::new(
                "INVALID_EVIDENCE_SELECTION",
                "Each Reality evidence item can be selected only once.",
            ));
        }
        let candidate = catalog.reality_evidence.iter()
            .find(|candidate| candidate.id == selection.evidence_id)
            .ok_or_else(|| AlignmentError::new(
                "INVALID_EVIDENCE_SELECTION",
                "Selected Reality evidence is no longer available from Git or Unity GroundTruth.",
            ))?;
        evidence.push(RealityEvidenceReference {
            evidence_id: candidate.id.clone(),
            source: candidate.source,
            summary: candidate.summary.clone(),
            captured_at: candidate.captured_at.clone(),
            provenance: candidate.provenance,
            assessment: selection.assessment,
        });
    }

    let status = alignment_status(&evidence, conflicting_intent.is_some());
    let confidence = if matches!(status, AlignmentStatus::Unverified | AlignmentStatus::Conflict) {
        AlignmentConfidence::Low
    } else {
        check.confidence
    };
    let mut provenance = vec![intent.provenance];
    if let Some(conflicting) = &conflicting_intent {
        push_unique(&mut provenance, conflicting.provenance);
    }
    for item in &evidence {
        push_unique(&mut provenance, item.provenance);
    }
    push_unique(&mut provenance, AlignmentProvenance::ManualAssessment);

    let now = timestamp();
    let result = AlignmentResult {
        id: Uuid::new_v4().to_string(),
        created_at: now,
        intent: into_reference(intent),
        conflicting_intent: conflicting_intent.map(into_reference),
        evidence,
        status,
        rationale: check.rationale.trim().to_owned(),
        confidence,
        uncertainty: check.uncertainty.trim().to_owned(),
        provenance,
        review_state: AlignmentReviewState::PendingReview,
        reviewed_at: None,
    };
    let mut document = load_for_project(root, &check.project_id)?
        .unwrap_or_else(|| empty_document(&check.project_id));
    document.results.push(result);
    save(root, document)
}

pub fn review(request: ReviewAlignmentRequest) -> Result<AlignmentDocument, AlignmentError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    if request.review_state == AlignmentReviewState::PendingReview {
        return Err(AlignmentError::new(
            "INVALID_REVIEW_STATE",
            "Choose Approve or Reject for a pending Alignment Review.",
        ));
    }
    let mut document = load_for_project(root, &request.project_id)?
        .ok_or_else(|| AlignmentError::new("ALIGNMENT_NOT_FOUND", "No Alignment Reviews exist yet."))?;
    let result = document.results.iter_mut().find(|result| result.id == request.result_id)
        .ok_or_else(|| AlignmentError::new("ALIGNMENT_RESULT_NOT_FOUND", "The selected Alignment Review no longer exists."))?;
    if result.review_state != AlignmentReviewState::PendingReview {
        return Err(AlignmentError::new(
            "ALIGNMENT_ALREADY_REVIEWED",
            "A reviewed Alignment result remains historical and cannot be reviewed again.",
        ));
    }
    result.review_state = request.review_state;
    result.reviewed_at = Some(timestamp());
    save(root, document)
}

fn git_evidence(root: &Path) -> Vec<RealityEvidenceCandidate> {
    let result = git_reality::inspect(root);
    if result.status != RepositoryRealityStatus::Detected {
        return Vec::new();
    }
    let Some(repository) = result.repository else { return Vec::new() };
    let captured_at = timestamp();
    let mut evidence = vec![RealityEvidenceCandidate {
        id: format!("git:head:{}", repository.head.hash),
        source: RealitySource::Git,
        summary: format!("Git HEAD {}: {}", repository.head.short_hash, repository.head.subject),
        captured_at: repository.head.timestamp.clone(),
        provenance: AlignmentProvenance::VerifiedFromGit,
    }];
    evidence.push(RealityEvidenceCandidate {
        id: format!("git:working-tree:{}", repository.head.hash),
        source: RealitySource::Git,
        summary: format!(
            "Git working tree is {:?} with {} changed file{} at HEAD {}.",
            repository.working_tree,
            repository.total_changed_files,
            if repository.total_changed_files == 1 { "" } else { "s" },
            repository.head.short_hash,
        ).to_uppercase_first(),
        captured_at: captured_at.clone(),
        provenance: AlignmentProvenance::VerifiedFromGit,
    });
    for file in repository.changed_files {
        evidence.push(RealityEvidenceCandidate {
            id: format!("git:file:{}", file.path),
            source: RealitySource::Git,
            summary: format!("Git reports {:?} project-relative file {}.", file.status, file.path),
            captured_at: captured_at.clone(),
            provenance: AlignmentProvenance::VerifiedFromGit,
        });
    }
    let mut ids = evidence.iter().map(|item| item.id.clone()).collect::<HashSet<_>>();
    for commit in repository.recent_commits {
        let id = format!("git:commit:{}", commit.hash);
        if ids.insert(id.clone()) {
            evidence.push(RealityEvidenceCandidate {
                id,
                source: RealitySource::Git,
                summary: format!("Git commit {}: {}", commit.short_hash, commit.subject),
                captured_at: commit.timestamp,
                provenance: AlignmentProvenance::VerifiedFromGit,
            });
        }
    }
    evidence
}

trait UppercaseFirst {
    fn to_uppercase_first(self) -> String;
}

impl UppercaseFirst for String {
    fn to_uppercase_first(mut self) -> String {
        if let Some(first) = self.get_mut(0..1) {
            first.make_ascii_uppercase();
        }
        self
    }
}

fn alignment_status(evidence: &[RealityEvidenceReference], has_conflict: bool) -> AlignmentStatus {
    if has_conflict {
        AlignmentStatus::Conflict
    } else if evidence.iter().any(|item| item.assessment == EvidenceAssessment::Contradicts) {
        AlignmentStatus::OutOfSync
    } else if evidence.iter().all(|item| item.assessment == EvidenceAssessment::Supports) {
        AlignmentStatus::Aligned
    } else {
        AlignmentStatus::Unverified
    }
}

fn into_reference(source: IntentSourceOption) -> IntentSourceReference {
    IntentSourceReference {
        source_type: source.source_type,
        source_id: source.source_id,
        title: source.title,
        statement: source.statement,
        status: source.status,
        area: source.area,
        provenance: source.provenance,
    }
}

fn save(root: &Path, mut document: AlignmentDocument) -> Result<AlignmentDocument, AlignmentError> {
    document.updated_at = timestamp();
    validate_document(&document, &document.project_id)?;
    let mut contents = serde_json::to_vec_pretty(&document)
        .map_err(|_| AlignmentError::new("ALIGNMENT_WRITE_FAILED", "ForgeMind could not prepare Alignment Reviews."))?;
    contents.push(b'\n');
    let mut file = fs::File::create(alignment_path(root))
        .map_err(|_| AlignmentError::new("ALIGNMENT_WRITE_FAILED", "ForgeMind could not save Alignment Reviews."))?;
    file.write_all(&contents)
        .map_err(|_| AlignmentError::new("ALIGNMENT_WRITE_FAILED", "ForgeMind could not save Alignment Reviews."))?;
    Ok(document)
}

fn load_for_project(root: &Path, project_id: &str) -> Result<Option<AlignmentDocument>, AlignmentError> {
    let contents = match fs::read_to_string(alignment_path(root)) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(AlignmentError::new("ALIGNMENT_READ_FAILED", "ForgeMind could not read Alignment Reviews.")),
    };
    let document: AlignmentDocument = serde_json::from_str(&contents).map_err(|_| AlignmentError::invalid_file())?;
    validate_document(&document, project_id)?;
    Ok(Some(document))
}

fn validate_document(document: &AlignmentDocument, expected_project_id: &str) -> Result<(), AlignmentError> {
    let mut ids = HashSet::new();
    if document.format_version != ALIGNMENT_FORMAT_VERSION
        || document.project_id != expected_project_id
        || DateTime::parse_from_rfc3339(&document.updated_at).is_err()
        || document.results.iter().any(|result| {
            Uuid::parse_str(&result.id).is_err()
                || !ids.insert(result.id.as_str())
                || DateTime::parse_from_rfc3339(&result.created_at).is_err()
                || !valid_reference(&result.intent)
                || result.conflicting_intent.as_ref().is_some_and(|intent| {
                    !valid_reference(intent)
                        || intent.source_type != IntentSourceType::Decision
                        || intent.provenance != AlignmentProvenance::ApprovedIntent
                })
                || result.evidence.is_empty()
                || result.evidence.len() > 50
                || result.evidence.iter().any(|item| {
                    !valid_text(&item.evidence_id, 1, 1_000)
                        || !valid_text(&item.summary, 1, 2_000)
                        || DateTime::parse_from_rfc3339(&item.captured_at).is_err()
                        || !matches!(
                            (item.source, item.provenance),
                            (RealitySource::Git, AlignmentProvenance::VerifiedFromGit)
                                | (RealitySource::Unity, AlignmentProvenance::VerifiedFromUnity)
                        )
                })
                || !valid_text(&result.rationale, 1, 2_000)
                || !valid_text(&result.uncertainty, 1, 1_000)
                || result.provenance.is_empty()
                || result.provenance.contains(&AlignmentProvenance::AiInference)
                || match result.review_state {
                    AlignmentReviewState::PendingReview => result.reviewed_at.is_some(),
                    AlignmentReviewState::Approved | AlignmentReviewState::Rejected => result.reviewed_at.as_ref().is_none_or(|date| DateTime::parse_from_rfc3339(date).is_err()),
                }
        })
    {
        return Err(AlignmentError::invalid_file());
    }
    Ok(())
}

fn valid_reference(reference: &IntentSourceReference) -> bool {
    valid_text(&reference.source_id, 1, 200)
        && valid_text(&reference.title, 1, 120)
        && valid_text(&reference.statement, 1, 2_000)
        && valid_text(&reference.status, 1, 64)
        && matches!(
            (reference.source_type, reference.provenance),
            (IntentSourceType::Compendium, AlignmentProvenance::Documented)
                | (IntentSourceType::Decision, AlignmentProvenance::ApprovedIntent)
        )
}

fn verify_project(root: &Path, expected_project_id: &str) -> Result<(), AlignmentError> {
    if workspace_project_id(root)? != expected_project_id {
        return Err(AlignmentError::new("PROJECT_ID_MISMATCH", "Alignment data does not belong to the selected workspace."));
    }
    Ok(())
}

fn workspace_project_id(root: &Path) -> Result<String, AlignmentError> {
    match workspace::inspect(root).map_err(|_| AlignmentError::new("WORKSPACE_ACCESS_FAILED", "ForgeMind could not access the selected workspace."))? {
        WorkspaceInspection::Valid { project, .. } => Ok(project.project_id),
        _ => Err(AlignmentError::new("INVALID_WORKSPACE", "Alignment requires a valid ForgeMind workspace.")),
    }
}

fn map_compendium_error(error: compendium::CompendiumError) -> AlignmentError {
    AlignmentError::new(&error.code, &error.message)
}

fn map_decision_error(error: decisions::DecisionError) -> AlignmentError {
    AlignmentError::new(&error.code, &error.message)
}

fn validate_text(value: &str, minimum: usize, maximum: usize, code: &str) -> Result<(), AlignmentError> {
    if valid_text(value, minimum, maximum) {
        Ok(())
    } else {
        Err(AlignmentError::new(code, "Alignment review data failed validation."))
    }
}

fn valid_text(value: &str, minimum: usize, maximum: usize) -> bool {
    let length = value.trim().chars().count();
    length >= minimum && length <= maximum
}

fn knowledge_status(status: KnowledgeStatus) -> &'static str {
    match status {
        KnowledgeStatus::Direction => "DIRECTION",
        KnowledgeStatus::Locked => "LOCKED",
        KnowledgeStatus::Tbd => "TBD",
        KnowledgeStatus::Deprecated => "DEPRECATED",
    }
}

fn push_unique(values: &mut Vec<AlignmentProvenance>, value: AlignmentProvenance) {
    if !values.contains(&value) {
        values.push(value);
    }
}

fn empty_document(project_id: &str) -> AlignmentDocument {
    AlignmentDocument {
        format_version: ALIGNMENT_FORMAT_VERSION,
        project_id: project_id.to_owned(),
        updated_at: timestamp(),
        results: Vec::new(),
    }
}

fn alignment_path(root: &Path) -> PathBuf { root.join(".forgemind").join(ALIGNMENT_FILE) }
fn timestamp() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true) }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compendium::{CreateKnowledgeEntryRequest, KnowledgeStatus};
    use crate::decisions::{CreateDecisionRequest, DecisionActionRequest};
    use serde_json::json;
    use std::process::Command;
    use tempfile::TempDir;

    struct Fixture {
        directory: TempDir,
        project_id: String,
        knowledge_id: String,
        approved_decision_id: String,
        proposed_decision_id: String,
    }

    fn fixture() -> Fixture {
        let directory = TempDir::new().unwrap();
        let WorkspaceInspection::Valid { project, .. } = workspace::initialize(directory.path()).unwrap() else { panic!("valid workspace") };
        fs::create_dir_all(directory.path().join("Assets")).unwrap();
        fs::create_dir_all(directory.path().join("Packages")).unwrap();
        fs::create_dir_all(directory.path().join("ProjectSettings")).unwrap();
        fs::write(directory.path().join("ProjectSettings/ProjectVersion.txt"), "m_EditorVersion: 6000.3.23f1\n").unwrap();
        fs::write(
            directory.path().join(".forgemind/unity-groundtruth.json"),
            serde_json::to_vec_pretty(&json!({
                "formatVersion": 1,
                "projectId": project.project_id,
                "generatedAt": "2026-09-21T10:00:00Z",
                "unityVersion": "6000.3.23f1",
                "source": { "kind": "UNITY_EDITOR_EXPORT", "toolVersion": "0.1.0" },
                "coverage": { "categories": ["SCENES", "COMPONENTS", "SCRIPTABLE_OBJECTS"], "errors": [] },
                "observations": {
                    "scenes": [{ "id": "scene-main", "path": "Assets/Scenes/Main.unity" }], "gameObjects": [],
                    "components": [{ "id": "component-1", "gameObjectId": "guard-1", "typeName": "HearingPerception" }],
                    "serializedFields": [], "prefabReferences": [],
                    "scriptableObjects": [{ "id": "asset-hearing-settings", "path": "Assets/Data/HearingSettings.asset", "typeName": "HearingSettings" }],
                    "tags": [], "layers": [], "inputActions": [], "tests": []
                }
            })).unwrap(),
        ).unwrap();

        let compendium = compendium::create_entry(CreateKnowledgeEntryRequest {
            root_path: directory.path().display().to_string(),
            project_id: project.project_id.clone(),
            area: KnowledgeArea::Systems,
            title: "Uncertain sound perception".to_owned(),
            statement: "Sound alone must not reveal exact player coordinates.".to_owned(),
            status: KnowledgeStatus::Locked,
        }).unwrap();
        let knowledge_id = compendium.entries[0].id.clone();

        let approved = decisions::create(CreateDecisionRequest {
            root_path: directory.path().display().to_string(),
            project_id: project.project_id.clone(),
            title: "Sound preserves uncertainty".to_owned(),
            statement: "AI may investigate sound but does not receive exact coordinates.".to_owned(),
            rationale: "Preserve fair tactical information.".to_owned(),
            area: KnowledgeArea::Systems,
            author: "Local User".to_owned(),
            supersedes_decision_id: None,
            related_knowledge_entry_ids: vec![knowledge_id.clone()],
        }).unwrap();
        let approved_decision_id = approved.decisions[0].id.clone();
        decisions::approve(DecisionActionRequest {
            root_path: directory.path().display().to_string(), project_id: project.project_id.clone(), decision_id: approved_decision_id.clone(),
        }).unwrap();
        let proposed = decisions::create(CreateDecisionRequest {
            root_path: directory.path().display().to_string(), project_id: project.project_id.clone(),
            title: "Exact sound position".to_owned(), statement: "Sound reveals exact coordinates.".to_owned(),
            rationale: "Faster response.".to_owned(), area: KnowledgeArea::Systems, author: "Local User".to_owned(),
            supersedes_decision_id: None, related_knowledge_entry_ids: vec![],
        }).unwrap();
        let proposed_decision_id = proposed.decisions.iter().find(|item| item.status == DecisionStatus::Proposed).unwrap().id.clone();
        Fixture { directory, project_id: project.project_id, knowledge_id, approved_decision_id, proposed_decision_id }
    }

    fn check(fixture: &Fixture, assessment: EvidenceAssessment) -> AlignmentCheck {
        let catalog = sources(fixture.directory.path()).unwrap();
        let evidence_id = catalog.reality_evidence.iter().find(|item| item.source == RealitySource::Unity && item.id.contains("component")).unwrap().id.clone();
        AlignmentCheck {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(),
            intent_source_type: IntentSourceType::Compendium, intent_source_id: fixture.knowledge_id.clone(),
            conflicting_decision_id: None,
            evidence: vec![EvidenceSelection { evidence_id, assessment }],
            rationale: "Manual comparison of the selected documented intent and observed component presence.".to_owned(),
            confidence: AlignmentConfidence::High,
            uncertainty: "The snapshot proves component presence but does not prove runtime coordinate handling.".to_owned(),
        }
    }

    #[test]
    fn catalog_exposes_documented_intent_only_approved_decisions_and_unity_evidence() {
        let fixture = fixture();
        let catalog = sources(fixture.directory.path()).unwrap();
        assert!(catalog.intent_sources.iter().any(|item| item.source_id == fixture.knowledge_id && item.provenance == AlignmentProvenance::Documented));
        assert!(catalog.intent_sources.iter().any(|item| item.source_id == fixture.approved_decision_id && item.provenance == AlignmentProvenance::ApprovedIntent));
        assert!(!catalog.intent_sources.iter().any(|item| item.source_id == fixture.proposed_decision_id));
        assert!(catalog.reality_evidence.iter().any(|item| item.id.starts_with("unity:scene:") && item.summary.contains("Assets/Scenes/Main.unity")));
        assert!(catalog.reality_evidence.iter().any(|item| item.source == RealitySource::Unity && item.summary.contains("HearingPerception")));
        assert!(catalog.reality_evidence.iter().any(|item| item.id.starts_with("unity:scriptable-object:") && item.summary.contains("Assets/Data/HearingSettings.asset")));
    }

    #[test]
    fn catalog_accepts_verified_git_evidence_from_the_current_repository() {
        let fixture = fixture();
        run_git(fixture.directory.path(), &["init"]);
        run_git(fixture.directory.path(), &["config", "user.email", "test@example.com"]);
        run_git(fixture.directory.path(), &["config", "user.name", "ForgeMind Test"]);
        run_git(fixture.directory.path(), &["add", "."]);
        run_git(fixture.directory.path(), &["commit", "-m", "Initial reality"]);
        let catalog = sources(fixture.directory.path()).unwrap();
        assert!(catalog.reality_evidence.iter().any(|item| item.source == RealitySource::Git && item.provenance == AlignmentProvenance::VerifiedFromGit));
    }

    #[test]
    fn invalid_or_unapproved_intent_is_rejected() {
        let fixture = fixture();
        let mut request = check(&fixture, EvidenceAssessment::Insufficient);
        request.intent_source_type = IntentSourceType::Decision;
        request.intent_source_id = fixture.proposed_decision_id.clone();
        assert_eq!(create(request).unwrap_err().code, "INVALID_INTENT_SOURCE");
    }

    #[test]
    fn evidence_must_resolve_through_current_git_or_unity_sources() {
        let fixture = fixture();
        let mut request = check(&fixture, EvidenceAssessment::Insufficient);
        request.evidence[0].evidence_id = "unity:invented-evidence".to_owned();
        assert_eq!(create(request).unwrap_err().code, "INVALID_EVIDENCE_SELECTION");
    }

    #[test]
    fn deterministic_statuses_prefer_uncertainty_and_start_pending_review() {
        let fixture = fixture();
        let unverified = create(check(&fixture, EvidenceAssessment::Insufficient)).unwrap();
        assert_eq!(unverified.results[0].status, AlignmentStatus::Unverified);
        assert_eq!(unverified.results[0].confidence, AlignmentConfidence::Low);
        assert_eq!(unverified.results[0].review_state, AlignmentReviewState::PendingReview);
        let aligned = create(check(&fixture, EvidenceAssessment::Supports)).unwrap();
        assert_eq!(aligned.results[1].status, AlignmentStatus::Aligned);
        let out_of_sync = create(check(&fixture, EvidenceAssessment::Contradicts)).unwrap();
        assert_eq!(out_of_sync.results[2].status, AlignmentStatus::OutOfSync);
    }

    #[test]
    fn two_distinct_approved_intents_create_a_conflict() {
        let fixture = fixture();
        let second = decisions::create(CreateDecisionRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(),
            title: "Exact coordinates".to_owned(), statement: "Sound events include exact player coordinates.".to_owned(),
            rationale: "Enable immediate pursuit.".to_owned(), area: KnowledgeArea::Systems, author: "Local User".to_owned(),
            supersedes_decision_id: None, related_knowledge_entry_ids: vec![],
        }).unwrap();
        let second_id = second.decisions.iter().find(|item| item.status == DecisionStatus::Proposed).unwrap().id.clone();
        decisions::approve(DecisionActionRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(), decision_id: second_id.clone(),
        }).unwrap();
        let mut request = check(&fixture, EvidenceAssessment::Supports);
        request.intent_source_type = IntentSourceType::Decision;
        request.intent_source_id = fixture.approved_decision_id.clone();
        request.conflicting_decision_id = Some(second_id);
        let document = create(request).unwrap();
        assert_eq!(document.results[0].status, AlignmentStatus::Conflict);
        assert_eq!(document.results[0].confidence, AlignmentConfidence::Low);
    }

    #[test]
    fn approve_and_reject_are_durable_history_without_source_mutation() {
        let fixture = fixture();
        let compendium_before = fs::read(fixture.directory.path().join(".forgemind/compendium.json")).unwrap();
        let decisions_before = fs::read(fixture.directory.path().join(".forgemind/decisions.json")).unwrap();
        let groundtruth_before = fs::read(fixture.directory.path().join(".forgemind/unity-groundtruth.json")).unwrap();
        let created = create(check(&fixture, EvidenceAssessment::Insufficient)).unwrap();
        let first_id = created.results[0].id.clone();
        let approved = review(ReviewAlignmentRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(),
            result_id: first_id, review_state: AlignmentReviewState::Approved,
        }).unwrap();
        assert_eq!(approved.results[0].review_state, AlignmentReviewState::Approved);
        let second = create(check(&fixture, EvidenceAssessment::Contradicts)).unwrap();
        let second_id = second.results[1].id.clone();
        let rejected = review(ReviewAlignmentRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(),
            result_id: second_id, review_state: AlignmentReviewState::Rejected,
        }).unwrap();
        assert_eq!(rejected.results[1].review_state, AlignmentReviewState::Rejected);
        assert_eq!(load(fixture.directory.path()).unwrap().unwrap(), rejected);
        assert_eq!(fs::read(fixture.directory.path().join(".forgemind/compendium.json")).unwrap(), compendium_before);
        assert_eq!(fs::read(fixture.directory.path().join(".forgemind/decisions.json")).unwrap(), decisions_before);
        assert_eq!(fs::read(fixture.directory.path().join(".forgemind/unity-groundtruth.json")).unwrap(), groundtruth_before);
        let serialized = fs::read_to_string(fixture.directory.path().join(".forgemind/alignment.json")).unwrap();
        assert!(serialized.contains("VERIFIED_FROM_UNITY"));
        assert!(serialized.contains("MANUAL_ASSESSMENT"));
        assert!(!serialized.contains("AI_INFERENCE"));
        assert!(!serialized.contains(&fixture.directory.path().display().to_string()));
    }

    fn run_git(root: &Path, args: &[&str]) {
        let status = Command::new("git").current_dir(root).args(args).status().expect("Git is required for this fixture");
        assert!(status.success(), "git command failed: {args:?}");
    }
}
