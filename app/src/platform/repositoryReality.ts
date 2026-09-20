import { invoke } from "@tauri-apps/api/core";

export type RepositoryRealityStatus =
  | "DETECTED"
  | "NOT_REPOSITORY"
  | "GIT_UNAVAILABLE"
  | "INSPECTION_FAILED";

export type FileStatus =
  | "ADDED"
  | "MODIFIED"
  | "DELETED"
  | "RENAMED"
  | "COPIED"
  | "TYPE_CHANGED"
  | "UNTRACKED"
  | "CONFLICTED"
  | "UNKNOWN";

export interface CommitSummary {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  timestamp: string;
}

export interface FileDiffStat {
  insertions: number | null;
  deletions: number | null;
  binary: boolean;
}

export interface ChangedFile {
  path: string;
  previousPath?: string;
  status: FileStatus;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
  stagedStatus?: FileStatus;
  unstagedStatus?: FileStatus;
  diffStat?: FileDiffStat;
}

export interface DiffStat {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface RepositorySnapshot {
  branch: string | null;
  detachedHead: boolean;
  head: CommitSummary;
  workingTree: "CLEAN" | "DIRTY";
  changedFiles: ChangedFile[];
  totalChangedFiles: number;
  changedFilesTruncated: boolean;
  diffStat: DiffStat;
  recentCommits: CommitSummary[];
}

export interface RepositoryRealityResult {
  status: RepositoryRealityStatus;
  repository?: RepositorySnapshot;
  message?: string;
}

export function inspectRepositoryReality(path: string): Promise<RepositoryRealityResult> {
  return invoke<RepositoryRealityResult>("inspect_repository_reality", { path });
}
