# The Composition Atlas

A small catalogue of **page patterns** built on one **master grid**, with **typed slots** into which
lesson blocks are placed. It replaces the approach the three previous passes kept converging on —
a renderer that asks *"how big should this be?"* and *"should these two sit beside each other?"* —
with a renderer that asks only *which approved subdesign of the authored pattern applies*.

> **Page pattern owns the slot · Slot owns the available geometry · Media faithfully occupies the slot.**

```
LESSON SEMANTICS → PAGE PATTERN → APPROVED SUBDESIGN → NAMED SLOTS ON MASTER GRID
                                                     → BLOCKS OCCUPY SLOTS → MEDIA FITS ITS SLOT
```

and never

```
measure everything → compare dimensions → infer arrangement → resize things → hope it looks balanced
```

`lesson-studio.html` is untouched. This is research; nothing is built into the app until the
patterns are approved.

## 1. Grid ≠ layout

A grid gives **common alignment lines**. It does not decide the composition. Every time this project
gave the grid a little more responsibility it ended up designing the page from measurements.

| Surface | Master grid | Column | Gutter |
| --- | --- | --- | --- |
| desktop 1152px | **12 columns** | 74px | 24px |
| tablet 834px | **8 columns** | 86.75px | 20px |
| phone 382px | **4 columns** | 83.5px | 16px |
| vertical | **auto** | — | rows grow with content; the page scrolls |

Twelve is not magical; it divides cleanly into the compositions courseware actually needs —
12 · 8+4 · 7+5 · 6+6 · 4+4+4 · 3+6+3.

**One number arrived on its own.** Eight desktop columns is `8 × 74 + 7 × 24` = **exactly 760px**,
which is the reading measure the previous atlas had already reached from typography alone. So the
measure is not a constant bolted onto the grid — it *is* a grid position, and a slot that may hold
prose may not exceed 8 desktop / 7 tablet / 4 phone columns. The build refuses a pattern that does.

## 2. Two vocabularies, deliberately separate

A **block** says what something *is*. A **slot** says what kind of thing may live *there*.

| Block role | May occupy |
| --- | --- |
| explanation / prose | `reading` · `support` |
| worked solution | `worked` · `examples` |
| graph · image · video | `media` |
| interactive | `interactive` · `workspace` |
| table | `data` · `worked` · `reading` |
| question set | `questions` |
| handwritten response | `workspace` |
| key rule / note | `support` |

Collapsing these two is how a graph came to own a size: the block was asked how big it should be,
when the answer belongs to the slot the pattern gave it.

**A graph no longer owns a size.** It receives a media slot and answers only: *inside this width, at
equal unit scale, this is the faithful rendering I can provide.* Its height follows from the authored
domain and the page grows. If its **aspect class** means it cannot work in one subdesign, the pattern
declares an approved alternative — chosen from the surface and the aspect class, never from content.

`mediaSize` (compact / standard / large / workspace) was the useful **failed intermediate**. It
proved that semantic importance and media geometry are separate concerns, which is why this layer
exists at all. It is not the permanent mechanism; the slot is.

## 3. Occupancy — designed whitespace vs layout residue

Every slot declares one policy:

| | |
| --- | --- |
| `required` | the pattern is not itself without it |
| `optional-collapse` | absent → the slot disappears and the pattern uses its approved no-X subdesign |
| `optional-reserved` | the emptiness **is** part of the composition — rare, and justified in the record |

What must never recur: *"there are 400px left over beside the graph because the maths worked out that
way."* That is not whitespace, it is **layout residue**, and the build fails on it.

## 4. Disclosure is pedagogical structure, not a space-saving response

| Situation | Disclosure |
| --- | --- |
| equivalent sibling items — three worked examples | `collection.tabs` may be appropriate |
| one object, two representations — algebra \| graph | `views.tabs` may be appropriate |
| a sequential explanation — step 1 → 2 → 3 | **never tab it** |
| items that must be compared — case A vs case B | **never hide one** |

Following GOV.UK's tabs guidance and Mayer's segmenting principle. Tab groups are W3C APG tablists —
`role`, `aria-controls`, `aria-labelledby` and a roving tabindex — and the build asserts it.

**Spatial contiguity** (Mayer): a block that explains a visual belongs to the *same pattern* as that
visual, beside it or immediately beneath it. That is a pattern-design rule; nothing measures anything
to satisfy it.

## 5. What is deliberately rejected

Automatic *bento* placement — "here are six blocks, find aesthetically balanced cells". Attractive for
dashboards and galleries; wrong for instruction, which has a pedagogical reading order. The grid is
alignment infrastructure, never an auto-placement algorithm. Gone with it: occupancy thresholds, the
dead-space resolver, semantic media pixel sizes, and any comparison of content heights.

## 6. The catalogue — eight patterns

Ten pages, three surfaces each, plus adversarial and alternate-media renders: **48 renders**.
Every page is filled from the real quadratics lesson — a pattern that only works on prose written
to fit it proves nothing.

| Pattern | For | Slots | Scroll |
| --- | --- | --- | --- |
| **`notes.basic`** | Prose-led teaching notes with no primary visual | `intro`, `reading`, `support`, `synthesis` | page |
| **`notes.examples-tabs`** | A concept explained once, then several EQUIVALENT worked examples the learner selects between | `intro`, `support`, `examples`, `synthesis` | page |
| **`visual.explanation`** | One primary visual and the reading of it, where the READING carries the teaching. The plane never crosses the reading measure; a page where the plane itself is the point is `media.full` | `media`, `interpretation`, `support` | page |
| **`visual.compare`** | Two cases worked side by side, with one visual that belongs to both | `intro`, `caseA`, `caseB`, `media`, `interpretation`, `synthesis` | page |
| **`media.full`** | A single media object IS the page | `media`, `interpretation`, `support` | page |
| **`interactive.primary`** | A manipulable object is the page: an opening brief, the workspace, and prompts directing what to try | `intro`, `workspace`, `prompts`, `synthesis` | page |
| **`practice.workbook`** | A question set beside a persistent writing pad | `intro`, `questions`, `workspace` | pane |
| **`practice.graph-workbook`** | A question set beside a GRAPHING workspace | `intro`, `questions`, `workspace`, `reference` | pane |

Desktop column spans, which is what a pattern actually *is*:

| Pattern | subdesign | arrangement |
| --- | --- | --- |
| `notes.basic` | `measure` | intro **8** · reading **8** · support **6** · synthesis **8** |
| `notes.examples-tabs` | `measure` | intro **8** + support **4** · examples **8** · synthesis **8** |
| `visual.explanation` | `stacked` | media **8** · interpretation **8** · support **6** |
| `visual.compare` | `paired` | intro **8** · caseA **6** + caseB **6** · media **8** · interpretation **8** · synthesis **8** |
| `visual.compare` | `paired-wide` *(landscape/wide)* | … · media **12** · interpretation **8** |
| `media.full` | `full` *(landscape/wide)* | media **12** · interpretation **8** · support **6** |
| `media.full` | `inset` *(portrait/balanced)* | media **8** · interpretation **8** · support **6** |
| `interactive.primary` | `beside` | intro **8** · workspace **8** + prompts **4** · synthesis **8** |
| `practice.workbook` | `beside` | intro **8** · questions **5** + workspace **7** |
| `practice.graph-workbook` | `beside` | intro **8** · (reference **4** / questions **4**) + workspace **8** *spanning both rows* |

### What the renders decided, that the design did not

**`visual.side` was designed, rendered, measured and REMOVED.** Seven columns of plane beside five of
reading fills the surface exactly and looks right when the reading runs to four paragraphs; with a
one-sentence reading it left roughly 600px of empty column — the same rail this project has now
rejected three times, rebuilt in a new system. *A composition whose soundness depends on how much
prose the author happened to write is content-dependent, and content is exactly what may never decide
a composition.* So every visual pattern here stacks its media and its reading, and the aspect class
chooses only **how wide** the plane is — never an arrangement.

That leaves `visual.explanation` and `media.full` distinguished **structurally** rather than by
degree: this pattern's plane never crosses the reading measure; that one's always does. Choosing
between them is the author's decision about what the page is *for*. Pages 04 and 06 make the same
figure the subject of both, to show the difference.

**Two holes were found by looking, and then by a control.** A reference plane placed one row *below*
a question list left a 600px dead column whenever the plotting surface beside it was tall; the fix is
a **row span** in the pattern, not a measurement. The control that now catches it distinguishes an
ordinary leftover under the shorter of two paired cases (137px, accepted) from a hole (600px, 734px).
Its threshold is a *build-time* discriminator; nothing at render time reads it.

## 7. What the build checks

Every control below has been driven to fail on purpose.

| Control | What it catches |
| --- | --- |
| **Areas arithmetic** | a row with 11 tokens on a 12-column grid, before anything renders |
| **The reading measure is a grid position** | a prose slot given 10 of 12 columns |
| **Slot edges land on grid lines** | a 9px nudge on one slot — the claim "we use a 12-column grid" is a sentence until every painted edge is within 1.5px of a column boundary |
| **A slot is the width its pattern gave it** | a resolver that measures rendered prose and narrows the column — it fires on the adversarial render, which is where such a rule would first bite |
| **Media fills its slot** | a plane painted at 62% of its slot: wrapped, not sized |
| **Blocks fit their slots** | a `keyIdea` placed in a `reading` slot — caught on the very first run, in my own catalogue |
| **No layout residue** | a painted track that holds nothing |
| **No column residue** | a slot that starts hundreds of pixels below the one above it in the same columns |
| **Adversarial content moves nothing but height** | the same subdesign, the same slots, the same widths under a hostile payload |
| **A different media aspect takes the approved alternative** | a portrait plane in `media.full` must take `inset`, not a 1400px-tall figure |
| **Disclosure is legal** | a sequential explanation put behind tabs in a pattern that forbids them |
| **Tabs are a W3C APG tablist** | `aria-controls` removed from every tab; a missing roving tabindex |
| **Scroll ownership** | teaching prose put in a local vertical scroller |
| **A declared pane genuinely overflows somewhere** | a bound that is a claim rather than a tested contract |
| **The frame holds the surface** | a UA `figure` margin left every plane 12px wider than its slot — invisible until a phone render, and the error now names the overhanging element |

## 8. Status

A **proposal**, and research. `lesson-studio.html` is untouched and byte-identical since `41d40a8`.
`src/grid.json` is the master grid, `src/vocabulary.json` the two vocabularies, `src/patterns.json`
the catalogue — and the CSS for every arrangement is *generated* from that file, so a design and its
layout cannot drift the way a grammar in prose once drifted from thresholds in a script.

Still open, and for the maintainer: `optional-reserved` is declared but no pattern here needed it;
an authored figure `label` has nowhere to go except the caption; and a `readout` slot for an
interactive's current values, and an `answerCheck` for a workbook, are both missing.
