# MATH-C4A — native single/multiple choice Practice

- Owner/lane: Mathematics integration/QA; directly authorised C4A implementation after B4 approval, 27 October 2026. No seeded Geography/Humanities launch or delegated feature agents.
- Need: B4 demonstrated mathematical options could be printed but had no retained, release-aware Practice selection interaction. Legacy self-check remains separate.
- Baseline: `5143b6713e135f665a9c3ff01a3f2714be2c0759`.
- Branch/worktree: `codex/integration-MATH-C4A-choice`, `C:/Users/willi/Videos/Online Lesson Maker/review-delivery/worktrees/math-question-display-c4a`.
- Allowed paths: `src/mathematics/choices/**`, `tests/widgets/mathematics-choices/**`, `scripts/build-mathematics-choices.mjs`, `scripts/verify-mathematics-choices.mjs`, `docs/review/mathematics-question-display-c4a/**`, this card; bounded `lesson-studio.html` integration for rendering, authoring, answer projection/eligibility and the additive response kind. No navigation changes.
- Protected: graph/calculator/visual-system engines and assets, all existing published lessons, historical review ZIPs, Geography-owned files, shared governance/contracts, services and CI. New source does not migrate old questions or knowledge checks.
- Data: opt-in `choice: {type: single|multiple, options: [{id,text}]}` and separate `choiceAnswer: {correctOptionIds: []}`. Existing C1 working, releaseGroup and policies retained. Session store kind `choice`, version 1 selected IDs; no durable state or marking.
- Approved policy clarification: offline end answers stay embedded and reveal on completion, as before. Hidden and teacher-withheld keys/explanations are removed from learner payloads. Local preview never authorises publication of teacher-group answers.
- Acceptance: native labelled whole-row radios/checkboxes, clear/change with no Submit/gate/marking, retained stable-ID attempts, math options, editable invalid drafts with publication diagnostics, authoring reorder/remove/keys, JSON/export/reopen, group/teacher/end safety; desktop/laptop/native 200% and browser pen/touch evidence. Existing mobile regression retained; no phone design round.
- Tests: focused real application and pure contract tests, C1/C2/C3 affected verification, full applicable exact-head player suite, protected-source/corpus checks. Draft PR and CodeRabbit exact-head review/fixes required before handoff.
- Stop: visual/functional human review; no merge, deployment, publication or C4B. Runtime tests and integrated exports are local acceptance only, not live deployment or physical-device certification.
