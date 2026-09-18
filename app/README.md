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

Useful validation commands:

```powershell
npm run check
npm run test:native
npm run build
npm run tauri build -- --no-bundle
```

Use `npm run check` for fast TypeScript and component-test feedback. Frontend tests mock the provider boundary and never use the network. Run `npm run test:native` for isolated provider and workspace-filesystem tests and `npm run build` before meaningful commits. Keep the separate Tauri build for native milestone validation. Live validation is one explicitly clicked request after all automated checks pass; use a 32-token maximum and do not loop or automatically retry.

The only plugin capability granted by `src-tauri/capabilities/main.json` is opening a native dialog. React has no generic filesystem or network capability. Two narrow Tauri commands inspect or initialize ForgeMind's own metadata file, and one narrow command runs a normalized AI evaluation in Rust. Shell, Git, Unity, and arbitrary frontend network capabilities are not configured.
