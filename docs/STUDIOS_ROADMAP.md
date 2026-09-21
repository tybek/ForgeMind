# ForgeMind Studios Roadmap

## Status and scope

This document defines the future product direction for ForgeMind Studios: task-oriented specialist workspaces built on one shared framework. Every phase in this document is **FUTURE PLANNED WORK — NOT STARTED**. It does not authorize implementation, expand the current MVP, or change the status of 0K Feature Contract.

The current MVP loop remains:

```text
Intent
-> Reality
-> Alignment
-> Feature Contract
-> Implementation Brief
```

Studios extend that loop only after it is proven. They must preserve the product and authority boundaries in [Product Direction](PRODUCT.md) and [Architecture](ARCHITECTURE.md). Milestone state remains owned by the [Roadmap](ROADMAP.md). The [ForgeMind UI Direction](UI_DIRECTION.md) owns future information architecture and interaction direction, while the [ForgeMind Brandbook](BRANDBOOK.md) owns visual identity and voice. Use the [Coding Context Map](CODING_CONTEXT_MAP.md) to select implementation context when a Studio phase is explicitly authorized.

The existing [AI Specialists and Content Production Direction](AI_SPECIALISTS_AND_PRODUCTION.md) remains the broader reference for specialist profiles, content-production orchestration, and local model evaluation. This document specifies how those capabilities should converge into consistent user-facing workspaces rather than unrelated agents.

[Context Builder and Task Router Architecture](CONTEXT_AND_ROUTING.md) is the CR-0 shared-infrastructure specification beneath Studios. It defines task classification, Context Plans, authority-preserving selection and compaction, source trace, freshness, model-evaluation evidence, and staged CR-1 through CR-6 work. CR-0 is documentation only and does not start S0, S9, or any Context + Routing implementation phase.

## Core concept

ForgeMind Studios are task-oriented specialist workspaces over the same Project Brain. They are not separate agents with independent truth stores.

The shared interaction model is:

```text
User intent
-> Context Builder
-> Specialist and model selection
-> Structured proposal
-> Human review
-> Apply, promote, or save
-> Project artifact or implementation handoff
```

Studios are AI-assisted first. Manual entry remains an escape hatch, not the primary burden. A user should normally be able to describe an objective in natural language, receive project-aware proposals, select and edit useful sections, and explicitly convert accepted output into the durable artifact owned by the relevant ForgeMind workflow.

AI output remains non-authoritative until a person applies, promotes, saves, or approves it through that owning workflow. A Studio must never make a proposal authoritative merely because generation succeeded.

## Shared Studio framework

### Shared context sources

Studios should reuse existing sources instead of copying them into Studio-specific stores:

- Project Brain and Game Wiki context;
- approved Decisions;
- Compendium canonical knowledge;
- Alignment findings where relevant;
- Git Reality;
- Unity GroundTruth;
- Feature Contracts;
- model registry and usage metering;
- specialist-run history;
- human approval and provenance;
- local, task-specific model evaluation.

Each Studio must define which sources are eligible, which are required, how users inspect and override context selection, and how uncertainty is shown. Context inclusion is not proof that a claim is true. Documented Intent, approved Decisions, observed Reality, derived Alignment, and AI inference must remain distinguishable.

### Required Studio contract

Before implementation, every Studio must specify:

- supported task types;
- context-selection rules and bounds;
- candidate model/provider capabilities;
- a bounded structured-output schema;
- review and result actions;
- the owning destination for each durable artifact;
- authoritative versus non-authoritative output rules;
- provenance, usage, error, and history behavior;
- focused offline validation and any separate manual validation.

A common proposal envelope may identify the task type, selected context references, model/provider, generated sections, assumptions, uncertainties, provenance, usage, and proposal status. This is a conceptual interoperability direction, not a committed persistence schema. Studio-specific content belongs in typed sections appropriate to the task.

### Shared result interaction

Across Studios, prefer:

- Accept section;
- Edit;
- Regenerate section;
- Discard section;
- Apply all eligible sections;
- Continue exploring;
- Promote or create the owning artifact.

Regeneration must remain explicit and scoped. **Apply all** must not silently overwrite reviewed human content. No proposal is automatically saved. Users should not need to copy AI output between large text forms to continue a normal workflow.

Specialist-run history may preserve safe working analysis, selected context references, normalized output, model identity, usage, and safe diagnostics. It remains non-authoritative and must not persist raw provider responses, hidden reasoning, credentials, authorization data, or machine-specific absolute paths.

### Shared safety and authority rules

- Reuse owning domain stores; do not create a Studio truth silo.
- Require explicit human review before durable promotion, import, or approval.
- Preserve provenance and label AI-generated or AI-inferred material truthfully.
- Keep Git and Unity evidence separate from model inference.
- Do not invent implementation facts, file locations, or supported engine behavior.
- Use project-relative paths wherever a durable path is appropriate.
- Route providers through replaceable native boundaries.
- Inherit the shared BYOK credential policy; never store provider keys in project data or invent a Studio-specific key store.
- Route every external-provider package through the shared Security Preflight and expose the shared AI Data Boundary / Context Preview when implemented.
- Treat imported, generated, and project content as untrusted data that cannot override product, workflow, or security instructions.
- Meter explicit requests without making automatic live calls in tests.
- Keep rejected proposals and generations out of authoritative project content.
- Do not turn Studio history, Open Questions, or Current Priorities into a task-management system.

## Unified Ask ForgeMind direction

The long-term entry point may ask: **What do you want to work on?**

For a request such as “I want enemies to react to sound without omniscience,” ForgeMind should eventually:

1. identify likely task types;
2. gather relevant project context;
3. suggest an appropriate Studio or specialist;
4. recommend a model only where task-specific local evidence supports it;
5. generate a structured proposal;
6. support section-by-section accept, edit, regenerate, or reject;
7. create or update the relevant project artifact only after explicit review;
8. optionally prepare an implementation handoff.

The router connects to Studios; it does not replace their focused workspaces, schemas, or owning artifact workflows. It must explain its suggested route, allow the user to choose another route, and remain useful when no model recommendation is available. Unified routing belongs to S9 and must not be implemented early.

## S0 — Shared Studio framework planning

**Priority:** prerequisite. **Status:** planned, not started.

Define the reusable Studio contract, proposal/review interaction, context-builder rules, provenance vocabulary, history boundaries, provider capability routing, task-type registry direction, and local evaluation interface. Reuse current Specialist, Project Brain, model registry, usage, and approval infrastructure where it fits; do not generalize prematurely or migrate existing behavior without a separately authorized implementation brief.

Use [Context Builder and Task Router Architecture](CONTEXT_AND_ROUTING.md) as the shared baseline rather than redefining context loading, authority, freshness, provenance, evaluation, or model-routing policy per Studio. S0 remains responsible for the Studio-specific reusable contract and adoption plan; the existence of CR-0 does not mark S0 as started.

S0 should leave each later Studio with a consistent specification and a narrow way to add task-specific behavior without creating independent agents or truth stores.

## S1 — Lore Studio

**Priority:** high; strong early candidate. **Status:** planned, not started.

### Goal

Replace rigid lore questionnaires with a conversational, canon-aware development workflow. Lore Studio should gather current canon and suggest focused directions such as internal divisions, motivations, civilian cooperation, history, ideology, doctrine, faction relationships, and unresolved contradictions.

For a request such as “Develop the occupying faction; they should be brutal without being one-dimensionally evil,” the Studio might offer focused explorations such as:

- define three internal factions within the occupier;
- explain why some civilians cooperate with them;
- establish the canonical reason they entered the region;
- create one morally defensible action associated with the faction.

### Task types

- `WORLD_BUILDING`
- `FACTION_DESIGN`
- `CHARACTER_DEVELOPMENT`
- `HISTORY`
- `LOCATION_LORE`
- `CONFLICT_DEVELOPMENT`
- `CANON_REVIEW`
- `CONTRADICTION_ANALYSIS`
- `OPEN_QUESTION_EXPLORATION`

### Result actions and boundaries

Users may save reviewed output as Canon or Project Knowledge, create a Decision, keep an Open Question, continue exploring, or discard it. Lore Studio must preserve canon consistency, provenance, proposed-versus-approved status, and links to Decisions and Open Questions. It must not force users through a large template or make exploratory prose canonical automatically.

Lore Studio is a strong early candidate because it can build on current Project Brain, Decisions, Token Factory, specialist-history, and human-review infrastructure with relatively low integration cost.

## S2 — Design Studio

**Priority:** high. **Status:** planned, not started.

### Goal

Support project-aware game-design exploration without requiring users to construct structured design documents manually. For a request such as “Combat still feels too static,” Design Studio may gather design Intent, approved Decisions, relevant Alignment, and current Reality; propose hypotheses; identify risks; suggest small experiments; and identify mechanics worth testing.

### Task types

- `MECHANIC_DESIGN`
- `SYSTEM_REVIEW`
- `PLAYER_EXPERIENCE`
- `COMBAT_DESIGN`
- `ECONOMY_DESIGN`
- `EXTRACTION_DESIGN`
- `INFORMATION_DESIGN`
- `EXPERIMENT_DESIGN`

### Result actions and boundaries

Users may promote reviewed output to Project Knowledge, create a Decision, create an Open Question, create a Feature Contract, send selected material to specialist analysis, or discard it. Creating a Feature Contract must enter the existing reviewed contract workflow rather than bypass it. Hypotheses must remain distinct from observed Reality.

## S3 — Test Studio

**Priority:** high/medium. **Status:** planned, not started.

### Goal

Turn mechanics, Feature Contracts, suspected exploits, and known risks into deterministic and adversarial test plans. For “Check whether Fake Peek can be exploited,” a proposal may cover expected behavior, adversarial cases, edge cases, exploit hypotheses, deterministic tests, regression tests, and manual scenarios.

### Task types

- `TEST_DESIGN`
- `REGRESSION_DESIGN`
- `EXPLOIT_TEST`
- `EDGE_CASE_ANALYSIS`
- `ACCEPTANCE_TEST_DESIGN`

### Result actions and boundaries

Users may copy a test brief, attach reviewed tests to a Feature Contract, save a test plan, or later hand it to a coding agent. Test Studio must identify whether each expected behavior comes from approved Intent, a contract, Reality evidence, or an explicit assumption. A proposed test is not evidence that behavior exists or passes.

## S4 — Encounter Studio

**Priority:** medium. **Status:** planned, not started.

### Goal

Help designers create encounters and scenarios using current systems, factions, and constraints. For “I need an encounter in a village before extraction,” structured output may include:

- encounter premise;
- participating factions;
- player information state;
- enemy roles;
- escalation paths;
- environmental assumptions;
- possible rewards;
- failure or withdrawal options;
- exploit and balance risks.

Users may save an encounter concept, create a Decision, create a Feature Contract, create a test scenario, or continue refining. The Studio must not claim that proposed systems, entities, locations, or mechanics exist unless Reality supports them.

## S5 — Balance Studio

**Priority:** medium. **Status:** planned, not started.

### Goal

Help diagnose and test balance problems using project rules, parameters, and—when available—playtest data. For “Heavy armor feels strictly better than light armor,” output may include balance hypotheses, relevant variables, trade-offs, parameter candidates, expected side effects, a deterministic test matrix, and playtest questions.

### Task types

- `BALANCE_REVIEW`
- `PARAMETER_ANALYSIS`
- `PROGRESSION_REVIEW`
- `ECONOMY_REVIEW`
- `DIFFICULTY_REVIEW`

Balance Studio must state the evidence behind a diagnosis and distinguish configured values, observed playtest data, design Intent, and inference. It must never auto-modify balance values.

## S6 — Documentation Studio

**Priority:** medium. **Status:** planned, not started.

### Goal

Generate or update project-level technical documentation from authoritative Intent and Reality evidence. For “Update Enemy AI documentation from current implementation,” the Studio should inspect relevant Git/Unity evidence and Decisions, produce a reviewable documentation proposal, distinguish **VERIFIED implementation** from **DOCUMENTED Intent**, and avoid inventing unsupported behavior.

Users may preview, apply a reviewed documentation change, save the output as a proposal, or create an Alignment issue when Reality conflicts with Intent. Applying documentation must use a bounded, reviewable write path and must not convert a mismatch into false agreement.

## S7 — Asset Studio

**Priority:** post-MVP and experimental. **Status:** planned, not started.

### Goal

Coordinate provider-specific asset generators and integrate only approved results into Unity workflows. Potential categories include 2D sprites, UI icons, concept art, textures, PBR materials, decals, 3D props, environments, characters, animations, sound effects, ambience, and project-cover artwork.

For “Generate three rusty industrial crates matching this project's art direction,” the intended lifecycle is:

```text
Generate
-> Preview
-> Review
-> Approve
-> Import
-> Verify from Unity
```

The Studio should gather art direction and project constraints, suggest a suitable generator, create candidates, let the user approve one, record provenance, import only the approved output, and verify presence through Unity GroundTruth after import.

### Provider direction

Asset Studio must use provider abstractions rather than hard-code one vendor. Every external asset provider inherits [Security and Privacy Architecture](SECURITY_AND_PRIVACY.md): BYOK credentials remain outside project data, selected references and prompts pass through shared Security Preflight, and a Studio does not create its own key store. Candidate capability categories include:

- reasoning and planning through registered language models;
- 2D and visual generation providers;
- 3D APIs for text/image-to-3D, remeshing, texturing, rigging, or animation;
- sound-generation providers;
- Unity import/integration and appropriate Unity-native generation tools.

Selection may consider asset type, quality, latency, cost, licensing, topology and usability, art-direction consistency, and local evaluation history. ForgeMind must not claim that one provider or model is universally best.

### Provenance and import safety

Durable asset metadata should eventually capture an asset identifier, generator/provider, model, prompt, source references, creation time, license/source notes, review status, intended use, Unity-relative path after import, and an optional related Feature Contract. Uploaded reference images or assets must be explicitly selected; unrelated project assets are never auto-uploaded. Prompts, filenames, metadata, and diagnostics must not carry credentials. Exact schemas and storage belong to a later authorized design task.

Generated assets remain candidates. Require explicit approval before import or promotion, identify generated material truthfully, prefer project-relative storage, record available licensing/source information, and never import rejected generations. Do not persist machine-specific absolute paths.

Asset Studio is visually compelling but introduces provider, licensing, binary-artifact, import, and verification complexity. That risk is why it follows lower-cost Studios in the recommended order.

## S8 — Implementation / Technical Studio

**Priority:** medium; later MVP evolution. **Status:** planned, not started.

### Goal

Improve the handoff from approved design artifacts to coding agents. Potential capabilities include technical impact analysis, affected-system discovery, evidence-backed likely-file suggestions, task decomposition, test planning, Implementation Brief generation, post-implementation review, code or pull-request review, and change-impact review.

This Studio must build on approved Feature Contracts rather than bypass them. File suggestions require evidence. Coding agents remain responsible for repository edits and compile/test/fix loops; ForgeMind remains responsible for grounded context, reviewed scope, handoff, and later Alignment review. The Studio must not become an autonomous coding system or silently execute proposed changes.

## S9 — Unified Ask ForgeMind router

**Priority:** after focused Studio workflows are proven. **Status:** planned, not started.

Connect the long-term natural-language entry point to available Studios, specialists, context builders, and locally supported model recommendations. Routing quality must be explainable and evaluated against real tasks. The router must preserve direct access to Studios, allow manual correction, and avoid fabricating confidence when task classification or model evidence is weak.

## Task-specific model evaluation and routing

Model discovery should be task-specific. Behavior Design, Exploit Analysis, Feature Contract drafting, code documentation, and Test Design may favor different models. ForgeMind must not produce one universal ranking.

Local evaluation may record:

- task type;
- completeness;
- factual grounding;
- hallucination rate;
- structure adherence;
- latency;
- token usage;
- explicit user rating;
- usefulness of accepted output.

Future UX may expose **Recommended**, **Fast**, **Cheap**, and **Deep** choices. A recommendation must be grounded in sufficient local project/user evaluation history, show its task scope and supporting sample size, and remain unavailable when evidence is insufficient. Cost, capability, licensing, or quality must remain unknown when not verified. Provider routing is advisory until the user explicitly runs a task.

## Open Questions and Current Priorities

Studios should eventually integrate with lightweight project state without becoming a project-management suite.

An Open Question may contain a question, topic or area, author, `OPEN` / `RESOLVED` / `DEFERRED` status, resolution, and related Decision. A Current Priority may contain a title, topic or area, owner, priority, and target milestone.

Studios may create or resolve these concepts only through explicit reviewed actions. They must not introduce Jira-style boards, sprints, time tracking, or a competing task database.

## Recommended implementation order

The recommended sequence is:

1. **S0 — Shared Studio framework planning**
2. **S1 — Lore Studio**
3. **S2 — Design Studio**
4. **S3 — Test Studio**
5. **S4 — Encounter Studio**
6. **S5 — Balance Studio**
7. **S6 — Documentation Studio**
8. **S7 — Asset Studio**
9. **S8 — Implementation / Technical Studio**
10. **S9 — Unified Ask ForgeMind router**

The exact sequence may change for MVP or hackathon priorities, but changing it requires an explicit roadmap decision. Lore Studio is the strongest early candidate because it reuses current infrastructure. Asset Studio should not move forward merely for visual impact without accepting its added provider and integration risk. The unified router should follow proven focused workflows rather than define them speculatively.

## MVP and hackathon boundary

Studios are future roadmap direction. They do not expand the current MVP automatically. The current priority remains proving the Intent -> Reality -> Alignment -> Feature Contract -> Implementation Brief loop and completing the manual validation recorded for 0K.

A hackathon showcase addition may be selected later only through an explicit scoped decision showing that it improves demonstration quality without risking MVP completion. Planning or documenting a Studio does not mark S0 or any implementation phase as started.

## Future implementation readiness

When a Studio phase is authorized, its implementation brief should identify:

- the exact phase and task types in scope;
- reused domain stores and native boundaries;
- context-selection and proposal bounds;
- artifact ownership and approval lifecycle;
- safe persistence and provenance rules;
- offline tests and separate manual validation;
- explicit non-goals and stop condition.

Until then, this roadmap is a specification only. It creates no application behavior, persistence file, provider integration, automatic routing, or authority to begin a future milestone.
