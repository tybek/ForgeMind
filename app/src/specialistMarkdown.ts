import type {
  BehaviorDesignerResult,
  SpecialistDiagnostics,
  SpecialistRunUsage,
  SpecialistTaskType,
} from "./platform/specialists";

export interface SpecialistMarkdownSource {
  taskType: SpecialistTaskType;
  result: BehaviorDesignerResult;
  scenario: string;
  model: string;
  timestamp?: string;
  compendiumReferences: string[];
  decisionReferences: string[];
  usage: SpecialistRunUsage;
  effectiveCompletionBudget?: number;
}

export interface SpecialistDiagnosticsMarkdownSource {
  taskType: SpecialistTaskType;
  scenario: string;
  model: string;
  timestamp: string;
  errorCode: string;
  diagnostics?: SpecialistDiagnostics;
  compendiumReferences: string[];
  decisionReferences: string[];
  usage: SpecialistRunUsage;
  effectiveCompletionBudget?: number;
}

function markdownList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None provided.";
}

function metadataValue(value: number | undefined, suffix = ""): string {
  return value === undefined ? "Not provided" : `${value}${suffix}`;
}

export function formatSpecialistResultMarkdown(source: SpecialistMarkdownSource): string {
  const context = [
    ...source.compendiumReferences.map((title) => `- Compendium: ${title}`),
    ...source.decisionReferences.map((title) => `- Approved Decision: ${title}`),
  ];
  const metadata = [
    `- Model: ${source.model}`,
    ...(source.timestamp ? [`- Timestamp: ${source.timestamp}`] : []),
    `- Latency: ${metadataValue(source.usage.latencyMs, " ms")}`,
    `- Input tokens: ${metadataValue(source.usage.inputTokens)}`,
    `- Output tokens: ${metadataValue(source.usage.outputTokens)}`,
    `- Total tokens: ${metadataValue(source.usage.totalTokens)}`,
    `- Effective completion budget: ${metadataValue(source.effectiveCompletionBudget)}`,
  ];

  return [
    `# AI Behavior Designer — ${source.taskType}`,
    "",
    "## Scenario / Question",
    source.scenario,
    "",
    "## Analysis Result",
    source.result.summary,
    "",
    "## Assumptions — not project facts",
    markdownList(source.result.assumptions),
    "",
    "## Recommendations",
    markdownList(source.result.recommendations),
    "",
    "## Risks",
    markdownList(source.result.risks),
    "",
    "## Likely Exploits",
    markdownList(source.result.exploits),
    "",
    "## Open Questions",
    markdownList(source.result.openQuestions),
    "",
    "## Suggested Tests",
    markdownList(source.result.suggestedTests),
    "",
    "## Context Used",
    context.length > 0 ? context.join("\n") : "- No project references selected.",
    "",
    "## Run Metadata",
    metadata.join("\n"),
  ].join("\n");
}

export function formatSpecialistDiagnosticsMarkdown(source: SpecialistDiagnosticsMarkdownSource): string {
  const context = [
    ...source.compendiumReferences.map((title) => `- Compendium: ${title}`),
    ...source.decisionReferences.map((title) => `- Approved Decision: ${title}`),
  ];
  const diagnostics = source.diagnostics;
  const safeDiagnostics = [
    `- Finish reason: ${diagnostics?.finishReason ?? "Unavailable"}`,
    `- Readable text present: ${diagnostics?.readableTextPresent === undefined ? "Unavailable" : diagnostics.readableTextPresent ? "Yes" : "No"}`,
    `- JSON extracted: ${diagnostics?.jsonExtractionSucceeded === undefined ? "Unavailable" : diagnostics.jsonExtractionSucceeded ? "Yes" : "No"}`,
    `- Missing fields: ${diagnostics?.missingFields?.join(", ") || "None"}`,
    `- Invalid field types: ${diagnostics?.invalidFieldTypes?.join(", ") || "None"}`,
    `- Unknown fields: ${diagnostics?.unknownFields?.join(", ") || "None"}`,
    `- List bound exceeded: ${diagnostics?.listBoundExceeded ?? "None"}`,
    `- Validation issue: ${diagnostics?.validationIssue ?? "None"}`,
    `- HTTP status: ${diagnostics?.httpStatus ?? "Unavailable"}`,
    `- Provider error code: ${diagnostics?.providerErrorCode ?? "Unavailable"}`,
    `- Provider error type: ${diagnostics?.providerErrorType ?? "Unavailable"}`,
    `- Rejected parameter: ${diagnostics?.rejectedParameter ?? "Not identified"}`,
    `- Preferred task budget: ${metadataValue(diagnostics?.preferredTaskBudget)}`,
    `- Configured completion budget: ${metadataValue(diagnostics?.configuredCompletionBudget)}`,
    `- Effective completion budget: ${metadataValue(diagnostics?.effectiveCompletionBudget)}`,
    `- Known model maximum: ${metadataValue(diagnostics?.knownModelMaxCompletionTokens)}`,
    `- Diagnostic model: ${diagnostics?.modelId ?? "Unavailable"}`,
    `- Reasoning requested: ${diagnostics?.reasoningRequested === undefined ? "Unavailable" : diagnostics.reasoningRequested ? "Yes" : "No"}`,
    `- Structured output requested: ${diagnostics?.structuredOutputRequested === undefined ? "Unavailable" : diagnostics.structuredOutputRequested ? "Yes" : "No"}`,
  ];

  return [
    `# AI Behavior Designer Diagnostics - ${source.taskType}`,
    "",
    "## Scenario / Question",
    source.scenario,
    "",
    "## Failure",
    `- Error code: ${source.errorCode}`,
    ...safeDiagnostics,
    "",
    "## Context Used",
    context.length > 0 ? context.join("\n") : "- No project references selected.",
    "",
    "## Run Metadata",
    `- Model: ${source.model}`,
    `- Timestamp: ${source.timestamp}`,
    `- Latency: ${metadataValue(source.usage.latencyMs, " ms")}`,
    `- Input tokens: ${metadataValue(source.usage.inputTokens)}`,
    `- Output tokens: ${metadataValue(source.usage.outputTokens)}`,
    `- Total tokens: ${metadataValue(source.usage.totalTokens)}`,
    `- Effective completion budget: ${metadataValue(source.effectiveCompletionBudget)}`,
  ].join("\n");
}
