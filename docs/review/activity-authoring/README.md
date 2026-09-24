# Connected activity authoring

Baseline: merged PR #155, `9497f911535fbd4d71142a5f1e0e245e3413d27d`. The white shared surfaces and responsive workbook remain in place. This pass removes duplicate single-example titles, keeps a supporting-table answer in the reasoning column, fixes singular skill text and the neutral paper fallback, and sets published document titles from lesson metadata. Explicit practice instructions remain authoritative.

The named `OnlineLessonMaker_Visual_Review_9497f91.md` was not supplied in this checkout or attachments. The four explicit corrections in the user's complete pasted brief were used. No general redesign was undertaken.

## Open and reproduce

- Open [the UI-authored learner lesson](workflow/published-authored-lesson.html) directly. It contains inline runtime, fonts and lesson data and was opened in a fresh offline browser context.
- To continue authoring, open the current `lesson-studio.html`, choose Edit > JSON, load [the final lesson JSON](workflow/authored-lesson-final.json), then select a skill/activity and its content in the inspector. This is the file-reopen step; the original lesson was built from blank through visible controls.
- [Review index](index.html): matched presentation captures, indexed authoring screenshots and the recorded builder walkthrough.
- [Current coverage](AUTHORING_COVERAGE.md): visible operations and explicit remaining boundaries.

`verify-activity-authoring.mjs` creates two skills from a blank document, authors notes, multistep examples, practice/subparts, tables and optional-video slots; performs structural edits; previews; downloads JSON; reopens in a fresh context; edits a nested step/table again; then publishes and opens the learner HTML offline. The end-to-end construction, reopen and publication use clicks and field entry; evaluation reads the resulting data. A separately labelled defensive unit test inserts an invalid null note to exercise the inspector guard (normal JSON validation rejects it); this is not UI-authoring evidence. Secondary imported fixtures exercise qualitative source text, mixed physics, graph/domain/pen controls, legacy row/point/segment representations and richer untouched fields.

The optional-video handling tests use a public-format test URL with remote requests blocked, then clear it. The final authored file retains two empty optional slots. No teacher URL or provider playback is claimed.

## Evidence and verification

`before/` contains unchanged captures from the verified #155 baseline. `presentation/` uses the same fixtures, viewport sizes and scroll interactions. `workflow/` records the new authoring route and its learner result. `workflow/results.json` records the tested app hash and source provenance. Implementation captures may identify an uncommitted working copy; final commit/run receipts are reported separately in the delivery.

Run one pipeline at a time:

```powershell
$env:PLAYER_REVIEW_DIR='review-delivery/activity-final-<commit>'
$env:CORPUS_REF='9497f911535fbd4d71142a5f1e0e245e3413d27d'
node scripts/verify-player-suite.mjs
```

The suite now has 27 gates, including the new activity-authoring route and the older mathematics editor gates. The corpus reference is explicit and recorded; historical counts are not substituted for this comparison. No assertion or unrelated baseline was relaxed.

To record the builder independently, set `AUTHORING_RECORD=1` and run `node scripts/verify-activity-authoring.mjs`. It produces an actual WebM recording and indexed screenshots; the recording covers initial construction and JSON export, while the screenshots also cover reopening and publication. `AUTHORING_OUT` selects a separate output directory. `AUTHORING_MUTANT=missing-skill` or `binding` serves an isolated deliberately broken copy and must fail the new gate. These are negative controls, not evidence of successful graphical authoring.

## Deferred

Retaining a question reference while writing in a stacked tablet workbook remains a separate UX backlog item. Existing Questions/Workbook controls, sizing and zoom behaviour are retained. Teacher video URLs and school-network playback checks remain outstanding. Unsupported figure engine families and unknown imported fields remain preserved, with their authoring limits stated in the coverage table.
