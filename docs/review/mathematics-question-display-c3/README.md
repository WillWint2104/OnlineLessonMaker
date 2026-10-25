# Mathematics C3 — Graph question integration

Implements the four integration gaps approved in B3 against baseline `9e9ad44926ae06078ecaaeadc7b492e3c20a3681`: micro graph containment, C2 question/answer visuals, canonical C1 working, and written part prompts/answers. The existing graph engines, mathematical extents, calculator, response document, navigation and published corpus are retained.

The former micro flex row now has a contained graph-specific vertical composition. Ordinary dense algebra grids remain unchanged. Compact cards show question/givens and a labelled **Your graph** surface. Expanded views share the same attempt; the existing close control returns focus, and a header **Question and givens** control restores the full prompt, supplied visuals, descriptions and written parts without closing the workspace. C2 uses its existing dialog containment/theme adapter so figure strokes and labels are painted correctly there.

The specialist Answer Hub retains model graphs, completed graph tables and visual comparison. It now renders authored C2 answer visuals and written part answers, and reuses C1 paired/aligned structured steps. The previous graph-only structured-working rejection is removed only alongside these rendering, eligibility and export-redaction changes. Existing conflicts/notation/step-ID validation still applies. Group-authorised working retains the existing collapse/expand controls even when whole-lesson working is hidden.

## Graph roles and answer integrity

- **Given information:** C2 authored evidence, rendered through the existing Figure Engine/table/image path. It is never copied into the learner graph document.
- **Your graph:** empty objects plus only the explicitly authored initial linked-table rows/valid points. The same Graph Response V1 document is shared by compact and expanded views. No model is preloaded, even in an autonomous learner export.
- **Model answer:** graph objects, completed values, part answers, additional model evidence and worked steps appear only under their effective final/worked/group policies. Hidden and deferred teacher-group content is stripped from the learner payload, including structured parts when the optional `graphAnswer` is absent. A local preview release never authorises exporting deferred teacher answers.

No new equation editor, function-entry mode, shading tool, construction primitive, marking, durable persistence or remote teacher service is introduced. Existing `hybrid` means graph/table/construction/sketch. Written answers keep the existing paper/workbook route. Evidence-only questions create no graph activity; explicit graph responses retain existing interactivity under paper/type/pen lesson modes.

## Verification and review

Run from this isolated checkout with the repository's existing Node/Playwright dependencies and Chromium:

```text
node scripts/verify-mathematics-graph-integration.mjs
node scripts/verify-mathematics-graph.mjs
node --test tests/widgets/mathematics-question-display/core.test.mjs
```

Set `C3_REVIEW_DIR` to an isolated evidence folder. The C3 gate uses the actual application import, inspector, learner, expansion, Hub, local release and export paths. It checks all six B3 fixture families, untouched and attempted graphs, C2 painted givens, parts, aligned working, final/worked/hidden/teacher/end group combinations, state/reset, modes, authoring round-trip and real native 200% browser zoom. Page-error listeners register before navigation. Captures are real application states; no static proposals substitute for them.

The complete applicable verification also includes the unchanged 55-gate player suite, C1/C2/micro focused gates, corpus identity and protected-source hashes. All gate output must use this task's separate review directories. Exact final-head receipts and an incremented review ZIP accompany the draft PR; preliminary run output is not an exact-head acceptance claim.

Keep the PR **DRAFT**, with auto-merge disabled. No merge, deployment or new lesson publication until separate human approval. Stop for C3 visual/functional review; no B4 milestone starts automatically.
