import { invoke } from "@tauri-apps/api/core";

export interface AIRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
}

export interface AIProviderError {
  code: string;
  message: string;
}

export async function runEvaluation(request: AIRequest): Promise<AIResponse> {
  return invoke<AIResponse>("run_ai_evaluation", { request });
}
