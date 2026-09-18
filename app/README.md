# ForgeMind desktop application

The ForgeMind 0C desktop application uses Tauri 2, React, TypeScript, and Vite.

It selects a local directory through Tauri's native dialog plugin, inspects `.forgemind/project.json`, and explicitly initializes that file when requested. Initialization creates no other ForgeMind paths and does not read, scan, or modify game-project files.

## Development

Prerequisites follow the official Tauri requirements: Node.js LTS, Rust with the stable MSVC toolchain on Windows, Microsoft C++ Build Tools, and WebView2.

```powershell
npm install
npm run tauri dev
```

Useful validation commands:

```powershell
npm run check
npm run test:native
npm run build
npm run tauri build -- --no-bundle
```

Use `npm run check` for fast TypeScript and component-test feedback. Run `npm run test:native` for isolated workspace-filesystem tests and `npm run build` before meaningful commits. Keep the separate Tauri build for native milestone validation.

The only plugin capability granted by `src-tauri/capabilities/main.json` is opening a native dialog. React has no generic filesystem capability. Two narrow Tauri commands inspect or initialize ForgeMind's own metadata file; shell, Git, Unity, network, and AI capabilities are not configured.
