# Validation Policy

ForgeMind validation is headless-first. React behavior, workspace persistence, and AI-provider normalization should fail in automated tests or command-line checks before anyone reaches for desktop automation.

## Validation ladder

Use the smallest applicable step first, then broaden only after it passes:

1. Run focused TypeScript/frontend tests and relevant native tests for the changed behavior.
2. From `app/`, run `npm run check` and `npm run test:native`.
3. When code, configuration, or a milestone boundary warrants build validation, run `npm run build` and `npm run tauri build -- --no-bundle`.
4. From the repository root, run `git diff --check`.

For documentation-only changes, `git diff --check` plus any available link-consistency check is sufficient; do not run expensive builds without a code or configuration reason. Live provider calls require explicit authorization. Use a short user-driven GUI smoke only when a visual or native-window boundary cannot be validated headlessly.

Hackathon submission documentation follows the same documentation-only boundary. For changes to [Hackathon Submission Readiness](HACKATHON_SUBMISSION.md), verify local Markdown links and anchors, re-check cited official requirements when they may have changed, run `git diff --check`, and confirm no credentials or private dogfood-project content entered the diff. Do not run builds, live AI, GUI automation, publication, or upload steps solely to validate a planning-document change.

**HEADLESS FIRST. GUI LAST.**

## Fast offline loop

Run from `app/`:

```powershell
npm run check
npm run test:native
```

`npm run check` runs the TypeScript check and Vitest component suite. The frontend provider boundary is mocked, so these tests never use a credential or network connection.

`npm run test:native` runs Rust tests against temporary workspace fixtures plus deterministic provider request, response, error, model-registry, cost, local usage-storage, aggregation, and mock behavior. It also tests the smoke command's argument contract without making a provider request. Neither command opens ForgeMind, Windows Explorer, or a native picker.

The usage fixtures assert that duplicate or unknown models fail safely, explicit prices calculate correctly, unknown pricing remains unavailable, task categories are optional, session/project/model summaries are deterministic, and persisted records contain no prompts, responses, credentials, or authorization headers.

Project Interview frontend tests mock every native/provider boundary and cover start, sections, answers, explicit AI invocation, provider failure with answer preservation, candidate provenance and status, edit/approve/discard review, approved-only completion, cancel, reopen, and replacement confirmation. Native tests use temporary workspaces to validate prompt bounds, structured-output parsing, schema/version checks, approved-only persistence, invalid-file handling, overwrite prevention, portability, and secret/raw-response exclusion.

The interview truncation regression asserts that `OUTPUT_TRUNCATED` does not clear the entered answer and never triggers an automatic retry. Native tests assert the 1,200-token bounded request, unchanged `minimal` reasoning, the compact completion schema, a maximum of three candidates, and continued rejection of malformed or expanded output.

0F frontend tests mock all native boundaries and cover honest empty states, explicit interview import, duplicate-safe repeated import, manual create/edit/status/deprecation, provenance/source visibility, knowledge promotion, proposed Decision creation/editing, required rationale display, separate approval, supersession with predecessor retention, and clear persistence failures. Native temporary-workspace tests validate versioned Compendium and Decision files, enum/UUID/timestamp rejection, portable content, import preservation and duplicate protection, knowledge relationships, explicit approval, and history-safe supersession. These tests perform no AI request.

0G frontend tests mock the specialist, history, model-registry, Compendium, and Decision boundaries. They cover the responsive workbench structure, loading feedback and input preservation, grouped/task-guided context, approved-only collapsible Decisions, selected-only evidence, structured output and safe errors, compact success/failure history, restored prior results, and honest usage/cost display. Native tests validate profile/task lookup, selected-only context, approved Decision enforcement, task-specific bounded prompt settings, strict JSON and field validation, canonical list bounds, versioned history round trips, malformed/version failures, and raw-content/reasoning/credential exclusion. No automated test makes a live provider request.

0G.6 adds offline coverage for known-limit clamping, larger and unknown limits, valid one-run overrides, local rejection above a known limit, the global safety ceiling, safe provider parameter diagnostics, additive history budgets, and loading older history without those fields. Frontend coverage verifies collapsed Advanced Run Settings, displayed preferred/model/effective values, local over-limit rejection before the provider boundary, compatibility warnings, actionable truncation guidance, explicit retry availability only with safe known headroom, targeted invalid-request messaging, and effective budgets in history. These tests use mocks and make no network request.

0G.6 closure passed `npm run check` (**108 frontend tests**), `npm run test:native` (**120 library tests and 2 CLI tests**), `npm run build`, `npm run tauri build -- --no-bundle`, and `git diff --check`. No live inference or GUI automation was performed.

0G.7 frontend coverage verifies loading feedback at the Run action, duplicate blocking, scenario preservation while running and on every unsafe outcome, clearing only after successful history persistence, exact historical scenario display/copy, shared Markdown export for current and historical successes, failed-run reuse without result export, safe metadata and selected context, and exclusion of fields outside the normalized export contract. Clipboard and provider boundaries are mocked; tests make no live request.

0G.7 closure passed `npm run check` (**116 frontend tests**), `npm run test:native` (**120 library tests and 2 CLI tests**), `npm run build`, `npm run tauri build -- --no-bundle`, and `git diff --check`. No live inference or GUI automation was performed.

0G.8 frontend coverage loads mocked Compendium, Decision, and Specialist History boundaries with no provider call. It verifies existing-Area aggregation, distinct authority labels, visibly non-authoritative AI analysis, compact Area navigation, expandable rows, explicit promotion confirmation, editable knowledge fields, truthful provenance/source, duplicate errors, and unchanged history. Native temporary-workspace tests verify stored-finding membership, exact duplicate rejection, one real Compendium entry, unchanged specialist history, and no automatic Decision file.

0G.8 automated validation passed `npm run check` (**125 frontend tests**), `npm run test:native` (**122 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`; `git diff --check` is the final repository check. No live inference or GUI automation was performed.

0G.9 frontend coverage verifies the wide configuration/history/detail workbench structure and narrow stacking hooks; selected and available context counts; non-expandable empty Area groups; manual recommendation overrides; saved context before the scenario; local non-shifting copy feedback; successful and safe failed-run Markdown exports; distinct running feedback with stale notices cleared; multi-finding review; fixed provenance/source; native exact-duplicate handling; normalized-title potential-duplicate choices; Wiki type/state tags, keyword search, bounded type filtering, compact metadata, and Knowledge routing into the existing Compendium editor. Provider and native boundaries remain mocked; no test makes a live AI request. Existing native Compendium tests continue to own stored-finding membership, exact title-plus-statement duplicate rejection, truthful persistence, unchanged history, and no automatic Decision creation.

0G.9 automated validation passed `npm run check` (**145 frontend tests**), `npm run test:native` (**129 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`; `git diff --check` is the final repository check. No live inference or GUI automation was performed.

0G.10 frontend coverage verifies exact multiline Scenario / Question copying for persisted history and the current unsaved-result fallback, preserving line breaks; distinct history lines for task/status, timestamp, model, and success/failure outcome; long model-name isolation; recommended-context selection without losing manual overrides; and independent Deselect all behavior for Compendium and approved-Decision context. Clipboard and provider boundaries remain mocked, and the established Analysis History middle-column width is unchanged.

0G.10 automated validation passed the focused Specialist suite (**65 tests**), `npm run check` (**151 frontend tests**), `npm run test:native` (**129 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`; `git diff --check` is the final repository check. No live inference or GUI automation was performed.

0G.11 frontend coverage verifies both configured models remain selectable, cloning preserves the exact stored task/scenario/context, model selection alone makes no request, the explicit action makes exactly one mocked request, matching runs render side by side, and metrics remain attached to their own model. Native registry coverage verifies Nemotron is enabled beside DeepSeek with no invented pricing or capability values. All provider boundaries are mocked; no automated test makes a live AI request.

0G.11 automated validation passed the focused Specialist suite (**68 tests**), focused native registry suite (**6 tests**), `npm run check` (**154 frontend tests**), `npm run test:native` (**130 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`; `git diff --check` is the final repository check. No live inference or GUI automation was performed.

0G.12 native fixtures cover deterministic first-N retention, independent normalization of multiple arrays, stable ordering, unchanged exact-bound arrays, continued wrong-type rejection, safe notice persistence, and rejection of inconsistent history metadata. Frontend coverage renders persisted notices in selected-run detail and on the affected side of comparison. Provider/native boundaries are mocked; no automated test makes a live AI request.

0G.12 automated validation passed the focused Specialist frontend suite (**69 tests**), focused native normalization (**39 tests**) and history (**13 tests**) suites, `npm run check` (**155 frontend tests**), `npm run test:native` (**134 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`; `git diff --check` is the final repository check. No live inference or GUI automation was performed.

0G.13 frontend coverage verifies that a cross-model request keeps the saved source detail and result mounted, renders its spinner/model/elapsed state at the triggering action, blocks duplicate execution, refreshes History and comparison after success, and retains the source selection with safe local/history failure feedback after failure. Finding-selection coverage verifies its independent **Deselect all** clears only result findings while Project Context and approved-Decision selections remain unchanged. Provider and native boundaries are mocked; no automated test makes a live AI request.

0G.13 automated validation passed the focused Specialist suite (**75 tests**), `npm run check` (**161 frontend tests**), `npm run test:native` (**134 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`; `git diff --check` is the final repository check. No live inference or GUI automation was performed.

0H native coverage uses temporary repositories for repository detection, branch, detached HEAD, HEAD metadata, clean and dirty trees, staged plus unstaged changes, untracked/deleted/renamed files, tracked diff statistics, repository-relative paths, and bounded history. Simulated runners cover Git unavailable and safe command failure without leaking process output or paths. Frontend tests mock the single typed boundary and cover snapshot rendering, expandable file metadata, refresh, safe unavailable/non-repository/failure states, shell navigation, and the compact Wiki summary. No test performs a Git write outside disposable fixtures, a Git network operation, live inference, or GUI automation.

0H automated validation passed `npm run check` (**133 frontend tests**), `npm run test:native` (**129 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. `git diff --check` remains the final repository check. No live inference, GUI automation, manual validation, or Git network operation was performed.

0I.1 native coverage uses temporary Unity and non-Unity workspaces for canonical directory detection, `ProjectVersion.txt` parsing, missing/corrupt versions, valid format-version `1` manifests, malformed and unsupported manifests, matching Project identity, project-relative paths, strict unknown-field rejection, and safe summaries that exclude raw paths. Frontend tests mock the single typed native boundary and cover detected/unavailable states, manifest states, refresh, provenance labels, shell navigation, and the compact Technical-area Wiki summary. No test runs Unity, modifies Unity content, makes a live AI request, or performs GUI automation.

0I.1 automated validation passed the focused frontend suite (**33 tests**), `npm run check` (**167 frontend tests**), `npm run test:native` (**142 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live inference, Unity process, GUI automation, or Unity project mutation was used in that foundation pass. The later completed private dogfood project validation is recorded below.

0I.3 coverage-transparency regression coverage verifies the Unity exporter retains at most 10,000 observations per category and records one deterministic `_TRUNCATED` issue; the native summary safely classifies bounded truncation, unsupported API coverage, and inspection errors; and the Unity page renders a capped field count as `10,000+ / partial coverage` with safe category/code details. The focused frontend suite passed (**16 tests**), the Unity package EditMode suite passed (**13 tests**), `npm run check` passed (**168 frontend tests**), `npm run test:native` passed (**143 library tests and 2 CLI tests**), and both `npm run build` and `npm run tauri build -- --no-bundle` passed. The format-version `1` manifest schema remains unchanged; no live inference, GUI automation, Alignment, or 0J work was performed.

0J.1 native temporary-workspace coverage validates current Compendium Intent, approved-only Decision Intent, distinct approved-Intent conflict, current Git and Unity evidence projection, deterministic `ALIGNED` / `UNVERIFIED` / `OUT_OF_SYNC` / `CONFLICT` status, low-confidence uncertainty preference, pending review, approve/reject history, reload, portable provenance, and unchanged Compendium, Decision, and Unity GroundTruth source bytes. Frontend tests cover the typed boundary, manual source/evidence selection, pending review rendering, approve/reject behavior, provenance labels, shell navigation, and the compact read-only Wiki summary. Provider boundaries are absent from the workflow; no test makes a live AI request, scans source semantics, starts Unity, or uses GUI automation.

0J.1 automated validation passed the focused frontend suite (**33 tests**), focused native Alignment suite (**7 tests**), `npm run check` (**173 frontend tests**), `npm run test:native` (**150 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. `git diff --check` remains the final repository check. No live inference, GUI automation, Unity process, or Git network operation was used.

0J.2 frontend coverage verifies Unity/Git source grouping, total and selected counts, default-collapsed groups that remain open when selected, safe-summary search, All/Unity/Git filtering, compact unselected rows, selected-only Assessment controls, Selected Evidence, Deselect all, deterministic explainable suggestions, Unity-first suggestion ordering for Systems Intent, suggestion dismissal, and the guarantee that suggestions never become evidence automatically. Existing create/approve/reject coverage continues to verify Alignment creation. Native coverage verifies that existing validated scene and ScriptableObject observations join manifest and component evidence without changing GroundTruth, provenance, persistence, or source files. No provider boundary participates and no test makes a live AI request.

0J.2 automated validation passed the focused Alignment frontend suite (**7 tests**), focused native Alignment suite (**7 tests**), `npm run check` (**177 frontend tests**), `npm run test:native` (**150 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live inference, GUI automation, Unity process, Git write against the active workspace, or Git network operation was used.

0J.3 frontend coverage verifies the three-pane/stacked workbench contract, filters before evidence content, concise Unity/Git identity and type tags, explicitly unselected suggestions, collapsed browse groups whose rows are not rendered until opened, direct search results, selected-evidence survival across filtering, selected-only Assessment controls, and right-pane ownership of rationale and creation. Creation regressions cover success, creation-local progress, synchronous duplicate blocking, explicit local validation reasons, and safe local failure that preserves the form. Existing native tests continue to verify the same create/persist/review command path and unchanged source files; no provider boundary participates.

0J.3 automated validation passed the focused Alignment frontend/boundary suite (**14 tests**), `npm run check` (**182 frontend tests**), `npm run test:native` (**150 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`; `git diff --check` remains the final repository check. No live inference, GUI automation, Unity process, Git write against the active workspace, or Git network operation was used.

0J.4 frontend coverage verifies explicit Suggested/Search/Browse modes; automatic search activation; search results before a collapsed Suggested summary; compact source/type/name/summary/match-reason rows; selected-evidence continuity; compact Alignment preview; explicit **No additional uncertainty** serialization; separate Create Review and Review History subviews; compact history list/detail selection; session-local new-review count and clearing; direct access to a newly created review; approve/reject lifecycle; creation-local failure; and synchronous duplicate submission blocking. The platform boundary remains unchanged and mocked, so no test can issue live AI or mutate Alignment sources.

0J.4 automated validation passed the focused Alignment frontend suite (**14 tests**), `npm run check` (**184 frontend tests**), `npm run test:native` (**150 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live inference, GUI automation, Unity process, Git write against the active workspace, or Git network operation was used. `git diff --check` is the final repository check.

0J.5 frontend coverage verifies that Area entry counts intentionally exclude the derived Alignment summary; approved, pending, and total review counts render independently; the latest approved status is selected by timestamp even when a newer pending review exists; and **View Alignment History** opens the existing Alignment Review History subview through the workspace shell. The Game Wiki still renders one compact derived summary rather than one row per Alignment review, and all native/persistence boundaries remain unchanged.

0J.5 automated validation passed the focused Wiki and shell suites (**31 tests**), `npm run check` (**187 frontend tests**), `npm run test:native` (**150 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live inference or GUI automation was used. The already successful functional dogfooding remains the manual closure evidence for 0J; this clarity polish does not introduce a new manual gate. `git diff --check` is the final repository check.

0K.1 native temporary-workspace coverage verifies approved Alignment preference, creation from approved Alignment, current Compendium, and approved Decision sources, rejection of an unapproved Decision, fact-only prefill, `DRAFT` / `PENDING_REVIEW` creation, explicit approval, persistence/reload, immutable source trace, evidence-subset validation, and rejection of absolute paths. Frontend coverage verifies the typed native boundary, manual source selection, public-safe synthetic prefill, editable implementation scope, explicit complete approval, provenance navigation, approved-only Implementation Brief copy, no invented file paths, shell navigation, and the compact read-only Game Wiki summary. The workflow imports no provider boundary and tests make no live AI request.

0K.1 automated validation passed the focused Feature Contract/Wiki/shell frontend suite (**38 tests**), focused native Feature Contract suite (**4 tests**), `npm run check` (**194 frontend tests**), `npm run test:native` (**154 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live inference, GUI automation, Unity process, Git write against the active workspace, or Git network operation was used. `cargo fmt --check` remains unavailable because the active Rust toolchain does not have `cargo-fmt`; `git diff --check` remains the final repository check.

0K.2 native coverage verifies editable draft titles with immutable source trace, draft-only deletion, approved-history deletion rejection, captured Intent/Alignment/Reality plus current-human-field AI context, no persistence during AI preparation/normalization, strict bounded proposal parsing, and rejection of invented path-like output. Frontend coverage verifies compact history switching, local draft-save feedback, explicit confirmed deletion, approved lifecycle preservation, explicit-only AI invocation, proposal isolation until apply, per-section apply, Apply All preservation of existing human text, shared preview/copy content, source navigation, evidence selection, and contextual return to Game Wiki. Provider, registry, persistence, and clipboard boundaries are mocked in frontend tests; no automated test makes a live AI request.

0K.2 automated validation passed the focused Feature Contract/Wiki/shell frontend suite (**45 tests**), focused native Feature Contract suite (**7 tests**), `npm run check` (**201 frontend tests**), `npm run test:native` (**157 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live inference, automatic retry, GUI automation, Unity process, Git write against the active workspace, or Git network operation was used. `cargo fmt --check` remains unavailable because the active Rust toolchain does not have `cargo-fmt`; `git diff --check` remains the final repository check.

0K.3 native coverage verifies approved Alignment creation through persistence/reload with immutable Alignment ID, underlying Intent, status, rationale, Reality summary/evidence/provenance, and unchanged source Alignment storage. It also verifies that affected systems, out of scope, risks, and implementation notes are optional for approval while the five core delivery fields remain required. Frontend coverage verifies source/result identity checks, clearer source authority, active/archive history filters, local AI running state and available usage metadata, proposal/evidence distinction, safe section replacement, local Apply All feedback, discard isolation, DRAFT/APPROVED brief preview-copy parity, shared Wiki actions, and Area-preserving Wiki return. Provider, registry, persistence, timer, and clipboard boundaries remain deterministic and offline.

0K.3 automated validation passed the focused Feature Contract/Wiki/shell frontend suite (**48 tests**), focused native Feature Contract suite (**8 tests**), `npm run check` (**207 frontend tests**), `npm run test:native` (**158 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live inference, automatic retry, GUI automation, Unity process, source mutation, 0L, UI-1, or future Studio/Context Routing/Security work was performed. `cargo fmt --check` remains unavailable because the active Rust toolchain does not have `cargo-fmt`; `git diff --check` passed.

UI-1 automated validation passed the focused design-system/shell/Feature Contract/Repository/Unity/Specialist suite (**123 tests**), `npm run check` (**211 frontend tests**), `npm run test:native` (**158 library tests and 2 CLI tests**), `npm run build`, `npm run tauri build -- --no-bundle`, and `git diff --check`. No live inference, GUI automation, route change, native contract change, persistence change, UI-2, Studio, Rebaseline, Context Routing, Security, or 0L implementation was performed. Manual visual validation remains pending.

UI-2 focused coverage verifies Workspace Home rendering with no active project; Start New Project and Open Existing Project through the existing picker/inspection boundary; local recent-project rendering and valid-card opening; safe removal of an inaccessible recent path; honest no-recent and Recommended Next Steps preview states; and registry recency, deduplication, six-entry bounds, and malformed-data recovery. The Home navigation follow-up additionally verifies the workspace-level Home action, separation from project Overview, no inspection or initialization while returning Home, retained recent-project availability, and reopening through the existing inspection boundary. The focused App/design-system/registry suite passed (**32 tests**), `npm run check` passed (**220 frontend tests**), and `npm run build` passed. The preceding UI-2 implementation also passed the Tauri no-bundle release build. No native contract changed, so a separate native test run was not required. No live inference or GUI automation was used; `git diff --check` remains the final repository check. The UI-2 manual desktop validation passed.

NPC-1 focused frontend coverage verifies that Start New Project opens the Creator without selecting a directory; Open Existing Project retains the current picker/inspection flow; step validation and Back/Continue preserve state; optional sections may remain empty; pillars can be added, edited, and removed; Review accurately reflects values and routes edits back to their section; substantial drafts require explicit discard; directory selection occurs only from Review; existing workspaces are not overwritten; failed initialization preserves the reviewed draft; successful creation uses the existing initialization boundary, opens Project Overview, records the project in Recents, and makes no provider call. Focused Creator/App coverage passed (**31 tests**).

NPC-1 native temporary-workspace coverage verifies working-title Project identity, format-version `1` Compendium creation, `USER_STATED` / `new_project_creator` foundation entries, `TBD` / `UNRESOLVED` Open Questions, no Decisions file, no overwrite of existing metadata or orphaned Compendium data, and no files for invalid foundation input. The focused native workspace suite passed (**9 tests**). Full validation passed `npm run check` (**227 frontend tests**), `npm run test:native` (**161 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. `cargo fmt --check` remains unavailable because the active Rust toolchain does not have `cargo-fmt`; `git diff --check` passed. No live AI/provider request or GUI automation was used. The user-driven manual visual, validation, persistence, Recent Projects, and reopen checklist passed, so NPC-1 is complete.

NPC-2 focused frontend coverage verifies no request on step entry, explicit bounded Core Loop context, typed proposal rendering, provider/model/latency/token metadata, duplicate-request prevention, explicit replacement of manual Core Loop text, editable accepted content, regenerate/discard isolation, missing-credential recovery, individual and bulk pillar acceptance, exact-title deduplication, preservation of manual pillars, beginner helper copy, Review provenance, and no provider call during manual initialization. The focused Creator/App suite passed (**38 tests**). Focused native coverage verifies the registry-owned Nemotron default, bounded context serialization, strict Core Loop and pillar schemas, malformed/empty/duplicate/truncated/path-like rejection, credential-marker rejection, provider-error precedence, stable task categories, structured-output evidence, `AI_INFERRED` persistence for explicitly accepted content, and no Decision creation (**11 tests**). Full validation passed `npm run check` (**234 frontend tests**), `npm run test:native` (**169 library tests and 2 CLI tests**), `npm run build`, `npm run tauri build -- --no-bundle`, focused changed-document local-link validation, and `git diff --check`. `cargo fmt --check` remains unavailable because `cargo-fmt` is not installed for the active toolchain. No live provider request or GUI automation was used; manual live-AI validation remains pending.

NPC-2.1 focused coverage verifies that Suggest and Regenerate open preflight without calling the provider; Cancel sends nothing; Run AI sends once; only enabled registry models are selectable; the Creator default and alternative descriptions remain factual; approximate token range, usage band, honest missing-pricing text, one-observation/recent-range/missing local history wording render safely; duplicate submit is blocked; assumptions are optional, bounded, validated, rendered, and not promoted; completed/discarded/regenerated proposals enter bounded ten-run session history; restore returns transient proposal state without applying; manual and AI-assisted pillars remain editable/removable; and World/Constraint helpers and compact controls preserve draft values. Focused validation passed **17 Creator frontend tests** and **9 native Creator/preflight/schema tests**. Full validation passed `npm run check` (**240 frontend tests**), `npm run test:native` (**172 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live provider request or GUI automation was made during implementation. Changed-document link validation and `git diff --check` are the final repository checks; manual verification remains pending for the visual/responsive states and, if desired, one user-authorized real assumption-schema response.

NPC-2.2 focused coverage verifies that both Creator prompts require the explicit grounding pass while preserving optional zero-to-three assumptions; proposals without assumptions remain valid and render no misleading empty-state claim; assumptions render separately and are not promoted; one confirmed Creator action still invokes the mocked provider exactly once; all five Identity values remain single-line and survive navigation; and existing Pillar edit/remove/apply behavior remains covered. Focused validation passed **18 Creator frontend tests** and **10 native Creator tests**. Full validation passed `npm run check` (**241 frontend tests**), `npm run test:native` (**173 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. No live provider request or GUI automation was made during implementation; changed-document link validation and `git diff --check` remain the final repository checks.

The NPC-2.2 structured-output resilience follow-up adds focused native coverage for exact/fenced/briefly wrapped single objects; omitted, empty, one-to-three, and `null` assumptions; optional rationale and `summary`/`note`; and strict rejection of ambiguous or malformed JSON, non-object roots, assumption objects/non-string members/overflow, missing title/description, invalid proposal counts, and hidden reasoning fields. Focused frontend coverage verifies the safer invalid-output message, one confirmation/one mocked request, unchanged draft state, continued manual use, and a failed session-history entry with no proposal payload. Focused validation passed **19 Creator frontend tests** and **12 native Creator tests**. Full validation passed `npm run check` (**242 frontend tests**), `npm run test:native` (**175 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. `cargo fmt --check` remains unavailable because `cargo-fmt` is not installed for the active toolchain. No live AI or GUI automation was used for the fix.

The user-driven NPC-2.2 closure recheck passed on 2026-09-27. One explicit Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` `NEW_PROJECT_CORE_LOOP` request completed in `3,348 ms` with `533` input, `371` output, and `904` total tokens. Structured output passed with two proposals; grounding/normalization succeeded, unsupported or new mechanics were surfaced separately as assumptions, and no invalid structured-output error occurred. The focused Identity and Pillar alignment checks also passed. This task-specific observation closes NPC-2 manual validation; it is not a reliability percentage, universal model score, or winner.

NEXT-1 focused engine coverage verifies missing Vision, missing Core Loop, incomplete Foundation, proposed Decisions, unresolved Compendium Open Questions, uninspected Git Reality, a detected Unity project without GroundTruth, `UNVERIFIED` / `OUT_OF_SYNC` / `CONFLICT` Alignment, rejected-Alignment exclusion, draft Feature Contracts, simultaneous signals, deterministic ordering, the five-item engine bound, no-project state, healthy state, and input immutability. App coverage verifies current-project Home recommendations, exact reason copy, existing-route navigation, and recomputation after switching projects. Existing no-project Home, Recent Projects, Repository, and Unity behavior remains covered. The focused recommendation/App/Reality suite passed **55 tests**; full `npm run check` passed **260 frontend tests**, `npm run build` passed, and `npm run tauri build -- --no-bundle` passed. No native boundary changed, so no new native suite was required for NEXT-1. No live AI/provider request, automatic Reality refresh, or GUI automation was used.

NEXT-1.1 focused coverage verifies grouped Foundation gaps and exact named reasons/source facts; deterministic ordering and five-item/three-card bounds; Git/Unity unknown, disconnected, connected, partial, and error behavior; explicit native directory-picker titles; project-scoped connection set/change/disconnect commands; cross-project storage isolation; safe rejection of unavailable paths; unchanged selected source folders; existing Creator pillar visibility; manual pillar add/edit/deprecate through the existing Compendium boundary; compact Unity/Git connection states; and navigation to existing Game Design/Reality destinations. The focused frontend suite passed **82 tests** and the focused native connection module passed **4 tests**. Full `npm run check` passed **273 frontend tests**; full native validation passed **179 library tests and 2 CLI tests**; `npm run build` and `npm run tauri build -- --no-bundle` passed. No live AI/provider request, Git write, Unity write, automatic scan, or GUI automation was used.

NEXT-1.2 focused coverage verifies that Project A may inspect a detached Project B's canonical Unity structure/version without adopting Project B's `.forgemind/unity-groundtruth.json` or exposing it as Alignment evidence; Project B still loads that manifest when opened as its owning ForgeMind project; a valid active-project manifest remains available while portable inspection is detached; Not attached is distinct from Invalid; connected portable-only, valid partial, and valid complete evidence produce **Complete Unity GroundTruth**, **Review Partial Unity Evidence**, and no Unity recommendation respectively; disconnected behavior and deterministic ordering remain unchanged; and read-only Refresh preserves persistent truncated coverage. Focused frontend validation passed **60 tests** and focused native GroundTruth validation passed **11 tests**. Full `npm run check` passed **278 frontend tests**; full native validation passed **181 library tests and 2 CLI tests**; `npm run build` and `npm run tauri build -- --no-bundle` passed. No GUI automation, live AI/provider request, Unity process/exporter action, manifest import, or project mutation was used.

NEXT-1's updated NEXT-1.2 user-driven check passed on 2026-09-28:

1. With no current project, confirm Home still says **Open a project to get project-aware next steps.**
2. Open a project with several incomplete Foundation fields, return Home, and confirm one **Complete Game Foundation** card names the actual gaps rather than showing repetitive Vision/Core Loop/Foundation cards.
3. Follow **Continue in Game Design** and confirm the first-class **Design Pillars** section shows existing Creator pillars. Add, edit, and deprecate one manual pillar; restart/reopen and confirm the same Compendium-backed records persist.
4. In a workspace with no repository, inspect Repository Reality and confirm the state is neutral **Not connected**, **Select Repository Folder** uses the native picker, selecting a detached repository changes the state to connected, Refresh remains read-only, Change works, and Disconnect falls back safely without modifying the repository.
5. With ForgeMind Project A active, connect a detached Unity Project B that owns a different `.forgemind/unity-groundtruth.json`. Confirm Connection is **Connected**, Unity version and portable directories are available, GroundTruth is **Not attached**, Coverage is **Portable inspection only**, the foreign manifest is not shown as active-project evidence, and only invalid/failed active-project reads are red.
6. Return Home after each Unity state. Confirm disconnected produces **Connect Unity Project**; connected portable-only evidence produces **Complete Unity GroundTruth** with **Review Unity Evidence**; valid truncated evidence produces **Review Partial Unity Evidence**; and valid complete evidence produces no Unity recommendation. Confirm Home does not initiate Refresh.
7. On the Unity page, use **Refresh Evidence** while `SERIALIZED_FIELDS_TRUNCATED` remains present. Confirm the state remains Partial and no copy implies Refresh runs the exporter, generates a manifest, increases limits, or repairs the issue.
8. Open private dogfood project as its owning ForgeMind project. Confirm its connected Unity project, Unity version, Available manifest, imported snapshot summary, and Partial coverage still load, including `SERIALIZED_FIELDS_TRUNCATED` when present.
9. Return Home, open a different Recent Project, return Home again, and confirm both recommendations and configured Reality folders belong to the newly opened project with no prior-project state retained.
10. Confirm Home cards and the affected Game Design/Git/Unity views have no horizontal overflow at `1180 × 760` and `760 × 560`.
11. For a project with no supported current issue, confirm the calm **No urgent next steps detected.** state.

**PASS recorded 2026-09-28.** The user confirmed the complete checklist, including grouped Foundation guidance, existing-project pillar persistence, detached read-only Repository/Unity connections, foreign-manifest isolation, portable-only/partial/complete recommendation semantics, read-only Refresh wording, private dogfood project owning-project evidence, project-switch isolation, responsive layouts, and the calm no-issue state. NEXT-1 is complete. NEXT-2 optional AI refinement remains unimplemented.

AIW-0 focused native coverage verifies session creation, multi-turn append, archive lifecycle, explicit malformed-history recovery, project isolation, deterministic explicit/supporting context order, approved-Decision enforcement, Compendium/Open Question provenance, bounded project-relative Markdown extraction, prior-AI non-authority, source-trace preservation, pending/accepted/applied/rejected proposal transitions, current/proposed edit state, no proposal-side truth mutation, credential-marker rejection, and exclusion of secret/path fields. Its original full validation passed **279 frontend tests**, **190 library tests and 2 CLI tests**, both builds, link checks, and `git diff --check`. WR-1 now consumes this foundation; Chronicler remains unimplemented.

### WR-1 Writers' Room — implemented, headless validated; post-fix manual recheck pending

Focused native coverage verifies the three runnable profiles, registered Nemotron default, alternate registry model preparation, bounded deterministic narrative context, project-relative Markdown persistence and five-document cap, recent-session regenerate behavior, strict response schema, question/proposal bounds, supplied-only source references, proposal non-mutation before Apply, AI-origin Compendium/Open Question writes, duplicate protection, and proposed-not-approved Decision creation. Focused frontend coverage verifies session restore/archive/create, profile starters, preflight-before-send, Cancel sending nothing, one confirmation making one mocked request, exact model selection, restrained canonical usage metadata, Markdown reference handling, and Review -> Apply proposal behavior. All provider calls are mocked or normalized from fixtures; no live request occurs during automated validation.

WR-1 validation passed **36 focused frontend tests**, **12 focused AI Workspace native tests**, **6 focused Writers' Room native tests**, the full `npm run check` suite (**285 frontend tests**), the full `npm run test:native` suite (**199 library tests and 2 CLI tests**), `npm run build`, `npm run tauri build -- --no-bundle`, changed-document local-link validation, and `git diff --check`. `cargo fmt --check` remains unavailable because `cargo-fmt.exe` is not installed for the active toolchain. The Rust linker emitted its existing informational import-library warning; no product test failed.

The first user-driven WR-1 smoke exposed two blocking paths: the page became blank immediately after **Create Session**, and after restart it became blank as soon as Writers' Room loaded persisted history. WR-1.1 traced both to the same format-version `1` compatibility mismatch: native serialization legitimately omitted empty `proposals` and `sourceTrace`, while the React render path read `proposals.length` and later source arrays without runtime normalization. The inspected real document was otherwise valid and contained one active Lore Architect session with empty messages and selected Markdown; no private narrative content was needed to diagnose the mismatch.

WR-1.1 normalizes every returned AI Workspace document, including create and later mutation results; defaults optional arrays; isolates malformed non-authoritative records with a warning; keeps unknown-profile history readable but non-runnable; selects the newest updated active session and safely falls back from stale IDs; separates loading, no-session, valid-session, and recoverable-error states; keeps failed create input local to the modal; and preserves explicit AIW-0 archive/reset recovery for an invalid whole document. The empty workbench now has guidance instead of a duplicate primary CTA. Writers' Room raised surfaces now use existing opaque design-system tokens, with a stronger scrim, correct stacking, visible focus, Cancel, and Escape close.

WR-1.1 focused validation passed **13 frontend tests** and **14 AI Workspace native tests**. Full validation passed `npm run check` (**292 frontend tests**), `npm run test:native` (**201 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. The native build emitted only the existing informational Windows import-library warning. No live provider request or GUI automation was used. `cargo fmt --check` remains unavailable because `cargo-fmt.exe` is not installed for the active toolchain.

The next user-driven check passed session load, opaque modal usability, creation, leave/re-entry, application-restart restoration, persisted assistant rendering, and live provider execution. On 2026-09-29, one explicit Lore Architect request through Nebius Token Factory and `nvidia/nemotron-3-super-120b-a12b` succeeded in `1,795 ms` with `447` input, `189` output, and `636` total tokens. Persistence succeeded. The response was concise and collaborative, asked three focused clarification questions, and did not establish generated lore as project truth. Immediate post-run rendering failed with a blank/gray surface, while restart/reload rendered the persisted response successfully. This is one task-specific observation, not a reliability percentage or universal model conclusion.

### WR-1.2 live response reliability and session lifecycle — implemented, headless validated; manual recheck pending

The exact immediate-render cause was a remaining boundary bypass. `run_writers_room` returned a freshly serialized document directly to React, while session loads passed through `normalizeAiWorkspaceDocument`. Serde omitted empty session `proposals` and session/message `sourceTrace` collections from the successful run result. The page read `selectedSession.proposals.length`, causing the runtime exception. Restart succeeded because the persisted document crossed the normalizer, which hydrated those collections to empty arrays.

WR-1.2 routes the live run result through that same normalizer before updating React state. A whole-document normalization failure after a successful persisted run keeps the prior conversation visible and offers a saved-session reload; it never retries the provider. Provider failures keep the prior conversation and draft usable and also require an explicit new action. The Writers' Room surface now occupies bounded available height, with independently scrollable session and conversation regions and an intrinsic composer. New messages follow the bottom only while the user has not intentionally scrolled far upward.

Archive remains reversible through the native AI Workspace boundary. Confirmed Delete is separate: it removes a Project-scoped session from `.forgemind/ai-workspace-sessions.json`, safely falls back to the newest active session or the empty state, and never calls the provider. Deletion does not touch or reverse Compendium knowledge, Decisions, or Open Questions previously created through explicit Apply.

WR-1.2 focused validation passed **21 frontend tests** and **17 native AI Workspace tests**. Full validation passed `npm run check` (**299 frontend tests**), `npm run test:native` (**204 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. The native build emitted only the existing informational Windows import-library warning. `cargo fmt --check` remains unavailable because `cargo-fmt.exe` is not installed for the active toolchain. No live provider request or GUI automation was used while implementing the patch.

Manual desktop validation remains required at `1180x760`, fullscreen, and `760x560`. Recheck immediate live-result rendering with a separately authorized request only if useful; otherwise reload the already persisted response and exercise the deterministic UI paths. Confirm the assistant text and all three questions render without a blank surface, the composer becomes usable, ten sessions stay within the bounded rail, a long conversation scrolls without displacing the composer, and there is no horizontal overflow. Confirm Archive retains and reopens history. Confirm Delete uses an opaque blocking dialog, Cancel/Escape are safe, deletion selects the next active session or empty state after restart, and previously applied project truth remains. **WR-1 Manual PASS remains pending.**

### OPT-1 AI Workspace / Writers' Room hardening and code health — complete

OPT-1 preserved behavior while tightening existing boundaries. Frontend document normalization now applies the native format-version `1` caps before render, skips duplicate or cross-project sessions, and keeps omitted optional collections safe. Canonical Writers' Room usage rows are filtered to the active Project and `narrative_workspace` task while still tolerating omitted token, cost, latency, and structured-output metadata. Malformed native error fields fall back to safe local copy. Session/profile lookup no longer repeats linear profile searches during list render. The native narrative context selector now reuses the shared twenty-source cap without subtracting selected Markdown twice. The CSS audit found and replaced the remaining undefined Writers' Room `--font-size-xs` reference with the existing `--type-meta-size` token; an automated cross-file token-resolution check prevents recurrence.

Focused validation passed **30 frontend tests** across Writers' Room, AI Workspace, the native boundary wrappers, and design tokens; **109 Creator, Feature Contract, and Specialist frontend provider regressions**; **17 native AI Workspace tests**; and **7 native Writers' Room tests**. The complete frontend suite passed **303 tests in 24 files** with one Vitest worker, and the native suite passed **205 library tests and 2 CLI tests**. `npm run typecheck`, `npm run build`, `npm run tauri build -- --no-bundle`, changed-document local-link checks, and `git diff --check` passed. The default parallel frontend run showed host-contention timeouts in unrelated interaction tests, including corrupted synthetic typing; the same affected files and the complete suite passed under stable single-worker scheduling. `cargo fmt --check` remains unavailable because `cargo-fmt.exe` is not installed for the active toolchain. No live provider request or GUI automation was used.

This maintenance pass did not start WR-1.3, Chronicler, Knowledge Import/Rebaseline, CHR-1, CHR-2, NEXT-2, UI-3, a general Router, or another product milestone. It did not change project-truth semantics. The WR-1 desktop/restart/responsive Manual PASS gate remains pending.

### WR-1.3 Narrative Context & Guided Lore Workflow — implemented, headless validated; manual demo pass pending

Native Writers' Room coverage verifies deterministic narrative-area/profile/lexical ordering; relevant World/Narrative, Design Pillar, approved narrative Decision, unresolved Open Question, and explicit `DOCUMENTED` Markdown inclusion; unrelated Technical exclusion; proposed Decision exclusion; the shared twenty-source bound; zero-to-three focused string questions; supplied-only source references; strict proposal validation; suppression of normalized duplicate Knowledge proposals; and re-resolution of applied Compendium knowledge on the next request. Continuity may return a no-answer response without fabricated facts. AI Workspace coverage verifies that proposal edits are limited to `PENDING` or `ACCEPTED`, survive reload, mutate no Project Brain store before Apply, and supply the current reviewed title/content to Compendium with `AI_INFERRED` / `writers_room` provenance.

Frontend coverage verifies focused string-question rendering without a provider-authored phase badge, free-form composer continuity, compact Narrative Context counts, Review & Edit, local Cancel preservation, pending acceptance with edits, accepted-before-Apply editing, the human-edited indicator, and Apply through the unchanged owning-domain command. The format-version `1` normalizer keeps both legacy string questions and WR-1.3 phase/nested-question history readable. Credit-aware preflight still requires one confirmation for one mocked provider request, and Cancel makes zero requests.

WR-1.3 validation passed **28 focused frontend tests**, **11 focused Writers' Room native tests**, and the focused proposal-edit persistence test. Full validation passed `npm run check` (**317 frontend tests in 27 files**), `npm run test:native` (**210 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. The frontend/Tauri builds retained the existing non-blocking chunk-size and Windows import-library linker warnings. No live provider request, automatic retry, GUI automation, semantic/vector search, Tavily integration, Knowledge Import/Rebaseline, Chronicler, or general Router work occurred.

Manual PASS remains pending. Use a disposable project and perform the exact bounded demo: show existing faction/world knowledge in Game Wiki; open Lore Architect; ask an ambiguous narrative question; confirm existing knowledge and an unresolved gap are cited without premature canon; answer with a concrete direction; review and edit one focused Project Knowledge proposal; Apply; confirm Game Wiki shows the reviewed text immediately; then ask a follow-up and confirm the newly applied Compendium entry appears as established context. Also check Character & Dialogue keeps drafts distinct from facts, Continuity reports `NOT FOUND` or conflicts without forced invention, focused questions and Narrative Context remain readable at `1180×760`, fullscreen, and `760×560`, and no horizontal overflow occurs. A user-authorized live request is optional and must be recorded separately; headless closure made no provider call.

### WR-1.3.1 live structured-output hardening — implemented, headless validated; live recheck pending

The first real WR-1.3 validation reached the provider after a correct preflight reporting **4 established knowledge entries**, **0 approved decisions**, **0 open questions**, **no selected documented source**, and **0 recent messages**. Provider execution completed, but ForgeMind rejected the visible response with `INVALID_WRITERS_ROOM_OUTPUT`. Raw provider text is intentionally not persisted, so the exact malformed field is **UNVERIFIED**; this evidence proves a structured-response validation failure, not its specific shape.

WR-1.3.1 keeps the shared single-JSON-object extractor and strict semantic validation while normalizing harmless provider variations: omitted or `null` empty `questions`, `sourceRefs`, `proposals`, question `options`, and proposal `sourceRefs`; an omitted or `null` `whyItMatters`; legacy string questions; and case/outer-whitespace variation for the three known modes. Mode remains required because inferring it from content could accidentally promote an exploratory turn to consolidation. Exact, fenced, and briefly wrapped single objects are accepted; malformed, oversized, ambiguous multi-object, unknown-field/reasoning-bearing, unknown-mode, over-bound, invalid-proposal, and unsupplied-source responses still fail closed. The prompt now names every canonical root/proposal key, enum value, empty-array rule, and no-fence/no-wrapper/no-reasoning requirement.

Focused coverage passes **28 frontend tests**, **14 native Writers' Room tests**, **18 AI Workspace regressions**, and **12 shared Creator structured-output regressions**, including a mocked Example Guild request through preparation, normalization, session completion, and React rendering. The compatible `CLARIFY` fixture needs no proposal, preserves its supplied source trace, renders its focused question, and leaves Compendium bytes unchanged. Full validation passed `npm run check` (**317 frontend tests in 27 files**), `npm run test:native` (**213 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. The existing run command still records a completed provider execution with `structuredOutputSuccess: false` when normalization fails, keeps the draft/conversation/context usable, and performs no automatic retry. Builds retained only the existing non-blocking Vite chunk-size and Windows import-library linker warnings. No live provider request or GUI automation was used for WR-1.3.1; the user-driven live recheck and WR-1.3 Manual PASS remain pending.

### WR-1.3.2 provider-enforced structured output and safe diagnostics — implemented, headless validated; live recheck pending

Two user-driven Nemotron WR-1.3 requests first completed at the Token Factory provider boundary and then failed local schema validation as `INVALID_WRITERS_ROOM_OUTPUT`; those prompt-only failures motivated WR-1.3.2. A third later attempt also failed after JSON-object enforcement and motivated WR-1.3S. Project Brain context and established knowledge were found before generation. This is bounded workflow evidence, not a general reliability claim about Nemotron. Raw response text was intentionally not retained, so the exact historical mismatches remain **UNVERIFIED**.

Inspection found that ForgeMind's Token Factory request previously sent no `response_format`. The current Token Factory Chat Completions API reference documents `json_object` (and text), while the broader structured-output guide also describes `json_schema`; exact strict-schema compatibility is not confirmed for the registered `nvidia/nemotron-3-super-120b-a12b` path. The model registry now represents `NONE`, `JSON_OBJECT`, and `JSON_SCHEMA` explicitly. Nemotron uses `JSON_OBJECT`; the other registered model uses `NONE`. A bounded WR-1.3 schema exists only behind an explicit future `JSON_SCHEMA` capability and is not sent by the current registry.

At the WR-1.3.2 boundary, local parsing applied strict mode, nested-question, source-reference, proposal, bounds, phase, and authority validation. WR-1.3S supersedes that expanded provider schema with the smaller contract below while retaining the same failure stages and content-free diagnostics. The canonical usage record may add only allowlisted root-key presence, an unknown-field count, provider/model, response character count, and usage identity. Tests verify that response values, arbitrary unknown key names, project markers, prompts, credentials, and hidden reasoning are not persisted.

Focused validation passed **28 frontend Writers' Room/AI Workspace tests**, **17 native Writers' Room tests**, **29 provider/Creator regressions**, **6 model-registry tests**, and **10 usage tests**. The mocked Example Guild `CLARIFY` path uses Nemotron's provider-enforced JSON-object request, returns an established summary plus one focused question with three directions and valid source trace, creates zero proposals, renders through the existing frontend fixture, and leaves Compendium unchanged. Full validation passed `npm run check` (**317 frontend tests in 27 files**), `npm run test:native` (**217 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. Builds retained only the existing non-blocking Vite chunk-size and Windows import-library linker warnings. `cargo fmt --check` was unavailable because `cargo-fmt` is not installed. No live provider request or GUI automation was used; the provider-enforced JSON live recheck and WR-1.3 Manual PASS remain pending.

One confirmation remains exactly one provider request. A structured-output failure records provider usage, keeps the draft/conversation available, and leaves project truth unchanged. There is no automatic repair request, retry, second-model fallback, Tavily integration, Import/Rebaseline work, or Chronicler work in WR-1.3.2.

### WR-1.3S restored live-proven response contract — complete; live manual PASS recorded

Three real Nemotron Writers' Room responses completed at the provider boundary but failed the expanded WR-1.3 local contract, including one attempt after JSON-object enforcement. Narrative Context preflight worked in those runs; the exact rejected payload details remain unavailable because raw provider output is intentionally not retained. Submission stabilization therefore restores the previously live-proven WR-1.2 provider shape instead of adding more permissive expanded-schema normalization.

The provider now returns only `message`, zero-to-three plain string `questions`, supplied-only `sourceRefs`, and bounded strict `proposals`. `mode`, `whyItMatters`, and nested question options are neither required nor described in the prompt. Guided Lore behavior remains explicit prompt guidance: understand established knowledge, identify unresolved gaps, ask focused questions before over-inventing, and return durable proposals only after concrete user direction. Existing format-version `1` sessions with WR-1.3 phase/nested-question metadata remain loadable; current responses do not persist a phase and the UI no longer displays a model-authored phase badge.

Focused coverage passes **17 native Writers' Room tests**, **18 native AI Workspace tests**, **29 provider/Creator tests**, **6 model-registry tests**, **28 Writers' Room/AI Workspace frontend tests**, and **49 App/Compendium frontend tests**. It covers zero through three string questions, omitted/`null` optional arrays, too many questions, malformed or competing JSON objects, unknown sources, invalid proposals, the exact Example Guild acceptance flow with one valid source and no proposal/project mutation, Nemotron JSON-object selection, safe diagnostics, proposal Review/Edit with edited Apply content, deterministic duplicate suppression, and next-turn Project Brain re-resolution. Full validation passed `npm run check` (**317 frontend tests in 27 files** plus TypeScript), `npm run test:native` (**217 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. Builds retained only the existing Vite chunk-size and Windows import-library linker warnings. `cargo fmt --check` remains unavailable because `cargo-fmt` is not installed. No live provider request or GUI automation is part of WR-1.3S.

The user confirmed that the stabilized WR-1.3S live manual validation passed before TAV-1 began. That closes the response-contract recheck; exact model ID, prompt, token counts, latency, and proposal outcome were not supplied for the pass and remain **UNVERIFIED** rather than reconstructed.

### TAV-1 External Research in Writers' Room — implemented, headless validated; first live workflow recorded

Native Tavily coverage verifies the official Search endpoint and `POST` method, native bearer header, Basic depth, five-result limit, disabled Tavily answer/raw content, one provider call per confirmation, no automatic retry, missing-key/auth/rate/plan/timeout/network/malformed/zero-result categories, HTTP(S)-only filtering, snippet bounds, normalized source authority, and failure preservation of prior research. AI Workspace/Writers' Room coverage verifies selected-only external context, coexistence with Project Brain, rejection of unknown or deselected source IDs, prompt-like snippets remaining untrusted data, separate Tavily run metadata, no search/response mutation of project truth, and unchanged proposal Review/Edit/Apply ownership. Frontend coverage verifies the visible Research web action, editable prefilled dialog, Cancel with zero calls, missing configuration guidance, result cards, selection, Clear without a Tavily call, external source links/provenance, provider-separated preflight, and unchanged normal Send.

TAV-1 validation passed **33 focused frontend tests in 4 files**, **10 focused native Tavily tests**, the complete TypeScript/frontend check (**322 tests in 28 files**), the complete native suite (**229 library tests and 2 CLI tests**), the production frontend build, and the Tauri no-bundle release build. Changed-document local-link validation passed for **11 Markdown files**, and `git diff --check` passed. Builds retained only the existing Vite chunk-size and Windows import-library linker warnings. `cargo fmt --check` remains unavailable because `cargo-fmt` is not installed.

Automated validation uses mocked providers only. No Tavily or Nebius request is permitted during implementation checks. The live Manual PASS remains pending: with a disposable project and `TAVILY_API_KEY` configured before launch, open a Writers' Room session with established Project Brain context; enter **“Research examples of tactical games where enemy factions can fight each other independently of the player. Focus on how this affects encounter design and player information.”**; choose **Research web** and confirm one Search; inspect up to five `EXTERNAL RESEARCH · TAVILY` cards and deselect at least one; enter **“Compare these external patterns with our current project direction. What would fit, what would conflict, and what important design question should we resolve next?”**; verify preflight shows Project Brain + selected Tavily count + Tavily + Nebius Token Factory; confirm one Nemotron request; inspect supplied source traces and the stable `message/questions/sourceRefs/proposals` response; optionally Review/Edit/Apply one proposal; then restart and confirm the bounded research snapshot/source traces remain understandable. Confirm no automatic truth mutation, retry, second search, Crawl/Extract, Import/Rebaseline, Chronicler, or Router action occurs.

### TAV-1.1 External Research UX + Query Reliability — implemented, headless validated; manual recheck pending

The first user-driven TAV-1 workflow proved that the Tavily request succeeded, normalized `EXTERNAL_RESEARCH` reached Writers' Room, preflight distinguished Tavily from Nebius Token Factory, and Nemotron synthesis ran with the selected research. The returned sources were nevertheless dominated by unrelated software-design/OOP material for the intended tactical-game/faction question. Audit found a direct path from the composer to the editable Research query, typed frontend request, native request, and Tavily JSON `query`: only outer whitespace is trimmed. There is no stale composer reuse, fallback query, truncation, alternate field, hidden rewrite, or serialization mismatch in that path. Because exact historical wire content was not separately captured, this establishes the current deterministic path and rules out an identifiable current ForgeMind transformation bug; it does not prove a general Tavily quality issue or claim relevance was fixed.

TAV-1.1 replaces the horizontal source strip with a compact mutually exclusive right-side drawer showing the persisted query, result/selected counts, vertical bounded snippets, authority/domain labels, selection controls, native **Open source ↗**, and Clear. A compact selected-count indicator is the only research element in the normal workbench. The external action has its own restrained warning-accent treatment. Source opening revalidates HTTP(S), strips tracking/sensitive query parameters, rejects `javascript:`, `data:`, `file:`, and credential-bearing URLs, uses the OS default-browser boundary without a shell string, and reports safe failure in place. Selected-only context and source citations remain unchanged; deselection now has explicit regression coverage for the external count and lower approximate input maximum.

Focused validation passed **31 frontend tests in 3 files**, **11 native Tavily tests**, **18 native Writers' Room tests**, and **19 native AI Workspace context/security tests**. Complete validation passed `npm run check` (**323 frontend tests in 28 files** plus TypeScript), `npm run test:native` (**230 library tests and 2 CLI tests**), `npm run build`, and `npm run tauri build -- --no-bundle`. Builds retained only the existing Vite chunk-size and Windows import-library linker warnings. No Tavily call, Nebius call, GUI automation, AI query rewrite, additional external service, Import/Rebaseline, Chronicler, or Router work occurred.

For the TAV-1.1 manual recheck, create a fresh Writers' Room session so prior correctly persisted `APPLIED` proposals do not confuse the demo. Confirm the dialog visibly contains the exact intended query before Search; confirm the revised drawer is vertical and does not overlap the conversation; open one safe source in the default browser; deselect at least one result and confirm selected count/preflight size decrease; switch to another session and confirm the research does not follow; switch back and confirm it remains; restart and confirm the same session-scoped snapshot/query remains understandable. Existing applied proposals must remain visible. Record low-quality results honestly if they recur; do not mark Tavily relevance fixed without new evidence.

### UI-3 Project Overview Dashboard — implemented, headless validated; manual check pending

UI-3 focused coverage verifies concise project identity without path/ID/format/debug metadata; sparse and mature project states; shared NEXT-1 ordering and five-item bounds; navigation to existing owning workflows; Foundation gaps; proposed/approved Decision counts; Compendium-backed unresolved Open Questions; Repository unknown/disconnected/connected/error; Unity unknown/disconnected/portable-only/partial/available/error; non-rejected actionable Alignment counts without conflating review state; draft/approved/archived Feature Contract counts; honest unavailable-source state; stable dashboard/signal-group classes; and no fabricated activity or health score. The native invoke-level Overview test permits only the four existing local document reads, proving render makes no provider request, Reality inspection, Alignment rebuild, or project-truth mutation. App regression coverage also confirms no AI workflow or Git/Unity inspection runs before the user chooses an owning destination. Workspace Home's existing top-three behavior remains covered and unchanged.

Focused UI-3/App/NEXT-1/design-system validation passed **68 frontend tests**. The complete frontend suite passed **314 tests in 26 files** under stable single-worker scheduling. `npm run typecheck`, the production frontend build, and `npm run tauri build -- --no-bundle` passed; the Tauri release build retained only the existing informational Windows import-library linker warning. No native contract changed, so no new native test run was required. Changed-document local-link validation and `git diff --check` are the final repository checks. No live provider request or GUI automation was used.

Recent Activity is intentionally deferred. Decision, Compendium, Alignment, Feature Contract, Git, and Unity timestamps currently represent different create/update/review/evidence concepts rather than one trustworthy event contract; UI-3 does not invent a feed or competing event store from them. AI Insights are likewise deferred from this deterministic/local dashboard. At the UI-3 checkpoint, Writers' Room behavior and its pending manual status were unchanged; WR-1.3, Chronicler, Knowledge Import/Rebaseline, NEXT-2, UI-4, and other adjacent milestones had not started.

Manual UI-3 closure remains required:

1. Open a newly created sparse project at `1180×760`; confirm the concise identity, Foundation/Reality signals, grouped empty states, and useful recommendations without a wall of zero-value metrics.
2. Open a mature public-safe fixture or locally held dogfood project; confirm actual pending Decisions, Alignment issues, Reality evidence, draft Feature Contracts, and relevant recommendations receive appropriate emphasis.
3. Confirm the Overview exposes no filesystem path, internal project ID, format version, confidence/debug internals, fake percentage, or fabricated activity.
4. Follow representative recommendation and signal actions to Game Design, Decisions, Repository, Unity, Alignment, and Feature Contracts. Confirm Home still shows only the compact top three for the current project.
5. Before explicit Reality inspection, confirm Repository and Unity say **Not inspected**. Inspect/connect only from the owning pages, return to Overview, and confirm the known session state updates without an automatic scan.
6. Repeat at fullscreen and `760×560`; confirm normal vertical page scrolling, readable recommendations, clean card collapse, and no horizontal overflow.

Do not record UI-3 Manual PASS until this checklist succeeds.

### UI-4 Game Wiki / Knowledge Explorer — implemented, headless validated; manual check pending

UI-4 focused coverage verifies the pure read-model projection; deterministic sorting and case-insensitive human-readable search; combined category, type, authority/provenance, and lifecycle filters; explicit current, unresolved, proposed, approved, deprecated, and superseded treatment; Open Question and Decision authority; selected-detail source metadata and timestamps; closest stable owner routing; sparse-project guidance; isolated source failures; and an untruncated deterministic 500-entry projection. Page tests verify the category/list/detail structure, derived-summary separation, non-authoritative AI analysis, and that Wiki mount never invokes Git or Unity inspection. App regressions verify navigation back to Game Design, Decisions, Alignment History, Feature Contracts, Specialist, Repository, and Unity owners.

Focused Wiki/read-model/App validation passed **42 frontend tests**. TypeScript typecheck passed, and the complete frontend suite passed **312 tests in 27 files** under stable single-worker scheduling. The production frontend build and `npm run tauri build -- --no-bundle` passed; the Tauri release build retained only the existing informational Windows import-library linker warning. No native command, schema, or persistence boundary changed, so a new native test run was not required. No live provider request or GUI automation was used.

Manual UI-4 closure remains required:

1. At `1180×760`, confirm the category, compact result, and selected-detail panes are simultaneously useful; rows remain bounded and the page exposes no internal ID, absolute path, or format version.
2. Search mixed-case title/content/source text and combine Type, Authority, and Lifecycle filters. Confirm Clear filters returns to Current and deprecated/superseded records appear only when explicitly requested.
3. Inspect an active Compendium entry, unresolved Open Question, proposed and approved Decision, deprecated item, and AI working analysis. Confirm authority/lifecycle wording is explicit and proposed/AI material never looks established.
4. Follow representative owner actions. Confirm Knowledge/Open Questions open the exact Game Design source; Decisions and Specialist history open their closest stable owning workspace; Alignment and Feature Contract summary routes still work.
5. Before explicit Reality inspection, confirm the Wiki does not create Repository/Unity evidence. After inspecting from each owner, return to Technical and confirm only the known session summaries appear.
6. Repeat at fullscreen and `760×560`; confirm the panes stack cleanly, results remain internally bounded where appropriate, normal vertical scrolling works, and no horizontal overflow appears.

Do not record UI-4 Manual PASS until this checklist succeeds. UI-4 did not implement `wiki.json`, semantic/vector search, Knowledge Import/Rebaseline, WR-1.3, Chronicler, provider calls, automatic question resolution, or Writers' Room changes.

### IMP-1.1 Extraction Result Visibility & State Reliability — implemented, headless validated; fresh live/manual acceptance pending

The first controlled IMP-1 extraction selected one project-contained Markdown file and rendered the expected Nebius Token Factory / NVIDIA Nemotron preflight, source summary, input estimate, and untrusted-data boundary. After explicit confirmation the UI showed extraction work briefly, then returned to the same preflight without a Candidate Review Queue, explicit empty result, or visible error. That evidence proves the frontend entered the run path; it does **not** prove whether the provider succeeded, failed, returned zero candidates, or produced invalid structured output because the old UI collapsed those outcomes into the same inferred state and raw provider content is intentionally not retained.

The root cause was frontend state inference: the selected preflight intentionally remained populated while candidates remained empty on zero-result and failure paths, and clearing the shared loading flag after async completion made those values render preflight again. IMP-1.1 uses explicit `SOURCE_SELECTION`, `PREFLIGHT`, `RUNNING`, `REVIEW_QUEUE`, `EMPTY_RESULT`, `ERROR`, and `APPLY_RESULT` phases. `RUNNING` now transitions only to Review Queue for one or more normalized candidates, an explicit **No import candidates found.** state for a valid empty result, or an in-workflow error preserving the selected model and source summary. Retry first returns to preflight and requires a new explicit confirmation; repeated activation while running is blocked and no automatic retry exists.

Native normalization retains the exact `{"candidates":[...]}` contract and seven required candidate fields. The safe Writers' Room diagnostics pattern classifies no-object, parse, deserialization, unknown-field/type/section, candidate-bound, source-reference, and speculative-knowledge failures without persisting response values, Markdown, hidden reasoning, credentials, or arbitrary unknown keys. One canonical usage record is appended for every executed provider attempt; structured-output failure records provider success plus structured-output failure, and valid `{"candidates":[]}` records provider and structured-output success. Errors expose only the safe request-executed distinction needed by the workflow.

Focused offline coverage validates project-contained `.md` acceptance; traversal, external, non-`.md`, `.forgemind`, symlink escape, credential-like marker, file-count, per-file, and aggregate-size rejection; stable project-relative source IDs; no absolute path in provider input; strict three-type/30-candidate structured output; unknown source rejection; speculative durable-knowledge rejection; malformed/oversized safe failure; exactly one mocked provider call with no retry; deterministic duplicate/title-collision status; transient editable selection; default deselection of existing records; no mutation before Apply; owning Compendium/Decision writes; `DOCUMENTED` trace; `PROPOSED` Decisions; unresolved Open Questions; idempotent repeated Apply; Wiki refresh/projection; and Lore Architect retrieval through Project Brain. The synthetic Aster Vale Colony fixture contains only public-safe fictional content.

Recorded IMP-1.1 evidence: **18 focused frontend Knowledge Import/platform/Wiki tests**, **11 focused native Knowledge Import tests**, and the focused Writers' Room imported-context regression passed. The terminal-state regressions cover a five-candidate `3 KNOWLEDGE / 1 DECISION / 1 OPEN_QUESTION` success, valid empty result, invalid structured output, provider failure, preserved selection/context, no mutation, no return to active preflight, and duplicate activation while running. The complete suites passed **334 frontend tests in 30 files**, **244 native library tests**, and **2 native CLI tests**. TypeScript, the production Vite build, and `npm run tauri build -- --no-bundle` passed. The existing Vite chunk-size advisory and informational Windows import-library linker warning remained non-blocking. No live provider request or GUI automation occurred during IMP-1.1 implementation or validation.

Run the validation ladder from `app/`:

1. focused `knowledge_import` native tests plus Writers' Room imported-context regression;
2. focused Knowledge Import panel/platform, Wiki, Compendium, Decisions, and Wiki read-model frontend regressions;
3. full frontend suite, full native suite, TypeScript, production frontend build, and Tauri no-bundle release build;
4. changed-document local-link/file checks and `git diff --check`.

No automated step may call Nebius. After all headless checks pass, the exact short user-driven acceptance is:

1. In a disposable public-safe existing project, open **Game Wiki -> Import Knowledge** and select 1-3 contained `.md` files.
2. Confirm preflight names **Nebius Token Factory** and **NVIDIA Nemotron**, shows the correct files/size/input band, and that Cancel makes no request.
3. Authorize one controlled extraction. Confirm it terminates visibly in exactly one of Review Queue, **No import candidates found.**, or an error preserving model/source context; it must never silently return to preflight. If the result is empty or an error, confirm another run requires returning to preflight and making a new explicit confirmation, then stop or continue with a separate authorized request.
4. For a Review Queue result, confirm factual Knowledge, one explicit Open Question, and where present one Decision candidate show documented project-relative trace.
5. Edit or deselect one candidate, then **Apply Selected**. Confirm actual counts, immediate Wiki entries, `DOCUMENTED` provenance, a `PROPOSED` Decision, and an unresolved Open Question.
6. Repeat Apply and confirm exact entries are skipped rather than duplicated. Restart and confirm owning-domain persistence.
7. Start a new Lore Architect session, ask about one imported narrative fact, and confirm the preflight/context trace includes the applied Project Brain entry before optionally authorizing a separate Writers' Room request.

Record the extraction request count, model, latency/tokens when available, candidate outcome, Apply counts, restart result, and Writers' Room context result without raw provider response, private content, machine paths, or credentials. Do not mark IMP-1 complete until this manual PASS is recorded. This pending product acceptance does not reopen the public-repository security/history gate.

### IMP-1.2 Diagnostic-Led Live Import Schema Compatibility — headless validated; live recheck pending

The second controlled live attempt used the public-safe `docs/world_seed.md` source. Nebius Token Factory executed the NVIDIA Nemotron 3 Super 120B request, and IMP-1.1 correctly terminated in the visible `INVALID_KNOWLEDGE_IMPORT_OUTPUT` error state with no candidates, project mutation, or automatic retry.

The latest matching canonical usage record at `2026-10-27T21:01:04.981Z` reports provider success, structured-output failure, extraction stage `DESERIALIZATION_FAILED`, validation code `INVALID_SCHEMA`, canonical top-level key presence `candidates`, and response character count `1468`. Candidate count was not recorded. This proves the response reached the expected root contract but does not distinguish a non-array `candidates` value from an invalid or missing candidate `title`, `content`, `sourceRefs`, `confidence`, or `note`. Raw provider output and Markdown were neither inspected nor retained, so the exact historical structural mismatch remains **UNVERIFIED**.

Because the diagnostic was insufficient, IMP-1.2 adds no casing, alias, null, omitted-note, single-source-string, or section normalization. The parser remains strict. Future safe diagnostics now distinguish `MISSING_CANDIDATES`, `INVALID_CANDIDATES_TYPE`, `INVALID_CANDIDATE`, `INVALID_CANDIDATE_TYPE`, `INVALID_TITLE`, `INVALID_CONTENT`, `INVALID_SECTION`, `INVALID_SOURCE_REFS`, `UNKNOWN_SOURCE_REF`, `INVALID_CONFIDENCE`, `INVALID_NOTE`, `UNKNOWN_FIELD`, `EXCESSIVE_CANDIDATES`, and `SPECULATIVE_KNOWLEDGE_REJECTED` without storing field values or arbitrary unknown key names. Diagnostics retain only canonical root-key presence, unknown-field count, provider/model, response character count, and usage reference.

The compact import prompt now shows one canonical candidate and explicitly requires exactly one JSON object; root key `candidates`; exact type and confidence enums; all seven candidate keys; supplied-only `sourceRefs` arrays; `{"candidates":[]}` for no result; and no fence, wrapper prose, reasoning field, or extra keys. Nemotron remains on registry-owned `JSON_OBJECT`; semantic/source/authority validation remains local and unchanged.

Focused validation passed **12 native Knowledge Import tests**, **18 frontend Import/platform/Wiki tests**, and **2 provider response-format regressions**. The complete suites passed **334 frontend tests in 30 files**, **245 native library tests**, and **2 native CLI tests**. TypeScript, the production Vite build, and `npm run tauri build -- --no-bundle` passed. The existing Vite chunk-size advisory and informational Windows import-library linker warning remained non-blocking. No live provider request or GUI automation occurred during IMP-1.2 implementation or validation.

The next user-driven live import must record the new exact safe field-level code if it still fails. Only that evidence may authorize a narrow compatibility normalization. Do not mark IMP-1 Manual PASS until a Review Queue/empty-result/error terminal state and the remaining persistence/Writers' Room acceptance complete successfully.

## Future security validation

## MODEL-1 model catalog and registry

Automated MODEL-1 validation is offline. Native fixtures verify one authenticated `GET /v1/models`, ID-only normalization, malformed-response failure without cache replacement, custom-ID safety, conservative `NONE` capability, application-local registry round trip, protected default, disabling a non-default entry, and deterministic installation-wide run count/token/median-latency/last-used aggregation. Frontend coverage verifies no automatic refresh, distinct provider and registry language, verified versus unverified capability display, observed metrics/no-runs language, explicit refresh, explicit enable, and the protected default. Existing selector/provider regressions must remain green; no automated check may make a live catalog or inference request.

Recorded headless evidence: **3 focused frontend MODEL-1 tests**, the AI Studio navigation regression, and **12 focused native catalog/registry/metrics tests** passed. The complete suites passed **341 frontend tests in 31 files**, **251 native library tests**, and **2 native CLI tests**. TypeScript, the production Vite build, native production `cargo check`, and `npm run tauri build -- --no-bundle` passed. The existing Vite chunk-size advisory and informational Windows import-library linker warning remained non-blocking. `cargo fmt --check` was unavailable because `cargo-fmt` is not installed. No live catalog request, live inference, or GUI automation occurred.

Manual acceptance remains pending: launch with `NEBIUS_API_KEY`, open **AI Models**, explicitly refresh once, verify a local timestamp and catalog results, confirm Nemotron remains enabled/default with JSON Object and observed usage where present, enable or add one model without claiming capability, revisit a model selector, restart, and confirm registry/catalog persistence. A failed refresh must preserve configured models. Record this separately from live inference; none is required.

### MODEL-1.1 compatibility regression

Manual MODEL-1 testing passed catalog refresh, dynamic discovery, enable/custom flows, observed metrics, selector visibility, and restart persistence, but found that an enabled custom capability-`NONE` model could reach Writers' Room execution and fail at the provider. MODEL-1.1 moves that rejection before provider execution.

Offline coverage verifies the shared `JSON_OBJECT` minimum (`JSON_SCHEMA` also satisfies it), conservative `NONE` defaults for discovered/custom models, disabled incompatible selector options, Nemotron compatibility, and native `MODEL_CAPABILITY_REQUIRED` rejection across Writers' Room, Knowledge Import, Creator, Feature Contract, and Specialist request builders. The Writers' Room and Knowledge Import regressions assert a zero provider-request counter for capability-`NONE` attempts. Model-page coverage verifies collapsed rows, expansion of full local observed metrics, semantic badge classes, custom availability separation, and protected-default behavior. No automated check makes a live catalog or inference request.

Recorded headless evidence: **147 focused frontend tests** across AI Models and the five structured workflows passed. The complete frontend suite passed **343 tests in 31 files**; the complete native suite passed **254 library tests and 2 CLI tests**. TypeScript, the production Vite build, and `npm run tauri build -- --no-bundle` passed. The existing Vite chunk-size advisory and informational Windows import-library linker warning remained non-blocking. The normal Vitest config bundler initially hit the known Windows `.vite-temp` `EPERM`; the same focused and full suites passed with Vitest's `runner` config loader. No live provider request or GUI automation occurred.

Manual PASS is still pending: with a capability-`NONE` custom model enabled, verify it is visibly incompatible and non-executable in Writers' Room and Knowledge Import; verify Nemotron still executes only after normal confirmation; inspect compact rows, expansion, badge distinctions, and restart persistence. Do not spend credits merely to prove a blocked attempt.

[Security and Privacy Architecture](SECURITY_AND_PRIVACY.md) defines the SEC-0 threat model and detailed future test expectations. SEC-1 and later security tests must remain deterministic and offline, use synthetic placeholder secrets, and never call a live provider or print/write a real credential.

At minimum, future shared and adapter-specific coverage should prove that provider keys never enter frontend state, `.forgemind`, usage history, normalized payload JSON, Context Preview, errors, or logs; known secret patterns block the final outbound package; redaction cannot reproduce the original candidate; unrelated sources and machine-specific paths are omitted; provider-specific adapters cannot bypass shared Security Preflight; and imported prompt-injection text remains data rather than a control instruction. Missing/rejected/revoked credentials, unavailable providers, unavailable exact preview, and stale Reality must fail locally and non-destructively.

SEC-0 adds no executable behavior, so its validation is documentation link/anchor consistency plus `git diff --check`. No application build, live AI, credential setup, or GUI automation is required for SEC-0.

## Morning manual validation backlog

The remaining short user-driven checks require no new live AI, provider credential, Git network operation, or GUI automation. Automated implementation is complete, but 0G.8, 0G.9, 0G.10, 0G.11, 0G.12, and 0H must not be marked complete until their applicable manual checks pass. Completed 0I and 0J evidence is retained below for traceability.

### 0G.11 NVIDIA comparison — pending

1. Confirm DeepSeek V4.1 Flash and NVIDIA Nemotron 3 Super 120B are both selectable in AI Behavior Designer.
2. Open a saved successful DeepSeek run, select Nemotron, and confirm no request occurs until **Run with another model** is explicitly activated.
3. The first authorized Nemotron request confirmed NVIDIA provider inference but failed full Specialist validation on an overlong recommendations list. A later post-0G.12 Nemotron Specialist run completed successfully and is valid local evidence, but the sample remains too small for a model recommendation. Make another live request only if separately useful and explicitly authorized.
4. Confirm the compared runs show the same task, exact Scenario / Question, Compendium context, and approved Decisions, with side-by-side findings and separate metrics.
5. Confirm the comparison is labeled human evaluation, declares no winner, and exposes no routing, batch, or background action.

### 0G.12 bounded-output normalization — pending

1. Open a stored normalized run and confirm the non-fatal notice is readable beside the bounded result.
2. Compare it with a matching run and confirm the notice appears only on each run that was normalized.
3. Confirm the result contains the first retained items in original order and no retry occurs automatically.

### 0G.10 Specialist history readability + Scenario copy — pending

1. Copy a multiline current and historical Scenario / Question and confirm the complete text and line breaks are preserved.
2. Confirm compact history rows show task/status, timestamp, model, and budget plus success summary or failure category on separate readable lines without changing the middle-column width.
3. Confirm a long model identifier and long result summary truncate visually without widening or breaking the history column.
4. Use **Select recommended** after a manual Compendium selection and confirm both remain selected.
5. Use Project Context **Deselect all** and confirm only Compendium selections clear; then use the separate Approved Decision **Deselect all** and confirm only Decisions clear.

### 0G.9 Specialist + Wiki UX polish — pending

1. At a wide desktop size, confirm configuration, compact Analysis History, and selected-run detail remain usable side by side; narrow the window and confirm they stack cleanly.
2. Confirm Scenario and run/diagnostic copy icons are compact, their feedback stays local without layout shift, and starting a run clears stale success feedback.
3. Confirm saved Project Context and Approved Decisions appear above the Scenario / Question, including honest empty states.
4. Select several stored findings, review all fields in the large promotion surface, and promote them in one flow without creating a Decision.
5. Confirm an exact duplicate remains blocked and a normalized-title match offers Cancel, edit-existing, and Save anyway.
6. Confirm Wiki type/state tags, keyword search, and All/Knowledge/Decisions/AI Analysis filtering remain readable at wide and narrow sizes.
7. Use **Edit in Compendium** from Wiki Knowledge and confirm the existing inline Compendium editor opens on the correct entry.
8. Confirm the sidebar label reads **Repository / Git Reality** and that 0H behavior is otherwise unchanged.

### 0G.8 Game Wiki — pending

1. Confirm Wiki aggregation across Compendium knowledge, Decisions, and successful Specialist Analysis History.
2. Confirm authority labels clearly distinguish Knowledge, Decision authority, and non-authoritative AI Analysis.
3. Confirm expand/collapse density remains readable at wide and narrow window sizes.
4. Use **Add to Project Knowledge** from a stored successful analysis.
5. Edit the Area, title, statement, and status before promotion, then explicitly confirm it.
6. Confirm the promoted entry appears in both Compendium and Game Wiki while the original history run remains unchanged.
7. Confirm promotion creates no automatic Decision and duplicate protection still rejects the same exact title and statement.
8. Restart ForgeMind and confirm Wiki, Compendium, Decisions, and Analysis History appearances persist.

### 0G.7 Specialist UX — pending

1. Confirm the local spinner and elapsed feedback remain beside **Run Analysis**.
2. Confirm the scenario clears only after a successful result is saved; failures and unsafe outcomes preserve it.
3. Confirm **Copy Scenario** copies the exact current or historical scenario.
4. Confirm **Copy Result as Markdown** exports only normalized safe result fields.
5. Confirm a historical scenario/result can be reused after reopening the workspace.

### 0H Git Reality — pending

1. Open this ForgeMind repository and confirm it is detected.
2. Confirm branch and HEAD hash, subject, author, and timestamp are correct.
3. Confirm the clean/dirty working-tree state is correct.
4. Edit a disposable test file, refresh the snapshot, and confirm the change appears without displaying its source diff.
5. Stage and then modify the file again; confirm staged/unstaged distinction is accurate.
6. Confirm aggregate and per-file diff statistics are reasonable.
7. Confirm the bounded recent-commit list matches the repository.
8. Restart ForgeMind, reopen the workspace, and confirm a fresh transient snapshot loads.
9. Confirm no Git write action is available: no commit, push, pull, fetch, merge, rebase, checkout, branch, or stash control.

### 0I.1 Unity GroundTruth foundation — completed

1. Open an initialized Unity workspace and confirm `Assets/`, `Packages/`, `ProjectSettings/`, and the parsed Unity version match the project.
2. Confirm a workspace without the canonical Unity directories reports Not detected and remains otherwise usable.
3. Confirm Not generated, Available, and Invalid / unsupported manifest states are visually distinct without exposing raw manifest paths or contents.
4. Confirm the page clearly distinguishes VERIFIED FROM UNITY, DOCUMENTED, and AI INFERENCE, and generates no AI interpretation.
5. Open Game Wiki Technical and confirm its Unity Reality summary is compact and absent from other Areas.
6. Confirm there is no Unity run/export, scene edit, asset edit, source generation, Alignment, or automatic comparison action.

### 0I.2 Unity GroundTruth exporter — completed

Automated implementation validation uses a disposable headless Unity test host for the local `com.forgemind.unity-groundtruth` package. Its focused EditMode tests cover deterministic ordering, portable-path rejection, scene hierarchy, component/serialized-field metadata, ScriptableObject metadata, tags/layers, and malformed project metadata. This does not automate the Unity GUI or export from a real game project. No PlayMode test is required.

The Unity GroundTruth manual PASS was completed against a separate private dogfood project on Unity `6000.3.23f1`:

1. Ensure the local validation project is initialized in ForgeMind and install `unity/com.forgemind.unity-groundtruth` through Unity Package Manager **Add package from disk**.
2. In Unity, choose **Tools > ForgeMind > Export GroundTruth**. Confirm the result names `.forgemind/unity-groundtruth.json` and reports plausible scene, GameObject, component, and ScriptableObject counts.
3. Confirm the export did not save or modify scenes, prefabs, ScriptableObjects, Project Settings, assets, or source. Package-installation files and the GroundTruth manifest are the only expected project changes.
4. Inspect the manifest for the matching portable Project ID, Unity version, format version `1`, enabled Build Settings scenes, explicit coverage/errors, and project-relative forward-slash paths. Confirm it contains no absolute path, raw serialized value, secret, machine identity, stack trace, or design/IMPLEMENTED claim.
5. Export again without project changes. Apart from required `generatedAt`, confirm observation ordering and content are stable enough for a meaningful diff.
6. Open the local validation project in ForgeMind, refresh **Unity GroundTruth**, and confirm the manifest is Available with the same real category counts shown by the Unity export.
7. Open **Game Wiki > Technical** and confirm its compact Unity Reality card shows updated scene, GameObject, component, and ScriptableObject counts from the manifest. Confirm the card remains absent from other Areas.
8. Temporarily test a safe unsupported case, such as malformed ForgeMind project metadata in a disposable copy, and confirm the exporter gives an actionable error without replacing the last valid manifest with malformed JSON.

Recorded baseline: **3 scenes, 887 GameObjects, 1,859 components, 80 ScriptableObjects, 136 prefab references, 10,000 retained serialized fields, 19 Input Actions, and 1 discovered test**. The manifest's single coverage issue is `SERIALIZED_FIELDS_TRUNCATED`; exporter code and manifest evidence confirm this is the expected 10,000-record per-category safety bound, so the field total is partial coverage rather than an exact count or a separate correctness error.

The real mutation check also passed: adding one object/component changed **887 → 888 GameObjects** and **1,859 → 1,860 components**, and reverting restored the baseline. The manifest remained portable and safe, ForgeMind refreshed the normalized evidence, and the bounded cited technical-question exit condition passed. 0I is complete; that validation did not itself start 0J.

### 0J.1 Alignment Engine foundation — completed

Functional dogfooding completed successfully and remains the manual PASS for 0J. It exercised the implemented Alignment workflow and source-boundary behavior; the follow-up findings were limited to Game Wiki count and summary clarity and are addressed by the headlessly validated 0J.5 polish above. No new GUI pass is required for 0J.5. 0K is now current.

### 0K.3 Feature Contract closure smoke — completed

The final user-driven 0K.3 smoke passed. It verified approved Alignment source trace, explicit AI Draft invocation and running state, per-section Apply, Apply All, optional-field approval, Implementation Brief preview/copy parity, lifecycle protections, Game Wiki navigation, and persistence after restart.

1. Create a DRAFT from an approved Alignment Review in the local validation project.
2. Confirm Source trace retains the approved Alignment, underlying Intent, status/rationale, and captured Reality evidence/provenance; confirm the Reality assessment is not the Compendium-only fallback.
3. Invoke **Draft with AI** explicitly and confirm the local spinner, model label, and elapsed time remain visible while the provider request runs.
4. Confirm the AI Draft Proposal is comfortably readable, shows only available run metadata, and remains visually distinct from captured facts and verified Reality evidence.
5. Apply one empty section; then edit it and confirm **Replace with AI proposal** requires confirmation. Confirm the resulting **Applied ✓** state is clear.
6. Use **Apply all** and confirm feedback appears beside the action and existing human text is preserved.
7. Save the DRAFT and confirm the proposal itself is not persisted. Discard another proposal and confirm no contract field changes.
8. Preview and copy the DRAFT brief; confirm both start `DRAFT — NOT APPROVED`, match exactly, and contain no invented path or command.
9. Approve after completing title, goal, required behavior, acceptance criteria, and deterministic tests while leaving optional fields empty if desired. Preview/copy the normal approved brief.
10. Mark a disposable approved contract superseded or deprecated, confirm it moves from **Active** to **Archived**, and confirm all history remains available through **All** with no hard delete.
11. Enter from **Game Wiki > Systems**, confirm both Wiki summary actions look interactive, open Feature Contracts, and confirm **Back to Game Wiki** restores **Systems**.
12. Restart ForgeMind and confirm the contract fields, lifecycle, source trace, Reality summary, and evidence selection persist.
13. Confirm no automatic AI call/retry/save/approval, live test inference, source mutation, 0L, UI-1, Studio, Context Routing, or Security milestone work occurred.

One non-blocking result was retained rather than “fixed”: a provider proposal may be rejected by existing safety, path, or size validation. This is expected protection. A future UX improvement may expose a safe allowlisted rejection category, but must not weaken validation or reveal raw provider content.

### UI-1 Brand / Design System Foundation — completed

The user-driven UI-1 visual pass completed successfully. It confirmed the shared palette and hierarchy, readable wide/compact shell behavior, selected navigation, consistent controls and semantic states, and unchanged Feature Contract and Reality workflows. Two focused findings remain deferred: Game Wiki is vertically dense with large derived-summary cards, and Unity's correct bounded/truncated coverage language is developer-oriented.

1. Launch the built desktop application and confirm the pre-project surface uses the SVG FM lockup, descriptor, orange/white/deep-dark palette, and no rasterized concept board.
2. Open one representative project at a wide desktop size. Confirm project identity, navigation labels/icons, selected state, page eyebrow/title/explanation, and milestone pill remain readable without changing routes.
3. Navigate through Overview, Game Wiki, Decisions, Alignment, Feature Contracts, Repository, Unity, AI Behavior Designer, and AI Evaluation; confirm every destination still opens and the selected navigation state follows it.
4. Inspect primary, secondary, tertiary, danger, disabled, loading, and compact icon actions where present. Confirm each is visibly interactive, disabled/loading meaning is clear, and keyboard focus is visible.
5. Inspect DRAFT, APPROVED, PENDING REVIEW, SUPERSEDED/DEPRECATED, Alignment, verified Reality, conflict/error, and AI proposal labels where available. Confirm text remains present and meaning is not conveyed by color alone.
6. Inspect Feature Contracts with empty, populated DRAFT, AI Proposal, approved brief, and archived lifecycle states. Confirm the UI-1 styling does not change source trace, apply/save/approve, copy, lifecycle, or Wiki return behavior.
7. Refresh Repository and Unity evidence. Confirm the line refresh icon, running label/spinner, disabled state, success/warning/error presentation, and local action feedback remain clear.
8. Resize across wide, below approximately `980px`, and below approximately `680px`. Confirm the shell reflows intentionally, navigation stays usable, project/page context remains visible, and representative workbenches stack instead of squeezing prose into unreadable columns.
9. Confirm orange is reserved for brand, primary action, and selected emphasis; success/warning/danger/AI states retain semantic colors; all-caps text is limited to compact labels/metadata; contrast remains readable.
10. Confirm the production SVG mark/wordmark/lockup remain crisp at their product sizes, UI-2 is not present, and no Studios, Rebaseline, CR, SEC, or 0L implementation was introduced.

The production-brand follow-up is headless-validated. One short visual check remains appropriate for the new artwork: inspect the pre-project lockup and compact sidebar at wide, approximately `980px`, and approximately `680px`; confirm the mark is recognizable, the wordmark is not clipped, Planned badges are unambiguous, and the Overview project-name eyebrow is absent. This is asset-level review and does not reopen UI-1 or start UI-2.

Automated evidence for the follow-up: focused App/design-system tests passed (**24 tests**); `npm run check` passed (**212 frontend tests**); `npm run build` passed; `npm run tauri build -- --no-bundle` passed; all three SVGs parsed as XML with a `viewBox` and no embedded raster, `<text>`, or external font content; Markdown file-link checks and `git diff --check` passed. No live AI or GUI automation was used.

### UI-2 Workspace Home — completed

The user-driven visual and persistence check passed with no live provider call:

1. Launch with no project open.
2. Inspect Workspace Home at the exact default `1180 × 760` window size.
3. Inspect the Home fullscreen.
4. Inspect it at the minimum supported `760 × 560` window size and confirm normal vertical scrolling where needed.
5. Verify the compact ForgeMind branding and welcome hierarchy without any modified logo geometry.
6. Verify **Start New Project** reaches the existing directory-selection and explicit initialization flow without creating files merely by visiting Home.
7. Verify **Open Existing Project** reaches the existing directory-selection flow.
8. Open a recent local validation-project card and confirm it uses the normal workspace inspection path.
9. Return to Home or relaunch, open another project, and verify most-recent ordering and deduplication.
10. Verify the neutral grid/cube fallback artwork does not imply project content.
11. Verify Recommended Next Steps contains only the honest open-project message and no fabricated recommendation.
12. Verify long project names/paths do not clip the layout and no viewport has a horizontal scrollbar.

This PASS closes UI-2. The later Home-navigation polish retains its own short manual checklist in the implementation report.

### NPC-1 New Project Creator Foundation — manual PASS recorded

No provider credential or live inference is required:

1. From Home, choose **Start New Project** and confirm no directory picker opens yet.
2. Complete **Identity** with a working title and optional identity fields.
3. Complete the natural-language **Pitch**.
4. Enter or intentionally leave incomplete **Player Experience**.
5. Enter or intentionally leave incomplete **Core Loop**.
6. Complete **World & Tone**, including inspirations and what the game should not feel like where useful.
7. Add, edit, and remove **Design Pillars**.
8. Complete or intentionally leave gaps in **Practical Constraints**.
9. Inspect **Your Game Foundation** and confirm missing optional areas appear only as deterministic Open Questions.
10. Edit an earlier section and return to Review with all other answers preserved.
11. Choose a fresh local directory from **Create Project** and confirm inspection alone creates nothing.
12. Choose **Initialize Project**.
13. Confirm the normal Project Overview opens with the working title as project identity.
14. Confirm Game Wiki / Compendium contains the reviewed foundation and Open Questions.
15. Confirm no fabricated or `APPROVED` Decision exists.
16. Return Home, reopen the project through Recent Projects, and confirm normal project navigation.
17. Restart ForgeMind, reopen the project, and confirm Project identity and Compendium knowledge persist.
18. Inspect the Creator at the default `1180 × 760` window, fullscreen, and the minimum `760 × 560` window; confirm normal vertical scrolling, no horizontal scrolling, and reachable navigation.
19. Start another draft, cancel it, and confirm no project files or unrelated-project knowledge are created.

**PASS recorded 2026-09-27.** The user confirmed required-field validation, draft preservation, editable Review, explicit initialization, correct project identity, Creator foundation Compendium entries, Recent Projects/reopen behavior, and accepted Creator layout. The two non-blocking copy findings for Design Pillars and Major Constraints are assigned to NPC-2.

### NPC-2 / NPC-2.1 / NPC-2.2 AI-assisted New Project Creator — manual PASS recorded

Five successful user-observed Nebius Token Factory / `nvidia/nemotron-3-super-120b-a12b` calls and one user-visible structured-output failure were recorded on 2026-09-27. These are raw observations, not benchmark results:

- `NEW_PROJECT_CORE_LOOP`: `2,500 ms`, `388` input, `262` output, `650` total tokens, structured result PASS, three proposals; one proposal was applied and manually edited.
- `NEW_PROJECT_CORE_LOOP` regeneration: `2,037 ms`, `417` input, `295` output, `712` total tokens, structured result PASS, two proposals; accepted content remained intact and the regenerated set was discarded.
- `NEW_PROJECT_DESIGN_PILLARS`: `3,314 ms`, `428` input, `304` output, `732` total tokens, structured result PASS, five proposals; individual Accept and Apply All worked while the manual pillar remained intact.
- `NEW_PROJECT_CORE_LOOP`: `2,900 ms`, `434` input, `425` output, `859` total tokens, structured result PASS, three useful proposals; preflight worked, accepted content remained editable, and regeneration did not overwrite it. The proposals introduced multiple mechanics not established by Creator context, including reconnaissance drones, explicit crew roles, medkits/ammo/power cells, fixed pressure meters, crew morale, and specific extraction prompts, without surfacing corresponding assumptions.
- `NEW_PROJECT_CORE_LOOP`: `2,853 ms`, `491` input, `407` output, `898` total tokens, provider success but structured result FAIL with `INVALID_CREATOR_AI_OUTPUT`; no proposal was applied, the draft remained intact, and the user could continue manually. The application-local usage log also contains one immediately preceding same-session structured failure at `2,727 ms / 491 / 384 / 875`; it is usage-only evidence and is not treated as a separately characterized human evaluation.
- `NEW_PROJECT_CORE_LOOP`: `3,348 ms`, `533` input, `371` output, `904` total tokens, structured result PASS, two proposals; grounding/normalization succeeded, unsupported or new mechanics were surfaced separately as assumptions, and no invalid structured-output error occurred.

The five successful proposal sets were relevant, concise, and useful. Earlier proposals sometimes introduced plausible mechanics without labeling them; the final recheck surfaced unsupported or new mechanics separately as assumptions. The earlier provider response was safely rejected by strict Creator validation. Raw response text is intentionally absent from the usage log, so the exact structural mismatch is **UNVERIFIED**; confirmed evidence establishes only provider success followed by schema failure. Do not calculate an acceptance percentage, universal score, reliability rate, or model winner from this sample. SUB-1 remains incomplete.

The broader NPC-2.1 checklist and the final NPC-2.2 grounding, normalization, Identity, and Pillar-alignment checks passed manually. NPC-2 is closed. Any future provider request requires a separate explicit purpose and authorization; do not include credentials, private dogfood-project content, filesystem paths, or another project's data.

1. At the Identity step, inspect Working Title, Genre/Subgenre, Mode, Perspective, and Target Platform at desktop width. Confirm all five single-line inputs have the same height and their top edges align; enter values, navigate forward/back, and confirm the values remain unchanged.
2. At Design Pillars on desktop, confirm each title label and explanation label begin on the same vertical line, both controls align from the top, the AI-assisted badge remains secondary, and Remove aligns cleanly with the controls. Confirm the title is still single-line and the explanation multiline.
3. At the minimum supported window, confirm each Pillar row stacks cleanly with no horizontal scrollbar; edit and remove manual and AI-assisted pillars to confirm behavior is unchanged.
4. Make one explicit, public-safe Core Loop request. Confirm one confirmation produces one request; supported harmless wrapping or optional-assumption variation normalizes; and specific mechanics absent from the supplied draft are either generalized or listed beneath the proposal as assumptions. Confirm a proposal with no assumptions shows no `No assumptions` claim.
5. If applying a proposal that has assumptions, confirm only proposal content enters the editable Creator draft and no assumption is promoted into Compendium, Decisions, Open Questions, or other project truth.

**PASS recorded 2026-09-27.** The five-item checklist above passed, including one-confirmation/one-request behavior, grounded assumption separation, valid structured output, unchanged human authority, and responsive form alignment.

## Known-workspace development

When desktop rendering needs inspection but the picker is irrelevant, a debug build can open a known path directly:

```powershell
$env:FORGEMIND_TEST_WORKSPACE = "D:\Games\Example"
npm run tauri dev
Remove-Item Env:FORGEMIND_TEST_WORKSPACE
```

This is a development/test-only bootstrap. It invokes the normal `inspect_workspace` command and the normal React workspace-state transition; it does not implement a second workspace loader. Release builds ignore the variable. An uninitialized path remains uninitialized and still requires the normal explicit initialization action.

## Headless live provider smoke

After offline tests and builds pass, a contributor may explicitly run:

```powershell
npm --silent run ai:smoke -- --model <model-id>
```

The native `ai-smoke` binary constructs the fixed request and calls the same registered-and-metered production evaluation service as the desktop UI. It reads `NEBIUS_API_KEY` from the same process environment as the desktop adapter. It performs exactly one request, has no retry or loop, uses temperature `0`, requests `minimal` reasoning effort, and limits combined visible and reasoning output to 256 tokens through `max_completion_tokens`. It never prints the credential or authorization headers.

With npm's `--silent` flag, standard output is one JSON object. A successful shape is:

```json
{"success":true,"model":"provider/model","text":"ForgeMind smoke test passed.","latencyMs":250,"inputTokens":12,"outputTokens":7,"totalTokens":19,"finishReason":"stop","providerRequestId":"request-123","errorCode":null,"errorMessage":null,"diagnostics":null}
```

Provider-omitted usage values remain `null`. Failures return `success: false`, a nonzero exit code, and allowlisted diagnostics only: HTTP status, response object type, finish reason, response-shape presence flags, reported reasoning-token count, provider request ID, and provider error code/type. Provider error messages and response content are not echoed. Automated tests and ordinary development commands never run this live smoke.

Desktop and smoke usage metadata is stored locally in ForgeMind's application-data JSONL file and can be summarized headlessly. The store is application-global; project grouping uses only the portable ForgeMind project ID. The game-project directory is not used for usage history.

The provider uses the non-streaming OpenAI-compatible `POST /v1/chat/completions` contract. Successful answer text must be either the documented assistant `message.content` string or the documented `message.refusal` string. A null or empty content value is not silently replaced with model reasoning. Model-specific `reasoning_content` is recorded only as a presence flag, and array/object content is rejected because it is not part of the documented non-streaming Chat Completions output shape. A `finish_reason` of `length` without readable text is reported as `OUTPUT_TRUNCATED`.

## Build validation

```powershell
npm run build
npm run tauri build -- --no-bundle
```

The first command validates the production frontend bundle. The second compiles the release-mode native application without requiring installer packaging.

## Final manual smoke

Manual desktop interaction is reserved for milestone closure or changes that genuinely cross a GUI-only boundary:

- launch the built application;
- open one representative workspace and inspect its Overview;
- verify one representative AI result is rendered correctly;
- exercise the native directory picker when it changed, or once before milestone closure.

Routine tests should use temporary workspace fixtures or `FORGEMIND_TEST_WORKSPACE`, not Windows Explorer automation. ForgeMind does not depend on Playwright, Selenium, desktop-control frameworks, or another end-to-end GUI suite.

### 0E user-driven live checklist — completed

After all offline checks pass and the user chooses to spend provider tokens:

1. Launch ForgeMind with `NEBIUS_API_KEY` available to the native process.
2. Open a disposable initialized test workspace and select **Project Interview**.
3. Start the interview and answer two or three questions.
4. Confirm each request occurs only after **Next** and that follow-up questions are concise and relevant.
5. Generate review; verify provenance and proposed status are visible.
6. Edit and approve one candidate, discard another, then save.
7. Close or reopen the workspace and confirm only the approved candidate persisted.
8. If replacing existing interview knowledge, confirm the explicit replacement warning appears.

This smoke is manual and user-driven. Automated validation must not invoke a live model.

### 0F user-driven persistence checklist — completed

No API credential or live inference is required:

1. Open an initialized workspace containing saved approved Project Interview knowledge.
2. Open **Game Design** and choose **Import Saved Interview Knowledge**.
3. Confirm imported entries show status, provenance, and `project_interview` source; repeat import and confirm no duplicate appears.
4. Edit one entry and create one manual entry.
5. Promote one entry to Decisions, enter rationale, save it as `PROPOSED`, then explicitly approve it.
6. Create a replacement for the approved Decision, add rationale, save, and approve it.
7. Confirm the predecessor remains visible as `SUPERSEDED` and the successor is `APPROVED`.
8. Restart ForgeMind, reopen the workspace, and confirm Compendium and Decisions persisted.

Keep this manual check under a few minutes. Do not use desktop automation or a live model.

### 0F.1 visual smoke — completed

1. Open **Game Design** and confirm knowledge entries use compact rows.
2. Expand one entry and confirm the full statement remains readable.
3. Edit one entry and confirm the editor stays inside that row; Save should not jump to the page top.
4. Open **Decisions** and confirm proposed, approved, superseded, and deprecated labels are visually distinct while their text remains visible.
5. Restart ForgeMind and confirm the existing 0F Compendium and Decisions still load unchanged.

Manual validation passed: compact rows, conditional expand/collapse for longer content, anchored inline editing, clear status visuals, and unchanged persistence were confirmed. Automated coverage continues to own functional regression validation.

### 0G user-driven live specialist validation — completed

One explicit production request passed using AI Behavior Designer, task `REACTION_MODEL`, and model `deepseek-ai/DeepSeek-V4.1-Flash`. The selected context covered raid tone, tactical decision emphasis, risk-reward resource tension, enemy difficulty philosophy, and the approved replacement difficulty-philosophy Decision. The scenario was:

> A regular guard hears a single gunshot from the east but has no visual confirmation of the shooter. One allied guard is nearby.

The result respected uncertainty, avoided omniscience, separated assumptions from project facts, produced actionable coordination behavior, identified useful exploits, proposed deterministic tests, and respected the supplied difficulty philosophy. It was considered useful for real game-development work and correctly remained transient.

Measured evidence:

- latency: `16846 ms`
- input tokens: `729`
- output tokens: `1443`
- total tokens: `2172`
- estimated cost: `Unavailable`

The unavailable estimate was displayed honestly because configured pricing was unavailable. This live check remained user-driven; routine validation still requires no GUI automation or live provider request.

### 0G.1 output-budget regression

A real post-validation `COMPETENCE_TIERS` request exhausted the original 1,600-token specialist completion allowance before returning readable output. The focused native regression test now asserts a bounded 2,400-token request while `minimal` reasoning, temperature `0.2`, strict structured validation, unchanged list limits, safe truncation failure, and no automatic retry remain in force. Automated hotfix validation makes no live request.

### 0G.2 structured-output reliability regression

Offline specialist fixtures cover canonical JSON, surrounding whitespace, one JSON code fence, deterministic extraction from brief wrapper text, malformed JSON, multiple objects, non-object JSON, missing summary, omitted optional lists, the two explicit snake-case aliases, wrong list types, deterministic bounded-list normalization, unknown fields, hidden-reasoning rejection, and diagnostics that exclude raw response text. A partial response with finish reason `length` remains `OUTPUT_TRUNCATED`; no automatic retry occurs.

### 0G.3 production-hardening regression

Native fixtures assert the exact bounded task budgets (`3000`, `3200`, `3400`, or `3800`), unchanged minimal reasoning and temperature, concise schema prompt, deterministic area guidance, selected-only context, and safe versioned history. History round trips cover normalized success, safe failure categories/diagnostics, selected references, scenario, usage, malformed JSON, and unsupported versions; serialized files are checked for raw provider data, hidden reasoning, credentials, authorization data, and absolute workspace paths.

Frontend coverage exercises the two-pane/stackable structure, accessible running status, duplicate blocking, form preservation, successful and failed result panes, history reload and selection, non-authoritative labeling, task-guided Area grouping, optional context, approved-only collapsible Decisions, selected count, and selected-only Context Used. These are headless component tests with mocked native boundaries.

One short manual smoke remains appropriate because CSS layout and real desktop interaction are visual concerns: open AI Behavior Designer at wide and narrow window sizes, confirm the panes/stack and spinner are readable, run one user-authorized analysis if desired, reopen the workspace, and restore it from Analysis History. Do not make a live request merely to validate automated behavior.

### 0G.4 Reaction Model reliability and context UX regression

Native tests assert all six centrally defined task budgets, including 4,600 for `REACTION_MODEL` and 5,200 for `BEHAVIOR_CONTRACT`. They also verify that prepared requests use the selected task budget, that the compact reaction-model state/rule instructions are present, that the canonical seven-field schema remains unchanged, and that an incomplete response with finish reason `length` remains `OUTPUT_TRUNCATED`.

Frontend component tests verify the explicit 40/60 pane structure, non-collapsible **More project context** heading, eleven individually collapsible existing Area groups, entry counts, selected counts/open state, editable recommendations, and non-duplicated recommended entries. All provider/native boundaries remain mocked; no live inference occurs.

### 0G.5 Specialist workbench recovery regression

The production regression came from two coupled defects: ForgeMind serialized failed-run diagnostics without empty lists but required those lists when reading the same format-version `1` file, and one frontend `Promise.all` made that history rejection discard valid profile/model/context results. Compatibility fixtures now load the known omitted-list shape without changing the format version.

Frontend tests reject history loading while independently resolving profiles, registry models, Compendium, and Decisions. They verify that all six profile tasks and configured models remain selectable, context remains present, Run Analysis remains enabled, the warning is confined to History, recovery requires confirmation, and successful recovery clears the warning. Valid history coverage remains unchanged and all provider calls are mocked.

Native tests cover valid, malformed, unsupported, and backward-compatible history; registry/profile independence; empty reset; archive-and-reset isolation; unchanged Project/Compendium/Decision/Interview files; and recovery responses that contain no archived contents, credentials, or absolute paths. No generic best-effort repair or automatic deletion exists.
