import { describe, expect, it } from "vitest";
import type { AlignmentResult } from "./alignment";
import type { Decision } from "./decisions";
import type { FeatureContract } from "./featureContracts";
import { deriveProjectOverview } from "./projectOverview";
import type { KnowledgeEntry } from "./projectKnowledge";
import type { RecommendationProjectState } from "./recommendedNextSteps";
import type { UnityGroundTruthResult } from "./unityGroundTruth";

const timestamp = "2026-10-02T10:00:00Z";

function knowledge(area: KnowledgeEntry["area"], title: string, statement: string, status: KnowledgeEntry["status"] = "DIRECTION"): KnowledgeEntry {
  return { id: `${area}-${title}`, area, title, statement, status, provenance: "MANUAL", source: "manual_entry", createdAt: timestamp, updatedAt: timestamp };
}

function decision(status: Decision["status"]): Decision {
  return { id: `decision-${status}`, title: `${status} decision`, statement: "A decision.", rationale: "Because.", status, area: "systems", author: "Designer", createdAt: timestamp, relatedKnowledgeEntryIds: [] };
}

function alignment(status: AlignmentResult["status"], reviewState: AlignmentResult["reviewState"] = "APPROVED"): AlignmentResult {
  return {
    id: `alignment-${status}-${reviewState}`, createdAt: timestamp,
    intent: { sourceType: "COMPENDIUM", sourceId: "vision", title: "Vision", statement: "Stay readable.", status: "LOCKED", area: "game_vision", provenance: "DOCUMENTED" },
    evidence: [], status, rationale: "Current evidence.", confidence: "MEDIUM", uncertainty: "Bounded evidence.", provenance: ["DOCUMENTED"], reviewState,
  };
}

function contract(status: FeatureContract["status"]): FeatureContract {
  return {
    id: `contract-${status}`, createdAt: timestamp, updatedAt: timestamp, title: `${status} contract`, goal: "Ship safely.", currentRealitySummary: "Reality captured.",
    sources: {
      origin: { sourceType: "COMPENDIUM", sourceId: "vision", title: "Vision", statement: "Stay readable.", status: "LOCKED", area: "game_vision", provenance: "DOCUMENTED" },
      intent: { sourceType: "COMPENDIUM", sourceId: "vision", title: "Vision", statement: "Stay readable.", status: "LOCKED", area: "game_vision", provenance: "DOCUMENTED" },
      realityEvidence: [],
    },
    affectedSystems: [], requiredBehavior: [], outOfScope: [], risks: [], acceptanceCriteria: [], deterministicTests: [], implementationNotes: "", likelyAffectedEvidenceIds: [],
    status, reviewState: status === "DRAFT" ? "PENDING_REVIEW" : "APPROVED",
  };
}

function unity(manifest: UnityGroundTruthResult["manifest"]): UnityGroundTruthResult {
  return { status: "DETECTED", evidence: { assets: true, packages: true, projectSettings: true }, projectVersion: { status: "AVAILABLE", version: "6000.3.23f1" }, manifest };
}

function state(overrides: Partial<RecommendationProjectState> = {}): RecommendationProjectState {
  return {
    compendium: { formatVersion: 1, projectId: "project", updatedAt: timestamp, entries: [] },
    decisions: { formatVersion: 1, projectId: "project", updatedAt: timestamp, decisions: [] },
    repositoryReality: null,
    unityGroundTruth: null,
    alignment: { formatVersion: 1, projectId: "project", updatedAt: timestamp, results: [] },
    featureContracts: { formatVersion: 1, projectId: "project", updatedAt: timestamp, contracts: [] },
    ...overrides,
  };
}

describe("derived Project Overview signals", () => {
  it("derives sparse project state without scores or fabricated progress", () => {
    const model = deriveProjectOverview(state());
    expect(model.descriptor).toBeNull();
    expect(model.foundation).toMatchObject({ value: "Needs attention", tone: "ATTENTION", gaps: ["Game Vision", "Core Loop", "Player Experience", "Design Pillars"] });
    expect(model.decisions).toMatchObject({ value: "No pending review", detail: "No approved Decisions yet." });
    expect(model.openQuestions).toMatchObject({ value: "None unresolved", unresolved: 0 });
    expect(model.repository.value).toBe("Not inspected");
    expect(model.unity.value).toBe("Not inspected");
    expect(model.alignment.value).toBe("No actionable issues");
    expect(model.featureContracts.value).toBe("No drafts");
  });

  it("derives mature Intent, Alignment, and delivery lifecycle counts", () => {
    const entries = [
      knowledge("game_vision", "Game vision", "A tactical extraction game."),
      knowledge("game_vision", "Design pillar: Clarity", "Readable choices."),
      knowledge("core_loop", "Core loop", "Scout, commit, extract."),
      knowledge("player_experience", "Player experience", "Tense and deliberate."),
      knowledge("open_questions", "Enemy reinforcement timing", "When should reinforcements arrive?", "TBD"),
    ];
    const model = deriveProjectOverview(state({
      compendium: { formatVersion: 1, projectId: "project", updatedAt: timestamp, entries },
      decisions: { formatVersion: 1, projectId: "project", updatedAt: timestamp, decisions: [decision("PROPOSED"), decision("APPROVED")] },
      alignment: { formatVersion: 1, projectId: "project", updatedAt: timestamp, results: [alignment("CONFLICT"), alignment("OUT_OF_SYNC"), alignment("UNVERIFIED", "REJECTED"), alignment("ALIGNED")] },
      featureContracts: { formatVersion: 1, projectId: "project", updatedAt: timestamp, contracts: [contract("DRAFT"), contract("APPROVED"), contract("SUPERSEDED")] },
    }));

    expect(model.descriptor).toBe("A tactical extraction game.");
    expect(model.foundation.value).toBe("Complete");
    expect(model.decisions).toMatchObject({ value: "1 proposed pending review", counts: { PROPOSED: 1, APPROVED: 1 } });
    expect(model.openQuestions.unresolved).toBe(1);
    expect(model.alignment).toMatchObject({ value: "2 actionable issues", tone: "DANGER", counts: { CONFLICT: 1, OUT_OF_SYNC: 1, UNVERIFIED: 0, ALIGNED: 1 } });
    expect(model.featureContracts).toMatchObject({ value: "1 draft", detail: "1 approved · 1 archived", archived: 1 });
  });

  it.each([
    [{ status: "NOT_REPOSITORY" as const }, "Not connected"],
    [{ status: "DETECTED" as const, repository: { branch: "main", detachedHead: false, head: { hash: "abc", shortHash: "abc", subject: "Initial", author: "Dev", timestamp }, workingTree: "CLEAN" as const, changedFiles: [], totalChangedFiles: 0, changedFilesTruncated: false, diffStat: { filesChanged: 0, insertions: 0, deletions: 0 }, recentCommits: [] } }, "Connected"],
    [{ status: "INSPECTION_FAILED" as const }, "Inspection error"],
  ])("maps known Repository state to an explainable signal", (repositoryReality, expected) => {
    expect(deriveProjectOverview(state({ repositoryReality })).repository.value).toBe(expected);
  });

  it("distinguishes Unity disconnected, portable-only, partial, available, and error states", () => {
    const summary = { formatVersion: 1, generatedAt: timestamp, unityVersion: "6000.3.23f1", coverageCategories: ["SCENES" as const], coverageErrorCount: 0, coverageIssues: [], observationCounts: { scenes: 1, gameObjects: 1, components: 1, serializedFields: 1, prefabReferences: 0, scriptableObjects: 0, tags: 0, layers: 0, inputActions: 0, tests: 0 } };
    const disconnected: UnityGroundTruthResult = { status: "NOT_DETECTED", evidence: { assets: false, packages: false, projectSettings: false }, projectVersion: { status: "MISSING" }, manifest: { status: "NOT_GENERATED" } };
    const error: UnityGroundTruthResult = { ...disconnected, status: "INSPECTION_FAILED" };
    const partial = unity({ status: "AVAILABLE", summary: { ...summary, coverageIssues: [{ category: "SERIALIZED_FIELDS", code: "SERIALIZED_FIELDS_TRUNCATED", kind: "BOUNDED_TRUNCATION" }] } });

    expect(deriveProjectOverview(state({ unityGroundTruth: disconnected })).unity.value).toBe("Not connected");
    expect(deriveProjectOverview(state({ unityGroundTruth: unity({ status: "NOT_ATTACHED" }) })).unity.value).toBe("Portable inspection only");
    expect(deriveProjectOverview(state({ unityGroundTruth: partial })).unity.value).toBe("Partial evidence");
    expect(deriveProjectOverview(state({ unityGroundTruth: unity({ status: "AVAILABLE", summary }) })).unity.value).toBe("GroundTruth available");
    expect(deriveProjectOverview(state({ unityGroundTruth: error })).unity.value).toBe("Evidence error");
  });

  it("marks failed document reads unavailable instead of inventing empty state", () => {
    const model = deriveProjectOverview(state({ compendium: undefined, decisions: undefined, alignment: undefined, featureContracts: undefined }));
    expect(model.foundation.value).toBe("Unavailable");
    expect(model.decisions.value).toBe("Unavailable");
    expect(model.openQuestions.value).toBe("Unavailable");
    expect(model.alignment.value).toBe("Unavailable");
    expect(model.featureContracts.value).toBe("Unavailable");
  });
});
