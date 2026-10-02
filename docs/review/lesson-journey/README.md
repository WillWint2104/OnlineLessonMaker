# Lesson opening and skill journey

This extends the accepted PR #159 activity player. The worked-example component, example IDs, step content and mathematics font are unchanged. The surrounding lesson pages use the same shell and inspector.

## Data contract

The root remains `{meta, slides}`. Each `slides[]` entry remains a skill with its existing ordered activities. All additions are optional:

- `meta.context`: short year/course text, displayed alongside `meta.subject`.
- `meta.frontMatter`: ordered lesson-level pages. Each has a unique stable `id`, `kind` (`overview` or `outcomes`), optional `title`, `description` and `image: {src, alt}`. Outcomes additionally have ordered `intentions: string[]`. Front matter is not a skill and does not own responses. Omission preserves the old starting point.
- `meta.curriculumMappings`: authored records with `jurisdiction`, `authority`, `curriculum`, `level`, `domain`, `version`, `identifier`, `wording`, `sourceUrl`, `note`, and `status` (`draft`, `demo` or `verified`). The last means **author marked as verified**, never application verification. Jurisdictions are derived from records, with multiple mappings per jurisdiction. No records produces an honest empty panel.
- `skill.description`: optional short description for the opening-page skill summary.
- `activity.introduction`: concise content with optional `title`, `why`, `keyIdea`, ordered `method` strings and a single `illustration`. The activity's existing `lede` holds the short introduction. Content uses the existing inline mathematics capability; no subject-specific rules are introduced.
- `activity.focusPoints`: ordered strings below the existing video player. The existing `optionalVideo` flag and `skill.video.url` are retained. Empty or disallowed optional-video URLs omit that activity in learner mode. Authoring retains the setup slot.

Front-matter and activity arrays determine order. Collections remain a single numbered activity containing their existing authored example tabs. The learner rail counts only visible activities, so a missing video leaves no numbering gap. Back/Next crosses front-matter, skills and collection members using their stable identities. Lesson end acknowledges reaching the end and offers review; it makes no mastery claim.

## Authoring and opening

Open [Lesson Studio](../../../lesson-studio.html), enter Edit → JSON, paste [the classroom JSON](../../../lessons/factorising-quadratics/lesson.json), and Load JSON. Select Overview/Outcomes in the rail, or choose their Edit buttons in the skill inspector. The same inspector supports image upload, URL/alt editing, learning-intention array controls, generic curriculum records, quick-introduction fields and video focus points. Local image files use the existing FileReader embedding mechanism and travel with JSON/export.

Open [the classroom learner lesson](../../../lessons/factorising-quadratics.html) directly, or serve the repository through a static server. Extract an entire review ZIP before opening its gallery to preserve relative paths. Remote images remain dependent on their source while authoring; publication uses the existing asset inliner. Remote videos are not guaranteed to play offline.

Use **Choose image** for local files when opening the app directly. Relative asset URLs require a local web server for export; browser file-access restrictions prevent fetching sibling files from a directly opened HTML page. Publication embeds lesson images and stops with import guidance if a configured image cannot be read, rather than silently dropping it. An empty image slot still publishes the graceful image-less composition.

The classroom image is an original embedded SVG notebook illustration, editable as lesson content. The former detailed notes remain in the original activity data; the concise introduction takes precedence on its learner surface. They are retained in JSON rather than silently discarded. The six worked solutions and optional search panels are unchanged.

## Evidence and limits

`scripts/verify-lesson-journey.mjs` covers the new navigation, shared non-mathematics composition, outcomes editing/reordering, image/alt safety, curriculum records and keyboard focus, video present/absent, JSON save/reopen and standalone export. `scripts/verify-journey-zoom.mjs` checks actual native 100%/200% browser zoom. Both join the coordinated regression suite. Existing worked-example assertions are preserved; activity lookups accommodate the newly authored video order and front-matter traversal.

Demo curriculum records appear only in review fixtures and are visibly labelled. Video review fixtures use a configured URL with network requests blocked to exercise the embed and layout; these are **not teacher-selected videos and not proof of playback**. The classroom's two video URLs remain empty. No duration, progress or transcript is fabricated.

Authentic curriculum population, teacher-video selection/playback, tablet question references and curriculum equivalence remain separate work. Technical merge does not imply final teacher acceptance.
