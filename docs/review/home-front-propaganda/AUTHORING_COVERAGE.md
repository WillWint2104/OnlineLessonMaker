# Qualitative lesson: authoring coverage

## CONTENT-ONLY WORK

Three skills and shared front matter; qualitative introductions/notes; two authentic historical images with metadata and alt text; shared Evidence + task compositions; source-analysis/classification/comparison tasks; optional prose models; paper practice and a short argument; bounded verified curriculum mappings; independent learner publication.

The existing two-state example presentation places **Source and task** first and **Model analysis** second. Final writing uses a **Self-check** state instead of a sample answer. No mathematical `math` values, paired solution tables, figures, dashboard or synthetic source are required. Both posters are primary evidence parts: no companion role is asserted merely to fill space.

## APPLICATION CHANGES REQUIRED

**None for this lesson.** `lesson-studio.html` remains byte-identical to PR162 baseline `6c5aea413f0b9c846f8816b7fc0b438ee50dc2aa`. No new renderer, navigation, CSS, theme, runtime host or persistence mechanism.

## Verified controls and retained boundaries

| Operation | Position |
| --- | --- |
| Import and independently preview the classroom JSON | Existing JSON load and Study controls |
| Edit source image, caption, alt text and evidence role | Existing image-part inspector; alt-text edit demonstrated |
| Edit prose model point | Existing step inspector; demonstrated without mathematical working |
| Edit historical question subpart | Existing practice inspector; demonstrated |
| Export JSON and reopen edited content | Actual download/import equality check, including full metadata |
| Publish learner HTML | Actual application export, separate from editable application |
| Structured catalogue/source provenance | JSON fields; preserved, no dedicated History provenance editor |
| Source/model state labels and visible regions | Existing representation inspector; label and visibility edits demonstrated |
| Source links in image captions | Existing plain text only; readable record locator shown, clickable exact links in teacher guide/gallery and full URLs in source metadata |
| Smaller-screen source/task layout | Existing stack, with scrolling and no horizontal overflow; separate paper activities revisit sources through outline |

The review workflow contains a deliberately edited authoring exercise and the untouched canonical round trip/publication. Exercise files are labelled and not substituted for the classroom lesson. See `workflow/results.json` for app/data/script digests and all actual checks. Core tests block remote requests: no claim that videos or remote dependencies work offline. No substantial qualitative blocker was found. Structured provenance editing and plain caption links are visible boundaries, not silently implemented features.

Teacher videos, tablet question references, additional curriculum frameworks and WWII styling remain deferred.
