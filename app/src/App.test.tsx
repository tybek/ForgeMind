import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App, { WorkspaceShell, type Workspace } from "./App";
import { loadCompendium } from "./platform/projectKnowledge";
import {
  getDevelopmentWorkspacePath,
  initializeWorkspace,
  inspectWorkspace,
  selectWorkspaceDirectory,
} from "./platform/workspaceDirectory";
import { inspectUnityGroundTruth } from "./platform/unityGroundTruth";
import { loadAlignmentResults } from "./platform/alignment";

vi.mock("./platform/workspaceDirectory", () => ({
  getDevelopmentWorkspacePath: vi.fn(),
  selectWorkspaceDirectory: vi.fn(),
  inspectWorkspace: vi.fn(),
  initializeWorkspace: vi.fn(),
}));

vi.mock("./platform/modelRegistry", () => ({
  loadModelRegistry: vi.fn().mockResolvedValue([
    {
      provider: "nebius_token_factory",
      modelId: "deepseek-ai/DeepSeek-V4.1-Flash",
      displayName: "DeepSeek V4.1 Flash",
      family: "DeepSeek V4.1",
      availability: "configured",
      capabilities: { supportsReasoningEffort: true },
      enabled: true,
    },
  ]),
}));

vi.mock("./platform/usageMetering", async (importOriginal) => {
  const original = await importOriginal<typeof import("./platform/usageMetering")>();
  return {
    ...original,
    loadUsageSummary: vi.fn().mockResolvedValue({
      session: {
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: null,
      },
      project: {
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: null,
      },
      byModel: [],
    }),
  };
});

vi.mock("./platform/projectInterview", async (importOriginal) => {
  const original = await importOriginal<typeof import("./platform/projectInterview")>();
  return {
    ...original,
    loadInterview: vi.fn().mockResolvedValue(null),
    runInterviewTurn: vi.fn(),
    saveInterview: vi.fn(),
  };
});

vi.mock("./platform/projectKnowledge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectKnowledge")>()),
  loadCompendium: vi.fn().mockResolvedValue(null),
  createKnowledgeEntry: vi.fn(),
  updateKnowledgeEntry: vi.fn(),
  deprecateKnowledgeEntry: vi.fn(),
  importInterviewKnowledge: vi.fn(),
  promoteSpecialistFinding: vi.fn(),
}));

vi.mock("./platform/decisions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/decisions")>()),
  loadDecisions: vi.fn().mockResolvedValue(null),
  createDecision: vi.fn(),
  updateDecision: vi.fn(),
  approveDecision: vi.fn(),
  deprecateDecision: vi.fn(),
}));

vi.mock("./platform/specialists", () => ({
  archiveAndResetSpecialistHistory: vi.fn(),
  loadSpecialistProfiles: vi.fn().mockResolvedValue([{
    id: "ai_behavior_designer",
    displayName: "AI Behavior Designer",
    description: "Analyze tactical behavior.",
    supportedTaskTypes: ["DESIGN_BEHAVIOR"],
    defaultTaskType: "DESIGN_BEHAVIOR",
    maxRunCompletionTokens: 8192,
    taskGuidance: [{ taskType: "DESIGN_BEHAVIOR", preferredCompletionTokens: 3200, recommendedCompendiumAreas: [], preferredDecisionAreas: [] }],
  }]),
  loadSpecialistRuns: vi.fn().mockResolvedValue(null),
  runSpecialistAnalysis: vi.fn(),
}));

vi.mock("./platform/repositoryReality", () => ({
  inspectRepositoryReality: vi.fn().mockResolvedValue({
    status: "NOT_REPOSITORY",
    message: "The active ForgeMind workspace is not inside a Git repository.",
  }),
}));

vi.mock("./platform/unityGroundTruth", () => ({
  inspectUnityGroundTruth: vi.fn().mockResolvedValue({
    status: "NOT_DETECTED",
    evidence: { assets: false, packages: false, projectSettings: false },
    projectVersion: { status: "MISSING" },
    manifest: { status: "NOT_GENERATED" },
    message: "The active workspace is not a Unity project. ForgeMind remains usable.",
  }),
}));

vi.mock("./platform/alignment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/alignment")>()),
  loadAlignmentSources: vi.fn().mockResolvedValue({ projectId: "550e8400-e29b-41d4-a716-446655440000", intentSources: [], realityEvidence: [] }),
  loadAlignmentResults: vi.fn().mockResolvedValue(null),
  createAlignmentReview: vi.fn(),
  reviewAlignmentResult: vi.fn(),
}));

const selectedPath = "D:\\Games\\SampleGame";
const workspace: Workspace = {
  formatVersion: 1,
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  name: "Persisted Sample Game",
  createdAt: "2026-09-18T20:00:00.000Z",
  path: selectedPath,
};

const validInspection = {
  status: "VALID" as const,
  rootPath: selectedPath,
  project: {
    formatVersion: workspace.formatVersion,
    projectId: workspace.projectId,
    name: workspace.name,
    createdAt: workspace.createdAt,
  },
};

const requiredAreas = [
  "Overview",
  "Repository / Git Reality",
  "Game Wiki",
  "Game Design",
  "Narrative",
  "Technical",
  "Unity",
  "Roadmap",
  "Decisions",
  "Alignment",
];

describe("ForgeMind local workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDevelopmentWorkspacePath).mockResolvedValue(null);
    vi.mocked(loadCompendium).mockResolvedValue(null);
    vi.mocked(loadAlignmentResults).mockResolvedValue(null);
  });

  it("renders the welcome screen with the Open Project action", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "ForgeMind" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Project" })).toBeEnabled();
  });

  it("loads a debug-configured workspace through the normal inspection path without opening the picker", async () => {
    vi.mocked(getDevelopmentWorkspacePath).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue(validInspection);
    render(<App />);

    expect(await screen.findByText(workspace.projectId)).toBeInTheDocument();
    expect(inspectWorkspace).toHaveBeenCalledWith(selectedPath);
    expect(selectWorkspaceDirectory).not.toHaveBeenCalled();
  });

  it("shows an explicit initialization action for an uninitialized directory", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue({
      status: "UNINITIALIZED",
      rootPath: selectedPath,
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Project" }));

    expect(await screen.findByText("This directory is not yet a ForgeMind workspace.")).toBeInTheDocument();
    expect(screen.getByText(selectedPath)).toBeInTheDocument();
    expect(screen.getByText("Not initialized")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Initialize Workspace" })).toBeVisible();
    expect(initializeWorkspace).not.toHaveBeenCalled();
  });

  it("initializes only after the user chooses Initialize Workspace", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue({
      status: "UNINITIALIZED",
      rootPath: selectedPath,
    });
    vi.mocked(initializeWorkspace).mockResolvedValue(validInspection);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Project" }));
    await user.click(await screen.findByRole("button", { name: "Initialize Workspace" }));

    expect(initializeWorkspace).toHaveBeenCalledWith(selectedPath);
    expect(await screen.findByText(workspace.projectId)).toBeInTheDocument();
  });

  it("loads persisted workspace identity, truthful statuses, and navigation", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue(validInspection);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Project" }));

    expect(await screen.findAllByText(workspace.name)).not.toHaveLength(0);
    expect(screen.getByText(workspace.projectId)).toBeInTheDocument();
    expect(screen.getByText(workspace.createdAt)).toBeInTheDocument();
    expect(screen.getByText(String(workspace.formatVersion))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Initialize Workspace" })).not.toBeInTheDocument();

    for (const area of requiredAreas) {
      expect(screen.getByRole("button", { name: area })).toBeInTheDocument();
    }

    expect(screen.getByText("Evaluation and local usage")).toBeInTheDocument();
    expect(screen.getByText("GroundTruth page")).toBeInTheDocument();
    expect(screen.getByText("Repository Reality page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alignment" }));
    expect(await screen.findByRole("heading", { name: "Alignment", level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Review History" }));
    expect(screen.getByText("No Alignment Reviews have been created yet.")).toBeInTheDocument();
  });

  it("opens the bounded AI evaluation harness from the workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "AI Evaluation" }));

    expect(screen.getByRole("heading", { name: "AI Evaluation", level: 2 })).toBeInTheDocument();
    expect(await screen.findByText("nebius_token_factory")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Workspace areas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Project Interview" }),
    ).toBeInTheDocument();
  });

  it("opens Alignment Review History from the derived Game Wiki summary", async () => {
    vi.mocked(loadCompendium).mockResolvedValue({
      formatVersion: 1,
      projectId: workspace.projectId,
      updatedAt: "2026-09-21T10:00:00Z",
      entries: [{
        id: "knowledge-1", area: "systems", title: "Perception model", statement: "Enemies act only on perceived facts.",
        status: "LOCKED", provenance: "MANUAL", source: "manual_entry",
        createdAt: "2026-09-21T09:00:00Z", updatedAt: "2026-09-21T09:00:00Z",
      }],
    });
    vi.mocked(loadAlignmentResults).mockResolvedValue({
      formatVersion: 1,
      projectId: workspace.projectId,
      updatedAt: "2026-09-21T10:00:00Z",
      results: [{
        id: "alignment-1", createdAt: "2026-09-21T10:00:00Z",
        intent: { sourceType: "COMPENDIUM", sourceId: "knowledge-1", title: "Perception model", statement: "Enemies act only on perceived facts.", status: "LOCKED", area: "systems", provenance: "DOCUMENTED" },
        evidence: [], status: "UNVERIFIED", rationale: "Runtime evidence is missing.", confidence: "LOW",
        uncertainty: "Runtime behavior is unavailable.", provenance: ["DOCUMENTED", "MANUAL_ASSESSMENT"], reviewState: "APPROVED",
      }],
    });
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "Game Wiki" }));
    await user.click((await screen.findByText("Systems", { selector: ".wiki-area-nav span" })).closest("button")!);
    await user.click(screen.getByRole("button", { name: "View Alignment History" }));

    expect(await screen.findByRole("heading", { name: "Alignment", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Review History" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Review History" })).toBeInTheDocument();
  });

  it("opens AI Behavior Designer inside the existing workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "AI Behavior Designer" }));

    expect(await screen.findByRole("heading", { name: "AI Behavior Designer", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace areas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
  });

  it("can leave AI Evaluation and open other workspace areas", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "AI Evaluation" }));
    expect(await screen.findByText("nebius_token_factory")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByText(workspace.projectId)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Project Interview" }));
    expect(
      await screen.findByRole("heading", { name: "Project Interview", level: 2 }),
    ).toBeInTheDocument();
  });

  it("opens the Project Interview workflow from the workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "Project Interview" }));

    expect(await screen.findByRole("heading", { name: "Project Interview", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Interview" })).toBeEnabled();
  });

  it("opens the 0F Compendium and Decisions inside the existing workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "Game Design" }));
    expect(await screen.findByRole("heading", { name: "Game Compendium" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace areas" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Decisions" }));
    expect(await screen.findByRole("heading", { name: "Decisions", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace areas" })).toBeInTheDocument();
  });

  it("opens Game Wiki as the project knowledge browsing surface", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);
    await user.click(screen.getByRole("button", { name: "Game Wiki" }));
    expect(await screen.findByRole("heading", { name: "Game Wiki", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Wiki areas" })).toBeInTheDocument();
  });

  it("navigates Wiki Knowledge editing to the existing Compendium editor", async () => {
    vi.mocked(loadCompendium).mockResolvedValue({
      formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-20T10:00:00Z",
      entries: [{ id: "knowledge-1", area: "systems", title: "Perception model", statement: "Enemies use perceived facts.", status: "DIRECTION", provenance: "MANUAL", source: "manual_entry", createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z" }],
    });
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);
    await user.click(screen.getByRole("button", { name: "Game Wiki" }));
    await user.click(await screen.findByRole("button", { name: /Systems/ }));
    await user.click(screen.getByText("Perception model"));
    await user.click(screen.getByRole("button", { name: "Edit in Compendium" }));
    expect(await screen.findByRole("heading", { name: "Game Compendium" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Edit Knowledge" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Perception model");
  });

  it("opens the read-only Repository Reality workspace page", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);
    await user.click(screen.getByRole("button", { name: "Repository / Git Reality" }));
    expect(await screen.findByRole("heading", { name: "Git / Repository", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("The active ForgeMind workspace is not inside a Git repository.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /commit|push|pull|fetch|checkout/i })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace areas" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByText(workspace.projectId)).toBeInTheDocument();
  });

  it("opens the Unity GroundTruth workspace page through the narrow inspection boundary", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);
    await user.click(screen.getByRole("button", { name: "Unity" }));
    expect(await screen.findByRole("heading", { name: "Unity GroundTruth", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Not detected")).toBeInTheDocument();
    expect(inspectUnityGroundTruth).toHaveBeenCalledWith(workspace.path);
    expect(screen.getByText("0I.2 Unity GroundTruth")).toBeInTheDocument();
  });

  it("shows invalid metadata honestly without offering initialization", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue({
      status: "INVALID",
      rootPath: selectedPath,
      message: "ForgeMind workspace metadata is invalid.",
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Project" }));

    expect(await screen.findByText("ForgeMind workspace metadata is invalid.")).toBeInTheDocument();
    expect(screen.getByText("The existing .forgemind/project.json file was not changed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Initialize Workspace" })).not.toBeInTheDocument();
  });

  it("shows unsupported versions as a distinct non-destructive state", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue({
      status: "UNSUPPORTED_VERSION",
      rootPath: selectedPath,
      version: "2",
      message: "ForgeMind workspace format version 2 is not supported.",
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Project" }));

    expect(await screen.findByRole("heading", { name: "Unsupported workspace version 2" })).toBeInTheDocument();
    expect(screen.getByText("ForgeMind workspace format version 2 is not supported.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Initialize Workspace" })).not.toBeInTheDocument();
  });

  it.each(["Narrative"])(
    "keeps the %s placeholder honest after a valid workspace loads",
    async (area) => {
      const user = userEvent.setup();
      render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

      await user.click(screen.getByRole("button", { name: area }));

      expect(screen.getByRole("heading", { name: area, level: 2 })).toBeInTheDocument();
      expect(screen.getByText(`${area} workspace is not implemented yet.`)).toBeInTheDocument();
      expect(screen.queryByText(`${area} workspace is implemented.`)).not.toBeInTheDocument();
    },
  );
});
