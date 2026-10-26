import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearExternalResearch,
  loadTavilyConfiguration,
  openExternalResearchSource,
  searchWithTavily,
  setExternalResearchSelection,
} from "./externalResearch";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const document = {
  formatVersion: 1,
  projectId: "project-1",
  updatedAt: "2026-10-26T12:00:00.000Z",
  sessions: [{
    id: "session-1",
    projectId: "project-1",
    surface: "writers_room",
    purpose: "Research narrative design.",
    specialistProfileId: "lore_architect",
    title: "Research",
    createdAt: "2026-10-26T12:00:00.000Z",
    updatedAt: "2026-10-26T12:00:00.000Z",
    status: "ACTIVE",
    messages: [],
    selectedMarkdownPaths: [],
    externalResearchSources: [{
      id: "source-1",
      query: "enemy factions",
      title: "Faction conflict",
      url: "https://example.com/factions",
      domain: "example.com",
      snippet: "A bounded snippet.",
      retrievedAt: "2026-10-26T12:00:00.000Z",
      provider: "TAVILY",
      authority: "EXTERNAL_RESEARCH",
      selected: true,
    }],
  }],
};

describe("external research platform boundary", () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it("keeps configuration, one search, selection, and clear behind narrow native commands", async () => {
    vi.mocked(invoke).mockImplementation((command) => Promise.resolve(
      command === "get_tavily_configuration"
        ? { configured: true, provider: "Tavily", setupGuidance: "Configured natively." }
        : command === "search_with_tavily"
          ? { document, run: { provider: "TAVILY", operation: "SEARCH", timestamp: "2026-10-26T12:00:00.000Z", queryLength: 14, resultCount: 1, latencyMs: 20, status: "SUCCESS" } }
          : document,
    ));

    await loadTavilyConfiguration();
    const search = await searchWithTavily({ rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1", query: "enemy factions" });
    await setExternalResearchSelection("D:\\Game", "project-1", "session-1", []);
    await clearExternalResearch("D:\\Game", "project-1", "session-1");
    await openExternalResearchSource("https://example.com/factions");

    expect(invoke).toHaveBeenNthCalledWith(1, "get_tavily_configuration");
    expect(invoke).toHaveBeenNthCalledWith(2, "search_with_tavily", { request: { rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1", query: "enemy factions" } });
    expect(invoke).toHaveBeenNthCalledWith(3, "set_external_research_selection", { request: { rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1", selectedSourceIds: [] } });
    expect(invoke).toHaveBeenNthCalledWith(4, "clear_external_research", { request: { rootPath: "D:\\Game", projectId: "project-1", sessionId: "session-1" } });
    expect(invoke).toHaveBeenNthCalledWith(5, "open_external_research_source", { url: "https://example.com/factions" });
    expect(search.document.sessions[0].externalResearchSources[0]).toMatchObject({ authority: "EXTERNAL_RESEARCH", provider: "TAVILY", selected: true });
  });
});
