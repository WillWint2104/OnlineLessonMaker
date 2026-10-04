# M1 authoring contract

| Task | Existing workflow with M1 |
| --- | --- |
| Start a Mathematics lesson | New activity lesson starts with one skill; set Subject to Mathematics. Use the two supplied JSON lessons as complete production templates. Add skill remains available. |
| Organise worked examples | Existing `skill.exampleCollections` references example IDs. Edit retains nested member controls, add/reorder/delete and original mathematics editors. Study/Present rail has one collection destination. |
| Connect practice | On a questions activity, Matched practice selects an existing worked collection. `activity.practiceCollectionId` references its stable collection ID. |
| Attach a question | Selected question's Archetype selects an existing example ID; `question.archetypeId` persists it. No title matching. |
| Set level | Selected question's Practice level edits `question.level` (`basic` or `moderate`). |
| Add / duplicate / reorder | Existing Add question and arrows remain; Duplicate question copies content/unknown metadata with a fresh question ID. Counts remain authored. |
| Edit answer | Final answer and optional Worked answer use existing mathematics inputs, stored as text on `question.answer` / `question.workedAnswer`. Publication requires final answers on all linked questions. |
| Paper response | No fake input boxes. Group answers start concealed; the learner deliberately reveals Basic/Moderate together. |
| Images | Overview/Outcomes retain existing fields. Optional completion image uses `meta.completion.image`, the existing upload/source/alt controls and renderer. |
| JSON / preview / publish | Same root lesson format, graphical editor, Study, Export and independent learner HTML. Unknown question metadata survives round trips. |

Practice selection and answer-open state are transient. No new response store or local storage was added. Existing activities without `practiceCollectionId` retain ordinary question rendering. A malformed reference, unknown archetype, unsupported level or non-text answer is rejected; missing final answers block publication. Deleting an example or changing a collection can leave questions needing deliberate reassignment: the validation message exposes this rather than silently deleting authored questions.

One-skill presentation is conditional on Mathematics subject and exactly one skill. Multi-skill and other subject lessons remain supported. Guided/Independent activities remain available for existing lessons; the two new classroom lessons intentionally combine their scaffold and independent practice into one core Practice destination.
