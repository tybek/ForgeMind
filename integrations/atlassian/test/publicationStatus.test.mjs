import assert from "node:assert/strict";
import test from "node:test";
import { fingerprintConfluencePageDraft } from "../src/publication/contentFingerprint.ts";
import { determinePublicationStatus, inspectPublication } from "../src/publication/publicationStatus.ts";
import { ConfluenceServiceError } from "../src/confluence/confluenceService.ts";

const mapping = (fingerprint = "same") => ({ schemaVersion: 1, projectId: "project", pageId: "page", spaceId: "space", pageTitle: "Title", lastPublishedAt: "2026-11-04T12:00:00.000Z", sourceSnapshotSchemaVersion: 1, sourceGeneratedAt: "2026-11-04T11:00:00.000Z", contentFingerprint: fingerprint });
const page = { pageId: "page", spaceId: "space", title: "Title", version: 3 };

test("reports NOT PUBLISHED, UP TO DATE, and OUTDATED", () => {
  assert.equal(determinePublicationStatus(null, "same"), "NOT_PUBLISHED");
  assert.equal(determinePublicationStatus(mapping(), "same"), "UP_TO_DATE");
  assert.equal(determinePublicationStatus(mapping(), "changed"), "OUTDATED");
});

test("reports missing page, access denial, API error, and malformed storage as safe states", async () => {
  const missing = await inspectPublication(async () => mapping(), async () => { throw new ConfluenceServiceError("MAPPED_PAGE_MISSING", "missing"); }, "project", "same");
  assert.equal(missing.status, "MAPPED_PAGE_MISSING");
  const denied = await inspectPublication(async () => mapping(), async () => { throw new ConfluenceServiceError("MAPPED_PAGE_ACCESS_DENIED", "denied"); }, "project", "same");
  assert.equal(denied.status, "ACCESS_ERROR");
  const apiError = await inspectPublication(async () => mapping(), async () => { throw new Error("network"); }, "project", "same");
  assert.equal(apiError.status, "ACCESS_ERROR");
  const malformed = await inspectPublication(async () => { throw new Error("malformed"); }, async () => page, "project", "same");
  assert.equal(malformed.status, "ACCESS_ERROR");
});

test("verifies a healthy mapped page before calculating freshness", async () => {
  const result = await inspectPublication(async () => mapping(), async (pageId) => ({ ...page, pageId }), "project", "same");
  assert.equal(result.status, "UP_TO_DATE");
  assert.equal(result.page.version, 3);
});

test("fingerprint is stable for ordering and Unicode and changes with publishable content", () => {
  const first = fingerprintConfluencePageDraft({ title: "Żmija — Brain", body: "<p>One</p>\n<p>Two</p>" });
  const identical = fingerprintConfluencePageDraft({ title: "Żmija — Brain", body: "<p>One</p>\n<p>Two</p>" });
  const changed = fingerprintConfluencePageDraft({ title: "Żmija — Brain", body: "<p>Two</p>\n<p>One</p>" });
  assert.equal(first, identical);
  assert.match(first, /^fnv1a64-v1:[0-9a-f]{16}$/);
  assert.notEqual(first, changed);
});
