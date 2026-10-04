# Mathematics M1 review

Open `index.html` for the gallery. The two learner lessons are linked there, alongside their editable JSON. Screenshots are original-resolution captures from the functioning application; browser tests generate them, then the static gallery lists them. The edited demonstration JSON contains a duplicated question and changed level and is authoring evidence, not either canonical classroom lesson. Test-generated demonstration HTML stays in the local verification run; the gallery links the two canonical published lessons directly.

To edit: open the packaged/repository-root `lesson-studio.html`, choose Edit, open JSON, paste a canonical lesson JSON, and load it. Navigate to Practice, choose a question in the inspector, and use Matched practice to edit its archetype, Basic/Moderate level, final answer and optional worked answer. Existing arrows reorder questions; Add question and Duplicate question preserve the flat question structure. Study previews the learner version; Export produces its independent HTML.

The preferred Mathematics production convention is one discrete skill and one teacher video per lesson. The engine still accepts multi-skill lessons. A single Mathematics skill suppresses repeated skill counts and the redundant Overview skill list. Existing non-Mathematics presentation is retained.

## Content decisions

The source is the actual teacher-authored `expanding-brackets-lesson.json`, retained unchanged at `../../lessons/expanding/source-combined.json`. Its two skills were split with original skill, activity, collection, example and step IDs. Worked examples are retained exactly. Guided practice is now scaffolding inside Practice: its matching independent question retains its original question ID and substeps. Each lesson has 18 independent problems; substeps do not inflate that count. Basic repeats the model closely; Moderate increases coefficient/sign arithmetic within the same distribution method. No enrichment or unmodelled question type was introduced.

Three worked archetypes link to Practice through stable example IDs. Questions remain in the existing flat array. Answer reveal is deliberate and grouped by level, using keyboard-accessible native details. Each retained scaffold question has a checked optional worked answer inside its answer group; worked answers are not required on every question. Counts are authored and are not enforced as an engine restriction.

The Overview/Outcomes image system is retained. Audit found no completion-image slot in the activity player, so M1 adds optional `meta.completion.image` through the same image renderer, upload editor and export embedding. The included SVG algebra illustrations are authored decorative assets; they are not curriculum evidence.

## Verification and limits

`results.json` records the focused tests and application SHA-256. Captures include desktop, tablet, narrow and genuine native Chromium 200% zoom. Tests independently evaluate all worked and practice final polynomials at six distinct values, then check import, graphical edits, JSON export/reopen and independent publication. Existing full regression receipts are under `verification/` when available.

Published lesson HTML opens directly from disk with embedded lesson data, fonts and illustrations. For ordinary repository asset paths, serve the repository/ZIP root with a local web server; for example `python -m http.server 8138`, then open `http://127.0.0.1:8138/docs/review/mathematics-m1/index.html`. Editing from disk works with the included embedded images. Remote images must be accessible during export or imported through Choose image.

The two supplied YouTube URLs are authored on their respective real Video pages. Automated checks block external requests and verify the authored video surface and navigation; they do **not** establish YouTube playback, school-firewall access or offline remote-video availability. These still require real-network inspection. No official curriculum-alignment expansion, physical tablet certification, formal assistive-technology certification, calculator integration or graph-sketch integration is claimed. M2 and M3 are stopped pending user review of M1.
