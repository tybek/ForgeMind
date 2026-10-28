import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyProjectFoundation,
  NewProjectCreator,
} from "./NewProjectCreator";
import type { ProjectFoundationInput } from "./platform/workspaceDirectory";
import {
  loadCreatorAiPreflight,
  suggestNewProjectCoreLoops,
  suggestNewProjectDesignPillars,
} from "./platform/creatorAi";

vi.mock("./platform/creatorAi", () => ({
  loadCreatorAiPreflight: vi.fn(),
  suggestNewProjectCoreLoops: vi.fn(),
  suggestNewProjectDesignPillars: vi.fn(),
}));

const defaultModelId = "nvidia/nemotron-3-super-120b-a12b";
const registryModels = [
  { provider: "nebius_token_factory", modelId: "deepseek-ai/DeepSeek-V4.1-Flash", displayName: "DeepSeek V4.1 Flash", family: "DeepSeek V4.1", availability: "configured", capabilities: { supportsReasoningEffort: true }, enabled: true },
  { provider: "nebius_token_factory", modelId: defaultModelId, displayName: "NVIDIA Nemotron 3 Super 120B", family: "Nemotron 3 Super", availability: "configured", capabilities: { structuredOutput: "JSON_OBJECT" as const }, enabled: true },
];

function preflight(task: "coreLoop" | "designPillars", modelId = defaultModelId) {
  return {
    task,
    taskLabel: task === "coreLoop" ? "Core Loop suggestions" : "Design Pillar suggestions",
    provider: "nebius_token_factory",
    modelId,
    defaultModelId,
    models: registryModels,
    contextFields: ["Identity", "Pitch", "Player Experience"],
    estimatedInputTokens: { minimum: 350, maximum: 450 },
    usageBand: "low" as const,
    historyAvailable: true,
  };
}

const coreLoopResult = {
  provider: "nebius_token_factory",
  model: "nvidia/nemotron-3-super-120b-a12b",
  latencyMs: 42,
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
  note: "Choose the emphasis that fits.",
  proposals: [
    { title: "Route and deliver", description: "Plan a route, cross hazards, deliver the message, and recover.", rationale: "Makes preparation meaningful.", assumptions: ["Introduces route hazards as a proposed direction."] },
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

async function confirmAiRequest(user: ReturnType<typeof userEvent.setup>, action: "Suggest Core Loops" | "Suggest Pillars" | "Regenerate") {
  await user.click(screen.getByRole("button", { name: action }));
  const dialog = await screen.findByRole("dialog", { name: /suggestions/i });
  await user.click(within(dialog).getByRole("button", { name: "Run AI" }));
}

describe("New Project Creator", () => {
  beforeEach(() => {
    vi.mocked(loadCreatorAiPreflight).mockReset().mockImplementation((task, _context, modelId) => Promise.resolve(preflight(task, modelId)));
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

  it("keeps every Identity value in a single-line control across navigation", async () => {
    const user = userEvent.setup();
    renderCreator();
    const identity = {
      "Working title": "Ashfall Courier",
      "Genre / subgenre": "Tactical extraction",
      Mode: "Single-player",
      Perspective: "Isometric",
      "Target platform": "PC",
    };

    for (const [label, value] of Object.entries(identity)) {
      const control = screen.getByLabelText(label);
      expect(control.tagName).toBe("INPUT");
      await user.type(control, value);
    }
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    for (const [label, value] of Object.entries(identity)) {
      expect(screen.getByLabelText(label)).toHaveValue(value);
    }
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

    expect(suggestNewProjectCoreLoops).not.toHaveBeenCalled();
    const preflightDialog = await screen.findByRole("dialog", { name: "Core Loop suggestions" });
    expect(preflightDialog).toHaveTextContent("LOW");
    expect(preflightDialog).toHaveTextContent("~350–450 tokens");
    expect(preflightDialog).toHaveTextContent("Exact estimate unavailable");
    await user.click(within(preflightDialog).getByRole("button", { name: "Run AI" }));

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
    }, defaultModelId);
    expect(await screen.findByText("Route and deliver")).toBeInTheDocument();
    expect(screen.getByLabelText("Creator AI usage")).toHaveTextContent("Nebius Token Factory");
    expect(screen.getByLabelText("Creator AI usage")).toHaveTextContent("150");
    expect(screen.getByText("Introduces route hazards as a proposed direction.")).toBeInTheDocument();
    expect(screen.queryByText(/No assumptions/i)).not.toBeInTheDocument();
  });

  it("cancels preflight without a request and blocks capability-NONE models", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));
    let dialog = await screen.findByRole("dialog", { name: "Core Loop suggestions" });
    expect(within(dialog).getByRole("option", { name: /NVIDIA Nemotron 3 Super 120B.*default/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: /DeepSeek V4.1 Flash.*incompatible/ })).toBeDisabled();
    expect(dialog).toHaveTextContent("Not enough local history");
    expect(dialog).not.toHaveTextContent("Estimated provider cost: $");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(suggestNewProjectCoreLoops).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));
    dialog = await screen.findByRole("dialog", { name: "Core Loop suggestions" });
    expect(within(dialog).getByLabelText(/Model/)).toHaveValue(defaultModelId);
    expect(within(dialog).getByRole("option", { name: /DeepSeek V4.1 Flash.*incompatible/ })).toBeDisabled();
    expect(suggestNewProjectCoreLoops).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Run AI" }));
    expect(suggestNewProjectCoreLoops).toHaveBeenCalledWith(expect.any(Object), defaultModelId);
  });

  it("labels one latency observation differently from a recent local range", async () => {
    vi.mocked(loadCreatorAiPreflight)
      .mockResolvedValueOnce({ ...preflight("coreLoop"), historicalLatency: { observationCount: 1, lastMs: 2_037, minimumMs: 2_037, maximumMs: 2_037 } })
      .mockResolvedValueOnce({ ...preflight("coreLoop"), historicalLatency: { observationCount: 2, lastMs: 2_037, minimumMs: 2_037, maximumMs: 2_500 } });
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));
    let dialog = await screen.findByRole("dialog", { name: "Core Loop suggestions" });
    expect(dialog).toHaveTextContent("Last observed: ~2.0 s");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Suggest Core Loops" }));
    dialog = await screen.findByRole("dialog", { name: "Core Loop suggestions" });
    expect(dialog).toHaveTextContent("Recent: ~2.0–2.5 s");
    expect(suggestNewProjectCoreLoops).not.toHaveBeenCalled();
  });

  it("keeps discarded proposals in bounded session history and restores without applying", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await confirmAiRequest(user, "Suggest Core Loops");
    await screen.findByText("Route and deliver");
    await user.click(screen.getByRole("button", { name: "Discard proposals" }));
    expect(screen.queryByText("Route and deliver")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Core loop/)).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "AI History" }));
    const history = screen.getByRole("dialog", { name: "Creator AI History" });
    expect(history).toHaveTextContent("PASS · discarded");
    expect(within(history).getByText("Route and deliver")).toBeInTheDocument();
    await user.click(within(history).getByRole("button", { name: "Restore as current proposal" }));
    expect(await screen.findByText("Route and deliver")).toBeInTheDocument();
    expect(screen.getByLabelText(/Core loop/)).toHaveValue("");
  });

  it("does not carry proposal assumptions into initialized Creator truth", async () => {
    const user = userEvent.setup();
    const { onChooseDirectory } = renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await confirmAiRequest(user, "Suggest Core Loops");
    await user.click((await screen.findAllByRole("button", { name: "Use this" }))[0]);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByText("Introduces route hazards as a proposed direction.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create Project" }));
    expect(onChooseDirectory).toHaveBeenCalledWith(expect.not.objectContaining({ assumptions: expect.anything() }));
  });

  it("requires explicit confirmation before replacing a manual Core Loop and keeps accepted content editable", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const coreLoop = screen.getByLabelText(/Core loop/);
    await user.type(coreLoop, "Scout a safe path and deliver by hand.");
    await confirmAiRequest(user, "Suggest Core Loops");
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
    await confirmAiRequest(user, "Suggest Core Loops");
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
    await confirmAiRequest(user, "Regenerate");
    expect(await screen.findByText("Survey and commit")).toBeInTheDocument();
    expect(accepted).toHaveValue(coreLoopResult.proposals[0].description);
    await user.click(screen.getByRole("button", { name: "Discard proposals" }));
    expect(screen.queryByText("Survey and commit")).not.toBeInTheDocument();
    expect(accepted).toHaveValue(coreLoopResult.proposals[0].description);
    expect(suggestNewProjectCoreLoops).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "AI History" }));
    const history = screen.getByRole("dialog", { name: "Creator AI History" });
    expect(history).toHaveTextContent("discarded");
    expect(history).toHaveTextContent("regenerated");
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
    const dialog = await screen.findByRole("dialog", { name: "Core Loop suggestions" });
    await user.click(within(dialog).getByRole("button", { name: "Run AI" }));
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
    await confirmAiRequest(user, "Suggest Core Loops");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("AI setup required");
    expect(alert).toHaveTextContent("NEBIUS_API_KEY");
    expect(screen.getByLabelText(/Core loop/)).toHaveValue("Plan, travel, deliver.");
  });

  it("rejects invalid AI output without changing the draft and records only safe failure history", async () => {
    vi.mocked(suggestNewProjectCoreLoops).mockRejectedValue({
      code: "INVALID_CREATOR_AI_OUTPUT",
      message: "The AI response did not match the required proposal structure.",
    });
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(screen.getByLabelText(/Core loop/), "Plan, travel, deliver.");
    await confirmAiRequest(user, "Suggest Core Loops");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("ForgeMind couldn't validate this AI response. Your draft was not changed.");
    expect(alert).toHaveTextContent("INVALID_CREATOR_AI_OUTPUT");
    expect(alert).not.toHaveTextContent("did not match the required proposal structure");
    expect(screen.getByLabelText(/Core loop/)).toHaveValue("Plan, travel, deliver.");
    expect(suggestNewProjectCoreLoops).toHaveBeenCalledTimes(1);
    await user.type(screen.getByLabelText(/Core loop/), " Continue manually.");
    expect(screen.getByLabelText(/Core loop/)).toHaveValue("Plan, travel, deliver. Continue manually.");

    await user.click(screen.getByRole("button", { name: "AI History" }));
    const history = screen.getByRole("dialog", { name: "Creator AI History" });
    expect(history).toHaveTextContent("FAILED");
    expect(history).toHaveTextContent("No proposal payload was stored");
    expect(within(history).queryByRole("button", { name: "Restore as current proposal" })).not.toBeInTheDocument();
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

    await confirmAiRequest(user, "Suggest Pillars");
    expect(await screen.findByText("Preparation beats repetition")).toBeInTheDocument();
    const proposal = screen.getByText("Preparation beats repetition").closest("article")!;
    await user.click(within(proposal).getByRole("button", { name: "Accept pillar" }));
    expect(screen.getByLabelText("Pillar 2 title")).toHaveValue("Preparation beats repetition");
    await user.click(screen.getByRole("button", { name: "Apply All" }));

    expect(screen.getByLabelText("Pillar 1 title")).toHaveValue("Meaningful routes");
    expect(screen.getByLabelText(/Pillar 1 explanation/)).toHaveValue("Manual explanation stays.");
    expect(screen.getAllByDisplayValue("Meaningful routes")).toHaveLength(1);
    expect(screen.getByDisplayValue("Hope under pressure")).toBeInTheDocument();
    expect(screen.getAllByText(/AI-assisted · accepted · editable/).length).toBeGreaterThan(0);
    await confirmAiRequest(user, "Regenerate");
    expect(await screen.findByText("Preparation beats repetition")).toBeInTheDocument();
    expect(screen.getByLabelText("Pillar 1 title")).toHaveValue("Meaningful routes");
    expect(screen.getByLabelText("Pillar 2 title")).toHaveValue("Preparation beats repetition");
    await user.click(screen.getByRole("button", { name: "Discard proposals" }));
    expect(screen.queryByText("Accept pillar")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pillar 2 title")).toHaveValue("Preparation beats repetition");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/12-month scope, limited art budget/)).toBeInTheDocument();
  });

  it("keeps only the ten most recent Creator AI runs in session history", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await confirmAiRequest(user, "Suggest Core Loops");
    await waitFor(() => expect(screen.getByRole("button", { name: "Regenerate" })).toBeEnabled());
    for (let index = 0; index < 10; index += 1) {
      await confirmAiRequest(user, "Regenerate");
      await waitFor(() => expect(screen.getByRole("button", { name: "Regenerate" })).toBeEnabled());
    }
    await user.click(screen.getByRole("button", { name: "AI History" }));
    const history = screen.getByRole("dialog", { name: "Creator AI History" });
    expect(history.querySelectorAll(".creator-ai-history-entry")).toHaveLength(10);
    expect(suggestNewProjectCoreLoops).toHaveBeenCalledTimes(11);
  });

  it("adds persistent World guidance and keeps concise constraints in compact controls", async () => {
    const user = userEvent.setup();
    renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/abandoned orbital station/)).toBeInTheDocument();
    expect(screen.getByText(/Games, films, books, art/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Setting \/ world/), "Flooded industrial city");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByLabelText(/Engine/).tagName).toBe("INPUT");
    expect(screen.getByLabelText(/Team size/).tagName).toBe("INPUT");
    expect(screen.getByLabelText(/Expected scope/).tagName).toBe("INPUT");
    expect(screen.getByLabelText(/Major constraints/).tagName).toBe("TEXTAREA");
    await user.type(screen.getByLabelText(/Engine/), "Unity");
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText(/Engine/)).toHaveValue("Unity");
  });

  it("keeps unaccepted AI output transient and carries accepted provenance to Review and initialization", async () => {
    const user = userEvent.setup();
    const { onChooseDirectory } = renderCreator();
    await completeRequiredFoundation(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await confirmAiRequest(user, "Suggest Core Loops");
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
