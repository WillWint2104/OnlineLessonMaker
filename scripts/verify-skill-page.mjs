#!/usr/bin/env node
// THE SKILL PAGE AND THE THREE RESPONSE MODES.
//
//   node scripts/verify-skill-page.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-skill-page.mjs
//
// WHY THIS GATE EXISTS. The factorising review found a lesson that rendered correctly and taught badly:
// a skill's explanation, its video, its worked examples and its questions were four unrelated top-level
// pages. The `skill` page is the correction — ONE instructional section — and the claims that matter are
// not "it renders" but: the whole skill is on one surface, the JSON alone decides how a student answers,
// and a student is never shown a control that does nothing.
//
// EVERY CLAIM IS PAIRED WITH A CONTROL, because "no answer boxes" and "the probe cannot see answer boxes"
// look identical on a page that has none either way.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const f = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;
const SKILL = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/lesson/factorising-skills.app.json'), 'utf8'));

let pass = 0, fail = 0;
const ok = (what, cond, detail) => {
  if (cond) { pass++; console.log(`PASS ${what}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`FAIL ${what}${detail ? '  ' + detail : ''}`); }
};
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errs = [];
const open = async (lesson, slide = 0) => {
  const p = await browser.newPage({ viewport: { width: 1536, height: 960 } });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, s }) => { LESSON = JSON.parse(JSON.stringify(L)); cur = 0; render(); go(s); }, { L: lesson, s: slide });
  await p.waitForTimeout(320);
  return p;
};
const read = (p) => p.evaluate(() => {
  const host = document.querySelector('.mx-page') || document.body;
  return {
    mode: document.querySelector('.mx').getAttribute('data-mx-response'),
    sections: [...document.querySelectorAll('.mx-sk-sec .mx-sk-h')].map((e) => e.textContent.replace(/^\d+/, '').trim()),
    concepts: document.querySelectorAll('.mx-sk-notes .mx-item').length,
    groupTitles: [...document.querySelectorAll('.mx-sk-gh')].map((e) => e.textContent.trim()),
    examples: document.querySelectorAll('.mx-wexex').length,
    steps: document.querySelectorAll('.mx-step').length,
    questions: document.querySelectorAll('.mx-sk-qs .mx-item').length,
    /* every digital response surface, counted — the claim is ABSENCE, so each is named */
    inputs: document.querySelectorAll('.mx-page input, .mx-page textarea, .mx-cell').length,
    workbook: document.querySelectorAll('.mx-wb, [data-tp-ink]').length,
    /* BUTTONS, not attributes. The shell publishes its own state as data-mx-view on the root, so a probe
       that counts the attribute reports a control where there is none — it did, once, and the page was
       innocent. What matters is what a student can click. */
    respSelector: document.querySelectorAll('button[data-mx-resp]').length,
    viewSwitch: document.querySelectorAll('button[data-mx-view]').length,
    blanks: document.querySelectorAll('td.mx-blank').length,
    iframes: document.querySelectorAll('.mx-page iframe').length,
    iframeSrc: (document.querySelector('.mx-page iframe') || {}).src || '',
    missingNotice: document.querySelectorAll('.mx-sk-vmissing').length,
    /* a simulated player is the thing that must never come back */
    fakePlayer: document.querySelectorAll('.mx-vplay, .mx-vtrack, .mx-vtime, .mx-vbar').length,
    nav: [...document.querySelectorAll('.mx-navitem')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
    /* notation that leaked to the student */
    leaked: (host.innerText.match(/_[A-Za-z][A-Za-z0-9]*_?/g) || []),
    tabs: document.querySelectorAll('[data-mx-tab]').length,
  };
});

console.log('--- one skill is one instructional section ---');
{
  const p = await open(SKILL);
  const r = await read(p);
  ok('A SKILL IS ONE SURFACE — notes, video, worked examples and practice in one page, in that order',
     r.sections.length === 4 && /Notes/.test(r.sections[0]) && /Watch|Video/i.test(r.sections[1])
     && /Worked/i.test(r.sections[2]) && /Practice/i.test(r.sections[3]),
     r.sections.join(' → '));
  ok('…and every part of it is actually there', r.concepts === 5 && r.examples === 4 && r.steps === 16 && r.questions === 7,
     `${r.concepts} concept(s) · ${r.examples} example(s) · ${r.steps} step(s) · ${r.questions} question(s)`);
  ok('…and a group keeps its teaching title, which the tab bar used to carry',
     r.groupTitles.length === 2 && r.groupTitles.every((t) => t.length > 3), r.groupTitles.join(' | '));
  ok('NO TAB STRIP — the student never switches to reconstruct one skill', r.tabs === 0, `${r.tabs} tab(s)`);
  ok('the rail names the skill by its teaching title and its number',
     r.nav.length === 1 && /Factorising monic quadratics/.test(r.nav[0]) && /Skill 1/.test(r.nav[0]), JSON.stringify(r.nav[0]));
  ok('NO NOTATION REACHES THE STUDENT AS LITERAL TEXT', r.leaked.length === 0,
     r.leaked.length ? r.leaked.join(' · ') : 'no _x_ or ^n markers survive anywhere on the page');
  await p.close();
}

console.log('\n--- the lesson JSON decides how a student answers ---');
{
  const mk = (mode) => { const L = JSON.parse(JSON.stringify(SKILL)); if (mode === null) delete L.meta.responseMode; else L.meta.responseMode = mode; return L; };
  const rows = [];
  for (const m of [null, 'paper', 'pen', 'typed', 'write', 'type', 'nonsense']) {
    const p = await open(mk(m)); rows.push([m, await read(p)]); await p.close();
  }
  const by = Object.fromEntries(rows.map(([m, r]) => [String(m), r]));
  ok('PAPER IS THE DEFAULT FOR A SKILL-BASED LESSON — one that says nothing gets paper',
     by.null.mode === 'paper', `no responseMode → ${JSON.stringify(by.null.mode)}`);
  ok('…and `pen` and `typed` are names for the values already in 24 committed lessons — no migration',
     by.pen.mode === 'write' && by.typed.mode === 'type' && by.write.mode === 'write' && by.type.mode === 'type',
     `pen→${by.pen.mode} · typed→${by.typed.mode} · write→${by.write.mode} · type→${by.type.mode}`);
  ok('…and an unknown mode falls back rather than pretending — the old code silently made "paper" a pen workbook',
     by.nonsense.mode === 'paper', `"nonsense" → ${JSON.stringify(by.nonsense.mode)}`);
  ok('ON PAPER THERE IS NOTHING DIGITAL TO ANSWER INTO — no input, no workbook, no view switch',
     by.paper.inputs === 0 && by.paper.workbook === 0 && by.paper.viewSwitch === 0,
     `${by.paper.inputs} input(s) · ${by.paper.workbook} workbook(s) · ${by.paper.viewSwitch} view switch(es)`);
  ok('…and the table question’s empty cells become ruled blanks to copy, not fields',
     by.paper.blanks > 0 && by.paper.inputs === 0, `${by.paper.blanks} blank cell(s), ${by.paper.inputs} input(s)`);
  ok('A STUDENT NEVER CHOOSES THE MODE — the selector is absent in Study, in every mode',
     [by.paper, by.pen, by.typed].every((r) => r.respSelector === 0),
     `paper ${by.paper.respSelector} · pen ${by.pen.respSelector} · typed ${by.typed.respSelector} control(s)`);
  /* CONTROL: the same probe, on the same page, in Edit — where the author's preview IS offered. If this
     reads 0 too, the probe cannot see the control and the assertion above proves nothing. */
  const p = await open(mk('paper'));
  await p.evaluate(() => { document.querySelector('#modeSeg [data-mode="edit"]').click(); });
  await p.waitForTimeout(400);
  const ed = await read(p);
  ok('CONTROL: in EDIT the author gets a preview control, so "absent in Study" is measured and not blind',
     ed.respSelector >= 3, `${ed.respSelector} preview control(s) in Edit`);
  /* …and previewing must not rewrite the lesson. */
  const after = await p.evaluate(() => { const b = document.querySelector('[data-mx-resp="type"]'); if (b) b.click();
    return { saved: LESSON.meta.responseMode, live: document.querySelector('.mx').getAttribute('data-mx-response') }; });
  ok('…and the preview changes the session, never the saved lesson',
     after.saved === 'paper' && after.live === 'type',
     `meta.responseMode stays ${JSON.stringify(after.saved)} while the page previews ${JSON.stringify(after.live)}`);
  await p.close();
}

console.log('\n--- the video is real or it is honest ---');
{
  const withUrl = JSON.parse(JSON.stringify(SKILL));
  withUrl.slides[0].video = { url: 'https://www.youtube.com/watch?v=ABCDEFGHIJK' };
  let p = await open(withUrl); const a = await read(p); await p.close();
  ok('A REAL URL IS EMBEDDED, through the app’s own allowlist gate',
     a.iframes === 1 && /youtube\.com\/embed\/ABCDEFGHIJK/.test(a.iframeSrc) && a.fakePlayer === 0,
     a.iframeSrc || '(no iframe)');
  const noUrl = JSON.parse(JSON.stringify(SKILL));
  p = await open(noUrl); const b = await read(p); await p.close();
  ok('NO URL MEANS NO PLAYER — an author-facing notice, and not one simulated control',
     b.iframes === 0 && b.missingNotice === 1 && b.fakePlayer === 0,
     `${b.iframes} iframe(s) · ${b.missingNotice} notice(s) · ${b.fakePlayer} simulated player part(s)`);
  const badUrl = JSON.parse(JSON.stringify(SKILL));
  badUrl.slides[0].video = { url: 'javascript:alert(1)' };
  p = await open(badUrl); const c = await read(p); await p.close();
  ok('…and a dangerous or non-allowlisted address is refused, not framed',
     c.iframes === 0 && c.missingNotice === 1, `${c.iframes} iframe(s) for a javascript: URL`);
}

console.log('\n--- the JSON decides how many skills ---');
{
  for (const n of [1, 3]) {
    const L = JSON.parse(JSON.stringify(SKILL));
    const one = L.slides[0];
    L.slides = Array.from({ length: n }, (_, k) => Object.assign(JSON.parse(JSON.stringify(one)),
      { id: 'skill-' + (k + 1), navLabel: 'Skill topic ' + (k + 1), title: 'Skill topic ' + (k + 1) }));
    const p = await open(L);
    const r = await read(p);
    ok(`a lesson of ${n} skill(s) lists ${n} in the rail, numbered in order`,
       r.nav.length === n && r.nav.every((t, k) => t.includes('Skill ' + (k + 1))), r.nav.join(' | '));
    await p.close();
  }
}

console.log('\n--- the mode is re-read when a new lesson is loaded ---');
{
  /* THE REAL LOADING PATH IS THE ⌗ DIALOG, not an assignment to LESSON, and mxResponseMode() memoises.
     Without a reset there, a teacher who opened a pen lesson and then opened this paper one was given the
     pen workbook on top of a paper lesson — the previous lesson's answer, silently. */
  const pen = JSON.parse(JSON.stringify(SKILL));
  pen.meta = Object.assign({}, pen.meta, { responseMode: 'pen' });
  const paper = JSON.parse(JSON.stringify(SKILL));
  paper.meta = Object.assign({}, paper.meta, { responseMode: 'paper' });
  const p = await browser.newPage({ viewport: { width: 1536, height: 960 } });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  const load = async (L) => {
    await p.evaluate((txt) => { document.querySelector('#jsonArea').value = txt;
      document.querySelector('#jsonLoad').click(); }, JSON.stringify(L));
    await p.waitForTimeout(400);
    return read(p);
  };
  const first = await load(pen);
  const second = await load(paper);
  ok('a lesson loaded through the ⌗ dialog is on the mode it authored', first.mode === 'write',
     `pen → ${JSON.stringify(first.mode)}`);
  ok('AND THE NEXT LESSON BRINGS ITS OWN — the previous lesson’s mode does not survive the load',
     second.mode === 'paper' && second.inputs === 0 && second.workbook === 0,
     `then paper → ${JSON.stringify(second.mode)}, ${second.inputs} input(s), ${second.workbook} workbook(s)`);
  await p.close();
}

ok('no page error anywhere', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
await browser.close(); server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
