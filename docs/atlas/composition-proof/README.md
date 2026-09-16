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

Ten more are refused at the table before anything renders: a blueprint with no spine; a rung whose
page margin cannot be symmetric on a centred axis; a rung outside the region's span family; prose
past the measure; a preferred rung that is not approved; a vertical value doing horizontal work; a
pair with no tolerance; a workspace row that is not `vertical: designed`; a selection naming an
unapproved blueprint; an unnamed rhythm step.

**Every one is driven to failure on purpose in the same run.** Two findings came out of that:

- the measure and the axis bound only when a blueprint was *written down*, not when a rung was
  *realised* — so a forced rung could have put prose past the measure. Found by a drive that did not
  fire; `layout` now binds both at realisation too.
- a blanket namespace rename caught `.cp-key`, which is the kit's key-idea card and not board
  chrome, so the support region rendered with the board's legend styles. Found by looking at the
  picture, not by a control.

## The figure surface — proposed, not enabled

`figureSurface.enabled: false`. Both treatments are rendered for comparison and **neither is frozen**.

Both successful pages were structurally correct and neither said clearly enough that the graph, its
caption and its graph-local controls are **one visual object**, separate from the prose that
interprets it. The separation existed in the blueprint and not in the courseware.

The surface is a **presentation primitive owned by the media region, applied after layout has
resolved**:

```
blueprint/grid → row cardinality → solo rung / paired / workspace → realised media geometry
              → figureSurface { figure · local controls · caption }
```

It is not a resolver, not an occupancy mechanism, not a new grid owner, not a way to fill dead
space, not permission to stretch a media object, and not permission to convert a bad pair into a
good one. Four controls hold it to that.

### Three boundaries, kept apart

| | boundary | what it decides |
| --- | --- | --- |
| **1** | **region** | the grid columns the blueprint assigned — where the object may exist |
| **2** | **surface** | visually groups the media, its caption and its media-local controls |
| **3** | **plot** | the mathematical coordinate plane, which the surface never touches |

The overlay draws all three as three separate boxes, and adds a **sixth** space to the legend:

> **6 · internal figure-surface space** — width left over *inside* an owned surface. Intentional and
> valid. It is not the old defect: empty grid columns in an **active row** are unowned composition
> space and stay invalid.

### The A/B question, measured

| | surface | plane | solved | units | region |
| --- | --- | --- | --- | --- | --- |
| **A** portrait, expanded | 760 × 998 | 722 × 906 | 722 × 906 | 62.67 / 62.65 | 760 (0px unclaimed) |
| **B** portrait, expanded | 564 × 763 | 526 × 671 | 526 × 671 | 45.50 / 45.56 | 760 (196px slot residue) |
| **A** wide, full | 1152 × 601 | 1114 × 509 | 1114 × 509 | 41.20 / 41.02 | 1152 (0px) |
| **B** wide, full | 956 × 521 | 918 × 429 | 918 × 429 | 33.99 / 33.92 | 1152 (196px) |

**A is the better treatment, and the reason is structural rather than a preference.** Under B the
plate ends up 564px — *exactly the width of the six-column reading spine below it* — so the page
reads as the six-column page again. **B re-creates, at the object level, the under-realisation that
H11 exists to reject at the row level:** the row still realises `expanded`, H11 still passes, and
the eye still sees six columns. B also forces the slot to `contain`, because under `fill` a surface
narrower than its region is the defect the contract was built to catch.

Under A the region reads as deliberately occupied, the plane keeps its own correct geometry, and the
38px left over is internal surface space inside an object the composition already owns.

### What H14 caught on the first run

The first build solved the plane for the **region** width and let the surface clamp it afterwards —
760px of plane squeezed into 722px of container, painting **62.57px per x-unit against 65.94 per
y-unit**. The mathematics was distorted by a border. H14 caught it immediately.

The fix is the principle: **the plane is solved for the width it actually has**, region minus the
surface's declared chrome. The chrome is now a declared number in `blueprints.json` rather than a
CSS coincidence, and H14 asks the direct question — is the plane painted at the size it was solved
for? — rather than comparing two renders' aspect ratios to each other. That first version was
mis-calibrated: a re-solved plane re-rounds its axis-label chrome, so the two aspects differed by
1.8% for entirely legitimate reasons.

### The rejections all survive a border

| board | still fails |
| --- | --- |
| **C** `half-row-with-a-surface` | **H2** — columns 7–12 of an active row are declared by nothing, and a border cannot buy them |
| **D** `side-study-with-a-surface` | **H4** — the siblings still terminate 535.5px apart; a container does not fix a relationship |

**E** `practice.workbook` keeps its designed 5/7 workspace relationship — the surface groups the
reference and the ladder still does not touch the row. **F** `worked.paired` gets **no** surface:
two related *textual* regions already read correctly, and this is a media boundary, not a
put-everything-in-cards direction.

## Deliberately not done

- **No sweep.** `visual.compare` and the remaining `visual.explanation` blueprints are migrated to
  the solo/paired schema so the build stays whole; they are not re-rendered or re-approved.
- No other pair split is tried — not 4/8, not 5/7, not 6/6 — until the portrait case passes.
- Nothing is wired into the product, into CI, or into the lesson. No maths content is authored.

## Still open

The workspace's height is **designed** (a 480px token) and the reference-plus-questions stack's is
**derived**, so the two columns of `practice.workbook` terminate **117px** apart. A `workspace` row
is exempt from the termination contract by definition, so this is legal — and it is the same cliff
H4 exists to catch elsewhere. Should a `workspace` row declare a tolerance too, and should its
designed height come from the blueprint rather than a CSS token?
