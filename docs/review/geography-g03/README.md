# G03 Notes and Concepts — human visual review

## Integrated refinement — 2 November 2026

Current-main integration uses `a6f3be437aeff5bc98d045a699d45f25b22cc3d9` and retains the prototype commits. One CSS insertion conflict was resolved by preserving the newer Mathematics choice/matching styles in order and appending G03. All other current-main changes, including PR #185 acceptance corrections, are retained. The final evidence records exact source hashes and tests; earlier prototype receipts remain historical.

Year 9 is the primary target. The refinement narrows and aligns the reading column, reduces the heading/focus footprint, removes the diagram's redundant border and background, and improves the original proportional chart's labels. Authored teaching text, values, note order, IDs and provenance are unchanged. Year 10 HDI is compatibility-only. Colours remain temporary green/teal; no subject-theme architecture is introduced.

The current references are [Urbanisation](https://www.figma.com/design/ys8201ZJcmHG8e4gsnd9RV?node-id=3-2) and [Number and Proportion](https://www.figma.com/design/ys8201ZJcmHG8e4gsnd9RV?node-id=3-56). Figma tools were unavailable and direct file access failed in this session. Actual before/after learner captures are supplied for the separate Figma review workflow. Pixel-level fidelity and final design approval are not claimed. Shared navigation, natural scrolling and the plain text-only reading layout remain intentional.

The integration review includes optional shared-question state/release/export checks, source metadata/fallbacks and the complete existing player regression suite plus Mathematics acceptance verification. All are run against the final clean head identified by the external receipt. This is local application/export verification, not deployment or classroom-service/physical-device certification.

The integrated CodeRabbit review identified five bounded issues: shared explanation notation, accepted worked-example/video retention, typography leaking into shared controls, incomplete gate receipts passing packaging, and untracked source entering packages. Corrections reuse existing formatters/renderers, scope typography to content, require complete exact-head player/Mathematics evidence, and copy source from Git. Dedicated behaviour, negative-gate and real-package tests cover these cases. Intermediate runs interrupted or invalidated during correction are preserved as development evidence, not reused as final acceptance. The final receipt identifies the corrected tested head and actual review outcome.

The subsequent review caught date/currency reinterpretation by the maths formatter and a missing default path in the packaging regression runner. G03 now keeps explanations as safely formatted prose with basic superscripts; shared mathematical questions/examples retain their existing renderer. A valid shared-visual fixture verifies dates/currency through real export/reopening. The test runner uses the packager's established default evidence path. Heavy browser gates are run sequentially for final verification after intermediate local navigation timeouts; failed/interrupted attempts are not final receipts.

Further exact-head feedback covered delimited fractions, complete multi-digit exponents and binding the directly read fixture to Git. Valid delimited maths now reuses the established renderer while prose/currency remains literal; a focused matrix of actual-renderer cases covers mixed amounts/formulae, full exponents, escaped currency and unsafe text. Packaging compares the tested fixture buffer hash with its Git blob; a mismatch calibration must fail before output creation. No shared parser or schema is modified.

Bounded implementation authorised by the user's G03 development request (attachment `94471f0b-a1ee-4571-94af-72f45c1656ed`). Preferred reference is the attached Human Wellbeing mock-up, with the explicit density/diagram/notes refinements. Final visual design is not approved.

Both review lessons use the same `geography-notes` activity composition in the real shared lesson player. Year 10 explains HDI, its three dimensions and the limitations of averages. Year 9 distinguishes urbanisation from urban population growth. Each primary concept has two short explanatory paragraphs, one meaningful original diagram and three key notes. Each lesson includes a second text-only G03 concept to verify reuse, omission of the image slot and Previous/Next navigation. These are review fixtures, not newly published production lessons or complete six-week lesson packages.

The primary layout is heading → introduction/explanation → compact diagram → essential notes → existing shared navigation. Questions remain optional. Supported explanation provenance and the complete authored slide data survive real inspector edits, JSON download/import and standalone learner export/reopening. The extension uses the shared activity contract; see the [local contract](../../../src/geography/g03/README.md).

## Educational sources

- Year 10: [UNDP Human Development Index](https://hdr.undp.org/data-center/human-development-index), checked 26 October 2026. Health uses life expectancy; education uses mean/expected schooling; living standards use GNI per person adjusted for purchasing power. HDI summarises average achievements and is not a complete wellbeing measure.
- Year 9: [UN DESA demographic glossary](https://population.un.org/wup/glossary-demographic-terms) and [UN Statistics Division urban/rural definitions](https://unstats.un.org/unsd/Demographic/sconcerns/densurb/default.htm), checked 26 October 2026. Compare proportions separately from counts and check national definitions. All numbers in the Year 9 diagram and text-only example are explicitly illustrative, not factual observations of a named place or year.
- Diagrams are original explanatory assets created for these fixtures, with source concepts credited; no third-party image is copied. The mock-up's HDI classification scale and decorative Rio photograph are intentionally omitted.

## Design differences to review

The existing shared player's light lesson outline and activity-based progress are retained. The prototype does not recreate the reference's dark sidebar, duplicate top progress rail or nine fixed page-family buttons. This protects shared navigation and avoids implementing the unapproved families. G03's content uses restrained teal, sans-serif type, a compact diagram and a single notes treatment. Natural scrolling may place the final notes below the initial viewport; ending captures show their actual reachability.

No presentation mode has been added. Existing authoring chrome is preserved; exported student files omit it. No published lesson, Mathematics implementation, vendor, CI policy or backend was changed. G06 and Geography research remain unlaunched.

## Verification and evidence

Focused runner: `node tests/widgets/geography-g03/verify.mjs`. Use installed Playwright browsers (`PLAYWRIGHT_BROWSERS_PATH` where needed). It checks both subjects at 1536px, 1024px, 390px and true native 100/200% browser zoom, plus no-image pages, source escaping, safe fallback, inspector ordering, supported-field retention, optional shared checks and keyboard navigation. Physical touch/pen hardware and a remote deployment are not claimed.

Final delivery adds a gallery, both standalone learner files and JSON fixtures, exact-head results, regression logs, source hashes and an integrity-verified ZIP. Generated evidence is in the task-specific `review-delivery` directory, not committed into published `lessons/`. The draft PR receipt supplies exact head and final check status. Stop for human visual approval; no ready, merge or deployment.
