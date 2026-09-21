import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// @ts-expect-error Vitest supplies Node at test time; production TypeScript intentionally omits Node globals.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlignmentPage } from "./AlignmentPage";
import {
  createAlignmentReview,
  loadAlignmentResults,
  loadAlignmentSources,
  reviewAlignmentResult,
  type AlignmentDocument,
} from "./platform/alignment";

vi.mock("./platform/alignment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/alignment")>()),
  loadAlignmentSources: vi.fn(),
  loadAlignmentResults: vi.fn(),
  createAlignmentReview: vi.fn(),
  reviewAlignmentResult: vi.fn(),
}));

const workspace = { path: "D:\\Games\\Sample", projectId: "project-1" };
const intent = {
  sourceType: "COMPENDIUM" as const,
  sourceId: "intent-1",
  title: "Uncertain sound perception",
  statement: "Sound alone must not reveal exact player coordinates.",
  status: "LOCKED",
  area: "systems" as const,
  provenance: "DOCUMENTED" as const,
};
const evidence = {
  id: "unity:component:2026-09-21:0",
  source: "UNITY" as const,
  summary: "Unity GroundTruth observed component type HearingPerception on 4 components; this proves presence only, not runtime behavior.",
  capturedAt: "2026-09-21T10:00:00Z",
  provenance: "VERIFIED_FROM_UNITY" as const,
};
const sceneEvidence = {
  id: "unity:scene:scene:combat",
  source: "UNITY" as const,
  summary: "Unity GroundTruth observed scene Assets/Scenes/CombatLab.unity.",
  capturedAt: "2026-09-21T10:00:00Z",
  provenance: "VERIFIED_FROM_UNITY" as const,
};
const scriptableObjectEvidence = {
  id: "unity:scriptable-object:asset:hearing-settings",
  source: "UNITY" as const,
  summary: "Unity GroundTruth observed ScriptableObject Assets/Data/HearingSettings.asset of type HearingSettings.",
  capturedAt: "2026-09-21T10:00:00Z",
  provenance: "VERIFIED_FROM_UNITY" as const,
};
const gitFileEvidence = {
  id: "git:file:Assets/Scripts/HearingPerception.cs",
  source: "GIT" as const,
  summary: "Git reports modified project-relative file Assets/Scripts/HearingPerception.cs.",
  capturedAt: "2026-09-21T09:00:00Z",
  provenance: "VERIFIED_FROM_GIT" as const,
};
const gitStateEvidence = {
  id: "git:head:abc",
  source: "GIT" as const,
  summary: "Git HEAD abc: Perception update",
  capturedAt: "2026-09-21T09:00:00Z",
  provenance: "VERIFIED_FROM_GIT" as const,
};
const pendingResult = {
  id: "result-1",
  createdAt: "2026-09-21T11:00:00Z",
  intent,
  evidence: [{ evidenceId: evidence.id, source: evidence.source, summary: evidence.summary, capturedAt: evidence.capturedAt, provenance: evidence.provenance, assessment: "INSUFFICIENT" as const }],
  status: "UNVERIFIED" as const,
  rationale: "Component presence does not establish coordinate handling.",
  confidence: "LOW" as const,
  uncertainty: "Runtime sound payload values are not observed.",
  provenance: ["DOCUMENTED" as const, "VERIFIED_FROM_UNITY" as const, "MANUAL_ASSESSMENT" as const],
  reviewState: "PENDING_REVIEW" as const,
};
const pendingDocument: AlignmentDocument = {
  formatVersion: 1,
  projectId: workspace.projectId,
  updatedAt: "2026-09-21T11:00:00Z",
  results: [pendingResult],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

async function renderWorkspace() {
  const user = userEvent.setup();
  render(<AlignmentPage workspace={workspace} />);
  await screen.findByRole("heading", { name: "Alignment", level: 2 });
  return user;
}

async function selectIntentAndSuggestedEvidence(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole("combobox", { name: "Documented Intent source" }), "COMPENDIUM|intent-1");
  const suggested = screen.getByRole("heading", { name: "Suggested Evidence" }).closest<HTMLElement>("section")!;
  await user.click(within(suggested).getAllByRole("button", { name: "Select" })[0]);
}

async function completeReviewForm(user: ReturnType<typeof userEvent.setup>) {
  await selectIntentAndSuggestedEvidence(user);
  await user.type(screen.getByRole("textbox", { name: "Rationale" }), "Component presence does not establish coordinate handling.");
  await user.type(screen.getByRole("textbox", { name: "Uncertainty" }), "Runtime sound payload values are not observed.");
}

describe("Alignment workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAlignmentSources).mockResolvedValue({
      projectId: workspace.projectId,
      intentSources: [intent, {
        sourceType: "DECISION", sourceId: "decision-1", title: "No omniscience",
        statement: "AI does not receive exact coordinates.", status: "APPROVED", area: "systems", provenance: "APPROVED_INTENT",
      }],
      realityEvidence: [evidence, sceneEvidence, scriptableObjectEvidence, gitFileEvidence, gitStateEvidence],
    });
    vi.mocked(loadAlignmentResults).mockResolvedValue(null);
    vi.mocked(createAlignmentReview).mockResolvedValue(pendingDocument);
    vi.mocked(reviewAlignmentResult).mockResolvedValue({
      ...pendingDocument,
      results: [{ ...pendingResult, reviewState: "APPROVED", reviewedAt: "2026-09-21T12:00:00Z" }],
    });
  });

  it("provides Suggested, Search, and Browse discovery modes", async () => {
    const user = await renderWorkspace();
    const modes = screen.getByRole("tablist", { name: "Evidence discovery modes" });
    expect(within(modes).getByRole("tab", { name: "Suggested" })).toHaveAttribute("aria-selected", "true");
    expect(within(modes).getByRole("tab", { name: "Search" })).toBeInTheDocument();
    expect(within(modes).getByRole("tab", { name: "Browse" })).toBeInTheDocument();
    await user.click(within(modes).getByRole("tab", { name: "Browse" }));
    expect(screen.getByRole("heading", { name: "Browse Evidence" })).toBeInTheDocument();
  });

  it("shows search results immediately before a compact collapsed Suggested summary", async () => {
    const user = await renderWorkspace();
    await user.selectOptions(screen.getByRole("combobox", { name: "Documented Intent source" }), "COMPENDIUM|intent-1");
    await user.type(screen.getByRole("searchbox", { name: "Search evidence" }), "CombatLab");
    expect(screen.getByRole("tab", { name: "Search" })).toHaveAttribute("aria-selected", "true");
    const results = screen.getByRole("heading", { name: "Search Results" }).closest<HTMLElement>("section")!;
    const compactSuggestions = screen.getByText(/available · collapsed while searching/).closest<HTMLElement>("details")!;
    expect(results).toHaveTextContent("CombatLab.unity");
    expect(results.compareDocumentPosition(compactSuggestions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(compactSuggestions).not.toHaveAttribute("open");
  });

  it("keeps Browse groups collapsed and does not render their rows until opened", async () => {
    const user = await renderWorkspace();
    await user.click(screen.getByRole("tab", { name: "Browse" }));
    for (const label of [
      "Unity Components",
      "Unity Scenes",
      "Unity ScriptableObjects / other supported Unity evidence",
      "Git Changed Files",
      "Git HEAD / Repository State",
    ]) expect(screen.getByText(label).closest<HTMLElement>("details")).not.toHaveAttribute("open");
    expect(screen.queryByText("HearingPerception")).not.toBeInTheDocument();
    const componentGroup = screen.getByText("Unity Components").closest<HTMLElement>("details")!;
    await user.click(within(componentGroup).getByText("Unity Components"));
    expect(componentGroup).toHaveAttribute("open");
    expect(within(componentGroup).getByText("HearingPerception")).toBeInTheDocument();
  });

  it("uses a compact source, type, name, summary, and match-reason evidence hierarchy", async () => {
    const user = await renderWorkspace();
    await user.selectOptions(screen.getByRole("combobox", { name: "Documented Intent source" }), "COMPENDIUM|intent-1");
    const suggested = screen.getByRole("heading", { name: "Suggested Evidence" }).closest<HTMLElement>("section")!;
    const row = within(suggested).getAllByRole("button", { name: "Select" })[0].closest<HTMLElement>(".alignment-suggestion")!;
    expect(row.querySelector(".alignment-evidence-primary")).toHaveTextContent("UNITYComponentHearingPerception");
    expect(row.querySelector(".alignment-evidence-secondary")).toHaveTextContent("observed 4 times");
    expect(row).toHaveTextContent("Presence only — runtime behavior unverified");
    expect(row).toHaveTextContent("Match reason: shared perception");
    expect(row).not.toHaveTextContent("Unity GroundTruth observed component type");
    expect(within(row).getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("shows only matching compact evidence rows and honors the source filter", async () => {
    const user = await renderWorkspace();
    await user.type(screen.getByRole("searchbox", { name: "Search evidence" }), "CombatLab");
    const results = screen.getByRole("heading", { name: "Search Results" }).closest<HTMLElement>("section")!;
    expect(results).toHaveTextContent("1 matches");
    expect(results).toHaveTextContent("Matches search: “CombatLab”");
    expect(results).not.toHaveTextContent("HearingPerception");
    await user.selectOptions(screen.getByRole("combobox", { name: "Source" }), "GIT");
    expect(results).toHaveTextContent("0 matches");
  });

  it("keeps selected evidence visible across source filtering and shows Assessment only there", async () => {
    const user = await renderWorkspace();
    await user.click(screen.getByRole("tab", { name: "Browse" }));
    const componentGroup = screen.getByText("Unity Components").closest<HTMLElement>("details")!;
    await user.click(within(componentGroup).getByText("Unity Components"));
    const rawRow = within(componentGroup).getByText("HearingPerception").closest<HTMLElement>(".alignment-evidence-row")!;
    expect(within(rawRow).queryByRole("combobox", { name: /Assessment/ })).not.toBeInTheDocument();
    await user.click(within(rawRow).getByRole("button", { name: "Select" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Source" }), "GIT");
    const selected = screen.getByRole("heading", { name: "Selected Evidence" }).closest<HTMLElement>("section")!;
    expect(selected).toHaveTextContent("HearingPerception");
    expect(within(selected).getByRole("combobox", { name: "Assessment for HearingPerception" })).toBeInTheDocument();
    await user.click(within(selected).getByRole("button", { name: "Deselect all" }));
    expect(selected).toHaveTextContent("0 selected");
  });

  it("uses a three-pane workbench whose right pane owns rationale and create actions", async () => {
    await renderWorkspace();
    const workbench = screen.getByRole("heading", { name: "Intent" }).closest<HTMLElement>(".alignment-workbench")!;
    expect(workbench).toHaveAttribute("data-layout", "three-pane-responsive");
    expect(within(workbench).getByRole("heading", { name: "Reality Evidence" })).toBeInTheDocument();
    const reviewPane = within(workbench).getByRole("heading", { name: "Review" }).closest<HTMLElement>(".alignment-review-pane")!;
    expect(within(reviewPane).getByRole("heading", { name: "Selected Evidence" })).toBeInTheDocument();
    expect(within(reviewPane).getByRole("textbox", { name: "Rationale" })).toBeInTheDocument();
    expect(within(reviewPane).getByRole("button", { name: "Create Pending Review" })).toBeInTheDocument();
    expect(within(reviewPane).getByLabelText("Alignment preview")).toHaveTextContent("Alignment preview:UNVERIFIED");
  });

  it("defines a stacked responsive fallback for narrow windows", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    expect(styles).toMatch(/@media \(max-width: 1080px\)[\s\S]*?\.alignment-workbench\s*{[\s\S]*?grid-template-columns: 1fr;/);
  });

  it("explains real validation reasons locally instead of presenting a false busy state", async () => {
    await renderWorkspace();
    const reviewPane = screen.getByRole("heading", { name: "Review" }).closest<HTMLElement>(".alignment-review-pane")!;
    const create = within(reviewPane).getByRole("button", { name: "Create Pending Review" });
    expect(create).toBeDisabled();
    expect(within(reviewPane).getByText("Select a documented Intent source.")).toBeInTheDocument();
    expect(within(reviewPane).getByText("Select at least one Reality evidence item.")).toBeInTheDocument();
    expect(within(reviewPane).queryByText("Creating review…")).not.toBeInTheDocument();
  });

  it("supports the explicit No additional uncertainty flow without meaningless placeholder text", async () => {
    const user = await renderWorkspace();
    await selectIntentAndSuggestedEvidence(user);
    await user.type(screen.getByRole("textbox", { name: "Rationale" }), "Component presence is enough for this bounded review.");
    await user.click(screen.getByRole("checkbox", { name: "No additional uncertainty" }));
    expect(screen.getByRole("textbox", { name: "Uncertainty" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Create Pending Review" }));
    expect(createAlignmentReview).toHaveBeenCalledWith(workspace.path, workspace.projectId, expect.objectContaining({ uncertainty: "No additional uncertainty." }));
  });

  it("creates once, shows compact success, adds a local badge, and opens the created review in history", async () => {
    const request = deferred<AlignmentDocument>();
    vi.mocked(createAlignmentReview).mockReturnValue(request.promise);
    const user = await renderWorkspace();
    await completeReviewForm(user);
    const create = screen.getByRole("button", { name: "Create Pending Review" });
    fireEvent.click(create);
    fireEvent.click(create);
    expect(createAlignmentReview).toHaveBeenCalledTimes(1);
    expect(create).toBeDisabled();
    expect(screen.getByText("Creating review…")).toBeInTheDocument();
    request.resolve(pendingDocument);
    expect(await screen.findByText("Review created · UNVERIFIED")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Current Review" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Review History • 1" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View in Review History" }));
    expect(screen.getByRole("heading", { name: "Review History" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Review History" })).toBeInTheDocument();
    expect(screen.getByLabelText("Selected alignment review")).toHaveTextContent("Uncertain sound perception");
    expect(screen.getByLabelText("Selected alignment review")).toHaveTextContent("Pending Review");
    expect(screen.getByLabelText("Selected alignment review")).toHaveTextContent("MANUAL_ASSESSMENT");
    expect(screen.queryByText("AI_INFERENCE")).not.toBeInTheDocument();
  });

  it("shows a safe actionable creation failure locally and preserves the form", async () => {
    vi.mocked(createAlignmentReview).mockRejectedValue({ message: "Selected Reality evidence is no longer available from Git or Unity GroundTruth." });
    const user = await renderWorkspace();
    await completeReviewForm(user);
    await user.click(screen.getByRole("button", { name: "Create Pending Review" }));
    const reviewPane = screen.getByRole("heading", { name: "Review" }).closest<HTMLElement>(".alignment-review-pane")!;
    const alert = await within(reviewPane).findByRole("alert");
    expect(alert).toHaveTextContent("no longer available");
    expect(alert).toHaveTextContent("selections and rationale were kept");
    expect(within(reviewPane).getByRole("textbox", { name: "Rationale" })).toHaveValue("Component presence does not establish coordinate handling.");
    expect(within(reviewPane).getByRole("combobox", { name: "Assessment for HearingPerception" })).toBeInTheDocument();
  });

  it("approves a pending result while preserving its evidence and provenance rendering", async () => {
    vi.mocked(loadAlignmentResults).mockResolvedValue(pendingDocument);
    const user = await renderWorkspace();
    await user.click(screen.getByRole("tab", { name: "Review History" }));
    const approve = screen.getByRole("button", { name: "Approve" });
    expect(screen.getAllByText("HearingPerception").length).toBeGreaterThan(0);
    await user.click(approve);
    expect(reviewAlignmentResult).toHaveBeenCalledWith(workspace.path, workspace.projectId, pendingResult.id, "APPROVED");
    expect((await screen.findAllByText("Approved")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("rejects a pending result and keeps it visible as historical review", async () => {
    vi.mocked(loadAlignmentResults).mockResolvedValue(pendingDocument);
    vi.mocked(reviewAlignmentResult).mockResolvedValue({
      ...pendingDocument,
      results: [{ ...pendingResult, reviewState: "REJECTED", reviewedAt: "2026-09-21T12:00:00Z" }],
    });
    const user = await renderWorkspace();
    await user.click(screen.getByRole("tab", { name: "Review History" }));
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect((await screen.findAllByText("Rejected")).length).toBeGreaterThan(0);
    expect(screen.getByText(/COMPENDIUM: Uncertain sound perception/)).toBeInTheDocument();
  });
});
