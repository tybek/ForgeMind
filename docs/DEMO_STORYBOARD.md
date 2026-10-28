# ForgeMind 3-Minute Demo Storyboard

## Video objective

Produce a judge-facing product demo that reaches the core value within 30 seconds and finishes in approximately **2:30-2:40**, safely below the required three-minute limit.

The video tells one story:

```text
Existing Markdown
-> NVIDIA Nemotron extracts candidates through Nebius Token Factory
-> a human reviews and applies selected knowledge
-> Project Brain updates through its owning domains
-> Writers' Room reasons over that reviewed knowledge with sources
-> Tavily adds explicitly selected external research
-> external research remains separate from project truth
```

The audience is indie developers and small game teams whose project truth is fragmented across documents, conversations, Git, Unity, and AI output. The product rule is: **AI can propose. Humans decide what becomes project truth.**

Use the public-safe **Hollow Reach** workspace and the reset/safety rules in the [DEMO-0 Runbook](DEMO_RUNBOOK.md). This SUB-2 storyboard supersedes the older runbook timing and feature-oriented shot scaffold for the final cut; the runbook remains authoritative for demo data, prompts, expected states, failure honesty, and reset procedure.

## Exact storyboard

| Time | Screen | User action | What must be visible | Voice-over | Fallback if live call is slow or fails |
| --- | --- | --- | --- | --- | --- |
| `0:00-0:08` | Hollow Reach **Overview** | Begin already inside ForgeMind; move once toward the project summary. | ForgeMind name, Hollow Reach, clean project overview, no loading or setup screen. | “Game teams lose project truth across documents, conversations, Git, Unity, and AI output. ForgeMind reconnects it.” | Use a static clean Overview take. No provider action is needed. |
| `0:08-0:25` | **Game Wiki -> Import Knowledge** | Open Import Knowledge, select only `docs/combat-direction.md`, continue to preflight. | Project-relative source, **Nebius Token Factory**, **NVIDIA Nemotron 3 Super 120B**, review-before-Apply wording. | “This is Hollow Reach, our public demo project. Its design notes already exist as Markdown. From Game Wiki, I select one combat document. ForgeMind prepares a reviewed import instead of treating the file, or the model's interpretation, as instant canon.” | Stop at genuine preflight if selection takes too long. Do not imply extraction has occurred. |
| `0:25-0:45` | **Candidate Review Queue** | Confirm one extraction, then show candidate types. Briefly edit or deselect one real candidate. | At least one Project Knowledge candidate; where genuinely returned, a Proposed Decision and Open Question; confidence/source trace; selection controls. | “NVIDIA Nemotron 3 Super 120B runs through Nebius Token Factory to extract structured candidates. These can include project knowledge, a proposed Decision, and an Open Question. Nothing has changed yet. I can inspect the source, edit a candidate, and deselect anything I do not want.” | Cut to a separately captured genuine successful review-queue take from the same public-safe source. If no genuine success exists, show the explicit error/empty state and use a prepared genuine post-import copy only as a clearly separate subsequent shot. Never fabricate candidates. |
| `0:45-1:05` | **Apply Selected -> Game Wiki** | Choose Apply Selected; close the result and select one newly applied Wiki item. | Actual applied/skipped counts, updated Wiki, `DOCUMENTED` provenance, `PROPOSED` Decision and unresolved question only if genuinely applied. | “Only when I choose Apply Selected does ForgeMind write through the owning project domains. The Wiki updates immediately, preserving DOCUMENTED provenance. The model extracts candidates; I decide what actually becomes part of the project. This is the core authority rule: AI can propose, but humans decide what becomes project truth.” | Use a genuine prepared post-import Hollow Reach copy produced by a reviewed run. Keep the transition as an obvious edit; do not imply a failed current request succeeded. |
| `1:05-1:20` | **Writers' Room -> Lore Architect** | Open a clean session and enter the primary prompt. Show preflight before Send. | Prompt, Lore Architect profile, bounded Narrative Context, imported Project Brain source count, Nebius/Nemotron disclosure. | “Now I open a clean Lore Architect session in Writers' Room and ask what is already established about Hollow Reach, and which unresolved question matters most. Before sending, ForgeMind shows the bounded Narrative Context it will use.” | If session creation or preflight is slow, use a clean prepared session with the exact public-safe prompt entered but not yet sent. |
| `1:20-1:35` | **Writers' Room response and Sources Used** | Confirm one Nemotron request; reveal only the answer lead and source trace. Optionally open one source and return with **Back to Lore Architect** if the timing remains clean. | Source-aware answer, Narrative Context/Sources Used, imported `DOCUMENTED` Project Brain source. | “This is not a blank chat. Nemotron reasons over the reviewed Project Brain and returns a source-aware answer. The imported combat direction appears in Sources Used, so I can trace the response back to the knowledge I approved.” | Cut to a genuine saved Lore Architect response from the same public-safe workflow. Omit source navigation before cutting the source trace itself. |
| `1:35-1:55` | **Research web -> Tavily results** | Open Research web, show the prepared query, confirm one search, then deselect at least one irrelevant source. | **Tavily**, Basic Search/five-source boundary, query, result cards, selection count, `EXTERNAL_RESEARCH` labels. | “When the project needs outside examples, Research web makes a separate Tavily search. I review the results and select only useful sources. Every card remains labeled EXTERNAL RESEARCH. Outside material does not become Hollow Reach canon.” | Use a genuine successful Tavily-results clip captured earlier with the same public-safe query. If results are poor, show selection/deselection honestly; do not claim relevance improved. |
| `1:55-2:15` | **Writers' Room synthesis** | Enter the synthesis prompt, show provider-separated preflight, confirm one Nemotron request, then reveal the source trace. | Project Brain count plus selected Tavily count; Tavily and Nebius named separately; response citing both Project Brain and external source classes. | “Then Nemotron can compare selected Tavily patterns with Hollow Reach's established direction. The result keeps Project Brain sources and external sources visible together without merging their authority. One live result set had poor relevance, so source selection stays human and explicit.” | Cut to a genuine saved synthesis response with both source classes. If no genuine synthesis is available, keep the successful Tavily selection shot and omit the claimed synthesis result. |
| `2:15-2:28` | **AI Models** | Open the already prepared page; expand Nemotron and briefly point to another discovered model. Do not refresh or run a model during the take. | Token Factory catalog, Nemotron default, verified JSON Object capability, another available model, local observed runs/median latency labeled as observations. | “AI Models separates Token Factory availability from ForgeMind-verified capability. Nemotron is the JSON Object default; unknown models cannot silently enter structured workflows. Local run and latency figures are observations, not rankings.” | Use a clean clip captured after a genuine catalog refresh. If the catalog is unavailable, show the existing registry and omit any claim about the current provider catalog. |
| `2:28-2:38` | **Overview or Alignment -> end card** | Show one brief Intent/Reality/Alignment visual, then cut to the ForgeMind end card. | `INTENT ↔ REALITY ↔ ALIGNMENT`; ForgeMind; **Turn ideas into playable worlds.** Optional service line: Nebius Token Factory · NVIDIA Nemotron · Tavily. | “ForgeMind also compares intent with read-only Git and Unity evidence, making drift visible. Use AI without losing project truth. ForgeMind: turn ideas into playable worlds.” | Use Overview plus a designed text end card. Do not add a Reality claim that is not visible in the selected public-safe state. |

Target final duration: **2:38**. Every segment is independently capturable, allowing loading time and cursor travel to be removed without presenting fabricated output.

## Full voice-over script

<!-- VOICEOVER START -->

Game teams lose project truth across documents, conversations, Git, Unity, and AI output. ForgeMind reconnects it.

This is Hollow Reach, our public demo project. Its design notes already exist as Markdown. From Game Wiki, I select one combat document. ForgeMind prepares a reviewed import instead of treating the file, or the model's interpretation, as instant canon.

NVIDIA Nemotron 3 Super 120B runs through Nebius Token Factory to extract structured candidates. These can include project knowledge, a proposed Decision, and an Open Question. Nothing has changed yet. I can inspect the source, edit a candidate, and deselect anything I do not want.

Only when I choose Apply Selected does ForgeMind write through the owning project domains. The Wiki updates immediately, preserving DOCUMENTED provenance. The model extracts candidates; I decide what actually becomes part of the project. This is the core authority rule: AI can propose, but humans decide what becomes project truth.

Now I open a clean Lore Architect session in Writers' Room and ask what is already established about Hollow Reach, and which unresolved question matters most. Before sending, ForgeMind shows the bounded Narrative Context it will use.

This is not a blank chat. Nemotron reasons over the reviewed Project Brain and returns a source-aware answer. The imported combat direction appears in Sources Used, so I can trace the response back to the knowledge I approved.

When the project needs outside examples, Research web makes a separate Tavily search. I review the results and select only useful sources. Every card remains labeled EXTERNAL RESEARCH. Outside material does not become Hollow Reach canon.

Then Nemotron can compare selected Tavily patterns with Hollow Reach's established direction. The result keeps Project Brain sources and external sources visible together without merging their authority. One live result set had poor relevance, so source selection stays human and explicit.

AI Models separates Token Factory availability from ForgeMind-verified capability. Nemotron is the JSON Object default; unknown models cannot silently enter structured workflows. Local run and latency figures are observations, not rankings.

ForgeMind also compares intent with read-only Git and Unity evidence, making drift visible. Use AI without losing project truth. ForgeMind: turn ideas into playable worlds.

<!-- VOICEOVER END -->

Speaking target: approximately **135-150 words per minute**. Record the narration after the picture edit, then adjust pauses rather than adding new claims. Do not read UI labels that are already obvious on screen.

## Live-call and fallback strategy

### A. Record as genuine live product actions

Plan four explicit runtime calls for the workflow shown in the final video:

1. one Nebius Token Factory / Nemotron Knowledge Import extraction;
2. one Nebius Token Factory / Nemotron Lore Architect response;
3. one Tavily Basic Search; and
4. one Nebius Token Factory / Nemotron synthesis using Project Brain plus selected Tavily sources.

That is **four live workflow calls: three Nebius/Nemotron inference requests and one Tavily Search**. Each confirmation authorizes exactly one request. Do not retry automatically or run another model for the video.

Record the actions as separate takes rather than depending on one uninterrupted performance. Keep the genuine loading state long enough to prove an action began, then remove dead waiting time in the edit.

### B. Prepare before recording

- Duplicate the pristine Hollow Reach template into a fresh take-specific workspace outside the source checkout.
- Verify credentials before capture without showing their values.
- Perform one explicit Token Factory catalog refresh before the take, then leave AI Models ready; this preparatory catalog request is separate from the four workflow calls above.
- Confirm Nemotron is enabled/default with verified JSON Object capability.
- Rehearse the exact click path with a disposable copy only if separately authorized.
- Prepare a second genuine post-import copy and a clean Writers' Room session only from successful, reviewed public-safe runs.
- Pre-navigate tabs or pages where this reduces cursor travel, but preserve an understandable product flow.

### C. Capture genuine fallbacks

- Capture a successful Candidate Review Queue before the main edit if an authorized run produces one.
- Preserve a genuine post-import workspace copy showing the applied Wiki state.
- Preserve a genuine saved Lore Architect response with source trace.
- Preserve a genuine Tavily result drawer and, if successful, a genuine synthesis response showing both source classes.
- Capture AI Models only after a real catalog refresh; displayed usage and latency must be actual installation-local observations.

Fallback clips may replace a slow or failed take, but they must show real results from the public-safe Hollow Reach workflow. Never insert invented candidates, prose, metrics, sources, or provider success. If a required genuine result is unavailable, shorten or omit that claim and keep the visible failure honest.

## Recording checklist

### Workspace and application

- [ ] Duplicate the pristine Hollow Reach template; never record against or edit the committed template.
- [ ] Confirm the copy opens as **Hollow Reach** with the expected sparse baseline.
- [ ] Restart ForgeMind before capture.
- [ ] Confirm no debug/test entries, unrelated projects, private content, or old sessions are visible.
- [ ] Create or select a clean Lore Architect session.
- [ ] Clear Tavily results unless the shot intentionally begins from a genuine prepared research state.
- [ ] Confirm the sidebar is in the intended compact/expanded state for every shot.
- [ ] Pre-navigate destination screens where useful without obscuring the workflow.

### Providers and network

- [ ] Configure `NEBIUS_API_KEY` and `TAVILY_API_KEY` outside project files before launch; never display either value.
- [ ] Confirm network connectivity.
- [ ] Confirm Nebius Token Factory and Tavily configured status without making an unnecessary inference/search request.
- [ ] Refresh the Token Factory catalog once before recording and confirm the page is ready.
- [ ] Confirm NVIDIA Nemotron 3 Super 120B is the enabled/default JSON Object model.
- [ ] Confirm no automatic retry, alternate-model run, or extra research query is planned.

### Capture environment

- [ ] Record at 1920×1080 or another final 16:9 1080p-readable resolution.
- [ ] Set the ForgeMind window size and zoom so labels remain readable after YouTube compression.
- [ ] Check the microphone, input level, room noise, and sample recording.
- [ ] Disable notifications and close unrelated applications, terminals, credential views, and browser tabs.
- [ ] Keep the mouse pointer visible but move it deliberately; avoid circling or rapid wandering.
- [ ] Verify sufficient recording disk space and the intended output directory.
- [ ] Use a stable frame rate and common editor/YouTube-compatible codec.

### Content readiness

- [ ] Keep `docs/combat-direction.md` as the only import source.
- [ ] Copy the exact Writers' Room prompt, Tavily query, and synthesis prompt from the DEMO-0 Runbook.
- [ ] Confirm every prepared fallback came from a genuine authorized run and public-safe data.
- [ ] Confirm no raw provider response, credential, machine path, private identifier, or unrelated usage history is visible.
- [ ] Prepare the final ForgeMind end card with **Turn ideas into playable worlds.**

## Screenshot capture list

Capture three or four stills during the same public-safe recording session:

1. **Knowledge Import Review Queue** — show candidate types, selection controls, project-relative `DOCUMENTED` source trace, and no credential or machine path.
2. **Game Wiki after Apply** — show the updated knowledge plus documented provenance; include a proposed Decision or unresolved Open Question only if it was genuinely applied.
3. **Writers' Room with source trace** — show the answer lead and Sources Used. Prefer the synthesis state if it clearly shows both Project Brain and selected `EXTERNAL_RESEARCH` without overcrowding the frame.
4. **AI Models** — show Token Factory catalog versus ForgeMind registry, Nemotron as default, verified JSON Object capability, and real observed local metrics. If the Tavily drawer is visually stronger, use it instead and keep the screenshot set to four.

Do not create separate images merely to cover every feature. The strongest default set is Review Queue, updated Wiki, Writers' Room source trace, and AI Models.

## Final video QA checklist

### Story and timing

- [ ] Final duration is shorter than `3:00`.
- [ ] Target duration is `2:30-2:40`; investigate any cut outside that range.
- [ ] ForgeMind/Hollow Reach is visible within the first `5-8` seconds.
- [ ] The fragmented-project-truth problem is clear within the first `20` seconds.
- [ ] The reviewed-import/Project Brain aha moment lands by approximately `0:30`.
- [ ] The cut tells one workflow rather than listing features.
- [ ] No segment becomes a setup tutorial or internal development log.

### Required proof

- [ ] **Nebius Token Factory** is both named in voice-over and visible on screen.
- [ ] **NVIDIA Nemotron 3 Super 120B** is both named in voice-over and visible on screen.
- [ ] Tavily's retrieval role and `EXTERNAL_RESEARCH` authority are visible.
- [ ] Human candidate review and **Apply Selected** are visible.
- [ ] The updated Project Brain/Game Wiki state is visible.
- [ ] Writers' Room source trace includes reviewed Project Brain knowledge.
- [ ] The synthesis shot shows Project Brain and selected Tavily sources as separate source classes.
- [ ] AI Models distinguishes provider availability from ForgeMind-verified capability.
- [ ] Any Git/Unity/Alignment statement remains brief, read-only, and supported by the visible shot.

### Safety and honesty

- [ ] No credential value, authorization data, terminal secret, absolute machine path, private identifier, or private project content is visible.
- [ ] No test/debug fixture, unrelated session, stale notification, or accidental browser tab is visible.
- [ ] Every shown provider result is genuine; no candidate, source, answer, metric, or success state is fabricated.
- [ ] Any fallback clip came from the same public-safe workflow and does not misrepresent a failed current request as successful.
- [ ] Poor Tavily relevance, if visible, is handled through honest source selection rather than hidden or described as fixed.
- [ ] Observed model metrics are described as local observations, not benchmarks or rankings.

### Presentation

- [ ] No long loading pauses, cursor wandering, unreadable dialogs, or dead transitions remain.
- [ ] UI labels, source trace, provenance, and model names are readable at 1080p playback size.
- [ ] Voice-over is understandable at normal volume on headphones and laptop speakers.
- [ ] Captions are present and correctly spell ForgeMind, Nebius, NVIDIA, Nemotron, Tavily, Hollow Reach, and Project Brain.
- [ ] Music, fonts, icons, and any third-party material are cleared for public use.
- [ ] The closing ForgeMind name and **Turn ideas into playable worlds.** remain visible long enough to read.
- [ ] The exported file is watched end to end before upload.
- [ ] The public YouTube link plays while signed out, includes audio/captions, and reports a duration under three minutes.
