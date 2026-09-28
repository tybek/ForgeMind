# Context Builder and Task Router Architecture

## Status and scope

**CR-0 ARCHITECTURE SPECIFICATION; AIW-0 BOUNDED FOUNDATION COMPLETE.** This document defines the broader future infrastructure for task classification, project-context assembly, specialist/workflow routing, task-specific model recommendation, and proposal traceability. AIW-0 now implements a deliberately small explicit-source Context Plan, source trace, session, profile-metadata, and proposal-review subset for future Writers' Room and Chronicler work. It creates no provider request, retrieval index, Router, Studio, or UI.

0K Feature Contracts and AIW-0 are complete. Project Rebaseline, remaining UI phases, ForgeMind Studios S0 through S9, and the broader Context + Routing phases CR-1 through CR-6 remain planned and not started except for the explicitly documented AIW-0 primitives. AIW-0 does not start 0L, Writers' Room, Chronicler, Studios, or general routing.

The current MVP loop remains:

```text
Intent
-> Reality
-> Alignment
-> Feature Contract
-> Implementation Brief
```

The future Context Builder and Task Router support that loop and other explicitly authorized workflows. They do not replace it.

Related product and implementation boundaries are defined in [Product](PRODUCT.md), [Architecture](ARCHITECTURE.md), [Security and Privacy Architecture](SECURITY_AND_PRIVACY.md), [Conceptual Data Model](DATA_MODEL.md), [Workflows](WORKFLOWS.md), [Roadmap](ROADMAP.md), [ForgeMind Studios Roadmap](STUDIOS_ROADMAP.md), [Rebaseline Existing Project](PROJECT_REBASELINE.md), [ForgeMind UI Direction](UI_DIRECTION.md), and the [Coding Context Map](CODING_CONTEXT_MAP.md).

The implemented **AIW-0 Shared AI Workspace Foundation** is the common initiating/context/proposal/review shell for future **WR-1 Writers' Room MVP** and **CHR-1/CHR-2 Wiki Chronicler**, not two independent routing stacks. Writers' Room will focus on creative narrative development; Chronicler will focus on Project Brain navigation, retrieval, and edit proposals. Both retain source trace and the boundary **proposal -> human review -> explicit owning-domain action -> project truth**. Those product phases remain unimplemented.

## Problem and desired flow

ForgeMind should eventually accept a short user intent such as "Enemies know too much after hearing the player" and identify the appropriate work without sending every project record to one universal prompt.

The target flow is:

```text
User Intent
-> Task Classification
-> Context Plan
-> Context Assembly
-> Security Preflight
-> Specialist / Workflow
-> Model Recommendation
-> Structured Proposal
-> Human Review
-> Artifact / Action
```

Each arrow is a boundary with inspectable input and output. Classification does not approve a task. Context selection does not turn a source into truth. Model selection does not authorize a request. Generation does not save or approve an artifact. The owning workflow remains responsible for validation, review, persistence, and lifecycle rules.

The architecture must avoid:

- dumping the entire Game Wiki, Git Reality, or Unity GroundTruth into every request;
- one universal prompt that tries to encode every domain and workflow;
- a new database that copies all project truth into a "Project Brain" store;
- AI analysis outranking approved Intent or verified Reality;
- invented file paths, implementation facts, model scores, or provider capabilities;
- automatic live inference during classification when deterministic UI state is sufficient;
- universal model rankings detached from task, project, user, cost, and evidence;
- hidden routing that prevents a user from inspecting or correcting the proposed route.

## Project Brain

**Project Brain is a logical aggregate, not a monolithic database or competing source of truth.** It is the context layer through which ForgeMind understands a project by reading the existing owning domains:

- Compendium knowledge;
- approved Decisions;
- Open Questions and Current Priorities when those concepts exist;
- Git Reality and Unity GroundTruth;
- reviewed Alignment results;
- Feature Contracts and their derived Implementation Briefs;
- non-authoritative AI work history and local evaluation evidence.

The underlying stores remain separate, portable, and authoritative for their own data. The Game Wiki remains an aggregate view. The Context Builder is an assembly service over eligible source projections. Neither gains a `project-brain.json`, `context.json`, or other canonical copy of every source.

Derived indexes or caches may later accelerate selection, but they must be rebuildable, source-addressable, and disposable. Losing a derived index must not lose project knowledge.

## Architectural responsibilities

### Initiating surface

The initiating surface supplies the user's text and any deterministic route already established by the action. A focused action such as **Draft Feature Contract** should provide a known task type and workflow target. A general **Ask ForgeMind** entry point may provide only natural language and explicit user-selected context.

### Task Classifier

The classifier produces a bounded classification proposal. It prefers deterministic route facts, then configured rules, and uses AI only for genuinely ambiguous natural-language entry points. An AI-assisted classification remains a proposal with confidence and alternatives; it cannot silently select authoritative context or execute a workflow.

### Context Planner

The planner maps the classified task plus explicit selections to required, optional, and excluded source domains. It also defines source limits, freshness requirements, permitted provenance, topic hints, and a total context budget before any source content is assembled.

### Context Builder

The builder resolves the plan through owning read boundaries, validates eligibility and freshness, ranks bounded candidates, and emits a source-aware context package plus a source trace. It does not write back to source domains, infer approval, or persist a second copy as project truth.

### Security Preflight

Security Preflight validates the final assembled outbound package before it reaches an external provider. Context Builder determines relevance; Security Preflight determines whether that relevant context is safe and appropriate to send. The future shared check covers credential exclusion, known-secret scanning, path minimization, domain/task policy, provenance preservation, size/budget bounds, and provider-specific restrictions. It emits a bounded pass, block, or actionable warning without silently rewriting source data. SEC-0 defines the architecture; no preflight implementation exists.

### Specialist / Workflow Router

The workflow router selects an eligible focused workflow or specialist profile. It may return alternatives and an explanation. It must not bypass the owning artifact lifecycle. For example, an implementation-scope request routes through the Feature Contract workflow instead of directly authorizing code changes.

### Model Recommender

The recommender filters models by verified capabilities and availability, then uses task-specific local evidence when sufficient. It may return **Recommended**, **Fast**, **Cheap**, or **Deep** candidates. When evidence is insufficient, it reports no recommendation and still allows explicit model choice where the workflow permits it.

### Proposal Runner

The selected workflow builds its task-specific prompt and structured-output schema, invokes the replaceable native provider boundary only after explicit user action, and returns a transient proposal. Context Builder does not own every specialist prompt or normalize every domain result into one giant schema.

### Review and artifact owner

The destination workflow owns section-level review, save, approval, promotion, rejection, and persistence. Rejected output may contribute bounded local evaluation evidence but never enters authoritative project content automatically.

## Task classification

### Task families

The future shared vocabulary should support these high-level families without assuming that each family maps one-to-one to a Studio:

- `DESIGN`
- `LORE`
- `TECHNICAL`
- `ALIGNMENT`
- `FEATURE_CONTRACT`
- `IMPLEMENTATION`
- `TEST`
- `BALANCE`
- `ENCOUNTER`
- `DOCUMENTATION`
- `ASSET`
- `MODEL_EVALUATION`
- `PROJECT_MANAGEMENT_LIGHT`

A family is broad routing metadata. A task type is the narrower operation owned by a workflow or specialist, such as `REACTION_MODEL`, `CANON_CONFLICT_REVIEW`, `EXPLOIT_ANALYSIS`, `DRAFT_FEATURE_CONTRACT`, or `ASSET_VARIATION_BRIEF`. Task types should be registered with their owning workflow instead of collected in a universal prompt.

The current `SpecialistTaskType` and usage `TaskCategory` are existing domain-specific vocabularies, not yet this shared taxonomy. A future registry must map them deliberately rather than rename or merge them by accident.

### Conceptual classification result

```text
TaskClassification:
  family
  taskType
  confidence
  classificationMethod
  recommendedWorkflow
  recommendedSpecialistProfile
  alternateRoutes[]
  requiredContextDomains[]
  optionalContextDomains[]
  requiresCurrentReality
  requiresAuthoritativeIntent
  rationale
```

`classificationMethod` should distinguish at least `DETERMINISTIC_ACTION`, `RULE_MATCH`, `USER_SELECTED`, and `AI_ASSISTED`. Confidence describes route confidence, not confidence that the user's premise is true.

### Classification order

1. Honor an explicit focused UI action or workflow route.
2. Honor an explicit user-selected task type or specialist if it is eligible.
3. Apply deterministic rules from task-type metadata and required inputs.
4. For ambiguous **Ask ForgeMind** text, propose one or more routes with bounded AI assistance.
5. If confidence remains low, ask the user to choose between the few plausible routes or continue with a safe general analysis that cannot create an artifact.

Examples of deterministic routes:

- **Draft Feature Contract** -> `FEATURE_CONTRACT` / `DRAFT_FEATURE_CONTRACT`.
- **Review Alignment** on a selected review -> `ALIGNMENT` / `REVIEW_ALIGNMENT`.
- **Run with another model** on a stored specialist run -> `MODEL_EVALUATION` / `COMPARE_MATCHED_RUN`.
- **Generate asset variants** inside a future Asset Studio -> `ASSET` with the Studio-defined asset task type.

No classifier request is justified in these cases.

## Context plan

The plan is a small, inspectable contract created before content assembly. Its purpose is to make inclusion, exclusion, authority, freshness, and budget decisions explicit.

```text
ContextPlan:
  taskType
  requiredDomains[]
  optionalDomains[]
  topicHints[]
  explicitSourceRefs[]
  sourceLimits
  freshnessRequirements
  allowedProvenance[]
  excludeDomains[]
  maxContextBudget
  compactionPolicy
```

This is conceptual in CR-0. CR-1 should define exact typed fields only after mapping them to existing domain contracts.

### Domain meanings

- `requiredDomains`: the task cannot be grounded without these domains. Missing required context produces a gap, a route change, or a user-visible warning.
- `optionalDomains`: useful supporting context that may be omitted for relevance, budget, freshness, or availability.
- `topicHints`: bounded concepts used for deterministic matching; they are not project facts.
- `explicitSourceRefs`: user-selected or directly linked stable references, resolved through their owning domain.
- `sourceLimits`: per-domain item and excerpt bounds plus any allowed source fields.
- `freshnessRequirements`: task-specific rules for time-sensitive Reality. Design and lore tasks need not inherit technical freshness gates.
- `allowedProvenance`: provenance categories permitted for the request. AI work history may be supporting context but cannot satisfy a requirement for authoritative Intent.
- `excludeDomains`: explicit negative scope that survives later planning and compaction.
- `maxContextBudget`: a total bounded input allowance with reserved space for task instructions, user input, and output.
- `compactionPolicy`: permitted deterministic extraction and, only where authorized, source-aware summarization.

### Example context plan

For an enemy-behavior design task:

```text
Required:
- relevant Systems Compendium knowledge
- applicable approved Decisions

Optional:
- reviewed Alignment results about perception or information
- Unity component presence related to enemy perception
- selected prior behavior-specialist runs

Exclude:
- unrelated narrative and UI knowledge
- complete Git history
- unapproved Decisions as authoritative Intent

Freshness:
- current Reality helpful but not required for system-level behavior design
- current Reality required before making high-confidence implementation claims
```

## Source model and authority

The builder should project eligible records into a shared transport envelope without erasing the domain-specific record or copying it into a new truth store.

```text
ContextItem:
  sourceRef
  domain
  authorityClass
  provenance
  status
  title
  boundedContent
  capturedAt
  observedAt
  freshness
  directOrSummary
  relevanceReason
  fullSourceLink
```

The exact type is deferred to CR-1. The architecture requires these semantics:

- `sourceRef` is stable and resolves through the owning domain.
- `authorityClass` distinguishes authoritative Intent, verified Reality, derived review, delivery artifact, and AI work history.
- `provenance` retains the owning domain's precise vocabulary rather than flattening all sources to one label.
- `status` keeps lifecycle and approval state visible.
- `boundedContent` contains only task-relevant fields or excerpts.
- `observedAt` is distinct from the time the item was loaded or summarized.
- `directOrSummary` distinguishes a direct source projection from a compacted representation.
- `relevanceReason` explains why the item was selected without exposing hidden reasoning.
- `fullSourceLink` routes back to the owning ForgeMind surface or project-relative source.

### Authority classes

At minimum, assembled context must keep these classes distinct:

- `DOCUMENTED_INTENT`: current Compendium knowledge and other explicitly supported documented Intent.
- `APPROVED_DECISION`: approved human Decision history.
- `VERIFIED_REALITY`: bounded Git or Unity evidence with observation time and coverage limits.
- `REVIEWED_ALIGNMENT`: derived, reviewed interpretation linking Intent and Reality.
- `DELIVERY_ARTIFACT`: Feature Contract or related reviewed handoff, not primary Intent or implementation proof.
- `AI_WORK_HISTORY`: prior specialist output or evaluation evidence, always non-authoritative unless an individual finding was promoted through an owning workflow.
- `UNRESOLVED`: missing, ambiguous, conflicting, unsupported, or unreviewed material.

An assembled package must never convert this:

```text
DOCUMENTED_INTENT: Enemy sound information should remain uncertain.
VERIFIED_REALITY: An enemy perception component is present in the latest Unity export.
AI_WORK_HISTORY: A prior specialist suggested confidence decay.
```

into one unlabeled statement such as "The enemy system uses confidence decay." Source boundaries remain visible in the prompt, proposal trace, and review surface.

## Context selection

### Priority order

When sources are eligible and relevant, selection should prefer:

1. explicit user-selected context;
2. directly linked source references from the initiating artifact or workflow;
3. applicable approved Decisions;
4. current non-deprecated Compendium knowledge;
5. current reviewed Alignment evidence;
6. verified task-relevant Reality;
7. prior specialist output or other AI work history when useful.

This ordering is not a claim that Intent overrides observed facts. It describes selection priority and authority for project direction. When Intent and Reality disagree, both should be included with their distinct meanings so Alignment or the specialist can expose the gap.

Explicit selection still passes eligibility checks. A user selecting a proposed Decision does not make it approved Intent. A stale Unity export remains stale. A rejected specialist run remains non-authoritative.

### Progressive relevance matching

ForgeMind should evolve through the least complex useful mechanism:

0. **Explicit links and user selection.** Stable source references, initiating artifacts, and direct user choices.
1. **Deterministic keyword/topic matching.** Normalized bounded terms with an explainable match reason.
2. **Structured topic tags.** Domain-owned or reviewed tags when a real workflow establishes their value.
3. **Embedding or semantic retrieval.** Optional derived indexes only after simpler approaches show measured recall problems.
4. **AI-assisted context planning.** Bounded planning over source metadata, followed by deterministic eligibility and authority enforcement.

Later levels supplement earlier ones. They do not replace explicit links or allow the model to fetch arbitrary project content. Embeddings and RAG are not foundational requirements and are not authorized by this specification.

### Assembly pipeline

1. Validate workspace and portable project identity.
2. Validate the classification and Context Plan against registered workflow metadata.
3. Resolve explicit references through owning native boundaries.
4. Load bounded eligible metadata from required domains.
5. Apply lifecycle, approval, provenance, privacy, and path-safety rules.
6. Evaluate Reality freshness and coverage.
7. Rank candidates using explicit links, deterministic relevance, and task rules.
8. Allocate items by tier within per-source and total budgets.
9. Apply deterministic extraction and permitted source-aware compaction.
10. Emit the context package, omissions/warnings, and source trace.

Every omission should have a safe reason category such as `OUT_OF_SCOPE`, `INELIGIBLE_STATUS`, `STALE`, `BUDGET`, `UNAVAILABLE`, or `UNSUPPORTED`. The user does not need a verbose log by default, but the system must be debuggable without hidden reasoning.

## Context budgeting and compaction

### Budget tiers

- **Tier 1 - essential:** explicit user selections, directly linked sources, and the minimum authoritative context required by the task.
- **Tier 2 - strongly relevant:** applicable approved Decisions, current Compendium knowledge, reviewed Alignment, and verified Reality with direct topic relevance.
- **Tier 3 - optional/supporting:** indirect relevant sources, selected AI work history, and secondary evidence.
- **Tier 4 - historical:** older runs, superseded artifacts, broad history, and background material. Usually omitted unless comparison or history is the task.

The total model allowance must reserve capacity for system/task instructions, user input, the structured-output schema, and expected output. `maxContextBudget` is the bounded share available to assembled project context, not the provider's entire token limit.

Source limits should include item counts and bounded character or token excerpts. One large domain must not starve all other required domains. Repeated serialization should be avoided by reusing already validated current projections where safe, but no complex cache is required before measured need.

### Compaction rules

Prefer deterministic extraction before AI summarization:

- select only fields permitted for the task;
- remove presentation duplication;
- include safe bounded excerpts instead of complete documents;
- group repeated metadata without merging claims;
- use existing normalized domain summaries where they preserve meaning.

If later AI summarization is authorized, each summary must retain:

- source IDs and links;
- domain and authority class;
- provenance and lifecycle/review status;
- source freshness and coverage limitations;
- whether content is direct or summarized;
- a way to inspect the full source;
- explicit uncertainty when the summary may omit relevant detail.

Summaries from different authority classes must remain separate. Compaction must never silently resolve a conflict, upgrade AI inference, turn presence into runtime proof, or remove a stale-evidence warning.

## Freshness and coverage

Freshness is task-specific. The planner should state which sources need to be current and what happens when they are not.

- **Current enough:** use the source and expose its observation time in the trace.
- **Potentially stale:** include only if useful, attach a visible warning, and lower confidence for time-sensitive claims.
- **Clearly stale or missing:** do not make high-confidence implementation claims; recommend a Git refresh or Unity GroundTruth export when the task depends on it.
- **Partial or unsupported coverage:** retain the safe coverage limitation. Absence in incomplete coverage is not evidence of absence.

Technical impact, implementation, test-against-current-code, and Alignment tasks may require current Reality. Lore exploration, early design, and documentation drafting should not be blocked merely because Unity evidence is old, provided they do not claim current implementation facts.

The future policy should use source-specific signals: Git snapshot time/HEAD and working-tree state, Unity export time and coverage issues, artifact update time, and lifecycle/review state. CR-0 does not define hard age thresholds; those require evidence from real workflows and may vary by source and task.

## Specialist and workflow routing

Routing should select the narrowest workflow that owns the requested outcome:

| User need | Likely family | Candidate workflow or specialist |
| --- | --- | --- |
| Enemy behavior problem | `DESIGN` | AI Behavior Designer or future Design Studio |
| Lore contradiction | `LORE` | Future Lore Specialist / Lore Studio |
| Implementation-ready scope | `FEATURE_CONTRACT` | Feature Contract workflow |
| Exploit suspicion | `TEST` | Exploit Analysis or future Test Studio |
| Balance concern | `BALANCE` | Future Balance Specialist / Balance Studio |
| Asset generation request | `ASSET` | Future Asset Studio provider workflow |
| Technical impact question | `TECHNICAL` | Future Technical Specialist / Implementation Studio |

A conceptual routing result may contain:

```text
RoutingDecision:
  specialistProfile
  workflow
  taskType
  contextPlan
  candidateModels[]
  recommendedModel
  recommendationMode
  routeConfidence
  rationale
  warnings[]
```

The route must be explainable in plain language and correctable before execution. Direct access to focused workflows remains available; **Ask ForgeMind** does not become a mandatory gateway.

## Model recommendation

Model recommendation is task-specific and advisory. It must not define a universal model leaderboard.

### Inputs

- task type and structured-output schema;
- verified model/provider availability and capability requirements;
- known completion/context limits;
- structured-output validity for matching tasks;
- latency and provider-reported token usage;
- estimated cost only where pricing and usage are known;
- grounding and path-invention incidents recorded through review;
- section acceptance, regeneration, and explicit usefulness feedback;
- project/user-local evidence and sample size;
- provider or licensing constraints relevant to the workflow.

Unknown capability, price, or quality remains Unknown. Provider availability alone is not quality evidence. A model that performs well for Lore must not inherit that ranking for Test Design or asset generation.

### Recommendation modes

- **Recommended:** strongest sufficiently supported local fit for this task type and constraints.
- **Fast:** supported candidate with favorable observed latency.
- **Cheap:** supported candidate with the lowest evidence-backed estimated cost; unavailable when pricing or token evidence is missing.
- **Deep:** supported candidate chosen for quality/capability needs where evidence justifies the tradeoff.
- **No recommendation:** insufficient, incomparable, stale, or conflicting evidence. Allow an explicit eligible choice without pretending certainty.

Recommendation output should show the task scope, sample size, evidence period, important unknowns, and why the candidate is eligible. It must not expose hidden reasoning.

## Local Model Evaluation Profile

A future local profile should aggregate workflow evidence by task type, model ID, provider, prompt/schema version, and relevant configuration. It is evaluation evidence, not project truth and not provider billing.

### Automatic metrics

- attempts and successful normalized results;
- valid structured-output rate;
- average and distribution-aware latency;
- provider-reported input, output, and total tokens;
- estimated cost when explicit pricing and token counts are both available;
- truncation, normalization, and safe failure categories;
- regeneration count;
- task/schema/prompt version and model capability snapshot.

### Human/workflow evidence

- whole-proposal accept, edit, or reject outcome where the workflow exposes it;
- section accept rate and which sections were accepted;
- explicit usefulness rating when requested;
- grounding-quality review;
- hallucination or path-invention incident category;
- user-selected preference in a matched comparison;
- free-form feedback only if its privacy, bounds, and retention purpose are explicit.

Automatic metrics and human evaluation must remain separate in storage and presentation. A syntactically valid response may still be unhelpful. A rejected section is local workflow evidence, not proof that a model is objectively bad. Acceptance can be influenced by taste, task framing, incomplete context, or a changed goal.

Evaluation aggregation should require minimum samples before making a recommendation, retain the sample size, and avoid false precision. CR-0 intentionally defines no scoring formula or threshold.

## Proposal traceability and human review

Every future AI proposal should expose a safe context trace such as:

```text
Used context:
- Decision D-12 - approved Intent
- Compendium K-4 - documented Systems knowledge
- Alignment Review A-7 - reviewed derived evidence
- Unity Evidence U-9 - verified presence, exported at <time>

Omitted or limited:
- Git Reality - refresh recommended for implementation claims
- Specialist Run S-3 - omitted by context budget
```

The trace explains sources, selection reason, status, and freshness. It does not reveal chain-of-thought, hidden prompts, credentials, raw provider responses, or internal ranking deliberation.

For reproducibility and debugging, safe work history may record the task type, plan/version identifiers, ordered selected source references, model/provider identity, prompt/schema version, usage, normalization result, and safe warnings. Durable source content should remain in its owning store; history should avoid copying large private excerpts merely to reproduce a request.

Structured proposals remain non-authoritative. The user may accept, edit, regenerate, reject, promote, or save only through the result actions defined by the owning workflow. **Apply all** must not overwrite reviewed human content silently.

## Failure and uncertainty behavior

The architecture should fail toward bounded, useful uncertainty:

- If authoritative Intent is required but unavailable, say so and avoid presenting AI work history as a substitute.
- If current Reality is required but missing or stale, recommend refresh before high-confidence technical analysis.
- If only component presence is known, state presence rather than runtime behavior.
- If a file or symbol is not supported by evidence, provide a system-level recommendation and mark file locations unavailable.
- If classification confidence is low, show plausible routes and let the user correct the route.
- If required context exceeds budget, do not silently discard it; narrow the task, ask for explicit prioritization, or report the budget conflict.
- If an optional domain fails, continue when the workflow remains safe and show the omission.
- If provider/model evidence is insufficient, offer eligible explicit choices without a recommendation badge.

Example safe result:

```text
implementationEvidence: INSUFFICIENT
affectedSystemConfidence: LOW
fileLocations: UNAVAILABLE
recommendationScope: SYSTEM_LEVEL
nextAction: Refresh relevant Reality or select verified evidence.
```

## Security, privacy, and public/private boundaries

The detailed threat model, credential rules, Secret Guard, redaction/logging policy, prompt-injection boundary, and security roadmap live in [Security and Privacy Architecture](SECURITY_AND_PRIVACY.md). This document owns relevance planning and source-aware assembly; the security document owns the cross-cutting outbound-safety contract. The two share a future Context Preview rather than creating competing payload views.

Provider requests receive only task-relevant, bounded context. Never send:

- provider API keys, credentials, tokens, or authorization data;
- hidden AI reasoning or raw provider diagnostics/content;
- absolute machine paths unless a narrowly authorized local-only workflow proves they are necessary and safe;
- unrelated private project data;
- raw Unity serialized values or unsupported observations;
- full repository contents, complete Git history, or every Project Brain source by default.

Prefer project-relative paths, stable source IDs, normalized project-owned records, and bounded excerpts. After assembly, the future Security Preflight must evaluate the exact outbound package before the native provider adapter receives it. Native boundaries continue to own filesystem access, source validation, credentials, and provider calls; React must not gain generic file or network access.

ForgeMind is public/open-source while dogfooding projects may be private. This architecture never requires private project content to be copied into the ForgeMind repository, public documentation, fixtures, or evaluation datasets. Public examples remain generic. Local evaluation profiles and traces must identify projects through portable IDs, not machine paths, and must avoid embedding private content when metrics and source references are sufficient.

## Future user experience

The default experience should hide most infrastructure. A user should usually see:

1. **What do you want to work on?**
2. a suggested specialist or workflow with a short explanation;
3. a concise relevant-context summary, AI Data Boundary, and any freshness or security warning;
4. a recommended model or an honest no-recommendation state;
5. an explicit **Generate** or **Analyze** action;
6. a structured review surface with source trace.

Advanced controls may expose selected context, exclusions, source trace, the exact permitted outbound payload, model choice, budget, freshness, and security-preflight details. **View Context Being Sent** is for trust, debugging, and privacy review; it never exposes hidden reasoning. An architecture-debug panel is not the default product surface. The UX direction remains owned by [ForgeMind UI Direction](UI_DIRECTION.md); this document defines behavior and trust boundaries, not a UI implementation.

## Performance and cost principles

- Resolve only domains named by the Context Plan.
- Prefer stable direct references over broad scans.
- Reuse already validated current project projections where safe.
- Bound every source by item count and excerpt size.
- Avoid repeated serialization of identical context within one explicit task.
- Reserve model budget for useful output, not just input context.
- Make provider calls explicit and meter them through the existing native boundary.
- Add caching only after measuring repeated work and defining invalidation/freshness behavior.
- Do not add embeddings, a vector database, or background indexing before a demonstrated retrieval problem justifies them.

## Worked examples

### A. Lore task

**Input:** "Make this faction less one-dimensional."

**Classification:** `LORE`, likely `FACTION_DEPTH_REVIEW`; AI-assisted only if entered through general **Ask ForgeMind**, otherwise deterministic inside a future Lore Studio.

**Context Plan:** require explicitly selected faction canon and applicable approved narrative Decisions; optionally include linked quests, reviewed contradictions, and selected prior Lore work; exclude unrelated technical Reality and broad specialist history.

**Route:** future Lore Specialist / Lore Studio. Model recommendation uses Lore-task evidence only.

**Proposal and action:** structured motivations, internal tensions, risks to canon, assumptions, and open questions. The user reviews sections and promotes selected material to the Compendium or a proposed Decision through the owning workflow. Nothing is automatically canon.

### B. Behavior task

**Input:** "Enemies know too much after hearing the player."

**Classification:** `DESIGN`, likely `REACTION_MODEL` or `REVIEW_BEHAVIOR`, with an alternate `ALIGNMENT` route if the user's goal is to compare current implementation to approved Intent.

**Context Plan:** require relevant Systems Compendium knowledge and approved AI/perception Decisions; optionally include reviewed Alignment, current Unity perception-component evidence, and selected successful behavior runs. Require current Reality only for claims about the implementation.

**Route:** current AI Behavior Designer for bounded design analysis, future Design Studio for broader workflow, or Alignment for explicit Intent/Reality review.

**Proposal and action:** uncertainty-aware state/rule model with assumptions and deterministic tests. A selected finding may be promoted only through the existing explicit Project Knowledge review flow; presence evidence cannot prove the runtime defect is fixed.

### C. Feature Contract

**Input:** "Turn this Alignment issue into an implementation-ready contract."

**Classification:** deterministic `FEATURE_CONTRACT` / `DRAFT_FEATURE_CONTRACT` when invoked from the selected Alignment review.

**Context Plan:** require that approved Alignment reference and its captured Intent/Reality trace; optionally include directly related approved Decisions and current human draft fields. Exclude unrelated Wiki areas, broad Git history, and prior specialist runs unless explicitly selected.

**Route:** existing Feature Contract workflow. No classifier call is needed. Model choice remains explicit until future task-specific evidence supports recommendation.

**Proposal and action:** bounded contract sections, path-free unless captured Reality supports a location. The proposal is transient; the user applies selected sections, saves the draft, and approves separately.

### D. Test task

**Input:** "Check whether this mechanic can be exploited."

**Classification:** `TEST`, likely `EXPLOIT_ANALYSIS`; if no mechanic is selected and several are plausible, request a target rather than scan the whole project.

**Context Plan:** require the selected mechanic's rules and applicable approved Decisions; optionally include balance constraints, current tests, reviewed implementation evidence, and selected prior exploit findings. Current Reality is required before claiming a concrete exploit exists in code.

**Route:** current bounded Exploit Analysis task when applicable or future Test Studio.

**Proposal and action:** exploit hypotheses, assumptions, reproduction conditions, and deterministic tests. Findings remain hypotheses until verified; accepted tests may feed a Feature Contract or implementation handoff through explicit review.

### E. Asset task

**Input:** "Generate three worn industrial crates matching project art direction."

**Classification:** `ASSET`, likely `PROP_VARIATIONS`; deterministic inside a future Asset Studio, AI-assisted from **Ask ForgeMind**.

**Context Plan:** require explicit art-direction knowledge and approved visual constraints; optionally include selected reference assets, technical platform constraints, and licensing requirements. Exclude unrelated lore, raw repository content, and all assets not selected or directly relevant.

**Route:** future Asset Studio provider workflow. Candidate providers/models are filtered by asset capability, licensing, availability, and task-specific local evidence.

**Proposal and action:** three candidate generations with truthful provenance, provider/source metadata, and review controls. Rejected assets are not imported. Explicit approval and a project-relative destination are required before import or promotion.

## Relationship to current architecture

Context Builder does not alter the ownership of Intent, Reality, Alignment, Feature Contracts, or Implementation Briefs. It provides shared planning, selection, budgeting, freshness, and traceability rules for future specialists, Studios, **Ask ForgeMind**, AI drafting, technical analysis, and asset workflows. Security Preflight is a subsequent shared boundary over the assembled outbound package; it does not become another source selector or truth store.

Existing narrow workflows may later adopt the shared types incrementally. They should not be migrated merely to satisfy architectural symmetry. A separately authorized phase must prove that shared infrastructure improves behavior without weakening current boundaries.

Studios consume the shared infrastructure; they do not each invent a context loader, authority model, provider-selection policy, or provenance system. Studios still own task-specific schemas, prompts, review interaction, and artifact destinations. The unified router follows proven focused workflows and does not precede them.

Rebaseline may eventually use shared planning and source projections, but it remains a distinct reviewed re-onboarding workflow. Context Builder must not turn Rebaseline classification into automatic cleanup or mutation.

## Current readiness / gaps

These classifications describe readiness for future Context + Routing work, not completion of that work.

| Area | Status | Current repository evidence | Gap before shared routing |
| --- | --- | --- | --- |
| Specialist profile abstraction | `PARTIAL` | Native `SpecialistProfile` defines the runnable AI Behavior Designer; AIW-0 projects it into shared profile metadata and represents future working modes with purpose, allowed context, optional model preference, and review/output expectations. | Future profile prompts, task schemas, budgets, evaluation, and runnable registration remain flow-owned and unimplemented. |
| Provider abstraction | `READY` | `AIProvider` separates the normalized request/response boundary from the Nebius adapter, and tests use a mock provider. | Readiness is limited to a reusable boundary; provider capability routing and additional adapters are not implemented. |
| Model registry | `PARTIAL` | Static native entries expose provider/model identity, enabled state, optional pricing, and a small capability record. | No discovery, task fitness, routing policy, evidence thresholds, or provider fallback. |
| Usage metering | `PARTIAL` | Local records capture task category, model/provider, tokens, latency, estimated cost when known, success, and safe errors. | No Context Plan identity, prompt/schema version, acceptance signals, or task-specific evaluation aggregate. |
| Source references and provenance | `PARTIAL` | AIW-0 adds a shared compact source trace across Compendium, Decisions, Open Questions, Markdown, Reality-extension metadata, and prior AI messages while preserving owning-domain IDs and authority. | Freshness, omission reasons, Alignment/delivery projections, and a user-facing context preview remain broader CR work. |
| Game Wiki / Project Brain aggregation | `PARTIAL` | Wiki projects Compendium, Decisions, AI analysis, Alignment summaries, Feature Contract summaries, and bounded Reality summaries without a new truth store. NEXT-1 separately derives local Home recommendations from typed domain reads and session Reality state. | Neither UI projection is a reusable Context Builder API or selection plan. |
| Alignment evidence references | `READY` | Alignment stores captured safe Intent and Reality references with provenance, status, time, assessment, and review lifecycle. | Reuse must retain presence-only and historical-snapshot limits; it does not by itself provide current cross-task retrieval. |
| Feature Contract source trace | `READY` | Contracts preserve immutable captured origin, approved Alignment, and selected safe Reality references; AI drafting is bounded and transient. | Trace is contract-specific and must not be treated as the universal context schema. |
| Task categories | `PARTIAL` | Usage `TaskCategory` and specialist `SpecialistTaskType` provide bounded existing vocabularies. | They overlap but serve different domains; no shared task-family/task-type registry or mapping exists. |
| Specialist history | `PARTIAL` | Versioned runs retain profile, task, model, selected context IDs, normalized result, usage, budgets, and safe failures. | No section-level acceptance, explicit rating, context-plan trace, or general cross-workflow history contract. |
| Reality freshness | `PARTIAL` | Git Reality is a refreshable transient snapshot; Unity GroundTruth records export time and coverage/issues. | No task-specific shared freshness policy, threshold metadata, or Context Plan enforcement. |
| Deterministic context selection | `PARTIAL` | AIW-0 resolves bounded explicit/supporting Compendium, approved Decision, Open Question, project-relative Markdown, and same-project prior-message references with deterministic authority ordering. Existing Specialist and Feature Contract flows retain their own selection. | No tiered token allocator, freshness policy, omission reasons, inferred relevance, or migration of current flows. |
| Task classifier | `MISSING` | Focused UI actions currently establish their own operation; no general classifier is needed for those flows. | No shared classification result or bounded natural-language classifier. |
| Context Plan and Builder | `PARTIAL` | AIW-0 exposes a typed plan and bounded source package with retained trace for its future consumers. Markdown extraction is explicit, project-contained, and deterministic. | No provider prompt assembly, exact outbound preview, token budgeting, compaction, Reality reader integration, or general cross-workflow adoption. |
| Security Preflight and AI Data Boundary | `MISSING` | Current native workflows have narrow credential, payload, and persistence safeguards. | No shared final-package secret scan, path/policy validation, exact Context Preview, or block/warning result exists. |
| Model Evaluation Profile | `MISSING` | Matching specialist runs can be compared manually with their stored metrics. | No persistent evaluation profile, acceptance evidence, task-specific aggregation, scoring policy, or recommendation threshold. |
| Task Router / Ask ForgeMind | `DEFERRED` | Studios S9 describes the future natural-language route. NEXT-1 navigates from fixed local rules and is not a Router. | Requires proven focused workflows, shared task/context contracts, and evaluation evidence. |
| Semantic retrieval and AI compaction | `DEFERRED` | No embeddings, vector store, or RAG boundary is present. | Add only if measured workflow evidence shows deterministic selection is insufficient. |
| Open Questions / Current Priorities | `DEFERRED` | AIW-0 can select current Compendium records that already represent unresolved Open Questions. | No separate authoritative Open Question or Current Priority domain exists; routing cannot assume one. |
| Asset provider workflow | `DEFERRED` | Studios planning defines safety and provider concerns. | No asset provider, generation, import, licensing, or evaluation boundary exists. |

The most important remaining architectural inconsistency for CR-1 is vocabulary overlap: usage categories, specialist task types, workflow actions, source provenance, and evidence types are each valid inside their current domains. AIW-0 supplies a narrow source envelope for its own consumers, not a universal routing contract. CR-1 should add explicit mappings only where proven necessary and must not erase richer owning-domain types.

## Architecture decisions

1. **Project Brain is a logical aggregate, not a new truth store.** Existing domain stores remain authoritative.
2. **Planning precedes assembly.** A bounded Context Plan defines eligible sources, exclusions, freshness, and budget before content is loaded.
3. **Explicit links beat inferred relevance.** User selection and direct artifact references have highest selection priority, subject to eligibility.
4. **Authority survives assembly and compaction.** Intent, Reality, Alignment, delivery artifacts, and AI work history remain labeled and separate.
5. **AI output never outranks authoritative project knowledge.** Promotion and approval stay with owning human-reviewed workflows.
6. **Deterministic routing comes first.** Focused UI actions and explicit task choices do not invoke an AI classifier.
7. **Models are recommended per task.** No universal ranking is defined; insufficient evidence yields no recommendation.
8. **Acceptance is evaluation evidence, not objective truth.** Section and proposal outcomes are local signals with context and sample size.
9. **Semantic retrieval is optional optimization.** Explicit references, deterministic matching, and structured tags precede embeddings or RAG.
10. **Context trace is visible; hidden reasoning is not.** Users can inspect sources, status, freshness, and selection reasons without chain-of-thought.
11. **Freshness is task-specific.** Stale Reality limits implementation claims without unnecessarily blocking lore or design exploration.
12. **Shared infrastructure does not erase workflow ownership.** Specialists and Studios keep task-specific schemas, prompts, review actions, and artifact destinations.
13. **Private project data stays private.** Public ForgeMind development and documentation never require private dogfooding content.
14. **Adoption is incremental and separately authorized.** AIW-0 leaves Creator AI, Feature Contract AI, and current Specialist execution/history intact; future migration requires a separate scoped milestone.
15. **Relevance and outbound safety are separate gates.** Context Builder selects eligible task context; Security Preflight validates the final package before a provider adapter receives it.

## Future implementation phases

### CR-0 - Architecture/specification only

This document. Define boundaries, conceptual contracts, authority rules, readiness, and staged work. No code or behavior.

### CR-1 - Shared typed ContextPlan and deterministic selection

Extend the bounded AIW-0 source envelope only where another authorized workflow proves the need: shared task-family mapping, additional source projections, tiered budgeting, freshness results, and omission reasons. Reuse existing domain readers. Do not add natural-language AI routing or semantic retrieval.

### CR-2 - Source trace and context preview

Expose the selected context, authority/provenance, freshness, exclusions, budget summary, and exact permitted outbound payload for one explicitly authorized workflow. Coordinate with SEC-2 so one shared Context Preview represents both source relevance and the AI Data Boundary without exposing credentials or hidden reasoning. Validate trust and debugging value before broader adoption.

### CR-3 - Specialist routing

Add an explainable registry and deterministic routing among proven specialist/workflow capabilities. Preserve direct access and user correction. Do not add unified natural-language routing yet.

### CR-4 - Task-specific evaluation profiles

Record clearly separated automatic metrics and explicit human/workflow evidence, define minimum-sample policies, and produce no recommendation when evidence is insufficient.

### CR-5 - Natural-language Ask ForgeMind router

Add bounded classification for ambiguous general entry, using deterministic routes wherever possible. Connect only to proven workflows and expose alternate routes and correction.

### CR-6 - Optional semantic retrieval or advanced compaction

Introduce only if measured tasks demonstrate that explicit references, deterministic matching, structured tags, and bounded extraction are insufficient. Derived indexes remain rebuildable and non-authoritative.

No broader CR phase is authorized by AIW-0. Each phase requires an explicit roadmap decision, implementation brief, focused automated tests, privacy review, and separate manual validation where behavior or UI requires it.

## MVP and stop boundary

The hackathon MVP remains centered on Intent -> Reality -> Alignment -> Feature Contract -> Implementation Brief. Context Builder and routing should enter MVP implementation only through an explicit, narrowly scoped decision showing material demo value without risking 0K closure.

AIW-0 stops at explicit project-scoped sessions, deterministic bounded source assembly, source trace, and proposal review state. A general Context Builder, Task Router, model recommender, semantic retrieval, context preview, Studios, Writers' Room, and Chronicler UI remain unimplemented.
