# Y9-01 review candidate

Complete paper-response lesson, not a publication. Open the generated review gallery and actual `Y9-01-learner.html` in the delivered ZIP; the separate `teacher-guide.html` contains models and criteria. `lesson.json` is the editable authoring candidate, with teacher answers. Do not distribute the author JSON or teacher guide to students before attempts.

Use the existing Lesson Studio JSON import to reopen the candidate. No runtime, published lesson, Mathematics, G03 or Geography application source changes are included. The verified base is ec352e01cbb1098b9ce76c01b1b5bfe9bba3366a.

Run from this task's repository checkout:

```powershell
& 'C:/Users/willi/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' docs/review/geography-y9-01/check-content.py
$env:PLAYWRIGHT_BROWSERS_PATH='C:\Users\willi\AppData\Local\ms-playwright'
$env:NODE_OPTIONS='--use-system-ca'
$env:Y9_OUT='review-delivery/y9-01-new-unique-run'
node docs/review/geography-y9-01/verify.mjs
node scripts/validate.mjs
node scripts/verify-development-foundation.mjs
```

The verifier requires a fresh output directory and obtains the learner HTML through the real application download workflow. It does not build a substitute player. The browser pageerror listener is installed before navigation, including native 200% pages. Native zoom uses Chromium profile preferences, not CSS zoom or deviceScaleFactor.

`author-lesson.mjs` and `review-documents.mjs` prepare this one candidate and its review documents; they are task-local evidence utilities, not a platform generation engine. `prepare-map.py` adapts the genuine ABS JPEG. For full regeneration, the source package includes the official downloaded JPEG ZIP, expanded original JPEG/XML, retained primary-source HTML and official renderer/item metadata. Source URLs, reference periods and reuse terms are in the source register. Keep these inputs unchanged; do not silently regenerate from a later release. The raw source archive and primary-source snapshots are review evidence, not runtime dependencies.

The current Answer Hub indexes practice collections. It does not provide a complete model listing for these ordinary Geography paper tasks. The candidate therefore deliberately uses hidden final/worked policies, strips all six answer keys from the actual learner export, and directs students to teacher-led feedback. No new Answer Hub implementation, automatic marking or remote teacher service is claimed. Alternative-policy exports are diagnostic QA material only and are not the candidate to distribute.

The school-adopted curriculum and human pedagogical/visual approval remain outstanding. No formal curriculum mapping, classroom timing validation or publication readiness is asserted. Figma editing remains in the separate design chat. Future Dot integrations are opportunities, not dependencies or completed work.

The current delivery checkpoint is lesson review, not an exact-head merge candidate. No PR/CodeRabbit merge clearance is implied by this local content package. Any later merge or publication needs its own authorised repository review workflow and human approval.
