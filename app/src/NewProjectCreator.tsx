import { useState, type ReactNode } from "react";
import { BrandLockup, LineIcon } from "./designSystem";
import type {
  FoundationPillar,
  ProjectFoundationInput,
} from "./platform/workspaceDirectory";

const steps = [
  { label: "Identity", eyebrow: "Shape the starting point" },
  { label: "Pitch", eyebrow: "Describe the idea naturally" },
  { label: "Experience", eyebrow: "Define the player experience" },
  { label: "Core Loop", eyebrow: "Find the repeated activity" },
  { label: "World", eyebrow: "Set the world and tone" },
  { label: "Pillars", eyebrow: "Choose what guides decisions" },
  { label: "Constraints", eyebrow: "Keep the idea grounded" },
  { label: "Review", eyebrow: "Your Game Foundation" },
] as const;

type FoundationKey = Exclude<keyof ProjectFoundationInput, "pillars" | "openQuestions">;

export const emptyProjectFoundation: ProjectFoundationInput = {
  workingTitle: "",
  genre: "",
  mode: "",
  perspective: "",
  targetPlatform: "",
  pitch: "",
  playerExperience: "",
  coreLoop: "",
  setting: "",
  tone: "",
  inspirations: "",
  antiInspirations: "",
  pillars: [],
  engine: "",
  teamSize: "",
  expectedScope: "",
  majorConstraints: "",
  openQuestions: [],
};

export function deriveOpenQuestions(draft: ProjectFoundationInput): string[] {
  const questions: string[] = [];
  if (!draft.targetPlatform.trim()) questions.push("Which platform should the game target first?");
  if (!draft.playerExperience.trim()) questions.push("What should the player feel or become during play?");
  if (!draft.coreLoop.trim()) questions.push("What will players do again and again?");
  if (!draft.pillars.some((pillar) => pillar.title.trim())) questions.push("Which design pillars should guide the project?");
  if (!draft.setting.trim() && !draft.tone.trim()) questions.push("What world and tone should shape the experience?");
  if (!draft.engine.trim()) questions.push("Which engine will the project use?");
  if (!draft.majorConstraints.trim()) questions.push("What major practical constraints still need to be defined?");
  return questions;
}

export function hasSubstantialCreatorDraft(draft: ProjectFoundationInput): boolean {
  return Object.entries(draft).some(([key, value]) => {
    if (key === "openQuestions") return false;
    if (Array.isArray(value)) return value.some((item) => typeof item === "object" && item !== null && "title" in item && typeof item.title === "string" && item.title.trim().length > 0);
    return typeof value === "string" && value.trim().length > 0;
  });
}

function Field({
  label,
  value,
  onChange,
  optional = false,
  multiline = false,
  help,
  maxLength = 2_000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  multiline?: boolean;
  help?: string;
  maxLength?: number;
}) {
  const id = `creator-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label className="creator-field" htmlFor={id}>
      <span>{label}{optional ? <small>Optional</small> : null}</span>
      {multiline ? (
        <textarea id={id} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input id={id} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
      )}
      {help ? <small>{help}</small> : null}
    </label>
  );
}

function ReviewValue({ children }: { children: string }) {
  return children.trim() ? <p>{children}</p> : <p className="creator-empty-value">Not defined yet.</p>;
}

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <article className="creator-review-section">
      <div className="creator-review-heading">
        <h3>{title}</h3>
        <button className="text-button" type="button" onClick={() => onEdit(step)}>Edit {title}</button>
      </div>
      {children}
    </article>
  );
}

export function NewProjectCreator({
  draft,
  onChange,
  onChooseDirectory,
  selectedDirectory,
  onInitialize,
  isInitializing,
  creationError,
  onClearDirectory,
  onCancel,
}: {
  draft: ProjectFoundationInput;
  onChange: (draft: ProjectFoundationInput) => void;
  onChooseDirectory: (foundation: ProjectFoundationInput) => Promise<void>;
  selectedDirectory: string | null;
  onInitialize: (foundation: ProjectFoundationInput) => Promise<void>;
  isInitializing: boolean;
  creationError: string | null;
  onClearDirectory: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const current = steps[step];
  const openQuestions = deriveOpenQuestions(draft);
  const reviewedPillars = draft.pillars.filter((pillar) => pillar.title.trim());
  const foundation = { ...draft, pillars: reviewedPillars, openQuestions };
  const firstOpenQuestionStep = !draft.targetPlatform.trim()
    ? 0
    : !draft.playerExperience.trim()
      ? 2
      : !draft.coreLoop.trim()
        ? 3
        : reviewedPillars.length === 0
          ? 5
          : !draft.setting.trim() && !draft.tone.trim()
            ? 4
            : 6;

  function update(key: FoundationKey, value: string) {
    onChange({ ...draft, [key]: value });
    setValidationError(null);
    setConfirmDiscard(false);
  }

  function updatePillar(index: number, patch: Partial<FoundationPillar>) {
    onChange({
      ...draft,
      pillars: draft.pillars.map((pillar, pillarIndex) => pillarIndex === index ? { ...pillar, ...patch } : pillar),
    });
  }

  function goNext() {
    if (step === 0 && !draft.workingTitle.trim()) {
      setValidationError("Add a working title before continuing.");
      return;
    }
    if (step === 1 && draft.pitch.trim().length < 10) {
      setValidationError("Describe the game in at least a short sentence.");
      return;
    }
    setValidationError(null);
    if (returnToReview && step < 7) {
      setStep(7);
      setReturnToReview(false);
    } else {
      setStep((currentStep) => Math.min(7, currentStep + 1));
    }
  }

  function editFromReview(target: number) {
    onClearDirectory();
    setReturnToReview(true);
    setStep(target);
  }

  function requestCancel() {
    if (!hasSubstantialCreatorDraft(draft)) {
      onCancel();
      return;
    }
    setConfirmDiscard(true);
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <>
            <div className="creator-question">
              <h1>Give your game a starting identity.</h1>
              <p>A working title and a few plain-language cues are enough. Nothing here needs to be final.</p>
            </div>
            <div className="creator-fields creator-fields--two-column">
              <Field label="Working title" value={draft.workingTitle} maxLength={120} onChange={(value) => update("workingTitle", value)} />
              <Field label="Genre / subgenre" value={draft.genre} optional maxLength={120} onChange={(value) => update("genre", value)} help="For example: tactical RPG, cozy builder, action roguelite." />
              <Field label="Mode" value={draft.mode} optional maxLength={120} onChange={(value) => update("mode", value)} help="Single-player, co-op, multiplayer, or your own description." />
              <Field label="Perspective" value={draft.perspective} optional maxLength={120} onChange={(value) => update("perspective", value)} help="First-person, top-down, side-on, or something less conventional." />
              <Field label="Target platform" value={draft.targetPlatform} optional maxLength={120} onChange={(value) => update("targetPlatform", value)} />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <div className="creator-question">
              <h1>What is your game about?</h1>
              <p>Write it naturally. This can be a rough idea, not a polished elevator pitch.</p>
            </div>
            <div className="creator-fields">
              <Field label="Game pitch" value={draft.pitch} multiline onChange={(value) => update("pitch", value)} />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="creator-question">
              <h1>What should the player feel like they are doing or becoming?</h1>
              <p>Think about their role, the emotions you want to create, and what makes the experience satisfying.</p>
            </div>
            <div className="creator-fields">
              <Field label="Player experience" value={draft.playerExperience} multiline optional onChange={(value) => update("playerExperience", value)} />
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className="creator-question">
              <h1>What will players do again and again?</h1>
              <p>Describe the repeated activity in normal play. It can still be uncertain.</p>
            </div>
            <div className="creator-fields">
              <Field label="Core loop" value={draft.coreLoop} multiline optional onChange={(value) => update("coreLoop", value)} />
            </div>
          </>
        );
      case 4:
        return (
          <>
            <div className="creator-question">
              <h1>Where does the game live, and how should it feel?</h1>
              <p>References are context only. They do not grant permission to copy another game or its content.</p>
            </div>
            <div className="creator-fields creator-fields--two-column">
              <Field label="Setting / world" value={draft.setting} multiline optional maxLength={800} onChange={(value) => update("setting", value)} />
              <Field label="Desired tone" value={draft.tone} multiline optional maxLength={800} onChange={(value) => update("tone", value)} />
              <Field label="Inspirations" value={draft.inspirations} multiline optional maxLength={800} onChange={(value) => update("inspirations", value)} />
              <Field label="What should it NOT feel like?" value={draft.antiInspirations} multiline optional maxLength={800} onChange={(value) => update("antiInspirations", value)} />
            </div>
          </>
        );
      case 5:
        return (
          <>
            <div className="creator-question">
              <h1>What should guide design decisions?</h1>
              <p>Add up to six short pillars. Three to six is useful, but you can leave this open for now.</p>
            </div>
            <div className="creator-pillar-list">
              {draft.pillars.map((pillar, index) => (
                <article className="creator-pillar" key={index}>
                  <Field label={`Pillar ${index + 1} title`} value={pillar.title} maxLength={80} onChange={(value) => updatePillar(index, { title: value })} />
                  <Field label={`Pillar ${index + 1} explanation`} value={pillar.explanation} multiline optional maxLength={400} onChange={(value) => updatePillar(index, { explanation: value })} />
                  <button className="text-button creator-remove-pillar" type="button" onClick={() => onChange({ ...draft, pillars: draft.pillars.filter((_, pillarIndex) => pillarIndex !== index) })}>Remove pillar {index + 1}</button>
                </article>
              ))}
              {draft.pillars.length < 6 ? (
                <button className="outline-button creator-add-pillar" type="button" onClick={() => onChange({ ...draft, pillars: [...draft.pillars, { title: "", explanation: "" }] })}>
                  <LineIcon name="document" /> Add design pillar
                </button>
              ) : null}
            </div>
          </>
        );
      case 6:
        return (
          <>
            <div className="creator-question">
              <h1>What practical limits shape the project?</h1>
              <p>Only capture enough context to keep future guidance realistic. This is not a production plan.</p>
            </div>
            <div className="creator-fields creator-fields--two-column">
              <Field label="Engine" value={draft.engine} optional maxLength={120} onChange={(value) => update("engine", value)} />
              <Field label="Team size" value={draft.teamSize} optional maxLength={120} onChange={(value) => update("teamSize", value)} />
              <Field label="Expected scope" value={draft.expectedScope} optional maxLength={400} onChange={(value) => update("expectedScope", value)} help="For example: a 20-minute prototype, a small commercial game, or an evolving hobby project." />
              <Field label="Major constraints" value={draft.majorConstraints} multiline optional maxLength={800} onChange={(value) => update("majorConstraints", value)} />
            </div>
            {draft.targetPlatform.trim() ? <p className="creator-context-note">Target platform from Identity: <strong>{draft.targetPlatform}</strong></p> : null}
          </>
        );
      default:
        return (
          <>
            <div className="creator-question creator-review-intro">
              <h1>Your Game Foundation</h1>
              <p>ForgeMind will save this user-authored intent to the project Compendium only after you choose a directory and confirm initialization.</p>
            </div>
            <div className="creator-review-grid">
              <article className="creator-review-section">
                <div className="creator-review-heading">
                  <h3>Identity / Vision</h3>
                  <div className="creator-review-actions">
                    <button className="text-button" type="button" onClick={() => editFromReview(0)}>Edit Identity</button>
                    <button className="text-button" type="button" onClick={() => editFromReview(1)}>Edit Vision</button>
                  </div>
                </div>
                <h4>{draft.workingTitle}</h4>
                <ReviewValue>{[draft.genre, draft.mode, draft.perspective, draft.targetPlatform].filter(Boolean).join(" · ")}</ReviewValue>
                <ReviewValue>{draft.pitch}</ReviewValue>
              </article>
              <ReviewSection title="Player Experience" step={2} onEdit={editFromReview}><ReviewValue>{draft.playerExperience}</ReviewValue></ReviewSection>
              <ReviewSection title="Core Loop" step={3} onEdit={editFromReview}><ReviewValue>{draft.coreLoop}</ReviewValue></ReviewSection>
              <ReviewSection title="Design Pillars" step={5} onEdit={editFromReview}>
                {reviewedPillars.length > 0 ? <ul>{reviewedPillars.map((pillar, index) => <li key={index}><strong>{pillar.title}</strong>{pillar.explanation ? ` — ${pillar.explanation}` : ""}</li>)}</ul> : <ReviewValue>{""}</ReviewValue>}
              </ReviewSection>
              <ReviewSection title="World & Tone" step={4} onEdit={editFromReview}>
                <ReviewValue>{[draft.setting, draft.tone, draft.inspirations, draft.antiInspirations].filter(Boolean).join("\n")}</ReviewValue>
              </ReviewSection>
              <ReviewSection title="Practical Constraints" step={6} onEdit={editFromReview}>
                <ReviewValue>{[draft.engine, draft.teamSize, draft.targetPlatform, draft.expectedScope, draft.majorConstraints].filter(Boolean).join("\n")}</ReviewValue>
              </ReviewSection>
              <ReviewSection title="Open Questions" step={firstOpenQuestionStep} onEdit={editFromReview}>
                {openQuestions.length > 0 ? <ul>{openQuestions.map((question) => <li key={question}>{question}</li>)}</ul> : <p>No foundation gaps were detected from the fields you completed.</p>}
              </ReviewSection>
            </div>
            <section className="creator-directory" aria-labelledby="creator-directory-title">
              <div>
                <p className="eyebrow">Local project</p>
                <h2 id="creator-directory-title">{selectedDirectory ? "Ready to initialize" : "Choose where this project lives"}</h2>
                <p>{selectedDirectory ? selectedDirectory : "No directory is selected yet. Choosing one inspects it first and does not create files."}</p>
              </div>
              {selectedDirectory ? (
                <div className="creator-directory-actions">
                  <button className="primary-button" type="button" disabled={isInitializing} onClick={() => void onInitialize(foundation)}>{isInitializing ? "Creating project…" : "Initialize Project"}</button>
                  <button className="outline-button" type="button" disabled={isInitializing} onClick={() => void onChooseDirectory(foundation)}>Choose another directory</button>
                </div>
              ) : (
                <button className="primary-button" type="button" onClick={() => void onChooseDirectory(foundation)}>Create Project</button>
              )}
            </section>
            {creationError ? <p className="creator-inline-error" role="alert">{creationError}</p> : null}
          </>
        );
    }
  }

  return (
    <main className="creator-shell">
      <header className="creator-topbar">
        <BrandLockup compact />
        <button className="text-button" type="button" onClick={requestCancel}>Return Home</button>
      </header>
      <div className="creator-layout">
        <aside className="creator-progress" aria-label="New Project Creator progress">
          <p className="eyebrow">New Project Creator</p>
          <ol>
            {steps.map((item, index) => (
              <li className={index === step ? "creator-step creator-step--active" : index < step ? "creator-step creator-step--complete" : "creator-step"} aria-current={index === step ? "step" : undefined} key={item.label}>
                <span>{index + 1}</span>{item.label}
              </li>
            ))}
          </ol>
        </aside>
        <section className="creator-stage" aria-labelledby="creator-step-title">
          <p className="eyebrow" id="creator-step-title">Step {step + 1} of {steps.length} · {current.eyebrow}</p>
          {renderStep()}
          {validationError ? <p className="creator-inline-error" role="alert">{validationError}</p> : null}
          {confirmDiscard ? (
            <div className="creator-discard-confirmation" role="alertdialog" aria-labelledby="discard-creator-title">
              <div><strong id="discard-creator-title">Discard this foundation draft?</strong><p>No workspace has been created yet.</p></div>
              <button className="danger-button" type="button" onClick={onCancel}>Discard and return Home</button>
              <button className="outline-button" type="button" onClick={() => setConfirmDiscard(false)}>Continue editing</button>
            </div>
          ) : null}
          {step < 7 ? (
            <footer className="creator-navigation">
              <button className="outline-button" type="button" disabled={step === 0} onClick={() => { setValidationError(null); setStep((currentStep) => Math.max(0, currentStep - 1)); }}>Back</button>
              <button className="primary-button" type="button" onClick={goNext}>{returnToReview ? "Return to Review" : "Continue"}</button>
            </footer>
          ) : (
            <footer className="creator-navigation creator-navigation--review">
              <button className="outline-button" type="button" onClick={() => { onClearDirectory(); setStep(6); }}>Back</button>
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}
