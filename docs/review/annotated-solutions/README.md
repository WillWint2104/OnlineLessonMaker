# Annotated solutions review

Open [the review index](index.html). This continues PR #156 (`aa33144324981a155ba7e45838c3fbd59f180ed9`) with paired mathematical working and explanation, corrected teaching examples and two separately committed defect fixes. It uses the existing general application and canonical lesson data.

## Open and author

- Independent learner pages: [factorising](after/published-factorising.html), [physics](after/published-physics.html), [qualitative](after/published-qualitative.html).
- Open the repository-root `lesson-studio.html`, choose Edit → JSON, paste/import [factorising.json](factorising.json), [physics.json](physics.json) or [qualitative.json](qualitative.json), then Load JSON. Select a worked example or step in the inspector. Mathematical working, matched explanation and caution have separate controls. Select a nested table to edit its cells. Export makes a learner page; JSON saves an editable draft.
- For a local server, run `node scripts/serve-player.mjs` at the repository/package root and open `http://127.0.0.1:8099/docs/review/annotated-solutions/index.html`. The server is optional for the supplied independent learner HTML and static images; use it for the full authoring application and local assets.

## Evidence

`before/` contains original-resolution captures of the **PR #156 renderer with the new review JSON**. `after/` contains matched captures, editable workflow JSON, independently exported HTML, browser assertions and the authoring recording. This comparison isolates renderer changes; it does not pretend that the corrected content was present in PR #156. The earlier `activity-authoring` and `shared-player` review directories preserve historical content evidence.

`zoom/` records actual Chromium 100% and 200% page zoom: a 1514 CSS-pixel viewport becomes 757 CSS pixels, with device pixel ratio 2 and CSS zoom remaining 1. These are original browser screenshots, not enlarged images or CSS zoom simulations. `defects/` retains before/after reproduction and visibility measurements. [SCREENSHOT_INDEX.md](SCREENSHOT_INDEX.md) lists the captures.

[REFERENCES.md](REFERENCES.md) explains the source-to-decision mapping, compatibility and fixture provenance. [AUTHORING_COVERAGE.md](AUTHORING_COVERAGE.md) distinguishes actual graphical editing from data setup. The independent arithmetic gate checks products, sums, complete candidate enumeration and polynomial coefficients; its dimensional check derives length/time. Those checks supplement, rather than replace, reading the authored explanations.

## Verification and limits

The coordinated pipeline is `node scripts/verify-player-suite.mjs`, with `CORPUS_REF=aa33144324981a155ba7e45838c3fbd59f180ed9` and an isolated `PLAYER_REVIEW_DIR`. It contains 32 sequential gates; no corpus transition or prior assertion is relaxed for this change. Final exact-head local/remote checks and review receipts are delivered with the PR and ZIP; evidence JSON identifies the source/hash it actually tested.

Actual teacher video URLs and playback remain outstanding. Optional empty video slots are not publishable content by themselves. Remote services are not claimed to work offline. Tablet question-reference enhancement is deferred. These are review fixtures and implementation evidence, **not teacher visual approval**.
