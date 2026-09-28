import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendAiWorkspaceMessage,
  archiveAiWorkspaceSession,
  archiveAndResetAiWorkspaceHistory,
  buildAiWorkspaceContext,
  createAiWorkspaceProposal,
  createAiWorkspaceSession,
  listAiWorkspaceProfiles,
  loadAiWorkspaceSessions,
  reviewAiWorkspaceProposal,
  setAiWorkspaceMarkdownContext,
  applyAiWorkspaceProposal,
  normalizeAiWorkspaceDocument,
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
    expect(invoke).toHaveBeenNthCalledWith(6, "build_ai_workspace_context", {
      request: { rootPath: "D:\\Game", projectId: "project-1", sources: [{ sourceType: "DOCUMENT", relativePath: "FACTIONS.md", priority: "EXPLICIT" }] },
    });
    expect(invoke).toHaveBeenNthCalledWith(9, "archive_and_reset_ai_workspace_history", { path: "D:\\Game" });
    expect(invoke).toHaveBeenNthCalledWith(10, "set_ai_workspace_markdown_context", {
      request: { rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1", relativePaths: ["FACTIONS.md"] },
    });
    expect(invoke).toHaveBeenNthCalledWith(11, "apply_ai_workspace_proposal", {
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
});
