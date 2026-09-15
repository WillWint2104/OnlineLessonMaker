# The Slot Span Atlas — a proposal

**Nothing here is wired into the shipping catalogue.** `docs/atlas/composition/src/` is untouched and
`24667ce` remains the checkpoint. This directory is a prototype of one architectural layer, built to
be looked at before it is adopted.

Build it with `node scripts/slot-span-atlas.mjs`. `SS_ONLY=visual.explanation` and `SS_SURFACE=desktop`
render a slice.

## The problem it answers

The catalogue has patterns, but the slots inside them are still **continuous**. A subdesign writes its
own `grid-template-areas` rows by hand, so a region can be any width and the columns beside it can
belong to nobody. Two consequences showed up in the slot-fit atlas, both technically valid and both
obviously wrong:

- a `paired` row left **+474px** of page that no region owned, because the prose beside the object
  happened to be short;
- a 3:4 photograph as a shared visual was painted **1152 × 1536px**, because `fill` will fill whatever
  slot it is handed.

## The move

> **A row is a named split, and the grid areas are generated from it.**

A subdesign no longer writes column strings. It names a split from `src/spans.json` and says which
region holds which slot. A region may be exactly three things — a **slot**, a declared
**reading-margin**, or the declared **containment** of a centred split — and a split must account for
every column of its grid or the build refuses it. A large unowned region is therefore not discouraged;
it cannot be expressed.

### The desktop vocabulary

| split | regions | for |
| --- | --- | --- |
| `4/8` · `5/7` · `8/4` | two, unequal | a pair where one side leads |
| `6/6` | two, equal | **two equal cases** — identical width *is* the argument |
| `centred-6` | one, with 3 + 3 containment | a tall object, or a subordinate one |
| `centred-8` | one, with 2 + 2 containment | the reading measure, centred |
| `full-12` | one | an object short enough to earn the grid |

Tablet and phone have **separately approved** vocabularies — `3/5 · 4/4 · 5/3 · 7/1 · centred-6 ·
full-8` and `full-4`. They are not the desktop design scaled, and control 7 checks that. `7/1` exists
because tablet prose may not exceed 7 columns: eight columns is 834px and the measure is 760px.

## The chain

```
media type → media geometry class → approved footprint → fit mode → painted media
```

Every arrow is a **lookup**. `src/footprints.json` says, per pattern per surface, which footprint each
geometry class takes. The pattern owns the legal footprints; the geometry class chooses among them.
Nothing measures prose, counts steps or computes an occupancy fraction.

So *why is this object six columns and not eight or twelve?* Because — for example —
`visual.explanation` maps `portrait → centred-6` at desktop. That is the whole answer, and it is
printed above every render on the board.

**The rule inside the rule**: the taller an object is, the *fewer* columns it takes. Column count
multiplies aspect into height, and height is what went wrong. A 1.2 plane is 717px at six columns and
would be 1382px at twelve.

## What changed, and why

| pattern | was | now | because |
| --- | --- | --- | --- |
| `visual.explanation` | `side-6` (6/6), `down-8`, `down-12` | a **centred spine**: portrait 6, balanced/landscape 8, wide 12 | the 6/6 row put an object beside prose and measured **+474px** |
| `interactive.primary` | `beside` (8/4) | a **centred spine**, prompts beneath | the same defect, **+472px** |
| `visual.compare` | cases 6/6, media always `full-12` | cases **keep 6/6**; media narrows as it heightens | 6/6 is the one legitimate pair; `full-12` for everything is what made a portrait object 1536px tall |
| `media.full` | `full-12` / `centred-8` | portrait 6, balanced 8, landscape/wide 12 | being the subject of the page is not a licence to be 1536px tall |
| `practice.workbook` | `5/7` | **unchanged** | its neighbour is a workspace with a *designed* height; measured gaps run +139px to −263px |
| `notes` | `centred-6` contain | unchanged | a supporting illustration never outgrows the reading it supports |

### The pairing rule, re-derived from measurement

A pair split is legitimate when **both regions have a height the author did not write**: two cases of
the same kind at identical width, or a region with a designed height beside one without. An object
beside **prose** is not, because the gap between them is a property of the sentence someone typed.

## `contain`, defined

- the **slot span** is discrete and owned by the pattern;
- `fill` means the media paints the slot width;
- `contain` means the media paints at its **authored presentation width**, capped by the slot, and is
  **explicitly anchored** — `center` unless the pattern declares otherwise with a reason;
- residual width inside a `contain` slot is **intentional containment space**, declared by the split;
- the inspector distinguishes that from illegal slot residue, and the overlay hatches the two in
  different colours.

Contained width is never derived from the surrounding prose.

## One left edge, or one centre line

**Found by looking at the first boards**, not by a control: `interactive.primary` started its intro at
column 1 and its instrument at column 3, so the page had two left edges and neither read as
deliberate. Every pattern now declares an `edge`:

- **`left-edge`** — every prose row starts at column 1. Its *media* may still be centred: a centred
  object on a left-aligned page reads as a deliberate stage, not a misalignment. `notes`,
  `worked.single`, `visual.compare`, `media.full`, `practice.workbook`.
- **`spine`** — everything is centred on one line. `visual.explanation`, `interactive.primary`.

A control refuses a pattern that mixes them.

## Reading a board

One board per pattern per surface. For each geometry class it shows:

1. the **rule**, by name — `portrait → centred-6 · graph.portrait · aspect 1.2 · fill`;
2. a **column diagram** naming the owner of every column of every row, colour-coded slot / margin /
   containment;
3. the page as it actually renders;
4. the **slot inspector**, from the same function the other two atlases use.

## The controls

| | catches |
| --- | --- |
| **0 · one edge per pattern** | prose starting at two different columns in one pattern |
| **1 · no unnamed columns** | a split that does not account for every column of its grid |
| **2 · the row used the approved footprint** | a renderer choosing a footprint the table did not name for that class |
| **3 · fit and anchor resolved** | a contained object with no resolved width or anchor |
| **4 · the footprint is in *this* surface's vocabulary** | a desktop split used at tablet |
| **5 · prose length moves nothing** | a footprint that changes when the payload doubles |
| **6 · geometry selects** | a renderer that ignores the geometry class |
| **7 · named spans, not computed widths** | a slot painted at a percentage of the surface, landing between the approved spans |

Each is driven to failure on purpose before it is trusted. Two had to be rewritten to be able to fail
at all: control 2 was reading the table rather than the render, and control 7 compared a hand-rolled
signature of two layouts and could not be made to fire. Control 7 now tests the thing that actually
distinguishes a selection from a squeeze — **selecting by name lands exactly on an approved span;
computing a percentage lands between them.**

Control 0 had to be narrowed after it fired on the two patterns whose pairs this layer deliberately
kept: it was counting the second region of a `6/6` or `5/7` row as a stray left edge, when `caseB`
begins at column 7 precisely because the split says so. It now looks only at rows that define the
page's edge — those holding a single named slot.

Control 6 also had to learn to ask only about the geometry classes a run actually rendered: a pattern
may approve a footprint for a class no fixture can supply — `interactive.primary` approves one for
`portrait` and there is no portrait instrument — and that is a gap in the fixtures, not a renderer
ignoring its table. Those are now **named** in the run rather than failed.

## Not in the catalogue

`worked.paired` was asked for and **does not exist**. There is `worked.single` and there is
`visual.compare`. Two worked examples side by side would be a `6/6` of two `worked` slots — the same
legitimate pairing as `visual.compare`'s cases — but it has never been designed, so this atlas cannot
render it. It needs a decision, not a guess.
