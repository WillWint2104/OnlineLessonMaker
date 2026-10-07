# Graph Response data contract

This extends existing questions. It does not replace the lesson format, stable IDs, archetypes, pathways, `answer` strings, `workedAnswer` strings or Answer Hub.

`question.graphResponse` is authored configuration:

```json
{
  "type": "tableGraph",
  "axes": {
    "xMin": -5, "xMax": 5, "yMin": -5, "yMax": 5,
    "xStep": 1, "yStep": 1, "snap": 0.5,
    "aspect": "equal", "xLabel": "x", "yLabel": "y"
  },
  "tools": ["point", "parabola", "move", "delete"],
  "table": {
    "rows": [{"id": "row-0", "x": 0, "y": ""}],
    "editX": false, "editY": true,
    "allowAdd": true, "allowDelete": true,
    "connection": "none"
  }
}
```

Modes: `plotConstruct`, `tableGraph`, `freeSketch`, `hybrid`. Tools: `point`, `line`, `parabola`, `sketch`, `move`, `delete`. A numeric aspect is width/height; `equal` derives aspect from the authored ranges so mathematical units have equal scale. `snap: 0` allows free placement. Exact numeric point input preserves decimals independently of pointer snapping. Tick increments are separate from snapping. Extremely dense grids use the existing renderer's grid cap.

Rows retain IDs. Blank or invalid response cells produce no point. Editable values update linked points immediately. Moving a linked point changes only editable columns. Deleting a row removes its point. `connection: "none"` never supplies a completed curve; authored `segments` joins adjacent valid rows and breaks at invalid/blank rows. A line is completed by dragging two distinct endpoints; a parabola is completed by dragging from its turning point to a point with a different x coordinate. Separate sketch strokes remain separate.

`question.graphAnswer` holds authored model objects and completed rows, plus `showModelGraph`, `showWorkedSolution`, `showTable`, `showComparison` booleans. Model objects support `point` (`x,y`), `line` (`x1,y1,x2,y2`), `parabola` (`h,k,a`), safe `function` (`expr`, optional `domainMin,domainMax`) and imported coordinate `stroke` (`points`). Model graphs are read-only. Explanation text uses the existing `workedAnswer`. Completed table values are authored, not calculated from student responses. Comparison is visual and makes no automatic marking claim.

`question.releaseGroup` is independent of archetype, pathway and answer type. Existing `meta.answerPolicy` gains `groups[groupId] = {final,worked}`, with the same `autonomous`, `end`, `teacher`, `hidden` vocabulary. Absent group policy uses existing whole-lesson policy. Group-specific teacher release is a clearly labelled, session-local preview in the editable application only. It does not broadcast to students. Deferred teacher-group models/tables/working are removed from published learner HTML. An explicitly autonomous review export demonstrates the offline learner Answer Hub separately.

Learner documents use existing `tpRespSet(skillId, questionId, "graph", value)`:

```json
{"version":1,"objects":[],"rows":[],"undo":[],"redo":[]}
```

Compact and expanded interfaces reference this same document. UI tool/selection state and local release state live separately from it. Undo snapshots contain objects and rows, with a 50-action limit. Documents allow up to 100 objects, 60 table rows and 1,000 points per stroke. Navigation retains attempts; refresh or another lesson resets them. Attempts are included in the existing response bundle, never in authored JSON or publication. Duplication assigns a new question ID; row IDs are scoped to that question. Reordering preserves IDs. Import validation checks axes, tools, rows, model expressions/domains and release policies.

The inspector exposes mode, axes/ticks/snap/aspect/labels, tools, editable table values and row operations, model objects and domains, completed model table values, answer flags and release group/policies. JSON remains supported for importing richer authored models.
