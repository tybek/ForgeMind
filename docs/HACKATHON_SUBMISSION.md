# Hackathon Submission Readiness

## Status and scope

This document is the durable submission-readiness source for ForgeMind's entry to the **Nebius x NVIDIA Global AI Hackathon**. It covers submission gates, evidence collection, public-repository safety, tool/model feedback, the demo video, and final Devpost QA. It does not authorize application behavior, a new product milestone, live inference, or publication.

Current status: **SUB-2 demo storyboard and voice-over complete; final submission not complete.** The root README, Devpost draft, public asset plan, exact `2:38` storyboard, 359-word voice-over, live-call/fallback strategy, recording checklist, screenshot list, and video QA checklist are prepared. Screenshots, recording/editing, video and evaluator URLs, final fresh-clone smoke, and submission remain manual work. Product milestone status remains authoritative in [Roadmap](ROADMAP.md).

Official sources re-checked on 2026-10-28:

- [Hackathon overview and What to Submit](https://nebiusglobalaihackathon.devpost.com/)
- [Official Rules](https://nebiusglobalaihackathon.devpost.com/rules)

Re-check both pages before final submission. The official rules and live Devpost form override this planning document if requirements change.

## Confirmed submission requirements

The current official guidance requires:

- submission by **Friday, October 30, 2026 at 10:00 AM Pacific Time**; Devpost currently displays `10:00 AM PDT`;
- a working project using **NVIDIA Nemotron or another NVIDIA open-source model** on **Nebius Token Factory or Nebius AI Cloud**;
- selection of the most appropriate submission category;
- a project description explaining what was created, why, and how it works;
- a working demo URL, hosted application, or test build;
- a **public YouTube demo video shorter than 3 minutes** that shows the project working;
- audio in the video explaining how Nebius Token Factory and the NVIDIA model or technology were used;
- a publicly accessible GitHub, GitLab, or Bitbucket repository;
- an open-source license visible at the top of the repository page;
- a README with setup and run instructions that highlights the NVIDIA model, Token Factory's role, and any other Nebius services used; and
- feedback on the Nebius and NVIDIA tools, models, or technologies used.

The Devpost submission's **Built With** field should name the actual tools and models explicitly. If ForgeMind existed before the submission period began on August 26, 2026, the submission must also explain what was significantly updated during the submission period; confirm this applicability before submission rather than assuming it.

## Current ForgeMind submission position

ForgeMind currently satisfies the technical-use direction with:

- Nebius Token Factory as the production inference provider behind a replaceable native Rust boundary;
- successful user-authorized calls using `nvidia/nemotron-3-super-120b-a12b` and `deepseek-ai/DeepSeek-V4.1-Flash`;
- a completed core loop from Intent through Reality, Alignment, Feature Contract, and Implementation Brief;
- an implemented, headless-validated Markdown-only Existing Project Knowledge Import that requires candidate review and explicit owning-domain Apply, with its controlled live/manual acceptance still pending;
- local usage records that can capture provider/model identity, latency, and provider-reported token counts without prompts, responses, credentials, or authorization headers; and
- an MIT license and documented local setup.

This is not yet a submission-complete claim. The public documentation and Devpost draft are prepared, and the repository retains its recorded `PUBLIC_RELEASE_READY` security gate. Screenshots, demo packaging, the public video, working-demo distribution, final public links, a final secret/fresh-clone recheck, and submission QA remain open.

## Required Tool Feedback

Feedback must be concrete, tied to recorded runs or repository behavior, and edited into concise submission copy only after the evidence is reviewed. Do not turn isolated observations into platform-wide conclusions.

### Nebius Token Factory

#### What ForgeMind used it for

Token Factory is the current production inference service for ForgeMind's AI Evaluation, Project Interview, AI Behavior Designer, AI-assisted Feature Contract, New Project Creator, and WR-1 Writers' Room proposal workflows. The native Rust adapter uses the OpenAI-compatible non-streaming chat-completions contract. Calls are explicit and metered; there is no startup inference, automatic retry, background request, or automatic model routing.

WR-1 materially expands submission-ready use of the registered NVIDIA model: Lore Architect, Character & Dialogue, and Continuity Editor share credit-aware preflight, bounded Project Brain/Markdown/session context, strict source-backed structured output, and explicit reviewed proposal application. One earlier user-driven Lore Architect run provides live evidence: provider execution and persistence succeeded, while the immediate frontend exposed a normalization bug and restart/reload rendered the saved response. WR-1.2 fixed that boundary offline, and the later user-confirmed WR-1.3S live manual PASS closes the stabilized response-contract recheck without supplying detailed run metrics.

WR-1.3S is implemented, headless validated, and user-confirmed live for the core narrative flow: deterministic narrative context, visible context counts, prompt-guided exploration before consolidation, focused string questions, editable proposal review, explicit Apply, and next-turn Project Brain refresh. TAV-1 adds only the bounded Tavily retrieval path documented below. IMP-1 separately adds reviewed Markdown-only knowledge import with manual acceptance pending. Semantic/vector search, Rebaseline, Wiki Chronicler, and a general Router remain absent.

Three later user-driven Nemotron WR-1.3 checks completed at the Token Factory provider boundary but were safely rejected as `INVALID_WRITERS_ROOM_OUTPUT`; no proposal or project truth was applied. The first two used prompt-only formatting; the third still failed after provider-enforced `json_object`. Their preflights confirmed that Narrative Context and established Project Brain knowledge were selected correctly. Because raw provider text is intentionally not retained, the exact structural mismatches and uncaptured usage metrics remain **UNVERIFIED** and must not be reconstructed. WR-1.3S keeps JSON-object enforcement and safe diagnostics but restores the previously live-proven WR-1.2 response shape: message, plain string questions, supplied source references, and bounded proposals. Guided narrative behavior, editable proposal review, and next-turn context refresh remain; the user confirmed the stabilized live manual recheck passed before TAV-1, while its detailed run metrics remain unverified.

#### Onboarding: zero to first successful call

The repository record shows that initial integration reached a live response on the first development day, but Windows-native TLS/certificate-chain friction and an unreadable response shape required offline diagnostics and parser hardening. The next explicitly authorized corrected smoke call succeeded without retry using `deepseek-ai/DeepSeek-V4.1-Flash`.

Recorded first corrected success:

- latency: `2,045 ms`;
- input tokens: `41`;
- output tokens: `37`;
- total tokens: `78`;
- finish reason: `stop`.

The final submission feedback should distinguish local integration friction from a verified Token Factory service defect.

#### What worked well

- One provider boundary supported multiple registered models, including DeepSeek and NVIDIA Nemotron.
- The corrected production call returned normalized readable text, provider-reported usage, latency, finish reason, and a safe request identifier.
- Token Factory supported real ForgeMind workflows rather than only synthetic prompts.
- Provider usage metadata integrated cleanly with local, privacy-conscious metering.
- Explicit calls succeeded without requiring automatic retries.

#### What needs improvement

- Developer guidance around Windows-native TLS/certificate-chain setup would have reduced early integration friction in this environment.
- Clearer examples for response variants involving readable content, refusal, reasoning tokens, and token-budget exhaustion would make robust parsing easier.
- Easily discoverable per-model pricing and verified capability metadata would help evaluation. ForgeMind currently leaves Nemotron pricing, maximum completion tokens, and structured-output capability as `Unknown` rather than guessing.
- Catalog-to-application integration is manual in ForgeMind today. Record whether Token Factory's catalog workflow makes exact model identifiers and lifecycle changes easy to track during the remaining evaluation runs.

These are evidence-backed topics to refine, not final generalized verdicts about the service.

#### Reliability and latency observations

- The corrected short DeepSeek smoke succeeded in `2,045 ms`.
- A production DeepSeek Reaction Model run succeeded in `16,846 ms` with `2,172` total tokens.
- A production DeepSeek Competence Tiers run succeeded in `19,517 ms` with `2,905` total tokens.
- The first recorded Nemotron provider success returned valid extracted JSON in `6,454 ms` with `2,141` total tokens. ForgeMind rejected the full Specialist result under the then-current schema because seven recommendations exceeded the canonical maximum of five; this was an application validation outcome, not a provider-call failure.
- A Lore Architect Writers' Room run succeeded at the provider and persistence boundaries in `1,795 ms` with `636` total tokens. Its first immediate render failed in ForgeMind, while restart/reload displayed the persisted result; WR-1.2 traced and fixed the application boundary mismatch.
- Some DeepSeek attempts exhausted the combined reasoning/completion budget. ForgeMind failed safely and required an explicit user retry; no automatic retry was introduced.

The tasks and output sizes differ, so these observations are not a controlled latency ranking.

#### Would we use it again?

Current evidence supports **yes, with continued task-specific evaluation**. Token Factory already powers several bounded ForgeMind workflows, exposes useful metering data, and provides access to both the required NVIDIA model and comparison models through one provider boundary. The final answer should remain conditional on the remaining submission evidence and should identify any recurring reliability or catalog issues observed before submission.

### NVIDIA Nemotron

#### Exact model used

- model ID: `nvidia/nemotron-3-super-120b-a12b`
- ForgeMind display name: **NVIDIA Nemotron 3 Super 120B**
- provider: Nebius Token Factory

#### Tasks tested

- bounded AI Behavior Designer Specialist analysis;
- same-input human comparison against a saved successful run from another enabled model;
- structured proposal generation under ForgeMind's strict normalized result schema; and
- five successful user-observed New Project Creator calls covering Core Loop suggestions, explicit regeneration, Design Pillar suggestions, and the final grounding/normalization recheck, plus one user-visible Core Loop structured-output failure; and
- one successful provider/persistence Lore Architect Writers' Room run whose concise response asked three focused questions and remained a proposal, while exposing an immediate frontend render failure fixed in WR-1.2.

The exact Specialist task type for the first measured Nemotron provider success is not stated in the durable evidence entry and must not be inferred.

#### Structured-output reliability

The first authorized call produced one valid extractable JSON object, but returned seven recommendations against ForgeMind's maximum of five. At that time, full Specialist validation failed with `INVALID_SPECIALIST_SCHEMA`. After model-neutral bounded-list normalization was added, a later live Nemotron Specialist run completed successfully. That later run proves one successful normalized workflow, not a general structured-output capability or reliability rate.

Five recorded Creator calls returned valid structured proposal sets: three Core Loop proposals, two regenerated Core Loop alternatives, five Design Pillars, three further Core Loop proposals, and two final Core Loop proposals that passed the grounding/normalization recheck. One earlier Core Loop provider response failed strict Creator validation with `INVALID_CREATOR_AI_OUTPUT`; safe rejection preserved the draft and applied no proposal. The raw response was intentionally not retained, so the exact structural mismatch is unavailable. The robustness fix accepts only one clearly extractable object plus bounded optional-field variants and still rejects malformed, ambiguous, unknown, or reasoning-bearing structures. These observations are not a general reliability rate.

Three WR-1.3 live checks completed at the provider boundary but failed Writers' Room structured validation: two under prompt-only formatting and one after capability-selected `json_object`. Their successful Narrative Context preflights separate context selection from response-shape compatibility. WR-1.3S retains JSON-object enforcement and safe stage/code diagnostics while replacing the expanded phase/nested-question schema with the smaller live-proven contract. Competing objects, unknown sources, invalid proposals, reasoning fields, unknown fields, and over-bound content still fail closed. The user subsequently confirmed a successful stabilized WR-1.3S live manual recheck; the missing exact model, token, latency, and output details are not reconstructed and no reliability rate is derived.

#### Latency and token observations

For the first recorded provider success:

- latency: `6,454 ms`;
- input tokens: `1,096`;
- output tokens: `1,045`;
- total tokens: `2,141`;
- effective completion budget: `5,200`.

The repository records that a later post-normalization run succeeded, but its exact latency and token values are **not captured in the current documentation**.

The five successful user-observed Creator calls measured `2,500 ms / 388 / 262 / 650`, `2,037 ms / 417 / 295 / 712`, `3,314 ms / 428 / 304 / 732`, `2,900 ms / 434 / 425 / 859`, and `3,348 ms / 533 / 371 / 904` for latency / input / output / total tokens respectively. The usage record matching the user-visible structured failure measured `2,853 ms / 491 / 407 / 898`; one immediately preceding same-session usage-only failure measured `2,727 ms / 491 / 384 / 875`. Keep these task-specific observations separate from the unmatched Specialist measurements.

The Lore Architect Writers' Room observation measured `1,795 ms / 447 / 189 / 636` for latency / input / output / total tokens. Provider execution and persistence succeeded. Immediate rendering failed due to ForgeMind's application-side result normalization bypass; restart/reload rendering passed. Keep the provider outcome distinct from the frontend outcome.

#### Strengths

- Returned valid extractable structured JSON on the first recorded authorized provider success.
- Produced a usable later result after model-neutral list normalization.
- Worked through the same provider, registry, metering, history, and human-review boundaries as the comparison model.
- Produced concise, relevant, immediately usable Creator alternatives in five observed successful runs; accepted content remained editable, regeneration preserved it, manual pillars remained intact, and the final recheck surfaced unsupported or new mechanics separately as assumptions.
- Produced a concise, collaborative Lore Architect response with three focused clarification questions and did not immediately establish generated lore as project truth.
- Had materially lower recorded latency than the two cited larger DeepSeek Specialist runs, but the prompts/tasks are not established as identical and no speed-winner claim is justified.

#### Weaknesses

- The first output did not respect ForgeMind's five-item recommendation bound.
- One successful normalized run is insufficient to establish a task-level reliability rate.
- Pricing, maximum completion-token support, and strict `json_schema` compatibility remain unverified in ForgeMind's registry. `json_object` is the documented conservative capability selected for the current Nemotron path and has one user-confirmed successful WR-1.3S workflow recheck, without detailed model/token/latency evidence or a broader compatibility claim.
- Creator proposals sometimes introduced plausible mechanics that the supplied draft had not established.
- A later Creator response passed the provider boundary but failed strict proposal validation. Exact response-shape diagnosis is unavailable because raw provider text is intentionally not persisted.
- The first recorded Writers' Room live response persisted successfully but exposed an application-side immediate-render mismatch; this is a ForgeMind limitation, not evidence of a provider failure.

#### Grounding and hallucination concerns

The Creator observations identified a concrete grounding issue: useful proposals sometimes introduced plausible but unconfirmed mechanics, including reconnaissance drones, explicit crew roles, medkits, ammo, power cells, fixed pressure meters, crew morale, and specific extraction prompts. Those ideas were not established project facts, and the fourth observation did not surface them as assumptions. NPC-2.2 strengthened the proposal-level grounding instruction while keeping assumptions informational even when proposal content is applied; the final recheck surfaced unsupported or new mechanics separately as assumptions. The five successful runs remain too small and too task-specific for a general hallucination rate.

#### Would we use it again, and where?

Current evidence supports **yes, as a candidate for bounded, structured, human-reviewed design and delivery proposals**. It fits best where ForgeMind supplies explicit selected context, validates a narrow schema, and keeps the result non-authoritative until human review. Evidence is not yet sufficient for automatic routing, a universal recommendation, or a claim that Nemotron is best for all ForgeMind tasks.

### Optional DeepSeek comparison context

`deepseek-ai/DeepSeek-V4.1-Flash` has also been used successfully through Token Factory for short evaluation, Reaction Model, Competence Tiers, and other ForgeMind proposal workflows. Recorded successful runs include useful structured results and metered latency/tokens; separate runs also exposed completion-budget exhaustion. Use DeepSeek only as limited comparison context. Do not present the submission as a universal model ranking or declare a winner from unmatched tasks and a small sample.

## Feedback evidence table

Use one row per deliberate evaluation. `Unknown` and `Not captured` are valid values; never reconstruct missing metrics from budgets, estimates, or screenshots.

| Date | Tool / Model | Task type | Scenario | Input tokens | Output tokens | Total tokens | Latency | Structured output valid? | Human accepted? | Strengths | Weaknesses | Notes |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| 2026-09-19 | Nebius Token Factory / `deepseek-ai/DeepSeek-V4.1-Flash` | Fixed provider smoke | Fixed short ForgeMind smoke prompt | 41 | 37 | 78 | 2,045 ms | N/A; normalized readable text | Yes, for provider closure | Correct normalized text and usage on one explicit call | Earlier live response required parser hardening | Succeeded without retry; not a product-quality evaluation |
| 2026-09-19 repository entry | Nebius Token Factory / `deepseek-ai/DeepSeek-V4.1-Flash` | `REACTION_MODEL` | Guard hears one gunshot without visual confirmation; one ally nearby | 729 | 1,443 | 2,172 | 16,846 ms | Yes | Yes | Respected uncertainty; actionable coordination, exploits, and deterministic tests | Single scenario; no general reliability rate | Selected context and approved Decision were supplied; result remained non-authoritative |
| Date not captured in evidence entry | Nebius Token Factory / `deepseek-ai/DeepSeek-V4.1-Flash` | `COMPETENCE_TIERS` | Exact scenario not captured here | 746 | 2,159 | 2,905 | 19,517 ms | Yes | Yes | Meaningful tier differentiation, imperfect information, and implementation-oriented tests | A later Reaction Model attempt reached its then-current token limit | Do not compare directly with unmatched Nemotron work |
| Date not captured in evidence entry | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | AI Behavior Designer Specialist analysis; exact task not captured | Same-input comparison context existed; exact scenario not captured here | 1,096 | 1,045 | 2,141 | 6,454 ms | Valid JSON; failed then-current five-item bound | No, not as a full Specialist run | Fast recorded response and valid extractable JSON | Returned 7 recommendations where 5 were allowed | Provider success; application schema failure; no retry |
| Date not captured in evidence entry | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | Post-normalization Specialist run | Not captured in current docs | Not captured | Not captured | Not captured | Not captured | Yes, after bounded normalization | Useful local result; exact acceptance rating not captured | Completed full normalized workflow | Sample too small for recommendation | Capture the underlying stored run only if it is public-safe; do not expose private project content |
| 2026-09-27 user-observed | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | `NEW_PROJECT_CORE_LOOP` | Tactical extraction Creator draft | 388 | 262 | 650 | 2,500 ms | Yes | One proposal applied, then manually edited | Three concise, relevant, immediately usable proposals | Some suggestions introduced mechanics not explicitly supplied by the user | Recorded feedback evidence only; do not derive a universal score or acceptance rate |
| 2026-09-27 user-observed | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | `NEW_PROJECT_CORE_LOOP` regeneration | Same current Creator workflow; accepted Core Loop preserved | 417 | 295 | 712 | 2,037 ms | Yes | Alternatives reviewed, then discarded | Two useful alternatives; regeneration did not overwrite accepted editable content | Some plausible mechanics remained unconfirmed by the Creator draft | One explicit regeneration; no automatic retry or comparison call |
| 2026-09-27 user-observed | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | `NEW_PROJECT_DESIGN_PILLARS` | Tactical extraction Creator draft | 428 | 304 | 732 | 3,314 ms | Yes | Individual Accept and Apply All used; manual pillar preserved | Five relevant, useful pillars; individual and bulk application worked | Some proposals introduced unconfirmed systems such as crew morale, particular consumables, noise-driven pressure, or extraction-speed mechanics | Recorded feedback evidence only; assumptions require human review |
| 2026-09-27 user-observed | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | `NEW_PROJECT_CORE_LOOP` | Creator draft; sanitized specifics not recorded | 434 | 425 | 859 | 2,900 ms | Yes | Three proposals reviewed; accepted content remained editable | Three useful proposals; preflight and regeneration preservation worked | Multiple unestablished mechanics were presented without corresponding assumptions | Prompt-grounding evidence only; no general model score or reliability rate |
| 2026-09-27 user-observed | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | `NEW_PROJECT_CORE_LOOP` | Final NPC-2.2 grounding check; sanitized specifics not retained | 491 | 407 | 898 | 2,853 ms | No - `INVALID_CREATOR_AI_OUTPUT` | No proposal applied; draft stayed intact; manual continuation remained available | Strict rejection protected human-authored state and project truth | Exact structural mismatch unavailable because raw response text is not persisted | Most recent matching local usage record; an adjacent usage-only failure is documented above; no automatic retry path exists |
| 2026-09-27 user-observed | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | `NEW_PROJECT_CORE_LOOP` | Final NPC-2.2 grounding/normalization recheck; sanitized specifics not retained | 533 | 371 | 904 | 3,348 ms | Yes | Two proposals reviewed | Grounding/normalization passed and unsupported or new mechanics were separated as assumptions | Single task-specific observation | Closed the focused live recheck; no reliability percentage or universal score derived |
| 2026-09-29 user-observed | Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` | Writers' Room Lore Architect | Narrative session; private specifics not retained here | 447 | 189 | 636 | 1,795 ms | Yes; provider and persistence succeeded | No project truth applied | Concise and collaborative; asked three focused clarification questions; retained proposal-only semantics | Immediate post-run frontend became blank | Restart/reload rendered the saved response; WR-1.2 fixes the application normalization bypass offline; no general reliability claim |
| 2026-10-26 user-observed | Nebius Token Factory / exact model not captured in task evidence | WR-1.3 Writers' Room structured response | Narrative Context preflight found 4 established entries; private specifics not retained | Not captured | Not captured | Not captured | Not captured | No - `INVALID_WRITERS_ROOM_OUTPUT` after provider completion | No proposal or project truth applied | Context selection reached the intended established knowledge | Exact incompatible field is unavailable because raw response is not persisted | WR-1.3.1 hardens bounded structural compatibility offline; live recheck pending |
| 2026-10-26 user-observed | Nebius Token Factory / NVIDIA Nemotron; exact model ID not captured in task evidence | WR-1.3 Writers' Room structured response | Project Brain context and established knowledge were found; private specifics not retained | Not captured | Not captured | Not captured | Not captured | No - `INVALID_WRITERS_ROOM_OUTPUT` after provider completion | No proposal or project truth applied | Context selection again reached established knowledge | Second prompt-only response still failed local schema validation; exact mismatch unavailable by design | Motivated WR-1.3.2 provider-enforced `json_object` and safe structural diagnostics; no automatic retry |
| 2026-10-26 user-observed | Nebius Token Factory / NVIDIA Nemotron; exact model ID not captured in task evidence | WR-1.3.2 Writers' Room JSON-object response | Narrative Context Pack worked; private specifics not retained | Not captured | Not captured | Not captured | Not captured | No - `INVALID_WRITERS_ROOM_OUTPUT` after provider completion | No proposal or project truth applied | Provider-enforced valid JSON did not weaken project-truth safety | Expanded mode/nested-question contract still failed; exact mismatch unavailable by design | Motivated WR-1.3S restoration of the live-proven WR-1.2 shape; JSON_OBJECT and safe diagnostics retained |
| 2026-10-26 user-confirmed | Nebius Token Factory / NVIDIA Nemotron; exact model ID not supplied | WR-1.3S stabilized Writers' Room response | Sanitized scenario and detailed preflight not supplied | Not captured | Not captured | Not captured | Not captured | Yes | Not captured | Stable `message` / string `questions` / supplied-only `sourceRefs` / `proposals` flow passed live validation | Detailed response, token, latency, and proposal outcome evidence was not supplied | Closes the bounded WR-1.3S live recheck; no reliability rate inferred |
| YYYY-MM-DD | Tool / exact model ID | Feature Contract / Behavior Design / Exploit Analysis / Test Design / Creator proposal / Next Steps refinement | Sanitized scenario identifier | Unknown | Unknown | Unknown | Unknown | Yes / No / Partial | Yes / No / Needs revision | Specific observed strength | Specific observed weakness | Grounding issue, normalization notice, failure category, or other evidence |

## Evidence collection and credit-usage plan

The goal is to create decision-useful evaluation evidence, not to spend the entire credit balance. Do not record an exact remaining balance here unless it becomes an intentionally maintained datum.

For each selected run:

1. Choose one public-safe or sanitized scenario with clear acceptance criteria.
2. Record the exact model ID, ForgeMind workflow, task type, and input context class.
3. Trigger one explicit request; do not add background calls, automatic retries, or automatic multi-model execution.
4. Capture latency and provider-reported input/output/total tokens where available.
5. Record JSON/schema validity and any normalization notice separately from reasoning quality.
6. Have a human mark accepted, rejected, or needs revision and state why.
7. Record unsupported claims, hallucinations, missing evidence, or authority/provenance mistakes.
8. Compare only like-for-like inputs and settings; do not infer a universal winner.

Priority task set:

- **Feature Contract drafting:** completeness, bounded scope, evidence-supported locations, and no invented implementation detail.
- **Behavior Design:** uncertainty handling, deterministic rules, exploits, and testability.
- **Exploit Analysis:** specificity, false-positive rate, evidence discipline, and mitigation quality.
- **Test Design:** deterministic coverage, feasibility, and traceability to acceptance criteria.
- **New Project Creator proposals:** five successful user-observed NPC-2 runs and one user-visible structured-output failure are recorded above. The failure was safely rejected with no draft or project-truth mutation, bounded resilience hardening followed without loosening semantics, and the final grounding/normalization recheck passed. The sample is too small for a success rate, universal model score, or winner claim.
- **Recommended Next Steps AI refinement:** NEXT-1 deterministic local guidance is implemented without AI. Optional NEXT-2 provider refinement remains unimplemented and must not be claimed.

Stop collecting when there is enough evidence to write honest, specific feedback. Preserve credits for final demo recovery and one controlled confirmation run if a materially changed workflow needs it.

## API key and secret safety checklist

Use [Security and Privacy Architecture](SECURITY_AND_PRIVACY.md) as the detailed source. Current environment-variable/BYOK handling is real; a universal Secret Guard is not implemented.

- [ ] No API keys, access tokens, passwords, private keys, or authorization data are committed.
- [ ] No credentials appear in application source, tests, fixtures, docs, shell examples, logs, or generated artifacts.
- [ ] No credentials are stored anywhere under project-owned `.forgemind/` data.
- [ ] No token or credential value is visible in screenshots, recordings, terminal history, captions, or video-editing assets.
- [ ] Example configuration uses placeholders only.
- [ ] Environment-variable/BYOK setup is documented and re-tested from a clean environment.
- [ ] The final repository receives an intentional secret scan before publication and again before submission.
- [ ] `.gitignore` is reviewed for local secret/configuration files and capture/export artifacts.
- [ ] Git history is considered, not only the current working tree.
- [ ] No private dogfood-project content, path, lore, source excerpt, screenshot, manifest, or identifier is accidentally committed or shown.
- [ ] Public examples and demo workspaces are sanitized and approved for publication.
- [ ] Submission copy does not claim the planned Secret Guard, Security Preflight, Context Preview, credential vault, or encryption is implemented.

## Public repository checklist

- [ ] Repository visibility is public and independently accessible while signed out.
- [x] Root README is concise, current, and names Nebius Token Factory and NVIDIA Nemotron clearly.
- [ ] Setup and run instructions work from a clean checkout.
- [x] MIT `LICENSE` is present and visible at the repository root/top level.
- [ ] Internal and external links have been checked.
- [ ] No private or local absolute paths appear in tracked public content.
- [ ] Screenshots and recordings are intentional, current, and public-safe.
- [ ] ForgeMind brand assets are intentional and licensing/ownership is clear.
- [ ] Test fixtures, dogfooding data, diagnostics, and temporary files are not presented as production data.
- [x] The architecture and Intent -> Reality -> Alignment -> Feature Contract story are understandable without internal context.
- [x] Build and test instructions are present and accurate.
- [ ] A reviewer can evaluate ForgeMind without access to private dogfood-project data.
- [ ] The working demo/test-build URL is public, stable enough for judging, and documented.
- [ ] If applicable, the submission explains significant work completed during the submission period.

## Intended Built With

Include only technologies actually present in the submitted build:

- Nebius Token Factory
- NVIDIA Nemotron 3 Super 120B (`nvidia/nemotron-3-super-120b-a12b`)
- Tavily Search API
- Tauri 2
- React
- TypeScript
- Rust
- Vite
- Unity integration / ForgeMind Unity GroundTruth tooling
- Git

DeepSeek V4.1 Flash may be named in the technical description or feedback comparison because it was actually used, but it must not obscure the required NVIDIA model. Do not list planned routing, Secret Guard, cloud collaboration, hosted services, or unimplemented Creator/Next Steps behavior.

### TAV-1 source-aware synthesis demo

The bounded acceptance story must show the service split truthfully:

1. Project Brain supplies established project direction.
2. The developer explicitly chooses **Research web**, reviews the Basic Search / five-source disclosure, and confirms one Tavily Search.
3. Tavily retrieves live external source snippets; the developer inspects and selects them. They remain visibly `EXTERNAL RESEARCH`, not project knowledge.
4. A later normal Writers' Room request shows **External research provider: Tavily** and **Nemotron provider: Nebius Token Factory** before one explicit Nemotron request.
5. NVIDIA Nemotron synthesizes Project Brain plus selected research using supplied-only citations. An optional proposal remains pending until human Review/Edit and explicit Apply.

The first user-driven workflow completed both service boundaries: Tavily Search succeeded, normalized sources reached Writers' Room as `EXTERNAL_RESEARCH`, preflight separated Tavily from Nebius Token Factory, and Nemotron synthesis ran with selected research. The tactical-game/faction query returned predominantly low-relevance software-design/OOP sources. TAV-1.1 audited the current path and found that the editable visible query becomes Tavily's `query` after outer-whitespace trimming only; no stale, fallback, truncation, wrong-field, prior-session, hidden-rewrite, or serialization defect was identified. The submission must present this as one honest relevance limitation, not claim Tavily quality was fixed.

The revised demo uses a compact selectable right drawer with the persisted query, vertical bounded results, selected count, and a working safe default-browser action. Use a fresh Writers' Room session so prior correctly persisted `APPLIED` proposals do not visually confuse the research story. Record actual provider/status/result-count/latency evidence without copying private prompts, source bodies, credentials, or raw provider responses. Do not imply Tavily is the LLM or that web results automatically become project truth. The submitted claim remains Basic Search, maximum five results, no answer/raw content, no Crawl/Extract, no semantic retrieval, no autonomous research, and no automatic retry.

### IMP-1 existing-project knowledge demo

IMP-1 may support the existing-project story after its controlled manual PASS:

1. Use only the public-safe synthetic colony fixture or another sanitized disposable project.
2. Open **Game Wiki -> Import Knowledge**, select 1-3 contained `.md` files, and show the one-request Nebius Token Factory / NVIDIA Nemotron preflight.
3. Show the transient Candidate Review Queue with factual Knowledge, an explicit Open Question, an optional clear Decision, confidence, duplicate status, and project-relative `DOCUMENTED` source trace.
4. Edit/deselect one candidate and explicitly **Apply Selected**.
5. Show immediate Wiki projection from Compendium/Decisions, a proposed rather than approved Decision, and a later Lore Architect context trace that resolves imported narrative knowledge through Project Brain.

Submission copy must say Markdown-only, review-first, human Apply, and documented origin. It must not claim automatic Canon, verification, whole-repository crawling, generic ingestion, semantic/vector search, Rebaseline, Tavily import, Decision auto-approval, or autonomous action. Do not show private dogfood-project data, absolute machine paths, raw responses, or credentials.

## 3-Minute Demo Video

DEMO-0's public-safe Hollow Reach template, exact operator path, prompts,
failure fallbacks, and reset procedure are maintained in the
[DEMO-0 Runbook](DEMO_RUNBOOK.md). This clean baseline does not by itself close
video production or authorize a provider request, recording, upload, or publication.

The current judge-facing timing, exact voice-over, shot sequence, genuine-fallback
rules, screenshot plan, and final QA gates are maintained in the
[3-Minute Demo Storyboard](DEMO_STORYBOARD.md). It supersedes the earlier
feature-oriented timing scaffold for the final cut without changing DEMO-0's
data, prompt, safety, or reset contract.

### Optional MODEL-1 proof shot

If the final cut benefits from visible model awareness, briefly open **AI Models** after one user-driven catalog refresh. Show the explicit Nebius Token Factory catalog versus ForgeMind enabled registry distinction, Nemotron as default, verified JSON Object metadata, and observed local usage. Do not spend demo time making an alternate inference call, and do not describe availability or latency as quality, ranking, pricing, benchmarking, or automatic routing.

Treat the video as a pitch supported by a working product, not as a tutorial. Target `2:30-2:40`; the current storyboard targets `2:38` to leave clear margin under three minutes.

### Story structure and shot list

Use the exact table in [3-Minute Demo Storyboard](DEMO_STORYBOARD.md). The final
story is reviewed Markdown -> Nemotron extraction through Nebius -> human review
and Apply -> updated Project Brain -> source-aware Writers' Room -> explicitly
selected Tavily research -> Nemotron synthesis with external authority preserved.
AI Models is a short supporting proof; Git/Unity/Alignment receives only a brief
closing visual if the final cut remains within target.

### Production checklist

- [ ] Record with OBS or an equivalent reliable screen-capture tool.
- [ ] Use a clean, deterministic, public-safe app/workspace state.
- [ ] Hide notifications, credentials, terminals with secrets, machine paths, and private project data.
- [ ] Lock the final narration script before the main capture.
- [ ] Choose human or AI voiceover and verify the result is intelligible and permitted.
- [ ] Add captions/subtitles and proofread Nebius, NVIDIA, Nemotron, model IDs, and technical terms.
- [ ] Use lightweight editing; remove loading dead time and cursor wandering.
- [ ] Avoid tutorial-style deep navigation and configuration detours.
- [ ] Crop/zoom so labels remain readable at normal YouTube playback size.
- [ ] Keep ForgeMind branding visible without obscuring the product.
- [ ] Mention Nebius and NVIDIA audibly, not only in captions or on-screen text.
- [ ] Complete the draft script.
- [ ] Complete the shot list and capture order.
- [ ] Run a final timing pass with credits/end card included.
- [ ] Check subtitle timing and spelling.
- [ ] Normalize audio and verify speech on headphones and laptop speakers.
- [ ] Export at a common YouTube-compatible resolution and codec.
- [ ] Watch the final export end to end before upload.
- [ ] Upload to YouTube and verify public visibility while signed out.
- [ ] Confirm the public link plays, audio works, captions load, and duration is shorter than 3 minutes.

### Voice-over script

Use the exact 359-word script in [3-Minute Demo Storyboard](DEMO_STORYBOARD.md).
Do not expand it into a feature list or add claims during recording.

## Devpost submission draft

The evidence-backed, judge-facing draft is maintained in [Devpost Submission Draft](DEVPOST_SUBMISSION_DRAFT.md). The fields below remain a compact final-form cross-check rather than the primary draft.

Complete this section from the final public build and video. Do not copy internal planning claims into Devpost without verification.

- **Project title:** `ForgeMind`
- **One-line pitch:** `[Adapt the current README positioning into one concise sentence.]`
- **Short description:** `[Problem + audience + demonstrated outcome in 2-3 sentences.]`
- **Longer description:** `[Expanded product story tied to the submitted build.]`
- **Problem:** `[Why game-development intent and implementation drift apart.]`
- **Solution:** `[How ForgeMind connects Intent, Reality, Alignment, and delivery scope.]`
- **How it works:** `[Walk through only the demonstrated current workflow.]`
- **Why Nebius:** `[Specific Token Factory integration, workflow coverage, metering, and observed developer experience.]`
- **Why NVIDIA:** `[Exact Nemotron model, demonstrated tasks, evidence, strengths, and limitations.]`
- **Technical architecture:** `[Tauri/React/TypeScript UI, narrow Rust native boundary, local-first JSON, Git/Unity Reality, provider boundary.]`
- **Key differentiators:** `[Human authority, provenance, Reality grounding, explicit Alignment, deterministic handoff.]`
- **Built With:** `[Use the verified list above and final Devpost tags.]`
- **Links:** `[Public product/demo/test-build URL and any intentional supporting links.]`
- **Source repository:** `[Public repository URL.]`
- **Demo video:** `[Public YouTube URL, shorter than 3:00.]`
- **Required feedback:** `[Condensed, evidence-backed Nebius and NVIDIA feedback from this document.]`
- **Submission-period work:** `[Complete only if the pre-existing-project rule applies.]`

## Final submission checklist

### FINAL MANUAL ARTIFACTS

- [x] README complete for SUB-1.
- [x] Devpost draft created and linked.
- [x] Built With names each implemented service and its role.
- [x] Current limitations are explicit.
- [x] Nebius Token Factory feedback is evidence-backed.
- [x] NVIDIA Nemotron feedback is evidence-backed.
- [x] Tavily's explicit, reviewed `EXTERNAL_RESEARCH` role is visible.
- [x] Exact demo storyboard, 359-word voice-over, fallback strategy, recording checklist, screenshot list, and video QA checklist are complete for SUB-2.
- [ ] Public-safe screenshots are captured, reviewed, and added.
- [ ] Demo video is captured, edited, captioned, and under three minutes.
- [ ] Public YouTube video URL is added and verified while signed out.
- [ ] Final Devpost fields and track are completed in rendered form.
- [ ] Public GitHub URL is added and verified while signed out.
- [ ] Working demo or test-build URL is added and verified.
- [ ] Final secret/current-history scan passes after all assets and links are added.
- [ ] Final fresh-clone setup and smoke pass.
- [ ] Final submission is completed and confirmation retained.

### PRODUCT

- [ ] Submitted build works from a clean evaluation path.
- [ ] Core demo flow works end to end.
- [ ] No known critical bug blocks the demonstrated workflow.
- [ ] Public demo project/workspace state is clean and reproducible.

### REPO

- [ ] Repository is public.
- [ ] README is current.
- [ ] License is present and visible.
- [ ] No secrets or credentials are present in current files or history.
- [ ] No private project data is present.
- [ ] Setup, demo, and documentation links work.

### NEBIUS

- [ ] Nebius Token Factory is clearly named.
- [ ] Required Token Factory feedback is complete and specific.
- [ ] Usage evidence is captured and reviewed.

### NVIDIA

- [ ] Exact model ID/name is clearly stated.
- [ ] Required NVIDIA model feedback is complete and specific.
- [ ] NVIDIA model use is visible and explained in the video.

### VIDEO

- [ ] Final duration is shorter than 3 minutes.
- [ ] Audio narration is present and intelligible.
- [ ] Captions are present and checked.
- [ ] Nebius is mentioned audibly.
- [ ] NVIDIA and the model are mentioned audibly.
- [ ] A working ForgeMind build is shown.
- [ ] Public YouTube link works while signed out.

### DEVPOST

- [ ] Project title is final.
- [ ] Description is final and evidence-backed.
- [ ] Category is selected.
- [ ] Built With is complete.
- [ ] Nebius and NVIDIA feedback is complete.
- [ ] Working demo/test-build link is present.
- [ ] Public repository link is present.
- [ ] Public video link is present.
- [ ] Any required submission-period update explanation is present.
- [ ] Draft is reviewed in final rendered form.
- [ ] Submission is completed before the deadline and confirmation is retained.

## Internal timeline

- **External deadline:** Friday, October 30, 2026 at 10:00 AM Pacific Time.
- **Internal soft deadline:** October 26-27, 2026.
- **Reserved final days:** critical bug fixes, final capture/edit, upload processing, copy review, signed-out link verification, secret/public-data review, and final Devpost QA.

Do not plan to finish the video or first complete submission draft on the external deadline day.

## Submission workstream status

- **SUB-0 - Submission requirements documented - COMPLETE:** this document records confirmed requirements, evidence templates, safety/repository checks, video strategy, copy placeholders, and final QA without changing application behavior.
- **SUB-1 - README + Devpost draft + public-facing cleanup - COMPLETE:** the root README, Devpost draft, public asset capture plan, Built With copy, honest limitations, Nebius/NVIDIA feedback, Tavily role, and remaining manual checklist are prepared without changing product behavior or making provider calls.
- **SUB-2 - 3-Minute Demo Storyboard + Voice-over - COMPLETE:** the `2:38` judge-facing Hollow Reach storyboard, 359-word script, four-call live strategy, genuine-result fallbacks, recording preparation, screenshot list, and final QA checklist are documented without making a provider call or changing product behavior.
- **SUB-3 - Public repository and evaluator finalization - PLANNED:** add reviewed screenshots and public URLs, then repeat clean-checkout, secret/history, private-data, link, setup, license, and distribution checks.
- **SUB-4 - Video production - PLANNED:** capture, edit, caption, export, upload, and verify public playback.
- **SUB-5 - Final submission QA - PLANNED:** verify every product, repository, Nebius, NVIDIA, video, and Devpost gate and submit.

SUB work is a delivery/readiness track, not a product-milestone reorder. Future SUB items remain incomplete until their evidence is recorded.
