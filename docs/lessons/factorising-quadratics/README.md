# Factorising quadratics — classroom lesson

[Open the learner lesson](../../../lessons/factorising-quadratics.html) · [Final editable JSON](../../../lessons/factorising-quadratics/lesson.json) · [Teacher answers](TEACHER-ANSWERS.md)

Two discrete skills use the PR #157 mathematics player. Each has notes, three fully worked examples, a guided-completion task, independent practice and one optional-video activity. Students use their exercise books; paper response mode is the default. There are twelve visible instructional activities while both video URLs are empty.

The monic skill covers positive pairs, two negative numbers and opposite signs. The non-monic skill develops the ac search, splitting and grouping, including negative common factors. Each independent set includes signed quadratics, a greatest-common-factor check, error analysis and a rectangle problem. The teacher answer guide is separate from the learner data.

## Edit or add the teacher videos

Open the [authoring application](../../../lesson-studio.html), switch to Edit, open its JSON panel, paste the contents of the final editable JSON and choose Load JSON. Select the required activity, example, step, note or question to edit its fields. JSON saves an editable lesson; Export publishes learner HTML.

Each skill already contains an actual optional-video activity at the end of its authoring sequence. Enter the teacher's URL in **Optional skill video URL** for that skill when available. Empty URLs omit these activities from the learner sequence while preserving them in the editable JSON. No URLs, timings or transcripts have been invented. Teacher-video playback remains unverified; check the supplied URLs on the classroom network before using them. The tablet question-reference enhancement remains deferred.

## What was authored where

The initial two-skill structure, notes, six worked examples, candidate tables and practice questions were prepared in supported JSON. [production-input.json](production-input.json) retains that preparation input, not the final teaching version.

Through the connected controls, both optional-video activities were added and named; the introductory comparison step and its table were moved before selected-pair verification; the table heading, mathematical working and explanation were edited. The lesson was previewed, JSON was downloaded, and that file was reopened in a fresh browser session. The monic completion instruction was then refined through its question-part field before final JSON export and learner publication. [Production results](production/results.json) record the checks and captures; [the first JSON export](production/first-export.json) records the state before the final wording edit.

The final introductory sequence is **generate candidates → compare sums → verify the selected pair → factorise → expand to check**. Guided tables explicitly supply the candidate pairs and ask for the missing sums. Independent practice has no answer panels or embedded teacher key.

## Screenshots and checks

- [Introductory search and table](production/screenshots/1536/02-monic-positive-1.png) and [factorisation/check](production/screenshots/1536/02-monic-positive-2.png).
- [Longest negative-middle-term derivation](production/screenshots/1536/09-nonmonic-negative-2.png).
- [Monic guided completion](production/screenshots/1536/05-monic-completion-1.png).
- [Non-monic guided completion on tablet](production/screenshots/1024/11-nonmonic-completion-1.png) and [its ending](production/screenshots/1024/11-nonmonic-completion-2.png).
- [Monic practice ending](production/screenshots/390/monic-practice-end.png) and [non-monic practice ending](production/screenshots/390/nonmonic-practice-end.png) on a narrow screen.
- [Video activity controls](production/authoring/video-skill-1.png), [working/explanation fields](production/authoring/working-and-explanation.png) and [editing after reopening](production/authoring/reopened-completion.png).

The production run traverses every learner activity at desktop, tablet and narrow widths, scrolls each to its end, checks paper mode, responsive pairing and missing-video behaviour, then reaches lesson end. Original-resolution captures cover the complete desktop/tablet scroll sequence. [Content checks](production/content-results.json) independently check candidate arithmetic, transformations, practice factors and the rectangle quantities; they supplement reading the actual explanations.

The shared application, CSS proportions and historical review fixtures remain unchanged. Short working can still sit relatively far from its annotation on a wide screen. That optional refinement is retained for later; this lesson also needs room for long non-monic derivations and uses the accepted baseline.

Run `node scripts/verify-factorising-content.mjs` and `node scripts/produce-factorising-lesson.mjs` for content and canonical lesson/export checks. `--produce` explicitly rebuilds the final files from the preparation input through UI actions, assigning fresh IDs to the newly added video activities. It is not needed to open or edit the final lesson. Final exact-head review, CI and deployment receipts are recorded in the lesson's PR. A merge is not teacher visual approval.
