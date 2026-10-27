import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { ProjectOverviewPage } from "./ProjectOverviewPage";
import type { RepositoryRealityResult } from "./platform/repositoryReality";
import type { UnityGroundTruthResult } from "./platform/unityGroundTruth";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const workspace = {
  name: "Example Game",
  path: "D:\\Games\\ExampleGame",
};
const timestamp = "2026-10-02T10:00:00Z";

function sparseDocuments(command: string) {
  if (["load_compendium", "load_decisions", "load_alignment_results", "load_feature_contracts"].includes(command)) return null;
  throw new Error(`Unexpected command: ${command}`);
}

const repositoryReality: RepositoryRealityResult = {
  status: "DETECTED",
  repository: {
    branch: "main", detachedHead: false,
    head: { hash: "abcdef", shortHash: "abcdef", subject: "Dashboard", author: "Dev", timestamp },
    workingTree: "CLEAN", changedFiles: [], totalChangedFiles: 0, changedFilesTruncated: false,
    diffStat: { filesChanged: 0, insertions: 0, deletions: 0 }, recentCommits: [],
  },
};

const unityGroundTruth: UnityGroundTruthResult = {
  status: "DETECTED",
  evidence: { assets: true, packages: true, projectSettings: true },
  projectVersion: { status: "AVAILABLE", version: "6000.3.23f1" },
  manifest: {
    status: "AVAILABLE",
    summary: {
      formatVersion: 1, generatedAt: timestamp, unityVersion: "6000.3.23f1", coverageCategories: ["SCENES"], coverageErrorCount: 0,
      coverageIssues: [{ category: "SERIALIZED_FIELDS", code: "SERIALIZED_FIELDS_TRUNCATED", kind: "BOUNDED_TRUNCATION" }],
      observationCounts: { scenes: 1, gameObjects: 1, components: 1, serializedFields: 10000, prefabReferences: 0, scriptableObjects: 0, tags: 0, layers: 0, inputActions: 0, tests: 0 },
    },
  },
};

function matureDocuments(command: string) {
  if (command === "load_compendium") return {
    formatVersion: 1, projectId: "project", updatedAt: timestamp,
    entries: [
      { id: "vision", area: "game_vision", title: "Game vision", statement: "A tactical extraction game about incomplete information.", status: "LOCKED", provenance: "MANUAL", source: "manual_entry", createdAt: timestamp, updatedAt: timestamp },
      { id: "pillar", area: "game_vision", title: "Design pillar: Clarity", statement: "Readable decisions.", status: "DIRECTION", provenance: "MANUAL", source: "manual_entry", createdAt: timestamp, updatedAt: timestamp },
      { id: "loop", area: "core_loop", title: "Core loop", statement: "Scout, commit, extract.", status: "LOCKED", provenance: "MANUAL", source: "manual_entry", createdAt: timestamp, updatedAt: timestamp },
      { id: "experience", area: "player_experience", title: "Player experience", statement: "Tense and deliberate.", status: "LOCKED", provenance: "MANUAL", source: "manual_entry", createdAt: timestamp, updatedAt: timestamp },
      { id: "question", area: "open_questions", title: "Reinforcements", statement: "When do they arrive?", status: "TBD", provenance: "UNRESOLVED", source: "new_project_creator", createdAt: timestamp, updatedAt: timestamp },
    ],
  };
  if (command === "load_decisions") return {
    formatVersion: 1, projectId: "project", updatedAt: timestamp,
    decisions: [
      { id: "proposed", title: "Camera", statement: "Use close framing.", rationale: "Tension.", status: "PROPOSED", area: "game_vision", author: "Designer", createdAt: timestamp, relatedKnowledgeEntryIds: [] },
      { id: "approved", title: "Information", statement: "No omniscience.", rationale: "Intent.", status: "APPROVED", area: "systems", author: "Designer", createdAt: timestamp, approvedAt: timestamp, relatedKnowledgeEntryIds: [] },
    ],
  };
  if (command === "load_alignment_results") return {
    formatVersion: 1, projectId: "project", updatedAt: timestamp,
    results: [{
      id: "conflict", createdAt: timestamp,
      intent: { sourceType: "DECISION", sourceId: "approved", title: "Information", statement: "No omniscience.", status: "APPROVED", area: "systems", provenance: "APPROVED_INTENT" },
      evidence: [], status: "CONFLICT", rationale: "Evidence conflicts.", confidence: "HIGH", uncertainty: "None.", provenance: ["APPROVED_INTENT"], reviewState: "APPROVED",
    }],
  };
  if (command === "load_feature_contracts") return {
    formatVersion: 1, projectId: "project", updatedAt: timestamp,
    contracts: [{
      id: "draft", createdAt: timestamp, updatedAt: timestamp, title: "Enemy knowledge", goal: "Preserve uncertainty.", currentRealitySummary: "Needs work.",
      sources: {
        origin: { sourceType: "DECISION", sourceId: "approved", title: "Information", statement: "No omniscience.", status: "APPROVED", area: "systems", provenance: "APPROVED_INTENT" },
        intent: { sourceType: "DECISION", sourceId: "approved", title: "Information", statement: "No omniscience.", status: "APPROVED", area: "systems", provenance: "APPROVED_INTENT" },
        realityEvidence: [],
      },
      affectedSystems: [], requiredBehavior: [], outOfScope: [], risks: [], acceptanceCriteria: [], deterministicTests: [], implementationNotes: "", likelyAffectedEvidenceIds: [], status: "DRAFT", reviewState: "PENDING_REVIEW",
    }],
  };
  throw new Error(`Unexpected command: ${command}`);
}

describe("Project Overview Dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a useful sparse-project control room without developer metadata or automatic work", async () => {
    vi.mocked(invoke).mockImplementation(async (command) => sparseDocuments(command));
    const { container } = render(
      <ProjectOverviewPage workspace={workspace} repositoryReality={null} unityGroundTruth={null} onNavigate={vi.fn()} />,
    );

    expect(screen.getByRole("heading", { name: workspace.name })).toBeInTheDocument();
    expect(await screen.findByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommended Next Steps" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Complete Game Foundation" })).toBeInTheDocument();
    expect(screen.getAllByText("Not inspected", { selector: ".project-signal-card strong" })).toHaveLength(2);
    expect(screen.queryByText(workspace.path)).not.toBeInTheDocument();
    expect(screen.queryByText(/Project ID|Format Version|Created At/)).not.toBeInTheDocument();
    expect(container.querySelector("[data-dashboard='project-overview']")).not.toBeNull();
    expect(container.querySelectorAll(".project-signal-group")).toHaveLength(3);

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(4));
    expect(vi.mocked(invoke).mock.calls.map(([command]) => command).sort()).toEqual([
      "load_alignment_results", "load_compendium", "load_decisions", "load_feature_contracts",
    ]);
  });

  it("renders mature project signals and routes actions to existing destinations", async () => {
    vi.mocked(invoke).mockImplementation(async (command) => matureDocuments(command));
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(
      <ProjectOverviewPage workspace={workspace} repositoryReality={repositoryReality} unityGroundTruth={unityGroundTruth} onNavigate={onNavigate} />,
    );

    expect(await screen.findByText("A tactical extraction game about incomplete information.")).toBeInTheDocument();
    expect(screen.getByText("1 proposed pending review")).toBeInTheDocument();
    expect(screen.getByText("1 unresolved question")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Partial evidence")).toBeInTheDocument();
    expect(screen.getByText("1 actionable issue")).toBeInTheDocument();
    expect(screen.getByText("1 draft")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Review Pending Decisions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Continue Feature Contract" })).toBeInTheDocument();

    const alignmentCard = screen.getByText("1 actionable issue").closest("article")!;
    await user.click(within(alignmentCard).getByRole("button", { name: "Review Alignment" }));
    expect(onNavigate).toHaveBeenLastCalledWith("Alignment");

    const contractCard = screen.getByText("1 draft").closest("article")!;
    await user.click(within(contractCard).getByRole("button", { name: "Continue Feature Contracts" }));
    expect(onNavigate).toHaveBeenLastCalledWith("Feature Contracts");
  });

  it("shows source failures as unavailable and keeps verified state separate", async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "load_compendium") throw new Error("Unreadable Compendium");
      return sparseDocuments(command);
    });
    render(<ProjectOverviewPage workspace={workspace} repositoryReality={null} unityGroundTruth={null} onNavigate={vi.fn()} />);

    expect(await screen.findAllByText("Unavailable")).not.toHaveLength(0);
    expect(screen.getByText("Some local sources were unavailable, so only verified guidance and signals are shown.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Complete Game Foundation" })).not.toBeInTheDocument();
  });
});
