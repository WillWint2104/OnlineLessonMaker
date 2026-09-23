# Graphical authoring boundary at 0c3a8e1

The new player has a limited activity inspector. The established detailed mathematics editor
remains available for its existing standalone page types; it is not integrated into nested activities.

| Operation | New activity-player UI | Evidence and limitation |
| --- | --- | --- |
| Create a lesson | New activity lesson creates one initial skill and explanation | Existing 61-check walkthrough |
| Add another skill | **Not exposed in the visible UI** | Targeted packaging check found zero `[data-ptype="skill"]` elements after importing factorising and entering Edit. The earlier guide's claim that the existing palette supplies this is incorrect for this flow. Add via JSON. |
| Edit/reorder existing skills | Skill title and earlier/later buttons | Inspector source; actual skill reorder covered by walkthrough |
| Add/edit/reorder activities | Add explanation activity; title, introduction, earlier/later buttons | Actual create/edit/reorder covered by walkthrough. No generic activity-type picker or activity-delete control. |
| Notes/source text | Add/remove concepts; edit heading and text/attribution | Nested repeat controls; actual concept body edit covered by walkthrough |
| Questions | Add/remove questions; edit prompt text | Inspector source. Table structure, subparts and richer question content have no new graphical controls. |
| Video URLs | Edit the skill's optional video URL | Inspector source. Supplied factorising skills already have optional-video activities. Adding a URL alone does not create an optional-video activity on a fresh skill. Per-activity video fields are not exposed. Actual provider playback is unverified. |
| Mathematical expressions | Raw notation can be typed into exposed text fields | No structured mathematical-expression editor in this activity inspector. Worked prompt/math/answer fields require JSON. Learner typed-workbook equation entry is a separate feature, not authoring. |
| Worked-example steps | No graphical step/group/example controls inside activities | JSON editing required; the renderer still displays existing steps. |
| Tables/figures | No graphical cell, column, graph or figure controls inside activities | JSON editing required; existing supplied structures are preserved. |
| Export/reopen | JSON download/import and published HTML preserve supplied authored fields and IDs | Existing exact-data comparisons on UI-edited factorising, including all its worked steps/questions/tables. HTML is learner-only. Student responses are session state and are not exported. |

The new factorising round-trip fixture does not contain every supported figure type or a real video URL.
Its successful whole-object equality check establishes preservation of fields actually present, not
exhaustive export coverage of every possible figure/video payload. Legacy mathematical authoring gates
independently cover their own tables/graphs and editing after reopen.

## Existing functionality versus missing integration

`renderInspector` routes activity skills to `lpInspector` and returns. The original `mxOutline`
path remains for supported legacy mathematical pages: worked-example groups, examples, steps,
math inputs, tables and graph/figure editing. Existing `verify-mx-authoring` (54/54) and
`verify-quadratics-authoring` (30/30) logs passed; the latter rebuilds seven examples and nineteen
steps, exports, reopens and edits again. These checks support continued operation of that legacy path.

There is no evidence here that the legacy editor was removed or regressed on those tested pages.
There **is** a functional shortfall in the delivered new workflow: moving equivalent content into
activities makes detailed graphical editing unavailable, and adding skills is not reachable.
Classify these as missing new-player authoring integration, not as completed functionality or a
generic statement that mathematical authoring is JSON-only. Unsupported richer lesson structures
cannot simply be inserted as legacy standalone pages: activity-lesson validation allows skill pages only.

The Add skill control failure is a newly confirmed delivery gap and a correction to the prior report.
It was not covered by the original 61 checks (which tested additional skills through JSON).
No missing controls or application code were changed during packaging.
