# Repository-wide agent rules

Read [development foundation](docs/development/README.md), the task card and the nearest scoped AGENTS.md before work. Direct user instructions take precedence. Widget Contract V1 and ownership/capacity rules are adopted. Foundation corrections await final merge approval; do not dispatch the three planned feature streams.

- Learner delivery is the product. Do not add presenter, recording, teacher-presentation or HGL Studio controls. Existing legacy controls are not a mandate to expand or remove them in unrelated tasks.
- General Mathematics architecture is frozen at production `aae1b1a891d495e31e879bcbd6a79404f576fe57`. New work is content or a bounded capability justified by a real lesson.
- One bounded task = one branch and one writable Git worktree. Never share a builder's writable checkout. Preserve other tasks' changes and untracked material.
- Maximum three feature builders and two projects awaiting human design review. Integration/QA is a separate lane. No automatic dispatch when review capacity is full.
- Own only the task's explicit allowed paths. Central application, shared schemas/contracts, generated/vendor bundles, exports and CI are integration-owned; request a bounded integration task rather than duplicating the player.
- New substantial widgets follow [ADOPTED Widget Contract V1](docs/development/WIDGET-CONTRACT-V1.md). Existing passing widgets need no migration. Changes to a protected contract need explicit scope, integration review/tests and human approval for behaviour or architecture changes.
- After foundation merge and explicit launch, History, Source and Map Stage A may run concurrently toward one combined human checkpoint. Source/Map Stage A is audit/research/proposal only; Stage B needs human-approved History Stage A and reconciled bounded V1 scope. No automatic advancement.
- Focused tests, self-review, stable draft PR, CodeRabbit, actionable fixes, affected tests and integration checks precede the exact-head merge candidate. Agent review does not replace CodeRabbit.
- Stop for genuinely ambiguous UX/pedagogy, new interaction models, shared architecture/contract changes, unresolved historical accuracy or major visual identity choices. Continue routine fixes/tests/accessibility/responsive corrections autonomously within scope.
- Keep staged PRs DRAFT. This repository's `ready_for_review` event arms auto-merge; do not mark ready or merge before required human approval.
- Record actual branch/head, tests, remaining limits and runnable review evidence. Never present isolated widget success as production integration acceptance.

