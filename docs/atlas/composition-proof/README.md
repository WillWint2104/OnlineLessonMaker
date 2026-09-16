# The Composition Proof Atlas — spines, the five spaces, and two frozen blueprints

**Nothing here is wired into anything.** `docs/atlas/composition/src/` is untouched, the lesson is
untouched, `lesson-studio.html` has been byte-identical since `41d40a8`. This is a prototype of one
architectural layer, deliberately narrow.

```
node scripts/composition-proof-atlas.mjs
CP_ONLY=worked.paired CP_SURFACE=desktop   # a slice
```

## The finding this pass is built on

Five kinds of emptiness had been collapsed into one idea, and they are not the same thing. They are
now kept apart everywhere — in the schema, in the judge, in the overlay, and in the verdict panel —
and there is no generic whitespace rule, no occupancy fraction and no dead-space percentage anywhere.

| | space | verdict |
| --- | --- | --- |
| **1** | **page margin** — the grid outside the blueprint's spine, and the symmetric containment of a centred grid row | **valid, intentionally empty, needs no semantic owner** |
| **2** | **blueprint rhythm** — the named step between two semantic regions (`tight 16` · `normal 32` · `section 56`) | valid; a real grid row of exactly that height |
| **3** | **internal block space** — typography, the space between steps, the padding a *visible* surface needs | owned by the block; **may never reach a region's exterior** (H10) |
| **4** | **unclaimed composition space** — free width inside an **active row** | **always invalid** (H2) |
| **5** | **pair imbalance** — all width owned and the pair still terminates too far apart | **separate contract** (H4) |

## The spine — the alignment primitive

A blueprint declares **one spine per surface**: an axis (`centre` or `left-edge`) and a span. A row
is then one of exactly two things.

- **a spine row** — holds one named region and occupies the spine **exactly**. The grid outside the
  spine is **page margin** (space 1): valid, and it needs no owner.
- **a grid row** — names a split of the master grid and is an **active row**. Every one of its
  columns must be owned by a region, or be the symmetric containment of a centred split.

> A centred six-column spine and a six-column region at the left of a twelve-column active row occupy
> the same six columns and are **not the same thing**. The first declares the page's axis and puts its
> margin outside the composition; the second leaves half of an active row unexplained.

The spine primitive exists so the renderer cannot confuse them, and so there is **one explicit owner
of the alignment relationship** rather than an edge property inferred per row. A control refuses a
blueprint with no spine, a centred spine that cannot be symmetric, and a spine row that also names a
split.

## The ownership boundary — frozen

| the **block** owns | the **blueprint** owns |
| --- | --- |
| typography | region placement |
| spacing inside the component | columns and spans |
| spacing between steps, equations and the like | alignment and spines |
| padding required by a **visible** surface | pairing |
| | **all** spacing between semantic regions |

A semantic region **hugs its meaningful ink or visible surface at its exterior boundary**. Invisible
component margin and padding may not silently add a second page-level rhythm value. This is enforced
by **H10**, measured from the rendered DOM, and the atlas prints declared against measured on every
boundary of every board.

**Result.** Every declared step now measures as itself:

```
visual.explanation/spine-narrow   media→section  56px declared · 56px measured ✓
                                  interpretation→normal 32 · 32 ✓
worked.paired/cases-6-6           intro→section  56 · 56 ✓      cases→section 56 · 56 ✓
practice.workbook/workbook-5-7    intro→normal   32 · 32 ✓      reference→normal 32 · 32 ✓
```

Before this pass, `worked.paired`'s declared 56px read as **80.5px**.

Two findings came out of enforcing it, and both are reported rather than patched over:

- `composition.css` draws a **separator on `[data-slot="synthesis"]`** (`border-top` + 20px padding).
  Under the frozen table that is a *visible surface*, so the region's ink starts at the rule and the
  step measures 56px to it — correct. But a rule drawn **between two semantic regions** is blueprint
  furniture living in block CSS, and it should migrate when this layer is adopted.
- the H10 drive first injected padding on `synthesis`, which paints its own top edge, so the control
  **could not fire**. That was a bad test, not a bad control; it now injects on a region that paints
  no surface of its own.

## The two frozen blueprints

### `visual.explanation / spine-narrow` — GOLDEN

```
spine: centre, 6 columns
  media           → on the spine
  section (56px)
  interpretation  → on the spine
  normal (32px)
  support         → on the spine
```

One axis, one width. The reading narrows **with** the object rather than standing wider than it. The
white either side is page margin — outside the active content spine, symmetric about the declared
axis, and valid.

### `worked.paired / cases-6-6` — GOLDEN

```
spine: left-edge, 8 columns
  intro      → on the spine          (page margin: columns 9–12)
  section (56px)
  cases      → grid 6/6, paired, origin top, imbalanceMax 180px
  section (56px)
  synthesis  → on the spine          (page margin: columns 9–12)
```

Measured: siblings **0px apart**, both rows hug exactly, both section steps measure 56px. The pairing
has a visual argument because the blueprint **declares** all three of its structural relationships —
one alignment origin, identical width, a termination tolerance — rather than deriving any of them
from how much was written.

## The two retained counterexamples

| board | control | why it is kept |
| --- | --- | --- |
| `counterexample__unowned-half-row` | **H2** | the canonical must-never-happen-again: six columns occupied at the left of a twelve-column active row, the other six declared by nothing. **The same six columns as `spine-narrow`, and not the same composition.** The shipped page measured 683px of graph at x = 60 in a row ending at x = 1212 — 469px owned by nothing, at a width the grid does not name. |
| `counterexample__side-study-imbalance` | **H4** | `media-5 + explanation-7`. Its row **owns all twelve columns** and the page is still wrong: the siblings terminate **535.5px** apart against the 160px it declared. Complete column ownership is **necessary and not sufficient**, which is why pair termination is a separate contract. |

`side-study` stays `withdrawn` in the catalogue with its measurement. For tall explanatory media the
approved answer is `spine-narrow`, not a more elaborate side-by-side arithmetic — and no other split
is tried until this case passes.

## The stress test — `practice.workbook / workbook-5-7`, first pass

The genuinely different, workspace-shaped page, expressed with the same four ideas and nothing new:

```
spine: left-edge, 8 columns
  intro      → on the spine
  normal (32px)
  reference  → grid 5/7 [reference | workspace]   workspace row, workspaceSlot: workspace
  normal (32px)  ← declared WITHIN `reference`, so the workspace is not cut by it
  questions  → grid 5/7 [questions | workspace]   workspace row
```

It fits. No resolver, no new primitive, and one genuine extension: a rhythm step may declare
`gapWithin`, so **a region that spans several rows is not cut by the rhythm beside it** and the
blueprint still owns the spacing between the two regions that the gap actually separates. Every
column is owned, every row hugs, both steps measure 32px.

**What it surfaces, and what it is for.** The workspace's height is **designed** (480px from a design
token) and the reference-plus-questions stack's height is **derived** — so the two columns terminate
**117px** apart. A `workspace` row is exempt from the termination contract by definition, so this is
legal, and it is the same kind of cliff H4 exists to catch elsewhere. The open question:

> Should a `workspace` row also declare a termination tolerance, and should the workspace's designed
> height come from the blueprint rather than from a CSS token?

Reported, not decided, and not patched by measuring anything.

## Reading a board

Each board shows the page twice — as it renders, and with **every region and every piece of white
classified** under the five spaces, with a legend. The overlay draws: the 12-column master grid; the
**spine**, as a single band across the whole page; each row outlined with its split, mode and height;
each region tinted and labelled with its columns; the rhythm steps as bands labelled by name and px;
page margin hatched in grey; and anything unclaimed hatched in **red**. The verdict panel prints the
spine, the rows, **declared rhythm against measured rhythm**, vertical air, pair termination, the
page-margin and unclaimed column runs, the media contract, and `EVERY WHITE HAS AN OWNER: YES / NO`.

## The controls

| | fails when |
| --- | --- |
| **H1** | a column's rendered owner is not the declared one; a spine row does not occupy the spine exactly; the spine rows do not share one axis and one width |
| **H2** | free width inside an **active row** that nothing declares, or a containment that is not symmetric |
| **H3** | a row is taller than the regions that begin in it, or a rhythm step renders at a height it did not declare |
| **H4** | siblings sharing a row do not share one origin, or a pair terminates further apart than declared |
| **H5** | a `fill` object is painted narrower than its slot |
| **H6** | a `contain` object has no resolved anchor |
| **H7** | doubling the payload changes the blueprint or moves a column |
| **H8** | a render uses a blueprint outside the pattern's finite approved set |
| **H10** | a region carries space past its own ink or visible surface, or a declared step does not measure as itself |

Eight more are refused at the table before anything renders: a blueprint with no spine; a centred
spine that cannot be symmetric; a spine row that also names a split; a pair with no tolerance; a
`workspace` row whose named workspace is not a workspace-typed region; a selection naming an
unapproved blueprint; prose on a spine past the reading measure; a rhythm step that is not one of the
named ones.

**Every one is driven to failure on purpose in the same run.** A control that has never been seen to
fail is a comment.

## Deliberately not done in this pass

- **No sweep.** `visual.compare`, `worked.single` and the other `visual.explanation` blueprints are
  migrated to the spine schema so the build stays whole; they are **not re-rendered or re-approved**,
  and their boards are not in this directory.
- No other pair split is tried — not 4/8, not 5/7, not 6/6 — until the portrait case passes.
- Nothing is wired into the product, into CI, or into the lesson. No maths content is authored.
