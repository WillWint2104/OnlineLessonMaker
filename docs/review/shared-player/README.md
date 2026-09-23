# Shared lesson player — visual review

This is an implementation review, not visual approval. Start the local app with
`node scripts/serve-player.mjs`, then open [the authoring app](http://127.0.0.1:8099/lesson-studio.html)
or [the independent factorising lesson](http://127.0.0.1:8099/docs/review/shared-player/published-factorising.html).
PR #153 is the integration route. Consult its current review/check state for merge and deployment status.

## Implementation map and decisions

The verified starting branch was `origin/claude/stage-4-block-wiring` at
`2189477ef628e002a18323fe1e0ee1234e3b68bb`; its merge base with main was
`e328db01524e448a103ac58d73aba60bddd04fdc`. PR #153 was open at that development head.
Work is isolated on `codex/shared-lesson-player`.

The existing `PAGES` registry now supplies `shared.skill` for skills with an authored
`activities[]`. `lpRender` owns the common shell, location, outline, Back/Next and end state.
It projects only the selected activity into `mxSkillPage`, which reuses `mxConceptList`,
`mxWexGroup`, `mxQuestionList`, `mxVideoRegion`, `mxWorkbook`, and the existing Figure Engine
part vocabulary. No framework, backend, equation library, runtime file split or parallel
capability registry was introduced.

The explicit new contract is `meta.player: "activities"`, stable `meta.id`, and
`slides[]` of `{type:"skill", id, title, video:{url}, activities:[]}`. Activities have
stable IDs and compose the existing content fields: notes, workedExamples/examples,
questions, and optional video. Array order controls the sequence. Questions keep stable IDs;
each activity gets a separate workbook ID under its skill. Responses are session state;
JSON/HTML export persists authored content, not student work. Re-import resets responses.

`meta.subject` is authoring context; it does not limit available components. `meta.theme`
does not route these skills. `meta.colors.accent` accepts a six-digit hex token. New activity
lessons default to paper. Existing lessons without activities retain their original rendering
and missing-response-mode compatibility. This delivery does not migrate historical files.

The approved learning-card family is documented in `docs/mockups/README.md`; the old
factorising screenshots in `docs/review` document defects. The previous whole-skill-on-one-
surface requirement is superseded for the new activity flow. The neutral shell, typography,
activity granularity and 260px outline are provisional choices for review. A complete example
is one activity; practice keeps related questions together. Long activities scroll naturally.

## Reproduce authoring and publication

1. Open the authoring app. Choose **New activity lesson** for a new lesson, or choose **Edit → JSON**,
   paste `factorising.json`, `qualitative.json` or `physics.json`, then choose **Load JSON**.
2. Choose **Edit**. The inspector exposes lesson/subject/response settings, skill title,
   the skill's video URL, and activity navigation. Use **Add explanation activity**, edit its
   title and concept text, and use **Move activity earlier/later**. Select another skill or
   use **Move skill earlier/later**. Existing nested-array controls add/remove concepts and
   questions. Additional skills currently require JSON: the new activity flow does not expose
   the established page palette. See `AUTHORING_COVERAGE.md` for the exact graphical boundary.
3. Choose **Study** to preview the actual learner renderer. Use the outline or Back/Next.
   The final Next opens a deliberate end page; Back returns to the last activity.
4. Open **JSON → Download .json** to retain canonical editable data. Paste it back into
   the JSON dialog to reopen. HTML **Export** creates a learner-only lesson; reopening that
   file is delivery, not an editor. To edit again, load the JSON in the authoring app.
5. **Export** uses the existing publication handler. The activity-only exports contain their
   runtime, fonts and lesson data; the unused 3D runtime reference is removed. These examples
   need no adjacent assets. Real embedded videos still need access to their external provider.
   Serve the HTML with any static local server and open it in a fresh browser context.

The three supplied lessons were assembled through JSON by `scripts/build-player-demos.mjs`.
The browser test actually added an activity, edited its title/body, reordered activities and
skills, switched to Study, exported HTML and reopened it independently. Its edited export is
`published-authoring.html`; `published-factorising.html` contains the unmodified review lesson.
The edited JSON was also downloaded and re-imported through the UI as `authored-roundtrip.json`;
both JSON and published HTML were checked for complete content/identity preservation.

The two teacher video slots are `slides[0].video.url` and `slides[1].video.url` in
`factorising.json`. No real URLs were supplied. Missing video activities are omitted in Study
and visible with guidance in Edit. The safe URL normalization test uses a synthetic URL and
blocks external requests; it makes no playback-availability claim.

## Screenshot index

All captures are browser screenshots, not mockups. Normal viewport sizes are 1536×960 and
1024×768; the phone check uses 390×844. Paired start/end captures show long activity content
without shrinking the type.

| Files | What to inspect |
| --- | --- |
| `before-desktop/*--screen.png`, `before-tablet/*--screen.png` | Original one-skill scrolling surface at matching sizes |
| `desktop-01-opening.png`, `tablet-01-opening.png` | Lesson, skill, activity outline and explanation |
| `desktop-02-working.png`, `tablet-02-working.png` | Question above working; no empty parallel question column |
| `*-02b-working-end.png` | Remaining steps and final answer |
| `*-longest.png`, `*-longest-end.png` | Longest authored derivation, preserved in full |
| `*-nonmonic-longest.png`, `*-nonmonic-longest-end.png` | Non-monic negative-sign example, five complete steps and the longest non-monic answer |
| `desktop-03-practice.png`, `tablet-03-practice.png` | Grouped practice and non-editable paper table blanks |
| `qualitative.png`, `qualitative-end.png` | Clearly labelled synthetic source context with analysis prompts |
| `physics.png`, `physics-end.png` | Explanation, worked calculation, instructional data table and reasoning |
| `typed.png`, `pen.png` | Existing digital response implementations inside the shared player |
| `authoring.png` | Actual UI-authored text and reordered skill |
| `independent.png` | Reopened exported lesson without author controls |
| `phone.png` | Basic narrow-screen behavior |
| `legacy-corrections/*-quiz.png`, `legacy-corrections/*-focus.png` | Restored quiz content and the real theme-specific Focus dialogs |

Content corrections are separate from presentation: inherited `_bx_`/`_ax_` style notation
was normalized to individual variable tokens, an unsupported fabricated six-minute video
note was not carried into the new empty URL slots, and the synthetic physics table uses the
table renderer's stub/head convention. No questions, derivation steps or graph domains were
removed to fit a screenshot.

## Scope and remaining limits

Demonstrated capabilities: explanation, attributed/synthetic text context with analysis
questions, worked algebra, instructional tables, practice tables/subparts, safe video slots,
typed workbook and pen workbook. Existing mathematical figure parts remain available through
the same worked-example renderer; this small mixed demo establishes table/calculation reuse,
not a new simulation or a comprehensive physics authoring tool.

Detailed worked-example steps, figures, table structure and question subparts remain JSON
authoring in this delivery. Subject-specific presets, arbitrary activity components, automated
assessment, persistent learner accounts and new cosmetic packs are not implemented. Opening
an activity is a location, not mastery. No XP or answer-gated progression was added.

Run `node scripts/verify-player-suite.mjs` with the local review server running. Logs are
separate under `logs/`. These are local results; remote CI has not run. No visual regression
baseline files were regenerated. Review fixtures live here rather than in the regression corpus.
See `TEST_RESULTS.md` for the 65 player assertions and corrected 25-gate run; `FAILURE_RESOLUTION.md`
explains the five diagnosed failures and the two exact corpus transitions restoring lost quiz content.
