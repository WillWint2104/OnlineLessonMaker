# M2 floating scientific calculator correction

This supersedes the Home-on-every-open and dark modal presentation from the initial `2fc6458` review. It changes calculator presentation and session entry behavior, not the lesson architecture or the evaluator. PR #168 remains draft for visual and functional approval; no merge or deployment is authorized by this correction.

The medium window is 480px wide and up to 820px high, constrained by the viewport. Complex uses a shorter 520px medium / 540px expanded shell; Distribution uses 580px / 640px. Both expand to at most 760px wide. Other expanded modes use up to 1200px. These are presentation dimensions, always bounded by the viewport. It has one header, a current-mode selector, a pointer drag handle, Expand/Reduce and Close. The body scrolls independently. On narrow screens it uses the available viewport and hides dragging/expansion. A native dialog retains the already accepted modal focus and keyboard boundary; moving it does not resize or rearrange the lesson. Position survives same-lesson reopening and clamps after resizing.

First opening enters Calculate. Selected mode and all source-owned expression, cursor, history, variable, angle and mode datasets survive same-lesson reopening and presentation changes. Close/reopen clears SHIFT, the transient mode chooser and auxiliary panels, and returns to medium size. Refresh or replacement of the lesson object creates a fresh calculator. No runtime state enters lesson JSON or browser storage.

## Audited SHIFT relationships

The 13 nonempty `shiftLbl` definitions in the unchanged authoritative source are used as the single source of the active label and action. The extractor replaces only the mathematical-key rendering block, then the presentation adapter selects the active definition. Execution remains the supplied dispatcher and template/evaluator code. Accessible names describe graphical templates and inverse functions.

| Primary | SHIFT face/action |
| --- | --- |
| square | cube template |
| power | nth-root template |
| square root | cube-root template |
| nth root | base-ten logarithm |
| logarithm with base | power-of-ten template |
| natural logarithm | exponential function |
| sine | inverse sine |
| cosine | inverse cosine |
| tangent | inverse tangent |
| mixed fraction | existing d/c result-format conversion |
| fraction | reciprocal template |
| DMS insertion | existing DMS/decimal result toggle |
| sign change | absolute value |

SHIFT replaces the key face and accessible name. It is amber when armed; keys otherwise keep the same light appearance. Every non-SHIFT keypad input consumes the one-shot layer. A second SHIFT cancels it. Closing or selecting a mode clears it. There is no permanent secondary-label strip.

## Expanded source workspaces

Calculate exposes a larger natural-notation display, the existing recallable/clearable history, D-pad and editing controls, eight supported template insertion buttons, scientific functions and numeric keypad. Home/End move within the same source atom/cursor model. Undo/redo, backspace, sibling-slot navigation and evaluation remain the original implementation. The shared catalog provides additional supported functions/templates; the variable panel retains source memory/variables.

Statistics medium has Data/Results views with readable 16px values and generous rows; expanded retains Data, Results and Tools regions. Its additional keypad edits the selected native data cell, including deletion and cell navigation; calculation still uses the original statistics engine. Table places controls above a height-filling, internally scrolling table. Spreadsheet places its formula bar above a height-filling grid, showing fewer columns with internal scrolling in medium and a prominent Expand control. Vector stacks A/B/C entry cards in medium and presents larger cards side by side when expanded. Inequality stacks coefficient fields and preserves its full-width number line in medium, using wider working space when expanded. Complex and Distribution use compact shells with larger expanded inputs/results. No unsupported controls or second calculator engine are added.

The supplied mockups contain capabilities that the reference does not implement, such as general matrix/unit palettes, hypothesis-test/ANOVA tools and symbolic calculus answers. Those controls are not fabricated. The existing summation/product/integral/derivative templates and their numeric source evaluation are exposed. The source's Advanced placeholder is not presented as a separate learner calculator.

## Evidence

The current gallery leads with paired medium and expanded captures of all eight modes, then shows additional states, Statistics Results, every mode at 1024px and 390px, native 200% zoom, an independent exported learner lesson and non-Mathematics isolation. The short `ux/workflow/calculator-ux-walkthrough.webm` recording and longer automated test recording are separately named. Responsive checks exercise real computed results, reach the last data rows/cells, and confirm state survives presentation changes. Exact-head receipts supplied in the final ZIP identify the source actually tested; pre-commit capture receipts are explicitly historical.

M1.2 page markup, artwork bytes, focal settings, pathways, answers, navigation, Supabase, teacher-video configuration and M3 remain unchanged. The calculator uses local fonts/icons and is embedded in independent publication. That does not promise that unrelated teacher videos or lesson remote resources work offline.
