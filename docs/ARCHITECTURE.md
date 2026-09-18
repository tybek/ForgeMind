# Architecture Direction

## Current state

Milestone 0C implements the local Tauri desktop shell and a narrow persistent-project metadata boundary. AI integration, Project Compendium, Decision History, Alignment logic, Git integration, and the Unity Bridge are **NOT IMPLEMENTED**.

## Architectural stance

ForgeMind is intended as a desktop-first orchestration and interpretation layer over a local game repository. The repository remains authoritative for durable project files; Git provides durable history; Unity supplies evidence about Reality. ForgeMind owns neither the underlying game project nor its development tools.

The current desktop shell uses Tauri 2 with React and TypeScript. The UI receives no generic filesystem access: it invokes only workspace-specific inspect and initialize commands, while the native layer reads or creates `.forgemind/project.json` under the explicitly selected directory.

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

Accepts provider-neutral reasoning tasks and deliberately assembled context, then normalizes responses for validation, source attribution, and human review. Nebius Token Factory and an NVIDIA Nemotron open model are planned evaluation targets, not domain dependencies.

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

## Replaceability and portability

Core entities contain no Nebius-, Nemotron-, Unity-, Git-host-, database-, or UI-framework-specific fields. Adapters translate external formats at boundaries. Human-readable formats are preferred where practical, and no proprietary binary project format is planned.

## Deliberately deferred

- supported operating systems and distribution strategy beyond the currently validated Windows development build;
- file formats and validation for entities beyond the minimal 0C Project identity;
- schema migration beyond rejecting unsupported project metadata versions;
- AI provider/model selection and retrieval strategy;
- Alignment implementation approach and final status vocabulary;
- Unity compatibility range, scan transport, and full observation coverage;
- Git library, command-line strategy, host integrations, and branching policy;
- authentication, permissions, cloud collaboration, caching, and distribution.

These choices belong to the smallest milestone that needs evidence from a working workflow.
