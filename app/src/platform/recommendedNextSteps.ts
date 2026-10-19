import type { AlignmentDocument, AlignmentStatus } from "./alignment";
import type { DecisionsDocument } from "./decisions";
import type { FeatureContractsDocument } from "./featureContracts";
import type { CompendiumDocument, KnowledgeArea, KnowledgeEntry } from "./projectKnowledge";
import type { RepositoryRealityResult } from "./repositoryReality";
import type { UnityGroundTruthResult } from "./unityGroundTruth";

export const RECOMMENDATION_LIMIT = 5;

export type RealityConnectionState = "UNKNOWN" | "CONNECTED" | "NOT_CONNECTED" | "PARTIAL" | "ERROR";

export type RecommendationPriority = "HIGH" | "MEDIUM" | "LOW";
export type RecommendationArea = "PROJECT" | "REALITY" | "ALIGNMENT" | "DELIVERY";
export type RecommendationTarget =
  | "Game Design"
  | "Decisions"
  | "Repository / Git Reality"
  | "Unity"
  | "Alignment"
  | "Feature Contracts";

export type RecommendationSource =
  | "COMPENDIUM"
  | "DECISIONS"
  | "GIT_REALITY"
  | "UNITY_GROUNDTRUTH"
  | "ALIGNMENT"
  | "FEATURE_CONTRACTS";

export interface RecommendationSourceSignal {
  source: RecommendationSource;
  fact: string;
  count?: number;
}

export interface RecommendedNextStep {
  id: string;
  title: string;
  reason: string;
  area: RecommendationArea;
  target: RecommendationTarget;
  actionLabel: string;
  sourceSignals: RecommendationSourceSignal[];
  priority: RecommendationPriority;
  effort?: "SMALL" | "MEDIUM";
}

export interface RecommendationProjectState {
  compendium?: CompendiumDocument | null;
  decisions?: DecisionsDocument | null;
  repositoryReality?: RepositoryRealityResult | null;
  unityGroundTruth?: UnityGroundTruthResult | null;
  alignment?: AlignmentDocument | null;
  featureContracts?: FeatureContractsDocument | null;
}

interface RankedRecommendation extends RecommendedNextStep {
  rank: number;
}

export function repositoryConnectionState(result: RepositoryRealityResult | null | undefined): RealityConnectionState {
  if (result == null) return "UNKNOWN";
  if (result.status === "DETECTED") return "CONNECTED";
  if (result.status === "NOT_REPOSITORY") return "NOT_CONNECTED";
  return "ERROR";
}

export function unityConnectionState(result: UnityGroundTruthResult | null | undefined): RealityConnectionState {
  if (result == null) return "UNKNOWN";
  if (result.status === "NOT_DETECTED") return "NOT_CONNECTED";
  if (result.status === "INSPECTION_FAILED" || result.manifest.status === "INVALID_OR_UNSUPPORTED") return "ERROR";
  if (result.manifest.status !== "AVAILABLE" || result.manifest.summary?.coverageIssues.length) return "PARTIAL";
  return "CONNECTED";
}

const currentKnowledgeStatuses = new Set(["DIRECTION", "LOCKED"]);

function currentEntries(compendium: CompendiumDocument | null): KnowledgeEntry[] {
  return compendium?.entries.filter((entry) => entry.status !== "DEPRECATED") ?? [];
}

function hasCurrentKnowledge(entries: KnowledgeEntry[], area: KnowledgeArea): boolean {
  return entries.some(
    (entry) =>
      entry.area === area &&
      currentKnowledgeStatuses.has(entry.status) &&
      entry.statement.trim().length > 0,
  );
}

function hasDesignPillar(entries: KnowledgeEntry[]): boolean {
  return entries.some(
    (entry) =>
      entry.area === "game_vision" &&
      currentKnowledgeStatuses.has(entry.status) &&
      entry.title.toLocaleLowerCase().startsWith("design pillar:") &&
      entry.statement.trim().length > 0,
  );
}

function hasGameVision(entries: KnowledgeEntry[]): boolean {
  return entries.some(
    (entry) =>
      entry.area === "game_vision" &&
      currentKnowledgeStatuses.has(entry.status) &&
      !entry.title.toLocaleLowerCase().startsWith("design pillar:") &&
      entry.statement.trim().length > 0,
  );
}

export function foundationGaps(compendium: CompendiumDocument | null): string[] {
  const entries = currentEntries(compendium);
  return [
    !hasGameVision(entries) ? "Game Vision" : null,
    !hasCurrentKnowledge(entries, "core_loop") ? "Core Loop" : null,
    !hasCurrentKnowledge(entries, "player_experience") ? "Player Experience" : null,
    !hasDesignPillar(entries) ? "Design Pillars" : null,
  ].filter((area): area is string => area !== null);
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function alignmentReason(counts: Map<AlignmentStatus, number>): string {
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const parts = (["UNVERIFIED", "OUT_OF_SYNC", "CONFLICT"] as const)
    .map((status) => ({ status, count: counts.get(status) ?? 0 }))
    .filter(({ count }) => count > 0)
    .map(({ status, count }) => `${count} ${status}`);
  return `${countLabel(total, "Alignment item")} ${total === 1 ? "needs" : "need"} review: ${parts.join(", ")}.`;
}

function addFoundationRecommendations(
  candidates: RankedRecommendation[],
  compendium: CompendiumDocument | null,
): void {
  const missingFoundationAreas = foundationGaps(compendium);

  if (missingFoundationAreas.length > 0) {
    candidates.push({
      id: "complete-game-foundation",
      title: "Complete Game Foundation",
      reason: `Your Game Foundation still needs ${missingFoundationAreas.length === 1 ? missingFoundationAreas[0] : `${missingFoundationAreas.slice(0, -1).join(", ")}, and ${missingFoundationAreas.at(-1)}`}.`,
      area: "PROJECT",
      target: "Game Design",
      actionLabel: "Continue in Game Design",
      sourceSignals: missingFoundationAreas.map((area) => ({
        source: "COMPENDIUM" as const,
        fact: `${area} is missing`,
      })),
      priority: "HIGH",
      effort: "MEDIUM",
      rank: 10,
    });
  }
}

export function recommendNextSteps(
  state: RecommendationProjectState | null,
  limit = RECOMMENDATION_LIMIT,
): RecommendedNextStep[] {
  if (state === null || limit <= 0) return [];

  const candidates: RankedRecommendation[] = [];

  if (state.compendium !== undefined) {
    addFoundationRecommendations(candidates, state.compendium);

    const unresolvedQuestions = currentEntries(state.compendium).filter(
      (entry) =>
        entry.area === "open_questions" &&
        entry.status === "TBD" &&
        entry.statement.trim().length > 0,
    );
    if (unresolvedQuestions.length > 0) {
      candidates.push({
        id: "resolve-open-question",
        title: "Resolve an Open Question",
        reason: `${countLabel(unresolvedQuestions.length, "meaningful Open Question")} ${unresolvedQuestions.length === 1 ? "is" : "are"} still unresolved.`,
        area: "PROJECT",
        target: "Game Design",
        actionLabel: "Review Open Questions",
        sourceSignals: [{ source: "COMPENDIUM", fact: "Unresolved Open Questions", count: unresolvedQuestions.length }],
        priority: "MEDIUM",
        effort: "SMALL",
        rank: 50,
      });
    }
  }

  if (state.decisions !== undefined) {
    const pendingDecisions = state.decisions?.decisions.filter((decision) => decision.status === "PROPOSED") ?? [];
    if (pendingDecisions.length > 0) {
      candidates.push({
        id: "review-pending-decisions",
        title: "Review Pending Decisions",
        reason: `${countLabel(pendingDecisions.length, "proposed Decision")} ${pendingDecisions.length === 1 ? "is" : "are"} waiting for human review.`,
        area: "PROJECT",
        target: "Decisions",
        actionLabel: "Review Decisions",
        sourceSignals: [{ source: "DECISIONS", fact: "Proposed Decisions", count: pendingDecisions.length }],
        priority: "MEDIUM",
        effort: "SMALL",
        rank: 40,
      });
    }
  }

  const repositoryConnection = repositoryConnectionState(state.repositoryReality);
  if (state.repositoryReality !== undefined && repositoryConnection === "UNKNOWN") {
    candidates.push({
      id: "inspect-repository-reality",
      title: "Inspect Repository Reality",
      reason: "Repository Reality has not been inspected for this project in the current session.",
      area: "REALITY",
      target: "Repository / Git Reality",
      actionLabel: "Open Repository Reality",
      sourceSignals: [{ source: "GIT_REALITY", fact: "Current session has no Repository Reality inspection" }],
      priority: "MEDIUM",
      effort: "SMALL",
      rank: 60,
    });
  } else if (repositoryConnection === "NOT_CONNECTED") {
    candidates.push({
      id: "connect-repository",
      title: "Connect Repository",
      reason: "No repository is connected, so ForgeMind cannot inspect implementation history.",
      area: "REALITY",
      target: "Repository / Git Reality",
      actionLabel: "Connect Repository",
      sourceSignals: [{ source: "GIT_REALITY", fact: "Repository connection is not configured or detected" }],
      priority: "MEDIUM",
      effort: "SMALL",
      rank: 60,
    });
  } else if (repositoryConnection === "ERROR" && state.repositoryReality !== undefined && state.repositoryReality !== null) {
    candidates.push({
      id: "inspect-repository-reality",
      title: "Inspect Repository Reality",
      reason: state.repositoryReality.status === "GIT_UNAVAILABLE"
        ? "Git is currently unavailable, so ForgeMind cannot show Repository Reality."
        : "The latest Repository Reality inspection did not complete successfully.",
      area: "REALITY",
      target: "Repository / Git Reality",
      actionLabel: "Review Repository Reality",
      sourceSignals: [{ source: "GIT_REALITY", fact: `Inspection status is ${state.repositoryReality.status}` }],
      priority: "MEDIUM",
      effort: "SMALL",
      rank: 60,
    });
  }

  const unityConnection = unityConnectionState(state.unityGroundTruth);
  if (state.unityGroundTruth !== undefined && unityConnection === "UNKNOWN") {
    candidates.push({
      id: "inspect-unity-reality",
      title: "Inspect Unity Reality",
      reason: "Unity Reality has not been inspected for this project in the current session.",
      area: "REALITY",
      target: "Unity",
      actionLabel: "Open Unity Reality",
      sourceSignals: [{ source: "UNITY_GROUNDTRUTH", fact: "Current session has no Unity Reality inspection" }],
      priority: "MEDIUM",
      effort: "SMALL",
      rank: 70,
    });
  } else if (unityConnection === "NOT_CONNECTED") {
    candidates.push({
      id: "connect-unity-project",
      title: "Connect Unity Project",
      reason: "No Unity project is connected, so ForgeMind cannot verify implementation evidence.",
      area: "REALITY",
      target: "Unity",
      actionLabel: "Connect Unity Project",
      sourceSignals: [{ source: "UNITY_GROUNDTRUTH", fact: "Unity project connection is not configured or detected" }],
      priority: "MEDIUM",
      effort: "SMALL",
      rank: 70,
    });
  } else if (state.unityGroundTruth?.status === "DETECTED" && state.unityGroundTruth.manifest.status !== "AVAILABLE") {
    const invalid = state.unityGroundTruth.manifest.status === "INVALID_OR_UNSUPPORTED";
    candidates.push({
      id: invalid ? "review-invalid-unity-evidence" : "complete-unity-ground-truth",
      title: invalid ? "Review Invalid Unity Evidence" : "Complete Unity GroundTruth",
      reason: invalid
        ? "The project-owned Unity GroundTruth manifest is invalid or unsupported and needs review."
        : "A Unity project is connected, but this ForgeMind project has no GroundTruth export attached yet.",
      area: "REALITY",
      target: "Unity",
      actionLabel: "Review Unity Evidence",
      sourceSignals: [{ source: "UNITY_GROUNDTRUTH", fact: `Manifest status is ${state.unityGroundTruth.manifest.status}` }],
      priority: "MEDIUM",
      effort: "MEDIUM",
      rank: 70,
    });
  } else if (state.unityGroundTruth?.manifest.summary?.coverageIssues.length) {
    candidates.push({
      id: "review-partial-unity-evidence",
      title: "Review Partial Unity Evidence",
      reason: `${countLabel(state.unityGroundTruth.manifest.summary.coverageIssues.length, "GroundTruth coverage issue")} ${state.unityGroundTruth.manifest.summary.coverageIssues.length === 1 ? "limits" : "limit"} the current Unity evidence.`,
      area: "REALITY",
      target: "Unity",
      actionLabel: "Review Unity Evidence",
      sourceSignals: [{ source: "UNITY_GROUNDTRUTH", fact: "GroundTruth coverage issues", count: state.unityGroundTruth.manifest.summary.coverageIssues.length }],
      priority: "MEDIUM",
      effort: "MEDIUM",
      rank: 70,
    });
  } else if (state.unityGroundTruth?.status === "INSPECTION_FAILED") {
    candidates.push({
      id: "inspect-unity-reality",
      title: "Inspect Unity Reality",
      reason: "The latest Unity Reality inspection did not complete successfully.",
      area: "REALITY",
      target: "Unity",
      actionLabel: "Review Unity Reality",
      sourceSignals: [{ source: "UNITY_GROUNDTRUTH", fact: "Inspection status is INSPECTION_FAILED" }],
      priority: "MEDIUM",
      effort: "SMALL",
      rank: 70,
    });
  }

  if (state.alignment !== undefined) {
    const attentionStatuses = new Map<AlignmentStatus, number>();
    for (const result of state.alignment?.results ?? []) {
      if (result.reviewState === "REJECTED" || !["UNVERIFIED", "OUT_OF_SYNC", "CONFLICT"].includes(result.status)) continue;
      attentionStatuses.set(result.status, (attentionStatuses.get(result.status) ?? 0) + 1);
    }
    if (attentionStatuses.size > 0) {
      const count = [...attentionStatuses.values()].reduce((total, value) => total + value, 0);
      candidates.push({
        id: "review-alignment",
        title: "Review Alignment",
        reason: alignmentReason(attentionStatuses),
        area: "ALIGNMENT",
        target: "Alignment",
        actionLabel: "Review Alignment",
        sourceSignals: [...attentionStatuses.entries()].map(([status, statusCount]) => ({
          source: "ALIGNMENT" as const,
          fact: status,
          count: statusCount,
        })),
        priority: "MEDIUM",
        effort: "MEDIUM",
        rank: 80,
      });
    }
  }

  if (state.featureContracts !== undefined) {
    const drafts = state.featureContracts?.contracts.filter((contract) => contract.status === "DRAFT") ?? [];
    if (drafts.length > 0) {
      candidates.push({
        id: "continue-feature-contract",
        title: "Continue Feature Contract",
        reason: `${countLabel(drafts.length, "draft Feature Contract")} ${drafts.length === 1 ? "is" : "are"} still awaiting completion and review.`,
        area: "DELIVERY",
        target: "Feature Contracts",
        actionLabel: "Open Feature Contracts",
        sourceSignals: [{ source: "FEATURE_CONTRACTS", fact: "Draft Feature Contracts", count: drafts.length }],
        priority: "LOW",
        effort: "MEDIUM",
        rank: 90,
      });
    }
  }

  return candidates
    .sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id))
    .slice(0, Math.min(limit, RECOMMENDATION_LIMIT))
    .map(({ rank: _rank, ...recommendation }) => recommendation);
}
