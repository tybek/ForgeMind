import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addCustomModel,
  enableAvailableModel,
  loadModelManagementState,
  loadObservedModelMetrics,
  refreshModelCatalog,
  setModelEnabled,
  type ModelEntry,
  type ModelManagementState,
  type ObservedModelMetrics,
} from "./platform/modelRegistry";

const DEFAULT_MODEL_ID = "nvidia/nemotron-3-super-120b-a12b";

function messageFrom(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return "ForgeMind could not update model management.";
}

function capability(model: ModelEntry): string {
  if (model.capabilities.structuredOutput === "JSON_OBJECT") return "JSON Object";
  if (model.capabilities.structuredOutput === "JSON_SCHEMA") return "JSON Schema";
  return "Not verified";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function Metrics({ metrics }: { metrics?: ObservedModelMetrics }) {
  if (!metrics) return <p className="models-no-runs">No observed runs</p>;
  return <dl className="models-metrics" aria-label="Observed in this ForgeMind installation">
    <div><dt>Runs</dt><dd>{metrics.runCount}</dd></div>
    <div><dt>Median latency</dt><dd>{metrics.medianLatencyMs == null ? "Unavailable" : `${metrics.medianLatencyMs.toLocaleString()} ms`}</dd></div>
    <div><dt>Input tokens</dt><dd>{metrics.inputTokens.toLocaleString()}</dd></div>
    <div><dt>Output tokens</dt><dd>{metrics.outputTokens.toLocaleString()}</dd></div>
    <div><dt>Last used</dt><dd>{formatDate(metrics.lastUsed)}</dd></div>
  </dl>;
}

export function ModelsPage() {
  const [state, setState] = useState<ModelManagementState | null>(null);
  const [metrics, setMetrics] = useState<ObservedModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customId, setCustomId] = useState("");
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([loadModelManagementState(), loadObservedModelMetrics()])
      .then(([next, observed]) => { if (active) { setState(next); setMetrics(observed); } })
      .catch((reason) => { if (active) setError(messageFrom(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const enabled = state?.registry.filter((model) => model.enabled) ?? [];
  const registryById = useMemo(() => new Map((state?.registry ?? []).map((model) => [model.modelId, model])), [state]);
  const metricsById = useMemo(() => new Map(metrics.map((item) => [item.modelId, item])), [metrics]);
  const catalogModels = state?.catalog?.models ?? [];
  const disabledRegistryModels = (state?.registry ?? []).filter((model) => !model.enabled && !catalogModels.some((available) => available.providerModelId === model.modelId)).map((model) => ({
    providerModelId: model.modelId,
    displayName: model.displayName,
    provider: model.provider,
    discoveredAt: "",
    availability: "AVAILABLE" as const,
  }));
  const available = [...catalogModels, ...disabledRegistryModels].filter((model) => {
    if (registryById.get(model.providerModelId)?.enabled) return false;
    const needle = query.trim().toLocaleLowerCase();
    return !needle || model.providerModelId.toLocaleLowerCase().includes(needle) || model.displayName.toLocaleLowerCase().includes(needle);
  });

  async function act(label: string, operation: () => Promise<ModelManagementState>) {
    setWorking(label); setError(null);
    try { setState(await operation()); }
    catch (reason) { setError(messageFrom(reason)); }
    finally { setWorking(null); }
  }

  async function submitCustom(event: FormEvent) {
    event.preventDefault();
    await act("custom", () => addCustomModel(customId, customName));
    setCustomId(""); setCustomName(""); setShowCustom(false);
  }

  if (loading) return <p role="status">Loading application-local model registry…</p>;

  return <div className="models-page">
    <section className="models-provider-card" aria-label="Nebius Token Factory catalog">
      <div>
        <span className="section-label">Provider catalog</span>
        <h2>Nebius Token Factory</h2>
        <p>{state?.providerConfigured ? "Connected" : "Not configured — set NEBIUS_API_KEY before launching ForgeMind."}</p>
        <small>{state?.catalog ? `Last refreshed ${formatDate(state.catalog.refreshedAt)}` : "Catalog has not been refreshed on this installation."}</small>
      </div>
      <button className="outline-button" type="button" disabled={Boolean(working) || !state?.providerConfigured} onClick={() => void act("refresh", refreshModelCatalog)}>
        {working === "refresh" ? "Refreshing…" : "Refresh catalog"}
      </button>
    </section>

    {error ? <p className="models-error" role="alert">{error}</p> : null}

    <section className="models-section">
      <header><div><span className="section-label">ForgeMind registry</span><h2>Enabled models</h2><p>These models are selectable where the owning workflow permits them. Capability labels come only from explicit ForgeMind metadata.</p></div>
        <button className="outline-button" type="button" onClick={() => setShowCustom((value) => !value)}>+ Add model ID</button>
      </header>
      {showCustom ? <form className="models-custom-form" onSubmit={(event) => void submitCustom(event)}>
        <label>Provider model ID<input value={customId} required maxLength={200} placeholder="vendor/model-id" onChange={(event) => setCustomId(event.target.value)} /></label>
        <label>Friendly display name <small>Optional</small><input value={customName} maxLength={120} onChange={(event) => setCustomName(event.target.value)} /></label>
        <button className="primary-button" disabled={Boolean(working)} type="submit">Add and enable</button>
      </form> : null}
      <div className="models-card-list">
        {enabled.map((model) => <article className="models-card" key={model.modelId}>
          <div className="models-card-heading"><div><h3>{model.displayName}</h3><code>{model.modelId}</code></div><div className="models-badges">
            {model.modelId === DEFAULT_MODEL_ID ? <span>Default</span> : <span>Enabled</span>}
            <span>{catalogModels.some((available) => available.providerModelId === model.modelId) ? "Available on Token Factory" : model.availability === "UNVERIFIED" ? "Custom · availability not verified" : "Configured"}</span>
          </div></div>
          <p><strong>Structured output:</strong> {capability(model)}</p>
          <Metrics metrics={metricsById.get(model.modelId)} />
          <button className="text-button" type="button" disabled={Boolean(working) || model.modelId === DEFAULT_MODEL_ID} title={model.modelId === DEFAULT_MODEL_ID ? "Choose a replacement default before disabling this model." : undefined} onClick={() => void act(model.modelId, () => setModelEnabled(model.modelId, false))}>Disable</button>
        </article>)}
      </div>
    </section>

    <section className="models-section">
      <header><div><span className="section-label">Provider discovery</span><h2>Available models</h2><p>Availability does not imply verified capability, quality, pricing, or task suitability.</p></div></header>
      {catalogModels.length + disabledRegistryModels.length > 8 ? <label className="models-search">Search catalog<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label> : null}
      {!state?.catalog && disabledRegistryModels.length === 0 ? <p className="models-empty">Refresh the catalog explicitly to discover models. ForgeMind does not poll automatically.</p> : available.length === 0 ? <p className="models-empty">No catalog or disabled registry models match this view.</p> : <div className="models-available-list">
        {available.slice(0, 50).map((model) => <article key={model.providerModelId}><div><strong>{model.displayName}</strong><code>{model.providerModelId}</code><small>{registryById.has(model.providerModelId) ? "Disabled in ForgeMind" : "Available on Token Factory"} · Structured output: {registryById.get(model.providerModelId) ? capability(registryById.get(model.providerModelId)!) : "Not verified"}</small></div>
          <button className="outline-button" type="button" disabled={Boolean(working)} onClick={() => void act(model.providerModelId, () => registryById.has(model.providerModelId) ? setModelEnabled(model.providerModelId, true) : enableAvailableModel(model.providerModelId))}>Enable</button></article>)}
      </div>}
      {available.length > 50 ? <p className="models-empty">Showing the first 50 matches. Refine the local search to narrow the catalog.</p> : null}
    </section>
  </div>;
}
