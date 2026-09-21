# Coding Context Map

Use this map to find the smallest source of truth for an implementation task. It points to existing documentation and code; it does not replace them.

Always begin with `AGENTS.md`, `ROADMAP.md`, `ARCHITECTURE.md`, and `VALIDATION.md`. Then classify the task and load only the relevant context pack below.

## Where truth lives

| Area | Primary files or docs | Read when |
| --- | --- | --- |
| Product intent | `PRODUCT.md`, `MVP.md` | Product boundaries, value, MVP behavior, or non-goals are in question. |
| Architecture | `ARCHITECTURE.md`, `../app/src-tauri/src/lib.rs` | Responsibilities, trust boundaries, or cross-layer wiring may change. |
| Workspace/project model | `DATA_MODEL.md`, `../app/src-tauri/src/workspace.rs`, `../app/src/platform/workspaceDirectory.ts` | Project identity, workspace initialization, or portable file rules change. |
| Compendium | `../app/src-tauri/src/compendium.rs`, `../app/src/platform/projectKnowledge.ts`, `../app/src/CompendiumPage.tsx` | Knowledge import, CRUD, status, provenance, or UI changes. |
| Decisions | `../app/src-tauri/src/decisions.rs`, `../app/src/platform/decisions.ts`, `../app/src/DecisionsPage.tsx` | Decision lifecycle, approval, relationships, or supersession changes. |
| AI provider | `../app/src-tauri/src/ai.rs`, `../app/src/platform/aiProvider.ts` | Provider requests, normalization, credentials, or safe errors change. |
| Model registry | `../app/src-tauri/src/model_registry.rs`, `../app/src/platform/modelRegistry.ts` | Model metadata, capabilities, enablement, or selection changes. |
| Usage metering | `../app/src-tauri/src/usage.rs`, `../app/src/platform/usageMetering.ts` | Usage records, aggregation, privacy, or cost estimates change. |
| Project Interview | `../app/src-tauri/src/interview.rs`, `../app/src/platform/projectInterview.ts`, `../app/src/InterviewPage.tsx` | Interview prompts, candidates, review, or persistence change. |
| Specialists | `AI_SPECIALISTS_AND_PRODUCTION.md`, `../app/src-tauri/src/specialists.rs`, `../app/src-tauri/src/specialist_history.rs`, `../app/src/platform/specialists.ts`, `../app/src/SpecialistPage.tsx` | Specialist tasks, selected context, output, budgets, or history change. |
| Future Studios | `STUDIOS_ROADMAP.md`, `PRODUCT.md`, `AI_SPECIALISTS_AND_PRODUCTION.md`, `UI_DIRECTION.md`, then the owning domain docs and code for the explicitly authorized phase | Planning or implementing a task-oriented Studio, shared Studio framework, Ask ForgeMind routing, Studio result actions, or Studio-specific model evaluation. Treat S0 through S9 as future and not started until `ROADMAP.md` explicitly authorizes a phase. |
| Validation | `VALIDATION.md`, `../app/package.json`, relevant `*.test.tsx` or Rust test module | Choosing checks, adding regressions, or recording evidence. |
| Roadmap | `ROADMAP.md` | Confirming milestone status, scope, exit conditions, or stop point. |
| Frontend shell | `../app/src/App.tsx`, `../app/src/App.test.tsx`, `../app/src/styles.css` | Navigation, shared layout, or workspace-level UI changes. |
| UI direction and brand | `UI_DIRECTION.md`, `BRANDBOOK.md`, `PRODUCT.md`, `ROADMAP.md`, then the relevant page/tests/styles | Dashboard behavior, information architecture, shared visual system, branding, artwork, copy, or redesign-phase work. Treat UI-1 through UI-5 as future until explicitly authorized. |
| Native commands | `../app/src-tauri/src/lib.rs`, matching Rust domain, matching `../app/src/platform/*.ts` | A Tauri command or frontend/native contract changes. |
| Persistence | `DATA_MODEL.md`, matching Rust domain, `../app/src-tauri/src/workspace.rs` | A `.forgemind/` schema, validation, recovery, or file lifecycle changes. |
| Git Reality | `ARCHITECTURE.md` Git boundary, `ROADMAP.md` section 0H, `../app/src-tauri/src/git_reality.rs`, `../app/src/platform/repositoryReality.ts`, `../app/src/RepositoryPage.tsx` | Read-only repository evidence or future explicitly authorized Git changes. Keep write and network operations out of the current boundary. |
| Unity GroundTruth | `UNITY_GROUNDTRUTH.md`, `MVP.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`, `ROADMAP.md` section 0I, `../unity/README.md` | Exporter, manifest, coverage, normalized Unity Reality evidence, or future explicitly authorized GroundTruth changes. |
| Alignment Engine | `PRODUCT.md`, `MVP.md`, `DATA_MODEL.md`, `WORKFLOWS.md`, `ROADMAP.md` section 0J, `../app/src-tauri/src/alignment.rs`, `../app/src/platform/alignment.ts`, `../app/src/AlignmentPage.tsx` | Alignment evidence, deterministic status, review lifecycle, persistence, Wiki summary, or future explicitly authorized Alignment changes. |
| Feature Contracts | `PRODUCT.md`, `DATA_MODEL.md`, `WORKFLOWS.md`, `../app/src-tauri/src/feature_contracts.rs`, `../app/src/platform/featureContracts.ts`, `../app/src/FeatureContractsPage.tsx` | Contract sources, persistence, approval, traceability, or implementation-brief handoff changes. |

Tests beside the target code are part of each context set even when the table does not list them separately.

## Task-scoped context packs

Classify the task before coding:

- **FRONTEND:** target page/component, its tests, relevant styles, and its `platform/` boundary. For visual-system, dashboard, navigation, artwork, or branded-copy changes, also read `UI_DIRECTION.md` and `BRANDBOOK.md`. Read native code only if the contract changes.
- **NATIVE_DOMAIN:** target Rust module, its tests, `lib.rs` integration, `DATA_MODEL.md`, and the frontend boundary only when needed.
- **PERSISTENCE:** target Rust domain and tests, `workspace.rs`, `DATA_MODEL.md`, and the lifecycle UI/boundary that invokes it.
- **AI_PROVIDER:** `ai.rs`, model registry, usage metering, relevant AI feature module, AI specialist docs when applicable, and provider/native tests.
- **AI_PRODUCT:** target AI page, platform boundary, native feature module, related product/workflow section, tests, and selected AI documentation.
- **DOCUMENTATION:** requested documents plus direct links needed for consistency. Do not crawl implementation unless a claim requires verification.
- **CROSS_LAYER:** both relevant frontend and native files, the platform contract, data model when persistence changes, and focused tests. Do not crawl unrelated features.

For every pack, the four always-read files named at the top still apply.

## Efficiency rules

- Use search or find before opening a large file, and read the narrowest useful range.
- Do not re-summarize files already understood unless they changed.
- Do not scan the entire repository, generated output, or build artifacts without a task-specific reason.
- Do not repeatedly read historical journal entries; use the journal only when history explains a current decision or regression.
- Prefer tests as executable behavioral documentation.
- Patch the smallest relevant region; do not regenerate whole files for small changes.
- Keep the implementation plan short and avoid reopening unchanged files after validation unless a failure requires it.
- Run one focused validation loop before broad checks and builds.

## Examples

Task: **Add loading spinner to AI Behavior Designer**

Read `../AGENTS.md`, `../app/src/SpecialistPage.tsx`, `../app/src/SpecialistPage.test.tsx`, `../app/src/styles.css`, and `VALIDATION.md`. Do not automatically read Compendium or Interview implementation, Unity future docs, the full Development Journal, or unrelated Rust persistence.

Task: **Add specialist run persistence field**

Read `../AGENTS.md`, `../app/src-tauri/src/specialist_history.rs`, `../app/src-tauri/src/specialists.rs`, `../app/src-tauri/src/lib.rs` when command wiring changes, `../app/src/platform/specialists.ts`, `../app/src/SpecialistPage.tsx` only if the field is rendered, `DATA_MODEL.md`, focused tests, and `VALIDATION.md`.

## Working state and durable documentation

`ROADMAP.md` is authoritative for milestone state. Never start the next milestone automatically. A task can be implementation-complete while manual validation is still pending; record the required manual PASS before closing a milestone and stop at the requested boundary.

Do not use `DEVELOPMENT_JOURNAL.md` as a live transcript. Update it only after meaningful milestone completion, an important architectural discovery, significant real-world dogfooding, or a major reliability incident/fix. Do not record every small refactor.

Keep the root `README.md` concise and public-facing. Internal workflow, token-efficiency guidance, private dogfooding, daily logs, and milestone debugging belong under `docs/`.

No `current-task.md` is required by default. The roadmap plus a task-specific implementation brief provide sufficient working context without creating another long-lived source of truth.
