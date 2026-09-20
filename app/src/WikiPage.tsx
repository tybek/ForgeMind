import { useEffect, useMemo, useState } from "react";
import { loadDecisions, type Decision } from "./platform/decisions";
import {
  KNOWLEDGE_AREAS,
  loadCompendium,
  type KnowledgeArea,
  type KnowledgeEntry,
} from "./platform/projectKnowledge";
import { loadSpecialistRuns, type SpecialistRun } from "./platform/specialists";
import { inspectRepositoryReality, type RepositorySnapshot } from "./platform/repositoryReality";

interface WikiWorkspace {
  path: string;
}

function messageFromError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "This project knowledge source could not be loaded.";
}

function decisionType(decision: Decision): string {
  return decision.status === "APPROVED"
    ? "Approved Decision"
    : `${decision.status[0]}${decision.status.slice(1).toLowerCase()} Decision`;
}

function relevantAnalysisAreas(
  run: SpecialistRun,
  knowledgeById: Map<string, KnowledgeEntry>,
  decisionsById: Map<string, Decision>,
): Set<KnowledgeArea> {
  const areas = new Set<KnowledgeArea>();
  run.selectedKnowledgeEntryIds.forEach((id) => {
    const entry = knowledgeById.get(id);
    if (entry) areas.add(entry.area);
  });
  run.selectedDecisionIds.forEach((id) => {
    const decision = decisionsById.get(id);
    if (decision) areas.add(decision.area);
  });
  if (areas.size === 0) areas.add("overview");
  return areas;
}

export function WikiPage({ workspace }: { workspace: WikiWorkspace }) {
  const [activeArea, setActiveArea] = useState<KnowledgeArea>("overview");
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [runs, setRuns] = useState<SpecialistRun[]>([]);
  const [repository, setRepository] = useState<RepositorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setKnowledge([]);
    setDecisions([]);
    setRuns([]);
    setRepository(null);
    setErrors([]);
    void Promise.allSettled([
      loadCompendium(workspace.path),
      loadDecisions(workspace.path),
      loadSpecialistRuns(workspace.path),
      inspectRepositoryReality(workspace.path),
    ]).then(([compendiumResult, decisionsResult, runsResult, repositoryResult]) => {
      if (!active) return;
      const nextErrors: string[] = [];
      if (compendiumResult.status === "fulfilled") setKnowledge(compendiumResult.value?.entries ?? []);
      else nextErrors.push(`Compendium: ${messageFromError(compendiumResult.reason)}`);
      if (decisionsResult.status === "fulfilled") setDecisions(decisionsResult.value?.decisions ?? []);
      else nextErrors.push(`Decisions: ${messageFromError(decisionsResult.reason)}`);
      if (runsResult.status === "fulfilled") {
        setRuns((runsResult.value?.runs ?? []).filter((run) => run.status === "SUCCEEDED" && run.result));
      } else nextErrors.push(`Specialist History: ${messageFromError(runsResult.reason)}`);
      if (repositoryResult.status === "fulfilled" && repositoryResult.value.status === "DETECTED") {
        setRepository(repositoryResult.value.repository ?? null);
      }
      setErrors(nextErrors);
      setLoading(false);
    });
    return () => { active = false; };
  }, [workspace.path]);

  const knowledgeById = useMemo(() => new Map(knowledge.map((entry) => [entry.id, entry])), [knowledge]);
  const decisionsById = useMemo(() => new Map(decisions.map((decision) => [decision.id, decision])), [decisions]);
  const analysisAreas = useMemo(
    () => new Map(runs.map((run) => [run.id, relevantAnalysisAreas(run, knowledgeById, decisionsById)])),
    [runs, knowledgeById, decisionsById],
  );
  const areaKnowledge = knowledge.filter((entry) => entry.area === activeArea);
  const areaDecisions = decisions.filter((decision) => decision.area === activeArea);
  const areaRuns = runs.filter((run) => analysisAreas.get(run.id)?.has(activeArea));
  const activeLabel = KNOWLEDGE_AREAS.find(([area]) => area === activeArea)?.[1] ?? activeArea;

  function countForArea(area: KnowledgeArea): number {
    return knowledge.filter((entry) => entry.area === area).length
      + decisions.filter((decision) => decision.area === area).length
      + runs.filter((run) => analysisAreas.get(run.id)?.has(area)).length;
  }

  return (
    <div className="wiki-page">
      <section className="wiki-intro">
        <span className="section-label">Aggregated project knowledge</span>
        <h2>Game Wiki</h2>
        <p>Browse Compendium knowledge, Decisions, and related specialist analysis together. Their original stores remain authoritative.</p>
      </section>

      <nav className="wiki-area-nav" aria-label="Wiki areas">
        {KNOWLEDGE_AREAS.map(([area, label]) => (
          <button
            type="button"
            key={area}
            aria-current={activeArea === area ? "page" : undefined}
            className={activeArea === area ? "wiki-area-active" : ""}
            onClick={() => setActiveArea(area)}
          >
            <span>{label}</span><small>{countForArea(area)}</small>
          </button>
        ))}
      </nav>

      {errors.length > 0 ? <div className="wiki-source-warning" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      {loading ? <p aria-live="polite">Loading Game Wiki...</p> : (
        <section className="wiki-area" aria-labelledby="wiki-area-title">
          <div className="wiki-area-heading">
            <h3 id="wiki-area-title">{activeLabel}</h3>
            <span>{areaKnowledge.length + areaDecisions.length + areaRuns.length} entries</span>
          </div>
          {(activeArea === "technical" || activeArea === "production") && repository ? (
            <aside className="wiki-repository-reality" aria-label="Repository Reality summary">
              <span className="wiki-type wiki-type-reality">Repository Reality</span>
              <dl>
                <div><dt>Branch</dt><dd>{repository.detachedHead ? "Detached HEAD" : repository.branch}</dd></div>
                <div><dt>Working tree</dt><dd>{repository.workingTree === "CLEAN" ? "Clean" : `${repository.totalChangedFiles} changed, ${repository.changedFiles.filter((file) => file.untracked).length} untracked`}</dd></div>
                <div><dt>HEAD</dt><dd><code>{repository.head.shortHash}</code> — {repository.head.subject}</dd></div>
              </dl>
              <p>Implementation Evidence only; this does not establish project intent or feature completion.</p>
            </aside>
          ) : null}
          {areaKnowledge.length === 0 && areaDecisions.length === 0 && areaRuns.length === 0 ? (
            <p className="wiki-empty">No project knowledge is associated with this area yet.</p>
          ) : (
            <div className="wiki-rows">
              {areaKnowledge.map((entry) => (
                <details className="wiki-row" key={`knowledge-${entry.id}`}>
                  <summary><span className="wiki-type wiki-type-knowledge">Knowledge</span><strong>{entry.title}</strong><small>{entry.status}</small></summary>
                  <div className="wiki-row-detail"><p>{entry.statement}</p><p>Authority: Compendium · Provenance: {entry.provenance} · Source: {entry.source}</p></div>
                </details>
              ))}
              {areaDecisions.map((decision) => (
                <details className="wiki-row" key={`decision-${decision.id}`}>
                  <summary><span className={`wiki-type wiki-type-decision wiki-type-${decision.status.toLowerCase()}`}>{decisionType(decision)}</span><strong>{decision.title}</strong></summary>
                  <div className="wiki-row-detail"><p>{decision.statement}</p><p>Rationale: {decision.rationale}</p><p>Authority: Decision record · Status: {decision.status}</p></div>
                </details>
              ))}
              {areaRuns.map((run) => (
                <details className="wiki-row" key={`analysis-${run.id}`}>
                  <summary><span className="wiki-type wiki-type-analysis">AI Analysis</span><strong>{run.result!.summary}</strong><small>{run.taskType}</small></summary>
                  <div className="wiki-row-detail">
                    <p className="wiki-analysis-warning">AI working analysis — not approved project knowledge</p>
                    <p>Scenario: {run.scenario}</p>
                    {run.result!.recommendations.length > 0 ? <><h4>Recommendations</h4><ul>{run.result!.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></> : null}
                    <p>Stored in Specialist Analysis History. This view does not approve or rewrite it.</p>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
