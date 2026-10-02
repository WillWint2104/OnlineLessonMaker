# Authoring coverage

Bulk writing, initial IDs, seven example collections/members, initial graphs/tables/questions and official curriculum records/provenance were prepared in supported JSON. No graphical-authoring claim is made for that preparation.

`scripts/verify-production-lessons.mjs --author --publish` imported that draft and used actual visible inspector controls for these operations. Runtime evaluation was used only to navigate/read state for the workflow; separate defensive fixtures are explicitly labelled in the script.

| Operation | Actual graphical evidence |
| --- | --- |
| Front matter | Edited overview description and an existing learning intention. |
| Curriculum | Edited a reviewed mapping note through the mapping form; publisher/version/code/provenance initially JSON-authored. |
| Skills | Added a temporary skill, moved it earlier, removed it; edited the first quick introduction. |
| Worked examples | Added a temporary collection member, moved it earlier, removed it; edited a real paired working/explanation row. Stable production example IDs survived. |
| Table | Edited the rule-to-graph instructional table label and a value. |
| Graph | Edited graph-domain bounds, function expression and curve label. After visual review, the existing delete/add segment controls replaced the unrestricted functions in the two closed-domain examples. No new functionality. |
| Questions | Edited a guided-practice subpart. |
| Preview/export/reopen | Previewed, downloaded JSON, imported it again and edited the table label a second time. Exported learner HTML through the application's Export control. |

The final-graph-inspector screenshot shows the existing segment form after the domain correction. Authoring filenames are reserved for captures from actual editing operations and export/reopen, and plain validation runs never overwrite them. The final canonical JSON and learner HTML contain the corrected segments; the clearly labelled authoring exercise illustrates edits to a temporary imported copy.

The initial authoring receipt was recorded against `34ce29d` before the curriculum commit; the original final-content results were recorded against `b9e6f5c`. These heads describe different evidence sessions, not conflicting claims about one checkout. The retained initial receipt is named `initial-authoring-receipt.json`. The refreshed `authoring-receipt.json` records the later exercise-only run and its source/script hashes. That exercise exports its temporary edits, then returns to the unchanged canonical lessons for final-content checks.

Visual review also found that a six-column table inside a paired step inherited row styling and wrapped its cells awkwardly. The table was moved, in supported JSON, to the example's existing supporting-evidence area beside the graph, then reopened in the same table editor. This uses the current composition rather than adding application code; nested wide tables remain an authoring limitation outside this lesson's final content.

The requirement to demonstrate the workflow was met with representative edits and temporary add/reorder operations. Those temporary objects were removed, so the classroom lesson has only its intended three skills and seven examples. This is not a claim that every field was authored through the UI. Extended provenance fields are supported JSON data retained on round-trip, with essential publisher/version/source/mapping facts also present in the existing visible fields.

No application changes: `lesson-studio.html` remains byte-identical to `34ce29d` (SHA-256 `8d7dd772886c05e083c76bb5477ea903cb03f013449535c765af92176ab95a0e`). Lesson preparation and authoring use the same player, figure, table and response components as Factorising.
