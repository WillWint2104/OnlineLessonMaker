# HGL Graph foundation audit

Reference: the supplied `C:/Users/willi/Videos/HGL console/homegrown-learning/build/graph.html`, copied byte-for-byte as `graph-reference.html`.

SHA-256: `f9fd53f26dfaaf04f330c47bccbaccaa8fe54722dfe0e49b7bf300f8e8e8cb9a` (377,933 bytes).

The reference contains widget state normalization, a safe tokenizer/RPN evaluator, a function SVG renderer, vector stroke replay, runtime teacher cards, presets, viewport controls, coordinate traces and angle-arc tools. Its renderer already supports per-axis increments, finite sampling, function domains, discontinuity breaks and filled/open point styles. Its stroke replay scales recorded vectors and falls back to polylines when the freehand library is unavailable.

`scripts/build-graph-response.mjs` extracts 14 original functions unchanged into a closure: Unicode normalization, tokenizer, RPN conversion/evaluation/validation, compilation, grid step limiting, SVG element and marker construction, SVG graph rendering, safe colors, number formatting, vector stroke replay and color conversion. The source SHA is checked before every build. No teacher cards, presets, widget state, function-entry sidebar, calculus/trace/arc UI or widget launcher is copied into the learner interface.

The OnlineLessonMaker adapter owns question configuration, bounded student construction tools, mathematical-coordinate strokes, linked table values, instance-specific SVG marker IDs and readable label scaling. It passes authored domains to the original renderer and projects stored mathematical stroke coordinates into the original stroke replay function. This makes resizing independent of the student's stored coordinates. Freehand is a student stroke response, not automatic function recognition or marking.

The supplied reference remains an audit source; opening it is not the integrated student experience. The actual interface is in `lesson-studio.html`. Rebuild with `node scripts/build-graph-response.mjs`; edit `src/graph-response/` rather than the generated embedded section.

M2's calculator foundation and adapter are untouched. Existing authored classroom lessons are unchanged. No external graph library or remote service was introduced.
