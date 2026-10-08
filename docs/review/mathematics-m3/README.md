# M3 Graph Response implementation review

This gallery shows a working implementation in the existing OnlineLessonMaker player and authoring application, based on merged M2 `b992021735afc7d6aa9c913501d9173a38d3a32e`. It is not a prompt, static mock-up or a separate graph-builder application.

Open `index.html` for the original-resolution captures and recording. Open `../../../lesson-studio.html`, use JSON, and import `workflow/graph-response-lesson.json` for the editable verification lesson. Study → Practice provides five graph responses in three release groups. The teacher-only local release preview in Edit/Present can release Set 1 models, then Set 1 working, while later sets stay locked. The control explicitly affects this display only.

`workflow/published-graph-response.html` is an actual independently exported learner file. Its companion JSON deliberately uses autonomous group access for inspecting the model graphs offline. It does not expose teacher release controls. The authored verification JSON retains teacher group policies; publishing that version strips deferred teacher-controlled graph answers.

The implementation provides plot/construct, table+graph, free-sketch and hybrid responses, authored axes/tools, linked rows and points, common compact/expanded state, existing Answer Hub graph presentations, authoring and JSON round-trip. Desktop, 1024px, 390px, actual touch and native 200% zoom are exercised by `scripts/verify-mathematics-graph-ux.mjs`. Parser, hostile input, configuration and publication stripping are checked by `scripts/verify-mathematics-graph.mjs`. Both gates are included in the full player suite.

Read `SCHEMA.md` and `../../../assets/vendor/hgl-graph/AUDIT.md` for data responsibilities and reference reuse. The four supplied mockups are in `references/`; the first covers both the compact page and expanded workspace.

Limitations: session memory only; visual comparison without automatic marking; no graph formula solver or full teacher graph-builder UI; no remote release/Supabase deployment; no M1/M2 redesign. Teacher video setup, tablet question-reference work and curriculum expansion remain outside M3. Embedded assets work offline; links to external sites do not imply offline availability.

Captured screenshots are real browser states. Some are intentionally scrolled to show the response or inspector; a cropped header is not a navigation reset failure. Final package receipts identify the exact tested head and replace draft-run metadata. M3 must remain unmerged until visual/functional approval.

Keyboard access: focus a graph and use N/P to select objects, arrows to move selected points, and Delete to remove allowed objects. Exact coordinate fields add/edit points; the optional Exact construction panel creates or edits lines and parabolas without pointer input. Authoring previews use separate response documents and do not modify an existing learner attempt.
