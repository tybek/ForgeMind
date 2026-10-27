import { useEffect, useState, type FormEvent } from "react";
import type { Workspace } from "./App";
import {
  approveDecision,
  createDecision,
  deprecateDecision,
  loadDecisions,
  updateDecision,
  type Decision,
  type DecisionInput,
  type DecisionsDocument,
} from "./platform/decisions";
import {
  KNOWLEDGE_AREAS,
  knowledgeAreaLabel,
  loadCompendium,
  type KnowledgeArea,
  type KnowledgeEntry,
} from "./platform/projectKnowledge";

function errorDetails(error: unknown): { code: string; message: string } {
  if (typeof error === "object" && error !== null) {
    const code = "code" in error && typeof error.code === "string" ? error.code : "DECISIONS_ERROR";
    const message = "message" in error && typeof error.message === "string"
      ? error.message
      : "ForgeMind could not update Decisions.";
    return { code, message };
  }
  return { code: "DECISIONS_ERROR", message: "ForgeMind could not update Decisions." };
}

function emptyInput(): DecisionInput {
  return {
    title: "",
    statement: "",
    rationale: "",
    area: "overview",
    author: "Local User",
    supersedesDecisionId: null,
    relatedKnowledgeEntryIds: [],
  };
}

export function DecisionsPage({
  workspace,
  promotedKnowledge,
  writersRoomReturnLabel,
  onReturnToWritersRoom,
}: {
  workspace: Workspace;
  promotedKnowledge: KnowledgeEntry | null;
  writersRoomReturnLabel?: string;
  onReturnToWritersRoom?: () => void;
}) {
  const [document, setDocument] = useState<DecisionsDocument | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [formOpen, setFormOpen] = useState(promotedKnowledge !== null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<DecisionInput>(() => promotedKnowledge ? {
    ...emptyInput(),
    title: promotedKnowledge.title,
    statement: promotedKnowledge.statement,
    area: promotedKnowledge.area,
    relatedKnowledgeEntryIds: [promotedKnowledge.id],
  } : emptyInput());

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([loadDecisions(workspace.path), loadCompendium(workspace.path)])
      .then(([decisions, compendium]) => {
        if (!active) return;
        setDocument(decisions);
        setKnowledge(compendium?.entries ?? []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorDetails(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [workspace.path]);

  function openCreate() {
    setEditingId(null);
    setInput(emptyInput());
    setFormOpen(true);
    setError(null);
  }

  function openEdit(decision: Decision) {
    setEditingId(decision.id);
    setInput({
      title: decision.title,
      statement: decision.statement,
      rationale: decision.rationale,
      area: decision.area,
      author: decision.author,
      supersedesDecisionId: decision.supersedesDecisionId,
      relatedKnowledgeEntryIds: decision.relatedKnowledgeEntryIds,
    });
    setFormOpen(true);
    setError(null);
  }

  function openReplacement(decision: Decision) {
    setEditingId(null);
    setInput({
      title: `Replace: ${decision.title}`,
      statement: decision.statement,
      rationale: "",
      area: decision.area,
      author: "Local User",
      supersedesDecisionId: decision.id,
      relatedKnowledgeEntryIds: decision.relatedKnowledgeEntryIds,
    });
    setFormOpen(true);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = editingId === null
        ? await createDecision(workspace.path, workspace.projectId, input)
        : await updateDecision(workspace.path, workspace.projectId, editingId, {
          title: input.title,
          statement: input.statement,
          rationale: input.rationale,
          area: input.area,
          supersedesDecisionId: input.supersedesDecisionId,
          relatedKnowledgeEntryIds: input.relatedKnowledgeEntryIds,
        });
      setDocument(next);
      setFormOpen(false);
      setEditingId(null);
      setInput(emptyInput());
    } catch (saveError) {
      setError(errorDetails(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function approve(decision: Decision) {
    setBusy(true);
    setError(null);
    try {
      setDocument(await approveDecision(workspace.path, workspace.projectId, decision.id));
    } catch (approvalError) {
      setError(errorDetails(approvalError));
    } finally {
      setBusy(false);
    }
  }

  async function deprecate(decision: Decision) {
    setBusy(true);
    setError(null);
    try {
      setDocument(await deprecateDecision(workspace.path, workspace.projectId, decision.id));
    } catch (deprecationError) {
      setError(errorDetails(deprecationError));
    } finally {
      setBusy(false);
    }
  }

  function toggleKnowledge(id: string) {
    setInput((current) => ({
      ...current,
      relatedKnowledgeEntryIds: current.relatedKnowledgeEntryIds.includes(id)
        ? current.relatedKnowledgeEntryIds.filter((entryId) => entryId !== id)
        : [...current.relatedKnowledgeEntryIds, id],
    }));
  }

  if (loading) {
    return <section className="knowledge-card" aria-live="polite"><h2>Loading Decisions</h2></section>;
  }

  return (
    <div className="knowledge-stack">
      <section className="knowledge-card compendium-intro">
        <div>
          <span className="section-label">Human-approved project choices</span>
          <h2>Decisions</h2>
          <p>Decisions preserve what was chosen, why, by whom, and what they affect.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}>Create Decision</button>
      </section>

      {writersRoomReturnLabel && onReturnToWritersRoom ? (
        <button className="contextual-return-action" type="button" onClick={onReturnToWritersRoom}>← {writersRoomReturnLabel}</button>
      ) : null}

      {error ? <div className="knowledge-error" role="alert"><strong>{error.code}</strong><p>{error.message}</p></div> : null}

      {formOpen ? (
        <form className="knowledge-card knowledge-form" onSubmit={(event) => void submit(event)}>
          <h3>{editingId ? "Edit Proposed Decision" : input.supersedesDecisionId ? "Propose Replacement Decision" : "Propose Decision"}</h3>
          <p className="scope-note">New decisions are created as Proposed and require explicit approval.</p>
          {input.supersedesDecisionId ? (
            <p className="relationship-note">Proposed successor to: {document?.decisions.find((decision) => decision.id === input.supersedesDecisionId)?.title ?? input.supersedesDecisionId}</p>
          ) : null}
          <label>Area
            <select value={input.area} onChange={(event) => setInput({ ...input, area: event.target.value as KnowledgeArea })}>
              {KNOWLEDGE_AREAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label>Title
            <input required maxLength={120} value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} />
          </label>
          <label>Decision statement
            <textarea required maxLength={2000} rows={4} value={input.statement} onChange={(event) => setInput({ ...input, statement: event.target.value })} />
          </label>
          <label>Rationale
            <textarea required maxLength={2000} rows={4} value={input.rationale} onChange={(event) => setInput({ ...input, rationale: event.target.value })} />
          </label>
          <label>Author
            <input value={input.author} readOnly />
          </label>
          {knowledge.length > 0 ? (
            <fieldset className="knowledge-links">
              <legend>Related Compendium knowledge</legend>
              {knowledge.map((entry) => (
                <label key={entry.id}>
                  <input type="checkbox" checked={input.relatedKnowledgeEntryIds.includes(entry.id)} onChange={() => toggleKnowledge(entry.id)} />
                  {entry.title}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="knowledge-actions">
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving..." : "Save Proposed Decision"}</button>
            <button className="outline-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : null}

      {(document?.decisions.length ?? 0) === 0 ? (
        <section className="knowledge-card empty-knowledge">
          <h3>No Decisions yet</h3>
          <p>Compendium knowledge does not become a Decision automatically. Create or promote one when an explicit choice and rationale should be preserved.</p>
        </section>
      ) : (
        <section className="knowledge-list" aria-label="Project decisions">
          {document?.decisions.map((decision) => (
            <article className={`knowledge-card decision-entry decision-${decision.status.toLowerCase()}`} key={decision.id}>
              <div className="knowledge-badges">
                <span>{knowledgeAreaLabel(decision.area)}</span>
                <strong className={`decision-status status-${decision.status.toLowerCase()}`}>{decision.status}</strong>
                <span>{decision.author}</span>
              </div>
              <h3>{decision.title}</h3>
              <p>{decision.statement}</p>
              <div className="decision-rationale"><strong>Rationale</strong><p>{decision.rationale}</p></div>
              {decision.supersedesDecisionId ? (
                <p className="relationship-note">Supersedes: {document.decisions.find((item) => item.id === decision.supersedesDecisionId)?.title ?? decision.supersedesDecisionId}</p>
              ) : null}
              {decision.relatedKnowledgeEntryIds.length > 0 ? (
                <div className="related-knowledge"><strong>Related knowledge</strong><ul>{decision.relatedKnowledgeEntryIds.map((id) => <li key={id}>{knowledge.find((entry) => entry.id === id)?.title ?? id}</li>)}</ul></div>
              ) : null}
              <div className="knowledge-actions">
                {decision.status === "PROPOSED" ? (
                  <>
                    <button className="outline-button" type="button" onClick={() => openEdit(decision)}>Edit</button>
                    <button className="primary-button" type="button" disabled={busy} onClick={() => void approve(decision)}>Approve Decision</button>
                  </>
                ) : null}
                {decision.status === "APPROVED" ? (
                  <button className="outline-button" type="button" onClick={() => openReplacement(decision)}>Create replacement</button>
                ) : null}
                {!(["SUPERSEDED", "DEPRECATED"] as const).includes(decision.status as "SUPERSEDED" | "DEPRECATED") ? (
                  <button className="outline-button" type="button" disabled={busy} onClick={() => void deprecate(decision)}>Deprecate</button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
