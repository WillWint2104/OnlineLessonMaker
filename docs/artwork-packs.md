# Baseline artwork packs

These local procedural images are intentional placeholders/baseline assets pending later dedicated art direction. They extend the accepted white, mint/green, technical grid-and-geometry system; no generated illustration style, equations, instructional working or answers are placed in the artwork. Existing explicit PNG imagery is separate and unchanged.

Use the existing JSON field only: `"artworkPack": "mathematics/algebra/fractions"` inside `meta`. No physical file paths or separate image attachments are needed. Omitting the field (or using an empty string) remains opt-out: no artwork is added.

| ID | Baseline composition |
| --- | --- |
| `global/general` | Neutral abstract vertical structures; subject-independent fallback |
| `mathematics/general` | Broader Mathematics alias for the accepted general composition |
| `mathematics/algebra/general` | Existing abstract block structures, byte-identical |
| `mathematics/algebra/signs` | Existing reflected planes, byte-identical |
| `mathematics/algebra/factorisation` | Existing factor structures, byte-identical |
| `mathematics/algebra/fractions` | Aligned proportional subdivisions in the same procedural language |

Every pack provides `overview`, `outcomes`, `completion`. The three roles share a palette and motif but shift arrangement. The catalogue/resolver lives in `src/artwork/packs.js`; build it into the single-file application with `node scripts/build-artwork-packs.mjs`, then run `node scripts/build-mathematics-micro.mjs` when changing that separate source. `MathMicro.image` remains a compatibility adapter; Mathematics question generation/lint stays in its original module. There is no new widget framework or runtime network dependency.

Resolution is deterministic: try the authored ID, then successively broader `/general` packs, then `global/general`. For example `mathematics/algebra/fractions/new-topic` tries that exact ID, `mathematics/algebra/fractions/general`, `mathematics/algebra/general`, `mathematics/general`, `global/general`. A missing topic `mathematics/algebra/unlisted` resolves to `mathematics/algebra/general`; `mathematics/geometry/unlisted` resolves to `mathematics/general`; any other unavailable namespace resolves to `global/general`. The authoring preview reports the requested and resolved IDs. Malformed IDs are rejected, not interpreted as paths. Unknown but well-formed IDs survive JSON round-trip, so later catalogues may supply them.

Explicit role images retain precedence: `meta.frontMatter[].image` for Overview/Outcomes and `meta.completion.image` for Completion. The renderer still reads legacy string sources; the existing journey importer requires structured image objects and that validation is unchanged. Image-object `alt`, `fit` (`cover`/`contain`) and `focus` override pack defaults. A metadata-only image object can adjust a pack's crop without replacing its source. Clearing its source returns to the pack while retaining those authored role settings. Custom images with no focus remain centred; `.68/.5` belongs to these procedural pack defaults, not a global image default.

In Lesson Studio, the existing artwork selector shows Global and Mathematics packs for Mathematics, and global packs for other subjects. The resolved-role preview shows all three images. Use the existing role upload/URL, crop and focal fields for overrides; **Use pack image** clears the explicit source. This does not redesign authoring or add learner controls. Non-textbook journey Completion also uses the opt-in resolver.

Publication resolves packs into data URIs in the cloned learner JSON using the existing exporter. All required procedural SVG bytes are inside the learner HTML. Custom local images still pass through the existing embedding checks. External video/media dependencies are separate and are not claimed to work offline.

For model-generated Mathematics lessons: identify domain/topic, choose the closest catalogue ID, emit `meta.artworkPack`, and normally do not generate bespoke images. Algebraic fractions uses `mathematics/algebra/fractions`, otherwise `mathematics/algebra/general`. Bespoke imagery is optional and exceptional.

Future subject/topic additions should add finite catalogue entries and role-compatible procedural assets (or explicitly reviewed local images), retain existing IDs and output bytes, test fallback/override/export/compatibility and supply actual-renderer evidence. No Geography, History, Science, English or other subject pack is included in this milestone. Global fallback does not constitute a subject pack.
