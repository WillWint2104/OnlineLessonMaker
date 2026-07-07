# OnlineLessonMaker v2 — Architecture Specification

*A governing document for the v2 rebuild. Research-informed (Genially, Articulate Rise, H5P, Brilliant/Khan/Duolingo/Labster/Codecademy/DataCamp, Figma/Canva/Gutenberg, WCAG 2.2 / WAI-ARIA APG). Written to be executed in sequence by Claude Code.*

---

## 0. The problem this solves

Recent PRs have been dominated by **colour fixes, repositioning, collision fixes, and visibility fixes** — not features. That is the symptom of an engine where layout, colour, and interactivity are *entangled* and every block re-solves them by hand. This spec replaces per-instance fixing with **structural guarantees**: colour, position, collision, contrast, and accessibility become properties of the *system*, resolved automatically, so they stop being PRs.

**Founding principle:** *Constrain to guarantee.* We do NOT build a free-canvas coordinate editor (Figma's own most-voted complaint is that free positioning constantly hides elements and wastes time). We build a **constrained auto-layout flow** where correct appearance is structurally enforced.

---

## 1. The founding decision: layout-driven, not canvas-driven

**Blocks flow in an auto-layout column. They do not have X/Y coordinates.**

- Position is computed from **order + spacing tokens**, never set per instance.
- Blocks cannot overlap because the layout computes their positions.
- Width is **constrained** (max-width token), so no block runs too wide or too narrow.
- The only place true layering exists is *within* a block (a pin over an image, a callout beside a coin) — and there, interactive controls are kept **out of the overlay zone** (the coin-workbench lesson: controls in a bar *below* the stage, never floating over pins).

This single decision eliminates the collision- and repositioning-PR classes. They become un-representable.

---

## 2. The layer stack

Each layer sits above those below it and communicates only through defined interfaces (encapsulation). A change in one layer must not require changes in another. This is the discipline that stops regressions from propagating.

```
8. VIEW / PANEL layer      — editor surfaces (layers panel, picture bank, properties)
7. ASSET layer             — asset manifest, picture bank, embed/reference policy
6. BEHAVIOUR layer         — interaction services (reveal, hint-ladder, feedback, zoom, tooltip, animation)
5. BLOCK layer             — the block registry; each block declares schema/render/behaviours/tokens/a11y
4. MOLECULE layer          — shared UI pieces (zoom pill, callout, reveal-note, popup, feedback line, focus ring)
3. LAYOUT layer            — auto-layout flow; contained overlays; aspect-ratio boxes
2. ASSET-SOURCE layer      — embed-vs-reference decision, allowlist, lazy-load, fallback contract
1. TOKEN layer             — theme tokens + cascade (theme -> lesson -> block overrides)
0. DOCUMENT layer          — the JSON. Single source of truth. Everything else is a VIEW of it.
```

**Build order is bottom-up and pain-first** (see §12). Tokens and Layout come first because they retire the colour and positioning PRs that hurt most.

---

## 3. Layer 0 — Document (JSON is truth)

- The lesson JSON is the single source of truth. Every panel, preview, and export is a *view* of it.
- This is Gutenberg's model: block data is truth; the editor is a lens. It is why the layered features don't fight — they're all views of one document.
- Import round-trips verbatim (already true in the current engine).
- **Rule:** no UI state lives outside the JSON except transient editor state (selection, panel open/closed). Anything that affects output is in the JSON.

---

## 4. Layer 1 — Tokens (kills colour PRs)

**Three cascading layers, resolved by walking up:**

1. **Theme tokens** — `imperium` / `microhistory` / `geolearn`. Always fully defined. The base.
2. **Lesson overrides** — optional, set once per lesson (`lesson.tokens`).
3. **Block overrides** — optional, set on one block (`block.tokens`).

Resolution for any token: `block override -> lesson override -> theme token`. **Theme-first, customisable on top** — exactly the Genially-style customisation requested, but safe.

**The safety mechanism (this is the important part):** overrides are constrained to **token SLOTS**, never raw hex applied to arbitrary properties. Slots:

- `--surface`, `--surface-2` (backgrounds)
- `--ink`, `--ink-muted`, `--ink-faint` (text)
- `--primary`, `--on-primary` (theme colour + its guaranteed-contrast text colour)
- `--accent` (gold/highlight)
- `--line` (borders)
- `--focus-ring` (WCAG 2.2 SC 2.4.11, min 3:1 contrast — defined ONCE here)
- spacing scale, type scale, radius scale

Because each slot carries its *contrast partner* (`--on-primary` is always readable on `--primary`), **you cannot produce white-on-white.** This is how you get Genially's customisation without Genially's ability to make things invisible. The zoom-button-invisible bug (#96/#97) is impossible when the pill uses `--surface`/`--on-surface` slots.

**Every colour in every block references a slot. No block ever contains a hex value.** That is the rule that ends colour PRs.

---

## 5. Layer 2 — Asset-source (kills the Sketchfab/video-blank class)

Every asset answers three questions, handled uniformly here, not per block:

1. **Embed or reference?**
   - **Embed** (data-URI, self-contained): images, icons, small audio, small 3D (inline-glTF pattern). Bounded — practical ceiling ~8MB per file (proven by the workbench).
   - **Reference** (URL, streamed at runtime): video (ALWAYS — never embed video: a 50MB embed ships to every student and breaks seeking without partial-content support), large 3D, external embeds.
2. **If referenced, is the source allowlisted?** A per-domain allowlist (YouTube, Vimeo, Sketchfab, same-origin `willwint2104.github.io`). `validate.mjs` gets ONE controlled exception path, defined here, not scattered.
3. **What is the fallback if it fails?** **Required** for every referenced asset — a static image + text ("3D unavailable on this network; use the photograph"). Learned the hard way from the workbench sandbox failures.

**This layer also owns:** lazy-loading (load an asset when its block scrolls into view — the H5P performance fix), and aspect-ratio containment (every media block declares an aspect-ratio box; sizes in relative units against a constrained container — never fixed px — the fix for the recurring "media fills the whole frame / controls hidden" bug).

---

## 6. Layer 3 — Layout (kills positioning/collision PRs)

- **Auto-layout column:** blocks stack in JSON order; vertical rhythm from a spacing token (Canva's "40px between blocks" idea; your value, tokenised).
- **Width constraint:** one max-width token governs all blocks (the imperium width work, #89/#92, generalised — no more per-wrapper bumps).
- **Prose measure cap:** long text columns cap at ~75ch (already a convention; now a token).
- **Contained overlays:** within a block, overlays (callouts, pins) live in a positioned container; interactive controls stay OUT of the overlay zone (coin-workbench rule). Overlays follow the APG dialog pattern (§8).
- **Responsive by construction:** relative units, `minmax()` two-column grids that stack on narrow screens (the workbench two-column fix, generalised).

---

## 7. Layer 4 — Molecules (kills "fix it in 3 places" PRs)

Shared UI pieces, each defined ONCE, theme-aware via tokens, reused by every block:

- **Zoom pill** (solid, shadowed, `--surface`/`--on-surface` — visible on any image by construction; #96/#97 made permanent)
- **Callout card** (title, category chip, body, "on the real coin" box)
- **Reveal note** (the recordable notebook line)
- **Term popup** (definition modal; #93)
- **Feedback line** (correct/incorrect, warm + specific)
- **Focus ring** (the `--focus-ring` token applied consistently)
- **Progress pill**, **hint disclosure**, **empty-state prompt**

The reason #96/#97 had to touch multiple places is that the zoom button was NOT a shared molecule — it was duplicated. Formalising this layer means a molecule fix is one edit, everywhere.

---

## 8. Layer 5 — Block registry (kills switch-statement sprawl)

Replace the implicit `IM_PACK`/renderer-map switch with an explicit **registry**. Each block is a self-describing module:

```
registerBlock({
  type: 'labeledGraphic',
  schema: { image, markers:[{x,y,title,body,real}], ... },   // drives validation + generated editor form
  render(data, mode) { ... },                                 // Study / Present / Export
  behaviours: ['zoom','reveal','feedback'],                   // opts into behaviour services (§9)
  tokens: ['surface','ink','primary','accent'],               // which slots it consumes (theme inheritance)
  a11y: {                                                      // REQUIRED accessibility contract (§10)
    keyboard: true,
    textAlternative: (data) => [...],                         // list form of visual content
    dragless: true                                            // any drag has a non-drag path
  }
})
```

Built-in blocks and new blocks register **through the same door** (Symfony/Gutenberg principle: plugins hook in the same way the core does). Adding a block = one ~100-line self-contained module, not surgery across the file.

**Extract the registry FROM three real blocks** (text + knowledgeCheck + a new Labeled Graphic) rather than designing it abstractly — the interface that cleanly serves all three is the right one (rule-of-three refactor; safer for a single-file engine than a speculative framework).

---

## 9. Layer 6 — Behaviours (the Brilliant/Khan/Duolingo layer; kills reimplemented-interactivity bugs)

Behaviours are **services the core provides**; blocks **declare** which they use (service tagging). Add a behaviour once; every block that tags it gets it free.

Core behaviour services:

- **reveal-after-attempt** — commit before you see the model (already the discipline)
- **hint-ladder** — `hints:[]` per question: nudge -> bigger nudge -> worked step -> answer (Khan). A block whose schema includes `hints` gets the UI free.
- **micro-feedback** — immediate, specific, warm response to every interaction (Duolingo's *texture*, NOT its streaks/XP/leaderboards — those are the wrong product for a teacher-paced tool)
- **zoom / focus overlay** (#89)
- **tooltip / term popup** (#93; WCAG SC 1.4.13 — dismissable, hoverable, persistent)
- **animation** — entrance/emphasis transitions, **restraint by default** (every reviewer warns: motion without pedagogical purpose distracts). Motion for meaning (reveal, focus, sequence), never decoration.

**Cross-cutting authoring discipline (from Brilliant/Codecademy/DataCamp):** *one idea per unit, an action beside every unit.* Shrink the content unit; braid instruction and practice at short intervals. This is why the coin workbench is the strongest moment — it already does this. Make it the rule.

---

## 10. Layer 5+6 — Accessibility as a contract (build in, never retrofit)

Retrofitting accessibility is proven expensive AND error-prone (pages WITH careless ARIA average MORE errors than pages without). So: **prefer native HTML (accessible by default); progressive enhancement; ARIA only where a custom widget needs it.** Most blocks are native buttons/text — accessible for free. The danger zone is custom interactive blocks.

**Required of EVERY interactive block (checked by the render-gate, §11):**

- **Keyboard operable** — Tab between, Enter/Space to activate, arrow keys within composite widgets, Escape to dismiss. (APG patterns.)
- **Visible focus indicator** — the `--focus-ring` token, min 3:1 contrast (WCAG 2.2 SC 2.4.11).
- **Drag has a non-drag alternative** — WCAG 2.2 SC 2.5.7 is explicit: all dragging achievable by single pointer without dragging. Sorting/matching blocks provide click-to-assign or move-up/down. Drag is the *enhancement*; click/keyboard is the *baseline*.
- **Visual content has a text alternative** — hotspot/Labeled-Graphic/3D blocks expose their markers as a navigable text list (spatial context for non-sighted users). You already have this latent: your callouts are text; expose them as a list.
- **Overlays follow the APG dialog pattern** — focus-trap open, Escape closes, focus returns to trigger. (#89/#93 already most of the way.)
- **Contrast** — normal text 4.5:1, focus/UI 3:1 — guaranteed by the token slots (§4), not checked per instance.

---

## 11. The render-gate (the fix for this session's recurring pattern)

Automated assertions run before any block ships. This is the antidote to "green checks, broken output, caught late by eyes." Assertions:

- No overlapping interactive coordinates within a block.
- No dead columns / empty layout regions.
- Feedback hidden by default (no `[data-fb]` visible pre-interaction).
- Every overlay opener resolves to exactly one overlay.
- Content fills its card (no text on a bare canvas).
- Every colour references a token slot (no raw hex).
- Every interactive block satisfies its `a11y` contract (keyboard flag, text alternative present, dragless path present).
- Every referenced asset has a fallback.
- Composed OUTPUT reads as English (frame+clause sentences, etc. — the workbench lesson).

**"Parse OK" is not "correct."** The gate checks STRUCTURE and composed OUTPUT, not syntax.

---

## 12. Layer 7 — Assets (the picture bank)

- **Asset manifest:** a per-lesson registry of image slots that GROWS as blocks are added. Each block with an image declares its slot id (`slot: 'rising-sidebar'`).
- **Picture bank panel:** reads the manifest, shows every empty slot (always current), lets you **bulk-assign** images to slots in one pass — the "bulk placement" requested. Derived from blocks, so never stale.
- **Adaptive:** as you add a block/page, its slots appear in the bank automatically.
- Images resolve by slot id; embed as data-URI on export (self-contained) OR reference by repo path (ships with the lesson) — the asset-source layer (§5) decides by size.

---

## 13. Layer 8 — Editor UX (the "not a billion things" answer)

Separate the RENDER surface from the PANEL surface (Figma's core architecture). Three collapsible zones:

- **Left — outline / layers panel:** the block list; reorder, collapse, toggle visibility. The layers-panel answer to "too much on screen" for authoring. A view of block order.
- **Center — canvas:** the lesson preview in the auto-layout flow. What the student sees.
- **Right — properties panel:** **contextual** — shows ONLY the selected block's fields (generated from its schema). You never see every control at once. This is how these tools avoid overwhelm.

Plus **summonable panels** (not always-on): picture bank, token/colour controls, add-block library. Everything is a view of the JSON (Layer 0).

---

## 14. The block & behaviour catalogue (what to build, prioritised)

**Flagship blocks (cross-platform consensus — appear in Genially AND Rise AND H5P):**
1. **Labeled Graphic / image-hotspot** — the coin workbench generalised to ANY image. Highest value, lowest risk (mechanics already built). BUILD FIRST.
2. **Timeline** — Rise + H5P + an entire category of history tools. The Agrippina progression, reusable.
3. **Flashcard** (grid + stack) — Rise + H5P. Cheap; suits your recall emphasis.
4. **Sorting** — Rise + H5P + your Versailles interactive. Promote to native block (with dragless fallback, §10).

**History-differentiated (your moat — general tools do these badly or not at all):**
5. **3D-hotspot** — the coin workbench as a reusable block. H5P STILL lacks native 3D (years-old top request). Genuine differentiator. (Inline-glTF pattern; mandatory fallback.)
6. **Map-narrative** — StoryMap-style pins + slides + path, for the `geolearn` theme. No general tool does this well.
7. **Mark-the-words / source-annotation** — click words in a source passage. Novel; exactly on-brand for a source-skills tool.
8. **Interactive video** — timed questions/hotspots over a referenced clip (fixes the blank-video-slide). Reference-only, captioned, click-to-start.
9. **Image juxtaposition** (before/after slider) — trivial to build, strong effect (then/now, worn/pristine, censored/uncensored).

**Deepen existing pages (Tier 2):** Tabs / Accordion (progressive disclosure), Process (stepped carousel), and richer knowledge-check types — matching, multiple-response, fill-in-the-blank (Rise's four; you have MCQ).

**The selection filter for anything new:** *Does this block create a new way to EXAMINE EVIDENCE?* If yes, on-brand. If it's just motion or points, skip. Your strength is disciplined source pedagogy; add lean-forward interaction, not decoration.

**Explicitly OUT of scope (wrong product for a self-contained, teacher-paced, publish-to-Pages tool):** branching/scenario navigation, live participation (polls/leaderboards), LMS/SCORM/xAPI, real-time co-editing, template marketplace, streaks/XP/gamification loops, in-app AI image-gen (generate at authoring time instead). Naming exclusions is part of the spec.

---

## 15. Build sequence (bottom-up, pain-first)

Each phase ships independently and retires a PR-class. Do NOT build the whole thing before shipping any of it.

- **Phase 1 — Tokens (Layer 1).** Token slots + cascade. Refactor existing themes onto slots. *Retires colour PRs.* Self-contained; everything depends on it; do first.
- **Phase 2 — Layout (Layer 3) + Molecules (Layer 4).** Auto-layout flow; extract the shared molecules. *Retires positioning/collision/"fix-in-3-places" PRs.*
- **Phase 3 — Registry (Layer 5), extracted from text + knowledgeCheck + Labeled Graphic.** Ship **Labeled Graphic** as the first new block — it validates the whole "one-off interactive -> reusable block" thesis and generalises the coin workbench.
- **Phase 4 — Behaviours (Layer 6) + Accessibility contract (Layer 10) + Render-gate (Layer 11).** hint-ladder, micro-feedback, the a11y contract, the automated gate.
- **Phase 5 — Asset-source (Layer 2) + Asset manifest / picture bank (Layers 7).** Embed/reference policy, allowlist, fallbacks, the bulk picture bank.
- **Phase 6 — Editor panels (Layer 8).** Layers panel, contextual properties, summonable banks.
- **Phase 7 — Remaining catalogue blocks (§14)**, each now a ~100-line module against the mature registry.

**Rationale for the order:** phases 1–2 alone kill the majority of the PRs that have frustrated the project. Feel that relief before building the rest. Everything after is additive and low-risk because the foundation guarantees appearance, position, contrast, and accessibility.

---

## 15b. Domain packs — complete lesson generator without cross-subject contamination

The engine is a **complete lesson generator** (humanities, mathematics, chemistry, physics, English, general science) built so that **no subject can contaminate another**. This is achieved by a **shared foundation + isolated domain packs** (the microkernel/plugin pattern), NOT by forking the engine per subject.

**The two kinds of contamination, treated oppositely:**

- **Shared-plumbing contamination** (a token, layout rule, or molecule that two subjects share, where fixing one breaks the other — the `.tp-sa-wrap` problem). Cure is NOT separation — it is the foundation (Layers 0–6, 10, 11) being *correct once* and universal. Forking colour/layout per subject would multiply PR pain, not reduce it. **The foundation is shared, universal, single-implementation.**
- **Domain-logic contamination** (maths notation, chemistry data, physics sims leaking between subjects). Cure IS isolation — **domain packs**, each encapsulated, each registering ONLY through the shared block registry (§8), never modifying the foundation or another pack.

**Structure:**

```
SHARED FOUNDATION (the constitution — Layers 0–6, 10, 11; one implementation)
DOMAIN PACKS (isolated; register through the shared door; opt-in per lesson)
├── humanities-source   (SPEC'D — pack-humanities-source.md)
├── mathematics         (SPEC'D — pack-mathematics.md)
├── chemistry           (STUB)
├── physics             (STUB)
├── general-science     (STUB)
└── english             (STUB — split: literature + language-mechanics)
```

**Three isolation guarantees:**

1. **A pack can only ADD (blocks/widgets/behaviours) through the registry; it can never modify the foundation or another pack.** A maths bug is structurally incapable of reaching history — they meet only at the registry interface, never in each other's code.
2. **Each pack has its own spec document**, independently ownable and editable, but all **conform to the one foundation contract** (registry interface, token slots, a11y contract, render-gate). Separate specs, shared *contract*.
3. **A lesson declares its pack(s); only those load.** A history lesson never loads the chemistry pack, so chemistry cannot affect it even at runtime.

**Pack vs. recipe — the rule that prevents re-contamination through duplication:**

- **Subjects are packs** (isolated code) when their *primitives genuinely differ* (chemistry's periodic table doesn't serve physics).
- **Areas within a subject are recipes** (documented combinations of the SAME shared primitives), NOT separate code. Algebra/calculus/statistics/geometry are recipes inside the *one* mathematics pack because they all share notation, graphing, working. Building an "algebra pack" and a separate "geometry pack" that each reimplement notation would be re-contamination by duplication.
- **Rule:** *Pack when the primitives differ; recipe when they're the same primitives combined differently.*

---

## 16. Non-negotiable principles (the spec in one screen)

1. **Constrain to guarantee.** Auto-layout, not free canvas. Correct-by-construction beats fix-per-instance.
2. **JSON is truth.** Every panel is a view.
3. **Colour is a token slot, never a hex.** Theme-first, safely customisable. Contrast is structural.
4. **Position is computed, never placed.** Collisions un-representable.
5. **Molecules defined once.** No duplicated UI.
6. **Blocks register through one door.** Self-describing modules.
7. **Behaviours are services blocks opt into.** Add once, inherit everywhere.
8. **Accessibility is a contract, checked by the gate.** Native-first, dragless baseline, text alternatives, visible focus.
9. **Assets: embed small, reference heavy, always a fallback.**
10. **The render-gate guards output, not syntax.** "Parse OK" is not "correct."
11. **Add ways to examine evidence, not decoration.** The pedagogy is the product.
12. **Shared foundation, isolated packs.** Subjects cannot contaminate each other; they meet only at the registry.
13. **Self-contained over embedded** wherever feasible (graphing, notation, widgets all bundle offline — a lesson that dies on the school network is worse than a simpler one that always works).

---

## 17. Notation as a token-level capability (shared, used by maths/chem/physics)

Mathematical/scientific notation is NOT a block — it is a **capability every text field gains**, exactly like `==term==` popups. This lives in the foundation because multiple packs need it.

- **Engine: KaTeX** (bundled, self-contained). Chosen over MathJax because it renders synchronously and bundles with zero config — essential for single-file self-contained lessons (MathJax's async rendering fights that). Accessibility gap closed via KaTeX's MathML output for screenreaders.
- Any text field in any block may contain `$...$` (inline) / `$$...$$` (display); the renderer typesets it.
- **Authoring input:** a math-input field uses a MathQuill-style natural editor → stores LaTeX → KaTeX renders. Authors never need to know raw LaTeX.
- Notation inherits the token type-scale and `--ink` colour like all text (theme-aware).
- This capability is declared available to a lesson by its pack; a pure-humanities lesson need not load KaTeX.

---

## 18. Execution model (HOW to build — kept separate from WHAT to build)

*Process lessons from a prior ~50-PR solo-dev + Claude Code project. These govern execution; they do not touch the architecture.*

- **Diagnose-first.** For anything non-trivial: an investigation-only prompt (find X, cite file:line, report state + plan, do NOT write code, await approval) BEFORE a scoped implementation prompt. Repeatedly catches "the brief assumed X but the code does Y."
- **Prototype the risky part before committing** (measure the failure modes in isolation — as the coin-workbench sandbox-rendering chain did).
- **CLAUDE.md as a complete, first-commit, self-configuring anchor.** Contains workflow rules, build/run commands, file conventions, and the full render-gate/verification checklist. Makes context-loss a non-event. Write it from commit 1 of v2.
- **One PR per unit-of-review**, structured as taggable rollback-able sets (`git tag pre-<phase>`). Stacked PRs multiply reviewer load and hit rate limits (as this session's #89→#96→#97 chain did).
- **The auto-merge tradeoff is explicit:** automated review catches code-correctness (stale guards, scope leaks) but is BLIND to reachability, visibility, "does it match what was approved," and "does it feel right." The human real-use pass (open the live URL, reach it like a user, check contrast against the actual background) is the ONLY net for those, and is non-negotiable if auto-merge is used.
- **Trigger-based backlog.** Build a primitive when authoring the content that needs it, not speculatively. Real-use friction specifies the next priority better than upfront planning. (This is why chemistry/physics/english are stubbed, not built.)
- **The render-gate verification checks** (§11) are the battle-tested failure modes: reach-it-like-a-user, check-visibility-not-DOM-presence, save/restore whitelist parity, live-vs-replay through one shared path, validate-don't-coerce ingested data, stale-ID guards.
