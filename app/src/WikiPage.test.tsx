import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WikiPage } from "./WikiPage";
import { loadDecisions } from "./platform/decisions";
import { loadCompendium } from "./platform/projectKnowledge";
import { loadSpecialistRuns } from "./platform/specialists";
import { inspectRepositoryReality } from "./platform/repositoryReality";
import { inspectUnityGroundTruth } from "./platform/unityGroundTruth";
import { loadAlignmentResults, type AlignmentResult } from "./platform/alignment";

vi.mock("./platform/projectKnowledge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectKnowledge")>()),
  loadCompendium: vi.fn(),
}));
vi.mock("./platform/decisions", () => ({ loadDecisions: vi.fn() }));
vi.mock("./platform/specialists", () => ({ loadSpecialistRuns: vi.fn() }));
vi.mock("./platform/repositoryReality", () => ({ inspectRepositoryReality: vi.fn() }));
vi.mock("./platform/unityGroundTruth", () => ({ inspectUnityGroundTruth: vi.fn() }));
vi.mock("./platform/alignment", () => ({ loadAlignmentResults: vi.fn() }));

const workspace = { path: "D:\\Games\\Sample" };
const knowledge = {
  id: "knowledge-1", area: "systems" as const, title: "Perception model", statement: "Enemies act only on perceived facts.",
  status: "LOCKED" as const, provenance: "MANUAL" as const, source: "manual_entry" as const,
  createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const approved = {
  id: "decision-1", title: "No omniscience", statement: "Sound does not reveal exact identity.", rationale: "Fair tactical play.",
  status: "APPROVED" as const, area: "systems" as const, author: "Local User", createdAt: "2026-09-20T10:00:00Z",
  approvedAt: "2026-09-20T10:01:00Z", relatedKnowledgeEntryIds: [knowledge.id],
};
const proposed = { ...approved, id: "decision-2", title: "Shared alerts", status: "PROPOSED" as const, approvedAt: null };
const run = {
  id: "run-1", createdAt: "2026-09-20T11:00:00Z", specialistProfileId: "ai_behavior_designer",
  taskType: "REACTION_MODEL" as const, modelId: "test/model", selectedKnowledgeEntryIds: [knowledge.id],
  selectedDecisionIds: [approved.id], scenario: "A guard hears a shot.", status: "SUCCEEDED" as const,
  result: { summary: "Investigate under uncertainty.", assumptions: [], recommendations: ["Orient before moving."], risks: [], exploits: [], openQuestions: [], suggestedTests: [] },
  usage: {},
};
const alignment: AlignmentResult = {
  id: "alignment-1", createdAt: "2026-09-21T11:00:00Z",
  intent: { sourceType: "COMPENDIUM", sourceId: knowledge.id, title: knowledge.title, statement: knowledge.statement, status: knowledge.status, area: knowledge.area, provenance: "DOCUMENTED" },
  evidence: [{ evidenceId: "unity:component:0", source: "UNITY", summary: "HearingPerception exists.", capturedAt: "2026-09-21T10:00:00Z", provenance: "VERIFIED_FROM_UNITY", assessment: "INSUFFICIENT" }],
  status: "UNVERIFIED", rationale: "Presence does not prove behavior.", confidence: "LOW",
  uncertainty: "Runtime values are unavailable.", provenance: ["DOCUMENTED", "VERIFIED_FROM_UNITY", "MANUAL_ASSESSMENT"], reviewState: "PENDING_REVIEW",
};

async function renderWiki(onEditKnowledge?: (entryId: string) => void, onViewAlignmentHistory?: () => void) {
  const user = userEvent.setup();
  render(<WikiPage workspace={workspace} onEditKnowledge={onEditKnowledge} onViewAlignmentHistory={onViewAlignmentHistory} />);
  await screen.findByRole("heading", { name: "Game Wiki" });
  await screen.findByText("No project knowledge is associated with this area yet.");
  await user.click(screen.getByRole("button", { name: /Systems/ }));
  return user;
}

describe("Game Wiki", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadCompendium).mockResolvedValue({ formatVersion: 1, projectId: "project", updatedAt: "2026-09-20T10:00:00Z", entries: [knowledge] });
    vi.mocked(loadDecisions).mockResolvedValue({ formatVersion: 1, projectId: "project", updatedAt: "2026-09-20T10:00:00Z", decisions: [approved, proposed] });
    vi.mocked(loadSpecialistRuns).mockResolvedValue({ formatVersion: 1, projectId: "project", updatedAt: "2026-09-20T11:00:00Z", runs: [run] });
    vi.mocked(inspectRepositoryReality).mockResolvedValue({
      status: "DETECTED",
      repository: {
        branch: "main", detachedHead: false, workingTree: "DIRTY", totalChangedFiles: 2, changedFilesTruncated: false,
        head: { hash: "a".repeat(40), shortHash: "aaaaaaa", subject: "Add Game Wiki", author: "Dev", timestamp: "2026-09-20T10:00:00Z" },
        changedFiles: [{ path: "notes.txt", status: "UNTRACKED", staged: false, unstaged: true, untracked: true }],
        diffStat: { filesChanged: 1, insertions: 2, deletions: 0 }, recentCommits: [],
      },
    });
    vi.mocked(inspectUnityGroundTruth).mockResolvedValue({
      status: "DETECTED",
      evidence: { assets: true, packages: true, projectSettings: true },
      projectVersion: { status: "AVAILABLE", version: "6000.3.23f1" },
      manifest: { status: "AVAILABLE", summary: {
        formatVersion: 1, generatedAt: "2026-09-20T12:00:00Z", unityVersion: "6000.3.23f1",
        coverageCategories: ["SCENES"], coverageErrorCount: 0, coverageIssues: [],
        observationCounts: { scenes: 2, gameObjects: 10, components: 14, serializedFields: 8, prefabReferences: 3, scriptableObjects: 2, tags: 4, layers: 2, inputActions: 6, tests: 12 },
      } },
    });
    vi.mocked(loadAlignmentResults).mockResolvedValue({
      formatVersion: 1, projectId: "project", updatedAt: "2026-09-21T11:00:00Z",
      results: [alignment],
    });
  });

  it("renders aggregated Compendium knowledge under its existing Area", async () => {
    await renderWiki();
    const row = screen.getByText("Perception model").closest("details")!;
    expect(within(row).getByText("Knowledge")).toBeInTheDocument();
    expect(within(row).getByText("Locked")).toBeInTheDocument();
  });

  it("shows approved and proposed Decisions with distinct authority labels", async () => {
    await renderWiki();
    const approvedRow = screen.getByText("No omniscience").closest("details")!;
    const proposedRow = screen.getByText("Shared alerts").closest("details")!;
    expect(within(approvedRow.querySelector("summary")!).getByText("Decision")).toBeInTheDocument();
    expect(within(approvedRow.querySelector("summary")!).getByText("Approved")).toBeInTheDocument();
    expect(within(proposedRow.querySelector("summary")!).getByText("Decision")).toBeInTheDocument();
    expect(within(proposedRow.querySelector("summary")!).getByText("Proposed")).toBeInTheDocument();
  });

  it("excludes the derived Alignment summary from Area entry counts", async () => {
    await renderWiki();
    expect(screen.getByText("Systems", { selector: ".wiki-area-nav span" }).closest("button")).toHaveTextContent("4 entries");
    expect(screen.getByRole("heading", { name: "Systems" }).nextElementSibling).toHaveTextContent("4 entries");
    const summary = screen.getByLabelText("Alignment summary");
    expect(within(summary).getByText("Derived summary · not a Wiki entry")).toBeInTheDocument();
    expect(within(summary).getByText(/reviews are not counted as Wiki entries/)).toBeInTheDocument();
  });

  it("shows approved, pending, and total review counts with the latest approved status", async () => {
    vi.mocked(loadAlignmentResults).mockResolvedValue({
      formatVersion: 1, projectId: "project", updatedAt: "2026-09-21T13:00:00Z",
      results: [
        { ...alignment, id: "approved-latest", createdAt: "2026-09-21T12:00:00Z", status: "OUT_OF_SYNC", reviewState: "APPROVED" },
        { ...alignment, id: "pending-newest", createdAt: "2026-09-21T13:00:00Z" },
        { ...alignment, id: "approved-older", createdAt: "2026-09-21T10:00:00Z", status: "ALIGNED", reviewState: "APPROVED" },
      ],
    });
    await renderWiki();
    const summary = screen.getByLabelText("Alignment summary");
    expect(within(summary).getByText("Latest approved status").parentElement).toHaveTextContent("Out Of Sync");
    expect(within(summary).getByText("Approved reviews").parentElement).toHaveTextContent("2");
    expect(within(summary).getByText("Pending reviews").parentElement).toHaveTextContent("1");
    expect(within(summary).getByText("Total reviews").parentElement).toHaveTextContent("3");
  });

  it("routes the Alignment summary action to Review History", async () => {
    const onViewAlignmentHistory = vi.fn();
    const user = await renderWiki(undefined, onViewAlignmentHistory);
    await user.click(screen.getByRole("button", { name: "View Alignment History" }));
    expect(onViewAlignmentHistory).toHaveBeenCalledOnce();
  });

  it("keeps specialist analysis visibly non-authoritative", async () => {
    const user = await renderWiki();
    const row = screen.getByText("Investigate under uncertainty.").closest("details")!;
    expect(within(row).getByText("AI Analysis")).toBeInTheDocument();
    expect(within(row).getByText("Reaction Model")).toBeInTheDocument();
    await user.click(within(row).getByText("Investigate under uncertainty."));
    expect(within(row).getByText("AI working analysis — not approved project knowledge")).toBeInTheDocument();
  });

  it("uses compact Area navigation to switch the visible group", async () => {
    const user = await renderWiki();
    expect(screen.getByRole("heading", { name: "Systems" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Technical/ }));
    expect(screen.getByRole("heading", { name: "Technical" })).toBeInTheDocument();
    expect(screen.queryByText("Perception model")).not.toBeInTheDocument();
  });

  it("shows only a compact Repository Reality summary under Technical", async () => {
    const user = await renderWiki();
    await user.click(screen.getByRole("button", { name: /Technical/ }));
    const summary = screen.getByLabelText("Repository Reality summary");
    expect(within(summary).getByText("main")).toBeInTheDocument();
    expect(within(summary).getByText("2 changed, 1 untracked")).toBeInTheDocument();
    expect(within(summary).getByText("HEAD").parentElement).toHaveTextContent("aaaaaaa — Add Game Wiki");
    expect(within(summary).queryByText("notes.txt")).not.toBeInTheDocument();
  });

  it("shows a compact verified Unity Reality summary only under Technical", async () => {
    const user = await renderWiki();
    await user.click(screen.getByRole("button", { name: /Technical/ }));
    const summary = screen.getByLabelText("Unity Reality summary");
    expect(within(summary).getByText("Detected")).toBeInTheDocument();
    expect(within(summary).getByText("6000.3.23f1")).toBeInTheDocument();
    expect(within(summary).getByText("Available")).toBeInTheDocument();
    expect(within(summary).getByText("2 scenes, 10 GameObjects, 14 components, 2 ScriptableObjects")).toBeInTheDocument();
    expect(within(summary).getByText(/VERIFIED FROM UNITY/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Production/ }));
    expect(screen.queryByLabelText("Unity Reality summary")).not.toBeInTheDocument();
  });

  it("expands and collapses compact knowledge rows", async () => {
    const user = await renderWiki();
    const row = screen.getByText("Perception model").closest("details")!;
    expect(row).not.toHaveAttribute("open");
    await user.click(screen.getByText("Perception model"));
    expect(row).toHaveAttribute("open");
    expect(within(row).getByText("Enemies act only on perceived facts.")).toBeInTheDocument();
    await user.click(screen.getByText("Perception model"));
    expect(row).not.toHaveAttribute("open");
  });

  it("keeps authoritative knowledge available when Analysis History cannot load", async () => {
    vi.mocked(loadSpecialistRuns).mockRejectedValue({ message: "History is invalid." });
    await renderWiki();
    expect(screen.getByText("Perception model")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Specialist History: History is invalid.");
  });

  it("searches by keyword and filters the aggregation by source type", async () => {
    const user = await renderWiki();
    await user.type(screen.getByRole("searchbox", { name: "Search" }), "orient");
    expect(screen.getByText("Investigate under uncertainty.")).toBeInTheDocument();
    expect(screen.queryByText("Perception model")).not.toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Search" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Type" }), "DECISIONS");
    expect(screen.getByText("No omniscience")).toBeInTheDocument();
    expect(screen.queryByText("Perception model")).not.toBeInTheDocument();
    expect(screen.queryByText("Investigate under uncertainty.")).not.toBeInTheDocument();
  });

  it("routes Knowledge editing back to the existing Compendium source", async () => {
    const onEditKnowledge = vi.fn();
    const user = await renderWiki(onEditKnowledge);
    await user.click(screen.getByText("Perception model"));
    await user.click(screen.getByRole("button", { name: "Edit in Compendium" }));
    expect(onEditKnowledge).toHaveBeenCalledWith(knowledge.id);
  });
});
