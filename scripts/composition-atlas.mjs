#!/usr/bin/env node
// THE COMPOSITION ATLAS — a small catalogue of page patterns on one master grid.
//
//   node scripts/composition-atlas.mjs [outDir]
//
// THE ARCHITECTURE THIS PROTOTYPE EXISTS TO TEST:
//
//   LESSON SEMANTICS -> PAGE PATTERN -> APPROVED SUBDESIGN -> NAMED SLOTS ON MASTER GRID
//     -> BLOCKS OCCUPY SLOTS -> MEDIA FITS ITS SLOT
//
// and not: measure everything -> compare dimensions -> infer arrangement -> resize things.
//
// A GRID GIVES ALIGNMENT LINES; IT DOES NOT DECIDE THE COMPOSITION. The arrangements exist before
// the content is inserted, and the only things this script chooses are:
//
//   1. which APPROVED SUBDESIGN of the authored pattern to use, from the SURFACE and — where the
//      pattern declares it — the MEDIA'S OWN ASPECT CLASS. Never from content;
//   2. the pixel width a media slot offers, which is arithmetic on the master grid.
//
// A GRAPH NO LONGER OWNS A SIZE. It is handed a slot width and answers only: inside this width, at
// equal unit scale, this is the faithful rendering I can provide. Its height follows and the page
// grows. `mediaSize` — the authored compact/standard/large class — was the useful failed
// intermediate that proved semantic importance and media geometry are separate concerns; the slot
// is the permanent mechanism and this script does not read a size class anywhere.
//
// The app is not changed by this script and does not read anything under docs/atlas/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openFigurePage, makePainter, makeSolvers, square, classOf } from './lib/figure-geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/atlas/composition/src');
const OUT = path.resolve(process.argv[2] || path.join(root, 'docs/atlas/composition'));
fs.mkdirSync(OUT, { recursive: true });

const GRID = JSON.parse(fs.readFileSync(path.join(SRC, 'grid.json'), 'utf8'));
const VOCAB = JSON.parse(fs.readFileSync(path.join(SRC, 'vocabulary.json'), 'utf8'));
const PATTERNS = JSON.parse(fs.readFileSync(path.join(SRC, 'patterns.json'), 'utf8'));
const SHELLS = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC, 'shells.json'), 'utf8'));
  const out = {};
  for (const [id, v] of Object.entries(raw.theTwoKinds)) if (!id.startsWith('_'))
    out[id] = { id, kind: v.kind, label: id === 'views' ? 'Representations' : 'Parts of this lesson', ...v };
  return out;
})();
const PAGES = JSON.parse(fs.readFileSync(path.join(SRC, 'pages.json'), 'utf8'));
const CSS_KIT = fs.readFileSync(path.join(SRC, 'composition.css'), 'utf8');
const FIGS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/figures.json'), 'utf8'));
const LESSON = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/lesson/quadratics.lesson.json'), 'utf8'));
const BANDS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/atlas.json'), 'utf8')).mediaGeometry.bands;
const SURFACES = Object.keys(GRID.surfaces);
const ONLY = process.env.CP_ONLY ? new Set(process.env.CP_ONLY.split(',')) : null;

/* ── the grid, as arithmetic ──────────────────────────────────────────────────────────────────── */
const colW = (s) => (GRID.surfaces[s].width - (GRID.surfaces[s].columns - 1) * GRID.surfaces[s].gutter) / GRID.surfaces[s].columns;
const span = (s, n) => n * colW(s) + (n - 1) * GRID.surfaces[s].gutter;
/* the x of every grid line, so a control can prove slot edges actually land on them */
const lines = (s) => {
  const out = [];
  for (let i = 0; i < GRID.surfaces[s].columns; i++) {
    const x = i * (colW(s) + GRID.surfaces[s].gutter);
    out.push(+x.toFixed(2), +(x + colW(s)).toFixed(2));
  }
  return out;
};

/* ── the pattern catalogue, validated before anything is rendered ─────────────────────────────── */
class PatternError extends Error { constructor(m) { super(m); this.name = 'PatternError'; } }
const SLOT_TYPES = new Set(Object.keys(VOCAB.slotTypes));
const BLOCK_TYPES = new Set(Object.keys(VOCAB.blockTypes));
const OCCUPANCY = new Set(Object.keys(VOCAB.occupancy).filter((k) => k !== '_'));

function areaSpans(areas) {
  /* the column span of every slot named in an areas block, and the row it starts on */
  const rows = areas.map((r) => r.trim().split(/\s+/));
  const out = {};
  rows.forEach((cells, ri) => cells.forEach((name, ci) => {
    if (name === '.') return;
    const o = out[name] || (out[name] = { c0: ci, c1: ci, r0: ri, r1: ri });
    o.c0 = Math.min(o.c0, ci); o.c1 = Math.max(o.c1, ci);
    o.r0 = Math.min(o.r0, ri); o.r1 = Math.max(o.r1, ri);
  }));
  for (const o of Object.values(out)) o.cols = o.c1 - o.c0 + 1;
  return out;
}

function validate() {
  for (const [id, p] of Object.entries(PATTERNS)) {
    if (id.startsWith('_')) continue;
    const names = new Set(p.slots.map((s) => s.name));
    for (const s of p.slots) {
      if (!SLOT_TYPES.has(s.slotType)) throw new PatternError(`${id}.${s.name}: slot type "${s.slotType}" is not in the vocabulary`);
      if (!OCCUPANCY.has(s.occupancy)) throw new PatternError(`${id}.${s.name}: occupancy "${s.occupancy}" is not one of ${[...OCCUPANCY].join(', ')}`);
      for (const b of s.allowedBlocks) {
        if (!BLOCK_TYPES.has(b)) throw new PatternError(`${id}.${s.name}: block type "${b}" is not in the vocabulary`);
        if (!VOCAB.blockFitsSlot[b].includes(s.slotType))
          throw new PatternError(`${id}.${s.name}: a ${b} block may not live in a ${s.slotType} slot `
            + `(it fits ${VOCAB.blockFitsSlot[b].join(', ')})`);
      }
    }
    for (const d of p.subdesigns) {
      const n = GRID.surfaces[d.surface].columns;
      d.areas.forEach((r, i) => {
        const t = r.trim().split(/\s+/);
        if (t.length !== n) throw new PatternError(`${id}/${d.id}: areas row ${i + 1} has ${t.length} tokens, `
          + `and the ${d.surface} grid has ${n} columns — "${r}"`);
        for (const name of t) if (name !== '.' && !names.has(name))
          throw new PatternError(`${id}/${d.id}: areas name "${name}" is not a slot of this pattern`);
      });
      /* CONTROL · THE READING MEASURE IS A PROPERTY OF THE GRID, NOT A HOPE. A slot that may hold
         prose may not be given more columns than the measure allows on that surface. */
      const sp = areaSpans(d.areas);
      for (const s of p.slots) {
        if (!sp[s.name]) continue;
        const holdsProse = s.allowedBlocks.some((b) => ['prose', 'keyIdea', 'workedExample', 'questionSet'].includes(b));
        const max = GRID.readingMeasure.maxSpan[d.surface];
        if (holdsProse && sp[s.name].cols > max)
          throw new PatternError(`${id}/${d.id}: "${s.name}" holds prose across ${sp[s.name].cols} of the `
            + `${d.surface} grid's ${n} columns — the reading measure allows ${max} (${Math.round(span(d.surface, max))}px)`);
      }
    }
    /* EXACTLY ONE APPROVED SUBDESIGN MUST MATCH ANY (surface, aspect class) — and `none` is one of
       the classes. A pattern whose media is optional-collapse has a real authored state with no
       media at all: the lesson's Symmetry workings is a comparison with no shared visual, and
       visual.compare had no arrangement for it until this control was extended to ask. */
    const needsMedia = p.slots.some((x) => x.slotType === 'media' && x.occupancy === 'required');
    for (const s of SURFACES) for (const a of ASPECTS) {
      if (a === 'none' && needsMedia) continue;
      const m = p.subdesigns.filter((d) => d.surface === s && (!d.aspects || d.aspects.includes(a)));
      if (m.length !== 1)
        throw new PatternError(`${id}: ${m.length} approved subdesigns match ${s}/${a} — exactly one must`);
    }
  }
}

/* `optional-collapse` MEANS THE ROW GOES, NOT THAT THE SLOT IS EMPTY. CSS Grid keeps an unoccupied
   named track and the row-gap either side of it — a 40px band of nothing, which is residue under a
   different name. A row every one of whose tokens is `.` or an absent optional slot is dropped
   whole. The rule reads only WHICH SLOTS THE AUTHOR FILLED; it never reads what is in them. */
function collapseRows(areas, absent) {
  const out = areas.filter((r) => r.trim().split(/\s+/).some((n) => n !== '.' && !absent.has(n)));
  if (!out.length) throw new PatternError('every row of this subdesign collapsed — nothing is left to lay out');
  return out;
}

/* the subdesign is chosen from the SURFACE and the MEDIA ASPECT CLASS. There is no third input.
   `none` is an aspect class: a page with no media is a state a pattern must have designed. */
const ASPECTS = ['portrait', 'balanced', 'landscape', 'wide', 'none'];
const pick = (p, surface, aspect) => {
  const m = p.subdesigns.filter((d) => d.surface === surface && (!d.aspects || d.aspects.includes(aspect)));
  if (m.length !== 1) throw new PatternError(`${p.id}: ${m.length} subdesigns match ${surface}/${aspect}`);
  return m[0];
};

/* ── the areas CSS, generated from patterns.json so the JSON is their ONE OWNER ────────────────── */
function areasCSS(surface) {
  const out = [];
  for (const [id, p] of Object.entries(PATTERNS)) {
    if (id.startsWith('_')) continue;
    for (const d of p.subdesigns) {
      if (d.surface !== surface) continue;
      out.push(`[data-pattern="${id}"][data-subdesign="${d.id}"]{grid-template-areas:\n`
        + d.areas.map((r) => `  "${r}"`).join('\n') + ';}');
      /* one extra rule per collapsible slot, so a page that omits it gets the row-less areas */
      for (const s of p.slots.filter((x) => x.occupancy === 'optional-collapse')) {
        const kept = d.areas.filter((r) => r.trim().split(/\s+/).some((n) => n !== '.' && n !== s.name));
        if (kept.length === d.areas.length) continue;
        out.push(`[data-pattern="${id}"][data-subdesign="${d.id}"][data-without~="${s.name}"]{grid-template-areas:\n`
          + kept.map((r) => `  "${r}"`).join('\n') + ';}');
      }
    }
  }
  for (const [id, p] of Object.entries(PATTERNS)) {
    if (id.startsWith('_')) continue;
    for (const s of p.slots) out.push(`[data-pattern="${id}"] > [data-slot="${s.name}"]{grid-area:${s.name};}`);
  }
  return out.join('\n');
}

/* ── content: intent in, safe markup out ──────────────────────────────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* the lesson writes *x* for a variable and ^2 for a superscript; it never writes markup */
const t = (s) => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\^([-−]?[0-9A-Za-z]+)/g, '<sup>$1</sup>');
const slug = (s) => String(s).toLowerCase().replace(/\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mathOf = (v) => Array.isArray(v) ? v.map((x) => `<span class="cp-stmt">${t(x)}</span>`).join('') : t(v);
const para = (p) => typeof p === 'string' ? `<p>${t(p)}</p>` : `<p class="cp-said">${mathOf(p.math)}</p>`;

/* THE REAL LESSON IS THE CONTENT. Indexed so a page can say `substitution/1` rather than repeating
   material — a pattern that only works on prose written to fit it proves nothing. */
function indexLesson() {
  const ix = { example: {}, cases: {}, visual: {}, lede: {}, synthesis: {} };
  for (const item of LESSON.page.collection.items) {
    const k = slug(item.label);
    if (item.lede) ix.lede[k] = item.lede;
    if (item.synthesis) ix.synthesis[k] = item.synthesis;
    const walk = (n, key) => {
      if (!n) return;
      if (n.collection) return n.collection.items.forEach((x, i) => walk(x, `${key}/${i}`));
      if (n.views) return n.views.items.forEach((x) => walk(x.body, `${key}/${slug(x.label)}`));
      if (n.composition === 'comparison.paired') {
        n.cases.forEach((c, i) => { ix.example[`${key}#${i}`] = { ...c, title: c.label }; });
        ix.cases[key] = n; return;
      }
      if (n.composition === 'visual') { ix.visual[key] = n; return; }
      ix.example[key] = n;
    };
    walk(item.body, k);
  }
  return ix;
}
const IX = indexLesson();

const workedExample = (n, opts = {}) => {
  const q = n.question || n.scenario;
  return `<article class="cp-wex">`
    + (n.title && !opts.noTitle ? `<h3 class="cp-wex-title">${t(n.title)}</h3>` : '')
    /* `noPrompt` is for a pattern that gives the scenario a SLOT OF ITS OWN — repeating it in the
       question box would put the same prose on the page twice */
    + (opts.noPrompt ? '' : `<div class="cp-q"><p class="cp-lab">${esc(n.scenario ? 'Scenario' : 'Question')}</p>${q.map(para).join('')}</div>`)
    + `<p class="cp-lab">Worked solution</p><ol class="cp-steps">`
    + n.steps.map((s) => `<li class="cp-step"><div class="cp-st">${t(s.say)}</div>`
        + (s.math != null ? `<div class="cp-sm">${mathOf(s.math)}</div>` : '')
        + (s.table ? tableBlock({ block: 'table', ...s.table }) : '') + `</li>`).join('')
    + `</ol><div class="cp-ans"><b>Answer</b>${t(n.answer)}</div></article>`;
};
const tableBlock = (b) => `<div class="cp-tblwrap" data-scroll-x="local"><table class="cp-tbl">`
  + `<tr>${b.head.map((c) => `<th>${t(c)}</th>`).join('')}</tr>`
  + b.rows.map((r) => `<tr>${r.map((c) => `<td>${t(c)}</td>`).join('')}</tr>`).join('')
  + `</table></div>`;

/* ── the blocks ───────────────────────────────────────────────────────────────────────────────── */
const FIGREQ = [];
function block(b, ctx) {
  switch (b.block) {
    case 'prose':
      return `<div class="cp-prose">` + (b.heading ? `<h3>${t(b.heading)}</h3>` : '')
        + (b.ref ? [IX.lede[b.ref]].filter(Boolean).map(para).join('') : '')
        + (b.paragraphs || []).map(para).join('') + `</div>`;
    case 'keyIdea':
      return `<aside class="cp-key"><p class="cp-lab">${esc(b.label || 'Key idea')}</p>`
        + (b.paragraphs || []).map(para).join('') + `</aside>`;
    case 'workedExample': {
      const n = b.ref ? IX.example[b.ref] : b;
      if (!n) throw new PatternError(`no worked example "${b.ref}" in the lesson`);
      return workedExample(n, b);
    }
    case 'table': return tableBlock(b);
    case 'graph': case 'image': case 'video': {
      /* THE SLOT GIVES THE WIDTH. The block asks for nothing. */
      FIGREQ.push(b.figure);
      return `<figure class="cp-figure">{{FIG:${b.figure}}}`
        + (b.caption ? `<figcaption class="cp-figcap">${t(b.caption)}</figcaption>` : '') + `</figure>`;
    }
    case 'interactive': {
      FIGREQ.push(b.figure);
      return `<div class="cp-figure">{{FIG:${b.figure}}}</div>`
        + `<div class="cp-controls" role="group" aria-label="${esc(b.label || 'Controls')}">`
        + (b.controls || []).map((c) => `<div class="cp-ctl"><span class="cp-ctl-name">${t(c.name)}</span>`
            + `<span class="cp-track"><span class="cp-knob" style="left:calc(${c.at}% - 8px)"></span></span>`
            + `<span class="cp-ctl-val">${t(c.value)}</span></div>`).join('')
        + `</div>`;
    }
    case 'questionSet':
      return `<ol class="cp-qset">` + b.items.map((q) => `<li class="cp-qitem"><p>${t(q.say)}</p>`
        + (q.math ? `<div class="cp-sm">${mathOf(q.math)}</div>` : '') + `</li>`).join('') + `</ol>`;
    case 'handwrittenResponse':
      return `<div class="cp-pad"><div class="cp-pad-head"><p class="cp-lab">${esc(b.label || 'Your working')}</p>`
        + `<span class="cp-pad-tools">${['✎', '⌫', '＋'].map((g) => `<button type="button" class="cp-tool" aria-label="tool">${g}</button>`).join('')}</span></div>`
        + `<div class="cp-${b.paper === 'grid' ? 'gridpaper' : 'paper'}"></div></div>`;
    default: throw new PatternError(`no renderer for block "${b.block}"`);
  }
}

/* a slot holds blocks; the slot is what the pattern named, the blocks are what the lesson supplies */
function slotMarkup(pattern, s, content, ctx) {
  if (!content || (Array.isArray(content) && !content.length)) return null;
  const group = Array.isArray(content) ? null : content;
  const check = (b) => {
    if (!s.allowedBlocks.includes(b.block))
      throw new PatternError(`${pattern.id}: a ${b.block} block was placed in "${s.name}" (${s.slotType}), `
        + `which allows ${s.allowedBlocks.join(', ')}`);
    return b;
  };
  let inner;
  if (group) {
    if (!pattern.disclosureAllowed.includes(group.disclosure))
      throw new PatternError(`${pattern.id}: "${s.name}" asks for ${group.disclosure}, and the pattern `
        + `allows ${pattern.disclosureAllowed.join(', ')}`);
    const kind = group.disclosure.split('.')[0];
    const gid = `${pattern.id.replace(/\W/g, '')}-${s.name}`;
    /* the W3C APG tabs model, emitted whole — the roles and the wiring are part of the disclosure
       contract, not decoration added afterwards */
    inner = `<div class="cp-tabs" data-tabs="${esc(s.name)}" data-tabs-kind="${esc(kind)}">`
      + `<div class="cp-tabbar" role="tablist" aria-label="${esc(group.label || s.name)}">`
      + group.items.map((i) => `<button class="cp-tab" type="button" role="tab" id="${gid}-t-${slug(i.label)}" `
          + `aria-controls="${gid}-p-${slug(i.label)}" data-tab="${slug(i.label)}">${t(i.label)}</button>`).join('')
      + `</div>`
      + group.items.map((i) => `<div class="cp-panel" role="tabpanel" id="${gid}-p-${slug(i.label)}" `
          + `aria-labelledby="${gid}-t-${slug(i.label)}" data-panel="${slug(i.label)}">`
          + (i.lede ? `<p class="cp-tabnote">${t(i.lede)}</p>` : '')
          + i.blocks.map((b) => block(check(b), ctx)).join('') + `</div>`).join('')
      + `</div>`;
  } else {
    inner = content.map((b) => block(check(b), ctx)).join('');
  }
  const scrollY = s.scroll === 'pane' && !ctx.noPane ? ' data-scroll-y="pane"' : '';
  return `<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" data-occupancy="${esc(s.occupancy)}"${scrollY}>`
    + (s.label ? `<p class="cp-lab">${esc(s.label)}</p>` : '') + inner + `</div>`;
}

/* ── assemble one page ────────────────────────────────────────────────────────────────────────── */
/* ONE PATTERN INSTANCE. A page is either one of these or a SHELL holding a tree of them: the shell
   owns the page title and the tab strips, and it is NOT a pattern — it holds patterns. */
function buildInstance(inst, page, surface, opts = {}) {
  const p = PATTERNS[inst.pattern];
  if (!p) throw new PatternError(`page ${page.n}: no pattern "${inst.pattern}"`);
  const content = opts.adversarial && inst.adversarial ? { ...inst.slots, ...inst.adversarial }
    : opts.alternate && inst.alternate ? { ...inst.slots, ...inst.alternate.slots } : inst.slots;
  const figSlot = {};
  const aspectOf = (key) => {
    const d = FIGS[key].figure.domain;
    return classOf((d.yMax - d.yMin) / (d.xMax - d.xMin), BANDS);
  };
  /* THE MEDIA'S ASPECT CLASS IS THE ONLY THING BESIDES THE SURFACE THAT MAY SELECT A SUBDESIGN. */
  let aspect = null;
  const flat = (c) => !c ? [] : Array.isArray(c) ? c : c.items.flatMap((i) => i.blocks);
  for (const s of p.slots) for (const b of flat(content[s.name])) if (b.figure && !aspect) aspect = aspectOf(b.figure);
  if (!aspect) aspect = 'none';
  const d0 = pick(p, surface, aspect);
  const filled = (c) => c && (Array.isArray(c) ? c.length > 0 : true);
  const absent = new Set(p.slots.filter((s) => s.occupancy === 'optional-collapse' && !filled(content[s.name])).map((s) => s.name));
  const d = absent.size ? { ...d0, areas: collapseRows(d0.areas, absent) } : d0;
  const spans = areaSpans(d.areas);

  const parts = [], present = [];
  for (const s of p.slots) {
    const before = FIGREQ.length;
    const m = slotMarkup(p, s, content[s.name], { surface, noPane: !!d.noPane });
    for (const k of FIGREQ.slice(before)) figSlot[k] = s.name;
    if (m == null) {
      if (s.occupancy === 'required') throw new PatternError(`${p.id}: required slot "${s.name}" has no blocks on page ${page.n}`);
      if (s.occupancy === 'optional-reserved' && spans[s.name])
        parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" data-occupancy="${esc(s.occupancy)}" data-reserved></div>`);
      continue;
    }
    if (!spans[s.name]) throw new PatternError(`${p.id}/${d.id}: slot "${s.name}" has content but no area in this subdesign`);
    parts.push(m); present.push(s.name);
  }
  /* a slot with no content and no area is simply absent — the approved no-X subdesign handles it */
  for (const name of Object.keys(spans)) {
    const s = p.slots.find((x) => x.name === name);
    if (!present.includes(name) && s.occupancy === 'required')
      throw new PatternError(`${p.id}/${d.id}: "${name}" is laid out but was never filled`);
  }
  const widths = {};
  for (const [name, o] of Object.entries(spans)) widths[name] = +span(surface, o.cols).toFixed(2);
  const figW = {};
  for (const [k, name] of Object.entries(figSlot)) figW[k] = widths[name];
  const without = [...absent].join(' ');
  return { pattern: p, subdesign: d, aspect, absent, spans, widths, figW,
    body: (i) => `<div data-pattern="${esc(p.id)}" data-subdesign="${esc(d.id)}" data-inst="${i}"`
      + (without ? ` data-without="${esc(without)}"` : '') + `>\n${parts.join('\n')}\n</div>` };
}

/* ── THE SHELL · what holds patterns, and is not one ───────────────────────────────────────────
   Five of the catalogue's records assumed a page title no pattern owned, and the lesson's whole top
   level is a tab strip over four subtopics whose Symmetry panel is two DIFFERENT PATTERNS. Neither
   had an owner. THE SHELL IS NOT AN EIGHTH PATTERN: it carries no slots and no grid areas of its
   own — it owns the title, the strips, and which panel is open, and every panel holds patterns. */
function buildPage(page, surface, opts = {}) {
  const inst = [];
  const sel = (opts.state && opts.state.sel) || page.tabs || {};
  const walk = (node, group, path = {}) => {
    if (Array.isArray(node)) return node.map((x) => {
      const b = buildInstance(x, page, surface, opts);
      /* WHICH PANEL PATH HOLDS THIS INSTANCE, so the caption can name what is actually on screen and
         a control can assert that a closed panel contributes no measured pattern. */
      b.path = { ...path };
      b.shown = Object.entries(b.path).every(([g, v]) => sel[g] === v);
      inst.push(b);
      return b.body(inst.length - 1);
    }).join('\n');
    const sh = SHELLS[node.shell];
    if (!sh) throw new PatternError(`page ${page.n}: no shell "${node.shell}"`);
    const gid = `${page.n}-${group}`;
    return `<section class="cp-shell" data-shell="${esc(node.shell)}" data-tabs="${esc(group)}" `
      + `data-tabs-kind="${esc(sh.kind)}">`
      + `<div class="cp-tabbar" role="tablist" aria-label="${esc(node.label || sh.label)}">`
      + node.items.map((i) => `<button class="cp-tab" type="button" role="tab" id="${gid}-t-${slug(i.label)}" `
          + `aria-controls="${gid}-p-${slug(i.label)}" data-tab="${slug(i.label)}">${t(i.label)}</button>`).join('')
      + `</div>`
      + node.items.map((i) => `<div class="cp-panel" role="tabpanel" id="${gid}-p-${slug(i.label)}" `
          + `aria-labelledby="${gid}-t-${slug(i.label)}" data-panel="${slug(i.label)}">`
          + (i.lede ? `<p class="cp-tabnote">${t(i.lede)}</p>` : '')
          + walk(i.body, slug(i.label), { ...path, [group]: slug(i.label) }) + `</div>`).join('')
      + `</section>`;
  };
  const body = page.shell ? walk(page, 'topic', {})
    : (() => { const b = buildInstance(page, page, surface, opts); inst.push(b); return b.body(0); })();
  return { instances: inst, body };
}

/* the leaf states a shell declares — enumerated FROM THE TREE, never listed by hand, so a panel
   cannot exist without a render that opens it */
function statesOf(node, group = 'topic') {
  if (Array.isArray(node) || !node.shell) return [{ key: '', sel: {} }];
  return node.items.flatMap((i) => statesOf(i.body, slug(i.label)).map((st) => ({
    key: st.key ? `${slug(i.label)}-${st.key}` : slug(i.label),
    sel: { [group]: slug(i.label), ...st.sel } })));
}
function groupsOf(node, group = 'topic', out = []) {
  if (Array.isArray(node) || !node.shell) return out;
  out.push({ name: group, kind: SHELLS[node.shell].kind, panels: node.items.map((i) => slug(i.label)) });
  for (const i of node.items) groupsOf(i.body, slug(i.label), out);
  return out;
}

/* the slot diagram — drawn from the SAME areas that lay the page out, so it can never illustrate
   something the page does not do */
function diagram(d, surface) {
  const cells = d.areas.map((r) => {
    const toks = r.trim().split(/\s+/), out = [];
    for (let i = 0; i < toks.length;) {
      let j = i; while (j < toks.length && toks[j] === toks[i]) j++;
      const n = j - i;
      out.push(toks[i] === '.'
        ? `<span class="cp-dcell" data-empty style="grid-column:span ${n}">${n > 1 ? n + ' unused' : ''}</span>`
        : `<span class="cp-dcell" style="grid-column:span ${n}">${esc(toks[i])} · ${n}</span>`);
      i = j;
    }
    return out.join('');
  }).join('');
  return `<div class="cp-diagram"><p class="cp-lab cp-dlab">${esc(d.id)} · ${surface} · `
    + `${GRID.surfaces[surface].columns} columns</p><div class="cp-dgrid">${cells}</div></div>`;
}

/* ── render ───────────────────────────────────────────────────────────────────────────────────── */
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const APP_CSS = await (async () => {
  const q = await browser.newPage();
  await q.goto(base, { waitUntil: 'load' });
  const css = await q.evaluate(() => [].slice.call(document.styleSheets)
    .map((sh) => { try { return [].slice.call(sh.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n'));
  await q.close();
  return css;
})();
if (!/\.mx-figskin\.tp-slide/.test(APP_CSS)) throw new Error('the lifted stylesheet is missing the figure token mapping');

validate();
console.log(`catalogue · ${Object.keys(PATTERNS).filter((k) => !k.startsWith('_')).length} patterns, `
  + `${Object.values(PATTERNS).filter((p) => p.slots).reduce((n, p) => n + p.subdesigns.length, 0)} approved subdesigns — all areas rows and reading measures check out`);

const figPage = await openFigurePage(browser, base);
const paint = makePainter(figPage);
const { boxForWidth } = makeSolvers(paint);
/* THE SLOT GIVES THE WIDTH AND THE MEDIA ANSWERS. One solve per (figure, slot width); memoised,
   because the same figure in the same slot on two pages is the same question. */
const BOX = new Map();
async function boxFor(key, w) {
  const ck = `${key}|${w}`;
  if (BOX.has(ck)) return BOX.get(ck);
  const b = await boxForWidth(key, FIGS[key].figure, Math.round(w));
  if (!b) throw new Error(`${key}: no box at all fits a ${w}px slot`);
  if (!square(b.box)) throw new Error(`${key}: no height in a ${w}px slot paints this domain at equal `
    + `unit scale (best ${b.box.w}x${b.box.h} at ${b.box.ratio})`);
  if (b.box.w < Math.round(w) - 1) throw new Error(`${key}: solved to ${b.box.w}px against a ${w}px slot`);
  BOX.set(ck, b.box);
  return b.box;
}
const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

const tokens = (s) => {
  const g = GRID.surfaces[s];
  return `:root{--cp-surface:${g.width}px;--cp-pad:${g.pad}px;--cp-pad-y:${s === 'phone' ? 22 : s === 'tablet' ? 26 : 32}px;`
    + `--cp-frame:${s === 'phone' ? 12 : s === 'tablet' ? 20 : 30}px;--cp-cols:${g.columns};--cp-gut:${g.gutter}px;`
    + `--cp-measure:${GRID.readingMeasure.px}px;--cp-pad-h:${s === 'phone' ? 360 : 480}px;--cp-pane-h:460px;}`;
};

async function shot(name, page, surface, opts = {}) {
  const g = GRID.surfaces[surface];
  const built = buildPage(page, surface, opts);
  let body = built.body;
  /* every figure across every instance: the slot that holds it gave it its width */
  const figW = Object.assign({}, ...built.instances.map((b) => b.figW));
  for (const [key, w] of Object.entries(figW)) {
    const box = await boxFor(key, w);
    body = body.split(`{{FIG:${key}}}`).join(skin(box.w, box.h, box.html));
  }
  if (/\{\{FIG:/.test(body)) throw new Error(`${name}: an unresolved figure placeholder survived`);

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface)}
${CSS_KIT}
${areasCSS(surface)}
</style></head><body class="mx cp-${surface}"><div class="cp-page">
<div class="cp-cap"><span class="cp-tpl">${esc(page.shell ? 'shell.' + page.shell : page.pattern)}${opts.state && opts.state.key ? ' · ' + esc(opts.state.key) : ''} · ${built.instances.filter((b) => b.shown !== false).map((b) => esc(b.pattern.id + '/' + b.subdesign.id)).join(' + ')}${page.shell ? ` · ${built.instances.length} patterns in the shell` : ''} · ${surface} ${g.width}px · ${g.columns} columns${opts.adversarial ? ' · ADVERSARIAL PAYLOAD' : ''}</span>${esc(page.c)}</div>
${opts.diagram && !page.shell ? diagram(built.instances[0].subdesign, surface) : ''}
<div class="cp-surface">
<h1 class="cp-h1">${t(page.title)}</h1>${page.lede ? `<p class="cp-lede">${t(page.lede)}</p>` : ''}
<div class="cp-rule"></div>
${body}
</div>
<div class="cp-note">${page.shell ? 'The shell holds the strips and the title; it owns no slots and no grid. ' : ''}The pattern${built.instances.length > 1 ? 's were' : ' was'} authored; the renderer chose only which APPROVED SUBDESIGN to use — from the ${g.width}px surface${built.instances.some((b) => b.aspect) ? ` and the media's aspect class` : ''} and nothing else. Slots take their geometry from the master grid; the media takes its width from its slot. Height is auto and the page scrolls.</div>
</div></body></html>`;

  const p = await browser.newPage({ viewport: { width: g.width + 2 * g.pad + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.setContent(doc, { waitUntil: 'load' });

  /* THE ONLY THING STAMPED, AND IT READS NO CONTENT: the authored tab selection. Nothing here can
     add, remove or reorder a tab, and no width is consulted. */
  await p.evaluate((sel) => {
    for (const g2 of document.querySelectorAll('[data-tabs]')) {
      const want = sel[g2.getAttribute('data-tabs')];
      const has = [].slice.call(g2.querySelectorAll(':scope > .cp-tabbar > .cp-tab')).map((b2) => b2.getAttribute('data-tab'));
      const active = has.includes(want) ? want : has[0];
      g2.setAttribute('data-active', active);
      for (const b of g2.querySelectorAll(':scope > .cp-tabbar > .cp-tab')) {
        const on = b.getAttribute('data-tab') === active;
        if (on) b.setAttribute('data-on', ''); else b.removeAttribute('data-on');
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.setAttribute('tabindex', on ? '0' : '-1');
      }
      for (const q of g2.querySelectorAll(':scope > .cp-panel'))
        if (q.getAttribute('data-panel') === active) q.setAttribute('data-shown', ''); else q.removeAttribute('data-shown');
      const bar = g2.querySelector(':scope > .cp-tabbar'), on = bar.querySelector('.cp-tab[data-on]');
      if (on && bar.scrollWidth > bar.clientWidth) {
        const l = on.offsetLeft, r = l + on.offsetWidth;
        if (l < bar.scrollLeft) bar.scrollLeft = l;
        else if (r > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = r - bar.clientWidth;
      }
    }
    /* a local-x region that happens to fit needs no fade — the affordance is for real overflow */
    for (const el of document.querySelectorAll('[data-scroll-x="local"]'))
      if (el.scrollWidth <= el.clientWidth + 1) el.setAttribute('data-fits', '');
  }, (opts.state && opts.state.sel) || page.tabs || {});
  await p.waitForTimeout(320);

  const m = await p.evaluate(({ measure, gridLines, gut }) => {
    const vis = (el) => el.getClientRects().length > 0;
    /* ONE MEASUREMENT PER VISIBLE PATTERN INSTANCE. A shell page holds several, and a closed panel
       holds none — a hidden thing cannot be measured, and the state loop opens every panel. */
    const near = (x) => gridLines.some((l) => Math.abs(l - x) <= 1.5);
    const grids = [].slice.call(document.querySelectorAll('[data-pattern]')).filter(vis).map((grid) => {
      const gb = grid.getBoundingClientRect();
      const slots = [].slice.call(grid.querySelectorAll(':scope > [data-slot]')).map((el) => {
        const r = el.getBoundingClientRect();
        const kids = [].slice.call(el.children).filter((c) => vis(c) && !c.classList.contains('cp-lab'));
        const plane = el.querySelector('[data-mx-part="figure"]');
        return { name: el.getAttribute('data-slot'), type: el.getAttribute('data-slot-type'),
          occupancy: el.getAttribute('data-occupancy'), reserved: el.hasAttribute('data-reserved'),
          visible: vis(el), w: +(r.width).toFixed(2), h: Math.round(r.height),
          top: +(r.top - gb.top).toFixed(1), bottom: +(r.bottom - gb.top).toFixed(1),
          left: +(r.left - gb.left).toFixed(2), right: +(r.right - gb.left).toFixed(2),
          filled: kids.length > 0, plane: plane ? +plane.getBoundingClientRect().width.toFixed(2) : null };
      });
      return { inst: +grid.getAttribute('data-inst'), pattern: grid.getAttribute('data-pattern'),
        subdesign: grid.getAttribute('data-subdesign'), gridW: +gb.width.toFixed(2), slots,
        offGrid: slots.filter((x) => x.visible && !(near(x.left) && near(x.right)))
          .map((x) => `${x.name} ${x.left}→${x.right}`) };
    });
    const figs = [].slice.call(document.querySelectorAll('.tp-fig-svg')).filter(vis).map((svg) => {
      const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
      const rect = svg.getBoundingClientRect();
      const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
      const val = (x) => parseFloat(x.textContent.replace('−', '-'));
      const per = (a, at) => { const z = labs.filter((x) => x.getAttribute('text-anchor') === a)
          .map((x) => ({ v: val(x), px: +x.getAttribute(at) })).filter((o) => isFinite(o.v));
        if (z.length < 2) return null; z.sort((i, j) => i.v - j.v);
        const dd = z[z.length - 1].v - z[0].v; return dd ? Math.abs((z[z.length - 1].px - z[0].px) / dd) : null; };
      const ux = per('middle', 'x'), uy = per('end', 'y');
      return { ratio: (ux && uy) ? +((ux * rect.width / vb[2]) / (uy * rect.height / vb[3])).toFixed(3) : null };
    });
    const wide = [].slice.call(document.querySelectorAll('.cp-prose p, .cp-st, .cp-key p, .cp-qitem p, .cp-lede, .cp-tabnote, .cp-figcap'))
      .filter((n) => vis(n) && !n.closest('[data-scroll-x="local"]'))
      .map((n) => ({ w: Math.round(n.getBoundingClientRect().width), s: n.textContent.slice(0, 44) }))
      .filter((n) => n.w > measure + 1);
    const scrollers = { y: [], x: [] };
    for (const el of document.querySelectorAll('.cp-surface *')) {
      if (!vis(el)) continue;
      const cs = getComputedStyle(el), dx = el.getAttribute('data-scroll-x'), dy = el.getAttribute('data-scroll-y');
      const tabbar = el.classList.contains('cp-tabbar');
      if (/^(auto|scroll)$/.test(cs.overflowY) && dx !== 'local' && !tabbar) {
        const own = el.closest('[data-pattern]');
        scrollers.y.push({ declared: dy || 'undeclared', over: el.scrollHeight > el.clientHeight + 1,
          pattern: own ? own.getAttribute('data-pattern') : null });
      }
      if (/^(auto|scroll)$/.test(cs.overflowX) && dy !== 'pane') scrollers.x.push({ declared: tabbar ? 'tabstrip' : dx,
        w: Math.round(el.getBoundingClientRect().width), sw: el.scrollWidth });
    }
    const tabs = [].slice.call(document.querySelectorAll('[data-tabs]')).filter(vis).map((x) => {
      const bar = x.querySelector(':scope > .cp-tabbar'), on = bar.querySelector('.cp-tab[data-on]');
      const br = bar.getBoundingClientRect(), orc = on ? on.getBoundingClientRect() : null;
      const own = x.closest('[data-pattern]');
      let depth = 0; for (let q = x.parentElement; q; q = q.parentElement) if (q.hasAttribute('data-tabs')) depth++;
      return { kind: x.getAttribute('data-tabs-kind'), depth,
        shell: x.hasAttribute('data-shell'), pattern: own ? own.getAttribute('data-pattern') : null,
        sig: [getComputedStyle(bar).borderBottomWidth, getComputedStyle(bar).borderRadius,
              on ? getComputedStyle(on).backgroundColor : 'none',
              on ? getComputedStyle(on).borderBottomWidth : 'none'].join('/'),
        rows: new Set([].slice.call(bar.querySelectorAll('.cp-tab')).map((b) => b.offsetTop)).size,
        activeWhole: !orc || (orc.left >= br.left - 1 && orc.right <= br.right + 1),
        roles: bar.getAttribute('role') === 'tablist'
          && [].slice.call(bar.querySelectorAll('.cp-tab')).every((b) => b.getAttribute('role') === 'tab' && b.hasAttribute('aria-controls'))
          && [].slice.call(x.querySelectorAll(':scope > .cp-panel')).every((q) => q.getAttribute('role') === 'tabpanel' && q.hasAttribute('aria-labelledby')),
        roving: [].slice.call(bar.querySelectorAll('.cp-tab')).filter((b) => b.getAttribute('tabindex') === '0').length === 1 };
    });
    const pg = document.querySelector('.cp-page');
    /* WHICH element overflows, not merely that one does — the previous version of this control was
       right and useless, and cost an hour of guessing. */
    const pgr = pg.getBoundingClientRect();
    const over = [].slice.call(pg.querySelectorAll('*')).filter(vis).map((el) => {
      const q = el.getBoundingClientRect();
      return { d: +(q.right - pgr.right).toFixed(1), el: (el.tagName + '.' + (el.className || '')).slice(0, 60),
        w: Math.round(q.width) };
    }).filter((x) => x.d > 0.5).sort((a, b) => b.d - a.d).slice(0, 3);
    const frame = ['html', 'body', '.cp-page', '.cp-surface'].map((s) => {
      const el = document.querySelector(s), cs = getComputedStyle(el);
      return { s, maxHeight: cs.maxHeight, overflowY: cs.overflowY };
    });
    /* THE AUTHORED TAB STRUCTURE, read back out of the DOM: depth, kind, group, labels, panels.
       Compared character for character across every width and every state. */
    const tabSig = [].slice.call(document.querySelectorAll('[data-tabs]')).map((x) => {
      let d = 0; for (let q = x.parentElement; q; q = q.parentElement) if (q.hasAttribute('data-tabs')) d++;
      const labels = [].slice.call(x.querySelectorAll(':scope > .cp-tabbar > .cp-tab')).map((b) => b.textContent.replace(/\s+/g, ' ').trim());
      const panels = [].slice.call(x.querySelectorAll(':scope > .cp-panel')).map((b) => b.getAttribute('data-panel'));
      return `${d}:${x.getAttribute('data-tabs-kind')}:${x.getAttribute('data-tabs')}[${labels.join('|')}]{${panels.join('|')}}`;
    }).join(' ; ');
    return { grids, figs, wide, scrollers, tabs, frame, over, tabSig,
      clip: { sw: pg.scrollWidth, cw: pg.clientWidth },
      docH: Math.round(document.documentElement.scrollHeight),
      docW: Math.round(document.documentElement.scrollWidth),
      docCW: Math.round(document.documentElement.clientWidth),
      payload: document.querySelector('.cp-surface').innerText.replace(/\s+/g, ' ').trim().length };
  }, { measure: GRID.readingMeasure.px, gridLines: lines(surface), gut: g.gutter });

  if (!opts.noShot) {
    const bb = await (await p.$('.cp-page')).boundingBox();
    await p.setViewportSize({ width: g.width + 2 * g.pad + 120, height: Math.ceil(bb.height) + 8 });
    await p.waitForTimeout(140);
    await (await p.$('.cp-page')).screenshot({ path: path.join(OUT, name + '.png') });
  }
  if (errs.length) throw new Error(`${name}: ${errs[0]}`);
  await p.close();
  return { m, built, surface, g };
}

/* ── the controls ─────────────────────────────────────────────────────────────────────────────── */
const LIVE = { localX: [], pane: [], reserved: [], collapse: [] };
/* WHAT A RENDER IS, for reporting and for the adversarial comparison: every visible pattern, its
   subdesign, and every slot's width. A shell page has several; a plain page has one. */
const sig = (m) => m.grids.map((G) => `${G.pattern}/${G.subdesign}{`
  + G.slots.filter((x) => x.visible).map((x) => `${x.name}:${x.w}`).join('|') + '}').join(' + ');
const AFFORD = {};
function verify(name, page, r) {
  const { m, built, surface } = r;
  if (!m.grids.length) throw new Error(`${name}: no pattern is painted on this page`);
  /* CONTROL · A CLOSED PANEL CONTRIBUTES NOTHING. Exactly the instances the authored selection opens
     are measured — a hidden panel that still occupies layout would make the strip a decoration. */
  {
    const open = built.instances.filter((b) => b.shown !== false).length;
    if (m.grids.length !== open)
      throw new Error(`${name}: ${m.grids.length} pattern(s) painted where the authored selection `
        + `opens ${open} — a closed panel is contributing layout`);
  }

  /* EVERY CONTROL BELOW RUNS ONCE PER VISIBLE PATTERN INSTANCE. A shell page holds several — the
     lesson's Symmetry panel holds two different patterns — and a closed panel holds none. */
  for (const G of m.grids) {
    const b = built.instances[G.inst];
    if (!b) throw new Error(`${name}: a painted pattern has no instance record`);
    const p = b.pattern;
    const where = m.grids.length > 1 ? ` [${p.id}]` : '';

    /* CONTROL · THE SLOT EDGES LAND ON GRID LINES. This is the whole claim of a master grid, and it
       is the one thing nobody had ever measured: "we use a 12-column grid" is a sentence until every
       painted slot edge is within 1.5px of a column boundary. */
    if (G.offGrid.length)
      throw new Error(`${name}${where}: ${G.offGrid.length} slot edge(s) do not land on the ${surface} grid — ${G.offGrid[0]}`);
    if (Math.abs(G.gridW - GRID.surfaces[surface].width) > 1)
      throw new Error(`${name}${where}: the pattern grid is ${G.gridW}px inside a ${GRID.surfaces[surface].width}px surface`);

    /* CONTROL · THE SLOT IS THE SIZE THE PATTERN GAVE IT, computed from the master grid before any
       content existed. A slot whose painted width disagrees with its column span means something
       downstream is negotiating width, which is the whole failure mode this architecture removes. */
    for (const sl of G.slots) {
      if (!sl.visible) continue;
      const want = b.widths[sl.name];
      if (want == null) throw new Error(`${name}${where}: slot "${sl.name}" is painted but has no area`);
      if (Math.abs(sl.w - want) > 1.5)
        throw new Error(`${name}${where}: slot "${sl.name}" painted ${sl.w}px where its column span is ${want}px`);
    }

    /* CONTROL · NO COLUMN RESIDUE EITHER. A slot can be full and the COLUMN still be empty: put a
       slot in a row below a very tall neighbour and the column above it holds several hundred pixels
       of nothing. The first version of this control watched slots and was blind to it — found by
       looking at a render, which is why the renders are looked at. The fix is a row span in the
       pattern, never a measurement.

       THE THRESHOLD IS A CONTROL, NOT A LAYOUT INPUT. Nothing at render time reads it; it exists so
       a BUILD can tell two unequal siblings apart from a hole. Calibrated on four observed cases: a
       137px leftover under the shorter of two paired cases (ordinary typography, accepted), against
       600px under a question list beside a tall plotting surface, 734px under a reading column
       beside a portrait plane, and 247px above a key idea beside a one-line scenario — all three
       holes, all three fixed in the pattern. */
    {
      const HOLE = 240;
      const vs = G.slots.filter((x) => x.visible).slice().sort((a, b2) => a.top - b2.top);
      for (let x = 0; x < vs.length; x++) for (let y = x + 1; y < vs.length; y++) {
        const a = vs[x], b2 = vs[y];
        if (b2.left >= a.right - 1 || a.left >= b2.right - 1) continue;   // no shared columns
        if (b2.top < a.bottom - 1) continue;                              // same row, or overlapping
        const d2 = b2.top - a.bottom;
        if (d2 > HOLE)
          throw new Error(`${name}${where}: "${b2.name}" starts ${Math.round(d2)}px below "${a.name}" in `
            + `the same columns — that column holds nothing in between, which is residue by the row. `
            + `Span the tall neighbour across both rows instead.`);
        break;
      }
    }

    /* CONTROL · NO LAYOUT RESIDUE. A named track that is painted and holds nothing is a defect
       unless the pattern declared that emptiness as part of the composition. */
    for (const sl of G.slots) {
      if (!sl.visible || sl.filled) continue;
      if (sl.occupancy !== 'optional-reserved')
        throw new Error(`${name}${where}: slot "${sl.name}" is painted ${sl.w}x${sl.h}px and holds nothing — `
          + `a track that promises content and has none is layout residue, not whitespace`);
      LIVE.reserved.push(`${name}:${sl.name}`);
    }
    const painted = new Set(G.slots.filter((x) => x.visible).map((x) => x.name));
    for (const sl of p.slots) {
      if (sl.occupancy === 'required' && !painted.has(sl.name))
        throw new Error(`${name}${where}: required slot "${sl.name}" is not painted`);
      if (sl.occupancy === 'optional-collapse' && !painted.has(sl.name)) LIVE.collapse.push(`${name}:${p.id}.${sl.name}`);
    }

    /* CONTROL · MEDIA FILLS ITS SLOT. The plane takes the slot's width; if the two disagree the
       media is being wrapped rather than sized, which is how a thumbnail once passed for a graph. */
    for (const sl of G.slots) {
      if (sl.plane == null) continue;
      if (Math.abs(sl.plane - sl.w) > 1.5)
        throw new Error(`${name}${where}: a ${sl.w}px "${sl.name}" slot holds a ${sl.plane}px plane — `
          + `the media is wrapped, not sized`);
    }
  }

  /* equal unit scale is a property of every painted plane on the page, whichever pattern holds it */
  for (const f of m.figs) {
    if (f.ratio == null) throw new Error(`${name}: a painted plane reported no scale`);
    if (Math.abs(f.ratio - 1) > 0.01)
      throw new Error(`${name}: a plane painted at ${f.ratio} — one x-unit and one y-unit are not the same length`);
  }

  /* CONTROL · PROSE IS MEASURED. */
  if (m.wide.length)
    throw new Error(`${name}: ${m.wide.length} run(s) of prose past the ${GRID.readingMeasure.px}px measure — `
      + `${m.wide[0].w}px: “${m.wide[0].s}…”`);

  /* CONTROL · SCROLL OWNERSHIP IS DECLARED. */
  for (const sc of m.scrollers.y) {
    if (sc.declared !== 'pane') throw new Error(`${name}: a region scrolls vertically without declaring a pane`);
    /* A SHELL INTRODUCES NO SCROLL OF ITS OWN, so a pane outside every pattern is a shell bounding a
       panel — the space-saving move this architecture exists to refuse. */
    if (!sc.pattern) throw new Error(`${name}: a pane scrolls outside every pattern — a shell may not bound a panel`);
    const owner = PATTERNS[sc.pattern];
    if (owner.scrollOwnership !== 'pane')
      throw new Error(`${name}: a pane scrolls in "${sc.pattern}", which declares scrollOwnership ${owner.scrollOwnership}`);
    if (sc.over) LIVE.pane.push(name);
  }
  for (const s of m.scrollers.x) {
    if (s.declared !== 'local' && s.declared !== 'tabstrip')
      throw new Error(`${name}: a region scrolls horizontally without a contract that permits it`);
    if (s.declared === 'local' && s.sw > s.w + 1) LIVE.localX.push(`${name} (${s.sw}px in ${s.w}px)`);
  }
  if (m.docW > m.docCW + 1) throw new Error(`${name}: the page itself scrolls sideways`);
  if (m.clip.sw > m.clip.cw + 1)
    throw new Error(`${name}: the page frame is ${m.clip.cw}px around ${m.clip.sw}px of surface — `
      + `the right-hand edge of every line is being clipped`
      + (m.over.length ? `\n  widest overhang: ` + m.over.map((o) => `${o.el} (${o.w}px, +${o.d})`).join(', ') : ''));
  for (const f of m.frame) {
    if (f.maxHeight !== 'none') throw new Error(`${name}: ${f.s} declares max-height ${f.maxHeight}`);
    if (f.overflowY !== 'visible') throw new Error(`${name}: ${f.s} has overflow-y ${f.overflowY}`);
  }

  /* CONTROL · DISCLOSURE IS LEGAL AND ACCESSIBLE. Tabs are authored pedagogical structure: a pattern
     that forbids them may not grow one, and a tab strip is a W3C APG tablist or it is decoration. */
  for (const x of m.tabs) {
    const kind = `${x.kind}.tabs`;
    /* A tab group is either the SHELL's — which is what a shell is for — or a PATTERN's, and a
       pattern may only grow the kinds it declares. */
    if (!x.shell) {
      if (!x.pattern) throw new Error(`${name}: a ${kind} group belongs to neither a shell nor a pattern`);
      const owner = PATTERNS[x.pattern];
      if (!owner.disclosureAllowed.includes(kind))
        throw new Error(`${name}: a ${kind} group appears in "${x.pattern}", which allows ${owner.disclosureAllowed.join(', ')}`);
      if (owner.disclosureForbidden.includes(kind))
        throw new Error(`${name}: "${x.pattern}" explicitly forbids ${kind} and one is painted`);
    }
    /* CONTROL · THE TWO KINDS ARE ENCODED, NOT STYLED — and the affordance is keyed on the KIND at
       every nesting depth. A views strip inside a collection panel must look like every other views
       strip; a control keyed on depth rather than on meaning is how this went wrong once already. */
    if (!AFFORD[x.kind]) AFFORD[x.kind] = { name, sig: x.sig, depth: x.depth };
    else if (AFFORD[x.kind].sig !== x.sig)
      throw new Error(`${name}: a ${x.kind} group at depth ${x.depth} paints a different affordance `
        + `from the one at depth ${AFFORD[x.kind].depth} in ${AFFORD[x.kind].name}`);
    if (x.rows !== 1) throw new Error(`${name}: a tab strip wrapped onto ${x.rows} rows — it must stay one row and scroll`);
    if (!x.activeWhole) throw new Error(`${name}: the current tab is not fully in view`);
    if (!x.roles) throw new Error(`${name}: the tab group is not a W3C APG tablist (role/aria-controls/aria-labelledby)`);
    if (!x.roving) throw new Error(`${name}: the tab strip has no roving tabindex — exactly one tab is focusable`);
  }
  return m;
}

/* ── run ──────────────────────────────────────────────────────────────────────────────────────── */
const REPORT = [];
const SELECTED = ONLY ? PAGES.filter((e) => ONLY.has(e.n) || ONLY.has(e.pattern) || ONLY.has(e.shell)) : PAGES;
if (ONLY && !SELECTED.length) throw new Error('CP_ONLY matched no page');
console.log('\nrendering the composition atlas');
let SIG = null;
for (const page of SELECTED) {
  const id = (page.shell ? 'shell-' + page.shell : page.pattern).replace(/\./g, '-');
  /* EVERY LEAF STATE THE SHELL DECLARES, enumerated from the tree — a panel cannot exist without a
     render that opens it. A plain page has exactly one, unnamed. */
  const states = page.shell ? statesOf(page) : [{ key: '', sel: {} }];
  for (const state of states) {
    for (const surface of SURFACES) {
      const name = `${page.n}-${id}${state.key ? '-' + state.key : ''}-${surface}`;
      const r = await shot(name, page, surface, { diagram: surface === 'desktop', state });
      const m = verify(name, page, r);
      /* CONTROL · THE AUTHORED TAB STRUCTURE IS IDENTICAL AT EVERY WIDTH AND IN EVERY STATE. This is
         the invariant the whole disclosure axis exists to protect: the renderer may never create,
         remove, reorder or collapse a tab, and a width may never be the reason one moved. */
      if (page.shell) {
        if (SIG == null) SIG = m.tabSig;
        else if (m.tabSig !== SIG)
          throw new Error(`${name}: the tab structure is\n    ${m.tabSig}\n  but the shell declares\n    ${SIG}`);
      }
      REPORT.push({ image: name, shell: page.shell || null, state: state.key || null,
        pattern: page.shell ? m.grids.map((G) => G.pattern).join(' + ') : page.pattern,
        subdesign: m.grids.map((G) => G.subdesign).join(' + '), surface,
        aspect: r.built.instances[0] ? r.built.instances[0].aspect : null,
        pageHeight: m.docH, sig: sig(m) });
      console.log(`  ${name.padEnd(50)} ${String(r.g.width).padStart(4)}px page ${String(m.docH).padStart(5)}px  `
        + m.grids.map((G) => `${G.pattern}/${G.subdesign}`).join(' + '));
    }
  }
}

/* CONTROL · ADVERSARIAL CONTENT MOVES NOTHING BUT HEIGHT. The arrangements exist before the content
   is inserted, so a hostile payload may make the page taller and may NEVER change which subdesign
   is used, which slots exist, or how wide any of them is. This is the control that would have
   caught every resolver this project has thrown away. */
console.log('\ncontrol · adversarial payloads must move nothing but height');
let adv = 0;
for (const page of SELECTED) {
  if (!page.adversarial) continue;
  for (const surface of ['desktop', 'phone']) {
    const id = (page.shell ? 'shell-' + page.shell : page.pattern).replace(/\./g, '-');
    const name = `${page.n}-${id}-${surface}-adversarial`;
    /* the baseline is THIS PAGE's plain render, not the first page that happens to share the pattern —
       three pages use visual.explanation and they legitimately take different subdesigns */
    const base0 = REPORT.find((x) => x.image === `${page.n}-${id}-${surface}`);
    const r = await shot(name, page, surface, { adversarial: true });
    verify(name, page, r);
    const got = sig(r.m);
    if (got !== base0.sig)
      throw new Error(`an adversarial payload changed the composition at ${surface} / ${page.pattern || page.shell}\n`
        + `  plain       ${base0.sig}\n  adversarial ${got}`);
    adv++;
  }
  console.log(`  ${String(page.pattern || 'shell.' + page.shell).padEnd(26)} same subdesign, same slots, same widths — only taller`);
}
if (!adv) throw new Error('no page declared an adversarial payload, so the strongest control never ran');

/* CONTROL · A DIFFERENT MEDIA SHAPE TAKES THE PATTERN'S OTHER APPROVED SUBDESIGN — and takes it
   OUTRIGHT, not by degrees. The aspect class is a property of the authored domain, so this is the
   one input besides the surface that may move a composition, and the pattern must already contain
   the answer rather than inventing one. */
console.log('\ncontrol · a different media aspect selects the pattern’s other approved subdesign');
let alt = 0;
for (const page of SELECTED) {
  if (!page.alternate) continue;
  const name = `${page.n}-${page.pattern.replace(/\./g, '-')}-desktop-alternate`;
  const r = await shot(name, page, 'desktop', { alternate: true });
  verify(name, page, r);
  const g0 = r.m.grids[0], b0 = r.built.instances[0];
  if (g0.subdesign !== page.alternate.expect)
    throw new Error(`${name}: a ${b0.aspect} plane took "${g0.subdesign}", and the page `
      + `expects the pattern's "${page.alternate.expect}" subdesign`);
  const w = g0.slots.find((x) => x.name === 'media').w;
  console.log(`  ${page.pattern.padEnd(26)} ${b0.aspect} plane → ${g0.subdesign}, media slot ${w}px`);
  alt++;
}
if (!alt) throw new Error('no page offered an alternate media, so the aspect-driven subdesign is untested');

await figPage.close(); await browser.close(); server.close();

if (!LIVE.localX.length) throw new Error('no region ever overflowed horizontally, so the local-x contract is untested');
console.log(`\ncontrol · local-x needed at ${LIVE.localX.length} render(s) — first: ${LIVE.localX[0]}`);
if (!LIVE.pane.length) throw new Error('a pane was declared but never actually overflowed at any width, '
  + 'so scrollOwnership=pane is a claim rather than a tested contract');
console.log(`control · a pane genuinely overflowed at ${LIVE.pane.length} render(s) — first: ${LIVE.pane[0]}`);
console.log(`control · optional-collapse fired at ${LIVE.collapse.length} render(s)`
  + (LIVE.collapse.length ? ` — first: ${LIVE.collapse[0]}` : ''));
console.log(LIVE.reserved.length
  ? `control · optional-reserved painted at ${LIVE.reserved.length} render(s)`
  : 'note      · no pattern in this catalogue needed `optional-reserved`. The policy is declared and its\n'
    + '            control is in place; nothing here yet has a designed emptiness worth naming, and saying\n'
    + '            so is better than inventing one to make a count non-zero.');

/* CONTROL · THE TWO KINDS ARE DISTINGUISHABLE. Keeping each kind's affordance constant across depths
   is only half the claim: if `views` and `collection` paint the SAME affordance, a reader cannot tell
   an item selector from a view switch and the encoding has bought nothing. The per-depth control
   could not catch that — `views` occurs only at depth 1 in this corpus, so nothing disagreed with it
   — and a regression that styled the nested views strip as an item selector passed it. */
if (!AFFORD.collection || !AFFORD.views)
  throw new Error('the corpus does not paint both tab kinds, so nothing tests that they differ');
if (AFFORD.collection.sig === AFFORD.views.sig)
  throw new Error(`both tab kinds paint the same affordance (${AFFORD.views.sig}) — an item selector `
    + `and a view switch are different claims about the content and must look different`);
console.log('\nTHE TWO TAB KINDS — one affordance each, at every depth, and distinguishable');
for (const [k, v] of Object.entries(AFFORD)) console.log(`  ${k.padEnd(11)} ${v.sig}`);
console.log('\nTHE CATALOGUE, AS RENDERED');
for (const id of Object.keys(PATTERNS).filter((k) => !k.startsWith('_'))) {
  const rs = REPORT.filter((r) => r.pattern === id);
  if (!rs.length) continue;
  console.log(`  ${id.padEnd(26)} ${rs.map((r) => `${r.surface[0]}:${r.subdesign}`).join(' ')}`
    + `  page ${Math.min(...rs.map((r) => r.pageHeight))}-${Math.max(...rs.map((r) => r.pageHeight))}px`);
}
fs.writeFileSync(path.join(OUT, 'composition-report.json'), JSON.stringify(REPORT, null, 2));
console.log(`\nwrote ${path.relative(root, OUT)} — ${REPORT.length + adv + alt} renders, `
  + `${Object.keys(PATTERNS).filter((k) => !k.startsWith('_')).length} patterns, `
  + `${new Set(REPORT.filter((r) => r.shell).map((r) => r.shell)).size} shell(s), `
  + `${new Set(REPORT.map((r) => r.image.split('-').slice(0, 1).join())).size} pages`);
