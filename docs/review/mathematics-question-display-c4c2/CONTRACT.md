# Structural Mathematics notation — C4C-2

C4C-2 extends the existing TPMath parser, Type trees and MathML renderer at deployed baseline `b8d5a18dec50f5b8978303bf6698e250946f9a1d`. Canonical lesson values remain strings: single `$…$` spans in prose/options/answers, raw expressions in C1 solution-step `math`. JSON doubles each backslash. No new schema, renderer, CAS, response model or answer-release policy.

| Family | Canonical source before JSON escaping | Representation and validation |
|---|---|---|
| Parenthesised matrix | `\begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}` | Existing `matrix` rows/cells. Default node shape unchanged. Nonempty rectangular cells/rows, matching environment. 1×1, 2×2, 3×3 and nested fractions/matrices supported. |
| Determinant | `\begin{vmatrix}2 & 3 \\ 1 & 4\end{vmatrix}` | Existing matrix with `environment: "vmatrix"`; vertical fences. Must be square. Display only; authored expected value is independently verified as 5. |
| Column vector | `\begin{pmatrix}2 \\ -3 \\ 1\end{pmatrix}` | Existing one-column matrix. No separate vector schema. |
| Vector accent | `\vec{v}`, `\vec{a+b}` | Existing `acc` node, true MathML accent. Existing `\overline{AB}` serializer output also reparses. Nonempty mathematical base. No vector numerical evaluator. |
| Piecewise | `f(x)=\begin{cases}x^2 & x\ge0 \\ -x & \text{otherwise}\end{cases}` | Existing matrix slots with `environment: "cases"`, left brace, two left-aligned columns. Each row needs a mathematical expression and explicit condition; row order retained. No inferred conditions. |
| Literal condition | `\text{otherwise}`, `\text{for negative x}` within a cases condition | One inert `text` leaf rendered with MathML `mtext`, preserving literal spaces/source. No HTML execution. Nested braces, commands and dollars remain unsupported. Outside a condition, text is explicitly diagnosed. This is the already proposed canonical text spelling, not a prose-expression language or a new editor. |
| Number sets | Unicode `ℝ ℤ ℚ ℕ ℂ` or `\mathbb{R}` / `\mathbb{Z}` / `\mathbb{Q}` / `\mathbb{N}` / `\mathbb{C}` | Existing character nodes; serializer may use equivalent Unicode. Arbitrary blackboard alphabets remain unsupported. |
| Membership / operations | `\in`, `\notin`, `\cup`, `\cap` or `∈ ∉ ∪ ∩` | Existing symbol nodes. No set algebra engine. |
| Sets | `\{x\in\mathbb{R}:x>0\}` | Existing literal brace/symbol nodes; escaped braces retain their canonical escape on serialization. Unbalanced escaped braces fail structural validation. |
| Intervals | `(a,b)`, `[a,b]`, `(a,b]`, `[a,b)`; e.g. `[-2,3)` | Existing fences; mixed closing fences require exactly one top-level comma and two mathematical endpoints, with no top-level relation. Nested endpoint expressions and infinities allowed. This syntactic recognition does not prove interval ordering or infer open infinity endpoints. `(x+1]`, `(a,b,c]`, empty endpoints and unrelated malformed groups remain invalid. |

The parser owns structural diagnostics and source offsets. C1 uses those diagnostics for structural expressions instead of running a second strict-delimiter interpretation that would reject legitimate intervals. Existing nonstructural validation and all 257 frozen trees remain protected. Principal-relation alignment ignores equations inside environment cells. It can fall back to readable unaligned working where an expression has no supported outer relation.

Type retains existing matrix cell slots and accent base slots. Arrow navigation, saved ASTs and navigation persistence are tested. Literal text is an atomic display leaf; there is no new Type ribbon tool or prose-condition editor. Current Tab behavior follows the host focus system; arrow keys are the verified cell-navigation route.

Structural notation, vector accents, sets/intervals and calculus are display-only in TPMath's scalar compiler. It returns an explicit unsupported result rather than silently evaluating adjacent content. Existing scalar graph grading is not replaced. No determinant evaluation, symbolic simplification, marking or proof checking is claimed.

## Authoring and publication

The private fixture exercises explanations, examples, stems, choice options, multipart prompts, final answers, structured solutions and Answer Hub. Actual JSON download/reopen and learner HTML exports retain canonical source and stable IDs. Malformed environments, empty cells/conditions, unsupported commands and invalid interval fences block learner export with field paths while draft JSON stays editable/downloadable.

Existing hidden, teacher, release-group and authorised offline end-of-lesson policies retain their owners. Private downloaded learner files are review artifacts, not approved lesson publications.

## Acceptance and limits

Run structural and original notation unit/browser checks, C1–C4B/micro/Type compatibility, independent mathematical expectations, both builders twice and the applicable full exact-head player suite. Use actual application captures at 1536, 1280, 1024 and native Chromium 200%; no injected layout/styles or substitute mockups. Zero page errors required. Physical pens, screen readers and production classroom backends are not certified by browser emulation/adapters.

Stop with a draft PR, CodeRabbit status and versioned integrity-checked review package for human approval. No merge, deployment, new lesson publication or Geography work.

Visual self-review reproduced short parentheses with Chromium's generic math font. Matrix-local MathML now uses the existing Type palette stack (`LM Math`, `Cambria Math`, `STIX Two Math`, `math`) to obtain stretchy mathematical glyphs. No font size, global typography or asset changes. Real browser measurements require each visible matrix's opening fence to span at least 90% of its table height; availability still follows the established platform font fallback.

Legacy routing is narrower than strict structural validation: ordinary existing coordinate/group spans keep their original formatter. Only new commands and mixed fences require promotion to canonical MathML outside already opted-in C1/micro/visual contexts. The Notes/Examples corpus guard verifies visible-character preservation across the 3,850 committed lesson strings.
