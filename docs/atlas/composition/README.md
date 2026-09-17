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

**And then `side-6` and `side-7` put a plane beside its reading again.** That is not an exception to
the rule; it is the rule's second clause, reached because *what a media slot is* changed underneath
it. `forbidden` names two **unbounded** materials in one row — material whose height depends on how
much someone happened to write. Under the slot-fit contract a media slot is no longer one of those:
its width is the slot's, and its height is a deterministic function of that width and the authored
domain, invariant to content — which the adversarial control proves on every render. A *derived*
height is a designed height. What the rule still forbids is prose beside prose, and that is still
nowhere in the catalogue.

What survives from the removal is the specific finding: a plane much **taller** than the prose beside
it leaves a hole under the prose. So `side-6` is approved for the `balanced` class only and `side-7`
for `landscape` only; a `portrait` plane has no side-by-side subdesign at any surface, and the
column-residue control measures the hole rather than trusting the class. Page 10 carries the
adversarial payload that exercises the pairing with content it was not written for.

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

### 6f. The slot inspector — is the media actually *inhabiting* its slot?

"What pattern is this?" and "is the media inhabiting its slot well?" are different questions, and
only the first had an answer. The observable failure was a 760px graph left-aligned on a 1152px page
with 392px beside it that had no role — and nothing in the system could tell that 392px apart from a
reading margin.

**There are three kinds of whitespace**, and the catalogue had one word for all three:

| | Legal | What it is |
| --- | --- | --- |
| **reading margin** | yes | free columns beside a **prose** slot, because prose is bound by the measure and the page is wider |
| **pattern whitespace** | yes | space inside an explicitly bounded media stage — a portrait diagram centred in a `contain` slot |
| **slot residue** | **no** | a `fill` slot whose media is narrower than it, or a `contain` media that is neither centred nor deliberately start-aligned. *The renders we have been unhappy with are mostly this.* |

Every media slot in this catalogue is `fill`, because every media block in the corpus is a plane —
so the **`contain` branch is designed and unexercised**, and the build says so on every run rather
than letting a green result imply otherwise. One open question belongs to it: `contain` gives a
maximum, an alignment and a stage, and does not say *who chooses the painted width*. For a raster
that is its intrinsic pixels; for anything else it would be the renderer, which is media geometry
deciding width — the direction `fill` exists to forbid. Worth ruling on before the first contained
image is authored.

Every media slot now declares a **fit**. `fill` means the media consumes the slot width — the slot
gives the width and the media takes it, never the other way round. `contain` means the media may be
smaller but must be **deliberately placed**, which means centred unless the slot declares a reason to
be start-aligned. Both checks are categorical: there is no threshold, no occupancy percentage, and
nothing the inspector computes ever reaches layout. *This is not a resolver* — "if occupancy < 55%,
stack" is what made the system lose the design in the first place. It does report the occupancy of
every contained object, and deliberately **without a threshold**: the first version compared a
painted content dimension to a tuned 0.6, which is the shape of the very resolver this refuses,
sitting inside the gate and dormant only because the corpus has no contained media. It now prints
the number and compares it to nothing.

Horizontal footprint is discrete and vertical is auto: the slot decides the width, the geometry
decides the height, and **there is no height ceiling**. A 6-column slot that makes a tall graph 950px
high is the right outcome; the page scrolls. The alternative — a height cap squeezing a primary graph
to 340px wide against the left edge of a 1100px page — is the failure mode this replaces.

**The inspector is drawn, not just enforced.** Beside every render with media, `<name>-inspect.png`
overlays the slot (dashed), the painted media (outlined) and any unclaimed width (hatched, where it
actually is), with a panel reporting pattern, subdesign, master grid, media slot, painted media, fit,
alignment, aspect-scale and unclaimed internal width — and on failure the diagnosis and the **legal
actions**. One function produces the control's verdict and the overlay's text, so the picture and the
build can never say different things.

The *contract* is enforced on every render at every surface; only the *picture* is selective —
desktop by default, because that is the only surface where a slot can be wider than its media (every
approved tablet and phone media span is the whole surface). `CP_INSPECT=all` draws them all, which is
what the slot-fit atlas will want; `CP_NO_INSPECT=1` draws none.

It found three stranded arrangements in the catalogue on its first run, none of which anyone had
noticed: `visual.compare/paired` (8 of 12 columns, four unnamed to the right), `media.full/inset`
(the same defect, and named after it — now `centred`), and the tablet forms of both.
`practice.workbook/beside` declared a 7-column media span for a 5-column slot.

**Span promotion** is the only automation, and it selects from arrangements that already exist:
within one (surface, aspect class), take the smallest approved span the media says it can render
faithfully. Not "choose the prettiest arrangement based on content measurements".

The media reports **capability, never footprint**. It is asked one question, about widths it did not
choose — *of these approved spans, which can you render faithfully?* — and the answer is a subset of
a set someone else supplied. There is no number in the reply that a caller could mistake for a
display size: "I would like to be 488px wide" is not expressible, which is how tiny media ended up
on large pages in the first place.

**Legible at a width is three categorical things at once**, and the first version of this asked only
the first and was wrong for three figures out of four:

1. **No collision** — no two painted texts overlap.
2. **Fidelity** — every painted tick lies inside the *authored* domain on its own axis. Under equal
   unit scale the engine expands the shorter domain to fill the plot rect and derives its ticks from
   the **expanded** range, so a narrow plane prints a scale the author never wrote: at a 209px box
   `symmetry` prints a y tick at 12 for an authored yMax of 11, and `landscape` prints x = −15 for an
   authored −12. A plane showing a domain the author did not write is not legible, however cleanly it
   is set.
3. **Stability** — the painted tick set is the one the same figure prints at full width. This catches
   fabricated precision *inside* the domain: −7.5, −5.0, −2.5 … for an authored ±7.

**It judges the solved box, not a guessed one** — the sharpest correction here. An earlier version
painted at a seed height `round(aspect×(w−50)+100)` and judged that, and the verdict moved with the
seed: `symmetry` in a 382px slot is clean at h=498, prints x = ±6 for an authored ±5 at h=398, and
prints decimals at h=698. That made the answer a property of the *measuring instrument*. It now asks
the renderer's own box solver for the box the page would actually get, and judges those pixels.

**And there is no monotonicity assumption left to break** — there was one, and it broke. `roots` is
clean at 264px, collides at 296 and 328, and is clean again at 360: an illegible **band**, not a
threshold, which no single crossing width describes. Asking each approved span directly needs no such
assumption. A diagnostic still reports the crossing number for a human reading a build log, and says
when it is unsafe; nothing decides anything with it.

| Figure | Aspect | Renders faithfully at the catalogue's approved spans (382–1152px) | Diagnostic crossing |
| --- | --- | --- | --- |
| symmetry | 1.20 | every one | 225px |
| squareish | 0.857 | every one | 249px |
| landscape | 0.333 | every one | 266px |
| graphcheck | 1.833 | every one | 209px |
| roots | 1.40 | every one | 233px, **unsafe** — illegible band at 296–328px |

The honest finding: **promotion never fires on real content.** It is proved by driving it rather than
asserted — a 2-column (172px) state approved for the balanced class *is* skipped for `side-6`, and a
pattern whose only approved state is that one **fails the build** rather than painting an unfaithful
plane. A single candidate is still asked: an earlier version returned it unexamined, so one
arrangement could paint a figure at a width it cannot render and nothing would say so.

### 6g. The slot contract, and the Slot Fit Atlas

`6f` gave every media slot a **fit**. This phase gave it the other two thirds of a contract and then
went looking for objects that would break it.

**Every media slot prescribes three things.** `slotSpan` — how many columns of the master grid it
occupies, declared per subdesign, discrete, chosen from the pattern's approved set and never
negotiated. `slotFit` — `fill` or `contain`. `slotAnchor` — where the slot sits in its row, from a
deliberately tiny vocabulary: `center` · `start` · `end` · `paired` · `full`. The subdesign declares
the anchor and a control derives it independently from the areas, so neither the prose nor the grid
can drift without the build saying so. `start` and `end` put a slot hard against one edge with
unnamed columns on the other, so each one **requires a declared `anchorReason`** — a generic stacked
media object can never quietly default to left.

**Whitespace is now separated by ownership**, which is what makes it enforceable:

| | Owner | Legal |
| --- | --- | --- |
| reading margin | the page | yes — prose is bound by the measure and the page is wider |
| pattern whitespace | the subdesign | yes — `2 + 8 + 2` on a twelve-column grid has a declared role |
| slot residue | **nobody** | no under `fill`, ever; under `contain` only because the slot owns it and the object has an approved anchor |

So the old situation — an 8-column graph on the left of a larger unnamed region — now fails in the
catalogue, before anything renders. A centred 8-column slot written `2 + 8 + 2` passes, because those
outer columns were prescribed.

> **Amended.** Symmetry was the *only* way the catalogue could say "these columns are deliberate", so
> the control admitted nothing else — and that made `start` and `end` unreachable, even though
> `vocabulary.json` has always defined them and required an `anchorReason`. Two patterns centred their
> object over left-anchored prose because they were **made to**, giving those pages two competing
> alignment axes. An edge anchor with a declared reason is now permitted, which is what the vocabulary
> always said. The stronger form of "deliberate" — a shared alignment **spine**, checkable rather than
> merely asserted — arrives with the Composition Blueprint adoption, and this control should be
> tightened to require it then.

**`contain` finally has somewhere to live.** Every media slot in the catalogue was `fill`, so half the
contract had never been through an object. `notes` gained one `illustration` slot: contained, centred,
capped at the object's **authored presentation width** — never at the raster's own pixels, because a
900×1200 photograph is not a request to be painted 900px wide.

**Ten permanent fixtures**, generated by `scripts/make-media-fixtures.mjs` and committed as regression
assets — nothing is fetched, and no third-party host serves any of it:

| | | |
| --- | --- | --- |
| graph portrait 1.20 | graph balanced 0.857 | graph wide 0.333 |
| image 3:4 (1.333) | image 1:1 (1.0) | image 16:9 (0.5625) |
| video 16:9 — a real 4-second WebM | interactive 4:3 (0.75) | interactive 16:9 (0.5625) |
| diagram portrait (1.333) | | |

The clip is drawn on a canvas in Chromium and captured with `MediaRecorder`, because there is no
ffmpeg here and a clip downloaded from anywhere would not be a regression asset.

**`scripts/slot-fit-atlas.mjs` puts every fixture through every approved slot it is allowed to
occupy, at all three surfaces.** 108 legal combinations, every one judged; 28 **golden proofs**
photographed with the inspector overlaid, chosen before anything is measured so the choice cannot be
a function of the result. Filler prose is identical on every page, so the object is the only variable.

**Nine controls, each driven to fail on purpose** — see §7. Two fired on real defects the first time
they ran: a contained object declared `center` was painted hard left, because the anchor rules styled
the figure and a later rule of equal specificity won; and a 380px object centred in a 382px slot was
read as `start`, because the check asked "is it against an edge?" before "is it even?".

### 6h. What the contract cannot see

A `paired` row puts an object beside prose, and the prose can run out first. Nothing horizontal is
unclaimed, every check passes, and the page can still read badly. The atlas **measures that gap and
prints it, and compares it to nothing** — prose length is content, and content may never decide a
composition. A threshold there would be the resolver coming back.

### 6i. Every control, driven to fail on purpose

A control nobody has watched fail is a comment. Each of these was given a deliberate defect and had
to say the right thing about it. **Three of the nine did not fire on the first attempt, and each
taught something different:**

| | Injected defect | What came back |
| --- | --- | --- |
| 1 | a `fill` object at 72% of its slot | *a `fill` object painted 547.19px inside a 760px slot* |
| 2 | `data-anchor-resolved` removed from the markup | *a `contain` object with no resolved anchor (declared `center`) — it is wherever CSS left it* |
| 3 | the centring rule replaced with `margin-inline:0 auto` | *declared `center` … painted 0px from its slot's left edge and 184px from its right, which reads as `start`* |
| 4 | an object at 118% of its slot | *painted 665.52px inside a 564px slot — 101.52px WIDER than its slot* |
| 5 | a raster given a fixed height as well as a width | *intrinsic shape is 1.3333 and it is painted at 0.4211 — stretched to fit* |
| 6 | an approved subdesign no fixture can select | *approved but never proven: visual.explanation/ghost-10@desktop* |
| 7 | the page perturbed between measuring and drawing | *drawing the inspector MOVED the page it describes* |
| 8 | `pick()` ordering spans descending | *took down-12 (12col) over the smaller approved down-8(8col) with no recorded refusal* |
| 9 | `slotFit: "flush"` | *a media slot with no declared fit (`flush`)* |

**4 was a bad test, not a good control.** The injection set `width:118%` and my own
`.cp-media{max-width:100%}` clamped it, so the defect never reached the page. Removing the clamp too
— which is what an author would have to do to escape a slot — made it fire. The clamp is a real
safeguard and stays.

**8 was a bad control, twice.** First it compared each result against `pick()`'s own candidate
ordering, so an injection that reordered `pick()` fooled the control as well as the renderer: it
agreed with itself and said nothing. It now recomputes the approved order from `patterns.json`. Then
the *injection* turned out to be defeated by `pick()`'s own trailing sort, so reversing before it was
a no-op — the defect had to be the sort itself. And once both were right, the whole-atlas coverage
control still threw first on a filtered run and masked it, so per-render controls now run before
whole-atlas claims, and the claims say plainly that a filtered run cannot make them.

**9 was looking in the wrong place.** The expected message belonged to the composition atlas's
`validate()`; in the slot-fit atlas the same defect is caught by the verdict, in different words.

## 7. What the build checks

Every control below has been driven to fail on purpose.

| Control | What it catches |
| --- | --- |
| **Areas arithmetic** | a row with 11 tokens on a 12-column grid, before anything renders |
| **The reading measure is a grid position** | a prose slot given 10 of 12 columns |
| **Slot edges land on grid lines** | a 9px nudge on one slot — the claim "we use a 12-column grid" is a sentence until every painted edge is within 1.5px of a column boundary |
| **A slot is the width its pattern gave it** | a resolver that measures rendered prose and narrows the column — it fires on the adversarial render, which is where such a rule would first bite |
| **Slot fit** | a `fill` media painted 441px inside a 760px slot — the failure prints the whole inspector: slot, span, painted size, unclaimed width, diagnosis and legal actions |
| **Every media slot declares a fit** | a media slot with no answer to what inhabiting it means |
| **`mediaSpan` is the span the areas give** | `practice.workbook/beside` declaring 7 columns for a 5-column slot |
| **`approvedMediaSpans` matches the subdesigns** | a documentation table drifting from the one owner |
| **Media alone in a row is centred or full** | 8 of 12 columns hard against the left edge, with four unnamed beside them — caught in the catalogue, before anything renders |
| **A media slot was actually inspected** | a contract nothing exercised |
| **`slotAnchor` matches the areas** | a subdesign that says `center` and lays out `start` |
| **`start`/`end` carry a declared reason** | a slot against one edge with unnamed columns on the other and no stated why |
| **A `fill` object consumes its slot** | a `fill` object at 72% of its slot — the same predicate as anonymous width inside it |
| **Nothing exceeds its slot** | an object 118% of the track reserved for it, escaping the grid |
| **Nothing is distorted to fit** | a raster given both a width and a height, stretched off its intrinsic shape |
| **A contained object has a resolved anchor** | the renderer never positioned it; it is wherever CSS left it |
| **A contained object sits where it says** | `center` painted hard against the left edge — caught on the first run, in my own CSS |
| **A contained object is at its authored presentation width** | a raster painted at its own pixel width |
| **Every approved media-bearing subdesign has a golden proof** | an arrangement no object has ever been shown to inhabit |
| **The inspector agrees with the DOM it is drawn over** | an overlay that moves the page it describes, or prints numbers the pixels do not have |
| **A fixture changes subdesign only for a frozen reason** | the same aspect class taking two arrangements with no promotion to explain it |
| **Blocks fit their slots** | a `keyIdea` placed in a `reading` slot — caught on the very first run, in my own catalogue |
| **No layout residue** | a painted track that holds nothing |
| **No column residue** | a slot that starts hundreds of pixels below the one above it in the same columns |
| **Adversarial content moves nothing but height** | the same subdesign, the same slots, the same widths under a hostile payload |
| **A different media aspect takes the approved alternative** | a portrait plane in `media.full` must take `centred`, not a 1400px-tall figure |
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

**The slot-fit atlas is built** (`docs/atlas/slot-fit/`, §6g–§6i). Ten permanent fixtures, 108 legal
combinations judged, 28 golden proofs, every approved media-bearing subdesign proven, both fit modes
and all five media families exercised, and nine controls each driven to fail on purpose. It closed
the gap it was named for: `visual.explanation/side-7` finally got the landscape objects it had never
had, held them perfectly, and was **removed anyway** — the object stands 256px taller than the prose
beside it, against the 240px this project calibrated as a hole.

**What that leaves for the maintainer**, in order of how much it matters:

1. **The `paired` anchor puts media beside prose, and the prose runs out first.** `side-6` measures
   **+474px** and `interactive.primary/beside` **+472px** on identical filler. The slot contract is
   satisfied on both — nothing horizontal is unclaimed — and both pages read badly. This is the
   pairing rule's original finding arriving a second time, and it is a larger ruling than the one
   arrangement this phase was authorised to remove. `practice.workbook/beside` is unaffected: its
   neighbour is a workspace with a designed height, and its gaps run +139px to −263px.
2. **A portrait object given the full grid.** `visual.compare/paired` is 12 columns for every aspect
   class — a deliberate choice last phase, to stop a shared plane being stranded at 8-of-12 — and the
   cost is now visible: a 3:4 photograph as the shared visual is painted **1152×1536px**. Valid, and
   probably not what anyone wants.
3. **`contain` is exercised by exactly one slot.** `notes.illustration` is the only one, so the branch
   is proven but thinly. A landscape object there is capped by the slot at every surface, so its
   containment never shows; only the portrait fixtures demonstrate it.
4. Still open from before: `optional-reserved` is declared and unused; an authored figure `label` has
   nowhere to go but the caption; a `readout` slot for an interactive and an `answers` slot for a
   workbook are both missing; and the atlas is not wired into CI.
