# Conceptual Data Model

## Scope

This model establishes shared language and relationships. It is not a database schema or API contract. Milestone 0C serializes minimal Project identity in `.forgemind/project.json`. Milestone 0E adds the deliberately bounded `.forgemind/interview.json` format for approved onboarding candidates; it is not the future Compendium schema.

## Core entities

### Project

The top-level context for one game. It carries identity, summary, goals, constraints, repository references, and high-level lifecycle metadata. A Project contains areas, knowledge, decisions, systems, milestones, feature contracts, GroundTruth snapshots, and alignment findings.

### ProjectArea

A stable category used to organize knowledge, such as Overview, Game Design, Narrative, Technical, Unity, Roadmap, or Decisions. Areas provide navigation and context; they are not separate services and do not own independent copies of the same fact.

### KnowledgeEntry

An addressable statement or document fragment about the project. An entry has a topic, content, provenance, relevant statuses, relationships, and timestamps. It may express an idea, approved direction, canon fact, technical constraint, unresolved question, or observed implementation fact.

### InterviewCandidate

A small Project Interview proposal awaiting human review. It contains an identifier, area, title, statement, proposed `DIRECTION`, `LOCKED`, or `TBD` status, and provenance of `USER_STATED`, `AI_INFERRED`, or `UNRESOLVED`. A candidate is temporary until explicitly approved. The 0E interview file stores only approved candidates and does not imply that the full Compendium or Decisions model exists.

### Decision

A durable conclusion made by people after discussion. A Decision records a title, statement, rationale, author, creation date, status, related systems, affected areas, approval state and approving user where relevant, and an optional superseded decision. The active/current decision is the applicable point in that chain; older decisions remain immutable history rather than being rewritten invisibly.

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

## Relationships

- A Project contains many ProjectAreas and gives all other entities their context.
- An approved InterviewCandidate belongs to one Project and may later inform a KnowledgeEntry during 0F; it is not silently promoted into the future Compendium.
- Future specialist role profiles consume relevant subsets of the same Project context; they do not own separate project truth or independent knowledge databases.
- A ProjectArea groups KnowledgeEntries; one entry may relate to several Systems.
- A Decision may resolve, lock, deprecate, or supersede KnowledgeEntries and other Decisions.
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

### Current versus superseded decisions

A newer approved decision can supersede an older one, but the previous statement and rationale remain addressable. “Current” means applicable now; it does not mean history has been deleted.

### Verified evidence versus AI inference

Verified evidence is traceable to a repository file, Git record, test result, or GroundTruth observation. AI inference is a labeled interpretation of that evidence. Missing evidence means unverified, not necessarily absent. Findings must expose this distinction.

## Status concepts

### Knowledge / design status

- `IDEA` — an uncommitted possibility
- `DIRECTION` — the current intended path, still open to refinement
- `LOCKED` — an approved constraint or decision that should not change casually
- `TBD` — deliberately unresolved
- `DEPRECATED` — no longer intended, retained for history and drift analysis
- `CONFLICT` — incompatible claims or decisions require human resolution

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

## Deliberately unresolved

File formats for entities beyond the minimal Project identity, indexing, merge behavior, broader schema evolution, and any database design will be chosen only when implementation requires them.
