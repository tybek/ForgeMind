export const CONFLUENCE_PUBLICATION_MAPPING_SCHEMA_VERSION = 1 as const;
export const CONFLUENCE_PUBLICATION_KEY_PREFIX = "confluence-publication:v1:";

export interface ConfluencePublicationMapping {
  schemaVersion: typeof CONFLUENCE_PUBLICATION_MAPPING_SCHEMA_VERSION;
  projectId: string;
  pageId: string;
  spaceId: string;
  pageTitle: string;
  lastPublishedAt: string;
  sourceSnapshotSchemaVersion: number;
  sourceGeneratedAt: string;
  contentFingerprint: string;
}

export type ConfluencePublicationMappingInput = Omit<ConfluencePublicationMapping, "schemaVersion" | "lastPublishedAt">;

export type ConfluencePublicationLookupResponse =
  | { found: false }
  | { found: true; mapping: ConfluencePublicationMapping };

export function confluencePublicationLookupResponse(mapping: ConfluencePublicationMapping | null): ConfluencePublicationLookupResponse {
  return mapping ? { found: true, mapping } : { found: false };
}

export function parseConfluencePublicationLookupResponse(value: unknown): ConfluencePublicationMapping | null {
  // Retain safe compatibility with an absent response while the resolver always returns an object envelope.
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error("Confluence publication mapping lookup response is malformed.");
  if (value.found === false) return null;
  if (value.found === true) return parseConfluencePublicationMapping(value.mapping);
  throw new Error("Confluence publication mapping lookup response is malformed.");
}

export interface PublicationMappingInvoker {
  (functionKey: string, payload: Record<string, unknown>): Promise<unknown>;
}

export function createPublicationMappingService(call: PublicationMappingInvoker) {
  return {
    async getMapping(projectId: string): Promise<ConfluencePublicationMapping | null> {
      return parseConfluencePublicationLookupResponse(await call("getConfluencePublicationMapping", { projectId }));
    },

    async saveMapping(mapping: ConfluencePublicationMappingInput): Promise<ConfluencePublicationMapping> {
      const input = parseConfluencePublicationMappingInput(mapping);
      return parseConfluencePublicationMapping(await call("saveConfluencePublicationMapping", { mapping: input }));
    },

    async deleteMapping(projectId: string): Promise<void> {
      const result = await call("deleteConfluencePublicationMapping", { projectId });
      if (!isRecord(result) || result.deleted !== true) throw new Error("Forge did not confirm removal of the publication mapping.");
    },
  };
}

export interface PublicationMappingStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: object): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

export function createPublicationMappingRepository(store: PublicationMappingStore, now = () => new Date().toISOString()) {
  return {
    async getMapping(projectId: string): Promise<ConfluencePublicationMapping | null> {
      const value = await store.get(confluencePublicationKey(projectId));
      if (value === undefined) return null;
      const mapping = parseConfluencePublicationMapping(value);
      if (mapping.projectId !== projectId.trim()) throw new Error("Stored Confluence publication mapping has the wrong project identity.");
      return mapping;
    },

    async saveMapping(value: unknown): Promise<ConfluencePublicationMapping> {
      const input = parseConfluencePublicationMappingInput(value);
      const mapping = parseConfluencePublicationMapping({ ...input, schemaVersion: CONFLUENCE_PUBLICATION_MAPPING_SCHEMA_VERSION, lastPublishedAt: now() });
      await store.set(confluencePublicationKey(mapping.projectId), mapping);
      return mapping;
    },

    async deleteMapping(projectId: string): Promise<void> {
      await store.delete(confluencePublicationKey(projectId));
    },
  };
}

export function confluencePublicationKey(projectId: string): string {
  const normalized = requiredText(projectId, "projectId");
  return `${CONFLUENCE_PUBLICATION_KEY_PREFIX}${normalized}`;
}

export function parseConfluencePublicationMapping(value: unknown): ConfluencePublicationMapping {
  if (!isRecord(value)) throw new Error("Stored Confluence publication mapping is malformed.");
  if (value.schemaVersion !== CONFLUENCE_PUBLICATION_MAPPING_SCHEMA_VERSION) {
    throw new Error("Stored Confluence publication mapping uses an unsupported schema version.");
  }
  return {
    schemaVersion: CONFLUENCE_PUBLICATION_MAPPING_SCHEMA_VERSION,
    projectId: requiredText(value.projectId, "projectId"),
    pageId: requiredText(value.pageId, "pageId"),
    spaceId: requiredText(value.spaceId, "spaceId"),
    pageTitle: pageTitle(value.pageTitle),
    lastPublishedAt: isoTimestamp(value.lastPublishedAt, "lastPublishedAt"),
    sourceSnapshotSchemaVersion: positiveInteger(value.sourceSnapshotSchemaVersion, "sourceSnapshotSchemaVersion"),
    sourceGeneratedAt: isoTimestamp(value.sourceGeneratedAt, "sourceGeneratedAt"),
    contentFingerprint: fingerprint(value.contentFingerprint),
  };
}

export function parseConfluencePublicationMappingInput(value: unknown): ConfluencePublicationMappingInput {
  if (!isRecord(value)) throw new Error("Confluence publication mapping input is malformed.");
  return {
    projectId: requiredText(value.projectId, "projectId"),
    pageId: requiredText(value.pageId, "pageId"),
    spaceId: requiredText(value.spaceId, "spaceId"),
    pageTitle: pageTitle(value.pageTitle),
    sourceSnapshotSchemaVersion: positiveInteger(value.sourceSnapshotSchemaVersion, "sourceSnapshotSchemaVersion"),
    sourceGeneratedAt: isoTimestamp(value.sourceGeneratedAt, "sourceGeneratedAt"),
    contentFingerprint: fingerprint(value.contentFingerprint),
  };
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Confluence publication mapping ${field} is required.`);
  return value.trim();
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 1) throw new Error(`Confluence publication mapping ${field} must be a positive integer.`);
  return Number(value);
}

function pageTitle(value: unknown): string {
  const title = requiredText(value, "pageTitle");
  if (title.length > 255) throw new Error("Confluence publication mapping pageTitle must be 255 characters or fewer.");
  return title;
}

function fingerprint(value: unknown): string {
  const result = requiredText(value, "contentFingerprint");
  if (!/^fnv1a64-v1:[0-9a-f]{16}$/.test(result)) throw new Error("Confluence publication mapping contentFingerprint is invalid.");
  return result;
}

function isoTimestamp(value: unknown, field: string): string {
  const text = requiredText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(text) || Number.isNaN(Date.parse(text))) {
    throw new Error(`Confluence publication mapping ${field} must be an ISO timestamp.`);
  }
  return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
