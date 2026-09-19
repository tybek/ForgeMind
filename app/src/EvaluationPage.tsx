import { FormEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from "./config/evaluation";
import {
  runEvaluation,
  type AIProviderDiagnostics,
  type AIProviderError,
  type AIResponse,
} from "./platform/aiProvider";
import { loadModelRegistry, type ModelEntry } from "./platform/modelRegistry";
import {
  loadUsageSummary,
  TASK_CATEGORIES,
  type TaskCategory,
  type UsageSummary,
  type UsageTotals,
} from "./platform/usageMetering";

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

function estimatedCost(value: number | undefined): string {
  return value === undefined ? "Unavailable" : `$${value.toFixed(6)} (Estimated)`;
}

function pricing(model: ModelEntry | undefined): string {
  if (!model?.pricing) return "Pricing unavailable";
  return `$${model.pricing.inputUsdPerMillionTokens}/M input · $${model.pricing.outputUsdPerMillionTokens}/M output`;
}

function UsageCards({ label, totals }: { label: string; totals: UsageTotals }) {
  return (
    <section className="usage-group" aria-label={`${label} usage`}>
      <h3>{label}</h3>
      <dl className="result-metadata usage-metadata">
        <div><dt>Requests</dt><dd>{totals.requests}</dd></div>
        <div><dt>Input tokens</dt><dd>{totals.inputTokens}</dd></div>
        <div><dt>Output tokens</dt><dd>{totals.outputTokens}</dd></div>
        <div><dt>Estimated cost</dt><dd>{estimatedCost(totals.estimatedCostUsd)}</dd></div>
      </dl>
    </section>
  );
}

export function EvaluationPage({ projectId }: { projectId?: string }) {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [modelId, setModelId] = useState("");
  const [taskCategory, setTaskCategory] = useState<TaskCategory | "">("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [temperature, setTemperature] = useState(String(DEFAULT_TEMPERATURE));
  const [maxTokens, setMaxTokens] = useState(String(DEFAULT_MAX_TOKENS));
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoadingConfiguration, setIsLoadingConfiguration] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [error, setError] = useState<AIProviderError | null>(null);

  const selectedModel = useMemo(
    () => models.find((model) => model.modelId === modelId),
    [modelId, models],
  );

  async function refreshUsage() {
    setUsage(await loadUsageSummary(projectId));
  }

  useEffect(() => {
    let active = true;
    Promise.all([loadModelRegistry(), loadUsageSummary(projectId)])
      .then(([registry, summary]) => {
        if (!active) return;
        const enabled = registry.filter((model) => model.enabled);
        setModels(enabled);
        setModelId(enabled[0]?.modelId ?? "");
        setUsage(summary);
      })
      .catch((configurationError) => {
        if (!active) return;
        setError({
          code: "LOCAL_CONFIGURATION_FAILED",
          message: providerErrorMessage(configurationError),
        });
      })
      .finally(() => {
        if (active) setIsLoadingConfiguration(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning || !selectedModel) return;

    setIsRunning(true);
    setResult(null);
    setError(null);
    try {
      const response = await runEvaluation(
        {
          model: selectedModel.modelId,
          systemPrompt: systemPrompt.trim() || undefined,
          userPrompt: userPrompt.trim(),
          temperature: Number(temperature),
          maxTokens: Number(maxTokens),
        },
        {
          projectId,
          taskCategory: taskCategory || undefined,
        },
      );
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
      try {
        await refreshUsage();
      } catch {
        // The evaluation result remains useful; the next page load retries the local summary.
      }
      setIsRunning(false);
    }
  }

  return (
    <div className="evaluation-stack">
      <section className="evaluation-card" aria-labelledby="evaluation-title">
        <span className="section-label">Registry-backed model lab</span>
        <h2 id="evaluation-title">AI Evaluation</h2>
        <p className="scope-note">
          Requests run only when you choose Run Evaluation. Prompt and response text remain transient;
          privacy-safe usage metadata is stored locally.
        </p>

        <form className="evaluation-form" onSubmit={(event) => void submit(event)}>
          <label>
            Model
            <select
              required
              value={modelId}
              disabled={isLoadingConfiguration || models.length === 0}
              onChange={(event) => setModelId(event.target.value)}
            >
              {models.length === 0 ? <option value="">No configured models</option> : null}
              {models.map((model) => (
                <option key={model.modelId} value={model.modelId}>{model.displayName}</option>
              ))}
            </select>
          </label>
          {selectedModel ? (
            <dl className="model-details" aria-label="Selected model details">
              <div><dt>Display name</dt><dd>{selectedModel.displayName}</dd></div>
              <div><dt>Exact model ID</dt><dd>{selectedModel.modelId}</dd></div>
              <div><dt>Provider</dt><dd>{selectedModel.provider}</dd></div>
              <div><dt>Pricing</dt><dd>{pricing(selectedModel)}</dd></div>
              <div><dt>Availability</dt><dd>{selectedModel.availability}</dd></div>
            </dl>
          ) : null}
          <label>
            Task category (optional)
            <select value={taskCategory} onChange={(event) => setTaskCategory(event.target.value as TaskCategory | "")}>
              <option value="">Uncategorized</option>
              {TASK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            System prompt (optional)
            <textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={3} />
          </label>
          <label>
            Evaluation prompt
            <textarea required value={userPrompt} onChange={(event) => setUserPrompt(event.target.value)} rows={7} />
          </label>
          <div className="evaluation-options">
            <label>
              Temperature
              <input type="number" min="0" max="2" step="0.1" required value={temperature} onChange={(event) => setTemperature(event.target.value)} />
            </label>
            <label>
              Maximum output tokens
              <input type="number" min="1" max="4096" required value={maxTokens} onChange={(event) => setMaxTokens(event.target.value)} />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={isRunning || !selectedModel}>
            {isRunning ? "Running Evaluation..." : "Run Evaluation"}
          </button>
        </form>
      </section>

      <section className="evaluation-card usage-summary" aria-labelledby="usage-title">
        <span className="section-label">Local privacy-safe accounting</span>
        <h2 id="usage-title">Usage Summary</h2>
        {usage ? (
          <>
            <UsageCards label="Current session" totals={usage.session} />
            {usage.project ? <UsageCards label="Current project" totals={usage.project} /> : null}
            <section className="usage-group" aria-label="Usage by model">
              <h3>By model</h3>
              {usage.byModel.length === 0 ? <p className="scope-note">No usage recorded for this scope.</p> : (
                <dl className="model-usage-list">
                  {usage.byModel.map((model) => (
                    <div key={`${model.provider}:${model.modelId}`}>
                      <dt>{model.modelId}</dt>
                      <dd>{model.requests} requests · {model.totalTokens} tokens · {model.averageLatencyMs ?? "No"} ms average · {estimatedCost(model.estimatedCostUsd)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          </>
        ) : <p className="scope-note">Loading local usage…</p>}
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
