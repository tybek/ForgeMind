import type { ProjectMetadata } from "./workspaceDirectory";

export const RECENT_PROJECTS_STORAGE_KEY = "forgemind.recent-projects.v1";
export const MAX_RECENT_PROJECTS = 6;

export interface RecentProject {
  path: string;
  projectId: string;
  name: string;
  lastOpenedAt: string;
}

interface RecentProjectsRegistry {
  formatVersion: 1;
  projects: RecentProject[];
}

function isRecentProject(value: unknown): value is RecentProject {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.path === "string" && candidate.path.trim().length > 0 &&
    typeof candidate.projectId === "string" && candidate.projectId.trim().length > 0 &&
    typeof candidate.name === "string" && candidate.name.trim().length > 0 &&
    typeof candidate.lastOpenedAt === "string" &&
    !Number.isNaN(Date.parse(candidate.lastOpenedAt))
  );
}

function storage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function persist(projects: RecentProject[]): void {
  const target = storage();
  if (target === null) return;

  const registry: RecentProjectsRegistry = { formatVersion: 1, projects };
  try {
    target.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(registry));
  } catch {
    // Launcher history is optional and must never block opening a project.
  }
}

export function loadRecentProjects(): RecentProject[] {
  const target = storage();
  if (target === null) return [];

  const raw = target.getItem(RECENT_PROJECTS_STORAGE_KEY);
  if (raw === null) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<RecentProjectsRegistry>;
    if (
      parsed.formatVersion !== 1 ||
      !Array.isArray(parsed.projects) ||
      !parsed.projects.every(isRecentProject)
    ) {
      target.removeItem(RECENT_PROJECTS_STORAGE_KEY);
      return [];
    }

    return parsed.projects.slice(0, MAX_RECENT_PROJECTS);
  } catch {
    target.removeItem(RECENT_PROJECTS_STORAGE_KEY);
    return [];
  }
}

export function recordRecentProject(
  path: string,
  project: ProjectMetadata,
  openedAt = new Date().toISOString(),
): RecentProject[] {
  const normalizedPath = path.trim().toLocaleLowerCase();
  const next: RecentProject = {
    path,
    projectId: project.projectId,
    name: project.name,
    lastOpenedAt: openedAt,
  };
  const projects = [
    next,
    ...loadRecentProjects().filter(
      (entry) =>
        entry.projectId !== project.projectId &&
        entry.path.trim().toLocaleLowerCase() !== normalizedPath,
    ),
  ].slice(0, MAX_RECENT_PROJECTS);

  persist(projects);
  return projects;
}

export function removeRecentProject(path: string): RecentProject[] {
  const normalizedPath = path.trim().toLocaleLowerCase();
  const projects = loadRecentProjects().filter(
    (entry) => entry.path.trim().toLocaleLowerCase() !== normalizedPath,
  );
  persist(projects);
  return projects;
}
