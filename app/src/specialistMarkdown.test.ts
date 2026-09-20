import { describe, expect, it } from "vitest";
import { formatSpecialistDiagnosticsMarkdown, formatSpecialistResultMarkdown } from "./specialistMarkdown";

describe("specialist Markdown export", () => {
  it("formats every normalized result section, selected context, and safe run metadata", () => {
    const markdown = formatSpecialistResultMarkdown({
      taskType: "REACTION_MODEL",
      scenario: "A guard hears one gunshot.",
      result: {
        summary: "Investigate under uncertainty.", assumptions: ["The sound is audible."], recommendations: ["Orient before moving."],
        risks: ["Immediate pursuit appears omniscient."], exploits: ["Repeated sounds may pin the guard."], openQuestions: ["How long is memory retained?"],
        suggestedTests: ["Verify sound alone does not acquire a target."],
      },
      model: "test/model", timestamp: "2026-09-19T12:00:00Z", compendiumReferences: ["Imperfect information"], decisionReferences: ["No omniscience"],
      usage: { latencyMs: 42, inputTokens: 100, outputTokens: 50, totalTokens: 150 }, effectiveCompletionBudget: 4600,
    });

    expect(markdown).toContain("# AI Behavior Designer — REACTION_MODEL");
    expect(markdown).toContain("## Analysis Result\nInvestigate under uncertainty.");
    expect(markdown).toContain("## Assumptions — not project facts\n- The sound is audible.");
    expect(markdown).toContain("## Recommendations\n- Orient before moving.");
    expect(markdown).toContain("## Risks\n- Immediate pursuit appears omniscient.");
    expect(markdown).toContain("## Likely Exploits\n- Repeated sounds may pin the guard.");
    expect(markdown).toContain("## Open Questions\n- How long is memory retained?");
    expect(markdown).toContain("## Suggested Tests\n- Verify sound alone does not acquire a target.");
    expect(markdown).toContain("- Compendium: Imperfect information");
    expect(markdown).toContain("- Approved Decision: No omniscience");
    expect(markdown).toContain("- Model: test/model");
    expect(markdown).toContain("- Timestamp: 2026-09-19T12:00:00Z");
    expect(markdown).toContain("- Latency: 42 ms");
    expect(markdown).toContain("- Input tokens: 100");
    expect(markdown).toContain("- Output tokens: 50");
    expect(markdown).toContain("- Total tokens: 150");
    expect(markdown).toContain("- Effective completion budget: 4600");
  });

  it("ignores fields outside the normalized safe export contract", () => {
    const markdown = formatSpecialistResultMarkdown({
      taskType: "EXPLOIT_ANALYSIS", scenario: "Test scenario",
      result: { summary: "Safe summary", assumptions: [], recommendations: [], risks: [], exploits: [], openQuestions: [], suggestedTests: [] },
      model: "test/model", compendiumReferences: [], decisionReferences: [], usage: {},
      hiddenReasoning: "secret chain of thought", rawProviderResponse: "raw response", apiKey: "secret credential",
    } as Parameters<typeof formatSpecialistResultMarkdown>[0] & Record<string, unknown>);

    expect(markdown).not.toContain("secret chain of thought");
    expect(markdown).not.toContain("raw response");
    expect(markdown).not.toContain("secret credential");
  });

  it("formats failed runs from only scenario, metadata, context, and safe stored diagnostics", () => {
    const markdown = formatSpecialistDiagnosticsMarkdown({
      taskType: "REACTION_MODEL",
      scenario: "A guard hears one gunshot.",
      model: "test/model",
      timestamp: "2026-09-19T12:00:00Z",
      errorCode: "OUTPUT_TRUNCATED",
      diagnostics: { finishReason: "length", httpStatus: 400, missingFields: ["summary"] },
      compendiumReferences: ["Imperfect information"],
      decisionReferences: ["No omniscience"],
      usage: { latencyMs: 42, totalTokens: 150 },
      effectiveCompletionBudget: 4600,
      rawProviderResponse: "unsafe body",
      hiddenReasoning: "unsafe reasoning",
      apiKey: "unsafe credential",
    } as Parameters<typeof formatSpecialistDiagnosticsMarkdown>[0] & Record<string, unknown>);

    expect(markdown).toContain("# AI Behavior Designer Diagnostics - REACTION_MODEL");
    expect(markdown).toContain("- Error code: OUTPUT_TRUNCATED");
    expect(markdown).toContain("- Finish reason: length");
    expect(markdown).toContain("- HTTP status: 400");
    expect(markdown).toContain("- Compendium: Imperfect information");
    expect(markdown).toContain("- Approved Decision: No omniscience");
    expect(markdown).not.toContain("unsafe body");
    expect(markdown).not.toContain("unsafe reasoning");
    expect(markdown).not.toContain("unsafe credential");
  });
});
