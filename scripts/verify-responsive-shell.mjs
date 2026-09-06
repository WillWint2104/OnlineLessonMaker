#!/usr/bin/env node
// THE MATHEMATICS PAGE SHELL — Stage A.
//
//   node scripts/verify-responsive-shell.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-responsive-shell.mjs
//
// WHAT THIS HAS TO PROVE, and why each control is here.
//
// "Responsive" is the easiest claim in this app to fake. The canvas model ALREADY changes the size of a
// slide with the viewport — fitCanvas() scales 1280 logical px by 0.851 / 0.446 / 0.274 at 1440 / 834 /
// 390. A screenshot of a scaled canvas and a screenshot of a reflowed page look similar and are not the
// same thing. So every width assertion below is paired with a LEGACY control page rendered in the same
// browser at the same widths, and the control asserts the opposite: the legacy page's LOGICAL width is
// pinned at 1280 whatever the viewport, while the responsive page's regions really change and its prose
// really re-wraps.
//
// The same discipline elsewhere: a "persistent" workbook is only persistent if the questions beside it
// genuinely scroll while it does not (so the questions are first shown to be a real scroller); a toggle
// that re-rendered the page would also flip the attribute (so node identity and scroll position are
// checked across it); and `layoutMode` is only registration metadata if a lesson JSON key of that name
// is inert (so the control writes one, in both directions, and shows it changes nothing).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const results = [];
let failed = false;
const ok = (n, c, extra = '') => { results.push(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? '  ' + extra : ''}`); if (!c) failed = true; };
const note = (s) => results.push('     · ' + s);
const ran = new Set();
const mark = (k) => ran.add(k);

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const pageErrs = [];
const newPage = async (w, h) => {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => pageErrs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location().url || '')) pageErrs.push(m.text()); });
  await p.goto(base + 'lesson-studio.html', { waitUntil: 'load' });
  return p;
};

// The Stage A fixture, plus a LEGACY page appended to it so every control is a like-for-like comparison
// in the same lesson rather than a different lesson in a different browser, plus filler so the rail is a
// real scroller.  Indices: 0 notes · 4 practice · 9 legacy.
const FIX = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-shell.json'), 'utf8'));
const LESSON = JSON.parse(JSON.stringify(FIX));
const NOTES = 0, PRACTICE = 4;
LESSON.slides.push({ type: 'text', title: 'Legacy control page', body: ['This page renders through the canvas.'] });
const LEGACY = LESSON.slides.length - 1;
for (let k = 0; k < 14; k++) LESSON.slides.push({ type: 'summary', id: 'f' + k, navLabel: 'Filler page ' + (k + 1) });

const boot = (p, slide, L) => p.evaluate(({ L, slide }) => {
  LESSON = JSON.parse(JSON.stringify(L)); render(); go(slide);
}, { L: L || LESSON, slide });

const geom = (p) => p.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => el ? { w: el.offsetWidth, h: el.offsetHeight, top: el.offsetTop, left: el.offsetLeft,
    sh: el.scrollHeight, ch: el.clientHeight, over: getComputedStyle(el).overflowY, pos: getComputedStyle(el).position } : null;
  const mx = q('.mx'), lede = q('.mx-lede');
  let lines = 0;
  if (lede && lede.firstChild) { const r = document.createRange(); r.selectNodeContents(lede); lines = r.getClientRects().length; }
  return {
    respo: document.body.classList.contains('respo'),
    canvasTransform: getComputedStyle(q('#canvas')).transform,
    canvasW: q('#canvas').offsetWidth, stageW: q('#stage').clientWidth,
    navopen: !!(mx && mx.classList.contains('mx-navopen')),
    expanded: q('[data-rp-navtoggle][aria-expanded]') ? q('[data-rp-navtoggle][aria-expanded]').getAttribute('aria-expanded') : null,
    surface: q('.mx-page') ? q('.mx-page').getAttribute('data-mx-surface') : null,
    splitCols: q('.mx-split') ? getComputedStyle(q('.mx-split')).gridTemplateColumns.split(' ').length : 0,
    scrimDisplay: q('.mx-scrim') ? getComputedStyle(q('.mx-scrim')).display : null,
    chrome: ['.top', '.side', '.foot'].map(s => q(s) ? getComputedStyle(q(s)).display : 'absent'),
    mx: box(mx), nav: box(q('.mx-nav')), page: box(q('.mx-page')), split: box(q('.mx-split')),
    content: box(q('.mx-content')), work: box(q('.mx-work')),
    card: box(q('#slide .card, #slide .tp-slide')),
    ledeW: lede ? lede.offsetWidth : 0, ledeLines: lines,
    ledeCap: lede ? parseFloat(getComputedStyle(lede).maxWidth) || 0 : 0,
    headW: q('.mx-headmain') ? q('.mx-headmain').offsetWidth : 0,
    wsKind: q('.mx-work') ? q('.mx-work').getAttribute('data-rp-workspace') : null,
    wsText: q('.mx-ph') ? q('.mx-ph').textContent.trim() : null,
    grid: !!q('.mx-grid'), docScroll: document.scrollingElement.scrollTop,
    docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth,
  };
});

// ══ 1. layoutMode is REGISTRATION metadata, not lesson JSON ═══════════════════════════════════════
mark('mode');
{
  const p = await newPage(1440, 900);
  await boot(p, NOTES);
  const r = await p.evaluate(() => ({
    notes: tpLayoutMode({ type: 'notes' }), practice: tpLayoutMode({ type: 'practice' }),
    legacy: tpLayoutMode({ type: 'text' }), unknown: tpLayoutMode({ type: 'nosuch' }),
    otherTheme: (() => { const t = LESSON.meta.theme; LESSON.meta.theme = 'geolearn';
      const v = tpLayoutMode({ type: 'notes' }); LESSON.meta.theme = t; return v; })(),
    badMode: (() => { try { registerPage('mathematics', 'zz', () => '', { layoutMode: 'flexbox' }); return false; } catch (e) { return /unknown layoutMode/.test(e.message); } })(),
    badSurface: (() => { try { registerPage('mathematics', 'zz', () => '', { surface: 'parchment' }); return false; } catch (e) { return /unknown surface/.test(e.message); } })(),
  }));
  ok('the Mathematics templates report layoutMode "responsive"', r.notes === 'responsive' && r.practice === 'responsive');
  ok('a legacy type reports "canvas", and so does an unregistered one', r.legacy === 'canvas' && r.unknown === 'canvas', `${r.legacy} / ${r.unknown}`);
  ok('the SAME type under a theme that has not registered it stays on the canvas', r.otherTheme === 'canvas', 'notes + geolearn -> ' + r.otherTheme);
  ok('an unknown layoutMode or surface is refused at REGISTRATION, not at render', r.badMode && r.badSurface);

  const c = await p.evaluate((LEG) => {
    LESSON.slides[LEG].layoutMode = 'responsive';       // a legacy slide claiming the responsive path
    go(LEG);
    const legacyClaimed = { respo: document.body.classList.contains('respo'), mx: !!document.querySelector('.mx') };
    LESSON.slides[0].layoutMode = 'canvas';             // a responsive slide claiming the canvas path
    go(0);
    const shellClaimed = { respo: document.body.classList.contains('respo'), mx: !!document.querySelector('.mx') };
    delete LESSON.slides[LEG].layoutMode; delete LESSON.slides[0].layoutMode;
    return { legacyClaimed, shellClaimed, serialised: /layoutMode|"surface"/.test(JSON.stringify(LESSON)) };
  }, LEGACY);
  ok('control: a `layoutMode` key written into lesson JSON is inert in BOTH directions',
     c.legacyClaimed.respo === false && c.legacyClaimed.mx === false && c.shellClaimed.respo === true && c.shellClaimed.mx === true,
     'legacy slide claiming responsive stayed on the canvas; a template claiming canvas stayed responsive');
  ok('nothing writes layoutMode or surface back into the lesson', c.serialised === false);
  await p.close();
}

// ══ 2. the canvas is released, and released cleanly ═══════════════════════════════════════════════
mark('release');
{
  const p = await newPage(1440, 900);
  await boot(p, NOTES); const resp = await geom(p);
  await boot(p, LEGACY); const legacy = await geom(p);
  ok('a responsive page carries body.respo; a legacy page does not', resp.respo === true && legacy.respo === false);
  ok('the canvas transform is released on a responsive page', resp.canvasTransform === 'none', resp.canvasTransform);
  ok('control: the legacy page in the same lesson IS still scale()d', /^matrix/.test(legacy.canvasTransform), legacy.canvasTransform);
  ok('control: the legacy canvas is still 1280 logical px wide', legacy.canvasW === 1280, legacy.canvasW + 'px');
  ok('the responsive canvas is the stage width, not 1280', resp.canvasW !== 1280 && Math.abs(resp.canvasW - resp.stageW) <= 1,
     `canvas ${resp.canvasW}px = stage ${resp.stageW}px`);
  const inert = await p.evaluate(() => {
    go(0);
    const c = document.getElementById('canvas'), f = document.getElementById('canvasFit'), s = document.getElementById('stage');
    const snap = () => JSON.stringify([c.getAttribute('style') || '', f.getAttribute('style') || '', s.getAttribute('style') || '', c.className]);
    const before = snap(); fitCanvas(); fitCanvas(); return { before, after: snap() };
  });
  ok('calling fitCanvas() on a responsive page mutates nothing', inert.before === inert.after, inert.after);
  const back = await p.evaluate((LEG) => { go(0); go(LEG); const c = document.getElementById('canvas');
    return { t: getComputedStyle(c).transform, w: c.offsetWidth, respo: document.body.classList.contains('respo') }; }, LEGACY);
  ok('the canvas model is intact on the legacy page rendered straight after a responsive one',
     back.respo === false && back.w === 1280 && /^matrix/.test(back.t), `${back.w}px ${back.t}`);
  await p.close();
}

// ══ 3. genuinely responsive — layout changes, not just scale ══════════════════════════════════════
mark('responsive');
{
  const WIDTHS = [1440, 1100, 834, 390];
  const resp = {}, legacy = {};
  for (const w of WIDTHS) {
    const p = await newPage(w, 900);
    await boot(p, NOTES); resp[w] = await geom(p);
    await boot(p, LEGACY); legacy[w] = await geom(p);
    await p.close();
  }
  const rw = WIDTHS.map((w) => resp[w].content.w);
  const lw = WIDTHS.map((w) => legacy[w].card.w);
  ok('the content region really changes width with the viewport', new Set(rw).size === WIDTHS.length,
     WIDTHS.map((w, k) => `${w}->${rw[k]}px`).join('  '));
  ok('control: the legacy page keeps ONE logical width at every viewport (it is scaled, not reflowed)',
     new Set(lw).size === 1, WIDTHS.map((w, k) => `${w}->${lw[k]}px`).join('  '));
  // The reading measure is a CAP, not the container width: on a wide screen the prose stops at the
  // measure instead of running the full width of the region it sits in.
  const wide = resp[1440];
  ok('on a wide screen the prose is held at its reading measure, not stretched to the region',
     wide.ledeCap > 0 && Math.abs(wide.ledeW - wide.ledeCap) <= 1 && wide.ledeW < wide.headW - 40,
     `lede ${wide.ledeW}px = the ${wide.ledeCap}px measure, inside a ${wide.headW}px region`);
  ok('below the measure it tracks the viewport and the prose genuinely re-wraps',
     resp[390].ledeW < wide.ledeCap && resp[390].ledeLines > wide.ledeLines,
     `390 -> ${resp[390].ledeW}px / ${resp[390].ledeLines} lines against ${wide.ledeW}px / ${wide.ledeLines}`);
  ok('two columns on a desktop, one on a handset', resp[1440].splitCols === 2 && resp[390].splitCols === 1,
     `1440 -> ${resp[1440].splitCols} cols · 390 -> ${resp[390].splitCols}`);
  ok('the page never scrolls sideways at any width', WIDTHS.every((w) => resp[w].docScrollW <= resp[w].docClientW),
     WIDTHS.map((w) => `${w}:${resp[w].docScrollW}/${resp[w].docClientW}`).join('  '));
  ok('the window itself never scrolls at any width', WIDTHS.every((w) => resp[w].docScroll === 0));
  note(`content region ${rw[0]}px at 1440 down to ${rw[3]}px at 390 — the legacy control is ${lw[0]}px at both`);
}

// ══ 4. the application chrome is ABSORBED, not stacked on top ═════════════════════════════════════
mark('chrome');
{
  const p = await newPage(1440, 900);
  await boot(p, PRACTICE); const resp = await geom(p);
  await boot(p, LEGACY); const legacy = await geom(p);
  ok('the app bar, page sidebar and footer bar are all hidden on a responsive page',
     resp.chrome.every((d) => d === 'none'), resp.chrome.join(' / '));
  ok('control: all three are still shown on the legacy page in the same lesson',
     legacy.chrome.every((d) => d !== 'none'), legacy.chrome.join(' / '));
  const one = await p.evaluate(() => { go(4);
    return { navs: document.querySelectorAll('.mx-nav, .side:not([hidden])').length,
      visibleNavs: [...document.querySelectorAll('.mx-nav, .side')].filter(n => getComputedStyle(n).display !== 'none').length }; });
  ok('exactly ONE navigation is visible', one.visibleNavs === 1, one.visibleNavs + ' visible');

  // the chrome controls are proxies: they must actually drive the real (hidden) buttons
  const prox = await p.evaluate(() => {
    go(4); const out = {};
    const fire = (sel) => document.querySelector(sel).click();
    out.startMode = mode;
    fire('[data-mx-mode="edit"]'); out.afterEdit = mode;
    fire('[data-mx-mode="study"]'); out.afterStudy = mode;
    const before = cur; fire('[data-mx-go="next"]'); out.next = cur;
    fire('[data-mx-go="prev"]'); out.back = cur; out.before = before;
    out.marked = document.querySelector('[data-mx-mode="study"]').classList.contains('on');
    return out;
  });
  ok('the Study / Edit proxies really change the application mode',
     prox.afterEdit === 'edit' && prox.afterStudy === 'study', `${prox.startMode} -> edit -> study`);
  ok('the pager proxies really navigate', prox.next === prox.before + 1 && prox.back === prox.before, `${prox.before} -> ${prox.next} -> ${prox.back}`);
  ok('the active mode is marked in the bar', prox.marked === true);
  // the Write / Type selector is lesson-level, session-only, and only on a page that takes written work
  const rsel = await p.evaluate((NOTES) => {
    go(4); const bar = document.querySelector('.mx-resp');
    const labels = bar ? [...bar.querySelectorAll('[data-mx-resp]')].map(b => b.textContent.trim()) : [];
    const start = document.querySelector('.mx').dataset.mxResponse;
    document.querySelector('[data-mx-resp="type"]').click();
    const after = { attr: document.querySelector('.mx').dataset.mxResponse,
      onType: document.querySelector('[data-mx-resp="type"]').classList.contains('on'),
      onWrite: document.querySelector('[data-mx-resp="write"]').classList.contains('on') };
    go(NOTES); const onNotes = !!document.querySelector('.mx-resp');
    go(4); const kept = document.querySelector('.mx').dataset.mxResponse;
    document.querySelector('[data-mx-resp="write"]').click();
    return { labels, start, after, onNotes, kept, storage: localStorage.length + sessionStorage.length };
  }, NOTES);
  ok('a page that takes written work offers Write / Type, defaulting to Write',
     rsel.labels.join('/') === 'Write/Type' && rsel.start === 'write', rsel.labels.join(' · '));
  ok('choosing Type changes the shell state, not just the button',
     rsel.after.attr === 'type' && rsel.after.onType && !rsel.after.onWrite);
  ok('it is a LESSON-level choice — it survives navigating away and back', rsel.kept === 'type');
  ok('and a page with no written work does not offer it', rsel.onNotes === false);
  ok('the response mode is session-only — nothing is written to storage', rsel.storage === 0);

  const narrow = await newPage(414, 860);
  await boot(narrow, PRACTICE);
  const nc = await narrow.evaluate(() => ({
    modes: getComputedStyle(document.querySelector('.mx-modes')).display,
    crumb: getComputedStyle(document.querySelector('.mx-crumb')).display,
    pager: getComputedStyle(document.querySelector('.mx-pager')).display }));
  ok('on a handset the application controls step back and the pager stays',
     nc.modes === 'none' && nc.crumb === 'none' && nc.pager !== 'none', `modes ${nc.modes} · crumb ${nc.crumb} · pager ${nc.pager}`);
  await p.close(); await narrow.close();
}

// ══ 5. the workbook is PERSISTENT ═════════════════════════════════════════════════════════════════
mark('persistent');
{
  const p = await newPage(1440, 700);
  await boot(p, PRACTICE);
  const g = await geom(p);
  ok('the practice page is a flush textbook column with a workspace beside it',
     g.surface === 'flush' && g.work !== null && g.wsKind === 'workbook' && g.grid === true);
  ok('the question column is a REAL scroller before anything is asserted about it',
     g.content.sh > g.content.ch, `${g.content.sh}/${g.content.ch}`);
  const s = await p.evaluate(() => {
    const q = (x) => document.querySelector(x);
    const c = q('.mx-content'), w = q('.mx-work'), n = q('.mx-nav');
    const workTop = w.getBoundingClientRect().top, gridTop = q('.mx-grid').getBoundingClientRect().top;
    c.scrollTop = c.scrollHeight;
    return { scrolled: c.scrollTop, workMoved: Math.abs(w.getBoundingClientRect().top - workTop),
      gridMoved: Math.abs(q('.mx-grid').getBoundingClientRect().top - gridTop),
      navScroll: n.scrollTop, page: q('.mx-page').scrollTop, stage: document.getElementById('stage').scrollTop,
      doc: document.scrollingElement.scrollTop };
  });
  ok('scrolling the questions to the end does not move the workbook one pixel',
     s.scrolled > 0 && s.workMoved === 0 && s.gridMoved === 0, `questions scrolled ${s.scrolled}px, workbook moved ${s.workMoved}px`);
  ok('and it moves nothing else either', s.navScroll === 0 && s.page === 0 && s.stage === 0 && s.doc === 0);
  const nav = await p.evaluate(() => { const n = document.querySelector('.mx-nav');
    const before = document.querySelector('.mx-content').scrollTop;
    n.scrollTop = n.scrollHeight;
    return { navScrolled: n.scrollTop, navCanScroll: n.scrollHeight > n.clientHeight, content: document.querySelector('.mx-content').scrollTop, before }; });
  ok('the rail is its own scroller too, and scrolling it leaves the questions where they were',
     nav.navCanScroll && nav.navScrolled > 0 && nav.content === nav.before, `rail ${nav.navScrolled}px`);
  await p.close();
}

// ══ 6. narrow is a different composition, not a smaller one ═══════════════════════════════════════
mark('narrow');
{
  const wide = await newPage(1280, 800); await boot(wide, PRACTICE); const W = await geom(wide);
  const nar = await newPage(414, 860); await boot(nar, PRACTICE); const N = await geom(nar);
  ok('wide: questions and workbook sit side by side, each clipped to its own box',
     W.content.top === W.work.top && W.work.left > W.content.left && W.content.over === 'auto' && W.work.over === 'hidden',
     `content left ${W.content.left} · workspace left ${W.work.left}`);
  ok('narrow: they stack, questions first, as ONE document',
     N.content.left === N.work.left && N.work.top > N.content.top && N.content.over === 'visible' && N.page.sh > N.page.ch,
     `content top ${N.content.top} · workspace top ${N.work.top} · page ${N.page.sh}/${N.page.ch}`);
  ok('narrow: the navigation defaults closed', N.navopen === false);
  const overlay = await nar.evaluate(() => { rpNavToggle();
    const n = document.querySelector('.mx-nav'), c = document.querySelector('.mx-content');
    return { pos: getComputedStyle(n).position, scrim: getComputedStyle(document.querySelector('.mx-scrim')).display,
      overlaps: n.getBoundingClientRect().right > c.getBoundingClientRect().left + 1, contentLeft: c.offsetLeft }; });
  ok('narrow: the open drawer sits OVER the page, with a scrim, and does not push it',
     overlay.pos === 'absolute' && overlay.scrim === 'block' && overlay.overlaps === true && overlay.contentLeft === N.content.left,
     `nav ${overlay.pos} · scrim ${overlay.scrim} · content left unchanged at ${overlay.contentLeft}`);
  ok('control: at 1280 the same rail takes its own column, with no scrim',
     W.nav.pos === 'static' && W.scrimDisplay === 'none' && W.navopen === true, `nav ${W.nav.pos} · scrim ${W.scrimDisplay}`);
  await wide.close(); await nar.close();
}

// ══ 7. the navigation ═════════════════════════════════════════════════════════════════════════════
mark('nav');
{
  const p = await newPage(1440, 620);
  await boot(p, PRACTICE);
  const before = await geom(p);
  ok('wide: the navigation defaults open', before.navopen === true && before.expanded === 'true');
  const labels = await p.evaluate(() => [...document.querySelectorAll('.mx-navitem .mx-navtx b')].map(b => b.textContent.trim()));
  ok('the rail names lesson SECTIONS, not page numbers',
     labels.slice(0, 8).join(' | ') === 'Notes | Worked examples | Video | Interactive | Practice — Equations | Practice — Graphs | Practice — Geometry | Summary'
     && labels.every(l => !/^\d+$/.test(l)), labels.slice(0, 4).join(' · ') + ' …');
  ok('every page has an icon and the current one is marked exactly once', await p.evaluate(() =>
    document.querySelectorAll('.mx-navic svg').length === document.querySelectorAll('.mx-navitem').length
    && document.querySelectorAll('.mx-navitem[aria-current="page"]').length === 1));
  const t = await p.evaluate(() => {
    const c = document.querySelector('.mx-content'); c.__probe = 'kept';
    c.scrollTop = Math.floor((c.scrollHeight - c.clientHeight) / 2);
    const scrolled = c.scrollTop, contentBefore = c.offsetWidth;
    rpNavToggle();
    const c2 = document.querySelector('.mx-content');
    const closed = { open: document.querySelector('.mx').classList.contains('mx-navopen'),
      expanded: document.querySelector('[data-rp-navtoggle][aria-expanded]').getAttribute('aria-expanded'),
      navShown: getComputedStyle(document.querySelector('.mx-nav')).display,
      contentW: c2.offsetWidth, sameNode: c2 === c, probe: c2.__probe, scrollTop: c2.scrollTop };
    rpNavToggle();
    const reopened = { open: document.querySelector('.mx').classList.contains('mx-navopen'),
      contentW: document.querySelector('.mx-content').offsetWidth, scrollTop: document.querySelector('.mx-content').scrollTop };
    return { contentBefore, scrolled, closed, reopened, storage: localStorage.length + sessionStorage.length };
  });
  ok('collapsing the rail gives its width back to the page',
     t.closed.open === false && t.closed.expanded === 'false' && t.closed.navShown === 'none' && t.closed.contentW > t.contentBefore,
     `content ${t.contentBefore}px -> ${t.closed.contentW}px`);
  ok('the toggle is a class flip, NOT a re-render — same node, and the reader keeps their place',
     t.closed.sameNode === true && t.closed.probe === 'kept' && t.scrolled > 0 && t.closed.scrollTop > 0 && t.reopened.scrollTop === t.scrolled,
     `scrollTop ${t.scrolled}px -> ${t.closed.scrollTop}px -> ${t.reopened.scrollTop}px`);
  ok('re-opening restores the rail', t.reopened.open === true && t.reopened.contentW === t.contentBefore);
  ok('the nav state is session-only — nothing is written to storage', t.storage === 0);
  const click = await p.evaluate(() => { document.querySelectorAll('.mx-navitem')[2].click();
    return { cur, marked: [...document.querySelectorAll('.mx-navitem')].findIndex(b => b.getAttribute('aria-current') === 'page') }; });
  ok('clicking a section navigates to it', click.cur === 2 && click.marked === 2);
  const narrow = await newPage(414, 860);
  await boot(narrow, PRACTICE);
  const closes = await narrow.evaluate(() => { rpNavToggle();
    const openBefore = document.querySelector('.mx').classList.contains('mx-navopen');
    document.querySelectorAll('.mx-navitem')[2].click();
    return { openBefore, openAfter: document.querySelector('.mx').classList.contains('mx-navopen'), cur }; });
  ok('narrow: choosing a section closes the drawer behind it', closes.openBefore && !closes.openAfter && closes.cur === 2);
  const scrim = await narrow.evaluate(() => { rpNavToggle(); document.querySelector('.mx-scrim').click();
    return document.querySelector('.mx').classList.contains('mx-navopen'); });
  ok('narrow: tapping the scrim closes the drawer', scrim === false);
  await p.close(); await narrow.close();
}

// ══ 8. the workspace region belongs to the shell ══════════════════════════════════════════════════
mark('workspace');
{
  const p = await newPage(1440, 900);
  await boot(p, 1); const none = await geom(p);                 // worked examples — a stub, no workspace
  await boot(p, NOTES); const rep = await geom(p);
  ok('a page that declares no workspace gets no split region', none.work === null && none.content.w === none.split.w,
     `content ${none.content.w}px fills the split`);
  ok('a page that declares one gets it, filled by the registered kind',
     rep.work !== null && rep.wsKind === 'representation' && rep.content.w < none.content.w,
     `content narrows ${none.content.w}px -> ${rep.content.w}px`);
  const tabs = await p.evaluate(() => {
    const bar = document.querySelector('[data-mx-tabset]'), t = [...bar.querySelectorAll('[data-mx-tab]')];
    const shownFirst = [...document.querySelectorAll('[data-mx-panel]')].filter(x => !x.hidden).length;
    t[1].click();
    const after = [...document.querySelectorAll('[data-mx-panel]')].filter(x => !x.hidden);
    return { labels: t.map(x => x.textContent.trim()), shownFirst, shownAfter: after.length,
      which: after[0] && after[0].dataset.mxPanel, selected: t[1].getAttribute('aria-selected') };
  });
  ok('the representation tabs show exactly one view at a time and switch',
     tabs.labels.join('/') === 'Graph/Table/Coordinates' && tabs.shownFirst === 1 && tabs.shownAfter === 1
     && tabs.which === 't1' && tabs.selected === 'true', tabs.labels.join(' · '));
  const err = await p.evaluate(() => {
    LESSON.slides[0].workspace = { kind: 'nosuchkind' }; go(0);
    const unknown = document.querySelector('.mx-work').textContent.trim();
    LESSON.slides[0].workspace = {}; go(0);
    const nokind = document.querySelector('.mx-work').textContent.trim();
    registerWorkspace('boom', () => { throw new Error('kaboom'); });
    LESSON.slides[0].workspace = { kind: 'boom' }; go(0);
    const thrown = document.querySelector('.mx-work').textContent.trim();
    return { unknown, nokind, thrown };
  });
  ok('an unregistered kind SAYS SO in the page instead of collapsing the region', /nosuchkind/.test(err.unknown), err.unknown);
  ok('a workspace with no kind says that too', /no .*kind/.test(err.nokind), err.nokind);
  ok('a workspace that throws is reported in place, and the page still renders', /kaboom/.test(err.thrown), err.thrown);
  await p.close();
}

// ══ 8b. THE COORDINATE PLANE IS A VIEWPORT, NOT A PICTURE ═════════════════════════════════════════
// Axis EXTENT and tick GENERATION are separate concerns. The control here is the old rule stated in the
// engine's own terms: figView still maps the domain onto the plot rect, so `sx(dom.x0)`/`sx(dom.x1)` are
// exactly where the axis used to stop. Every assertion below is that the drawn axis is STRICTLY outside
// those, and that the ticks are still generated from the domain.
mark('viewport');
{
  const read = (p) => p.evaluate(() => {
    const fig = document.querySelector('.mx-figskin .tp-fig');
    const stage = fig.querySelector('.tp-fig-stage'), svg = fig.querySelector('.tp-fig-svg');
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number), box = figFitBox(stage.offsetWidth, stage.offsetHeight);
    const M = figGraph(LESSON.slides[0].workspace.figure, box), V = M.V;
    const num = (el, a) => +el.getAttribute(a);
    const axes = [...svg.querySelectorAll('.tp-fig-axis')].map(l => ({ x1: num(l, 'x1'), y1: num(l, 'y1'), x2: num(l, 'x2'), y2: num(l, 'y2') }));
    const xAxis = axes.filter(a => Math.abs(a.y1 - a.y2) < 0.01)[0], yAxis = axes.filter(a => Math.abs(a.x1 - a.x2) < 0.01)[0];
    const labels = [...svg.querySelectorAll('.tp-fig-ticklabel')].map(t => ({ x: num(t, 'x'), y: num(t, 'y'), t: t.textContent }));
    const xLab = labels.filter(l => Math.abs(l.y - (xAxis ? xAxis.y1 : 0) - 16) < 3);
    return { vb: { W: vb[2], H: vb[3] }, figBox: fig.dataset.figBox,
      stage: { w: stage.offsetWidth, h: stage.offsetHeight }, painted: { w: svg.clientWidth, h: svg.clientHeight },
      xAxis, yAxis, oldX: [V.sx(V.dom.x0), V.sx(V.dom.x1)], oldY: [V.sy(V.dom.y1), V.sy(V.dom.y0)],
      dom: V.dom, view: V.view,
      lastXLab: xLab.length ? Math.max(...xLab.map(l => l.x)) : null,
      firstXLab: xLab.length ? Math.min(...xLab.map(l => l.x)) : null,
      tickVals: labels.map(l => l.t), nTicks: labels.length };
  });
  const wide = await newPage(1536, 1024); await boot(wide, NOTES); const A = await read(wide);
  ok('the plane is painted at the size of its container, not at a fixed internal size',
     Math.abs(A.painted.w - A.stage.w) <= 3 && Math.abs(A.painted.h - A.stage.h) <= 3 && A.figBox === A.vb.W + 'x' + A.vb.H,
     `svg ${A.painted.w}x${A.painted.h} inside a ${A.stage.w}x${A.stage.h} stage (1px border each side), viewBox ${A.figBox}`);
  ok('the x-axis runs to the drawable viewport boundaries',
     A.xAxis.x1 <= 0.5 && A.xAxis.x2 >= A.vb.W - 0.5, `x-axis ${A.xAxis.x1} → ${A.xAxis.x2} in a ${A.vb.W}-wide box`);
  ok('the y-axis does too', A.yAxis.y1 >= A.vb.H - 0.5 && A.yAxis.y2 <= 0.5, `y-axis ${A.yAxis.y2} → ${A.yAxis.y1} in a ${A.vb.H}-tall box`);
  ok('CONTROL: the axis is STRICTLY outside where the domain ends — the old rule would have stopped it there',
     A.xAxis.x1 < A.oldX[0] - 1 && A.xAxis.x2 > A.oldX[1] + 1 && A.yAxis.y2 < A.oldY[0] - 1 && A.yAxis.y1 > A.oldY[1] + 1,
     `x: axis ${A.xAxis.x1}…${A.xAxis.x2} vs domain ${Math.round(A.oldX[0])}…${Math.round(A.oldX[1])}`);
  ok('CONTROL: the last labelled tick is not the end of the axis',
     A.lastXLab !== null && A.lastXLab < A.xAxis.x2 - 8 && A.firstXLab > A.xAxis.x1 + 8,
     `last x label at ${A.lastXLab}, axis ends at ${A.xAxis.x2}`);
  ok('the ticks are generated from the mathematical range, not from the viewport',
     A.tickVals.every(t => { const v = +String(t).replace('\u2212', '-'); return v >= A.dom.x0 - 1e-6 && v <= Math.max(A.dom.x1, A.dom.y1) + 1e-6; })
     && A.view.x1 > A.dom.x1 && A.view.x0 < A.dom.x0,
     `${A.nTicks} labels inside the domain; viewport ${A.view.x0.toFixed(2)}…${A.view.x1.toFixed(2)} vs domain ${A.dom.x0.toFixed(2)}…${A.dom.x1.toFixed(2)}`);

  // RESIZE: a different container is a different mathematical viewport, not the same picture scaled.
  // Same width, a much shorter window: the container's SHAPE changes, so the plane's shape must follow it.
  const short = await newPage(1536, 640); await boot(short, NOTES); const B = await read(short);
  const span = (v) => ({ x: v.x1 - v.x0, y: v.y1 - v.y0 });
  const sa = span(A.view), sb = span(B.view);
  ok('resizing the container resizes the mathematical viewport',
     A.figBox !== B.figBox && (Math.abs(sa.x - sb.x) > 0.5 || Math.abs(sa.y - sb.y) > 0.5),
     `${A.stage.w}x${A.stage.h} → viewport ${sa.x.toFixed(1)} x ${sa.y.toFixed(1)} units;  `
     + `${B.stage.w}x${B.stage.h} → ${sb.x.toFixed(1)} x ${sb.y.toFixed(1)}`);
  ok('and the axes still reach the boundaries at the new size',
     B.xAxis.x1 <= 0.5 && B.xAxis.x2 >= B.vb.W - 0.5 && B.lastXLab < B.xAxis.x2 - 8);
  // The claim that actually says "the plane owns the region": under equal aspect the mathematical viewport
  // has the SHAPE of its container. A fixed-size drawing placed in a larger card cannot do this.
  const ar = (w, h) => w / h;
  const dA = Math.abs(ar(sa.x, sa.y) - ar(A.stage.w, A.stage.h)), dB = Math.abs(ar(sb.x, sb.y) - ar(B.stage.w, B.stage.h));
  ok('CONTROL: the viewport takes the SHAPE of its container, at both sizes',
     dA < 0.05 && dB < 0.05 && Math.abs(ar(sa.x, sa.y) - ar(sb.x, sb.y)) > 0.2,
     `${ar(A.stage.w, A.stage.h).toFixed(2)} container → ${ar(sa.x, sa.y).toFixed(2)} plane · `
     + `${ar(B.stage.w, B.stage.h).toFixed(2)} container → ${ar(sb.x, sb.y).toFixed(2)} plane`);

  // A domain whose EDGES ARE TICKS is the sharpest form of the control: here the last tick and the old
  // axis endpoint are the same point, so an axis that stops at the tick and one that stops at the domain
  // are indistinguishable — unless the axis genuinely runs to the viewport.
  const aligned = await wide.evaluate(() => {
    const spec = { type: 'figure', figure: 'graph', aspect: 'stretch', grid: 'shown',
      domain: { xMin: -4, xMax: 4, yMin: -4, yMax: 4 }, objects: [{ type: 'points', rows: [['P', 1, 1]] }] };
    const box = { W: 600, H: 400, padL: 40, padR: 18, padT: 16, padB: 30 };
    const M = figGraph(spec, box), V = M.V, body = figSvgBody(M, box);
    const d = document.createElement('div'); d.innerHTML = '<svg viewBox="0 0 600 400">' + body + '</svg>';
    const num = (el, a) => +el.getAttribute(a);
    const ax = [...d.querySelectorAll('.tp-fig-axis')].filter(l => Math.abs(num(l, 'y1') - num(l, 'y2')) < 0.01)[0];
    const labs = [...d.querySelectorAll('.tp-fig-ticklabel')].map(t => ({ x: num(t, 'x'), t: t.textContent }));
    const four = labs.filter(l => l.t === '4')[0];
    return { axX2: num(ax, 'x2'), tick4: four ? four.x : null, domEnd: V.sx(V.dom.x1), boxW: box.W };
  });
  ok('CONTROL: with a tick exactly on the domain edge, the axis still runs past it to the viewport',
     aligned.tick4 !== null && Math.abs(aligned.tick4 - aligned.domEnd) < 0.5 && aligned.axX2 >= aligned.boxW - 0.5
     && aligned.axX2 > aligned.tick4 + 10,
     `tick "4" and the domain edge coincide at ${aligned.domEnd.toFixed(1)}; the axis ends at ${aligned.axX2}`);
  await wide.close(); await short.close();
}

// ══ 8c. a passive figure carries no interaction copy ══════════════════════════════════════════════
mark('passive');
{
  const p = await newPage(1440, 900);
  await boot(p, NOTES);
  const off = await p.evaluate(() => ({
    hint: document.querySelectorAll('.mx-figskin .tp-fig-hint').length,
    hits: document.querySelectorAll('.mx-figskin .tp-fig-hit').length,
    text: (document.querySelector('.mx-work') || {}).textContent || '' }));
  ok('an explanatory figure shows no "select a point" hint and no tap targets',
     off.hint === 0 && off.hits === 0 && !/Select a point/i.test(off.text));
  // CONTROL — the same figure WITHOUT `callouts:"hidden"` still produces both, so the pass above is not
  // an accident of this figure having nothing to reveal.
  const on = await p.evaluate(() => {
    delete LESSON.slides[0].workspace.figure.callouts; go(0);
    const r = { hint: document.querySelectorAll('.mx-figskin .tp-fig-hint').length,
      hits: document.querySelectorAll('.mx-figskin .tp-fig-hit').length,
      text: (document.querySelector('.mx-work') || {}).textContent || '' };
    LESSON.slides[0].workspace.figure.callouts = 'hidden'; go(0); return r;
  });
  ok('CONTROL: without `callouts:"hidden"` the same figure DOES carry them',
     on.hint === 1 && on.hits > 0 && /Select a point/i.test(on.text), `${on.hits} tap targets, hint present`);
  await p.close();
}

// ══ 8d. the Mathematics video page ════════════════════════════════════════════════════════════════
mark('video');
{
  const p = await newPage(1536, 1024);
  const VIDEO = LESSON.slides.findIndex((x) => x.type === 'videoShell');
  await boot(p, VIDEO);
  const v = await p.evaluate(() => {
    const q = (x) => document.querySelector(x);
    const box = (el) => el ? { w: el.offsetWidth, h: el.offsetHeight } : null;
    return { video: box(q('.mx-video')), content: box(q('.mx-content')), work: box(q('.mx-work')),
      after: !!q('.mx-after'), chapters: document.querySelectorAll('.mx-work .mx-item').length,
      watchFor: !!q('.mx-wf'), transcript: !!q('.mx-aftert'),
      legacy: document.querySelectorAll('.mx .gl-video, .mx .tp-video, .mx .tp-slide .tp-vid, .mx .card').length,
      title: (q('.mx-title') || {}).textContent || '' };
  });
  ok('the video is the dominant asset on the page',
     v.video && v.video.w > v.work.w * 1.6 && v.video.h > v.work.h * 0.5,
     `video ${v.video.w}x${v.video.h} against a ${v.work.w}px support column`);
  ok('the supporting material is beside it, compact, and authored', v.chapters === 4 && v.watchFor === true);
  ok('the after-watching prompts and the transcript control are on the page', v.after && v.transcript);
  ok('nothing from the legacy video renderer is on this page', v.legacy === 0);
  ok('it is a Mathematics page, in the Mathematics shell', /is formed/.test(v.title) && v.video.w > 0);
  await p.close();
}

// ══ 9. author text can never become markup ════════════════════════════════════════════════════════
mark('escape');
{
  const p = await newPage(1440, 900);
  const r = await p.evaluate(() => {
    const probe = '<img src=x onerror=alert(1)>"><b>bold</b>';
    return { esc: mxM(probe), italic: mxM('_x_ = 3'), sup: mxM('_x_^2'),
      tagInside: mxM('_<b>_'), scriptSurvives: /<script|<img|<b>bold/.test(mxM(probe)) };
  });
  ok('the inline-notation helper escapes first — markup in author text stays text',
     r.scriptSurvives === false && /&lt;img/.test(r.esc), r.esc.slice(0, 46) + '…');
  ok('and it still emits the two tags it is allowed to', r.italic === '<i>x</i> = 3' && r.sup === '<i>x</i><sup>2</sup>',
     `${r.italic}  ·  ${r.sup}`);
  await p.close();
}

// ══ 10. the legacy corpus, and the scope of the shadow ════════════════════════════════════════════
mark('legacy');
{
  const p = await newPage(1440, 900);
  const shipped = JSON.parse(fs.readFileSync(path.join(root, 'lessons/closing-the-gap-geolearn.json'), 'utf8'));
  const r = await p.evaluate((L) => {
    LESSON = JSON.parse(JSON.stringify(L)); render();
    const out = [];
    for (let i = 0; i < LESSON.slides.length; i++) { go(i);
      out.push({ respo: document.body.classList.contains('respo'), mx: !!document.querySelector('.mx'),
        w: document.getElementById('canvas').offsetWidth, t: getComputedStyle(document.getElementById('canvas')).transform }); }
    return out;
  }, shipped);
  ok('no slide of a shipped lesson takes the responsive path', r.every((x) => !x.respo && !x.mx), `${r.length} slides`);
  ok('every one of them is still a 1280px scaled canvas', r.every((x) => x.w === 1280 && /^matrix/.test(x.t)));
  const shadow = await p.evaluate(() => ({
    shadowed: Object.keys(PAGES.mathematics).filter(t => REGISTRY[t] && REGISTRY[t].mathematics),
    registryIntact: ['video', 'interactive'].every(t => typeof REGISTRY[t].mathematics === 'function'),
    otherThemes: ['imperium', 'microhistory', 'geolearn'].every(th => typeof REGISTRY.video[th] === 'function' && !(PAGES[th])),
  }));
  ok('NOTHING is shadowed: no responsive type takes a name the canvas already answers for this theme',
     shadow.shadowed.length === 0, shadow.shadowed.join(', ') || '(none)');
  ok('the two colliding names are still the canvas renderers', shadow.registryIntact === true);
  ok('no other theme has a responsive namespace at all', shadow.otherThemes === true);
  await p.close();
}

// ── report ────────────────────────────────────────────────────────────────────────────────────────
const SECTIONS = ['mode', 'release', 'responsive', 'chrome', 'persistent', 'narrow', 'nav', 'workspace', 'viewport', 'passive', 'video', 'escape', 'legacy'];
const missing = SECTIONS.filter((s) => !ran.has(s));
ok('every section ran', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : `${SECTIONS.length} sections`);
ok('no page error or console error while rendering', pageErrs.length === 0, pageErrs.slice(0, 3).join(' | '));

await browser.close(); server.close();
console.log(results.join('\n'));
const pass = results.filter((r) => r.startsWith('PASS')).length;
const fail = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(failed ? 1 : 0);
