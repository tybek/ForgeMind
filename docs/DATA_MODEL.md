# Conceptual Data Model

## Scope

This model establishes shared language and relationships. It is not a database schema or API contract. Milestone 0C serializes minimal Project identity in `.forgemind/project.json`; 0E adds approved onboarding evidence in `.forgemind/interview.json`; 0F adds separate versioned Compendium and Decision documents; 0G.3 adds non-authoritative specialist work history in `.forgemind/specialist-runs.json`; 0J.1 adds derived, reviewable Alignment history in `.forgemind/alignment.json`; and 0K adds reviewed delivery artifacts in `.forgemind/feature-contracts.json`.

## Core entities

### Project

The top-level context for one game. It carries identity, summary, goals, constraints, repository references, and high-level lifecycle metadata. A Project contains areas, knowledge, decisions, systems, milestones, feature contracts, GroundTruth snapshots, and alignment findings.

### ProjectArea

A stable category used to organize knowledge, such as Overview, Game Design, Narrative, Technical, Unity, Roadmap, or Decisions. Areas provide navigation and context; they are not separate services and do not own independent copies of the same fact.

### KnowledgeEntry

An addressable statement about current project intent. The 0F schema contains stable `id`, bounded `area`, `title`, `statement`, `status`, `provenance`, `source`, `createdAt`, and `updatedAt` fields. Knowledge status is `DIRECTION`, `LOCKED`, `TBD`, or `DEPRECATED`; provenance is `USER_STATED`, `AI_INFERRED`, `MANUAL`, or the preserved interview value `UNRESOLVED`; source is `project_interview`, `manual_entry`, `decision`, or `specialist_analysis`. Entries are stored in `.forgemind/compendium.json`.

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

### GroundTruthSnapshot

An immutable, time-stamped observation of a game project's implementation state, initially from Unity. It records source identity and scan metadata plus structured facts the bridge could observe. It is evidence, not intent, and becomes stale as the source project changes.

### AlignmentCheck / AlignmentResult

An `AlignmentCheck` is the explicit manual input: one current Compendium entry or approved Decision, optional distinct conflicting approved Decision, selected Git/Unity evidence references with per-item assessment, rationale, confidence, and uncertainty. An `AlignmentResult` is the durable derived record with stable `id`, `createdAt`, captured source references and summaries, `ALIGNED` / `UNVERIFIED` / `OUT_OF_SYNC` / `CONFLICT` status, provenance, `PENDING_REVIEW` / `APPROVED` / `REJECTED` review state, and optional review time. It is evidence-backed and historical; it never silently changes Intent or Reality.

### User / Author metadata

Minimal attribution attached to created or changed artifacts. It may contain a stable identifier, display name, and source (for example, local configuration or Git identity). This is provenance, not an MVP permission model. AI-generated drafts should be marked as such while retaining the human who accepted or edited them.

### SpecialistRun

A reviewable record of one explicit specialist request. Format version `1` stores a run ID and timestamp, profile/task/model identities, selected Compendium and approved-Decision IDs, the user-authored scenario, success/failure status, either a normalized bounded result or safe error category/diagnostics, and optional usage/latency/cost metadata. Additive optional fields record `preferredTaskBudget`, `effectiveCompletionBudget`, and `knownModelMaxCompletionTokens` when available. Successful runs may also include `normalizationNotices` containing only a canonical list field plus returned and retained item counts; older format-version `1` records without these additive fields remain valid. It never stores credentials, authorization headers, absolute workspace paths, raw requests or provider responses, discarded overflow items, or hidden reasoning. A SpecialistRun is analysis history, not approved Project knowledge.

## Relationships

- A Project contains many ProjectAreas and gives all other entities their context.
- An approved InterviewCandidate belongs to one Project and may be explicitly imported into the Compendium. Startup never imports it automatically, and deterministic title-plus-statement matching prevents repeated import duplicates.
- Specialist role profiles consume explicitly selected subsets of the same Project context; they do not own separate project truth or independent knowledge databases. A SpecialistRun preserves the working proposal and its evidence references without making that proposal authoritative. One selected finding may become a new Compendium entry only after explicit human editing and confirmation, with truthful AI provenance and source.
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

## 0G.3 specialist-history invariants

- Preferred/effective run budgets and a configured known model maximum are compatibility metadata, not evidence that an unknown provider limit has been discovered.

- `.forgemind/specialist-runs.json` is a human-readable format-version `1` document tied to portable Project identity.
- Successful runs contain only normalized bounded output; failed runs contain only a safe category, safe diagnostics, and usage when available.
- Selected reference IDs and explicit scenario text persist, but absolute paths, credentials, raw provider/request content, and hidden reasoning do not.
- Specialist history is never treated as approved knowledge and has no automatic promotion path.
- Omitted empty diagnostic lists in previously written format-version `1` failures deserialize as empty lists; this is backward compatibility, not a schema migration.
- Invalid history is not discarded during startup. Explicit recovery archives only the history document and creates a valid empty replacement without changing Project, interview, Compendium, or Decision data.

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
