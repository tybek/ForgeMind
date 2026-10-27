import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureContractsPage } from "./FeatureContractsPage";
import {
  createFeatureContract,
  deleteFeatureContractDraft,
  draftFeatureContractWithAi,
  loadFeatureContracts,
  loadFeatureContractSources,
  setFeatureContractStatus,
  updateFeatureContract,
  type FeatureContract,
  type FeatureContractStatus,
} from "./platform/featureContracts";
import { loadModelRegistry } from "./platform/modelRegistry";

vi.mock("./platform/featureContracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/featureContracts")>()),
  loadFeatureContractSources: vi.fn(),
  loadFeatureContracts: vi.fn(),
  createFeatureContract: vi.fn(),
  updateFeatureContract: vi.fn(),
  deleteFeatureContractDraft: vi.fn(),
  draftFeatureContractWithAi: vi.fn(),
  setFeatureContractStatus: vi.fn(),
}));
vi.mock("./platform/modelRegistry", () => ({ loadModelRegistry: vi.fn() }));

const workspace = { path: "D:\\Games\\ExampleGame", projectId: "project-1" };
const model = {
  provider: "nebius_token_factory", modelId: "test/model", displayName: "Test Draft Model", family: "test",
  availability: "configured", capabilities: {}, enabled: true,
};
const evidence = {
  evidenceId: "unity:component:HearingPerception", source: "UNITY" as const,
  summary: "Unity component type HearingPerception is present; presence does not prove runtime behavior.",
  capturedAt: "2026-09-21T10:00:00Z", provenance: "VERIFIED_FROM_UNITY" as const,
};
const alignmentSource = {
  sourceType: "ALIGNMENT" as const, sourceId: "alignment-1", title: "Uncertain enemy sound information",
  statement: "Enemy sound information should remain uncertain and never grant exact player coordinates from sound alone.",
  status: "UNVERIFIED", area: "systems" as const, provenance: "MANUAL_ASSESSMENT" as const, preferred: true,
  alignmentRationale: "Component presence does not prove runtime knowledge handling.", realityEvidence: [evidence],
};
const compendiumSource = {
  sourceType: "COMPENDIUM" as const, sourceId: "knowledge-1", title: "Uncertain enemy sound information",
  statement: alignmentSource.statement, status: "LOCKED", area: "systems" as const, provenance: "DOCUMENTED" as const,
  preferred: false, realityEvidence: [],
};

function makeContract(status: FeatureContractStatus = "DRAFT", id = "contract-1", title = alignmentSource.title): FeatureContract {
  const reviewed = status !== "DRAFT";
  return {
    id, createdAt: "2026-09-21T12:00:00Z", updatedAt: id === "contract-2" ? "2026-09-21T13:00:00Z" : "2026-09-21T12:00:00Z",
    title,
    sources: {
      origin: { sourceType: "ALIGNMENT", sourceId: alignmentSource.sourceId, title: alignmentSource.title, statement: alignmentSource.statement, status: "UNVERIFIED", area: "systems", provenance: "MANUAL_ASSESSMENT" },
      intent: { sourceType: "COMPENDIUM", sourceId: compendiumSource.sourceId, title: compendiumSource.title, statement: compendiumSource.statement, status: "LOCKED", area: "systems", provenance: "DOCUMENTED" },
      alignment: { alignmentId: "alignment-1", status: "UNVERIFIED", rationale: alignmentSource.alignmentRationale, createdAt: "2026-09-21T11:00:00Z", reviewState: "APPROVED" },
      realityEvidence: [evidence],
    },
    goal: alignmentSource.statement,
    currentRealitySummary: "Approved Alignment Review is UNVERIFIED. Rationale: Component presence does not prove runtime knowledge handling.",
    affectedSystems: reviewed ? ["Enemy sound perception"] : [],
    requiredBehavior: reviewed ? ["Sound-only knowledge omits exact coordinates."] : [],
    outOfScope: reviewed ? ["Vision perception"] : [], risks: [],
    acceptanceCriteria: reviewed ? ["No exact coordinate is stored."] : [],
    deterministicTests: reviewed ? ["Sound-only knowledge test."] : [], implementationNotes: "",
    likelyAffectedEvidenceIds: reviewed ? [evidence.evidenceId] : [], status,
    reviewState: reviewed ? "APPROVED" : "PENDING_REVIEW",
    reviewedAt: reviewed ? "2026-09-21T12:01:00Z" : undefined,
  };
}

function documentWith(...contracts: FeatureContract[]) {
  return { formatVersion: 1, projectId: workspace.projectId, updatedAt: contracts.at(-1)?.updatedAt ?? "2026-09-21T12:00:00Z", contracts };
}

describe("Feature Contracts workbench", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadFeatureContractSources).mockResolvedValue({ projectId: workspace.projectId, sources: [alignmentSource, compendiumSource] });
    vi.mocked(loadFeatureContracts).mockResolvedValue(null);
    vi.mocked(loadModelRegistry).mockResolvedValue([model]);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("creates a fact-only draft from the preferred approved Alignment source", async () => {
    const user = userEvent.setup();
    const draft = makeContract();
    vi.mocked(createFeatureContract).mockResolvedValue(documentWith(draft));
    render(<FeatureContractsPage workspace={workspace} />);
    await user.click(await screen.findByText("Create a new contract"));
    expect(screen.getByRole("option", { name: /Preferred.*Alignment.*Uncertain enemy sound information/ })).toBeInTheDocument();
    expect(within(screen.getByLabelText("Selected source facts")).getByText(alignmentSource.statement)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create DRAFT" }));
    expect(createFeatureContract).toHaveBeenCalledWith(workspace.path, workspace.projectId, "ALIGNMENT", "alignment-1");
    expect(await screen.findByLabelText("Title")).toHaveValue(alignmentSource.title);
    expect(screen.getByLabelText("Required behavior One per line")).toHaveValue("");
    expect(within(screen.getByLabelText("Source traceability")).getByRole("button", { name: /Alignment.*Unverified/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Current Reality summary")).toHaveTextContent("Approved Alignment Review is UNVERIFIED");
  });

  it("does not silently present a draft whose returned source differs from the selected Alignment", async () => {
    const user = userEvent.setup();
    const degraded = makeContract();
    degraded.sources = {
      origin: { ...degraded.sources.intent },
      intent: { ...degraded.sources.intent },
      realityEvidence: [],
    };
    degraded.currentRealitySummary = "No approved Alignment Review is attached to this source.";
    vi.mocked(createFeatureContract).mockResolvedValue(documentWith(degraded));
    render(<FeatureContractsPage workspace={workspace} />);
    await user.click(await screen.findByText("Create a new contract"));
    await user.click(screen.getByRole("button", { name: "Create DRAFT" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("did not preserve the selected source");
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("edits the draft title and renders save feedback beside Save Draft", async () => {
    const user = userEvent.setup();
    const draft = makeContract();
    const saved = { ...draft, title: "Enemy sound uncertainty delivery", updatedAt: "2026-09-21T12:01:00Z" };
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(draft));
    vi.mocked(updateFeatureContract).mockResolvedValue(documentWith(saved));
    render(<FeatureContractsPage workspace={workspace} />);
    const title = await screen.findByLabelText("Title");
    await user.clear(title);
    await user.type(title, saved.title);
    await user.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(updateFeatureContract).toHaveBeenCalledWith(workspace.path, workspace.projectId, draft.id, expect.objectContaining({ title: saved.title }));
    const saveButton = screen.getByRole("button", { name: "Save Draft" });
    expect(saveButton.parentElement).toHaveTextContent("Draft saved for later review");
    expect(saveButton.parentElement).toHaveTextContent("Save incomplete reviewed work for later");
  });

  it("switches compact history rows without page navigation", async () => {
    const user = userEvent.setup();
    const first = makeContract("DRAFT", "contract-1", "First contract");
    const second = makeContract("DRAFT", "contract-2", "Second contract");
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(first, second));
    render(<FeatureContractsPage workspace={workspace} />);
    expect(await screen.findByLabelText("Title")).toHaveValue("Second contract");
    const firstRow = screen.getByRole("button", { name: /First contract.*DRAFT.*Alignment.*Updated/s });
    expect(firstRow).toHaveTextContent("DRAFT");
    expect(firstRow).toHaveTextContent("Updated 2026-09-21 12:00Z");
    await user.click(firstRow);
    expect(screen.getByLabelText("Title")).toHaveValue("First contract");
  });

  it("deletes only a draft after explicit inline confirmation", async () => {
    const user = userEvent.setup();
    const draft = makeContract();
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(draft));
    vi.mocked(deleteFeatureContractDraft).mockResolvedValue({ ...documentWith(), contracts: [] });
    render(<FeatureContractsPage workspace={workspace} />);
    await user.click(await screen.findByRole("button", { name: "Delete Draft" }));
    expect(deleteFeatureContractDraft).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(deleteFeatureContractDraft).toHaveBeenCalledWith(workspace.path, workspace.projectId, draft.id);
    expect(await screen.findByText("Draft deleted. Approved and historical contracts were not changed.")).toBeInTheDocument();
  });

  it("does not expose hard deletion for approved contracts", async () => {
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(makeContract("APPROVED")));
    render(<FeatureContractsPage workspace={workspace} />);
    expect(await screen.findByRole("button", { name: "Mark Superseded" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deprecate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("filters archived lifecycle history out of the active list without deleting it", async () => {
    const user = userEvent.setup();
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(
      makeContract("APPROVED", "contract-1", "Active contract"),
      makeContract("DEPRECATED", "contract-2", "Archived contract"),
    ));
    render(<FeatureContractsPage workspace={workspace} />);
    expect(await screen.findByRole("button", { name: /Active contract/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archived contract/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archived" }));
    expect(screen.getByRole("button", { name: /Archived contract/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Active contract/ })).not.toBeInTheDocument();
  });

  it("shows a local running state and available AI run metadata", async () => {
    const user = userEvent.setup();
    const draft = makeContract();
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(draft));
    let resolveDraft!: (value: Awaited<ReturnType<typeof draftFeatureContractWithAi>>) => void;
    vi.mocked(draftFeatureContractWithAi).mockReturnValue(new Promise((resolve) => { resolveDraft = resolve; }));
    render(<FeatureContractsPage workspace={workspace} />);
    await user.click(await screen.findByRole("button", { name: "Draft with AI" }));
    expect(screen.getByRole("button", { name: /Drafting with Test Draft Model/ })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Provider request running");
    resolveDraft({
      model: model.modelId, latencyMs: 420, inputTokens: 10, outputTokens: 20, totalTokens: 30,
      proposal: { goal: "AI goal", affectedSystems: [], requiredBehavior: [], outOfScope: [], risks: [], acceptanceCriteria: [], deterministicTests: [], implementationNotes: "" },
    });
    const proposal = await screen.findByLabelText("AI proposal review");
    expect(within(proposal).getByText("test/model")).toBeInTheDocument();
    expect(within(proposal).getByText("420 ms")).toBeInTheDocument();
    expect(within(proposal).getByText("30 tokens")).toBeInTheDocument();
  });

  it("calls AI only explicitly and keeps the proposal separate until a section is applied", async () => {
    const user = userEvent.setup();
    const draft = makeContract();
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(draft));
    vi.mocked(draftFeatureContractWithAi).mockResolvedValue({
      model: model.modelId, latencyMs: 42,
      proposal: {
        goal: "AI replacement goal", affectedSystems: ["Enemy perception"], requiredBehavior: ["Keep an uncertain sound region."],
        outOfScope: ["Vision"], risks: ["Legacy pursuit assumptions"], acceptanceCriteria: ["No exact sound coordinate"],
        deterministicTests: ["Sound-only knowledge test"], implementationNotes: "Preserve gameplay authority.",
      },
    });
    render(<FeatureContractsPage workspace={workspace} />);
    expect(draftFeatureContractWithAi).not.toHaveBeenCalled();
    expect(await screen.findByLabelText("Goal")).toHaveValue(alignmentSource.statement);
    await user.click(screen.getByRole("button", { name: "Draft with AI" }));
    expect(draftFeatureContractWithAi).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Goal")).toHaveValue(alignmentSource.statement);
    expect(updateFeatureContract).not.toHaveBeenCalled();
    const required = within(screen.getByRole("heading", { name: "Required behavior" }).closest("article")!);
    await user.click(required.getByRole("button", { name: "Apply" }));
    expect(screen.getByLabelText("Required behavior One per line")).toHaveValue("Keep an uncertain sound region.");
    expect(required.getByRole("button", { name: "Applied ✓" })).toBeDisabled();
    expect(updateFeatureContract).not.toHaveBeenCalled();
  });

  it("applies all only to empty sections and preserves existing human text", async () => {
    const user = userEvent.setup();
    const draft = makeContract();
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(draft));
    vi.mocked(draftFeatureContractWithAi).mockResolvedValue({
      model: model.modelId, latencyMs: 42,
      proposal: { goal: "AI goal", affectedSystems: ["Enemy perception"], requiredBehavior: ["AI behavior"], outOfScope: ["Vision"], risks: [], acceptanceCriteria: ["AI criterion"], deterministicTests: ["AI test"], implementationNotes: "AI note" },
    });
    render(<FeatureContractsPage workspace={workspace} />);
    await user.click(await screen.findByRole("button", { name: "Draft with AI" }));
    await user.click(await screen.findByRole("button", { name: "Apply all" }));
    expect(screen.getByLabelText("Goal")).toHaveValue(alignmentSource.statement);
    expect(screen.getByLabelText("Affected systems One per line; use files only when captured evidence supports them.")).toHaveValue("Enemy perception");
    const proposal = screen.getByLabelText("AI proposal review");
    expect(within(proposal).getByText(/Preserved human text in: Goal/)).toBeInTheDocument();
  });

  it("requires confirmation before replacing human text and discard never persists", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(makeContract()));
    vi.mocked(draftFeatureContractWithAi).mockResolvedValue({
      model: model.modelId, latencyMs: 42,
      proposal: { goal: "AI replacement", affectedSystems: [], requiredBehavior: [], outOfScope: [], risks: [], acceptanceCriteria: [], deterministicTests: [], implementationNotes: "" },
    });
    render(<FeatureContractsPage workspace={workspace} />);
    await user.click(await screen.findByRole("button", { name: "Draft with AI" }));
    const goal = within(screen.getByRole("heading", { name: "Goal" }).closest("article")!);
    await user.click(goal.getByRole("button", { name: "Replace with AI proposal" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Goal")).toHaveValue(alignmentSource.statement);
    await user.click(screen.getByRole("button", { name: "Discard proposal" }));
    expect(screen.queryByLabelText("AI proposal review")).not.toBeInTheDocument();
    expect(updateFeatureContract).not.toHaveBeenCalled();
  });

  it("previews and copies the exact same deterministic Implementation Brief", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(makeContract("APPROVED")));
    render(<FeatureContractsPage workspace={workspace} />);
    await user.click(await screen.findByRole("button", { name: "Preview Implementation Brief" }));
    const preview = screen.getByLabelText("Implementation Brief preview").querySelector("pre")!;
    await user.click(screen.getByRole("button", { name: "Copy Implementation Brief" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(preview.textContent));
    expect(screen.getByLabelText("Implementation Brief preview")).toHaveTextContent("same content shown in Preview");
  });

  it("previews and copies a clearly marked draft brief", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(makeContract()));
    render(<FeatureContractsPage workspace={workspace} />);
    await user.click(await screen.findByRole("button", { name: "Preview Implementation Brief" }));
    const preview = screen.getByLabelText("Implementation Brief preview").querySelector("pre")!;
    expect(preview).toHaveTextContent(/^DRAFT — NOT APPROVED/);
    await user.click(screen.getByRole("button", { name: "Copy Implementation Brief" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(preview.textContent));
  });

  it("allows approval with optional affected systems and out of scope left empty", async () => {
    const user = userEvent.setup();
    const draft = makeContract();
    const complete = { ...draft, requiredBehavior: ["Required"], acceptanceCriteria: ["Accepted"], deterministicTests: ["Tested"] };
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(draft));
    vi.mocked(updateFeatureContract).mockResolvedValue(documentWith(complete));
    vi.mocked(setFeatureContractStatus).mockResolvedValue(documentWith({ ...complete, status: "APPROVED", reviewState: "APPROVED" }));
    render(<FeatureContractsPage workspace={workspace} />);
    await user.type(await screen.findByLabelText("Required behavior One per line"), "Required");
    await user.type(screen.getByLabelText("Acceptance criteria One per line"), "Accepted");
    await user.type(screen.getByLabelText("Deterministic tests One per line"), "Tested");
    const approve = screen.getByRole("button", { name: "Save & Approve" });
    expect(approve).toBeEnabled();
    await user.click(approve);
    expect(setFeatureContractStatus).toHaveBeenCalledWith(workspace.path, workspace.projectId, draft.id, "APPROVED");
  });

  it("keeps source facts compact and navigable", async () => {
    const user = userEvent.setup();
    const onOpenSource = vi.fn();
    const onOpenReality = vi.fn();
    vi.mocked(loadFeatureContracts).mockResolvedValue(documentWith(makeContract("APPROVED")));
    render(<FeatureContractsPage workspace={workspace} onOpenSource={onOpenSource} onOpenReality={onOpenReality} />);
    const trace = await screen.findByLabelText("Source traceability");
    await user.click(within(trace).getByRole("button", { name: /Compendium.*Uncertain enemy sound information/ }));
    expect(onOpenSource).toHaveBeenCalledWith("COMPENDIUM", "knowledge-1");
    await user.click(within(trace).getByRole("button", { name: /Alignment.*Unverified.*Component presence/ }));
    expect(onOpenSource).toHaveBeenCalledWith("ALIGNMENT", "alignment-1");
    await user.click(within(trace).getByRole("button", { name: /Unity.*Verified From Unity/ }));
    expect(onOpenReality).toHaveBeenCalledWith("UNITY");
  });
});
