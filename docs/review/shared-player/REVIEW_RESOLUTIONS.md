# Substantive review resolutions

CodeRabbit reviewed the full prerequisite range `e328db0..2fab6d5` on PR #154
(review 5290551199) and continuation `2fab6d5..27f2262` on PR #153
(review 5290541208). The split avoids its 150-file review limit without omitting
implementation files. Neither an old summary nor the CI-thread reply is counted
as coverage. Corrective commits require a subsequent review before merge.

## PR #153: seven findings

- Correct unsupported multi-letter variable markers in both legacy factoring lesson formats.
- Preserve the recap content using the existing notes renderer, instead of shipping a summary stub
  or deleting the teaching content. This is the bounded alternative to the suggested removal.
- Correct the current authoring gate count to 54; retain dated historical changelog counts.
- Reuse seeded examples/steps in the straight-line authoring session, remove the unused final
  example, and reject blank or extra steps before saving. Remove the obsolete rearranging complaint.
- Split multi-example groups without carrying their group-wide introduction. Name each nested section after
  its example; single-example groups retain their group title and introduction. Check the result in
  both desktop and tablet learner views.
  A follow-up caught the non-monic introduction still saying “Three examples” on a one-example activity;
  the outer introduction is now omitted too, with an explicit non-monic desktop/tablet regression check.
- Correct the three-curve capture names and descriptions.
- Start each suite report fresh so a subset invocation cannot inherit stale results.

## PR #154: 24 minor findings

- Correct the non-right triangle's side label and three inaccurate squaring/curve explanations.
- Use optional `CHROMIUM_PATH` in lesson-sheet, space-sheet and phone-typography tools.
- Continue the bounded geometry width search to its minimum; a known fitting minimum is not a
  yielded height ceiling. Report a returned solver error in the phone typography investigation.
- Reject a stacked mockup plane that exceeds its content region.
- Scope symmetry expansion measurements to the visible state and require a positive starting width.
- Navigate screenshot fixtures using their derived practice index and check tick ranges on both axes.
- Emit the media slot's authored anchor; report aspects from visible pattern instances.
- Remove insertion placeholders by walking text nodes, preserving the constructed DOM.
- Update pattern/page captions, resolver descriptions, recorded dimensions and current column spans.
- Fix schema geometry-domain guidance and provide a real image-placement link target.
- Correct the documented slice command.
- Workflow self-path filters were already corrected in `27f2262`; no duplicate change is needed.

These corrections are integrated in the continuation branch. Historical prototype observations remain
historical evidence; corrected current descriptions identify the shipping records they describe.
Browser captures and final test/review receipts accompany the delivered package.

The non-shipping mockup atlas includes an infeasible narrow case: `05-visualcheck-narrow`
offers 382px while its graph's minimum legal ladder entry is 386px. The new guard stops that
build with the exact 4px overflow diagnostic. This is the requested rejection behavior,
verified as a negative case; the atlas run is not reported as a successful rebuild. Its
historical full report remains historical. No application gate is exempted or allowed to fail.
