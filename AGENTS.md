# ForgeMind Agent Instructions

## Product identity

ForgeMind is an AI Game Development Workspace focused on:

**INTENT ↔ REALITY ↔ ALIGNMENT**

It is not a generic chatbot, IDE, task manager, Unity replacement, or autonomous coding system.

## Current stack

- Tauri 2, React, TypeScript, and Vite
- Rust
- Vitest and React Testing Library
- Nebius Token Factory behind a replaceable native provider boundary
- Local-first JSON persistence

## Start every task

1. Inspect this file, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, and `docs/VALIDATION.md`.
2. Classify the task using `docs/CODING_CONTEXT_MAP.md`.
3. Search for relevant symbols and tests, then read only the task-specific context pack.
4. Confirm the requested milestone boundary and current working-tree state before editing.

Do not automatically read every document. In particular, read `docs/DEVELOPMENT_JOURNAL.md` only when historical context is necessary.

## Working rules

- Inspect before editing; prefer narrow changes and preserve the current architecture unless the task explicitly changes it.
- Do not silently expand scope, start future milestones, or invent undocumented product behavior.
- Stop at the requested task or milestone boundary. `docs/ROADMAP.md` is authoritative for milestone state.
- Use existing native boundaries instead of bypassing them. Never give React arbitrary filesystem or network access.
- Keep portable project data under `.forgemind/`; never persist credentials, authorization data, raw provider responses, hidden reasoning, or absolute machine paths.
- Keep AI actions explicit. Tests must not make automatic live inference calls.
- Use headless validation first. Do not use GUI automation unless a task specifically requires it; prefer a short user-driven manual smoke when visual verification is necessary.
- Preserve portability, human approval, provenance, and the distinction between project truth, Reality evidence, and AI inference.
- Do not add dependencies unless the task requires and authorizes them.

## Context and token discipline

- Search before opening large files; inspect narrow ranges around relevant symbols.
- Prefer existing tests as behavioral documentation.
- Do not scan the whole repository unless architecture discovery is explicitly required.
- Do not reopen or re-summarize unchanged files without a validation failure or unresolved question.
- Ignore generated and build artifacts unless they are the subject of the task.
- Make small patches rather than regenerating whole files.
- Keep plans and reports concise; use `docs/templates/IMPLEMENTATION_BRIEF.md` and `docs/templates/IMPLEMENTATION_REPORT.md` for handoffs.

## Validation and completion

Follow the ladder in `docs/VALIDATION.md`: focused tests, normal frontend/native checks, builds when warranted, then `git diff --check`. Live provider calls require explicit authorization. GUI validation comes last.

Implementation may be complete while required manual validation remains pending. Do not mark a milestone complete until its required manual PASS is recorded. Report changed files, behavior, tests, validation, limitations, and the next bounded step without chronological narration.

Keep the root `README.md` public-facing. Put internal workflow guidance, debugging notes, private dogfooding details, and development history under `docs/`. Update `docs/DEVELOPMENT_JOURNAL.md` only for meaningful milestones, architectural discoveries, significant dogfooding results, or major reliability incidents and fixes.
