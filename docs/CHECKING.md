# Checking themes & progress as we go

Four layers, from automatic to manual. You rarely need all four — the top two catch
most things.

## Layer 1 — CI gate (automatic, blocks merge)
`scripts/validate.mjs` runs on every PR (`validate` workflow). It hard‑fails if the lesson
JSON won't parse or the engine `<script>` isn't valid JavaScript, and warns about
`localStorage` / new third‑party hosts. **Green = nothing is structurally broken.** This is
the gate auto‑merge waits on.

## Layer 2 — Screenshot artifact (automatic, visual, does NOT block)
The `screenshots` workflow renders the app across **all themes × key slides** on every PR
and uploads the PNGs. To review: open the PR → **Checks/Actions** → the *Screenshots* run →
**Artifacts** → download `screenshots` → flip through `…/<theme>/…`. Because the CI runner
has internet, these show **real fonts and 3D** — higher fidelity than a local offline run.

Default coverage: `neutral, egypt, rome, wellbeing, ww1` × slides `cover, outcomes,
artifact, notes, source‑6B, complete`. Change with env vars, e.g.
`THEMES=egypt,ww1 SLIDES=0,1,9 node scripts/shots.mjs`.

## Layer 3 — Cloudflare preview deployment (automatic, the real thing)
With the Pages **Git integration** connected, every PR/branch gets its own **preview URL**.
Open it to use the actual app in a real browser — ideally **on the school network**, which
is the only place that truly answers "will it transmit to students?" (fonts, 3D, embeds,
firewall). Merge only deploys to production after this looks right.

## Layer 4 — This chat (on demand)
When we change something here, I render the affected themes/slides and show them inline
before you ever open a PR. Use this for fast iteration on look‑and‑feel; use Layers 1–3 to
confirm on the real stack.

---

## What "the theme looks right" means — per‑theme eyeball list
For each theme, check on the **artifact** and **outcomes** slides plus **Present** mode:

- **Accent** colour is the theme's (Egypt terracotta · Rome crimson · Wellbeing green ·
  WW1 poppy) on eyebrows, buttons, pills, hotspot dots.
- **Card surface** is the warm/cool paper for that theme — not stark white on a tinted page.
- **Sidebar** text is legible against its background (Egypt = light sidebar/dark text; the
  others = dark sidebar/light text).
- **Display font** loaded (EB Garamond · Cinzel · Fraunces · Oswald). If everything looks
  like one generic serif/sans, fonts didn't load — check the layer (offline run vs CI/preview).
- **Motif** mark shows in the sidebar brand (lotus · laurel · leaf · poppy).
- **Hero gradient** on the cover matches the palette.
- **Contrast** is readable (body text, muted labels, syllabus chips).

## Slice to check after any engine change
Run/skim these slides — they exercise the tricky layout code:
`cover` (fills) · `outcomes` (image‑heavy + syllabus popup) · `artifact`/`external`
(two‑column balance) · `notes` (reveal toggle) · `source‑6B` (image + hotspots, internal
scroll) · `model3d` (sized container) · `complete` (centred). Plus **Present** mode on one
content slide (fills board, click + arrows, no nav bar) and **Edit** mode (text edits stick,
hotspot drag works).

## Cadence
- **Every PR:** Layer 1 must be green; skim Layer 2; open Layer 3 preview if the change is
  visual or touches delivery.
- **Before a lesson goes to a class:** open the Cloudflare **production** URL on the school
  network and click through the whole lesson once.
- **Log it:** add a line to `CHANGELOG.md` so "what changed and was it checked" stays visible.
