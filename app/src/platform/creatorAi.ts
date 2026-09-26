import { invoke } from "@tauri-apps/api/core";

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
}

export interface CoreLoopProposalResult extends CreatorAiMetadata {
  note?: string;
  proposals: CoreLoopProposal[];
}

export interface PillarProposal {
  title: string;
  description: string;
}

export interface PillarProposalResult extends CreatorAiMetadata {
  note?: string;
  proposals: PillarProposal[];
}

export interface CreatorAiError {
  code: string;
  message: string;
}

export function suggestNewProjectCoreLoops(context: CreatorAiContext): Promise<CoreLoopProposalResult> {
  return invoke<CoreLoopProposalResult>("suggest_new_project_core_loops", { request: { context } });
}

export function suggestNewProjectDesignPillars(context: CreatorAiContext): Promise<PillarProposalResult> {
  return invoke<PillarProposalResult>("suggest_new_project_design_pillars", { request: { context } });
}
