# Stage 3d PROTOTYPE — side-measurement chip

**Not approved, not part of Stage 3, not on the #151 branch.** This branch exists only so the
prototype survives the session container; the maintainer has not decided whether the treatment
ships. Delete the branch to discard it.

## What it does
Gives the SIDE MEASUREMENT annotation role its own surface — a pale, accent-derived chip — while
vertex names, symbolic maths and angle measures keep the typography they have.

## Reproduce
    python3 -m http.server 8099            # from the repo root
    node prototypes/stage-3d-measure-chip/cap.mjs     lesson-studio.html <fixture> <outdir> pill
    node prototypes/stage-3d-measure-chip/measure.mjs lesson-studio.html <fixture>   # clearance / region / slack
    node prototypes/stage-3d-measure-chip/fill.mjs    lesson-studio.html <fixture> CHIP
    node prototypes/stage-3d-measure-chip/a11y.mjs    <fixture>          # contrast
    node prototypes/stage-3d-measure-chip/mono.mjs    <fixture> out.png  # greyscale

`<fixture>` = `prototypes/stage-3d-measure-chip/pill-proto.json`. `shots/` holds the captures the
review was based on. The harness scripts hard-code `/opt/pw-browsers/chromium`.

## Measured (all five scenes)
clearance >= 6.0 (= FIG_GAP) · 0 off-canvas · 0 interior flips · 0 wrong-side · shape fill
identical to bare · corpus 250/250 · graph placement 785/785 · geometry semantics 204/204 ·
chip ink contrast 7.00:1.

## Known, deliberately unfixed
The shared `figPillSize`/text-width approximation over-reserves: slack is ~0.3px on a single digit
but 13.9px on `3.21 cm`. Invisible as whitespace on bare text; visible as loose padding on a chip.
Out of scope by instruction; `figMeasSize` receives the complete formatted string so a better
estimator swaps in locally.
