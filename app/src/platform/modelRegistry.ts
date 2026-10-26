import { invoke } from "@tauri-apps/api/core";

export interface ModelPricing {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export interface ModelCapabilities {
  maxCompletionTokens?: number;
  supportsReasoningEffort?: boolean;
  structuredOutput?: "NONE" | "JSON_OBJECT" | "JSON_SCHEMA";
}

export interface ModelEntry {
  provider: string;
  modelId: string;
  displayName: string;
  family: string;
  vendor?: string;
  category?: string;
  availability: string;
  pricing?: ModelPricing;
  notes?: string;
  capabilities: ModelCapabilities;
  enabled: boolean;
}

export function loadModelRegistry(): Promise<ModelEntry[]> {
  return invoke<ModelEntry[]>("list_models");
}
