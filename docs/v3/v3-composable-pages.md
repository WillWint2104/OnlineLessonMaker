# v3 — Composable Pages & Object Interactivity
## The migration from "block = page" to the model we actually specced

*Grounded in the engine at `main` (1.42MB). Every claim below verified against the code, not the spec.*

---

## 1. What the research actually said

Two models, both named as core steals:

**Articulate Rise — block-based authoring.** A lesson page is a **stack of blocks**: text, then an image, then an accordion, then a knowledge check, then a labelled graphic. Blocks are *components on a page*, not pages.

**Genially — interactivity as an attribute.** Any element can be made interactive by *declaring* it: hover→tooltip, click→window, click→go-to-page. Interactivity is a **property you attach**, not a block type you choose.

The v2 spec restated both: an auto-layout flow (Layer 3), blocks as registered components (Layer 5), and behaviours as **services blocks opt into** (Layer 6).

---

## 2. What actually got built — verified

**✅ The foundation is real and it is done.**

| Layer | Status | Evidence |
|---|---|---|
| Tokens + cascade | **DONE** | 75 slots × 4 themes, safe override, contrast-partner slots |
| Molecules (partial) | **DONE** | reveal button (13→1), modal wiring unified |
| Width authority | **DONE** | one `--tp-measure` instead of 25 caps |
| Block registry | **DONE** | `REGISTRY[type][theme]`, 60 pairs |
| Maths capability | **DONE** | notation, editor, function-sampling marking |
| **Effects (the Genially primitives)** | **DONE — and this matters** | `data-tp-focus-open` ×29, `[data-tp-overlay]` ×16, `data-tp-reveal` ×4, `tpKeyTerms`, `tpZoomBtn` — all **already shared** |

**❌ The model is wrong.**

```js
function renderPackSlide(s,i,present){
  const fn = REGISTRY[s.type][theme] || packFallback;
  let inner = fn(s,i);                    // ← ONE type. ONE renderer. Whole page.
  return `<div class="tp-slide">${inner}</div>`;
}
```

**One slide = one block.** And every renderer emits its own page chrome — **18 renderers emit `<div class="tp-wrap">`**, i.e. each one *owns the viewport*. There is **no composite concept anywhere** in the engine.

**The smoking gun:** `graphQuestion` has a `working: true` flag that embeds a pen canvas *inside* the block — because we could not put a `penResponse` block next to it on the same page. That flag exists **because composability doesn't.**

---

## 3. The gap, precisely

| What you asked for | Status |
|---|---|
| Core page designs for purposes | ⚠️ Tokens yes; page *types* are humanities-shaped |
| **Add blocks freely to a page** | ❌ **NOT BUILT** — one block per slide |
| **Objects (image/video/button/hotspot/text) as placeable things** | ❌ **NOT BUILT** — they are fields inside fixed block schemas |
| **Per-object interactivity, declared in JSON** | ❌ **NOT BUILT** — but the *effects* exist and are shared (see below) |
| Everything driven by JSON | ✅ yes (within the current model) |

**The good news, and it is substantial:** Genially's three primitives already exist in the engine as **shared, working effects**. They are just *hardcoded per block* instead of *declarable per object*.

| Genially primitive | Already in the engine as |
|---|---|
| Tooltip (hover info) | `tpKeyTerms` → term popups (#93) |
| Window (click → modal) | `data-tp-focus-open` ↔ `[data-tp-overlay]` (#89, #97, 2c-i) |
| Zoom / expand | `tpZoomBtn` + `tpFocusImage` |
| Click-to-reveal | `data-tp-reveal` (2a) |
| Go-to-page (branching) | ❌ not built — and **deliberately out of scope** (spec §14) |

So **object interactivity is a declaration layer over effects that already work.** That is rewiring, not rebuilding.

---

## 4. The migration — three phases, all additive

### **PHASE A — The composable page** *(the keystone; nothing else lands without it)*

**The change is one function:**

```js
function renderPackSlide(s,i,present){
  const theme=...;
  if (Array.isArray(s.blocks)) {                          // NEW: composite slide
    const inner = s.blocks.map((b,k)=>renderFragment(b,i,k,theme)).join('');
    return `<div class="tp-slide"><main class="tp-main">
              <div class="tp-flow">${inner}</div></main></div>`;
  }
  const fn = REGISTRY[s.type][theme] || packFallback;     // LEGACY: unchanged
  return `<div class="tp-slide">${fn(s,i)}</div>`;
}
```

`blocks[]` present → composite. Absent → **the existing path, byte-identical.** Every current lesson keeps working, untouched.

**The work is making renderers emit FRAGMENTS.** Today every renderer wraps itself in `<main class="tp-main"><div class="tp-wrap">` — it owns the page. A fragment renderer emits **only its content**.

Two options, and the second is right:

- ~~Strip the chrome post-hoc~~ — fragile, regex-on-HTML.
- **Registry gains an optional fragment renderer.** `registerBlock(type, theme, pageFn, fragFn)`. Where `fragFn` is absent, the block simply **cannot be composed** (it stays page-only) — so migration is *incremental*, not big-bang.

**Migrate first (the ones a composed page actually needs):** `text`, `labeledGraphic`, `penResponse`, `knowledgeCheck`, `graphQuestion`. Leave `title`/`outro` as page-only — they *should* own the viewport.

**Auto-layout (spec Layer 3) lands here:** `.tp-flow` is a vertical flow with spacing from a token. Blocks stack in order. Collisions become structurally impossible — which is the whole point of the layer we never built.

**Acceptance:** every existing lesson byte-identical (no `blocks[]` → old path); a composite slide with text + labeledGraphic + penResponse renders in order, correctly themed, in all 4 themes.

---

### **PHASE B — Object interactivity** *(mostly rewiring; the effects exist)*

Interactivity becomes a **declaration on any element**, not a property of a block type:

```json
{ "type":"image", "src":"...", 
  "interactions":[
    {"trigger":"click", "effect":"zoom"},
    {"trigger":"click", "effect":"modal", "payload":{"title":"...","body":"..."}}
  ]}
```

The engine already **has** `zoom`, `modal`, `tooltip`, `reveal` as shared effects. Phase B adds:

1. **An interaction resolver** — reads `interactions[]`, emits the right `data-tp-*` attributes onto the element. That is it. The wiring in `wirePack` already picks those attributes up.
2. **Effects registry** — `zoom | modal | tooltip | reveal` as named services (spec Layer 6). New effects register here later.
3. **Go-to-page: explicitly OUT** — the spec excluded branching (§14, "wrong product"). Do not build it.

**This is small.** The hard part (the overlay system, the focus-trap, the id-targeting) was done in #89/#97/2c-i.

---

### **PHASE C — The object palette** *(objects as placeable things)*

Primitive objects that can sit in a flow **and carry interactions**:

`text` · `image` · `video` · `button` · `hotspotImage` · `figure` · `spacer`

Each is a tiny fragment renderer + a schema. They compose into a page (Phase A) and carry interactivity (Phase B). **This is where "add items and give them interactivity" actually becomes true.**

---

## 5. What gets reused vs. rebuilt

**Reused entirely (the expensive half — already done):**
Tokens · molecules · registry · width authority · the maths capability (notation, editor, sampling, misconception) · **all the interaction effects** · the four themes.

**Reworked (bounded):**
The 4 new block renderers (`labeledGraphic`, `timeline`, `penResponse`, `graphQuestion`) each gain a **fragment variant**. The *logic* survives; what changes is that they stop assuming they own the viewport.

**Deleted:**
`graphQuestion.working:true` — once `penResponse` can sit on the same page, the embedded-canvas workaround is dead code.

**Untouched:**
Every existing lesson. Every legacy block. `main` keeps serving Agrippina and Versailles throughout.

---

## 6. Sequencing — and the rule that matters

1. **Phase A** — composable page + auto-layout + fragment renderers for the 5 core blocks.
2. **Phase B** — interaction declarations over the existing effects.
3. **Phase C** — object palette.
4. **THEN author.**

**The rule: no new page-type blocks until Phase A lands.** Every monolithic block added now makes the migration bigger. There are already 4 new + 11 legacy.

**Diagnose-first before Phase A** — the one question that decides everything:
> *Can each of the 5 core renderers emit a fragment (content only, no `<main>`/`<tp-wrap>`) without breaking, and how much of each renderer is chrome vs. content?*

If the chrome is a thin outer wrapper → Phase A is a clean refactor.
If chrome and content are interleaved → the fragment variants are closer to rewrites, and the phase is bigger.

**That is the load-bearing unknown, and it must be answered on file:line evidence before a line of Phase A is written.**

---

## 7. Honest accounting

The v2 delivered a **foundation** (tokens, molecules, registry, themes, maths) that is genuinely excellent and is *exactly what Phase A needs*.

It did **not** deliver the **model** — Rise-style composable pages and Genially-style object interactivity — which is what the research identified and the spec described. The registry pattern worked so well that every phase reused it, and each new block quietly hardened the one-block-per-slide assumption that the spec was meant to remove.

The foundation is not wasted. The model must now be built.
