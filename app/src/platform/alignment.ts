import { invoke } from "@tauri-apps/api/core";
import type { KnowledgeArea } from "./projectKnowledge";

export type IntentSourceType = "COMPENDIUM" | "DECISION";
export type RealitySource = "GIT" | "UNITY";
export type EvidenceAssessment = "SUPPORTS" | "CONTRADICTS" | "INSUFFICIENT";
export type AlignmentStatus = "ALIGNED" | "UNVERIFIED" | "OUT_OF_SYNC" | "CONFLICT";
export type AlignmentConfidence = "LOW" | "MEDIUM" | "HIGH";
export type AlignmentReviewState = "PENDING_REVIEW" | "APPROVED" | "REJECTED";
export type AlignmentProvenance =
  | "DOCUMENTED"
  | "APPROVED_INTENT"
  | "VERIFIED_FROM_GIT"
  | "VERIFIED_FROM_UNITY"
  | "MANUAL_ASSESSMENT"
  | "AI_INFERENCE";

export interface IntentSourceOption {
  sourceType: IntentSourceType;
  sourceId: string;
  title: string;
  statement: string;
  status: string;
  area: KnowledgeArea;
  provenance: AlignmentProvenance;
}

export interface RealityEvidenceCandidate {
  id: string;
  source: RealitySource;
  summary: string;
  capturedAt: string;
  provenance: AlignmentProvenance;
}

export interface AlignmentSourceCatalog {
  projectId: string;
  intentSources: IntentSourceOption[];
  realityEvidence: RealityEvidenceCandidate[];
}

export interface RealityEvidenceReference {
  evidenceId: string;
  source: RealitySource;
  summary: string;
  capturedAt: string;
  provenance: AlignmentProvenance;
  assessment: EvidenceAssessment;
}

export interface AlignmentResult {
  id: string;
  createdAt: string;
  intent: IntentSourceOption;
  conflictingIntent?: IntentSourceOption;
  evidence: RealityEvidenceReference[];
  status: AlignmentStatus;
  rationale: string;
  confidence: AlignmentConfidence;
  uncertainty: string;
  provenance: AlignmentProvenance[];
  reviewState: AlignmentReviewState;
  reviewedAt?: string;
}

export interface AlignmentDocument {
  formatVersion: number;
  projectId: string;
  updatedAt: string;
  results: AlignmentResult[];
}

export interface AlignmentCheckInput {
  intentSourceType: IntentSourceType;
  intentSourceId: string;
  conflictingDecisionId?: string | null;
  evidence: Array<{ evidenceId: string; assessment: EvidenceAssessment }>;
  rationale: string;
  confidence: AlignmentConfidence;
  uncertainty: string;
}

export function loadAlignmentSources(path: string): Promise<AlignmentSourceCatalog> {
  return invoke<AlignmentSourceCatalog>("load_alignment_sources", { path });
}

export function loadAlignmentResults(path: string): Promise<AlignmentDocument | null> {
  return invoke<AlignmentDocument | null>("load_alignment_results", { path });
}

export function createAlignmentReview(
  rootPath: string,
  projectId: string,
  input: AlignmentCheckInput,
): Promise<AlignmentDocument> {
  return invoke<AlignmentDocument>("create_alignment_review", {
    request: { rootPath, projectId, ...input },
  });
}

export function reviewAlignmentResult(
  rootPath: string,
  projectId: string,
  resultId: string,
  reviewState: Exclude<AlignmentReviewState, "PENDING_REVIEW">,
): Promise<AlignmentDocument> {
  return invoke<AlignmentDocument>("review_alignment_result", {
    request: { rootPath, projectId, resultId, reviewState },
  });
}
