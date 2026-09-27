import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App, { WorkspaceShell, type Workspace } from "./App";
import { loadCompendium } from "./platform/projectKnowledge";
import { loadDecisions } from "./platform/decisions";
import { runInterviewTurn } from "./platform/projectInterview";
import { runSpecialistAnalysis } from "./platform/specialists";
import { suggestNewProjectCoreLoops, suggestNewProjectDesignPillars } from "./platform/creatorAi";
import {
  getDevelopmentWorkspacePath,
  initializeWorkspace,
  inspectWorkspace,
  selectWorkspaceDirectory,
} from "./platform/workspaceDirectory";
import { inspectUnityGroundTruth } from "./platform/unityGroundTruth";
import { inspectRepositoryReality } from "./platform/repositoryReality";
import { loadAlignmentResults } from "./platform/alignment";
import { loadFeatureContracts } from "./platform/featureContracts";
import { loadRecentProjects, recordRecentProject } from "./platform/recentProjects";

vi.mock("./platform/workspaceDirectory", () => ({
  getDevelopmentWorkspacePath: vi.fn(),
  selectWorkspaceDirectory: vi.fn(),
  inspectWorkspace: vi.fn(),
  initializeWorkspace: vi.fn(),
}));

vi.mock("./platform/creatorAi", () => ({
  suggestNewProjectCoreLoops: vi.fn(),
  suggestNewProjectDesignPillars: vi.fn(),
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

vi.mock("./platform/realityConnections", () => ({
  disconnectRealityConnection: vi.fn(),
  getRealityConnections: vi.fn().mockResolvedValue({ repository: { configured: false }, unity: { configured: false } }),
  selectRealityFolder: vi.fn(),
  setRealityConnection: vi.fn(),
}));

vi.mock("./platform/alignment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/alignment")>()),
  loadAlignmentSources: vi.fn().mockResolvedValue({ projectId: "550e8400-e29b-41d4-a716-446655440000", intentSources: [], realityEvidence: [] }),
  loadAlignmentResults: vi.fn().mockResolvedValue(null),
  createAlignmentReview: vi.fn(),
  reviewAlignmentResult: vi.fn(),
}));

vi.mock("./platform/featureContracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/featureContracts")>()),
  loadFeatureContractSources: vi.fn().mockResolvedValue({ projectId: "550e8400-e29b-41d4-a716-446655440000", sources: [] }),
  loadFeatureContracts: vi.fn().mockResolvedValue(null),
  createFeatureContract: vi.fn(),
  updateFeatureContract: vi.fn(),
  deleteFeatureContractDraft: vi.fn(),
  draftFeatureContractWithAi: vi.fn(),
  setFeatureContractStatus: vi.fn(),
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
  "Feature Contracts",
];

function navigationName(area: string): string {
  return ["Narrative", "Technical", "Roadmap"].includes(area) ? `${area}, Planned` : area;
}

describe("ForgeMind local workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getDevelopmentWorkspacePath).mockResolvedValue(null);
    vi.mocked(loadCompendium).mockResolvedValue(null);
    vi.mocked(loadDecisions).mockResolvedValue(null);
    vi.mocked(loadAlignmentResults).mockResolvedValue(null);
    vi.mocked(loadFeatureContracts).mockResolvedValue(null);
  });

  it("renders Workspace Home with project actions and an honest next-steps preview", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Turn ideas into playable worlds." })).toBeInTheDocument();
    expect(screen.getByLabelText("ForgeMind, AI for Game Development")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start New Project" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Open Existing Project" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "Recent Projects" })).toBeInTheDocument();
    expect(screen.getByText("No recent projects yet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommended Next Steps" })).toBeInTheDocument();
    expect(screen.getByText("Open a project to get project-aware next steps.")).toBeInTheDocument();
    expect(screen.queryByText("Fix combat system")).not.toBeInTheDocument();
  });

  it("shows project-aware recommendations with reasons and routes actions to existing areas", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue(validInspection);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Existing Project" }));
    await user.click(await screen.findByRole("button", { name: "Home" }));

    expect(await screen.findByRole("heading", { name: "Complete Game Foundation" })).toBeInTheDocument();
    expect(screen.getByText("Your Game Foundation still needs Game Vision, Core Loop, Player Experience, and Design Pillars.")).toBeInTheDocument();
    expect(suggestNewProjectCoreLoops).not.toHaveBeenCalled();
    expect(suggestNewProjectDesignPillars).not.toHaveBeenCalled();
    expect(inspectRepositoryReality).not.toHaveBeenCalled();
    expect(inspectUnityGroundTruth).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continue in Game Design" }));

    expect(screen.getByRole("heading", { name: "Game Design", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Game Design" })).toHaveAttribute("aria-current", "page");
  });

  it("recomputes Home recommendations after opening a different recent project", async () => {
    const secondPath = "D:\\Games\\SecondGame";
    const secondProject = { ...validInspection.project, projectId: "660e8400-e29b-41d4-a716-446655440000", name: "Second Game" };
    recordRecentProject(selectedPath, validInspection.project, "2026-09-27T10:00:00.000Z");
    recordRecentProject(secondPath, secondProject, "2026-09-27T09:00:00.000Z");
    vi.mocked(inspectWorkspace).mockImplementation(async (path) => path === selectedPath
      ? validInspection
      : { status: "VALID", rootPath: secondPath, project: secondProject });
    vi.mocked(loadCompendium).mockImplementation(async (path) => ({
      formatVersion: 1,
      projectId: path === selectedPath ? validInspection.project.projectId : secondProject.projectId,
      updatedAt: "2026-09-27T10:00:00.000Z",
      entries: path === selectedPath ? [
        { id: "vision", area: "game_vision", title: "Game vision", statement: "A clear vision.", status: "DIRECTION", provenance: "USER_STATED", source: "new_project_creator", createdAt: "2026-09-27T10:00:00.000Z", updatedAt: "2026-09-27T10:00:00.000Z" },
        { id: "experience", area: "player_experience", title: "Player experience", statement: "A clear experience.", status: "DIRECTION", provenance: "USER_STATED", source: "new_project_creator", createdAt: "2026-09-27T10:00:00.000Z", updatedAt: "2026-09-27T10:00:00.000Z" },
        { id: "pillar", area: "game_vision", title: "Design pillar: Clarity", statement: "Stay readable.", status: "DIRECTION", provenance: "USER_STATED", source: "new_project_creator", createdAt: "2026-09-27T10:00:00.000Z", updatedAt: "2026-09-27T10:00:00.000Z" },
      ] : [
        { id: "vision", area: "game_vision", title: "Game vision", statement: "A clear vision.", status: "DIRECTION", provenance: "USER_STATED", source: "new_project_creator", createdAt: "2026-09-27T10:00:00.000Z", updatedAt: "2026-09-27T10:00:00.000Z" },
        { id: "experience", area: "player_experience", title: "Player experience", statement: "A clear experience.", status: "DIRECTION", provenance: "USER_STATED", source: "new_project_creator", createdAt: "2026-09-27T10:00:00.000Z", updatedAt: "2026-09-27T10:00:00.000Z" },
        { id: "loop", area: "core_loop", title: "Core loop", statement: "Explore and return.", status: "DIRECTION", provenance: "USER_STATED", source: "new_project_creator", createdAt: "2026-09-27T10:00:00.000Z", updatedAt: "2026-09-27T10:00:00.000Z" },
        { id: "pillar", area: "game_vision", title: "Design pillar: Clarity", statement: "Stay readable.", status: "DIRECTION", provenance: "USER_STATED", source: "new_project_creator", createdAt: "2026-09-27T10:00:00.000Z", updatedAt: "2026-09-27T10:00:00.000Z" },
      ],
    }));
    vi.mocked(loadDecisions).mockImplementation(async (path) => path === secondPath ? {
      formatVersion: 1,
      projectId: secondProject.projectId,
      updatedAt: "2026-09-27T10:00:00.000Z",
      decisions: [{
        id: "decision-1", title: "Camera", statement: "Use a close camera.", rationale: "Intensity.", status: "PROPOSED", area: "game_vision", author: "Designer", createdAt: "2026-09-27T10:00:00.000Z", relatedKnowledgeEntryIds: [],
      }],
    } : null);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: `Open ${workspace.name}` }));
    await user.click(await screen.findByRole("button", { name: "Home" }));
    expect(await screen.findByRole("heading", { name: "Complete Game Foundation" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Second Game" }));
    await user.click(await screen.findByRole("button", { name: "Home" }));

    expect(await screen.findByRole("heading", { name: "Review Pending Decisions" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Complete Game Foundation" })).not.toBeInTheDocument();
  });

  it("opens the guided Creator before any directory selection", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start New Project" }));

    expect(screen.getByRole("heading", { name: "Give your game a starting identity." })).toBeInTheDocument();
    expect(screen.getByLabelText("New Project Creator progress")).toBeInTheDocument();
    expect(selectWorkspaceDirectory).not.toHaveBeenCalled();
    expect(inspectWorkspace).not.toHaveBeenCalled();
    expect(initializeWorkspace).not.toHaveBeenCalled();
  });

  it("selects a directory only after Review and initializes through the existing boundary", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue({ status: "UNINITIALIZED", rootPath: selectedPath });
    vi.mocked(initializeWorkspace).mockResolvedValue(validInspection);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start New Project" }));
    await user.type(screen.getByLabelText("Working title"), "Ashfall Courier");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Game pitch"), "Carry fragile messages through a changing volcanic frontier.");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    for (let step = 0; step < 5; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    expect(screen.getByRole("heading", { name: "Your Game Foundation" })).toBeInTheDocument();
    expect(selectWorkspaceDirectory).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Create Project" }));

    expect(selectWorkspaceDirectory).toHaveBeenCalledWith("create");
    expect(inspectWorkspace).toHaveBeenCalledWith(selectedPath);
    expect(await screen.findByRole("button", { name: "Initialize Project" })).toBeInTheDocument();
    expect(initializeWorkspace).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Initialize Project" }));

    expect(initializeWorkspace).toHaveBeenCalledWith(selectedPath, expect.objectContaining({
      workingTitle: "Ashfall Courier",
      pitch: "Carry fragile messages through a changing volcanic frontier.",
      openQuestions: expect.arrayContaining(["What will players do again and again?"]),
    }));
    expect(suggestNewProjectCoreLoops).not.toHaveBeenCalled();
    expect(suggestNewProjectDesignPillars).not.toHaveBeenCalled();
    expect(runInterviewTurn).not.toHaveBeenCalled();
    expect(runSpecialistAnalysis).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(loadRecentProjects()).toEqual(expect.arrayContaining([expect.objectContaining({ projectId: workspace.projectId })]));
  });

  it("preserves the reviewed Creator draft when initialization fails", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue({ status: "UNINITIALIZED", rootPath: selectedPath });
    vi.mocked(initializeWorkspace).mockRejectedValue(new Error("The Project Foundation could not be saved."));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start New Project" }));
    await user.type(screen.getByLabelText("Working title"), "Ashfall Courier");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Game pitch"), "Carry fragile messages through a changing volcanic frontier.");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    for (let step = 0; step < 5; step += 1) await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Create Project" }));
    await user.click(await screen.findByRole("button", { name: "Initialize Project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.getByRole("heading", { name: "Your Game Foundation" })).toBeInTheDocument();
    expect(screen.getByText("Ashfall Courier")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Initialize Project" })).toBeEnabled();
  });

  it("does not overwrite an existing ForgeMind workspace selected from Creator", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue(validInspection);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start New Project" }));
    await user.type(screen.getByLabelText("Working title"), "Ashfall Courier");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Game pitch"), "Carry fragile messages through a changing volcanic frontier.");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    for (let step = 0; step < 5; step += 1) await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Create Project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already a ForgeMind workspace");
    expect(initializeWorkspace).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Your Game Foundation" })).toBeInTheDocument();
  });

  it("renders persisted recent projects and opens one through the existing inspection flow", async () => {
    recordRecentProject(selectedPath, validInspection.project, "2026-09-25T18:30:00.000Z");
    vi.mocked(inspectWorkspace).mockResolvedValue(validInspection);
    const user = userEvent.setup();
    render(<App />);

    const recentProject = screen.getByRole("button", { name: `Open ${workspace.name}` });
    expect(recentProject).toHaveTextContent(workspace.name);
    expect(within(recentProject).getByText(selectedPath)).toHaveAttribute("title", selectedPath);
    expect(within(recentProject).getByText(/Last opened/)).toHaveAttribute(
      "dateTime",
      "2026-09-25T18:30:00.000Z",
    );

    await user.click(recentProject);

    expect(inspectWorkspace).toHaveBeenCalledWith(selectedPath);
    expect(await screen.findByText(workspace.projectId)).toBeInTheDocument();
  });

  it("removes an unavailable recent project without leaving Home", async () => {
    recordRecentProject(selectedPath, validInspection.project, "2026-09-25T18:30:00.000Z");
    vi.mocked(inspectWorkspace).mockRejectedValue(new Error("Directory not found"));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: `Open ${workspace.name}` }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That recent project is no longer available and was removed from the list.",
    );
    expect(screen.getByRole("heading", { name: "Recent Projects" })).toBeInTheDocument();
    expect(screen.getByText("No recent projects yet")).toBeInTheDocument();
    expect(loadRecentProjects()).toEqual([]);
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

    await user.click(screen.getByRole("button", { name: "Open Existing Project" }));

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

    await user.click(screen.getByRole("button", { name: "Open Existing Project" }));
    await user.click(await screen.findByRole("button", { name: "Initialize Workspace" }));

    expect(initializeWorkspace).toHaveBeenCalledWith(selectedPath);
    expect(await screen.findByText(workspace.projectId)).toBeInTheDocument();
  });

  it("loads persisted workspace identity, truthful statuses, and navigation", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue(validInspection);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Existing Project" }));

    expect(await screen.findAllByText(workspace.name)).not.toHaveLength(0);
    expect(screen.getByText(workspace.projectId)).toBeInTheDocument();
    expect(screen.getByText(workspace.createdAt)).toBeInTheDocument();
    expect(screen.getByText(String(workspace.formatVersion))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Initialize Workspace" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();

    for (const area of requiredAreas) {
      expect(screen.getByRole("button", { name: navigationName(area) })).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByText(workspace.name, { selector: ".page-header .type-eyebrow" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Global", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Project tools", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI tools", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delivery", level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText("Planned")).toHaveLength(3);
    expect(screen.queryByText("WIP")).not.toBeInTheDocument();
    expect(screen.getByText("Project identity and the capabilities available in this local workspace.")).toBeVisible();

    expect(screen.getByText("Evaluation and local usage")).toBeInTheDocument();
    expect(screen.getByText("GroundTruth page")).toBeInTheDocument();
    expect(screen.getByText("Repository Reality page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alignment" }));
    expect(await screen.findByRole("heading", { name: "Alignment", level: 2 })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Review History" }));
    expect(screen.getByText("No Alignment Reviews have been created yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Feature Contracts" }));
    expect(await screen.findByRole("heading", { name: "Feature Contracts", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Feature Contracts" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("0K · Complete")).toBeVisible();
    expect(screen.getByText("No eligible sources exist. Approve an Alignment Review or Decision, or add current Compendium knowledge.")).toBeInTheDocument();
  });

  it("returns Home without changing the project and reopens it from Recent Projects", async () => {
    vi.mocked(selectWorkspaceDirectory).mockResolvedValue(selectedPath);
    vi.mocked(inspectWorkspace).mockResolvedValue(validInspection);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open Existing Project" }));
    expect(await screen.findByText(workspace.projectId)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    const recentBeforeHome = loadRecentProjects();

    await user.click(screen.getByRole("button", { name: "Home" }));

    expect(screen.getByRole("heading", { name: "Turn ideas into playable worlds." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start New Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Open ${workspace.name}` })).toBeInTheDocument();
    expect(loadRecentProjects()).toEqual(recentBeforeHome);
    expect(selectWorkspaceDirectory).toHaveBeenCalledTimes(1);
    expect(inspectWorkspace).toHaveBeenCalledTimes(1);
    expect(initializeWorkspace).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: `Open ${workspace.name}` }));

    expect(await screen.findByText(workspace.projectId)).toBeInTheDocument();
    expect(inspectWorkspace).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Overview", level: 1 })).toBeInTheDocument();
  });

  it("opens the bounded AI evaluation harness from the workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);

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

  it("keeps the sidebar project summary compact and exposes the full project name", () => {
    const longName = "A Very Long ForgeMind Project Name That Must Stay Within The Sidebar";
    const { container } = render(
      <WorkspaceShell workspace={{ ...workspace, name: longName }} onHome={() => undefined} onOpen={async () => undefined} />,
    );

    const sidebar = container.querySelector<HTMLElement>(".sidebar");
    const brand = sidebar?.querySelector<HTMLElement>(":scope > .sidebar-brand");
    const homeAction = sidebar?.querySelector<HTMLElement>(":scope > .workspace-home-action");
    const projectCard = sidebar?.querySelector<HTMLElement>(":scope > .sidebar-project");
    const navigation = sidebar?.querySelector<HTMLElement>(":scope > .sidebar-navigation");
    const projectAction = sidebar?.querySelector<HTMLElement>(":scope > .change-project-button");

    expect(sidebar).not.toBeNull();
    expect([brand, homeAction, projectCard, navigation, projectAction]).toEqual(Array.from(sidebar!.children));
    expect(projectCard).toHaveAttribute("title", longName);
    expect(within(projectCard!).getByText("Project")).toBeVisible();
    expect(within(projectCard!).getByText(longName)).toBeVisible();
    expect(projectCard).not.toHaveTextContent(workspace.path);
  });

  it("returns contextually to Game Wiki after entering Feature Contracts from its summary", async () => {
    vi.mocked(loadFeatureContracts).mockResolvedValue({
      formatVersion: 1,
      projectId: workspace.projectId,
      updatedAt: "2026-09-21T12:00:00Z",
      contracts: [{
        id: "contract-1", createdAt: "2026-09-21T12:00:00Z", updatedAt: "2026-09-21T12:00:00Z",
        title: "Enemy sound knowledge", goal: "Keep sound uncertain.", currentRealitySummary: "Reality is unverified.",
        sources: {
          origin: { sourceType: "COMPENDIUM", sourceId: "knowledge-1", title: "Enemy sound", statement: "Sound stays uncertain.", status: "LOCKED", area: "systems", provenance: "DOCUMENTED" },
          intent: { sourceType: "COMPENDIUM", sourceId: "knowledge-1", title: "Enemy sound", statement: "Sound stays uncertain.", status: "LOCKED", area: "systems", provenance: "DOCUMENTED" },
          realityEvidence: [],
        },
        affectedSystems: ["Enemy perception"], requiredBehavior: ["No exact coordinates."], outOfScope: ["Vision"], risks: [],
        acceptanceCriteria: ["Coordinates remain unknown."], deterministicTests: ["Sound-only test."], implementationNotes: "", likelyAffectedEvidenceIds: [],
        status: "APPROVED", reviewState: "APPROVED", reviewedAt: "2026-09-21T12:01:00Z",
      }],
    });
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);
    await user.click(screen.getByRole("button", { name: "Game Wiki" }));
    await user.click(await screen.findByRole("button", { name: /Systems/ }));
    await user.click(await screen.findByRole("button", { name: "View Feature Contracts" }));
    expect(await screen.findByRole("button", { name: "Back to Game Wiki" })).toBeInTheDocument();
    expect(screen.getByText("0K · Complete")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to Game Wiki" }));
    expect(await screen.findByRole("heading", { name: "Game Wiki", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Systems", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Systems/ })).toHaveAttribute("aria-current", "page");
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
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "Game Wiki" }));
    await user.click((await screen.findByText("Systems", { selector: ".wiki-area-nav span" })).closest("button")!);
    await user.click(screen.getByRole("button", { name: "View Alignment History" }));

    expect(await screen.findByRole("heading", { name: "Alignment", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Review History" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Review History" })).toBeInTheDocument();
  });

  it("opens AI Behavior Designer inside the existing workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "AI Behavior Designer" }));

    expect(await screen.findByRole("heading", { name: "AI Behavior Designer", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace areas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
  });

  it("can leave AI Evaluation and open other workspace areas", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);

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
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "Project Interview" }));

    expect(await screen.findByRole("heading", { name: "Project Interview", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Interview" })).toBeEnabled();
  });

  it("opens the 0F Compendium and Decisions inside the existing workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "Game Design" }));
    expect(await screen.findByRole("heading", { name: "Game Compendium" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace areas" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Decisions" }));
    expect(await screen.findByRole("heading", { name: "Decisions", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace areas" })).toBeInTheDocument();
  });

  it("opens Game Wiki as the project knowledge browsing surface", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);
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
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);
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
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);
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
    render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);
    await user.click(screen.getByRole("button", { name: "Unity" }));
    expect(await screen.findByRole("heading", { name: "Unity GroundTruth", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(inspectUnityGroundTruth).toHaveBeenCalledWith(workspace.path);
    expect(screen.getByText("0I · Complete")).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Open Existing Project" }));

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

    await user.click(screen.getByRole("button", { name: "Open Existing Project" }));

    expect(await screen.findByRole("heading", { name: "Unsupported workspace version 2" })).toBeInTheDocument();
    expect(screen.getByText("ForgeMind workspace format version 2 is not supported.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Initialize Workspace" })).not.toBeInTheDocument();
  });

  it.each(["Narrative"])(
    "keeps the %s placeholder honest after a valid workspace loads",
    async (area) => {
      const user = userEvent.setup();
      render(<WorkspaceShell workspace={workspace} onHome={() => undefined} onOpen={async () => undefined} />);

      await user.click(screen.getByRole("button", { name: `${area}, Planned` }));

      expect(screen.getByRole("heading", { name: area, level: 2 })).toBeInTheDocument();
      expect(screen.getByText(`${area} workspace is not implemented yet.`)).toBeInTheDocument();
      expect(screen.queryByText(`${area} workspace is implemented.`)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: `${area}, Planned` })).toHaveAttribute("aria-current", "page");
    },
  );
});
