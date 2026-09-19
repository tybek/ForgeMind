import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface ProjectMetadata {
  formatVersion: number;
  projectId: string;
  name: string;
  createdAt: string;
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

export async function selectWorkspaceDirectory(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open a game project",
  });

  return typeof selected === "string" ? selected : null;
}

export function inspectWorkspace(path: string): Promise<WorkspaceInspection> {
  return invoke<WorkspaceInspection>("inspect_workspace", { path });
}

export function initializeWorkspace(path: string): Promise<WorkspaceInspection> {
  return invoke<WorkspaceInspection>("initialize_workspace", { path });
}

export async function getDevelopmentWorkspacePath(): Promise<string | null> {
  try {
    return await invoke<string | null>("development_workspace_path");
  } catch {
    return null;
  }
}
