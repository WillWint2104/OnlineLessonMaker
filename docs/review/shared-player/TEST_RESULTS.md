# Integration verification — 23 September 2026

The corrected local run completed **25/25 gates successfully**, including all five previously failing
legacy gates. This is a local result; final-head receipts and GitHub checks are verified separately.

The coordinated pipeline is `node scripts/verify-player-suite.mjs`: 25 gates, sequential, with
separate per-gate logs and machine-readable `logs/results.json`. The original five-failure report
is retained as `TEST_RESULTS-0c3a8e1.md`; it is historical, not the corrected build's result.

The shared-player walkthrough now passes 63 assertions (the original 61 plus two reserved-identity
regressions), including real UI activity creation, text edits,
activity/skill reorder, Study/Present, paper/typed/pen policy, JSON export/reimport, HTML export and
fresh-context reopening. Refreshed normal-viewport captures include the non-monic negative example.

The five formerly failing gates are corrected and retain their behavioral coverage. Read
`FAILURE_RESOLUTION.md` for exact causes, the application quiz fix, and the now-reconciled thirteen-gate
report. Nothing is marked allowed-to-fail and no failing gate is removed from the pipeline.

Corpus result: 248/250 units byte-identical plus two exact, documented before/after DOM transitions
restoring lost Microhistory quiz questions. Both complete hashes are pinned; unexpected changes fail.
The quiz gate additionally verifies every authored question in order and attempted-answer reveal.

Existing mathematical authoring coverage remains: mx-authoring 54/54 and quadratics-authoring 30/30;
notes/worked examples 145/145; typed interaction 53/53; workbook 84/84; responsive shell 92/92;
geometry semantics 204/204; label placement 927/927; measurement 191 design + 180 safety assertions.
New activity authoring is a narrower interface: see `AUTHORING_COVERAGE.md`.

To verify an exact committed head without overwriting committed review artifacts, set
`PLAYER_REVIEW_DIR` to a separate output directory before running the same suite. Its
`logs/run-info.json` records HEAD, Node version, timestamp and application SHA-256. The final delivery
package carries those receipts and the actual GitHub review/check state; this document does not
substitute local results for remote CI or claim review completion in advance.

Environment: Windows, Node 24.14.1, Playwright 1.61.0, Chromium 149.0.7827.55. Remote CI uses its
repository-defined Ubuntu/Node 20 jobs. No hosting configuration or branch protections changed.

Limits: no teacher video URLs, hence no actual provider playback test; supplied content round-trips
are checked but not every possible future figure/video payload. Learner responses remain session-only.
Visual polish remains for the user's later review. Existing storage-scanner warnings predate this work.
