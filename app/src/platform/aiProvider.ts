import { invoke } from "@tauri-apps/api/core";
import type { TaskCategory } from "./usageMetering";

export interface AIRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
}

export interface AIResponse {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  finishReason?: string;
  providerRequestId?: string;
}

export interface AIProviderDiagnostics {
  httpStatus?: number;
  responseObject?: string;
  finishReason?: string;
  choicesPresent: boolean;
  messageContentPresent: boolean;
  reasoningContentPresent: boolean;
  refusalPresent: boolean;
  toolCallsPresent: boolean;
  reasoningTokens?: number;
  providerRequestId?: string;
  providerErrorCode?: string;
  providerErrorType?: string;
}

export interface AIProviderError {
  code: string;
  message: string;
  diagnostics?: AIProviderDiagnostics;
}

export interface EvaluationContext {
  projectId?: string;
  taskCategory?: TaskCategory;
}

export async function runEvaluation(
  request: AIRequest,
  context: EvaluationContext = {},
): Promise<AIResponse> {
  return invoke<AIResponse>("run_ai_evaluation", {
    request,
    projectId: context.projectId,
    taskCategory: context.taskCategory,
  });
}
