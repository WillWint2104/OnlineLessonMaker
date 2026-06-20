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
  validate.mjs              # CI checks: JSON valid, engine syntax valid, guardrails
lessons/                    # exported, published lessons (served to students)
  README.md
.github/workflows/
  validate.yml              # runs scripts/validate.mjs on every PR/push
  automerge.yml             # enables GitHub auto-merge on clean PRs
  deploy-pages.yml          # deploys the repo root to GitHub Pages on push to main
```

The **app** (`lesson-studio.html`) is published too, so you can author from any machine.
Exported **lessons** go in `/lessons` and are what students actually open.

## 3. Architecture

Everything is driven by one object, `LESSON`, of shape:

```js
LESSON = {
  meta:   { title, theme },          // theme: neutral|egypt|rome|wellbeing|ww1
  slides: [ { type, ... }, ... ]     // one object per slide, see Data model
}
```

- On load, `LESSON` is parsed from `<script id="lesson-data" type="application/json">`.
- `renderSlide()` is a big `if/else` on `s.type` that builds an HTML string for the current
  slide into `#slide`.
- `wire()` runs **after every render** and attaches all event handlers (the DOM is rebuilt
  each slide, so handlers are re‑attached each time — there are no long‑lived listeners on
  slide content).
- **Live editing** uses `data-bind="slides.N.field"` (writes back via `setP`) on
  `contenteditable` elements and `<input>`/`<textarea>`; `data-split` does the same but
  splits a textarea into an array (one item per line).
- **Theming** is pure CSS custom properties: `:root[data-theme="…"]` blocks define the
  palette/fonts/motif; `setTheme(name)` sets/removes the `data-theme` attribute on `<html>`.
- **Lightbox / popups** (`lb(html)` / `closeLb()`) inject arbitrary HTML into a shared
  full‑screen overlay (`#lightbox`). Used for expanded images/3D, the syllabus popup, and
  hotspot window/video cards.

### Key functions (in the `<script>`)

| Function | Role |
|---|---|
| `renderSlide()` | builds the current slide's HTML (switch on `s.type`) |
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

Add a slide via **Edit → "Add a card"** (factory defaults live in the `#addbar` click
handler). Hand‑editable via the **⌗ JSON** panel. Fields:

- **cover** — `{ tag, title, sub, titleItalic?, startLabel?, est? }`
- **outcomes** — `{ eyebrow, heading, image, outcomes:[string], syllabus:[{code,text}] }`
  Image‑heavy layout; syllabus shows to students via the **NSW Syllabus Links** popup, and
  is edited inline in Edit mode.
- **notes** — `{ heading, blocks:[{h,bd}], guide }`
  `bd` supports `==markers==` → revealed by the **Highlight what to record** toggle.
- **image** — `{ heading, src, cap }`
- **video** — `{ heading, url, cap }` (`url` → `toEmbed`)
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
- **external** — `{ eyebrow, title, desc, image, features:[string], url, meta, launchLabel }`
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
- `==text==` inside a notes `bd` marks it as a "record this" phrase.
- Present mode: **click** advances (left ~20% goes back); **← / →** also navigate; the
  Back/Next bar is hidden in Present.
- Cards fill their container and **scroll internally** when content is long.

## 5. Working on the engine

The DOM is string‑built and rebuilt per render, so **two invariants must always hold** and
are enforced by CI (`scripts/validate.mjs`):

1. The **last `<script>`** in the file (the engine) must pass `node --check` (valid JS).
2. The embedded `#lesson-data` JSON must `JSON.parse` and contain a `slides` array.

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

- **Third‑party runtime deps (top risk for school delivery):** Google Fonts
  (`fonts.googleapis.com`, `fonts.gstatic.com`) and `model-viewer` (`cdn.jsdelivr.net`), plus
  the sample GLB from `modelviewer.dev`. If a school firewall blocks these, fonts fall back
  (cosmetic) and 3D breaks. **Fix: vendor them** (see Firewall + Roadmap).
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
2. **Vendor the fonts** into the repo and point the `<link>` at local `woff2` (kills
   `fonts.googleapis.com` / `fonts.gstatic.com`). _Planned — see Roadmap._
3. **Self‑host `model-viewer`** (`npm i @google/model-viewer`, copy the dist file into the
   repo, point the `<script src>` at it) and host your own GLB files in `/lessons/assets/`.
   _Planned — see Roadmap._
4. **Host media in‑repo / same‑origin** where possible (`/lessons/assets/…`). Pasted
   third‑party image/video URLs are the main thing IT can't predict.
5. **Video:** prefer your school's sanctioned platform (ClickView in most NSW schools is
   allowlisted) over YouTube. `toEmbed` passes ClickView/iframe links through unchanged.
6. **HTTPS** is automatic on GitHub Pages.

Only the `willwint2104.github.io` host needs to be reachable (already confirmed at school).
Until vendoring is done, a lesson still works behind a firewall **except** web‑fonts (falls
back to system fonts) and 3D (needs jsDelivr) — so **vendoring fonts + model‑viewer is next**
(Roadmap / Priority 1) to get a lesson to **zero third‑party requests**. If your school
blocks jsDelivr, avoid the `model3d`/3D source until that's done.

## 9. Roadmap / next up

- **Vendor fonts + model‑viewer** (firewall hardening) — highest priority for school use.
- **WW1 design pass** — apply the WW1 visual direction over the existing slide types and wire
  the NSW Stage 5 History (HT5‑…) outcomes into the outcomes slide (as Egypt carries AH11‑…).
- Optional: light "archive" sidebars per theme (currently Rome/Wellbeing/WW1 keep dark
  sidebars; Egypt is light).
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
