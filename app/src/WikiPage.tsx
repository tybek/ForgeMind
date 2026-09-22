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
import { inspectUnityGroundTruth, type UnityGroundTruthResult } from "./platform/unityGroundTruth";
import { loadAlignmentResults, type AlignmentResult } from "./platform/alignment";
import { loadFeatureContracts, type FeatureContract } from "./platform/featureContracts";

interface WikiWorkspace {
  path: string;
}

type WikiTypeFilter = "ALL" | "KNOWLEDGE" | "DECISIONS" | "AI_ANALYSIS";

function messageFromError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "This project knowledge source could not be loaded.";
}

function displayEnum(value: string): string {
  return value.toLowerCase().split("_").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function entryCountLabel(count: number): string {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
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

export function WikiPage({
  workspace,
  initialArea = "overview",
  onEditKnowledge,
  onViewAlignmentHistory,
  onViewFeatureContracts,
}: {
  workspace: WikiWorkspace;
  initialArea?: KnowledgeArea;
  onEditKnowledge?: (entryId: string) => void;
  onViewAlignmentHistory?: () => void;
  onViewFeatureContracts?: (area: KnowledgeArea) => void;
}) {
  const [activeArea, setActiveArea] = useState<KnowledgeArea>(initialArea);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<WikiTypeFilter>("ALL");
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [runs, setRuns] = useState<SpecialistRun[]>([]);
  const [repository, setRepository] = useState<RepositorySnapshot | null>(null);
  const [unityReality, setUnityReality] = useState<UnityGroundTruthResult | null>(null);
  const [alignmentResults, setAlignmentResults] = useState<AlignmentResult[]>([]);
  const [featureContracts, setFeatureContracts] = useState<FeatureContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setKnowledge([]);
    setDecisions([]);
    setRuns([]);
    setRepository(null);
    setUnityReality(null);
    setAlignmentResults([]);
    setFeatureContracts([]);
    setErrors([]);
    void Promise.allSettled([
      loadCompendium(workspace.path),
      loadDecisions(workspace.path),
      loadSpecialistRuns(workspace.path),
      inspectRepositoryReality(workspace.path),
      inspectUnityGroundTruth(workspace.path),
      loadAlignmentResults(workspace.path),
      loadFeatureContracts(workspace.path),
    ]).then(([compendiumResult, decisionsResult, runsResult, repositoryResult, unityResult, alignmentResult, featureContractsResult]) => {
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
      if (unityResult.status === "fulfilled") setUnityReality(unityResult.value);
      else nextErrors.push(`Unity GroundTruth: ${messageFromError(unityResult.reason)}`);
      if (alignmentResult.status === "fulfilled") setAlignmentResults(alignmentResult.value?.results ?? []);
      else nextErrors.push(`Alignment: ${messageFromError(alignmentResult.reason)}`);
      if (featureContractsResult.status === "fulfilled") setFeatureContracts(featureContractsResult.value?.contracts ?? []);
      else nextErrors.push(`Feature Contracts: ${messageFromError(featureContractsResult.reason)}`);
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
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchesQuery = (...values: string[]) => normalizedQuery.length === 0
    || values.some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  const areaKnowledge = knowledge.filter((entry) => entry.area === activeArea
    && (typeFilter === "ALL" || typeFilter === "KNOWLEDGE")
    && matchesQuery(entry.title, entry.statement, entry.status, entry.provenance, entry.source));
  const areaDecisions = decisions.filter((decision) => decision.area === activeArea
    && (typeFilter === "ALL" || typeFilter === "DECISIONS")
    && matchesQuery(decision.title, decision.statement, decision.rationale, decision.status));
  const areaRuns = runs.filter((run) => analysisAreas.get(run.id)?.has(activeArea)
    && (typeFilter === "ALL" || typeFilter === "AI_ANALYSIS")
    && matchesQuery(run.result!.summary, run.scenario, run.taskType, ...run.result!.recommendations));
  const activeLabel = KNOWLEDGE_AREAS.find(([area]) => area === activeArea)?.[1] ?? activeArea;
  const visibleEntryCount = areaKnowledge.length + areaDecisions.length + areaRuns.length;
  const areaAlignments = alignmentResults.filter((result) => result.intent.area === activeArea);
  const approvedAlignments = areaAlignments.filter((result) => result.reviewState === "APPROVED");
  const pendingAlignmentCount = areaAlignments.filter((result) => result.reviewState === "PENDING_REVIEW").length;
  const latestApprovedAlignment = approvedAlignments.reduce<AlignmentResult | null>((latest, result) => (
    latest === null || result.createdAt > latest.createdAt ? result : latest
  ), null);
  const areaFeatureContracts = featureContracts.filter((contract) => contract.sources.intent.area === activeArea);
  const approvedFeatureContracts = areaFeatureContracts.filter((contract) => contract.status === "APPROVED");
  const draftFeatureContractCount = areaFeatureContracts.filter((contract) => contract.status === "DRAFT").length;
  const latestApprovedFeatureContract = approvedFeatureContracts.reduce<FeatureContract | null>((latest, contract) => (
    latest === null || contract.updatedAt > latest.updatedAt ? contract : latest
  ), null);

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
            <span>{label}</span><small>{entryCountLabel(countForArea(area))}</small>
          </button>
        ))}
      </nav>

      <section className="wiki-controls" aria-label="Wiki search and filters">
        <label>
          Search
          <input type="search" value={query} placeholder="Search titles, statements, and analysis" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          Type
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as WikiTypeFilter)}>
            <option value="ALL">All</option>
            <option value="KNOWLEDGE">Knowledge</option>
            <option value="DECISIONS">Decisions</option>
            <option value="AI_ANALYSIS">AI Analysis</option>
          </select>
        </label>
      </section>

      {errors.length > 0 ? <div className="wiki-source-warning" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      {loading ? <p aria-live="polite">Loading Game Wiki...</p> : (
        <section className="wiki-area" aria-labelledby="wiki-area-title">
          <div className="wiki-area-heading">
            <h3 id="wiki-area-title">{activeLabel}</h3>
            <span>{entryCountLabel(visibleEntryCount)}</span>
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
          {activeArea === "technical" && unityReality ? (
            <aside className="wiki-repository-reality" aria-label="Unity Reality summary">
              <span className="wiki-type wiki-type-reality">Unity Reality</span>
              <dl>
                <div><dt>Project</dt><dd>{unityReality.status === "DETECTED" ? "Detected" : unityReality.status === "NOT_DETECTED" ? "Not detected" : "Inspection failed"}</dd></div>
                <div><dt>Unity version</dt><dd>{unityReality.projectVersion.version ?? "Unavailable"}</dd></div>
                <div><dt>Manifest</dt><dd>{unityReality.manifest.status === "AVAILABLE" ? "Available" : unityReality.manifest.status === "INVALID_OR_UNSUPPORTED" ? "Invalid / unsupported" : "Not generated"}</dd></div>
                {unityReality.manifest.summary ? <div><dt>Snapshot</dt><dd>{`${unityReality.manifest.summary.observationCounts.scenes} scenes, ${unityReality.manifest.summary.observationCounts.gameObjects} GameObjects, ${unityReality.manifest.summary.observationCounts.components} components, ${unityReality.manifest.summary.observationCounts.scriptableObjects} ScriptableObjects`}</dd></div> : null}
              </dl>
              <p>{unityReality.status === "DETECTED" ? `VERIFIED FROM UNITY — project evidence only; manifest ${unityReality.manifest.status === "AVAILABLE" ? "available" : unityReality.manifest.status === "INVALID_OR_UNSUPPORTED" ? "invalid / unsupported" : "not generated"}.` : "Unity evidence is unavailable; no implementation fact is inferred."}</p>
            </aside>
          ) : null}
          {areaAlignments.length > 0 ? (
            <aside className="wiki-repository-reality wiki-alignment-summary" aria-label="Alignment summary">
              <div className="wiki-alignment-summary-heading">
                <span className="wiki-type wiki-type-alignment">Alignment</span>
                <small>Derived summary · not a Wiki entry</small>
              </div>
              <dl>
                {latestApprovedAlignment ? <div><dt>Latest approved status</dt><dd>{displayEnum(latestApprovedAlignment.status)}</dd></div> : null}
                <div><dt>Approved reviews</dt><dd>{approvedAlignments.length}</dd></div>
                <div><dt>Pending reviews</dt><dd>{pendingAlignmentCount}</dd></div>
                <div><dt>Total reviews</dt><dd>{areaAlignments.length}</dd></div>
              </dl>
              <p>Alignment remains a derived, evidence-backed interpretation; reviews are not counted as Wiki entries.</p>
              {onViewAlignmentHistory ? <button className="outline-button compact-action wiki-summary-action" type="button" onClick={onViewAlignmentHistory}>View Alignment History</button> : null}
            </aside>
          ) : null}
          {areaFeatureContracts.length > 0 ? (
            <aside className="wiki-repository-reality wiki-feature-contract-summary" aria-label="Feature Contract summary">
              <div className="wiki-alignment-summary-heading">
                <span className="wiki-type wiki-type-contract">Feature Contract</span>
                <small>Derived delivery summary · not a Wiki entry</small>
              </div>
              <dl>
                {latestApprovedFeatureContract ? <div><dt>Latest approved</dt><dd>{latestApprovedFeatureContract.title}</dd></div> : null}
                <div><dt>Approved contracts</dt><dd>{approvedFeatureContracts.length}</dd></div>
                <div><dt>Draft contracts</dt><dd>{draftFeatureContractCount}</dd></div>
                <div><dt>Total contracts</dt><dd>{areaFeatureContracts.length}</dd></div>
              </dl>
              <p>Compact read-only handoff status; contract editing remains in the Feature Contracts workspace.</p>
              {onViewFeatureContracts ? <button className="outline-button compact-action wiki-summary-action" type="button" onClick={() => onViewFeatureContracts(activeArea)}>View Feature Contracts</button> : null}
            </aside>
          ) : null}
          {areaKnowledge.length === 0 && areaDecisions.length === 0 && areaRuns.length === 0 ? (
            <p className="wiki-empty">No project knowledge is associated with this area yet.</p>
          ) : (
            <div className="wiki-rows">
              {areaKnowledge.map((entry) => (
                <details className="wiki-row" key={`knowledge-${entry.id}`}>
                  <summary>
                    <span className="wiki-tags"><span className="wiki-type wiki-type-knowledge">Knowledge</span><span className="wiki-type">{displayEnum(entry.status)}</span></span>
                    <strong>{entry.title}</strong>
                  </summary>
                  <div className="wiki-row-detail">
                    <p>{entry.statement}</p>
                    <dl className="wiki-metadata">
                      <div><dt>Authority</dt><dd>Game Compendium</dd></div>
                      <div><dt>Provenance</dt><dd>{displayEnum(entry.provenance)}</dd></div>
                      <div><dt>Source</dt><dd>{displayEnum(entry.source)}</dd></div>
                    </dl>
                    {onEditKnowledge ? <button className="outline-button compact-action" type="button" onClick={() => onEditKnowledge(entry.id)}>Edit in Compendium</button> : null}
                  </div>
                </details>
              ))}
              {areaDecisions.map((decision) => (
                <details className="wiki-row" key={`decision-${decision.id}`}>
                  <summary>
                    <span className="wiki-tags"><span className="wiki-type wiki-type-decision">Decision</span><span className={`wiki-type wiki-type-${decision.status.toLowerCase()}`}>{displayEnum(decision.status)}</span></span>
                    <strong>{decision.title}</strong>
                  </summary>
                  <div className="wiki-row-detail">
                    <p>{decision.statement}</p><p>Rationale: {decision.rationale}</p>
                    <dl className="wiki-metadata"><div><dt>Authority</dt><dd>Decision record</dd></div><div><dt>State</dt><dd>{displayEnum(decision.status)}</dd></div></dl>
                  </div>
                </details>
              ))}
              {areaRuns.map((run) => (
                <details className="wiki-row" key={`analysis-${run.id}`}>
                  <summary><span className="wiki-tags"><span className="wiki-type wiki-type-analysis">AI Analysis</span><span className="wiki-type">{displayEnum(run.taskType)}</span></span><strong>{run.result!.summary}</strong></summary>
                  <div className="wiki-row-detail">
                    <p className="wiki-analysis-warning">AI working analysis — not approved project knowledge</p>
                    <p>Scenario: {run.scenario}</p>
                    {run.result!.recommendations.length > 0 ? <><h4>Recommendations</h4><ul>{run.result!.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></> : null}
                    <dl className="wiki-metadata"><div><dt>Authority</dt><dd>Non-authoritative analysis</dd></div><div><dt>Source</dt><dd>Specialist Analysis History</dd></div></dl>
                    <p>This aggregation view does not approve or rewrite it.</p>
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
