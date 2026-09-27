import { invoke } from "@tauri-apps/api/core";
import type { ModelEntry } from "./modelRegistry";

export type CreatorAiTask = "coreLoop" | "designPillars";

export interface CreatorAiContext {
  workingTitle: string;
  genre: string;
  mode: string;
  perspective: string;
  targetPlatform: string;
  pitch: string;
  playerExperience: string;
  currentCoreLoop: string;
  setting: string;
  tone: string;
  engine: string;
  teamSize: string;
  expectedScope: string;
  majorConstraints: string;
}

export interface CreatorAiMetadata {
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface CoreLoopProposal {
  title: string;
  description: string;
  rationale?: string;
  assumptions?: string[];
}

export interface CoreLoopProposalResult extends CreatorAiMetadata {
  note?: string;
  proposals: CoreLoopProposal[];
}

export interface PillarProposal {
  title: string;
  description: string;
  assumptions?: string[];
}

export interface PillarProposalResult extends CreatorAiMetadata {
  note?: string;
  proposals: PillarProposal[];
}

export interface CreatorAiError {
  code: string;
  message: string;
}

export interface CreatorAiTokenEstimate {
  minimum: number;
  maximum: number;
}

export interface CreatorAiLatencyHistory {
  observationCount: number;
  lastMs: number;
  minimumMs: number;
  maximumMs: number;
}

export interface CreatorAiCostRange {
  minimumUsd: number;
  maximumUsd: number;
}

export interface CreatorAiPreflight {
  task: CreatorAiTask;
  taskLabel: string;
  provider: string;
  modelId: string;
  defaultModelId: string;
  models: ModelEntry[];
  contextFields: string[];
  estimatedInputTokens: CreatorAiTokenEstimate;
  usageBand: "low" | "medium" | "high";
  estimatedCostUsd?: CreatorAiCostRange;
  historicalLatency?: CreatorAiLatencyHistory;
  historyAvailable: boolean;
}

export function loadCreatorAiPreflight(
  task: CreatorAiTask,
  context: CreatorAiContext,
  modelId?: string,
): Promise<CreatorAiPreflight> {
  return invoke<CreatorAiPreflight>("get_creator_ai_preflight", { request: { task, context, modelId } });
}

export function suggestNewProjectCoreLoops(context: CreatorAiContext, modelId: string): Promise<CoreLoopProposalResult> {
  return invoke<CoreLoopProposalResult>("suggest_new_project_core_loops", { request: { context, modelId } });
}

export function suggestNewProjectDesignPillars(context: CreatorAiContext, modelId: string): Promise<PillarProposalResult> {
  return invoke<PillarProposalResult>("suggest_new_project_design_pillars", { request: { context, modelId } });
}
