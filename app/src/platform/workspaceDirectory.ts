import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface ProjectMetadata {
  formatVersion: number;
  projectId: string;
  name: string;
  createdAt: string;
}

export interface FoundationPillar {
  title: string;
  explanation: string;
}

export interface ProjectFoundationInput {
  workingTitle: string;
  genre: string;
  mode: string;
  perspective: string;
  targetPlatform: string;
  pitch: string;
  playerExperience: string;
  coreLoop: string;
  setting: string;
  tone: string;
  inspirations: string;
  antiInspirations: string;
  pillars: FoundationPillar[];
  engine: string;
  teamSize: string;
  expectedScope: string;
  majorConstraints: string;
  openQuestions: string[];
}

export type WorkspaceInspection =
  | { status: "UNINITIALIZED"; rootPath: string }
  | { status: "VALID"; rootPath: string; project: ProjectMetadata }
  | { status: "INVALID"; rootPath: string; message: string }
  | {
      status: "UNSUPPORTED_VERSION";
      rootPath: string;
      version: string;
      message: string;
    };

export async function selectWorkspaceDirectory(
  purpose: "open" | "create" = "open",
): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: purpose === "create" ? "Choose a folder for the new project" : "Open a game project",
  });

  return typeof selected === "string" ? selected : null;
}

export function inspectWorkspace(path: string): Promise<WorkspaceInspection> {
  return invoke<WorkspaceInspection>("inspect_workspace", { path });
}

export function initializeWorkspace(
  path: string,
  foundation?: ProjectFoundationInput,
): Promise<WorkspaceInspection> {
  return invoke<WorkspaceInspection>("initialize_workspace", { path, foundation: foundation ?? null });
}

export async function getDevelopmentWorkspacePath(): Promise<string | null> {
  try {
    return await invoke<string | null>("development_workspace_path");
  } catch {
    return null;
  }
}
