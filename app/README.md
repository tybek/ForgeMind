# ForgeMind desktop application

The ForgeMind 0D desktop application uses Tauri 2, React, TypeScript, and Vite.

It selects a local directory through Tauri's native dialog plugin, inspects `.forgemind/project.json`, and explicitly initializes that file when requested. Initialization creates no other ForgeMind paths and does not read, scan, or modify game-project files.

The workspace also exposes a small AI Evaluation page. React sends a provider-neutral request through `run_ai_evaluation`; Rust loads `NEBIUS_API_KEY`, calls Nebius Token Factory, and returns normalized response text, model, latency, and optional usage. No credential crosses into React and no evaluation result is persisted.

## Development

Prerequisites follow the official Tauri requirements: Node.js LTS, Rust with the stable MSVC toolchain on Windows, Microsoft C++ Build Tools, and WebView2.

```powershell
npm install
npm run tauri dev
```

The native application must be launched from an environment containing `NEBIUS_API_KEY` for a live evaluation. Enter a model identifier available to the Token Factory account in the UI; model IDs are intentionally not guessed or scattered through application code. The app does not load `.env` files.

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

Use `npm run check` for fast TypeScript and component-test feedback. Frontend tests mock the provider boundary and never use the network. Run `npm run test:native` for deterministic provider tests, smoke-command argument tests, and temporary workspace-fixture tests. Run `npm run build` before meaningful commits and keep the separate Tauri build for native milestone validation.

Live provider validation is an optional, explicit headless command:

```powershell
npm --silent run ai:smoke -- --model <model-id>
```

It calls the production Rust provider exactly once with a fixed short prompt, temperature `0`, `minimal` reasoning effort, and a 256-token completion maximum, then emits one JSON result. The limit covers visible and reasoning tokens. Failures include only safe structured protocol metadata such as HTTP status, response object type, finish reason, content-presence flags, reported reasoning-token count, and provider request ID. It has no retry or loop and never prints `NEBIUS_API_KEY`, authorization headers, response text on failure, or provider error messages. GUI automation is not part of the normal loop; reserve a short manual launch, representative workspace flow, representative AI-result check, and—when relevant—the native picker for milestone closure.

The only plugin capability granted by `src-tauri/capabilities/main.json` is opening a native dialog. React has no generic filesystem or network capability. Two narrow Tauri commands inspect or initialize ForgeMind's own metadata file, and one narrow command runs a normalized AI evaluation in Rust. Shell, Git, Unity, and arbitrary frontend network capabilities are not configured.
