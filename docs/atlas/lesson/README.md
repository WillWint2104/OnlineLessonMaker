# The first lesson

**The lesson is the test of the system, not the other way round.**

`docs/atlas/lesson/quadratics.lesson.json` is a complete NSW Stage 5 Mathematics lesson —
*Quadratic relationships · The parabola y = x²* — authored in the frozen grammar and nothing else.
`node scripts/lesson-render.mjs` renders it at **desktop 1152 · tablet 834 · phone 382**, in every
tab and view state the lesson declares.

No fragment, no fixture, no hand-written markup. The renderer walks the lesson JSON and emits the
frozen vocabulary; anything the grammar does not contain is **reported as a missing capability and
the run stops**, rather than quietly accommodated.

---

## 1. The ruling this pass implements

> The author chooses the instructional structure. The renderer chooses only the prescribed
> responsive state and media subdesign belonging to that structure.

`visual.side` is viable when

```
availableWidth ≥ figurePreferredWidth + gap + minInterpretationWidth
```

and that is a **responsive viability calculation, not a layout choice**. It asks only whether the
prescribed side-by-side subdesign can physically satisfy its two minimum regions.

| Input | Source |
| --- | --- |
| `figurePreferredWidth` | the media-geometry contract only — `scripts/lib/figure-geometry.mjs`, one owner |
| `gap`, `minInterpretation` | fixed design-system tokens (32px, 420px) |
| prose length · rendered height · step count · occupancy · dead space | **not inputs, and not reachable from where the rule is computed** |

Crossing the threshold changes the prescribed responsive state only. The authored composition is
untouched. `visual.down` has no switch point at all — media already assigned the down subdesign
stays down, however wide the monitor. Height is `auto`; the page scrolls.

**Two controls hold that shut.**

- **Content perturbation.** Every paragraph is tripled and every step doubled, and the run asserts
  that not one prescribed state moves, at any width, in any tab state. If prose length, step count
  or rendered height had leaked into the rule, this moves.
- **No residue across the threshold.** One page instance is driven to the narrow surface and back,
  and the wide arrangement — every `data-tpl`, its state, its rendered width — must be identical to
  a fresh wide render. The switch is a pure width comparison, so it must restore exactly.

## 2. The lesson

| | Composition | |
| --- | --- | --- |
| **Substitution** | `collection.repeat` → 3 × `single.flow` | a negative, a fraction, a decimal — each goes wrong differently. The third ends in a table of values |
| **Solving for *x*** | `collection.repeat` → `single.flow`, `single.split` | the bare equation, then the same algebra inside a situation (a stone from a bridge, where the negative root is rejected for a reason) |
| **Symmetry** | `views.tabs` → `comparison.paired` · `visual` | one object, two representations: solve it, then see the same fact on the curve |
| **A flatter parabola** | `visual` | *y* = *x*²/12 over a window wide enough to see what dividing through did |

Whole page under `scroll.y = page`, with `scroll.x = local-when-needed`.

```
PAGE
└── collection.tabs  ·  Substitution | Solving for x | Symmetry | A flatter parabola
    ├── collection.repeat → single.flow × 3
    ├── collection.repeat → single.flow, single.split
    ├── views.tabs        → comparison.paired · visual.side
    └── visual.down
```

15 renders — 5 states × 3 surfaces. Page heights 920–2285px, every one an outcome.

**`comparison.sharedVisual` was not needed.** The lesson never wanted two cases sharing one figure,
so it does not use one. A vocabulary term going unused in a lesson is not a defect.

## 3. What the lesson exposed

One thing, and it is **content vocabulary, not one of the four axes**:

> **A step body could hold one mathematical statement, and a check step naturally holds two.**

The third step of *Solving x² = 16* is "check each one back in the original equation", which is two
independent statements — `4² = 16` and `(−4)² = 16`. Written as one string with spaces between them,
HTML collapses the run of spaces and they render as a single broken statement. The lesson could not
say *these are two statements* at all.

Reported rather than worked around: a `math` value may now be a string **or a list of statements**,
set side by side and wrapping rather than overflowing. This adds nothing to composition, collection,
scroll or media geometry — it is what a step is allowed to contain.

Nothing else was missing. The four axes expressed the whole lesson.

## 4. Two defects this pass found by looking, not by measuring

- **The page frame did not hold the surface.** `.at-surface` is `surface + 2 × pad` wide; the narrow
  and tablet frame overrides counted the surface without its padding, so the frame was 32px (phone)
  and 48px (tablet) too small and **the right-hand edge of every line was clipped**. The document
  never scrolled sideways while it happened, so the control watching the document was blind to it —
  only a phone render showed it. There is now a control on the frame, and it fails on the old CSS
  with `the page frame is 874px around 902px of surface`.
- **A wrong number in the lesson.** "the curve needs 24 units of *x* to climb 6 units of *y*" — 24 is
  the width of the window, not the climb. `y = x²/12` reaches 6 at *x* ≈ 8.49; `y = x²` reaches it at
  *x* ≈ 2.45. Corrected, and checked by evaluation rather than by eye.

## 4b. Ruled, and applied

The 388px empty rail is gone. The ruling was: a near-square or tall graph takes `visual.down`, decided
by media geometry alone, and a taller page is preferable to an awkward side composition.

**Tightening the `balanced` band alone could not deliver that.** At 1.20 the plane simply moved out of
`balanced` and into `portrait` — which also resolved `side`. Measured before changing anything:

```
figure       aspect   old class → sub    new class → sub
symmetry      1.20    balanced  → side   portrait  → down
graphcheck    1.83    portrait  → side   portrait  → down
roots         1.40    portrait  → side   portrait  → down
landscape     0.33    wide      → down   wide      → down
```

So `portrait` resolves `down` as well, and `balanced` is now `0.75 – 1.0`: **`side` is reserved for
the one shape it suits — a plane no taller than it is wide.** The decision is still pure media
geometry; nothing about paragraph length, sentence count, occupancy or measured dead space enters it.

Two consequences worth your eye:

- **Every figure in the corpus became `down`,** which would have left `visual.side`, its derived
  switch point and both its controls unexercised — a contract nothing tests. One balanced plane
  (`squareish`, 0.86, *y* = *x*² with the line *y* = 9) was added to the **atlas** figure set to keep
  them live. The lesson was not changed to suit it.
- **`down` used to grow a plane to the atlas's wide-figure width.** That is right for a plane wider
  than it is tall — a 717px landscape plane reads better at 896px — and wrong for every other shape.
  When `portrait` moved into `down`, that rule met a tall plane for the first time and blew the
  488 × 625 symmetry graph up to **900 × 1120**, which is worse than the void it replaced. The growth
  now applies only to planes wider than they are tall. A plane is never grown past its legible size.

## 4c. The tab strip

`collection.tabs` at 382px used to wrap, leaving *A flatter parabola* alone on a second row. The strip
is now **one row that scrolls locally in x and never wraps**, at every width, and selecting a tab
scrolls it fully into view. No dropdown, no smaller type. The partly visible neighbour at the edge is
the affordance — a fade would dim the control the reader is reaching for.

`data-scroll-x="tabstrip"` declares the contract that permits this. It is deliberately not `local`:
authored indivisible material fades at its edge, and a tab must not.

Three controls, each driven to fail on purpose: the strip must be one row; the current tab must be
fully in view; and **only a declared contract may scroll sideways** — `local` for indivisible
material, `tabstrip` for the strip, and nothing else.

## 4d. What whitespace means

This replaces every occupancy percentage the resolver ever used:

| | |
| --- | --- |
| Free width **outside** a composition | legitimate reading margin. *Use all the available desktop width* is **not** a goal |
| Unexplained empty area **inside** a semantic track or rail | not automatically acceptable — fixed by choosing a different prescribed subdesign, never by measuring the content |
| A tall page | completely acceptable; height is unconstrained and the page scrolls |
| Local horizontal scrolling | only for components whose contract permits it |
| Changing composition because a paragraph is short | **forbidden** |

## 5. What the build checks## 5. What the build checks

Everything the atlas checks, plus the three above. In particular:

| Control | |
| --- | --- |
| **Missing capability** | every node must name a composition, collection mode or views mode the grammar contains; an unknown one stops the run and names it |
| **No layout arithmetic in the lesson** | scanned over the source — a lesson says what it IS |
| **Identical instructional payload at every width** | the visible text, the slot sequence and the composition list of a given tab state must be character-identical at 1152, 834 and 382 |
| **Tab structure identical at every width** | count, labels, panels, nesting, kind |
| **One affordance per tab kind, at every depth** | `collection` is an item selector, `views` a view switch |
| **`scroll.x = local-when-needed` is a permission** | each region must be local and well-behaved; the run as a whole must need it at least once, or the contract is untested. The table of values fits at 1152 and overflows at 382 — both correct |
| **Equal-unit scale, region = plane, prose measure, height unconstrained, no inline geometry** | as the atlas |

## 5b. Accepted as golden

Ruled after the first lesson and to be built upon rather than revisited: **`single.flow`,
`single.split`, `collection.repeat`, `scroll.y = page`, and the narrow repeated-example anatomy** —
together with the hierarchy *subtopic tabs → explanation → example → example → synthesis*.

## 6. Status

The renders are for visual judgement — spacing, hierarchy, tab density, figure sizing, and whether
this reads as finished Mathematics courseware. `lesson-studio.html` remains untouched since
`41d40a8`; nothing here is product implementation beyond what is needed to render the frozen grammar.
