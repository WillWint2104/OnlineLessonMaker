# Mathematics M2 calculator review

Draft implementation for visual and functional approval. Do not merge or deploy before approval.

Open `index.html` for original-resolution captures and the actual browser recording. The four learner links run independently from file URLs, with calculator fonts and code embedded. Open `../../../lesson-studio.html` for authoring and import a lesson's `lesson.json` using JSON. The author can disable the calculator under Mathematics tools. No server or remote calculator dependency is needed; existing teacher videos and other remote lesson content still need their external hosts.

The supplied completed calculator is reused through a deterministic component extraction, not an iframe or a replacement engine. See `IMPLEMENTATION-AUDIT.md` and `../../../assets/vendor/hgl-calculator/PROVENANCE.json`. Run `node scripts/build-calculator.mjs` from the repository root to reproduce the embedded component.

Runtime state lives only in the current lesson session. History, variables, expression, preferences and mode data survive close/reopen and lesson navigation. Every open lands on Home/Basic and resets expansion and transient panels. Refresh or a new lesson identity resets calculator state. Authored JSON stores availability only. Escape first dismisses an active subpanel without clearing input; without a panel, Calculate clears the expression and stays open. Unhandled Escape closes the utility. Close returns focus to the launcher. The outer close/expand bar stays accessible while the instrument scrolls. F11 expansion and Ctrl/Cmd+L Home remain calculator shortcuts.

Eight supplied modes are exercised: Calculate, Statistics, Distribution, Table, Complex, Vector, Spreadsheet and Inequality. Advanced is a source placeholder, not a second supported keypad. Intrinsic Table and Inequality output is retained; M3 sketch response is not introduced.

Closed lesson content, artwork, answer policy and navigation are frozen. Supabase remains deferred. No merge or deployment is part of this delivery.

`historical/focused-results.json` identifies the pre-commit capture checkpoint explicitly. The upload ZIP will contain the final clean-head full-suite records in `verification/`; read those for the final verification state. Initial-load and first-open timings are informational end-to-end Playwright timings, including JSON entry/interaction, not isolated performance benchmarks. The calculator initializes only when opened. Its three fonts add 92,588 raw bytes; embedded code/fonts/shell add approximately 518 kB to the authoring application. Publication sizes are recorded per lesson; older factorising/straight-lines exports also gain the current frozen renderer.
