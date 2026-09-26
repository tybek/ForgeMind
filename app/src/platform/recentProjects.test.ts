import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_RECENT_PROJECTS,
  RECENT_PROJECTS_STORAGE_KEY,
  loadRecentProjects,
  recordRecentProject,
} from "./recentProjects";

const project = {
  formatVersion: 1,
  projectId: "project-one",
  name: "Project One",
  createdAt: "2026-09-20T10:00:00.000Z",
};

describe("recent project registry", () => {
  beforeEach(() => localStorage.clear());

  it("updates recency and deduplicates by project identity or path", () => {
    recordRecentProject("D:\\Games\\One", project, "2026-09-20T10:00:00.000Z");
    recordRecentProject(
      "D:\\Games\\Two",
      { ...project, projectId: "project-two", name: "Project Two" },
      "2026-09-21T10:00:00.000Z",
    );
    recordRecentProject("d:\\games\\one", project, "2026-09-22T10:00:00.000Z");

    expect(loadRecentProjects()).toEqual([
      expect.objectContaining({ name: "Project One", lastOpenedAt: "2026-09-22T10:00:00.000Z" }),
      expect.objectContaining({ name: "Project Two" }),
    ]);
  });

  it("keeps only the bounded number of most recent projects", () => {
    for (let index = 0; index < MAX_RECENT_PROJECTS + 2; index += 1) {
      recordRecentProject(
        `D:\\Games\\Project-${index}`,
        { ...project, projectId: `project-${index}`, name: `Project ${index}` },
        new Date(Date.UTC(2026, 8, 20 + index)).toISOString(),
      );
    }

    expect(loadRecentProjects()).toHaveLength(MAX_RECENT_PROJECTS);
    expect(loadRecentProjects()[0].name).toBe(`Project ${MAX_RECENT_PROJECTS + 1}`);
  });

  it("recovers from malformed local data", () => {
    localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, "{not-json");

    expect(loadRecentProjects()).toEqual([]);
    expect(localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY)).toBeNull();
  });
});
