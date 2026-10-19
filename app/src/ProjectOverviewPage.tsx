import { useEffect, useState } from "react";
import { LineIcon, StatusBadge, type IconName } from "./designSystem";
import { loadAlignmentResults } from "./platform/alignment";
import { loadDecisions } from "./platform/decisions";
import { loadFeatureContracts } from "./platform/featureContracts";
import { deriveProjectOverview, type OverviewSignal, type ProjectOverviewModel } from "./platform/projectOverview";
import { loadCompendium } from "./platform/projectKnowledge";
import {
  recommendNextSteps,
  type RecommendationProjectState,
  type RecommendationTarget,
} from "./platform/recommendedNextSteps";
import type { RepositoryRealityResult } from "./platform/repositoryReality";
import type { UnityGroundTruthResult } from "./platform/unityGroundTruth";

interface OverviewWorkspace {
  name: string;
  path: string;
}

interface SignalAction {
  label: string;
  target: RecommendationTarget;
}

function SignalCard({
  icon,
  signal,
  actions,
  onNavigate,
}: {
  icon: IconName;
  signal: OverviewSignal;
  actions: SignalAction[];
  onNavigate: (target: RecommendationTarget) => void;
}) {
  return (
    <article className="project-signal-card" data-tone={signal.tone.toLowerCase()}>
      <div className="project-signal-card__heading">
        <span className="project-signal-card__icon" aria-hidden="true"><LineIcon name={icon} /></span>
        <span>{signal.label}</span>
      </div>
      <strong>{signal.value}</strong>
      <p>{signal.detail}</p>
      <div className="project-signal-card__actions">
        {actions.map((action) => (
          <button className="text-button" type="button" key={action.label} onClick={() => onNavigate(action.target)}>
            {action.label}<LineIcon name="arrow-right" />
          </button>
        ))}
      </div>
    </article>
  );
}

function SignalGroups({ model, onNavigate }: { model: ProjectOverviewModel; onNavigate: (target: RecommendationTarget) => void }) {
  return (
    <section className="project-overview-section" aria-labelledby="project-signals-title">
      <div className="project-overview-section__heading">
        <div>
          <p className="eyebrow">Intent ↔ Reality ↔ Alignment</p>
          <h2 id="project-signals-title">Project Signals</h2>
        </div>
        <p>Explainable state from existing project sources. No aggregate score.</p>
      </div>
      <div className="project-signal-groups">
        <section className="project-signal-group" aria-labelledby="intent-signals-title">
          <header><span>01</span><h3 id="intent-signals-title">Intent</h3></header>
          <SignalCard icon="document" signal={model.foundation} actions={[{ label: "Open Game Design", target: "Game Design" }]} onNavigate={onNavigate} />
          <SignalCard icon="check-document" signal={model.decisions} actions={[{ label: "View Decisions", target: "Decisions" }]} onNavigate={onNavigate} />
          <SignalCard icon="message" signal={model.openQuestions} actions={[{ label: "View Questions", target: "Game Design" }]} onNavigate={onNavigate} />
        </section>
        <section className="project-signal-group" aria-labelledby="reality-signals-title">
          <header><span>02</span><h3 id="reality-signals-title">Reality</h3></header>
          <SignalCard icon="branch" signal={model.repository} actions={[{ label: "Open Repository", target: "Repository / Git Reality" }]} onNavigate={onNavigate} />
          <SignalCard icon="cube" signal={model.unity} actions={[{ label: "Open Unity", target: "Unity" }]} onNavigate={onNavigate} />
        </section>
        <section className="project-signal-group" aria-labelledby="alignment-signals-title">
          <header><span>03</span><h3 id="alignment-signals-title">Alignment</h3></header>
          <SignalCard icon="target" signal={model.alignment} actions={[{ label: "Review Alignment", target: "Alignment" }]} onNavigate={onNavigate} />
          <SignalCard
            icon="clipboard"
            signal={model.featureContracts}
            actions={[{
              label: model.featureContracts.counts.DRAFT > 0 ? "Continue Feature Contracts" : "Open Feature Contracts",
              target: "Feature Contracts",
            }]}
            onNavigate={onNavigate}
          />
        </section>
      </div>
    </section>
  );
}

export function ProjectOverviewPage({
  workspace,
  repositoryReality,
  unityGroundTruth,
  onNavigate,
}: {
  workspace: OverviewWorkspace;
  repositoryReality: RepositoryRealityResult | null;
  unityGroundTruth: UnityGroundTruthResult | null;
  onNavigate: (target: RecommendationTarget) => void;
}) {
  const [projectState, setProjectState] = useState<RecommendationProjectState | null>(null);
  const [loading, setLoading] = useState(true);
  const [partial, setPartial] = useState(false);

  useEffect(() => {
    let active = true;
    setProjectState(null);
    setLoading(true);
    setPartial(false);

    void Promise.allSettled([
      loadCompendium(workspace.path),
      loadDecisions(workspace.path),
      loadAlignmentResults(workspace.path),
      loadFeatureContracts(workspace.path),
    ]).then(([compendium, decisions, alignment, featureContracts]) => {
      if (!active) return;
      const results = [compendium, decisions, alignment, featureContracts];
      setProjectState({
        compendium: compendium.status === "fulfilled" ? compendium.value : undefined,
        decisions: decisions.status === "fulfilled" ? decisions.value : undefined,
        repositoryReality,
        unityGroundTruth,
        alignment: alignment.status === "fulfilled" ? alignment.value : undefined,
        featureContracts: featureContracts.status === "fulfilled" ? featureContracts.value : undefined,
      });
      setPartial(results.some((result) => result.status === "rejected"));
      setLoading(false);
    });

    return () => { active = false; };
  }, [workspace.path, repositoryReality, unityGroundTruth]);

  const recommendations = recommendNextSteps(projectState);
  const model = projectState ? deriveProjectOverview(projectState) : null;

  return (
    <div className="project-overview" data-dashboard="project-overview">
      <section className="project-overview-identity" aria-labelledby="project-overview-name">
        <div>
          <p className="eyebrow">Current project</p>
          <h2 id="project-overview-name">{workspace.name}</h2>
          <p>{model?.descriptor ?? "Local project state, priorities, and delivery signals in one place."}</p>
        </div>
        <div className="project-overview-context" aria-label="Overview context">
          <StatusBadge status="LOCAL" label="Local first" />
          <span>Derived view</span>
        </div>
      </section>

      <section className="project-overview-next" aria-labelledby="overview-next-steps-title">
        <div className="project-overview-section__heading">
          <div>
            <p className="eyebrow">Continue meaningful work</p>
            <h2 id="overview-next-steps-title">Recommended Next Steps</h2>
          </div>
          <p>Deterministic guidance from the same NEXT-1 engine used by Workspace Home.</p>
        </div>
        {loading ? (
          <p role="status"><span className="inline-spinner" aria-hidden="true" /> Reading current project signals...</p>
        ) : recommendations.length > 0 ? (
          <div className="project-overview-recommendations">
            {recommendations.map((recommendation, index) => (
              <article className="project-overview-recommendation" key={recommendation.id}>
                <span className="project-overview-recommendation__index">0{index + 1}</span>
                <div>
                  <div className="project-overview-recommendation__meta">
                    <span>{recommendation.area}</span><span>{recommendation.priority}</span>
                  </div>
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.reason}</p>
                </div>
                <button className="outline-button" type="button" onClick={() => onNavigate(recommendation.target)}>
                  {recommendation.actionLabel}<LineIcon name="arrow-right" />
                </button>
              </article>
            ))}
          </div>
        ) : partial ? (
          <p>Project guidance is unavailable because one or more local sources could not be read.</p>
        ) : (
          <p className="project-overview-calm">No urgent next steps detected.</p>
        )}
        {partial && recommendations.length > 0 ? <p className="project-overview-note">Some local sources were unavailable, so only verified guidance and signals are shown.</p> : null}
      </section>

      {model ? <SignalGroups model={model} onNavigate={onNavigate} /> : null}
    </div>
  );
}
