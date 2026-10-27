import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WritersRoomPage } from "./WritersRoomPage";
import type { Workspace } from "./App";
import {
  applyAiWorkspaceProposal,
  archiveAiWorkspaceSession,
  createAiWorkspaceSession,
  deleteAiWorkspaceSession,
  listAiWorkspaceProfiles,
  loadAiWorkspaceSessions,
  normalizeAiWorkspaceDocument,
  reopenAiWorkspaceSession,
  reviewAiWorkspaceProposal,
  setAiWorkspaceMarkdownContext,
  updateAiWorkspaceProposal,
  type AiWorkspaceDocument,
  type AiWorkspaceSession,
} from "./platform/aiWorkspace";
import { loadWritersRoomPreflight, loadWritersRoomUsage, runWritersRoom } from "./platform/writersRoom";
import { clearExternalResearch, loadTavilyConfiguration, openExternalResearchSource, searchWithTavily, setExternalResearchSelection } from "./platform/externalResearch";
import { open } from "@tauri-apps/plugin-dialog";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("./platform/aiWorkspace", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/aiWorkspace")>()),
  applyAiWorkspaceProposal: vi.fn(),
  archiveAiWorkspaceSession: vi.fn(),
  archiveAndResetAiWorkspaceHistory: vi.fn(),
  createAiWorkspaceSession: vi.fn(),
  deleteAiWorkspaceSession: vi.fn(),
  listAiWorkspaceProfiles: vi.fn(),
  loadAiWorkspaceSessions: vi.fn(),
  reopenAiWorkspaceSession: vi.fn(),
  reviewAiWorkspaceProposal: vi.fn(),
  setAiWorkspaceMarkdownContext: vi.fn(),
  updateAiWorkspaceProposal: vi.fn(),
}));
vi.mock("./platform/writersRoom", () => ({
  loadWritersRoomPreflight: vi.fn(),
  loadWritersRoomUsage: vi.fn(),
  runWritersRoom: vi.fn(),
}));
vi.mock("./platform/externalResearch", () => ({
  clearExternalResearch: vi.fn(),
  loadTavilyConfiguration: vi.fn(),
  openExternalResearchSource: vi.fn(),
  searchWithTavily: vi.fn(),
  setExternalResearchSelection: vi.fn(),
}));

const workspace: Workspace = {
  path: "D:\\Game",
  formatVersion: 1,
  projectId: "project-1",
  name: "Narrative Game",
  createdAt: "2026-09-28T12:00:00.000Z",
};

const profiles = [
  { id: "lore_architect", displayName: "Lore Architect", taskPurpose: "Develop source-aware lore.", allowedContextCategories: [], preferredModelId: "nvidia/nemotron-3-super-120b-a12b", outputExpectations: "Bounded", reviewExpectations: "Review", availableForRuns: true },
  { id: "character_dialogue", displayName: "Character & Dialogue", taskPurpose: "Develop characters and dialogue.", allowedContextCategories: [], preferredModelId: "nvidia/nemotron-3-super-120b-a12b", outputExpectations: "Bounded", reviewExpectations: "Review", availableForRuns: true },
  { id: "continuity_editor", displayName: "Continuity Editor", taskPurpose: "Check continuity.", allowedContextCategories: [], preferredModelId: "nvidia/nemotron-3-super-120b-a12b", outputExpectations: "Bounded", reviewExpectations: "Review", availableForRuns: true },
];

function session(overrides: Partial<AiWorkspaceSession> = {}): AiWorkspaceSession {
  return {
    id: "session-1",
    projectId: workspace.projectId,
    surface: "writers_room",
    purpose: "Develop narrative.",
    specialistProfileId: "lore_architect",
    title: "Harbor Coalition",
    createdAt: "2026-09-28T12:00:00.000Z",
    updatedAt: "2026-09-28T12:00:00.000Z",
    status: "ACTIVE",
    messages: [],
    selectedMarkdownPaths: [],
    externalResearchSources: [],
    externalResearchRuns: [],
    sourceTrace: [],
    proposals: [],
    ...overrides,
  };
}

function document(current: AiWorkspaceSession): AiWorkspaceDocument {
  return { formatVersion: 1, projectId: workspace.projectId, updatedAt: current.updatedAt, sessions: [current] };
}

const preflight = {
  taskLabel: "Lore Architect response",
  profileId: "lore_architect",
  profileName: "Lore Architect",
  provider: "nebius_token_factory",
  nemotronProvider: "nebius_token_factory",
  modelId: "nvidia/nemotron-3-super-120b-a12b",
  defaultModelId: "nvidia/nemotron-3-super-120b-a12b",
  models: [{ provider: "nebius_token_factory", modelId: "nvidia/nemotron-3-super-120b-a12b", displayName: "NVIDIA Nemotron 3 Super 120B", family: "Nemotron", availability: "configured", capabilities: {}, enabled: true }],
  contextSummary: ["12 recent session messages maximum", "No matching Project Brain or Markdown sources"],
  sourceTrace: [],
  estimatedInputTokens: { minimum: 500, maximum: 700 },
  usageBand: "low" as const,
  historyAvailable: true,
};

async function renderPage(current = session()) {
  vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(document(current));
  const user = userEvent.setup();
  render(<WritersRoomPage workspace={workspace} />);
  await screen.findByRole("heading", { name: current.title }, { timeout: 3000 });
  return user;
}

describe("Writers' Room", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAiWorkspaceProfiles).mockResolvedValue(profiles);
    vi.mocked(loadWritersRoomUsage).mockResolvedValue([]);
    vi.mocked(loadTavilyConfiguration).mockResolvedValue({ configured: true, provider: "Tavily", setupGuidance: "Set TAVILY_API_KEY." });
    vi.mocked(openExternalResearchSource).mockResolvedValue();
    vi.mocked(loadWritersRoomPreflight).mockResolvedValue(preflight);
  });

  it("restores a project session, shows its profile starters, and archives explicitly", async () => {
    const current = session();
    const archived = { ...current, status: "ARCHIVED" as const };
    vi.mocked(archiveAiWorkspaceSession).mockResolvedValue(document(archived));
    vi.mocked(reopenAiWorkspaceSession).mockResolvedValue(document(current));
    const user = await renderPage(current);
    expect(screen.getByText("Develop a faction")).toBeInTheDocument();
    expect(screen.getByText(/Nothing becomes project truth/)).toBeInTheDocument();
    const archive = screen.getByRole("button", { name: "Archive Harbor Coalition" });
    expect(archive).toHaveClass("writers-room-session-action");
    expect(archive).not.toHaveClass("writers-room-session-action--danger");
    expect(screen.getByRole("button", { name: "Delete Harbor Coalition" })).toHaveClass("writers-room-session-action--danger");
    await user.click(archive);
    expect(archiveAiWorkspaceSession).toHaveBeenCalledWith(workspace.path, workspace.projectId, current.id);
    expect(screen.getByText(/^Archived · /)).toBeInTheDocument();
    const reopen = screen.getByRole("button", { name: "Reopen Harbor Coalition" });
    expect(reopen).toHaveClass("writers-room-session-action");
    expect(reopen).not.toHaveClass("writers-room-session-action--danger");
    await user.click(reopen);
    expect(reopenAiWorkspaceSession).toHaveBeenCalledWith(workspace.path, workspace.projectId, current.id);
    expect(await screen.findByRole("heading", { name: "Harbor Coalition" })).toBeInTheDocument();
  });

  it("presents navigable sources as keyboard-accessible cards with a clear affordance", async () => {
    const source = {
      sourceType: "COMPENDIUM" as const,
      sourceId: "knowledge-1",
      label: "Perception model",
      authority: "ESTABLISHED_KNOWLEDGE" as const,
      navigationTarget: "game_design",
    };
    const current = session({
      messages: [{ id: "assistant-1", role: "ASSISTANT", content: "Grounded response.", questions: [], createdAt: "2026-09-28T12:01:00.000Z", sourceTrace: [source] }],
    });
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(document(current));
    const onOpenSource = vi.fn();
    const user = userEvent.setup();
    render(<WritersRoomPage workspace={workspace} onOpenSource={onOpenSource} />);
    const sourceCard = await screen.findByRole("button", { name: "Open source: Perception model" });
    expect(sourceCard).toBeEnabled();
    expect(sourceCard).toHaveClass("writers-room-source-card");
    expect(within(sourceCard).getByText("ESTABLISHED KNOWLEDGE")).toBeInTheDocument();
    expect(within(sourceCard).getByText("Open source", { exact: false })).toBeInTheDocument();
    sourceCard.focus();
    await user.keyboard("{Enter}");
    expect(onOpenSource).toHaveBeenCalledWith(source);
  });

  it("requires preflight, Cancel sends nothing, and one confirmation makes one request", async () => {
    const current = session();
    const completed = session({
      messages: [
        { id: "user-1", role: "USER", content: "Develop the faction", questions: [], createdAt: "2026-09-28T12:01:00.000Z", sourceTrace: [] },
        { id: "assistant-1", role: "ASSISTANT", content: "A proposed direction.", questions: [{ question: "Who opposes them?", options: [] }, { question: "What do they protect?", options: [] }, { question: "What divides them?", options: [] }], createdAt: "2026-09-28T12:01:01.000Z", sourceTrace: [], usageReference: { applicationSessionId: "00000000-0000-4000-8000-000000000001", usageTimestamp: "2026-09-28T12:01:01.000Z", profileId: "lore_architect" } },
      ],
    });
    const immediateDocument = normalizeAiWorkspaceDocument({
      ...document(completed),
      sessions: [{
        id: completed.id, projectId: completed.projectId, surface: completed.surface, purpose: completed.purpose,
        specialistProfileId: completed.specialistProfileId, title: completed.title, createdAt: completed.createdAt,
        updatedAt: completed.updatedAt, status: completed.status, selectedMarkdownPaths: [],
        messages: completed.messages.map((message) => ({
          id: message.id, role: message.role, content: message.content, questions: message.questions,
          createdAt: message.createdAt, ...(message.usageReference ? { usageReference: message.usageReference } : {}),
        })),
      }],
    });
    vi.mocked(runWritersRoom).mockResolvedValue({ document: immediateDocument, provider: "nebius_token_factory", model: preflight.modelId, latencyMs: 1200, inputTokens: 100, outputTokens: 80, totalTokens: 180, usageReference: completed.messages[1].usageReference! });
    vi.mocked(loadWritersRoomUsage)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ timestamp: "2026-09-28T12:01:01.000Z", sessionId: "00000000-0000-4000-8000-000000000001", projectId: workspace.projectId, provider: "nebius_token_factory", modelId: preflight.modelId, taskCategory: "narrative_workspace", inputTokens: 100, outputTokens: 80, totalTokens: 180, latencyMs: 1200, success: true, structuredOutputSuccess: true }]);
    const user = await renderPage(current);
    await user.type(screen.getByLabelText("Continue the conversation"), "Develop the faction");
    await user.click(screen.getByRole("button", { name: "Send" }));
    const dialog = await screen.findByRole("dialog", { name: "Lore Architect response" });
    expect(dialog).toHaveTextContent("LOW");
    expect(dialog).toHaveTextContent("Exact estimate unavailable");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(runWritersRoom).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Lore Architect response" })).getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(runWritersRoom).toHaveBeenCalledTimes(1));
    expect(runWritersRoom).toHaveBeenCalledWith(expect.objectContaining({ mode: "SEND", modelId: preflight.modelId, message: "Develop the faction" }));
    expect(await screen.findByText("A proposed direction.")).toBeInTheDocument();
    expect(screen.getByText("What divides them?")).toBeInTheDocument();
    expect(screen.getByText(/100\/80\/180 tokens/)).toBeInTheDocument();
    expect(screen.getByLabelText("Continue the conversation")).toBeEnabled();
  });

  it("renders restored string questions, narrative context, and supplied sources without a phase badge", async () => {
    const covenantSource = {
      sourceType: "COMPENDIUM" as const,
      sourceId: "example-guild",
      label: "Example Guild",
      authority: "ESTABLISHED_KNOWLEDGE" as const,
      navigationTarget: "game_design",
    };
    const current = session({
      messages: [{
        id: "assistant-1", role: "ASSISTANT", content: "The Example Guild is established, but its legitimacy source is still unresolved.",
        questions: [{
          question: "Who should validate salvage licenses? Possible directions: settlement councils, broker consensus, inherited charters, or reputation.",
          options: [],
        }],
        contextSummary: { establishedKnowledge: 3, approvedDecisions: 1, openQuestions: 2, documentedSources: 0, externalResearch: 0, recentMessages: 4 },
        createdAt: "2026-09-28T12:01:00.000Z", sourceTrace: [covenantSource],
      }],
    });
    await renderPage(current);
    expect(screen.queryByText("CLARIFY")).not.toBeInTheDocument();
    expect(screen.getByText(/Who should validate salvage licenses\?/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Example Guild.*ESTABLISHED KNOWLEDGE/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Narrative context summary")).toHaveTextContent("3 established");
    expect(screen.getByLabelText("Narrative context summary")).toHaveTextContent("2 open questions");
  });

  it("keeps the prior conversation visible and offers reload without a paid retry after run-result normalization fails", async () => {
    const current = session({ messages: [{ id: "old", role: "ASSISTANT", content: "Existing conversation.", questions: [], createdAt: "2026-09-28T12:00:00.000Z", sourceTrace: [] }] });
    const persisted = session({ messages: [...current.messages, { id: "new", role: "ASSISTANT", content: "Persisted response.", questions: [], createdAt: "2026-09-28T12:01:00.000Z", sourceTrace: [] }] });
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValueOnce(document(current)).mockResolvedValueOnce(document(persisted));
    vi.mocked(runWritersRoom).mockRejectedValue({ code: "AI_WORKSPACE_RESPONSE_RENDER_FAILED", message: "The response was saved, but could not display safely." });
    const user = userEvent.setup();
    render(<WritersRoomPage workspace={workspace} />);
    await screen.findByText("Existing conversation.");
    await user.type(screen.getByLabelText("Continue the conversation"), "Continue it");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Lore Architect response" })).getByRole("button", { name: "Send request" }));
    expect(await screen.findByText("Existing conversation.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload saved session" })).toBeInTheDocument();
    expect(screen.getByLabelText("Continue the conversation")).toHaveValue("");
    expect(runWritersRoom).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Reload saved session" }));
    expect(await screen.findByText("Persisted response.")).toBeInTheDocument();
    expect(runWritersRoom).toHaveBeenCalledTimes(1);
  });

  it("preserves the conversation and draft after invalid structured output without retrying", async () => {
    const current = session({ messages: [{ id: "old", role: "ASSISTANT", content: "Existing conversation.", questions: [], createdAt: "2026-09-28T12:00:00.000Z", sourceTrace: [] }] });
    vi.mocked(runWritersRoom).mockRejectedValue({ code: "INVALID_WRITERS_ROOM_OUTPUT", message: "The provider returned an invalid Writers' Room response schema." });
    const user = await renderPage(current);
    const composer = screen.getByLabelText("Continue the conversation");
    await user.type(composer, "Keep this draft");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Lore Architect response" })).getByRole("button", { name: "Send request" }));
    expect(await screen.findByText("Existing conversation.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("INVALID_WRITERS_ROOM_OUTPUT");
    expect(composer).toHaveValue("Keep this draft");
    expect(composer).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Reload saved session" })).not.toBeInTheDocument();
    expect(runWritersRoom).toHaveBeenCalledTimes(1);
    expect(applyAiWorkspaceProposal).not.toHaveBeenCalled();
  });

  it("reviews then applies proposals through the owning-domain boundary", async () => {
    const pending = {
      id: "proposal-1", proposalType: "CREATE_DECISION" as const, title: "Elect the Council Speaker", summary: "The faction elects its leader.", reason: "Preserves political tension.", status: "PENDING" as const,
      createdAt: "2026-09-28T12:02:00.000Z", updatedAt: "2026-09-28T12:02:00.000Z", sourceTrace: [],
    };
    const accepted = { ...pending, status: "ACCEPTED" as const };
    const reviewed = session({ proposals: [accepted] });
    const applied = session({ proposals: [{ ...accepted, status: "APPLIED" as const }] });
    vi.mocked(reviewAiWorkspaceProposal).mockResolvedValue(document(reviewed));
    vi.mocked(applyAiWorkspaceProposal).mockResolvedValue({ document: document(applied), target: "DECISION", targetId: "decision-1" });
    const user = await renderPage(session({ proposals: [pending] }));
    await user.click(screen.getByRole("button", { name: "Review & edit" }));
    await user.click(screen.getByRole("button", { name: "Accept proposal" }));
    expect(reviewAiWorkspaceProposal).toHaveBeenCalledWith(workspace.path, workspace.projectId, "session-1", "proposal-1", "ACCEPTED");
    await user.click(await screen.findByRole("button", { name: "Apply" }));
    expect(applyAiWorkspaceProposal).toHaveBeenCalledWith(workspace.path, workspace.projectId, "session-1", "proposal-1");
    expect(await screen.findByText("APPLIED")).toBeInTheDocument();
  });

  it("cancels proposal edits locally, persists reviewed text, and applies the edited proposal", async () => {
    const pending = {
      id: "proposal-edit", proposalType: "SAVE_KNOWLEDGE" as const, title: "Salvage authority", summary: "A central office grants licenses.", reason: "Defines legal control.", status: "PENDING" as const,
      createdAt: "2026-09-28T12:02:00.000Z", updatedAt: "2026-09-28T12:02:00.000Z", sourceTrace: [],
    };
    const accepted = { ...pending, title: "Broker licensing", summary: "Local brokers validate licenses; there is no central authority.", status: "ACCEPTED" as const, editedByHuman: true };
    const refined = { ...accepted, summary: "Local brokers validate salvage licenses; no central authority exists." };
    vi.mocked(updateAiWorkspaceProposal)
      .mockResolvedValueOnce(document(session({ proposals: [{ ...accepted, status: "PENDING" as const }] })))
      .mockResolvedValueOnce(document(session({ proposals: [refined] })));
    vi.mocked(reviewAiWorkspaceProposal).mockResolvedValue(document(session({ proposals: [accepted] })));
    vi.mocked(applyAiWorkspaceProposal).mockResolvedValue({ document: document(session({ proposals: [{ ...refined, status: "APPLIED" as const }] })), target: "PROJECT_KNOWLEDGE", targetId: "knowledge-1" });
    const user = await renderPage(session({ proposals: [pending] }));

    await user.click(screen.getByRole("button", { name: "Review & edit" }));
    await user.clear(screen.getByLabelText("Proposal title"));
    await user.type(screen.getByLabelText("Proposal title"), "Unsaved edit");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(updateAiWorkspaceProposal).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Salvage authority" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Review & edit" }));
    await user.clear(screen.getByLabelText("Proposal title"));
    await user.type(screen.getByLabelText("Proposal title"), accepted.title);
    await user.clear(screen.getByLabelText("Proposed content"));
    await user.type(screen.getByLabelText("Proposed content"), accepted.summary);
    await user.click(screen.getByRole("button", { name: "Accept proposal" }));
    expect(updateAiWorkspaceProposal).toHaveBeenCalledWith(workspace.path, workspace.projectId, "session-1", pending.id, accepted.title, accepted.summary, pending.reason);
    expect(reviewAiWorkspaceProposal).toHaveBeenCalledWith(workspace.path, workspace.projectId, "session-1", pending.id, "ACCEPTED");
    expect(await screen.findByText("AI-assisted · human edited")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit before Apply" }));
    await user.clear(screen.getByLabelText("Proposed content"));
    await user.type(screen.getByLabelText("Proposed content"), refined.summary);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(refined.summary)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(applyAiWorkspaceProposal).toHaveBeenCalledWith(workspace.path, workspace.projectId, "session-1", pending.id);
  });

  it("stores only project-relative Markdown selections and enforces the session bound", async () => {
    const current = session({ selectedMarkdownPaths: ["LORE.md"] });
    vi.mocked(open).mockResolvedValue(["D:\\Game\\FACTIONS.md"]);
    vi.mocked(setAiWorkspaceMarkdownContext).mockResolvedValue(document(session({ selectedMarkdownPaths: ["LORE.md", "FACTIONS.md"] })));
    const user = await renderPage(current);
    await user.click(screen.getByRole("button", { name: "Add Markdown Context" }));
    await waitFor(() => expect(setAiWorkspaceMarkdownContext).toHaveBeenCalledWith(workspace.path, workspace.projectId, current.id, ["LORE.md", "FACTIONS.md"]));
    expect(await screen.findByText("FACTIONS.md")).toBeInTheDocument();
  });

  it("creates a session with the selected runnable profile", async () => {
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(null);
    const created = session({ specialistProfileId: "character_dialogue", title: "Mira voice" });
    vi.mocked(createAiWorkspaceSession).mockResolvedValue(document(created));
    const user = userEvent.setup();
    render(<WritersRoomPage workspace={workspace} />);
    expect(await screen.findAllByRole("button", { name: "New Session" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "New Session" }));
    const dialog = screen.getByRole("dialog", { name: "Start a Writers' Room session" });
    await user.type(within(dialog).getByLabelText("Session title"), "Mira voice");
    await user.selectOptions(within(dialog).getByLabelText("Profile"), "character_dialogue");
    await user.click(within(dialog).getByRole("button", { name: "Create Session" }));
    expect(createAiWorkspaceSession).toHaveBeenCalledWith(workspace.path, workspace.projectId, "writers_room", expect.any(String), "character_dialogue", "Mira voice");
    expect(await screen.findByRole("heading", { name: "Mira voice" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Start a Writers' Room session" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Continue the conversation")).toBeEnabled();
    expect(runWritersRoom).not.toHaveBeenCalled();
  });

  it("keeps the create dialog usable after failure and Cancel or Escape creates nothing", async () => {
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(null);
    vi.mocked(createAiWorkspaceSession).mockRejectedValue({ code: "AI_WORKSPACE_WRITE_FAILED", message: "The session could not be saved." });
    const user = userEvent.setup();
    render(<WritersRoomPage workspace={workspace} />);
    await user.click(await screen.findByRole("button", { name: "New Session" }));
    let dialog = screen.getByRole("dialog", { name: "Start a Writers' Room session" });
    expect(dialog.parentElement).toHaveClass("writers-room-dialog-backdrop");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await user.type(within(dialog).getByLabelText("Session title"), "Unsaved idea");
    await user.selectOptions(within(dialog).getByLabelText("Profile"), "continuity_editor");
    await user.click(within(dialog).getByRole("button", { name: "Create Session" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("could not be saved");
    expect(within(dialog).getByLabelText("Session title")).toHaveValue("Unsaved idea");
    expect(within(dialog).getByLabelText("Profile")).toHaveValue("continuity_editor");
    expect(screen.getByRole("heading", { name: /Build narrative/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(createAiWorkspaceSession).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "New Session" }));
    dialog = screen.getByRole("dialog", { name: "Start a Writers' Room session" });
    await user.keyboard("{Escape}");
    expect(dialog).not.toBeInTheDocument();
    expect(createAiWorkspaceSession).toHaveBeenCalledTimes(1);
  });

  it("restores the real persisted empty-session shape without blanking after restart", async () => {
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(normalizeAiWorkspaceDocument({
      formatVersion: 1,
      projectId: workspace.projectId,
      updatedAt: "2026-09-28T21:12:50.941Z",
      sessions: [{
        id: "persisted-session", projectId: workspace.projectId, surface: "writers_room",
        purpose: "Develop narrative ideas through source-aware conversation and reviewed proposals.",
        specialistProfileId: "lore_architect", title: "Salvage Rights Faction",
        createdAt: "2026-09-28T21:12:50.941Z", updatedAt: "2026-09-28T21:12:50.941Z",
        status: "ACTIVE", messages: [], selectedMarkdownPaths: [],
      }],
    }));
    render(<WritersRoomPage workspace={workspace} />);
    expect(await screen.findByRole("heading", { name: "Salvage Rights Faction" })).toBeInTheDocument();
    expect(screen.getByText("Develop a faction")).toBeInTheDocument();
    expect(screen.getByLabelText("Continue the conversation")).toBeEnabled();
    expect(runWritersRoom).not.toHaveBeenCalled();
  });

  it("restores the persisted equivalent of a completed live response after restart", async () => {
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(normalizeAiWorkspaceDocument({
      formatVersion: 1,
      projectId: workspace.projectId,
      updatedAt: "2026-09-28T21:13:00.000Z",
      sessions: [{
        id: "persisted-session", projectId: workspace.projectId, surface: "writers_room",
        purpose: "Develop narrative ideas through source-aware conversation and reviewed proposals.",
        specialistProfileId: "lore_architect", title: "Salvage Rights Faction",
        createdAt: "2026-09-28T21:12:50.941Z", updatedAt: "2026-09-28T21:13:00.000Z",
        status: "ACTIVE", selectedMarkdownPaths: [],
        messages: [
          { id: "user-1", role: "USER", content: "Develop the faction", questions: [], createdAt: "2026-09-28T21:12:55.000Z" },
          { id: "assistant-1", role: "ASSISTANT", content: "A proposed direction.", questions: ["Who opposes them?", "What do they protect?", "What divides them?"], createdAt: "2026-09-28T21:13:00.000Z" },
        ],
      }],
    }));
    render(<WritersRoomPage workspace={workspace} />);
    expect(await screen.findByText("A proposed direction.")).toBeInTheDocument();
    expect(screen.getByText("What divides them?")).toBeInTheDocument();
    expect(screen.getByLabelText("Continue the conversation")).toBeEnabled();
    expect(runWritersRoom).not.toHaveBeenCalled();
  });

  it("selects the most recently updated active session and falls back from a stale selection", async () => {
    const older = session({ id: "older", title: "Older", updatedAt: "2026-09-28T10:00:00.000Z" });
    const newer = session({ id: "newer", title: "Newer", updatedAt: "2026-09-28T14:00:00.000Z" });
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue({ ...document(older), sessions: [newer, older] });
    vi.mocked(archiveAiWorkspaceSession).mockResolvedValue({ ...document(newer), sessions: [newer] });
    const user = userEvent.setup();
    render(<WritersRoomPage workspace={workspace} />);
    expect(await screen.findByRole("heading", { name: "Newer" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Older/ }));
    expect(screen.getByRole("heading", { name: "Older" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive Older" }));
    expect(await screen.findByRole("heading", { name: "Newer" })).toBeInTheDocument();
  });

  it("keeps an unknown-profile session readable but prevents running it", async () => {
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(document(session({ specialistProfileId: "retired_profile" })));
    render(<WritersRoomPage workspace={workspace} />);
    expect(await screen.findByRole("heading", { name: "Harbor Coalition" })).toBeInTheDocument();
    expect(screen.getAllByText("Profile unavailable")).not.toHaveLength(0);
    expect(screen.getByText(/no longer available/)).toBeInTheDocument();
    expect(screen.getByLabelText("Continue the conversation")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Archive Harbor Coalition" })).toBeEnabled();
  });

  it("shows valid sessions and a warning when a malformed session is isolated", async () => {
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(normalizeAiWorkspaceDocument({
      ...document(session()),
      sessions: [{ id: 12 }, session()],
    }));
    render(<WritersRoomPage workspace={workspace} />);
    expect(await screen.findByRole("heading", { name: "Harbor Coalition" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("could not be displayed");
    expect(screen.getByRole("button", { name: "New Session" })).toBeEnabled();
  });

  it("renders a safe fallback when a rejected native error has non-string fields", async () => {
    vi.mocked(loadAiWorkspaceSessions).mockRejectedValue({ code: { nested: true }, message: ["unsafe shape"] });
    render(<WritersRoomPage workspace={workspace} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Writers' Room could not complete the action.");
    expect(screen.getByRole("button", { name: "New Session" })).toBeEnabled();
  });

  it("keeps the maximum session count in the bounded rail", async () => {
    const sessions = Array.from({ length: 50 }, (_, index) => session({ id: `session-${index}`, title: `Session ${index}`, updatedAt: new Date(Date.UTC(2026, 8, 28, 0, index)).toISOString() }));
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue({ ...document(sessions[0]), sessions });
    render(<WritersRoomPage workspace={workspace} />);
    const rail = await screen.findByLabelText("Writers' Room sessions");
    expect(rail).toHaveClass("writers-room-session-list");
    expect(within(rail).getAllByRole("article")).toHaveLength(50);
    expect(screen.getByLabelText("Writers' Room workspace")).toHaveClass("writers-room");
  });

  it("requires confirmation to delete and falls back to the next active session", async () => {
    const selected = session({ id: "selected", title: "Delete me", updatedAt: "2026-09-28T14:00:00.000Z" });
    const fallback = session({ id: "fallback", title: "Keep me", updatedAt: "2026-09-28T13:00:00.000Z" });
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue({ ...document(selected), sessions: [selected, fallback] });
    vi.mocked(deleteAiWorkspaceSession).mockResolvedValue({ ...document(fallback), sessions: [fallback] });
    const user = userEvent.setup();
    render(<WritersRoomPage workspace={workspace} />);
    await screen.findByRole("heading", { name: "Delete me" });
    const deleteAction = screen.getByRole("button", { name: "Delete Delete me" });
    expect(deleteAction).toHaveClass("writers-room-session-action--danger");
    await user.click(deleteAction);
    let dialog = screen.getByRole("dialog", { name: "Delete session?" });
    expect(dialog.parentElement).toHaveClass("writers-room-dialog-backdrop");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("conversation history will be permanently removed");
    expect(dialog).toHaveTextContent("does not delete Project Brain knowledge or Decisions");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(deleteAiWorkspaceSession).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete Delete me" }));
    dialog = screen.getByRole("dialog", { name: "Delete session?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete Session" }));
    expect(deleteAiWorkspaceSession).toHaveBeenCalledTimes(1);
    expect(deleteAiWorkspaceSession).toHaveBeenCalledWith(workspace.path, workspace.projectId, "selected");
    expect(await screen.findByRole("heading", { name: "Keep me" })).toBeInTheDocument();
    expect(screen.queryByText("Delete me")).not.toBeInTheDocument();
    expect(runWritersRoom).not.toHaveBeenCalled();
  });

  it("returns to the empty state after deleting the last session and Escape cancels safely", async () => {
    const current = session({ title: "Last session" });
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue(document(current));
    vi.mocked(deleteAiWorkspaceSession).mockResolvedValue({ ...document(current), sessions: [] });
    const user = userEvent.setup();
    render(<WritersRoomPage workspace={workspace} />);
    await screen.findByRole("heading", { name: "Last session" });
    await user.click(screen.getByRole("button", { name: "Delete Last session" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Delete session?" })).not.toBeInTheDocument();
    expect(deleteAiWorkspaceSession).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete Last session" }));
    await user.click(within(screen.getByRole("dialog", { name: "Delete session?" })).getByRole("button", { name: "Delete Session" }));
    expect(await screen.findByRole("heading", { name: /Build narrative/ })).toBeInTheDocument();
  });

  it("opens explicit Tavily research with the current composer query and Cancel makes no request", async () => {
    const user = await renderPage();
    const composer = screen.getByLabelText("Continue the conversation");
    await user.type(composer, "stale research idea");
    await user.click(screen.getByRole("button", { name: "Research web" }));
    let dialog = screen.getByRole("dialog", { name: "Research web" });
    expect(within(dialog).getByLabelText("Research query")).toHaveValue("stale research idea");
    expect(dialog).toHaveTextContent("Search depth");
    expect(dialog).toHaveTextContent("Basic");
    expect(dialog).toHaveTextContent("Maximum sources");
    expect(dialog).toHaveTextContent("5");
    expect(dialog).toHaveTextContent(/do not become Project Brain knowledge/);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await user.clear(composer);
    await user.type(composer, "current faction question");
    await user.click(screen.getByRole("button", { name: "Research web" }));
    dialog = screen.getByRole("dialog", { name: "Research web" });
    expect(within(dialog).getByLabelText("Research query")).toHaveValue("current faction question");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(searchWithTavily).not.toHaveBeenCalled();
  });

  it("sends the visible query exactly, uses a selectable research drawer, and opens sources natively", async () => {
    const query = "Research examples of tactical games where enemy factions can fight each other independently of the player. Focus on how this affects encounter design and player information.";
    const source = {
      id: "external-1",
      query,
      title: "Faction conflict patterns",
      url: "https://example.com/factions",
      domain: "example.com",
      snippet: "Independent enemy factions can create legible systemic encounters.",
      retrievedAt: "2026-10-26T12:00:00.000Z",
      provider: "TAVILY" as const,
      authority: "EXTERNAL_RESEARCH" as const,
      selected: true,
    };
    const researched = session({ externalResearchSources: [source] });
    const deselected = session({ externalResearchSources: [{ ...source, selected: false }] });
    vi.mocked(searchWithTavily).mockResolvedValue({
      document: document(researched),
      run: { provider: "TAVILY", operation: "SEARCH", timestamp: source.retrievedAt, queryLength: query.length, resultCount: 1, latencyMs: 12, status: "SUCCESS" },
    });
    vi.mocked(setExternalResearchSelection).mockResolvedValue(document(deselected));
    vi.mocked(clearExternalResearch).mockResolvedValue(document(session()));
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: "Research web" }));
    const dialog = screen.getByRole("dialog", { name: "Research web" });
    await user.type(within(dialog).getByLabelText("Research query"), query);
    expect(within(dialog).getByLabelText("Research query")).toHaveValue(query);
    await user.click(within(dialog).getByRole("button", { name: "Search with Tavily" }));

    expect(searchWithTavily).toHaveBeenCalledTimes(1);
    expect(searchWithTavily).toHaveBeenCalledWith({ rootPath: workspace.path, projectId: workspace.projectId, sessionId: "session-1", query });
    const panel = await screen.findByLabelText("External Research");
    expect(panel).toHaveTextContent(query);
    expect(panel).toHaveTextContent("1 results · 1 selected");
    expect(panel).toHaveTextContent("Selected sources will be supplied to the next AI request as external research.");
    expect(panel).toHaveTextContent("EXTERNAL RESEARCH");
    expect(panel).toHaveTextContent("example.com");
    const openSource = within(panel).getByRole("button", { name: "Open source ↗" });
    openSource.focus();
    await user.keyboard("{Enter}");
    expect(openExternalResearchSource).toHaveBeenCalledWith(source.url);
    vi.mocked(openExternalResearchSource).mockRejectedValueOnce({ code: "EXTERNAL_SOURCE_OPEN_FAILED", message: "Could not open source." });
    await user.click(openSource);
    expect(await within(panel).findByRole("alert")).toHaveTextContent("EXTERNAL_SOURCE_OPEN_FAILED");
    await user.click(within(panel).getByRole("checkbox"));
    expect(setExternalResearchSelection).toHaveBeenCalledWith(workspace.path, workspace.projectId, "session-1", []);
    expect(panel).toHaveTextContent("1 results · 0 selected");
    await user.click(screen.getByRole("button", { name: "Context / Sources" }));
    expect(screen.queryByLabelText("External Research")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Context and sources")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "External research · 0 selected" }));
    expect(screen.queryByLabelText("Context and sources")).not.toBeInTheDocument();
    expect(screen.getByLabelText("External Research")).toBeInTheDocument();
    await user.click(within(screen.getByLabelText("External Research")).getByRole("button", { name: "Clear research" }));
    expect(clearExternalResearch).toHaveBeenCalledTimes(1);
    expect(searchWithTavily).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("External Research")).not.toBeInTheDocument();
  });

  it("keeps research scoped to its session", async () => {
    const source = {
      id: "external-1",
      query: "faction autonomy",
      title: "Faction autonomy",
      url: "https://example.com/factions",
      domain: "example.com",
      snippet: "A bounded source.",
      retrievedAt: "2026-10-26T12:00:00.000Z",
      provider: "TAVILY" as const,
      authority: "EXTERNAL_RESEARCH" as const,
      selected: true,
    };
    const sessionA = session({ title: "Session A", updatedAt: "2026-10-26T12:02:00.000Z", externalResearchSources: [source] });
    const sessionB = session({
      id: "session-2",
      title: "Session B",
      updatedAt: "2026-10-26T12:01:00.000Z",
      proposals: [{
        id: "applied-proposal",
        proposalType: "SAVE_KNOWLEDGE",
        title: "Previously applied lore",
        summary: "This applied proposal remains visible.",
        status: "APPLIED",
        createdAt: "2026-10-26T12:00:00.000Z",
        updatedAt: "2026-10-26T12:00:30.000Z",
        sourceTrace: [],
      }],
    });
    vi.mocked(loadAiWorkspaceSessions).mockResolvedValue({
      formatVersion: 1,
      projectId: workspace.projectId,
      updatedAt: sessionA.updatedAt,
      sessions: [sessionA, sessionB],
    });
    const user = userEvent.setup();
    render(<WritersRoomPage workspace={workspace} />);

    expect(await screen.findByRole("button", { name: "External research · 1 selected" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Session BLore Architect/ }));
    expect(screen.queryByRole("button", { name: /External research/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("External Research")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Previously applied lore" })).toBeInTheDocument();
    expect(screen.getByText("APPLIED")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Session ALore Architect/ }));
    expect(screen.getByRole("button", { name: "External research · 1 selected" })).toBeInTheDocument();
  });

  it("renders the normalized Tavily synthesis questions and sources after one request", async () => {
    const projectSource = {
      sourceType: "COMPENDIUM" as const,
      sourceId: "knowledge-1",
      label: "Independent enemy factions",
      authority: "ESTABLISHED_KNOWLEDGE" as const,
      navigationTarget: "game_design",
    };
    const externalTrace = {
      sourceType: "EXTERNAL_RESEARCH" as const,
      sourceId: "external-1",
      label: "Independent faction encounter patterns",
      authority: "EXTERNAL_RESEARCH" as const,
    };
    const externalSource = {
      id: externalTrace.sourceId,
      query: "tactical games with independent enemy faction conflicts",
      title: externalTrace.label,
      url: "https://example.com/faction-conflicts",
      domain: "example.com",
      snippet: "Independent factions can create tactical encounter opportunities.",
      retrievedAt: "2026-10-26T12:00:00.000Z",
      provider: "TAVILY" as const,
      authority: "EXTERNAL_RESEARCH" as const,
      selected: true,
    };
    const current = session({ externalResearchSources: [externalSource] });
    const usageReference = {
      applicationSessionId: "00000000-0000-4000-8000-000000000001",
      usageTimestamp: "2026-10-26T12:01:01.000Z",
      profileId: "lore_architect",
    };
    const completed = session({
      externalResearchSources: [externalSource],
      messages: [
        { id: "user-1", role: "USER", content: "Compare the selected research.", questions: [], createdAt: "2026-10-26T12:01:00.000Z", sourceTrace: [] },
        {
          id: "assistant-1",
          role: "ASSISTANT",
          content: "The external pattern can extend the established direction without becoming project truth.",
          questions: [{ question: "First?", options: [] }, { question: "Second?", options: [] }, { question: "Third?", options: [] }],
          createdAt: "2026-10-26T12:01:01.000Z",
          sourceTrace: [projectSource, externalTrace],
          usageReference,
        },
      ],
    });
    vi.mocked(loadWritersRoomPreflight).mockResolvedValue({
      ...preflight,
      externalResearchProvider: "Tavily",
      contextSummary: ["Established knowledge: 1 entries", "External research: 1 Tavily sources"],
      sourceTrace: [projectSource, externalTrace],
    });
    vi.mocked(runWritersRoom).mockResolvedValue({
      document: document(completed),
      provider: "nebius_token_factory",
      model: preflight.modelId,
      latencyMs: 1200,
      inputTokens: 100,
      outputTokens: 80,
      totalTokens: 180,
      usageReference,
    });

    const user = await renderPage(current);
    await user.type(screen.getByLabelText("Continue the conversation"), "Compare the selected research.");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Lore Architect response" })).getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("First?")).toBeInTheDocument();
    expect(screen.getByText("Second?")).toBeInTheDocument();
    expect(screen.getByText("Third?")).toBeInTheDocument();
    expect(screen.queryByText("Discarded fourth?")).not.toBeInTheDocument();
    expect(screen.getByText("Independent enemy factions")).toBeInTheDocument();
    expect(screen.getByText("Independent faction encounter patterns")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "External research · 1 selected" })).toBeInTheDocument();
    expect(runWritersRoom).toHaveBeenCalledTimes(1);
    expect(applyAiWorkspaceProposal).not.toHaveBeenCalled();
  });

  it("shows missing Tavily configuration and exposes both providers in normal AI preflight", async () => {
    vi.mocked(loadTavilyConfiguration).mockResolvedValue({ configured: false, provider: "Tavily", setupGuidance: "Set TAVILY_API_KEY before launching ForgeMind." });
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: "Research web" }));
    let dialog = screen.getByRole("dialog", { name: "Research web" });
    expect(dialog).toHaveTextContent("Tavily is not configured");
    expect(dialog).toHaveTextContent("TAVILY_API_KEY");
    expect(within(dialog).getByRole("button", { name: "Search with Tavily" })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(searchWithTavily).not.toHaveBeenCalled();

    vi.mocked(loadWritersRoomPreflight).mockResolvedValue({
      ...preflight,
      externalResearchProvider: "Tavily",
      contextSummary: ["Established knowledge: 4 entries", "External research: 4 Tavily sources", "Recent conversation: 2 messages"],
    });
    await user.type(screen.getByLabelText("Continue the conversation"), "Compare the selected research.");
    await user.click(screen.getByRole("button", { name: "Send" }));
    dialog = await screen.findByRole("dialog", { name: "Lore Architect response" });
    expect(dialog).toHaveTextContent("External research provider");
    expect(dialog).toHaveTextContent("Tavily");
    expect(dialog).toHaveTextContent("Nemotron provider");
    expect(dialog).toHaveTextContent("Nebius Token Factory");
    expect(dialog).toHaveTextContent("External research: 4 Tavily sources");
  });
});
