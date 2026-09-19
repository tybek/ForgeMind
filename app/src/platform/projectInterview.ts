import { invoke } from "@tauri-apps/api/core";

export const INTERVIEW_SECTIONS = [
  { id: "project_identity", label: "Project Identity" },
  { id: "game_vision", label: "Game Vision" },
  { id: "core_player_experience", label: "Core Player Experience" },
  { id: "core_gameplay_loop", label: "Core Gameplay Loop" },
  { id: "systems", label: "Systems" },
  { id: "world_narrative", label: "World / Narrative" },
  { id: "technical_context", label: "Technical Context" },
  { id: "production_state", label: "Production State" },
  { id: "constraints", label: "Constraints" },
  { id: "current_priorities", label: "Current Priorities" },
  { id: "open_questions", label: "Open Questions" },
] as const;

export type InterviewSection = (typeof INTERVIEW_SECTIONS)[number]["id"];
export type CandidateArea = "overview" | "game_design" | "narrative" | "technical" | "roadmap";
export type CandidateStatus = "DIRECTION" | "LOCKED" | "TBD";
export type CandidateProvenance = "USER_STATED" | "AI_INFERRED" | "UNRESOLVED";
export type ReviewDecision = "PENDING" | "APPROVE" | "DISCARD";

export interface InterviewCandidate {
  candidateId: string;
  area: CandidateArea;
  title: string;
  statement: string;
  status: CandidateStatus;
  provenance: CandidateProvenance;
}

export interface InterviewTurnRequest {
  projectId: string;
  modelId: string;
  currentSection: InterviewSection;
  currentQuestion: string;
  answer: string;
  knownStatements: string[];
}

export interface InterviewTurnResult {
  nextSection?: InterviewSection;
  nextQuestion?: string;
  candidates: InterviewCandidate[];
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ReviewedCandidate {
  candidate: InterviewCandidate;
  decision: ReviewDecision;
}

export interface InterviewDocument {
  formatVersion: number;
  projectId: string;
  approvedAt: string;
  modelId: string;
  candidates: InterviewCandidate[];
}

export interface InterviewCommandError {
  code: string;
  message: string;
}

export function runInterviewTurn(request: InterviewTurnRequest): Promise<InterviewTurnResult> {
  return invoke<InterviewTurnResult>("run_project_interview_turn", { request });
}

export function loadInterview(path: string): Promise<InterviewDocument | null> {
  return invoke<InterviewDocument | null>("load_project_interview", { path });
}

export function saveInterview(
  rootPath: string,
  projectId: string,
  modelId: string,
  candidates: ReviewedCandidate[],
  overwrite: boolean,
): Promise<InterviewDocument> {
  return invoke<InterviewDocument>("save_project_interview", {
    request: { rootPath, projectId, modelId, candidates, overwrite },
  });
}

export function sectionLabel(section: InterviewSection): string {
  return INTERVIEW_SECTIONS.find((entry) => entry.id === section)?.label ?? section;
}

export function sectionPosition(section: InterviewSection): number {
  return INTERVIEW_SECTIONS.findIndex((entry) => entry.id === section) + 1;
}
