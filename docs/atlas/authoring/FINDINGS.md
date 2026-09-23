# Authoring a lesson that did not exist — what got in the way

`node scripts/author-straight-lines.mjs`

The maintainer's milestone: make a **new** mathematics lesson through the interface only — no importing a
JSON file, no writing content into one — on a topic other than quadratics, covering examples, equations,
fractions, a graph, a table, rearranging and export; and record where authoring becomes unnecessarily
complicated, so the findings decide what is built next.

**The lesson**: *Straight lines: y = mx + c* (NSW Stage 5, Year 9, Linear relationships) — four subtopics,
four worked examples, eleven steps, a six-column table of values, two graphs carrying four curves between
them. It is in `docs/atlas/lesson/straight-lines.app.json` and its captures are beside this file. **It was chosen because
it stresses parts of the editor the quadratics lesson never touched**: gradients are fractions, a sloping
line is not the `line` object the graph editor offers, and three lines share one plane.

**The result.** It works. 189 interactions — 56 outline selections, 39 buttons, 94 fields — produced a
complete lesson that exports, reopens byte-identical, and renders intact in Study, Edit and Present with no
page errors. Nothing below prevented the lesson from being made. All of it made it slower or riskier than it
should have been, and two of them put something **wrong** on the page without saying so.

The entries below preserve the original run's measurements and priorities; they are historical findings,
not a claim that rerunning the current script reproduces every issue.

**Stage 5 status (23 September 2026): §§1–6 are fixed.** The editor warns about ambiguous division,
bracketed numeric sums render as fractions, curves have pens and names, added items are seeded,
tables have a Columns field, and Shift + arrow moves rows directly to an end. Rerunning
`author-straight-lines.mjs` no longer reports §§3, 4 or 6. **§§7–9 remain open** as documented
authoring/typography limitations; they do not prevent the lesson from being authored or reopened.

---

## 1 · A fractional gradient typed the natural way draws the wrong curve, silently

`1/2x+1` is read as `1/(2x)+1` — juxtaposition binds tighter than division — so the line becomes a
hyperbola. Measured: 4 broken subpaths either side of an asymptote, against 3 for `x/2+1`. **Nothing reports
an error**, because nothing is wrong: it is a valid expression, just not the one the teacher wrote.

This is the only finding that puts incorrect mathematics in front of a class. A teacher writing "gradient of
a half" will type `1/2x` first, every time.

## 2 · The substitution step of a worked example cannot be set as a fraction

`(5 − 2)/(5 − 1)` stays a slash. `(−4)/6` and `−2/3` build up. The grammar takes a bracketed **signed
integer** or bare digits — not a bracketed sum — so in a gradient example the *answer* sets as a fraction
and the *working that produces it* does not. 3 of 6 step expressions kept a slash.

This is the single most common line in gradient work, and the same shape appears wherever a formula is
substituted into. It is also the least visible: the field looks right, and only the preview shows otherwise.

## 3 · Three lines on one plane cannot be told apart

Measured: 4 curves, **1 distinct style** — `rgb(15, 122, 76) / 2px / none`. The graph editor offers no
colour, weight or dash per object, and `figGraph` carries a function `label` the painter never draws (the
field is withheld from the form for exactly that reason). So "Comparing steepness" — three gradients through
one intercept — has to be carried entirely by the prose beside the picture.

Any comparison lesson hits this: two functions, before-and-after, a family of curves.

## 4 · Everything you add arrives empty

A new **group** arrives with no examples. A new **example** arrives with no steps, and the page reads "This
example has no solution steps yet." until you add one. Meanwhile the page created from the palette arrives
seeded with a group, an example *and* a step.

So the first example of a lesson is free and every one after it costs two more clicks before there is
anything to type into, with a broken-looking page in between. Cheap to fix; paid on every addition.

## 5 · The shape of a table is built before its mathematics

A new table starts at two columns and grows one click at a time, with headings that arrive as "Column 1",
"Column 2" and must each be replaced. A six-column table of values needed **4 "＋ Add column" clicks plus 6
heading edits** before a single value could be typed.

A table of values is the commonest figure in junior mathematics and its columns are almost always a run of
consecutive integers.

## 6 · Rearranging is one click per place, per row

Putting the third step first took 2 separate ↑ clicks. A five-step solution would take four. There is no
drag and no "move to top". The selection follows the row, which is right, but the arithmetic is unforgiving
on a long worked solution.

## 7 · The object called "line" cannot draw a straight line

It is axis-parallel only — `y = k` or `x = k` — so `y = 2x − 1` has to be entered as a **function**,
`2x-1`. In a lesson *about* straight lines, the control named "line" is the wrong one every single time.
Nothing breaks; the author simply has to know.

## 8 · `rise/run` stays a slash

A fraction only builds up when both parts are numbers, so the general form of the rule sets differently
from its instances. Arguably correct — a variable numerator is deliberately a slash — but it means the
first line of the first example already needs the author to know the rule.

## 9 · The figure's numbering uses a hyphen where the lesson uses a minus

11 axis labels begin with `-` and none with `−`, on a page whose prose and working are written with `−`
throughout. The same number, set two ways, on one screen.

---

## One thing I got wrong, recorded because it is a repository rule, not an authoring one

The lesson was first written to `lessons/`. That directory **is** the corpus `verify-corpus-identity`
renders: every lesson in it, re-skinned to all five pack themes and compared byte for byte against the
reference ref. So a mathematics lesson put there gets re-skinned to `imperium` and `microhistory` — which
means nothing — and shows up as five differences on every run because it does not exist on `main`. CI said
so precisely: `7 lesson(s) × 5 theme(s) = 255 render units … ✗ 5/255 DIFFER (250 identical)`.

It now lives beside `docs/atlas/lesson/quadratics.app.json`, which the corpus gate does not read. This is
CLAUDE.md's rule — *a regression asset must not be the same object as a piece of courseware* — and the gate
caught it doing its job.

## Original next-step assessment (completed in Stage 5)

Nothing here argues for a structural equation editor yet, which matches the maintainer's position. The two
findings that actually put wrong or unreadable mathematics on the page — the `1/2x` trap and identical
curves — are not about how the expression is *stored*; they are about the editor saying nothing when what
you typed is not what you meant, and about the graph having no way to distinguish one line from another.

The cheapest useful work, in order: seed what you add (4); widen the fraction grammar to a bracketed sum
(2); warn when an expression's reading differs from its plain-text shape (1); give a graph object a colour
or a dash (3); and let a table be given its columns at once (5).
