import { invoke } from "@tauri-apps/api/core";

export interface ProjectBrainExportResult {
  schemaVersion: number;
  generatedAt: string;
  entryCount: number;
  markdownPath: string;
  manifestPath: string;
}

export function exportProjectBrain(path: string, projectId: string): Promise<ProjectBrainExportResult> {
  return invoke<ProjectBrainExportResult>("export_project_brain", { path, projectId });
}
