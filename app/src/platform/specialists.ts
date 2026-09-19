import { invoke } from "@tauri-apps/api/core";

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

export interface SpecialistAnalysisRequest {
  rootPath: string;
  projectId: string;
  profileId: string;
  taskType: SpecialistTaskType;
  modelId: string;
  knowledgeEntryIds: string[];
  decisionIds: string[];
  scenario: string;
}

export interface SpecialistAnalysisResult {
  profileId: string;
  taskType: SpecialistTaskType;
  selectedKnowledgeEntryIds: string[];
  selectedDecisionIds: string[];
  result: BehaviorDesignerResult;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
}

export function loadSpecialistProfiles(): Promise<SpecialistProfile[]> {
  return invoke<SpecialistProfile[]>("list_specialist_profiles");
}

export function runSpecialistAnalysis(
  request: SpecialistAnalysisRequest,
): Promise<SpecialistAnalysisResult> {
  return invoke<SpecialistAnalysisResult>("run_specialist_analysis", { request });
}
