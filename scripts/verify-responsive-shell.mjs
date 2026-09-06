#!/usr/bin/env node
// THE RESPONSIVE PAGE SHELL — Stage A.
//
//   node scripts/verify-responsive-shell.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-responsive-shell.mjs
//
// WHAT THIS HAS TO PROVE, and why each control is here.
//
// "Responsive" is the easiest claim in the app to fake. The canvas model already changes the SIZE of a
// slide with the viewport — fitCanvas() scales 1280 logical px by 0.851 / 0.446 / 0.274 at 1440 / 834 /
// 390. A screenshot of a scaled canvas and a screenshot of a reflowed page look similar and are not the
// same thing: the first has the same layout at every width in smaller ink, the second has a different
// layout. So every width assertion below is paired with a LEGACY control page rendered in the same
// lesson at the same widths, and the control asserts the opposite: the legacy page's LOGICAL width is
// pinned at 1280 no matter the viewport, while the responsive page's content region really changes and
// its prose really re-wraps.
//
// The same discipline applies to the scroll boundaries ("stayed at 0" proves nothing if the region
// cannot scroll at all — so each region is first shown to be a real scroller), to the collapsible nav
// (a toggle that re-rendered the page would also flip the attribute — so node identity and scroll
// position are checked across the toggle), and to layoutMode (a lesson JSON `layoutMode` key must be
// inert — the control writes one and shows it changes nothing).
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

// ── the fixture ───────────────────────────────────────────────────────────────────────────────────
// Long enough that the navigation is a real scroller; index 1 is a LEGACY pack page in the SAME lesson
// so every control is a like-for-like comparison and not a different lesson in a different browser.
const PROSE = 'A quadratic relationship is one in which the second differences are constant. '
            + 'That single fact is what makes the parabola the shape it is, and it is the fact every '
            + 'other property in this lesson is eventually traced back to. ';
const FILLER = { type: 'shell', title: 'A later page in the lesson with a title long enough to wrap in the rail' };
const LESSON = { meta: { title: 'Quadratic relationships', theme: 'mathematics' }, slides: [
  { type: 'shell', id: 'p-plain', title: 'Where the parabola comes from', eyebrow: 'Notes', intro: PROSE.repeat(4) },
  { type: 'text', title: 'Legacy control page', body: ['This page is rendered by the canvas model.'] },
  { type: 'shell', id: 'p-work', title: 'With a workspace', intro: PROSE.repeat(3), workspace: { kind: 'tall' } },
  { type: 'shell', id: 'p-unknown', title: 'Workspace of a kind nobody renders', workspace: { kind: 'nosuchkind' } },
  { type: 'shell', id: 'p-nokind', title: 'Workspace with no kind', workspace: {} },
  ...Array.from({ length: 20 }, (_, k) => ({ ...FILLER, id: 'f' + k })),
] };

// Installed into the page: the fixture lesson plus a registered workspace kind. Registering the kind
// from here is deliberate — it exercises the registerWorkspace() seam Stages B–G will use.
const boot = async (p, slide) => p.evaluate(({ L, slide }) => {
  if (!window.__wsRegistered) {
    registerWorkspace('tall', () => '<div class="ws-probe" style="height:1400px">workspace</div>');
    window.__wsRegistered = true;
  }
  LESSON = JSON.parse(JSON.stringify(L));
  document.documentElement.dataset.theme = LESSON.meta.theme;
  setTheme(LESSON.meta.theme);
  go(slide);
}, { L: LESSON, slide });

const geom = (p) => p.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => el ? { w: el.offsetWidth, h: el.offsetHeight, top: el.offsetTop, left: el.offsetLeft,
    sh: el.scrollHeight, ch: el.clientHeight, over: getComputedStyle(el).overflowY, pos: getComputedStyle(el).position } : null;
  const rp = q('.rp');
  const intro = q('.rp-intro');
  let lines = 0;
  if (intro && intro.firstChild) { const r = document.createRange(); r.selectNodeContents(intro); lines = r.getClientRects().length; }
  return {
    respo: document.body.classList.contains('respo'),
    canvasTransform: getComputedStyle(q('#canvas')).transform,
    canvasW: q('#canvas').offsetWidth,
    stageW: q('#stage').clientWidth,
    navopen: !!(rp && rp.classList.contains('rp-navopen')),
    expanded: (q('[data-rp-navtoggle]') || {}).getAttribute ? q('[data-rp-navtoggle]').getAttribute('aria-expanded') : null,
    splitDir: q('.rp-split') ? getComputedStyle(q('.rp-split')).flexDirection : null,
    scrimDisplay: q('.rp-scrim') ? getComputedStyle(q('.rp-scrim')).display : null,
    rp: box(rp), top: box(q('.rp-top')), nav: box(q('.rp-nav')), split: box(q('.rp-split')),
    content: box(q('.rp-content')), work: box(q('.rp-work')),
    card: box(q('#slide .card, #slide .tp-slide')),
    introLines: lines, intro: box(intro),
    wsKind: q('.rp-work') ? q('.rp-work').getAttribute('data-rp-workspace') : null,
    wsPlaceholder: q('.rp-wsph') ? q('.rp-wsph').textContent.trim() : null,
    wsProbe: !!q('.ws-probe'),
    docScroll: document.scrollingElement.scrollTop,
  };
});

// ══ 1. layoutMode is REGISTRATION metadata, not lesson JSON ═══════════════════════════════════════
mark('mode');
{
  const p = await newPage(1440, 900);
  await boot(p, 0);
  const r = await p.evaluate(() => ({
    shell: tpLayoutMode({ type: 'shell' }),
    legacy: tpLayoutMode({ type: 'text' }),
    unknown: tpLayoutMode({ type: 'nosuch' }),
    // the same responsive type under a theme that does not register it
    otherTheme: (() => { const t = LESSON.meta.theme; LESSON.meta.theme = 'geolearn';
      const v = tpLayoutMode({ type: 'shell' }); LESSON.meta.theme = t; return v; })(),
    rejects: (() => { try { registerPage('mathematics', 'zz', () => '', 'flexbox'); return false; } catch (e) { return /unknown layoutMode/.test(e.message); } })(),
  }));
  ok('a registered Mathematics template reports layoutMode "responsive"', r.shell === 'responsive', r.shell);
  ok('a legacy type reports "canvas", and so does an unregistered one', r.legacy === 'canvas' && r.unknown === 'canvas', `${r.legacy} / ${r.unknown}`);
  ok('the SAME type under a theme that has not registered it stays on the canvas', r.otherTheme === 'canvas',
     'shell + geolearn -> ' + r.otherTheme);
  ok('an unknown layoutMode is refused at registration, not at render', r.rejects === true);

  // CONTROL — lesson JSON must not be able to reach the layout mode.
  const c = await p.evaluate(() => {
    LESSON.slides[1].layoutMode = 'responsive';        // a legacy slide claiming the responsive path
    go(1);
    const legacyClaimed = { respo: document.body.classList.contains('respo'), rp: !!document.querySelector('.rp') };
    LESSON.slides[0].layoutMode = 'canvas';            // a responsive slide claiming the canvas path
    go(0);
    const shellClaimed = { respo: document.body.classList.contains('respo'), rp: !!document.querySelector('.rp') };
    delete LESSON.slides[1].layoutMode; delete LESSON.slides[0].layoutMode;
    return { legacyClaimed, shellClaimed, serialised: /layoutMode/.test(JSON.stringify(LESSON)) };
  });
  ok('control: a `layoutMode` key written into lesson JSON is inert in both directions',
     c.legacyClaimed.respo === false && c.legacyClaimed.rp === false && c.shellClaimed.respo === true && c.shellClaimed.rp === true,
     'legacy slide claiming responsive stayed on the canvas; shell claiming canvas stayed responsive');
  ok('nothing writes layoutMode back into the lesson', c.serialised === false);
  await p.close();
}

// ══ 2. the canvas is released, and released cleanly ═══════════════════════════════════════════════
mark('release');
{
  const p = await newPage(1440, 900);
  await boot(p, 0); const resp = await geom(p);
  await boot(p, 1); const legacy = await geom(p);
  ok('a responsive page carries body.respo; a legacy page does not', resp.respo === true && legacy.respo === false);
  ok('the canvas transform is released on a responsive page', resp.canvasTransform === 'none', resp.canvasTransform);
  ok('control: the legacy page in the same lesson IS still scale()d', legacy.canvasTransform !== 'none' && /^matrix/.test(legacy.canvasTransform),
     legacy.canvasTransform);
  ok('control: the legacy canvas is still 1280 logical px wide', legacy.canvasW === 1280, legacy.canvasW + 'px');
  ok('the responsive canvas is the stage width, not 1280', resp.canvasW !== 1280 && Math.abs(resp.canvasW - resp.stageW) <= 1,
     `canvas ${resp.canvasW}px = stage ${resp.stageW}px`);
  // The shell's rail replaces the app's page sidebar rather than sitting beside a second copy of it.
  const side = await p.evaluate(() => { go(0); const a = getComputedStyle(document.querySelector('.side')).display;
    go(1); const b = getComputedStyle(document.querySelector('.side')).display; return { respo: a, legacy: b }; });
  ok('the app page sidebar is hidden on a responsive page — one navigation, not two', side.respo === 'none');
  ok('control: it is still shown on the legacy page in the same lesson', side.legacy !== 'none', side.legacy);

  // fitCanvas() must be inert while a responsive page is up — it is called by a ResizeObserver on every
  // stage resize, so "we do not call it" would not be enough.
  const inert = await p.evaluate(() => {
    go(0);
    const c = document.getElementById('canvas'), f = document.getElementById('canvasFit'), s = document.getElementById('stage');
    const snap = () => JSON.stringify([c.getAttribute('style') || '', f.getAttribute('style') || '', s.getAttribute('style') || '', c.className]);
    const before = snap(); fitCanvas(); fitCanvas();
    return { before, after: snap(), w: c.offsetWidth };
  });
  ok('calling fitCanvas() on a responsive page mutates nothing', inert.before === inert.after, inert.after || '(no inline style)');

  // ...and the canvas must come back intact for the very next legacy page.
  const back = await p.evaluate(() => { go(0); go(1); const c = document.getElementById('canvas');
    return { t: getComputedStyle(c).transform, w: c.offsetWidth, respo: document.body.classList.contains('respo') }; });
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
    await boot(p, 0); resp[w] = await geom(p);
    await boot(p, 1); legacy[w] = await geom(p);
    await p.close();
  }
  const rw = WIDTHS.map((w) => resp[w].content.w);
  const lw = WIDTHS.map((w) => legacy[w].card.w);
  ok('the content region really changes width with the viewport', new Set(rw).size === WIDTHS.length,
     WIDTHS.map((w, k) => `${w}->${rw[k]}px`).join('  '));
  ok('control: the legacy page keeps ONE logical width at every viewport (it is scaled, not reflowed)',
     new Set(lw).size === 1, WIDTHS.map((w, k) => `${w}->${lw[k]}px`).join('  '));
  // Two claims, not one. ABOVE the reading-measure cap the paragraph must NOT get longer lines just
  // because the screen grew — that is the point of a measure. BELOW it, the prose has to genuinely
  // re-wrap. Asserting only "the line count varies" would have passed on a page that ignored the cap.
  const ri = WIDTHS.map((w) => resp[w].intro.w);
  const rl = WIDTHS.map((w) => resp[w].introLines);
  const capped = WIDTHS.filter((w) => resp[w].intro.w < resp[w].content.w - 60);
  ok('above the reading measure, a wider screen does NOT give longer lines',
     capped.length >= 2 && new Set(capped.map((w) => resp[w].intro.w)).size === 1 && new Set(capped.map((w) => resp[w].introLines)).size === 1,
     capped.map((w) => `${w}->${resp[w].intro.w}px/${resp[w].introLines} lines`).join('  '));
  ok('below it, the prose genuinely re-wraps', resp[390].intro.w < ri[0] && resp[390].introLines > rl[0],
     `390 -> ${resp[390].intro.w}px / ${resp[390].introLines} lines against ${ri[0]}px / ${rl[0]} lines`);
  ok('the shell never overflows its stage horizontally', WIDTHS.every((w) => resp[w].rp.w <= resp[w].stageW + 1),
     WIDTHS.map((w) => `${w}:${resp[w].rp.w}/${resp[w].stageW}`).join('  '));
  ok('the window itself never scrolls at any width', WIDTHS.every((w) => resp[w].docScroll === 0));
  note(`content region ${rw[0]}px at 1440 down to ${rw[3]}px at 390 — the legacy control is ${lw[0]}px at both`);
}

// ══ 4. independent scroll boundaries ══════════════════════════════════════════════════════════════
mark('scroll');
{
  const p = await newPage(1280, 620);          // short viewport so all three regions genuinely overflow
  await boot(p, 2);                            // the page with the registered 'tall' workspace
  const g = await geom(p);
  ok('all three regions are REAL scrollers before anything is asserted about them',
     g.nav.sh > g.nav.ch && g.content.sh > g.content.ch && g.work.sh > g.work.ch,
     `nav ${g.nav.sh}/${g.nav.ch}  content ${g.content.sh}/${g.content.ch}  work ${g.work.sh}/${g.work.ch}`);
  // Each region is scrolled to its OWN maximum (a fixed number would silently clamp and read back as a
  // different value than it was given, which is a test bug, not a finding).
  const s = await p.evaluate(() => {
    const q = (x) => document.querySelector(x);
    const read = () => ({ nav: q('.rp-nav').scrollTop, content: q('.rp-content').scrollTop, work: q('.rp-work').scrollTop,
      stage: document.getElementById('stage').scrollTop, doc: document.scrollingElement.scrollTop });
    const toEnd = (x) => { const el = q(x); el.scrollTop = el.scrollHeight; return el.scrollTop; };
    const c = toEnd('.rp-content'); const afterContent = read();
    const w = toEnd('.rp-work');    const afterWork = read();
    const n = toEnd('.rp-nav');     const afterNav = read();
    return { c, w, n, afterContent, afterWork, afterNav };
  });
  ok('scrolling the content region moves nothing else', s.c > 0 && s.afterContent.content === s.c
     && s.afterContent.nav === 0 && s.afterContent.work === 0 && s.afterContent.stage === 0 && s.afterContent.doc === 0,
     `content ${s.c}px, everything else 0`);
  ok('scrolling the workspace moves nothing else', s.w > 0 && s.afterWork.work === s.w && s.afterWork.content === s.c && s.afterWork.nav === 0,
     `workspace ${s.w}px, content still ${s.afterWork.content}px`);
  ok('scrolling the navigation moves nothing else', s.n > 0 && s.afterNav.nav === s.n && s.afterNav.content === s.c && s.afterNav.work === s.w,
     `nav ${s.n}px, the other two unmoved`);
  ok('the stage and the window never scroll on a responsive page',
     s.afterNav.stage === 0 && s.afterNav.doc === 0);
  await p.close();
}

// ══ 5. narrow composition is different in KIND, not in scale ══════════════════════════════════════
mark('narrow');
{
  const wide = await newPage(1280, 800); await boot(wide, 2); const W = await geom(wide);
  const nar  = await newPage(390, 800);  await boot(nar, 2);  const N = await geom(nar);
  ok('wide: content and workspace sit side by side', W.splitDir === 'row'
     && W.content.top === W.work.top && W.work.left > W.content.left,
     `content left ${W.content.left} · workspace left ${W.work.left}`);
  ok('narrow: they stack, content first', N.splitDir === 'column'
     && N.content.left === N.work.left && N.work.top > N.content.top,
     `content top ${N.content.top} · workspace top ${N.work.top}`);
  ok('wide: content and workspace are two separate scrollers',
     W.content.over === 'auto' && W.work.over === 'auto' && W.split.sh <= W.split.ch + 1,
     `content ${W.content.over} · workspace ${W.work.over}`);
  ok('narrow: ONE scroller — the split — reads the page and its workspace as one document',
     N.content.over === 'visible' && N.work.over === 'visible' && N.split.sh > N.split.ch,
     `split ${N.split.sh}/${N.split.ch}`);
  ok('narrow: the navigation defaults closed, and is an overlay when opened', N.navopen === false, 'closed on load');
  const overlay = await nar.evaluate(() => { rpNavToggle();
    const n = document.querySelector('.rp-nav'), c = document.querySelector('.rp-content');
    return { pos: getComputedStyle(n).position, scrim: getComputedStyle(document.querySelector('.rp-scrim')).display,
      overlaps: n.getBoundingClientRect().right > c.getBoundingClientRect().left + 1, contentLeft: c.offsetLeft }; });
  ok('narrow: the open drawer sits OVER the content, with a scrim, and does not push it',
     overlay.pos === 'absolute' && overlay.scrim === 'block' && overlay.overlaps === true && overlay.contentLeft === N.content.left,
     `nav ${overlay.pos} · scrim ${overlay.scrim} · content left unchanged at ${overlay.contentLeft}`);
  ok('control: at 1280 the same nav is a rail that DOES take its own column, with no scrim',
     W.nav.pos === 'static' && W.scrimDisplay === 'none' && W.navopen === true,
     `nav ${W.nav.pos} · scrim ${W.scrimDisplay}`);
  await wide.close(); await nar.close();
}

// ══ 6. the collapsible navigation ═════════════════════════════════════════════════════════════════
mark('nav');
{
  const p = await newPage(1440, 560);          // short enough that the content region is a live scroller
  await boot(p, 2);
  const before = await geom(p);
  ok('wide: the navigation defaults open', before.navopen === true && before.expanded === 'true');
  ok('the content region is a live scroller before the toggle is asserted about', before.content.sh > before.content.ch,
     `${before.content.sh}/${before.content.ch}`);
  const t = await p.evaluate(() => {
    const c = document.querySelector('.rp-content'); c.__probe = 'kept';
    c.scrollTop = Math.floor((c.scrollHeight - c.clientHeight) / 2);
    const scrolled = c.scrollTop;
    const contentBefore = c.offsetWidth;
    rpNavToggle();
    const c2 = document.querySelector('.rp-content');
    const closed = { open: document.querySelector('.rp').classList.contains('rp-navopen'),
      expanded: document.querySelector('[data-rp-navtoggle]').getAttribute('aria-expanded'),
      navShown: getComputedStyle(document.querySelector('.rp-nav')).display,
      contentW: c2.offsetWidth, sameNode: c2 === c, probe: c2.__probe, scrollTop: c2.scrollTop, scrolled,
      max: c2.scrollHeight - c2.clientHeight };
    rpNavToggle();
    const reopened = { open: document.querySelector('.rp').classList.contains('rp-navopen'),
      contentW: document.querySelector('.rp-content').offsetWidth,
      scrollTop: document.querySelector('.rp-content').scrollTop };
    return { contentBefore, scrolled, closed, reopened, storage: localStorage.length + sessionStorage.length };
  });
  ok('collapsing the navigation gives its width back to the content region',
     t.closed.open === false && t.closed.expanded === 'false' && t.closed.navShown === 'none' && t.closed.contentW > t.contentBefore,
     `content ${t.contentBefore}px -> ${t.closed.contentW}px`);
  ok('the toggle is a class flip, NOT a re-render — same node, same scroll position',
     t.closed.sameNode === true && t.closed.probe === 'kept' && t.scrolled > 0 && t.closed.scrollTop > 0
     && t.reopened.scrollTop === t.scrolled,
     `scrollTop ${t.scrolled}px -> ${t.closed.scrollTop}px (the widened region reflows shorter, so the `
     + `browser clamps to its new ${t.closed.max}px maximum) -> ${t.reopened.scrollTop}px back at the original width`);
  ok('re-opening restores the rail', t.reopened.open === true && t.reopened.contentW === t.contentBefore);
  ok('the nav state is session-only — nothing is written to storage', t.storage === 0);

  const nav = await p.evaluate(() => {
    const items = document.querySelectorAll('.rp-navitem');
    const before = { n: items.length, current: document.querySelectorAll('.rp-navitem[aria-current="page"]').length,
      currentIdx: [...items].findIndex((b) => b.getAttribute('aria-current') === 'page') };
    items[4].click();
    return { before, cur, currentIdx: [...document.querySelectorAll('.rp-navitem')].findIndex((b) => b.getAttribute('aria-current') === 'page') };
  });
  ok('every page in the lesson is listed, and the current one is marked once',
     nav.before.n === 25 && nav.before.current === 1 && nav.before.currentIdx === 2, `${nav.before.n} items`);
  ok('clicking a page in the rail navigates to it', nav.cur === 4 && nav.currentIdx === 4);

  const narrow = await newPage(390, 800);
  await boot(narrow, 2);
  const closes = await narrow.evaluate(() => { rpNavToggle();
    const openBefore = document.querySelector('.rp').classList.contains('rp-navopen');
    document.querySelectorAll('.rp-navitem')[4].click();
    return { openBefore, openAfter: document.querySelector('.rp').classList.contains('rp-navopen'), cur }; });
  ok('narrow: choosing a page closes the drawer behind it', closes.openBefore === true && closes.openAfter === false && closes.cur === 4);
  const scrim = await narrow.evaluate(() => { rpNavToggle(); document.querySelector('.rp-scrim').click();
    return document.querySelector('.rp').classList.contains('rp-navopen'); });
  ok('narrow: tapping the scrim closes the drawer', scrim === false);
  await p.close(); await narrow.close();
}

// ══ 7. the workspace region belongs to the shell ══════════════════════════════════════════════════
mark('workspace');
{
  const p = await newPage(1440, 800);
  await boot(p, 0); const none = await geom(p);
  await boot(p, 2); const reg  = await geom(p);
  await boot(p, 3); const unk  = await geom(p);
  await boot(p, 4); const nok  = await geom(p);
  ok('a page that declares no workspace gets no split region', none.work === null && none.content.w === none.split.w,
     `content ${none.content.w}px fills the split`);
  ok('a page that declares one gets it, filled by the registered kind',
     reg.work !== null && reg.wsKind === 'tall' && reg.wsProbe === true && reg.content.w < none.content.w,
     `content narrows ${none.content.w}px -> ${reg.content.w}px`);
  ok('an unregistered kind SAYS SO in the page instead of collapsing the region',
     unk.work !== null && /nosuchkind/.test(unk.wsPlaceholder || ''), unk.wsPlaceholder);
  ok('a workspace with no kind says that too', nok.work !== null && /no .*kind/.test(nok.wsPlaceholder || ''), nok.wsPlaceholder);
  const thrown = await p.evaluate(() => { registerWorkspace('boom', () => { throw new Error('kaboom'); });
    LESSON.slides[2].workspace.kind = 'boom'; go(2);
    const t = document.querySelector('.rp-work').textContent;
    LESSON.slides[2].workspace.kind = 'tall'; return t; });
  ok('a workspace that throws is reported in place, and the page still renders', /kaboom/.test(thrown), thrown.trim());
  await p.close();
}

// ══ 8. the legacy corpus is untouched ═════════════════════════════════════════════════════════════
mark('legacy');
{
  const p = await newPage(1440, 900);
  const shipped = JSON.parse(fs.readFileSync(path.join(root, 'lessons/closing-the-gap-geolearn.json'), 'utf8'));
  const r = await p.evaluate((L) => {
    LESSON = JSON.parse(JSON.stringify(L)); setTheme(LESSON.meta.theme);
    const out = [];
    for (let i = 0; i < LESSON.slides.length; i++) { go(i);
      out.push({ respo: document.body.classList.contains('respo'), rp: !!document.querySelector('.rp'),
        w: document.getElementById('canvas').offsetWidth, t: getComputedStyle(document.getElementById('canvas')).transform }); }
    return out;
  }, shipped);
  ok('no slide of a shipped lesson takes the responsive path', r.every((x) => !x.respo && !x.rp), `${r.length} slides`);
  ok('every one of them is still a 1280px scaled canvas', r.every((x) => x.w === 1280 && /^matrix/.test(x.t)));
  await p.close();
}

// ── report ────────────────────────────────────────────────────────────────────────────────────────
const SECTIONS = ['mode', 'release', 'responsive', 'scroll', 'narrow', 'nav', 'workspace', 'legacy'];
const missing = SECTIONS.filter((s) => !ran.has(s));
ok('every section ran', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : `${SECTIONS.length} sections`);
ok('no page error or console error while rendering', pageErrs.length === 0, pageErrs.slice(0, 3).join(' | '));

await browser.close(); server.close();
console.log(results.join('\n'));
const pass = results.filter((r) => r.startsWith('PASS')).length;
const fail = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(failed ? 1 : 0);
