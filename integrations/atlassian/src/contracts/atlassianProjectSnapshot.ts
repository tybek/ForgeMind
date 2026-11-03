export const ATLASSIAN_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface AtlassianProjectSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  sourceExport: { schemaVersion: 1 };
  project: { projectId: string; name: string };
  sections: SnapshotSection[];
}

export interface SnapshotSection {
  id: "project-knowledge" | "decisions" | "open-questions" | "specialist-analysis";
  title: string;
  order: number;
  entries: SnapshotEntry[];
}

export interface SnapshotEntry {
  id: string;
  anchor: string;
  kind: "KNOWLEDGE" | "OPEN_QUESTION" | "DECISION" | "SPECIALIST_ANALYSIS";
  area?: string;
  title: string;
  body: string;
  status: string;
  authority: string;
  provenance: {
    type?: string;
    source: string;
    documentedSources: Array<{ sourceId: string; section?: string; excerpt?: string }>;
  };
  timestamps: { createdAt: string; updatedAt?: string; approvedAt?: string };
  details: Array<{ key: string; label: string; values: string[] }>;
  references: Array<{ relation: string; targetId: string; targetAnchor: string }>;
}

export type SnapshotValidationResult =
  | { ok: true; snapshot: AtlassianProjectSnapshot; sectionCount: number; entryCount: number }
  | { ok: false; errors: string[] };

const sectionIds = ["project-knowledge", "decisions", "open-questions", "specialist-analysis"] as const;
const contentDetailKeys = new Set(["rationale", "assumptions", "recommendations", "risks", "exploits", "open_questions", "suggested_tests"]);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[], path: string, errors: string[]) => {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`${path}.${key} is not part of schema version 1.`);
};
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const optionalText = (value: unknown): boolean => value === undefined || text(value);
const unsafePath = (value: string) => {
  const normalized = value.replaceAll("\\", "/");
  return normalized.startsWith("/") || normalized.split("/").includes("..") || normalized.includes("://") || normalized.toLowerCase().startsWith("file:") || /^[a-z]:\//i.test(normalized);
};

export function validateAtlassianProjectSnapshot(value: unknown): SnapshotValidationResult {
  const errors: string[] = [];
  if (!record(value)) return { ok: false, errors: ["Snapshot must be a JSON object."] };
  exactKeys(value, ["schemaVersion", "generatedAt", "sourceExport", "project", "sections"], "snapshot", errors);
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!text(value.generatedAt)) errors.push("generatedAt is required.");

  if (!record(value.sourceExport) || value.sourceExport.schemaVersion !== 1) errors.push("sourceExport.schemaVersion must be 1.");
  else exactKeys(value.sourceExport, ["schemaVersion"], "sourceExport", errors);

  if (!record(value.project)) errors.push("project is required.");
  else {
    exactKeys(value.project, ["projectId", "name"], "project", errors);
    if (!text(value.project.projectId)) errors.push("project.projectId is required.");
    if (!text(value.project.name)) errors.push("project.name is required.");
  }

  const ids = new Set<string>();
  const anchors = new Set<string>();
  const idAnchors = new Map<string, string>();
  const references: Array<{ targetId: string; targetAnchor: string; path: string }> = [];
  let entryCount = 0;
  if (!Array.isArray(value.sections) || value.sections.length !== sectionIds.length) errors.push("sections must contain the four fixed sections.");
  else value.sections.forEach((section, sectionIndex) => {
    const path = `sections[${sectionIndex}]`;
    if (!record(section)) { errors.push(`${path} must be an object.`); return; }
    exactKeys(section, ["id", "title", "order", "entries"], path, errors);
    if (section.id !== sectionIds[sectionIndex] || section.order !== sectionIndex) errors.push(`${path} has an invalid ID or order.`);
    if (!text(section.title)) errors.push(`${path}.title is required.`);
    if (!Array.isArray(section.entries)) { errors.push(`${path}.entries must be an array.`); return; }
    section.entries.forEach((entry, entryIndex) => {
      entryCount += 1;
      const entryPath = `${path}.entries[${entryIndex}]`;
      validateEntry(entry, entryPath, errors, ids, anchors, idAnchors, references);
    });
  });
  for (const reference of references) {
    if (idAnchors.get(reference.targetId) !== reference.targetAnchor) errors.push(`${reference.path} must target a known entry ID and anchor.`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, snapshot: value as unknown as AtlassianProjectSnapshot, sectionCount: sectionIds.length, entryCount };
}

function validateEntry(
  value: unknown,
  path: string,
  errors: string[],
  ids: Set<string>,
  anchors: Set<string>,
  idAnchors: Map<string, string>,
  references: Array<{ targetId: string; targetAnchor: string; path: string }>,
) {
  if (!record(value)) { errors.push(`${path} must be an object.`); return; }
  exactKeys(value, ["id", "anchor", "kind", "area", "title", "body", "status", "authority", "provenance", "timestamps", "details", "references"], path, errors);
  for (const key of ["id", "anchor", "kind", "title", "body", "status", "authority"] as const) if (!text(value[key])) errors.push(`${path}.${key} is required.`);
  if (!optionalText(value.area)) errors.push(`${path}.area must be a non-empty string when present.`);
  if (text(value.id) && ids.has(value.id)) errors.push(`${path}.id must be unique.`); else if (text(value.id)) ids.add(value.id);
  if (text(value.anchor) && anchors.has(value.anchor)) errors.push(`${path}.anchor must be unique.`); else if (text(value.anchor)) anchors.add(value.anchor);
  if (text(value.id) && text(value.anchor)) idAnchors.set(value.id, value.anchor);

  const knowledgeAuthorities = ["USER_STATED", "AI_INFERRED", "MANUAL", "UNRESOLVED", "DOCUMENTED"];
  const knowledgeStatuses = ["DIRECTION", "LOCKED", "TBD", "DEPRECATED"];
  const knowledgeSources = ["project_interview", "manual_entry", "decision", "specialist_analysis", "new_project_creator", "writers_room", "knowledge_import"];
  const provenance = record(value.provenance) ? value.provenance : {};
  const authorityIsValid =
    (value.kind === "KNOWLEDGE" && knowledgeAuthorities.includes(String(value.authority)) && knowledgeStatuses.includes(String(value.status)) && provenance.type === value.authority && knowledgeSources.includes(String(provenance.source))) ||
    (value.kind === "OPEN_QUESTION" && knowledgeAuthorities.includes(String(value.authority)) && knowledgeStatuses.includes(String(value.status)) && provenance.type === value.authority && knowledgeSources.includes(String(provenance.source))) ||
    (value.kind === "DECISION" && value.authority === "DECISION_RECORD" && ["PROPOSED", "APPROVED", "SUPERSEDED", "DEPRECATED"].includes(String(value.status)) && provenance.type === undefined && provenance.source === "decision") ||
    (value.kind === "SPECIALIST_ANALYSIS" && value.authority === "AI_ANALYSIS" && value.status === "SUCCEEDED" && provenance.type === undefined && provenance.source === "specialist_analysis");
  if (!authorityIsValid) errors.push(`${path} has invalid kind, status, or authority semantics.`);

  if (!record(value.provenance)) errors.push(`${path}.provenance is required.`);
  else {
    exactKeys(value.provenance, ["type", "source", "documentedSources"], `${path}.provenance`, errors);
    if (!optionalText(value.provenance.type)) errors.push(`${path}.provenance.type must be a non-empty string when present.`);
    if (!text(value.provenance.source)) errors.push(`${path}.provenance.source is required.`);
    if (!Array.isArray(value.provenance.documentedSources)) errors.push(`${path}.provenance.documentedSources must be an array.`);
    else value.provenance.documentedSources.forEach((source, index) => {
      const sourcePath = `${path}.provenance.documentedSources[${index}]`;
      if (!record(source)) { errors.push(`${sourcePath} must be an object.`); return; }
      exactKeys(source, ["sourceId", "section", "excerpt"], sourcePath, errors);
      if (!text(source.sourceId)) errors.push(`${sourcePath}.sourceId is required.`);
      else if (unsafePath(source.sourceId)) errors.push(`${sourcePath}.sourceId must be a safe project-relative identifier.`);
      if (!optionalText(source.section) || !optionalText(source.excerpt)) errors.push(`${sourcePath} has an invalid optional field.`);
    });
  }
  if (!record(value.timestamps) || !text(value.timestamps.createdAt)) errors.push(`${path}.timestamps.createdAt is required.`);
  else {
    exactKeys(value.timestamps, ["createdAt", "updatedAt", "approvedAt"], `${path}.timestamps`, errors);
    if (!optionalText(value.timestamps.updatedAt) || !optionalText(value.timestamps.approvedAt)) errors.push(`${path}.timestamps has an invalid optional field.`);
  }
  if (!Array.isArray(value.details)) errors.push(`${path}.details must be an array.`);
  else value.details.forEach((detail, index) => {
    const detailPath = `${path}.details[${index}]`;
    if (!record(detail) || !text(detail.key) || !contentDetailKeys.has(detail.key) || !text(detail.label) || !Array.isArray(detail.values) || !detail.values.every(text)) errors.push(`${detailPath} is invalid.`);
    else exactKeys(detail, ["key", "label", "values"], detailPath, errors);
  });
  if (!Array.isArray(value.references)) errors.push(`${path}.references must be an array.`);
  else value.references.forEach((reference, index) => {
    const referencePath = `${path}.references[${index}]`;
    if (!record(reference) || !text(reference.relation) || !text(reference.targetId) || !text(reference.targetAnchor)) errors.push(`${referencePath} is invalid.`);
    else {
      exactKeys(reference, ["relation", "targetId", "targetAnchor"], referencePath, errors);
      references.push({ targetId: reference.targetId, targetAnchor: reference.targetAnchor, path: referencePath });
    }
  });
}

export function parseAndValidateAtlassianProjectSnapshot(json: string): SnapshotValidationResult {
  try { return validateAtlassianProjectSnapshot(JSON.parse(json)); }
  catch { return { ok: false, errors: ["Snapshot is not valid JSON."] }; }
}
