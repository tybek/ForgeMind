import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnityGroundTruthPage } from "./UnityGroundTruthPage";
import { inspectUnityGroundTruth, type UnityGroundTruthResult } from "./platform/unityGroundTruth";
import { disconnectRealityConnection, getRealityConnections, selectRealityFolder, setRealityConnection } from "./platform/realityConnections";

vi.mock("./platform/unityGroundTruth", () => ({ inspectUnityGroundTruth: vi.fn() }));
vi.mock("./platform/realityConnections", () => ({
  disconnectRealityConnection: vi.fn(),
  getRealityConnections: vi.fn(),
  selectRealityFolder: vi.fn(),
  setRealityConnection: vi.fn(),
}));

const workspace = { path: "D:\\Games\\Sample", projectId: "project-1" };
const detected: UnityGroundTruthResult = {
  status: "DETECTED",
  evidence: { assets: true, packages: true, projectSettings: true },
  projectVersion: { status: "AVAILABLE", version: "6000.3.23f1" },
  manifest: {
    status: "AVAILABLE",
    summary: {
      formatVersion: 1,
      generatedAt: "2026-09-20T12:00:00Z",
      unityVersion: "6000.3.23f1",
      coverageCategories: ["SCENES", "COMPONENTS"],
      coverageErrorCount: 0,
      coverageIssues: [],
      observationCounts: { scenes: 2, gameObjects: 10, components: 14, serializedFields: 8, prefabReferences: 3, scriptableObjects: 2, tags: 4, layers: 2, inputActions: 6, tests: 12 },
    },
  },
};

describe("Unity GroundTruth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inspectUnityGroundTruth).mockResolvedValue(detected);
    vi.mocked(getRealityConnections).mockResolvedValue({ repository: { configured: false }, unity: { configured: false } });
  });

  it("shows detected project evidence, parsed version, manifest status, and verified snapshot counts", async () => {
    const onResult = vi.fn();
    render(<UnityGroundTruthPage workspace={workspace} onResult={onResult} />);
    const projectSummary = await screen.findByLabelText("Unity project summary");
    expect(within(projectSummary).getByText("6000.3.23f1", { selector: "strong" })).toBeInTheDocument();
    expect(within(projectSummary).getByText("Available", { selector: "strong" })).toBeInTheDocument();
    const evidence = screen.getByRole("heading", { name: "Portable project evidence" }).closest("section")!;
    expect(within(evidence).getByText("Assets/").parentElement).toHaveTextContent("Present");
    expect(within(evidence).getByText("Packages/").parentElement).toHaveTextContent("Present");
    expect(within(evidence).getByText("ProjectSettings/").parentElement).toHaveTextContent("Present");
    expect(screen.getAllByText("VERIFIED FROM UNITY")).toHaveLength(2);
    expect(screen.getByText("DOCUMENTED")).toBeInTheDocument();
    expect(screen.getByText("AI INFERENCE")).toBeInTheDocument();
    expect(screen.getByText("About evidence types")).toBeInTheDocument();
    expect(screen.getByLabelText("GroundTruth observation counts")).toHaveTextContent("Scenes 2");
    expect(inspectUnityGroundTruth).toHaveBeenCalledWith(workspace.path);
    expect(onResult).toHaveBeenCalledWith(detected);
  });

  it.each([
    ["NOT_ATTACHED", "Not attached", "Portable inspection only"],
    ["NOT_GENERATED", "Not generated", "Portable inspection only"],
    ["INVALID_OR_UNSUPPORTED", "Invalid", "Portable inspection only"],
  ] as const)("renders the %s manifest state without fabricating evidence", async (status, label, coverage) => {
    vi.mocked(inspectUnityGroundTruth).mockResolvedValue({ ...detected, manifest: { status, message: status === "INVALID_OR_UNSUPPORTED" ? "Safe invalid state." : undefined } });
    render(<UnityGroundTruthPage workspace={workspace} />);
    const projectSummary = await screen.findByLabelText("Unity project summary");
    expect(within(projectSummary).getByText(label, { selector: "strong" })).toHaveClass(status === "INVALID_OR_UNSUPPORTED" ? "reality-status-error" : "reality-status-muted");
    expect(within(projectSummary).getByText(coverage, { selector: "strong" })).toBeInTheDocument();
    expect(screen.queryByLabelText("GroundTruth observation counts")).not.toBeInTheDocument();
  });

  it("keeps a non-Unity workspace usable and refreshes only through the typed boundary", async () => {
    vi.mocked(inspectUnityGroundTruth).mockResolvedValue({
      status: "NOT_DETECTED",
      evidence: { assets: false, packages: false, projectSettings: false },
      projectVersion: { status: "MISSING" },
      manifest: { status: "NOT_GENERATED" },
      message: "ForgeMind remains usable.",
    });
    const user = userEvent.setup();
    render(<UnityGroundTruthPage workspace={workspace} />);
    expect(await screen.findByText("Not connected")).toBeInTheDocument();
    expect(screen.getByText("ForgeMind remains usable.")).toBeInTheDocument();
    expect(screen.getByText("Project-owned GroundTruth").parentElement).toHaveTextContent("Not available");
    expect(screen.queryByRole("heading", { name: ".forgemind/unity-groundtruth.json" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh Evidence" }));
    expect(inspectUnityGroundTruth).toHaveBeenCalledTimes(2);
  });

  it("selects and persists an explicit Unity folder before re-inspection", async () => {
    vi.mocked(inspectUnityGroundTruth).mockResolvedValue({
      status: "NOT_DETECTED",
      evidence: { assets: false, packages: false, projectSettings: false },
      projectVersion: { status: "MISSING" },
      manifest: { status: "NOT_GENERATED" },
    });
    vi.mocked(selectRealityFolder).mockResolvedValue("D:\\Unity\\Game");
    const user = userEvent.setup();
    render(<UnityGroundTruthPage workspace={workspace} />);
    await screen.findByRole("heading", { name: "No Unity project connected" });
    await user.click(screen.getAllByRole("button", { name: "Select Unity Project" })[0]);
    expect(setRealityConnection).toHaveBeenCalledWith(workspace.path, workspace.projectId, "UNITY", "D:\\Unity\\Game");
    expect(inspectUnityGroundTruth).toHaveBeenCalledTimes(2);
  });

  it("disconnects only the configured Unity connection", async () => {
    vi.mocked(getRealityConnections).mockResolvedValue({ repository: { configured: false }, unity: { configured: true, folderName: "Game" } });
    const user = userEvent.setup();
    render(<UnityGroundTruthPage workspace={workspace} />);
    await screen.findByLabelText("Unity project summary");
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(disconnectRealityConnection).toHaveBeenCalledWith(workspace.path, workspace.projectId, "UNITY");
  });

  it("shows capped counts as partial and renders safe classified coverage issues", async () => {
    vi.mocked(inspectUnityGroundTruth).mockResolvedValue({
      ...detected,
      manifest: {
        status: "AVAILABLE",
        summary: {
          ...detected.manifest.summary!,
          coverageErrorCount: 3,
          coverageIssues: [
            { category: "SERIALIZED_FIELDS", code: "SERIALIZED_FIELDS_TRUNCATED", kind: "BOUNDED_TRUNCATION" },
            { category: "INPUT_ACTIONS", code: "INPUT_ACTION_API_UNAVAILABLE", kind: "UNSUPPORTED" },
            { category: "TESTS", code: "TEST_DISCOVERY_FAILED", kind: "ERROR" },
          ],
          observationCounts: { ...detected.manifest.summary!.observationCounts, serializedFields: 10000 },
        },
      },
    });

    render(<UnityGroundTruthPage workspace={workspace} />);
    const counts = await screen.findByLabelText("GroundTruth observation counts");
    expect(within(counts).getByText("Fields").parentElement).toHaveTextContent("10,000+ / partial coverage");
    const issues = screen.getByRole("heading", { name: "Coverage issues" }).closest("section")!;
    expect(within(issues).getByText("BOUNDED / TRUNCATED")).toBeInTheDocument();
    expect(within(issues).getByText("UNSUPPORTED")).toBeInTheDocument();
    expect(within(issues).getByText("ERROR")).toBeInTheDocument();
    expect(within(issues).getByText("SERIALIZED_FIELDS_TRUNCATED")).toBeInTheDocument();
    expect(within(issues).getByText(/minimum, not an exact total/)).toBeInTheDocument();
    expect(issues).not.toHaveTextContent("D:\\Games\\Sample");
  });

  it("keeps persistent partial coverage after a read-only refresh", async () => {
    const partial = {
      ...detected,
      manifest: {
        status: "AVAILABLE" as const,
        summary: {
          ...detected.manifest.summary!,
          coverageErrorCount: 1,
          coverageIssues: [
            { category: "SERIALIZED_FIELDS" as const, code: "SERIALIZED_FIELDS_TRUNCATED", kind: "BOUNDED_TRUNCATION" as const },
          ],
        },
      },
    };
    vi.mocked(inspectUnityGroundTruth).mockResolvedValue(partial);
    const user = userEvent.setup();
    render(<UnityGroundTruthPage workspace={workspace} />);
    const summary = await screen.findByLabelText("Unity project summary");
    expect(within(summary).getByText("Partial", { selector: "strong" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh Evidence" }));
    expect(inspectUnityGroundTruth).toHaveBeenCalledTimes(2);
    expect(within(summary).getByText("Partial", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/does not run the Unity exporter or change exporter coverage/i)).toBeInTheDocument();
  });
});
