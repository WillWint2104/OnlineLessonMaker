# Pack: Humanities-Source

*A domain pack for OnlineLessonMaker v2. Conforms to the foundation constitution (v2-architecture.md). Isolated from all other packs; meets the engine only at the block registry.*

**Status:** SPEC'D (actively authored — this is most of what the current engine already does).
**Subjects served:** History, Geography, Ancient History, Legal/Society, and English-Literature (as a recipe — see pack-english stub).
**Primitives owned by this pack:** source examination, annotation, sequencing, mapping.

---

## Blocks

Each block registers through the foundation registry (`type`, `schema`, `render`, `behaviours`, `tokens`, `a11y`). Colours are token slots only. Layout is auto-layout. All interactive blocks satisfy the accessibility contract (keyboard, focus ring, drag-less baseline, text alternative).

### Existing (already built — formalise into registered blocks)
- **text** — narrative reading. Supports `[[reveal notes]]` (recordable notebook line), `==term==` key-term popups, and (via foundation) `$...$` notation if the lesson's pack loads it.
- **outcomes** — syllabus outcomes / driving question.
- **knowledgeCheck** — MCQ now; gains matching / multiple-response / fill-in-blank from the foundation behaviour set.
- **sourceAnalysis** — a source + guided analysis tasks (TOMAPCRU etc.). Uses the shared zoom pill + focus overlay molecules.
- **guidedResponse** — scaffolded extended-writing (e.g. the 10-marker).
- **interactive** — embeds a same-origin self-contained interactive (the coin workbench) with page-side questions bridged by shared numbering.
- **video** — references a clip (foundation asset-source: allowlist + fallback + captions + click-to-start).
- **outro** — recap / next-step.

### New flagship blocks (highest value, cross-platform consensus)
- **labeledGraphic** — the coin-workbench hotspot pattern generalised to ANY static image (map, painting, document, diagram, artwork). Markers with title/body/"on-the-real-thing" callout, in a sticky reading rail beside the image. **Text-alternative required** (marker list). This is the pack's flagship and the proof of the "one-off interactive → reusable block" thesis. Build first.
- **timeline** — pinned events with media, "change over time." The Agrippina coin-progression, reusable.
- **markTheWords** — student clicks specific words in a source passage (e.g. "mark every emotive word in this propaganda extract"). Novel; exactly on-brand for source skills. Serves literature analysis too.
- **imageJuxtaposition** — before/after slider (site then/now, coin worn/pristine, document censored/uncensored). Trivial to build, strong effect.

### History-differentiated
- **mapNarrative** — StoryMap-style pins + slides + path between them, for the `geolearn` theme (empire expansion, trade routes, battle phases, migration). Self-contained map (foundation asset-source; no external map-tile dependency at runtime beyond allowlisted same-origin tiles or embedded static maps). No general authoring tool does this well.
- **sortingActivity** — categorise sources/terms into buckets (the Versailles interactive, promoted to a native block). **Drag-less baseline required** (click-to-assign), drag as enhancement.

---

## Recipes (documented combinations — NOT separate code)
- **Source-skills lesson** = text (teach) → labeledGraphic / interactive (examine) → sourceAnalysis (independent) → guidedResponse (extended). The gradual-release arc the Agrippina lesson demonstrates.
- **Change-over-time lesson** = timeline + sourceAnalysis + guidedResponse.
- **Geography place study** = mapNarrative + text + data-table (from foundation) + labeledGraphic.

---

## Authoring conventions (this pack's content rules)
1. Standard keyboard punctuation + middot only; no em/en dashes/tildes.
2. Content-density: core on the Present board (~60–80 words); depth in `[[reveal notes]]` and body.
3. **Reveal notes = recordable core facts** (date + source + fact + significance). The notebook line. Never commentary, strategy, or meta.
4. **Readings TEACH (direct instruction); tasks and interactives INQUIRE.** Exam-strategy guidance lives ONLY on task pages, never in readings.
5. **`==markup==` is the term-definition TRIGGER, not emphasis.** Only mark words that are (a) real vocabulary AND (b) have a keyTerms definition. keyTerms array matches marked words exactly. No `==` inside `[[notes]]`.
6. Frames need clause form (verify composed OUTPUT reads as English — the render-gate checks this).
7. Interactive = pure examination instrument; questions live on the lesson page; numbering bridges the two.
8. Images: representative/generated asset in the frame; real source LINKED in the caption. Reading instructs, tasks inquire, strategy on task pages.
