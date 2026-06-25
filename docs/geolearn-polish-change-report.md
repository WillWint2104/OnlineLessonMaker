# GeoLearn Change Report

**Project:** WillWint2104/OnlineLessonMaker · single-file engine `lesson-studio.html`
**Live:** https://willwint2104.github.io/OnlineLessonMaker/ · **base `main`:** `802b622`
**Scope guarantee:** GeoLearn engine only — imperium & microhistory untouched, no lesson JSON changed, self-contained (no new third-party hosts).

---

## PR #37 — Title hero, outro density, consistent text heading
*Patch: `geolearn-polish.patch` — applies cleanly on `802b622`.*

### Key finding (why this kept recurring)
The GeoLearn slide is a **fixed 1280×720 logical canvas** scaled to fit (`#canvasFit` → `.tp-slide` = 720px). So `.gl-main` is **always ~572px tall** regardless of screen size — every slide is designed to fit a 720px stage, and anything taller scrolls inside it. The title was sized to *content* (floated shrunken); the outro's content is simply taller than 720.

### Fixes
| Item | Before | After |
|---|---|---|
| **Title — "shrunken mess"** | `.gl-titlecard` content-height → small card floating with empty margins; `height:100%` doesn't resolve for a flex-column child | `flex:1 1 auto` so the card **fills the 572px canvas** (green panel full-height = hero); text column padding/gap tightened + `overflow-y:auto` so the inquiry + meta cards **no longer clip** (verified: card 575 ≈ main 572, both meta cards visible) |
| **Text notes heading — inconsistent** | studyguide used a one-off header (`gl-sgbadge` pill + `gl-sg-h1` + underline) | now uses the **shared `glHeader`** (icon-mark + uppercase eyebrow + title) — identical to sourceAnalysis/infographic; reveal-notes row preserved |
| **Outro — size-constraint/scroll** | recap stacked 1-col; tall hero rhythm → overflowed the 720 canvas by ~367px | recap is a responsive **2-col grid** (uses the width); crest/stats/title/lede/recap spacing compressed → overflow **367px → ~276px** |

### Verification (rendered in Present mode against the real engine)
- Title: `.gl-titlecard` height 575 ≈ `.gl-main` 572 → fills as a hero; meta cards no longer clipped.
- Text: `.gl-wrap .gl-header` + `.gl-mark` present, eyebrow is `.gl-eyebrow2`, old `.gl-sgbadge` gone → matches other content slides.
- Outro: recap `grid-template-columns` resolves to 2 columns; overflow reduced ~90px.
- No page errors; **no new external hosts** (validate-safe); imperium/microhistory + `buildWorksheet` untouched.

### Deploy
```
git checkout main -- lesson-studio.html
git apply geolearn-polish.patch
git commit -am "GeoLearn: title hero fill + consistent text heading + outro density"
gh workflow run "Deploy to GitHub Pages" --ref main
```

---

## Honest open items
- **Outro still scrolls.** Its content — hero header + 3 stat cards + 4 recap items *with descriptions* + footer — is genuinely taller than the 720px slide (~276px over after compression). Fully removing the scroll needs a **content decision** I shouldn't make blind: either (a) recap as a **titles-only** 2-col checklist (drops the description lines — would fit), or (b) match the approved **mockup's** compact outro. I can implement (a) on request; (b) is best done in **Claude Code desktop** with the mockup file.
- **Text heading icon:** I used the `book` glyph for the icon-mark; if the mockup specifies a different icon, it's a one-word change.
- Carried over: Node 20→24 deploy-workflow warning; `interactives/` chart pages; `SCHEMA.md` for GeoLearn; worksheet pixel-fidelity.

> Same caveat as prior rounds: these are verified structural fixes against the real engine, but the exact hero/heading/outro *design* is judged from your screenshots, not the approved mockups — a fidelity pass with the mockup files (Claude Code desktop) is the way to lock it down.
