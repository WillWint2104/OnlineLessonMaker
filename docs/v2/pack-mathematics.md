# Pack: Mathematics

*A domain pack for OnlineLessonMaker v2. Conforms to the foundation constitution (v2-architecture.md). Isolated from all other packs; meets the engine only at the block registry. This pack is also the STEM-pack PROOF — it exercises notation-as-capability, self-contained graphing, and the widget family, validating the pattern the science packs will follow.*

**Status:** SPEC'D (actively authored).
**Subjects served:** Mathematics (all areas as recipes), and shares its primitives with chemistry/physics/general-science when they build.
**Primitives owned by this pack:** notation (via foundation capability), function plotting, coordinate/geometry canvas, worked-solution stepping, probability & manipulative widgets, data tables/charts.

---

## Design decisions (locked)
- **Notation:** KaTeX, via the foundation notation capability (§17 of the constitution). Any field renders `$...$`. Authoring via MathQuill-style natural input → LaTeX stored.
- **Graphing/geometry: SELF-CONTAINED, offline.** No Desmos/GeoGebra embed. The pack builds its own lightweight function-plotter and coordinate canvas. Rationale: consistency with the whole engine's self-contained ethos; a graph that dies on the school network is worse than a simpler one that always works; passes `validate`; can't break. More build effort and less power than Desmos, accepted deliberately.
- **Widgets: in scope now** — the widget family + student tray (see below).

---

## Blocks

### notation (capability, not a block)
Provided by the foundation. Listed here because this pack's lessons load it. Inline `$x^2$` and display `$$\int_0^1 x\,dx$$` in any text field, knowledge check, or callout.

### graph (self-contained function plotter)
- Schema: `functions:[{expr, colour-slot, domain}]`, `axes:{xmin,xmax,ymin,ymax,grid}`, `points:[]`, `sliders:[{name,min,max,step}]`.
- Renders a coordinate plane + plotted functions to SVG/canvas (foundation layout: aspect-ratio boxed, responsive, tokened colours).
- **Interactivity (behaviours):** parameter sliders that redraw live (the Desmos idea, self-contained); hover-a-point-for-coordinates; toggle a function on/off.
- **Accessibility:** text alternative = a table of plotted values; keyboard-operable sliders; focus ring.
- Recipes use it for: linear/quadratic graphs (algebra), trig curves, calculus (tangent/area visualisations), statistical plots.

### geometry (coordinate/construction canvas)
- Schema: `shapes:[{type, points, labels}]`, `constructions:[]`, `grid`, `interactive:bool`.
- Self-contained canvas for plotting shapes, angles, transformations, constructions.
- **Interactivity:** drag a vertex to see measurements update (with a **drag-less alternative** — numeric input for the same point, per the a11y contract); reveal construction steps.
- Text alternative: description of the figure + coordinate list.

### working (stepped worked solution)
- The foundation Process block, specialised for maths. Schema: `steps:[{latex, note}]`.
- Each step is one line of notation, revealed progressively (Brilliant "one idea per unit" discipline). The student attempts, then reveals the next line.
- Pairs with the hint-ladder behaviour: a step can carry `hints:[]`.

### dataTable (from foundation, used heavily here)
- Sortable, hoverable, chart-able (bar/line/pie). Statistics recipes lean on this.

### widget (the manipulative family — see next section)

---

## Widgets & the student tray (in scope now)

**Widgets are self-contained interactive tools with their own state**, registered through the same block registry, usable in two modes:
- **Authored** — an author drops a widget into a lesson (a periodic table in a chemistry lesson, a dice roller in a probability lesson).
- **Student-summonable** — a **tool tray** the student opens anytime (a calculator available throughout, independent of lesson flow). The tray is a foundation view-layer surface (a summonable panel, §13), populated by whichever widgets the lesson's pack registers as tray-eligible.

### The maths widget family (each ~self-contained, coin-workbench pattern minus 3D)
- **calculator** — scientific; self-contained. (Tray-eligible.)
- **graphingCalculator** — the graph block in tool form. (Tray-eligible.)
- **dice** — configurable count/sides; roll animation; running results log. Randomness generator with visual state.
- **spinner** — configurable coloured sectors; spin; result log.
- **ballsInBag** — configurable coloured-ball counts; draw with/without replacement; running tally. (Probability core.)
- **coinFlip** — n flips, heads/tails tally.
- **numberLine / fractionWall / place-value** — visual manipulatives.
- **randomNumber / randomSampler** — for statistics.

Each widget declares: its state shape, its controls, tray-eligibility, and (a11y contract) keyboard operation + a text-readable result log. Probability widgets share a **result-log molecule** (running tally) so they don't each reinvent it.

---

## Recipes (areas of maths = documented combinations, NOT separate code)
- **Algebra** = notation + graph + working.
- **Calculus** = notation + graph (tangent/area viz) + working.
- **Geometry** = notation + geometry canvas + working.
- **Statistics** = notation + dataTable/charts + probability widgets (dice, spinner, ballsInBag, randomSampler).
- **Probability** = notation + the probability-widget family + working.
- **Number/arithmetic** = notation + manipulative widgets (numberLine, fractionWall) + working.

The areas share every primitive; they differ only in combination. This is why mathematics is ONE pack, not four.

---

## Authoring conventions (maths-specific)
1. Notation via `$...$`; authored through natural input, never raw LaTeX by hand where avoidable.
2. Working blocks: one idea per step, attempt-before-reveal, hints available.
3. Widgets are instruments — a probability *question* lives on the page (like the humanities interactive/question split); the widget is the tool the student operates to answer it.
4. Graphs/geometry self-contained and tokened; never embed an external grapher.
5. Every interactive (slider, draggable vertex, widget) has its a11y alternative (numeric input, value table, keyboard control) — checked by the render-gate.
