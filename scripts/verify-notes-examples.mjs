#!/usr/bin/env node
// THE STAGE C GATE — Notes and Worked Examples, driven by the lesson JSON rather than by the renderer.
//
//   node scripts/verify-notes-examples.mjs
//
// The point of Stage C is that these two pages are REAL: the concept list, the representation tabs and the
// example tabs are whatever the lesson authors, with authored ids and labels, and the flat output contains
// all of it rather than whichever tab happened to be open. Every claim here is paired with a control that
// changes the JSON and shows the page following it, because "it renders" and "it is data-driven" look
// identical on a fixture that happens to match the hard-coded case.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
const FIX = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-shell.json'), 'utf8'));
const NOTES = FIX.slides.findIndex((s) => s.type === 'notes');
const WEX = FIX.slides.findIndex((s) => s.type === 'workedExamples');

let pass = 0, fail = 0; const sections = new Set();
const mark = (s) => sections.add(s);
const ok = (what, cond, detail) => {
  if (cond) { pass++; console.log(`PASS ${what}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`FAIL ${what}${detail ? '  ' + detail : ''}`); }
};
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const pageErrs = [];
const open = async ({ w = 1536, h = 1024, slide = NOTES, lesson = FIX } = {}) => {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => pageErrs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, s }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(s); }, { L: lesson, s: slide });
  await p.waitForTimeout(500);
  return p;
};
const tabs = (p) => p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mx-tab]'))
  .map((e) => ({ id: e.dataset.mxTab, label: e.textContent.trim() })));
const panels = (p) => p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mx-panel]'))
  .map((e) => ({ id: e.dataset.mxPanel, shown: !e.hidden })));

// ══ Notes ════════════════════════════════════════════════════════════════════════════════════════
mark('notes');
{
  const p = await open();
  const concepts = await p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mx-concept]')).map((e) => e.dataset.mxConcept));
  const authored = FIX.slides[NOTES].concepts.map((c) => c.id);
  ok('the concept list is whatever the lesson authors, keyed by authored id',
     concepts.join(',') === authored.join(',') && concepts.length !== 4,
     `${concepts.length} concepts: ${concepts.join(', ')}`);
  ok('CONTROL: the count is not fixed at four — this lesson authors five and gets five',
     concepts.length === authored.length && authored.length === 5, `${authored.length} authored, ${concepts.length} rendered`);
  const t = await tabs(p), pn = await panels(p);
  ok('the representation tabs are the authored ones, labelled and ordered as authored',
     t.map((x) => x.id).join('/') === 'graph/table/coordinates' && t.map((x) => x.label).join('/') === 'Graph/Table/Coordinates',
     t.map((x) => `${x.id}="${x.label}"`).join(' · '));
  ok('exactly one representation is shown at a time', pn.filter((x) => x.shown).length === 1 && pn[0].shown,
     pn.map((x) => x.id + (x.shown ? ' (shown)' : '')).join(' · '));
  const drawn = await p.evaluate(() => !!document.querySelector('[data-mx-panel="graph"] svg'));
  await p.click('[data-mx-tab="table"]'); await p.waitForTimeout(250);
  const tbl = await p.evaluate(() => { const e = document.querySelector('[data-mx-panel="table"]');
    return { shown: !e.hidden, cells: e.querySelectorAll('td').length, text: e.textContent.replace(/\s+/g, '') }; });
  await p.click('[data-mx-tab="coordinates"]'); await p.waitForTimeout(250);
  const co = await p.evaluate(() => { const e = document.querySelector('[data-mx-panel="coordinates"]');
    return { shown: !e.hidden, items: e.querySelectorAll('li').length }; });
  ok('each representation renders its own authored content, through primitives the app already has',
     drawn && tbl.shown && tbl.cells === 7 && /9410149/.test(tbl.text) && co.shown && co.items === 7,
     `graph: a drawn figure · table: ${tbl.cells} value cells · coordinates: ${co.items} points`);
  // changing tabs must not disturb the rest of the page
  const kept = await p.evaluate(() => {
    const before = [].slice.call(document.querySelectorAll('[data-mx-concept]')).map((e) => e.dataset.mxConcept).join(',');
    const head = document.querySelector('.mx-title').textContent;
    document.querySelector('[data-mx-tab="graph"]').click();
    return { same: before === [].slice.call(document.querySelectorAll('[data-mx-concept]')).map((e) => e.dataset.mxConcept).join(','),
      head: head === document.querySelector('.mx-title').textContent,
      fig: !!document.querySelector('[data-mx-panel="graph"] svg') }; });
  ok('changing tab does not recreate the rest of the page', kept.same && kept.head && kept.fig,
     'concepts, heading and the drawn figure are the same nodes');
  ok('nothing on the Notes page asks the student to type into it',
     await p.evaluate(() => document.querySelectorAll('.mx-content input, .mx-content textarea, .mx-content [contenteditable="true"]').length === 0),
     'no "record in your notes" field, no "what to write down" panel');
  await p.close();
}
{
  // The Key Idea is optional enrichment, and its absence must leave nothing behind.
  const p = await open();
  const withKI = await p.evaluate(() => { const a = document.querySelector('.mx-keyidea');
    return { present: !!a, w: a ? Math.round(a.getBoundingClientRect().width) : 0,
      head: Math.round(document.querySelector('.mx-head').getBoundingClientRect().height) }; });
  const without = await p.evaluate(() => { delete LESSON.slides[0].keyIdea; go(0);
    const a = document.querySelector('.mx-keyidea');
    const boxes = [].slice.call(document.querySelectorAll('.mx-head *')).filter((e) => {
      const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 20 && !e.textContent.trim(); });
    return { present: !!a, emptyBoxes: boxes.length,
      head: Math.round(document.querySelector('.mx-head').getBoundingClientRect().height),
      title: !!document.querySelector('.mx-title') }; });
  await p.waitForTimeout(200);
  ok('the Key Idea is optional, and removing it leaves no reserved hole',
     withKI.present && !without.present && without.emptyBoxes === 0 && without.title,
     `present ${withKI.w}px wide · absent: no element, ${without.emptyBoxes} empty boxes, heading intact`);
  ok('CONTROL: it really was there to remove — the same page renders it when authored',
     withKI.present && withKI.w > 100, `the aside measured ${withKI.w}px`);
  await p.close();
}
{
  // Relabel and reorder in the JSON; the renderer is not touched.
  const alt = JSON.parse(JSON.stringify(FIX));
  const reps = alt.slides[NOTES].representations;
  alt.slides[NOTES].representations = [reps[2], reps[0], reps[1]];
  alt.slides[NOTES].representations[0].label = 'Ordered pairs';
  alt.slides[NOTES].representations.push({ id: 'story', label: 'In words',
    content: { kind: 'prose', body: 'Squaring turns every _x_ into a value at or above zero.' } });
  const p = await open({ lesson: alt });
  const t = await tabs(p);
  ok('CONTROL: relabelling and reordering the authored list changes the page, with no renderer change',
     t.map((x) => x.id).join('/') === 'coordinates/graph/table/story'
     && t[0].label === 'Ordered pairs' && t.length === 4,
     t.map((x) => `${x.id}="${x.label}"`).join(' · '));
  ok('and a fourth representation appears — the tab count follows the JSON',
     (await panels(p)).length === 4 && (await p.evaluate(() => !!document.querySelector('[data-mx-panel="story"]'))),
     '4 tabs, 4 panels');
  await p.close();
}
// ══ Worked examples ══════════════════════════════════════════════════════════════════════════════
mark('examples');
{
  const p = await open({ slide: WEX });
  const t = await tabs(p);
  const authored = FIX.slides[WEX].examples;
  ok('the example tabs are the authored examples, by authored id',
     t.map((x) => x.id).join('/') === authored.map((e) => e.id).join('/'),
     t.map((x) => `${x.id}="${x.label}"`).join(' · '));
  const counts = await p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mx-panel]'))
    .map((e) => ({ id: e.dataset.mxPanel, steps: e.querySelectorAll('.mx-step').length,
      vis: !!e.querySelector('.mx-wexvis'), result: !!e.querySelector('.mx-wexres') })));
  ok('every example shows its whole solution — the steps are not compressed to fit',
     counts.every((c) => c.steps >= 3) && counts.map((c) => c.steps).join('/') === '3/4/5',
     counts.map((c) => `${c.id}: ${c.steps} steps${c.result ? ' + answer' : ''}`).join(' · '));
  ok('an example with an authored visual gets a real second column; one without does not reserve it',
     counts[1].vis && !counts[0].vis && !counts[2].vis
     && (await p.evaluate(() => { document.querySelector('[data-mx-tab="ex-solve"]').click();
       const b = document.querySelector('[data-mx-panel="ex-solve"] .mx-wexbody');
       return getComputedStyle(b).gridTemplateColumns.split(' ').length === 2; }))
     && (await p.evaluate(() => { const b = document.querySelector('[data-mx-panel="ex-evaluate"] .mx-wexbody');
       return b.classList.contains('mx-wexsolo'); })),
     'Example 2 is two columns; Examples 1 and 3 use the full width');
  await p.waitForTimeout(200);
  ok('the visual is a real figure with room to be read, not a thumbnail',
     await p.evaluate(() => { const v = document.querySelector('[data-mx-panel="ex-solve"] .mx-wexvis svg');
       if (!v) return false; const r = v.getBoundingClientRect(); return r.width >= 280 && r.height >= 200; }),
     await p.evaluate(() => { const v = document.querySelector('[data-mx-panel="ex-solve"] .mx-wexvis svg');
       const r = v.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
  ok('no student response field belongs on a Worked Example page, and there is none',
     await p.evaluate(() => document.querySelectorAll(
       '.mx-wex input[type="text"], .mx-wex textarea, .mx-wex [contenteditable="true"], .mx-wex [data-tp-resp-id], .mx-wex [data-mx-cell]').length === 0),
     'no text inputs, no response-store pads, no answer cells');
  ok('it is a page in its own right, not a card inside another page',
     await p.evaluate(() => !document.querySelector('.mx-work') && !!document.querySelector('.mx-wex')),
     'no workspace slot; the page owns its own two-column body');
  await p.close();
}
{
  const alt = JSON.parse(JSON.stringify(FIX));
  alt.slides[WEX].examples = alt.slides[WEX].examples.slice(0, 2).concat([
    { id: 'ex-extra', label: 'Extra practice', question: 'One more.', steps: [{ id: 's1', text: 'Only step.' }] },
    { id: 'ex-more', label: 'Challenge', question: 'And another.', steps: [{ id: 's1', text: 'Only step.' }] }]);
  const p = await open({ slide: WEX, lesson: alt });
  const t = await tabs(p);
  ok('CONTROL: "Example 1/2/3" is not a three-tab design — four authored examples give four tabs',
     t.length === 4 && t[2].label === 'Extra practice' && t[3].id === 'ex-more',
     t.map((x) => x.label).join(' · '));
  await p.close();
}
// ══ the flat output ══════════════════════════════════════════════════════════════════════════════
mark('flat');
{
  const p = await open();
  const flat = await p.evaluate(() => { openWorksheet(); const h = document.querySelector('#wsSheet');
    const txt = h.textContent;
    return { text: txt, repHeads: [].slice.call(h.querySelectorAll('.ws-mx-reph')).map((x) => x.textContent.trim()),
      exHeads: [].slice.call(h.querySelectorAll('.ws-mx-exh')).map((x) => x.textContent.trim()),
      concepts: h.querySelectorAll('.ws-mx-concepts li').length,
      steps: h.querySelectorAll('.ws-mx-steps li').length,
      figs: h.querySelectorAll('.ws-mx-fig').length,
      tables: h.querySelectorAll('.ws-mx-rep table').length,
      lists: h.querySelectorAll('.ws-mx-rep ul li').length }; });
  const repLabels = FIX.slides[NOTES].representations.map((r) => r.label);
  const exLabels = FIX.slides[WEX].examples.map((e) => e.label);
  ok('every authored representation is in the flat output, under its authored label',
     repLabels.every((l) => flat.repHeads.indexOf(l) >= 0) && flat.tables === 1 && flat.lists === 7,
     `${flat.repHeads.join(' · ')} — with the table's rows and all ${flat.lists} coordinates`);
  ok('every authored example is in it too, with its whole solution',
     exLabels.every((l) => flat.exHeads.indexOf(l) >= 0) && flat.steps === 12,
     `${flat.exHeads.join(' · ')} — ${flat.steps} solution steps in total`);
  ok('and the concepts and the Key Idea travel with them',
     flat.concepts === 5 && /Key idea/i.test(flat.text), `${flat.concepts} concepts, Key Idea present`);
  const active = FIX.slides[NOTES].representations[0].label;
  const hidden = repLabels.slice(1).concat(exLabels.slice(1));
  ok('CONTROL: rendering only the active tab would have dropped most of the page',
     hidden.every((l) => flat.text.indexOf(l) >= 0),
     `${hidden.length} of the ${repLabels.length + exLabels.length} sections were behind a tab ("${active}" was the open one) and all are present`);
  ok('CONTROL: the flat output is built from the JSON, so a re-labelled tab travels into print too',
     await p.evaluate(() => { LESSON.slides[0].representations[1].label = 'Table of values';
       openWorksheet(); return /Table of values/.test(document.querySelector('#wsSheet').textContent); }),
     'renaming "Table" reaches the worksheet with no renderer change');
  await p.close();
}
const SECTIONS = ['notes', 'examples', 'flat'];
ok('every section ran', SECTIONS.every((s) => sections.has(s)), `${sections.size} sections`);
ok('no page error while rendering or switching', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | ') || 'none');
await browser.close(); server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
