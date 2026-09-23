# Factorising quadratics, in the application — visual review

`CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/shots-lesson-review.mjs \`
`  --lesson docs/atlas/lesson/factoring-quadratics.app.json --out docs/review/factoring-quadratics`

Branch `claude/stage-4-block-wiring` at **706f50a**, working tree clean, PR #153 open and unmerged, all
seven checks green. The lesson is the one committed in **662b6f3**; it was read from the repository, not
reconstructed. It was loaded **through the app's own ⌗ JSON dialog** — the supported workflow — into
`lesson-studio.html` itself, put in **Study** mode, and photographed at **1536 × 960**. A mathematics page
scrolls inside `.mx-page` rather than scrolling the document, so a viewport or `fullPage` capture stops at
the fold; the viewport is grown by the scroller's own overflow first and what is photographed is the page.
Ten captures, no page errors, no figure errors, no 404s.

| # | capture | what is on it |
|---|---|---|
| 0 | `00-notes.png` · `00-notes-tab2.png` | 6 key concepts, 2 tabs, the factor-pair table |
| 1 | `01-video-monic.png` | the video frame, 4 chapters, 2 after-watching tasks |
| 2 | `02-monic.png` · `02-monic-tab2.png` | 4 worked examples, 14 steps, 2 tabs |
| 3 | `03-practice-monic.png` | 7 questions, an input table, the workbook |
| 4 | `04-video-non-monic.png` | the second video frame, 4 chapters |
| 5 | `05-non-monic.png` | 3 worked examples, 15 steps |
| 6 | `06-practice-non-monic.png` | 7 questions, an input table, the workbook |
| 7 | `07-summary.png` | the lede — and an unimplemented-stage placeholder |

**What is genuinely good, so the defects below are read in proportion.** The worked examples are the
strongest thing here: the question/solution primitive reads cleanly, every step's mathematics sets in the
mathematics face with true minus signs and real superscripts, and the answer band closes each example. The
practice pages progress sensibly and their workbook is real — pen, eraser, clear, grid paper, pages, and
table cells a student types into. Nothing is clipped, nothing overlaps, and nothing overflows its box.

---

## A · Rendering defects in the application

**A1 · A multi-letter variable prints its underscores to the student.** `mxM` italicises exactly one
letter (`lesson-studio.html:8137`, `/_([A-Za-z])_/g`), so `_bx_` and `_ax_` are left as literal text.
**Five leaked tokens on three of the eight pages, including two page titles** — the largest type in the
lesson. Nothing reports it: the page renders "successfully" with `_bx_` in the headline.

> `Monic quadratics — x² + _bx_ + c`
> `Non-monic quadratics — _ax_² + _bx_ + c`
> `A quadratic is monic when the coefficient of x² is 1 — x² + _bx_ + c.`

The authored strings are `slides.0.concepts.1.body`, `slides.0.concepts.2.body`, `slides.2.title`,
`slides.5.title`. Whether the fix belongs in the content or the convention is the maintainer's call — but
the silence is the app's.

**A2 · An authored `progress: 0` paints a 36 % scrubber.** `lesson-studio.html:9092` reads
`Math.max(0,Math.min(100,+v.progress||36))`. Zero is falsy, so an explicit zero becomes the demo default.
Both video pages show a bar a third of the way along beside a clock reading `0:00 / 6:00` — two contradictory
statements about the same video, on screen at once.

---

## B · Missing application functionality

**B1 · The mathematics video page cannot play or embed a video, and does not say so.** `mxVideoPage`
emits a `role="img"` div: measured on the rendered page there are **zero** `<video>`, `<iframe>` or
`<audio>` elements, the play control is a `<span>` inside no button, and clicking the play button, the
frame, the control bar and the scrubber changes **nothing** — no markup change, no scrubber movement, no
clock change. It is a photograph of a player, and a convincing one: play button, progress bar, running
clock, CC / settings / picture-in-picture / fullscreen icons.

**There is no YouTube slot in this lesson, and none in this page family.** The application *does* embed
YouTube — `toEmbed()` converts a watch URL to an embed URL and `EMBED_HOSTS` allowlists
youtube / youtu.be / youtube-nocookie / vimeo — but only in the **legacy pack `video` slide type**. The
mathematics `videoShell` reads no `url`, `src` or `embed` field at all. It is registered under a
deliberately temporary name (`lesson-studio.html:8022`) as a Stage A shell.

**B2 · "Open transcript" is a real `<button>` that opens nothing.** Clicking it produces no overlay and
no state change.

**B3 · The chapter list is static text.** "0:00 / 1:30 / 3:10 / 4:40" cannot be clicked to seek, because
there is nothing to seek.

**B4 · The lesson ends on an unimplemented-stage notice.** `summary` is registered to `mxStubPage`, which
paints *"The shell for this page type is in place; its content lands in a later stage."* The page's lede
renders, so the three rules are readable — then a dotted placeholder box sits under them, addressed to a
developer, in front of a student.

**B5 · Nothing marks, checks or reveals an answer.** There is no answer-reveal control anywhere in this
page family. A student writes in the workbook or types into a table cell; nothing tells them whether they
are right. For a lesson meant to be worked through independently this is the largest functional gap after
the video.

**B6 · Only one of these five page types can be made in the interface.** `MX_PAGE_SEED` holds
`workedExamples` alone, so the notes, video, practice and summary pages of this lesson are hand-written
JSON. They render, but they cannot be authored, edited or duplicated by a teacher through the app.

---

## C · Incomplete authored content (mine, not the app's)

- **C1** The four `_ax_` / `_bx_` strings behind A1 are my error against the app's one-letter convention.
- **C2** No video source is authored, because there is nowhere to put one (B1). The durations, chapter
  times and `progress` values are invented placeholders and should not be read as describing real videos.
- **C3** Some `math` fields carry prose — `multiply to 12, add to 7`, `a × c = 2 × 3 = 6` — so a sentence
  sets in the mathematics face.
- **C4** The "Both signs negative" answer on the non-monic page runs two sentences of prose through a
  field that is typeset as mathematics.

---

## D · Instructional observations, for later and not defects

- **D1** The QUESTION column is nearly empty. "Factorise x² + 7x + 12." is one short line beside a
  solution 350–800 px deep; the composition is correct by the approved rule (the question hugs its content,
  no tint, no rule) but this lesson's questions are far shorter than the quadratics lesson's.
- **D2** On Notes, the left concept list runs about twice the depth of the right tab panel.
- **D3** No non-monic example takes out a common factor first; only the monic page teaches that move.
- **D4** Both practice pages end with a worded problem, which is right — but neither is scaffolded for a
  student working alone without B5.

---

## Is it usable by a student working independently?

**The reading is; the doing is not.** The notes, the worked examples and the question sets would carry a
student through a lesson with a teacher in the room. Alone, they would meet a play button that does
nothing, a transcript button that does nothing, no way to check a single answer, and a closing page that
tells them the content lands in a later stage.
