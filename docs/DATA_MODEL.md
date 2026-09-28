# Conceptual Data Model

## Scope

This model establishes shared language and relationships. It is not a database schema or API contract. Milestone 0C serializes minimal Project identity in `.forgemind/project.json`; 0E adds approved onboarding evidence in `.forgemind/interview.json`; 0F adds separate versioned Compendium and Decision documents; 0G.3 adds non-authoritative specialist work history in `.forgemind/specialist-runs.json`; 0J.1 adds derived, reviewable Alignment history in `.forgemind/alignment.json`; 0K adds reviewed delivery artifacts in `.forgemind/feature-contracts.json`; NPC-1 maps a reviewed manual Project Foundation into the existing Project and Compendium documents; NPC-2 adds transient typed proposals plus compact accepted-origin metadata without creating a new truth store; NEXT-1 adds a transient derived recommendation model without persistence; NEXT-1.1 adds machine-local project-scoped Reality connection settings without changing portable Project or evidence schemas; and AIW-0 adds bounded non-authoritative work history in `.forgemind/ai-workspace-sessions.json`.

## Core entities

### Project

The top-level context for one game. It carries identity, summary, goals, constraints, repository references, and high-level lifecycle metadata. A Project contains areas, knowledge, decisions, systems, milestones, feature contracts, GroundTruth snapshots, and alignment findings.

### ProjectArea

A stable category used to organize knowledge, such as Overview, Game Design, Narrative, Technical, Unity, Roadmap, or Decisions. Areas provide navigation and context; they are not separate services and do not own independent copies of the same fact.

### KnowledgeEntry

An addressable statement about current project intent. The 0F schema contains stable `id`, bounded `area`, `title`, `statement`, `status`, `provenance`, `source`, `createdAt`, and `updatedAt` fields. Knowledge status is `DIRECTION`, `LOCKED`, `TBD`, or `DEPRECATED`; provenance is `USER_STATED`, `AI_INFERRED`, `MANUAL`, or `UNRESOLVED`; source is `project_interview`, `manual_entry`, `decision`, `specialist_analysis`, or the additive NPC-1 value `new_project_creator`. Entries are stored in `.forgemind/compendium.json`.

### InterviewCandidate

A small Project Interview proposal awaiting human review. It contains an identifier, area, title, statement, proposed `DIRECTION`, `LOCKED`, or `TBD` status, and provenance of `USER_STATED`, `AI_INFERRED`, or `UNRESOLVED`. A candidate is temporary until explicitly approved. The 0E interview file stores only approved candidates and does not imply that the full Compendium or Decisions model exists.

### Decision

A durable conclusion made by people after discussion. The 0F schema records stable `id`, `title`, `statement`, required `rationale`, `status`, `area`, simple local `author`, `createdAt`, optional `approvedAt`, optional `supersedesDecisionId`, and `relatedKnowledgeEntryIds`. Status is `PROPOSED`, `APPROVED`, `SUPERSEDED`, or `DEPRECATED`. Decisions are stored separately in `.forgemind/decisions.json`; proposed Decisions are not authoritative until a person explicitly approves them.

### System

A named gameplay, narrative, technical, or production concern—such as combat, quests, saving, or dialogue—that gives related knowledge a shared anchor. Systems may depend on or interact with other systems.

### Milestone

A bounded delivery objective with a status, scope, dependencies, and optional target information. Milestones group intended work; they do not prove implementation by themselves.

### FeatureContract

A durable, derived delivery artifact assembled manually from one approved Alignment Review, current Compendium entry, or approved Decision. The format-version `1` model records stable `id`, `createdAt` / `updatedAt`, immutable captured source trace, title, goal, current Reality summary, affected systems, required behavior, out of scope, risks, acceptance criteria, deterministic tests, implementation notes, evidence-backed likely affected references, lifecycle status, human review state, and optional review time. It is implementation scope, not a competing truth source or authorization to execute code changes.

### RecommendedNextStep

A transient derived view model that explains one useful existing workflow to inspect next. It contains a stable rule ID, title, plain-language reason, product area, existing navigation target and action label, small structured source signals, deterministic priority, and optional bounded effort. The engine returns no more than five; Home displays no more than three. Recommendations are not tasks, Project truth, approvals, or durable history and have no `.forgemind` file. Recomputing, viewing, or following one does not mutate its source domains.

### RealityConnection

A machine-local adapter setting keyed by portable Project ID and source kind (`REPOSITORY` or `UNITY`). It records an explicitly picker-selected folder only in application-local `reality-connections-v1.json`; normal UI receives only whether a connection is configured and a safe final folder name. It is not portable Project truth, Compendium/Wiki knowledge, Reality evidence, or a GroundTruth snapshot. No connection path is copied into `.forgemind` or durable evidence/history. Removing a connection falls back to inspecting the ForgeMind workspace root.

### GroundTruthSnapshot

An immutable, time-stamped observation of a game project's implementation state, initially from Unity. It records source identity and scan metadata plus structured facts the bridge could observe. It is evidence, not intent, and becomes stale as the source project changes.

### AlignmentCheck / AlignmentResult

An `AlignmentCheck` is the explicit manual input: one current Compendium entry or approved Decision, optional distinct conflicting approved Decision, selected Git/Unity evidence references with per-item assessment, rationale, confidence, and uncertainty. An `AlignmentResult` is the durable derived record with stable `id`, `createdAt`, captured source references and summaries, `ALIGNED` / `UNVERIFIED` / `OUT_OF_SYNC` / `CONFLICT` status, provenance, `PENDING_REVIEW` / `APPROVED` / `REJECTED` review state, and optional review time. It is evidence-backed and historical; it never silently changes Intent or Reality.

### User / Author metadata

Minimal attribution attached to created or changed artifacts. It may contain a stable identifier, display name, and source (for example, local configuration or Git identity). This is provenance, not an MVP permission model. AI-generated drafts should be marked as such while retaining the human who accepted or edited them.

### SpecialistRun

A reviewable record of one explicit specialist request. Format version `1` stores a run ID and timestamp, profile/task/model identities, selected Compendium and approved-Decision IDs, the user-authored scenario, success/failure status, either a normalized bounded result or safe error category/diagnostics, and optional usage/latency/cost metadata. Additive optional fields record `preferredTaskBudget`, `effectiveCompletionBudget`, and `knownModelMaxCompletionTokens` when available. Successful runs may also include `normalizationNotices` containing only a canonical list field plus returned and retained item counts; older format-version `1` records without these additive fields remain valid. It never stores credentials, authorization headers, absolute workspace paths, raw requests or provider responses, discarded overflow items, or hidden reasoning. A SpecialistRun is analysis history, not approved Project knowledge.

### AIWorkspaceSession / Message

A project-scoped non-authoritative work session with stable identity, surface, purpose, specialist-profile ID, title, timestamps, active/archive lifecycle, bounded user/assistant messages, up to five project-relative Markdown references, aggregate source trace, usage-record references, and pending proposals. WR-1 assistant messages may also store up to three focused questions. Messages store visible content only; system prompts, raw provider payloads, and hidden reasoning are excluded. An application-session ID plus usage timestamp references the canonical application-global usage record rather than duplicating provider/model/token/latency data in project history.

### ContextPlan / SourceTrace

A transient deterministic assembly of explicitly requested or supporting sources. Each item retains content plus source type, stable ID, human-readable label, authority class, selection priority, and optional navigation target. Approved Decisions, current Compendium knowledge, unresolved Open Questions, documented Markdown, explicitly integrated Reality evidence, and prior AI discussion remain distinct. SourceTrace is safe to persist; the assembled content package is not persisted as a raw prompt dump.

### AIWorkspaceProposal

A non-authoritative action envelope with stable identity, type, summary, source trace, timestamps, and `PENDING`, `ACCEPTED`, `APPLIED`, `REJECTED`, or `DISCARDED` review state. A proposed knowledge edit additionally preserves target, current value, proposed value, concise reason, and known affected references. `ACCEPTED` means the user accepted the proposal for action; it does not approve or mutate a target store. `APPLIED` records that a separate owning-domain action completed.

## Relationships

- A Project contains many ProjectAreas and gives all other entities their context.
- An approved InterviewCandidate belongs to one Project and may be explicitly imported into the Compendium. Startup never imports it automatically, and deterministic title-plus-statement matching prevents repeated import duplicates.
- Specialist role profiles consume explicitly selected subsets of the same Project context; they do not own separate project truth or independent knowledge databases. A SpecialistRun preserves the working proposal and its evidence references without making that proposal authoritative. One selected finding may become a new Compendium entry only after explicit human editing and confirmation, with truthful AI provenance and source.
- An AIWorkspaceSession belongs to exactly one Project and may reference only sources and prior messages from that same Project. Its ContextPlan and proposals retain authority labels without becoming authority themselves.
- An AIWorkspaceProposal may point toward an owning-domain action, but only that domain's existing explicit command can change Compendium, Decisions, Open Questions, or another authoritative artifact.
- A ProjectArea groups KnowledgeEntries; one entry may relate to several Systems.
- A Decision may reference KnowledgeEntries. An approved successor may supersede one approved predecessor; the predecessor remains stored as `SUPERSEDED` history.
- A Milestone references the Systems, Decisions, and FeatureContracts in its scope.
- A FeatureContract cites KnowledgeEntries and Decisions, targets Systems, belongs to a Milestone when applicable, and records the GroundTruthSnapshot used during its creation.
- A GroundTruthSnapshot may provide implementation evidence for many entries or contracts but does not overwrite design intent.
- An AlignmentFinding links one or more Intent sources to specific Reality evidence or an explicitly recorded absence of evidence.
- A FeatureContract may cite relevant AlignmentFindings and records the alignment state at creation time; later evaluation does not rewrite the historical contract invisibly.
- Author metadata is attached to durable changes and approval events.

Relationships should be explicit and reference stable identities; storage may remain file-based.

## Critical distinctions

### Intent versus Reality

Intent is normative: what the team has proposed, directed, locked, deprecated, or left unresolved. Reality is descriptive: what a particular repository or Unity snapshot can verify exists. Neither automatically overwrites the other. Alignment interprets their relationship.

### Temporary conversation versus durable knowledge

Brainstorming, AI analysis, alternatives, and rejected ideas are temporary unless a user explicitly promotes selected material. Approved decisions, canon, constraints, milestone scope, and Feature Contracts are durable project knowledge with provenance. Conversation history alone is not team memory.

For the 0E workflow, questions, answers, provider responses, and pending or discarded candidates remain transient. Only edited and explicitly approved candidates are serialized to `.forgemind/interview.json`.

For the specialist workflow, normalized proposals and safe failure metadata may remain durable work history in `.forgemind/specialist-runs.json`. Persistence alone is not approval: history is never imported into the Compendium or Decisions automatically. Game Wiki reads that history as non-authoritative analysis; it is an aggregated view and adds no `wiki.json` storage.

For AIW-0, visible multi-turn discussion and proposal review state may persist in `.forgemind/ai-workspace-sessions.json`. Persistence, proposal acceptance, and proposal application markers are not project truth. A separate explicit owning-domain action remains required, and that domain retains its own lifecycle and approval semantics.

WR-1 adds runnable narrative messages and reviewed proposal application without changing that distinction. Applied Project Knowledge uses `AI_INFERRED` provenance and `writers_room` source; applied Open Questions use the existing `OpenQuestions` / `TBD` / `UNRESOLVED` representation; applied Decisions use the existing `PROPOSED` initial state.

### Current versus superseded decisions

A newer approved decision can supersede an older one, but the previous statement and rationale remain addressable. “Current” means applicable now; it does not mean history has been deleted.

### Verified evidence versus AI inference

Verified evidence is traceable to a repository file, Git record, test result, or GroundTruth observation. AI inference is a labeled interpretation of that evidence. Missing evidence means unverified, not necessarily absent. Findings must expose this distinction.

## Status concepts

### Knowledge / design status

- `DIRECTION` — the current intended path, still open to refinement
- `LOCKED` — an approved constraint or direction that should not change casually
- `TBD` — deliberately unresolved
- `DEPRECATED` — no longer intended, retained for history and later drift analysis

`CONFLICT` and implementation status do not belong to the 0F Compendium schema; later Alignment/Reality milestones own those concerns.

### Implementation status

Implementation state is separate and may initially use a small vocabulary such as:

- `UNKNOWN` — not evaluated or unavailable
- `NOT_IMPLEMENTED` — intended behavior is absent
- `PARTIAL` — some expected behavior is present
- `IMPLEMENTED` — evidence matches the stated intent
- `STILL_PRESENT` — deprecated intent remains in the implementation
- `DIVERGED` — implementation exists but materially differs from intent

The exact vocabulary may evolve after GroundTruth is tested. Combinations are meaningful: `LOCKED` with `NOT_IMPLEMENTED`, or `DEPRECATED` with `STILL_PRESENT`, are valid states rather than errors.

### Alignment status

0J.1 uses `ALIGNED`, `UNVERIFIED`, `OUT_OF_SYNC`, and `CONFLICT`. They express whether explicitly selected Intent and Reality evidence agree, not design or implementation status. Insufficient evidence produces `UNVERIFIED`; uncertainty wins over unsupported certainty.

### Approval state

Approval answers whether a person has accepted an artifact; it does not replace its design or implementation status. 0J.1 Alignment results use `PENDING_REVIEW`, `APPROVED`, and `REJECTED`. Rejection preserves the historical result.

0K Feature Contracts use lifecycle status `DRAFT`, `APPROVED`, `SUPERSEDED`, or `DEPRECATED` plus human review state `PENDING_REVIEW` or `APPROVED`. New contracts always start `DRAFT` / `PENDING_REVIEW`. A draft title and implementation scope may change, and a draft alone may be explicitly hard-deleted. Approval is an explicit action after required implementation scope is complete; approved, superseded, and deprecated artifacts cannot be hard-deleted and remain history.

## Invariants

- Observed implementation facts must identify their snapshot and time.
- AI output begins as a proposal, not an approved decision.
- Design status, implementation status, and approval state remain independent.
- Conflicts are preserved and surfaced until a human resolves them.
- Superseded and deprecated records remain traceable.
- Core entities contain no vendor-specific AI fields.
- Absence of evidence is not represented as verified absence unless the scanner's coverage supports that conclusion.

## 0F persistence invariants

- `.forgemind/compendium.json` and `.forgemind/decisions.json` are human-readable format-version `1` documents tied to portable Project identity.
- Both reject unknown fields, unsupported versions, malformed IDs, invalid enum values, and invalid timestamps rather than silently repairing data.
- Files contain no absolute workspace path, credentials, provider response metadata, or machine identity.
- Compendium and Decisions remain distinct: knowledge does not become a Decision automatically, and promoting knowledge creates only a proposed Decision.
- Interview evidence remains in `.forgemind/interview.json` after import.
- Creator foundation entries remain in the same Compendium format version. User-authored fields are `DIRECTION` / `USER_STATED` / `new_project_creator`; explicitly accepted AI-assisted Core Loop and pillar fields are `DIRECTION` / `AI_INFERRED` / `new_project_creator`; deterministic missing-field questions are `TBD` / `UNRESOLVED` / `new_project_creator`. `AI_ACCEPTED` exists only as compact pre-initialization draft origin and is never a new authority level. Existing projects require no migration.
- Design Pillars remain `game_vision` Compendium entries titled `Design pillar: <name>`. The Game Design pillar section is a projection over these records, so existing Creator pillars remain readable and manual add/edit/deprecate uses the unchanged Compendium schema.
- Detached Repository/Unity paths are machine-local adapter configuration, not format-version `1` Project fields. Switching projects resolves settings by Project ID; set/change/disconnect never writes the selected source folder.

## 0G.3 specialist-history invariants

- Preferred/effective run budgets and a configured known model maximum are compatibility metadata, not evidence that an unknown provider limit has been discovered.

- `.forgemind/specialist-runs.json` is a human-readable format-version `1` document tied to portable Project identity.
- Successful runs contain only normalized bounded output; failed runs contain only a safe category, safe diagnostics, and usage when available.
- Selected reference IDs and explicit scenario text persist, but absolute paths, credentials, raw provider/request content, and hidden reasoning do not.
- Specialist history is never treated as approved knowledge and has no automatic promotion path.
- Omitted empty diagnostic lists in previously written format-version `1` failures deserialize as empty lists; this is backward compatibility, not a schema migration.
- Invalid history is not discarded during startup. Explicit recovery archives only the history document and creates a valid empty replacement without changing Project, interview, Compendium, or Decision data.

## AIW-0 / WR-1 AI Workspace invariants

- `.forgemind/ai-workspace-sessions.json` is a human-readable format-version `1` work-history document tied to one portable Project ID; it is not Project truth.
- The document is bounded to 50 sessions, 200 messages and 50 proposals per session, and 20 sources per trace/context request. Empty optional collections omitted by format-version `1` serialization read as empty collections. Invalid or unsupported history is never repaired silently; explicit recovery archives only this document and creates an empty replacement.
- Session lifecycle is `ACTIVE` or `ARCHIVED`. Archived sessions are read-only. Messages contain only visible `USER` or `ASSISTANT` content; hidden reasoning, raw prompts/provider payloads, credentials, authorization data, and absolute workspace paths are excluded.
- A safely formed persisted profile ID is retained even when that profile is no longer registered, so non-authoritative history remains readable, archivable, and does not block creation of a current-profile session. An unavailable profile cannot prepare or run a Writers' Room request.
- Context selection is explicit and project-isolated. Supporting context orders approved Decisions before established Compendium knowledge, unresolved Open Questions, documented Markdown, explicitly integrated Reality evidence, and prior AI discussion. Explicit selections remain first in user order.
- Markdown context must be an explicitly supplied project-relative `.md` or `.markdown` path outside `.forgemind`; each extraction and the total package are bounded. Markdown is `DOCUMENTED`, never automatically Canon.
- Source trace keeps source type, stable ID, readable label, authority, and optional navigation target. Prior AI messages are always `AI_GENERATED`; they cannot be relabeled as knowledge, approved Intent, or Reality evidence.
- Proposal transitions are `PENDING -> ACCEPTED | REJECTED | DISCARDED` and `ACCEPTED -> APPLIED`. Acceptance does not invoke an owning domain or imply its approval. WR-1 Apply accepts only reviewed Writers' Room knowledge, Decision, or Open Question proposals and delegates to the existing owning API; no natural-language message writes project truth.
- Usage references identify an existing canonical application-global usage record by application session and timestamp. Project history does not duplicate token, latency, provider, model, pricing, or raw request records.
- Selected Markdown references are unique, project-relative, `.md`/`.markdown` only, capped at five per session, and revalidated for containment and availability whenever context is prepared.
- A Writers' Room run includes at most twelve recent messages and a bounded deterministic Context Plan. Source references outside that plan invalidate the structured response before session persistence.

## 0I.1 Unity GroundTruth invariants

- `.forgemind/unity-groundtruth.json` is a human-readable format-version `1` evidence document tied to portable Project identity. ForgeMind reads and validates it but does not generate it in 0I.1.
- The manifest records export time, Unity version, source tool identity, explicit coverage/errors, and bounded observation metadata. Raw serialized values, source contents, credentials, authorization data, absolute machine paths, and arbitrary exception text are excluded.
- Scene, asset, script, prefab, ScriptableObject, and Input Action paths are project-relative. Observation identities and hierarchy references are portable and may not traverse outside the project.
- The frontend receives detection state and a safe aggregate summary, not raw observations or arbitrary filesystem access.
- `VERIFIED FROM UNITY` identifies validated implementation evidence. `DOCUMENTED` remains Intent, and `AI INFERENCE` remains interpretation; 0I.1 does not compare or merge them.
- Missing, corrupt, not-generated, invalid, unsupported, or uncovered evidence is unverified. It is not silently converted into verified absence.

## 0J.1 Alignment invariants

- `.forgemind/alignment.json` is a human-readable format-version `1` derived-history document tied to portable Project identity; it is not a competing Intent or Reality store.
- Compendium references resolve only to current non-deprecated entries. Decision references resolve only to `APPROVED` Decisions; proposed, superseded, and deprecated Decisions are not authoritative Alignment Intent.
- Evidence references must resolve through current Git Reality or validated Unity GroundTruth when the result is created. Stored summaries and timestamps make the reviewed comparison historical and portable.
- Every new result begins `PENDING_REVIEW`. Approval and rejection update only Alignment history and never mutate Compendium, Decisions, Git, or Unity GroundTruth.
- `DOCUMENTED` / `APPROVED_INTENT`, `VERIFIED_FROM_GIT`, `VERIFIED_FROM_UNITY`, and `MANUAL_ASSESSMENT` remain distinct. No 0J.1 result uses live AI; any future `AI_INFERENCE` must remain visibly non-evidence provenance.
- Absolute paths, credentials, raw provider content, hidden reasoning, raw Unity observations, and source-file contents are excluded.

## 0K Feature Contract invariants

- `.forgemind/feature-contracts.json` is a human-readable format-version `1` project-owned delivery document tied to portable Project identity.
- Creation accepts approved Alignment Reviews, current non-deprecated Compendium entries, and `APPROVED` Decisions. An approved Alignment Review is preferred but never selected automatically.
- Captured origin, Intent, Alignment, and Reality references are immutable after creation. Editing changes only the reviewed contract title/scope fields and `updatedAt`.
- Direct Compendium/Decision contracts state that current Reality is not established; they never invent evidence. Evidence-backed likely affected references must be selected from Reality evidence captured by the source Alignment Review.
- `DRAFT` is editable and `PENDING_REVIEW`; explicit approval moves a complete contract to `APPROVED`. Approved contracts may later be marked `SUPERSEDED` or `DEPRECATED` without deletion.
- Absolute machine paths, common credential material, raw provider content, hidden reasoning, and invented source references are rejected or excluded.
- 0K.2 AI drafting is an explicit single-request transient proposal. It uses an enabled registered model, is metered as `feature_contract`, includes only captured source facts plus current human fields, never retries automatically, and never writes to project persistence. The normalized proposal contains no file path; evidence-backed locations continue to come only from captured Reality references selected by the user.
- Applying an AI proposal changes only unsaved editor state. Per-section replacement is explicit, Apply All fills only empty sections, and Save/Approve remain separate human actions.
- Game Wiki reads compact Area-scoped counts and latest-approved title from this domain; it does not persist a copy or expose the full editor.

## Deliberately unresolved

Indexing, merge behavior, schema migration beyond rejecting unsupported versions, audit/version-history UI, and any database design remain deferred.
