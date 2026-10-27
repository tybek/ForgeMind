import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { open } from "@tauri-apps/plugin-dialog";
import { KnowledgeImportPanel } from "./KnowledgeImportPanel";
import {
  applyKnowledgeImport,
  getKnowledgeImportPreflight,
  runKnowledgeImport,
  type KnowledgeImportCandidate,
  type KnowledgeImportPreflight,
} from "./platform/knowledgeImport";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("./platform/knowledgeImport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/knowledgeImport")>()),
  getKnowledgeImportPreflight: vi.fn(),
  runKnowledgeImport: vi.fn(),
  applyKnowledgeImport: vi.fn(),
}));

const workspace = { path: "D:\\Games\\Sample", projectId: "project" };
const model = {
  provider: "nebius_token_factory", modelId: "nvidia/nemotron", displayName: "NVIDIA Nemotron", family: "Nemotron",
  availability: "configured", capabilities: { structuredOutput: "JSON_OBJECT" as const }, enabled: true,
};
const preflight: KnowledgeImportPreflight = {
  taskLabel: "Existing Project Knowledge Import", provider: "Nebius Token Factory", modelId: model.modelId, models: [model],
  sources: [{ sourceId: "docs/colony.md", bytes: 512 }], totalSourceBytes: 512, boundedOrTruncated: false,
  estimatedInputTokensMinimum: 200, estimatedInputTokensMaximum: 300, usageBand: "LOW", historyAvailable: true,
  recentObservedLatencyMs: 1200,
};
const candidates: KnowledgeImportCandidate[] = [
  { id: "candidate-1", type: "KNOWLEDGE", title: "Tidal grid", content: "The colony uses tidal power.", section: "systems", sourceRefs: ["docs/colony.md"], sourceTrace: [{ sourceId: "docs/colony.md", section: "Aster Vale Colony", excerpt: "The colony uses tidal power." }], confidence: "HIGH", note: "Explicit fact.", duplicateStatus: "NEW", selectedByDefault: true },
  { id: "candidate-2", type: "DECISION", title: "Shared water", content: "Water remains shared.", section: "systems", sourceRefs: ["docs/colony.md"], sourceTrace: [{ sourceId: "docs/colony.md", section: "Recorded decision" }], confidence: "HIGH", note: "Existing title.", duplicateStatus: "EXISTING", selectedByDefault: false },
  { id: "candidate-3", type: "OPEN_QUESTION", title: "Beacon maintenance", content: "Who maintains the beacon?", section: "open_questions", sourceRefs: ["docs/colony.md"], sourceTrace: [{ sourceId: "docs/colony.md", section: "Open question" }], confidence: "MEDIUM", note: "Explicit question.", duplicateStatus: "NEW", selectedByDefault: true },
];
const fiveCandidates: KnowledgeImportCandidate[] = [
  candidates[0],
  { ...candidates[0], id: "candidate-4", title: "Shielded habitat", content: "The habitat is shielded from tidal storms." },
  { ...candidates[0], id: "candidate-5", title: "Beacon grid", content: "A beacon grid marks safe water routes." },
  candidates[1],
  candidates[2],
];

describe("Knowledge Import review workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(open).mockResolvedValue(["D:\\Games\\Sample\\docs\\colony.md"]);
    vi.mocked(getKnowledgeImportPreflight).mockResolvedValue(preflight);
    vi.mocked(runKnowledgeImport).mockResolvedValue({ candidates, provider: "nebius_token_factory", modelId: model.modelId, latencyMs: 1200 });
    vi.mocked(applyKnowledgeImport).mockResolvedValue({ appliedKnowledge: 1, proposedDecisions: 0, openQuestions: 0, skippedDuplicates: 0, errors: [] });
  });

  it("shows preflight after file selection and Cancel makes zero provider requests", async () => {
    const user = userEvent.setup();
    render(<KnowledgeImportPanel workspace={workspace} onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Import Knowledge" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Nebius Token Factory")).toBeInTheDocument();
    expect(within(dialog).getByText(/1 Markdown file/)).toBeInTheDocument();
    expect(runKnowledgeImport).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(runKnowledgeImport).not.toHaveBeenCalled();
  });

  it("keeps candidates transient, defaults duplicates off, supports edit and deselect, then applies only reviewed selection", async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    render(<KnowledgeImportPanel workspace={workspace} onApplied={onApplied} />);
    await user.click(screen.getByRole("button", { name: "Import Knowledge" }));
    await user.click(await screen.findByRole("button", { name: /Run extraction with NVIDIA Nemotron/ }));
    expect(runKnowledgeImport).toHaveBeenCalledTimes(1);
    expect(applyKnowledgeImport).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "Select Shared water" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Tidal grid" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Beacon maintenance" })).toBeChecked();

    const factCard = screen.getByRole("checkbox", { name: "Select Tidal grid" }).closest("article");
    expect(factCard).not.toBeNull();
    await user.click(within(factCard!).getByRole("button", { name: "Edit" }));
    const title = within(factCard!).getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Edited tidal grid");
    const questionCard = screen.getByRole("checkbox", { name: "Select Beacon maintenance" }).closest("article");
    expect(questionCard).not.toBeNull();
    await user.click(within(questionCard!).getByRole("button", { name: "Skip" }));
    await user.click(screen.getByRole("button", { name: "Apply Selected (1)" }));

    await waitFor(() => expect(applyKnowledgeImport).toHaveBeenCalledWith(workspace.path, workspace.projectId, [expect.objectContaining({ id: "candidate-1", title: "Edited tidal grid" })]));
    expect(onApplied).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent("Applied 1 reviewed candidate");
    expect(screen.getByText("Skipped duplicates").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Manually deselected").parentElement).toHaveTextContent("1");
  });

  it("transitions a successful five-candidate response directly to the Review Queue", async () => {
    vi.mocked(runKnowledgeImport).mockResolvedValue({ candidates: fiveCandidates, provider: "nebius_token_factory", modelId: model.modelId, latencyMs: 1200 });
    const user = userEvent.setup();
    render(<KnowledgeImportPanel workspace={workspace} onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Import Knowledge" }));
    await user.click(await screen.findByRole("button", { name: /Run extraction with NVIDIA Nemotron/ }));

    expect(await screen.findByText("Candidate Review Queue")).toBeInTheDocument();
    for (const candidate of fiveCandidates) expect(screen.getByText(candidate.title)).toBeInTheDocument();
    expect(screen.queryByText(/Review the bounded request/)).not.toBeInTheDocument();
    expect(applyKnowledgeImport).not.toHaveBeenCalled();
  });

  it("shows an explicit empty result and requires a new preflight confirmation before another request", async () => {
    vi.mocked(runKnowledgeImport).mockResolvedValue({ candidates: [], provider: "nebius_token_factory", modelId: model.modelId, latencyMs: 900 });
    const user = userEvent.setup();
    render(<KnowledgeImportPanel workspace={workspace} onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Import Knowledge" }));
    await user.click(await screen.findByRole("button", { name: /Run extraction with NVIDIA Nemotron/ }));

    expect(await screen.findByText("No import candidates found.")).toBeInTheDocument();
    expect(screen.getByText(/did not find durable knowledge/)).toBeInTheDocument();
    expect(screen.getByText("docs/colony.md")).toBeInTheDocument();
    expect(screen.queryByText(/Review the bounded request/)).not.toBeInTheDocument();
    expect(runKnowledgeImport).toHaveBeenCalledTimes(1);
    expect(applyKnowledgeImport).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Review request to run again" }));
    expect(screen.getByText(/Review the bounded request/)).toBeInTheDocument();
    expect(runKnowledgeImport).toHaveBeenCalledTimes(1);
  });

  it("shows invalid structured output as an executed-request error with preserved selection", async () => {
    vi.mocked(runKnowledgeImport).mockRejectedValue({
      code: "INVALID_KNOWLEDGE_IMPORT_OUTPUT",
      message: "The provider returned an invalid import schema.",
      requestExecuted: true,
    });
    const user = userEvent.setup();
    render(<KnowledgeImportPanel workspace={workspace} onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Import Knowledge" }));
    await user.click(await screen.findByRole("button", { name: /Run extraction with NVIDIA Nemotron/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("INVALID_KNOWLEDGE_IMPORT_OUTPUT");
    expect(alert).toHaveTextContent("Provider requestExecuted");
    expect(alert).toHaveTextContent("NVIDIA Nemotron");
    expect(alert).toHaveTextContent("docs/colony.md");
    expect(screen.queryByText(/Review the bounded request/)).not.toBeInTheDocument();
    expect(runKnowledgeImport).toHaveBeenCalledTimes(1);
    expect(applyKnowledgeImport).not.toHaveBeenCalled();
  });

  it("shows a safe provider failure without candidates, mutation, or automatic retry", async () => {
    vi.mocked(runKnowledgeImport).mockRejectedValue({
      code: "PROVIDER_ERROR",
      message: "Nebius Token Factory could not complete this request.",
      requestExecuted: true,
    });
    const user = userEvent.setup();
    render(<KnowledgeImportPanel workspace={workspace} onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Import Knowledge" }));
    await user.click(await screen.findByRole("button", { name: /Run extraction with NVIDIA Nemotron/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("PROVIDER_ERROR");
    expect(alert).toHaveTextContent("No automatic retry was performed");
    expect(screen.queryByText("Candidate Review Queue")).not.toBeInTheDocument();
    expect(screen.queryByText(/Review the bounded request/)).not.toBeInTheDocument();
    expect(runKnowledgeImport).toHaveBeenCalledTimes(1);
    expect(applyKnowledgeImport).not.toHaveBeenCalled();
  });

  it("allows only one in-flight extraction request even under repeated activation", async () => {
    let resolveRun!: (value: { candidates: KnowledgeImportCandidate[]; provider: string; modelId: string; latencyMs: number }) => void;
    vi.mocked(runKnowledgeImport).mockReturnValue(new Promise((resolve) => { resolveRun = resolve; }));
    const user = userEvent.setup();
    render(<KnowledgeImportPanel workspace={workspace} onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Import Knowledge" }));
    const runButton = await screen.findByRole("button", { name: /Run extraction with NVIDIA Nemotron/ });
    fireEvent.click(runButton);
    fireEvent.click(runButton);

    expect(runKnowledgeImport).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Extracting import candidates");
    resolveRun({ candidates, provider: "nebius_token_factory", modelId: model.modelId, latencyMs: 1200 });
    expect(await screen.findByText("Candidate Review Queue")).toBeInTheDocument();
    expect(runKnowledgeImport).toHaveBeenCalledTimes(1);
  });
});
