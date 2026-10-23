# Mathematics review reliability — MATH-QA-001

This task changes QA tooling and expectation fixtures only. Existing authored lesson JSON,
learner rendering, navigation, authoring controls, vendors, Geometry/Graph/Calculator, Geography
and publications remain unchanged. No new fraction generator or symbolic algebra engine is added.

## Numerical scope

The reviewer uses the real application's existing TPMath tree/compiler. It substitutes variables
independently into parsed nodes, rather than replacing variable names with alphabet-offset values.
Forty-eight deterministic assignments include equal, unequal, positive, negative, zero, fractional
and larger values. Every equality needs at least 16 valid comparisons and 60% valid attempted
comparisons. A failed valid comparison rejects the identity. Non-finite/domain-restricted samples
are recorded as excluded; unsupported notation is separately recorded. Empty or mostly excluded
coverage cannot pass. Counts include attempted/valid/excluded/unsupported/failed, per equality;
failed comparisons are a subset of valid evaluations.

Sampling is **not a symbolic proof**. Domain filters honour authored restrictions, but do not
prove those restrictions necessary or complete. Unsupported nodes/commands and mathematical
claims outside equality coverage remain visible and prevent a complete candidate. An explicit
human review decision is required for those limitations; there is no automatic waiver.

## Expectations and acceptance

Reusable expectations identify stable question IDs, practice counts, skill labels/instructions,
answer/worked-answer coverage and opt-in fraction pedagogy. Reduced inputs are checked only for
skills explicitly requiring them. Lowest-common-denominator facts are checked arithmetically,
not silently counted as numerically verified identities. Geography is not subjected to these
Mathematics-specific rules.

The Adding Fractions expectations now cover reduced starting fractions in all three skills.
Negative tests restore the original defective stems of:

- `like-denominators-example-moderate-2`
- `like-denominators-example-moderate-4`
- `common-denominator-example-basic-6`

Each fails its named pedagogical assertion. The approved lesson itself is never edited.

`--mode complete` is the default. A complete candidate requires explicit expectations, all answer
coverage, adequate supported numerical coverage, actual import/export/reopen, all three responsive
widths (1536/1024/390), native browser 200%, zero page errors and clean exact-head source. Archive
CRC/extracted hashes/local links are then required before the separate delivery receipt certifies
`verified-complete-review-candidate`. That is not human approval or publication approval.

`--mode smoke --widths 1536 --no-native --no-package` can succeed as a structural/browser smoke run,
but reports `smoke-only`, never a complete candidate. Partial complete-mode runs report `incomplete`
and exit unsuccessfully. Failed/incomplete/smoke results cannot be packaged as accepted candidates.

## Evidence preservation and provenance

Default runs allocate new `review-delivery/mathematics-review/<lesson-id>-<head>-review` directories
and adjacent ZIPs, incrementing `-v2`, `-v3`, etc., as in the existing artwork packager. Existing
explicit output paths fail instead of overwriting. Only repository-local review directories are
allowed. No historical package is rewritten. Exclusive directory/ZIP/receipt creation protects
against collisions. Reports bind input, expectations, application and review-tool hashes, repository
head, question/skill/answer counts, numerical coverage, screenshots and limitations. ZIP receipts
include archive SHA-256, extraction verification and resolved local-link counts.

## Reproduce

```powershell
node --test tests/math-review/reliability.test.mjs
node tests/math-review/evidence-preservation.mjs
node scripts/review-mathematics-lesson.mjs docs/review/mathematics-micro/workflow/lesson.json --require-clean
node scripts/review-mathematics-lesson.mjs docs/review/adding-fractions-algebraic-denominators/lesson.json --require-clean
```

The integration regression runs the real reviewer twice, hashes the entire first review directory,
archive and receipt before/after, tests explicit collisions, checks both verified archives and
proves smoke packaging rejection. It preserves all evidence. Set `PYTHON` and
`PLAYWRIGHT_BROWSERS_PATH` where required by the local environment.

Baseline audit comparison counts were 1,092 (Cancelling) and 1,309 (Adding Fractions). New counts
will differ because each identity now receives 48 independent/domain-filtered assignments instead
of seven linked assignments, and non-equality facts are accounted for explicitly. Exact realised
counts and final-head review status belong in the delivery receipt, not a promise to preserve the
old totals.

Delivery is a **DRAFT PR only**, pending CodeRabbit and human tooling approval. Do not mark ready,
enable auto-merge, merge, publish lessons, deploy or start the separate authoring safeguard.
