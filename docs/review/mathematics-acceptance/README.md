# Final Mathematics acceptance — bounded correction

Baseline: c52515daf01e2c9e5b8a8eef3ba0519675ba701d. Task: MATH-ACCEPT-001. This fixes PA-1, PA-2 and PA-3 only; no new question format, renderer, generator, response/release policy or lesson content.

## Root causes and corrections

- `mxWorking` treated every line as math-only when any later line began with an equality continuation. A valid `Lowest common denominator: $6x$` explanation therefore reached the math-only diagnostic. The continuation branch now distinguishes complete mathematical lines from prose/mixed spans, retaining the same MathML renderer and alignment primitive.
- The reusable reviewer checked `merror` in the page behind the Answer Hub, omitted `.md-notation-error`, and inspected only the final selected answer group. It now inspects the active learner/dialog, records question ID/field/diagnostic, enumerates every practice/pathway and both available answer types, and verifies every eligible question was visited. Hidden/closed content and legitimate code/prose are detector calibrations. Failed rendering makes the review incomplete and blocks packaging independently of numerical checks/page errors.
- The isolated reliability VM loaded TPMath without the production notation module. It now loads `src/mathematics/notation/parser.js` first, matching the actual dependency order. All original tests remain; no mock notation engine.

The strengthened reviewer was run against the original unmodified application before runtime correction: twelve `workedAnswer` failures were attributed to their question IDs, the process failed and no archive was created. That source/run is retained in external before evidence. The focused verifier separately reconstructs the approved application from Git, exports the real lesson, reproduces both levels, then tests the current app and its independent export. The HTML regression fragment is detector calibration only, not substitute visual evidence.

The review follow-up also calibrates raw comparisons within prose, raw adjacent/spaced-variable mathematics, structural matrices and legacy `\operatorname` leakage. A relation or command alone no longer promotes explanatory text to a math-only line. Actual reviewer smoke runs cover authorised autonomous/end/hidden teacher fallbacks and independently locked/end/teacher question groups; the pre-release check uses the host's resolved global fallback and applicable per-question group policy without changing those policies.

The independent final-head review found two additional counterexamples. Visible control words are now inspected without a supported-command allowlist, including unsupported commands such as `\dfrac`; escaped backslashes, drive/UNC paths, code/pre and closed disclosures retain their exclusions. The actual complete reviewer must reject the independently accepted defective lesson, attribute its workedAnswer failure and create no candidate ZIP. Legacy working preserves command/function boundaries rather than deleting multiplication into apparent prose. Canonical validation and the existing production tree supply identifier context from mathematical subexpressions; an arithmetic substring does not promote all the surrounding instruction words. Adjacent derivation rows using the same parsed identifiers can establish context mutually, including cold-start, regrouped, reordered, explicit-operator and function products. This is display context, not an identity check or symbolic marking. Exact repeated explanatory text does not establish new context. The original twelve explanations, comparisons, arithmetic instructions and mixed spans remain regression cases. No parser, renderer or notation engine is changed.

## Reproduce

From the task worktree, with Playwright/Chromium and Python 3 available:

```powershell
node --test tests/math-review/reliability.test.mjs tests/math-review/rendering.test.mjs
$env:ACCEPT_REVIEW_DIR='review-delivery/<exclusive-run>/focused'
node scripts/verify-mathematics-acceptance.mjs
node scripts/review-mathematics-lesson.mjs docs/review/adding-fractions-algebraic-denominators/lesson.json --require-clean
node scripts/review-mathematics-lesson.mjs docs/review/mathematics-micro/workflow/lesson.json --require-clean
```

The reviewer reserves incremented output/ZIP names and refuses explicit overwrite. Use `PYTHON` if Python's executable is not on PATH. A complete candidate requires clean exact-head source, native browser 200%, the established responsive widths, full mathematical expectations and actual JSON/export/reopen. A smoke result remains smoke, and a rendering failure is incomplete even in smoke mode. `results.json` retains failed-render diagnostics and captures; the package helper refuses unresolved rendering failures.

Final counts, exact head, regression/CodeRabbit status, before/after Basic/Moderate captures and hashes belong to the external exact-head receipt and versioned review ZIP. Do not infer final acceptance from this source document or a preliminary development run.

## Protected behavior and limits

The canonical 36-question fractions JSON is byte-identical to baseline. No practice regeneration or published lesson/asset update occurs. Existing graph/calculator/geometry, C1–C4C notation, unknown compatible lesson data and response/answer policies retain their owners. Hidden/teacher/group export audits use the established applicable suites. Browser/pen emulation and local classroom adapters do not certify physical devices or a production classroom service.

The new evidence is private review material. Stop with a draft PR and human review package: no ready transition, merge, deployment, lesson publication or Geography launch.
