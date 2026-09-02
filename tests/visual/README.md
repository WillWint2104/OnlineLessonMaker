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

## Geometry (Stage 3)

Stage 3 renders into the UI-1 shared Figure Shell (head / stage / foot / caption, kind driven by
`b.figure`) and inherits its control hierarchy — it must not introduce a geometry-specific container or a
second dense toolbar. It adds `lessons/figure-geometry-baseline.json` covering: triangle with one angle arc ·
multiple arcs · right-angle marker · quadrilateral · irregular n-gon · vertex labels · side labels ·
crowded labels · long labels · resized figure · the focused/expanded state.
