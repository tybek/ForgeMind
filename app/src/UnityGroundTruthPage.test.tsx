import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnityGroundTruthPage } from "./UnityGroundTruthPage";
import { inspectUnityGroundTruth, type UnityGroundTruthResult } from "./platform/unityGroundTruth";

vi.mock("./platform/unityGroundTruth", () => ({ inspectUnityGroundTruth: vi.fn() }));

const workspace = { path: "D:\\Games\\Sample" };
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
  });

  it("shows detected project evidence, parsed version, manifest status, and verified snapshot counts", async () => {
    render(<UnityGroundTruthPage workspace={workspace} />);
    const projectSummary = await screen.findByLabelText("Unity project summary");
    expect(within(projectSummary).getByText("6000.3.23f1", { selector: "strong" })).toBeInTheDocument();
    expect(within(projectSummary).getByText("Available", { selector: "strong" })).toBeInTheDocument();
    const evidence = screen.getByRole("heading", { name: "Portable project evidence" }).closest("section")!;
    expect(within(evidence).getByText("Assets/").parentElement).toHaveTextContent("Present");
    expect(within(evidence).getByText("Packages/").parentElement).toHaveTextContent("Present");
    expect(within(evidence).getByText("ProjectSettings/").parentElement).toHaveTextContent("Present");
    expect(screen.getAllByText("VERIFIED FROM UNITY").length).toBeGreaterThan(1);
    expect(screen.getByText("DOCUMENTED")).toBeInTheDocument();
    expect(screen.getByText("AI INFERENCE")).toBeInTheDocument();
    expect(screen.getByLabelText("GroundTruth observation counts")).toHaveTextContent("Scenes 2");
    expect(inspectUnityGroundTruth).toHaveBeenCalledWith(workspace.path);
  });

  it.each([
    ["NOT_GENERATED", "Not generated"],
    ["INVALID_OR_UNSUPPORTED", "Invalid / unsupported"],
  ] as const)("renders the %s manifest state without fabricating evidence", async (status, label) => {
    vi.mocked(inspectUnityGroundTruth).mockResolvedValue({ ...detected, manifest: { status, message: status === "INVALID_OR_UNSUPPORTED" ? "Safe invalid state." : undefined } });
    render(<UnityGroundTruthPage workspace={workspace} />);
    const projectSummary = await screen.findByLabelText("Unity project summary");
    expect(within(projectSummary).getByText(label, { selector: "strong" })).toBeInTheDocument();
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
    expect(await screen.findByText("Not detected")).toBeInTheDocument();
    expect(screen.getByText("ForgeMind remains usable.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh evidence" }));
    expect(inspectUnityGroundTruth).toHaveBeenCalledTimes(2);
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
});
