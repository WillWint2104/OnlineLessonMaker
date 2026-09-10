# The worked-example atlas

**A finite library of deliberately designed composition templates.** Generalisability comes from
choosing the right template, not from letting the browser invent a composition.

This replaces the composition resolver. That work is retained at `docs/mockups/compositions/` as
research evidence, and **its layout-selection logic must not be ported into the app.**
`lesson-studio.html` has been untouched since `41d40a8` throughout, so nothing needs unwinding.

`node scripts/atlas-worked-examples.mjs` renders all 24 images in Chromium using the app's own
stylesheet and the shipped Figure Engine. **There is no resolver in it.** Nothing measures content in
order to choose a composition.

---

## 1. The hierarchy

| Layer | | Decided by |
| --- | --- | --- |
| 1 Page family | Worked examples | author / lesson generator |
| 2 Pedagogical pattern | single · sequence · comparison · visual check | author / lesson generator |
| 3 **Composition template** | one of the six below | **named in the JSON** |
| 4 Content slots | prompt, steps, answer, visual, interpretation, synthesis | JSON content |
| 5 Responsive state | wide / narrow | the template |

> **Layer 5 may rearrange a template. It may never choose a different template.**

The build asserts exactly that: `data-tpl` is identical at every width and for every adversarial
payload. A payload may make a page taller; it may never change which template the page is.

## 2. The six templates

| | Wide | Narrow | Adversarial payload |
| --- | --- | --- | --- |
| **`single.flow`** · the default | one column at a 760px measure | **no state change** — only the measure stops clamping | seven steps → taller, same template |
| **`single.split`** | SCENARIO │ WORKED SOLUTION | stacked below 760px | a one-line prompt → **still a split** |
| **`sequence.flow`** | repeat(`single.flow`), hairline between | no state change | six examples of unequal length |
| **`comparison.paired`** | CASE A │ CASE B, then why they agree | stacked below 680px | cases of very unequal height |
| **`comparison.sharedVisual`** | cases row, then the visual and its interpretation | stacked below 680px | a **wide** figure → the `down` subdesign |
| **`visualCheck`** | 1 Workings (`single.flow` anatomy) · 2 Graph check | stacked below 720px | a line of mathematics wider than its measure |

`single.flow` is the default because it is the overwhelmingly common shape: the question is one line
and the solution is the lesson. Fourteen of the twenty-four renders in this atlas need no responsive
state at all.

## 3. Media geometry is the one permitted automatic classification

A figure's **class** — `portrait · balanced · landscape · wide` — comes from its authored domain's
aspect at equal unit scale. It is a **design input**, never a size, and the surrounding prose never
determines a figure's width.

| Figure | aspect | class | subdesign | preferred | at the wide width | narrow |
| --- | --- | --- | --- | --- | --- | --- |
| symmetry 10 × 12 | 1.20 | balanced | **side** | 488 × 625 @43.8 | — | 380 × 470 |
| graph check 12 × 22 | 1.83 | portrait | **side** | 386 × 716 @28.0 | — | 380 × 705 |
| roots 10 × 14 | 1.40 | portrait | **side** | 424 × 624 @37.4 | — | 380 × 546 |
| landscape 24 × 8 | 0.33 | **wide** | **down** | 717 × 346 @28.0 | 896 × 422 | 380 × 198 |

A template maps the class to an approved subdesign:

```
portrait | balanced   →  side   figure │ interpretation
landscape | wide      →  down   the figure at the atlas's wide width, interpretation beneath
```

Image `10` is the `down` subdesign: paired cases, then a 896px-wide plane, then the explanation. That
is a **designed composition, not a failure state.**

Every plane is painted at a box solved for the width it is given — never a larger box squashed into
place. One x-unit and one y-unit render the same length in all 24 images.

## 4. Height is not a constraint

`height:auto`. The page scrolls. Nothing is shrunk, compressed or recomposed to avoid it. Measured
page heights in this atlas:

| Template | page height across its four renders |
| --- | --- |
| `single.flow` | 900 – 1099px |
| `single.split` | 900 – 959px |
| `sequence.flow` | 1638 – **2816px** |
| `comparison.paired` | 900 – 1289px |
| `comparison.sharedVisual` | 1233 – 1884px |
| `visualCheck` | 1557 – 1948px |

A 2816px page is not a problem to be solved.

## 5. Controlled measures

Horizontal is rigid; vertical is fluid. Prose never expands to the whole canvas because the space
exists — unused page width is **reading margin**, and it is correct.

| | |
| --- | --- |
| flow / solution | 760px |
| interpretation | 720px |
| synthesis | 720px |
| case | 520px |
| split prompt | 40%, ceiling 480px |
| split solution | remainder, ceiling 700px |
| gap | 32px |

These are design-system values. **They never appear in lesson JSON.**

## 6. What the build checks

Each control is here because it caught something while the atlas was being built.

| Control | What it caught |
| --- | --- |
| **Template identity** | nothing yet — it is the invariant the reset exists to protect |
| **Same payload at every width** | a figure rendering as the literal text `undefined`: I dropped the painted HTML when assembling the figure record, so the planes in the `side` subdesign were text, not graphs |
| **A figure region contains a painted plane** | added after the above — the width check skipped a region with no plane in it, so a page of "undefined" screenshotted cleanly |
| **Equal-unit scale** | a narrow figure at x/y = 1.021, because I was squashing a pre-painted box instead of solving one for the narrow surface |
| **A figure region is exactly its plane** | a full-width region around a narrower plane in the `down` subdesign |
| **Controlled measure honoured** | makes the measure a property of the page rather than a claim in this document |
| **Overflow is local, and the proof is live** | the over-wide-mathematics proof was **inert** — `visualCheck` state 1 was not using the `single.flow` measure, so nothing was narrow enough to overflow. Fixed in both places: the template now carries the measure, and the payload is a genuine four-bracket expansion (verified algebraically) rather than a line that merely looked long |
| **No inline geometry** | nothing is resolved at runtime; if it were, this fires |

## 7. What was kept from the resolver research, and what was discarded

**Kept** — properties of the material, not design decisions: figure intrinsic and legibility
information; minimum readable dimensions; equal-unit safeguards; overflow detection; tests for
unowned space inside a region; residue tests; same-payload responsive tests.

**Discarded as layout authority**: universal occupancy thresholds; track growth weights; height
matching between siblings; optimisation or scoring across candidate arrangements; automatic switching
between unrelated compositions; attempts to use all available space; the assumption that a page ought
to avoid vertical scrolling.

## 8. What this pass is for

These 24 images are a **proposal, not an implementation**. Nothing is built until each of the six is
approved as a golden design target. `src/atlas.json` is the specification; `src/atlas.css` states the
templates; `src/*.html` are the payloads; `atlas-report.json` records every render.
