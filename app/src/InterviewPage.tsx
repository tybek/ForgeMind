import { useEffect, useState } from "react";
import { loadModelRegistry, type ModelEntry } from "./platform/modelRegistry";
import {
  INTERVIEW_SECTIONS,
  loadInterview,
  runInterviewTurn,
  saveInterview,
  sectionLabel,
  sectionPosition,
  type InterviewCandidate,
  type InterviewCommandError,
  type InterviewDocument,
  type InterviewSection,
  type InterviewTurnResult,
  type ReviewedCandidate,
  type ReviewDecision,
} from "./platform/projectInterview";

const FIRST_SECTION: InterviewSection = "project_identity";
const FIRST_QUESTION = "In one or two sentences, what game are you building?";

type InterviewPhase = "landing" | "confirm-replace" | "interview" | "review" | "saved";

function errorDetails(error: unknown, fallbackCode: string, fallbackMessage: string): InterviewCommandError {
  if (typeof error === "object" && error !== null) {
    const code = "code" in error && typeof error.code === "string" ? error.code : fallbackCode;
    const message = "message" in error && typeof error.message === "string" ? error.message : fallbackMessage;
    return { code, message };
  }
  return { code: fallbackCode, message: fallbackMessage };
}

function SavedInterview({ document }: { document: InterviewDocument }) {
  return (
    <section className="interview-card" aria-labelledby="saved-interview-title">
      <span className="section-label">Durable approved knowledge</span>
      <h2 id="saved-interview-title">Interview Complete</h2>
      <p className="scope-note">
        {document.candidates.length} approved {document.candidates.length === 1 ? "candidate" : "candidates"} saved to
        .forgemind/interview.json.
      </p>
      <div className="saved-candidate-list">
        {document.candidates.map((candidate) => (
          <article key={candidate.candidateId} className="saved-candidate">
            <div className="candidate-badges">
              <span>{candidate.area}</span>
              <span>{candidate.status}</span>
              <span>{candidate.provenance}</span>
            </div>
            <h3>{candidate.title}</h3>
            <p>{candidate.statement}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function InterviewPage({
  workspace,
}: {
  workspace: { path: string; projectId: string; name: string };
}) {
  const [phase, setPhase] = useState<InterviewPhase>("landing");
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [modelId, setModelId] = useState("");
  const [existing, setExisting] = useState<InterviewDocument | null>(null);
  const [saved, setSaved] = useState<InterviewDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [replacementAuthorized, setReplacementAuthorized] = useState(false);
  const [section, setSection] = useState<InterviewSection>(FIRST_SECTION);
  const [question, setQuestion] = useState(FIRST_QUESTION);
  const [answer, setAnswer] = useState("");
  const [candidates, setCandidates] = useState<ReviewedCandidate[]>([]);
  const [lastTurn, setLastTurn] = useState<InterviewTurnResult | null>(null);
  const [error, setError] = useState<InterviewCommandError | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([loadModelRegistry(), loadInterview(workspace.path)])
      .then(([registry, document]) => {
        if (!active) return;
        const enabled = registry.filter((model) => model.enabled);
        setModels(enabled);
        setModelId(enabled[0]?.modelId ?? "");
        setExisting(document);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(errorDetails(loadError, "INTERVIEW_LOAD_FAILED", "ForgeMind could not load Project Interview data."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspace.path]);

  function beginInterview(replacing: boolean) {
    setReplacementAuthorized(replacing);
    setSection(FIRST_SECTION);
    setQuestion(FIRST_QUESTION);
    setAnswer("");
    setCandidates([]);
    setLastTurn(null);
    setError(null);
    setPhase("interview");
  }

  function cancelInterview() {
    setAnswer("");
    setCandidates([]);
    setLastTurn(null);
    setError(null);
    setReplacementAuthorized(false);
    setPhase("landing");
  }

  async function submitAnswer() {
    if (isRunning || !answer.trim() || !modelId) return;
    setIsRunning(true);
    setError(null);
    try {
      const turn = await runInterviewTurn({
        projectId: workspace.projectId,
        modelId,
        currentSection: section,
        currentQuestion: question,
        answer: answer.trim(),
        knownStatements: candidates.slice(-8).map(({ candidate }) => candidate.statement),
      });
      setLastTurn(turn);
      setCandidates((current) => [
        ...current,
        ...turn.candidates.map((candidate) => ({ candidate, decision: "PENDING" as const })),
      ]);
      setAnswer("");
      if (turn.nextSection && turn.nextQuestion) {
        setSection(turn.nextSection);
        setQuestion(turn.nextQuestion);
      } else {
        setPhase("review");
      }
    } catch (turnError) {
      setError(errorDetails(turnError, "INTERVIEW_TURN_FAILED", "The interview turn could not be completed."));
    } finally {
      setIsRunning(false);
    }
  }

  function updateCandidate(candidateId: string, update: Partial<InterviewCandidate>) {
    setCandidates((current) => current.map((reviewed) => (
      reviewed.candidate.candidateId === candidateId
        ? { ...reviewed, candidate: { ...reviewed.candidate, ...update } }
        : reviewed
    )));
  }

  function setDecision(candidateId: string, decision: ReviewDecision) {
    setCandidates((current) => current.map((reviewed) => (
      reviewed.candidate.candidateId === candidateId ? { ...reviewed, decision } : reviewed
    )));
  }

  async function persistApproved() {
    if (isSaving || !candidates.some((candidate) => candidate.decision === "APPROVE")) return;
    setIsSaving(true);
    setError(null);
    try {
      const document = await saveInterview(
        workspace.path,
        workspace.projectId,
        modelId,
        candidates,
        replacementAuthorized,
      );
      setExisting(document);
      setSaved(document);
      setPhase("saved");
    } catch (saveError) {
      setError(errorDetails(saveError, "INTERVIEW_SAVE_FAILED", "Approved interview knowledge could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  const approvedCount = candidates.filter((candidate) => candidate.decision === "APPROVE").length;

  if (isLoading) {
    return <section className="interview-card"><p className="scope-note">Loading Project Interview…</p></section>;
  }

  return (
    <div className="interview-stack">
      {phase === "landing" ? (
        <section className="interview-card" aria-labelledby="interview-title">
          <span className="section-label">0E structured onboarding</span>
          <h2 id="interview-title">Project Interview</h2>
          <p className="scope-note">
            Answer one focused question at a time. AI output remains a review candidate until you explicitly approve and save it.
          </p>
          <label className="interview-model-select">
            Interview model
            <select value={modelId} disabled={models.length === 0} onChange={(event) => setModelId(event.target.value)}>
              {models.length === 0 ? <option value="">No configured models</option> : null}
              {models.map((model) => <option key={model.modelId} value={model.modelId}>{model.displayName}</option>)}
            </select>
          </label>
          {existing ? (
            <div className="existing-interview-notice">
              <strong>Interview-derived knowledge exists</strong>
              <p>{existing.candidates.length} approved candidates are stored for {workspace.name}.</p>
              <div className="interview-actions">
                <button className="outline-button" type="button" onClick={() => { setSaved(existing); setPhase("saved"); }}>
                  Review saved interview
                </button>
                <button className="outline-button" type="button" onClick={() => setPhase("confirm-replace")}>
                  Start replacement interview
                </button>
              </div>
            </div>
          ) : (
            <button className="primary-button" type="button" disabled={!modelId || Boolean(error)} onClick={() => beginInterview(false)}>
              Start Interview
            </button>
          )}
        </section>
      ) : null}

      {phase === "confirm-replace" ? (
        <section className="interview-card" aria-labelledby="replace-title">
          <span className="section-label">Explicit replacement required</span>
          <h2 id="replace-title">Replace saved interview knowledge?</h2>
          <p className="scope-note">Nothing will be overwritten until a new review is approved and saved.</p>
          <div className="interview-actions">
            <button className="primary-button" type="button" onClick={() => beginInterview(true)}>Confirm replacement interview</button>
            <button className="outline-button" type="button" onClick={() => setPhase("landing")}>Keep existing interview</button>
          </div>
        </section>
      ) : null}

      {phase === "interview" ? (
        <section className="interview-card" aria-labelledby="current-question-title">
          <div className="interview-progress">
            <span>{sectionLabel(section)}</span>
            <span>Section {sectionPosition(section)} of {INTERVIEW_SECTIONS.length}</span>
          </div>
          <span className="section-label">AI question</span>
          <h2 id="current-question-title">{question}</h2>
          <label className="interview-answer">
            Your answer
            <textarea rows={7} value={answer} onChange={(event) => setAnswer(event.target.value)} />
          </label>
          <div className="interview-actions">
            <button className="primary-button" type="button" disabled={isRunning || !answer.trim()} onClick={() => void submitAnswer()}>
              {isRunning ? "Preparing next question…" : "Next"}
            </button>
            <button className="outline-button" type="button" disabled={candidates.length === 0} onClick={() => setPhase("review")}>
              Generate Review
            </button>
            <button className="outline-button" type="button" onClick={cancelInterview}>Cancel Interview</button>
          </div>
          {lastTurn ? (
            <p className="scope-note" aria-label="Last interview usage">
              Last turn: {lastTurn.totalTokens ?? "unknown"} tokens · {lastTurn.latencyMs} ms · usage recorded locally
            </p>
          ) : null}
        </section>
      ) : null}

      {phase === "review" ? (
        <section className="interview-card" aria-labelledby="candidate-review-title">
          <span className="section-label">Human approval boundary</span>
          <h2 id="candidate-review-title">Candidate Review</h2>
          <p className="scope-note">Approve, edit, or discard each proposal. Pending and discarded candidates are not saved.</p>
          <div className="candidate-review-list">
            {candidates.map(({ candidate, decision }) => (
              <article className={`candidate-review candidate-${decision.toLowerCase()}`} key={candidate.candidateId}>
                <div className="candidate-badges">
                  <span>{candidate.area}</span>
                  <span>{candidate.provenance}</span>
                  <span>{candidate.status}</span>
                  <strong>{decision}</strong>
                </div>
                <label>
                  Title
                  <input value={candidate.title} onChange={(event) => updateCandidate(candidate.candidateId, { title: event.target.value })} />
                </label>
                <label>
                  Statement
                  <textarea rows={4} value={candidate.statement} onChange={(event) => updateCandidate(candidate.candidateId, { statement: event.target.value })} />
                </label>
                <label>
                  Proposed status
                  <select value={candidate.status} onChange={(event) => updateCandidate(candidate.candidateId, { status: event.target.value as InterviewCandidate["status"] })}>
                    <option value="DIRECTION">DIRECTION</option>
                    <option value="LOCKED">LOCKED</option>
                    <option value="TBD">TBD</option>
                  </select>
                </label>
                <div className="interview-actions">
                  <button className="outline-button" type="button" onClick={() => setDecision(candidate.candidateId, "APPROVE")}>Approve</button>
                  <button className="outline-button" type="button" onClick={() => setDecision(candidate.candidateId, "DISCARD")}>Discard</button>
                </div>
              </article>
            ))}
          </div>
          <div className="interview-actions">
            <button className="primary-button" type="button" disabled={approvedCount === 0 || isSaving} onClick={() => void persistApproved()}>
              {isSaving ? "Saving approved knowledge…" : `Save Approved (${approvedCount})`}
            </button>
            <button className="outline-button" type="button" onClick={() => setPhase("interview")}>Continue Interview</button>
            <button className="outline-button" type="button" onClick={cancelInterview}>Cancel without saving</button>
          </div>
        </section>
      ) : null}

      {phase === "saved" && saved ? (
        <>
          <SavedInterview document={saved} />
          <button className="outline-button interview-home-button" type="button" onClick={() => setPhase("landing")}>
            Return to Project Interview
          </button>
        </>
      ) : null}

      {error ? (
        <section className="evaluation-error" role="alert">
          <strong>{error.code}</strong>
          <p>{error.message}</p>
        </section>
      ) : null}
    </div>
  );
}
