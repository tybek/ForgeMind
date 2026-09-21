import { invoke } from "@tauri-apps/api/core";

export type UnityProjectStatus = "DETECTED" | "NOT_DETECTED" | "INSPECTION_FAILED";
export type UnityVersionStatus = "AVAILABLE" | "MISSING" | "INVALID";
export type GroundTruthManifestStatus = "NOT_GENERATED" | "AVAILABLE" | "INVALID_OR_UNSUPPORTED";
export type GroundTruthCategory =
  | "SCENES"
  | "GAME_OBJECTS"
  | "COMPONENTS"
  | "SERIALIZED_FIELDS"
  | "PREFAB_REFERENCES"
  | "SCRIPTABLE_OBJECTS"
  | "TAGS_LAYERS"
  | "INPUT_ACTIONS"
  | "TESTS";
export type GroundTruthCoverageIssueKind = "BOUNDED_TRUNCATION" | "UNSUPPORTED" | "ERROR";

export interface GroundTruthCoverageIssue {
  category: GroundTruthCategory;
  code: string;
  kind: GroundTruthCoverageIssueKind;
}

export interface UnityProjectEvidence {
  assets: boolean;
  packages: boolean;
  projectSettings: boolean;
}

export interface GroundTruthObservationCounts {
  scenes: number;
  gameObjects: number;
  components: number;
  serializedFields: number;
  prefabReferences: number;
  scriptableObjects: number;
  tags: number;
  layers: number;
  inputActions: number;
  tests: number;
}

export interface GroundTruthManifestSummary {
  formatVersion: number;
  generatedAt: string;
  unityVersion: string;
  coverageCategories: GroundTruthCategory[];
  coverageErrorCount: number;
  coverageIssues: GroundTruthCoverageIssue[];
  observationCounts: GroundTruthObservationCounts;
}

export interface UnityGroundTruthResult {
  status: UnityProjectStatus;
  evidence: UnityProjectEvidence;
  projectVersion: { status: UnityVersionStatus; version?: string };
  manifest: { status: GroundTruthManifestStatus; summary?: GroundTruthManifestSummary; message?: string };
  message?: string;
}

export function inspectUnityGroundTruth(path: string): Promise<UnityGroundTruthResult> {
  return invoke<UnityGroundTruthResult>("inspect_unity_groundtruth", { path });
}
