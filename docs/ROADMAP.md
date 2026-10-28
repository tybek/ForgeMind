# Roadmap

The roadmap uses small, outcome-based milestones. A milestone is not assumed to equal one day of work. **0A through 0G, the 0G.13 UX hotfix, 0I, 0J, 0K, UI-1, UI-2, the documentation-only NPC-0 specification, NPC-1, NPC-2, NEXT-1, AIW-0, WR-1.3S, and the bounded OPT-1 code-health pass are complete. IMP-1 Existing Project Knowledge Import plus the IMP-1.1 terminal-state fix and IMP-1.2 diagnostic/prompt hardening are implemented and headless validated. The second controlled live extraction proved IMP-1.1's visible error path but its safe historical diagnostic was not field-specific enough to justify a compatibility normalization, so a fresh live recheck plus the short UI/persistence acceptance remain pending before milestone closure. UI-3 Project Overview is implemented and headless validated; its bounded desktop/responsive manual check remains pending. The bounded TAV-1 external-research vertical slice completed its first live Tavily plus Nemotron workflow and TAV-1.1 query/UX stabilization is implemented and headless validated; the revised drawer, external opening, restart clarity, and visual/responsive behavior still require a user-driven manual recheck. One earlier user-driven live Lore Architect run succeeded at the provider and persistence boundaries but exposed the WR-1.2 immediate-render blocker; three later WR-1.3 requests completed at the provider but failed the expanded local schema, including one with provider-enforced JSON-object mode. The restored WR-1.3S shape subsequently passed its user-confirmed live manual recheck; detailed model, token, and latency metadata for that pass were not supplied and remain unverified. NEXT-1's final Home, connection, detached Unity, persistence, project-switching, and responsive recheck passed manually on 2026-09-28. 0G.8, 0G.9, 0G.10, 0G.11, 0G.12, and 0H retain their manual-validation backlog. Studios, Rebaseline, CR routing phases, SEC, 0L, optional AI recommendation refinement, CHR-1, CHR-2, and other future product implementation have not started.**

## Hackathon Submission Readiness - ACTIVE DELIVERY TRACK

[Hackathon Submission Readiness](HACKATHON_SUBMISSION.md) owns the requirements, evidence templates, public-repository and secret-safety checks, three-minute video plan, submission-copy placeholders, and final QA gates. This parallel delivery track does not change product milestone ordering or authorize application behavior.

- **SUB-0 - Submission requirements documented - COMPLETE:** current official requirements, tool-feedback framework, current model evidence, credit-usage plan, repository/security checklists, video strategy, and final submission checklist are recorded.
- **SUB-1 - Tool-feedback evidence collection - IN PROGRESS:** first real Creator evidence is recorded; continue only the deliberate evaluations needed for specific Nebius Token Factory and NVIDIA model feedback, without turning the small sample into a score or winner.
- **SUB-2 - Public repository finalization - PLANNED:** verify clean setup, license, links, public-safe assets/data, history, secrets, and evaluation without private dogfood-project content.
- **SUB-3 - Demo script / shot list - PLANNED:** lock the pitch against the actual submitted build and do not present planned behavior as shipped.
- **SUB-4 - Video production - PLANNED:** capture, edit, caption, upload, and verify a public video no longer than three minutes.
- **SUB-5 - Final submission QA - PLANNED:** verify product, repository, Nebius, NVIDIA, video, and Devpost gates before the external deadline.

Only SUB-0 is complete. The final submission is not complete.

## MODEL-1 Token Factory Model Catalog & Registry Management — IMPLEMENTED, MODEL-1.1 MANUAL RECHECK PENDING

Add one compact **AI Studio → AI Models** surface that distinguishes the dynamic Nebius Token Factory provider catalog from ForgeMind's application-local verified registry. The native boundary performs only an explicit authenticated `GET /v1/models`, caches normalized model IDs and refresh time outside project truth, preserves Nemotron as the protected default and DeepSeek as the existing alternate, enables or disables registry entries, accepts bounded custom IDs, and defaults unknown capability to `NONE`. Canonical local usage records provide run count, token totals, median latency, and last-used observations without pricing, score, ranking, or quality claims.

The catalog refresh, dynamic discovery, enable/custom flows, observed metrics, selector visibility, and restart persistence passed manual acceptance. That acceptance exposed one critical gap: an enabled custom model with capability `NONE` remained executable from a structured workflow and failed only at the provider. MODEL-1 Manual PASS therefore remains open until MODEL-1.1 receives its user-driven compatibility recheck.

### MODEL-1.1 Structured-Output Compatibility Gate + Compact Registry — IMPLEMENTED, HEADLESS VALIDATED; MANUAL RECHECK PENDING

Writers' Room, Knowledge Import, New Project Creator proposals, Feature Contract AI drafting, and Specialist runs explicitly require at least `JSON_OBJECT`; `JSON_SCHEMA` also satisfies that minimum and `NONE` does not. Incompatible enabled models remain visible but disabled in structured-workflow selectors. The native task boundary revalidates enabled state and capability before any provider execution and returns `MODEL_CAPABILITY_REQUIRED` locally. Nemotron remains the protected `JSON_OBJECT` default; DeepSeek, discovered models, and custom IDs retain their existing explicit capability, including conservative `NONE`.

The AI Models surface now uses compact expandable enabled rows, collapsed run-count/median-latency summaries, full observed metrics on demand, separate availability/custom/capability labels, and semantic badge treatments. No registry schema, project authority, router, ranking, pricing, automatic probe, fallback, provider, or live request was added.

## 0A Product Foundation — COMPLETE

Define the Intent / Reality / Alignment product model, MVP boundary, conceptual data model, workflows, architecture boundaries, roadmap, repository layout, contribution expectations, and license.

Exit condition: the repository gives a small team a consistent foundation without claiming a working product.

## 0B Desktop Shell — COMPLETE

Validate the desktop technology choice and build the smallest local shell with workspace selection and navigation placeholders.

Exit condition: contributors can run a documented shell without AI, Git automation, Unity integration, or Alignment logic.

## 0C Project Model + Local Workspace — COMPLETE

Choose the first portable project-file representation and implement local create/open/read/write behavior for a minimal Project and its areas.

Exit condition: reviewed sample knowledge persists in human-readable repository files with basic validation.

## 0D AI Provider + Evaluation Harness — COMPLETE

Define a replaceable AI provider boundary, connect Nebius Token Factory, load API credentials securely from local configuration, perform a minimal smoke test, allow an approved model to be selected and tested, record usage and latency where provider data permits, and provide a small evaluation runner isolated from core domain logic.

The provider boundary, Nebius integration, secure credential path, evaluation UI, normalized responses, safe diagnostics, offline provider tests, and explicitly triggered headless smoke command are implemented. One authorized corrected live smoke succeeded through the production path on Day 2 without retry.

Exit condition met: the bounded production request returned normalized readable text with provider-reported usage, latency, model identity, finish reason, and a safe request identifier.

## 0D.1 Model Registry + Usage Metering — COMPLETE

Centralize model identifiers and metadata, add local per-request usage accounting and per-model or per-task summaries, estimate cost only where pricing is explicitly configured, and establish foundations for later model comparison, routing, and multi-user or team accounting.

Exit condition met: model metadata is centralized; registered production evaluations create privacy-safe local records; session, project, and model summaries are available; explicit pricing supports estimated cost; and unknown pricing remains unavailable.

## 0E AI Project Interview — COMPLETE

Introduce a provider-neutral AI boundary and an onboarding interview that drafts initial Compendium knowledge for explicit human review.

Implemented: a registry-backed guided interview, compact metered AI turns, strict structured candidate validation, visible provenance and status, edit/approve/discard review, approved-only `.forgemind/interview.json` persistence, reopen behavior, and explicit overwrite confirmation.

Exit condition met: user-driven manual validation confirmed relevant interview behavior, selective approved-only persistence, saved-knowledge review after reopen, and normal workspace navigation including AI Evaluation.

## 0F Game Compendium + Decisions — COMPLETE

Present and maintain current Intent through a versioned Game Compendium and separate structured Decisions. Support explicit duplicate-safe interview import, manual knowledge CRUD, provenance/source/status, required rationale, explicit Decision approval, knowledge relationships, and one-predecessor supersession history.

Exit condition met: portable `.forgemind/compendium.json` and `.forgemind/decisions.json`, native schema validation, explicit import and mutation commands, readable Compendium/Decision UI, and headless frontend/native coverage passed. User-driven validation confirmed import, duplicate protection, editing, manual creation, promotion, explicit approval, related knowledge, supersession history, and persistence after restart. Automated conflict detection remains later Alignment work.

## 0F.1 Compendium & Decisions UX Density Polish — COMPLETE

Refine the completed 0F UI without changing domain schemas: compact expandable Compendium rows, inline entry editing, denser controls, and text-plus-color semantic status treatments for Compendium knowledge and Decisions.

Exit condition met: focused frontend regression tests, the full TypeScript/frontend suite, native regression suite, frontend production build, and Tauri release build passed. Manual UX validation confirmed compact rows, conditional expansion for longer content, anchored inline editing, clear status visuals, and unchanged persistence. No live AI or GUI automation was used for automated validation.

## 0G Specialist Agent Profiles — COMPLETE (OPTIONAL)

Evaluate bounded specialist role profiles over the shared Project Brain, beginning with profiles that support the core MVP rather than independent agents or databases. Preserve shared authority, provenance, evidence-versus-inference labeling, and human review.

Implemented offline: one reusable specialist-profile abstraction and the AI Behavior Designer workbench. Users explicitly select current Compendium entries, approved Decisions, a registry model, bounded task type, and scenario. Native code resolves only those references, builds a centralized game-agnostic prompt, validates bounded structured output, and meters the single explicit request as `ai_behavior`. Results remain non-authoritative proposals; 0G.3 later adds portable work history without creating an independent specialist knowledge database or autonomous loop.

This future-direction milestone does not gate 0H through 0K and may be deferred until after the required MVP works end to end.

Exit condition met: one user-driven `REACTION_MODEL` validation with selected Compendium and approved Decision context produced useful real game-development analysis that respected uncertainty, avoided omniscience, separated assumptions, supplied actionable recommendations, identified exploits, and proposed deterministic tests. Usage metadata was reported honestly, and the result did not become project truth. No autonomous multi-agent framework or expansion of the required MVP is included.

See [AI Specialists and Content Production Direction](AI_SPECIALISTS_AND_PRODUCTION.md) for the broader future direction and explicit non-implementation boundaries.

## 0G.1 Specialist Output Budget Hotfix — COMPLETE

Raise the AI Behavior Designer completion allowance from 1,600 to 2,400 tokens after a real `COMPETENCE_TIERS` request exhausted the shared hidden-reasoning/output budget before returning readable structured text. Minimal reasoning, temperature `0.2`, strict JSON validation, existing result and list bounds, explicit user initiation, safe truncation failure, and no-retry behavior remain unchanged.

Exit condition met: the focused native request test asserts the 2,400-token bound, and the full frontend/native/build validation remains green without live inference or GUI automation.

## 0G.2 Specialist Structured-Output Reliability Hardening — COMPLETE

Harden AI Behavior Designer normalization after a readable production response failed the original all-or-nothing structured parser. Deterministically extract exactly one JSON object from canonical, fenced, whitespace-wrapped, or briefly annotated output; normalize missing optional lists and two explicit snake-case aliases; and retain strict canonical validation, unknown-field rejection, list bounds, safe truncation handling, and no retry.

Exit condition met: focused offline fixtures cover accepted harmless formatting and rejected malformed, ambiguous, non-object, unknown, mistyped, oversized, and secret/reasoning-bearing responses. Failures now distinguish `INVALID_JSON`, `INVALID_SPECIALIST_SCHEMA`, `OUTPUT_TRUNCATED`, and provider-level unsupported responses without exposing raw output.

## 0G.3 Specialist Production Hardening — COMPLETE

Harden the completed AI Behavior Designer after real production dogfooding: bounded task-specific completion budgets, a responsive two-pane workbench, accessible loading feedback, deterministic Area-based context guidance, a compact approved-Decision selector, and portable versioned Analysis History.

Exit condition met: successful and failed runs persist only normalized output or safe diagnostics in `.forgemind/specialist-runs.json`; history remains explicitly non-authoritative; frontend and native tests cover workbench behavior, selected-only context, exact task budgets, safe persistence, and malformed/version failures. No live inference or GUI automation was used for automated closure.

## 0G.4 Reaction Model Reliability + Context Panel UX Polish — COMPLETE

Increase only the bounded specialist task budgets justified by production use, with `REACTION_MODEL` at 4,600 tokens and a compact task-specific state/rule instruction. Refine manual Project Context selection so recommendations remain editable while every existing Compendium Area has its own counted disclosure under a fixed **More project context** heading. Preserve the responsive 40/60 workbench, strict schema, safe truncation failure, no retry, and selected-only context.

Exit condition met: focused frontend/native coverage and the full offline validation sequence pass without live inference or GUI automation. 0G remains complete; this post-validation hardening does not start 0H.

## 0G.5 Specialist Workbench Recovery Hotfix — COMPLETE

Isolate auxiliary Analysis History from specialist startup and execution after a format-version `1` failed-run file exposed a serializer/deserializer mismatch and frontend load coupling. Preserve compatibility with ForgeMind's known omitted-empty-diagnostics shape, keep genuine corruption localized, and provide an explicit history-only archive-and-reset action.

Exit condition met: invalid history no longer hides profile tasks, configured registry models, Compendium, or approved Decisions; current analysis can complete with a safe history warning; recovery archives/replaces only specialist history; and focused frontend/native plus full offline build validation pass. No automatic repair, live inference, GUI automation, or 0H work is included.

## 0G.7 Specialist Run UX Polish — COMPLETE

Polish the production specialist workflow without changing its reasoning or persistence architecture: move elapsed loading feedback to the Run action, clear the current scenario only after a successful saved run, surface the exact stored scenario in Analysis History, and provide compact Copy Scenario and safe Markdown-result actions.

Exit condition met: current and historical successful results share one deterministic Markdown formatter over normalized safe fields; failed runs retain reusable scenarios without exposing a result-copy action; focused frontend coverage and the normal offline validation sequence pass without live inference, GUI automation, native schema changes, or 0H work.

## 0G.8 Game Wiki / Unified Knowledge View — IMPLEMENTED, MANUAL VALIDATION PENDING

Add Game Wiki as the project-level browsing surface over the existing Compendium Areas. It aggregates Compendium entries, Decisions, and relevant successful Specialist Analysis History while preserving clear authority labels and the original stores as the only sources of truth.

Automated implementation and validation are complete: compact Area navigation and expandable rows scale across the existing taxonomy; AI analysis remains visibly non-authoritative; and a user can explicitly review, edit, and confirm one stored finding into a duplicate-safe Compendium entry with truthful AI provenance. A short user-driven visual and persistence smoke remains required before marking 0G.8 complete. No `wiki.json`, automatic Decision creation, live inference, GUI automation, or 0H work is included.

## 0G.9 Specialist + Wiki UX Production Polish — IMPLEMENTED, MANUAL VALIDATION PENDING

Harden the Specialist Workbench and Game Wiki after real manual dogfooding without changing specialist reasoning, provider, history, or project-truth architecture. The wide workbench now presents configuration, compact Analysis History, and selected-run detail together; copy actions and running feedback remain local; failed runs export only safe stored diagnostics; and saved context is visible before the scenario.

Stored findings now use checkbox selection and one multi-finding human-review dialog before explicit Compendium promotion. Existing native finding-membership, provenance/source, exact-duplicate, unchanged-history, and no-automatic-Decision guarantees remain authoritative. A normalized-title match is a review warning with explicit Cancel, edit-at-source, or save-anyway choices, not a title-only persistence block.

Game Wiki adds keyword search, a simple source-type filter, separate type and state/subtype tags, compact authority/provenance/source metadata, and Knowledge editing through the existing Compendium editor. It remains an aggregation view over current stores. The existing Compendium Areas remain unchanged; a future topic/tag taxonomy such as `Systems → Enemy AI` is deferred. No top-level AI Area, semantic search, RAG, new persistence file, live inference, GUI automation, or 0I work is included.

## 0G.10 Specialist History Readability + Copy Scenario Fix — IMPLEMENTED, MANUAL VALIDATION PENDING

Apply a narrow frontend hotfix after AI Behavior Designer dogfooding. Copy Scenario now uses the complete persisted Scenario / Question value for current and historical runs, preserving internal line breaks. Analysis History keeps its established middle-column width while separating task/status, timestamp, model, and outcome into compact readable lines; long model identifiers and summaries remain ellipsized.

Project Context adds explicit **Select recommended** and **Deselect all** actions without replacing manual overrides or changing Approved Decision selection. Approved Decisions have their own independent **Deselect all** action. Focused and full offline validation cover exact multiline copy, history-row hierarchy, long model identifiers, success/failure outcomes, and independent selection clearing. No specialist reasoning, persistence, native boundary, live inference, GUI automation, or 0I work is included.

## 0G.11 NVIDIA Nemotron + Manual A/B Evaluation — IMPLEMENTED, MANUAL VALIDATION PENDING

Add `nvidia/nemotron-3-super-120b-a12b` as the first NVIDIA model configured through the existing Nebius Token Factory registry while retaining `deepseek-ai/DeepSeek-V4.1-Flash`. Pricing, maximum completion tokens, and unsupported or unverified capabilities remain Unknown rather than inferred.

A saved successful Specialist run can explicitly run once with another enabled model while preserving its exact task type, Scenario / Question, selected Compendium context, and selected approved Decisions. Matching successful history runs can be reviewed side by side with normalized findings and model-specific usage, cost availability, and effective budget. This is labeled human evaluation, does not score or select a winner, and adds no routing, benchmark suite, background work, retry, or automatic second request. A user-authorized Nemotron call succeeded through the NVIDIA provider and returned valid JSON, but exceeded the canonical `recommendations` list bound and therefore did not complete full Specialist validation under the then-current behavior.

## 0G.12 Specialist Bounded-Output Normalization — IMPLEMENTED, MANUAL VALIDATION PENDING

Preserve the canonical Specialist result schema and list limits while accepting otherwise valid structured output whose allowed arrays contain extra items. Native normalization deterministically retains the first five items in assumptions, recommendations, risks, exploits, and open questions, and the first eight suggested tests. It never merges, summarizes, reorders, rewrites, or raises those bounds.

Successful normalized results expose non-fatal per-field returned/retained counts, persist that safe metadata additively in format-version `1` Analysis History, and show it in result detail and manual comparison. Malformed or ambiguous JSON, missing summary, wrong field types, unknown fields, invalid strings, truncation, and other schema failures remain errors. No retry, live inference, structured-output capability assumption, model-specific branch, or 0I work is included.

The first live NVIDIA Nemotron 3 Super Specialist run after this normalization hardening completed successfully. That single result, together with the early DeepSeek/Nemotron comparison evidence, is not a sufficient sample for a model recommendation.

## 0G.13 Cross-Model Run Feedback + Finding Selection Polish — COMPLETE

Keep a saved successful source run and its full detail visible while an explicitly triggered cross-model run is in flight. The comparison action owns its spinner, target-model label, elapsed seconds, duplicate-execution lock, and safe failure feedback. Success refreshes Analysis History and the normal comparison; failure refreshes History while retaining the source selection and detail.

Finding review adds an independent **Deselect all** beside the selected count and Project Knowledge action. It clears only result-finding checkboxes and never changes Project Context or approved-Decision selections. This frontend-only hotfix changes no persistence, native contract, provider behavior, automatic retry behavior, or model routing, and does not start 0I.

## 0H Git Reality Snapshot — IMPLEMENTED, MANUAL VALIDATION PENDING

Expose the active workspace repository as read-only implementation evidence through a narrow native Git boundary. The Repository workspace shows detection, branch or detached HEAD, HEAD metadata, clean/dirty state, repository-relative changed files with staged/unstaged status and available diff stats, aggregate tracked diff statistics, and at most 10 recent commits. Game Wiki shows only a compact Technical/Production summary.

Automated implementation and validation are complete. Git-unavailable, non-repository, malformed/failed inspection, and normal repository states remain isolated from the rest of the workspace. No Git data is persisted, no arbitrary command reaches native code, and commit, push, pull, fetch, merge, rebase, checkout, branch creation, stash, authentication, hosted review, and full source diffs are excluded. The morning manual-validation backlog in [Validation](VALIDATION.md#morning-manual-validation-backlog) remains required before 0H can be marked complete. 0I is complete below.

## 0I Unity GroundTruth — COMPLETE

Build the minimal separate Unity Bridge and snapshot contract, then import and display supported observations with source, timestamps, coverage, and errors.

### 0I.1 Unity GroundTruth Foundation — COMPLETE

ForgeMind now detects canonical Unity project structure, parses `ProjectSettings/ProjectVersion.txt`, and safely validates an optional versioned `.forgemind/unity-groundtruth.json` through a narrow native boundary. The Unity workspace page separates verified Unity evidence from documented Intent and AI inference, and Game Wiki shows a compact Unity Reality summary in Technical.

The format-version `1` contract is documented in [Unity GroundTruth Contract](UNITY_GROUNDTRUTH.md). Automated validation covers Unity and non-Unity workspaces, missing/corrupt project versions, valid/malformed/unsupported manifests, project-relative paths, secret-bearing unknown fields, unavailable evidence, typed frontend invocation, page behavior, and Wiki integration. This 0I.1 foundation included no exporter, Unity automation, asset mutation, Alignment, live AI, or 0J behavior.

### 0I.2 Unity GroundTruth Exporter — COMPLETE

The editor-only `com.forgemind.unity-groundtruth` package adds **Tools > ForgeMind > Export GroundTruth** and writes the existing format-version `1` manifest without changing ForgeMind's native contract. It exports the Unity version; enabled Build Settings scenes and their hierarchy; component and MonoBehaviour types; serialized-field metadata without values; deterministic prefab references; ScriptableObject metadata; tags/layers; optional Input Actions; and discoverable test metadata without executing tests. Collections are bounded and deterministically ordered, identifiers and paths are portable, and safe coverage codes record unavailable or partial evidence.

ForgeMind's existing Unity page loads the generated manifest and shows its real aggregate counts. Game Wiki Technical now includes snapshot counts from the same normalized manifest summary. Focused package EditMode coverage is included for ordering, portable paths, hierarchy/components, serialized fields, ScriptableObjects, tags/layers, and malformed project metadata; the normal ForgeMind frontend/native checks remain required. No Unity GUI automation, PlayMode simulation, live AI, Alignment, or 0J work is included.

A user-driven private dogfood project export and mutation/revert check passed. ForgeMind loaded the real snapshot, reflected the one-GameObject/one-component mutation, and returned to baseline after the Unity change was reverted. The completed evidence is recorded in [Validation](VALIDATION.md#0i2-unity-groundtruth-exporter--completed).

### 0I.3 GroundTruth Coverage Transparency — COMPLETE

Real manifest evidence confirmed that the observed `10,000` serialized fields reached the exporter's existing per-category safety bound and that the sole issue was the existing `SERIALIZED_FIELDS_TRUNCATED` coverage code, not a separate exporter failure. ForgeMind now projects safe issue category/code/classification through its normalized boundary, renders the field total as `10,000+ / partial coverage`, and distinguishes bounded truncation, unsupported evidence, and actual errors without exposing observations, absolute paths, or raw unsafe data. The format-version `1` manifest schema and bounded exporter behavior are unchanged.

Exit condition met: ForgeMind can answer a bounded technical question using cited Reality evidence from the imported private dogfood project snapshot, including honest partial-coverage limits.

## 0J Alignment Engine — COMPLETE

### 0J.1 Alignment Engine Foundation — COMPLETE

ForgeMind now provides a manual-first Alignment workspace over existing sources: current non-deprecated Compendium knowledge or an `APPROVED` Decision supplies Intent, while current Git Reality and Unity GroundTruth projections supply selectable evidence. Explicit per-evidence assessments deterministically produce `ALIGNED`, `UNVERIFIED`, or `OUT_OF_SYNC`; selecting a distinct conflicting approved Decision produces `CONFLICT`. Every result begins `PENDING_REVIEW`, records rationale, confidence, uncertainty, source snapshots, and provenance in portable `.forgemind/alignment.json`, and can be approved or rejected without changing Compendium, Decisions, Git Reality, or Unity GroundTruth.

Game Wiki shows a compact read-only Alignment summary in the Intent source's existing Area. It remains an aggregation view, not another Alignment editor. 0J.1 performs no live AI inference, whole-project scan, background monitoring, semantic code analysis, task creation, or Feature Contract generation. Automated implementation and functional dogfooding are complete; the manual closure is recorded in [Validation](VALIDATION.md#0j1-alignment-engine-foundation--completed).

### 0J.2 Alignment Evidence Selection UX — IMPLEMENTED

Harden manual evidence selection for real projects with larger Reality catalogs. Existing evidence is grouped into Unity Components, Unity Scenes, Unity ScriptableObjects / other supported Unity evidence, Git Changed Files, and Git HEAD / Repository State. Keyword search, an All / Unity / Git filter, compact collapsed groups with total and selected counts, a dedicated Selected Evidence section, selected-only Assessment controls, and Deselect all keep the workflow usable without changing assessment or persistence semantics.

When the selected Intent title or statement shares an explainable normalized keyword with an evidence name or safe summary, the UI may show deterministic **Suggested evidence**. Suggestions are labeled as unverified relevance, prioritize Unity over Git repository-state evidence for Systems Intent, remain removable, and never select evidence automatically. This uses no AI, RAG, embeddings, new GroundTruth, or source mutation. This stayed within 0J; 0K did not start.

### 0J.3 Alignment Workbench UX and review-creation hardening — IMPLEMENTED

Reframe Alignment as a wide three-pane workbench with compact Intent context, ordered Reality discovery, and an always-available review pane that owns Selected Evidence, selected-only Assessment, rationale, uncertainty, confidence, validation, and creation feedback. Search and source filters precede deterministic suggestions; concise typed evidence identities replace repetitive raw summaries; search results render directly; and grouped browse-all evidence remains collapsed and unrendered until opened. Narrow windows retain a stacked fallback, while filtering never removes selected evidence from the review pane.

The blocking Create Pending Review report was traced to frontend state presentation rather than native persistence: validation-disabled primary actions inherited a wait cursor, no nearby validation reason was shown, and create failures appeared only at the page top. Creation now has a synchronous duplicate guard, local progress, local actionable safe failure that preserves inputs, explicit validation reasons, and immediate scoped success feedback. The existing native command, deterministic statuses, pending/approve/reject lifecycle, format-version `1` persistence, source immutability, and no-AI boundary remain unchanged. This stayed within 0J; 0K did not start.

### 0J.4 Alignment Search + Review History UX — IMPLEMENTED

Harden Alignment for larger real-project evidence and review histories. Reality discovery now has explicit Suggested, Search, and Browse modes; entering search shows matching compact evidence rows first and collapses deterministic suggestions to a summary. Rows prioritize source/type, evidence identity, a short safe observation, presence-only limits, and an explainable match reason without repeating raw source prose. The deterministic assessment is a compact Alignment preview, and users may explicitly record **No additional uncertainty** without changing the durable schema.

Create Review and Review History are separate subviews. Creation returns compact success feedback and a direct history action instead of injecting the full artifact below the form. Review History uses a compact selectable inbox with one detail pane for status, review state, Intent, timestamp, confidence, evidence, provenance, and pending approve/reject actions. A session-local count marks newly created reviews until Review History is visited; it adds no global or persistent notification system. Persistence, source immutability, deterministic statuses, pending/approve/reject lifecycle, provenance, and the no-AI boundary remain unchanged. This stayed within 0J; 0K did not start.

### 0J.5 Wiki Alignment Summary Clarity — COMPLETE

Clarify Game Wiki aggregation after functional dogfooding: Area navigation and headings now label Compendium, Decision, and AI Analysis content explicitly as entries, while the visually separate Alignment card identifies itself as a derived summary that is not included in those counts. The compact card reports the latest approved Alignment status when one exists plus approved, pending, and total review counts, and **View Alignment History** opens Alignment directly on Review History. Alignment reviews remain in their existing durable domain and are never expanded into Wiki entries.

Focused Wiki and shell regressions, the full frontend/native suites, and production builds passed headlessly. The already successful functional dogfooding remains the manual closure evidence for 0J; no replacement GUI pass is required for this bounded clarity polish. Compendium, Decision, Alignment, and Game Wiki authority boundaries are unchanged. This statement closed 0J; 0K is now current below.

Exit condition: after an approved decision changes Intent, ForgeMind can identify and explain why the existing Reality snapshot is aligned, unverified, conflicting, or out of sync without modifying either source.

## 0K Feature Contract — COMPLETE

### 0K.1 Feature Contract Foundation — COMPLETE

ForgeMind now has a Feature Contracts workspace backed by portable format-version `1` `.forgemind/feature-contracts.json`. Users may create a `DRAFT` from an approved Alignment Review, current Compendium entry, or approved Decision. Approved Alignment is preferred in the source list, while the native boundary rejects unapproved Alignment and Decision sources. Creation copies only Intent facts, reviewed Alignment status/rationale, and selected safe Reality evidence summaries; goal and all implementation scope remain manually editable.

Contracts store immutable source traceability, current Reality summary, affected systems, required behavior, exclusions, risks, acceptance criteria, deterministic tests, implementation notes, evidence-backed likely affected references, lifecycle status, and human review state. Approval is explicit and requires the implementation-ready core fields. `APPROVED`, `SUPERSEDED`, and `DEPRECATED` preserve history; source Compendium, Decisions, Alignment, Git Reality, and Unity GroundTruth remain unchanged.

Approved contracts expose **Copy as Implementation Brief**, mapped to the existing template and bounded by a stop condition. The renderer includes likely file/component locations only from captured selected Reality evidence and otherwise says that no location is established. Game Wiki shows a compact read-only Area summary outside its entry count and routes to the dedicated editor. No AI provider, automatic code change, task board, autonomous execution, whole-project contract generation, semantic code analysis, 0L, or future milestone behavior is included.

The first public-safe synthetic perception scenario is supported: an approved `UNVERIFIED` or `OUT_OF_SYNC` review can seed a manual bounded knowledge-handling contract. Automated validation and the completed user-driven visual/persistence closure are recorded in [Validation](VALIDATION.md).

### 0K.2 Feature Contract Production Workflow — COMPLETE

Feature Contracts now use a responsive delivery workbench: compact selectable contract history, a focused editor, and a separate review panel for captured source trace, current Reality, optional evidence-backed affected locations, and deterministic Implementation Brief preview. Draft titles are editable. **Save Draft** explicitly preserves incomplete reviewed work for later, while draft deletion requires inline confirmation and the native boundary refuses to hard-delete approved or historical lifecycle states. Save, approve, copy, delete, and lifecycle feedback stays beside the relevant action.

**Draft with AI** is an explicit, single-request proposal flow over the existing registered model/provider and usage-metering boundary. The request includes captured Intent, approved Alignment status/rationale, captured Reality evidence, and the current unsaved human fields. Output is strictly normalized into the bounded contract sections, rejects unsupported path-like content, remains transient, and cannot save or approve. Users may apply an individual section, apply only into empty sections, or discard the proposal; existing human text is never replaced by Apply All.

The Implementation Brief preview and clipboard action share one deterministic formatter covering goal, rationale, existing behavior/evidence, evidence-supported systems or locations, required behavior, non-goals, constraints/risks, tests, validation/manual-validation guidance, acceptance criteria, and stop condition. Game Wiki entry into the workbench exposes a contextual return action without generic browser-history infrastructure. Pending Alignment Review deletion was deliberately deferred because it is a separate Alignment-domain lifecycle change.

### 0K.3 Feature Contract Dogfooding Fix + UX Closure — COMPLETE

Private-project dogfooding showed later contracts stored as direct Compendium origins even though an approved Alignment with the same Intent title was available. Inspection found that the native Alignment creation path and the earlier Alignment-derived contract retained the full immutable trace; the later persisted records had entered creation as distinct Compendium sources. The source selector now exposes source type and status more clearly, its preview keeps authority/provenance visible, and the frontend rejects any returned draft whose origin does not match the selected source instead of silently presenting degraded trace data. Native regression coverage proves approved Alignment creation and reload retain the Alignment reference, underlying Intent, status, rationale, Reality evidence/provenance, and Reality summary without changing the Alignment record.

The creation surface is compact, and the workbench now uses bounded pane widths with intentional two-pane and stacked breakpoints. AI drafting has a local spinner, selected-model running label, elapsed time, and compact available model/latency/token metadata. The transient proposal is the primary review surface, is visibly separate from captured facts and Reality evidence, uses explicit **Apply**, **Applied ✓**, and **Replace with AI proposal** states, keeps Apply All feedback beside that action, and still never saves, approves, retries, or overwrites human text automatically.

Approval now requires only title, goal, required behavior, acceptance criteria, and deterministic tests. Affected systems, out of scope, risks, and implementation notes are optional. Implementation Brief preview and copy use the same formatter from one compact preview header; DRAFT briefs can be copied but begin with `DRAFT — NOT APPROVED`. Active/Archived/All filters keep lifecycle history available without permanently cluttering active work. Game Wiki summary actions use the shared button pattern, and returning from Feature Contracts restores the originating Wiki Area through lightweight shell state.

Automated validation is recorded in [Validation](VALIDATION.md). The final user-driven smoke passed approved-Alignment source trace, explicit AI Draft and running state, per-section Apply and Apply All, optional-field approval, Implementation Brief preview/copy, lifecycle protection, Game Wiki round-trip, and restart persistence. 0K is complete.

One non-blocking observation remains: a provider proposal may be rejected by the existing safety, path, or size validation. This is expected protection and was not weakened. A future bounded UX change should expose the safe rejection category more clearly when the native/provider boundary can do so without leaking raw or sensitive content.

Exit condition: the complete MVP demo flow produces an approved, cited contract and shows whether later implementation evidence satisfies its intent.

## IMP-1 Existing Project Knowledge Import — IMPLEMENTED, IMP-1.1/IMP-1.2 HEADLESS VALIDATED; MANUAL ACCEPTANCE PENDING

IMP-1 adds a bounded **Game Wiki -> Import Knowledge** path for an existing project. The user explicitly selects 1-10 project-contained `.md` files; native preflight rejects traversal, external paths, symlink escape, non-Markdown input, files above 128 KiB, and batches above 512 KiB rather than truncating silently. One confirmed Nebius Token Factory request asks the selected registry model, defaulting to NVIDIA Nemotron, for at most 30 strict `KNOWLEDGE`, `DECISION`, or `OPEN_QUESTION` candidates. Imported Markdown is framed as untrusted data and source IDs remain project-relative.

The transient Review Queue exposes confidence, `DOCUMENTED` trace, deterministic `NEW` / `POSSIBLE_DUPLICATE` / `EXISTING` / `REVIEW_REQUIRED` status, edit/skip/selection controls, and explicit batch **Apply Selected**. Apply uses the existing Compendium and Decisions owners: Knowledge and unresolved Open Questions preserve documented sources in Compendium; Decisions start `PROPOSED`; Wiki refreshes from those same stores; a later Lore Architect turn resolves imported narrative knowledge through the existing Project Brain path. There is no import truth store, `wiki.json`, automatic Canon, direct Wiki write, semantic/vector search, retry, multi-model call, or automatic Decision approval.

Offline coverage uses only the synthetic Aster Vale Colony fixture and mocked provider output. Focused native and frontend suites validate source safety, structured-output rejection, speculative-language protection, no-retry behavior, review/edit/deselect, duplicate defaults, no mutation before Apply, owning-domain provenance/lifecycle, idempotent repeated Apply, Wiki projection, and Writers' Room context retrieval. No live provider call or GUI automation occurred. Milestone closure still requires the short user-driven acceptance in [Validation](VALIDATION.md); this does not reopen the already-passed public-repository security/history gate.

The first controlled live extraction reached the visible running state, then returned to preflight without a Review Queue, explicit empty result, or visible error. IMP-1.1 replaces the inferred loading/preflight/candidate rendering with an explicit workflow phase: `RUNNING` can terminate only in `REVIEW_QUEUE`, `EMPTY_RESULT`, or `ERROR`. Source/model context is preserved in every terminal state, retry returns to a new confirmation, and an in-flight guard keeps one confirmation to one request. Safe native diagnostics and canonical usage distinguish an executed provider attempt from a request that was never sent without retaining provider content. The historical live payload and provider outcome remain **UNVERIFIED**; no raw response exists from which to claim a specific schema mismatch.

The second controlled extraction reached Nebius/Nemotron and IMP-1.1 correctly surfaced `INVALID_KNOWLEDGE_IMPORT_OUTPUT`. Its canonical content-free usage record reports `DESERIALIZATION_FAILED` / `INVALID_SCHEMA`, canonical root-key presence `candidates`, and no field-level or candidate-count evidence. IMP-1.2 therefore does not guess a harmless variation or loosen parsing. It aligns the compact prompt with every required field and exact enum, empty-array, no-wrapper, and no-extra-key rule, while splitting future diagnostics into content-free candidates-container, title, content, source-reference, confidence, note, type, section, unknown-source, unknown-field, bounds, and speculation categories. A fresh live recheck is required before any evidence-backed compatibility normalization or IMP-1 Manual PASS.

IMP-1 is deliberately smaller than Rebaseline. It imports reviewed Markdown knowledge only and does not inspect Reality, propose archival/deprecation/exclusion actions, rebuild Alignment, or ask a focused missing-Intent interview.

## Existing Project Rebaseline — FUTURE WORKFLOW, PLANNED, NOT STARTED

After 0K receives its required manual PASS, ForgeMind may add a safe [Rebaseline Existing Project](PROJECT_REBASELINE.md) workflow for re-onboarding a real project whose workspace also contains prototype or feature-validation data. The workflow is Reality-first, preserves domain authority and historical provenance, proposes keep/archive/deprecate/exclude actions for human confirmation, asks only about important missing Intent, and rebuilds derived Wiki and Alignment baselines without silently deleting or overwriting project-owned knowledge.

This is a non-milestone future-work entry. It remains not started. IMP-1's reviewed Markdown-only import does not start Rebaseline: no rebaseline UI, migration engine, automatic deletion, archival/exclusion proposal system, Reality rebuild, Git/Unity mutation, or Feature Contract behavior change is implemented.

## Context + Routing Shared Architecture - CR-0 SPECIFIED, IMPLEMENTATION NOT STARTED

The future [Context Builder and Task Router Architecture](CONTEXT_AND_ROUTING.md) defines how ForgeMind may classify a user intent, create a bounded Context Plan, assemble source-aware project context, route to a focused workflow or specialist, recommend a model from task-specific evidence, and expose a safe source trace for human review. Project Brain remains a logical aggregate over existing authoritative stores; the architecture creates no competing truth database.

CR-0 is documentation only. CR-1 shared typed planning and deterministic selection, CR-2 source trace/context preview, CR-3 specialist routing, CR-4 task-specific evaluation profiles, CR-5 natural-language **Ask ForgeMind** routing, and CR-6 optional semantic retrieval/advanced compaction are all planned and not started. No Context Builder, Task Router, model recommender, evaluation profile, embedding index, RAG system, provider integration, persistence file, or UI was implemented by CR-0.

This shared architecture may support future Specialists, Studios, AI drafting, technical analysis, and asset workflows, but it does not expand the current MVP. 0K, UI-1, and UI-2 are complete; UI-3 is implemented and headless validated; Rebaseline, UI-4 through UI-5, Studios S0 through S9, 0L, and CR-1 through CR-6 remain unstarted.

## Security & Privacy - SEC-0 SPECIFIED, IMPLEMENTATION NOT STARTED

[Security and Privacy Architecture](SECURITY_AND_PRIVACY.md) defines ForgeMind's local-first/BYOK security position, practical threat model, current-readiness audit, credential policy, AI Data Boundary, shared Security Preflight, Context Preview, deterministic Secret Guard direction, logging/redaction rules, prompt-injection boundary, and security validation strategy.

- **SEC-0 - Architecture/specification:** documented only; no application behavior changed.
- **SEC-1 - Provider Setup & Credential Diagnostics:** configured/missing state, safe credential source, setup instructions, and Re-check without displaying or storing a full key.
- **SEC-2 - AI Data Boundary / Context Preview:** exact source-aware outbound preview, provenance, omissions, and bounded task context integrated with CR-1/CR-2 rather than duplicate infrastructure.
- **SEC-3 - Basic Secret Guard:** deterministic known-secret scan, non-recoverable redaction, and blocking before an unsafe provider request.
- **SEC-4 - Security & Privacy Center:** factual provider status, project-data explanation, AI Data Boundary, and implemented security checks.
- **SEC-5 - Optional OS Credential Vault:** Windows Credential Manager, macOS Keychain, Linux Secret Service, or equivalent only if justified.
- **SEC-6 - Advanced policies:** possible organization policy, optional encrypted private storage, retention, and advanced provider controls.

SEC-1 through SEC-6 are planned and not started. Recommended hackathon candidates are SEC-1, SEC-2 when shared Context Builder work supports it cleanly, and SEC-3, but they must not displace the core demo flow, UI polish, or submission/video work. 0K, UI-1, and UI-2 are complete; UI-3 is implemented and headless validated; Rebaseline, CR-1 through CR-6, UI-4 through UI-5, Studios S0 through S9, 0L, and all security implementation remain unstarted.

## New Project Creator + Recommended Next Steps - NPC-2 COMPLETE

The beginner-friendly onboarding and explainable guidance contract is defined in [New Project Creator and Recommended Next Steps](NEW_PROJECT_CREATOR.md). It records two equal new- and existing-project paths into one Project Brain, a guided review-first Creator, deterministic recommendations that work without AI, and optional bounded AI refinement.

- **NPC-0 - New Project Creator specification - COMPLETE:** documentation only; no application behavior changed.
- **NPC-1 - Guided Creator Foundation - COMPLETE:** accessible eight-step flow, in-memory draft state, editable review, deterministic missing-field Open Questions, deferred directory selection, explicit initialization, and durable user-authored Compendium mapping through the existing native workspace boundary. Headless validation and the user-driven manual visual, validation, persistence, Recent Projects, and reopen checks passed. No AI call or Decision creation occurs.
- **NPC-2 - AI-assisted Game Foundation proposals - COMPLETE:** explicit Core Loop and Design Pillar proposal actions, strict structured output, bounded Creator-only context, safe regeneration/discard, additive human acceptance, accepted-origin provenance, provider/model/usage metadata, and offline manual fallback through the existing Nebius/model-registry/metering boundaries. The final NPC-2.2 live grounding/normalization recheck and focused form-alignment checklist passed. Five user-observed Nemotron successes provide raw task-specific evidence; they do not establish a general rate or winner. Pitch refinement was deferred.
- **NPC-2.1 - Creator AI UX, Grounding & Evidence Polish - COMPLETE:** the user verified preflight/Cancel, model selection, single-request execution, proposal Apply/edit/regeneration, AI History, World helper copy, Pillar application, Review, initialization, and persistence/reopen. Every paid request still requires confirmation; optional bounded assumptions stay review-only; responsive Creator polish remains in place.
- **NPC-2.2 - Creator grounding + form alignment patch - COMPLETE:** both Creator tasks require an explicit per-proposal grounding pass that generalizes or labels unestablished mechanics, resources, systems, roles, and rules without adding another provider request. Identity single-line controls use one fixed height, and desktop pillar labels/controls align from the top while narrow layouts stack. The final live recheck returned two valid proposals, surfaced unsupported or new mechanics separately as assumptions, and produced no invalid structured-output error. The existing optional zero-to-three assumptions schema, review-only authority, manual Creator behavior, and one-confirmation/one-request contract remain unchanged.
- **NPC-3 - Review -> initialize Project Brain - DELIVERED WITH THE AUTHORIZED NPC-1 SCOPE:** the originally separated review-to-initialization slice is now part of NPC-1 rather than a second implementation phase. No additional NPC-3 behavior was started.
- **NEXT-1 - Deterministic Recommended Next Steps - COMPLETE:** a frontend-derived typed model evaluates current Compendium, Decisions, session-observed Repository/Unity Reality, Alignment, and Feature Contract signals. Fixed precedence returns at most five advisory recommendations; Home shows at most three with plain-language reasons and routes only to existing workflows. Returning Home retains the current project, switching projects recomputes from the new project, and source-signal details remain internal. Recommendations are not persisted and make no AI/provider request, automatic Reality refresh, or project-truth mutation. **Manual PASS recorded 2026-09-28** for the complete updated NEXT-1.2 checklist.
- **NEXT-1.1 - Recommendation Actionability + Reality Connection UX - COMPLETE:** multiple missing Foundation fields now produce one **Complete Game Foundation** action while retaining one source signal per missing field. Existing Creator pillars remain the same `game_vision` Compendium entries and now have a first-class add/edit/deprecate section in Game Design. Git and Unity distinguish uninspected, connected, not connected, partial evidence, and error states; explicit native folder selection supports detached read-only sources, with project-scoped machine-local settings kept outside portable `.forgemind` truth. Disconnected sources recommend **Connect Repository** or **Connect Unity Project**; successful inspection removes those connection recommendations. Unity status/coverage and Git disconnected states use restrained semantic presentation. No AI, scoring, automatic scan, source mutation, UI-3, or dismissal system was added.
- **NEXT-1.2 - Detached Unity GroundTruth Semantics - COMPLETE:** portable Unity structure/version inspection follows the explicitly connected source, while project-owned `.forgemind/unity-groundtruth.json` and Unity Alignment evidence remain anchored to the active ForgeMind project. A foreign manifest is not adopted or treated as invalid active-project evidence; valid active-project manifests continue to load. Connected portable-only evidence recommends **Complete Unity GroundTruth**, valid coverage issues recommend **Review Partial Unity Evidence**, and Refresh is described only as read-only re-inspection. No import, exporter automation, evidence mutation, or adjacent milestone was added.
- **NEXT-2 - Optional AI recommendation refinement - PLANNED, NOT STARTED:** a future explicit bounded action may refine visible deterministic signals with source trace and human review. It may not route/select a model automatically, persist recommendations as truth, or execute work.

NPC-1 and NPC-2 are complete after their user-driven manual checks. Five real Nemotron Creator successes record exact latency/tokens, structured PASS, and human outcomes; one earlier structured failure remains recorded as safe-failure evidence. The sample is deliberately not converted into an acceptance percentage, general reliability claim, model score, or winner. NEXT-1.1 and NEXT-1.2 are complete after the user-driven recheck passed on 2026-09-28. NEXT-2 AI refinement is not implemented. Studios, the general Router, CR routing phases, SEC, Rebaseline, and 0L remain outside this milestone.

### Shared AI workspace direction

- **AIW-0 - Shared AI Workspace Foundation - COMPLETE:** one bounded project-scoped session, context, source-trace, profile-metadata, usage-reference, and proposal-review foundation for future creative and knowledge-oriented AI workspaces. `.forgemind/ai-workspace-sessions.json` is explicitly non-authoritative work history. It cannot write Compendium, Decisions, Open Questions, Wiki data, or another project; accepted proposals remain distinct from applied owning-domain actions.
- **WR-1 - Writers' Room MVP - IMPLEMENTED, HEADLESS VALIDATED; POST-FIX MANUAL RECHECK PENDING:** three runnable profiles, project-scoped session history, bounded Project Brain/session/Markdown context, credit-aware preflight, registry model selection, strict source-backed structured responses, canonical usage references, and explicit reviewed proposal application through Compendium or Decisions owning APIs. Conversation and Markdown remain non-authoritative; Decisions begin `PROPOSED`. One live Lore Architect provider/persistence success is recorded; its immediate-render failure led to WR-1.2.
- **WR-1.1 - Session creation / restore / rendering reliability - IMPLEMENTED, HEADLESS VALIDATED; MANUAL RECHECK PENDING:** the typed boundary now hydrates omitted optional collections from format-version `1`, isolates unsafe render records, preserves unknown-profile history without allowing it to run, selects the newest active session deterministically, and keeps loading/error/create states usable. The duplicate empty-state CTA and transparent dialog-surface regressions are fixed. The two observed blank-screen paths still require the bounded desktop/restart recheck in [Validation](VALIDATION.md); WR-1 Manual PASS is not recorded.
- **WR-1.2 - Live response render reliability + session lifecycle UX - IMPLEMENTED, HEADLESS VALIDATED; MANUAL RECHECK PENDING:** live run results now pass through the same AI Workspace normalizer as persisted reloads, with reload-only recovery if a saved successful result cannot be rendered. The Writers' Room surface, session rail, and conversation are independently bounded; the composer stays intrinsic. Archive remains reversible, while confirmed Delete removes only project-scoped non-authoritative session history through the native owning boundary and leaves previously applied project truth intact. See [Validation](VALIDATION.md) for the observed live run and post-fix checklist.
- **WR-1.3 - Narrative Context & Guided Lore Workflow - IMPLEMENTED, HEADLESS VALIDATED; MANUAL DEMO PASS PENDING:** the existing Context Plan now assembles bounded deterministic narrative context from relevant Compendium knowledge, approved narrative Decisions, unresolved Open Questions, explicit project-contained Markdown, and recent conversation while excluding technical/Reality/delivery sources by default. Guided Lore behavior remains prompt-driven: establish known context, identify gaps, ask focused string questions before over-inventing, and return durable proposals only after concrete user direction. Pending or accepted unapplied proposals can be explicitly reviewed and edited before Apply; the edited text is persisted in non-authoritative session state and the owning domain receives it only on Apply. Applied knowledge is re-resolved from Project Brain on the next turn. No semantic/vector search, Tavily, Knowledge Import/Rebaseline, Chronicler, general Router, or live provider call was added.
- **WR-1.3.2 - Provider-enforced structured output + safe failure diagnostics - IMPLEMENTED, HEADLESS VALIDATED; LIVE RECHECK PENDING:** the Token Factory request sends `response_format: { "type": "json_object" }` only for the explicitly capable registered Nemotron model. Unsupported models receive no format field. Failed normalization adds content-free structural diagnostics to the canonical usage record without persisting raw provider output, arbitrary unknown keys, project text, or hidden reasoning. One confirmation still makes one request; there is no automatic repair, retry, or model fallback.
- **WR-1.3S - Restore live-proven Writers' Room response contract - COMPLETE; LIVE MANUAL PASS RECORDED:** after three real Nemotron responses failed the expanded WR-1.3 contract, including one JSON-object-mode attempt, the provider contract returns to the previously live-proven WR-1.2 shape: `message`, zero-to-three string `questions`, supplied-only `sourceRefs`, and bounded strict `proposals`. Provider-authored phase and nested question metadata are no longer required or displayed. Narrative Context, profile-aware relevance, context preflight, duplicate suppression, proposal Review/Edit/Apply, next-turn Project Brain refresh, JSON-object enforcement, and safe diagnostics remain. Existing format-version `1` sessions with WR-1.3 metadata remain readable without a version bump. The user confirmed the stabilized live validation passed before TAV-1; detailed run metrics were not supplied and are not inferred.
- **TAV-1 - External Research in Writers' Room - IMPLEMENTED, HEADLESS VALIDATED; FIRST LIVE WORKFLOW RECORDED:** one explicit **Research web** confirmation makes one native Tavily Basic Search request for at most five normalized HTTP(S) sources. Selected `EXTERNAL_RESEARCH` joins Project Brain in the existing Context Plan and supplied-only source validation, while preflight names Tavily separately from Nebius Token Factory/NVIDIA Nemotron. The first live workflow succeeded across Tavily retrieval and Nemotron synthesis but exposed the TAV-1.1 relevance/UX issues below. Bounded source snapshots and research-run metadata reuse non-authoritative AI Workspace session history; `TAVILY_API_KEY` remains native-only. Search, synthesis, and proposal generation never mutate project truth; only the existing reviewed Apply boundary can do so. No automatic retry, Tavily answer/raw content, Crawl, Extract, semantic retrieval, autonomous loop, Router, Chronicler, or Knowledge Import/Rebaseline is included.
- **TAV-1.1 - External Research UX + Query Reliability - IMPLEMENTED, HEADLESS VALIDATED; MANUAL VISUAL/RESTART RECHECK PENDING:** the exact editable dialog value is forwarded without query rewriting to the typed native request and Tavily payload after outer-whitespace trimming, and the persisted source snapshot exposes that query in a compact right-side drawer. The first live workflow proved Tavily retrieval, external provenance, provider-separated preflight, and Nemotron synthesis, but returned low-relevance software-design sources for the intended tactical-game question. The audited ForgeMind query path contained no stale, fallback, truncation, field, or serialization defect, so TAV-1.1 does not claim Tavily relevance was fixed. Research now has a distinct external-action treatment; Context and Research drawers are mutually exclusive; selection changes the next Context Plan/token estimate; and sanitized HTTP(S) sources open through a narrow native default-browser command. Existing sessions and applied proposals remain visible; use a fresh session for the bounded recheck.
- **OPT-1 - AI Workspace / Writers' Room Hardening & Code Health - COMPLETE:** the existing React normalization boundary now also enforces native collection caps, rejects cross-project and duplicate session records, and filters canonical usage metadata by project and narrative task before rendering. Writers' Room uses indexed session/profile lookup, safe error shaping, and the shared twenty-source capacity without double-counting selected Markdown. All referenced design tokens resolve. This pass changed no product-truth, provider, proposal/apply, or milestone behavior; WR-1's manual recheck remains pending.
- **CHR-1 - Wiki Chronicler Read:** Project Brain navigation and retrieval with source authority visible.
- **CHR-2 - Wiki Chronicler Edit Proposals:** source-traced edit proposals that require human review before any owning-domain write.

Writers' Room reuses AIW-0 rather than creating separate context, provider, or proposal frameworks. Chronicler must reuse the same foundation in a later explicit phase. Every durable edit remains **proposal -> human review -> explicit owning-domain action -> project truth**. CHR-1 and CHR-2 remain planned and unimplemented; WR-1 does not start either phase, a general Router, or a Studio milestone.

## UI / UX Redesign Direction — UI-1 COMPLETE

The agreed future interface and brand direction is documented in [ForgeMind UI Direction](UI_DIRECTION.md) and the [ForgeMind Brandbook](BRANDBOOK.md). This is a planned presentation and workflow-consistency track, not a new source of product truth and not a claim that the current application already matches the designs.

0K, UI-1, and UI-2 are complete. UI-3 is implemented and headless validated, with manual responsive/visual closure still pending. The UI track uses shared presentation primitives without authorizing a future core product milestone, Suite information-architecture migration, or behavior rewrite.

### UI-1 — Brand / Design System Foundation — COMPLETE

Define shared color, typography, icon, card, button, badge, spacing, focus, and motion tokens; integrate the original ForgeMind FM identity; and polish the sidebar shell without changing feature ownership or navigation behavior.

Implemented: semantic CSS tokens, typography and spacing scales, shared surface/button/badge/loading/feedback/empty-state primitives, a single dependency-free line-icon convention, responsive shell reflow, normalized page headers, light adoption in representative workflows, and original production SVG mark/wordmark/lockup assets. The asset follow-up also adds navigation metadata and restrained global/contextual grouping in preparation for a future Suite switcher, without changing routes or implementing Studios. Automated validation and the completed UI-1 manual visual pass are recorded in [Validation](VALIDATION.md).

### UI-2 — Workspace Home — COMPLETE

The pre-project launcher is a restrained Workspace Home with approved ForgeMind identity, clear **Start New Project** and **Open Existing Project** actions over the existing directory-inspection/initialization path, up to three recent-project cards with neutral branded fallback treatment, and a first-class **Recommended Next Steps** region. Raw filesystem paths remain secondary technical metadata.

A bounded format-version `1` registry in application-local webview storage retains only project path, project ID, name, and last-opened timestamp for up to six workspaces. Valid opens update recency; duplicate identity/path entries collapse; malformed data recovers to empty; and an inaccessible recent path is removed safely. An explicit workspace-level **Home** action above project context returns an open project to Workspace Home without invoking the picker or initialization; the current loaded project now also supplies NEXT-1 recommendations without requiring reopen. **Open another project** remains as the direct directory-picker shortcut. NEXT-1 reads existing project domains, retains only session-observed Reality results, and adds no project-content copy, `.forgemind` mutation, database, cloud service, thumbnail generation, live AI, task store, or Suite/router redesign. UI-2's launcher validation and the later NEXT-1 recommendation/Reality recheck are complete; evidence is recorded in [Validation](VALIDATION.md).

### UI-3 — Project Overview Dashboard — IMPLEMENTED, HEADLESS VALIDATED; MANUAL CHECK PENDING

Project Overview is now the current-project control room. A concise identity header, up to five recommendations from the unchanged NEXT-1 engine, and compact **Intent ↔ Reality ↔ Alignment** signal groups derive Foundation gaps, Decision/Open Question lifecycle counts, session-known Repository and Unity state, actionable Alignment counts, and Feature Contract lifecycle counts from existing owning domains. Every action routes to an existing workspace. The view makes no provider request, persists no dashboard state, and performs no automatic Git/Unity inspection or Alignment rebuild. Workspace Home remains the application/project launcher with its compact top-three guidance.

Recent Activity is deferred: current domains expose useful record timestamps but no consistent cross-domain event contract, and UI-3 does not infer an audit feed from mixed create/update/review semantics. AI Insights are also deferred from this deterministic local dashboard rather than mixing non-authoritative AI history into Project Signals without a separately scoped contract. No health percentage, task database, event store, placeholder page, or new native boundary was added. Automated evidence and the pending `1180×760`, fullscreen, and `760×560` manual checklist are recorded in [Validation](VALIDATION.md).

### UI-4 — Game Wiki / Knowledge Explorer — IMPLEMENTED, HEADLESS VALIDATED; MANUAL CHECK PENDING

Game Wiki is now the primary human-readable browser over existing project-knowledge owners. Its wide layout separates derived categories, compact search results, and selected detail; compact layouts stack those panes without horizontally squeezing content. Deterministic local search combines category, type, authority/provenance, and lifecycle filters. Current knowledge is prioritized while unresolved questions, proposed Decisions, deprecated/superseded history, and non-authoritative Specialist analysis remain explicitly distinct.

The Wiki remains a read-only aggregate over Compendium, Decisions, Specialist History, and existing derived summaries. It creates no `wiki.json`, provider call, semantic index, import/rebaseline structure, or project-truth mutation. Knowledge and Open Questions route to Game Design, Decisions route to their owner, and the existing Alignment, Feature Contract, Specialist, Repository, and Unity workspaces remain the stable review/edit destinations. Repository and Unity summaries consume only explicit session-known inspection results; opening the Wiki performs no scan. Automated evidence and the pending `1180×760`, fullscreen, and `760×560` manual checklist are recorded in [Validation](VALIDATION.md). The broader consistency pass for other workspaces remains future scope.

### UI-5 — Full Screenshot UX Audit — PLANNED, NOT STARTED

Review empty, loading, running, success, warning, error, history/detail, dialog, compact, and wide states across the major workspaces, then perform one consolidated consistency and polish pass. Record manual visual sign-off separately from automated behavior validation.

## ForgeMind Studios — FUTURE PLANNED, NOT STARTED

ForgeMind Studios are future task-oriented specialist workspaces over one shared Project Brain, context-builder, provider/model, proposal-review, provenance, and human-approval framework. They must not create independent agent truth stores or make AI output authoritative without explicit promotion or approval. The durable direction and phase requirements are defined in the [ForgeMind Studios Roadmap](STUDIOS_ROADMAP.md).

The recommended sequence is S0 shared framework planning; S1 Lore; S2 Design; S3 Test; S4 Encounter; S5 Balance; S6 Documentation; S7 Asset; S8 Implementation / Technical; and S9 the unified Ask ForgeMind router. Exact ordering may change only through explicit roadmap prioritization. Lore is the strongest early reuse candidate; Asset remains post-MVP/experimental because it adds provider, licensing, import, and verification complexity.

No Studio phase has started. This direction does not expand the current MVP or authorize Studio implementation. 0K, UI-1, and UI-2 are complete, and the existing Intent -> Reality -> Alignment -> Feature Contract -> Implementation Brief loop remains the completed core workflow.

## Stretch milestones — NOT COMMITTED

- **Unity Doctor** — explain selected Unity project-health findings from evidence
- **Drift Detection Enhancements** — broaden comparisons beyond the bounded demo scenario
- **Hosted delivery handoff** — submit an approved scoped brief to an external delivery integration without turning ForgeMind into an autonomous executor
- **GitHub PR Integration** — connect contract and alignment context to hosted review
- **Patch Generation** — propose small, inspectable changes without autonomous acceptance
- **Test Execution** — run selected tests and attach evidence to contracts or findings
- **Model Evaluation Profile / Local Task Recommendations** — aggregate actual ForgeMind Specialist runs and explicit human evaluations by task type, with visible sample counts and local-evidence wording. Any recommendation must be labeled **Recommended from local project history**, may differ by task type, and must remain unavailable when evidence is insufficient; never declare a universal best model or route tasks automatically.
- **Real-time Team Collaboration** — add hosted synchronization and permissions after Git-based workflows are proven

## Post-1.0 product directions — NOT COMMITTED

These directions are separate from hackathon MVP requirements and begin only after the 0I -> 0J -> 0K path is successfully closed:

- **New vs Existing Project onboarding extensions** — evolve the specified equal structured-intent and evidence-first paths after their bounded Creator and Rebaseline phases, with explicit provenance.
- **AI Studio consolidation** — host specialist profiles and Model Evaluation / Model Lab without filling the main navigation or creating specialist truth silos.
- **Open Questions** — lightweight `OPEN` / `RESOLVED` / `DEFERRED` knowledge linked to resulting Decisions.
- **Lightweight Current Priorities** — project/design focus with optional ownership and target milestone, not sprint management.
- **Technical Knowledge / code documentation** — Wiki aggregation over system purpose, important code, dependencies, tests, Decisions, Reality, status, and gaps while reusing established documentation generators.
- **Team foundations** — evolvable author, owner, reviewer, approval, and discipline concepts without prematurely implementing accounts, RBAC, cloud sync, or real-time editing.
- **Local model recommendations** — task-specific recommendations from actual ForgeMind runs and explicit human evaluation with visible sample counts; never a universal best model.
- **Delivery integrations** — hand implementation tasks and execution state to GitHub, Linear, Jira, or similar tools instead of building a full task-management suite.

Stretch work begins only after 0K satisfies the MVP completion test. Ordering follows demonstrated user value and technical risk.
