# The Composition Proof Atlas — a proposal

**Nothing here is wired into anything.** `docs/atlas/composition/src/` is untouched, the lesson is
untouched, `lesson-studio.html` has been byte-identical since `41d40a8`, and `24667ce` remains the
clean checkpoint. This directory is a prototype of one architectural layer, built to be looked at
before it is adopted.

```
node scripts/composition-proof-atlas.mjs
CP_ONLY=visual.explanation CP_SURFACE=desktop   # a slice
```

## What discrete spans did not fix

The slot-span layer made every slot's width nameable. It did not make a **page**. A pattern was
still a collection of *independently* legal slots, so both of these passed every rule there was:

- a six-column object at the **left** of a twelve-column row, with the other six columns belonging
  to nothing;
- any amount of vertical structure at all, because nothing in the system had an opinion about rows.

The shipped lesson proves the first one. In
`docs/atlas/lesson/lesson-symmetry-visual-explanation-desktop.png` the graph is painted **683px wide
at x = 60** in a row that runs to x = 1212 — **469px of an active row with no semantic owner** — and
683px is not a width this grid names (its neighbours are 662px and 760px). The width came from an
authored `mediaSize` token, decided in isolation from the composition. The phone render of the same
page is correct, and owns every pixel of its width, which is the proof that the information was
never the problem.

## The move

> **A pattern resolves to a named composition blueprint, not to a set of spans.**

A blueprint fixes the whole page: which rows exist, which columns each region takes, whether regions
share a row or follow one another, **how each row behaves vertically**, and the **named step**
between one semantic region and the next.

```
lesson intent → pattern → approved composition blueprint → slots and rows
              → media geometry selects among the approved blueprints → content fills it
```

Never `content → measurements → slot sizes → hope the result looks balanced`. Every arrow is a
lookup from a categorical input — the surface, the geometry class, or an authored form. Nothing
measures prose, counts steps or computes an occupancy fraction. The atlas measures the *result* in
order to judge it; nothing it measures is fed back into a layout decision.

## The most important rule

**No active row may contain unexplained columns.** A row holding one six-column media slot may not
take columns 1–6 and call 7–12 margin. It must be

- deliberately centred within the row, or
- accompanied by another semantic region, or
- given a wider approved footprint, or
- moved into a different row composition.

Reading margin is legal **around** a coherent composition. It is not a licence for an unfinished
half-row, and **free columns beside media are never a margin**, because media has no reading measure
to be bound by.

## The row contract — the second axis

| mode | means | who may use it |
| --- | --- | --- |
| **hug** | the row is exactly as tall as its contents; nothing stretches to match unrelated material | everything, overwhelmingly |
| **paired** | two siblings deliberately share a row and top-align on a **declared origin**, with a declared **`imbalanceMax`** and a **`pairReason`** | two cases of one kind, two worked examples |
| **workspace** | a deliberately substantial area whose height is designed rather than derived | an interactive, a workbook page |

A `paired` row that has not said how far its children may end apart has not been designed, and the
build refuses it. The atlas then measures what they actually do.

## Rhythm

The gap between two semantic regions is a **named step** the blueprint declares at that boundary —
`tight 16 · normal 32 · section 56`, from the 8px scale in `grid.json`. It is a real grid row of that
exact height, not the sum of whatever paddings the two regions happen to carry. A conclusion takes
`section`; regions inside one movement take `normal`.

This is the whole difference between `worked.single/flow` and `worked.single/split`: identical
widths, different rhythm, plus a rule at the one boundary that takes a `section` step.

## The catalogue

| pattern | blueprints | selected by |
| --- | --- | --- |
| `visual.explanation` | `spine-narrow` · `spine-reading` · `stage-full` · `stack` | media geometry |
| `visual.compare` | `compare-plain` · `compare-shared-centred` · `compare-shared-full` · `stack` | media geometry (`none` → `compare-plain`) |
| `worked.single` | `flow` · `split` | the authored form |
| `worked.paired` | `cases-6-6` · `cases-stacked` | surface |

`worked.paired` **did not exist** and is designed here: `intro-8 / worked-6-6 / synthesis-8`, with
the pair declaring `imbalanceMax: 180px`. It is the same legitimate pairing as `visual.compare`'s two
cases — both children have a height the author did not write directly, and identical width is the
argument.

`spine-narrow` answers an open question from the span layer directly: the reading **narrows with the
object** rather than standing wider than it. A 564px object over a 760px reading is two widths
pretending to be a composition.

## Reading a board

Each board shows the page twice: once as it renders, and once with **every region and every piece of
white named** —

1. the 12-column master grid, drawn;
2. every row outlined, labelled with its split, its mode and its height;
3. every semantic region tinted and labelled with the columns it occupies;
4. declared **containment** and declared **reading margin** hatched, in different colours;
5. anything left over hatched in **red**, labelled `UNOWNED`;
6. the rhythm steps drawn as bands, labelled by name and px;
7. a verdict panel ending in **EVERY WHITE HAS AN OWNER: YES / NO**.

## The hard failures

| | fails when |
| --- | --- |
| **H1** | a column's rendered owner is not the one the blueprint declared |
| **H2** | an active row leaves a remainder that is neither symmetric containment nor a legal reading margin — including a region anchored to one side with the rest of its row empty |
| **H3** | a `hug` or `paired` row is materially taller than its tallest child, or a rhythm step renders at a height it did not declare |
| **H4** | paired siblings do not share an alignment origin, or end further apart than the blueprint declared |
| **H5** | a `fill` object is painted narrower than its slot |
| **H6** | a `contain` object has no resolved anchor |
| **H7** | doubling the payload changes the blueprint or moves a column |
| **H8** | a render uses a blueprint outside the pattern's finite approved set |

Five more are refused at the table, before anything renders: a reading margin declared beside media,
a pair with no tolerance, a selection naming an unapproved blueprint, prose past the reading measure,
and a rhythm step that is not one of the named ones.

**Every one of these is driven to failure on purpose in the same run.** A control that has never been
seen to fail is a comment.

## The counterexamples — permanent regression proofs

| board | control | what it reproduces |
| --- | --- | --- |
| `counterexample__shipped-683px-graph` | H5 | the shipped page: a 683px graph inside a twelve-column `fill` slot |
| `counterexample__unowned-half-row` | H2 | **the canonical must-never-happen-again** — a six-column object at the left of a twelve-column row, the other six declared by nothing |
| `counterexample__margin-beside-media` | H2 | the same page with the empty half labelled `reading-margin` |
| `counterexample__stretched-hug-row` | H3 | a hug row given a height of its own |
| `counterexample__no-alignment-origin` | H4 | two siblings that do not start together |
| `counterexample__side-study-imbalance` | H4 | `media-5 + explanation-7`, judged |
| `counterexample__anchorless-contain` | H6 | a contained object wherever CSS left it |

### `media-5 + explanation-7` was judged and does not pass

It was offered as an example of a complete composition. Every column in its row is owned — it is a
proper pair, not a half-row — and it still fails: the object and the reading beside it end **535.5px
apart** against the 160px the blueprint declared for itself. That is the row contract doing work the
column contract cannot do, on a real arrangement rather than an injection. It is kept in the file as
`withdrawn`, with the measurement, rather than deleted.

## What the paired workings page actually measures

The maintainer asked for the vertical air before the synthesis in
`lesson-symmetry-workings-desktop.png` to fail the content-hugging contract **if** it is generated by
layout. Measured on the shipped page: it is not.

- the cases row is **333px** and both children are **333px** — `align-items: start`, zero stretch;
- the gap to the synthesis is **30px**;
- inside a case the steps run at 14–16px.

So the air the eye reads is 30px of region gap **plus ~27px of the answer block's own bottom
padding** plus the synthesis label's leading — three separately owned spacings that nothing designs
as one. That is a **rhythm** defect, not a row-height defect, which is why `rhythm.steps` exists.

It is not fully solved here, and the atlas says so on every board rather than hiding it. Under this
layer the step is declared once and rendered exactly, and the verdict panel prints **declared against
perceived**:

```
worked.paired/cases-6-6 after `cases`: declared section 56px, reads as 81px
worked.single/flow      after `support`: declared section 56px, reads as 93px
```

**The open design question for the maintainer:** should a semantic region be required to hug its own
ink, so that the declared step *is* the perceived step? That would make the rhythm exact and would
move ~25–37px of padding out of the blocks and into the blueprint. It is a change to the blocks, not
to this layer, so it is reported and not taken.

## Still open

- `visual.explanation` approves `stage-full` for a `wide` object; the only wide graph fixture reaches
  it, but there is still no wide **image** and no portrait or wide **instrument**.
- `interactive.primary`, `notes`, `media.full` and `practice.workbook` are not in this proposal. They
  have blueprints in the span layer but have not been re-expressed as complete compositions, because
  the maintainer asked for 2–4 strong ones per family rather than a sweep.
- `workspace` is defined and declared but no blueprint here uses it — `practice.workbook` is the
  pattern that needs it.
