# Skill 1 — Factorising monic quadratics, as a student meets it

Captured from the real application, in Study mode, at 1536 × 960, with the lesson loaded through the
app's own ⌗ **Lesson data** dialog — the supported loading path, not an injected global.

    node scripts/shots-lesson-review.mjs --lesson docs/atlas/lesson/factorising-skills.app.json \
                                         --out docs/review/skill-1-monic

| file | what it is |
|---|---|
| `00-factorising-monic-quadratics--screen.png` | the first screen, with the rail and the app bar — what is actually on a 1536 × 960 display |
| `00-factorising-monic-quadratics.png` | the **whole** skill, 9292px tall: the viewport grown by the scroller's overflow so nothing stops at the fold |
| `captures.json` | the measurements printed below, machine-readable |

**Measured:** one surface · 4787 characters · **3662px past the fold** · 4 worked examples · 16 solution
steps · 12 numbered items · 1 table · **0 inputs** · 0 page errors. The rail reads
`Factorising monic quadratics / Skill 1`.

## What the capture shows

1. **Notes and method** — five concepts, in the notes page's own list renderer.
2. **Watch: factorising monic quadratics** — the author-facing *No video yet* notice. **No URL was
   supplied for this skill**, so there is nothing to embed. Nothing simulates a player: no play control,
   no scrubber, no duration, no chapters, no transcript.
3. **Worked examples** — two groups, each keeping its title (*The same method, three sign patterns*;
   *When a common factor comes out first*), stacked rather than hidden behind tabs.
4. **Practice** — seven questions, introduced by *Complete these in your exercise book…*; the table
   question's empty cells are ruled blanks, not fields.

No response-mode control appears anywhere in Study.

## Known limitations, not fixed here

- **No video address exists.** Until one is supplied the skill shows the notice above. This is the
  specified behaviour for the missing case, not a placeholder standing in for a finished feature.
- **The question column is mostly empty beside a long solution.** In the `standard` composition a
  one-line question sits opposite a solution several hundred pixels tall, leaving a tall blank band on the
  left. This is the existing worked-example composition, unchanged by this work, and is a presentation
  question for the maintainer rather than a defect introduced here.
- **This is one skill.** The remaining skills of the factorising lesson (non-monic, and the rest of the
  hour) are not built, by instruction.
