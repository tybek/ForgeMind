use crate::compendium::{self, KnowledgeArea, KnowledgeStatus};
use crate::decisions::{self, DecisionStatus};
use crate::specialists::{self, AI_BEHAVIOR_DESIGNER_ID};
use crate::workspace::{self, WorkspaceInspection};
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::{self, Write};
use std::path::{Component, Path, PathBuf};
use uuid::Uuid;

const FORMAT_VERSION: u32 = 1;
const FILE_NAME: &str = "ai-workspace-sessions.json";
const MAX_SESSIONS: usize = 50;
const MAX_MESSAGES: usize = 200;
const MAX_PROPOSALS: usize = 50;
const MAX_CONTEXT_SOURCES: usize = 20;
const MAX_MESSAGE_CHARS: usize = 16_000;
const MAX_DOCUMENT_CHARS: usize = 12_000;
const MAX_CONTEXT_CHARS: usize = 48_000;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AiWorkspaceSessionStatus {
    Active,
    Archived,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AiWorkspaceMessageRole {
    User,
    Assistant,
}

#[derive(Clone, Copy, Debug, Deserialize, Hash, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AiWorkspaceSourceType {
    Compendium,
    Decision,
    OpenQuestion,
    Document,
    Reality,
    AiWorkspaceMessage,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AiWorkspaceAuthority {
    AuthoritativeIntent,
    EstablishedKnowledge,
    UnresolvedKnowledge,
    Documented,
    RealityEvidence,
    AiGenerated,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AiWorkspaceSelectionPriority {
    Explicit,
    Supporting,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AiWorkspaceProposalType {
    SaveKnowledge,
    CreateDecision,
    CreateOpenQuestion,
    UpdateKnowledge,
    NavigateToSource,
    ContinueExploring,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AiWorkspaceProposalStatus {
    Pending,
    Accepted,
    Applied,
    Rejected,
    Discarded,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AiWorkspaceSourceTrace {
    pub source_type: AiWorkspaceSourceType,
    pub source_id: String,
    pub label: String,
    pub authority: AiWorkspaceAuthority,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub navigation_target: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AiWorkspaceUsageReference {
    pub application_session_id: String,
    pub usage_timestamp: String,
    pub profile_id: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AiWorkspaceMessage {
    pub id: String,
    pub role: AiWorkspaceMessageRole,
    pub content: String,
    pub created_at: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_trace: Vec<AiWorkspaceSourceTrace>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage_reference: Option<AiWorkspaceUsageReference>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AiWorkspaceProposedEdit {
    pub target: AiWorkspaceSourceTrace,
    pub current_value: String,
    pub proposed_value: String,
    pub reason: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub affected_references: Vec<AiWorkspaceSourceTrace>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AiWorkspaceProposal {
    pub id: String,
    pub proposal_type: AiWorkspaceProposalType,
    pub title: String,
    pub summary: String,
    pub status: AiWorkspaceProposalStatus,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_trace: Vec<AiWorkspaceSourceTrace>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proposed_edit: Option<AiWorkspaceProposedEdit>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AiWorkspaceSession {
    pub id: String,
    pub project_id: String,
    pub surface: String,
    pub purpose: String,
    pub specialist_profile_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub status: AiWorkspaceSessionStatus,
    pub messages: Vec<AiWorkspaceMessage>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_trace: Vec<AiWorkspaceSourceTrace>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub proposals: Vec<AiWorkspaceProposal>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AiWorkspaceDocument {
    pub format_version: u32,
    pub project_id: String,
    pub updated_at: String,
    pub sessions: Vec<AiWorkspaceSession>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiWorkspaceProfile {
    pub id: String,
    pub display_name: String,
    pub task_purpose: String,
    pub allowed_context_categories: Vec<AiWorkspaceSourceType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preferred_model_id: Option<String>,
    pub output_expectations: String,
    pub review_expectations: String,
    pub available_for_runs: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateAiWorkspaceSessionRequest {
    pub root_path: String,
    pub project_id: String,
    pub surface: String,
    pub purpose: String,
    pub specialist_profile_id: String,
    pub title: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AppendAiWorkspaceMessageRequest {
    pub root_path: String,
    pub project_id: String,
    pub session_id: String,
    pub role: AiWorkspaceMessageRole,
    pub content: String,
    #[serde(default)]
    pub source_trace: Vec<AiWorkspaceSourceTrace>,
    #[serde(default)]
    pub usage_reference: Option<AiWorkspaceUsageReference>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AiWorkspaceSessionActionRequest {
    pub root_path: String,
    pub project_id: String,
    pub session_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateAiWorkspaceProposalRequest {
    pub root_path: String,
    pub project_id: String,
    pub session_id: String,
    pub proposal_type: AiWorkspaceProposalType,
    pub title: String,
    pub summary: String,
    #[serde(default)]
    pub source_trace: Vec<AiWorkspaceSourceTrace>,
    #[serde(default)]
    pub proposed_edit: Option<AiWorkspaceProposedEdit>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReviewAiWorkspaceProposalRequest {
    pub root_path: String,
    pub project_id: String,
    pub session_id: String,
    pub proposal_id: String,
    pub status: AiWorkspaceProposalStatus,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "sourceType",
    rename_all = "SCREAMING_SNAKE_CASE",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum AiWorkspaceContextSourceRequest {
    Compendium {
        source_id: String,
        priority: AiWorkspaceSelectionPriority,
    },
    Decision {
        source_id: String,
        priority: AiWorkspaceSelectionPriority,
    },
    OpenQuestion {
        source_id: String,
        priority: AiWorkspaceSelectionPriority,
    },
    Document {
        relative_path: String,
        priority: AiWorkspaceSelectionPriority,
    },
    AiWorkspaceMessage {
        session_id: String,
        message_id: String,
        priority: AiWorkspaceSelectionPriority,
    },
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BuildAiWorkspaceContextRequest {
    pub root_path: String,
    pub project_id: String,
    pub sources: Vec<AiWorkspaceContextSourceRequest>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiWorkspaceContextItem {
    pub content: String,
    pub trace: AiWorkspaceSourceTrace,
    pub priority: AiWorkspaceSelectionPriority,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiWorkspaceContextPlan {
    pub project_id: String,
    pub items: Vec<AiWorkspaceContextItem>,
    pub source_trace: Vec<AiWorkspaceSourceTrace>,
    pub total_characters: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiWorkspaceRecovery {
    pub document: AiWorkspaceDocument,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archived_file_name: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiWorkspaceError {
    pub code: String,
    pub message: String,
}

impl AiWorkspaceError {
    fn new(code: &str, message: &str) -> Self {
        Self { code: code.to_owned(), message: message.to_owned() }
    }

    fn invalid(message: &str) -> Self {
        Self::new("INVALID_AI_WORKSPACE_REQUEST", message)
    }
}

pub fn profiles() -> Vec<AiWorkspaceProfile> {
    let project_brain = vec![
        AiWorkspaceSourceType::Compendium,
        AiWorkspaceSourceType::Decision,
        AiWorkspaceSourceType::OpenQuestion,
        AiWorkspaceSourceType::Document,
        AiWorkspaceSourceType::AiWorkspaceMessage,
    ];
    let existing_specialist = specialists::profiles()
        .into_iter()
        .find(|profile| profile.id == AI_BEHAVIOR_DESIGNER_ID)
        .expect("registered AI Behavior Designer profile");
    vec![
        profile(
            &existing_specialist.id,
            &existing_specialist.display_name,
            &existing_specialist.description,
            project_brain.clone(),
            true,
        ),
        profile("lore_architect", "Lore Architect", "Develop source-aware lore proposals.", project_brain.clone(), false),
        profile("character_dialogue", "Character & Dialogue", "Develop character and dialogue proposals.", project_brain.clone(), false),
        profile("continuity_editor", "Continuity", "Review narrative continuity against selected sources.", project_brain.clone(), false),
        profile("wiki_chronicler", "Wiki Chronicler", "Retrieve Project Brain sources and prepare reviewed knowledge proposals.", project_brain, false),
    ]
}

fn profile(
    id: &str,
    display_name: &str,
    task_purpose: &str,
    allowed_context_categories: Vec<AiWorkspaceSourceType>,
    available_for_runs: bool,
) -> AiWorkspaceProfile {
    AiWorkspaceProfile {
        id: id.to_owned(),
        display_name: display_name.to_owned(),
        task_purpose: task_purpose.to_owned(),
        allowed_context_categories,
        preferred_model_id: None,
        output_expectations: "Return bounded source-aware output without hidden reasoning.".to_owned(),
        review_expectations: "AI output remains non-authoritative until a human reviews and applies an owning-domain action.".to_owned(),
        available_for_runs,
    }
}

pub fn load(root: &Path) -> Result<Option<AiWorkspaceDocument>, AiWorkspaceError> {
    let project_id = workspace_project_id(root)?;
    load_for_project(root, &project_id)
}

pub fn create_session(request: CreateAiWorkspaceSessionRequest) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_safe_content(&request.surface, 1, 80, "Surface")?;
    validate_safe_content(&request.purpose, 1, 500, "Purpose")?;
    validate_safe_content(&request.title, 1, 160, "Title")?;
    if !profiles().iter().any(|profile| profile.id == request.specialist_profile_id) {
        return Err(AiWorkspaceError::invalid("The selected AI Workspace profile is not registered."));
    }
    let mut document = load_for_project(root, &request.project_id)?
        .unwrap_or_else(|| empty_document(&request.project_id));
    if document.sessions.len() >= MAX_SESSIONS {
        return Err(AiWorkspaceError::invalid("AI Workspace history has reached its bounded session limit."));
    }
    let now = timestamp();
    document.sessions.push(AiWorkspaceSession {
        id: Uuid::new_v4().to_string(),
        project_id: request.project_id,
        surface: request.surface.trim().to_owned(),
        purpose: request.purpose.trim().to_owned(),
        specialist_profile_id: request.specialist_profile_id,
        title: request.title.trim().to_owned(),
        created_at: now.clone(),
        updated_at: now,
        status: AiWorkspaceSessionStatus::Active,
        messages: Vec::new(),
        source_trace: Vec::new(),
        proposals: Vec::new(),
    });
    save(root, document)
}

pub fn append_message(request: AppendAiWorkspaceMessageRequest) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_safe_content(&request.content, 1, MAX_MESSAGE_CHARS, "Message")?;
    validate_trace(&request.source_trace)?;
    if let Some(reference) = request.usage_reference.as_ref() {
        validate_usage_reference(reference)?;
    }
    let mut document = required_document(root, &request.project_id)?;
    let session = active_session_mut(&mut document, &request.session_id)?;
    if session.messages.len() >= MAX_MESSAGES {
        return Err(AiWorkspaceError::invalid("This AI Workspace session has reached its bounded message limit."));
    }
    let now = timestamp();
    session.messages.push(AiWorkspaceMessage {
        id: Uuid::new_v4().to_string(),
        role: request.role,
        content: request.content.trim().to_owned(),
        created_at: now.clone(),
        source_trace: request.source_trace.clone(),
        usage_reference: request.usage_reference,
    });
    merge_trace(&mut session.source_trace, request.source_trace);
    session.updated_at = now;
    save(root, document)
}

pub fn archive_session(request: AiWorkspaceSessionActionRequest) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let mut document = required_document(root, &request.project_id)?;
    let session = document.sessions.iter_mut().find(|session| session.id == request.session_id)
        .ok_or_else(|| AiWorkspaceError::invalid("The selected AI Workspace session does not exist."))?;
    session.status = AiWorkspaceSessionStatus::Archived;
    session.updated_at = timestamp();
    save(root, document)
}

pub fn create_proposal(request: CreateAiWorkspaceProposalRequest) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_safe_content(&request.title, 1, 160, "Proposal title")?;
    validate_safe_content(&request.summary, 1, 4_000, "Proposal summary")?;
    validate_trace(&request.source_trace)?;
    if let Some(edit) = request.proposed_edit.as_ref() {
        validate_proposed_edit(edit)?;
    }
    if request.proposal_type == AiWorkspaceProposalType::UpdateKnowledge
        && request.proposed_edit.is_none()
    {
        return Err(AiWorkspaceError::invalid("A knowledge update proposal requires current and proposed content."));
    }
    let mut document = required_document(root, &request.project_id)?;
    let session = active_session_mut(&mut document, &request.session_id)?;
    if session.proposals.len() >= MAX_PROPOSALS {
        return Err(AiWorkspaceError::invalid("This AI Workspace session has reached its bounded proposal limit."));
    }
    let now = timestamp();
    session.proposals.push(AiWorkspaceProposal {
        id: Uuid::new_v4().to_string(),
        proposal_type: request.proposal_type,
        title: request.title.trim().to_owned(),
        summary: request.summary.trim().to_owned(),
        status: AiWorkspaceProposalStatus::Pending,
        created_at: now.clone(),
        updated_at: now.clone(),
        source_trace: request.source_trace.clone(),
        proposed_edit: request.proposed_edit,
    });
    merge_trace(&mut session.source_trace, request.source_trace);
    session.updated_at = now;
    save(root, document)
}

pub fn review_proposal(request: ReviewAiWorkspaceProposalRequest) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let mut document = required_document(root, &request.project_id)?;
    let session = active_session_mut(&mut document, &request.session_id)?;
    let proposal = session.proposals.iter_mut().find(|proposal| proposal.id == request.proposal_id)
        .ok_or_else(|| AiWorkspaceError::invalid("The selected AI Workspace proposal does not exist."))?;
    let valid_transition = matches!(
        (proposal.status, request.status),
        (AiWorkspaceProposalStatus::Pending, AiWorkspaceProposalStatus::Accepted)
            | (AiWorkspaceProposalStatus::Pending, AiWorkspaceProposalStatus::Rejected)
            | (AiWorkspaceProposalStatus::Pending, AiWorkspaceProposalStatus::Discarded)
            | (AiWorkspaceProposalStatus::Accepted, AiWorkspaceProposalStatus::Applied)
    );
    if !valid_transition {
        return Err(AiWorkspaceError::invalid("The requested proposal review transition is not allowed."));
    }
    let now = timestamp();
    proposal.status = request.status;
    proposal.updated_at = now.clone();
    session.updated_at = now;
    save(root, document)
}

pub fn build_context(request: BuildAiWorkspaceContextRequest) -> Result<AiWorkspaceContextPlan, AiWorkspaceError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    if request.sources.is_empty() || request.sources.len() > MAX_CONTEXT_SOURCES {
        return Err(AiWorkspaceError::invalid("Select between 1 and 20 bounded context sources."));
    }
    let compendium = compendium::load(root).map_err(|error| AiWorkspaceError::new(&error.code, &error.message))?;
    let decisions = decisions::load(root).map_err(|error| AiWorkspaceError::new(&error.code, &error.message))?;
    let sessions = load_for_project(root, &request.project_id)?;
    let mut items = Vec::with_capacity(request.sources.len());
    let mut selected_keys = HashSet::new();
    for (index, source) in request.sources.iter().enumerate() {
        let item = resolve_context_source(root, source, compendium.as_ref(), decisions.as_ref(), sessions.as_ref())?;
        if contains_secret_marker(&item.content) || contains_absolute_path(&item.content) {
            return Err(AiWorkspaceError::invalid("The selected context contains credential-like or machine-specific path content and was excluded."));
        }
        let key = format!("{:?}:{}", item.trace.source_type, item.trace.source_id);
        if !selected_keys.insert(key) {
            return Err(AiWorkspaceError::invalid("The Context Plan contains the same source more than once."));
        }
        items.push((index, item));
    }
    items.sort_by_key(|(index, item)| {
        let explicit_rank = if item.priority == AiWorkspaceSelectionPriority::Explicit { 0 } else { 1 };
        let authority_rank = if explicit_rank == 0 { 0 } else { context_authority_rank(item.trace.authority) };
        (explicit_rank, authority_rank, *index)
    });
    let items: Vec<AiWorkspaceContextItem> = items.into_iter().map(|(_, item)| item).collect();
    let total_characters = items.iter().map(|item| item.content.chars().count()).sum();
    if total_characters > MAX_CONTEXT_CHARS {
        return Err(AiWorkspaceError::invalid("The selected Context Plan exceeds the bounded context size."));
    }
    let source_trace = items.iter().map(|item| item.trace.clone()).collect();
    Ok(AiWorkspaceContextPlan { project_id: request.project_id, items, source_trace, total_characters })
}

pub fn archive_and_reset(root: &Path) -> Result<AiWorkspaceRecovery, AiWorkspaceError> {
    let project_id = workspace_project_id(root)?;
    let current_path = document_path(root);
    let archived_file_name = if current_path.exists() {
        let name = format!(
            "ai-workspace-sessions.invalid-{}-{}.json",
            Utc::now().format("%Y%m%dT%H%M%S%3fZ"),
            Uuid::new_v4(),
        );
        fs::rename(&current_path, root.join(".forgemind").join(&name)).map_err(|_| {
            AiWorkspaceError::new("AI_WORKSPACE_RECOVERY_FAILED", "ForgeMind could not archive invalid AI Workspace history.")
        })?;
        Some(name)
    } else {
        None
    };
    let document = save(root, empty_document(&project_id))?;
    Ok(AiWorkspaceRecovery { document, archived_file_name })
}

fn resolve_context_source(
    root: &Path,
    request: &AiWorkspaceContextSourceRequest,
    compendium: Option<&compendium::CompendiumDocument>,
    decisions: Option<&decisions::DecisionsDocument>,
    sessions: Option<&AiWorkspaceDocument>,
) -> Result<AiWorkspaceContextItem, AiWorkspaceError> {
    match request {
        AiWorkspaceContextSourceRequest::Compendium { source_id, priority } => {
            let entry = compendium.and_then(|document| document.entries.iter().find(|entry| &entry.id == source_id))
                .filter(|entry| entry.status != KnowledgeStatus::Deprecated && entry.area != KnowledgeArea::OpenQuestions)
                .ok_or_else(|| AiWorkspaceError::invalid("The selected Compendium source is unavailable."))?;
            Ok(context_item(
                format!("{}\n{}", entry.title, entry.statement),
                AiWorkspaceSourceTrace {
                    source_type: AiWorkspaceSourceType::Compendium,
                    source_id: entry.id.clone(),
                    label: format!("Compendium: {}", entry.title),
                    authority: AiWorkspaceAuthority::EstablishedKnowledge,
                    navigation_target: Some(format!("compendium:{}", entry.id)),
                },
                *priority,
            ))
        }
        AiWorkspaceContextSourceRequest::Decision { source_id, priority } => {
            let decision = decisions.and_then(|document| document.decisions.iter().find(|decision| &decision.id == source_id))
                .filter(|decision| decision.status == DecisionStatus::Approved)
                .ok_or_else(|| AiWorkspaceError::invalid("Only an approved Decision may be selected as authoritative context."))?;
            Ok(context_item(
                format!("{}\n{}\nRationale: {}", decision.title, decision.statement, decision.rationale),
                AiWorkspaceSourceTrace {
                    source_type: AiWorkspaceSourceType::Decision,
                    source_id: decision.id.clone(),
                    label: format!("Decision: {}", decision.title),
                    authority: AiWorkspaceAuthority::AuthoritativeIntent,
                    navigation_target: Some(format!("decision:{}", decision.id)),
                },
                *priority,
            ))
        }
        AiWorkspaceContextSourceRequest::OpenQuestion { source_id, priority } => {
            let entry = compendium.and_then(|document| document.entries.iter().find(|entry| &entry.id == source_id))
                .filter(|entry| entry.status != KnowledgeStatus::Deprecated && (entry.area == KnowledgeArea::OpenQuestions || entry.status == KnowledgeStatus::Tbd))
                .ok_or_else(|| AiWorkspaceError::invalid("The selected Open Question is unavailable."))?;
            Ok(context_item(
                format!("{}\n{}", entry.title, entry.statement),
                AiWorkspaceSourceTrace {
                    source_type: AiWorkspaceSourceType::OpenQuestion,
                    source_id: entry.id.clone(),
                    label: format!("Open Question: {}", entry.title),
                    authority: AiWorkspaceAuthority::UnresolvedKnowledge,
                    navigation_target: Some(format!("compendium:{}", entry.id)),
                },
                *priority,
            ))
        }
        AiWorkspaceContextSourceRequest::Document { relative_path, priority } => {
            let (source_id, label, content) = read_markdown_document(root, relative_path)?;
            Ok(context_item(
                content,
                AiWorkspaceSourceTrace {
                    source_type: AiWorkspaceSourceType::Document,
                    source_id,
                    label: format!("Document: {label}"),
                    authority: AiWorkspaceAuthority::Documented,
                    navigation_target: None,
                },
                *priority,
            ))
        }
        AiWorkspaceContextSourceRequest::AiWorkspaceMessage { session_id, message_id, priority } => {
            let session = sessions.and_then(|document| document.sessions.iter().find(|session| &session.id == session_id))
                .ok_or_else(|| AiWorkspaceError::invalid("The selected prior AI Workspace session is unavailable."))?;
            let message = session.messages.iter().find(|message| &message.id == message_id && message.role == AiWorkspaceMessageRole::Assistant)
                .ok_or_else(|| AiWorkspaceError::invalid("The selected prior assistant message is unavailable."))?;
            Ok(context_item(
                message.content.clone(),
                AiWorkspaceSourceTrace {
                    source_type: AiWorkspaceSourceType::AiWorkspaceMessage,
                    source_id: message.id.clone(),
                    label: format!("AI discussion: {}", session.title),
                    authority: AiWorkspaceAuthority::AiGenerated,
                    navigation_target: Some(format!("ai-workspace:{}:{}", session.id, message.id)),
                },
                *priority,
            ))
        }
    }
}

fn context_item(content: String, trace: AiWorkspaceSourceTrace, priority: AiWorkspaceSelectionPriority) -> AiWorkspaceContextItem {
    AiWorkspaceContextItem { content, trace, priority }
}

fn read_markdown_document(root: &Path, relative_path: &str) -> Result<(String, String, String), AiWorkspaceError> {
    let requested = Path::new(relative_path);
    if requested.is_absolute()
        || requested.components().any(|component| !matches!(component, Component::Normal(_)))
        || requested.components().next().is_some_and(|component| component.as_os_str() == ".forgemind")
        || !matches!(requested.extension().and_then(|value| value.to_str()).map(str::to_ascii_lowercase).as_deref(), Some("md") | Some("markdown"))
    {
        return Err(AiWorkspaceError::invalid("Document context requires an explicit project-relative Markdown path."));
    }
    let canonical_root = root.canonicalize().map_err(|_| AiWorkspaceError::invalid("The selected workspace is unavailable."))?;
    let candidate = root.join(requested).canonicalize().map_err(|_| AiWorkspaceError::invalid("The selected Markdown document is unavailable."))?;
    if !candidate.starts_with(&canonical_root) || !candidate.is_file() {
        return Err(AiWorkspaceError::invalid("The selected Markdown document is outside the active project."));
    }
    let raw = fs::read_to_string(&candidate).map_err(|_| AiWorkspaceError::invalid("ForgeMind could not read the selected Markdown document."))?;
    if contains_secret_marker(&raw) {
        return Err(AiWorkspaceError::invalid("The selected Markdown document contains a credential-like marker and was excluded."));
    }
    let content: String = raw.chars().take(MAX_DOCUMENT_CHARS).collect();
    let source_id = requested.to_string_lossy().replace('\\', "/");
    let label = requested.file_name().and_then(|value| value.to_str()).unwrap_or(&source_id).to_owned();
    Ok((source_id, label, content))
}

fn context_authority_rank(authority: AiWorkspaceAuthority) -> u8 {
    match authority {
        AiWorkspaceAuthority::AuthoritativeIntent => 0,
        AiWorkspaceAuthority::EstablishedKnowledge => 1,
        AiWorkspaceAuthority::UnresolvedKnowledge => 2,
        AiWorkspaceAuthority::Documented => 3,
        AiWorkspaceAuthority::RealityEvidence => 4,
        AiWorkspaceAuthority::AiGenerated => 5,
    }
}

fn save(root: &Path, mut document: AiWorkspaceDocument) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    document.updated_at = timestamp();
    validate_document(&document, &document.project_id)?;
    let mut contents = serde_json::to_vec_pretty(&document).map_err(|_| write_error())?;
    contents.push(b'\n');
    let mut file = fs::File::create(document_path(root)).map_err(|_| write_error())?;
    file.write_all(&contents).map_err(|_| write_error())?;
    Ok(document)
}

fn load_for_project(root: &Path, project_id: &str) -> Result<Option<AiWorkspaceDocument>, AiWorkspaceError> {
    let contents = match fs::read_to_string(document_path(root)) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(AiWorkspaceError::new("AI_WORKSPACE_READ_FAILED", "ForgeMind could not read AI Workspace history.")),
    };
    let document: AiWorkspaceDocument = serde_json::from_str(&contents).map_err(|_| invalid_file())?;
    validate_document(&document, project_id)?;
    Ok(Some(document))
}

fn required_document(root: &Path, project_id: &str) -> Result<AiWorkspaceDocument, AiWorkspaceError> {
    load_for_project(root, project_id)?.ok_or_else(|| AiWorkspaceError::invalid("AI Workspace history does not exist for this project."))
}

fn active_session_mut<'a>(document: &'a mut AiWorkspaceDocument, session_id: &str) -> Result<&'a mut AiWorkspaceSession, AiWorkspaceError> {
    let session = document.sessions.iter_mut().find(|session| session.id == session_id)
        .ok_or_else(|| AiWorkspaceError::invalid("The selected AI Workspace session does not exist."))?;
    if session.status != AiWorkspaceSessionStatus::Active {
        return Err(AiWorkspaceError::invalid("Archived AI Workspace sessions are read-only."));
    }
    Ok(session)
}

fn validate_document(document: &AiWorkspaceDocument, expected_project_id: &str) -> Result<(), AiWorkspaceError> {
    let mut session_ids = HashSet::new();
    if document.format_version != FORMAT_VERSION
        || document.project_id != expected_project_id
        || DateTime::parse_from_rfc3339(&document.updated_at).is_err()
        || document.sessions.len() > MAX_SESSIONS
        || document.sessions.iter().any(|session| {
            session.project_id != expected_project_id
                || Uuid::parse_str(&session.id).is_err()
                || !session_ids.insert(session.id.as_str())
                || !valid_safe_stored_content(&session.surface, 1, 80)
                || !valid_safe_stored_content(&session.purpose, 1, 500)
                || !profiles().iter().any(|profile| profile.id == session.specialist_profile_id)
                || !valid_safe_stored_content(&session.title, 1, 160)
                || DateTime::parse_from_rfc3339(&session.created_at).is_err()
                || DateTime::parse_from_rfc3339(&session.updated_at).is_err()
                || session.messages.len() > MAX_MESSAGES
                || session.proposals.len() > MAX_PROPOSALS
                || validate_trace(&session.source_trace).is_err()
                || !valid_messages(&session.messages)
                || !valid_proposals(&session.proposals)
        })
    {
        return Err(invalid_file());
    }
    Ok(())
}

fn valid_messages(messages: &[AiWorkspaceMessage]) -> bool {
    let mut ids = HashSet::new();
    messages.iter().all(|message| {
        Uuid::parse_str(&message.id).is_ok()
            && ids.insert(message.id.as_str())
            && valid_safe_stored_content(&message.content, 1, MAX_MESSAGE_CHARS)
            && DateTime::parse_from_rfc3339(&message.created_at).is_ok()
            && validate_trace(&message.source_trace).is_ok()
            && message.usage_reference.as_ref().map_or(true, |reference| validate_usage_reference(reference).is_ok())
    })
}

fn valid_proposals(proposals: &[AiWorkspaceProposal]) -> bool {
    let mut ids = HashSet::new();
    proposals.iter().all(|proposal| {
        Uuid::parse_str(&proposal.id).is_ok()
            && ids.insert(proposal.id.as_str())
            && valid_safe_stored_content(&proposal.title, 1, 160)
            && valid_safe_stored_content(&proposal.summary, 1, 4_000)
            && DateTime::parse_from_rfc3339(&proposal.created_at).is_ok()
            && DateTime::parse_from_rfc3339(&proposal.updated_at).is_ok()
            && validate_trace(&proposal.source_trace).is_ok()
            && proposal.proposed_edit.as_ref().map_or(true, |edit| validate_proposed_edit(edit).is_ok())
            && (proposal.proposal_type != AiWorkspaceProposalType::UpdateKnowledge || proposal.proposed_edit.is_some())
    })
}

fn validate_proposed_edit(edit: &AiWorkspaceProposedEdit) -> Result<(), AiWorkspaceError> {
    validate_trace(std::slice::from_ref(&edit.target))?;
    validate_safe_content(&edit.current_value, 1, 12_000, "Current value")?;
    validate_safe_content(&edit.proposed_value, 1, 12_000, "Proposed value")?;
    validate_safe_content(&edit.reason, 1, 2_000, "Proposal reason")?;
    if edit.current_value.trim() == edit.proposed_value.trim() {
        return Err(AiWorkspaceError::invalid("A proposed edit must differ from the current value."));
    }
    if edit.affected_references.len() > 20 {
        return Err(AiWorkspaceError::invalid("A proposed edit may reference at most 20 affected sources."));
    }
    validate_trace(&edit.affected_references)
}

fn validate_trace(trace: &[AiWorkspaceSourceTrace]) -> Result<(), AiWorkspaceError> {
    if trace.len() > MAX_CONTEXT_SOURCES {
        return Err(AiWorkspaceError::invalid("Source trace exceeds the bounded source limit."));
    }
    let mut unique = HashSet::new();
    for source in trace {
        validate_text(&source.source_id, 1, 500, "Source ID")?;
        validate_text(&source.label, 1, 300, "Source label")?;
        if contains_secret_marker(&source.source_id)
            || contains_absolute_path(&source.source_id)
            || contains_secret_marker(&source.label)
            || contains_absolute_path(&source.label)
            || source.navigation_target.as_ref().is_some_and(|value| {
                !valid_stored_text(value, 1, 600)
                    || contains_secret_marker(value)
                    || contains_absolute_path(value)
            })
        {
            return Err(AiWorkspaceError::invalid("Source trace contains unsafe or invalid metadata."));
        }
        if !unique.insert((source.source_type, source.source_id.as_str())) {
            return Err(AiWorkspaceError::invalid("Source trace contains a duplicate source."));
        }
        let authority_is_valid = matches!(
            (source.source_type, source.authority),
            (AiWorkspaceSourceType::Decision, AiWorkspaceAuthority::AuthoritativeIntent)
                | (AiWorkspaceSourceType::Compendium, AiWorkspaceAuthority::EstablishedKnowledge)
                | (AiWorkspaceSourceType::OpenQuestion, AiWorkspaceAuthority::UnresolvedKnowledge)
                | (AiWorkspaceSourceType::Document, AiWorkspaceAuthority::Documented)
                | (AiWorkspaceSourceType::Reality, AiWorkspaceAuthority::RealityEvidence)
                | (AiWorkspaceSourceType::AiWorkspaceMessage, AiWorkspaceAuthority::AiGenerated)
        );
        if !authority_is_valid {
            return Err(AiWorkspaceError::invalid("Source trace authority does not match its source type."));
        }
    }
    Ok(())
}

fn validate_usage_reference(reference: &AiWorkspaceUsageReference) -> Result<(), AiWorkspaceError> {
    if Uuid::parse_str(&reference.application_session_id).is_err()
        || DateTime::parse_from_rfc3339(&reference.usage_timestamp).is_err()
        || !valid_stored_text(&reference.profile_id, 1, 120)
    {
        return Err(AiWorkspaceError::invalid("Usage reference is invalid."));
    }
    Ok(())
}

fn merge_trace(existing: &mut Vec<AiWorkspaceSourceTrace>, incoming: Vec<AiWorkspaceSourceTrace>) {
    for source in incoming {
        if !existing.iter().any(|item| item.source_type == source.source_type && item.source_id == source.source_id) {
            existing.push(source);
        }
    }
}

fn validate_text(value: &str, minimum: usize, maximum: usize, label: &str) -> Result<(), AiWorkspaceError> {
    if !valid_stored_text(value, minimum, maximum) {
        return Err(AiWorkspaceError::invalid(&format!("{label} must contain {minimum} to {maximum} characters.")));
    }
    Ok(())
}

fn validate_safe_content(value: &str, minimum: usize, maximum: usize, label: &str) -> Result<(), AiWorkspaceError> {
    validate_text(value, minimum, maximum, label)?;
    if contains_secret_marker(value) || contains_absolute_path(value) {
        return Err(AiWorkspaceError::invalid(&format!("{label} contains a credential-like or machine-specific path marker and cannot be stored.")));
    }
    Ok(())
}

fn valid_stored_text(value: &str, minimum: usize, maximum: usize) -> bool {
    let length = value.trim().chars().count();
    length >= minimum
        && length <= maximum
        && !value.chars().any(|character| {
            character == '\0'
                || (character.is_control() && !matches!(character, '\n' | '\r' | '\t'))
        })
}

fn valid_safe_stored_content(value: &str, minimum: usize, maximum: usize) -> bool {
    valid_stored_text(value, minimum, maximum)
        && !contains_secret_marker(value)
        && !contains_absolute_path(value)
}

fn contains_secret_marker(value: &str) -> bool {
    let normalized = value.to_ascii_lowercase();
    ["nebius_api_key=", "api_key=", "authorization: bearer ", "\"apikey\":"].iter().any(|marker| normalized.contains(marker))
}

fn contains_absolute_path(value: &str) -> bool {
    value.split_whitespace().any(|token| {
        let token = token.trim_matches(|character: char| {
            matches!(character, ',' | '.' | ':' | ';' | '(' | ')' | '[' | ']' | '`' | '"' | '\'')
        });
        Path::new(token).is_absolute() || token.starts_with("\\\\")
    })
}

fn verify_project(root: &Path, expected_project_id: &str) -> Result<(), AiWorkspaceError> {
    if workspace_project_id(root)? != expected_project_id {
        return Err(AiWorkspaceError::new("PROJECT_ID_MISMATCH", "AI Workspace data does not belong to the selected project."));
    }
    Ok(())
}

fn workspace_project_id(root: &Path) -> Result<String, AiWorkspaceError> {
    match workspace::inspect(root).map_err(|_| AiWorkspaceError::new("WORKSPACE_ACCESS_FAILED", "ForgeMind could not access the selected workspace."))? {
        WorkspaceInspection::Valid { project, .. } => Ok(project.project_id),
        _ => Err(AiWorkspaceError::new("INVALID_WORKSPACE", "AI Workspace requires a valid ForgeMind workspace.")),
    }
}

fn empty_document(project_id: &str) -> AiWorkspaceDocument {
    AiWorkspaceDocument { format_version: FORMAT_VERSION, project_id: project_id.to_owned(), updated_at: timestamp(), sessions: Vec::new() }
}

fn invalid_file() -> AiWorkspaceError {
    AiWorkspaceError::new("INVALID_AI_WORKSPACE_HISTORY", "The existing AI Workspace history is invalid and was not changed.")
}

fn write_error() -> AiWorkspaceError {
    AiWorkspaceError::new("AI_WORKSPACE_WRITE_FAILED", "ForgeMind could not save AI Workspace history.")
}

fn document_path(root: &Path) -> PathBuf { root.join(".forgemind").join(FILE_NAME) }
fn timestamp() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true) }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::compendium::{CreateKnowledgeEntryRequest, KnowledgeArea, KnowledgeStatus};
    use crate::decisions::{CreateDecisionRequest, DecisionActionRequest};
    use tempfile::TempDir;

    fn workspace() -> (TempDir, String) {
        let directory = TempDir::new().unwrap();
        let WorkspaceInspection::Valid { project, .. } = workspace::initialize(directory.path()).unwrap() else { panic!("valid workspace") };
        (directory, project.project_id)
    }

    fn create_request(root: &Path, project_id: &str) -> CreateAiWorkspaceSessionRequest {
        CreateAiWorkspaceSessionRequest {
            root_path: root.display().to_string(),
            project_id: project_id.to_owned(),
            surface: "shared_ai_workspace".to_owned(),
            purpose: "Explore a bounded project-aware question.".to_owned(),
            specialist_profile_id: "lore_architect".to_owned(),
            title: "Faction exploration".to_owned(),
        }
    }

    fn trace(source_type: AiWorkspaceSourceType, authority: AiWorkspaceAuthority) -> AiWorkspaceSourceTrace {
        AiWorkspaceSourceTrace {
            source_type,
            source_id: Uuid::new_v4().to_string(),
            label: "Source label".to_owned(),
            authority,
            navigation_target: None,
        }
    }

    #[test]
    fn creates_session_appends_turns_and_archives_without_authority_promotion() {
        let (directory, project_id) = workspace();
        let created = create_session(create_request(directory.path(), &project_id)).unwrap();
        let session_id = created.sessions[0].id.clone();
        let user = append_message(AppendAiWorkspaceMessageRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), session_id: session_id.clone(),
            role: AiWorkspaceMessageRole::User, content: "Help me develop this faction.".to_owned(), source_trace: Vec::new(), usage_reference: None,
        }).unwrap();
        assert_eq!(user.sessions[0].messages.len(), 1);
        let assistant = append_message(AppendAiWorkspaceMessageRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), session_id: session_id.clone(),
            role: AiWorkspaceMessageRole::Assistant, content: "Which values should distinguish them?".to_owned(), source_trace: Vec::new(), usage_reference: None,
        }).unwrap();
        assert_eq!(assistant.sessions[0].messages[1].role, AiWorkspaceMessageRole::Assistant);
        let archived = archive_session(AiWorkspaceSessionActionRequest {
            root_path: directory.path().display().to_string(), project_id, session_id,
        }).unwrap();
        assert_eq!(archived.sessions[0].status, AiWorkspaceSessionStatus::Archived);
        assert!(!directory.path().join(".forgemind/compendium.json").exists());
        assert!(!directory.path().join(".forgemind/decisions.json").exists());
    }

    #[test]
    fn project_isolation_rejects_cross_project_session_access() {
        let (first, first_id) = workspace();
        let (second, second_id) = workspace();
        let created = create_session(create_request(first.path(), &first_id)).unwrap();
        let error = append_message(AppendAiWorkspaceMessageRequest {
            root_path: second.path().display().to_string(), project_id: first_id, session_id: created.sessions[0].id.clone(),
            role: AiWorkspaceMessageRole::User, content: "Cross project".to_owned(), source_trace: Vec::new(), usage_reference: None,
        }).unwrap_err();
        assert_eq!(error.code, "PROJECT_ID_MISMATCH");
        assert_eq!(load(second.path()).unwrap().map(|document| document.project_id), None);
        assert_ne!(second_id, created.project_id);
    }

    #[test]
    fn malformed_history_requires_explicit_safe_recovery() {
        let (directory, project_id) = workspace();
        fs::write(document_path(directory.path()), "{malformed").unwrap();
        assert_eq!(load(directory.path()).unwrap_err().code, "INVALID_AI_WORKSPACE_HISTORY");
        let recovery = archive_and_reset(directory.path()).unwrap();
        assert_eq!(recovery.document.project_id, project_id);
        assert!(recovery.document.sessions.is_empty());
        assert!(recovery.archived_file_name.as_ref().is_some_and(|name| name.starts_with("ai-workspace-sessions.invalid-")));
    }

    #[test]
    fn context_is_explicit_deterministic_and_preserves_authority_and_labels() {
        let (directory, project_id) = workspace();
        let knowledge = compendium::create_entry(CreateKnowledgeEntryRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), area: KnowledgeArea::WorldNarrative,
            title: "Black Tide".to_owned(), statement: "A disputed coastal faction.".to_owned(), status: KnowledgeStatus::Direction,
        }).unwrap().entries[0].clone();
        let question = compendium::create_entry(CreateKnowledgeEntryRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), area: KnowledgeArea::OpenQuestions,
            title: "Faction loyalty".to_owned(), statement: "What keeps members loyal?".to_owned(), status: KnowledgeStatus::Tbd,
        }).unwrap().entries[1].clone();
        let decision = decisions::create(CreateDecisionRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), title: "No hereditary rulers".to_owned(),
            statement: "Leadership is elected.".to_owned(), rationale: "Preserve political tension.".to_owned(), area: KnowledgeArea::WorldNarrative,
            author: "Tester".to_owned(), supersedes_decision_id: None, related_knowledge_entry_ids: Vec::new(),
        }).unwrap().decisions[0].clone();
        decisions::approve(DecisionActionRequest { root_path: directory.path().display().to_string(), project_id: project_id.clone(), decision_id: decision.id.clone() }).unwrap();
        fs::write(directory.path().join("FACTIONS.md"), "# Factions\n\nDocumented notes only.").unwrap();

        let plan = build_context(BuildAiWorkspaceContextRequest {
            root_path: directory.path().display().to_string(), project_id,
            sources: vec![
                AiWorkspaceContextSourceRequest::Document { relative_path: "FACTIONS.md".to_owned(), priority: AiWorkspaceSelectionPriority::Supporting },
                AiWorkspaceContextSourceRequest::Compendium { source_id: knowledge.id, priority: AiWorkspaceSelectionPriority::Supporting },
                AiWorkspaceContextSourceRequest::OpenQuestion { source_id: question.id, priority: AiWorkspaceSelectionPriority::Supporting },
                AiWorkspaceContextSourceRequest::Decision { source_id: decision.id, priority: AiWorkspaceSelectionPriority::Supporting },
            ],
        }).unwrap();
        assert_eq!(plan.items.iter().map(|item| item.trace.source_type).collect::<Vec<_>>(), vec![
            AiWorkspaceSourceType::Decision, AiWorkspaceSourceType::Compendium, AiWorkspaceSourceType::OpenQuestion, AiWorkspaceSourceType::Document,
        ]);
        assert_eq!(plan.items[0].trace.label, "Decision: No hereditary rulers");
        assert_eq!(plan.items[3].trace.authority, AiWorkspaceAuthority::Documented);
        assert_eq!(plan.source_trace, plan.items.iter().map(|item| item.trace.clone()).collect::<Vec<_>>());
    }

    #[test]
    fn explicit_sources_precede_supporting_sources_and_prior_ai_stays_non_authoritative() {
        let (directory, project_id) = workspace();
        let created = create_session(create_request(directory.path(), &project_id)).unwrap();
        let session_id = created.sessions[0].id.clone();
        let updated = append_message(AppendAiWorkspaceMessageRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), session_id: session_id.clone(),
            role: AiWorkspaceMessageRole::Assistant, content: "Exploratory idea only.".to_owned(), source_trace: Vec::new(), usage_reference: None,
        }).unwrap();
        let message_id = updated.sessions[0].messages[0].id.clone();
        fs::write(directory.path().join("NOTES.md"), "# Notes\nDocumented context.").unwrap();
        let plan = build_context(BuildAiWorkspaceContextRequest {
            root_path: directory.path().display().to_string(), project_id,
            sources: vec![
                AiWorkspaceContextSourceRequest::Document { relative_path: "NOTES.md".to_owned(), priority: AiWorkspaceSelectionPriority::Supporting },
                AiWorkspaceContextSourceRequest::AiWorkspaceMessage { session_id, message_id, priority: AiWorkspaceSelectionPriority::Explicit },
            ],
        }).unwrap();
        assert_eq!(plan.items[0].trace.source_type, AiWorkspaceSourceType::AiWorkspaceMessage);
        assert_eq!(plan.items[0].trace.authority, AiWorkspaceAuthority::AiGenerated);
        assert_eq!(plan.items[1].trace.authority, AiWorkspaceAuthority::Documented);
    }

    #[test]
    fn markdown_selection_is_bounded_and_cannot_escape_or_include_credentials() {
        let (directory, project_id) = workspace();
        let outside_name = format!("outside-{}.md", Uuid::new_v4());
        let outside = directory.path().parent().unwrap().join(&outside_name);
        fs::write(&outside, "outside").unwrap();
        let escaping = build_context(BuildAiWorkspaceContextRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(),
            sources: vec![AiWorkspaceContextSourceRequest::Document { relative_path: format!("../{outside_name}"), priority: AiWorkspaceSelectionPriority::Explicit }],
        }).unwrap_err();
        assert_eq!(escaping.code, "INVALID_AI_WORKSPACE_REQUEST");
        fs::write(directory.path().join("secret.md"), "NEBIUS_API_KEY=synthetic-placeholder").unwrap();
        assert!(build_context(BuildAiWorkspaceContextRequest {
            root_path: directory.path().display().to_string(), project_id,
            sources: vec![AiWorkspaceContextSourceRequest::Document { relative_path: "secret.md".to_owned(), priority: AiWorkspaceSelectionPriority::Explicit }],
        }).is_err());
        let _ = fs::remove_file(outside);
    }

    #[test]
    fn proposal_lifecycle_is_review_only_and_edit_keeps_current_and_proposed_values() {
        let (directory, project_id) = workspace();
        let created = create_session(create_request(directory.path(), &project_id)).unwrap();
        let session_id = created.sessions[0].id.clone();
        let target = trace(AiWorkspaceSourceType::Compendium, AiWorkspaceAuthority::EstablishedKnowledge);
        let proposed = create_proposal(CreateAiWorkspaceProposalRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), session_id: session_id.clone(),
            proposal_type: AiWorkspaceProposalType::UpdateKnowledge, title: "Update faction tone".to_owned(), summary: "Make the faction less militaristic.".to_owned(),
            source_trace: vec![target.clone()], proposed_edit: Some(AiWorkspaceProposedEdit {
                target, current_value: "A disciplined militia.".to_owned(), proposed_value: "A loose civic coalition.".to_owned(),
                reason: "Match the requested tone.".to_owned(), affected_references: Vec::new(),
            }),
        }).unwrap();
        let proposal_id = proposed.sessions[0].proposals[0].id.clone();
        assert_eq!(proposed.sessions[0].proposals[0].status, AiWorkspaceProposalStatus::Pending);
        let accepted = review_proposal(ReviewAiWorkspaceProposalRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), session_id: session_id.clone(), proposal_id: proposal_id.clone(), status: AiWorkspaceProposalStatus::Accepted,
        }).unwrap();
        assert_eq!(accepted.sessions[0].proposals[0].status, AiWorkspaceProposalStatus::Accepted);
        assert!(!directory.path().join(".forgemind/compendium.json").exists());
        let applied = review_proposal(ReviewAiWorkspaceProposalRequest {
            root_path: directory.path().display().to_string(), project_id, session_id, proposal_id, status: AiWorkspaceProposalStatus::Applied,
        }).unwrap();
        assert_eq!(applied.sessions[0].proposals[0].status, AiWorkspaceProposalStatus::Applied);
        let edit = applied.sessions[0].proposals[0].proposed_edit.as_ref().unwrap();
        assert_eq!(edit.current_value, "A disciplined militia.");
        assert_eq!(edit.proposed_value, "A loose civic coalition.");
    }

    #[test]
    fn rejected_proposal_cannot_be_applied_and_no_truth_store_is_changed() {
        let (directory, project_id) = workspace();
        let created = create_session(create_request(directory.path(), &project_id)).unwrap();
        let session_id = created.sessions[0].id.clone();
        let proposed = create_proposal(CreateAiWorkspaceProposalRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), session_id: session_id.clone(),
            proposal_type: AiWorkspaceProposalType::CreateDecision, title: "Potential decision".to_owned(), summary: "Proposal only.".to_owned(),
            source_trace: Vec::new(), proposed_edit: None,
        }).unwrap();
        let proposal_id = proposed.sessions[0].proposals[0].id.clone();
        review_proposal(ReviewAiWorkspaceProposalRequest {
            root_path: directory.path().display().to_string(), project_id: project_id.clone(), session_id: session_id.clone(), proposal_id: proposal_id.clone(), status: AiWorkspaceProposalStatus::Rejected,
        }).unwrap();
        assert!(review_proposal(ReviewAiWorkspaceProposalRequest {
            root_path: directory.path().display().to_string(), project_id, session_id, proposal_id, status: AiWorkspaceProposalStatus::Applied,
        }).is_err());
        assert!(!directory.path().join(".forgemind/decisions.json").exists());
    }

    #[test]
    fn credential_like_content_is_not_persisted_and_schema_has_no_secret_fields() {
        let (directory, project_id) = workspace();
        let created = create_session(create_request(directory.path(), &project_id)).unwrap();
        let error = append_message(AppendAiWorkspaceMessageRequest {
            root_path: directory.path().display().to_string(), project_id, session_id: created.sessions[0].id.clone(),
            role: AiWorkspaceMessageRole::User, content: "authorization: bearer synthetic-secret".to_owned(), source_trace: Vec::new(), usage_reference: None,
        }).unwrap_err();
        assert_eq!(error.code, "INVALID_AI_WORKSPACE_REQUEST");
        assert!(append_message(AppendAiWorkspaceMessageRequest {
            root_path: directory.path().display().to_string(), project_id: created.project_id.clone(), session_id: created.sessions[0].id.clone(),
            role: AiWorkspaceMessageRole::User, content: "Inspect D:\\private\\notes.md".to_owned(), source_trace: Vec::new(), usage_reference: None,
        }).is_err());
        let serialized = fs::read_to_string(document_path(directory.path())).unwrap();
        assert!(!serialized.to_ascii_lowercase().contains("authorization"));
        assert!(!serialized.contains("apiKey"));
        assert!(!serialized.contains(&directory.path().display().to_string()));
    }
}
