import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { Workspace } from "./App";
import {
  applyAiWorkspaceProposal,
  archiveAiWorkspaceSession,
  archiveAndResetAiWorkspaceHistory,
  createAiWorkspaceSession,
  deleteAiWorkspaceSession,
  listAiWorkspaceProfiles,
  loadAiWorkspaceSessions,
  reopenAiWorkspaceSession,
  reviewAiWorkspaceProposal,
  setAiWorkspaceMarkdownContext,
  updateAiWorkspaceProposal,
  type AiWorkspaceDocument,
  type AiWorkspaceProfile,
  type AiWorkspaceProposal,
  type AiWorkspaceSession,
  type AiWorkspaceSourceTrace,
  type AiWorkspaceUsageReference,
  type AiWorkspaceFocusedQuestion,
  type AiWorkspaceContextSummary,
} from "./platform/aiWorkspace";
import {
  loadWritersRoomPreflight,
  loadWritersRoomUsage,
  runWritersRoom,
  type WritersRoomPreflight,
  type WritersRoomRunMode,
  type WritersRoomUsageRecord,
} from "./platform/writersRoom";

const WRITERS_ROOM_PROFILE_IDS = ["lore_architect", "character_dialogue", "continuity_editor"];

const starters: Record<string, string[]> = {
  lore_architect: ["Develop a faction", "Explore a location", "Define a historical conflict", "Test a worldbuilding idea"],
  character_dialogue: ["Develop a character", "Explore a relationship", "Draft a conversation", "Refine a character voice"],
  continuity_editor: ["Check an idea against established lore", "Find contradictions", "Show unresolved questions", "Summarize what is established"],
};

interface WritersRoomError {
  code?: string;
  message?: string;
}

function safeError(error: unknown): WritersRoomError {
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const code = typeof candidate.code === "string" ? candidate.code : undefined;
    const message = typeof candidate.message === "string" ? candidate.message : undefined;
    if (code || message) return { code, message };
  }
  return { code: "WRITERS_ROOM_FAILED", message: "Writers' Room could not complete the action." };
}

function providerLabel(provider: string): string {
  return provider === "nebius_token_factory" ? "Nebius Token Factory" : provider;
}

function authorityLabel(authority: AiWorkspaceSourceTrace["authority"]): string {
  return authority.replaceAll("_", " ");
}

function proposalLabel(proposal: AiWorkspaceProposal): string {
  if (proposal.proposalType === "SAVE_KNOWLEDGE") return "Add Project Knowledge";
  if (proposal.proposalType === "CREATE_DECISION") return "Create Decision";
  if (proposal.proposalType === "CREATE_OPEN_QUESTION") return "Create Open Question";
  return proposal.proposalType.replaceAll("_", " ");
}

function relativeMarkdownPaths(workspacePath: string, selected: string[]): string[] {
  const root = workspacePath.replaceAll("/", "\\").replace(/\\+$/, "");
  const prefix = `${root.toLowerCase()}\\`;
  return selected.map((path) => {
    const normalized = path.replaceAll("/", "\\");
    if (!normalized.toLowerCase().startsWith(prefix)) {
      throw new Error("Selected Markdown must be inside the current project.");
    }
    const relative = normalized.slice(root.length + 1).replaceAll("\\", "/");
    if (!/\.(md|markdown)$/i.test(relative)) throw new Error("Only Markdown files can be added.");
    return relative;
  });
}

function usageKey(reference: AiWorkspaceUsageReference): string {
  return `${reference.applicationSessionId}:${reference.usageTimestamp}`;
}

function recordKey(record: WritersRoomUsageRecord): string {
  return `${record.sessionId}:${record.timestamp}`;
}

function newestActiveSessionId(document: AiWorkspaceDocument | null, excludedId?: string): string | null {
  let newest: AiWorkspaceSession | null = null;
  for (const session of document?.sessions ?? []) {
    if (session.surface !== "writers_room" || session.status !== "ACTIVE" || session.id === excludedId) continue;
    if (!newest || Date.parse(session.updatedAt) > Date.parse(newest.updatedAt)) newest = session;
  }
  return newest?.id ?? null;
}

function formatLatency(preflight: WritersRoomPreflight): string {
  if (!preflight.historyAvailable) return "Local history unavailable";
  const history = preflight.historicalLatency;
  if (!history) return "Not enough local history";
  if (history.observationCount === 1) return `Last observed: ~${(history.lastMs / 1000).toFixed(1)} s`;
  return `Recent: ~${(history.minimumMs / 1000).toFixed(1)}–${(history.maximumMs / 1000).toFixed(1)} s`;
}

function SourceCards({ sources, onOpenSource }: { sources: AiWorkspaceSourceTrace[]; onOpenSource?: (source: AiWorkspaceSourceTrace) => void }) {
  const safeSources = Array.isArray(sources) ? sources : [];
  if (safeSources.length === 0) return null;
  return (
    <section className="writers-room-sources" aria-label="Sources used">
      <strong>Sources used</strong>
      <div>
        {safeSources.map((source) => (
          <button
            type="button"
            key={`${source.sourceType}:${source.sourceId}`}
            className="writers-room-source-card"
            aria-label={source.navigationTarget && onOpenSource ? `Open source: ${source.label}` : undefined}
            disabled={!source.navigationTarget || !onOpenSource}
            onClick={() => onOpenSource?.(source)}
          >
            <span>{source.label}</span>
            <small>{authorityLabel(source.authority)}</small>
            {source.navigationTarget && onOpenSource ? <span className="writers-room-source-action" aria-hidden="true">Open source <span>→</span></span> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function ContextSummary({ summary }: { summary: AiWorkspaceContextSummary }) {
  return (
    <section className="writers-room-message-context" aria-label="Narrative context summary">
      <strong>Narrative context</strong>
      <span>{summary.establishedKnowledge} established</span>
      <span>{summary.approvedDecisions} approved decisions</span>
      <span>{summary.openQuestions} open questions</span>
      <span>{summary.documentedSources} documented sources</span>
      <span>{summary.recentMessages} recent messages</span>
    </section>
  );
}

function FocusedQuestions({ questions }: { questions: AiWorkspaceFocusedQuestion[] }) {
  if (questions.length === 0) return null;
  return (
    <section className="writers-room-guided-questions">
      <strong>Focused questions</strong>
      <ul>{questions.map((question) => <li key={question.question}>{question.question}</li>)}</ul>
    </section>
  );
}

interface ProposalDraft {
  title: string;
  summary: string;
  reason?: string;
}

function ProposalCard({
  proposal,
  busy,
  onReview,
  onSaveEdit,
  onDiscard,
  onApply,
  onOpenSource,
}: {
  proposal: AiWorkspaceProposal;
  busy: boolean;
  onReview: (draft: ProposalDraft) => void;
  onSaveEdit: (draft: ProposalDraft) => void;
  onDiscard: () => void;
  onApply: () => void;
  onOpenSource?: (source: AiWorkspaceSourceTrace) => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [draft, setDraft] = useState<ProposalDraft>({ title: proposal.title, summary: proposal.summary, reason: proposal.reason });
  useEffect(() => {
    setDraft({ title: proposal.title, summary: proposal.summary, reason: proposal.reason });
    setReviewing(false);
  }, [proposal.title, proposal.summary, proposal.reason, proposal.status]);
  const changed = draft.title.trim() !== proposal.title || draft.summary.trim() !== proposal.summary || (draft.reason?.trim() || undefined) !== proposal.reason;
  return (
    <article className="writers-room-proposal">
      <header>
        <span>{proposalLabel(proposal)}</span>
        <strong>{proposal.status}</strong>
      </header>
      {reviewing ? (
        <div className="writers-room-proposal-editor">
          <label>Proposal title<input value={draft.title} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
          <label>Proposed content<textarea value={draft.summary} maxLength={4000} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} /></label>
          <label>Reason<textarea value={draft.reason ?? ""} maxLength={2000} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value || undefined }))} /></label>
          <div className="writers-room-proposal-actions">
            {proposal.status === "PENDING"
              ? <button className="primary-button" type="button" disabled={busy || !draft.title.trim() || !draft.summary.trim()} onClick={() => onReview(draft)}>Accept proposal</button>
              : <button className="primary-button" type="button" disabled={busy || !changed || !draft.title.trim() || !draft.summary.trim()} onClick={() => onSaveEdit(draft)}>Save changes</button>}
            <button type="button" disabled={busy} onClick={() => { setDraft({ title: proposal.title, summary: proposal.summary, reason: proposal.reason }); setReviewing(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <h4>{proposal.title}</h4>
          <p>{proposal.summary}</p>
          {proposal.reason ? <p className="writers-room-proposal-reason"><strong>Why:</strong> {proposal.reason}</p> : null}
          {proposal.editedByHuman ? <small className="writers-room-reviewed-note">AI-assisted · human edited</small> : null}
        </>
      )}
      <SourceCards sources={proposal.sourceTrace} onOpenSource={onOpenSource} />
      {proposal.status === "PENDING" && !reviewing ? (
        <div className="writers-room-proposal-actions">
          <button type="button" disabled={busy} onClick={() => setReviewing(true)}>Review &amp; edit</button>
          <button type="button" disabled={busy} onClick={onDiscard}>Discard proposal</button>
        </div>
      ) : null}
      {proposal.status === "ACCEPTED" && !reviewing ? (
        <div className="writers-room-proposal-actions">
          <button className="primary-button" type="button" disabled={busy} onClick={onApply}>Apply</button>
          <button type="button" disabled={busy} onClick={() => setReviewing(true)}>Edit before Apply</button>
          <span>Uses the owning Project Brain workflow.</span>
        </div>
      ) : null}
    </article>
  );
}

function PreflightDialog({
  preflight,
  loading,
  error,
  selectedModelId,
  onModelChange,
  onCancel,
  onRun,
}: {
  preflight: WritersRoomPreflight | null;
  loading: boolean;
  error: WritersRoomError | null;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  onCancel: () => void;
  onRun: () => void;
}) {
  const model = preflight?.models.find((candidate) => candidate.modelId === selectedModelId);
  return (
    <div className="writers-room-dialog-backdrop">
      <section className="writers-room-preflight" role="dialog" aria-modal="true" aria-labelledby="writers-room-preflight-title">
        <header>
          <div>
            <span className="section-label">Credit-aware preflight</span>
            <h2 id="writers-room-preflight-title">{preflight?.taskLabel ?? "Preparing Writers' Room request"}</h2>
          </div>
          <button type="button" onClick={onCancel}>Cancel</button>
        </header>
        {preflight ? (
          <>
            <dl className="writers-room-preflight-grid">
              <div><dt>Task / profile</dt><dd>{preflight.profileName}</dd></div>
              <div><dt>Provider</dt><dd>{providerLabel(preflight.provider)}</dd></div>
              <div><dt>Estimated input</dt><dd>~{preflight.estimatedInputTokens.minimum}–{preflight.estimatedInputTokens.maximum} tokens</dd></div>
              <div><dt>Usage band</dt><dd><span className={`creator-usage-band creator-usage-band--${preflight.usageBand}`}>{preflight.usageBand.toUpperCase()}</span></dd></div>
              <div><dt>Local latency</dt><dd>{formatLatency(preflight)}</dd></div>
              <div><dt>Provider cost</dt><dd>{preflight.estimatedCostUsd ? `~$${preflight.estimatedCostUsd.minimumUsd.toFixed(4)}–$${preflight.estimatedCostUsd.maximumUsd.toFixed(4)}` : "Exact estimate unavailable"}</dd></div>
            </dl>
            <label className="writers-room-model-select">
              Model
              <select value={selectedModelId} disabled={loading} onChange={(event) => onModelChange(event.target.value)}>
                {preflight.models.map((candidate) => <option value={candidate.modelId} key={candidate.modelId}>{candidate.displayName}{candidate.modelId === preflight.defaultModelId ? " — profile default" : ""}</option>)}
              </select>
              {model ? <small>{model.displayName} · {model.modelId}</small> : null}
            </label>
            <section className="writers-room-context-summary">
              <strong>Context summary</strong>
              <ul>{preflight.contextSummary.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </>
        ) : null}
        {error ? <p role="alert" className="writers-room-error"><strong>{error.code ?? "PREFLIGHT_FAILED"}</strong> {error.message}</p> : null}
        <footer>
          <p>One confirmation sends exactly one provider request. Cancel sends nothing.</p>
          <button className="primary-button" type="button" disabled={!preflight || loading || Boolean(error)} onClick={onRun}>{loading ? "Preparing…" : "Send request"}</button>
        </footer>
      </section>
    </div>
  );
}

export function WritersRoomPage({
  workspace,
  onOpenSource,
}: {
  workspace: Workspace;
  onOpenSource?: (source: AiWorkspaceSourceTrace) => void;
}) {
  const [document, setDocument] = useState<AiWorkspaceDocument | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [profiles, setProfiles] = useState<AiWorkspaceProfile[]>([]);
  const [usage, setUsage] = useState<WritersRoomUsageRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<WritersRoomError | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<AiWorkspaceSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<WritersRoomError | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newProfileId, setNewProfileId] = useState("lore_architect");
  const [preflightMode, setPreflightMode] = useState<WritersRoomRunMode | null>(null);
  const [preflightMessage, setPreflightMessage] = useState<string | undefined>();
  const [preflight, setPreflight] = useState<WritersRoomPreflight | null>(null);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [loadingPreflight, setLoadingPreflight] = useState(false);
  const [running, setRunning] = useState(false);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [error, setError] = useState<WritersRoomError | null>(null);
  const [persistenceError, setPersistenceError] = useState<WritersRoomError | null>(null);
  const [runRecoveryAvailable, setRunRecoveryAvailable] = useState(false);
  const requestLock = useRef(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const followNewestMessage = useRef(true);

  const sessions = document?.sessions ?? [];
  const sessionsById = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const profilesById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const selectedSession = selectedSessionId ? sessionsById.get(selectedSessionId) ?? null : null;
  const activeProfile = selectedSession ? profilesById.get(selectedSession.specialistProfileId) ?? null : null;
  const runnableProfiles = useMemo(() => profiles.filter((profile) => WRITERS_ROOM_PROFILE_IDS.includes(profile.id)), [profiles]);
  const usageByReference = useMemo(() => new Map(usage.map((record) => [recordKey(record), record])), [usage]);
  const writersRoomSessions = useMemo(() => sessions
    .filter((session) => session.surface === "writers_room")
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "ACTIVE" ? -1 : 1;
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    }), [sessions]);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setPersistenceError(null);
    try {
      setDocument(await loadAiWorkspaceSessions(workspace.path));
    } catch (reason) {
      setPersistenceError(safeError(reason));
    } finally {
      setLoadingSessions(false);
    }
  }, [workspace.path]);

  useEffect(() => {
    setError(null);
    setPersistenceError(null);
    setDocument(null);
    setSelectedSessionId(null);
    void listAiWorkspaceProfiles().then(setProfiles).catch((reason) => setError(safeError(reason)));
    void loadWritersRoomUsage(workspace.projectId).then(setUsage).catch(() => setUsage([]));
    void loadSessions();
  }, [loadSessions, workspace.path, workspace.projectId]);

  useEffect(() => {
    setSelectedSessionId((current) => {
      const writersRoomSessions = document?.sessions.filter((session) => session.surface === "writers_room") ?? [];
      if (current && writersRoomSessions.some((session) => session.id === current)) return current;
      return newestActiveSessionId(document);
    });
  }, [document]);

  useEffect(() => {
    if (!createOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !creating) {
        setCreateOpen(false);
        setCreateError(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [createOpen, creating]);

  useEffect(() => {
    if (!deleteCandidate) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) {
        setDeleteCandidate(null);
        setDeleteError(null);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteCandidate, deleting]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation && followNewestMessage.current) conversation.scrollTop = conversation.scrollHeight;
  }, [selectedSessionId, selectedSession?.messages.length]);

  async function createSession() {
    if (!newTitle.trim() || creating) return;
    setError(null);
    setCreateError(null);
    setCreating(true);
    try {
      const updated = await createAiWorkspaceSession(
        workspace.path,
        workspace.projectId,
        "writers_room",
        "Develop narrative ideas through source-aware conversation and reviewed proposals.",
        newProfileId,
        newTitle.trim(),
      );
      const previousIds = new Set(sessions.map((session) => session.id));
      const created = updated.sessions.find((session) => !previousIds.has(session.id)) ?? updated.sessions.at(-1);
      setDocument(updated);
      setSelectedSessionId(created?.id ?? null);
      setNewTitle("");
      setCreateOpen(false);
    } catch (reason) { setCreateError(safeError(reason)); }
    finally { setCreating(false); }
  }

  async function archiveSession(session: AiWorkspaceSession) {
    setError(null);
    try {
      const updated = await archiveAiWorkspaceSession(workspace.path, workspace.projectId, session.id);
      setDocument(updated);
      if (selectedSessionId === session.id) setSelectedSessionId(newestActiveSessionId(updated, session.id));
    } catch (reason) { setError(safeError(reason)); }
  }

  async function reopenSession(session: AiWorkspaceSession) {
    setError(null);
    try {
      const updated = await reopenAiWorkspaceSession(workspace.path, workspace.projectId, session.id);
      setDocument(updated);
      setSelectedSessionId(session.id);
      followNewestMessage.current = true;
    } catch (reason) { setError(safeError(reason)); }
  }

  async function deleteSession() {
    if (!deleteCandidate || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const updated = await deleteAiWorkspaceSession(workspace.path, workspace.projectId, deleteCandidate.id);
      setDocument(updated);
      if (selectedSessionId === deleteCandidate.id) setSelectedSessionId(newestActiveSessionId(updated));
      setDeleteCandidate(null);
    } catch (reason) { setDeleteError(safeError(reason)); }
    finally { setDeleting(false); }
  }

  async function chooseMarkdown() {
    if (!selectedSession || selectedSession.status !== "ACTIVE") return;
    setError(null);
    try {
      const picked = await open({ multiple: true, directory: false, filters: [{ name: "Markdown", extensions: ["md", "markdown"] }] });
      if (!picked) return;
      const selected = Array.isArray(picked) ? picked : [picked];
      const relative = relativeMarkdownPaths(workspace.path, selected);
      const combined = [...new Set([...selectedSession.selectedMarkdownPaths, ...relative])];
      if (combined.length > 5) throw new Error("A Writers' Room session can include at most 5 Markdown documents.");
      setDocument(await setAiWorkspaceMarkdownContext(workspace.path, workspace.projectId, selectedSession.id, combined));
      setDrawerOpen(true);
    } catch (reason) { setError(safeError(reason)); }
  }

  async function removeMarkdown(relativePath: string) {
    if (!selectedSession) return;
    setError(null);
    try {
      setDocument(await setAiWorkspaceMarkdownContext(
        workspace.path,
        workspace.projectId,
        selectedSession.id,
        selectedSession.selectedMarkdownPaths.filter((path) => path !== relativePath),
      ));
    } catch (reason) { setError(safeError(reason)); }
  }

  async function openPreflight(mode: WritersRoomRunMode) {
    if (!selectedSession || running) return;
    const message = mode === "SEND" ? composer.trim() : undefined;
    if (mode === "SEND" && !message) return;
    setPreflightMode(mode);
    setPreflightMessage(message);
    setPreflight(null);
    setError(null);
    setLoadingPreflight(true);
    try {
      const prepared = await loadWritersRoomPreflight({
        rootPath: workspace.path,
        projectId: workspace.projectId,
        sessionId: selectedSession.id,
        mode,
        message,
      });
      setPreflight(prepared);
      setSelectedModelId(prepared.modelId);
    } catch (reason) { setError(safeError(reason)); }
    finally { setLoadingPreflight(false); }
  }

  async function changeModel(modelId: string) {
    if (!selectedSession || !preflightMode) return;
    setSelectedModelId(modelId);
    setLoadingPreflight(true);
    setError(null);
    try {
      setPreflight(await loadWritersRoomPreflight({
        rootPath: workspace.path,
        projectId: workspace.projectId,
        sessionId: selectedSession.id,
        mode: preflightMode,
        message: preflightMessage,
        modelId,
      }));
    } catch (reason) { setError(safeError(reason)); }
    finally { setLoadingPreflight(false); }
  }

  async function confirmRun() {
    if (!selectedSession || !preflightMode || !preflight || running || requestLock.current) return;
    requestLock.current = true;
    const mode = preflightMode;
    const message = preflightMessage;
    setPreflightMode(null);
    setPreflightMessage(undefined);
    setRunning(true);
    setError(null);
    setRunRecoveryAvailable(false);
    try {
      const result = await runWritersRoom({
        rootPath: workspace.path,
        projectId: workspace.projectId,
        sessionId: selectedSession.id,
        modelId: selectedModelId,
        mode,
        message,
      });
      setDocument(result.document);
      if (mode === "SEND") setComposer("");
      void loadWritersRoomUsage(workspace.projectId).then(setUsage).catch(() => undefined);
    } catch (reason) {
      const failure = safeError(reason);
      setError(failure);
      if (failure.code === "AI_WORKSPACE_RESPONSE_RENDER_FAILED") {
        setRunRecoveryAvailable(true);
        if (mode === "SEND") setComposer("");
      }
    }
    finally { requestLock.current = false; setRunning(false); }
  }

  async function reviewProposal(proposal: AiWorkspaceProposal, status: "ACCEPTED" | "DISCARDED", draft?: ProposalDraft) {
    if (!selectedSession) return;
    setBusyProposalId(proposal.id);
    setError(null);
    try {
      if (status === "ACCEPTED" && draft
        && (draft.title.trim() !== proposal.title || draft.summary.trim() !== proposal.summary || (draft.reason?.trim() || undefined) !== proposal.reason)) {
        await updateAiWorkspaceProposal(
          workspace.path, workspace.projectId, selectedSession.id, proposal.id,
          draft.title.trim(), draft.summary.trim(), draft.reason?.trim() || undefined,
        );
      }
      setDocument(await reviewAiWorkspaceProposal(workspace.path, workspace.projectId, selectedSession.id, proposal.id, status));
    } catch (reason) { setError(safeError(reason)); }
    finally { setBusyProposalId(null); }
  }

  async function saveProposalEdit(proposal: AiWorkspaceProposal, draft: ProposalDraft) {
    if (!selectedSession) return;
    setBusyProposalId(proposal.id);
    setError(null);
    try {
      setDocument(await updateAiWorkspaceProposal(
        workspace.path, workspace.projectId, selectedSession.id, proposal.id,
        draft.title.trim(), draft.summary.trim(), draft.reason?.trim() || undefined,
      ));
    } catch (reason) { setError(safeError(reason)); }
    finally { setBusyProposalId(null); }
  }

  async function applyProposal(proposal: AiWorkspaceProposal) {
    if (!selectedSession) return;
    setBusyProposalId(proposal.id);
    setError(null);
    try {
      const result = await applyAiWorkspaceProposal(workspace.path, workspace.projectId, selectedSession.id, proposal.id);
      setDocument(result.document);
    } catch (reason) { setError(safeError(reason)); }
    finally { setBusyProposalId(null); }
  }

  async function recoverHistory() {
    try {
      const recovery = await archiveAndResetAiWorkspaceHistory(workspace.path);
      setDocument(recovery.document);
      setSelectedSessionId(null);
      setPersistenceError(null);
    } catch (reason) { setPersistenceError(safeError(reason)); }
  }

  const profileStarters = activeProfile ? starters[activeProfile.id] ?? [] : [];
  const hasAssistant = selectedSession?.messages.some((message) => message.role === "ASSISTANT") ?? false;
  const profileAvailable = Boolean(activeProfile?.availableForRuns && WRITERS_ROOM_PROFILE_IDS.includes(activeProfile.id));

  return (
    <section className="writers-room" aria-label="Writers' Room workspace">
      <aside className="writers-room-session-panel">
        <header>
          <div><span className="section-label">Non-authoritative work history</span><h2>Sessions</h2></div>
          <button className="primary-button" type="button" onClick={() => { setCreateError(null); setCreateOpen(true); }}>New Session</button>
        </header>
        <div className="writers-room-session-list" aria-label="Writers' Room sessions">
          {writersRoomSessions.map((session) => {
            const profile = profilesById.get(session.specialistProfileId);
            return (
              <article className={session.id === selectedSessionId ? "writers-room-session is-active" : "writers-room-session"} key={session.id}>
                <button type="button" onClick={() => { followNewestMessage.current = true; setSelectedSessionId(session.id); setError(null); }}>
                  <strong>{session.title}</strong>
                  <span>{profile?.displayName ?? "Profile unavailable"}</span>
                  <small>{session.status === "ARCHIVED" ? "Archived · " : ""}{new Date(session.updatedAt).toLocaleString()}</small>
                </button>
                <div className="writers-room-session-actions">
                  {session.status === "ACTIVE"
                    ? <button className="writers-room-session-action" type="button" aria-label={`Archive ${session.title}`} onClick={() => void archiveSession(session)}>Archive</button>
                    : <button className="writers-room-session-action" type="button" aria-label={`Reopen ${session.title}`} onClick={() => void reopenSession(session)}>Reopen</button>}
                  <button className="writers-room-session-action writers-room-session-action--danger" type="button" aria-label={`Delete ${session.title}`} onClick={() => { setDeleteError(null); setDeleteCandidate(session); }}>Delete</button>
                </div>
              </article>
            );
          })}
          {sessions.every((session) => session.surface !== "writers_room") ? <p className="scope-note">Create a session to begin a source-aware narrative conversation.</p> : null}
        </div>
      </aside>

      <section className="writers-room-workbench">
        {document?.recoveryWarnings?.length ? (
          <p className="writers-room-warning" role="status">Some saved Writers' Room history could not be displayed. Valid sessions remain available.</p>
        ) : null}
        {persistenceError ? (
          <div className="writers-room-error" role="alert">
            <strong>Saved sessions could not be loaded.</strong>
            <p>{persistenceError.message ?? "Writers' Room can still create fresh history after explicit recovery."}</p>
            <button type="button" onClick={() => void loadSessions()}>Retry</button>
            {persistenceError.code === "INVALID_AI_WORKSPACE_HISTORY" ? <button type="button" onClick={() => void recoverHistory()}>Archive invalid history and reset</button> : null}
          </div>
        ) : null}
        {loadingSessions ? (
          <section className="writers-room-loading" role="status">
            <span className="inline-spinner" aria-hidden="true" />
            <div><strong>Loading sessions</strong><p>Restoring project-scoped, non-authoritative work history.</p></div>
          </section>
        ) : selectedSession ? (
          <>
            <header className="writers-room-toolbar">
              <div><span className="section-label">{activeProfile?.displayName ?? "Profile unavailable"}</span><h3>{selectedSession.title}</h3></div>
              <div>
                <button type="button" onClick={() => setDrawerOpen((open) => !open)} aria-expanded={drawerOpen}>Context / Sources</button>
                <button type="button" disabled={selectedSession.status !== "ACTIVE"} onClick={() => void chooseMarkdown()}>Add Markdown Context</button>
              </div>
            </header>

            <div
              className="writers-room-conversation"
              aria-live="polite"
              ref={conversationRef}
              onScroll={(event) => {
                const target = event.currentTarget;
                followNewestMessage.current = target.scrollHeight - target.scrollTop - target.clientHeight < 80;
              }}
            >
              {selectedSession.messages.length === 0 ? (
                <section className="writers-room-empty">
                  <span className="section-label">Creative workspace</span>
                   <h3>{activeProfile?.displayName ?? "Profile unavailable"}</h3>
                   <p>{activeProfile?.taskPurpose ?? "This saved profile is no longer available. The session remains readable and can be archived; choose New Session to continue with a current profile."}</p>
                  <div>{profileStarters.map((starter) => <button type="button" key={starter} onClick={() => setComposer(starter)}>{starter}</button>)}</div>
                  <small>Conversation is exploratory. Nothing becomes project truth until you explicitly review and apply a proposal.</small>
                </section>
              ) : null}
              {selectedSession.messages.map((message) => {
                const record = message.usageReference ? usageByReference.get(usageKey(message.usageReference)) : undefined;
                return (
                  <article className={`writers-room-message writers-room-message--${message.role.toLowerCase()}`} key={message.id}>
                    <header><strong>{message.role === "USER" ? "You" : activeProfile?.displayName ?? "Writers' Room"}</strong><time>{new Date(message.createdAt).toLocaleTimeString()}</time></header>
                    <p>{message.content}</p>
                    <FocusedQuestions questions={message.questions} />
                    {message.contextSummary ? <ContextSummary summary={message.contextSummary} /> : null}
                    <SourceCards sources={message.sourceTrace} onOpenSource={onOpenSource} />
                    {record ? <small className="writers-room-run-metadata">{providerLabel(record.provider)} · {record.modelId} · {record.latencyMs ?? "?"} ms · {record.inputTokens ?? "?"}/{record.outputTokens ?? "?"}/{record.totalTokens ?? "?"} tokens</small> : null}
                  </article>
                );
              })}
              {selectedSession.proposals.length > 0 ? (
                <section className="writers-room-proposals" aria-label="Writers' Room proposals">
                  <div><span className="section-label">Review queue</span><h3>Proposals</h3></div>
                  {selectedSession.proposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      busy={busyProposalId === proposal.id}
                      onReview={(draft) => void reviewProposal(proposal, "ACCEPTED", draft)}
                      onSaveEdit={(draft) => void saveProposalEdit(proposal, draft)}
                      onDiscard={() => void reviewProposal(proposal, "DISCARDED")}
                      onApply={() => void applyProposal(proposal)}
                      onOpenSource={onOpenSource}
                    />
                  ))}
                </section>
              ) : null}
              {running ? <p className="writers-room-running" role="status">Writers' Room is preparing a bounded response…</p> : null}
            </div>

            {error && !preflightMode ? (
              <div className="writers-room-error" role="alert">
                <strong>{error.code ?? "WRITERS_ROOM_FAILED"}</strong> {error.message}
                {runRecoveryAvailable ? <button type="button" onClick={() => { setError(null); setRunRecoveryAvailable(false); void loadSessions(); }}>Reload saved session</button> : null}
              </div>
            ) : null}
            <footer className="writers-room-composer">
              <label>
                Continue the conversation
                <textarea value={composer} disabled={selectedSession.status !== "ACTIVE" || running || !profileAvailable} maxLength={16000} onChange={(event) => setComposer(event.target.value)} placeholder={selectedSession.status === "ARCHIVED" ? "Archived sessions are read-only." : !profileAvailable ? "This session's profile is unavailable." : "Explore an idea, test continuity, or ask for a proposal…"} />
              </label>
              <div>
                <span>AI output is proposal-only.</span>
                {hasAssistant ? <button type="button" disabled={running || selectedSession.status !== "ACTIVE" || !profileAvailable} onClick={() => void openPreflight("REGENERATE")}>Regenerate</button> : null}
                <button className="primary-button" type="button" disabled={!composer.trim() || running || selectedSession.status !== "ACTIVE" || !profileAvailable} onClick={() => void openPreflight("SEND")}>Send</button>
              </div>
            </footer>
          </>
        ) : (
          <section className="writers-room-no-session">
            <span className="section-label">Writers' Room</span>
            <h2>Build narrative with your Project Brain in view.</h2>
            <p>Start from the Sessions area, choose a focused profile, and keep every generated idea separate from established project truth.</p>
            <ul>
              <li>Lore Architect develops factions, places, history, and conflicts.</li>
              <li>Character &amp; Dialogue explores voice, relationships, and conversations.</li>
              <li>Continuity Editor checks ideas against established and unresolved lore.</li>
            </ul>
          </section>
        )}
      </section>

      {drawerOpen && selectedSession ? (
        <aside className="writers-room-context-drawer" aria-label="Context and sources">
          <header><div><span className="section-label">Bounded context</span><h3>Context / Sources</h3></div><button type="button" onClick={() => setDrawerOpen(false)}>Close</button></header>
          <section>
            <strong>Selected Markdown</strong>
            {selectedSession.selectedMarkdownPaths.length ? <ul>{selectedSession.selectedMarkdownPaths.map((path) => <li key={path}><span>{path}</span><button type="button" disabled={selectedSession.status !== "ACTIVE"} onClick={() => void removeMarkdown(path)}>Remove</button></li>)}</ul> : <p>No Markdown selected. Files must stay inside this project and are DOCUMENTED context, not Canon.</p>}
          </section>
          <SourceCards sources={selectedSession.sourceTrace} onOpenSource={onOpenSource} />
          <p className="scope-note">Context plans are bounded and deterministic. Git Reality, Unity GroundTruth, and Feature Contracts are excluded by default.</p>
        </aside>
      ) : null}

      {createOpen ? (
        <div className="writers-room-dialog-backdrop">
          <section className="writers-room-create-dialog" role="dialog" aria-modal="true" aria-labelledby="new-writers-room-session-title">
            <header><div><span className="section-label">New non-authoritative session</span><h2 id="new-writers-room-session-title">Start a Writers' Room session</h2></div><button type="button" disabled={creating} onClick={() => { setCreateOpen(false); setCreateError(null); }}>Cancel</button></header>
            <label>Session title<input value={newTitle} maxLength={160} autoFocus onChange={(event) => setNewTitle(event.target.value)} /></label>
            <label>Profile<select value={newProfileId} onChange={(event) => setNewProfileId(event.target.value)}>{runnableProfiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}</select></label>
            <p>{runnableProfiles.find((profile) => profile.id === newProfileId)?.taskPurpose}</p>
            {createError ? <p className="writers-room-error" role="alert">{createError.message ?? "The session could not be created. Your title and profile are unchanged."}</p> : null}
            <button className="primary-button" type="button" disabled={!newTitle.trim() || creating || !runnableProfiles.some((profile) => profile.id === newProfileId)} onClick={() => void createSession()}>{creating ? "Creating…" : "Create Session"}</button>
          </section>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="writers-room-dialog-backdrop">
          <section className="writers-room-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-writers-room-session-title">
            <header>
              <div><span className="section-label">Permanent history action</span><h2 id="delete-writers-room-session-title">Delete session?</h2></div>
            </header>
            <p><strong>“{deleteCandidate.title}”</strong> and its conversation history will be permanently removed from this project.</p>
            <p>This does not delete Project Brain knowledge or Decisions previously created through explicit Apply actions.</p>
            {deleteError ? <p className="writers-room-error" role="alert">{deleteError.message ?? "The session could not be deleted."}</p> : null}
            <footer>
              <button type="button" autoFocus disabled={deleting} onClick={() => { setDeleteCandidate(null); setDeleteError(null); }}>Cancel</button>
              <button className="danger-button" type="button" disabled={deleting} onClick={() => void deleteSession()}>{deleting ? "Deleting…" : "Delete Session"}</button>
            </footer>
          </section>
        </div>
      ) : null}

      {preflightMode ? (
        <PreflightDialog
          preflight={preflight}
          loading={loadingPreflight}
          error={error}
          selectedModelId={selectedModelId}
          onModelChange={(modelId) => void changeModel(modelId)}
          onCancel={() => { setPreflightMode(null); setPreflightMessage(undefined); setError(null); }}
          onRun={() => void confirmRun()}
        />
      ) : null}
    </section>
  );
}
