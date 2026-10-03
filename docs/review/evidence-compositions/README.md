# Evidence and task compositions

This milestone adds two opt-in question/evidence compositions above the existing PR #159 solution. It continues the PR #161 baseline `0ef8b9cfd43bd1543023cfaf664fd433487f2d76`. Captures come from the actual application, not HTML mock-ups. The supplied references had reversed image labels; this gallery identifies layouts by their content: a small table/source beside its task (A), or a graph/image beside supporting data and its task (B).

## Opening the review

Open [index.html](index.html) for original-resolution captures, [Straight Lines](../../../lessons/straight-lines.html) for the classroom learner, or [the synthetic cross-subject learner](published-review.html). Open [lesson-studio.html](../../../lesson-studio.html), choose Edit → JSON, paste the contents of [the fixture JSON](fixtures.json), then Load. The editable classroom data is [Straight Lines JSON](../../../lessons/straight-lines/lesson.json). The gallery and self-contained learner HTML can open directly from disk. A local server is optional, for example `npx --no-install http-server .`; this requires that tool to be available locally. No remote videos are claimed to work offline.

## Additive contract and compatibility

`example.questionComposition` accepts `auto`, `evidence-task`, or `visual-companion`. An absent or unknown value preserves the established layout. New examples default to Auto, but no existing lesson is migrated automatically. The inspector retains an imported unknown value until the author explicitly chooses a supported value.

The existing `example.visual` ownership defines the relationship. Existing visual parts may carry `role: "primary"` or `role: "companion"`; the role selector is in each example-owned part's inspector. Unassigned parts remain primary content. Auto chooses B only for exactly one non-companion figure/image with content and at least one non-empty explicitly companion part in that same example. A table elsewhere in the lesson, group, working or method does not qualify. All other compatible evidence/task combinations use A. A missing task, missing evidence or no primary content falls back to established rendering.

A manual choice overrides Auto. Manual A shows all example evidence in its authored order. Manual B places non-companion evidence on the left and meaningful companions above the task; a missing optional companion simply omits that panel. Changing composition never writes, clones, reorders or deletes evidence. Unsupported imported roles remain visible in the selector and are preserved.

The existing table, prose, figure and registered image renderers are reused. Image is now available as a shared instructional part, with existing source/alt/caption fields; it introduces no new image schema. Imported image placements/interactions are retained. Detailed editing of uncommon imported figure types and image interactions remains in their existing workflows/JSON, rather than being silently rewritten by these controls.

## Classroom adoption

Only `intercept-table` and `rule-table` opt in. The first has a primary table and Auto selects A. The second has a primary graph and its existing values table explicitly marked companion, so Auto selects B. No override, mathematical rewrite, ID changes or additional teaching content is needed. Both standalone classroom publications were regenerated through the application's existing export flow; Factorising JSON and its legacy layouts are unchanged.

The solution table, method panels, authored collection tabs and sidebar/Back/Next ordering remain authoritative. Width changes only stack the selected composition; they do not choose A/B. Graph equal-unit scale remains authoritative. Small tables keep their natural width. At insufficient container width the DOM and visual order are primary evidence, supporting evidence if present, task, then the solution.

## Evidence and remaining boundaries

See [SCREENSHOT_INDEX.md](SCREENSHOT_INDEX.md), [AUTHORING_COVERAGE.md](AUTHORING_COVERAGE.md), and [verification records](verification/). Native zoom uses a real Chromium profile preference, not CSS zoom. The non-mathematics source and seedlings are small, explicitly synthetic review fixtures; they are not curriculum content.

Teacher video URLs/playback, the tablet question-reference enhancement, font changes and broader curriculum population remain outside this milestone. Historical galleries are not new evidence for this implementation.
