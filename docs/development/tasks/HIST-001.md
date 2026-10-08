# HIST-001 — History lesson architecture

**Prepared only; BLOCKED; not authorised for implementation.**

- TASK ID: HIST-001
- STREAM: history
- TITLE: History lesson architecture
- PRIORITY: P0
- PRODUCTION NEED: Year 12 Ancient History flagship; Year 9/10 History and future Geography reuse the same engines.
- BLOCKS: SOURCE-001 and MAP-001 scope acceptance
- DEPENDENCIES: FOUND-001 human setup approval; concrete Year 12 Ancient History topic, source set and required assessment brief
- ALLOWED PATHS: src/humanities/**; tests/widgets/humanities/**; docs/review/history-HIST-001/**
- PROTECTED / DO-NOT-TOUCH PATHS: lesson-studio.html; docs/development/**; central registry/schema/export; src/mathematics/**; src/graph-response/**; assets/vendor/**; supabase/**; .github/**; all neighbouring streams and canonical lesson publications
- DELIVERABLES: Stage A production-lesson capability brief, audit of current subject/evidence/composition systems, bounded learner foundation proposal and data/adapter needs. Investigate exposition/narrative, primary/secondary sources, images/artefacts, inquiry, chronology, cause/consequence, significance/perspectives, evidence/source analysis, short/paragraph/extended responses, model answers, video/maps/timelines/data where actually needed. Do not implement the full History lesson before scope approval.
- ACCEPTANCE CRITERIA: real production need traced to bounded reusable scope; no duplicate player or Studio controls; preserve existing lesson compatibility; structured authoring/runtime data separated; adapter requirements proposed without central wiring; evidence limits explicit
- TEST REQUIREMENTS: Stage A audit/reference traceability and realistic fixture requirements; approved later build adds focused authoring/JSON/response/model/navigation tests and desktop/tablet/mobile/200% evidence. Existing History/evidence corpus and export compatibility at integration.
- HUMAN STOP CONDITIONS: Missing concrete production brief; source accuracy/provenance uncertainty; materially different pedagogy/UX/identity; shared contract/architecture change. Do not assume Mathematics layouts fit History.
- REVIEW STAGE: Stage A scope/foundation; proposed B interaction and C real fixture only after appropriate approval; D integrated merge candidate
- BRANCH / WORKTREE: null; reserve codex/history-HIST-001-lesson-foundation only after activation; actual absolute checkout/starting SHA/owner recorded in backlog
- PR: null; keep any future staged PR draft
- INTEGRATION REQUEST: later minimal host adapter/authoring/export/schema wiring reviewed in a separate integration task

No agents/worktrees are launched for this card by the foundation milestone.

