# The composition contract — Mathematics worked examples

**Fitting horizontally is not the same as being viable.** That is the whole of this revision. The
previous pack established the topology — four primitives, region contracts, no typed widths — and
then decided every arrangement with one test, `min + gap + min ≤ available`. That test establishes
that two tracks can physically exist. It says nothing about whether the result is a composition.

A candidate must now pass **four independent conditions**, and `node scripts/mockups-compositions.mjs`
enforces them by laying the candidate out, measuring it, and writing the verdict onto the image:

| Gate | Question |
| --- | --- |
| **width** | can every region meet its minimum useful width? |
| **fidelity** | can every intrinsic asset keep the size it actually needs? |
| **occupancy** | does the shorter track fill enough of the row to be a track rather than a fragment? |
| **dead space** | does every substantial piece of inline space belong to a semantic region? |

**Stack is the safe fallback, not a failure.** There can be 1152px of width and this particular
content pair still not belong side by side. In this pack, 22 of 30 arrangements are rejected.

There are no container queries left in the kit, and their absence is the point. A query can ask how
wide the container is. It cannot ask whether the shorter track fills the row — that is knowable only
after a candidate has been laid out. So the resolver lays it out, measures, and assigns.

---

## 1. Figures are sized first

The inversion you asked for. The resolver never asks *how much width is left for the graph*. It asks
what box this graph needs and builds a composition from what remains. **A figure track is never
`1fr`, never `auto`, and never the space that happens to be free.**

Every plane has a **layout signature**, a property of the plane rather than of any surface:

```
minimumReadableScale   the plot area just clears the engine's floor, 340 × 255
preferredScale         85% of the maximum
maximumUsefulScale     the whole box, gutters included, just reaches the 720px bound
```

The signature is in **scale — px per authored unit — not in box dimensions**, and that correction came
from the engine after two attempts produced confident nonsense:

1. Defining the boxes as *the largest box that still paints square units* made every plane answer
   720 × 720. The engine holds square units at almost any box by **showing more of the plane**;
   squareness is a floor it already guarantees, not a size.
2. Modelling the box as `authoredSpan × scale + a fixed gutter` failed differently — the gutter is not
   fixed, and which axis binds changes with the box, so the model missed by up to 3%.

What works is to stop modelling the engine and measure it: guess a box, paint it, read px-per-unit off
the rendered tick labels, correct both dimensions by the ratio of asked to painted. It converges in
three or four paints and needs no theory about gutters at all.

**The floor is a property of the mathematics** (the plot must clear 340 × 255) and **the bound is a
property of the page** (the whole box may not exceed 720). They are different things, and for an
extreme aspect they can fail to overlap:

| Plane | min readable | preferred | max useful | |
| --- | --- | --- | --- | --- |
| symmetry 10 × 12 | 373 × 486 @34.0 | 488 × 625 @43.8 | 565 × 718 @51.5 | |
| graph check 12 × 22 | 386 × 716 @28.0 | — | — | **floor unreachable**: the plot needs 28.3 px/unit to clear 340 × 255; the bound is reached at 28.0 |
| roots 10 × 14 | 380 × 561 @34.0 | 424 × 624 @37.4 | 490 × 716 @44.0 | |
| portrait 6 × 16 | 332 × 705 @35.5 | — | — | **floor unreachable**: needs 56.7, bound reached at 35.5 |
| landscape 24 × 8 | 717 × 346 @28.0 | — | — | **floor unreachable**: needs 31.9, bound reached at 28.0 |

**Three of five planes cannot satisfy both.** That is a Figure Engine decision, not a layout one, and
the pack reports it rather than hiding it: those planes have exactly one legal scale, and the resolver
is told so instead of discovering it by painting something distorted. If `MX_PLOT_H = 720` is the
binding constraint, raising it for tall domains is the lever.

## 2. The occupancy gate, and the data to set it by

```
occupancy = the shorter track's content height ÷ the row's height
```

The pack uses **0.55**, the middle of the range you suggested. Every measurement it produced:

| Image | Primitive | Heights | Occupancy | Verdict |
| --- | --- | --- | --- | --- |
| 01 standard-balanced | instructionSplit | 207 / 270 | **77%** | split |
| 02 standard | instructionSplit | 58 / 270 | 22% | stack |
| 03 sequence (×3) | instructionSplit | 58 / 270, 58 / 270, 58 / 202 | 22, 22, 29% | stack |
| 04 pairedVisual cases | repeat(across) | 315 / 315 | **100%** | split |
| 04 pairedVisual visual | visualInterpretation | 647 / 426 | **66%** | split |
| 05 visualCheck state 1 | instructionSplit | 58 / 270 | 22% | stack |
| 05 visualCheck state 2 | visualInterpretation | 738 / 426 | **58%** | split |
| 06 extended state 1 | instructionSplit | 58 / 270 | 22% | stack |
| 06 extended state 2 | visualInterpretation | 646 / 259 | 40% | stack |
| 07 long question | instructionSplit | 233 / 202 | **87%** | split |
| 08 long solution | instructionSplit | 58 / 546 | 11% | stack |
| 09 over-wide maths | instructionSplit | 58 / 301 | 19% | stack |
| 10 dense interpretation | visualInterpretation | 738 / 506 | **69%** | split |
| 11 sparse interpretation | visualInterpretation | 738 / 103 | 14% | stack |
| 12 portrait plane | visualInterpretation | 727 / 206 | 28% | stack |
| 13 landscape plane | visualInterpretation | 368 / 232 | **63%** | split |

**The consequence is large and you should see it before ruling.** At 0.55, an ordinary worked example
— a one-line question beside a three-step solution — measures 22% and stacks *at every width*. The
shipped Substitution examples all stack. `instructionSplit` becomes the exception rather than the
rule, reached only by a question with real content in it (77%) or a question longer than its solution
(87%). Your seven-step case measures 11% and stacks, exactly as you predicted.

If that is too strict the lever is one number. At 0.30 the ordinary example splits again and the
seven-step case still stacks; at 0.25 the wide-equation case (19%) comes back too. Nothing else in the
resolver changes.

## 3. Dead space — where I diverged, and why

Your rule: *every substantial region of horizontal space created by a composition must belong to a
semantic region.* I implemented it as a rejection first, and it made the resolver strictly worse:

> A 386px plane on a 1152px surface leaves 94px past the interpretation rail once the rail is at its
> 640px maximum. Rejecting that stacked the pair — and **produced 766px of trailing space instead of
> 94px.** The gate rejected a small hole by creating a large one.

So dead space is now an **invariant, not a rejection**, and it is scoped to what the composition
actually creates:

- **forbidden**: unowned width *between* two tracks, or *inside* a track — a 736px figure track around
  a 600px plane. Checked on every image, in both states.
- **page margin**: space past the last track. It is reported, never failed.

And the fix for your image-06 objection is ownership rather than arrangement: **a stacked figure
region is now shrunk to its plane.** A full-width figure region around a 386px plane claims 766px it
can never use — the same defect as the 736px track, only harder to see because nothing sits beside it.
Shrinking the region does not move a pixel of the rendered image; it moves the ownership of that space
from the composition to the page margin, which is what the rule is about.

## 4. The resolver

1. Read the semantic composition from the JSON. Never infer it from content.
2. Determine the legal primitive arrangements.
3. Obtain a layout signature for every region — minimum, preferred, maximum, rendered height; for a
   figure, its three scales. **Derived at layout time from rendered content, never authored.**
4. Build candidates, sizing intrinsic assets first and giving text the remainder.
5. Reject on width, fidelity, reading measure, occupancy, dead-space ownership, overflow, ordering.
6. Score survivors on closeness to preferred size, compactness, balanced occupancy, alignment.
7. Choose deterministically.
8. Otherwise stack.

Text allocation is steps 4–5 in one operation: distribute the row by growth weight, clamp each track
to `[min, max]`, redistribute the surplus to tracks still below their maximum. **A track is never
given width its region cannot use.** At 1152px that resolves to **512 + 608**, not the previous
392 + 728 — the solution track stops at its 608px reading maximum and the surplus goes to the prompt,
because 728px of solution track could never hold 728px of solution.

A repeat's children **share one verdict and the strictest decides**. Otherwise a gate that rejects
row 2 alone produces exactly the ragged, content-sensitive layout the primitive exists to prevent.

## 5. The JSON stays semantic

```json
{ "type": "workedExample", "relationship": "single",
  "prompt": {}, "solution": {}, "synthesis": {} }

{ "type": "workedExample", "relationship": "paired",
  "cases": [], "sharedVisual": {}, "interpretation": {} }

{ "type": "workedExample", "relationship": "visualCheck", "states": [] }
```

No `size: "large"`, no `solutionLength`, no `graphWidth`, no `desktopColumns`. Everything the resolver
needs — preferred measure, minimum width, rendered height, step count, widest math run, the figure's
three scales — is **derived from the rendered content**, so it tracks fonts, theme, viewport and
content without a lesson ever being rewritten.

`synthesis` and `interpretation` remain one region with one styling contract and two placements; the
JSON key names the placement.

## 6. Open rulings

1. **The occupancy threshold.** 0.55 as shipped, with §2's table as the evidence. This is the one that
   changes the character of the page family.
2. **Whether a figure may shrink to preserve a split.** Your worked example stacked at 900px with the
   figure holding its 612px preferred box. The pack instead lets a plane reduce *within*
   `[minimumReadable .. preferred]` before the split is abandoned, which your own caveat permits
   ("unless 484 is independently within the figure's acceptable range"). Under the pack's rule your
   900px case splits at 484 + 32 + 384. One comparison in the resolver either way.
3. **`MX_PLOT_H = 720` versus the legibility floor.** Three of five planes here cannot satisfy both.
4. **The interpretation maximum.** 40rem (640px) as shipped; you suggested 45–55rem; the app ships
   620px.

## 7. Files

| | |
| --- | --- |
| `01` / `02` | the same primitive at the same width, split and stacked — content geometry deciding |
| `03` | `sequence`, one verdict across the repeat |
| `04` | `pairedVisual` at three widths |
| `05` | `visualCheck` — two states, two primitives |
| `06` | `extended` — three states, three primitives |
| `07`–`09` | long question · long solution · over-wide mathematics |
| `10` / `11` | dense and sparse interpretation: same plane, same width, different verdict |
| `12` / `13` | portrait and landscape planes |
| `resolver-report.json` | every candidate, its measurements, its verdict and the gate that decided it |

`src/contracts.json` is the specification. `src/figures.json` holds **authored domains only** — no
width or height anywhere in it. `src/kit.css` is a mockup stylesheet whose `mk-*` names exist to state
the grammar for review; the app must implement it through its own semantic names. `src/*.part` are the
example bodies `standard` and `sequence` **share**, so "sequence is repeat(standard)" is true of the
source and not only of the picture.
