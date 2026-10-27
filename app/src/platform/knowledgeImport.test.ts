import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyKnowledgeImport,
  getKnowledgeImportPreflight,
  projectRelativeMarkdownPaths,
  runKnowledgeImport,
} from "./knowledgeImport";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("Knowledge Import platform boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("converts only contained .md selections to stable project-relative source IDs", () => {
    expect(projectRelativeMarkdownPaths("D:\\Games\\Sample", [
      "D:\\Games\\Sample\\docs\\lore.md",
      "D:/Games/Sample/design.md",
    ])).toEqual(["docs/lore.md", "design.md"]);
    expect(() => projectRelativeMarkdownPaths("D:\\Games\\Sample", ["D:\\Games\\Other\\lore.md"])).toThrow(/active project/);
    expect(() => projectRelativeMarkdownPaths("D:\\Games\\Sample", ["D:\\Games\\Sample\\lore.markdown"])).toThrow(/\.md/);
    expect(() => projectRelativeMarkdownPaths("D:\\Games\\Sample", Array.from({ length: 11 }, (_, index) => `D:\\Games\\Sample\\${index}.md`))).toThrow(/1 and 10/);
  });

  it("uses separate preflight, one-shot extraction, and explicit apply commands", async () => {
    vi.mocked(invoke).mockResolvedValue({});
    const request = { rootPath: "D:\\Games\\Sample", projectId: "project", relativePaths: ["docs/lore.md"], modelId: "nvidia/nemotron" };
    await getKnowledgeImportPreflight(request);
    await runKnowledgeImport(request);
    await applyKnowledgeImport(request.rootPath, request.projectId, [{ id: "candidate-1", type: "KNOWLEDGE", title: "Lore", content: "A fact.", section: "world_narrative", sourceRefs: ["docs/lore.md"], note: "Explicit." }]);
    expect(invoke).toHaveBeenNthCalledWith(1, "get_knowledge_import_preflight", { request });
    expect(invoke).toHaveBeenNthCalledWith(2, "run_knowledge_import", { request });
    expect(invoke).toHaveBeenNthCalledWith(3, "apply_knowledge_import", { request: expect.objectContaining({ candidates: [expect.objectContaining({ id: "candidate-1" })] }) });
  });
});
