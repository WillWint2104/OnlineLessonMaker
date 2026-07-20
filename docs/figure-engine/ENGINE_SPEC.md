# Lesson Studio — Figure Engine Spec (Graph + Geometry)

**Status:** design-locked in chat, ready to build. This is the document that drives the Claude Code build.
**Scope:** ONE shared engine that renders coordinate-defined figures. The *graph engine* and the
*geometry engine* are the same machinery rendering different object types. Build the shared foundation
first, then the two front-ends.

**Golden rules (inherited from the project):** self-contained, no third-party/CDN, no GeoGebra/Desmos
embed. Token-driven so figures re-skin per theme. Renders to SVG. Additive — must not touch frozen
runtime or legacy corpus.

---

## 0. The core idea (why the earlier approach failed, and what replaces it)

A figure is **NOT** a set of vertex coordinates with placement formulas applied at draw time. That
model drifts: arcs float, labels detach, because the "connection points" (where a ray starts, where an
arc seats, where a label hooks) were computed ad-hoc during rendering.

A figure **IS a construction dependency graph** (DAG) of named geometric objects — the architecture
every mature dynamic-geometry system (GeoGebra, Cinderella, Cabri) uses:

- **Free objects** — the degrees of freedom (given coordinates, or the parameters of a construction).
- **Dependent objects** — every other point/line/arc/label, each defined by a *construction rule* that
  references its parents. Computed exactly from the rule, never eyeballed.
- **Drawables** — the subset that render (segments, arcs, polygons, circles, labels), each *seated on*
  named points from the graph.

Every attachment point is a first-class named dependent point. An angle arc is not "drawn near B" — its
endpoints ARE constructed points `PointOnRay(B→A, r)` and `PointOnRay(B→C, r)`; its label sits at
`PointOnBisector(A,B,C, e·r)`. Placement is not a step that can drift; it is a dependency.

**Correctness property:** a dependent point cannot be in the wrong place, because it is *defined by* the
relationship that places it. When the figure rescales (auto-fit) or a free point changes, every
dependent object recomputes through the graph — no drift, one system.

Evaluation order: topological sort of the DAG. Cycles are an authoring error (reject at parse).

---

## 1. Shared foundation (build first)

### 1.1 Coordinate / viewport system
Exact, reversible mapping between **math space** (real coordinates) and **screen space** (SVG px).

Domain: `xMin,xMax,yMin,yMax`. Container plot box: `plotW,plotH` (container minus padding).
```
sx = padL + (x - xMin)/(xMax - xMin) * plotW
sy = padT + (yMax - y)/(yMax - yMin) * plotH        # y flips: math-up = screen-down
# inverse (for point-picking / hit-testing):
x = xMin + (px - padL)/plotW * (xMax - xMin)
y = yMax - (py - padT)/plotH * (yMax - yMin)
```
Arbitrary real coordinates map exactly (no snapping) — this is REQUIRED for table-of-values plotting.

**Aspect mode:**
- `equal` — lock equal px-per-unit on both axes. MANDATORY for geometry (squares stay square, circles
  stay circles). Achieved by expanding the shorter domain to match the container ratio.
- `stretch` — axes fill independently. Only for data plots where x,y are unrelated.

### 1.2 Nice tick / increment chooser
```
raw = range / targetTicks            # targetTicks ~ 5..8
mag = 10^floor(log10(raw))
norm = raw/mag                        # in [1,10)
niceNorm = 1 if norm<1.5 else 2 if norm<3 else 2.5 if norm<4 else 5 if norm<7 else 10
step = niceNorm * mag                 # always 1/2/2.5/5 x 10^n
```
Ticks at every multiple of `step` within range. Minor ticks optional at step/2 or step/5.
Label precision = decimals implied by `step` (0.5→1dp, 5→integer).
Verified outputs: -3..3 → step 1; 0..100 → step 20; -1..1 → step 0.5.

### 1.3 Auto-fit to container
1. Compute the bounding box of the ENTIRE figure — the UNION of: shape geometry, every mark, every
   **point marker**, every **label's rendered box**, and **reserved axis-name space** (the x/y names at
   the axis ends). Labels contribute their rendered box in math units via the current scale; iterate
   once (label size is scale-dependent).
2. Choose the DOMAIN from that union, not from raw point coordinates — so a point at the top/edge of
   the data still has room ABOVE/BESIDE it for its identifier, and axis names have end-space no point
   intrudes into. Then scale + center into the plot box with padding, `equal` aspect preserved.
3. Combine with §1.4: a label whose ideal side would collide (e.g. a point ON the y-axis) is placed on
   the CLEAR side. Auto-fit gives room; collision placement chooses the side.
Nothing clips; nothing left-weights; NO label overlaps an axis, gridline it shouldn't, another label,
or a point. ACCEPTANCE: a point on an axis at the data extreme (e.g. C=(0,3) with others at y≤1) must
render with its label clear of the axis AND with headroom above — verify the domain expanded past the
point to make room.

### 1.4 Label collision resolution
Deterministic candidate-search (standard cartographic method):
- Each label has an *ideal* anchor (from its construction rule).
- Try ideal. If its box overlaps a line, a shape edge, or another placed label, step the offset
  outward (increase eccentricity / walk along the offset direction) until clear. Spiral/step search
  provably terminates (far enough out is always clear).
- Adjust the underlying *coordinate anchor* (not pixels), so it survives rescale.

### 1.5 Text halo (legibility)
Every label renders with a contrasting halo so it stays legible over gridlines, arcs, shape edges.
SVG: `paint-order: stroke; stroke: <bg>; stroke-width: 3px; stroke-linejoin: round`. Standard
map/diagram technique. Fixes label-obscured-by-lines.

### 1.6 SVG primitive layer
Low-level, token-styled draw calls both engines emit: `line, polyline, polygon, circle, arc(cx,cy,r,
a0,a1), text(withHalo), tick`. All colors via theme tokens (`--accent`, `--ink`, `--grid`, etc.).

### 1.7 Reveal-on-tap + identifiers
- Coordinates are NOT printed inline by default (they collide). A plotted point renders as marker +
  short identifier (A,B,C or P1,P2…). Tap/hover → callout with exact coordinates, placed by 1.4.
- Table rows are tagged with the same identifier → explicit table↔figure mapping.
- Reveal uses the existing Phase B interaction rail (`data-tp-focus-open`), NOT new interaction code.

---

## 2. Construction vocabulary (the DAG "verbs")

Each returns a named dependent object computed from its parents. This is the substance of the engine.

**Points**
- `Point(x, y)` — free point at coordinates
- `Midpoint(P, Q)` = (P+Q)/2
- `PointOnSegment(P, Q, t)` = P + t·(Q−P), t∈[0,1]
- `PointOnRay(V, dir, dist)` = V + normalize(dir)·dist   (dir may be another point ⇒ dir = that − V)
- `PointOnBisector(P, V, Q, dist)` — on the interior bisector of ∠PVQ at `dist` from V (see 3.1)
- `Intersection(a, b)` — line∩line, line∩circle, circle∩circle (return the specified root)
- `FootOfPerpendicular(P, line)` — projection of P onto line
- `Centroid(pts…)`, `CircleCenter(...)`, etc. as needed

**Lines / shapes (drawables)**
- `Segment(P, Q)`, `Ray(V, dir)`, `Line(P, Q)`
- `Polygon(P1..Pn)` (Triangle = 3)
- `Circle(center, radius)`, `Arc(center, radius, from, to)` where from/to are directions or points

**Marks (drawables, all coordinate-derived — see §3)**
- `RightAngleMark(V, P, Q, size)` — square inset along VP, VQ
- `AngleArc(V, P, Q, r)` + `AngleLabel(...)` — see 3.1
- `EqualLengthTicks(P, Q, count)` — `count` ticks at the segment midpoint, perpendicular
- `ParallelArrows(P, Q, count)` — at midpoint, along the segment
- `LengthLabel(P, Q, text|auto)`, `PointLabel(P, text)` — see 3.2

**Values (computed, never authored)**
- `Length(P,Q)`, `AngleMeasure(P,V,Q)`, `InteriorAngle(polygon)` — any value-label displays THESE,
  never a typed string (see §4).

---

## 3. Angle & label constructions (the load-bearing math — use the established method, not heuristics)

### 3.1 Angle arc + label (TikZ / cartographic method — verified)
Given vertex V and ray points P, Q:
```
α = atan2(P.y−V.y, P.x−V.x)          # ray-1 angle
β = atan2(Q.y−V.y, Q.x−V.x)          # ray-2 angle
δ = wrapToPlusMinusPi(β − α)          # SIGNED sweep; |δ| = angle magnitude; robust across ±180°
r = min(baseR, k·min(|P−V|, |Q−V|))   # arc fits inside; k ~ 0.5
# arc: centre V, radius r, drawn from α through α+δ
φ = α + δ/2                           # bisector of the SWEPT arc — correct side, no degeneracy
labelAnchor = V + (cosφ, sinφ)·(e·r)  # e = eccentricity ~1.6 (just outside the arc)
# collision (§1.4): if label box collides, increase e stepwise until clear
if |δ| ≈ 90° (within tol): draw RightAngleMark instead, skip arc + arc-label
```
Do NOT use `normalize(u+w)` for the bisector (degenerates near 180°) and do NOT use `gap/sin(θ/2)`
(an invented heuristic). Use signed sweep + `α+δ/2` + eccentricity `e·r`.

`PointOnBisector(P,V,Q,dist)` = `V + (cosφ, sinφ)·dist` using φ above.

### 3.2 Label placement — unified PILL system (proven in prototype; the collision unit)
EVERY label (vertex name, side length, angle measure, plotted-point identifier) is a **sized pill**:
a rounded box fit to its text (`width = textWidth + 2·padX`, `height = lineHeight + 2·padY`), with a
knockout fill (background-colour or white) so it reads cleanly over any arm/grid it lands near. The
pill's BOX is the collision unit — this is what gives every label a real footprint so spacing is exact.

**HARD RULE:** every pill box must sit at least `GAP` px CLEAR of every arm (edge, as a line
segment) — a uniform MINIMUM DISTANCE, measured as true box-to-segment distance, NOT mere
non-overlap. No pill may sit on, flush against, or over a line. Pills must also clear vertices/points
and other pills by their own minimum gaps. The placement search runs until this holds — no exceptions.
The knockout fill is a nicety, not a crutch: pills do not touch lines in the first place. GAP is a
single uniform constant so all pills sit the same clear distance off their edges.

Anchor + primary direction per label type (all coordinate-derived):
- **Side length:** anchor = edge midpoint; primary dir = outward normal `normalize(−edge.y, edge.x)`
  flipped away from the polygon centroid; along = the edge direction.
- **Vertex name:** anchor = the vertex; primary dir = EXTERNAL bisector `−normalize(u+w)` of its two
  arms (degenerate near 180° → use edge perpendicular); along = an arm direction.
- **Angle measure:** on the swept-arc bisector at `e·r` (§3.1) — small pill, same collision rule.
- **Plotted point (graph):** anchor = the point; primary dir = away from nearby curves/axes.

**Placement = candidate-position search (established cartographic method, NOT single-direction march):**
1. Generate candidates: out along the primary dir at increasing distance (base…base+~70, step ~6),
   EACH also shifted along the edge/arm by a few offsets (0, ±14, ±26…) toward the less-crowded end.
2. Order near→far; test each candidate box against ALL obstacles (arms as segments, vertices/points,
   already-placed pills). Take the FIRST fully-clear candidate.
3. If none is fully clear within range (pathological), take the least-penalised (max clearance) — but
   the search range must be wide enough that this is rare.
4. Placement order: vertices first (they crowd corners), then lengths, then angle measures — later
   pills see earlier ones as obstacles.
This survives rescale because anchors + directions are coordinates; auto-fit (§1.3) must include every
pill box in the union so the domain leaves room.

ACCEPTANCE: across right/scalene/obtuse/tight triangles, with and without vertex labels, NO pill
overlaps any arm, vertex, or other pill; near-vertical edges (label wants to sit on the arm) resolve
clear; the vertical-side length label never touches the vertical arm.

---

## 4. Single source of truth (kills the "arc says 35° but triangle isn't" failure)

A figure has ONE source of truth. Two front doors, same downstream:
- **Constructions/constraints** (primary for teaching): author states givens → engine SOLVES the
  coordinates → computes everything → draws. e.g. `rightTriangle{legs:[6,8], right:A}` solves coords,
  computes hypotenuse=10, ∠B=53.1°.
- **Coordinates** (for coordinate-geometry): author gives exact points → engine computes all
  angles/lengths → draws.

**Every value-label renders the COMPUTED value from the solved figure — never an authored string.**
There is no field to type an angle/length value; you may only ask to *display* the one the engine
computed (`label: angleB`, `label: sideBC`). This makes the drawn angle and its label the same number
by construction; contradiction is structurally impossible.

Use **parameterised constructions** (closed-form, reliable), NOT a general constraint solver:
`rightTriangle(legs)`, `triangleSAS(a,b,angle)`, `triangleASA(angle,side,angle)`, `triangleSSS(a,b,c)`,
`circle(radius)`, `regularPolygon(n)`, `rawCoordinates([...])`. General constraint solving is a later,
optional extension.

---

## 5. Declarative figure format (authoring)

A figure is JSON: a `construction` (one of §4) + a `show` list (which marks/labels to render) +
viewport hints. The author writes givens and *what to show/label* — never positions or values.

```json
{
  "figure": "geometry",
  "construction": { "type": "rightTriangle", "legs": [6, 8], "right": "A" },
  "show": [
    { "mark": "rightAngle", "at": "A" },
    { "mark": "angle", "at": "B", "label": "measure" },
    { "label": "side", "of": "AB", "text": "measure" },
    { "label": "side", "of": "BC", "text": "x" },
    { "label": "vertex", "of": ["A","B","C"] }
  ],
  "grid": "hidden",           // hidden = invisible scaffold (coords still computed), or "shown"
  "aspect": "equal"
}
```
Context-sensitivity: only the objects in `show` render. One question shows the right-angle + `x`;
another hides them and shows all three side measures. Same construction, different `show`.

Graph figures use the same shape with a plotting `construction`:
```json
{ "figure": "graph",
  "domain": {"xMin":-3,"xMax":3,"yMin":-2,"yMax":4},
  "objects": [
    { "type": "function", "f": "x^2" },
    { "type": "points", "from": "table", "rows": [["A",2.4,-1.7],["B",-1,1.5]] },
    { "type": "segment", "between": ["A","B"] }
  ],
  "grid": "shown", "aspect": "stretch" }
```

---

## 6. Graph engine specifics
- Plot functions (linear + non-linear) by sampling x across domain, mapping each (x, f(x)) via §1.1,
  polyline through mapped points (adaptive sampling near steep regions; break at discontinuities).
- Plot points from explicit coords OR a **table of values** (arbitrary reals, §1.1 — the core case).
- **Line/segment plotting between named points.**
- Points get identifiers + reveal-on-tap coords (§1.7); table rows tagged to match.
- **Expand view** (per-figure button, opens a focused window via the interaction rail): zoom, pan,
  increment/scale selection, coordinate readout on hover, gridline/feature toggles, reset.
- **NO freehand auto-grading.** The engine RENDERS the model-answer figure accurately; the student
  self-assesses their own (paper) attempt against it via the three-way self-mark. Lightweight
  *discrete* input only (pick/plot a point, enter a value, fill a table) — never interpreted freehand.

---

## 7. Geometry engine specifics
- 2D first: the constructions in §4 → solved figure → drawables + marks (§2,§3), grid hideable (§5).
- Then isometric 3D: solids (cube/cuboid/prism/pyramid/cylinder/cone/sphere) from a spec, projected
  isometrically; dimension labels offset outward by rule (same label machinery, projected); face
  shading by orientation. Same construction-graph model, projection applied at the viewport step.
- Rotatable 3D field: SEPARATE, heavier capability (a real 3D renderer) opened via "Rotate" from the
  Expand hook — a later phase, built as a shared capability, not bolted to one block.

---

## 8. Container integration (already designed — engines plug in)
The exercise/figure containers are DONE (grid cell, hint icon-chip, per-part status, Expand button,
solution modal with annotated two-column working + three-way self-mark). A graph/geometry part is a
container that calls the engine to render its figure. Build ENGINES FIRST; the containers already
exist and simply invoke them.

---

## 9. Build order
1. Shared foundation: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7. (Prove each; §1.1,1.2,1.7 already
   sanity-checked.)
2. Construction graph runtime: object model, topological eval, the §2 vocabulary.
3. Graph engine front-end (§6) — functions, table plotting, segments, expand view.
4. Geometry 2D front-end (§4,§5,§7) — constructions, marks (§3), single-source-of-truth labels.
5. Geometry isometric 3D (§7).
6. (Later) Rotatable 3D field; sketch-answer rendering for student solutions (author-provided format).

## 10. Acceptance (per stage)
- Coordinates: arbitrary reals + table plotting land exactly; tick chooser gives 1/2/2.5/5·10^n.
- Auto-fit: nothing clips or left-weights across figure sizes.
- Angle: arc + label correct across narrow/right/wide/obtuse; label always inside; right-angle→square.
- Single source of truth: no figure can display a value that disagrees with its geometry (no typed
  value field exists).
- Additive/#119: frozen runtime + legacy corpus byte-identical; token-only; self-contained; no CDN;
  contrast AA; validate green.

## 11. Standing note
Mockups cannot prove any of this — correctness exists only when the engine evaluates the constructions.
This spec, not hand-drawn figures, is the deliverable. Every "connection point" is a named dependent
object in the DAG; that is the whole fix for the placement failures.
