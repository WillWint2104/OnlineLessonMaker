# Mathematics M1.2 — correction review in progress

This branch extends verified main `44017f836bfc3d72ace895c84f082c22c7f27fc9`.
It is not merged or deployed. The approved author-supplied Algebra artwork
has not yet been identified. Overview, Outcomes and Completion captures
currently demonstrate the missing-image fallback, not approved image acceptance.

Open `index.html` for actual application captures and the two generated learner
HTML files in this directory. Those files use the branch's application and
60-question content; the existing production HTML remains unchanged until the
acceptance material is complete. Import the corresponding
`../../../lessons/expanding-two-binomials/lesson.json` or
`../../../lessons/expanding-binomial-trinomial/lesson.json` into
`../../../lesson-studio.html` to edit the lesson.

Each real lesson has three archetypes, each with 12 Foundation and 8 Moderate
questions. Pathways are internal tabs. The negative binomial Foundation and
positive trinomial Foundation each begin with three repeated multipart
scaffolds, followed by nine independent expressions. Existing question IDs,
worked models and teacher video URLs are retained. The complete key is
`../../lessons/expanding/TEXTBOOK_ANSWERS.md`.

## Authored question presentation

`presentation` is optional: `compact`, `multipart` or `extended`. The renderer
owns responsive spans; authors do not enter CSS or pixel widths. Existing
`layout: auto|compact|wide|full` remains readable for older files. Without
either field, parts infer Multipart and table/image/figure infer Extended.
Long stems or lengthy subparts can occupy the whole row. The optional text
`group` labels contiguous authored runs; neither groups nor presentation
reorders questions. Multipart defaults to half-width on wide desktop and
full-width on tablet. Compact uses three/two/one columns. Final and worked
answers both use two desktop columns; Extended and long working lines span
both. All reflow without shrinking mathematics.

The existing question inspector edits stem, individual subparts, duplicate,
move, archetype, pathway, final answer, worked answer and teacher note. It now
adds semantic Presentation and optional Section/group. Parts remain the
existing string array; no second question model has been introduced.

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

`regression-summary.json` distinguishes the full 45-gate run and corrected
fixture reruns from the six follow-up gates after the completion-width fix.
Original logs are retained under `verification/full`, `verification/corrected`
and `verification/completion`. `content-identity.json` records preservation of
all 36 prior questions per lesson and content-generator idempotence. The
`media-fixture` captures use the existing repository sample image solely to
check image controls and large containers; that sample is not approved Algebra
artwork and is not used in either classroom lesson.
