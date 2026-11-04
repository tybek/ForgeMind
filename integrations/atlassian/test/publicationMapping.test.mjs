import assert from "node:assert/strict";
import test from "node:test";
import { confluencePublicationKey, confluencePublicationLookupResponse, createPublicationMappingRepository, parseConfluencePublicationMapping } from "../src/publication/confluencePublicationMapping.ts";

const input = (overrides = {}) => ({
  projectId: "11111111-1111-4111-8111-111111111111",
  pageId: "98765",
  spaceId: "space-1",
  pageTitle: "Synthetic — Project Brain",
  sourceSnapshotSchemaVersion: 1,
  sourceGeneratedAt: "2026-11-04T12:00:00.000Z",
  contentFingerprint: "fnv1a64-v1:0123456789abcdef",
  ...overrides,
});

function memoryStore(initial = new Map()) {
  return {
    values: initial,
    async get(key) { return this.values.get(key); },
    async set(key, value) { this.values.set(key, structuredClone(value)); },
    async delete(key) { this.values.delete(key); },
  };
}

test("uses a deterministic installation-local key based only on projectId", () => {
  assert.equal(confluencePublicationKey(input().projectId), "confluence-publication:v1:11111111-1111-4111-8111-111111111111");
  assert.equal(confluencePublicationKey(input().projectId), confluencePublicationKey(input({ pageTitle: "Renamed project" }).projectId));
});

test("returns no mapping, then saves and retrieves schema v1 metadata", async () => {
  const store = memoryStore();
  const repository = createPublicationMappingRepository(store, () => "2026-11-04T13:00:00.000Z");
  assert.equal(await repository.getMapping(input().projectId), null);
  const saved = await repository.saveMapping(input());
  assert.deepEqual(saved, { schemaVersion: 1, lastPublishedAt: "2026-11-04T13:00:00.000Z", ...input() });
  assert.deepEqual(await repository.getMapping(input().projectId), saved);
  assert.equal(store.values.size, 1);
});

test("wraps missing and present repository values in bridge-safe object responses", () => {
  assert.deepEqual(confluencePublicationLookupResponse(null), { found: false });
  const value = { schemaVersion: 1, lastPublishedAt: "2026-11-04T13:00:00.000Z", ...input() };
  assert.deepEqual(confluencePublicationLookupResponse(value), { found: true, mapping: value });
});

test("project rename does not affect lookup because title is descriptive metadata", async () => {
  const store = memoryStore();
  const repository = createPublicationMappingRepository(store, () => "2026-11-04T13:00:00.000Z");
  await repository.saveMapping(input({ pageTitle: "Before rename" }));
  assert.equal((await repository.getMapping(input().projectId)).pageTitle, "Before rename");
});

test("forgets only the selected project mapping", async () => {
  const store = memoryStore();
  const repository = createPublicationMappingRepository(store);
  await repository.saveMapping(input());
  await repository.saveMapping(input({ projectId: "22222222-2222-4222-8222-222222222222", pageId: "2" }));
  await repository.deleteMapping(input().projectId);
  assert.equal(await repository.getMapping(input().projectId), null);
  assert.equal((await repository.getMapping("22222222-2222-4222-8222-222222222222")).pageId, "2");
});

test("rejects malformed, wrong-project, and unsupported-schema mappings", async () => {
  assert.throws(() => parseConfluencePublicationMapping({ schemaVersion: 2 }), /unsupported schema/);
  assert.throws(() => parseConfluencePublicationMapping({ schemaVersion: 1, ...input(), lastPublishedAt: "2026-11-04T13:00:00.000Z", pageTitle: "x".repeat(256) }), /255/);
  assert.throws(() => parseConfluencePublicationMapping({ schemaVersion: 1, ...input(), lastPublishedAt: "2026-11-04T13:00:00.000Z", contentFingerprint: "not-a-fingerprint" }), /fingerprint is invalid/i);
  const key = confluencePublicationKey(input().projectId);
  const store = memoryStore(new Map([[key, { schemaVersion: 1, ...input(), projectId: "other" , lastPublishedAt: "2026-11-04T13:00:00.000Z" }]]));
  await assert.rejects(createPublicationMappingRepository(store).getMapping(input().projectId), /wrong project identity/);
});

test("surfaces storage read, write, and delete failures", async () => {
  const failure = { async get() { throw new Error("read failed"); }, async set() { throw new Error("write failed"); }, async delete() { throw new Error("delete failed"); } };
  const repository = createPublicationMappingRepository(failure);
  await assert.rejects(repository.getMapping(input().projectId), /read failed/);
  await assert.rejects(repository.saveMapping(input()), /write failed/);
  await assert.rejects(repository.deleteMapping(input().projectId), /delete failed/);
});
