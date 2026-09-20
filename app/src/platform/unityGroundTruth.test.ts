import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { inspectUnityGroundTruth } from "./unityGroundTruth";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("Unity GroundTruth platform boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("supplies only the active workspace path to one fixed inspection command", async () => {
    vi.mocked(invoke).mockResolvedValue({ status: "NOT_DETECTED" });
    await inspectUnityGroundTruth("D:\\Games\\Sample");
    expect(invoke).toHaveBeenCalledWith("inspect_unity_groundtruth", { path: "D:\\Games\\Sample" });
  });
});
