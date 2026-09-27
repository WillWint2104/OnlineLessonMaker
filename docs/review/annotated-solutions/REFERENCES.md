# References and decisions

Read on 27 September 2026. These are references for mathematical and instructional decisions; the examples and interface here are original. All four sources were accessible.

- [OpenStax, Elementary Algebra 2e, §7.2](https://openstax.org/books/elementary-algebra-2e/pages/7-2-factor-trinomials-of-the-form-x2-bx-c): reverse expansion, product/sum conditions, signed pairs, candidate comparisons and multiplication checks inform the monic examples. We explicitly demonstrate division to obtain the candidates and the stopping point, rather than asking learners to find factors by inspection. Reversed factor order remains valid.
- [AMSI TIMES, Factorisation, printed pp. 9–11](https://amsi.org.au/teacher_modules/pdfs/Factorisation.pdf): common-factor checks and splitting the middle term support the non-monic transfer. The derivation retains equality between successive expressions; the warning about extracting a negative common factor sits beside that transformation. Our full candidate search goes beyond examples that select coefficients by inspection.
- [NSW CESE, Cognitive load theory in practice, strategies 2, 3 and 5](https://education.nsw.gov.au/content/dam/main-education/about-us/educational-data/cese/2017-cognitive-load-theory-practice-guide.pdf): fully explained examples, increasing independence and proximity of essential information support separate complete examples, guided completion and independent practice. Paired working/explanation rows are the user's requested design, not a universal layout proven by this guide. Stacking each pair retains the association when two columns cannot fit.
- [OpenStax, University Physics Volume 1, §3.2](https://openstax.org/books/university-physics-volume-1/pages/3-2-instantaneous-velocity-and-speed): average speed uses total distance divided by elapsed time; average velocity uses displacement. The synthetic cumulative-distance table precedes the question. The calculation retains units and the interpretation distinguishes sampled interval averages from instantaneous motion between observations.

## Scope and data contract

The activity player uses the existing example `steps[]` objects: `math`, `text`, `note` and `visual` remain separate. Each paired row owns all four, so existing insert, remove and reorder operations move the association together. Mathematical working remains a string. Newlines separate authored statements; continuation equalities are aligned without joining separate conditions or checks. The inspector previews that same string renderer. Legacy page compositions retain their renderer and data.

The only additive lesson field is `example.visualPlacement`: `question` places the existing example `visual` before its question; absent/`working` retains the previous placement. The inspector exposes the choice. Existing staged visibility still controls whether the companion is rendered. Step companions continue to sit at their associated step. No inference from subject, lesson ID or prose length controls layout.

Complete examples and questions already express the required purposes. Guided completion is a separate question activity with instructions and intentional blanks; independent practice contains prompts without a solved example. Response policy remains independent of that purpose. The author deliberately leaves `answer` empty where the final working and expansion check already supply the conclusion; no renderer deduplication hides authored answers.

## Fixture provenance and limits

These JSON files are current review/teaching fixtures, not a claim of teacher acceptance. The factorising review selects and corrects examples from the PR #155 reference lesson and the PR #156 authored lesson, retaining their skill, activity, example and surviving step IDs. In particular, the earlier mixed-sign prompt was **x² + x − 20**, confirmed in the complete JSON. The physics measurements remain explicitly synthetic. The qualitative fixture is retained to check the same white-surface hierarchy.

Historical `shared-player`, `shared-surfaces` and `activity-authoring` captures and their test fixtures remain unchanged. The matched `before` folder uses the PR #156 renderer at `aa33144324981a155ba7e45838c3fbd59f180ed9` with the new review content; this isolates the presentation comparison. Historical screenshots remain available separately for content comparison.

Actual teacher video URLs and playback remain outstanding. External video services are not promised to work offline. The tablet question-reference enhancement remains deferred. Merge and automated checks do not constitute teacher visual approval.
