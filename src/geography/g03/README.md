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

No new G06, presentation consumer, map engine, general registry or theme-token framework is included.
