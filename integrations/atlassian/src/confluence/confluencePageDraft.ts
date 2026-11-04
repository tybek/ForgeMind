import type { AtlassianProjectSnapshot, SnapshotEntry } from "../contracts/atlassianProjectSnapshot";

export const CONFLUENCE_PAGE_TITLE_MAX_LENGTH = 255;

export interface ConfluencePageDraft {
  title: string;
  body: string;
  sourceProjectId: string;
  sourceSchemaVersion: number;
  sectionCount: number;
  entryCount: number;
  authoritySummary: Array<{ authority: string; count: number }>;
}

export function defaultConfluencePageTitle(projectName: string): string {
  const suffix = " — Project Brain";
  const available = CONFLUENCE_PAGE_TITLE_MAX_LENGTH - suffix.length;
  const name = projectName.trim().slice(0, available).trimEnd();
  return `${name}${suffix}`;
}

export function validateConfluencePageTitle(title: string): string | null {
  const normalized = title.trim();
  if (!normalized) return "Page title is required.";
  if (normalized.length > CONFLUENCE_PAGE_TITLE_MAX_LENGTH) {
    return `Page title must be ${CONFLUENCE_PAGE_TITLE_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function buildConfluencePageDraft(snapshot: AtlassianProjectSnapshot, title = defaultConfluencePageTitle(snapshot.project.name)): ConfluencePageDraft {
  const titleError = validateConfluencePageTitle(title);
  if (titleError) throw new Error(titleError);

  const entries = snapshot.sections.flatMap((section) => section.entries);
  const authorityCounts = new Map<string, number>();
  for (const entry of entries) authorityCounts.set(entry.authority, (authorityCounts.get(entry.authority) ?? 0) + 1);

  return {
    title: title.trim(),
    body: renderStorageBody(snapshot),
    sourceProjectId: snapshot.project.projectId,
    sourceSchemaVersion: snapshot.schemaVersion,
    sectionCount: snapshot.sections.length,
    entryCount: entries.length,
    authoritySummary: [...authorityCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([authority, count]) => ({ authority, count })),
  };
}

function renderStorageBody(snapshot: AtlassianProjectSnapshot): string {
  const entryTitles = new Map(snapshot.sections.flatMap((section) => section.entries.map((entry) => [entry.id, entry.title] as const)));
  const output = [
    "<h1>ForgeMind Project Brain</h1>",
    "<p><strong>Published from ForgeMind</strong></p>",
    `<p><strong>Source project:</strong> ${escapeStorage(snapshot.project.name)}<br />` +
      `<strong>Snapshot schema:</strong> v${snapshot.schemaVersion}<br />` +
      `<strong>Generated:</strong> ${escapeStorage(snapshot.generatedAt)}</p>`,
    "<p><em>Managed by ForgeMind. This page is a derived published copy; edits made here are not read back, and an explicit ForgeMind update may replace manual edits.</em></p>",
  ];

  for (const section of snapshot.sections) {
    output.push(`<h2>${escapeStorage(section.title)}</h2>`);
    if (section.entries.length === 0) {
      output.push("<p><em>No entries.</em></p>");
      continue;
    }
    for (const entry of section.entries) output.push(renderEntry(entry, entryTitles));
  }
  return output.join("\n");
}

function renderEntry(entry: SnapshotEntry, entryTitles: Map<string, string>): string {
  const output = [
    `<h3>${escapeStorage(entry.title)}</h3>`,
    ...renderParagraphs(entry.body),
    "<ul>",
    `<li><strong>Status:</strong> ${escapeStorage(entry.status)}</li>`,
    `<li><strong>Authority:</strong> ${escapeStorage(entry.authority)}</li>`,
  ];
  if (entry.area) output.push(`<li><strong>Area:</strong> ${escapeStorage(entry.area)}</li>`);
  output.push(`<li><strong>Created:</strong> ${escapeStorage(entry.timestamps.createdAt)}</li>`);
  if (entry.timestamps.updatedAt) output.push(`<li><strong>Updated:</strong> ${escapeStorage(entry.timestamps.updatedAt)}</li>`);
  if (entry.timestamps.approvedAt) output.push(`<li><strong>Approved:</strong> ${escapeStorage(entry.timestamps.approvedAt)}</li>`);
  output.push("</ul>");

  output.push("<h4>Provenance</h4>", "<ul>");
  if (entry.provenance.type) output.push(`<li><strong>Type:</strong> ${escapeStorage(entry.provenance.type)}</li>`);
  output.push(`<li><strong>Source:</strong> ${escapeStorage(entry.provenance.source)}</li>`);
  for (const source of entry.provenance.documentedSources) {
    if (!isSafeProjectRelativeIdentifier(source.sourceId)) continue;
    const details = [source.sourceId, source.section, source.excerpt].filter((value): value is string => Boolean(value));
    output.push(`<li><strong>Documented source:</strong> ${details.map(escapeStorage).join(" — ")}</li>`);
  }
  output.push("</ul>");

  for (const detail of entry.details) {
    output.push(`<h4>${escapeStorage(detail.label)}</h4>`, "<ul>");
    for (const value of detail.values) output.push(`<li>${escapeStorage(value)}</li>`);
    output.push("</ul>");
  }

  if (entry.references.length > 0) {
    output.push("<h4>References</h4>", "<ul>");
    for (const reference of entry.references) {
      const targetTitle = entryTitles.get(reference.targetId) ?? "Referenced entry";
      output.push(`<li>${escapeStorage(reference.relation)}: ${escapeStorage(targetTitle)}</li>`);
    }
    output.push("</ul>");
  }
  return output.join("\n");
}

function renderParagraphs(value: string): string[] {
  const paragraphs = value.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return (paragraphs.length > 0 ? paragraphs : [""]).map((paragraph) => `<p>${escapeStorage(paragraph).replaceAll("\n", "<br />")}</p>`);
}

function isSafeProjectRelativeIdentifier(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  return !normalized.startsWith("/") && !normalized.split("/").includes("..") && !normalized.includes("://") && !normalized.toLowerCase().startsWith("file:") && !/^[a-z]:\//i.test(normalized);
}

function escapeStorage(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
