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
| `lessons/figure-graph-baseline.json` | The graph engine's four representative states: a clean plot, a crowded plane (12 identifiers, 2 curves, 3 chords — the Stage-1b pill-collision stress case), a discontinuity at `aspect:equal`, and the author-error state. |
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

## Geometry (Stage 3)

Stage 3 adds `lessons/figure-geometry-baseline.json` covering: triangle with one angle arc ·
multiple arcs · right-angle marker · quadrilateral · irregular n-gon · vertex labels · side labels ·
crowded labels · long labels · resized figure · the focused/expanded state.
