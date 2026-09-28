import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadWritersRoomPreflight, loadWritersRoomUsage, runWritersRoom } from "./writersRoom";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("Writers' Room platform boundary", () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it("keeps preflight, one run, and canonical usage lookup behind narrow commands", async () => {
    vi.mocked(invoke).mockResolvedValue({});
    const input = {
      rootPath: "D:\\Game",
      projectId: "project-1",
      sessionId: "session-1",
      mode: "SEND" as const,
      message: "Develop the faction.",
      modelId: "nvidia/nemotron-3-super-120b-a12b",
    };
    await loadWritersRoomPreflight(input);
    await runWritersRoom(input);
    await loadWritersRoomUsage("project-1");

    expect(invoke).toHaveBeenNthCalledWith(1, "get_writers_room_preflight", { request: input });
    expect(invoke).toHaveBeenNthCalledWith(2, "run_writers_room", { request: input });
    expect(invoke).toHaveBeenNthCalledWith(3, "load_writers_room_usage", { projectId: "project-1" });
  });
});
