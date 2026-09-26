import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyProjectFoundation,
  NewProjectCreator,
} from "./NewProjectCreator";
import type { ProjectFoundationInput } from "./platform/workspaceDirectory";
import {
  suggestNewProjectCoreLoops,
  suggestNewProjectDesignPillars,
} from "./platform/creatorAi";

vi.mock("./platform/creatorAi", () => ({
  suggestNewProjectCoreLoops: vi.fn(),
  suggestNewProjectDesignPillars: vi.fn(),
}));

const coreLoopResult = {
  provider: "nebius_token_factory",
  model: "nvidia/nemotron-3-super-120b-a12b",
  latencyMs: 42,
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  note: "Choose the emphasis that fits.",
  proposals: [
    { title: "Route and deliver", description: "Plan a route, cross hazards, deliver the message, and recover.", rationale: "Makes preparation meaningful." },
    { title: "Listen and adapt", description: "Gather local needs, choose a delivery, navigate change, and earn trust." },
  ],
};

const pillarResult = {
  provider: "nebius_token_factory",
  model: "nvidia/nemotron-3-super-120b-a12b",
  latencyMs: 55,
  inputTokens: 120,
  outputTokens: 60,
  totalTokens: 180,
  proposals: [
    { title: "Meaningful routes", description: "Every route changes risk and relationships." },
    { title: "Preparation beats repetition", description: "Knowledge and planning matter more than grinding." },
    { title: "Hope under pressure", description: "Tension should make successful deliveries feel humane." },
  ],
};

function renderCreator(overrides?: Partial<ComponentProps<typeof NewProjectCreator>>) {
  const onChooseDirectory = vi.fn().mockResolvedValue(undefined);
  const onInitialize = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  function Harness() {
    const [draft, setDraft] = useState<ProjectFoundationInput>({ ...emptyProjectFoundation, pillars: [] });
    return (
      <NewProjectCreator
        draft={draft}
        onChange={setDraft}
        onChooseDirectory={onChooseDirectory}
        selectedDirectory={null}
        onInitialize={onInitialize}
        isInitializing={false}
        creationError={null}
        onClearDirectory={() => undefined}
        onCancel={onCancel}
        {...overrides}
      />
    );
  }

  render(<Harness />);
  return { onChooseDirectory, onInitialize, onCancel };
}

async function completeRequiredFoundation(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Working title"), "Ashfall Courier");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.type(screen.getByLabelText("Game pitch"), "Carry fragile messages through a changing volcanic frontier.");
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function continueToReview(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 5; step += 1) {
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }
}

describe("New Project Creator", () => {
  beforeEach(() => {
    vi.mocked(suggestNewProjectCoreLoops).mockReset().mockResolvedValue(coreLoopResult);
    vi.mocked(suggestNewProjectDesignPillars).mockReset().mockResolvedValue(pillarResult);
  });

  it("keeps validation minimal and preserves entered state across Back and Continue", async () => {
    const user = userEvent.setup();
    renderCreator();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("working title");
    expect(screen.getByText("Step 1 of 8", { exact: false })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Working title"), "Ashfall Courier");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText("Game pitch"), "Too short");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("short sentence");

    await user.type(screen.getByLabelText("Game pitch"), " but meaningful now");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Game pitch")).toHaveValue("Too short but meaningful now");
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Working title")).toHaveValue("Ashfall Courier");
  });

  it("allows optional sections to remain empty and reviews only deterministic gaps", async () => {
    const user = userEvent.setup();
    const { onChooseDirectory, onInitialize } = renderCreator();
    await completeRequiredFoundation(user);
    await continueToReview(user);

    expect(screen.getByRole("heading", { name: "Your Game Foundation" })).toBeInTheDocument();
    expect(screen.getByText("Ashfall Courier")).toBeInTheDocument();
    expect(screen.getByText("Carry fragile messages through a changing volcanic frontier.")).toBeInTheDocument();
    expect(screen.getByText("What will players do again and again?")).toBeInTheDocument();
    expect(screen.getAllByText("Not defined yet.").length).toBeGreaterThan(0);
    expect(onChooseDirectory).not.toHaveBeenCalled();
    expect(onInitialize).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Create Project" }));
    expect(onChooseDirectory).toHaveBeenCalledWith(expect.objectContaining({
      workingTitle: "Ashfall Courier",
      openQuestions: expect.arrayContaining(["What will players do again and again?"]),
    }));
  });

  it("adds, edits, removes, and accurately reviews design pillars", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Add design pillar" }));
    expect(screen.getByText(/principles that should guide design decisions/i)).toBeInTheDocument();
    expect(screen.getByText(/Every fight should reward positioning/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Pillar 1 title"), "Meaningful routes");
    await user.type(screen.getByLabelText(/Pillar 1 explanation/), "Every path changes the risk and story.");
    await user.click(screen.getByRole("button", { name: "Add design pillar" }));
    await user.type(screen.getByLabelText("Pillar 2 title"), "Temporary pillar");
    await user.click(screen.getByRole("button", { name: "Remove pillar 2" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const pillarSection = screen.getByRole("heading", { name: "Design Pillars" }).closest("article")!;
    expect(within(pillarSection).getByText("Meaningful routes")).toBeInTheDocument();
    expect(pillarSection).toHaveTextContent("Every path changes the risk and story.");
    expect(screen.queryByText("Temporary pillar")).not.toBeInTheDocument();
  });

  it("edits an earlier section from Review and protects a substantial draft on cancel", async () => {
    const user = userEvent.setup();
    const { onCancel, onChooseDirectory } = renderCreator();
    await completeRequiredFoundation(user);
    await continueToReview(user);

    await user.click(screen.getByRole("button", { name: "Edit Core Loop" }));
    expect(screen.getByRole("heading", { name: "What will players do again and again?" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Core loop/), "Plan a route, cross the frontier, and deliver a message.");
    await user.click(screen.getByRole("button", { name: "Return to Review" }));
    expect(screen.getByText("Plan a route, cross the frontier, and deliver a message.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Return Home" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard this foundation draft?");
    expect(onCancel).not.toHaveBeenCalled();
    expect(onChooseDirectory).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Continue editing" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Return Home" }));
    await user.click(screen.getByRole("button", { name: "Discard and return Home" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("never calls AI on step entry and sends only bounded Creator context after an explicit Core Loop action", async () => {
    const user = userEvent.setup();
    renderCreator();
    expect(suggestNewProjectCoreLoops).not.toHaveBeenCalled();
    await completeRequiredFoundation(user);
    await user.type(screen.getByLabelText(/Player experience/), "Feel responsible for fragile promises.");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(suggestNewProjectCoreLoops).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));

    expect(suggestNewProjectCoreLoops).toHaveBeenCalledTimes(1);
    expect(suggestNewProjectCoreLoops).toHaveBeenCalledWith({
      workingTitle: "Ashfall Courier",
      genre: "",
      mode: "",
      perspective: "",
      targetPlatform: "",
      pitch: "Carry fragile messages through a changing volcanic frontier.",
      playerExperience: "Feel responsible for fragile promises.",
      currentCoreLoop: "",
      setting: "",
      tone: "",
      engine: "",
      teamSize: "",
      expectedScope: "",
      majorConstraints: "",
    });
    expect(await screen.findByText("Route and deliver")).toBeInTheDocument();
    expect(screen.getByLabelText("Creator AI usage")).toHaveTextContent("Nebius Token Factory");
    expect(screen.getByLabelText("Creator AI usage")).toHaveTextContent("150");
  });

  it("requires explicit confirmation before replacing a manual Core Loop and keeps accepted content editable", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const coreLoop = screen.getByLabelText(/Core loop/);
    await user.type(coreLoop, "Scout a safe path and deliver by hand.");
    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));
    await user.click((await screen.findAllByRole("button", { name: "Use this" }))[0]);

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Replace the current Core Loop?");
    expect(coreLoop).toHaveValue("Scout a safe path and deliver by hand.");
    await user.click(screen.getByRole("button", { name: "Replace with proposal" }));
    expect(coreLoop).toHaveValue(coreLoopResult.proposals[0].description);
    expect(screen.getByText(/AI-assisted · accepted into draft · editable/)).toBeInTheDocument();
    await user.type(coreLoop, " Then regroup.");
    expect(coreLoop).toHaveValue(`${coreLoopResult.proposals[0].description} Then regroup.`);
  });

  it("regenerates without overwriting accepted Core Loop content and discards transient proposals without draft changes", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));
    await user.click((await screen.findAllByRole("button", { name: "Use this" }))[0]);
    const accepted = screen.getByLabelText(/Core loop/);
    expect(accepted).toHaveValue(coreLoopResult.proposals[0].description);

    vi.mocked(suggestNewProjectCoreLoops).mockResolvedValueOnce({
      ...coreLoopResult,
      proposals: [
        { title: "Survey and commit", description: "Survey the frontier, commit to a route, deliver, and learn." },
        { title: "Promise and return", description: "Accept a promise, prepare, travel, deliver, and report back." },
      ],
    });
    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText("Survey and commit")).toBeInTheDocument();
    expect(accepted).toHaveValue(coreLoopResult.proposals[0].description);
    await user.click(screen.getByRole("button", { name: "Discard proposals" }));
    expect(screen.queryByText("Survey and commit")).not.toBeInTheDocument();
    expect(accepted).toHaveValue(coreLoopResult.proposals[0].description);
    expect(suggestNewProjectCoreLoops).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate Core Loop requests while one is running", async () => {
    let resolveRequest!: (value: typeof coreLoopResult) => void;
    vi.mocked(suggestNewProjectCoreLoops).mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const action = screen.getByRole("button", { name: "Suggest Core Loops" });
    await user.click(action);
    expect(action).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Requesting proposals");
    expect(suggestNewProjectCoreLoops).toHaveBeenCalledTimes(1);
    resolveRequest(coreLoopResult);
    expect(await screen.findByText("Route and deliver")).toBeInTheDocument();
  });

  it("preserves manual state and shows credential guidance when AI is unavailable", async () => {
    vi.mocked(suggestNewProjectCoreLoops).mockRejectedValue({ code: "MISSING_API_KEY", message: "Missing." });
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText(/Core loop/), "Plan, travel, deliver.");
    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("AI setup required");
    expect(alert).toHaveTextContent("NEBIUS_API_KEY");
    expect(screen.getByLabelText(/Core loop/)).toHaveValue("Plan, travel, deliver.");
  });

  it("accepts individual and all proposed pillars without replacing manual pillars or adding an obvious duplicate", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Add design pillar" }));
    await user.type(screen.getByLabelText("Pillar 1 title"), "Meaningful routes");
    await user.type(screen.getByLabelText(/Pillar 1 explanation/), "Manual explanation stays.");

    await user.click(screen.getByRole("button", { name: "Suggest Pillars" }));
    expect(await screen.findByText("Preparation beats repetition")).toBeInTheDocument();
    const proposal = screen.getByText("Preparation beats repetition").closest("article")!;
    await user.click(within(proposal).getByRole("button", { name: "Accept pillar" }));
    expect(screen.getByLabelText("Pillar 2 title")).toHaveValue("Preparation beats repetition");
    await user.click(screen.getByRole("button", { name: "Apply All" }));

    expect(screen.getByLabelText("Pillar 1 title")).toHaveValue("Meaningful routes");
    expect(screen.getByLabelText(/Pillar 1 explanation/)).toHaveValue("Manual explanation stays.");
    expect(screen.getAllByDisplayValue("Meaningful routes")).toHaveLength(1);
    expect(screen.getByDisplayValue("Hope under pressure")).toBeInTheDocument();
    expect(screen.getAllByText(/AI-assisted · accepted into draft · editable/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText("Preparation beats repetition")).toBeInTheDocument();
    expect(screen.getByLabelText("Pillar 1 title")).toHaveValue("Meaningful routes");
    expect(screen.getByLabelText("Pillar 2 title")).toHaveValue("Preparation beats repetition");
    await user.click(screen.getByRole("button", { name: "Discard proposals" }));
    expect(screen.queryByText("Accept pillar")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pillar 2 title")).toHaveValue("Preparation beats repetition");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Hard limits the design should work within/)).toBeInTheDocument();
  });

  it("keeps unaccepted AI output transient and carries accepted provenance to Review and initialization", async () => {
    const user = userEvent.setup();
    const { onChooseDirectory } = renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));
    await user.click((await screen.findAllByRole("button", { name: "Use this" }))[0]);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const coreSection = screen.getByRole("heading", { name: "Core Loop" }).closest("article")!;
    expect(coreSection).toHaveTextContent("AI-assisted · explicitly accepted");
    await user.click(screen.getByRole("button", { name: "Create Project" }));
    expect(onChooseDirectory).toHaveBeenCalledWith(expect.objectContaining({
      coreLoop: coreLoopResult.proposals[0].description,
      coreLoopOrigin: "AI_ACCEPTED",
    }));
  });
});
