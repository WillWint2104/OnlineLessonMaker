# Production lesson validation

[Open the gallery](index.html), [Straight lines](../../../lessons/straight-lines.html), [Factorising quadratics](../../../lessons/factorising-quadratics.html), or [Lesson Studio](../../../lesson-studio.html). Import the respective `lessons/<lesson-name>/lesson.json` to edit; standalone learner exports do not expose author controls.

Content-only milestone: authentic sourced curriculum mappings for Factorising and a complete graph/table/equation Straight lines lesson. No production renderer, style, schema, dependency, persistence or Figure Engine code changed. See [curriculum source review](../../curriculum/production-mathematics.md), [teacher guide](../../lessons/straight-lines/README.md), [answers](../../lessons/straight-lines/answers.json) and [authoring coverage](AUTHORING_COVERAGE.md).

Reproduce final validation with `node scripts/verify-production-lessons.mjs`; it captures local evidence under `review-delivery/production-lessons` and leaves canonical files unchanged. `--publish` writes the two learner exports; `--author` performs the documented representative editing session and changes the Straight lines JSON. Add `--exercise-only` to demonstrate authoring on a temporary imported copy without modifying canonical lesson files. Plain validation captures use separate `final-*-inspector` names and preserve the genuine authoring screenshots.

Final checks cover independently calculated answers, unchanged Factorising content outside mappings, provenance/unknown-field round-trip, safe source links, legacy loading, collection navigation, empty video omission, response policies, standalone exports, narrow layout and native Chromium 200% zoom. Existing relevant gates and required repository validation are retained. A full shared-engine suite is unnecessary because the application is unchanged.

PNG evidence is original-resolution. Some captures show the top of a scrollable example, with a matched `-working` or `-end` capture for the bottom. This is not a navigation-reset defect. Graph windows can expand to fit equal axes/labels; the restricted-domain examples use segments, so the mathematical endpoints remain correct.

Empty teacher videos remain outstanding. Tablet digital-response question references, other state curricula and curriculum expansion remain deferred. Source links require internet; the lesson exports themselves need no local server or external media. A ZIP of the merged version includes the application, lesson data/exports, this gallery and verification receipts.

To regenerate the gallery from a fresh output directory, run `node scripts/verify-production-lessons.mjs --author --exercise-only`, then `node scripts/build-production-gallery.mjs`. The successful authoring run writes `authoring-receipt.json` automatically. A later plain validation run preserves that receipt and its authoring captures. Do not combine `--exercise-only` with `--publish`; the verifier rejects those conflicting flags.
