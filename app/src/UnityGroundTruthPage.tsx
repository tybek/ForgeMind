import { useEffect, useState } from "react";
import { Button } from "./designSystem";
import {
  inspectUnityGroundTruth,
  type GroundTruthCategory,
  type GroundTruthCoverageIssue,
  type GroundTruthManifestSummary,
  type UnityGroundTruthResult,
} from "./platform/unityGroundTruth";
import {
  disconnectRealityConnection,
  getRealityConnections,
  selectRealityFolder,
  setRealityConnection,
  type RealityConnectionSummary,
} from "./platform/realityConnections";

interface UnityWorkspace {
  path: string;
  projectId: string;
}

function messageFromError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unity GroundTruth could not be inspected. The ForgeMind workspace remains usable.";
}

function present(value: boolean): string {
  return value ? "Present" : "Missing";
}

function manifestStatus(result: UnityGroundTruthResult): string {
  switch (result.manifest.status) {
    case "AVAILABLE": return "Available";
    case "NOT_ATTACHED": return "Not attached";
    case "INVALID_OR_UNSUPPORTED": return "Invalid";
    default: return "Not generated";
  }
}

function coverageStatus(result: UnityGroundTruthResult): string {
  if (result.manifest.status !== "AVAILABLE") {
    return result.status === "DETECTED" ? "Portable inspection only" : "No evidence";
  }
  return result.manifest.summary?.coverageIssues.length ? "Partial" : "Verified";
}

const categoryLabels: Record<GroundTruthCategory, string> = {
  SCENES: "Scenes",
  GAME_OBJECTS: "GameObjects",
  COMPONENTS: "Components",
  SERIALIZED_FIELDS: "Fields",
  PREFAB_REFERENCES: "Prefabs",
  SCRIPTABLE_OBJECTS: "ScriptableObjects",
  TAGS_LAYERS: "Tags / layers",
  INPUT_ACTIONS: "Input Actions",
  TESTS: "Tests",
};

function isTruncated(category: GroundTruthCategory, issues: GroundTruthCoverageIssue[]): boolean {
  return issues.some((issue) => issue.category === category && issue.kind === "BOUNDED_TRUNCATION");
}

function observationCount(count: number, category: GroundTruthCategory, issues: GroundTruthCoverageIssue[]): string {
  return isTruncated(category, issues) ? `${count.toLocaleString("en-US")}+ / partial coverage` : count.toLocaleString("en-US");
}

function issueLabel(issue: GroundTruthCoverageIssue): string {
  switch (issue.kind) {
    case "BOUNDED_TRUNCATION": return "BOUNDED / TRUNCATED";
    case "UNSUPPORTED": return "UNSUPPORTED";
    default: return "ERROR";
  }
}

function issueDescription(issue: GroundTruthCoverageIssue): string {
  switch (issue.kind) {
    case "BOUNDED_TRUNCATION": return "The exporter reached its safe collection limit. The displayed count is a minimum, not an exact total.";
    case "UNSUPPORTED": return "This evidence source is not supported by the current Unity export environment.";
    default: return "The exporter could not fully inspect this category.";
  }
}

function ManifestSummary({ summary }: { summary: GroundTruthManifestSummary }) {
  const counts = summary.observationCounts;
  return (
    <section className="unity-card" aria-labelledby="unity-manifest-summary-title">
      <div className="unity-card-heading">
        <div><span className="evidence-label evidence-verified">VERIFIED FROM UNITY</span><h3 id="unity-manifest-summary-title">Imported snapshot summary</h3></div>
        <span>Format v{summary.formatVersion}</span>
      </div>
      <dl className="unity-metadata">
        <div><dt>Generated</dt><dd><time dateTime={summary.generatedAt}>{summary.generatedAt}</time></dd></div>
        <div><dt>Exported Unity version</dt><dd>{summary.unityVersion}</dd></div>
        <div><dt>Coverage</dt><dd>{summary.coverageCategories.length} categories</dd></div>
        <div><dt>Coverage issues</dt><dd>{summary.coverageIssues.length}</dd></div>
      </dl>
      <div className="unity-counts" aria-label="GroundTruth observation counts">
        <span>Scenes <strong>{observationCount(counts.scenes, "SCENES", summary.coverageIssues)}</strong></span>
        <span>GameObjects <strong>{observationCount(counts.gameObjects, "GAME_OBJECTS", summary.coverageIssues)}</strong></span>
        <span>Components <strong>{observationCount(counts.components, "COMPONENTS", summary.coverageIssues)}</strong></span>
        <span>Fields <strong>{observationCount(counts.serializedFields, "SERIALIZED_FIELDS", summary.coverageIssues)}</strong></span>
        <span>Prefabs <strong>{observationCount(counts.prefabReferences, "PREFAB_REFERENCES", summary.coverageIssues)}</strong></span>
        <span>ScriptableObjects <strong>{observationCount(counts.scriptableObjects, "SCRIPTABLE_OBJECTS", summary.coverageIssues)}</strong></span>
        <span>Tags / layers <strong>{observationCount(counts.tags + counts.layers, "TAGS_LAYERS", summary.coverageIssues)}</strong></span>
        <span>Input Actions <strong>{observationCount(counts.inputActions, "INPUT_ACTIONS", summary.coverageIssues)}</strong></span>
        <span>Tests <strong>{observationCount(counts.tests, "TESTS", summary.coverageIssues)}</strong></span>
      </div>
      {summary.coverageIssues.length > 0 ? (
        <section className="unity-coverage-issues" aria-labelledby="unity-coverage-issues-title">
          <h4 id="unity-coverage-issues-title">Coverage issues</h4>
          <ul>
            {summary.coverageIssues.map((issue) => (
              <li key={`${issue.category}:${issue.code}`}>
                <div><strong>{issueLabel(issue)}</strong><span>{categoryLabels[issue.category]}</span></div>
                <p>{issueDescription(issue)}</p>
                <code>{issue.code}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

export function UnityGroundTruthPage({
  workspace,
  onResult,
}: {
  workspace: UnityWorkspace;
  onResult?: (result: UnityGroundTruthResult) => void;
}) {
  const [result, setResult] = useState<UnityGroundTruthResult | null>(null);
  const [connection, setConnection] = useState<RealityConnectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [connections, nextResult] = await Promise.all([
        getRealityConnections(workspace.path),
        inspectUnityGroundTruth(workspace.path),
      ]);
      setConnection(connections.unity);
      setResult(nextResult);
      onResult?.(nextResult);
    } catch (inspectionError) {
      setResult(null);
      setError(messageFromError(inspectionError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [workspace.path]);

  async function chooseConnection() {
    setError(null);
    try {
      const selected = await selectRealityFolder("UNITY");
      if (selected === null) return;
      await setRealityConnection(workspace.path, workspace.projectId, "UNITY", selected);
      await refresh();
    } catch (connectionError) {
      setError(messageFromError(connectionError));
    }
  }

  async function disconnect() {
    setError(null);
    try {
      await disconnectRealityConnection(workspace.path, workspace.projectId, "UNITY");
      await refresh();
    } catch (connectionError) {
      setError(messageFromError(connectionError));
    }
  }

  return (
    <div className="unity-page">
      <section className="unity-intro">
        <div>
          <span className="section-label">Unity Reality</span>
          <h2>Unity GroundTruth</h2>
          <p>Read-only implementation evidence from the active workspace and an optional project-owned export. ForgeMind does not modify the Unity project.</p>
        </div>
        <div className="reality-actions">
          <Button icon="folder" onClick={() => void chooseConnection()}>
            {connection?.configured ? "Change Unity Project" : "Select Unity Project"}
          </Button>
          <Button icon="refresh" loading={loading} loadingLabel="Inspecting..." onClick={() => void refresh()}>
            Refresh Evidence
          </Button>
          {connection?.configured ? <button className="text-button" type="button" onClick={() => void disconnect()}>Disconnect</button> : null}
        </div>
      </section>

      <details className="evidence-help">
        <summary>About evidence types</summary>
        <section className="evidence-legend" aria-label="Evidence authority legend">
          <article><span className="evidence-label evidence-verified">VERIFIED FROM UNITY</span><p>Observed project structure or validated exported evidence.</p></article>
          <article><span className="evidence-label evidence-documented">DOCUMENTED</span><p>Project Intent belongs in Compendium and Decisions, not this snapshot.</p></article>
          <article><span className="evidence-label evidence-inference">AI INFERENCE</span><p>No AI inference is generated by GroundTruth export or import.</p></article>
        </section>
      </details>

      {error ? <div className="unity-state unity-state-error" role="alert">{error}</div> : null}
      {!error && loading && result === null ? <p aria-live="polite">Inspecting Unity evidence...</p> : null}
      {!error && result ? (
        <>
          <section className="unity-summary" aria-label="Unity project summary">
            <article><span>Connection</span><strong className={result.status === "DETECTED" ? "reality-status-positive" : result.status === "NOT_DETECTED" ? "reality-status-muted" : "reality-status-error"}>{result.status === "DETECTED" ? "Connected" : result.status === "NOT_DETECTED" ? "Not connected" : "Error"}</strong></article>
            <article><span>Unity version</span><strong>{result.projectVersion.version ?? "—"}</strong></article>
            <article><span>GroundTruth manifest</span><strong className={result.manifest.status === "INVALID_OR_UNSUPPORTED" ? "reality-status-error" : result.manifest.status === "AVAILABLE" ? "reality-status-positive" : "reality-status-muted"}>{manifestStatus(result)}</strong></article>
            <article><span>Coverage</span><strong className={coverageStatus(result) === "Verified" ? "reality-status-positive" : "reality-status-muted"}>{coverageStatus(result)}</strong></article>
          </section>

          {result.status === "NOT_DETECTED" ? (
            <section className="unity-state" role="status">
              <span className="reality-status reality-status-muted">NOT CONNECTED</span>
              <h3>No Unity project connected</h3>
              <p>{result.message}</p>
              <button className="primary-button compact-action" type="button" onClick={() => void chooseConnection()}>Select Unity Project Folder</button>
            </section>
          ) : null}

          <section className="unity-card" aria-labelledby="unity-structure-title">
            <div className="unity-card-heading"><div><span className="section-label">Workspace inspection</span><h3 id="unity-structure-title">Portable project evidence</h3></div>{connection?.configured ? <span>{connection.folderName ?? "Selected Unity folder"}</span> : null}</div>
            <dl className="unity-directory-grid">
              <div><dt>Assets/</dt><dd>{present(result.evidence.assets)}</dd></div>
              <div><dt>Packages/</dt><dd>{present(result.evidence.packages)}</dd></div>
              <div><dt>ProjectSettings/</dt><dd>{present(result.evidence.projectSettings)}</dd></div>
              <div><dt>ProjectVersion.txt</dt><dd>{result.projectVersion.status === "AVAILABLE" ? "Valid" : result.projectVersion.status === "INVALID" ? "Invalid" : "Missing"}</dd></div>
            </dl>
            {result.status !== "NOT_DETECTED" && result.message ? <p className="unity-note">{result.message}</p> : null}
            {result.status === "NOT_DETECTED" ? (
              <div className="unity-groundtruth-row"><span>Project-owned GroundTruth</span><strong>Not available</strong></div>
            ) : null}
            {result.status === "NOT_DETECTED" ? <p className="unity-note">Missing evidence is unverified, not proof of absence.</p> : null}
          </section>

          {result.status !== "NOT_DETECTED" ? <section className={`unity-card${result.manifest.status === "INVALID_OR_UNSUPPORTED" ? " unity-state-error" : ""}`} aria-labelledby="unity-manifest-title">
            <div className="unity-card-heading"><div><span className="section-label">Project-owned evidence</span><h3 id="unity-manifest-title">.forgemind/unity-groundtruth.json</h3></div><strong>{manifestStatus(result)}</strong></div>
            <p className="unity-note">The manifest is implementation evidence, not design truth. Missing evidence is unverified, not proof of absence.</p>
            {result.manifest.message ? <p className="unity-note">{result.manifest.message}</p> : null}
            <p className="unity-note">Refresh re-reads current evidence. It does not run the Unity exporter or change exporter coverage.</p>
          </section> : null}

          {result.manifest.summary ? <ManifestSummary summary={result.manifest.summary} /> : null}
        </>
      ) : null}
    </div>
  );
}
