import type { AlignmentStatus } from "./alignment";
import type { DecisionStatus } from "./decisions";
import type { FeatureContractStatus } from "./featureContracts";
import {
  foundationGaps,
  repositoryConnectionState,
  unityConnectionState,
  type RecommendationProjectState,
} from "./recommendedNextSteps";

export type OverviewSignalTone = "CALM" | "ATTENTION" | "DANGER" | "NEUTRAL";

export interface OverviewSignal {
  label: string;
  value: string;
  detail: string;
  tone: OverviewSignalTone;
}

export interface ProjectOverviewModel {
  descriptor: string | null;
  foundation: OverviewSignal & { gaps: string[] };
  decisions: OverviewSignal & { counts: Record<DecisionStatus, number> };
  openQuestions: OverviewSignal & { unresolved: number };
  repository: OverviewSignal;
  unity: OverviewSignal;
  alignment: OverviewSignal & { counts: Record<AlignmentStatus, number> };
  featureContracts: OverviewSignal & { counts: Record<FeatureContractStatus, number>; archived: number };
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function emptyDecisionCounts(): Record<DecisionStatus, number> {
  return { PROPOSED: 0, APPROVED: 0, SUPERSEDED: 0, DEPRECATED: 0 };
}

function emptyAlignmentCounts(): Record<AlignmentStatus, number> {
  return { ALIGNED: 0, UNVERIFIED: 0, OUT_OF_SYNC: 0, CONFLICT: 0 };
}

function emptyContractCounts(): Record<FeatureContractStatus, number> {
  return { DRAFT: 0, APPROVED: 0, SUPERSEDED: 0, DEPRECATED: 0 };
}

function projectDescriptor(state: RecommendationProjectState): string | null {
  return state.compendium?.entries.find((entry) =>
    entry.area === "game_vision"
    && entry.status !== "DEPRECATED"
    && !entry.title.toLocaleLowerCase().startsWith("design pillar:")
    && entry.statement.trim().length > 0
  )?.statement.trim() ?? null;
}

function foundationSignal(state: RecommendationProjectState): ProjectOverviewModel["foundation"] {
  if (state.compendium === undefined) {
    return { label: "Foundation", value: "Unavailable", detail: "Foundation knowledge could not be read.", tone: "NEUTRAL", gaps: [] };
  }
  const gaps = foundationGaps(state.compendium ?? null);
  return gaps.length === 0
    ? { label: "Foundation", value: "Complete", detail: "Vision, Core Loop, Player Experience, and Design Pillars are present.", tone: "CALM", gaps }
    : { label: "Foundation", value: "Needs attention", detail: `Missing ${gaps.join(", ")}.`, tone: "ATTENTION", gaps };
}

function decisionSignal(state: RecommendationProjectState): ProjectOverviewModel["decisions"] {
  const counts = emptyDecisionCounts();
  if (state.decisions === undefined) {
    return { label: "Decisions", value: "Unavailable", detail: "Decision state could not be read.", tone: "NEUTRAL", counts };
  }
  for (const decision of state.decisions?.decisions ?? []) counts[decision.status] += 1;
  const value = counts.PROPOSED > 0 ? `${countLabel(counts.PROPOSED, "proposed")} pending review` : "No pending review";
  const detail = counts.APPROVED > 0 ? `${countLabel(counts.APPROVED, "approved Decision")}.` : "No approved Decisions yet.";
  return { label: "Decisions", value, detail, tone: counts.PROPOSED > 0 ? "ATTENTION" : "CALM", counts };
}

function openQuestionSignal(state: RecommendationProjectState): ProjectOverviewModel["openQuestions"] {
  if (state.compendium === undefined) {
    return { label: "Open Questions", value: "Unavailable", detail: "Project questions could not be read.", tone: "NEUTRAL", unresolved: 0 };
  }
  const unresolved = state.compendium?.entries.filter((entry) =>
    entry.area === "open_questions" && entry.status === "TBD" && entry.statement.trim().length > 0
  ).length ?? 0;
  return unresolved > 0
    ? { label: "Open Questions", value: countLabel(unresolved, "unresolved question"), detail: "Questions remain in the Compendium until explicitly resolved.", tone: "ATTENTION", unresolved }
    : { label: "Open Questions", value: "None unresolved", detail: "No meaningful unresolved Compendium questions were found.", tone: "CALM", unresolved };
}

function repositorySignal(state: RecommendationProjectState): OverviewSignal {
  switch (repositoryConnectionState(state.repositoryReality)) {
    case "CONNECTED":
      return { label: "Repository", value: "Connected", detail: "Repository evidence is available from the latest explicit inspection.", tone: "CALM" };
    case "NOT_CONNECTED":
      return { label: "Repository", value: "Not connected", detail: "No repository was detected by the latest explicit inspection.", tone: "ATTENTION" };
    case "ERROR":
      return { label: "Repository", value: "Inspection error", detail: "The latest explicit Repository inspection did not complete.", tone: "DANGER" };
    default:
      return { label: "Repository", value: "Not inspected", detail: "Open Repository Reality to inspect or connect a source.", tone: "NEUTRAL" };
  }
}

function unitySignal(state: RecommendationProjectState): OverviewSignal {
  const result = state.unityGroundTruth;
  const connection = unityConnectionState(result);
  if (connection === "UNKNOWN") return { label: "Unity", value: "Not inspected", detail: "Open Unity to inspect or connect a source.", tone: "NEUTRAL" };
  if (connection === "NOT_CONNECTED") return { label: "Unity", value: "Not connected", detail: "No Unity project was detected by the latest explicit inspection.", tone: "ATTENTION" };
  if (connection === "ERROR") return { label: "Unity", value: "Evidence error", detail: "Unity inspection or project-owned GroundTruth needs review.", tone: "DANGER" };
  if (result?.manifest.status !== "AVAILABLE") return { label: "Unity", value: "Portable inspection only", detail: "Unity is connected, but project-owned GroundTruth is not attached.", tone: "ATTENTION" };
  if (result.manifest.summary?.coverageIssues.length) return { label: "Unity", value: "Partial evidence", detail: `${countLabel(result.manifest.summary.coverageIssues.length, "coverage issue")} limits current GroundTruth.`, tone: "ATTENTION" };
  return { label: "Unity", value: "GroundTruth available", detail: "Connected Unity evidence has complete reported coverage.", tone: "CALM" };
}

function alignmentSignal(state: RecommendationProjectState): ProjectOverviewModel["alignment"] {
  const counts = emptyAlignmentCounts();
  if (state.alignment === undefined) {
    return { label: "Alignment", value: "Unavailable", detail: "Alignment state could not be read.", tone: "NEUTRAL", counts };
  }
  for (const result of state.alignment?.results ?? []) {
    if (result.reviewState !== "REJECTED") counts[result.status] += 1;
  }
  const actionable = counts.UNVERIFIED + counts.OUT_OF_SYNC + counts.CONFLICT;
  const parts = (["CONFLICT", "OUT_OF_SYNC", "UNVERIFIED"] as const)
    .filter((status) => counts[status] > 0)
    .map((status) => `${counts[status]} ${status.replaceAll("_", " ")}`);
  return actionable > 0
    ? { label: "Alignment", value: `${countLabel(actionable, "actionable issue")}`, detail: parts.join(" · "), tone: counts.CONFLICT > 0 ? "DANGER" : "ATTENTION", counts }
    : { label: "Alignment", value: "No actionable issues", detail: counts.ALIGNED > 0 ? `${countLabel(counts.ALIGNED, "aligned item")}.` : "No current Alignment results.", tone: "CALM", counts };
}

function contractSignal(state: RecommendationProjectState): ProjectOverviewModel["featureContracts"] {
  const counts = emptyContractCounts();
  if (state.featureContracts === undefined) {
    return { label: "Feature Contracts", value: "Unavailable", detail: "Feature Contract state could not be read.", tone: "NEUTRAL", counts, archived: 0 };
  }
  for (const contract of state.featureContracts?.contracts ?? []) counts[contract.status] += 1;
  const archived = counts.SUPERSEDED + counts.DEPRECATED;
  const detail = [counts.APPROVED > 0 ? countLabel(counts.APPROVED, "approved") : null, archived > 0 ? countLabel(archived, "archived") : null]
    .filter((part): part is string => part !== null)
    .join(" · ") || "No contracts yet.";
  return {
    label: "Feature Contracts",
    value: counts.DRAFT > 0 ? countLabel(counts.DRAFT, "draft") : "No drafts",
    detail,
    tone: counts.DRAFT > 0 ? "ATTENTION" : "CALM",
    counts,
    archived,
  };
}

export function deriveProjectOverview(state: RecommendationProjectState): ProjectOverviewModel {
  return {
    descriptor: projectDescriptor(state),
    foundation: foundationSignal(state),
    decisions: decisionSignal(state),
    openQuestions: openQuestionSignal(state),
    repository: repositorySignal(state),
    unity: unitySignal(state),
    alignment: alignmentSignal(state),
    featureContracts: contractSignal(state),
  };
}
