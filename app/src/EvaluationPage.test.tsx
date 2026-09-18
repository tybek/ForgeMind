import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvaluationPage } from "./EvaluationPage";
import { runEvaluation } from "./platform/aiProvider";

vi.mock("./platform/aiProvider", () => ({ runEvaluation: vi.fn() }));

const response = {
  text: "A concise model response.",
  model: "account/model",
  inputTokens: 12,
  outputTokens: 8,
  totalTokens: 20,
  latencyMs: 42,
};

async function completeRequiredFields() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Model identifier"), "account/model");
  await user.type(screen.getByLabelText("Evaluation prompt"), "Explain this trade-off.");
  return user;
}

describe("AI evaluation harness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the evaluation page", () => {
    render(<EvaluationPage />);
    expect(screen.getByRole("heading", { name: "AI Evaluation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Evaluation" })).toBeEnabled();
  });

  it("displays the provider truthfully", () => {
    render(<EvaluationPage />);
    expect(screen.getByLabelText("Provider")).toHaveValue("Nebius Token Factory");
    expect(screen.getByLabelText("Provider")).toHaveAttribute("readonly");
  });

  it("allows a model identifier to be entered", async () => {
    const user = userEvent.setup();
    render(<EvaluationPage />);
    await user.type(screen.getByLabelText("Model identifier"), "organization/model-v1");
    expect(screen.getByLabelText("Model identifier")).toHaveValue("organization/model-v1");
  });

  it("allows an evaluation prompt to be entered", async () => {
    const user = userEvent.setup();
    render(<EvaluationPage />);
    await user.type(screen.getByLabelText("Evaluation prompt"), "Compare two tactics.");
    expect(screen.getByLabelText("Evaluation prompt")).toHaveValue("Compare two tactics.");
  });

  it("calls the provider boundary only after the explicit run action", async () => {
    vi.mocked(runEvaluation).mockResolvedValue(response);
    render(<EvaluationPage />);
    const user = await completeRequiredFields();

    expect(runEvaluation).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    expect(runEvaluation).toHaveBeenCalledOnce();
    expect(runEvaluation).toHaveBeenCalledWith({
      model: "account/model",
      systemPrompt: undefined,
      userPrompt: "Explain this trade-off.",
      temperature: 0.2,
      maxTokens: 128,
    });
  });

  it("shows loading and prevents duplicate submission", async () => {
    let finish!: (value: typeof response) => void;
    vi.mocked(runEvaluation).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<EvaluationPage />);
    const user = await completeRequiredFields();

    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));
    const loadingButton = screen.getByRole("button", { name: "Running Evaluation..." });
    expect(loadingButton).toBeDisabled();
    await user.click(loadingButton);
    expect(runEvaluation).toHaveBeenCalledOnce();
    finish(response);
    expect(await screen.findByText(response.text)).toBeInTheDocument();
  });

  it("displays returned text", async () => {
    vi.mocked(runEvaluation).mockResolvedValue(response);
    render(<EvaluationPage />);
    const user = await completeRequiredFields();
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));
    expect(await screen.findByText("A concise model response.")).toBeInTheDocument();
  });

  it("displays model, latency, and provider usage metadata", async () => {
    vi.mocked(runEvaluation).mockResolvedValue(response);
    render(<EvaluationPage />);
    const user = await completeRequiredFields();
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    expect(await screen.findByText("42 ms")).toBeInTheDocument();
    expect(screen.getByText("account/model")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("labels missing usage metadata as not provided", async () => {
    vi.mocked(runEvaluation).mockResolvedValue({
      text: "No usage returned.",
      model: "account/model",
      latencyMs: 15,
    });
    render(<EvaluationPage />);
    const user = await completeRequiredFields();
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    expect(await screen.findAllByText("Not provided")).toHaveLength(3);
  });

  it("shows a clear provider error without exposing request details", async () => {
    vi.mocked(runEvaluation).mockRejectedValue({
      code: "MISSING_API_KEY",
      message: "Nebius Token Factory is not configured. Set NEBIUS_API_KEY before launching ForgeMind.",
    });
    render(<EvaluationPage />);
    const user = await completeRequiredFields();
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("MISSING_API_KEY");
    expect(alert).toHaveTextContent("Set NEBIUS_API_KEY");
    expect(alert).not.toHaveTextContent("Explain this trade-off.");
  });
});
