import { FormEvent, useState } from "react";
import {
  CONFIGURED_MODEL_IDS,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  EVALUATION_PROVIDER_NAME,
} from "./config/evaluation";
import {
  runEvaluation,
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
      setError({ code, message: providerErrorMessage(evaluationError) });
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
