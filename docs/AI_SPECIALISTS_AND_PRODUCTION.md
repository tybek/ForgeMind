# AI Specialists and Content Production Direction

## Status and scope

This document records the **COMPLETE** bounded 0G specialist-profile foundation, the **COMPLETE AIW-0** shared session/context/proposal metadata foundation, the **IMPLEMENTED AND HEADLESS-VALIDATED WR-1 THROUGH WR-1.3S** narrative workspace, and the bounded **TAV-1** external-research extension, plus broader **FUTURE DIRECTION**. AI Behavior Designer remains the separate structured analysis workbench. Writers' Room runs Lore Architect, Character & Dialogue, and Continuity Editor through one guided source-aware workflow; selected Tavily sources may inform a normal Nemotron response without becoming project truth. Wiki Chronicler, multi-agent behavior, general routing, semantic retrieval, and production integrations remain **NOT IMPLEMENTED**.

This direction does not expand the required hackathon MVP. The MVP remains centered on Project Compendium / Intent, Structured Decisions, Reality Snapshot, Alignment Reasoning, and Feature Contract. Specialist roles and content-production integrations may become demonstrations or post-MVP capabilities only after they support that core.

The separate [ForgeMind Studios Roadmap](STUDIOS_ROADMAP.md) turns the future specialist direction into a planned S0-S9 sequence of shared, task-oriented workspaces. Every Studio phase remains planned and not started. AIW-0 is lower-level reusable infrastructure; WR-1 is a separately authorized consumer and does not start a Studio or Chronicler phase.

Scope labels used here are:

- **COMPLETE:** ForgeMind 0F Game Compendium + Decisions and 0F.1 UX polish;
- **COMPLETE:** 0G Specialist Agent Profiles, including user-driven live validation of AI Behavior Designer;
- **COMPLETE:** AIW-0 Shared AI Workspace Foundation, without a new runnable specialist experience;
- **MVP:** the five required alignment-centered capabilities above;
- **FUTURE DIRECTION:** specialist role profiles and multi-perspective review;
- **POST-HACKATHON:** broad telemetry analysis and production asset pipelines unless deliberately promoted later;
- **WR-1.3S COMPLETE; TAV-1 IMPLEMENTED, HEADLESS VALIDATED:** Writers' Room supports Lore Architect, Character & Dialogue, and Continuity Editor; the restored WR-1.3S contract has a user-confirmed live manual PASS, while the bounded Tavily plus Nemotron TAV-1 demo acceptance remains pending.
- **NOT IMPLEMENTED:** Wiki Chronicler, Narrative Designer, the general Router, and every other runnable profile or production capability except the bounded AI Behavior Designer described below.

## Foundation: one Project Brain

ForgeMind remains centered on:

**Intent -> Reality -> Alignment -> Feature Contract -> Implementation Brief**

Specialist profiles extend this foundation; they do not replace it. Every specialist reasons from the same authoritative ForgeMind project context, referred to here as the **Project Brain**.

```text
Project Brain
    |
    +-- Game Designer profile
    +-- Technical Architect profile
    +-- AI Behavior Designer profile
    +-- Balance Analyst profile
    +-- Narrative Designer profile
    +-- Producer profile
    +-- Playtest Analyst profile
    +-- Content Designer profile
```

Profiles may receive different relevant subsets of shared project knowledge, but they must not maintain independent truth, isolated project databases, or disconnected chatbot memory. Durable project knowledge and evidence remain governed by the same provenance, review, and approval rules regardless of which profile uses them.

The 0G implementation uses role/profile prompting against deliberately selected shared context. It does not create a complex autonomous multi-agent framework.

AIW-0 generalizes the reusable metadata and review layer. WR-1 activates only `lore_architect`, `character_dialogue`, and `continuity_editor` with flow-owned prompts, a strict conversational response schema, a 3,200-token preferred completion budget, registry-backed Nemotron default, explicit alternate-model choice, and deterministic context rules. `wiki_chronicler` remains unavailable for provider runs. Existing `SpecialistProfile`, Creator AI, and Feature Contract AI execution stay flow-specific and were not migrated.

One user-driven Lore Architect run through Nebius Token Factory and `nvidia/nemotron-3-super-120b-a12b` succeeded at the provider and persistence boundaries (`1,795 ms`; `447` input, `189` output, `636` total tokens). Its concise collaborative response asked three focused questions and remained non-authoritative. The immediate UI then blanked because the freshly serialized run document bypassed the shared optional-collection normalizer; restart/reload rendered the persisted response. WR-1.2 applies one normalization boundary to live and persisted results and adds reload-only recovery without an automatic provider retry. This single observation is not a reliability rate or general model conclusion.

### Writers' Room profiles

- **Lore Architect:** collaboratively develops worldbuilding, factions, locations, history, cultures, conflicts, relationships, and implications while separating established context from proposed invention.
- **Character & Dialogue:** develops characters, motivations, relationships, voice, scenes, and dialogue; drafts remain exploratory until explicitly promoted.
- **Continuity Editor:** prioritizes established, documented, unresolved, and conflicting information and may state that no established answer exists instead of inventing one.

All three use one bounded recent-turn window and one AIW-0 Context Plan. TAV-1 may add up to five explicitly selected `EXTERNAL_RESEARCH` sources after a separate one-shot Tavily Search; Tavily retrieves and Nemotron synthesizes. The profiles never auto-search, auto-call another model, retry automatically, rank models, auto-save generated text, or auto-approve a Decision.

WR-1.3S keeps guided exploration/clarification/consolidation as prompt behavior rather than provider-authored schema. The stable response remains `message`, zero-to-three plain string `questions`, supplied-only `sourceRefs`, and bounded strict `proposals`; `mode`, nested questions, and `whyItMatters` are not reintroduced. Lore Architect avoids premature invention, Character & Dialogue keeps drafts proposed, and Continuity Editor distinguishes established, documented, unresolved, conflicting, external, and not-found material. The review queue permits explicit title/content/reason edits before Apply; this changes only non-authoritative proposal history until the owning-domain action succeeds.

## Future agent workflow direction

ForgeMind and Token Factory should increasingly handle the planning, reasoning, review, and documentation that frame implementation work. Coding agents should remain focused on repository edits, compile/test/fix loops, and bounded implementation against an approved brief. This direction improves the context supplied to coding tools; it is not a plan to replace Cursor, Codex, or another coding environment.

The preferred future flow is:

```text
Project Brain -> specialist/planning analysis -> Feature Contract / implementation brief -> coding agent -> compile/test/fix -> ForgeMind Reality/Alignment review
```

Candidate specialist roles for that flow include:

- Technical / Architecture Analyst;
- Code Documentation Agent;
- Change Impact Analyst;
- Test Design Agent;
- Implementation Brief / Task Decomposition Agent;
- Code/PR Review Agent;
- Alignment Review Agent;
- Balance Analyst;
- Encounter Analyst;
- Progression Designer;
- Playtest Analyst.

These are future role ideas, not implemented agents. The game-design roles are described further below; the technical roles should likewise operate over shared Project Brain context, preserve provenance and uncertainty, and produce reviewable inputs rather than changing repositories or project truth autonomously.

### AI Studio consolidation

**FUTURE DIRECTION, NOT IMPLEMENTED.** As profiles expand, they should live in an AI Studio rather than each becoming permanent top-level navigation. Candidate profiles include AI Behavior Designer, Balance Analyst, Encounter Analyst, Technical / Architecture Analyst, Playtest Analyst, Progression Designer, Code Documentation Agent, Change Impact Analyst, Test Design Agent, Implementation Brief / Task Decomposition Agent, Code/PR Review Agent, and Alignment Review Agent. Model Evaluation / Model Lab belongs beside them.

Every profile uses the same shared Project Brain and authority boundaries. No profile receives an isolated truth database, silently promotes its output, or autonomously executes repository work.

## Implemented 0G profile foundation

The native `SpecialistProfile` definition carries a stable ID, display name, description, centralized system prompt, supported task types, default task type, and deterministic per-task context guidance. React receives only public profile metadata. The first and only profile ID is `ai_behavior_designer`.

The workbench lets a user select up to eight current Compendium entries, up to six approved Decisions, one enabled registry model, a bounded task type, and a transient scenario. Rust resolves those selected IDs from validated workspace files, rejects deprecated knowledge or non-approved Decisions, and sends only the selected context through the existing registered provider and `ai_behavior` usage-metering path.

Output is strict JSON with a concise summary and bounded lists for assumptions, recommendations, risks, exploits, open questions, and suggested tests. Assumptions are shown separately as AI inference rather than project fact. The 0G.3 workbench stores normalized successes and safe failure metadata in versioned `.forgemind/specialist-runs.json` so prior work remains reviewable. This analysis history is a non-authoritative work artifact and never mutates project truth automatically.

### 0G.3 production hardening

The desktop workbench uses a responsive two-pane layout: configuration and explicit context selection remain on the left, while loading, current output, safe errors, and compact history remain on the right. Narrow windows stack both panes without changing the global shell. A readable activity state and elapsed seconds acknowledge real provider latency without inventing percentage progress; duplicate execution is disabled and the form remains intact.

Compendium choices are grouped by the existing bounded Area taxonomy. Each task strongly surfaces a small deterministic set of recommended Compendium areas and preferred Decision areas, but users may override the guidance or run with no project references. Approved Decisions are the only eligible decisions and use a collapsible selector. ForgeMind still sends only explicitly selected references.

Completion budgets are bounded per task to accommodate different structured-output pressure without increasing result-list limits: `DESIGN_BEHAVIOR`, `REVIEW_BEHAVIOR`, and `COMPETENCE_TIERS` use 3,000; `REACTION_MODEL` uses 3,400; `EXPLOIT_ANALYSIS` uses 3,200; and `BEHAVIOR_CONTRACT` uses 3,800 tokens. All retain temperature `0.2`, `minimal` reasoning, strict JSON validation, safe `OUTPUT_TRUNCATED` behavior, and no automatic retry.

### 0G.4 Reaction Model reliability and context UX polish

Further real dogfooding showed that `REACTION_MODEL` could still exhaust its 3,400-token completion allowance before producing one complete JSON object. The current bounded budgets are 3,200 for `DESIGN_BEHAVIOR` and `REVIEW_BEHAVIOR`, 3,400 for `COMPETENCE_TIERS`, 4,600 for `REACTION_MODEL`, 3,800 for `EXPLOIT_ANALYSIS`, and 5,200 for `BEHAVIOR_CONTRACT`. No unbounded fallback or retry was added.

The shared prompt now requires one compact object, concise one-to-two-sentence items, no repeated scenario or context description, no cross-section duplication, and implementable rules over explanatory prose. `REACTION_MODEL` additionally prioritizes stimulus, uncertainty, escalation, investigation, information sharing, decay, tier differences, and deterministic tests as a compact state/rule model rather than narrative examples. The canonical schema and list-count bounds are unchanged; truncation still fails safely.

The Project Context panel keeps recommendations editable and non-duplicated, uses **More project context** as a fixed heading, and gives every existing Compendium Area its own collapsed disclosure with entry and relevant selected counts. Selected Area groups remain open and discoverable. This remains deterministic manual guidance, not search, embeddings, or RAG.

### 0G.5 Specialist workbench recovery

Specialist Analysis History is auxiliary work state and is not a startup or execution dependency. Profile/task metadata, the model registry, Compendium, approved Decisions, and history load independently. A history read or validation failure is confined to the History panel; a successful current analysis remains visible even if its history append fails.

Format version `1` remains current. The hotfix adds lossless compatibility for history diagnostics written by ForgeMind with omitted empty diagnostic arrays; there is no schema-version migration. Genuinely malformed or unsupported history is never repaired automatically. A two-step user action archives only `specialist-runs.json` to a timestamped `specialist-runs.invalid-*.json` file and creates a valid empty history. The recovery response exposes only the safe backup filename and empty document, never archived contents or absolute paths.

### 0G.6 capability-aware specialist requests

The native model registry now exposes small optional capabilities: maximum completion tokens, reasoning-effort support, and structured-output support. Values are authoritative only when explicitly configured. DeepSeek V4.1 Flash currently has known reasoning-effort support but no verified completion maximum or structured-output capability, so those values remain Unknown rather than being inferred from a failed run. MODEL-1 may enable additional provider-listed or custom IDs, but those entries default to structured-output `NONE` and receive no automatic task compatibility; owning workflows retain their existing explicit compatibility and strict local validation boundaries.

Each specialist task retains a preferred budget. The effective default is the smaller of that preference and the model maximum only when a maximum is known. A collapsed Advanced Run Settings control permits one explicit validated override, bounded by a known model maximum and ForgeMind's 8,192-token safety ceiling. Truncation may offer an explicit higher-budget retry only when safe headroom is known; retries never occur automatically. Safe invalid-request diagnostics can retain HTTP status, provider code/type, rejected parameter, request budgets, model identity, and request-feature flags without retaining raw provider bodies, project prompts, reasoning, headers, or credentials.

### 0G.7 Specialist run UX polish

The Run Analysis action itself becomes the disabled spinner and elapsed-seconds status while a request is active, keeping feedback beside the initiating control without inventing percentage progress. Configuration and scenario text remain intact during the request. A successful result clears the current scenario only when the existing native result contract confirms history persistence with no warning; provider, validation, and history-write failures preserve the user's text.

Analysis History shows the exact persisted Scenario / Question with task type, timestamp, and model. Every historical run can copy that stored scenario, including failures, so a failed prompt remains reusable. Current and historical successful results use one deterministic Markdown formatter containing the normalized structured sections, selected Context Used references, and safe run metadata. The formatter has no input for raw provider responses, hidden reasoning, credentials, or authorization data. History remains non-authoritative working analysis and copied output is not promoted into project truth.

### 0G.8 Game Wiki and explicit knowledge promotion

Game Wiki aggregates Compendium knowledge, Decisions, and relevant successful analysis runs under the existing Compendium Areas. It is a browsing view over current stores, not an independent specialist database or `wiki.json`. Knowledge, approved and non-approved Decisions, and AI working analysis retain visibly different authority labels.

Each finding in a successful stored run has an explicit **Add to Project Knowledge** action. The user reviews and may edit Area, title, statement, and status before a separate confirmation persists one real Compendium entry with `AI_INFERRED` provenance and `specialist_analysis` source. Native validation confirms the source finding belongs to the stored run and applies deterministic exact title-plus-statement duplicate protection. The original run remains unchanged, no Decision is created, and there is no automatic AI mutation of project truth.

### 0G.9 Specialist and Wiki production UX polish

Manual dogfooding showed that the two-pane workbench and per-finding inline promotion controls did not scale to repeated production use. On wide windows, configuration, compact inbox-like Analysis History, and the selected-run detail now remain visible as three columns; narrow windows stack them. Selected Project Context and Approved Decisions precede the saved Scenario / Question. Scenario, successful-run, and failed-run diagnostic copy actions are compact local controls with anchored feedback, and failed-run Markdown is constructed only from the stored scenario, safe diagnostics, selected-reference metadata, usage, model, and timestamp.

Successful stored findings are selectable by checkbox. One explicit action opens a large human-review surface supporting multiple findings, with vertical Area, Status, Title, Statement, fixed provenance, and fixed source fields for each item. Promotion continues to invoke the existing native command for each reviewed finding, so stored-run membership, exact duplicate rejection, truthful `AI_INFERRED` / `specialist_analysis` attribution, unchanged history, and no automatic Decision creation remain authoritative. A normalized-title match is presented as a potential duplicate with Cancel, edit-existing through Compendium, and Save anyway choices; title alone is not a native persistence block.

Game Wiki keeps the existing Compendium Area taxonomy while adding local keyword search, a bounded source-type filter, separate type and state/subtype tags, compact metadata, and edit-at-source navigation for Knowledge. It remains a read aggregation without `wiki.json`, embeddings, semantic search, or RAG. A future topic/tag layer, for example `Systems → Enemy AI`, remains a documented direction rather than a new top-level AI Area.

### 0G.10 Specialist history readability and Scenario copy hotfix

Manual AI Behavior Designer use exposed two bounded presentation problems: Copy Scenario could appear to target a compact preview rather than the complete stored prompt, and each history row compressed timestamp, model, and budget into one wrapping metadata line. Copy is now routed through one exact-value Scenario / Question component for both persisted history and the current unsaved-result fallback, so internal line breaks and formatting reach the clipboard unchanged. The inbox column keeps its existing width while each row gives task/status, timestamp, model, and budget plus outcome their own compact visual line; long secondary values are ellipsized rather than widening the column.

Project Context now exposes **Select recommended** and an independent **Deselect all**. Selecting recommendations merges them with existing manual choices, while clearing Project Context affects only Compendium references. Approved Decisions have a separate clear action. These are local selection controls only: selected-reference submission, history persistence, reasoning architecture, and project-truth authority remain unchanged.

### 0G.11 NVIDIA Nemotron and manual A/B evaluation

`nvidia/nemotron-3-super-120b-a12b` is the first NVIDIA model configured for hackathon validation through the existing Nebius Token Factory registry. DeepSeek V4.1 Flash remains enabled. Nemotron has no configured pricing, maximum completion-token value, or other unverified capability claim; those fields remain Unknown. The first user-authorized call later confirmed NVIDIA provider inference, while full Specialist validation remained incomplete because the otherwise valid result exceeded a canonical list bound.

A saved successful Specialist run exposes one compact, explicit **Run with another model** action. The user selects a different enabled model and ForgeMind reuses the stored task type, exact Scenario / Question, ordered Compendium references, and ordered approved-Decision references for one normal run. No request occurs when the view loads or when the model is selected. Matching successful runs can then be reviewed side by side across summary, recommendations, risks, exploits, suggested tests, latency, token usage, estimated-cost availability, and effective completion budget. The surface is human evaluation rather than an authoritative benchmark and never scores, routes, or chooses a winner.

The first authorized Nemotron call succeeded at the NVIDIA provider boundary and returned valid extracted JSON: latency `6454 ms`, input `1096`, output `1045`, total `2141`, effective budget `5200`. It was not yet a successful full Specialist run because seven recommendations exceeded ForgeMind's canonical maximum of five and the prior validator returned `INVALID_SPECIALIST_SCHEMA`. Pricing and unsupported capabilities remain Unknown.

### 0G.12 bounded-output normalization

The shared Specialist normalizer now treats only allowed-list overflow as a non-fatal shape normalization. After JSON extraction, field-type checks, unknown-field rejection, required-summary validation, and per-item validation succeed, it retains the first canonical maximum for each overlong array independently and preserves original ordering. Bounds remain five for assumptions, recommendations, risks, exploits, and open questions, and eight for suggested tests.

Each affected field produces safe returned/retained counts such as `recommendations: 7 returned → 5 retained`. Those notices accompany the current result, persist additively with successful format-version `1` history, and appear in result detail and comparison. No item is invented, merged, summarized, reordered, or rewritten; overflow text is not persisted. Malformed JSON, wrong types, missing summary, unknown structures, invalid strings, and truncation continue to fail. The behavior is provider/model-neutral, performs no automatic retry, and does not claim a structured-output capability for Nemotron or any other model.

The first live NVIDIA Nemotron 3 Super Specialist run after 0G.12 normalization hardening completed successfully. This is one useful local result, not recommendation-grade evidence. The early DeepSeek/Nemotron comparison sample remains too small to support a model recommendation.

## Potential specialist profiles

### AI Behavior Designer

**IMPLEMENTED and validated in 0G.** Designs, analyzes, and reviews enemy or NPC behavior using manually selected Compendium knowledge, approved Decisions, and a user-supplied scenario. The first live result was considered useful for real game-development work; saved analysis remains a working proposal rather than durable project truth.

Implemented task types are `DESIGN_BEHAVIOR`, `REVIEW_BEHAVIOR`, `COMPETENCE_TIERS`, `REACTION_MODEL`, `EXPLOIT_ANALYSIS`, and `BEHAVIOR_CONTRACT`. Outputs may propose behavior rules, competence-level differences, reaction policies, exploit risks, and deterministic test scenarios. These are scenario reasoning, not verified gameplay simulation.

### NPC Archetype Designer

Designs coherent enemy and NPC archetypes across attributes, skills, equipment pools, tactical competence, aggression, courage, perception, hearing, discipline, role, faction context, and behavior capabilities.

It may eventually identify contradictions such as low Tactical Skill paired with implementation evidence of elite tactics. Such a finding is an Alignment concern, not permission to rewrite either source automatically.

### Encounter Analyst

Analyzes encounters for dominant player strategies, trivial solutions, exploitable AI patterns, insufficient tactical choice, impossible or unfair states, and viable stealth or combat routes.

This is design reasoning, not authoritative deterministic gameplay simulation.

### AI Red-Team / Exploit Analyst

Challenges proposed behavior and encounters by searching for repeated baiting, same-side peek abuse, predictable reactions, degenerate safe strategies, and tactics that invalidate intended difficulty.

### Balance Analyst

Reviews Action Point economy, weapon and armor relationships, enemy statistics, item values, progression, loot, extraction timing, and combat-system interactions. It must distinguish hypotheses and AI inference from measured playtest evidence.

### Progression Designer

Reasons about character progression, skills, perks, unlock order, pacing, dependencies, and power creep.

### Content Designer

Proposes items, weapons, enemy variants, NPCs, loot, encounters, and world events. Outputs are review candidates and never automatic canon.

### Level Design Agent

Creates structured level or encounter briefs from gameplay requirements. A brief may describe tactical zones, approach routes, sightlines, stealth paths, combat spaces, cover requirements, extraction locations, objective placement, and loot-risk zones.

This direction does not define automatic final-level generation.

### Playtest Analyst

May eventually consume gameplay logs or telemetry to identify meaningful decisions, missing options, failed systems, dominant strategies, resource pressure, AI failures, confusing feedback, and balance anomalies. Gameplay telemetry ingestion is future scope.

## Multi-perspective review

A future review workflow may ask several specialist profiles to examine the same proposal. For example, a question such as "Should grenades be implemented now?" could be considered from these perspectives:

- Designer: tactical value;
- Technical Architect: dependencies and implementation cost;
- Balance Analyst: dominant-strategy risk;
- Producer: milestone and scope impact.

A final reviewer may synthesize the perspectives while preserving their sources, assumptions, disagreements, and uncertainties. This should begin as several bounded role prompts over shared context, not as an autonomous organization of agents.

## Simulation and scenario reasoning

ForgeMind must preserve a clear distinction between:

### Real simulation

Authoritative deterministic behavior executed by game or runtime systems. Its outputs are Reality evidence when their source, conditions, and time are recorded.

### AI scenario reasoning

LLM-based exploration of plausible strategies and outcomes. It may generate possible player approaches, reason about likely NPC reactions, search for exploits, challenge encounter assumptions, and identify edge cases.

AI scenario reasoning is inference. ForgeMind must never present it as a deterministic simulation result. Evidence from real gameplay, tests, simulations, or telemetry must remain distinguishable from model speculation.

## Content-production orchestration

ForgeMind may eventually coordinate specialized content-generation tools. Its role should be director and orchestrator, not an assumption that one language model produces every asset type.

```text
Project Knowledge
    |
Asset Brief
    |
Specialized Generator
    |
Generated Candidate
    |
Validation and Review
    |
Human Approval
    |
Production Asset
```

Potential integrations include image and concept-art generation, textures, 3D assets, animation, facial animation and lip sync, Blender workflows, and Unity import workflows. None of these integrations are implemented.

### Asset Brief capability

A future Asset Brief may combine narrative and lore, faction, gameplay role, art direction, gameplay requirements, animation requirements, technical constraints, and Unity requirements.

Technical requirements may include Unity Humanoid compatibility, separate weapon sockets, stable gameplay hit volumes, replaceable visual models, and required animation states. Generated assets remain candidates requiring validation and human approval.

### Animation direction

Future briefs or external integrations may address crouching, cover attachment, left and right peek, quick withdraw, tactical locomotion, interactions, and facial animation. ForgeMind does not currently generate or evaluate animation.

### 3D and texture direction

Future reasoning models may produce structured specifications and help validate outputs from external image, texture, or 3D generation systems. The core language model must not be described as directly producing production-ready FBX files, models, or textures.

## Private-project dogfooding

A private existing game project may be used as an internal dogfooding environment for realistic evaluation tasks involving AI behavior, combat, cover, inventory, balance, progression, narrative, roadmap reasoning, and Unity GroundTruth.

The private game and public ForgeMind codebase must remain separate repositories. Private dogfood-project files must not be copied into this repository. Public benchmarks should use sanitized or manually prepared scenarios that do not require private project access.

## AI provider and model evaluation

ForgeMind now has an AI Provider + Evaluation Harness, model registry, local usage metering, Specialist Analysis History, and NPC-2 task-specific Creator proposals. Creator tasks reuse the same Nebius boundary and the registered `nvidia/nemotron-3-super-120b-a12b` default through stable `new_project_core_loop` and `new_project_design_pillars` usage categories. NPC-2.1 may use another explicitly selected enabled Token Factory model from the same registry, but one confirmation still makes only one request; it does not add a Specialist profile, automatic router, multi-model call, or model recommendation. Its preflight may show task/model-specific recent latency from actual local usage, labeled as an observation rather than benchmark performance. A future **Model Evaluation Profile / Local Task Recommendations** capability may aggregate model evidence per Specialist task type, but only from actual ForgeMind runs and explicit human evaluation. It must not substitute synthetic, assumed, or externally reported performance for local project evidence.

Creator proposal schemas now allow zero to three concise `assumptions` per Core Loop or Design Pillar item. The provider instruction must use supplied Creator fields as facts and label any useful unestablished mechanic or direction as an assumption. These assumptions are AI inference and review cues only. Accepting proposal content does not separately approve or persist them as Compendium knowledge, Decisions, Open Questions, or any other project truth.

For each model and task type, the profile may report:

- visible run count;
- success and failure rate;
- schema failure rate;
- truncation rate;
- normalization rate;
- average latency;
- input, output, and total tokens;
- estimated cost only when pricing is known;
- human usefulness ratings or tags.

Human comparison may record **better overall**, **reasoning quality**, **implementation usefulness**, **test quality**, **concision**, and **latency/cost**, plus an optional note. These judgments remain explicit human evaluations rather than automated truth.

Any future recommendation must use the wording **Recommended from local project history**, display the supporting sample count, and remain scoped to its Specialist task type. Recommendations may therefore differ by task type. ForgeMind must not fabricate statistics or recommend from an insufficient sample, automatically declare a global best model, or automatically route work to a model. Automatic model routing is not implemented and is not part of this capability yet.

The evaluation surface should continue to use the replaceable, privacy-conscious provider and metering boundaries. It must not use another model to automate subjective quality scoring. Model experimentation remains isolated from core domain logic, and credentials remain securely loaded from local configuration rather than stored in project knowledge.

Candidate initial benchmark categories are:

1. AI behavior design;
2. NPC archetype design;
3. exploit discovery;
4. tactical encounter analysis;
5. balance review;
6. progression reasoning;
7. content proposal;
8. level or encounter brief;
9. technical requirements generation;
10. cross-system conflict detection.

## Explicit boundaries

The current implementation does not provide:

- additional runnable profiles beyond AI Behavior Designer and the three WR-1 Writers' Room profiles, or multi-agent execution;
- independent agent memory or databases;
- deterministic gameplay simulation;
- gameplay-log or telemetry ingestion;
- image, animation, texture, or 3D generation;
- Blender or Unity production pipelines;
- autonomous canon, design, code, scene, or asset changes;
- automated subjective model-quality scoring;
- access to private dogfood-project files.

Human review remains required for durable knowledge, decisions, contracts, and production assets.
