import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompendiumPage } from "./CompendiumPage";
import { loadInterview } from "./platform/projectInterview";
import {
  createKnowledgeEntry,
  deprecateKnowledgeEntry,
  importInterviewKnowledge,
  loadCompendium,
  updateKnowledgeEntry,
  type CompendiumDocument,
  type KnowledgeEntry,
} from "./platform/projectKnowledge";

vi.mock("./platform/projectInterview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectInterview")>()),
  loadInterview: vi.fn(),
}));

vi.mock("./platform/projectKnowledge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectKnowledge")>()),
  loadCompendium: vi.fn(),
  createKnowledgeEntry: vi.fn(),
  updateKnowledgeEntry: vi.fn(),
  deprecateKnowledgeEntry: vi.fn(),
  importInterviewKnowledge: vi.fn(),
}));

const workspace = {
  path: "D:\\Games\\CompendiumGame",
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  name: "Compendium Game",
  formatVersion: 1,
  createdAt: "2026-09-19T12:00:00.000Z",
};

const entry: KnowledgeEntry = {
  id: "f2253a74-2dd3-461e-9fdc-622ef83b3bf7",
  area: "core_loop",
  title: "Action Point economy",
  statement: "Movement and combat consume a shared Action Point budget.",
  status: "DIRECTION",
  provenance: "USER_STATED",
  source: "project_interview",
  createdAt: "2026-09-19T12:00:00.000Z",
  updatedAt: "2026-09-19T12:00:00.000Z",
};

const longEntry: KnowledgeEntry = {
  ...entry,
  id: "6cc846de-9f54-4ac5-858e-a17ae43aac78",
  title: "Long tactical direction",
  statement: "This deliberately long project statement explains how several tactical systems interact across movement, combat, resource pressure, extraction risk, player readability, and encounter pacing so the compact presentation must not consume the full page height by default.",
};

const pillar: KnowledgeEntry = {
  ...entry,
  id: "8c9af7dd-5adc-4938-8dd9-2224eb5b0041",
  area: "game_vision",
  title: "Design pillar: Readable danger",
  statement: "Threats remain legible before they become lethal.",
  source: "new_project_creator",
};

function document(entries: KnowledgeEntry[] = [entry]): CompendiumDocument {
  return {
    formatVersion: 1,
    projectId: workspace.projectId,
    updatedAt: "2026-09-19T12:00:00.000Z",
    entries,
  };
}

async function renderPage(onPromote = vi.fn()) {
  const user = userEvent.setup();
  render(<CompendiumPage workspace={workspace} onPromote={onPromote} />);
  await screen.findByRole("heading", { name: "Game Compendium" });
  return { user, onPromote };
}

describe("Game Compendium", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadCompendium).mockResolvedValue(null);
    vi.mocked(loadInterview).mockResolvedValue(null);
  });

  it("renders the Compendium page and an honest empty state", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { name: "Game Compendium" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No Compendium knowledge yet" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing is imported automatically/)).toBeInTheDocument();
  });

  it("renders entries as compact rows by default", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document());
    await renderPage();
    const row = screen.getByRole("article", { name: `Knowledge entry: ${entry.title}` });
    expect(row).toHaveClass("compact-knowledge-entry");
    expect(within(row).getByRole("button", { name: "Expand" })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps Creator Design Pillars visible in a first-class Compendium section", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document([pillar]));
    await renderPage();
    const section = screen.getByRole("heading", { name: "Design Pillars" }).closest("section")!;
    expect(within(section).getByText("Readable danger")).toBeInTheDocument();
    expect(within(section).getByText(pillar.statement)).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Edit" })).toBeEnabled();
    expect(within(section).getByRole("button", { name: "Deprecate" })).toBeEnabled();
  });

  it("adds a manual Design Pillar through the existing Compendium store", async () => {
    vi.mocked(createKnowledgeEntry).mockResolvedValue(document([pillar]));
    const { user } = await renderPage();
    await user.click(screen.getByRole("button", { name: "Add Design Pillar" }));
    await user.type(screen.getByLabelText("Pillar name"), "Readable danger");
    await user.type(screen.getByLabelText("Explanation"), pillar.statement);
    await user.click(screen.getByRole("button", { name: "Save Knowledge" }));
    expect(createKnowledgeEntry).toHaveBeenCalledWith(workspace.path, workspace.projectId, expect.objectContaining({
      area: "game_vision",
      title: "Design pillar: Readable danger",
      statement: pillar.statement,
    }));
  });

  it("edits an existing Design Pillar without creating another truth store", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document([pillar]));
    vi.mocked(updateKnowledgeEntry).mockResolvedValue(document([{ ...pillar, statement: "Updated explanation." }]));
    const { user } = await renderPage();
    const row = screen.getByRole("article", { name: "Design pillar: Readable danger" });
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const editor = screen.getByRole("heading", { name: "Edit Design Pillar" }).closest("form")!;
    const explanation = within(editor).getByLabelText("Explanation");
    await user.clear(explanation);
    await user.type(explanation, "Updated explanation.");
    await user.click(within(editor).getByRole("button", { name: "Save Knowledge" }));
    expect(updateKnowledgeEntry).toHaveBeenCalledWith(workspace.path, workspace.projectId, pillar.id, expect.objectContaining({
      title: pillar.title,
      statement: "Updated explanation.",
    }));
  });

  it("opens one selected editor before Design Pillars, filters, and the list when source navigation targets a Knowledge entry", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document());
    render(<CompendiumPage workspace={workspace} onPromote={vi.fn()} editEntryId={entry.id} />);
    const editor = await screen.findByRole("heading", { name: "Edit Knowledge" });
    const form = editor.closest("form")!;
    expect(within(form).getByLabelText("Title")).toHaveValue(entry.title);
    expect(within(form).getByLabelText("Statement")).toHaveValue(entry.statement);
    const pillars = screen.getByRole("heading", { name: "Design Pillars" }).closest("section")!;
    const filters = screen.getByRole("region", { name: "Compendium filters" });
    const list = screen.getByRole("region", { name: "Compendium knowledge entries" });
    expect(screen.getAllByRole("heading", { name: "Edit Knowledge" })).toHaveLength(1);
    expect(form.compareDocumentPosition(pillars) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(form).getByLabelText("Statement")).toHaveAttribute("rows", "12");
    expect(within(form).getByLabelText("Statement")).toHaveClass("knowledge-long-form");
  });

  it("collapses long statements to the preview presentation by default", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document([longEntry]));
    await renderPage();
    expect(screen.getByText(longEntry.statement)).toHaveClass("knowledge-statement-preview");
  });

  it("expands and collapses one entry without changing the saved data", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document([longEntry]));
    const { user } = await renderPage();
    const row = screen.getByRole("article", { name: `Knowledge entry: ${longEntry.title}` });
    await user.click(within(row).getByRole("button", { name: "Expand" }));
    expect(screen.getByText(longEntry.statement)).toHaveClass("knowledge-statement-full");
    expect(within(row).getByRole("button", { name: "Collapse" })).toHaveAttribute("aria-expanded", "true");
  });

  it("shows explicit interview import only when saved interview data exists", async () => {
    vi.mocked(loadInterview).mockResolvedValue({
      formatVersion: 1,
      projectId: workspace.projectId,
      approvedAt: "2026-09-19T12:00:00.000Z",
      modelId: "model",
      candidates: [],
    });
    await renderPage();
    expect(screen.getByRole("button", { name: "Import Saved Interview Knowledge" })).toBeVisible();
  });

  it("imports interview knowledge and displays provenance and source", async () => {
    vi.mocked(loadInterview).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, approvedAt: "now", modelId: "model", candidates: [] });
    vi.mocked(importInterviewKnowledge).mockResolvedValue({ document: document(), importedCount: 1, skippedDuplicateCount: 0 });
    const { user } = await renderPage();
    await user.click(screen.getByRole("button", { name: "Import Saved Interview Knowledge" }));

    expect(await screen.findByText(entry.title)).toBeInTheDocument();
    const card = screen.getByText(entry.title).closest("article");
    expect(card).toHaveTextContent("USER_STATED");
    expect(card).toHaveTextContent("project_interview");
    expect(screen.getByRole("status")).toHaveTextContent("1 imported");
  });

  it("repeated import does not duplicate visible entries", async () => {
    vi.mocked(loadInterview).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, approvedAt: "now", modelId: "model", candidates: [] });
    vi.mocked(importInterviewKnowledge)
      .mockResolvedValueOnce({ document: document(), importedCount: 1, skippedDuplicateCount: 0 })
      .mockResolvedValueOnce({ document: document(), importedCount: 0, skippedDuplicateCount: 1 });
    const { user } = await renderPage();
    const importButton = screen.getByRole("button", { name: "Import Saved Interview Knowledge" });
    await user.click(importButton);
    await user.click(importButton);

    expect(screen.getAllByText(entry.title)).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("0 imported, 1 duplicate entry skipped");
  });

  it("creates a manual knowledge entry", async () => {
    const manual = { ...entry, provenance: "MANUAL" as const, source: "manual_entry" as const };
    vi.mocked(createKnowledgeEntry).mockResolvedValue(document([manual]));
    const { user } = await renderPage();
    await user.click(screen.getByRole("button", { name: "Add Knowledge" }));
    const form = screen.getByRole("heading", { name: "Add Knowledge" }).closest("form");
    expect(within(form as HTMLElement).getByLabelText("Statement")).toHaveAttribute("rows", "12");
    await user.selectOptions(within(form as HTMLElement).getByLabelText("Section"), "core_loop");
    await user.type(within(form as HTMLElement).getByLabelText("Title"), manual.title);
    await user.type(within(form as HTMLElement).getByLabelText("Statement"), manual.statement);
    await user.click(screen.getByRole("button", { name: "Save Knowledge" }));

    expect(createKnowledgeEntry).toHaveBeenCalledWith(workspace.path, workspace.projectId, expect.objectContaining({ title: manual.title }));
    expect(await screen.findByText(manual.title)).toBeInTheDocument();
    expect(screen.getByText("MANUAL")).toBeInTheDocument();
  });

  it("edits an entry and changes its status", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document());
    const updated = { ...entry, title: "Locked Action Point economy", status: "LOCKED" as const };
    vi.mocked(updateKnowledgeEntry).mockResolvedValue(document([updated]));
    const { user } = await renderPage();
    const originalRow = screen.getByRole("article", { name: `Knowledge entry: ${entry.title}` });
    await user.click(within(originalRow).getByRole("button", { name: "Edit" }));
    const form = screen.getByRole("heading", { name: "Edit Knowledge" }).closest("form")!;
    expect(form.closest("article")).toBeNull();
    expect(form.compareDocumentPosition(originalRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const title = within(form).getByLabelText("Title");
    await user.clear(title);
    await user.type(title, updated.title);
    await user.selectOptions(within(form).getByLabelText("Status"), "LOCKED");
    await user.click(screen.getByRole("button", { name: "Save Knowledge" }));

    expect(updateKnowledgeEntry).toHaveBeenCalledWith(
      workspace.path,
      workspace.projectId,
      entry.id,
      expect.objectContaining({ title: updated.title, status: "LOCKED" }),
    );
    expect(await screen.findByText(updated.title)).toBeInTheDocument();
    const card = screen.getByText(updated.title).closest("article");
    expect(within(card as HTMLElement).getByText("LOCKED")).toHaveClass("knowledge-status", "status-locked");
  });

  it("cancels editing and restores the normal compact-list state", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document());
    const { user } = await renderPage();
    const row = screen.getByRole("article", { name: `Knowledge entry: ${entry.title}` });
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const editor = screen.getByRole("heading", { name: "Edit Knowledge" }).closest("form")!;
    await user.click(within(editor).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Edit Knowledge" })).not.toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(updateKnowledgeEntry).not.toHaveBeenCalled();
  });

  it("deprecates an entry without removing it", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document());
    vi.mocked(deprecateKnowledgeEntry).mockResolvedValue(document([{ ...entry, status: "DEPRECATED" }]));
    const { user } = await renderPage();
    await user.click(screen.getByRole("button", { name: "Deprecate" }));
    const card = screen.getByText(entry.title).closest("article");
    expect(within(card as HTMLElement).getByText("DEPRECATED")).toHaveClass("knowledge-status", "status-deprecated");
    expect(screen.getByText(entry.title)).toBeInTheDocument();
  });

  it("promotes selected knowledge through an explicit action", async () => {
    vi.mocked(loadCompendium).mockResolvedValue(document());
    const onPromote = vi.fn();
    const { user } = await renderPage(onPromote);
    await user.click(screen.getByRole("button", { name: "Promote to Decision" }));
    expect(onPromote).toHaveBeenCalledWith(entry);
  });

  it("shows persistence errors clearly and retains the form", async () => {
    vi.mocked(createKnowledgeEntry).mockRejectedValue({ code: "COMPENDIUM_WRITE_FAILED", message: "ForgeMind could not save Compendium knowledge." });
    const { user } = await renderPage();
    await user.click(screen.getByRole("button", { name: "Add Knowledge" }));
    await user.type(screen.getByLabelText("Title"), "Keep this title");
    await user.type(screen.getByLabelText("Statement"), "Keep this statement.");
    await user.click(screen.getByRole("button", { name: "Save Knowledge" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("COMPENDIUM_WRITE_FAILED");
    expect(screen.getByLabelText("Title")).toHaveValue("Keep this title");
  });
});
