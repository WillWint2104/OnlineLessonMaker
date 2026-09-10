# The composition contract — Mathematics worked examples

The reference pack for the five worked-example compositions, and the specification the renderer must
implement. **These images are the approved design; this file is its API.** Where a sentence here and a
pixel in the app disagree, the app is wrong.

They are not drawings. `node scripts/mockups-compositions.mjs` renders them in Chromium from the app's
own material:

- **the whole of `lesson-studio.html`'s stylesheet** is loaded and read back out of the CSSOM — tokens,
  vendored faces, theme mapping and the Figure Engine's `.tp-fig*` rules — so no colour, weight, radius
  or typeface in the pack was invented. (Slicing `<style>…</style>` out of the file's text does not
  work: its own comments mention the tag, the blocks mis-pair, and rules go missing while the images
  still look plausible. The first build of this pack lost every grid, axis and curve stroke that way.)
- **every plane is the shipped engine's output**, mounted in the app's own
  `.mx-part[data-mx-part="figure"] › .mx-figstage › .mx-figskin.tp-slide` chain — the selector that hands
  `--mx-grid`, `--mx-ink` and `--mx-line` to the engine — and solved against the exact slot the mockup
  gives it. The build prints each plane's rendered px-per-unit; every one in this pack is 1.000 ± 0.002.
- **every dimension printed on a `-spec` image is the value that drives the layout**, substituted from
  `src/spec.json`, so a reference image and its measurements cannot drift apart.

---

## 1. What chooses what

```
JSON semantics        →  the composition FAMILY          (authored, never inferred)
available space       →  that family's RESPONSIVE STATE  (measured, never a breakpoint)
content size          →  the page's HEIGHT               (never a different composition)
```

A worked-example group authors:

```json
{ "presentation": "workedExample", "composition": "standard" }
```

`composition` ∈ `standard · sequence · pairedVisual · visualCheck · extended`. Unknown values fall back
to `extended`. **Nothing measures how much text an example has in order to choose a layout** — with one
declared exception, stated under `pairedVisual`, which is a responsive-state decision and is called out
there so it can be argued with rather than discovered.

**Renames from the shipped vocabulary.** `comparison` → **`pairedVisual`**, `staged` → **`visualCheck`**.
The old names must keep resolving (as `visual` and `compact` already do) so authored lessons do not break.
`compact` is gone for good: it named a size, and naming a size is what produced the layouts this pack
replaces.

## 2. The invariants that hold in every family

| Invariant | Value / rule |
| --- | --- |
| **Content region** | the white teaching surface inside its padding. Every width below is measured there, never against the viewport. Desktop reference 1152px (a 1536px viewport, rail open); narrow reference 382px (a 414px handset) |
| **Surface padding** | 30px desktop · 16px narrow |
| **Column gap** | 40px between any two tracks |
| **Minimum viable text track** | 300px. Below it a track is a shape, not a measure |
| **Minimum viable solution track** | 420px |
| **Maximum reading measure** | 620px for explanatory prose. This is a ceiling, not a width to fill: what the page has spare stays spare |
| **Figure minimum useful size** | 340 × 255px |
| **Figure natural size** | bounded on its **longer** side at 720px, aspect untouched |
| **Figure scale policy** | one authored *x*-unit and one authored *y*-unit render at the same length. A composition may allocate width, stack, paginate or scroll; it may never distort, squash or inflate the plane |
| **Alignment** | every track top-aligns. Nothing is centred — not a track, not a plane, not an answer |
| **A track is a position, not a box** | the prompt track locates the question. No fill, no border, no stretching to match its sibling's height. When the solution is tall the prompt track simply ends where its content ends |
| **Answer** | the closing band of the solution track, at the solution's own content origin — a rule above it, the label run in, the value flowing as text. Never a card, never centred, never indented past the steps |
| **Naming** | the example title spans the row; QUESTION and WORKED SOLUTION label their tracks; ANSWER closes the solution; the synthesis is named once, and never with a name a part it contains already carries |

## 3. The five families

### `standard` — one example · `01`, `02`

```
TITLE  (spans the content region)
QUESTION  |  WORKED SOLUTION
          |  ANSWER
WHAT THIS SHOWS   (full content region)
```

| | |
| --- | --- |
| Prompt track | **36%** of the content region (34–38% is the acceptable band), floor 300px |
| Solution track | the remainder, floor 420px |
| Divider | one hairline centred in the 40px gap, as tall as the row's content |
| Labels | QUESTION and WORKED SOLUTION begin on the same line beneath the title |
| Responsive switch | stack when the content region < 300 + 40 + 420 = **760px** |
| Stacked order | title → question → worked solution → answer → synthesis, one inset, no divider |

### `sequence` — N examples of one skill · `03`, `04`

N instances of the `standard` row, identical at every N, a hairline between them, the synthesis after
the whole sequence at the full content region. **There is no count-specific geometry**: two examples are
two rows, four are four. No 2 + 1, no centred remainder, no fixture-specific widths. The hairline between
instances belongs to the sequence, not to an example — nothing that reaches an instance may be keyed on
its position.

### `pairedVisual` — two cases and the object that explains them · `05`, `06`, `07`

```
CASE A            |  SHARED VISUAL  |  CASE B          ← wide
WHY THE TWO AGREE                                       (full content region)
```

Three columns are legal **only** while all of these hold:

1. each case rail ≥ 300px;
2. the shared visual ≥ 340 × 255px;
3. the plane renders its authored geometry at equal scale in that column — no distortion, ever;
4. **neither case runs past the shared visual.**

(1)–(3) are space. (4) is the one place where content length selects a responsive state, and it is
deliberate: three columns say "read these three at once", which stops being true when a case runs on
past the object it is being compared through. It is stated as a measurable rule — case height ≤ figure
height — rather than "the cases are short", so it can be gated. **Raise it if you would rather the third
column simply never appear below a fixed width.**

When any condition fails the family changes **responsive state**; it never squeezes the plane:

```
CASE A  |  CASE B          ← two-row state: both cases complete, side by side
SHARED VISUAL             ← full content region, the plane larger than it was
WHY THE TWO AGREE
```

and narrow: case A → case B → shared visual → why the two agree. **The picture never appears between
the two cases in any state** — that puts the answer on the screen before the reader has worked the
second case, which changes the pedagogy rather than the layout.

### `visualCheck` — workings, then the same question read off the curve · `08`, `09`, `10`

Two authored local states.

```
1 Workings          the standard row, unchanged
2 Graph check       GRAPH  |  INTERPRETATION
```

| | |
| --- | --- |
| Graph region | the plane at its natural size, left aligned in its region. Never centred in the page, never grown to fill it |
| Interpretation rail | the algebraic result, the graphical evidence, the connection — capped at the 620px reading measure, top-aligned with the graph |
| Divider | **none.** A full-height rule beside a 720px plane makes the pair a box; the gap and the two region labels are the boundary |
| Responsive switch | stack graph → interpretation when the content region < 340 + 40 + 300 = **680px** |

### `extended` — a derivation in local states · `11`

Not "the ordinary example, made very tall". The reasoning is paginated into authored states —
`1 Algebra · 2 Visual check · 3 Conclusion` — **and each state gets the composition its own content
needs**: the algebra is a `standard` row, the visual check is a `visualCheck` pair, the conclusion is the
answer with its relationship. That is how a long derivation with a graph halfway through stops becoming
one malformed general-purpose block.

## 4. What this pack changes about the shipped page

Everything below is currently wrong in `lesson-studio.html` at `41d40a8` and is what the next
implementation pass is for. **No app code was changed to produce this pack.**

1. **The tinted question region goes.** The prompt track is a position: no fill, and no stretching to
   the solution's height. The empty space below a short question needs no explanation — it is the space
   below a short question.
2. **`comparison` → `pairedVisual`, `staged` → `visualCheck`**; old names keep resolving.
3. **`pairedVisual` gains its two-row state.** Today the collapse goes straight from three columns to
   two local states; the two-row state (both cases side by side, the shared visual full width beneath)
   is the missing middle.
4. **`extended` gets per-state compositions** rather than one long row.
5. **The graph pair loses its divider** and its rail top-aligns to the plane rather than stretching.

## 5. Files

| File | What it fixes |
| --- | --- |
| `01-standard-desktop.png` · `-spec` | the two-track row; tracks that are positions |
| `02-standard-narrow.png` | the stacked order, one inset, nothing centred |
| `03-sequence-desktop.png` · `-spec` | N identical rows; the death of 2 + 1 |
| `04-sequence-narrow.png` | each row completes before the next begins |
| `05-pairedvisual-wide.png` · `-spec` | three zones and a real shared plane |
| `06-pairedvisual-two-row.png` | the missing middle state |
| `07-pairedvisual-narrow.png` | the narrow order |
| `08-visualcheck-workings.png` | state 1 is just the standard row |
| `09-visualcheck-graph.png` · `-spec` | graph region and interpretation rail, one top edge, no divider |
| `10-visualcheck-narrow.png` | graph → interpretation, proportions kept |
| `11-extended-states.png` | a derivation is states, not height |

`src/` is the reproducible source: `spec.json` (the dimensions, used twice — as layout and as
annotation), `figures.json` (the planes and the slots they are solved in), `kit.css` (the mockup
stylesheet) and one HTML fragment per image. **`kit.css` is a mockup stylesheet.** Its `mk-*` classes
exist to state the contract for review; the app must implement this geometry through its own semantic
names, and must not import this file.

Rendered px-per-unit for every plane in the pack, authored 1:1 — paired-visual wide 33.49 / 33.47
(1.001) · paired-visual two-row 47.91 / 47.90 (1.000) · paired-visual narrow 26.61 / 26.59 (1.001) ·
graph check 26.15 / 26.16 (1.000) · graph check narrow 20.18 / 20.18 (1.000) · extended roots 22.80 /
22.84 (0.998).
