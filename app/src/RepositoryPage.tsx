import { useEffect, useState } from "react";
import {
  inspectRepositoryReality,
  type ChangedFile,
  type RepositoryRealityResult,
  type RepositorySnapshot,
} from "./platform/repositoryReality";

interface RepositoryWorkspace {
  path: string;
}

function messageFromError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Repository Reality could not be inspected. The ForgeMind workspace remains usable.";
}

function stagingLabel(file: ChangedFile): string {
  if (file.untracked) return "Untracked";
  if (file.staged && file.unstaged) return "Staged and unstaged changes";
  if (file.staged) return "Staged";
  if (file.unstaged) return "Unstaged";
  return "No staged or unstaged change";
}

function RepositorySnapshotView({ snapshot }: { snapshot: RepositorySnapshot }) {
  return (
    <>
      <section className="repository-summary" aria-label="Repository summary">
        <article><span>Repository</span><strong>Detected</strong></article>
        <article><span>Branch</span><strong>{snapshot.detachedHead ? "Detached HEAD" : snapshot.branch}</strong></article>
        <article><span>Working Tree</span><strong>{snapshot.workingTree === "CLEAN" ? "Clean" : "Dirty"}</strong></article>
        <article><span>Tracked Diff</span><strong>{snapshot.diffStat.filesChanged} files</strong></article>
      </section>

      <section className="repository-card" aria-labelledby="repository-head-title">
        <div className="repository-section-heading">
          <div><span className="section-label">Implementation Evidence</span><h3 id="repository-head-title">HEAD</h3></div>
          <code>{snapshot.head.shortHash}</code>
        </div>
        <p className="repository-head-subject">{snapshot.head.subject}</p>
        <dl className="repository-metadata">
          <div><dt>Full hash</dt><dd><code>{snapshot.head.hash}</code></dd></div>
          <div><dt>Author</dt><dd>{snapshot.head.author}</dd></div>
          <div><dt>Timestamp</dt><dd><time dateTime={snapshot.head.timestamp}>{snapshot.head.timestamp}</time></dd></div>
        </dl>
      </section>

      <section className="repository-card" aria-labelledby="working-tree-title">
        <div className="repository-section-heading">
          <div><span className="section-label">Working Tree</span><h3 id="working-tree-title">Changed files</h3></div>
          <span>{snapshot.totalChangedFiles} total</span>
        </div>
        <p className="repository-diff-stat">
          Tracked diff: {snapshot.diffStat.filesChanged} files changed, +{snapshot.diffStat.insertions}, -{snapshot.diffStat.deletions}
        </p>
        {snapshot.changedFilesTruncated ? <p className="scope-note">Showing the first {snapshot.changedFiles.length} changed files.</p> : null}
        {snapshot.changedFiles.length === 0 ? <p className="repository-empty">The working tree is clean.</p> : (
          <div className="repository-files">
            {snapshot.changedFiles.map((file) => (
              <details className="repository-file" key={`${file.path}-${file.previousPath ?? ""}`}>
                <summary>
                  <span className={`repository-status repository-status-${file.status.toLowerCase()}`}>{file.status.replace("_", " ")}</span>
                  <strong>{file.path}</strong>
                  <small>{stagingLabel(file)}</small>
                </summary>
                <dl className="repository-file-detail">
                  <div><dt>Repository-relative path</dt><dd>{file.path}</dd></div>
                  {file.previousPath ? <div><dt>Previous path</dt><dd>{file.previousPath}</dd></div> : null}
                  <div><dt>Status</dt><dd>{file.status.replace("_", " ")}</dd></div>
                  <div><dt>Index / working tree</dt><dd>{stagingLabel(file)}</dd></div>
                  <div><dt>Diff stat</dt><dd>{file.diffStat ? (file.diffStat.binary ? "Binary file" : `+${file.diffStat.insertions ?? 0}, -${file.diffStat.deletions ?? 0}`) : "Not available"}</dd></div>
                </dl>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="repository-card" aria-labelledby="recent-commits-title">
        <div className="repository-section-heading">
          <div><span className="section-label">Bounded History</span><h3 id="recent-commits-title">Recent commits</h3></div>
          <span>Latest {snapshot.recentCommits.length}</span>
        </div>
        <ol className="repository-commits">
          {snapshot.recentCommits.map((commit) => (
            <li key={commit.hash}>
              <code>{commit.shortHash}</code>
              <div><strong>{commit.subject}</strong><small>{commit.author} · <time dateTime={commit.timestamp}>{commit.timestamp}</time></small></div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function RepositoryPage({ workspace }: { workspace: RepositoryWorkspace }) {
  const [result, setResult] = useState<RepositoryRealityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setResult(await inspectRepositoryReality(workspace.path));
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

  return (
    <div className="repository-page">
      <section className="repository-intro">
        <div>
          <span className="section-label">Repository Reality</span>
          <h2>Git / Repository</h2>
          <p>Read-only implementation evidence from the active workspace repository. File changes do not prove that a feature is implemented.</p>
        </div>
        <button className="outline-button" type="button" disabled={loading} onClick={() => void refresh()}>
          {loading ? "Inspecting..." : "Refresh snapshot"}
        </button>
      </section>
      {error ? <div className="repository-state repository-state-error" role="alert">{error}</div> : null}
      {!error && loading && result === null ? <p aria-live="polite">Inspecting Repository Reality...</p> : null}
      {!error && !loading && result && result.status !== "DETECTED" ? (
        <section className="repository-state" role="status">
          <h3>{result.status === "NOT_REPOSITORY" ? "Repository not detected" : result.status === "GIT_UNAVAILABLE" ? "Git unavailable" : "Inspection failed"}</h3>
          <p>{result.message}</p>
        </section>
      ) : null}
      {!error && result?.status === "DETECTED" && result.repository ? <RepositorySnapshotView snapshot={result.repository} /> : null}
    </div>
  );
}
