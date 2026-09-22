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
/* --out NAMES A DIRECTORY, and an ABSOLUTE one is taken at its word. `path.join(root, …, '/tmp/x')`
   silently treats the absolute path as a relative segment and writes INSIDE the repository — which is how
   100 scratch captures ended up committed under docs/atlas/presentation/tmp/. An absolute path now goes
   where it says, a relative one stays inside the atlas directory, and anything that climbs out of it with
   `..` is refused rather than quietly redirected. */
const OUT = (() => {
  const v = arg('out', 'after');
  if (path.isAbsolute(v)) return v;
  const dir = path.resolve(root, 'docs/atlas/presentation', v);
  if (!dir.startsWith(path.resolve(root, 'docs/atlas/presentation') + path.sep)) {
    console.error(`--out "${v}" resolves outside docs/atlas/presentation; give an absolute path instead.`);
    process.exit(2);
  }
  return dir;
})();
fs.mkdirSync(OUT, { recursive: true });

/* --app <path> serves a DIFFERENT copy of the application, which is how the "before" side is taken:
   `git show <ref>:lesson-studio.html > /tmp/before.html` and point this at it. Never by stashing the
   working tree — a stash of an already-committed file saves nothing, the run then photographs the FIXED
   app and labels it "before", and the pop that follows can land an unrelated older stash on the branch.
   (It did, once, on the way to these captures.) */
const APP = fs.readFileSync(arg('app', path.join(root, 'lesson-studio.html')), 'utf8');
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

/* --review adds a DESKTOP capture on a tall viewport, so one picture carries the whole worked example,
   its answer and the opening of the section below it — the rhythm of the page, not a cropped boundary.
   Height is safe to change for this: every composition decision on this page is keyed on WIDTH
   (mxRowSplits, mxBridgeFits, mxFootStage) and the plane's height bound is a constant, not a viewport
   fraction. The standard 1536x1100 pass runs alongside it and is what the geometry is read from. */
const REVIEW = process.argv.indexOf('--review') > 0;
const SURFACES = REVIEW
  ? [{ id: 'review', w: 1536, h: 2600 }]
  : [{ id: 'desktop', w: 1536, h: 1100 }, { id: 'tablet', w: 834, h: 1300 }];
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
  /* AN OPERATOR IS PART OF AN EXPRESSION ONLY WHEN IT HAS AN OPERAND ON BOTH SIDES. A minus that merely
     signs a number in prose — "the whole of −4 is squared", "Starting from _x_ = −3" — has a WORD to its
     left, and a line break in front of it is ordinary prose wrapping, not a split expression. So the
     host's text is read FLATTENED, across element boundaries (`<i>x</i> = −4` is one thing, not three),
     and an operator counts only when a value stands either side of it, skipping spaces and one leading
     sign. The break is then measured between those two operands.
     The earlier version read one text node at a time, could not see past the italic, and reported the
     prose case as a defect — which is why it passed on one machine and failed on CI, where the fonts
     wrap in different places. The measure was wrong, not the page. */
  /* LINES ARE CLUSTERED BY VERTICAL OVERLAP, NOT BY EQUAL TOPS. A built-up fraction puts its numerator
     above the line and its denominator below it, so `_y_ = 4/9` hands back rectangles at three different
     tops on ONE line; counting distinct tops calls that a line break. Two rectangles belong to the same
     line whenever they overlap vertically at all — which is exactly how this file already reads the lines
     of a wrapped answer. */
  const lineCount = (rects) => { const rs = [].slice.call(rects).filter((r) => r.width >= 1 && r.height >= 1)
      .sort((a, b) => a.top - b.top), out = [];
    rs.forEach((r) => { const c = out[out.length - 1];
      if (c && r.top < c.bottom - 2) c.bottom = Math.max(c.bottom, r.bottom); else out.push({ bottom: r.bottom }); });
    return out.length; };
  const flat = (host) => { const out = [], w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const val = !!(n.parentElement && n.parentElement.closest('i, sup'));
      for (let k = 0; k < n.nodeValue.length; k++) out.push({ c: n.nodeValue.charAt(k), n: n, k: k, val: val }); }
    return out; };
  const OPCH = '=+−×÷±≤≥', SIGNCH = '+−';
  const isVal = (t) => !!t && (t.val || /[0-9.()\[\]]/.test(t.c));
  const splitsIn = (host) => { const f = flat(host), bad = [];
    const skip = (i, d) => { while (f[i] && /\s/.test(f[i].c)) i += d; return i; };
    for (let i = 0; i < f.length; i++) {
      if (f[i].val || OPCH.indexOf(f[i].c) < 0) continue;
      const l = skip(i - 1, -1); let r = skip(i + 1, 1);
      if (f[r] && !f[r].val && SIGNCH.indexOf(f[r].c) >= 0) r = skip(r + 1, 1);
      if (!isVal(f[l]) || !isVal(f[r])) continue;
      /* …and a break AT A CHUNK BOUNDARY is the deliberate one, not a defect: a run too long for its
         column is split into held chunks on purpose, and the break between two of them is where the
         mathematics was meant to break. Only a break inside one chunk, or in notation the grammar
         never held at all, counts here. */
      const runOf = (t) => t.n.parentElement && t.n.parentElement.closest('.mx-nb');
      const rl = runOf(f[l]), rr = runOf(f[r]);
      if (rl && rr && rl !== rr) continue;
      const rg = document.createRange(); rg.setStart(f[l].n, f[l].k); rg.setEnd(f[r].n, f[r].k + 1);
      if (lineCount(rg.getClientRects()) > 1) bad.push(`${host.className || host.tagName}: "${rg.toString().replace(/\s+/g, ' ')}"`);
    }
    return bad; };
  const split = [];
  [].slice.call(live.querySelectorAll(MATH)).filter(vis).forEach((h) => { [].push.apply(split, splitsIn(h)); });
  const wrapped = split;
  const runs = [].slice.call(live.querySelectorAll('.mx-nb')).filter(vis);
  const lines = (e) => lineCount(e.getClientRects());
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
      if (scrolled) { await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, name.replace('.png', '__foot.png')) });
        /* THE SEAM ITSELF, clipped to the foot's own top edge rather than to a fraction of the page, so the
           before and the after are the same window on the same join even though the after page is taller. */
        const clip = await p.evaluate(({ gid }) => {
          const pane = document.querySelector(`[data-mx-panel="${gid}"]`);
          const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
          const foot = live.querySelector('.mx-wexfoot'); if (!foot) return null;
          const r = foot.getBoundingClientRect(), s = live.querySelector('.mx-wexsurface') || live;
          const sr = s.getBoundingClientRect();
          return { x: Math.max(0, Math.round(sr.left) - 8), y: Math.max(0, Math.round(r.top) - 150),
            width: Math.min(Math.round(sr.width) + 16, 2000), height: 300 };
        }, { gid: V.group });
        if (clip && clip.height > 0) await p.screenshot({ path: path.join(OUT, name.replace('.png', '__seam.png')), clip }); }
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
