# ForgeMind Devpost Submission Draft

## Project name

ForgeMind

## Tagline

A source-aware AI workspace that keeps game design intent, implementation reality, and AI output aligned.

## Inspiration / Problem

AI makes it easier for game teams to generate ideas, but it can make the project's source of truth harder to maintain.

A small team may have design intent in Markdown, decisions in conversations, implementation evidence in Git, scene structure in Unity, and useful suggestions spread across AI sessions. As the project changes, those sources drift. A plausible AI answer can be mistaken for an approved decision or implemented behavior, while every new conversation spends time reconstructing context the team already established.

ForgeMind is for indie developers, small game teams, technical designers, narrative designers, and AI-assisted development teams that want AI to move quickly without silently rewriting project truth.

## What it does

ForgeMind is a local-first desktop workspace built around a source-aware **Project Brain**. Its clearest workflow starts with documentation a team already has:

```text
Markdown
-> NVIDIA Nemotron extracts candidates through Nebius Token Factory
-> a human reviews, edits, selects, and explicitly applies them
-> Game Wiki reflects the updated Project Brain
-> Writers' Room reasons over that source-aware context
-> optional Tavily research remains visibly external
```

Knowledge Import accepts explicitly selected, project-contained Markdown. Nemotron proposes Project Knowledge, Proposed Decisions, and Open Questions, but nothing is saved automatically. The developer reviews the transient candidate queue and applies only selected content through the domain that owns it.

Applied knowledge keeps `DOCUMENTED` provenance. Decisions start `PROPOSED`. Open Questions remain unresolved. Game Wiki is a read-only projection over those owning domains rather than a new truth store.

Writers' Room then uses bounded Project Brain context for Lore Architect, Character & Dialogue, or Continuity Editor sessions. It shows source trace, keeps conversation non-authoritative, and requires Review/Edit, Accept, and explicit Apply before a proposal can change durable project knowledge.

This is the product's central idea: AI can help a game team understand and extend its project without becoming the authority that decides what is true.

## Supporting depth: Reality and Alignment

Git Reality exposes a bounded, read-only repository snapshot. Unity GroundTruth provides portable structural evidence with explicit coverage limits. Alignment compares selected intent and evidence as `ALIGNED`, `UNVERIFIED`, `OUT_OF_SYNC`, or `CONFLICT`, followed by human review. Presence does not prove runtime behavior, and neither integration mutates Git or Unity.

## How I built it

ForgeMind uses Tauri 2, React, TypeScript, Vite, and Rust. React has no generic filesystem, shell, or network authority; it invokes narrow Tauri commands. Rust owns workspace validation, local JSON persistence, provider credentials, outbound requests, response normalization, safe diagnostics, Git inspection, and Unity GroundTruth validation.

Project-owned data stays in versioned, human-readable `.forgemind/` stores. Automated tests use mocked providers and offline fixtures. There are no provider calls on startup, automatic retries, automatic multi-model runs, or hidden model routing.

## How Nebius Token Factory is used

Nebius Token Factory is ForgeMind's current inference provider behind a replaceable native Rust boundary. It powers explicit structured workflows including Knowledge Import, Writers' Room, Creator proposals, Feature Contract drafting, and specialist analysis.

ForgeMind also uses Token Factory's model catalog through one explicit refresh. Catalog availability remains separate from ForgeMind enablement and verified capability: discovering a model does not establish structured-output support, pricing, quality, or task suitability.

Local usage observations retain provider/model identity, run count, latency, and provider-reported token totals without storing prompts, raw responses, credentials, or authorization headers. They are observations, not benchmark rankings or routing signals.

## How NVIDIA Nemotron is used

The current default structured-output model is **NVIDIA Nemotron 3 Super 120B A12B**:

```text
nvidia/nemotron-3-super-120b-a12b
```

Nemotron performs structured Knowledge Import extraction, Writers' Room responses, Creator proposals, Feature Contract drafting, and other bounded structured tasks.

Live validation exposed structured-output incompatibilities, including bounded-list overflow and Writers' Room schema mismatches. ForgeMind failed closed: unsafe output was rejected, project truth remained unchanged, and another request required a new explicit action. Later bounded compatibility work produced successful task-specific runs, but the sample is too small for a universal reliability percentage or claim that Nemotron is best for every task.

## How Tavily is used

Writers' Room includes an explicit **Research web** action backed by Tavily Basic Search. One confirmation makes one bounded search with no automatic retry. The developer reviews and selects normalized HTTP(S) snippets before a separate Nemotron request can compare those external patterns with Project Brain context.

The live end-to-end Tavily-to-Writers' Room-to-Nemotron flow worked. One tactical-game result set had poor relevance, which remains an honest limitation. Research stays labeled `EXTERNAL_RESEARCH` and is never promoted into project truth automatically.

## Project Brain and human authority

```text
Conversation
-> Proposal
-> Human review and edit
-> Explicit Apply
-> Owning domain
-> Project Brain
```

AI output is not project truth. Imported Markdown remains `DOCUMENTED`, web sources remain `EXTERNAL_RESEARCH`, and Decisions require their own approval lifecycle. Git and Unity evidence stay distinct from design intent and AI inference.

## Challenges I ran into

Provider success did not guarantee product-compatible output, so I added strict local schemas, bounds, supplied-only source references, capability gates, and safe diagnostics. Preserving authority also ruled out saving good-looking output directly: Knowledge Import uses a transient review queue, Writers' Room uses proposal states, and owning domains revalidate content before Apply. Tavily retrieval, human source selection, Nemotron synthesis, and durable Apply remain separate actions.

## Accomplishments I'm proud of

- Existing Markdown becomes traceable Project Brain context through explicit review.
- Writers' Room reasons over applied knowledge while preserving source authority.
- Tavily informs a real workflow without silently becoming project truth.
- Unsafe output, citations, paths, and model choices fail closed.

## What I learned

The difficult part is retaining source, status, and authority as information moves between documents, conversations, models, code, and the engine. Provider success, product-compatible structure, and useful research are separate outcomes that need separate evidence and failure boundaries.

## Current limitations

- Knowledge Import is Markdown-only.
- Context selection is deterministic and bounded, not vector or semantic retrieval.
- Tavily research is explicit and reviewed rather than autonomous.
- Only explicitly capability-compatible models may run structured workflows.
- There is no general Task Router, automatic model recommender, model fallback, or multi-model execution.
- Wiki Chronicler and the broader ForgeMind Studios roadmap are not implemented.
- Git Reality and Unity GroundTruth are read-only evidence integrations.
- Provider availability, latency, reliability, and search relevance remain external dependencies.
- The current release-validation baseline is desktop-focused and Windows-tested.

## What's next

ForgeMind is feature frozen for this submission. The public-safe Hollow Reach screenshots are complete. Remaining work is the shorter-than-three-minute video, verified repository and evaluator links, a final secret/history scan, a fresh-clone smoke, and rendered Devpost review.

General routing, semantic retrieval, Wiki Chronicler, additional Studios, and broader distribution remain future work rather than submission claims.

## Built With

- Nebius Token Factory
- NVIDIA Nemotron 3 Super 120B A12B (`nvidia/nemotron-3-super-120b-a12b`)
- Tavily Search API
- Tauri 2, React, TypeScript, Vite, and Rust
- Vitest and React Testing Library
- Git and Unity GroundTruth tooling
- local-first JSON stores

## Security and privacy note

ForgeMind keeps project state local-first and provider credentials in native process configuration rather than project data. Provider actions are explicit; persisted records exclude authorization headers, raw provider bodies, and hidden reasoning; external sources are treated as untrusted data; and durable AI-assisted changes require human review.

These are bounded, best-effort safeguards, not a universal security guarantee or complete prompt-injection defense.

## Feedback on Nebius Token Factory

### What I used it for

I used Token Factory for structured design, narrative, extraction, and delivery workflows, plus explicit model-catalog discovery. One native boundary supported NVIDIA Nemotron and a comparison model with consistent request, metering, and safe-error behavior.

### Onboarding and what worked well

I reached a live response on the first development day. Windows-native TLS/certificate-chain friction and an unreadable response shape required local diagnostics and parser hardening; the next explicitly authorized corrected smoke succeeded without retry.

Token Factory's OpenAI-compatible interface made one provider boundary practical across several real product workflows. Provider-reported usage also integrated cleanly with privacy-minimized local metering.

### What was difficult / What could improve

More discoverable Windows-native certificate guidance and examples for response variants involving readable content, refusal, reasoning tokens, and token-budget exhaustion would make robust integration easier. Easier access to per-model pricing and verified capability metadata would also help. ForgeMind leaves unknown values unverified rather than guessing.

### Would I use it again, and why?

Yes, with continued task-specific evaluation. Token Factory already supports multiple bounded ForgeMind workflows and provides the required NVIDIA model through one replaceable provider boundary. I would continue separating provider availability from verified application capability and model quality.

## Feedback on NVIDIA Nemotron

### What I used it for

I used Nemotron for Knowledge Import extraction, Writers' Room narrative responses, Creator proposals, Feature Contract drafting, and structured specialist analysis.

### Onboarding and what worked well

Nemotron worked through the same Token Factory, registry, metering, and human-review boundaries as other enabled models. Recorded runs produced useful Creator alternatives, a concise Lore Architect response, valid extractable JSON, and later successful bounded workflows.

### What was difficult / What could improve

Structured output did not always match ForgeMind's exact product schema even when provider execution succeeded. Clearer, stable guidance for strict structured-output behavior on the Token Factory chat-completions path would reduce compatibility work. The observed runs are too few and too varied for a reliability rate or universal model comparison.

### Would I use it again, and why?

Yes, for bounded, structured, human-reviewed proposals where ForgeMind supplies explicit context and validates a narrow schema. I would not automatically route every task to Nemotron or claim it is universally best.

## Submission links and media

- **Public repository:** pending final verification and URL entry
- **Working demo / test build:** pending final evaluator URL or download entry
- **Demo video:** pending public YouTube URL; final duration must be shorter than 3 minutes
- **Screenshots:** [Knowledge Import review queue](assets/01_knowledge_import_decision_edit.png), [Game Wiki provenance](assets/03_game_wiki_imported_knowledge_provenance.png), [Writers' Room Project Brain sources](assets/06_writers_room_project_brain_sources.png), and [AI Models registry](assets/11_ai_models_nebius_nemotron.png)
- **Track:** pending final Devpost selection
- **Submission-period update explanation:** pending applicability confirmation for work predating 2026-08-26
