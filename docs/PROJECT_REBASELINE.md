# Rebaseline Existing Project

## Status and purpose

**FUTURE WORKFLOW — PLANNED, NOT IMPLEMENTED.** This workflow is eligible for product work only after the current 0K manual validation closes. It may then be used before or alongside future UI polish for dogfooding, but it does not start 0L, UI-1, or ForgeMind Studios.

Rebaseline Existing Project is a safe re-onboarding workflow for a real game project whose ForgeMind workspace has also been used as a prototype or feature-validation sandbox. Its purpose is to rebuild a trustworthy working baseline from current Reality, separate durable project knowledge from temporary validation artifacts, preserve intentional knowledge and history, and expose important missing Intent without restarting onboarding from zero.

Rebaseline is not a reset. It must not silently delete, overwrite, merge, approve, or reinterpret project-owned knowledge.

## Product principles

1. **Reality first, not Reality only.** Refresh current verifiable evidence before evaluating stored knowledge, while keeping observed implementation separate from intended design.
2. **Authority stays with its source.** Rebaseline coordinates existing domains; it does not create a unified truth store.
3. **Classification is a proposal until confirmed.** Heuristics or AI may help organize review, but a person decides what enters the new active baseline.
4. **No hard deletion by default.** Prefer archival, deprecation, or exclusion from the active baseline while retaining provenance and history.
5. **Rebuild derived views.** The Game Wiki and initial Alignment baseline are projections over reviewed sources and current evidence, not replacement stores.
6. **Ask only what matters.** The missing-Intent interview targets consequential gaps that Reality and documents cannot answer.
7. **Preview before commit.** The user sees the proposed effects by domain and confirms them before any mutable ForgeMind data changes.

## Authority boundaries

| Source | Authority during rebaseline | Allowed treatment |
| --- | --- | --- |
| Compendium | Documented Intent | Keep, review, deprecate, archive, or exclude entries through their owning lifecycle. Do not infer approval from implementation. |
| Decisions | Explicit human decisions | Preserve approval and supersession history. Never rewrite a Decision merely because current Reality differs. |
| Git Reality | Verified repository evidence | Refresh through the read-only Git boundary. Never mutate Git, files, branches, commits, or remotes. |
| Unity GroundTruth | Verified Unity evidence | Refresh from a validated project-owned export. Never change scenes, prefabs, assets, or other Unity content. |
| Alignment | Derived, reviewed interpretation | Preserve historical reviews. Create a new baseline from reviewed Intent and current evidence; do not rewrite old results. |
| Feature Contracts | Derived delivery artifacts | Preserve, archive, or flag for review through their lifecycle. Do not change contract behavior or treat contracts as source Intent. |
| AI specialist output | Non-authoritative analysis | Exclude from project truth unless an individual finding was already explicitly reviewed and promoted through its owning workflow. |

The Game Wiki remains an aggregate view across these sources. Rebaseline must not introduce a `wiki.json` file or copy all domains into a new canonical database.

## Proposed user flow

### 1. Start Rebaseline

The user explicitly starts the workflow and receives a scope and safety explanation. ForgeMind creates a preview session, not an automatic migration. The preview identifies which supported ForgeMind domains are present, their validation state, and whether Reality sources can be refreshed.

Possible future entry points are:

- **Project Settings → Rebaseline Project**
- **Existing Project onboarding → Re-scan / Rebaseline**
- **Overview → Project data may be stale → Rebaseline**

These are product options, not implemented UI commitments.

### 2. Inspect the current workspace

Validate project identity and supported `.forgemind/` files through their existing native boundaries. Summarize current knowledge and derived artifacts by type, lifecycle, provenance, and review state. Invalid or unsupported data must be reported safely and left untouched; it must not be reset as a side effect of starting rebaseline.

### 3. Refresh current Reality

Refresh Git Reality using the fixed read-only inspection boundary. Request or validate a current Unity GroundTruth export and report its timestamp, coverage, omissions, unsupported categories, bounded truncation, and safe issues.

Reality may establish facts such as “this file, scene, component, prefab, ScriptableObject, serialized field, test, or repository change exists.” It cannot establish that the observed behavior is desired, approved, complete, or still intended.

### 4. Inspect existing project documentation

Discover only supported, user-reviewed project documents such as README files, design and technical documents, lore references, roadmaps, and Markdown knowledge. Present candidate documents and scope before import. Do not silently ingest an entire repository or introduce a semantic RAG system.

Each imported claim must retain its document reference and one of these labels:

- `DOCUMENTED` — the source explicitly states the claim as project knowledge or Intent.
- `VERIFIED_FROM_REALITY` — current supported Git or Unity evidence verifies an existence claim.
- `AI_INFERRED` — AI proposed an interpretation that has not been approved as truth.
- `UNRESOLVED` — the available sources are incomplete, ambiguous, or contradictory.

A document can support documented Intent, but its presence alone does not prove that the content is current. AI inference is never auto-approved.

### 5. Classify existing ForgeMind knowledge

Classify each relevant item independently and show its source, lifecycle, provenance, relationships, and supporting or conflicting current evidence. Title similarity may flag candidates for comparison, but it must never decide classification or duplication by itself.

| Classification | Meaning | Proposed active-baseline treatment |
| --- | --- | --- |
| `KEEP` | Trusted, current project knowledge | Include after explicit confirmation. |
| `REVIEW` | Potentially useful but uncertain, stale, or weakly sourced | Exclude until reviewed or include only with a visible unresolved state. |
| `TEST / SANDBOX` | Created primarily to validate ForgeMind rather than describe the project | Exclude by default; offer archive, and allow deletion only under the destructive rules below. |
| `DEPRECATED` | Historically valid but no longer current | Preserve with deprecated status and exclude from current Intent. |
| `DUPLICATE` | The same material is represented more authoritatively elsewhere | Preserve provenance and link to the preferred item; do not decide from title similarity alone. |
| `ARCHIVE` | Worth retaining for history but not active work | Preserve outside the active baseline with its provenance and lifecycle intact. |

Classification should consider exact source content, explicit user markers, provenance, creation purpose, lifecycle, relationships, current documentation, and current Reality. Conflicting evidence should produce `REVIEW` or `UNRESOLVED`, not an automatic winner.

### 6. Review the proposed keep/archive/drop plan

Present an itemized plan grouped by owning domain. In this plan, **drop means exclude from the new active baseline**, not hard-delete. The user may change any classification and must explicitly confirm the final plan.

The preview must distinguish:

- changes to mutable source knowledge;
- lifecycle-only actions such as deprecate or archive;
- derived views that will be rebuilt;
- preserved historical artifacts;
- unresolved items receiving no mutation; and
- explicitly selected disposable test items, if any, proposed for deletion.

No mutation occurs while the plan is being generated or reviewed.

### 7. Apply confirmed non-destructive changes

After confirmation, apply only the reviewed actions through each domain's narrow native boundary. Preserve stable identities, source references, timestamps where semantically required, approval history, supersession links, and provenance. A failure must stop safely and report which actions, if any, completed; future implementation must define transactional or resumable behavior before shipping.

Rebaseline must never change project source files, Git state, or Unity content.

### 8. Rebuild the clean Game Wiki baseline

Recompute the Game Wiki from the confirmed active Compendium knowledge, Decisions, promoted specialist findings, and existing derived summaries. Archived, deprecated, sandbox, and unresolved items remain accessible in their owning history or review surface but do not silently count as current knowledge.

The Wiki rebuild is a projection refresh. It does not create a competing persistence file or erase excluded history.

### 9. Identify and interview for missing Intent

Compare current Reality, accepted documented knowledge, approved Decisions, and unresolved classifications to find important Intent gaps. Ask only focused questions whose answers materially affect design authority, Alignment interpretation, or delivery planning.

For example, Reality may show that an enemy-perception system exists and documentation may state that enemy AI is information-driven, while no authoritative source defines the precision of sound information. ForgeMind may ask one focused question about that rule instead of replaying the full Project Interview.

Interview answers remain proposals until the user reviews and saves them through the appropriate Compendium or Decision workflow.

### 10. Create the initial Alignment baseline

Offer new Alignment reviews that compare confirmed Intent with refreshed current Reality. Use the established deterministic statuses and human review lifecycle: `ALIGNED`, `UNVERIFIED`, `OUT_OF_SYNC`, or `CONFLICT`, with every new result starting `PENDING_REVIEW`.

Historical Alignment remains unchanged. Rebaseline may recommend candidates, but it must not auto-create, auto-approve, or bulk-rewrite reviews.

### 11. Finish with a Rebaseline Summary

The summary is concise, reviewable, and safe to retain. It includes:

- **Reality refreshed:** Git and Unity state, timestamp, and material coverage limits.
- **Knowledge:** counts and short lists for kept, archived, deprecated, and requires-review items.
- **Imported documentation:** accepted/documented and unresolved claims.
- **Open Intent gaps:** count and prioritized list.
- **Initial Alignment:** aligned, unverified, out-of-sync, and conflict counts.
- **Feature Contracts:** preserved, archived, and needs-review counts.
- **Recommended next steps:** three to five explicit actions.

The summary must not expose absolute machine paths, credentials, raw provider content, hidden reasoning, or unsafe raw Unity observations. It records outcomes and unresolved work without becoming a new truth store.

## Safe cleanup and destructive-action rules

The default cleanup tools are archive, mark deprecated, exclude from the active baseline, and retain provenance/history.

Any future hard deletion must satisfy all of the following:

1. The item is disposable ForgeMind-owned test or sandbox data.
2. The user selected the exact item; no inferred group or title match expands the selection.
3. The confirmation names the owning domain and irreversible effect.
4. Referenced or approved history is rejected from hard deletion unless its owning domain already defines a safe lifecycle that explicitly permits it.
5. Source project files, Git Reality, and Unity GroundTruth sources are never deletion targets.
6. The Rebaseline Summary records that deletion occurred without embedding private deleted content.

Cloud backup, automatic backup, and a general migration engine are outside this workflow. A future implementation must define local recovery and partial-failure handling before enabling any destructive option.

## Feature Contract treatment

Rebaseline does not modify Feature Contract behavior. Contracts retain their immutable source trace and existing lifecycle rules.

- Preserve contracts whose source trace remains meaningful.
- Flag a contract `needs review` when its Intent is excluded, deprecated, unresolved, or materially contradicted by refreshed Reality.
- Prefer the existing lifecycle for archival or deprecation; never rewrite an approved contract to match a new baseline.
- Do not generate replacement contracts automatically.
- Do not treat a contract as authoritative evidence of project Intent or implementation.

## Future manual dogfooding scenario

Use **an existing Unity tactical game project previously used for ForgeMind feature validation**. Do not copy private lore, mechanics, paths, names, screenshots, or internal project data into the public ForgeMind repository.

The manual scenario should verify:

1. The workspace and supported domain files are inspected without mutation.
2. Git Reality and Unity GroundTruth refresh through their existing read-only boundaries with coverage limits visible.
3. Temporary validation data is distinguished from real knowledge without title-only classification.
4. The user can selectively keep intentional knowledge and archive or exclude sandbox artifacts.
5. Existing history and provenance survive the confirmed plan.
6. Imported documentation remains source-labeled and AI inference remains unapproved.
7. The missing-Intent interview asks focused questions rather than restarting full onboarding.
8. The Game Wiki reflects only the confirmed active baseline without gaining a new truth store.
9. New Alignment candidates use refreshed evidence while historical reviews stay unchanged.
10. The final summary accurately reports results, gaps, and three to five next actions without private content.

## Explicit non-goals

This plan does not authorize or design implementation details for:

- a migration engine or automatic deletion;
- cloud backup or synchronization;
- Git writes, network operations, or repository mutation;
- Unity scene, prefab, asset, or project mutation;
- a task tracker;
- a full document-ingestion pipeline;
- semantic search, embeddings, or RAG;
- autonomous specialist promotion or AI approval;
- Feature Contract behavior changes;
- 0L, UI-1, or ForgeMind Studios implementation.

## Future implementation prerequisites

Before implementation is authorized, define the versioned preview/plan contract, domain-specific archive semantics, recovery and partial-failure behavior, exact supported document scope, privacy-safe diagnostics, and focused native/frontend tests. Manual validation must remain separate from automated completion, and 0K must first receive its required manual PASS.
