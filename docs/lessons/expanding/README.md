# Expanding: two discrete video lessons

The teacher's actual combined test export is retained unchanged in `source-combined.json` (SHA-256 `bb971cd2d6538d56b1db8b3e8164c538480ae35c2d5da9d70278fef9f12abfe1`). It is split into two Mathematics lessons:

| Lesson | Learner HTML | Editable data | Supplied video |
| --- | --- | --- | --- |
| Expanding two binomials | `../../../lessons/expanding-two-binomials.html` | `../../../lessons/expanding-two-binomials/lesson.json` | https://youtu.be/8cDC_Y2MKwA |
| Expanding a binomial by a trinomial | `../../../lessons/expanding-binomial-trinomial.html` | `../../../lessons/expanding-binomial-trinomial/lesson.json` | https://youtu.be/c17efvFF2as |

The learner sequence is Overview → Learning outcomes → Introduction → Video → Worked examples → Practice → Lesson complete. Each collection's three example states stay inside Worked examples; Back/Next traverses them. Practice uses the corresponding three internal archetypes, with four Basic and two Moderate independent problems each. Learners write in an exercise book, complete a level and deliberately reveal its answers. Each retained guided question has an optional worked answer inside that group's reveal.

Basic uses close repetition of positive terms, negative signs and coefficients. Moderate increases arithmetic within the same distribution method. Substeps inside the retained scaffold are one problem, not additional practice volume. There are no enrichment or unmodelled problem types. The one-video/one-skill convention is the production preference; the engine continues to support multi-skill lessons.

`ANSWERS.md` lists the 36 final answers. `scripts/build-expanding-lessons.mjs` recreates the data from the unchanged source and authored numeric sets. The independent focused gate checks worked examples and practice answers at six distinct inputs, authoring, internal navigation, reveal, publication and reopening. Rebuilding data does not publish learner HTML; the focused gate's `--publish` flag explicitly creates canonical learner files through the application's Export action.

Video URLs are the supplied teacher references. Playback and school-network access have not been certified by the local automated checks. Official curriculum-alignment expansion, calculator integration and graph-sketch integration are outside M1. Finishing the lesson pages is not a claim of assessed mastery.
