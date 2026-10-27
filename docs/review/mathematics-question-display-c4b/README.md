# Mathematics C4B — native matching Practice

Bounded Mathematics integration from C4A production `c3354bc5f8114ba4b19beaae00e74881fdeb470b`. Matching is an opt-in Practice response using the existing textbook/micro host, TP_RESP, TPMath/C1, C2 question evidence and existing Answer Hub. There is no new question engine, drag/drop, marking, partial credit, durable persistence or backend service.

## Authored contract V1

```json
{
  "id": "match-equations",
  "stem": "Match each equation to its solution.",
  "matching": {
    "sources": [
      {"id": "equation-one", "label": "1", "text": "$2x=8$"},
      {"id": "equation-two", "label": "2", "text": "$3x=9$"}
    ],
    "targets": [
      {"id": "solution-four", "label": "A", "text": "$x=4$"},
      {"id": "solution-three", "label": "B", "text": "$x=3$"}
    ]
  },
  "matchingAnswer": {"pairs": [
    {"sourceId": "equation-one", "targetId": "solution-four"},
    {"sourceId": "equation-two", "targetId": "solution-three"}
  ]},
  "releaseGroup": "equations-a"
}
```

Each lane has 2–12 nonempty mathematical/plain text items, distinct stable IDs and distinct short plain labels (up to 16 characters). Labels stay with their items on reorder; native selects show those labels while the adjacent bank renders mathematical content. No raw TeX is put into native option labels. IDs own the response, not presentation order or labels. Deliberately renaming an ID changes that identity and updates authored correct references; stale attempt IDs are ignored. During ID typing, a transient duplicate is diagnosed without remapping another item; an already ambiguous imported ID keeps its pair map for explicit repair.

`reuseTargets` is an optional boolean, default false. One-to-one needs at least as many targets as sources. Every source has exactly one authored correct pair; correct targets must be unique unless reuse is explicitly true. Distractors are allowed. Empty and partial learner attempts are valid. Occupied one-to-one targets are disabled with an in-use item label. The change handler also rejects stale/programmatic duplicates and restores the prior selection with an explanation; it never moves another assignment. Clearing is available individually and for the whole question. Completion of matches is not a lesson gate. Matching question IDs cannot reuse any effective workbook ID within their skill, including another activity’s store-normalised generated, explicit or default workspace; Matching audits the host’s normalised page/question namespace across activities and aliased page IDs. Legacy-only question validation and the response store are unchanged.

Definitions accept only id/label/text; matching configuration accepts only sources/targets/reuseTargets, and matchingAnswer accepts only its pair list with sourceId/targetId. Field-specific diagnostics reject missing/duplicate IDs/labels, unknown/dangling/duplicate maps, impossible cardinalities, wrong policy types and response-model conflicts. Malformed drafts stay importable/editable/downloadable; publication preflight blocks them. Edits retain unrelated supported question metadata and extra invalid draft fields for repair. Removing a target leaves a diagnostic until the correct map is repaired; removing a source removes its authored pair only when no remaining source holds the same ID. Correct-pair controls stay disabled until definition errors (such as duplicate IDs) are repaired; invalid maps and draft metadata remain preserved. Per-question authoring reservations also retain unused IDs while edits are unfinished. IDs reserved by another item or still referenced by answer pairs cannot be claimed by another item, and ambiguous/null references never migrate automatically. No silent mathematical migration occurs.

Reuse C2 `visualRefs`, written parts and `answerVisuals` at their existing question/part scopes; matching item definitions do not introduce new visual owners. For longer matching tasks, existing extended presentation gives the compact two-region exercise enough room. Compact presentations stack the target bank above source items when their own container is narrow. Mathematical labels can scroll locally using keyboard-focusable content regions; page width remains bounded. Long source labels wrap within their own column, and longer selected target labels also appear in full below the native selector. Author previews use the actual Practice renderer, not a substitute mock-up.

## State, host integration and V1 lifecycle

TP_RESP gains additive kind `matching`, value `{version:1,pairs:[{sourceId,targetId}]}` under the existing page/question identity. Attempts never carry HTML, authored correct maps or scores. The existing host resets the lesson; Clear changes only the owned matching response. Render/wire mounts native fields, field-local listeners update the host synchronously, CSS resizes without altering state, and host subtree replacement disposes the field/listeners before restoring the same ID pairs. Authoring uses a weak per-question/item identity cache across inspector rebuilds; it is reset when the matching definition is replaced and is never serialised. Learner attempts remain solely in TP_RESP. There are no timers, observers, owned overlays or global keyboard handlers. Native key events stay within the field. No separate expand window is needed.

C4A host changes are bounded dispatch: matching eligibility/model rendering, existing release preview, existing optional global teacher answer-string adapter and mutual exclusion in the choice inspector. The C4A data/selection core and styles are unchanged. Graph, calculator and C1–C3 source blocks remain protected. Existing navigation, paper/Type/pen working and Knowledge Check semantics are preserved.

## Answers and publishing

Correct mappings are separate from item definitions and attempts. The existing Answer Hub shows labelled and mathematical pair models, C1 structured working and C2 answer visuals where authored. Policy eligibility delegates the same existing group-aware gate as C4A. Immediate and end policies work independently for final/working. By explicit prior approval, offline end answers remain embedded and reveal at completion: this is UI gating, not source confidentiality.

Hidden and teacher-withheld mappings, final strings and working are removed from learner instance data, including declared answer fields in nested written parts and relevant answer visuals. Definitions are reconstructed from only their public vocabulary, excluding stray item metadata. Author JSON retains the original content. Group-authorised original data is restored only at exact matching-question paths after legacy global projection; non-matching questions retain their existing path. Publication validates first; private answers belong only in the declared answer fields, never in arbitrary public extension text.

Local release preview does not authorise export. Global teacher strings reuse the existing optional client contract; relock removes access. Global session state cannot unlock independently teacher-withheld groups. Independent remote group release/backend deployment remains deferred, as in C3/C4A.

Class-start payloads also exclude matching final/working strings whose authored policy is hidden, and independent teacher-group strings (the existing class protocol cannot release those groups). This filter ignores author/local preview access. Authorised autonomous/end content remains available, and ungrouped teacher content is sent privately to the existing service for its normal locked/final/worked release. Non-matching payload handling and the service are unchanged. Browser verification starts classes and joins real exported learners against the unchanged handler, with local authentication/storage adapters, checking the uploaded and delivered payloads separately.

## Verification and handoff

```text
node scripts/build-mathematics-matching.mjs
node --test tests/widgets/mathematics-matching/core.test.mjs
node scripts/verify-mathematics-matching.mjs
```

Set `C4B_REVIEW_DIR` to an exclusive folder. The real fixture has six original matching questions (equations, calculations, terminology, equivalent expressions, reusable function classification, supplied C2 function table) plus an unchanged C4A choice. Evidence includes empty/partial/complete/changed/cleared states, source and target reorder, keyboard/pen/touch, native 200%, authoring/add/remove/rename/invalid drafts/JSON round-trip, independent learner exports, all final/working policy combinations, teacher/group boundaries, reset and long mathematics containment.

Primary targets are 1536/1280/1024 and genuine native desktop 200%; browser pen/touch is not physical digitizer, palm-rejection or screen-reader certification. Existing phone compatibility guards remain; there is no smartphone design or visual-polish round. Affected C4A/C1/C2/C3 and full clean exact-head player gates, protected-source checks and CodeRabbit precede final delivery. Exact counts/head/limits belong to the versioned external receipts. Keep the PR draft: ready-for-review arms auto-merge. Stop for human visual/functional approval; no merge, deployment, lesson publication, missing-step fields or C4C.
