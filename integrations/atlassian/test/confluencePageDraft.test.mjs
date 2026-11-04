import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildConfluencePageDraft,
  defaultConfluencePageTitle,
  validateConfluencePageTitle,
} from "../src/confluence/confluencePageDraft.ts";

const fixturePath = fileURLToPath(new URL("../../../contracts/fixtures/atlassian-project-snapshot-v1.json", import.meta.url));
const fixture = () => JSON.parse(readFileSync(fixturePath, "utf8"));

test("converts the golden snapshot into a deterministic Confluence page draft", () => {
  const draft = buildConfluencePageDraft(fixture());
  assert.equal(draft.title, "Glass Harbor — Żmija — Project Brain");
  assert.equal(draft.sourceProjectId, "11111111-1111-4111-8111-111111111111");
  assert.equal(draft.sourceSchemaVersion, 1);
  assert.equal(draft.sectionCount, 4);
  assert.equal(draft.entryCount, 4);
  assert.ok(draft.body.indexOf("Project Knowledge") < draft.body.indexOf("Decisions"));
  assert.ok(draft.body.indexOf("Decisions") < draft.body.indexOf("Open Questions"));
  assert.ok(draft.body.indexOf("Open Questions") < draft.body.indexOf("Specialist Analysis"));
});

test("renders Unicode, authority, safe provenance, and references", () => {
  const draft = buildConfluencePageDraft(fixture());
  assert.match(draft.body, /Glass Harbor — Żmija/);
  assert.match(draft.body, /<strong>Authority:<\/strong> DOCUMENTED/);
  assert.match(draft.body, /docs\/design\/signals\.md/);
  assert.match(draft.body, /RELATED_KNOWLEDGE: Signal fog/);
  assert.deepEqual(draft.authoritySummary, [
    { authority: "AI_ANALYSIS", count: 1 },
    { authority: "DECISION_RECORD", count: 1 },
    { authority: "DOCUMENTED", count: 1 },
    { authority: "UNRESOLVED", count: 1 },
  ]);
});

test("keeps empty sections visible", () => {
  const value = fixture();
  value.sections.forEach((section) => { section.entries = []; });
  const draft = buildConfluencePageDraft(value);
  assert.equal(draft.entryCount, 0);
  assert.equal(draft.body.match(/<p><em>No entries\.<\/em><\/p>/g)?.length, 4);
});

test("escapes unsafe storage markup from every rendered text field", () => {
  const value = fixture();
  value.project.name = "<script>alert('project')</script> & Harbor";
  value.sections[0].entries[0].title = "<img src=x onerror=alert(1)>";
  value.sections[0].entries[0].body = "Use <b>literal</b> & safe text.";
  const draft = buildConfluencePageDraft(value, "Safe title");
  assert.doesNotMatch(draft.body, /<script>|<img|<b>literal<\/b>/);
  assert.match(draft.body, /&lt;script&gt;/);
  assert.match(draft.body, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(draft.body, /&lt;b&gt;literal&lt;\/b&gt; &amp; safe text/);
});

test("does not render absolute documented paths or unknown provider metadata", () => {
  const value = fixture();
  value.sections[0].entries[0].provenance.documentedSources.push({ sourceId: "C:\\private\\workspace\\notes.md" });
  value.sections[3].entries[0].providerMetadata = { model: "secret-provider-model" };
  value.providerResponse = "raw-secret-response";
  const body = buildConfluencePageDraft(value).body;
  assert.doesNotMatch(body, /private\\workspace|secret-provider-model|raw-secret-response|C:\\private/);
});

test("generates and validates bounded editable titles", () => {
  const generated = defaultConfluencePageTitle("A".repeat(400));
  assert.equal(generated.length, 255);
  assert.match(generated, / — Project Brain$/);
  assert.equal(validateConfluencePageTitle(""), "Page title is required.");
  assert.match(validateConfluencePageTitle("A".repeat(256)), /255 characters or fewer/);
  assert.equal(validateConfluencePageTitle("ForgeMind CONF-1 Synthetic Test — Project Brain"), null);
});
