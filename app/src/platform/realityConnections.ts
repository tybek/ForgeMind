import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type RealityConnectionSource = "REPOSITORY" | "UNITY";

export interface RealityConnectionSummary {
  configured: boolean;
  folderName?: string;
}

export interface RealityConnections {
  repository: RealityConnectionSummary;
  unity: RealityConnectionSummary;
}

export async function selectRealityFolder(source: RealityConnectionSource): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: source === "REPOSITORY" ? "Select Repository Folder" : "Select Unity Project Folder",
  });
  return typeof selected === "string" ? selected : null;
}

export function getRealityConnections(path: string): Promise<RealityConnections> {
  return invoke<RealityConnections>("get_reality_connections", { path });
}

export function setRealityConnection(
  rootPath: string,
  projectId: string,
  source: RealityConnectionSource,
  selectedPath: string,
): Promise<RealityConnections> {
  return invoke<RealityConnections>("set_reality_connection", {
    request: { rootPath, projectId, source, selectedPath },
  });
}

export function disconnectRealityConnection(
  rootPath: string,
  projectId: string,
  source: RealityConnectionSource,
): Promise<RealityConnections> {
  return invoke<RealityConnections>("disconnect_reality_connection", {
    request: { rootPath, projectId, source },
  });
}
