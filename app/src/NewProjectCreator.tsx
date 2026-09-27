import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandLockup, LineIcon } from "./designSystem";
import {
  suggestNewProjectCoreLoops,
  suggestNewProjectDesignPillars,
  loadCreatorAiPreflight,
  type CoreLoopProposal,
  type CoreLoopProposalResult,
  type CreatorAiContext,
  type CreatorAiError,
  type CreatorAiMetadata,
  type CreatorAiPreflight,
  type CreatorAiTask,
  type PillarProposal,
  type PillarProposalResult,
} from "./platform/creatorAi";
import type {
  FoundationPillar,
  ProjectFoundationInput,
} from "./platform/workspaceDirectory";

const steps = [
  { label: "Identity", eyebrow: "Shape the starting point" },
  { label: "Pitch", eyebrow: "Describe the idea naturally" },
  { label: "Experience", eyebrow: "Define the player experience" },
  { label: "Core Loop", eyebrow: "Find the repeated activity" },
  { label: "World", eyebrow: "Set the world and tone" },
  { label: "Pillars", eyebrow: "Choose what guides decisions" },
  { label: "Constraints", eyebrow: "Keep the idea grounded" },
  { label: "Review", eyebrow: "Your Game Foundation" },
] as const;

type FoundationKey = Exclude<keyof ProjectFoundationInput, "pillars" | "openQuestions">;

export const emptyProjectFoundation: ProjectFoundationInput = {
  workingTitle: "",
  genre: "",
  mode: "",
  perspective: "",
  targetPlatform: "",
  pitch: "",
  playerExperience: "",
  coreLoop: "",
  coreLoopOrigin: "USER_AUTHORED",
  setting: "",
  tone: "",
  inspirations: "",
  antiInspirations: "",
  pillars: [],
  engine: "",
  teamSize: "",
  expectedScope: "",
  majorConstraints: "",
  openQuestions: [],
};

export function creatorAiContextFromDraft(draft: ProjectFoundationInput): CreatorAiContext {
  return {
    workingTitle: draft.workingTitle,
    genre: draft.genre,
    mode: draft.mode,
    perspective: draft.perspective,
    targetPlatform: draft.targetPlatform,
    pitch: draft.pitch,
    playerExperience: draft.playerExperience,
    currentCoreLoop: draft.coreLoop,
    setting: draft.setting,
    tone: draft.tone,
    engine: draft.engine,
    teamSize: draft.teamSize,
    expectedScope: draft.expectedScope,
    majorConstraints: draft.majorConstraints,
  };
}

function aiErrorFrom(error: unknown): CreatorAiError {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error
    && typeof error.code === "string" && typeof error.message === "string") {
    return { code: error.code, message: error.message };
  }
  return { code: "CREATOR_AI_FAILED", message: "ForgeMind could not complete this AI suggestion request." };
}

function displayProvider(provider: string): string {
  return provider === "nebius_token_factory" ? "Nebius Token Factory" : provider;
}

function metric(value: number | undefined, suffix = ""): string {
  return value === undefined ? "Not provided" : `${value}${suffix}`;
}

function AiMetadata({ metadata }: { metadata: CreatorAiMetadata }) {
  return (
    <dl className="creator-ai-metadata" aria-label="Creator AI usage">
      <div><dt>Provider</dt><dd>{displayProvider(metadata.provider)}</dd></div>
      <div><dt>Model</dt><dd title={metadata.model}>{metadata.model}</dd></div>
      <div><dt>Latency</dt><dd>{metric(metadata.latencyMs, " ms")}</dd></div>
      <div><dt>Input</dt><dd>{metric(metadata.inputTokens)}</dd></div>
      <div><dt>Output</dt><dd>{metric(metadata.outputTokens)}</dd></div>
      <div><dt>Total</dt><dd>{metric(metadata.totalTokens)}</dd></div>
    </dl>
  );
}

function AiErrorNotice({ error }: { error: CreatorAiError }) {
  const missingCredential = error.code === "MISSING_API_KEY";
  const invalidOutput = error.code === "INVALID_CREATOR_AI_OUTPUT";
  return (
    <section className="creator-ai-error" role="alert">
      <strong>{missingCredential ? "AI setup required" : "AI suggestions unavailable"}</strong>
      <p>{missingCredential
        ? "Nebius Token Factory API key was not detected."
        : invalidOutput
          ? "ForgeMind couldn't validate this AI response. Your draft was not changed. You can try again or continue manually."
          : error.message}</p>
      {missingCredential ? <small>Set NEBIUS_API_KEY before launching ForgeMind, then try again. Your Creator draft is unchanged.</small> : <small>{error.code} · Continue manually or try again explicitly.</small>}
    </section>
  );
}

function ProposalAssumptions({ assumptions }: { assumptions?: string[] }) {
  if (!assumptions?.length) return null;
  return (
    <div className="creator-ai-assumptions">
      <strong>Assumptions</strong>
      <ul>{assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
    </div>
  );
}

function formatLatency(preflight: CreatorAiPreflight): string {
  if (!preflight.historyAvailable) return "Local history unavailable";
  const history = preflight.historicalLatency;
  if (!history) return "Not enough local history";
  if (history.observationCount === 1) return `Last observed: ~${(history.lastMs / 1_000).toFixed(1)} s`;
  return `Recent: ~${(history.minimumMs / 1_000).toFixed(1)}–${(history.maximumMs / 1_000).toFixed(1)} s`;
}

function AiPreflightDialog({
  preflight,
  selectedModelId,
  loading,
  error,
  onModelChange,
  onCancel,
  onRun,
}: {
  preflight: CreatorAiPreflight | null;
  selectedModelId: string;
  loading: boolean;
  error: CreatorAiError | null;
  onModelChange: (modelId: string) => void;
  onCancel: () => void;
  onRun: () => void;
}) {
  const selectedModel = preflight?.models.find((model) => model.modelId === selectedModelId);
  return (
    <div className="creator-ai-dialog-backdrop">
      <section className="creator-ai-preflight" role="dialog" aria-modal="true" aria-labelledby="creator-ai-preflight-title">
        <header>
          <div>
            <p className="eyebrow">Confirm AI request</p>
            <h2 id="creator-ai-preflight-title">{preflight?.taskLabel ?? "Preparing AI request"}</h2>
            <p>Review the model, estimated request size, and bounded Creator context before spending provider credits.</p>
          </div>
          <button className="text-button" type="button" onClick={onCancel}>Close</button>
        </header>
        {error ? <AiErrorNotice error={error} /> : null}
        {preflight ? (
          <div className="creator-ai-preflight-body" aria-busy={loading}>
            <dl className="creator-ai-preflight-summary">
              <div><dt>Task</dt><dd>{preflight.taskLabel}</dd></div>
              <div><dt>Provider</dt><dd>{displayProvider(preflight.provider)}</dd></div>
              <div>
                <dt>Estimated usage</dt>
                <dd><span className={`creator-usage-band creator-usage-band--${preflight.usageBand}`}>{preflight.usageBand.toUpperCase()}</span></dd>
              </div>
              <div><dt>Estimated input</dt><dd>~{preflight.estimatedInputTokens.minimum}–{preflight.estimatedInputTokens.maximum} tokens</dd></div>
              <div><dt>Local history</dt><dd>{formatLatency(preflight)}</dd></div>
              <div><dt>Provider cost</dt><dd>{preflight.estimatedCostUsd ? `~$${preflight.estimatedCostUsd.minimumUsd.toFixed(4)}–$${preflight.estimatedCostUsd.maximumUsd.toFixed(4)}` : "Exact estimate unavailable"}</dd></div>
            </dl>
            <label className="creator-ai-model-select">
              <span>Model</span>
              <select aria-label="Model" value={selectedModelId} disabled={loading} onChange={(event) => onModelChange(event.target.value)}>
                {preflight.models.map((model) => <option value={model.modelId} key={model.modelId}>{model.displayName}{model.modelId === preflight.defaultModelId ? " — Creator default" : ""}</option>)}
              </select>
              {selectedModel ? <small><strong>{selectedModel.displayName}</strong> · {selectedModel.modelId}<br />{selectedModel.modelId === preflight.defaultModelId ? "Current default for structured Creator suggestions." : "Alternative model available through Token Factory."}</small> : null}
            </label>
            <section className="creator-ai-context-summary" aria-label="Creator context included">
              <strong>Context sent</strong>
              <p>Uses {preflight.contextFields.length ? preflight.contextFields.join(", ") : "the current bounded Creator draft"}. This is a human-readable summary, not a raw prompt dump. Credentials, workspace paths, and unrelated project data are excluded.</p>
            </section>
            <p className="creator-ai-cost-note">The usage band reflects approximate input size, not an exact monetary price. Provider/model billing and generated output can vary.</p>
          </div>
        ) : loading ? <p className="creator-ai-running" role="status"><span className="specialist-spinner specialist-spinner-small" aria-hidden="true" />Preparing local request details…</p> : null}
        <footer>
          <button className="outline-button" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-button" type="button" disabled={!preflight || loading || Boolean(error)} onClick={onRun}>Run AI</button>
        </footer>
      </section>
    </div>
  );
}

type CreatorAiHistoryOutcome = "proposal" | "applied" | "partially applied" | "discarded" | "regenerated";

interface CreatorAiHistoryEntry {
  id: string;
  task: CreatorAiTask;
  timestamp: string;
  provider: string;
  model: string;
  resultStatus: "PASS" | "FAILED";
  outcome: CreatorAiHistoryOutcome;
  coreLoop?: CoreLoopProposalResult;
  pillars?: PillarProposalResult;
  errorCode?: string;
}

function AiHistoryDrawer({
  history,
  selectedId,
  onSelect,
  onRestore,
  onClose,
}: {
  history: CreatorAiHistoryEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRestore: (entry: CreatorAiHistoryEntry) => void;
  onClose: () => void;
}) {
  const selected = history.find((entry) => entry.id === selectedId) ?? history[0];
  const proposals = selected?.coreLoop?.proposals ?? selected?.pillars?.proposals ?? [];
  return (
    <div className="creator-ai-history-backdrop">
      <aside className="creator-ai-history" role="dialog" aria-modal="true" aria-labelledby="creator-ai-history-title">
        <header>
          <div><p className="eyebrow">Session only · non-authoritative</p><h2 id="creator-ai-history-title">Creator AI History</h2></div>
          <button className="text-button" type="button" onClick={onClose}>Close</button>
        </header>
        <p className="creator-ai-history-note">Recent proposals remain available during this Creator session. History is not saved as project truth.</p>
        {history.length ? (
          <div className="creator-ai-history-layout">
            <ol>
              {history.map((entry) => (
                <li key={entry.id}>
                  <button type="button" className={entry.id === selected?.id ? "creator-ai-history-entry creator-ai-history-entry--active" : "creator-ai-history-entry"} onClick={() => onSelect(entry.id)}>
                    <strong>{entry.task === "coreLoop" ? "Core Loop" : "Design Pillars"}</strong>
                    <span>{entry.resultStatus} · {entry.outcome}</span>
                    <small>{new Date(entry.timestamp).toLocaleTimeString()} · {entry.model}</small>
                    <small className="creator-ai-history-view">View proposal</small>
                  </button>
                </li>
              ))}
            </ol>
            {selected ? (
              <section className="creator-ai-history-detail" aria-label="Historical proposal">
                <div><strong>{selected.task === "coreLoop" ? "Core Loop proposals" : "Design Pillar proposals"}</strong><span>{displayProvider(selected.provider)} · {selected.model}</span></div>
                {selected.resultStatus === "FAILED" ? <p>This request failed safely ({selected.errorCode}). No proposal payload was stored.</p> : proposals.map((proposal: CoreLoopProposal | PillarProposal, index) => <article key={`${proposal.title}-${index}`}><h3>{proposal.title}</h3><p>{proposal.description}</p><ProposalAssumptions assumptions={proposal.assumptions} /></article>)}
                {selected.resultStatus === "PASS" ? <button className="outline-button" type="button" onClick={() => onRestore(selected)}>Restore as current proposal</button> : null}
              </section>
            ) : null}
          </div>
        ) : <p>No Creator AI runs in this session.</p>}
      </aside>
    </div>
  );
}

export function deriveOpenQuestions(draft: ProjectFoundationInput): string[] {
  const questions: string[] = [];
  if (!draft.targetPlatform.trim()) questions.push("Which platform should the game target first?");
  if (!draft.playerExperience.trim()) questions.push("What should the player feel or become during play?");
  if (!draft.coreLoop.trim()) questions.push("What will players do again and again?");
  if (!draft.pillars.some((pillar) => pillar.title.trim())) questions.push("Which design pillars should guide the project?");
  if (!draft.setting.trim() && !draft.tone.trim()) questions.push("What world and tone should shape the experience?");
  if (!draft.engine.trim()) questions.push("Which engine will the project use?");
  if (!draft.majorConstraints.trim()) questions.push("What major practical constraints still need to be defined?");
  return questions;
}

export function hasSubstantialCreatorDraft(draft: ProjectFoundationInput): boolean {
  return Object.entries(draft).some(([key, value]) => {
    if (key === "openQuestions") return false;
    if (Array.isArray(value)) return value.some((item) => typeof item === "object" && item !== null && "title" in item && typeof item.title === "string" && item.title.trim().length > 0);
    return typeof value === "string" && value.trim().length > 0;
  });
}

function Field({
  label,
  value,
  onChange,
  optional = false,
  multiline = false,
  help,
  maxLength = 2_000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  multiline?: boolean;
  help?: string;
  maxLength?: number;
}) {
  const id = `creator-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label className="creator-field" htmlFor={id}>
      <span>{label}{optional ? <small>Optional</small> : null}</span>
      {multiline ? (
        <textarea id={id} aria-label={label} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input id={id} aria-label={label} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
      )}
      {help ? <small>{help}</small> : null}
    </label>
  );
}

function ReviewValue({ children }: { children: string }) {
  return children.trim() ? <p>{children}</p> : <p className="creator-empty-value">Not defined yet.</p>;
}

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <article className="creator-review-section">
      <div className="creator-review-heading">
        <h3>{title}</h3>
        <button className="text-button" type="button" onClick={() => onEdit(step)}>Edit {title}</button>
      </div>
      {children}
    </article>
  );
}

export function NewProjectCreator({
  draft,
  onChange,
  onChooseDirectory,
  selectedDirectory,
  onInitialize,
  isInitializing,
  creationError,
  onClearDirectory,
  onCancel,
}: {
  draft: ProjectFoundationInput;
  onChange: (draft: ProjectFoundationInput) => void;
  onChooseDirectory: (foundation: ProjectFoundationInput) => Promise<void>;
  selectedDirectory: string | null;
  onInitialize: (foundation: ProjectFoundationInput) => Promise<void>;
  isInitializing: boolean;
  creationError: string | null;
  onClearDirectory: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [activeAiTask, setActiveAiTask] = useState<"coreLoop" | "pillars" | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [coreLoopProposal, setCoreLoopProposal] = useState<CoreLoopProposalResult | null>(null);
  const [pillarProposal, setPillarProposal] = useState<PillarProposalResult | null>(null);
  const [aiError, setAiError] = useState<CreatorAiError | null>(null);
  const [pendingCoreLoop, setPendingCoreLoop] = useState<CoreLoopProposal | null>(null);
  const [pendingCoreLoopIndex, setPendingCoreLoopIndex] = useState<number | null>(null);
  const [appliedCoreLoopIndex, setAppliedCoreLoopIndex] = useState<number | null>(null);
  const [acceptedPillarIndexes, setAcceptedPillarIndexes] = useState<number[]>([]);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [preflightTask, setPreflightTask] = useState<CreatorAiTask | null>(null);
  const [preflight, setPreflight] = useState<CreatorAiPreflight | null>(null);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightError, setPreflightError] = useState<CreatorAiError | null>(null);
  const [aiHistory, setAiHistory] = useState<CreatorAiHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [currentCoreLoopHistoryId, setCurrentCoreLoopHistoryId] = useState<string | null>(null);
  const [currentPillarHistoryId, setCurrentPillarHistoryId] = useState<string | null>(null);
  const historySequence = useRef(0);
  const requestLock = useRef(false);
  const current = steps[step];
  const openQuestions = deriveOpenQuestions(draft);
  const reviewedPillars = draft.pillars.filter((pillar) => pillar.title.trim());
  const foundation = { ...draft, pillars: reviewedPillars, openQuestions };
  const firstOpenQuestionStep = !draft.targetPlatform.trim()
    ? 0
    : !draft.playerExperience.trim()
      ? 2
      : !draft.coreLoop.trim()
        ? 3
        : reviewedPillars.length === 0
          ? 5
          : !draft.setting.trim() && !draft.tone.trim()
            ? 4
            : 6;

  useEffect(() => {
    if (!activeAiTask) {
      setElapsedSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000)), 1_000);
    return () => window.clearInterval(timer);
  }, [activeAiTask]);

  function update(key: FoundationKey, value: string) {
    onChange({ ...draft, [key]: value });
    setValidationError(null);
    setConfirmDiscard(false);
  }

  function updatePillar(index: number, patch: Partial<FoundationPillar>) {
    onChange({
      ...draft,
      pillars: draft.pillars.map((pillar, pillarIndex) => pillarIndex === index ? { ...pillar, ...patch } : pillar),
    });
  }

  function updateCoreLoop(value: string) {
    onChange({
      ...draft,
      coreLoop: value,
      coreLoopOrigin: draft.coreLoopOrigin === "AI_ACCEPTED" ? "AI_ACCEPTED" : "USER_AUTHORED",
    });
    setValidationError(null);
    setConfirmDiscard(false);
  }

  function updateHistoryOutcome(id: string | null, outcome: CreatorAiHistoryOutcome) {
    if (!id) return;
    setAiHistory((currentHistory) => currentHistory.map((entry) => entry.id === id ? { ...entry, outcome } : entry));
  }

  function addHistoryEntry(entry: Omit<CreatorAiHistoryEntry, "id" | "timestamp">): string {
    historySequence.current += 1;
    const id = `creator-ai-${historySequence.current}`;
    const historyEntry = { ...entry, id, timestamp: new Date().toISOString() };
    setAiHistory((currentHistory) => [historyEntry, ...currentHistory].slice(0, 10));
    setSelectedHistoryId(id);
    return id;
  }

  async function openPreflight(task: CreatorAiTask) {
    if (activeAiTask || requestLock.current) return;
    setPreflightTask(task);
    setPreflight(null);
    setSelectedModelId("");
    setPreflightError(null);
    setPreflightLoading(true);
    try {
      const prepared = await loadCreatorAiPreflight(task, creatorAiContextFromDraft(draft));
      setPreflight(prepared);
      setSelectedModelId(prepared.modelId);
    } catch (error) {
      setPreflightError(aiErrorFrom(error));
    } finally {
      setPreflightLoading(false);
    }
  }

  async function changePreflightModel(modelId: string) {
    if (!preflightTask) return;
    setSelectedModelId(modelId);
    setPreflightError(null);
    setPreflightLoading(true);
    try {
      setPreflight(await loadCreatorAiPreflight(preflightTask, creatorAiContextFromDraft(draft), modelId));
    } catch (error) {
      setPreflightError(aiErrorFrom(error));
    } finally {
      setPreflightLoading(false);
    }
  }

  function closePreflight() {
    if (requestLock.current) return;
    setPreflightTask(null);
    setPreflight(null);
    setPreflightError(null);
  }

  async function runCoreLoopAi(modelId: string, provider: string) {
    if (activeAiTask || requestLock.current) return;
    requestLock.current = true;
    setActiveAiTask("coreLoop");
    setAiError(null);
    setAiNotice(null);
    setPendingCoreLoop(null);
    try {
      const proposal = await suggestNewProjectCoreLoops(creatorAiContextFromDraft(draft), modelId);
      updateHistoryOutcome(currentCoreLoopHistoryId, "regenerated");
      const historyId = addHistoryEntry({ task: "coreLoop", provider: proposal.provider, model: proposal.model, resultStatus: "PASS", outcome: "proposal", coreLoop: proposal });
      setCoreLoopProposal(proposal);
      setCurrentCoreLoopHistoryId(historyId);
      setAppliedCoreLoopIndex(null);
    } catch (error) {
      const safeError = aiErrorFrom(error);
      setAiError(safeError);
      addHistoryEntry({ task: "coreLoop", provider, model: modelId, resultStatus: "FAILED", outcome: "proposal", errorCode: safeError.code });
    } finally {
      requestLock.current = false;
      setActiveAiTask(null);
    }
  }

  function confirmAiRun() {
    if (!preflight || !preflightTask || preflightLoading || requestLock.current) return;
    const task = preflightTask;
    const modelId = selectedModelId;
    const provider = preflight.provider;
    setPreflightTask(null);
    setPreflight(null);
    if (task === "coreLoop") void runCoreLoopAi(modelId, provider);
    else void runPillarsAi(modelId, provider);
  }

  function applyCoreLoop(proposal: CoreLoopProposal, index: number) {
    if (draft.coreLoop.trim() && draft.coreLoop.trim() !== proposal.description.trim()) {
      setPendingCoreLoop(proposal);
      setPendingCoreLoopIndex(index);
      return;
    }
    onChange({ ...draft, coreLoop: proposal.description, coreLoopOrigin: "AI_ACCEPTED" });
    setAppliedCoreLoopIndex(index);
    updateHistoryOutcome(currentCoreLoopHistoryId, "applied");
    setAiNotice("AI-assisted Core Loop copied into your editable Creator draft.");
  }

  function confirmCoreLoopReplacement() {
    if (!pendingCoreLoop) return;
    onChange({ ...draft, coreLoop: pendingCoreLoop.description, coreLoopOrigin: "AI_ACCEPTED" });
    setAppliedCoreLoopIndex(pendingCoreLoopIndex);
    setPendingCoreLoop(null);
    setPendingCoreLoopIndex(null);
    updateHistoryOutcome(currentCoreLoopHistoryId, "applied");
    setAiNotice("The previous Core Loop was explicitly replaced. The new text remains editable.");
  }

  async function runPillarsAi(modelId: string, provider: string) {
    if (activeAiTask || requestLock.current) return;
    requestLock.current = true;
    setActiveAiTask("pillars");
    setAiError(null);
    setAiNotice(null);
    try {
      const proposal = await suggestNewProjectDesignPillars(creatorAiContextFromDraft(draft), modelId);
      updateHistoryOutcome(currentPillarHistoryId, "regenerated");
      const historyId = addHistoryEntry({ task: "designPillars", provider: proposal.provider, model: proposal.model, resultStatus: "PASS", outcome: "proposal", pillars: proposal });
      setPillarProposal(proposal);
      setCurrentPillarHistoryId(historyId);
      setAcceptedPillarIndexes([]);
    } catch (error) {
      const safeError = aiErrorFrom(error);
      setAiError(safeError);
      addHistoryEntry({ task: "designPillars", provider, model: modelId, resultStatus: "FAILED", outcome: "proposal", errorCode: safeError.code });
    } finally {
      requestLock.current = false;
      setActiveAiTask(null);
    }
  }

  function normalizedPillarTitle(title: string): string {
    return title.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function acceptPillar(index: number) {
    const proposal = pillarProposal?.proposals[index];
    if (!proposal) return;
    const duplicate = draft.pillars.some((pillar) => normalizedPillarTitle(pillar.title) === normalizedPillarTitle(proposal.title));
    if (duplicate) {
      setAiNotice(`“${proposal.title}” already exists in the draft and was not duplicated.`);
      setAcceptedPillarIndexes((current) => current.includes(index) ? current : [...current, index]);
      return;
    }
    if (draft.pillars.length >= 6) {
      setAiNotice("The draft already has six pillars. Remove one before accepting another proposal.");
      return;
    }
    onChange({ ...draft, pillars: [...draft.pillars, { title: proposal.title, explanation: proposal.description, origin: "AI_ACCEPTED" }] });
    setAcceptedPillarIndexes((current) => current.includes(index) ? current : [...current, index]);
    updateHistoryOutcome(currentPillarHistoryId, "partially applied");
    setAiNotice(`“${proposal.title}” added to the editable Creator draft.`);
  }

  function applyAllPillars() {
    if (!pillarProposal) return;
    const next = [...draft.pillars];
    const existing = new Set(next.map((pillar) => normalizedPillarTitle(pillar.title)));
    const handled: number[] = [];
    let added = 0;
    pillarProposal.proposals.forEach((proposal, index) => {
      const key = normalizedPillarTitle(proposal.title);
      if (existing.has(key)) {
        handled.push(index);
        return;
      }
      if (next.length >= 6) return;
      next.push({ title: proposal.title, explanation: proposal.description, origin: "AI_ACCEPTED" });
      existing.add(key);
      handled.push(index);
      added += 1;
    });
    onChange({ ...draft, pillars: next });
    setAcceptedPillarIndexes((current) => Array.from(new Set([...current, ...handled])));
    updateHistoryOutcome(currentPillarHistoryId, "applied");
    setAiNotice(added > 0 ? `${added} AI-assisted ${added === 1 ? "pillar" : "pillars"} added. Existing pillars were preserved.` : "No new pillars were added; duplicates and the six-pillar limit were preserved.");
  }

  function discardCoreLoopProposals() {
    updateHistoryOutcome(currentCoreLoopHistoryId, "discarded");
    setCoreLoopProposal(null);
    setCurrentCoreLoopHistoryId(null);
    setPendingCoreLoop(null);
    setPendingCoreLoopIndex(null);
    setAppliedCoreLoopIndex(null);
    setAiNotice(null);
  }

  function discardPillarProposals() {
    updateHistoryOutcome(currentPillarHistoryId, "discarded");
    setPillarProposal(null);
    setCurrentPillarHistoryId(null);
    setAcceptedPillarIndexes([]);
    setAiNotice(null);
  }

  function restoreHistoryEntry(entry: CreatorAiHistoryEntry) {
    if (entry.coreLoop) {
      setCoreLoopProposal(entry.coreLoop);
      setCurrentCoreLoopHistoryId(entry.id);
      setAppliedCoreLoopIndex(null);
      setPendingCoreLoop(null);
      setPendingCoreLoopIndex(null);
    } else if (entry.pillars) {
      setPillarProposal(entry.pillars);
      setCurrentPillarHistoryId(entry.id);
      setAcceptedPillarIndexes([]);
    }
    setAiNotice("Historical proposals restored for review. No Creator draft content was applied.");
    setHistoryOpen(false);
  }

  function goNext() {
    if (step === 0 && !draft.workingTitle.trim()) {
      setValidationError("Add a working title before continuing.");
      return;
    }
    if (step === 1 && draft.pitch.trim().length < 10) {
      setValidationError("Describe the game in at least a short sentence.");
      return;
    }
    setValidationError(null);
    setAiError(null);
    setAiNotice(null);
    if (returnToReview && step < 7) {
      setStep(7);
      setReturnToReview(false);
    } else {
      setStep((currentStep) => Math.min(7, currentStep + 1));
    }
  }

  function editFromReview(target: number) {
    onClearDirectory();
    setReturnToReview(true);
    setAiError(null);
    setAiNotice(null);
    setStep(target);
  }

  function requestCancel() {
    if (!hasSubstantialCreatorDraft(draft)) {
      onCancel();
      return;
    }
    setConfirmDiscard(true);
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <>
            <div className="creator-question">
              <h1>Give your game a starting identity.</h1>
              <p>A working title and a few plain-language cues are enough. Nothing here needs to be final.</p>
            </div>
            <div className="creator-fields creator-fields--two-column">
              <Field label="Working title" value={draft.workingTitle} maxLength={120} onChange={(value) => update("workingTitle", value)} />
              <Field label="Genre / subgenre" value={draft.genre} optional maxLength={120} onChange={(value) => update("genre", value)} help="For example: tactical RPG, cozy builder, action roguelite." />
              <Field label="Mode" value={draft.mode} optional maxLength={120} onChange={(value) => update("mode", value)} help="Single-player, co-op, multiplayer, or your own description." />
              <Field label="Perspective" value={draft.perspective} optional maxLength={120} onChange={(value) => update("perspective", value)} help="First-person, top-down, side-on, or something less conventional." />
              <Field label="Target platform" value={draft.targetPlatform} optional maxLength={120} onChange={(value) => update("targetPlatform", value)} help="For example: PC, console, or mobile." />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <div className="creator-question">
              <h1>What is your game about?</h1>
              <p>Write it naturally. This can be a rough idea, not a polished elevator pitch.</p>
            </div>
            <div className="creator-fields">
              <Field label="Game pitch" value={draft.pitch} multiline onChange={(value) => update("pitch", value)} />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="creator-question">
              <h1>What should the player feel like they are doing or becoming?</h1>
              <p>Think about their role, the emotions you want to create, and what makes the experience satisfying.</p>
            </div>
            <div className="creator-fields">
              <Field label="Player experience" value={draft.playerExperience} multiline optional onChange={(value) => update("playerExperience", value)} />
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className="creator-question">
              <h1>What will players do again and again?</h1>
              <p>Describe the repeated activity in normal play. It can still be uncertain.</p>
            </div>
            <div className="creator-fields">
              <Field label="Core loop" value={draft.coreLoop} multiline optional onChange={updateCoreLoop} />
              {draft.coreLoopOrigin === "AI_ACCEPTED" && draft.coreLoop.trim() ? <span className="creator-ai-assisted-badge">AI-assisted · accepted into draft · editable</span> : null}
            </div>
            <section className="creator-ai-panel" aria-labelledby="core-loop-ai-title">
              <div className="creator-ai-heading">
                <div>
                  <p className="eyebrow">Optional AI assistance</p>
                  <h2 id="core-loop-ai-title">Explore alternative Core Loops</h2>
                  <p>Uses only the relevant fields in this Creator draft. Suggestions stay separate until you apply one.</p>
                </div>
                <div className="creator-ai-heading-actions">
                  {aiHistory.length ? <button className="text-button" type="button" onClick={() => setHistoryOpen(true)}>AI History</button> : null}
                  <button className="outline-button" type="button" disabled={activeAiTask !== null} onClick={() => void openPreflight("coreLoop")}>
                    {coreLoopProposal ? "Regenerate" : "Suggest Core Loops"}
                  </button>
                </div>
              </div>
              {activeAiTask === "coreLoop" ? <p className="creator-ai-running" role="status"><span className="specialist-spinner specialist-spinner-small" aria-hidden="true" />Nebius Token Factory · {selectedModelId} · Requesting proposals… {elapsedSeconds}s</p> : null}
              {step === 3 && aiError ? <AiErrorNotice error={aiError} /> : null}
              {coreLoopProposal ? (
                <div className="creator-ai-results">
                  <div className="creator-ai-proposal-intro"><strong>AI-generated proposals</strong><span>Based on your current Creator draft · Review before applying</span></div>
                  {coreLoopProposal.note ? <p className="creator-ai-note">{coreLoopProposal.note}</p> : null}
                  <div className="creator-ai-proposal-grid">
                    {coreLoopProposal.proposals.map((proposal, index) => (
                      <article className="creator-ai-proposal" key={`${proposal.title}-${index}`}>
                        <div><h3>{proposal.title}</h3><p>{proposal.description}</p>{proposal.rationale ? <small>{proposal.rationale}</small> : null}<ProposalAssumptions assumptions={proposal.assumptions} /></div>
                        <button className="outline-button" type="button" onClick={() => applyCoreLoop(proposal, index)}>{appliedCoreLoopIndex === index && draft.coreLoopOrigin === "AI_ACCEPTED" ? "Applied" : "Use this"}</button>
                      </article>
                    ))}
                  </div>
                  {pendingCoreLoop ? (
                    <div className="creator-ai-confirmation" role="alertdialog" aria-labelledby="replace-core-loop-title">
                      <div><strong id="replace-core-loop-title">Replace the current Core Loop?</strong><p>Your existing text will change only if you confirm. Other Creator content is untouched.</p></div>
                      <button className="danger-button" type="button" onClick={confirmCoreLoopReplacement}>Replace with proposal</button>
                      <button className="outline-button" type="button" onClick={() => { setPendingCoreLoop(null); setPendingCoreLoopIndex(null); }}>Keep current text</button>
                    </div>
                  ) : null}
                  <div className="creator-ai-result-footer">
                    <AiMetadata metadata={coreLoopProposal} />
                    <button className="text-button" type="button" onClick={discardCoreLoopProposals}>Discard proposals</button>
                  </div>
                </div>
              ) : null}
              {step === 3 && aiNotice ? <p className="creator-ai-notice" role="status">{aiNotice}</p> : null}
            </section>
          </>
        );
      case 4:
        return (
          <>
            <div className="creator-question">
              <h1>Where does the game live, and how should it feel?</h1>
              <p>References are context only. They do not grant permission to copy another game or its content.</p>
            </div>
            <div className="creator-fields creator-fields--two-column">
              <Field label="Setting / world" value={draft.setting} multiline optional maxLength={800} onChange={(value) => update("setting", value)} help="For example: abandoned orbital station, flooded industrial city, isolated mountain colony." />
              <Field label="Desired tone" value={draft.tone} multiline optional maxLength={800} onChange={(value) => update("tone", value)} help="For example: tense and grounded, hopeful exploration, dark comedy." />
              <Field label="Inspirations" value={draft.inspirations} multiline optional maxLength={800} onChange={(value) => update("inspirations", value)} help="Games, films, books, art, or real-world references that communicate the direction." />
              <Field label="What should it NOT feel like?" value={draft.antiInspirations} multiline optional maxLength={800} onChange={(value) => update("antiInspirations", value)} help="For example: power fantasy, slapstick comedy, endless grind." />
            </div>
          </>
        );
      case 5:
        return (
          <>
            <div className="creator-question">
              <h1>What should guide design decisions?</h1>
              <p>Design pillars are principles that should guide design decisions throughout the game.</p>
              <small className="creator-example-copy">Examples only: Every fight should reward positioning · Exploration should create tension, not chores · Preparation should matter more than grinding.</small>
            </div>
            <div className="creator-pillar-list">
              {draft.pillars.map((pillar, index) => (
                <article className="creator-pillar" key={index}>
                  <div className="creator-pillar-title">
                    <Field label={`Pillar ${index + 1} title`} value={pillar.title} maxLength={80} onChange={(value) => updatePillar(index, { title: value })} />
                    {pillar.origin === "AI_ACCEPTED" ? <span className="creator-ai-assisted-badge">AI-assisted · accepted · editable</span> : null}
                  </div>
                  <Field label={`Pillar ${index + 1} explanation`} value={pillar.explanation} multiline optional maxLength={400} onChange={(value) => updatePillar(index, { explanation: value })} />
                  <button className="text-button creator-remove-pillar" type="button" onClick={() => onChange({ ...draft, pillars: draft.pillars.filter((_, pillarIndex) => pillarIndex !== index) })}>Remove pillar {index + 1}</button>
                </article>
              ))}
              {draft.pillars.length < 6 ? (
                <button className="outline-button creator-add-pillar" type="button" onClick={() => onChange({ ...draft, pillars: [...draft.pillars, { title: "", explanation: "" }] })}>
                  <LineIcon name="document" /> Add design pillar
                </button>
              ) : null}
            </div>
            <section className="creator-ai-panel" aria-labelledby="pillars-ai-title">
              <div className="creator-ai-heading">
                <div>
                  <p className="eyebrow">Optional AI assistance</p>
                  <h2 id="pillars-ai-title">Explore Design Pillars</h2>
                  <p>Suggestions use only this Creator draft. Accepted pillars join—never silently replace—your existing pillars.</p>
                </div>
                <div className="creator-ai-heading-actions">
                  {aiHistory.length ? <button className="text-button" type="button" onClick={() => setHistoryOpen(true)}>AI History</button> : null}
                  <button className="outline-button" type="button" disabled={activeAiTask !== null} onClick={() => void openPreflight("designPillars")}>{pillarProposal ? "Regenerate" : "Suggest Pillars"}</button>
                </div>
              </div>
              {activeAiTask === "pillars" ? <p className="creator-ai-running" role="status"><span className="specialist-spinner specialist-spinner-small" aria-hidden="true" />Nebius Token Factory · {selectedModelId} · Requesting proposals… {elapsedSeconds}s</p> : null}
              {step === 5 && aiError ? <AiErrorNotice error={aiError} /> : null}
              {pillarProposal ? (
                <div className="creator-ai-results">
                  <div className="creator-ai-proposal-intro"><strong>AI-generated proposals</strong><span>Based on your current Creator draft · Accept only what fits</span></div>
                  {pillarProposal.note ? <p className="creator-ai-note">{pillarProposal.note}</p> : null}
                  <div className="creator-ai-proposal-grid creator-ai-proposal-grid--pillars">
                    {pillarProposal.proposals.map((proposal, index) => (
                      <article className="creator-ai-proposal" key={`${proposal.title}-${index}`}>
                        <div><h3>{proposal.title}</h3><p>{proposal.description}</p><ProposalAssumptions assumptions={proposal.assumptions} /></div>
                        <button className="outline-button" type="button" disabled={acceptedPillarIndexes.includes(index)} onClick={() => acceptPillar(index)}>{acceptedPillarIndexes.includes(index) ? "Accepted" : "Accept pillar"}</button>
                      </article>
                    ))}
                  </div>
                  <div className="creator-ai-result-footer creator-ai-result-footer--actions">
                    <AiMetadata metadata={pillarProposal} />
                    <div><button className="outline-button" type="button" onClick={applyAllPillars}>Apply All</button><button className="text-button" type="button" onClick={discardPillarProposals}>Discard proposals</button></div>
                  </div>
                </div>
              ) : null}
              {step === 5 && aiNotice ? <p className="creator-ai-notice" role="status">{aiNotice}</p> : null}
            </section>
          </>
        );
      case 6:
        return (
          <>
            <div className="creator-question">
              <h1>What practical limits shape the project?</h1>
              <p>Only capture enough context to keep future guidance realistic. This is not a production plan.</p>
            </div>
            <div className="creator-fields creator-fields--two-column">
              <Field label="Engine" value={draft.engine} optional maxLength={120} onChange={(value) => update("engine", value)} help="For example: Unity, Unreal, Godot, or a custom engine." />
              <Field label="Team size" value={draft.teamSize} optional maxLength={120} onChange={(value) => update("teamSize", value)} help="For example: solo, 2–5, or 10+." />
              <Field label="Expected scope" value={draft.expectedScope} optional maxLength={400} onChange={(value) => update("expectedScope", value)} help="For example: small commercial indie, 6–10 hour campaign, or vertical slice first." />
              <Field label="Major constraints" value={draft.majorConstraints} multiline optional maxLength={800} onChange={(value) => update("majorConstraints", value)} help="For example: 12-month scope, limited art budget, no online multiplayer, or controller-first." />
            </div>
            {draft.targetPlatform.trim() ? <p className="creator-context-note">Target platform from Identity: <strong>{draft.targetPlatform}</strong></p> : null}
          </>
        );
      default:
        return (
          <>
            <div className="creator-question creator-review-intro">
              <h1>Your Game Foundation</h1>
              <p>ForgeMind will save this user-authored intent to the project Compendium only after you choose a directory and confirm initialization.</p>
            </div>
            <div className="creator-review-grid">
              <article className="creator-review-section">
                <div className="creator-review-heading">
                  <h3>Identity / Vision</h3>
                  <div className="creator-review-actions">
                    <button className="text-button" type="button" onClick={() => editFromReview(0)}>Edit Identity</button>
                    <button className="text-button" type="button" onClick={() => editFromReview(1)}>Edit Vision</button>
                  </div>
                </div>
                <h4>{draft.workingTitle}</h4>
                <ReviewValue>{[draft.genre, draft.mode, draft.perspective, draft.targetPlatform].filter(Boolean).join(" · ")}</ReviewValue>
                <ReviewValue>{draft.pitch}</ReviewValue>
              </article>
              <ReviewSection title="Player Experience" step={2} onEdit={editFromReview}><ReviewValue>{draft.playerExperience}</ReviewValue></ReviewSection>
              <ReviewSection title="Core Loop" step={3} onEdit={editFromReview}>
                {draft.coreLoopOrigin === "AI_ACCEPTED" && draft.coreLoop.trim() ? <span className="creator-ai-assisted-badge">AI-assisted · explicitly accepted</span> : null}
                <ReviewValue>{draft.coreLoop}</ReviewValue>
              </ReviewSection>
              <ReviewSection title="Design Pillars" step={5} onEdit={editFromReview}>
                {reviewedPillars.length > 0 ? <ul>{reviewedPillars.map((pillar, index) => <li key={index}><strong>{pillar.title}</strong>{pillar.explanation ? ` — ${pillar.explanation}` : ""}{pillar.origin === "AI_ACCEPTED" ? <span className="creator-ai-assisted-badge">AI-assisted</span> : null}</li>)}</ul> : <ReviewValue>{""}</ReviewValue>}
              </ReviewSection>
              <ReviewSection title="World & Tone" step={4} onEdit={editFromReview}>
                <ReviewValue>{[draft.setting, draft.tone, draft.inspirations, draft.antiInspirations].filter(Boolean).join("\n")}</ReviewValue>
              </ReviewSection>
              <ReviewSection title="Practical Constraints" step={6} onEdit={editFromReview}>
                <ReviewValue>{[draft.engine, draft.teamSize, draft.targetPlatform, draft.expectedScope, draft.majorConstraints].filter(Boolean).join("\n")}</ReviewValue>
              </ReviewSection>
              <ReviewSection title="Open Questions" step={firstOpenQuestionStep} onEdit={editFromReview}>
                {openQuestions.length > 0 ? <ul>{openQuestions.map((question) => <li key={question}>{question}</li>)}</ul> : <p>No foundation gaps were detected from the fields you completed.</p>}
              </ReviewSection>
            </div>
            <section className="creator-directory" aria-labelledby="creator-directory-title">
              <div>
                <p className="eyebrow">Local project</p>
                <h2 id="creator-directory-title">{selectedDirectory ? "Ready to initialize" : "Choose where this project lives"}</h2>
                <p>{selectedDirectory ? selectedDirectory : "No directory is selected yet. Choosing one inspects it first and does not create files."}</p>
              </div>
              {selectedDirectory ? (
                <div className="creator-directory-actions">
                  <button className="primary-button" type="button" disabled={isInitializing} onClick={() => void onInitialize(foundation)}>{isInitializing ? "Creating project…" : "Initialize Project"}</button>
                  <button className="outline-button" type="button" disabled={isInitializing} onClick={() => void onChooseDirectory(foundation)}>Choose another directory</button>
                </div>
              ) : (
                <button className="primary-button" type="button" onClick={() => void onChooseDirectory(foundation)}>Create Project</button>
              )}
            </section>
            {creationError ? <p className="creator-inline-error" role="alert">{creationError}</p> : null}
          </>
        );
    }
  }

  return (
    <>
    <main className="creator-shell">
      <header className="creator-topbar">
        <BrandLockup compact />
        <button className="text-button" type="button" onClick={requestCancel}>Return Home</button>
      </header>
      <div className="creator-layout">
        <aside className="creator-progress" aria-label="New Project Creator progress">
          <p className="eyebrow">New Project Creator</p>
          <ol>
            {steps.map((item, index) => (
              <li className={index === step ? "creator-step creator-step--active" : index < step ? "creator-step creator-step--complete" : "creator-step"} aria-current={index === step ? "step" : undefined} key={item.label}>
                <span>{index + 1}</span>{item.label}
              </li>
            ))}
          </ol>
        </aside>
        <section className="creator-stage" aria-labelledby="creator-step-title">
          <p className="eyebrow" id="creator-step-title">Step {step + 1} of {steps.length} · {current.eyebrow}</p>
          {renderStep()}
          {validationError ? <p className="creator-inline-error" role="alert">{validationError}</p> : null}
          {confirmDiscard ? (
            <div className="creator-discard-confirmation" role="alertdialog" aria-labelledby="discard-creator-title">
              <div><strong id="discard-creator-title">Discard this foundation draft?</strong><p>No workspace has been created yet.</p></div>
              <button className="danger-button" type="button" onClick={onCancel}>Discard and return Home</button>
              <button className="outline-button" type="button" onClick={() => setConfirmDiscard(false)}>Continue editing</button>
            </div>
          ) : null}
          {step < 7 ? (
            <footer className="creator-navigation">
              <button className="outline-button" type="button" disabled={step === 0} onClick={() => { setValidationError(null); setAiError(null); setAiNotice(null); setStep((currentStep) => Math.max(0, currentStep - 1)); }}>Back</button>
              <button className="primary-button" type="button" onClick={goNext}>{returnToReview ? "Return to Review" : "Continue"}</button>
            </footer>
          ) : (
            <footer className="creator-navigation creator-navigation--review">
              <button className="outline-button" type="button" onClick={() => { onClearDirectory(); setAiError(null); setAiNotice(null); setStep(6); }}>Back</button>
            </footer>
          )}
        </section>
      </div>
    </main>
    {preflightTask ? (
      <AiPreflightDialog
        preflight={preflight}
        selectedModelId={selectedModelId}
        loading={preflightLoading}
        error={preflightError}
        onModelChange={(modelId) => void changePreflightModel(modelId)}
        onCancel={closePreflight}
        onRun={confirmAiRun}
      />
    ) : null}
    {historyOpen ? (
      <AiHistoryDrawer
        history={aiHistory}
        selectedId={selectedHistoryId}
        onSelect={setSelectedHistoryId}
        onRestore={restoreHistoryEntry}
        onClose={() => setHistoryOpen(false)}
      />
    ) : null}
    </>
  );
}
