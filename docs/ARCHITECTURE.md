# Architecture Direction

## Current state

0J Alignment and 0K Feature Contracts are **COMPLETE**. UI-1 and UI-2 are complete. NPC-1 is implemented and headless-validated with manual validation pending. Feature Contracts combine portable reviewed lifecycle history, explicit AI-assisted proposals, deterministic implementation-brief preview/copy, and compact Game Wiki context. The UI foundation adds shared presentation primitives and Workspace Home; NPC-1 adds a deterministic manual-first Creator over the existing workspace and Compendium boundaries. NPC-2 AI Assistance, Recommended Next Steps, automatic execution, background generation, monitoring, semantic code analysis, UI-3, 0L, the consolidated information architecture, additional specialists, team services, and the other post-1.0 concepts below are **NOT IMPLEMENTED**.

## Architectural stance

ForgeMind is intended as a desktop-first orchestration and interpretation layer over a local game repository. The repository remains authoritative for durable project files; Git provides durable history; Unity supplies evidence about Reality. ForgeMind owns neither the underlying game project nor its development tools.

The current desktop shell uses Tauri 2 with React and TypeScript. The UI receives no generic filesystem, shell, or network access: it invokes narrow workspace, Repository Reality, Unity GroundTruth, Alignment, Feature Contract, model-registry, aggregate-usage, evaluation, interview, Compendium, Decision, and specialist commands. The native layer owns validation and file access under `.forgemind`, fixed-argument Git inspection for the active workspace, provider credentials, outbound inference HTTP, and ForgeMind's application-global usage history.

The boundaries below describe responsibilities, not services, deployable processes, or a production-scale architecture.

## Conceptual modules

### Desktop UI

Provides local workspace selection, navigation, discussion, evidence inspection, comparisons, and explicit review/save/approval actions. It presents distinctions such as draft versus durable knowledge and evidence versus inference.

UI-2 adds a pre-project Workspace Home over the existing directory selection, native inspection, and explicit initialization flow. Its recent-project registry is launcher metadata stored in the Tauri webview's application-local storage, never in a project's `.forgemind` directory. The format-version `1` registry is bounded to six entries and stores only project path, portable project ID, display name, and last-opened timestamp. Opening or initializing a valid workspace updates recency; duplicate paths or project IDs collapse to one entry; malformed data resets safely; and an inaccessible recent path is removed without blocking Home. The page renders at most the three most recent cards with neutral CSS/line-icon fallback artwork. It does not duplicate project content, scan folders, generate thumbnails, or create a new native filesystem capability.

NPC-1 keeps the full Creator draft in React application memory. **Start New Project** enters the Creator without invoking the directory picker, while **Open Existing Project** retains the existing picker/inspection behavior. Back/Next/review editing preserve the draft; cancellation creates nothing; and a failed initialization keeps the draft and selected-directory context available for retry during the session.

After reviewed creation, the UI supplies one typed `ProjectFoundationInput` to the existing `initialize_workspace` command. The native layer validates the entire foundation before creating files, uses the working title for portable project identity, and writes user-authored Intent into the existing format-version `1` Compendium. It refuses existing project metadata and existing orphaned Compendium data. If the Compendium write fails after new project metadata was created, it removes only the files created by that operation. This boundary does not expose generic filesystem access, invoke a provider, create a Decision, or introduce `creator.json` / `wiki.json`.

### Local Workspace Metadata

Inspects and validates the minimal portable project identity, or creates it only after explicit user action. The native boundary can access only ForgeMind's `.forgemind/project.json` contract for these operations; it does not expose generic file reads or writes to React, scan game files, or overwrite existing metadata.

### Project Knowledge / Intent

Reads and writes portable, human-readable project knowledge: design, narrative, technical constraints, roadmap scope, Systems, and Feature Contracts. It defines project concepts independently of storage format and UI framework.

### Decision History

Maintains attributable decisions, rationales, approvals, relationships, and supersession chains. It identifies the current applicable decision while preserving prior decisions rather than mutating history away.

### Alignment Engine

**COMPLETE 0J.1.** The Alignment workspace loads current non-deprecated Compendium entries and `APPROVED` Decisions through their existing native domains; it never copies or replaces those truth sources. It projects current Git HEAD, working-tree, changed-file, and recent-commit metadata plus validated Unity GroundTruth snapshot and component-type presence as bounded selectable evidence. Component presence proves presence only, never runtime behavior.

The user explicitly assesses selected evidence as supporting, contradicting, or insufficient. Native deterministic rules yield `ALIGNED` only when all selected evidence explicitly supports Intent, `UNVERIFIED` when any evidence is insufficient, `OUT_OF_SYNC` when any evidence explicitly contradicts, and `CONFLICT` when a distinct approved Decision is selected as conflicting Intent. `UNVERIFIED` and `CONFLICT` are capped at low confidence. Every result starts `PENDING_REVIEW`, carries rationale and mandatory uncertainty, and preserves `DOCUMENTED`, `APPROVED_INTENT`, `VERIFIED_FROM_GIT`, `VERIFIED_FROM_UNITY`, and `MANUAL_ASSESSMENT` provenance. AI is not invoked; `AI_INFERENCE` remains reserved and may never masquerade as verified evidence.

**IMPLEMENTED 0J.2.** Evidence discovery remains a UI projection over the existing immutable catalog: safe summaries are grouped by stable Git/Unity evidence identifiers, searched locally, and filtered by source. The Unity projection exposes existing manifest scene and ScriptableObject observations alongside component-type presence; it does not create observations or modify GroundTruth. Suggested evidence is a deterministic normalized-word intersection between selected Intent text and evidence summaries, is visibly non-authoritative, and never changes selection without a user action. Alignment persistence and deterministic assessment remain unchanged.

**IMPLEMENTED 0J.3.** The desktop UI presents that projection as a responsive three-pane workbench. Evidence identity, type, provenance, and presence-only limits are concise presentation derived from the existing safe candidate contract; raw source summaries remain unchanged for persistence and review history. Browse groups render their rows only after explicit expansion, while search renders only matching compact rows and the selected set remains independent from filters. The right pane bounds selected-evidence scrolling so rationale and creation controls remain locally available. Creation uses a frontend-only in-flight guard plus scoped validation, progress, error, and success state; it still invokes the same single native `create_alignment_review` command and does not introduce optimistic persistence, retry, background work, or AI.

**IMPLEMENTED 0J.4.** Evidence discovery exposes explicit Suggested, Search, and Browse modes. A non-empty query activates Search, renders matches before a collapsed deterministic-suggestion summary, and preserves the independently selected evidence set. Suggested and search rows derive compact source/type/name/summary/match-reason presentation from the immutable candidate contract. Create Review and Review History are separate local subviews; history is a selectable list plus detail pane over the same durable results, and pending approve/reject actions continue to use the existing narrow native command. Newly created reviews increment a component-session count until history is opened. The badge is not persisted and creates no application-wide notification boundary. Explicit **No additional uncertainty** is serialized as a meaningful non-empty uncertainty statement so format-version `1` and native validation remain unchanged.

**COMPLETE 0J.5.** Game Wiki entry counts cover only its Compendium, Decision, and AI Analysis rows. The Area-scoped Alignment card is visually and textually identified as a derived summary outside that count, derives approved/pending/total review counts and the latest approved status from the existing read-only result collection, and routes to the existing Alignment Review History subview. It does not copy reviews into Wiki rows or alter any source or persistence contract.

The native layer writes a human-readable format-version `1` `.forgemind/alignment.json` document containing portable source references and captured summaries, never absolute paths or credentials. Approval or rejection updates only the review state; rejected results remain historical and original Intent and Reality files are unchanged. Game Wiki reads a compact Area-scoped summary from this domain but exposes no Alignment editing. There is no whole-project scan, background monitoring, code semantic analysis, RAG, task creation, or Feature Contract generation.

### Feature Contracts

**IMPLEMENTED 0K.1, MANUAL VALIDATION PENDING.** The Feature Contracts workspace offers approved Alignment Reviews first because they bind Intent to selected Reality evidence, while current non-deprecated Compendium knowledge and `APPROVED` Decisions remain valid direct sources. Unapproved Decisions and unapproved Alignment Reviews are rejected by the native boundary. Creation captures only source title/statement/status/provenance, approved Alignment status/rationale, and selected safe Reality evidence summaries; implementation scope remains human-reviewed.

The native layer stores a human-readable format-version `1` `.forgemind/feature-contracts.json` document. Each contract has stable identity and timestamps, immutable captured source trace, goal, current Reality summary, affected systems, required behavior, exclusions, risks, acceptance criteria, deterministic tests, implementation notes, evidence-backed likely affected references, lifecycle status, and human review state. New contracts start `DRAFT`; `APPROVED`, `SUPERSEDED`, and `DEPRECATED` are explicit lifecycle transitions. Only drafts are editable, approval requires the implementation-ready core fields, and free text rejects absolute machine paths and common credential material.

The deterministic Implementation Brief formatter maps a reviewed contract to `docs/templates/IMPLEMENTATION_BRIEF.md`: Goal, Why this matters, existing behavior/evidence, evidence-supported likely locations and user-scoped systems, required behavior, non-goals, portable data/security constraints, tests, acceptance criteria, and a bounded stop condition. Formatting itself uses no AI and never invents a file path when captured Reality does not support one. Contracts are the preferred handoff to Cursor, Codex, or another coding agent, but do not authorize autonomous execution. Their implementation claims remain subject to refreshed Reality and Alignment review.

Game Wiki shows one compact read-only Area summary with approved/draft/total counts and the latest approved contract. It does not duplicate the editor or count contracts as Compendium/Decision/AI Analysis entries. There is no task board, automatic code change, autonomous execution, whole-project contract generation, live AI requirement, or semantic code analysis beyond existing Reality evidence.

**IMPLEMENTED 0K.2, MANUAL VALIDATION PENDING.** The desktop surface is a responsive three-column workbench: compact lifecycle history, draft editor, and review panel. Draft titles and implementation fields remain editable only while `DRAFT`; only drafts may be hard-deleted, after explicit confirmation. Approved, superseded, and deprecated artifacts remain durable and use lifecycle actions. The Implementation Brief preview and copy action call the same deterministic frontend formatter, while source trace and optional likely-affected selection remain projections over immutable captured references.

The explicit `draft_feature_contract_with_ai` command validates workspace/project/contract identity, requires a draft and an enabled registry model, constructs a bounded request from captured Intent, approved Alignment, captured Reality, and current human fields, then calls the existing metered provider boundary once with task category `feature_contract`. Its strict normalized result is transient and path-free: it is never written to `.forgemind`, never applied automatically, never retried, and never approved. React can apply one reviewed section or fill only empty sections; persistence still occurs only through the existing explicit draft-save command.

### AI Provider Boundary

Accepts the small normalized `AIRequest` contract and returns `AIResponse` with response text, model identity, measured latency, and optional provider-reported token counts. `AIProvider` is a Rust trait; `NebiusTokenFactoryProvider` is its current production adapter and `MockAIProvider` supplies deterministic offline test behavior. Nebius request and response structures remain private to the adapter.

React invokes `run_ai_evaluation` and cannot supply or retrieve a credential. The native provider reads `NEBIUS_API_KEY` from its process environment immediately before an explicitly requested evaluation and sends it as a bearer token to the official Token Factory chat-completions endpoint. Errors cross the command boundary as controlled codes and safe messages; provider bodies, headers, and keys do not. The evaluation command rejects models that are not enabled in the native registry.

Project Interview, AI Behavior Designer, and Feature Contract drafting reuse this registered/metered boundary through task-specific native commands. Feature Contract drafting makes one explicit request, stores no prompt or raw response in project data, and returns only the validated proposal plus safe usage metadata.

The harness makes no request on startup and performs no polling or automatic retry. Prompt and response bodies remain transient. Its conservative UI default output cap is 128 tokens; the explicit headless smoke uses 256 combined visible and reasoning tokens. This is an evaluation facility, not the AI Project Interview or a project-knowledge workflow.

### Model Registry and Usage Metering

The Rust model registry is the authoritative configured-model location. Each entry carries provider and model identity, display metadata, availability, enabled state, optional notes, optional explicit per-million-token pricing, and a small optional capability record for maximum completion tokens, reasoning-effort support, and structured-output support. Missing capability values remain Unknown. Duplicate IDs fail registry validation, unknown or disabled IDs fail before a provider request, and no provider discovery or automatic routing occurs.

The configured Nebius Token Factory entries are DeepSeek V4.1 Flash and NVIDIA Nemotron 3 Super 120B. Both have been used through explicit user-authorized Token Factory requests, including a successful normalized Nemotron Specialist run. That evidence is too small to support a universal or task-level model recommendation; Nemotron pricing and unverified capability fields remain Unknown.

Desktop and headless evaluations share one registered-and-metered service. Each attempt creates a minimal `UsageRecord` containing timestamp, session ID, optional portable project ID, provider, model ID, optional task category, provider-reported token counts, latency when available, optional estimated cost, success, and a controlled error category. The schema has no prompt, response, credential, or authorization fields.

Records use append-only JSON Lines in ForgeMind's per-user application data (`%LOCALAPPDATA%\ForgeMind\usage-v1.jsonl` on Windows), never in `.forgemind/project.json` or another game-project path. Aggregation is computed locally for the current process session, selected project, and model. Cost is labeled estimated and exists only when both token counts and explicit registry pricing are available; it is not provider billing.

### Project Interview

The React interview flow owns only transient interaction state: current section and question, the user's unsaved answer, and pending review decisions. Starting an interview is deterministic and makes no provider request. Each explicit **Next** action calls the native `run_project_interview_turn` boundary once.

The native prompt builder supplies the dedicated, testable interview system prompt plus compact JSON context containing the current section, current question, current answer, and at most eight prior candidate statements. It selects a model through the existing registry and invokes the same metered provider service with task category `project_interview`. Each turn retains `minimal` reasoning and a bounded 1,200-token completion allowance because provider reasoning tokens share that budget. There is no background call, automatic retry, routing, RAG, or full-conversation resend.

Provider text is parsed as a strict, bounded JSON turn containing only the next section, one concise next question, and zero to three candidates. Unknown fields, invalid enums, a fourth candidate, malformed question transitions, and invalid lengths are rejected before reaching React or persistence. Accepted candidates receive ForgeMind-owned identifiers and preserve `USER_STATED`, `AI_INFERRED`, or `UNRESOLVED` provenance plus the small `DIRECTION`, `LOCKED`, or `TBD` vocabulary.

Persistence is a separate explicit command. The native layer revalidates the selected workspace, filters reviewed candidates to `APPROVE`, and writes versioned human-readable `.forgemind/interview.json`. The file contains portable project ID, approval time, model ID, and approved candidates only—never workspace paths, prompts, answers, raw provider output, reasoning, credentials, or headers. Existing data is opened read-only unless the user explicitly confirms a replacement flow.

### Game Compendium and Decisions

The Game Compendium is current project knowledge, not interview history or Decision history. React loads and mutates it only through narrow native commands. Rust validates the workspace identity and versioned schema before writing human-readable `.forgemind/compendium.json`. Entries use a bounded section vocabulary, the `DIRECTION` / `LOCKED` / `TBD` / `DEPRECATED` status set, explicit provenance/source, stable UUIDs, and timestamps.

Interview import is an explicit command. It reuses the validated interview loader, preserves the supported candidate status and provenance, maps the bounded interview areas into Compendium sections, retains `.forgemind/interview.json`, and skips exact title-plus-statement duplicates. Startup never imports or mutates knowledge.

Game Wiki is a React aggregation over the existing Compendium, Decisions, Specialist Analysis History, compact Alignment summaries, and compact Feature Contract summaries. It groups references by the established Compendium Area vocabulary and does not add a file, schema, or competing source of truth. Compendium knowledge, approved and non-approved Decision states, AI analysis, derived Alignment, and derived delivery contracts retain distinct authority and review labels. Keyword search and the All/Knowledge/Decisions/AI Analysis filter operate only over the established row sources; Alignment and Feature Contracts remain separate summary cards outside entry counts. Knowledge edits route to the existing Compendium editor, while Alignment and Feature Contract editing stay in their workspaces. The optional 0H Technical/Production card reads the transient Repository Reality boundary separately and never inserts changed files into Wiki rows or project knowledge.

Future Game Wiki aggregation may also project richer GroundTruth, Open Questions, and generated or imported technical documentation through their own boundaries. The source domains remain authoritative; the Wiki does not gain a `wiki.json` persistence layer. Imported existing-project material must preserve whether it is verified Reality evidence, documented Intent, AI inference, or unresolved.

A stored successful specialist finding can enter project knowledge only through the explicit native promotion command. The user edits Area, title, statement, and status and confirms before persistence; Rust verifies the finding against the unchanged stored run, applies the existing exact title-plus-statement duplicate rule, and writes one Compendium entry with `AI_INFERRED` provenance and `specialist_analysis` source. The command never creates a Decision or mutates Specialist Analysis History.

Decisions use an independent native domain and `.forgemind/decisions.json`. Every Decision requires a non-empty rationale and begins `PROPOSED`; only a separate approval command makes it `APPROVED`. Knowledge promotion pre-populates a proposed Decision and explicit relationship but does not modify the source entry. A proposed successor may reference one active approved predecessor. Approving it atomically marks the predecessor `SUPERSEDED` and retains both records. The 0F author is the explicit local label `Local User`; accounts, permissions, and version-history UI are deferred.

### Shared Project Brain and Specialist Profiles

The 0G `SpecialistProfile` abstraction is a small native configuration containing identity, description, supported tasks, default task, deterministic task-area guidance, and a centralized system prompt. Exactly one profile exists: AI Behavior Designer. React lists public profile metadata and provides a responsive two-pane structured workbench rather than chat.

Each run supplies selected Compendium and Decision IDs plus an explicit scenario. Native code revalidates workspace identity, resolves only those references, excludes deprecated knowledge, accepts only `APPROVED` Decisions as authoritative context, and builds a compact prompt. The request uses an enabled registry model, `minimal` reasoning, temperature `0.2`, no retry, and `ai_behavior` metering. 0G.4 defines task preferences from 3,200 to 5,200 tokens, with 4,600 for `REACTION_MODEL`. 0G.6 clamps the effective default only when the registry has an explicit model maximum and enforces a separate 8,192-token ForgeMind safety ceiling. A per-run UI override passes through the same native resolver and fails locally above either applicable bound.

A successful stored run may be cloned only through an explicit **Run with another model** action. The clone preserves the stored profile, task, exact scenario, and ordered selected-reference IDs, changes only to a user-selected enabled model, and follows normal Specialist execution and history persistence. Successful stored runs with matching inputs can be displayed side by side for human evaluation using their own stored metrics. The view has no scoring, winner selection, routing, bulk benchmark, background execution, or automatic request.

The 0G.2 structured-output hardening accepts one deterministically extractable JSON object, including whitespace, a single code fence, or brief wrapper text, while rejecting malformed, competing, or non-object JSON. Missing optional lists normalize to empty arrays, and only `open_questions` / `suggested_tests` are accepted as explicit aliases. Unknown fields, wrong types, empty summary, and invalid strings remain errors. When an otherwise valid allowed list exceeds its canonical bound, the shared 0G.12 normalizer retains the first bounded items in source order and emits safe field/count metadata; it does not rewrite content or vary by model. Safe diagnostics report categories and field names without raw provider text, prompts, reasoning, or secrets.

The normalized result separates assumptions from project facts and retains selected-reference IDs for visible provenance. Native code appends normalized successes and safe failure categories/diagnostics to portable `.forgemind/specialist-runs.json`, including scenario and usage when available. Additive normalization notices contain only the canonical list field plus returned and retained counts; discarded text is not persisted. The versioned file rejects malformed or unsupported data and excludes raw provider content, requests, paths, reasoning, and secrets. This is work history, not Project truth; promotion of one selected finding requires explicit human review and confirmation, and no automatic Compendium or Decision promotion exists. Additional profiles and multi-perspective review remain future work.

History is an auxiliary boundary. React loads profile metadata, registry models, Compendium, Decisions, and history independently, so one history failure cannot erase otherwise valid state. Native specialist execution also treats history append failure as a safe warning rather than replacing a valid current result. Explicit recovery archives only the history file and initializes an empty format-version `1` document; it never mutates other `.forgemind` domains.

Provider `INVALID_REQUEST` metadata is reduced to safe HTTP status, provider code/type, rejected parameter when supplied, budget/model context, and request-feature flags. Prompts, raw bodies, headers, reasoning, and credentials do not cross into React or history. `OUTPUT_TRUNCATED` guidance can offer an explicit higher-budget retry only when a known model maximum leaves safe headroom; there is no automatic retry.

### Future Context Builder and Task Router

**CR-0 SPECIFIED; IMPLEMENTATION NOT STARTED.** [Context Builder and Task Router Architecture](CONTEXT_AND_ROUTING.md) defines future shared classification, source-aware context planning, bounded assembly, freshness, traceability, specialist/workflow routing, and task-specific model recommendation. It treats the Project Brain as a logical aggregate over existing owning domains rather than a new persistence store.

The future shared layer preserves explicit selection and direct source links before inferred relevance, keeps Intent, Reality, reviewed Alignment, delivery artifacts, and AI work history distinguishable, and exposes a safe source trace without hidden reasoning. Focused UI actions route deterministically; an AI classifier is reserved for ambiguous natural-language entry. Model recommendation remains advisory, task-specific, and unavailable when local evidence is insufficient.

Current workflows continue to own their task-specific prompts, schemas, review actions, and artifacts. No `ContextPlan`, shared context package, router, evaluation profile, embedding index, RAG system, or automatic model selection exists today. CR-0 changes no current Feature Contract or UI-1 behavior and does not start CR-1, S0, S9, UI-2, or 0L.

### Security and Privacy Boundary

**SEC-0 SPECIFIED; SECURITY IMPLEMENTATION NOT STARTED.** [Security and Privacy Architecture](SECURITY_AND_PRIVACY.md) defines the threat model, BYOK credential policy, AI Data Boundary, future Security Preflight and Context Preview, deterministic Secret Guard direction, safe logging/redaction rules, prompt-injection boundary, data classification, and SEC-1 through SEC-6 roadmap.

Current evidence is narrower. The native Nebius adapter reads `NEBIUS_API_KEY` from its process environment and does not serialize that configured value through the normalized frontend contract, project schemas, provider payload JSON, usage history, or safe errors. Existing AI workflows build bounded task-specific requests; usage and specialist history persist normalized metadata/results rather than raw requests, provider bodies, or reasoning. Tauri grants the frontend no generic filesystem, shell, or network capability. User-authored free text is not scanned universally, so these safeguards do not amount to a shared secret scanner, exact outbound Context Preview, credential-diagnostics surface, centralized redaction layer, or prompt-injection immunity.

Future outbound provider work should share this boundary: Context Builder determines relevant eligible context; Security Preflight determines whether the final assembled package is safe and appropriate to send; the native provider adapter applies provider-specific transport policy. Provider credentials are configuration, never project data. SEC-0 changes no current Feature Contract or provider behavior and does not authorize SEC-1 or later work.

### Git Integration Boundary

0H implements a read-only `inspect_repository_reality` command. Rust validates that the supplied path is an initialized ForgeMind workspace, invokes only the system `git` executable with centrally defined inspection arguments, and returns normalized repository evidence. React cannot supply a Git subcommand or arbitrary arguments.

The transient snapshot contains no repository root or other absolute path. Changed-file and rename paths are validated repository-relative values; process stderr and command output are never forwarded on failure. Recent history is capped at 10 commits, changed-file presentation is capped with an explicit truncation flag, and tracked diff statistics exclude untracked contents. Git unavailable, non-repository, and inspection-failure states are safe data states that do not invalidate the workspace.

This boundary exposes status and metadata only. It does not persist the snapshot, display source diffs, or provide commit, push, pull, fetch, merge, rebase, checkout, branch, stash, remote-authentication, hosted-review, or generic shell operations. Git remains durable history, and the snapshot is Implementation Evidence rather than proof of implemented intent.

### Unity GroundTruth Boundary

0I.1 implements a read-only `inspect_unity_groundtruth` command. Rust first validates the active ForgeMind workspace, detects the canonical `Assets/`, `Packages/`, and `ProjectSettings/` directories, parses `ProjectSettings/ProjectVersion.txt`, and optionally loads `.forgemind/unity-groundtruth.json`. React cannot choose another file or access the filesystem directly.

The format-version `1` manifest is tied to portable Project identity and records export time, Unity version, source tool metadata, explicit category coverage/errors, and bounded observations for scenes, GameObjects, components, serialized-field metadata, prefab references, ScriptableObjects, tags/layers, Input Actions, and tests. All paths and identifiers are project-relative; raw serialized values, source contents, credentials, machine paths, and arbitrary exporter errors are excluded. The Unity page receives only a normalized aggregate summary. The Alignment boundary additionally projects bounded unique component-type presence summaries with explicit presence-only wording; it never exposes raw observations or serialized values.

0I.2 adds a separate editor-only UPM package under `unity/com.forgemind.unity-groundtruth`. Its explicit Unity menu action reads `.forgemind/project.json`, inspects enabled Build Settings scenes additively plus safe Editor asset/settings/assembly metadata, and writes only `.forgemind/unity-groundtruth.json`. ForgeMind never starts or automates Unity. The exporter does not save scenes or mutate prefabs, ScriptableObjects, settings, assets, source, or packages.

The exporter uses stable ordering and portable hashed identities, omits raw serialized values, executes no tests or runtime simulation, and reports partial/unavailable categories with allowlisted coverage codes. Unity is evidence for Reality, not the owner of design knowledge. Component or asset presence never establishes that Intent is implemented. Not generated, invalid, unsupported, missing, partially covered, and non-Unity states remain safe unavailable evidence; they do not become inferred absence. See [Unity GroundTruth Contract](UNITY_GROUNDTRUTH.md).

## Authority and information flow

1. Local repository files contain durable Intent and project documentation.
2. Git records their history and synchronizes accepted changes.
3. The Unity Bridge and repository readers produce point-in-time Reality evidence.
4. ForgeMind assembles deliberately scoped context for deterministic comparison and AI-assisted interpretation.
5. The Alignment Engine produces traceable findings without changing its sources.
6. AI produces drafts, explanations, and proposals.
7. Humans approve decisions, contracts, and durable file changes.

Future author, owner, reviewer, approved-by, reviewed-by, and discipline/responsibility metadata may extend durable entities, but it does not imply accounts or authorization. Authentication, RBAC, cloud synchronization, and real-time collaboration remain separate deferred services.

Derived indexes or caches may later improve retrieval, but they must be rebuildable and never become the only copy of project knowledge.

Future content-production integrations follow the same authority flow: ForgeMind may prepare an Asset Brief and coordinate a specialized external generator, but generated output remains a candidate until validation and human approval. See [AI Specialists and Content Production Direction](AI_SPECIALISTS_AND_PRODUCTION.md).

## Replaceability and portability

Core entities contain no Nebius-, Nemotron-, Unity-, Git-host-, database-, or UI-framework-specific fields. Adapters translate external formats at boundaries. Human-readable formats are preferred where practical, and no proprietary binary project format is planned.

## Coding-agent workflow

Repository implementation work follows the operational boundaries in [`../AGENTS.md`](../AGENTS.md). [`CODING_CONTEXT_MAP.md`](CODING_CONTEXT_MAP.md) maps each task type to the smallest relevant source set so this architecture document remains the source of architectural truth rather than being duplicated in agent prompts. Product-to-implementation handoffs should use the compact templates under [`templates/`](templates/).

The intended delivery boundary is Project Brain -> specialist or planning analysis -> Feature Contract / implementation brief -> coding agent -> compile/test/fix -> refreshed Reality -> ForgeMind Alignment review. ForgeMind and Token Factory increasingly support planning, design reasoning, documentation, impact analysis, test design, decomposition, and review. Coding agents remain responsible for repository edits and implementation loops. ForgeMind is not an autonomous coding-agent runtime.

## Deliberately deferred

- supported operating systems and distribution strategy beyond the currently validated Windows development build;
- file formats and validation for entities beyond Project identity, interview evidence, Compendium knowledge, Decisions, specialist history, Unity GroundTruth, Alignment results, and Feature Contracts;
- schema migration beyond rejecting unsupported project metadata versions;
- provider/model discovery, automatic routing, benchmark history, comparison runs, provider billing, human scoring, and retrieval beyond the bounded evaluation harness;
- broader automatic Alignment discovery, semantic code analysis, background monitoring, and final post-MVP status evolution;
- Unity compatibility range, scan transport, and full observation coverage;
- Git library, command-line strategy, host integrations, and branching policy;
- authentication, permissions, cloud collaboration, caching, and distribution.
- automatic task execution, a full work-tracking suite, chat/notification infrastructure, and RAG or embeddings without a separately approved need.

These choices belong to the smallest milestone that needs evidence from a working workflow.
