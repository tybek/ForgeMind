import { useEffect, useMemo, useState } from "react";
import { KnowledgeImportPanel } from "./KnowledgeImportPanel";
import { loadAlignmentResults, type AlignmentResult } from "./platform/alignment";
import { loadDecisions, type Decision } from "./platform/decisions";
import { loadFeatureContracts, type FeatureContract } from "./platform/featureContracts";
import { KNOWLEDGE_AREAS, loadCompendium, type KnowledgeArea, type KnowledgeEntry } from "./platform/projectKnowledge";
import type { RepositoryRealityResult } from "./platform/repositoryReality";
import { loadSpecialistRuns, type SpecialistRun } from "./platform/specialists";
import type { UnityGroundTruthResult } from "./platform/unityGroundTruth";
import {
  buildWikiItems,
  countWikiCategory,
  filterWikiItems,
  type WikiAuthorityFilter,
  type WikiCategory,
  type WikiItemKind,
  type WikiKnowledgeItem,
  type WikiLifecycleFilter,
  type WikiTypeFilter,
} from "./platform/wikiKnowledge";

interface WikiWorkspace {
  path: string;
  projectId: string;
}

const CATEGORY_OPTIONS: ReadonlyArray<readonly [WikiCategory, string]> = [
  ["all", "All Knowledge"],
  ["design_pillars", "Design Pillars"],
  ["decisions", "Decisions"],
  ...KNOWLEDGE_AREAS,
];

function messageFromError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
  return "This project knowledge source could not be loaded.";
}

function humanize(value: string): string {
  return value.toLocaleLowerCase().split("_").map((part) => `${part[0]?.toLocaleUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function unityManifestLabel(result: UnityGroundTruthResult): string {
  switch (result.manifest.status) {
    case "AVAILABLE": return "Available";
    case "NOT_ATTACHED": return "Not attached";
    case "INVALID_OR_UNSUPPORTED": return "Invalid";
    default: return "Not generated";
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function kindLabel(kind: WikiItemKind): string {
  switch (kind) {
    case "OPEN_QUESTION": return "Open question";
    case "DECISION": return "Decision";
    case "AI_ANALYSIS": return "AI analysis";
    default: return "Knowledge";
  }
}

function categoryArea(category: WikiCategory): KnowledgeArea | null {
  if (category === "design_pillars") return "game_vision";
  if (category === "all" || category === "decisions") return null;
  return category;
}

function detailActionLabel(item: WikiKnowledgeItem): string {
  if (item.kind === "OPEN_QUESTION") return "Open question in Game Design";
  if (item.kind === "KNOWLEDGE") return "Open in Game Design";
  if (item.kind === "DECISION") return "Open Decisions";
  return "Open AI Behavior Designer";
}

export function WikiPage({
  workspace,
  initialArea = "overview",
  repositoryReality = null,
  unityGroundTruth = null,
  onEditKnowledge,
  onOpenDecisions,
  onOpenProjectInterview,
  onOpenSpecialist,
  onOpenRepository,
  onOpenUnity,
  onViewAlignmentHistory,
  onViewFeatureContracts,
}: {
  workspace: WikiWorkspace;
  initialArea?: KnowledgeArea;
  repositoryReality?: RepositoryRealityResult | null;
  unityGroundTruth?: UnityGroundTruthResult | null;
  onEditKnowledge?: (entryId: string) => void;
  onOpenDecisions?: () => void;
  onOpenProjectInterview?: () => void;
  onOpenSpecialist?: () => void;
  onOpenRepository?: () => void;
  onOpenUnity?: () => void;
  onViewAlignmentHistory?: () => void;
  onViewFeatureContracts?: (area: KnowledgeArea) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<WikiCategory>(initialArea);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<WikiTypeFilter>("ALL");
  const [authorityFilter, setAuthorityFilter] = useState<WikiAuthorityFilter>("ALL");
  const [lifecycleFilter, setLifecycleFilter] = useState<WikiLifecycleFilter>("CURRENT");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [runs, setRuns] = useState<SpecialistRun[]>([]);
  const [alignmentResults, setAlignmentResults] = useState<AlignmentResult[]>([]);
  const [featureContracts, setFeatureContracts] = useState<FeatureContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setKnowledge([]);
    setDecisions([]);
    setRuns([]);
    setAlignmentResults([]);
    setFeatureContracts([]);
    setErrors([]);
    void Promise.allSettled([
      loadCompendium(workspace.path),
      loadDecisions(workspace.path),
      loadSpecialistRuns(workspace.path),
      loadAlignmentResults(workspace.path),
      loadFeatureContracts(workspace.path),
    ]).then(([compendiumResult, decisionsResult, runsResult, alignmentResult, featureContractsResult]) => {
      if (!active) return;
      const nextErrors: string[] = [];
      if (compendiumResult.status === "fulfilled") setKnowledge(compendiumResult.value?.entries ?? []);
      else nextErrors.push(`Compendium: ${messageFromError(compendiumResult.reason)}`);
      if (decisionsResult.status === "fulfilled") setDecisions(decisionsResult.value?.decisions ?? []);
      else nextErrors.push(`Decisions: ${messageFromError(decisionsResult.reason)}`);
      if (runsResult.status === "fulfilled") setRuns(runsResult.value?.runs ?? []);
      else nextErrors.push(`Specialist History: ${messageFromError(runsResult.reason)}`);
      if (alignmentResult.status === "fulfilled") setAlignmentResults(alignmentResult.value?.results ?? []);
      else nextErrors.push(`Alignment: ${messageFromError(alignmentResult.reason)}`);
      if (featureContractsResult.status === "fulfilled") setFeatureContracts(featureContractsResult.value?.contracts ?? []);
      else nextErrors.push(`Feature Contracts: ${messageFromError(featureContractsResult.reason)}`);
      setErrors(nextErrors);
      setLoading(false);
    });
    return () => { active = false; };
  }, [workspace.path, refreshKey]);

  const items = useMemo(() => buildWikiItems(knowledge, decisions, runs), [knowledge, decisions, runs]);
  const visibleItems = useMemo(() => filterWikiItems(items, {
    category: activeCategory,
    query,
    type: typeFilter,
    authority: authorityFilter,
    lifecycle: lifecycleFilter,
  }), [items, activeCategory, query, typeFilter, authorityFilter, lifecycleFilter]);

  useEffect(() => {
    if (visibleItems.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (!visibleItems.some((item) => item.key === selectedKey)) setSelectedKey(visibleItems[0].key);
  }, [visibleItems, selectedKey]);

  const selectedItem = visibleItems.find((item) => item.key === selectedKey) ?? null;
  const summaryArea = categoryArea(activeCategory);
  const areaAlignments = summaryArea ? alignmentResults.filter((result) => result.intent.area === summaryArea) : [];
  const approvedAlignments = areaAlignments.filter((result) => result.reviewState === "APPROVED");
  const latestApprovedAlignment = approvedAlignments.reduce<AlignmentResult | null>((latest, result) => latest === null || result.createdAt > latest.createdAt ? result : latest, null);
  const pendingAlignmentCount = areaAlignments.filter((result) => result.reviewState === "PENDING_REVIEW").length;
  const areaFeatureContracts = summaryArea ? featureContracts.filter((contract) => contract.sources.intent.area === summaryArea) : [];
  const approvedFeatureContracts = areaFeatureContracts.filter((contract) => contract.status === "APPROVED");
  const latestApprovedFeatureContract = approvedFeatureContracts.reduce<FeatureContract | null>((latest, contract) => latest === null || contract.updatedAt > latest.updatedAt ? contract : latest, null);
  const draftFeatureContractCount = areaFeatureContracts.filter((contract) => contract.status === "DRAFT").length;
  const repository = repositoryReality?.status === "DETECTED" ? repositoryReality.repository ?? null : null;
  const activeKnowledgeCount = items.filter((item) => item.kind === "KNOWLEDGE" && item.lifecycleKey === "ACTIVE").length;
  const unresolvedCount = items.filter((item) => item.lifecycleKey === "UNRESOLVED").length;
  const proposedDecisionCount = items.filter((item) => item.kind === "DECISION" && item.lifecycleKey === "PROPOSED").length;
  const filtersAreDefault = query.length === 0 && typeFilter === "ALL" && authorityFilter === "ALL" && lifecycleFilter === "CURRENT";

  function clearFilters() {
    setQuery("");
    setTypeFilter("ALL");
    setAuthorityFilter("ALL");
    setLifecycleFilter("CURRENT");
  }

  function openOwner(item: WikiKnowledgeItem) {
    if (item.kind === "KNOWLEDGE" || item.kind === "OPEN_QUESTION") onEditKnowledge?.(item.sourceId);
    else if (item.kind === "DECISION") onOpenDecisions?.();
    else onOpenSpecialist?.();
  }

  return (
    <div className="wiki-page">
      <header className="wiki-intro">
        <div className="wiki-intro-heading"><div><span className="section-label">Read-only knowledge explorer</span><h2>Game Wiki</h2></div><KnowledgeImportPanel workspace={workspace} onApplied={() => setRefreshKey((value) => value + 1)} /></div>
        <p>Browse project knowledge across its owning domains. Game Design, Decisions, and other source workspaces remain authoritative.</p>
      </header>

      <section className="wiki-fact-summary" aria-label="Knowledge summary">
        <div><strong>{activeKnowledgeCount}</strong><span>active knowledge</span></div>
        <div><strong>{unresolvedCount}</strong><span>unresolved</span></div>
        <div><strong>{proposedDecisionCount}</strong><span>proposed decisions</span></div>
      </section>

      {errors.length > 0 ? <div className="wiki-source-warning" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      {loading ? <p className="wiki-loading" aria-live="polite">Loading Game Wiki...</p> : (
        <div className="wiki-explorer">
          <nav className="wiki-category-pane" aria-label="Wiki categories">
            <div className="wiki-pane-heading"><span>Categories</span><small>{items.length} total</small></div>
            <div className="wiki-category-list">
              {CATEGORY_OPTIONS.map(([category, label]) => (
                <button type="button" key={category} aria-current={activeCategory === category ? "page" : undefined} className={activeCategory === category ? "wiki-category-active" : ""} onClick={() => setActiveCategory(category)}>
                  <span>{label}</span><small>{countWikiCategory(items, category)}</small>
                </button>
              ))}
            </div>
            <p className="wiki-authority-note">Categories are projected from current project data. The Wiki does not store a second copy.</p>
          </nav>

          <section className="wiki-results-pane" aria-labelledby="wiki-results-title">
            <div className="wiki-controls" aria-label="Wiki search and filters">
              <label className="wiki-search-field"><span>Search knowledge</span><input type="search" value={query} placeholder="Search titles, content, source..." onChange={(event) => setQuery(event.target.value)} /></label>
              <div className="wiki-filter-grid">
                <label><span>Type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as WikiTypeFilter)}><option value="ALL">All types</option><option value="KNOWLEDGE">Project knowledge</option><option value="OPEN_QUESTION">Open questions</option><option value="DECISION">Decisions</option><option value="AI_ANALYSIS">AI working analysis</option></select></label>
                <label><span>Authority</span><select value={authorityFilter} onChange={(event) => setAuthorityFilter(event.target.value as WikiAuthorityFilter)}><option value="ALL">All authority</option><option value="USER_STATED">User stated</option><option value="MANUAL">Human authored</option><option value="DOCUMENTED">Documented import</option><option value="AI_INFERRED">AI-assisted, accepted</option><option value="UNRESOLVED">Unresolved</option><option value="DECISION_RECORD">Decision records</option><option value="AI_ANALYSIS">Non-authoritative AI</option></select></label>
                <label><span>Lifecycle</span><select value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value as WikiLifecycleFilter)}><option value="CURRENT">Current</option><option value="ACTIVE">Active only</option><option value="UNRESOLVED">Unresolved</option><option value="PROPOSED">Proposed</option><option value="APPROVED">Approved decisions</option><option value="HISTORICAL">Deprecated / superseded</option><option value="ALL">All lifecycle</option></select></label>
                <button className="outline-button compact-action" type="button" disabled={filtersAreDefault} onClick={clearFilters}>Clear filters</button>
              </div>
            </div>

            <div className="wiki-results-heading"><h3 id="wiki-results-title">{CATEGORY_OPTIONS.find(([category]) => category === activeCategory)?.[1]}</h3><span>{visibleItems.length} {visibleItems.length === 1 ? "result" : "results"}</span></div>
            {items.length === 0 ? (
              <div className="wiki-empty-state"><h3>Build your project knowledge</h3><p>Capture intent, answer open questions, or record a decision. This browser will reflect those sources without creating a separate Wiki store.</p><div>{onEditKnowledge ? <button className="outline-button compact-action" type="button" onClick={() => onEditKnowledge("")}>Open Game Design</button> : null}{onOpenProjectInterview ? <button className="outline-button compact-action" type="button" onClick={onOpenProjectInterview}>Open Project Interview</button> : null}{onOpenDecisions ? <button className="outline-button compact-action" type="button" onClick={onOpenDecisions}>Open Decisions</button> : null}</div></div>
            ) : visibleItems.length === 0 ? (
              <div className="wiki-empty-state"><h3>No matching knowledge</h3><p>Try a broader search or include historical records.</p><button className="outline-button compact-action" type="button" onClick={clearFilters}>Clear filters</button></div>
            ) : (
              <div className="wiki-result-list" role="listbox" aria-label="Knowledge results">
                {visibleItems.map((item) => <button type="button" role="option" aria-selected={item.key === selectedKey} className={`wiki-result-row${item.key === selectedKey ? " wiki-result-selected" : ""}${item.lifecycleKey === "HISTORICAL" ? " wiki-result-historical" : ""}`} key={item.key} onClick={() => setSelectedKey(item.key)}>
                  <span className="wiki-row-title"><strong>{item.title}</strong><span>{item.preview}</span></span>
                  <span className="wiki-row-badges"><span className={`wiki-type wiki-type-${item.kind.toLocaleLowerCase()}`}>{kindLabel(item.kind)}</span><span className={`wiki-type wiki-type-${item.lifecycleKey.toLocaleLowerCase()}`}>{item.lifecycleLabel}</span></span>
                  <span className="wiki-row-meta">{item.categoryLabel} · {item.provenanceLabel} · {item.sourceLabel}</span>
                </button>)}
              </div>
            )}
          </section>

          <aside className="wiki-detail-pane" aria-label="Selected knowledge detail">
            {selectedItem ? <article className="wiki-detail">
              <div className="wiki-detail-heading"><span className="wiki-tags"><span className={`wiki-type wiki-type-${selectedItem.kind.toLocaleLowerCase()}`}>{kindLabel(selectedItem.kind)}</span><span className={`wiki-type wiki-type-${selectedItem.lifecycleKey.toLocaleLowerCase()}`}>{selectedItem.lifecycleLabel}</span></span><h3>{selectedItem.title}</h3>{selectedItem.kind === "AI_ANALYSIS" ? <p className="wiki-analysis-warning">AI working analysis — not approved project knowledge</p> : null}{selectedItem.kind === "DECISION" && selectedItem.lifecycleKey === "PROPOSED" ? <p className="wiki-proposed-warning">Proposed decision — not established project direction</p> : null}</div>
              <p className="wiki-detail-content">{selectedItem.content}</p>
              {selectedItem.detailSections.map((section) => <section className="wiki-detail-section" key={section.label}><h4>{section.label}</h4>{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.items && section.items.length > 0 ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}</section>)}
              <dl className="wiki-detail-metadata">
                <div><dt>Category</dt><dd>{selectedItem.categoryLabel}</dd></div><div><dt>Authority</dt><dd>{selectedItem.authorityLabel}</dd></div><div><dt>Provenance</dt><dd>{selectedItem.provenanceLabel}</dd></div><div><dt>Source / owner</dt><dd>{selectedItem.sourceLabel} · {selectedItem.ownerLabel}</dd></div><div><dt>Lifecycle</dt><dd>{selectedItem.lifecycleLabel}</dd></div><div><dt>Created</dt><dd><time dateTime={selectedItem.createdAt}>{formatTimestamp(selectedItem.createdAt)}</time></dd></div>{selectedItem.updatedAt ? <div><dt>Last source update</dt><dd><time dateTime={selectedItem.updatedAt}>{formatTimestamp(selectedItem.updatedAt)}</time></dd></div> : null}
              </dl>
              {(selectedItem.kind === "KNOWLEDGE" || selectedItem.kind === "OPEN_QUESTION") && !onEditKnowledge ? null : selectedItem.kind === "DECISION" && !onOpenDecisions ? null : selectedItem.kind === "AI_ANALYSIS" && !onOpenSpecialist ? null : <button className="primary-button compact-action" type="button" onClick={() => openOwner(selectedItem)}>{detailActionLabel(selectedItem)}</button>}
            </article> : <div className="wiki-detail-empty"><h3>Select a result</h3><p>Choose an item to inspect its full text, authority, lifecycle, provenance, and owning workspace.</p></div>}

            {summaryArea === "technical" || summaryArea === "production" ? <section className="wiki-derived-stack" aria-label="Reality summaries">
              {repository ? <aside className="wiki-derived-card" aria-label="Repository Reality summary"><div><span className="wiki-type wiki-type-reality">Repository Reality</span><small>Session evidence · not a Wiki entry</small></div><dl><div><dt>Branch</dt><dd>{repository.detachedHead ? "Detached HEAD" : repository.branch}</dd></div><div><dt>Working tree</dt><dd>{repository.workingTree === "CLEAN" ? "Clean" : `${repository.totalChangedFiles} changed`}</dd></div></dl><p>Implementation evidence only; it does not establish project intent or completion.</p>{onOpenRepository ? <button className="outline-button compact-action" type="button" onClick={onOpenRepository}>Open Repository Reality</button> : null}</aside> : null}
              {summaryArea === "technical" && unityGroundTruth ? <aside className="wiki-derived-card" aria-label="Unity Reality summary"><div><span className="wiki-type wiki-type-reality">Unity Reality</span><small>Session evidence · not a Wiki entry</small></div><dl><div><dt>Project</dt><dd>{unityGroundTruth.status === "DETECTED" ? "Detected" : unityGroundTruth.status === "NOT_DETECTED" ? "Not detected" : "Inspection failed"}</dd></div><div><dt>Manifest</dt><dd>{unityManifestLabel(unityGroundTruth)}</dd></div>{unityGroundTruth.manifest.summary ? <div><dt>Snapshot</dt><dd>{`${unityGroundTruth.manifest.summary.observationCounts.scenes} scenes · ${unityGroundTruth.manifest.summary.observationCounts.gameObjects} objects`}</dd></div> : null}</dl><p>{unityGroundTruth.status === "DETECTED" ? "Verified Unity evidence from the existing session inspection." : "Unity evidence is unavailable; no implementation fact is inferred."}</p>{onOpenUnity ? <button className="outline-button compact-action" type="button" onClick={onOpenUnity}>Open Unity Reality</button> : null}</aside> : null}
            </section> : null}

            {areaAlignments.length > 0 ? <aside className="wiki-derived-card wiki-alignment-summary" aria-label="Alignment summary"><div><span className="wiki-type wiki-type-alignment">Alignment</span><small>Derived summary · not a Wiki entry</small></div><dl>{latestApprovedAlignment ? <div><dt>Latest approved</dt><dd>{humanize(latestApprovedAlignment.status)}</dd></div> : null}<div><dt>Approved / pending</dt><dd>{approvedAlignments.length} / {pendingAlignmentCount}</dd></div><div><dt>Total</dt><dd>{areaAlignments.length}</dd></div></dl>{onViewAlignmentHistory ? <button className="outline-button compact-action" type="button" onClick={onViewAlignmentHistory}>View Alignment History</button> : null}</aside> : null}
            {areaFeatureContracts.length > 0 ? <aside className="wiki-derived-card wiki-feature-contract-summary" aria-label="Feature Contract summary"><div><span className="wiki-type wiki-type-contract">Feature Contract</span><small>Derived summary · not a Wiki entry</small></div><dl>{latestApprovedFeatureContract ? <div><dt>Latest approved</dt><dd>{latestApprovedFeatureContract.title}</dd></div> : null}<div><dt>Approved / draft</dt><dd>{approvedFeatureContracts.length} / {draftFeatureContractCount}</dd></div><div><dt>Total</dt><dd>{areaFeatureContracts.length}</dd></div></dl>{onViewFeatureContracts && summaryArea ? <button className="outline-button compact-action" type="button" onClick={() => onViewFeatureContracts(summaryArea)}>View Feature Contracts</button> : null}</aside> : null}
          </aside>
        </div>
      )}
    </div>
  );
}
