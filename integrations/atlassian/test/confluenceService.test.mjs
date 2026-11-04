import assert from "node:assert/strict";
import test from "node:test";
import { buildConfluencePageDraft } from "../src/confluence/confluencePageDraft.ts";
import {
  ConfluenceServiceError,
  createConfluenceService,
  createSingleFlightPublisher,
} from "../src/confluence/confluenceService.ts";

const response = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: String(status),
  async json() {
    if (payload instanceof Error) throw payload;
    return payload;
  },
});

const draft = buildConfluencePageDraft({
  schemaVersion: 1,
  generatedAt: "2026-11-03T12:00:00.000Z",
  sourceExport: { schemaVersion: 1 },
  project: { projectId: "project-id", name: "Synthetic" },
  sections: [
    { id: "project-knowledge", title: "Project Knowledge", order: 0, entries: [] },
    { id: "decisions", title: "Decisions", order: 1, entries: [] },
    { id: "open-questions", title: "Open Questions", order: 2, entries: [] },
    { id: "specialist-analysis", title: "Specialist Analysis", order: 3, entries: [] },
  ],
});

test("lists and sorts visible Confluence spaces from REST v2", async () => {
  const calls = [];
  const service = createConfluenceService(async (path, init) => {
    calls.push({ path, init });
    return response(200, { results: [
      { id: "2", key: "ZED", name: "Zeta" },
      { id: "1", key: "ALPHA", name: "Alpha" },
    ], _links: {} });
  });
  assert.deepEqual(await service.listSpaces(), [
    { id: "1", key: "ALPHA", name: "Alpha" },
    { id: "2", key: "ZED", name: "Zeta" },
  ]);
  assert.equal(calls[0].path, "/wiki/api/v2/spaces?limit=250&status=current");
  assert.equal(calls[0].init, undefined);
});

test("follows safe spaces pagination and rejects malformed results", async () => {
  const service = createConfluenceService(async (path) => path.includes("cursor=next")
    ? response(200, { results: [{ id: "2", key: "B", name: "Beta" }], _links: {} })
    : response(200, { results: [{ id: "1", key: "A", name: "Alpha" }], _links: { next: "/wiki/api/v2/spaces?cursor=next" } }));
  assert.equal((await service.listSpaces()).length, 2);

  const malformed = createConfluenceService(async () => response(200, { results: "not-an-array" }));
  await assert.rejects(malformed.listSpaces(), (error) => error instanceof ConfluenceServiceError && error.code === "MALFORMED_RESPONSE");
});

test("constructs one storage-format create-page request and parses the result", async () => {
  let call;
  const service = createConfluenceService(async (path, init) => {
    call = { path, init };
    return response(200, {
      id: "98765",
      title: draft.title,
      spaceId: "space-1",
      _links: { base: "https://one-atlas-ljtg.atlassian.net", webui: "/wiki/spaces/DEMO/pages/98765" },
    });
  });
  const result = await service.createPage({ spaceId: "space-1", draft });
  assert.equal(call.path, "/wiki/api/v2/pages?root-level=true");
  assert.equal(call.init.method, "POST");
  const body = JSON.parse(call.init.body);
  assert.deepEqual(body, {
    spaceId: "space-1",
    status: "current",
    title: draft.title,
    body: { representation: "storage", value: draft.body },
  });
  assert.deepEqual(result, {
    pageId: "98765",
    title: draft.title,
    spaceId: "space-1",
    url: "https://one-atlas-ljtg.atlassian.net/wiki/spaces/DEMO/pages/98765",
  });
});

test("returns safe actionable permission and API failures", async () => {
  const forbidden = createConfluenceService(async () => response(403, {}));
  await assert.rejects(forbidden.listSpaces(), (error) => error.code === "CONFLUENCE_PERMISSION_DENIED" && /read:space:confluence/.test(error.message));
  await assert.rejects(forbidden.createPage({ spaceId: "space", draft }), (error) => error.code === "CONFLUENCE_PERMISSION_DENIED" && /write:page:confluence/.test(error.message));

  const rejected = createConfluenceService(async () => response(400, {}));
  await assert.rejects(rejected.createPage({ spaceId: "space", draft }), (error) => error.code === "PAGE_REJECTED" && /same title/.test(error.message));

  const serverFailure = createConfluenceService(async () => response(503, {}));
  await assert.rejects(serverFailure.createPage({ spaceId: "space", draft }), (error) => error.code === "CREATE_RESULT_UNKNOWN" && /Check Confluence/.test(error.message));
});

test("treats malformed or unreachable create results as outcome-unknown", async () => {
  const malformed = createConfluenceService(async () => response(200, { title: draft.title }));
  await assert.rejects(malformed.createPage({ spaceId: "space", draft }), (error) => error.code === "MALFORMED_CREATE_RESPONSE" && /publishing again/.test(error.message));

  const unreachable = createConfluenceService(async () => { throw new Error("token-and-stack-must-not-leak"); });
  await assert.rejects(unreachable.createPage({ spaceId: "space", draft }), (error) => error.code === "CREATE_RESULT_UNKNOWN" && !error.message.includes("token-and-stack"));
});

test("single-flight publisher prevents UI double submission while POST is pending", async () => {
  let resolveRequest;
  let postCount = 0;
  const service = createConfluenceService(async () => {
    postCount += 1;
    return await new Promise((resolve) => { resolveRequest = resolve; });
  });
  const publisher = createSingleFlightPublisher(service);
  const first = publisher.publish({ spaceId: "space", draft });
  assert.equal(publisher.isPending(), true);
  await assert.rejects(publisher.publish({ spaceId: "space", draft }), (error) => error.code === "PUBLISH_IN_PROGRESS");
  assert.equal(postCount, 1);
  resolveRequest(response(200, { id: "page", title: draft.title, spaceId: "space" }));
  assert.equal((await first).pageId, "page");
  assert.equal(publisher.isPending(), false);
});
