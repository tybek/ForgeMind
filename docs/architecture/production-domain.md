# Production Domain and Work Package Model

**Milestone:** PROD-0
**Status:** Architecture complete; implementation not started

## Product objective

ForgeMind should connect game intent to bounded production work without becoming a generic project manager:

> Game Intent -> Production Work -> Execution -> Reality -> Alignment

ForgeMind explains why work matters, what outcome is required, which project facts constrain it, and whether a result may become project truth. Jira may coordinate execution. Humans and agents may execute. Git and Unity describe implementation Reality. The human project lead remains the authority.

ProjectExtract is the first dogfooding customer. The model must serve engineering, game design, content, lore, research, and QA/alignment—not only coding tickets.

## Existing concepts and stable identity

Production references existing owners; it does not copy them into a second Project Brain.

| Concept | Production use and identity |
| --- | --- |
| Project Metadata | Portable `projectId` UUID is the project boundary. |
| Project Brain | Context aggregate, not a separately mutable record. Reference its owning records. |
| Compendium / Game Wiki | Compendium entry UUID is stable. Game Wiki is a projection with no independent identity. |
| Decisions | Decision UUID is stable; Decisions retains lifecycle ownership. |
| Open Questions | Underlying Compendium entry UUID is stable; `OpenQuestions` is an area, not another store. |
| Specialist Analysis | Run UUID is stable history, but authority remains `AI_ANALYSIS`. |
| Alignment | Result UUID is stable derived history. Approval does not convert it to Intent or Reality. |
| Feature Contracts | Contract UUID is stable and is the preferred engineering-work source. |
| Git Reality | Full commit hash is stable. File paths and `git:file:*` IDs are locators, not durable entity identity. |
| Unity GroundTruth | Scene/ScriptableObject exporter identities may be reused. Manifest timestamps and component aggregates are snapshot-scoped. |
| Project Brain anchors | Navigation/publishing locators only, never owning-domain foreign keys. |
| `AtlassianProjectSnapshot` | Derived integration DTO. Entry IDs are integration identity, not internal production ownership. |

All context uses a typed reference:

```text
ProductionReference {
  kind: PROJECT | KNOWLEDGE_ENTRY | DECISION | SPECIALIST_RUN |
        ALIGNMENT_RESULT | FEATURE_CONTRACT | GIT_EVIDENCE | UNITY_EVIDENCE
  id: string
  role: ORIGIN | AUTHORITATIVE_CONTEXT | SUPPORTING_CONTEXT | REALITY_EVIDENCE
  capturedSummary?: string
  capturedAt?: timestamp
  versionRef?: string
}
```

Use the owning-domain UUID where one exists. Reality evidence must also capture its summary, observation time, and applicable version such as a Git commit. Never use mutable titles, Jira summaries, Confluence titles, or file paths as identity.

## Authority boundaries

| Owner | Responsibility |
| --- | --- |
| ForgeMind | Objectives, Work Package intent/context/authority, dispatch history, returned results, and human review outcomes. |
| Jira | Assignee and execution workflow after dispatch: queued, active, blocked, and done. |
| Confluence | Readable derived team knowledge, not ForgeMind truth. |
| Git / Unity | Evidence of what actually exists. |
| Agents / humans | Bounded execution and results, without automatic project authority. |
| Human lead | Approval, rejection, changes, and every explicit project-truth action. |

Agent lore/design/content is `PROPOSAL`. Research is `EXTERNAL_RESEARCH`. Code/assets are `IMPLEMENTATION_RESULT`. QA is `VERIFICATION_REPORT`. Accepting a result only means it satisfied its package; it does not canonize content, approve a Decision, merge code, mutate Project Brain, or assert Alignment. Those remain separate, explicit owning-domain actions.

## Domain model

All primary production entities use UUIDs and the portable `projectId`.

### ProductionObjective

```text
ProductionObjective {
  id: UUID
  projectId: UUID
  title: string
  description: string
  targetOutcome: string
  status: DRAFT | ACTIVE | ACHIEVED | CANCELLED
  priority: NOW | NEXT | LATER
  contextRefs: ProductionReference[]
  createdAt: timestamp
  updatedAt: timestamp
}
```

ForgeMind owns the target outcome and its links to project intent because they explain why work exists even without Jira. Progress is derived from child Work Packages. Owner, dates, estimates, sprint, budget, labels, and percentage are omitted. An Objective does not automatically become a Jira Epic.

### WorkPackage

The WorkPackage is the stable, provider-neutral production instruction.

```text
WorkPackage {
  id: UUID
  projectId: UUID
  objectiveId?: UUID
  revision: positive integer
  type: ENGINEERING | GAME_DESIGN | CONTENT | LORE | RESEARCH | QA_ALIGNMENT
  title: string
  goal: string
  why: string
  contextRefs: ProductionReference[]
  boundaries: string[]
  nonGoals: string[]
  authorityRestrictions: string[]
  deliverable: {
    description: string
    expectedResultType: TEXT_PROPOSAL | RESEARCH_REPORT | CODE_CHANGE |
                        CONTENT_DATA | DESIGN_PROPOSAL | QA_REPORT
    expectedAuthority: PROPOSAL | EXTERNAL_RESEARCH |
                       IMPLEMENTATION_RESULT | VERIFICATION_REPORT
    acceptanceCriteria: string[]
  }
  capabilityRequirements: string[]
  dependencies: WorkPackageLink[]
  requiresHumanReview: true
  status: DRAFT | READY | DISPATCHED | REVIEW_REQUIRED |
          ACCEPTED | REJECTED | CANCELLED
  createdAt: timestamp
  updatedAt: timestamp
}

WorkPackageLink {
  targetWorkPackageId: UUID
  relation: BLOCKED_BY | RELATES_TO
}
```

Before `READY`, goal, why, deliverable, and at least one acceptance criterion are required. Same-project references must resolve. `BLOCKED_BY` cannot reference self or form a cycle, and its target must be accepted before readiness. `RELATES_TO` is optional and non-blocking. Each edit increments `revision`; Dispatch pins it. After dispatch, that revision is immutable. A requested change creates a new revision and preserves prior history.

Executor identity and assignee do not belong in WorkPackage. Capability needs are stable intent; executor choice belongs to Dispatch. UI state, estimates, sprint data, provider-specific fields, and Jira workflow state are excluded.

### Work types

- `ENGINEERING`: code, systems, technical assets, and Unity implementation.
- `GAME_DESIGN`: rules, balance, economy, progression, and interactions.
- `CONTENT`: items, loot, weapons, armor, recipes, and NPC archetypes.
- `LORE`: history, factions, characters, locations, and narrative proposals.
- `RESEARCH`: comparable-game, UX, mechanic, and reference research.
- `QA_ALIGNMENT`: inspection, verification, regression analysis, and drift.

Types supply defaults for context, result format, dispatch target, Jira issue type, and review checklist. They grant no authority. A new type requires a materially different context or review contract, not merely a label.

## Lifecycle and status ownership

ForgeMind owns:

```text
DRAFT -> READY -> DISPATCHED -> REVIEW_REQUIRED -> ACCEPTED
                                  |       |
                                  |       +-> REJECTED
                                  +-> READY (Request Changes; new revision)

DRAFT | READY | DISPATCHED -> CANCELLED
```

Receiving a valid result may move `DISPATCHED` to `REVIEW_REQUIRED`; it may never accept it. A Jira issue marked Done can remain `DISPATCHED` until a result is reviewed.

Jira execution state is a read-only observation:

```text
ExecutionObservation {
  dispatchId: UUID
  provider: JIRA
  providerState: string
  normalizedClass: QUEUED | ACTIVE | BLOCKED | DONE | UNKNOWN
  observedAt: timestamp
}
```

ForgeMind does not independently own Jira's assignee, blockers, or workflow. It does not write review state back to Jira without a separately designed explicit action.

## Dispatch

```text
Dispatch {
  id: UUID
  projectId: UUID
  workPackageId: UUID
  workPackageRevision: positive integer
  target: {
    kind: HUMAN | JIRA | CODING_AGENT | RESEARCH_AGENT |
          CONTENT_AGENT | MCP_CLIENT
    targetRef?: string
  }
  contextPacketHash: string
  requestedBy: string
  state: PREPARED | SUBMITTED | FAILED | CANCELLED
  externalRef?: ExternalReference
  createdAt: timestamp
  submittedAt?: timestamp
}
```

`targetRef` selects a human, connection, or executor configuration without credentials. `externalRef` may record the immutable Jira issue ID/key/URL or an agent-run ID. Dispatch stores no token, authorization, hidden prompt, or provider-owned workflow state. Failure never triggers automatic retry.

Provider and artifact links share one bounded locator contract:

```text
ExternalReference {
  kind: JIRA_ISSUE | GIT_COMMIT | PULL_REQUEST | FILE_LOCATOR |
        UNITY_EVIDENCE | CONFLUENCE_PAGE | AGENT_RUN | OTHER
  providerId: string
  label?: string
  url?: string
  versionRef?: string
}
```

`providerId` is the immutable provider identity when available. A `FILE_LOCATOR` must be project-relative and carry a commit or result version in `versionRef`; it never becomes a primary entity ID.

## Result and review

```text
WorkResult {
  id: UUID
  projectId: UUID
  workPackageId: UUID
  dispatchId?: UUID
  type: TEXT_PROPOSAL | RESEARCH_REPORT | CODE_CHANGE |
        CONTENT_DATA | DESIGN_PROPOSAL | QA_REPORT
  producer: { kind: HUMAN | AGENT | EXTERNAL_TOOL, id?: string, label: string }
  authority: PROPOSAL | EXTERNAL_RESEARCH |
             IMPLEMENTATION_RESULT | VERIFICATION_REPORT
  summary: string
  content?: bounded visible text or structured data
  artifactRefs: ExternalReference[]
  sourceRefs: ProductionReference[]
  producedAt: timestamp
  receivedAt: timestamp
}

Review {
  id: UUID
  projectId: UUID
  workPackageId: UUID
  resultId: UUID
  reviewer: string
  decision: ACCEPT | REQUEST_CHANGES | REJECT
  rationale: string
  createdAt: timestamp
}
```

Artifacts may reference Jira, a full Git commit, PR, repository-relative changed-file locator, Unity evidence, Confluence, or an external run. Results contain bounded visible output or artifact references—never chain-of-thought, raw provider payloads, credentials, or unbounded logs.

Reviews are append-only. `REQUEST_CHANGES` creates a later package revision/Dispatch. `ACCEPT` merely enables explicit actions: apply selected knowledge, create a `PROPOSED` Decision, refresh Reality and review Alignment, or use the repository's normal merge workflow.

## Jira mapping policy

Only a WorkPackage becomes a Jira work item, through explicit dispatch. A Decision, Open Question, Alignment finding, Feature Contract, or Objective may motivate a package but never creates an issue automatically.

| WorkPackage | Jira default |
| --- | --- |
| `ENGINEERING` new behavior | Story when available, otherwise Task |
| Defect correction from `ENGINEERING` or `QA_ALIGNMENT` | Bug |
| `RESEARCH` | Spike when available, otherwise Task |
| `GAME_DESIGN`, `CONTENT`, `LORE`, other `QA_ALIGNMENT` | Task |

The user may change the issue type. Jira receives bounded title, goal, why, criteria, constraints, and ForgeMind package ID/revision. ForgeMind stores returned immutable issue ID plus key/URL as integration metadata; summary text is never identity. Objective-to-Epic mapping is outside V1.

## Agent context packet

The packet is a deterministic derived handoff, not another truth store:

```text
AgentContextPacket {
  schemaVersion, projectId, workPackageId, workPackageRevision, generatedAt
  type, title, goal, why
  authoritativeContext[], supportingContext[], currentReality[], openQuestions[]
  constraints { boundaries[], nonGoals[], authorityRestrictions[] }
  deliverable, capabilityRequirements[], sourceTrace[], freshnessWarnings[]
}
```

Selection rules:

1. Include explicitly linked sources, never the entire Project Brain.
2. Prefer approved Decisions/Feature Contracts, current Compendium knowledge, and approved Alignment over supporting analysis.
3. Label Open Questions, Specialist Analysis, and external research with their actual lower authority.
4. Engineering and QA receive only selected Git/Unity observations with capture time, version, and presence-only limits. Missing/stale Reality is visible and may require acknowledgement.
5. Type defaults are suggestions; the human reviews final inclusion.
6. Deduplicate by typed identity, order deterministically by authority/type/ID, and enforce section/total budgets.
7. Exclude raw provider responses, chat history, unrelated knowledge, secrets, machine paths, and hidden reasoning.
8. Hash the canonical packet. Dispatch pins revision and hash so context cannot change silently.

## Parallel work

An Objective may contain independent packages of any type. `BLOCKED_BY` is the only hard dependency; `RELATES_TO` provides optional coordination. Surface active packages sharing an Objective, Feature Contract, Decision, Git area, or Unity evidence before dispatch as an overlap warning. Do not auto-merge, cancel, or serialize them. Independent results return for human review; refreshed Reality/Alignment exposes conflicts.

## PROD-1 dashboard requirements

The smallest useful dashboard is a read model with:

1. **Current Objectives** — active outcomes and derived accepted/total counts.
2. **Ready for Work** — validated, unblocked packages.
3. **In Progress / Blocked** — dispatched packages using timestamped provider observations.
4. **Needs Review** — returned results with executor and result authority.
5. **Alignment Issues** — current actionable drift that may seed packages.
6. **Recent Results** — bounded review history.

Cards route to focused workflows and never mutate Jira, Project Brain, Reality, or review state automatically. `Recommended Next Work` waits for deterministic rules; V1 must not rank work with opaque AI scoring.

## ProjectExtract examples

1. **Coding:** armor Decision + Feature Contract + Git/Unity evidence -> `ENGINEERING` package for armor AP movement penalty -> coding agent/human -> `CODE_CHANGE` commit/PR -> human acceptance -> explicit merge, Reality refresh, Alignment review.
2. **Lore:** village knowledge + occupation Open Question -> `LORE` package -> lore agent -> `TEXT_PROPOSAL` -> human review -> selected text explicitly applied to Compendium or Decision proposals.
3. **Content:** economy rules + village context -> `CONTENT` package for 20 civilian loot items -> content agent -> `CONTENT_DATA` -> human edit/review -> explicit owning-domain action.
4. **Research:** inventory UX Open Question -> `RESEARCH` package -> research agent -> cited `RESEARCH_REPORT` -> human review -> explicit Decision proposal or revised design package.
5. **Game design:** combat pillars + grenade Reality -> `GAME_DESIGN` package -> designer/agent -> rules `DESIGN_PROPOSAL` -> human review -> Decision proposal, then separate engineering package.
6. **QA/alignment:** no-exact-tracking Decision + cover contract + Reality -> `QA_ALIGNMENT` package -> QA human/agent -> reproducible `QA_REPORT` -> human review -> explicit Alignment and corrective engineering package.

These may run in parallel under `Village Raid Vertical Slice`; only declared hard dependencies block readiness.

## Persistence

Desktop V1 should store a project-owned, human-readable, versioned `.forgemind/production.json` containing Objectives, Work Packages, Dispatches, Results, and Reviews. The native layer owns validation, atomic writes, migrations, and project-ID checks; React gets narrow typed commands.

Use format version `1`, closed shapes, explicit enums, UUID/ISO timestamp validation, same-project references, deterministic order by creation time then UUID, and bounded content. Exclude absolute paths, credentials, authorization, hidden prompts/reasoning, and raw provider responses. Dispatch/Result/Review are append-only; Objective and pre-dispatch package edits are revisioned. Migration is explicit and tested; invalid data is preserved with a safe error rather than replaced by empty history.

A database is unnecessary until measured scale requires it. Forge KVS may hold installation-local mappings such as package-to-Jira issue ID, never core Objective, WorkPackage, Result, or Review truth.

## Standalone Atlassian compatibility

Objective, WorkPackage, Dispatch, WorkResult, Review, typed references, and context packets can depend on a `ProjectContextProvider`, not desktop paths. Desktop supplies authoritative ForgeMind domains. A future standalone Companion may supply deliberately limited `LIGHTWEIGHT_ATLASSIAN_CONTEXT` from explicitly selected Confluence/Jira records with source attribution and lower/unknown authority.

Standalone context must not be called Project Brain, infer ForgeMind authority, or create a competing desktop copy. Reconciliation and two-way sync are outside this model.

## Risks and mitigations

- **Dual Jira/ForgeMind truth:** separate execution observation from ForgeMind lifecycle.
- **Project-management bloat:** one shallow Objective -> WorkPackage hierarchy; omit sprint/resource/estimate systems.
- **Automatic canon:** require Review plus a separate owning-domain Apply action.
- **Oversized context:** explicit references, budgets, deterministic ordering, no whole-Brain dump.
- **Stale context:** pin package revision/packet hash; carry Reality capture/version warnings.
- **Duplicate work:** warn on shared sources/objectives; never auto-cancel or merge.
- **Parallel conflicts:** minimal hard dependencies, immutable result history, refreshed Reality/Alignment.
- **Weak provenance:** record producer, authority, source refs, artifacts, and timestamps.
- **External-agent trust:** scoped packet, no credentials, bounded decoder, mandatory review.
- **Sync scope creep:** explicit actions only; no polling, reverse sync, or auto-retry in V1.
- **Generic Jira clone:** dashboard centers Intent, Reality, Alignment, and review.
- **Unstable evidence IDs:** distinguish UUIDs from snapshot evidence/locators and capture version/summary/time.

## Recommended V1 and roadmap

V1 contains only the five primary entities, typed references, six work/result types, provider-neutral observations, deterministic context packets, local production persistence, explicit Jira creation mapping, the six-section dashboard, and read-only MCP access.

Recommended sequence:

1. **PROD-0 — COMPLETE (DESIGN ONLY):** this authority/domain contract.
2. **PROD-1A — Production Core:** persistence, validation, lifecycle, and focused create/review flows; no Jira.
3. **PROD-1B — Production Dashboard:** smallest read model over real production records.
4. **JIRA-1 — Explicit Jira Dispatch:** one package revision -> one explicitly created work item; mapping metadata and read-only execution observation.
5. **UI V2 — Design Overhaul:** establish the production-informed visual and design-system foundation after one complete real production flow.
6. **AGENT-1 — Context Packet/Handoff:** preview, hash, and explicit handoff on the new UI system; no autonomous acceptance.
7. **MCP-1 — Read-only Context Tools:** approved/visible context, packages, and review-safe results.
8. **ATL-STANDALONE-1:** reuse contracts with limited Atlassian context; no second Project Brain.

Core persistence precedes Jira/dashboard so external issues or projections cannot become accidental truth. Jira completes the first real, human-visible production flow. UI V2 then establishes the design foundation that AGENT-1 and MCP-1 build upon.

## PROD-0 non-goals

This design adds no runtime schema/code, UI, Jira call/issue, Forge scope/deployment, Confluence mutation, MCP, Rovo, autonomous agent execution, ProjectExtract change, or synchronization. It does not authorize a later milestone by itself.
