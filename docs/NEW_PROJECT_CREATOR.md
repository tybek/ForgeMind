# New Project Creator and Recommended Next Steps

## Status and scope

**NPC-1 AND NPC-2 ARE COMPLETE. NEXT-1, NEXT-1.1, AND NEXT-1.2 ARE IMPLEMENTED AND HEADLESS-VALIDATED; THE UPDATED MANUAL ACTIONABILITY/REALITY CHECK REMAINS PENDING.** The deterministic manual-first Creator, reviewed Project Foundation, explicit native initialization, and existing-Compendium mapping are implemented. NPC-2 adds explicit Core Loop and Design Pillar proposal actions through the existing Nebius Token Factory boundary; its grounding/normalization and focused form-alignment recheck passed manually. NEXT-1 adds deterministic local recommendations to Workspace Home, NEXT-1.1 groups Foundation gaps and makes Reality connection actions explicit, and NEXT-1.2 separates detached Unity inspection from project-owned GroundTruth. NEXT-2 optional AI refinement is planned and not started. UI-2 is complete.

NEXT-1 does not extend NPC-2's provider work or start ForgeMind Studios, the general Context + Routing implementation, shared Security Preflight, Existing Project Rebaseline, or 0L. Milestone state remains owned by the [Roadmap](ROADMAP.md).

## Implemented NPC-1 boundary

**Start New Project** now enters an eight-step Creator before any directory picker opens. Identity and a meaningful natural-language pitch are the only required inputs. All other sections may remain incomplete and produce deterministic Open Questions tied only to those missing fields. Back/Continue, review editing, and failed initialization preserve the in-memory draft for the current session; cancellation writes nothing.

**Your Game Foundation** previews Identity / Vision, Player Experience, Core Loop, manually authored Design Pillars, World / Tone, Practical Constraints, and Open Questions. After **Create Project**, ForgeMind selects and inspects a local directory, refuses existing ForgeMind metadata or orphaned Compendium data, and requires **Initialize Project** before writing.

The existing native initialization command creates `.forgemind/project.json` plus `.forgemind/compendium.json`. The working title becomes Project identity. Completed foundation fields become `DIRECTION` knowledge with `USER_STATED` provenance and `new_project_creator` source; deterministic gaps become `TBD` Open Questions with `UNRESOLVED` provenance. No Decision is created, the Game Wiki continues to aggregate the Compendium, and there is no `creator.json` or `wiki.json`.

The NPC-1 manual path still makes no provider request. NPC-2 adds only user-triggered **Suggest Core Loops**, **Suggest Pillars**, and explicit regeneration. No request occurs on step entry, navigation, Review, directory selection, or initialization. Pitch refinement was deferred because Core Loop and Design Pillars satisfy the required milestone without broadening the surface.

## Implemented NPC-2 AI boundary

Core Loop requests return two or three typed alternatives with concise title, loop description, and optional rationale. Applying an alternative copies it into the in-memory Creator draft. Existing Core Loop text requires a separate replacement confirmation; regeneration and discard never alter accepted or manual text.

Design Pillar requests return three to six typed alternatives with title and explanation. A user may accept one or apply all up to the existing six-pillar limit. Existing manual pillars are preserved, normalized exact-title duplicates are not added, and accepted pillars remain editable and removable through the normal Creator fields. Proposal state is session-transient and may survive step navigation, but it never applies itself or enters `.forgemind`.

Both tasks use the existing Nebius Token Factory client, registered model lookup, safe provider errors, and application-local usage log. The deterministic Creator default resolves through the registry to `nvidia/nemotron-3-super-120b-a12b`. NPC-2.1 permits a user to choose another enabled Token Factory model already present in that registry, currently including DeepSeek, immediately before the request. This is not routing or automatic comparison: one confirmation makes one request to one selected model, with no automatic retry, winner, or second provider client. The bounded request contains only visible new-project Creator fields relevant to the tasks. It contains no workspace path, Recent Projects, Compendium, Decisions, Reality, repository content, credentials, or data from another project.

The native parser first accepts an exact JSON object, then may extract exactly one balanced object from harmless fencing or brief wrapper text. Zero, multiple, unbalanced, non-object, malformed, unknown, or hidden-reasoning structures still fail without returning a partial proposal. The optional top-level `summary` alias normalizes to the existing `note`; omitted, empty, or `null` assumptions normalize to `[]`. Assumption objects, non-string members, more than three items, missing proposal fields, and out-of-range proposal counts remain invalid. Successful result metadata exposes provider, exact model, latency, and available token counts without raw provider bodies or hidden reasoning. Application-local usage evidence records task category, provider/model, timestamp, tokens, latency, provider success, and structured-output success/failure; apply/discard outcomes are not persisted because the current pre-project usage log has no updateable run identity.

Accepted Core Loop and pillar fields carry compact `AI_ACCEPTED` draft origin. Explicit initialization maps those entries to the existing Compendium as `DIRECTION` / `AI_INFERRED` / `new_project_creator`; user-authored fields remain `USER_STATED`. Durable presence therefore follows generation -> explicit acceptance -> editable Review -> explicit initialization. No Decision is created or approved.

## Implemented NPC-2.1 polish boundary

**Suggest Core Loops**, **Suggest Pillars**, and every **Regenerate** now open a compact local preflight before any provider request. It identifies the task, provider, selected registry model, populated Creator context groups, deterministic approximate input-token range, `LOW` / `MEDIUM` / `HIGH` request-size band, and task/model-specific local latency history when available. One observation is labeled **Last observed**; several recent observations use a range. These values are local observations, not benchmark performance.

The size estimate is deliberately approximate because the provider owns exact tokenization. The band reflects estimated input size and is not a monetary quote. Registry pricing for the current Nemotron and DeepSeek entries is unavailable, so the UI says exact provider cost is unavailable and never fabricates a dollar amount. The native preflight response already has an optional cost-range field for future verified registry pricing.

Core Loop and Design Pillar proposal items may include zero to three concise `assumptions`. Prompts require any useful mechanic or direction not established by the Creator draft to appear there rather than masquerade as a fact. Assumptions render as review cues but are never copied into the draft, Compendium, Decisions, or Open Questions automatically. Applying a proposal still copies only its Core Loop or pillar content through the existing editable draft semantics.

NPC-2.2 makes the grounding instruction explicit for every proposal: compare each specific mechanic, resource, system, character role, and rule with the supplied Creator context, then generalize it or list it under assumptions when it is not established. This is an instruction inside the existing request, not a self-critique or second call. A new creative direction remains allowed when surfaced honestly as an assumption; one confirmation still produces exactly one provider request.

Creator AI History is bounded to the ten most recent runs in the current mounted Creator session. Successful entries store only the normalized proposal payload plus task, timestamp, provider/model, returned usage/latency, result status, and local product outcome. Failed entries store task, timestamp, provider/model, failed status, and safe error code with no proposal payload; response metadata available only after native parsing remains in the application-local usage log rather than being copied into the frontend failure. View and restore are local actions; restore changes only the current transient review proposal and never applies it. This drawer is not persisted, is not an authoritative usage database, and does not replace the existing application-local usage log. Because pre-project usage records do not have an updateable run identity, Apply/Discard/Regenerate outcomes remain only in session history.

Creator content now uses more desktop width while retaining bounded prose lines. Manual pillar rows keep title, explanation, provenance, and Remove aligned without spending a dedicated badge column; proposal cards use one, two, or three responsive columns only when readable. World & Tone and Constraints have persistent examples, concise constraint values use single-line inputs, and Major Constraints remains multiline. World AI assistance remains deferred.

NPC-2.2 fixes the remaining form alignment details without changing data semantics: all five Identity fields remain single-line controls with a shared fixed control height, while Pillar title and explanation labels start together, their controls align from the top, the accepted-AI badge stays secondary, and the row stacks at narrow widths. Pillar titles remain single-line and explanations remain multiline.

Use this direction with [Product](PRODUCT.md), [Workflows](WORKFLOWS.md), [ForgeMind UI Direction](UI_DIRECTION.md), [Context Builder and Task Router Architecture](CONTEXT_AND_ROUTING.md), [ForgeMind Studios Roadmap](STUDIOS_ROADMAP.md), and [Rebaseline Existing Project](PROJECT_REBASELINE.md). This document owns the onboarding and recommendation product contract; those documents continue to own their existing domains.

## Product goal

ForgeMind should be strongly usable by people who are new to game development and may begin with only a rough idea. It should help them express what they want to make and understand what to work on next without assuming game-design terminology or production experience.

The preferred journey is:

```text
Idea
-> guided conversation
-> AI-assisted structured Project Foundation
-> human review
-> Project Brain
-> Recommended Next Steps
```

The experience must not begin with a wall of forms or turn onboarding into a game-design course. ForgeMind teaches through short prompts, contextual help, and reviewable proposals.

## Creator interaction model

**Start New Project** should feel closer to guided RPG character creation than a traditional setup form. Each step asks one understandable question or presents one compact choice. The user can move through the flow without understanding terms such as *core loop* or *design pillar* in advance.

Prefer:

- short natural-language prompts;
- a small proposal or selection after the user answers;
- explicit **Accept**, **Edit**, **Remove**, **Regenerate**, and **Skip** actions where applicable;
- visible progress through a small number of meaningful steps;
- editable review before anything becomes durable project knowledge.

Avoid:

- large questionnaires or fifteen-field setup forms;
- rigid templates that force every game into the same structure;
- jargon-heavy prompts or mandatory production-management detail;
- silent AI calls, automatic acceptance, or automatic project-plan execution.

Regeneration is always an explicit new request. It does not replace accepted or edited content without review. Skipping a section records a visible gap or open question when useful; it does not invent an answer.

## Candidate MVP flow

### Step 1 - Identity

Capture a working title, genre or subgenre, and mode: single-player, co-op, or multiplayer. Perspective and target platform are optional when they help shape later proposals. Do not require final marketing names or exhaustive classifications.

### Step 2 - The Pitch

Ask:

> What is your game about?

The user answers naturally. ForgeMind proposes a concise structured pitch that the user can accept, edit, regenerate, or skip. The proposal remains non-authoritative until confirmed.

### Step 3 - Player Fantasy / Experience

Use accessible wording such as:

> Who is the player in this world, and what should the experience feel like?

Optional help may explain that this describes the role, emotions, and experience the game should create. Do not require the user to know the term *player fantasy*.

### Step 4 - Core Experience / Loop

Ask:

> What will the player do repeatedly during normal play?

Optional help:

> This helps ForgeMind understand the activity your game is built around.

If the user is uncertain, ForgeMind may propose two or three concise loop structures derived from reviewed prior answers. The user selects, combines, edits, rejects, or skips them; ForgeMind does not choose automatically.

### Step 5 - World / Tone

Gather the setting, desired tone, inspirations or references, and what the game should **not** feel like. References provide direction rather than permission to copy protected work or claim another project's assets as the user's own.

The implemented step uses persistent helper examples rather than fake defaults. AI-assisted World exploration remains a possible future product backlog item and is not part of NPC-2.1.

### Step 6 - Design Pillars

ForgeMind proposes approximately three to six concise pillars grounded in the reviewed answers. The user may accept, edit, remove, or explicitly regenerate each proposal. Pillars should be decision-useful constraints, not slogans or a generated feature list.

### Step 7 - Practical Constraints

Capture only enough information to prevent unrealistic guidance:

- engine;
- team size;
- target platform;
- scope ambition;
- major known constraints.

Do not expand this step into staffing, sprint planning, budgets, or a full production questionnaire.

### Step 8 - Review

Show an editable **Your Game Foundation** summary containing:

- Vision;
- Player Experience;
- Core Loop;
- Game Pillars;
- World / Tone;
- Constraints;
- Open Questions.

Every section remains reviewable. The user sees which content came directly from them, which content was AI-proposed, which content they edited or accepted, and which areas remain incomplete.

## Initialize the Project Brain

Only an explicit final confirmation may initialize project-owned knowledge. The reviewed foundation may create or populate appropriate owning records for:

- Game Vision;
- Player Experience;
- Core Loop;
- Game Pillars;
- World / Narrative seed;
- Constraints;
- Open Questions.

NPC-1 implements a previewable, deterministic mapping to Project identity and the existing Compendium. Project Brain remains a logical aggregate over those stores, not a new canonical database. Future NPC-2 must preserve user-authored versus AI-proposed provenance and the final human action that accepted each durable statement.

AI suggestions must not create or approve Decisions automatically. A suggestion that should become a Decision must enter the existing proposal and explicit approval lifecycle. Unaccepted, removed, regenerated, or skipped content must not silently become project truth.

## Project journey and Suites

The product journey should be understandable as:

```text
PROJECT -> AI STUDIO -> REALITY -> DELIVERY
```

- **PROJECT** defines what the game is and why through the Project Foundation and Project Brain.
- **AI STUDIO** expands or reviews that context through project-aware specialists.
- **REALITY** connects Git, Unity, and other supported implementation evidence.
- **DELIVERY** turns reviewed gaps and Intent into Feature Contracts and implementation-ready handoffs.

This ordering communicates movement from an idea toward implementation; it is not a rigid waterfall. Users may move freely between Suites, and the current shell must not claim a Suite or Studio exists before its roadmap phase is authorized.

## Foundation readiness

A future Home or Overview may summarize foundation readiness with explainable states rather than false precision.

- **Foundation:** Vision, Player Experience, Core Loop, Pillars.
- **Design:** systems, narrative, progression.
- **Build:** repository, Unity, Reality.
- **Delivery:** Alignment, Feature Contracts, implementation handoff.

Each signal should use a state such as **Complete**, **Partial**, **Not Defined**, or **Needs Review**, name the source or missing requirement, and route to its owning workflow. Do not show an opaque percentage such as "37% complete."

## Recommended Next Steps

Recommended Next Steps is an MVP target that answers:

> What should I work on next?

The initial system is deterministic, cheap, explainable, and available without AI. Optional AI refinement is a later, explicit layer over the same visible project signals; it never replaces deterministic state.

### Layer 1 - deterministic recommendations

Candidate rules include:

| Source signal | Recommendation |
| --- | --- |
| One or more Game Vision / Core Loop / Player Experience / Design Pillar fields are missing | Complete Game Foundation |
| Proposed Decisions exist | Review pending Decisions |
| Unity source is connected but this ForgeMind project has no attached GroundTruth | Complete Unity GroundTruth |
| Valid Unity GroundTruth has actionable coverage issues | Review Partial Unity Evidence |
| Git Reality is missing or stale | Refresh Repository Reality |
| `UNVERIFIED` or `OUT_OF_SYNC` Alignment exists | Review Alignment issue |
| A `DRAFT` Feature Contract exists | Continue Feature Contract |
| Repository inspection confirms no repository is connected | Connect Repository |
| Unity inspection confirms no Unity project is connected | Connect Unity Project |
| A new project has sparse reviewed knowledge | Continue Game Foundation |

NEXT-1.1 keeps fixed precedence without hidden scoring but groups all missing Game Vision, Core Loop, Player Experience, and Design Pillar fields into one high-priority recommendation. Its reason names every missing field and its structured source trace retains one fact per gap, freeing bounded Home slots for Reality, Decisions, Alignment, or Delivery. Uninspected Git/Unity remains **Inspect** and a completed inspection that finds no connected source becomes **Connect**. NEXT-1.2 distinguishes connected portable Unity inspection without attached GroundTruth from project-owned partial evidence: the former produces **Complete Unity GroundTruth**, while the latter produces **Review Partial Unity Evidence**. Complete valid evidence produces no Unity recommendation. Home never refreshes Reality automatically, and Refresh never implies exporter generation or coverage repair.

The approved-Intent-without-Reality relation is intentionally deferred because current data does not provide a safe general matcher beyond explicit Alignment/Feature Contract traces. A generic sparse-project rule is also unnecessary: the grouped Foundation and explicit Reality connection rules already explain the supported gaps without fabricating work. A user may disconnect or change a Unity source; a broad recommendation-dismissal system was not introduced.

### Recommendation contract

A recommendation contains more than a title:

- **title** - the action in accessible language;
- **reason / why now** - the project signal that triggered it;
- **area / Suite** - its product location;
- **target workflow** - the existing authoritative destination;
- **source signals** - traceable identifiers or safe summaries used by the rule;
- **priority / order** - deterministic ordering with an explainable basis;
- **effort band** - optional **Small**, **Medium**, or **Large**, never false precision.

Example:

> **Define combat philosophy**  
> **Why now:** Your Core Loop includes tactical combat, but no approved combat direction exists yet.  
> **Action:** Open Project -> Game Design.

Recommendations are derived guidance, not tasks or project truth. Dismissing, following, or viewing one does not silently alter the underlying source. The destination owns any resulting edits or approvals.

### Layer 2 - optional AI refinement

A later explicit **Ask AI for smarter suggestions** action may use bounded Project Brain context and current visible gaps to propose three to five project-aware actions. Each proposal may contain the recommendation, why now, affected area, suggested Studio or workflow, and an effort band.

AI-assisted recommendations remain advisory and preserve a source trace. They do not:

- run automatically;
- override deterministic project state;
- create tasks, milestones, Decisions, or project plans automatically;
- select or route to a model automatically;
- present ForgeMind as an autonomous producer or project manager.

This layer should reuse the future bounded context and source-trace rules in [Context Builder and Task Router Architecture](CONTEXT_AND_ROUTING.md) when those phases are authorized. Implemented NEXT-1 does not depend on AI or CR implementation; NEXT-2 remains optional and unstarted.

## Home and contextual guidance

UI-2 keeps a first-class **Recommended Next Steps** region that works before AI is invoked. A new project with multiple Foundation gaps shows one **Complete Game Foundation** action; existing projects may show **Connect Repository**, **Connect Unity Project**, **Review Alignment**, **Refresh Reality**, or **Continue Feature Contract**. The engine returns up to five actions: Home shows up to three, while UI-3 Project Overview shows up to five from the same derived result without removing the quick Home view or adding another recommendation store.

Workflows may also expose contextual guidance when relevant project context is missing. For example, opening a future Asset Studio without Art Direction may show:

> ForgeMind has limited visual context for this project.

Recommended action: **Define Art Direction**. The user can choose **Define Art Direction** or **Continue anyway**. Prefer guidance over hard feature locking unless a genuine safety or validity boundary requires a block.

## Equal onboarding paths

New and existing projects are equal paths into the same Project Brain and Suite model:

```text
NEW PROJECT
Idea -> guided Creator -> Project Foundation -> Project Brain

EXISTING PROJECT
Repository / Unity / docs -> Reality -> import and document review
-> focused missing-Intent questions -> Project Brain
```

The existing-project path is detailed in [Rebaseline Existing Project](PROJECT_REBASELINE.md). It remains Reality-first and non-destructive. Neither path may flatten documented Intent, approved Decisions, verified Reality, AI inference, and unresolved questions into one authority level.

## Hackathon demo target

The desired demonstration is:

```text
Start New Project
-> describe an idea
-> review ForgeMind's structured foundation, pillars, and loop
-> explicitly create the project
-> see meaningful Recommended Next Steps immediately
-> later connect Reality
-> Alignment
-> Feature Contract
-> Implementation Brief
```

This story should make ForgeMind understandable in its first screens while connecting directly to the completed Intent -> Reality -> Alignment -> Delivery loop.

## MVP boundary

The MVP target includes a guided Creator, explainable deterministic recommendations, optional bounded AI refinement, and explicit human approval. It does not include:

- an autonomous game producer;
- a giant generated production roadmap;
- automatic milestone or project-plan creation;
- Jira-style task management;
- hidden completion or priority scoring;
- automatic Decision approval;
- automatic execution of recommended actions.

## Planned phases

- **NPC-0 - New Project Creator specification:** this document; documentation complete.
- **NPC-1 - Guided Creator Foundation:** complete after headless validation and user-driven manual visual/persistence PASS; step navigation, accessible prompts, local draft state, editable review, deterministic Open Questions, explicit directory inspection/initialization, and existing-store persistence with no required AI.
- **NPC-2 - AI-assisted Game Foundation proposals:** complete after headless validation and the final manual live-AI recheck. Explicit bounded Core Loop and Design Pillar proposals, regeneration, compact accepted-origin provenance, safe errors, usage evidence, and human-controlled review behavior remain intact. Five successful Creator observations and one safely handled structured-output failure are recorded without deriving a reliability percentage or universal model score.
- **NPC-2.1 - Creator AI UX, Grounding & Evidence Polish:** complete after headless and manual verification of preflight/Cancel, model selection, single-request execution, proposal Apply/edit/regeneration, AI History, World helper copy, Pillar application, Review, initialization, and persistence/reopen.
- **NPC-2.2 - Creator grounding + form alignment patch:** complete after headless validation and the focused manual recheck. The explicit per-proposal grounding pass remains; exact, fenced, or briefly wrapped single-object JSON receives strict schema validation; omitted/empty/`null` assumptions normalize safely; malformed, ambiguous, unknown, oversized, or hidden-reasoning structures still fail. The final live request returned two valid proposals and surfaced unsupported/new mechanics separately as assumptions.
- **NPC-3 - Review -> initialize Project Brain:** the originally separated mapping and initialization behavior was explicitly delivered inside NPC-1; no additional NPC-3 behavior was started.
- **NEXT-1 - Deterministic Recommended Next Steps:** implemented and headless-validated. Typed signals, fixed rule precedence, safe session Reality handling, structured source facts, bounds, Home rendering, project switching, and existing-workflow navigation require no AI and persist no recommendation.
- **NEXT-1.1 - Actionability + Reality Connection UX:** implemented and headless-validated with manual recheck pending. Foundation gaps aggregate without losing source facts; Design Pillars use the existing Compendium convention; explicit detached Git/Unity folder selection is project-scoped and read-only; disconnected inspection states become connection actions.
- **NEXT-1.2 - Detached Unity GroundTruth Semantics:** implemented and headless-validated with manual recheck pending. Portable inspection follows the detached Unity source, while project-owned GroundTruth and Alignment evidence remain anchored to the active ForgeMind project. Foreign manifests are not adopted; completion and partial-coverage recommendations use accurate non-Refresh wording.
- **NEXT-2 - Optional AI recommendation refinement:** planned and not started. Any future action must be explicit, bounded, source-traced, advisory, and incapable of automatic execution or persistence.

NPC-1 and NPC-2 are complete. NEXT-1 through NEXT-1.2 are implemented and headless-validated, while the updated manual Home/Reality visual and private dogfood project regression check remains pending. NEXT-2 requires separate roadmap authorization.

## Acceptance direction for later implementation

Later implementation should prove that:

- a beginner can move from a rough idea to a reviewed foundation without a large form;
- AI proposals stay visibly separate until accepted;
- durable writes occur only after explicit review and confirmation through owning domains;
- deterministic recommendations work with no AI credential or provider call;
- every recommendation explains its source signal and routes to an existing workflow;
- unavailable, missing, stale, and conflicting evidence remain distinguishable;
- no recommendation or Creator action approves Decisions, creates execution plans, or performs implementation automatically.
