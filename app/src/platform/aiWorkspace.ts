import { invoke } from "@tauri-apps/api/core";

export type AiWorkspaceSessionStatus = "ACTIVE" | "ARCHIVED";
export type AiWorkspaceMessageRole = "USER" | "ASSISTANT";
export type AiWorkspaceSourceType =
  | "COMPENDIUM"
  | "DECISION"
  | "OPEN_QUESTION"
  | "DOCUMENT"
  | "REALITY"
  | "AI_WORKSPACE_MESSAGE";
export type AiWorkspaceAuthority =
  | "AUTHORITATIVE_INTENT"
  | "ESTABLISHED_KNOWLEDGE"
  | "UNRESOLVED_KNOWLEDGE"
  | "DOCUMENTED"
  | "REALITY_EVIDENCE"
  | "AI_GENERATED";
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
  createdAt: string;
  sourceTrace: AiWorkspaceSourceTrace[];
  usageReference?: AiWorkspaceUsageReference;
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
  status: AiWorkspaceProposalStatus;
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
  sourceTrace: AiWorkspaceSourceTrace[];
  proposals: AiWorkspaceProposal[];
}

export interface AiWorkspaceDocument {
  formatVersion: number;
  projectId: string;
  updatedAt: string;
  sessions: AiWorkspaceSession[];
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

export function listAiWorkspaceProfiles(): Promise<AiWorkspaceProfile[]> {
  return invoke<AiWorkspaceProfile[]>("list_ai_workspace_profiles");
}

export function loadAiWorkspaceSessions(path: string): Promise<AiWorkspaceDocument | null> {
  return invoke<AiWorkspaceDocument | null>("load_ai_workspace_sessions", { path });
}

export function createAiWorkspaceSession(
  rootPath: string,
  projectId: string,
  surface: string,
  purpose: string,
  specialistProfileId: string,
  title: string,
): Promise<AiWorkspaceDocument> {
  return invoke<AiWorkspaceDocument>("create_ai_workspace_session", {
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
  return invoke<AiWorkspaceDocument>("append_ai_workspace_message", {
    request: { rootPath, projectId, sessionId, role, content, sourceTrace, usageReference },
  });
}

export function archiveAiWorkspaceSession(
  rootPath: string,
  projectId: string,
  sessionId: string,
): Promise<AiWorkspaceDocument> {
  return invoke<AiWorkspaceDocument>("archive_ai_workspace_session", {
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
  return invoke<AiWorkspaceDocument>("create_ai_workspace_proposal", {
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
  return invoke<AiWorkspaceDocument>("review_ai_workspace_proposal", {
    request: { rootPath, projectId, sessionId, proposalId, status },
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
  return invoke<AiWorkspaceRecovery>("archive_and_reset_ai_workspace_history", { path });
}
