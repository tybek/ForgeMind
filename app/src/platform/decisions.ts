import { invoke } from "@tauri-apps/api/core";
import type { KnowledgeArea } from "./projectKnowledge";

export type DecisionStatus = "PROPOSED" | "APPROVED" | "SUPERSEDED" | "DEPRECATED";

export interface Decision {
  id: string;
  title: string;
  statement: string;
  rationale: string;
  status: DecisionStatus;
  area: KnowledgeArea;
  author: string;
  createdAt: string;
  approvedAt?: string | null;
  supersedesDecisionId?: string | null;
  relatedKnowledgeEntryIds: string[];
}

export interface DecisionsDocument {
  formatVersion: number;
  projectId: string;
  updatedAt: string;
  decisions: Decision[];
}

export interface DecisionInput {
  title: string;
  statement: string;
  rationale: string;
  area: KnowledgeArea;
  author: string;
  supersedesDecisionId?: string | null;
  relatedKnowledgeEntryIds: string[];
}

export function loadDecisions(path: string): Promise<DecisionsDocument | null> {
  return invoke<DecisionsDocument | null>("load_decisions", { path });
}

export function createDecision(
  rootPath: string,
  projectId: string,
  input: DecisionInput,
): Promise<DecisionsDocument> {
  return invoke<DecisionsDocument>("create_decision", {
    request: { rootPath, projectId, ...input },
  });
}

export function updateDecision(
  rootPath: string,
  projectId: string,
  decisionId: string,
  input: Omit<DecisionInput, "author">,
): Promise<DecisionsDocument> {
  return invoke<DecisionsDocument>("update_decision", {
    request: { rootPath, projectId, decisionId, ...input },
  });
}

export function approveDecision(
  rootPath: string,
  projectId: string,
  decisionId: string,
): Promise<DecisionsDocument> {
  return invoke<DecisionsDocument>("approve_decision", {
    request: { rootPath, projectId, decisionId },
  });
}

export function deprecateDecision(
  rootPath: string,
  projectId: string,
  decisionId: string,
): Promise<DecisionsDocument> {
  return invoke<DecisionsDocument>("deprecate_decision", {
    request: { rootPath, projectId, decisionId },
  });
}
