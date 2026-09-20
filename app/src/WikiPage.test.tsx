import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WikiPage } from "./WikiPage";
import { loadDecisions } from "./platform/decisions";
import { loadCompendium } from "./platform/projectKnowledge";
import { loadSpecialistRuns } from "./platform/specialists";
import { inspectRepositoryReality } from "./platform/repositoryReality";
import { inspectUnityGroundTruth } from "./platform/unityGroundTruth";

vi.mock("./platform/projectKnowledge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectKnowledge")>()),
  loadCompendium: vi.fn(),
}));
vi.mock("./platform/decisions", () => ({ loadDecisions: vi.fn() }));
vi.mock("./platform/specialists", () => ({ loadSpecialistRuns: vi.fn() }));
vi.mock("./platform/repositoryReality", () => ({ inspectRepositoryReality: vi.fn() }));
vi.mock("./platform/unityGroundTruth", () => ({ inspectUnityGroundTruth: vi.fn() }));

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

async function renderWiki(onEditKnowledge?: (entryId: string) => void) {
  const user = userEvent.setup();
  render(<WikiPage workspace={workspace} onEditKnowledge={onEditKnowledge} />);
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
        coverageCategories: ["SCENES"], coverageErrorCount: 0,
        observationCounts: { scenes: 2, gameObjects: 0, components: 0, serializedFields: 0, prefabReferences: 0, scriptableObjects: 0, tags: 0, layers: 0, inputActions: 0, tests: 0 },
      } },
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
