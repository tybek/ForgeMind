import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadDecisions, type Decision } from "./platform/decisions";
import { loadModelRegistry, type ModelEntry } from "./platform/modelRegistry";
import { loadCompendium, type KnowledgeEntry } from "./platform/projectKnowledge";
import {
  loadSpecialistProfiles,
  runSpecialistAnalysis,
  type SpecialistAnalysisResult,
  type SpecialistProfile,
  type SpecialistTaskType,
} from "./platform/specialists";

interface SpecialistWorkspace {
  path: string;
  projectId: string;
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "AI Behavior Designer could not complete the analysis.";
}

function usage(value: number | undefined): string {
  return value === undefined ? "Not provided" : String(value);
}

function estimatedCost(result: SpecialistAnalysisResult, model: ModelEntry | undefined): string {
  if (!model?.pricing || result.inputTokens === undefined || result.outputTokens === undefined) return "Unavailable";
  const cost = (result.inputTokens * model.pricing.inputUsdPerMillionTokens
    + result.outputTokens * model.pricing.outputUsdPerMillionTokens) / 1_000_000;
  return `$${cost.toFixed(6)} (Estimated)`;
}

function ResultList({ title, items, className = "" }: { title: string; items: string[]; className?: string }) {
  return (
    <section className={`specialist-result-section ${className}`.trim()} aria-label={title}>
      <h3>{title}</h3>
      {items.length > 0 ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>None provided.</p>}
    </section>
  );
}

export function SpecialistPage({ workspace }: { workspace: SpecialistWorkspace }) {
  const [profile, setProfile] = useState<SpecialistProfile | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [taskType, setTaskType] = useState<SpecialistTaskType | "">("");
  const [modelId, setModelId] = useState("");
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [selectedDecisions, setSelectedDecisions] = useState<string[]>([]);
  const [scenario, setScenario] = useState("");
  const [result, setResult] = useState<SpecialistAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(() => models.find((model) => model.modelId === modelId), [modelId, models]);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadSpecialistProfiles(),
      loadModelRegistry(),
      loadCompendium(workspace.path),
      loadDecisions(workspace.path),
    ]).then(([profiles, registry, compendium, decisionDocument]) => {
      if (!active) return;
      const behaviorProfile = profiles.find((candidate) => candidate.id === "ai_behavior_designer") ?? null;
      const enabledModels = registry.filter((model) => model.enabled);
      setProfile(behaviorProfile);
      setTaskType(behaviorProfile?.defaultTaskType ?? "");
      setModels(enabledModels);
      setModelId(enabledModels[0]?.modelId ?? "");
      setKnowledge(compendium?.entries.filter((entry) => entry.status !== "DEPRECATED") ?? []);
      setDecisions(decisionDocument?.decisions.filter((decision) => decision.status === "APPROVED") ?? []);
    }).catch((loadError) => {
      if (active) setError(errorMessage(loadError));
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [workspace.path]);

  function toggle(id: string, selected: string[], update: (ids: string[]) => void) {
    update(selected.includes(id) ? selected.filter((candidate) => candidate !== id) : [...selected, id]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning || !profile || !taskType || !selectedModel) return;
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runSpecialistAnalysis({
        rootPath: workspace.path,
        projectId: workspace.projectId,
        profileId: profile.id,
        taskType,
        modelId: selectedModel.modelId,
        knowledgeEntryIds: selectedKnowledge,
        decisionIds: selectedDecisions,
        scenario: scenario.trim(),
      }));
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setIsRunning(false);
    }
  }

  if (isLoading) return <section className="specialist-card"><p className="scope-note">Loading specialist workspace…</p></section>;

  return (
    <div className="specialist-stack">
      <section className="specialist-card" aria-labelledby="specialist-title">
        <span className="section-label">Project-brain specialist profile</span>
        <h2 id="specialist-title">{profile?.displayName ?? "AI Behavior Designer"}</h2>
        <p className="scope-note">{profile?.description ?? "This specialist profile is unavailable."}</p>
        <p className="scope-note">Every run is explicit. Selected project knowledge is supplied as evidence; the result is an AI proposal, not simulated or verified gameplay.</p>

        <form className="specialist-form" onSubmit={(event) => void submit(event)}>
          <div className="specialist-controls">
            <label>
              Task Type
              <select value={taskType} required onChange={(event) => setTaskType(event.target.value as SpecialistTaskType)}>
                {profile?.supportedTaskTypes.map((task) => <option key={task} value={task}>{task}</option>)}
              </select>
            </label>
            <label>
              Model
              <select value={modelId} required disabled={models.length === 0} onChange={(event) => setModelId(event.target.value)}>
                {models.length === 0 ? <option value="">No configured models</option> : null}
                {models.map((model) => <option key={model.modelId} value={model.modelId}>{model.displayName}</option>)}
              </select>
            </label>
          </div>

          <fieldset className="specialist-context">
            <legend>Project Context</legend>
            <p>Select up to 8 current Compendium entries. Unselected knowledge is not sent.</p>
            {knowledge.length === 0 ? <p>No current Compendium entries available.</p> : knowledge.map((entry) => (
              <label key={entry.id}>
                <input type="checkbox" checked={selectedKnowledge.includes(entry.id)} disabled={!selectedKnowledge.includes(entry.id) && selectedKnowledge.length >= 8}
                  onChange={() => toggle(entry.id, selectedKnowledge, setSelectedKnowledge)} />
                <span><strong>{entry.title}</strong><small>{entry.statement}</small></span>
              </label>
            ))}
          </fieldset>

          <fieldset className="specialist-context">
            <legend>Related Approved Decisions</legend>
            <p>Select up to 6. Proposed, superseded, and deprecated Decisions are excluded.</p>
            {decisions.length === 0 ? <p>No approved Decisions available.</p> : decisions.map((decision) => (
              <label key={decision.id}>
                <input type="checkbox" checked={selectedDecisions.includes(decision.id)} disabled={!selectedDecisions.includes(decision.id) && selectedDecisions.length >= 6}
                  onChange={() => toggle(decision.id, selectedDecisions, setSelectedDecisions)} />
                <span><strong>{decision.title}</strong><small>{decision.statement}</small></span>
              </label>
            ))}
          </fieldset>

          <label>
            Scenario / Question
            <textarea required maxLength={4000} rows={6} value={scenario} onChange={(event) => setScenario(event.target.value)} />
            <small>Transient task input · {scenario.length}/4000 characters</small>
          </label>
          <button className="primary-button" type="submit" disabled={isRunning || !profile || !taskType || !selectedModel || scenario.trim().length === 0}>
            {isRunning ? "Running Analysis…" : "Run Analysis"}
          </button>
        </form>
      </section>

      {error ? <section className="specialist-error" role="alert"><strong>Analysis failed</strong><p>{error}</p></section> : null}

      {result ? (
        <section className="specialist-card specialist-result" aria-labelledby="specialist-result-title">
          <span className="section-label">AI-generated proposal</span>
          <h2 id="specialist-result-title">Analysis Result</h2>
          <p>{result.result.summary}</p>
          <ResultList title="Assumptions — not project facts" items={result.result.assumptions} className="specialist-assumptions" />
          <ResultList title="Recommendations" items={result.result.recommendations} />
          <ResultList title="Risks" items={result.result.risks} />
          <ResultList title="Likely Exploits" items={result.result.exploits} />
          <ResultList title="Open Questions" items={result.result.openQuestions} />
          <ResultList title="Suggested Tests" items={result.result.suggestedTests} />

          <section className="specialist-evidence" aria-label="Context used">
            <h3>Context used</h3>
            <p>User scenario plus these explicitly selected project references:</p>
            {result.selectedKnowledgeEntryIds.length === 0 && result.selectedDecisionIds.length === 0 ? <p>No project references selected.</p> : (
              <ul>
                {result.selectedKnowledgeEntryIds.map((id) => <li key={id}>Compendium: {knowledge.find((entry) => entry.id === id)?.title ?? id}</li>)}
                {result.selectedDecisionIds.map((id) => <li key={id}>Approved Decision: {decisions.find((decision) => decision.id === id)?.title ?? id}</li>)}
              </ul>
            )}
          </section>
          <dl className="result-metadata" aria-label="Specialist usage">
            <div><dt>Model</dt><dd>{result.model}</dd></div>
            <div><dt>Latency</dt><dd>{result.latencyMs} ms</dd></div>
            <div><dt>Input tokens</dt><dd>{usage(result.inputTokens)}</dd></div>
            <div><dt>Output tokens</dt><dd>{usage(result.outputTokens)}</dd></div>
            <div><dt>Total tokens</dt><dd>{usage(result.totalTokens)}</dd></div>
            <div><dt>Estimated cost</dt><dd>{estimatedCost(result, selectedModel)}</dd></div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
