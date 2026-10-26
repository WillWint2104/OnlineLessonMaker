# G03 Notes and Concepts — human visual review

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
