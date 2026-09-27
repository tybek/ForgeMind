# ForgeMind UI Direction

## Status and scope

This document records the agreed product and interface direction for ForgeMind. It distinguishes implemented presentation foundations from future dashboard and consistency work.

**UI-1 AND UI-2 ARE COMPLETE.** Their shared foundation, Workspace Home, and manual visual passes are complete. NEXT-1 now fills the reserved Home recommendation region with deterministic project-aware guidance and is headless-validated; its short manual card/navigation check remains pending. UI-3 and later phases have not started. Do not rewrite working behavior solely to make it fit this direction or treat the completed phases as authorization for future information architecture.

Use this document with the [ForgeMind Brandbook](BRANDBOOK.md), [Product Direction](PRODUCT.md), and [Roadmap](ROADMAP.md). The Brandbook owns visual identity and voice; this document owns information architecture, dashboard behavior, layout, workflow, artwork policy inside the product, and phased UI implementation.

The Brandbook's [concept and visual-direction references](BRANDBOOK.md#concept--visual-direction-references) illustrate the desired workshop/control-room atmosphere and possible dashboard composition. They are generated references rather than final UI specifications; this document's behavior, hierarchy, accessibility, authority, and phased-scope rules take precedence over literal reproduction.

## Product experience

ForgeMind should feel like an AI game-development workspace, project control center, and creative production cockpit built for people making real games. The useful metaphor is:

**workshop + control room + creative studio**

The experience should be competent, focused, modern, practical, creative, technically credible without feeling sterile, and premium without feeling corporate. It should feel game-development native without becoming an esports interface.

ForgeMind should not resemble a generic administration dashboard, Notion clone, Jira clone, ChatGPT clone, form-heavy documentation system, or an over-decorated gaming UI.

The governing principle is:

> ForgeMind should make complex game development feel clearer, not more complicated.

## Core UX principles

### Clarity before decoration

Hierarchy, current state, provenance, and the next useful action matter more than visual novelty. Decoration may establish atmosphere, but it must never obscure project state or compete with editing and review.

### Reduce typing

ForgeMind should reduce documentation work, not create more of it. When enough reviewed context exists, complex artifacts should increasingly follow this flow:

```text
User intent
-> ForgeMind gathers relevant context
-> an appropriate specialist or model proposes a draft
-> the human reviews choices
-> the human edits only where needed
-> explicit approval
-> implementation handoff
```

Manual entry remains available as an escape hatch. A useful artifact should usually take minutes to review rather than 15 or more minutes to author from an empty form.

### Explain state

Do not invent opaque health scores or unexplained recommendations. Every project-health summary, suggested next step, and status must be traceable to understandable project data. If a score is added later, its inputs and calculation must be visible.

### Keep authority visible

Documented Intent, approved Decisions, verified Reality, derived Alignment, AI analysis, drafts, and approved delivery artifacts must remain visibly distinct. AI output is a proposal until a person applies, saves, promotes, or approves it through the owning workflow.

### One local priority

Each card or local action area should have one clear purpose, one primary state or value, and at most one visually primary action. Secondary and tertiary controls should not compete with the next recommended action.

### Resume work in place

Dashboards should help the user continue meaningful work, not become a second task-management system. A recommendation or activity item should route to the existing authoritative workspace and preserve context where practical.

## Workspace Home

The future Home screen should answer three questions quickly:

- What am I working on?
- What is the current state of my projects?
- What should I do next?

Home may be more atmospheric than dense project workspaces, but utility remains primary.

### Welcome / hero

Use a short, calm welcome such as:

- **Good morning. What shall we build today?**
- **Welcome back. Continue building your game.**

The hero may use subtle ForgeMind branding or real project artwork. It must not push recent work and next steps below a large decorative surface.

### Recent Projects

Show compact project cards with:

- user-selected cover, real project image, or branded fallback;
- project name;
- compact, explainable state;
- last opened or updated time;
- optional short metadata when it helps selection.

Primary actions are **Open project**, **View all**, and **Open another project**. Raw filesystem paths may remain available as secondary technical metadata, but they must not be the dominant visual identifier.

### Recommended Next Steps

NEXT-1 shows up to three compact Home actions from a deterministic list bounded to five. Each card names the area and priority, explains the current source-backed reason in plain language, and routes to an existing owning workflow. Source-signal internals stay out of the normal card. The rule layers, recommendation fields, beginner onboarding relationship, and authority boundaries are specified in [New Project Creator and Recommended Next Steps](NEW_PROJECT_CREATOR.md). AI is not used.

Examples include:

- Review an unresolved Alignment issue.
- Continue a Feature Contract.
- Refresh Unity GroundTruth.
- Review a proposed Decision.
- Review new AI analysis.
- Generate an Implementation Brief.

Each recommendation should state why it appears, expose its source signals, and route to the owning workflow. It remains derived guidance rather than a task or new source of truth. Avoid generic productivity advice, automatic execution, hidden ranking, or an unbounded task feed.

## Project Overview Dashboard

After project selection, land on a project cockpit that answers: what is true, what needs attention, and what can be continued now.

### Project Health

Summarize explainable signals such as:

- Intent coverage;
- unresolved Alignment issues;
- Reality freshness;
- Decision state;
- Feature Contract state.

Do not collapse these dimensions into a meaningless score. A future aggregate score is acceptable only when its calculation and source data are explainable.

### Active Decisions

Show approved and proposed counts, the most relevant recent or current Decision, and one action to open Decisions.

### AI Insights

Use **AI Insights**, not **All Insights**. Possible content includes recent specialist analyses, unpromoted findings, the last specialist run, and analysis awaiting review. The primary action is **Open AI Studio**. Analysis remains non-authoritative.

### Feature Contracts

Show draft and approved counts, the latest or currently relevant contract, and one action to **Continue Contract**. Do not duplicate the contract editor on the dashboard.

## Project dashboard secondary sections

### Recent Activity

Aggregate a bounded set of meaningful events from existing timestamps and domain data where possible:

- Decision approved;
- Alignment Review approved;
- Feature Contract created or approved;
- Unity GroundTruth refreshed;
- Git Reality refreshed or changed;
- specialist run completed.

This is a concise project narrative, not an enterprise audit log. Do not create a new competing event store merely to populate the first version.

### Continue Building

Present resumable or consequential next work, such as:

- Continue Feature Contract;
- Resolve Alignment issue;
- Review Decision;
- Refresh Reality;
- Run specialist analysis;
- Generate Implementation Brief.

Treat this as a lightweight, derived work queue. It does not introduce sprints, Kanban, assignment, time tracking, or a new source of task truth.

## Long-term information architecture

The future shell direction combines three layers:

1. a horizontal Suite switcher expressing the journey **Project**, **AI Studio**, **Reality**, and **Delivery** above or before the page-title area;
2. persistent global navigation for **Overview**, **Game Wiki**, **Repository / Git Reality**, **Unity**, and **Alignment**;
3. a contextual lower sidebar section for the active Suite.

Project may eventually contain the guided Creator, Project Foundation, Game Design, Narrative, Technical, Roadmap, Decisions, and Project Interview. AI Studio may contain the existing AI Behavior Designer and Model Evaluation entry points plus explicitly authorized future Studios. Reality may later add focused tools while the core Reality shortcuts remain globally available. Delivery may contain Feature Contracts and future Implementation Brief workflows. This order suggests movement from idea toward implementation, not a rigid waterfall; users may move between Suites freely.

The current shell only prepares typed metadata and restrained global/contextual grouping. It does not render a Suite switcher, change routes, or claim that a Studio exists. Existing future placeholders remain explicitly labeled **Planned**. Use an icon plus label for each destination and preserve existing ownership until a scoped phase authorizes more.

### UI-1 manual findings retained for later phases

- Game Wiki remains a legacy, vertically dense surface. Its large derived-summary cards should be compacted only in the future UI-4 consistency pass.
- Unity's bounded truncation semantics remain correct. A future copy pass may prefer **Partial coverage** and **10,000+ fields indexed** over developer-oriented `BOUNDED / TRUNCATED` wording without changing the underlying coverage classification.

## AI-assisted workflow direction

The long-term entry point may ask:

> What do you want to work on?

Given a short intent such as “I want enemies to react to sound without omniscience,” ForgeMind may eventually:

1. infer a likely task type;
2. gather relevant Project Brain context;
3. suggest an appropriate specialist or workflow;
4. recommend a model when supported by local task-specific evidence;
5. generate a structured proposal;
6. let the user accept, edit, or reject sections;
7. create the owning artifact only after explicit confirmation;
8. hand reviewed scope to implementation.

Potential categories include Behavior Design, Exploit Analysis, Balance Analysis, Encounter Design, Progression Design, Technical Impact, Test Design, Code Documentation, Feature Contract drafting, and Implementation Brief generation.

Model recommendations should eventually use local task-specific evaluation data, show sample size and limitations, and remain unavailable when evidence is insufficient. Never claim one model is universally best or route work automatically without explicit scope.

## Layout and interaction direction

- Use responsive workbenches for list/editor/detail relationships; preserve selection when panes stack.
- Keep history compact and scannable. Put detail and editing in a stable pane rather than expanding the whole page repeatedly.
- Place progress, success, warning, and failure feedback beside the action that caused it.
- Prefer review surfaces, structured choices, sensible defaults, and section-level apply controls over many empty text areas.
- Keep source trace, provenance, uncertainty, and evidence readable but compact.
- Use progressive disclosure for advanced controls, long evidence, diagnostics, and secondary metadata.
- Preserve meaningful empty, loading, running, success, warning, error, history/detail, dialog, compact, and wide states.
- Keep destructive actions explicit, local, and visually distinct; do not place them beside a primary action without separation.
- Use motion only for quick functional feedback. Never make the user wait for decorative animation.

### Implemented Creator layout guidance

NPC-2.1 keeps the New Project Creator prose headings at a readable line length while allowing fields and AI proposal regions to grow across more of the desktop stage. At the default `1180x760` window, proposal grids should favor two readable columns; a third Design Pillar column is reserved for genuinely wide viewports, and narrow layouts stack to one. Vertical page scrolling is acceptable, horizontal scrolling is not, and the Tauri default dimensions remain unchanged.

Manual Design Pillars use full-width row/cards: title and explanation share the row where space permits, Remove has a stable action position, and AI-assisted provenance remains a small secondary badge near the title rather than a dedicated grid column. The compact preflight is modal because it gates a provider request; session-only Creator AI History is a closed-by-default right drawer because it is secondary recovery state, not project truth or a permanent default-width column.

## Feature Contract follow-up from 0K dogfooding

UI-1 supplies shared styling for the current Feature Contract workbench but does not redesign its information architecture. The following product questions remain for a later explicitly scoped phase:

- The Create Contract source preview should move toward compact stacked metadata instead of consuming a wide horizontal row.
- The editor, AI Draft Proposal, and Implementation Brief may benefit from focused **Contract**, **AI Draft**, and **Brief** subviews or an equivalent panel model so the transient proposal does not compete with the primary editor.
- Safe provider rejection must remain enforced. If the native/provider boundary can expose an allowlisted category without raw or sensitive content, the UI should distinguish safety, path, and size rejection more clearly than the current broad message.
- `SUPERSEDED` and `DEPRECATED` history remains intentionally preserved. A future product decision must choose between an explicit Restore/Reopen action and requiring a successor Draft; UI work must not weaken current lifecycle semantics implicitly.

## Surface direction

The visual system is defined in the [Brandbook](BRANDBOOK.md). Product layouts should apply it with these constraints:

- deep dark base with slightly lighter working surfaces;
- subtle borders and minimal shadows;
- moderate corner radius;
- orange reserved for brand emphasis, primary actions, and selected states;
- semantic colors reserved for state meaning;
- cards grouped by purpose rather than putting every text fragment in its own box;
- dense editing workspaces progressively more functional and less decorative than Home.

## Artwork policy inside the product

The application must not present random generated fantasy artwork as if it belongs to the user's project. Preferred project-image sources are:

1. user-selected project cover;
2. user-uploaded concept art;
3. actual project or game screenshot;
4. a future Unity-derived screenshot;
5. neutral ForgeMind branded fallback.

When no project image exists, use an abstract dark branded fallback. Home may use restrained cinematic atmosphere; dense project workspaces should avoid large background art that harms readability.

## Accessibility and adaptability

- Never communicate state through color alone; retain explicit text labels.
- Maintain readable contrast for text, borders, focus, and disabled states.
- Preserve visible keyboard focus and semantic controls.
- Keep icons accompanied by labels in primary navigation and unfamiliar actions.
- Test wide and compact layouts; stacking must preserve workflow order, selection, and local feedback.
- Respect reduced-motion preferences when motion is introduced.

## Phased implementation status

These phases are recorded in the [Roadmap](ROADMAP.md). UI-1 and UI-2 are complete; UI-3 through UI-5 remain planned and not started.

### UI-1 — Brand / Design System Foundation — COMPLETE

- establish color tokens;
- establish typography hierarchy;
- establish one dependency-free line-icon convention;
- define card, button, badge, spacing, radius, border, focus, and motion tokens;
- polish the sidebar shell without changing information ownership;
- integrate original responsive SVG mark, wordmark, and lockup configurations.

Implementation includes semantic CSS tokens; shared typography, surface, button, badge, loading/feedback, icon-action, and empty-state primitives; original production SVG brand assets; a responsive shell; compact project identity; selected navigation; a consistent page-header pattern; and light adoption in representative existing workflows. Suite-ready metadata now separates persistent global destinations from contextual Project, AI, and Delivery tools without a Suite switcher or new route. It does not build Home or Project Dashboard, implement a Studio, or complete the UI-4 consistency migration.

Exit direction: shared primitives and tokens can be applied without feature-specific color or control drift.

### UI-2 — Workspace Home — COMPLETE

- greeting and welcome hero;
- recent project cards with approved image sources and branded fallbacks;
- a reserved recommendation region, now populated by the separately authorized NEXT-1 deterministic layer;
- improved project selection and open-another-project flow.

NEXT-1 coordinates the recommendation region with the existing Home without changing UI-2's launcher or Recent Projects authority. UI-2 and NEXT-1 do not authorize Creator persistence, an AI recommendation call, or a new task store.

Exit direction: Home answers current project, project state, and next action without emphasizing filesystem paths.

### UI-3 — Project Overview Dashboard

- Project Health;
- Active Decisions;
- AI Insights;
- Feature Contracts;
- Recent Activity;
- Continue Building.

Exit direction: every state and recommendation is explainable from existing domain data and routes to the owning workspace.

### UI-4 — Workspace Consistency Pass

Apply the shared visual system to Game Wiki, Decisions, Repository, Unity, Alignment, AI Studio / Specialists, Model Evaluation, and Feature Contracts. Preserve working behavior and authority boundaries; do not rewrite a workflow solely for styling.

Exit direction: the major workspaces share hierarchy, actions, feedback, badges, icons, responsive behavior, and provenance treatment without behavioral regression.

### UI-5 — Full Screenshot UX Audit

Review all major empty, loading, running, success, warning, error, history/detail, dialog, compact, and wide states. Then perform one consolidated consistency and polish pass.

Exit direction: visual evidence covers the complete state matrix, remaining inconsistencies are resolved or documented, and manual sign-off remains separate from automated regression validation.

## Non-goals for the redesign track

- changing domain authority or persistence to simplify a screen;
- implementing a generic browser-history system solely for navigation polish;
- adding an opaque health score;
- building a Jira-style task manager or enterprise audit system;
- using AI to generate project artwork implicitly;
- automatically routing models or accepting AI output;
- replacing human approval;
- starting post-0K core product milestones through visual work;
- copying external brands, trademarks, or commercial product identities.
