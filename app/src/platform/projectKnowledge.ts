import { invoke } from "@tauri-apps/api/core";

export const KNOWLEDGE_AREAS = [
  ["overview", "Overview"],
  ["game_vision", "Game Vision"],
  ["player_experience", "Player Experience"],
  ["core_loop", "Core Loop"],
  ["systems", "Systems"],
  ["world_narrative", "World / Narrative"],
  ["technical", "Technical"],
  ["production", "Production"],
  ["constraints", "Constraints"],
  ["current_priorities", "Current Priorities"],
  ["open_questions", "Open Questions"],
] as const;

export const KNOWLEDGE_STATUSES = ["DIRECTION", "LOCKED", "TBD", "DEPRECATED"] as const;

export type KnowledgeArea = (typeof KNOWLEDGE_AREAS)[number][0];
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];
export type KnowledgeProvenance = "USER_STATED" | "AI_INFERRED" | "MANUAL" | "UNRESOLVED";
export type KnowledgeSource = "project_interview" | "manual_entry" | "decision";

export interface KnowledgeEntry {
  id: string;
  area: KnowledgeArea;
  title: string;
  statement: string;
  status: KnowledgeStatus;
  provenance: KnowledgeProvenance;
  source: KnowledgeSource;
  createdAt: string;
  updatedAt: string;
}

export interface CompendiumDocument {
  formatVersion: number;
  projectId: string;
  updatedAt: string;
  entries: KnowledgeEntry[];
}

export interface KnowledgeEntryInput {
  area: KnowledgeArea;
  title: string;
  statement: string;
  status: KnowledgeStatus;
}

export interface InterviewImportResult {
  document: CompendiumDocument;
  importedCount: number;
  skippedDuplicateCount: number;
}

export function loadCompendium(path: string): Promise<CompendiumDocument | null> {
  return invoke<CompendiumDocument | null>("load_compendium", { path });
}

export function createKnowledgeEntry(
  rootPath: string,
  projectId: string,
  input: KnowledgeEntryInput,
): Promise<CompendiumDocument> {
  return invoke<CompendiumDocument>("create_knowledge_entry", {
    request: { rootPath, projectId, ...input },
  });
}

export function updateKnowledgeEntry(
  rootPath: string,
  projectId: string,
  entryId: string,
  input: KnowledgeEntryInput,
): Promise<CompendiumDocument> {
  return invoke<CompendiumDocument>("update_knowledge_entry", {
    request: { rootPath, projectId, entryId, ...input },
  });
}

export function deprecateKnowledgeEntry(
  rootPath: string,
  projectId: string,
  entryId: string,
): Promise<CompendiumDocument> {
  return invoke<CompendiumDocument>("deprecate_knowledge_entry", {
    request: { rootPath, projectId, entryId },
  });
}

export function importInterviewKnowledge(
  rootPath: string,
  projectId: string,
): Promise<InterviewImportResult> {
  return invoke<InterviewImportResult>("import_interview_to_compendium", {
    request: { rootPath, projectId },
  });
}

export function knowledgeAreaLabel(area: KnowledgeArea): string {
  return KNOWLEDGE_AREAS.find(([id]) => id === area)?.[1] ?? area;
}
