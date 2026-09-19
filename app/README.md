# ForgeMind desktop application

The ForgeMind desktop application uses Tauri 2, React, TypeScript, and Vite. Milestones through 0G are complete, including user-driven validation of the AI Behavior Designer specialist profile. 0H has not started.

It selects a local directory through Tauri's native dialog plugin, inspects `.forgemind/project.json`, and explicitly initializes that file when requested. Initialization creates no other ForgeMind paths and does not read, scan, or modify game-project files.

The workspace also exposes a small AI Evaluation page backed by the native model registry. React sends a provider-neutral request through `run_ai_evaluation`; Rust loads `NEBIUS_API_KEY`, calls Nebius Token Factory, and returns normalized response text, model, latency, and optional usage. No credential crosses into React. Prompt and response text remain transient, while privacy-safe usage metadata is appended to ForgeMind's application-global local history.

Project Interview is a separate review-before-save workflow. Starting it makes no request; each explicit **Next** action sends one compact turn through the registered, metered native provider with task category `project_interview`. Interview turns retain `minimal` reasoning, use a bounded 1,200-token completion budget to leave room for provider reasoning tokens, and accept at most three compact candidates. Strictly validated candidates remain transient until the user edits and approves them. The native layer writes only approved candidates to `.forgemind/interview.json`, and existing data cannot be replaced without explicit confirmation.

The Game Design workspace now hosts the Game Compendium. Users explicitly import approved interview knowledge or add entries manually; repeated exact title-and-statement imports are skipped. Entries retain section, status, provenance, source, and timestamps in `.forgemind/compendium.json`. The Decisions workspace stores separate proposed or human-approved choices, rationale, authorship, related knowledge, and one-predecessor supersession history in `.forgemind/decisions.json`. No AI call is required for either workflow.

AI Behavior Designer is a responsive 40/60 two-pane specialist workbench, not chat or simulation. It surfaces deterministic task-specific recommendations, then presents every existing Compendium Area as an individually collapsible group with entry/selection counts; users may override guidance or run without project references. Only approved Decisions are offered in a separate collapsible selector. One explicit action routes only selected context through the shared native provider and `ai_behavior` usage path. Bounded task-specific completion preferences range from 3,200 to 5,200 tokens. ForgeMind clamps a preference only when the native registry has an explicitly configured model maximum; otherwise the model limit remains Unknown. Collapsed Advanced Run Settings allow one validated per-run budget within the model limit and ForgeMind's 8,192-token safety bound. Minimal reasoning, temperature `0.2`, strict output/list validation, and no automatic retry remain unchanged.

Normalized successes and safe failures are stored in versioned `.forgemind/specialist-runs.json` with the explicit scenario, selected reference IDs, preferred/effective completion budgets, known model maximum when configured, and usage when available. This portable Analysis History excludes raw provider/request content, credentials, authorization data, reasoning, and absolute paths. It is a non-authoritative work artifact and never becomes Compendium knowledge or a Decision automatically.

Analysis History is auxiliary state, not a prerequisite for the specialist workbench. Profiles, models, Compendium context, approved Decisions, and history load independently. A malformed or unsupported history file produces a warning only in the History panel; task/model selection and new analysis remain available. Explicit **Archive and reset history** recovery renames only the existing history file to a timestamped `.forgemind/specialist-runs.invalid-*.json` backup and creates an empty valid history. It never changes Project identity, interview knowledge, Compendium entries, or Decisions.

## Development

Prerequisites follow the official Tauri requirements: Node.js LTS, Rust with the stable MSVC toolchain on Windows, Microsoft C++ Build Tools, and WebView2.

Before implementation work, follow the repository-level [`AGENTS.md`](../AGENTS.md), select the smallest task context from the [`Coding Context Map`](../docs/CODING_CONTEXT_MAP.md), and use the implementation brief/report templates in [`docs/templates`](../docs/templates/). Validation remains governed by the [`Validation Policy`](../docs/VALIDATION.md).

```powershell
npm install
npm run tauri dev
```

The native application must be launched from an environment containing `NEBIUS_API_KEY` for a live evaluation. The UI lists models enabled in the authoritative native registry; it does not accept arbitrary model identifiers. The app does not load `.env` files.

On Windows, this PowerShell pattern supplies the key to the current process without placing its value directly in shell history:

```powershell
$secureKey = Read-Host "Nebius API key" -AsSecureString
$env:NEBIUS_API_KEY = [System.Net.NetworkCredential]::new("", $secureKey).Password
npm run tauri dev
Remove-Item Env:NEBIUS_API_KEY
```

To open a known workspace in a debug build without invoking the picker, set `FORGEMIND_TEST_WORKSPACE` before `npm run tauri dev`. The bootstrap uses the same native inspection command and React loading path as picker selection. Release builds ignore it.

Useful validation commands:

```powershell
npm run check
npm run test:native
npm run build
npm run tauri build -- --no-bundle
```

Use `npm run check` for fast TypeScript and component-test feedback. Frontend tests mock provider, registry, metering, interview, Compendium, Decisions, and specialist boundaries and never use the network. Run `npm run test:native` for deterministic provider, specialist prompt/output, and portable workspace-persistence tests. Run `npm run build` before meaningful commits and keep the separate Tauri build for native milestone validation.

Live provider validation is an optional, explicit headless command:

```powershell
npm --silent run ai:smoke -- --model <model-id>
```

It calls the registered production Rust evaluation service exactly once with a fixed short prompt, temperature `0`, `minimal` reasoning effort, and a 256-token completion maximum, then emits one JSON result. The limit covers visible and reasoning tokens. Failures include only safe structured protocol metadata such as HTTP status, response object type, finish reason, content-presence flags, reported reasoning-token count, and provider request ID. It has no retry or loop and never prints `NEBIUS_API_KEY`, authorization headers, response text on failure, or provider error messages. GUI automation is not part of the normal loop; reserve a short manual launch, representative workspace flow, representative AI-result check, and—when relevant—the native picker for milestone closure.

Usage history is application-global rather than stored in a game project. On Windows it is written as JSON Lines to `%LOCALAPPDATA%\ForgeMind\usage-v1.jsonl`; equivalent user data locations are used on macOS and Linux. Records contain timestamps, session and optional project IDs, model/provider identity, optional task category, token counts, latency, estimated cost when explicit pricing exists, success, and safe error category. They never contain prompts, response text, credentials, or authorization headers. Pricing that is not explicitly configured remains unavailable and is never inferred from provider billing.

The only plugin capability granted by `src-tauri/capabilities/main.json` is opening a native dialog. React has no generic filesystem or network capability. Narrow Tauri commands inspect or initialize ForgeMind metadata, list configured models and specialist profiles, read aggregate usage, run normalized native evaluation/interview/specialist requests, and load or save validated interview, Compendium, Decision, and specialist-history data. Shell, Git, Unity, and arbitrary frontend network capabilities are not configured.
