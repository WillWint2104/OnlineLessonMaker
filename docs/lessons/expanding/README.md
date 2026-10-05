# Expanding: two discrete video lessons

The teacher's actual combined test export is retained unchanged in `source-combined.json` (SHA-256 `bb971cd2d6538d56b1db8b3e8164c538480ae35c2d5da9d70278fef9f12abfe1`). It is split into two Mathematics lessons:

| Lesson | Learner HTML | Editable data | Supplied video |
| --- | --- | --- | --- |
| Expanding two binomials | `../../../lessons/expanding-two-binomials.html` | `../../../lessons/expanding-two-binomials/lesson.json` | https://youtu.be/8cDC_Y2MKwA |
| Expanding a binomial by a trinomial | `../../../lessons/expanding-binomial-trinomial.html` | `../../../lessons/expanding-binomial-trinomial/lesson.json` | https://youtu.be/c17efvFF2as |

The learner sequence is Overview → Learning outcomes → Introduction → Video → Worked examples → three distinct Practice archetype pages → Lesson complete. Worked examples remain internal tabs; Foundation and Moderate are internal pathways on each practice page. The M1.2 branch JSON has 12 Foundation and 8 Moderate independent problems per archetype: 60 per lesson. The production HTML remains at M1.1 until the approved Algebra artwork, final review and publication are complete. Branch-generated learner HTML and actual captures are in `../../review/mathematics-m1-2/`. Learners write in an exercise book and check permitted answers in a separate Answer Hub. Every question has authored full working; scaffold subparts count as one question.

Basic uses close repetition of positive terms, negative signs and coefficients. Moderate increases arithmetic within the same distribution method. Substeps inside the retained scaffold are one problem, not additional practice volume. There are no enrichment or unmodelled problem types. The one-video/one-skill convention is the production preference; the engine continues to support multi-skill lessons.

`TEXTBOOK_ANSWERS.md` is the current 120-answer key with full working. `ANSWERS.md` and `build-expanding-lessons.mjs` retain the historical M1 baseline; do not run that generator over current authored lessons. `scripts/build-expanding-textbook.mjs` restores the curated M1.2 sets and retains supplied image assets; it no longer generates artwork. It is a content generator, not a safe merge of later teacher edits. The independent textbook gate verifies every worked line and final at six inputs, then actual authoring/navigation/policies/publication/reopening. Its `--publish` flag explicitly regenerates the canonical learner HTML through the application's Export action after both lessons pass. Current bookend artwork acceptance is pending; no new canonical publication is claimed.

Lesson A uses end-of-lesson final/worked access. Lesson B offers autonomous finals and end-of-lesson working. Both use local policies with deliberately embedded answers; neither is configured as a secure live-class release lesson. Optional Supabase preparation and deployment limits are documented in `../../../supabase/README.md`. In a protected deployment, publish only the stripped student HTML, not teacher JSON, answer keys or historical answer-bearing files.

Video URLs are the supplied teacher references. Playback and school-network access have not been certified by the local automated checks. Official curriculum-alignment expansion, calculator integration and graph-sketch integration are outside M1. Finishing the lesson pages is not a claim of assessed mastery.
