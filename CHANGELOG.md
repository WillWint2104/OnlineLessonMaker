# Changelog

All notable changes to **Lesson Studio** are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); add a line for every PR so
"what changed and was it checked" stays visible (see `docs/CHANGELOG` note in
`docs/CHECKING.md` §Cadence).

## [Unreleased]

### Added
- **Approved learning-card mockups (`docs/mockups/`).** Six individual design references for the
  instructional / companion learning-card family, plus the reproducible sources that built them. They are
  rendered rather than drawn: the palette and the `EB Garamond` faces are copied out of `lesson-studio.html`,
  and the figures in the two paired mockups are the shipped engine's own output, extracted from a live render
  at a stage width of 532 logical px — the true width of a `beside` column at `--tp-measure: 1140`. The
  triangle's angles and side labels are what `figGeometry` computed, not values typed into a mockup, so a
  mockup cannot drift from the engine without the engine changing first. `README.md` records the six locked
  style rules the images fix. Design evidence only: no application code changes, and the `mk-*` classes in
  `src/kit.css` are mockup scaffolding, not app classes.

- **Stage 3d — the side-measurement surface.** A side measurement is now painted on a quiet accent-tinted
  surface; an angle measure and a vertex name are not. The rule is semantic, not cosmetic: the surface asserts
  *"this is how long this side is"*, so angles keep their plain typography inside the interior construction and
  lengths get an exterior measurement layer. Value and unit are ONE annotation — one anchor, one collision box,
  sized from the complete formatted string before any placement search runs, never text first and chrome after.
  The box a chip paints IS the box Stage 2c reserved and cleared, so there is no second geometry to keep in sync.
  **Two questions, kept separate:** semantics decide the surface, content decides the face — which is why
  `x + 4`, `2r`, `3.4 km` and `√2` behave correctly *because they are measurements*, not because a pattern
  recognised their characters. `label:"measure"` / `label:"name"` is the source of truth and always wins; the
  content classifier is a back-compat convenience only, and cannot be authoritative, since `AB`, `a`, `r`, `2x`
  and `PQ` each denote a name or a quantity depending solely on authorial intent. **Three presentation roles**
  share one placement system: measurement → surface (numerals upright, algebra in the maths face); symbolic
  name (`a`, `c`, `AB`, `θ`) → maths face, no surface; prose name (`hypotenuse`, `radius`) → upright body text,
  no surface, because a word is not a variable and italicising `hypotenuse` reads as a product of eight
  letters. An empty label and a value-and-unit written as one string are reported, with the fix named.
  The unit is subordinate to its value — 85% of its size, and the quietest ink that still clears WCAG AA in
  every pack (measured: 5.01:1 worst case, in scholarmath; .82 also passes at 4.68:1 but 0.18 above the floor
  is not a margin) — while remaining inside the same annotation and the same collision box.
  §3.3 of `ENGINE_SPEC.md` records the resolution order as an invariant.
  The measurement value is separated from the geometry stroke by LUMINANCE, not by more colour: the accent is
  pulled 45% (was 72%) toward the page's darkest ink, so the value lands a deep forest/charcoal green ~16-18 L*
  BELOW the stroke it annotates while its saturation *drops* (73% → 63% in scholarmath) — the opposite of
  intensifying the fill, which would make the chip read as a control. Surface 4.5% → 6% and border 6% → 10%,
  both still subtle. Measured across the five Layer-B packs: value-vs-stroke ΔL* 6.4 (imperium, whose accent is
  already dark) to 18.5 (scholarmath); value contrast 9.8-13.4:1; unit 6.4-8.9:1.
- **`scripts/verify-measure-surface.mjs` + the `measure-surface` workflow — the gate none of the existing checks
  provided.** The chip shipped with three defects that every check called green: `verify-corpus-identity`'s
  `isLesson` regex structurally excludes `tests/visual/lessons/`, so it never renders a figure fixture at all;
  `verify-label-placement`'s fixtures contain no geometry; and `verify-geometry-semantics` asserts where a
  label's CENTRE sits, which a chip whose text overflows its own rect satisfies perfectly. The new gate renders
  the surface in all 8 packs and asserts surface assignment, the three presentation roles, containment, a
  proportional padding band and composited-colour contrast — 191 design + 180 safety assertions. Non-vacuity
  is proven, not assumed: every fixed defect was re-introduced and the gate failed, including prose names set
  in the maths face, the classifier outranking explicit author intent, an EXPECT entry the fixture no longer
  renders, and the value/unit text mismatch that had been silently skipping assertions. It is not wired as a required check: branch protection is a
  maintainer decision.

- **Stage 3c — Semantic placement constraints.** Stage 3b gave each annotation a role and a preferred anchor;
  visual review showed the preference being discarded by the collision search whenever a clear position
  existed on the semantically wrong side of the geometry — angle measures outside their own wedge (`46.9°`,
  `56.9°`, `59.2°`), a side length inside the polygon it measures, a vertex name inside the shape it names.
  The missing layer is the **allowed region**: per role, the set of positions that still MEAN the right thing.
  `semantic role → preferred anchor → allowed region → clearance search → nearest legal → styling`. An angle
  measure (and a symbolic name for the same angle) must stay inside the swept wedge and, for an interior
  angle, inside the polygon; a side measure must stay in the exterior half-plane of its own edge, free to
  slide along it but never to cross it; a vertex name must stay outside its polygon. The region is not a
  preference the ranking can outvote — an illegal candidate is excluded before clearance is measured, and
  excluded from the fallback too. **Stage 2c is unchanged in what it does**: it still ranks by displacement
  and takes the nearest legal position, but now only among positions that mean the right thing. The graph
  supplies no regions and is byte-identical. Exhausting a region is **reported, never silently escaped**: the
  figure expands up to 8 times, and only then relaxes the region and names the label whose association it had
  to weaken — a measure drawn outside its own angle without saying so is worse than a missing one, because
  nothing in the picture reveals it.
- **`scripts/verify-geometry-semantics.mjs`** — asserts semantic legality rather than clearance: angle-label
  centre inside its wedge and its polygon, side-label centre in its edge's exterior half-plane, vertex-label
  centre outside its polygon, across two box sizes. It **re-derives every predicate from the raw painted
  coordinates** and never calls the engine's own `figGeomInside`/`figGeomInSector`, because this stage twice
  shipped a check that restated the implementation instead of testing the requirement (a radius against the
  engine's own clamp; a fill against the SVG element). Proven to fail when the constraint is removed:
  disabling the angle region reports **11 violations**, including the three visible by eye and three that
  were not (`angle of elevation`, `48.2°`, `58.4°`). Fixture: a **reversed-winding pair** — the same
  quadrilateral listed A,B,C,D and D,C,B,A — places all **10 labels at identical coordinates**, so "outside"
  is a property of the shape rather than of the authoring order. A **concave dart** was added alongside it:
  contract 8 has said "assert the sum on convex fixtures and the *error* on a concave one" since Stage 3,
  and there was no concave fixture, so half that contract was asserted against nothing. The dart's reflex
  vertex is reported and left unmeasured while its other three angles measure normally.

- **Stage 3b — Geometry visual language.** Visual review of Stage 3 found the renderer technically right and
  reading as raw engine output: vertex names, side lengths, angle measures and symbolic labels all competed at
  the same visual weight, so nothing told the eye what was structural and what was explanatory. This adds the
  **layout grammar** that was missing between the geometry and the collision search — it does not touch the
  renderer or the placement engine. Three **annotation roles** (vertex > symbolic > measurement) as semantic
  classes on the existing tokens, never per-fixture styling, with the pill the search reserves sized from the
  role so box and ink stay in step. Marks are subordinate to what they annotate: arcs and right-angle squares
  now paint a step lighter than the polygon edges. **Angle measures are anchored to their own arc** — on the
  swept bisector one `FIG_GAP` outside the OUTERMOST arc, so arc and number read as one annotation; the anchor
  was a MULTIPLE of the radius (`1.62r`), which pushed the number deep into the polygon on a wide angle and
  left a student matching numbers to corners by eye. **Side measures** keep midpoint + outward normal, but
  "outward" is now decided by an even-odd ray cast against the outline itself, so it holds for either winding
  and for a concave polygon, where the centroid test picks the wrong side. One **numeric style** for every
  measurement: precision follows magnitude, trailing zeros are dropped, and `°` is set with its number, so a
  right angle reads `90°` and a side reads `2.39` rather than the coordinate serialiser's `2.385`. The
  pipeline is unchanged in shape — semantic object → preferred anchor → obstacles → Stage 2c nearest legal
  position → role styling — which is what lets a JSON-authored diagram come out right without hand-tuning.
  **Geometry focus now fits the FIGURE where graph focus fits the PLANE.** A coordinate plane is itself the
  subject and should take the whole workspace; a polygon is not, and under `aspect:"equal"` a stage stretched
  to the viewport can only wrap it in blank board. Geometry gets a drawing board shaped like its own domain,
  sized to whichever workspace dimension binds and centred in what is left; the domain margin that the
  annotations live in drops from 0.18 to 0.11 per side (the escalation loop still buys more room on a figure
  that needs it). Nothing is scaled non-uniformly. **Fixtures:** the ~6px sliver is reclassified as a
  CORRECTNESS stress case — it proves the arcs stay attached and distinct, and is deliberately far too small
  to read — and a second **~44px short arm** is added as the VISUAL QUALITY case, where three stacked arcs
  (radii 11.1 / 16.6 / 22.1) are actually distinguishable to a human. Both contracts now exist and are
  recorded separately in `tests/visual/README.md` contract 8. `ENGINE_SPEC.md` §3.2's **vertex** anchor also
  still prescribed `−normalize(u+w)` with a "degenerate near 180° → use edge perpendicular" escape, which the
  implementation has never used: that vector collapses toward zero as a vertex straightens, so it is
  progressively unreliable approaching 180°, not merely degenerate at it. §3.2 now documents the swept-bisector
  derivation the code actually uses — the same class of correction §3.2's candidate ordering needed in Stage 3.

  **Known limitation, not introduced here:** `figPillSize` estimates text width as `chars × 0.62 × fontSize`,
  a MEAN character width, so a string of wide capitals reserves less than it paints — `"MMMM"` paints 47.9
  against a 42.2 box. The graph identifier class spills identically (46.1 vs 41.0), so this is a property of
  the shared estimator rather than of the geometry roles; Stage 3b moves the vertex case from 5.1px to 5.7px
  by going 12.5/600 → 13/700. It does not manifest anywhere in the committed fixtures — every label's ink sits
  INSIDE its own collision box (worst spill 0.0px across 75 labels) because `FIG_PADX` absorbs the shortfall —
  but the shortfall grows with string length while the padding is constant, so a long wide-glyph identifier
  would eventually escape its box and the ≥ `FIG_GAP` guarantee with it. Fixing it means changing the
  estimator the GRAPH path shares, which is outside a visual-language pass; recorded here for the maintainer.

### Added
- **Capability profiles — the application is multi-domain; a theme is not.** The app has universal domain
  capability; an individual theme declares which capability FAMILIES it presents. A block declares what it
  needs, a theme declares what it hosts, and conflating those axes is what let Imperium — a Roman-history
  theme — be the limiting case for the colour of a mathematics measurement annotation. `CAP_FAMILY`,
  `THEME_CAPS`, `BLOCK_CAP` and `themeSupports()` sit beside `PACK_THEMES`; ENGINE_SPEC §3.4 states the rule.
  `THEME_CAPS` is the AUTHORITATIVE declaration and is not coupled to implementation: theme architecture
  (Layer A / Layer B / whatever comes next) and theme capability coverage are independent axes that merely
  overlap today and must be free to diverge, so callers ask `themeSupports()` and never infer support from
  `PACK_THEMES` or from Layer B's presence. Families are coarse on purpose and not a ceiling — sub-capabilities
  (`quantitative.graph`, `mathematics.geometry`, `science.chemistry`, `humanities.timeline`) can be added
  later, and `BLOCK_CAP` names what a block kind *currently* needs rather than asserting one domain forever.
  Geometry is a `mathematics` capability and exactly two themes declare it (`mathematics`, `scholarmath`);
  `quantitative` is declared far more widely, because graphs and ratios belong in geography and history too.
  This is an authoring/design contract, NOT a runtime permission — nothing gates rendering, and an undeclared
  pairing still degrades safely through the Layer A fallbacks. The verification matrix now distinguishes the
  two claims it had been conflating: a DESIGNED pairing gets the full visual/contrast/accessibility contract,
  an undeclared one gets a small safety contract (renders, draws geometry, no empty or invisible chip, the
  surface has a fill) and no design judgement. 191 design + 180 safety assertions, and the safety half is
  proven non-vacuous by removing the Layer A fallback chain and watching rome fail.

### Fixed
- **The measurement surface was invisible in three packs.** `--primary` and `--on-surface` are Layer B slots
  declared by five packs; `rome`, `wellbeing` and `ww1` have no Layer B block, so those names are undefined
  there — which invalidates the whole `color-mix()` and left the chip with no fill and pure-black text in ww1.
  The tokens now degrade through the Layer A equivalents those packs do define. Note the wider gap this
  exposed, which is PRE-EXISTING and not closed here: the geometry figure's own strokes and label inks read
  `--primary` too, and fall back to black in the same three packs.
- **ENGINE_SPEC described the no-legal-candidate fallback as "max clearance".** It is not: the fallback
  scores `clear − 3 × off` — true geometric clearance against how far the box pushes past the 2px canvas
  inset — so a box with less clearance that stays on the canvas beats a clearer one hanging off it,
  deliberate since a label painted outside the viewBox is not visible at all. `figPlacePill`'s own header
  has said so since #149; §3.2 step 3 had not caught up, and §1.4's "clearance is never traded away" (true
  of the LEGAL candidates it ranks) read as covering the exhausted case too. The rewrite also fixes a
  sequencing error it introduced: the penalised box is reached only after the exhaustive on-canvas scan
  finds nothing (`figLayoutPills`), not straight after the directional search, and selection by strict
  improvement keeps the fallback as deterministic as the ranking above it. Documentation only — no
  behaviour change.
- **The exhaustive placement fallback returned the first clear cell in raster order.** Stage 2c made the
  directional search take the NEAREST legal candidate but left the fallback taking whatever a top-left-first
  sweep hit first, which stayed invisible while it fired rarely. Constraining regions makes it fire far more
  often, and then "first in raster order" put a side length in the corner of the canvas — legal, and 370px
  from the edge it measured. It now ranks by distance from the anchor when one is supplied; the graph
  supplies none and keeps first-found, so its placements are unchanged.
- **The focused shell spoke graph language in a geometry figure** — "Hover the plot to read coordinates". A
  geometry figure has no plot. The shell now takes its interaction copy from the figure TYPE (`FIGX_COPY`),
  so it reads "Move the pointer over the figure to read coordinates"; the capability is identical (§1.1
  inverse mapping), only the sentence differs, and it lives with the shell rather than in any lesson.
- **The geometry board was centred in a full-height stage**, leaving dead bands above and below it on a tall
  phone. It now flows after the toolbar (header → controls → board → hint). The stage keeps `flex:1 1 auto`
  because it is what the board is MEASURED from — letting it shrink to its own content makes the board an
  input to its own size and ratchets the figure smaller every render (measured: the phone board fell from
  336×291 to 242×210 before this was caught). Only the alignment changes; the board is never stretched.

- **The Stage 3 focused-fill figure was measured against the wrong thing.** #151 reported the painted figure
  at "87–94% in both dimensions"; that measured the SVG **element**, which is 100% × 100% of whatever stage it
  is given and therefore proves nothing. Measured against the painted ink, Stage 3 was **44% × 73%** at
  1440×900, **72% × 52%** at 834×1112 and **83% × 38%** at 390×844. This is the same failure mode as the arc
  harness earlier in the PR — asserting against the implementation's own proxy instead of the requirement —
  and it is now recorded in contract 8 as a rule: measure the ink against the board, never the element. With
  the Stage 3b board the ink reaches **85% × 84%**, **85% × 83%** and **93% × 89%**.

### Added
- **Stage 3 — Geometry 2D front-end.** Polygons of any *n* through **one** renderer, angle arcs seated on the
  actual arms, a right-angle square derived from the two incident rays, and vertex / side / angle labels placed
  by the **same Stage-2c pill system** the graph uses. It renders into the UI-1 shared Figure Shell and opens in
  the same focused workspace on the same rail: a geometry figure differs from a graph by its **content**, not by
  a second container, toolbar or placement rule. `fragFigure` dispatches on `b.figure` and everything else —
  shell, ⤢, errors, caption, Options — is shared. Solving reuses Stage 1c's construction DAG (`figConstruct`)
  unchanged, so `construction: "triangleSSS"` and friends work with authored points as one vocabulary; every
  mark is then derived in SCREEN space from the projected coordinates, so what is measured for placement is
  exactly what is drawn. Angles use §3.1's **signed sweep** (`δ = wrap(β−α)`, bisector `α + δ/2`, label at
  `e·r`) rather than `normalize(u+w)`, which the spec forbids for degenerating near 180°. `aspect` is forced to
  `equal` — a stretched axis turns a right angle into something that is not one. **Single source of truth (§4)
  holds:** `label:"measure"` and `text:"auto"` display what the engine computed; any other string is understood
  as a *name*, so a figure can never assert a length or angle its own coordinates contradict — and a
  `rightAngle` asserted on an angle that is not 90° is **reported and not drawn** rather than fabricated.
  Fixture: `tests/visual/lessons/figure-geometry-baseline.json`, **11 figures across 8 pages** (see
  `tests/visual/README.md` contract 8). Three review findings hardened it further (CodeRabbit): **stacked arcs
  collapsed onto one radius whenever the arm was shorter than the base radius** — each index was clamped
  independently, so a double or triple arc painted on top of itself, invisible in a fixture with generous arms;
  they now step *inward* from the clamped ceiling with the spacing shrinking to fit, and the baseline carries a
  sliver triangle that exercises it. A **degenerate arm** (zero-length ray) on an `angle` or `rightAngle` was
  dropped with no mark *and no message* — silence is the one outcome the engine never allows, so both now
  report. And a **reflex interior angle** under `angles:"all"` would have printed 360−θ as though it were the
  interior angle, because `figGeomAngle` returns the unsigned smaller sweep; it is now detected against the
  polygon's winding and **reported instead of measured**, since drawing the reflex sweep is deferred — a wrong
  label is worse than an absent one. A fourth finding closed the arc question properly: the radius floor
  (`Math.max(9, armMin*0.5)`) was **not bounded by the arm**, so any arm under 9px got a 9px arc drawn straight
  past both its ends — the mark detaching from the figure it annotates. **The floor is gone**: half the shorter
  arm is the single rule §3.1 already stated, so a small angle simply gets a small arc, and there is no second
  constant that can contradict it. This survived the first fix because the harness asserted each radius against `room`, the engine's *own* clamp,
  rather than against the arm the arc has to fit inside — it restated the assumption instead of testing it — and
  because the sliver triangle was sliver in data units, not on screen: its shortest arm projected to 32.4px,
  never reaching the floor. The fixture's arm is now ~6px, where the old code drew a radius **1.52× the arm**.
  **Checked:** all 11 solve with every label ≥ `FIG_GAP` clear of every
  edge, arc, mark, vertex and other label (worst 6.0 against a gap of 6), none off-canvas, none falling through
  to the exhaustive fallback, 0 console errors; stacked-arc radii distinct, ordered and **strictly inside the
  arm** across **33/33** arm×count combinations from 4px to 120px (9 of which drew past the arm before the fix),
  and **13/13** arc groups in the fixture itself (worst radius/arm 0.50, i.e. exactly the stated ½); the quadrilateral, pentagon and
  SSS triangle interior angles sum to (n−2)·180°; the error fixture reports **four** distinct faults, including
  impossible construction givens and the zero-length arm; every figure byte-identical across three solves;
  legacy corpus **250/250 byte-identical** via the committed `verify-corpus-identity.mjs`; graph placement
  **785/785**; six frozen functions byte-identical.

- **`scripts/verify-corpus-identity.mjs` — the recurring "250/250 byte-identical" claim becomes a committed,
  reproducible check.** #146, #147 and #149 each asserted that no committed lesson changed, and each proved it
  with a throwaway script nobody else could re-run — the exact gap the preamble of `tests/visual/README.md`
  exists to close, and the one CodeRabbit raised against the Stage 2c harness. The script renders **every**
  lesson in `examples/` and `lessons/`, re-skinned to all five pack themes, slide by slide through the app's own
  `render()`, and compares `#slide.innerHTML` byte for byte against another git ref (default `origin/main`).
  Every non-local request is aborted in both pages, so a render is a pure function of the engine and the lesson
  JSON — the corpus' remote video posters otherwise made 1–4 units differ per run purely on timing. **Each side
  renders its own revision's lesson JSON**, and the lesson list is unioned across the two revisions: reading the
  working tree's lesson files for both would render the new data twice and report a genuine content edit as
  *identical*, and a lesson added or deleted on one side would never be compared (raised by CodeRabbit). A
  mismatch names the exact **lesson / theme / slide** and exits **1**. Render time is printed for orientation and
  **never fails the run**: a wall-clock number off one shared runner is not a benchmark, and asserting on it
  would only make the check flaky — that needs a real methodology first. Not wired into CI, deliberately: it
  needs Playwright + Chromium, which only the informational `screenshots` workflow installs, and changing what
  gates merge is a maintainer decision. **Checked:** reproduces **250/250** against `origin/main` at
  `66779fc`; and, because a verifier that only ever passes is worthless, four deliberate perturbations were
  injected and reverted: a global engine change caught **250/250** differing; a single-theme one caught exactly
  **50/250**, every reported unit `theme=scholarmath`; a one-word edit to a **lesson title** caught **4/250**,
  all slide 0 of that lesson (not five — `scholarmath` renders a legacy `title` slide as a 361-char stub that
  omits the title, verified directly); and an **added lesson file** caught 5 new units as *absent in reference*
  and named the file. The reported character delta matched the injected string's length each time.
  `npm run corpus-identity`; documented in `docs/CHECKING.md`.

### Fixed
- **A geometry figure lost most of its focused viewport, and its grid changed between inline and expanded.**
  Two seams that were right for graphs and wrong for geometry, both found by measuring rather than reading.
  **(1)** `figxRegister` recorded the *solved inline view* as the focus domain. `figView('equal')` expands
  whichever axis is short for the box it is given, so registering an already-expanded landscape domain and then
  expanding it again for a portrait viewport compounded the padding twice: the crowded pentagon fell to **58%
  of the stage width and 43% of its height** — precisely the dead drawing space UI-1's contract 5 exists to
  prevent. Geometry now registers its **tight** bounds (`M.dom0`) so each viewport expands once, for itself;
  the painted figure fills **87–94% of the stage in both dimensions** at 1440×900, 834×1112 and 390×844, with
  the SVG exactly matching the stage (no letterboxing). A graph's domain is authored *data*, so it still
  registers the solved view. **(2)** The grid default is inverted for geometry — a construction is not a
  coordinate reading — but `figxRegister` read it the graph's way, so the grid vanished inline and reappeared
  on ⤢. **Checked:** 0 grid lines inline *and* focused for a geometry figure authoring no `grid`.
- **`ENGINE_SPEC.md` §3.2 still told the next stage to take the FIRST clear label position.** Stage 2c replaced
  that with the nearest legal one in §1.4, but §3.2 — the section a geometry implementer reads — was left
  saying "Take the FIRST fully-clear candidate". Corrected, with a pointer to §1.4; left as it was, Stage 3
  would have inherited exactly the defect Stage 2c removed.

- **The `screenshots` CI job has been green with NO artifact since #89 (2026‑07‑03) — `shots.mjs` was rendering
  an empty lesson and writing zero PNGs.** The harness screenshotted whatever the app shipped with, and the
  app's embedded `#lesson-data` has been `{"slides": []}` since #89: every theme logged "slide N is out of range
  (0 slides)", the run wrote nothing, `upload-artifact` skipped the empty directory with only a warning, and the
  job exited **0**. So for two months the PR template asked reviewers to "skim the screenshots artifact" and the
  `screenshots` check reported success while there was nothing attached — confirmed on the runs for #147 and
  #149, both `total_count: 0` artifacts. Three harness-only corrections, no application change: `shots.mjs` now
  **loads a real lesson** per theme (`examples/<theme>-sample.json`, falling back to the imperium sample;
  `LESSON=<path>` overrides); it **exits non-zero when it writes nothing**, so a silent no-op fails instead of
  passing; and it honours `CHROMIUM_PATH` for sandboxes that ship a prebuilt browser, matching the other two
  harnesses. Deliberately **not** changed: the `networkidle` wait — measured at ~1s offline, it was never the
  cause, and it is what lets web fonts and model-viewer settle so the CI artifact shows real type and 3D rather
  than fallbacks. For the same reason non-local assets are **not** blocked here, unlike in
  `verify-corpus-identity.mjs` where determinism is the point. **Checked:** **14 screenshots written** across
  `imperium` / `microhistory` / `geolearn` (0 before), each a fully rendered lesson slide; the zero-output guard
  fails the run when the harness is starved. `docs/CHECKING.md` Layer 2 corrected — it also listed a theme set
  (`neutral, egypt, rome, wellbeing, ww1`) that `shots.mjs` has not used.
- **Identifiers drifted away from the points they name; now a label sits at the NEAREST position that clears
  everything (figure engine, Stage 2c).** §1.4's candidate search enumerates (distance `d`) × (direction) ×
  (perpendicular *shift* along the edge) and returned the **first** position clearing every obstacle by
  `>= FIG_GAP`. Nothing pulled the label back toward its owner, and the shift dimension is not ordered by
  displacement — so a 56px shift at `d=6` was accepted ahead of an unshifted position at `d=14`, nearly three
  times further from its marker. On a saturated plane that is how association is lost, which is what the UI-1
  visual review reported for `I`, `K` and `L`. Clearance is untouched and remains a **hard gate**; the change
  only decides which of the positions already satisfying it is used. The ring index `d` is a true lower bound
  on displacement (the offset resolves to `u*(d + w/2 or h/2) + perp*s` with `u` and `perp` orthonormal, so the
  component along `u` is always `>= d` and the perpendicular shift can only add), so the search is a sound
  branch and bound: it stops a ring or two past the first hit instead of enumerating ~3000 positions, and a
  candidate that cannot win on displacement is skipped **before** the clearance test rather than after it.
  Placement stays deterministic — fixed enumeration order and strictly-nearer improvement only, so ties go to
  the more preferred direction. Second half: the **printed axis numbering** is now an obstacle, not just the
  axis *lines*. Ranking alone makes that worse, because the nearest legal position is very often the one
  tucked in against an axis. `figTickBoxes` reserves the labels the nice-tick chooser will actually paint at
  the density in effect (so changing **Tick density** in the focused workspace re-solves placement), emitted
  as boxes through `figClear`'s existing `boxes` channel rather than four edge arms each — ~12 tick labels
  would otherwise have added ~48 arms, past the `FIG_MAXARMS` ceiling `figPaintedArms` exists to respect.
  **Measured** on `tests/visual/lessons/figure-graph-baseline.json` at the inline 520×360 box, marker to
  label-box centre / gap to the nearest tick label:

  | | before | ranking only | shipped |
  |---|---|---|---|
  | `K` displacement | **57.5** | 20.5 | 32.2 |
  | `I` displacement | 31.4 | 20.5 | **20.5** |
  | `V` displacement | 44.2 | 23.5 | **31.5** |
  | crowded plane, worst displacement | **57.5** | 21.4 | **32.2** |
  | `V` gap to a tick label | 22.7 | **2.1** | **20.1** |
  | crowded plane, worst gap to a tick label | 3.0 | **1.3** | **15.4** |

  **Checked:** **785/785** assertions in the new `scripts/verify-label-placement.mjs` — an inline pass across
  `figure-labels-baseline.json` (isolated · on the axes and tick values · on curves and chords · at the
  viewport edges · long identifiers), `figure-graph-baseline.json` and the `figure` block in
  `composable-page-baseline.json` — every identifier clears every axis,
  curve, chord, marker, other identifier and printed tick label by `>= FIG_GAP` and is fully on canvas; its
  displacement **equals the minimum over all clearing candidates**, re-derived by an unpruned reference search
  rather than compared against a tuned number; repeated solves byte-identical; the unranked `figScanPill`
  fallback never fires — plus a focused-workspace pass over **4 viewports × all five `FIGX_TICKS` densities**,
  reading the identifiers back out of the painted SVG and building its reference obstacles from the live
  configuration (raised by CodeRabbit: the focused box is measured, not constant, so a collision can exist there
  and nowhere else). Legacy corpus **250/250** renders byte-identical, all 6 frozen functions
  byte-identical, `validate` green, 0 console errors. Solve cost for the four baseline figures: 9.1ms each
  before, 15.3ms after (85.1ms for the naive form that used edge arms and an unpruned search — the box channel
  and the displacement prune are what make the quality affordable).

- **`validate` now re-runs when a PR is retargeted, so a merge candidate can't rely on a check computed
  against a base branch it will never land on.** `validate` is the only required status check, but
  `.github/workflows/validate.yml` used a bare `pull_request:` trigger, whose default types are
  `[opened, synchronize, reopened]` — GitHub fires **`edited`** (with `changes.base`) on a retarget, and that
  was not listed. A stacked PR therefore kept the green check it earned against its parent branch after being
  moved onto `main`, and the result GitHub showed as gating the merge had never been computed for the
  combination being merged. **Observed on #147:** rebased and retargeted from the UI-0 branch onto `main`, it
  sat "clean" on checks belonging to the obsolete base until a real commit landed and fired `synchronize`.
  Now `types: [opened, synchronize, reopened, edited]`. `edited` also fires on title/body edits, so this
  re-runs more often than strictly necessary — deliberately, and documented in the workflow: guarding the job
  on `github.event.changes.base` would publish a **skipped** `validate` check run on every body edit, and
  branch protection counts a skipped required check as satisfied, so the guard would trade real evidence for a
  no-op. The job is a checkout plus `node scripts/validate.mjs` with no dependency install, so it is cheaper to
  always compute the answer. `screenshots.yml` is left alone: it is explicitly informational and non-gating,
  and it does install Chromium. **Checked:** workflow config only — no application, script or lesson file
  touched; YAML parses and the `on:`/`jobs:` shape is unchanged apart from the trigger list; `validate` green.
- **Focus rings restored on three keyboard-reachable controls (WCAG 2.4.7 AA).** `--focus-ring` is defined as a
  **colour** (`var(--primary)`), so `outline:var(--focus-ring, 2px solid var(--primary))` never fires its
  fallback: the shorthand receives a bare colour, sets `outline-color` only, and leaves `outline-style:none` —
  no ring at all. Because these rules out-specify the correct global `.tp-slide :focus-visible` (which does use
  the shorthand properly), they actively **removed** a ring that would otherwise have been painted. Affected:
  `.fkc-opt` (the knowledge-check answer buttons — the highest-traffic control of the three), `.tp-gq2-submit`
  and `.tp-int-revbtn`. All three now use `outline:3px solid var(--focus-ring)`, matching the form the rest of
  the file already gets right; the `:focus` half of each selector is left as authored (deliberate elsewhere in
  the file: "keyboard + programmatic + AT focus all get the ring"). **Checked:** each control rendered from its
  real renderer and focused — **`none/0px` on main → `solid/3px` on this branch**, all three, 0 console errors.
  CSS-value-only change (3 lines); 7 frozen fns + every figure-engine contract byte-identical; legacy corpus
  0 render diffs; validate green.
- **Focus overlays were positioned against the whole page, not the visible board — a solution modal opened
  from a scrolled block was cut off and its first step unreachable (UI-0 audit).** A composable page is much
  taller than the board and `#stage` is the scroll owner, so an overlay absolutely positioned against the
  full-height slide sits at a fixed point near the top of the *document*. The existing mitigation
  (`.tp-slide[data-tp-type="page"] .tp-fpanel{position:sticky;top:28px;max-height:600px}`) could not work —
  the canvas is `transform:scale()`'d by `fitCanvas`, which breaks `sticky`, the same finding already
  recorded for the practice-set mastery bar. **Measured on #144:** the panel was clipped at *every* scroll
  offset — 82px lost below at rest, up to **246px lost above** at 1280×800 scrolled, and never fully visible
  at any position. Replaced with `tpOverlayPark()`, called from the single `openOv` seam in `wirePackTyped`:
  it converts `#stage`'s visible band into the overlay's local (pre-scale) px and writes it to `top`/`height`,
  so centring resolves against the **pane** and `.tp-fpanel`'s `max-height:88%` + `overflow-y:auto` give a
  tall panel an internal scroll instead of overflowing the board. Two traps closed: the overlay is `[hidden]`
  (`display:none`) when the handler fires, so parking now happens *after* it is shown, and a block that has
  not yet scrolled into view still carries the F1 entrance `transform:translateY(14px)` — a transformed
  ancestor becomes the containing block, so `top:0` meant the top of *that block* (~1500px down) rather than
  the slide; `settleFrag()` lands the block's entrance (transition suppressed for one frame) before measuring.
  Scoped to `.tp-overlay`, so the figure's in-plot coordinate callouts and geolearn's `.gl-overlay` modals are
  untouched. **Checked:** panel fully inside the pane with **0px clipped** across 12 viewport×scroll
  combinations (1440×900 / 1280×800 / 1024×768 × scroll 0/900/1500/2100); with a 9-step solution taller than
  any supported viewport, the panel stays in the pane and both step 1 and the answer are reachable at
  1440×900 / 1024×768 / 834×1112 / 390×844; legacy corpus **250/250 renders byte-identical**; validate green.
- **`⤢` made the graph SMALLER — the focused window gave the plot 0.34× the inline figure's area (UI-0
  audit).** Two causes. (1) `.tp-fpanel-figx` is declared *before* the base `.tp-fpanel` rule and at equal
  specificity, so `max-width:760px` won on source order and the focused panel never got even its intended
  1040px — raised to `.tp-fpanel.tp-fpanel-figx`, the precedent `.tp-sc-modal` already uses for exactly this
  reason. (2) The panel did not use the pane: it now takes the full parked band (`max-width:none`,
  `max-height:100%`, tighter scrim/panel padding), is a flex column so `.tp-figx-stage` flexes into whatever
  the toolbar and readout leave, and the coordinate readout and status message share one row instead of two.
  **This is now a stated engine invariant** (`ENGINE_SPEC` §6 / `BUILD_SEQUENCE` Stage 2b) rather than a graph
  CSS detail, because Geometry inherits the same focused workspace: *expanding a figure must give the plot
  more usable area than the inline figure, never less.* **Checked:** ratio **1.08× at 1440×900, 1280×800,
  1024×768 and 834×1112** (was 0.34× at all four); the inline figure's SVG body is **byte-identical** across
  all four graph fixtures; legacy corpus 250/250 byte-identical; validate green. The margin is deliberately
  slim — the *inline* figure is allowed to fill the pane, and sizing it is a visual-system decision deferred
  to that pass, not an engine one.
- **`fragWorkedExample` leaked raw `$…$` into its heading.** The block's `title` was escaped with `esc()`
  while every comparable authored field goes through `tpRichMath()`, so `Expand $-2(3x-5)$` rendered with its
  delimiters showing. Now typeset like the rest of the block. **Checked:** renders as `Expand −2(3x−5)` with
  real MathML and no `$` in the text content; legacy corpus byte-identical (no corpus lesson authors a
  `workedExample` title).

### Security
- **Central URL allowlist gate — author URLs can no longer reach an iframe/href/`window.open` with a
  dangerous scheme (C1/C2/M1).** `toEmbed()`'s non-YouTube passthrough (`return url`) previously emitted any
  author URL verbatim into an **unsandboxed** `<iframe src>` (video slide, video hotspot, three pack video
  renderers) and into the pack play button's `data-tp-playembed` → `iframe.src` on click (the C2 second-path,
  where `.dataset` entity-decodes and undoes `esc()`). `esc()` closes attribute-breakout but **not** the
  scheme, so `javascript:` / `data:text/html` / `vbscript:` / protocol-relative `//host` / arbitrary external
  hosts got through. Added one central `safeUrl(raw, mode)` primitive applied at **every** URL sink's origin:
  `mode:'embed'` = https + an allowlisted video host (youtube/youtu.be/nocookie/vimeo) or a direct https
  `.mp4/.webm`; `mode:'frame'` = scheme-only (https absolute or same-origin relative) for open-ended
  interactive embeds. Also re-gated the C2 value **after** the `.dataset` decode, at assignment time. The two
  source-link sinks (`sourceFallback`, `packSourceAnalysis`) that previously self-gated with
  `/^(https?:)?\/\//` — which blocked `javascript:`/`data:` but **allowed protocol-relative `//host`** — now
  route through `safeUrl(…,'frame')` too (CodeRabbit). An
  allowlisted URL passes through **unchanged** (so the corpus is byte-identical); a blocked URL becomes `''`
  and the sink renders its safe placeholder. **`scripts/validate.mjs`** now mirrors the gate: it scans
  `<iframe src>` + the `#lesson-data` `url`/`externalVideoUrl`/`sourceUrl` fields, **hard-fails** on a
  dangerous scheme (the corpus carries none) and **warns** on a non-allowlisted embed host (the corpus
  legitimately uses youtube + the project's own github.io). **Checked:** byte-identity **0 diffs across 1320
  render units** (14 corpus lessons × 5 themes × Study/Present); adversarial acceptance **30/30** (every
  malicious vector blocked at the unit, render, and real-wired-C2-button levels; legit youtube still plays;
  legit interactives still embed); `validate` green on the corpus and correctly fails a crafted malicious
  lesson; 0 console errors; self-contained; no CSS/token change.

### Fixed
- **Composable-block a11y (m2/m3/m4) — three small fixes from the read-pass triage.** **(m2)** A placed image
  (`beside`/`pair`/`contained`) carrying an interaction stamped the "Enlarge image" trigger on the whole
  `.tp-frag`, so the caption/prose became part of one giant button. `renderFragment` now passes the trigger
  into `fragImage` as `hostAttrs` so it scopes to the `<img>` only; the figure's caption/prose stay
  non-interactive. Guarded: with no placement **or** no interaction the trigger stays on `.tp-frag` →
  byte-identical. **(m3)** Multi-line/`ref` display equations (`.tp-formula-x`) got `overflow-x:auto` (matching
  `.tp-sc-work`) so a wide equation scrolls within its own box instead of forcing horizontal **page** scroll.
  The scroll box is also **keyboard-focusable** (`tabindex="0"` + `role="group"` + `aria-label`) so keyboard
  users can scroll a wide equation (WCAG 2.1.1; CodeRabbit follow-up — no corpus lesson uses extended-formula
  blocks, so this touches 0 corpus render units). **(m4)** The practice-set mastery-bar fill (`.tp-ps-seg transition:width`) is now gated by
  `@media (prefers-reduced-motion: reduce)` (the file's other motion sits behind opt-in `no-preference`
  guards; this bar was missed). **Checked (painted behaviour):** interaction host is the `<img>` (role=button),
  `.tp-frag` clean, prose not inside the button, plain-image path unchanged; wide equation → `overflow-x:auto`
  and 0px page h-scroll; transition-duration `0s` under reduce / `.35s` without. Byte-identity **0 diffs across
  1320 render units**; validate green; CSS/token-only except the m2 structural scope.

- **Composable page reading column was narrow (~half width) at laptop sizes.** F1 made the flat page
  `.tp-slide[data-tp-type="page"]` `position:relative` but not full-width; since `#slide` is `align-items:center`
  it shrank to content width, collapsing the reading column to ~48% of the stage on narrower windows (legacy
  slides fill via `position:absolute;inset:0`). Added `width:100%` to the flat-page slide so it fills to its
  `--tp-measure` (~85%). CSS-only, all themes; 200 legacy renders byte-identical; validate green.


### Changed
- **UI-1 visual-review corrections — surface width matches content role; the focused plane fills its
  viewport.** Two systemic layout defects and one blocking narrow-mode failure, all found by the required
  visual review of the UI-1 captures. Measured before any CSS was touched, then re-measured.
  **(1) The focused plot was letterboxed, not responsive.** The focused box was fixed at `900×560`, so with
  `preserveAspectRatio="xMidYMid meet"` the painted plane held a 1.607 landscape aspect whatever shape the
  stage was. The SVG *did* fill the stage — the plane inside it did not. Measured: at **834×1112** the stage
  was 780×947 but the grid only **707×427**, leaving **520px of blank inside the bordered plot region**; at
  **390×844**, 304×183 in a 336×679 stage — **73% blank**. `figxBoxFor()` now measures `.tp-figx-stage` and
  re-solves through it, so axes, grid, tick generation and the coordinate mapping all regenerate for the real
  viewport, with gutters that scale down on a phone. Nothing is stretched: `aspect:'equal'` still preserves
  square units, a portrait viewport simply showing more of the y-range. The solve-cache signature carries the
  box, and a resize/rotate while focused re-solves. **After:** blank inside the stage is the axis gutter only
  — 834×1112 **520px → 68px** (grid now 696×**864**, genuinely portrait), 390×844 **496px → 61px** (290×603),
  1440×900 88px → 64px. Recorded as a second engine invariant, since Geometry inherits the same workspace.
  **(2) Close overlapped the controls.** `.tp-fclose` was `position:absolute` and its rect overlapped the
  control strip at **every** viewport, not just narrow — a real collision once the toolbar wraps on a phone.
  Title and Close now share a header row above the controls, which wrap deliberately beneath it. Close is
  `position:static`, **0 overlap at all four sizes**.
  **(3) Prose sat as an island inside a full-width card.** Every block was a full-width surface while the
  reading measure constrained only the inner wrapper, so a ~700px column sat inside a ~1128px panel with
  **~214px dead on each side**. The rule is now that a surface's apparent width matches what it is
  structurally meant to hold: reading surfaces shrink around the measure plus padding (`--tp-prose-max`),
  while **workspace** surfaces — `figure`, `banner`, `image`, `labeledGraphic` — keep the full page width
  because they use it. Line length is unchanged; only the container is. Applied systematically across every
  prose fragment type rather than to one block: at 1440×900 all of `skillHeader`/`section`/`workedExample`/
  `selfCheck`/`practiceSet`/`mastery` now measure **764px** with `figure` still full-width, and `section`'s
  dead side space falls **201px → 46px**.
  **Checked:** legacy corpus **250/250 renders byte-identical**; inline figure SVG body byte-identical 4/4;
  38/38 UI-0 contracts (expand ratio 1.64× / 1.53× / 1.92× / 4.34× / 3.53×); 41/41 focused workspace; 5/5
  display defaults; 9/9 display-setting persistence; `validate` green. The desktop Figure Shell, focused
  workspace, graph treatment, chrome hierarchy, Options disclosure and worked-solution surface are
  **unchanged** — this is a targeted correction, not a second redesign.

- **UI-1 — lesson visual-system foundation.** A system-level pass before Geometry, Exercises, Video and
  Stage 5 add more visible component types, so they inherit one design instead of each inventing another.
  Five scoped commits.
  **(1) Shared chrome primitives.** Extends Layer A (`:root` chrome) rather than adding a third token layer —
  Layer B (the `.tp-slide` pack slots, the v2 doc's "Layer 1") already supplies surfaces, borders, radii, the
  serif/sans/maths roles and content measure. Adds a deliberately small spacing scale (`--sp-1..6`), an
  elevation vocabulary (`--elev-1..3`, with `--elev-2` aliasing the existing `--shadow`), and
  `--sidebar-sel`/`--sidebar-sel-ink`. **The selected-nav slots fix a semantic token collision, not a
  colour:** `--sidebar-2` means "the rail, one step raised" on a DARK rail, and `.nitem.on` used it as the
  selected surface — but all five themes in the picker ship a LIGHT rail and had reassigned `--sidebar-2` to a
  saturated accent. The selected item therefore became a solid slab that also took `--sidebar-itemtext` (dark
  on every one of those themes) and `--sidebar-mut` with it: dark ink on a dark fill. That is why the selected
  lesson title *and* its `PAGE` sublabel were both near-illegible in the UI-0 captures, on **every** theme
  rather than just ScholarMath. The default dark rail keeps its behaviour byte-for-byte; each light-rail theme
  overrides only the surface.
  **(2) Chrome steps back.** `.nitem.on` takes the new slots, so the accent bar that was always in the CSS
  (`.nitem.on::before`) is finally visible — selection now carries three cues (bar, accent icon chip, tint) and
  never rests on fill alone. The bottom navigation was **~65px of every viewport** with a raised, shadowed
  button at each end; it is now slim and flat on the page ground, and a one-page lesson shows two quiet ghosts
  instead of two prominent dead buttons. The header keeps its information architecture and moves onto
  `--canvas` so the lesson sheet is the brightest surface. Also fixes a latent motif bug: the per-theme
  iconography paints an overlay masked by `--motif` for every `:root[data-theme]`, but only three themes
  define one — elsewhere the mask was invalid and the overlay painted **unmasked**, which is the blank white
  square that sat in the brand mark on geolearn/microhistory/mathematics/scholarmath in every UI-0 capture.
  **(3) Shared Figure Shell + learner-control hierarchy.** The shell was literally `.tp-fig{margin:0}` — the
  plot painted straight into the page flow with no identity, no status region, and the expand button floating
  over the mathematics; Stage 3 would have had nothing to inherit. `fragFigure` now emits semantic regions
  (head / stage / foot / caption) on ONE surface with one border and no nested cards, with the kind label
  driven by `b.figure` so a geometry figure renders into the same shell and differs by content. The graph
  rendering itself is untouched — strokes, warm ground, two-tier grid, dark axes and quiet labels all
  unchanged (**inline SVG body byte-identical across all four graph fixtures**). The focused window exposed
  every switch the engine has as one dense permanent row; the primary surface is now
  `Zoom out | Zoom in | Pan | Reset | Options`, with Gridlines, Minor grid, Axis labels and Tick density behind
  Options. Nothing is removed — engine capability is unchanged, only its permanent exposure — and the four
  display settings take their initial value from the block via optional `minorGrid`/`axisNames` fields on the
  existing figure schema (no new configuration system), staying learner-overridable during the lesson.
  **(4) The focused figure becomes the application.** See Added.
  **(5) Worked-solution surface.** Was modal → card-per-step → grey box-per-equation: three container levels
  for one piece of reasoning. Now one surface with numbered steps separated by thin rules, a faint paper grid,
  and an answer carrying an accent edge rather than a 2px ring. The step typography and monospace working are
  deliberately **not** touched — the coherent typesetting system across working/answer/chalkboard is Stage 5's.
  **Checked:** legacy corpus **250/250 renders byte-identical**; the UI-0 contracts still hold (38/38 cold);
  41/41 focused-workspace assertions; `validate` green; 0 console errors. *Intentional visual changes* (markup
  identical): header/footer/sidebar weight, the removal of the unmasked motif overlays, the figure shell, the
  reduced control surface and the solution surface.

- **Grading core (M2) — one `gradeResponse(kind, response, spec)` seam.** Extracted the graphQuestion
  submit handler's DECISION logic (equation-equivalence by sampling + point-set within tolerance +
  misconception matching) into a pure, DOM-free `gradeResponse('graph', {eval,points}, spec) →
  {correct, detail}`. The handler stays the thin caller that compiles the student input and paints the
  result — the decision is **deleted** from it, not duplicated. This is the single plug-in point the
  coming graph/geometry question types (engine Stage 2+) register a new `kind` into, instead of copying
  the check into `wirePack` a second time. **Scope (honest):** self-assessment (`selfCheck`/`practiceSet`
  self-marks) is *not* grading and was left untouched; the real grader was the graphQuestion check, which
  lives inside `wirePack` — so this edits `wirePack` (an approved, tested exception to frozen-fn identity,
  Option B). **Checked:** grading-outcome byte-identity **15/15** (correct / equivalent-form / misconception
  / wrong / points partial+extra+tolerance-boundary / both-mode / edge, diffed `{correct,detail}` vs the
  `pre-grading-core` tag); render byte-identity **0 diffs / 1320 units** (types × 5 themes × Study/Present);
  the other five frozen fns byte-identical; validate green; 0 console errors; token-only (no CSS change).
- **Skill-page polish (S2/S3) — per-block cards + mastery-bar placement.** Two fixes from the first real
  ScholarMath skill-page load, CSS/token-only (all render/wire logic byte-identical). **(1) Per-block cards:**
  the "plain content" blocks (`text`/`formula`/`skillHeader`/`mastery`) now render as white cards on the
  cool-grey background (soft shadow, rounded) to match the ScholarMath mockups — carded like the self-checks,
  not flush. Token-driven and **opt-in**: a shared rule keyed on `data-tp-frag-type` reads new `--frag-card-*`
  slots (+ `--formula-sh`) with transparent/none fallbacks, so ScholarMath sets them while every other theme
  is visually unchanged — no `[data-theme]` structural fork, and blocks that bring their own surface
  (self-check, practice set, chalkboard) are never double-carded. **(2) Mastery bar:** moved from a top-sticky
  bar (which covered questions) to a clean **end-of-set summary card** via flexbox `order` (no DOM change →
  `fragPracticeSet` byte-identical), so it never overlaps content. *Finding:* `position:sticky` can't pin in
  the flat page — the canvas is `transform:scale()`'d (fitCanvas width-fill), which breaks sticky (it floats
  mid-content); a static end-of-set bar is the robust choice (true persistent pinning would need JS
  scroll-follow, deferred). Contrast AA; self-contained; 200 legacy renders byte-identical;
  `renderPackSlide`/`renderFragment`/`wirePack`/`resolveInteractions` + `fragSelfCheck`/`fragPracticeSet`/
  `fragSkillHeader` unchanged; validate green; 0 console errors.

### Added
- **Viewport-level focused figure workspace (UI-1 commit 4).** Expanding a figure now opens a workspace at the
  viewport instead of a larger card inside the lesson board: sidebar gone, lesson navigation gone, app actions
  gone, leaving a quiet context strip, an obvious Close and the mathematics. `#figfocus` is a **body-level
  root**, a deliberate sibling of the app's existing `#lightbox`/`#worksheet` fixed overlays — which, unlike
  anything inside `#stage`, sit OUTSIDE the `transform:scale()`'d `#canvas`. The expanded figure is therefore
  **moved** there rather than styled bigger in place, with no `position:fixed`-inside-a-transform workaround of
  the kind UI-0 measured. The reparent is safe because every figx control is wired by delegated document-level
  listeners on `[data-figx]` attributes and `figxPanelEl()` resolves via `document.querySelector`: nothing
  depended on the panel living inside the slide, so no control is duplicated and no wiring re-run. The node's
  original parent and next sibling are restored on close, and `renderCanvas()` lands the figure back first so
  navigating while focused can never strand it. The workspace root contains a `.tp-slide` because the pack's
  Material tokens are declared as `:root[data-theme] .tp-slide` — that context is what lets the reparented
  panel keep its theme tokens and every `.tp-slide`-scoped rule instead of duplicating the stylesheet. Close,
  Esc and focus-return all reuse the existing rail: the panel's own `[data-tp-focus-close]` is restyled into a
  labelled Close pill with **no markup change**, so its aria-label, the shared Esc handler and the
  focus-return-to-opener path are untouched; the lesson shell is marked `aria-hidden` while open.
  **Usable mathematical viewport, measured cold** (was 1.08× at every size after the UI-0 mechanical fix):
  1440×900 **1.67×** · 1280×800 **1.56×** · 1024×768 **1.97×** · 834×1112 **4.41×** · 390×844 **3.61×**.
  **Checked:** 41/41 across five viewports — opens from the keyboard, panel reparented, focus moves into the
  workspace, lesson shell `aria-hidden`, Esc closes and returns the panel to the slide, focus restored to the
  originating Expand control, `aria-hidden` removed, 0 page errors, and navigating while focused exits cleanly.

- **`tests/visual/` — permanent visual fixtures, with a README.** `examples/` and `lessons/` cover every
  *legacy* slide type, but nothing committed to the repo rendered a composable `page`, the ScholarMath theme,
  or a `figure` block: engine Stages 1a–2b (#140–#144) were each verified with ad-hoc scripts that were never
  committed, so their rendered output could not be reproduced afterwards and had to be re-authored from
  scratch for the UI-0 audit. Adds `composable-page-baseline.json` (every registered block type on one page,
  re-skins to all five themes), `figure-graph-baseline.json` (clean plot · the 12-identifier/2-curve/3-chord
  pill-collision stress case · a discontinuity at `aspect:equal` · the author-error state) and
  `modal-overflow-baseline.json` (a solution taller than any supported viewport, guarding the parking
  contract). The README documents how to load one, that `#stage` — not `.tp-scrollmain` — is the scroller for
  a composable page, and the two contracts above as assertions. **`BUILD_SEQUENCE` Stage 3 now requires
  `figure-geometry-baseline.json` in the same PR**, and the standing rule is that a stage adding a rendered
  surface adds its fixture.

- **Figure engine Stage 2b — Expand / focused graph window (ENGINE_SPEC §6).** The surface where a student
  *interrogates* a graph instead of reading it. **⤢ on the figure opens a focused window on the EXISTING Phase B
  rail** (`data-tp-focus-open` ↔ `[data-tp-overlay]`, reusing the `.tp-overlay`/`.tp-fpanel` skin) — **`wirePack`
  is byte-identical**; the in-panel controls ride **one delegated document listener** registered once at load,
  the same pattern as the app's other top-level listeners, and the panel paints **lazily** on first open so an
  unopened figure costs nothing. **(1) Zoom + pan** produce only a new MATH domain; everything re-solves through
  `figGraph` → `figView`/`figFitAndLayout`, so points, curves, segments and identifier pills are coordinates that
  follow the transform — nothing is transformed in pixels and there is no SVG `transform`. **(2) Increment
  selection** offers a bounded set of tick *targets* (4/5/6/8/10), every one routed through `figNiceStep`, so a
  raw step cannot reach an axis; the resulting step is shown. **(3) Coordinate readout** on hover in MATH
  coordinates via the **§1.1 inverse** mapping — the reason the mapping was built reversible. **(4) Feature
  toggles** (gridlines, minor ticks, axis names) and **(5) Reset**. The painted body is now one shared
  `figSvgBody`, so the inline figure and the expanded view cannot drift apart. Points outside the viewport are
  culled before solving (`figGraph`'s auto-fit only ever *expands*, and would otherwise drag a zoom back out),
  while **segments are resolved against every authored point** so a chord whose far end is off-screen is still
  drawn and clipped, exactly as on paper. **Checked — acceptance 53/53, 0 console errors:** across seven
  zoom/pan states every point sits at exactly `figView(x,y)` for the current domain (**max error 0.00e+0 px**)
  with the ≥ GAP no-collision invariant holding after every re-layout; readout round-trips math→pixel→readout at
  **1.78e-15** and stays exact after zoom; **20 step values across 5 increments × 4 zoom depths are all nice**
  and an off-list increment is ignored; each toggle re-renders correctly; Reset restores the default view
  exactly. **Rejection suite:** zero-width, inverted, `NaN`, `Infinity`, below-floor and beyond-ceiling
  viewports are each refused *with a reason*, 200 zoom-ins/outs stop at the limit with the viewport finite and
  no `NaN` in the painted SVG, and panning off the data leaves a valid empty plane rather than throwing.
  **Timing budget (standing rule): open 10.4 ms, zoom 2.0, pan 1.8, toggle 1.7, increment 2.1, reset 9.5,
  readout 0.1 — all against `tan x` + 14 points, budget 150 ms.** Painted geometry verified by computed style in
  ScholarMath and GeoLearn at three zoom levels. **7 frozen fns (incl. `wirePack`) and all 1a/1b/1c/2 contracts
  byte-identical; legacy corpus 0 render diffs (1320 units); the inline figure's SVG body proven identical to
  main across four specs; validate green; self-contained; token-only.** *Spec-verification fold (standing rule):*
  **(i)** a re-render under the same block id carried the student's viewport forward wholesale, so editing a
  figure's domain in the inspector left ⤢ painting a **stale window with every point culled** and no way to tell
  that from an empty region — the viewport is now re-based whenever the authored view changes, while an
  incidental re-render still preserves the zoom. **(ii)** The new focus rules wrote
  `outline:var(--focus-ring,<shorthand>)`, but `--focus-ring` is a **colour**, so the fallback never fired and
  the declaration set colour only, leaving `outline-style:none` — **no focus ring at all** on ⤢, the toolbar,
  and (already on main, from Stage 2) the reveal hit-target and callout close. All four now use the shorthand
  the rest of the file gets right and are asserted to paint `solid/3px`. **(iii)** `figSafeId` collapsed every
  unsafe byte to `_`, so blocks `'a b'` and `'a+b'` shared one DOM id and one registry entry; the escape is now
  injective. **(iv)** The increment `<select>` hard-coded ≈5 as selected while the axis was drawn at the
  persisted value. **(v)** The readout was an `aria-live` region rewritten on every pointer sample (121
  announcements from one sweep); it is no longer live.
- **Figure engine Stage 2 — graph engine front-end (ENGINE_SPEC §5 shape, §6).** The first stage that renders
  something a student uses, additive on top of 1a/1b/1c. **(1) Function plotting** — author expressions compile
  through a small **safe recursive-descent evaluator** (`figTok`/`figParse` → a closure; **no `eval`/`new Function`**,
  so the file stays self-contained and an author string is never executed): `+ − × ÷ ^` with right-associative
  powers, unary minus, parentheses, implicit products (`2x`, `3(x+1)`), `pi`/`e`, and the usual functions in both
  `sin(x)` and `sin x` forms. **(2) Adaptive sampling** (`figSampleFn`) — a coarse grid subdivided *only where the
  curve departs from its chord* (screen-space sagitta) and wherever definedness changes, so a straight line spends
  25 samples and `sin(3x)` earns 315. **(3) Discontinuities BREAK** — each maximal run of on-frame samples becomes
  its **own** polyline, so `1/x` renders as 2 subpaths and `tan x` over four asymptotes as 5, and no false vertical
  connector is ever drawn across an asymptote; samples that leave a one-range band are dropped, so **no absurd or
  `NaN` coordinate can reach a path attribute**. **(4) Table-of-values points** wired into the §5 `objects` shape,
  each with its identifier placed by the 1b collision system. **(5) Segments** between named points. **(6)
  Reveal-on-tap coordinates (§1.7)** riding the **existing Phase B rail** (`data-tp-focus-open` ↔ `[data-tp-overlay]`)
  — `wirePack` is **byte-identical**; the callout is an id-paired overlay placed by the 1b system and clears the
  **painted curve and chord**, not just the axes and markers. **(7) The declarative §5 intake**
  (`{figure:'graph', domain, objects:[{type:'function'|'points'|'segment'}], grid, aspect}`) via `figGraph`, which
  returns a solved model and an `errors[]` — every authoring fault is **reported and the object skipped**, never
  fabricated. Matches the approved visual target: two-tier grid, mid-grey axes with ticks, plain tick labels,
  accent dots with a thin ring, **plain identifiers (the 1b box still governs collision, it is simply not painted)**
  and a dark board-colour callout. **Checked — acceptance 47/47, 0 console errors:** every curve vertex lands at
  exactly `figView(x, f(x))` (max error **0.00e+0 px**); adaptive distribution shown (`y=x³` bins
  `[8,8,4,4,8,9]` — edges 17 > centre 8; a parabola is *uniform by construction*, `y''` being constant); `1/x`
  → 2 subpaths with no branch straddling `x=0`; `tan x` → 5 subpaths, 0 straddling, largest within-subpath Δpy
  18.2px; five awkward reals at exact mapped pixels with **0 collision violations**; segment painted at the mapped
  endpoints; the live rail opens/closes the callout through the real `wirePack()` with the APG focus contract
  intact. **Rejection suite** (standing rule): malformed/unknown/unbalanced/illegal-character/empty expressions,
  non-finite and reversed domains, a function undefined everywhere, a segment naming an unknown point, an empty
  `objects[]`, and out-of-range points each yield a **clear error**; a bad object never takes the good ones down;
  and **no `NaN`/`Infinity` reaches markup** across `1/x`, `tan x`, `ln x`, `1/(x−2)`. Painted geometry verified by
  computed style in **ScholarMath and GeoLearn** (fallback-chain tokens — GeoLearn defines no `--graph-*`), each
  with a real 462×282.6px curve bbox and 0 knockout rects. **7 frozen fns (incl. `gradeResponse` and `wirePack`)
  and all 1a/1b/1c contracts byte-identical; legacy corpus 0 render diffs (1320 units); validate green;
  self-contained; token-only.** *Spec-verification fold (standing rule — re-read §5/§6 against the code, then
  adversarially hunt it; 10 findings, each reproduced before being accepted).* **(i) A ~11.7s render freeze**:
  the collision-arm cap was applied *per subpath*, so a many-asymptote curve — which breaks into dozens of short
  runs — never tripped it and contributed one arm per vertex to a search that is linear in arm count per
  candidate. The stride is now derived from the **total** vertex count with an **absolute `FIG_MAXARMS` ceiling**,
  and a **saturated** plot (>20 subpaths — branches every few px, where no label can clear the curve anyway)
  falls back to the axes-only obstacle set: `tan x` over ±10 with six labelled points went **11.7s → 11ms**,
  `tan(10x)` → 5ms. **(ii) Finite jump discontinuities** (`floor`/`ceil`/`round`/`sign`, all offered in the
  function table) were drawn with false vertical risers — only asymptotes that cleared the whole frame broke.
  A jump is now detected where subdivision has bottomed out yet Δpy stays large, honoured while such jumps are
  countable (an unresolvable oscillation is not a discontinuity), so `floor x` renders 6 clean steps and
  `abs x` still renders as one path (a corner, not a break). **(iii) `sin 2x` compiled to `sin(2)·x`** — a
  straight line, silently — because a parenless application and an exponent each grabbed a single atom; a
  juxtaposition level now binds the whole adjacent run (`e^2x` likewise), with precedence otherwise unchanged
  (`2^3^2`=512, `-2^2`=−4). **(iv) A blank/`null`/`false` table cell** was coerced to `0` and plotted as a real
  point the reveal then asserted as fact; rows are now validated as numbers (an authored genuine `0` still
  passes). **(v)** Identifiers are placed clear of the **plotted curve**, not just the axes — §3.2's rule is
  that a label clears every *arm*, and Stage 2 draws new ones. **(vi)** An unknown/misspelled object `type` is
  reported instead of silently dropped. **(vii)** Grid **resonance** (a periodic curve meeting every chord at
  its midpoint and aliasing to a straight line) is broken by off-centre probes. **(viii)** A pathologically
  nested expression **errors instead of throwing** a `RangeError` out of the render. *CodeRabbit fold:* that guard counted only parentheses, so a long unary chain (`-`×20000) or a parenless `sin sin sin … x` still overflowed and escaped into the render — every recursive path is now bounded, with a try/catch backstop so no input can throw out of the parser. **Re-proven: 70/70**, with
  the suite extended by timing budgets (it previously had none), step-function breaks, juxtaposition and
  precedence tables, table-cell rejection, curve-clearance, unknown types, resonance and the nesting guard.
- **Figure engine Stage 1c — construction-graph runtime + vocabulary.** The DAG evaluator behind a figure
  (ENGINE_SPEC §0/§2/§4), additive on top of Stage 1b — pure logic, **no render path touched**. **(1) DAG object
  model** — a figure is a list of named objects, each an op over earlier objects by name; `figConstruct(spec)`
  resolves parent references (scanning the arg keys `P/Q/V/A/center/through/from/to/line/a/b/poly/pts`),
  Kahn topo-sorts into an evaluation `order`, and **rejects a cycle at parse** (`order.length !== objs.length` →
  `ok:false`, no loop, no crash) as it rejects duplicate names. **(2) Construction vocabulary** (`FIG_OPS`) —
  points (`Point`, `Midpoint`, `PointOnSegment(t)`, `PointOnRay(dist)`, `PointOnBisector(dist)`,
  `FootOfPerpendicular`, `Intersection(root)`), carriers (`Segment`, `Ray`, `Line`, `Polygon`, `Circle`
  by radius **or** through-point, `Arc`), and measures (`Length`, `AngleMeasure`, `InteriorAngle`) — each
  placed exactly where its rule puts it, checked with independent geometry (`PointOnRay` collinear **and** at
  distance; `FootOfPerpendicular` foot·direction = 0; `Intersection` on **both** parents). Line∩line,
  line∩circle and circle∩circle solved in closed form with a `root` selector. **(3) Single source of truth
  (§4)** — a value-label (`Length`/`AngleMeasure`/`InteriorAngle`) renders **only** the engine-computed value;
  a typed `value` on such an object is **rejected at parse** so an author can't contradict the geometry.
  **(4) Parameterised constructions** (`FIG_PARAM`) — `rawCoordinates`, `rightTriangle{legs}`,
  `triangleSAS{a,b,angle}`, `triangleASA{angleA,side,angleB}`, `triangleSSS{a,b,c}`, `circle{radius}`,
  `regularPolygon{n,radius}` expand to solved coordinates satisfying the givens, and may be **extended** with
  extra objects (e.g. value-labels). **Consumer:** a test harness only — the geometry front-end (marks/labels
  from this graph) is Stage 3, not built here. **Checked (behavioural, evidence not assertion): acceptance
  20/20** — every verb exact; single-source-of-truth (`rightTriangle{legs:[6,8]}` → computed hyp 10, ∠B 53.13°;
  a contradictory typed 35° **rejected**); topological eval `A→A2→B2→C2→B→C→D` with the chained value correct
  and a `P↔Q` cycle **rejected**; all parameterised constructions satisfy their givens (SAS included angle,
  ASA two angles, SSS three sides, regularPolygon(5) interior 108°); transform survival (move a free parent →
  dependents recompute). **All seven frozen fns (incl. `gradeResponse`) + the
  `figView`/`figNiceStep`/`figNum`/`figPlacePill`/`figScanPill`/`figFitAndLayout`/`figAutoFit` (1a/1b)
  contracts byte-identical — proven by reconstructing `main`'s exact sha256 from the new file with the
  inserted lines removed; legacy corpus 0 render diffs (1320 units); self-contained; token-only; validate
  green; 0 console errors.** *Hardening fold — "reject, don't fabricate" (12 findings: 3 CodeRabbit +
  9 from an adversarial audit that reproduced every claim before accepting it).* The runtime previously
  had two failure modes, both of which broke its `{ok,errors,byName,order}` contract: it **fabricated**
  (impossible givens returned `ok:true` with a figure contradicting them — the exact contradiction §4 calls
  structurally impossible) and it **threw** (malformed input escaped as an uncaught `TypeError`). Fixed in
  three pieces. **(a) Spec conformance** — `PointOnBisector` now uses the §3.1 **signed sweep**
  (φ = α + δ/2, δ wrapped to (−180°,180°]); the previous `normalize(u+w)` is the construction
  ENGINE_SPEC.md:160 explicitly forbids, and at ∠PVQ = 180° (the ubiquitous "angles on a straight line"
  figure) it collapsed to the vertex itself. `InteriorAngle` is now **winding-aware** (shoelace sign × vertex
  turn), so a reflex vertex reports the interior angle and Σ = (n−2)·180° for any simple polygon — it
  previously reported 360−interior and a dart quad summed to 313°. **(b) Impossible givens rejected** —
  triangle inequality (SSS), angle sum < 180 (ASA), included angle ∈ (0,180) (SAS), integer n ∈ [3,100]
  (regularPolygon), positive finite radii/legs/sides, named finite coordinates (rawCoordinates); a
  `FIG_PARAM` entry now returns `{error}` and `figConstruct` rejects, plus a **finite-value backstop** so no
  `NaN` can escape as a solved figure. **(c) Never throw, always report** — own-property lookups for
  `FIG_OPS`/`FIG_PARAM` and null-prototype graph maps (so `toString`/`constructor` are not ops, and an object
  legitimately *named* `__proto__`/`toString` works); **unresolved parent names rejected at parse** (a typo'd
  reference was invisible to the sort, then crashed on deref); null/nameless entries filtered before the
  graph; primitive `args` coerced; an unknown `op` still binds a node so children can't crash; every verb
  call wrapped so a throw becomes an error; ray/segment **bounds respected** in `Intersection` (a segment
  (0,0)-(1,0) previously "met" the line x=2 at (2,0) and seeded dependents from the phantom); degenerate
  guards (coincident ray direction, zero-length line, <3-vertex polygon); and the cycle diagnostic now peels
  descendants to name only true participants and no longer fires a phantom cycle on a duplicate name.
  **Re-proven: acceptance 64/64** — the 20 original correctness checks, plus a **REJECTION suite** covering
  every one of the 12 (asserting `ok:false` *with a useful error*, never merely "didn't crash"), plus the
  straight-angle bisector case and a no-degeneracy sweep (90°/60°/170°/179.9°), the reflex dart quad
  (Σ=360.0000°) alongside convex regularPolygon(5) (Σ=540), and the 6 SSOT probes re-confirmed (rejection
  total, falsy `value` caught via `in`, extension objects inspected, no smuggling via text/label/display,
  **no false rejections**). Frozen fns and 1a/1b contracts still byte-identical; corpus still 0 render diffs.
- **Figure engine Stage 1b — auto-fit + uniform-gap pill collision.** The placement system
  (ENGINE_SPEC §1.3/§1.4/§3.2), additive on top of Stage 1a. **(1) Pill primitive** — a label becomes a
  box sized to its text (`figPillSize`); the BOX is the collision unit. **(2) Uniform-gap collision** —
  `figClear` measures a candidate box's TRUE distance to every arm (box-to-segment), every point marker
  (box-to-point − radius) and every placed pill (box-to-box); the hard rule is a single uniform constant
  `FIG_GAP` (6 viewBox units) — every pill sits ≥ GAP clear of everything, a minimum *distance*, not mere
  non-overlap. **(3) Candidate-position placement** (`figPlacePill`) — candidates out along the primary
  direction at increasing distance AND shifted along the edge (0, ±14, ±28…), across 8 directions ordered
  by the primary; the first candidate clearing everything by ≥ GAP wins, else the max-clearance fallback;
  pills stay on-canvas. **(4) Auto-fit** (`figAutoFit`) — expands the domain to the UNION of markers +
  every pill box (+ reserve) so nothing at an edge collides; pill size is scale-dependent so it iterates
  once (lay out in V0, expand, re-lay out in V1); `equal` aspect preserved. **Consumer:** #140's
  plotted-point identifiers become pills placed by this system (replacing 1a's simple offset). Side/vertex/
  measure anchors are Stage 1c/3 — not built here. **Checked (behavioural invariant, independent geometry,
  not one case):** across a battery (dense cluster / points-on-axes / data-extremes / near-vertical / tight
  cluster / on-axis-extreme / spread) **zero collision violations** — every pill ≥ GAP from every arm,
  point, and pill; on-axis extreme (C=(0,3)) → auto-fit expanded a tight domain (yMax 3 → 3.337) past the
  point with the pill clear; min box-to-arm measured per pill (all ≥ GAP, e.g. 8.1); a colliding ideal
  spot takes a shifted candidate (~20px) not a fling; pills re-place clear after rescale (stretch/equal).
  **All seven frozen fns (incl. `gradeResponse`) + the `figView`/`figNiceStep`/`figNum` contracts
  byte-identical; legacy corpus 0 render diffs (1320 units); self-contained; token-only; validate green;
  0 console errors.** *CodeRabbit fold — invariant made STRUCTURAL, not empirical:* `figPlacePill` returns a
  placement STATUS and never null (off-canvas is a soft penalty); an exhaustive `figScanPill` finds any
  clear on-canvas spot the directional search misses; and `figFitAndLayout` escalates (expands the domain,
  re-lays out) until EVERY pill is a valid ≥ GAP placement — there is no silent path that renders a sub-GAP
  or off-canvas pill. Re-proven: battery 0 violations; **adversarial cases that hit the old fallback (20
  points in a tiny domain + long labels; 24-point grid + huge labels) now resolve to 0 violations via
  7 and 5 domain-expansion iterations respectively** (allValid=true); on-axis/uniform/candidate/rescale
  re-confirmed; frozen fns + contracts still identical; 0 render diffs.
- **Figure engine Stage 1a — coordinate/viewport foundation.** The first stage of the figure engine
  (ENGINE_SPEC §1.1/§1.2/§1.6): a pure, token-styled, self-contained coordinate system. **(1) `figView`**
  — exact reversible math↔screen mapping (+inverse for hit-testing); arbitrary reals map exactly with **no
  snapping**; aspect `equal` (locks equal px-per-unit by expanding the shorter domain, centered) and
  `stretch`. **(2) `figNiceStep`/`figNiceTicks`** — step always rounds to 1/2/2.5/5 ×10ⁿ (target 5 ticks;
  distinct from the existing `gqNiceStep`); a raw norm of exactly 1.5 rounds **up** to 2 (strict `<`,
  documented); label precision derived from the step. **(3) `figDraw`** — an SVG primitive layer
  (line/polyline/polygon/circle/arc/text/tick), every colour via the fallback-chain theme tokens
  (`var(--graph-grid, var(--outline-variant))` …), no inline hex, no `[data-theme]` fork. **(4) `FRAG.figure`**
  — a minimal `figure` block that renders a coordinate PLANE (two-tier grid + mid-grey axes with tick marks
  + plain tick labels) and plots POINTS from a list OR a table of values (arbitrary reals) as marker +
  identifier; `grid: shown|hidden` (hidden = computed, unpainted). Functions/segments/geometry, label-aware
  auto-fit and pill collision are LATER stages. Registered with 5 explicit themes AFTER the ScholarMath
  mirror; additive editor touchpoints (TYPELAB/PACK_TYPELAB/BLOCK_SEED/blockForm). **Checked (painted
  geometry):** tick chooser −3..3→1 / 0..100→20 / −1..1→0.5 / 0..7→1 / −0.2..0.2→0.1 / 0..1000→200 /
  0..7.5→2 (the 1.5 boundary); (2.4,−1.7) maps to its exact pixel and the inverse round-trips (no snap);
  `equal` keeps pxPerX==pxPerY (unit square square) while `stretch` fills independently; grid hidden ≡ shown
  land at identical pixels; re-skins in ScholarMath + geolearn (fallback chain) with axes/grid/points
  actually painting. **All seven frozen fns (incl. `gradeResponse`) byte-identical; legacy corpus 0 render
  diffs (1320 units); self-contained; token-only; validate green; 0 console errors.** *CodeRabbit review
  folded:* domain validation (reject non-finite / reversed / zero-width bounds → `figAutoDomain`, so
  `figView` can't divide by zero) and higher-precision SVG-coord serialisation (`figNum`, ~0.0005 units;
  the mapping stays exact). The 1e-12-domain tick-precision note is logged as a known non-issue (no real
  coordinate plane reaches that scale). Re-verified: acceptance 13/13, painted 8/8, 0 render diffs, frozen
  fns identical.
- **Blocks Stage B — image placements.** The composable `image` block gains an additive `placement`
  field (`contained` | `beside` | `pair`) rather than a second media block: contained = centred ~78% figure
  with `figcaption`; beside = image + short text as one purpose-unit; pair = two images (fixed `a`/`b`
  fields) with labels. All reflow to 1 column at 760px, reuse the audited `.tp-lgr-cap` caption recipe and
  `.tp-int-img` content-sizing (a small image stays small), and preserve the Phase C1 `interactions[]`
  authoring on every placement. GUARDED: an image with no `placement` renders byte-identical. Alt text is
  enforced SOFTLY — an amber `.mwarn` in the editor on placement-bearing images only (legacy blocks are not
  nagged) and a `validate` WARN that never fails CI. *Deferred: escalate the validate alt check to a hard
  fail once the corpus is alt-clean.* 550 legacy renders byte-identical; frozen runtime unchanged;
  token-only; validate green.
- **Blocks Stage A — purpose-unit section container + hero layouts.** New shared, token-driven `section`
  block: heading (H2 + accent rule) + paragraphs + display equations all flowing inside **ONE card** (the
  `.tp-sc` token recipe, always-on in all 5 themes), on a centred reading column via a new per-theme
  `--tp-measure-read` (700px) token. Body is **container-scoped** 16.5px/1.62 (the global `--tp-prose-size`
  is untouched, so shipped pages are unaffected). `flow[]` is a TYPED array (`para`/`subheading`/
  `equation`) so an author orders mixed elements; the equation NESTS the existing panel by calling
  `fragFormula` directly (the fragPracticeSet->fragSelfCheck precedent). `fragFormula` gains additive
  `ref` / `lines` (aligned on `=`) / `shrink` support, and `banner` gains a `layout` field (Cover / Split /
  Overlay / Minimal) + size + title scale — both **guarded so existing blocks render byte-identical**.
  550 legacy renders byte-identical; frozen runtime unchanged; token-only; validate green.
- **Banner / hero block.** New shared, token-driven `banner` block for composable pages: a full-bleed
  background image with a legibility veil and an overlaid eyebrow / serif title / subtitle (white text over
  the veil; dark ink on a placeholder when no image). One renderer skins across every theme via slots — no
  `[data-theme]` fork — authored from the palette. Contrast AA (white/veil 13:1, ink/placeholder 14:1);
  self-contained; 200 legacy renders byte-identical; renderPackSlide/renderFragment/wirePack/
  resolveInteractions unchanged; validate green; 0 console errors.
- **S3 — the skill page: one small header block + full end-to-end composition.** New shared, token-driven
  **`skillHeader`** block (the only new element): a lean skill header — breadcrumb/eyebrow + serif title +
  "Skill N of M" count + a progress bar that **reuses `tpProg`** (for the clamped %) and the shared
  **`.tp-ptrack`** primitive (no new progress code). One inspector form; theme-neutral (no `[data-theme]`
  forks). With it, the **complete skill-mastery loop** is now authorable as a single flat composable page by
  stacking shipped blocks: `skillHeader → text` (exposition + POI popups) `→ formula` (callout) `→
  workedExample` (reveal demo) `→ practiceSet` (S2, interleaved self-checks + sticky mastery bar) `→
  mastery` (∎). Proven end-to-end: the whole "Expanding a single bracket" skill authored from the palette
  with zero hand-JSON, rendering as one scrolling page in ScholarMath and other themes by token swap —
  Reveal → carded modal → three-way self-mark → the sticky bar aggregating → ∎ mastery. Contrast AA
  (breadcrumb 5.39, title 16.91, count/sub 10.02). 200 legacy renders byte-identical;
  `renderPackSlide`/`renderFragment`/`wirePack`/`resolveInteractions` + S1 (`fragSelfCheck`/`wireSelfCheck`)
  + S2 (`fragPracticeSet`/`wirePracticeSet`) + `tpProg` unchanged; self-contained; session-only; validate
  green; 0 console errors.
- **S2 — the scrollable practice set + sticky mastery bar.** New shared, token-driven **`practiceSet`** block
  (renders in all themes): a set-as-container that **reuses the existing `items[]` pattern** (like
  `qGroup`/question — no general block nesting) and drives each item through **S1's `fragSelfCheck`** with a
  per-item bk (`<setbid>-<j>`) so every id/self-mark key stays unique (reuse, not fork). A set header
  (title/subtitle) + a **sticky mastery bar** (`position:sticky` — pins to the flat-page scroll owner
  `#stage`) that aggregates the **existing `TP_RUNTIME` self-marks** across the set: clean (Got it) fills a
  green segment, Partial fills amber with **no mastery credit**, pending stays grey, with a live count
  ("2 of 4 clean · 1 to revisit") and an **∎ mastered** flag when every item is clean. Optional **keep-going
  gating** for long sets shows a first batch then reveals the rest via the **existing `data-tp-reveal` rail**.
  The bar is recomputed by the additive `wirePracticeSet()` (rides the self-mark click; no `wirePack` change,
  no new state). Every `.tp-ps*` rule is shared with `--sc-*` fallbacks so all themes render by token swap.
  Editor: `practiceSet` palette entry + form (header + gating config + `items[]` of self-checks via the
  shared `scQFields`; context-aware item/step add defaults). Contrast AA (count/reco 16.91/10.02, accent
  5.39, segments 4.55/4.91 on the track). 200 legacy renders byte-identical;
  `renderPackSlide`/`renderFragment`/`wirePack`/`resolveInteractions`/`fragSelfCheck`/`wireSelfCheck`
  unchanged; session-only (no `localStorage`); validate green; 0 console errors.
- **S1 — ScholarMath default theme + the self-check practice unit.** A new **`scholarmath`** theme (cool
  paper, green accent, board navy) added as a pure token variant (same #119 discipline: 3 value-only blocks —
  chrome, `body`, `.tp-slide` slots — **zero structural `[data-theme]` rules**; fonts self-contained: Source
  Serif 4 / Inter / Courier Prime already vendored). It reuses every existing composable fragment renderer
  (a one-line loop mirrors the mathematics registrations), so composable pages render under it by token swap
  alone. New shared, token-driven **`selfCheck`** block (renders in all five themes, authored once): a prompt
  card (typeset `$…$`) with a **Reveal** button + optional **Hint** + a session status chip; Reveal opens a
  **carded solution modal** — numbered step cards (first badge accent, later badges `--sc-step2`) + contained
  mono working + an **accent answer card** with an **∎ Q.E.D.** seal, on a grid surface — and a **three-way
  self-mark** footer (Not yet · Partial = revisit/no credit · Got it = counts). The modal rides the
  **existing Phase B `data-tp-focus-open ↔ [data-tp-overlay id]` rail** and the hint the existing
  `data-tp-reveal` rail — `resolveInteractions`/`wirePack` **reused, not rewritten** (byte-identical); the
  self-mark is wired by the additive `wireSelfCheck()` (session-only via `TP_RUNTIME`, no `localStorage`).
  Every `.tp-sc*` rule is shared with baked fallbacks so imperium/microhistory/geolearn/mathematics render
  correctly too. Contrast: all pairs AA ≥4.5:1 — two spec values adjusted for AA text (`--muted #6B7280`→
  `#5E646C`, `--amber #B7860B`→`#835F00`). Editor: `selfCheck` palette entry + lean form (context-aware step
  default so `selfCheck` steps are `{desc,work}` while `workedExample` stays `{t,note}`). 200 legacy renders
  byte-identical; `renderPackSlide`/`renderFragment`/`wirePack`/`resolveInteractions` unchanged; validate
  green; 0 console errors. *(Interim: "Not yet" keeps the solution open for re-reading; a similar-variation
  generator and a cross-page mastery ledger are future work — the stateless app tracks self-marks per session
  only.)*
- **Mathematics theme — "Paper & Board", the seed maths visual identity + core maths block treatments.**
  The `mathematics` token set is re-valued (values only — the selector count is unchanged, zero new
  structural `[data-theme=mathematics]` rules): warm paper `#F4F2EC`, blue-black ink `#1A1C22`, deep board
  green `#17352B`, POI green `#2F6B56` as `--primary`, red pen `#B23A34` **reserved for classic errors**,
  EB Garamond (already vendored) sized up to 19px/1.72 via new shared prose slots. Maths is typeset by the
  engine's own **TPMath → native MathML** (KaTeX is NOT the engine's renderer — vendoring it would breach
  the no-third-party rule and roughly double the file; flagged in the PR). New **shared, token-driven
  structures** available to every theme (themes only supply values; neutral fallbacks baked in):
  **`formula`** block (display TPMath in the framed container — 1px `--formula-frame`, 3px `--formula-stroke`
  left, `--formula-fill`), **`workedExample`** chalkboard block (`--wx-bg/--wx-ink/--wx-dim`; optional
  reveal rides the EXISTING `data-tp-reveal` rail), **`mastery`** ∎ line (ink-native, recommend-don't-gate,
  not a badge), **POI popups** — a `keyTerms` row with `kind`/`label`/`num` renders a dotted `--poi`
  underline inline term (superscript numeral reserved via `num`; `kind:'error'` switches underline + popup
  stroke to `--redpen`) whose popup rides the EXISTING Phase B `data-tp-focus-open ↔ [data-tp-overlay id]`
  rail — `resolveInteractions`/`wirePack`/`tpKeyTerms`/`tpTermModal` all byte-identical; rows without those
  fields take the original code path unchanged — and a **`newthought`** small-caps opening on the text
  block. All authored in the editor (lean forms + palette entries). Contrast: every text/background pair
  AA-verified ≥4.5:1 — one spec value adjusted (`--ink-faint #8A8578` → `#6E6A5E`, 3.29 → 4.83). 200 legacy
  renders byte-identical (all four themes, Study/Present + examples); validate green; 0 console errors.
- **Composable pages — F1+F2: de-staged into flat, flowing pages (study-first).** A composable page
  (`{blocks:[…]}`) no longer renders inside the fixed 720px stage frame: `fitCanvas` now puts a `blocks[]`
  page in the existing `scroll` flow mode in Study, the editor preview pane AND Present alike (study-only
  interim — Present gets the same flat page; `renderPackSlide`'s composable branch is present-blind and
  unchanged), and new **page-scoped** rules (`.tp-slide[data-tp-type="page"]` → `position:relative;
  height:auto; overflow:visible`; its `.tp-main` → `overflow:visible`) let the page grow to its content.
  The app shell locks window scroll (`body{overflow:hidden}`), so **`#stage` owns scroll in both contexts**
  — editor chrome (inspector/palette/toolbar/sidebar) stays put while the preview pane scrolls, and a
  delivered/published (`data-export`) lesson scrolls the same pane. **Blocks animate in on scroll**
  (`wirePageFlow`: an IntersectionObserver on `#stage` adds the entrance classes; flat pages only, never
  while editing, `prefers-reduced-motion` honoured, and content defaults to visible without JS/IO).
  **F2 snag audit:** of the 15 `position:fixed/sticky` rules, all 9 `fixed` are app-chrome outside the
  canvas and untouched; the one sticky reachable on a flat page (`.tp-lgr-rail`) re-anchors naturally to
  the stage scrollport (verified). One new snag found and fixed page-scoped: the Phase B `.tp-overlay`
  (absolute `inset:0`) spans the whole flat document, so its `.tp-fpanel` is now `position:sticky` — the
  dialog pins inside the visible pane instead of centring mid-document (Esc/focus-return verified). No
  `100vh/100dvh` introduced; per-block `bid` identity + order preserved (the composable render string is
  untouched — Q4 guardrail for the deferred present module). **Legacy frozen:** the legacy branch of
  `renderPackSlide` and the shared base `.tp-slide`/`.tp-main`/`.tp-wrap` rules are unchanged; the legacy
  Study/Present stage (fixed 720, exact min-fit) behaves identically; 200 legacy renders byte-identical;
  validate green; 0 console errors.
- **Object interactivity — Phase C1: author image interactivity in the editor (zero JSON).** The composable
  `image` object is now fully authorable from the inspector — `blockImageForm({src, alt, interactions[]})`,
  alongside `blockKcForm`/`blockTextForm` and separate from the legacy page-`image` case — and it's back in
  the block palette (the Phase B gate is lifted). The **interactions sub-form** is a base-aware `repeatGroup`
  offering **only resolver-supported effects** (`modal | zoom | tooltip | reveal`; `goToPage` is never
  offered), with **payload fields shown conditionally by effect** (modal → title + body; tooltip → title +
  text; zoom → optional caption; reveal → button label + revealed text) — the effect `<select>` carries
  `data-reinspect` so switching it re-renders the payload fields. A **guard enforces the resolver's reality**
  (a host effect stamps its trigger on the whole `.tp-frag`, so it owns every click and can't share the
  object): a `modal`/`zoom`/`tooltip` interaction removes the "Add interaction" affordance (with an
  explanatory note), a 2nd+ interaction defaults to `reveal` and the effect enum collapses to reveal-only, so
  one object ends up as **one host effect _or_ any number of composing reveals**. `inSel` gained an optional
  `extra` attrs param and `repeatGroup` an optional `addGuard`; both are omitted by every legacy caller, so
  their output is byte-identical. **`resolveInteractions` + `renderPackSlide` + `wirePack` are untouched**
  (this is authoring only). Verified: an interactive page built **entirely in the editor** — image A with a
  `{click→modal}` (opens its bk-scoped overlay, Esc closes, focus returns) and image B with two `{reveal}`
  (distinct `int-<bk>-0/-1` ids, toggle independently, no cross-fire) — renders in all four themes; the
  conditional-field matrix and goToPage-absent hold; the multi-row list adds/deletes; 200 legacy renders
  byte-identical; validate green; 0 console errors.
- **Object interactivity — Phase B: interactions as a declaration over the shared effects.** Any composable
  fragment can now carry `interactions:[{trigger:'click', effect, payload}]`, resolved to the **same
  `data-tp-*` attributes wirePack already wires** — this is rewiring, not rebuilding, and **`wirePack` is
  byte-identical** (proof it's a pure declaration layer). An **effects registry** (`INTERACTION_FX`, spec
  Layer 6) maps `modal | zoom | tooltip | reveal` to their trigger attr + paired overlay markup; `goToPage`
  is **not** registered (spec §14, out of scope) and is silently ignored. **`resolveInteractions(b, bk)`**
  returns `{triggerAttrs, overlaysHtml}`: modal/zoom/tooltip ride the `data-tp-focus-open` ↔
  `[data-tp-overlay id]` rail (the host `.tp-frag` gains `data-tp-focus-open` + `tabindex="0" role="button"`
  so focus returns on close); reveal rides `data-tp-block` > `data-tp-reveal` + `[data-tp-model]` (no textarea
  → reveals on click). **Every generated id is bk-scoped** (`int-${bk}-${n}`) so two interactive objects on
  one page never collide — the load-bearing requirement. `renderFragment` stamps `triggerAttrs` on the
  wrapper and appends `overlaysHtml`; a fragment **without** `interactions[]` is byte-identical. First
  **object**: a minimal composable `image` (`fragImage({src, alt, interactions?})`, registered ×4 themes) —
  the proving host; video/button/hotspot are Phase C. Verified: two `image` objects each with their own
  modal open **their own** bk-scoped overlay in all four themes (0 duplicate ids, Esc closes, focus returns);
  zoom + tooltip work independently; reveal toggles; `goToPage` is ignored (no crash, no navigation); 200
  legacy renders byte-identical; `renderPackSlide` + `wirePack` untouched; validate green; 0 console errors.

### Fixed
- **Knowledge-check fragment now skinned in all four themes (#119).** `fragKnowledgeCheck` emitted imperium's
  V1 legacy classes (`.tp-opt`/`.tp-kc-card`/`.okey`/…), styled only under `:root[data-theme="imperium"]`, so
  the other three themes rendered the options as unstyled inline text. Decoupled the fragment from imperium's
  V1 family: its markup now uses its own `.fkc-card`/`.fkc-opts`/`.fkc-opt`/`.fkc-key`/`.fkc-text`/`.fkc-eyebrow`/
  `.fkc-q` classes (inside the `.tp-kc-frag` wrapper), skinned by **one theme-neutral, token-driven ruleset**
  (`var(--surface)`/`--outline-variant`/`--primary`/`--on-primary`/`--error`/`--tp-rad-btn`/`--tp-measure`; no
  `data-theme` in any selector). Imperium is now just another token consumer, not the template — the fragment
  is one design skinned four ways. Marking reuses the shared `tp-opt-sel`/`-correct`/`-wrong` state hooks the
  wirePack JS already adds (no JS change). The fragment's feedback box gets a token-driven container too (the
  base `.tp-feedback` icon/title/text were already theme-agnostic; only the box was themed). **Legacy is
  untouched:** every `:root[data-theme=…]` kc/opt rule, `imKnowledge`/`mhKnowledge`/`glKnowledge`, and
  `renderPackSlide` are byte-identical; the fix is composite-only. Verified: options render as cards (key chip
  + text) in all four themes with per-theme token colours, answer states show correct/wrong token-coloured,
  200 legacy renders byte-identical, validate green, 0 console errors.

### Added
- **Composable pages — A3 editor block-outline UI (v3 Phase A, final piece).** Composite pages are now
  **authorable in the editor** — no hand-written JSON. When a slide is a composite (`s.blocks`), the inspector
  shows a **block outline**: one row per block (type label + ↑/↓ reorder + delete), an **add-block palette of
  the FRAG-registered types only** (text / penResponse / knowledgeCheck / labeledGraphic / graphQuestion — a
  type with no fragment can't be composed), and selecting a row opens **that block's inspector**. The
  **“Page (composable)”** palette entry creates an empty `{blocks:[]}`; **“Convert to composable page”** on a
  legacy slide wraps its fields into `blocks:[{…}]` when the type has a fragment (page-only types show a clear
  refuse message — nothing auto-converts). **Inspector rebasing:** `inspectorForm` and `repeatGroup` gained an
  optional `base` path (default `slides.${i}`), so the **existing** case for penResponse / graphQuestion /
  labeledGraphic edits a block at `slides.${i}.blocks.${k}` unchanged (repeatGroups — misconceptions, markers —
  now address by full path); lean forms cover `text` and `knowledgeCheck` where the fragment schema differs
  from the page schema. **Stable block id (`bid`):** minted once on add/convert and stored in the block, so
  `renderFragment` keys ids/answers by `bid` (positional fallback for bid-less JSON composites) — **reordering
  a block never moves its runtime answers** to the wrong block. Also fixed in passing: the graphQuestion
  inspector's "Add misconception" (the def was missing). Editor-only surface → legacy `renderPackSlide` stays
  byte-identical. Verified: **200** legacy renders byte-identical + the legacy inspector unchanged (markers
  still use the `key:i` repeatGroup; edits land); **Ch5A built end-to-end in the editor** (Page → text +
  graphQuestion + penResponse, fields via each block's inspector) renders correctly in all four themes with
  typeset math, the plane, the pen, correct marking, and **zero duplicate ids**; reorder + delete work and a
  stroke stays with its block across a reorder (stable `bid`, no leak); page-only types aren't offerable;
  validate green; 0 console errors. **Phase A is complete** — Rise-style composable pages, authorable, with
  the maths capability.
- **Composable pages — A2 fragments for the remaining core blocks (v3 Phase A).** With A1's per-block-instance
  scope in place, the three richer blocks can now sit in a composed flow: **`fragLabeledGraphic`**,
  **`fragKnowledgeCheck`**, **`fragGraphQuestion`** (registered in the parallel `FRAG` map across all four
  themes). Each bk-scopes what would otherwise collide: labelled-graphic **callout ids** become
  `lgr-${bk}-c${k}` (+ `aria-controls`) and its wiring goes `querySelector → querySelectorAll` (two labelled
  graphics on one page activate their own callouts); graphQuestion's `data-tp-gq`/SVG-clip (`gqclip-${key}`)
  and the editor answer keys (`gqeq${key}`/`gqpts${key}`) key off the **raw scope string**, so two graphs
  never share a plane or editor state — legacy pages pass `"0"` (=== index `0`, byte-identical). The lean
  **`fragKnowledgeCheck`** is attribute-driven (`data-tp-kc`/`data-tp-opt`/`data-tp-fb`, no ids, no artifact
  image) so two checks on one page **gate independently**; the rich page renderers (imKnowledge/mhKnowledge/
  glKnowledge, with artifact + zoom) stay page-only. **`fragText` gains keyTerms** with bk-scoped modal ids
  (`ktp-${bk}-k`) so two text blocks open their own definitions (the id-targeted focus-open handler resolves
  by id).
- **Removed `graphQuestion.working:true`** — the embedded-canvas workaround from PR3b existed *only* because a
  `penResponse` block couldn't sit beside a graphQuestion. Now it can, so the flag, its canvas markup, its CSS
  (`.tp-gq2-working`/`-workhead`), the factory seed field and the inspector control are all deleted. This
  deletion is the proof the composable model was the right fix. `renderGraphQuestion` and `fragGraphQuestion`
  now share `gqBody(s,key,wrapClass)`.

  Verified: **192** legacy renders byte-identical vs `pre-v3a2` (every type except graphQuestion × 4 themes ×
  Study/Present + the example corpus); graphQuestion's only change is the removed working canvas
  (whitespace-identical, zero `data-tp-ink`). The nasty composite **`[graphQuestion, penResponse,
  knowledgeCheck, labeledGraphic, knowledgeCheck]`** works in all four themes: the two knowledge checks gate
  **independently**, graphQuestion marks equivalent forms + fires misconceptions, the pen is bk-scoped
  (`ink-0-1`), the labelled graphic's marker activates its own callout, **zero duplicate DOM ids**. Two
  labelled graphics → independent callouts; two keyTerm text blocks → independent popups. Legacy knowledge
  check / graphQuestion / labelled graphic wiring regression-tested. validate green; 0 console errors.

### Added
- **Composable pages — A1 keystone + per-block-instance scoping (v3 Phase A).** Slides can now be a **stack
  of blocks**, not one-block-per-slide. Additive: `renderPackSlide` renders `s.blocks[]` as fragments into a
  `.tp-flow` auto-layout (`max-width:var(--tp-measure)` — the one width authority (#92) — flex column, gap
  token); **absent `blocks[]` → the existing path, byte-identical.** `registerBlock(type,theme,pageFn,fragFn?)`
  gains an optional fragment renderer stored in a **parallel `FRAG` map** (NOT boxed into `REGISTRY`, so the
  legacy `REGISTRY[type][theme]` lookup and byte-identical page path are untouched); absent `fragFn` → the
  block stays page-only (correct for title/outro/sourceAnalysis/…). **The real work was scoping**, per the
  diagnose-first: fragments carry a per-instance block key `bk=${i}-${k}` and a `data-tp-block-path`, and (a)
  `fragPenResponse` uses a bk-unique `data-tp-ink` so two pens on one page get **independent** strokes
  (`wirePack`'s `[data-tp-ink]` already keys `rt.ans` by the attribute — no wiring change); (b) `graphQuestion`
  wiring **stops reading `LESSON.slides[idx]`** and resolves its **own block** via the nearest
  `[data-tp-block-path]` (fallback to the slide for the legacy page path — the silent-breakage bug fixed); (c)
  `knowledgeCheck` wiring goes `querySelector → querySelectorAll` and **drops the `if(!kc) return` early return**
  that skipped all wiring after it. First fragments: `penResponse` (exposes the slide-index collision, proves
  the fix) and a **lean `text` primitive** (`fragText` — eyebrow + heading + prose with inline `$…$`; NOT
  packText's humanities doc-grid, which stays page-only). Composite slides show **“Page”** in the editor rail.
  Verified: **200** legacy renders byte-identical (every type × 4 themes × Study/Present + the example corpus);
  a composite of two `penResponse` + a `text` renders in order in all four themes with **distinct ids
  (`ink-0-0`/`ink-0-2`), independent `rt.ans` keys (draw on one, the other is untouched), zero duplicate DOM
  ids**; Present keeps the whole flow in `.tp-main` with no separate flow scroll; legacy knowledgeCheck +
  graphQuestion wiring regression-tested; validate green; 0 console errors. `graphQuestion.working:true`
  becomes removable in A2 once composability lands. One file; no new third-party host.
- **Graph-question block (PR3b) — `graphQuestion`, interactive coordinate plane + answer surface.** Consumes
  the PR3a maths capability. A token-driven SVG plane (one grid implementation skinned by
  `--graph-surface`/`-grid`/`-axis`, no per-theme copies) drawn from `domain`/`range`, with axes, labelled
  ticks and an optional **given curve** `y=f(x)` (function-sampled to a path). The student answers by
  **typing a function** in the **full interactive equation editor** — lifted from `interactives/equation-
  editor.html` into `TPMath.editor()` (ribbon + caret field, reusing the exact PR3a render/compile/tex, one
  code path) — and/or by **click-to-plot** (keyboard-accessible: arrow-key cursor + Enter to place/remove).
  **Marking is by function SAMPLING**, so any equivalent form passes: `(x-2)^2` ≡ `x^2-4x+4`. **snap** is
  input-feel only; **tolerance** is for marking — kept separate. **Misconception diagnosis**: if the
  student's function matches a listed wrong-way answer (e.g. `(x+2)^2`), its specific message shows (with
  `$…$` rendered). Optional embedded **“show your working” pen canvas** (reuses the PR2 `[data-tp-ink]`
  wiring). One token-clean renderer registered **× all four themes** (registry now **60 pairs**); answers
  are ephemeral in `TP_RUNTIME` and **survive slide navigation**; export self-contains the editor + font +
  plane and re-mounts live on reopen. Editor: palette thumbnail, factory seed, type label, and an inspector
  (mode / domain / range / given / answer / snap / tolerance / working / misconceptions). Schema:
  `{ type:'graphQuestion', title, prompt?, domain, range, grid?, given?, answerMode, answer:{equation?,
  points?}, misconceptions?[], snap?, tolerance?, working? }`. Also fixed: `TPMath.editor` no longer fires
  `onChange` on its initial mount render (which would overwrite a restored answer). Verified across all four
  themes: plane + grid tokens + given curve render, editor mounts and types (keyboard + ribbon), checking
  accepts equivalent forms and fires the misconception path, points mode marks within tolerance, answer
  persists across navigation, existing blocks stay byte-identical (80/80) and knowledgeCheck wiring intact;
  validate green; 0 console errors. Still one file; no new third-party host.
- **Maths capability (PR3a) — inline `$…$` math in prose, engine-wide.** Foundation for the graph-question
  block (PR3b). Lifts the studio's own equation editor (`interactives/equation-editor.html`) into the engine
  as a self-contained, IIFE-scoped `TPMath` module — the **complete** node model, MathML renderer, LaTeX
  serialiser and shunting-yard evaluator (verbatim, so there's **one** math code path, not a divergent copy;
  the interactive editing UI is deliberately deferred to PR3b) — **plus a new string parser** so authors
  write inline math as `$…$`. Exposed as engine-level `tpMathTree` / `tpMathRender` / `tpMathCompile` /
  `tpMathLatex`. A `tpRichMath()` **wrapper** (NOT a change to the shared `tpRich`) extracts `$…$` → MathML
  before `tpRich` runs, so math is never `esc()`'d nor caught by `**`/`[[`/`==`; it returns `tpRich(text)`
  **verbatim** when the text has no `$` (fast path). Author syntax is a pragmatic LaTeX subset:
  `x^2  a_1  (x-2)^2  \frac{a}{b}  \sqrt{x}  \sqrt[3]{x}  \pi \theta \le \times \cdot  \sin(x) …`;
  ASCII `-` renders as a real minus, brackets become MathML `fence` nodes (so `tpMathCompile` groups them
  correctly for function sampling — e.g. `(x-2)^2` and `x^2-4x+4` evaluate identically), and `\$` is a
  literal dollar. The **LM Math** `@font-face` (base64 woff2, vendored from the equation editor) lives in the
  studio `<style>` so it **travels with Export** (`document.documentElement.outerHTML` captures `<head>`);
  a theme-agnostic `.tp-slide math` rule typesets it across all four themes with no colour of its own.
  Wired into the prose fields of **text / sourceAnalysis / guidedResponse across all four themes**
  (`kt` text-body hook, `glText`/`glGuided`/`glSource`, `mhGuided`/`mhText`, `packSourceAnalysis`/
  `packGuidedResponse`). Note: the imperium/mathematics `packSourceAnalysis`/`packGuidedResponse` model &
  question fields previously rendered via `esc()`; they now route through `tpRichMath`, which additionally
  brings them to parity with the microhistory/geolearn forks (`**bold**`/`==key==`/`[[note]]` now render
  there too) — byte-identical for any content without `$`/`**`/`==`/`[[`. Verified: **80/80** example
  slide-renders byte-identical pre/post (study + present); `$…$` typesets in all 12 theme×type combinations
  with no raw `$` leak and LM Math resolving; capability sampling correct; **export self-contains the font**
  (reopened export re-renders typeset math, `document.fonts.check("16px 'LM Math'")` → true); validate green;
  0 console errors. Still one file; no new third-party host (woff2 + MathML namespace are self-contained).
- **Pen capability — `penResponse` block (handwriting / "show your working" canvas).** The engine had no
  drawing surface; this adds a reusable pen-canvas as a standalone registered block: a titled prompt + a
  pointer `<canvas>` (`data-tp-ink`) with **Pen / Eraser / Undo / Clear** (real `<button>`s, keyboard-
  focusable, `--focus-ring`). Strokes are captured with **pressure-variable width** (`PointerEvent.pressure`,
  round caps; falls back to constant on mouse/finger) and stored **as JSON in `TP_RUNTIME` per field** —
  **ephemeral by design** (survive slide navigation within a session, vanish on reload, exactly like every
  other response; persistence is a separate, larger gap not solved here). Pointer→canvas mapping uses
  `getBoundingClientRect`, so it's correct under the scaled-slide transform. **One token-clean renderer
  registered across all four pack themes** — the ink is `var(--student-ink)` (mathematics) falling back to
  `var(--primary)` (imperium/microhistory/geolearn), read as the resolved canvas `color`; the canvas fills
  `var(--graph-surface)` (white) with a `--surface-lowest` fallback; `touch-action:none` so drawing never
  scrolls the page. Namespace `tp-ink-` / `data-tp-ink` (distinct from the reveal-note pen `tp-notepen`).
  Wiring lives once in `wirePack` (`[data-tp-ink]`), so any future block (the graph block's "show your
  working") can reuse it. Registry now **56 pairs** (14 types × 4 themes); the four existing themes stay
  **byte-identical** (`renderPackSlide` unchanged — the block is additive). Editor: palette thumbnail,
  factory seed, type label, and a title/prompt inspector. Schema:
  `{ type:'penResponse', title, prompt, eyebrow? }`. Verified across all four themes: canvas + 4 tools
  render, ink resolves to the theme token, strokes capture (with per-point pressure) + render, Undo/Clear/
  Eraser work, buttons are keyboard-focusable with a visible ring, strokes survive slide navigation;
  validate green; 0 console errors.
- **Mathematics theme (v2 pack theme #4 — Cambridge Ext1 / NSW Stage 6).** A fourth registered pack theme
  on the type×theme registry — the first new theme since the Phase-1 token layer, and a real test of the
  "new theme is cheap" claim. Purely additive: `PACK_THEMES += 'mathematics'`, a `<select>` option, an
  app-chrome token block, a `.tp-slide` Material slot block, and 13 `registerBlock` lines (registry now
  **52 pairs** = 13 types × 4 themes). **Neutral slate-indigo scholarly palette** (`--primary:#39496b`),
  Source Serif 4 / Source Sans 3 / Courier Prime (all already vendored). Adds a **standardised
  `--ok/--okbg/--bad/--badbg` feedback pair** and **maths figure/graph slots** — `--graph-surface` (crisp
  white, not the tinted `--surface`), `--graph-grid`, `--graph-axis` (dark; the pastel `--outline-variant`
  is too light for a coordinate grid) and `--student-ink` — reserved now so the graph block (a later PR)
  can consume them. **Token-clean:** the theme applies colour to elements only via `var(--slot)`; hex
  appears solely in `--slot:value` palette definitions.
  - **Renderer reuse (the token-layer payoff):** the two token-clean renderers (`renderLabeledGraphic`,
    `renderTimeline`) and the shared `pack*` renderers (text/sourceAnalysis/guidedResponse/interactive/
    outro) are registered **as-is** and skin correctly from the maths tokens. The six theme-forked types
    (title/outcomes/imageText/infographic/video/knowledgeCheck) re-register the **imperium** forks so
    **nothing hits packFallback** — these are **base-styled by design** (their polish lives in
    imperium-scoped CSS that doesn't apply under `mathematics`), to be skinned in a follow-up only if the
    Ch5A lesson needs it. No new renderers written.
  - **Also unlocked (lands with the graph block PR):** once the MathML equation editor is vendored in, the
    embedded math font makes engine-wide inline `$…$` MathML notation available.
  - Verified: all **13 types render under `mathematics` with no packFallback**; the three existing themes
    are **byte-identical** (`renderPackSlide` over the sample lessons); token-clean; validate green; 0
    console errors.
- **Interactive: equation editor (`interactives/equation-editor.html`).** A standalone, fully
  self-contained equation editor — native MathML typesetting (no library), with the Latin Modern Math
  font (OFL) embedded inline as base64 woff2. Zero fetch/XHR, zero `<script src>`, zero external
  stylesheets, zero storage APIs. (The file references the MathML XML namespace URI
  `http://www.w3.org/1998/Math/MathML`, which is a `createElementNS` specification identifier — never a
  network request; `validate.mjs` only scans `<script>`/`<link>` tags, so it is not flagged.)

### Fixed
- **geolearn keyterm token gap ([#106](https://github.com/WillWint2104/OnlineLessonMaker/issues/106)).**
  geolearn themed the `==keyterm==` highlight (`.tp-hl`) only inside `.gl-prose`, while imperium and
  microhistory theme it globally — so keyterms rendered **unstyled in geolearn** everywhere outside prose
  (labeledGraphic callouts, timeline event bodies, any future `tpRich` block). **De-scoped the existing
  rule's selector** — `:root[data-theme="geolearn"] .gl-prose .tp-hl` → `:root[data-theme="geolearn"]
  .tp-hl` — so keyterms theme in *any* geolearn context, matching the other two themes. One selector
  change, no new rule, token-only (`color:var(--primary)`). Purely additive: the declaration is byte-
  identical to what `.gl-prose` already had, so existing geolearn prose keyterms are unchanged (verified
  computed-colour identical before/after); imperium + microhistory are untouched; all block markup stays
  byte-identical (CSS-only change). Clears the caveat noted on both new blocks at once.

### Added
- **`timeline` block — dated events on a connecting spine (Layer 5, §14; second new registered block).**
  A static vertical list of events expressing "change over time": each event is a date marker on a spine
  plus a card (title, body, optional image thumbnail, optional note). The event list **is** the content —
  no rail, no progressive disclosure (both would hide content from print / export / screen-readers for no
  comprehension gain); the only interaction is the shared reveal-pen and optional per-event image zoom.
  **One token-clean renderer** (`renderTimeline`) registered across all three pack themes — zero literal
  colour, every value from the Phase-1 slots, so imperium (purple/serif/soft), microhistory
  (maroon/mono/hard-offset dossier) and geolearn (teal/sans/soft) skin it for free. Reuses `tpRich`
  (`[[recordable notes]]` + `==keyterms==`), `tpImg`/`tpSrc` + the `imageSlots()` **walk** (per-event
  images auto-listed in the editor — no `PACK_IMG_SLOTS` entry), `tpZoomBtn`/`tpFocusImage` + the shared
  `data-tp-focus-open ↔ [data-tp-overlay]` handler (zoom, **zero new JS**), and `tpNotePen` + the shared
  `[data-tp-notes]` pen wiring. a11y: real `<button>`s (pen/zoom), `--focus-ring`, `:focus-visible, :focus`
  (inherited from the shared molecules). Namespace `tp-tl-`/`data-tl-` (verified unused; distinct from the
  legend's `tp-lg-`); the `.tp-img-real` in-flow reset is applied to event thumbnails (the 3b bug).
  Registry now carries **39 pairs** (13 types × 3); the 12 pre-existing types stay **byte-identical**.
  Editor: palette thumbnail, factory seed, type label, and an events inspector (`repeatGroup` over
  `date`/`title`/`body`/`note`). Schema: `{ type:'timeline', events:[{date, title, body, image?, note?}] }`
  (vertical only — no orientation field).
  - *Known token-scoping gap (inherited, not fixed here — [#106](https://github.com/WillWint2104/OnlineLessonMaker/issues/106)):*
    `==keyterms==` in an event body render **unstyled in geolearn** (its `.tp-hl` is `.gl-prose`-scoped),
    while `[[notes]]` reveal correctly in all three themes (`.tp-noteclause` is themed globally). Same gap
    as `labeledGraphic`; fixing it belongs in the #106 token pass, not a per-block override.
- **v2 Phase 3b — `labeledGraphic`, the first NEW registered block (Layer 5, §14).** Numbered markers placed
  at `x`/`y` percent over a static image, each linked to a callout in a sticky reading rail. The rail is
  BOTH the visual callout surface AND the **text-alternative** — a linear `<ol>` every marker maps to
  (`aria-controls` from each pin; `aria-current` on the active callout) so spatial content has a readable
  linear form for low-vision / screen-reader students. Markers are `<button>`s (native keyboard); a visible
  focus ring (`--focus-ring`) shows on keyboard, programmatic and AT focus; click / Enter / Space activates
  the matching callout (and moves focus to it). **One SINGLE token-clean renderer** (`renderLabeledGraphic`)
  is registered across all three pack themes — zero literal colour; every surface/ink/line/accent resolves
  from the Phase-1 token slots, so imperium (purple/serif/soft), microhistory (maroon/mono/hard-offset
  dossier) and geolearn (teal/sans/soft) skin it for free from the same function. Generalises the
  coin-workbench hotspot pattern to 2D (fixed %-coords; no 3D projection/occlusion/rotation). Registry now
  carries **36 pairs** (12 types × 3 themes); the 11 pre-existing types stay **byte-identical**. Editor:
  palette thumbnail, factory seed, type label, image well (`image`), and a markers inspector
  (`n`/`x`/`y`/`title`/`body`/`real` + caption + rail heading). Schema:
  `{ type:'labeledGraphic', image, markers:[{n?,x,y,title,body,real?}], caption?, railLabel? }`. Prefix
  `tp-lgr-` (distinct from the infographic legend's `tp-lg-`).
  - *Known token-scoping gap (reported, not hardcoded, per the token-clean rule):* geolearn's `.tp-hl`
    keyterm colour is scoped to `.gl-prose`, so `==keyterms==` inside a labeledGraphic callout render
    unstyled in geolearn (coloured in imperium/microhistory). Text stays readable; fixing it belongs in a
    token pass, not a per-block override.

### Changed
- **v2 Phase 3a — block registry (byte-identical dispatch refactor).** Replaced the three implicit theme
  monoliths (`IM_PACK`/`MH_PACK`/`GL_PACK`) with an explicit **type×theme registry**: `REGISTRY[type][theme]
  = renderFn`, populated by 33 `registerBlock(type, theme, fn)` calls that lift each existing renderer
  unchanged (same named functions — `packText`, `mhText`, `glText`, …). `renderPackSlide` now resolves
  `REGISTRY[s.type][theme]` instead of the inline `{imperium:IM_PACK,…}[theme][s.type]` lookup, preserving
  the `packFallback` default exactly (unknown type **or** theme → fallback). Theme-primary semantics kept —
  three renderers per type stay three renderers, just registered instead of switched; no convergence, no
  renderer touched, no new block. `THEME_TYPES` (editor palette order) is now built by `registerBlock` in
  registration order, matching the former `Object.keys(*_PACK)` order per theme (geolearn registered in its
  original key order so its palette is unchanged). **Proven byte-identical:** `renderPackSlide` output
  0-diff across all 11 types × 3 themes × Study + Present (78 scenarios); the registered (type,theme)→fn set
  matches the pre-refactor tables exactly (33/33) and `THEME_TYPES` order is preserved for all three themes;
  computed styles unchanged (the diff is dispatch-mechanics only — no CSS, no renderer bodies); `validate`
  green, 0 console errors. `labeledGraphic` (the first new registered block) is the separate Phase 3b.
- **v2 Phase 2c-i — modal WIRING unification (geolearn onto the pack overlay handler).** The forked
  geolearn modals (`glModal` — syllabus/resources/case-study on outcomes, key-terms on studyguide text,
  key-points on infographic, transcript on video) now ride the **shared pack overlay handler** instead of
  the bespoke `wireGeoModals` block: `glModal` emits `id` + `data-tp-overlay` (was `data-gl-modal`) and a
  `data-tp-focus-close` button (was `data-gl-close`); every trigger switched `data-gl-open` →
  `data-tp-focus-open` (incl. the geolearn `tpKeyTerms` open-attr). The now-dead `data-gl-open/modal/close`
  block of `wireGeoModals` was deleted (zero remaining references). **The `.gl-overlay`/`.gl-modal`/
  `.gl-mhead`/`.gl-mclose` skin and DOM structure are unchanged** — this is wiring only. Follows the
  existing glText focus-overlay precedent (already on the pack handler). While unifying, the shared close
  handler now returns focus to the opener on **every** close path (Esc, close-button, backdrop) — APG
  dialog contract; previously only Esc returned focus, so button/backdrop dropped it to `<body>`. Net: no
  geolearn regression (it already returned focus on all paths) **and** im/mh gain focus-return on
  button/backdrop close. **Proven (screenshot-gated, appearance-neutral):** open-modal screenshots
  before/after for all six geolearn modals are pixel-identical (max 26px / 0.002% sub-visible AA noise, off
  the modal); behaviour checklist passes identically on baseline and branch for all six modals (open ·
  focus-to-close-on-open · Esc-closes · Esc-focus-return · backdrop-closes · backdrop-focus-return ·
  close-btn-closes · close-btn-focus-return); im/mh term/focus modals still open/close (spot-checked) and
  now also return focus on close-button; `validate` green; 0 console errors. DOM/skin unification (2c-ii)
  and `mhQModal` (card-move) remain deferred. No focus-trap yet (2c-ii).
- **v2 Phase 2b-width — single width authority (`--tp-measure`).** Consolidated the ~25 per-wrapper
  `max-width` caps (ten values: 820/880/1024/1040/1060/1100/1120/1140/1180/1200) into two tokens on the
  `.tp-slide` block (Phase 1's home): `--tp-measure` (imperium 1140, microhistory 1140, geolearn 1200) and
  `--tp-measure-narrow` (880). **Decision:** cards widen UP to the canvas measure — nothing narrows.
  Collapsed to `var(--tp-measure)`: imperium `.tp-wrap/.tp-doc/.tp-gr-wrap/.tp-sa-wrap/.tp-wrap-hero/
  .tp-ocard/.tp-llwrap/.tp-ig-wrap/.tp-vwrap/.tp-kc-card/.tp-iwrap` (the eleven 1100s → 1140); microhistory
  `.tp-artwrap` (1120→1140), `.tp-mhcard` (1040→1140), `.tp-iwrap` (1024→1140), `.tp-sa-wrap` (1060→1140);
  geolearn `.gl-wrap/.gl-twrap/.gl-titlecard/.gl-ocard/.gl-outrowrap` (1200, **no visual change**). Removed
  the redundant `.gl-wrap.gl-mid` no-op modifier. **Kept deliberate (untouched):** every `ch` prose measure
  (`.tp-gr-wrap p`/`.tp-kc-q`/`.tp-ilead` 75ch, `.tp-igtasks-lead` 72ch, `.tp-prose p` 70ch, geolearn
  74/66/60/58/44ch); the narrow cards via `--tp-measure-narrow`/`.gl-narrow` (`.gl-kccard` 820, `.tp-doc`
  ~880, `.tp-outrocard` 780); the canvas 1280×720 frame; all overlay/focus panels; column gutters
  (`.tp-tgrid` 40px etc.); chrome (`.tp-hin`/`.tp-ohin`); present-mode board-fill (`.tp-vcard2`/
  `.tp-artwrap-present` 1180). **Proven (screenshot-gated, NOT byte-identical — widths intentionally move):**
  measured every wrapper before/after across all pack types × 3 themes — every shift is widen-or-same
  (imperium +40; microhistory +20/+80/+100/+116; geolearn 0), **nothing narrows**, `canvasScrollW` stays
  1280 (no horizontal overflow), two-column grids still compose at 1140; the imperium `.tp-gr-wrap` 75ch
  cap keeps model-answer prose readable at the wider card. `validate` green; 0 console errors. (Vertical
  rhythm is the separate 2b-rhythm; modal convergence is 2c.)
- **v2 Phase 2a — reveal-answer button molecule extraction (byte-identical).** The reveal/submit-answer
  button was hand-inlined at 13 sites across the pack renderers (`mhInfographic`, `glGuided`, `glSource`,
  `glInteractive`, `mhGuided`, `mhInteractive`, `packInteractive`, `packSourceAnalysis`,
  `packGuidedResponse`), each writing the same `data-tp-reveal` / `data-tp-revname` / `data-tp-donelabel`
  button by hand and differing only in class (`.tp-reveal-btn` / `.gl-submit` / `.tp-submit`), icon
  (`lightbulb` / `arrowRight`, size 15/16) and label. All 13 now call one helper `tpRevealBtn(fid, {cls,
  icon, iconSize, iconAfter, label, submit, controls, revname, donelabel})` that emits **only** the
  `<button>`; every surrounding wrapper stays inline and untouched — the row (`.tp-trow` / `.gl-trow2` /
  `.tp-trow.tp-grow`), the hint span (`.tp-unlock`), and any trailing `mhQFocusBtn()`. Pure mechanical
  extraction, no width/spacing/modal/aesthetic change. **Proven no regression:** renderPackSlide HTML
  **0 diffs** and computed-style **0 diffs** across every reveal-button path × imperium/microhistory/
  geolearn × Study/Present (32 scenarios, 61 rendered buttons), `validate` green, no new console errors.
  (Width-token consolidation is the separate Phase 2b; modal convergence is Phase 2c.)

### Added
- **v2 Phase 1 — token slot layer (colour only, behaviour-preserving).** Foundation for the v2 token
  cascade (`docs/v2` Layer 1, §4), delivered as a byte-identical refactor. In each theme's `.tp-slide`
  block (geolearn, imperium, microhistory) the spec colour slots are declared as **aliases at their exact
  current values** — `--surface-2`, `--accent`, `--line`, plus two new slots `--focus-ring` (= current
  `var(--primary)` focus colour) and `--scrim`/`--on-scrim` (the fixed dark overlay `rgba(20,16,24,.82)`/
  `#fff` — deliberately **NOT** `--surface`, which is near-white and would re-break the #96/#97 invisible
  pill). Value-preserving literal sweep only where the token resolves identically: `color:#fff` →
  `var(--on-primary)` on `--primary` backgrounds inside `.tp-slide` (`.tp-notepen.on`, `.tp-media-play`,
  imperium `.tp-ref`, `.tp-pnum`), the focus outline → `var(--focus-ring)`, and the zoom pill →
  `var(--scrim)`/`var(--on-scrim)`. New opt-in cascade hook (`tpTokenStyle`): `LESSON.tokens` / slide
  `.tokens` inject whitelisted slot values inline on the `.tp-slide` root (theme → lesson → block, block
  wins); absent on every current lesson → byte-identical output. **Proven no regression:** renderPackSlide
  HTML 0 diffs and resolved computed-style 0 diffs across all 11 pack types × 3 themes × Study/Present,
  screenshots pixel-identical, `validate` green, 0 console errors. **Deferred to Phase 1b:** the `--ink`
  text-family (microhistory already defines `--ink:#1A1C1E` as structural border/shadow ink, distinct from
  its `--on-surface` body text — aliasing it changed 35 border colours, so it's left untouched; the
  canonical text token `--on-surface` already exists), and the spacing/type scales (per scope).
- **`lessons/agrippina-coinage-as-a-source.html` — new published lesson.** Byte-for-byte exported imperium
  lesson (9 slides, ~9.4 MB), "Coinage as a Source" case study on Agrippina the Younger. Embeds the
  same-origin `interactives/coin-workbench.html` (two-column build already on `main`). Self-contained per
  `validate` (video poster/links to YouTube are not third-party script/style hosts, same as the other
  published lessons). `validate` green.

### Changed
- **Source-analysis image uses the standard zoom button (visible + working).** The `sourceAnalysis` source
  image was the last slot on the old expand path: imperium/microhistory (`packSourceAnalysis`) rendered a
  `.tp-sazoom` pill (`rgba(255,255,255,.16)` white icon — invisible over a pale image like the Nero coin)
  wired to the legacy `data-expandsrc` lightbox, and geolearn (`glSource`) rendered a **dead decorative
  `.zoom` span** that did nothing. All three now emit the shared `tpZoomBtn(…, 'ov-zoom-source')` + a
  matching `tpFocusImage(…, 'ov-zoom-source')` overlay, so the source image is on the same id-targeted
  focus system (#89) as every other image slot and inherits the visible solid-pill + shadow styling (#96)
  — top-right, readable over any image, opens the shared zoom modal. Removed the now-dead `.tp-sazoom` and
  `.gl-srcpanel .zoom` CSS. Edit-mode suppression (`mode!=='edit'`) preserved; Present + export consistent.
  Byte-identical for image-less source slides in imperium/microhistory; geolearn image-less slides drop
  only the previously-dead zoom icon (now consistent with the other two). `validate` green, 0 console
  errors, verified in all three themes.
- **Source-image zoom button visible on light images (contrast fix).** `.tp-zoombtn` (the top-right
  "View larger" pill on source/reading images) was `background:rgba(20,16,24,.62)` with a white icon — on
  a pale image (silver coin, white background) the pill washed out to a bare icon. Now a near-opaque
  `rgba(20,16,24,.82)` pill with `box-shadow:0 2px 8px rgba(0,0,0,.45)` (hover deepened to `.95`); white
  icon and light border kept for contrast on dark images. The sibling `.tp-focusbtn` (light-pill reading
  control, which conversely vanishes on a *light* image) gets the same drop shadow — microhistory keeps
  its hard WW1 offset shadow via the existing theme override. Global (un-scoped) rules — pure contrast fix,
  no per-theme change; verified across imperium/microhistory/geolearn in Study + Present. `validate` green.
- **`interactives/coin-workbench.html` — two-column layout + control spacing (content-only).** Republished
  the coin workbench with its two-column layout (`grid-template-columns:minmax(0,1.55fr)`), a square coin
  stage (`aspect-ratio:1/1`, the spacing fix) and the zoom/turn controls moved below the coin
  (`.stagectl{display:flex}`). Full byte-for-byte replacement of the maintainer-supplied build (~8.06 MB);
  imperium theme intact (`#451274`, Playfair Display), zero stale WW1 tokens (`#840f16`, Courier Prime),
  all three coin models (`COIN_GLTF_450/500/510`) and the "ON THE REAL COIN" panel present; self-contained
  (only three.js license / XML-namespace URLs, no third-party hosts). `validate` green.
- **JSON import box — non-sticky template + Clear / Load example (editor UX).** The ⌗ *Lesson data ·
  JSON* panel no longer pre-fills the textarea with the current lesson on open, so there's nothing to
  delete before pasting an import — it opens empty with a faded placeholder. Two buttons added to the
  panel footer: **Clear** (beside *Load JSON →*) empties the textarea and any validation message, and
  **Load example** drops the current lesson JSON in on demand (the old auto-fill behaviour, now opt-in —
  handy for the copy-edit-reload workflow). `Copy`/`Download .json` are unchanged (they read `LESSON`
  directly, not the textarea). Editor-only: no theme/render/Present impact, no data-model change. Verified
  headless — open-empty, Load-example fills, Clear empties + clears the error, bad JSON still errors
  in-place, valid JSON still imports & closes, reopen stays empty; `validate` green, 0 console errors.

### Added
- **Key-term popups — `**bold**` joins the lookup + lifted to the shared imperium/microhistory text
  pages.** `tpRich` now runs the same key-term lookup for `**bold**` as it already did for `==term==`:
  when the slide carries `keyTerms`, a bold span whose text matches a term becomes the same clickable
  definition button; non-matching bold stays a plain `<b>` (byte-identical when no `opts.term`, so every
  existing pack text renderer is unaffected). The imperium (`packText`) and microhistory (`mhText`) text
  pages gain the optional `s.keyTerms` support geolearn's studyguide already had: matched terms in the
  body render as `.tp-kt` buttons paired by id with `tpTermModal` overlays, opened through the existing
  `data-tp-focus-open` → `[data-tp-overlay]` handler in `wirePackTyped` (no new popup system, no new
  host). New `.tp-kt` styling for imperium + microhistory mirrors geolearn's `.gl-kt`. Popups work in
  **Study and in the edit preview**; on the **board (Present)** term buttons render as the plain
  highlight/bold with no modals (teacher talks — no dead buttons). Slides without `keyTerms` are
  **byte-identical to main** (6/6 across imperium/microhistory/geolearn × Study/Present; geolearn
  no-keyTerm 2/2). Activates the dormant `keyTerms` on the conscription microhistory reading slide and
  extends geolearn's existing 5 studyguide slides to `**bold**` matches; `validate` green, 0 console
  errors, live open/close verified via close-button and Esc with correct id-paired disambiguation on the
  multi-overlay microhistory reading page.

### Changed
- **Imperium width parity, completion pass — the four page types #89 missed.** Unified-1100 bumps,
  all in imperium's own already-scoped rules (microhistory has separate `.tp-iwrap`/`.tp-cont`/
  `.tp-hsub` rules — untouched): `.tp-iwrap` 1000 → **1100** (the interactive/workbench page — the
  live-embed `.tp-iembedlive` is `width:100%` of the wrap and probe-measured at the full new width);
  `.tp-kc-card` 800 → **1100**; `.tp-ocard` 1000 → **1100**; `.tp-start`/`.tp-cont` 800 → **1100**
  with the hero inner rail `.tp-hin` 920 → **1040** (proportionate). **Prose guardrails** (probe-
  measured): the wider KC card stretched the question line to ~103ch and the interactive lead to
  ~131ch — both now capped at **75ch** (`.tp-kc-q` / `.tp-ilead`, imperium-scoped; the text column,
  not the card). `.tp-hsub` kept at its deliberate 512px subtitle measure (45ch — reads fine in the
  1100 hero, not orphaned). Swept all eleven imperium page types incl. interactive EMBED mode with a
  live iframe: every content card ~1100, no overflow, no prose > 75ch, KC options / outcomes /
  interactive-task grids composed. microhistory + geolearn `renderPackSlide` **byte-identical to
  main, 28/28** across themes × modes × types; Present unchanged (one-screen min-fit). `validate`
  green.

### Changed
- **`interactives/coin-workbench.html` restyled to the imperium theme (full byte-for-byte
  replacement).** The published coin workbench swapped for the maintainer-supplied imperium build:
  imperium tokens present (`#451274`, Playfair Display, `#ffe16d`), zero stale WW1 tokens (`#840f16`,
  Courier Prime), all three embedded coin models (`COIN_GLTF_450/500/510`) and the "ON THE REAL COIN"
  callout intact, still self-contained (~8.06 MB; only licence-comment URLs). `validate` green.
  Standalone content only — no engine or lesson files.

### Added
- **New interactive: `interactives/coin-workbench.html` (3D coin workbench — Agrippina dot point 14).**
  Self-contained 3D source-examination tool: three coin models embedded as data URIs
  (`COIN_GLTF_450/500/510`) with a vendored three.js — intentionally large (~8.06 MB), zero external
  hosts, no fetch calls, no blob URLs (sandbox-proofed by design; the only `https://` strings are
  three.js licence/spec comments and the W3C namespace constant). Published byte-for-byte as supplied
  by the maintainer — no reformatting. `validate` green (reports the file self-contained). Standalone
  file only — `lesson-studio.html` untouched.

### Changed
- **Imperium Study width parity with microhistory (#86 values).** `:root[data-theme="imperium"]
  .tp-wrap` max-width 800px → **1140px** and `.tp-main` padding `20px 16px` → **`16px 28px`**,
  matching the microhistory values shipped in #86. Imperium-scoped only; geolearn untouched. Pages
  with their own wrappers keep their designed caps (`.tp-doc` 880 for the text dossier / `.tp-ig-wrap`
  800 / `.tp-vwrap` 800 / `.tp-llwrap` 1000 / `.tp-gr-wrap` 880 / `.tp-sa-wrap` 1060 / hero 880) — the
  `.tp-wrap` pages (knowledgeCheck) span 1140 and every page gains the slimmer gutter. **Full parity
  pass:** the per-page wrappers now share one consistent **1100px** cap — `.tp-doc` (text dossier),
  `.tp-gr-wrap`, `.tp-ig-wrap`, `.tp-vwrap`, `.tp-llwrap`, `.tp-sa-wrap` and the title hero. The three
  shared `.tp-slide` wrappers (`.tp-doc`/`.tp-gr-wrap`/`.tp-sa-wrap`) are bumped via imperium-scoped
  **overrides**, not edits, so microhistory's packSourceAnalysis/guidedResponse keep their own caps
  (verified: mh `.tp-sa-wrap` still 1060). **Prose guardrail:** widening pushed guidedResponse model
  paragraphs to ~98ch, so gr prose is capped at **75ch** (`.tp-gr-wrap p{max-width:75ch}` — the column,
  not the wrap; textareas stay full width). Probe-measured all single-column prose: text narrative
  57ch, gr model 75ch, sourceAnalysis transcript 51ch, task questions 63ch — all ≤75ch. Re-swept all
  ten imperium page types at a wide viewport: no overflow, grids/asides composed, Present unchanged
  (one-screen min-fit, no scroll), geolearn + microhistory untouched. 0 console errors; `validate` green.

### Fixed
- **Source-image zoom renders at size in every mode + KC feedback hidden by default (engine, all
  themes).** Three related fixes. (1) **ViewBox-only SVG images collapsed to 0×0 when enlarged** —
  Chromium treats an SVG data-URI/file without width/height attributes as having no intrinsic size, so
  both the `#lightbox` image (sourceAnalysis `tp-sazoom`) and the focus-overlay `.tp-fimg` rendered
  invisible ("zoom opens nothing"). New `src`-targeted rules give SVG-sourced images a real box (the
  SVG's own `preserveAspectRatio` contains the artwork); rasters are untouched. (2) **Zoom buttons are
  now id-paired to their overlays**: `tpZoomBtn(label, id)` emits `data-tp-focus-open="<id>"` and
  `tpFocusImage(…, id)` emits the matching overlay id, across all six call sites (lesson image, visual,
  map, video still, artifact, text sidebar) — under the #81 generalised wiring a bare opener only
  resolves on single-overlay slides, so any future multi-overlay slide would silently kill the zoom.
  The bare fallback is kept and hardened: a bare opener now prefers the slide's single *unclaimed*
  (id-less) overlay, so bare focus-reading buttons keep working next to id-paired zooms. (3) **KC
  feedback cards were visible on fresh load in every mode** (not just Present): the
  `.tp-feedback[hidden]` guard was out-cascaded by the later, equal-specificity themed `display:flex`
  rules (`:root[data-theme]` = class-level). The guard is now `!important`, restoring hidden-by-default
  while the answer flow still toggles via the `hidden` attribute. Verified in Chromium across
  imperium + microhistory + geolearn, Study *and* Present *and* a real exported page: all five zoom
  sites open/close (button, scrim, Esc) with real image height for SVG and raster; the sourceAnalysis
  newspaper (SVG data URI) enlarges at 720px; KC fresh load shows no feedback, wrong → incorrect card
  only, right → correct card only + advance gate unlocked; options clickable in Present (real
  `<button>`s, covered by the existing #stage guard). 0 console errors; `validate` green.

### Changed
- **Study mode scales to width — no more letterbox gutters (engine, all themes).** `fitCanvas` used
  `min(sw/1280, sh/720)` for fit-layout slides in every mode, so on short/wide windows Study
  letterboxed dead canvas-background either side of every slide. Study/Edit now width-fill:
  `s = min(sw/1280, 1.3)` (capped, so ultrawide monitors don't balloon the type); when the scaled 720
  exceeds the viewport, the stage scrolls vertically via the existing `!fitsH` path (`overflow:auto` +
  `align-items:flex-start`, top edge reachable). The editor's 0.46 legibility floor is kept, and the
  edit-only pack-scroll path adopts the same width-fill scale. **Present is byte-identical** — its
  branch computes the same one-screen min-fit expression as before (verified numerically:
  `s === minFit`, `overflow:hidden`, centred). The worksheet/print overlay and Export never route
  through `fitCanvas` (verified), so they're untouched by construction. Scroll-layout slides keep
  their existing `sw/1280` behaviour. Swept in Chromium: wide (1500×900) Study across microhistory +
  imperium + geolearn × six page types → zero gutter; short+wide (1500×650) → gutter 0 (was ~271px of
  letterbox at s=0.662, now s=0.898) with top and bottom reachable by scroll; narrow (1000×800)
  unchanged (already width-limited); ultrawide capped at 1.3. 0 console errors; `validate` green.

### Added
- **New interactive: `interactives/versailles-terms.html` (Terms of the Treaty).** Self-contained
  tap-to-sort activity: nine real Treaty of Versailles terms (incl. Article 231, the War Guilt Clause)
  sorted into Territory / Military / Money / Blame, with per-term explanations on wrong placement,
  expandable category definitions, progress counter and reset. Zero third-party hosts (inline CSS/JS,
  system/monospace font stack) — `validate` green. Smoke-tested in Chromium: sorting, rejection
  feedback and reset all work with 0 console errors. Standalone file only — `lesson-studio.html`
  untouched.

### Changed
- **Microhistory Study pages use the canvas width (supersedes the width half of the #85 entry below).**
  On wide screens the 1280×720 canvas letterboxes by design (fitCanvas untouched), but microhistory
  content added a second gutter inside it. Three CSS-only, microhistory-scoped values: (1) `.tp-main`
  side padding 40px → **28px** (all page types); (2) `.tp-wrap` max-width 1024px → **1140px** — pages
  with their own wrappers keep their caps (`.tp-artwrap` 1120 / `.tp-sa-wrap` 1060 / `.tp-iwrap` 1024 /
  `.tp-gr-wrap` 880, all ≤1140 so nothing overflows); (3) `.tp-vcard2` max-width → **100%** so the
  Study video card fills the wrap with no inner gutter beyond the `.tp-main` padding. Verified across
  all 11 microhistory slide types: no horizontal overflow, grids intact, prose measures unchanged.
  Present is untouched — the #81/#82 rules keep their own 1180px caps (verified) — and imperium +
  geolearn are byte-identical (theme-scoped CSS only; imperium keeps its own `.tp-main` padding).

### Fixed
- **Microhistory video page (Study): card width matches the text pages + WATCH FOR keys wrap cleanly.**
  Two CSS-only, microhistory-scoped fixes: (1) `.tp-vcard2` `max-width` 896px → **1024px** so the Study
  video card is no longer visibly narrower than the text pages' 1024px `.tp-wrap` (Present keeps its own
  existing 1180px override from #82, untouched). (2) `.tp-mrow` switches from flex `space-between` to
  `grid-template-columns:minmax(110px,auto) 1fr` (+`text-align:right` on the value, preserving the
  key-left/value-right look) so keys like "The four punishments" hold one or two clean lines instead of
  wrapping mid-word against their values. `.tp-mrow` is emitted only by `mhVideo`'s Study sidebar and the
  rules are `:root[data-theme="microhistory"]`-scoped, so imperium + geolearn are byte-identical and the
  Present video layout is unchanged.
- **Editor: the Links panel now covers `interactive` and `sourceAnalysis` slides (not just `video`), and
  source slides gain an optional source link.** Extends #83's inspector **Links** panel via
  `PACK_LINK_SLOTS`: `interactive` slides get **Interactive / activity link** (`s.url`) + **Launch button
  label** (`s.launchLabel`) — both already consumed by `packInteractive`/`glInteractive`, so pasting a link
  makes the launch button appear live; `sourceAnalysis` slides get **Source link** (`s.sourceUrl`) +
  **Source link label** (`s.sourceCta`). To make the source field meaningful, `packSourceAnalysis`
  (imperium + microhistory) now renders an opt-in "View source online ↗" link in the source panel when
  `s.sourceUrl` is set to an **absolute http(s)/protocol-relative** URL (same allow-list guard as
  `sourceFallback` — blocks `javascript:`/`data:` hrefs) — **byte-identical when unset**. geolearn is
  untouched: its `glSource` has no
  source-link slot, so the Source-link field is suppressed for the geolearn theme and no geolearn output
  changes. All link bindings stay top-level (setP doesn't create missing parents). New: per-slot
  placeholder text and the shared `.tp-srclink` link style.
- **Editor: the video inspector can now attach the video link + watch button.** A new **Links** panel
  (parallel to the Images panel, and always shown for the current pack slide type) gives the video slide
  two fields — **Video link** (`s.url`, feeds `toEmbed` + `tpVideoPoster`) and **Watch button label**
  (`s.metaCta`). They bind `slides.<i>.<field>` and re-render the canvas on input, so pasting a YouTube /
  ClickView link makes the player embed, poster and watch button appear live. Previously the video
  inspector only exposed the still image, so there was no way to attach the video itself. Editor-only —
  published output is unchanged. (`PACK_LINK_SLOTS` / `linksSection`, driven by the existing
  `[data-bind]` wiring.)
- **Editor: "fit" pack slides can now be scrolled in edit mode.** A fit slide whose content exceeds the
  1280×720 board (e.g. a video slide's lead + WATCH FOR box) was clipped by the fixed-height,
  `overflow:hidden` canvas, so the author couldn't reach or select content below the fold. In **edit mode
  only**, pack fit slides now lay out at their natural height and the stage scrolls, so every part is
  reachable and selectable. Implemented as an edit-scoped path in `fitCanvas` (natural height + stage
  scroll, keeping the legible fit-scale) plus `body.edit .canvas.scroll` rules that give the pack
  `.tp-slide` flow height (it is `position:absolute`/`height:100%` in a fixed board) and drop the inner
  `.tp-main`/`.gl-main` scroll clip. **Present / Study / Export never take this path**, so published
  rendering is byte-identical for all three themes.
- **Microhistory video: watch-link no longer collides with the "Video still placeholder" label.** `.tp-vlink`
  and `.tp-vph` both sat `top:14px;left:14px`, so a posterless video rendered the "Watch on YouTube" button
  on top of the placeholder label. `.tp-vlink` now sits **top-right** (`right:14px`, no `left`) so it can
  never overlap the top-left placeholder — the same fix already applied inside the #81 text media overlay.
  Applies in **all modes**; on postered videos it's a cosmetic move (button top-right on the poster).
  microhistory-only (imperium's own `.tp-vlink` is a separate rule, untouched).

### Changed
- **Microhistory video page: content-first Present layout.** In Present, `mhVideo` now runs the same
  thin-chrome / hero-in-a-bordered-card pattern as the #81 text page: a slim header (eyebrow + title; the
  date is dropped), the dossier player **card fills the board** with the player as the hero, and beneath it
  the lead plus a **compact "watch for" strip** — the metadata rendered as slim inline key/value chips in a
  bordered container (`.tp-vwatch`) instead of the boxed sticky `.tp-artside` sidebar. Single-column, no
  dead column, and all content stays inside the card (never on bare `--canvas`). **Study is unchanged**
  (still the boxed `.tp-artside` metadata panel) apart from the watch-link relocation above — verified
  byte-identical `renderPackSlide` output. All Present rules are theme + `data-tp-type="video"` scoped, so
  imperium/geolearn and the other microhistory slide types are untouched.

### Added
- **Microhistory text page: typed media container + focus overlay (Study *and* Present).** A text slide
  can carry an optional `media:{ type:"image"|"video"|"interactive", src|url, poster?, still?, caption?,
  note?, button? }`. Media never renders inline — it renders as **one typed dossier control** in the
  reading (image → "View plate", video → "Play video", interactive → "Open interactive"; `media.button`
  overrides the label). The control is a maroon `span[role=button]` (not a `<button>`, so host button CSS
  can't blank the fill) that opens a focus overlay (`.tp-fpanel-media`): a framed **image** + caption +
  note; the **video** player (reusing the existing `data-tp-playembed` swap-to-iframe path, with the
  watch-link moved standalone top-right so it never overlaps the placeholder label); or the **interactive**
  still + an "Open interactive" launch (reusing `tp-ilaunch`). No new host — reuses `toEmbed` /
  `tpVideoPoster` / the interactive markup. **Back-compat:** a legacy `sidebar.image` (with no `media`) is
  synthesised into an image plate, so the old inline aside figure becomes a "View plate" button+overlay.
- **Microhistory text page: content-first Present layout.** New optional `lead:"…"` and
  `points:[{term,text}]` fields. In Present, a thin header (eyebrow + title) sits above a bordered reading
  **card** (surface + 2px border + dossier shadow) that fills the board — text never sits on bare
  `--canvas`. The card shows `lead` + numbered `points` (terms bold, `==keyterms==` via `.tp-hl`), falling
  back to `body[]` paragraphs when `lead`/`points` are absent. The secondary aside (insight/note/progress/
  resources) is dropped in Present; media stays the button+overlay only. No dead column. Study keeps the
  existing `body[]` reading and its insight/note/progress/resources aside (only the inline figure moves to
  the media button).

### Changed
- **Focus-overlay wiring generalised to support multiple overlays per slide.** Open controls may now
  reference their overlay by id via `data-tp-focus-open="<overlayId>"`; a bare `data-tp-focus-open` still
  falls back to the slide's single `[data-tp-overlay]` (back-compat for image-zoom / source-stimulus).
  `[data-tp-focus-close]`, scrim-click and Esc each close their containing overlay; `span[role=button]`
  controls open on Enter/Space and stop the click bubbling so Present's click-to-advance doesn't fire.
  This lets the microhistory text slide run the **Focus-reading overlay and the media overlay
  independently on the same slide**. Imperium/geolearn use only single, bare-referenced overlays, so their
  markup is byte-identical and their overlay behaviour is unchanged (verified). Supersedes PR #80's interim
  Present-text rules (kept #80's video `.tp-mk`→`.tp-mkey` fix and its video-Present `.tp-artside`/`.tp-vcap`
  rules; the text page now uses the content-first card layout instead).

### Fixed
- **Microhistory video "WATCH FOR" labels no longer overlap their descriptions.** The metadata
  sidebar rows reused the class `.tp-mk`, which is owned by the infographic map-marker system
  (`:root[data-theme="microhistory"] .tp-mk{position:absolute;transform:translate(-50%,-50%)}` — for
  pinning dots on maps). That absolute-positioning + translate leaked into the video sidebar and yanked
  each key label out of flow on top of its value. Renamed the video key class to `.tp-mkey` (renderer
  `mhVideo` markup + the one `.tp-mrow .tp-mkey` colour rule); the map-marker `.tp-mk` /`.tp-mkdot`
  /`.tp-mklab` are untouched. Keys now sit as clean key/value rows beside their descriptions.

### Changed
- **Microhistory Present mode is presentation-first (this theme only).** In Present, the secondary
  boxes are dropped and the core text runs full-width: the text slide's key-idea aside and the video
  "WATCH FOR" box (both `.tp-artside`) are hidden, and the two-column layouts collapse to one
  (`.tp-artbody.two`, `.tp-tgrid`, `.tp-vcap` → `grid-template-columns:1fr`) so no dead column is left.
  All rules are scoped `:root[data-theme="microhistory"] body.present …` — deliberately out-specifying
  the theme's own `.tp-artside`/`.tp-vcap` rules (specificity 0,3,2 vs 0,3,0) and, crucially, **never**
  using a bare `body.present .tp-*` selector, so **imperium + geolearn share the `tp-*` DOM but their
  Present mode stays byte-identical to before**. Study / Worksheet / Export / edit views are unchanged
  for every theme.

### Added
- **Microhistory reading accessibility (this theme only).** (A) Larger reading text: main body prose
  (`.tp-prose p`, `.tp-comp p`) → **~20px**; small secondary text (context paragraphs, captions, notes,
  footnotes, insight quotes) → **~18px**; and the reading-heavy **sourceAnalysis + guidedResponse**
  in-slide question text (transcript, task questions; essay question, stimulus, scaffold guidance) →
  **~20px** — all via microhistory-scoped overrides (no shared/global size changed; skill/marks chips
  stay small). Text/source/guided slides use `.tp-scrollmain`, so the larger text scrolls rather than
  clips. (B) A per-page **"Focus reading" large-print mode** on `mhText` and `mhImageText` (rendered
  only when the slide carries prose): a `.tp-focusbtn[data-tp-focus-open]` opens a `role="dialog"`
  `[data-tp-overlay]` that re-presents the **prose students read** as **large print** (new `.tp-flarge`:
  **32px** / line-height 1.7, filling a ~980px modal without overflow, high contrast), reusing the
  existing shared focus open/close handler (Esc / close-button / backdrop, focus management). (C) For the
  **question** slide types — **sourceAnalysis** (microhistory branch) and **guidedResponse** (`mhGuided`)
  — each question container gets its own **"Focus"** button (`.tp-qfocusbtn[data-mhq-focus]`) that opens
  a **per-question focus modal** (`[data-tp-qmodal]`) showing **one question at a time** at large print:
  the question prompt + its source/scaffold context (transcript for source; essay question + stimulus for
  guided) in a `.tp-qmctx` header, and the student's **actual answer card moved into the modal** — so the
  **same textarea, reveal button, and reveal state** are used. The **model answer stays gated behind the
  existing reveal control**: it never appears in any large-print view before its reveal fires — verified
  by render test (open modal → question + answer box visible, model hidden; type + reveal → model shown).
  This **replaces** an earlier whole-slide read overlay for questions that concatenated the entire slide
  (including model answers) into one modal, which leaked the model pre-attempt. Modal wiring
  (`wirePackTyped`) is a no-op when no `[data-tp-qmodal]` is present, so it never runs for imperium/geolearn.
  Because `packSourceAnalysis` is **shared** with imperium, the per-question Focus buttons + modal are
  emitted **theme-gated** (microhistory only); imperium keeps the exact `tpFocusOverlay`, so its output
  stays **byte-identical**. `mhGuided` is microhistory-specific (imperium uses `packGuidedResponse`,
  left untouched). `mhInfographic` carries no sustained body prose, so it gets the size bumps but not the
  button. **imperium + geolearn renderers and CSS are byte-identical** — verified by a direct
  `renderPackSlide` comparison of imperium sourceAnalysis + all guidedResponse modes. New pieces: the
  `.tp-flarge` large-print class, the `mhQFocusBtn()` / `mhQModal()` per-question markup helpers, the
  move-DOM per-question modal wiring in `wirePackTyped`, and the microhistory size overrides. Verified by
  render (larger body text, no clipping; text/imageText open the 32px large-print overlay via the shared
  handler; question Focus modals show one question + context + answer box with the model gated until reveal
  fires, and Esc/close/backdrop restore the card to the slide; 0 console errors).

### Fixed
- **imVideo + mhVideo (imperium + microhistory video slides): the play button + poster are no longer
  dead.** The play affordance (`.tp-vplay` / `.tp-playbtn`) was decorative — no link, no handler — so
  clicking did nothing despite the slide carrying the clip in `s.url`. It now carries
  `data-tp-playembed="<toEmbed(s.url)>"` + `aria-label`, rendered active **only when `s.url` is set**
  (the empty-state placeholder is unchanged). A permanent themed fallback link (`.tp-vlink`) is added
  on each player to the raw `s.url` (`target="_blank" rel="noopener noreferrer"`, labelled from
  `s.metaCta` or `Watch on YouTube ↗`) so blocked embeds (e.g. ClickView) stay reachable. `wirePack`
  now wires `[data-tp-playembed]` (click + Enter/Space): it swaps the poster/still + fake controls for
  an inline autoplay `<iframe>` (`allow="autoplay; fullscreen"`, `allowfullscreen`) filling the same
  player frame; an empty embed falls through to opening `s.url` in a new tab, and the fallback link is
  kept in place after the swap. Reuses the existing `toEmbed`/`tpVideoPoster`/`tpSrc`/`tpImg` helpers;
  the iframe `src` is built at runtime from lesson data (no new third-party host — `validate` green).
  geolearn (`glVideo`) and all other renderers are byte-identical. Verified by render in both themes
  (poster→play swap; fallback link reachable before and after).
- **packText (imperium text slides): sidebar image container is always shown + expandable; NOTE box
  renders its body (and disappears when empty).** (1) The sidebar IMAGE container now renders on every
  text slide — the image when present (with a `tpZoomBtn` affordance + `tpFocusImage` overlay to view
  it enlarged, reusing #71), or the standard "Photo placeholder" drop-target slot when absent. (2) The
  empty-"NOTE" box is fixed: the note body is read from `text|body|content` and the heading from
  `title|label`, and a bare-string note is accepted; the box renders **only** when there's body text
  (no empty grey box). `packText` is imperium-only (microhistory→`mhText`, geolearn→`glText`), so this
  changes imperium text slides only; geo/mh text renderers are byte-identical.
- **packSourceAnalysis (imperium + microhistory): the source-panel zoom control now works.** The
  `tp-sazoom` control was a dead `<div>`; it's now a button that opens the source image enlarged in the
  existing `#lightbox` (via `data-expandsrc`, the same mechanism srcframe/taskimg/ex-img use — no new
  lightbox), shown **only** when `tpHasImg(src.image)` (no dead control on the placeholder). The
  transcript "Focus reading" overlay is unchanged. (The image zoom uses `#lightbox` rather than the
  `tpFocusImage` focus overlay because the focus handler is one-overlay-per-slide and that overlay is
  already used by the transcript Focus-reading on the same slide — this keeps both controls working
  with no handler change.) Byte-identical for every current lesson (no current lesson has an
  image-bearing packSourceAnalysis source).

### Added
- **interactive slide type now renders in imperium + microhistory (shared `packInteractive`).** Both
  themes previously had no `interactive` renderer, so those slides fell through to `packFallback`
  ("not yet available in this theme") — microhistory's `mhInteractive` also tried to cram a live
  iframe into a small box. New shared `packInteractive` mirrors geolearn's `glInteractive` pattern — a
  stand-in still (via `tpMedia(s,'interactive',{…,affordance:false})`, placeholder when empty) + an
  "Open the interactive ↗" launch link (`s.launchLabel`, only when `s.url` set) + a numbered "How to
  use this interactive" steps list — but wears the pack chrome (`packHead`/`packFoot`, the shared
  `.tp-sa-*` header + `.tp-i*` layout). Two modes: **LAUNCH** (default) shows the stand-in still + the
  launch link (firewall-safe — no live iframe); **EMBED** (`s.embed === true`, with `s.url`) plays the
  activity inline in a generously-sized iframe (full-width, `min-height:560px`, `sandbox`/`loading=lazy`/
  `referrerpolicy=no-referrer`) so light activities (sorter, sentence-builder) run in place, with the same
  launch link beneath as a fallback when the embed is blocked. The iframe `src` is built at runtime from
  same-origin lesson data, so no third-party host is added (`validate` green). `s.questions[]` render as type-and-reveal tasks reusing
  `packSourceAnalysis`'s task markup (`data-tp-block`/`-field`/`-reveal`/`-model`), so the existing
  `wirePackTyped` reveal logic drives them with **no new wiring**. Registered under `interactive` in
  both `IM_PACK` and `MH_PACK`. Microhistory reuses its existing `.tp-i*` CSS; a parallel imperium
  `.tp-i*` block (rounded cards, pill launch, serif questions heading) was added, both scoped to
  `[data-tp-type="interactive"]`. geolearn's `glInteractive`/`GL_PACK` left exactly as-is. Verified by
  render in both themes (no fallback; preview/launch/steps/questions present; reveal gating works;
  graceful with none of url/steps/questions). `validate` green.
- **Imperium pack: "view larger" (focus overlay) on image-bearing slides.** `imImageText`,
  `imInfographic` (map), `imVideo` (poster/still), `imOutcomes` and `imKnowledge` (artifact) now
  show a small zoom affordance over their image that opens the image enlarged in the **existing pack
  focus overlay** (`data-tp-focus-open` → `data-tp-overlay`, driven by the existing content-agnostic
  handler — no new lightbox, no handler change). New shared helpers `tpZoomBtn` + `tpFocusImage`
  (an image-bearing variant of the focus panel) are called **only** by these imperium renderers.
  The affordance appears only when a real image is present (`tpHasImg`) and not in edit mode; never
  on placeholders, the decorative `imTitle` hero, or video iframes. Imperium-only — geolearn +
  microhistory renderer output byte-identical; `packSourceAnalysis`'s existing Focus-reading
  unchanged. Verified by render (overlay opens/closes per type; image-less slide has no affordance).

### Fixed
- **External interactive slide: the image case now has an expand-to-lightbox affordance.** The
  `external`-type `.ex-img` container rendered an image with no way to enlarge it. Added the standard
  `⤢` expand button (`data-expandsrc`, picked up by the existing delegated handler — no new JS, no new
  lightbox) for the **image** case only, in non-edit mode. The iframe case (`s.url`) is unchanged
  (it has allowfullscreen + its own launch — a lightboxed iframe would be redundant), and the empty
  placeholder is unchanged. One-line additive change in the legacy `renderCanvas` external renderer;
  pack renderers (imperium/microhistory/geolearn) byte-identical. (Audit note: the `artframe` flagged
  alongside it already opens in the lightbox via its existing Zoom/Detail buttons, so it was left as-is.)

### Changed
- **sourceAnalysis collapses to a single task column when there's no source** (no image,
  transcript or provenance) in `packSourceAnalysis` (imperium/microhistory) and `glSource`
  (geolearn). Previously the source panel always rendered, showing an empty "Source/Image
  placeholder" box on sourceless short-answer slides. Additive CSS modifier
  (`.tp-sa-noart` / `.gl-noart`) — slides that DO carry a source render byte-identically.
  Verified by render (conscription + refugee lessons) and per-theme sample regression.
- **GeoLearn `outcomes` no longer shows an empty "Image placeholder" panel when the slide has
  no image.** `glOutcomes` renders the image inside the left panel only when one is supplied; the
  panel (teal gradient + syllabus/resource buttons) stays when those buttons exist, and collapses
  to a single full-width column (`.gl-oone`) when there's neither an image nor buttons. Geolearn-only;
  imperium/microhistory byte-identical. Verified by render (refugee lesson + the geolearn sample).

### Fixed
- **Microhistory text: `==term==` / `==highlight==` no longer break sentences.** A stale
  `:root[data-theme="microhistory"] .tp-hl{display:flex}` left over from the Phase-2 in-slide
  header collided with the rich-text highlight span (also `.tp-hl`), turning each highlighted
  word into a block and forcing it onto its own line mid-sentence. Removed the dead rule so the
  inline `.tp-hl` styling applies and terms flow inline (as in geolearn). Microhistory CSS only;
  renderer output byte-identical across all three themes; verified by render.

### Added
- **GeoLearn `interactive` slides can carry answerable questions (mirrors mhInteractive #64).**
  `glInteractive` now reads `s.questions[]` (`{numeral?, question, marks?, skill?, model}`) and
  renders a full-width **"Questions"** block BELOW the embed + "how to use" row — each a `.gl-task`
  card (reusing glSource's task markup/classes/data-attributes) with a textarea + "Reveal model
  answer" button + model region, driven by the existing shared reveal JS (no new JS). No
  `questions[]` → renders exactly as before (byte-identical). `buildWorksheetGeo` emits those
  questions as answer-recording (question + marks/skill + ruled lines sized by marks; model never
  printed). Geolearn-only; microhistory/imperium renderers + their worksheets byte-identical.
- **GeoLearn theme (Geography) — a third self-contained pack theme.** Clean/flat/calm academic
  direction: teal-on-mint, **Inter** (reuses the already-vendored face — no web-font link), 20px
  rounded cards, hairline borders, a soft `0 1px 3px rgba(0,0,0,.06)` shadow. Registered as
  `data-theme="geolearn"` with the exact token palette and added to the theme selector, so
  `setTheme('geolearn')` works like the others. Bespoke renderers (universal top/bottom chrome,
  integrated icon-mark header on every type, locked sizing — fixed 64px/84px bars with the content
  region scrolling, core components never squished, automatic omission of empty optional blocks, and
  a branded teal gradient placeholder for missing images) for **all 13 types** — title, outcomes,
  text (article/studyguide), imageText (panel/gallery), infographic, video, knowledgeCheck,
  guidedResponse (short/extended), sourceAnalysis, interactive, outro — each a faithful port of its
  approved standalone mockup. **Reveal-notes** pen toggle on both text variants highlights author-
  supplied note clauses in place; **key-term glossary** modals on the study guide. Focused-card
  modals (Syllabus/Resources/Case study, glossary terms, infographic Key points, video transcript) with
  Esc/backdrop/×/focus-return; knowledgeCheck Continue-gated-until-correct + session-kept typed answers
  (submit-to-reveal) reuse the existing pack wiring. Self-contained: inline SVG icons, CSS variables,
  embedded font — `validate` stays green. Example: `examples/geolearn-sample.json` exercises every
  type, variant and mode.
- **Theme-aware slide-type registry.** The add-a-slide palette + preview now derive each theme's
  supported types from its actually-implemented renderers (`THEME_TYPES = keys(IM_PACK/MH_PACK/GL_PACK)`),
  so switching theme updates the list and only that theme's types are offered.

- **Embed images in the Images panel (drag-and-drop + file picker).** Each image slot in the
  Edit-mode Images panel now accepts an image **dragged from the desktop onto its thumbnail** or
  chosen via a **“Choose file”** native picker; the file is read with `FileReader.readAsDataURL` and
  stored as a **base64 data URI inside the lesson JSON** (fully client-side — no upload, no repo
  file, no third-party host), so it travels with the standalone exported page. Written through the
  existing shape-aware `setImgPath` (a bare `image` string, or `image.src` when the field is an
  object, preserving caption/tag). A data URI and a repo-relative path are interchangeable values for
  a slot — the path field still works; embedding is the primary flow. Accepts png/jpg/jpeg/webp/gif/
  svg, rejects non-images with a message, and shows a non-blocking warning over ~1.5 MB. Renders live
  in every pack slide type and both themes; **Clear** restores the gradient placeholder. Round-trips
  through ⌗ JSON export/import and the standalone-page export.

- **Images inspector panel (themed slide pack).** In Edit mode, selecting an `imperium`/`microhistory`
  slide now shows an **Images** section in the inspector that lists every image slot on that slide with
  a human-readable label (Hero image · Outcomes image · Sidebar image · Image · Map image · Video still ·
  Artifact image · Source image) and an editable **repo-relative path** field. Slots are detected
  generically across all pack types and both themes — the known per-type fields (`image`, `image.src`,
  `map.image`, `artifact.image`, `source.image`, `sidebar.image`) are always listed (even when absent, so
  a path can be added) and a recursive scan surfaces any stray `image`/`img` field. Typing a path updates
  the slide data and re-renders live with a small inline thumbnail; an empty field falls back to the
  themed gradient placeholder. **External URLs are rejected** (repo-relative only — the school firewall /
  `validate.mjs` allow same-origin assets); the actual image files are still added under `assets/` and
  committed separately. Inputs are labelled (`<label for>`) with logical tab order, and paths round-trip:
  they appear in the exported / ⌗ JSON and re-populate the panel on load. Still one self-contained file,
  no `localStorage`, no third-party host; `esc()` on every interpolation. `validate` green; verified in a
  headless DOM across both example lessons in both themes (slot listing, render-on-set, clear-to-placeholder,
  external-URL rejection, JSON export/import round-trip).
- **`guidedResponse` `mode:"quiz"`** — a numbered question list on a **single slide**, each question
  with its own answer box and a **Reveal answer** button that shows the model answer after a
  non-empty attempt (keyboard-operable, `aria-expanded`, announced via the slide's live region) —
  replacing the split question-slide / answer-slide pattern. Verified with `scripts/verify-pack-fixes.mjs`
  (both example lessons, both themes: images render + load, empty slots placeholder, title-not-video,
  quiz reveal). `validate` green.

- **Three new typed-answer slide types in the imperium + microhistory pack** — `sourceAnalysis`,
  `guidedResponse` (`mode: "short"` | `"extended"`) and `outro`. Extends the existing
  `renderPackSlide` machinery (shared DOM, theme-scoped CSS, reused chrome); existing types and
  themes are untouched. Features: per-task / per-paragraph **model answers revealed only after a
  non-empty attempt** (short mode locks the box after submit), **session-kept typed answers** in
  in-memory runtime state keyed by slide + field (restored on navigation, cleared on reload — no
  `localStorage`), **in-canvas scroll** between fixed header/footer, an accessible **Focus reading**
  modal (role=dialog, aria-modal, Esc/×, focus moves in and returns to the trigger), and the
  **outro hides its score tile gracefully** when no score stat is supplied. Accessibility baseline
  is always on: labelled textareas, focusable stimulus/question regions, `aria-live` reveal
  announcements, visible focus rings. The present-mode skip-guard is reused (`data-tp-done` = all
  boxes filled) so a background click can't skip an unanswered task. `SCHEMA.md` updated; worked
  examples `examples/{imperium,microhistory}-questions.json`. Verified with
  `scripts/verify-newtypes.mjs` (28 checks across both themes); `validate` green.
- **Published showcase lessons for the two new themes** — `lessons/imperium-scholar-sample.html`
  and `lessons/microhistory-archive-sample.html`, standalone self-contained exports of the
  `examples/*.json` worked lessons (all 7 pack slide types each), so the imperium/microhistory
  themes are directly viewable on the live site. Zero external requests; `validate` green.
- **Two new themes + a JSON-rendered "themed slide pack": `imperium` (Imperium Scholar · Rome)
  and `microhistory` (MicroHistory Archive · WW1).** When `meta.theme` is one of these, every
  slide is routed through a dedicated pack renderer (`renderPackSlide`) that reproduces the
  reference slide designs natively from JSON for seven types — `title`, `outcomes`, `text`,
  `imageText`, `infographic`, `video`, `knowledgeCheck`. Each theme has a distinct visual
  language (imperium: Playfair Display + flat tonal outlined cards, purple/gold; microhistory:
  Courier Prime + hard offset shadows, polaroid frames, paper-dot grain, dossier metaphor) with
  one shared header/footer component per theme. `knowledgeCheck` is interactive — selecting an
  option reveals feedback and **Continue stays disabled until a correct answer** (also gating the
  present-mode click-to-advance). Image slots render a themed gradient placeholder + "… placeholder"
  tag until a local asset path is supplied. Self-contained: only one new vendored font (Playfair
  Display, base64-inlined; Courier Prime/Inter/Hanken Grotesk were already vendored), inline CSS,
  inline SVG icons, no external host. All pack CSS is `tp-`-prefixed and scoped under the two
  themes, so the existing themes/renderers/published lessons are untouched (regression-tested).
  Adds `SCHEMA.md` (author-facing field reference) and one worked example lesson per theme under
  `examples/` (paste into ⌗ JSON → Load JSON). Verified with `scripts/verify-theme-pack.mjs` (all
  7 types render in both themes, fonts apply, placeholders show, knowledgeCheck gating works, zero
  external requests, existing `egypt` theme still renders via the engine); `validate` green.
- **Three published student lessons + two self-contained interactives.** Published as standalone
  Study-mode exports under `lessons/` (same wrapper / embedded `#lesson-data` mechanism as the POW
  lesson), hosted byte-for-byte as exported:
  - `lessons/the-scientific-investigation-file.html` — *Tutankhamun: The Scientific Investigation
    File* (Year 11, Egypt theme, 11 slides). Its `external` slide embeds/links
    `interactives/tutankhamun-dna-station.html`.
  - `lessons/seneca-burrus-and-the-freedmen.html` — *Imperial Court Relationships: Seneca, Burrus &
    the Freedmen* (Year 12, Rome theme, 10 slides).
  - `lessons/indigenous-wellbeing-in-australia.html` — *Indigenous Wellbeing in Australia* (Year 10,
    Wellbeing theme, 13 slides). Its `external` slide embeds/links
    `interactives/indigenous-population-pyramid.html`.
  - `interactives/indigenous-population-pyramid.html` — self-contained SVG population pyramid
    (Indigenous vs non-Indigenous age structure), hover/focus tooltips, zero external requests.
  - `interactives/tutankhamun-dna-station.html` — self-contained forensic DNA-analysis station
    (vendored), zero external requests.
  Verified with `scripts/verify-publish-batch.mjs`: both interactives load with zero external
  network requests; all three lessons render in their themes; the Year 11 / Year 10 `external`
  buttons resolve to the correct interactive URLs. `validate` green (lessons/interactives are
  warn-only; no external `<script>`/`<link>` hosts).
- **New `infographic` slide type — native data, no charting library.** Renders three variants
  drawn entirely from JSON as inline SVG/CSS (so figures scale with the zoom control and stay
  editable): **stat** (big-number cards with optional icon + delta chip), **bar** (labelled
  horizontal bars on a muted track), and **donut** (one SVG ring from `figures[0].parts` with a
  legend + optional centre label). Built on the existing theme tokens via a new data palette
  (`--data-1/2/3` = primary sage / secondary terracotta / tertiary sky), so every theme inherits
  it; Terra Anima (wellbeing) treatment shown in the screenshots. **Interactive, library-free:**
  hover / tap / keyboard-focus on any bar, segment, or stat reveals its exact value in a tooltip
  and dims the siblings; bars/donut animate once on load, suppressed under
  `prefers-reduced-motion` (the reveal still works). Inspector edits heading/eyebrow/intro/variant/
  source, the figures list (label/value/unit/pct/delta/colour token + add/remove/reorder) and, for
  donut, the parts list + centre label; palette entry added. The worksheet generator builds a
  "data table to complete + interpretation question" from `figures[].label/value/pct` and
  `figures[].parts`. No new third-party host. Verified with `scripts/verify-infographic.mjs`
  (20 checks: all variants render, tooltip reveal on pointer + focus, reduced-motion suppression,
  zero external hosts) — screenshots under `screenshots/infographic/`.
- **Published student lesson: `lessons/case-file-6-investigating-the-remains.html`** — the
  self-contained Study-mode export of Case File 6, hosted **byte-for-byte** as exported (live at
  `/OnlineLessonMaker/lessons/case-file-6-investigating-the-remains.html`). Embeds the
  first-party CT-scan interactive inline with an "Open ↗" fallback; its optional video slide
  carries a third-party YouTube URL (a `lessons/*.html` host warning is expected, not a failure).
  Verified rendered over HTTP via `scripts/verify-lesson-page.mjs`.
- **Case File 6 — "Investigating the Remains" loaded as the app's lesson** (11 slides, Egypt
  theme): swapped the `#lesson-data` JSON in `lesson-studio.html`. Its CT-investigation slide
  embeds the same-origin `interactives/tutankhamun-ct-scan.html` explorer.
- **`external` slides now embed their activity URL inline** (an `<iframe>` in the exhibit panel)
  instead of only offering a launch button — the existing **launch button stays as the "Open ↗"
  fallback** (school networks that block the iframe can still open it in a new tab). Image wells
  are used only when no URL is set. Verified with `scripts/verify-casefile6.mjs`.
- **Standalone interactive: "The Body of Tutankhamun" CT-scan explorer**, hosted at
  `interactives/tutankhamun-ct-scan.html` (live at
  `/OnlineLessonMaker/interactives/tutankhamun-ct-scan.html`). A self-contained React + Babel
  bundle with all assets inlined (zero external hosts — only the `w3.org` SVG namespace),
  shipped **byte-for-byte** as authored. `scripts/validate.mjs` now also scans
  `interactives/*.html` under the **warn-only** firewall/storage guardrails (no lesson-JSON /
  engine-JS checks, since an interactive is not a LESSON document). Verified rendered **served
  over HTTP** (the bundle requires a server; it fails on `file://`) via
  `scripts/verify-interactive.mjs`: real region tabs (FULL BODY / SKULL / LEFT THIGH / LEFT
  FOOT / THE VERDICT), no `[bundle] error`, and zero requests leaving localhost.
- **Inspector "media block" — centralised add / replace / remove / fit / focus / zoom for all
  media.** The Edit inspector now manages every image zone (cover hero, slide image, artifact /
  outcomes / worksheet / external image, source-image) from one panel block: a thumbnail (or a
  **"Drop an image or paste a URL"** drop area when empty), **Replace** / **Remove**, an image-URL
  field, a **Fit** segmented control (Cover / Contain → CSS `object-fit`), a **Focus & zoom**
  control (drag pad + 3×3 quick-pick → `object-position`; zoom 1.0–2.5× → image `transform: scale`),
  and — for the **cover hero only** — a **"Behind the gradient"** toggle + **Overlay strength**
  slider (full-bleed image behind the theme gradient at the chosen opacity, title/content on top).
  New per-media data (all with back-compatible defaults so existing slides are unaffected):
  `fit` (`"cover"` default), `focus:{x,y}` (0–1, default `.5,.5`), `zoom` (default `1`); cover adds
  `heroBg` (default `false`) and `overlay` (0–1, default `.66`). **Dropped-image fix:** dropping an
  image **file** onto the panel drop area *or* the selected media well on the (now scale-aware)
  canvas reads it as a data URL and embeds it **inline** in the lesson (self-contained / firewall-
  safe, no external host); dropping/pasting a **URL** sets the field. Render is identical across
  Study / Present / Export and survives Export; all URLs `esc()`-d. Interactive embeds keep their
  Activity-URL + Source-fallback fields (integrated, not duplicated); 3D models keep URL + remove.
  (Freeform crop is a deliberate separate follow-up.)
- **"Open source" fallback link on embed-bearing slides (video / external).** School networks
  block embeds (X-Frame-Options / policy), so an **always-visible** `<a target="_blank"
  rel="noopener noreferrer">` opens the original in a new tab even when the embed is present.
  Video renders the button below the embed; external reuses its existing **launch** button (no
  duplicate). New optional `slide.sourceUrl` (href = `sourceUrl` || the original media URL, so
  there's always a working link) + `slide.sourceLabel` (default "Open video ↗" / "Open the
  interactive ↗"), live-edited from the inspector's **Source / fallback link** field. In Present
  the link opens without advancing the slide (an `<a>` is already in the click-ignore list). All
  output is `esc()`-d; Study / Present / Export otherwise unchanged.

- **Slide-type palette** — a categorised, wireframe-thumbnail "add a slide" surface (Edit
  only, bottom strip) replacing the append-only chip menu. Category tags (All · Structure ·
  Text & notes · Media · Source & questions) filter a horizontally-scrollable row of
  hand-built wireframe thumbnails (one per type, with chevrons). **Drag** a thumbnail onto
  the slide list to insert a new slide at that position (the reorder drop-indicator is
  reused; a new-type token in `dataTransfer` distinguishes insert from reorder); **click** a
  thumbnail to insert after the current slide. New slides reuse the existing factory
  (extracted to `SLIDE_FACTORY` / `makeSlide`) and open selected in the inspector. Sidebar
  drag-reorder / ✕ / ▲▼ unchanged. STUDY / PRESENT / EXPORT and the data model unchanged.

- Dev tooling baseline (not part of the single-file app): `package.json` (dev-only
  `playwright`), `scripts/shots.mjs` (theme × slide screenshot harness),
  `.github/workflows/screenshots.yml` (informational PR artifact, non-gating),
  `.github/pull_request_template.md`, this changelog, and `docs/CHECKING.md`.

### Changed
- **Studio themes reduced to `imperium`, `microhistory`, `geolearn`.** Default lesson now starts EMPTY
  with a friendly empty-state (no "type not available" on a fresh editor); loading JSON whose type the
  active theme doesn't implement degrades to a calm in-canvas message instead of erroring.

- **Slides render on a fixed-aspect 1280×720 canvas that scales to fit (deck model).** The
  per-type layouts now lay out inside a logical 1280×720 `.canvas` which is scaled with
  `transform: scale(s)` (centred in the `.stage`) — **identical across Edit / Study / Present /
  Export**. FIT (default) `s = min(stageW/1280, stageH/720)`; SCROLL (`slide.layout==='scroll'`)
  `s = stageW/1280` and the canvas grows taller and the stage scrolls. `s` is recomputed by a
  **ResizeObserver on `.stage`** (reacts to the nav opening/closing, window resize, present
  chrome) — no window-resize listener. Present mode now uses the **same canvas + scale** (the
  old per-element `font-size:clamp`/`vh` present rules are gone — the uniform transform replaces
  them); Export clones the sizing script so a published lesson scales identically. Pointer→slide
  maths (hotspot drag-to-place, inspector zone selection) is **scale-safe** — it uses
  `getBoundingClientRect()` (post-transform) + percentages / `closest`, so no scale division is
  needed (verified: a hotspot dropped at a target lands at the correct %).
- **Rome "Imperial Scholar" theme — fidelity pass.** Retoned `:root[data-theme="rome"]`:
  warm-marble canvas (`#fff8f5`), **imperial-purple** accent (`#4b0082`) + **Roman-gold**
  (`#c5b358`) strokes, a **light** rail with a **gold** active-indicator bar (the active fill
  `--sidebar-2` equals `--accent`, so the bar is scoped gold), imperial-dusk hero, **hard
  purple "stone-slab" shadow** (`4px 4px 0`), **square** radius. New type (theme-scoped):
  **EB Garamond** display + **Source Sans 3** body / 600 UPPERCASE labels — Source Sans 3
  vendored via `@fontsource`/base64-inlined (no third-party host); **Cinzel removed** (rome
  was its only user). Motif: marble `--grain` + laurel `--motif` + mosaic-square list
  markers; cards = white + 1px gold stroke + 4px purple top bar. **Gold lives in scoped
  strokes / button text** (gold-on-purple, 7.7:1) — `--bd` (body text, 12 sites) and
  `--accent-ink` (chip text on light `--accent-soft`) stay **dark** so text is readable
  (the spec's gold there would be ~1.6:1). CSS tokens + motif + fonts only — no engine
  changes; STUDY/PRESENT/EXPORT + data model unchanged; other themes untouched. AH12 (Y12/HSC
  Ancient History) codes documented; a rome sample lesson is the place to wire them.
- **Wellbeing "Terra Anima" theme — fidelity pass.** Retoned `:root[data-theme="wellbeing"]`:
  off-white canvas (`#fbfaee`) + white sheets, **sage** accent (`#4f6144`), a **light**
  "command rail" sidebar (Egypt-style dark-on-light overrides, themed sage) with the active
  item flipped **white-on-sage**, misty-sage hero, **soft** sage-tinted ambient shadow,
  organic radius. New type (theme-scoped): **EB Garamond** display + **Inter** body / Inter
  600 UPPERCASE labels — Inter vendored via `@fontsource`/base64-inlined, EB Garamond gains
  **italic 600** (the sage accent word); validate still reports no third-party host.
  Motif: a topographic-contour `--grain` watermark + leaf `--motif` + topo-ring checklist
  bullets. `--accent-ink` kept dark sage (spec `#fff` would be unreadable on the light
  `--accent-soft`/surfaces); `--ok`/`--warn` themed sage/terracotta. Removed the now-unused
  **Fraunces** font (wellbeing was its only user). CSS tokens + motif + fonts only — no
  engine changes; STUDY/PRESENT/EXPORT + data model unchanged; other themes untouched. GE5
  (Stage 5 Geography) codes documented; a wellbeing sample lesson is the place to wire them.
- **WW1 "Great War Archive" theme — fidelity pass.** Retoned the `:root[data-theme="ww1"]`
  token block: warm-paper canvas (`#fcf9f0`), oxidised-crimson accent (`#6a020a`), slate
  "command-post" sidebar, dark sepia/charcoal hero, **hard stacked-paper shadow**
  (`3px 3px 0`), sharp radius. New type (theme-scoped, no other theme touched): **Archivo
  Narrow** display (UPPERCASE headlines), **Source Serif 4** body, **Courier Prime**
  eyebrows/metadata — vendored via `@fontsource` and base64-inlined (validate still reports
  no third-party host). New **motif** (coordinate-tick / crimson-stamp emblem) + a
  weathered-paper `--grain`. `--accent-ink` kept a dark oxidised crimson (the spec's `#fff`
  would be white-on-light-pink everywhere the token is used — unreadable); white-on-crimson
  chips noted for the polish pass. CSS tokens + motif + fonts only — no engine changes;
  STUDY / PRESENT / EXPORT and the data model unchanged. HT5 (Stage 5 History) outcomes
  codes documented in the theme; a dedicated ww1 sample lesson is the place to wire them
  (the shared seed stays Egypt/AH11).

- **Firewall hardening — `lesson-studio.html` now makes ZERO third-party requests.**
  Replaced the Google Fonts `<link>`/preconnects with base64-inlined `@font-face` for the
  exact families/weights previously linked (Hanken Grotesk, EB Garamond, Space Grotesk,
  Marcellus, Cinzel, Fraunces, Oswald); vendored `@google/model-viewer` to a same-origin
  file; swapped the seed 3D model from `modelviewer.dev/Astronaut.glb` to local
  `assets/vendor/sample-cube.glb`. Inlining fonts (~319 KB raw) keeps exported lessons
  font-complete with no external files. `scripts/validate.mjs` now **hard-fails** on
  third-party `<script>`/`<link>` hosts in the app (still only warns for `lessons/*.html`,
  where teachers may embed external video/images). _Caveat:_ exported lessons hosted under
  `/lessons/` reference model-viewer at a root-relative `assets/vendor/…` path — see
  HANDOFF §8 for the one-step fix when publishing a 3D lesson.
- **`deploy-pages` gains a `workflow_dispatch` trigger.** Auto-merge runs as
  `github-actions[bot]` (`GITHUB_TOKEN`), and GitHub doesn't fire workflows on
  `GITHUB_TOKEN` pushes — so the `push: main` trigger never runs on auto-merged commits.
  Publish the current `main` manually with
  `gh workflow run "Deploy to GitHub Pages" --ref main`.
- **Hosting switched from Cloudflare Pages → GitHub Pages.** Added
  `.github/workflows/deploy-pages.yml` (deploys the repo root on push to `main` via GitHub
  Actions); removed `deploy-cloudflare.yml`. Docs (HANDOFF §7–§8, README, `docs/CHECKING.md`,
  PR template, CLAUDE.md) updated to the live URL
  `https://willwint2104.github.io/OnlineLessonMaker/`. Note: GitHub Pages has **no native
  per-PR preview** — pre-merge visual review is the `screenshots` artifact + local
  `node scripts/shots.mjs`; open the live page after merge. Added `.gitattributes`
  (`* text=auto eol=lf`); dropped the now-unused `.wrangler/` ignore.

### Removed
- **Egypt theme removed from the studio engine + selector** (token block, selector entry). Legacy slide
  types (`cover`, `notes`, …) and the other legacy themes (`neutral`/`rome`/`ww1`/`wellbeing`) are
  hidden from the selector/palette via the manifest (their dormant renderers/CSS stay in the file).
  **Nothing under `lessons/` or `interactives/` was touched** — exported pages are unchanged.

- The old sidebar "Add a card" chip bar (`#addbar`) — superseded by the palette.
- **Edit-mode inspector** — replaces inline-contenteditable editing with a **clean,
  Study-identical canvas + a right-hand properties panel**. Clicking a tagged region
  (`data-zone`) selects it (2px accent outline) and loads its fields in the panel; typing
  updates the canvas live and persists to `LESSON` (no Apply button), preserving the
  selection. Questions (source/question) edit as add/removable groups in the scrolling
  panel; media zones show a URL field (drag-onto-the-well still works on the canvas). A
  per-slide **Layout** segmented control (Fit | Scroll → `slide.layout`) and editable
  **lesson meta** (subject / year / unit / outcomes codes → `LESSON.meta`, additive) live
  in persistent Slide / Lesson sections. The canvas is fully inert except zone selection
  (and draggable hotspots) — no inline-edit chrome, no live Study controls. Source-image
  **hotspot editing** (add / remove / kind / title / text) lives in the panel's media view
  (reused `poiEditor`); dots stay **drag-repositionable on the canvas**. **Edit-mode UI
  layer only — STUDY, PRESENT, EXPORT and the LESSON data model are unchanged.** Sidebar
  (drag-reorder / ✕ / ▲▼) unchanged.
- **Drag-to-reorder slides (Edit mode)** — slide-list items in the sidebar are now
  draggable (native HTML5 DnD, no new dependency); dropping rewrites `LESSON.slides` into
  the new order, with a drop indicator line between items. The ✕/▲▼ buttons are kept. The
  current slide is tracked **by identity**, so the slide you're viewing stays selected after
  a reorder. Edit mode only; re-renders after a drop. (Inline canvas text editing untouched.)
- **Present-mode discussion (A2)** — in Present mode, `source`/`question` slides render
  the teaching content but surface questions as numbered **discussion pills** (Q1, Q2 …)
  instead of inline answerable cards. Tapping a pill opens the question large in the
  lightbox (big readable prompt → click to reveal the model answer / "look for" /
  "pitfalls"). Pills don't advance the slide (treated like hotspots); clicking elsewhere
  advances as before. **Study mode is unchanged** — questions stay inline and answerable.
- **Per-slide `layout` (A1)** — optional `"layout": "fit" | "scroll"` (default = `fit`,
  current behaviour). `scroll` allows intentional long-form vertical scrolling; Present
  always uses `fit`.
- Root `index.html` landing page — self-contained (system fonts, no third-party
  requests), meta-refresh redirect to `lesson-studio.html` with a visible fallback link.
  Stops `https://willwint2104.github.io/OnlineLessonMaker/` returning 404; becomes the
  course hub later.
- `assets/vendor/` — vendored `model-viewer.min.js` (same-origin, not inlined) and a
  tiny self-contained `sample-cube.glb`. Dev-only generators: `scripts/vendor-fonts.mjs`
  (inlines latin woff2 from `@fontsource/*` as base64 `@font-face` + points model-viewer
  local) and `scripts/make-sample-glb.mjs`.

### Fixed
- **Edit preview no longer crushed by the side panels.** In Edit mode the fixed-aspect 1280×720
  preview now keeps a legible minimum scale (floored at 0.46) instead of shrinking arbitrarily as the
  nav + inspector eat width, and the stage **scrolls** when a floored slide exceeds the available
  area. Study / Present / Export keep the exact previous fit (no floor, maximise) so published
  lessons are unchanged.
- **Editable images on every pack slide type.** Image fields now accept a **bare relative path
  string** as well as an object (`{src,…}`); previously `imageText` only read `image.src`, so a
  natural `"image": "assets/foo.jpg"` was ignored and always showed the placeholder. A new shared
  `tpSrc()` normaliser routes every image slot (`title/outcomes/video.image`, `imageText.image[.src]`,
  `infographic.map.image`, `knowledgeCheck.artifact.image`, `text.sidebar.image`,
  `sourceAnalysis.source.image`) through `tpImg`, so a supplied path always renders an escaped
  `<img>` and an empty value still falls back to the gradient placeholder. (microhistory `outcomes`
  has no image area by design — its WW1 dossier reference has none.)
- **microhistory `title` no longer reads as a video.** Removed the large play-button overlay from
  the WW1 title hero; `type:"title"` renders the title/cover layout (hero + dossier meta footer +
  context cards) in both themes, matching imperium.

## Baseline — verified state at bootstrap (2026-06-20)

The single-file app (`lesson-studio.html`) carrying:

- **Three modes:** Study (student view), Edit (in-place authoring), Present (full-screen
  board mode — click / arrow-key navigation, no nav bar).
- **Slide types:** cover, outcomes (with NSW Syllabus Links popup), notes (with
  `==marker==` "record this" reveal toggle), image, video, question, source
  (text / image+hotspots / model3d), model3d, artifact, worksheet, external, complete.
  (`task` is dormant — render branch + factory retained, removed from the Add menu/seed.)
- **Interactive hotspots** on source images — percentage-positioned dots, `tooltip` /
  `window` / `video` kinds, drag-to-place in Edit mode.
- **Four topic themes** plus neutral: `egypt`, `rome`, `wellbeing`, `ww1` — swapped via
  `data-theme` on `<html>` (`setTheme`), pure CSS custom properties (palette, display
  font, corner radius, hero gradient, motif).
- **Stateless by design:** no backend, no database, no `localStorage`/`sessionStorage`;
  state is the file, persisted via Export (standalone study-mode `.html`).
- **CI:** `scripts/validate.mjs` gates on valid engine JS + parseable lesson JSON and
  warns on storage / third-party hosts.

Known follow-ups (see `HANDOFF.md` §9 roadmap): vendor fonts + model-viewer for school
firewalls, WW1 design pass, accessibility pass, decide the dormant `task` type.
