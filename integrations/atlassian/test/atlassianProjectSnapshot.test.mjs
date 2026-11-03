import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseAndValidateAtlassianProjectSnapshot, validateAtlassianProjectSnapshot } from "../src/contracts/atlassianProjectSnapshot.ts";

const fixturePath = fileURLToPath(new URL("../../../contracts/fixtures/atlassian-project-snapshot-v1.json", import.meta.url));
const fixture = () => JSON.parse(readFileSync(fixturePath, "utf8"));

test("accepts the shared Rust/TypeScript golden fixture with Unicode", () => {
  const result = validateAtlassianProjectSnapshot(fixture());
  assert.equal(result.ok, true);
  assert.equal(result.sectionCount, 4);
  assert.equal(result.entryCount, 4);
  assert.match(result.snapshot.project.name, /Żmija/);
});

test("accepts the fixed hierarchy with empty sections", () => {
  const value = fixture();
  value.sections.forEach((section) => { section.entries = []; });
  const result = validateAtlassianProjectSnapshot(value);
  assert.equal(result.ok, true);
  assert.equal(result.entryCount, 0);
});

test("accepts documented Open Question authority from Compendium", () => {
  const value = fixture();
  const question = value.sections[2].entries[0];
  question.authority = "DOCUMENTED";
  question.provenance.type = "DOCUMENTED";
  question.provenance.source = "knowledge_import";
  assert.equal(validateAtlassianProjectSnapshot(value).ok, true);
});

const invalidCases = [
  ["unsupported version", (value) => { value.schemaVersion = 2; }],
  ["missing project identity", (value) => { value.project.projectId = ""; }],
  ["duplicate IDs", (value) => { value.sections[1].entries[0].id = value.sections[0].entries[0].id; }],
  ["unknown references", (value) => { value.sections[1].entries[0].references[0].targetId = "missing"; }],
  ["changed authority", (value) => { value.sections[3].entries[0].authority = "DECISION_RECORD"; }],
  ["absolute paths", (value) => { value.sections[0].entries[0].provenance.documentedSources[0].sourceId = "C:\\private\\notes.md"; }],
];

for (const [label, mutate] of invalidCases) test(`rejects ${label}`, () => {
  const value = fixture();
  mutate(value);
  assert.equal(validateAtlassianProjectSnapshot(value).ok, false);
});

test("reports malformed JSON without retaining it", () => {
  assert.deepEqual(parseAndValidateAtlassianProjectSnapshot("{secret"), { ok: false, errors: ["Snapshot is not valid JSON."] });
});
