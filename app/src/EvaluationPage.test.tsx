import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvaluationPage } from "./EvaluationPage";
import { runEvaluation } from "./platform/aiProvider";
import { loadModelRegistry } from "./platform/modelRegistry";
import { loadUsageSummary } from "./platform/usageMetering";

vi.mock("./platform/aiProvider", () => ({ runEvaluation: vi.fn() }));
vi.mock("./platform/modelRegistry", () => ({ loadModelRegistry: vi.fn() }));
vi.mock("./platform/usageMetering", async (importOriginal) => {
  const original = await importOriginal<typeof import("./platform/usageMetering")>();
  return { ...original, loadUsageSummary: vi.fn() };
});

const registry = [
  {
    provider: "nebius_token_factory",
    modelId: "deepseek-ai/DeepSeek-V4.1-Flash",
    displayName: "DeepSeek V4.1 Flash",
    family: "DeepSeek V4.1",
    vendor: "DeepSeek",
    category: "reasoning",
    availability: "configured",
    notes: "Account access required.",
    capabilities: {},
    enabled: true,
  },
];

const usageSummary = {
  session: {
    requests: 2,
    successfulRequests: 2,
    failedRequests: 0,
    inputTokens: 120,
    outputTokens: 80,
    totalTokens: 200,
    estimatedCostUsd: 0.0012,
    averageLatencyMs: 42,
  },
  project: {
    requests: 3,
    successfulRequests: 2,
    failedRequests: 1,
    inputTokens: 180,
    outputTokens: 90,
    totalTokens: 270,
    averageLatencyMs: 50,
  },
  byModel: [
    {
      provider: "nebius_token_factory",
      modelId: "deepseek-ai/DeepSeek-V4.1-Flash",
      requests: 3,
      successfulRequests: 2,
      failedRequests: 1,
      inputTokens: 180,
      outputTokens: 90,
      totalTokens: 270,
      averageLatencyMs: 50,
    },
  ],
};

const response = {
  text: "A concise model response.",
  model: "deepseek-ai/DeepSeek-V4.1-Flash",
  inputTokens: 12,
  outputTokens: 8,
  totalTokens: 20,
  latencyMs: 42,
};

async function renderConfiguredPage() {
  const user = userEvent.setup();
  render(<EvaluationPage projectId="project-1" />);
  await screen.findByRole("option", { name: "DeepSeek V4.1 Flash" });
  return user;
}

async function enterPrompt(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Evaluation prompt"), "Explain this trade-off.");
}

describe("AI evaluation and usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadModelRegistry).mockResolvedValue(registry);
    vi.mocked(loadUsageSummary).mockResolvedValue(usageSummary);
  });

  it("renders registry-backed models and exact metadata", async () => {
    await renderConfiguredPage();

    expect(screen.getByLabelText("Model")).toHaveValue("deepseek-ai/DeepSeek-V4.1-Flash");
    const details = screen.getByLabelText("Selected model details");
    expect(details).toHaveTextContent("DeepSeek V4.1 Flash");
    expect(details).toHaveTextContent("deepseek-ai/DeepSeek-V4.1-Flash");
    expect(details).toHaveTextContent("nebius_token_factory");
  });

  it("shows missing pricing honestly", async () => {
    await renderConfiguredPage();
    expect(screen.getByText("Pricing unavailable")).toBeInTheDocument();
  });

  it("renders session, project, and per-model usage", async () => {
    await renderConfiguredPage();

    expect(screen.getByRole("heading", { name: "Usage Summary" })).toBeInTheDocument();
    const session = screen.getByLabelText("Current session usage");
    expect(session).toHaveTextContent("120");
    expect(session).toHaveTextContent("80");
    expect(screen.getByLabelText("Current project usage")).toHaveTextContent("3");
    expect(screen.getByLabelText("Usage by model")).toHaveTextContent("270 tokens");
  });

  it("labels cost as estimated and unknown cost as unavailable", async () => {
    await renderConfiguredPage();

    const session = screen.getByLabelText("Current session usage");
    expect(within(session).getByText("$0.001200 (Estimated)")).toBeInTheDocument();
    const project = screen.getByLabelText("Current project usage");
    expect(within(project).getByText("Unavailable")).toBeInTheDocument();
  });

  it("renders native null usage values without taking down the evaluation view", async () => {
    vi.mocked(loadUsageSummary).mockResolvedValueOnce({
      session: {
        requests: 1,
        successfulRequests: 1,
        failedRequests: 0,
        inputTokens: 12,
        outputTokens: 4,
        totalTokens: 16,
        estimatedCostUsd: null,
        averageLatencyMs: null,
      },
      project: null,
      byModel: [
        {
          provider: "nebius_token_factory",
          modelId: "deepseek-ai/DeepSeek-V4.1-Flash",
          requests: 1,
          successfulRequests: 1,
          failedRequests: 0,
          inputTokens: 12,
          outputTokens: 4,
          totalTokens: 16,
          estimatedCostUsd: null,
          averageLatencyMs: null,
        },
      ],
    });

    await renderConfiguredPage();

    expect(screen.getByRole("heading", { name: "AI Evaluation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Usage by model")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("calls the provider only after explicit submission with registry and context values", async () => {
    vi.mocked(runEvaluation).mockResolvedValue(response);
    const user = await renderConfiguredPage();
    await enterPrompt(user);
    await user.selectOptions(screen.getByLabelText("Task category (optional)"), "ai_behavior");

    expect(runEvaluation).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    expect(runEvaluation).toHaveBeenCalledOnce();
    expect(runEvaluation).toHaveBeenCalledWith(
      {
        model: "deepseek-ai/DeepSeek-V4.1-Flash",
        systemPrompt: undefined,
        userPrompt: "Explain this trade-off.",
        temperature: 0.2,
        maxTokens: 128,
      },
      { projectId: "project-1", taskCategory: "ai_behavior" },
    );
  });

  it("shows loading and prevents duplicate submission", async () => {
    let finish!: (value: typeof response) => void;
    vi.mocked(runEvaluation).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const user = await renderConfiguredPage();
    await enterPrompt(user);

    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));
    const loadingButton = screen.getByRole("button", { name: "Running Evaluation..." });
    expect(loadingButton).toBeDisabled();
    await user.click(loadingButton);
    expect(runEvaluation).toHaveBeenCalledOnce();
    finish(response);
    expect(await screen.findByText(response.text)).toBeInTheDocument();
  });

  it("displays result text and provider usage metadata", async () => {
    vi.mocked(runEvaluation).mockResolvedValue(response);
    const user = await renderConfiguredPage();
    await enterPrompt(user);
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    expect(await screen.findByText(response.text)).toBeInTheDocument();
    const result = screen.getByRole("heading", { name: "Result" }).closest("section");
    expect(result).toHaveTextContent("42 ms");
    expect(result).toHaveTextContent("12");
    expect(result).toHaveTextContent("8");
    expect(result).toHaveTextContent("20");
  });

  it("labels missing provider usage metadata as not provided", async () => {
    vi.mocked(runEvaluation).mockResolvedValue({
      text: "No usage returned.",
      model: "deepseek-ai/DeepSeek-V4.1-Flash",
      latencyMs: 15,
    });
    const user = await renderConfiguredPage();
    await enterPrompt(user);
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    const result = screen.getByRole("heading", { name: "Result" }).closest("section");
    expect(within(result as HTMLElement).getAllByText("Not provided")).toHaveLength(3);
  });

  it("shows a safe provider error without exposing prompt details", async () => {
    vi.mocked(runEvaluation).mockRejectedValue({
      code: "MISSING_API_KEY",
      message: "Nebius Token Factory is not configured. Set NEBIUS_API_KEY before launching ForgeMind.",
    });
    const user = await renderConfiguredPage();
    await enterPrompt(user);
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("MISSING_API_KEY");
    expect(alert).not.toHaveTextContent("Explain this trade-off.");
  });

  it("shows allowlisted diagnostics without response content", async () => {
    vi.mocked(runEvaluation).mockRejectedValue({
      code: "OUTPUT_TRUNCATED",
      message: "The output limit was reached before readable text was returned.",
      diagnostics: {
        httpStatus: 200,
        responseObject: "chat.completion",
        finishReason: "length",
        choicesPresent: true,
        messageContentPresent: false,
        reasoningContentPresent: true,
        refusalPresent: false,
        toolCallsPresent: false,
        reasoningTokens: 32,
        providerRequestId: "request-safe-123",
      },
      responseBody: "private reasoning must not be rendered",
    });
    const user = await renderConfiguredPage();
    await enterPrompt(user);
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    const diagnostics = await screen.findByLabelText("Provider diagnostics");
    expect(diagnostics).toHaveTextContent("request-safe-123");
    expect(diagnostics).not.toHaveTextContent("private reasoning must not be rendered");
  });
});
