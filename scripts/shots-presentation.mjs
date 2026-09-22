#!/usr/bin/env node
/* ── THE THREE PRESENTATION CORRECTIONS, PHOTOGRAPHED AND MEASURED ──────────────────────────────
   node scripts/shots-presentation.mjs --out before     (on the unfixed tree)
   node scripts/shots-presentation.mjs --out after      (on the fixed tree)

   The real quadratics lesson, served as a REAL DOCUMENT — `#lesson-data` replaced, so the app boots the
   way an exported lesson boots and Edit is the application's own Edit, not a lesson swapped into a booted
   page. Study and Edit, desktop and tablet, the same four views each time, so before and after are the
   same photograph twice.

   Beside every capture it prints the three things under correction as NUMBERS, not impressions:
     · whether any mathematical run is split across lines, and whether anything overflows its region
     · what colour the question region is painted, and what separates it from the working
     · what stands between the last worked example and the section below it, and how far apart they are
   A picture can be argued with; these cannot. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.join(root, 'docs/atlas/presentation', arg('out', 'after'));
fs.mkdirSync(OUT, { recursive: true });

const APP = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');
const QUAD = fs.readFileSync(path.join(root, 'docs/atlas/lesson/quadratics.app.json'), 'utf8');
/* the lesson as a document: this is what Export writes and what a school opens */
const DOC = APP.replace(/(<script id="lesson-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  (m, a, b) => `${a}\n${QUAD}\n${b}`);

const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/quadratics.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(DOC); }
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  r.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const SURFACES = [{ id: 'desktop', w: 1536, h: 1100 }, { id: 'tablet', w: 834, h: 1300 }];
const MODES = ['study', 'edit'];
const VIEWS = [{ id: 'substitution', group: 'g-substitution', state: null },
               { id: 'symmetry', group: 'g-symmetry', state: 'visual' }];

/* ── what the page actually painted ─────────────────────────────────────────────────────────── */
const READ = ({ gid }) => {
  const R = (e) => e.getBoundingClientRect();
  const pane = document.querySelector(`[data-mx-panel="${gid}"]`);
  const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
  const vis = (e) => e && e.offsetParent !== null && R(e).height > 0;

  /* 1 — MATHEMATICS THAT WRAPPED. Two measures, because only one of them can see the OLD tree.
     (a) engine-independent: for every relation or operator painted anywhere in the teaching text, a Range
         over the few characters either side of it. A Range that reports two client rectangles is a Range
         the browser broke a line inside — that is an expression split across lines, whether or not this
         build marks its runs. It reads the same on both sides of the change, which is the whole point.
     (b) the marked runs, once they exist: a held run split across lines would be a run held in vain. */
  const MATH = '.mx-wexqb, .mx-stepm, .mx-wexrv, .mx-relations li, .mx-stept';
  const OPS = /[=+−×÷±≤≥]/g;
  const wrapped = [];
  [].slice.call(live.querySelectorAll(MATH)).filter(vis).forEach((host) => {
    const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = n.nodeValue; OPS.lastIndex = 0;
      for (let m = OPS.exec(t); m; m = OPS.exec(t)) {
        const a = Math.max(0, m.index - 3), b = Math.min(t.length, m.index + 4);
        const r = document.createRange(); r.setStart(n, a); r.setEnd(n, b);
        if (r.getClientRects().length > 1) wrapped.push(`${host.className || host.tagName}: "…${t.slice(a, b)}…"`);
      }
    }
  });
  /* A held run is SPLIT only when its fragments sit on different lines. An inline element also reports
     several client rectangles for fragments side by side on one line — an italic beside upright text is
     enough — so counting rectangles alone reports a defect that is not there. Compare their tops. */
  const runs = [].slice.call(live.querySelectorAll('.mx-nb')).filter(vis);
  const lines = (e) => { const t = []; [].slice.call(e.getClientRects())
    .forEach((r) => { if (!t.some((y) => Math.abs(y - r.top) < 4)) t.push(r.top); }); return t.length; };
  const broken = runs.filter((e) => lines(e) > 1)
    .map((e) => e.textContent.replace(/\s+/g, ' ').trim());
  /* nothing may reach past its own region, at any width */
  const over = [].slice.call(live.querySelectorAll(MATH)).filter(vis)
    .filter((e) => e.scrollWidth > e.clientWidth + 1)
    .map((e) => `${e.className || e.tagName} ${e.scrollWidth}>${e.clientWidth}`);

  /* 2 — THE QUESTION REGION. What it is painted, and what stands between it and the working. */
  const ask = live.querySelector('.mx-wexask'), work = live.querySelector('.mx-wexwork');
  const qb = ask && ask.querySelector('.mx-wexqb');
  const sep = (() => {
    if (!ask || !work) return 'no row';
    const w = getComputedStyle(work), a = getComputedStyle(ask);
    if (parseFloat(w.borderLeftWidth) > 0) return `rule beside (${w.borderLeftColor})`;
    if (parseFloat(a.borderBottomWidth) > 0) return `rule under (${a.borderBottomColor})`;
    return 'none';
  })();

  /* 3 — WHAT OPENS THE SECTION BELOW THE EXAMPLES, and the clear space either side of it. */
  const seq = live.querySelector('.mx-wexseq'), foot = live.querySelector('.mx-wexfoot');
  const gap = (() => {
    if (!foot) return null;
    const fs_ = getComputedStyle(foot), fr = R(foot);
    const prev = foot.previousElementSibling;
    const heading = foot.querySelector(':scope > .mx-wexlab') || foot.querySelector('.mx-wexzl');
    return { divider: parseFloat(fs_.borderTopWidth) > 0 ? fs_.borderTopColor : 'none',
      above: prev ? Math.round(fr.top - R(prev).bottom) : null,
      below: Math.round(parseFloat(fs_.paddingTop)),
      bled: Math.round(R(foot).width - (seq ? R(seq).width : R(foot).width)),
      heading: heading ? heading.textContent.trim() : '(none)',
      after: prev ? (prev.className.split(' ')[0] || prev.tagName) : '(first)' };
  })();

  /* the graph, so "geometry preserved" is a number on both sides of the change */
  const svg = [].slice.call(live.querySelectorAll('.tp-fig-svg')).filter((e) => !e.closest('.tp-overlay'))[0];
  const plane = svg ? { w: Math.round(R(svg).width), h: Math.round(R(svg).height),
    left: Math.round(R(svg).left), vb: svg.getAttribute('viewBox') } : null;

  return { broken, over, wrapped, runs: runs.length,
    showing: live === pane ? '(whole pane)' : live.dataset.mxStatepanel,
    askBg: ask ? getComputedStyle(ask).backgroundColor : '(no question)',
    qColor: qb ? getComputedStyle(qb).color : '-', sep, gap, plane,
    mode: typeof mode === 'undefined' ? '?' : mode,
    seg: ((([].slice.call(document.querySelectorAll('#modeSeg button')).find((b) => b.classList.contains('on')) || {}).dataset) || {}).mode };
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const report = [];
for (const S of SURFACES) {
  for (const M of MODES) {
    for (const V of VIEWS) {
      const p = await browser.newPage({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: 2 });
      const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
      await p.goto(`${origin}/quadratics.html`, { waitUntil: 'load' });
      await p.waitForTimeout(350);
      if (M === 'edit') { await p.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click()); await p.waitForTimeout(450); }
      /* Click the tab and the state as a reader would — and CHECK the page moved, repeatedly. In Edit a
         click on the canvas also selects a zone and rebuilds the slide, and a rebuild can put the first
         tab back after the switch has apparently succeeded: a capture that only clicked would photograph
         the wrong group and label it the right one. So: click, settle, and while anything is still hidden
         use the app's own mxShowTab / mxShowState. The capture prints how it got there. */
      const how = await p.evaluate(async ({ gid, sid }) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const tab = () => document.querySelector(`[data-mx-tab="${gid}"]`);
        const pn = () => document.querySelector(`[data-mx-panel="${gid}"]`);
        const stb = () => document.querySelector(`[data-mx-panel="${gid}"] [data-mx-state="${sid}"]`);
        const stp = () => document.querySelector(`[data-mx-panel="${gid}"] [data-mx-statepanel="${sid}"]`);
        const out = [];
        if (tab()) { tab().click(); out.push('tab clicked'); }
        await sleep(250);
        if (sid && stb()) { stb().click(); out.push('state clicked'); }
        await sleep(400);
        for (let i = 0; i < 6; i++) {
          let again = false;
          if (pn() && pn().hidden) { mxShowTab(tab()); out.push('tab re-shown'); again = true; }
          if (sid && stp() && stp().hidden) { mxShowState(stb()); out.push('state re-shown'); again = true; }
          if (!again) break;
          await sleep(350);
        }
        return out.join(' → ');
      }, { gid: V.group, sid: V.state });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(500);
      /* A plane revealed out of `hidden` measured zero until this moment, so give the engine the nudge the
         app itself gives it and wait for a painted width rather than for a guessed number of milliseconds. */
      await p.evaluate(() => { if (typeof scheduleFigFit === 'function') scheduleFigFit(); });
      await p.waitForFunction(() => { const s = [].slice.call(document.querySelectorAll('.tp-fig-svg'))
        .filter((e) => !e.closest('.tp-overlay') && e.getClientRects().length);
        return !s.length || s.every((e) => e.getBoundingClientRect().width > 1); }, null, { timeout: 8000 })
        .catch(() => console.log('   (a plane never took a width)'));
      await p.waitForTimeout(400);
      const m = await p.evaluate(READ, { gid: V.group });
      const name = `${V.id}__${M}__${S.id}.png`;
      /* TWO PICTURES. The page as the reader first meets it — the question and the working — and then the
         same page scrolled to where the examples end, because the teaching surface scrolls INSIDE the
         application shell and the section under correction is below the window. Scrolled, not stitched: an
         element capture taller than the viewport comes back blank below the fold here. */
      await p.screenshot({ path: path.join(OUT, name), fullPage: true });
      const scrolled = await p.evaluate(({ gid }) => {
        const pane = document.querySelector(`[data-mx-panel="${gid}"]`);
        const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
        const foot = live.querySelector('.mx-wexfoot'); if (!foot) return false;
        foot.scrollIntoView({ block: 'center' }); return true;
      }, { gid: V.group });
      if (scrolled) { await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, name.replace('.png', '__foot.png')) }); }
      report.push(Object.assign({ view: V.id, mode: M, surface: S.id, how, errors: errs }, m));
      const g = m.gap;
      console.log(`${name}\n   mode=${m.mode}/${m.seg}  [${how} → ${m.showing}]  question bg ${m.askBg}  text ${m.qColor}  separator: ${m.sep}`
        + `\n   ${m.wrapped.length} expressions split across lines · ${m.runs} held runs (${m.broken.length} split) · ${m.over.length} overflowing`
        + (m.wrapped.length ? `\n      ${m.wrapped.slice(0, 4).join('  ·  ')}` : '')
        + (m.broken.length ? `\n      HELD BUT SPLIT: ${m.broken.slice(0, 3).join(' | ')}` : '')
        + (g ? `\n   section below examples: after ${g.after}, divider ${g.divider}, ${g.above}px above / ${g.below}px below, heading "${g.heading}"` : '\n   (no section below)')
        + (m.plane ? `\n   plane ${m.plane.w}×${m.plane.h} at x=${m.plane.left}, viewBox ${m.plane.vb}` : '')
        + (errs.length ? `\n   PAGE ERRORS: ${errs.join(' · ')}` : ''));
      await p.close();
    }
  }
}
fs.writeFileSync(path.join(OUT, 'presentation-report.json'), JSON.stringify(report, null, 2));
await browser.close(); server.close();
console.log(`\nwrote ${path.relative(root, OUT)}`);
