# Lesson Studio — Figure Engine & Blocks: Sequenced Build Plan

Run these in order. Each is a self-contained Claude Code prompt. After each: mark PR ready → auto-merge
on green `validate` → deploy once → artifact-verify on deployed main → report back → I verify against
the stage's acceptance before the next. Every stage is ADDITIVE: frozen runtime fns + legacy corpus
BYTE-IDENTICAL, token-only (no `[data-theme]` structural forks), self-contained (no CDN/KaTeX/GeoGebra),
contrast AA. Spec of record: `ENGINE_SPEC.md`. Correctness is PR-proven, not mock-proven.

Dependency order is strict: **engine foundation → engine runtime → front-ends → block wiring → solution
polish.** A graph/geometry part is an empty frame until its engine exists, so engines come first.

---

## STAGE 1a — Coordinate/viewport foundation
Branch `v3-figengine-coords`, tag `pre-figengine`. Spec §1.1, §1.2, §1.6.
Delivers: math↔screen mapping (+inverse) with arbitrary-real precision (no snap); aspect `equal`/
`stretch`; nice-tick chooser (1/2/2.5/5×10ⁿ); SVG primitive layer (line/polyline/polygon/circle/arc/
text/tick) all theme-token-coloured; minimal intake that renders a coordinate PLANE (axes+grid+ticks+
labels) and plots POINTS from a list OR table (arbitrary reals) as marker+identifier; grid shown/hidden
(hidden = computed, unpainted).
STEP 0 diagnose first: name the composable block/fragment seam a figure registers into with ZERO
changes to frozen runtime (renderPackSlide/renderFragment/wirePack/resolveInteractions/fragSelfCheck/
fragPracticeSet); confirm theme tokens for grid/axis/ink/accent; confirm any label maths uses the
existing TPMath→MathML path, not KaTeX.
ACCEPTANCE: −3..3→step1, 0..100→step20, −1..1→step0.5; point (2.4,−1.7) from a table lands at the exact
mapped pixel (assert), not snapped; `equal` keeps a unit square square; grid-hidden points land
identically to grid-shown; re-skins on token swap (screenshot ScholarMath + 1 theme); ADDITIVE/#119
clean; validate green; 0 console errors.

## STAGE 1b — Auto-fit + uniform-gap pill collision (the proven placement core)
Branch off 1a. Spec §1.3 (sharpened), §1.4, §3.2 (unified pill system).
Delivers: (1) auto-fit that measures the UNION of markers + every LABEL/PILL box + reserved axis-name
space, expands the domain so nothing at an edge collides, centers with padding, `equal` preserved.
(2) The PILL primitive: sized to text (+padX/padY), knockout fill, its BOX is the collision unit.
(3) Candidate-position placement: out along the primary dir at steps AND shifted along the edge/arm;
take first candidate whose box is ≥ GAP (uniform min DISTANCE, true box-to-segment) clear of every arm,
and clear of vertices/points and other pills; vertices placed before lengths.
ACCEPTANCE (the cases I kept catching): across right/scalene/obtuse/tight, with & without vertex labels,
NO pill sits on/over/flush to any arm — all ≥ GAP clear; a near-vertical edge's length pill never
touches the vertical arm; a point on an axis at the data extreme (C=(0,3), others ≤1) renders label
clear + headroom above (auto-fit expanded the domain); ADDITIVE clean; validate green.

## STAGE 1c — Construction-graph runtime + vocabulary
Branch off 1b. Spec §0, §2, §4.
Delivers: the DAG object model (free + dependent objects, topological eval, reject cycles); the
construction vocabulary — `Point, Midpoint, PointOnSegment, PointOnRay, PointOnBisector, Intersection,
FootOfPerpendicular, Segment, Ray, Line, Polygon, Circle, Arc`; computed VALUES (`Length, AngleMeasure,
InteriorAngle`); the SINGLE-SOURCE-OF-TRUTH rule — value-labels render ONLY the computed value, there is
NO field to type an angle/length. Parameterised constructions: `rightTriangle, triangleSAS/ASA/SSS,
circle, regularPolygon, rawCoordinates` (closed-form, no general solver).
ACCEPTANCE: rightTriangle{legs[6,8]} computes hyp=10, ∠=53.1°, labels show computed values; every
dependent point sits exactly on its construction rule (arc endpoints = PointOnRay ON the arms); no
authored value can contradict geometry (no typed-value field exists); ADDITIVE clean.

## STAGE 2 — Graph engine front-end
Branch off 1c. Spec §5 (graph shape), §6.
Delivers: plot functions (linear + non-linear) by adaptive sampling, break at discontinuities; plot
points from coords OR table (arbitrary reals — core); segments between named points; reveal-on-tap
coordinates + identifiers via the Phase B rail (`data-tp-focus-open`, NOT new interaction code); the
declarative graph JSON intake. **NO freehand auto-grading** — render accurately only; discrete input
(pick/enter/fill) later.
ACCEPTANCE: y=x² samples smoothly; a table of awkward values plots faithfully; tap reveals coords via
the existing rail; matches the APPROVED coordinate-plane visual target (axes+ticks, plain tick labels,
clear-side point letters, board-dark callout); ADDITIVE clean; validate green.

## STAGE 2b — Expand / focused graph window
Branch off 2. Spec §6.
Delivers: the ⤢ Expand button on a figure opens a focused window (via the interaction rail): zoom, pan,
increment/scale selection, coordinate readout on hover, gridline/feature toggles, reset. No new global
interaction machinery — reuse the focus-open rail.
ACCEPTANCE: Expand opens/closes cleanly; zoom/pan/reset work; readout tracks the cursor in math coords;
ADDITIVE clean.
INVARIANT (added post-audit, applies to EVERY front-end that uses the focused workspace — Geometry
inherits it): expanding a figure must give the plot MORE usable area than the inline figure, never less.
SECOND INVARIANT (UI-1 visual review): the painted plane must be GENERATED THROUGH the available viewport,
not letterboxed inside it. The focused box was fixed at 900x560, so `preserveAspectRatio="xMidYMid meet"`
held a 1.607 landscape plane whatever the stage's shape: at 834x1112 the stage was 780x947 but the grid only
707x427 — 520px of blank INSIDE the bordered plot region, 73% blank at 390x844. figxBoxFor() now measures the
stage and re-solves, so axes, grid and coordinate mapping regenerate for the real viewport. Never stretch a
rendered SVG to fake this; `aspect:'equal'` still keeps square units (a portrait viewport shows more y-range,
which is the correct answer). Assert the painted grid against the stage, not just the SVG element.
Shipped at 0.34× (the focused panel lost to `.tp-fpanel` on source order and was capped at 760px, and its
own chrome ate the rest); now ≥ 1.0× at 1440×900 / 1280×800 / 1024×768 / 834×1112. Assert the ratio, don't
eyeball it. The margin is currently slim (1.08×) because the INLINE figure is allowed to fill the pane —
sizing the inline figure is a visual-system decision, not an engine one, and is deferred to that pass.

## PRE-STAGE-3 REQUIREMENT — crowded label placement (raised at the UI-1 visual review)
The crowded graph fixture shows identifiers (I, K, L) sitting visibly far from their points: §3.2's "clear
every arm by >= GAP" search pushes a pill until it satisfies the constraint, with nothing pulling it back
toward its owner, so on a saturated plane association is lost. This PREDATES UI-1 and was deliberately NOT
folded into that visual correction — it belongs to the Stage-1b placement system, not the shell.
**Before Stage 3 is considered complete, crowded graph AND geometry labels must be reviewed so geometry does
not blindly inherit this.** Decide after UI-1 whether it is a small Stage 2c correction first (e.g. add a
distance-to-owner term to the candidate ranking, so the search prefers the nearest satisfying position rather
than the first) or part of Stage 3's fixture-driven work. `figure-geometry-baseline.json`'s crowded-labels
and long-labels cases are the evidence either way.

## STAGE 3 — Geometry 2D front-end
Branch off 1c (can land after Stage 2). Spec §3, §4, §5, §7.
Delivers: constructions → solved figure → drawables; angle arcs built from `PointOnRay` on the arms
(signed sweep, α+δ/2 bisector, e·r measure); square right-angle (|δ|≈90°); length labels with units;
all labels via the Stage-1b pill system (uniform-gap, candidate placement); grid hideable; polygons of
n sides through ONE renderer (triangle/square/rect/pentagon/hexagon/quad).
ACCEPTANCE (proven in prototype — must reproduce): arcs seat on arms across right/scalene/obtuse; square
right-angle; measures are computed values on the bisector; every pill ≥ GAP clear of arms/vertices/
pills; matches the APPROVED geometry visual target; the same n-gon code renders square→pentagon→quad;
ADDITIVE clean; validate green.
FIXTURE (required, same PR): `tests/visual/lessons/figure-geometry-baseline.json` covering triangle with
one angle arc · multiple arcs · right-angle marker · quadrilateral · irregular n-gon · vertex labels ·
side labels · crowded labels · long labels · resized figure · the focused/expanded state. Stages 1a–2b
shipped with NO committed fixture and their rendered output could not be reproduced afterwards — see
`tests/visual/README.md`. A stage that adds a rendered surface adds its fixture.

## STAGE 4 — Block wiring (plug engines into the containers)
Branch off the merged front-ends. Spec §8.
Delivers: register `graph` and `geometry` as figure block/part types that render via the engine inside
the EXISTING containers (exercise grid cell, standalone figure, beside-text); the declarative figure
JSON is authorable block content; wire the grid-cell ⤢ Expand to Stage 2b; a figure part in the
exercise set opens the SAME solution modal. ZERO changes to the frozen container runtime — this is
registration + intake only.
ACCEPTANCE: a lesson JSON with a graph part and a geometry part renders in ScholarMath; Expand works
from a grid cell; a geometry/graph part opens the solution modal; ADDITIVE clean; legacy byte-identical.

## STAGE 5 — Solution/worked-example typesetting (the pending fixes, unified)
Branch off Stage 4. Reuses the annotated-two-column design locked in chat.
Delivers, EVERYWHERE working steps appear (exposition worked example AND the self-check/exercise
solution modal): real typeset maths (TPMath→MathML), NOT monospace; steps aligned on `=`; the annotated
TWO-COLUMN "Working | Why" layout (per-step reason bound to its step, not a separated legend); distinct
titled accent container (tinted header + ✎ + title); the Option-B accent-OUTLINE answer box (no fill,
must NOT echo the header band); three-way self-mark (Not yet / Partly / Got it). Token-only; the same
treatment in both places so demonstrations and revealed solutions look identical.
ACCEPTANCE: no monospace maths remains in worked examples or solution modals; working+why bound
per-row; answer is the outlined box; identical treatment in exposition and modal; contrast AA;
ADDITIVE clean; validate green.
CARRIED IN FROM THE UI-0 AUDIT (observed, deliberately NOT fixed early): on one composable page the
self-check solution modal renders its STEPS in monospace while the ANSWER beside them is typeset and the
chalkboard `workedExample` above them is typeset again — three treatments of the same mathematical
content on one screen. Stage 5's single typesetting system must cover all three; do not restyle the
interim treatment before then. (The related `fragWorkedExample` title leak — a `title` escaped with
`esc()` instead of `tpRichMath()`, so `$…$` reached the heading raw — was a rendering bug, not a
typesetting decision, and was fixed separately.)

---

## Deferred (real, later; not in this sequence)
Isometric 3D geometry; rotatable 3D field (shared capability, via Rotate); sketch-answer rendering
(author-provided format); discrete graph/geometry input (pick points, enter values, fill tables);
curved-shape labels (circumference/arc-length anchors); robust interior-side test for concave/reversed
polygons; course shell (section→lesson sidebar).

## Verification standard (every stage, before merge)
Frozen-function byte-identity; token-only/no theme forks; reuse-not-rewrite; contrast AA; self-contained
(no CDN); the stage's named acceptance checks; matches the approved visual target where one exists.
