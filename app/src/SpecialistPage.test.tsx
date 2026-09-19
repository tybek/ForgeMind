import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistPage } from "./SpecialistPage";
import { loadDecisions } from "./platform/decisions";
import { loadModelRegistry } from "./platform/modelRegistry";
import { loadCompendium } from "./platform/projectKnowledge";
import { loadSpecialistProfiles, runSpecialistAnalysis } from "./platform/specialists";
import type { SpecialistProfile } from "./platform/specialists";

vi.mock("./platform/modelRegistry", () => ({ loadModelRegistry: vi.fn() }));
vi.mock("./platform/projectKnowledge", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./platform/projectKnowledge")>()), loadCompendium: vi.fn(),
}));
vi.mock("./platform/decisions", () => ({ loadDecisions: vi.fn() }));
vi.mock("./platform/specialists", () => ({ loadSpecialistProfiles: vi.fn(), runSpecialistAnalysis: vi.fn() }));

const workspace = { path: "D:\\Games\\Sample", projectId: "550e8400-e29b-41d4-a716-446655440000" };
const profile: SpecialistProfile = {
  id: "ai_behavior_designer",
  displayName: "AI Behavior Designer",
  description: "Analyze tactical behavior.",
  supportedTaskTypes: ["DESIGN_BEHAVIOR", "REACTION_MODEL", "EXPLOIT_ANALYSIS"],
  defaultTaskType: "DESIGN_BEHAVIOR",
};
const model = {
  provider: "nebius_token_factory", modelId: "test/model", displayName: "Registry Test Model", family: "test",
  availability: "configured", enabled: true, pricing: { inputUsdPerMillionTokens: 1, outputUsdPerMillionTokens: 2 },
};
const knowledge = {
  id: "knowledge-1", area: "systems" as const, title: "Imperfect information", statement: "Enemies know only perceived facts.",
  status: "LOCKED" as const, provenance: "MANUAL" as const, source: "manual_entry" as const,
  createdAt: "2026-09-19T10:00:00Z", updatedAt: "2026-09-19T10:00:00Z",
};
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

describe("AI Behavior Designer specialist workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadSpecialistProfiles).mockResolvedValue([profile]);
    vi.mocked(loadModelRegistry).mockResolvedValue([model]);
    vi.mocked(loadCompendium).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T10:00:00Z", entries: [knowledge] });
    vi.mocked(loadDecisions).mockResolvedValue({ formatVersion: 1, projectId: workspace.projectId, updatedAt: "2026-09-19T10:00:00Z", decisions: [approved, proposed] });
    vi.mocked(runSpecialistAnalysis).mockResolvedValue(analysis);
  });

  it("renders the specialist workspace", async () => { await renderPage(); expect(screen.getByText(/Every run is explicit/)).toBeInTheDocument(); });
  it("renders the AI Behavior Designer profile", async () => { await renderPage(); expect(screen.getByText(profile.description)).toBeInTheDocument(); });
  it("allows a supported task type to be selected", async () => { const user = await renderPage(); await user.selectOptions(screen.getByLabelText("Task Type"), "REACTION_MODEL"); expect(screen.getByLabelText("Task Type")).toHaveValue("REACTION_MODEL"); });
  it("uses enabled models from the registry", async () => { await renderPage(); expect(screen.getByLabelText("Model")).toHaveValue(model.modelId); expect(screen.getByRole("option", { name: model.displayName })).toBeInTheDocument(); });
  it("allows Compendium context selection", async () => { const user = await renderPage(); const checkbox = screen.getByRole("checkbox", { name: /Imperfect information/ }); await user.click(checkbox); expect(checkbox).toBeChecked(); });
  it("allows approved Decision selection", async () => { const user = await renderPage(); const checkbox = screen.getByRole("checkbox", { name: /No omniscience/ }); await user.click(checkbox); expect(checkbox).toBeChecked(); });
  it("does not offer unapproved Decisions", async () => { await renderPage(); expect(screen.queryByText("Proposed idea")).not.toBeInTheDocument(); });
  it("accepts bounded scenario text", async () => { const user = await renderPage(); const input = screen.getByRole("textbox", { name: /Scenario \/ Question/ }); await user.type(input, "Guard hears a noise."); expect(input).toHaveValue("Guard hears a noise."); });
  it("invokes the specialist boundary with selected context", async () => { const user = await renderPage(); await user.click(screen.getByRole("checkbox", { name: /Imperfect information/ })); await user.click(screen.getByRole("checkbox", { name: /No omniscience/ })); await fillAndRun(user); await waitFor(() => expect(runSpecialistAnalysis).toHaveBeenCalledWith(expect.objectContaining({ profileId: profile.id, taskType: "REACTION_MODEL", modelId: model.modelId, knowledgeEntryIds: [knowledge.id], decisionIds: [approved.id] }))); });
  it("prevents duplicate execution while loading", async () => { let resolve!: (value: typeof analysis) => void; vi.mocked(runSpecialistAnalysis).mockReturnValue(new Promise((done) => { resolve = done; })); const user = await renderPage(); await user.type(screen.getByRole("textbox", { name: /Scenario \/ Question/ }), "Guard hears a noise."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); expect(screen.getByRole("button", { name: "Running Analysis…" })).toBeDisabled(); await user.click(screen.getByRole("button", { name: "Running Analysis…" })); expect(runSpecialistAnalysis).toHaveBeenCalledTimes(1); resolve(analysis); });
  it("renders a structured result summary", async () => { const user = await renderPage(); await fillAndRun(user); expect(await screen.findByText(analysis.result.summary)).toBeInTheDocument(); });
  it("visually distinguishes assumptions from project facts", async () => { const user = await renderPage(); await fillAndRun(user); const section = await screen.findByLabelText("Assumptions — not project facts"); expect(section).toHaveClass("specialist-assumptions"); expect(section).toHaveTextContent(analysis.result.assumptions[0]); });
  it("renders recommendations", async () => { const user = await renderPage(); await fillAndRun(user); expect(await screen.findByText(analysis.result.recommendations[0])).toBeInTheDocument(); });
  it("renders exploits when present", async () => { const user = await renderPage(); await fillAndRun(user); expect(await screen.findByText(analysis.result.exploits[0])).toBeInTheDocument(); });
  it("renders suggested tests", async () => { const user = await renderPage(); await fillAndRun(user); expect(await screen.findByText(analysis.result.suggestedTests[0])).toBeInTheDocument(); });
  it("preserves user input after a provider error", async () => { vi.mocked(runSpecialistAnalysis).mockRejectedValue({ code: "PROVIDER_ERROR", message: "Provider unavailable." }); const user = await renderPage(); const input = screen.getByRole("textbox", { name: /Scenario \/ Question/ }); await user.type(input, "Keep this scenario."); await user.click(screen.getByRole("button", { name: "Run Analysis" })); expect(await screen.findByRole("alert")).toHaveTextContent("Provider unavailable."); expect(input).toHaveValue("Keep this scenario."); });
  it("renders honest usage metadata and an available estimate", async () => { const user = await renderPage(); await fillAndRun(user); const usage = await screen.findByLabelText("Specialist usage"); expect(usage).toHaveTextContent("42 ms"); expect(usage).toHaveTextContent("150"); expect(usage).toHaveTextContent("$0.000200 (Estimated)"); });
  it("reports unavailable usage instead of inventing values", async () => { vi.mocked(runSpecialistAnalysis).mockResolvedValue({ ...analysis, inputTokens: undefined, outputTokens: undefined, totalTokens: undefined }); const user = await renderPage(); await fillAndRun(user); const usage = await screen.findByLabelText("Specialist usage"); expect(usage).toHaveTextContent("Not provided"); expect(usage).toHaveTextContent("Unavailable"); });
});
