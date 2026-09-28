import { invoke } from "@tauri-apps/api/core";

export const TASK_CATEGORIES = [
  "general",
  "project_interview",
  "ai_behavior",
  "npc_design",
  "exploit_analysis",
  "encounter_design",
  "balance",
  "progression",
  "technical_analysis",
  "alignment",
  "feature_contract",
  "new_project_core_loop",
  "new_project_design_pillars",
  "narrative_workspace",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export interface UsageTotals {
  requests: number;
  successfulRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number | null;
  averageLatencyMs?: number | null;
}

export interface ModelUsageSummary extends UsageTotals {
  provider: string;
  modelId: string;
}

export interface UsageSummary {
  session: UsageTotals;
  project?: UsageTotals | null;
  byModel: ModelUsageSummary[];
}

export function loadUsageSummary(projectId?: string): Promise<UsageSummary> {
  return invoke<UsageSummary>("get_usage_summary", { projectId });
}
