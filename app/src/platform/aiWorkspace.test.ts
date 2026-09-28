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
} from "./aiWorkspace";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("AI Workspace platform boundary", () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it("uses narrow native commands for profiles, sessions, context, proposals, and recovery", async () => {
    vi.mocked(invoke).mockResolvedValue({});
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

    expect(invoke).toHaveBeenNthCalledWith(1, "list_ai_workspace_profiles");
    expect(invoke).toHaveBeenNthCalledWith(2, "load_ai_workspace_sessions", { path: "D:\\Game" });
    expect(invoke).toHaveBeenNthCalledWith(3, "create_ai_workspace_session", {
      request: { rootPath: "D:\\Game", projectId: "project-1", surface: "shared", purpose: "Explore lore", specialistProfileId: "lore_architect", title: "Faction" },
    });
    expect(invoke).toHaveBeenNthCalledWith(6, "build_ai_workspace_context", {
      request: { rootPath: "D:\\Game", projectId: "project-1", sources: [{ sourceType: "DOCUMENT", relativePath: "FACTIONS.md", priority: "EXPLICIT" }] },
    });
    expect(invoke).toHaveBeenNthCalledWith(9, "archive_and_reset_ai_workspace_history", { path: "D:\\Game" });
  });
});
