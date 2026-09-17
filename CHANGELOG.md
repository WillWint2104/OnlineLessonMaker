# Changelog

All notable changes to **Lesson Studio** are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); add a line for every PR so
"what changed and was it checked" stays visible (see `docs/CHANGELOG` note in
`docs/CHECKING.md` §Cadence).

## [Unreleased]

### Changed
- **Two alignment systems, not one axis per page** (`docs/atlas/composition-proof/`,
  `scripts/composition-proof-atlas.mjs`; no app change). Step 1 drove "everything shares the left
  edge" to its conclusion and the renders showed it was the wrong rule: a 10-column plate and a
  4-column illustration both hard against the reading's left edge, each leaving an obvious rail of
  nothing down the right. Symmetry was not the error and neither was the left edge — treating the whole
  PAGE as if it could have only one axis was. A row now declares which system it belongs to:
  - `reading` — start-aligned to the reading spine. Prose, worked solutions, comparison text, support.
  - `stage` — a media stage, centred on the page grid, for a standalone explanatory or primary media
    row. Its WIDTH still comes only from the approved role × geometry blueprint; the stage decides
    where the object sits, never how wide it is.
  - `within-reading` — supporting media centred inside the reading spine's own span, so it stays
    subordinate to the prose without being page-centred (a stage it has not earned) or shoved against
    the page edge (stranded).
  - **So two left edges are not automatically a defect.** A centred stage above start-aligned
    commentary is two named regions doing different jobs. Competing axes are invalid only *inside* one
    system, where siblings are meant to align.
  - **H1 was asking the wrong question** — whether every solo row on the page shared one axis. It now
    groups the solo rows by system and asks the same question of each group. Its axis branch had no
    drive, which regrouping could have quietly killed; one was added that shifts a single reading
    row's painted left edge, and it fires.
  - Prototypes rendered as candidates: `media.full/plate-wide-stage` (the same `wide` 10, centred) and
    `notes/notes-within-reading` (`inset` 4 at columns 3–6), with `notes/notes-page-centred-6` beside
    them for comparison. Both revisions pass; the page-centred 6 still fails **H6** independently — a
    `contain` object painted 564px where its authored presentation width is 420px.
  - **The portrait stage span, compared at 8 / 9 / 10** (`X4a`, `X4b`, `X1`, and the side-by-side
    `X5`). Centring the stage removed the horizontal imbalance and exposed a second effect: a portrait
    plane preserves its geometry, so span buys HEIGHT. Measured on the same fixture, same prose, same
    role, same desktop surface — 8 col **760×998** (1.11 viewports) · 9 col **858×1116** (1.24) · 10 col
    **956×1234** (1.37). The three clean pages are rebuilt side by side at one scale, because which of
    several legal pages reads as finished courseware is a question about the pages, not the rule.
  - **Nine columns cannot be a centred stage, and the refusal predates the question.** On a
    twelve-column grid (12 − 9) is odd, so a nine-column row has no symmetric page margin — it lands a
    half column (49px) off the grid on both sides. `layout` refuses it where the two alignment systems
    were written. It is rendered anyway, off the grid and labelled, because "what does 858px look like"
    deserves an answer; it fails **H1** and **H2** for exactly the right reason — the row declares ten
    columns and paints nine, leaving columns 2 and 11 declared and empty. Adopting it would be a
    decision to change the grid, not to pick a rung.
- **Two adoption decisions ruled.** A solo `support` row takes `narrow` (6 columns) on desktop — at the
  spine's eight it read as a second body section rather than the aside it is; tablet and phone recover
  to the reading width, because six of seven is not subordination but crowding. Applied as a transform
  so the rule is written once and cannot drift across patterns. And `notes` **stacks on tablet**: the
  5/3 pair was legal and unpleasant, and "the grid permits it" is not a reason to squeeze prose beside
  a callout.

### Fixed
- **The two shipping-catalogue defects: `media.full/centred` and `notes/measure`** (`docs/atlas/
  composition/src/patterns.json`, `scripts/composition-atlas.mjs`, `scripts/lib/slots.mjs`; no app
  change — `lesson-studio.html` does not reference the catalogue). Both centred their object over
  prose anchored to the left edge, giving the page two competing alignment axes. Replaced with the
  approved blueprint behaviour: `media.full/centred` takes `wide` 10 on the reading's own left edge
  (760 centred → **956 at `start`**, the `plate-wide` composition) and `notes/measure` takes `inset` 4
  (564 centred → **368 at `start`**, `notes-inset`), desktop and tablet.
  - **They were not a habit. They were enforced.** A correction to what the earlier report said twice.
    The control forbidding them is explicit: *"A row whose only named slot is media must therefore be
    centred or full — the left-inset 8-of-12 arrangement that started all this fails here."* Symmetry
    was the only way the catalogue could express "these columns are deliberate", so centring was the
    only legal answer.
  - **The control was stricter than the contract it enforces.** `vocabulary.json` has always defined
    `slotAnchor: start` as "hard against the left with free columns after it. REQUIRES a declared
    `anchorReason`" — an edge anchor with a stated reason is permitted. The control allowed only
    `center` and `full`, so `start`/`end` were unreachable. It now admits an unequal row that declares
    an `anchorReason`, which is the exception the vocabulary already wrote down.
  - **A transposed pair of branches, dead until now.** With `start`/`end` unreachable, no subdesign in
    the catalogue had ever anchored a slot to an edge — and `anchorFromAreas` returned `end` for a slot
    hard against the LEFT and `start` for one hard against the right. The comments beside the two
    returns described the geometry correctly and then named it backwards. The first subdesign to use
    `start` was rejected for "declaring `start` where its areas give `end`". A branch no fixture
    reaches is a branch nobody has read.
  - The narrowed control is now **subsumed**: every pattern has exactly one media-type slot, so the
    `slotAnchor` control reaches an unequal row first and demands the same reason. It is kept as a
    per-row backstop (`anchorFromAreas` judges only the first row holding the slot) and because it is
    where the founding defect is named — not as an independent gate, which it no longer is. Recorded
    rather than left looking like one.
  - Only **two** composition boards moved (`06-media-full-desktop-alternate` and its inspector), which
    confirms the anchor-name fix disturbed no existing `center`/`full`/`paired` subdesign.

### Changed
- **`worked.single` completed, and the catalogue's seven patterns are all expressed**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`; no app change). Its second
  authored variant `split` is rendered, and `flow` is rendered on all three surfaces — so **H18 now has
  a media-less blueprint to check responsive identity against**, where it previously had exactly one
  multi-surface blueprint to compare and that one carries a figure. It now compares two.
- **`admits` is a media-pattern declaration, and the media-less patterns say so.** `worked.single` and
  `worked.paired` declare none, which is not an oversight: `admits` names the presentation roles and
  geometry classes a pattern accepts, and both only exist where there is an object to have a role and a
  shape. Its job is to give `validate` a second declaration to cross-check the select table against, so
  a hole and a refusal stop looking alike. In a media-less pattern the table is keyed by an authored
  variant name and there is no second source — a missing variant is simply one nobody wrote, so there
  is nothing for a hole to be a hole in.
- **`visual.compare` re-expressed and re-rendered** (`docs/atlas/composition-proof/`,
  `scripts/composition-proof-atlas.mjs`; no app change). It had been schema-migrated twice — to
  solo/paired and to the six-class vocabulary — without anybody looking at it, and a migration is not
  an approval. Five blueprints on a left-edge spine, selecting by `presentationRole × geometryClass ×
  surface` like every other media pattern: `compare-plain` (no shared visual), `compare-tall`
  (`narrow` 6), `compare-measure` (`expanded` 8), `compare-wide` (`wide` 10), `compare-panorama`
  (`full` 12). The phone form now lives **inside each blueprint** instead of in a separate `stack`
  blueprint, which is what H18 is for — a separate blueprint per surface is simply never compared.
  `none` is an admitted class, not an omission: two cases and no shared visual is a real authored
  state and the common one.
- **A drive that had started firing the wrong control.** `select-outside-the-set` wrote
  `select.desktop.portrait = 'something-else'`, which reached the unapproved-blueprint refusal while
  `visual.compare` selected by class alone. Re-expressed by role × class, the same mutation reaches the
  new `admits` check first, and the original refusal quietly stopped being tested while the drive still
  reported a tick. A drive that fires the wrong control is a control that can no longer fail. There are
  now three: an admitted pair selecting an unapproved blueprint; a table widening past what the pattern
  admits; and an admitted pair with no composition at all.
- **`notes` expressed as composition blueprints, and the shipping two-origin defect found a second
  time** (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`; no app change).
  `notes-inset` (illustration at `inset` 4, for tall/portrait/balanced) and `notes-aside` (`narrow` 6,
  for landscape/wide/panoramic), both on a left-edge spine with every prose region on the measure. The
  brief pairs with the key ideas on desktop and tablet and **stacks on phone**, which approves no
  split at all.
  - **Prose beside prose pairs; an object beside prose does not.** `notes/brief` measures 4.05px apart
    plain and 111.69px at twice the prose, against a declared 180px tolerance — where
    `interactive.primary/beside` measures 487.02px against 160px. The pairing rule's objection was
    never "pairs are bad": it is that a height *derived from geometry* beside a height *someone wrote*
    has a gap no width can fix. Two written heights move together, and this is the demonstration.
  - **`notes/measure` centres its illustration (columns 4–9) over left-anchored prose (1–8)** — the
    same two-origin defect as `media.full/centred`, in a second pattern. Two patterns in the shipping
    catalogue independently centre their object over left-anchored prose, which suggests a habit
    rather than a decision. Recorded rather than rendered, for the same reason as before.
  - **Admitting a class you have not rendered, distinguished from claiming one.** `notes` admits all
    six classes while rendering three, and says why that differs from `interactive.primary`: there no
    frozen mapping for an instrument exists, so an unrendered class would be an unclaimed composition;
    here the frozen table already says what `supporting × class` gets, so selection is an application
    of a decision already made and what is missing is a picture. The image fixtures are 0.75:1, 1.0:1
    and 1.78:1, so tall, landscape and panoramic illustrations are unrendered, not unclaimed.
- **`interactive.primary` expressed as a composition blueprint** (`docs/atlas/composition-proof/`,
  `scripts/composition-proof-atlas.mjs`; no app change). `instrument-spine`: intro, the instrument at
  `wide` 10, the prompts and the synthesis, all on one centred axis. This is the arrangement the
  slot-span atlas already ruled in when it measured the shipping 8/4 `beside` pair at +472px.
  - **The cited number re-measured, and it does not match.** Rendered here the 8/4 pair fails H4 at
    **487.02px** against its declared 160px tolerance. The defect reproduces; the magnitude does not.
    The two atlases use different filler prose and this one puts a figure surface around the
    instrument, so the exact figure is a property of the harness. What transfers is the shape of the
    failure — an object whose height is derived beside prose whose height is written.
  - **A fixture gap is recorded as a fixture gap, not a refusal.** `interactive.primary` admits only
    `landscape` and `wide` because the permanent fixture set holds exactly two instruments, at 1.33:1
    and 1.78:1. Unlike `media.full` refusing `tall` — which has a reason anyone can check — there is no
    argument here at all, and the catalogue says so. The fix is a fixture, not a ruling.
  - **Open question, not decided:** whether the `interactive` slot type joins the role × geometry
    contract. `familyFor` short-circuits on `slotType === 'interactive'`, so an instrument never
    consults `media.<class>.<role>` and the frozen mapping does not reach it. Routing a slot type into
    the contract changes its reach rather than adding a catalogue entry, and the freeze was
    deliberate.
- **`media.full` expressed as composition blueprints, and a defect found in the shipping catalogue**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`; no app change). Two
  blueprints on a **left-edge spine** — `plate-wide` (`wide` 10, portrait and balanced) and
  `plate-full` (`full` 12, landscape, wide and panoramic) — with the reading inset to the measure
  beneath on the same left edge. The left-edge axis is what distinguishes the pattern from
  `visual.explanation` compositionally rather than only semantically.
  - A pattern now declares **`admits: {roles, classes}`** and `validate` checks the select table
    against it in both directions. `media.full` admits one role and refuses `tall` outright: the
    pattern is defined by the plane crossing the reading measure, and a tall plane cannot cross it
    without becoming enormous, so a tall object authored here is an authoring error whose fix is a
    different pattern. A missing select cell is no longer ambiguous between a declared refusal and a
    forgotten one.
  - **Defect reported:** `media.full/centred` in the shipping catalogue sets the media across columns
    3–10 (centred) over a reading across 1–8 (left edge) — two alignment origins on one surface. Each
    row is fine alone; the pair is not. It is **recorded rather than rendered**, because a blueprint
    declares one spine per surface and no rung on a centred axis resolves to 1–8, so the composition
    is inexpressible under the contract. A first attempt to render it as `paired` rows with a null
    sibling fired H2 and H4 — both artefacts of that encoding, not evidence about the design — and was
    removed. A counterexample that fails for the wrong reason proves nothing.
  - A media span family is again allowed more than one rung, and says why: with the ROW pinned to one
    rung there is nothing for an aspect ratio to climb, so the family is the union of what approved
    blueprints use for that class and role **across patterns**. `media.landscape.primary` holds `wide`
    and `full` because `visual.explanation` gives a landscape primary ten columns and `media.full`
    gives it twelve, and both are approved compositions of their own pattern.
- **The `tall → portrait` boundary moved from 0.60 to 0.70, and geometry calibration stopped**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`; no app change). At 0.60 an
  object could become *slightly less tall* and be promoted from the eight-column tall composition to
  the ten-column portrait one, ending up substantially TALLER: a 0.63 shape came out 956 × 1570 —
  1.74 desktop viewports — against 760 × 1371 for a 0.57 shape one class down. A categorical boundary
  that makes the result worse the moment you cross it is the failure the classes exist to prevent.
  - Probed at 0.67 / 0.70 / 0.73. The transition is monotone: 0.67 `tall` 760 × 1195, 0.70 `portrait`
    956 × 1432, 0.73 `portrait` 956 × 1381. The shape that moved the line, 0.63 at `primary`, goes
    from 1570px (1.74 vp) to 1259px (1.40 vp); the worst case on the portrait side falls from 1.74 to
    1.59 viewports.
  - The step itself is not claimed to be gone. Any categorical line between an 8- and a 10-column
    composition puts a step in the realised height of upright media. A new diagnostic reports the step
    either side of every declared boundary as evidence; nothing reads it back.
  - `portrait ≡ balanced` is recorded as an **accepted convergence**, not a defect and not merged. One
    composition family failing to distinguish square-ish from upright media does not make them
    globally the same thing, and no width is manufactured to justify the two labels.
  - The invariant is recorded in full: within one pattern family, `role × geometry class × surface →
    one named blueprint → one declared rung`. A neighbouring class MAY converge on the same blueprint;
    what is forbidden is the exact ratio subsequently changing the rung.
  - Two classifier defects fixed. `classify()` skipped only the `_` doc key, so a second prose key
    beside it matched every shape — it has neither a `from` nor a `below`, so both half-open tests
    passed and every object in the atlas classified as a comment. And it classified from the
    4-decimal DISPLAY-rounded ratio, which put the 0.70 boundary probe one ten-thousandth on the wrong
    side of its own line; it now classifies from the raw ratio.
  - **Geometry calibration is finished.** The vocabulary, the boundaries and the mapping are frozen;
    no width or height is re-tuned unless a real authored page produces a categorical failure.
- **The geometry vocabulary split into six classes, and the role × geometry mappings frozen**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`, `scripts/lib/slots.mjs`,
  `scripts/lib/figure-geometry.mjs`; no app change, nothing wired into the shipping catalogue).
  `tall · portrait · balanced · landscape · wide · panoramic`, declared as width:height and half-open
  upward, with ten boundary probes placed immediately either side of the five boundaries. Selection is
  now `presentationRole × geometryClass × surface → ONE named blueprint`, and that blueprint names ONE
  rung: a media row may declare exactly one, so the exact aspect ratio has nothing left to decide once
  its class is chosen. Acceptance is categorical — within one class, one surface, one role, every probe
  selects the same blueprint and the same rung.
  - **A correction first.** The previous pass's headline finding — `primary/portrait` has no approved
    composition for a 0.45:1 shape — was not true. `boxForWidth` seeds its height search from a guess
    at the engine's gutters and scanned a fixed ±80px around it; the seed's error is amplified by the
    aspect ratio, so the tall plane needed offset 98 at 722px, 148 at 956px and 190 at 1152px and every
    wide span silently missed. The atlas reported a property of the instrument as a property of the
    design. The solver now re-seeds once from what it measured and scans again; the change is additive,
    so every box that already solved returns the same first hit. `corpus-identity` 250/250
    byte-identical, `figure-render` 240/240, `figure-container` 65/65, `measure-surface` 191+180,
    `label-placement` 927/927 — all unmoved.
  - New blueprints: `spine-tall` (explanatory tall, `narrow` 6), `stage-tall` (**primary tall**,
    `expanded` 8) and `stage-panorama` (explanatory panoramic, `full` 12). `stage-primary-portrait` is
    renamed `stage-primary` — it serves `portrait`, `balanced` and `landscape`, and the old name read
    as a promise the catalogue does not make. `spine-reading` is withdrawn.
  - **`primary` is not `wider`.** `stage-tall` gives a tall object eight columns, not ten or twelve,
    and buys its primacy structurally: where `spine-tall` puts the object INSIDE the reading column
    (media 6, spine 6), `stage-tall` breaks it out past the reading on both sides (media 8, spine 6).
  - New controls. **H20** refuses an approved rung that cannot carry a member of its own class, and a
    realised rung that is not the declared one — the fallback the old ladder allowed. **H19** is now
    categorical: its "one blueprint, two rungs" escape hatch existed only because a media row could
    approve two rungs, and it is gone. An eleventh table-level refusal rejects a multi-rung media row.
  - **What the probes found.** Four of the five boundaries are load-bearing; **0.90 is not** —
    `portrait` and `balanced` select the same blueprint and the same rung at all three roles. Recorded
    in `frozen.convergences` rather than papered over with an invented width. And **0.60 may be too
    low**: a 0.63 object at `primary` is 956 × 1570 = 1.74 desktop viewports, *taller* than a 0.57
    object on the `tall` side at 760 × 1371 = 1.52.
  - Realised height and its share of a 900px viewport stay diagnostic evidence; nothing reads them.
  - Two measurement defects fixed. `measureMedia` compared the FIGURE SURFACE's box against a raster's
    intrinsic ratio, so an image inside a surface read as stretched when it was not — found when the
    new vocabulary first sent an image through a surface-enabled blueprint and three blueprints failed
    H5 for chrome they own. And H20's second drive rewrote a rung to `inset` on a record that already
    declared `inset`, a no-op that read as a control that could not fail.
  - The SHIPPING grammar has not moved: `atlas.json` still declares four classes and `classOf()` still
    reads them. Adopting six there is a migration that belongs with the blueprint system.
- **The geometry calibration atlas, and the span mappings demoted to candidates**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`, no app change, nothing wired
  into the shipping catalogue). The surface architecture and the role × geometry PRINCIPLE stay frozen;
  the exact span mappings do not, because they had been validated against one portrait shape and one
  wide shape.
  - **Six shapes, three roles, identical content.** `docs/atlas/composition-proof/src/calibration.json`
    varies nothing but the authored DOMAIN — 0.45 / 0.75 / 1.04 / 1.5 / 2.0 / 3.0 width:height — so the
    only difference between two renders is the shape of the plane. It chooses no widths and measures no
    prose: the class and the role are both categorical.
  - **`primary/portrait` has NO composition for a 0.45:1 shape.** Neither approved rung, `expanded` 8
    nor `wide` 10, can carry a 2.22 h/w plane at equal unit scale. The atlas reports that instead of
    crashing or inventing a width, and it is the sharpest evidence the vocabulary is too coarse.
  - **One class, one blueprint, two rungs.** At `explanatory`, the 0.45 shape falls back to `spine` 564
    while the 0.75 shape takes `expanded` 760 — forced by feasibility, not by measurement. **H19** now
    separates that FINDING from the FAILURE it would be if every preferred rung were feasible.
  - `landscape` holds 1.5:1 and 2:1 and treats them identically (901px vs 724px at primary); `balanced`
    does not separate explanatory from primary at all. Heights recorded as diagnostic evidence only:
    portrait/primary is 1.5 desktop viewports, tall/explanatory 1.35 at the NARROW rung.
  - **H19 · the geometry class selects, not the shape and not the height** — driven to failure.
  - Two false positives the new fixtures exposed in my own controls: H15 and H17 keyed their
    surface/no-surface and chrome/no-chrome pairs without the FIXTURE, so two different objects sharing
    a pattern, blueprint, class and viewport were compared against each other. Both keys now include it.

- **`presentationRole × mediaGeometry → approved named blueprint`, and the surface contract frozen**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`, no app change, nothing wired
  into the shipping catalogue).
  - **FROZEN**: treatment A · figure-surface ownership (`blueprint region → figure surface → plot →
    caption`) · the caption owned by the surface · the four boundaries independently inspectable · the
    presentation role authored and never inferred · responsive blueprint identity invariant · plot chrome
    cannot change the composition · internal surface whitespace is valid OWNED space · treatment B
    rejected · supporting portrait at centred `inset` 4 · explanatory portrait at centred `expanded` 8.
  - **PRIMARY DOES NOT MEAN MAXIMUM HORIZONTAL SPAN.** The full-grid primary portrait measured
    1152×1469: legal, because the page scrolls, and not a good default. `full` has been removed from
    every portrait span family, so a full-width primary portrait is not discouraged but INEXPRESSIBLE —
    `select` cannot name it and a blueprint approving that rung for portrait media is refused before
    anything renders. It survives in a new `candidates` bucket, which is validated and renderable and
    unreachable from `select`, and is rendered beside the approved version for comparison.
  - **The mapping is now role × geometry → NAMED BLUEPRINT**, not role → rung. The portrait ladder is
    368 / 760 / **956**; the wide ladder is 564 / 956 / **1152**. The same three roles, different
    geometry, different compositions — which is the whole argument for keeping both explicit.
  - New blueprints: `stage-primary-portrait` (centred `wide` 10), `spine-supporting-wide` (centred
    `narrow` 6) and `stage-wide` (centred `wide` 10); a `narrow` = 6 rung joins the ladder; `stage-full`
    becomes the primary WIDE composition, where the whole grid is the right answer.

- **The figure surface adopted, and presentation role separated from slot width**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`, no app change, nothing wired
  into the shipping catalogue). `figureSurface.enabled: true`, treatment A. **The concept is adopted; the
  exact dimensions are not.** What A proved is the ownership model — `blueprint → media region → figure
  surface → plot` — not that 760px is the right width for a graph.
  - **Treatment B is rejected and kept as a counterexample.** Shrink-wrapping the surface to the plot
    puts the plate at 564px, exactly the width of the six-column reading spine beneath it, so the
    composition says eight columns while the eye still sees six — the same under-realisation H11 rejects
    at the row level.
  - **SLOT WIDTH AND PLOT SIZE ARE DIFFERENT DECISIONS.** The catalogue now keeps four things separate:
    blueprint span (how much geometry the media owns) · surface (the complete visual object) · plot
    realisation (how the graph uses it while preserving scale) · **presentation role** (what the object is
    FOR). The role is AUTHORED and never inferred: the renderer may pick between the responsive forms of
    an authored blueprint, never read available space and conclude that a visual is important.
  - **The same portrait graph now takes three different named blueprints**, not one blueprint with a size
    calculation: `spine-supporting` at the new `inset` rung (368×528 surface), `spine-narrow` at
    `expanded` (760×998) and `stage-primary` at `full` (1152×1469, and allowed to be that tall because the
    page exists to explain it). The span family is keyed by geometry AND role.
  - **The caption belongs to the figure surface, not the plot.** The engine may supply the content; the
    surface renders and owns it, and any `tp-fig-cap` emitted inside the plot is lifted out. That is what
    generalises to images, diagrams, videos and interactives — surface header · media payload · local
    controls · caption. **H16** fails a caption found inside the plot.
  - **H17** the plot's own chrome may not move the surface or the span — proved by rendering the same
    blueprint with 21px bold axis labels and measuring an identical 760×998 surface and 722×906 plot.
    **H18** the same authored blueprint keeps its blueprint, role and rows across desktop, tablet and
    phone; only the rungs differ.
  - The overlay now draws **four** boundaries — region, surface, plot, caption — each independently
    inspectable, alongside the six space classifications.
  - Two of my own regressions caught by the run: a blanket namespace rename had turned the overlay's
    `data-cp-proof` selector into `data-pf-board` while the markup emitted the original, and the
    surface/no-surface invariance key omitted the viewport, so a phone baseline was being compared
    against a desktop render.

- **A semantic figure surface, prototyped and NOT enabled** (`docs/atlas/composition-proof/`,
  `scripts/composition-proof-atlas.mjs`, no app change, nothing wired into the shipping catalogue).
  `figureSurface.enabled: false` — both candidate treatments are rendered for comparison and neither is
  frozen. The grid, the solo ladder, the spine and the paired/workspace rules are untouched: the
  structural model is doing useful work and this pass is about making it VISUALLY LEGIBLE.
  - **The problem.** Both successful pages are structurally correct and neither says clearly enough that
    the graph, its caption and its graph-local controls are ONE VISUAL OBJECT, separate from the prose
    that interprets it. The separation existed in the blueprint and not in the courseware.
  - **THREE BOUNDARIES, KEPT APART**: the REGION the blueprint assigned, the SURFACE that groups the
    media payload, and the PLOT itself. The overlay draws all three as three boxes and adds a sixth
    space to the legend — INTERNAL FIGURE-SURFACE SPACE, which is valid precisely because it is inside
    an object the composition already owns, and is not the same thing as an unowned column in an
    active row.
  - **H12** a surface may not reach past its region · **H13** plot, caption and media-local controls are
    all inside it · **H14** the plane is painted at the size it was SOLVED for and its units stay equal ·
    **H15** turning the surface on changes no blueprint, spine, cardinality, rung or split. Each driven
    to failure.
  - **H14 caught a real defect on its first run.** The first build solved the plane for the REGION width
    and let the surface clamp it — 62.57px per x-unit against 65.94 per y-unit. A border had distorted
    the mathematics. The plane is now solved for the width it actually has, region minus a DECLARED
    chrome; and H14 was re-written to ask whether the plane is painted at the size it was solved for,
    because comparing two renders' aspect ratios was mis-calibrated at 1.8% against a legitimate
    re-rounding of the axis-label chrome.
  - **The A/B answer, measured: A.** Treatment B shrink-wraps the plate to 564px — exactly the width of
    the six-column reading spine below it — so it RE-CREATES AT THE OBJECT LEVEL the under-realisation
    H11 exists to reject at the row level, and it forces the slot to `contain`. Under A the surface takes
    the region, the plane keeps its geometry, and 38px of internal surface space is the only residue.
  - **Every rejection survives a border**: the half-row still fails H2 with a surface around its graph,
    and `side-study` still fails H4 at 535.5px. `practice.workbook` keeps its designed 5/7 relationship
    and `worked.paired` gets no surface at all.

- **The solo span ladder, and composition fitness as a second validation layer**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`, no app change, nothing wired
  into the shipping catalogue). A **proposal**. The previous pass solved OWNERSHIP and in doing so
  exposed the next missing rule: a structurally valid composition can still be aesthetically
  under-filled. `spine-narrow` was legally composed and unnecessarily timid — a 564px portrait graph
  alone in its row, with six columns of perfectly valid page margin either side.
  - **STRUCTURAL VALIDITY AND COMPOSITION FITNESS ARE TWO LAYERS, ASKED IN THAT ORDER.** Does every
    part of the active composition have an owner? Then: is the approved blueprint actually using the
    surface it was given? Neither is occupancy — nothing here measures a fraction, an area, a
    dead-space percentage or a content length.
  - **Horizontal relationship and vertical behaviour are now separate declarations.** `horizontal =
    solo | paired | workspace` · `vertical = hug | designed`. `hug`/`paired`/`workspace` had been doing
    double duty as both, which is exactly how a page could be structurally perfect and still timid.
  - **A row holding ONE region is a `solo` row and takes a rung from an approved LADDER** —
    `spine` (the blueprint's own span) · `expanded` 8 · `wide` 10 · `full` 12 at desktop — declaring
    which rungs it approves and which it PREFERS. The spine is an AXIS, not a width, so a solo row may
    climb to a wider rung and still sit on the page's one centre line. Increased height is not a
    failure: the page scrolls.
  - **What a region IS constrains which rungs are legal for it.** Prose is capped at the reading
    measure, so a paragraph does not expand to twelve columns merely because it is alone; portrait
    media gets `expanded`, balanced `expanded`/`wide`, landscape and wide `wide`/`full`. The family
    never invents a composition — the blueprint still chooses from within it.
  - **H11 · SOLO SPAN.** A one-region row fails if it remains at a smaller approved rung while its
    preferred rung is feasible. Feasibility is categorical plus one mathematical question: does an
    equal-unit box solve at that width.
  - **Eight proof boards**: the corrected `spine-narrow` (media at `expanded`, 8 col, 760px, equal unit
    scale 0.999); prose alone staying at the measure; a wide figure alone at `full`; `worked.paired`
    and `practice.workbook` UNCHANGED — the proof that the contract is scoped to cardinality 1 and does
    not simply make things bigger; and three counterexamples — the under-realised solo span (H11, the
    page the previous pass shipped as correct), the unowned half-row (H2) and `side-study` (H4).
  - **Ten controls and ten table-level refusals, each driven to failure.** Two findings from that: the
    reading measure and the centred axis bound only when a blueprint was WRITTEN DOWN and not when a
    rung was REALISED (found by a drive that did not fire; `layout` now binds both); and a blanket
    namespace rename had caught `.cp-key`, the kit's key-idea card, so the support region rendered with
    the board's legend styles (found by looking at the picture).

- **The alignment spine, the five-space taxonomy, and two frozen blueprints**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`, no app change, nothing wired
  into the shipping catalogue). A **proposal**, tightened rather than broadened: the previous entry
  proved blueprints were the right unit; this one makes the distinctions that pass exposed into actual
  structure, and renders only what it freezes.
  - **PAGE MARGIN, BLUEPRINT RHYTHM, INTERNAL BLOCK SPACE, UNCLAIMED COMPOSITION SPACE AND PAIR
    IMBALANCE ARE FIVE DIFFERENT THINGS.** They are kept apart in the schema, in the judge, in the
    overlay and in the verdict panel, and there is no generic whitespace rule, occupancy fraction or
    dead-space percentage anywhere.
  - **The spine is a first-class primitive and the one owner of the alignment relationship.** A
    blueprint declares one spine per surface — an axis (`centre` / `left-edge`) and a span — and a row
    is either ON the spine (holding one region, occupying it exactly, with the grid outside it as valid
    PAGE MARGIN) or ON the grid (an ACTIVE ROW, every column owned). A centred six-column spine and a
    six-column region at the left of a twelve-column active row occupy the same columns and are not the
    same thing; the primitive exists so the renderer cannot confuse them.
  - **The ownership boundary is frozen, and rhythm is no longer contaminated.** The block owns
    typography, the space between its steps and the padding a VISIBLE surface needs; the blueprint owns
    placement, spans, alignment, pairing and ALL spacing between semantic regions. A region hugs its own
    ink or surface at its exterior boundary (H10). **Every declared step now measures as itself** —
    `worked.paired`'s declared 56px read as 80.5px before this pass and reads as 56px now.
  - **Two blueprints frozen as golden**: `visual.explanation/spine-narrow` (one centred axis of six
    columns carrying object, reading and key idea) and `worked.paired/cases-6-6` (a left-edge spine of
    eight with a 6/6 pair that declares its origin, its width and a 180px termination tolerance —
    measured 0px apart).
  - **Two counterexamples retained as permanent regression proofs**: `unowned-half-row` (H2 — the
    canonical must-never-happen-again, the same six columns as the golden and not the same composition)
    and `side-study-imbalance` (H4 — a row that owns all twelve columns and still terminates 535.5px
    apart, proving complete column ownership is necessary and NOT sufficient).
  - **`practice.workbook` as the stress test.** The first genuinely workspace-shaped page, expressed
    with the same four ideas and no resolver. One extension earned it: a rhythm step may declare
    `gapWithin`, so a region spanning several rows is not cut by the rhythm beside it. It surfaces a
    real open question — the workspace's DESIGNED height and the reference stack's DERIVED height
    terminate 117px apart, which a `workspace` row is exempt from by definition.
  - **Nine controls and eight table-level refusals, each driven to failure in the same run.** One drive
    was found unable to fire — it injected padding on a region that paints its own top edge — and was
    fixed as a bad test rather than accepted.
  - **No sweep.** The other blueprints are migrated to the spine schema so the build stays whole and are
    not re-rendered or re-approved; their boards are not in the directory.

- **Approved page compositions, and the row contract — the Composition Proof Atlas**
  (`docs/atlas/composition-proof/`, `scripts/composition-proof-atlas.mjs`, no app change, nothing wired
  into the shipping catalogue). A **proposal**, built to be looked at. Discrete slot spans made every
  slot's width nameable and still did not make a **page**: a pattern remained a collection of
  *independently* legal slots. The shipped lesson is the proof — in
  `lesson-symmetry-visual-explanation-desktop.png` the graph is painted **683px wide at x = 60** in a row
  that runs to x = 1212, leaving **469px of an active row with no semantic owner**, at a width the grid
  does not name (its neighbours are 662px and 760px). The width came from an authored `mediaSize` token,
  decided in isolation from the composition.
  - **A pattern now resolves to a NAMED COMPOSITION BLUEPRINT, not to a set of spans.** A blueprint fixes
    the whole page: which rows exist, which columns each region takes, whether regions share a row or
    follow one another, how each row behaves vertically, and the named step between one semantic region
    and the next. The chain is `lesson intent → pattern → approved blueprint → slots and rows → media
    geometry selects among the approved blueprints → content fills it`, and every arrow is a lookup from
    a categorical input.
  - **The most important rule: no active row may contain unexplained columns.** A row holding one
    six-column media slot may not take columns 1–6 and call 7–12 margin — it must be centred in the row,
    accompanied by another semantic region, widened to an approved footprint, or moved into a different
    row composition. **Free columns beside media are never a reading margin**, because media has no
    reading measure to be bound by.
  - **The row contract, which is the axis the span layer did not have.** `hug` (the row is exactly as tall
    as its contents) · `paired` (two siblings share a row on a **declared alignment origin**, with a
    declared **`imbalanceMax`** and a **`pairReason`**) · `workspace` (a height that is designed rather
    than derived). A pair that has not said how far its children may end apart is refused before anything
    renders.
  - **Rhythm is declared, not accumulated.** The gap between two semantic regions is a named step —
    `tight 16 · normal 32 · section 56` — rendered as a real grid row of exactly that height. That is the
    entire difference between `worked.single/flow` and `worked.single/split`: identical widths, different
    rhythm.
  - **`worked.paired` now exists.** It was asked for three corrections ago and had never been designed:
    `intro-8 / worked-6-6 / synthesis-8`, the pair declaring 180px.
  - **`media-5 + explanation-7` was judged and does not pass.** Offered as an example composition; every
    column in its row is owned and it still fails, because the object and the reading beside it end
    **535.5px apart** against the 160px it declared for itself. Kept as `withdrawn` with the measurement.
  - **Eight hard failures and five table-level refusals, each driven to failure in the same run.** H1
    declared-vs-rendered ownership · H2 the unexplained remainder · H3 a hug row taller than its children ·
    H4 the pairing contract · H5 a starved `fill` · H6 an anchorless `contain` · H7 prose choosing the
    page · H8 a blueprint outside the approved set.
  - **Seven permanent counterexample boards**, the first two reproducing the shipped defect rather than
    describing it. `counterexample__unowned-half-row` is the canonical must-never-happen-again.
  - **The paired workings page was measured and does not reproduce as a layout defect**: the cases row is
    333px, both children are 333px, `align-items: start`, and the gap to the synthesis is 30px. The air is
    30px of region gap plus ~27px of the answer block's own bottom padding — a rhythm defect, not a
    row-height one. Every board now prints **declared step against perceived gap**, and the open question
    (should a region be required to hug its own ink?) is reported rather than taken.

- **The slot contract completed, and the Slot Fit Atlas** (`docs/atlas/media/`, `docs/atlas/slot-fit/`,
  `scripts/slot-fit-atlas.mjs`, `scripts/make-media-fixtures.mjs`, `scripts/lib/slots.mjs`, no app change).
  The previous entry gave media slots a **fit**. This one gives them the other two thirds of a contract
  and then goes looking for objects that break it.
  - **Every media slot prescribes `slotSpan`, `slotFit` and `slotAnchor`.** The anchor vocabulary is
    deliberately tiny — `center` · `start` · `end` · `paired` · `full` — the subdesign declares it, and a
    control derives it independently from the areas so the prose and the grid cannot drift apart.
    **`start`/`end` require a declared `anchorReason`**: a generic stacked media object may never quietly
    default to left alignment.
  - **Whitespace is separated by OWNERSHIP, which is what makes it enforceable.** Reading margin belongs to
    the page, pattern whitespace to the subdesign, and **slot residue to nobody** — illegal under `fill`,
    legal under `contain` only because the slot explicitly owns it and the object has an approved anchor.
    An 8-column graph on the left of a larger unnamed region now fails in the catalogue, before rendering;
    a centred 8-column slot written `2 + 8 + 2` passes, because those outer columns were prescribed.
  - **`contain` finally has somewhere to live.** Every slot in the catalogue was `fill`, so half the contract
    had never been through an object. `notes` gained one `illustration` slot: contained, centred, capped at
    the object's **authored presentation width** — never at raw raster pixels, because a 900×1200 photograph
    is not a request to be painted 900px wide.
  - **Ten permanent media fixtures**, generated by `scripts/make-media-fixtures.mjs` and committed as
    regression assets: three planes (portrait, balanced, wide), three rasters (3:4, 1:1, 16:9), a **real
    4-second 16:9 WebM** drawn on a canvas and captured with `MediaRecorder` (there is no ffmpeg here, and a
    clip fetched from anywhere would not be a regression asset), two instruments (4:3, 16:9) and a portrait
    diagram. Nothing is downloaded and no third-party host serves any of it.
  - **`scripts/slot-fit-atlas.mjs` — 108 legal combinations, every one judged**, every fixture through every
    approved slot it may occupy at all three surfaces, with identical filler prose so the object is the only
    variable. **28 golden proofs** carry the inspector overlay, chosen before anything is measured so the
    choice cannot be a function of the result. Every one of the 22 approved media-bearing subdesigns has at
    least one successful proof, and both fit modes and all five media families are exercised.
  - **One owner for the inspector.** `scripts/lib/slots.mjs` now holds the measurement, the verdict, the
    printed lines and the overlay, and **both** atlases import it — so a verdict cannot differ between them,
    and the picture cannot differ from the control. The measurement reads the rendered DOM, never the
    renderer's bookkeeping, which is what lets a control catch the two disagreeing.
  - **Nine controls, each driven to fail on purpose.** Two of them fired on real defects the first time they
    ran, before any injection: a contained object declared `center` was painted **hard against the left edge**
    (the anchor rules styled the figure, and a later rule of equal specificity won), and a 380px object
    centred in a 382px slot was read as `start` because the check asked "is it against an edge?" before "is
    it even?".
  - **`visual.explanation/side-7` was designed, proven to hold an object, measured and REMOVED.** Given the
    landscape fixtures it had never had, it holds them perfectly — the fit contract passes and nothing
    horizontal is unclaimed — and the page is still wrong: the object stands **256px taller than the prose
    beside it**, against the 240px this project calibrated as a hole on four earlier observed cases.
    Landscape objects now fall through to `down-8`, 760px centred on the twelve, which has no hole at any
    prose length.
  - **What the contract cannot see, measured and printed rather than hidden.** A `paired` row puts an object
    beside prose and the prose can run out first; nothing horizontal is unclaimed and the page still reads
    badly. The atlas reports that gap and **compares it to nothing**, because prose length is content and
    content may never decide a composition. On the same fixtures `side-6` measures **+474px** and
    `interactive.primary/beside` **+472px** — the pairing rule's original finding arriving a second time, and
    a larger ruling than one arrangement, so it is reported for the maintainer rather than acted on.
    `practice.workbook/beside` is unaffected: its neighbour is a workspace with a designed height.

- **Slot fit: a discrete span system, a validator, and a Slot Inspector** (`docs/atlas/composition/`,
  `scripts/composition-atlas.mjs`, `scripts/lib/figure-geometry.mjs`, no app change). The catalogue had
  answered *what pattern is this?* and never *is the media actually inhabiting its slot?* — the visible
  result being a 760px graph hard against the left edge of a 1152px page with 392px beside it that had
  no role, and nothing in the system able to tell that 392px from a reading margin.
  - **Three kinds of whitespace, named separately for the first time**: *reading margin* (free columns
    beside prose, legal), *pattern whitespace* (space inside a bounded media stage, legal) and **slot
    residue** (a `fill` slot whose media is narrower than it, or a `contain` media neither centred nor
    deliberately start-aligned — illegal). The renders we had been unhappy with were mostly the third.
  - **Every media slot declares a `fit`.** `fill` = the media consumes the slot width; `contain` = it
    may be smaller but must be deliberately placed, which means centred unless the slot declares a
    reason. Both checks categorical: no threshold, no occupancy percentage, and **nothing the inspector
    computes ever reaches layout**. This is deliberately *not* a resolver — "if occupancy < 55%, stack"
    is what made the system lose the design.
  - **The slot decides the width; the geometry decides the height; there is no height ceiling.** A
    6-column slot that makes a tall graph 950px high is the right outcome and the page scrolls — a much
    better failure mode than a 340px-wide graph stranded on a 1100px page.
  - **Four approved desktop subdesigns for `visual.explanation`**, as the maintainer specified:
    `side-6` (6 | 6, balanced), `side-7` (7 | 5, landscape), `down-8` (media **centred** across 8, with
    the reading on the same centred spine) and `down-12` (the full grid). The renderer selects; it does
    not invent a width.
  - **Span promotion is the only automation, and it selects from arrangements that already exist**:
    within one (surface, aspect class), the smallest approved span that clears the media's minimum
    legible width. `validate()` now requires *at least* one approved subdesign per (surface, aspect) and
    refuses two that share a span — which is what makes that sentence deterministic rather than hopeful.
  - **The media reports capability, never footprint.** It is asked one question, about widths it did not
    choose — *of these approved spans, which can you render faithfully?* — and answers with a subset of a
    set someone else supplied. Nothing in the reply can be mistaken for a display size.
  - **Legible at a width is three categorical predicates, and the first version asked only one of them.**
    No collision; **fidelity** (every painted tick inside the *authored* domain — under equal unit scale
    the engine expands the shorter domain and derives ticks from the *expanded* range, so at a 209px box
    `symmetry` prints a y tick at 12 for an authored yMax of 11 and `landscape` prints x = −15 for an
    authored −12); and **stability** (the tick set the same figure prints at full width, which catches
    −7.5, −5.0, −2.5 … for an authored ±7). Overlap alone never bound: the real crossings are
    symmetry 225 · squareish 249 · landscape 266 · graphcheck 209 · roots 233px, all set by fidelity.
  - **It judges the solved box, not a guessed one.** An earlier version painted at a seed height
    `round(aspect×(w−50)+100)`, and the verdict moved with the seed — `symmetry` in a 382px slot is clean
    at h=498, prints x = ±6 at h=398 and decimals at h=698 — making the answer a property of the
    measuring instrument. It now asks the renderer's own box solver for the box the page actually gets.
  - **The monotonicity assumption broke, and asking each span removes it.** `roots` is clean at 264px,
    collides at 296 and 328, and is clean again at 360: an illegible *band*, which no single crossing
    width describes. A diagnostic still reports the number for a human and says when it is unsafe.
  - **Promotion never fires on real content, and that is proved by driving it**: a 2-column (172px) state
    approved for the balanced class is skipped for `side-6`, and a pattern whose only approved state is
    that one fails the build rather than painting an unfaithful plane. That second case found a defect in
    the first implementation — a single candidate was returned without ever being asked.
  - **The Slot Inspector, drawn as well as enforced.** Beside every render with media,
    `<name>-inspect.png` overlays the slot, the painted media and any unclaimed width (hatched where it
    actually is), with a panel reporting pattern / subdesign / master grid / media slot / painted media /
    fit / alignment / aspect-scale / unclaimed internal width — and on failure the diagnosis and the
    **legal actions**. One function produces both the control's verdict and the overlay's text, so the
    picture and the build cannot disagree.
  - **It found three stranded arrangements on its first run**, none previously noticed:
    `visual.compare/paired` (8 of 12 columns with four unnamed to the right — the shared plane now spans
    what the pair spans), `media.full/inset` (the same defect, *named after it* — now `centred`), and the
    tablet forms of both. `practice.workbook/beside` declared a 7-column media span for a 5-column slot.
  - **The occupancy signal lost its threshold.** It compared a painted content dimension to a tuned 0.6 —
    the shape of the resolver this architecture refuses, inside the gate and dormant only because the
    corpus has no contained media. It now prints the number for every contained object and compares it to
    nothing. Relatedly the build now says, on every run, that the whole `contain` branch is designed and
    **unexercised**, rather than letting a green result imply otherwise.
  - **Six new controls, each driven to fail on purpose**: slot fit (a `fill` media at 441px in a 760px
    slot, which prints the whole inspector); every media slot declares a fit; `mediaSpan` equals the
    columns its areas give; `approvedMediaSpans` matches its subdesigns; media alone in a row is centred
    or full (caught in the catalogue, before rendering); and a media slot was actually inspected. The
    promotion control was driven to fail four ways — shared span, missing span, two arrangements for the
    no-media class, and an aspect class with none.
  - **The pairing rule is reconciled with `side-6`/`side-7`, explicitly.** Side-by-side was removed for
    pairing two *unbounded* materials. A media slot is no longer one: its height is a deterministic
    function of the slot width and the authored domain, invariant to content — a *derived* height is a
    designed height. What survives is the specific finding, so `side-6` is approved for `balanced` only,
    `side-7` for `landscape` only, and a portrait plane still has no side-by-side subdesign anywhere.
  - **The build now names what it has not tested**: approved subdesigns no render exercises. Today that
    is `visual.explanation/side-7` — which is the brief for the slot-fit atlas the maintainer asked for
    next.

- **The Composition Atlas** (`docs/atlas/composition/`, `scripts/composition-atlas.mjs`, no app change).
  The maintainer stopped the renderer work and redirected to the page-composition problem itself: a
  small catalogue of page patterns on a shared master grid, with typed slots into which lesson blocks
  are placed, rather than a resolver that keeps asking *how big should this be?*
  - **Grid ≠ layout.** A 12 / 8 / 4-column master grid at 1152 / 834 / 382px gives alignment lines and
    decides nothing. One number arrived on its own: eight desktop columns is `8 × 74 + 7 × 24` =
    **exactly 760px**, the reading measure the previous atlas had reached from typography alone — so
    the measure is a grid position, and the build refuses a pattern that sets prose wider.
  - **Two vocabularies.** A **block** says what something *is*; a **slot** says what may live *there*.
    Collapsing them is how a graph came to own a size. A graph now receives a slot and answers only
    *inside this width, at equal unit scale, this is the faithful rendering I can provide*.
  - **Eight patterns, 48 renders**, every page filled from the real quadratics lesson: `notes.basic`,
    `notes.examples-tabs`, `visual.explanation`, `visual.compare`, `media.full`, `interactive.primary`,
    `practice.workbook`, `practice.graph-workbook`. Each records grid areas, allowed blocks per slot,
    occupancy, reading measure, media behaviour, disclosure, scroll ownership and three surfaces —
    and the CSS for every arrangement is **generated from that record**, so design and layout have one
    owner.
  - **`visual.side` was designed, rendered, measured and REMOVED.** It fills the surface exactly and
    reads well beside four paragraphs; beside one sentence it left ~600px of empty column — the rail,
    for the third time. A composition whose soundness depends on how much prose the author happened to
    write is content-dependent, and content may never decide a composition. Every visual pattern now
    stacks, and the aspect class chooses only a **width**.
  - **Occupancy policies**: `required` · `optional-collapse` (the row is *dropped*, because an
    unoccupied named track keeps its row-gap — 40px of nothing is residue under another name) ·
    `optional-reserved` (declared, and honestly unused).
  - **Fifteen controls, each driven to fail on purpose**, including three that are new in kind: slot
    edges must land on grid lines; a slot must be the width its pattern gave it (driven to fail with a
    real resolver that measures rendered prose); and adversarial content must move nothing but height.
  - **When two slots may share a row** — the rule both removals produced: a row may pair two slots only
    when they are *the same kind* at identical width (a comparison) or when at least one has a
    *designed height* (a pad, an instrument, a card). Two unbounded materials in one row is sound only
    for the lengths the author happened to write.
  - **Cut from eight patterns to seven by its own cross-pattern review.** `notes.basic` +
    `notes.examples-tabs` → `notes` (they differed by one slot and the second was keyed on a
    *disclosure mode*, which is authored inside a slot). `practice.graph-workbook` folded into
    `practice.workbook` (it forked on grid-versus-lined paper, a property of the block).
    `interactive.primary`'s `workspace` renamed `instrument` — one slot name was carrying two slot
    types. The `scroll.x` contract was stated for a `data` slot and implemented on the table block;
    the block was right. And **`worked.single` was added**, because the catalogue could not lay out
    two of its own lesson's four subtopics.
  - **The shell layer**, which the pattern pass named and did not close. A **shell** owns the page
    title, the tab strips and which panel is open, and declares **no slot, no grid area and no media
    rule** — the moment it acquires one it has become a pattern. `shell.subtopics` holds one or more
    patterns per panel in reading order; `shell.views` holds one pattern per panel and *different*
    patterns are the normal case, which is what makes it a shell rather than a pattern with a state.
    Nesting runs subtopics → views → patterns; subtopics inside subtopics is forbidden.
  - **Page 20 is the whole quadratics lesson through the catalogue** — 15 renders, one per leaf state
    per surface — and building it found what the pattern layer had not: **`visual.compare` had no
    approved subdesign for having no shared visual at all**. `none` is now an aspect class like any
    other, and a pattern whose media is `optional-collapse` must declare a subdesign for it.
  - **Four more controls, each driven to fail**: the authored tab structure is identical at every
    width and state; a closed panel contributes nothing; a shell introduces no scroll of its own; and
    the two tab kinds are **distinguishable** — the per-depth affordance control could not catch a
    nested views strip styled as an item selector, because `views` occurs only at depth 1, and this
    one does.
  - `mediaSize` is recorded as the useful **failed intermediate** it was: it proved semantic importance
    and media geometry are separate concerns, which is why this catalogue has a slot layer. The old
    atlas is marked superseded rather than deleted.
  - `lesson-studio.html` is unchanged and byte-identical since `41d40a8`.
- **The missing layer: `mediaSize`** (`docs/atlas/`, `scripts/lib/figure-geometry.mjs`, no app change).
  The maintainer rejected image 1 a second time, and correctly: `visual.down` and an undistorted plane
  had fixed the *shape*, and the symmetry graph was still **488×625 on a 1152px desktop page** —
  mathematically perfect, instructionally a thumbnail. The defect was architectural. The contract
  published a `preferredWidth` and the renderer treated it as the final instructional display size;
  it never was. It is the largest box that still paints the authored domain at equal unit scale within
  a legibility bound, which for a tall plane is a small box.
  - **The chain is five steps, not four**: media type → **mediaSize (authored)** → geometry class →
    approved subdesign → prescribed responsive state. Geometry can say what shape a plane must keep;
    it can never say how much importance the plane deserves. A supporting number-line, an ordinary
    worked-example graph and a major explanatory graph can share one aspect ratio.
  - **Four frozen size classes** — `compact` (supporting) · `standard` (ordinary instructional) ·
    `large` (primary explanatory) · `workspace` (reserved for the practice family). Each prescribes a
    **width band and a height ceiling per surface**; the figure is realised at the widest width in the
    band whose *measured* box clears the ceiling, geometry and equal unit scale untouched — the width
    comes down, the plane is never squashed. Authored as `"mediaSize"` on the composition node, and
    **required**: a default would be the renderer deciding how important the author's figure is.
  - **Symmetry, desktop: 488×625 → 683×860**, the maintainer's ruling (`standard`, not `compact`) and
    their expected 600–700px band, arrived at from the frozen numbers rather than picked. A flatter
    parabola is authored `large`: 900×385 → 1000×463.
  - **The `growable` special case is gone.** It grew only planes wider than they are tall, to one
    hardcoded `widePreferredWidth: 900`, because there was nowhere to say how large a figure should be.
    Every class is now realised the same way.
  - **`compact` is a reserved word**: it means a media size and nothing else — no composition,
    subdesign or responsive state in this grammar may be called `compact`.
  - **Reference design 21, the size ladder**: one tall plane and one wide plane, each at all three
    sizes. Down a ladder the geometry class, the subdesign and the composition are identical and only
    the physical footprint moves. For the tall plane the height ceiling settles the width; for the wide
    plane the band edge does.
  - **Six controls, each driven to fail on purpose**: an omitted size; an invented size name; a
    band-sized box around an unchanged narrow plane (*a bounded wrapper is not a size*); a realisation
    outside its band; two size classes that realise the same plane; a size class that changes the
    geometry class. The content-perturbation control now also compares every realised plane.
  - `lesson-studio.html` is unchanged and byte-identical since `41d40a8`.
- **Narrowly scoped visual corrections after the first lesson passed its structural test**
  (`docs/atlas/`, no app change). The maintainer accepted `single.flow`, `single.split`,
  `collection.repeat`, `scroll.y = page` and the narrow repeated-example anatomy as golden, and asked
  for four fixes. No new composition vocabulary and no new general-purpose layout logic.
  - **The tab strip is one row that scrolls, and never wraps.** At 382px `collection.tabs` used to
    wrap, leaving a tab alone on a second line. It now scrolls locally in x at every width, and
    selecting a tab brings it fully into view — no dropdown, no smaller type. The partly visible
    neighbour at the edge is the affordance; a fade would dim the control the reader is reaching for.
    `data-scroll-x="tabstrip"` declares the contract, deliberately distinct from `local`.
  - **`visual.side` is reserved for a plane no taller than it is wide.** The 388px empty rail is
    gone. Tightening the `balanced` band alone could not deliver the ruling — at 1.20 the plane
    simply moved into `portrait`, which also resolved `side` — so `portrait` resolves `down` too and
    `balanced` is now 0.75–1.0. Still pure media geometry: nothing about paragraph length, sentence
    count, occupancy or measured dead space enters it.
  - **What whitespace means**, replacing every occupancy percentage: free width *outside* a
    composition is reading margin and filling it is not a goal; unexplained empty area *inside* a
    semantic track is not automatically acceptable and is fixed by choosing a different prescribed
    subdesign; a tall page is fine; local horizontal scrolling only where a contract permits it;
    changing composition because a paragraph is short is forbidden.
  - Three new controls, each driven to fail on purpose: the strip must be one row; the current tab
    must be fully in view; and only a declared contract (`local` or `tabstrip`) may scroll sideways.

### Fixed
- **The class bands had two owners and the grammar was the one being ignored.** `atlas.json` declared
  them in prose while `scripts/lib/figure-geometry.mjs` hardcoded `1.3 / 0.75 / 0.4`, so retuning the
  grammar changed nothing at all. The numbers now live in `mediaGeometry.bands` and the module reads
  them. The atlas build was still carrying its own second copy of the whole figure search as well;
  it now uses the shared contract.
- **`down` inflated a tall plane.** Growing a figure to the atlas's wide-figure width is right for a
  plane wider than it is tall — a 717px landscape plane reads better at 896px — and wrong for every
  other shape. When `portrait` moved into `down` that rule met a tall plane for the first time and
  blew the 488 × 625 symmetry graph up to **900 × 1120**, worse than the void it replaced. The growth
  now applies only to planes wider than they are tall; a plane is never grown past its legible size.
- **The tab strip's `overflow-x:auto` coerces `overflow-y` to `auto`**, exactly as a local-x region
  does, so it was being reported as a vertical scroller on a `scroll.y = page` lesson.

### Added
- **The first real lesson — the lesson is now the test of the system** (`docs/atlas/lesson/`, no app
  change). `quadratics.lesson.json` is a complete NSW Stage 5 lesson, *The parabola y = x²*, authored
  in the frozen grammar and nothing else; `scripts/lesson-render.mjs` walks the JSON and emits the
  frozen vocabulary at desktop 1152 / tablet 834 / phone 382, in all five tab and view states. No
  fragment, no fixture, no hand-written markup. 15 renders.
  - **Four subtopics, each choosing its own composition**: Substitution (`collection.repeat` → 3 ×
    `single.flow`, the third ending in a table of values), Solving for *x* (`collection.repeat` →
    `single.flow`, `single.split` — the bare equation then the same algebra inside a situation),
    Symmetry (`views.tabs` → `comparison.paired` · `visual.side`) and A flatter parabola
    (`visual.down`). `comparison.sharedVisual` was not needed and is not used.
  - **An unknown node stops the run and names the gap.** Every node must name a composition,
    collection mode or views mode the grammar contains; nothing is widened to make a lesson fit.
  - **The derived switch point is now held shut by two controls.** *Content perturbation*: every
    paragraph tripled and every step doubled, asserting not one prescribed state moves at any width —
    if prose length, step count or rendered height had leaked into the rule, it moves. *No residue*:
    one page instance driven narrow and back must restore the wide arrangement exactly, which a pure
    width comparison does and a stateful one does not.
  - **`scroll.x = local-when-needed` is a permission, not a promise.** Each region must be local and
    well-behaved; the run as a whole must need it at least once. The lesson's table of values fits at
    1152 and overflows at 382 — both correct. Demanding overflow at every width would have meant
    padding the table until the control passed.
  - `scripts/lib/figure-geometry.mjs` gives the media-geometry contract **one owner**, so the atlas
    and the lesson cannot disagree about a figure's preferred width — which is an input to the switch
    point, and two copies of it would be two grammars.
  - Reported and deliberately not acted on: `visual.side` leaves **388px of trailing space** beside
    the plane at desktop (figure 647px, reading 259px). Measuring that in order to resize either
    column is the resolver; three prescribed options are put to the maintainer instead.

### Fixed
- **The page frame did not hold the surface, and the right edge of every line was clipped.**
  `.at-surface` is `surface + 2 × pad` wide; the narrow and tablet frame overrides counted the
  surface without its padding, leaving the frame 32px (phone) and 48px (tablet) too small. The
  document never scrolled sideways while it happened, so the control watching the document was blind
  — only looking at a phone render showed it. Fixed, and a control on the frame added: it fails on
  the old CSS with `the page frame is 874px around 902px of surface`.
- **A step could hold one mathematical statement, and a check step holds two.** "Check each one back
  in the original equation" is `4² = 16` and `(−4)² = 16`; written as one string with spaces between
  them HTML collapses the run and they render as a single broken statement. A `math` value may now be
  a string **or a list of statements**. This is content vocabulary — it adds nothing to composition,
  collection, scroll or media geometry — and it is the only capability the first lesson exposed.
- **A wrong number in the lesson text**: "24 units of *x* to climb 6 units of *y*" — 24 is the width
  of the window, not the climb. `y = x²/12` reaches 6 at *x* ≈ 8.49 against ≈ 2.45 for `y = x²`.
  Corrected, and checked by evaluation.

### Added
- **The grammar is frozen: four axes, and one authentic page as the proof**
  (`docs/atlas/worked-examples/`, no app change). One rule governs everything: **the author chooses
  the instructional structure; the renderer chooses only the prescribed responsive state and media
  subdesign belonging to that structure.**
  - **`presentation.tabs` → `views.tabs`,** and the distinction is now encoded rather than styled.
    `collection.tabs` means *several SIBLING ITEMS; select one* (Negative · Fraction · Decimal);
    `views.tabs` means *ONE object, seen in several REPRESENTATIONS* (Workings · Graph check). The
    affordance is keyed on `data-tabs-kind`, so a views group reads as a view switch at any nesting
    depth — an earlier pass keyed it on depth, which would render a top-level `views.tabs` as an item
    selector and lie about what the tabs mean.
  - **`visualCheck` is gone** and has no rendering logic anywhere. It was always
    `views.tabs{ Workings → single.flow, Graph check → visual }`. A future `[ Method 1 ] [ Method 2 ]`
    is `views.tabs{ single.flow, single.flow }` — not a new template.
  - **Compositions**: `single.flow` (default), `single.split`, `comparison.paired`, `visual.side`,
    `visual.down`, `comparison.sharedVisual.side`, `comparison.sharedVisual.down`. The author writes
    the base name; media geometry resolves the suffix and may never change the base. Images 10 and 11
    are the proof: the same authored `comparison.sharedVisual` with a balanced figure and with a wide
    one, resolving `.side` and `.down` — **both still `comparison.sharedVisual`**.
  - **Scroll is two contracts, not one enum** — `scroll.y` (`page` | `pane`) and `scroll.x`
    (`local-when-needed`), because a long equation is not the same design decision as an
    independently scrolling workspace.
  - **One authentic Worked Examples page** (image `01`), at desktop 1152 · tablet 834 · phone 382,
    built from nothing but this vocabulary: subtopic `collection.tabs` → `collection.repeat` /
    `single.flow` / `views.tabs` → `comparison.paired` and `visual.side`, under page scroll. 60
    renders across 20 reference designs; the page is the deliverable and the rest is the dictionary.
  - **`practice.paper` · `practice.workbook` · `practice.graphWorkbook` · `practice.geometryWorkbook`**
    are named as a deliberately separate family, so nobody bends a teaching composition into a
    workbook. `views.stepper` likewise. None is built.
  - **Two new controls.** The tab affordance must be the one its *kind* declares, identically at every
    depth. And no authored file may carry a layout-arithmetic key (`leftWidth`, `occupancy`,
    `preferSplit`, `maxDeadSpace`, …) — the JSON principle made a property of the source rather than a
    paragraph in a document. Fifteen controls now, every one driven to fail on purpose.

### Changed
- **One derived switch point, offered as a proposal.** Every switch point is a constant belonging to
  its composition except `visual.side`, which is `figure.preferredWidth + gap + minInterpretation`
  (420px) — 940px for the symmetry plane, 876 for roots, 838 for the graph check. Measured: at the
  834px tablet a fixed 720 leaves a 488px plane beside a **314px** reading column, narrower than the
  atlas's own 520px case measure. The derived point stacks instead. It is still prescribed — two
  numbers, the authored figure's own width and one design-system constant, and it never looks at the
  prose, the step count or the height of anything — but it is the one place the rule was extended
  rather than followed, so it is flagged for the maintainer rather than assumed.
- A tablet surface (834px) joins desktop and phone for the authentic page and for `visual`.

### Fixed
- **The build summary cried wolf.** It grouped the composition-drift check by *demo* rather than by
  *fragment*, so a normal and an adversarial payload — which legitimately hold different numbers of
  children — reported `compositions DRIFTED` when nothing had drifted. A summary line that cries wolf
  is worse than no summary line.

### Added
- **Disclosure and scrolling as first-class design tools** (`docs/atlas/worked-examples/`, no app
  change). The six-template atlas defined composition but not how content is *revealed and
  navigated*, so tabs and scrolling kept looking like emergency responses to a layout that did not
  fit. They are now their own axes, and the atlas is restructured around **four independent ones**:
  composition (the spatial relationship of what is visible **now**), disclosure (whether several
  things are visible at once), scroll policy, and the figure's own media geometry.
  - **The hard rule.** *Tabs are authored pedagogical structure. They may never be introduced or
    removed because of viewport size, content height, occupancy, or any layout heuristic.* "This got
    tall, so I'll hide half of it in tabs" is resolver behaviour wearing a different hat. The build
    reads the whole tab structure back out of the DOM — nesting depth, group name, every label in
    order, every panel in order, visible or not — and compares it **character for character** to the
    signature authored in `src/pack.json`, at every width and in every tab state.
  - **Revised vocabulary.** COMPOSITIONS (`single.flow`, `single.split`, `comparison.paired`,
    `comparison.sharedVisual`, `visual.interpretation`) · COLLECTIONS (`collection.repeat` — what
    `sequence.flow` was; `collection.tabs`) · PRESENTATIONS (`presentation.tabs` — what `visualCheck`
    was; `presentation.stepper`, named only) · SCROLL (`page`, `local-y`, `local-x`,
    `persistent-pane`). Three tab patterns: example, representation, subtopic.
  - **Scrolling means three different things.** Page scroll is normal and desirable — image 17 is
    2331–2987px tall and that is the outcome, not a failure. Local-y is a **workspace** behaviour,
    permitted only inside a persistent pane; teaching prose in a bounded scroller is refused by the
    build. Local-x is a last resort for indivisible material — a table of values, an un-breakable
    expansion.
  - **One authentic Worked Examples page** (image 20): subtopic tabs Substitution · Solving for *x* ·
    Symmetry, an approved composition inside each, and representation tabs Workings · Visual
    explanation inside Symmetry. 54 renders across 20 reference designs.
  - `ATLAS_ONLY=13,18 node scripts/atlas-worked-examples.mjs` renders a subset, and measures only the
    figures that subset needs — for iterating, and for driving each control to fail on purpose.

### Fixed
- **The figure search was not deterministic, and produced a wrong plane.** The landscape figure's
  narrow box came back **169 × 156** against a 382px cap on one run and **382 × 216** on the next,
  from identical code. Two causes, both now closed: the first paint of a box did not agree with the
  second (x/y = 1.045 then 1.005 on an immediate repeat — and since paints are memoised, whichever
  came first was what the entire search ran on), so the engine is now fitted twice and read settled;
  and the narrow box was being searched over *scale* when the narrow surface does not choose a scale
  at all — it gives the figure its full width, and the figure's aspect decides the height. It is now
  solved as a height at a fixed width. A collapsed search is also a hard error: a 169px plane paints
  perfectly square and screenshots as a graph, so only the width told the truth.
- **A repeated example had no measure at all.** `sequence.flow` styled the wrapper and nothing else,
  so prose inside it ran the full 1152px canvas. The old control — "a region that declares a maximum
  must honour it" — was vacuous exactly where no maximum was declared. The control is now *every
  visible paragraph of prose renders within the flow measure*, and the repeated child is literally a
  `single.flow`, measures included.
- **The atlas pages were being clipped by the app's own body rule.** `lesson-studio.html` sets
  `overflow:hidden` on the body because the app is a slide surface; the atlas lifts that stylesheet
  whole. A lesson page is not a slide — it scrolls. The frame is now explicitly unclipped and every
  render asserts nothing in it bounds or clips the page.
- **`overflow-x:auto` with `overflow-y:visible` is not a state CSS has** — the spec coerces the
  visible one to `auto`. Reading computed style alone reported a vertical scroller wherever a wide
  equation sat, and a horizontal one wherever the workbook pane was. Both directions are now
  distinguished, and each still asserts it is not *also* clipping the other axis.
- **A scrolling region that shows no scrollbar reads as truncated.** Measured: in headless Chromium
  `scrollbar-width:thin` and the `::-webkit-scrollbar` rules paint nothing at all, and
  `scrollbar-gutter:stable` reserves 9px and leaves it blank. Every scrolling region now carries a
  fade at the edge its content continues past, which in these screenshots is the entire affordance.

### Added
- **The worked-example atlas: six designed templates instead of a resolver**
  (`docs/atlas/worked-examples/`, no app change). The composition resolver tried to discover good
  design from measurements, and that experiment is over. Generalisability now comes from choosing the
  right template, not from letting the browser invent a composition. The resolver pack is retained at
  `docs/mockups/compositions/` marked **research evidence only**; its layout-selection logic must not
  be ported into the app, and `lesson-studio.html` has been untouched since `41d40a8` throughout, so
  nothing needs unwinding.
  - **Six templates**, each with rigid horizontal structure and prescribed responsive states:
    `single.flow` (the default — most worked examples are a one-line question and a solution that is
    the lesson), `single.split`, `sequence.flow`, `comparison.paired`, `comparison.sharedVisual` and
    `visualCheck`. A template is **named in the JSON and never inferred**: the build asserts `data-tpl`
    is identical at every width and for every adversarial payload. A payload may make a page taller;
    it may never change which template the page is.
  - **Media geometry is the one permitted automatic classification.** A figure is `portrait ·
    balanced · landscape · wide`, from its authored domain, and a template maps that class to an
    approved subdesign — a wide figure gets the whole content region with its interpretation beneath.
    That is a designed composition, not a failure state. The surrounding prose never determines a
    figure's width.
  - **Height is not a constraint.** `height:auto`, the page scrolls, and page heights across the
    atlas run from 900px to 2816px without any of it being treated as a problem.
  - **Controlled measures** so a stacked example does not stretch prose across the canvas: flow and
    solution 760px, interpretation and synthesis 720px, case 520px. Unused page width is reading
    margin. These are design-system values and never appear in lesson JSON.
  - **Six controls, five of which caught something.** A figure rendering as the literal text
    `undefined` (the painted HTML was dropped when assembling the figure record, so the planes in the
    `side` subdesign were text); a region with no plane in it at all, which the width check had been
    skipping; a narrow figure at x/y = 1.021 because a pre-painted box was being squashed rather than
    a new one solved; a full-width region around a narrower plane; and an **inert adversarial proof**
    — the over-wide-mathematics payload could not overflow because `visualCheck` state 1 was not using
    the `single.flow` measure. Both halves were fixed: the template now carries the measure, and the
    payload is a genuine four-bracket expansion, verified algebraically, rather than a line that
    merely looked long.
- **The composition resolver stops fitting rectangles: a Study page scrolls**
  (`docs/mockups/compositions/`, no app change). The previous resolver was solving a problem the page
  does not have — fitting a composition into the visible rectangle — and three rounds of gate-tuning
  were downstream of that. The order is now `content semantics → intrinsic demands → a NAMED state →
  allocate width → height:auto → scroll`, and there is no target page height in Study mode.
  - **Every state is a fresh layout.** A refused candidate discards all of its computed dimensions.
    The previous build did not, and said so in its own report: image 12 recorded `state: "stack"`
    while still carrying `cols: [332, 640]` from the side candidate it had rejected, so a stacked
    plane was sized against what a rejected rail left behind.
  - **Height no longer selects a layout**, with one named exception. The global occupancy gate is
    gone: it was semantically wrong for figures, where a 700px plane beside a 180px explanation is a
    good relationship — it rejected exactly that at "14% occupancy" and produced a page with *more*
    empty width than the one it refused. What remains is `promptSubstance` on `instructionSplit`
    alone, and it selects a different primitive rather than rejecting content.
  - **`instructionFlow`** — a short task, a rule, then the reasoning at its own reading measure while
    the page grows. A presentation type, not a fallback: 14 of the 30 compositions in the pack are
    this shape, including every ordinary Substitution example and the seven-step derivation. Split-
    or-stack was too crude a vocabulary for mathematics.
  - **Figures offer, compositions choose.** Each plane reports a ladder of the sizes it can legally
    be drawn at, in px per authored unit, measured before any text track is allocated. The build
    fails if a rendered plane is not at one of the sizes its own ladder offers, so leftover width can
    no longer become a figure size.
  - **Permanent alignment origins**, measured on every image. This caught the one real bug found
    while building: an inherited `justify-self: center` on the rule element, which Chrome honours in
    *block* layout — the flow state's full-width hairline was being shrink-to-fit-and-centred to
    **0px**. A missing hairline looks exactly like spacing, so it screenshots plausibly.
  - **Whitespace is classified** rather than counted: reading margin and structural space are
    desirable; only unowned width *inside* an allocated region is a defect.
  - **Three of the four controls did not fire on first attempt, and each was fixed rather than
    accepted.** The residue check was reading the resolver's own record — which simply never set the
    field — instead of the DOM. Two regression patches had silently failed to apply because their
    target text had changed, so the regressions are now asserted before the run. And the figure-ladder
    control was masked by a latent bug in the build itself: the figure page was being closed after the
    signature phase, so phase 2's "repaint and check the plane is square" was only ever a cache
    lookup, and a box the signature phase had not already tried crashed the run instead of failing the
    control. The page now lives to the end and phase 2 genuinely repaints.
- **The composition contract gains a resolver: fitting horizontally is not the same as being viable**
  (`docs/mockups/compositions/`, no app change). The previous pack decided every arrangement with one
  test, `min + gap + min ≤ available`, which establishes that two tracks can physically exist and says
  nothing about whether the result is a composition. A candidate now passes **four independent gates** —
  width, figure fidelity, vertical occupancy, dead-space ownership — or it stacks, which is a safe
  fallback rather than a failure. In this pack 22 of 30 arrangements are rejected. The container
  queries are gone: a query can ask how wide the container is, not whether the shorter track fills the
  row, so the resolver lays a candidate out, measures it, and assigns the verdict and the track boxes.
  - **Figures are sized first, from their own layout signature.** The resolver never asks how much
    width is left for the graph. Each plane carries `minimumReadableScale · preferredScale ·
    maximumUsefulScale`, in px per authored unit rather than in box dimensions — a correction the
    engine forced twice. Defining the boxes as "the largest box that still paints square units" made
    every plane answer 720 × 720, because the engine holds square units at almost any box by showing
    more of the plane; modelling the box as `span × scale + a fixed gutter` then missed by up to 3%,
    because the gutter is not fixed and which axis binds changes with the box. Measuring instead of
    modelling — paint, read px-per-unit off the tick labels, correct both dimensions — converges in
    three or four paints.
  - **The floor and the bound are different things and can fail to overlap.** The legibility floor is a
    property of the mathematics (the plot must clear 340 × 255); the 720px bound is a property of the
    page. **Three of the five planes in the pack cannot satisfy both**, and the pack reports it rather
    than hiding it: those planes have one legal scale, and the resolver is told so instead of
    discovering it by painting something distorted.
  - **The occupancy gate, with the data to set it by.** `shorter track ÷ row height`, floor 0.55, and
    every measurement is printed. The consequence is large and deliberate: an ordinary worked example —
    one-line question, three-step solution — measures 22% and stacks at every width, so
    `instructionSplit` becomes the exception rather than the rule. The seven-step adversarial case
    measures 11%.
  - **Dead space became an invariant rather than a rejection**, because as a rejection it made the
    resolver worse: it stacked a pair to avoid 94px of trailing space and produced 766px instead. What
    is forbidden is unowned width *between* tracks or *inside* one; space past the last track is page
    margin. The related fix is ownership, not arrangement — a **stacked figure region is now shrunk to
    its plane**, which moves no pixel of the image and moves 766px of space from the composition to the
    page margin.
  - **A track is never given width its region cannot use.** Allocation clamps each track to
    `[min, max]` and redistributes, so 1152px resolves to **512 + 608** rather than 392 + 728.
  - **A repeat's children share one verdict and the strictest decides**, so a gate can never leave row
    2 stacked between two split siblings.
  - New adversarial pairs where only the content differs: a balanced `standard` that splits (77%)
    against the same primitive at the same width that stacks (22%), and a dense interpretation that
    keeps its rail (69%) against a sparse one that does not (14%).
- **The composition contract — a zone-contract pack for the Mathematics worked examples**
  (`docs/mockups/compositions/`, no app change). The previous pack described five arrangements; a
  renderer given five pictures has to guess the rule that produced them, so this one states the rule.
  The whole worked-example system reduces to **four primitives** — `instructionSplit` (prompt │
  solution), `repeat` (a child, down or across), `visualInterpretation` (figure │ interpretation) and
  `stack` — and the named compositions become assemblies of them. `src/kit.css` contains no rule keyed
  on a composition name, and `repeat`'s CSS never writes down a count, so a 2 + 1 arrangement is not
  expressible rather than merely discouraged.
  - **No width in the pack is typed.** Track widths are computed from region contracts (a minimum, a
    growth weight, a reading measure) and every threshold is generated as the sum `min + gap + min`.
    The 1152px desktop reference resolves to **392 / 728 — 35.0% / 65.0%**, as a result. Images `16`
    and `17` are the same file at 768px and 767px, the computed floor and one pixel below it.
  - **`pairedVisual`'s lower half is redesigned.** A shared visual "at full width" left an arbitrary
    region beside a plane narrower than the row, with no answer to what that region was for. It is now
    the interpretation rail, and the hand-drawn two-row middle state is gone as a designed thing —
    image `06` shows it emerging from the grammar at a width nobody chose.
  - **A plane's size is searched for and scored on the painted result**, not computed and hoped for.
    Measured on the shipped engine: a 24 × 8 domain in the 720 × 255 box its own aspect asks for
    renders at x/y = **1.79**, because the engine reserves a fixed label gutter that a shallow box is
    mostly made of; the same domain at 720 × 488 renders at 1.001. `figures.json` now holds authored
    domains with no width or height in it, and the same domain is deliberately a different size in
    different states — `446 × 720` was never a contract, only one realised size.
  - **Five adversarial proofs** (long question, long solution, over-wide mathematics, portrait plane,
    landscape plane) replace decorative screenshots. The landscape pair renders one file above and
    below `720 + 32 + 384` and shows the split abandoned rather than the plane squeezed.
  - **The controls were driven back before they were trusted.** Four regressions were injected and
    each is caught: a typed growth weight, a composition that hides a child at one width, a figure
    track sized to the space rather than to the plane, and an annotation that reshapes the page it
    annotates. The payload control had to be rewritten to walk *rendered* text — `textContent`
    includes a `display:none` subtree, so the first version of it compared equal to a page that had
    quietly dropped an example.
  - Fixes a defect in the previous pack the maintainer found: its narrow `sequence` proof carried two
    examples and a shortened synthesis where its desktop twin carried three. One fragment now serves
    every surface, so a layout proof cannot carry different content at different widths.
- **Stage B correction — the split is decided by measured geometry, not by a device width.** The previous
  rule was a breakpoint, and it produced a "split" whose writing surface measured **452 × 0 px** at a 900px
  portrait tablet: below 900 the page became a block, the stretched grid row went away, and the sheet's
  `min-height:0` had nothing to grow into. The rule is now the minimum usable geometry of both regions,
  measured on the real page — question column ≥ 440px, workbook column ≥ 420px, sheet ≥ 340px — computed
  from the ratio the grid will actually use, and re-resolved on every resize. So the same 1180×900 viewport
  is `solo` with the navigation rail open and `split` once it is collapsed: the decision is the space, not
  the device. Portrait tablets take the Questions / Workbook views, and in the Workbook view the workbook
  gets the whole page rather than a fixed `vh` slice. The sheet now has a floor everywhere, so it cannot
  collapse whatever the page does. A control drives the failure back: forcing the split past the minima
  returns the sheet to 0px.
- **A structured table is never silently clipped.** It was, at every width below desktop, and an overlay
  scrollbar made it look like a table with fewer columns. Now: fit as authored; if it does not fit, compact
  the cells; if a legitimately wide authored table still does not fit, the TABLE takes its own horizontal
  scroll with a visible edge, a persistent thin scrollbar and a sticky stub column, so no row loses its
  label and no column disappears. The question pane itself never overflows. The two intrinsic widths are
  measured once and cached, so re-running on resize is a pair of comparisons rather than a
  remove-measure-add cycle that would leave an un-compacted frame. `tests/visual/lessons/mathematics-wide-table.json`
  is the 13-column stress case.
- **Stage B2 — Type mode.** The `Type` control now does something. The workbook has ONE page list and each
  page carries both modalities — `{mode, current, pages:[{id, ink, text}]}` under kind `workbook` — so
  `Page 1 / Page 2 / +` is a property of the workbook, not of the input technology, and the two cannot
  renumber apart from one another. Type replaces the workbook SURFACE and nothing else: the question column,
  its table and its scroll position are untouched, and no answer box is attached to any question. The typed
  surface is one working page — prose and inline equations in the order they were written — stored as text
  and as TPMath's own JSON tree, never as markup, so it round-trips through the response store with nothing
  to sanitise. The equation bar is the app's existing TPMath editor opened in place behind a `Text |
  Equation` affordance; it is not coupled to `graphQuestion`, which mounts the same primitive its own way.
  Switching modality, changing page, navigating away and back, the drawer, Expand and the narrow
  Questions / Workbook views all leave both modalities and the page numbering exactly as they were, and
  `responseMode` remains presentation state that never decides what is submitted.
- **Four defects in that surface, found by looking at it rather than at the payload.** The equation bar
  never closed (`.mx-eqbar{display:flex}` outranks the UA `[hidden]` rule, so a half-built editor sat on
  every fresh page); the typing pad borrowed `.tp-slide` for the editor's styling and inherited its
  `position:absolute`, which took the workbook out of the workspace column and left a 340px pad in an 830px
  region; the equation FIELD was an unfocusable `<span>` inside a styled wrapper, so TPMath's key handling
  and caret were unreachable by keyboard; and re-opening the bar mounted a second editor on the same node —
  `destroy()` unbinds the document listeners but not the field's — so every keystroke was inserted once per
  editor ever opened. Each now has a check with a control that reproduces the failure.
- **One owner for the Practice viability contract.** `MX_WB_MIN_H = 340` also existed as a literal in two
  CSS rules, and `MX_SPLIT_GUTTER = 20` as `gap:20px` — three copies of two numbers, and the JS constants
  were not the source of any of them, so raising a minimum would have left the CSS silently disagreeing.
  The contract is now published from the one place that owns it as scoped custom properties on the
  Mathematics Practice root (`--mx-wb-min-h`, `--mx-split-gutter`) and consumed from there. Deliberately no
  `var(…, fallback)` in the consuming rules: a fallback is a second copy of the value. Zero visual change —
  all 126 screenshots re-rendered byte-identical, the computed sheet floor is still exactly 340px, every
  split/solo decision at every gated width is unchanged, and the zero-height control still reproduces.
- **The workbook sheet is a WINDOW; the paper scrolls inside it.** The frame was the paper: `.mx-sheet`
  was `overflow-y: visible` with `scrollHeight === clientHeight` at every width, so a learner could not
  write past the bottom of the visible workbook. Now the window scrolls over a paper that is at least one
  window tall and grows downward as the writing approaches its bottom — measured on a phone, 545px of
  window and 758px of paper after five lines of working. The toolbar and the page tabs are siblings of the
  window, not of the paper, so Pen / Eraser / Clear / Expand and `Page 1 / Page 2 / +` stay exactly where
  they are while the paper moves (toolbar 191→191, tabs 835→835 across a 213px scroll). The lesson page
  never becomes several screens tall to hold it — that part was already true and is now asserted.
  The extent is DERIVED from the ink rather than stored, so the response payload stays `{id, ink, text}`
  and a sheet restored from the store gets its paper back with it. The horizontal scale is fixed at 1000
  units across, so growing the paper exposes more plane and cannot rescale existing writing: the control
  shows the plane going 1434 → 1995 units while the first stroke stays at (100, 215.01). Each page keeps
  its own scroll position, and on desktop the question column and the paper scroll independently — moving
  one leaves the other exactly where it was. `verify-workbook` 75 → 84.
- **The equation editor fits on a handset.** The Type workspace already worked at 414/390/360px — every
  control reachable, nothing overflowing sideways — but the ribbon stacks into a long column there, and
  capping the BAR scrolled Insert and Cancel away with it. The ribbon is capped instead, so field, symbols
  and actions stay within one screen: Insert now sits 382px below the field on a 414px handset rather than
  491px, i.e. on the screen rather than past its bottom. The proof set gains a phone Workbook/Type view and
  a phone equation bar; `verify-type-interaction` covers 414×860 and 360×780 (52 checks, up from 46) and
  now also asserts that no width scrolls the page sideways.
- **Stage C — Notes and Worked Examples are real pages, driven by the lesson JSON.**
  - **A tab is an alternative complete demonstration of the SAME object.** The first build partitioned a
    single mathematical idea across `Graph / Table / Coordinates`, so a learner had to switch tabs to
    reconstruct one thought. The correction to that over-shot: tabs became _y_ = _x_², _y_ = _x_² + 2 and
    _y_ = −_x_², which changed the mathematical object while the persistent concept panel beside them still
    said the vertex is (0, 0) and _y_ ≥ 0 — statements false for two of the three. The page contradicted
    itself. The concept panel is the STABLE KNOWLEDGE and does not change with the tab; every tab must
    explore the object it describes. This lesson now authors three complete demonstrations of _y_ = _x_²:
    **Graph and key points** (curve + selected coordinates + what they show), **Table to graph** (a full
    table + the same points plotted + the link between them) and **Symmetry** (curve + paired _x_-values +
    why the _y_-axis is the axis of symmetry). Each combines several representation kinds and stands on its
    own, so switching tabs means "show me another way to see this".
  - **One part vocabulary, shared by both pages.** An example composes `parts[]`, each `{kind, …}`:
    `figure` (delegated to the Figure engine), `table`, `points`, `relations`, `prose`. The same vocabulary
    builds a worked example's companion and a single step's own visual, so the data/rendering boundary
    never assumes the companion is one static graph unrelated to the steps. Panes are keyed by the AUTHORED
    id, so a tab's identity is never its position: reordering, relabelling or adding changes the page with
    no renderer change.
  - **Notes** takes an authored concept list of any length (`concepts[]`, each with a stable id and rich
    mathematical content), an optional short lede, an optional compact Key Idea, and the examples above.
    There is no "record in your notes" field, no "what to write down" panel and no mandatory Key Idea.
  - **A region that exists but holds nothing is a failure**, exactly as a zero-height workbook was. At a
    portrait tablet the example panel had become a tab strip over an empty box — the region was technically
    present and the learning asset was gone. The Practice viability contract now owns the example region
    too (`MX_REP_MIN_W` / `MX_REP_MIN_H`, published as scoped custom properties so no value has a second
    copy), a portrait viewport stacks by construction rather than being judged on width, and the figure
    part is given its own bounded box on the documented `.tp-slide` seam. The gate measures the rendered
    content area at five viewports, and the control strips the rules that size the drawing to show every
    one of them failing: the tabs still render, the drawing collapses to 0px and its SVG escapes the page.
  - **Worked Examples — two vocabularies, deliberately separate.** CONTENT vocabulary is what an example
    is made of (`prompt`, `steps[]`, and the shared parts). COMPOSITION vocabulary is how examples are
    ASSEMBLED, and it is now a small closed set of presentation types AUTHORED in the JSON:
    `compact | visual | comparison | extended`. Modelling the page as one page-sized layout per
    `Example 1 / Example 2 / Example 3` did not generalise — a three-step substitution occupied perhaps a
    third of the useful area while a graph-supported example happened to fill it, so the abstraction only
    looked right when the example happened to need a large visual. A tab is now a GROUP with a pedagogical
    identity — `Substitution`, `Solving for x`, `Symmetry` — holding one or more complete examples and an
    optional closing relationship. THE TYPE CHOOSES THE COMPOSITION; THE AMOUNT OF TEXT NEVER DOES:
    nothing measures how much text an example has in order to pick a layout. What geometry still decides
    is only whether the chosen composition can be READ — a set stacks when its columns fall below a
    readable measure, and a `visual` group reserves no companion when none is authored. A bare
    `examples[]` still renders, as one `extended` group.
  - **`staged` — local states, and the rule that resolves the oscillation.** Working and a substantial
    representation each deserve the whole surface: a learner should not scroll past a full-height plane to
    reach the conclusion of the algebra, and the plane must not shrink so the two can share a screen. A
    group may author `states[]`, each naming the semantic regions it carries (`show`) and optionally a step
    range; the numbering keeps counting so one argument reads across the states. Staging is available to
    any contract — `staged` is the name for when it IS the composition. **A plane too tall to embed belongs
    in a state, not squeezed and not left as an 800px portrait object halfway down an ordinary page.** The
    author chooses that; the page never infers it from height. A hidden state reserves no layout space, and
    a figure revealed with its state is re-solved — until then its stage measured zero.
  - **`visual` → `standard`, `compact` → `sequence`,** and the vocabulary is now `standard | sequence |
    comparison | staged | extended`. Both old names still resolve. `compact` said how DENSE something
    should look; `sequence` says what RELATIONSHIP its content has — several parallel examples of one
    skill — which is the only kind of thing a composition is allowed to know.
  - **THE PAGE NEVER RESHAPES THE MATHEMATICS.** The boundary the whole figure system now hangs on: the
    Figure Engine determines mathematical geometry, the page composition determines where that geometry can
    live. Measured before the rule existed, the same symmetry plane rendered at **4.65:1** on a desktop and
    **1.95:1** on a phone — one _x_-unit 85px wide and 18px tall — because the composition was allowed to
    dictate the plane's shape. A Mathematics Cartesian plot now defaults to an equal-unit scale
    (`scaleMode:"authored"` opts out and keeps whatever `aspect` it states, so a deliberately unequal chart
    stays possible), and the SLOT takes its aspect FROM the authored domain rather than the reverse. Every
    plane now measures 1.00 ± 0.05 at every viewport. The `--fig-fill-min:.22` override from the previous
    pass is gone: it solved letterboxing by giving the composition permission to flatten the mathematics,
    which was the wrong direction, and so are the rules that clamped a stacked companion to a "landscape
    demonstration area". A portrait plane is stacked beneath the reasoning at its own proportions and the
    page gets longer — "fits this viewport" is not a quality measure.
  - **Graph viability is two separate tests.** Scale integrity, and pedagogical legibility
    (`MX_PLOT_MIN_W` / `MX_PLOT_MIN_H` / `MX_PLOT_W`, one owner, published as scoped custom properties). A
    plane can be perfectly undistorted and still be too small to read; failing either makes the composition
    stack and give the plane the width. The gate measures the RENDERED transform — px per unit per axis off
    the painted svg — because a container and a viewBox can agree while the plane inside them is distorted,
    and its adversarial control opts a plane out and shows the ratio go to 2.12.
  - **Authored reference lines** (from the previous pass) now also draw the axis of symmetry and `y = 9` in
    the comparison plane.
  - **One anatomy, every composition.** QUESTION / WORKED SOLUTION / ANSWER, and optionally VISUAL
    EXPLANATION — quiet typography and space, not another layer of coloured cards. A group holding one
    example suppresses that example's own name, because the tab already titles it: `Solving for x` was
    printing "Working backwards…", "Find x when y = 16" and "Find the value(s) of x for which y = 16" one
    under another. The optional fourth section is named once, never a heading above a heading.
  - **Fractions are fractions.** `mxM` sets `3/2` built-up over a rule and `(3/2)^2` inside brackets that
    grow to its height, on the mathematical axis. Digits only, three a side, so prose and year ranges are
    untouched.
  - **THE WORKSPACE IS SHARED, NOT CENTRED — instructional content is never centred in the page.** The
    columns-follow-count rule this replaces gave 1, 2, 3 and 4 examples four different shapes (a centred
    column, two columns, a centred 2 + 1 remainder, a 2 × 2 block), so the page's arithmetic decided which
    example looked like a conclusion. The question a composition now asks is not "how do I centre this
    example?" but "what are its meaningful pieces, and how should they share the width":
    - **the ROW is the unit.** One row is one whole example — the ask (title + QUESTION) on the left, the
      working (WORKED SOLUTION + ANSWER) on the right. A `sequence` is a stack of these rows: full width,
      one lane, identical geometry at any count, so no example is a conclusion because of where it sits.
    - **`standard`** is that same row for a single example: question left, the whole working right. Its
      companion, when one is authored, sits in the working's own column at its authored proportions — a
      portrait plane makes the page longer (330px → 903px at the same 560px width), it is never re-placed
      or squeezed.
    - **`comparison`** is A | the plane that bridges them | B, all three reading at once, replacing a
      plane appended beneath the two cases it explains.
    - **a graph-bearing `staged` state** gives the plane the width its shape needs and the complementary
      width to the explanation beside it, rather than centring a narrow portrait figure in an empty page.
    - **the floors decide, not a breakpoint.** `MX_ASK_MIN` (300px, ~37 characters) joins the viability
      constants and is published as a scoped custom property; the row holds 35/65 while both sides clear
      their floor, then pins the ask at its floor, then wraps to ask-above-working — all from the floors
      themselves, with no media query restating the numbers. The bridge, which cannot wrap, collapses at
      the width its own floors imply (300 + 340 + 300 + two gaps = 996px of row). Measured: three columns
      down to 1381px at exactly 300 | 341 | 300, one column at 1380px, never an overflow.
    - **local paging is just the states.** `1 Worked solution | 2 Graph check` is the whole control — no
      Back/Next, no duplicated `1/2` beside it.
    Every example also stands alone — "use the same rule…" made the second depend on having read the first.
  - **Authored reference lines in the Figure Engine.** `{type:'line', y:k}` / `{type:'line', x:k}`, with an
    optional label, spanning the viewport as a line does and counting as painted geometry that identifiers
    must clear. This fixes a real failed demonstration: the `Solving for x` example said "the line y = 16
    meets the curve twice" while the graph drew only the two points. The vocabulary is general — the same
    object draws the axis of symmetry in the comparison plane — and the gate asserts every authored line
    reaches the drawing, with a control that removes one and shows the check fail.
  - **A COMPARISON IS SIMULTANEOUS OR IT IS STAGED — never squeezed, and never merely reordered.** The
    bridge said "these two cases agree, and here is the object that shows why", which only communicates
    while all three are read at once; below that a `@media (max-width:1380px)` rule collapsed the grid to
    one column and left the plane sitting BETWEEN case A and case B. That put the picture — and with it the
    second answer — in front of the reader before they had worked the second case. A change of pedagogy
    dressed as a change of layout. A comparison that no longer clears its own floors is now a different
    STRUCTURE: two states, `1 Workings` (both cases complete, in order) then `2 Visual explanation` (the
    undistorted plane and the authored relationship). The gate the maintainer asked for measures the order
    a reader actually meets things in — every answer band and every drawn plane, top to bottom, on the
    state they land on — and its control puts a plane back into the workings state to prove it fires.
  - **And the transition is MEASURED, not a breakpoint**, following `mxRepFits`: `mxBridgeFits` compares
    the real surface against the composition's own floors (300 + 340 + 300 + two 28px gaps = 996px). The
    viewport query it replaces was wrong in a case that actually happens — at a **1200px viewport with the
    navigation rail collapsed the surface has 1084px**, comfortably past what the three columns need, and
    the breakpoint staged a composition that fitted. That is now the control: widen the surface without
    touching the viewport and the bridge must come back. A media query cannot pass it.
  - **The staged graph check is a real two-part workspace: `plane | interpretation`.** The plane was
    mathematically correct and looked stranded, because the emptiness was BESIDE it — a 1058px-wide
    interpretation column holding 149px of content at 1920px. The interpretation now holds a reading
    measure (`MX_INTERP_MAX`, 620px) and leads with the algebraic result the picture is checked against,
    followed by the graphical evidence and why they agree. Nothing is invented: the answer is the example's
    own, placed there because the state DECLARES `answer`, and the control undeclares it to show the lead
    leave with it. Both parts grow from their floors and top-align; below plane-floor + interpretation-floor
    they stack. The track this replaces was `min(52%, min(66vh,720px) × aspect)`, which made the plane's
    width depend on the window's HEIGHT and capped its height at 720px. The plane's natural SIZE is now
    bounded on its longer side (`MX_PLOT_H`), which is isotropic — it chooses how big to draw the object,
    never what shape — and it reproduces the reviewed 446×720 without any viewport in the arithmetic.
  - **The ask/working boundary, drawn once for every row composition.** `standard` and `sequence` are the
    same row, so they get the same mechanism: one hairline in the gutter and a heading hierarchy that says
    which side is which. Neither side becomes a card — no fill, radius or shadow, both stay white content
    surface. The rule is drawn only while the two are actually side by side: a stylesheet cannot see that a
    flex line has wrapped, so rather than restate 300 + 40 + 420 as a breakpoint (the mistake the bridge
    had just stopped making) `mxRowSplits` measures it and publishes one attribute. Measured 421 | 711 at
    1536px with the hairline present, and full width with no divider once stacked.
  - **`extended` proved, and `sequence`'s row contract with it.** `tests/visual/lessons/mathematics-compositions.json`
    is a NON-SHIPPING design fixture: a three-example sequence group, a single-example `standard` group and
    a genuine six-step derivation carrying a figure at the step that needs it. A presentation type is not
    established because the renderer accepts its enum value.
  - **Two defects the new composition exposed, both measured.** The staged region pinned its plane across
    `grid-row: 2 / span 30`, which bought thirty row gaps: a 676px plane sat above **383px of nothing**, and
    the state read as half empty. The plane and the explanation are now one grid cell each. And the
    comparison region printed **"WHY THE TWO AGREE" twice** — the group's `footLabel` over a part already
    carrying that name. A region may be titled above parts that name themselves, but never with a name one
    of them already says. And on a handset, the connection's label sat **flush on the ANSWER band** above it,
    because the only thing that had ever separated them was a tall plane in between. All three now have
    gates, each with the failure driven back.
  - **THE PRIMITIVE — one named-region rectangle for every worked example (sixth correction).** The page
    was aligning pieces of content; it now aligns SEMANTIC REGIONS, and the browser lays out named
    rectangles that the prose and mathematics merely flow inside: `TITLE` spanning the whole example, then
    `QUESTION | WORKED SOLUTION` with `ANSWER` as the final band of the working. One function (`mxWexEx`)
    emits it and one CSS grid with named areas lays it out — `standard` is one instance, `sequence` is N
    identical instances stacked (the shipping two-example Substitution page and the design fixture's three
    render the same two examples at the same geometry), a staged state, an extended derivation and each
    case of a collapsed comparison are the same instance again. **The regions are aligned, never the amount
    of content in them:** both take the row's full height, so a one-line question beside a three-step
    solution is a short question in a visibly defined rectangle — tinted (`--mx-ask-tint`, neutral, a shade
    neither the surface nor the ground is; the surface rule's own green test was the first to reject a
    greener one) and running to the surface's edge, with one quiet rule between it and the working and the
    two labels beginning on one line beneath the title. The example title no longer belongs to the ask side.
    The ANSWER lost its floating card: a rule above it, the label run in, the value flowing as text so a
    wrapped answer returns to the region's inset — the mobile drift the maintainer named (measured on the
    design fixture at 414px: the wrapped lines of the answer once sat at 121px against a 32px inset; they
    now return to 32px, and the control that restores the card shows them leave it again). Everything sits on one inset; nothing is centred, and
    the gate now measures every block and every plane against its region's inset at 1536, 1000 and 414px.
    - **the floors are read back from what the page published.** `mxRowSplits`, `mxBridgeFits` and the new
      `mxFootPairs` read the custom properties `.mx-wex` publishes rather than the constants, so the
      stylesheet and the decision cannot disagree and the gate's raised-floor control genuinely moves the
      decision (under a grid it would otherwise have shown as overflow, which is now asserted too). Split
      while the surface holds 300 + 16 + (22 + 1) + 420 = 759px; three zones while it holds
      2 × (300 + 22) + 340 + 2 × 22 + 2 = 1030px; GRAPH | INTERPRETATION above 340 + 22 + 1 + 300 = 663px.
      The proof script no longer assumes the shell's width — it finds the viability viewport by measuring
      the surface (1414px with the rail open) and shoots one pixel either side.
    - **`comparison` is three explicit zones, `CASE A | VISUAL EXPLANATION | CASE B`** — zone labels on
      one line, each zone the row's full height so its edges are the rules beside it whatever the cases'
      heights (proved with case B given five more steps than the plane is tall for; the control that stops
      the zones stretching leaves the rule short and is caught), each case the primitive in its stacked
      form with its question band reaching the zone's rule, the plane owning the middle at its natural size
      and never grown to fill it (at 1920px the zone is wider than the plane and the plane stays 560px).
      Measured at 1536px: 364 | 485 | 364, rules 548px tall, plane 439×483 at 35.04 / 35.07 px per unit
      (0.999). Below the floors the staged transformation is unchanged: `1 Workings` is two instances of
      the ordinary primitive, `2 Visual explanation` owns the graph and the synthesis.
    - **the staged graph check is `GRAPH | INTERPRETATION` as explicit sibling regions** with one top edge
      and one rule between them the full height of the plane, the plane at its natural 446×720 (26.83 /
      26.81 px per unit, 1.001) and the interpretation held to its 620px reading measure; a region whose
      first part already names itself is named by that part (the collapsed Symmetry visual state prints
      GRAPH, then "Why the two agree", never "Interpretation" over it). Stacked graph-first below the floors.
      Controls: centring the pair separates the labels; raising the plane's floor stacks the pair at 1536px.
    - **the same primitive, proved as such, not as two implementations that look alike.** The gate authors
      one example identically as the whole of a `standard` group and as a member of a `sequence`, and
      compares, element by element, the anatomy, the STYLESHEET RULES THAT REACH EACH ELEMENT and the
      geometry — a look-alike lives in the stylesheet, keyed on the composition, where geometry cannot see
      it; the control injects exactly such a same-value rule, shows the geometry unchanged and the
      provenance check fail. And every instance on the page — every group, every state — is shown to come
      through the one function (a spy marks its output; a control that hands one group a static copy of its
      own markup is caught).
    - **one contract changed on purpose:** a companion plane inside an example's working now follows the
      same natural-size rule as the staged plane (bounded on its longer side, `MX_PLOT_H`), so a portrait
      companion is drawn at the reviewed 446×720 rather than a quarter larger at 560 wide; the assertion
      that once required "the same width" for both shapes now requires the same bound. And a companion now
      sits BEFORE the answer, so the answer still closes the region (the render order had put it after).
    - **after the review of the pushed primitive — one product defect and eight look-alikes the gate let
      through, all closed.** Dragging a window through the comparison's floor rebuilt the page from the JSON
      and landed the reader on the first tab at the top of the page (pre-existing, but this stage makes the
      transition the intended behaviour): the rebuild now keeps the reader's tab, each group's state and the
      scroll positions, through one `mxShowTab` / `mxShowState` used by the click handlers and the restore
      alike, gated by driving a page through the floor and back. The gate then had to be made to catch what
      a look-alike could get away with: a rule keyed on a group id (the shipping Substitution page was never
      in the same-primitive comparison — it is now, every row of it, on both lessons, at 1536 and 414); a
      same-value rule hidden in `@supports` or another `@media` (every grouping rule is walked and the
      COMPUTED STYLE is compared as well as the selectors); an inline style written after `mxWexEx` returns
      (no instance may carry one); a position-keyed rule for rows 2..N (every instance on every page must
      have one geometry signature — title gap, insets, rule, tint); an implementation that stacks while the
      floors are met (the split is now asserted in both directions at widths either side of 759px); a
      120px channel beside the rule (the channels must equal the published pads and total under the 40px
      gutter that was rejected); a primitive that lost its region names (the regions are found by name);
      a synthesis confined to the working column (full width is asserted, title edge to working edge). The
      first row of a sequence had 4px of top padding where the others had 22 — a position-keyed geometry —
      so the sequence's own margin closes the gap to the lede instead. Natural size is ONE rule everywhere
      now: the bridge plane and the extended derivation's step visual take the same longer-side bound as the
      companion and the staged foot, and at 1920px the bridge plane sits exactly at its bound. Two visual
      loose ends: QUESTION and WORKED SOLUTION — peers on one line — were set in two label styles and now
      share one; and a 36px strip holding only the ⤢ button stood between GRAPH and its plane, so inside a
      region the affordance sits on the region's label line and the plane and the algebraic result begin
      the same 12px under their labels. HANDOFF §8c now states the companion bound it contradicted and
      records how "the same inset as the mathematics above it" was read (the step-number column, as the
      sketch draws it), for the maintainer to overrule in a line.
    - **`verify-notes-examples` 82 → 116** (a `primitive` section, every clause with a control), the
      proof set is the maintainer's nine — standard desktop/mobile, sequence × 2 / × 3 / mobile, Symmetry
      wide / narrow workings / narrow visual, graph check — plus the two transition widths, and the design
      fixture was updated first so sequence × 2 and × 3 author the same examples.
  - **Notes, two clean-ups only** (architecture frozen): the Key Idea was restating the fourth concept, so
    it now synthesises across the three tabs instead; it was also the last text-on-green writing surface in
    the family and is now white with a green edge; and the concepts card hugs its content rather than being
    stretched to match a much taller exploration panel.
  - **Notes redundancy audit.** `Selected coordinates` is gone from `Graph and key points`: three of its
    five points restated the labelled graph and the two it added are covered by the `Table to graph` tab.
    An explanatory region is authored content, not chrome every representation gets.
  - **The surface rule, locked.** Off-white is the application background, white is the content surface,
    green is a semantic accent. Explanation, worked reasoning, answers, captions and relationships had
    drifted back onto pale-green paper; green may now IDENTIFY them (a small label, a 3px left edge) but
    never CARRY them. The relation boxes and the ANSWER band are white with a green edge, and every
    worked-example composition sits on a white surface instead of being written onto the ground. That
    surface is now flat — the page heading, the group tabs and one white teaching surface are the whole
    chrome, because a rounded card floating on the ground read as an application dashboard rather than
    courseware.
  - **Uppercasing corrupts mathematics.** A part label set in small caps printed `VALUES OF Y = X²`, which
    is a different statement from `y = x²`. A label carrying notation now keeps its own case; a label of
    plain words still gets the small-caps treatment the rest of the shell uses.
  - **`.mx-part` named two different things** — a Practice question's (a)/(b) sub-part and a content part
    in the shared vocabulary. The Practice rule's `display:flex` was unscoped, so it reached the second and
    had been laying every part's LABEL beside its content instead of above it. Scoped to `.mx-parts`.
  - The fixture demonstrates the renderer rather than redesigning the mathematics: four concepts (no
    invented fifth), three complete demonstrations of one object, and three worked-example groups — one
    per composition type. `scripts/verify-notes-examples.mjs` is the gate (82 checks) and
    `scripts/shots-notes-examples.mjs` the proof set. The gate encodes the approved behaviour rather than the implementation: expected part
    counts, companion kinds, which steps carry visuals and how many tabs there are are all DERIVED from the
    lesson JSON, so re-authoring the fixture cannot quietly make the gate agree with itself. It asserts the
    product rules rather than this fixture's shape: no explanation, answer or caption on a green surface;
    every group one white surface; every authored example complete inside its group; rows of equal status
    that split only while both sides are a readable measure and stack otherwise; a region as tall as what it
    holds; a region named once; nothing reserved where nothing is authored. Where a floor decides a layout
    the gate reads that floor back off the app's own custom properties, so it cannot pass by agreeing with a
    number copied into the test. Controls change the JSON and show the page following it — a fourth example,
    a relabelled and reordered tab list, a companion re-authored from a graph to a table, a tab switched to
    _y_ = _x_² + 2 failing the same-object check, an answer painted green again being caught, raising the ask
    floor to collapse a row that was splitting comfortably, and cycling one group through all five types,
    which changes the composition every time while the examples, steps and answers survive unchanged.
- **Three defects the Stage C content exposed**, each invisible while the panels held placeholders: the
  inactive figure panel stayed displayed behind the selected tab (`.mx-figure[data-fig-viewport]` set
  `display:block` with no `:not([hidden])` guard, later in the sheet than the rule that has one); the
  Worked Example figure escaped its column at narrow widths, because `position:sticky` was the only thing
  containing an absolutely positioned stage; and in the worksheet that same stage took the figure out of
  the page's flow entirely. A table or a list now reads from the top of its panel rather than being centred
  in it like a figure, and a question stem no longer scatters across `.ws-q-h`'s flex row.
- **The Practice behavioural gates now run in CI** (`.github/workflows/practice-interaction.yml`):
  `verify-type-interaction`, `verify-workbook` (not automatic before) and, from Stage C,
  `verify-notes-examples`. The reason is on the
  workflow: Stage B shipped a Type workspace whose stored payload was provably correct while the student
  could not construct the sentence they intended, and no state gate could see it. Rendered interaction is
  part of the Practice contract, not a local diagnostic. Not a required check — that is branch protection,
  and the maintainer's call — on the same footing as `measure-surface` and `figure-container`.
- **A rendered-interaction acceptance layer, and what it caught.** `scripts/verify-type-interaction.mjs`
  (46 checks) asserts what a student can DO with keyboard, pointer and focus in the rendered page — keys
  pressed, not dispatched; focus read, not assumed — because the whole point of Stage B2's failures was
  that a green payload gate said nothing about whether the surface could be used. It found four more:
  - **Tab could not leave the equation editor in either direction.** TPMath binds Tab to caret motion
    inside the row, which left a keyboard user stuck in the field. The arrow keys already move the caret,
    so Tab is intercepted ahead of TPMath and left to do what Tab does everywhere else. The ribbon became
    two tab stops rather than forty (roving tabindex, the standard toolbar pattern), so Tab out of the
    field reaches Cancel and Insert in three more presses.
  - **A caret recorded inside a placed equation destroyed it.** Clicking an equation to edit it leaves the
    selection inside the chip; the next Insert deleted that equation's contents and nested the new one in
    its place. A position inside a chip is now recorded as the position just after it.
  - **`focus` overwrote the remembered caret.** Focusing a contenteditable with no selection of its own
    puts the caret at position 0, so an equation inserted after the page had been re-focused landed at the
    START. The caret is recorded when the student moves it and put back when the page is handed its focus.
  - **Leaving the Workbook view dropped the focus to `BODY`** — the Expand button lives inside the region
    the switch hides, so it went with it.
- **Semantics the surface was not exposing.** Write / Type had no `aria-pressed` — nothing said which
  lesson-wide mode was on; Expand lost its state whenever the pad was rebuilt; the two editor ribbons were
  unnamed groups; and a placed equation was `role="math"`, announced as static text with no hint that it
  could be opened, though Enter opens it. It is now a button whose name carries TPMath's own LaTeX, so it
  says what the student wrote. Escape and Cancel return the focus to whatever opened the editor — the
  Equation button, or the equation being edited — rather than to a plausible-looking default.
- **The Type styles reach nothing else, and the borrowed seam is written down.** Deleting all 23 Type-only
  rules changes the Type surface and leaves Practice/Write, Notes, Video, `graphQuestion` and both legacy
  Geolearn controls byte-identical. `HANDOFF.md` §8b now lists exactly which `.tp-slide` rules the pad
  depends on — the ribbon skin, the galleries, the caret, the maths face and the token block they read —
  so the seam cannot quietly become coupling.
- **Arrow-key ownership is a declared boundary, not a list of roles.** The page-turn stands down inside
  anything matching `textarea, input, [contenteditable=true], [data-tp-editing]`, and the two editing
  regions that are not native writing elements carry that marker. Measured both directions: held in the
  typed page, the TPMath field, a symbol button, a structure button, Insert, a placed equation and a
  question answer box; still turns the page on a workbook tab and on the lesson surface. The same boundary
  fixed `graphQuestion`, which shares the primitive.
- **The equation bar became an instrument a student can use.** An adversarial review of the Type surface —
  six independent lenses over the diff, each finding refuted by separate verifiers before it counted —
  turned up seven defects that every state gate was green on, because all of them are about the surface
  rather than the payload. Each is now fixed with a check and a control that drives the failure back:
  - **An equation landed at the end of the page, never at the caret**, and prose typed afterwards went in
    FRONT of it — so `Substituting [x = 3] into the rule gives [y = 9]` was not expressible at all, and the
    student's working came out in an order they did not write it in. The last caret inside the page is now
    recorded as it moves, and that is where Insert places the equation.
  - **Re-opening a placed equation typed in front of it**: TPMath mounts a restored expression with the
    caret at index 0, so re-opening `x²` and adding `+1` gave `+1x²`. It now opens at the end of the row.
  - **The bar was a keyboard trap.** TPMath takes Tab for caret motion inside the expression, which is
    right, but nothing else left the field either — a keyboard user who opened the editor was stuck in it.
    Escape abandons, Enter commits, both hand the page back its focus.
  - **Insert and the page tabs fell below the viewport on any laptop under about 800px tall**, with nothing
    to scroll: the control needed to finish the equation could not be reached. The writing surface now
    gives up its floor while the bar is open — a floor is a floor for writing, and the bar is what the
    student is looking at.
  - **The empty slots of a fraction were invisible.** They are `mtext.ph`, styled by the pack under
    `.tp-eqfield`; this field is `.mx-eqfield`, so inserting a fraction drew two slots with no border and
    the student had nothing to aim at.
  - **A blank line came back as two.** A contenteditable writes an empty line as a block containing one
    `<br>`; counting the block's break and the `<br>` inside it stored two newlines for one blank line.
  - **Focus fell to BODY** after Cancel and after adding a page, both of which replace or hide their own
    container. Cancel returns to the page; adding a page focuses the new tab.
- **What a student pastes is what a student keeps.** The typed page stores text and equation trees, so
  pasted markup was always discarded at the next render — the page just went on showing it until then, which
  reads as formatting that was accepted and then thrown away. Paste and drop now arrive as plain text at the
  point of entry (via `insertText`, so the browser's own undo still works), which also means no foreign node
  ever enters the document: a paste carrying `<img onerror>` no longer runs it in the student's own page.
  The control inserts the same content the way an un-intercepted paste would, and shows the markup arriving
  and the inline handler firing.
- **A placed equation can be re-opened from the keyboard.** It is focusable and says "select to edit", but
  only a pointer could do it — Enter and Space now open the editor on the focused equation.
- **Arrow keys belong to whatever is handling them.** The global `ArrowLeft/ArrowRight` page-turn tested the
  target ELEMENT against `textarea, input, [contenteditable=true]`, and that test was wrong twice over: the
  equation field is a `[role=textbox]` with a tabindex, and a placed equation is a focusable `[role=math]`
  chip sitting inside the typed page. An arrow aimed at either paged the lesson away and took the work with
  it. The handler now stands down on `e.defaultPrevented` and, via `closest()`, anywhere inside an editable
  subtree — so it covers whatever is put in a writing surface next, rather than growing a list of roles. It
  also fixed the same latent bug in the graph question's editor. (A focused equation chip is now inert under
  the arrow keys rather than destructive; giving it caret motion belongs with the accessibility pass.)
- **Stage B — the Practice workbook.** The visual shell is now the real thing, on the app's OWN stroke
  engine (`[data-tp-ink]`): pressure-variable pen, eraser, clear, grid paper. What is new is WHERE the
  strokes live. The engine gained a second storage backend, selected by attribute: a pad that names a
  response (`data-tp-resp-page/-id/-slot`) reads and writes the A0 store under authored identity, while a
  pad without them keeps the index-keyed `TP_RUNTIME` slot it has always used. Nothing about capture,
  pressure, erase, undo or redraw differs between them — only where the array lives.
  A workbook is one response with several sheets: `{current:'w1', pages:[{id:'w1', strokes:[…]}, …]}`, so
  the bundle names page → response → kind → payload and none of them is a position. Sheet ids come from a
  counter that only goes up, so adding a sheet never renumbers an existing one. Switching sheet replaces one
  element and re-wires it rather than re-rendering the page, so the question column keeps its place and the
  old canvas's listeners go with the old node.
  The sheet is a PLANE, like the coordinate plane: a fixed horizontal scale (1000 units across) with its
  height taken from the region, so enlarging or narrowing the workbook shows more or less of the sheet and
  never rescales what is already written on it.
  `workspace.kind` is now the approved vocabulary — `grid` is implemented; `graph` and `geometry` are Stages
  F and G. A table of values takes structured entry because the empty cells ARE the question; every other
  question stays a prompt, with no answer box and no card. Cells are keyed by their column value, so a
  response says "when x = −3" rather than "the first cell".
  Responsive: the split is the Practice composition and a tablet keeps it; only a handset (≤760px) drops to
  one region at a time behind a Questions / Workbook switch. Switching view, or opening the navigation
  drawer, keeps the question scroll position, the sheet, its ink and the response mode — the switch is a
  class flip plus a remembered scroll position, because hiding a region resets whatever was scrolling it.
  No browser storage anywhere. Gate: `scripts/verify-workbook.mjs` — 31/31, every stroke drawn with real
  pointer events through the real canvas and read back from the store or from painted pixels, including the
  three requested controls (sheets sharing one array; a DOM-local workspace; a reordered lesson).
  `scripts/shots-workbook.mjs` is the Stage B proof set.
- **The page-family boundary, written down and measured.** Three families, deliberately separate:
  Mathematics (responsive, purpose-built templates), a future generalist/humanities family (its own base
  layout language plus subject overlays, designed from scratch when Mathematics is stable), and the legacy
  fixed-canvas renderers (untouched until a migration is commissioned). The Mathematics templates are NOT a
  universal page system and the legacy pages are NOT a visual reference for the future one — they are kept
  only as `legacy-canvas-control` / `legacy-video-control`. Recorded in HANDOFF.md §9, at the `PAGES`
  registry, and in the proof-set script; enforced by a new `isolation` section in
  `verify-responsive-shell.mjs` that walks every Mathematics page and fails on any class outside the
  shell's own or the Figure engine's, asserts the single documented shared seam, and asserts that `PAGES`
  holds exactly one theme. Audited: the shell's only calls out of itself are `esc()`, `go()`, `tpRespId()`
  and `fragFigure()` — no pack renderer is referenced.
- **The coordinate plane is a viewport, not a picture (figure engine).** Axis EXTENT and tick GENERATION
  were the same concern: `figSvgBody` drew each axis from `sx(dom.x0)` to `sx(dom.x1)`, and `figView` maps
  the domain exactly onto the plot rect — the box minus the gutters that hold the tick labels — so the axis
  stopped at the gutter and the last labelled tick WAS the end of the axis. `figView` now also returns
  `view`: the same mapping evaluated at the box edges, i.e. the mathematical range the whole svg covers. The
  transform is untouched — `sx/sy/ix/iy/pxPerX/pxPerY/dom` are byte-identical, so every measurement, label
  placement and geometry solve is unchanged — this only NAMES a range that was always there, so axes, grid
  and plotted curves run to the viewport boundary while ticks and labels are still generated from the domain.
  A figure inside a `[data-fig-viewport]` host also takes its HEIGHT from that container instead of deriving
  one from its width, so the plane owns its whole region and takes its shape: measured, a 628×636 container
  gives an 11.4 × 11.5-unit viewport, a 628×298 one gives 24.1 × 11.4 and a 401×604 one gives 11.2 × 16.9.
  **Tick density, interval and label format are deliberately NOT touched.** `FIG_TARGET_TICKS` stays the
  constant 5 it has always been, and nothing in the viewport work reads it. `verify-figure-render` moves 48
  of 240 units — the graph fixture is exactly 48 units, so that is every graph unit and nothing else — and
  across all 48 **not one recorded field changes**: box, tick count, and minimum/maximum type size are
  identical in every one. The difference is only where the axis, grid and curve stop. Geometry (120 units)
  and the measure surface (72) do not move at all, because a geometry figure draws no grid unless it is
  authored `grid: "shown"`. `verify-label-placement` 927/927 and `verify-geometry-semantics` 204/204 are
  unchanged.
- **`callouts: "hidden"` on a figure** — the same vocabulary as `grid`. A figure that only illustrates has
  nothing to reveal on tap, and the Figure Shell's hint ("Select a point to read its coordinates") is keyed
  on the callout count, so an explanatory Notes figure was inheriting interaction copy it cannot honour. The
  field is opt-in, so no existing figure moves.
- **The Notes representation workspace renders the real Figure path.** It was a hand-drawn stand-in; it is
  now `fragFigure` → `figGraph` → `figSvgBody` on an authored `figure` spec, registered in FIGX and
  re-solved through `figInlineSolve` against its host. Graph Practice and the Interactive workspace inherit
  the viewport behaviour rather than reinventing it.
- **The Mathematics Video page.** The video is the dominant asset and everything else is subordinate to it:
  the template owns the video region and the shell's workspace slot carries the supporting material —
  chapters, what to watch for — with the after-watching prompts and the transcript control beneath. Stage A
  is the layout; Stage D wires playback. Nothing is borrowed from the legacy `video` block, which is a
  different design for a different theme and now appears in the proof set only as `legacy-video-control`.
- **`scripts/shots-mathematics.mjs`** — the Stage A proof set, reproducible in one command, in two clearly
  separated categories: `mathematics-*` screenshots define the design, `legacy-*` screenshots exist only to
  prove non-regression and must not influence a Mathematics renderer. An index sheet makes the split
  obvious at a glance, and the legacy screenshots continue to look exactly as they always have.
- **A0 — response identity, and the seam a submission will one day use.** Student answers now live in
  `TP_RESP`, keyed by an AUTHORED page `id` and an authored response `id` rather than by array position.
  `TP_RUNTIME` — keyed by `cur`, the slide index — stays exactly as it is for ephemera, because it is the
  wrong thing for a bundle that gets submitted: reorder the pages of a lesson and a student's ink rebinds
  to whichever page moved into that index. `verify-response-store.mjs` drives that exact reorder through
  both stores and shows the old one reattributing the answer (22/22, both non-vacuity controls included).
  Identity is authored and never invented: a duplicate page or response id is REPORTED at load
  (`tpRespAudit`), never silently suffixed, because a suffix would quietly split one student's work in two.
  `tpRespBundle()` returns a deterministic, key-sorted, deep-copied, JSON-serialisable snapshot — mutating
  what it hands back cannot reach live state. The submission seam ships with its only adapter, `none`,
  which collects and delivers nothing; still no storage of any kind (golden rule 2).
- **A — the Mathematics page shell.** The responsive layer's first pass was rejected on sight: it made the
  OLD application shell responsive instead of building the Mathematics product. This replaces the shell and
  keeps the architecture. The approved mockups are now the visual source of truth, and its palette is
  measured from them rather than invented — sampling the approved screens pixel by pixel, 60–69% of every
  one is pure white, pale green tints sit at 1–3%, and there is no beige anywhere; the greens cluster at
  #047C4B/#157344, kept here as ONE accent token. The darks read near-black with a blue cast; per the brief
  this shell uses a neutral charcoal instead, so body text is not blue.
  **The application chrome is absorbed, not stacked on top.** `.top`, `.side` and `.foot` are hidden on a
  responsive page and the Mathematics bar carries their controls as PROXIES that click the real hidden
  buttons — so Study/Edit/Present/Worksheet/Export and the page pager keep their existing handlers and
  cannot drift, and there is exactly one navigation on screen instead of two. The rail names lesson
  sections with an icon and a soft green active state, not page numbers; the number is secondary metadata
  in the bar. The persistent bottom Back/Next bar is gone.
  **Space belongs to the mathematics.** A page template declares its own surface at registration
  (`panel` or `flush`): Notes is two panels that fill the frame; Practice is a textbook question column on
  white with the workbook PERSISTENT beside it — the questions scroll, the workbook does not, which is what
  makes it a workbook. A closed inline convention (`_x_`, `^2`) sets variables in italic and exponents as
  exponents; it runs AFTER `esc()` and can only ever emit `<i>` and `<sup>`, so author text can never
  become markup. The lesson-level Write/Type selector is session-only and appears only on a page that takes
  written work.
  Kept from the rejected pass, unchanged: A0's response identity, the submission seam, renderer-owned
  `layoutMode` (never lesson JSON), no whole-page 1280px scaling, legacy canvas isolation, the drawer at
  narrow widths. `verify-responsive-shell.mjs` (67/67) pairs every width assertion with a legacy control
  page rendered in the same browser, which stays pinned at 1280 logical px while the responsive page really
  reflows.
  **Nothing is shadowed.** Two names in the approved page vocabulary — `video` and `interactive` — are
  already canvas page types under `mathematics`. Taking them measurably changed 5 of `verify-corpus-identity`'s
  250 units, so the Stage A shells for those two sit under deliberately temporary names pending that decision.

- **C6b — the learning card.** One instructional-card primitive with two homes: the `text` block, and a
  figure's new `companion`. There is deliberately no second "figure prose card" renderer — the two callers
  differ only in where the card is placed, and placement is the surrounding block's business. The card is
  location-independent by construction: it draws its own surface and never depends on an ancestor, which is
  why the existing `--frag-card-*` treatment could not be reused (its selector reaches direct children of
  `.tp-flow` only, so it structurally cannot see a card inside `.tp-figl`).
  **`text` extends, `section` does not.** `section` deliberately scopes its body to 16.5/1.62 — its own
  comment says *"never the global `--tp-prose-size`, which would restyle shipped pages"* — while the
  approved mockups use exactly that scale, which `.tp-frag-prose` already resolves. A block carrying none of
  the new fields takes the original path; the guard is presence, like `hasPoi`.
  **`fontStyle` is a category, never a font.** `--tp-serif`/`--tp-body` could not carry it: `--tp-serif` is
  Courier Prime (mono) under microhistory and Inter (sans) under geolearn, `--tp-body` is a serif under
  mathematics, and the `egypt` theme shipped in two lessons has no token block at all. Two new root-level
  face slots resolve it instead, each paired with an optical size, because the faces do not share an
  x-height (measured per em: EB Garamond .4063, Inter .5469 — the same px reads ~35% larger in the sans).
  The face is applied to the card's own text classes and **never to its container**, so the 35 rules that
  carry `font:inherit` — every button and select — cannot pick it up; mathematical notation is insulated
  independently by the `math` element rule.
  **`icon` is a closed allow-list, and that is a firewall boundary.** `tpIc` treats anything image-shaped as
  an image (`tpIsImgIcon` → `<img src>`), so an authored `icon` passed straight through it would have been a
  new third-party runtime host — and invisible to the only required CI gate, since `validate.mjs` inspects
  URLs only under `url`/`externalVideoUrl`/`sourceUrl` and scans hosts only in `<script>`/`<link>`, never
  `<img src>`. Membership is checked before `tpIc` is ever called; a URL, a `data:` URI, a path or an
  unknown name is reported and drawn as nothing.

### Fixed
- **`scripts/vendor-fonts.mjs` could silently delete a hand-vendored face.** LM Math was vendored by hand
  into the generated `VENDORED-FONTS` block, and `.tp-slide math` depends on it. Re-running the generator
  wiped both — MathML fell back to the browser's generic `math` family — and the only thing that noticed
  was one assertion in `verify-learning-card`. The generator now carries any hand-authored CSS above the
  generated faces through untouched, and a re-run is byte-identical.

- **The `beside` prose floor measured the wrong box.** `FIG_BESIDE_MIN_PROSE = 260` was compared against the
  raw grid column, so with a carded companion (measured: 64px of padding and borders) a column at the floor
  delivered ~196px of readable text while the constant's own comment claimed "~32ch at 16px". It is now
  `FIG_BESIDE_MIN_PROSE_CONTENT`, compared against the column minus the companion's **measured** chrome —
  the same thing `FIG_MIN_STAGE` means for the figure. The number is unchanged; only the box it describes
  is. **The transition points did not move** — graph leaves `beside` at 755px available, geometry at 915px,
  identical with a carded and an uncarded companion, because the figure minimum is still the binding
  constraint. That the constraint can bite at all is proven rather than assumed: inflating the card's chrome
  to 324px moves the graph transition to 1191px while leaving an uncarded companion at 755px.
- **`beside` siblings are top-aligned.** `align-items:center` → `start`: the card is never stretched to the
  shell's height and the shell is never squashed to the card's. Long prose takes vertical space instead.
- **A class-name collision that markup hashing could not see.** The card was first written as `.tp-card`,
  which microhistory's own title slide has emitted since long before Stage 4. All 30 legacy render hashes
  stayed green while that shipped card silently changed from `display:block`/`padding:0` to
  `display:flex`/`padding:26px 30px 24px` and grew 605 → 619px. Renamed to `.tp-lcard*`, and the gate now
  asserts from **computed style** that the prefix belongs to the learning card alone.
- **The card chip was invisible.** Pairing `--primary-fixed` with `--on-primary-container` painted the label
  onto its own background — every theme defines the latter as a light ink for the *dark* `--primary-container`
  (measured 1.09:1 in mathematics). The ink is `--on-surface`, and the pair is contrast-checked in every
  designed theme rather than eyeballed: 13.25–14.94:1.

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
