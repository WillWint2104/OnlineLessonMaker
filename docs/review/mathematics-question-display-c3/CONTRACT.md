# C3 host compatibility notes

No new authored graph schema or learner document version. Stable skill/activity/question IDs, `graphResponse`, `graphAnswer`, optional `releaseGroup`, Graph Response V1 objects/rows/history, C2 `visualRefs`/`answerVisuals` and C1 `workedSolution.steps` retain their established meanings. Legacy `question.figure` is not reinterpreted.

| Existing data | C3 integration |
| --- | --- |
| Stem/instructions/parts | Readable in compact and expanded context. Written parts/answers use existing labels and paper/workbook routes. |
| Skill visual definitions + question/part refs | Resolve in graph context through C2, with stable descriptions and safe assets. Figure Engine and Graph Response object vocabularies remain separate. |
| Canonical structured working | Supported on textbook graph questions/parts under the same C1 validation, paired rendering and alignment rules. Legacy working remains supported; conflicts remain publication-blocking. |
| Graph model/table/comparison | Existing read-only specialist presentation; optional comparison never marks or mutates a response. |
| Final/worked/group policies | Effective graph permission controls all associated answer surfaces. C2's internal answer-render call accepts an already resolved graph permission; ordinary callers retain their whole-lesson policy. |
| Learner publication | Strips withheld working (canonical and legacy), scalar/part answers, completed C2 answer references, models and graph table values according to existing policies. Local teacher preview state is not exported. |
| Initial response and lifetime | Objects start empty; initial rows come only from authored response configuration. Compact/expanded/resize/navigation share mathematical coordinates and undo/redo. Reload/reimport retain documented session-reset semantics; no browser storage. |

The authoring inspector retains its existing graph mode, axes/tools, C1 working editor, C2 visual selection and part editor. Import/edit/export/reopen preserves these fields without a universal `response.type` migration. Given evidence stays outside the response store. Model content stays outside untouched learner surfaces, even when answers are available elsewhere.

Disposal uses the existing graph view lifecycle; expanded close destroys its mounted graph view, removes the dialog, repaints the compact view and restores opener focus. The header context control operates only within that dialog. No document-wide key handler or new widget registry is added.

Limitations remain deliberate: session-only state; no automatic marking, new student function entry, equation/graph combined document, inequality-region solver, constrained geometry tools, persistent saving or remote class deployment. Browser evidence is not physical-device or screen-reader certification.
