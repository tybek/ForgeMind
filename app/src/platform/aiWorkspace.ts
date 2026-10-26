import { invoke } from "@tauri-apps/api/core";

export type AiWorkspaceSessionStatus = "ACTIVE" | "ARCHIVED";
export type AiWorkspaceMessageRole = "USER" | "ASSISTANT";
export type AiWorkspaceResponseMode = "EXPLORE" | "CLARIFY" | "CONSOLIDATE";
export type AiWorkspaceSourceType =
  | "COMPENDIUM"
  | "DECISION"
  | "OPEN_QUESTION"
  | "DOCUMENT"
  | "REALITY"
  | "AI_WORKSPACE_MESSAGE"
  | "EXTERNAL_RESEARCH";
export type AiWorkspaceAuthority =
  | "AUTHORITATIVE_INTENT"
  | "ESTABLISHED_KNOWLEDGE"
  | "UNRESOLVED_KNOWLEDGE"
  | "DOCUMENTED"
  | "REALITY_EVIDENCE"
  | "AI_GENERATED"
  | "EXTERNAL_RESEARCH";
export type AiWorkspaceSelectionPriority = "EXPLICIT" | "SUPPORTING";
export type AiWorkspaceProposalType =
  | "SAVE_KNOWLEDGE"
  | "CREATE_DECISION"
  | "CREATE_OPEN_QUESTION"
  | "UPDATE_KNOWLEDGE"
  | "NAVIGATE_TO_SOURCE"
  | "CONTINUE_EXPLORING";
export type AiWorkspaceProposalStatus = "PENDING" | "ACCEPTED" | "APPLIED" | "REJECTED" | "DISCARDED";

export interface AiWorkspaceSourceTrace {
  sourceType: AiWorkspaceSourceType;
  sourceId: string;
  label: string;
  authority: AiWorkspaceAuthority;
  navigationTarget?: string;
}

export interface AiWorkspaceUsageReference {
  applicationSessionId: string;
  usageTimestamp: string;
  profileId: string;
}

export interface AiWorkspaceMessage {
  id: string;
  role: AiWorkspaceMessageRole;
  content: string;
  questions: AiWorkspaceFocusedQuestion[];
  responseMode?: AiWorkspaceResponseMode;
  contextSummary?: AiWorkspaceContextSummary;
  createdAt: string;
  sourceTrace: AiWorkspaceSourceTrace[];
  usageReference?: AiWorkspaceUsageReference;
}

export interface AiWorkspaceFocusedQuestion {
  question: string;
  whyItMatters?: string;
  options: string[];
}

export interface AiWorkspaceContextSummary {
  establishedKnowledge: number;
  approvedDecisions: number;
  openQuestions: number;
  documentedSources: number;
  externalResearch: number;
  recentMessages: number;
}

export interface ExternalResearchSource {
  id: string;
  query: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  retrievedAt: string;
  provider: "TAVILY";
  authority: "EXTERNAL_RESEARCH";
  selected: boolean;
}

export interface ExternalResearchRun {
  provider: "TAVILY";
  operation: "SEARCH";
  timestamp: string;
  queryLength: number;
  resultCount: number;
  latencyMs: number;
  status: "SUCCESS" | "FAILURE";
  errorCategory?: string;
}

export interface AiWorkspaceProposedEdit {
  target: AiWorkspaceSourceTrace;
  currentValue: string;
  proposedValue: string;
  reason: string;
  affectedReferences: AiWorkspaceSourceTrace[];
}

export interface AiWorkspaceProposal {
  id: string;
  proposalType: AiWorkspaceProposalType;
  title: string;
  summary: string;
  reason?: string;
  status: AiWorkspaceProposalStatus;
  editedByHuman?: boolean;
  createdAt: string;
  updatedAt: string;
  sourceTrace: AiWorkspaceSourceTrace[];
  proposedEdit?: AiWorkspaceProposedEdit;
}

export interface AiWorkspaceSession {
  id: string;
  projectId: string;
  surface: string;
  purpose: string;
  specialistProfileId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: AiWorkspaceSessionStatus;
  messages: AiWorkspaceMessage[];
  selectedMarkdownPaths: string[];
  externalResearchSources: ExternalResearchSource[];
  externalResearchRuns: ExternalResearchRun[];
  sourceTrace: AiWorkspaceSourceTrace[];
  proposals: AiWorkspaceProposal[];
}

export interface AiWorkspaceDocument {
  formatVersion: number;
  projectId: string;
  updatedAt: string;
  sessions: AiWorkspaceSession[];
  recoveryWarnings?: string[];
}

export interface AiWorkspaceProfile {
  id: string;
  displayName: string;
  taskPurpose: string;
  allowedContextCategories: AiWorkspaceSourceType[];
  preferredModelId?: string;
  outputExpectations: string;
  reviewExpectations: string;
  availableForRuns: boolean;
}

export type AiWorkspaceContextSourceRequest =
  | { sourceType: "COMPENDIUM"; sourceId: string; priority: AiWorkspaceSelectionPriority }
  | { sourceType: "DECISION"; sourceId: string; priority: AiWorkspaceSelectionPriority }
  | { sourceType: "OPEN_QUESTION"; sourceId: string; priority: AiWorkspaceSelectionPriority }
  | { sourceType: "DOCUMENT"; relativePath: string; priority: AiWorkspaceSelectionPriority }
  | { sourceType: "AI_WORKSPACE_MESSAGE"; sessionId: string; messageId: string; priority: AiWorkspaceSelectionPriority };

export interface AiWorkspaceContextItem {
  content: string;
  trace: AiWorkspaceSourceTrace;
  priority: AiWorkspaceSelectionPriority;
}

export interface AiWorkspaceContextPlan {
  projectId: string;
  items: AiWorkspaceContextItem[];
  sourceTrace: AiWorkspaceSourceTrace[];
  totalCharacters: number;
}

export interface AiWorkspaceRecovery {
  document: AiWorkspaceDocument;
  archivedFileName?: string;
}

const SESSION_STATUSES = new Set<AiWorkspaceSessionStatus>(["ACTIVE", "ARCHIVED"]);
const MESSAGE_ROLES = new Set<AiWorkspaceMessageRole>(["USER", "ASSISTANT"]);
const RESPONSE_MODES = new Set<AiWorkspaceResponseMode>(["EXPLORE", "CLARIFY", "CONSOLIDATE"]);
const SOURCE_TYPES = new Set<AiWorkspaceSourceType>([
  "COMPENDIUM", "DECISION", "OPEN_QUESTION", "DOCUMENT", "REALITY", "AI_WORKSPACE_MESSAGE", "EXTERNAL_RESEARCH",
]);
const AUTHORITIES = new Set<AiWorkspaceAuthority>([
  "AUTHORITATIVE_INTENT", "ESTABLISHED_KNOWLEDGE", "UNRESOLVED_KNOWLEDGE", "DOCUMENTED", "REALITY_EVIDENCE", "AI_GENERATED", "EXTERNAL_RESEARCH",
]);
const PROPOSAL_TYPES = new Set<AiWorkspaceProposalType>([
  "SAVE_KNOWLEDGE", "CREATE_DECISION", "CREATE_OPEN_QUESTION", "UPDATE_KNOWLEDGE", "NAVIGATE_TO_SOURCE", "CONTINUE_EXPLORING",
]);
const PROPOSAL_STATUSES = new Set<AiWorkspaceProposalStatus>(["PENDING", "ACCEPTED", "APPLIED", "REJECTED", "DISCARDED"]);
const MAX_SESSIONS = 50;
const MAX_MESSAGES = 200;
const MAX_PROPOSALS = 50;
const MAX_CONTEXT_SOURCES = 20;
const MAX_MARKDOWN_DOCUMENTS = 5;
const MAX_QUESTIONS = 3;
const SOURCE_AUTHORITIES: Record<AiWorkspaceSourceType, AiWorkspaceAuthority> = {
  COMPENDIUM: "ESTABLISHED_KNOWLEDGE",
  DECISION: "AUTHORITATIVE_INTENT",
  OPEN_QUESTION: "UNRESOLVED_KNOWLEDGE",
  DOCUMENT: "DOCUMENTED",
  REALITY: "REALITY_EVIDENCE",
  AI_WORKSPACE_MESSAGE: "AI_GENERATED",
  EXTERNAL_RESEARCH: "EXTERNAL_RESEARCH",
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function strings(value: unknown, maximum = Number.POSITIVE_INFINITY): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, maximum)
    : [];
}

function normalizeQuestion(value: unknown): AiWorkspaceFocusedQuestion | null {
  if (typeof value === "string") return { question: value, options: [] };
  const question = record(value);
  if (!question || typeof question.question !== "string") return null;
  return {
    question: question.question,
    ...(typeof question.whyItMatters === "string" ? { whyItMatters: question.whyItMatters } : {}),
    options: strings(question.options, 4),
  };
}

function normalizeContextSummary(value: unknown): AiWorkspaceContextSummary | undefined {
  const summary = record(value);
  const fields = ["establishedKnowledge", "approvedDecisions", "openQuestions", "documentedSources", "recentMessages"] as const;
  if (!summary || fields.some((field) => typeof summary[field] !== "number" || !Number.isInteger(summary[field]) || (summary[field] as number) < 0)) return undefined;
  const externalResearch = typeof summary.externalResearch === "number" && Number.isInteger(summary.externalResearch) && summary.externalResearch >= 0
    ? summary.externalResearch : 0;
  if ((summary.establishedKnowledge as number) + (summary.approvedDecisions as number) + (summary.openQuestions as number) + (summary.documentedSources as number) + externalResearch > MAX_CONTEXT_SOURCES
    || (summary.recentMessages as number) > 12) return undefined;
  return {
    establishedKnowledge: summary.establishedKnowledge as number,
    approvedDecisions: summary.approvedDecisions as number,
    openQuestions: summary.openQuestions as number,
    documentedSources: summary.documentedSources as number,
    externalResearch,
    recentMessages: summary.recentMessages as number,
  };
}

function normalizeExternalResearchSource(value: unknown): ExternalResearchSource | null {
  const source = record(value);
  if (!source
    || typeof source.id !== "string"
    || typeof source.query !== "string"
    || typeof source.title !== "string"
    || typeof source.url !== "string" || !/^https?:\/\//i.test(source.url)
    || typeof source.domain !== "string"
    || typeof source.snippet !== "string"
    || !validTimestamp(source.retrievedAt)
    || source.provider !== "TAVILY"
    || source.authority !== "EXTERNAL_RESEARCH"
    || typeof source.selected !== "boolean") return null;
  return source as unknown as ExternalResearchSource;
}

function normalizeExternalResearchRun(value: unknown): ExternalResearchRun | null {
  const run = record(value);
  if (!run
    || run.provider !== "TAVILY"
    || run.operation !== "SEARCH"
    || !validTimestamp(run.timestamp)
    || typeof run.queryLength !== "number" || !Number.isInteger(run.queryLength) || run.queryLength < 1 || run.queryLength > 1000
    || typeof run.resultCount !== "number" || !Number.isInteger(run.resultCount) || run.resultCount < 0 || run.resultCount > 5
    || typeof run.latencyMs !== "number" || !Number.isFinite(run.latencyMs) || run.latencyMs < 0
    || (run.status !== "SUCCESS" && run.status !== "FAILURE")
    || (run.errorCategory !== undefined && typeof run.errorCategory !== "string")) return null;
  return run as unknown as ExternalResearchRun;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeSource(value: unknown): AiWorkspaceSourceTrace | null {
  const source = record(value);
  if (!source
    || typeof source.sourceType !== "string" || !SOURCE_TYPES.has(source.sourceType as AiWorkspaceSourceType)
    || typeof source.sourceId !== "string"
    || typeof source.label !== "string"
    || typeof source.authority !== "string" || !AUTHORITIES.has(source.authority as AiWorkspaceAuthority)
    || SOURCE_AUTHORITIES[source.sourceType as AiWorkspaceSourceType] !== source.authority
    || (source.navigationTarget !== undefined && typeof source.navigationTarget !== "string")) return null;
  return {
    sourceType: source.sourceType as AiWorkspaceSourceType,
    sourceId: source.sourceId,
    label: source.label,
    authority: source.authority as AiWorkspaceAuthority,
    ...(typeof source.navigationTarget === "string" ? { navigationTarget: source.navigationTarget } : {}),
  };
}

function normalizeUsageReference(value: unknown): AiWorkspaceUsageReference | undefined {
  const reference = record(value);
  if (!reference
    || typeof reference.applicationSessionId !== "string"
    || !validTimestamp(reference.usageTimestamp)
    || typeof reference.profileId !== "string") return undefined;
  return {
    applicationSessionId: reference.applicationSessionId,
    usageTimestamp: reference.usageTimestamp,
    profileId: reference.profileId,
  };
}

function normalizeMessage(value: unknown): AiWorkspaceMessage | null {
  const message = record(value);
  if (!message
    || typeof message.id !== "string"
    || typeof message.role !== "string" || !MESSAGE_ROLES.has(message.role as AiWorkspaceMessageRole)
    || typeof message.content !== "string"
    || !validTimestamp(message.createdAt)) return null;
  const usageReference = normalizeUsageReference(message.usageReference);
  const contextSummary = normalizeContextSummary(message.contextSummary);
  const responseMode = typeof message.responseMode === "string" && RESPONSE_MODES.has(message.responseMode as AiWorkspaceResponseMode)
    ? message.responseMode as AiWorkspaceResponseMode
    : undefined;
  return {
    id: message.id,
    role: message.role as AiWorkspaceMessageRole,
    content: message.content,
    questions: Array.isArray(message.questions) ? message.questions.slice(0, MAX_QUESTIONS).map(normalizeQuestion).filter((question): question is AiWorkspaceFocusedQuestion => question !== null) : [],
    ...(responseMode ? { responseMode } : {}),
    ...(contextSummary ? { contextSummary } : {}),
    createdAt: message.createdAt,
    sourceTrace: Array.isArray(message.sourceTrace) ? message.sourceTrace.slice(0, MAX_CONTEXT_SOURCES).map(normalizeSource).filter((source): source is AiWorkspaceSourceTrace => source !== null) : [],
    ...(usageReference ? { usageReference } : {}),
  };
}

function normalizeProposedEdit(value: unknown): AiWorkspaceProposedEdit | undefined {
  const edit = record(value);
  const target = normalizeSource(edit?.target);
  if (!edit || !target
    || typeof edit.currentValue !== "string"
    || typeof edit.proposedValue !== "string"
    || typeof edit.reason !== "string") return undefined;
  return {
    target,
    currentValue: edit.currentValue,
    proposedValue: edit.proposedValue,
    reason: edit.reason,
    affectedReferences: Array.isArray(edit.affectedReferences) ? edit.affectedReferences.slice(0, MAX_CONTEXT_SOURCES).map(normalizeSource).filter((source): source is AiWorkspaceSourceTrace => source !== null) : [],
  };
}

function normalizeProposal(value: unknown): AiWorkspaceProposal | null {
  const proposal = record(value);
  if (!proposal
    || typeof proposal.id !== "string"
    || typeof proposal.proposalType !== "string" || !PROPOSAL_TYPES.has(proposal.proposalType as AiWorkspaceProposalType)
    || typeof proposal.title !== "string"
    || typeof proposal.summary !== "string"
    || typeof proposal.status !== "string" || !PROPOSAL_STATUSES.has(proposal.status as AiWorkspaceProposalStatus)
    || !validTimestamp(proposal.createdAt)
    || !validTimestamp(proposal.updatedAt)) return null;
  const proposedEdit = normalizeProposedEdit(proposal.proposedEdit);
  if (proposal.proposalType === "UPDATE_KNOWLEDGE" && !proposedEdit) return null;
  return {
    id: proposal.id,
    proposalType: proposal.proposalType as AiWorkspaceProposalType,
    title: proposal.title,
    summary: proposal.summary,
    ...(typeof proposal.reason === "string" ? { reason: proposal.reason } : {}),
    status: proposal.status as AiWorkspaceProposalStatus,
    editedByHuman: proposal.editedByHuman === true,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    sourceTrace: Array.isArray(proposal.sourceTrace) ? proposal.sourceTrace.slice(0, MAX_CONTEXT_SOURCES).map(normalizeSource).filter((source): source is AiWorkspaceSourceTrace => source !== null) : [],
    ...(proposedEdit ? { proposedEdit } : {}),
  };
}

function normalizeSession(value: unknown, expectedProjectId: string): AiWorkspaceSession | null {
  const session = record(value);
  if (!session
    || typeof session.id !== "string"
    || session.projectId !== expectedProjectId
    || typeof session.surface !== "string"
    || typeof session.purpose !== "string"
    || typeof session.specialistProfileId !== "string"
    || typeof session.title !== "string"
    || !validTimestamp(session.createdAt)
    || !validTimestamp(session.updatedAt)
    || typeof session.status !== "string" || !SESSION_STATUSES.has(session.status as AiWorkspaceSessionStatus)) return null;
  return {
    id: session.id,
    projectId: session.projectId,
    surface: session.surface,
    purpose: session.purpose,
    specialistProfileId: session.specialistProfileId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    status: session.status as AiWorkspaceSessionStatus,
    messages: Array.isArray(session.messages) ? session.messages.slice(0, MAX_MESSAGES).map(normalizeMessage).filter((message): message is AiWorkspaceMessage => message !== null) : [],
    selectedMarkdownPaths: strings(session.selectedMarkdownPaths, MAX_MARKDOWN_DOCUMENTS),
    externalResearchSources: Array.isArray(session.externalResearchSources)
      ? session.externalResearchSources.slice(0, 5).map(normalizeExternalResearchSource).filter((source): source is ExternalResearchSource => source !== null)
      : [],
    externalResearchRuns: Array.isArray(session.externalResearchRuns)
      ? session.externalResearchRuns.slice(-20).map(normalizeExternalResearchRun).filter((run): run is ExternalResearchRun => run !== null)
      : [],
    sourceTrace: Array.isArray(session.sourceTrace) ? session.sourceTrace.slice(0, MAX_CONTEXT_SOURCES).map(normalizeSource).filter((source): source is AiWorkspaceSourceTrace => source !== null) : [],
    proposals: Array.isArray(session.proposals) ? session.proposals.slice(0, MAX_PROPOSALS).map(normalizeProposal).filter((proposal): proposal is AiWorkspaceProposal => proposal !== null) : [],
  };
}

export function normalizeAiWorkspaceDocument(value: unknown): AiWorkspaceDocument {
  const document = record(value);
  if (!document
    || typeof document.formatVersion !== "number"
    || typeof document.projectId !== "string"
    || document.formatVersion !== 1
    || !validTimestamp(document.updatedAt)
    || !Array.isArray(document.sessions)) {
    throw { code: "INVALID_AI_WORKSPACE_HISTORY", message: "Saved AI Workspace history could not be loaded safely." };
  }
  const sessions: AiWorkspaceSession[] = [];
  const sessionIds = new Set<string>();
  let skippedSessions = 0;
  let skippedNestedRecords = 0;
  const excessSessions = Math.max(0, document.sessions.length - MAX_SESSIONS);
  for (const value of document.sessions.slice(0, MAX_SESSIONS)) {
    const session = normalizeSession(value, document.projectId);
    if (!session || sessionIds.has(session.id)) {
      skippedSessions += 1;
      continue;
    }
    sessionIds.add(session.id);
    const rawSession = record(value)!;
    if (Array.isArray(rawSession.messages)) skippedNestedRecords += rawSession.messages.length - session.messages.length;
    if (Array.isArray(rawSession.proposals)) skippedNestedRecords += rawSession.proposals.length - session.proposals.length;
    if (Array.isArray(rawSession.sourceTrace)) skippedNestedRecords += rawSession.sourceTrace.length - session.sourceTrace.length;
    sessions.push(session);
  }
  const recoveryWarnings = [
    ...(skippedSessions > 0 ? [`${skippedSessions} malformed session${skippedSessions === 1 ? " was" : "s were"} skipped.`] : []),
    ...(excessSessions > 0 ? ["Session history exceeded the display bound; excess sessions were skipped."] : []),
    ...(skippedNestedRecords > 0 ? ["Malformed session content was skipped."] : []),
  ];
  return {
    formatVersion: document.formatVersion,
    projectId: document.projectId,
    updatedAt: document.updatedAt,
    sessions,
    ...(recoveryWarnings.length > 0 ? { recoveryWarnings } : {}),
  };
}

async function invokeDocument(command: string, args: Record<string, unknown>): Promise<AiWorkspaceDocument> {
  return normalizeAiWorkspaceDocument(await invoke<unknown>(command, args));
}

export function listAiWorkspaceProfiles(): Promise<AiWorkspaceProfile[]> {
  return invoke<AiWorkspaceProfile[]>("list_ai_workspace_profiles");
}

export function loadAiWorkspaceSessions(path: string): Promise<AiWorkspaceDocument | null> {
  return invoke<unknown>("load_ai_workspace_sessions", { path }).then((value) => value === null ? null : normalizeAiWorkspaceDocument(value));
}

export function createAiWorkspaceSession(
  rootPath: string,
  projectId: string,
  surface: string,
  purpose: string,
  specialistProfileId: string,
  title: string,
): Promise<AiWorkspaceDocument> {
  return invokeDocument("create_ai_workspace_session", {
    request: { rootPath, projectId, surface, purpose, specialistProfileId, title },
  });
}

export function appendAiWorkspaceMessage(
  rootPath: string,
  projectId: string,
  sessionId: string,
  role: AiWorkspaceMessageRole,
  content: string,
  sourceTrace: AiWorkspaceSourceTrace[] = [],
  usageReference?: AiWorkspaceUsageReference,
): Promise<AiWorkspaceDocument> {
  return invokeDocument("append_ai_workspace_message", {
    request: { rootPath, projectId, sessionId, role, content, sourceTrace, usageReference },
  });
}

export function archiveAiWorkspaceSession(
  rootPath: string,
  projectId: string,
  sessionId: string,
): Promise<AiWorkspaceDocument> {
  return invokeDocument("archive_ai_workspace_session", {
    request: { rootPath, projectId, sessionId },
  });
}

export function reopenAiWorkspaceSession(
  rootPath: string,
  projectId: string,
  sessionId: string,
): Promise<AiWorkspaceDocument> {
  return invokeDocument("reopen_ai_workspace_session", {
    request: { rootPath, projectId, sessionId },
  });
}

export function deleteAiWorkspaceSession(
  rootPath: string,
  projectId: string,
  sessionId: string,
): Promise<AiWorkspaceDocument> {
  return invokeDocument("delete_ai_workspace_session", {
    request: { rootPath, projectId, sessionId },
  });
}

export function createAiWorkspaceProposal(
  rootPath: string,
  projectId: string,
  sessionId: string,
  proposalType: AiWorkspaceProposalType,
  title: string,
  summary: string,
  sourceTrace: AiWorkspaceSourceTrace[] = [],
  proposedEdit?: AiWorkspaceProposedEdit,
): Promise<AiWorkspaceDocument> {
  return invokeDocument("create_ai_workspace_proposal", {
    request: { rootPath, projectId, sessionId, proposalType, title, summary, sourceTrace, proposedEdit },
  });
}

export function reviewAiWorkspaceProposal(
  rootPath: string,
  projectId: string,
  sessionId: string,
  proposalId: string,
  status: AiWorkspaceProposalStatus,
): Promise<AiWorkspaceDocument> {
  return invokeDocument("review_ai_workspace_proposal", {
    request: { rootPath, projectId, sessionId, proposalId, status },
  });
}

export function updateAiWorkspaceProposal(
  rootPath: string,
  projectId: string,
  sessionId: string,
  proposalId: string,
  title: string,
  summary: string,
  reason?: string,
): Promise<AiWorkspaceDocument> {
  return invokeDocument("update_ai_workspace_proposal", {
    request: { rootPath, projectId, sessionId, proposalId, title, summary, reason },
  });
}

export function buildAiWorkspaceContext(
  rootPath: string,
  projectId: string,
  sources: AiWorkspaceContextSourceRequest[],
): Promise<AiWorkspaceContextPlan> {
  return invoke<AiWorkspaceContextPlan>("build_ai_workspace_context", {
    request: { rootPath, projectId, sources },
  });
}

export function archiveAndResetAiWorkspaceHistory(path: string): Promise<AiWorkspaceRecovery> {
  return invoke<AiWorkspaceRecovery>("archive_and_reset_ai_workspace_history", { path }).then((recovery) => ({
    ...recovery,
    document: normalizeAiWorkspaceDocument(recovery.document),
  }));
}

export function setAiWorkspaceMarkdownContext(
  rootPath: string,
  projectId: string,
  sessionId: string,
  relativePaths: string[],
): Promise<AiWorkspaceDocument> {
  return invokeDocument("set_ai_workspace_markdown_context", {
    request: { rootPath, projectId, sessionId, relativePaths },
  });
}

export interface AiWorkspaceApplyResult {
  document: AiWorkspaceDocument;
  target: "PROJECT_KNOWLEDGE" | "DECISION" | "OPEN_QUESTION";
  targetId: string;
}

export function applyAiWorkspaceProposal(
  rootPath: string,
  projectId: string,
  sessionId: string,
  proposalId: string,
): Promise<AiWorkspaceApplyResult> {
  return invoke<AiWorkspaceApplyResult>("apply_ai_workspace_proposal", {
    request: { rootPath, projectId, sessionId, proposalId },
  }).then((result) => ({ ...result, document: normalizeAiWorkspaceDocument(result.document) }));
}
