import { invoke } from "@tauri-apps/api/core";
import {
  normalizeAiWorkspaceDocument,
  type AiWorkspaceDocument,
  type AiWorkspaceSourceTrace,
  type AiWorkspaceUsageReference,
} from "./aiWorkspace";
import type { ModelEntry } from "./modelRegistry";
import type { TaskCategory } from "./usageMetering";

export type WritersRoomRunMode = "SEND" | "REGENERATE";

export interface WritersRoomTokenEstimate {
  minimum: number;
  maximum: number;
}

export interface WritersRoomLatencyHistory {
  observationCount: number;
  lastMs: number;
  minimumMs: number;
  maximumMs: number;
}

export interface WritersRoomCostRange {
  minimumUsd: number;
  maximumUsd: number;
}

export interface WritersRoomPreflight {
  taskLabel: string;
  profileId: string;
  profileName: string;
  provider: string;
  nemotronProvider: string;
  externalResearchProvider?: "Tavily";
  modelId: string;
  defaultModelId: string;
  models: ModelEntry[];
  contextSummary: string[];
  sourceTrace: AiWorkspaceSourceTrace[];
  estimatedInputTokens: WritersRoomTokenEstimate;
  usageBand: "low" | "medium" | "high";
  estimatedCostUsd?: WritersRoomCostRange;
  historicalLatency?: WritersRoomLatencyHistory;
  historyAvailable: boolean;
}

export interface WritersRoomRunResult {
  document: AiWorkspaceDocument;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  usageReference: AiWorkspaceUsageReference;
}

export interface WritersRoomUsageRecord {
  timestamp: string;
  sessionId: string;
  projectId?: string;
  provider: string;
  modelId: string;
  taskCategory?: TaskCategory;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
  success: boolean;
  structuredOutputSuccess?: boolean;
  errorCategory?: string;
}

export function loadWritersRoomPreflight(input: {
  rootPath: string;
  projectId: string;
  sessionId: string;
  mode: WritersRoomRunMode;
  message?: string;
  modelId?: string;
}): Promise<WritersRoomPreflight> {
  return invoke<WritersRoomPreflight>("get_writers_room_preflight", { request: input });
}

export function runWritersRoom(input: {
  rootPath: string;
  projectId: string;
  sessionId: string;
  modelId: string;
  mode: WritersRoomRunMode;
  message?: string;
}): Promise<WritersRoomRunResult> {
  return invoke<WritersRoomRunResult>("run_writers_room", { request: input }).then((result) => {
    try {
      return { ...result, document: normalizeAiWorkspaceDocument(result.document) };
    } catch {
      throw {
        code: "AI_WORKSPACE_RESPONSE_RENDER_FAILED",
        message: "The response was saved, but Writers' Room could not display it safely. Reload the saved session without sending another request.",
      };
    }
  });
}

export function loadWritersRoomUsage(projectId: string): Promise<WritersRoomUsageRecord[]> {
  return invoke<unknown>("load_writers_room_usage", { projectId }).then((value) => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((candidate): WritersRoomUsageRecord[] => {
      if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return [];
      const record = candidate as Record<string, unknown>;
      if (typeof record.timestamp !== "string" || Number.isNaN(Date.parse(record.timestamp))
        || typeof record.sessionId !== "string"
        || record.projectId !== projectId
        || typeof record.provider !== "string"
        || typeof record.modelId !== "string"
        || record.taskCategory !== "narrative_workspace"
        || typeof record.success !== "boolean") return [];
      const optionalNumber = (field: string): number | undefined => {
        const item = record[field];
        return typeof item === "number" && Number.isFinite(item) && item >= 0 ? item : undefined;
      };
      return [{
        timestamp: record.timestamp,
        sessionId: record.sessionId,
        projectId,
        provider: record.provider,
        modelId: record.modelId,
        taskCategory: "narrative_workspace",
        inputTokens: optionalNumber("inputTokens"),
        outputTokens: optionalNumber("outputTokens"),
        totalTokens: optionalNumber("totalTokens"),
        latencyMs: optionalNumber("latencyMs"),
        estimatedCostUsd: optionalNumber("estimatedCostUsd"),
        success: record.success,
        ...(typeof record.structuredOutputSuccess === "boolean" ? { structuredOutputSuccess: record.structuredOutputSuccess } : {}),
        ...(typeof record.errorCategory === "string" ? { errorCategory: record.errorCategory } : {}),
      }];
    });
  });
}
