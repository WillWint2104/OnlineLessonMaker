# Y9-01 review candidate

Complete paper-response lesson, not a publication. Open the generated review gallery and actual `Y9-01-learner.html` in the delivered ZIP; the separate `teacher-guide.html` contains models and criteria. `lesson.json` is the editable authoring candidate, with teacher answers. Do not distribute the author JSON or teacher guide to students before attempts.

Use the existing Lesson Studio JSON import to reopen the candidate. The v5 application includes only an explicit Geography evidence activity opt-in and its scoped CSS. Published lessons, assets, Mathematics, History and existing G03 source remain unchanged. The verified base is ec352e01cbb1098b9ce76c01b1b5bfe9bba3366a.

Run from this task's repository checkout:

```powershell
python docs/review/geography-y9-01/check-content.py  # python3 on hosts using that command
$env:NODE_OPTIONS='--use-system-ca'
$env:Y9_OUT='review-delivery/y9-01-new-unique-run'
node docs/review/geography-y9-01/verify.mjs
node scripts/validate.mjs
node scripts/verify-development-foundation.mjs
```

The verifier requires a fresh output directory and obtains the learner HTML through the real application download workflow. It does not build a substitute player. The browser pageerror listener is installed before navigation, including native 200% pages. Native zoom uses Chromium profile preferences, not CSS zoom or deviceScaleFactor.

`author-lesson.mjs` and `review-documents.mjs` prepare this one candidate and its review documents; they are task-local evidence utilities, not a platform generation engine. `prepare-map.py` adapts the genuine ABS JPEG. The review package contains the official downloaded map archive, factual city table, source register and official renderer/item metadata. Complete primary-source web pages are retained internally for verification rather than redistributed; their filenames, source URLs and hashes are recorded in the package. To rerun `check-content.py`, retrieve the dated ABS release into `sources/abs-regional-2023-24.html` and check its recorded SHA-256 first. Before running the content check **or** regenerating the map, obtain `sources/ABS-JPEG-2024.zip` from the retained review package (or the dated official ABS download in `source-register.json`), verify its SHA-256 against the supplied review manifest, and expand it with `python -m zipfile -e docs/review/geography-y9-01/sources/ABS-JPEG-2024.zip docs/review/geography-y9-01/sources/abs-grid`. The content check reads the expanded XML metadata as well as the retained dated ABS HTML. Keep these inputs unchanged; do not silently substitute a later release. These evidence files are not learner runtime dependencies.

The current Answer Hub indexes practice collections. It does not provide a complete model listing for these ordinary Geography paper tasks. The candidate therefore deliberately uses hidden final/worked policies, strips all six answer keys from the actual learner export, and directs students to teacher-led feedback. No new Answer Hub implementation, automatic marking or remote teacher service is claimed. Alternative-policy exports are diagnostic QA material only and are not the candidate to distribute.

The school-adopted curriculum and human pedagogical/visual approval remain outstanding. No formal curriculum mapping, classroom timing validation or publication readiness is asserted. Figma is no longer part of development or review. Design in the real application, capture it, refine from human review and obtain functional/pedagogical/visual approval before merge. Future Dot integrations are opportunities, not dependencies or completed work.

The current delivery checkpoint is lesson review, not an exact-head merge candidate. No PR/CodeRabbit merge clearance is implied by this local content package. Any later merge or publication needs its own authorised repository review workflow and human approval.

Targeted refinement after the v3 review narrows the inquiry to population evidence. The independent core is 60–90 words with one mechanism over eight minutes (2 plan + 5 write + 1 check); the original 113-word model is preserved as an optional extension. Guided writing becomes a three-minute four-point plan, retaining the complete 60-minute budget. The worked table uses supported placement above the reasoning, and source inspection instructions/citations are clearer. Original map bytes, source metadata, statistical values and all six original model prose answers remain preserved.

## v5 direct-application workflow

The obsolete design handoff generator and outputs are omitted from this PR. Their original versions remain in immutable historical review ZIPs; they are not current dependencies or deliverables. No Figma access, plugins or design-context workflow is used.

`layout: "geography-evidence"` is an explicit Geography activity opt-in. It reuses shared tables, worked examples, paper questions and the existing source inspector. Desktop map evidence and its questions share the reading panel; narrower containers stack. Tables occupy the reading region and scroll locally when necessary, retaining 16px text. The larger preview rule is scoped to this layout; global image caps remain unchanged. All accepted v4 lesson data remains unchanged apart from five layout opt-ins and the spatial instruction “below the map” → “for this map”.

Build with `node scripts/build-geography-evidence.mjs`. Run `verify-v5-integrity.mjs` with the same Y9_OUT to verify frozen content, allowed central changes, protected sources and prior evidence. Regenerate actual screenshots/export with `verify.mjs`; review real captures at 1536/1280/1024 and genuine native browser 200%. Existing navigation, focus and source-inspection state remain shared. No pixel-parity claim against a mockup is made.

This is a local visual-review candidate, not merge clearance. Shared-source changes require the normal draft PR, CodeRabbit and human merge approval before integration. No new lesson publication is authorised.


## Historical integrity inputs and optional map tooling

The integrity verifier requires the owner-supplied, checksum-verified v4 review ZIP, not a network dependency or files committed as new production lessons. Extract `geography-y9-01-d4b4ae4-review-v4.zip`, then set `Y9_V4_EVIDENCE` to its extracted payload directory and `Y9_DELIVERY_ROOT` to the folder containing retained historical ZIPs before running `verify-v5-integrity.mjs`. The existing nested review checkout defaults to its adjacent review-delivery folder; other checkout locations should provide these paths explicitly. A missing input produces an actionable setup error. The script compares protected repository content with immutable Git blobs from the named baseline commit, not mutable files from another checkout. Fetch the named historical commits if using a shallow clone.

The independent content checker uses Python 3 standard libraries. Optional map regeneration requires Pillow >= 10.1; `Y9_MAP_FONT` can select an explicit TrueType font, otherwise the tool resolves Arial/DejaVu or Pillow's scalable fallback. The original reviewed map remains committed and unchanged; do not run regeneration to apply this marker correction. Font availability may affect optional regenerated labels across hosts, so regeneration needs its own visual/hash review.

`node docs/review/geography-y9-01/verify-build.mjs` checks CSS insertion, one-time migration, idempotence and survival through font regeneration on disposable copies with the existing font-generator LF input convention. It leaves production fonts and source untouched. The opted-in narrow-container fallback lets all table columns scroll, without a sticky first column or edge fade concealing population values. The browser verifier checks complete numerical text visibility as well as actual live resize overflow.
