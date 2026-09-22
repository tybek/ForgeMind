import { invoke } from "@tauri-apps/api/core";
import type {
  AlignmentProvenance,
  AlignmentReviewState,
  AlignmentStatus,
  RealitySource,
} from "./alignment";
import type { KnowledgeArea } from "./projectKnowledge";

export type FeatureContractSourceType = "ALIGNMENT" | "COMPENDIUM" | "DECISION";
export type FeatureContractStatus = "DRAFT" | "APPROVED" | "SUPERSEDED" | "DEPRECATED";
export type FeatureContractReviewState = "PENDING_REVIEW" | "APPROVED";

export interface FeatureContractEvidenceReference {
  evidenceId: string;
  source: RealitySource;
  summary: string;
  capturedAt: string;
  provenance: AlignmentProvenance;
}

export interface FeatureContractSourceOption {
  sourceType: FeatureContractSourceType;
  sourceId: string;
  title: string;
  statement: string;
  status: string;
  area: KnowledgeArea;
  provenance: AlignmentProvenance;
  preferred: boolean;
  alignmentRationale?: string;
  realityEvidence: FeatureContractEvidenceReference[];
}

export interface FeatureContractSourceCatalog {
  projectId: string;
  sources: FeatureContractSourceOption[];
}

export interface FeatureContractSourceReference {
  sourceType: FeatureContractSourceType;
  sourceId: string;
  title: string;
  statement: string;
  status: string;
  area: KnowledgeArea;
  provenance: AlignmentProvenance;
}

export interface FeatureContractAlignmentReference {
  alignmentId: string;
  status: AlignmentStatus;
  rationale: string;
  createdAt: string;
  reviewState: AlignmentReviewState;
}

export interface FeatureContractTrace {
  origin: FeatureContractSourceReference;
  intent: FeatureContractSourceReference;
  alignment?: FeatureContractAlignmentReference;
  realityEvidence: FeatureContractEvidenceReference[];
}

export interface FeatureContract {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  sources: FeatureContractTrace;
  goal: string;
  currentRealitySummary: string;
  affectedSystems: string[];
  requiredBehavior: string[];
  outOfScope: string[];
  risks: string[];
  acceptanceCriteria: string[];
  deterministicTests: string[];
  implementationNotes: string;
  likelyAffectedEvidenceIds: string[];
  status: FeatureContractStatus;
  reviewState: FeatureContractReviewState;
  reviewedAt?: string;
}

export interface FeatureContractsDocument {
  formatVersion: number;
  projectId: string;
  updatedAt: string;
  contracts: FeatureContract[];
}

export interface FeatureContractEditableFields {
  title: string;
  goal: string;
  affectedSystems: string[];
  requiredBehavior: string[];
  outOfScope: string[];
  risks: string[];
  acceptanceCriteria: string[];
  deterministicTests: string[];
  implementationNotes: string;
  likelyAffectedEvidenceIds: string[];
}

export interface FeatureContractDraftProposal {
  goal: string;
  affectedSystems: string[];
  requiredBehavior: string[];
  outOfScope: string[];
  risks: string[];
  acceptanceCriteria: string[];
  deterministicTests: string[];
  implementationNotes: string;
}

export interface FeatureContractAiDraftResult {
  proposal: FeatureContractDraftProposal;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export function loadFeatureContractSources(path: string): Promise<FeatureContractSourceCatalog> {
  return invoke<FeatureContractSourceCatalog>("load_feature_contract_sources", { path });
}

export function loadFeatureContracts(path: string): Promise<FeatureContractsDocument | null> {
  return invoke<FeatureContractsDocument | null>("load_feature_contracts", { path });
}

export function createFeatureContract(
  rootPath: string,
  projectId: string,
  sourceType: FeatureContractSourceType,
  sourceId: string,
): Promise<FeatureContractsDocument> {
  return invoke<FeatureContractsDocument>("create_feature_contract", {
    request: { rootPath, projectId, sourceType, sourceId },
  });
}

export function updateFeatureContract(
  rootPath: string,
  projectId: string,
  contractId: string,
  fields: FeatureContractEditableFields,
): Promise<FeatureContractsDocument> {
  return invoke<FeatureContractsDocument>("update_feature_contract", {
    request: { rootPath, projectId, contractId, ...fields },
  });
}

export function deleteFeatureContractDraft(
  rootPath: string,
  projectId: string,
  contractId: string,
): Promise<FeatureContractsDocument> {
  return invoke<FeatureContractsDocument>("delete_feature_contract_draft", {
    request: { rootPath, projectId, contractId },
  });
}

export function draftFeatureContractWithAi(
  rootPath: string,
  projectId: string,
  contractId: string,
  modelId: string,
  draft: FeatureContractEditableFields,
): Promise<FeatureContractAiDraftResult> {
  return invoke<FeatureContractAiDraftResult>("draft_feature_contract_with_ai", {
    request: { rootPath, projectId, contractId, modelId, draft },
  });
}

export function setFeatureContractStatus(
  rootPath: string,
  projectId: string,
  contractId: string,
  status: FeatureContractStatus,
): Promise<FeatureContractsDocument> {
  return invoke<FeatureContractsDocument>("set_feature_contract_status", {
    request: { rootPath, projectId, contractId, status },
  });
}

function bullets(items: string[], empty: string): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;
}

export function implementationBrief(contract: FeatureContract): string {
  const selectedEvidence = contract.sources.realityEvidence.filter((evidence) =>
    contract.likelyAffectedEvidenceIds.includes(evidence.evidenceId),
  );
  const why = [contract.sources.intent.statement];
  if (contract.sources.alignment) {
    why.push(`Approved Alignment ${contract.sources.alignment.status}: ${contract.sources.alignment.rationale}`);
  }
  const existing = [contract.currentRealitySummary];
  contract.sources.realityEvidence.forEach((evidence) => {
    existing.push(`${evidence.source} / ${evidence.provenance}: ${evidence.summary}`);
  });
  const affected = [
    ...contract.affectedSystems.map((system) => `User-scoped system: ${system}`),
    ...selectedEvidence.map((evidence) => `Evidence-supported location: ${evidence.summary}`),
  ];
  const brief = [
    "# Task",
    "",
    contract.title,
    "",
    "## Goal",
    "",
    contract.goal,
    "",
    "## Why this matters",
    "",
    why.join("\n\n"),
    "",
    "## Relevant existing behavior",
    "",
    bullets(existing, "Current Reality is not established."),
    "",
    "## Files/systems likely affected",
    "",
    bullets(affected, "No file or component location is established by current Reality evidence."),
    "",
    "## Required behavior",
    "",
    bullets(contract.requiredBehavior, "Not specified."),
    "",
    "## Non-goals",
    "",
    bullets(contract.outOfScope, "Not specified."),
    "",
    "## Data/security constraints",
    "",
    "- Keep project-owned data portable; do not persist absolute machine paths, secrets, credentials, raw provider output, or hidden AI reasoning.",
    "- Treat this Feature Contract as a derived delivery artifact; Compendium, approved Decisions, Alignment Reviews, Git Reality, and Unity GroundTruth remain authoritative in their own domains.",
    ...(contract.risks.length > 0 ? contract.risks.map((risk) => `- Risk/constraint: ${risk}`) : []),
    "",
    "## Tests required",
    "",
    bullets(contract.deterministicTests, "Not specified."),
    "",
    "## Validation commands",
    "",
    "- Use the repository's task-scoped validation ladder. Commands remain implementation-dependent until repository evidence identifies them.",
    "",
    "## Manual validation",
    "",
    "- Perform any visual, persistence, or runtime checks required by the affected systems; keep manual sign-off separate from automated completion.",
    "",
    "## Acceptance criteria",
    "",
    bullets(contract.acceptanceCriteria, "Not specified."),
    "",
    "## Stop condition",
    "",
    "Stop when the required behavior and acceptance criteria are satisfied by the deterministic tests. Do not broaden scope, perform autonomous follow-on work, or treat this brief as approval to change unrelated systems.",
  ].join("\n");
  return contract.status === "DRAFT" ? `DRAFT — NOT APPROVED\n\n${brief}` : brief;
}
