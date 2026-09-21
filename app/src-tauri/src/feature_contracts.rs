use crate::alignment::{
    self, AlignmentProvenance, AlignmentReviewState, AlignmentStatus, IntentSourceType,
    RealitySource,
};
use crate::ai::{AIError, AIRequest};
use crate::compendium::{self, KnowledgeArea, KnowledgeStatus};
use crate::decisions::{self, DecisionStatus};
use crate::model_registry;
use crate::workspace::{self, WorkspaceInspection};
use chrono::{DateTime, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;

const FEATURE_CONTRACTS_FORMAT_VERSION: u32 = 1;
const FEATURE_CONTRACTS_FILE: &str = "feature-contracts.json";
const FEATURE_CONTRACT_DRAFT_MAX_COMPLETION_TOKENS: u32 = 3_200;

const FEATURE_CONTRACT_DRAFT_SYSTEM_PROMPT: &str = r#"You are ForgeMind's Feature Contract drafting assistant.
Use only the supplied captured Intent, approved Alignment details, captured Reality evidence, and current human draft. Source facts are authoritative inputs; your output is a non-authoritative proposal for human review.
Never invent project facts, file names, file paths, components, systems, tests, or runtime behavior. Do not include any file path in the proposal. When Reality does not identify implementation locations, keep affected scope at the system or component-concept level. Preserve uncertainty and do not claim that component presence proves runtime behavior.
Return exactly one concise JSON object with these exact fields:
{"goal":"","affectedSystems":[],"requiredBehavior":[],"outOfScope":[],"risks":[],"acceptanceCriteria":[],"deterministicTests":[],"implementationNotes":""}
Return JSON only, without markdown, code fences, commentary, source citations, hidden reasoning, or additional fields. Arrays contain concise strings only. Suggestions may refine existing human text, but the user decides whether to apply each section."#;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FeatureContractSourceType {
    Alignment,
    Compendium,
    Decision,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FeatureContractStatus {
    Draft,
    Approved,
    Superseded,
    Deprecated,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FeatureContractReviewState {
    PendingReview,
    Approved,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureContractSourceOption {
    pub source_type: FeatureContractSourceType,
    pub source_id: String,
    pub title: String,
    pub statement: String,
    pub status: String,
    pub area: KnowledgeArea,
    pub provenance: AlignmentProvenance,
    pub preferred: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alignment_rationale: Option<String>,
    pub reality_evidence: Vec<FeatureContractEvidenceReference>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureContractSourceCatalog {
    pub project_id: String,
    pub sources: Vec<FeatureContractSourceOption>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FeatureContractSourceReference {
    pub source_type: FeatureContractSourceType,
    pub source_id: String,
    pub title: String,
    pub statement: String,
    pub status: String,
    pub area: KnowledgeArea,
    pub provenance: AlignmentProvenance,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FeatureContractAlignmentReference {
    pub alignment_id: String,
    pub status: AlignmentStatus,
    pub rationale: String,
    pub created_at: String,
    pub review_state: AlignmentReviewState,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FeatureContractEvidenceReference {
    pub evidence_id: String,
    pub source: RealitySource,
    pub summary: String,
    pub captured_at: String,
    pub provenance: AlignmentProvenance,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FeatureContractTrace {
    pub origin: FeatureContractSourceReference,
    pub intent: FeatureContractSourceReference,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub alignment: Option<FeatureContractAlignmentReference>,
    pub reality_evidence: Vec<FeatureContractEvidenceReference>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FeatureContract {
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
    pub title: String,
    pub sources: FeatureContractTrace,
    pub goal: String,
    pub current_reality_summary: String,
    pub affected_systems: Vec<String>,
    pub required_behavior: Vec<String>,
    pub out_of_scope: Vec<String>,
    pub risks: Vec<String>,
    pub acceptance_criteria: Vec<String>,
    pub deterministic_tests: Vec<String>,
    pub implementation_notes: String,
    pub likely_affected_evidence_ids: Vec<String>,
    pub status: FeatureContractStatus,
    pub review_state: FeatureContractReviewState,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reviewed_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FeatureContractsDocument {
    pub format_version: u32,
    pub project_id: String,
    pub updated_at: String,
    pub contracts: Vec<FeatureContract>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateFeatureContractRequest {
    pub root_path: String,
    pub project_id: String,
    pub source_type: FeatureContractSourceType,
    pub source_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateFeatureContractRequest {
    pub root_path: String,
    pub project_id: String,
    pub contract_id: String,
    pub title: String,
    pub goal: String,
    pub affected_systems: Vec<String>,
    pub required_behavior: Vec<String>,
    pub out_of_scope: Vec<String>,
    pub risks: Vec<String>,
    pub acceptance_criteria: Vec<String>,
    pub deterministic_tests: Vec<String>,
    pub implementation_notes: String,
    pub likely_affected_evidence_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeleteFeatureContractRequest {
    pub root_path: String,
    pub project_id: String,
    pub contract_id: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FeatureContractDraftInput {
    pub title: String,
    pub goal: String,
    pub affected_systems: Vec<String>,
    pub required_behavior: Vec<String>,
    pub out_of_scope: Vec<String>,
    pub risks: Vec<String>,
    pub acceptance_criteria: Vec<String>,
    pub deterministic_tests: Vec<String>,
    pub implementation_notes: String,
    pub likely_affected_evidence_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DraftFeatureContractWithAiRequest {
    pub root_path: String,
    pub project_id: String,
    pub contract_id: String,
    pub model_id: String,
    pub draft: FeatureContractDraftInput,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FeatureContractDraftProposal {
    pub goal: String,
    pub affected_systems: Vec<String>,
    pub required_behavior: Vec<String>,
    pub out_of_scope: Vec<String>,
    pub risks: Vec<String>,
    pub acceptance_criteria: Vec<String>,
    pub deterministic_tests: Vec<String>,
    pub implementation_notes: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureContractAiDraftResult {
    pub proposal: FeatureContractDraftProposal,
    pub model: String,
    pub latency_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<u64>,
}

#[derive(Clone, Debug)]
pub struct PreparedFeatureContractDraft {
    pub ai_request: AIRequest,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SetFeatureContractStatusRequest {
    pub root_path: String,
    pub project_id: String,
    pub contract_id: String,
    pub status: FeatureContractStatus,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureContractError {
    pub code: String,
    pub message: String,
}

impl FeatureContractError {
    fn new(code: &str, message: &str) -> Self {
        Self { code: code.to_owned(), message: message.to_owned() }
    }

    fn invalid_file() -> Self {
        Self::new(
            "INVALID_FEATURE_CONTRACTS_FILE",
            "The existing ForgeMind Feature Contracts file is invalid and was not changed.",
        )
    }

    pub fn from_ai_error(error: AIError) -> Self {
        Self::new(&error.code, &error.message)
    }
}

pub fn sources(root: &Path) -> Result<FeatureContractSourceCatalog, FeatureContractError> {
    let project_id = workspace_project_id(root)?;
    let mut sources = Vec::new();

    if let Some(document) = alignment::load(root).map_err(map_alignment_error)? {
        sources.extend(
            document
                .results
                .into_iter()
                .filter(|result| result.review_state == AlignmentReviewState::Approved)
                .map(|result| FeatureContractSourceOption {
                    source_type: FeatureContractSourceType::Alignment,
                    source_id: result.id,
                    title: result.intent.title,
                    statement: result.intent.statement,
                    status: alignment_status(result.status).to_owned(),
                    area: result.intent.area,
                    provenance: AlignmentProvenance::ManualAssessment,
                    preferred: true,
                    alignment_rationale: Some(result.rationale),
                    reality_evidence: result
                        .evidence
                        .into_iter()
                        .map(|evidence| FeatureContractEvidenceReference {
                            evidence_id: evidence.evidence_id,
                            source: evidence.source,
                            summary: evidence.summary,
                            captured_at: evidence.captured_at,
                            provenance: evidence.provenance,
                        })
                        .collect(),
                }),
        );
    }

    if let Some(document) = compendium::load(root).map_err(map_compendium_error)? {
        sources.extend(
            document
                .entries
                .into_iter()
                .filter(|entry| entry.status != KnowledgeStatus::Deprecated)
                .map(|entry| FeatureContractSourceOption {
                    source_type: FeatureContractSourceType::Compendium,
                    source_id: entry.id,
                    title: entry.title,
                    statement: entry.statement,
                    status: knowledge_status(entry.status).to_owned(),
                    area: entry.area,
                    provenance: AlignmentProvenance::Documented,
                    preferred: false,
                    alignment_rationale: None,
                    reality_evidence: Vec::new(),
                }),
        );
    }

    if let Some(document) = decisions::load(root).map_err(map_decision_error)? {
        sources.extend(
            document
                .decisions
                .into_iter()
                .filter(|decision| decision.status == DecisionStatus::Approved)
                .map(|decision| FeatureContractSourceOption {
                    source_type: FeatureContractSourceType::Decision,
                    source_id: decision.id,
                    title: decision.title,
                    statement: decision.statement,
                    status: "APPROVED".to_owned(),
                    area: decision.area,
                    provenance: AlignmentProvenance::ApprovedIntent,
                    preferred: false,
                    alignment_rationale: None,
                    reality_evidence: Vec::new(),
                }),
        );
    }

    sources.sort_by(|left, right| {
        right
            .preferred
            .cmp(&left.preferred)
            .then(left.title.cmp(&right.title))
            .then(left.source_id.cmp(&right.source_id))
    });
    Ok(FeatureContractSourceCatalog { project_id, sources })
}

pub fn load(root: &Path) -> Result<Option<FeatureContractsDocument>, FeatureContractError> {
    let project_id = workspace_project_id(root)?;
    load_for_project(root, &project_id)
}

pub fn create(request: CreateFeatureContractRequest) -> Result<FeatureContractsDocument, FeatureContractError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let source = sources(root)?
        .sources
        .into_iter()
        .find(|source| source.source_type == request.source_type && source.source_id == request.source_id)
        .ok_or_else(|| {
            FeatureContractError::new(
                "INVALID_FEATURE_CONTRACT_SOURCE",
                "Select an approved Alignment Review, current Compendium entry, or approved Decision.",
            )
        })?;
    let trace = resolve_trace(root, &source)?;
    let now = timestamp();
    let contract = FeatureContract {
        id: Uuid::new_v4().to_string(),
        created_at: now.clone(),
        updated_at: now,
        title: source.title,
        goal: source.statement,
        current_reality_summary: reality_summary(&trace),
        sources: trace,
        affected_systems: Vec::new(),
        required_behavior: Vec::new(),
        out_of_scope: Vec::new(),
        risks: Vec::new(),
        acceptance_criteria: Vec::new(),
        deterministic_tests: Vec::new(),
        implementation_notes: String::new(),
        likely_affected_evidence_ids: Vec::new(),
        status: FeatureContractStatus::Draft,
        review_state: FeatureContractReviewState::PendingReview,
        reviewed_at: None,
    };
    let mut document = load_for_project(root, &request.project_id)?
        .unwrap_or_else(|| empty_document(&request.project_id));
    document.contracts.push(contract);
    save(root, document)
}

pub fn update(request: UpdateFeatureContractRequest) -> Result<FeatureContractsDocument, FeatureContractError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    validate_editable_fields(&request)?;
    let mut document = load_for_project(root, &request.project_id)?
        .ok_or_else(|| FeatureContractError::new("FEATURE_CONTRACTS_NOT_FOUND", "No Feature Contracts exist yet."))?;
    let contract = document
        .contracts
        .iter_mut()
        .find(|contract| contract.id == request.contract_id)
        .ok_or_else(|| FeatureContractError::new("FEATURE_CONTRACT_NOT_FOUND", "The selected Feature Contract no longer exists."))?;
    if contract.status != FeatureContractStatus::Draft {
        return Err(FeatureContractError::new(
            "FEATURE_CONTRACT_NOT_EDITABLE",
            "Only DRAFT Feature Contracts can be edited.",
        ));
    }
    validate_likely_affected_evidence(contract, &request.likely_affected_evidence_ids)?;
    contract.title = request.title.trim().to_owned();
    contract.goal = request.goal.trim().to_owned();
    contract.affected_systems = normalize_list(request.affected_systems);
    contract.required_behavior = normalize_list(request.required_behavior);
    contract.out_of_scope = normalize_list(request.out_of_scope);
    contract.risks = normalize_list(request.risks);
    contract.acceptance_criteria = normalize_list(request.acceptance_criteria);
    contract.deterministic_tests = normalize_list(request.deterministic_tests);
    contract.implementation_notes = request.implementation_notes.trim().to_owned();
    contract.likely_affected_evidence_ids = unique_list(request.likely_affected_evidence_ids)?;
    contract.updated_at = timestamp();
    save(root, document)
}

pub fn delete_draft(request: DeleteFeatureContractRequest) -> Result<FeatureContractsDocument, FeatureContractError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let mut document = load_for_project(root, &request.project_id)?
        .ok_or_else(|| FeatureContractError::new("FEATURE_CONTRACTS_NOT_FOUND", "No Feature Contracts exist yet."))?;
    let index = document
        .contracts
        .iter()
        .position(|contract| contract.id == request.contract_id)
        .ok_or_else(|| FeatureContractError::new("FEATURE_CONTRACT_NOT_FOUND", "The selected Feature Contract no longer exists."))?;
    if document.contracts[index].status != FeatureContractStatus::Draft {
        return Err(FeatureContractError::new(
            "FEATURE_CONTRACT_NOT_DELETABLE",
            "Only DRAFT Feature Contracts can be deleted. Use lifecycle actions for approved history.",
        ));
    }
    document.contracts.remove(index);
    save(root, document)
}

pub fn build_ai_draft_request(
    request: &DraftFeatureContractWithAiRequest,
) -> Result<PreparedFeatureContractDraft, FeatureContractError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let model = model_registry::enabled_model(request.model_id.trim())
        .map_err(|error| FeatureContractError::new(error.code, &error.message))?;
    validate_draft_input(&request.draft)?;
    let document = load_for_project(root, &request.project_id)?
        .ok_or_else(|| FeatureContractError::new("FEATURE_CONTRACTS_NOT_FOUND", "No Feature Contracts exist yet."))?;
    let contract = document
        .contracts
        .iter()
        .find(|contract| contract.id == request.contract_id)
        .ok_or_else(|| FeatureContractError::new("FEATURE_CONTRACT_NOT_FOUND", "The selected Feature Contract no longer exists."))?;
    if contract.status != FeatureContractStatus::Draft {
        return Err(FeatureContractError::new(
            "FEATURE_CONTRACT_NOT_EDITABLE",
            "AI drafting is available only for DRAFT Feature Contracts.",
        ));
    }
    validate_likely_affected_evidence(contract, &request.draft.likely_affected_evidence_ids)?;
    let prompt = serde_json::json!({
        "sourceFacts": {
            "intent": contract.sources.intent,
            "approvedAlignment": contract.sources.alignment,
            "capturedRealityEvidence": contract.sources.reality_evidence,
            "currentRealitySummary": contract.current_reality_summary,
        },
        "currentHumanDraft": request.draft,
        "instruction": "Propose only the eight requested contract fields. Do not save, approve, or invent file paths."
    });
    let completion_budget = model
        .capabilities
        .max_completion_tokens
        .map_or(FEATURE_CONTRACT_DRAFT_MAX_COMPLETION_TOKENS, |maximum| {
            FEATURE_CONTRACT_DRAFT_MAX_COMPLETION_TOKENS.min(maximum)
        });
    Ok(PreparedFeatureContractDraft {
        ai_request: AIRequest {
            model: request.model_id.trim().to_owned(),
            system_prompt: Some(FEATURE_CONTRACT_DRAFT_SYSTEM_PROMPT.to_owned()),
            user_prompt: serde_json::to_string(&prompt).map_err(|_| {
                FeatureContractError::new(
                    "INVALID_FEATURE_CONTRACT_AI_REQUEST",
                    "ForgeMind could not prepare the Feature Contract drafting context.",
                )
            })?,
            temperature: Some(0.2),
            max_tokens: Some(completion_budget),
            reasoning_effort: Some("minimal".to_owned()),
        },
    })
}

pub fn normalize_ai_draft(
    text: &str,
    model: String,
    latency_ms: u64,
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    total_tokens: Option<u64>,
) -> Result<FeatureContractAiDraftResult, FeatureContractError> {
    let payload = structured_payload(text).ok_or_else(|| {
        FeatureContractError::new(
            "INVALID_FEATURE_CONTRACT_AI_OUTPUT",
            "The AI response did not contain one complete Feature Contract proposal.",
        )
    })?;
    let proposal: FeatureContractDraftProposal = serde_json::from_str(payload).map_err(|_| {
        FeatureContractError::new(
            "INVALID_FEATURE_CONTRACT_AI_OUTPUT",
            "The AI response did not match the required Feature Contract proposal structure.",
        )
    })?;
    validate_ai_proposal(&proposal)?;
    Ok(FeatureContractAiDraftResult {
        proposal,
        model,
        latency_ms,
        input_tokens,
        output_tokens,
        total_tokens,
    })
}

pub fn set_status(request: SetFeatureContractStatusRequest) -> Result<FeatureContractsDocument, FeatureContractError> {
    let root = Path::new(&request.root_path);
    verify_project(root, &request.project_id)?;
    let mut document = load_for_project(root, &request.project_id)?
        .ok_or_else(|| FeatureContractError::new("FEATURE_CONTRACTS_NOT_FOUND", "No Feature Contracts exist yet."))?;
    let contract = document
        .contracts
        .iter_mut()
        .find(|contract| contract.id == request.contract_id)
        .ok_or_else(|| FeatureContractError::new("FEATURE_CONTRACT_NOT_FOUND", "The selected Feature Contract no longer exists."))?;
    match (contract.status, request.status) {
        (FeatureContractStatus::Draft, FeatureContractStatus::Approved) => {
            validate_ready_for_approval(contract)?;
            contract.status = FeatureContractStatus::Approved;
            contract.review_state = FeatureContractReviewState::Approved;
            contract.reviewed_at = Some(timestamp());
        }
        (FeatureContractStatus::Approved, FeatureContractStatus::Deprecated) => {
            contract.status = FeatureContractStatus::Deprecated;
        }
        (FeatureContractStatus::Approved, FeatureContractStatus::Superseded) => {
            contract.status = FeatureContractStatus::Superseded;
        }
        _ => {
            return Err(FeatureContractError::new(
                "INVALID_FEATURE_CONTRACT_TRANSITION",
                "Feature Contract status can move from DRAFT to APPROVED, or from APPROVED to SUPERSEDED or DEPRECATED.",
            ));
        }
    }
    contract.updated_at = timestamp();
    save(root, document)
}

fn resolve_trace(root: &Path, source: &FeatureContractSourceOption) -> Result<FeatureContractTrace, FeatureContractError> {
    let origin = source_reference(source);
    if source.source_type != FeatureContractSourceType::Alignment {
        return Ok(FeatureContractTrace {
            origin: origin.clone(),
            intent: origin,
            alignment: None,
            reality_evidence: Vec::new(),
        });
    }
    let document = alignment::load(root)
        .map_err(map_alignment_error)?
        .ok_or_else(|| FeatureContractError::new("INVALID_FEATURE_CONTRACT_SOURCE", "The approved Alignment Review is unavailable."))?;
    let result = document
        .results
        .into_iter()
        .find(|result| result.id == source.source_id && result.review_state == AlignmentReviewState::Approved)
        .ok_or_else(|| FeatureContractError::new("INVALID_FEATURE_CONTRACT_SOURCE", "The approved Alignment Review is unavailable."))?;
    let intent_source_type = match result.intent.source_type {
        IntentSourceType::Compendium => FeatureContractSourceType::Compendium,
        IntentSourceType::Decision => FeatureContractSourceType::Decision,
    };
    Ok(FeatureContractTrace {
        origin,
        intent: FeatureContractSourceReference {
            source_type: intent_source_type,
            source_id: result.intent.source_id,
            title: result.intent.title,
            statement: result.intent.statement,
            status: result.intent.status,
            area: result.intent.area,
            provenance: result.intent.provenance,
        },
        alignment: Some(FeatureContractAlignmentReference {
            alignment_id: result.id,
            status: result.status,
            rationale: result.rationale,
            created_at: result.created_at,
            review_state: result.review_state,
        }),
        reality_evidence: result
            .evidence
            .into_iter()
            .map(|evidence| FeatureContractEvidenceReference {
                evidence_id: evidence.evidence_id,
                source: evidence.source,
                summary: evidence.summary,
                captured_at: evidence.captured_at,
                provenance: evidence.provenance,
            })
            .collect(),
    })
}

fn source_reference(source: &FeatureContractSourceOption) -> FeatureContractSourceReference {
    FeatureContractSourceReference {
        source_type: source.source_type,
        source_id: source.source_id.clone(),
        title: source.title.clone(),
        statement: source.statement.clone(),
        status: source.status.clone(),
        area: source.area,
        provenance: source.provenance,
    }
}

fn reality_summary(trace: &FeatureContractTrace) -> String {
    if let Some(alignment) = &trace.alignment {
        let evidence = trace
            .reality_evidence
            .iter()
            .map(|item| item.summary.as_str())
            .collect::<Vec<_>>()
            .join(" ");
        format!(
            "Approved Alignment Review is {}. Rationale: {} Selected Reality evidence: {}",
            alignment_status(alignment.status),
            alignment.rationale,
            evidence,
        )
    } else {
        "No approved Alignment Review is attached to this source. Current Reality is not established by this Feature Contract.".to_owned()
    }
}

fn validate_ready_for_approval(contract: &FeatureContract) -> Result<(), FeatureContractError> {
    if contract.goal.trim().is_empty()
        || contract.affected_systems.is_empty()
        || contract.required_behavior.is_empty()
        || contract.out_of_scope.is_empty()
        || contract.acceptance_criteria.is_empty()
        || contract.deterministic_tests.is_empty()
    {
        return Err(FeatureContractError::new(
            "FEATURE_CONTRACT_INCOMPLETE",
            "Complete the goal, affected systems, required behavior, out of scope, acceptance criteria, and deterministic tests before approval.",
        ));
    }
    Ok(())
}

fn validate_editable_fields(request: &UpdateFeatureContractRequest) -> Result<(), FeatureContractError> {
    validate_text(&request.title, 1, 120)?;
    validate_text(&request.goal, 1, 2_000)?;
    validate_text(&request.implementation_notes, 0, 4_000)?;
    for values in [
        &request.affected_systems,
        &request.required_behavior,
        &request.out_of_scope,
        &request.risks,
        &request.acceptance_criteria,
        &request.deterministic_tests,
    ] {
        if values.len() > 50 {
            return Err(FeatureContractError::new("INVALID_FEATURE_CONTRACT", "A Feature Contract list may contain at most 50 items."));
        }
        for value in values {
            validate_text(value, 1, 1_000)?;
        }
    }
    Ok(())
}

fn validate_draft_input(draft: &FeatureContractDraftInput) -> Result<(), FeatureContractError> {
    validate_text(&draft.title, 1, 120)?;
    validate_text(&draft.goal, 1, 2_000)?;
    validate_text(&draft.implementation_notes, 0, 4_000)?;
    for values in [
        &draft.affected_systems,
        &draft.required_behavior,
        &draft.out_of_scope,
        &draft.risks,
        &draft.acceptance_criteria,
        &draft.deterministic_tests,
    ] {
        if values.len() > 50 {
            return Err(FeatureContractError::new("INVALID_FEATURE_CONTRACT", "A Feature Contract list may contain at most 50 items."));
        }
        for value in values {
            validate_text(value, 1, 1_000)?;
        }
    }
    Ok(())
}

fn validate_likely_affected_evidence(
    contract: &FeatureContract,
    selected_ids: &[String],
) -> Result<(), FeatureContractError> {
    let evidence_ids = contract
        .sources
        .reality_evidence
        .iter()
        .filter(|evidence| evidence_supports_likely_affected(evidence))
        .map(|evidence| evidence.evidence_id.as_str())
        .collect::<HashSet<_>>();
    if selected_ids.iter().any(|id| !evidence_ids.contains(id.as_str())) {
        return Err(FeatureContractError::new(
            "INVALID_LIKELY_AFFECTED_EVIDENCE",
            "Likely affected evidence must be selected from the contract's captured Reality evidence.",
        ));
    }
    Ok(())
}

fn validate_ai_proposal(proposal: &FeatureContractDraftProposal) -> Result<(), FeatureContractError> {
    validate_ai_text(&proposal.goal, 1, 2_000)?;
    validate_ai_text(&proposal.implementation_notes, 0, 4_000)?;
    for values in [
        &proposal.affected_systems,
        &proposal.required_behavior,
        &proposal.out_of_scope,
        &proposal.risks,
        &proposal.acceptance_criteria,
        &proposal.deterministic_tests,
    ] {
        if values.len() > 50 {
            return Err(invalid_ai_proposal());
        }
        for value in values {
            validate_ai_text(value, 1, 1_000)?;
        }
    }
    Ok(())
}

fn validate_ai_text(value: &str, minimum: usize, maximum: usize) -> Result<(), FeatureContractError> {
    if !valid_portable_text(value, minimum, maximum) || contains_path_like_reference(value) {
        return Err(invalid_ai_proposal());
    }
    Ok(())
}

fn invalid_ai_proposal() -> FeatureContractError {
    FeatureContractError::new(
        "INVALID_FEATURE_CONTRACT_AI_OUTPUT",
        "The AI proposal was unsafe, too large, or contained an unsupported file path and was not applied.",
    )
}

fn contains_path_like_reference(value: &str) -> bool {
    const FILE_EXTENSIONS: [&str; 13] = [
        ".cs", ".cpp", ".h", ".json", ".md", ".prefab", ".rs", ".ts", ".tsx",
        ".unity", ".uxml", ".uss", ".yaml",
    ];
    value.split_whitespace().any(|token| {
        let token = token.trim_matches(|character: char| {
            matches!(character, ',' | '.' | ':' | ';' | '(' | ')' | '[' | ']' | '`' | '"' | '\'')
        });
        let lower = token.to_ascii_lowercase();
        token.contains('\\')
            || (token.contains('/') && token.split('/').count() >= 2)
            || FILE_EXTENSIONS.iter().any(|extension| lower.ends_with(extension))
    })
}

fn structured_payload(text: &str) -> Option<&str> {
    let trimmed = text.trim();
    if trimmed.starts_with('{') && trimmed.ends_with('}') {
        return Some(trimmed);
    }
    let fenced = trimmed.strip_prefix("```json").or_else(|| trimmed.strip_prefix("```"))?;
    let fenced = fenced.strip_suffix("```")?.trim();
    (fenced.starts_with('{') && fenced.ends_with('}')).then_some(fenced)
}

fn validate_text(value: &str, minimum: usize, maximum: usize) -> Result<(), FeatureContractError> {
    if !valid_portable_text(value, minimum, maximum) {
        return Err(FeatureContractError::new(
            "INVALID_FEATURE_CONTRACT",
            "Feature Contract text must be portable and may not contain absolute paths or credential material.",
        ));
    }
    Ok(())
}

fn contains_unsafe_portable_content(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    let bytes = value.as_bytes();
    let windows_path = bytes.windows(3).any(|window| {
        window[0].is_ascii_alphabetic() && window[1] == b':' && (window[2] == b'\\' || window[2] == b'/')
    });
    windows_path
        || value.starts_with("\\\\")
        || lower.contains("/users/")
        || lower.contains("/home/")
        || lower.contains("authorization: bearer")
        || lower.contains("begin private key")
        || lower.contains("api_key=")
        || lower.contains("apikey=")
}

fn normalize_list(values: Vec<String>) -> Vec<String> {
    values.into_iter().map(|value| value.trim().to_owned()).collect()
}

fn unique_list(values: Vec<String>) -> Result<Vec<String>, FeatureContractError> {
    let mut seen = HashSet::new();
    let values = values
        .into_iter()
        .filter(|value| seen.insert(value.clone()))
        .collect::<Vec<_>>();
    if values.len() > 50 {
        return Err(FeatureContractError::new("INVALID_FEATURE_CONTRACT", "At most 50 evidence references may be selected."));
    }
    Ok(values)
}

fn save(root: &Path, mut document: FeatureContractsDocument) -> Result<FeatureContractsDocument, FeatureContractError> {
    document.updated_at = timestamp();
    validate_document(&document, &document.project_id)?;
    let mut contents = serde_json::to_vec_pretty(&document)
        .map_err(|_| FeatureContractError::new("FEATURE_CONTRACT_WRITE_FAILED", "ForgeMind could not prepare Feature Contracts."))?;
    contents.push(b'\n');
    let mut file = fs::File::create(feature_contracts_path(root))
        .map_err(|_| FeatureContractError::new("FEATURE_CONTRACT_WRITE_FAILED", "ForgeMind could not save Feature Contracts."))?;
    file.write_all(&contents)
        .map_err(|_| FeatureContractError::new("FEATURE_CONTRACT_WRITE_FAILED", "ForgeMind could not save Feature Contracts."))?;
    Ok(document)
}

fn load_for_project(root: &Path, project_id: &str) -> Result<Option<FeatureContractsDocument>, FeatureContractError> {
    let contents = match fs::read_to_string(feature_contracts_path(root)) {
        Ok(contents) => contents,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(FeatureContractError::new("FEATURE_CONTRACT_READ_FAILED", "ForgeMind could not read Feature Contracts.")),
    };
    let document: FeatureContractsDocument = serde_json::from_str(&contents).map_err(|_| FeatureContractError::invalid_file())?;
    validate_document(&document, project_id)?;
    Ok(Some(document))
}

fn validate_document(document: &FeatureContractsDocument, expected_project_id: &str) -> Result<(), FeatureContractError> {
    let mut ids = HashSet::new();
    if document.format_version != FEATURE_CONTRACTS_FORMAT_VERSION
        || document.project_id != expected_project_id
        || DateTime::parse_from_rfc3339(&document.updated_at).is_err()
        || document.contracts.iter().any(|contract| {
            Uuid::parse_str(&contract.id).is_err()
                || !ids.insert(contract.id.as_str())
                || DateTime::parse_from_rfc3339(&contract.created_at).is_err()
                || DateTime::parse_from_rfc3339(&contract.updated_at).is_err()
                || !valid_trace(&contract.sources)
                || contract.sources.alignment.as_ref().is_some_and(|reference| {
                    Uuid::parse_str(&reference.alignment_id).is_err()
                        || reference.review_state != AlignmentReviewState::Approved
                        || DateTime::parse_from_rfc3339(&reference.created_at).is_err()
                        || reference.rationale.trim().is_empty()
                })
                || contract.sources.reality_evidence.iter().any(|evidence| {
                    evidence.evidence_id.trim().is_empty()
                        || evidence.summary.trim().is_empty()
                        || DateTime::parse_from_rfc3339(&evidence.captured_at).is_err()
                        || !matches!(
                            (evidence.source, evidence.provenance),
                            (RealitySource::Git, AlignmentProvenance::VerifiedFromGit)
                                | (RealitySource::Unity, AlignmentProvenance::VerifiedFromUnity)
                        )
                })
                || !valid_contract_content(contract)
                || contract.likely_affected_evidence_ids.iter().any(|id| {
                    !contract.sources.reality_evidence.iter().any(|evidence| {
                        evidence.evidence_id == *id && evidence_supports_likely_affected(evidence)
                    })
                })
                || match contract.status {
                    FeatureContractStatus::Draft => {
                        contract.review_state != FeatureContractReviewState::PendingReview || contract.reviewed_at.is_some()
                    }
                    FeatureContractStatus::Approved | FeatureContractStatus::Superseded | FeatureContractStatus::Deprecated => {
                        contract.review_state != FeatureContractReviewState::Approved
                            || contract.reviewed_at.as_ref().is_none_or(|date| DateTime::parse_from_rfc3339(date).is_err())
                    }
                }
        })
    {
        return Err(FeatureContractError::invalid_file());
    }
    Ok(())
}

fn valid_source(source: &FeatureContractSourceReference) -> bool {
    Uuid::parse_str(&source.source_id).is_ok()
        && valid_portable_text(&source.title, 1, 120)
        && valid_portable_text(&source.statement, 1, 2_000)
        && valid_portable_text(&source.status, 1, 64)
        && matches!(
            (source.source_type, source.provenance),
            (FeatureContractSourceType::Alignment, AlignmentProvenance::ManualAssessment)
                | (FeatureContractSourceType::Compendium, AlignmentProvenance::Documented)
                | (FeatureContractSourceType::Decision, AlignmentProvenance::ApprovedIntent)
        )
}

fn valid_trace(trace: &FeatureContractTrace) -> bool {
    if !valid_source(&trace.origin) || !valid_source(&trace.intent) {
        return false;
    }
    let mut evidence_ids = HashSet::new();
    if trace.reality_evidence.iter().any(|evidence| !evidence_ids.insert(evidence.evidence_id.as_str())) {
        return false;
    }
    match (trace.origin.source_type, trace.alignment.as_ref()) {
        (FeatureContractSourceType::Alignment, Some(alignment)) => {
            trace.origin.source_id == alignment.alignment_id
                && trace.origin.title == trace.intent.title
                && trace.origin.statement == trace.intent.statement
                && trace.origin.area == trace.intent.area
                && trace.origin.status == alignment_status(alignment.status)
                && trace.intent.source_type != FeatureContractSourceType::Alignment
        }
        (FeatureContractSourceType::Compendium | FeatureContractSourceType::Decision, None) => {
            trace.origin == trace.intent && trace.reality_evidence.is_empty()
        }
        _ => false,
    }
}

fn valid_contract_content(contract: &FeatureContract) -> bool {
    let lists = [
        &contract.affected_systems,
        &contract.required_behavior,
        &contract.out_of_scope,
        &contract.risks,
        &contract.acceptance_criteria,
        &contract.deterministic_tests,
    ];
    let mut likely_ids = HashSet::new();
    contract.current_reality_summary == reality_summary(&contract.sources)
        && valid_portable_text(&contract.title, 1, 120)
        && valid_portable_text(&contract.goal, 1, 2_000)
        && valid_portable_text(&contract.current_reality_summary, 1, 110_000)
        && valid_portable_text(&contract.implementation_notes, 0, 4_000)
        && lists.iter().all(|values| {
            values.len() <= 50 && values.iter().all(|value| valid_portable_text(value, 1, 1_000))
        })
        && contract.likely_affected_evidence_ids.len() <= 50
        && contract.likely_affected_evidence_ids.iter().all(|id| likely_ids.insert(id.as_str()))
}

fn evidence_supports_likely_affected(evidence: &FeatureContractEvidenceReference) -> bool {
    evidence.source == RealitySource::Unity || evidence.evidence_id.starts_with("git:file:")
}

fn valid_portable_text(value: &str, minimum: usize, maximum: usize) -> bool {
    let trimmed = value.trim();
    let length = trimmed.chars().count();
    length >= minimum && length <= maximum && !contains_unsafe_portable_content(trimmed)
}

fn verify_project(root: &Path, expected_project_id: &str) -> Result<(), FeatureContractError> {
    if workspace_project_id(root)? != expected_project_id {
        return Err(FeatureContractError::new("PROJECT_ID_MISMATCH", "Feature Contract data does not belong to the selected workspace."));
    }
    Ok(())
}

fn workspace_project_id(root: &Path) -> Result<String, FeatureContractError> {
    match workspace::inspect(root)
        .map_err(|_| FeatureContractError::new("WORKSPACE_ACCESS_FAILED", "ForgeMind could not access the selected workspace."))?
    {
        WorkspaceInspection::Valid { project, .. } => Ok(project.project_id),
        _ => Err(FeatureContractError::new("INVALID_WORKSPACE", "Feature Contracts require a valid ForgeMind workspace.")),
    }
}

fn map_alignment_error(error: alignment::AlignmentError) -> FeatureContractError {
    FeatureContractError::new(&error.code, &error.message)
}

fn map_compendium_error(error: compendium::CompendiumError) -> FeatureContractError {
    FeatureContractError::new(&error.code, &error.message)
}

fn map_decision_error(error: decisions::DecisionError) -> FeatureContractError {
    FeatureContractError::new(&error.code, &error.message)
}

fn knowledge_status(status: KnowledgeStatus) -> &'static str {
    match status {
        KnowledgeStatus::Direction => "DIRECTION",
        KnowledgeStatus::Locked => "LOCKED",
        KnowledgeStatus::Tbd => "TBD",
        KnowledgeStatus::Deprecated => "DEPRECATED",
    }
}

fn alignment_status(status: AlignmentStatus) -> &'static str {
    match status {
        AlignmentStatus::Aligned => "ALIGNED",
        AlignmentStatus::Unverified => "UNVERIFIED",
        AlignmentStatus::OutOfSync => "OUT_OF_SYNC",
        AlignmentStatus::Conflict => "CONFLICT",
    }
}

fn empty_document(project_id: &str) -> FeatureContractsDocument {
    FeatureContractsDocument {
        format_version: FEATURE_CONTRACTS_FORMAT_VERSION,
        project_id: project_id.to_owned(),
        updated_at: timestamp(),
        contracts: Vec::new(),
    }
}

fn feature_contracts_path(root: &Path) -> PathBuf { root.join(".forgemind").join(FEATURE_CONTRACTS_FILE) }
fn timestamp() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true) }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::alignment::{AlignmentCheck, AlignmentConfidence, EvidenceAssessment, EvidenceSelection};
    use crate::compendium::CreateKnowledgeEntryRequest;
    use crate::decisions::{CreateDecisionRequest, DecisionActionRequest};
    use serde_json::json;
    use tempfile::TempDir;

    struct Fixture {
        directory: TempDir,
        project_id: String,
        knowledge_id: String,
        approved_decision_id: String,
        proposed_decision_id: String,
        alignment_id: String,
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
                "formatVersion": 1, "projectId": project.project_id, "generatedAt": "2026-09-21T10:00:00Z",
                "unityVersion": "6000.3.23f1", "source": { "kind": "UNITY_EDITOR_EXPORT", "toolVersion": "0.1.0" },
                "coverage": { "categories": ["COMPONENTS"], "errors": [] },
                "observations": { "scenes": [], "gameObjects": [],
                    "components": [{ "id": "component-1", "gameObjectId": "guard-1", "typeName": "HearingPerception" }],
                    "serializedFields": [], "prefabReferences": [], "scriptableObjects": [], "tags": [], "layers": [], "inputActions": [], "tests": [] }
            })).unwrap(),
        ).unwrap();
        let compendium = compendium::create_entry(CreateKnowledgeEntryRequest {
            root_path: directory.path().display().to_string(), project_id: project.project_id.clone(), area: KnowledgeArea::Systems,
            title: "Uncertain sound information".to_owned(),
            statement: "Enemy sound information should remain uncertain and never grant exact player coordinates from sound alone.".to_owned(),
            status: KnowledgeStatus::Locked,
        }).unwrap();
        let knowledge_id = compendium.entries[0].id.clone();
        let approved = decisions::create(CreateDecisionRequest {
            root_path: directory.path().display().to_string(), project_id: project.project_id.clone(),
            title: "Sound preserves uncertainty".to_owned(), statement: "Sound knowledge never contains exact player coordinates.".to_owned(),
            rationale: "Preserve tactical uncertainty.".to_owned(), area: KnowledgeArea::Systems, author: "Local User".to_owned(),
            supersedes_decision_id: None, related_knowledge_entry_ids: vec![knowledge_id.clone()],
        }).unwrap();
        let approved_decision_id = approved.decisions[0].id.clone();
        decisions::approve(DecisionActionRequest {
            root_path: directory.path().display().to_string(), project_id: project.project_id.clone(), decision_id: approved_decision_id.clone(),
        }).unwrap();
        let proposed = decisions::create(CreateDecisionRequest {
            root_path: directory.path().display().to_string(), project_id: project.project_id.clone(),
            title: "Exact sound coordinates".to_owned(), statement: "Sound reveals exact coordinates.".to_owned(),
            rationale: "Faster response.".to_owned(), area: KnowledgeArea::Systems, author: "Local User".to_owned(),
            supersedes_decision_id: None, related_knowledge_entry_ids: Vec::new(),
        }).unwrap();
        let proposed_decision_id = proposed.decisions.iter().find(|decision| decision.status == DecisionStatus::Proposed).unwrap().id.clone();
        let catalog = alignment::sources(directory.path()).unwrap();
        let evidence_id = catalog.reality_evidence.iter().find(|item| item.source == RealitySource::Unity).unwrap().id.clone();
        let review = alignment::create(AlignmentCheck {
            root_path: directory.path().display().to_string(), project_id: project.project_id.clone(),
            intent_source_type: IntentSourceType::Compendium, intent_source_id: knowledge_id.clone(), conflicting_decision_id: None,
            evidence: vec![EvidenceSelection { evidence_id, assessment: EvidenceAssessment::Insufficient }],
            rationale: "Component presence does not prove sound knowledge omits exact coordinates.".to_owned(),
            confidence: AlignmentConfidence::Low, uncertainty: "Runtime knowledge values are unavailable.".to_owned(),
        }).unwrap();
        let alignment_id = review.results[0].id.clone();
        alignment::review(crate::alignment::ReviewAlignmentRequest {
            root_path: directory.path().display().to_string(), project_id: project.project_id.clone(),
            result_id: alignment_id.clone(), review_state: AlignmentReviewState::Approved,
        }).unwrap();
        Fixture { directory, project_id: project.project_id, knowledge_id, approved_decision_id, proposed_decision_id, alignment_id }
    }

    fn create_request(fixture: &Fixture, source_type: FeatureContractSourceType, source_id: &str) -> CreateFeatureContractRequest {
        CreateFeatureContractRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(),
            source_type, source_id: source_id.to_owned(),
        }
    }

    fn complete_update(fixture: &Fixture, contract: &FeatureContract) -> UpdateFeatureContractRequest {
        UpdateFeatureContractRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(), contract_id: contract.id.clone(),
            title: contract.title.clone(), goal: contract.goal.clone(), affected_systems: vec!["Enemy sound perception".to_owned(), "Enemy knowledge handling".to_owned()],
            required_behavior: vec!["Sound observations retain uncertainty and omit exact player coordinates.".to_owned()],
            out_of_scope: vec!["Do not change vision perception.".to_owned()], risks: vec!["Existing pursuit logic may expect exact positions.".to_owned()],
            acceptance_criteria: vec!["Sound-only knowledge contains no exact player coordinate.".to_owned()],
            deterministic_tests: vec!["A sound-only perception test asserts the exact player position is absent.".to_owned()],
            implementation_notes: "Preserve the existing gameplay authority boundary.".to_owned(),
            likely_affected_evidence_ids: contract.sources.reality_evidence.iter().map(|item| item.evidence_id.clone()).collect(),
        }
    }

    #[test]
    fn approved_alignment_is_preferred_and_creates_fact_only_draft() {
        let fixture = fixture();
        let catalog = sources(fixture.directory.path()).unwrap();
        assert_eq!(catalog.sources[0].source_type, FeatureContractSourceType::Alignment);
        assert!(catalog.sources[0].preferred);
        let document = create(create_request(&fixture, FeatureContractSourceType::Alignment, &fixture.alignment_id)).unwrap();
        let contract = &document.contracts[0];
        assert_eq!(contract.status, FeatureContractStatus::Draft);
        assert_eq!(contract.review_state, FeatureContractReviewState::PendingReview);
        assert_eq!(contract.goal, "Enemy sound information should remain uncertain and never grant exact player coordinates from sound alone.");
        assert!(contract.current_reality_summary.contains("UNVERIFIED"));
        assert!(contract.current_reality_summary.contains("Component presence does not prove"));
        assert_eq!(contract.sources.reality_evidence.len(), 1);
        assert!(contract.required_behavior.is_empty());
        assert!(contract.acceptance_criteria.is_empty());
        assert!(contract.implementation_notes.is_empty());
    }

    #[test]
    fn compendium_and_approved_decision_create_drafts_but_unapproved_decision_is_rejected() {
        let fixture = fixture();
        let compendium = create(create_request(&fixture, FeatureContractSourceType::Compendium, &fixture.knowledge_id)).unwrap();
        assert_eq!(compendium.contracts[0].sources.intent.source_type, FeatureContractSourceType::Compendium);
        assert!(compendium.contracts[0].sources.alignment.is_none());
        let decisions = create(create_request(&fixture, FeatureContractSourceType::Decision, &fixture.approved_decision_id)).unwrap();
        assert_eq!(decisions.contracts[1].sources.intent.source_type, FeatureContractSourceType::Decision);
        let error = create(create_request(&fixture, FeatureContractSourceType::Decision, &fixture.proposed_decision_id)).unwrap_err();
        assert_eq!(error.code, "INVALID_FEATURE_CONTRACT_SOURCE");
    }

    #[test]
    fn update_preserves_source_trace_and_approval_is_explicit_and_durable() {
        let fixture = fixture();
        let compendium_before = fs::read(fixture.directory.path().join(".forgemind/compendium.json")).unwrap();
        let decisions_before = fs::read(fixture.directory.path().join(".forgemind/decisions.json")).unwrap();
        let alignment_before = fs::read(fixture.directory.path().join(".forgemind/alignment.json")).unwrap();
        let groundtruth_before = fs::read(fixture.directory.path().join(".forgemind/unity-groundtruth.json")).unwrap();
        let created = create(create_request(&fixture, FeatureContractSourceType::Alignment, &fixture.alignment_id)).unwrap();
        let original_sources = created.contracts[0].sources.clone();
        let updated = update(complete_update(&fixture, &created.contracts[0])).unwrap();
        assert_eq!(updated.contracts[0].sources, original_sources);
        assert_eq!(updated.contracts[0].status, FeatureContractStatus::Draft);
        let approved = set_status(SetFeatureContractStatusRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(),
            contract_id: updated.contracts[0].id.clone(), status: FeatureContractStatus::Approved,
        }).unwrap();
        assert_eq!(approved.contracts[0].status, FeatureContractStatus::Approved);
        assert_eq!(approved.contracts[0].review_state, FeatureContractReviewState::Approved);
        assert!(approved.contracts[0].reviewed_at.is_some());
        assert_eq!(load(fixture.directory.path()).unwrap().unwrap(), approved);
        assert_eq!(fs::read(fixture.directory.path().join(".forgemind/compendium.json")).unwrap(), compendium_before);
        assert_eq!(fs::read(fixture.directory.path().join(".forgemind/decisions.json")).unwrap(), decisions_before);
        assert_eq!(fs::read(fixture.directory.path().join(".forgemind/alignment.json")).unwrap(), alignment_before);
        assert_eq!(fs::read(fixture.directory.path().join(".forgemind/unity-groundtruth.json")).unwrap(), groundtruth_before);
    }

    #[test]
    fn persistence_is_portable_and_rejects_invented_evidence_or_absolute_paths() {
        let fixture = fixture();
        let created = create(create_request(&fixture, FeatureContractSourceType::Alignment, &fixture.alignment_id)).unwrap();
        let mut invented = complete_update(&fixture, &created.contracts[0]);
        invented.likely_affected_evidence_ids = vec!["git:file:invented.rs".to_owned()];
        assert_eq!(update(invented).unwrap_err().code, "INVALID_LIKELY_AFFECTED_EVIDENCE");
        let mut unsafe_update = complete_update(&fixture, &created.contracts[0]);
        unsafe_update.implementation_notes = "Edit C:\\Users\\someone\\secret.txt".to_owned();
        assert_eq!(update(unsafe_update).unwrap_err().code, "INVALID_FEATURE_CONTRACT");
        update(complete_update(&fixture, &created.contracts[0])).unwrap();
        let serialized = fs::read_to_string(feature_contracts_path(fixture.directory.path())).unwrap();
        assert!(!serialized.contains(&fixture.directory.path().display().to_string()));
        assert!(!serialized.contains("AI_INFERENCE"));
    }

    #[test]
    fn draft_title_is_editable_and_only_drafts_can_be_deleted() {
        let fixture = fixture();
        let created = create(create_request(&fixture, FeatureContractSourceType::Alignment, &fixture.alignment_id)).unwrap();
        let mut editable = complete_update(&fixture, &created.contracts[0]);
        editable.title = "Enemy sound uncertainty delivery".to_owned();
        let updated = update(editable).unwrap();
        assert_eq!(updated.contracts[0].title, "Enemy sound uncertainty delivery");
        assert_eq!(updated.contracts[0].sources.origin.title, "Uncertain sound information");

        let second = create(create_request(&fixture, FeatureContractSourceType::Compendium, &fixture.knowledge_id)).unwrap();
        let approved_id = second.contracts[0].id.clone();
        let approved = set_status(SetFeatureContractStatusRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(),
            contract_id: approved_id.clone(), status: FeatureContractStatus::Approved,
        }).unwrap();
        assert_eq!(approved.contracts[0].status, FeatureContractStatus::Approved);
        let error = delete_draft(DeleteFeatureContractRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(), contract_id: approved_id,
        }).unwrap_err();
        assert_eq!(error.code, "FEATURE_CONTRACT_NOT_DELETABLE");

        let draft_id = approved.contracts[1].id.clone();
        let remaining = delete_draft(DeleteFeatureContractRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(), contract_id: draft_id,
        }).unwrap();
        assert_eq!(remaining.contracts.len(), 1);
        assert_eq!(remaining.contracts[0].status, FeatureContractStatus::Approved);
    }

    #[test]
    fn ai_draft_uses_captured_context_and_current_human_text_without_persisting() {
        let fixture = fixture();
        let created = create(create_request(&fixture, FeatureContractSourceType::Alignment, &fixture.alignment_id)).unwrap();
        let before = fs::read(feature_contracts_path(fixture.directory.path())).unwrap();
        let contract = &created.contracts[0];
        let prepared = build_ai_draft_request(&DraftFeatureContractWithAiRequest {
            root_path: fixture.directory.path().display().to_string(), project_id: fixture.project_id.clone(),
            contract_id: contract.id.clone(), model_id: "deepseek-ai/DeepSeek-V4.1-Flash".to_owned(),
            draft: FeatureContractDraftInput {
                title: contract.title.clone(), goal: "Human goal text".to_owned(), affected_systems: vec!["Enemy perception".to_owned()],
                required_behavior: Vec::new(), out_of_scope: Vec::new(), risks: Vec::new(), acceptance_criteria: Vec::new(),
                deterministic_tests: Vec::new(), implementation_notes: String::new(), likely_affected_evidence_ids: Vec::new(),
            },
        }).unwrap();
        assert!(prepared.ai_request.user_prompt.contains("Human goal text"));
        assert!(prepared.ai_request.user_prompt.contains("Component presence does not prove"));
        assert!(prepared.ai_request.user_prompt.contains(&contract.sources.reality_evidence[0].summary));
        assert_eq!(prepared.ai_request.max_tokens, Some(3_200));
        assert_eq!(fs::read(feature_contracts_path(fixture.directory.path())).unwrap(), before);
    }

    #[test]
    fn ai_proposal_is_bounded_and_rejects_invented_file_paths() {
        let valid = serde_json::json!({
            "goal": "Keep sound-derived knowledge uncertain.",
            "affectedSystems": ["Enemy perception", "Enemy knowledge"],
            "requiredBehavior": ["Sound-only observations omit exact coordinates."],
            "outOfScope": ["Vision perception"],
            "risks": ["Legacy pursuit may assume a precise target."],
            "acceptanceCriteria": ["No exact coordinate is stored from sound alone."],
            "deterministicTests": ["Assert sound-only knowledge has no exact coordinate."],
            "implementationNotes": "Preserve the existing gameplay authority boundary."
        }).to_string();
        let normalized = normalize_ai_draft(&valid, "test/model".to_owned(), 42, Some(10), Some(20), Some(30)).unwrap();
        assert_eq!(normalized.proposal.affected_systems, vec!["Enemy perception", "Enemy knowledge"]);

        let invented = valid.replace(
            "Preserve the existing gameplay authority boundary.",
            "Edit app/src/perception.ts.",
        );
        assert_eq!(
            normalize_ai_draft(&invented, "test/model".to_owned(), 42, None, None, None).unwrap_err().code,
            "INVALID_FEATURE_CONTRACT_AI_OUTPUT",
        );
        let invented_file = valid.replace(
            "Preserve the existing gameplay authority boundary.",
            "Edit PerceptionController.cs.",
        );
        assert_eq!(
            normalize_ai_draft(&invented_file, "test/model".to_owned(), 42, None, None, None).unwrap_err().code,
            "INVALID_FEATURE_CONTRACT_AI_OUTPUT",
        );
    }
}
