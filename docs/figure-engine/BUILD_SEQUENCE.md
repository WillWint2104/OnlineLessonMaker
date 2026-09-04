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

## STAGE 2c — label-placement quality (DONE)
Raised at the UI-1 visual review: the crowded fixture showed identifiers (I, K, L) sitting visibly far from
their points, because §3.2's "clear every arm by >= GAP" search pushed a pill until it satisfied the
constraint with nothing pulling it back toward its owner. It PREDATED UI-1 and was deliberately not folded
into that visual correction — it belongs to the Stage-1b placement system, not the shell. Taken as its own
stage before Geometry so Stage 3 inherits a placement system worth inheriting.

Two changes, both inside the shared placement algorithm; no Figure Shell change, no graph-rendering change,
no geometry:
1. **Rank the legal candidates by displacement from the owner** (ENGINE_SPEC §1.4). Clearance stays a hard
   gate; this only decides which satisfying position is used. `K` 57.5px → 20.5px, `V` 44.2px → 31.5px,
   `I` 31.4px → 20.5px; worst displacement on the crowded plane 57.5px → 32.2px.
2. **The printed axis numbering is an obstacle**, not just the axis lines. Ranking alone makes tick
   collisions worse (the nearest legal position is often the one against an axis): worst gap to a tick label
   on the crowded plane went 3.0px → 1.3px with ranking alone, and to 15.4px with this. `V` at the origin —
   the vertex case actually raised at the review — went 22.7px → 2.1px → 20.1px.

Fixtures: `tests/visual/lessons/figure-labels-baseline.json` (isolated · on the axes and tick values · on
curves and chords · at the viewport edges · long identifiers) plus the existing crowded plane. Asserted by
`scripts/verify-label-placement.mjs` as a property — the placed displacement must equal the minimum over all
candidates that clear, re-derived by an unpruned reference search — not against tuned numbers. Contract 7 in
`tests/visual/README.md`.

NOT changed, and deliberately: `figScanPill`, the exhaustive fallback that runs when the directional search
finds nothing legal, is not displacement-ranked. It is the structural last resort behind the escalation
guarantee, and it does not fire on any fixture — the harness asserts that, so if a future figure starts
using it that shows up as a failure rather than as a silently unranked label.

**The geometry half — DISCHARGED at Stage 4.** The debt was real: `verify-geometry-semantics` asserts
REGION LEGALITY (Stage 3c), which is not this stage's property, and `verify-label-placement`'s fixture
list was three GRAPH files, so no geometry figure had ever been asserted for nearest-legal placement.
Stage 4 closed it, because container-aware sizing feeds geometry a different box and moves the whole
candidate space with the host.

`verify-label-placement` now independently verifies geometry nearest-legal placement across the
reference box, an intermediate box and the narrow Stage 4 box — 15 figures × 3 boxes, 537 annotations
(532 directional / 5 scan / 0 unplaced), with the region predicates, the clearance maths and the
candidate enumeration all re-derived rather than borrowed (`figPlacePill`, `figScanPill`,
`figGeomPlace`, `figClear`, `figBoxSeg` and `figDirs` are never called). Proven non-vacuous by pushing
every directional placement 9px off its anchor: 69 geometry assertions fail, each naming the drift.

**What this does NOT claim.** It does not mean every geometry annotation is semantically placeable at
any width. Below a density-dependent host width there is no legal candidate inside the Stage 3c
region at all, and the engine takes its documented relaxation path and reports the weakened
association — correct as an emergency fallback, and deliberately outside the designed range. That is a
separate constraint, now carried by the **geometry minimum stage width** (`FIG_MIN_STAGE.geometry = 420`
logical px, measured — the usable `.tp-fig-stage` width, not the block's outer width) and asserted by
contract 10, not by this gate.

## STAGE 3 — Geometry 2D front-end (DONE)
Delivered as `figGeometry` / `figGeomBody`, dispatched from `fragFigure` on `b.figure==='geometry'`. It renders
into the UI-1 shared Figure Shell, opens in the same focused workspace on the same rail, and places every label
through the Stage-2c pill system — there is no geometry-specific shell, toolbar or placement rule.

Two seams needed correcting for geometry rather than new machinery, both found by measuring rather than by
reading the code:
* **`figxRegister` now records geometry's TIGHT bounds** (`M.dom0`), not the solved inline view. `figView('equal')`
  expands whichever axis is short for the box it is given, so registering an already-expanded landscape domain
  and expanding it again for a portrait viewport compounded the padding twice — the crowded pentagon fell to
  58% of stage width and 43% of its height. Starting from tight bounds lets each viewport expand once.
  SUPERSEDED BY STAGE 3b for the metric, not the mechanism: this recorded "87–94% of the stage", which
  measured the SVG ELEMENT — always 100%×100% of whatever stage it is given, so it proved nothing. Geometry
  now fits a BOARD to the figure and the painted ink fills **85–89% of that board** at all three viewports.
* **The grid default is inverted for geometry** (hidden unless `grid:"shown"`) in `figxRegister` as well as in
  the model, because reading it the graph's way made the grid vanish inline and reappear on ⤢.

`aspect` is forced to `equal`: a stretched axis turns a right angle into something that is not one.

Branch off 1c (can land after Stage 2). Spec §3, §4, §5, §7.
Delivers: constructions → solved figure → drawables; angle arcs built from `PointOnRay` on the arms
(signed sweep, α+δ/2 bisector, e·r measure); square right-angle (|δ|≈90°); length labels with units;
all labels via the Stage-1b pill system (uniform-gap, candidate placement); grid hideable; polygons of
n sides through ONE renderer (triangle/square/rect/pentagon/hexagon/quad).
ACCEPTANCE (proven in prototype — must reproduce): arcs seat on arms across right/scalene/obtuse; square
right-angle; measures are computed values on the bisector; every pill ≥ GAP clear of arms/vertices/
pills; matches the APPROVED geometry visual target; the same n-gon code renders square→pentagon→quad;
ADDITIVE clean; validate green.
FIXTURE (required, same PR): `tests/visual/lessons/figure-geometry-baseline.json` — committed, 15 figures
across 11 pages, covering triangle with one angle arc · multiple arcs · stacked arcs on a ~6px arm (correctness
stress) and on a ~44px arm (visual quality) · right-angle marker (including a
NON-AXIS-ALIGNED one) · quadrilateral · irregular n-gon · vertex labels · side labels · crowded labels · long
labels · labels at the viewport edge · a parameterised construction · the author-error state, plus the
focused/expanded state at desktop and portrait. Stages 1a–2b
shipped with NO committed fixture and their rendered output could not be reproduced afterwards — see
`tests/visual/README.md`. A stage that adds a rendered surface adds its fixture.

## STAGE 3b — Geometry visual language  ·  DONE
Not a renderer change: the engine's semantic output was correct and read as raw engine output. Adds the
LAYOUT GRAMMAR between the geometry and the collision search — annotation ROLES (vertex > symbolic >
measurement, marks lighter than the edges they annotate), the preferred anchors those roles imply (angle
measure on its own arc's bisector one gap outside the OUTERMOST arc; side measure at the midpoint on the
normal that leaves the outline, by ray cast so either winding and a concave outline both work), and ONE
numeric style for every measurement. Stage 2c still resolves every collision from those anchors — the
pipeline is semantic object → preferred anchor → obstacles → nearest legal position → role styling, so a
JSON-authored diagram never needs hand-tuning.
Also splits the FITTING POLICY: graph focus maximises the PLANE (it is the subject), geometry focus
maximises the FIGURE — a board shaped like the figure's own domain, centred in the workspace, because
under `aspect:'equal'` a stage stretched to the viewport can only add blank board (the drawn figure had
reached 38% of stage height at 390×844). Nothing is scaled non-uniformly.
ACCEPTANCE: role hierarchy legible in the crowded pentagon; each measure adjacent to its own arc; side
measures outside the outline; both short-arm fixtures present and asserting different things; painted ink
85–89% of the board at all three viewports, measured against the BOARD and never the SVG element.

## STAGE 3c — Semantic placement constraints  ·  DONE
Stage 3b gave the annotations roles and preferred anchors; visual review showed the preferences being
discarded by the collision search in favour of a clear position on the wrong side of the geometry — angle
measures outside their own wedge, a side length inside the polygon, a vertex name inside the shape it
names. The missing layer is the ALLOWED REGION: per role, the set of positions that still MEAN the right
thing. Stage 2c keeps ranking; it now ranks only within that set.
`semantic role → preferred anchor → allowed region → clearance search → nearest legal → styling`
Also: the exhaustive fallback now ranks by distance from the anchor rather than raster order (constraining
regions makes it fire much more often); the shell takes its interaction copy from the figure TYPE, so
geometry no longer says "hover the plot"; the geometry board flows after the toolbar instead of being
centred in a full-height stage; the fill rule is stated (unfilled unless authored).
ACCEPTANCE: `scripts/verify-geometry-semantics.mjs` — every angle label inside its wedge and its polygon,
every side label in its edge's exterior half-plane, every vertex label outside its polygon, across two box
sizes. The checker re-derives each predicate from raw coordinates rather than calling the engine's own
helpers, because this stage twice shipped a check that restated the implementation instead of testing it.
FIXTURES: a reversed-winding pair — the same quadrilateral listed both ways must place all 10 labels
identically, so "outside" is a property of the shape and not of the author's typing order; and a concave
dart, because contract 8 asserted the reflex-vertex error against no fixture at all until now.

## STAGE 3d — Measurement annotation surface  ·  DONE (own PR, after Stage 3)

A side MEASUREMENT is painted on a quiet accent-tinted surface; an angle measure and a vertex name are not.
The split is semantic: angles belong to the interior construction, lengths to an exterior measurement layer.
Value + unit are ONE annotation — one anchor, one collision box, sized from the complete formatted string
before any placement search runs. The chip's rect IS the box Stage 2c reserved and cleared, so there is no
second geometry to keep in sync.

Two questions, kept separate: SEMANTICS decide the surface, CONTENT decides the face.

    author's semantic role  ->  fallback classifier (only if unspecified)  ->  presentation

`label:"measure"` / `label:"name"` always wins. The classifier is a back-compat convenience and cannot be
authoritative — `AB`, `a`, `r`, `2x` and `PQ` each denote a name or a quantity depending only on authorial
intent, which no string carries. Three presentation roles, one placement system: measurement → surface;
symbolic name (`a`, `c`, `AB`, `θ`) → maths face, no surface; prose name (`hypotenuse`, `radius`) → upright
body text, no surface, because a word is not a variable. Empty text, and a value-and-unit written as one
string, are reported with the fix named.

Gated by `scripts/verify-measure-surface.mjs` + `tests/visual/lessons/figure-measure-surface.json`
(contract 9): 6 slides; the two themes that declare the `mathematics` capability get the full design
contract (191 assertions) and the other six a safety contract only (180) — surface assignment, the three
presentation roles, containment, a proportional padding band, composited-colour contrast. Proven non-vacuous by re-introducing
each fixed defect and watching it fail, including the two that matter most: rendering prose names in the
maths face, and letting the classifier outrank explicit author intent.

Deferred out of this stage, deliberately:
- **Per-face text metrics.** `FIG_GLYPH` is calibrated for one face; packs redefine both body and serif faces.
  Numeric content lands inside a 0.5–1.75× padding band everywhere; symbolic content is sized conservatively
  and therefore over-reserves on a narrow face (worst measured: `3x + 2y + 15` at 21.0px/side in mathematics).
  The gate records every such chip rather than failing or hiding it.
- **The Layer B gap.** `--primary`/`--on-surface` are declared by five packs; rome, wellbeing and ww1 have no
  Layer B block, so the geometry figure's own strokes and label inks fall back to black there. PRE-EXISTING —
  the chip tokens now degrade through Layer A, but the engine-wide fix is its own change, and it lands before
  the WW1 design pass puts a figure on a WW1 slide.

## STAGE 4 — Block wiring (the engines through the containers that exist)
Branch off the merged front-ends. Spec §8.

**Narrowed, deliberately.** The original text delivered "the EXISTING containers (exercise grid cell,
standalone figure, beside-text)" on the strength of §8's claim that those containers were done. The
exercise grid cell does not exist, and the two-column solution container it would carry is engine
Stage 5's deliverable — so the original scope pulled Blocks Stage C and Stage 5 into Stage 4, and
`fragSelfCheck` / `fragPracticeSet` are frozen, which forecloses the cheap route. §8 now records what
actually exists.

Delivers:
- `graph` and `geometry` as genuinely **authorable** figure block content — a geometry figure is
  creatable from the block palette without hand-editing JSON, which it is not today.
- **Standalone**, **contained** and **beside-text** figure placement, reusing the `image` placement
  vocabulary (Blocks Stage B). `pair` only if the generic machinery gives it away free.
- **Container-aware sizing**: the figure box is re-solved from the measured host before labels are
  placed, so annotation size is a design quantity rather than a function of container width.
- **Expand** correct from nested and narrow hosts.
- Non-blocking **capability guidance** on the figure-authoring path (§3.4, `themeSupports()`).

MOVED to Blocks Stage C, where the container it needs is built: Expand from an exercise-grid cell · a
figure part in an exercise set · a figure part opening the shared solution modal. ONE solution
treatment — never a Stage-4 version replaced by a Stage-5 one.

FROZEN, unmodified: `fragSelfCheck`, `fragPracticeSet`, `renderPackSlide`, `renderFragment`,
`wirePack`, `resolveInteractions`. `graphQuestion` is untouched (§8.1).

**Why container-aware sizing is the load-bearing part.** `#canvas` is a fixed 1280 logical px surface
that is `transform:scale()`'d to the viewport, so a figure's on-screen shrink on a phone is the canvas
zooming out — body copy shrinks with it, and the annotation-to-body ratio is a constant 1.48× at every
viewport. That is not a figure defect. The figure defect is that the SVG is a fixed `520×360` viewBox
painted at `width:100%`, which makes annotation size a function of HOST WIDTH: measured in logical
canvas px, the same measurement label is 23.5px in a full-width pane (1.42× the 16.5px body copy) and
5.2px in a 260px host. Stage 4 adds narrow hosts, so this must be fixed first, in logical px.
`figxBoxFor` already re-solves this way for the focused workspace; the inline path reuses that shape.

ACCEPTANCE: a lesson JSON with a graph figure and a geometry figure renders in ScholarMath at every
placement; a geometry figure is authorable from the palette; every annotation resolves at 11–15
logical px (hard floor 11, primary values normally 12–15) in every supported host; narrow layouts
promote or stack rather than shrinking below the floor; Expand works from a nested host and restores
focus; resize is a deterministic re-solve; Stage 2c/3c/3d gates unmoved; ADDITIVE clean; legacy
byte-identical.

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
