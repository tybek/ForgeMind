import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { inspectRepositoryReality } from "./repositoryReality";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("repository reality native boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockResolvedValue({ status: "NOT_REPOSITORY" });
  });

  it("supplies only the active workspace path to one fixed inspection command", async () => {
    await inspectRepositoryReality("D:\\Games\\Sample");
    expect(invoke).toHaveBeenCalledWith("inspect_repository_reality", {
      path: "D:\\Games\\Sample",
    });
    expect(Object.keys(vi.mocked(invoke).mock.calls[0][1] as object)).toEqual(["path"]);
  });
});
