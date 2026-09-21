import { useEffect, useState } from "react";
import { EvaluationPage } from "./EvaluationPage";
import { InterviewPage } from "./InterviewPage";
import { CompendiumPage } from "./CompendiumPage";
import { DecisionsPage } from "./DecisionsPage";
import { SpecialistPage } from "./SpecialistPage";
import { WikiPage } from "./WikiPage";
import { RepositoryPage } from "./RepositoryPage";
import { UnityGroundTruthPage } from "./UnityGroundTruthPage";
import { AlignmentPage } from "./AlignmentPage";
import type { KnowledgeEntry } from "./platform/projectKnowledge";
import {
  getDevelopmentWorkspacePath,
  initializeWorkspace,
  inspectWorkspace,
  selectWorkspaceDirectory,
  type ProjectMetadata,
  type WorkspaceInspection,
} from "./platform/workspaceDirectory";

const workspaceAreas = [
  "Overview",
  "Repository / Git Reality",
  "Game Wiki",
  "Game Design",
  "Narrative",
  "Technical",
  "Unity",
  "Roadmap",
  "Decisions",
  "Alignment",
] as const;

type WorkspaceArea = (typeof workspaceAreas)[number];
type WorkspaceView = WorkspaceArea | "Project Interview" | "AI Behavior Designer" | "AI Evaluation";

export interface Workspace extends ProjectMetadata {
  path: string;
}

type AppView =
  | { kind: "welcome" }
  | { kind: "loading"; path: string }
  | { kind: "uninitialized"; path: string }
  | { kind: "valid"; workspace: Workspace }
  | { kind: "invalid"; path: string; message: string }
  | { kind: "unsupported"; path: string; version: string; message: string }
  | { kind: "access-error"; path: string; message: string };

function workspaceFromInspection(
  inspection: Extract<WorkspaceInspection, { status: "VALID" }>,
): Workspace {
  return { ...inspection.project, path: inspection.rootPath };
}

function messageFromError(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export function WelcomeScreen({ onOpen }: { onOpen: () => Promise<void> }) {
  return (
    <main className="welcome-shell">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="product-mark" aria-hidden="true">FM</div>
        <p className="eyebrow">AI Game Development Workspace</p>
        <h1 id="welcome-title">ForgeMind</h1>
        <p className="welcome-copy">
          Open a local game project. ForgeMind checks only its own metadata and
          will ask before initializing an unrecognized directory.
        </p>
        <div className="welcome-actions">
          <button className="primary-button" type="button" onClick={() => void onOpen()}>
            Open Project
          </button>
          <button className="secondary-button" type="button" disabled title="Planned for a later milestone">
            New Project - Future
          </button>
        </div>
      </section>
    </main>
  );
}

function WorkspaceSetup({
  path,
  isInitializing,
  onInitialize,
  onOpen,
}: {
  path: string;
  isInitializing: boolean;
  onInitialize: () => Promise<void>;
  onOpen: () => Promise<void>;
}) {
  return (
    <main className="welcome-shell">
      <section className="welcome-card setup-card" aria-labelledby="setup-title">
        <p className="eyebrow">ForgeMind workspace setup</p>
        <h1 id="setup-title">Initialize this project?</h1>
        <p className="welcome-copy">This directory is not yet a ForgeMind workspace.</p>
        <dl className="setup-summary">
          <div>
            <dt>Project directory</dt>
            <dd>{path}</dd>
          </div>
          <div>
            <dt>ForgeMind workspace</dt>
            <dd>Not initialized</dd>
          </div>
        </dl>
        <p className="scope-note">
          Initialization creates only .forgemind/project.json. Existing project files are not changed.
        </p>
        <div className="welcome-actions">
          <button
            className="primary-button"
            type="button"
            disabled={isInitializing}
            onClick={() => void onInitialize()}
          >
            {isInitializing ? "Initializing..." : "Initialize Workspace"}
          </button>
          <button className="outline-button" type="button" onClick={() => void onOpen()}>
            Open another project
          </button>
        </div>
      </section>
    </main>
  );
}

function WorkspaceProblem({
  title,
  path,
  message,
  detail,
  onOpen,
}: {
  title: string;
  path: string;
  message: string;
  detail?: string;
  onOpen: () => Promise<void>;
}) {
  return (
    <main className="welcome-shell">
      <section className="welcome-card problem-card" aria-labelledby="problem-title">
        <p className="eyebrow">ForgeMind workspace</p>
        <h1 id="problem-title">{title}</h1>
        <p className="problem-message" role="alert">{message}</p>
        {detail ? <p className="scope-note">{detail}</p> : null}
        <p className="workspace-path">{path}</p>
        <button className="outline-button" type="button" onClick={() => void onOpen()}>
          Open another project
        </button>
      </section>
    </main>
  );
}

function LoadingWorkspace({ path }: { path: string }) {
  return (
    <main className="welcome-shell">
      <section className="welcome-card" aria-live="polite">
        <p className="eyebrow">ForgeMind workspace</p>
        <h1>Inspecting workspace</h1>
        <p className="workspace-path">{path}</p>
      </section>
    </main>
  );
}

function Overview({ workspace }: { workspace: Workspace }) {
  const statuses = [
    ["Workspace", "Local workspace"],
    ["AI", "Evaluation and local usage"],
    ["Unity", "GroundTruth page"],
    ["Git", "Repository Reality page"],
  ];
  const details = [
    ["Project Name", workspace.name],
    ["Project ID", workspace.projectId],
    ["Project Path", workspace.path],
    ["Created At", workspace.createdAt],
    ["Format Version", String(workspace.formatVersion)],
  ];

  return (
    <div className="page-stack">
      <section className="overview-card">
        <span className="section-label">Persistent project identity</span>
        <h2>{workspace.name}</h2>
        <dl className="project-details">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="status-grid" aria-label="Workspace status">
        {statuses.map(([label, value]) => (
          <article className="status-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <p className="scope-note">
        Project identity is loaded from .forgemind/project.json. Other workspace features are not configured.
      </p>
    </div>
  );
}

function Placeholder({ area }: { area: Exclude<WorkspaceArea, "Overview" | "Repository / Git Reality" | "Game Wiki" | "Unity" | "Alignment"> }) {
  return (
    <section className="placeholder-card">
      <span className="section-label">Planned workspace area</span>
      <h2>{area}</h2>
      <p>{area} workspace is not implemented yet.</p>
    </section>
  );
}

export function WorkspaceShell({
  workspace,
  onOpen,
}: {
  workspace: Workspace;
  onOpen: () => Promise<void>;
}) {
  const [activeArea, setActiveArea] = useState<WorkspaceView>("Overview");
  const [promotedKnowledge, setPromotedKnowledge] = useState<KnowledgeEntry | null>(null);
  const [knowledgeEditTarget, setKnowledgeEditTarget] = useState<string | null>(null);
  const [alignmentInitialSubview, setAlignmentInitialSubview] = useState<"CREATE" | "HISTORY">("CREATE");

  function openArea(area: WorkspaceView) {
    setPromotedKnowledge(null);
    setKnowledgeEditTarget(null);
    setAlignmentInitialSubview("CREATE");
    setActiveArea(area);
  }

  function promoteToDecision(entry: KnowledgeEntry) {
    setPromotedKnowledge(entry);
    setActiveArea("Decisions");
  }

  function editKnowledgeAtSource(entryId: string) {
    setKnowledgeEditTarget(entryId);
    setActiveArea("Game Design");
  }

  function viewAlignmentHistory() {
    setAlignmentInitialSubview("HISTORY");
    setActiveArea("Alignment");
  }

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="product-mark product-mark-small" aria-hidden="true">FM</div>
          <div>
            <strong>ForgeMind</strong>
            <span>Local workspace</span>
          </div>
        </div>

        <div className="sidebar-project" title={workspace.path}>
          <span>Project</span>
          <strong>{workspace.name}</strong>
          <small>{workspace.path}</small>
        </div>

        <nav aria-label="Workspace areas">
          {workspaceAreas.map((area) => (
            <button
              className={activeArea === area ? "nav-item nav-item-active" : "nav-item"}
              key={area}
              type="button"
              aria-current={activeArea === area ? "page" : undefined}
              onClick={() => openArea(area)}
            >
              {area}
            </button>
          ))}
        </nav>

        <button
          className={activeArea === "Project Interview" ? "nav-item nav-item-active interview-nav" : "nav-item interview-nav"}
          type="button"
          aria-current={activeArea === "Project Interview" ? "page" : undefined}
          onClick={() => openArea("Project Interview")}
        >
          Project Interview
        </button>

        <button
          className={activeArea === "AI Behavior Designer" ? "nav-item nav-item-active specialist-nav" : "nav-item specialist-nav"}
          type="button"
          aria-current={activeArea === "AI Behavior Designer" ? "page" : undefined}
          onClick={() => openArea("AI Behavior Designer")}
        >
          AI Behavior Designer
        </button>

        <button
          className={activeArea === "AI Evaluation" ? "nav-item nav-item-active evaluation-nav" : "nav-item evaluation-nav"}
          type="button"
          aria-current={activeArea === "AI Evaluation" ? "page" : undefined}
          onClick={() => openArea("AI Evaluation")}
        >
          AI Evaluation
        </button>

        <button className="change-project-button" type="button" onClick={() => void onOpen()}>
          Open another project
        </button>
      </aside>

      <main className="workspace-main">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">{workspace.name}</span>
            <h1>{activeArea}</h1>
          </div>
          <span className="milestone-badge">
            {activeArea === "Project Interview"
              ? "0E Project Interview"
              : activeArea === "AI Behavior Designer"
                ? "0G Specialist Profile"
              : activeArea === "Game Wiki"
                ? "0G.8 Unified Knowledge"
              : activeArea === "Repository / Git Reality"
                ? "0H Git Reality"
              : activeArea === "Unity"
                ? "0I.2 Unity GroundTruth"
              : activeArea === "Alignment"
                ? "0J Alignment · Complete"
              : activeArea === "AI Evaluation"
                ? "0D.1 Model Lab"
                : activeArea === "Game Design" || activeArea === "Decisions"
                  ? "0F Project Intent"
                  : "0C Local Workspace"}
          </span>
        </header>

        <div className="workspace-content">
          {activeArea === "Project Interview" ? (
            <InterviewPage workspace={workspace} />
          ) : activeArea === "AI Behavior Designer" ? (
            <SpecialistPage workspace={workspace} onEditKnowledge={editKnowledgeAtSource} />
          ) : activeArea === "AI Evaluation" ? (
            <EvaluationPage projectId={workspace.projectId} />
          ) : activeArea === "Overview" ? (
            <Overview workspace={workspace} />
          ) : activeArea === "Repository / Git Reality" ? (
            <RepositoryPage workspace={workspace} />
          ) : activeArea === "Unity" ? (
            <UnityGroundTruthPage workspace={workspace} />
          ) : activeArea === "Game Wiki" ? (
            <WikiPage workspace={workspace} onEditKnowledge={editKnowledgeAtSource} onViewAlignmentHistory={viewAlignmentHistory} />
          ) : activeArea === "Game Design" ? (
            <CompendiumPage workspace={workspace} onPromote={promoteToDecision} editEntryId={knowledgeEditTarget} />
          ) : activeArea === "Decisions" ? (
            <DecisionsPage workspace={workspace} promotedKnowledge={promotedKnowledge} />
          ) : activeArea === "Alignment" ? (
            <AlignmentPage workspace={workspace} initialSubview={alignmentInitialSubview} />
          ) : (
            <Placeholder area={activeArea} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>({ kind: "welcome" });
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyInspection(inspection: WorkspaceInspection) {
    switch (inspection.status) {
      case "UNINITIALIZED":
        setView({ kind: "uninitialized", path: inspection.rootPath });
        break;
      case "VALID":
        setView({ kind: "valid", workspace: workspaceFromInspection(inspection) });
        break;
      case "INVALID":
        setView({ kind: "invalid", path: inspection.rootPath, message: inspection.message });
        break;
      case "UNSUPPORTED_VERSION":
        setView({
          kind: "unsupported",
          path: inspection.rootPath,
          version: inspection.version,
          message: inspection.message,
        });
        break;
    }
  }

  async function loadWorkspace(path: string) {
    setView({ kind: "loading", path });
    try {
      applyInspection(await inspectWorkspace(path));
    } catch (inspectionError) {
      setView({
        kind: "access-error",
        path,
        message: messageFromError(
          inspectionError,
          "ForgeMind could not access the selected directory.",
        ),
      });
    }
  }

  useEffect(() => {
    let active = true;

    void getDevelopmentWorkspacePath().then((path) => {
      if (active && path !== null) {
        void loadWorkspace(path);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function openProject() {
    setError(null);
    let selected: string | null;

    try {
      selected = await selectWorkspaceDirectory();
    } catch {
      setError("The directory picker could not be opened.");
      return;
    }

    if (selected === null) {
      return;
    }

    await loadWorkspace(selected);
  }

  async function initializeSelectedWorkspace() {
    if (view.kind !== "uninitialized") {
      return;
    }

    setError(null);
    setIsInitializing(true);
    try {
      const inspection = await initializeWorkspace(view.path);
      applyInspection(inspection);
    } catch (initializationError) {
      setError(
        messageFromError(
          initializationError,
          "ForgeMind workspace initialization failed.",
        ),
      );
    } finally {
      setIsInitializing(false);
    }
  }

  let content;
  switch (view.kind) {
    case "welcome":
      content = <WelcomeScreen onOpen={openProject} />;
      break;
    case "loading":
      content = <LoadingWorkspace path={view.path} />;
      break;
    case "uninitialized":
      content = (
        <WorkspaceSetup
          path={view.path}
          isInitializing={isInitializing}
          onInitialize={initializeSelectedWorkspace}
          onOpen={openProject}
        />
      );
      break;
    case "valid":
      content = <WorkspaceShell workspace={view.workspace} onOpen={openProject} />;
      break;
    case "invalid":
      content = (
        <WorkspaceProblem
          title="Invalid workspace metadata"
          path={view.path}
          message={view.message}
          detail="The existing .forgemind/project.json file was not changed."
          onOpen={openProject}
        />
      );
      break;
    case "unsupported":
      content = (
        <WorkspaceProblem
          title={`Unsupported workspace version ${view.version}`}
          path={view.path}
          message={view.message}
          detail="The existing .forgemind/project.json file was not changed."
          onOpen={openProject}
        />
      );
      break;
    case "access-error":
      content = (
        <WorkspaceProblem
          title="Directory access failed"
          path={view.path}
          message={view.message}
          onOpen={openProject}
        />
      );
      break;
  }

  return (
    <>
      {content}
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
    </>
  );
}
