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

Both were broken on `main` at #144 and are fixed; re-check them after any change to the focus
rail, the canvas fit, or the figure engine.

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
