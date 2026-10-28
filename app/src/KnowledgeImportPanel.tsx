import { open } from "@tauri-apps/plugin-dialog";
import { useMemo, useRef, useState } from "react";
import {
  applyKnowledgeImport,
  getKnowledgeImportPreflight,
  projectRelativeMarkdownPaths,
  runKnowledgeImport,
  type ApplyKnowledgeImportResult,
  type KnowledgeImportCandidate,
  type KnowledgeImportPreflight,
} from "./platform/knowledgeImport";
import { KNOWLEDGE_AREAS, type KnowledgeArea } from "./platform/projectKnowledge";
import { structuredWorkflowModelLabel, supportsStructuredOutput } from "./platform/modelRegistry";

interface KnowledgeImportWorkspace {
  path: string;
  projectId: string;
}

type ImportPhase = "SOURCE_SELECTION" | "PREFLIGHT" | "RUNNING" | "REVIEW_QUEUE" | "EMPTY_RESULT" | "ERROR" | "APPLY_RESULT";

interface ImportFailure {
  code: string;
  message: string;
  requestExecuted?: boolean;
}

function safeFailure(error: unknown): ImportFailure {
  if (error && typeof error === "object") {
    const code = "code" in error && typeof error.code === "string" ? error.code : "KNOWLEDGE_IMPORT_ERROR";
    const message = "message" in error && typeof error.message === "string"
      ? error.message
      : "Knowledge Import could not complete this action.";
    const requestExecuted = "requestExecuted" in error && typeof error.requestExecuted === "boolean"
      ? error.requestExecuted
      : undefined;
    return { code, message, requestExecuted };
  }
  return { code: "KNOWLEDGE_IMPORT_ERROR", message: "Knowledge Import could not complete this action." };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KiB`;
}

function candidateTypeLabel(type: KnowledgeImportCandidate["type"]): string {
  if (type === "OPEN_QUESTION") return "Open Question";
  if (type === "DECISION") return "Decision candidate";
  return "Project Knowledge";
}

export function KnowledgeImportPanel({
  workspace,
  onApplied,
}: {
  workspace: KnowledgeImportWorkspace;
  onApplied: () => void | Promise<void>;
}) {
  const [openPanel, setOpenPanel] = useState(false);
  const [phase, setPhase] = useState<ImportPhase>("SOURCE_SELECTION");
  const [relativePaths, setRelativePaths] = useState<string[]>([]);
  const [preflight, setPreflight] = useState<KnowledgeImportPreflight | null>(null);
  const [candidates, setCandidates] = useState<KnowledgeImportCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ApplyKnowledgeImportResult | null>(null);
  const [skippedSummary, setSkippedSummary] = useState({ duplicates: 0, manuallyDeselected: 0, reviewRequired: 0, otherNotSelected: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImportFailure | null>(null);
  const runInFlight = useRef(false);

  const selectedCount = selectedIds.size;
  const selectedModel = preflight?.models.find((model) => model.modelId === preflight.modelId) ?? null;
  const appliedCount = result ? result.appliedKnowledge + result.proposedDecisions + result.openQuestions : 0;
  const selectedCandidates = useMemo(() => candidates.filter((candidate) => selectedIds.has(candidate.id)), [candidates, selectedIds]);

  async function chooseFiles() {
    setError(null);
    try {
      const picked = await open({
        multiple: true,
        directory: false,
        title: "Select project Markdown for Knowledge Import",
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (!picked) return;
      const selected = Array.isArray(picked) ? picked : [picked];
      const paths = projectRelativeMarkdownPaths(workspace.path, selected);
      setRelativePaths(paths);
      setPreflight(null);
      setCandidates([]);
      setSelectedIds(new Set());
      setResult(null);
      setLoading(true);
      const nextPreflight = await getKnowledgeImportPreflight({
        rootPath: workspace.path,
        projectId: workspace.projectId,
        relativePaths: paths,
      });
      setPreflight(nextPreflight);
      setPhase("PREFLIGHT");
      setOpenPanel(true);
    } catch (reason) {
      setError(safeFailure(reason));
      setPhase("ERROR");
      setOpenPanel(true);
    } finally {
      setLoading(false);
    }
  }

  async function changeModel(modelId: string) {
    if (!preflight || loading) return;
    setLoading(true);
    setError(null);
    try {
      setPreflight(await getKnowledgeImportPreflight({
        rootPath: workspace.path,
        projectId: workspace.projectId,
        relativePaths,
        modelId,
      }));
    } catch (reason) {
      setError(safeFailure(reason));
    } finally {
      setLoading(false);
    }
  }

  async function runExtraction() {
    if (!preflight || loading || runInFlight.current) return;
    runInFlight.current = true;
    setLoading(true);
    setError(null);
    setPhase("RUNNING");
    try {
      const extracted = await runKnowledgeImport({
        rootPath: workspace.path,
        projectId: workspace.projectId,
        relativePaths,
        modelId: preflight.modelId,
      });
      setCandidates(extracted.candidates);
      setSelectedIds(new Set(extracted.candidates.filter((candidate) => candidate.selectedByDefault).map((candidate) => candidate.id)));
      setPhase(extracted.candidates.length > 0 ? "REVIEW_QUEUE" : "EMPTY_RESULT");
    } catch (reason) {
      setError(safeFailure(reason));
      setPhase("ERROR");
    } finally {
      runInFlight.current = false;
      setLoading(false);
    }
  }

  function updateCandidate(id: string, patch: Partial<Pick<KnowledgeImportCandidate, "title" | "content" | "section">>) {
    setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, ...patch } : candidate));
  }

  function setSelected(id: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id); else next.delete(id);
      return next;
    });
  }

  async function applySelected() {
    if (selectedCandidates.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const applied = await applyKnowledgeImport(workspace.path, workspace.projectId, selectedCandidates.map((candidate) => ({
        id: candidate.id,
        type: candidate.type,
        title: candidate.title,
        content: candidate.content,
        section: candidate.section,
        sourceRefs: candidate.sourceRefs,
        note: candidate.note,
      })));
      const unselected = candidates.filter((candidate) => !selectedIds.has(candidate.id));
      setSkippedSummary({
        duplicates: unselected.filter((candidate) => candidate.duplicateStatus === "EXISTING" || candidate.duplicateStatus === "POSSIBLE_DUPLICATE").length,
        manuallyDeselected: unselected.filter((candidate) => candidate.selectedByDefault).length,
        reviewRequired: unselected.filter((candidate) => candidate.duplicateStatus === "REVIEW_REQUIRED").length,
        otherNotSelected: unselected.filter((candidate) => !candidate.selectedByDefault && candidate.duplicateStatus === "NEW").length,
      });
      setResult(applied);
      setPhase("APPLY_RESULT");
      await onApplied();
    } catch (reason) {
      setError(safeFailure(reason));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    if (loading) return;
    setOpenPanel(false);
    setError(null);
  }

  function backToSelection() {
    if (loading) return;
    setOpenPanel(false);
    setPhase("SOURCE_SELECTION");
    setRelativePaths([]);
    setPreflight(null);
    setCandidates([]);
    setSelectedIds(new Set());
    setEditingIds(new Set());
    setResult(null);
    setError(null);
  }

  function reviewBeforeRetry() {
    if (!preflight || loading) return;
    setCandidates([]);
    setSelectedIds(new Set());
    setError(null);
    setPhase("PREFLIGHT");
  }

  return <>
    <button className="outline-button" type="button" onClick={() => void chooseFiles()} disabled={loading}>Import Knowledge</button>
    {openPanel ? <div className="knowledge-import-backdrop">
      <section className="knowledge-import-dialog" role="dialog" aria-modal="true" aria-labelledby="knowledge-import-title">
        <header className="knowledge-import-header">
          <div><p className="eyebrow">Reviewed Markdown import</p><h2 id="knowledge-import-title">Bring existing project documentation into ForgeMind</h2></div>
          <button className="text-button" type="button" onClick={close} disabled={loading}>Close</button>
        </header>

        {phase === "PREFLIGHT" && error ? <p role="alert" className="form-error"><strong>{error.code}</strong> {error.message}</p> : null}

        {phase === "PREFLIGHT" && preflight ? <div className="knowledge-import-preflight">
          <p>Review the bounded request before any provider call. Cancel makes zero requests.</p>
          <dl className="knowledge-import-facts">
            <div><dt>Task</dt><dd>{preflight.taskLabel}</dd></div>
            <div><dt>Provider</dt><dd>{preflight.provider}</dd></div>
            <div><dt>Model</dt><dd><select aria-label="Import model" value={preflight.modelId} disabled={loading} onChange={(event) => void changeModel(event.target.value)}>{preflight.models.map((model) => <option key={model.modelId} value={model.modelId} disabled={!supportsStructuredOutput(model)}>{structuredWorkflowModelLabel(model)}</option>)}</select></dd></div>
            <div><dt>Sources</dt><dd>{preflight.sources.length} Markdown {preflight.sources.length === 1 ? "file" : "files"} · {formatBytes(preflight.totalSourceBytes)}</dd></div>
            <div><dt>Source handling</dt><dd>{preflight.boundedOrTruncated ? "Bounded or truncated" : "Full bounded selection · no truncation"}</dd></div>
            <div><dt>Estimated input</dt><dd>{preflight.estimatedInputTokensMinimum.toLocaleString()}–{preflight.estimatedInputTokensMaximum.toLocaleString()} tokens · {preflight.usageBand}</dd></div>
            <div><dt>Recent latency</dt><dd>{preflight.recentObservedLatencyMs ? `${(preflight.recentObservedLatencyMs / 1000).toFixed(1)} s` : "Unavailable"}</dd></div>
            <div><dt>Estimated cost</dt><dd>{preflight.estimatedCostUsdMaximum === undefined ? "Unavailable" : `Up to $${preflight.estimatedCostUsdMaximum.toFixed(4)}`}</dd></div>
          </dl>
          <ul className="knowledge-import-source-list">{preflight.sources.map((source) => <li key={source.sourceId}><span>{source.sourceId}</span><small>{formatBytes(source.bytes)}</small></li>)}</ul>
          <p className="knowledge-import-boundary">Markdown is sent as untrusted project data. Extraction creates review candidates only; nothing becomes Project Brain until Apply Selected.</p>
          <footer className="knowledge-import-actions"><button className="text-button" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-button" type="button" onClick={() => void runExtraction()} disabled={loading || !selectedModel || !supportsStructuredOutput(selectedModel)}>{loading ? "Extracting…" : `Run extraction with ${selectedModel?.displayName ?? "selected model"}`}</button></footer>
        </div> : null}

        {phase === "RUNNING" && preflight ? <div className="knowledge-import-running" role="status" aria-live="polite">
          <h3>Extracting import candidates…</h3>
          <p>ForgeMind is waiting for the one confirmed {preflight.provider} request. No retry will run automatically.</p>
          <dl className="knowledge-import-facts">
            <div><dt>Model</dt><dd>{selectedModel?.displayName ?? preflight.modelId}</dd></div>
            <div><dt>Sources</dt><dd>{preflight.sources.length} Markdown {preflight.sources.length === 1 ? "file" : "files"} · {formatBytes(preflight.totalSourceBytes)}</dd></div>
          </dl>
          <ul className="knowledge-import-source-list">{preflight.sources.map((source) => <li key={source.sourceId}><span>{source.sourceId}</span><small>{formatBytes(source.bytes)}</small></li>)}</ul>
        </div> : null}

        {phase === "REVIEW_QUEUE" ? <div className="knowledge-import-review">
          <div className="knowledge-import-review-toolbar"><div><strong>Candidate Review Queue</strong><small>{selectedCount} of {candidates.length} selected · no project mutation yet</small></div><div><button className="text-button" type="button" onClick={() => setSelectedIds(new Set(candidates.filter((candidate) => candidate.confidence === "HIGH" && candidate.duplicateStatus === "NEW").map((candidate) => candidate.id)))}>Select all HIGH confidence</button><button className="text-button" type="button" onClick={() => setSelectedIds(new Set())}>Clear selection</button></div></div>
          <div className="knowledge-import-candidates">{candidates.map((candidate) => {
            const editing = editingIds.has(candidate.id);
            return <article className={`knowledge-import-candidate${candidate.duplicateStatus !== "NEW" ? " import-candidate-warning" : ""}`} key={candidate.id}>
              <header><label><input type="checkbox" aria-label={`Select ${candidate.title}`} checked={selectedIds.has(candidate.id)} onChange={(event) => setSelected(candidate.id, event.target.checked)} /><span><strong>{candidateTypeLabel(candidate.type)}</strong><small>{candidate.confidence} confidence · {candidate.duplicateStatus.replaceAll("_", " ")}</small></span></label><div><button className="text-button" type="button" onClick={() => setEditingIds((current) => { const next = new Set(current); if (editing) next.delete(candidate.id); else next.add(candidate.id); return next; })}>{editing ? "Done" : "Edit"}</button><button className="text-button" type="button" onClick={() => setSelected(candidate.id, false)}>Skip</button></div></header>
              {editing ? <div className="knowledge-import-edit"><label>Title<input value={candidate.title} maxLength={120} onChange={(event) => updateCandidate(candidate.id, { title: event.target.value })} /></label><label>Content<textarea value={candidate.content} maxLength={2000} rows={4} onChange={(event) => updateCandidate(candidate.id, { content: event.target.value })} /></label><label>Project Brain section<select value={candidate.section} onChange={(event) => updateCandidate(candidate.id, { section: event.target.value as KnowledgeArea })}>{KNOWLEDGE_AREAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div> : <><h3>{candidate.title}</h3><p>{candidate.content}</p><small>Suggested section: {KNOWLEDGE_AREAS.find(([value]) => value === candidate.section)?.[1]}</small></>}
              <div className="knowledge-import-trace"><strong>DOCUMENTED source</strong>{candidate.sourceTrace.map((source) => <div key={source.sourceId}><span>{source.sourceId}{source.section ? ` · ${source.section}` : ""}</span>{source.excerpt ? <blockquote>{source.excerpt}</blockquote> : null}</div>)}</div>
              {candidate.note ? <p className="knowledge-import-note">Extraction note: {candidate.note}</p> : null}
            </article>;
          })}</div>
          <footer className="knowledge-import-actions"><button className="text-button" type="button" onClick={close} disabled={loading}>Cancel</button><button className="primary-button" type="button" onClick={() => void applySelected()} disabled={loading || selectedCount === 0}>{loading ? "Applying…" : `Apply Selected (${selectedCount})`}</button></footer>
        </div> : null}

        {phase === "EMPTY_RESULT" && preflight ? <div className="knowledge-import-empty">
          <h3>No import candidates found.</h3>
          <p>ForgeMind did not find durable knowledge, decisions, or open questions in the selected Markdown.</p>
          <dl className="knowledge-import-facts">
            <div><dt>Provider request</dt><dd>Executed</dd></div>
            <div><dt>Model</dt><dd>{selectedModel?.displayName ?? preflight.modelId}</dd></div>
            <div><dt>Sources</dt><dd>{preflight.sources.length} Markdown {preflight.sources.length === 1 ? "file" : "files"}</dd></div>
          </dl>
          <ul className="knowledge-import-source-list">{preflight.sources.map((source) => <li key={source.sourceId}><span>{source.sourceId}</span><small>{formatBytes(source.bytes)}</small></li>)}</ul>
          <p>Nothing was added to Project Brain. Running again requires a new review and explicit confirmation.</p>
          <footer className="knowledge-import-actions"><button className="text-button" type="button" onClick={backToSelection}>Back to selection</button><button className="primary-button" type="button" onClick={reviewBeforeRetry}>Review request to run again</button></footer>
        </div> : null}

        {phase === "ERROR" && error ? <div className="knowledge-import-error" role="alert">
          <p className="eyebrow">Knowledge Import stopped</p>
          <h3>{error.code}</h3>
          <p>{error.message}</p>
          <dl className="knowledge-import-facts">
            <div><dt>Provider request</dt><dd>{error.requestExecuted === true ? "Executed" : error.requestExecuted === false ? "Not sent" : "Status unavailable"}</dd></div>
            {preflight ? <><div><dt>Model</dt><dd>{selectedModel?.displayName ?? preflight.modelId}</dd></div><div><dt>Sources</dt><dd>{preflight.sources.length} Markdown {preflight.sources.length === 1 ? "file" : "files"}</dd></div></> : null}
          </dl>
          {preflight ? <ul className="knowledge-import-source-list">{preflight.sources.map((source) => <li key={source.sourceId}><span>{source.sourceId}</span><small>{formatBytes(source.bytes)}</small></li>)}</ul> : null}
          <p>No candidates were created and no project data was changed. No automatic retry was performed.</p>
          <footer className="knowledge-import-actions"><button className="text-button" type="button" onClick={backToSelection}>Back to selection</button>{preflight ? <button className="primary-button" type="button" onClick={reviewBeforeRetry}>Review request to retry</button> : null}</footer>
        </div> : null}

        {phase === "APPLY_RESULT" && result ? <div className="knowledge-import-result">
          <p className="success-message" role="status">Applied {appliedCount} reviewed {appliedCount === 1 ? "candidate" : "candidates"} to the owning Project Brain domains.</p>
          <dl className="knowledge-import-facts"><div><dt>Project Knowledge</dt><dd>{result.appliedKnowledge}</dd></div><div><dt>Proposed Decisions</dt><dd>{result.proposedDecisions}</dd></div><div><dt>Open Questions</dt><dd>{result.openQuestions}</dd></div><div><dt>Skipped duplicates</dt><dd>{result.skippedDuplicates + skippedSummary.duplicates}</dd></div><div><dt>Manually deselected</dt><dd>{skippedSummary.manuallyDeselected}</dd></div>{skippedSummary.reviewRequired > 0 ? <div><dt>Review required · not applied</dt><dd>{skippedSummary.reviewRequired}</dd></div> : null}{skippedSummary.otherNotSelected > 0 ? <div><dt>Other not selected</dt><dd>{skippedSummary.otherNotSelected}</dd></div> : null}</dl>
          {result.errors.length > 0 ? <section aria-label="Import item errors"><h3>Items not applied</h3><ul>{result.errors.map((item) => <li key={item.candidateId}><strong>{item.title}</strong>: {item.message}</li>)}</ul></section> : null}
          <p>Game Wiki now reads the accepted entries from Compendium and Decisions. No separate Wiki store was created.</p>
          <footer className="knowledge-import-actions"><button className="primary-button" type="button" onClick={close}>Done</button></footer>
        </div> : null}
      </section>
    </div> : null}
  </>;
}
