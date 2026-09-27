import { describe, expect, it } from "vitest";
import type { AlignmentResult } from "./alignment";
import type { Decision } from "./decisions";
import type { FeatureContract } from "./featureContracts";
import type { KnowledgeEntry } from "./projectKnowledge";
import {
  RECOMMENDATION_LIMIT,
  recommendNextSteps,
  type RecommendationProjectState,
} from "./recommendedNextSteps";

const timestamp = "2026-09-27T10:00:00.000Z";

function knowledge(area: KnowledgeEntry["area"], title: string, statement = "Defined"): KnowledgeEntry {
  return {
    id: `${area}-${title}`,
    area,
    title,
    statement,
    status: "DIRECTION",
    provenance: "USER_STATED",
    source: "new_project_creator",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const foundation = [
  knowledge("game_vision", "Game vision"),
  knowledge("player_experience", "Player experience"),
  knowledge("core_loop", "Core loop"),
  knowledge("game_vision", "Design pillar: Clarity"),
];

function state(overrides: Partial<RecommendationProjectState> = {}): RecommendationProjectState {
  return {
    compendium: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, entries: foundation },
    decisions: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, decisions: [] },
    repositoryReality: {
      status: "DETECTED",
      repository: {
        branch: "main",
        detachedHead: false,
        head: { hash: "a".repeat(40), shortHash: "aaaaaaa", subject: "Initial", author: "Dev", timestamp },
        workingTree: "CLEAN",
        changedFiles: [],
        totalChangedFiles: 0,
        changedFilesTruncated: false,
        diffStat: { filesChanged: 0, insertions: 0, deletions: 0 },
        recentCommits: [],
      },
    },
    unityGroundTruth: {
      status: "DETECTED",
      evidence: { assets: true, packages: true, projectSettings: true },
      projectVersion: { status: "AVAILABLE", version: "6000.3" },
      manifest: {
        status: "AVAILABLE",
        summary: {
          formatVersion: 1,
          generatedAt: timestamp,
          unityVersion: "6000.3",
          coverageCategories: [],
          coverageErrorCount: 0,
          coverageIssues: [],
          observationCounts: {
            scenes: 0, gameObjects: 0, components: 0, serializedFields: 0, prefabReferences: 0,
            scriptableObjects: 0, tags: 0, layers: 0, inputActions: 0, tests: 0,
          },
        },
      },
    },
    alignment: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, results: [] },
    featureContracts: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, contracts: [] },
    ...overrides,
  };
}

function decision(status: Decision["status"]): Decision {
  return {
    id: `decision-${status}`,
    title: "Combat direction",
    statement: "Keep combat readable.",
    rationale: "Player clarity.",
    status,
    area: "game_vision",
    author: "Designer",
    createdAt: timestamp,
    relatedKnowledgeEntryIds: [],
  };
}

function alignment(status: AlignmentResult["status"], reviewState: AlignmentResult["reviewState"] = "PENDING_REVIEW"): AlignmentResult {
  return {
    id: `alignment-${status}-${reviewState}`,
    createdAt: timestamp,
    intent: {
      sourceType: "COMPENDIUM",
      sourceId: "vision",
      title: "Vision",
      statement: "Defined",
      status: "DIRECTION",
      area: "game_vision",
      provenance: "DOCUMENTED",
    },
    evidence: [],
    status,
    rationale: "Evidence review",
    confidence: "LOW",
    uncertainty: "Current runtime behavior is unknown.",
    provenance: ["DOCUMENTED", "MANUAL_ASSESSMENT"],
    reviewState,
  };
}

function draftContract(): FeatureContract {
  return {
    id: "contract-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    title: "Readable combat",
    sources: {
      origin: { sourceType: "COMPENDIUM", sourceId: "vision", title: "Vision", statement: "Defined", status: "DIRECTION", area: "game_vision", provenance: "DOCUMENTED" },
      intent: { sourceType: "COMPENDIUM", sourceId: "vision", title: "Vision", statement: "Defined", status: "DIRECTION", area: "game_vision", provenance: "DOCUMENTED" },
      realityEvidence: [],
    },
    goal: "Keep combat readable.",
    currentRealitySummary: "Not established.",
    affectedSystems: [],
    requiredBehavior: [],
    outOfScope: [],
    risks: [],
    acceptanceCriteria: [],
    deterministicTests: [],
    implementationNotes: "",
    likelyAffectedEvidenceIds: [],
    status: "DRAFT",
    reviewState: "PENDING_REVIEW",
  };
}

describe("deterministic Recommended Next Steps", () => {
  it("returns no recommendations without a project", () => {
    expect(recommendNextSteps(null)).toEqual([]);
  });

  it("recommends defining a missing Vision", () => {
    const recommendations = recommendNextSteps(state({
      compendium: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, entries: foundation.filter((entry) => entry.title !== "Game vision") },
    }));
    expect(recommendations[0]).toMatchObject({ id: "define-game-vision", target: "Game Design", priority: "HIGH" });
  });

  it("recommends defining a missing Core Loop", () => {
    const recommendations = recommendNextSteps(state({
      compendium: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, entries: foundation.filter((entry) => entry.area !== "core_loop") },
    }));
    expect(recommendations[0]).toMatchObject({ id: "define-core-loop", title: "Define Core Loop" });
  });

  it("recommends continuing an incomplete Foundation", () => {
    const recommendations = recommendNextSteps(state({
      compendium: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, entries: foundation.filter((entry) => entry.area !== "player_experience") },
    }));
    expect(recommendations[0]).toMatchObject({ id: "continue-game-foundation" });
    expect(recommendations[0].reason).toContain("Player Experience");
  });

  it("recommends reviewing only proposed Decisions", () => {
    const recommendations = recommendNextSteps(state({
      decisions: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, decisions: [decision("PROPOSED"), decision("APPROVED")] },
    }));
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({ id: "review-pending-decisions", target: "Decisions" });
  });

  it("recommends resolving meaningful unresolved Open Questions", () => {
    const question = { ...knowledge("open_questions", "Open question", "Which platform comes first?"), status: "TBD" as const, provenance: "UNRESOLVED" as const };
    const recommendations = recommendNextSteps(state({
      compendium: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, entries: [...foundation, question] },
    }));
    expect(recommendations[0]).toMatchObject({ id: "resolve-open-question", target: "Game Design" });
  });

  it("recommends an explicit Repository Reality inspection when none was collected this session", () => {
    expect(recommendNextSteps(state({ repositoryReality: null }))[0]).toMatchObject({
      id: "inspect-repository-reality",
      target: "Repository / Git Reality",
    });
  });

  it("recommends importing GroundTruth when a Unity project has no manifest", () => {
    const recommendations = recommendNextSteps(state({
      unityGroundTruth: {
        status: "DETECTED",
        evidence: { assets: true, packages: true, projectSettings: true },
        projectVersion: { status: "AVAILABLE", version: "6000.3" },
        manifest: { status: "NOT_GENERATED" },
      },
    }));
    expect(recommendations[0]).toMatchObject({ id: "import-unity-ground-truth", target: "Unity" });
  });

  it.each(["UNVERIFIED", "OUT_OF_SYNC", "CONFLICT"] as const)("recommends review for %s Alignment", (status) => {
    const recommendations = recommendNextSteps(state({
      alignment: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, results: [alignment(status)] },
    }));
    expect(recommendations[0]).toMatchObject({ id: "review-alignment", target: "Alignment" });
    expect(recommendations[0].reason).toContain(status);
  });

  it("does not treat a rejected Alignment result as needing attention", () => {
    const recommendations = recommendNextSteps(state({
      alignment: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, results: [alignment("CONFLICT", "REJECTED")] },
    }));
    expect(recommendations).toEqual([]);
  });

  it("recommends continuing a draft Feature Contract", () => {
    const recommendations = recommendNextSteps(state({
      featureContracts: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, contracts: [draftContract()] },
    }));
    expect(recommendations[0]).toMatchObject({ id: "continue-feature-contract", target: "Feature Contracts" });
  });

  it("orders simultaneous signals by fixed foundational precedence and bounds the result", () => {
    const question = { ...knowledge("open_questions", "Open question", "What next?"), status: "TBD" as const };
    const input = state({
      compendium: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, entries: [question] },
      decisions: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, decisions: [decision("PROPOSED")] },
      repositoryReality: null,
      unityGroundTruth: null,
      alignment: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, results: [alignment("CONFLICT")] },
      featureContracts: { formatVersion: 1, projectId: "project-1", updatedAt: timestamp, contracts: [draftContract()] },
    });
    const recommendations = recommendNextSteps(input);
    expect(recommendations.map(({ id }) => id)).toEqual([
      "define-game-vision",
      "define-core-loop",
      "continue-game-foundation",
      "review-pending-decisions",
      "resolve-open-question",
    ]);
    expect(recommendations).toHaveLength(RECOMMENDATION_LIMIT);
  });

  it("returns the same ordered values for the same state without mutating its inputs", () => {
    const input = state({ repositoryReality: null, unityGroundTruth: null });
    const before = structuredClone(input);
    expect(recommendNextSteps(input)).toEqual(recommendNextSteps(input));
    expect(input).toEqual(before);
  });

  it("returns a calm empty result for a healthy project", () => {
    expect(recommendNextSteps(state())).toEqual([]);
  });
});
