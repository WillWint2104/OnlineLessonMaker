# Changelog

All notable changes to **Lesson Studio** are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); add a line for every PR so
"what changed and was it checked" stays visible (see `docs/CHANGELOG` note in
`docs/CHECKING.md` §Cadence).

## [Unreleased]

### Changed
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

### Added
- **Slide-type palette** — a categorised, wireframe-thumbnail "add a slide" surface (Edit
  only, bottom strip) replacing the append-only chip menu. Category tags (All · Structure ·
  Text & notes · Media · Source & questions) filter a horizontally-scrollable row of
  hand-built wireframe thumbnails (one per type, with chevrons). **Drag** a thumbnail onto
  the slide list to insert a new slide at that position (the reorder drop-indicator is
  reused; a new-type token in `dataTransfer` distinguishes insert from reorder); **click** a
  thumbnail to insert after the current slide. New slides reuse the existing factory
  (extracted to `SLIDE_FACTORY` / `makeSlide`) and open selected in the inspector. Sidebar
  drag-reorder / ✕ / ▲▼ unchanged. STUDY / PRESENT / EXPORT and the data model unchanged.

### Removed
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

### Changed
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

### Added
- Dev tooling baseline (not part of the single-file app): `package.json` (dev-only
  `playwright`), `scripts/shots.mjs` (theme × slide screenshot harness),
  `.github/workflows/screenshots.yml` (informational PR artifact, non-gating),
  `.github/pull_request_template.md`, this changelog, and `docs/CHECKING.md`.

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
