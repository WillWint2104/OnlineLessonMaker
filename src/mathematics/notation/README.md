# Canonical calculus notation

This module extends the existing TPMath string parser. It constructs the same Type workspace nodes and uses its MathML renderer. It is neither another renderer nor a calculus evaluator.

The supported syntax, JSON escaping, validation boundaries and proposed structural follow-up are specified in [the C4C contract](../../../docs/review/mathematics-question-display-c4c1/CONTRACT.md). Canonical prose uses single `$…$` delimiters; C1 step `math` fields contain raw expressions. No lesson schema or response model changes.

Rebuild the embedded parser with `node scripts/build-mathematics-notation.mjs`. The small shared C1 diagnostic hook is embedded with `node scripts/build-mathematics-question-display.mjs`. These builders must leave the application byte-identical on a second run.

Run the pure parser/compatibility tests with:

```powershell
node --test tests/widgets/mathematics-notation/core.test.mjs tests/widgets/mathematics-question-display/core.test.mjs
$env:C4C_REVIEW_DIR='review-delivery/c4c1/focused'
node scripts/verify-mathematics-notation.mjs
```

The browser verifier uses actual JSON import, inspector fields, learner exports, the existing Type workspace, Answer Hub and native Chromium 200% zoom. It writes private fixtures and captures, never published lessons. Chromium must be installed for Playwright. Native browser zoom is not CSS scaling or a smaller emulated viewport.

New operator validation is shared by publication diagnostics and parsing. The existing graph-specific syntax inventory does not gain these operators. The legacy `mxM` route recognises only the newly supported operator commands when existing C1/micro flags are absent; existing supported lesson trees are compared against the deployed baseline.

Sums and products currently require both bounds. Integrals require both bounds or neither; limits require an explicit approach. Unsupported structural commands remain diagnosed. Scalar evaluation continues unchanged; large operators, limits and matrices return an explicit display-only evaluation error instead of dropping an operator and evaluating its neighbours.

The contract does not certify the truth of arbitrary authored equations. Correctness fixtures use independent mathematical calculations. Physical pen and assistive-technology certification remain outside browser emulation.

The frozen baseline fixture contains 257 trees obtained from the deployed `1c32026` parser, with its application hash and vocabulary. Pure tests enumerate local JSON fixtures and read this snapshot; they require neither Git history nor a Git repository. Operator-body and spacing-only negative tests protect interoperability with the existing Type slots.

Operator diagnostics construct the same nodes as parsing and reuse the engine's existing relation set, including command aliases. They do not use a separate probe tree or command vocabulary. Operand-presence checks are structural; authored mathematical truth still needs independent verification. Unbounded integral serialization keeps its control-word boundary, including before variable and function integrands.
