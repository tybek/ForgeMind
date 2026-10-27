# Development Journal

This journal records ForgeMind's development progress, planning estimates, risks, and retrospective context. It is intended to help the project answer:

- what was completed, advanced, or blocked during a development day;
- how much of the technical foundation, hackathon MVP, and jury-ready submission appears complete;
- whether progress appears ahead of, on, or behind the current forecast;
- whether scope changed, what remains before submission, and what should happen next; and
- how many effective development days are currently estimated to remain.

All percentages and time ranges in this document are **subjective project-management estimates**. They are not test coverage, implementation metrics, objective measurements, commitments, or deadlines. Recalculate them from observed throughput as the project develops.

`ROADMAP.md` remains the source of truth for milestone order and status. This journal provides historical and progress-tracking context only. It must not silently redefine, complete, or reorder roadmap milestones.

## Day 1 — 2026-09-19

### Status snapshot

- **0A — Product Foundation:** complete.
- **0B — Desktop Shell:** complete.
- **0C — Project Model + Local Workspace:** complete.
- **0D — AI Provider + Evaluation Harness:** substantially implemented, but not closed. The provider parser and diagnostics have been improved offline after a live smoke returned no readable text; one explicitly authorized live-provider confirmation still remains before roadmap closure.
- Specialist game-development agents and possible production integrations are documented as future direction, not implemented product functionality.
- Devpost project-profile drafting has started.
- A Token Factory account and trial are available; Builder Program credits are not yet confirmed.
- Headless-first validation is established, with manual desktop interaction reserved for the user and milestone-closure checks.

The roadmap records 0D as **CURRENT / OPEN**. It must not be marked complete until the remaining live-provider exit criterion is confirmed. 0D.1 is **NEXT AFTER 0D** and has not begun.

### Completed or substantially completed

- Established the Intent ↔ Reality ↔ Alignment product model, MVP boundary, architecture, and scope controls.
- Built the Tauri desktop application with a React, TypeScript, and Vite frontend plus a Rust native layer.
- Added portable ForgeMind project identity and explicit local workspace initialization.
- Added frontend and Rust/native automated tests, production builds, and safe project-mutation checks.
- Added a replaceable AI-provider boundary, Nebius Token Factory integration, and an AI evaluation UI.
- Added local credential handling and an explicitly triggered headless AI smoke command.
- Replaced routine Windows GUI automation with a headless-first validation workflow.
- Documented specialist profiles and future production integrations without claiming implementation.
- Started the Devpost project profile.

### In progress

- Final 0D live-provider confirmation after the offline response-parser and diagnostic improvements.
- Devpost positioning and submission material.

### Blockers and unresolved items

- One additional, explicitly authorized live smoke is needed to confirm the corrected provider path end to end.
- Token Factory Builder Program credits are not yet confirmed.
- The required Intent ↔ Reality ↔ Alignment product capabilities remain unimplemented.

### Tests and validation

- Frontend tests: **23 passed**.
- Rust/native/provider tests: **24 passed**, using deterministic fixtures and temporary directories.
- Frontend production build: passed.
- Tauri native release build: passed, and the release executable was built successfully.
- `git diff --check`: passed.
- No additional live inference request was made after the parser fix.
- Selected project files and the sentinel mutation-safety checks remain preserved.
- Routine workspace and provider validation is headless; GUI automation is not part of the normal development loop.
- Known workspace loading can be validated headlessly, provider behavior can be tested offline, and an explicitly triggered headless live-provider smoke is available.
- Manual GUI testing is reserved for a short, user-driven, milestone-specific smoke. The native picker only needs manual retesting when it changed or when relevant to milestone closure.
- Approximate warm timings observed on Day 1:
  - frontend type-check and tests: about 7.9 seconds;
  - Rust/native tests: about 1.2 seconds; and
  - combined fast loop: about 9 seconds.

These timings are observations from the current environment, not permanent performance guarantees.

### Day 1 planning assessment

- **Technical/application foundation:** approximately **65–70% complete**.
- **Hackathon MVP as a whole:** approximately **30–35% complete**.
- **Polished jury-ready submission:** approximately **20–25% complete**.

These percentages are subjective planning estimates. They do not represent test coverage, lines of code, completed acceptance criteria, or another objective implementation measure.

The project appears **ahead of a conservative Day 1 foundation estimate**, but the main product differentiators have not been implemented. Overall delivery should not yet be described as nearly complete.

### Immediate product priority

The immediate priority is to make ForgeMind useful for real private-project work as quickly as possible. AI model evaluation should prefer sanitized game-development tasks that create useful project knowledge rather than artificial benchmark prompts. Useful future evaluation categories include enemy AI competence, NPC reactions, exploit discovery, encounter design, balance and progression review, item or content proposals, technical dependency analysis, cross-system conflict detection, and roadmap or milestone reasoning.

Private dogfood-project files must not be added to the public ForgeMind repository.

### Intended milestone sequence

The current planning sequence is:

1. Finish **0D — AI Provider + Evaluation Harness**.
2. **0D.1 — Model Registry + Usage Metering**.
3. **0E — AI Project Interview**.
4. **0F — Game Compendium + Decisions**.
5. **0G — Specialist Agent Profiles**, optional and non-gating for the hackathon MVP.
6. **0H — Git Integration**.
7. **0I — Unity GroundTruth**.
8. **0J — Alignment Engine**.
9. **0K — Feature Contract**.

0D.1 is represented in the roadmap as the next milestone after 0D. It has not begun, and this journal does not advance it.

The hackathon-critical differentiator remains **Intent ↔ Reality ↔ Alignment**. The target demonstration is:

```text
Project Intent
↓
Decision / Design
↓
Implementation Reality
↓
ForgeMind detects a mismatch
↓
AI explains the mismatch
↓
Feature Contract describes what needs to change
```

### Remaining-time scenarios

#### Minimum submit-ready

**Planning estimate: 10–12 effective development days remaining.**

Expected scope:

- working Nebius/NVIDIA integration;
- AI Project Interview;
- Compendium and Decisions;
- basic Reality evidence and one basic Alignment case;
- Feature Contract;
- public repository documentation;
- a working demo, Devpost submission, and demo video.

#### Competitive hackathon version

**Planning estimate: 16–20 effective development days remaining.**

Additional target quality:

- useful Unity GroundTruth;
- strong Intent / Reality / Alignment presentation;
- meaningful conflict detection;
- Model Lab or usage visibility;
- real-world dogfooding;
- at least one useful specialist profile, such as AI Behavior Designer; and
- a coherent UI and demo flow.

#### More polished version

**Planning estimate: 22–28 effective development days remaining.**

May additionally include:

- UX polish and richer onboarding;
- better model routing and richer specialist profiles;
- more complete Unity scanning;
- benchmark results;
- stronger media and screenshots;
- a public example project; and
- bug-fix and contingency buffer.

These scenarios are estimates, not hard deadlines. They should be recalculated from actual throughput, discovered complexity, and scope decisions.

### Reference working-day forecast

- **Day 2:** finish 0D; 0D.1 Model Registry + Usage Metering.
- **Days 3–4:** 0E AI Project Interview.
- **Days 5–7:** 0F Game Compendium + Decisions.
- **Day 8:** optional specialist-agent foundation or AI Behavior Designer prototype.
- **Days 9–10:** Git Integration.
- **Days 11–13:** Unity GroundTruth.
- **Days 14–16:** Alignment Engine.
- **Days 17–18:** Feature Contract.
- **Day 19:** real-project dogfooding.
- **Day 20:** bug fixing, UX, and scope cleanup.
- **Day 21:** demo scenario and screenshots.
- **Day 22:** video, Devpost, and README polish.
- **Day 23+:** contingency buffer and improvements.

This is a reference forecast, not a set of delivery commitments. Milestones may take more or fewer days, and the roadmap—not this forecast—defines their authoritative order and status.

### Tomorrow start condition

1. Explicitly authorize **one** corrected live Nebius smoke request.
2. Run the headless smoke through the corrected production provider path.
3. If it succeeds, perform one short user-driven manual GUI smoke if needed, mark 0D complete, and update the roadmap and journal.
4. If it fails, do not retry automatically; diagnose the safe diagnostics and keep 0D open.

Only after 0D closes should work begin on 0D.1 Model Registry + Usage Metering.

### Main risk: scope creep

The largest current project risk is **scope creep**. Tempting but non-critical work includes:

- full asset generation;
- autonomous multi-agent orchestration;
- cloud collaboration and real-time team synchronization;
- complete project or deep task management;
- automatic coding agents; and
- broad production integrations before the core Alignment workflow works.

These ideas remain secondary to delivering the hackathon core: Intent, Reality, explainable Alignment, and a grounded Feature Contract.

### Day 1 retrospective

#### What went well

- Foundation progress was unusually fast.
- Product positioning and the primary differentiator are clear.
- Strict scope boundaries were established early.
- Local architecture is portable, explicit, and cautious about mutation.
- Test automation was introduced early.
- Headless validation replaced slow and intrusive GUI automation.
- AI integration began early enough to expose real provider and protocol issues.

#### Friction and issues

- Windows-native TLS and certificate-chain behavior caused integration friction.
- The Nebius response parser required offline correction and still needs final live confirmation.
- Early GUI automation was inefficient.
- Builder Program credits are not confirmed.
- Broad product ideas continue to create scope pressure.

#### Current conclusion

ForgeMind appears ahead of a conservative Day 1 foundation estimate, but the core hackathon differentiators have not yet been implemented. The appropriate next step is the single authorized corrected live smoke needed to close 0D. After closure, development should use sanitized private-project work while advancing deliberately through the alignment-focused vertical slice without expanding scope.

## Day 2 — 2026-09-19

### Completed

- Ran exactly one authorized corrected live Nebius smoke through the production provider path. It succeeded without retry using `deepseek-ai/DeepSeek-V4.1-Flash` and returned the expected normalized text.
- Recorded 2,045 ms latency, 41 input tokens, 37 output tokens, 78 total tokens, finish reason `stop`, and safe provider request ID `75923186a61e8a750cbd1c16e8746177`.
- Closed **0D — AI Provider + Evaluation Harness**.
- Completed **0D.1 — Model Registry + Usage Metering** with a native authoritative registry, unknown/duplicate model protection, optional task categories, privacy-safe local JSONL records, explicit-price cost estimates, and session/project/model summaries.
- Updated the Model Lab to use registry-backed selection and show model metadata, pricing availability, and compact usage summaries.
- Consolidated desktop and headless evaluation onto the same registered-and-metered production service.

### Validation

- TypeScript check: passed.
- Frontend tests: **22 passed**.
- Rust/native tests: **36 passed** across library and smoke-argument suites.
- Frontend production build: passed.
- Tauri native release build: passed; `forgemind.exe` was built successfully.
- Exactly one live inference request was made for 0D closure. No live request was used for 0D.1 validation.

### Storage and privacy decision

Usage history is application-global and local, stored as append-only JSON Lines under ForgeMind's per-user application-data directory (`%LOCALAPPDATA%\ForgeMind\usage-v1.jsonl` on Windows). It is not stored in `.forgemind/project.json` and does not create or change game-project files. Records contain metadata needed for accounting but no prompt text, response text, API key, authorization header, or private project content.

Estimated cost is available only when explicit registry pricing and the necessary token counts exist. It is labeled estimated, is not provider billing, and remains unavailable for the currently configured model because no price was invented.

### Known limitations

- The registry is deliberately small and manually configured; provider discovery and automatic routing are not implemented.
- The local JSONL history has no retention, deletion, synchronization, or team-accounting workflow yet.
- Pricing is optional and currently unavailable for the configured model.
- Usage summaries are compact local aggregates, not a billing or analytics dashboard.
- AI Project Interview, RAG, agents, private-project import, and later product milestones remain unimplemented.

### Next milestone

**0E — AI Project Interview** is current and remains open pending user-driven live validation.

### 0E implementation checkpoint

- Added a bounded Project Interview page with deterministic start, eleven section labels, one explicit AI turn per submitted answer, compact rolling candidate context, cancellation without persistence, and registry-backed model selection.
- Added a centralized native interview prompt and strict structured turn parser. Candidate area, status, provenance, question transition, count, and length are validated; malformed or unknown output fails safely.
- Added Candidate Review with visible provenance/status plus edit, approve, and discard controls. Pending and discarded candidates are excluded by the native persistence layer.
- Added versioned `.forgemind/interview.json` persistence for approved candidates only. Existing output can be reopened and cannot be overwritten without an explicit replacement flow.
- Added `project_interview` usage categorization through the shared registered-and-metered provider path.
- Frontend tests: **40 passed**.
- Rust/native tests: **50 passed** across library and smoke-argument suites.
- Frontend production build: passed.
- Tauri native release build: passed; `forgemind.exe` was built successfully.
- No live AI request and no GUI automation were used for 0E implementation or automated validation.

The remaining 0E acceptance requirement is a short user-driven live interview smoke covering relevant follow-up, review, selective approval/discard, save, and reopen. 0F has not started.

The first manual interview turn returned `OUTPUT_TRUNCATED` because the 600-token completion allowance could be consumed by hidden reasoning before visible JSON. No automatic retry was made. The offline fix raises the bounded allowance to 1,200 tokens, keeps reasoning at `minimal`, limits each turn to zero through three candidates, and preserves strict structured validation. The user's answer remains in the UI after truncation so one deliberate retry can reuse it. 0E remains open pending that user-driven retry and the rest of the manual smoke.

### 0E closure and 0F implementation checkpoint

- User-driven 0E validation passed: approved interview knowledge persisted and reopened correctly, discarded knowledge stayed absent, AI Evaluation rendered, and workspace navigation remained usable.
- Closed **0E — AI Project Interview** and set **0F — Game Compendium + Decisions** current.
- Added versioned portable `.forgemind/compendium.json` with bounded sections, editable knowledge, status, provenance, source, timestamps, explicit interview import, and deterministic exact title-plus-statement duplicate protection.
- Added separate `.forgemind/decisions.json` with required rationale, local authorship, proposed/approved/deprecated/superseded status, related knowledge links, and one-predecessor history-preserving supersession.
- Added Game Compendium and Decisions interfaces inside the existing workspace shell. Knowledge promotion creates a proposed Decision and never approves it automatically.
- Added headless React and Rust coverage for CRUD, import, schema failures, portable data, approval, links, and supersession. No live AI call or GUI automation is part of 0F validation.
- TypeScript and frontend checks passed with **59 tests**; native validation passed with **71 tests**, including 21 focused 0F domain tests.
- Frontend production build and Tauri release-mode no-bundle build passed; `forgemind.exe` was produced successfully.

0F remains open pending the short user-driven create/import/promote/approve/supersede/restart persistence checklist. 0G has not started.

### 0F functional closure and 0F.1 UX polish

- User-driven 0F validation passed: interview import and duplicate protection, editing, manual creation, knowledge promotion, explicit approval, related knowledge, replacement/supersession, retained predecessor history, and persistence after restart all worked.
- Closed **0F — Game Compendium + Decisions**.
- Completed **0F.1 — Compendium & Decisions UX Density Polish** without changing either persistence schema or native domain behavior.
- Replaced tall Compendium cards with compact rows showing title, area, status, provenance, source, update time, a two-line statement preview, and compact actions. Entries expand in place for full text.
- Moved Compendium editing into the selected row. Save stays anchored to the item; Cancel restores its compact presentation; only one inline editor is active.
- Added visible semantic status treatments: Compendium `DIRECTION`, `LOCKED`, `TBD`, and `DEPRECATED`; Decision `PROPOSED`, `APPROVED`, `SUPERSEDED`, and `DEPRECATED`. Text labels remain visible and color is not the sole indicator.
- Frontend validation passed with **63 tests**. Native regression validation remained green with **71 tests**. Frontend production and Tauri no-bundle release builds passed.
- No dependency, AI behavior, live request, persistence format, GUI automation, or new product scope was introduced.

At this implementation checkpoint, **0G — Specialist Agent Profiles** remained open pending user-driven live validation.

### 0G AI Behavior Designer implementation checkpoint

- Added one reusable native specialist-profile abstraction and exactly one profile, `ai_behavior_designer`, with six bounded behavior-design task types.
- Added a compact structured workbench with registry-backed model selection, explicit Compendium and approved-Decision context selection, transient scenario input, and one user-triggered analysis action.
- Centralized the game-agnostic system prompt and selected-context builder in Rust. Only selected current knowledge and approved Decisions are sent; requests use `minimal` reasoning, a bounded 1,600-token completion allowance, and existing `ai_behavior` usage metering.
- Added strict bounded output validation for summary, assumptions, recommendations, risks, exploits, open questions, and suggested tests. Assumptions are visibly labeled as AI inference, not project facts.
- Specialist results remain transient proposals. Proposal persistence, additional profiles, retrieval, autonomous loops, simulation, and specialist-to-specialist interaction are deferred.
- Automated validation passed with **82 frontend tests** and **86 native tests** across library and smoke-argument suites. No live request or GUI automation was used.

At this checkpoint, 0G remained open only for one user-driven AI Behavior Designer live scenario. 0H had not started.

### 0F.1 manual validation and 0G closure

- User-driven 0F.1 UX validation passed. Compendium rows were compact, longer content expanded and collapsed conditionally, inline editing remained anchored to the selected entry, status visuals were clear, and persistence remained correct.
- User-driven 0G live validation passed with the `ai_behavior_designer` profile, `REACTION_MODEL` task, and registry model `deepseek-ai/DeepSeek-V4.1-Flash`.
- Selected context comprised Raid tone, Tactical decision emphasis, Risk-reward resource tension, Enemy difficulty philosophy, and the approved replacement Enemy difficulty philosophy Decision.
- The scenario described a regular guard hearing one gunshot from the east without visual confirmation while one allied guard was nearby.
- The result respected uncertainty, avoided omniscient player-location knowledge, separated assumptions from project facts, provided actionable and coordinated behavior recommendations, identified useful exploits, proposed deterministic tests, and respected the supplied difficulty philosophy.
- The first live specialist result was considered useful for real game-development work.
- Measured provider evidence: **16,846 ms latency**, **729 input tokens**, **1,443 output tokens**, and **2,172 total tokens**. Estimated cost displayed as **Unavailable**, correctly reflecting unavailable configured pricing.
- The output remained transient and did not become durable project truth.

**0G — Specialist Agent Profiles is complete. 0H has not started.**

### 0G.1 specialist output-budget reliability hotfix

- The first real post-validation `COMPETENCE_TIERS` use exposed the same shared reasoning/completion-budget failure mode previously seen in Project Interview: the 1,600-token allowance could be exhausted before readable structured output was returned.
- Raised only the AI Behavior Designer maximum completion allowance from **1,600** to **2,400** tokens.
- Preserved `minimal` reasoning, temperature `0.2`, the strict JSON-only schema, all existing list and text bounds, provider validation and safe truncation errors, explicit user-triggered execution, and no automatic retry.
- No specialist architecture, task vocabulary, context selection, persistence, provider, or usage-metering behavior changed.
- Offline validation passed: **82 frontend tests**, **86 native tests**, frontend production build, and `git diff --check`. No live inference or GUI automation was used.

**0G.1 is complete. 0H has not started.**

### 0G specialist structured-output reliability hardening

- A second real `COMPETENCE_TIERS` attempt returned readable text after the 0G.1 budget increase, but the original parser rejected it because it required direct canonical JSON with every list present and reported every parse/schema/bounds deviation as one generic error.
- Added deterministic extraction for exactly one JSON object from canonical JSON, whitespace, a JSON code fence, or brief wrapper text. Multiple objects, malformed or incomplete objects, prose-only output, and non-object JSON remain rejected.
- Missing optional list sections now normalize to `[]`. Only `open_questions` and `suggested_tests` are accepted as explicit aliases; canonical output remains camelCase, and unknown fields still fail.
- Strengthened the prompt with an exact compact empty-array example and explicit one-object, exact-name, no-markdown, no-commentary instructions.
- Added safe `INVALID_JSON` and `INVALID_SPECIALIST_SCHEMA` diagnostics for extraction state, missing fields, wrong types, unknown fields, list-bound failures, and finish reason. Raw responses, prompts, hidden reasoning, credentials, and authorization data are never included.
- Preserved the 2,400-token budget, `minimal` reasoning, temperature `0.2`, existing schema/list/text bounds, safe `OUTPUT_TRUNCATED` handling, explicit execution, and no automatic retry.

**0G.2 is complete. 0H has not started.**

### 0G.3 specialist production hardening

- Real production dogfooding produced a useful `COMPETENCE_TIERS` result with meaningful Regular/Veteran/Elite differentiation, imperfect-information and knowledge-confidence/age concepts, deterministic behavior, exploit analysis, and implementation-oriented tests. Measured evidence was **19,517 ms latency**, **746 input tokens**, **2,159 output tokens**, and **2,905 total tokens** using `deepseek-ai/DeepSeek-V4.1-Flash`.
- A later `REACTION_MODEL` run reached the former 2,400-token completion limit with finish reason `length`, readable text present, and no complete extractable JSON object. Safe `OUTPUT_TRUNCATED` behavior correctly refused partial output.
- Replaced the global specialist allowance with bounded task budgets: 3,000 for design/review/competence tiers, 3,400 for reaction models, 3,200 for exploit analysis, and 3,800 for behavior contracts. Preserved `minimal` reasoning, temperature `0.2`, strict bounded JSON, no retry, and accurate metering.
- Added concise-output instructions without expanding any result-list bounds.
- Refactored only the specialist screen into a responsive two-pane workbench with accessible activity/elapsed feedback, duplicate-execution prevention, preserved form state, and compact current/prior output access.
- Added deterministic task-specific Compendium/Decision Area guidance. Entries remain manually selectable, recommendations can be overridden, no-context runs remain valid, only approved Decisions are eligible, and only selected references appear in results.
- Added versioned `.forgemind/specialist-runs.json` history for normalized successes and safe failures. It stores explicit scenario/context IDs and usage when available, but never raw requests/responses, hidden reasoning, credentials, authorization data, or absolute workspace paths.
- History is explicitly a non-authoritative work artifact. It does not create Compendium knowledge, Decisions, Feature Contracts, or other Project truth.
- Automated validation remained fully offline and headless; no live inference, GUI automation, or Explorer automation was used.

**0G.3 is complete. 0G remains complete. 0H has not started.**

### 0G.4 Reaction Model reliability and context UX polish

- Continued production dogfooding showed that `REACTION_MODEL` could still reach `OUTPUT_TRUNCATED` at the 0G.3 3,400-token limit with `deepseek-ai/DeepSeek-V4.1-Flash`.
- Increased the centrally defined bounded budgets to 3,200 for design/review, 3,400 for competence tiers, 4,600 for reaction models, 3,800 for exploit analysis, and 5,200 for behavior contracts. No default-large budget or automatic retry was added.
- Strengthened shared concision rules to avoid repeated scenario/context prose and repeated recommendations across risk/exploit sections. Reaction Model now explicitly requests a compact deterministic state/rule model covering stimulus, uncertainty, escalation, investigation, information sharing, decay, tier differences, and deterministic tests rather than long narrative examples.
- Preserved the canonical seven-field JSON schema, current list-count bounds, temperature `0.2`, `minimal` reasoning, strict validation, and safe `OUTPUT_TRUNCATED` behavior. Failed attempts continue to remain visible in Analysis History.
- Refined Project Context so **More project context** is a stable heading and each existing Compendium Area is an individual disclosure with entry and selected counts. Groups are collapsed by default and remain open when they contain a selected entry; recommended entries remain editable and are not duplicated.
- Adjusted the desktop workbench from 42/58 to an explicit 40/60 configuration/result split while retaining narrow-window stacking.
- Automated validation remained offline and headless. No live AI, GUI automation, or Explorer automation was used.

**0G.4 is complete. 0G remains complete. 0H has not started.**

### 0G.5 Specialist workbench recovery hotfix

- Confirmed that the real pre-existing format-version `1` history contained one safe failed `REACTION_MODEL` run and otherwise valid project/task/model/context/usage data. It was rejected because `SpecialistDiagnostics` serialization omitted empty `missingFields`, `invalidFieldTypes`, and `unknownFields` arrays while deserialization incorrectly required them.
- Confirmed the UI regression was amplified by one startup `Promise.all`: the history rejection prevented valid SpecialistProfile and model-registry results from being committed, producing an empty task selector and **No configured models** even though both native sources remained healthy.
- Added lossless format-version `1` compatibility by defaulting omitted diagnostic lists to empty. No schema-version migration or best-effort repair was needed.
- Split profile, model registry, Compendium, approved Decisions, and history loading into independently scoped operations. Context failures now remain localized, and history failure affects only the History panel.
- Specialist execution no longer replaces a valid current result when history append fails. It returns a safe history warning; provider/schema failures remain unchanged and retain their original safe category.
- Added confirmed **Archive and reset history** recovery. It renames only `.forgemind/specialist-runs.json` to a timestamped invalid-history backup and writes an empty valid history. Project identity, interview, Compendium, and Decisions remain byte-for-byte unchanged in native coverage.
- Recovery returns only a safe backup filename and empty document; it never exposes archived contents, credentials, or absolute paths.
- Automated validation remained offline and headless. No live AI, GUI automation, Explorer automation, or 0H work was performed.

**0G.5 is complete. 0G remains complete. 0H has not started.**

### 0G.6 capability-aware specialist requests and adaptive run diagnostics

- Confirmed the immediate `INVALID_REQUEST` regression was local: ForgeMind's provider-neutral validator rejected the new 4,600-token `REACTION_MODEL` preference against a stale 4,096-token global ceiling before any Nebius request was sent. Consequently, there was no HTTP status or provider error payload for the observed run.
- Replaced that stale ceiling with an explicit 8,192-token ForgeMind safety bound and added optional model capability metadata. No verified DeepSeek maximum was available from the local failure, so its maximum remains Unknown; 4,096 was not recorded as a model limit.
- Specialist defaults now use `min(task preference, known model maximum)` only when the registry has an explicit maximum. Collapsed Advanced Run Settings expose one validated per-run token budget without adding general model tuning.
- Added safe budget-aware diagnostics and guidance for `INVALID_REQUEST` and `OUTPUT_TRUNCATED`. A suggested larger-budget retry appears only when a known maximum leaves headroom and always requires explicit user action.
- Added preferred/effective/known-maximum fields to format-version `1` Analysis History as optional additions. Existing history without them remains readable.
- Offline frontend/native tests cover capability resolution, request bounds, diagnostics safety, UI validation and guidance, explicit retry control, history display, and old-history compatibility. Final validation passed with **108 frontend tests**, **120 native library tests**, **2 native CLI tests**, the frontend production build, and the Tauri release compile with `--no-bundle`. No live inference or GUI automation was used.

**0G.6 is complete. 0G remains complete. 0H has not started.**

### 0H Git Reality Snapshot

- Added the first live Reality signal as a transient, read-only repository snapshot for the active initialized workspace.
- Kept the trust boundary native: React supplies only the workspace path to one typed command; Rust invokes the system Git executable with fixed inspection arguments and returns normalized status, HEAD, working-tree, tracked diff-stat, repository-relative file, and bounded commit evidence.
- Added explicit Git-unavailable, non-repository, and inspection-failure states that do not invalidate or block the rest of ForgeMind. Process output, repository roots, credentials, remote data, and absolute paths do not cross the boundary or persist.
- Added the Repository workspace page with refresh, compact summary cards, expandable changed-file metadata, and recent commits. Game Wiki shows only a small Technical/Production summary and does not treat repository evidence as project Intent.
- Preserved the milestone boundary: no source-diff viewer, persistence, commit, push, pull, fetch, merge, rebase, checkout, branch, stash, authentication, GitHub, PR, or generic shell capability was added.
- Offline automated validation passed with **133 frontend tests**, **129 native library tests**, **2 native CLI tests**, the frontend production build, and the Tauri release compile. No live AI, GUI automation, or Git network operation was used.
- The morning manual-validation backlog remains required for 0G.7, 0G.8, and 0H; automated completion does not close those pending user-driven checks.
- Local coding-agent credit snapshots were **316 before 0G.8**, **245 after 0G.8**, and **140 after 0H**. These are local workflow measurements only, not provider usage or billing records.

**0H is implemented with manual validation pending. 0I has not started.**

### 0G.9 Specialist + Wiki UX production polish

- Real manual dogfooding exposed a production-density issue rather than a reasoning defect: configuration, history, selected-run detail, copy feedback, and per-finding promotion competed for the same vertical feed.
- Reframed Analysis History as a compact inbox beside selected-run detail on wide desktops, while retaining responsive stacking and the existing non-authoritative history contract.
- Replaced inline per-finding promotion editors with explicit checkbox selection and one large multi-finding review flow. The existing native finding-membership, exact-duplicate, provenance/source, unchanged-history, and no-Decision guarantees remain unchanged.
- Added normalized-title potential-duplicate review without turning title equality into a new persistence rule. Users may cancel, edit the existing Compendium entry, or explicitly save a different statement anyway; exact title-plus-statement duplicates remain blocked.
- Improved Wiki scanning with separate type/state tags, local keyword search, a bounded type filter, compact metadata, and edit-at-source routing through the existing Compendium editor.
- Preserved the current Compendium Areas and deferred topic/tag hierarchy such as `Systems → Enemy AI`; no top-level AI Area, semantic search, RAG, or Wiki persistence was introduced.
- Automated coverage remains offline and headless: **145 frontend tests**, **129 native library tests**, **2 native CLI tests**, the frontend production build, and the Tauri release compile passed. A short user-driven visual smoke is still required for the wide/narrow layout, dialog density, local feedback placement, and source-edit transition.

**0G.9 is implemented with manual validation pending. 0H remains manual-validation pending. 0I has not started.**

### 0G.12 Specialist bounded-output normalization

- A user-authorized `nvidia/nemotron-3-super-120b-a12b` request succeeded through the NVIDIA provider and returned valid extracted JSON in `6454 ms` with `1096` input, `1045` output, and `2141` total tokens against a `5200` budget.
- The call was not a successful full Specialist run: it returned seven recommendations against ForgeMind's canonical maximum of five, so the prior all-or-nothing list validator produced `INVALID_SPECIALIST_SCHEMA`.
- Added model-neutral first-N normalization for otherwise valid overlong specialist arrays while preserving the existing schema, per-list maxima, item validation, ordering, failure behavior, and no-retry contract.
- Added safe per-field returned/retained notices to the current result and format-version `1` Analysis History. Comparison shows normalization independently per run; overflow text is neither exposed nor persisted.
- Nemotron pricing, maximum completion tokens, and structured-output support remain Unknown. No capability was inferred from this call, no additional live request was made, and 0I was not started.

**0G.12 is implemented with manual validation pending. 0I has not started.**

### 0G.13 Cross-model run feedback + finding selection polish

- Corrected the cross-model execution flow so a saved successful source run and its result remain visible until the explicitly requested comparison run completes.
- Added local target-model spinner and elapsed feedback, duplicate blocking, normal success refresh/comparison, and safe failure feedback that retains the source selection while refreshing History.
- Added finding-only **Deselect all** without changing Project Context or approved-Decision selections.
- Offline validation passed **75 focused Specialist tests**, **161 frontend tests**, **134 native library tests**, **2 native CLI tests**, the frontend production build, and the Tauri release compile. No live inference or GUI automation was used.

**0G.13 is complete. Existing manual-validation backlog remains unchanged. 0I has not started.**

### Post-MVP product direction record

- Recorded the agreed 1.0 loop: Intent -> Reality -> Alignment -> Feature Contract -> coding agent -> tests / Reality refresh -> Alignment review.
- Kept 0I current with manual validation pending, 0J Alignment next, and 0K Feature Contract after 0J; no implementation milestone was started by this documentation change.
- Established Game Wiki as the future human-facing aggregation surface, AI Studio as the future home for shared-Project-Brain specialists, and Feature Contracts as the preferred implementation handoff.
- Preserved explicit human approval, provenance, and evidence-versus-inference boundaries for new and existing projects, team evolution, Open Questions, priorities, technical knowledge, and local model recommendations.
- Reaffirmed the product boundary: no accounts, RBAC, cloud/realtime collaboration, Jira clone, chat/notification platform, autonomous coding, automatic task execution, or unapproved RAG/embeddings.

### 0J.2 Alignment evidence-selection hardening

- Real-project dogfooding exposed that the original flat Reality Evidence list made relevant Unity observations difficult to find among generic Git state and changed files.
- Grouped the existing Git and Unity evidence catalog, added local search and source filtering, made Assessment selected-only, and added a dedicated Selected Evidence section with Deselect all.
- Added deterministic, explainable Suggested evidence from selected Intent text without AI, automatic selection, RAG, embeddings, new GroundTruth, or source mutation. Systems Intent presents matching Unity evidence before Git repository-state evidence.
- 0J remains current, the existing 0J.1 manual-validation requirement remains open, and 0K has not started.

### 0J.3 Alignment Workbench UX and review-creation hardening

- Private-project dogfooding exposed both density problems and an apparent creation hang. The native create/persistence path and its focused tests were healthy; the blocking behavior was a frontend state-presentation defect where validation-disabled primary actions used a wait cursor, unmet requirements were not explained beside the action, and failures rendered only at the distant page top.
- Rebuilt the wide Alignment workflow as Intent, Reality discovery, and Review panes with a narrow-window stack. Search/source controls now precede suggestions and browse results; raw groups stay collapsed and do not render rows until opened; direct search results and selected evidence remain compact and independent.
- Replaced repetitive source prose with derived evidence names, type/source tags, concise observation details, compact provenance, and explicit presence-only limits without changing stored source summaries or evidence authority.
- Hardened creation with local validation, a synchronous duplicate guard, local progress and safe failure, preserved inputs after failure, and immediate current-review rendering after success. Native status rules, persistence, source immutability, review lifecycle, and the no-AI boundary are unchanged.
- Offline validation passed **14 focused Alignment frontend/boundary tests**, **182 frontend tests**, **150 native library tests**, **2 native CLI tests**, the frontend production build, and the Tauri release compile. No live inference or GUI automation was used.
- 0J remains current, the existing 0J.1 manual-validation requirement remains open, and 0K has not started.

## Day 4 — 2026-09-21

### End-of-day status

- The core technical foundation is largely established around the current Intent -> Reality -> Alignment -> Feature Contract -> Implementation Brief loop.
- 0J Alignment is complete. 0K is current; 0K.1 and 0K.2 are implemented, including explicit AI-assisted Feature Contract proposals and deterministic Implementation Brief preview/copy.
- The remaining immediate action is the bounded 0K.2 manual desktop, persistence, proposal-review, and clipboard validation in `VALIDATION.md`. 0K must not be marked complete before that PASS.
- Nebius Token Factory remains the replaceable production provider boundary. DeepSeek and NVIDIA Nemotron have both been used through explicit requests; the available local sample is insufficient for a universal model recommendation.
- UI/brand direction and Studios S0-S9 are documented as planned work. UI-1 through UI-5 and every Studio phase remain not started, and no 0L implementation has started.
- No future phase was started by the Day 4 documentation and planning work.

## Day 5 — 2026-09-22

### 0K closure and UI-1 brand/design-system foundation

- Final user-driven 0K.3 validation passed approved Alignment source trace, explicit AI Draft and running state, per-section Apply, Apply All, optional-field approval, Implementation Brief preview/copy, lifecycle protection, Game Wiki round-trip, and restart persistence. **0K Feature Contracts is complete.**
- Retained one non-blocking safety observation: provider proposals may be rejected by the existing safety, path, or size validation. Future UX may expose an allowlisted rejection category more clearly, but UI-1 did not weaken the rules or expose raw provider content.
- Implemented UI-1 semantic color, typography, spacing/layout, surface, card, button, status/badge, focus, loading/feedback, empty-state, and responsive tokens/primitives. A single dependency-free line-icon convention now covers shell navigation and representative refresh/copy actions.
- Polished the application shell, project identity, selected navigation, page headers, background/separators, responsive navigation reflow, and representative Feature Contract/Repository/Unity/Specialist surfaces without changing routes, persistence, provider calls, source authority, or lifecycle behavior.
- The available PNGs remain visual references only. UI-1 uses a simple temporary text FM/ForgeMind treatment; original production-ready SVG app icon, wordmark, and descriptor lockups remain outstanding.
- Offline validation passed **123 focused frontend tests**, **211 full frontend tests**, **158 native library tests**, **2 native CLI tests**, the frontend production build, the Tauri no-bundle release build, and `git diff --check`. No live inference or GUI automation was used.

**UI-1 is current and implemented with manual visual validation pending. UI-2 has not started. No Studios, Rebaseline, CR, SEC, or 0L implementation started.**

## Day 6 - 2026-09-26

### Hackathon submission readiness

- Completed **SUB-0** as a documentation-only delivery track covering the current official submission gates, required Nebius/NVIDIA feedback, reusable run evidence, intentional credit use, public-repository and secret safety, a three-minute video strategy, submission-copy placeholders, and final QA.
- Grounded current feedback in existing Token Factory, DeepSeek, and NVIDIA Nemotron evidence while keeping missing metrics explicit and rejecting any universal model-winner claim.
- Added submission discovery through the Roadmap, Coding Context Map, Validation policy, and public README; corrected the README's milestone snapshot to reflect completed 0K and UI-1 work.
- No application behavior changed, no provider credential was accessed, no live inference or GUI automation ran, and no new product milestone started. SUB-1 through SUB-5 and the final submission remain incomplete.

### UI-2 Workspace Home implementation

- Replaced the no-project utility card with a compact branded Workspace Home containing a restrained welcome hero, clear Start/Open actions, Recent Projects, and an honest Recommended Next Steps preview.
- Reused the existing directory picker, native workspace inspection, explicit uninitialized-directory confirmation, and normal workspace shell. Start New Project selects a folder but does not initialize it without the existing explicit confirmation.
- Added a bounded application-local recent-project registry outside project `.forgemind` truth. It stores only path, project ID, name, and last-opened timestamp; deduplicates, caps at six, renders the three most recent, recovers from malformed data, and removes an inaccessible recent path safely.
- Used neutral CSS grid/cube fallback artwork and the frozen ForgeMind lockup without generated game art or logo-geometry changes. The no-project recommendation surface does not fabricate tasks or invoke AI.
- Focused App/design-system/registry coverage passed **31 tests**; the full frontend check passed **219 tests**; the frontend production build and Tauri no-bundle release build passed. No live AI or GUI automation ran.
- The user-driven UI-2 manual pass confirmed the default, fullscreen, and minimum-size Home layouts, existing project flows, Recent Projects ordering/persistence, truthful fallback artwork, honest recommendation preview, and long-name/path handling.
- Added a small shell-navigation follow-up: an explicit line-icon **Home** action above project context returns to Workspace Home without a picker, initialization, or project-data mutation. The current project stays in Recent Projects and reopens through normal inspection; project **Overview** remains separate. **Open another project** remains as a useful direct directory-picker shortcut, and the brand lockup remains non-interactive.
- Follow-up validation passed **32 focused tests**, **220 full frontend tests**, the frontend production build, and `git diff --check`. No native contract, recent-project format, live AI, GUI automation, New Project Creator, or recommendation engine work was introduced.

**UI-2 is complete. The Home-navigation follow-up is headless-validated with its short user-driven sidebar round-trip checklist pending. NPC-1 through NPC-3, NEXT-1 through NEXT-3, UI-3, Studios, Rebaseline, CR, SEC, and 0L remain unstarted.**

### NPC-1 New Project Creator Foundation

- Replaced **Start New Project** directory-first behavior with an eight-step manual Creator covering Identity, Pitch, Player Experience, Core Loop, World / Tone, Design Pillars, Practical Constraints, and editable **Your Game Foundation** review. **Open Existing Project** remains unchanged.
- Kept Creator answers as in-memory application draft state until reviewed creation. Back/Continue and review editing preserve answers; cancellation creates nothing; directory selection occurs only from Review; and initialization failures preserve the draft for retry.
- Extended the existing typed workspace initialization boundary with an optional `ProjectFoundationInput`. Native validation uses the working title for Project identity and maps user-authored foundation knowledge into the existing format-version `1` Compendium with `new_project_creator` source. Deterministic gaps use `TBD` / `UNRESOLVED`; no Decision, `creator.json`, or `wiki.json` is created.
- Added defensive initialization behavior for existing ForgeMind workspaces, orphaned Compendium data, invalid foundation input, and rollback of only newly created ForgeMind metadata when the foundation write fails.
- NPC-1 makes no live AI/provider call and does not implement proposals, regeneration, Recommended Next Steps, Studios, Rebaseline, CR, SEC, UI-3, or 0L.
- Validation passed **31 focused Creator/App tests**, **9 focused native workspace tests**, **227 full frontend tests**, **161 native library tests**, **2 native CLI tests**, the frontend production build, the Tauri no-bundle release build, and `git diff --check`. `cargo fmt --check` remains unavailable because `cargo-fmt` is not installed. No live AI or GUI automation ran.

The user-driven NPC-1 manual PASS was recorded on 2026-09-27. It confirmed Creator-before-picker behavior, required Working Title and meaningful Pitch validation, Back/Next draft preservation, editable Review, explicit initialization, correct project identity, Creator foundation Compendium entries, Recent Projects/reopen behavior, and the accepted Creator layout. Two non-blocking beginner-copy findings for Design Pillars and Major Constraints were carried into the separately authorized NPC-2 scope.

**NPC-1 is complete after headless validation and manual visual/persistence PASS. At this closure point, NPC-2 had not yet been implemented.**

### NPC-2 AI-assisted New Project Creator

- Added explicit **Suggest Core Loops** and **Suggest Pillars** actions to the existing Creator. Step entry, navigation, Review, directory selection, and initialization remain request-free; regeneration is always a new user-triggered request.
- Reused the native Nebius Token Factory adapter, authoritative model registry, safe provider errors, and application-local usage log. The deterministic Creator default resolves to the registered `nvidia/nemotron-3-super-120b-a12b`; no model picker, second provider architecture, automatic router, cross-model competition, or retry was added.
- Added strict typed 2-3 Core Loop and 3-6 Design Pillar schemas over a bounded projection of visible Creator fields. Malformed, empty, duplicate, credential-marker-bearing, or truncated results fail without partial application. Raw provider output and hidden reasoning never reach normal UI or project persistence.
- Kept proposals transient and visibly AI-generated. Existing Core Loop text requires explicit replacement confirmation; pillar acceptance is additive, exact-title duplicate-safe, and capped by the existing six-pillar limit. Regeneration and discard preserve accepted and manual content, and all accepted content remains editable through **Your Game Foundation**.
- Added compact accepted-origin provenance. Explicit initialization maps accepted AI-assisted Core Loop and pillars to existing `AI_INFERRED` / `new_project_creator` Compendium entries; user-authored content remains `USER_STATED`. No Decision is created, and no provider call occurs during initialization.
- Extended application-local usage evidence with stable `new_project_core_loop` and `new_project_design_pillars` categories plus optional structured-output success. Provider/model, latency, and available token counts are visible in the result. Apply/discard outcomes remain manual SUB-1 observations because the pre-project append-only usage log has no durable updateable run identity.
- Applied the two NPC-1 manual-follow-up copy fixes: beginner-facing Design Pillar meaning/examples and concise Major Constraints examples. Pitch refinement was deliberately deferred.
- Focused validation passed **38 Creator/App frontend tests** and **11 native Creator/provenance/usage tests**. Full validation passed **234 frontend tests**, **169 native library tests**, **2 native CLI tests**, the frontend production build, the Tauri no-bundle release build, changed-document local-link validation, and `git diff --check`. `cargo fmt --check` remains unavailable because `cargo-fmt` is not installed. No live provider request or GUI automation ran; the low-cost 2-4 request manual live-AI checklist remains pending.

**NPC-2 is implemented and headless-validated. Manual live-AI validation remains pending; Recommended Next Steps, Studios, and the general AI Router were not started.**

### NPC-2.1 Creator AI UX, Grounding & Evidence Polish

- Recorded three user-observed Nemotron Creator runs as raw SUB-1 evidence. Core Loop returned three valid proposals at `2,500 ms / 388 / 262 / 650` input-output-total tokens; explicit regeneration returned two at `2,037 ms / 417 / 295 / 712`; Design Pillars returned five at `3,314 ms / 428 / 304 / 732`. Apply/edit, regenerate preservation/discard, individual Accept, Apply All, and manual-pillar preservation worked. No acceptance percentage, universal score, reliability rate, or model winner was inferred.
- Added one compact local preflight before every Suggest or Regenerate request. It resolves enabled Token Factory models from the existing registry, keeps Nemotron as the Creator default, displays human-readable context groups, a deterministic approximate input range, a restrained `LOW` / `MEDIUM` / `HIGH` request-size band, and honest task/model local latency. Unknown registry pricing remains **Exact estimate unavailable**; no guessed dollars, pricing fetch, automatic comparison, retry, or Router was added.
- Added a bounded ten-run Creator-session history over normalized transient proposal payloads and safe failure categories. It tracks local proposal/applied/partially-applied/discarded/regenerated outcomes and supports view/restore without applying content or writing project truth. The existing append-only usage log remains canonical for provider metrics; no pre-project run-ID migration or cross-session history was introduced.
- Extended Core Loop and Design Pillar schemas with optional zero-to-three concise assumptions. Native prompts require unestablished mechanics to be labeled, strict parsing rejects malformed or oversized assumption payloads, and the UI renders assumptions separately. Apply copies only proposal content; assumptions do not become Compendium knowledge, Decisions, or Open Questions automatically.
- Widened responsive Creator fields and proposal regions without changing the `1180x760` Tauri default. Manual pillar rows align title/explanation/provenance/Remove, Design Pillar proposals use one/two/three columns by available width, and World & Tone plus Constraints gained persistent examples and appropriately compact controls. World AI and Recommended Next Steps remain deferred.
- Focused validation passed **17 Creator frontend tests** and **9 native Creator/preflight/schema tests**. No live provider request or GUI automation was made during implementation; final full-suite/build validation is recorded in [Validation](VALIDATION.md).

**NPC-2.1 is implemented and headless-validated. Manual verification of the preflight, history drawer, assumptions, and responsive desktop layouts remains pending, so NPC-2 is not marked manually complete. Recommended Next Steps, Studios, the general Router, shared Security Preflight, and World AI were not started.**

### NPC-2.2 Creator grounding + form alignment patch

- Recorded a fourth user-observed Nemotron `NEW_PROJECT_CORE_LOOP` run at `2,900 ms / 434 / 425 / 859` input-output-total tokens. Structured output passed and three useful proposals rendered, but several unestablished mechanics appeared without assumption labels. This remains task-specific evidence, not a reliability percentage or universal model score.
- Strengthened both existing Creator system prompts with an explicit per-proposal grounding pass over mechanics, resources, systems, character roles, and rules. Unestablished specifics must be generalized or surfaced in the existing optional zero-to-three assumptions; no self-critique, retry, second provider request, or automatic rejection was added.
- Fixed the Identity grid stretch that made Working Title visually taller by giving every single-line Creator input one fixed height and top-aligned field content. Working Title, Genre/Subgenre, Mode, Perspective, and Target Platform retain their existing values and semantics.
- Top-aligned Pillar title/explanation fields, kept title single-line and explanation multiline, preserved the secondary accepted-AI badge, aligned Remove with the control row, and retained narrow stacking.
- The broader NPC-2.1 manual interaction checklist passed. Focused validation passed **18 Creator frontend tests** and **10 native Creator tests**; full validation passed **241 frontend tests**, **173 native library tests**, **2 native CLI tests**, the frontend production build, and the Tauri no-bundle release build. NPC-2 remains open pending only the focused NPC-2.2 grounding and form-alignment recheck; no live request or GUI automation was used for this patch.

**NPC-2.2 is implemented and headless-validated. NPC-2 manual PASS is not yet recorded.**

### NPC-2.2 Creator structured-output resilience follow-up

- Recorded the final user-visible `NEW_PROJECT_CORE_LOOP` check as a structured-output failure through Nebius Token Factory and `nvidia/nemotron-3-super-120b-a12b`. The most recent matching application-local usage record captured `2,853 ms / 491 / 407 / 898` latency/input/output/total tokens, provider success, and structured-output failure. Invalid output was rejected, no proposal was applied, the Creator draft stayed intact, and manual work remained available. The same session contains one immediately preceding usage-only structured failure at `2,727 ms / 491 / 384 / 875`; raw response text was intentionally not persisted, so its human context and the exact field-level mismatch are not claimed.
- Confirmed the root-cause category as provider success followed by strict Creator schema rejection. The exact structural mismatch is unavailable because ForgeMind correctly stores usage metadata rather than raw prompts or provider bodies. This is retained as SUB-1 failure evidence rather than hidden or converted into a retry loop.
- Reused the existing Specialist single-object extractor through a shared native helper. Exact objects remain preferred; one clearly bounded object may be extracted from a code fence or short wrapper; zero, multiple, unbalanced, non-object, malformed, unknown, or reasoning-bearing structures remain invalid.
- Kept the semantic contract strict while normalizing only harmless optional variants: `summary` aliases the existing optional `note`, and omitted, empty, or `null` assumptions become `[]`. Assumption objects, non-string members, more than three assumptions, missing title/description, and invalid proposal counts are rejected.
- Made the one-object/no-Markdown/no-surrounding-prose contract, proposal counts, optional assumptions, empty-array convention, and no nested reasoning objects explicit in both Creator prompts without removing the NPC-2.2 grounding pass. Invalid-output UX now states that validation failed and the draft was not changed while retaining `INVALID_CREATOR_AI_OUTPUT` as secondary detail. Failed session-history entries keep task/provider/model/status/error only and no proposal payload; failed-response usage metadata remains in the application-local log.
- Focused validation passed **19 Creator frontend tests** and **12 native Creator tests**. Full validation passed **242 frontend tests**, **175 native library tests**, **2 native CLI tests**, the production frontend build, and the Tauri no-bundle release build. `cargo fmt --check` remains unavailable because `cargo-fmt` is not installed for the active toolchain.

**The robustness fix is implemented and headless-validated. A user-authorized live recheck remains required before NPC-2 manual PASS; no live AI request or Recommended Next Steps work was performed by this change.**

### NPC-2 manual closure

- Completed the focused NPC-2.2 Identity and Pillar form-alignment checklist and recorded the user-driven manual PASS.
- Ran one explicit, public-safe `NEW_PROJECT_CORE_LOOP` recheck through Nebius Token Factory and `nvidia/nemotron-3-super-120b-a12b`: `3,348 ms / 533 / 371 / 904` latency/input/output/total tokens, structured result PASS, two proposals.
- Confirmed the grounding/normalization recheck succeeded: unsupported or new mechanics were surfaced separately as assumptions, and no invalid structured-output error occurred.
- Kept this as raw task-specific evidence. No acceptance percentage, reliability rate, universal model score, or winner is derived from the small sample.

**NPC-2 is complete after headless validation and the final manual live-AI PASS. Recommended Next Steps, the general Router, Studios, CR, SEC, Rebaseline, and 0L were not started by this closure.**

### NEXT-1 deterministic Recommended Next Steps

- Added one typed, pure frontend recommendation engine over existing Compendium, Decision, Repository Reality, Unity GroundTruth, Alignment, and Feature Contract contracts. Stable rules carry human-readable reasons, existing navigation targets, structured source facts, priority, and optional bounded effort; results are fixed-order and capped at five.
- Replaced Home's static preview with up to three compact project-aware cards. Home retains the current loaded project, recommendation actions open existing workspace areas, and opening a different project recomputes the list rather than carrying cards across projects.
- Kept recommendations derived and non-authoritative: there is no recommendation file, task store, approval, source mutation, provider call, auto-refresh, automatic action, score, or invented time-based stale threshold. Repository and Unity inputs come only from explicit inspections captured for the current application session.
- Implemented supported rules for missing Vision/Core Loop/Player Experience/Pillars, proposed Decisions, unresolved Compendium Open Questions, initial/unavailable Reality inspection, detected Unity without a valid manifest, actionable non-rejected Alignment states, and draft Feature Contracts. Deferred approved-Intent-to-Reality matching because current data has no safe general relation, and avoided a duplicate sparse-project heuristic because concrete Foundation/Reality rules already explain those gaps.
- Focused validation passed **55 tests**. Full validation passed **260 frontend tests**, the production frontend build, and the Tauri no-bundle release build. No native boundary changed and no live AI or GUI automation was used.

**NEXT-1 implementation is complete and headless-validated. Its short manual Home visual/navigation checklist remains pending; NEXT-2 AI refinement was not started.**

### NEXT-1.1 Recommendation Actionability + Reality Connection UX

- Recorded the manual NEXT-1 findings: recommendations changed correctly by project state and Foundation guidance appeared for Signal Harvest, but Design Pillars lacked an obvious existing-project destination; completed non-repository/non-Unity inspections removed guidance without providing a connection action; and Unity's empty state gave evidence-type legend cards more visual weight than actual connection status.
- Replaced separate Vision/Core Loop/Foundation cards with one deterministic **Complete Game Foundation** recommendation. Its reason lists the actual missing fields and its source signals retain each gap, preserving explainability while freeing bounded Home slots.
- Confirmed the data decision: Creator Design Pillars already persist as `game_vision` Compendium entries titled `Design pillar: <name>`. Game Design now projects those same records in a first-class section with manual add, edit, and deprecate actions. No schema, migration, or second truth store was added.
- Added project-scoped machine-local Repository and Unity connection settings plus explicit native folder-picker actions. Inspection falls back to the ForgeMind workspace root when no detached source is configured; Change/Disconnect updates only local configuration. Missing configured paths fail safely, and Git/Unity inspection remains read-only.
- Added explicit connection semantics to recommendations: uninspected remains **Inspect**, inspected/disconnected becomes **Connect**, and successful detection removes the connection recommendation. Valid Unity evidence with coverage issues yields a refresh/complete-evidence action. Ordering and five-item engine/three-item Home bounds remain deterministic.
- Simplified Unity hierarchy around Connection, Unity version, GroundTruth manifest, and Coverage; moved provenance definitions behind **About evidence types**; compacted workspace/manifest absence; and reserved red for invalid/failed states. Repository Reality gained the same connection/select/change/refresh/disconnect mental model without a broader redesign.
- Documented that future UI-3 may reuse Recommended Next Steps in Project Overview while Home keeps quick top-three guidance. Also recorded planned AIW-0, WR-1, CHR-1, and CHR-2 boundaries without starting them.
- Focused validation passed **82 frontend tests** plus **4 native connection tests**. Full validation passed **273 frontend tests**, **179 native library tests**, **2 native CLI tests**, the production frontend build, and the Tauri no-bundle release build. No provider request, GUI automation, Git write, Unity write, recommendation persistence, scoring system, broad dismissal system, Writers' Room, Chronicler, or UI-3 implementation was introduced.

**NEXT-1.1 is implemented and headless-validated. NEXT-1 manual PASS remains open until the user rechecks the new Foundation, pillar, detached-connection, Git, and Unity flows.**

### NEXT-1.2 Detached Unity GroundTruth semantics

- Confirmed the path-resolution defect: `inspect_unity_groundtruth` resolved the detached Unity folder and then used that same root for both portable Unity inspection and `.forgemind/unity-groundtruth.json`. A valid foreign manifest was therefore validated against the active project ID and surfaced as invalid. Alignment also resolved Unity evidence from the detached root.
- Split the evidence roots at the native boundary. Canonical Unity directories and `ProjectVersion.txt` follow the explicitly connected source; project-owned GroundTruth and Unity Alignment evidence remain anchored to the active ForgeMind workspace and project ID. A detached Reality source is not equivalent to project-owned ForgeMind evidence.
- Added the neutral **Not attached** / **Portable inspection only** state. A foreign manifest may explain that GroundTruth exists in the connected source, but it is never parsed as active-project evidence, imported, copied, or allowed to cross into Alignment. Valid active-project GroundTruth still loads, and the owning project retains its path.
- Refined deterministic recommendation copy: disconnected remains **Connect Unity Project**; connected portable-only evidence becomes **Complete Unity GroundTruth**; valid coverage issues become **Review Partial Unity Evidence**; complete valid evidence produces no Unity recommendation. **Refresh Evidence** now explicitly means read-only re-inspection and cannot imply exporter generation or coverage repair.
- Focused validation passed **60 frontend tests** and **11 native GroundTruth tests**. Full validation passed **278 frontend tests**, **181 native library tests**, **2 native CLI tests**, the production frontend build, and the Tauri no-bundle release build. No GUI automation, provider request, Unity process/exporter action, manifest import, or source mutation occurred.

**NEXT-1.2 is implemented and headless-validated. NEXT-1 Manual PASS remains open for the focused detached-source, recommendation wording, Refresh, owning-project regression, and responsive visual recheck. NEXT-2 and adjacent milestones were not started.**

### NEXT-1 manual closure and AIW-0 Shared AI Workspace Foundation

- Recorded the user-driven NEXT-1 Manual PASS on 2026-09-28 for the full updated checklist: grouped Foundation guidance, Compendium-backed pillar persistence, detached Git/Unity connections, foreign-manifest isolation, correct Unity recommendation states, read-only Refresh semantics, owning-project regression, project-switch isolation, responsive layouts, and the calm no-issue state.
- Inspected the provider, model registry, usage metering, structured-output helpers, Specialist profiles/history, Creator AI, Feature Contract AI, Compendium, Decisions, Open Questions, Game Wiki aggregation, source/provenance types, workspace validation, and local persistence conventions before selecting the AIW-0 boundary.
- Reused the existing AI Behavior Designer identity/description in generalized AI Workspace profile metadata; existing provider/model/usage boundaries remain canonical. Usage is referenced by application session and timestamp rather than duplicated in project history. Creator AI, Feature Contract AI, and current Specialist execution/history were intentionally not migrated.
- Added format-version `1` `.forgemind/ai-workspace-sessions.json` for bounded non-authoritative work history: stable project/session/message/proposal identity, active/archive lifecycle, visible multi-turn content, compact source trace, explicit recovery, and no raw provider payloads, hidden reasoning, credentials, or absolute workspace paths.
- Added deterministic Context Plan construction for explicit/supporting current Compendium knowledge, approved Decisions, Compendium-backed Open Questions, explicitly named project-relative Markdown, and same-project prior assistant messages. Markdown remains `DOCUMENTED`; prior AI remains `AI_GENERATED`; source IDs, labels, authority, and navigation metadata survive result construction.
- Added reusable proposal envelopes and Chronicler-ready current/proposed edit state. Review distinguishes pending, accepted, applied, rejected, and discarded. No AI Workspace command writes Compendium, Decisions, Wiki, Git, Unity, or any other owning domain.
- Focused validation passed **9 native AI Workspace tests** and **1 frontend boundary test**. Full validation passed **279 frontend tests**, **190 native library tests**, **2 native CLI tests**, the production frontend build, the Tauri no-bundle release build, changed-document link validation, and `git diff --check`. `cargo fmt --check` remained unavailable because `cargo-fmt` is not installed. No live AI request or GUI automation occurred.

**AIW-0 is complete and ready as infrastructure for a separately authorized WR-1 implementation. Writers' Room, Chronicler Read/Edit, the general Router, provider prompt execution for the new profiles, semantic/vector search, and automatic project-truth mutation were not implemented.**

### WR-1 Writers' Room MVP

- Reused AIW-0 sessions, project isolation, Context Plans, source trace, proposal envelopes, review state, recovery, and canonical usage references. Creator AI, Feature Contract AI, and AI Behavior Designer execution were left unchanged.
- Added the **AI Studio -> Writers' Room** workbench with session creation/history/archive, Lore Architect, Character & Dialogue, and Continuity Editor profiles, multi-turn conversation, prompt starters, source/proposal cards, a collapsible Context/Sources drawer, and responsive two-pane/stacked layouts.
- Added the smallest narrative provider boundary over the existing registry and Nebius Token Factory adapter: the registered NVIDIA Nemotron model is the profile default, other enabled registry models remain explicit choices, every Send/Regenerate requires credit-aware preflight, and one confirmation makes one request with no automatic retry or comparison.
- Added deterministic bounded context from relevant Compendium entries, approved Decisions, Open Questions, up to five project-contained Markdown files, and at most twelve recent same-project messages. Markdown is `DOCUMENTED`; Git Reality, Unity GroundTruth, Feature Contracts, arbitrary filesystem crawling, semantic search, and cross-project data are excluded.
- Added strict conversational structured output with useful message, zero-to-three questions, supplied-only source IDs, and optional Add Project Knowledge, Create Decision, or Create Open Question proposals. Invalid output or invented source IDs fails before session persistence.
- Kept every conversation and proposal non-authoritative. Review changes proposal state only; explicit Apply delegates to Compendium or Decisions. Project Knowledge records `AI_INFERRED` / `writers_room`, Open Questions retain unresolved semantics, and Decisions remain `PROPOSED` rather than auto-approved.
- Added mocked frontend execution coverage and native fixtures. Validation passed **36 focused frontend tests**, **12 focused AI Workspace native tests**, **6 focused Writers' Room native tests**, **285 full frontend tests**, **199 native library tests**, **2 native CLI tests**, the production frontend build, Tauri no-bundle release build, changed-document link validation, and `git diff --check`. `cargo fmt --check` remained unavailable because `cargo-fmt.exe` is not installed. No live provider request or GUI automation was used. Manual wide/fullscreen/constrained layout and persistence validation plus the optional user-authorized low-cost live-AI checklist remain pending.

**WR-1 is implemented and headless validated at the automated boundary. Chronicler, Narrative Designer, update-existing-knowledge diff/apply, formal Canon terminology, a general Router, semantic memory, collaboration, and background agents were not implemented.**

### WR-1.1 Writers' Room session reliability follow-up

- Recorded the first real WR-1 manual blockers: a blank/gray workbench immediately after creating a session and the same blank/gray surface when entering Writers' Room after restarting with persisted session history.
- Inspected the real `.forgemind/ai-workspace-sessions.json` structurally and confirmed it was a valid format-version `1` active Lore Architect session. Native serialization had correctly omitted empty `sourceTrace` and `proposals`; the React type/render contract incorrectly assumed both arrays always existed and threw at `proposals.length`. The same returned shape explained create and restart failures.
- Added runtime normalization to every AI Workspace document crossing into React. Valid omitted optional arrays become empty arrays; malformed non-authoritative sessions/messages/proposals/source records are isolated with a concise warning; and a safely formed unknown persisted profile remains readable and archivable but cannot run.
- Added deterministic newest-active restore and stale-selection fallback, explicit loading/no-session/valid/recoverable-error states, local create failure feedback with preserved inputs, and immediate returned-session activation without reload or timeout workarounds.
- Removed the duplicate center **New Session** action, expanded the guidance-only empty state, aligned profile starters with the WR-1 contract, and fixed the dialog/background bleed by replacing undefined Writers' Room surface/shadow tokens with existing opaque design-system tokens plus a stronger scrim and stacking.
- Focused validation passed **13 frontend tests** and **14 AI Workspace native tests**. Full validation passed **292 frontend tests**, **201 native library tests**, **2 native CLI tests**, the production frontend build, and the Tauri no-bundle release build. No live provider request or GUI automation occurred; the existing Windows import-library linker warning remained informational.

**WR-1.1 is implemented and headless validated. WR-1 Manual PASS remains pending on the bounded create/restart/responsive desktop recheck. CHR-1 and the general Router were not started.**

### WR-1.2 Writers' Room live response reliability and session lifecycle

- Recorded one real Lore Architect run through Nebius Token Factory and `nvidia/nemotron-3-super-120b-a12b`: provider execution and persistence succeeded in `1,795 ms` with `447` input, `189` output, and `636` total tokens. The concise collaborative response asked three focused questions and remained non-authoritative, but the immediate workbench blanked; restart/reload rendered the persisted response.
- Traced the remaining blank screen to a specific path mismatch. `run_writers_room` returned fresh serde output directly, omitting empty `proposals` and `sourceTrace`, while reload used the shared AI Workspace normalizer. React then threw at `selectedSession.proposals.length`. Live run results now cross the same normalizer as every other session-document mutation, with saved-session reload recovery and no automatic provider retry.
- Bounded the Writers' Room surface to available workspace height. The session rail and conversation now scroll independently, the composer remains intrinsic, and new messages follow the bottom only while the user has not intentionally scrolled away.
- Added reversible native Reopen and confirmed native Delete. Delete enforces Project identity, persists through the AI Workspace owner, falls back to the newest active session or empty state, and removes only non-authoritative work history. Previously applied Compendium, Decision, and Open Question artifacts remain in their owning domains.
- Added regression coverage for the exact raw live shape, immediate render, restart-equivalent render, provider/render failure safety, bounded rail semantics, reversible Archive, confirmation/Escape/delete fallback, cross-project rejection, persistence, unknown IDs, and applied-truth survival. No live AI call or GUI automation occurred during implementation.
- Focused validation passed **21 frontend tests** and **17 native AI Workspace tests**. Full validation passed **299 frontend tests**, **204 native library tests**, **2 native CLI tests**, the production frontend build, and the Tauri no-bundle release build. `cargo fmt --check` remained unavailable because `cargo-fmt.exe` is not installed; the existing Windows import-library linker warning remained informational.

**WR-1.2 is implemented and headless validated. WR-1 Manual PASS remains pending on the post-fix desktop/restart/responsive/lifecycle recheck. CHR-1 and the general Router were not started.**

### UI-3 Project Overview Dashboard

- Replaced the technical metadata Overview with a current-project control room: concise project identity, up to five project-aware actions from the unchanged NEXT-1 engine, and compact **Intent ↔ Reality ↔ Alignment** signal groups.
- Derived Foundation readiness and optional Game Vision descriptor from Compendium; Decision and Open Question lifecycle counts from their existing stores; Repository and Unity state only from session-known explicit inspection results; actionable Alignment counts without conflating review state; and Feature Contract draft/approved/archived counts from existing contracts.
- Kept the dashboard side-effect free. Rendering reads four existing local project documents and does not call a provider, inspect Git/Unity, rebuild Alignment, persist dashboard/recommendation state, or mutate project truth. Every action routes to an existing owning workspace.
- Preserved Workspace Home as the application/project launcher with compact top-three guidance. Overview uses the same deterministic recommendation implementation with its existing five-item bound; no second engine or task store was created.
- Deferred Recent Activity because current cross-domain timestamps do not share one reliable event contract. Deferred AI Insights from this deterministic/local milestone rather than mixing non-authoritative history into project signals without a scoped contract.
- Focused coverage passed **68 frontend tests**; the full frontend suite passed **314 tests in 26 files**. Typecheck, the production frontend build, and the Tauri no-bundle release build passed. No live provider request, GUI automation, or native boundary change occurred.

**UI-3 is implemented and headless validated. Its `1180×760`, fullscreen, `760×560`, sparse/mature-project, route, and session-Reality manual checklist remains pending. Writers' Room behavior and manual status were not changed; WR-1.3, Chronicler, Knowledge Import/Rebaseline, NEXT-2, and UI-4 were not started.**

### UI-4 Game Wiki / Knowledge Explorer

- Replaced the vertically dense expandable-row Wiki with a responsive knowledge explorer: projected categories, a compact bounded result list, and persistent selected detail on wide windows; compact windows stack the same workflow.
- Added one pure local read model over Compendium, Decisions, Open Questions, and successful Specialist History. Case-insensitive search combines category, type, authority/provenance, and lifecycle filters without semantic retrieval or persistence. Current records are prioritized; unresolved/proposed and historical records remain visibly distinct and discoverable.
- Preserved source authority. Knowledge and Open Questions deep-link to their exact Game Design entry; Decisions and Specialist History use their closest stable owner because those workspaces do not expose exact-item deep links. Alignment and Feature Contract summaries remain outside entry counts.
- Removed automatic Repository and Unity inspection from Wiki mount. Technical/Production summaries now consume only already-known session results supplied by the shell and route back to the owning Reality workspaces.
- Added sparse-project guidance to existing Game Design, Project Interview, and Decisions surfaces without automatic creation, import, generation, or resolution.
- Focused coverage passed **41 frontend tests** including deterministic 500-entry projection. The full frontend check passed **311 tests in 27 files** plus typecheck. The production frontend and Tauri no-bundle release builds passed; the existing Windows import-library linker warning remained informational. No native boundary changed, and no live provider request or GUI automation occurred.

**UI-4 is implemented and headless validated. Its `1180×760`, fullscreen, and `760×560` responsive/authority/owner-route manual checklist remains pending. No `wiki.json`, provider call, semantic search, Knowledge Import/Rebaseline, WR-1.3, Chronicler, or Writers' Room change was introduced.**

### WR-1.3 Narrative Context & Guided Lore Workflow

- Extended the existing AIW-0 Context Plan instead of creating a new retrieval system. Narrative selection now combines stable lexical overlap, session topic words, profile cues, area priority, and source order across current Compendium knowledge, approved narrative Decisions, unresolved Open Questions, explicit project-contained Markdown, and recent conversation. Unrelated Technical, Git, Unity, and delivery sources remain excluded by default.
- Added strict `EXPLORE`, `CLARIFY`, and `CONSOLIDATE` response metadata, structured focused questions with optional rationale/directions, visible context counts, profile-specific grounding instructions, and native rejection of premature Knowledge/Decision proposals outside consolidation. Equivalent supplied Compendium facts are not repeated as new Knowledge proposals.
- Added explicit proposal Review & Edit for `PENDING` and accepted-unapplied proposals. Title, content, and reason persist only in non-authoritative session history until Apply; the owning domain receives the reviewed text, provenance remains AI-assisted/human-reviewed, and later requests reload newly applied Compendium knowledge without restart.
- Focused validation passed **28 frontend tests**, **11 native Writers' Room tests**, and the proposal-edit persistence test. Full validation passed **317 frontend tests in 27 files**, **210 native library tests**, **2 native CLI tests**, the production frontend build, and the Tauri no-bundle release build. No live provider request or GUI automation occurred.

**WR-1.3 is implemented and headless validated. The bounded hackathon demo/manual responsive PASS remains pending. Semantic/vector search, Tavily, Knowledge Import/Rebaseline, Wiki Chronicler, a general Router, and new Suite navigation were not started.**

### WR-1.3.1 Writers' Room live structured-output hardening

- Recorded the first real WR-1.3 result without inventing unavailable diagnostics: preflight correctly found four established knowledge entries and no approved Decision, Open Question, documented Markdown, or recent conversation; the provider request completed, then strict response validation returned `INVALID_WRITERS_ROOM_OUTPUT`. The raw response was intentionally not retained, so the exact incompatible field remains **UNVERIFIED**.
- Traced a real prompt/parser mismatch: the compact prompt did not document non-empty proposal keys and presented optional question metadata as if required, while native deserialization rejected `null` empty collections and harmless mode casing/outer whitespace. The fix normalizes only deterministic optional-field variants, legacy string questions, and the three known modes. Missing/unknown mode, unknown fields or reasoning payloads, multiple objects, unsafe source IDs, invalid proposal types, semantic phase violations, and collection/text overflows still fail closed.
- Reused the existing shared single-object extractor, hardened the prompt with canonical keys/enums/empty-array guidance, retained one explicit request with no automatic retry, and left Context Plan relevance, source authority, proposal Apply, Compendium, Decisions, registry, and usage architecture unchanged.
- Focused validation passed **14 native Writers' Room tests**, **18 AI Workspace regressions**, **12 shared Creator structured-output regressions**, and **28 frontend boundary/page tests**. Full validation passed **317 frontend tests in 27 files**, **213 native library tests**, **2 native CLI tests**, the production frontend build, and the Tauri no-bundle release build. A mocked Example Guild `CLARIFY` path validates, persists its non-authoritative response metadata, renders its focused question/source trace, requires no proposal, and leaves Project Brain bytes unchanged. The existing chunk-size and Windows linker messages remained non-blocking. No live provider request or GUI automation was made during the fix; the live recheck remains pending.

**WR-1.3.1 is implemented and headless validated. WR-1.3 Manual PASS is not recorded. Tavily, Knowledge Import/Rebaseline, Wiki Chronicler, and the general Router remain out of scope.**

### WR-1.3S Writers' Room submission stabilization

- Recorded the third real Nemotron Writers' Room failure without reconstructing unavailable payload details. All three attempts completed at the provider boundary and were safely rejected as `INVALID_WRITERS_ROOM_OUTPUT`; the third still failed after JSON-object enforcement. Narrative Context selection itself worked live, no proposal or project truth was applied, and raw provider output remained intentionally unretained.
- Restored the previously live-proven WR-1.2 provider contract: one JSON object containing `message`, zero-to-three plain string `questions`, supplied-only `sourceRefs`, and bounded strict `proposals`. Removed provider-authored phase and nested question metadata from the prompt, parser, future schema description, persistence path, and visible response UI while keeping older format-version `1` sessions readable.
- Preserved the WR-1.3 product value: deterministic profile-aware Narrative Context, preflight counts, guided Lore behavior in the prompt, duplicate suppression, proposal Review/Edit/Apply, and fresh Project Brain resolution after Apply. Nemotron still receives provider-enforced `json_object`; content-free failure diagnostics and the no-retry/one-confirmation boundary remain.
- Focused validation passed **17 native Writers' Room tests** and **28 Writers' Room/AI Workspace frontend tests**, including the exact Example Guild string-question flow, supplied source rendering/persistence, no proposal or project mutation, edited proposal Apply, and next-turn context refresh. Full validation is recorded in `VALIDATION.md`.

**WR-1.3S is complete after the user-confirmed stabilized live-provider/manual PASS. Detailed model, token, latency, and proposal-outcome metadata for that pass were not supplied and remain unverified. No live call, GUI automation, Tavily, Knowledge Import/Rebaseline, or Chronicler work was performed during the implementation turn itself.**

### TAV-1 External Research in Writers' Room

- Added one explicit two-stage research flow inside the existing Writers' Room: **Research web** performs one user-confirmed Tavily Basic Search, then a later normal Send may include only the sources the user kept selected. Search never forces a Nemotron call.
- Added a native-only `TAVILY_API_KEY` adapter using the official Search endpoint with at most five results, no Tavily answer/raw content, no retry, controlled failure categories, HTTP(S)-only normalization, and bounded snippets. React receives configuration status and normalized session data, never the key or raw provider response.
- Reused `.forgemind/ai-workspace-sessions.json` for the current non-authoritative source snapshot, selection, and bounded research-run metadata. `EXTERNAL_RESEARCH` is distinct from established/documented/project truth, joins the existing supplied-only Context Plan, and is structurally separated and prompt-injection framed for Nemotron.
- Added a compact source tray, distinct `EXTERNAL RESEARCH · TAVILY` response trace, Clear and selection controls, and preflight that separately names Tavily retrieval and Nebius Token Factory/NVIDIA Nemotron synthesis. The stabilized WR-1.3S `message`, string `questions`, supplied-only `sourceRefs`, and strict `proposals` contract remains unchanged.
- Focused mocked coverage validates one-call/no-retry behavior, request shape, safe error handling, source/snippet bounds, authority/selection/context rules, prompt-like data, persistence, missing configuration, UI selection/Clear, and provider-separated preflight. No live Tavily or Nebius call and no GUI automation occurred during implementation.

**TAV-1 is implemented and headless validated. Its first user-driven Tavily plus Nemotron workflow later succeeded at both service boundaries while exposing the relevance and UX issues addressed by TAV-1.1. No Knowledge Import/Rebaseline, Chronicler, Router, semantic retrieval, Crawl, Extract, or autonomous research was started.**

### TAV-1.1 External Research UX and query reliability

- Recorded the first live TAV-1 workflow: Tavily retrieval succeeded, sources arrived with `EXTERNAL_RESEARCH` provenance, provider-separated preflight worked, and Nemotron synthesis ran with selected research. The result set was low relevance for the intended tactical-game/faction query and leaned toward software-design/OOP sources.
- Audited composer -> editable Research query -> frontend request -> native request -> Tavily payload. The current path sends the visible value after outer-whitespace trimming only and persists that query with normalized sources. No stale composer, fallback query, truncation, wrong field, prior-session reuse, hidden rewrite, or serialization mismatch was found, so no Tavily-quality fix is claimed.
- Replaced the horizontal source tray with a compact right drawer showing query, result/selected counts, bounded vertical rows, domain/authority, selection, Clear, and safe native **Open source** actions. Context and Research drawers close each other; the workbench otherwise shows only a compact selected-count indicator. Research web now has a restrained external-action accent distinct from Context and Markdown without competing with Send.
- Added a narrow native default-browser command with HTTP(S)-only validation, URL sanitization, safe failure, and no generic frontend shell/network capability. Selection remains session-scoped and selected-only; deselecting removes research from the next Context Plan and reduces the approximate input maximum. Existing applied proposals and project truth remain unchanged.
- Focused validation passed **31 frontend tests**, **11 Tavily native tests**, **18 Writers' Room native tests**, and **19 AI Workspace native tests**. Full validation passed **323 frontend tests**, **230 native library tests**, **2 native CLI tests**, TypeScript, the production frontend build, and the Tauri no-bundle release build. No live provider call or GUI automation occurred during TAV-1.1 implementation.

**TAV-1.1 is implemented and headless validated. A fresh-session user-driven visual/restart check remains pending for the revised drawer and native browser opening. No AI query rewriting, additional external service, Import/Rebaseline, Chronicler, Router, Crawl, Extract, or autonomous research was added.**

### IMP-1 Existing Project Knowledge Import

- Added a bounded Game Wiki import workflow for 1-10 project-contained `.md` files with native containment/symlink/size/secret-marker checks, registry-backed preflight, one explicit Nebius Token Factory request, strict three-type structured output, supplied-only source references, and no retry.
- Kept the Candidate Review Queue transient and non-authoritative. Users can edit, select, skip, select HIGH-confidence new items, and explicitly Apply a batch. Deterministic normalization labels exact duplicates, possible duplicates, and title collisions without semantic similarity.
- Extended the existing owning records additively: Compendium imports use `DOCUMENTED` plus `knowledge_import` and bounded project-relative source trace; imported Decisions carry the same trace and start `PROPOSED`; Open Questions remain unresolved. Wiki continues to project those owners and Writers' Room retrieves applied lore through Project Brain.
- Added the public-safe Aster Vale Colony fixture and offline native/frontend coverage for source safety, extraction failures, speculation protection, no-retry behavior, review/apply, idempotency, Wiki integration, and narrative context retrieval. No private dogfood-project material, live provider request, or GUI automation entered implementation or tests.
- Validation passed 7 focused native Import tests, the focused Writers' Room imported-context regression, 16 focused frontend Import/Wiki tests, all 329 frontend tests, all 240 native library plus 2 CLI tests, TypeScript, the production Vite build, and the Tauri no-bundle release build. `cargo fmt --check` remained unavailable because `cargo-fmt.exe` is not installed; the existing Vite chunk and Windows linker advisories were non-blocking.

**IMP-1 is implemented and headless validated. One controlled extraction plus the short user-driven UI/persistence/Writers' Room acceptance remains pending; the existing public-release security/history gate is unchanged. Rebaseline, semantic/vector search, Tavily changes, Chronicler, Router, generic ingestion, PDF/DOCX/chat import, and automatic Canon remain out of scope.**

### IMP-1.1 Extraction Result Visibility & State Reliability

- Recorded the first controlled live IMP-1 failure without inventing provider details: the correct one-file Nebius/Nemotron preflight reached visible extraction work, then the UI returned to preflight without a Review Queue, explicit empty result, or visible error. The provider outcome and exact response shape remain **UNVERIFIED** because the previous frontend state erased that distinction and raw response text is intentionally not retained.
- Replaced inferred preflight/loading/candidate rendering with explicit import phases. After confirmation, `RUNNING` can end only in `REVIEW_QUEUE`, `EMPTY_RESULT`, or `ERROR`; all three preserve the selected source/model context, and empty/error retry returns to a new preflight confirmation instead of issuing another request.
- Reused content-free structured-output diagnostics and canonical usage metering. Provider success followed by schema/semantic rejection remains visibly distinct from a request that was never sent, valid zero-candidate output is recorded as structured-output success, and no prompt, Markdown, raw response, hidden reasoning, credential, or arbitrary unknown key is persisted.
- Focused validation passed **18 frontend Knowledge Import/platform/Wiki tests**, **11 native Knowledge Import tests**, and the Writers' Room imported-context regression. Full validation passed **334 frontend tests**, **244 native library tests**, **2 native CLI tests**, TypeScript, the production frontend build, and the Tauri no-bundle release build. The existing Vite chunk and Windows linker advisories remained non-blocking. No live provider request or GUI automation occurred during the fix.

**IMP-1.1 is implemented and headless validated. IMP-1 Manual PASS is not recorded; a fresh controlled extraction and the existing short UI/persistence/Writers' Room acceptance remain pending. No automatic retry, authority change, Tavily change, Writers' Room behavior change, Rebaseline, or adjacent feature work was added.**

### IMP-1.2 Diagnostic-Led Live Import Schema Compatibility

- Recorded the second controlled live import without reconstructing provider content. IMP-1.1 correctly surfaced `INVALID_KNOWLEDGE_IMPORT_OUTPUT`, reported the provider request as executed, preserved the selected Nemotron/source summary, created no candidates, changed no project data, and made no automatic retry.
- Inspected only the canonical content-free usage record. The exact evidence was `DESERIALIZATION_FAILED` / `INVALID_SCHEMA`, canonical root-key presence `candidates`, and response character count `1468`; candidate count and the failing candidate field were unavailable. The historical structural mismatch therefore remains **UNVERIFIED**.
- Added field-specific safe diagnostics for the candidates container and required candidate fields, distinct unknown-source and invalid-source-list codes, and canonical-root-only key recording. Actual values, arbitrary unknown key names, Markdown, raw provider output, hidden reasoning, credentials, and machine paths remain excluded.
- Hardened the compact import prompt with the exact root shape, one canonical candidate, exact type/confidence/section vocabularies, supplied-only source arrays, explicit empty result, and no fence/wrapper/reasoning/extra-key rules. No compatibility normalization was added because the evidence did not identify one harmless variation. Nemotron `JSON_OBJECT`, one-confirmation/one-request behavior, no retry, speculation rejection, and strict source validation remain unchanged.
- Focused validation passed **12 native Import tests**, **18 frontend Import/platform/Wiki tests**, and **2 provider response-format regressions**. Full validation passed **334 frontend tests**, **245 native library tests**, **2 native CLI tests**, TypeScript, the production frontend build, and the Tauri no-bundle release build. Existing Vite chunk and Windows linker advisories remained non-blocking; no live provider request or GUI automation occurred during the fix.

**IMP-1.2 is implemented and headless validated, but the diagnostic-led live recheck and IMP-1 Manual PASS remain pending. No Tavily, Writers' Room, authority, candidate-type, Apply, duplicate, or adjacent feature behavior changed.**

## Update policy

## MODEL-1 — 2026-10-27

Implemented the final pre-freeze model-awareness surface: native explicit Token Factory `GET /v1/models` discovery, application-local catalog and registry persistence, protected Nemotron default, conservative custom/discovered capability, deterministic observed usage metrics, and AI Studio management UI. Provider availability remains distinct from ForgeMind-verified capability; there is no router, ranking, benchmark, pricing inference, provider editor, live inference, or project-truth change. Offline native/frontend validation is recorded in `VALIDATION.md`; one user-driven refresh and selector/persistence acceptance remain pending before closure.

Update this journal:

- after meaningful milestone completion;
- after an important architectural discovery;
- after a significant real-world dogfooding result; or
- after a major reliability incident or fix.

Do not use this file as a live transcript or append entries for every small refactor. Do not revise completion percentages after every small commit. Prefer a stable snapshot that explains why an estimate or product direction changed; `ROADMAP.md` remains authoritative for current milestone state.

## Daily entry template

## Day N — YYYY-MM-DD

### Completed
-

### In progress
-

### Blockers
-

### Tests / validation
-

### Product decisions
-

### Scope changes
-

### Estimated technical foundation completion
- X%

### Estimated hackathon MVP completion
- X%

### Estimated jury-ready completion
- X%

### Estimated effective development days remaining
- X

### Risks
-

### Next day target
-

### Notes
-
