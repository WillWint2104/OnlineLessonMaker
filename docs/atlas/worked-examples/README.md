# The worked-example atlas

**A finite library of deliberately designed presentations.** Generalisability comes from choosing the
right one, not from letting the browser invent a composition.

This replaces the composition resolver. That work is retained at `docs/mockups/compositions/` as
research evidence, and **its layout-selection logic must not be ported into the app.**
`lesson-studio.html` has been untouched since `41d40a8` throughout, so nothing needs unwinding.

`node scripts/atlas-worked-examples.mjs` renders all 54 images in Chromium using the app's own
stylesheet and the shipped Figure Engine. `ATLAS_ONLY=13,18 node scripts/…` renders just those.
**There is no resolver in it, and nothing in it creates or removes a tab.**

---

## 1. Four independent axes

Composition describes the spatial relationship of content that is **currently visible**. It does not
decide whether several pieces of content are visible at the same time — that is **disclosure**, and it
is a separate authored decision. Scrolling is a third. Keeping them apart is the whole point.

| Axis | | Decided by |
| --- | --- | --- |
| **Content type** | example · explanation · comparison · visual · practice | author |
| **Composition** | the spatial relationship of what is visible now | **named in the JSON** |
| **Disclosure** | continuous · tabs · staged views | **named in the JSON** |
| **Media subdesign** | portrait / balanced / landscape / wide | the figure's own geometry |
| **Responsive state** | the template's prescribed wide/narrow arrangement | the surface width, alone |
| **Scroll policy** | page · local-y · local-x · persistent-pane | **named in the JSON** |

> **A responsive state may rearrange a composition. It may never choose a different one, and it may
> never touch the disclosure.**

### The hard rule

> **Tabs are authored pedagogical structure.** They may never be introduced or removed because of
> viewport size, content height, occupancy, or any layout heuristic. *"This got tall, so I'll hide
> half of it in tabs"* is resolver behaviour wearing a different hat.

The build reads the tab structure back out of the DOM — nesting depth, group name, every label in
order, every panel in order, visible or not — and compares it **character for character** to the
signature authored in `src/pack.json`, at every width and in every tab state:

```
0:topic[Substitution|Solving for x|Symmetry]{substitution|solving|symmetry} ; 1:representation[Workings|Visual explanation]{workings|visual}
```

## 2. The vocabulary

### Compositions — how visible content is arranged

| | Wide | Narrow | Adversarial payload |
| --- | --- | --- | --- |
| **`single.flow`** · the default | one column at a 760px measure | **no state change** | seven steps → taller, same composition |
| **`single.split`** | SCENARIO │ WORKED SOLUTION | stacked below 760px | a one-line prompt → **still a split** |
| **`comparison.paired`** | CASE A │ CASE B, then why they agree | stacked below 680px | cases of very unequal height |
| **`comparison.sharedVisual`** | the cases across, then **one** `visual.interpretation` belonging to both | stacked below 680px | a wide figure → the `down` subdesign |
| **`visual.interpretation`** | a figure and the reading of it | stacked below 720px | a wide figure → the `down` subdesign |

### Collections — several instances of one kind of thing

| | | |
| --- | --- | --- |
| **`collection.repeat`** | every item visible, one after another | this is what `sequence.flow` was |
| **`collection.tabs`** | one item visible at a time — **example tabs** | often the better choice on a Worked Examples page |

A collection is not a composition: it says *how many* are visible, not how one is arranged. Its child
is any composition — and in this atlas the repeated child literally **is** a `single.flow`, measures
included. (It was not, before this pass. See §6.)

### Presentations — staged alternative views of one idea

| | | |
| --- | --- | --- |
| **`presentation.tabs`** | authored alternative representations — **representation tabs** | this is what `visualCheck` was |
| **`presentation.stepper`** | an ordered walk through stages of one derivation | named for completeness; not exercised |

`presentation.tabs` is **not responsive behaviour**. It is a pedagogical relationship: solve it one
way, then inspect the same idea visually.

### The three tab patterns

| | |
| --- | --- |
| **Example tabs** | Negative value · Fraction · Decimal |
| **Representation tabs** | 1 Workings · 2 Graph check |
| **Subtopic tabs** | Substitution · Solving for *x* · Symmetry — each free to contain a different composition |

## 3. Scrolling — three genuinely different things

| | | |
| --- | --- | --- |
| **`scroll.page`** | **normal and desirable.** Notes, examples, derivations and explanations are as tall as they need to be. | image 17 is 2331–2987px tall, and that is the desired outcome |
| **`scroll.local-y`** | a deliberately designed **workspace** behaviour | **permitted only inside a persistent pane** |
| **`scroll.local-x`** | a local escape hatch for **indivisible** material | a table of values, an un-breakable expansion |
| **`scroll.persistent-pane`** | one pane stays while another moves — the practice workbook shape | the only context in which local-y is legitimate |

Ordinary prose and worked solutions never sit in a bounded vertical scroller. That is what turns a
lesson into a dashboard, and the build refuses it: `question`, `steps`, `solution`, `answer`,
`synthesis` and `interpretation` inside a local-y pane is an error.

The narrow state of the persistent pane **gives the bound up entirely** and returns to page scroll — a
bounded scroller inside a phone-width page is two scrollbars fighting.

**The affordance is part of the design.** A region that scrolls and shows no scrollbar reads as
*truncated*, which is worse than either honest outcome. Measured: in headless Chromium
`scrollbar-width:thin` and the `::-webkit-scrollbar` rules paint nothing, and `scrollbar-gutter:stable`
reserves 9px and leaves it blank. So every scrolling region also carries a fade at the edge its
content continues past, and in these screenshots that fade is the entire affordance.

## 4. The assembly

The reference page, image 20, is the whole hierarchy on one page:

```
page  ·  Worked examples — quadratics
└── collection.tabs (subtopic)
    ├── Substitution        → collection.repeat  →  3 × single.flow
    ├── Solving for x       → single.flow
    └── Symmetry            → presentation.tabs (representation)
                                ├── Workings           → comparison.paired
                                └── Visual explanation → visual.interpretation
```

Far more generalisable than inventing a bespoke layout per page — and every line of it is authored.

> **One divergence, on purpose.** The tree as you sketched it named `visual.interpretation.down` for
> the Symmetry topic's Visual explanation. The atlas renders it `.side`, because the figure that
> matches those two cases — *y* = *x*² with the line *y* = 9 — is **balanced**, and the subdesign is
> the figure's to decide. Hard-coding `.down` into an authored tree is exactly the confusion the axis
> separation exists to prevent. `.down` is exercised at images 10 and 12, where the figure really is
> wide. If you want that topic to be `down`, the change is to the figure, not to the tree.

## 5. Media geometry is the one permitted automatic classification

A figure's **class** — `portrait · balanced · landscape · wide` — comes from its authored domain's
aspect at equal unit scale. It is a **design input**, never a size, and the surrounding prose never
determines a figure's width. The author writes `visual.interpretation`; the class resolves the suffix.

| Figure | aspect | class | subdesign | preferred | at the wide width | narrow |
| --- | --- | --- | --- | --- | --- | --- |
| symmetry 10 × 12 | 1.20 | balanced | **side** | 488 × 625 @43.8 | — | 382 × 498 |
| graph check 12 × 22 | 1.83 | portrait | **side** | 386 × 716 @28.0 | — | 382 × 709 |
| roots 10 × 14 | 1.40 | portrait | **side** | 424 × 624 @37.4 | — | 382 × 565 |
| landscape 24 × 8 | 0.33 | **wide** | **down** | 717 × 346 @28.0 | 896 × 422 | 382 × 211 |

```
portrait | balanced   →  side   figure │ interpretation
landscape | wide      →  down   the figure at the atlas's wide width, interpretation beneath
```

Every plane is painted at a box solved for the width it is given — never a larger box squashed into
place. One x-unit and one y-unit render the same length in all 54 images.

## 6. What the build checks

Each control is here because it caught something.

| Control | What it caught |
| --- | --- |
| **The tab structure is the authored one** | nothing yet — it is the invariant the disclosure axis exists to protect. Driven to fail four ways: a width that drops a tab, a width that invents one, a panel that omits its content, a composition swapped inside a panel |
| **A tab hides content, it does not replace it** | added when the "structure is identical" claim turned out to be satisfiable by an empty box |
| **Prose is measured** | a repeated child ran the full 1152px canvas: `sequence.flow` declared no measure at all, and the old control — *"a region that declares a maximum must honour it"* — was vacuous exactly where no maximum was declared. Fixed by making the repeated child literally a `single.flow` |
| **A box solved for a width must use it** | the landscape plane's narrow box came back **169 × 156** against a 382px cap. It paints perfectly square and screenshots as a graph; only the width told the truth |
| **Settle, then measure** | the same box measured x/y = 1.045 and then 1.005 on an immediate repeat. Since paints are memoised, whichever came first was what the whole search ran on — so identical code gave different figures on different runs |
| **Height is not a constraint** | the app's own stylesheet sets `overflow:hidden` on the body, because the app is a slide surface. **A lesson page is not a slide.** The atlas overrides it and asserts it every render |
| **Local-y is a workspace behaviour and nothing else** | `overflow-x:auto` with `overflow-y:visible` is not a state CSS has — the spec coerces the visible one to `auto`. Reading computed style alone reported a vertical scroller wherever a wide equation sat, and the same coercion in reverse for the pane |
| **Local-x is local, and the proof is live** | the over-wide proof was **inert**: the table and the expansion both fitted their region on the desktop surface, so nothing overflowed |
| **A local-y pane must actually overflow** | same failure mode, in the other axis |
| **The page never scrolls sideways** | local-x is local or it is a defect |
| **A figure region contains a painted plane** | a region holding the literal text `undefined` still screenshots as a page |
| **A figure region is exactly its plane** | a full-width region around a narrower plane |
| **Equal-unit scale** | a narrow figure at x/y = 1.021, from squashing a pre-painted box |
| **Same payload, same slots, at every width and in every tab state** | a proof that shows different material at two widths proves nothing about either |
| **No inline geometry** | nothing is resolved at runtime; if it were, this fires |

## 7. What was kept from the resolver research, and what was discarded

**Kept** — properties of the material, not design decisions: figure intrinsic and legibility
information; minimum readable dimensions; equal-unit safeguards; overflow detection; tests for
unowned space inside a region; residue tests; same-payload responsive tests.

**Discarded as layout authority**: universal occupancy thresholds; track growth weights; height
matching between siblings; optimisation or scoring across candidate arrangements; automatic switching
between unrelated compositions; attempts to use all available space; the assumption that a page ought
to avoid vertical scrolling. **And now also**: any rule that would let a width, a height or an
occupancy decide how much of a page is disclosed at once.

## 8. What this pass is for

These 54 images are a **proposal, not an implementation**. `lesson-studio.html` is frozen and nothing
is built until the vocabulary is approved. `src/atlas.json` is the specification; `src/atlas.css`
states the designs; `src/*.html` are the payloads; `src/pack.json` authors the tab structure and the
composition list of every page; `atlas-report.json` records every render.
