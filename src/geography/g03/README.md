# G03 Notes and Concepts — prototype contract

GEO-G03-001, opt-in layout version 1. Final visual approval is pending.

This is a stateless reading composition, not a player or response widget. It renders inside the existing `type: skill` / `activities` player. Shared lesson title, navigation, focus, progress, response store, answer policy, authoring and publication remain authoritative. There is no independent storage, mount observer, timer, navigation or backend. The host replaces the owned DOM on navigation; image-error listeners are attached to that DOM only and need no global disposal. Repeated rendering does not modify content. Resize is CSS reflow and does not change authored data. Host response reset remains unchanged.

## Authored JSON

Existing activity fields: unique stable `id`, `title`, optional `lede`, ordered `notes` explanation records (`body`, optional `term`/`title`, supported attribution and provenance), optional shared `questions`. The shared skill ID and activity/question IDs remain unchanged and own response identity. No interpretation of page index as an answer ID is introduced.

Minimum additive activity fields, accepted only when explicitly selected:

- `layout: "geography-notes"` — selects G03. Old activities keep their existing rendering.
- `keyNotes: string[]` — ordered essential notes; aim for two or three, not a hard-coded number of boxes.
- Optional `image` — the existing structured image shape: `src`, `alt`, optional `caption`, `source`, `sourceUrl`, `rights`. Shared `lpImageSource` URL policy applies. Authored text is escaped, not executed. The inspector and existing JSON/export paths retain supported extra metadata. No automatic unknown-field stripping or legacy migration is added.

The shared activity schema already rejects unsupported activity-level keys; G03 preserves that policy and adds only these three fields. It does not make all unknown keys newly valid. Supported nested provenance is preserved through the actual JSON and learner export paths.

One optional visual occupies one reading position; an absent visual creates no empty placeholder. A failed visual displays its alternative description, keeping the explanation and notes usable. Publication requires safe image URLs and meaningful alt text. Source credits link through the existing safe URL gate. Images embedded as data URLs in the review fixtures work offline; arbitrary remote assets are not certified as packaged offline.

Optional understanding checks use existing question capabilities and the shared response workspace. Neither fixture inserts one automatically. No new question type or marking behaviour is implemented.

## Build and review

`node scripts/build-geography-g03.mjs` embeds this source into the existing single-file player. The bounded integration owner maintains the minimal central dispatch, field validation, publication preflight and inspector hooks. Running the build twice must be byte-idempotent.

`node tests/widgets/geography-g03/verify.mjs` exercises the real editor, exported learner files, offline reopening, responsive layouts, native browser zoom, validation and keyboard navigation. Set `G03_OUT` to a dedicated evidence directory. Existing shared-player/Mathematics regression gates supplement this focused check.

Then run `node tests/widgets/geography-g03/integration.mjs` with the same `G03_OUT`. It adds 1280px and text-only 1024px evidence, optional workbook response persistence across navigation/resize, image-failure provenance, and actual optional-question learner exports under hidden/teacher/end/autonomous policies. End-of-lesson keys remain embedded for authorised offline reveal; hidden and teacher-withheld keys are removed. The packager requires both reports at the same exact clean head and successful shared regressions. Final integration evidence also includes the existing Mathematics C1–C4C-2 and production-acceptance verifiers.

Explanation headings/bodies use shared safe prose formatting and complete bare-power superscripts (integers, signed integers or `n`, for example `km^2` or `10^12`). Valid authored `$...$` expressions delegate to the existing mathematical renderer, including canonical fractions; dates and currency stay prose. Ambiguous numeric-word products can use an explicit multiplication operator. This local routing does not change canonical JSON or the mathematics engine. Formal mathematics in shared questions/worked examples keeps its established renderer. If an author adds shared worked examples or an activity video, G03 delegates those fields to the ordinary skill renderer with the same IDs; it does not silently discard accepted content or introduce another renderer. The canonical two-concept fixtures do not acquire extra examples/video. G03 content typography does not override the shared navigation font.

Packaging reads the established full-player gate identities and additionally requires the ten Mathematics integration/acceptance gates in `gate-evidence.mjs`. Set `PLAYER_REVIEW_DIR` and `G03_MATH_REVIEW_DIR` to those exact-head runs. Empty, omitted, duplicate, failed or mismatched evidence is rejected before output creation. Source files are copied from the recorded Git tree, never from untracked neighbours. Run `node --test tests/widgets/geography-g03/gate-evidence.test.mjs` and, after full evidence exists, `package-regressions.mjs` with a fresh `G03_PACKAGE_TEST_DIR` to verify these negative cases and tracked-only source packaging.

The directly read Year 9 fixture is hashed from the same buffer that is parsed. Packaging checks that hash against the fixture blob at the tested head and rejects a mismatch before creating output. The real packaging regression includes this mismatch case.

No new G06, presentation consumer, map engine, general registry or theme-token framework is included.

Both verifiers require fresh output directories and preserve earlier review evidence. Reports start incomplete and only become complete after successful checks. Packaging rejects incomplete/error-bearing reports and empty, missing, absolute, directory or out-of-root capture paths before creating output; capture containment uses resolved filesystem paths.
