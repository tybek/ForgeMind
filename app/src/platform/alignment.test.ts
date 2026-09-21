import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  createAlignmentReview,
  loadAlignmentResults,
  loadAlignmentSources,
  reviewAlignmentResult,
} from "./alignment";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("Alignment native boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockResolvedValue(null);
  });

  it("loads the current source catalog and durable results through fixed commands", async () => {
    await loadAlignmentSources("D:\\Games\\Sample");
    await loadAlignmentResults("D:\\Games\\Sample");
    expect(invoke).toHaveBeenNthCalledWith(1, "load_alignment_sources", { path: "D:\\Games\\Sample" });
    expect(invoke).toHaveBeenNthCalledWith(2, "load_alignment_results", { path: "D:\\Games\\Sample" });
  });

  it("passes a bounded manual check and explicit review action without an AI request", async () => {
    const input = {
      intentSourceType: "COMPENDIUM" as const,
      intentSourceId: "intent-1",
      conflictingDecisionId: null,
      evidence: [{ evidenceId: "unity:component:1", assessment: "INSUFFICIENT" as const }],
      rationale: "Presence does not prove behavior.",
      confidence: "LOW" as const,
      uncertainty: "Runtime values are not observed.",
    };
    await createAlignmentReview("D:\\Games\\Sample", "project-1", input);
    await reviewAlignmentResult("D:\\Games\\Sample", "project-1", "result-1", "APPROVED");
    expect(invoke).toHaveBeenNthCalledWith(1, "create_alignment_review", {
      request: { rootPath: "D:\\Games\\Sample", projectId: "project-1", ...input },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "review_alignment_result", {
      request: { rootPath: "D:\\Games\\Sample", projectId: "project-1", resultId: "result-1", reviewState: "APPROVED" },
    });
  });
});
