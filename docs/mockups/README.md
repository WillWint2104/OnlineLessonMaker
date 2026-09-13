# Approved learning-card mockups

Design evidence for the instructional / companion **learning card** family. These six images are the
approved visual reference; the design language they lock is the input to Stage 4 **C6b**.

They are not drawings. Each was rendered in Chromium from the app's own material:

- **Tokens** are copied verbatim out of `lesson-studio.html` — the `mathematics` slot palette
  (`--canvas`, `--surface-lowest`, `--primary`, `--outline-variant`, `--tp-rad`, `--tp-prose-size`,
  `--tp-prose-lh`) and the vendored `EB Garamond` `@font-face` blocks. No colour or font value in the
  mockups was invented.
- **The figures in 05 and 06 are the shipped engine's own output**, extracted from a live render at a
  stage width of 532 logical px — the true width of a `beside` column at `--tp-measure: 1140`. The
  triangle's angles (48.2° / 58.4° / 73.4°) and side labels are what `figGeometry` computed, not
  values typed into a mockup.

The mathematics palette is the design environment, not a requirement: the card primitive is
theme-resolved, and green is nowhere hard-coded.

## The locked style rules

1. **Two surfaces.** A prose card and a Figure Shell, as siblings — never prose inside the shell.
2. **Never squash the core asset.** A figure keeps its proportions, its minimum usable stage width and
   its responsive annotation scale. Long prose takes more vertical space; it does not compress the
   figure, and siblings are top-aligned rather than forced to equal height.
3. **Restrained accent.** The theme accent reaches iconography, rule lines, chips and figure strokes
   only — never a large fill behind text, never a coloured button.
4. **Text card.** Light surface on the warm canvas, subtle outline, generous padding, readable measure,
   no elevation.
5. **Hierarchy.** Short kicker → strong title/question → readable body → small footer/help line.
6. **One asset per mockup.** These are individual references, not a comparison board.

Variation is permitted in the text-card *subtype* only — Thinking Prompt, Key Idea, Worked
Explanation, Check Your Understanding — and every subtype stays inside this one visual family.

## Files

| File | What it demonstrates |
| --- | --- |
| `01-thinking-prompt.png` | Text card — Thinking Prompt; kicker + open question + footer nudge |
| `02-key-idea.png` | Text card — Key Idea; closes with a chip instead of a footer |
| `03-worked-explanation.png` | Text card — Worked Explanation; the numbered-steps variant |
| `04-reflect-check.png` | Text card — Check Your Understanding; adds a quiet sentence-starter line |
| `05-figure-beside-prose.png` | Two-surface pair, geometry: card beside a real Figure Shell |
| `06-graph-beside-prose.png` | Two-surface pair, graph: card beside a real coordinate plane |

## `src/`

The reproducible sources. Each `NN-*.html` is a **body fragment**, not a page: `kit.css` supplies the
chrome, `{{FIG:geometry}}` / `{{FIG:graph}}` are substituted with markup extracted from a live render of
`mockup-figures.json`, and the whole thing is wrapped in `<div class="tp-slide mk-canvas">` under
`data-theme="mathematics"`. The `EB Garamond` faces and the `.tp-fig*` rules are pulled from
`lesson-studio.html` at build time rather than duplicated here, so the mockups cannot drift from the app
without the app changing first.

`kit.css` is a **mockup** stylesheet. Its `mk-*` classes exist to express the six rules above for
review; they are deliberately not app classes, and C6b should implement the approved language through
the app's own semantic tokens rather than by importing this file.
