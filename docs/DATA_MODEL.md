# Conceptual Data Model

## Scope

This model establishes shared language and relationships. It is not a database schema or API contract. Milestone 0C serializes minimal Project identity in `.forgemind/project.json`; 0E adds approved onboarding evidence in `.forgemind/interview.json`; 0F adds separate versioned Compendium and Decision documents; and 0G.3 adds non-authoritative specialist work history in `.forgemind/specialist-runs.json`.

## Core entities

### Project

The top-level context for one game. It carries identity, summary, goals, constraints, repository references, and high-level lifecycle metadata. A Project contains areas, knowledge, decisions, systems, milestones, feature contracts, GroundTruth snapshots, and alignment findings.

### ProjectArea

A stable category used to organize knowledge, such as Overview, Game Design, Narrative, Technical, Unity, Roadmap, or Decisions. Areas provide navigation and context; they are not separate services and do not own independent copies of the same fact.

### KnowledgeEntry

An addressable statement about current project intent. The 0F schema contains stable `id`, bounded `area`, `title`, `statement`, `status`, `provenance`, `source`, `createdAt`, and `updatedAt` fields. Knowledge status is `DIRECTION`, `LOCKED`, `TBD`, or `DEPRECATED`; provenance is `USER_STATED`, `AI_INFERRED`, `MANUAL`, or the preserved interview value `UNRESOLVED`; source is `project_interview`, `manual_entry`, or `decision`. Entries are stored in `.forgemind/compendium.json`.

### InterviewCandidate

A small Project Interview proposal awaiting human review. It contains an identifier, area, title, statement, proposed `DIRECTION`, `LOCKED`, or `TBD` status, and provenance of `USER_STATED`, `AI_INFERRED`, or `UNRESOLVED`. A candidate is temporary until explicitly approved. The 0E interview file stores only approved candidates and does not imply that the full Compendium or Decisions model exists.

### Decision

A durable conclusion made by people after discussion. The 0F schema records stable `id`, `title`, `statement`, required `rationale`, `status`, `area`, simple local `author`, `createdAt`, optional `approvedAt`, optional `supersedesDecisionId`, and `relatedKnowledgeEntryIds`. Status is `PROPOSED`, `APPROVED`, `SUPERSEDED`, or `DEPRECATED`. Decisions are stored separately in `.forgemind/decisions.json`; proposed Decisions are not authoritative until a person explicitly approves them.

### System

A named gameplay, narrative, technical, or production concern—such as combat, quests, saving, or dialogue—that gives related knowledge a shared anchor. Systems may depend on or interact with other systems.

### Milestone

A bounded delivery objective with a status, scope, dependencies, and optional target information. Milestones group intended work; they do not prove implementation by themselves.

### FeatureContract

A reviewable plan for a feature, assembled from design, technical, roadmap, and GroundTruth context. It includes a summary, alignment, dependencies, affected systems, expected changes, acceptance criteria, risks, explicit exclusions, suggested tests, source references, authorship, and approval state.

### GroundTruthSnapshot

An immutable, time-stamped observation of a game project's implementation state, initially from Unity. It records source identity and scan metadata plus structured facts the bridge could observe. It is evidence, not intent, and becomes stale as the source project changes.

### AlignmentFinding

A reviewable interpretation of the relationship between a specific Intent claim and Reality evidence. It records the subject, current conceptual state, supporting and contradicting sources, snapshot identity, explanation, confidence or uncertainty, affected systems, timestamps, and review outcome. A finding may describe alignment, insufficient verification, an out-of-sync implementation, or a conflict between proposed and current Intent. It is derived and re-evaluable; it must not silently change either source.

### User / Author metadata

Minimal attribution attached to created or changed artifacts. It may contain a stable identifier, display name, and source (for example, local configuration or Git identity). This is provenance, not an MVP permission model. AI-generated drafts should be marked as such while retaining the human who accepted or edited them.

### SpecialistRun

A reviewable record of one explicit specialist request. Format version `1` stores a run ID and timestamp, profile/task/model identities, selected Compendium and approved-Decision IDs, the user-authored scenario, success/failure status, either a normalized bounded result or safe error category/diagnostics, and optional usage/latency/cost metadata. Additive optional fields record `preferredTaskBudget`, `effectiveCompletionBudget`, and `knownModelMaxCompletionTokens` when available; older format-version `1` records without them remain valid. It never stores credentials, authorization headers, absolute workspace paths, raw requests or provider responses, or hidden reasoning. A SpecialistRun is analysis history, not approved Project knowledge.

## Relationships

- A Project contains many ProjectAreas and gives all other entities their context.
- An approved InterviewCandidate belongs to one Project and may be explicitly imported into the Compendium. Startup never imports it automatically, and deterministic title-plus-statement matching prevents repeated import duplicates.
- Specialist role profiles consume explicitly selected subsets of the same Project context; they do not own separate project truth or independent knowledge databases. A SpecialistRun preserves the working proposal and its evidence references without making that proposal authoritative.
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

For the specialist workflow, normalized proposals and safe failure metadata may remain durable work history in `.forgemind/specialist-runs.json`. Persistence alone is not approval: history is never imported into the Compendium or Decisions automatically.

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

Conceptual states may include `ALIGNED`, `UNVERIFIED`, `OUT_OF_SYNC`, and `CONFLICT`. They should express whether selected Intent and available Reality evidence agree, not duplicate design or implementation status. This vocabulary is intentionally provisional in 0A.

### Approval state

Approval answers whether a person has accepted an artifact; it does not replace its design or implementation status. A minimal future vocabulary may include `DRAFT`, `PROPOSED`, `APPROVED`, and `REJECTED`, but 0A does not fix a persistence representation or authorization policy.

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

## Deliberately unresolved

Indexing, merge behavior, schema migration beyond rejecting unsupported versions, audit/version-history UI, and any database design remain deferred.
