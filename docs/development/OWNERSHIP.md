# Repository audit and ownership

Audited main at `aae1b1a` on 8 October 2026. No existing tracked AGENTS.md or runtime widget registry. Most behaviour is still in **lesson-studio.html**: renderSlide/renderCanvas, inspector bindings, embedded lesson data/normalisation, activity renderer, publishing and answer-policy filtering (lpBookStudentData), response store and evidence inspection. Thus isolation must be incremental; no mass refactor.

| Actual area | Owner / conflict risk | Rule |
| --- | --- | --- |
| lesson-studio.html | Integration; highest conflict | Central player, authoring, schema, global styles and export. Builders provide adapter requirements, not competing edits. |
| src/graph-response/ | Mathematics; protected accepted implementation | Isolated JS/CSS/extent source embedded by scripts/build-graph-response.mjs. Reuse, no compulsory contract migration. |
| src/mathematics/visual-system.css | Frozen Mathematics / integration | Shared accepted style embedded by build-mathematics-visual-system.mjs. |
| assets/vendor/hgl-calculator/ | Mathematics / integration | Audited reference, adapter, integration CSS and generated component; build-calculator.mjs owns generation. Do not edit generated output independently. |
| assets/vendor/hgl-graph/, openseadragon/ | Integration / dependency custodians | Audited graph foundation and vendored evidence-image engine. Source hashes/licences retained. |
| Existing evidence viewer | Integration until bounded extraction approved | Inline ev* functions; docs/review/evidence-viewer/CONTRACT.md and PUBLICATION.md record stable image evidence/provenance/inspection. SOURCE-001 must audit/reuse them. |
| examples/, lessons/, docs/lessons/ | Content owner, scoped per task | Existing corpus/schema/IDs are compatibility inputs, not builder scratchpads. Published HTML requires explicit export task. |
| scripts/verify-*.mjs, tests/visual/ | QA/integration for shared gates | Focused builder tests live in assigned tests/widgets/<area>/; established gates are preserved. |
| .github/, .coderabbit.yaml, supabase/ | Integration / service owner | Review/deployment policy and prepared, undeployed classroom service; no changes in initial streams. |
| docs/review/, review-delivery/ | Assigned evidence owner | One task-specific output folder; do not overwrite other tasks or treat historic captures as current. |
| src/humanities/, src/evidence-viewer/, src/map/, src/data/, src/themes/ | Reserved isolated new areas | Only scoped guidance exists now. Planned ownership does not mean implementation exists or is authorised. |
| src/widgets/registry.*, shared lesson schema | Reserved integration boundary | No registry/framework is created. If needed later, integration owns a minimal adapter and compatibility work. |

Existing documentation conventions: HANDOFF.md chronological notes, docs/review/<milestone>/ contract/README/results/captures, tests/visual/lessons JSON fixtures, scripts/verify-*.mjs for assertions. Preserve that convention for central integration; new component tests can be isolated without rewriting existing tests.

Shared test inventory includes validate; Mathematics calculator/graph/plane/structure/visual gates; response-store, shared-player, activity authoring/publication, corpus identity, evidence viewer/publication and geometry checks. Full applicable exact-head runs use scripts/verify-player-suite.mjs with a dedicated output path and clean tracked source. A build script can modify the central HTML and therefore belongs in the integration checkout, not a builder's independent component lane.

Ownership is task/guidance-based in this milestone, not a new security mechanism. Any exception must list exact central paths, purpose, regression coverage and integration owner. No broad “all scripts” exception.

