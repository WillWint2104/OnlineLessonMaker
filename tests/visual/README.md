# Visual fixtures

Lesson JSON that exercises the parts of the engine the shipped corpus does **not** reach.

`examples/` and `lessons/` between them cover every *legacy* slide type, but as of the Figure
Engine work (PRs #140–#144) nothing committed to this repo rendered a composable `page`, the
ScholarMath theme, or a `figure` block at all. Five engine stages were verified with ad-hoc
scripts that were never committed, so their rendered output could not be reproduced afterwards
— it had to be re-authored from scratch for the UI-0 audit. These fixtures close that gap.

**Rule: a stage that adds a rendered surface adds its fixture here, in the same PR.**

## The fixtures

| File | Covers |
|---|---|
| `lessons/composable-page-baseline.json` | The composable `page` type across every registered block: `skillHeader`, `section` (prose + inline `$…$` + display equation), `figure`, `workedExample`, `selfCheck`, `practiceSet`, `mastery`. Loads on `scholarmath`; re-skins to all five themes. |
| `lessons/figure-graph-baseline.json` | The graph engine's four representative states: a clean plot, a crowded plane (12 identifiers, 2 curves, 3 chords — the Stage-1b pill-collision stress case), a discontinuity at `aspect:equal`, and the author-error state. The discontinuity figure also authors `minorGrid:false` + `axisNames:false`, so the display *defaults* are exercised rather than assumed (see `SCHEMA.md` → `figure`); slide 0 authors neither, covering the unchanged default. |
| `lessons/modal-overflow-baseline.json` | A solution modal taller than any supported viewport. Guards the focus-overlay parking contract below. |
| `lessons/figure-geometry-baseline.json` | **Stage 3 geometry**, 15 figures: right triangle with vertex/side labels and a right-angle marker · scalene triangle with single, double and triple angle arcs · **three stacked arcs on an arm only ~6px long on screen** (correctness stress) · **three stacked arcs on a ~44px arm** (visual quality — legible) · a **non-axis-aligned** right angle · quadrilateral with every interior angle · irregular heptagon · crowded pentagon carrying names, sides and angles at once · long descriptive labels · a polygon hard against a stated domain · a **concave dart** whose reflex interior angle is reported rather than measured · a **reversed-winding pair** (the same quadrilateral listed both ways) · a `triangleSSS` parameterised construction · the author-error state (impossible `triangleSSS` · unknown vertex · a `rightAngle` that is not 90° · a zero-length arm — four rejection paths). Loads on `scholarmath`. |
| `lessons/figure-labels-baseline.json` | The label-placement system's five distinct pressures, one per slide: **isolated** identifiers (nothing competing — the control case), identifiers **on the axes and on tick values** (including `V` at the origin, the case raised at the UI-1 visual review), identifiers **on a curve and its chords**, identifiers **at the viewport corners and edges** (outward is off-canvas at every marker), and **long identifiers** in a tight domain (wide pills clear far less easily than single letters). Loads on `scholarmath`. |

## Loading one

Open `lesson-studio.html`, press **⌗ JSON**, paste the file's contents, **Load JSON →**.
Or drive it from Playwright:

```js
await page.evaluate(json => {
  document.querySelector('#modal').hidden = false;
  document.querySelector('#jsonArea').value = json;
  document.querySelector('#jsonLoad').click();          // the app's own loader — resets TP_RUNTIME as in real use
}, fs.readFileSync('tests/visual/lessons/figure-graph-baseline.json', 'utf8'));
```

Switch theme with `LESSON.meta.theme = '<theme>'; render();` · change slide with `go(n)` ·
`#stage` is the scroller for a composable page, **not** `.tp-scrollmain`.

## Contracts these fixtures exist to hold

Re-check these after any change to the focus rail, the canvas fit, or the figure engine. The first
two were broken on `main` at #144 and are fixed; the rest were added by the stages named against them.

1. **Focus overlays park to the visible pane.** A composable page is taller than the board and
   `#stage` is the scroller, so an overlay positioned against the full-height slide lands off-screen
   (measured on #144: cut at *every* scroll offset, up to 246px lost at 1280×800). `position:sticky`
   cannot fix it — the canvas is `transform:scale()`'d. `tpOverlayPark()` writes the pane's band to the
   overlay at open. **Assert:** the panel sits inside `#stage`'s rect, and both the first step and the
   answer are reachable, at 1440×900 / 1024×768 / 834×1112 / 390×844 and at every scroll offset.
2. **Expanding a figure enlarges the plot.** `⤢` must give the plot *more* area than the inline
   figure, never less (on #144 it gave 0.34×). **Assert:** expanded plot area ÷ inline plot area > 1
   at every viewport above.

3. **The focused workspace is viewport-level.** Expanding a figure moves the panel to the body-level
   `#figfocus` root (outside the `transform:scale()`'d `#canvas`) and hides the lesson shell. **Assert:** the
   panel is reparented into `#figfocus`, focus moves into the workspace, Esc closes it, the panel returns to
   its original place in the slide, focus returns to the originating Expand control, and navigating while
   focused strands nothing. Measure the focused plot area against inline at each viewport above — UI-1
   records 1.67× / 1.56× / 1.97× / 4.41× / 3.61×.

4. **Figure display settings are defaults, not locks.** `grid`, `minorGrid` and `axisNames` set where a
   figure *starts*; the learner can still change all three from **Options** in the focused workspace, and
   the choice persists for the session (`SCHEMA.md` → `figure`). **Assert:** a figure authoring
   `minorGrid:false` / `axisNames:false` starts with those toggles off *and* the corresponding marks absent
   from the painted SVG (`.tp-fig-grid-minor`, `.tp-fig-axname`); switching one back on from Options repaints
   it; a figure authoring neither field starts with both on. `figure-graph-baseline.json` covers both cases —
   the discontinuity figure authors them false, slide 0 authors neither. All three behave **identically** on a
   re-render: a learner override survives an incidental one (navigation, theme swap, an unrelated inspector
   edit), and an authored *change* to that field overrides it. Assert both directions for each of the three —
   re-writing the same authored value must leave the learner alone.

5. **The painted plane fills its viewport.** The focused plot is generated through the stage's real
   dimensions, not letterboxed at a fixed aspect. **Assert** the painted grid/axes against the *stage*, not
   the SVG element (the SVG filled the stage while the plane inside it did not): at 1440×900 / 1024×768 /
   834×1112 / 390×844 the blank margin inside `.tp-figx-stage` should be the axis gutter only (~50–70px),
   never the hundreds of px that a fixed landscape aspect produced in a portrait stage. Also assert the
   Close control does not overlap the control strip at any of those sizes.
6. **Surface width matches content role.** Reading surfaces shrink around the readable measure plus padding
   (`--tp-prose-max`); workspace surfaces — `figure`, `banner`, `image`, `labeledGraphic` — keep the full page
   width. **Assert** a prose fragment's card width against its longest painted line: a ~700px measure must not
   sit inside a ~1128px card. Check several prose fragment types, not just one.

7. **A label sits at the nearest position that clears everything (Stage 2c).** Clearance is a hard gate and
   is not negotiable; among the positions that satisfy it, placement takes the one with the smallest
   displacement from its own marker. Before Stage 2c the search took the *first* clearing candidate, and the
   candidate space is enumerated (distance × direction × perpendicular *shift*) — so a 56px shift at distance 6
   was accepted ahead of an unshifted position at distance 14, and identifiers drifted away from the points they
   name (`K` 57.5px where 20.5px was legal, `V` 44.2px, `I` 31.4px). The printed axis **numbering** is an
   obstacle too, not just the axis lines: the nearest legal position is often the one tucked in against an axis,
   so without that the ranking makes tick-label collisions worse rather than better.
   **Assert**, on `figure-labels-baseline.json`, `figure-graph-baseline.json` and the `figure` block in
   `composable-page-baseline.json`: every identifier clears every
   axis, curve, chord, marker, other identifier **and printed tick label** by ≥ `FIG_GAP` and sits fully on
   canvas; its displacement equals the smallest displacement over all candidates that satisfy that — re-enumerate
   the whole space with a plain reference search rather than testing against a tuned number; repeated solves of
   the same figure are byte-identical (placement is deterministic — ties go to the more preferred direction); and
   the exhaustive `figScanPill` fallback, which is *not* displacement-ranked, does not fire on any fixture.
   Re-assert **in the focused workspace at all four viewports × every one of the five `FIGX_TICKS` densities**,
   reading the identifiers back out of the painted SVG and building the reference obstacles from the
   configuration live at that moment: the focused box is a *measured* viewport rather than a constant and the
   tick target decides which numbers are reserved, so a collision or a non-nearest position can exist there and
   nowhere else. `scripts/verify-label-placement.mjs` runs all of it (785 assertions).

8. **Geometry inherits the shell and the placement system; its own anchors are what Stage 3 has to prove
   (Stage 3).** Stage 2c proved the graph's point-label anchor. Geometry adds three more — vertex (external
   bisector), side (outward normal that leaves the outline, by ray cast) and angle measure (on the swept-arc
   bisector just outside the outermost arc) — and none of them is exercised by the graph fixtures. **Assert**,
   on `figure-geometry-baseline.json`: every label clears every edge, arc, right-angle mark, vertex and other
   label by ≥ `FIG_GAP` and sits on canvas; vertex names resolve to the correct vertex and side labels to the
   correct side; angle labels sit near their arc rather than at the vertex; stacked arcs at one vertex do not
   overlap and **every arc radius is strictly less than the shorter incident arm**, so no arc is drawn past
   the ends of the arms it spans — assert the radius against the *arm*, never against the engine's own clamp —
   there is no minimum-radius floor, because a floor not bounded by the arm draws past it (the fixture carries
   a ~6px arm for this); the right-angle square is built from the two incident rays, so it is correct at an
   arbitrary orientation (the fixture includes one); a `rightAngle` asserted on an angle that is not 90° is
   **reported and not drawn**; measures are computed (`label:"measure"`, `text:"auto"`), never authored —
   interior angles of the n-gon must sum to (n−2)·180° **for a convex polygon**. `figGeomAngle` returns the
   unsigned smaller sweep, so it cannot report a reflex interior angle: `angles:"all"` detects a reflex vertex
   against the polygon's winding and **reports it instead of printing 360−θ as though it were the interior
   angle**. Drawing the reflex sweep is deferred (`BUILD_SEQUENCE.md`), so assert the sum on convex fixtures
   and assert the *error* on a concave one — the baseline now carries a DART for exactly that, because this
   contract asserted its concave half against no fixture at all until Stage 3c. Do not treat the sum as
   proven for an arbitrary n-gon. Stacked
   arcs must stay distinct **when the arm is shorter than the base radius**, not only on generous arms:
   clamping each index independently collapses the stack onto one radius, which a comfortable fixture never
   reveals (the baseline carries a sliver triangle for exactly this). In the **focused** workspace the drawn
   figure must fill its own BOARD rather than sit in dead space. For a GRAPH the board is the whole stage (the
   plane is the subject). For GEOMETRY, Stage 3b fits a board to the figure and centres it, so measure the
   painted ink against that board — **85–89%** at 1440×900 / 834×1112 / 390×844. Measuring geometry ink
   against the full stage is the superseded Stage 3 metric and reads as a failure the moment `aspect:'equal'`
   letterboxes. The grid default is hidden for geometry and must read the same inline and focused. **Stage 3b
   — annotation grammar.** Assert the ROLE hierarchy holds in the crowded pentagon: a vertex name is heavier
   than a symbolic label, which is heavier than a computed measurement, and arcs/right-angle marks are lighter
   than the polygon edges. Each angle measure sits on its own arc's bisector immediately outside the OUTERMOST
   arc — assert its distance from the vertex is within a gap-and-a-pill of that arc radius, never a multiple
   of it, so arc and measure read as one annotation. Each side measure sits outside the closed outline
   (ray-cast, so this holds for either winding and for a concave polygon). Measurement text carries one
   numeric style: no trailing zeros, so a right angle reads `90°`. The two short-arm fixtures assert DIFFERENT
   things and must not be conflated: the ~6px arm is a CORRECTNESS stress case (arcs stay attached and
   distinct; it is deliberately too small to read), and the ~44px arm is the VISUAL QUALITY case (three
   stacked arcs a human can actually distinguish at normal rendered size). **Geometry focus fits the FIGURE,
   graph focus fits the PLANE:** the geometry board takes the figure's own aspect and is centred in the
   workspace, so measure the painted INK against the BOARD — 85–89% at 1440×900 / 834×1112 / 390×844 — and
   never against the SVG element, which is 100%×100% of whatever it is given and therefore proves nothing.
   **Stage 3c — SEMANTIC LEGALITY, the assertion this contract was missing.** Clearance says a label does not
   collide; it cannot say the label still means the right thing, and every earlier assertion here tested only
   the first. `scripts/verify-geometry-semantics.mjs` asserts the second: an angle label's centre lies inside
   its swept wedge (and inside the polygon, for an interior angle); a side label's centre lies in the exterior
   half-plane of its own edge; a vertex label's centre lies outside the polygon it names. Run it across at
   least two box sizes. It re-derives every predicate from the raw painted coordinates and never calls the
   engine's own `figGeomInside` / `figGeomInSector` — if the engine's idea of "inside" is wrong the assertions
   must still fail, which is the whole point after this stage twice produced a check that restated the
   implementation. Verify the checker still FAILS when the constraint is removed: disabling the angle region
   reports 11 violations including the three that were visible by eye (`46.9°`, `56.9°`, `59.2°`) and three
   that were not. The reversed-winding pair asserts the stronger property — all 10 labels at identical
   coordinates in both windings, so "outside" is a property of the shape and not of the authoring order.

## Geometry (Stage 3)

Stage 3 renders into the UI-1 shared Figure Shell (head / stage / foot / caption, kind driven by
`b.figure`) and inherits its control hierarchy — it must not introduce a geometry-specific container or a
second dense toolbar. It adds `lessons/figure-geometry-baseline.json` covering: triangle with one angle arc ·
multiple arcs · right-angle marker · quadrilateral · irregular n-gon · vertex labels · side labels ·
crowded labels · long labels · resized figure · the focused/expanded state.


## `figure-measure-surface.json` — contract 9: the side-measurement surface

Gated by `scripts/verify-measure-surface.mjs` (workflow `measure-surface.yml`). The matrix is SPLIT by
capability (ENGINE_SPEC §3.4): geometry is a `mathematics` capability, so the two themes that declare it
(`mathematics`, `scholarmath`) get the full design contract, and the other six get a small safety contract
only — renders, draws geometry, no empty or invisible chip, surface has a fill. The split is read from the
app's own `THEME_CAPS`, never duplicated in the script. This exists because a Roman-history theme was
previously the limiting case for a mathematics annotation's colour. This
fixture exists because nothing else renders the chip: `verify-corpus-identity`'s `isLesson` regex structurally
excludes `tests/visual/lessons/`, `verify-label-placement`'s fixtures contain no geometry, and
`verify-geometry-semantics` asserts where a label's CENTRE sits — which a chip whose text spills out of its own
rect satisfies perfectly. Three real defects shipped behind those green results.

What is asserted, in every pack that declares the `mathematics` capability (the safety contract listed above
is what the other six get):

1. **Surface assignment.** A chip is painted around a side MEASUREMENT and nothing else — a vertex name, an
   angle measure or a side NAME carrying one is a failure.
2. **The three presentation roles**, asserted by outcome on named strings: measurement → surface (numerals
   upright, algebra in the maths face); symbolic name → maths face, no surface; prose name → upright body text,
   no surface. `"AB"` and `"2x"` are the load-bearing pair: both are forced by `label` AGAINST what the
   fallback classifier would say, so they fail the moment explicit author intent stops winning.
3. **Containment.** The text never leaves the box the placement engine reserved and cleared for it. This is the
   assertion that catches sizing a chip with the wrong face's metrics.
4. **Padding.** Where the painted face is known, padding stays inside a band expressed as a PROPORTION of the
   design (0.5–1.75×), not a constant tuned until today's numbers fit — packs redefine the body face, so one
   exact number was never achievable without per-face runtime metrics. The run prints the widest ratio it saw,
   so drift is visible while the gate is still green.
5. **Contrast.** Value and unit ink both clear WCAG AA against the fill they are painted on, measured from the
   COMPOSITED colour — the unit carries an opacity, and computed style alone hid a 4.24:1 failure.

Deliberately recorded, not failed: symbolic content is sized conservatively because its face is pack-defined,
so a narrow face over-reserves. The run lists every such chip. Failing it would demand the per-face metrics
this stage does not add; passing silently would let the looseness drift unseen.

`"3x + 2y + 15"` is load-bearing, not decorative: it is the only string long enough to overflow when sized with
the wrong face's metrics. Shorter symbolic content does not reproduce the defect, and a fixture without it
passes while the bug is present — verified by re-introducing the bug and watching the gate stay green.

`"12 cm²"` is a **renderer-format stress case only**. An area unit on a side is mathematically wrong and must
never be copied into a real lesson; it is there to prove the chip typesets and sizes a superscripted unit.


## `verify-figure-container.mjs` — contract 10: the box the app actually paints

Gated by `scripts/verify-figure-container.mjs` (workflow `figure-container.yml`, not a required check). Stage 4
derives the figure's viewBox from its host, so the inline box stopped being a constant. Nothing already here
tested it: `verify-label-placement` and `verify-geometry-semantics` both solve at FIXED reference boxes, and
`verify-measure-surface`'s assertions are ratios and therefore scale-invariant — all three stay green on a
figure painted at 4px per annotation.

Everything is asserted in **logical canvas px**. `#canvas` is a fixed 1280px surface that is
`transform:scale()`'d, so a phone shrinks the figure and the body copy identically (annotation:body is a
constant 1.48×) — that is the canvas's business, and device px would report a different number per viewport
and fail on a phone for a reason no figure change can fix. Sizes come from
`computedFontSize × (stage.offsetWidth ÷ viewBoxWidth)`, and `offsetWidth` is the pre-transform layout box.

What is asserted, per fixture × designed theme × **stage width**, from the widest pane down to exactly the
floor:

1. **The type band, under the bounded responsive scale.** Hard floor **11px** for every annotation at every
   stage width — absolute and unchanged. The primary window starts at 12–15px at the ramp start and its
   ceiling **rides the ramp** (`15 × scale`): the old flat 12–15 was a floor-stage contract, and bounded
   growth necessarily lifts the upper bound. Subordinate units satisfy the floor only and are deliberately not
   raised toward the primary values — Stage 3d made them quieter on purpose. Named representative sizes are
   asserted with a tolerance (vertex 14.84 / 16.19 / 18.08 and unit 11.18 / 12.21 / 13.63 at stages 420 / 700
   / 1089), and every one must actually be observed. The run prints the smallest and largest observed, with
   the class, string, stage width and slide that produced each.
2. **The ramp itself**, measured as a RATIO of rendered size to the same role at the ramp start — so the
   observed scale comes from pixels alone and no production constant or helper is consulted to decide what
   the answer should be. The expected curve is restated from the documented contract (1.00 → 1.22 between
   stage 420 and 1089), because asking `figRespScale()` what it returns and asserting that it returned it
   would be a tautology; a drift between the two is precisely what fails. Probed at 340, 420, 530, 700, 900,
   1089 and 1250 — one below the ramp and one above the ceiling: scale is 1.00 at and below the start,
   monotonically non-decreasing, never below 1.00, and **stops growing** above the end. Tolerance is `±0.004`,
   which is `figFitBox`'s whole-unit box rounding (`W = round(stage / k)`, ~0.5/W), not slack in the contract.
3. **The hierarchy survives the ramp.** One multiplier moves the whole spatial system, so role ordering
   (vertex > symbolic > prose > measurement > unit) and the Stage 3d **unit:value ratio of 0.852** are
   invariants at every stage width, not coincidences — they are what would catch a per-role scaler creeping
   in. The ratio is measured on the fixture that actually carries a unit and fails if none is ever seen: a
   first draft probed a slide with no units and passed while dividing by `undefined`.
4. **Containment.** Measurement text never leaves the rect reserved for it, at every stage width.
5. **The geometry minimum stage width.** At or above `FIG_MIN_STAGE.geometry` — the usable `.tp-fig-stage`
   width, which is what `figFitBox` consumes — no label may have taken Stage 3c's
   relaxed path — and the floor is proven *load-bearing* by showing that dense figures DO relax below it, so a
   green run cannot mean the floor was decoration. The floor is read from the app, never pinned here.
6. **Mount, observer and reflow.** The observer is installed once; a re-solve at an unchanged stage width does no
   work; only the `<svg>` is replaced; the callout hit-targets and dialogs keep their DOM identity and still
   open after a re-solve (they carry `wirePackTyped`'s listeners and must never be re-emitted); two figures in
   one host stay independent; a resize does not feed the observer back into itself; wide → narrow → wide
   returns identical DOM, with a guard that the narrow state really differed; and a callout-count mismatch
   bails before mutating rather than throwing.
7. **Every expectation observed.** A class or fixture that never rendered fails rather than passing silently.

Non-vacuity, demonstrated by re-introducing each defect: `FIG_RESP_SCALE_MAX` 1.22→1.30 (45/54 — the ceiling
rises to 18.30 and a vertex breaches it at 19.26) · `FIG_RESP_STAGE0` 420→340 (44/54 — the floor stops being
pinned, and it also catches the dart relaxing at the geometry floor) · `FIG_FIT_K_BASE` 1.14→0.80 (46/54) ·
geometry floor 420→340 (dense figures relax inside the supported range) · callouts re-emitted instead of
repositioned (identity and listeners lost) · idempotence guard removed (an unchanged stage width repaints and
the resize feeds back) · count-mismatch bail removed (throws).

### Contract 10 also covers the placement resolver (Stage 4 C6)

`figure-placement-baseline.json`. A placement is an INTENT: `contained` and `beside` keep their shape only
while the figure still gets `figMinStageWidth()` of usable stage, and — for `beside` — while the prose column
is still worth reading. Otherwise the layout relaxes (`contained` → full, `beside` → stacked).

The expected mode is **predicted independently** from the measured available width, the measured shell chrome
and the app's own minimum, using this file's own copy of the layout geometry (0.78 / 24px gutter / 260px prose
floor). It is a prediction checked against the resolver, not a question put to it — and because the prediction
lands exactly, it also proves the JS constants and the CSS agree, a duplication nothing else tests.

Asserted: every resolved mode matches the prediction at eleven widths straddling all three measured
transitions · a reduced layout never starves the figure below its minimum · `beside` always has rendered prose
· a stacked figure recovers the full width · three identical sweeps across a transition do not oscillate · a
beside↔stacked transition keeps the same figure node, the same `figSafeId` and the same `FIGX` entry · a
settled placement is not rewritten on every pass · `beside` without prose reports and falls back · an
unrecognised placement still falls back (C5 unchanged) · `text` outside `beside` is reported · a figure with no
placement gains no wrapper.

Non-vacuity: contained promotion disabled (61/64) · beside stacking disabled (61/64) · chrome dropped so the
outer width is compared instead of the stage (62/64, and it catches a figure kept at stage 419 against a 420
minimum — the exact ~26px bug the architecture exists to prevent) · resolver idempotence guard removed
(64/65). That last one **passed** against the first draft of this suite: counting `figInlineSolve` repaints
missed a resolver that rewrote `data-fig-layout` on every pass. A second counter was added, and it now fails
with `3 layout writes from 3 extra figFitAll() passes`.
