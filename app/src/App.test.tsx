import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App, { WorkspaceShell, type Workspace } from "./App";
import {
  getDevelopmentWorkspacePath,
  initializeWorkspace,
  inspectWorkspace,
  selectWorkspaceDirectory,
} from "./platform/workspaceDirectory";

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
        estimatedCostUsd: 0,
      },
      project: {
        requests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
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
    expect(screen.getByText("Not scanned")).toBeInTheDocument();
    expect(screen.getByText("Not integrated")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alignment" }));
    expect(screen.getByText("Alignment workspace is not implemented yet.")).toBeInTheDocument();
  });

  it("opens the bounded AI evaluation harness from the workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "AI Evaluation" }));

    expect(screen.getByRole("heading", { name: "AI Evaluation", level: 2 })).toBeInTheDocument();
    expect(await screen.findByText("nebius_token_factory")).toBeInTheDocument();
  });

  it("opens the Project Interview workflow from the workspace shell", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell workspace={workspace} onOpen={async () => undefined} />);

    await user.click(screen.getByRole("button", { name: "Project Interview" }));

    expect(await screen.findByRole("heading", { name: "Project Interview", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Interview" })).toBeEnabled();
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

  it.each(["Game Design", "Narrative", "Unity", "Alignment"])(
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
