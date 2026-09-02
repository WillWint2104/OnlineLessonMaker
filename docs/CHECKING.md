# Checking themes & progress as we go

Four layers, from automatic to manual, plus one on-demand regression check. You rarely need all
of them — the top two catch most things.

## Layer 1 — CI gate (automatic, blocks merge)
`scripts/validate.mjs` runs on every PR (`validate` workflow). It hard‑fails if the lesson
JSON won't parse or the engine `<script>` isn't valid JavaScript, and warns about
`localStorage` / new third‑party hosts. **Green = nothing is structurally broken.** This is
the gate auto‑merge waits on.

## Layer 2 — Screenshot artifact (automatic, visual, does NOT block)
The `screenshots` workflow renders the app across **all themes × key slides** on every PR
and uploads the PNGs. To review: open the PR → **Checks/Actions** → the *Screenshots* run →
**Artifacts** → download `screenshots` → flip through `…/<theme>/…`. Because the CI runner
has internet, these show **real fonts and 3D** — higher fidelity than a local offline run.

Default coverage: `imperium, microhistory, geolearn` × slides `0,1,2,5,9,11`. Change with env
vars, e.g. `THEMES=imperium SLIDES=0,1,9 node scripts/shots.mjs`; `LESSON=<path>` forces one
lesson for every theme, and `CHROMIUM_PATH=<path>` points at a prebuilt browser where Playwright
cannot download its own.

**The harness loads a lesson** (`examples/<theme>-sample.json`, falling back to the imperium
sample) rather than screenshotting whatever the app ships with. It used to rely on the app's
embedded `#lesson-data`, which has been an EMPTY lesson since #89 — so from 2026‑07‑03 it wrote
**zero** PNGs, `upload-artifact` skipped the empty directory with only a warning, and the
`screenshots` job stayed **green with no artifact attached** while this page told you to skim it.
`shots.mjs` now exits non‑zero if it writes nothing, so a silent no‑op fails instead of passing.
If a `screenshots` run is green, confirm the artifact actually exists before ticking the box.

## Layer 3 — GitHub Pages production after merge (the real thing)
GitHub Pages has **no native per‑PR preview**. So pre‑merge, lean on the **screenshots
artifact** (Layer 2) plus `node scripts/shots.mjs` locally; post‑merge, `deploy-pages` ships
`main` and you open the **live** `https://willwint2104.github.io/OnlineLessonMaker/` page in a
real browser — ideally **on the school network**, the only place that truly answers "will it
transmit to students?" (fonts, 3D, embeds, firewall). Because there's no preview, do the
visual review carefully at Layers 1–2 before merge.

## Layer 4 — This chat (on demand)
When we change something here, I render the affected themes/slides and show them inline
before you ever open a PR. Use this for fast iteration on look‑and‑feel; use Layers 1–3 to
confirm on the real stack.

## Regression check — corpus render byte-identity (on demand)
`node scripts/verify-corpus-identity.mjs` renders **every committed lesson** in `examples/` and
`lessons/`, re-skinned to all five pack themes, slide by slide through the app's own `render()`,
and compares `#slide.innerHTML` byte for byte against another git ref (default `origin/main`).
It is how you answer *"did this change move any existing lesson?"* — the question #146, #147 and
#149 each answered from a throwaway script that no one could re-run.

```
node scripts/verify-corpus-identity.mjs                  # working tree vs origin/main
node scripts/verify-corpus-identity.mjs --ref HEAD~1     # vs any ref
node scripts/verify-corpus-identity.mjs --themes imperium,scholarmath --max-diffs 5
```

Every non-local request is aborted in both pages, so a render is a pure function of the engine
and the lesson JSON — the corpus' remote video posters otherwise made a handful of units differ
per run purely on timing. A mismatch names the exact **lesson / theme / slide** and exits **1**.
Render time is printed for orientation and never fails the run: a wall-clock number off one
shared runner is not a benchmark, and asserting on it would only make the check flaky.

Expect **all-identical** for an engine addition or a fix that no committed lesson exercises. A
real difference is not automatically wrong — it just has to be one you intended and can explain.

---

## What "the theme looks right" means — per‑theme eyeball list
For each theme, check on the **artifact** and **outcomes** slides plus **Present** mode:

- **Accent** colour is the theme's (Egypt terracotta · Rome crimson · Wellbeing green ·
  WW1 poppy) on eyebrows, buttons, pills, hotspot dots.
- **Card surface** is the warm/cool paper for that theme — not stark white on a tinted page.
- **Sidebar** text is legible against its background (Egypt = light sidebar/dark text; the
  others = dark sidebar/light text).
- **Display font** loaded (EB Garamond · Cinzel · Fraunces · Oswald). If everything looks
  like one generic serif/sans, fonts didn't load — check the layer (offline run vs CI/preview).
- **Motif** mark shows in the sidebar brand (lotus · laurel · leaf · poppy).
- **Hero gradient** on the cover matches the palette.
- **Contrast** is readable (body text, muted labels, syllabus chips).

## Slice to check after any engine change
Run/skim these slides — they exercise the tricky layout code:
`cover` (fills) · `outcomes` (image‑heavy + syllabus popup) · `artifact`/`external`
(two‑column balance) · `notes` (reveal toggle) · `source‑6B` (image + hotspots, internal
scroll) · `model3d` (sized container) · `complete` (centred). Plus **Present** mode on one
content slide (fills board, click + arrows, no nav bar) and **Edit** mode (text edits stick,
hotspot drag works).

## Cadence
- **Every PR:** Layer 1 must be green; skim Layer 2 (there's no PR preview — this is the
  pre-merge visual check); open the live Layer 3 page after merge if the change is visual or
  touches delivery.
- **Before a lesson goes to a class:** open the GitHub Pages **production** URL on the school
  network and click through the whole lesson once.
- **Log it:** add a line to `CHANGELOG.md` so "what changed and was it checked" stays visible.
