# Capture index

All captures use the actual shared renderer. Desktop is 1536 × 960, tablet 1024 × 768, narrow 390 × 844. Native zoom captures use a 1536 × 960 Chromium window at 200%; browser chrome makes its CSS viewport smaller. `-end` captures are scrolled to the answer above the footer, not missing-header defects.

| Capture | State |
| --- | --- |
| [Small table](screenshots/intercept-table-1536.png) | Classroom A / Auto |
| [Classroom selector](screenshots/straight-lines-selector.png) | Edit with manual selector visible |
| [Graph + table](screenshots/rule-table-1536.png) | Classroom B / Auto |
| [Tablet](screenshots/rule-table-1024.png), [end](screenshots/rule-table-1024-end.png) | B stacks at insufficient available width |
| [Narrow](screenshots/rule-table-390.png), [end](screenshots/rule-table-390-end.png) | B in primary → companion → task order |
| [Native 200%](screenshots/native-200.png), [end](screenshots/native-200-end.png) | Actual browser zoom |
| [Qualitative source](screenshots/review-source-1536.png) | Synthetic cross-subject A |
| [Image + data](screenshots/review-image-1536.png) | Synthetic cross-subject B |
| [Edited selector](screenshots/author-selector.png) | Graph/table/task edited in real inspector |
| [Image inspector](screenshots/author-image.png) | Existing image fields connected |
| [Reopened edit](screenshots/reopened-edit.png) | Fresh JSON import and further edit |
| [Legacy Factorising](screenshots/legacy-factorising.png) | No composition field; accepted layout retained |

Selection reasons, graph pixels per unit, stacking rectangles and native zoom measurements are in [focused results](verification/focused-results.json). The full suite's corpus identity comparison uses the verified PR #161 baseline and does not weaken legacy expectations.
