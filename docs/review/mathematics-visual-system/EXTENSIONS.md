# Compatible data and component extension points

## Multipart questions

Legacy `parts: [string, …]` and combined `answer` / `workedAnswer` remain valid. Optional records may contain `id`, `label`, `prompt`, `finalAnswer`, `workedAnswer`. Existing imported `text` / `stem` records remain readable and retain unknown fields. No mass migration is performed.

Question rendering uses the prompt and label. The Hub mirrors each part when part-specific answers are authored, otherwise it retains combined working. The existing answer policy gates access and removes part-specific answers from restricted learner exports together with combined answers. Inspector fields edit structured prompts and answers; duplicate-part controls preserve the original ID and generate a new ID for the duplicate. JSON round-trip preserves all records. Remote class answers continue to use the current combined-answer service contract; transmitting structured answers is a later backend/content milestone.

## Mathematical extent

Stable `type: "line"` objects default to finite **segments** for compatibility. Optional `extent: "segment" | "line" | "ray"` changes presentation: line continues both ways, ray starts at `(x1,y1)` and points toward `(x2,y2)`. Question-level `graphResponse.lineExtent` chooses the same semantics for new straight constructions without replacing the existing tool token or response document. Its default remains `segment`.

Parabola/function objects continue mathematically by default. Optional `domainMin` / `domainMax` restrict them. `openMin` / `openMax` distinguish open endpoints; defaults are closed. Optional numeric `discontinuities` explicitly split authored branches. Non-finite function samples and poles also break visible runs. Continuation arrows follow the clipped curve direction at visible exits; a finite segment never receives continuation arrows merely because clipping hides an endpoint. Domain endpoints receive open/filled points instead of continuation arrows beyond the authored interval.

`grPaintExtents` owns object extent presentation, `grPlane` owns the shared coordinate plane, and `GR_HGL.compile` remains the existing audited expression parser. Response interaction, stable IDs and linked table storage remain separate. Multiple authored objects already render on one plane; this pass adds no single-function assumption.

## Later graph-as-stimulus capabilities

Locate/mark, coordinate inspection, multi-function comparison, intersections and intervals/regions should pass authored object collections through this same plane/extent boundary. Add per-object accessible stroke/legend and inspection metadata at that boundary; retain learner response storage as a separate owner. A later side-by-side/overlay comparison selector can use the same student/model document projections. None of those new tools or automatic scoring are implemented here.
