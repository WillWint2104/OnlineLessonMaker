## What changed

<!-- One or two lines. Link the roadmap item / priority if relevant. -->

## Checks (see docs/CHECKING.md)

- [ ] `validate` is green (`node scripts/validate.mjs` — no ✗; this is the gate auto-merge waits on)
- [ ] Skimmed the **screenshots** artifact (PR → Checks/Actions → *Screenshots* → Artifacts)
- [ ] Opened the **Cloudflare preview** deployment (do this on the school network for any delivery/firewall-affecting change)
- [ ] Themes render cohesively on the affected slides — **Neutral / Egypt / Rome / Wellbeing / WW1** (accent, card surface, sidebar legibility, display font, motif, hero gradient, contrast)
- [ ] Modes still work where touched — **Study / Edit / Present** (edits stick; hotspot drag works; Present fills the board with click + arrow nav and no nav bar)
- [ ] **No new third-party runtime host** (`<script src>` / `<link href>` / `@font-face` URL / iframe) — or it's vendored / served same-origin
- [ ] `esc()` on every new content string interpolated into HTML
- [ ] Still **one file** (`lesson-studio.html`) — no build step / framework / runtime dep added to the app
- [ ] `CHANGELOG.md` updated (and `HANDOFF.md` roadmap if scope changed)
