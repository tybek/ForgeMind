import { useEffect, useState } from "react";
import { EvaluationPage } from "./EvaluationPage";
import { ModelsPage } from "./ModelsPage";
import { InterviewPage } from "./InterviewPage";
import { CompendiumPage } from "./CompendiumPage";
import { DecisionsPage } from "./DecisionsPage";
import { SpecialistPage } from "./SpecialistPage";
import { WikiPage } from "./WikiPage";
import { RepositoryPage } from "./RepositoryPage";
import { UnityGroundTruthPage } from "./UnityGroundTruthPage";
import { AlignmentPage } from "./AlignmentPage";
import { FeatureContractsPage } from "./FeatureContractsPage";
import { WritersRoomPage, type WritersRoomNavigationOrigin } from "./WritersRoomPage";
import { ProjectOverviewPage } from "./ProjectOverviewPage";
import type { AiWorkspaceSourceTrace } from "./platform/aiWorkspace";
import {
  emptyProjectFoundation,
  NewProjectCreator,
} from "./NewProjectCreator";
import {
  BrandLockup,
  EmptyState,
  LineIcon,
  PageHeader,
  type IconName,
} from "./designSystem";
import { loadAlignmentResults } from "./platform/alignment";
import { loadDecisions } from "./platform/decisions";
import { loadFeatureContracts, type FeatureContractSourceType } from "./platform/featureContracts";
import { loadCompendium, type KnowledgeArea, type KnowledgeEntry } from "./platform/projectKnowledge";
import {
  recommendNextSteps,
  type RecommendationProjectState,
  type RecommendationTarget,
} from "./platform/recommendedNextSteps";
import {
  loadRecentProjects,
  recordRecentProject,
  removeRecentProject,
  type RecentProject,
} from "./platform/recentProjects";
import type { RepositoryRealityResult } from "./platform/repositoryReality";
import type { UnityGroundTruthResult } from "./platform/unityGroundTruth";
import {
  getDevelopmentWorkspacePath,
  initializeWorkspace,
  inspectWorkspace,
  selectWorkspaceDirectory,
  type ProjectFoundationInput,
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
  "Writers' Room",
] as const;

type WorkspaceArea = (typeof workspaceAreas)[number];
type WorkspaceView = WorkspaceArea | "Project Interview" | "AI Behavior Designer" | "AI Evaluation" | "AI Models";

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
    label: "AI Studio",
    suite: "AI_STUDIO",
    items: ["Writers' Room", "AI Behavior Designer", "AI Models", "AI Evaluation"],
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
  "AI Models": "ai",
  "Writers' Room": "message",
};

const workspaceAreaDescriptions: Record<WorkspaceView, string> = {
  Overview: "What is happening in this project, what needs attention, and where to continue.",
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
  "AI Models": "Discover Token Factory models and manage ForgeMind's application-local registry.",
  "Writers' Room": "Develop lore, characters, dialogue, and continuity through source-aware AI conversation.",
};

function milestoneFor(area: WorkspaceView): string {
  if (area === "AI Models") return "MODEL-1 · Model Registry";
  if (area === "Writers' Room") return "WR-1 · Headless validated";
  if (area === "Project Interview") return "0E · Complete";
  if (area === "AI Behavior Designer") return "0G · Specialist";
  if (area === "Game Wiki") return "0G.8 · Implemented";
  if (area === "Repository / Git Reality") return "0H · Implemented";
  if (area === "Unity") return "0I · Complete";
  if (area === "Alignment") return "0J · Complete";
  if (area === "Feature Contracts") return "0K · Complete";
  if (area === "AI Evaluation") return "0D.1 · Model Lab";
  if (area === "Overview") return "UI-3 · Headless validated";
  if (area === "Game Design" || area === "Decisions") return "0F · Project Intent";
  return "0C · Local Workspace";
}

export interface Workspace extends ProjectMetadata {
  path: string;
}

type AppView =
  | { kind: "welcome" }
  | { kind: "creator" }
  | { kind: "loading"; path: string }
  | { kind: "uninitialized"; path: string }
  | { kind: "valid"; workspace: Workspace; initialArea?: WorkspaceView }
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

function formatLastOpened(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WelcomeScreen({
  recentProjects,
  currentProject,
  repositoryReality,
  unityGroundTruth,
  onStart,
  onOpen,
  onOpenRecent,
  onOpenRecommendation,
}: {
  recentProjects: RecentProject[];
  currentProject: Workspace | null;
  repositoryReality: RepositoryRealityResult | null;
  unityGroundTruth: UnityGroundTruthResult | null;
  onStart: () => Promise<void>;
  onOpen: () => Promise<void>;
  onOpenRecent: (project: RecentProject) => Promise<void>;
  onOpenRecommendation: (target: RecommendationTarget) => void;
}) {
  const [recommendationState, setRecommendationState] = useState<RecommendationProjectState | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsPartial, setRecommendationsPartial] = useState(false);

  useEffect(() => {
    if (currentProject === null) {
      setRecommendationState(null);
      setRecommendationsLoading(false);
      setRecommendationsPartial(false);
      return;
    }

    let active = true;
    setRecommendationState(null);
    setRecommendationsLoading(true);
    setRecommendationsPartial(false);

    void Promise.allSettled([
      loadCompendium(currentProject.path),
      loadDecisions(currentProject.path),
      loadAlignmentResults(currentProject.path),
      loadFeatureContracts(currentProject.path),
    ]).then(([compendium, decisions, alignment, featureContracts]) => {
      if (!active) return;
      const results = [compendium, decisions, alignment, featureContracts];
      setRecommendationState({
        compendium: compendium.status === "fulfilled" ? compendium.value : undefined,
        decisions: decisions.status === "fulfilled" ? decisions.value : undefined,
        repositoryReality,
        unityGroundTruth,
        alignment: alignment.status === "fulfilled" ? alignment.value : undefined,
        featureContracts: featureContracts.status === "fulfilled" ? featureContracts.value : undefined,
      });
      setRecommendationsPartial(results.some((result) => result.status === "rejected"));
      setRecommendationsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [currentProject, repositoryReality, unityGroundTruth]);

  const recommendations = recommendNextSteps(recommendationState, 3);

  return (
    <main className="workspace-home">
      <header className="home-topbar">
        <BrandLockup compact />
        <span>Local workspace</span>
      </header>

      <div className="home-content">
        <section className="home-hero" aria-labelledby="welcome-title">
          <div className="home-hero-copy">
            <p className="eyebrow">Welcome back.</p>
            <h1 id="welcome-title">Turn ideas into playable worlds.</h1>
            <p>
              Start with a local project or return to a workspace already in progress.
            </p>
          </div>
          <div className="home-primary-actions" aria-label="Project actions">
            <button className="primary-button" type="button" onClick={() => void onStart()}>
              <LineIcon name="document" />
              Start New Project
            </button>
            <button className="outline-button" type="button" onClick={() => void onOpen()}>
              <LineIcon name="folder" />
              Open Existing Project
            </button>
          </div>
        </section>

        <section className="home-section" aria-labelledby="recent-projects-title">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Your workspace</p>
              <h2 id="recent-projects-title">Recent Projects</h2>
            </div>
            {recentProjects.length > 0 ? (
              <button className="text-button" type="button" onClick={() => void onOpen()}>
                Open another project
              </button>
            ) : null}
          </div>

          {recentProjects.length > 0 ? (
            <div className="recent-project-grid">
              {recentProjects.slice(0, 3).map((project) => (
                <button
                  className="recent-project-card"
                  type="button"
                  key={`${project.projectId}:${project.path}`}
                  onClick={() => void onOpenRecent(project)}
                  aria-label={`Open ${project.name}`}
                >
                  <span className="recent-project-art" aria-hidden="true">
                    <span className="recent-project-art-grid" />
                    <LineIcon name="cube" />
                  </span>
                  <span className="recent-project-copy">
                    <strong title={project.name}>{project.name}</strong>
                    <time dateTime={project.lastOpenedAt}>
                      Last opened {formatLastOpened(project.lastOpenedAt)}
                    </time>
                    <span className="recent-project-path" title={project.path}>{project.path}</span>
                  </span>
                  <LineIcon name="arrow-right" />
                </button>
              ))}
            </div>
          ) : (
            <div className="home-empty-state">
              <div>
                <h3>No recent projects yet</h3>
                <p>
                  Start New Project or Open Existing Project to add a local workspace here.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="home-next-steps" aria-labelledby="next-steps-title">
          <div className="home-next-steps-heading">
            <div className="home-next-steps-icon" aria-hidden="true"><LineIcon name="route" /></div>
            <div>
              <p className="eyebrow">Project-aware guidance</p>
              <h2 id="next-steps-title">Recommended Next Steps</h2>
              {currentProject ? <p>Derived from {currentProject.name}&apos;s current project signals.</p> : null}
            </div>
          </div>
          {currentProject === null ? (
            <p>Open a project to get project-aware next steps.</p>
          ) : recommendationsLoading ? (
            <p role="status"><span className="inline-spinner" aria-hidden="true" /> Reading current project signals...</p>
          ) : recommendations.length > 0 ? (
            <div className="home-recommendation-list">
              {recommendations.map((recommendation) => (
                <article className="home-recommendation-card" key={recommendation.id}>
                  <div className="home-recommendation-copy">
                    <div className="home-recommendation-meta">
                      <span>{recommendation.area}</span>
                      <span>{recommendation.priority}</span>
                    </div>
                    <h3>{recommendation.title}</h3>
                    <p>{recommendation.reason}</p>
                  </div>
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => onOpenRecommendation(recommendation.target)}
                  >
                    {recommendation.actionLabel}
                    <LineIcon name="arrow-right" />
                  </button>
                </article>
              ))}
            </div>
          ) : recommendationsPartial ? (
            <p>Some project signals could not be read. Open the project to inspect its current state.</p>
          ) : (
            <p>No urgent next steps detected.</p>
          )}
          {recommendationsPartial && recommendations.length > 0 ? (
            <p className="home-recommendation-note">Some project signals were unavailable, so only verified recommendations are shown.</p>
          ) : null}
        </section>
      </div>
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

function Placeholder({ area }: { area: Exclude<WorkspaceArea, "Overview" | "Repository / Git Reality" | "Game Wiki" | "Unity" | "Alignment" | "Writers' Room"> }) {
  return (
    <EmptyState
      title={area}
      description={`${area} workspace is not implemented yet.`}
    />
  );
}

export function WorkspaceShell({
  workspace,
  initialArea = "Overview",
  onHome,
  onOpen,
  repositoryReality = null,
  unityGroundTruth = null,
  onRepositoryRealityChange,
  onUnityGroundTruthChange,
}: {
  workspace: Workspace;
  initialArea?: WorkspaceView;
  onHome: () => void;
  onOpen: () => Promise<void>;
  repositoryReality?: RepositoryRealityResult | null;
  unityGroundTruth?: UnityGroundTruthResult | null;
  onRepositoryRealityChange?: (result: RepositoryRealityResult) => void;
  onUnityGroundTruthChange?: (result: UnityGroundTruthResult) => void;
}) {
  const [activeArea, setActiveArea] = useState<WorkspaceView>(initialArea);
  const [promotedKnowledge, setPromotedKnowledge] = useState<KnowledgeEntry | null>(null);
  const [knowledgeEditTarget, setKnowledgeEditTarget] = useState<string | null>(null);
  const [alignmentInitialSubview, setAlignmentInitialSubview] = useState<"CREATE" | "HISTORY">("CREATE");
  const [featureContractsFromWiki, setFeatureContractsFromWiki] = useState(false);
  const [wikiReturnArea, setWikiReturnArea] = useState<KnowledgeArea>("overview");
  const [writersRoomOrigin, setWritersRoomOrigin] = useState<WritersRoomNavigationOrigin | null>(null);
  const [writersRoomSessionTarget, setWritersRoomSessionTarget] = useState<string | null>(null);

  function openArea(area: WorkspaceView) {
    setPromotedKnowledge(null);
    setKnowledgeEditTarget(null);
    setAlignmentInitialSubview("CREATE");
    setFeatureContractsFromWiki(false);
    setWritersRoomOrigin(null);
    setWritersRoomSessionTarget(null);
    if (area === "Game Wiki") setWikiReturnArea("overview");
    setActiveArea(area);
  }

  function promoteToDecision(entry: KnowledgeEntry) {
    setWritersRoomOrigin(null);
    setWritersRoomSessionTarget(null);
    setPromotedKnowledge(entry);
    setActiveArea("Decisions");
  }

  function editKnowledgeAtSource(entryId: string) {
    setWritersRoomOrigin(null);
    setWritersRoomSessionTarget(null);
    setKnowledgeEditTarget(entryId);
    setActiveArea("Game Design");
  }

  function viewAlignmentHistory() {
    setWritersRoomOrigin(null);
    setWritersRoomSessionTarget(null);
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

  function openWritersRoomSource(source: AiWorkspaceSourceTrace, origin: WritersRoomNavigationOrigin) {
    setWritersRoomOrigin(origin);
    if (source.sourceType === "COMPENDIUM" || source.sourceType === "OPEN_QUESTION") {
      setPromotedKnowledge(null);
      setKnowledgeEditTarget(source.sourceId);
      setActiveArea("Game Design");
    } else if (source.sourceType === "DECISION") {
      setPromotedKnowledge(null);
      setKnowledgeEditTarget(null);
      setActiveArea("Decisions");
    }
  }

  function returnToWritersRoom() {
    setWritersRoomSessionTarget(writersRoomOrigin?.sessionId ?? null);
    setWritersRoomOrigin(null);
    setPromotedKnowledge(null);
    setKnowledgeEditTarget(null);
    setActiveArea("Writers' Room");
  }

  const writersRoomReturnLabel = writersRoomOrigin
    ? `Back to ${writersRoomOrigin.profileLabel ?? "Writers' Room"} · ${writersRoomOrigin.sessionTitle}`
    : undefined;

  function viewFeatureContracts(area: KnowledgeArea) {
    setWritersRoomOrigin(null);
    setWritersRoomSessionTarget(null);
    setPromotedKnowledge(null);
    setKnowledgeEditTarget(null);
    setAlignmentInitialSubview("CREATE");
    setFeatureContractsFromWiki(true);
    setWikiReturnArea(area);
    setActiveArea("Feature Contracts");
  }

  function returnToWiki() {
    setWritersRoomOrigin(null);
    setWritersRoomSessionTarget(null);
    setFeatureContractsFromWiki(false);
    setActiveArea("Game Wiki");
  }

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLockup compact />
        </div>

        <button className="workspace-home-action" type="button" onClick={onHome}>
          <LineIcon name="home" />
          <span>Home</span>
        </button>

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
          ) : activeArea === "AI Models" ? (
            <ModelsPage />
          ) : activeArea === "Writers' Room" ? (
            <WritersRoomPage workspace={workspace} onOpenSource={openWritersRoomSource} initialSessionId={writersRoomSessionTarget} />
          ) : activeArea === "Overview" ? (
            <ProjectOverviewPage
              workspace={workspace}
              repositoryReality={repositoryReality}
              unityGroundTruth={unityGroundTruth}
              onNavigate={openArea}
            />
          ) : activeArea === "Repository / Git Reality" ? (
            <RepositoryPage workspace={workspace} onResult={onRepositoryRealityChange} />
          ) : activeArea === "Unity" ? (
            <UnityGroundTruthPage workspace={workspace} onResult={onUnityGroundTruthChange} />
          ) : activeArea === "Game Wiki" ? (
            <WikiPage
              workspace={workspace}
              initialArea={wikiReturnArea}
              repositoryReality={repositoryReality}
              unityGroundTruth={unityGroundTruth}
              onEditKnowledge={(entryId) => entryId ? editKnowledgeAtSource(entryId) : openArea("Game Design")}
              onOpenDecisions={() => openArea("Decisions")}
              onOpenProjectInterview={() => openArea("Project Interview")}
              onOpenSpecialist={() => openArea("AI Behavior Designer")}
              onOpenRepository={() => openArea("Repository / Git Reality")}
              onOpenUnity={() => openArea("Unity")}
              onViewAlignmentHistory={viewAlignmentHistory}
              onViewFeatureContracts={viewFeatureContracts}
            />
          ) : activeArea === "Game Design" ? (
            <CompendiumPage
              workspace={workspace}
              onPromote={promoteToDecision}
              editEntryId={knowledgeEditTarget}
              writersRoomReturnLabel={writersRoomReturnLabel}
              onReturnToWritersRoom={writersRoomOrigin ? returnToWritersRoom : undefined}
            />
          ) : activeArea === "Decisions" ? (
            <DecisionsPage
              workspace={workspace}
              promotedKnowledge={promotedKnowledge}
              writersRoomReturnLabel={writersRoomReturnLabel}
              onReturnToWritersRoom={writersRoomOrigin ? returnToWritersRoom : undefined}
            />
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
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [repositoryReality, setRepositoryReality] = useState<{ path: string; result: RepositoryRealityResult } | null>(null);
  const [unityGroundTruth, setUnityGroundTruth] = useState<{ path: string; result: UnityGroundTruthResult } | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(loadRecentProjects);
  const [creatorDraft, setCreatorDraft] = useState<ProjectFoundationInput>(emptyProjectFoundation);
  const [creatorDirectory, setCreatorDirectory] = useState<string | null>(null);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyInspection(inspection: WorkspaceInspection) {
    switch (inspection.status) {
      case "UNINITIALIZED":
        setView({ kind: "uninitialized", path: inspection.rootPath });
        break;
      case "VALID": {
        const workspace = workspaceFromInspection(inspection);
        setRecentProjects(recordRecentProject(inspection.rootPath, inspection.project));
        setCurrentWorkspace(workspace);
        setRepositoryReality((current) => current?.path === workspace.path ? current : null);
        setUnityGroundTruth((current) => current?.path === workspace.path ? current : null);
        setView({ kind: "valid", workspace });
        break;
      }
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

  async function loadWorkspace(path: string, fromRecent = false) {
    setView({ kind: "loading", path });
    try {
      applyInspection(await inspectWorkspace(path));
    } catch (inspectionError) {
      if (fromRecent) {
        setRecentProjects(removeRecentProject(path));
        setView({ kind: "welcome" });
        setError("That recent project is no longer available and was removed from the list.");
        return;
      }
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

  async function chooseProject(purpose: "open" | "create" = "open") {
    setError(null);
    let selected: string | null;

    try {
      selected = await selectWorkspaceDirectory(purpose);
    } catch {
      setError("The directory picker could not be opened.");
      return;
    }

    if (selected === null) {
      return;
    }

    await loadWorkspace(selected);
  }

  async function openRecentProject(project: RecentProject) {
    setError(null);
    await loadWorkspace(project.path, true);
  }

  function returnHome() {
    setError(null);
    setView({ kind: "welcome" });
  }

  function openRecommendation(target: RecommendationTarget) {
    if (currentWorkspace === null) return;
    setView({ kind: "valid", workspace: currentWorkspace, initialArea: target });
  }

  function startNewProject() {
    setError(null);
    setCreatorError(null);
    setCreatorDirectory(null);
    setCreatorDraft(emptyProjectFoundation);
    setView({ kind: "creator" });
  }

  function cancelCreator() {
    setCreatorDraft(emptyProjectFoundation);
    setCreatorDirectory(null);
    setCreatorError(null);
    setView({ kind: "welcome" });
  }

  async function chooseCreatorDirectory() {
    setCreatorError(null);
    let selected: string | null;
    try {
      selected = await selectWorkspaceDirectory("create");
    } catch {
      setCreatorError("The directory picker could not be opened.");
      return;
    }
    if (selected === null) return;

    try {
      const inspection = await inspectWorkspace(selected);
      if (inspection.status === "UNINITIALIZED") {
        setCreatorDirectory(inspection.rootPath);
      } else if (inspection.status === "VALID") {
        setCreatorDirectory(null);
        setCreatorError("That directory is already a ForgeMind workspace. Open it from Home or choose another directory.");
      } else {
        setCreatorDirectory(null);
        setCreatorError(inspection.message);
      }
    } catch (inspectionError) {
      setCreatorDirectory(null);
      setCreatorError(messageFromError(inspectionError, "ForgeMind could not access the selected directory."));
    }
  }

  async function initializeCreatorProject(foundation: ProjectFoundationInput) {
    if (!creatorDirectory) return;
    setCreatorError(null);
    setIsInitializing(true);
    try {
      const inspection = await initializeWorkspace(creatorDirectory, foundation);
      setCreatorDraft(emptyProjectFoundation);
      setCreatorDirectory(null);
      applyInspection(inspection);
    } catch (initializationError) {
      setCreatorError(messageFromError(initializationError, "ForgeMind could not initialize the Project Foundation."));
    } finally {
      setIsInitializing(false);
    }
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
      content = (
        <WelcomeScreen
          recentProjects={recentProjects}
          currentProject={currentWorkspace}
          repositoryReality={currentWorkspace !== null && repositoryReality?.path === currentWorkspace.path ? repositoryReality.result : null}
          unityGroundTruth={currentWorkspace !== null && unityGroundTruth?.path === currentWorkspace.path ? unityGroundTruth.result : null}
          onStart={async () => startNewProject()}
          onOpen={() => chooseProject("open")}
          onOpenRecent={openRecentProject}
          onOpenRecommendation={openRecommendation}
        />
      );
      break;
    case "creator":
      content = (
        <NewProjectCreator
          draft={creatorDraft}
          onChange={setCreatorDraft}
          onChooseDirectory={chooseCreatorDirectory}
          selectedDirectory={creatorDirectory}
          onInitialize={initializeCreatorProject}
          isInitializing={isInitializing}
          creationError={creatorError}
          onClearDirectory={() => { setCreatorDirectory(null); setCreatorError(null); }}
          onCancel={cancelCreator}
        />
      );
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
          onOpen={() => chooseProject("open")}
        />
      );
      break;
    case "valid":
      content = (
        <WorkspaceShell
          workspace={view.workspace}
          initialArea={view.initialArea}
          onHome={returnHome}
          onOpen={() => chooseProject("open")}
          repositoryReality={repositoryReality?.path === view.workspace.path ? repositoryReality.result : null}
          unityGroundTruth={unityGroundTruth?.path === view.workspace.path ? unityGroundTruth.result : null}
          onRepositoryRealityChange={(result) => setRepositoryReality({ path: view.workspace.path, result })}
          onUnityGroundTruthChange={(result) => setUnityGroundTruth({ path: view.workspace.path, result })}
        />
      );
      break;
    case "invalid":
      content = (
        <WorkspaceProblem
          title="Invalid workspace metadata"
          path={view.path}
          message={view.message}
          detail="The existing .forgemind/project.json file was not changed."
          onOpen={() => chooseProject("open")}
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
          onOpen={() => chooseProject("open")}
        />
      );
      break;
    case "access-error":
      content = (
        <WorkspaceProblem
          title="Directory access failed"
          path={view.path}
          message={view.message}
          onOpen={() => chooseProject("open")}
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
