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
| `type` | string | One of `title`, `outcomes`, `text`, `imageText`, `infographic`, `video`, `knowledgeCheck`. |
| `progress` | number 0–100 | Drives the header progress bar (and footer/qbar where shown). |
| `xp` | number \| string | Shown in the header XP chip. |
| `hp` | string | Optional header HP chip (e.g. `"5"`, `"65%"`). |
| `wordmark` / `brand` | string | Overrides the top‑bar wordmark (default *The Great War Archive* / *Imperium Scholar*). |
| `cta` | string | Footer button label (default *Continue*). |

### Images & placeholders

Every image slot is **optional**. Provide a **relative repo path** (e.g. `"assets/colosseum.jpg"`)
to render the image; **omit it / leave `""`** to render the theme’s gradient placeholder with a
small “… placeholder” corner tag. No external URLs — they are blocked by `validate.mjs`.

### Colour & icon tokens

- Colours are theme tokens — you normally don’t set them. Where a field accepts a colour
  (e.g. infographic legend), use a token like `"var(--primary)"` / `"var(--secondary-container)"`.
- `icon` fields accept a built‑in icon name (no icon fonts/CDN). Available:
  `clock trophy scroll bolt heart arrowRight arrowLeft image archive play shield gear person
  check cross target flag book quote pin doc star external clipboard refrack mail info bust
  ribbon armor dumbbell stopwatch brain monument backpack wheat map temple pagoda silk spice
  grain zoomIn zoomOut bookmark personCircle film pause fullscreen calendar quiz notes
  checkCircle xCircle lightbulb colosseum tank`. Unknown names fall back to a generic icon.

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

## Field‑name compatibility

The worksheet generator and other engine tooling are unaffected — these themes render through a
dedicated path. The pack never uses `localStorage`, adds no third‑party host, and every content
string is escaped (`esc()`), so `node scripts/validate.mjs` stays green.
