import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WikiPage } from "./WikiPage";
import { loadAlignmentResults, type AlignmentResult } from "./platform/alignment";
import { loadDecisions } from "./platform/decisions";
import { loadFeatureContracts, type FeatureContract } from "./platform/featureContracts";
import { loadCompendium, type KnowledgeArea } from "./platform/projectKnowledge";
import { inspectRepositoryReality } from "./platform/repositoryReality";
import { loadSpecialistRuns } from "./platform/specialists";
import { inspectUnityGroundTruth } from "./platform/unityGroundTruth";

vi.mock("./platform/projectKnowledge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectKnowledge")>()),
  loadCompendium: vi.fn(),
}));
vi.mock("./platform/decisions", () => ({ loadDecisions: vi.fn() }));
vi.mock("./platform/specialists", () => ({ loadSpecialistRuns: vi.fn() }));
vi.mock("./platform/repositoryReality", () => ({ inspectRepositoryReality: vi.fn() }));
vi.mock("./platform/unityGroundTruth", () => ({ inspectUnityGroundTruth: vi.fn() }));
vi.mock("./platform/alignment", () => ({ loadAlignmentResults: vi.fn() }));
vi.mock("./platform/featureContracts", () => ({ loadFeatureContracts: vi.fn() }));

const workspace = { path: "D:\\Games\\Sample", projectId: "project" };
const knowledge = {
  id: "knowledge-1", area: "systems" as const, title: "Perception model", statement: "Enemies act only on perceived facts.",
  status: "LOCKED" as const, provenance: "MANUAL" as const, source: "manual_entry" as const,
  createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:30:00Z",
};
const question = {
  ...knowledge, id: "question-1", area: "open_questions" as const, title: "Alert cadence?", statement: "How quickly should guards share alerts?",
  status: "TBD" as const, provenance: "UNRESOLVED" as const,
};
const deprecated = { ...knowledge, id: "knowledge-old", title: "Exact sound coordinates", statement: "Sound reports exact coordinates.", status: "DEPRECATED" as const };
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
  evidence: [], status: "UNVERIFIED", rationale: "Runtime evidence is absent.", confidence: "LOW", uncertainty: "Runtime values are unavailable.", provenance: ["DOCUMENTED", "MANUAL_ASSESSMENT"], reviewState: "APPROVED",
};
const featureContract: FeatureContract = {
  id: "contract-1", createdAt: "2026-09-21T12:00:00Z", updatedAt: "2026-09-21T12:00:00Z", title: "Enemy sound knowledge", goal: "Keep sound uncertain.", currentRealitySummary: "Approved Alignment is UNVERIFIED.",
  sources: { origin: { sourceType: "ALIGNMENT", sourceId: alignment.id, title: knowledge.title, statement: knowledge.statement, status: "UNVERIFIED", area: "systems", provenance: "MANUAL_ASSESSMENT" }, intent: { sourceType: "COMPENDIUM", sourceId: knowledge.id, title: knowledge.title, statement: knowledge.statement, status: knowledge.status, area: knowledge.area, provenance: "DOCUMENTED" }, alignment: { alignmentId: alignment.id, status: "UNVERIFIED", rationale: alignment.rationale, createdAt: alignment.createdAt, reviewState: "APPROVED" }, realityEvidence: [] },
  affectedSystems: [], requiredBehavior: ["Omit exact coordinates."], outOfScope: [], risks: [], acceptanceCriteria: ["Coordinates remain unknown."], deterministicTests: ["Sound-only test."], implementationNotes: "", likelyAffectedEvidenceIds: [], status: "APPROVED", reviewState: "APPROVED", reviewedAt: "2026-09-21T12:01:00Z",
};

async function renderWiki(props: Partial<React.ComponentProps<typeof WikiPage>> = {}) {
  const user = userEvent.setup();
  render(<WikiPage workspace={workspace} {...props} />);
  await screen.findByRole("navigation", { name: "Wiki categories" });
  return user;
}

describe("Game Wiki knowledge explorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadCompendium).mockResolvedValue({ formatVersion: 1, projectId: "project", updatedAt: knowledge.updatedAt, entries: [knowledge, question, deprecated] });
    vi.mocked(loadDecisions).mockResolvedValue({ formatVersion: 1, projectId: "project", updatedAt: approved.createdAt, decisions: [approved, proposed] });
    vi.mocked(loadSpecialistRuns).mockResolvedValue({ formatVersion: 1, projectId: "project", updatedAt: run.createdAt, runs: [run] });
    vi.mocked(loadAlignmentResults).mockResolvedValue({ formatVersion: 1, projectId: "project", updatedAt: alignment.createdAt, results: [alignment] });
    vi.mocked(loadFeatureContracts).mockResolvedValue({ formatVersion: 1, projectId: "project", updatedAt: featureContract.updatedAt, contracts: [featureContract] });
  });

  it("renders category, compact result, and selected-detail panes from existing stores", async () => {
    const user = await renderWiki({ initialArea: "systems" });
    expect(screen.getByRole("navigation", { name: "Wiki categories" })).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Knowledge results" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: /No omniscience/ }));
    const detail = screen.getByLabelText("Selected knowledge detail");
    expect(await within(detail).findByRole("heading", { name: "No omniscience" })).toBeInTheDocument();
    expect(within(detail).getByText("Approved decision record")).toBeInTheDocument();
    expect(within(detail).queryByText(/knowledge-1|decision-1/)).not.toBeInTheDocument();
  });

  it("shows proposed decisions as not established and routes to their owner", async () => {
    const onOpenDecisions = vi.fn();
    const user = await renderWiki({ initialArea: "systems", onOpenDecisions });
    await user.click(screen.getByRole("option", { name: /Shared alerts/ }));
    expect(screen.getByText("Proposed decision — not established project direction")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open Decisions" }));
    expect(onOpenDecisions).toHaveBeenCalledOnce();
  });

  it("keeps open questions distinct and routes the selected source id to Game Design", async () => {
    const onEditKnowledge = vi.fn();
    const user = await renderWiki({ onEditKnowledge });
    await user.click(screen.getByRole("button", { name: /Open Questions/ }));
    expect(await screen.findByRole("heading", { name: "Alert cadence?" })).toBeInTheDocument();
    expect(screen.getByText("Unresolved project question")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open question in Game Design" }));
    expect(onEditKnowledge).toHaveBeenCalledWith("question-1");
  });

  it("searches case-insensitively, combines filters, and exposes historical records explicitly", async () => {
    const user = await renderWiki({ initialArea: "systems" });
    await user.type(screen.getByRole("searchbox", { name: "Search knowledge" }), "EXACT SOUND");
    expect(screen.queryByRole("option", { name: /Exact sound coordinates/ })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Lifecycle"), "HISTORICAL");
    expect(screen.getByRole("option", { name: /Exact sound coordinates/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Authority"), "MANUAL");
    expect(screen.getByText("1 result")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByLabelText("Lifecycle")).toHaveValue("CURRENT");
  });

  it("keeps AI analysis visibly non-authoritative", async () => {
    const user = await renderWiki({ initialArea: "systems" });
    await user.click(screen.getByRole("option", { name: /Investigate under uncertainty/ }));
    expect(screen.getByText("AI working analysis — not approved project knowledge")).toBeInTheDocument();
    expect(screen.getByText("Non-authoritative AI working analysis")).toBeInTheDocument();
    expect(screen.getByText("Orient before moving.")).toBeInTheDocument();
  });

  it("keeps derived summaries outside result counts and routes to existing owners", async () => {
    const onViewAlignmentHistory = vi.fn();
    const onViewFeatureContracts = vi.fn<(area: KnowledgeArea) => void>();
    const user = await renderWiki({ initialArea: "systems", onViewAlignmentHistory, onViewFeatureContracts });
    expect(screen.getByText("4 results")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Alignment summary")).getByText("Derived summary · not a Wiki entry")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Feature Contract summary")).getByText("Enemy sound knowledge")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View Alignment History" }));
    await user.click(screen.getByRole("button", { name: "View Feature Contracts" }));
    expect(onViewAlignmentHistory).toHaveBeenCalledOnce();
    expect(onViewFeatureContracts).toHaveBeenCalledWith("systems");
  });

  it("never starts Git or Unity inspection and only renders session evidence passed by the shell", async () => {
    const user = await renderWiki({
      repositoryReality: { status: "DETECTED", repository: { branch: "main", detachedHead: false, head: { hash: "a".repeat(40), shortHash: "aaaaaaa", subject: "Current", author: "Dev", timestamp: knowledge.updatedAt }, workingTree: "DIRTY", changedFiles: [], totalChangedFiles: 2, changedFilesTruncated: false, diffStat: { filesChanged: 2, insertions: 3, deletions: 1 }, recentCommits: [] } },
      unityGroundTruth: { status: "DETECTED", evidence: { assets: true, packages: true, projectSettings: true }, projectVersion: { status: "AVAILABLE", version: "6000.3.23f1" }, manifest: { status: "NOT_ATTACHED" } },
    });
    expect(inspectRepositoryReality).not.toHaveBeenCalled();
    expect(inspectUnityGroundTruth).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Technical/ }));
    expect(screen.getByLabelText("Repository Reality summary")).toHaveTextContent("2 changed");
    expect(screen.getByLabelText("Unity Reality summary")).toHaveTextContent("Not attached");
  });

  it("isolates a failed source and preserves available authoritative knowledge", async () => {
    vi.mocked(loadSpecialistRuns).mockRejectedValue(new Error("history unavailable"));
    await renderWiki({ initialArea: "systems" });
    expect(screen.getByRole("alert")).toHaveTextContent("Specialist History: history unavailable");
    expect(screen.getByRole("option", { name: /Perception model/ })).toBeInTheDocument();
  });

  it("offers bounded source actions for a sparse project without generating content", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(null);
    vi.mocked(loadDecisions).mockResolvedValue(null);
    vi.mocked(loadSpecialistRuns).mockResolvedValue(null);
    const onOpenProjectInterview = vi.fn();
    const onOpenDecisions = vi.fn();
    const onEditKnowledge = vi.fn();
    const user = await renderWiki({ onOpenProjectInterview, onOpenDecisions, onEditKnowledge });
    expect(screen.getByRole("heading", { name: "Build your project knowledge" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import Knowledge" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate|rebaseline/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open Project Interview" }));
    expect(onOpenProjectInterview).toHaveBeenCalledOnce();
  });
});
