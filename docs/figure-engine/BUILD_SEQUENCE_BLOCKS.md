# Lesson Studio — Content Blocks: Sequenced Build Plan (runs AFTER the engine sequence)

Companion to `BUILD_SEQUENCE.md`. These are the blocks/question-types DESIGNED and APPROVED in chat
(video, exercise set, hero, media, purpose-unit containers) — their look is settled, so PRs verify
against the approved design, they don't design.

Sequencing: run these AFTER the engine sequence completes, ONE STAGE AT A TIME (single ordered queue,
no parallel branches). Each is a self-contained Claude Code prompt. After each: mark ready → auto-merge
on green `validate` → deploy once → artifact-verify → report → I verify against the stage's acceptance
before the next.

Every stage is ADDITIVE: frozen runtime fns + legacy corpus BYTE-IDENTICAL; token-only (no `[data-theme]`
structural forks); self-contained (no CDN/KaTeX); contrast AA. Registration follows the proven seam
(`FRAG[type][theme]`, 5 themes listed explicitly after the :6495 ScholarMath mirror; every minted id
`-${bk}`-scoped; palette auto-includes via `fragTypesForAdd()`; editor touchpoints TYPELAB/BLOCK_SEED/
blockForm arm are additive). Reveal/expand interactions ride the existing Phase B rail
(`data-tp-focus-open` + `[data-tp-overlay]`), NOT new interaction code — `wirePack` stays byte-identical.

NOTE on Stage 5 (solution/worked-example typesetting): already in `BUILD_SEQUENCE.md`. The exercise-set
solution modal below REUSES that annotated-two-column treatment — so run engine Stage 5 before, or fold
the modal's solution styling into this track's Stage C. Do not build two different solution treatments.

---

## STAGE A — Purpose-unit container + hero/masthead
Branch `v3-blocks-container`. Design refs: purpose-unit rule (container = a coherent unit of purpose,
divides by NEW concept / image / interactive / mode-shift, NOT by spacing); hero 4 layouts.
Delivers:
1. The **section/purpose-unit container** primitive: heading (title/section H2 w/ accent rule /
   subsection H3 — distinguished by size+weight, NOT colour) + paragraph(s) + inline `$…$` (via
   tpRichMath) + display equation SUB-BLOCK (contained, shrink-wrapped `width:max-content` centred,
   ref number, multi-line aligned on `=`) all flowing INSIDE one container. Centred ~66ch measure
   (~700px column). Body 16.5px/1.62. NO box-per-element.
2. **Hero/masthead** block, `layout` field: Cover (title+eyebrow+intro then wide banner below —
   default) / Split (title beside image) / Overlay (title over darkened image, overlay MANDATORY for
   contrast) / Minimal (tinted ground, no image). Per-instance sizing (banner S/M/L/full-bleed, title
   scale default ~34px). Distinct from in-content Heading.
ACCEPTANCE: a section with heading+2 paras+display-eq renders as ONE card (not stacked boxes); measure
centred ~66ch; hero renders all 4 layouts; overlay layout meets AA over image; re-skins all 5 themes;
ADDITIVE/#119 clean; validate green.

## STAGE B — Media / image placements
Branch off A. Design ref: 4 placements, content-sized, figure+figcaption, alt mandatory.
Delivers one `media` block, `placement` field:
- Contained figure (centred ~78%, whole image, caption) · Beside-text (image + short text = one
  purpose-unit, stacks on mobile) · Banner (full-width cover) · Comparison pair (two images + labels).
- `figure`/`figcaption`, alt-text REQUIRED (validation error if missing), content-sized
  (`max-width:100%`, height auto, never distort), `object-fit` contain (figure) / cover (banner).
ACCEPTANCE: each placement renders + reflows to 1-col on mobile; missing alt-text flags; small image
stays small (not stretched); caption sits under figure; re-skins; ADDITIVE clean; validate green.

## STAGE C — Exercise set (the question container) + solution modal + self-mark
Branch off B (and after engine Stage 5, or fold Stage-5 solution styling in here). Design ref: exercise
set = numbered prompt + two-column grid of compact tappable lettered parts; polymorphic parts; per-part
status; hint icon-chip; solution as POPUP modal carrying annotated two-column working + three-way
self-mark.
Delivers:
1. `exerciseSet` block: numbered prompt + **two-column grid** (reflow 1-col mobile) of lettered parts
   (a,b,c…). Each part = letter + content + per-part **status indicator** (green ✓ Got it / amber ↻
   Partly / dashed = not done) + optional **hint icon-chip** (`?`, not a text link).
2. Parts are **polymorphic**: an algebraic expression (tpRichMath) OR a figure part (a `graph`/
   `geometry` figure via the engine — the frame + ⤢ Expand button; engine fills it). A figure part is
   the container + Expand hook ONLY here; the engine (already built) renders into it.
3. Tapping a part opens the **solution MODAL** (popup via the focus rail) carrying: the annotated
   TWO-COLUMN "Working | Why" solution (real typeset maths, aligned on `=`, per-step reason bound to
   its step) in the titled accent container + the Option-B accent-OUTLINE answer box + the three-way
   self-mark (Not yet / Partly / Got it). SAME treatment as engine Stage 5 (do not diverge).
4. Static end-of-set **mastery bar** (order:99): green(clean)/amber(partial-no-credit)/grey(pending);
   recommend-don't-gate; ∎ on mastery; partial = no mastery credit; cumulative clean count. (Reuse the
   S2/S3 static-bar approach — sticky is provably broken under the scaled #canvas.)
ACCEPTANCE: set renders as 2-col grid of tappable parts w/ status + hint-chip; a part opens the modal
with two-column typeset solution + self-mark; a figure part shows the frame + Expand (engine renders
inside); mastery bar is static end-of-set; NO monospace maths in the modal; re-skins; ADDITIVE clean;
validate green.

## STAGE D — Video block
Branch off C. Design ref: APPROVED video block.
Delivers `video` block: 16:9 responsive player (poster + play button, NEVER autoplay); CC badge +
duration badge; title header (▶ eyebrow); footer = transcript reveal (left, focus rail) + filled accent
PILL button "Watch on <source> ↗" (right, single source link — no header pill, no description line).
Accepts a video LINK (YouTube/Vimeo/direct .mp4) OR a pasted `<iframe>` embed code — **embed code MUST
be sanitized at build** (strip scripts, force the responsive 16:9 wrapper, enforce no-autoplay, restrict
to the source domain). Contained purpose-unit.
**Validator carve-out:** the video `src`/iframe host is EXTERNAL CONTENT (not a code/font CDN) — needs
an explicit allowance in `validate` so the no-third-party rule doesn't false-positive it. Implement the
carve-out narrowly (video embed hosts only) and document it.
ACCEPTANCE: player renders 16:9, no autoplay; link AND pasted-embed both work; pasted embed is sanitized
(show the sanitizer stripping a script); source pill opens in new tab; transcript reveal via the rail;
validator passes WITH the documented video-host carve-out and still rejects a non-video CDN; re-skins;
ADDITIVE clean.

---

## Deferred (design not yet done — need the design-first loop before any build prompt)
Callout/statement, quote, list, divider (supporting-text primitives); knowledge-check, reflection
(interactive); columns, spacer (layout); end-of-lesson / recap block. Do NOT write build prompts for
these until each is designed + approved in chat.

## Verification standard (every stage)
Frozen-fn byte-identity; legacy corpus byte-identical; token-only/no theme forks; reuse-not-rewrite;
self-contained (video-host carve-out is the ONLY external allowance, narrowly scoped); contrast AA;
matches the APPROVED design for that block; the stage's named acceptance checks. Draft PR held for my
review before ready/merge/deploy.
