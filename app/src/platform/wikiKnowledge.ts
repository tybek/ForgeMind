import type { Decision } from "./decisions";
import {
  knowledgeAreaLabel,
  type KnowledgeArea,
  type KnowledgeEntry,
  type KnowledgeProvenance,
  type KnowledgeSource,
} from "./projectKnowledge";
import type { SpecialistRun } from "./specialists";

export type WikiItemKind = "KNOWLEDGE" | "OPEN_QUESTION" | "DECISION" | "AI_ANALYSIS";
export type WikiCategory = "all" | "design_pillars" | "decisions" | KnowledgeArea;
export type WikiTypeFilter = "ALL" | WikiItemKind;
export type WikiAuthorityFilter =
  | "ALL"
  | "USER_STATED"
  | "MANUAL"
  | "AI_INFERRED"
  | "UNRESOLVED"
  | "DECISION_RECORD"
  | "AI_ANALYSIS";
export type WikiLifecycleFilter = "CURRENT" | "ACTIVE" | "UNRESOLVED" | "PROPOSED" | "APPROVED" | "HISTORICAL" | "ALL";

export interface WikiDetailSection {
  label: string;
  paragraphs?: string[];
  items?: string[];
}

export interface WikiKnowledgeItem {
  key: string;
  sourceId: string;
  kind: WikiItemKind;
  categories: WikiCategory[];
  area: KnowledgeArea;
  categoryLabel: string;
  title: string;
  preview: string;
  content: string;
  detailSections: WikiDetailSection[];
  authorityKey: Exclude<WikiAuthorityFilter, "ALL">;
  authorityLabel: string;
  provenanceLabel: string;
  sourceLabel: string;
  lifecycleKey: "ACTIVE" | "UNRESOLVED" | "PROPOSED" | "APPROVED" | "HISTORICAL";
  lifecycleLabel: string;
  ownerLabel: string;
  createdAt: string;
  updatedAt?: string;
  searchText: string;
}

export interface WikiFilters {
  category: WikiCategory;
  query: string;
  type: WikiTypeFilter;
  authority: WikiAuthorityFilter;
  lifecycle: WikiLifecycleFilter;
}

function humanize(value: string): string {
  return value.toLocaleLowerCase().split("_").map((part) => `${part[0]?.toLocaleUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function provenanceLabel(provenance: KnowledgeProvenance): string {
  switch (provenance) {
    case "USER_STATED": return "User stated";
    case "AI_INFERRED": return "AI-assisted, human accepted";
    case "UNRESOLVED": return "Unresolved";
    default: return "Human authored";
  }
}

function sourceLabel(source: KnowledgeSource): string {
  switch (source) {
    case "project_interview": return "Project Interview";
    case "manual_entry": return "Game Design";
    case "decision": return "Decision promotion";
    case "specialist_analysis": return "Accepted specialist finding";
    case "new_project_creator": return "New Project Creator";
    case "writers_room": return "Accepted Writers' Room proposal";
  }
}

function isDesignPillar(entry: KnowledgeEntry): boolean {
  return entry.area === "game_vision" && /^design pillar\s*:/iu.test(entry.title.trim());
}

function knowledgeItem(entry: KnowledgeEntry): WikiKnowledgeItem {
  const openQuestion = entry.area === "open_questions" || entry.provenance === "UNRESOLVED";
  const historical = entry.status === "DEPRECATED";
  const unresolved = openQuestion || entry.status === "TBD";
  const pillar = isDesignPillar(entry);
  const categoryLabel = pillar ? "Design Pillars" : knowledgeAreaLabel(entry.area);
  const authorityKey = openQuestion ? "UNRESOLVED" : entry.provenance;
  const lifecycleKey = historical ? "HISTORICAL" : unresolved ? "UNRESOLVED" : "ACTIVE";
  const lifecycleLabel = historical ? "Deprecated" : unresolved ? "Unresolved" : humanize(entry.status);
  const kind = openQuestion ? "OPEN_QUESTION" : "KNOWLEDGE";
  const kindLabel = openQuestion ? "Open question" : "Project knowledge";
  const source = sourceLabel(entry.source);
  const provenance = provenanceLabel(entry.provenance);
  const categories: WikiCategory[] = pillar
    ? ["design_pillars", entry.area]
    : openQuestion
      ? [...new Set<WikiCategory>(["open_questions", entry.area])]
      : [entry.area];
  return {
    key: `knowledge:${entry.id}`,
    sourceId: entry.id,
    kind,
    categories,
    area: entry.area,
    categoryLabel,
    title: entry.title,
    preview: entry.statement,
    content: entry.statement,
    detailSections: [],
    authorityKey,
    authorityLabel: openQuestion ? "Unresolved project question" : "Game Compendium",
    provenanceLabel: provenance,
    sourceLabel: source,
    lifecycleKey,
    lifecycleLabel,
    ownerLabel: "Game Design",
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    searchText: [entry.title, entry.statement, categoryLabel, kindLabel, lifecycleLabel, provenance, source, "Game Compendium"].join(" ").toLocaleLowerCase(),
  };
}

function decisionItem(decision: Decision): WikiKnowledgeItem {
  const historical = decision.status === "DEPRECATED" || decision.status === "SUPERSEDED";
  const lifecycleKey = historical ? "HISTORICAL" : decision.status === "PROPOSED" ? "PROPOSED" : "APPROVED";
  const lifecycleLabel = humanize(decision.status);
  const categoryLabel = knowledgeAreaLabel(decision.area);
  const authorityLabel = decision.status === "APPROVED" ? "Approved decision record" : decision.status === "PROPOSED" ? "Proposed decision — not established" : "Historical decision record";
  return {
    key: `decision:${decision.id}`,
    sourceId: decision.id,
    kind: "DECISION",
    categories: ["decisions", decision.area],
    area: decision.area,
    categoryLabel,
    title: decision.title,
    preview: decision.statement,
    content: decision.statement,
    detailSections: [{ label: "Rationale", paragraphs: [decision.rationale] }],
    authorityKey: "DECISION_RECORD",
    authorityLabel,
    provenanceLabel: "Decision record",
    sourceLabel: decision.author.trim().length > 0 ? `Decisions · ${decision.author}` : "Decisions",
    lifecycleKey,
    lifecycleLabel,
    ownerLabel: "Decisions",
    createdAt: decision.createdAt,
    updatedAt: decision.approvedAt ?? undefined,
    searchText: [decision.title, decision.statement, decision.rationale, categoryLabel, "Decision", lifecycleLabel, authorityLabel, decision.author].join(" ").toLocaleLowerCase(),
  };
}

function relatedAreas(run: SpecialistRun, knowledgeById: Map<string, KnowledgeEntry>, decisionsById: Map<string, Decision>): KnowledgeArea[] {
  const areas = new Set<KnowledgeArea>();
  run.selectedKnowledgeEntryIds.forEach((id) => {
    const entry = knowledgeById.get(id);
    if (entry) areas.add(entry.area);
  });
  run.selectedDecisionIds.forEach((id) => {
    const decision = decisionsById.get(id);
    if (decision) areas.add(decision.area);
  });
  return areas.size > 0 ? [...areas] : ["overview"];
}

function analysisItem(run: SpecialistRun, areas: KnowledgeArea[]): WikiKnowledgeItem | null {
  if (run.status !== "SUCCEEDED" || !run.result) return null;
  const result = run.result;
  const primaryArea = areas[0] ?? "overview";
  const categoryLabel = areas.map(knowledgeAreaLabel).join(", ");
  const sections: WikiDetailSection[] = [
    { label: "Scenario", paragraphs: [run.scenario] },
    { label: "Recommendations", items: result.recommendations },
    { label: "Assumptions", items: result.assumptions },
    { label: "Risks", items: result.risks },
    { label: "Open questions", items: result.openQuestions },
    { label: "Suggested tests", items: result.suggestedTests },
  ].filter((section) => (section.paragraphs?.some(Boolean) ?? false) || (section.items?.length ?? 0) > 0);
  const taskLabel = humanize(run.taskType);
  return {
    key: `analysis:${run.id}`,
    sourceId: run.id,
    kind: "AI_ANALYSIS",
    categories: areas,
    area: primaryArea,
    categoryLabel,
    title: result.summary,
    preview: run.scenario,
    content: result.summary,
    detailSections: sections,
    authorityKey: "AI_ANALYSIS",
    authorityLabel: "Non-authoritative AI working analysis",
    provenanceLabel: "AI generated — not approved",
    sourceLabel: `Specialist History · ${taskLabel}`,
    lifecycleKey: "ACTIVE",
    lifecycleLabel: "Working analysis",
    ownerLabel: "AI Behavior Designer",
    createdAt: run.createdAt,
    searchText: [result.summary, run.scenario, taskLabel, categoryLabel, ...result.recommendations, ...result.assumptions, ...result.risks, ...result.openQuestions, ...result.suggestedTests, "Non-authoritative AI working analysis", "Specialist History"].join(" ").toLocaleLowerCase(),
  };
}

function sortRank(item: WikiKnowledgeItem): number {
  if (item.lifecycleKey === "HISTORICAL") return 3;
  if (item.kind === "AI_ANALYSIS") return 2;
  if (item.lifecycleKey === "UNRESOLVED" || item.lifecycleKey === "PROPOSED") return 1;
  return 0;
}

export function buildWikiItems(knowledge: KnowledgeEntry[], decisions: Decision[], runs: SpecialistRun[]): WikiKnowledgeItem[] {
  const knowledgeById = new Map(knowledge.map((entry) => [entry.id, entry]));
  const decisionsById = new Map(decisions.map((decision) => [decision.id, decision]));
  const items = [
    ...knowledge.map(knowledgeItem),
    ...decisions.map(decisionItem),
    ...runs.map((run) => analysisItem(run, relatedAreas(run, knowledgeById, decisionsById))).filter((item): item is WikiKnowledgeItem => item !== null),
  ];
  return items.sort((left, right) => sortRank(left) - sortRank(right)
    || left.title.localeCompare(right.title, undefined, { sensitivity: "base" })
    || left.key.localeCompare(right.key));
}

function matchesLifecycle(item: WikiKnowledgeItem, filter: WikiLifecycleFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "CURRENT") return item.lifecycleKey !== "HISTORICAL";
  if (filter === "ACTIVE") return item.lifecycleKey === "ACTIVE";
  return item.lifecycleKey === filter;
}

export function filterWikiItems(items: WikiKnowledgeItem[], filters: WikiFilters): WikiKnowledgeItem[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return items.filter((item) => (filters.category === "all" || item.categories.includes(filters.category))
    && (filters.type === "ALL" || item.kind === filters.type)
    && (filters.authority === "ALL" || item.authorityKey === filters.authority)
    && matchesLifecycle(item, filters.lifecycle)
    && (query.length === 0 || item.searchText.includes(query)));
}

export function countWikiCategory(items: WikiKnowledgeItem[], category: WikiCategory): number {
  return category === "all" ? items.length : items.filter((item) => item.categories.includes(category)).length;
}
