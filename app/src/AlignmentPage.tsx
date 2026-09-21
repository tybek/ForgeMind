import { useEffect, useMemo, useRef, useState } from "react";
import {
  createAlignmentReview,
  loadAlignmentResults,
  loadAlignmentSources,
  reviewAlignmentResult,
  type AlignmentConfidence,
  type AlignmentDocument,
  type AlignmentProvenance,
  type AlignmentResult,
  type AlignmentSourceCatalog,
  type EvidenceAssessment,
  type IntentSourceType,
  type RealityEvidenceCandidate,
  type RealitySource,
} from "./platform/alignment";

interface AlignmentWorkspace {
  path: string;
  projectId: string;
}

type EvidenceGroupId = "unity-components" | "unity-scenes" | "unity-other" | "git-files" | "git-state";
type AlignmentSubview = "CREATE" | "HISTORY";
type EvidenceDiscoveryMode = "SUGGESTED" | "SEARCH" | "BROWSE";

interface EvidencePresentation {
  name: string;
  type: string;
  detail: string;
  caveat?: string;
}

const EVIDENCE_GROUPS: Array<{ id: EvidenceGroupId; label: string; source: RealitySource }> = [
  { id: "unity-components", label: "Unity Components", source: "UNITY" },
  { id: "unity-scenes", label: "Unity Scenes", source: "UNITY" },
  { id: "unity-other", label: "Unity ScriptableObjects / other supported Unity evidence", source: "UNITY" },
  { id: "git-files", label: "Git Changed Files", source: "GIT" },
  { id: "git-state", label: "Git HEAD / Repository State", source: "GIT" },
];

const MATCH_STOP_WORDS = new Set([
  "and", "are", "from", "git", "ground", "groundtruth", "into", "must", "not", "observed",
  "only", "project", "reality", "reports", "runtime", "state", "that", "the", "this", "type",
  "unity", "with",
]);

function messageFromError(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function displayEnum(value: string): string {
  return value.toLowerCase().split("_").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function sourceValue(type: IntentSourceType, id: string): string {
  return `${type}|${id}`;
}

function evidenceGroupId(evidence: RealityEvidenceCandidate): EvidenceGroupId {
  if (evidence.id.startsWith("unity:component:")) return "unity-components";
  if (evidence.id.startsWith("unity:scene:")) return "unity-scenes";
  if (evidence.source === "UNITY") return "unity-other";
  if (evidence.id.startsWith("git:file:")) return "git-files";
  return "git-state";
}

function fileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function evidencePresentation(evidence: Pick<RealityEvidenceCandidate, "id" | "source" | "summary">): EvidencePresentation {
  const component = evidence.summary.match(/^Unity GroundTruth observed component type (.+?) on (\d+) components?; /);
  if (component) {
    return {
      name: component[1],
      type: "Component",
      detail: `Component · observed ${component[2]} ${component[2] === "1" ? "time" : "times"}`,
      caveat: "Presence only — runtime behavior unverified",
    };
  }

  const scene = evidence.summary.match(/^Unity GroundTruth observed scene (.+)\.$/);
  if (scene) return { name: fileName(scene[1]), type: "Scene", detail: `Scene · ${scene[1]}` };

  const scriptableObject = evidence.summary.match(/^Unity GroundTruth observed ScriptableObject (.+) of type (.+)\.$/);
  if (scriptableObject) {
    return { name: scriptableObject[2], type: "ScriptableObject", detail: `ScriptableObject · ${scriptableObject[1]}` };
  }

  const changedFile = evidence.summary.match(/^Git reports (.+?) project-relative file (.+)\.$/);
  if (changedFile) {
    return { name: fileName(changedFile[2]), type: "Changed File", detail: `${displayEnum(changedFile[1])} · ${changedFile[2]}` };
  }

  const head = evidence.summary.match(/^Git HEAD ([^:]+): (.+)$/);
  if (head) return { name: `HEAD ${head[1]}`, type: "Repository State", detail: head[2] };

  const commit = evidence.summary.match(/^Git commit ([^:]+): (.+)$/);
  if (commit) return { name: `Commit ${commit[1]}`, type: "Repository State", detail: commit[2] };

  if (evidence.id.startsWith("git:working-tree:")) {
    return { name: "Working tree", type: "Repository State", detail: evidence.summary.replace(/^Git /, "") };
  }

  if (evidence.id.startsWith("unity:manifest:")) {
    return { name: "GroundTruth snapshot", type: "Snapshot", detail: evidence.summary.replace(/^Unity GroundTruth snapshot /, "") };
  }

  return {
    name: evidence.summary,
    type: evidence.source === "UNITY" ? "Unity Evidence" : "Repository State",
    detail: evidence.summary,
  };
}

function searchableWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !MATCH_STOP_WORDS.has(word));
}

function matchingTerms(intentText: string, evidenceText: string): string[] {
  const intentWords = new Set(searchableWords(intentText));
  return [...new Set(searchableWords(evidenceText).filter((word) => intentWords.has(word)))].sort();
}

function projectedStatus(evidence: Record<string, EvidenceAssessment>, hasConflict: boolean): string {
  const assessments = Object.values(evidence);
  if (hasConflict) return "CONFLICT";
  if (assessments.some((assessment) => assessment === "CONTRADICTS")) return "OUT_OF_SYNC";
  if (assessments.length > 0 && assessments.every((assessment) => assessment === "SUPPORTS")) return "ALIGNED";
  return "UNVERIFIED";
}

function EvidenceIdentity({
  evidence,
  matchReason,
}: {
  evidence: Pick<RealityEvidenceCandidate, "id" | "source" | "summary" | "provenance">;
  matchReason?: string;
}) {
  const presentation = evidencePresentation(evidence);
  return (
    <div className="alignment-evidence-identity">
      <div className="alignment-evidence-primary">
        <div className="alignment-evidence-tags" aria-label={`${evidence.source} ${presentation.type}`}>
          <span>{evidence.source}</span><span>{presentation.type}</span>
        </div>
        <strong>{presentation.name}</strong>
      </div>
      <div className="alignment-evidence-secondary">
        <span>{presentation.detail}</span>
        {presentation.caveat ? <small>{presentation.caveat}</small> : null}
        {matchReason ? <small className="alignment-match-reason">{matchReason}</small> : null}
        <small className="alignment-evidence-provenance">{evidence.provenance}</small>
      </div>
    </div>
  );
}

export function AlignmentPage({ workspace }: { workspace: AlignmentWorkspace }) {
  const [activeSubview, setActiveSubview] = useState<AlignmentSubview>("CREATE");
  const [discoveryMode, setDiscoveryMode] = useState<EvidenceDiscoveryMode>("SUGGESTED");
  const [catalog, setCatalog] = useState<AlignmentSourceCatalog | null>(null);
  const [document, setDocument] = useState<AlignmentDocument | null>(null);
  const [intentValue, setIntentValue] = useState("");
  const [conflictingDecisionId, setConflictingDecisionId] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<Record<string, EvidenceAssessment>>({});
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | RealitySource>("ALL");
  const [openGroups, setOpenGroups] = useState<Partial<Record<EvidenceGroupId, boolean>>>({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(() => new Set());
  const [rationale, setRationale] = useState("");
  const [confidence, setConfidence] = useState<AlignmentConfidence>("LOW");
  const [uncertainty, setUncertainty] = useState("");
  const [noAdditionalUncertainty, setNoAdditionalUncertainty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdResultId, setCreatedResultId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [unviewedReviewCount, setUnviewedReviewCount] = useState(0);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const createInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setCreatedResultId(null);
    setSelectedHistoryId(null);
    setUnviewedReviewCount(0);
    void Promise.all([loadAlignmentSources(workspace.path), loadAlignmentResults(workspace.path)])
      .then(([nextCatalog, nextDocument]) => {
        if (!active) return;
        setCatalog(nextCatalog);
        setDocument(nextDocument);
      })
      .catch((reason) => {
        if (active) setLoadError(messageFromError(reason, "Alignment sources could not be loaded."));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace.path]);

  const selectedIntent = useMemo(
    () => catalog?.intentSources.find((source) => sourceValue(source.sourceType, source.sourceId) === intentValue),
    [catalog, intentValue],
  );
  const conflictingOptions = (catalog?.intentSources ?? []).filter((source) =>
    source.sourceType === "DECISION" && source.sourceId !== selectedIntent?.sourceId,
  );
  const evidenceCount = Object.keys(selectedEvidence).length;
  const allEvidence = catalog?.realityEvidence ?? [];
  const evidenceById = useMemo(
    () => new Map((catalog?.realityEvidence ?? []).map((evidence) => [evidence.id, evidence])),
    [catalog],
  );
  const selectedEvidenceItems = Object.keys(selectedEvidence)
    .map((id) => evidenceById.get(id))
    .filter((item): item is RealityEvidenceCandidate => item !== undefined);
  const normalizedSearch = evidenceSearch.trim().toLowerCase();
  const sourceEvidence = allEvidence.filter((evidence) => sourceFilter === "ALL" || evidence.source === sourceFilter);
  const searchResults = normalizedSearch
    ? sourceEvidence.filter((evidence) => {
      const presentation = evidencePresentation(evidence);
      return `${presentation.name} ${presentation.type} ${presentation.detail} ${evidence.summary}`.toLowerCase().includes(normalizedSearch);
    })
    : [];
  const groupedEvidence = EVIDENCE_GROUPS.map((group) => {
    const items = allEvidence.filter((evidence) => evidenceGroupId(evidence) === group.id);
    return {
      ...group,
      items,
      selectedCount: items.filter((evidence) => selectedEvidence[evidence.id] !== undefined).length,
    };
  }).filter((group) => group.items.length > 0 && (sourceFilter === "ALL" || group.source === sourceFilter));
  const suggestions = useMemo(() => {
    if (!selectedIntent) return [];
    const intentText = `${selectedIntent.title} ${selectedIntent.statement}`;
    return (catalog?.realityEvidence ?? [])
      .filter((evidence) => sourceFilter === "ALL" || evidence.source === sourceFilter)
      .map((evidence) => {
        const presentation = evidencePresentation(evidence);
        return { evidence, matches: matchingTerms(intentText, `${presentation.name} ${presentation.detail} ${evidence.summary}`) };
      })
      .filter(({ evidence, matches }) => matches.length > 0
        && selectedEvidence[evidence.id] === undefined
        && !dismissedSuggestions.has(evidence.id))
      .sort((left, right) => {
        if (selectedIntent.area === "systems" && left.evidence.source !== right.evidence.source) {
          return left.evidence.source === "UNITY" ? -1 : 1;
        }
        return right.matches.length - left.matches.length
          || evidencePresentation(left.evidence).name.localeCompare(evidencePresentation(right.evidence).name);
      })
      .slice(0, 8);
  }, [catalog, dismissedSuggestions, selectedEvidence, selectedIntent, sourceFilter]);

  const validationMessages = [
    !selectedIntent ? "Select a documented Intent source." : null,
    evidenceCount === 0 ? "Select at least one Reality evidence item." : null,
    !rationale.trim() ? "Add a rationale." : null,
    !noAdditionalUncertainty && !uncertainty.trim() ? "State the remaining uncertainty or choose No additional uncertainty." : null,
  ].filter((message): message is string => message !== null);
  const previewStatus = projectedStatus(selectedEvidence, Boolean(conflictingDecisionId));
  const historyResults = [...(document?.results ?? [])].reverse();
  const createdResult = document?.results.find((result) => result.id === createdResultId);
  const selectedHistoryResult = document?.results.find((result) => result.id === selectedHistoryId)
    ?? historyResults[0];

  function openHistory(resultId?: string) {
    setActiveSubview("HISTORY");
    setUnviewedReviewCount(0);
    setSelectedHistoryId(resultId ?? selectedHistoryId ?? historyResults[0]?.id ?? null);
  }

  function toggleEvidence(id: string, selected: boolean) {
    setSelectedEvidence((current) => {
      const next = { ...current };
      if (selected) next[id] = "INSUFFICIENT";
      else delete next[id];
      return next;
    });
    setCreateError(null);
    setCreatedResultId(null);
  }

  async function submitReview() {
    if (createInFlight.current || !selectedIntent || validationMessages.length > 0) return;
    createInFlight.current = true;
    setCreating(true);
    setCreateError(null);
    setCreatedResultId(null);
    try {
      const next = await createAlignmentReview(workspace.path, workspace.projectId, {
        intentSourceType: selectedIntent.sourceType,
        intentSourceId: selectedIntent.sourceId,
        conflictingDecisionId: conflictingDecisionId || null,
        evidence: Object.entries(selectedEvidence).map(([evidenceId, assessment]) => ({ evidenceId, assessment })),
        rationale,
        confidence,
        uncertainty: noAdditionalUncertainty ? "No additional uncertainty." : uncertainty.trim(),
      });
      const created = next.results.at(-1);
      setDocument(next);
      setCreatedResultId(created?.id ?? null);
      setSelectedHistoryId(created?.id ?? null);
      setUnviewedReviewCount((count) => count + 1);
      setRationale("");
      setUncertainty("");
      setNoAdditionalUncertainty(false);
      setConfidence("LOW");
      setConflictingDecisionId("");
      setSelectedEvidence({});
    } catch (reason) {
      const message = messageFromError(
        reason,
        "The review could not be created. Confirm that the selected Intent and Reality evidence are still current, then try again.",
      );
      setCreateError(`${message} Your selections and rationale were kept.`);
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  }

  async function review(resultId: string, reviewState: "APPROVED" | "REJECTED") {
    if (reviewingId) return;
    setReviewingId(resultId);
    setReviewError(null);
    try {
      setDocument(await reviewAlignmentResult(workspace.path, workspace.projectId, resultId, reviewState));
    } catch (reason) {
      setReviewError(messageFromError(reason, "The review state could not be updated. Try again."));
    } finally {
      setReviewingId(null);
    }
  }

  function renderEvidencePicker(evidence: RealityEvidenceCandidate, context: "search" | "browse") {
    const presentation = evidencePresentation(evidence);
    const selected = selectedEvidence[evidence.id] !== undefined;
    return (
      <div className={`alignment-evidence-row alignment-evidence-row-${context}`} key={evidence.id}>
        <EvidenceIdentity
          evidence={evidence}
          matchReason={context === "search" ? `Matches search: “${evidenceSearch.trim()}”` : undefined}
        />
        <button
          className={selected ? "text-button" : "outline-button"}
          type="button"
          onClick={() => toggleEvidence(evidence.id, !selected)}
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>
    );
  }

  function renderSuggestion({ evidence, matches }: { evidence: RealityEvidenceCandidate; matches: string[] }) {
    return (
      <div className="alignment-suggestion" key={evidence.id}>
        <EvidenceIdentity evidence={evidence} matchReason={`Match reason: shared ${matches.join(", ")}`} />
        <div className="alignment-suggestion-actions">
          <button className="outline-button" type="button" onClick={() => toggleEvidence(evidence.id, true)}>Select</button>
          <button className="text-button" type="button" onClick={() => setDismissedSuggestions((current) => new Set(current).add(evidence.id))}>Dismiss</button>
        </div>
      </div>
    );
  }

  if (loading) return <p aria-live="polite">Loading Alignment workspace...</p>;

  return (
    <div className="alignment-page">
      <section className="alignment-intro">
        <span className="section-label">Human-reviewable Intent ↔ Reality comparison</span>
        <h2>Alignment</h2>
        <p>Select documented Intent and current verified Reality evidence. ForgeMind computes a reviewable state from your explicit assessments; it does not change either source.</p>
      </section>

      {loadError ? <p className="alignment-error" role="alert">{loadError}</p> : null}

      <nav className="alignment-subview-tabs" role="tablist" aria-label="Alignment views">
        <button type="button" role="tab" aria-selected={activeSubview === "CREATE"} onClick={() => setActiveSubview("CREATE")}>Create Review</button>
        <button type="button" role="tab" aria-selected={activeSubview === "HISTORY"} onClick={() => openHistory()}>
          Review History{unviewedReviewCount > 0 ? <> <span className="alignment-unread-badge">• {unviewedReviewCount}</span></> : null}
        </button>
      </nav>

      {activeSubview === "CREATE" ? (
        <section className="alignment-builder" aria-labelledby="new-alignment-title">
          <div className="alignment-section-heading">
            <div><span className="section-label">Manual-first workflow</span><h3 id="new-alignment-title">Create Alignment Review</h3></div>
            <span>{evidenceCount} evidence selected</span>
          </div>

          <div className="alignment-workbench" data-layout="three-pane-responsive">
            <aside className="alignment-pane alignment-intent-pane" aria-labelledby="alignment-intent-title">
              <div className="alignment-pane-heading"><span>1</span><h4 id="alignment-intent-title">Intent</h4></div>
              <label>
                Documented Intent source
                <select value={intentValue} onChange={(event) => {
                  setIntentValue(event.target.value);
                  setConflictingDecisionId("");
                  setDismissedSuggestions(new Set());
                  setCreateError(null);
                  setCreatedResultId(null);
                }}>
                  <option value="">Select current Intent</option>
                  {(catalog?.intentSources ?? []).map((source) => (
                    <option key={sourceValue(source.sourceType, source.sourceId)} value={sourceValue(source.sourceType, source.sourceId)}>
                      {source.sourceType === "COMPENDIUM" ? "Compendium" : "Approved Decision"}: {source.title}
                    </option>
                  ))}
                </select>
              </label>
              {selectedIntent ? (
                <article className="alignment-source-preview">
                  <div className="alignment-tags"><span>{selectedIntent.sourceType}</span><span>{selectedIntent.status}</span><span>{selectedIntent.provenance}</span></div>
                  <strong>{selectedIntent.title}</strong>
                  <p>{selectedIntent.statement}</p>
                  <small>{displayEnum(selectedIntent.area)}</small>
                </article>
              ) : <p className="alignment-help">Choose current Compendium knowledge or an approved Decision. Deprecated or proposed sources are excluded.</p>}
              <label>
                Conflicting approved Decision (optional)
                <select value={conflictingDecisionId} onChange={(event) => setConflictingDecisionId(event.target.value)}>
                  <option value="">No conflicting Intent</option>
                  {conflictingOptions.map((source) => <option key={source.sourceId} value={source.sourceId}>{source.title}</option>)}
                </select>
              </label>
              <p className="alignment-help">Use only for a material conflict between two approved Intent statements.</p>
            </aside>

            <main className="alignment-pane alignment-discovery-pane" aria-labelledby="alignment-evidence-title">
              <div className="alignment-pane-heading"><span>2</span><h4 id="alignment-evidence-title">Reality Evidence</h4></div>
              {(catalog?.realityEvidence.length ?? 0) === 0 ? (
                <p>No selectable Git or Unity GroundTruth evidence is currently available.</p>
              ) : (
                <>
                  <div className="alignment-evidence-controls">
                    <label>Search evidence<input type="search" value={evidenceSearch} onChange={(event) => {
                      setEvidenceSearch(event.target.value);
                      if (event.target.value.trim()) setDiscoveryMode("SEARCH");
                    }} placeholder="Name, type, path, or safe summary" /></label>
                    <label>Source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "ALL" | RealitySource)}><option value="ALL">All</option><option value="UNITY">Unity</option><option value="GIT">Git</option></select></label>
                  </div>
                  <div className="alignment-discovery-tabs" role="tablist" aria-label="Evidence discovery modes">
                    {(["SUGGESTED", "SEARCH", "BROWSE"] as EvidenceDiscoveryMode[]).map((mode) => (
                      <button key={mode} type="button" role="tab" aria-selected={discoveryMode === mode} onClick={() => {
                        setDiscoveryMode(mode);
                        if (mode !== "SEARCH") setEvidenceSearch("");
                      }}>{displayEnum(mode)}</button>
                    ))}
                  </div>

                  {discoveryMode === "SEARCH" ? (
                    <>
                      <section className="alignment-search-results" aria-labelledby="alignment-search-results-title">
                        <div className="alignment-evidence-toolbar"><div><h5 id="alignment-search-results-title">Search Results</h5><span>{normalizedSearch ? `${searchResults.length} matches` : "Enter a search term"}</span></div></div>
                        {!normalizedSearch ? <p className="alignment-help">Search by evidence name, type, path, or safe summary.</p> : searchResults.length === 0 ? <p>No evidence matches the current search and source filter.</p> : <div className="alignment-evidence-list">{searchResults.map((item) => renderEvidencePicker(item, "search"))}</div>}
                      </section>
                      {normalizedSearch && selectedIntent ? (
                        <details className="alignment-suggestions alignment-suggestions-compact">
                          <summary><strong>Suggested Evidence</strong><span>{suggestions.length} available · collapsed while searching</span></summary>
                          <p className="alignment-help">Suggestions are unverified relevance hints and never selected automatically.</p>
                          {suggestions.length > 0 ? <div className="alignment-suggestion-list">{suggestions.map(renderSuggestion)}</div> : null}
                        </details>
                      ) : null}
                    </>
                  ) : null}

                  {discoveryMode === "SUGGESTED" ? (
                    <section className="alignment-suggestions" aria-labelledby="suggested-evidence-title">
                      <div className="alignment-evidence-toolbar"><div><h5 id="suggested-evidence-title">Suggested Evidence</h5><span>{suggestions.length} explainable text matches</span></div></div>
                      <p className="alignment-help">Suggestions are unverified relevance hints. They are never selected automatically.</p>
                      {!selectedIntent ? <p>Select Intent to calculate deterministic suggestions.</p> : suggestions.length === 0 ? <p>No undismissed suggestions match this Intent and source filter.</p> : <div className="alignment-suggestion-list">{suggestions.map(renderSuggestion)}</div>}
                    </section>
                  ) : null}

                  {discoveryMode === "BROWSE" ? (
                    <section className="alignment-browse-all" aria-labelledby="alignment-browse-title">
                      <div className="alignment-evidence-toolbar"><div><h5 id="alignment-browse-title">Browse Evidence</h5><span>Groups stay collapsed until opened</span></div></div>
                      <div className="alignment-evidence-groups">
                        {groupedEvidence.map((group) => {
                          const isOpen = Boolean(openGroups[group.id]);
                          return (
                            <details className="alignment-evidence-group" key={group.id} open={isOpen} onToggle={(event) => {
                              const isNowOpen = event.currentTarget.open;
                              setOpenGroups((current) => ({ ...current, [group.id]: isNowOpen }));
                            }}>
                              <summary><strong>{group.label}</strong><span>{group.items.length} total · {group.selectedCount} selected</span></summary>
                              {isOpen ? <div className="alignment-evidence-list">{group.items.map((item) => renderEvidencePicker(item, "browse"))}</div> : null}
                            </details>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
            </main>

            <aside className="alignment-pane alignment-review-pane" aria-labelledby="alignment-review-title">
              <div className="alignment-pane-heading"><span>3</span><h4 id="alignment-review-title">Review</h4></div>
              <section className="alignment-selected-evidence" aria-labelledby="selected-evidence-title">
                <div className="alignment-evidence-toolbar">
                  <div><h5 id="selected-evidence-title">Selected Evidence</h5><span>{evidenceCount} selected</span></div>
                  <button className="text-button" type="button" disabled={evidenceCount === 0 || creating} onClick={() => setSelectedEvidence({})}>Deselect all</button>
                </div>
                {selectedEvidenceItems.length === 0 ? <p className="alignment-help">Selected evidence stays here while you search or filter.</p> : (
                  <div className="alignment-selected-list">
                    {selectedEvidenceItems.map((evidence) => {
                      const presentation = evidencePresentation(evidence);
                      return (
                        <div className="alignment-selected-item" key={evidence.id}>
                          <EvidenceIdentity evidence={evidence} />
                          <label>Assessment<select aria-label={`Assessment for ${presentation.name}`} value={selectedEvidence[evidence.id]} disabled={creating} onChange={(event) => setSelectedEvidence((current) => ({ ...current, [evidence.id]: event.target.value as EvidenceAssessment }))}>
                            <option value="SUPPORTS">Supports</option><option value="CONTRADICTS">Contradicts</option><option value="INSUFFICIENT">Insufficient</option>
                          </select></label>
                          <button className="text-button" type="button" disabled={creating} onClick={() => toggleEvidence(evidence.id, false)}>Remove</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="alignment-assessment-summary" aria-label="Alignment preview">
                <div><span>Alignment preview:</span><strong className={`alignment-status-${previewStatus.toLowerCase()}`}>{previewStatus}</strong></div>
                <small>Based on explicit assessments; unobserved behavior remains unverified.</small>
              </section>

              <div className="alignment-review-form">
                <label>Rationale<textarea value={rationale} rows={4} maxLength={2000} disabled={creating} onChange={(event) => { setRationale(event.target.value); setCreateError(null); setCreatedResultId(null); }} placeholder="Explain how the selected evidence relates to this Intent." /></label>
                <label>Confidence<select value={confidence} disabled={creating} onChange={(event) => setConfidence(event.target.value as AlignmentConfidence)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
                <div className="alignment-uncertainty-field">
                  <label>Uncertainty<textarea aria-label="Uncertainty" value={uncertainty} rows={3} maxLength={1000} disabled={creating || noAdditionalUncertainty} onChange={(event) => { setUncertainty(event.target.value); setCreateError(null); setCreatedResultId(null); }} placeholder="State what this evidence cannot prove." /></label>
                  <label className="alignment-uncertainty-choice"><input type="checkbox" checked={noAdditionalUncertainty} disabled={creating} onChange={(event) => { setNoAdditionalUncertainty(event.target.checked); setCreateError(null); setCreatedResultId(null); }} />No additional uncertainty</label>
                </div>
                {validationMessages.length > 0 ? <div className="alignment-validation" role="status"><strong>Complete before creating:</strong><ul>{validationMessages.map((message) => <li key={message}>{message}</li>)}</ul></div> : <p className="alignment-ready" role="status">Ready to create a pending review.</p>}
                {createError ? <p className="alignment-create-error" role="alert">{createError}</p> : null}
                {createdResult ? <div className="alignment-create-success" role="status"><span>Review created · {createdResult.status}</span><button className="text-button" type="button" onClick={() => openHistory(createdResult.id)}>View in Review History</button></div> : null}
                <div className="alignment-create-actions">
                  <button className={`primary-button${creating ? " alignment-create-button-loading" : ""}`} type="button" disabled={creating || validationMessages.length > 0} onClick={() => void submitReview()}>Create Pending Review</button>
                  {creating ? <span className="alignment-create-loading" role="status"><span aria-hidden="true" />Creating review…</span> : null}
                </div>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        <section className="alignment-history" aria-labelledby="alignment-history-title">
          <div className="alignment-section-heading"><div><span className="section-label">Durable review history</span><h3 id="alignment-history-title">Review History</h3></div><span>{document?.results.length ?? 0} reviews</span></div>
          {reviewError ? <p className="alignment-error" role="alert">{reviewError}</p> : null}
          {historyResults.length === 0 ? <p>No Alignment Reviews have been created yet.</p> : (
            <div className="alignment-history-workbench">
              <div className="alignment-history-list" aria-label="Alignment review list">
                {historyResults.map((result: AlignmentResult) => (
                  <button className="alignment-history-row" type="button" aria-pressed={selectedHistoryResult?.id === result.id} key={result.id} onClick={() => setSelectedHistoryId(result.id)}>
                    <span className="alignment-history-row-heading"><strong>{result.intent.title}</strong><time>{result.createdAt}</time></span>
                    <span className="alignment-tags"><span className={`alignment-status-${result.status.toLowerCase()}`}>{displayEnum(result.status)}</span><span>{displayEnum(result.reviewState)}</span><span>{displayEnum(result.confidence)} confidence</span></span>
                  </button>
                ))}
              </div>
              {selectedHistoryResult ? (
                <article className="alignment-result alignment-history-detail" aria-label="Selected alignment review">
                  <header><div><span className="section-label">Selected review</span><h3>{selectedHistoryResult.intent.title}</h3></div><time>{selectedHistoryResult.createdAt}</time></header>
                  <dl className="alignment-result-grid"><div><dt>Status</dt><dd>{displayEnum(selectedHistoryResult.status)}</dd></div><div><dt>Review state</dt><dd>{displayEnum(selectedHistoryResult.reviewState)}</dd></div><div><dt>Confidence</dt><dd>{displayEnum(selectedHistoryResult.confidence)}</dd></div></dl>
                  <section><h4>INTENT</h4><p><strong>{selectedHistoryResult.intent.sourceType}: {selectedHistoryResult.intent.title}</strong></p><p>{selectedHistoryResult.intent.statement}</p><div className="alignment-tags"><span>{selectedHistoryResult.intent.status}</span><span>{selectedHistoryResult.intent.provenance}</span></div>
                    {selectedHistoryResult.conflictingIntent ? <p className="alignment-conflict"><strong>Conflicting approved Intent:</strong> {selectedHistoryResult.conflictingIntent.title} — {selectedHistoryResult.conflictingIntent.statement}</p> : null}
                  </section>
                  <section><h4>REALITY EVIDENCE</h4>{selectedHistoryResult.evidence.map((item) => <div className="alignment-evidence-summary" key={item.evidenceId}><EvidenceIdentity evidence={{ id: item.evidenceId, source: item.source, summary: item.summary, provenance: item.provenance }} /><strong>{displayEnum(item.assessment)}</strong></div>)}</section>
                  <section><h4>ALIGNMENT</h4><p><strong>Rationale:</strong> {selectedHistoryResult.rationale}</p><p><strong>Uncertainty:</strong> {selectedHistoryResult.uncertainty}</p></section>
                  <footer><div className="alignment-provenance" aria-label="Alignment provenance">{selectedHistoryResult.provenance.map((item: AlignmentProvenance) => <span key={item}>{item}</span>)}</div>{selectedHistoryResult.reviewState === "PENDING_REVIEW" ? <div className="alignment-review-actions"><button className="primary-button" type="button" disabled={reviewingId !== null} onClick={() => void review(selectedHistoryResult.id, "APPROVED")}>Approve</button><button className="outline-button" type="button" disabled={reviewingId !== null} onClick={() => void review(selectedHistoryResult.id, "REJECTED")}>Reject</button></div> : null}</footer>
                </article>
              ) : null}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
