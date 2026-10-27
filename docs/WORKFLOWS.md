# Workflows

## Status legend

- **MVP** — required for the hackathon vertical slice; 0J and 0K are complete
- **Complete optional** — the bounded 0G AI Behavior Designer profile and user-driven live validation are complete
- **Stretch** — optional after the required MVP works end to end
- **Future** — post-hackathon direction

## Product loop

The current core product loop is Intent -> Reality -> Alignment -> Feature Contract -> Implementation Brief. External coding-agent execution, tests / Reality refresh, and later Alignment review can continue that loop, but they remain outside ForgeMind's autonomous control. AI Specialists can support planning, impact analysis, test design, decomposition, and review, but they do not replace the Project Brain or approve truth. 0J implements manual Alignment review, and 0K implements the reviewed Feature Contract workbench plus implementation-brief handoff. Automatic refresh and future post-0K behavior remain unimplemented.

AI may propose, compare, analyze, and explain. People remain authoritative, and temporary conversation becomes durable project knowledge only through explicit review and save actions.

The bounded AI Behavior Designer workflow is implemented as optional 0G work and does not expand the required MVP. Additional specialist review and content-production workflows remain [future direction](AI_SPECIALISTS_AND_PRODUCTION.md).

Future external-provider workflows should share the security sequence defined in [Security and Privacy Architecture](SECURITY_AND_PRIVACY.md): explicit task -> Context Plan -> Context Assembly -> Security Preflight -> optional exact Context Preview -> native Provider Adapter. Context Builder decides relevance; Security Preflight decides whether the assembled outbound package is safe and appropriate to send. SEC-0 documents that boundary only; current workflows and Feature Contract behavior are unchanged.

## 0. Analyze behavior with a specialist profile — Complete optional 0G

1. The user opens **AI Behavior Designer** and selects one supported task type and an enabled registry model.
2. ForgeMind groups current Compendium entries by their existing Area and surfaces deterministic task-specific area recommendations. The user chooses any relevant entries, may override all guidance, and may send no project references. Approved Decisions use a compact selector; ForgeMind never sends the entire Project Brain automatically.
3. The user enters a bounded scenario or question and explicitly chooses **Run Analysis**. The two-pane workbench keeps configuration visible while a readable activity state reports elapsed waiting time and blocks duplicate execution.
4. Native code resolves only the selected references, builds the centralized game-agnostic prompt, and makes exactly one metered provider request.
5. ForgeMind validates and presents the structured proposal: summary, assumptions, recommendations, risks, likely exploits, open questions, and suggested tests.
6. Assumptions remain visibly separate from project facts. The result is scenario reasoning, not simulation evidence.
7. ForgeMind appends the normalized result—or safe failed-run metadata—to `.forgemind/specialist-runs.json`. Compact history can restore prior output, but it is explicitly non-authoritative and never creates Compendium entries or Decisions.
8. If history cannot be loaded, the rest of the workbench remains usable. The History panel shows the safe category and offers an explicit, confirmed archive-and-reset action for invalid data; startup never discards it automatically.
9. The task's preferred completion budget is clamped only by an explicitly known registry maximum. The user may open **Advanced Run Settings** and choose one validated run budget; unknown model limits remain labeled Unknown.
10. `OUTPUT_TRUNCATED` presents budget-aware next actions and may expose an explicit higher-budget retry only when safe known headroom exists. `INVALID_REQUEST` names a rejected parameter only when safe provider metadata supplies it. Neither path retries automatically.

## 1. Create a game project through an AI interview — MVP (supporting onboarding)

1. The user opens a valid local ForgeMind workspace and explicitly starts Project Interview with a configured registry model.
2. ForgeMind starts with a deterministic Project Identity question. Each submitted answer may trigger one explicit, metered AI turn that returns one concise next question plus validated structured candidates.
3. The prompt uses the current question, answer, section, and at most eight compact known statements rather than full conversation history.
4. The user opens Candidate Review, where every proposal shows area, title, statement, proposed status, and provenance. The user may edit, approve, or discard each candidate.
5. Pending and discarded candidates are not saved. Only approved candidates are written to `.forgemind/interview.json`; conversation and provider response text remain transient.
6. Existing approved interview knowledge can be reopened. Starting a replacement requires explicit confirmation, and saving without that confirmation cannot overwrite the existing file.

Result: a small approved onboarding result that can prepare 0F, not a generated game or full Compendium.

### 1A. Import approved interview knowledge into the Compendium — MVP

1. The user opens Game Design and explicitly chooses **Import Saved Interview Knowledge**.
2. ForgeMind reads the already validated `.forgemind/interview.json` through the native boundary.
3. Approved candidates become Compendium entries with mapped sections and preserved status/provenance; the interview file remains unchanged.
4. An exact title-plus-statement match is skipped, making repeated import deterministic and duplicate-safe.
5. Manual entries and later edits remain explicit native persistence actions.

### 1B. Start a new project through the guided Creator — NPC-1 and NPC-2 complete

1. The user chooses **Start New Project** and begins with a rough idea rather than a large setup form.
2. Eight short accessible steps cover Identity, Pitch, Player Experience, Core Loop, World / Tone, Design Pillars, Practical Constraints, and **Your Game Foundation** review. Core Loop and Design Pillars each offer one optional, explicit AI proposal action; entering or navigating a step never invokes AI.
3. Back/Continue and review-section editing preserve an app-memory draft. Visiting, navigating, cancelling, or failing initialization does not write partial truth into any project.
4. Review shows Vision, Player Experience, Core Loop, Pillars, World / Tone, Constraints, and deterministic Open Questions derived only from fields the user left unfinished.
5. **Create Project** opens the directory picker only after review. ForgeMind inspects the selected directory, refuses to overwrite an existing workspace or orphaned Compendium data, and requires a separate **Initialize Project** confirmation.
6. The existing native initialization boundary creates `.forgemind/project.json` and one format-version `1` `.forgemind/compendium.json`. User-authored answers use `USER_STATED` provenance; explicitly accepted AI-assisted Core Loop and pillar content uses `AI_INFERRED`; both retain `new_project_creator` source. Missing-field questions use `TBD` / `UNRESOLVED`. No Decision file is created.
7. The new project opens through the normal Project Overview path and enters Recent Projects. Existing-project onboarding is unchanged.

The complete interaction, authority, and phased implementation contract is in [New Project Creator and Recommended Next Steps](NEW_PROJECT_CREATOR.md). The complete manual path uses no AI. NPC-2 Core Loop and Design Pillar assistance is complete after headless and manual live-AI validation. NEXT-1 deterministic recommendations are implemented separately and do not call the provider.

### 1C. Review deterministic Recommended Next Steps — NEXT-1 implemented

1. With a current loaded project, the user returns to Workspace Home without reopening that project.
2. ForgeMind reads the existing Compendium, Decisions, Alignment, and Feature Contract documents and combines them with Repository and Unity results already inspected during the current application session. It does not refresh Reality automatically.
3. A pure local rule layer emits a fixed-order, bounded list from current supported signals. Multiple missing Game Vision, Core Loop, Player Experience, or Design Pillar fields collapse into one **Complete Game Foundation** recommendation whose reason and source trace retain the individual gaps.
4. Game Design exposes Design Pillars as a first-class section over the same Creator/Compendium `game_vision` entries. Add, edit, and deprecate remain normal Compendium operations; there is no pillar truth store or migration.
5. Reality begins uninspected. Explicit inspection establishes connected, not connected, partial evidence, or error. A not-connected result becomes **Connect Repository** or **Connect Unity Project**; selecting a detached source always uses the native folder picker and never scans arbitrary folders automatically.
6. Repository/Unity selections are project-scoped machine-local settings outside portable `.forgemind` truth. Change or Disconnect updates only that setting; inspection remains read-only and never mutates the selected source project.
7. Home shows at most three recommendations with title, area, priority, and a plain-language reason. Structured source signals remain available to the derived model but are not exposed as debug internals.
8. The user may navigate to an existing owning workflow. Navigation alone creates no Decision, task, contract, Reality refresh, approval, or project-data mutation.
9. Opening another project replaces the current recommendation input; returning Home recomputes rather than reusing another project's list. With no current project, Home retains the honest open-project message. With no supported issue, it says no urgent next steps were detected.

Recommendations are derived advisory view state, never persisted Project truth. NEXT-1 makes zero AI/provider calls. NEXT-2 optional AI refinement, automatic actions, a task store, the general Router, and autonomous production remain unimplemented.

### 1D. Review the current project control room — UI-3 implemented

1. Opening or creating a project lands on **Project Overview**; Workspace Home remains the application-level launcher and Recent Projects surface.
2. Overview reads existing Compendium, Decisions, Alignment, and Feature Contract documents, then combines them with Repository and Unity results already known in the current session. It does not call AI, inspect Reality, rebuild Alignment, or write project truth on render.
3. The concise project header may use current Game Vision as a descriptor. It never promotes filesystem paths, project IDs, format versions, or debug metadata into the dashboard.
4. **Recommended Next Steps** calls the same deterministic NEXT-1 engine and shows up to five existing-workflow actions. Home retains its compact top-three view.
5. **Project Signals** groups Foundation, Decisions, and Compendium-backed Open Questions under Intent; Repository and Unity under Reality; and actionable Alignment plus Feature Contracts under Alignment/delivery. Each state is an explainable count or connection/evidence label, never an aggregate score.
6. Dashboard actions only navigate. The destination continues to own every inspection, edit, approval, refresh, contract, and persistence action.

Recent Activity remains deferred because existing domain timestamps do not form one consistent cross-domain event contract. UI-3 does not create a competing event log or reinterpret record updates as project activity.

### 1C.1 Build shared AI work context and review a proposal — AIW-0 complete

1. A future owning surface creates a project-scoped session with explicit surface, purpose, profile, and title. AIW-0 itself adds no Writers' Room or Chronicler page.
2. The surface requests a bounded Context Plan from explicit Compendium, approved Decision, Open Question, project-relative Markdown, or same-project prior-assistant-message references.
3. Native code revalidates the active Project ID, resolves only those references, orders explicit sources first and supporting sources by authority, and returns content plus compact authority-aware source trace.
4. Visible user and assistant turns may be appended to bounded local work history. A turn may reference a canonical usage record; no raw provider request, response, or hidden reasoning is stored.
5. A future flow may create a pending proposal. Knowledge-edit proposals preserve target, current/proposed content, reason, source trace, and known affected references.
6. A human accepts, rejects, or discards the proposal. Acceptance alone changes only proposal review state.
7. If a separate owning-domain command later succeeds, the caller may mark the proposal applied. The target domain still owns validation, lifecycle, provenance, and approval.

The authority flow is **conversation -> AI proposal -> human review -> explicit owning-domain action -> authoritative ForgeMind store**. Conversation history and proposal state are non-authoritative. WR-1 Writers' Room now uses this flow; CHR-1 Chronicler Read and CHR-2 Chronicler Edit Proposals remain unimplemented.

### 1C.2 Develop narrative in Writers' Room — WR-1.3 implemented, headless validated

1. Open **AI Studio -> Writers' Room** and create a project-scoped session with Lore Architect, Character & Dialogue, or Continuity Editor.
2. Optionally add up to five Markdown files through the native picker. ForgeMind stores only project-relative references and treats their content as `DOCUMENTED`, not Canon.
3. Optionally choose **Research web**. ForgeMind prefills an editable query from the composer when available, shows Tavily Basic Search and the five-source maximum, and makes zero request on Cancel. One **Search with Tavily** confirmation makes exactly one native Tavily request with no automatic retry. Review the returned `EXTERNAL_RESEARCH` cards, deselect irrelevant sources, or clear the snapshot locally.
4. Enter a message or explicitly regenerate the latest turn. ForgeMind prepares a bounded deterministic Context Plan from relevant Compendium knowledge, approved narrative Decisions, unresolved Open Questions, selected Markdown, explicitly selected Tavily sources, and a recent same-session window. Technical/Reality/delivery sources remain excluded by default.
5. Review credit-aware preflight. Project Brain counts remain distinct from **External research: N Tavily sources**; the UI separately names **External research provider: Tavily** and **Nemotron provider: Nebius Token Factory**.
6. Confirm once to make exactly one Token Factory request. The strict stabilized response remains `message`, up to three focused strings in `questions`, supplied-only `sourceRefs`, and bounded `proposals`. Selected web snippets are framed as untrusted reference evidence, never project truth or instructions.
7. Inspect **Sources used** with visibly separate `EXTERNAL RESEARCH · TAVILY` provenance. Invalid output, invented source references, Tavily/Nemotron failure, timeout, or missing context leaves project truth unchanged.
8. For a proposal, choose **Review & edit** or **Discard proposal**. Title, proposed content, and reason may be edited before acceptance; accepted-but-unapplied proposals may also be edited. Cancel changes nothing, and saved edits remain non-authoritative session state.
9. Choose **Apply** only after review. The current reviewed text routes to Compendium or Decisions through the owning API. Project Knowledge and Open Questions retain AI-assisted provenance; Decisions remain `PROPOSED` until separately approved. External authority is never transferred into the owning store. The next request rebuilds context from Project Brain, so newly applied knowledge is immediately eligible as established context.
10. Archive a session when it is no longer active. Reopening preserves messages, profile, Markdown, the bounded research snapshot, source trace, and proposal status as non-authoritative work history.

TAV-1 does not add cloud sync, collaboration, background agents, semantic/vector retrieval, Tavily Crawl/Extract/answer generation, autonomous or multi-query research, Knowledge Import/Rebaseline, Git/Unity/Feature Contract context by default, Wiki Chronicler, Narrative Designer, or a general Router.

### 1D. Open an existing project — Future

1. ForgeMind detects Git and Unity through their narrow read-only boundaries.
2. It imports available documentation and collects supported GroundTruth and repository evidence.
3. It interviews only missing or uncertain Intent, then builds Wiki views over authoritative sources.
4. It surfaces undocumented systems, unknowns, and potential conflicts for review.

Every imported claim remains labeled `VERIFIED FROM REALITY`, `DOCUMENTED`, `AI INFERRED`, or `UNRESOLVED`. AI inference never becomes approved truth automatically.

If an existing ForgeMind workspace was also used as a prototype or feature-validation sandbox, use the future [Rebaseline Existing Project](PROJECT_REBASELINE.md) workflow. It adds explicit classification, non-destructive cleanup review, selective preservation, focused missing-Intent questions, and fresh derived Wiki/Alignment baselines without merging source domains or rewriting history. The new- and existing-project paths converge on the same Project Brain and Suite model described in [New Project Creator and Recommended Next Steps](NEW_PROJECT_CREATOR.md). Rebaseline remains planned only.

## 2. Discuss design and save a durable decision — MVP

1. The user chooses a topic and relevant context.
2. ForgeMind retrieves applicable knowledge, current decisions, constraints, and related systems.
3. User and assistant explore alternatives in temporary conversation.
4. ForgeMind drafts a Decision with statement, rationale, author, date, status, affected areas, relationships, and approval state.
5. Only the reviewed selection is saved as durable knowledge; rejected discussion stays out of the repository.

In 0F this workflow is implemented without requiring AI conversation: users may create a proposed Decision manually or promote a Compendium entry, add rationale, and then approve it separately. A proposed successor references one approved predecessor; approving the successor marks the predecessor `SUPERSEDED` without deleting it.

## 3. Discuss narrative and detect a canon conflict — MVP (bounded), Stretch (proactive)

1. The user proposes a character, event, location, or setting rule.
2. ForgeMind compares it with retrieved canon and narrative decisions.
3. A contradiction is shown with both claims, provenance, and affected systems or quests.
4. The user revises the proposal, records an unresolved `CONFLICT`, or approves an explicit retcon that supersedes earlier canon.

The MVP checks selected structured context. Broad proactive scanning is a stretch goal.

## 4. Propose a change that conflicts with a LOCKED decision — MVP

1. The user proposes a change to existing Intent.
2. ForgeMind finds a contradictory current `LOCKED` Decision and explains the conflict using source references.
3. It identifies affected areas, Systems, assumptions, and known Reality evidence.
4. The user chooses to keep the current decision, save a separate proposal, or approve a superseding Decision.
5. ForgeMind preserves the old decision and links the approved successor.
6. If Reality still reflects the old behavior, ForgeMind records an out-of-sync AlignmentFinding rather than implying the change is implemented.

## 4A. Browse project knowledge — UI-4 implemented, manual validation pending

1. The user opens **Game Wiki**. React loads the existing Compendium, Decisions, successful Specialist History, Alignment results, and Feature Contracts independently; an unavailable source does not hide available knowledge.
2. ForgeMind projects All Knowledge, Design Pillars, Decisions, established Compendium Areas, and Open Questions without writing a Wiki document. Current entries appear before unresolved/proposed material; deprecated and superseded records remain available through the Historical lifecycle filter.
3. The user searches human-readable title/content/category/source/authority/lifecycle text and combines category, type, authority/provenance, and lifecycle filters. Search is local, case-insensitive, deterministic, and non-semantic.
4. Selecting a compact result shows its full content, authority/provenance, source/owner, lifecycle, and trustworthy source timestamps without displaying internal IDs, paths, or format versions.
5. Knowledge and Open Questions route to the exact Compendium entry in Game Design. Decisions and Specialist analysis route to the closest stable owning workspace because those owners currently expose no exact-item deep link. Alignment and Feature Contract summaries retain their existing owner routes.
6. Repository and Unity summaries use only results already inspected during the active session. Opening or searching Wiki performs no Reality scan, Alignment rebuild, provider request, approval, resolution, or source mutation.

Result: Game Wiki is a read-only knowledge browser. Compendium, Decisions, Open Questions, and other established domains remain authoritative; there is no `wiki.json`.

## 5. Inspect Repository Reality — Implemented 0H, manual validation pending

1. The user opens **Repository** for an initialized ForgeMind workspace.
2. Native code validates the workspace and runs fixed, read-only Git inspection commands against the containing repository. The frontend cannot provide commands or arguments.
3. ForgeMind shows repository detection, branch or detached HEAD, HEAD identity, clean/dirty state, repository-relative file changes, staged/unstaged state, tracked diff statistics, and at most 10 recent commits.
4. The user may expand a changed file for metadata or explicitly refresh the transient snapshot. Full source diffs and every Git write or network action remain unavailable.
5. Game Wiki may show the small Repository Reality summary under Technical or Production without copying changed-file lists into project knowledge.
6. Git-unavailable, non-repository, and inspection-failure states leave every other workspace area usable.

Result: current repository state is visible as Implementation Evidence. It is not design Intent, an Alignment conclusion, or proof that a feature is implemented.

## 5A. Review team changes — Future

1. A contributor receives repository changes through the Git boundary.
2. ForgeMind summarizes changed knowledge, decisions, contracts, snapshots, and alignment findings without replacing the underlying diff.
3. It highlights changed statuses, superseded decisions, conflicts, and affected systems.
4. Review and approval remain part of the team's Git workflow.

The 0H snapshot supplies basic local change metadata only. Hosted review, detailed permissions, Git write workflows, and real-time collaboration are future scope.

## 6. Export and inspect Unity GroundTruth — Complete 0I

1. The user invokes **Tools > ForgeMind > Export GroundTruth** from the separate editor-only Unity package.
2. The exporter writes the versioned `.forgemind/unity-groundtruth.json` manifest with supported facts, source identity, timestamp, category coverage, and safe issues; it does not save or modify Unity content.
3. ForgeMind validates the project-owned manifest through its narrow native boundary and exposes only normalized, bounded summaries.
4. The UI shows observed evidence, omissions, staleness, and partial coverage without treating Unity as the owner of design Intent. A category capped at 10,000 records is shown as `10,000+ / partial coverage`, not as an exact total or a correctness failure.

## 7. Ask a grounded technical question — MVP

1. The user asks about architecture or implementation.
2. ForgeMind gathers relevant technical Intent, decisions, repository evidence, and the latest applicable snapshot.
3. The answer separately labels documented Intent, verified evidence, AI inference, conflicts, and unknowns.
4. It cites sources and warns when evidence is stale or scanner coverage is insufficient.

## 8. Create and review an Intent / Reality Alignment — Complete through 0J.5

1. The user selects one current non-deprecated Compendium entry or `APPROVED` Decision as Intent. Proposed, superseded, and deprecated Decisions are unavailable as authoritative Decision Intent.
2. The user searches or filters grouped current Git Reality and validated Unity GroundTruth evidence, selects relevant items, and explicitly marks each selected item `SUPPORTS`, `CONTRADICTS`, or `INSUFFICIENT`. A deterministic keyword match may surface visibly unverified Suggested evidence, but never selects it. A distinct approved Decision may optionally be identified as conflicting Intent.
3. Native deterministic rules create `ALIGNED` only when every selected item explicitly supports Intent, `UNVERIFIED` when evidence is insufficient, `OUT_OF_SYNC` when evidence explicitly contradicts, or `CONFLICT` for the selected approved-Intent conflict. `UNVERIFIED` and `CONFLICT` use low confidence.
4. The result records the Intent statement/status, captured evidence summaries and times, rationale, explicit uncertainty or an explicit **No additional uncertainty** statement, provenance, and `PENDING_REVIEW` state in `.forgemind/alignment.json`.
5. The user approves or rejects the result. Either outcome remains historical and never rewrites Compendium, Decisions, Git Reality, or Unity GroundTruth.
6. Game Wiki may show a compact status/review summary in the Intent Area, but all Alignment creation and review stays in the Alignment workspace.

For the public-safe synthetic perception scenario, observed component presence alone cannot prove the intended runtime uncertainty rule, so the honest result is `UNVERIFIED`. 0J uses no live AI. Automatic whole-project scans, background monitoring, code semantic analysis, RAG, and task creation remain later work.

## 9. Create and approve a Feature Contract — Complete through 0K.3

1. The user selects an approved Alignment Review, current non-deprecated Compendium entry, or `APPROVED` Decision. Approved Alignment is listed first because it already binds Intent to reviewed Reality evidence; selection remains manual.
2. ForgeMind creates a `DRAFT` and pre-fills only captured facts: the Intent title/statement, approved Alignment status/rationale when present, and selected safe Reality evidence summaries. Direct Intent sources explicitly state that current Reality is not established.
3. The user may edit the draft title and writes the goal, affected systems, required behavior, out of scope, risks, acceptance criteria, deterministic tests, implementation notes, and selects likely affected references only from captured Reality evidence.
4. The user may explicitly invoke **Draft with AI** with a selected registered model. ForgeMind sends one metered request containing captured Intent, approved Alignment, captured Reality evidence, and current human fields. The returned sections are visibly non-authoritative and remain separate until the user applies all empty sections or one reviewed section; no call occurs on load, no retry is automatic, and nothing is saved or approved.
5. **Save Draft** preserves incomplete reviewed work for later. A draft may be deleted only after explicit confirmation; approved and historical states cannot be hard-deleted.
6. The user explicitly approves a complete draft. `APPROVED`, `SUPERSEDED`, and `DEPRECATED` remain durable lifecycle states; none performs code changes.
7. Preview and Copy use the same deterministic Implementation Brief formatter matching `docs/templates/IMPLEMENTATION_BRIEF.md`. The brief includes no location unless current captured Reality evidence supports it.
8. Game Wiki shows only a compact read-only Area summary, routes editing to Feature Contracts, and offers a contextual return to Wiki without generic browser history.

For a public-safe synthetic perception scenario, an approved `UNVERIFIED` or `OUT_OF_SYNC` review can seed a bounded knowledge-handling contract. AI may propose implementation details, tests, acceptance criteria, and exclusions from that captured context, but a human must choose what to apply, save, and approve. Approval creates a durable delivery artifact; it does not authorize or perform implementation.

## 10. Re-verify alignment after implementation changes — Manual current flow; automation is Stretch

1. After implementation changes outside ForgeMind, the user exports a newer Unity GroundTruth manifest and/or refreshes Git Reality.
2. Existing Alignment reviews retain their captured historical evidence; ForgeMind does not rewrite them against the new snapshot automatically.
3. The user creates a new Alignment review against current evidence and compares its result with the historical review.
4. A human approves or rejects the new result and may update Intent through its owning Compendium or Decision workflow.

Automatic monitoring, test execution, and continuous re-evaluation are stretch or future capabilities.

## 11. Resolve an Open Question — Future

1. The user records a question with its area or topic, author, and `OPEN` status.
2. Evidence, discussion, and specialist analysis may inform the answer without becoming truth automatically.
3. The user marks it `RESOLVED` or `DEFERRED`, records the resolution, and links any resulting Decision.

Open Questions remain lightweight project knowledge, not chat threads or task tickets.

## 12. Hand off implementation — Implemented preview/copy boundary in 0K.2; execution remains external

1. The user approves a Feature Contract and explicitly copies its Implementation Brief.
2. Cursor, Codex, or another coding agent edits the repository and runs compile/test/fix loops.
3. ForgeMind refreshes supported Reality evidence and presents Alignment for human review.
4. Persistent execution tracking remains in GitHub Issues / Projects, Linear, Jira, or another integrated delivery tool rather than a ForgeMind Kanban clone.
