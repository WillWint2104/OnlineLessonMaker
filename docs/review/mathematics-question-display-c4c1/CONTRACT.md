# C4C canonical notation contract and bounded PR split

Baseline `1c32026`. B4's capability matrix and the real TPMath/C1 sources were inspected. This is one extension of the existing string-to-Type-tree parser and MathML renderer, with no schema migration or external host. Type already stores `large`, `lim`, `matrix` and `acc` nodes; that does not imply corresponding canonical string commands work.

Canonical author data remains strings. In prose, a JSON stem is `"Evaluate $\\int_{0}^{2} x\\,dx$."`. In a C1 step, `"math":"\\int_{0}^{2} x\\,dx=2"` has no outer dollars. JSON requires escaping each backslash. IDs, grouping, explanations, answer policy, visual references and unknown compatible lesson fields retain their current owners. Editable/draft JSON remains available even when learner export is blocked.

## PR 1 — calculus, limits and bounded operators (this implementation)

| Family | Author syntax (before JSON escaping) | Representation / display | Invalid input and correctness cases |
|---|---|---|---|
| Limit | `\lim_{x\to a} f(x)`; `\lim_{x\to0^{+}} \frac1x` | Existing `lim` node, true MathML underscript; one-sided marker stays in the target | Require a nonempty lower approach with one arrow and both sides, no upper script, and a following expression. Test finite/one-sided/infinite targets and nested fractions. |
| Derivative | `\frac{dy}{dx}`, `\frac{d^2y}{dx^2}`, `f'(x)` | Existing fraction/power/prime content; no new differentiation engine | Existing malformed fraction/script/delimiter diagnostics; verify second derivative of `x^4` is `12x^2` independently of rendering. |
| Definite integral | `\int_{0}^{2} x\,dx` (either bound order) | Existing `large` node, integral side scripts with explicit lower/upper bounds | Require both nonempty bounds or neither, reject duplicate scripts and missing integrand. Test endpoint order, nesting and `0→2` integral result `2`. |
| Indefinite integral | `\int 2x\,dx=x^2+C` | Existing `large` node without artificial empty bound placeholders | A following expression is required; no inference of variable, constant or antiderivative. |
| Sum / product | `\sum_{k=1}^{5} k^2`, `\prod_{k=1}^{4} k` | Existing `large` nodes with real under/over bounds | This bounded subset requires both nonempty bounds and a following expression; no invented limits. Test sum `55`, product `24`, reversed bound input order, nested operators. Index-set-only operators remain explicitly outside PR 1. |
| Differential spacing | `\,` | Existing character node for thin space, rendered as MathML spacing; no visible comma | Serialize back to `\,`; test with integrals and ordinary arithmetic. Other new typography commands are not inferred. |

Existing public Type trees and editing slots are retained. The common parser is extracted without introducing a second language; old valid string trees are compared to baseline. Large operators, limits and matrices are display-only in this evaluator: compile must return an explicit unsupported result instead of silently dropping the operator and evaluating its body. No numerical/symbolic calculus service is implemented or claimed.

The following presentation row belongs to the existing operator body slot, stopping at the enclosing delimiter or outer relation. Nested groups retain their existing structure. Spacing alone is not a body. This is a presentation tree, without inferred calculus binding or differentials. Invalid authored graph targets and misconception equations are treated as unavailable if compilation throws, preserving valid scalar grading and allowing draft submission to continue safely.

Validation uses the actual Type node factory and its command/function/relation vocabulary. A sign, spacing, index or limit label alone cannot supply an integrand; comparison characters and their supported command aliases share the same body boundary. Bounds and ordinary approaches need mathematical values. This is structural validation, not a proof of arbitrary algebra. Serialization terminates an unbounded `\int` control word with a space before its body. C1 validation also recognises the `\left`-decorated function groups already emitted by Type; no additional function family is introduced.

Validation continues through `MathDisplay.issues` and actual TPMath vocabulary. New operator diagnostics are shared with parsing, not copied into a competing command list. Unsupported commands and malformed delimiters remain explicit field/character diagnostics. Publication blocking occurs before answer redaction; hidden content is not a route around validation. Drafts and source strings remain recoverable.

## PR 2 — structural notation (proposed, not implemented or launched)

| Family | Preferred canonical syntax | Reuse / bounded extension | Validation and compatibility requirements |
|---|---|---|---|
| Matrix | `\begin{pmatrix}a & b \\ c & d\end{pmatrix}` | Reuse Type matrix rows and MathML table, existing parenthesis fences | Rectangular nonempty cells/rows, matching environment; never pretend the environment currently works. Test 1×1, 2×2, 3×3, nested fractions and round-trip. |
| Determinant | `\begin{vmatrix}a & b \\ c & d\end{vmatrix}` | Reuse matrix content with determinant fences, no determinant evaluator | Shape diagnostics and preserved fence intent; independently verify `ad−bc`. |
| Column/vector | One-column `pmatrix`; `\vec{v}` | Existing matrix/accent nodes | Require one column for a column-vector fixture; valid accent argument; retain Type slot navigation and old ASTs. |
| Piecewise | `f(x)=\begin{cases}x^2 & x\ge0 \\ -x & x<0\end{cases}` | Needs a small brace/table/condition structure in the same renderer | Row shape, nonempty expressions/conditions, correct brace/alignment; distinguish prose conditions from math. Resolve any consequential condition-text contract before implementation. |
| Sets / intervals | Existing Unicode `ℝ`, `ℤ`, `∈`, `∪`, `∩`, `(a,b]`, escaped set braces; investigate `\mathbb{R}` / `\text{otherwise}` with structural work | Reuse existing symbols/fences where actually supported; no substitution for unsupported commands | Verify real bracket closure, display and escaping. Interval delimiters need a bounded compatibility treatment because the current strict matching-delimiter validator rejects mixed interval brackets. No PR 1 promise of these missing commands. |

For every family, actual JSON/stem/options/examples/parts/structured steps/final/working/export/Answer Hub checks are required when introduced. Typography tests do not prove mathematical truth. Matrices, determinants, vectors, piecewise and interval-validator changes remain the second reviewable change; first deliver PR 1 and stop for visual/functional review.

## Evidence and regression

Use original Year 11–12 examples, exact AST/bound assertions, malformed/missing/duplicate limits, unsupported commands and publication diagnostics. Compare existing scalar/fraction/function parsing and unchanged existing lesson/asset bytes to baseline. Actual desktop 1536, laptop 1280 and genuine native 200% use the real player and exported learners; no substitute mock-up. Existing C1–C4B/micro/Type policies and the full exact-head regression must pass. Private fixtures and downloads are not approved new publications. Browser pen/touch is not physical-device certification.

Nested limit arrows require operands in their own containing row; neighbouring outer terms cannot supply a missing side. Serialization braces a complete non-final operator node to preserve its body boundary when reparsed. Empty function groups remain invalid even with left/right decorators or spacing commands. Existing Type draft placeholders remain editable.

Serialized operator bodies retain explicit grouping too, including authored comparisons inside a grouped body. Operator/body grouping is round-trip preservation, not inferred mathematical semantics.
