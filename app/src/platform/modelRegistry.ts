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

export type StructuredOutputCapability = "NONE" | "JSON_OBJECT" | "JSON_SCHEMA";

export function structuredOutputCapability(model: ModelEntry): StructuredOutputCapability {
  return model.capabilities.structuredOutput ?? "NONE";
}

export function supportsStructuredOutput(model: ModelEntry, required: Exclude<StructuredOutputCapability, "NONE"> = "JSON_OBJECT"): boolean {
  const capability = structuredOutputCapability(model);
  return capability === "JSON_SCHEMA" || capability === required;
}

export function structuredWorkflowModelLabel(model: ModelEntry, defaultModelId?: string): string {
  if (!supportsStructuredOutput(model)) return `${model.displayName} — incompatible: structured output not verified`;
  return `${model.displayName}${model.modelId === defaultModelId ? " — default" : ""}`;
}

export function loadModelRegistry(): Promise<ModelEntry[]> {
  return invoke<ModelEntry[]>("list_models");
}

export interface AvailableModel {
  providerModelId: string;
  displayName: string;
  provider: string;
  discoveredAt: string;
  availability: "AVAILABLE";
}

export interface ModelCatalog {
  formatVersion: number;
  refreshedAt: string;
  models: AvailableModel[];
}

export interface ModelManagementState {
  providerConfigured: boolean;
  catalog?: ModelCatalog | null;
  registry: ModelEntry[];
}

export interface ObservedModelMetrics {
  provider: string;
  modelId: string;
  runCount: number;
  inputTokens: number;
  outputTokens: number;
  medianLatencyMs?: number | null;
  lastUsed: string;
}

export function loadModelManagementState(): Promise<ModelManagementState> {
  return invoke<ModelManagementState>("get_model_management_state");
}

export function refreshModelCatalog(): Promise<ModelManagementState> {
  return invoke<ModelManagementState>("refresh_model_catalog");
}

export function enableAvailableModel(modelId: string): Promise<ModelManagementState> {
  return invoke<ModelManagementState>("enable_available_model", { modelId });
}

export function setModelEnabled(modelId: string, enabled: boolean): Promise<ModelManagementState> {
  return invoke<ModelManagementState>("set_model_enabled", { modelId, enabled });
}

export function addCustomModel(modelId: string, displayName?: string): Promise<ModelManagementState> {
  return invoke<ModelManagementState>("add_custom_model", { modelId, displayName: displayName || null });
}

export function loadObservedModelMetrics(): Promise<ObservedModelMetrics[]> {
  return invoke<ObservedModelMetrics[]>("get_observed_model_metrics");
}
