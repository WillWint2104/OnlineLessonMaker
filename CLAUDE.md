# CLAUDE.md — operating brief for Claude Code

You are developing **Lesson Studio**: a single‑file web app for authoring and delivering
interactive secondary‑school lessons (NSW Ancient History / History / Geography).

**Read first:** `HANDOFF.md` (architecture, full data model, deployment, firewall),
`README.md`, and `docs/CHECKING.md` (how we verify themes/progress).

## Golden rules — do not break
1. The app is ONE self‑contained file: `lesson-studio.html` (HTML + inline `<style>` + one
   classic inline `<script>`). No framework, bundler, or build step for the app itself.
   Don't split it or add runtime dependencies to it.
2. Never use `localStorage` / `sessionStorage`. The app is intentionally stateless; its state
   is the file, persisted via Export.
3. Escape ALL user/content strings interpolated into HTML with `esc()` (XSS).
4. No NEW third‑party runtime host (`<script src>`, `<link href>`, `@font-face` URL, iframe)
   unless vendored / served same‑origin — school firewalls block third parties. If one is
   needed, vendor it (see Priority 1) so `node scripts/validate.mjs` reports no third‑party
   hosts.
5. After any change these must hold (CI enforces both): the LAST `<script>` in the file
   passes `node --check`, and the `#lesson-data` JSON parses and has a `slides` array.

## House style
Terse vanilla JS; CSS custom properties for theming (`:root[data-theme="…"]`); DOM is
string‑built per slide in `renderSlide()`; event handlers are (re)attached every render in
`wire()`; live editing uses `data-bind="slides.N.field"` (+ `data-split` for arrays). Match
the surrounding code — don't reformat unrelated lines.

## Workflow
- Work on a branch; SMALL, reviewable PRs. Never commit straight to `main`.
- Verify BEFORE opening a PR:
  - `node scripts/validate.mjs` → must pass (no `✗`).
  - `npm install && npx playwright install chromium`, then `node scripts/shots.mjs` →
    eyeball `screenshots/<theme>/…` for the themes/slides you touched.
    (Web‑fonts and 3D only load with internet; offline they fall back — expected.)
  - If you touched engine/layout, re‑check the slices listed in `docs/CHECKING.md`.
- Open the PR with `gh pr create` and fill the PR template. CodeRabbit reviews, the
  `validate` check gates, auto‑merge lands it when clean, GitHub Pages deploys `main`.
  Don't bypass review or force‑merge.
- In the same PR, update `CHANGELOG.md` (and `HANDOFF.md` roadmap if scope changed).

## Definition of done
`validate` green · screenshots reviewed for affected themes/slides · `CHANGELOG.md` updated ·
no new third‑party host (or it's vendored) · `esc()` on every new interpolation · still one file.

## Current priorities (highest first)
1. **Vendor fonts + model‑viewer (firewall hardening).** Bring the font `woff2` files into
   the repo (e.g. via `@fontsource/*`: eb-garamond, hanken-grotesk, cinzel, fraunces, oswald,
   space-grotesk, marcellus) plus a `@google/model-viewer` dist file (e.g. under `vendor/`);
   replace the Google‑Fonts `<link>` with local `@font-face`, point the model‑viewer
   `<script src>` at the local copy, and host the sample GLB locally. **Done when** a
   published lesson makes zero third‑party requests and `validate.mjs` reports no third‑party
   hosts. Keep it one HTML file (font CSS can be inline or a same‑origin stylesheet served
   from the repo).
2. **WW1 design pass.** Apply the WW1 visual direction over the existing slide types and wire
   NSW Stage 5 History (HT5‑…) outcomes into the outcomes slide (as Egypt carries AH11‑…).
3. **Accessibility pass.** Focus rings, ARIA on interactive hotspot dots, keyboard access to
   hotspots, `prefers-reduced-motion` for the dot pulse, contrast audit.
4. **Dormant `task` slide type.** Decide with the maintainer: delete fully or rebuild.

## Ask the maintainer before
Adding a build step · changing the single‑file architecture · adding persistence/backend ·
any large refactor · changing the deploy/CI/auto‑merge setup.
