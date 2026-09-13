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

## 4b. One thing for you to rule on

`visual.side` at desktop leaves **388px of trailing space** beside the plane — measured, not
estimated:

```
lesson-symmetry-visual-explanation-desktop     figure 647px   reading 259px   trailing 388px
```

The figure column is the plane's own legible size; the reading is four paragraphs. Nothing is wrong
by the rules — that is trailing space at the foot of one column, which the dead-space rule classifies
as reading margin, not unowned space between tracks. But you said you would judge whether the page
looks finished, and 388px is visible.

**I have not acted on it, and the build does not read the number back.** Measuring it in order to
resize either column is the resolver. The prescribed options, all yours:

1. **Leave it.** The figure is the subject of that view; the reading accompanies it.
2. **Tighten the `balanced` band in media geometry.** This plane is 1.20 — near the portrait edge of
   `0.75–1.3`. A narrower band would resolve it to `visual.down`, where the plane runs across the
   measure and the reading sits beneath it at full width. That is a media-geometry decision using
   only the figure's own aspect, but it is threshold tuning, which I will not do unasked.
3. **Give `visual.side` a prescribed second slot** below the reading — the tab's synthesis, say — so
   the column has authored content rather than margin. That changes the composition, so it is a
   grammar change and needs your word.

## 5. What the build checks

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

## 6. Status

The renders are for visual judgement — spacing, hierarchy, tab density, figure sizing, and whether
this reads as finished Mathematics courseware. `lesson-studio.html` remains untouched since
`41d40a8`; nothing here is product implementation beyond what is needed to render the frozen grammar.
