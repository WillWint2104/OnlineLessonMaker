# Final M3 coordinate-plane correction

This pass keeps the reviewed M3 response schema, release groups, authoring, graph objects and learner session document intact. The shared `grPlane` presentation layer is used by compact/expanded learner graphs, Answer Hub models and student comparison graphs.

Authored viewport and `snap` remain unchanged. Authored grid increments drive grid/tick positions; numeric labels independently choose readable 1/2/5-based intervals at the actual rendered size, rounded to compatible grid positions. Viewport bounds are not forced labels. Minor grid disappears below a 12px projected gap. Arrowheads extend into the existing outer gutters; axis names anchor to those arrowheads. One origin label is prioritised where zero is in view. A final pass measures rendered text bounding boxes and suppresses collisions with other labels, arrowhead polygons and axis names.

The compact editable x/y/delete table uses a narrow deletion column and stacks above the graph below a 700px response-container width. Fully locked answer access shows the existing lock status with no launcher; released answers restore it. `Done` confirms automatic session retention without implying submission or durable persistence. Expanded workspace identifies the displayed question and retains its authored prompt. Worked answers omit the redundant badge.

`index.html` is a gallery of real application fixture renders. `results.json` includes actual glyph/arrow/name rectangles, collision results and native browser zoom metrics. Cases: −5…5 at step 1 compact/expanded; −4.5…4.5 × −3…3 at step 0.5; wide aspect; positive-only viewport; tablet; mobile; native 200%; Answer Hub models. `workflow/plane-fixtures.html` is an exported runnable learner lesson; its JSON beside it is editable. The two additional wide/positive questions are explicit verification fixtures, not changes to production lessons.

The existing five-question M3 interaction review remains in `../mathematics-m3/`. The separate general Mathematics visual-alignment prototype is not included in this branch. The heading focus outline mentioned in the review remains outside this correction's scope.

No remote release/Supabase deployment, automatic marking, durable storage, merge or deployment. Stop for visual/functional approval.
