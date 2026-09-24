# Domain Pack Stubs (deferred)

*One page reserving a non-contaminating home for each delayed subject. Each declares its primitives (shared vs. new) and its build trigger. Full spec written when content authoring in that subject actually begins (trigger-based backlog). All conform to the foundation constitution and register only through the shared block registry.*

---

## Pack: Chemistry — STUB

**Trigger to fully spec:** when authoring the first chemistry lesson.

**Shared primitives (reuse, do not rebuild):**
- Notation (foundation KaTeX capability) — for formulae and equations, e.g. `$H_2O$`, `$2H_2 + O_2 \rightarrow 2H_2O$`.
- Working block (stepped) — for balancing equations, stoichiometry.
- dataTable/charts (foundation) — experimental data.
- 3D-hotspot block (generalised from the coin workbench) — molecular models with labelled atoms/bonds.
- labeledGraphic — apparatus diagrams.

**New primitives (this pack owns):**
- **periodicTable** widget — interactive, clickable elements with data popups (uses foundation popup + hotspot molecules + a data set). Tray-eligible.
- **moleculeBuilder / reactionDiagram** — chemistry-specific composition.
- Possibly **equationBalancer** as a specialised working/knowledge-check.

**Contamination boundary:** periodic table and molecular tools serve chemistry (and partly physics/general-science); they never touch maths or humanities code.

---

## Pack: Physics — STUB

**Trigger to fully spec:** when authoring the first physics lesson.

**Shared primitives (reuse):**
- Notation, working, graph (self-contained plotter from the maths pack pattern), dataTable — all shared with mathematics.
- 3D-hotspot — apparatus, wave/field visualisations.

**New primitives (this pack owns):**
- **simulation** blocks — vectors, projectile motion, circuits, waves, forces. Self-contained, parameter-driven (slider behaviour), aspect-boxed. The physics analogue of the maths graph block.
- Circuit/ray/vector canvases.

**Note:** physics shares MORE with maths than chemistry does (graph, working, notation are near-identical needs). Confirm at spec time whether some physics primitives should live in a *shared STEM-core* sub-layer rather than duplicated — but only if real duplication appears (avoid speculative abstraction).

---

## Pack: General Science — STUB

**Trigger to fully spec:** when authoring the first general-science lesson.

**Shared primitives (reuse):** a subset of chemistry + physics primitives + humanities-source (method write-ups read like source analysis).

**New primitives (likely none unique):** general science is largely a **recipe pack** — combinations of existing chem/physics/humanities primitives (experiment method + data table + graph + labelled diagram + written conclusion). May need an **experiment/method scaffold** block (hypothesis → method → results → conclusion), which is the guidedResponse block specialised. Confirm at spec time; it may be a recipe, not new code.

---

## Pack: English — STUB (split into two distinct sub-domains)

**Trigger to fully spec:** when authoring the first English lesson. Note the split below — it affects architecture, so it is reserved now.

English is NOT one homogeneous pack. It is two different things:

### English-Literature → a RECIPE on humanities-source (little new code)
- Close reading = text + markTheWords + sourceAnalysis (a poem/extract is a "source").
- Character/theme tracking = timeline + labeledGraphic.
- Comparative essay = guidedResponse.
- **Almost entirely reuses the humanities-source pack.** markTheWords was practically built for annotating a poem. Likely zero new primitives — a recipe, not a pack.

### English-Language-Mechanics → its own small primitive set (genuinely new)
Grammar/punctuation/writing needs primitives NO existing pack has (closer to Duolingo's language mechanics than to source analysis):
- **correctionAnnotation** — mark/fix errors in a text (punctuation, grammar).
- **sentenceConstruction / reordering** — drag-or-click words/clauses into correct order (drag-less baseline required).
- **errorIdentification** — spot-the-mistake (specialised knowledge check).
- **cloze / fill-in-blank at scale** — from the foundation KC set, used heavily.

**Contamination boundary:** language-mechanics primitives are self-contained; literature is a recipe on humanities. Reserving this split now means the architecture won't have to be bent later when writing/grammar content arrives.

---

## General stub rule
None of these is built speculatively. Each is fully spec'd only when its authoring trigger fires. Reserving the primitive list + contamination boundary now is enough to guarantee the architecture accommodates them without redesign — which is the entire point of the shared-foundation/isolated-pack structure.
