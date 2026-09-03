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

**Ranking (Stage 2c).** Clearance is a HARD GATE and is never traded away — but "step outward until
clear" does not on its own say *which* clear position to take, and the candidate space is enumerated
(distance × direction × perpendicular SHIFT along the edge), so the first clearing candidate is often
not the nearest one. A large shift at a small distance was being accepted ahead of a small unshifted
step further out, and on a saturated plane that loses the association between a label and the point it
names (measured: `K` placed 57.5px from its marker where 20.5px was legal; `V` 44.2px; `I` 31.4px).
Among the candidates that satisfy every clearance rule, placement takes the one with the smallest
DISPLACEMENT from the owner — marker to label-box centre. The ring distance is a true lower bound on
displacement, so the search remains a terminating branch and bound rather than a full enumeration.
Placement stays deterministic: fixed enumeration order, strict improvement only, so ties resolve to
the more preferred direction. "Never traded away" scopes to the candidates that ARE legal: when none
is, the figure has already failed, and the fallback that picks the box to draw anyway does trade
clearance against staying on the canvas — §3.2 step 3 states that rule.

**Axis furniture is an obstacle (Stage 2c).** "Clear every arm" covers the axis LINES; it must also
cover the numbers PRINTED along them. The reserved boxes are derived from the same nice-tick chooser
(§1.2) that emits them, at the tick density currently in effect, so changing tick density changes what
a label has to clear. Without this, ranking by displacement makes tick-label collisions *worse* — the
nearest legal position is very often the one tucked in against an axis.

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
armMin = min(|P−V|, |Q−V|)            # the shorter incident arm
room   = k·armMin                     # k ~ 0.5 — NO minimum floor: a floor not bounded by the
                                      # arm draws past its ends (Stage 3b)
step   = min(baseStep, room/(n+1))    # spacing shrinks so n arcs always fit
r_i    = min(baseR + (n−1)·step, room) − (n−1−i)·step      # i = 0…n−1, outermost = r_(n−1)
# INVARIANT: 0 < r_0 < … < r_(n−1) ≤ room < armMin. Stacked arcs are distinct at EVERY arm length,
# and every arc is strictly inside the arms it spans. §3.2 anchors the measure to r_(n−1).
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
- **Side length:** anchor = edge midpoint; primary dir = the perpendicular normal that faces OUT of the
  closed outline the edge belongs to, decided by an even-odd ray cast against that outline (Stage 3b —
  the centroid test picks the wrong side on a concave polygon and a winding-sign rule picks the wrong
  side when the vertices are listed the other way round); a bare segment has no interior, so it falls
  back to the centroid of the figure's points. A lone segment is the degenerate case of that fallback —
  its centroid IS its midpoint, so the dot product is 0 and neither normal is "outward". The rule is then
  simply the unflipped normal `(−e.y, e.x)`, taken from the edge direction A→B: fully determined, and stable
  across re-solves. It is not orientation-INdependent — listing the endpoints the other way round puts the
  label on the other side — but a lone segment has no interior for either choice to be wrong about, so the
  author's ordering is the only thing that could decide it. Along = the edge direction.
- **Vertex name:** anchor = the vertex; primary dir = the EXTERNAL bisector, taken as `−(cos φ, sin φ)`
  from §3.1's swept interior bisector `φ`; along = an arm direction. This said `−normalize(u+w)` with a
  "degenerate near 180° → use edge perpendicular" escape until Stage 3b. The implementation never used it:
  `normalize(u+w)` collapses toward the zero vector as the vertex straightens, so the direction is not
  merely degenerate AT 180° but progressively unreliable approaching it, and the special case papered over
  a formula that §3.1 had already replaced. Deriving it from the signed sweep is correct at every angle and
  needs no escape — the same correction §3.2's candidate ordering needed above.
- **Angle measure:** anchor = the point where the OUTERMOST arc meets the swept bisector (§3.1); primary
  dir = that same bisector. The pill therefore resolves to **arc → GAP → label** on one line, and the arc
  and its measure read as a single annotation (Stage 3b). It was `e·r`, a MULTIPLE of the radius, which
  pushed the number deep into the polygon on a wide angle and left a student matching numbers to corners
  by eye. No per-vertex offsets exist at any point in this.
- **Plotted point (graph):** anchor = the point; primary dir = away from nearby curves/axes.

**Stage 3c — the ALLOWED REGION.** A preferred anchor is a starting point, not a constraint: the search is
free to leave it, and clearance alone cannot tell it not to. An angle measure pushed outside its own wedge
is perfectly collision-free and simply wrong — it now names a different part of the figure. So each role
also carries the region a candidate must stay inside, and the search never leaves it:

```
semantic role → preferred anchor → ALLOWED REGION → clearance search → nearest legal → role styling
```

| Role | Allowed region |
|---|---|
| Angle measure, and a symbolic name for the same angle | inside the swept wedge (never across either arm); for an INTERIOR angle, also inside the polygon |
| Side measure | the exterior half-plane of its own edge — free to slide along the side and vary distance, never to cross it |
| Vertex name | outside the polygon it names |

The region is not a preference the ranking can outvote: an illegal candidate is not a candidate, so it is
excluded before clearance is even measured, and excluded from the fallback too. Stage 2c is unchanged in
what it does — it still ranks by displacement and takes the nearest legal position — but it now chooses
only among positions that still mean the right thing. Geometry supplies regions; the graph supplies none
and behaves exactly as before.

**Exhausting a region is reported, never silently escaped.** If nothing legal exists inside it, the figure
expands (up to the same 8 passes as §1.3) and tries again; only then is the region relaxed, and the figure
REPORTS the label whose association it had to weaken. A measure drawn outside its own angle without saying
so is a worse failure than a missing one, because nothing in the picture reveals it.

**Placement = candidate-position search (established cartographic method, NOT single-direction march):**
1. Generate candidates: out along the primary dir at increasing distance (base…base+~70, step ~6),
   EACH also shifted along the edge/arm by a few offsets (0, ±14, ±26…) toward the less-crowded end.
2. Order near→far; test each candidate box against ALL obstacles (arms as segments, vertices/points,
   already-placed pills). Take the NEAREST fully-clear candidate — smallest displacement from the anchor, not
   the first one encountered (Stage 2c; §1.4 carries the reasoning and the branch-and-bound that keeps it
   terminating). This paragraph said "the FIRST fully-clear candidate" until Stage 3, which was the pre-2c
   rule and would have had geometry inherit exactly the defect Stage 2c removed from the graph.
2b. The exhaustive fallback ranks by distance from the anchor too (Stage 3c). It returned the first clear
   cell in raster order, which was invisible while it fired rarely; constraining regions makes it fire far
   more often, and then "first in raster order" put a side length in the corner of the canvas — legal, and
   370px from the edge it measured.
3. If none is fully clear within range (pathological), the EXHAUSTIVE on-canvas scan (2b) runs first —
   the penalised box below is taken only when that scan finds nothing either, never as a shortcut past it.
   That box is then marked INVALID. "Least-penalised" is a BLEND, not max clearance: each candidate scores
   `clear − 3 × off`, where `clear` is the true geometric clearance to every obstacle and `off` is how far
   the box pushes past the 2px canvas inset. So a box with less clearance that stays on the canvas beats a
   clearer one hanging off it — deliberate, since a label painted outside the viewBox is not visible at
   all — and the fallback does NOT maximise clearance, though this step said it did until the wording was
   corrected. Selection is by STRICT improvement, so ties keep the first candidate in the fixed enumeration
   order and the fallback is as deterministic as the ranking above it.
   Marking the box INVALID is not a placement: it makes the fitter expand the domain and re-solve, and if
   the figure still cannot place the label after the escalation cap it reports
   `label "…" could not be placed clear of the figure`. The label IS still drawn at that box, and that
   is deliberate — dropping it would leave a figure that looks complete and silently is not, which is
   the failure mode §4 exists to prevent. So the guarantee is precise: no sub-`GAP` box is ever ACCEPTED
   as legal, and none is ever drawn without the figure saying so. (This paragraph claimed the label was
   not drawn at all until Stage 3c; `figGeomBody` and `figLayoutPills` have always painted it, so the spec
   was describing an engine that does not exist.)
4. Placement order: vertices first (they crowd corners), then lengths, then angle measures — later
   pills see earlier ones as obstacles.

**Stage 3b — annotation ROLES.** A geometry figure says four different kinds of thing and they are not
equal, so each label carries a semantic role that sets both its type treatment and the pill size the
search reserves for it (they must move together, or the box stops matching the ink):

| Role | Applies to | Weight |
|---|---|---|
| `vertex` | vertex names | strongest — the structure is named |
| `symbol` | authored maths names (`θ`, `x`) | maths italic, above a measurement |
| `measure` | computed lengths and angles | secondary — explanatory, not structural |

Marks are subordinate to the polygon they annotate: arcs and right-angle squares are drawn a step
lighter than the edges. The roles are classes on the existing token system — never per-figure styling,
so every authored diagram inherits the same grammar. Measurement text has ONE numeric style: precision
follows magnitude, trailing zeros are dropped, and the degree sign is set with its number.
This survives rescale because anchors + directions are coordinates; auto-fit (§1.3) must include every
pill box in the union so the domain leaves room.

ACCEPTANCE: across right/scalene/obtuse/tight triangles, with and without vertex labels, NO pill
overlaps any arm, vertex, or other pill; near-vertical edges (label wants to sit on the arm) resolve
clear; the vertical-side length label never touches the vertical arm.

---

### 3.3 The measurement surface — an INVARIANT (Stage 3d)

A side MEASUREMENT is painted on a quiet accent-tinted surface; an angle measure and a side NAME are not.
Two questions decide it, and they are separate — this is the invariant, not an implementation note:

```
     surface?   semantics  —  author's semantic role  ->  fallback classifier (only if unspecified)
     face?      content    —  the string, always
```

**Author intent always wins.** `label:"measure"` / `label:"name"` is the source of truth and is consulted
before anything else. The content classifier exists only for lessons written before that field did, and can
never be promoted to the semantic model: mathematics is ambiguous by nature, and `AB`, `a`, `r`, `2x` and `PQ`
each denote a name or a quantity depending solely on what the author meant. A string cannot carry intent, so
the classifier is deliberately NOT made cleverer — ambiguity is what the explicit field is for.

Keeping the two questions apart is what makes the system general: `x + 4`, `2r`, `3.4 km` and `√2` all behave
correctly *because they are measurements*, not because a pattern recognised their characters.

Three presentation roles, ONE placement system — the exterior-side rule of §3.2, unchanged:

| Role | Face | Surface |
|---|---|---|
| measurement | numerals upright; algebra in the maths face | yes |
| symbolic name (`a`, `c`, `AB`, `θ`) | maths face | no |
| prose name (`hypotenuse`, `radius`) | upright body text | no |

A word is not a variable: `hypotenuse` set in the maths face reads as a product of eight letters.

A measurement and its unit are ONE semantic annotation and ONE collision box, sized from the complete
formatted string before any placement search runs. The unit is subordinate — 85% of the value's size and the
quietest ink that still clears WCAG AA in every pack — but never independently positioned or measured.

## 4. Single source of truth (kills the "arc says 35° but triangle isn't" failure)

A figure has ONE source of truth. Two front doors, same downstream:
- **Constructions/constraints** (primary for teaching): author states givens → engine SOLVES the
  coordinates → computes everything → draws. e.g. `rightTriangle{legs:[6,8], right:A}` solves coords,
  computes hypotenuse=10, ∠B=53.1°.
- **Coordinates** (for coordinate-geometry): author gives exact points → engine computes all
  angles/lengths → draws.

**Every value-label renders the COMPUTED value from the solved figure — never an authored string.**
There is no field to type an angle/length value; you may only ask to *display* the one the engine
computed — `label:"measure"` on an `angle`, `text:"auto"` on a `sideLabel`. This makes the drawn angle and
its label the same number by construction; contradiction is structurally impossible.

Use **parameterised constructions** (closed-form, reliable), NOT a general constraint solver:
`rightTriangle(legs)`, `triangleSAS(a,b,angle)`, `triangleASA(angle,side,angle)`, `triangleSSS(a,b,c)`,
`circle(radius)`, `regularPolygon(n)`, `rawCoordinates([...])`. General constraint solving is a later,
optional extension.

---

## 5. Declarative figure format (authoring)

A figure is JSON: a `construction` (one of §4) + a `show` list (which marks/labels to render) +
viewport hints. The author writes givens and *what to show/label* — never positions or values.

**`SCHEMA.md` is the canonical payload** — it documents what the engine actually reads, and this section
is the rationale for it. The shape below was this document's own sketch (`construction` as an object, a
`show[]` array, `text:"measure"`); it is NOT what ships, and an author who wrote it from here would produce
a lesson the engine cannot read. Corrected to the shipped vocabulary — `objects[]`, `construction` +
`params`, `label:"measure"`, `text:"auto"`:
```json
{
  "figure": "geometry",
  "construction": "rightTriangle",
  "params": { "legs": [6, 8], "right": "A" },
  "objects": [
    { "type": "polygon", "vertices": ["A","B","C"] },
    { "type": "rightAngle", "at": "A", "between": ["B","C"] },
    { "type": "angle", "at": "B", "between": ["A","C"], "label": "measure" },
    { "type": "sideLabel", "between": ["A","B"], "text": "auto" },
    { "type": "sideLabel", "between": ["B","C"], "text": "x" }
  ],
  "grid": "hidden",           // hidden = invisible scaffold (coords still computed), or "shown"
  "aspect": "equal"           // read for graphs; geometry is ALWAYS equal
}
```
Vertex names are not an object: they are on by default for every polygon vertex and suppressed with
`vertexLabels: false`. `aspect` is not read for geometry.
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
  "grid": "shown", "aspect": "stretch",
  "minorGrid": true,         // UI-1: display DEFAULTS — where the figure starts. The learner can still
  "axisNames": true }        // change all three from Options in the focused workspace (persists for the session).
```
`grid` / `minorGrid` / `axisNames` are the figure's display defaults, not locks: the focused workspace keeps
them learner-overridable behind **Options**. Primary learner controls stay `Zoom out · Zoom in · Pan · Reset ·
Options` — engine capability does not imply permanent UI exposure, and Stage 3 geometry inherits that rule
along with the shared Figure Shell rather than introducing a second dense toolbar. Authored in `SCHEMA.md`
under the `figure` block.

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
