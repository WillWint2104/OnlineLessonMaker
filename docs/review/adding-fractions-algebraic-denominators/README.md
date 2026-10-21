# Adding Fractions With Algebraic Denominators — review

Open `index.html` for the real application gallery, `learner.html` for the actual independent learner export, and `lesson.json` for the corrected editable lesson. `authoring-roundtrip.json` is the JSON downloaded and reopened through the existing authoring UI. `results.json` records the actual source HEAD, checks, capture list, native zoom metrics, errors and limits. A failed run is explicitly labelled incomplete and is not packaged.

The source is the supplied `adding-fractions-algebraic-denominators-micro.json`. Its transcript/walkthrough provenance is supplied by the author and was not independently reproduced. The original download is unchanged. The authorised repository copy removes unsupported LCM notation, aligns the second tab label, removes the redundant `a=a` row and revises only the simplify-result question family. All 36 question IDs remain stable. Fixed author-time parameters keep each of those twelve starting fractions individually reduced while requiring reduction after combining. The representative video example remains unchanged mathematically.

The three skills retain 8 Foundation + 4 Moderate questions each. The lesson uses the existing `mathematics/algebra/general` pack; no new artwork, renderer, navigation, answer architecture or production lesson is introduced. External YouTube playback requires network access and is blocked in automated captures. No curriculum mappings or remote teacher service are claimed.

The ZIP contains local assets required by the learner export. Open the gallery/export directly, or run `python -m http.server 8099` from the extracted directory. Use the existing Lesson Studio JSON importer with `lesson.json` to edit the lesson. The archive does not include a second authoring application.

## Reusable review command

From the repository root, with its Node/Playwright dependencies installed and Python 3 available:

```powershell
node scripts/review-mathematics-lesson.mjs docs/review/adding-fractions-algebraic-denominators/lesson.json
```

The runner accepts another Mathematics JSON path. It discovers actual front pages, activities, collection members and completion using the real application. Optional adjacent `EXPECTATIONS.json` supplies lesson-specific acceptance criteria without hard-coding them in the runner. Use `--out`, `--zip` and `--expect` to override locations. `--widths 1536 --no-native --no-package` is a smaller tool-validation run, not full responsive acceptance. `--require-clean` rejects dirty tracked source. Set `PYTHON` to a Python executable if `python` is not on PATH.

Generation is never performed by the reviewer or learner. Numerical checking covers supported explicit mathematical equalities; it is not a general symbolic proof system. The reported numerical comparison count and skipped-question count define its coverage. Viewport screenshots deliberately show the actual viewport; grid captures are scrolled to the populated practice and long mobile grids require vertical scrolling. Native 200% uses real Chromium browser zoom with its error listener registered before navigation.

Archive extraction, static local links and the SHA-256 manifest are checked by `scripts/package-mathematics-lesson.py`; a companion `.zip.receipt.json` records the resulting archive hash. Review artifacts are local evidence. Do not merge or deploy; stop for visual/pedagogical approval.
