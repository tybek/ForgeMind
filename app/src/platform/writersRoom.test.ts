import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadWritersRoomPreflight, loadWritersRoomUsage, runWritersRoom } from "./writersRoom";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("Writers' Room platform boundary", () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it("keeps preflight, one run, and canonical usage lookup behind narrow commands", async () => {
    const rawRunResult = {
      document: {
        formatVersion: 1,
        projectId: "project-1",
        updatedAt: "2026-09-29T10:00:01.000Z",
        sessions: [{
          id: "session-1", projectId: "project-1", surface: "writers_room", purpose: "Develop narrative.", specialistProfileId: "lore_architect",
          title: "Faction", createdAt: "2026-09-29T10:00:00.000Z", updatedAt: "2026-09-29T10:00:01.000Z", status: "ACTIVE",
          messages: [
            { id: "user-1", role: "USER", content: "Develop the faction.", questions: [], createdAt: "2026-09-29T10:00:00.000Z" },
            { id: "assistant-1", role: "ASSISTANT", content: "A concise direction.", questions: ["Who opposes them?", "What do they protect?", "What divides them?"], createdAt: "2026-09-29T10:00:01.000Z", usageReference: { applicationSessionId: "00000000-0000-4000-8000-000000000001", usageTimestamp: "2026-09-29T10:00:01.000Z", profileId: "lore_architect" } },
          ],
          selectedMarkdownPaths: [],
        }],
      },
      provider: "nebius_token_factory", model: "nvidia/nemotron-3-super-120b-a12b", latencyMs: 1795,
      inputTokens: 447, outputTokens: 189, totalTokens: 636,
      usageReference: { applicationSessionId: "00000000-0000-4000-8000-000000000001", usageTimestamp: "2026-09-29T10:00:01.000Z", profileId: "lore_architect" },
    };
    vi.mocked(invoke).mockImplementation((command) => Promise.resolve(
      command === "run_writers_room" ? rawRunResult
        : command === "load_writers_room_usage" ? [{
          timestamp: "2026-09-29T10:00:01.000Z", sessionId: "00000000-0000-4000-8000-000000000001", projectId: "project-1",
          provider: "nebius_token_factory", modelId: "nvidia/nemotron-3-super-120b-a12b", taskCategory: "narrative_workspace", success: true,
        }]
          : {},
    ));
    const input = {
      rootPath: "D:\\Game",
      projectId: "project-1",
      sessionId: "session-1",
      mode: "SEND" as const,
      message: "Develop the faction.",
      modelId: "nvidia/nemotron-3-super-120b-a12b",
    };
    await loadWritersRoomPreflight(input);
    const result = await runWritersRoom(input);
    const usage = await loadWritersRoomUsage("project-1");

    expect(invoke).toHaveBeenNthCalledWith(1, "get_writers_room_preflight", { request: input });
    expect(invoke).toHaveBeenNthCalledWith(2, "run_writers_room", { request: input });
    expect(invoke).toHaveBeenNthCalledWith(3, "load_writers_room_usage", { projectId: "project-1" });
    expect(result.document.sessions[0]).toMatchObject({ proposals: [], sourceTrace: [] });
    expect(result.document.sessions[0].messages[1]).toMatchObject({ sourceTrace: [], questions: [
      { question: "Who opposes them?", options: [] },
      { question: "What do they protect?", options: [] },
      { question: "What divides them?", options: [] },
    ] });
    expect(usage).toEqual([expect.objectContaining({ projectId: "project-1", taskCategory: "narrative_workspace", success: true })]);
    expect(usage[0].inputTokens).toBeUndefined();
  });

  it("returns a reload-only error when a persisted successful run cannot be normalized", async () => {
    vi.mocked(invoke).mockResolvedValue({ document: { malformed: true } });
    await expect(runWritersRoom({
      rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1", mode: "SEND",
      message: "Develop the faction.", modelId: "nvidia/nemotron-3-super-120b-a12b",
    })).rejects.toMatchObject({ code: "AI_WORKSPACE_RESPONSE_RENDER_FAILED", message: expect.stringContaining("without sending another request") });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("drops malformed, cross-project, and unrelated usage rows before rendering", async () => {
    vi.mocked(invoke).mockResolvedValue([
      { timestamp: "invalid", sessionId: "bad", projectId: "project-1", provider: "provider", modelId: "model", taskCategory: "narrative_workspace", success: true },
      { timestamp: "2026-09-29T10:00:01.000Z", sessionId: "foreign", projectId: "project-2", provider: "provider", modelId: "model", taskCategory: "narrative_workspace", success: true },
      { timestamp: "2026-09-29T10:00:01.000Z", sessionId: "other-task", projectId: "project-1", provider: "provider", modelId: "model", taskCategory: "feature_contract", success: true },
      { timestamp: "2026-09-29T10:00:01.000Z", sessionId: "valid", projectId: "project-1", provider: "provider", modelId: "model", taskCategory: "narrative_workspace", success: true, latencyMs: -1 },
    ]);

    await expect(loadWritersRoomUsage("project-1")).resolves.toEqual([
      expect.objectContaining({ sessionId: "valid", projectId: "project-1", latencyMs: undefined }),
    ]);
  });
});
