#!/usr/bin/env node
// THE LESSON IS THE TEST OF THE SYSTEM.
//
//   node scripts/lesson-render.mjs [outDir]
//
// This renders one complete authored Mathematics lesson — docs/atlas/lesson/quadratics.lesson.json —
// using ONLY the frozen grammar, at desktop 1152 · tablet 834 · phone 382, in every tab and view
// state the lesson declares. It is the reverse of every pass before it: the atlas fragments were
// markup written to exercise the grammar; this is a lesson written to teach quadratics, and the
// grammar either expresses it or it does not.
//
// IF IT DOES NOT, THIS SCRIPT SAYS SO AND STOPS. Every node must name a composition, a collection
// mode or a views mode that the grammar contains; an unknown one is reported as an exact missing
// capability rather than quietly accommodated. Nothing here may be widened to make the lesson fit.
//
// THE ONE RULE: the author chooses the instructional structure; the renderer chooses only the
// prescribed responsive state and the media subdesign belonging to that structure.
//
// A FIGURE IS AUTHORED AS A PRESENTATION ROLE, AND THE SLOT GIVES IT ITS WIDTH:
//
//     media type -> presentationRole (authored) -> geometry class -> approved subdesign -> slot width
//
// `presentationRole` says what the object is FOR — explanatory, primary, supporting; geometry says
// what shape the plane must keep. Neither may answer the other's question, and the role is REQUIRED:
// a default would be the renderer deciding what the author's figure is for.
//
// THE WIDTH IS NOT THE FIGURE'S TO CHOOSE. Role × geometry class × surface selects one approved
// subdesign out of docs/atlas/composition/src/patterns.json, that subdesign declares a `slotSpan`,
// and the span is arithmetic on the master grid. The plane is then asked one question and one only:
// inside THIS width, at equal unit scale, what is the faithful rendering? Its height follows and the
// page grows. This replaced an authored `mediaSize` band, under which this lesson's two graphs
// painted at 683px and 1000px — widths the master grid does not have, because a band is a range and
// a grid is a ladder. The catalogue and this renderer now read one table.
//
// Prose length, rendered height, step count, occupancy and dead space are not inputs — and a control
// proves it by tripling the prose and doubling the steps and asserting every prescribed state AND
// every realised plane is unchanged. A second control drives a page narrow and back and asserts the
// wide state is identical to a fresh one, carrying no residue.
//
// The app is not changed by this script and does not read anything under docs/atlas/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openFigurePage, makePainter, makeSolvers, square, classOf } from './lib/figure-geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/atlas/worked-examples/src');
const LESSON_DIR = path.join(root, 'docs/atlas/lesson');
const OUT = path.resolve(process.argv[2] || LESSON_DIR);
fs.mkdirSync(OUT, { recursive: true });

const A = JSON.parse(fs.readFileSync(path.join(SRC, 'atlas.json'), 'utf8'));
const FIGS = JSON.parse(fs.readFileSync(path.join(SRC, 'figures.json'), 'utf8'));
const CSS_KIT = fs.readFileSync(path.join(SRC, 'atlas.css'), 'utf8');
const LESSON_FILE = path.join(LESSON_DIR, 'quadratics.lesson.json');
const LESSON = JSON.parse(fs.readFileSync(LESSON_FILE, 'utf8'));
const M = A.measures;

/* ── THE MASTER GRID AND THE APPROVED SUBDESIGNS, read rather than repeated ───────────────────────
   A media slot's width is arithmetic on the grid, and which slot a figure gets is the catalogue's
   answer, not this script's. Both files are read here so that the lesson and the composition atlas
   cannot arrive at two different widths for one figure. */
const COMP_SRC = path.join(root, 'docs/atlas/composition/src');
const GRID = JSON.parse(fs.readFileSync(path.join(COMP_SRC, 'grid.json'), 'utf8'));
const PATTERNS = JSON.parse(fs.readFileSync(path.join(COMP_SRC, 'patterns.json'), 'utf8'));
const colW = (s) => (GRID.surfaces[s].width - (GRID.surfaces[s].columns - 1) * GRID.surfaces[s].gutter) / GRID.surfaces[s].columns;
const span = (s, n) => n * colW(s) + (n - 1) * GRID.surfaces[s].gutter;
/* the atlas calls the handset surface `narrow` and the grid calls it `phone`; one mapping, here */
const GRID_SURFACE = { desktop: 'desktop', tablet: 'tablet', narrow: 'phone' };
/* CONTROL · THE TWO FILES DESCRIBE THE SAME SURFACES. The lesson renderer sets `--at-surface` from
   atlas.json and takes slot widths from grid.json; if those two ever disagreed about how wide a
   surface is, every span computed here would be arithmetic on a page that does not exist. */
for (const [sName, gName] of Object.entries(GRID_SURFACE)) {
  if (!GRID.surfaces[gName]) throw new Error(`the master grid has no "${gName}" surface`);
  if (GRID.surfaces[gName].width !== A.surfaces[sName])
    throw new Error(`the grid's ${gName} surface is ${GRID.surfaces[gName].width}px and the atlas's `
      + `${sName} surface is ${A.surfaces[sName]}px — a slot span would be arithmetic on the wrong page`);
}
/* THE ONE PATTERN A `visual` NODE IS: a primary visual and the reading of it. */
const VISUAL = PATTERNS['visual.explanation'];
if (!VISUAL) throw new Error('the composition catalogue has no `visual.explanation` pattern');
const ROLES = [...new Set(VISUAL.subdesigns.flatMap((d) => d.roles || []))];
/* A SUBDESIGN'S ARRANGEMENT IS READ OFF ITS OWN AREAS, never named a second time here: media and
   the reading on one row is `side`, on separate rows it is `down`. Naming it twice is how a
   catalogue and a renderer come to disagree about a page they both claim to describe. */
const arrangementOf = (d) => d.areas.some((r) => /\bmedia\b/.test(r) && /\binterpretation\b/.test(r)) ? 'side' : 'down';

/* ── THE FROZEN VOCABULARY, read out of the grammar rather than repeated here ─────────────────── */
const COMPOSITIONS = new Set(Object.entries(A.compositions)
  .filter(([k, v]) => k !== '_' && v && v.authored).map(([, v]) => v.authored));
const COLLECTION_MODES = new Set(Object.keys(A.collections)
  .filter((k) => k.startsWith('collection.')).map((k) => k.slice('collection.'.length)));
const VIEWS_MODES = new Set(Object.keys(A.collections)
  .filter((k) => k.startsWith('views.')).map((k) => k.slice('views.'.length)));

class MissingCapability extends Error {
  constructor(what, asked, available) {
    super(`THE GRAMMAR CANNOT EXPRESS THIS LESSON.\n\n  The lesson asks for ${what} "${asked}".\n`
      + `  The frozen grammar contains only: ${[...available].join(', ')}.\n\n`
      + `  Reported rather than accommodated: nothing is added to the grammar to make a lesson fit.`);
    this.name = 'MissingCapability';
  }
}

/* CONTROL · THE LESSON DESCRIBES INTENT, NOT LAYOUT ARITHMETIC. Scanned over the source, because the
   principle is about what an author is allowed to write. */
const ARITHMETIC = '\\b(leftWidth|rightWidth|colWidth|occupancy|preferSplit|maxDeadSpace'
  + '|growthWeight|trackWeight|minReadableBox|preferredBox|maximumUsefulBox|deadSpace'
  + '|fitScore|candidateScore|switchAt|breakpoint|px)\\b';
{
  const hit = new RegExp(ARITHMETIC).exec(fs.readFileSync(LESSON_FILE, 'utf8'));
  if (hit) throw new Error(`the lesson carries the layout key "${hit[1]}" — a lesson says what it IS, `
    + `never how the page should be arranged`);
}

/* ── content vocabulary: intent in, safe markup out ───────────────────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* the lesson writes *x* for a variable and ^2 for a superscript; it never writes markup */
const t = (s) => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\^([-−]?[0-9A-Za-z]+)/g, '<sup>$1</sup>');
const slug = (s) => String(s).toLowerCase().replace(/\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* a math value is one statement, or SEVERAL statements meant to stand side by side */
const mathOf = (v) => Array.isArray(v) ? v.map((x) => `<span class="at-stmt">${t(x)}</span>`).join('') : t(v);
const para = (p) => typeof p === 'string' ? `<p>${t(p)}</p>`
  : p.math ? `<p class="at-said">${mathOf(p.math)}</p>`
  : (() => { throw new MissingCapability('a paragraph kind', Object.keys(p).join('+'), ['text', 'math']); })();

const table = (tb) => `<div data-scroll-x="local"><table class="at-tbl">`
  + `<tr>${tb.head.map((c) => `<th>${t(c)}</th>`).join('')}</tr>`
  + tb.rows.map((r) => `<tr>${r.map((c) => `<td>${t(c)}</td>`).join('')}</tr>`).join('')
  + `</table></div>`;

const stepBody = (s) => s.math != null ? `<div class="at-sm">${mathOf(s.math)}</div>`
  : s.table ? table(s.table)
  : (() => { throw new MissingCapability('a step body', Object.keys(s).filter((k) => k !== 'say').join('+'), ['math', 'table']); })();

const steps = (list, label) => `<div data-slot="steps"><p class="at-lab">${esc(label)}</p><ol class="at-steps">`
  + list.map((s) => `<li class="at-step"><div class="at-st">${t(s.say)}</div>${stepBody(s)}</li>`).join('')
  + `</ol></div>`;

const answer = (a) => `<div data-slot="answer"><b>Answer</b>${t(a)}</div>`;
const synthesis = (s) => !s ? '' : `<section data-slot="synthesis"><p class="at-lab">${esc(s.label)}</p>`
  + s.paragraphs.map(para).join('') + `</section>`;

/* ── the compositions, and only the compositions ──────────────────────────────────────────────── */
function composition(node, figs) {
  const c = node.composition;
  if (!COMPOSITIONS.has(c)) throw new MissingCapability('a composition', c, COMPOSITIONS);
  if (c === 'single.flow')
    return `<article data-tpl="single.flow">`
      + (node.title ? `<h3 data-slot="title">${t(node.title)}</h3>` : '')
      + `<div data-slot="question"><p class="at-lab">Question</p>${node.question.map(para).join('')}</div>`
      + `<hr class="at-hr">${steps(node.steps, 'Worked solution')}${answer(node.answer)}`
      + synthesis(node.synthesis) + `</article>`;
  if (c === 'single.split')
    return `<article data-tpl="single.split">`
      + (node.title ? `<h3 data-slot="title">${t(node.title)}</h3>` : '')
      + `<div data-slot="question"><p class="at-lab">Scenario</p>${node.scenario.map(para).join('')}</div>`
      + `<div class="at-rule"></div>`
      + `<div data-slot="solution">${steps(node.steps, 'Worked solution')}${answer(node.answer)}</div>`
      + synthesis(node.synthesis) + `</article>`;
  if (c === 'comparison.paired')
    return `<article data-tpl="comparison.paired"><div data-slot="cases">`
      + node.cases.map((k) => `<section data-slot="case"><h4 data-slot="title">${t(k.label)}</h4>`
        + `<div data-slot="question"><p class="at-lab">Question</p>${k.question.map(para).join('')}</div>`
        + steps(k.steps, 'Worked solution') + answer(k.answer) + `</section>`).join('')
      + `</div>` + synthesis(node.synthesis) + `</article>`;
  if (c === 'visual') {
    /* THE ROLE IS REQUIRED AND IS NEVER INFERRED. It says what the object is FOR; the catalogue
       turns that, with the plane's own geometry class and the surface, into one approved slot. */
    if (!node.presentationRole) throw new MissingCapability('a presentationRole for the figure ' + node.figure,
      '(none authored)', ROLES);
    if (!ROLES.includes(node.presentationRole)) throw new MissingCapability('a presentationRole', node.presentationRole, ROLES);
    const req = `${node.figure}@${node.presentationRole}`;
    const f = figs[req];
    if (!f) throw new MissingCapability('a figure', node.figure, [...new Set(Object.values(figs).map((x) => x.key))]);
    return `<div data-tpl="visual" data-fig="${esc(req)}">`
      + (node.title ? `<h3 data-slot="title">${t(node.title)}</h3>` : '')
      + `<div data-slot="figure" data-fig-slot="${esc(req)}"><p class="at-lab">${esc(node.label || 'Graph')}</p>{{FIG:${req}}}</div>`
      + `<div data-slot="interpretation"><p class="at-lab">${esc(node.reading.label)}</p>`
      + node.reading.paragraphs.map(para).join('') + `</div></div>`;
  }
  throw new MissingCapability('a composition', c, COMPOSITIONS);
}

/* ── collections and views: WHICH related material is visible, never how it is arranged ───────── */
/* A TAB GROUP IS NAMED BY THE PANEL THAT CONTAINS IT — `topic` at the page, then the slug of the
   subtopic whose panel holds it. The same naming produces the state list below, so the selections
   and the groups cannot drift apart. */
function tabBar(groupName, kind, items, figs) {
  return `<div class="at-tabs" data-tabs="${esc(groupName)}" data-tabs-kind="${kind}">`
    + `<div class="at-tabbar" role="tablist" data-scroll-x="tabstrip">`
    + items.map((i) => `<button class="at-tab" type="button" role="tab" data-tab="${esc(slug(i.label))}">${t(i.label)}</button>`).join('')
    + `</div>`
    + items.map((i) => `<div class="at-panel" role="tabpanel" data-panel="${esc(slug(i.label))}">`
        + (i.lede ? `<p class="at-tabnote">${t(i.lede)}</p>` : '')
        + node(i.body, figs, slug(i.label)) + synthesis(i.synthesis) + `</div>`).join('')
    + `</div>`;
}
function collection(col, figs, groupName) {
  if (!COLLECTION_MODES.has(col.mode)) throw new MissingCapability('a collection mode', col.mode, COLLECTION_MODES);
  if (col.mode === 'repeat')
    return `<article data-tpl="collection.repeat"><div data-slot="examples">`
      + col.items.map((i) => `<div data-slot="example">${node(i, figs, groupName)}</div>`).join('<div class="at-div"></div>')
      + `</div></article>`;
  return `<article data-tpl="collection.tabs">${tabBar(groupName, 'collection', col.items, figs)}</article>`;
}
function views(v, figs, groupName) {
  if (!VIEWS_MODES.has(v.mode)) throw new MissingCapability('a views mode', v.mode, VIEWS_MODES);
  return `<div data-tpl="views.tabs">${tabBar(groupName, 'views', v.items, figs)}</div>`;
}
function node(n, figs, groupName = 'topic') {
  if (n.collection) return collection(n.collection, figs, groupName);
  if (n.views) return views(n.views, figs, groupName);
  if (n.composition) return composition(n, figs);
  throw new MissingCapability('a node kind', Object.keys(n).join('+'), ['composition', 'collection', 'views']);
}

/* ── the states the LESSON declares, enumerated from the JSON rather than listed by hand ──────── */
function groupsOf(n, name = 'topic', out = []) {
  if (!n || typeof n !== 'object') return out;
  if (n.collection && n.collection.mode === 'tabs') {
    out.push({ name, kind: 'collection', panels: n.collection.items.map((i) => slug(i.label)) });
    for (const i of n.collection.items) groupsOf(i.body, slug(i.label), out);
  } else if (n.views) {
    out.push({ name, kind: 'views', panels: n.views.items.map((i) => slug(i.label)) });
    for (const i of n.views.items) groupsOf(i.body, slug(i.label) + '-in', out);
  } else if (n.collection) {
    for (const i of n.collection.items) groupsOf(i, name, out);
  }
  return out;
}
function statesOf(n, name = 'topic') {
  if (n && n.collection && n.collection.mode === 'tabs') {
    return n.collection.items.flatMap((i) => {
      const inner = statesOf(i.body, slug(i.label));
      return inner.length
        ? inner.map((s) => ({ key: `${slug(i.label)}-${s.key}`, sel: { [name]: slug(i.label), ...s.sel } }))
        : [{ key: slug(i.label), sel: { [name]: slug(i.label) } }];
    });
  }
  if (n && n.views)
    return n.views.items.map((i) => ({ key: slug(i.label), sel: { [name]: slug(i.label) } }));
  if (n && n.collection) return [];
  return [];
}

const GROUPS = groupsOf(LESSON.page);
const STATES = statesOf(LESSON.page);
/* every group gets a selection in every state, so a group inside a closed panel still has one */
for (const s of STATES) for (const g of GROUPS) if (!(g.name in s.sel)) s.sel[g.name] = g.panels[0];

console.log(`lesson · ${LESSON.lesson} · ${LESSON.page.collection.items.length} subtopics`);
console.log(`groups  · ${GROUPS.map((g) => `${g.kind}:${g.name}[${g.panels.join('|')}]`).join('  ')}`);
console.log(`states  · ${STATES.map((s) => s.key).join(', ')}`);

/* ── render ───────────────────────────────────────────────────────────────────────────────────── */
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const APP_CSS = await (async () => {
  const p = await browser.newPage();
  await p.goto(base, { waitUntil: 'load' });
  const css = await p.evaluate(() => [].slice.call(document.styleSheets)
    .map((sh) => { try { return [].slice.call(sh.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n'));
  await p.close();
  return css;
})();
if (!/\.mx-figskin\.tp-slide/.test(APP_CSS)) throw new Error('the lifted stylesheet is missing the figure token mapping');

const figPage = await openFigurePage(browser, base);
/* a REQUEST is a figure in an authored ROLE, because the same plane presented two ways is two
   figures as far as the composition is concerned — and one of them is not the other in a wrapper */
const wantFigs = new Set([...JSON.stringify(LESSON)
  .matchAll(/"figure":\s*"([a-z0-9-]+)",\s*"presentationRole":\s*"([a-z]+)"/g)].map((m) => `${m[1]}@${m[2]}`));

/* ROLE × GEOMETRY CLASS × SURFACE → ONE APPROVED SUBDESIGN. Exactly the catalogue's selection, with
   no fallback: a role the pattern has not approved for this surface and aspect is reported, because
   choosing the nearest one would be the renderer deciding what the author's figure is for. */
function pickSubdesign(gs, aspect, role) {
  const m = VISUAL.subdesigns.filter((d) => d.surface === gs && (!d.aspects || d.aspects.includes(aspect))
    && (!d.roles || d.roles.includes(role)));
  if (!m.length) {
    const byAspect = VISUAL.subdesigns.filter((d) => d.surface === gs && (!d.aspects || d.aspects.includes(aspect)));
    throw new MissingCapability(`an approved ${gs} subdesign for a ${aspect} plane presented as \`${role}\``,
      `${gs}/${aspect}/${role}`,
      byAspect.length ? byAspect.map((d) => `${d.id}[${(d.roles || ['any']).join('|')}]`) : ['nothing for this aspect']);
  }
  /* SEVERAL APPROVED ANSWERS ARE ORDERED BY SPAN, SMALLEST FIRST — the catalogue's own rule. The
     narrowest approved slot a figure can render faithfully in is the one it gets; a wider one is a
     promotion the figure had to earn by not fitting. */
  return m.slice().sort((a, b) => (a.slotSpan || 0) - (b.slotSpan || 0));
}

/* THE PLANE IS ASKED ONE QUESTION: inside THIS width, at equal unit scale, what is the faithful
   rendering? It has no way to express a width it would prefer, and nothing here reads prose. */
async function measureLessonFigures(want) {
  const paint = makePainter(figPage);
  const { boxForWidth } = makeSolvers(paint);
  const out = {};
  for (const req of want) {
    const [key, role] = String(req).split('@');
    const f = FIGS[key];
    if (!f) throw new MissingCapability('a figure', key, Object.keys(FIGS).filter((k) => k[0] !== '_'));
    const d = f.figure.domain, xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
    const cls = classOf(ys / xs, A.mediaGeometry.bands);
    const box = {}, sub = {}, chosen = {}, at = {};
    for (const sName of Object.keys(A.surfaces)) {
      const gs = GRID_SURFACE[sName];
      const ladder = pickSubdesign(gs, cls, role);
      let got = null, tried = [];
      for (const cand of ladder) {
        const w = Math.round(span(gs, cand.slotSpan));
        tried.push(`${cand.id} ${w}px`);
        const r = await boxForWidth(key, f.figure, w);
        if (r && square(r.box)) { got = { d: cand, w, box: r.box }; break; }
      }
      /* NO APPROVED SPAN RENDERS THIS PLANE FAITHFULLY. Reported, never accommodated: widening the
         catalogue to fit one figure is the system making the lesson fit rather than the reverse. */
      if (!got) throw new Error(`${req}: no approved ${gs} span paints this domain at equal unit `
        + `scale (tried ${tried.join(', ')})`);
      box[sName] = got.box; sub[sName] = arrangementOf(got.d); chosen[sName] = got.d; at[sName] = got.w;
    }
    out[req] = { key, role, cls, sub, chosen, at, box,
      resolved: Object.fromEntries(Object.keys(sub).map((k) => [k, 'visual.' + sub[k]])) };
  }
  return out;
}

console.log('\npresentation role and media geometry — the figures this lesson authors');
const FIG = await measureLessonFigures(wantFigs);
for (const [req, f] of Object.entries(FIG))
  console.log(`  ${req.padEnd(22)} ${f.cls.padEnd(9)} → `
    + Object.keys(A.surfaces).map((n) => `${n} ${f.chosen[n].id} span ${f.chosen[n].slotSpan} = `
      + `${f.at[n]}px → ${f.box[n].w}×${f.box[n].h}`).join(' · '));

/* CONTROL · EVERY SLOT WIDTH IS A RUNG OF THE MASTER GRID. A width that is nobody's span is how a
   683px graph reached a 1152px page: it satisfied a band and belonged to no column. */
for (const [req, f] of Object.entries(FIG)) for (const sName of Object.keys(A.surfaces)) {
  const gs = GRID_SURFACE[sName], g = GRID.surfaces[gs];
  const rungs = [];
  for (let n = 1; n <= g.columns; n++) rungs.push(Math.round(span(gs, n)));
  if (!rungs.includes(f.box[sName].w))
    throw new Error(`${req} paints ${f.box[sName].w}px on the ${gs} surface — the grid's spans are `
      + `${rungs.join(', ')}, and a width that is nobody's span belongs to no column`);
}

/* CONTROL · THE GENERATED SLOT CSS IS FOR SLOTS THAT EXIST. Every subdesign this lesson actually
   selects must be one the stylesheet below emits a rule for, or a centred stage would silently be
   a left-aligned one. */
const SLOT_CSS = (sName) => {
  const gs = GRID_SURFACE[sName], out = [];
  for (const d of VISUAL.subdesigns) {
    if (d.surface !== gs || !d.slotSpan) continue;
    const w = Math.round(span(gs, d.slotSpan));
    /* A `center` anchor is a STAGE: the block is exactly its slot and sits in the middle of the
       page. `full` needs no rule — the slot already is the surface. */
    if (d.slotAnchor === 'center') out.push(`[data-tpl="visual"][data-subdesign="${d.id}"]{width:${w}px;margin-inline:auto;}`);
  }
  return out.join('\n');
};

const tokens = (surface, pad) => `:root{
  --at-surface:${surface}px; --at-pad:${pad}px; --at-gap:${M.gap}px;
  --at-m-flow:${M.flow}px; --at-m-solution:${M.solution}px; --at-m-interp:${M.interpretation}px;
  --at-m-case:${M.case}px; --at-m-synthesis:${M.synthesis}px;
  --at-split-prompt:${M.splitPromptPct}; --at-split-prompt-max:${M.splitPromptMax}px;
  --at-split-solution-max:${M.splitSolutionMax}px;
  --at-pane-h:${M.paneH}px; --at-pane-min-h:${M.paneMinH}px;
}`;
const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

const SWITCH = {};
for (const [, v] of Object.entries(A.compositions))
  if (v && typeof v === 'object' && typeof v.switchAt === 'number') SWITCH[v.authored] = v.switchAt;

const BODY = node(LESSON.page, FIG);

async function shot(name, state, surfaceName, opts = {}) {
  const surface = A.surfaces[surfaceName], pad = A.surfacePad[surfaceName];
  let body = opts.body || BODY;
  const used = [];
  body = body.replace(/\{\{FIG:([a-z0-9-]+@[a-z]+)\}\}/gi, (m, key) => {
    const f = FIG[key]; used.push(key);
    const box = f.box[surfaceName];
    if (box.w > surface + 1) throw new Error(`${name}: ${key} needs ${box.w}px in a ${surface}px region`);
    return skin(box.w, box.h, box.html);
  });
  for (const key of used) {
    const f = FIG[key], d = f.chosen[surfaceName];
    body = body.split(`data-fig="${key}"`).join(`data-fig="${key}" data-fig-class="${f.cls}" `
      + `data-media-role="${f.role}" data-sub="${f.sub[surfaceName]}" data-subdesign="${d.id}" `
      + `data-slot-span="${d.slotSpan}"`);
    body = body.split(`data-fig-slot="${key}"`).join(`data-fig-slot="${key}" data-anchor="${d.slotAnchor}"`);
  }
  /* THE FIGURE NO LONGER CARRIES A SWITCH POINT. Its arrangement is the approved subdesign for THIS
     surface, chosen before the page was built; the remaining switch points belong to compositions
     that hold no media (`single.split`, `comparison.paired`) and are unchanged. */
  const figSwitch = {};

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface, pad)}
${CSS_KIT}
${SLOT_CSS(surfaceName)}
</style></head><body class="mx${surfaceName === 'desktop' ? '' : ' at-' + surfaceName}"><div class="at-page">
<div class="at-cap"><span class="at-tpl">${esc(LESSON.lesson)} · ${surfaceName} ${surface}px · ${esc(state.key)}</span>${esc(LESSON.stage)} — rendered from lesson JSON through the frozen grammar; no fragment, no fixture.</div>
<div class="at-surface"><h2 class="at-h2">${t(LESSON.page.title)}</h2><p class="at-sub">${t(LESSON.page.lede)}</p>
${body}</div>
<div class="at-note">scroll.y = ${esc(LESSON.page.scroll.y)} · scroll.x = ${esc(LESSON.page.scroll.x)}. The author chose the structure; the renderer chose only the prescribed responsive state (from the ${surface}px surface alone) and the media subdesign.</div>
</div></body></html>`;

  const p = await browser.newPage({ viewport: { width: surface + 2 * pad + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.setContent(doc, { waitUntil: 'load' });

  /* the only two things stamped, and neither reads content */
  const stampFn = ({ SWITCH, figSwitch, surface, sel }) => {
    const surf = document.querySelector('.at-surface');
    for (const el of surf.querySelectorAll('[data-tpl]')) {
      const fig = el.getAttribute('data-fig');
      const at = fig && figSwitch[fig] != null ? figSwitch[fig] : (fig ? null : SWITCH[el.getAttribute('data-tpl')]);
      el.setAttribute('data-state', at && surface < at ? 'narrow' : 'wide');
    }
    for (const el of surf.querySelectorAll('[data-slot="cases"]')) {
      const owner = el.parentElement.closest('[data-state]');
      el.setAttribute('data-state', owner ? owner.getAttribute('data-state') : 'wide');
    }
    const missing = [];
    for (const g of surf.querySelectorAll('[data-tabs]')) {
      const nm = g.getAttribute('data-tabs'), active = sel[nm];
      if (!active) { missing.push(nm); continue; }
      g.setAttribute('data-active', active);
      for (const b of g.querySelectorAll(':scope > .at-tabbar > .at-tab')) {
        const on = b.getAttribute('data-tab') === active;
        if (on) b.setAttribute('data-on', ''); else b.removeAttribute('data-on');
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      }
      for (const q of g.querySelectorAll(':scope > .at-panel')) {
        if (q.getAttribute('data-panel') === active) q.setAttribute('data-shown', ''); else q.removeAttribute('data-shown');
      }
      /* SELECTING A TAB BRINGS IT FULLY INTO VIEW. The strip is one scrolling row, so the current
         item must not be half off the end. Set outright rather than animated — a render must be
         reproducible, and a smooth scroll is a race. */
      const bar = g.querySelector(':scope > .at-tabbar');
      const on = bar && bar.querySelector('.at-tab[data-on]');
      if (on && bar.scrollWidth > bar.clientWidth) {
        const l = on.offsetLeft, r = l + on.offsetWidth;
        if (l < bar.scrollLeft) bar.scrollLeft = l;
        else if (r > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = r - bar.clientWidth;
      }
    }
    return missing;
  };
  const missing = await p.evaluate(stampFn, { SWITCH, figSwitch, surface, sel: state.sel });
  if (missing.length) throw new Error(`${name}: tab group(s) ${missing.join(', ')} were never given a selection`);

  /* CONTROL · NO RESIDUE ACROSS THE THRESHOLD. The switch is a pure width comparison, so driving the
     same page instance narrow and back must restore the wide arrangement exactly — nothing may be
     carried from the state it passed through. */
  let residue = null;
  if (opts.bounce) {
    const read = () => [].slice.call(document.querySelectorAll('.at-surface [data-tpl]'))
      .map((e) => `${e.getAttribute('data-tpl')}:${e.getAttribute('data-state')}:${Math.round(e.getBoundingClientRect().width)}`).join('|');
    const fresh = await p.evaluate(read);
    await p.evaluate(stampFn, { SWITCH, figSwitch, surface: A.surfaces.narrow, sel: state.sel });
    await p.evaluate(stampFn, { SWITCH, figSwitch, surface, sel: state.sel });
    const after = await p.evaluate(read);
    residue = { fresh, after };
  }
  await p.waitForTimeout(380);

  const m = await p.evaluate(({ flow }) => {
    const surf = document.querySelector('.at-surface');
    const vis = (el) => el.getClientRects().length > 0;
    const seen = [];
    const walk = document.createTreeWalker(surf, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('svg') || !vis(el)) continue;
      const s = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (s) seen.push(s);
    }
    const tabSig = [].slice.call(surf.querySelectorAll('[data-tabs]')).map((x) => {
      let d = 0; for (let q = x.parentElement; q && q !== surf; q = q.parentElement) if (q.hasAttribute('data-tabs')) d++;
      const labels = [].slice.call(x.querySelectorAll(':scope > .at-tabbar > .at-tab')).map((b) => b.textContent.replace(/\s+/g, ' ').trim());
      const panels = [].slice.call(x.querySelectorAll(':scope > .at-panel')).map((b) => b.getAttribute('data-panel'));
      return `${d}:${x.getAttribute('data-tabs-kind')}:${x.getAttribute('data-tabs')}[${labels.join('|')}]{${panels.join('|')}}`;
    }).join(' ; ');
    const affordance = [].slice.call(surf.querySelectorAll('[data-tabs]')).map((x) => {
      let d = 0; for (let q = x.parentElement; q && q !== surf; q = q.parentElement) if (q.hasAttribute('data-tabs')) d++;
      const bar = x.querySelector(':scope > .at-tabbar'), on = x.querySelector(':scope > .at-tabbar > .at-tab[data-on]');
      const cb = getComputedStyle(bar), co = on ? getComputedStyle(on) : null;
      const tabs = [].slice.call(bar.querySelectorAll('.at-tab'));
      const rows = new Set(tabs.map((b) => b.offsetTop)).size;
      const br = bar.getBoundingClientRect(), orc = on ? on.getBoundingClientRect() : null;
      return { rows, scrolls: bar.scrollWidth > bar.clientWidth + 1,
        activeWhole: !orc || (orc.left >= br.left - 1 && orc.right <= br.right + 1),
        kind: x.getAttribute('data-tabs-kind'), depth: d,
        sig: co ? [cb.borderBottomWidth, cb.borderTopWidth, cb.borderRadius, co.backgroundColor, co.borderBottomWidth, co.borderRadius].join('/') : 'none' };
    });
    const figs = [].slice.call(surf.querySelectorAll('[data-slot="figure"]')).filter(vis).map((r) => {
      const q = r.querySelector('[data-mx-part="figure"]'), svg = r.querySelector('.tp-fig-svg');
      let ratio = null;
      if (svg) {
        const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
        const rect = svg.getBoundingClientRect();
        const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
        const val = (x) => parseFloat(x.textContent.replace('−', '-'));
        const per = (a, at) => { const z = labs.filter((x) => x.getAttribute('text-anchor') === a)
            .map((x) => ({ v: val(x), px: +x.getAttribute(at) })).filter((o) => isFinite(o.v));
          if (z.length < 2) return null; z.sort((i, j) => i.v - j.v);
          const d = z[z.length - 1].v - z[0].v; return d ? Math.abs((z[z.length - 1].px - z[0].px) / d) : null; };
        const ux = per('middle', 'x'), uy = per('end', 'y');
        if (ux && uy) ratio = +((ux * rect.width / vb[2]) / (uy * rect.height / vb[3])).toFixed(3);
      }
      const own = r.closest('[data-tpl]');
      return { region: Math.round(r.getBoundingClientRect().width), ratio,
        plane: q ? Math.round(q.getBoundingClientRect().width) : null,
        planeH: q ? Math.round(q.getBoundingClientRect().height) : null,
        role: own && own.getAttribute('data-media-role'), cls: own && own.getAttribute('data-fig-class'),
        subdesign: own && own.getAttribute('data-subdesign'),
        slotSpan: own && +own.getAttribute('data-slot-span'),
        anchor: r.getAttribute('data-anchor'),
        /* THE STAGE, AS PAINTED: how wide the composition block is and how much page is left on
           each side of it. A `center` anchor that is not actually centred shows up here as two
           unequal numbers, and a slot that does not fill its block shows up as `block > region`. */
        block: own ? Math.round(own.getBoundingClientRect().width) : null,
        ...(() => {
          if (!own) return { freeL: null, freeR: null, page: null };
          /* AGAINST THE CONTENT BOX OF WHATEVER HOLDS THE COMPOSITION, not its border box: the
             surface carries the page pad and a panel may carry its own, and counting either as free
             page would make every full-width stage look inset. */
          const h = own.parentElement, hr = h.getBoundingClientRect(), hs = getComputedStyle(h);
          const l = hr.left + parseFloat(hs.paddingLeft), rr = hr.right - parseFloat(hs.paddingRight);
          const b = own.getBoundingClientRect();
          return { freeL: Math.round(b.left - l), freeR: Math.round(rr - b.right), page: Math.round(rr - l) };
        })(),
        fig: own && own.getAttribute('data-fig') };
    });
    const scrollers = { y: [], x: [] };
    for (const el of surf.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const cs = getComputedStyle(el), dx = el.getAttribute('data-scroll-x'), dy = el.getAttribute('data-scroll-y');
      /* the tab strip's overflow-x:auto coerces overflow-y to auto too, exactly as a local-x region
         does — neither is a vertical scroller */
      if (/^(auto|scroll)$/.test(cs.overflowY) && dx !== 'local' && dx !== 'tabstrip') scrollers.y.push({ declared: dy });
      if (/^(auto|scroll)$/.test(cs.overflowX) && dy !== 'pane') scrollers.x.push({ declared: dx,
        w: Math.round(el.getBoundingClientRect().width), sw: el.scrollWidth,
        parent: Math.round(el.parentElement.getBoundingClientRect().width) });
    }
    const wide = [].slice.call(surf.querySelectorAll('p, .at-st, [data-slot="answer"]'))
      .filter((n) => vis(n) && !n.closest('[data-scroll-x="local"]') && !n.classList.contains('at-sm') && !n.classList.contains('at-lab'))
      .map((n) => ({ w: Math.round(n.getBoundingClientRect().width), s: n.textContent.slice(0, 44) }))
      .filter((n) => n.w > flow + 1);
    /* THE FRAME MUST HOLD THE SURFACE. A page whose frame is narrower than the surface inside it
       clips the right-hand edge of every line, and the document never scrolls sideways while it
       happens — so the document-level control is blind to it. Measured here instead. */
    const pg = document.querySelector('.at-page');
    const clip = { sw: pg.scrollWidth, cw: pg.clientWidth };
    const frame = ['html', 'body', '.at-page', '.at-surface'].map((s) => {
      const el = document.querySelector(s), cs = getComputedStyle(el);
      return { s, maxHeight: cs.maxHeight, overflowY: cs.overflowY };
    });
    /* REPORTED, NEVER ACTED ON. In `visual.side` the figure column and the reading column rarely
       end level, and the difference is worth knowing when judging whether the page looks finished.
       It is recorded and printed; nothing reads it back. Measuring it in order to resize either
       column would be the resolver, which is what this whole grammar exists to prevent. */
    const sideBalance = [].slice.call(surf.querySelectorAll('[data-tpl="visual"][data-sub="side"][data-state="wide"]'))
      .filter(vis).map((v) => {
        const f = v.querySelector('[data-slot="figure"]'), i = v.querySelector('[data-slot="interpretation"]');
        return { figure: Math.round(f.getBoundingClientRect().height),
                 reading: Math.round(i.getBoundingClientRect().height) };
      });
    const inline = [].slice.call(surf.querySelectorAll('[data-tpl],[data-slot],[data-tabs],[data-scroll-x],[class^="at-"]'))
      .filter((e) => e.style.width || e.style.gridTemplateColumns || e.style.height || e.style.maxHeight)
      .filter((e) => !e.hasAttribute('data-fig-viewport'))
      .map((e) => e.tagName + '.' + e.className);
    return { clip, sideBalance, payload: seen.join(' '), tabSig, affordance, figs, scrollers, wide, frame, inline,
      tpls: [].slice.call(surf.querySelectorAll('[data-tpl]')).map((n) => n.getAttribute('data-tpl')),
      resolved: [].slice.call(surf.querySelectorAll('[data-tpl]')).map((n) => {
        const x = n.getAttribute('data-tpl'), sb = n.getAttribute('data-sub'); return sb ? x + '.' + sb : x; }),
      states: [].slice.call(surf.querySelectorAll('[data-tpl]')).map((n) => `${n.getAttribute('data-tpl')}:${n.getAttribute('data-state')}`),
      docH: Math.round(document.documentElement.scrollHeight),
      docW: Math.round(document.documentElement.scrollWidth),
      docCW: Math.round(document.documentElement.clientWidth),
      slots: [].slice.call(surf.querySelectorAll('[data-slot]')).filter(vis).map((n) => n.getAttribute('data-slot')).join(',') };
  }, { flow: M.flow });

  if (!opts.noShot) {
    const bb = await (await p.$('.at-page')).boundingBox();
    await p.setViewportSize({ width: surface + 2 * pad + 120, height: Math.ceil(bb.height) + 8 });
    await p.waitForTimeout(160);
    await (await p.$('.at-page')).screenshot({ path: path.join(OUT, name + '.png') });
  }
  if (errs.length) throw new Error(`${name}: ${errs[0]}`);
  await p.close();
  return { m, residue, surface, surfaceName, used };
}

/* ── the controls ─────────────────────────────────────────────────────────────────────────────── */
const payloads = {}, AFFORD = {}, REPORT = [], LIVE_X = [];
function verify(name, state, r) {
  const m = r.m;
  if (m.tabSig !== SIG) throw new Error(`${name}: the tab structure is\n    ${m.tabSig}\n  but the lesson declares\n    ${SIG}`);
  for (const g of m.affordance) {
    if (g.sig === 'none') throw new Error(`${name}: the ${g.kind} group paints no current tab`);
    /* CONTROL · THE STRIP IS ONE ROW, AND THE CURRENT ITEM IS WHOLE. Four tabs falling onto a
       second line reads as an accident; a current tab half off the end is worse. */
    if (g.rows !== 1)
      throw new Error(`${name}: the ${g.kind} tab strip wrapped onto ${g.rows} rows — it must stay one `
        + `row and scroll, never wrap`);
    if (!g.activeWhole)
      throw new Error(`${name}: the current tab in the ${g.kind} strip is not fully in view`);
    if (!AFFORD[g.kind]) AFFORD[g.kind] = { name, sig: g.sig, depth: g.depth };
    else if (AFFORD[g.kind].sig !== g.sig)
      throw new Error(`${name}: a ${g.kind} group at depth ${g.depth} paints a different affordance from `
        + `the one at depth ${AFFORD[g.kind].depth} in ${AFFORD[g.kind].name}`);
  }
  for (const x of m.resolved) {
    const bare = x.replace(/\.(side|down)$/, '');
    if (!COMPOSITIONS.has(bare) && !/^(collection|views)\./.test(bare))
      throw new Error(`${name}: ${x} is not a name in the frozen grammar`);
  }
  if (m.inline.length) throw new Error(`${name}: inline geometry on ${m.inline[0]}`);
  for (const f of m.figs) {
    if (f.plane == null) throw new Error(`${name}: a figure region contains no painted plane`);
    /* CONTROL · A BOUNDED WRAPPER IS NOT A SIZE. The PAINTED PLANE must itself occupy the width the
       authored size class prescribes — a band-sized box around an unchanged narrow plane would pass
       any measurement of the region and fail this one. */
    if (f.region - f.plane > 1) throw new Error(`${name}: a figure region is ${f.region}px around a ${f.plane}px plane`);
    if (!f.role) throw new MissingCapability('a presentationRole for a painted figure', '(none)', ROLES);
    /* CONTROL · THE PLANE IS THE SLOT, TO THE PIXEL. The subdesign declares a span, the grid turns
       it into a width, and the painted plane is that width — not a band containing it. This is the
       control the `mediaSize` band could not state: a band is satisfied by any width inside it, so
       683px passed while belonging to no column. */
    const gs = GRID_SURFACE[r.surfaceName], want = Math.round(span(gs, f.slotSpan));
    if (Math.abs(f.plane - want) > 1)
      throw new Error(`${name}: ${f.fig} painted ${f.plane}px in ${f.subdesign}, whose slotSpan `
        + `${f.slotSpan} is ${want}px on the ${gs} grid`);
    /* CONTROL · THE ANCHOR IS THE ONE THE SUBDESIGN DECLARES. `center` means centred on the page;
       `full` means the block is the surface. Neither is inferred, and an anchor that painted as the
       other one would leave the composition claiming an arrangement it does not have. */
    if (f.anchor === 'center') {
      if (Math.abs(f.freeL - f.freeR) > 1)
        throw new Error(`${name}: ${f.fig} declares a centred stage and painted ${f.freeL}px to its `
          + `left and ${f.freeR}px to its right`);
      if (f.freeL < 1)
        throw new Error(`${name}: ${f.fig} declares a centred stage and there is no page beside it — `
          + `a centred slot that fills the surface is a full one`);
    } else if (f.anchor === 'full') {
      if (f.freeL > 1 || f.freeR > 1)
        throw new Error(`${name}: ${f.fig} declares a full-width stage and painted ${f.freeL}/${f.freeR}px `
          + `of page beside it`);
    } else throw new Error(`${name}: ${f.fig} painted with slot anchor "${f.anchor}"`);
    if (f.block - f.region > 1)
      throw new Error(`${name}: ${f.fig} sits in a ${f.block}px composition block around a ${f.region}px slot`);
    if (f.ratio != null && Math.abs(f.ratio - 1) > 0.01)
      throw new Error(`${name}: a plane painted at ${f.ratio} — one x-unit and one y-unit are not the same length`);
  }
  if (m.wide.length) throw new Error(`${name}: ${m.wide.length} paragraph(s) past the ${M.flow}px measure — ${m.wide[0].w}px: “${m.wide[0].s}…”`);
  if (m.docW > m.docCW + 1) throw new Error(`${name}: the page itself scrolls sideways`);
  /* CONTROL · THE FRAME HOLDS THE SURFACE. Overflow inside the page clips text without ever making
     the document scroll, so it needs its own measurement. */
  if (m.clip.sw > m.clip.cw + 1)
    throw new Error(`${name}: the page frame is ${m.clip.cw}px around ${m.clip.sw}px of surface — `
      + `the right-hand edge of every line is being clipped`);
  for (const f of m.frame) {
    if (f.maxHeight !== 'none') throw new Error(`${name}: ${f.s} declares max-height ${f.maxHeight}`);
    if (f.overflowY !== 'visible') throw new Error(`${name}: ${f.s} has overflow-y ${f.overflowY}`);
  }
  if (m.scrollers.y.length) throw new Error(`${name}: ${m.scrollers.y.length} vertically scrolling region(s) on a scroll.y = page lesson`);
  /* `scroll.x = local-when-needed` is a PERMISSION, not a promise. A lesson's table of values fits
     its region on a 1152px surface and overflows on a 382px one, and both are correct — demanding
     overflow at every width would mean padding the table until the control passed, which is the
     system making the lesson fit rather than the other way round. So each region is checked for
     being local and well-behaved here, and the run as a whole must exercise the permission at least
     once (asserted after every render) so it cannot be vacuous. */
  /* CONTROL · ONLY A PERMITTED CONTRACT MAY SCROLL SIDEWAYS. Two exist: `local` for authored
     indivisible material, and `tabstrip` for the one-row tab strip. Anything else is a defect. */
  for (const s of m.scrollers.x) {
    if (s.declared !== 'local' && s.declared !== 'tabstrip')
      throw new Error(`${name}: a region scrolls horizontally without a contract that permits it`);
    if (s.declared === 'tabstrip') continue;
    if (s.w > s.parent + 1) throw new Error(`${name}: an over-wide region widened the region it is in`);
    if (s.sw > s.w + 1) LIVE_X.push(`${name} (${s.sw}px in ${s.w}px)`);
  }
  const pk = state.key;
  if (payloads[pk] && payloads[pk].payload !== m.payload) {
    const a = payloads[pk].payload, b = m.payload;
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    throw new Error(`${name}: the instructional payload differs from ${payloads[pk].name} — identical content is `
      + `required at every width.\n  …${a.slice(Math.max(0, i - 40), i + 80)}\n  …${b.slice(Math.max(0, i - 40), i + 80)}`);
  }
  if (payloads[pk] && payloads[pk].slots !== m.slots) throw new Error(`${name}: the slot sequence differs from ${payloads[pk].name}`);
  if (payloads[pk] && payloads[pk].tpls !== m.tpls.join(',')) throw new Error(`${name}: the compositions differ from ${payloads[pk].name}`);
  if (!payloads[pk]) payloads[pk] = { name, payload: m.payload, slots: m.slots, tpls: m.tpls.join(',') };
  if (r.residue && r.residue.fresh !== r.residue.after)
    throw new Error(`${name}: driving the page narrow and back did not restore the wide arrangement.\n`
      + `  fresh  ${r.residue.fresh}\n  after  ${r.residue.after}`);
  return m;
}

let SIG = null;
console.log('\nrendering the lesson');
for (const state of STATES) {
  for (const surfaceName of Object.keys(A.surfaces)) {
    const name = `lesson-${state.key}-${surfaceName}`;
    const r = await shot(name, state, surfaceName, { bounce: surfaceName === 'desktop' });
    if (SIG == null) SIG = r.m.tabSig;
    const m = verify(name, state, r);
    REPORT.push({ image: name, state: state.key, surface: r.surface, surfaceName: r.surfaceName,
      sideBalance: m.sideBalance, figs: m.figs,
      compositions: m.tpls, resolved: [...new Set(m.resolved)], states: m.states,
      pageHeight: m.docH, scrollX: m.scrollers.x.length, figures: r.used.map((k) => `${k}:${FIG[k].cls}→${FIG[k].chosen[r.surfaceName].id} span `
        + `${FIG[k].chosen[r.surfaceName].slotSpan}@${FIG[k].box[r.surfaceName].w}×${FIG[k].box[r.surfaceName].h}`) });
    console.log(`  ${name.padEnd(46)} ${String(r.surface).padStart(4)}px  page ${String(m.docH).padStart(5)}px`
      + `  ${[...new Set(m.resolved)].filter((x) => x.includes('.')).join(' ')}`
      + (m.figs.length ? '  · ' + m.figs.map((f) => `${f.fig} ${f.plane}×${f.planeH}`).join(' ') : ''));
  }
}

/* CONTROL · THE SWITCH POINT USES ONLY PERMITTED INPUTS. Triple the prose and double the steps —
   every content measurement the rule is forbidden to consult — and assert every prescribed state is
   character-identical. If prose length, step count or rendered height had leaked in, this moves. */
console.log('\ncontrol · content perturbation must not move a prescribed state OR a realised plane');
const swollen = BODY
  .replace(/<p>([^<][\s\S]*?)<\/p>/g, (mm, inner) => `<p>${inner}</p><p>${inner}</p><p>${inner}</p>`)
  .replace(/<li class="at-step">([\s\S]*?)<\/li>/g, (mm, inner) => `<li class="at-step">${inner}</li><li class="at-step">${inner}</li>`);
for (const state of STATES) {
  for (const surfaceName of Object.keys(A.surfaces)) {
    const ref = REPORT.find((x) => x.state === state.key && x.surfaceName === surfaceName);
    const sig = (x) => x.states.join('|') + ' // ' + x.figs.map((f) => `${f.fig}:${f.plane}x${f.planeH}`).join(',');
    const plain = sig({ states: ref.states, figs: ref.figs });
    const r = await shot('perturb', state, surfaceName, { body: swollen, noShot: true });
    const got = sig(r.m);
    if (got !== plain)
      throw new Error(`content perturbation moved a prescribed state or a realised plane at ${surfaceName} / ${state.key}\n`
        + `  plain    ${plain}\n  swollen  ${got}`);
  }
  console.log(`  ${state.key.padEnd(34)} unchanged at every width`);
}

await figPage.close(); await browser.close(); server.close();

/* CONTROL · THE PERMISSION WAS ACTUALLY NEEDED SOMEWHERE. If no region ever overflowed at any
   width, `scroll.x = local-when-needed` was never exercised and the declaration proves nothing. */
if (!LIVE_X.length) throw new Error('no region overflowed horizontally at any width — the lesson '
  + 'declares scroll.x = local-when-needed but never needs it, so the contract is untested');
console.log(`\ncontrol · scroll.x = local-when-needed was needed at ${LIVE_X.length} render(s)`);
console.log(`  first: ${LIVE_X[0]}`);

const BAL = REPORT.filter((r) => r.sideBalance.length);
if (BAL.length) {
  console.log('\nvisual.side — figure column against reading column (REPORTED, never acted on)');
  for (const r of BAL) for (const b of r.sideBalance)
    console.log(`  ${r.image.padEnd(46)} figure ${String(b.figure).padStart(4)}px  reading ${String(b.reading).padStart(4)}px`
      + `  trailing ${String(b.figure - b.reading).padStart(4)}px`);
}

console.log('\nTHE GRAMMAR, AS THE LESSON USED IT');
const used = [...new Set(REPORT.flatMap((r) => r.resolved))].sort();
for (const u of used) console.log(`  ${u}`);
const unused = [...COMPOSITIONS].filter((c) => !used.some((u) => u === c || u.startsWith(c + '.')));
console.log(`  (not needed by this lesson: ${unused.join(', ') || 'none'})`);
console.log('\nTHE TWO TAB KINDS');
for (const [k, v] of Object.entries(AFFORD)) console.log(`  ${k.padEnd(11)} ${v.sig}`);
fs.writeFileSync(path.join(OUT, 'lesson-report.json'), JSON.stringify(REPORT, null, 2));
console.log(`\nwrote ${path.relative(root, OUT)} — ${REPORT.length} renders, ${STATES.length} states × ${Object.keys(A.surfaces).length} surfaces`);
