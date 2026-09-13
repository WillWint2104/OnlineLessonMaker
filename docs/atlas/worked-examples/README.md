# The worked-example grammar

> **The author chooses the instructional structure. The renderer chooses only the prescribed
> responsive state and media subdesign belonging to that structure.**

That one sentence is the recoverable path from where the resolver went wrong, and everything below is
it spelled out. The resolver experiment is retained at `docs/mockups/compositions/` as research
evidence, and **its layout-selection logic must not be ported into the app.** `lesson-studio.html` has
been untouched since `41d40a8` throughout.

`node scripts/atlas-worked-examples.mjs` renders all 60 images in Chromium using the app's own
stylesheet and the shipped Figure Engine. `ATLAS_ONLY=01,16 node scripts/…` renders a subset.

---

## 1. The proof — one authentic page

**Image `01`** is the deliverable. Four tab states × desktop 1152 · tablet 834 · phone 382. It is a
real Worked Examples page, built out of nothing but this vocabulary:

```
PAGE  ·  Worked examples — quadratics
│
├── collection.tabs                              ← several sibling subtopics; select one
│   ├── "Substitution"    → collection.repeat    → single.flow × 3
│   ├── "Solving for x"   → single.flow
│   └── "Symmetry"        → views.tabs           ← one object, seen two ways
│                              ├── Workings           → comparison.paired
│                              └── Visual explanation → visual.side   ← media geometry
└── scroll.y = page
```

| | desktop 1152 | tablet 834 | phone 382 |
| --- | --- | --- | --- |
| Substitution | 1854px | 1820px | 2191px |
| Solving for *x* | 1030px | 996px | 1177px |
| Symmetry · Workings | 1010px | 976px | 1477px |
| Symmetry · Visual explanation | 1194px | 1443px | 1509px |

Every one of those heights is an outcome, never a target.

## 2. What never decides anything

The number of words · the height of anything · occupancy · whitespace · the number of solution steps ·
how tall the page turned out. The renderer never invents a tab, never moves content between tabs, and
never treats a tall screen as a failure. **Those were the things that destroyed the earlier approach.**

## 3. The four frozen axes

| Axis | Question it answers | Decided by |
| --- | --- | --- |
| **Composition** | What is visible together, and where? | **author** |
| **Collection / disclosure** | If there are several related things, which are visible at once? | **author** |
| **Scroll** | Which surface is allowed to move? | **author** |
| **Media geometry** | Which approved subdesign does the media shape permit? | the figure's own geometry |

The responsive state is **not** a fifth axis. It is the prescribed wide/narrow arrangement *of* a
composition, from the surface width alone, and it can never select a different composition.

### Compositions

| | Wide | Narrow | Adversarial payload |
| --- | --- | --- | --- |
| **`single.flow`** · the default | one column at a 760px measure | **no state change** | seven steps → taller, same composition |
| **`single.split`** | SCENARIO │ WORKED SOLUTION | stacked below 760px | a one-line prompt → **still a split** |
| **`comparison.paired`** | CASE A │ CASE B, then why they agree | stacked below 680px | cases of very unequal height |
| **`visual.side`** | FIGURE │ INTERPRETATION | stacked — see §5 | — |
| **`visual.down`** | the figure across the measure, interpretation beneath | **no state change** | a wide figure resolves here |
| **`comparison.sharedVisual.side`** | the cases across, then FIGURE │ INTERPRETATION | stacked below 680px | — |
| **`comparison.sharedVisual.down`** | the cases across, then the figure across the measure | stacked below 680px | a wide figure resolves here |

### Collections and views — the distinction that needed a name

| | Means | Reads as |
| --- | --- | --- |
| **`collection.repeat`** | several sibling items, all visible | items down the page |
| **`collection.tabs`** | **several SIBLING ITEMS; select one** — `[ Negative ] [ Fraction ] [ Decimal ]` | an **item selector**: an underlined bar |
| **`views.tabs`** | **ONE object, seen in several REPRESENTATIONS** — `[ Workings ] [ Graph check ]` | a **view switch**: a segmented control |

`collection.tabs` and `views.tabs` look alike and mean importantly different things, so the difference
is **encoded** (`data-tabs-kind`), not merely styled — and the affordance is keyed on the **kind**, so
a views group reads as a view switch wherever it sits. An earlier pass keyed it on nesting depth,
which would render a top-level `views.tabs` as an item selector and lie about what the tabs mean. The
build asserts one affordance per kind at every depth:

```
collection  border-bottom 1px · no radius · transparent current tab with a 2px underscore
views       1px box · 7px radius · filled current tab, no underscore
```

**`visualCheck` is gone as a composition** and has no rendering logic anywhere. It was always
`views.tabs{ Workings → single.flow, Graph check → visual }`. A future `[ Method 1 ] [ Method 2 ]` is
`views.tabs{ single.flow, single.flow }` — not a new template. That is how the vocabulary scales
without sixty named layouts.

### Scroll — two contracts, not one enum

A long equation is not the same design decision as an independently scrolling workspace, so they are
separate fields:

```json
{ "scroll": { "y": "page", "x": "local-when-needed" } }
```

| | | |
| --- | --- | --- |
| **`scroll.y = page`** | **the default.** The document may get arbitrarily tall. | virtually all Notes, Worked Examples, Videos and ordinary teaching pages |
| **`scroll.y = pane`** | an explicit template feature — one pane moves, another stays | the Workbook shape. **Not** available as a renderer trick for making lesson content shorter |
| **`scroll.x = local-when-needed`** | indivisible material overflows inside its own region | a long equation, a table of values |

The build refuses teaching prose (`question · steps · solution · answer · synthesis · interpretation`)
inside a `scroll.y = pane` region, and refuses any vertical scroller outside a persistent-pane
template.

### Media geometry stays extremely dumb

It answers exactly one question — *which approved subdesign does this composition use* — and may never
answer *maybe this should be a different composition*.

| Figure | aspect | class | resolves | preferred | desktop | tablet | phone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| symmetry 10 × 12 | 1.20 | balanced | `.side` | 488 × 625 | 488 × 625 | 488 × 625 | 382 × 498 |
| graph check 12 × 22 | 1.83 | portrait | `.side` | 386 × 716 | 386 × 716 | 386 × 716 | 382 × 709 |
| roots 10 × 14 | 1.40 | portrait | `.side` | 424 × 624 | 424 × 624 | 424 × 624 | 382 × 565 |
| landscape 24 × 8 | 0.33 | **wide** | `.down` | 717 × 346 | 900 × 421 | 834 × 393 | 382 × 211 |

Images `10` and `11` are the proof that matters: **the same authored `comparison.sharedVisual`, with a
balanced figure and with a wide one, resolving `.side` and `.down`. Both remain
`comparison.sharedVisual`.** A subdesign change with no semantic composition change — exactly the level
of automatic behaviour wanted. The build asserts a resolved name never leaves the frozen vocabulary
and never changes its base.

One box per surface, each *solved* at the width it will occupy — never a larger box scaled down. One
x-unit and one y-unit render the same length in all 60 images.

## 4. The JSON principle

**The JSON describes intent, not layout arithmetic.**

```json
{ "composition": "comparison.sharedVisual", "cases": [...], "visual": {...}, "interpretation": {...} }
{ "collection": { "mode": "tabs",  "items": [...] } }
{ "views":      { "mode": "tabs",  "items": [...] } }
```

not

```json
{ "leftWidth": 42, "occupancy": 0.55, "preferSplit": true, "maxDeadSpace": 96 }
```

The first says what the lesson **is**; the second tells CSS how to improvise. The build scans every
authored file and refuses the second — not the rendered page, the *source*, because the principle is
about what an author is allowed to write.

## 5. One derived switch point — and it is a proposal

Every switch point in the atlas is a constant belonging to its composition, **except one**.
`visual.side` switches at

```
figure.preferredWidth + gap + minInterpretation        (minInterpretation = 420px)
```

which gives 940px for the symmetry plane, 876px for roots, 838px for the graph check.

A fixed number cannot serve a figure system whose planes are 386–717px wide. **Measured:** at the
834px tablet a fixed 720 leaves the 488px symmetry plane beside a **314px** reading column — narrower
than the atlas's own 520px case measure. The derived point stacks instead, which is the right design
and is still *prescribed*: two numbers, the authored figure's own preferred width and one
design-system constant. It never looks at the prose, the step count or the height of anything.

`visual.down` has no switch point at all — the arrangement is identical at every width and only the
plane's box changes.

**This is the one place I extended the rule rather than following it, so it needs your yes or no.**
The alternative is a fixed number and a 314px column on tablet.

## 6. Later, and deliberately separate

The assessment/workspace family gets its **own** rigid compositions rather than bending the teaching
ones: `practice.paper`, `practice.workbook`, `practice.graphWorkbook`, `practice.geometryWorkbook`.
Named here so nobody reaches for a teaching composition to build a workbook. `views.stepper` is named
for the same reason. None is built.

## 7. What the build checks

Fifteen controls. Each is here because it caught something, and each has been driven to fail on
purpose — the regression script lives in this commit's history, not in the repo.

| Control | What it caught |
| --- | --- |
| **The authored tab structure** | the invariant the disclosure axis exists to protect. Driven to fail four ways: a width that drops a tab, a width that invents one, a panel that omits its content, a composition swapped inside a panel |
| **The two kinds are encoded, not styled** | an affordance keyed on nesting depth rather than on meaning — a top-level `views.tabs` would have rendered as an item selector |
| **A resolved name stays in the vocabulary** | a subdesign that invents a name, and a subdesign that changes its base composition |
| **No layout arithmetic in an authored file** | the JSON principle, made a property of the source rather than a paragraph in a document |
| **A tab hides content, it does not replace it** | "the structure is identical" turned out to be satisfiable by an empty box |
| **Prose is measured** | a repeated child ran the full 1152px canvas: the old control ("a region that declares a maximum must honour it") was vacuous exactly where no maximum was declared |
| **A box solved for a width must use it** | the landscape plane's narrow box came back **169 × 156** against a 382px cap. It paints perfectly square and screenshots as a graph; only the width told the truth |
| **Settle, then measure** | the same box measured x/y = 1.045 and then 1.005 on an immediate repeat — and paints are memoised, so identical code gave different figures on different runs |
| **Height is not a constraint** | the app's own stylesheet sets `overflow:hidden` on the body, because the app is a slide surface. A lesson page is not a slide |
| **`scroll.y = pane` is a workspace behaviour and nothing else** | `overflow-x:auto` with `overflow-y:visible` is not a state CSS has — the spec coerces the visible one to `auto`, in both directions |
| **`scroll.x` is local, and the proof is live** | the over-wide proof was **inert**: the table and the expansion both fitted their region on the desktop surface |
| **A pane must actually overflow** | the same failure mode in the other axis |
| **The page never scrolls sideways** | local overflow is local or it is a defect |
| **A figure region contains a painted plane, and is exactly it** | a region holding the literal text `undefined`; a full-width region around a narrower plane |
| **Same payload, same slots, at every width and tab state** | a proof that shows different material at two widths proves nothing about either |

## 8. Status

These 60 images are a **proposal**. `lesson-studio.html` is frozen and nothing is built until the
grammar is approved. `src/atlas.json` is the grammar; `src/atlas.css` states the designs;
`src/*.html` are the payloads; `src/pack.json` authors the composition list and tab signature of every
page; `atlas-report.json` records every render.

**No more resolver research.** The next thing this vocabulary should produce is lesson JSON, not
another thirty width cases.
