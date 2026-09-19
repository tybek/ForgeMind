# Architecture Direction

## Current state

Milestones 0D and 0D.1 add a replaceable AI-provider boundary, bounded Nebius Token Factory evaluation harness, centralized model registry, and local usage accounting to the 0C local Tauri workspace. The 0E Project Interview implementation is complete offline and awaits user-driven live validation. Project Compendium generation, Decision History, specialist agents, Alignment logic, Git integration, and the Unity Bridge are **NOT IMPLEMENTED**.

## Architectural stance

ForgeMind is intended as a desktop-first orchestration and interpretation layer over a local game repository. The repository remains authoritative for durable project files; Git provides durable history; Unity supplies evidence about Reality. ForgeMind owns neither the underlying game project nor its development tools.

The current desktop shell uses Tauri 2 with React and TypeScript. The UI receives no generic filesystem or network access: it invokes narrow workspace, model-registry, aggregate-usage, and evaluation commands. The native layer reads or creates `.forgemind/project.json` under the explicitly selected directory and separately owns provider credentials, outbound inference HTTP, and ForgeMind's application-global usage history.

The boundaries below describe responsibilities, not services, deployable processes, or a production-scale architecture.

## Conceptual modules

### Desktop UI

Provides local workspace selection, navigation, discussion, evidence inspection, comparisons, and explicit review/save/approval actions. It presents distinctions such as draft versus durable knowledge and evidence versus inference.

### Local Workspace Metadata

Inspects and validates the minimal portable project identity, or creates it only after explicit user action. The native boundary can access only ForgeMind's `.forgemind/project.json` contract for these operations; it does not expose generic file reads or writes to React, scan game files, or overwrite existing metadata.

### Project Knowledge / Intent

Reads and writes portable, human-readable project knowledge: design, narrative, technical constraints, roadmap scope, Systems, and Feature Contracts. It defines project concepts independently of storage format and UI framework.

### Decision History

Maintains attributable decisions, rationales, approvals, relationships, and supersession chains. It identifies the current applicable decision while preserving prior decisions rather than mutating history away.

### Alignment Engine

Compares selected Intent claims with supported Reality evidence and produces explainable, reviewable AlignmentFindings. It distinguishes verified observations, missing evidence, and AI inference. Findings do not modify either source automatically, and 0A does not prescribe a permanent rules engine or alignment enum.

### AI Provider Boundary

Accepts the small normalized `AIRequest` contract and returns `AIResponse` with response text, model identity, measured latency, and optional provider-reported token counts. `AIProvider` is a Rust trait; `NebiusTokenFactoryProvider` is its current production adapter and `MockAIProvider` supplies deterministic offline test behavior. Nebius request and response structures remain private to the adapter.

React invokes `run_ai_evaluation` and cannot supply or retrieve a credential. The native provider reads `NEBIUS_API_KEY` from its process environment immediately before an explicitly requested evaluation and sends it as a bearer token to the official Token Factory chat-completions endpoint. Errors cross the command boundary as controlled codes and safe messages; provider bodies, headers, and keys do not. The evaluation command rejects models that are not enabled in the native registry.

The harness makes no request on startup and performs no polling or automatic retry. Prompt and response bodies remain transient. Its conservative UI default output cap is 128 tokens; the explicit headless smoke uses 256 combined visible and reasoning tokens. This is an evaluation facility, not the AI Project Interview or a project-knowledge workflow.

### Model Registry and Usage Metering

The Rust model registry is the authoritative configured-model location. Each entry carries provider and model identity, display metadata, availability, enabled state, optional notes, and optional explicit per-million-token pricing. Duplicate IDs fail registry validation, unknown or disabled IDs fail before a provider request, and no provider discovery or automatic routing occurs.

Desktop and headless evaluations share one registered-and-metered service. Each attempt creates a minimal `UsageRecord` containing timestamp, session ID, optional portable project ID, provider, model ID, optional task category, provider-reported token counts, latency when available, optional estimated cost, success, and a controlled error category. The schema has no prompt, response, credential, or authorization fields.

Records use append-only JSON Lines in ForgeMind's per-user application data (`%LOCALAPPDATA%\ForgeMind\usage-v1.jsonl` on Windows), never in `.forgemind/project.json` or another game-project path. Aggregation is computed locally for the current process session, selected project, and model. Cost is labeled estimated and exists only when both token counts and explicit registry pricing are available; it is not provider billing.

### Project Interview

The React interview flow owns only transient interaction state: current section and question, the user's unsaved answer, and pending review decisions. Starting an interview is deterministic and makes no provider request. Each explicit **Next** action calls the native `run_project_interview_turn` boundary once.

The native prompt builder supplies the dedicated, testable interview system prompt plus compact JSON context containing the current section, current question, current answer, and at most eight prior candidate statements. It selects a model through the existing registry and invokes the same metered provider service with task category `project_interview`. There is no background call, automatic retry, routing, RAG, or full-conversation resend.

Provider text is parsed as a strict, bounded JSON turn. Unknown fields, invalid enums, excessive candidates, malformed question transitions, and invalid lengths are rejected before reaching React or persistence. Accepted candidates receive ForgeMind-owned identifiers and preserve `USER_STATED`, `AI_INFERRED`, or `UNRESOLVED` provenance plus the small `DIRECTION`, `LOCKED`, or `TBD` vocabulary.

Persistence is a separate explicit command. The native layer revalidates the selected workspace, filters reviewed candidates to `APPROVE`, and writes versioned human-readable `.forgemind/interview.json`. The file contains portable project ID, approval time, model ID, and approved candidates only—never workspace paths, prompts, answers, raw provider output, reasoning, credentials, or headers. Existing data is opened read-only unless the user explicitly confirms a replacement flow.

### Shared Project Brain and Specialist Profiles

Future specialist roles receive deliberately scoped views of the same Project knowledge and evidence. They are role/profile configurations over shared context, not separate truth stores or autonomous services. If multi-perspective review is pursued, it should begin as bounded prompts whose assumptions and outputs remain individually inspectable.

### Git Integration Boundary

Exposes repository status, diffs, history, and narrowly scoped user-approved actions. Git remains durable history and the initial team synchronization mechanism. ForgeMind must not hide or replace the repository's actual state.

### Unity GroundTruth Boundary

A separate bridge/package observes supported Unity project facts and emits a versioned, time-stamped GroundTruthSnapshot with source, coverage, and error metadata. Unity is evidence for Reality, not the owner of design knowledge. The ForgeMind core consumes the snapshot without depending directly on Unity APIs.

## Authority and information flow

1. Local repository files contain durable Intent and project documentation.
2. Git records their history and synchronizes accepted changes.
3. The Unity Bridge and repository readers produce point-in-time Reality evidence.
4. ForgeMind assembles deliberately scoped context for deterministic comparison and AI-assisted interpretation.
5. The Alignment Engine produces traceable findings without changing its sources.
6. AI produces drafts, explanations, and proposals.
7. Humans approve decisions, contracts, and durable file changes.

Derived indexes or caches may later improve retrieval, but they must be rebuildable and never become the only copy of project knowledge.

Future content-production integrations follow the same authority flow: ForgeMind may prepare an Asset Brief and coordinate a specialized external generator, but generated output remains a candidate until validation and human approval. See [AI Specialists and Content Production Direction](AI_SPECIALISTS_AND_PRODUCTION.md).

## Replaceability and portability

Core entities contain no Nebius-, Nemotron-, Unity-, Git-host-, database-, or UI-framework-specific fields. Adapters translate external formats at boundaries. Human-readable formats are preferred where practical, and no proprietary binary project format is planned.

## Deliberately deferred

- supported operating systems and distribution strategy beyond the currently validated Windows development build;
- file formats and validation for entities beyond the minimal 0C Project identity;
- schema migration beyond rejecting unsupported project metadata versions;
- provider/model discovery, automatic routing, benchmark history, comparison runs, provider billing, human scoring, and retrieval beyond the bounded evaluation harness;
- Alignment implementation approach and final status vocabulary;
- Unity compatibility range, scan transport, and full observation coverage;
- Git library, command-line strategy, host integrations, and branching policy;
- authentication, permissions, cloud collaboration, caching, and distribution.

These choices belong to the smallest milestone that needs evidence from a working workflow.
