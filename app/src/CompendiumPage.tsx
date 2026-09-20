import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Workspace } from "./App";
import { loadInterview } from "./platform/projectInterview";
import {
  createKnowledgeEntry,
  deprecateKnowledgeEntry,
  importInterviewKnowledge,
  KNOWLEDGE_AREAS,
  KNOWLEDGE_STATUSES,
  knowledgeAreaLabel,
  loadCompendium,
  updateKnowledgeEntry,
  type CompendiumDocument,
  type KnowledgeArea,
  type KnowledgeEntry,
  type KnowledgeEntryInput,
  type KnowledgeStatus,
} from "./platform/projectKnowledge";

function errorDetails(error: unknown): { code: string; message: string } {
  if (typeof error === "object" && error !== null) {
    const code = "code" in error && typeof error.code === "string" ? error.code : "COMPENDIUM_ERROR";
    const message = "message" in error && typeof error.message === "string"
      ? error.message
      : "ForgeMind could not update the Game Compendium.";
    return { code, message };
  }
  return { code: "COMPENDIUM_ERROR", message: "ForgeMind could not update the Game Compendium." };
}

const emptyInput: KnowledgeEntryInput = {
  area: "overview",
  title: "",
  statement: "",
  status: "DIRECTION",
};

function KnowledgeEditor({
  mode,
  input,
  setInput,
  busy,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  input: KnowledgeEntryInput;
  setInput: Dispatch<SetStateAction<KnowledgeEntryInput>>;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className={`knowledge-form ${mode === "edit" ? "inline-knowledge-editor" : "knowledge-card"}`} onSubmit={onSubmit}>
      <h3>{mode === "edit" ? "Edit Knowledge" : "Add Knowledge"}</h3>
      <div className="knowledge-form-grid">
        <label>Section
          <select value={input.area} onChange={(event) => setInput({ ...input, area: event.target.value as KnowledgeArea })}>
            {KNOWLEDGE_AREAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>Status
          <select value={input.status} onChange={(event) => setInput({ ...input, status: event.target.value as KnowledgeStatus })}>
            {KNOWLEDGE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      <label>Title
        <input required maxLength={120} value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} />
      </label>
      <label>Statement
        <textarea required maxLength={2000} rows={4} value={input.statement} onChange={(event) => setInput({ ...input, statement: event.target.value })} />
      </label>
      {mode === "create" ? <p className="scope-note">Manual entries retain MANUAL provenance and manual_entry source.</p> : null}
      <div className="knowledge-actions">
        <button className="primary-button compact-action" type="submit" disabled={busy}>{busy ? "Saving..." : "Save Knowledge"}</button>
        <button className="outline-button compact-action" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export function CompendiumPage({
  workspace,
  onPromote,
  editEntryId,
}: {
  workspace: Workspace;
  onPromote: (entry: KnowledgeEntry) => void;
  editEntryId?: string | null;
}) {
  const [document, setDocument] = useState<CompendiumDocument | null>(null);
  const [interviewAvailable, setInterviewAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<KnowledgeEntryInput>(emptyInput);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<KnowledgeArea | "all">("all");
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus | "all">("all");
  const [openedSourceTarget, setOpenedSourceTarget] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([loadCompendium(workspace.path), loadInterview(workspace.path)])
      .then(([compendium, interview]) => {
        if (!active) return;
        setDocument(compendium);
        setInterviewAvailable(interview !== null);
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorDetails(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [workspace.path]);

  const entries = useMemo(
    () => (document?.entries ?? []).filter((entry) =>
      (areaFilter === "all" || entry.area === areaFilter)
      && (statusFilter === "all" || entry.status === statusFilter)),
    [areaFilter, document, statusFilter],
  );

  function openCreate() {
    setEditingId(null);
    setInput(emptyInput);
    setFormOpen(true);
    setError(null);
  }

  function openEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id);
    setInput({ area: entry.area, title: entry.title, statement: entry.statement, status: entry.status });
    setFormOpen(false);
    setExpandedIds((current) => current.includes(entry.id) ? current : [...current, entry.id]);
    setError(null);
  }

  useEffect(() => {
    if (loading || !editEntryId || openedSourceTarget === editEntryId) return;
    const entry = document?.entries.find((candidate) => candidate.id === editEntryId);
    if (!entry) return;
    setAreaFilter("all");
    setStatusFilter("all");
    openEdit(entry);
    setOpenedSourceTarget(editEntryId);
  }, [document, editEntryId, loading, openedSourceTarget]);

  function cancelEditor() {
    if (editingId !== null) {
      setExpandedIds((current) => current.filter((id) => id !== editingId));
    }
    setFormOpen(false);
    setEditingId(null);
    setInput(emptyInput);
  }

  function toggleExpanded(entryId: string) {
    setExpandedIds((current) => current.includes(entryId)
      ? current.filter((id) => id !== entryId)
      : [...current, entryId]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = editingId === null
        ? await createKnowledgeEntry(workspace.path, workspace.projectId, input)
        : await updateKnowledgeEntry(workspace.path, workspace.projectId, editingId, input);
      setDocument(next);
      setFormOpen(false);
      setEditingId(null);
      setInput(emptyInput);
    } catch (saveError) {
      setError(errorDetails(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function importInterview() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await importInterviewKnowledge(workspace.path, workspace.projectId);
      setDocument(result.document);
      setNotice(
        `${result.importedCount} imported, ${result.skippedDuplicateCount} duplicate ${result.skippedDuplicateCount === 1 ? "entry" : "entries"} skipped.`,
      );
    } catch (importError) {
      setError(errorDetails(importError));
    } finally {
      setBusy(false);
    }
  }

  async function deprecate(entry: KnowledgeEntry) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setDocument(await deprecateKnowledgeEntry(workspace.path, workspace.projectId, entry.id));
    } catch (deprecateError) {
      setError(errorDetails(deprecateError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <section className="knowledge-card" aria-live="polite"><h2>Loading Game Compendium</h2></section>;
  }

  return (
    <div className="knowledge-stack">
      <section className="knowledge-card compendium-intro">
        <div>
          <span className="section-label">Current project intent</span>
          <h2>Game Compendium</h2>
          <p>Durable, reviewable project knowledge stored with this ForgeMind workspace.</p>
        </div>
        <div className="knowledge-actions">
          {interviewAvailable ? (
            <button className="outline-button" type="button" disabled={busy} onClick={() => void importInterview()}>
              Import Saved Interview Knowledge
            </button>
          ) : null}
          <button className="primary-button" type="button" disabled={busy} onClick={openCreate}>Add Knowledge</button>
        </div>
      </section>

      {error ? <div className="knowledge-error" role="alert"><strong>{error.code}</strong><p>{error.message}</p></div> : null}
      {notice ? <p className="knowledge-notice" role="status">{notice}</p> : null}

      {formOpen && editingId === null ? (
        <KnowledgeEditor
          mode="create"
          input={input}
          setInput={setInput}
          busy={busy}
          onSubmit={(event) => void submit(event)}
          onCancel={cancelEditor}
        />
      ) : null}

      <section className="knowledge-filters" aria-label="Compendium filters">
        <label>Section
          <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value as KnowledgeArea | "all")}>
            <option value="all">All sections</option>
            {KNOWLEDGE_AREAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as KnowledgeStatus | "all")}>
            <option value="all">All statuses</option>
            {KNOWLEDGE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </section>

      {entries.length === 0 ? (
        <section className="knowledge-card empty-knowledge">
          <h3>No Compendium knowledge yet</h3>
          <p>Add a manual entry{interviewAvailable ? " or explicitly import approved Project Interview knowledge" : ""}. Nothing is imported automatically.</p>
        </section>
      ) : (
        <section className="knowledge-list" aria-label="Compendium knowledge entries">
          {entries.map((entry) => {
            const expanded = expandedIds.includes(entry.id);
            const editing = editingId === entry.id;
            return (
              <article
                className={`knowledge-entry compact-knowledge-entry ${entry.status === "DEPRECATED" ? "knowledge-deprecated" : ""}`}
                aria-label={`Knowledge entry: ${entry.title}`}
                key={entry.id}
              >
                {editing ? (
                  <KnowledgeEditor
                    mode="edit"
                    input={input}
                    setInput={setInput}
                    busy={busy}
                    onSubmit={(event) => void submit(event)}
                    onCancel={cancelEditor}
                  />
                ) : (
                  <>
                    <div className="compact-entry-heading">
                      <h3>{entry.title}</h3>
                      <div className="knowledge-badges">
                        <span>{knowledgeAreaLabel(entry.area)}</span>
                        <strong className={`knowledge-status status-${entry.status.toLowerCase()}`}>{entry.status}</strong>
                        <span>{entry.provenance}</span><span>{entry.source}</span>
                      </div>
                    </div>
                    <p className={expanded ? "knowledge-statement-full" : "knowledge-statement-preview"}>{entry.statement}</p>
                    <div className="compact-entry-footer">
                      <small>Updated <time dateTime={entry.updatedAt}>{new Date(entry.updatedAt).toLocaleString()}</time></small>
                      <div className="knowledge-actions">
                        <button className="outline-button compact-action" type="button" aria-expanded={expanded} onClick={() => toggleExpanded(entry.id)}>
                          {expanded ? "Collapse" : "Expand"}
                        </button>
                        <button className="outline-button compact-action" type="button" disabled={busy} onClick={() => openEdit(entry)}>Edit</button>
                        <button className="outline-button compact-action" type="button" aria-label="Promote to Decision" onClick={() => onPromote(entry)}>Promote</button>
                        {entry.status !== "DEPRECATED" ? (
                          <button className="outline-button compact-action" type="button" disabled={busy} onClick={() => void deprecate(entry)}>Deprecate</button>
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
