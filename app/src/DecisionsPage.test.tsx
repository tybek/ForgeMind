import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DecisionsPage } from "./DecisionsPage";
import {
  approveDecision,
  createDecision,
  deprecateDecision,
  loadDecisions,
  updateDecision,
  type Decision,
  type DecisionsDocument,
} from "./platform/decisions";
import { loadCompendium, type KnowledgeEntry } from "./platform/projectKnowledge";

vi.mock("./platform/decisions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/decisions")>()),
  loadDecisions: vi.fn(),
  createDecision: vi.fn(),
  updateDecision: vi.fn(),
  approveDecision: vi.fn(),
  deprecateDecision: vi.fn(),
}));

vi.mock("./platform/projectKnowledge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectKnowledge")>()),
  loadCompendium: vi.fn(),
}));

const workspace = {
  path: "D:\\Games\\DecisionGame",
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  name: "Decision Game",
  formatVersion: 1,
  createdAt: "2026-09-19T12:00:00.000Z",
};

const knowledge: KnowledgeEntry = {
  id: "f2253a74-2dd3-461e-9fdc-622ef83b3bf7",
  area: "systems",
  title: "Enemy difficulty",
  statement: "Difficulty should come from better decisions.",
  status: "DIRECTION",
  provenance: "USER_STATED",
  source: "project_interview",
  createdAt: "2026-09-19T12:00:00.000Z",
  updatedAt: "2026-09-19T12:00:00.000Z",
};

const proposed: Decision = {
  id: "959b303d-ef5b-4906-a118-7530e26a88c7",
  title: "Enemy difficulty philosophy",
  statement: "Enemy difficulty should come from better decisions rather than health inflation.",
  rationale: "Preserve tactical readability.",
  status: "PROPOSED",
  area: "systems",
  author: "Local User",
  createdAt: "2026-09-19T12:00:00.000Z",
  approvedAt: null,
  supersedesDecisionId: null,
  relatedKnowledgeEntryIds: [knowledge.id],
};

function decisions(decisionEntries: Decision[] = [proposed]): DecisionsDocument {
  return {
    formatVersion: 1,
    projectId: workspace.projectId,
    updatedAt: "2026-09-19T12:00:00.000Z",
    decisions: decisionEntries,
  };
}

async function renderPage(promotedKnowledge: KnowledgeEntry | null = null) {
  const user = userEvent.setup();
  render(<DecisionsPage workspace={workspace} promotedKnowledge={promotedKnowledge} />);
  await screen.findByRole("heading", { name: "Decisions" });
  return user;
}

describe("Decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadDecisions).mockResolvedValue(null);
    vi.mocked(loadCompendium).mockResolvedValue({
      formatVersion: 1,
      projectId: workspace.projectId,
      updatedAt: "2026-09-19T12:00:00.000Z",
      entries: [knowledge],
    });
  });

  it("renders the Decisions page and honest empty state", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Decisions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No Decisions yet" })).toBeInTheDocument();
    expect(screen.getByText(/does not become a Decision automatically/)).toBeInTheDocument();
  });

  it("creates a proposed Decision with visible rationale", async () => {
    vi.mocked(createDecision).mockResolvedValue(decisions());
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: "Create Decision" }));
    await user.type(screen.getByLabelText("Title"), proposed.title);
    await user.type(screen.getByLabelText("Decision statement"), proposed.statement);
    await user.type(screen.getByLabelText("Rationale"), proposed.rationale);
    await user.click(screen.getByRole("button", { name: "Save Proposed Decision" }));

    expect(createDecision).toHaveBeenCalledWith(workspace.path, workspace.projectId, expect.objectContaining({ author: "Local User" }));
    const card = screen.getByText(proposed.title).closest("article");
    expect(card).toHaveTextContent("PROPOSED");
    expect(card).toHaveTextContent(proposed.rationale);
    expect(within(card as HTMLElement).getByText("PROPOSED")).toHaveClass("decision-status", "status-proposed");
  });

  it("edits only a proposed Decision", async () => {
    vi.mocked(loadDecisions).mockResolvedValue(decisions());
    const revised = { ...proposed, rationale: "Make challenge legible and tactical." };
    vi.mocked(updateDecision).mockResolvedValue(decisions([revised]));
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const rationale = screen.getByLabelText("Rationale");
    await user.clear(rationale);
    await user.type(rationale, revised.rationale);
    await user.click(screen.getByRole("button", { name: "Save Proposed Decision" }));
    expect(updateDecision).toHaveBeenCalledWith(workspace.path, workspace.projectId, proposed.id, expect.objectContaining({ rationale: revised.rationale }));
    expect(screen.getByText(revised.rationale)).toBeInTheDocument();
  });

  it("requires a separate explicit approval action", async () => {
    vi.mocked(loadDecisions).mockResolvedValue(decisions());
    const approved = { ...proposed, status: "APPROVED" as const, approvedAt: "2026-09-19T13:00:00.000Z" };
    vi.mocked(approveDecision).mockResolvedValue(decisions([approved]));
    const user = await renderPage();
    expect(screen.getByText("PROPOSED")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve Decision" }));
    expect(approveDecision).toHaveBeenCalledWith(workspace.path, workspace.projectId, proposed.id);
    const approvedStatus = await screen.findByText("APPROVED");
    expect(approvedStatus).toHaveClass("decision-status", "status-approved");
    expect(approvedStatus).not.toHaveClass("status-proposed");
  });

  it("promotes knowledge into a related proposed Decision form", async () => {
    vi.mocked(createDecision).mockResolvedValue(decisions());
    const user = await renderPage(knowledge);
    expect(screen.getByLabelText("Title")).toHaveValue(knowledge.title);
    expect(screen.getByLabelText("Decision statement")).toHaveValue(knowledge.statement);
    expect(screen.getByLabelText(knowledge.title)).toBeChecked();
    await user.type(screen.getByLabelText("Rationale"), proposed.rationale);
    await user.click(screen.getByRole("button", { name: "Save Proposed Decision" }));
    expect(createDecision).toHaveBeenCalledWith(
      workspace.path,
      workspace.projectId,
      expect.objectContaining({ relatedKnowledgeEntryIds: [knowledge.id] }),
    );
  });

  it("approving a replacement supersedes but retains the predecessor", async () => {
    const approved = { ...proposed, status: "APPROVED" as const, approvedAt: "2026-09-19T13:00:00.000Z" };
    const replacement: Decision = {
      ...proposed,
      id: "79ab69da-bbe9-4762-92fd-ea62daec50fe",
      title: "Revised enemy difficulty philosophy",
      rationale: "Account for boss readability.",
      supersedesDecisionId: approved.id,
    };
    vi.mocked(loadDecisions).mockResolvedValue(decisions([approved]));
    vi.mocked(createDecision).mockResolvedValue(decisions([approved, replacement]));
    vi.mocked(approveDecision).mockResolvedValue(decisions([
      { ...approved, status: "SUPERSEDED" },
      { ...replacement, status: "APPROVED", approvedAt: "2026-09-19T14:00:00.000Z" },
    ]));
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: "Create replacement" }));
    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, replacement.title);
    await user.type(screen.getByLabelText("Rationale"), replacement.rationale);
    await user.click(screen.getByRole("button", { name: "Save Proposed Decision" }));
    await user.click(screen.getByRole("button", { name: "Approve Decision" }));

    expect(screen.getByText(proposed.title)).toBeInTheDocument();
    expect(screen.getByText(replacement.title)).toBeInTheDocument();
    const predecessor = screen.getByText(proposed.title).closest("article");
    expect(within(predecessor as HTMLElement).getByText("SUPERSEDED")).toHaveClass("decision-status", "status-superseded");
  });

  it("deprecates a Decision without deleting it", async () => {
    vi.mocked(loadDecisions).mockResolvedValue(decisions());
    vi.mocked(deprecateDecision).mockResolvedValue(decisions([{ ...proposed, status: "DEPRECATED" }]));
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: "Deprecate" }));
    expect(screen.getByText(proposed.title)).toBeInTheDocument();
    expect(screen.getByText("DEPRECATED")).toBeInTheDocument();
  });

  it("shows persistence errors clearly", async () => {
    vi.mocked(createDecision).mockRejectedValue({ code: "DECISIONS_WRITE_FAILED", message: "ForgeMind could not save Decisions." });
    const user = await renderPage();
    await user.click(screen.getByRole("button", { name: "Create Decision" }));
    await user.type(screen.getByLabelText("Title"), "Keep title");
    await user.type(screen.getByLabelText("Decision statement"), "Keep statement");
    await user.type(screen.getByLabelText("Rationale"), "Keep rationale");
    await user.click(screen.getByRole("button", { name: "Save Proposed Decision" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("DECISIONS_WRITE_FAILED");
    expect(screen.getByLabelText("Title")).toHaveValue("Keep title");
  });
});
