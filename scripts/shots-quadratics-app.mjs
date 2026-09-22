#!/usr/bin/env node
/* ── THE QUADRATICS LESSON, IN THE ACTUAL APPLICATION ────────────────────────────────────────────
   node scripts/shots-quadratics-app.mjs

   Loads docs/atlas/lesson/quadratics.app.json into lesson-studio.html — the real app, its real
   renderer, its real stylesheet — and photographs every tab and every state at the desktop and
   tablet surfaces. This is the deliverable the standalone renderer was always standing in for.

   It also MEASURES what the approved composition asks for and prints it beside what the app painted,
   so "the graph is on its approved stage" is a number rather than an impression. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* --lesson <path> photographs a DIFFERENT lesson file through the same app and the same measurements —
   which is how the lesson rebuilt through the inspector is shown beside the committed one. --out <dir>
   keeps the two sets apart. Both default to the committed lesson and its own folder, so every existing
   invocation is unchanged. */
const arg = (n, d) => { const k = process.argv.indexOf('--' + n); return k > 0 && process.argv[k + 1] ? process.argv[k + 1] : d; };
const OUT = path.resolve(root, arg('out', 'docs/atlas/app-lesson'));
fs.mkdirSync(OUT, { recursive: true });
const LESSON = JSON.parse(fs.readFileSync(path.resolve(root, arg('lesson', 'docs/atlas/lesson/quadratics.app.json')), 'utf8'));
const GRID = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/composition/src/grid.json'), 'utf8'));

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

/* THE TWO SURFACES UNDER REVIEW. The viewport is chosen so the app's worked-example surface lands on
   the composition catalogue's own desktop surface — measured, not guessed: at 1536 the app's inner
   width is exactly 1152px, which is the surface `down-8` was designed on. */
const SURFACES = [{ id: 'desktop', w: 1536, h: 1100 }, { id: "tablet", w: 834, h: 1400 }];
const GROUPS = LESSON.slides[0].groups;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const REPORT = [];

for (const S of SURFACES) {
  for (const g of GROUPS) {
    const states = (g.states || []).length > 1 ? g.states.map((x) => x.id) : [null];
    for (const st of states) {
      const p = await browser.newPage({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: 2 });
      const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
      await p.goto(base, { waitUntil: 'load' });
      await p.evaluate(({ L }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(0); }, { L: LESSON });
      await p.waitForTimeout(400);
      await p.evaluate(({ gid, sid }) => {
        const tab = document.querySelector(`[data-mx-tab="${gid}"]`); if (tab) tab.click();
        if (sid) { const pane = document.querySelector(`[data-mx-panel="${gid}"]`);
          const b = pane && pane.querySelector(`[data-mx-state="${sid}"]`); if (b) b.click(); }
      }, { gid: g.id, sid: st });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(700);

      const m = await p.evaluate(({ gid }) => {
        const wex = document.querySelector('.mx-wex');
        const pane = document.querySelector(`[data-mx-panel="${gid}"]`);
        const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
        const surf = pane.querySelector('.mx-wexsurface');
        const cs = getComputedStyle(surf);
        const inner = surf.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const cw = getComputedStyle(wex);
        const num = (k) => parseFloat(cw.getPropertyValue(k));
        const foot = live.querySelector('.mx-wexfoot[data-mx-form="pair"]');
        const gz = foot && foot.querySelector('[data-mx-region="graph"]');
        const iz = foot && foot.querySelector('[data-mx-region="interpretation"]');
        const fig = gz && gz.querySelector('.mx-part[data-mx-part="figure"]');
        const svg = gz && gz.querySelector('.tp-fig-svg');
        const R = (e) => e.getBoundingClientRect();
        /* px per unit on each axis, off the painted SVG — the mathematics, not the container */
        let scale = null;
        if (svg) {
          const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
          const r = R(svg), labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
          const val = (x) => parseFloat(x.textContent.replace('−', '-'));
          const per = (a, at) => { const z = labs.filter((x) => x.getAttribute('text-anchor') === a)
              .map((x) => ({ v: val(x), px: +x.getAttribute(at) })).filter((o) => isFinite(o.v));
            if (z.length < 2) return null; z.sort((i, j) => i.v - j.v);
            const d = z[z.length - 1].v - z[0].v; return d ? Math.abs((z[z.length - 1].px - z[0].px) / d) : null; };
          const ux = per('middle', 'x'), uy = per('end', 'y');
          if (ux && uy) scale = { x: +(ux * r.width / vb[2]).toFixed(2), y: +(uy * r.height / vb[3]).toFixed(2) };
        }
        const sr = surf.getBoundingClientRect();
        const contentL = sr.left + parseFloat(cs.paddingLeft), contentR = sr.right - parseFloat(cs.paddingRight);
        /* THE SPAN THIS FOOT ASKED FOR, not the page default — the two approved desktop subdesigns
           differ, so reading the fallback token would compare `down-12` against `down-8`'s number. */
        const fcs = foot ? getComputedStyle(foot) : null;
        const fnum = (k, d) => { const v = fcs && parseFloat(fcs.getPropertyValue(k)); return isFinite(v) ? v : d; };
        return { inner: Math.round(inner), foot: document.querySelector('.mx').dataset.mxFoot,
          subdesign: foot ? foot.getAttribute('data-mx-sub') : null,
          cols: num('--mx-cols'), gutter: num('--mx-gutter'),
          span: fnum('--mx-media-span', num('--mx-media-span')),
          start: fnum('--mx-media-start', num('--mx-media-start')),
          readStart: fnum('--mx-read-start', num('--mx-media-start')),
          measure: num('--mx-measure'), stageMin: num('--mx-stage-min'),
          graph: gz ? { w: Math.round(R(gz).width), h: Math.round(R(gz).height),
            freeL: Math.round(R(gz).left - contentL), freeR: Math.round(contentR - R(gz).right) } : null,
          reading: iz ? { w: Math.round(R(iz).width), h: Math.round(R(iz).height),
            top: Math.round(R(iz).top - R(gz).bottom), freeL: Math.round(R(iz).left - contentL) } : null,
          plane: fig ? { w: Math.round(R(fig).width), h: Math.round(R(fig).height) } : null,
          scale, tabs: [].slice.call(document.querySelectorAll('[data-mx-tab]')).map((b) => b.textContent.trim()),
          tables: live.querySelectorAll('.mx-tblwrap').length,
          expand: !!live.querySelector('.tp-fig-expand,[data-fig-expand],.tp-fig-head button') };
      }, { gid: g.id });
      if (errs.length) throw new Error(`${g.id}/${st}: ${errs[0]}`);

      const name = `APP__${g.id.replace(/^g-/, '')}${st ? '-' + st : ''}__${S.id}`;
      /* THE WHOLE LESSON PAGE, NOT THE WINDOW ONTO IT. The app's shell is a fixed-height frame with a
         scrolling content area, so a viewport-sized shot is a picture of the frame. The viewport is
         grown until the content no longer scrolls, then the page is photographed whole — the same
         pixels a reader sees, with none of it left below the fold. */
      const need = await p.evaluate(() => {
        const sc = [].slice.call(document.querySelectorAll('.mx-page,.mx-content,.mx-main,.mx-split,.mx'))
          .filter((e) => e.scrollHeight > e.clientHeight + 2);
        return sc.reduce((n, e) => Math.max(n, e.scrollHeight - e.clientHeight), 0);
      });
      if (need > 0) { await p.setViewportSize({ width: S.w, height: Math.min(9000, S.h + need + 80) });
        await p.waitForTimeout(500); }
      const shotEl = await p.$('.mx-page') || await p.$('.mx');
      await shotEl.screenshot({ path: path.join(OUT, name + '.png') });
      const left = await p.evaluate(() => {
        const sc = [].slice.call(document.querySelectorAll('.mx-page,.mx-content,.mx-main,.mx-split,.mx'))
          .filter((e) => e.scrollHeight > e.clientHeight + 2);
        return sc.reduce((n, e) => Math.max(n, e.scrollHeight - e.clientHeight), 0);
      });
      if (left > 0) console.log(`    ! ${name}: ${left}px still below the fold`);
      await p.close();

      /* what the approved grid asks for, at the surface the app actually gave us */
      const colW = (m.inner - (m.cols - 1) * m.gutter) / m.cols;
      const want = m.foot === 'stage' ? Math.round(m.span * colW + (m.span - 1) * m.gutter) : m.inner;
      REPORT.push({ image: name, surface: S.id, viewport: S.w, group: g.id, state: st, ...m, wantMedia: want });
      console.log(`${name.padEnd(42)} inner ${String(m.inner).padStart(5)}  ${(m.subdesign || (m.foot === 'full' ? 'full-width' : '-')).padEnd(9)}`
        + (m.graph ? `  media ${String(m.graph.w).padStart(5)}/${String(want).padStart(5)}px  free ${String(m.graph.freeL).padStart(4)}/${String(m.graph.freeR).padStart(4)}`
          + `  plane ${m.plane.w}×${m.plane.h}  reading ${m.reading.w}px`
          + (m.scale ? `  px/unit ${m.scale.x}/${m.scale.y}` : '') : '  (no media foot)'));
    }
  }
}

/* ── THE INTERACTION PASS ────────────────────────────────────────────────────────────────────────
   A screenshot proves a page painted; it does not prove a student can move through it. Everything
   below is DRIVEN — the tabs are clicked, the representations are switched, the figure is expanded
   and closed — and every verdict is read back off the DOM afterwards, never assumed from the click
   returning. The authored JSON is the expectation on each one, so a lesson edit moves the numbers
   rather than quietly passing. */
let ipass = 0, ifail = 0;
const iok = (what, cond, detail) => {
  if (cond) { ipass++; console.log(`PASS ${what}${detail ? '  ' + detail : ''}`); }
  else { ifail++; console.log(`FAIL ${what}${detail ? '  ' + detail : ''}`); }
};
{
  console.log('\n── driven through the application, desktop ──');
  const p = await browser.newPage({ viewport: { width: 1536, height: 1100 } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(0); }, { L: LESSON });
  await p.waitForTimeout(400);

  /* TAB SWITCHING. Each tab is clicked in turn and the page is asked which panel is actually live —
     a tab that highlights while the old panel stays on screen would pass a "the tab is pressed" test. */
  const tabs = [];
  for (const g of GROUPS) {
    await p.evaluate((gid) => document.querySelector(`[data-mx-tab="${gid}"]`).click(), g.id);
    await p.waitForTimeout(250);
    tabs.push(await p.evaluate((gid) => {
      const shown = [].slice.call(document.querySelectorAll('[data-mx-panel]')).filter((n) => !n.hidden && n.offsetParent !== null);
      const b = document.querySelector(`[data-mx-tab="${gid}"]`);
      const live = shown[0];
      return { gid, only: shown.length, live: live && live.getAttribute('data-mx-panel'),
        pressed: b.getAttribute('aria-selected') === 'true' || b.getAttribute('aria-pressed') === 'true',
        chars: live ? live.textContent.replace(/\s+/g, ' ').trim().length : 0 };
    }, g.id));
  }
  iok('every authored subtopic is a tab, and clicking one makes that subtopic — and only it — the live panel',
      tabs.length === GROUPS.length && tabs.every((t) => t.live === t.gid && t.only === 1),
      tabs.map((t) => `${t.gid.replace(/^g-/, '')}→${t.live === t.gid ? 'live' : t.live}(${t.only})`).join(' · '));
  iok('and each one carries its own teaching, not a re-skin of the last',
      new Set(tabs.map((t) => t.chars)).size === tabs.length,
      tabs.map((t) => `${t.gid.replace(/^g-/, '')} ${t.chars} chars`).join(' · '));

  /* THE TWO SYMMETRY REPRESENTATIONS. A staged group shows exactly one at a time, and the hidden one
     must reserve no space — the defect the standalone renderer was checked for, re-checked here. */
  /* found by what it IS — the group that authors representations — not by the id the committed lesson
     happens to give it, so --lesson can point at a lesson whose ids were generated by the editor. */
  const sym = GROUPS.find((g) => Array.isArray(g.states) && g.states.length);
  await p.evaluate((gid) => document.querySelector(`[data-mx-tab="${gid}"]`).click(), sym.id);
  const states = [];
  for (const st of sym.states) {
    await p.evaluate(({ gid, sid }) => document.querySelector(`[data-mx-panel="${gid}"]`).querySelector(`[data-mx-state="${sid}"]`).click(), { gid: sym.id, sid: st.id });
    await p.waitForTimeout(300);
    states.push(await p.evaluate((gid) => {
      const pane = document.querySelector(`[data-mx-panel="${gid}"]`);
      const panes = [].slice.call(pane.querySelectorAll('.mx-stpane'));
      const live = panes.filter((n) => !n.hidden);
      const hidden = panes.filter((n) => n.hidden);
      return { live: live.length, liveId: live[0] && live[0].getAttribute('data-mx-statepanel'),
        hiddenH: hidden.reduce((n, e) => n + Math.round(e.getBoundingClientRect().height), 0),
        /* ONLY THE INLINE DRAWING. Every figure carries a second, hidden <svg> inside its focused-
           workspace overlay, so a bare `.tp-fig-svg` count reports two where the page shows one. */
        figs: live[0] ? [].slice.call(live[0].querySelectorAll('.tp-fig-svg')).filter((e) => !e.closest('.tp-overlay')).length : 0,
        answers: live[0] ? live[0].querySelectorAll('[data-mx-sec="answer"]').length : 0 };
    }, sym.id));
  }
  iok('the Symmetry subtopic offers both representations and shows exactly one at a time',
      states.length === 2 && states.every((s) => s.live === 1), states.map((s) => `${s.liveId}: ${s.live} live`).join(' · '));
  iok('and the one that is not showing reserves no height — it is absent, not merely invisible',
      states.every((s) => s.hiddenH === 0), states.map((s) => `${s.liveId}: hidden ${s.hiddenH}px`).join(' · '));
  iok('and the graph arrives with the representation that earns it, not with the workings',
      states.find((s) => s.liveId === 'visual').figs === 1 && states.find((s) => s.liveId === 'workings').figs === 0,
      states.map((s) => `${s.liveId}: ${s.figs} drawing(s)`).join(' · '));

  /* GRAPH EXPANSION. The inline plane is on the approved stage, which is a reading size, not a
     working size; the focused workspace is how a student gets closer. Both the opening and the
     RETURN are measured — an overlay that never closes is a trap, not a feature. */
  await p.evaluate((gid) => document.querySelector(`[data-mx-panel="${gid}"]`).querySelector('[data-mx-state="visual"]').click(), sym.id);
  await p.waitForTimeout(300);
  const before = await p.evaluate(() => Math.round(document.querySelector('.mx-wexfoot .tp-fig-svg').getBoundingClientRect().width));
  await p.evaluate(() => document.querySelector('.mx-wexfoot .tp-fig-expand').click());
  await p.waitForTimeout(800);
  const open = await p.evaluate(() => {
    const panel = [].slice.call(document.querySelectorAll('.tp-fpanel-figx')).filter((e) => e.getBoundingClientRect().width > 0)[0];
    const svg = panel && panel.querySelector('.tp-fig-svg');
    return { panel: !!panel, w: svg ? Math.round(svg.getBoundingClientRect().width) : 0,
      h: svg ? Math.round(svg.getBoundingClientRect().height) : 0 };
  });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => {
    const open = [].slice.call(document.querySelectorAll('.tp-fpanel-figx')).filter((e) => e.getBoundingClientRect().width > 0).length;
    const inline = document.querySelector('.mx-wexfoot .tp-fig-svg');
    return { open, w: inline ? Math.round(inline.getBoundingClientRect().width) : 0 };
  });
  iok('the graph expands into the focused workspace, and it really is bigger than the page allows',
      open.panel && open.w > before + 200, `inline ${before}px → workspace ${open.w}×${open.h}px`);
  iok('and Escape returns the student to the lesson with the inline graph back at its approved width',
      after.open === 0 && after.w === before, `${after.open} workspace(s) open, inline back at ${after.w}px`);

  /* THE WORKED SOLUTIONS AND THE TABLE. Counted against the lesson JSON, because "steps are present"
     is satisfied by one step and this lesson authors fourteen. */
  const authored = GROUPS.reduce((n, g) => n + (g.examples || []).reduce((m, e) => m + (e.steps || []).length, 0), 0);
  /* A STAGED GROUP'S ANSWER APPEARS ONCE PER STATE THAT DECLARES IT — not once per example. The
     Symmetry subtopic partitions its examples across `workings` and `visual`, and only `workings`
     shows the result, so counting one answer per example would expect the page to repeat itself. */
  const answers = GROUPS.reduce((n, g) => {
    const withAns = (g.examples || []).filter((e) => e.answer).length;
    const decl = (g.states || []).filter((st) => (st.show || []).includes('answer')).length;
    return n + withAns * ((g.states || []).length ? decl : 1);
  }, 0);
  const seen = { steps: 0, answers: 0, tables: 0, cells: 0 };
  for (const g of GROUPS) {
    await p.evaluate((gid) => document.querySelector(`[data-mx-tab="${gid}"]`).click(), g.id);
    await p.waitForTimeout(250);
    const got = await p.evaluate((gid) => {
      const pane = document.querySelector(`[data-mx-panel="${gid}"]`);
      const panes = [].slice.call(pane.querySelectorAll('.mx-stpane'));
      const scope = panes.length ? panes : [pane];
      let steps = 0, answers = 0, tables = 0, cells = 0;
      for (const n of scope) { steps += n.querySelectorAll('.mx-step').length;
        answers += n.querySelectorAll('[data-mx-sec="answer"]').length;
        tables += n.querySelectorAll('.mx-tblwrap').length;
        cells += n.querySelectorAll('.mx-tblwrap td,.mx-tblwrap th').length; }
      return { steps, answers, tables, cells };
    }, g.id);
    for (const k of Object.keys(seen)) seen[k] += got[k];
  }
  /* A COMPANION HAS THREE LEGAL SHAPES — a bare part, a {parts:[…]} wrapper and an array — and mxParts()
     reads all three, so a script that measures what the page drew has to read all three too. Reading only
     the first is how this check once reported "0 cells authored" against a page that had just drawn 24:
     the lesson rebuilt through the inspector writes the array form, which is the shape the editor
     canonicalises on and which this had never seen. */
  const parts = (v) => !v || typeof v !== 'object' ? [] : Array.isArray(v) ? v : Array.isArray(v.parts) ? v.parts : (v.kind ? [v] : []);
  const tbl = GROUPS.flatMap((g) => (g.examples || [])).flatMap((e) => (e.steps || []))
    .map((s) => parts(s.visual).filter((q) => q && q.kind === 'table')).filter((a) => a.length);
  const tblSpec = tbl.flat()[0];
  const wantCells = tblSpec ? (tblSpec.head.length + 1) + tblSpec.rows.length * (tblSpec.rows[0].cells.length + 1) : 0;
  iok('every authored working step reaches the page, across all four subtopics',
      seen.steps === authored, `${seen.steps} rendered / ${authored} authored`);
  iok('and every worked example states its result',
      seen.answers === answers, `${seen.answers} rendered / ${answers} authored`);
  iok('and the table of values arrives whole — every heading and every cell the lesson authors',
      seen.tables === tbl.length && seen.cells === wantCells,
      `${seen.tables} table(s), ${seen.cells} cells / ${wantCells} authored (${tblSpec ? tblSpec.rows.length + '×' + tblSpec.rows[0].cells.length + ' + stub + head' : 'none'})`);
  /* STUDY, EDIT AND PRESENT. The maintainer's acceptance condition, and the honest answer is that the
     mathematics page family has NO inline edit affordance: renderCanvas sets mode='study' for the duration
     of a responsive page and restores it after, so Edit renders Study-identical by design, and tagZones only
     hooks the legacy canvas slide types. So what is asserted is what is actually claimed — the lesson
     survives all three intact — rather than an invented per-mode difference. Present is entered and left
     through its own controls; Escape only leaves fullscreen, which headless does not have. */
  const shape = () => ({ mode, body: document.body.className,
    present: document.body.classList.contains('present'),
    tabs: document.querySelectorAll('[data-mx-tab]').length,
    steps: document.querySelectorAll('.mx-step').length,
    answers: document.querySelectorAll('[data-mx-sec="answer"]').length,
    tables: document.querySelectorAll('.mx-tblwrap').length,
    chars: (document.querySelector('.mx-page') || document.body).textContent.replace(/\s+/g, ' ').trim().length });
  /* FROM THE SAME STANDING START EACH TIME. Switching mode re-renders the slide, which returns both the tab
     AND a staged group's state to their defaults — and textContent counts hidden panes, so capturing Study
     on whatever the drive above left behind reported the `visual` state against the others' `workings` and
     called a 28-character difference a mode defect. It was the probe, not the page. */
  const firstTab = () => p.evaluate(() => { render(); go(0); });
  await firstTab(); await p.waitForTimeout(350);
  const modes = { study: await p.evaluate(shape) };
  await p.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
  await p.waitForTimeout(450); await firstTab(); await p.waitForTimeout(300); modes.edit = await p.evaluate(shape);
  await p.evaluate(() => document.querySelector('#presentBtn').click());
  await p.waitForTimeout(550); await firstTab(); await p.waitForTimeout(300); modes.present = await p.evaluate(shape);
  await p.evaluate(() => document.querySelector('#presentExit').click());
  await p.waitForTimeout(550); await firstTab(); await p.waitForTimeout(300); modes.back = await p.evaluate(shape);
  const same = (a, b) => a.tabs === b.tabs && a.steps === b.steps && a.answers === b.answers && a.tables === b.tables && a.chars === b.chars;
  iok('the whole lesson survives Study, Edit and Present — every tab, step, answer and table, in all three',
      modes.study.tabs === GROUPS.length && same(modes.study, modes.edit) && same(modes.study, modes.present),
      Object.entries(modes).map(([k, v]) => `${k}: ${v.tabs} tabs / ${v.steps} steps / ${v.answers} answers / ${v.tables} table / ${v.chars} chars`).join(' · '));
  iok('and each mode really is the mode it claims — Edit is not Study wearing its name, Present sets the board',
      modes.study.mode === 'study' && !modes.study.present && modes.edit.mode === 'edit' && modes.present.present,
      `study mode=${modes.study.mode} · edit mode=${modes.edit.mode} · present body="${modes.present.body}"`);
  iok('and Present gives the lesson back when it is left, rather than stranding the reader on the board',
      !modes.back.present && same(modes.study, modes.back), `back to body="${modes.back.body}", ${modes.back.chars} chars`);
  iok('and nothing threw while any of that was driven', errs.length === 0, errs[0] || 'no page errors');
  await p.close();
}

await browser.close(); server.close();
fs.writeFileSync(path.join(OUT, 'app-lesson-report.json'), JSON.stringify(REPORT, null, 2));
console.log(`\nwrote ${path.relative(root, OUT)} — ${REPORT.length} renders · ${ipass}/${ipass + ifail} interaction checks passed`);
process.exit(ifail ? 1 : 0);
