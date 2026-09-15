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

## 6. The catalogue — seven patterns

Thirteen pages, three surfaces each — the last of them the whole lesson in fifteen states — plus adversarial and alternate-media renders: **74 renders**.
Every page is filled from the real quadratics lesson — a pattern that only works on prose written
to fit it proves nothing.

| Pattern | For | Slots | Scroll |
| --- | --- | --- | --- |
| **`notes`** | Teaching notes: an explanation, optionally a rule set apart, optionally a set of equivalent worked examples | `intro`, `support`, `reading`, `examples`, `synthesis` | page |
| **`worked.single`** | ONE worked example: a question or a modelling scenario, the solution, the answer | `intro`, `scenario`, `worked`, `support`, `synthesis` | page |
| **`visual.explanation`** | One primary visual and the reading of it, where the READING carries the teaching | `media`, `interpretation`, `support` | page |
| **`visual.compare`** | Two cases worked side by side, with one visual that belongs to both | `intro`, `caseA`, `caseB`, `media`, `interpretation`, `synthesis` | page |
| **`media.full`** | A single media object IS the page — a wide graph, a diagram, a recorded explanation — with its reading beneath | `media`, `interpretation`, `support` | page |
| **`interactive.primary`** | A manipulable object is the page: an opening brief, the instrument, and prompts directing what to try | `intro`, `instrument`, `prompts`, `synthesis` | page |
| **`practice.workbook`** | A question set beside a workspace the learner acts on — lined paper or grid paper — with the stimulus staying while the worklist moves | `intro`, `reference`, `questions`, `workspace` | pane |

It began as eight and was cut to seven by its own cross-pattern review (§6c).

### 6a. When two slots may share a row

Two side-by-side subdesigns were designed, rendered, measured and **removed**: `visual.side` (a plane
beside its reading — ~600px of empty column with a one-sentence reading) and `worked.single`'s
`beside` (a scenario beside its solution — 247px). Both are the same defect, and the general rule is
worth more than either:

> A row may pair two slots only when they are **the same kind**, deliberately given identical width —
> a comparison, where unequal heights read as *one case was shorter* — or when **at least one slot has
> a designed height**: a plotting pad, an instrument, a card. Two **unbounded** materials in one row
> is sound only for the lengths the author happened to write, and how much prose an author wrote is
> content, which may never decide a composition.

What pairs, therefore: `caseA | caseB` · `questions | workspace` · `instrument | prompts` ·
`intro | support`. Nothing else. Every visual pattern stacks its media and its reading; every worked
example stacks its scenario and its solution. A taller page is the deliberate outcome.

That left `visual.explanation` and `media.full` distinguished **structurally**: this pattern's plane
never crosses the reading measure, that one's always does. Choosing between them is the author's
decision about what the page is *for* — pages 04 and 06 make the same figure the subject of both.

### 6b. Two holes, one found by looking and one by a control

A reference plane placed a row *below* a question list left a 600px dead column whenever the plotting
surface beside it was tall. The fix is a **row span** in the pattern, not a measurement. The control
that now catches it distinguishes an ordinary leftover under the shorter of two paired cases (137px,
accepted) from a hole (600px, 734px, 247px). Its threshold is a *build-time* discriminator; nothing
at render time reads it.

### 6c. What the cross-pattern review changed

Eight independently designed versions of this catalogue were reviewed against each other. Most of
what it found was in *those* drafts — nineteen slot names for nine things, fifteen arrangement words
for six — but five findings landed on what had been built, and four were acted on:

| Finding | Acted on |
| --- | --- |
| **`workspace` was one slot name carrying two slot types** — the interactive's object and the practice pad | renamed to `instrument`, which is the word the pattern's own prose already used |
| **The `scroll.x` contract said one thing and the code did another** — the grammar gave it to a `data` *slot*, the renderer attached it to the table *block* | the block is right and the sentence was wrong: a table of values belongs to the explanation it is part of, so the contract travels with the material |
| **`notes.basic` and `notes.examples-tabs` differed by one slot**, and the second was keyed on a *disclosure mode* | merged into `notes`. Whether examples are shown together or behind tabs is authored **inside** the slot; a pattern keyed on an author axis is not a pattern |
| **`practice.graph-workbook` forked on grid-versus-lined paper**, which is a property of the `handwrittenResponse` block | folded into `practice.workbook` with an optional `reference`. A pattern that forks on a block property has collapsed the two vocabularies |
| **No pattern served a *single* worked example** — `visual.compare` needs a pair, `notes` needs a set — so two of the lesson's four subtopics could not be laid out | added `worked.single`, with an optional `scenario` for a modelling question. Pages 11 and 12 are the lesson's *Solving for x* |

One divergence, deliberately: the review asked for a declared `.noX` subdesign, with full areas rows
at every surface, for every `optional-collapse` slot. This catalogue instead **drops any row whose
every token is `.` or an absent optional slot** — mechanical, deterministic, and it reads only *which
slots the author filled*, never what is in them. Seven patterns × three surfaces × up to four optional
slots is a combinatorial table nobody would keep correct; one rule with a control is better.

### 6d. The gap this pass then closed

The review's sharpest finding is one this pass did **not** close: the catalogue lays out *pages*, and
the lesson is not a stack of pages. Its top level is a `collection.tabs` over four subtopics, and its
*Symmetry* subtopic is a `views.tabs` whose two panels are **different patterns** — a paired
comparison and a figure with its reading. Neither the subtopic strip nor the views switch has an
owner here.

That is a **shell** above the pattern layer, not an eighth pattern. §6e is that pass.

### 6e. The shell layer — what holds patterns, and is not one

The catalogue lays out pages; the lesson is not a stack of pages. Its top level is a strip over four
subtopics, and its *Symmetry* subtopic is one idea seen as two representations whose panels are
**different patterns**. Neither had an owner, and five pattern records assumed a page title that no
pattern declared.

A **shell** owns the title, the strips, and which panel is open. It declares **no slot, no grid area
and no media rule** — the moment it acquires one it has become a pattern and the layering has
collapsed.

| | |
| --- | --- |
| `shell.subtopics` | several **sibling** parts of a lesson; select one. A panel holds **one or more patterns in reading order** — a subtopic is often several pages' worth of material |
| `shell.views` | **one** object seen in multiple **representations**. One pattern per panel, and *different* patterns are the normal case — which is exactly what makes this a shell rather than a pattern with a state |

Nesting runs `subtopics → views → patterns`. Subtopics inside subtopics is forbidden: two levels of
sibling selection is a table of contents pretending to be a page.

**Page 20 is the whole quadratics lesson through the catalogue** — 15 renders, one per leaf state per
surface. Substitution is `notes`; *Solving for x* is two `worked.single` patterns in one panel, ruled
apart; *Symmetry* is a views shell over `visual.compare` and `visual.explanation`; *A flatter
parabola* is `visual.explanation`.

Building it found one thing the pattern layer had not: **`visual.compare` had no approved subdesign
for having no shared visual at all**, because both its desktop subdesigns declared an aspect class
and a page with no media has none. `none` is now an aspect class like any other, and a pattern whose
media is `optional-collapse` must declare a subdesign for it — the build refuses one that does not.

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
| **The authored tab structure is identical at every width and state** | a phone that drops the fourth subtopic — the invariant the whole disclosure axis exists to protect |
| **A closed panel contributes nothing** | every panel painted at once: a strip that hides nothing is a decoration |
| **A shell introduces no scroll of its own** | a shell bounding a panel's height — hiding half a subtopic behind a scrollbar is the space-saving move this architecture refuses |
| **The two tab kinds are distinguishable** | a nested views strip styled as an item selector. The per-depth control could not catch it — `views` occurs only at depth 1 here, so nothing disagreed with it — and this one does |

## 8. Status

A **proposal**, and research. `lesson-studio.html` is untouched and byte-identical since `41d40a8`.
`src/grid.json` is the master grid, `src/vocabulary.json` the two vocabularies, `src/patterns.json`
the catalogue — and the CSS for every arrangement is *generated* from that file, so a design and its
layout cannot drift the way a grammar in prose once drifted from thresholds in a script.

Still open, and for the maintainer: `optional-reserved` is declared and no
pattern needed it; an authored figure `label` has nowhere to go except the caption; a `readout` slot
for an interactive's current values and an `answers` slot for a workbook are both missing; and
`video` remains a block type, a slot type and a page type that nothing in the corpus exercises.
