use crate::ai::AIRequest;
use crate::workspace::{self, WorkspaceInspection};
use crate::model_registry;
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const INTERVIEW_FORMAT_VERSION: u32 = 1;
const INTERVIEW_FILE: &str = "interview.json";
const MAX_CONTEXT_STATEMENTS: usize = 8;
const MAX_CANDIDATES_PER_TURN: usize = 3;
const INTERVIEW_MAX_COMPLETION_TOKENS: u32 = 1_200;

pub const PROJECT_INTERVIEW_SYSTEM_PROMPT: &str = r#"You are ForgeMind's Project Interview facilitator interviewing a game developer.
Ask one concise, non-leading question at a time. Do not invent project facts. Preserve unknowns and explicit TBD decisions.
Return only one compact JSON object matching this shape:
{"nextSection":"game_vision","nextQuestion":"One concise question or null","candidates":[{"area":"overview","title":"Short title","statement":"Reviewable project fact","status":"DIRECTION","provenance":"USER_STATED"}]}
Allowed nextSection values: project_identity, game_vision, core_player_experience, core_gameplay_loop, systems, world_narrative, technical_context, production_state, constraints, current_priorities, open_questions. Use null for both nextSection and nextQuestion when the interview can move to review.
Allowed candidate area values: overview, game_design, narrative, technical, roadmap. Allowed status values: DIRECTION, LOCKED, TBD. Allowed provenance values: USER_STATED, AI_INFERRED, UNRESOLVED.
Use USER_STATED only for direct statements or faithful summaries, AI_INFERRED for interpretation, and UNRESOLVED for unknowns. Extract zero to three compact candidates from the current answer only. Do not repeat known statements or summarize the entire interview. Do not include reasoning, explanations, markdown, or fields outside the schema."#;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum InterviewSection {
    ProjectIdentity,
    GameVision,
    CorePlayerExperience,
    CoreGameplayLoop,
    Systems,
    WorldNarrative,
    TechnicalContext,
    ProductionState,
    Constraints,
    CurrentPriorities,
    OpenQuestions,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CandidateArea {
    Overview,
    GameDesign,
    Narrative,
    Technical,
    Roadmap,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CandidateStatus {
    Direction,
    Locked,
    Tbd,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CandidateProvenance {
    UserStated,
    AiInferred,
    Unresolved,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InterviewCandidate {
    pub candidate_id: String,
    pub area: CandidateArea,
    pub title: String,
    pub statement: String,
    pub status: CandidateStatus,
    pub provenance: CandidateProvenance,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CandidateDraft {
    area: CandidateArea,
    title: String,
    statement: String,
    status: CandidateStatus,
    provenance: CandidateProvenance,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawInterviewTurn {
    next_section: Option<InterviewSection>,
    next_question: Option<String>,
    candidates: Vec<CandidateDraft>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InterviewTurnRequest {
    pub project_id: String,
    pub model_id: String,
    pub current_section: InterviewSection,
    pub current_question: String,
    pub answer: String,
    #[serde(default)]
    pub known_statements: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewTurnResult {
    pub next_section: Option<InterviewSection>,
    pub next_question: Option<String>,
    pub candidates: Vec<InterviewCandidate>,
    pub model: String,
    pub latency_ms: u64,
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub total_tokens: Option<u64>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReviewDecision {
    Pending,
    Approve,
    Discard,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReviewedCandidate {
    pub candidate: InterviewCandidate,
    pub decision: ReviewDecision,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SaveInterviewRequest {
    pub root_path: String,
    pub project_id: String,
    pub model_id: String,
    pub candidates: Vec<ReviewedCandidate>,
    pub overwrite: bool,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InterviewDocument {
    pub format_version: u32,
    pub project_id: String,
    pub approved_at: String,
    pub model_id: String,
    pub candidates: Vec<InterviewCandidate>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewError {
    pub code: String,
    pub message: String,
}

impl InterviewError {
    pub fn new(code: &str, message: &str) -> Self {
        Self {
            code: code.to_owned(),
            message: message.to_owned(),
        }
    }

    fn invalid_output() -> Self {
        Self::new(
            "INVALID_INTERVIEW_OUTPUT",
            "The AI response did not match the required Project Interview structure.",
        )
    }

    fn invalid_file() -> Self {
        Self::new(
            "INVALID_INTERVIEW_FILE",
            "The existing ForgeMind interview file is invalid and was not changed.",
        )
    }
}

pub fn build_ai_request(request: &InterviewTurnRequest) -> Result<AIRequest, InterviewError> {
    validate_text(&request.project_id, 1, 200)?;
    validate_text(&request.model_id, 1, 200)?;
    model_registry::enabled_model(&request.model_id).map_err(|error| {
        InterviewError::new(error.code, &error.message)
    })?;
    validate_text(&request.current_question, 1, 500)?;
    validate_text(&request.answer, 1, 4_000)?;
    if request.known_statements.len() > MAX_CONTEXT_STATEMENTS
        || request
            .known_statements
            .iter()
            .any(|statement| validate_text(statement, 1, 500).is_err())
    {
        return Err(InterviewError::new(
            "INVALID_INTERVIEW_REQUEST",
            "The compact interview context is invalid.",
        ));
    }

    let prompt = serde_json::json!({
        "currentSection": request.current_section,
        "currentQuestion": request.current_question.trim(),
        "developerAnswer": request.answer.trim(),
        "knownStatements": request.known_statements,
        "instruction": "Extract 0-3 new candidates supported by this answer, then ask one useful next question."
    });

    Ok(AIRequest {
        model: request.model_id.trim().to_owned(),
        system_prompt: Some(PROJECT_INTERVIEW_SYSTEM_PROMPT.to_owned()),
        user_prompt: serde_json::to_string(&prompt).map_err(|_| {
            InterviewError::new(
                "INVALID_INTERVIEW_REQUEST",
                "ForgeMind could not prepare the interview turn.",
            )
        })?,
        temperature: Some(0.2),
        max_tokens: Some(INTERVIEW_MAX_COMPLETION_TOKENS),
        reasoning_effort: Some("minimal".to_owned()),
    })
}

pub fn normalize_turn(
    text: &str,
    model: String,
    latency_ms: u64,
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    total_tokens: Option<u64>,
) -> Result<InterviewTurnResult, InterviewError> {
    let payload = structured_payload(text).ok_or_else(InterviewError::invalid_output)?;
    let raw: RawInterviewTurn =
        serde_json::from_str(payload).map_err(|_| InterviewError::invalid_output())?;

    if raw.candidates.len() > MAX_CANDIDATES_PER_TURN
        || raw
            .candidates
            .iter()
            .any(|candidate| validate_candidate_draft(candidate).is_err())
    {
        return Err(InterviewError::invalid_output());
    }
    match (&raw.next_section, &raw.next_question) {
        (Some(_), Some(question)) if validate_text(question, 1, 300).is_ok() => {}
        (None, None) => {}
        _ => return Err(InterviewError::invalid_output()),
    }

    Ok(InterviewTurnResult {
        next_section: raw.next_section,
        next_question: raw.next_question.map(|question| question.trim().to_owned()),
        candidates: raw
            .candidates
            .into_iter()
            .map(|candidate| InterviewCandidate {
                candidate_id: Uuid::new_v4().to_string(),
                area: candidate.area,
                title: candidate.title.trim().to_owned(),
                statement: candidate.statement.trim().to_owned(),
                status: candidate.status,
                provenance: candidate.provenance,
            })
            .collect(),
        model,
        latency_ms,
        input_tokens,
        output_tokens,
        total_tokens,
    })
}

pub fn load(root: &Path) -> Result<Option<InterviewDocument>, InterviewError> {
    let project_id = workspace_project_id(root)?;
    let path = interview_path(root);
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(_) => {
            return Err(InterviewError::new(
                "INTERVIEW_READ_FAILED",
                "ForgeMind could not read the existing interview file.",
            ));
        }
    };
    let document: InterviewDocument =
        serde_json::from_str(&contents).map_err(|_| InterviewError::invalid_file())?;
    validate_document(&document, &project_id)?;
    Ok(Some(document))
}

pub fn save(request: SaveInterviewRequest) -> Result<InterviewDocument, InterviewError> {
    let root = Path::new(&request.root_path);
    let workspace_project_id = workspace_project_id(root)?;
    if workspace_project_id != request.project_id {
        return Err(InterviewError::new(
            "PROJECT_ID_MISMATCH",
            "The interview does not belong to the selected ForgeMind workspace.",
        ));
    }
    validate_text(&request.model_id, 1, 200)?;
    model_registry::enabled_model(&request.model_id)
        .map_err(|error| InterviewError::new(error.code, &error.message))?;

    let approved = request
        .candidates
        .into_iter()
        .filter(|candidate| candidate.decision == ReviewDecision::Approve)
        .map(|reviewed| {
            validate_candidate(&reviewed.candidate)?;
            Ok(reviewed.candidate)
        })
        .collect::<Result<Vec<_>, InterviewError>>()?;
    if approved.is_empty() {
        return Err(InterviewError::new(
            "NO_APPROVED_CANDIDATES",
            "Approve at least one candidate before saving interview knowledge.",
        ));
    }

    let path = interview_path(root);
    if path.exists() && !request.overwrite {
        return Err(InterviewError::new(
            "INTERVIEW_ALREADY_EXISTS",
            "Interview knowledge already exists. Confirm replacement before saving.",
        ));
    }
    let document = InterviewDocument {
        format_version: INTERVIEW_FORMAT_VERSION,
        project_id: request.project_id,
        approved_at: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
        model_id: request.model_id.trim().to_owned(),
        candidates: approved,
    };
    let mut contents = serde_json::to_vec_pretty(&document).map_err(|_| {
        InterviewError::new(
            "INTERVIEW_WRITE_FAILED",
            "ForgeMind could not prepare approved interview knowledge.",
        )
    })?;
    contents.push(b'\n');

    let mut options = OpenOptions::new();
    options.write(true);
    if request.overwrite {
        options.create(true).truncate(true);
    } else {
        options.create_new(true);
    }
    let mut file = options.open(path).map_err(|error| {
        if error.kind() == io::ErrorKind::AlreadyExists {
            InterviewError::new(
                "INTERVIEW_ALREADY_EXISTS",
                "Interview knowledge already exists. Confirm replacement before saving.",
            )
        } else {
            InterviewError::new(
                "INTERVIEW_WRITE_FAILED",
                "ForgeMind could not save approved interview knowledge.",
            )
        }
    })?;
    file.write_all(&contents).map_err(|_| {
        InterviewError::new(
            "INTERVIEW_WRITE_FAILED",
            "ForgeMind could not save approved interview knowledge.",
        )
    })?;
    Ok(document)
}

fn workspace_project_id(root: &Path) -> Result<String, InterviewError> {
    match workspace::inspect(root).map_err(|_| {
        InterviewError::new(
            "WORKSPACE_ACCESS_FAILED",
            "ForgeMind could not access the selected workspace.",
        )
    })? {
        WorkspaceInspection::Valid { project, .. } => Ok(project.project_id),
        _ => Err(InterviewError::new(
            "INVALID_WORKSPACE",
            "Project Interview requires a valid ForgeMind workspace.",
        )),
    }
}

fn interview_path(root: &Path) -> PathBuf {
    root.join(".forgemind").join(INTERVIEW_FILE)
}

fn structured_payload(text: &str) -> Option<&str> {
    let text = text.trim();
    if text.starts_with("```json") && text.ends_with("```") {
        return Some(text[7..text.len() - 3].trim());
    }
    if text.starts_with('{') && text.ends_with('}') {
        return Some(text);
    }
    None
}

fn validate_document(document: &InterviewDocument, expected_project_id: &str) -> Result<(), InterviewError> {
    if document.format_version != INTERVIEW_FORMAT_VERSION
        || document.project_id != expected_project_id
        || DateTime::parse_from_rfc3339(&document.approved_at).is_err()
        || validate_text(&document.model_id, 1, 200).is_err()
        || document.candidates.is_empty()
        || document
            .candidates
            .iter()
            .any(|candidate| validate_candidate(candidate).is_err())
    {
        return Err(InterviewError::invalid_file());
    }
    Ok(())
}

fn validate_candidate(candidate: &InterviewCandidate) -> Result<(), InterviewError> {
    Uuid::parse_str(&candidate.candidate_id).map_err(|_| InterviewError::invalid_file())?;
    validate_text(&candidate.title, 1, 120)?;
    validate_text(&candidate.statement, 1, 1_000)
}

fn validate_candidate_draft(candidate: &CandidateDraft) -> Result<(), InterviewError> {
    validate_text(&candidate.title, 1, 120)?;
    validate_text(&candidate.statement, 1, 1_000)
}

fn validate_text(value: &str, minimum: usize, maximum: usize) -> Result<(), InterviewError> {
    let length = value.trim().chars().count();
    if length < minimum || length > maximum {
        return Err(InterviewError::new(
            "INVALID_INTERVIEW_DATA",
            "Project Interview data failed validation.",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    fn workspace() -> (TempDir, String) {
        let directory = TempDir::new().unwrap();
        let inspection = workspace::initialize(directory.path()).unwrap();
        let WorkspaceInspection::Valid { project, .. } = inspection else {
            panic!("expected valid workspace");
        };
        (directory, project.project_id)
    }

    fn candidate(decision: ReviewDecision) -> ReviewedCandidate {
        ReviewedCandidate {
            candidate: InterviewCandidate {
                candidate_id: "550e8400-e29b-41d4-a716-446655440000".to_owned(),
                area: CandidateArea::Overview,
                title: "Project pitch".to_owned(),
                statement: "A tactical game about difficult choices.".to_owned(),
                status: CandidateStatus::Direction,
                provenance: CandidateProvenance::UserStated,
            },
            decision,
        }
    }

    fn save_request(root: &Path, project_id: &str) -> SaveInterviewRequest {
        SaveInterviewRequest {
            root_path: root.display().to_string(),
            project_id: project_id.to_owned(),
            model_id: "deepseek-ai/DeepSeek-V4.1-Flash".to_owned(),
            candidates: vec![candidate(ReviewDecision::Approve)],
            overwrite: false,
        }
    }

    #[test]
    fn valid_interview_file_is_created_and_reopened() {
        let (directory, project_id) = workspace();
        let saved = save(save_request(directory.path(), &project_id)).unwrap();
        assert_eq!(saved.format_version, 1);
        assert_eq!(load(directory.path()).unwrap(), Some(saved));
    }

    #[test]
    fn only_approved_candidates_are_persisted() {
        let (directory, project_id) = workspace();
        let mut request = save_request(directory.path(), &project_id);
        request.candidates.push(candidate(ReviewDecision::Pending));
        request.candidates.push(candidate(ReviewDecision::Discard));
        let saved = save(request).unwrap();
        assert_eq!(saved.candidates.len(), 1);
    }

    #[test]
    fn persisted_schema_contains_no_secret_raw_or_absolute_path_fields() {
        let (directory, project_id) = workspace();
        save(save_request(directory.path(), &project_id)).unwrap();
        let contents = fs::read_to_string(interview_path(directory.path())).unwrap();
        assert!(!contents.contains(&directory.path().display().to_string()));
        assert!(!contents.contains("apiKey"));
        assert!(!contents.contains("rawResponse"));
        assert!(!contents.contains("reasoning"));
        assert!(!contents.contains("authorization"));
    }

    #[test]
    fn malformed_or_unknown_interview_fields_fail_safely() {
        let (directory, project_id) = workspace();
        let path = interview_path(directory.path());
        fs::write(&path, "{not json").unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_INTERVIEW_FILE");
        fs::write(
            path,
            json!({
                "formatVersion": 1,
                "projectId": project_id,
                "approvedAt": "2026-09-19T00:00:00.000Z",
                "modelId": "vendor/model",
                "candidates": [],
                "unknown": true
            })
            .to_string(),
        )
        .unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_INTERVIEW_FILE");
    }

    #[test]
    fn existing_file_is_not_silently_overwritten() {
        let (directory, project_id) = workspace();
        save(save_request(directory.path(), &project_id)).unwrap();
        let before = fs::read(interview_path(directory.path())).unwrap();
        let error = save(save_request(directory.path(), &project_id)).unwrap_err();
        assert_eq!(error.code, "INTERVIEW_ALREADY_EXISTS");
        assert_eq!(fs::read(interview_path(directory.path())).unwrap(), before);
    }

    #[test]
    fn explicit_overwrite_replaces_only_the_interview_file() {
        let (directory, project_id) = workspace();
        save(save_request(directory.path(), &project_id)).unwrap();
        let mut replacement = save_request(directory.path(), &project_id);
        replacement.overwrite = true;
        replacement.candidates[0].candidate.statement = "Updated approved pitch.".to_owned();
        let saved = save(replacement).unwrap();
        assert_eq!(saved.candidates[0].statement, "Updated approved pitch.");
    }

    #[test]
    fn invalid_provenance_and_status_are_rejected() {
        let base = json!({
            "formatVersion": 1,
            "projectId": "project",
            "approvedAt": "2026-09-19T00:00:00.000Z",
            "modelId": "vendor/model",
            "candidates": [{
                "candidateId": "candidate",
                "area": "overview",
                "title": "Title",
                "statement": "Statement",
                "status": "INVALID",
                "provenance": "USER_STATED"
            }]
        });
        assert!(serde_json::from_value::<InterviewDocument>(base).is_err());
    }

    #[test]
    fn structured_model_output_is_normalized_and_validated() {
        let result = normalize_turn(
            r#"{"nextSection":"game_vision","nextQuestion":"What makes the game distinct?","candidates":[{"area":"overview","title":"Genre","statement":"The game is tactical.","status":"DIRECTION","provenance":"USER_STATED"}]}"#,
            "vendor/model".to_owned(),
            42,
            Some(10),
            Some(20),
            Some(30),
        )
        .unwrap();
        assert_eq!(result.next_section, Some(InterviewSection::GameVision));
        assert_eq!(result.candidates.len(), 1);
        assert!(Uuid::parse_str(&result.candidates[0].candidate_id).is_ok());
    }

    #[test]
    fn malformed_structured_output_and_unknown_fields_are_rejected() {
        assert_eq!(
            normalize_turn("not json", "model".to_owned(), 0, None, None, None)
                .unwrap_err()
                .code,
            "INVALID_INTERVIEW_OUTPUT"
        );
        assert!(normalize_turn(
            r#"{"nextSection":null,"nextQuestion":null,"candidates":[],"extra":true}"#,
            "model".to_owned(),
            0,
            None,
            None,
            None,
        )
        .is_err());
    }

    #[test]
    fn prompt_builder_is_centralized_compact_and_contains_no_hidden_history() {
        let request = InterviewTurnRequest {
            project_id: "project".to_owned(),
            model_id: "deepseek-ai/DeepSeek-V4.1-Flash".to_owned(),
            current_section: InterviewSection::ProjectIdentity,
            current_question: "What game are you building?".to_owned(),
            answer: "A tactical extraction game.".to_owned(),
            known_statements: vec!["Single-player direction.".to_owned()],
        };
        let ai_request = build_ai_request(&request).unwrap();
        assert_eq!(ai_request.system_prompt.as_deref(), Some(PROJECT_INTERVIEW_SYSTEM_PROMPT));
        assert!(ai_request.user_prompt.contains("tactical extraction"));
        assert!(!ai_request.user_prompt.contains("conversationHistory"));
        assert_eq!(ai_request.max_tokens, Some(INTERVIEW_MAX_COMPLETION_TOKENS));
        assert_eq!(ai_request.reasoning_effort.as_deref(), Some("minimal"));
    }

    #[test]
    fn response_candidate_count_is_bounded_to_three() {
        let candidate = json!({
            "area": "overview",
            "title": "Fact",
            "statement": "A compact stated fact.",
            "status": "DIRECTION",
            "provenance": "USER_STATED"
        });
        let accepted = json!({
            "nextSection": "game_vision",
            "nextQuestion": "What makes the game distinct?",
            "candidates": [candidate.clone(), candidate.clone(), candidate.clone()]
        });
        let rejected = json!({
            "nextSection": "game_vision",
            "nextQuestion": "What makes the game distinct?",
            "candidates": [candidate.clone(), candidate.clone(), candidate.clone(), candidate]
        });

        assert!(normalize_turn(
            &accepted.to_string(),
            "model".to_owned(),
            0,
            None,
            None,
            None,
        )
        .is_ok());
        assert_eq!(
            normalize_turn(
                &rejected.to_string(),
                "model".to_owned(),
                0,
                None,
                None,
                None,
            )
            .unwrap_err()
            .code,
            "INVALID_INTERVIEW_OUTPUT"
        );
    }

    #[test]
    fn compact_response_schema_supports_a_done_turn_without_candidates() {
        let result = normalize_turn(
            r#"{"nextSection":null,"nextQuestion":null,"candidates":[]}"#,
            "model".to_owned(),
            0,
            None,
            None,
            None,
        )
        .unwrap();

        assert_eq!(result.next_section, None);
        assert_eq!(result.next_question, None);
        assert!(result.candidates.is_empty());
    }

    #[test]
    fn prompt_builder_rejects_an_unavailable_model_before_provider_use() {
        let request = InterviewTurnRequest {
            project_id: "project".to_owned(),
            model_id: "unknown/model".to_owned(),
            current_section: InterviewSection::ProjectIdentity,
            current_question: "What game are you building?".to_owned(),
            answer: "A tactical extraction game.".to_owned(),
            known_statements: Vec::new(),
        };
        assert_eq!(build_ai_request(&request).unwrap_err().code, "UNKNOWN_MODEL");
    }
}
