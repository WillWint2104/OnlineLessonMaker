# Themed Slide Pack — author schema (Imperium Scholar · MicroHistory Archive)

Two self‑contained themes render their slides **natively from JSON**, reproducing the
reference designs in `reference-templates/`:

- **`imperium`** — *Imperium Scholar* (Rome). Playfair Display headlines + Hanken Grotesk body,
  flat tonal outlined cards, purple/gold. NSW Year 12 Ancient History (AH12).
- **`microhistory`** — *MicroHistory Archive* (WW1). Courier Prime headlines + Inter body, hard
  offset shadows, polaroid frames, paper‑dot grain, dossier metaphor. NSW Stage 5 History (HT5).

When `meta.theme` is `imperium` or `microhistory`, **every** slide is routed through the pack
renderer (`renderPackSlide`) keyed on the slide `type` below. All other themes are unaffected.

## How to use

Paste a lesson object into **⌗ JSON → Load JSON**, or load one of the worked examples:

- `examples/imperium-sample.json`
- `examples/microhistory-sample.json`

Each example exercises all seven types end‑to‑end. A lesson is:

```json
{ "meta": { "title": "…", "theme": "imperium" }, "slides": [ /* slide objects */ ] }
```

## Common fields (every slide)

| Field | Type | Notes |
|---|---|---|
| `theme` | — | Set once on `meta.theme` (`"imperium"` \| `"microhistory"`), not per slide. |
| `type` | string | One of `title`, `outcomes`, `text`, `imageText`, `infographic`, `video`, `knowledgeCheck`, `sourceAnalysis`, `guidedResponse`, `outro`. |
| `progress` | number 0–100 | Drives the header progress bar (and footer/qbar where shown). |
| `xp` | number \| string | Shown in the header XP chip. |
| `hp` | string | Optional header HP chip (e.g. `"5"`, `"65%"`). |
| `wordmark` / `brand` | string | Overrides the top‑bar wordmark (default *The Great War Archive* / *Imperium Scholar*). |
| `cta` | string | Footer button label (default *Continue*). |

### Images & placeholders

Every image slot is **optional**. Provide a **relative repo path** (e.g. `"assets/colosseum.jpg"`)
to render the image; **omit it / leave `""`** to render the theme’s gradient placeholder with a
small “… placeholder” corner tag. No external URLs — they are blocked by `validate.mjs`.

Every image field accepts **either a bare path string** (`"image": "assets/foo.jpg"`) **or an
object carrying the path under `src`** (`"image": {"src": "assets/foo.jpg", "tag": "…"}` — used by
`imageText`). Where a field nests the image (`source.image`, `artifact.image`, `map.image`,
`sidebar.image`), set the path on that nested key. The image fields per type are:
`title.image`, `outcomes.image` *(imperium only — the microhistory dossier outcomes has no image
area)*, `imageText.image[.src]`, `infographic.map.image`, `video.image`, `knowledgeCheck.artifact.image`,
`text.sidebar.image`, `sourceAnalysis.source.image`.

### Colour & icon tokens

- Colours are theme tokens — you normally don’t set them. Where a field accepts a colour
  (e.g. infographic legend), use a token like `"var(--primary)"` / `"var(--secondary-container)"`.
- `icon` fields accept a built‑in icon name (no icon fonts/CDN). Available:
  `clock trophy scroll bolt heart arrowRight arrowLeft image archive play shield gear person
  check cross target flag book quote pin doc star external clipboard refrack mail info bust
  ribbon armor dumbbell stopwatch brain monument backpack wheat map temple pagoda silk spice
  grain zoomIn zoomOut bookmark personCircle film pause fullscreen calendar quiz notes
  checkCircle xCircle lightbulb colosseum tank focus lock list pen quotemark refresh scope
  laurel vault`. Unknown names fall back to a generic icon.

---

## `title`

| Field | Type | Used by | Notes |
|---|---|---|---|
| `eyebrow` | string | both | Module label above the title. |
| `title` | string | both | Hero headline. |
| `subtitle` | string | both | Standfirst. |
| `image` | string | both | Hero image / cinematic placeholder. |
| `meta[]` | `{label,value,icon?}` | both | imperium → 3 meta cards; microhistory → dossier footer (first = badge, rest = stat columns). |
| `context[]` | `{icon?,title,body}` | microhistory | Three “context” cards under the hero (optional). |
| `pill` | string | imperium | The “New Lesson” pill (set `""` to hide; default *New Lesson*). |
| `cta` | string | both | Footer button (default imperium *Start Lesson*). |

## `outcomes`

| Field | Type | Used by | Notes |
|---|---|---|---|
| `title` | string | both | Heading. |
| `eyebrow` | string | imperium | Module eyebrow. |
| `objectives[]` | `{numeral?,heading?,body}` | both | imperium shows numeral + heading + body; microhistory shows a bulleted body (optional bold `heading`). |
| `reference[]` *(or `acquired[]`)* | `{icon?,title,sub}` | microhistory | “Field Reference” cards. |
| `note` | `{label,text}` | microhistory | Archivist’s‑note callout. |
| `footer` | `{left,right}` | both | imperium → curriculum/era line; microhistory → file‑number block. |
| `image` | string | imperium | Left panel image. |
| `summaryLabel` / `objectivesLabel` / `referenceLabel` / `syllabusLabel` | string | — | Optional label overrides. |

## `text` *(shared layout; Rome reuses the WW1 structure in imperium tokens)*

| Field | Type | Notes |
|---|---|---|
| `classification` | string | Small uppercase label above the title. |
| `title` | string | Document title. |
| `date` | string | Datestamp pill. |
| `body[]` | string[] | Paragraphs. **First paragraph renders as a drop‑cap lead.** |
| `pullQuote` | `{text,source}` | Inset quote (placed after the first body paragraph). |
| `sidebar` | `{image,caption,note:{title,text},progress,progressLabel?}` | Dossier sidebar: polaroid + caption, note box, section‑progress bar. |

## `imageText`

| Field | Type | Used by | Notes |
|---|---|---|---|
| `moduleLabel` / `eyebrow` | string | both | Chip / eyebrow above the title. |
| `title` | string | both | Heading. |
| `image` | `{src?,caption,tag}` | both | `tag` → badge/doc‑tag; `caption` → plate caption (microhistory). |
| `sections[]` | `{icon?,heading,body}` | both | imperium → icon points; microhistory → bordered component list. |
| `sectionsLabel` | string | microhistory | Heading of the components card. |
| `note` | `{label,text}` | both | imperium → centred quote (`text` + `label` attribution); microhistory → dashed callout box. |
| `supplemental[]` | `{icon?,title,body?,link?}` | both | imperium → chips (uses `title`); microhistory → 3 “read report” cards. |

## `infographic`

| Field | Type | Used by | Notes |
|---|---|---|---|
| `eyebrow` | string | both | imperium badge / microhistory chip. |
| `title`, `subtitle` | string | both | |
| `time` | string | imperium | “5 min read” chip. |
| `map` | `{image?,legendLabel?,markers[],legend[],routes?}` | both | `markers[] = {x,y,label,icon?}` (x/y in %). `legend[] = {label,type?,color?}` (`type`: `line`\|`square`\|`dot`). `routes[] = {d,color?,width?,dash?}` draws decorative SVG paths over the map (imperium). |
| `metrics[]` | `{label,value,pct}` | microhistory | Labelled progress bars (`pct` 0–100). |
| `metricsLabel` | string | microhistory | Stat card heading. |
| `footnotes[]` | `{title,body,icon?}` | both | imperium → “goods” cards; microhistory → bottom footnote columns. |
| `note` | `{quote,name?,role?,label?}` | both | imperium → quote block; microhistory → archival‑note card with author. |
| `exploreLabel` | string | microhistory | Optional secondary CTA inside the right column. |

## `video`

| Field | Type | Used by | Notes |
|---|---|---|---|
| `eyebrow` | string | both | imperium gold badge / microhistory footage label. |
| `title` | string | both | |
| `time` | string | imperium | “4 min remaining”. |
| `date` | string | microhistory | Datestamp. |
| `image` | string | both | Video still / placeholder. |
| `timestamp` | string | both | Scrubber time (e.g. `"02:14 / 06:45"`). |
| `body` | string | both | imperium → callout body; microhistory → lead paragraph. |
| `calloutTitle` | string | imperium | Heading of the callout. |
| `quote` | string | microhistory | Inset field‑report quote. |
| `metadata[]` | `{key,value,icon?}` | both | imperium → 2 action cards; microhistory → artifact key/value rows. |
| `metadataLabel` / `metaCta` | string | microhistory | Sidebar heading / blueprint button. |
| `prev`, `next` | string | microhistory | Previous/next navigation labels (optional). |

## `knowledgeCheck`

Interactive: selecting an option reveals the matching feedback panel and **the Continue button
stays disabled until a correct answer is chosen** (wrong answers can be retried).

| Field | Type | Used by | Notes |
|---|---|---|---|
| `title` | string | both | Heading. |
| `eyebrow` | string | imperium | Subject eyebrow. |
| `question` | string | both | The prompt. |
| `options[]` | `{label?,text,correct?}` | both | `correct: true` marks the right answer (`label` defaults to A/B/C…). |
| `feedback` | `{correctTitle,correctText,incorrectTitle,incorrectText}` | both | Shown after answering. |
| `artifact` | `{image?,id?,caption?}` | both | imperium → figure + reference tag; microhistory → polaroid + caption. |
| `note` | `{title,text}` | microhistory | Archivist’s‑note box. |

---

## `sourceAnalysis`

A primary source (image placeholder and/or transcript) with provenance beside scaffolded analysis
tasks. The source column is **sticky**; the whole slide **scrolls within the canvas**. Each task has
its own typed answer box; **its model answer unlocks only after a non‑empty attempt in that box**
(per‑task gate). A **Focus reading** button opens an accessible modal (role=dialog, Esc / × to close,
focus returns to the trigger). Answers are kept in memory for the session and restored when you
navigate back (no `localStorage`). imperium = ivory scholar cards + Roman‑numeral ring task numbers;
microhistory = polaroid source + dossier provenance + square hard‑bordered task numbers.

| Field | Type | Used by | Notes |
|---|---|---|---|
| `eyebrow` | string | both | Section label. |
| `title` | string | both | Source heading. |
| `tag` | string | both | Pill beside the meta line (e.g. *Primary Source*). |
| `time` | string | both | Meta line (e.g. *15 min · 14 marks*). |
| `source` | `{image?,label?,transcript?}` | both | The source: gradient placeholder unless `image` is a relative path; `label` is the source name; `transcript` shows under the image and feeds Focus reading. |
| `provenance[]` | `{icon?,label,value}` | both | Provenance rows (Origin / Date / Author / …). |
| `tasks[]` | `{numeral?,question,marks?,skill?,model}` | both | One typed box + revealable `model` per task (`numeral` defaults to I/II/III…). |
| `hint` | `{label,text}` | both | Optional approach note. |
| `focusQuestion` | string | both | Optional prompt shown in the Focus reading modal. |
| `cta` | string | both | Footer button (default *Continue*). |

## `guidedResponse`

Scaffolded writing. `mode` selects the layout. The whole slide **scrolls within the canvas**, answers
are **session‑kept**, and reveals are gated on a non‑empty attempt.

- **`mode: "short"`** — one labelled textarea + **Submit attempt** → reveals a single model response
  plus a marking‑guide list (the box becomes read‑only after submit).
- **`mode: "extended"`** — an author‑defined list of **paragraph boxes** (e.g. Introduction / Body /
  Conclusion); each has guidance, its own textarea, and **its own model paragraph revealed after that
  box's attempt**. Set `focusReading: true` to add a **Focus reading** modal (question + stimulus).
- **`mode: "quiz"`** — a numbered **question list on a single slide**; each question has its own answer
  box and a **Reveal answer** button that shows the model answer after a non‑empty attempt (keyboard‑
  operable, `aria-expanded`, announced via the slide's live region). Use this instead of splitting a
  starter quiz across separate question / answer slides.

| Field | Type | Used by | Notes |
|---|---|---|---|
| `mode` | `"short"` \| `"extended"` \| `"quiz"` | both | Layout selector (default `short`). |
| `eyebrow` | string | both | Section label. |
| `title` | string | both | Task heading. |
| `marks` | string | both | Marks pill in the question header. |
| `time` | string | both | Meta line (e.g. *3–4 sentences*, *~600 words*). |
| `question` | string | both | The prompt. |
| `stimulus` | `{label,text}` | both | Optional source/stimulus box. |
| `model` | string | both (short) | Model response revealed after submit. |
| `criteria[]` | string[] | both (short) | Marking‑guide bullets. |
| `paragraphs[]` | `{label,guide,model}` | both (extended) | One box + revealable model per paragraph. |
| `focusReading` | boolean | both (extended) | Adds the Focus reading modal. |
| `questions[]` | `{question,answer,marks?}` | both (quiz) | Numbered question, answer box + revealable answer. |
| `tag` | string | both (quiz) | Meta pill (default *Starter quiz*). |
| `intro` | string | both (quiz) | Lead line under the heading. |
| `cta` | string | both | Footer button (default *Continue*). |

## `graphQuestion`  *(Mathematics pack; renders in all four themes)*

An interactive **coordinate plane** paired with an answer surface. The student answers by **typing a
function** in the full equation editor (`answerMode: "equation"`), **plotting points** on the plane
(`"points"`), or **both**. Marking is by **function sampling**, so any algebraically‑equivalent form is
accepted — `(x-2)^2` and `x^2-4x+4` are both correct. Optionally lists **misconceptions** (wrong‑way
answers) that return a specific message. Prose fields support inline `$…$` math. Answers are
**session‑kept** (ephemeral, like every other response). For "show your working", place a `penResponse`
block beside it on a composed page (see composable pages) — the old `working:true` flag was removed in v3 A2.

`snap` controls the plotting *input feel* (lattice); `tolerance` controls *marking* — the two are separate.

| Field | Type | Notes |
|---|---|---|
| `title` / `eyebrow` / `marks` | string | Heading, section label, marks pill. |
| `prompt` | string | Question text; supports `$…$` math. |
| `answerMode` | `"equation"` \| `"points"` \| `"both"` | How the student answers (default `equation`). |
| `domain` | `[xmin, xmax]` | Plane x‑extent (default `[-5,5]`). |
| `range` | `[ymin, ymax]` | Plane y‑extent (default `[-5,5]`). |
| `grid` | number | Grid step in world units (default: a “nice” auto step). |
| `given` | string (equation) | A base curve `y=f(x)` drawn on the plane for context (e.g. `x^2`). |
| `answer` | `{equation?, points?}` | Target function and/or target points `[[x,y],…]`. |
| `misconceptions[]` | `{equation, message}` | If the student’s function matches `equation`, show `message` (supports `$…$`). |
| `snap` | number | Point‑plot snap step; `0` = free plotting (default `1`). |
| `tolerance` | number | Marking tolerance in world units for points (default `0.25`). |

Author syntax for equations (prompt `$…$` and the editor both accept it): `x^2  a_1  (x-2)^2
\frac{a}{b}  \sqrt{x}  \sqrt[3]{x}  \pi  \theta  \le  \times  \sin(x)`; ASCII `-` renders as a real
minus; `\$` is a literal dollar.

## Object interactivity *(composable pages — Phase B; image authoring — Phase C1)*

Any block on a **composed page** (`{ blocks:[…] }`) can declare interactivity as data, rather than being a
fixed interactive block type:

```json
{ "type":"image", "src":"…", "alt":"…",
  "interactions":[ { "trigger":"click", "effect":"modal",
                     "payload":{ "title":"…", "body":"…" } } ] }
```

`effect` is one of **`modal`** (`payload:{title, body}`), **`zoom`** (`payload:{src?, label?, alt?}` — an
enlarged-image overlay; `src` defaults to the host image), **`tooltip`** (`payload:{title?, text}` — a
compact info overlay), or **`reveal`** (`payload:{label, text, doneLabel?}` — a click-to-reveal). `trigger`
is `click`. `goToPage` is intentionally unsupported (out of scope) and is ignored. Modal/zoom/tooltip open a
focus-trapped dialog (Esc closes, focus returns to the trigger); every generated id is scoped per block
instance, so two interactive objects on one page never collide. Legacy slides and blocks **without**
`interactions[]` are unaffected.

**One host effect _or_ many reveals per object.** `modal`, `zoom`, and `tooltip` are *host* effects — the
trigger sits on the whole object, so it owns every click and **cannot coexist** with a second interaction on
the same object. `reveal` renders its own button, so any number of reveals compose. To combine a window and a
click-to-reveal, use **two image objects**.

**`image`** *(the first composable object; page-block only)* — `{ type:'image', src, alt?, interactions?[] }`.
A plain picture that can carry interactions. **Authorable in the editor (Phase C1):** add an `image` block
from the page palette, set the URL/alt, and add interactions from its inspector — the effect picker offers
only the four supported effects with payload fields matched to each, and enforces the one-host-or-many-reveals
rule above (a host effect disables adding more; a second interaction defaults to `reveal`). (video / button /
hotspot objects arrive in later Phase C steps.)

## Paper & Board blocks *(maths seed — shared token-driven structures, page-block only)*

Introduced with the `mathematics` "Paper & Board" identity but **available to every theme** (themes only
supply token values; neutral fallbacks are baked into the shared rules). Maths strings are typeset by the
engine's TPMath (native MathML): block `math` fields take bare TPMath (`a(b+c)=ab+ac`); prose fields take
inline `$…$`.

- **`formula`** — `{ type:'formula', math, label? }`. Display maths in the framed container (1px frame,
  3px left-stroke, centred ink; `--formula-fill/-frame/-stroke`).
- **`workedExample`** — `{ type:'workedExample', eyebrow?, title?, steps:[{t, note?}], reveal?, revealLabel? }`.
  The chalkboard: `--wx-bg` board, `--wx-ink` chalk steps, `--wx-dim` notes. `reveal` (truthy) hides the
  board behind a button on the existing `data-tp-reveal` rail.
- **`mastery`** — `{ type:'mastery', text }`. Ink-native italic line ending in the ∎ tombstone — word it as
  a recommendation ("two clean expansions and this is mastered"), never a gate. Not a badge.
- **`selfCheck`** *(S1 — self-check practice unit; shared, token-driven)* —
  `{ type:'selfCheck', eyebrow?, prompt, hint?, revealLabel?, steps:[{desc, work?}], answer, qed? }`.
  A prompt card with a **Reveal** button and optional **Hint** (rides the existing `data-tp-reveal` rail).
  Reveal opens a carded **solution modal** on the existing Phase B focus-open rail: numbered **step cards**
  (`desc` + optional mono `work`; both take `$…$`), an accent **answer card** (`answer`), and an ∎ **Q.E.D.**
  seal unless `qed:false`. The modal footer carries a three-way **self-mark** — *Not yet* (keeps practising) /
  *Partial* (revisit, no mastery credit) / *Got it* (counts) — stored per session only (no persistence).
  Renders in every theme by token swap; the `mathematics`/`scholarmath` themes supply the `--sc-*` slots,
  others use neutral fallbacks.
- **`practiceSet`** *(S2 — scrollable practice set + sticky mastery bar; shared, token-driven)* —
  `{ type:'practiceSet', eyebrow?, title?, subtitle?, reco?, gate?, batch?, items:[<selfCheck>] }`.
  A set header plus a **sticky mastery bar** and a column of `selfCheck` questions (`items[]`, each the
  same shape as a `selfCheck` block — `{prompt, hint?, steps, answer, ...}`). The bar aggregates the
  per-item self-marks (session state): green = clean (Got it), amber = Partial (no credit), grey = pending,
  with a live count and an ∎ when all clean. Set `reco` for the recommendation line. **Gating:** `gate:true`
  shows the first `batch` (default ⌈half⌉) questions, then a "Keep going" button reveals the rest; omit for
  short sets. Renders in every theme by token swap.
- **`banner`** *(hero block; shared, token-driven)* —
  `{ type:'banner', src, alt?, eyebrow?, title, subtitle? }`. A full-bleed background image (`src` — URL or
  data URI) with a legibility veil and an overlaid `eyebrow` / serif `title` (`$…$` ok) / `subtitle`. White
  text over the veil; with no `src` it falls back to a dark placeholder with ink-coloured text. Rounded,
  clipped, `--bn-h` min-height. Drop it at the top of a composable page as a hero. Renders in every theme by
  token swap.
- **`skillHeader`** *(S3 — skill-page header; shared, token-driven)* —
  `{ type:'skillHeader', breadcrumb?, title, subtitle?, index?, total?, progress? }`. A lean skill header:
  `breadcrumb`/eyebrow, serif `title` (`$…$` ok), optional `subtitle`; set both `index` and `total` for a
  "Skill N of M" count; set `progress` (0–100) for a bar (reuses `tpProg` + the shared `.tp-ptrack`
  primitive). Compose a full **skill page** by stacking `skillHeader → text → formula → workedExample →
  practiceSet → mastery` on one composable page — the complete skill-mastery loop, authored from the
  palette.
- **`text` extensions** — `newthought` (string; rendered as a small-caps opening prefixed to the first
  paragraph) and per-`keyTerms`-row `kind` (`''` key term/POI · `'error'` red-pen classic error),
  `label` (tiny uppercase popup label), `num` (superscript footnote numeral — reserved for points you want
  numbered and referable). A row with any of these renders as a **point-of-interest**: dotted `--poi`
  underline inline (mark the term `**like this**` in prose), popup on the existing focus-open rail with a
  `--poi` (or `--redpen`) left-stroke on `--popup-surface`. Rows with only `{term, definition}` render
  exactly as before.

## `figure` *(figure engine — composable page block; shared Figure Shell)*

A coordinate figure rendered by the figure engine into the **shared Figure Shell** (identity / viewport /
status / caption). `figure` selects the content type — `"graph"` today, `"geometry"` from Stage 3 — and the
shell is the same either way, so a geometry figure differs by what it draws, not by its container.

```json
{ "type": "figure", "figure": "graph",
  "title": "y = x squared", "caption": "$y=x^2$ with the vertex marked.", "meta": "Year 11",
  "domain": { "xMin": -3, "xMax": 3, "yMin": -1, "yMax": 9 },
  "grid": "shown", "minorGrid": true, "axisNames": true, "aspect": "stretch",
  "objects": [
    { "type": "function", "f": "x^2" },
    { "type": "points", "from": "table", "rows": [["V",0,0],["P",2,4]] },
    { "type": "segment", "between": ["V","P"] }
  ] }
```

| Field | Type | Notes |
|---|---|---|
| `figure` | `"graph"` \| `"geometry"` | Content type. Drives the shell's kind label; `geometry` lands in Stage 3. |
| `title` | string | Figure identity, shown in the shell head and carried into the focused workspace. Typeset (`$…$` ok). |
| `meta` | string | Optional context shown beside the title. |
| `caption` | string | Sits under the figure. Typeset (`$…$` ok). |
| `domain` | `{xMin,xMax,yMin,yMax}` | The authored view. All four must be finite with `xMin<xMax`, `yMin<yMax`, or it is ignored with a reported error. Auto-fit only ever *expands* it so nothing collides at an edge. |
| `aspect` | `"stretch"` \| `"equal"` | `equal` keeps a unit square square (default `stretch`). |
| `objects[]` | array | `{type:'function', f}` · `{type:'points', from:'table', rows:[[id,x,y],…]}` · `{type:'segment', between:[idA,idB]}`. Unknown types are ignored with a reported error. |

**Display defaults** — these three set where the figure *starts*; the learner can still change all of them
from **Options** in the focused workspace, and their choice persists for the session:

| Field | Type | Default | Notes |
|---|---|---|---|
| `grid` | `"shown"` \| `"hidden"` | `shown` | `hidden` = invisible scaffold; coordinates are still computed. |
| `minorGrid` | boolean | `true` | The finer grid at `step/5`. `false` (or `"hidden"`) starts it off. |
| `axisNames` | boolean | `true` | The `x` / `y` axis labels. `false` (or `"hidden"`) starts them off. |

Learner-facing controls are deliberately `Zoom out · Zoom in · Pan · Reset · Options`, with the three
display settings above behind **Options** — engine capability is not the same thing as permanent UI, and
Stage 3 inherits that rule rather than adding a second dense toolbar.

### `figure: "geometry"` *(Stage 3)*

The same block and the same shell; only `objects[]` differs. Points are declared exactly as a graph declares
them, or solved from a parameterised `construction`, and every mark and label is derived from those
coordinates — nothing is positioned by hand.

```json
{ "type": "figure", "figure": "geometry",
  "title": "Right triangle 3-4-5", "caption": "A right-angle marker at $A$.",
  "objects": [
    { "type": "points", "from": "table", "rows": [["A",0,0],["B",4,0],["C",0,3]] },
    { "type": "polygon", "vertices": ["A","B","C"], "angles": "all", "fill": false },
    { "type": "segment", "between": ["A","B"] },
    { "type": "angle", "at": "B", "between": ["A","C"], "arcs": 2, "label": "measure" },
    { "type": "rightAngle", "at": "A", "between": ["B","C"] },
    { "type": "sideLabel", "between": ["A","B"], "text": "auto" }
  ] }
```

| Field | Type | Notes |
|---|---|---|
| `construction` | string | Optional parameterised solve — `rightTriangle` · `triangleSAS` · `triangleASA` · `triangleSSS` · `regularPolygon` · `circle` · `rawCoordinates`. With `params`, it produces the named points (`A`, `B`, `C`, …) that `objects[]` then refers to. Impossible givens are **rejected with an error**, never solved into a fabricated figure. |
| `params` | object | The givens for `construction` (e.g. `{a:7,b:8,c:9}`). |
| `vertexLabels` | boolean | Default `true` — every polygon vertex is named. `false` suppresses them. |
| `domain` | `{xMin,…}` | Optional. Otherwise fitted to the figure; auto-fit only ever expands so a label has room. |
| `grid` | `"shown"` \| `"hidden"` | Default **hidden** for geometry — a construction is not a coordinate reading. |

`objects[]` for geometry:

| Type | Shape | Notes |
|---|---|---|
| `points` | `{from:"table", rows:[[id,x,y],…]}` | The same vocabulary the graph uses. Authored points override construction points of the same name. |
| `polygon` | `{vertices:[…], angles?:"all", fill?:true}` | **Any n ≥ 3 through one renderer** — triangle, quadrilateral and irregular n-gon are the same code path. `angles:"all"` measures every interior angle. |
| `segment` | `{between:[idA,idB]}` | A named-point connector, as in a graph. |
| `angle` | `{at, between:[idP,idQ], arcs?:1–3, label?}` | Arc(s) seated on the actual arms at `at`. `arcs` stacks concentric arcs without overlap. `label:"measure"` **displays the computed angle**; any other string is a *name* (`"θ"`); `false` draws the arc with no label. |
| `rightAngle` | `{at, between:[idP,idQ]}` | The square, derived from the two incident rays, so it is correct at any orientation. If the angle is not 90° the mark is **not drawn** and the discrepancy is reported. |
| `sideLabel` | `{between:[idA,idB], text?}` | `"auto"` (or omitted) **displays the computed length**; any other string is a *name* (`"hypotenuse"`). |

**Single source of truth (§4):** a measure is never authored. `label:"measure"` and `text:"auto"` display what
the engine computed from the construction; a literal string is understood as a name, not as a value, so a
figure can never assert a length or angle that its own coordinates contradict.

`aspect` is not read for geometry — it is always `equal`. A stretched axis turns a right angle into something
that is not one and an arc into an ellipse, so it is not an authoring choice here.

**Annotation roles (Stage 3b).** The four kinds of annotation are ranked by three roles — a side length and an
angle measure are both *measurements* and share one — and they are not uniform: **vertex names** are the
strongest, an authored **symbolic** name (`"θ"`) is set in maths italic, and a **computed measurement** is
secondary. Arcs and right-angle marks are drawn lighter than the polygon edges they annotate. Nothing here
is authorable — a role follows from what the label *is* (`label:"measure"` / `text:"auto"` produce a
measurement; any other string is a name), so a lesson cannot drift out of the house grammar.

Measurements share one numeric style: precision follows magnitude (2 dp under 10, 1 dp under 100, whole
numbers above), trailing zeros are dropped, and `°` is set with the number — so a right angle reads `90°`,
never `90.0°`. Preferred anchors are **side midpoint + outward normal** (outside the polygon) and **angle
measure on the arc's own bisector, one gap outside the outermost arc**; the general Stage-2c placement
search then resolves collisions from there. Units are not supported yet.

## `outro`

Lesson‑complete screen. Up to **3 stat tiles** — **omit the score entry from `stats[]` to hide that
tile** (it degrades gracefully). imperium = laurel‑wreath crest + gold glow; microhistory =
*FILE CLOSED* stamp + dossier vault crest.

| Field | Type | Used by | Notes |
|---|---|---|---|
| `eyebrow` | string | both | Above the headline (imperium → ruled label; microhistory → chip). |
| `title` | string | both | Completion headline. |
| `subtitle` | string | both | Standfirst. |
| `stats[]` | `{icon?,label,value}` | both | Up to 3 tiles (XP / score / tasks). **Leave a tile out to hide it.** |
| `recap[]` | `{icon?,title,body}` | both | “What you covered” list. |
| `recapLabel` | string | both | Optional list heading (default *What you covered*). |
| `actions` | `{review?,next?}` | both | Ghost *Review* (restarts the lesson) + primary *Next* (advances). |
| `stamp` | string | microhistory | Stamp text (default *FILE CLOSED*). |
| `footer` | string | both | Footnote line. |

---

## Field‑name compatibility

The worksheet generator and other engine tooling are unaffected — these themes render through a
dedicated path. The pack never uses `localStorage`, adds no third‑party host, and every content
string is escaped (`esc()`), so `node scripts/validate.mjs` stays green.
