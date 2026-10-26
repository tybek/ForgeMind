import { invoke } from "@tauri-apps/api/core";
import {
  normalizeAiWorkspaceDocument,
  type AiWorkspaceDocument,
  type ExternalResearchRun,
} from "./aiWorkspace";

export interface TavilyConfiguration {
  configured: boolean;
  provider: "Tavily";
  setupGuidance: string;
}

export interface TavilySearchResult {
  document: AiWorkspaceDocument;
  run: ExternalResearchRun;
}

export function loadTavilyConfiguration(): Promise<TavilyConfiguration> {
  return invoke<TavilyConfiguration>("get_tavily_configuration");
}

export function searchWithTavily(input: {
  rootPath: string;
  projectId: string;
  sessionId: string;
  query: string;
}): Promise<TavilySearchResult> {
  return invoke<TavilySearchResult>("search_with_tavily", { request: input })
    .then((result) => ({ ...result, document: normalizeAiWorkspaceDocument(result.document) }));
}

export function setExternalResearchSelection(
  rootPath: string,
  projectId: string,
  sessionId: string,
  selectedSourceIds: string[],
): Promise<AiWorkspaceDocument> {
  return invoke<unknown>("set_external_research_selection", {
    request: { rootPath, projectId, sessionId, selectedSourceIds },
  }).then(normalizeAiWorkspaceDocument);
}

export function clearExternalResearch(
  rootPath: string,
  projectId: string,
  sessionId: string,
): Promise<AiWorkspaceDocument> {
  return invoke<unknown>("clear_external_research", {
    request: { rootPath, projectId, sessionId },
  }).then(normalizeAiWorkspaceDocument);
}

export function openExternalResearchSource(url: string): Promise<void> {
  return invoke<void>("open_external_research_source", { url });
}
