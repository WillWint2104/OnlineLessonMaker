# Mathematics question display — C1 human review

Implements the approved B1.1 design in the existing application. C1-A covers explicit equation alignment and short-height Answer Hub controls; C1-B covers canonical question/part solutions, actual authoring and publication safety. This milestone stops at a draft PR for human visual/functional approval. No publication or deployment is authorised.

Run from the repository root:

```
node scripts/build-mathematics-question-display.mjs
node scripts/build-mathematics-visual-system.mjs
node --test tests/widgets/mathematics-question-display/core.test.mjs tests/math-review/reliability.test.mjs
node scripts/verify-mathematics-question-display.mjs
node scripts/capture-mathematics-question-display.mjs
```

The browser scripts accept `C1_REVIEW_DIR` and `C1_GALLERY_DIR`. Use fresh task-specific paths and the installed Playwright browser. Full regression uses `PLAYER_REVIEW_DIR`, `PLAYER_REQUIRE_CLEAN=1`, `CORPUS_REF=f5cc39d4a9e9076a0064e528b9e2eadf6649d885` and `node scripts/verify-player-suite.mjs`. Run the existing micro gate separately with `MICRO_REVIEW_DIR` set to fresh evidence. No production lesson export is needed.

Review evidence includes actual paper/typed/pen learner exports and captures at 1536, 1024, 390 and native 200%, structured inspector editing, notation errors, legacy scan, JSON round-trip and 36 actual HTML answer-policy projections. The native zoom receipt must have DPR 2 and CSS zoom 1. The first mathematical step must fit inside the answer body with 21px working and 18px prose. Keyboard checks exercise disclosure, filters, tabs, resize and Escape/focus restoration.

The fixture is synthetic verification material, not an approved lesson. Inspect its linear equation, legacy inequality, simultaneous derivation and mixed canonical/legacy multipart question. Existing lesson content is never rewritten. Invalid drafts remain saveable; unsupported notation and dual-source conflicts block learner export. Exact matching derived legacy working is removed only with an import notice and recoverable original. Compatibility draft download is explicit and does not mutate canonical authoring data.

Limits: supported TPMath subset only; no new specialist notation, automatic proof/marking, graph model changes, figures/tables, remote backend deployment or production lesson publication. Browser automation does not certify screen-reader output or physical stylus behaviour. Full regression and exact-head CodeRabbit/CI results are reported in the external final package, not claimed by this document. Existing accepted B1/B1.1 evidence is preserved.
