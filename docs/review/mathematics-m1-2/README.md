# Mathematics M1.2 — accepted final design

Structure at 910af58 and supplied artwork placements are visually accepted. Overview, Outcomes and Completion crops remain authored per image; no Algebra focal settings become a global Mathematics default. The only final polish removes the redundant skill-count line on single-skill Completion. Production expanding lesson HTML is regenerated through the validated exporter, retaining all 63 questions per lesson and supplied original artwork. Open artwork/index.html for the accepted composition captures and use lessons/expanding-*.html for production lesson entry points.

Final full exact-head verification uses 49 gates including artwork; its records identify the tested implementation commit, application hash and clean tracked source before/after. Generated full/current metadata is supplied in the final delivery artifact, while older records are explicitly under historical/. CodeRabbit review/fixes, exact-head CI, clean squash merge and GitHub Pages/live verification are authorised. Supabase remains prepared, not deployed or verified live; M2/M3 remain stopped until M1.2 deployment is confirmed clean.

## Accepted structural baseline (historical detail)

# Mathematics M1.2 — structural correction review

This branch extends verified main `44017f836bfc3d72ace895c84f082c22c7f27fc9`.
It is not merged or deployed. The approved author-supplied Algebra artwork
has not yet been identified. Overview, Outcomes and Completion captures
currently demonstrate the missing-image fallback, not approved image acceptance.

Open `index.html` for actual application captures and the two generated learner
HTML files in this directory. Those files use the branch's application and
63-question content; the existing production HTML remains unchanged until the
acceptance material is complete. Import the corresponding
`../../../lessons/expanding-two-binomials/lesson.json` or
`../../../lessons/expanding-binomial-trinomial/lesson.json` into
`../../../lesson-studio.html` to edit the lesson.

Each real lesson has three archetypes, each with 12 Foundation and 9 Moderate
questions. Pathways are internal tabs. The negative binomial Foundation and
positive trinomial Foundation each begin with four repeated multipart
scaffolds, followed by eight independent expressions. Existing question IDs,
worked models and teacher video URLs are retained. The complete key is
`../../lessons/expanding/TEXTBOOK_ANSWERS.md`.

## Authored question presentation

`presentation` is optional: `compact`, `multipart` or `extended`. The renderer
owns responsive spans; authors do not enter CSS or pixel widths. Existing
`layout: auto|compact|wide|full` remains readable for older files. Without
either field, parts infer Multipart and table/image/figure infer Extended.
Long stems or lengthy subparts can occupy the whole row. The optional text
`group` labels contiguous authored runs; neither groups nor presentation
reorders questions. Multipart uses half-width only with at least 1000px of actual practice width, and otherwise fills the row. An orphaned final half-width item automatically spans its row. Short subparts use two columns only when their own question has at least 500px available; long or explicitly stacked parts remain vertical. Compact uses three/two/one columns according to the actual practice width, including with the Edit inspector open. Final and worked
answers both use two desktop columns; Extended and long working lines span
both. Each authored working newline remains one line with horizontal scrolling when needed; mobile maths remains 20px. Practice and answers restart numbering within the selected pathway.

The existing question inspector edits stem, individual subparts, duplicate,
move, archetype, pathway, final answer, worked answer and teacher note. It now
adds semantic Presentation and optional Section/group. Parts remain the
existing parts array; imported objects and their IDs remain retained. Subpart text uses a compact ordered editor with move, delete and duplicate controls; no second question model has been introduced.

The Answer Hub defaults to the current practice/pathway, or the most recently
visited practice/pathway at Lesson Complete. Practice, Pathway and Question
selectors narrow both answer tabs; All practice is explicit. Individual question
selection uses stable IDs rather than ambiguous shared numbers. The learner rail
omits the empty single-skill heading; authoring and multi-skill structure remain.
Wide practice pages put pathway tabs and compact answer access on one toolbar.

Completion integrates its heading, message, indicators and authored image into
one hero, with separate text and artwork regions for contrast. What you practised,
Answer Hub, Review lesson and an authored next lesson follow it. The frame is
implemented; final artwork acceptance is still pending.

## Authored images

The three fixed roles reuse the existing fields: the Overview and Outcomes
entries in `meta.frontMatter[].image`, and `meta.completion.image`. Images
retain `src`, `alt`, `fit` (`cover` or `contain`) and `focus: {x,y}` (0–1),
using the shared media helpers, upload embedding and publication path.
Choose/replace, URL, alt, crop, focal position and remove are available in
the lesson-page inspector. No automatic subject selection, generated art,
decorative CSS composition or duplicate asset store is added. Only the
previously rejected generated decorations were removed from these lessons.

## Policies and limitations

M1.1's independent final/worked policies and private-payload omission remain.
End of lesson is local pacing, not security; its static answers are included.
Teacher release with hidden fallback omits private answer fields from the
student export; teacher notes are always omitted. An allowed full solution
necessarily reveals the final answer. Public review keys and author JSON are
teacher reference material, not protected student delivery.

Supabase remains prepared and **not deployed**, with no expansion in this
milestone. YouTube playback remains external and uncertified. Local policies
work from disk; remote assets and any configured live service require network
access. No new recording was made. M2/M3 and other subject work remain stopped.

`results.json` records focused checks, application SHA-256 and captures. Stress
captures explicitly use fixtures (28 questions, mixed presentation, optional
Advanced and extended working); they do not add enrichment to the real lessons.

The earlier checkpoint records in `regression-summary.json` distinguish the full 45-gate run and corrected
fixture reruns from the six follow-up gates after the completion-width fix.
Original logs are retained under `verification/full`, `verification/corrected`
and `verification/completion`. `content-identity.json` records preservation of
all 36 prior questions per lesson and content-generator idempotence. The
`media-fixture` captures use the existing repository sample image solely to
check image controls and large containers; that sample is not approved Algebra
artwork and is not used in either classroom lesson. Sample-only Outcomes and
Completion captures now cover desktop and tablet. Actual approved-asset upload,
three-slot final renders and visual acceptance remain pending the supplied files.

## Inspection feedback correction pass

The current correction increases the two lessons to 126 questions total. All
original question IDs, expressions, answers, worked lines, models, policies and
video URLs are retained; mathematical equivalence is checked again after additions.
`correction-regression.json` records this pass separately from the earlier checkpoint
logs. No merge, deployment or CodeRabbit request is made before the approved-asset
acceptance step. Supabase is not live-tested against a real project.

The correction pass has 31 focused checks and 74 fresh captures, with zero page
errors. The initial full 45-gate run passed 43 gates and exposed a removed part
selection hook and a dialog-close test race. Both were corrected; the final nine
affected gates pass at the final application hash. `correction-regression.json`
preserves all three runs and their distinct hashes; this is not a claim that all
45 gates ran again on that final hash. The exact-head final regression/review step
remains after supplied-artwork acceptance. `reviewed-content-identity.json` also
confirms that all 60 reviewed questions per lesson retain their mathematical
content and IDs, alongside the idempotent generator.

## Final structural pass

The Answer Hub is a bounded 86vw / 1320px surface with a 90dvh height. Only its answer body scrolls; header, tabs, selectors and Close remain accessible. Native modal focus and background scroll locking preserve the lesson. Worked solutions start expanded, with optional Collapse all / Expand all. Final answers have denser row padding and no accordions. Authored equation lines never wrap; real glyph measurements promote long working to a whole row before line-local scrolling is needed. The grid responds to available answer-body width.

Practice uses natural, compact answer-access copy. Reopening the hub on the same lesson context retains filters and answer-body position; a new practice/pathway context receives its own current defaults. The four-part editor and mathematical content remain unchanged.

`structure-*.png` show the new dedicated top/middle/bottom, dense finals, long stress fixture (explicitly altered only for layout testing), mobile, tablet and inspector captures. The existing `*-native-200.png` files use native Chromium zoom; image-fixture captures use the labelled repository sample only. These are development captures of the same application bytes; `results.json` and `structural-results.json` record their provenance. Earlier correction receipts remain historical.

The delivery ZIP adds `EXACT-HEAD-VERIFICATION.json` and `verification/exact-head/` from the full sequential suite after committing this source. That run must show clean tracked source, unchanged commit and application hash before/after, and every gate green. Existing untracked review-delivery and scratchpad directories are preserved. No source or artwork changes are made after that test run. No merge, deployment or CodeRabbit request is part of this pass. Supabase remains prepared, not deployed and not tested against a live project. Approved artwork is the next pass; M2/M3 remain stopped.
