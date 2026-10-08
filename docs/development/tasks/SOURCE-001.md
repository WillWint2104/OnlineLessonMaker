# SOURCE-001 — Source/Evidence Viewer foundation

**Prepared only; BLOCKED; not authorised for implementation.**

- TASK ID: SOURCE-001
- STREAM: source
- TITLE: Source/Evidence Viewer foundation
- PRIORITY: P0
- PRODUCTION NEED: Approved Ancient History source-inspection need; reusable for Modern History, Geography, English and Business/case evidence where applicable.
- BLOCKS: Integration of the corresponding approved learner capability
- DEPENDENCIES: Stage A: FOUND-001 merged and explicit concurrent research launch. Stage B: human-approved HIST-001:A checkpoint and V1 scope reconciled with that checkpoint; record both in backlog before changing stage/ownership
- ALLOWED PATHS (Stage A): docs/review/source-SOURCE-001/** only
- STAGE B PATHS (not yet active): src/evidence-viewer/**; tests/widgets/evidence-viewer/**; docs/review/source-SOURCE-001/**; activate only after the History approval and scope reconciliation gate
- PROTECTED / DO-NOT-TOUCH PATHS: lesson-studio.html; docs/development/**; central registry/schema/export; src/mathematics/**; src/graph-response/**; assets/vendor/**; supabase/**; .github/**; all neighbouring streams and canonical lesson publications
- DELIVERABLES: Audit existing inline ev* viewer, OpenSeadragon and published evidence contract; proposed extraction/reuse plan plus bounded V1 component/fixture/tests after approval. Potential text/image/artefact, caption/provenance, zoom/details, annotation/guided questions/comparison are candidates, not all promised V1. Exact scope follows HIST-001. No rejected visual design adopted automatically.
- ACCEPTANCE CRITERIA: real production need traced to bounded reusable scope; no duplicate player or Studio controls; preserve existing lesson compatibility; structured authoring/runtime data separated; adapter requirements proposed without central wiring; evidence limits explicit
- STAGE A REQUIREMENTS: Audit/reference traceability, evidence/licence limits and a bounded V1 proposal; no new interaction implementation or vendor integration.
- TEST REQUIREMENTS (approved later build): Focused config/asset/provenance failure, state/reset/resize/disposal, keyboard/overlay focus, compact/inspection return; JSON round-trip and packaged local assets; existing evidence-viewer/publication gates at integration. Desktop/tablet/mobile/native200 evidence.
- HUMAN STOP CONDITIONS: New source-analysis interaction, major pedagogy/visual identity, ambiguous rights/evidence accuracy, shared contract/architecture change.
- REVIEW STAGE: Stage A scope/foundation; proposed B interaction and C real fixture only after appropriate approval; D integrated merge candidate
- BRANCH / WORKTREE: null; reserve codex/source-SOURCE-001-source-viewer only after activation; actual absolute checkout/starting SHA/owner recorded in backlog
- PR: null; keep any future staged PR draft
- INTEGRATION REQUEST: later minimal host adapter/authoring/export/schema wiring reviewed in a separate integration task

No agents/worktrees are launched for this card by the foundation milestone.


Stage A belongs to the shared humanities-stage-a review checkpoint: present the History lesson/capability brief, Source audit and Map audit together for one human decision where practical. Separate independent projects at later checkpoints; do not use this grouping to evade the review limit.
