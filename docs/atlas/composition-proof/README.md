# The Composition Proof Atlas — ownership, then fitness

**Nothing here is wired into anything.** `docs/atlas/composition/src/` is untouched, the lesson is
untouched, `lesson-studio.html` has been byte-identical since `41d40a8`. A prototype, deliberately
narrow: it renders only what it proves.

```
node scripts/composition-proof-atlas.mjs
CP_ONLY=worked.paired CP_SURFACE=desktop   # a slice
```

## Two layers, asked in order

```
STRUCTURAL VALIDITY   Does every part of the active composition have an owner?
        ↓
COMPOSITION FITNESS   Is the approved blueprint actually using the surface it was given?
```

The previous pass built the first. It produced a page that was *legally composed and unnecessarily
timid*: a 564px portrait graph alone in its row on a six-column spine, with six columns of perfectly
valid page margin either side. Valid whitespace is not the same as good use of space.

**Neither layer is occupancy.** Nothing in this atlas measures a fraction, an area, a dead-space
percentage or a content length. Fitness is decided by named positions on a ladder.

## The separation

`hug`, `paired` and `workspace` were doing double duty as horizontal *and* vertical concepts. They
are now two declarations:

```
horizontal = solo | paired | workspace          vertical = hug | designed
```

```
row ownership → row cardinality / relationship → approved horizontal span
              → object realisation → vertical rhythm
```

## The solo span ladder

A row holding **one** semantic region is a **solo** row. It takes a rung from an approved ladder —
never a calculated width.

| rung | desktop | tablet | phone |
| --- | --- | --- | --- |
| `spine` | the blueprint's own spine span | ″ | ″ |
| `expanded` | 8 | 8 | 4 |
| `wide` | 10 | 8 | 4 |
| `full` | 12 | 8 | 4 |

A solo row declares which rungs it approves and which it **prefers**:

```jsonc
{ "id": "media",
  "horizontal": { "mode": "solo", "spans": ["spine", "expanded"], "preferred": "expanded" },
  "vertical": "hug", "region": "media", "gapAfter": "section" }
```

The spine is an **axis**, not a width — so a solo row may climb to a wider rung and still sit on the
page's one centre line or one left edge. A control asks about the axis and never about the width.

**Increased height is not a failure.** The page scrolls; usable width is not sacrificed to keep a
page short.

## What a region *is* constrains which rungs are legal

The family never invents a composition — the blueprint still chooses from within it, and `spine` is
always available as the fallback rung.

| region | approved rungs |
| --- | --- |
| `reading` · `support` · `worked` · `questions` | `spine` · `expanded`, **capped at the reading measure** |
| media, portrait | `expanded` |
| media, balanced | `expanded` · `wide` |
| media, landscape / wide | `wide` · `full` |
| interactive | `wide` · `full` |
| workspace | `full` |

So a paragraph does **not** expand to twelve columns merely because it is alone: at desktop the
measure is 760px and eight columns is exactly that, so the ladder stops. At tablet `expanded` is 8
and the measure is 7, so prose has one rung and no ladder at all — and a blueprint that tries to
declare otherwise is refused before anything renders.

## H11 · SOLO SPAN — the fitness contract

> A row containing one semantic region must realise one of the blueprint's approved solo spans. If
> the preferred span is feasible, it must not remain at a smaller span merely because that smaller
> span is legal.

Feasibility is categorical plus one mathematical question: the rung is in the region's family, it
fits the surface, its page margin is symmetric on a centred axis, prose stays inside the measure,
and — for a plane — an equal-unit box solves at that width. Nothing else.

```
media row · desktop · cardinality 1
approved spans  spine=6, expanded=8
preferred       expanded
realised        spine (6 col, 564px)     REJECT H11 — structurally owned, UNDER-REALISED
```

## The proofs

| board | shows |
| --- | --- |
| **1** `portrait-media-solo-expanded` | **GOLDEN, corrected.** The graph realises `expanded` — 8 columns, 760px — while the reading returns to the six-column spine. One centre line, page margin 1–3 and 10–12, every step measuring itself, equal unit scale preserved (0.999). |
| **2** `prose-alone-stays-at-the-measure` | Five solo prose rows, every one at `spine` = 8 = the measure, none reaching for the grid. |
| **3** `wide-media-solo-full` | A wide object alone realises `full` — twelve columns — because its family says so and it is short by construction. |
| **4** `worked-paired-unchanged` | **GOLDEN, unchanged.** Its one substantive row holds *two* regions that already own all twelve columns, so there is no solo space to reclaim. Siblings 0px apart, both `section` steps measure 56px. |
| **5** `practice-workbook-unchanged` | **Unchanged.** Its working rows are designed 5/7 relationships — two meaningful regions — so the ladder does not touch them and the reference is not widened. |
| **6** `counterexample__under-realised-solo-span` | **FAILS H11.** The same blueprint held back one rung. Every column owned, one axis, every step exact — and timid. *This is the page the previous pass shipped as correct.* |
| **7** `counterexample__unowned-half-row` | **FAILS H2.** Six columns at the left of a twelve-column active row, the other six declared by nothing. Widening the object would not make this legal: the defect is ownership, not fitness. |
| **8** `counterexample__side-study-imbalance` | **FAILS H4.** Every column owned, and the two paired objects still terminate 535.5px apart. A wider graph would not have saved it. |

Boards 4, 5, 7 and 8 are the proof that the new contract is **scoped to cardinality 1** and does not
simply make things bigger.

## Reading a board

Each board shows the page twice — as it renders, and with **every region and every piece of white
classified** under the five spaces, with a legend. The overlay draws the 12-column grid, the **spine
band** at its own span (so a wider solo row can be seen sitting on the same axis), each row outlined
with its mode, rung and height, each region tinted, the rhythm steps as labelled bands, page margin
hatched grey and anything unclaimed hatched **red**. The verdict panel prints the spine, the rows,
the **solo ladder with the realised rung and a ✓/✗ against the resolution**, declared rhythm against
measured rhythm, vertical air, pair termination, the page-margin and unclaimed runs, and the media
contract.

## The controls

| | fails when |
| --- | --- |
| **H1** | a column's rendered owner is not the declared one; a solo row does not occupy its realised rung exactly; the solo rows sit on more than one axis |
| **H2** | free width inside a paired or workspace row that nothing declares, or a containment that is not symmetric |
| **H3** | a row is taller than the regions that begin in it, or a rhythm step renders at a height it did not declare |
| **H4** | siblings sharing a row do not share one origin, or a pair terminates further apart than declared |
| **H5** | a `fill` object is painted narrower than its slot |
| **H6** | a `contain` object has no resolved anchor |
| **H7** | doubling the payload changes the blueprint, the rung or a column |
| **H8** | a render uses a blueprint outside the pattern's finite approved set |
| **H10** | a region carries space past its own ink or visible surface, or a declared step does not measure as itself |
| **H11** | a one-region row stays on a smaller approved rung while its preferred rung is feasible |
| **H12** | a figure surface's outer box reaches past the media region the blueprint assigned |
| **H13** | the plot, the caption or a media-local control sits outside the figure surface |
| **H14** | the plane is painted at a size other than the one it was solved for, or its units stop being equal |
| **H15** | turning the surface on changes the blueprint, spine, cardinality, rung or split |
| **H16** | the caption is rendered inside the plot rather than on the surface |
| **H17** | the plot's own chrome moves the figure surface or changes the composition |
| **H18** | the same authored blueprint has a different structural identity on another surface |
| **H19** | two members of one geometry class, on one surface at one role, get different blueprints or different rungs |
| **H20** | an approved blueprint's single rung cannot carry a member of its own class, or a realised rung is not the declared one |

Eleven more are refused at the table before anything renders: a blueprint with no spine; a rung whose
page margin cannot be symmetric on a centred axis; a rung outside the region's span family; prose
past the measure; a preferred rung that is not approved; **a media row that approves more than one
rung**; a vertical value doing horizontal work; a pair with no tolerance; a workspace row that is not
`vertical: designed`; a selection naming an unapproved blueprint; an unnamed rhythm step.

**Every one is driven to failure on purpose in the same run.** Four findings came out of that:

- the measure and the axis bound only when a blueprint was *written down*, not when a rung was
  *realised* — so a forced rung could have put prose past the measure. Found by a drive that did not
  fire; `layout` now binds both at realisation too.
- a blanket namespace rename caught `.cp-key`, which is the kit's key-idea card and not board
  chrome, so the support region rendered with the board's legend styles. Found by looking at the
  picture, not by a control.
- **H19 had an escape hatch.** While a media row could approve two rungs, one blueprint landing on
  two rungs was reported as a *finding* rather than a failure, because nothing had been tuned — the
  shape had merely failed to fit its preferred rung. With one rung per media row and H20 refusing a
  rung that cannot carry its class, that route is closed and H19 is now categorical.
- **H20's second drive did not fire on its first run.** It rewrote the media rung to `inset` on a
  record that already declared `inset` — a no-op that read as a control that could not fail. It now
  drives to a rung the record does not declare.

## Frozen

| | |
| --- | --- |
| **Treatment A** | the figure surface takes the media region; the plot is solved inside it |
| **Ownership** | `blueprint region → figure surface → plot → caption` |
| **Caption** | owned by the **surface**, never the plot |
| **Boundaries** | region · surface · plot · caption, independently inspectable |
| **Role** | authored, never inferred |
| **Vocabulary** | six classes, boundaries **frozen** — `tall` < 0.70 · `portrait` < 0.90 · `balanced` < 1.20 · `landscape` < 1.75 · `wide` < 2.50 · `panoramic`, read as width:height, half-open upward |
| **Selection** | `presentationRole × geometryClass × surface → ONE named blueprint`, which names **one** rung |
| **One rung** | a media row may declare exactly one. A second rung is a ladder a ratio can climb at realisation time |
| **`primary`** | is not `wider`. For a tall object primacy comes from page structure, not span |
| **Acceptance** | **categorical**: within one class, one surface, one role — one blueprint, one rung |
| **Convergence** | a *neighbouring* class may converge on the same blueprint. What is forbidden is the exact ratio changing the rung afterwards |
| **Responsive identity** | the rungs may change; the blueprint may not |
| **Plot chrome** | cannot change the composition |
| **Internal surface whitespace** | valid *owned* space, categorically unlike an unowned column |
| **Treatment B** | rejected, kept as a counterexample |

The invariant, in full:

```
within one pattern family:
  role × geometry class × surface
    → one named blueprint
      → one declared rung
```

**Geometry calibration is finished.** No further width or height is tuned unless a *real authored
page* produces a categorical failure under this contract.

The **shipping** grammar has not moved. `docs/atlas/worked-examples/src/atlas.json` still declares the
four-class `mediaGeometry.bands` that the `visual.side` switch point and the `figure-container` gate
are built on, and `classOf()` still reads it. Adopting six classes there is a migration, and it
belongs with the blueprint system rather than ahead of it.

## The geometry calibration atlas

Identical content — the same function, the same line, the same two points — with nothing varying but
the authored **domain**, so the only difference between two renders is the shape of the plane. Six
canonical shapes (photographed, `G__*`) and thirteen boundary probes (measured, not photographed,
`B__*`), each at three roles: **57 renders**. It chooses no widths and measures no prose.

Realised height and its share of a 900px desktop viewport are recorded as **diagnostic evidence
only**. Nothing reads them back.

**It is finished.** The vocabulary, the boundaries and the mapping are frozen. Nothing below is
re-tuned unless a *real authored page* produces a categorical failure under the contract.

### The correction that came first

The calibration set's original headline — *`primary/portrait` has no approved composition for a
0.45:1 shape* — **was not true**, and was not a fact about the design. It was a defect in the
measuring instrument.

`boxForWidth` seeds its height search at `(ys/xs)·(w−50) + 100`, guessing 50px of horizontal chrome
and 100px of vertical, then scans ±80px for an equal-unit box. The seed's error is
`(ys/xs)·Δgx + Δgy` — **amplified by the aspect ratio**. At 1:1 a ±80 window always caught it; at
20:9 the tall plane needed offset **98** at 722px, **148** at 956px and **190** at 1152px, so every
wide span silently missed and the atlas read "no square box found" as "no equal-unit box exists".

The solver now re-seeds once from what it measured — a painted box reports px-per-unit on each axis,
so the height it is short by is exactly `ys·(x − y)` — and scans again. The fix is **additive**: the
original ±80 scan runs first and unchanged, so every box that already solved returns the same first
hit. `corpus-identity` 250/250 byte-identical, `figure-render` 240/240 identical, `figure-container`
65/65, `measure-surface` 191+180, `label-placement` 927/927 — all unmoved.

With that fixed, the second original finding dissolved too: `tall` at `explanatory` fell back to
`spine` 564 only because `expanded` 760 had been *mismeasured* as infeasible. Both `tall` and
`portrait` would now take 760 — which is exactly why the class still has to be split **by design**.
A 0.45:1 object at 760px is 1572px tall. The composition must say so; a failed search must not.

### The mapping, frozen

| class | w:h | supporting | explanatory | primary |
| --- | --- | --- | --- | --- |
| `tall` | < 0.70 | `spine-supporting` `inset` 4 | `spine-tall` `narrow` 6 | `stage-tall` `expanded` 8 |
| `portrait` | 0.70 – 0.90 | `spine-supporting` `inset` 4 | `spine-narrow` `expanded` 8 | `stage-primary` `wide` 10 |
| `balanced` | 0.90 – 1.20 | `spine-supporting` `inset` 4 | `spine-narrow` `expanded` 8 | `stage-primary` `wide` 10 |
| `landscape` | 1.20 – 1.75 | `spine-supporting-wide` `narrow` 6 | `spine-narrow` `expanded` 8 | `stage-primary` `wide` 10 |
| `wide` | 1.75 – 2.50 | `spine-supporting-wide` `narrow` 6 | `stage-wide` `wide` 10 | `stage-full` `full` 12 |
| `panoramic` | ≥ 2.50 | `spine-supporting-wide` `narrow` 6 | `stage-panorama` `full` 12 | `stage-full` `full` 12 |

### The `tall → portrait` line moved from 0.60 to 0.70

The first freeze put it at 0.60 and the probes showed why that was wrong: an object could become
**slightly less tall** and be promoted from the eight-column tall composition to the ten-column
portrait one, ending up **substantially taller on the page**. A 0.63 shape came out at 956 × 1570 —
**1.74 desktop viewports** — against 760 × 1371 for a 0.57 shape one class down. A categorical
boundary that makes the result worse the moment you cross it is the exact failure the classes exist
to prevent.

0.67 / 0.70 / 0.73 were probed around the new line. The transition is monotone and unremarkable:

| w:h | class | explanatory | primary |
| --- | --- | --- | --- |
| 0.63 | `tall` | 564 × 969 · 1.08 | 760 × **1259** · **1.40** |
| 0.67 | `tall` | 564 × 923 · 1.02 | 760 × 1195 · 1.33 |
| **0.70** | `portrait` | 760 × 1152 · 1.28 | 956 × **1432** · **1.59** |
| 0.73 | `portrait` | 760 × 1113 · 1.24 | 956 × 1381 · 1.53 |
| 0.75 | `portrait` | 760 × 1088 · 1.21 | 956 × 1349 · 1.50 |

The shape that moved the line, 0.63 at `primary`, goes from **1570px (1.74 vp)** to **1259px
(1.40 vp)** — 311px shorter, and on the composition it visually belongs to. The worst case anywhere
on the portrait side falls from 1.74 to **1.59**.

**The step itself does not go away, and should not be claimed to.** Any categorical line between an
8-column and a 10-column composition puts a step in the realised height of upright media — cross it,
the object gets wider, and a plane that preserves its geometry gets taller with it. Moving the line
changes *where* the step falls and how tall the worst case on the far side is; it cannot remove it.
Measured either side of every declared boundary:

| boundary | supporting | explanatory | primary |
| --- | --- | --- | --- |
| **0.70** 0.67 vs 0.70 | 631 → 613 (−18) | 923 → 1152 (**+229**, +0.26 vp) | 1195 → 1432 (**+237**, +0.26 vp) |
| **0.90** 0.87 vs 0.93 | 535 → 514 (−21) | 964 → 915 (−49) | 1190 → 1125 (−65) |
| **1.20** 1.17 vs 1.23 | 452 → 600 (**+148**, +0.17 vp) | 766 → 738 (−28) | 934 → 898 (−36) |
| **1.75** 1.72 vs 1.78 | 490 → 480 (−10) | 583 → 680 (+97) | 697 → 790 (+93) |
| **2.50** 2.45 vs 2.55 | 407 → 400 (−7) | 546 → 609 (+63) | 626 → 609 (−17) |

Diagnostic only — nothing reads these back, and no composition is selected from them.

### What the probes found

Nineteen shapes (six canonical, photographed as `G__*`; thirteen boundary probes, measured as
`B__*`) × three roles = **57 renders**. Realised media box and share of a 900px desktop viewport:

| w:h | class | supporting | explanatory | primary |
| --- | --- | --- | --- | --- |
| 0.45 | `tall` | 368 × 819 · 0.91 | 564 × 1213 · 1.35 | 760 × 1582 · 1.76 |
| 0.57 | `tall` | 368 × 704 · 0.78 | 564 × 1048 · 1.16 | 760 × 1371 · 1.52 |
| 0.63 | `tall` | 368 × 657 · 0.73 | 564 × 969 · 1.08 | 760 × 1259 · 1.40 |
| **0.67** | `tall` | 368 × 631 · 0.70 | 564 × 923 · 1.02 | 760 × 1195 · 1.33 |
| **0.70** | `portrait` | 368 × 613 · 0.68 | 760 × 1152 · 1.28 | 956 × 1432 · 1.59 |
| **0.73** | `portrait` | 368 × 594 · 0.66 | 760 × 1113 · 1.24 | 956 × 1381 · 1.53 |
| 0.75 | `portrait` | 368 × 565 · 0.63 | 760 × 1088 · 1.21 | 956 × 1349 · 1.50 |
| **0.87** | `portrait` | 368 × 535 · 0.59 | 760 × 964 · 1.07 | 956 × 1190 · 1.32 |
| **0.93** | `balanced` | 368 × 514 · 0.57 | 760 × 915 · 1.02 | 956 × 1125 · 1.25 |
| 1.04 | `balanced` | 368 × 482 · 0.54 | 760 × 837 · 0.93 | 956 × 1025 · 1.14 |
| **1.17** | `balanced` | 368 × 452 · 0.50 | 760 × 766 · 0.85 | 956 × 934 · 1.04 |
| **1.23** | `landscape` | 564 × 600 · 0.67 | 760 × 738 · 0.82 | 956 × 898 · 1.00 |
| 1.50 | `landscape` | 564 × 509 · 0.57 | 760 × 640 · 0.71 | 956 × 771 · 0.86 |
| **1.72** | `landscape` | 564 × 490 · 0.54 | 760 × 583 · 0.65 | 956 × 697 · 0.77 |
| **1.78** | `wide` | 564 × 480 · 0.53 | 956 × 680 · 0.76 | 1152 × 790 · 0.88 |
| 2.00 | `wide` | 564 × 430 · 0.48 | 956 × 626 · 0.70 | 1152 × 724 · 0.80 |
| **2.45** | `wide` | 564 × 407 · 0.45 | 956 × 546 · 0.61 | 1152 × 626 · 0.70 |
| **2.55** | `panoramic` | 564 × 400 · 0.44 | 1152 × 609 · 0.68 | 1152 × 609 · 0.68 |
| 3.00 | `panoramic` | 564 × 378 · 0.42 | 1152 × 601 · 0.67 | 1152 × 601 · 0.67 |

**Acceptance holds.** Every class, on every surface, at every role, resolved to one named blueprint
and one rung across all of its members. No fallback fired anywhere, because there is nowhere left to
fall back to.

`portrait` and `balanced` select the same blueprint at all three roles here, and **that is accepted,
not a defect.** One composition family failing to distinguish square-ish media from upright media
does not make them globally the same thing, and they may diverge in another family later. The
semantic distinction costs almost nothing; manufacturing different widths to justify the two labels
would be worse. Recorded in `frozen.convergences`.

At the top of the ladder the role stops being expressible as span: `panoramic` at `explanatory` and
at `primary` both take `full` 12, because there is no rung above `full`.

### `primary` is not `wider`

`stage-tall` is the blueprint that says so. A tall object cannot express importance by span — the
0.45 shape measures 760 × 1582 at eight columns, and would be 956 × 1965 at ten and 1152 × 2359 at
twelve. So it takes **eight**, and buys its primacy from the page instead. The difference from
`spine-tall` is structural, not just a rung: there the object sits **inside** the reading column
(media 6, spine 6, one edge); here it **breaks out past** the reading on both sides (media 8 against
a 6-column spine), so the reading is visibly subordinate and the page reads as built around the
figure. That difference is the role, and the role is authored.

## `presentationRole × geometryClass × surface → approved named blueprint`

Not `role → rung`. **The role says how prominent the object should be; the geometry says which
composition can express that prominence well.** Neither alone picks a width, and no rung is reached
for generically.

### The portrait ladder

| role | blueprint | rung | surface | plot | units |
| --- | --- | --- | --- | --- | --- |
| supporting | `spine-supporting` | `inset` 4 | 368 × 528 | 330 × 436 | 28.55 / 28.49 |
| explanatory | `spine-narrow` | `expanded` 8 | 760 × 998 | 722 × 906 | 62.67 / 62.65 |
| **primary** | `stage-primary` | `wide` 10 | **956 × 1234** | 918 × 1142 | 79.82 / 79.79 |
| *candidate, not frozen* | `stage-primary-full12` | `full` 12 | *1152 × 1469* | 1114 × 1377 | 96.77 / 96.82 |

`stage-primary` was `stage-primary-portrait` until the vocabulary split. It is the approved primary
composition for `portrait`, `balanced` **and** `landscape`, and a name claiming one of the three was
reading as a promise the catalogue does not make.

### The wide ladder — the same roles, a different geometry

| role | blueprint | rung | surface | plot | units |
| --- | --- | --- | --- | --- | --- |
| supporting | `spine-supporting-wide` | `narrow` 6 | 564 × 355 | 526 × 263 | 19.51 / 19.40 |
| explanatory | `stage-wide` | `wide` 10 | 956 × 521 | 918 × 429 | 33.99 / 33.92 |
| primary | `stage-full` | `full` 12 | 1152 × 601 | 1114 × 509 | 41.20 / 41.02 |

The same three roles produce **368 / 760 / 956** for a portrait plane and **564 / 956 / 1152** for a
wide one. That is the point: the role is the same, the composition is not.

### Primary does not mean maximum

`R3b` is the full-grid primary portrait, kept as a **candidate** and rendered beside `R3` for
comparison. Nothing is mathematically wrong with it and the page scrolls — and because a portrait
plane preserves its geometry, twelve columns makes it **1152 × 1469**.

So **`full` is no longer in any portrait span family.** A full-width primary portrait is not
discouraged; it is *inexpressible* — `select` cannot name it, and a blueprint that tries to approve
that rung for portrait media is refused before anything renders. It survives only in the `candidates`
bucket, which is validated and renderable and unreachable from `select`.

A primary portrait dominates through **vertical presence, surrounding whitespace and being the
principal object** — 956px of figure against a 760px reading — not by consuming every column. Full
width stays where the geometry benefits from width: wide planes, timelines, wide diagrams,
interactives, workspaces.

## The figure surface (treatment A)

```
blueprint → media region → figure surface → plot
```

The blueprint owns the region. The surface consumes the region. The plot is solved *inside* the
surface, preserving the mathematics. Treatment B is rejected (`X__treatment-B__REJECTED`):
shrink-wrapping puts the plate at 564px, exactly the width of the six-column reading spine below it,
so the composition says eight columns while the eye still sees six.

### Four boundaries

| | boundary | what it is |
| --- | --- | --- |
| **1** | **region** | the grid columns the blueprint assigned |
| **2** | **surface** | the complete visual object occupying that geometry |
| **3** | **plot** | the mathematical drawing |
| **4** | **caption** | describes the whole media object — **owned by the surface** |

Internal whitespace inside a surface is owned by the media object and is categorically different from
unused grid columns — the legend's sixth entry.

The caption: the plot is the mathematical drawing; the caption describes the **complete media
object**. The engine may supply the content; the surface renders and owns it, any `tp-fig-cap` emitted
inside a plot is lifted out, and **H16** fails a caption found there. That is what generalises to
images, diagrams, videos and interactives — `surface header · media payload · local controls ·
caption`.

### Responsive forms, and chrome

`spine-narrow` at desktop / tablet / phone realises `expanded` 8 → `expanded` 8 → `spine` 4. The rungs
differ; **H18** requires the blueprint, its role and its rows to be identical.

`P__plot-chrome-cannot-move-the-surface` renders `spine-narrow` with axis labels at 21px bold. The
span is still eight columns, the surface still 760 × 998, the plot still the 722 × 906 that was
solved. **H17** compares the pair; its drive is a surface sized by its content instead of its region.

## Deliberately not done

- **No sweep.** `visual.compare` and the remaining `visual.explanation` blueprints are migrated to
  the solo/paired schema — and now to the six-class vocabulary — so the build stays whole; they are
  not re-rendered or re-approved. `visual.compare` folds `tall` and `panoramic` into their old
  neighbours because that is what the four-class table said; whether either wants its own composition
  there is a question for the pass that re-approves that pattern.
- No other pair split is tried — not 4/8, not 5/7, not 6/6 — until the portrait case passes.
- Nothing is wired into the product, into CI, or into the lesson. No maths content is authored.

## Still open

- **`portrait` ≡ `balanced` in this family.** Accepted and deliberately not merged — see above. A
  later composition family may distinguish them; nothing is manufactured to make it happen now.
- **The role stops being expressible as span at `full`.** `panoramic` explanatory and primary
  converge because there is no rung above twelve columns. Expressing the role there means page
  structure, as `stage-tall` does at the other end, or accepting the convergence.
- **The six-class vocabulary is the blueprint system's only.** The shipping grammar still has four,
  and the migration is not attempted here.
- **`tall` is open below.** Nothing is proven for a shape narrower than the 0.45 floor that was
  probed.

The workspace's height is **designed** (a 480px token) and the reference-plus-questions stack's is
**derived**, so the two columns of `practice.workbook` terminate **117px** apart. A `workspace` row
is exempt from the termination contract by definition, so this is legal — and it is the same cliff
H4 exists to catch elsewhere. Should a `workspace` row declare a tolerance too, and should its
designed height come from the blueprint rather than a CSS token?
