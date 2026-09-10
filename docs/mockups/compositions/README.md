# The composition contract — Mathematics worked examples

**A Study page is vertically scrollable, so height is not a scarce resource.** The resolver does not
try to fit a composition into the visible rectangle. That single correction removed more defects than
the previous three rounds of gate-tuning did, and it is what this pack is now built on.

```
content semantics → intrinsic demands → choose a NAMED state → allocate width → height:auto → scroll
```

not

```
available rectangle → divide it → shrink things to fit → reject when the two sides
                      do not occupy similar heights
```

`node scripts/mockups-compositions.mjs` renders every image in Chromium from the app's own stylesheet
and the shipped Figure Engine, and fails rather than produce an image that disagrees with the contract.

---

## 1. Four architectural changes

### Every state is a fresh layout

A refused candidate discards **all** of its computed dimensions; the next state is measured from
scratch. The previous build did not do this, and said so in its own report: image 12 recorded
`state: "stack"` while still carrying `cols: [332, 640]` — the track allocation from the side
candidate it had already rejected. A stacked plane was therefore sized against what a rejected rail
had left behind.

There is a control for it now, and one for each of its siblings: a stacked `visualInterpretation`, a
`repeat:down` or an `instructionFlow` that still carries a track allocation fails the build.

### Height does not select a layout — with one named exception

The global occupancy gate is gone. It was semantically wrong for figures: a 700px plane beside a
180px explanation is a *good* relationship, because the plane is the object being explained and the
prose does not have to fill its height. That gate rejected exactly that arrangement at "14%
occupancy", stacked it, and produced a page with more empty width than the one it refused.

What remains is **`promptSubstance` on `instructionSplit` alone** — the question's content height as
a fraction of the row — and it **selects a different primitive** rather than rejecting the content.

| Primitive | Balance test |
| --- | --- |
| `instructionSplit` | `promptSubstance` ≥ 55% → else `instructionFlow` |
| `visualInterpretation` | **none** |
| `repeat` | none — judged on each complete item's minimum width |

### A third instructional shape: `instructionFlow`

Split-or-stack was too crude a vocabulary. Most worked examples are neither: the question is one line
and the solution is the lesson.

```
TITLE
QUESTION            ← content origin, capped at its reading measure
──────────────────  ← the rule closes the task, across the region
WORKED SOLUTION     ← content origin, capped at its reading measure
 1 … 2 … 3 …            and the page simply grows
ANSWER
```

**This is a presentation type, not a fallback.** 14 of the 30 compositions in this pack are
`instructionFlow`, including every ordinary Substitution example and the seven-step derivation.

### Figures offer; compositions choose

Each plane is measured before any text track is allocated and reports a **ladder of the sizes it can
legally be drawn at**, in scale — px per authored unit. The composition picks an entry from that
ladder. **Leftover width is never a figure size**, and the build fails if a rendered plane is not at
one of the sizes its own ladder offers.

```
1  preferred + gap + interpretation.min fits                      → side, at the preferred scale
2  else, if shrinkPolicy allows: the largest ladder entry that
   still leaves interpretation.min                                → side
3  else                                                           → stack, and RE-MEASURE the plane
                                                                    against the whole content region
```

| Plane | minimum | preferred | maximum | legal sizes |
| --- | --- | --- | --- | --- |
| symmetry 10 × 12 | 373 × 486 @34.0 | 484 × 621 @43.8 | 565 × 718 @51.5 | 14 |
| roots 10 × 14 | 380 × 561 @34.0 | 421 × 619 @37.4 | 490 × 716 @44.0 | 14 |
| graph check 12 × 22 | 386 × 716 @28.0 | — | — | **1** |
| portrait 6 × 16 | 332 × 705 @35.5 | — | — | **1** |
| landscape 24 × 8 | 717 × 346 @28.0 | — | — | **1** |

Three planes have exactly one legal size: their plot cannot clear the 340 × 255 legibility floor
before the whole box hits the 720px bound. That is a Figure Engine fact, reported rather than hidden.

## 2. Alignment origins

Permanent horizontal origins, and every region lands on one. **Nothing is positioned because it
happens to be narrower than the space around it, and nothing is centred.** The build measures each
region's left edge and fails if it is not on its declared origin.

| State | content origin | secondary-track origin |
| --- | --- | --- |
| `instructionSplit` | title, prompt, synthesis | solution, answer |
| `instructionFlow` | everything | — |
| `visualInterpretation:side` | figure | interpretation |
| `visualInterpretation:stack` | figure, interpretation | — |

This is not decoration. The one bug this pack found while being built was an inherited
`justify-self: center` on the rule element: Chrome honours `justify-self` in **block** layout, so the
flow state's full-width hairline was shrink-to-fit-and-centred to **0px**. A missing hairline looks
exactly like spacing, so it screenshots plausibly — it was caught by a control that measures the rule,
not by looking at the picture. Alignment now belongs to each state, never to the element.

## 3. Whitespace is classified

Treating every unused pixel alike is what made the previous resolver stack a pair to avoid 94px of
trailing space and thereby create 766px.

| | |
| --- | --- |
| **Reading margin** | DESIRABLE. A 608px prose column on a 1152px page does not become 1152px wide. |
| **Structural whitespace** | DESIRABLE. The space below the shorter side of a legitimate two-track row is hierarchy. |
| **Unowned space** | DEFECTIVE. A 720px region containing a 390px plane because the region inherited an allocation. |

> No child is stretched, distorted or arbitrarily positioned to consume unused space. Unused page
> width may remain as page margin. Unused width **inside** a composition region must arise from an
> explicit region measure or an alignment rule.

## 4. The ladders

Explicit transitions. There is no generic fallback that keeps reallocating width until something fits
— that is where the unpredictability came from.

```
instructionSplit          → instructionFlow
repeat(across)            → repeat(down)
visualInterpretation:side → visualInterpretation:stack
pairedVisual              = both of the above, evaluated independently
```

Where the pack lands, and why:

| | state | why |
| --- | --- | --- |
| `01` balanced standard | **split** | the question fills 77% of the row — it is a track |
| `02` ordinary standard | **flow** | the question fills 22% — it is a task, not a track |
| `03` sequence | **flow** ×3 | one verdict across the repeat |
| `04` pairedVisual | across + side · across + stack · down + stack | at 1152 / 700 / 382 |
| `05` visualCheck | flow + side | state 1 is a task; state 2 is a genuine pair |
| `07` long question | **split** | the question is 100% of the row |
| `08` seven-step solution | **flow** | 11% — refused at 1152px, with width to spare |
| `10` / `11` dense and sparse interpretation | **side** / **side** | the arrangement does *not* change; only the prose does |
| `12` portrait plane | **side** | previously rejected by the occupancy gate |
| `13` landscape plane | side / stack | at 1152 / 700 — the only figure decision that is about width |

## 5. What is still open

Deliberately not tuned, because they are downstream of the architecture:

1. `promptSubstance` = 0.55. It now selects a primitive rather than rejecting content, so it is much
   less load-bearing than the old occupancy floor.
2. `figure.shrinkPolicy` = `allow`. A named policy now: `hold` makes a plane keep its preferred scale
   and stack instead of reducing within its legal range.
3. `MX_PLOT_H` = 720 versus the 340 × 255 legibility floor — three of five planes cannot satisfy both.
4. The interpretation maximum, 40rem.

## 6. Files

`src/contracts.json` is the specification — the order, the origins, the whitespace classes, the
per-primitive balance policy, the ladders. `src/figures.json` holds **authored domains only**.
`src/kit.css` states the grammar for review; the app must implement it through its own semantic names.
`src/*.part` are the example bodies `standard` and `sequence` share. `resolver-report.json` records
every composition, every state it tried, and why each was refused.
