import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepositoryPage } from "./RepositoryPage";
import { inspectRepositoryReality, type RepositoryRealityResult } from "./platform/repositoryReality";

vi.mock("./platform/repositoryReality", () => ({ inspectRepositoryReality: vi.fn() }));

const workspace = { path: "D:\\Games\\Sample" };
const detected: RepositoryRealityResult = {
  status: "DETECTED",
  repository: {
    branch: "main",
    detachedHead: false,
    head: { hash: "a".repeat(40), shortHash: "aaaaaaa", subject: "Add repository evidence", author: "Dev", timestamp: "2026-09-20T10:00:00Z" },
    workingTree: "DIRTY",
    changedFiles: [
      { path: "src/game.ts", status: "MODIFIED", staged: true, unstaged: true, untracked: false, stagedStatus: "MODIFIED", unstagedStatus: "MODIFIED", diffStat: { insertions: 3, deletions: 1, binary: false } },
      { path: "notes.txt", status: "UNTRACKED", staged: false, unstaged: true, untracked: true, unstagedStatus: "UNTRACKED" },
    ],
    totalChangedFiles: 2,
    changedFilesTruncated: false,
    diffStat: { filesChanged: 1, insertions: 3, deletions: 1 },
    recentCommits: [{ hash: "a".repeat(40), shortHash: "aaaaaaa", subject: "Add repository evidence", author: "Dev", timestamp: "2026-09-20T10:00:00Z" }],
  },
};

describe("Repository Reality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inspectRepositoryReality).mockResolvedValue(detected);
  });

  it("renders branch, HEAD, working tree, diff statistics, changed files, and bounded history", async () => {
    const user = userEvent.setup();
    render(<RepositoryPage workspace={workspace} />);
    expect(await screen.findByText("main")).toBeInTheDocument();
    expect(screen.getAllByText("Add repository evidence")).toHaveLength(2);
    expect(screen.getByText("Tracked diff: 1 files changed, +3, -1")).toBeInTheDocument();
    expect(screen.getByText("notes.txt", { selector: "strong" })).toBeInTheDocument();
    const file = screen.getByText("src/game.ts", { selector: "strong" }).closest("details")!;
    expect(within(file).getAllByText("Staged and unstaged changes")).toHaveLength(2);
    await user.click(within(file).getByText("src/game.ts", { selector: "strong" }));
    expect(within(file).getByText("Repository-relative path")).toBeInTheDocument();
    expect(within(file).getByText("+3, -1")).toBeInTheDocument();
    expect(inspectRepositoryReality).toHaveBeenCalledWith(workspace.path);
  });

  it.each([
    ["NOT_REPOSITORY", "Repository not detected"],
    ["GIT_UNAVAILABLE", "Git unavailable"],
    ["INSPECTION_FAILED", "Inspection failed"],
  ] as const)("keeps the workspace usable for %s", async (status, heading) => {
    vi.mocked(inspectRepositoryReality).mockResolvedValue({ status, message: "Safe repository state." });
    render(<RepositoryPage workspace={workspace} />);
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText("Safe repository state.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh snapshot" })).toBeEnabled();
  });

  it("refreshes only through the typed repository inspection boundary", async () => {
    const user = userEvent.setup();
    render(<RepositoryPage workspace={workspace} />);
    await screen.findByText("main");
    await user.click(screen.getByRole("button", { name: "Refresh snapshot" }));
    expect(inspectRepositoryReality).toHaveBeenCalledTimes(2);
    expect(inspectRepositoryReality).toHaveBeenLastCalledWith(workspace.path);
  });
});
