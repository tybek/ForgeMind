import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendAiWorkspaceMessage,
  archiveAiWorkspaceSession,
  archiveAndResetAiWorkspaceHistory,
  buildAiWorkspaceContext,
  createAiWorkspaceProposal,
  createAiWorkspaceSession,
  deleteAiWorkspaceSession,
  listAiWorkspaceProfiles,
  loadAiWorkspaceSessions,
  reviewAiWorkspaceProposal,
  setAiWorkspaceMarkdownContext,
  applyAiWorkspaceProposal,
  normalizeAiWorkspaceDocument,
  reopenAiWorkspaceSession,
} from "./aiWorkspace";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("AI Workspace platform boundary", () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it("uses narrow native commands for profiles, sessions, context, proposals, and recovery", async () => {
    const document = { formatVersion: 1, projectId: "project-1", updatedAt: "2026-09-28T12:00:00.000Z", sessions: [] };
    vi.mocked(invoke).mockImplementation((command) => {
      if (command === "list_ai_workspace_profiles") return Promise.resolve([]);
      if (command === "load_ai_workspace_sessions") return Promise.resolve(null);
      if (command === "archive_and_reset_ai_workspace_history") return Promise.resolve({ document });
      if (command === "apply_ai_workspace_proposal") return Promise.resolve({ document, target: "DECISION", targetId: "decision-1" });
      if (command === "build_ai_workspace_context") return Promise.resolve({ projectId: "project-1", items: [], sourceTrace: [], totalCharacters: 0 });
      return Promise.resolve(document);
    });
    await listAiWorkspaceProfiles();
    await loadAiWorkspaceSessions("D:\\Game");
    await createAiWorkspaceSession("D:\\Game", "project-1", "shared", "Explore lore", "lore_architect", "Faction");
    await appendAiWorkspaceMessage("D:\\Game", "project-1", "session-1", "USER", "Develop this faction.");
    await archiveAiWorkspaceSession("D:\\Game", "project-1", "session-1");
    await reopenAiWorkspaceSession("D:\\Game", "project-1", "session-1");
    await deleteAiWorkspaceSession("D:\\Game", "project-1", "session-1");
    await buildAiWorkspaceContext("D:\\Game", "project-1", [
      { sourceType: "DOCUMENT", relativePath: "FACTIONS.md", priority: "EXPLICIT" },
    ]);
    await createAiWorkspaceProposal("D:\\Game", "project-1", "session-1", "CREATE_DECISION", "Decision", "Proposal only.");
    await reviewAiWorkspaceProposal("D:\\Game", "project-1", "session-1", "proposal-1", "ACCEPTED");
    await archiveAndResetAiWorkspaceHistory("D:\\Game");
    await setAiWorkspaceMarkdownContext("D:\\Game", "project-1", "session-1", ["FACTIONS.md"]);
    await applyAiWorkspaceProposal("D:\\Game", "project-1", "session-1", "proposal-1");

    expect(invoke).toHaveBeenNthCalledWith(1, "list_ai_workspace_profiles");
    expect(invoke).toHaveBeenNthCalledWith(2, "load_ai_workspace_sessions", { path: "D:\\Game" });
    expect(invoke).toHaveBeenNthCalledWith(3, "create_ai_workspace_session", {
      request: { rootPath: "D:\\Game", projectId: "project-1", surface: "shared", purpose: "Explore lore", specialistProfileId: "lore_architect", title: "Faction" },
    });
    expect(invoke).toHaveBeenNthCalledWith(6, "reopen_ai_workspace_session", {
      request: { rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1" },
    });
    expect(invoke).toHaveBeenNthCalledWith(7, "delete_ai_workspace_session", {
      request: { rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1" },
    });
    expect(invoke).toHaveBeenNthCalledWith(8, "build_ai_workspace_context", {
      request: { rootPath: "D:\\Game", projectId: "project-1", sources: [{ sourceType: "DOCUMENT", relativePath: "FACTIONS.md", priority: "EXPLICIT" }] },
    });
    expect(invoke).toHaveBeenNthCalledWith(11, "archive_and_reset_ai_workspace_history", { path: "D:\\Game" });
    expect(invoke).toHaveBeenNthCalledWith(12, "set_ai_workspace_markdown_context", {
      request: { rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1", relativePaths: ["FACTIONS.md"] },
    });
    expect(invoke).toHaveBeenNthCalledWith(13, "apply_ai_workspace_proposal", {
      request: { rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1", proposalId: "proposal-1" },
    });
  });

  it("hydrates omitted format-version 1 arrays from the real empty-session persistence shape", () => {
    const normalized = normalizeAiWorkspaceDocument({
      formatVersion: 1,
      projectId: "project-1",
      updatedAt: "2026-09-28T12:00:00.000Z",
      sessions: [{
        id: "session-1",
        projectId: "project-1",
        surface: "writers_room",
        purpose: "Develop narrative ideas.",
        specialistProfileId: "lore_architect",
        title: "Salvage Rights Faction",
        createdAt: "2026-09-28T12:00:00.000Z",
        updatedAt: "2026-09-28T12:00:00.000Z",
        status: "ACTIVE",
        messages: [],
        selectedMarkdownPaths: [],
      }],
    });

    expect(normalized.sessions[0]).toMatchObject({ messages: [], proposals: [], sourceTrace: [], selectedMarkdownPaths: [] });
    expect(normalized.recoveryWarnings).toBeUndefined();
  });

  it("isolates malformed sessions and optional nested records without discarding valid history", () => {
    const normalized = normalizeAiWorkspaceDocument({
      formatVersion: 1,
      projectId: "project-1",
      updatedAt: "2026-09-28T12:00:00.000Z",
      sessions: [
        { id: 42, title: "Malformed" },
        {
          id: "session-1", projectId: "project-1", surface: "writers_room", purpose: "Develop narrative ideas.", specialistProfileId: "removed_profile",
          title: "Readable history", createdAt: "2026-09-28T12:00:00.000Z", updatedAt: "2026-09-28T12:00:00.000Z", status: "ACTIVE",
          messages: [{ id: "message-1", role: "ASSISTANT", content: "Still readable.", createdAt: "2026-09-28T12:01:00.000Z" }, { role: "BROKEN" }],
          proposals: [{ id: "proposal-1", proposalType: "CREATE_DECISION", title: "Valid", summary: "Proposal only.", status: "PENDING", createdAt: "2026-09-28T12:01:00.000Z", updatedAt: "2026-09-28T12:01:00.000Z" }, { id: "bad" }],
        },
      ],
    });

    expect(normalized.sessions).toHaveLength(1);
    expect(normalized.sessions[0].messages).toHaveLength(1);
    expect(normalized.sessions[0].messages[0]).toMatchObject({ questions: [], sourceTrace: [] });
    expect(normalized.sessions[0].proposals).toHaveLength(1);
    expect(normalized.sessions[0].proposals[0].sourceTrace).toEqual([]);
    expect(normalized.recoveryWarnings).toEqual(["1 malformed session was skipped.", "Malformed session content was skipped."]);
  });

  it("keeps normalized history project-scoped, uniquely keyed, and within native collection bounds", () => {
    const session = (id: string, projectId = "project-1") => ({
      id, projectId, surface: "writers_room", purpose: "Develop narrative ideas.", specialistProfileId: "lore_architect",
      title: id, createdAt: "2026-09-28T12:00:00.000Z", updatedAt: "2026-09-28T12:00:00.000Z", status: "ACTIVE",
      messages: Array.from({ length: 201 }, (_, index) => ({
        id: `message-${index}`, role: "ASSISTANT", content: "Readable.", createdAt: "2026-09-28T12:01:00.000Z",
      })),
    });
    const normalized = normalizeAiWorkspaceDocument({
      formatVersion: 1,
      projectId: "project-1",
      updatedAt: "2026-09-28T12:00:00.000Z",
      sessions: [
        session("session-0"),
        session("session-0"),
        session("foreign-session", "project-2"),
        ...Array.from({ length: 52 }, (_, index) => session(`session-${index + 1}`)),
      ],
    });

    expect(normalized.sessions).toHaveLength(48);
    expect(new Set(normalized.sessions.map((item) => item.id)).size).toBe(48);
    expect(normalized.sessions.every((item) => item.projectId === "project-1")).toBe(true);
    expect(normalized.sessions[0].messages).toHaveLength(200);
    expect(normalized.recoveryWarnings).toEqual([
      "2 malformed sessions were skipped.",
      "Session history exceeded the display bound; excess sessions were skipped.",
      "Malformed session content was skipped.",
    ]);
  });
});
