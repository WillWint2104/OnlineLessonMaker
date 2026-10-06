# Mathematics M2 calculator review

Draft implementation for visual and functional approval. Do not merge or deploy before approval.

Open `index.html` for original-resolution captures and the actual browser recording. The four learner links run independently from file URLs, with calculator fonts and code embedded. Open `../../../lesson-studio.html` for authoring and import a lesson's `lesson.json` using JSON. The author can disable the calculator under Mathematics tools. No server or remote calculator dependency is needed; existing teacher videos and other remote lesson content still need their external hosts.

The supplied completed calculator is reused through a deterministic component extraction, not an iframe or a replacement engine. See `IMPLEMENTATION-AUDIT.md`, the current `UX-CORRECTION.md` and `../../../assets/vendor/hgl-calculator/PROVENANCE.json`. Run `node scripts/build-calculator.mjs` from the repository root to reproduce the embedded component.

Runtime state lives only in the current lesson session. History, variables, expression, cursor, angle and mode data survive close/reopen and lesson navigation. First open enters Calculate directly. Later openings retain the selected mode and return to medium size, clearing SHIFT and transient panels/chooser. Expand/Restore preserves the same source state. Refresh or a new lesson identity resets calculator state. Authored JSON stores availability only. Escape first dismisses an active subpanel or mode chooser without clearing input; without a panel, Calculate clears the expression and stays open. Unhandled Escape closes the utility. Close returns focus to the launcher. The one header stays accessible while the body scrolls. F11 expands; Ctrl/Cmd+L toggles the inline mode chooser.

Eight supplied modes are exercised: Calculate, Statistics, Distribution, Table, Complex, Vector, Spreadsheet and Inequality. Advanced is a source placeholder, not a second supported keypad. Intrinsic Table and Inequality output is retained; M3 sketch response is not introduced.

Closed lesson content, artwork, answer policy and navigation are frozen. Supabase remains deferred. No merge or deployment is part of this delivery.

The current gallery links the fresh `ux/` evidence. `historical/` receipts describe earlier checkpoints and do not establish the current verification state. The upload ZIP contains final clean-head full-suite records in `verification/`; read those for the tested head. Earlier load/open timings were informational end-to-end Playwright timings, not isolated performance benchmarks. The calculator initializes only when opened. Its three fonts remain 92,588 raw bytes. Publication sizes and source hashes are recorded in the final receipts.
