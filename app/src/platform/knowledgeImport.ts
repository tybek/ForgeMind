import { invoke } from "@tauri-apps/api/core";
import type { ModelEntry } from "./modelRegistry";
import type { KnowledgeArea } from "./projectKnowledge";

export type ImportCandidateType = "KNOWLEDGE" | "DECISION" | "OPEN_QUESTION";
export type ImportCandidateConfidence = "HIGH" | "MEDIUM" | "LOW";
export type ImportDuplicateStatus = "NEW" | "POSSIBLE_DUPLICATE" | "EXISTING" | "REVIEW_REQUIRED";

export interface DocumentedSourceTrace {
  sourceId: string;
  section?: string;
  excerpt?: string;
}

export interface KnowledgeImportPreflight {
  taskLabel: string;
  provider: string;
  modelId: string;
  models: ModelEntry[];
  sources: Array<{ sourceId: string; bytes: number }>;
  totalSourceBytes: number;
  boundedOrTruncated: boolean;
  estimatedInputTokensMinimum: number;
  estimatedInputTokensMaximum: number;
  usageBand: string;
  estimatedCostUsdMaximum?: number;
  recentObservedLatencyMs?: number;
  historyAvailable: boolean;
}

export interface KnowledgeImportCandidate {
  id: string;
  type: ImportCandidateType;
  title: string;
  content: string;
  section: KnowledgeArea;
  sourceRefs: string[];
  sourceTrace: DocumentedSourceTrace[];
  confidence: ImportCandidateConfidence;
  note: string;
  duplicateStatus: ImportDuplicateStatus;
  selectedByDefault: boolean;
}

export interface KnowledgeImportRunResult {
  candidates: KnowledgeImportCandidate[];
  provider: string;
  modelId: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ApplyKnowledgeImportResult {
  appliedKnowledge: number;
  proposedDecisions: number;
  openQuestions: number;
  skippedDuplicates: number;
  errors: Array<{ candidateId: string; title: string; code: string; message: string }>;
}

export interface ReviewedImportCandidate {
  id: string;
  type: ImportCandidateType;
  title: string;
  content: string;
  section: KnowledgeArea;
  sourceRefs: string[];
  note: string;
}

interface ImportRequest {
  rootPath: string;
  projectId: string;
  relativePaths: string[];
  modelId?: string;
}

export function projectRelativeMarkdownPaths(workspacePath: string, selectedPaths: string[]): string[] {
  const normalize = (value: string) => value.replaceAll("/", "\\").replace(/\\+$/, "");
  const root = normalize(workspacePath);
  const prefix = `${root.toLocaleLowerCase()}\\`;
  const paths = selectedPaths.map((selectedPath) => {
    const selected = normalize(selectedPath);
    if (!selected.toLocaleLowerCase().startsWith(prefix)) {
      throw new Error("Selected Markdown must be inside the active project.");
    }
    const relative = selected.slice(root.length + 1).replaceAll("\\", "/");
    if (!/\.md$/iu.test(relative)) throw new Error("Knowledge Import supports .md Markdown files only.");
    return relative;
  });
  const unique = [...new Set(paths)];
  if (unique.length === 0 || unique.length > 10) throw new Error("Select between 1 and 10 Markdown files.");
  return unique;
}

export function getKnowledgeImportPreflight(request: ImportRequest): Promise<KnowledgeImportPreflight> {
  return invoke<KnowledgeImportPreflight>("get_knowledge_import_preflight", { request });
}

export function runKnowledgeImport(request: ImportRequest): Promise<KnowledgeImportRunResult> {
  return invoke<KnowledgeImportRunResult>("run_knowledge_import", { request });
}

export function applyKnowledgeImport(
  rootPath: string,
  projectId: string,
  candidates: ReviewedImportCandidate[],
): Promise<ApplyKnowledgeImportResult> {
  return invoke<ApplyKnowledgeImportResult>("apply_knowledge_import", {
    request: { rootPath, projectId, candidates },
  });
}
