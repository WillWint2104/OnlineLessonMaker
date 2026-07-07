# Lesson Studio — Handoff & Developer Notes

_Last updated: 2026-06-20_

This is the working state of **Lesson Studio**: a single‑file, no‑backend web app for
authoring and delivering interactive secondary‑school lessons (built first for NSW
Ancient History — Tutankhamun, with Rome / Wellbeing / WW1 themes alongside).

If you are picking this up cold, read **Architecture** and **Data model** first, then
**Working on the engine** before you touch anything.

---

## 1. What it is

- **One file:** `lesson-studio.html`. HTML + inline `<style>` + one classic inline
  `<script>`. No build step, no framework, no bundler.
- **No backend, no database, no `localStorage`.** All lesson content lives in a single
  JSON blob inside the page. State is the file. To persist, you **Export**.
- **Three modes:** _Study_ (student view), _Edit_ (author in‑place), _Present_ (full‑screen
  board mode, click / arrow‑key navigation).
- **Delivery model:** the teacher exports a standalone, study‑only HTML file per lesson and
  hosts it (see **Deployment**). Students open a link. No accounts.

## 2. Repo layout

```
lesson-studio.html          # the app (authoring + delivery engine)
HANDOFF.md                  # this file
README.md                   # quick start
.coderabbit.yaml            # CodeRabbit PR-review config
.gitignore
scripts/
  validate.mjs              # CI checks: JSON valid, engine syntax valid, firewall guardrails
  shots.mjs                 # Playwright theme × slide screenshot harness
  vendor-fonts.mjs          # dev: base64-inline @fontsource woff2 into the app
  make-sample-glb.mjs       # dev: emit assets/vendor/sample-cube.glb
assets/vendor/              # same-origin runtime assets (model-viewer.min.js, sample-cube.glb)
lessons/                    # exported, published lessons (served to students)
  README.md
docs/v3/v3-composable-pages.md  # v3 plan — composable pages & object interactivity (read before Phase A)
.github/workflows/
  validate.yml              # runs scripts/validate.mjs on every PR/push
  automerge.yml             # enables GitHub auto-merge on clean PRs
  deploy-pages.yml          # deploys the repo root to GitHub Pages on push to main
```

The **app** (`lesson-studio.html`) is published too, so you can author from any machine.
Exported **lessons** go in `/lessons` and are what students actually open.

The **v2 rebuild spec** lives in [`docs/v2/onlinelessonmaker-v2-architecture.md`](docs/v2/onlinelessonmaker-v2-architecture.md) — the architecture constitution and entry point (the domain-pack specs are referenced from within it).

## 3. Architecture

Everything is driven by one object, `LESSON`, of shape:

```js
LESSON = {
  meta:   { title, theme,            // theme: neutral|egypt|rome|wellbeing|ww1
            subject?, year?, unit?, outcomes? },   // optional program-map tags (Edit › Lesson)
  slides: [ { type, ..., layout? }, ... ]          // layout?: "fit"|"scroll"; see Data model
}
```

- On load, `LESSON` is parsed from `<script id="lesson-data" type="application/json">`.
- `renderSlide()` is a big `if/else` on `s.type` that builds an HTML string for the current
  slide into `#slide`.
- `wire()` runs **after every render** and attaches all event handlers (the DOM is rebuilt
  each slide, so handlers are re‑attached each time — there are no long‑lived listeners on
  slide content).
- **Editing is the Edit-mode inspector** (not inline contenteditable any more). In Edit the
  canvas renders **Study-identical** (`renderCanvas()` temporarily forces `mode='study'` while
  building, so no contenteditable / inline editors / edit-only sizing — true WYSIWYG).
  `tagZones()` then adds `data-zone` hooks (derived from the existing `data-bind` paths +
  media wells) and the selection outline; clicking a zone sets `selZone` and
  `renderInspector()` builds a schema-driven right panel. Panel fields still use
  `data-bind`/`setP` (and `data-split` for one-per-line arrays); a panel `input` calls
  `renderCanvas()` (canvas-only, so the field keeps focus). STUDY/PRESENT/EXPORT and the data
  model are untouched — Edit is a UI layer.
- **Theming** is pure CSS custom properties: `:root[data-theme="…"]` blocks define the
  palette/fonts/motif; `setTheme(name)` sets/removes the `data-theme` attribute on `<html>`.
- **Lightbox / popups** (`lb(html)` / `closeLb()`) inject arbitrary HTML into a shared
  full‑screen overlay (`#lightbox`). Used for expanded images/3D, the syllabus popup, and
  hotspot window/video cards.

### Key functions (in the `<script>`)

| Function | Role |
|---|---|
| `renderSlide()` | `renderCanvas()` + `renderInspector()` |
| `renderCanvas()` | builds the slide HTML (switch on `s.type`); Study-identical even in Edit |
| `fitCanvas()` | scales the fixed 1280×720 `.canvas` (`transform:scale(s)`) to fit the `.stage`; FIT vs SCROLL; sizes the `.canvasfit` footprint. A ResizeObserver on `.stage` re-runs it |
| `tagZones()` / `renderInspector()` | Edit-mode: tag `data-zone`s + selection; build the right properties panel |
| `wire()` | (re)attaches all handlers after a render |
| `setP/getP` | read/write a dotted path into `LESSON` (e.g. `slides.3.title`) |
| `esc(s)` | HTML‑escape (use for **all** user content interpolated into HTML) |
| `markNotes(t)` | turns `==phrase==` into a `.noteable` span (notes highlighter) |
| `toEmbed(url)` | normalises a YouTube/ClickView/iframe URL into an embeddable src |
| `qItems(i,items)` | renders the question cards (prompt → answer box → model answer) |
| `sourceMedia(i,m)` | renders source media (text / image+hotspots / 3D model) |
| `poiDotsFor(i,pois)` | renders numbered hotspot dots positioned by `x%/y%` |
| `openPoi(b)` | dispatches a hotspot click by kind → tooltip / window / video |
| `poiEditor(i,m)` | edit‑mode hotspot editor (kind, title, text, url, add/remove) |
| `showPoi(el,t,info)` | small tooltip popover positioned next to a dot |
| `lb/closeLb/expand` | shared overlay + image/3D expand |
| `go(i)` | navigate to slide `i` (`renderNav` + `renderSlide`) |
| `setPresent(on)` | toggle `body.present` + request/exit fullscreen |
| `setTheme(name)` | apply/remove `data-theme` |
| Export | serialises `LESSON` into `#lesson-data`, clones the doc, ships a study‑mode standalone HTML download |

## 4. Data model (slide types)

Add a slide from the **slide-type palette** (the categorised wireframe strip at the bottom
of the Edit area): **drag** a thumbnail onto the slide list to insert at a position, or
**click** it to insert after the current slide. New slides come from `SLIDE_FACTORY`
(`makeSlide(type)`) and open selected in the inspector. Hand‑editable via the **⌗ JSON**
panel. Fields:

- **cover** — `{ tag, title, sub, titleItalic?, startLabel?, est? }`
- **outcomes** — `{ eyebrow, heading, image, outcomes:[string], syllabus:[{code,text}] }`
  Image‑heavy layout; syllabus shows to students via the **NSW Syllabus Links** popup, and
  is edited inline in Edit mode.
- **notes** — `{ heading, blocks:[{h,bd}], guide }`
  `bd` supports `==markers==` → revealed by the **Highlight what to record** toggle.
- **image** — `{ heading, src, cap }`
- **video** — `{ heading, url, cap, sourceUrl?, sourceLabel? }` (`url` → `toEmbed`). An
  always-visible **"Open source" fallback link** renders below the embed (school networks block
  embeds): `href = sourceUrl || url`; text = `sourceLabel || "Open video ↗"`. `target=_blank
  rel=noopener noreferrer`; in Present it opens the source without advancing the slide.
- **question** — `{ skill, heading, items:[{prompt,model,improve:[string],pitfalls:[string]}] }`
- **source** — `{ heading, credit, media, items:[question…] }`
  `media.kind` is `text` / `image` / `model3d`:
  - text: `{ kind:'text', text, pois:[{anchor,title,info}] }` (anchor = phrase to underline)
  - image: `{ kind:'image', src, pois:[{x,y,kind,title,info,url}] }` (see Hotspots)
  - model3d: `{ kind:'model3d', src, poster, pois:[{position,normal,title,info}] }`
- **model3d** — `{ heading, media:{kind:'model3d',…}, items:[] }`
- **artifact** — `{ eyebrow, title, desc, image, scale?, specs:[{k,v}], ctaLabel }`
- **worksheet** — `{ heading, subtitle, image, fig, tag, panelTitle, panelSub, fields }`
  `fields[]` are `{kind:'text', n, hint}` or `{kind:'matrix', n, hint, cells:[{lbl,ph}]}`
- **external** — `{ eyebrow, title, desc, image, features:[string], url, meta, launchLabel, sourceUrl? }`
  The existing **launch** button is the fallback (opens in a new tab); its target is
  `sourceUrl || url`, so `sourceUrl` overrides the Activity URL without adding a second button.
- **complete** — `{ title, lead, gainedTitle, gained:[string], badgeTitle, badgeDesc }`
- **task** — _dormant._ Render branch + factory still exist but it's removed from the Add
  menu and seed. Decide: delete fully or rebuild. Don't ship it as‑is.

### Hotspots (interactive image points of interest)
- Stored on `media.pois` as `{ x, y, kind, title, info, url }`, positioned by **percentage**
  so they hold their place inline, in the expanded lightbox, and in Present/fullscreen.
- `kind`: `tooltip` (small popover), `window` (centred panel), `video` (embedded player from
  `url`). Colour‑cued dots.
- Authoring: in Edit mode, **drag** a dot to position it; the editor row sets kind/title/
  text/url and add/remove.

### Authoring conventions worth knowing
- **Reordering slides (Edit mode):** the sidebar slide list supports **drag-to-reorder**
  (native HTML5 DnD) in addition to the ✕/▲▼ buttons; a drop line shows where the slide
  will land. `cur` is tracked **by identity** across a reorder, so the open slide stays
  selected. Handlers are delegated on `#nav` (`dragstart`/`dragover`/`drop`/`dragend`);
  items get `draggable` only in edit mode, so `renderNav()` runs on mode switch.
- `==text==` inside a notes `bd` marks it as a "record this" phrase.
- Present mode: **click** advances (left ~20% goes back); **← / →** also navigate; the
  Back/Next bar is hidden in Present.
- **Present-mode discussion (A2):** in Present, `source`/`question` slides show their
  teaching content but render questions as numbered **discussion pills** (Q1, Q2 …) rather
  than inline answerable cards. A pill opens the question large in the lightbox (prompt →
  click reveals model answer / look-for / pitfalls). Pills behave like hotspots — they
  don't advance the slide; clicking elsewhere advances. **Study mode is unchanged**
  (questions inline + answerable). `setPresent()` re-renders so the present view applies.
- **Per-slide `layout` (A1):** any slide may carry `"layout": "fit" | "scroll"`
  (default `fit` = the one-screen behaviour below). `scroll` opts that slide into
  long-form vertical scrolling (`.stagewrap.layout-scroll`). **Present always forces fit.**
- Cards fill their container and **scroll internally** when content is long (the `fit`
  default).

## 5. Working on the engine

The DOM is string‑built and rebuilt per render, so **two invariants must always hold** and
are enforced by CI (`scripts/validate.mjs`):

1. The **last `<script>`** in the file (the engine) must pass `node --check` (valid JS).
2. The embedded `#lesson-data` JSON must `JSON.parse` and contain a `slides` array.

**Scaled-canvas invariant:** slide content lives in a fixed 1280×720 `.canvas` that is
`transform:scale(s)`-d to fit. Any code that converts a pointer event to slide coordinates
MUST stay scale-safe — derive the fraction from the element's `getBoundingClientRect()`
(which is *post-transform*, i.e. already scaled) and pointer `clientX/Y`, or rely on
`e.target`/`closest` hit-testing (transform-aware). Never mix screen pixels with the
*logical* 1280/720 (that needs `/s`). Today the hotspot drag (`data-poidrag`) and inspector
zone clicks both use gBCR/`closest`, so they need no scale division — keep it that way.

Plus guardrails CI warns on:
- No `localStorage` / `sessionStorage` (the app is intentionally stateless; it also keeps it
  drop‑in/iframe‑safe).
- New third‑party runtime hosts in `<script src>` / `<link href>` are flagged for review —
  see **Firewall** before adding any.

### Manual test loop used during development
Render with headless Chromium (Playwright) and screenshot. Note: in a sandbox the Google
Fonts / model‑viewer CDNs and external image URLs **don't load**, so fonts fall back and
media wells are empty — fine for verifying **layout**, but test fonts/3D/media on a real
hosted copy.

### Browser support
Uses modern CSS: `color-mix()`, `aspect-ratio`, and `justify-content: safe center`. Targets
current Chromium/Edge/Firefox and Safari ≥ 15.4 — fine for school Edge/Chrome. Don't
regress to features that break those.

## 6. Known limitations / risks

- **Third‑party runtime deps — RESOLVED for the app.** Fonts are base64‑inlined and
  `model-viewer` + the sample GLB are same‑origin under `assets/vendor/`; the app makes zero
  third‑party requests and `validate.mjs` hard‑fails if that regresses (see §8). Only
  *teacher‑added* media in a lesson can still reach third parties. (Published 3D lessons need
  the vendor file copied into `/lessons/assets/vendor/` — §8.3.)
- **Embeds** (YouTube etc.) are frequently blocked on school networks; ClickView usually is
  not. Pasted external image/video URLs may also be blocked.
- **No persistence / no collaboration.** One author, one file. Concurrent edits aren't a
  thing; merge lessons as files.
- **`task` slide type is dormant.**
- **Accessibility** has not had a dedicated pass (focus rings, ARIA on hotspot buttons,
  keyboard access to hotspots, `prefers-reduced-motion` for the dot pulse, contrast audit).

## 7. Deployment (GitHub Pages) & the "auto‑export" question

**Reality check:** the browser app can't securely push anywhere itself (that would mean
embedding a token in a public HTML file). The clean, automatic flow is:

```
Author in lesson-studio.html  →  Export (downloads a standalone study-mode .html)
   →  drop it into /lessons/   →  commit / open PR
   →  CodeRabbit reviews  →  checks pass  →  auto-merge to main
   →  GitHub Pages auto-deploys  →  student link:
        https://willwint2104.github.io/OnlineLessonMaker/lessons/<name>.html
```

**GitHub Pages via GitHub Actions (no secrets).** The site is the repo root, deployed by
`.github/workflows/deploy-pages.yml` on every push to `main`.
1. One-time: **Settings → Pages → Source = GitHub Actions** (already set).
2. Every merge to `main` runs `deploy-pages` and publishes the repo root automatically.
3. The app is at `…/lesson-studio.html`; lessons at `…/lessons/<name>.html`.

**No native per‑PR preview.** GitHub Pages has no built‑in preview deployment, so
**pre‑merge visual review = the `screenshots` artifact** (uploaded by the Screenshots
workflow on every PR) **plus `node scripts/shots.mjs` locally**; open the **live**
`github.io` page to confirm once the change is on `main`.

## 8. School firewall — make a lesson "transmit cleanly"

The goal: a published lesson makes **zero third‑party requests** — everything served from
the one Pages domain your school allowlists.

1. **Allowlist one domain** — `willwint2104.github.io` (this repo's GitHub Pages host).
   Already confirmed reachable at school. One ask, done.
2. **Fonts — VENDORED ✓.** The Google Fonts `<link>`/preconnects are gone; the exact
   families/weights are base64‑inlined as `@font-face` in `lesson-studio.html`
   (regenerate with `node scripts/vendor-fonts.mjs`). Because they're inlined, **exported
   lessons carry their fonts with zero external files**.
3. **`model-viewer` — VENDORED ✓** to `assets/vendor/model-viewer.min.js` (same‑origin,
   not inlined). The seed 3D slide uses a local `assets/vendor/sample-cube.glb`
   (`node scripts/make-sample-glb.mjs`). _Caveat for published 3D lessons:_ the app
   references model‑viewer at the **root‑relative** `assets/vendor/…`, which resolves at
   the site root but **not** from `/lessons/<name>.html`. When you publish a lesson that
   actually uses 3D, copy `model-viewer.min.js` (and your GLB) into `/lessons/assets/vendor/`
   so the lesson's relative path resolves. Host your own GLB files in `/lessons/assets/`.
4. **Host media in‑repo / same‑origin** where possible (`/lessons/assets/…`). Pasted
   third‑party image/video URLs are the main thing IT can't predict.
5. **Video:** prefer your school's sanctioned platform (ClickView in most NSW schools is
   allowlisted) over YouTube. `toEmbed` passes ClickView/iframe links through unchanged.
6. **HTTPS** is automatic on GitHub Pages.

Only the `willwint2104.github.io` host needs to be reachable (already confirmed at school).
**The app itself now makes zero third‑party requests** (`scripts/validate.mjs` hard‑fails if a
third‑party `<script>`/`<link>` host reappears in `lesson-studio.html`). Remaining external
requests in a published lesson come only from **teacher‑added** media (pasted image/video URLs,
YouTube embeds) — `lessons/*.html` only *warns*, by design.

## 9. Roadmap / next up

- ~~**Vendor fonts + model‑viewer** (firewall hardening)~~ — **DONE** (fonts base64‑inlined;
  model‑viewer + sample GLB same‑origin under `assets/vendor/`; validator hard‑fails on app
  third‑party hosts). Follow‑up: copy the vendor file into `/lessons/assets/vendor/` for any
  published 3D lesson (see §8.3).
- ~~**WW1 design pass**~~ — **DONE (visual)**: the `ww1` "Great War Archive" theme is retoned
  (warm-paper canvas, oxidised-crimson accent, slate command-post sidebar, dark sepia hero,
  hard stacked-paper shadow, sharp radius; Archivo Narrow UPPERCASE display, Source Serif 4
  body, Courier Prime eyebrows/metadata — all vendored/inlined; coordinate-tick/crimson-stamp
  motif + weathered-paper grain). **Follow-ups:** olive-drab button token + container-0/button-4
  radius split (polish); white-on-crimson chips (accent-ink is dark for contrast); and a **ww1
  sample lesson** to carry the HT5 (Stage 5 History) outcomes codes — the live seed is the
  Egypt/AH11 Tutankhamun lesson, so HT5 wiring belongs in a dedicated ww1 sample, not the
  shared seed.
- ~~**Wellbeing design pass**~~ — **DONE (visual)**: the `wellbeing` "Terra Anima" theme is
  retoned (off-white canvas + white sheets, sage accent, **light** command rail with white-on-
  sage active item, misty-sage hero, soft sage-tinted shadow, organic radius; EB Garamond
  display + Inter body/labels, vendored/inlined; topographic-contour `--grain` watermark +
  leaf `--motif` + topo-ring list bullets). Follow-ups: terracotta CTA + sky-blue pill tokens
  (need a secondary/info token + CSS), white-on-sage chips (accent-ink is dark for contrast),
  and a **wellbeing sample lesson** carrying the GE5 (Stage 5 Geography) outcomes codes.
- **Rome design pass** — **DONE (visual)**: the `rome` "Imperial Scholar" theme is retoned
  (warm-marble canvas, **imperial-purple** accent + **Roman-gold** strokes, light rail with a
  gold active-indicator bar, imperial-dusk hero, hard purple "stone-slab" shadow, square radius;
  EB Garamond display + Source Sans 3 body/labels, vendored/inlined — **Cinzel dropped** as
  orphaned; marble `--grain` + laurel `--motif` + mosaic-square list markers; cards = white +
  gold stroke + purple top bar). Gold lives in scoped strokes/button-text (not `--bd`/
  `--accent-ink`, which stay dark for readable text). Follow-ups: secondary gold-outline button +
  laurel-divider rule + square inputs/chips; a **rome sample lesson** carrying AH12 (Y12/HSC
  Ancient History) codes — Rome = Y12 (AH12), distinct from Egypt = Y11 (AH11).
- Sidebar style is now per-theme: Egypt + Wellbeing + Rome are **light** rails; WW1 is dark.
- Decide the **`task`** type: delete or rebuild.
- **Accessibility** pass (focus, ARIA, keyboard hotspots, reduced‑motion, contrast).
- Optional extra Stitch layouts (hotspot side‑panel, lecture‑notes split, richer video).
- Optional: a lessons index page at `/lessons/index.html`.

## 10. Conventions for PRs

- Keep it a single file. Don't add a build step without discussion.
- Always escape interpolated content with `esc()`.
- After engine edits, the two CI invariants (engine syntax, lesson JSON) must pass — they
  gate auto‑merge.
- Don't introduce a new third‑party runtime host without a firewall plan (vendor it).
- Small, reviewable PRs; CodeRabbit reviews each (see `.coderabbit.yaml`).
