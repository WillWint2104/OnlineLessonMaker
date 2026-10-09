# Bounded task card

- TASK ID:
- STREAM:
- TITLE:
- PRIORITY: P0 production-critical / P1 required / P2 future
- PRODUCTION NEED: actual lesson and missing capability; evidence/source brief
- BLOCKS:
- DEPENDENCIES: IDs plus acceptance/approval conditions
- IMPLEMENTATION STAGE GATE: approved checkpoint and reconciled scope; distinguish concurrent Stage A research from Stage B implementation
- ALLOWED PATHS: exact directories/files; component, focused tests, fixture and evidence
- OWNERSHIP PATTERNS: exact repository paths or terminal /** only; no other wildcards. Retained worktree reserves paths until merge or explicit release.
- PROTECTED / DO-NOT-TOUCH PATHS: central player/schema/export/contracts and neighbouring streams
- DELIVERABLES: reusable source, authored/state schema, fixture, tests, evidence, adapter requirements
- ACCEPTANCE CRITERIA: observable behaviours; legacy compatibility; explicit exclusions
- TEST REQUIREMENTS: commands, fixture coverage, responsive/input/accessibility/state/export as applicable
- HUMAN STOP CONDITIONS: product decisions actually needed; routine fixes continue
- REVIEW STAGE: A/B/C/D, current state and waitingForHuman flag
- BRANCH / WORKTREE: actual names/absolute paths only after activation; starting SHA and owner
- PR: draft number/link when created
- INTEGRATION REQUEST: minimal central changes; owner, affected schema/exports and regression scope

Acceptance must distinguish isolated, integrated and deployed results. List remaining limitations; don't claim remote release, offline external assets, physical-device or automatic-marking acceptance without evidence.

