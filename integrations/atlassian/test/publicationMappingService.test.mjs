import assert from "node:assert/strict";
import test from "node:test";
import { createPublicationMappingService } from "../src/publication/confluencePublicationMapping.ts";

const mapping = {
  schemaVersion: 1,
  projectId: "11111111-1111-4111-8111-111111111111",
  pageId: "98765",
  spaceId: "space-1",
  pageTitle: "Synthetic — Project Brain",
  lastPublishedAt: "2026-11-04T13:00:00.000Z",
  sourceSnapshotSchemaVersion: 1,
  sourceGeneratedAt: "2026-11-04T12:00:00.000Z",
  contentFingerprint: "fnv1a64-v1:0123456789abcdef",
};

test("maps the explicit missing-key envelope to no mapping", async () => {
  const service = createPublicationMappingService(async () => ({ found: false }));
  assert.equal(await service.getMapping(mapping.projectId), null);
});

test("retains null and undefined no-mapping compatibility", async () => {
  assert.equal(await createPublicationMappingService(async () => null).getMapping(mapping.projectId), null);
  assert.equal(await createPublicationMappingService(async () => undefined).getMapping(mapping.projectId), null);
});

test("parses a valid mapping envelope", async () => {
  const service = createPublicationMappingService(async () => ({ found: true, mapping }));
  assert.deepEqual(await service.getMapping(mapping.projectId), mapping);
});

test("fails safely for malformed and unsupported mapping responses", async () => {
  await assert.rejects(createPublicationMappingService(async () => ({ found: true, mapping: { ...mapping, pageId: "" } })).getMapping(mapping.projectId), /pageId is required/);
  await assert.rejects(createPublicationMappingService(async () => ({ found: true, mapping: { ...mapping, schemaVersion: 2 } })).getMapping(mapping.projectId), /unsupported schema/);
  await assert.rejects(createPublicationMappingService(async () => ({ mapping })).getMapping(mapping.projectId), /lookup response is malformed/);
});

test("surfaces resolver or storage exceptions for ACCESS ERROR classification", async () => {
  const service = createPublicationMappingService(async () => { throw new Error("storage unavailable"); });
  await assert.rejects(service.getMapping(mapping.projectId), /storage unavailable/);
});
