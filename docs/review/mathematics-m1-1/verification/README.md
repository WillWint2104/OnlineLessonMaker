# Verification provenance

The full sequential pipeline passed all 45 gates. Original per-gate logs, results and run-info are in full-regression/logs/. They identify implementation commit 3213659fc2b77a53ae99ff748ad7a49631eb9cb3 and application SHA-256 c647a07dd3b6af7d633fa3c8e009af91294d0ca13a6c16313607c66596421582. Later documentation, gallery and deployment-preparation refinements do not change those application bytes.

The policy and question-inspector screenshots additionally use the focused authoring capture run recorded in authoring-captures.json, with the same implementation/app hash and explicit GUI edits. All remaining gallery captures come from the completed full run. Interrupted earlier runs are excluded.

Class-session records exercise the actual handler/frontend with test authentication and persistence adapters. They do not certify real Supabase deployment, SQL migration, JWT integration, school-network availability or load. External YouTube playback is outside blocked-network render checks. Post-merge and exact-head receipts are added separately when available.

CodeRabbit review corrections supersede the initial application captures. Current root screenshots/results come from the focused review-fix run: base HEAD 77116e87f90df6d01a4c44aa7e1aa8770aca551b, application SHA-256 3496342c723f964829986104b8c4b8b0f7af3cf4b26884fc1131c3ede768e2d8. The source corrections were still working changes during those captures; exact-head receipts separately verify the committed correction. Publication rollback deliberately corrupts a second lesson in an isolated scratch copy and confirms both existing HTML files remain byte-identical. The original full regression logs above retain their actual earlier provenance.
