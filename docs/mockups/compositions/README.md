# The composition contract — Mathematics worked examples

**This pack is a layout grammar, not a set of screens.** Its predecessor described five attractive
arrangements; that is what made it unimplementable, because a renderer given five pictures has to
guess the rule that produced them. What follows is the rule.

Three claims here are checked by `node scripts/mockups-compositions.mjs`, which renders every image
in Chromium from the app's own material, and fails rather than producing an image that disagrees:

1. **No width in this pack is typed.** Every track width is computed from the region contracts in
   `src/contracts.json`, and every responsive threshold is generated as the sum `min + gap + min`.
   After rendering, the realised widths are measured back out of the browser and compared against an
   independent computation of the same contract. A `-spec` image prints the contract *and* the width
   it produced.
2. **One fragment serves every surface.** A composition is authored once and rendered at each
   reference width; its responsive state is chosen by a container query. The build then asserts the
   semantic payload is character-identical across those renders. (That control exists because the
   previous pack's narrow Sequence proof silently carried two examples where its desktop twin carried
   three. Separate files per breakpoint made that possible; one file makes it impossible.)
3. **Every plane is the shipped engine's output**, mounted in the app's own
   `.mx-part[data-mx-part="figure"] › .mx-figstage › .mx-figskin.tp-slide` chain, and **its size is
   searched for, not chosen** — scored on the painted result, px per authored *x*-unit against px per
   authored *y*-unit.

---

## 1. What chooses what

```
JSON semantics   →  the composition FAMILY        (authored, never inferred)
available space  →  its RESPONSIVE STATE          (measured against region minimums)
content size     →  the page's HEIGHT, and whether a state is FEASIBLE
                    (never which composition is used)
```

Content is allowed to make a state impossible. It is never allowed to select a different family.
An over-wide equation does not promote an example to another composition; it reports that it cannot
be set at this width, and the split it is in either survives or falls back.

## 2. Four primitives

Everything below is assembled from these. `src/kit.css` contains **no rule keyed on a composition
name** — that is the structural form of "the compositions are not independent designs".

| Primitive | Regions | Purpose |
| --- | --- | --- |
| **instructionSplit** | prompt │ solution | an ordinary worked example |
| **repeat** | a child, `down` or `across` | several examples (down) or several cases (across) |
| **visualInterpretation** | figure │ interpretation | a figure and the text that reads it |
| **stack** | regions in semantic order | the terminal state; never fails |

`repeat` is where the 2 + 1 problem dies for good. Its CSS is a column of identical children, or
`grid-auto-flow: column` with one shared track contract — **the count is written nowhere**, so there
is no arrangement for a count to select. Two examples are two rows; ten are ten.

## 3. The compositions are assemblies

| Composition | Assembly |
| --- | --- |
| `standard` | `instructionSplit(prompt, solution)` + synthesis |
| `sequence` | `repeat(down, standard)` + synthesis |
| `pairedVisual` | `repeat(across, case)` + `visualInterpretation(visual, interpretation)` |
| `visualCheck` | state 1 `instructionSplit` · state 2 `visualInterpretation` |
| `extended` | states; each state takes the primitive its own content needs |

**`pairedVisual`'s lower half is the substantive change.** A shared visual "at full width" left an
arbitrary empty region beside a plane that was narrower than the row, and the renderer had no answer
to what that region was for. It is now the interpretation rail, and *why the two agree* belongs to
it rather than being a footer underneath. The two-row middle state the previous pack drew by hand is
gone as a designed thing — image `06` shows it emerging from the grammar at a width nobody chose.

**Renames.** `comparison` → `pairedVisual`, `staged` → `visualCheck`. Old names must keep resolving,
as `visual` and `compact` already do. `compact` is gone for good: it named a size.

## 4. Region contracts

Design-system tokens. **Authors never type these**; lesson JSON describes meaning only.

| Region | Minimum | Growth weight | Reading measure |
| --- | --- | --- | --- |
| prompt | 18rem (288px) | 0.7 | 34rem (544px) |
| solution | 28rem (448px) | 1.3 | 38rem (608px) |
| case | 18rem (288px) | 1 | 34rem (544px) |
| figure | engine-derived, floor 340 × 255px | — content-sized | — |
| interpretation | 24rem (384px) | 1 | 40rem (640px) |
| synthesis | 18rem (288px) | spans | 40rem (640px) |
| answer | inherited from its solution | — | — |

Gap between any two tracks: **2rem (32px)**.

Two invariants that are easy to lose and are checked on every image:

- **A track is a position, not a box.** No fill, no border, no stretching to a sibling's height.
  When the solution is tall the prompt track simply ends where its content ends.
- **The measure caps the prose, never the track.** Surplus width a region does not need stays
  unused. `interpretation` realises at 780px in image `14` and its prose still sets at 640px.

### The split is arithmetic

```
avail = contentRegion − gap
distribute avail by growth weight
any track below its minimum freezes at its minimum; redistribute the remainder
```

That is exactly what CSS `minmax(min, Nfr)` does natively, so no measurement pass is needed. At the
1152px desktop reference it resolves to **392 / 728 — 35.0% / 65.0%**. *35 / 65 is a result.* At the
768px floor it resolves to 288 / 448, both tracks on their minimums. Images `16` and `17` are the
same file at 768px and 767px.

### Thresholds are sums, never breakpoints

| State change | Sum |
| --- | --- |
| instructionSplit → stack | 288 + 32 + 448 = **768px** |
| repeat(across) → repeat(down) | 288 + 32 + 288 = **608px** |
| visualInterpretation → stack | plane's own legible minimum + 32 + 384 (**756px** for an ordinary aspect) |

A container query cannot read a custom property. That is a useful constraint: the build must compute
each sum and write it out, so no threshold can be typed by hand.

## 5. The figure is engine-derived, literally

A plane's box is **searched for and scored on the painted result**, not computed and hoped for.
Measured on the shipped engine: a 24 × 8 domain in the 720 × 255 box its own aspect asks for renders
at *x/y* = **1.79**, because the engine reserves a fixed pixel gutter for axis labels which a shallow
box is mostly made of. The same domain at 720 × 488 renders at 1.001. No closed-form box aspect
predicts that. So the build bisects the slack axis until the plane is square, and fails outright if
no box between the floor and the bound can be.

The consequence is the point: **446 × 720 was never a contract, only one realised size.** The same
authored domain in this pack:

| Plane | desktop 1152 | middle 700 | narrow 382 |
| --- | --- | --- | --- |
| symmetry (10 × 12) | 600 × 720 | 600 × 720 | 382 × 458 |
| graph check (12 × 22) | 393 × 720 | 393 × 720 | 382 × 700 |
| roots (10 × 14) | 514 × 720 | 514 × 720 | 382 × 535 |
| portrait (6 × 16) | 340 × 720 | 340 × 720 | 340 × 720 |
| landscape (24 × 8) | 720 × 488 | 700 × 488 | 382 × 255 |

Every one renders at 1.000 ± 0.006 px per unit on both axes. Where a box is clamped into the legal
range the engine keeps the units square by showing slightly more of the plane — which is correct, and
is why the width floor and the height bound can both hold at once.

**The figure track is `min-content` — exactly the plane's width.** `auto` looks equivalent and is
not: it takes the region's *max-content* width, so anything else in the region — a long caption, a
review annotation — silently widens the track past the plane. Reproduced while building this pack: a
600px plane in a 736px track, 136px belonging to nothing. Different in cause from the previous pack's
full-width shared visual, identical in effect, and a one-keyword bug either way. So the build measures
**the plane against its track**, on the annotated render as well as the plain one — the first version
of that check looked only at the plain render and did not fire.

## 6. The resolver should be boring

1. Identify the composition from the JSON. Never infer it from content.
2. Ask every region for its minimum, growth weight, reading measure, and — if visual — its intrinsic
   aspect and minimum legible scale.
3. Try the widest state.
4. If every region clears its minimum, use it, distributing by growth weight.
5. Otherwise try the next state.
6. Otherwise stack.
7. Content may increase height without limit.
8. **Never** reach a state by distorting a figure, narrowing prose below its minimum, centring orphan
   content, changing geometry with item count, or stretching an empty rail for balance.

## 7. The JSON says meaning

```json
{ "type": "workedExamples", "composition": "sequence",
  "items": [ { "title": "…", "question": {}, "solution": {}, "answer": {} } ],
  "synthesis": {} }

{ "type": "workedExamples", "composition": "pairedVisual",
  "cases": [ { "label": "Case A", "question": {}, "solution": {}, "answer": {} } ],
  "visual": {}, "interpretation": {} }

{ "type": "workedExample", "composition": "visualCheck",
  "question": {}, "solution": {}, "answer": {}, "visual": {}, "interpretation": {} }
```

No widths, no `size: "medium"`, no `desktopColumns`. `synthesis` and `interpretation` are **one
region with one styling contract and two placements** — beside a shared visual it is the rail; with
no visual to belong to it spans the content region after the composition. The JSON key names the
placement. `WHAT THIS SHOWS`, `WHY THE TWO AGREE` and `WHY IT AGREES` were three footer inventions
for one thing.

## 8. Adversarial proofs

More useful now than another shipping screenshot: these are the shapes that decide whether this is a
grammar or a set of preferences.

| | Proves |
| --- | --- |
| `11` long question | the prompt is the taller track; nothing is stretched to match |
| `12` long solution | the shape that produced the original defect |
| `13` over-wide mathematics | an unsettable line scrolls locally; it does not take width from the question, shrink the type, or change the composition |
| `14` portrait plane | the width floor and the height bound hold at once, and the page grows |
| `15` / `15b` landscape plane | rule 8: the same file above and below `720 + 32 + 384`; the split is abandoned rather than the plane squeezed |

## 9. Open questions for the maintainer

1. **The interpretation measure.** You suggested 45–55rem. The app ships `MX_INTERP_MAX = 620px`
   (38.75rem). The pack uses **40rem (640px)**, the nearest round value to what ships. Say the word
   and it becomes 48rem.
2. **The `case` minimum.** Set equal to `prompt` (18rem), so `repeat(across)` over two cases falls
   back at 608px. A case holds a whole worked example, so a larger minimum is arguable.
3. **`extended` is under-specified.** "Each state takes the primitive its content needs" is right but
   does not say who decides. Authored per state, or derived from which regions the state carries?

## 10. Files

| | |
| --- | --- |
| `01`–`02` | `standard` · desktop (spec), narrow |
| `03`–`04` | `sequence` · desktop (spec), narrow — the same three examples in both |
| `05`–`07` | `pairedVisual` · desktop (spec), the emergent middle state, narrow |
| `08`–`09` | `visualCheck` · desktop (spec), narrow |
| `10` | `extended` · three states, three primitives |
| `11`–`15b` | the adversarial proofs |
| `16`–`17` | the threshold, at 768px and 767px |

`src/contracts.json` is the specification — region contracts, primitives, assemblies, the resolver,
the reference surfaces. `src/figures.json` holds **authored domains only**, deliberately with no
width or height in it. `src/kit.css` is a mockup stylesheet: its `mk-*` names exist to state the
grammar for review, and the app must implement it through its own semantic names and must not import
this file. `src/*.part` are the example bodies the `standard` and `sequence` fragments **share**, so
"sequence is repeat(standard)" is true of the source and not only of the picture.
