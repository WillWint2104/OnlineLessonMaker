# Worked-example collections — implementation review

This review concerns the approved shared table, not the earlier separate-card prototype. The implementation adds an opt-in `solutionLayout: "paired-table"` to the existing example object and `exampleCollections` to skills. Existing activity, example, question and response IDs remain intact. The classroom data uses two collections of three existing examples.

The table has mirrored authored row numbers, one Working/Explanation header and a restrained divider. It uses 21px mathematical working and 18px black explanations. It stacks by actual solution width below 850px; ordinary equations can wrap at whitespace without shrinking. A compact conclusion follows the expansion check. Supporting search remains optional.

`exampleCollections` contains `{id, title, members}`; members are stable example IDs, each owned by a single-example activity. A collection is inserted at its first member's position; its members follow authored collection order. Other activities retain their order. A missing imported reference is retained in JSON and omitted from the live collection; duplicate membership or ambiguous example identity is rejected. The editor adds, includes, reorders and removes examples through these references. One member hides redundant tab chrome. Sidebars, tabs and Back/Next share the same ordered list.

Optional detail is an additive `example.support` object with title, introduction and the existing ordered `steps` vocabulary. Step visual parts use the existing table/figure/prose formats. `selectedRow` highlights a zero-based candidate row. The existing example editor exposes working/explanations/conclusion, optional method rows and candidate tables. Imported unknown fields are preserved by editing the original objects in place.

The modal traps focus, blocks background lesson navigation and returns to its live opener. Arrow navigation outside the modal remains available. The signed-pair report and the learner's questions never share response data.

The alternate EB Garamond italic candidate is NOT shipped. The existing embedded math face, source characters and superscript settings are unchanged. The prior actual-font comparison remains a separate unapproved proposal; legacy negative/multi-digit exponent and subscript limitations are not silently treated as fixed.

## Evidence

Open [the review gallery](index.html), [the classroom learner HTML](../../../lessons/factorising-quadratics.html), or [the editable classroom JSON](../../../lessons/factorising-quadratics/lesson.json). To edit, open [Lesson Studio](../../../lesson-studio.html), choose Edit → JSON, paste the classroom JSON and Load JSON. Select a worked example and its rows in the outline; collection and optional method controls appear in the inspector. Export JSON preserves editability; Export produces learner HTML. Local files work directly; a local static server is also supported. No remote-video offline claim is made.

The [acceptance record](evidence/results.json) contains 79 passing checks and the exact app/lesson hashes. [Zoom measurements](evidence/zoom/results.json) confirm native DPR 1/2 with unchanged CSS zoom, 21px/18px roles and no overflow. [Content verification](evidence/content-results.json) independently checks all six worked examples, candidate searches, practice and rectangle quantities. The deliberately [edited round-trip fixture](evidence/edited-lesson.json) is test evidence, not the canonical classroom lesson.

The [35-gate full-suite results](evidence/full-suite-7cf9aa2/results.json) and [source/hash record](evidence/full-suite-7cf9aa2/run-info.json) cover implementation commit `7cf9aa2`. Two subsequent compatibility fixes preserve evidence when a question is empty and reorder visible neighbours across missing imported collection references. Both have explicit checks in the 79-check acceptance run. Exact final-head CI/review and post-merge deployment receipts are recorded on PR #159; this historical full-suite receipt is not relabelled as a later commit.

The acceptance script captures all six examples at 1536×960, 1024×768 and 390×844, including their conclusions. It verifies styles, candidate table highlighting, arrow-key isolation, focus return, tab semantics, one/three/five examples, paired-row editing/reordering, collection deletion, JSON save/reopen/edit and real learner export. Separate native browser zoom checks use Chromium profile zoom, not CSS scaling. Computed measurements and original-resolution images accompany the final review.

The old `docs/lessons/factorising-quadratics/production/` directory records PR #158 and is historical evidence. The new review belongs here; old captures are not relabelled as current. The current classroom HTML is regenerated through the application Export action.

The before/after typography crops compare actual rendered variable/exponent fragments. Chromium identifies `LatinModernMath-Regular` as the loaded custom face in both. Computed italic still permits synthesis. The role size changes from 19.5px to 21px, while superscripts retain the existing proportional size and vertical alignment. This confirms the current pipeline, not a claim that synthesis alone explains visual spacing or that a font repair has been approved.

Teacher video URLs/playback, tablet question-reference and source-verified Australian/potential US curriculum alignment remain later work. No new renderer, persistence layer or curriculum database is introduced.
