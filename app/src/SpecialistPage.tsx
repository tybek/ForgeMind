import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadDecisions, type Decision } from "./platform/decisions";
import { loadModelRegistry, type ModelEntry } from "./platform/modelRegistry";
import {
  KNOWLEDGE_AREAS,
  KNOWLEDGE_STATUSES,
  knowledgeAreaLabel,
  loadCompendium,
  promoteSpecialistFinding,
  type KnowledgeArea,
  type KnowledgeEntry,
  type KnowledgeStatus,
} from "./platform/projectKnowledge";
import {
  archiveAndResetSpecialistHistory,
  loadSpecialistProfiles,
  loadSpecialistRuns,
  runSpecialistAnalysis,
  type BehaviorDesignerResult,
  type SpecialistAnalysisResult,
  type SpecialistDiagnostics,
  type SpecialistError,
  type SpecialistProfile,
  type SpecialistRun,
  type SpecialistRunUsage,
  type SpecialistTaskType,
} from "./platform/specialists";
import { formatSpecialistDiagnosticsMarkdown, formatSpecialistResultMarkdown } from "./specialistMarkdown";

interface SpecialistWorkspace {
  path: string;
  projectId: string;
}

interface ResultView {
  result: BehaviorDesignerResult;
  model: string;
  taskType: SpecialistTaskType;
  selectedKnowledgeEntryIds: string[];
  selectedDecisionIds: string[];
  usage: SpecialistRunUsage;
  preferredTaskBudget?: number;
  effectiveCompletionBudget?: number;
  knownModelMaxCompletionTokens?: number;
  scenario: string;
  timestamp?: string;
}

interface PromotionDraft {
  id: string;
  section: string;
  specialistRunId: string;
  sourceFinding: string;
  area: KnowledgeArea;
  title: string;
  statement: string;
  status: KnowledgeStatus;
}

interface SelectableFinding {
  id: string;
  section: string;
  text: string;
}

interface CopyFeedback {
  key: string;
  succeeded: boolean;
}

function errorDetails(error: unknown): SpecialistError {
  if (typeof error === "object" && error !== null) {
    const message = "message" in error && typeof error.message === "string"
      ? error.message
      : "AI Behavior Designer could not complete the analysis.";
    const code = "code" in error && typeof error.code === "string" ? error.code : "SPECIALIST_ANALYSIS_FAILED";
    const diagnostics = "diagnostics" in error && typeof error.diagnostics === "object" && error.diagnostics !== null
      ? error.diagnostics as SpecialistError["diagnostics"]
      : undefined;
    return { code, message, diagnostics };
  }
  return { code: "SPECIALIST_ANALYSIS_FAILED", message: "AI Behavior Designer could not complete the analysis." };
}

function usage(value: number | undefined): string {
  return value === undefined ? "Not provided" : String(value);
}

function estimatedCost(value: number | undefined): string {
  return value === undefined ? "Unavailable" : `$${value.toFixed(6)} (Estimated)`;
}

function currentResultView(result: SpecialistAnalysisResult, model: ModelEntry | undefined, scenario: string): ResultView {
  let estimatedCostUsd: number | undefined;
  if (model?.pricing && result.inputTokens !== undefined && result.outputTokens !== undefined) {
    estimatedCostUsd = (result.inputTokens * model.pricing.inputUsdPerMillionTokens
      + result.outputTokens * model.pricing.outputUsdPerMillionTokens) / 1_000_000;
  }
  return {
    result: result.result,
    model: result.model,
    taskType: result.taskType,
    selectedKnowledgeEntryIds: result.selectedKnowledgeEntryIds,
    selectedDecisionIds: result.selectedDecisionIds,
    usage: {
      latencyMs: result.latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd,
    },
    preferredTaskBudget: result.preferredTaskBudget,
    effectiveCompletionBudget: result.effectiveCompletionBudget,
    knownModelMaxCompletionTokens: result.knownModelMaxCompletionTokens,
    scenario,
  };
}

function historyResultView(run: SpecialistRun): ResultView | null {
  if (run.status !== "SUCCEEDED" || !run.result) return null;
  return {
    result: run.result,
    model: run.modelId,
    taskType: run.taskType,
    selectedKnowledgeEntryIds: run.selectedKnowledgeEntryIds,
    selectedDecisionIds: run.selectedDecisionIds,
    usage: run.usage,
    preferredTaskBudget: run.preferredTaskBudget,
    effectiveCompletionBudget: run.effectiveCompletionBudget,
    knownModelMaxCompletionTokens: run.knownModelMaxCompletionTokens,
    scenario: run.scenario,
    timestamp: run.createdAt,
  };
}

function ResultList({
  title,
  items,
  className = "",
  findingPrefix,
  selectedFindingIds,
  onToggleFinding,
}: {
  title: string;
  items: string[];
  className?: string;
  findingPrefix?: string;
  selectedFindingIds?: string[];
  onToggleFinding?: (finding: SelectableFinding) => void;
}) {
  return (
    <section className={`specialist-result-section ${className}`.trim()} aria-label={title}>
      <h3>{title}</h3>
      {items.length > 0 ? <ul>{items.map((item, index) => {
        const finding = { id: `${findingPrefix}:${index}`, section: findingPrefix ?? title, text: item };
        return (
          <li key={finding.id}>
            {onToggleFinding ? (
              <label className="specialist-finding-choice">
                <input type="checkbox" checked={selectedFindingIds?.includes(finding.id) ?? false} onChange={() => onToggleFinding(finding)} />
                <span>{item}</span>
              </label>
            ) : <span>{item}</span>}
          </li>
        );
      })}</ul> : <p>None provided.</p>}
    </section>
  );
}

function CopyAction({
  label,
  feedbackKey,
  feedback,
  onCopy,
}: {
  label: string;
  feedbackKey: string;
  feedback: CopyFeedback | null;
  onCopy: () => void;
}) {
  const localFeedback = feedback?.key === feedbackKey ? feedback : null;
  return (
    <span className="specialist-copy-control">
      <button className="specialist-icon-button" type="button" aria-label={label} title={label} onClick={onCopy}>
        <span aria-hidden="true">&#x2398;</span>
      </button>
      {localFeedback ? <span className={localFeedback.succeeded ? "specialist-copy-feedback" : "specialist-copy-feedback specialist-copy-feedback-failed"} role="status">{localFeedback.succeeded ? "Copied" : "Copy failed"}</span> : null}
    </span>
  );
}

function ScenarioPanel({
  scenario,
  feedbackKey,
  feedback,
  onCopy,
}: {
  scenario: string;
  feedbackKey: string;
  feedback: CopyFeedback | null;
  onCopy: (scenario: string, feedbackKey: string) => void;
}) {
  return (
    <section className="specialist-history-scenario" aria-label="Scenario / Question">
      <div className="specialist-scenario-heading">
        <h3>Scenario / Question</h3>
        <CopyAction label="Copy Scenario" feedbackKey={feedbackKey} feedback={feedback} onCopy={() => onCopy(scenario, feedbackKey)} />
      </div>
      <p>{scenario}</p>
    </section>
  );
}

function Diagnostics({ diagnostics }: { diagnostics?: SpecialistDiagnostics }) {
  if (!diagnostics) return null;
  return (
    <dl className="result-metadata" aria-label="Specialist response diagnostics">
      <div><dt>Finish reason</dt><dd>{diagnostics.finishReason ?? "Unavailable"}</dd></div>
      <div><dt>Readable text</dt><dd>{diagnostics.readableTextPresent === undefined ? "Unavailable" : diagnostics.readableTextPresent ? "Yes" : "No"}</dd></div>
      <div><dt>JSON extracted</dt><dd>{diagnostics.jsonExtractionSucceeded === undefined ? "Unavailable" : diagnostics.jsonExtractionSucceeded ? "Yes" : "No"}</dd></div>
      <div><dt>Missing fields</dt><dd>{diagnostics.missingFields?.join(", ") || "None"}</dd></div>
      <div><dt>Invalid field types</dt><dd>{diagnostics.invalidFieldTypes?.join(", ") || "None"}</dd></div>
      <div><dt>Unknown fields</dt><dd>{diagnostics.unknownFields?.join(", ") || "None"}</dd></div>
      <div><dt>List bound exceeded</dt><dd>{diagnostics.listBoundExceeded ?? "None"}</dd></div>
      <div><dt>Validation issue</dt><dd>{diagnostics.validationIssue ?? "None"}</dd></div>
      <div><dt>HTTP status</dt><dd>{diagnostics.httpStatus ?? "Unavailable"}</dd></div>
      <div><dt>Provider error code</dt><dd>{diagnostics.providerErrorCode ?? "Unavailable"}</dd></div>
      <div><dt>Provider error type</dt><dd>{diagnostics.providerErrorType ?? "Unavailable"}</dd></div>
      <div><dt>Rejected parameter</dt><dd>{diagnostics.rejectedParameter ?? "Not identified"}</dd></div>
      <div><dt>Preferred task budget</dt><dd>{diagnostics.preferredTaskBudget ?? "Unavailable"}</dd></div>
      <div><dt>Configured budget</dt><dd>{diagnostics.configuredCompletionBudget ?? "Unavailable"}</dd></div>
      <div><dt>Effective budget</dt><dd>{diagnostics.effectiveCompletionBudget ?? "Unavailable"}</dd></div>
      <div><dt>Known model maximum</dt><dd>{diagnostics.knownModelMaxCompletionTokens ?? "Unknown"}</dd></div>
      <div><dt>Model</dt><dd>{diagnostics.modelId ?? "Unavailable"}</dd></div>
      <div><dt>Reasoning requested</dt><dd>{diagnostics.reasoningRequested === undefined ? "Unavailable" : diagnostics.reasoningRequested ? "Yes" : "No"}</dd></div>
      <div><dt>Structured output requested</dt><dd>{diagnostics.structuredOutputRequested === undefined ? "Unavailable" : diagnostics.structuredOutputRequested ? "Yes" : "No"}</dd></div>
    </dl>
  );
}

function ContextOptions({
  entries,
  selected,
  onToggle,
}: {
  entries: KnowledgeEntry[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (entries.length === 0) return <p>No matching Compendium entries.</p>;
  return <>{entries.map((entry) => (
    <label key={entry.id}>
      <input
        type="checkbox"
        checked={selected.includes(entry.id)}
        disabled={!selected.includes(entry.id) && selected.length >= 8}
        onChange={() => onToggle(entry.id)}
      />
      <span><strong>{entry.title}</strong><small>{knowledgeAreaLabel(entry.area)} · {entry.statement}</small></span>
    </label>
  ))}</>;
}

export function SpecialistPage({
  workspace,
  onEditKnowledge,
}: {
  workspace: SpecialistWorkspace;
  onEditKnowledge?: (entryId: string) => void;
}) {
  const [profile, setProfile] = useState<SpecialistProfile | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [allKnowledge, setAllKnowledge] = useState<KnowledgeEntry[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [history, setHistory] = useState<SpecialistRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<SpecialistTaskType | "">("");
  const [modelId, setModelId] = useState("");
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([]);
  const [selectedDecisions, setSelectedDecisions] = useState<string[]>([]);
  const [scenario, setScenario] = useState("");
  const [maxCompletionTokens, setMaxCompletionTokens] = useState("");
  const [result, setResult] = useState<SpecialistAnalysisResult | null>(null);
  const [resultScenario, setResultScenario] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(true);
  const [isDecisionsLoading, setIsDecisionsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isRecoveringHistory, setIsRecoveringHistory] = useState(false);
  const [confirmHistoryRecovery, setConfirmHistoryRecovery] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<SpecialistError | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<SpecialistError | null>(null);
  const [modelLoadError, setModelLoadError] = useState<SpecialistError | null>(null);
  const [knowledgeLoadError, setKnowledgeLoadError] = useState<SpecialistError | null>(null);
  const [decisionsLoadError, setDecisionsLoadError] = useState<SpecialistError | null>(null);
  const [historyError, setHistoryError] = useState<SpecialistError | null>(null);
  const [historyRecoveryNotice, setHistoryRecoveryNotice] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);
  const [promotionDrafts, setPromotionDrafts] = useState<PromotionDraft[]>([]);
  const [promotionError, setPromotionError] = useState<SpecialistError | null>(null);
  const [promotionNotice, setPromotionNotice] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  const selectedModel = useMemo(() => models.find((model) => model.modelId === modelId), [modelId, models]);
  const guidance = useMemo(
    () => profile?.taskGuidance.find((item) => item.taskType === taskType),
    [profile, taskType],
  );
  const preferredBudget = guidance?.preferredCompletionTokens;
  const knownModelMax = selectedModel?.capabilities?.maxCompletionTokens;
  const defaultEffectiveBudget = preferredBudget === undefined
    ? undefined
    : Math.min(preferredBudget, knownModelMax ?? preferredBudget);
  const globalBudgetMax = profile?.maxRunCompletionTokens ?? 8192;
  const allowedBudgetMax = Math.min(globalBudgetMax, knownModelMax ?? globalBudgetMax);
  const parsedBudget = maxCompletionTokens.length === 0 && defaultEffectiveBudget !== undefined
    ? defaultEffectiveBudget
    : Number(maxCompletionTokens);
  const budgetError = maxCompletionTokens.length === 0
    ? defaultEffectiveBudget === undefined ? "Enter a completion budget." : null
    : !Number.isInteger(parsedBudget) || parsedBudget < 1
      ? "Completion budget must be a positive whole number."
      : parsedBudget > globalBudgetMax
        ? `Completion budget cannot exceed ForgeMind's ${globalBudgetMax}-token safety bound.`
        : knownModelMax !== undefined && parsedBudget > knownModelMax
          ? `Completion budget cannot exceed this model's known ${knownModelMax}-token maximum.`
          : null;
  const recommendedAreas = guidance?.recommendedCompendiumAreas ?? [];
  const recommendedKnowledge = useMemo(
    () => knowledge.filter((entry) => recommendedAreas.includes(entry.area)),
    [knowledge, recommendedAreas],
  );
  const recommendedKnowledgeIds = useMemo(
    () => new Set(recommendedKnowledge.map((entry) => entry.id)),
    [recommendedKnowledge],
  );
  const otherKnowledgeGroups = useMemo(() => KNOWLEDGE_AREAS
    .map(([area, label]) => ({
      area,
      label,
      entries: knowledge.filter((entry) => entry.area === area && !recommendedKnowledgeIds.has(entry.id)),
    })), [knowledge, recommendedKnowledgeIds]);
  const sortedDecisions = useMemo(() => {
    const preferred = guidance?.preferredDecisionAreas ?? [];
    return [...decisions].sort((left, right) => {
      const leftRank = preferred.includes(left.area) ? preferred.indexOf(left.area) : preferred.length;
      const rightRank = preferred.includes(right.area) ? preferred.indexOf(right.area) : preferred.length;
      return leftRank - rightRank || left.title.localeCompare(right.title);
    });
  }, [decisions, guidance]);
  const selectedRun = history.find((run) => run.id === selectedRunId) ?? null;
  const displayedResult = selectedRun ? historyResultView(selectedRun) : result ? currentResultView(result, selectedModel, resultScenario) : null;
  const selectableFindings = useMemo<SelectableFinding[]>(() => {
    if (!selectedRun?.result) return [];
    const groups: Array<[string, string[]]> = [
      ["Summary", [selectedRun.result.summary]],
      ["Assumption", selectedRun.result.assumptions],
      ["Recommendation", selectedRun.result.recommendations],
      ["Risk", selectedRun.result.risks],
      ["Likely Exploit", selectedRun.result.exploits],
      ["Open Question", selectedRun.result.openQuestions],
      ["Suggested Test", selectedRun.result.suggestedTests],
    ];
    return groups.flatMap(([section, items]) => items.map((text, index) => ({ id: `${section}:${index}`, section, text })));
  }, [selectedRun]);

  async function refreshHistory(selectNewest = false) {
    setIsHistoryLoading(true);
    try {
      const document = await loadSpecialistRuns(workspace.path);
      const runs = [...(document?.runs ?? [])].reverse();
      setHistory(runs);
      setHistoryError(null);
      if (selectNewest) setSelectedRunId(runs[0]?.id ?? null);
      return runs;
    } catch (loadError) {
      setHistoryError(errorDetails(loadError));
      return [];
    } finally {
      setIsHistoryLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    loadSpecialistProfiles().then((profiles) => {
      if (!active) return;
      const behaviorProfile = profiles.find((candidate) => candidate.id === "ai_behavior_designer") ?? null;
      setProfile(behaviorProfile);
      setTaskType(behaviorProfile?.defaultTaskType ?? "");
      setProfileLoadError(null);
    }).catch((loadError) => { if (active) setProfileLoadError(errorDetails(loadError)); })
      .finally(() => { if (active) setIsProfileLoading(false); });

    loadModelRegistry().then((registry) => {
      if (!active) return;
      const enabledModels = registry.filter((model) => model.enabled);
      setModels(enabledModels);
      setModelId(enabledModels[0]?.modelId ?? "");
      setModelLoadError(null);
    }).catch((loadError) => { if (active) setModelLoadError(errorDetails(loadError)); })
      .finally(() => { if (active) setIsModelLoading(false); });

    loadCompendium(workspace.path).then((compendium) => {
      if (!active) return;
      setAllKnowledge(compendium?.entries ?? []);
      setKnowledge(compendium?.entries.filter((entry) => entry.status !== "DEPRECATED") ?? []);
      setKnowledgeLoadError(null);
    }).catch((loadError) => { if (active) setKnowledgeLoadError(errorDetails(loadError)); })
      .finally(() => { if (active) setIsKnowledgeLoading(false); });

    loadDecisions(workspace.path).then((document) => {
      if (!active) return;
      setDecisions(document?.decisions.filter((decision) => decision.status === "APPROVED") ?? []);
      setDecisionsLoadError(null);
    }).catch((loadError) => { if (active) setDecisionsLoadError(errorDetails(loadError)); })
      .finally(() => { if (active) setIsDecisionsLoading(false); });

    loadSpecialistRuns(workspace.path).then((document) => {
      if (!active) return;
      const runs = [...(document?.runs ?? [])].reverse();
      setHistory(runs);
      setSelectedRunId(runs[0]?.id ?? null);
      setHistoryError(null);
    }).catch((loadError) => { if (active) setHistoryError(errorDetails(loadError)); })
      .finally(() => { if (active) setIsHistoryLoading(false); });

    return () => { active = false; };
  }, [workspace.path]);

  useEffect(() => {
    if (!isRunning) {
      setElapsedSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (!copyFeedback) return undefined;
    const timer = window.setTimeout(() => setCopyFeedback(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);

  useEffect(() => {
    setSelectedFindingIds([]);
    setPromotionDrafts([]);
    setPromotionError(null);
  }, [selectedRunId]);

  useEffect(() => {
    if (defaultEffectiveBudget !== undefined) setMaxCompletionTokens(String(defaultEffectiveBudget));
  }, [defaultEffectiveBudget]);

  function toggle(id: string, selected: string[], update: (ids: string[]) => void) {
    update(selected.includes(id) ? selected.filter((candidate) => candidate !== id) : [...selected, id]);
  }

  function selectRecommendedContext() {
    const recommendedIds = recommendedKnowledge.map((entry) => entry.id);
    setSelectedKnowledge((current) => [...current, ...recommendedIds.filter((id) => !current.includes(id))].slice(0, 8));
  }

  async function executeAnalysis(completionBudget: number) {
    if (isRunning || !profile || !taskType || !selectedModel || !Number.isInteger(completionBudget)
      || completionBudget < 1 || completionBudget > allowedBudgetMax) return;
    setIsRunning(true);
    setError(null);
    setResult(null);
    setResultScenario("");
    setSelectedRunId(null);
    setCopyFeedback(null);
    setPromotionNotice(null);
    setHistoryRecoveryNotice(null);
    const submittedScenario = scenario.trim();
    try {
      const nextResult = await runSpecialistAnalysis({
        rootPath: workspace.path,
        projectId: workspace.projectId,
        profileId: profile.id,
        taskType,
        modelId: selectedModel.modelId,
        knowledgeEntryIds: selectedKnowledge,
        decisionIds: selectedDecisions,
        maxCompletionTokens: completionBudget,
        scenario: submittedScenario,
      });
      setResult(nextResult);
      setResultScenario(submittedScenario);
      if (nextResult.historyWarning) {
        setHistoryError(nextResult.historyWarning);
      } else {
        setScenario("");
        await refreshHistory(true);
      }
    } catch (runError) {
      setError(errorDetails(runError));
      await refreshHistory(true);
    } finally {
      setIsRunning(false);
    }
  }

  async function copyText(text: string, feedbackKey: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback({ key: feedbackKey, succeeded: true });
    } catch {
      setCopyFeedback({ key: feedbackKey, succeeded: false });
    }
  }

  function defaultPromotionArea(): KnowledgeArea {
    if (!selectedRun) return "overview";
    return selectedRun.selectedKnowledgeEntryIds
      .map((id) => knowledge.find((entry) => entry.id === id)?.area)
      .find((area): area is KnowledgeArea => Boolean(area))
      ?? selectedRun.selectedDecisionIds
        .map((id) => decisions.find((decision) => decision.id === id)?.area)
        .find((area): area is KnowledgeArea => Boolean(area))
      ?? "overview";
  }

  function toggleFinding(finding: SelectableFinding) {
    setSelectedFindingIds((current) => current.includes(finding.id)
      ? current.filter((id) => id !== finding.id)
      : [...current, finding.id]);
  }

  function beginPromotionReview(findings: SelectableFinding[]) {
    if (!selectedRun || selectedRun.status !== "SUCCEEDED") return;
    const relatedArea = defaultPromotionArea();
    setPromotionDrafts(findings.filter((finding) => selectedFindingIds.includes(finding.id)).map((finding) => ({
      id: finding.id,
      section: finding.section,
      specialistRunId: selectedRun.id,
      sourceFinding: finding.text,
      area: relatedArea,
      title: `${selectedRun.taskType}: ${finding.section}`.slice(0, 120),
      statement: finding.text,
      status: "DIRECTION",
    })));
    setPromotionError(null);
    setPromotionNotice(null);
  }

  function updatePromotionDraft(id: string, update: Partial<PromotionDraft>) {
    setPromotionDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...update } : draft));
    setPromotionError(null);
  }

  function normalizedTitle(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function matchingTitle(draft: PromotionDraft): KnowledgeEntry | undefined {
    const normalized = normalizedTitle(draft.title);
    return normalized.length === 0 ? undefined : allKnowledge.find((entry) => normalizedTitle(entry.title) === normalized);
  }

  function isExactDuplicate(draft: PromotionDraft): boolean {
    return allKnowledge.some((entry) => entry.title === draft.title.trim() && entry.statement === draft.statement.trim());
  }

  async function confirmPromotion(event?: FormEvent) {
    event?.preventDefault();
    if (promotionDrafts.length === 0 || isPromoting || promotionDrafts.some(isExactDuplicate)) return;
    setIsPromoting(true);
    setPromotionError(null);
    try {
      let nextKnowledge = knowledge;
      for (const draft of promotionDrafts) {
        const document = await promoteSpecialistFinding(workspace.path, workspace.projectId, draft);
        setAllKnowledge(document.entries);
        nextKnowledge = document.entries.filter((entry) => entry.status !== "DEPRECATED");
      }
      setKnowledge(nextKnowledge);
      const promotedCount = promotionDrafts.length;
      setPromotionDrafts([]);
      setSelectedFindingIds([]);
      setPromotionNotice(`${promotedCount} ${promotedCount === 1 ? "finding" : "findings"} added to the Game Compendium and Game Wiki.`);
    } catch (saveError) {
      setPromotionError(errorDetails(saveError));
    } finally {
      setIsPromoting(false);
    }
  }

  function resultMarkdown(view: ResultView): string {
    return formatSpecialistResultMarkdown({
      taskType: view.taskType,
      result: view.result,
      scenario: view.scenario,
      model: view.model,
      timestamp: view.timestamp,
      compendiumReferences: view.selectedKnowledgeEntryIds.map((id) => knowledge.find((entry) => entry.id === id)?.title ?? id),
      decisionReferences: view.selectedDecisionIds.map((id) => decisions.find((decision) => decision.id === id)?.title ?? id),
      usage: view.usage,
      effectiveCompletionBudget: view.effectiveCompletionBudget,
    });
  }

  function diagnosticsMarkdown(run: SpecialistRun): string {
    return formatSpecialistDiagnosticsMarkdown({
      taskType: run.taskType,
      scenario: run.scenario,
      model: run.modelId,
      timestamp: run.createdAt,
      errorCode: run.safeError?.code ?? "SPECIALIST_ANALYSIS_FAILED",
      diagnostics: run.safeError?.diagnostics,
      compendiumReferences: run.selectedKnowledgeEntryIds.map((id) => knowledge.find((entry) => entry.id === id)?.title ?? id),
      decisionReferences: run.selectedDecisionIds.map((id) => decisions.find((decision) => decision.id === id)?.title ?? id),
      usage: run.usage,
      effectiveCompletionBudget: run.effectiveCompletionBudget,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (budgetError) return;
    await executeAnalysis(parsedBudget);
  }

  const retryBudget = error?.code === "OUTPUT_TRUNCATED"
    && error.diagnostics?.knownModelMaxCompletionTokens !== undefined
    && error.diagnostics.effectiveCompletionBudget !== undefined
    ? Math.min(
      error.diagnostics.knownModelMaxCompletionTokens,
      globalBudgetMax,
      Math.max(
        error.diagnostics.effectiveCompletionBudget + 512,
        error.diagnostics.preferredTaskBudget ?? error.diagnostics.effectiveCompletionBudget,
      ),
    )
    : undefined;
  const canRetryWithSuggestedBudget = retryBudget !== undefined
    && retryBudget > (error?.diagnostics?.effectiveCompletionBudget ?? retryBudget)
    && retryBudget <= globalBudgetMax;

  async function recoverHistory() {
    if (isRecoveringHistory) return;
    setIsRecoveringHistory(true);
    try {
      const recovery = await archiveAndResetSpecialistHistory(workspace.path);
      setHistory([...recovery.document.runs].reverse());
      setSelectedRunId(null);
      setHistoryError(null);
      setConfirmHistoryRecovery(false);
      setHistoryRecoveryNotice(recovery.archivedFileName
        ? `Invalid history was archived as ${recovery.archivedFileName}.`
        : "A new empty analysis history was created.");
    } catch (recoveryError) {
      setHistoryError(errorDetails(recoveryError));
    } finally {
      setIsRecoveringHistory(false);
    }
  }

  if (isProfileLoading || isModelLoading) return <section className="specialist-card"><p className="scope-note">Loading specialist workspace…</p></section>;

  return (
    <div className="specialist-workbench">
      <section className="specialist-card specialist-config-pane" data-layout-share="34" data-workbench-column="configuration" aria-labelledby="specialist-title">
        <span className="section-label">Project-brain specialist profile</span>
        <h2 id="specialist-title">{profile?.displayName ?? "AI Behavior Designer"}</h2>
        <p className="scope-note">{profile?.description ?? "This specialist profile is unavailable."}</p>
        <p className="scope-note">Every run is explicit. Selected project knowledge is evidence; the result is a non-authoritative AI proposal.</p>
        {profileLoadError ? <p className="specialist-inline-warning" role="alert">Profile unavailable: {profileLoadError.code}</p> : null}
        {modelLoadError ? <p className="specialist-inline-warning" role="alert">Model registry unavailable: {modelLoadError.code}</p> : null}

        <form className="specialist-form" onSubmit={(event) => void submit(event)}>
          <div className="specialist-controls">
            <label>
              Task Type
              <select value={taskType} required onChange={(event) => setTaskType(event.target.value as SpecialistTaskType)}>
                {profile?.supportedTaskTypes.map((task) => <option key={task} value={task}>{task}</option>)}
              </select>
            </label>
            <label>
              Model
              <select value={modelId} required disabled={models.length === 0} onChange={(event) => setModelId(event.target.value)}>
                {models.length === 0 ? <option value="">No configured models</option> : null}
                {models.map((model) => <option key={model.modelId} value={model.modelId}>{model.displayName}</option>)}
              </select>
            </label>
          </div>

          <fieldset className="specialist-context">
            <legend>Project Context</legend>
            <div className="specialist-context-actions" aria-label="Project Context actions">
              <button
                type="button"
                disabled={recommendedKnowledge.length === 0 || recommendedKnowledge.every((entry) => selectedKnowledge.includes(entry.id)) || selectedKnowledge.length >= 8}
                onClick={selectRecommendedContext}
              >Select recommended</button>
              <button type="button" disabled={selectedKnowledge.length === 0} onClick={() => setSelectedKnowledge([])}>Deselect all</button>
            </div>
            {isKnowledgeLoading ? <p>Loading Compendium context…</p> : null}
            {knowledgeLoadError ? <p className="specialist-inline-warning" role="alert">Compendium context unavailable: {knowledgeLoadError.code}</p> : null}
            <section className="specialist-context-recommended" aria-label={`Recommended for ${taskType || "this task"}`}>
              <h3>Recommended for {taskType || "this task"}</h3>
              <p>Deterministic Area guidance: {recommendedAreas.map(knowledgeAreaLabel).join(", ") || "none"}. Selection remains optional.</p>
              <ContextOptions entries={recommendedKnowledge} selected={selectedKnowledge} onToggle={(id) => toggle(id, selectedKnowledge, setSelectedKnowledge)} />
            </section>
            <h3 className="specialist-context-more-heading">More project context</h3>
            <div className="specialist-context-areas">
              {otherKnowledgeGroups.map((group) => {
                const selectedCount = group.entries.filter((entry) => selectedKnowledge.includes(entry.id)).length;
                const entryLabel = `${group.entries.length} ${group.entries.length === 1 ? "entry" : "entries"}`;
                if (group.entries.length === 0) {
                  return <div className="specialist-context-area specialist-context-area-empty" key={group.area} aria-disabled="true">{group.label} · {entryLabel}</div>;
                }
                return (
                  <details className="specialist-context-area" key={group.area} open={selectedCount > 0 || undefined}>
                    <summary>{group.label} · {entryLabel}{selectedCount > 0 ? ` · ${selectedCount} selected` : ""}</summary>
                    <div aria-label={`${group.label} context`}>
                      <ContextOptions entries={group.entries} selected={selectedKnowledge} onToggle={(id) => toggle(id, selectedKnowledge, setSelectedKnowledge)} />
                    </div>
                  </details>
                );
              })}
            </div>
            <small>{selectedKnowledge.length}/8 Compendium entries selected</small>
          </fieldset>

          {decisionsLoadError ? (
            <fieldset className="specialist-context">
              <legend>Approved Decision Context</legend>
              <p className="specialist-inline-warning" role="alert">Approved Decisions unavailable: {decisionsLoadError.code}</p>
            </fieldset>
          ) : decisions.length > 0 ? (
            <fieldset className="specialist-context specialist-decisions">
              <legend>Approved Decision Context</legend>
              <div className="specialist-context-actions specialist-decision-actions" aria-label="Approved Decision Context actions">
                <button type="button" disabled={selectedDecisions.length === 0} onClick={() => setSelectedDecisions([])}>Deselect all</button>
              </div>
              <details>
                <summary>Related approved decisions · {selectedDecisions.length} selected · {decisions.length} available</summary>
                <p>Preferred areas: {(guidance?.preferredDecisionAreas ?? []).map(knowledgeAreaLabel).join(", ") || "none"}. You can override these suggestions.</p>
                {sortedDecisions.map((decision) => (
                  <label key={decision.id}>
                    <input
                      type="checkbox"
                      checked={selectedDecisions.includes(decision.id)}
                      disabled={!selectedDecisions.includes(decision.id) && selectedDecisions.length >= 6}
                      onChange={() => toggle(decision.id, selectedDecisions, setSelectedDecisions)}
                    />
                    <span><strong>{decision.title}</strong><small>{knowledgeAreaLabel(decision.area)} · {decision.statement}</small></span>
                  </label>
                ))}
              </details>
              {selectedDecisions.length > 0 ? <p className="specialist-selected-summary">Selected: {selectedDecisions.map((id) => decisions.find((item) => item.id === id)?.title ?? id).join(", ")}</p> : null}
            </fieldset>
          ) : isDecisionsLoading ? <p className="scope-note">Loading approved Decisions…</p> : null}

          <details className="specialist-advanced-settings">
            <summary>Advanced Run Settings</summary>
            <label>
              Max completion tokens
              <input
                aria-describedby="specialist-budget-guidance specialist-budget-error"
                type="number"
                min={1}
                max={allowedBudgetMax}
                step={1}
                value={maxCompletionTokens}
                onChange={(event) => setMaxCompletionTokens(event.target.value)}
              />
            </label>
            <p id="specialist-budget-guidance" className="scope-note">
              Preferred for {taskType || "this task"}: {preferredBudget ?? "Unavailable"} · Model limit: {knownModelMax ?? "Unknown"} · Effective for this run: {budgetError ? "Invalid" : parsedBudget}
            </p>
            {budgetError ? <p id="specialist-budget-error" className="specialist-inline-warning" role="alert">{budgetError}</p> : null}
          </details>
          {preferredBudget !== undefined && knownModelMax !== undefined && preferredBudget > knownModelMax ? (
            <p className="specialist-inline-warning" role="status">
              This task prefers {preferredBudget} tokens, but the selected model's known maximum is {knownModelMax}. ForgeMind will use {knownModelMax}.
            </p>
          ) : null}

          <label>
            Scenario / Question
            <textarea required maxLength={4000} rows={6} value={scenario} onChange={(event) => setScenario(event.target.value)} />
            <small>Saved with this specialist run · {scenario.length}/4000 characters</small>
          </label>
          <div className="specialist-run-action">
            <button className="primary-button" type="submit" disabled={isRunning || !profile || !taskType || !selectedModel || scenario.trim().length === 0 || Boolean(budgetError)}>Run Analysis</button>
            {isRunning ? <span className="specialist-running-state" role="status"><span className="specialist-spinner specialist-spinner-small" aria-hidden="true" />Running Analysis… {elapsedSeconds}s</span> : null}
          </div>
        </form>
      </section>

      <section className="specialist-output-pane" data-layout-share="60" aria-label="Specialist output and history">
        {!isRunning && selectedRun ? (
          <section className="specialist-card specialist-run-detail" data-workbench-column="selected-run-detail" aria-label="Selected historical run">
            <div className="specialist-run-detail-heading">
              <span className="section-label">Saved {selectedRun.status.toLowerCase()} run · non-authoritative history</span>
              <CopyAction
                label={displayedResult ? "Copy Result as Markdown" : "Copy Run Diagnostics as Markdown"}
                feedbackKey={`run-${selectedRun.id}`}
                feedback={copyFeedback}
                onCopy={() => void copyText(displayedResult ? resultMarkdown(displayedResult) : diagnosticsMarkdown(selectedRun), `run-${selectedRun.id}`)}
              />
            </div>
            <dl className="result-metadata" aria-label="Historical run summary">
              <div><dt>Task Type</dt><dd>{selectedRun.taskType}</dd></div>
              <div><dt>Timestamp</dt><dd>{new Date(selectedRun.createdAt).toLocaleString()}</dd></div>
              <div><dt>Model</dt><dd>{selectedRun.modelId}</dd></div>
            </dl>
            <section className="specialist-saved-context" aria-label="Selected Project Context">
              <h3>Selected Project Context</h3>
              {selectedRun.selectedKnowledgeEntryIds.length > 0 ? <ul>{selectedRun.selectedKnowledgeEntryIds.map((id) => <li key={id}>{knowledge.find((entry) => entry.id === id)?.title ?? id}</li>)}</ul> : <p>None selected.</p>}
            </section>
            <section className="specialist-saved-context" aria-label="Selected Approved Decisions">
              <h3>Selected Approved Decisions</h3>
              {selectedRun.selectedDecisionIds.length > 0 ? <ul>{selectedRun.selectedDecisionIds.map((id) => <li key={id}>{decisions.find((decision) => decision.id === id)?.title ?? id}</li>)}</ul> : <p>None selected.</p>}
            </section>
            <ScenarioPanel scenario={selectedRun.scenario} feedbackKey={`scenario-${selectedRun.id}`} feedback={copyFeedback} onCopy={(text, key) => void copyText(text, key)} />
          </section>
        ) : null}

        {!isRunning && !selectedRun && displayedResult ? (
          <section className="specialist-card specialist-current-run-scenario" aria-label="Current run scenario">
            <span className="section-label">Current run</span>
            <ScenarioPanel scenario={displayedResult.scenario} feedbackKey="current-scenario" feedback={copyFeedback} onCopy={(text, key) => void copyText(text, key)} />
          </section>
        ) : null}

        {promotionNotice ? <p className="knowledge-notice" role="status">{promotionNotice}</p> : null}

        {!isRunning && error && !selectedRun ? (
          <section className="specialist-error" role="alert">
            <strong>{error.code}</strong>
            <p>{error.message}</p>
            {error.code === "INVALID_REQUEST" ? (
              <p>{error.diagnostics?.rejectedParameter === "max_completion_tokens"
                ? "The selected model or provider rejected the requested completion budget. Choose a supported budget and run again explicitly."
                : "The provider rejected the request but did not identify a rejected parameter. Review the safe diagnostics before changing settings."}</p>
            ) : null}
            {error.code === "OUTPUT_TRUNCATED" ? (
              <div className="specialist-error-guidance">
                <p>The model exhausted the effective completion budget before returning a complete result. No retry was performed.</p>
                <p>Review the effective budget and model limit below.</p>
                <ul>
                  <li>Retry with a larger budget when the selected model supports it.</li>
                  <li>Reduce context or task scope.</li>
                  <li>Try another compatible configured model.</li>
                </ul>
                {canRetryWithSuggestedBudget ? (
                  <button type="button" disabled={isRunning} onClick={() => {
                    setMaxCompletionTokens(String(retryBudget));
                    void executeAnalysis(retryBudget!);
                  }}>Retry with suggested budget ({retryBudget})</button>
                ) : null}
              </div>
            ) : null}
            <Diagnostics diagnostics={error.diagnostics} />
          </section>
        ) : null}

        {!isRunning && selectedRun?.status === "FAILED" ? (
          <section className="specialist-error" role="alert">
            <h2>Analysis failed</h2>
            <strong>{selectedRun.safeError?.code ?? "SPECIALIST_ANALYSIS_FAILED"}</strong>
            <Diagnostics diagnostics={selectedRun.safeError?.diagnostics} />
          </section>
        ) : null}

        {!isRunning && displayedResult ? (
          <section className="specialist-card specialist-result" data-workbench-column="selected-run-detail" aria-labelledby="specialist-result-title">
            <span className="section-label">AI-generated proposal · non-authoritative</span>
            <div className="specialist-result-heading">
              <h2 id="specialist-result-title">Analysis Result</h2>
              {!selectedRun ? <CopyAction label="Copy Result as Markdown" feedbackKey="current-result" feedback={copyFeedback} onCopy={() => void copyText(resultMarkdown(displayedResult), "current-result")} /> : null}
            </div>
            <div className="specialist-result-summary">
              {selectedRun ? (
                <label className="specialist-finding-choice">
                  <input type="checkbox" checked={selectedFindingIds.includes("Summary:0")} onChange={() => toggleFinding({ id: "Summary:0", section: "Summary", text: displayedResult.result.summary })} />
                  <span>{displayedResult.result.summary}</span>
                </label>
              ) : <p>{displayedResult.result.summary}</p>}
            </div>
            <ResultList title="Assumptions — not project facts" items={displayedResult.result.assumptions} className="specialist-assumptions" findingPrefix="Assumption" selectedFindingIds={selectedFindingIds} onToggleFinding={selectedRun ? toggleFinding : undefined} />
            <ResultList title="Recommendations" items={displayedResult.result.recommendations} findingPrefix="Recommendation" selectedFindingIds={selectedFindingIds} onToggleFinding={selectedRun ? toggleFinding : undefined} />
            <ResultList title="Risks" items={displayedResult.result.risks} findingPrefix="Risk" selectedFindingIds={selectedFindingIds} onToggleFinding={selectedRun ? toggleFinding : undefined} />
            <ResultList title="Likely Exploits" items={displayedResult.result.exploits} findingPrefix="Likely Exploit" selectedFindingIds={selectedFindingIds} onToggleFinding={selectedRun ? toggleFinding : undefined} />
            <ResultList title="Open Questions" items={displayedResult.result.openQuestions} findingPrefix="Open Question" selectedFindingIds={selectedFindingIds} onToggleFinding={selectedRun ? toggleFinding : undefined} />
            <ResultList title="Suggested Tests" items={displayedResult.result.suggestedTests} findingPrefix="Suggested Test" selectedFindingIds={selectedFindingIds} onToggleFinding={selectedRun ? toggleFinding : undefined} />

            {selectedRun ? (
              <div className="specialist-promotion-action" aria-label="Finding selection">
                <strong>{selectedFindingIds.length} selected</strong>
                <button className="primary-button" type="button" disabled={selectedFindingIds.length === 0} onClick={() => beginPromotionReview(selectableFindings)}>Add to Project Knowledge</button>
              </div>
            ) : null}

            <section className="specialist-evidence" aria-label="Context used">
              <h3>Context used</h3>
              <p>User scenario plus only these explicitly selected project references:</p>
              {displayedResult.selectedKnowledgeEntryIds.length === 0 && displayedResult.selectedDecisionIds.length === 0 ? <p>No project references selected.</p> : (
                <ul>
                  {displayedResult.selectedKnowledgeEntryIds.map((id) => <li key={id}>Compendium: {knowledge.find((entry) => entry.id === id)?.title ?? id}</li>)}
                  {displayedResult.selectedDecisionIds.map((id) => <li key={id}>Approved Decision: {decisions.find((decision) => decision.id === id)?.title ?? id}</li>)}
                </ul>
              )}
            </section>
            <dl className="result-metadata" aria-label="Specialist usage">
              <div><dt>Task</dt><dd>{displayedResult.taskType}</dd></div>
              <div><dt>Model</dt><dd>{displayedResult.model}</dd></div>
              <div><dt>Latency</dt><dd>{displayedResult.usage.latencyMs === undefined ? "Not provided" : `${displayedResult.usage.latencyMs} ms`}</dd></div>
              <div><dt>Input tokens</dt><dd>{usage(displayedResult.usage.inputTokens)}</dd></div>
              <div><dt>Output tokens</dt><dd>{usage(displayedResult.usage.outputTokens)}</dd></div>
              <div><dt>Total tokens</dt><dd>{usage(displayedResult.usage.totalTokens)}</dd></div>
              <div><dt>Estimated cost</dt><dd>{estimatedCost(displayedResult.usage.estimatedCostUsd)}</dd></div>
              <div><dt>Preferred task budget</dt><dd>{displayedResult.preferredTaskBudget ?? "Unavailable"}</dd></div>
              <div><dt>Effective completion budget</dt><dd>{displayedResult.effectiveCompletionBudget ?? "Unavailable"}</dd></div>
              <div><dt>Known model maximum</dt><dd>{displayedResult.knownModelMaxCompletionTokens ?? "Unknown"}</dd></div>
            </dl>
          </section>
        ) : null}

        {!isRunning && !displayedResult && !error && !selectedRun ? (
          <section className="specialist-card specialist-empty-result">
            <h2>Analysis workspace</h2>
            <p>Configure a task and run the specialist, or select a prior run from history.</p>
          </section>
        ) : null}

        <section className="specialist-card specialist-history" data-workbench-column="analysis-history" aria-labelledby="specialist-history-title">
          <span className="section-label">Non-authoritative work artifact</span>
          <h2 id="specialist-history-title">Analysis History</h2>
          <p className="scope-note">Saved results are reviewable workbench output, not durable project truth.</p>
          {historyRecoveryNotice ? <p className="specialist-recovery-notice" role="status">{historyRecoveryNotice}</p> : null}
          {isHistoryLoading ? <p>Loading analysis history…</p> : null}
          {historyError ? (
            <div className="specialist-history-warning" role="alert">
              <strong>Analysis history could not be loaded.</strong>
              <p>{historyError.code}</p>
              <p>{historyError.message}</p>
              {historyError.code === "INVALID_SPECIALIST_HISTORY" || historyError.code === "SPECIALIST_HISTORY_RECOVERY_FAILED" ? (
                confirmHistoryRecovery ? (
                  <div className="specialist-recovery-actions">
                    <p>This archives or replaces only `.forgemind/specialist-runs.json`. Other project data is not changed.</p>
                    <button className="danger-button" type="button" disabled={isRecoveringHistory} onClick={() => void recoverHistory()}>
                      {isRecoveringHistory ? "Recovering…" : "Confirm archive and reset"}
                    </button>
                    <button type="button" disabled={isRecoveringHistory} onClick={() => setConfirmHistoryRecovery(false)}>Cancel</button>
                  </div>
                ) : <button type="button" onClick={() => setConfirmHistoryRecovery(true)}>Archive and reset history</button>
              ) : null}
            </div>
          ) : history.length === 0 && !isHistoryLoading ? <p>No specialist runs saved yet.</p> : !historyError ? (
            <ul>
              {history.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    className={run.id === selectedRunId ? "specialist-history-item specialist-history-item-current" : "specialist-history-item"}
                    aria-current={run.id === selectedRunId ? "true" : undefined}
                    onClick={() => { setSelectedRunId(run.id); setResult(null); setError(null); }}
                  >
                    <span className="specialist-history-primary">
                      <strong>{run.taskType}</strong>
                      <span className={`specialist-run-status specialist-run-status-${run.status.toLowerCase()}`}>{run.status}</span>
                    </span>
                    <time className="specialist-history-timestamp" dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString()}</time>
                    <span className="specialist-history-model" title={run.modelId}>{run.modelId}</span>
                    <span className="specialist-history-outcome">
                      {run.effectiveCompletionBudget !== undefined
                        ? <small>Effective budget {run.effectiveCompletionBudget}</small>
                        : run.preferredTaskBudget !== undefined ? <small>Budget {run.preferredTaskBudget}</small> : null}
                      <span className={run.status === "FAILED" ? "specialist-history-error" : "specialist-history-summary"} title={run.result?.summary ?? run.safeError?.code ?? "Analysis failed"}>
                        {run.status === "FAILED" ? `Error: ${run.safeError?.code ?? "SPECIALIST_ANALYSIS_FAILED"}` : run.result?.summary ?? "Analysis completed"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </section>

      {promotionDrafts.length > 0 ? (
        <div className="specialist-dialog-backdrop">
          <section className="specialist-promotion-dialog" role="dialog" aria-modal="true" aria-labelledby="promotion-dialog-title">
            <form aria-label="Add findings to Project Knowledge" onSubmit={(event) => void confirmPromotion(event)}>
              <header>
                <div>
                  <span className="section-label">Human-reviewed promotion</span>
                  <h2 id="promotion-dialog-title">Add {promotionDrafts.length} {promotionDrafts.length === 1 ? "finding" : "findings"} to Project Knowledge</h2>
                  <p className="scope-note">Creates Compendium knowledge only. It does not create a Decision or modify Analysis History.</p>
                </div>
                <button type="button" aria-label="Close promotion review" disabled={isPromoting} onClick={() => { setPromotionDrafts([]); setPromotionError(null); }}>Close</button>
              </header>

              <div className="specialist-promotion-items">
                {promotionDrafts.map((draft, index) => {
                  const titleMatch = matchingTitle(draft);
                  const exactDuplicate = isExactDuplicate(draft);
                  return (
                    <article className="specialist-promotion-item" key={draft.id} aria-label={`Finding ${index + 1}: ${draft.section}`}>
                      <h3>{index + 1}. {draft.section}</h3>
                      <label>Area
                        <select value={draft.area} onChange={(event) => updatePromotionDraft(draft.id, { area: event.target.value as KnowledgeArea })}>
                          {KNOWLEDGE_AREAS.map(([area, label]) => <option key={area} value={area}>{label}</option>)}
                        </select>
                      </label>
                      <label>Status
                        <select value={draft.status} onChange={(event) => updatePromotionDraft(draft.id, { status: event.target.value as KnowledgeStatus })}>
                          {KNOWLEDGE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                      <label>Title
                        <input required maxLength={120} value={draft.title} onChange={(event) => updatePromotionDraft(draft.id, { title: event.target.value })} />
                      </label>
                      <label>Statement
                        <textarea required maxLength={2000} rows={7} value={draft.statement} onChange={(event) => updatePromotionDraft(draft.id, { statement: event.target.value })} />
                      </label>
                      <dl className="specialist-promotion-metadata">
                        <div><dt>Provenance</dt><dd>AI_INFERRED</dd></div>
                        <div><dt>Source</dt><dd>specialist_analysis</dd></div>
                      </dl>
                      {titleMatch ? (
                        <div className={exactDuplicate ? "specialist-duplicate-warning specialist-exact-duplicate" : "specialist-duplicate-warning"} role="alert">
                          <strong>{exactDuplicate ? "Exact duplicate blocked" : "Potential Duplicate"}</strong>
                          <p>Matches existing title: {titleMatch.title}</p>
                          <div className="specialist-duplicate-actions">
                            <button type="button" disabled={isPromoting} onClick={() => { setPromotionDrafts([]); setPromotionError(null); }}>Cancel</button>
                            {onEditKnowledge ? <button type="button" disabled={isPromoting} onClick={() => onEditKnowledge(titleMatch.id)}>Edit existing</button> : null}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              {promotionError ? <p className="specialist-inline-warning" role="alert">{promotionError.code}: {promotionError.message}</p> : null}
              <footer className="specialist-promotion-footer">
                <span>{promotionDrafts.length} reviewed {promotionDrafts.length === 1 ? "finding" : "findings"}</span>
                <div>
                  <button type="button" disabled={isPromoting} onClick={() => { setPromotionDrafts([]); setPromotionError(null); }}>Cancel</button>
                  <button className="primary-button" type="submit" disabled={isPromoting || promotionDrafts.some(isExactDuplicate)}>
                    {isPromoting ? "Adding..." : promotionDrafts.some((draft) => matchingTitle(draft) && !isExactDuplicate(draft)) ? "Save anyway" : `Add ${promotionDrafts.length} to Project Knowledge`}
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
