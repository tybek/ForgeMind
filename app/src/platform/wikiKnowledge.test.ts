import { describe, expect, it } from "vitest";
import type { Decision } from "./decisions";
import type { KnowledgeEntry } from "./projectKnowledge";
import { buildWikiItems, filterWikiItems } from "./wikiKnowledge";

const baseEntry: KnowledgeEntry = {
  id: "knowledge-1",
  area: "systems",
  title: "Directional cover",
  statement: "Cover is readable before commitment.",
  status: "LOCKED",
  provenance: "USER_STATED",
  source: "project_interview",
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-02T10:00:00Z",
};

const proposedDecision: Decision = {
  id: "decision-1",
  title: "Keep the tactical grid",
  statement: "Movement stays grid based.",
  rationale: "It keeps planning legible.",
  status: "PROPOSED",
  area: "systems",
  author: "Designer",
  createdAt: "2026-09-03T10:00:00Z",
  approvedAt: null,
  relatedKnowledgeEntryIds: [],
};

describe("Wiki knowledge projection", () => {
  it("keeps authority and lifecycle distinctions while searching human-readable fields", () => {
    const items = buildWikiItems([
      baseEntry,
      { ...baseEntry, id: "question-1", area: "open_questions", title: "Enemy cadence?", statement: "How often should enemies reposition?", status: "TBD", provenance: "UNRESOLVED", source: "manual_entry" },
      { ...baseEntry, id: "old-1", title: "Old cover rule", status: "DEPRECATED", provenance: "MANUAL", source: "manual_entry" },
    ], [proposedDecision], []);

    expect(filterWikiItems(items, { category: "all", query: "project interview", type: "ALL", authority: "ALL", lifecycle: "ALL" }).map((item) => item.title)).toEqual(["Directional cover"]);
    expect(filterWikiItems(items, { category: "open_questions", query: "", type: "OPEN_QUESTION", authority: "UNRESOLVED", lifecycle: "UNRESOLVED" })[0]?.authorityLabel).toBe("Unresolved project question");
    expect(filterWikiItems(items, { category: "decisions", query: "", type: "ALL", authority: "DECISION_RECORD", lifecycle: "PROPOSED" })[0]?.authorityLabel).toContain("not established");
    expect(filterWikiItems(items, { category: "all", query: "", type: "ALL", authority: "ALL", lifecycle: "CURRENT" }).some((item) => item.title === "Old cover rule")).toBe(false);
    expect(filterWikiItems(items, { category: "all", query: "", type: "ALL", authority: "ALL", lifecycle: "HISTORICAL" }).map((item) => item.title)).toEqual(["Old cover rule"]);
  });

  it("projects and filters 500 entries deterministically without truncating the result", () => {
    const knowledge = Array.from({ length: 500 }, (_, index): KnowledgeEntry => ({
      ...baseEntry,
      id: `knowledge-${index}`,
      title: `System note ${String(index).padStart(3, "0")}`,
      statement: index === 417 ? "Unique traversal cadence" : `System statement ${index}`,
    }));
    const items = buildWikiItems(knowledge, [], []);
    expect(items).toHaveLength(500);
    expect(filterWikiItems(items, { category: "systems", query: "unique traversal", type: "KNOWLEDGE", authority: "USER_STATED", lifecycle: "CURRENT" }).map((item) => item.sourceId)).toEqual(["knowledge-417"]);
    expect(items[0]?.title).toBe("System note 000");
    expect(items[499]?.title).toBe("System note 499");
  });

  it("shows imported records as documented with project-relative source trace", () => {
    const imported: KnowledgeEntry = {
      ...baseEntry,
      id: "imported-1",
      title: "Beacon Wardens",
      provenance: "DOCUMENTED",
      source: "knowledge_import",
      documentedSources: [{ sourceId: "docs/colony.md", section: "Beacon Wardens" }],
    };
    const importedDecision: Decision = {
      ...proposedDecision,
      id: "imported-decision",
      author: "Knowledge Import",
      documentedSources: [{ sourceId: "docs/colony.md", section: "Recorded decision" }],
    };
    const items = buildWikiItems([imported], [importedDecision], []);
    const knowledge = filterWikiItems(items, { category: "systems", query: "colony", type: "KNOWLEDGE", authority: "DOCUMENTED", lifecycle: "CURRENT" })[0];
    expect(knowledge?.provenanceLabel).toContain("Documented");
    expect(knowledge?.sourceLabel).toBe("Reviewed Markdown import");
    expect(knowledge?.detailSections[0]?.items).toEqual(["docs/colony.md · Beacon Wardens"]);
    expect(items.find((item) => item.sourceId === importedDecision.id)?.detailSections[1]?.items).toEqual(["docs/colony.md · Recorded decision"]);
  });
});
