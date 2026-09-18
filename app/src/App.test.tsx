import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App, { WorkspaceShell, type Workspace } from "./App";
import {
  initializeWorkspace,
  inspectWorkspace,
  selectWorkspaceDirectory,
} from "./platform/workspaceDirectory";

vi.mock("./platform/workspaceDirectory", () => ({
  selectWorkspaceDirectory: vi.fn(),
  inspectWorkspace: vi.fn(),
  initializeWorkspace: vi.fn(),
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
  });

  it("renders the welcome screen with the Open Project action", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "ForgeMind" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Project" })).toBeEnabled();
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

    expect(screen.getByText("Not configured")).toBeInTheDocument();
    expect(screen.getByText("Not scanned")).toBeInTheDocument();
    expect(screen.getByText("Not integrated")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Alignment" }));
    expect(screen.getByText("Alignment workspace is not implemented yet.")).toBeInTheDocument();
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
