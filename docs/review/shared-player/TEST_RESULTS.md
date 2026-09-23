# Observed local results — 23 September 2026

Final player walkthrough: **61 assertions passed**, no browser page errors. Actual visible
UI actions covered import, new lesson creation, activity creation/text editing/reordering,
skill reordering, Study/Present, question/workbook switching, JSON download/re-import, HTML
download and fresh-context reopening. JSON and HTML round-trips preserve all authored content
and identities. The resulting exports and screenshots are in this directory.

The regression pipeline ran 25 gates: **20 passed; 5 failed on both this tree and the verified
starting commit**. A separate baseline audit confirmed all five matching failure signatures.
This is not an all-green legacy suite, and no remote CI run is claimed.

| Gate / area | Observed result |
| --- | --- |
| App/lesson validation | Pass; existing storage-scanner warnings remain |
| Shared activity player | 61 assertions pass |
| Existing skill page | Pass |
| Composition grid, Figure container/render | Pass |
| Geometry semantics | 204/204 annotation checks pass |
| Label placement | 927/927 checks pass |
| Learning card | Pass |
| Measurement surfaces | 191 design + 180 safety checks pass |
| Mathematics authoring, quadratics authoring, response store | Pass |
| Notes/worked examples | 145/145 checks pass |
| Responsive shell | 92/92 checks pass |
| Typed interaction | 53/53 checks pass |
| Workbook | 84/84 checks pass |
| Existing standalone lesson, interactive | Pass |
| Corpus identity vs `2189477` | **250/250 render units byte-identical** |

Inherited failures, independently reproduced by `node scripts/verify-baseline-legacy.mjs`
against the starting app served from Git (without changing this checkout):

| Gate | Matching failure on base and final tree |
| --- | --- |
| `verify-media` | Timeout waiting for seeded `#slide .hero` |
| `verify-newtypes` | Null element while reading `focus` |
| `verify-pack-fixes` | Null element while reading `click` |
| `verify-theme-pack` | Null element while reading `disabled` |
| `verify-infographic` | Timeout waiting for `.ig-bar` |

The new composition assertion initially caught the inherited split-column override, and
passed after its correction. The existing mathematical gates retain their own negative
controls. The responsive registry assertion intentionally changed from “mathematics only”
to exactly mathematics plus the shared skill registration, preserving the legacy-routing
assertions. The geometry harness needed a Windows file-URL correction; the other setup issue
was the legacy gates' different expected server ports, now supplied consistently by the pipeline.
No golden screenshot baselines or established courseware fixtures were changed.

Machine-readable results are `logs/results.json` and `logs/baseline-results.json`. Detailed
local `.log` files are retained under `logs/` and are ignored by the repository's existing rule.
The named JSON summaries and this report are committed review evidence.

Limits: real video playback is unverified because no teacher URLs were supplied; safe URL
normalization was tested separately with network requests blocked. Detailed figure, table,
worked-step and question-subpart editing remains JSON-based. Phone evidence covers learner
behavior, not a new phone authoring design. Visual approval remains with the user.
