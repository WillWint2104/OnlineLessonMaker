# Resolution of the five failures

The earlier thirteen-gate claim is now traced to PR #153 comment 5593866497:
https://github.com/WillWint2104/OnlineLessonMaker/pull/153#issuecomment-5593866497
It dates from 9 September and names validate, notes-examples, workbook, type-interaction,
responsive-shell, figure-render, figure-container, label-placement, geometry-semantics,
measure-surface, learning-card, response-store and corpus-identity. None of the five failing
scripts below was included. It was not a claim that these five passed at 2189477.
The later PR description at 2189477 also lists mathematical gates rather than these five.

Both base 2189477 and shared-player 0c3a8e1 reproduced the original failures on the same Windows
installation (Node 24.14.1, Playwright 1.61.0). Their paired signatures are retained in the original
Git history and `logs/baseline-*.log`; `baseline-results.json` is a historical record, not current status.
The following corrections retain the original behavioral coverage rather than exempting failures.

| Gate | Original stop on both revisions | Diagnosis | Correction and retained assertion |
| --- | --- | --- | --- |
| media: click `#slide .hero` | 30 s timeout | Test assumed the pre-#89 seeded lesson. Once seeded explicitly, its focus pad was below the viewport and its synchronous Blob stub missed asynchronous publication. | Supply explicit cover/image/external fixtures; derive their indexes; scroll the pad into view; inspect an actual HTML download. Fit, focus, drag, image embedding and export cleanup still asserted. |
| newtypes: focus trigger | null reading focus | Microhistory intentionally replaced the shared reading overlay with its per-question focus modal; it also has dedicated paragraph/criteria classes. | Select each theme's actual controls; keep dialog semantics, focus transfer, Escape/return, attempted-answer gating, persistence, readonly and criteria checks. |
| pack-fixes: quiz reveal | null reading click | **Application defect:** the Microhistory paragraph-scaffold fork interpreted quiz content as an empty extended response and discarded all question content. | Route quiz mode through the existing shared quiz renderer. Assert every authored question appears in order, as well as attempt-gated reveal and accessibility. |
| theme-pack: Continue.disabled | null reading disabled | Duplicate in-slide footers were intentionally removed in Phase 2. Other stale expectations assumed sample images were empty and the old Microhistory text layout. A document-wide selector also matched palette thumbnails. | Exercise actual Present click-advance: blocked before attempt and after wrong answer, enabled after correct answer; assert feedback. Explicit blank-image fixture retains placeholder coverage; supplied-image checks remain in pack-fixes. Scope legacy isolation to the lesson surface and check the current reading panel. |
| infographic: hover `.ig-bar` in XSS fixture | 30 s timeout | The new page inherited the default pack theme, so the fixture never selected the legacy tooltip renderer being secured. | Explicitly select Wellbeing, as the normal infographic fixture does. Verify the malicious label is escaped and its handler does not execute. |

The quiz repair changes exactly two of 250 corpus render units: slide 1 of imperium-questions and
microhistory-questions when rendered as Microhistory. Both formerly rendered the same empty
609-character scaffold. They now render all three authored questions (5233 and 5188 characters).
`tests/corpus-transitions.json` pins complete before/after SHA-256 hashes for those two units only.
Every unit is still compared; no lesson/theme is skipped; an unrelated change or any further change
to either repaired page fails. Other 248 units remain byte-identical. No visual baseline regenerated.

The previously deferred CodeRabbit CI finding is also addressed under the user's explicit corrective-work
authorization: the three named workflows now trigger on themselves and npm manifests; the corpus workflow
also watches the pinned transitions, and mathematics CI runs the shared-player check. No hosting,
branch-protection, permissions or auto-merge settings changed.

## Imported-identity navigation regression

A focused real-UI check then found that skill ID `__proto__` passed import validation but selecting
the next activity returned to the first activity: the plain-object navigation store could not retain
that key. Activity lessons now reject reserved Object.prototype keys for skills, activities and
questions before import/publication, and require a non-empty string lesson ID. Two additional player
assertions exercise a reserved skill ID and a reserved question ID; the walkthrough now has 63 checks.
