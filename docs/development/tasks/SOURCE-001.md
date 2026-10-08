# SOURCE-001 — Source/Evidence Viewer foundation

**Prepared only; BLOCKED; not authorised for implementation.**

- TASK ID: SOURCE-001
- STREAM: source
- TITLE: Source/Evidence Viewer foundation
- PRIORITY: P0
- PRODUCTION NEED: Approved Ancient History source-inspection need; reusable for Modern History, Geography, English and Business/case evidence where applicable.
- BLOCKS: Integration of the corresponding approved learner capability
- DEPENDENCIES: FOUND-001 human setup approval; HIST-001 approved Stage A lesson/capability brief
- ALLOWED PATHS: src/evidence-viewer/**; tests/widgets/evidence-viewer/**; docs/review/source-SOURCE-001/**
- PROTECTED / DO-NOT-TOUCH PATHS: lesson-studio.html; docs/development/**; central registry/schema/export; src/mathematics/**; src/graph-response/**; assets/vendor/**; supabase/**; .github/**; all neighbouring streams and canonical lesson publications
- DELIVERABLES: Audit existing inline ev* viewer, OpenSeadragon and published evidence contract; proposed extraction/reuse plan plus bounded V1 component/fixture/tests after approval. Potential text/image/artefact, caption/provenance, zoom/details, annotation/guided questions/comparison are candidates, not all promised V1. Exact scope follows HIST-001. No rejected visual design adopted automatically.
- ACCEPTANCE CRITERIA: real production need traced to bounded reusable scope; no duplicate player or Studio controls; preserve existing lesson compatibility; structured authoring/runtime data separated; adapter requirements proposed without central wiring; evidence limits explicit
- TEST REQUIREMENTS: Focused config/asset/provenance failure, state/reset/resize/disposal, keyboard/overlay focus, compact/inspection return; JSON round-trip and packaged local assets; existing evidence-viewer/publication gates at integration. Desktop/tablet/mobile/native200 evidence.
- HUMAN STOP CONDITIONS: New source-analysis interaction, major pedagogy/visual identity, ambiguous rights/evidence accuracy, shared contract/architecture change.
- REVIEW STAGE: Stage A scope/foundation; proposed B interaction and C real fixture only after appropriate approval; D integrated merge candidate
- BRANCH / WORKTREE: null; reserve codex/source-SOURCE-001-source-viewer only after activation; actual absolute checkout/starting SHA/owner recorded in backlog
- PR: null; keep any future staged PR draft
- INTEGRATION REQUEST: later minimal host adapter/authoring/export/schema wiring reviewed in a separate integration task

No agents/worktrees are launched for this card by the foundation milestone.

