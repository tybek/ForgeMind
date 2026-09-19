# Product

## Status

This document defines the product direction. **Currently implemented:** the local desktop workspace through 0F, including Project Interview, the Game Compendium, structured Decisions, and the 0F.1 density polish. Approved interview evidence, current project knowledge, and decisions are separate portable documents. The broader product behavior described below remains planned MVP or future direction unless explicitly identified as current workspace behavior.

## Problem

Game projects accumulate knowledge across design documents, lore notes, technical decisions, task plans, scenes, assets, source code, and conversations. These sources drift as a project changes. Team members must repeatedly reconstruct context, and generic AI tools often propose changes without understanding established intent, decision history, or the real implementation. Important knowledge also becomes trapped in one person's chat history.

## Target users

Primary users are small game-development teams, indie studios, technical game designers, game directors, and Unity developers working with AI coding tools. Roles may include Owner, Game Director, Designer, Narrative Designer, Programmer, Technical Designer, Artist, QA, and Viewer. Solo developers remain supported, but shared understanding and reviewable decisions are primary design constraints.

## Product thesis

An AI assistant is more useful and safer when it can reason over structured project intent, durable decision history, and grounded implementation facts. ForgeMind should be the project-memory and alignment layer between existing development tools while keeping humans responsible for approval and execution. It should become more useful as the project's reviewed history grows.

## Intent, Reality, and Alignment

**Intent** describes what the team believes the game should be: its vision, design direction, narrative canon, technical decisions, roadmap, constraints, and approved Feature Contracts.

**Reality** describes what currently exists: source and documentation files, Git history, Unity scenes and objects, serialized configuration, tests, and implemented systems. Reality claims should be tied to verifiable evidence and a point in time.

**Alignment** interprets the relationship between them. It may show that a locked decision is implemented, that an implementation claim is unverified, that deprecated behavior is still present, or that a proposal conflicts with current intent. Alignment statuses may eventually include `ALIGNED`, `UNVERIFIED`, `OUT_OF_SYNC`, and `CONFLICT`; this milestone intentionally does not finalize that vocabulary.

Alignment is a primary product capability, not merely reporting. For example, approving a decision can legitimately change Intent while Reality still reflects the previous behavior. ForgeMind should expose that transition and use it to ground a later Feature Contract.

## Project memory and decision history

Temporary discussion includes brainstorming, alternatives, rough analysis, and rejected ideas. It should not silently become project truth. Durable project knowledge includes approved decisions, design direction, canon, technical constraints, roadmap scope, and Feature Contracts. A future explicit action such as **Save to Project** may promote selected discussion into portable, reviewable files.

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

## Major workspace areas

- **Overview** — project identity, current priorities, health, and important unresolved items
- **Game Design** — mechanics, systems, rules, balance intent, and player experience
- **Narrative** — setting, characters, events, terminology, and canon
- **Technical** — architecture, constraints, interfaces, and engineering decisions
- **Unity** — grounded snapshots of the Unity project's observable state
- **Roadmap** — milestones, scope, dependencies, and progress
- **Decisions** — durable conclusions with rationale, relationships, and provenance
- **Alignment** — evidence-backed agreement, uncertainty, conflict, and drift between Intent and Reality

These are product concepts, not commitments to separate technical services or storage systems.

## Integration philosophy

ForgeMind should integrate with Unity, Git, repositories, IDEs, coding agents, and planning tools instead of replacing them. Repositories remain authoritative; Unity supplies evidence about Reality; AI proposes and explains; ForgeMind orchestrates context, interpretation, review, and promotion into durable knowledge. Project data should remain portable and human-readable where practical.

## Future specialist and production direction

ForgeMind may eventually expose specialist game-development role profiles and coordinate external content-production tools. Every profile must use the same Project Brain rather than maintain isolated truth, and every generated proposal or asset remains subject to evidence labeling and human review. This is **FUTURE DIRECTION**, is **NOT IMPLEMENTED**, and does not expand the required MVP.

See [AI Specialists and Content Production Direction](AI_SPECIALISTS_AND_PRODUCTION.md) for potential roles, multi-perspective review, the distinction between simulation and AI scenario reasoning, content-production orchestration, private-project dogfooding boundaries, and the planned model-evaluation approach.

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
