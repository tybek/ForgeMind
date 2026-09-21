import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFeatureContract,
  deleteFeatureContractDraft,
  draftFeatureContractWithAi,
  implementationBrief,
  loadFeatureContracts,
  loadFeatureContractSources,
  setFeatureContractStatus,
  updateFeatureContract,
  type FeatureContract,
} from "./featureContracts";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const contract: FeatureContract = {
  id: "contract-1",
  createdAt: "2026-09-21T12:00:00Z",
  updatedAt: "2026-09-21T12:00:00Z",
  title: "Uncertain enemy sound information",
  sources: {
    origin: { sourceType: "ALIGNMENT", sourceId: "alignment-1", title: "Uncertain enemy sound information", statement: "Sound alone never grants exact player coordinates.", status: "UNVERIFIED", area: "systems", provenance: "MANUAL_ASSESSMENT" },
    intent: { sourceType: "COMPENDIUM", sourceId: "knowledge-1", title: "Uncertain enemy sound information", statement: "Sound alone never grants exact player coordinates.", status: "LOCKED", area: "systems", provenance: "DOCUMENTED" },
    alignment: { alignmentId: "alignment-1", status: "UNVERIFIED", rationale: "Component presence does not prove runtime knowledge handling.", createdAt: "2026-09-21T11:00:00Z", reviewState: "APPROVED" },
    realityEvidence: [
      { evidenceId: "unity:component:HearingPerception", source: "UNITY", summary: "Unity component type HearingPerception is present; presence does not prove runtime behavior.", capturedAt: "2026-09-21T10:00:00Z", provenance: "VERIFIED_FROM_UNITY" },
    ],
  },
  goal: "Keep enemy sound knowledge uncertain.",
  currentRealitySummary: "Approved Alignment Review is UNVERIFIED.",
  affectedSystems: ["Enemy sound perception", "Enemy knowledge handling"],
  requiredBehavior: ["Sound-only knowledge omits exact player coordinates."],
  outOfScope: ["Do not change vision perception."],
  risks: ["Pursuit logic may expect exact positions."],
  acceptanceCriteria: ["Sound-only knowledge contains no exact coordinate."],
  deterministicTests: ["Test that a sound-only observation stores an uncertain region."],
  implementationNotes: "Preserve gameplay authority.",
  likelyAffectedEvidenceIds: ["unity:component:HearingPerception"],
  status: "DRAFT",
  reviewState: "PENDING_REVIEW",
};

describe("Feature Contracts platform boundary", () => {
  beforeEach(() => vi.mocked(invoke).mockReset());

  it("uses narrow native commands for source, document, creation, editing, AI proposal, deletion, and status", async () => {
    vi.mocked(invoke).mockResolvedValue({});
    await loadFeatureContractSources("D:\\Game");
    await loadFeatureContracts("D:\\Game");
    await createFeatureContract("D:\\Game", "project-1", "ALIGNMENT", "alignment-1");
    await updateFeatureContract("D:\\Game", "project-1", "contract-1", {
      title: contract.title,
      goal: contract.goal,
      affectedSystems: contract.affectedSystems,
      requiredBehavior: contract.requiredBehavior,
      outOfScope: contract.outOfScope,
      risks: contract.risks,
      acceptanceCriteria: contract.acceptanceCriteria,
      deterministicTests: contract.deterministicTests,
      implementationNotes: contract.implementationNotes,
      likelyAffectedEvidenceIds: contract.likelyAffectedEvidenceIds,
    });
    await draftFeatureContractWithAi("D:\\Game", "project-1", "contract-1", "test/model", {
      title: contract.title,
      goal: contract.goal,
      affectedSystems: contract.affectedSystems,
      requiredBehavior: contract.requiredBehavior,
      outOfScope: contract.outOfScope,
      risks: contract.risks,
      acceptanceCriteria: contract.acceptanceCriteria,
      deterministicTests: contract.deterministicTests,
      implementationNotes: contract.implementationNotes,
      likelyAffectedEvidenceIds: contract.likelyAffectedEvidenceIds,
    });
    await deleteFeatureContractDraft("D:\\Game", "project-1", "contract-1");
    await setFeatureContractStatus("D:\\Game", "project-1", "contract-1", "APPROVED");
    expect(invoke).toHaveBeenNthCalledWith(1, "load_feature_contract_sources", { path: "D:\\Game" });
    expect(invoke).toHaveBeenNthCalledWith(2, "load_feature_contracts", { path: "D:\\Game" });
    expect(invoke).toHaveBeenNthCalledWith(3, "create_feature_contract", { request: { rootPath: "D:\\Game", projectId: "project-1", sourceType: "ALIGNMENT", sourceId: "alignment-1" } });
    expect(invoke).toHaveBeenNthCalledWith(5, "draft_feature_contract_with_ai", expect.objectContaining({ request: expect.objectContaining({ modelId: "test/model" }) }));
    expect(invoke).toHaveBeenNthCalledWith(6, "delete_feature_contract_draft", { request: { rootPath: "D:\\Game", projectId: "project-1", contractId: "contract-1" } });
    expect(invoke).toHaveBeenNthCalledWith(7, "set_feature_contract_status", { request: { rootPath: "D:\\Game", projectId: "project-1", contractId: "contract-1", status: "APPROVED" } });
  });

  it("renders an implementation brief from captured facts and user-authored scope", () => {
    const brief = implementationBrief(contract);
    expect(brief).toContain("## Goal\n\nKeep enemy sound knowledge uncertain.");
    expect(brief).toContain("Approved Alignment UNVERIFIED: Component presence does not prove runtime knowledge handling.");
    expect(brief).toContain("Evidence-supported location: Unity component type HearingPerception is present");
    expect(brief).toContain("## Tests required\n\n- Test that a sound-only observation stores an uncertain region.");
    expect(brief).toContain("## Acceptance criteria\n\n- Sound-only knowledge contains no exact coordinate.");
    expect(brief).toContain("## Stop condition");
  });

  it("does not invent a file path when captured Reality does not support one", () => {
    const brief = implementationBrief({
      ...contract,
      affectedSystems: [],
      sources: { ...contract.sources, alignment: undefined, realityEvidence: [] },
      likelyAffectedEvidenceIds: [],
    });
    expect(brief).toContain("No file or component location is established by current Reality evidence.");
    expect(brief).not.toMatch(/[A-Z]:\\/);
    expect(brief).not.toContain("src/");
  });
});
