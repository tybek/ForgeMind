import { FormEvent, useState } from "react";
import {
  CONFIGURED_MODEL_IDS,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  EVALUATION_PROVIDER_NAME,
} from "./config/evaluation";
import {
  runEvaluation,
  type AIProviderDiagnostics,
  type AIProviderError,
  type AIResponse,
} from "./platform/aiProvider";

function providerErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "The evaluation could not be completed.";
}

function usageValue(value: number | undefined): string {
  return value === undefined ? "Not provided" : String(value);
}

function providerDiagnostics(error: unknown): AIProviderDiagnostics | undefined {
  if (typeof error !== "object" || error === null || !("diagnostics" in error)) return undefined;
  const diagnostics = error.diagnostics;
  if (
    typeof diagnostics !== "object" ||
    diagnostics === null ||
    !("choicesPresent" in diagnostics) ||
    typeof diagnostics.choicesPresent !== "boolean" ||
    !("messageContentPresent" in diagnostics) ||
    typeof diagnostics.messageContentPresent !== "boolean" ||
    !("reasoningContentPresent" in diagnostics) ||
    typeof diagnostics.reasoningContentPresent !== "boolean" ||
    !("refusalPresent" in diagnostics) ||
    typeof diagnostics.refusalPresent !== "boolean" ||
    !("toolCallsPresent" in diagnostics) ||
    typeof diagnostics.toolCallsPresent !== "boolean"
  ) {
    return undefined;
  }
  return diagnostics as AIProviderDiagnostics;
}

function presence(value: boolean): string {
  return value ? "Yes" : "No";
}

export function EvaluationPage() {
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [temperature, setTemperature] = useState(String(DEFAULT_TEMPERATURE));
  const [maxTokens, setMaxTokens] = useState(String(DEFAULT_MAX_TOKENS));
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [error, setError] = useState<AIProviderError | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning) return;

    setIsRunning(true);
    setResult(null);
    setError(null);
    try {
      const response = await runEvaluation({
        model: model.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        userPrompt: userPrompt.trim(),
        temperature: Number(temperature),
        maxTokens: Number(maxTokens),
      });
      setResult(response);
    } catch (evaluationError) {
      const code =
        typeof evaluationError === "object" &&
        evaluationError !== null &&
        "code" in evaluationError &&
        typeof evaluationError.code === "string"
          ? evaluationError.code
          : "EVALUATION_FAILED";
      setError({
        code,
        message: providerErrorMessage(evaluationError),
        diagnostics: providerDiagnostics(evaluationError),
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="evaluation-stack">
      <section className="evaluation-card" aria-labelledby="evaluation-title">
        <span className="section-label">Bounded manual model test</span>
        <h2 id="evaluation-title">AI Evaluation</h2>
        <p className="scope-note">
          Every request is sent only when you choose Run Evaluation. Results remain transient.
        </p>

        <form className="evaluation-form" onSubmit={(event) => void submit(event)}>
          <label>
            Provider
            <input value={EVALUATION_PROVIDER_NAME} readOnly />
          </label>
          <label>
            Model identifier
            <input
              required
              list="configured-models"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="Enter a model available to your account"
            />
          </label>
          <datalist id="configured-models">
            {CONFIGURED_MODEL_IDS.map((modelId) => <option key={modelId} value={modelId} />)}
          </datalist>
          <label>
            System prompt (optional)
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={3}
            />
          </label>
          <label>
            Evaluation prompt
            <textarea
              required
              value={userPrompt}
              onChange={(event) => setUserPrompt(event.target.value)}
              rows={7}
            />
          </label>
          <div className="evaluation-options">
            <label>
              Temperature
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                required
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
              />
            </label>
            <label>
              Maximum output tokens
              <input
                type="number"
                min="1"
                max="4096"
                required
                value={maxTokens}
                onChange={(event) => setMaxTokens(event.target.value)}
              />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={isRunning}>
            {isRunning ? "Running Evaluation..." : "Run Evaluation"}
          </button>
        </form>
      </section>

      {error ? (
        <section className="evaluation-error" role="alert">
          <strong>{error.code}</strong>
          <p>{error.message}</p>
          {error.diagnostics ? (
            <dl className="result-metadata" aria-label="Provider diagnostics">
              <div><dt>HTTP status</dt><dd>{error.diagnostics.httpStatus ?? "Unavailable"}</dd></div>
              <div><dt>Response object</dt><dd>{error.diagnostics.responseObject ?? "Unavailable"}</dd></div>
              <div><dt>Finish reason</dt><dd>{error.diagnostics.finishReason ?? "Unavailable"}</dd></div>
              <div><dt>Choices present</dt><dd>{presence(error.diagnostics.choicesPresent)}</dd></div>
              <div><dt>Message content present</dt><dd>{presence(error.diagnostics.messageContentPresent)}</dd></div>
              <div><dt>Reasoning content present</dt><dd>{presence(error.diagnostics.reasoningContentPresent)}</dd></div>
              <div><dt>Refusal present</dt><dd>{presence(error.diagnostics.refusalPresent)}</dd></div>
              <div><dt>Tool calls present</dt><dd>{presence(error.diagnostics.toolCallsPresent)}</dd></div>
              <div><dt>Reasoning tokens</dt><dd>{error.diagnostics.reasoningTokens ?? "Unavailable"}</dd></div>
              <div><dt>Provider request ID</dt><dd>{error.diagnostics.providerRequestId ?? "Unavailable"}</dd></div>
              <div><dt>Provider error code</dt><dd>{error.diagnostics.providerErrorCode ?? "Unavailable"}</dd></div>
              <div><dt>Provider error type</dt><dd>{error.diagnostics.providerErrorType ?? "Unavailable"}</dd></div>
            </dl>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="evaluation-card evaluation-result" aria-labelledby="result-title">
          <span className="section-label">Provider response</span>
          <h2 id="result-title">Result</h2>
          <pre>{result.text}</pre>
          <dl className="result-metadata">
            <div><dt>Model</dt><dd>{result.model}</dd></div>
            <div><dt>Latency</dt><dd>{result.latencyMs} ms</dd></div>
            <div><dt>Input tokens</dt><dd>{usageValue(result.inputTokens)}</dd></div>
            <div><dt>Output tokens</dt><dd>{usageValue(result.outputTokens)}</dd></div>
            <div><dt>Total tokens</dt><dd>{usageValue(result.totalTokens)}</dd></div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
