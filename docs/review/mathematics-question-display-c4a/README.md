# Mathematics C4A — native choices

Bounded opt-in single-choice and multiple-response questions on existing Mathematics textbook Practice, including micro-lessons. Baseline C3 `5143b6713e135f665a9c3ff01a3f2714be2c0759`. B4 design is approved. No matching, drag/drop, missing-step fields, senior notation, graph/calculator changes, automatic marking, durable state, remote service deployment or lesson publication.

Native radios/checkboxes use whole selectable rows, mathematical text through TPMath/C1 diagnostics, immediate neutral selected state, and an explicit Clear selection control. There is no Submit/Record Response step or completion gate. Existing paper, Type and pen modes retain digital selection as an explicit response while written working stays in the book/workbook. Navigation and re-render retain the same question-owned session attempt. Existing Knowledge Check keeps its original self-check semantics.

## Authored and learner data

```json
{
  "id": "solve-linear",
  "stem": "Solve $3x-2=10$.",
  "choice": {
    "type": "single",
    "options": [
      {"id": "option-a", "text": "$x=3$"},
      {"id": "option-b", "text": "$x=4$"}
    ]
  },
  "choiceAnswer": {"correctOptionIds": ["option-b"]},
  "workedSolution": {"steps": [{"id": "divide", "math": "x=4", "text": "Add 2, then divide by 3."}]},
  "releaseGroup": "foundation-a"
}
```

`multiple` permits a non-empty unique authored set; `single` requires exactly one correct ID. The learner may leave either type unanswered or partially select a multiple-response set. Stable IDs, rather than labels/index positions, own responses. Native option letters are derived from current order. Reordering retains identity; intentionally changing an option ID changes that identity and updates its authored correct reference. Removing a correct option leaves an editable invalid draft until repaired.

Two to twelve non-empty options are supported. Configuration has only `type/options`; each option has only `id/text`; `choiceAnswer` has only `correctOptionIds`. Parallel legacy correctness channels and response models nested in choice parts are diagnosed, not silently interpreted. Existing supported question fields, C1 working, C2 evidence, written parts and unrelated extension metadata retain their current locations and round-trip. A choice response cannot also own a Graph Response. Use C2 attachments for supplied diagrams/graphs.

The existing response store gains additive kind `choice`, with `{version:1, selectedOptionIds:[...]}`. Selected IDs are a learner attempt, never correct IDs or a score. Unsupported/stale selected IDs do not become display selections. No independent storage, event bus, framework, response service or universal question engine is introduced.

## Answer policies and export

Existing Answer Hub renders canonical option answers and C1 working. Choice-group eligibility delegates the existing release helper, so final/worked policies remain independent. Local release preview uses the existing session release map and never grants publication rights. The existing optional global teacher-session string answer contract can carry a derived option-label answer and the existing worked string without changing the service schema; locked/relocked access remains gated. This milestone does not deploy or extend remote group services.

By explicit human clarification, offline `end` answers remain embedded and reveal at completion, as in C1–C3. This is UI gating, not confidentiality against source inspection. Hidden and teacher-withheld answers are removed from exported instance data: correct-ID sets, final strings, canonical/legacy working, nested declared answers and relevant answer visuals. Teacher groups remain withheld even if global fallback is autonomous. Global teacher fallbacks retain their existing authored meaning.

`MathChoices.studentData` owns only opted-in questions and projects them from the original authoring data after legacy global filters. This preserves explicitly allowed choice-group content while independently stripping withheld fields, including nested model metadata. Non-choice questions keep the original C1/C2/C3 projection path. Publication validates first; invalid JSON drafts remain editable/downloadable. Native option IDs remain in options so attempts can refer to them; what is stripped is the secret mapping of IDs to the correct set. Tests inspect embedded learner JSON and actual exported HTML canaries, not merely hidden DOM elements or the presence of static renderer field names.

## Host lifecycle / Widget Contract V1

This is a host adapter to the existing Practice question renderer, not a standalone widget registry. `mxQuestionList` renders, `lpPracticeWire` attaches field-local handlers, CSS resizes, host re-render removes the old subtree/handlers and restores selected IDs from TP_RESP. No component timer/observer/global keyboard handler is added. Native arrow/Space semantics stay within each fieldset; legacy navigation is unchanged. Explicit lesson reset uses the existing response-store reset; no close/expand surface is introduced for a choice item. Answer Hub retains its existing modal lifecycle and focus handling.

## Verification

```text
node scripts/build-mathematics-choices.mjs
node --test tests/widgets/mathematics-choices/core.test.mjs
node scripts/verify-mathematics-choices.mjs
```

Set `C4A_REVIEW_DIR` to an exclusive output folder. The real host gate covers eight original algebra/fraction/root/number/coordinate questions, 4 Foundation + 4 Moderate; unchanged Knowledge Check is covered by the existing full player interactive/pack gates. States include untouched, selected, changed, cleared, partial multiple response, navigation/rerender, final/working, authoring reorder/keys/removal/invalid drafts, JSON round-trip, and independent exported learners.

32 global/group final/worked policy combinations are inspected in the actual application projection, with additional actual autonomous/end/hidden/teacher/group exports and teacher relock tests. Desktop 1536, laptops 1280/1024 and genuine native desktop 200% use actual application captures and containment/row-size measurements. Pen/touch is browser emulation, not physical-device or screen-reader certification. No phone-specific design work; established compatibility gates remain.

Affected C1/C2/C3 gates and the full exact-head player suite run before delivery. Final counts/head/captures/exports and CodeRabbit status belong to the versioned external review receipts, not this static document. Keep the PR draft: ready-for-review arms repository auto-merge. Stop for human visual/functional approval; do not merge, deploy, publish lessons or begin C4B.
