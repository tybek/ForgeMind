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
import { FeatureContractsPage } from "./FeatureContractsPage";
import {
  BrandLockup,
  EmptyState,
  LineIcon,
  PageHeader,
  type IconName,
} from "./designSystem";
import type { FeatureContractSourceType } from "./platform/featureContracts";
import type { KnowledgeArea, KnowledgeEntry } from "./platform/projectKnowledge";
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
  "Feature Contracts",
] as const;

type WorkspaceArea = (typeof workspaceAreas)[number];
type WorkspaceView = WorkspaceArea | "Project Interview" | "AI Behavior Designer" | "AI Evaluation";

type NavigationSuite = "PROJECT" | "AI_STUDIO" | "DELIVERY";

interface NavigationGroup {
  label: string;
  suite?: NavigationSuite;
  items: readonly WorkspaceView[];
}

const navigationGroups: readonly NavigationGroup[] = [
  {
    label: "Global",
    items: ["Overview", "Game Wiki", "Repository / Git Reality", "Unity", "Alignment"],
  },
  {
    label: "Project tools",
    suite: "PROJECT",
    items: ["Game Design", "Narrative", "Technical", "Roadmap", "Decisions", "Project Interview"],
  },
  {
    label: "AI tools",
    suite: "AI_STUDIO",
    items: ["AI Behavior Designer", "AI Evaluation"],
  },
  {
    label: "Delivery",
    suite: "DELIVERY",
    items: ["Feature Contracts"],
  },
];

const plannedNavigationItems = new Set<WorkspaceView>(["Narrative", "Technical", "Roadmap"]);

const workspaceAreaIcons: Record<WorkspaceView, IconName> = {
  Overview: "home",
  "Repository / Git Reality": "branch",
  "Game Wiki": "book",
  "Game Design": "document",
  Narrative: "document",
  Technical: "code",
  Unity: "cube",
  Roadmap: "route",
  Decisions: "check-document",
  Alignment: "target",
  "Feature Contracts": "clipboard",
  "Project Interview": "message",
  "AI Behavior Designer": "ai",
  "AI Evaluation": "gauge",
};

const workspaceAreaDescriptions: Record<WorkspaceView, string> = {
  Overview: "Project identity and the capabilities available in this local workspace.",
  "Repository / Git Reality": "Read-only Git evidence from the active project repository.",
  "Game Wiki": "Browse project knowledge while keeping each source and authority visible.",
  "Game Design": "Maintain reviewed Compendium knowledge for the game design.",
  Narrative: "Narrative workspace planning remains outside the current milestone.",
  Technical: "Technical workspace planning remains outside the current milestone.",
  Unity: "Inspect read-only Unity project evidence and exported GroundTruth coverage.",
  Roadmap: "Roadmap workspace planning remains outside the current milestone.",
  Decisions: "Review durable project decisions, rationale, and lifecycle history.",
  Alignment: "Compare documented Intent with selected Reality evidence for human review.",
  "Feature Contracts": "Turn approved context into cited, implementation-ready delivery scope.",
  "Project Interview": "Draft initial Compendium knowledge for explicit human review.",
  "AI Behavior Designer": "Run bounded, non-authoritative game-behavior analysis.",
  "AI Evaluation": "Evaluate configured models through the explicit provider boundary.",
};

function milestoneFor(area: WorkspaceView): string {
  if (area === "Project Interview") return "0E · Complete";
  if (area === "AI Behavior Designer") return "0G · Specialist";
  if (area === "Game Wiki") return "0G.8 · Implemented";
  if (area === "Repository / Git Reality") return "0H · Implemented";
  if (area === "Unity") return "0I · Complete";
  if (area === "Alignment") return "0J · Complete";
  if (area === "Feature Contracts") return "0K · Complete";
  if (area === "AI Evaluation") return "0D.1 · Model Lab";
  if (area === "Game Design" || area === "Decisions") return "0F · Project Intent";
  return "0C · Local Workspace";
}

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
        <BrandLockup />
        <p className="eyebrow">Local-first game development workspace</p>
        <h1 id="welcome-title">Turn ideas into playable worlds.</h1>
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
        <p className="type-secondary" role="status"><span className="inline-spinner" aria-hidden="true" /> Loading local project identity</p>
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
    ["Project ID", workspace.projectId],
    ["Project Path", workspace.path],
    ["Created At", workspace.createdAt],
    ["Format Version", String(workspace.formatVersion)],
  ];

  return (
    <div className="page-stack">
      <section className="overview-card">
        <span className="section-label">Project metadata</span>
        <h2>{workspace.name}</h2>
        <dl className="project-details project-details--secondary">
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
    <EmptyState
      title={area}
      description={`${area} workspace is not implemented yet.`}
    />
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
  const [featureContractsFromWiki, setFeatureContractsFromWiki] = useState(false);
  const [wikiReturnArea, setWikiReturnArea] = useState<KnowledgeArea>("overview");

  function openArea(area: WorkspaceView) {
    setPromotedKnowledge(null);
    setKnowledgeEditTarget(null);
    setAlignmentInitialSubview("CREATE");
    setFeatureContractsFromWiki(false);
    if (area === "Game Wiki") setWikiReturnArea("overview");
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

  function openFeatureContractSource(sourceType: FeatureContractSourceType, sourceId: string) {
    if (sourceType === "ALIGNMENT") {
      viewAlignmentHistory();
    } else if (sourceType === "COMPENDIUM") {
      editKnowledgeAtSource(sourceId);
    } else {
      openArea("Decisions");
    }
  }

  function openFeatureContractReality(source: "GIT" | "UNITY") {
    openArea(source === "GIT" ? "Repository / Git Reality" : "Unity");
  }

  function viewFeatureContracts(area: KnowledgeArea) {
    setPromotedKnowledge(null);
    setKnowledgeEditTarget(null);
    setAlignmentInitialSubview("CREATE");
    setFeatureContractsFromWiki(true);
    setWikiReturnArea(area);
    setActiveArea("Feature Contracts");
  }

  function returnToWiki() {
    setFeatureContractsFromWiki(false);
    setActiveArea("Game Wiki");
  }

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLockup compact />
        </div>

        <div className="sidebar-project" title={workspace.name}>
          <span>Project</span>
          <strong>{workspace.name}</strong>
        </div>

        <nav className="sidebar-navigation" aria-label="Workspace areas">
          {navigationGroups.map((group) => (
            <section className="nav-group" data-suite={group.suite} key={group.label} aria-labelledby={`nav-${group.label.replaceAll(" ", "-").toLowerCase()}`}>
              <h2 className="nav-group__label" id={`nav-${group.label.replaceAll(" ", "-").toLowerCase()}`}>{group.label}</h2>
              {group.items.map((area) => (
                <button
                  className={activeArea === area ? "nav-item nav-item-active" : "nav-item"}
                  key={area}
                  type="button"
                  aria-label={plannedNavigationItems.has(area) ? `${area}, Planned` : area}
                  aria-current={activeArea === area ? "page" : undefined}
                  onClick={() => openArea(area)}
                >
                  <LineIcon name={workspaceAreaIcons[area]} />
                  <span className="nav-item__label">{area}</span>
                  {plannedNavigationItems.has(area) ? <span className="nav-item__status">Planned</span> : null}
                </button>
              ))}
            </section>
          ))}
        </nav>

        <button className="change-project-button" type="button" onClick={() => void onOpen()}>
          Open another project
        </button>
      </aside>

      <main className="workspace-main">
        <PageHeader
          eyebrow={activeArea === "Overview" ? undefined : workspace.name}
          title={activeArea}
          description={workspaceAreaDescriptions[activeArea]}
          status={milestoneFor(activeArea)}
        />

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
            <WikiPage workspace={workspace} initialArea={wikiReturnArea} onEditKnowledge={editKnowledgeAtSource} onViewAlignmentHistory={viewAlignmentHistory} onViewFeatureContracts={viewFeatureContracts} />
          ) : activeArea === "Game Design" ? (
            <CompendiumPage workspace={workspace} onPromote={promoteToDecision} editEntryId={knowledgeEditTarget} />
          ) : activeArea === "Decisions" ? (
            <DecisionsPage workspace={workspace} promotedKnowledge={promotedKnowledge} />
          ) : activeArea === "Alignment" ? (
            <AlignmentPage workspace={workspace} initialSubview={alignmentInitialSubview} />
          ) : activeArea === "Feature Contracts" ? (
            <FeatureContractsPage
              workspace={workspace}
              onOpenSource={openFeatureContractSource}
              onOpenReality={openFeatureContractReality}
              onBackToWiki={featureContractsFromWiki ? returnToWiki : undefined}
            />
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
