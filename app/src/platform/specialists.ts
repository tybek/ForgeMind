import { invoke } from "@tauri-apps/api/core";
import type { KnowledgeArea } from "./projectKnowledge";

export const SPECIALIST_TASK_TYPES = [
  "DESIGN_BEHAVIOR",
  "REVIEW_BEHAVIOR",
  "COMPETENCE_TIERS",
  "REACTION_MODEL",
  "EXPLOIT_ANALYSIS",
  "BEHAVIOR_CONTRACT",
] as const;

export type SpecialistTaskType = (typeof SPECIALIST_TASK_TYPES)[number];

export interface SpecialistProfile {
  id: string;
  displayName: string;
  description: string;
  supportedTaskTypes: SpecialistTaskType[];
  defaultTaskType: SpecialistTaskType;
  taskGuidance: SpecialistTaskGuidance[];
  maxRunCompletionTokens: number;
}

export interface SpecialistTaskGuidance {
  taskType: SpecialistTaskType;
  preferredCompletionTokens: number;
  recommendedCompendiumAreas: KnowledgeArea[];
  preferredDecisionAreas: KnowledgeArea[];
}

export interface BehaviorDesignerResult {
  summary: string;
  assumptions: string[];
  recommendations: string[];
  risks: string[];
  exploits: string[];
  openQuestions: string[];
  suggestedTests: string[];
}

export interface SpecialistNormalizationNotice {
  field: string;
  returnedItems: number;
  retainedItems: number;
}

export interface SpecialistAnalysisRequest {
  rootPath: string;
  projectId: string;
  profileId: string;
  taskType: SpecialistTaskType;
  modelId: string;
  knowledgeEntryIds: string[];
  decisionIds: string[];
  maxCompletionTokens?: number;
  scenario: string;
}

export interface SpecialistAnalysisResult {
  profileId: string;
  taskType: SpecialistTaskType;
  selectedKnowledgeEntryIds: string[];
  selectedDecisionIds: string[];
  result: BehaviorDesignerResult;
  normalizationNotices: SpecialistNormalizationNotice[];
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  historyWarning?: SpecialistHistoryWarning;
  preferredTaskBudget: number;
  effectiveCompletionBudget: number;
  knownModelMaxCompletionTokens?: number;
}

export interface SpecialistHistoryWarning {
  code: string;
  message: string;
}

export interface SpecialistDiagnostics {
  finishReason?: string;
  readableTextPresent?: boolean;
  jsonExtractionSucceeded?: boolean;
  missingFields?: string[];
  invalidFieldTypes?: string[];
  unknownFields?: string[];
  listBoundExceeded?: string;
  validationIssue?: string;
  httpStatus?: number;
  providerErrorCode?: string;
  providerErrorType?: string;
  rejectedParameter?: string;
  preferredTaskBudget?: number;
  configuredCompletionBudget?: number;
  effectiveCompletionBudget?: number;
  knownModelMaxCompletionTokens?: number;
  modelId?: string;
  reasoningRequested?: boolean;
  structuredOutputRequested?: boolean;
}

export interface SpecialistError {
  code: string;
  message: string;
  diagnostics?: SpecialistDiagnostics;
}

export interface SpecialistRunUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
}

export interface SpecialistSafeError {
  code: string;
  diagnostics?: SpecialistDiagnostics;
}

export interface SpecialistRun {
  id: string;
  createdAt: string;
  specialistProfileId: string;
  taskType: SpecialistTaskType;
  modelId: string;
  selectedKnowledgeEntryIds: string[];
  selectedDecisionIds: string[];
  scenario: string;
  status: "SUCCEEDED" | "FAILED";
  result?: BehaviorDesignerResult;
  normalizationNotices?: SpecialistNormalizationNotice[];
  safeError?: SpecialistSafeError;
  usage: SpecialistRunUsage;
  preferredTaskBudget?: number;
  effectiveCompletionBudget?: number;
  knownModelMaxCompletionTokens?: number;
}

export interface SpecialistRunsDocument {
  formatVersion: number;
  projectId: string;
  updatedAt: string;
  runs: SpecialistRun[];
}

export interface SpecialistHistoryRecovery {
  document: SpecialistRunsDocument;
  archivedFileName?: string;
}

export function loadSpecialistProfiles(): Promise<SpecialistProfile[]> {
  return invoke<SpecialistProfile[]>("list_specialist_profiles");
}

export function runSpecialistAnalysis(
  request: SpecialistAnalysisRequest,
): Promise<SpecialistAnalysisResult> {
  return invoke<SpecialistAnalysisResult>("run_specialist_analysis", { request });
}

export function loadSpecialistRuns(path: string): Promise<SpecialistRunsDocument | null> {
  return invoke<SpecialistRunsDocument | null>("load_specialist_runs", { path });
}

export function archiveAndResetSpecialistHistory(path: string): Promise<SpecialistHistoryRecovery> {
  return invoke<SpecialistHistoryRecovery>("archive_and_reset_specialist_history", { path });
}
