import type {
  BehaviorDesignerResult,
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
