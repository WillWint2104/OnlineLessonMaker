# Verification provenance

The full 42-gate pipeline passed at implementation commit `a938d6ab9f5b64f0baab714bb431c2e2afe0787b`, with application SHA-256 `d5191018463f3c8ac7492f46c3fb9365e57f12511f22385502559ba88aa6c05e`. `full-results.json`, `full-run-info.json` and `full-logs/` are its original receipts.

A subsequent accepted-import-ID test exposed a colon delimiter assumption in the direct worked-example → practice link. Commit `1949e03f299ff7a3958781f64621fd0c2cf5ee4e` passes activity and example identity in separate escaped attributes, preserving authored IDs. Its application SHA-256 is `adf27b6f0af9106cb3b43cab720f4e1a51b8747f76890a17359d0b7614ed3fb6`.

The 16 affected gates rerun on that commit cover validation, Mathematics M1, lesson journey/native zoom, shared player/surfaces, graphical authoring/publication, selection/reveal, annotated solutions/native zoom, worked collections/native zoom, production lessons, response storage and corpus identity. Their original receipts are `postfix-results.json`, `postfix-run-info.json` and `postfix-logs/`.

CodeRabbit identified three additional edge cases: empty linked archetypes at publication, a missing tab-label fallback, and stale links after switching collections. Commit `54ddb1dc8e49efa922969bb1d52bb8a6646b64c0` fixes all three and adds browser checks in both actual lessons. Its application SHA-256 is `cf46142acf8ee64e225c9405db39d22d9acc19921e67c172e4bcf8bb6ff8fa6b`. The 16 affected gates passed again; their receipts are `review-fixes-results.json`, `review-fixes-run-info.json` and `review-fixes-logs/`.

The gallery's `../results.json` and captures come from this final implementation and identify its application bytes. Canonical learner files were regenerated through the application's Export action after the review fixes. These implementation commits are provenance checkpoints inside the eventual squash merge; final exact-head, review, deployment and post-merge records are separate receipts when supplied with the ZIP.
