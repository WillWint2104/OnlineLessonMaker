# Mathematics C2 — integrated figures and tables

Baseline: `996be9c5c9ef71f0ce745ca2876246370796e19b`. B2 design approved for bounded implementation. This branch is a review candidate, not permission to merge/deploy/publish.

See [contract](CONTRACT.md) and [task boundary](../../development/tasks/MATH-C2-001.md). Implementation reuses Figure Engine, image/table parts, host responses, paired examples and the existing Answer Hub. Existing graph/calculator/C1 sources and published lessons are protected.

Build and verify from this checkout:

```powershell
node scripts/build-mathematics-visual-attachments.mjs
node tests/widgets/mathematics-visual-attachments/core.test.mjs
$env:C2_REVIEW_DIR='review-delivery/c2/focused'
node scripts/verify-mathematics-visual-attachments.mjs
```

The focused verifier runs the real application and emits actual captures, geometry/containment measurements, editable-draft rejection cases, actual inspector/upload edits, JSON round trips, independent learner exports, answer-release projection and offline assets. `C2_FAMILIES`/`C2_SKIP_ZOOM` are developer subsets; a final receipt requires the full twelve-family/four-size run with neither set. Page-error listeners are installed before navigation, including native 200%. Native screenshots use CDP to avoid Playwright's zoom clipping artifact.

The twelve synthetic fixtures derive from the accepted B2 audit, retaining existing question/activity/step IDs. They are verification material, not production lessons. Added stable definitions describe the actual givens. Sector/cuboid SVGs are the original authored B2 assets; no new drawing engine or external runtime dependency. Function-table controls retain existing q.table; wide/grouped tables also test shared-reference response identity. An entered `17` is an intentionally arbitrary learner attempt, not a correct answer or marking claim.

Final evidence is packaged externally in an incremented ZIP with a manifest, exact-head receipts and explicit limits. No passing counts in this document substitute for the generated receipts. Historical B2/C1 packages are preserved.
