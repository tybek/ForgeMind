# Hackathon MVP

## Goal

Demonstrate one coherent vertical slice: ForgeMind understands existing project Intent, evaluates a proposed change against durable decisions and current Reality, exposes misalignment, and produces a grounded Feature Contract for human approval.

The MVP is deliberately about project understanding and alignment. It is not an autonomous game-building or coding system.

## Required MVP

### 1. Project Compendium / Intent

- Store and present a small set of approved design, narrative, technical, and roadmap knowledge.
- Keep portable, human-readable project knowledge in the local repository.
- Distinguish durable knowledge from temporary AI conversation.
- Show provenance, explicit unknowns, and separate design and implementation statuses.

The 0F implementation provides the portable Compendium and design-status portion of this capability. Completed Git Reality, Unity GroundTruth, and Alignment workflows now keep implementation evidence and reviewed interpretation separate from that Intent.

### 2. Structured Decisions

- Record a decision's statement, rationale, author, date, status, affected areas, related systems, approval state, and superseded decision when applicable.
- Detect when a proposal contradicts a current `LOCKED` decision.
- Offer reviewable outcomes such as keeping the decision, saving a proposal, or superseding it; never overwrite silently.

The 0F implementation provides manual proposed/approved Decisions, rationale, knowledge links, and history-preserving supersession. Completed 0J Alignment can record a conflict against a distinct approved Decision without changing either source.

### 3. Reality Snapshot

- Import a small, versioned GroundTruthSnapshot from a Unity project through a separate bridge boundary.
- Include source identity, timestamp, coverage, errors, and enough observed facts to support the demo scenario.
- Treat the snapshot as point-in-time evidence, not live state or design authority.

0I is complete: ForgeMind validates and displays the project-owned versioned GroundTruth manifest, the editor package generates it explicitly, and the private dogfood project export plus bounded evidence-backed question passed.

### 4. Alignment Reasoning

- Compare selected Intent claims with verified Reality evidence.
- Identify at least agreement, insufficient evidence, out-of-sync state, and decision conflict without prematurely fixing a permanent enum.
- Distinguish source evidence from AI inference and explain why a finding was produced.
- Preserve the valid transition where newly approved Intent and older Reality temporarily disagree.

0J implements this capability as a manual-first workflow with deterministic `ALIGNED`, `UNVERIFIED`, `OUT_OF_SYNC`, and `CONFLICT` states, explicit uncertainty, portable review history, and no required AI. Alignment and review state remain separate, so an approved `UNVERIFIED` result is valid. Functional dogfooding and the follow-up 0J.5 clarity work are complete.

### 5. Feature Contract

- Combine design intent, relevant narrative context, technical constraints, roadmap scope, decisions, and GroundTruth evidence.
- Produce a reviewable artifact containing a feature summary, design alignment, decision conflicts, dependencies, affected systems, expected code changes, expected Unity scene/configuration changes, acceptance criteria, risks, exclusions, suggested tests, and current alignment state.
- Cite supporting knowledge and snapshot evidence.
- Require human approval; a Feature Contract does not authorize implementation automatically.

0K.1 and 0K.2 implement the reviewed Feature Contract workbench, explicit AI-assisted draft proposals, section-by-section application, draft-only deletion, historical lifecycle states, contextual Game Wiki navigation, and deterministic Implementation Brief preview/copy. AI output cannot silently overwrite human content, unsupported invented paths are rejected, and the source truth remains in Compendium, Decisions, Alignment, and Reality. 0K remains current until the required manual dogfooding validation passes.

## Supporting onboarding: Project Interview

The AI Project Interview asks focused questions and drafts initial Compendium entries, Systems, constraints, and unknowns. The user reviews what becomes durable knowledge. The New Project Creator also offers explicit bounded Core Loop and Design Pillar proposals; these remain transient until accepted and pass through editable Review before initialization. Both flows support the MVP but do not displace the alignment vertical slice or permit automatic truth.

## Required demo flow

1. Show existing project Intent and a current `LOCKED` decision.
2. Let a user propose a conflicting change.
3. Explain the conflict and present its affected systems and evidence.
4. Let the user keep, propose, or approve a superseding decision.
5. Show that Intent changed while the Reality snapshot still reflects old behavior.
6. Produce an evidence-backed out-of-sync finding.
7. Generate and approve a grounded Feature Contract for the required work.
8. Import changed implementation evidence and re-evaluate alignment.

The full flow is the hackathon target, not functionality implemented during 0A.

## Stretch goals

- Unity Doctor findings derived from snapshot evidence
- Broader documentation and implementation drift detection
- Hosted or automated delivery handoff beyond the current deterministic Implementation Brief copy boundary
- GitHub pull-request context and review integration
- Small, inspectable patch proposals
- Running selected tests and attaching their results

## Post-hackathon

- More complete Unity coverage and additional engine adapters
- Richer dependency and impact reasoning across long project histories
- Real-time team collaboration and carefully designed permissions
- Production hardening, distribution, migrations, and administrative capabilities
- Broader integrations with existing planning and development tools

## Explicitly excluded

- a complete IDE or replacement for Unity;
- an autonomous game generator or autonomous coding agent;
- 3D asset, texture, level, or visual-script generation;
- automatic game publishing;
- a replacement for GitHub, Git, Jira, HacknPlan, Ludo, or articy:draft;
- a full Git client or complete task-management system;
- unreviewed code, scene, documentation, or decision changes;
- real-time cloud collaboration, authentication, or advanced permissions;
- production cloud or database infrastructure;
- a hard dependency on Tauri, React, Nebius, Nemotron, or another replaceable technology.

Specialist agent profiles, autonomous multi-agent orchestration, gameplay telemetry analysis, and image, animation, texture, or 3D production integrations are future direction rather than required MVP scope. They must not displace the five required capabilities above.

## MVP completion test

The MVP is complete when the required demo flow works end to end with portable project knowledge, traceable evidence, understandable findings, and human approval at durable decision points. Stretch goals are not part of this test.
