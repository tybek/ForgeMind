import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InterviewPage } from "./InterviewPage";
import { loadModelRegistry } from "./platform/modelRegistry";
import { loadInterview, runInterviewTurn, saveInterview } from "./platform/projectInterview";

vi.mock("./platform/modelRegistry", () => ({ loadModelRegistry: vi.fn() }));
vi.mock("./platform/projectInterview", async (importOriginal) => {
  const original = await importOriginal<typeof import("./platform/projectInterview")>();
  return {
    ...original,
    loadInterview: vi.fn(),
    runInterviewTurn: vi.fn(),
    saveInterview: vi.fn(),
  };
});

const workspace = {
  path: "D:\\Games\\InterviewGame",
  projectId: "project-1",
  name: "Interview Game",
};

const registry = [{
  provider: "nebius_token_factory",
  modelId: "deepseek-ai/DeepSeek-V4.1-Flash",
  displayName: "DeepSeek V4.1 Flash",
  family: "DeepSeek V4.1",
  availability: "configured",
  enabled: true,
}];

const candidates = [
  {
    candidateId: "candidate-1",
    area: "overview" as const,
    title: "Project pitch",
    statement: "A tactical extraction game.",
    status: "DIRECTION" as const,
    provenance: "USER_STATED" as const,
  },
  {
    candidateId: "candidate-2",
    area: "roadmap" as const,
    title: "Target platform",
    statement: "The target platform is not decided.",
    status: "TBD" as const,
    provenance: "UNRESOLVED" as const,
  },
];

const turn = {
  nextSection: "game_vision" as const,
  nextQuestion: "What should make the game distinct?",
  candidates,
  model: registry[0].modelId,
  latencyMs: 40,
  inputTokens: 50,
  outputTokens: 60,
  totalTokens: 110,
};

const savedDocument = {
  formatVersion: 1,
  projectId: workspace.projectId,
  approvedAt: "2026-09-19T12:00:00.000Z",
  modelId: registry[0].modelId,
  candidates: [candidates[0]],
};

async function renderLanding() {
  const user = userEvent.setup();
  render(<InterviewPage workspace={workspace} />);
  await screen.findByRole("button", { name: "Start Interview" });
  return user;
}

async function startInterview() {
  const user = await renderLanding();
  await user.click(screen.getByRole("button", { name: "Start Interview" }));
  return user;
}

async function reachReview() {
  const user = await startInterview();
  await user.type(screen.getByLabelText("Your answer"), "A tactical extraction game.");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("What should make the game distinct?");
  await user.click(screen.getByRole("button", { name: "Generate Review" }));
  return user;
}

describe("Project Interview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadModelRegistry).mockResolvedValue(registry);
    vi.mocked(loadInterview).mockResolvedValue(null);
    vi.mocked(runInterviewTurn).mockResolvedValue(turn);
    vi.mocked(saveInterview).mockResolvedValue(savedDocument);
  });

  it("renders the Project Interview page with registry-backed model selection", async () => {
    await renderLanding();
    expect(screen.getByRole("heading", { name: "Project Interview" })).toBeInTheDocument();
    expect(screen.getByLabelText("Interview model")).toHaveValue(registry[0].modelId);
  });

  it("disables interview start when no registry model is available", async () => {
    vi.mocked(loadModelRegistry).mockResolvedValue([]);
    render(<InterviewPage workspace={workspace} />);
    expect(await screen.findByText("No configured models")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Interview" })).toBeDisabled();
  });

  it("starts with the bounded first section and question", async () => {
    await startInterview();
    expect(screen.getByText("Project Identity")).toBeInTheDocument();
    expect(screen.getByText("Section 1 of 11")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "In one or two sentences, what game are you building?" })).toBeInTheDocument();
  });

  it("allows a user answer and invokes the interview boundary only on Next", async () => {
    const user = await startInterview();
    const answer = screen.getByLabelText("Your answer");
    await user.type(answer, "A tactical extraction game.");
    expect(runInterviewTurn).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(runInterviewTurn).toHaveBeenCalledWith({
      projectId: workspace.projectId,
      modelId: registry[0].modelId,
      currentSection: "project_identity",
      currentQuestion: "In one or two sentences, what game are you building?",
      answer: "A tactical extraction game.",
      knownStatements: [],
    });
    expect(await screen.findByText("What should make the game distinct?")).toBeInTheDocument();
  });

  it("preserves the entered answer when the provider fails", async () => {
    vi.mocked(runInterviewTurn).mockRejectedValue({ code: "RATE_LIMITED", message: "Try again later." });
    const user = await startInterview();
    await user.type(screen.getByLabelText("Your answer"), "Preserve this answer.");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("RATE_LIMITED");
    expect(screen.getByLabelText("Your answer")).toHaveValue("Preserve this answer.");
  });

  it("preserves the answer and never retries automatically after OUTPUT_TRUNCATED", async () => {
    vi.mocked(runInterviewTurn).mockRejectedValue({
      code: "OUTPUT_TRUNCATED",
      message: "Nebius Token Factory reached the output-token limit before returning readable response text.",
    });
    const user = await startInterview();
    const answer = "It is a single-player turn-based tactical extraction game with raids and limited Action Points.";
    await user.type(screen.getByLabelText("Your answer"), answer);
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("OUTPUT_TRUNCATED");
    expect(screen.getByLabelText("Your answer")).toHaveValue(answer);
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(runInterviewTurn).toHaveBeenCalledOnce();
  });

  it("renders candidate review with visible provenance and status", async () => {
    await reachReview();
    expect(screen.getByRole("heading", { name: "Candidate Review" })).toBeInTheDocument();
    expect(screen.getByText("USER_STATED")).toBeInTheDocument();
    expect(screen.getByText("UNRESOLVED")).toBeInTheDocument();
    expect(screen.getAllByText("TBD").length).toBeGreaterThan(0);
  });

  it("allows candidate title, statement, and status edits", async () => {
    const user = await reachReview();
    const title = screen.getAllByLabelText("Title")[0];
    const statement = screen.getAllByLabelText("Statement")[0];
    await user.clear(title);
    await user.type(title, "Edited pitch");
    await user.clear(statement);
    await user.type(statement, "Edited durable statement.");
    await user.selectOptions(screen.getAllByLabelText("Proposed status")[0], "LOCKED");
    expect(title).toHaveValue("Edited pitch");
    expect(statement).toHaveValue("Edited durable statement.");
    expect(screen.getAllByLabelText("Proposed status")[0]).toHaveValue("LOCKED");
  });

  it("supports explicit approval and discard decisions", async () => {
    const user = await reachReview();
    await user.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Discard" })[1]);
    expect(screen.getByRole("button", { name: "Save Approved (1)" })).toBeEnabled();
    expect(screen.getAllByText("APPROVE")).toHaveLength(1);
    expect(screen.getAllByText("DISCARD")).toHaveLength(1);
  });

  it("saves reviewed decisions and renders only the native-approved result", async () => {
    const user = await reachReview();
    await user.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Discard" })[1]);
    await user.click(screen.getByRole("button", { name: "Save Approved (1)" }));

    expect(saveInterview).toHaveBeenCalledWith(
      workspace.path,
      workspace.projectId,
      registry[0].modelId,
      expect.arrayContaining([
        expect.objectContaining({ decision: "APPROVE" }),
        expect.objectContaining({ decision: "DISCARD" }),
      ]),
      false,
    );
    expect(
      await screen.findByRole("heading", { name: "Saved Interview Knowledge" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A tactical extraction game.")).toBeInTheDocument();
    expect(screen.queryByText("The target platform is not decided.")).not.toBeInTheDocument();
  });

  it("does not enable persistence until a candidate is approved", async () => {
    await reachReview();
    expect(screen.getByRole("button", { name: "Save Approved (0)" })).toBeDisabled();
    expect(saveInterview).not.toHaveBeenCalled();
  });

  it("keeps the review intact when persistence fails", async () => {
    vi.mocked(saveInterview).mockRejectedValue({
      code: "INTERVIEW_WRITE_FAILED",
      message: "ForgeMind could not save approved interview knowledge.",
    });
    const user = await reachReview();
    await user.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    await user.click(screen.getByRole("button", { name: "Save Approved (1)" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("INTERVIEW_WRITE_FAILED");
    expect(screen.getByRole("heading", { name: "Candidate Review" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("A tactical extraction game.")).toBeInTheDocument();
  });

  it("can cancel without saving candidate knowledge", async () => {
    const user = await reachReview();
    await user.click(screen.getByRole("button", { name: "Cancel without saving" }));
    expect(await screen.findByRole("button", { name: "Start Interview" })).toBeInTheDocument();
    expect(saveInterview).not.toHaveBeenCalled();
  });

  it("loads and reopens an existing persisted interview", async () => {
    vi.mocked(loadInterview).mockResolvedValue(savedDocument);
    const user = userEvent.setup();
    render(<InterviewPage workspace={workspace} />);
    await screen.findByText("Saved Interview Knowledge");
    await user.click(
      screen.getByRole("button", { name: "View Saved Interview Knowledge" }),
    );

    expect(
      screen.getByRole("heading", { name: "Saved Interview Knowledge" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A tactical extraction game.")).toBeInTheDocument();
    expect(screen.queryByText("The target platform is not decided.")).not.toBeInTheDocument();
  });

  it("requires explicit confirmation before a replacement interview", async () => {
    vi.mocked(loadInterview).mockResolvedValue(savedDocument);
    const user = userEvent.setup();
    render(<InterviewPage workspace={workspace} />);
    await screen.findByText("Saved Interview Knowledge");
    await user.click(screen.getByRole("button", { name: "Start replacement interview" }));
    expect(screen.getByRole("heading", { name: "Replace saved interview knowledge?" })).toBeInTheDocument();
    expect(runInterviewTurn).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm replacement interview" }));
    expect(screen.getByRole("heading", { name: "In one or two sentences, what game are you building?" })).toBeInTheDocument();
  });

  it("shows invalid existing interview errors without offering automatic overwrite", async () => {
    vi.mocked(loadInterview).mockRejectedValue({
      code: "INVALID_INTERVIEW_FILE",
      message: "The existing ForgeMind interview file is invalid and was not changed.",
    });
    render(<InterviewPage workspace={workspace} />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("INVALID_INTERVIEW_FILE");
    expect(screen.getByRole("button", { name: "Start Interview" })).toBeDisabled();
  });

  it("keeps provenance read-only during review", async () => {
    await reachReview();
    const review = screen.getByRole("heading", { name: "Candidate Review" }).closest("section");
    expect(within(review as HTMLElement).queryByLabelText("Provenance")).not.toBeInTheDocument();
    expect(screen.getByText("USER_STATED")).toBeVisible();
  });
});
