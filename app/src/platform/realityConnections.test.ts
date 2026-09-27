import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  disconnectRealityConnection,
  getRealityConnections,
  selectRealityFolder,
  setRealityConnection,
} from "./realityConnections";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

describe("Reality connections", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["REPOSITORY", "Select Repository Folder"],
    ["UNITY", "Select Unity Project Folder"],
  ] as const)("uses the explicit native folder picker for %s", async (source, title) => {
    vi.mocked(open).mockResolvedValue("D:\\External");
    await expect(selectRealityFolder(source)).resolves.toBe("D:\\External");
    expect(open).toHaveBeenCalledWith({ directory: true, multiple: false, title });
  });

  it("uses typed project-scoped native commands for load, set, and disconnect", async () => {
    vi.mocked(invoke).mockResolvedValue({ repository: { configured: false }, unity: { configured: false } });
    await getRealityConnections("D:\\Workspace");
    await setRealityConnection("D:\\Workspace", "project-a", "REPOSITORY", "D:\\Repo");
    await disconnectRealityConnection("D:\\Workspace", "project-a", "UNITY");
    expect(invoke).toHaveBeenNthCalledWith(1, "get_reality_connections", { path: "D:\\Workspace" });
    expect(invoke).toHaveBeenNthCalledWith(2, "set_reality_connection", { request: { rootPath: "D:\\Workspace", projectId: "project-a", source: "REPOSITORY", selectedPath: "D:\\Repo" } });
    expect(invoke).toHaveBeenNthCalledWith(3, "disconnect_reality_connection", { request: { rootPath: "D:\\Workspace", projectId: "project-a", source: "UNITY" } });
  });
});
