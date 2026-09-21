import { useEffect, useMemo, useState } from "react";
import {
  createFeatureContract,
  deleteFeatureContractDraft,
  draftFeatureContractWithAi,
  implementationBrief,
  loadFeatureContracts,
  loadFeatureContractSources,
  setFeatureContractStatus,
  updateFeatureContract,
  type FeatureContract,
  type FeatureContractDraftProposal,
  type FeatureContractEditableFields,
  type FeatureContractSourceOption,
  type FeatureContractSourceType,
  type FeatureContractsDocument,
} from "./platform/featureContracts";
import { loadModelRegistry, type ModelEntry } from "./platform/modelRegistry";
import type { RealitySource } from "./platform/alignment";

interface FeatureContractsWorkspace {
  path: string;
  projectId: string;
}

interface FormState {
  title: string;
  goal: string;
  affectedSystems: string;
  requiredBehavior: string;
  outOfScope: string;
  risks: string;
  acceptanceCriteria: string;
  deterministicTests: string;
  implementationNotes: string;
  likelyAffectedEvidenceIds: string[];
}

type ProposalSection = Exclude<keyof FeatureContractDraftProposal, never>;
type ActionKey = "create" | "save" | "approve" | "copy" | "delete" | "ai" | "status";

interface ActionFeedback {
  action: ActionKey;
  message: string;
  error?: boolean;
}

const emptyForm: FormState = {
  title: "",
  goal: "",
  affectedSystems: "",
  requiredBehavior: "",
  outOfScope: "",
  risks: "",
  acceptanceCriteria: "",
  deterministicTests: "",
  implementationNotes: "",
  likelyAffectedEvidenceIds: [],
};

const proposalSections: Array<{ key: ProposalSection; label: string }> = [
  { key: "goal", label: "Goal" },
  { key: "affectedSystems", label: "Affected systems" },
  { key: "requiredBehavior", label: "Required behavior" },
  { key: "outOfScope", label: "Out of scope" },
  { key: "risks", label: "Risks" },
  { key: "acceptanceCriteria", label: "Acceptance criteria" },
  { key: "deterministicTests", label: "Deterministic tests" },
  { key: "implementationNotes", label: "Implementation notes" },
];

function displayEnum(value: string): string {
  return value.toLowerCase().split("_").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function messageFromError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "ForgeMind could not complete the Feature Contract action.";
}

function sourceKey(source: Pick<FeatureContractSourceOption, "sourceType" | "sourceId">): string {
  return `${source.sourceType}::${source.sourceId}`;
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function formFromContract(contract: FeatureContract): FormState {
  return {
    title: contract.title,
    goal: contract.goal,
    affectedSystems: contract.affectedSystems.join("\n"),
    requiredBehavior: contract.requiredBehavior.join("\n"),
    outOfScope: contract.outOfScope.join("\n"),
    risks: contract.risks.join("\n"),
    acceptanceCriteria: contract.acceptanceCriteria.join("\n"),
    deterministicTests: contract.deterministicTests.join("\n"),
    implementationNotes: contract.implementationNotes,
    likelyAffectedEvidenceIds: contract.likelyAffectedEvidenceIds,
  };
}

function editableFields(form: FormState): FeatureContractEditableFields {
  return {
    title: form.title.trim(),
    goal: form.goal.trim(),
    affectedSystems: lines(form.affectedSystems),
    requiredBehavior: lines(form.requiredBehavior),
    outOfScope: lines(form.outOfScope),
    risks: lines(form.risks),
    acceptanceCriteria: lines(form.acceptanceCriteria),
    deterministicTests: lines(form.deterministicTests),
    implementationNotes: form.implementationNotes.trim(),
    likelyAffectedEvidenceIds: form.likelyAffectedEvidenceIds,
  };
}

function proposalValue(proposal: FeatureContractDraftProposal, key: ProposalSection): string {
  const value = proposal[key];
  return Array.isArray(value) ? value.join("\n") : value;
}

function formatTimestamp(value: string): string {
  return value.replace("T", " ").replace(/:\d\d(?:\.\d+)?Z$/, "Z");
}

export function FeatureContractsPage({
  workspace,
  onOpenSource,
  onOpenReality,
  onBackToWiki,
}: {
  workspace: FeatureContractsWorkspace;
  onOpenSource?: (sourceType: FeatureContractSourceType, sourceId: string) => void;
  onOpenReality?: (source: RealitySource) => void;
  onBackToWiki?: () => void;
}) {
  const [sources, setSources] = useState<FeatureContractSourceOption[]>([]);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [modelId, setModelId] = useState("");
  const [document, setDocument] = useState<FeatureContractsDocument | null>(null);
  const [selectedSourceKey, setSelectedSourceKey] = useState("");
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [proposal, setProposal] = useState<FeatureContractDraftProposal | null>(null);
  const [proposalModel, setProposalModel] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState<ActionKey | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void Promise.all([loadFeatureContractSources(workspace.path), loadFeatureContracts(workspace.path), loadModelRegistry()])
      .then(([catalog, contracts, registry]) => {
        if (!active) return;
        const enabledModels = registry.filter((model) => model.enabled);
        setSources(catalog.sources);
        setSelectedSourceKey(catalog.sources[0] ? sourceKey(catalog.sources[0]) : "");
        setDocument(contracts);
        const initialContract = contracts?.contracts.at(-1) ?? null;
        setSelectedContractId(initialContract?.id ?? null);
        setForm(initialContract ? formFromContract(initialContract) : emptyForm);
        setModels(enabledModels);
        setModelId(enabledModels[0]?.modelId ?? "");
      })
      .catch((error) => {
        if (active) setLoadError(messageFromError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [workspace.path]);

  const selectedSource = sources.find((source) => sourceKey(source) === selectedSourceKey) ?? null;
  const selectedContract = document?.contracts.find((contract) => contract.id === selectedContractId) ?? null;
  const sortedContracts = useMemo(
    () => [...(document?.contracts ?? [])].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [document],
  );
  const likelyAffectedEvidence = selectedContract?.sources.realityEvidence.filter(
    (evidence) => evidence.source === "UNITY" || evidence.evidenceId.startsWith("git:file:"),
  ) ?? [];

  function selectContract(contract: FeatureContract | null) {
    setSelectedContractId(contract?.id ?? null);
    setForm(contract ? formFromContract(contract) : emptyForm);
    setProposal(null);
    setProposalModel(null);
    setPreviewOpen(false);
    setDeleteConfirming(false);
  }

  const approvalMissing = useMemo(() => {
    const fields = editableFields(form);
    const missing: string[] = [];
    if (!fields.title) missing.push("title");
    if (!fields.goal) missing.push("goal");
    if (fields.affectedSystems.length === 0) missing.push("affected systems");
    if (fields.requiredBehavior.length === 0) missing.push("required behavior");
    if (fields.outOfScope.length === 0) missing.push("out of scope");
    if (fields.acceptanceCriteria.length === 0) missing.push("acceptance criteria");
    if (fields.deterministicTests.length === 0) missing.push("deterministic tests");
    return missing;
  }, [form]);

  const previewContract = selectedContract ? {
    ...selectedContract,
    ...editableFields(form),
  } : null;
  const briefText = previewContract ? implementationBrief(previewContract) : "";

  function localFeedback(action: ActionKey, message: string, error = false) {
    setFeedback({ action, message, error });
  }

  function feedbackFor(action: ActionKey) {
    if (feedback?.action !== action) return null;
    return <span className={feedback.error ? "action-feedback is-error" : "action-feedback"} role={feedback.error ? "alert" : "status"}>{feedback.message}</span>;
  }

  async function createDraft() {
    if (!selectedSource || workingAction) return;
    setWorkingAction("create");
    setFeedback(null);
    try {
      const next = await createFeatureContract(workspace.path, workspace.projectId, selectedSource.sourceType, selectedSource.sourceId);
      setDocument(next);
      selectContract(next.contracts.at(-1) ?? null);
      localFeedback("create", "Draft created from captured source facts.");
    } catch (error) {
      localFeedback("create", messageFromError(error), true);
    } finally {
      setWorkingAction(null);
    }
  }

  async function saveDraft(): Promise<FeatureContractsDocument | null> {
    if (!selectedContract || selectedContract.status !== "DRAFT" || workingAction) return null;
    setWorkingAction("save");
    setFeedback(null);
    try {
      const next = await updateFeatureContract(workspace.path, workspace.projectId, selectedContract.id, editableFields(form));
      setDocument(next);
      localFeedback("save", "Draft saved for later review. It remains incomplete and unapproved until you explicitly approve it.");
      return next;
    } catch (error) {
      localFeedback("save", messageFromError(error), true);
      return null;
    } finally {
      setWorkingAction(null);
    }
  }

  async function approve() {
    if (!selectedContract || approvalMissing.length > 0 || workingAction) return;
    setWorkingAction("approve");
    setFeedback(null);
    try {
      await updateFeatureContract(workspace.path, workspace.projectId, selectedContract.id, editableFields(form));
      const approved = await setFeatureContractStatus(workspace.path, workspace.projectId, selectedContract.id, "APPROVED");
      setDocument(approved);
      localFeedback("approve", "Contract saved and approved explicitly.");
    } catch (error) {
      localFeedback("approve", messageFromError(error), true);
    } finally {
      setWorkingAction(null);
    }
  }

  async function deleteDraft() {
    if (!selectedContract || selectedContract.status !== "DRAFT" || workingAction) return;
    setWorkingAction("delete");
    setFeedback(null);
    try {
      const next = await deleteFeatureContractDraft(workspace.path, workspace.projectId, selectedContract.id);
      setDocument(next);
      selectContract(next.contracts.at(-1) ?? null);
      localFeedback("delete", "Draft deleted. Approved and historical contracts were not changed.");
    } catch (error) {
      localFeedback("delete", messageFromError(error), true);
    } finally {
      setWorkingAction(null);
    }
  }

  async function changeStatus(status: "SUPERSEDED" | "DEPRECATED") {
    if (!selectedContract || workingAction) return;
    setWorkingAction("status");
    setFeedback(null);
    try {
      const next = await setFeatureContractStatus(workspace.path, workspace.projectId, selectedContract.id, status);
      setDocument(next);
      localFeedback("status", `Contract marked ${displayEnum(status)}.`);
    } catch (error) {
      localFeedback("status", messageFromError(error), true);
    } finally {
      setWorkingAction(null);
    }
  }

  async function requestAiDraft() {
    if (!selectedContract || selectedContract.status !== "DRAFT" || !modelId || workingAction) return;
    setWorkingAction("ai");
    setFeedback(null);
    setProposal(null);
    try {
      const result = await draftFeatureContractWithAi(
        workspace.path,
        workspace.projectId,
        selectedContract.id,
        modelId,
        editableFields(form),
      );
      setProposal(result.proposal);
      setProposalModel(result.model);
      localFeedback("ai", "AI proposal is ready for review. Nothing was applied, saved, or approved.");
    } catch (error) {
      localFeedback("ai", messageFromError(error), true);
    } finally {
      setWorkingAction(null);
    }
  }

  function applyProposalSection(key: ProposalSection) {
    if (!proposal) return;
    const currentValue = form[key];
    const hasHumanText = typeof currentValue === "string" && currentValue.trim().length > 0;
    if (hasHumanText && !window.confirm(`Replace the current ${displayEnum(key)} text with the reviewed AI suggestion?`)) return;
    setForm((current) => ({ ...current, [key]: proposalValue(proposal, key) }));
    localFeedback("ai", `${displayEnum(key)} applied to the unsaved draft for review.`);
  }

  function applyAllProposal() {
    if (!proposal) return;
    const skipped: string[] = [];
    const next = { ...form };
    proposalSections.forEach(({ key, label }) => {
      const currentValue = form[key];
      if (typeof currentValue === "string" && currentValue.trim()) {
        skipped.push(label);
      } else {
        next[key] = proposalValue(proposal, key);
      }
    });
    setForm(next);
    localFeedback("ai", skipped.length > 0
      ? `Applied suggestions to empty sections only. Preserved human text in: ${skipped.join(", ")}.`
      : "Applied all suggestions to the unsaved draft. Review and save explicitly when ready.");
  }

  async function copyBrief() {
    if (!selectedContract || selectedContract.status !== "APPROVED") return;
    try {
      await navigator.clipboard.writeText(briefText);
      localFeedback("copy", "Implementation Brief copied from the same content shown in Preview.");
    } catch {
      localFeedback("copy", "ForgeMind could not copy the Implementation Brief to the clipboard.", true);
    }
  }

  if (loading) return <p className="feature-contract-loading">Loading Feature Contracts...</p>;

  return (
    <div className="feature-contract-page">
      <section className="feature-contract-intro">
        <div>
          <span className="section-label">Intent → Reality → reviewed delivery scope</span>
          <h2>Feature Contracts</h2>
          <p>Review, refine, approve, and hand off cited implementation scope. AI suggestions remain proposals until you apply and save them.</p>
        </div>
        {onBackToWiki ? <button className="outline-button" type="button" onClick={onBackToWiki}>Back to Game Wiki</button> : null}
      </section>

      {loadError ? <div className="error-banner" role="alert">{loadError}</div> : null}

      <details className="feature-contract-create">
        <summary>Create a new contract</summary>
        <div className="feature-contract-create-content">
          <div>
            <span className="section-label">Captured source</span>
            <h3>Create from approved or authoritative source</h3>
            <p>Approved Alignment is preferred because it already binds Intent to selected Reality evidence.</p>
          </div>
          {sources.length === 0 ? (
            <p>No eligible sources exist. Approve an Alignment Review or Decision, or add current Compendium knowledge.</p>
          ) : (
            <>
              <label>Source<select value={selectedSourceKey} onChange={(event) => setSelectedSourceKey(event.target.value)}>
                {sources.map((source) => <option key={sourceKey(source)} value={sourceKey(source)}>{source.preferred ? "Preferred · " : ""}{displayEnum(source.sourceType)} · {source.title}</option>)}
              </select></label>
              {selectedSource ? <div className="feature-contract-source-preview" aria-label="Selected source facts">
                <span className="wiki-type">{displayEnum(selectedSource.sourceType)}</span>
                <strong>{selectedSource.title}</strong>
                <p>{selectedSource.statement}</p>
                <small>{displayEnum(selectedSource.status)} · {displayEnum(selectedSource.provenance)} · {selectedSource.realityEvidence.length} Reality references</small>
                {selectedSource.alignmentRationale ? <p>Alignment rationale: {selectedSource.alignmentRationale}</p> : null}
              </div> : null}
              <div className="feature-contract-local-action">
                <button className="primary-button" type="button" disabled={!selectedSource || Boolean(workingAction)} onClick={() => void createDraft()}>
                  {workingAction === "create" ? "Creating..." : "Create DRAFT"}
                </button>
                {feedbackFor("create")}
              </div>
            </>
          )}
        </div>
      </details>

      <div className="feature-contract-workbench">
        <aside className="feature-contract-list" aria-label="Feature Contract list">
          <div className="feature-contract-panel-heading"><h3>Contracts</h3><span>{sortedContracts.length}</span></div>
          {sortedContracts.length === 0 ? <p>No Feature Contracts yet.</p> : sortedContracts.map((contract) => (
            <button
              className={contract.id === selectedContractId ? "feature-contract-list-item is-selected" : "feature-contract-list-item"}
              key={contract.id}
              type="button"
              aria-current={contract.id === selectedContractId ? "true" : undefined}
              onClick={() => { selectContract(contract); setFeedback(null); }}
            >
              <strong>{contract.title}</strong>
              <span><b>{contract.status}</b> · {displayEnum(contract.sources.origin.sourceType)}</span>
              <time dateTime={contract.updatedAt}>Updated {formatTimestamp(contract.updatedAt)}</time>
            </button>
          ))}
          {feedbackFor("delete")}
        </aside>

        <section className="feature-contract-editor" aria-label="Feature Contract editor">
          {!selectedContract ? <p>Select or create a Feature Contract.</p> : <>
            <header className="feature-contract-editor-heading">
              <div><span className={`wiki-type wiki-type-${selectedContract.status.toLowerCase()}`}>{displayEnum(selectedContract.status)}</span><span>{displayEnum(selectedContract.reviewState)}</span></div>
              {selectedContract.status === "DRAFT" ? (
                <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
              ) : <h3>{selectedContract.title}</h3>}
            </header>

            {selectedContract.status === "DRAFT" ? <section className="feature-contract-ai" aria-label="AI-assisted drafting">
              <div><span className="section-label">Proposal only</span><h3>AI-assisted draft</h3><p>Uses captured Intent, approved Alignment, captured Reality, and the current editor text. It never saves or approves.</p></div>
              <label>Model<select value={modelId} disabled={models.length === 0 || Boolean(workingAction)} onChange={(event) => setModelId(event.target.value)}>
                {models.map((model) => <option key={model.modelId} value={model.modelId}>{model.displayName}</option>)}
              </select></label>
              <div className="feature-contract-local-action">
                <button className="outline-button" type="button" disabled={!modelId || Boolean(workingAction)} onClick={() => void requestAiDraft()}>
                  {workingAction === "ai" ? "Drafting..." : "Draft with AI"}
                </button>
                {feedbackFor("ai")}
              </div>
            </section> : null}

            {proposal ? <section className="feature-contract-proposal" aria-label="AI proposal review">
              <header><div><span className="wiki-type wiki-type-ai">AI suggestion · not saved</span><h3>Review proposed sections</h3>{proposalModel ? <small>{proposalModel}</small> : null}</div>
                <div className="feature-contract-proposal-actions"><button className="primary-button" type="button" onClick={applyAllProposal}>Apply all</button><button className="text-button" type="button" onClick={() => { setProposal(null); setProposalModel(null); localFeedback("ai", "AI proposal discarded. The draft was not changed."); }}>Discard</button></div>
              </header>
              <p className="scope-note">Captured source facts remain in the Source Trace. These are AI suggestions; applying them changes only the unsaved editor.</p>
              <div className="feature-contract-proposal-grid">{proposalSections.map(({ key, label }) => {
                const currentValue = form[key];
                const hasHumanText = typeof currentValue === "string" && currentValue.trim().length > 0;
                return <article key={key}><h4>{label}</h4><pre>{proposalValue(proposal, key) || "No suggestion."}</pre><button className="outline-button compact-action" type="button" onClick={() => applyProposalSection(key)}>{hasHumanText ? "Review & replace section" : "Apply section"}</button></article>;
              })}</div>
            </section> : null}

            <section className="feature-contract-field-group">
              <h3>Delivery scope</h3>
              <div className="feature-contract-fields">
                <label>Goal<textarea value={form.goal} disabled={selectedContract.status !== "DRAFT"} onChange={(event) => setForm({ ...form, goal: event.target.value })} /></label>
                <label>Affected systems <small>One per line; use files only when captured evidence supports them.</small><textarea value={form.affectedSystems} disabled={selectedContract.status !== "DRAFT"} onChange={(event) => setForm({ ...form, affectedSystems: event.target.value })} /></label>
                <label>Required behavior <small>One per line</small><textarea value={form.requiredBehavior} disabled={selectedContract.status !== "DRAFT"} onChange={(event) => setForm({ ...form, requiredBehavior: event.target.value })} /></label>
                <label>Out of scope <small>One per line</small><textarea value={form.outOfScope} disabled={selectedContract.status !== "DRAFT"} onChange={(event) => setForm({ ...form, outOfScope: event.target.value })} /></label>
              </div>
            </section>
            <section className="feature-contract-field-group">
              <h3>Review and validation</h3>
              <div className="feature-contract-fields">
                <label>Risks <small>One per line</small><textarea value={form.risks} disabled={selectedContract.status !== "DRAFT"} onChange={(event) => setForm({ ...form, risks: event.target.value })} /></label>
                <label>Acceptance criteria <small>One per line</small><textarea value={form.acceptanceCriteria} disabled={selectedContract.status !== "DRAFT"} onChange={(event) => setForm({ ...form, acceptanceCriteria: event.target.value })} /></label>
                <label>Deterministic tests <small>One per line</small><textarea value={form.deterministicTests} disabled={selectedContract.status !== "DRAFT"} onChange={(event) => setForm({ ...form, deterministicTests: event.target.value })} /></label>
                <label>Implementation notes<textarea value={form.implementationNotes} disabled={selectedContract.status !== "DRAFT"} onChange={(event) => setForm({ ...form, implementationNotes: event.target.value })} /></label>
              </div>
            </section>

            <footer className="feature-contract-actions">
              {feedbackFor("approve")}
              {selectedContract.status === "DRAFT" ? <>
                <div className="feature-contract-local-action"><button className="outline-button" type="button" disabled={Boolean(workingAction)} onClick={() => void saveDraft()}>{workingAction === "save" ? "Saving..." : "Save Draft"}</button>{feedbackFor("save")}<small>Save incomplete reviewed work for later. This does not approve it.</small></div>
                <div className="feature-contract-local-action"><button className="primary-button" type="button" disabled={Boolean(workingAction) || approvalMissing.length > 0} onClick={() => void approve()}>{workingAction === "approve" ? "Approving..." : "Save & Approve"}</button>{feedbackFor("approve")}{approvalMissing.length > 0 ? <small>Approval requires: {approvalMissing.join(", ")}.</small> : null}</div>
                <div className="feature-contract-local-action feature-contract-delete-action">
                  {!deleteConfirming ? <button className="text-button danger-text" type="button" onClick={() => setDeleteConfirming(true)}>Delete Draft</button> : <div className="inline-confirm" role="group" aria-label="Confirm draft deletion"><span>Delete this draft permanently?</span><button className="danger-button" type="button" disabled={Boolean(workingAction)} onClick={() => void deleteDraft()}>Confirm Delete</button><button className="text-button" type="button" onClick={() => setDeleteConfirming(false)}>Cancel</button></div>}
                </div>
              </> : null}
              {selectedContract.status === "APPROVED" ? <>
                <div className="feature-contract-local-action"><button className="outline-button" type="button" disabled={Boolean(workingAction)} onClick={() => void changeStatus("SUPERSEDED")}>Mark Superseded</button><button className="outline-button" type="button" disabled={Boolean(workingAction)} onClick={() => void changeStatus("DEPRECATED")}>Deprecate</button>{feedbackFor("status")}</div>
              </> : <>{feedbackFor("status")}</>}
            </footer>
          </>}
        </section>

        <aside className="feature-contract-inspector" aria-label="Feature Contract review panel">
          {!selectedContract ? <p>Source trace and brief preview appear here.</p> : <>
            <section className="feature-contract-trace" aria-label="Source traceability">
              <span className="section-label">Captured source facts</span><h3>Source trace</h3>
              <button className="feature-contract-trace-row" type="button" onClick={() => onOpenSource?.(selectedContract.sources.intent.sourceType, selectedContract.sources.intent.sourceId)}><strong>{displayEnum(selectedContract.sources.intent.sourceType)}</strong><span>{selectedContract.sources.intent.title}</span></button>
              {selectedContract.sources.alignment ? <button className="feature-contract-trace-row" type="button" onClick={() => onOpenSource?.("ALIGNMENT", selectedContract.sources.alignment!.alignmentId)}><strong>Alignment · {displayEnum(selectedContract.sources.alignment.status)}</strong><span>{selectedContract.sources.alignment.rationale}</span></button> : null}
              {selectedContract.sources.realityEvidence.map((evidence) => <button className="feature-contract-trace-row" type="button" key={evidence.evidenceId} onClick={() => onOpenReality?.(evidence.source)}><strong>{displayEnum(evidence.source)} · {displayEnum(evidence.provenance)}</strong><span>{evidence.summary}</span></button>)}
            </section>
            <section className="feature-contract-reality" aria-label="Current Reality summary"><h3>Current Reality</h3><p>{selectedContract.currentRealitySummary}</p></section>
            <fieldset className="feature-contract-evidence-selection" disabled={selectedContract.status !== "DRAFT"}>
              <legend>Likely affected evidence <small>optional</small></legend>
              <p>Only captured Git file or Unity evidence can be selected. Unselected evidence remains source context.</p>
              {likelyAffectedEvidence.length > 0 ? likelyAffectedEvidence.map((evidence) => <label className={form.likelyAffectedEvidenceIds.includes(evidence.evidenceId) ? "is-selected" : ""} key={evidence.evidenceId}><input type="checkbox" checked={form.likelyAffectedEvidenceIds.includes(evidence.evidenceId)} onChange={(event) => setForm({ ...form, likelyAffectedEvidenceIds: event.target.checked ? [...form.likelyAffectedEvidenceIds, evidence.evidenceId] : form.likelyAffectedEvidenceIds.filter((id) => id !== evidence.evidenceId) })} /><span><strong>{displayEnum(evidence.source)}</strong>{evidence.summary}</span></label>) : <p className="scope-note">No captured evidence establishes a file or component location.</p>}
            </fieldset>
            <section className="feature-contract-brief" aria-label="Implementation Brief preview">
              <h3>Implementation Brief</h3>
              <p>{approvalMissing.length === 0 ? "All approval-required sections are present." : `${approvalMissing.length} approval-required section${approvalMissing.length === 1 ? " is" : "s are"} incomplete.`}</p>
              <div className="feature-contract-local-action"><button className="outline-button" type="button" onClick={() => setPreviewOpen((open) => !open)}>{previewOpen ? "Hide Implementation Brief" : "Preview Implementation Brief"}</button></div>
              {previewOpen ? <pre className="feature-contract-brief-preview">{briefText}</pre> : null}
              {selectedContract.status === "APPROVED" ? <div className="feature-contract-local-action"><button className="primary-button" type="button" onClick={() => void copyBrief()}>Copy Implementation Brief</button>{feedbackFor("copy")}</div> : <small>Copy becomes available after explicit approval.</small>}
            </section>
          </>}
        </aside>
      </div>
    </div>
  );
}
