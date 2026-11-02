# C4C-2 review evidence

The canonical syntax and boundaries are in [CONTRACT.md](CONTRACT.md). The original private Years 11–12 fixture is `tests/widgets/mathematics-notation/structural-lesson.json`.

Run:

```powershell
node --test tests/widgets/mathematics-notation/core.test.mjs tests/widgets/mathematics-notation/structural.test.mjs tests/widgets/mathematics-question-display/core.test.mjs
$env:C4C2_REVIEW_DIR='review-delivery/c4c2/focused'
node scripts/verify-mathematics-structural-notation.mjs
```

The external versioned gallery contains actual application captures, editable JSON, actual learner exports, parser negative cases, focused/compatibility/full regression receipts and exact-head GitHub review evidence. Runtime and evidence SHA-256 values must match the recorded head. Development runs are not exact-head receipts.
