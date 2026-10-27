# ForgeMind

**AI for Game Development**

ForgeMind is a local-first AI game-development workspace that keeps game intent, team decisions, and actual implementation aligned.

**Turn ideas into playable worlds.**

## Core idea

```text
Intent
-> Reality
-> Alignment
-> Feature Contract
-> Implementation Brief
```

- **Intent** is what the team has agreed to build: design direction, narrative, technical constraints, and plans.
- **Reality** is what the project currently contains: files, implementation evidence, tests, and engine state.
- **Alignment** explains where the two agree, remain unverified, conflict, or have drifted apart.
- **Feature Contracts** turn reviewed intent and evidence into explicit, human-approved delivery scope.
- **Implementation Briefs** provide a deterministic handoff to a coding agent without making ForgeMind an autonomous executor.

ForgeMind is not a prompt-to-game generator. Its goal is to help AI and developers understand a game project before proposing changes.

## Why ForgeMind

Game projects distribute important context across design documents, conversations, repositories, and engine content. As a project evolves, that context can become inconsistent or disappear into individual tools and chat histories.

ForgeMind is designed to keep project knowledge portable and reviewable, preserve human authority over durable decisions, and eventually connect those decisions to evidence from the implementation.

## Current status

The current implementation includes:

- a Tauri desktop application with project-oriented workspace navigation;
- explicit local ForgeMind workspace initialization;
- portable project identity in `.forgemind/project.json`;
- safe local project handling that does not scan or modify game files implicitly;
- a replaceable Rust AI-provider boundary;
- Nebius Token Factory integration and an AI evaluation interface;
- a centralized local model registry and privacy-conscious usage summaries;
- a structured Project Interview with candidate review and approved-only local persistence;
- a versioned Game Compendium and Game Wiki with explicit interview import and manual knowledge editing;
- separate structured Decisions with rationale, explicit approval, knowledge links, and supersession history;
- a bounded AI Behavior Designer specialist workbench using explicitly selected project context;
- registered DeepSeek and NVIDIA Nemotron model support through Nebius Token Factory, with successful user-authorized use of both and no claim that one model is universally best;
- a read-only Git Reality snapshot with branch, HEAD, working-tree, diff-stat, changed-file, and recent-commit evidence;
- deterministic Unity GroundTruth export and safe partial-coverage reporting;
- human-reviewable Alignment results with separate alignment and review states;
- AI-assisted Feature Contract drafting with section-level review, explicit approval, and deterministic Implementation Brief preview/copy;
- persistent Writers' Room sessions whose proposals require explicit human review and Apply before an owning project-truth domain changes;
- explicitly triggered Tavily Search whose bounded sources remain `EXTERNAL_RESEARCH`, are treated as untrusted data, and do not mutate Project Brain automatically;
- an explicitly triggered headless AI smoke command;
- React/frontend and Rust/native automated tests; and
- a headless-first validation workflow.

0J Alignment, 0K Feature Contracts, and the UI-1 design-system foundation are complete. AI output remains proposal-only, specialist history remains non-authoritative work material, and Git operations remain read-only. UI-2 through UI-5 and ForgeMind Studios S0 through S9 are planned but not started; no 0L implementation has started.

## Tech stack

- Tauri 2 desktop shell
- React, TypeScript, and Vite frontend
- Rust native layer
- Vitest and React Testing Library
- Cargo-based native tests

## Running locally

Prerequisites:

- Node.js LTS and npm
- Rust with the stable toolchain
- On Windows, Microsoft C++ Build Tools and WebView2

Install dependencies and start the desktop application:

```powershell
cd app
npm install
npm run tauri dev
```

For frontend-only development, run `npm run dev` from `app/`.

Nebius-assisted actions require `NEBIUS_API_KEY`, and Tavily Search requires `TAVILY_API_KEY`, in the environment of the process launching ForgeMind. These BYOK credentials remain in native Rust provider boundaries and are not returned to React or written to ForgeMind project files. External research is untrusted data; ForgeMind applies bounded, best-effort prompt-injection defenses rather than claiming complete protection. See the [application development notes](app/README.md) for current configuration details.

## Validation

From `app/`:

```powershell
npm run check
npm run test:native
npm run build
npm run tauri build -- --no-bundle
```

Routine validation is headless. Native GUI interaction is reserved for a short manual smoke before milestone closure or for changes to GUI-only boundaries. See the [Validation Policy](docs/VALIDATION.md) for the full workflow and optional live-provider smoke command.

## Documentation

Product and implementation documentation:

- [Product direction](docs/PRODUCT.md)
- [Hackathon MVP](docs/MVP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Workflows](docs/WORKFLOWS.md)
- [Roadmap](docs/ROADMAP.md)
- [Validation policy](docs/VALIDATION.md)
- [Hackathon submission readiness](docs/HACKATHON_SUBMISSION.md)
- [Security and privacy architecture](docs/SECURITY_AND_PRIVACY.md)
- [UI direction](docs/UI_DIRECTION.md)
- [Brandbook](docs/BRANDBOOK.md)

Planning and future-direction documents:

- [Development Journal](docs/DEVELOPMENT_JOURNAL.md) — historical progress and project-management estimates
- [Specialist AI and production direction](docs/AI_SPECIALISTS_AND_PRODUCTION.md) — current bounded specialist foundation plus future direction
- [ForgeMind Studios roadmap](docs/STUDIOS_ROADMAP.md) — planned S0-S9 work, not started

## Hackathon

ForgeMind is being developed for the Nebius x NVIDIA Global AI Hackathon. The hackathon target is a focused, evidence-backed flow connecting project intent, implementation reality, alignment findings, a reviewable Feature Contract, and an implementation-ready brief.

The current build uses Nebius Token Factory with NVIDIA Nemotron 3 Super 120B. Submission requirements, evidence collection, public-repository safety, and the three-minute demo plan are tracked in [Hackathon Submission Readiness](docs/HACKATHON_SUBMISSION.md).

## License

ForgeMind is open-source software available under the [MIT License](LICENSE).
