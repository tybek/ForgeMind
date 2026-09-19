import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistPage } from "./SpecialistPage";
import { loadDecisions } from "./platform/decisions";
import { loadModelRegistry } from "./platform/modelRegistry";
import { loadCompendium } from "./platform/projectKnowledge";
import {
  archiveAndResetSpecialistHistory,
  loadSpecialistProfiles,
  loadSpecialistRuns,
  runSpecialistAnalysis,
  type SpecialistProfile,
  type SpecialistRun,
} from "./platform/specialists";

vi.mock("./platform/modelRegistry", () => ({ loadModelRegistry: vi.fn() }));
vi.mock("./platform/projectKnowledge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectKnowledge")>()), loadCompendium: vi.fn(),
}));
vi.mock("./platform/decisions", () => ({ loadDecisions: vi.fn() }));
vi.mock("./platform/specialists", () => ({
  archiveAndResetSpecialistHistory: vi.fn(), loadSpecialistProfiles: vi.fn(), loadSpecialistRuns: vi.fn(), runSpecialistAnalysis: vi.fn(),
}));

const workspace = { path: "D:\\Games\\Sample", projectId: "550e8400-e29b-41d4-a716-446655440000" };
const profile: SpecialistProfile = {
  id: "ai_behavior_designer",
  displayName: "AI Behavior Designer",
  description: "Analyze tactical behavior.",
  supportedTaskTypes: ["DESIGN_BEHAVIOR", "REVIEW_BEHAVIOR", "COMPETENCE_TIERS", "REACTION_MODEL", "EXPLOIT_ANALYSIS", "BEHAVIOR_CONTRACT"],
  defaultTaskType: "DESIGN_BEHAVIOR",
  maxRunCompletionTokens: 8192,
  taskGuidance: [
    { taskType: "DESIGN_BEHAVIOR", preferredCompletionTokens: 3200, recommendedCompendiumAreas: ["game_vision", "systems"], preferredDecisionAreas: ["systems"] },
    { taskType: "REACTION_MODEL", preferredCompletionTokens: 4600, recommendedCompendiumAreas: ["player_experience"], preferredDecisionAreas: ["player_experience"] },
    { taskType: "EXPLOIT_ANALYSIS", preferredCompletionTokens: 3800, recommendedCompendiumAreas: ["constraints"], preferredDecisionAreas: ["constraints"] },
  ],
};
const model = {
  provider: "nebius_token_factory", modelId: "test/model", displayName: "Registry Test Model", family: "test",
  availability: "configured", enabled: true, capabilities: {}, pricing: { inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2 },
};
const knowledge = {
  id: "knowledge-1", area: "systems" as const, title: "Imperfect information", statement: "Enemies know only perceived facts.",
  status: "LOCKED" as const, provenance: "MANUAL" as const, source: "manual_entry" as const,
  createdAt: "2026-09-19T10:00:00Z", updatedAt: "2026-09-19T10:00:00Z",
};
const playerExperienceKnowledge = { ...knowledge, id: "knowledge-2", area: "player_experience" as const, title: "Readable reactions", statement: "Reactions should be legible." };
const technicalKnowledge = { ...knowledge, id: "knowledge-3", area: "technical" as const, title: "Fixed update", statement: "Behavior updates use a fixed cadence." };
const approved = {
  id: "decision-1", title: "No omniscience", statement: "Sound does not reveal exact identity.", rationale: "Fairness.",
  status: "APPROVED" as const, area: "systems" as const, author: "Local User", createdAt: "2026-09-19T10:00:00Z",
  approvedAt: "2026-09-19T10:01:00Z", relatedKnowledgeEntryIds: [],
};
const proposed = { ...approved, id: "decision-2", title: "Proposed idea", status: "PROPOSED" as const, approvedAt: null };
const analysis = {
  profileId: profile.id, taskType: "REACTION_MODEL" as const, selectedKnowledgeEntryIds: [knowledge.id], selectedDecisionIds: [approved.id],
  result: {
    summary: "The guard should investigate under uncertainty.", assumptions: ["The sound is audible."], recommendations: ["Orient before moving."],
    risks: ["Immediate pursuit appears omniscient."], exploits: ["Repeated sounds may pin the guard."], openQuestions: ["How long is memory retained?"],
    suggestedTests: ["Verify sound alone does not acquire a target."],
  },
  model: model.modelId, latencyMs: 42, inputTokens: 100, outputTokens: 50, totalTokens: 150,
  preferredTaskBudget: 4600, effectiveCompletionBudget: 4600,
};
const successfulRun: SpecialistRun = {
  id: "run-success", createdAt: "2026-09-19T12:00:00Z", specialistProfileId: profile.id, taskType: "REACTION_MODEL",
  modelId: model.modelId, selectedKnowledgeEntryIds: [knowledge.id], selectedDecisionIds: [approved.id], scenario: "A guard hears one gunshot.",
  status: "SUCCEEDED", result: analysis.result, usage: { latencyMs: 19517, inputTokens: 746, outputTokens: 2159, totalTokens: 2905 },
  preferredTaskBudget: 4600, effectiveCompletionBudget: 4600,
};
const failedRun: SpecialistRun = {
  id: "run-failure", createdAt: "2026-09-19T12:05:00Z", specialistProfileId: profile.id, taskType: "REACTION_MODEL",
  modelId: model.modelId, selectedKnowledgeEntryIds: [], selectedDecisionIds: [], scenario: "A second scenario.", status: "FAILED",
  safeError: { code: "OUTPUT_TRUNCATED", diagnostics: { finishReason: "length", readableTextPresent: true, jsonExtractionSucceeded: false } },
  usage: { latencyMs: 17000, inputTokens: 700, outputTokens: 3400, totalTokens: 4100 },
  preferredTaskBudget: 4600, effectiveCompletionBudget: 4600,
};

async function renderPage() {
  const user = userEvent.setup();
  render(<SpecialistPage workspace={workspace} />);
  await screen.findByRole("heading", { name: "AI Behavior Designer" });
  return user;
}

async function fillAndRun(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("Task Type"), "REACTION_MODEL");
  await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "A guard hears one gunshot.");
  await user.click(screen.getByRole("button", { name: "Run Analysis" }));
}

describe("AI Behavior Designer production workbench", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadSpecialistProfiles).mockResolvedValue([profile]);
    vi.mocked(loadModelRegistry).mockResolvedValue([model]);
    vi.mocked(loadCompendium).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T10:00:00Z", entries: [knowledge, playerExperienceKnowledge, technicalKnowledge] });
    vi.mocked(loadDecisions).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T10:00:00Z", decisions: [approved, proposed] });
    vi.mocked(loadSpecialistRuns).mockResolvedValue(null);
    vi.mocked(archiveAndResetSpecialistHistory).mockResolvedValue({
      document: { formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T13:00:00Z", runs: [] },
      archivedFileName: "specialist-runs.invalid-20260919T130000000Z-test.json",
    });
    vi.mocked(runSpecialistAnalysis).mockResolvedValue(analysis);
  });

  it("renders the registered specialist profile", async () => { await renderPage(); expect(screen.getByText(profile.description)).toBeInTheDocument(); });
  it("renders configuration and output panes together", async () => { await renderPage(); expect(screen.getByLabelText("Specialist output and history")).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Analysis workspace" })).toBeInTheDocument(); });
  it("keeps an approximately 40/60 workbench structure available for responsive stacking", async () => { const { container } = render(<SpecialistPage workspace={workspace} />); await screen.findByRole("heading", { name: "AI Behavior Designer" }); const config = container.querySelector<HTMLElement>(".specialist-config-pane"); const output = container.querySelector<HTMLElement>(".specialist-output-pane"); expect(container.querySelector(".specialist-workbench")).toContainElement(config); expect(container.querySelector(".specialist-workbench")).toContainElement(output); expect(config).toHaveAttribute("data-layout-share", "40"); expect(output).toHaveAttribute("data-layout-share", "60"); });
  it("allows every supported task type to be selected", async () => { const user = await renderPage(); await user.selectOptions(screen.getByLabelText("Task Type"), "BEHAVIOR_CONTRACT"); expect(screen.getByLabelText("Task Type")).toHaveValue("BEHAVIOR_CONTRACT"); });
  it("uses enabled models from the registry", async () => { await renderPage(); expect(screen.getByLabelText("Model")).toHaveValue(model.modelId); expect(screen.getByRole("option", { name: model.displayName })).toBeInTheDocument(); });
  it("keeps Advanced Run Settings collapsed by default", async () => { await renderPage(); expect(screen.getByText("Advanced Run Settings").closest("details")).not.toHaveAttribute("open"); });
  it("shows the effective budget and unknown model limit when advanced settings are expanded", async () => { const user = await renderPage(); await user.click(screen.getByText("Advanced Run Settings")); expect(screen.getByText(/Preferred for DESIGN_BEHAVIOR: 3200/)).toHaveTextContent("Model limit: Unknown"); expect(screen.getByText(/Preferred for DESIGN_BEHAVIOR: 3200/)).toHaveTextContent("Effective for this run: 3200"); });
  it("shows a known model limit and clamps a larger task preference", async () => { vi.mocked(loadModelRegistry).mockResolvedValue([{ ...model, capabilities: { maxCompletionTokens: 4096 } }]); const user = await renderPage(); await user.selectOptions(screen.getByLabelText("Task Type"), "REACTION_MODEL"); await user.click(screen.getByText("Advanced Run Settings")); expect(screen.getByText(/Preferred for REACTION_MODEL: 4600/)).toHaveTextContent("Model limit: 4096"); expect(screen.getByLabelText("Max completion tokens")).toHaveValue(4096); });
  it("sends a safe user-selected one-run budget", async () => { const user = await renderPage(); await user.click(screen.getByText("Advanced Run Settings")); const budget = screen.getByLabelText("Max completion tokens"); await user.clear(budget); await user.type(budget, "2500"); await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "A bounded run."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); await waitFor(() => expect(runSpecialistAnalysis).toHaveBeenCalledWith(expect.objectContaining({ maxCompletionTokens: 2500 }))); });
  it("rejects an over-limit budget before calling the provider boundary", async () => { vi.mocked(loadModelRegistry).mockResolvedValue([{ ...model, capabilities: { maxCompletionTokens: 4096 } }]); const user = await renderPage(); await user.click(screen.getByText("Advanced Run Settings")); const budget = screen.getByLabelText("Max completion tokens"); await user.clear(budget); await user.type(budget, "4097"); await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "Do not send."); expect(screen.getByText(/cannot exceed this model's known 4096-token maximum/)).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Run Analysis" })).toBeDisabled(); expect(runSpecialistAnalysis).not.toHaveBeenCalled(); });
  it("warns when the task preference exceeds a known model maximum", async () => { vi.mocked(loadModelRegistry).mockResolvedValue([{ ...model, capabilities: { maxCompletionTokens: 4096 } }]); const user = await renderPage(); await user.selectOptions(screen.getByLabelText("Task Type"), "REACTION_MODEL"); expect(screen.getByRole("status")).toHaveTextContent("prefers 4600 tokens"); expect(screen.getByRole("status")).toHaveTextContent("will use 4096"); });
  it("loads existing specialist history for the selected workspace", async () => { await renderPage(); expect(loadSpecialistRuns).toHaveBeenCalledWith(workspace.path); });
  it("isolates invalid history without preventing the workbench from rendering", async () => { vi.mocked(loadSpecialistRuns).mockRejectedValue({ code: "INVALID_SPECIALIST_HISTORY", message: "The existing history is invalid." }); await renderPage(); expect(screen.getByLabelText("Task Type")).toHaveValue("DESIGN_BEHAVIOR"); expect(screen.getByLabelText("Model")).toHaveValue(model.modelId); expect(screen.getByRole("heading", { name: "Analysis workspace" })).toBeInTheDocument(); });
  it("shows invalid history only as a localized History warning with recovery", async () => { vi.mocked(loadSpecialistRuns).mockRejectedValue({ code: "INVALID_SPECIALIST_HISTORY", message: "The existing history is invalid." }); await renderPage(); const history = screen.getByRole("heading", { name: "Analysis History" }).closest("section")!; const warning = await within(history).findByRole("alert"); expect(warning).toHaveTextContent("Analysis history could not be loaded."); expect(warning).toHaveTextContent("INVALID_SPECIALIST_HISTORY"); expect(within(history).getByRole("button", { name: "Archive and reset history" })).toBeInTheDocument(); });
  it("keeps registered tasks, configured models, and loaded context after history failure", async () => { vi.mocked(loadSpecialistRuns).mockRejectedValue({ code: "INVALID_SPECIALIST_HISTORY", message: "Invalid." }); await renderPage(); expect(screen.getAllByRole("option").filter((option) => ["DESIGN_BEHAVIOR", "REVIEW_BEHAVIOR", "COMPETENCE_TIERS", "REACTION_MODEL", "EXPLOIT_ANALYSIS", "BEHAVIOR_CONTRACT"].includes(option.textContent ?? ""))).toHaveLength(6); expect(screen.getByRole("option", { name: model.displayName })).toBeInTheDocument(); expect(screen.getByRole("checkbox", { name: /Imperfect information/ })).toBeInTheDocument(); expect(screen.getByRole("checkbox", { name: /No omniscience/ })).toBeInTheDocument(); });
  it("keeps Run Analysis available when only history loading failed", async () => { vi.mocked(loadSpecialistRuns).mockRejectedValue({ code: "INVALID_SPECIALIST_HISTORY", message: "Invalid." }); const user = await renderPage(); await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "A guard hears a noise."); const run = screen.getByRole("button", { name: "Run Analysis" }); expect(run).toBeEnabled(); await user.click(run); await waitFor(() => expect(runSpecialistAnalysis).toHaveBeenCalledTimes(1)); });
  it("keeps a successful current result visible when history persistence reports a warning", async () => { vi.mocked(runSpecialistAnalysis).mockResolvedValue({ ...analysis, historyWarning: { code: "INVALID_SPECIALIST_HISTORY", message: "History was not updated." } }); const user = await renderPage(); await fillAndRun(user); expect(await screen.findByText(analysis.result.summary)).toBeInTheDocument(); const history = screen.getByRole("heading", { name: "Analysis History" }).closest("section")!; expect(within(history).getByRole("alert")).toHaveTextContent("INVALID_SPECIALIST_HISTORY"); });
  it("requires confirmation and clears the warning after explicit history recovery", async () => { vi.mocked(loadSpecialistRuns).mockRejectedValue({ code: "INVALID_SPECIALIST_HISTORY", message: "Invalid." }); const user = await renderPage(); await user.click(await screen.findByRole("button", { name: "Archive and reset history" })); expect(screen.getByText(/only `.forgemind\/specialist-runs.json`/)).toBeInTheDocument(); await user.click(screen.getByRole("button", { name: "Confirm archive and reset" })); await waitFor(() => expect(archiveAndResetSpecialistHistory).toHaveBeenCalledWith(workspace.path)); expect(screen.queryByText("Analysis history could not be loaded.")).not.toBeInTheDocument(); expect(screen.getByRole("status")).toHaveTextContent("specialist-runs.invalid-"); expect(screen.getByText("No specialist runs saved yet.")).toBeInTheDocument(); });
  it("surfaces recommended Compendium areas and entries", async () => { await renderPage(); const projectContext = screen.getByRole("group", { name: "Project Context" }); const recommended = within(projectContext).getByLabelText("Recommended for DESIGN_BEHAVIOR"); expect(recommended).toHaveTextContent("Game Vision, Systems"); expect(within(recommended).getByText("Imperfect information")).toBeInTheDocument(); expect(screen.getAllByText("Imperfect information")).toHaveLength(1); });
  it("updates recommendations when the task changes", async () => { const user = await renderPage(); await user.selectOptions(screen.getByLabelText("Task Type"), "REACTION_MODEL"); const recommended = screen.getByLabelText("Recommended for REACTION_MODEL"); expect(recommended).toHaveTextContent("Player Experience"); expect(within(recommended).getByText("Readable reactions")).toBeInTheDocument(); });
  it("renders More project context as a visible non-collapsible heading", async () => { await renderPage(); const heading = screen.getByRole("heading", { name: "More project context" }); expect(heading.closest("details")).toBeNull(); });
  it("renders every Compendium Area as its own collapsed group with an entry count", async () => { await renderPage(); expect(screen.getAllByText(/· \d+ entr(?:y|ies)/)).toHaveLength(11); const technical = screen.getByText("Technical · 1 entry").closest("details"); expect(technical).not.toHaveAttribute("open"); expect(technical).toHaveTextContent("Fixed update"); });
  it("keeps a selected Area group expanded and reports its selected count", async () => { const user = await renderPage(); const checkbox = screen.getByRole("checkbox", { name: /Fixed update/ }); await user.click(checkbox); const technical = screen.getByText("Technical · 1 entry · 1 selected").closest("details"); expect(technical).toHaveAttribute("open"); expect(checkbox).toBeChecked(); });
  it("allows recommended context to be selected and unselected", async () => { const user = await renderPage(); const checkbox = screen.getByRole("checkbox", { name: /Imperfect information/ }); await user.click(checkbox); expect(checkbox).toBeChecked(); await user.click(checkbox); expect(checkbox).not.toBeChecked(); });
  it("allows recommended context to remain optional", async () => { const user = await renderPage(); await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "No context run."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); await waitFor(() => expect(runSpecialistAnalysis).toHaveBeenCalledWith(expect.objectContaining({ knowledgeEntryIds: [], decisionIds: [] }))); });
  it("allows Compendium context selection", async () => { const user = await renderPage(); const checkbox = screen.getByRole("checkbox", { name: /Imperfect information/ }); await user.click(checkbox); expect(checkbox).toBeChecked(); expect(screen.getByText("1/8 Compendium entries selected")).toBeInTheDocument(); });
  it("shows only approved Decisions", async () => { await renderPage(); expect(screen.getByText("No omniscience")).toBeInTheDocument(); expect(screen.queryByText("Proposed idea")).not.toBeInTheDocument(); });
  it("hides the Decision selector when no approved Decisions exist", async () => { vi.mocked(loadDecisions).mockResolvedValue(null); await renderPage(); expect(screen.queryByRole("group", { name: "Approved Decision Context" })).not.toBeInTheDocument(); });
  it("keeps selected Decisions obvious while collapsed", async () => { const user = await renderPage(); const checkbox = screen.getByRole("checkbox", { name: /No omniscience/ }); await user.click(checkbox); expect(screen.getByText("Related approved decisions · 1 selected")).toBeInTheDocument(); expect(screen.getByText("Selected: No omniscience")).toBeInTheDocument(); });
  it("invokes the production boundary with only selected context", async () => { const user = await renderPage(); await user.click(screen.getByRole("checkbox", { name: /Imperfect information/ })); await user.click(screen.getByRole("checkbox", { name: /No omniscience/ })); await fillAndRun(user); await waitFor(() => expect(runSpecialistAnalysis).toHaveBeenCalledWith(expect.objectContaining({ profileId: profile.id, taskType: "REACTION_MODEL", modelId: model.modelId, knowledgeEntryIds: [knowledge.id], decisionIds: [approved.id] }))); });
  it("shows accessible loading feedback, prevents duplicates, and preserves the form", async () => { let resolve!: (value: typeof analysis) => void; vi.mocked(runSpecialistAnalysis).mockReturnValue(new Promise((done) => { resolve = done; })); const user = await renderPage(); const input = screen.getByRole("textbox", { name: /Scenario \/ Question/ }); await user.type(input, "Keep this scenario."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); expect(screen.getByRole("status")).toHaveTextContent("Waiting for model response"); const button = screen.getByRole("button", { name: "Running Analysis…" }); expect(button).toBeDisabled(); expect(input).toHaveValue("Keep this scenario."); await user.click(button); expect(runSpecialistAnalysis).toHaveBeenCalledTimes(1); resolve(analysis); await screen.findByText(analysis.result.summary); });
  it("renders bounded structured result sections", async () => { const user = await renderPage(); await fillAndRun(user); expect(await screen.findByText(analysis.result.summary)).toBeInTheDocument(); expect(screen.getByText(analysis.result.recommendations[0])).toBeInTheDocument(); expect(screen.getByText(analysis.result.exploits[0])).toBeInTheDocument(); expect(screen.getByText(analysis.result.suggestedTests[0])).toBeInTheDocument(); });
  it("visually distinguishes assumptions from project facts", async () => { const user = await renderPage(); await fillAndRun(user); const section = await screen.findByLabelText("Assumptions — not project facts"); expect(section).toHaveClass("specialist-assumptions"); expect(section).toHaveTextContent(analysis.result.assumptions[0]); });
  it("shows only selected references in Context used", async () => { vi.mocked(runSpecialistAnalysis).mockResolvedValue({ ...analysis, selectedDecisionIds: [] }); const user = await renderPage(); await user.click(screen.getByRole("checkbox", { name: /Imperfect information/ })); await fillAndRun(user); const evidence = await screen.findByLabelText("Context used"); expect(evidence).toHaveTextContent("Imperfect information"); expect(evidence).not.toHaveTextContent("Readable reactions"); expect(evidence).not.toHaveTextContent("No omniscience"); });
  it("preserves input and safe diagnostics after a provider error", async () => { vi.mocked(runSpecialistAnalysis).mockRejectedValue({ code: "OUTPUT_TRUNCATED", message: "The output limit was reached.", diagnostics: { finishReason: "length" } }); const user = await renderPage(); const input = screen.getByRole("textbox", { name: /Scenario \/ Question/ }); await user.type(input, "Keep this scenario."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); const alert = await screen.findByRole("alert"); expect(alert).toHaveTextContent("OUTPUT_TRUNCATED"); expect(alert).toHaveTextContent("length"); expect(input).toHaveValue("Keep this scenario."); });
  it("shows actionable truncation guidance without an automatic retry", async () => { vi.mocked(runSpecialistAnalysis).mockRejectedValue({ code: "OUTPUT_TRUNCATED", message: "The output limit was reached.", diagnostics: { effectiveCompletionBudget: 3200, preferredTaskBudget: 3200 } }); const user = await renderPage(); await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "Keep control of spending."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); const alert = await screen.findByRole("alert"); expect(alert).toHaveTextContent("No retry was performed"); expect(alert).toHaveTextContent("Reduce context"); expect(screen.queryByRole("button", { name: /Retry with suggested budget/ })).not.toBeInTheDocument(); expect(runSpecialistAnalysis).toHaveBeenCalledTimes(1); });
  it("offers and performs an explicit higher-budget retry only when a safe known maximum allows it", async () => { vi.mocked(runSpecialistAnalysis).mockRejectedValueOnce({ code: "OUTPUT_TRUNCATED", message: "Truncated.", diagnostics: { effectiveCompletionBudget: 4096, preferredTaskBudget: 4600, knownModelMaxCompletionTokens: 8192 } }).mockResolvedValueOnce(analysis); const user = await renderPage(); await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "Explicit retry."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); const retry = await screen.findByRole("button", { name: "Retry with suggested budget (4608)" }); expect(runSpecialistAnalysis).toHaveBeenCalledTimes(1); await user.click(retry); await waitFor(() => expect(runSpecialistAnalysis).toHaveBeenCalledTimes(2)); expect(runSpecialistAnalysis).toHaveBeenLastCalledWith(expect.objectContaining({ maxCompletionTokens: 4608 })); });
  it("shows targeted INVALID_REQUEST guidance only when the rejected parameter is known", async () => { vi.mocked(runSpecialistAnalysis).mockRejectedValue({ code: "INVALID_REQUEST", message: "Rejected.", diagnostics: { httpStatus: 400, rejectedParameter: "max_completion_tokens", effectiveCompletionBudget: 4600 } }); const user = await renderPage(); await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "Rejected request."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); const alert = await screen.findByRole("alert"); expect(alert).toHaveTextContent("selected model or provider rejected the requested completion budget"); expect(alert).toHaveTextContent("max_completion_tokens"); expect(alert).toHaveTextContent("400"); });
  it("renders honest usage metadata and estimates", async () => { const user = await renderPage(); await fillAndRun(user); const metadata = await screen.findByLabelText("Specialist usage"); expect(metadata).toHaveTextContent("42 ms"); expect(metadata).toHaveTextContent("150"); expect(metadata).toHaveTextContent("$0.000200 (Estimated)"); });
  it("reports unavailable usage instead of inventing values", async () => { vi.mocked(runSpecialistAnalysis).mockResolvedValue({ ...analysis, inputTokens: undefined, outputTokens: undefined, totalTokens: undefined }); const user = await renderPage(); await fillAndRun(user); const metadata = await screen.findByLabelText("Specialist usage"); expect(metadata).toHaveTextContent("Not provided"); expect(metadata).toHaveTextContent("Unavailable"); });
  it("lists saved successful runs and restores their output", async () => { vi.mocked(loadSpecialistRuns).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T12:00:00Z", runs: [successfulRun] }); await renderPage(); expect(screen.getByRole("button", { name: /REACTION_MODEL.*SUCCEEDED/s })).toHaveAttribute("aria-current", "true"); expect(screen.getByRole("button", { name: /budget 4600/s })).toBeInTheDocument(); expect(within(screen.getByRole("heading", { name: "Analysis Result" }).closest("section")!).getByText(analysis.result.summary)).toBeInTheDocument(); expect(screen.getByLabelText("Specialist usage")).toHaveTextContent("19517 ms"); expect(screen.getByLabelText("Specialist usage")).toHaveTextContent("Effective completion budget4600"); });
  it("lists failed runs with safe categories and diagnostics", async () => { vi.mocked(loadSpecialistRuns).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T12:05:00Z", runs: [failedRun] }); await renderPage(); const alert = screen.getByRole("alert"); expect(alert).toHaveTextContent("OUTPUT_TRUNCATED"); expect(alert).toHaveTextContent("length"); expect(alert).not.toHaveTextContent("raw response"); });
  it("lets the user switch between prior successful and failed runs", async () => { vi.mocked(loadSpecialistRuns).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T12:05:00Z", runs: [successfulRun, failedRun] }); const user = await renderPage(); expect(screen.getByRole("alert")).toHaveTextContent("OUTPUT_TRUNCATED"); await user.click(screen.getByRole("button", { name: /REACTION_MODEL.*SUCCEEDED/s })); expect(within(screen.getByRole("heading", { name: "Analysis Result" }).closest("section")!).getByText(analysis.result.summary)).toBeInTheDocument(); expect(screen.queryByRole("alert")).not.toBeInTheDocument(); });
  it("refreshes history after a completed run", async () => { vi.mocked(loadSpecialistRuns).mockResolvedValueOnce(null).mockResolvedValueOnce({ formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T12:00:00Z", runs: [successfulRun] }); const user = await renderPage(); await fillAndRun(user); await waitFor(() => expect(loadSpecialistRuns).toHaveBeenCalledTimes(2)); expect(screen.getByRole("button", { name: /REACTION_MODEL.*SUCCEEDED/s })).toHaveAttribute("aria-current", "true"); });
});
