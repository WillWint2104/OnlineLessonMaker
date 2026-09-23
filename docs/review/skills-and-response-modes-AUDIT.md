# Audit — skill-based lessons and the three response modes

Step one of the new milestone: *how much of the skill-based structure and the three response modes is
already implemented?* Read from the code and **measured in the running application**, not inferred.
Branch `claude/stage-4-block-wiring` at `fc7064c`. Nothing in this audit changes the application.

## The short answer

| the proposal asks for | what exists today | how much |
| --- | --- | --- |
| `responseMode` set once at lesson level | **`LESSON.meta.responseMode`, already read at boot and applied lesson-wide** | **exists** |
| `pen` — handwriting | `responseMode:"write"` → ink workbook, Pen / Eraser / Clear | **exists, different name** |
| `typed` — digital entry | `responseMode:"type"` → typed workbook, Text / Equation / Insert | **exists, different name** |
| `paper` — no digital response | an unknown value **silently falls back to `write`** | **missing** |
| a page with no answer controls | reached today by **omitting `workspace` from that page** | near-miss, per page |
| a skill: id, title, notes, examples | **`group` — `{id, title, type, lede?, examples[], relations?}`** | **exists** |
| a skill carrying its own video | — | **missing** |
| a skill carrying its own questions | questions live on a separate `practice` page | **missing** |
| navigate to a skill | the rail is **one flat item per slide** | **missing** |
| see which skill you are on, and progress | — | **missing** |

**Two of the three response modes are already built and already lesson-level.** The skill *content* unit is
most of the way there under another name. What is genuinely absent is paper mode, a video and questions
inside a skill, and any notion of a skill in navigation.

---

## 1 · Response modes — measured

`lesson-studio.html:8227-8248`. `MX_RESPONSE_MODES=['write','type']`; `mxResponseMode()` seeds once from
`LESSON.meta.responseMode`; the value is published on the shell as `data-mx-response` and drives
`tpWorkbookMode`. Measured on the committed factorising lesson, practice page, 1536×960:

| `meta.responseMode` | `data-mx-response` | top-bar selector | workbook | tools | layout |
| --- | --- | --- | --- | --- | --- |
| *(unset)* | `write` | Write / Type | 1 | Pen, Eraser, Clear, Expand | 554px + 638px |
| `"write"` | `write` | Write / Type | 1 | Pen, Eraser, Clear, Expand | 554px + 638px |
| `"type"` | `type` | Write / Type | 1 | **Text, Equation, Insert** | 554px + 638px |
| `"paper"` | **`write`** | Write / Type | 1 | Pen, Eraser, Clear, Expand | 554px + 638px |
| *page has no `workspace`* | `write` | **(none)** | **0** | **(none)** | **single column, 1212px** |

Three things follow.

**a · `pen` and `typed` are done, and are called `write` and `type`.** Renaming is a vocabulary decision,
not an implementation one — but 24 committed lesson files and 22 gate scripts read the current names.

**b · An unknown `responseMode` is swallowed.** `"paper"` produces a pen workbook and no complaint. Whatever
is built, an unrecognised mode should be reported, not defaulted.

**c · Paper mode nearly exists, one level too low.** A page with no `workspace` already renders exactly what
the proposal describes: single column, full measure, **no workbook, no ink tools, no Questions/Workbook
switch, and no Write/Type selector**. It is reached by omitting a key on every page rather than by one
lesson-level setting — and **one residue survives**: a `table` question still renders `<input>` cells
(4 of them on that page), so "no answer boxes" is not yet true for that question type.

---

## 2 · The skill unit — what a `group` already is

HANDOFF §8c, the Worked Examples contract:

> `{ id, title, type, lede?, examples: [...], relations? }` — *a tab is a GROUP with a pedagogical identity
> (`Substitution`, `Solving for x`), never `Example 1`.*

A group already has an id, a teaching title, a lede, its worked examples, and `relations[]` carrying the
shared part vocabulary (`prose | figure | table | points | relations`). **It is a skill in all but name and
two fields.** It cannot carry a video, and it cannot carry practice questions.

It is also currently a **tab inside one page**, not a destination. `mxShowTab` switches panes within a
slide; the lesson's spine is `LESSON.slides`.

The renderers that a skill section would need already exist as separable functions: `mxWexEx()` emits one
worked example, `mxPracticePage()` emits the numbered question list with its parts and tables, `mxNotesPage`
emits concepts and their example tabs, `mxVideoPage` emits the video region.

---

## 3 · Navigation and progress

`mxRail()` (`:8547`) maps `LESSON.slides` **one nav item per slide** — icon by page type, `navLabel`,
optional `navSub`, `aria-current` on the current one. There is no grouping, no nesting, and **no progress
indicator anywhere in the file**. `navSub` is the only hint of hierarchy and it is decorative.

---

## 4 · Reconciling the proposed model with the existing schema

The proposal's illustrative JSON re-roots the document: `{ "lesson": { …, "skills": [...] } }` in place of
today's `{ meta, slides }`. That root is load-bearing — **89 references in `lesson-studio.html`, 22 gate
scripts, 24 committed lesson files**, plus the response store, export/reopen and the inspector, all of which
address content by slide. Re-rooting is possible but it is a migration, not a feature.

**The reconciliation that keeps the authoring intent and costs almost nothing: a skill IS a slide.**

```jsonc
{
  "meta": {
    "title": "Factorising Quadratics",
    "stage": "NSW Stage 5",
    "year": "Year 10",
    "theme": "mathematics",
    "responseMode": "paper"        // paper | typed | pen — lesson-level, as proposed
  },
  "slides": [                       // the number and order of skills is the JSON's, as proposed
    {
      "type": "skill",              // ONE new page type
      "id": "monic",
      "navLabel": "Factorising monic quadratics",
      "title": "Factorising monic quadratics",
      "notes":    { "concepts": [ … ] },        // the Notes vocabulary, unchanged
      "video":    { "url": "https://youtu.be/…" },  // NEW — a real URL, embedded
      "examples": [ { … } ],                     // the group's examples[], unchanged
      "questions":[ { … } ]                      // the practice vocabulary, unchanged
    },
    { "type": "skill", "id": "non-monic", … }
  ]
}
```

Everything inside a skill is the vocabulary that already ships. What is new is **one page type that
composes four existing renderers in one scroll**, a `video.url` that is actually embedded, and a
`responseMode` that admits `paper`.

| | re-root to `lesson.skills[]` | a skill is a slide |
| --- | --- | --- |
| the JSON says how many skills | yes | yes |
| a skill owns notes, video, examples, questions | yes | yes |
| navigate straight to a skill | needs a new two-level rail | **the rail already lists slides** |
| response store, export/reopen, worksheet | all re-keyed | unchanged |
| 24 committed lessons, 22 gates | migrated | unchanged |

**This is the decision I need from you**, because everything after it depends on the answer. My
recommendation is *a skill is a slide*: it delivers every authoring property you specified, and the one
thing it does not give you for free is sub-navigation *within* a long skill — which `navSub` and a section
list can cover.

---

## 5 · What the remaining milestone steps would then involve

- **Skill-section layout.** One `mxSkillPage` composing notes → video → worked examples → questions in a
  single scroll, reusing `mxWexEx`, the practice question renderer and the notes concept list. The
  composition rules, the Figure Engine and `mxM` are untouched.
- **Response mode from the top-level JSON.** Add `paper` to `MX_RESPONSE_MODES`; make an unknown value
  report rather than default; suppress the workbook, the view switch, the Write/Type selector **and the
  table `<input>` cells** when the mode is `paper`; add the "complete these in your exercise book"
  instruction the mode implies. `write`→`pen` and `type`→`typed` renaming is a separate, mechanical change
  across 24 lesson files and 22 gates if you want the new names.
- **Rebuild the factorising lesson** on the resulting structure and photograph it, as before.
- **The video** becomes a real embed via the app's existing `toEmbed()` and its youtube/vimeo allowlist —
  which already work in the legacy `video` slide type. No fabricated chapters, durations or transcripts.

## 6 · Open questions I should not decide alone

1. **A skill as a slide, or a re-rooted `skills[]`?** (§4 — my recommendation is the former.)
2. **May a student still switch response mode?** Today the Write/Type selector is in the top bar and the
   student can change it. "The selected mode must come from the lesson's top-level JSON" can mean the JSON
   sets the default, or that the selector disappears. I read it as the latter — please confirm.
3. **Rename `write`/`type` to `pen`/`typed`, or keep the existing names?**
4. **What happens to `notes`, `practice`, `videoShell` and `summary` as page types** once a skill carries
   all four? Kept for lessons that want them, or retired?
