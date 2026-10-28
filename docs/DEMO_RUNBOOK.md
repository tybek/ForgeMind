# ForgeMind DEMO-0 Runbook

This runbook prepares a clean, public-safe recording baseline. It does not close
SUB-3, produce the video, authorize live provider calls, or change product
behavior.

## A. Demo project identity

- **Project:** Hollow Reach
- **Concept:** single-player tactical extraction / survival strategy around a
  damaged geothermal mining settlement
- **Pristine template:**
  [`demo/hollow-reach-template`](../demo/hollow-reach-template/README.md)
- **Knowledge Import source:**
  `docs/combat-direction.md` inside the copied demo workspace
- **Initial truth:** one vision, one core loop, two pillars, one unresolved
  question, no Decisions, and no saved AI or research history

The template deliberately contains no usage history or model registry. AI Models
uses installation-local state and may show only real observations from the
recording machine.

## B. Pre-recording checklist

- [ ] Duplicate the pristine template into a new recording workspace; do not
      edit the committed template.
- [ ] Confirm Nebius Token Factory and Tavily credentials are configured outside
      project files. Never show or paste the keys.
- [ ] Confirm Token Factory is available and Nemotron is enabled with verified
      JSON Object capability.
- [ ] Restart ForgeMind, then use **Open Existing Project** to open only the new
      recording copy.
- [ ] Confirm the project name is **Hollow Reach** and the Wiki shows the sparse
      baseline described above.
- [ ] Confirm there are no old Writers' Room sessions or research snapshots.
- [ ] Close unrelated windows, terminals, notifications, private projects, and
      credential views.
- [ ] Set the final recording resolution and verify the app layout is readable.
- [ ] Run one operator-authorized rehearsal if credits and the recording plan
      allow it; one confirmation means one request and no automatic retry.

## C. Recommended click path

Target a `2:45-2:55` final cut.

1. Start at **Home**, choose **Open Existing Project**, and open the fresh Hollow
   Reach recording copy.
2. Open **Overview** and briefly show the vision, loop, pillars, and unresolved
   question.
3. Open **Game Wiki**, then choose **Import Knowledge**.
4. Select only `docs/combat-direction.md`. In preflight, show Nebius Token
   Factory, the selected Nemotron model, the one project-relative source, and the
   untrusted-data / review-only boundary.
5. If the recording authorizes the live request, choose **Run extraction with
   NVIDIA Nemotron** once. In **Candidate Review Queue**, edit one candidate and
   deselect the speculative geothermal-vent idea if it appears.
6. Choose **Apply Selected**, close the result, and show the new Wiki knowledge,
   proposed Decision, unresolved Open Question, and `DOCUMENTED` source trace.
7. Open **Writers' Room**, create a fresh **Lore Architect** session, enter the
   primary prompt below, and show preflight/context sources before any optional
   request. If authorized, send once and show the source trace and non-authority
   boundary.
8. Optionally choose **Research web**, enter the Tavily query below, review the
   Basic Search disclosure, and run one explicitly authorized search. Select
   only relevant results, then use the synthesis prompt in the normal
   Writers' Room flow.
9. Optionally open **AI Models**. Briefly distinguish the Token Factory catalog
   from ForgeMind's enabled registry, show Nemotron's verified JSON Object
   capability and another available model, and label run/latency values as
   observed installation-local metrics—not quality, price, or verified
   capability.

Git Reality, Unity GroundTruth, and Alignment are optional supporting proof. Do
not displace the review-first Project Brain story with them in a three-minute cut.

## D. Exact demo prompts

Primary Writers' Room prompt:

> What is already established about Hollow Reach, and what is the most important unresolved question we should answer next?

Optional faction-development prompt:

> Help me develop the salvage-rights faction further without contradicting what is already established.

Tavily research query:

> Research examples of tactical games where enemy factions can fight each other independently of the player. Focus on encounter design, emergent conflict, and how the player perceives or discovers those battles.

Follow-up synthesis prompt:

> Compare these external patterns with our current project direction. What fits, what conflicts, and what design question should we resolve next?

These prompts are operator notes, not project truth.

## E. Expected visible results

- Before Import, the Wiki is sparse and understandable: Hollow Reach's vision,
  loop, two pillars, and one unresolved salvage-rights question.
- Import preflight names Nebius Token Factory and the selected structured-output
  model, identifies `docs/combat-direction.md`, and states that no Project Brain
  mutation occurs before review and Apply.
- A successful extraction should offer two or three durable combat facts, one
  explicit Decision, and one Open Question. The `Maybe` paragraph is
  intentionally speculative and should not become durable knowledge
  automatically. Provider output remains subject to review; do not promise exact
  candidate wording or count.
- Apply creates only selected owning-domain records. The Decision remains
  proposed rather than approved, and the Wiki shows project-relative documented
  provenance.
- Writers' Room resolves current Project Brain sources and keeps generated work
  non-authoritative until explicit Review/Edit and Apply.
- Tavily results remain external research. A later Nemotron request performs the
  synthesis; Tavily is not presented as the language model.
- AI Models may show real installation-local catalog and observed metrics. Model
  availability is not presented as verified capability or quality.

## F. Honest failure fallback

Do not retry automatically, insert fake output, or imply a failed request
succeeded.

- **Knowledge Import fails or returns no candidates:** show the explicit terminal
  state briefly if useful, state that no project data changed, and stop making
  requests. Restart from a new pristine copy for another take. For the remainder
  of the current take, skip to the already validated sparse Wiki and Writers'
  Room preflight/context story. A separately recorded clean accepted state may be
  used only if it resulted from a real reviewed run and is described honestly.
- **Writers' Room fails:** show the safe error if useful, then continue with the
  existing Project Brain and source-selection/preflight surfaces. Do not create
  replacement prose in project files for the recording.
- **Tavily fails or returns poor results:** skip External Research and continue
  with Project Brain, Writers' Room, and optional AI Models. Do not claim the
  result quality was better than observed.
- **Catalog refresh fails:** show the existing local registry only, or omit the
  optional AI Models shot. Do not infer capabilities from provider availability.

## G. Reset and re-record procedure

1. Keep `demo/hollow-reach-template` pristine and tracked in source control.
2. Create a new empty destination with a take-specific name outside the source
   checkout, such as `hollow-reach-recording-take-02`.
3. Copy the entire template directory into that destination. Do not copy any
   other `.forgemind` directory and do not merge over an earlier take.
4. Open the new copy through ForgeMind's normal **Open Existing Project** flow.
5. Verify the sparse baseline and empty Writers' Room state before recording.
6. After the take, retain or discard only the disposable copy according to the
   operator's recording policy. Never clean or rewrite the pristine template in
   place.

Application-local model registry and usage observations are intentionally not
reset by copying the project. Treat them as real installation-level evidence or
omit that optional shot.

## Public-safety boundary

The template is synthetic and contains no credentials, absolute machine paths,
private project names, private lore, provider output, screenshots, Unity data,
Git history, or application-local model state. Before publication, repeat the
repository secret/private-identifier checks in
[Hackathon Submission Readiness](HACKATHON_SUBMISSION.md).
