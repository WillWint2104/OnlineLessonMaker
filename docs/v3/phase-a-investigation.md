# Phase A — diagnose-first investigation (composable pages)

*Read-only investigation grounded in `lesson-studio.html` at the PR3b merge (`7ee4ca2`). Every claim is
file:line-cited. This is the evidence base for the Phase A build (v3-a1-composable and downstream).*

> **Headline.** The plan's optimistic read of the chrome question is **correct** — page chrome is a thin
> outer wrapper for the five core blocks, and Present is CSS-only for them. But that is **not** where the
> cost is. The real work is **per-block-instance scoping**: every answerable block keys its DOM ids /
> field ids / overlay ids / runtime answers by *slide index or hardcoded strings*, never per block
> instance. Composites collide before they render. **Markup CLEAN, wiring TANGLED — the scope is the phase.**

---

## 1. Chrome vs content — verdict per block

All in-slide header/footer helpers already return `''` (Phase 2 removed them): `imHead`/`mhHead`/`glHead`
(`:4048`, `:4051`, `:4969`) and `imFoot`/`mhFoot`/`glFoot` (`:4050`, `:4052`, `:4971`). So `packHead()` /
`packFoot()` (`:4054`–`:4055`) emit **nothing**. The whole "chrome" is `<main class="tp-main"><div
class="tp-wrap tp-XXX-wrap">`.

CSS role: `.tp-main{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column}` (`:1668`)
= scroll container + centering (`:1762`); `.tp-wrap{max-width:var(--tp-measure);margin:auto}` (`:1763`) =
width authority. Both outer; content depends on them only for width, which the flow supplies.

| Block | Wrapper (file:line) | Verdict |
|---|---|---|
| penResponse | `<main class="tp-main tp-scrollmain"><div class="tp-wrap tp-ink-wrap">` (`:5654`) | **CLEAN** |
| knowledgeCheck ×3 | `<main class="tp-main"><div class="tp-wrap"><div class="tp-kc-card" data-tp-kc>` (`:4207`, `:4392`, `:5156`) | **CLEAN** |
| labeledGraphic | `<main class="tp-main tp-scrollmain"><div class="tp-wrap tp-lgr-wrap">` (`:5571`) | **CLEAN** |
| graphQuestion | `<main class="tp-main tp-scrollmain"><div class="tp-wrap tp-gq2-wrap" data-tp-gq="${i}">` (`:5770`) | markup **CLEAN**; wiring **TANGLED** (§5) |
| text (packText) | `<main class="tp-main"><article class="tp-doc">…<div class="tp-tgrid">` (`:4437`–`:4448`) | **CLEAN-ish** — outer strippable, but the fragment inherits the `tp-tgrid` prose+polaroid+note+progress grid (`:4440`) |

**Verdict:** thin outer chrome → fragment strip is a clean refactor, not a rewrite. The one wrinkle: a lean
composable `text` block is the right shape, **not** a packText fragment (packText carries the humanities
doc-grid; it stays page-only).

## 2. Present mode

**None of the five branch on `present` to change structure** (0 hits: labeledGraphic / imKnowledge /
mhKnowledge / glKnowledge / penResponse / graphQuestion). packText reads `present` only to gate keyterm
buttons via `tpKeyTerms` (`:4421`–`:4422`) — same DOM. `present` is not passed to `fn(s,i)` (`:5819` calls 2
args); renderers read `document.body.classList.contains('present')`. So for the five, Present is **CSS-only**
(`body.present … .tp-main`, e.g. `:2081`–`:2082`).

→ **Composite Present = the whole `.tp-flow` scaled by existing `.tp-main` CSS — no per-block board
strategy.** (Caveat: mhText / sourceAnalysis / guidedResponse *do* restructure on present at `:4377` /
`:5299` / `:5387`; not in Phase A's set, stay page-only.)

## 3. Width & layout

Width authority = `.tp-wrap → --tp-measure` (1140; `:1763` / `:1855`). In a composite it belongs on the
**flow**: `.tp-flow{max-width:var(--tp-measure);margin:auto;display:flex;flex-direction:column;gap:<token>}`
— reusing the one authority (#92). Fragments drop `tp-wrap` and inherit flow width. Intrinsic blocks already
cope: graphQuestion `.tp-gq2-svg{aspect-ratio:1/1}` inside `.tp-gq2-grid{grid-template-columns:minmax(0,480px)
minmax(260px,1fr)}` collapsing `@820px`; labeledGraphic image `max-width:100%`.

## 4. Registry change — additive

Two touch-points only: `registerBlock` writes `REGISTRY[type][theme]=fn` + `THEME_TYPES` (`:5557`);
`renderPackSlide` reads `REGISTRY[s.type][theme]` (`:5817`). `THEME_TYPES` → one consumer `themeTypes()`
(palette order, `:6591`). `registerBlock(type,theme,pageFn,fragFn?)` is additive **only with a parallel map**
`FRAG[type][theme]=fragFn` — boxing `REGISTRY[type][theme]` into `{page,frag}` would break the legacy
`fn=REGISTRY[s.type][theme]` call and the byte-identical path. Composite branch reads `FRAG[b.type][theme]`;
absent → page-only. No other lookup breaks.

## 5. ★ Wiring / id collisions — CONFIRMED (the load-bearing work)

Field ids are slide-scoped, within-block-indexed, or hardcoded — never per block instance:

- **Hardcoded:** `gr0-ta`/`gr0-model`/`gr0-reveal` (`:5197`, `:6160`, `:6163`), `gp0-ta`/`gp0-model` (`:5372`,
  `:5374`) → duplicate DOM ids across two same-type blocks.
- **Within-block index:** `t0,t1` (`:5215`, `:6083`), `iq0` (`:5247` / `:5469` / `:5515`), `gp'+k` / `q'+k`
  (`:5347`, `:6128`).
- **Slide index:** penResponse `fid='ink'+i` (`:5655`); graphQuestion `data-tp-gq="${i}"` (`:5770`) +
  `gqink${i}` (`:5761`). Two penResponse on slide *i* → same `data-tp-ink`, both wired to `rt.ans['ink'+i]`
  (`:5865`, `:5874`) → shared strokes.
- **knowledgeCheck single-per-slide:** `const kc=root.querySelector('[data-tp-kc]'); if(!kc) return;`
  (`:5956`) — `querySelector`, and the early return skips **all** wiring after it. Two kc → only first wired.
- **graphQuestion reaches back to the SLIDE:** `const idx=+gq.dataset.tpGq; const s=(LESSON.slides&&LESSON.slides[idx])`
  (`:5891`) → in a composite `LESSON.slides[i]` is the composite (`.blocks[]`), not the block → `s.answer`
  undefined → checking silently broken.
- **Overlay ids fixed per renderer:** `ov-zoom-side` (`:4443` / `:4449`), `ov-zoom-lesson/visual/map/still/art`
  (`:4087`–`:4215`), `tpTermModal('ktp'+k…)` (`:4450`) → same id twice, `data-tp-focus-open` opens the first.

**Verdict:** composites break before they start. Phase A's **first** job is a per-block-instance scope: a
block key `bk` (`${i}-${k}`) threaded into every fragment; prefix all ids / `data-tp-field` / `data-tp-gq` /
overlay-ids; graphQuestion reads its **own block**, not `LESSON.slides[i]`; knowledgeCheck → `querySelectorAll`
+ drop the early return. Legacy single-type slides keep current ids (bk absent) → byte-identical.

## 6. Runtime / answers

`tpRT()` → `TP_RUNTIME[cur]` (cur = slide index), `.ans[fid]` (`:5988`; r/w at `:5865` / `:5874` / `:5900` /
`:5906`). `fid` isn't block-unique → multiple answerable blocks write the same `ans{}` key → answer collision.
The `bk`-prefix fix (§5) makes keys unique within the slide; ephemeral semantics unchanged.

## 7. Schema + editor (scope only)

Schema: `{ blocks:[ {type,…}, … ] }`, composite detected by `Array.isArray(s.blocks)`. Editor needs a
block-outline mode: block list (type label + reorder ↑/↓ + delete), an add-block mini-palette appending to
`blocks[]`, and selecting a row opens the block's existing `inspectorForm` rebased `slides.N.field →
slides.N.blocks.K.field` (`getP`/`setP` dot-paths already nest, `:2836`–`:2837`; `setP` needs the parent to
exist, which `blocks[k]` does). Reuse, not rebuild. **Phase A3.**

## 8. Effort + PR shape

- **A1 — keystone + scoping (L).** Composite `renderPackSlide` branch + `.tp-flow` + `FRAG` registry + the
  per-block-instance scope (bk threading, id/fid/overlay prefixing, wirePack block-scoping, kc early-return
  drop, graphQuestion reads own block) + fragments for **text (lean primitive)** and **penResponse** (the
  block that exposes the slide-index collision and proves the fix). Bigger than a chrome strip — scoping is
  the phase.
- **A2 — labeledGraphic + knowledgeCheck + graphQuestion fragments (M–L).**
- **A3 — editor outline UI (M).**

Delete `graphQuestion.working:true` (schema `:5748`, wiring `:5761`) in A2 once penResponse composes beside
it (plan §5 "Deleted").

## Acceptance for Phase A
Every existing lesson byte-identical (no `blocks[]` → old path); a composite slide with text + labeledGraphic
+ penResponse renders in order, correctly themed, in all four themes, **no id collisions, no answer
collisions**. The composite test only passes after A1 lands the `bk` scope.
