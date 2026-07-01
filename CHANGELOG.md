# Changelog

All notable changes to **Lesson Studio** are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); add a line for every PR so
"what changed and was it checked" stays visible (see `docs/CHANGELOG` note in
`docs/CHECKING.md` §Cadence).

## [Unreleased]

### Fixed
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
