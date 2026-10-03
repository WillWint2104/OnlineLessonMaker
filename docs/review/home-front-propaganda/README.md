# Home-front propaganda classroom review

This is the real three-skill History classroom lesson, authored through the unchanged PR162 application. It is not the synthetic qualitative review fixture and is not a new renderer.

Open [index.html](index.html) for the gallery and links to the runnable learner, editable JSON, teacher guide and source records. PNGs in `screenshots/` are original-resolution captures of the actual application. Desktop is 1536 × 960, tablet 1024 × 768 and narrow 390 × 844. The additional tall review capture is 1536 × 2200 to show both sources and their task together. Captures labelled metadata/task include scrolling; an absent header in a scrolled capture is not evidence of a navigation reset bug. Images remain at their supplied institutional screen resolution.

[AUTHORING_COVERAGE.md](AUTHORING_COVERAGE.md) separates content-only work, application changes (none) and JSON-only boundaries. The canonical learner is `../../../lessons/australia-home-front-propaganda.html`; import `../../../lessons/australia-home-front-propaganda/lesson.json` into `../../../lesson-studio.html` to edit it. Source/poster rights and curriculum verification are documented in `../../lessons/australia-home-front-propaganda/`.

`workflow/results.json` identifies the baseline, tested application/lesson/script hashes, captures and individual checks. `classroom-roundtrip.json` and `published-lesson.html` are actual application downloads. `authoring-exercise.json` and `authoring-exercise.html` contain deliberate verification edits and are separate from the canonical lesson. `validate.txt` is the real structural gate receipt. No new recording was produced.

The focused verifier is `../../../scripts/verify-home-front-lesson.mjs`. Run without `--publish` to check and download into this review directory; `--publish` also writes the canonical learner HTML. It does not change the authoring application. It uses the existing installed Playwright dependency, not a new production build step.

Core lesson checks block all remote requests. Existing remote fonts/dependencies can fall back; source/curriculum web links require internet. Teacher videos remain empty and omitted. No video or external dependency is claimed to work offline. Tablet question-reference enhancement, extra curriculum frameworks and WWII styling remain deferred.
