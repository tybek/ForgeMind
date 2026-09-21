# Product

## Status

This document defines the product direction. **CURRENT:** 0K Feature Contract. 0K.1 and 0K.2 are implemented with manual validation pending. The local workspace includes Project Interview, Compendium knowledge, Decisions, one bounded specialist profile, Game Wiki aggregation, Repository Reality, completed Unity GroundTruth and Alignment workflows, plus the reviewed Feature Contract workbench, explicit AI-assisted drafting proposals, and coding-agent handoff workflow. Everything described as future or post-1.0 direction below is **NOT IMPLEMENTED** unless explicitly identified otherwise.

## Problem

Game projects accumulate knowledge across design documents, lore notes, technical decisions, task plans, scenes, assets, source code, and conversations. These sources drift as a project changes. Team members must repeatedly reconstruct context, and generic AI tools often propose changes without understanding established intent, decision history, or the real implementation. Important knowledge also becomes trapped in one person's chat history.

## Target users

Primary users are small game-development teams, indie studios, technical game designers, game directors, and Unity developers working with AI coding tools. Roles may include Owner, Game Director, Designer, Narrative Designer, Programmer, Technical Designer, Artist, QA, and Viewer. Solo developers remain supported, but shared understanding and reviewable decisions are primary design constraints.

## Product thesis

An AI assistant is more useful and safer when it can reason over structured project intent, durable decision history, and grounded implementation facts. ForgeMind should be the project-memory and alignment layer between existing development tools while keeping humans responsible for approval and execution. It should become more useful as the project's reviewed history grows.

## Intent, Reality, and Alignment

**Intent** describes what the team believes the game should be: its vision, design direction, narrative canon, technical decisions, roadmap, constraints, and approved Feature Contracts.

**Reality** describes what currently exists: source and documentation files, Git history, Unity scenes and objects, serialized configuration, tests, and implemented systems. Reality claims should be tied to verifiable evidence and a point in time.

**Alignment** interprets the relationship between them. It may show that a locked decision is implemented, that an implementation claim is unverified, that deprecated behavior is still present, or that a proposal conflicts with current intent. 0J.1 uses `ALIGNED`, `UNVERIFIED`, `OUT_OF_SYNC`, and `CONFLICT` for explicitly selected evidence while preserving uncertainty and human review.

Alignment is a primary product capability, not merely reporting. For example, approving a decision can legitimately change Intent while Reality still reflects the previous behavior. ForgeMind exposes that transition and 0K.1 can use an approved review to ground a Feature Contract.

## Core product loop and 1.0 story

The intended product loop is:

```text
Intent
-> Reality
-> Alignment
-> Feature Contract
-> Coding Agent
-> Tests / Reality refresh
-> Alignment review
```

AI Specialists may help at several points, but they augment this loop rather than become the product's only center. Alignment answers **"What is inconsistent?"** A Feature Contract answers **"What exactly should be changed?"** Cursor, Codex, or another coding agent performs repository work; ForgeMind remains the project-memory, evidence, planning, and review layer.

The full intended ForgeMind 1.0 narrative is: **New or Existing Game Project -> Project Brain / Game Wiki -> Intent + Decisions -> Git + Unity Reality -> Alignment -> Feature Contract -> Coding Agent -> refreshed Reality.** AI Studio supports that flow without replacing the Project Brain.

## Project memory and decision history

Temporary discussion includes brainstorming, alternatives, rough analysis, and rejected ideas. It should not silently become project truth. Durable project knowledge includes approved decisions, design direction, canon, technical constraints, roadmap scope, and Feature Contracts. A future explicit action such as **Save to Project** may promote selected discussion into portable, reviewable files.

0K Feature Contracts are project-owned, versioned delivery artifacts derived from an approved Alignment Review, current Compendium entry, or approved Decision. They capture immutable source traceability plus human-reviewed implementation scope, begin `DRAFT`, and require explicit approval. Drafts may be saved incomplete, edited, or explicitly deleted; approved and historical states are preserved through lifecycle actions. **Draft with AI** may propose bounded sections from captured Intent, approved Alignment, Reality, and current human text, but never applies, saves, approves, or invents paths automatically. **Preview / Copy Implementation Brief** produces one deterministic bounded handoff from reviewed contract content and evidence-supported locations. Contracts are not a competing truth store, task board, coding runtime, or authority to execute changes.

Decisions should preserve what was decided, why, who proposed and approved it, when it changed, what it affects, whether it is active, and whether available implementation evidence agrees. A superseding decision links to its predecessor instead of erasing it.

## Product principles

- **Understand before changing.** Build and refresh project context before proposing work.
- **Humans decide.** AI may interview, summarize, compare, and suggest; people approve durable decisions and changes.
- **Git remains authoritative.** Documentation and project files stay portable, inspectable, and reviewable in repositories.
- **Intent and reality are distinct.** Design status and implementation status must never be collapsed into one field.
- **Evidence is not inference.** Observed facts, AI interpretation, and unknowns must be distinguishable.
- **Provenance matters.** Durable knowledge should retain authorship, dates, rationale, relationships, and approval state when relevant.
- **Prefer explicit uncertainty.** Unknowns, conflicts, and incomplete implementation should be visible rather than smoothed over.
- **Use replaceable boundaries.** AI, Unity, and Git integrations must not define the core domain model.
- **Grow from demonstrated needs.** Avoid speculative services, permissions, and infrastructure.
- **Scope control is a feature.** Milestones and contracts should make approved boundaries and exclusions visible.

## Team-first direction

ForgeMind should make changes understandable to other contributors: what changed, who authored it, why it changed, what it affects, and whether it was approved. Team knowledge must not depend on access to one person's AI conversation. Git-based collaboration is the initial synchronization model. Detailed permissions and real-time cloud collaboration are future concerns, not MVP requirements.

The same product should scale without changing its authority model:

- **Solo:** external project memory, rationale and history, Game Wiki, Decisions, AI assistance, Reality, Alignment, and Feature Contracts.
- **Small team:** a shared Project Brain lets designers, programmers, artists, and producers review the same Intent and evidence and reduce design/implementation drift.
- **Larger team, future-ready:** durable entities may later gain concepts such as author, owner, reviewer, approved-by, reviewed-by, and discipline or responsibility.

Accounts, permissions, role-based access control, cloud synchronization, and real-time editing are **NOT IMPLEMENTED**. Current data models should remain evolvable enough to add those concepts later without making them prerequisites now.

## New and existing project onboarding

ForgeMind should eventually support two equal paths. Both are **FUTURE DIRECTION**, not current behavior.

**New project:** Create Project -> Project Interview -> Game Vision -> Player Experience -> Core Loop -> Systems -> Constraints -> initial Wiki / Compendium -> initial Decisions -> Open Questions -> first Feature Contracts. AI may actively help structure early Intent, but people approve durable truth.

**Existing project:** Open Existing Project -> detect Git -> detect Unity -> GroundTruth scan -> import available documentation -> identify implementation evidence -> interview only missing or uncertain Intent -> build the Wiki -> surface undocumented systems, unknowns, and conflicts.

Existing-project import must keep `VERIFIED FROM REALITY`, `DOCUMENTED`, `AI INFERRED`, and `UNRESOLVED` visibly distinct. AI inference must never be imported as approved truth automatically.

## Major workspace areas

- **Overview** — project identity, current priorities, health, and important unresolved items
- **Game Design** — mechanics, systems, rules, balance intent, and player experience
- **Narrative** — setting, characters, events, terminology, and canon
- **Technical** — architecture, constraints, interfaces, and engineering decisions
- **Unity** — grounded snapshots of the Unity project's observable state
- **Roadmap** — milestones, scope, dependencies, and progress
- **Decisions** — durable conclusions with rationale, relationships, and provenance
- **Alignment** — evidence-backed agreement, uncertainty, conflict, and drift between Intent and Reality
- **Feature Contracts** — reviewed implementation scope and deterministic coding-agent handoffs derived from Intent and Reality evidence

These are product concepts, not commitments to separate technical services or storage systems.

The long-term UI should consolidate those concepts into four clearer groups:

- **Project:** Overview, Game Wiki, Decisions, and Roadmap / Production.
- **Reality:** Repository, Unity, and Alignment.
- **AI Studio:** Specialists and Model Evaluation / Model Lab.
- **Delivery:** Feature Contracts and Implementation Briefs.

This is **FUTURE UI CONSOLIDATION DIRECTION**, not the current navigation. The Game Wiki should become the main human-facing knowledge surface by aggregating authoritative stores such as Compendium, Decisions, Specialist analyses, Feature Contracts, GroundTruth, Alignment results, and technical documentation. A future topic such as Enemy AI may bring those sources together as Overview, Intent, Decisions, Behavior Contracts, Reality, Alignment, AI Analyses, and Open Questions. The Wiki remains a view over those sources and must not create a competing `wiki.json` source of truth.

The detailed dashboard, layout, workflow, artwork, and phased redesign plan lives in [ForgeMind UI Direction](UI_DIRECTION.md). The original visual identity, messaging, logo, color, typography, icon, voice, motion, and marketing guidance lives in the [ForgeMind Brandbook](BRANDBOOK.md). Both are future planning references; neither changes the current 0K milestone state or current application behavior.

## Lightweight project state and delivery boundaries

Open Questions should eventually become a small first-class concept with a question, area or topic, author, `OPEN` / `RESOLVED` / `DEFERRED` status, resolution, and optional related Decision. Resolving a question should link the resulting Decision rather than silently rewriting knowledge.

Current Priorities may eventually record a title, area or topic, owner, priority, and target milestone. They express project or design focus, not a sprint-management system. ForgeMind may generate implementation tasks, acceptance criteria, dependencies, and owner suggestions, while persistent execution tracking should integrate with GitHub Issues / Projects, Linear, Jira, or similar tools. ForgeMind must not become a Jira clone with full Kanban, sprint, or time tracking.

## Integration philosophy

ForgeMind should integrate with Unity, Git, repositories, IDEs, coding agents, and planning tools instead of replacing them. Repositories remain authoritative; Unity supplies evidence about Reality; AI proposes and explains; ForgeMind orchestrates context, interpretation, review, and promotion into durable knowledge. Project data should remain portable and human-readable where practical.

Technical Knowledge in Game Wiki should eventually aggregate system purpose, important classes and components, dependencies, tests, Decisions, GroundTruth, implementation status, and known gaps. ForgeMind should reuse rustdoc, TypeDoc, DocFX, C# XML documentation, and similar technology where useful. It adds project-level understanding and alignment rather than reinventing API-documentation generators.

## Future specialist and production direction

ForgeMind may eventually expose specialist game-development role profiles and coordinate external content-production tools. Every profile must use the same Project Brain rather than maintain isolated truth, and every generated proposal or asset remains subject to evidence labeling and human review. This is **FUTURE DIRECTION**, is **NOT IMPLEMENTED**, and does not expand the required MVP.

See [AI Specialists and Content Production Direction](AI_SPECIALISTS_AND_PRODUCTION.md) for potential roles, multi-perspective review, the distinction between simulation and AI scenario reasoning, content-production orchestration, private-project dogfooding boundaries, and the planned model-evaluation approach.

The [ForgeMind Studios Roadmap](STUDIOS_ROADMAP.md) defines how future task-oriented specialist workspaces should share context building, structured proposal review, artifact promotion, provenance, and task-specific model recommendations. Its S0-S9 sequence is planning direction only: no Studio is started, and 0K remains the current milestone with manual validation pending.

## What ForgeMind is not

- **Not an AI coding agent:** it may prepare grounded implementation context, but its core job is project understanding, decisions, and alignment—not autonomous coding.
- **Not a GDD generator:** it maintains living, attributable knowledge connected to actual implementation rather than producing a one-time design document.
- **Not a project manager:** roadmap and scope context support reasoning; ForgeMind does not replace task tracking, staffing, or delivery management.
- **Not a Unity assistant:** Unity is one evidence source for Reality. ForgeMind also connects design, narrative, technical decisions, Git history, and plans.

## Long-term differentiation

ForgeMind's intended advantage is the combination of durable project memory, explicit decision history, implementation evidence, and alignment reasoning. That combination should enable grounded questions, proposal conflict checks, feature contracts, and drift detection without replacing Unity, Cursor, Codex, Git, GitHub, Jira, HacknPlan, Ludo, articy:draft, IDEs, or other coding agents.

## Non-goals

ForgeMind is not intended to:

- generate an entire game from one prompt;
- replace game developers or remove human approval;
- become the authoritative host for source code or documentation;
- require a proprietary project format;
- make an AI vendor, game engine, or Git host part of the core domain;
- provide real-time cloud collaboration or detailed permissions in the MVP;
- prescribe production infrastructure before product workflows are validated.
- become a complete IDE, autonomous coding agent, asset generator, or publishing system.
- become a chat system, notification platform, Jira clone, or automatic task executor.
- require RAG or embeddings without a separately approved, evidence-backed milestone.
