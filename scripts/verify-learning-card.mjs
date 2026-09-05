#!/usr/bin/env node
// THE LEARNING CARD — C6b. The card primitive, the figure companion, the authored prose face, and the
// corrected prose-CONTENT width contract.
//
//   node scripts/verify-learning-card.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-learning-card.mjs
//   node scripts/verify-learning-card.mjs --update            # re-record the legacy baseline (deliberate act)
//
// WHY THIS FILE EXISTS. The composable-block layer had NO compatibility gate. `verify-corpus-identity`
// renders examples/ + lessons/, and measured today that corpus contains 50 slides, ZERO of type `page` and
// ZERO carrying `blocks[]` — so fragText, fragFigure and renderFragment are never entered by it. It is also
// not wired into CI at all (it appears only in workflow COMMENTS). Citing it as proof that legacy `text`
// still renders identically would have been citing a gate that never runs the code.
//
// So the legacy half here is a STORED BASELINE, recorded from the build immediately BEFORE C6b and committed
// alongside it: `tests/visual/learning-card-legacy-baseline.json` holds a sha256 per theme x slide of
// `#slide` innerHTML. A restatement of the new code's own behaviour would prove nothing about compatibility,
// and a live git differential proves the wrong thing — against `origin/main` it reports every earlier Stage 4
// change (C2 added `data-fig-fit` / `data-fig-box` to every figure) as though C6b had caused it. The baseline
// is re-recorded only with --update, which is an explicitly reviewed act, exactly as verify-figure-render
// treats its own.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPDATE = process.argv.includes('--update');
const BASELINE = path.join(root, 'tests/visual/learning-card-legacy-baseline.json');
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

const MIME = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const results = [];
let failed = false;
const ok = (n, c, extra = '') => { results.push(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? '  ' + extra : ''}`); if (!c) failed = true; };
const note = (s) => results.push('     · ' + s);

// Every named check must be OBSERVED. A section that silently never ran is not a pass.
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
const newPage = async (url) => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => pageErrs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.location().url || '')) pageErrs.push(m.text()); });
  await p.goto(url, { waitUntil: 'load' });
  return p;
};

const FIX = path.join(root, 'tests/visual/lessons/learning-card-baseline.json');
const lesson = JSON.parse(fs.readFileSync(FIX, 'utf8'));

/* The LEGACY fixture — deliberately only shapes that existed before C6b. If any of these renders
   differently after the change, compatibility is broken, and the diff says exactly where. */
const LEGACY = { meta: { title: 'legacy', theme: 'mathematics' }, slides: [
  { type: 'page', title: 'plain text', blocks: [
    { type: 'text', eyebrow: 'Eyebrow', title: 'A heading', body: ['One paragraph.', 'And another.'] } ] },
  { type: 'page', title: 'text with key terms', blocks: [
    { type: 'text', title: 'Terms', body: ['A ==vertex== is the turning point.'],
      keyTerms: [{ term: 'vertex', definition: 'The turning point.' }] } ] },
  { type: 'page', title: 'text with a POI row', blocks: [
    { type: 'text', title: 'POI', newthought: 'First', body: ['A **classic error** here.'],
      keyTerms: [{ term: 'classic error', definition: 'Watch out.', kind: 'error', num: 1 }] } ] },
  { type: 'page', title: 'figure, no placement', blocks: [
    { type: 'figure', figure: 'graph', title: 'Plain', domain: { xMin: -3, xMax: 3, yMin: -1, yMax: 9 },
      grid: 'shown', objects: [{ type: 'function', f: 'x^2' }] } ] },
  { type: 'page', title: 'figure with the simple text companion', blocks: [
    { type: 'figure', figure: 'graph', title: 'Beside', placement: 'beside',
      domain: { xMin: -3, xMax: 3, yMin: -1, yMax: 9 }, grid: 'shown', aspect: 'stretch',
      objects: [{ type: 'function', f: 'x^2' }], text: 'Plain companion prose, unchanged.' } ] },
  { type: 'page', title: 'figure, contained', blocks: [
    { type: 'figure', figure: 'geometry', title: 'Contained', placement: 'contained',
      construction: 'triangleSSS', params: { a: 7, b: 8, c: 9 },
      objects: [{ type: 'polygon', vertices: ['A', 'B', 'C'], angles: 'all' }] } ] },
] };

const THEMES = ['mathematics', 'scholarmath', 'imperium', 'microhistory', 'geolearn'];

const renderAll = async (page, L, themes) => page.evaluate(({ L, themes }) => {
  const out = {};
  for (const t of themes) {
    LESSON = JSON.parse(JSON.stringify(L)); LESSON.meta = LESSON.meta || {}; LESSON.meta.theme = t;
    document.documentElement.dataset.theme = t;
    for (let i = 0; i < LESSON.slides.length; i++) { go(i); out[`${t}|${i}`] = document.getElementById('slide').innerHTML; }
  }
  return out;
}, { L, themes });

// ══ A. LEGACY COMPATIBILITY — the working tree against a baseline recorded BEFORE C6b ════════════════
mark('baseline');
const wtPage = await newPage(base + 'lesson-studio.html');
const cur = await renderAll(wtPage, LEGACY, THEMES);
const curSha = {}; Object.keys(cur).sort().forEach((k) => { curSha[k] = sha(cur[k]); });

if (UPDATE) {
  fs.writeFileSync(BASELINE, JSON.stringify({
    note: 'Legacy render hashes for the C6b compatibility gate. Recorded from the build BEFORE the learning '
        + 'card existed; a change here means a lesson that was authored without card fields now renders '
        + 'differently. Re-record only when that is intended, and say why in the commit.',
    fixture: 'inline LEGACY in scripts/verify-learning-card.mjs', units: curSha }, null, 1) + '\n');
  console.log(`recorded ${Object.keys(curSha).length} legacy units to ${path.relative(root, BASELINE)}`);
  await browser.close(); server.close(); process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  ok('legacy baseline exists', false, `${path.relative(root, BASELINE)} is missing — run with --update from a pre-C6b build`);
} else {
  const stored = JSON.parse(fs.readFileSync(BASELINE, 'utf8')).units || {};
  const keys = [...new Set([...Object.keys(stored), ...Object.keys(curSha)])].sort();
  const diffs = keys.filter((k) => stored[k] !== curSha[k]);
  ok('a lesson with no card field renders exactly as it did before C6b', diffs.length === 0,
     `${keys.length - diffs.length}/${keys.length} units identical${diffs.length ? ' — differs: ' + diffs.slice(0, 6).join(', ') : ''}`);
  note(`${LEGACY.slides.length} legacy slides x ${THEMES.length} themes = ${keys.length} render units, hashed`);

  /* NON-VACUITY 1. The baseline must be able to SEE a change. Add one card field to a legacy block and
     assert the same comparison now reports a difference — otherwise green proves only that it ran. */
  const mutated = JSON.parse(JSON.stringify(LEGACY));
  mutated.slides[0].blocks[0].icon = 'key';
  const mut = await renderAll(wtPage, mutated, ['mathematics']);
  const moved = Object.keys(mut).filter((k) => sha(mut[k]) !== stored[k]);
  ok('control: the baseline detects a card field added to a legacy block', moved.length > 0,
     moved.length ? `${moved.length} unit(s) differ, as they must` : 'NO diff was seen — the baseline is vacuous');
}
await wtPage.close();

/* MARKUP HASHES CANNOT SEE A CSS COLLISION. The first draft of this card used the class name `.tp-card`,
   which microhistory's own title slide has emitted since long before Stage 4 (`mhTitle`, and the rule at
   :root[data-theme="microhistory"] .tp-card). The 30 hashes above stayed green while the shipped title card
   silently changed from display:block/padding:0 to display:flex/padding:26px 30px 24px and grew 605 -> 619px,
   because the MARKUP was untouched. So the legacy half also asserts, from computed style, that the learning
   card's class prefix belongs to the learning card alone. */
mark('collision');
const collide = await newPage(base + 'lesson-studio.html');
const coll = await collide.evaluate(() => {
  const out = { offenders: [], probes: [] };
  const LEGACY_SLIDES = [
    { theme: 'microhistory', slide: { type: 'title', title: 'T', subtitle: 's', eyebrow: 'E', meta: ['a'], context: [] } },
    { theme: 'imperium', slide: { type: 'title', title: 'T', subtitle: 's', eyebrow: 'E' } },
    { theme: 'geolearn', slide: { type: 'title', title: 'T', subtitle: 's', eyebrow: 'E' } },
  ];
  for (const { theme, slide } of LEGACY_SLIDES) {
    LESSON = { meta: { theme }, slides: [slide] };
    document.documentElement.dataset.theme = theme; go(0);
    /* Anything wearing a tp-lcard* class on a slide that authored no card is a collision. */
    document.querySelectorAll('#slide [class]').forEach((el) => {
      [...el.classList].forEach((c) => { if (/^tp-lcard(-|$)/.test(c)) out.offenders.push(theme + ' ' + el.tagName + '.' + c); });
    });
    const c = document.querySelector('#slide .tp-card');
    if (c) { const cs = getComputedStyle(c);
      out.probes.push({ theme, display: cs.display, padding: cs.padding, h: Math.round(c.getBoundingClientRect().height) }); }
  }
  return out;
});
ok('no legacy slide picks up a learning-card class', coll.offenders.length === 0,
   coll.offenders.length ? coll.offenders.slice(0, 5).join(', ') : `${coll.probes.length} legacy title slide(s) probed`);
/* The specific survivor: microhistory's own .tp-card must still be the block it always was. */
const mh = coll.probes.find((p) => p.theme === 'microhistory');
ok("microhistory's own .tp-card is untouched by the learning card", !!mh && mh.display === 'block' && mh.padding === '0px',
   mh ? `display:${mh.display} padding:${mh.padding} height:${mh.h}px` : 'microhistory .tp-card not found');
await collide.close();

// ══ B. THE CARD ITSELF ═════════════════════════════════════════════════════════════════════════════════
const page = await newPage(base + 'lesson-studio.html');
await page.evaluate(({ L }) => { LESSON = JSON.parse(JSON.stringify(L));
  document.documentElement.dataset.theme = 'mathematics'; go(0); }, { L: lesson });

const slotProbe = await page.evaluate(() => {
  const want = ['tp-lcard-kicker', 'tp-lcard-rule', 'tp-lcard-title', 'tp-lcard-body', 'tp-lcard-p',
                'tp-lcard-steps', 'tp-lcard-step', 'tp-lcard-chip', 'tp-lcard-foot'];
  const seen = {}; want.forEach((c) => { seen[c] = false; });
  for (let i = 0; i < LESSON.slides.length; i++) { go(i);
    want.forEach((c) => { if (document.querySelector('#slide .' + c)) seen[c] = true; }); }
  return seen;
});
mark('slots');
const missingSlots = Object.keys(slotProbe).filter((k) => !slotProbe[k]);
ok('every card slot is exercised by the fixture', missingSlots.length === 0,
   missingSlots.length ? 'never rendered: ' + missingSlots.join(', ') : Object.keys(slotProbe).length + ' slots seen');

// One primitive, two homes: the standalone card and the figure companion must be the SAME structure.
const shared = await page.evaluate(() => {
  const shape = (el) => el ? [...el.children].map((c) => c.className.split(' ')[0]).join('>') : null;
  go(1); const standalone = shape(document.querySelector('#slide .tp-lcard'));
  go(5); const comp = document.querySelector('#slide .tp-figl-text .tp-lcard');
  return { standalone, companionShape: shape(comp), companionIsCard: !!comp,
           companionInsideSlot: !!document.querySelector('#slide .tp-figl > .tp-figl-text > .tp-lcard') };
});
mark('shared');
ok('the figure companion is the same card primitive, not a second renderer',
   shared.companionIsCard && shared.companionInsideSlot,
   `companion shape ${shared.companionShape} · standalone ${shared.standalone}`);

// ══ C. THE AUTHORED PROSE FACE ═════════════════════════════════════════════════════════════════════════
const faces = await page.evaluate(async () => {
  await document.fonts.ready;
  const fam = (el) => el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '') : null;
  const mk = (fontStyle) => ({ type: 'text', eyebrow: 'E', icon: 'key', title: 'T $x$',
    body: ['Body with $y=x^2$ and a ==term== inside.'], keyTerms: [{ term: 'term', definition: 'd' }],
    steps: ['s'], chip: 'c', footer: 'f', fontStyle });
  const out = {};
  for (const f of [undefined, 'theme', 'serif', 'sans']) {
    LESSON = { meta: { theme: 'mathematics' }, slides: [{ type: 'page', blocks: [mk(f)] }] };
    document.documentElement.dataset.theme = 'mathematics'; go(0);
    const c = document.querySelector('#slide .tp-lcard');
    out[String(f)] = { attr: c.dataset.tpFace || '', container: fam(c),
      title: fam(c.querySelector('.tp-lcard-title')), body: fam(c.querySelector('.tp-lcard-p')),
      step: fam(c.querySelector('.tp-lcard-step')), foot: fam(c.querySelector('.tp-lcard-foot')),
      chip: fam(c.querySelector('.tp-lcard-chip')),
      bodyPx: parseFloat(getComputedStyle(c.querySelector('.tp-lcard-p')).fontSize),
      math: fam(c.querySelector('math')) };
  }
  return out;
});
mark('faces');
const themeFam = faces.undefined.body;
ok('omitted fontStyle is identical to fontStyle:"theme"',
   JSON.stringify(faces.undefined) === JSON.stringify(faces.theme), `both resolve body to ${themeFam}`);
ok('fontStyle:"sans" changes the whole authored hierarchy together',
   new Set([faces.sans.title, faces.sans.body, faces.sans.step, faces.sans.foot, faces.sans.chip]).size === 1
   && faces.sans.body !== themeFam,
   `title/body/step/foot/chip all ${faces.sans.body}, against the theme's ${themeFam}`);
ok('fontStyle:"serif" resolves a serif prose face', /Garamond|Serif|Georgia/i.test(faces.serif.body), faces.serif.body);
ok('the optical size travels with the face', faces.sans.bodyPx !== faces.undefined.bodyPx,
   `theme ${faces.undefined.bodyPx}px vs sans ${faces.sans.bodyPx}px`);
/* The control guard is STRUCTURAL: the face is never set on the card container, so a descendant carrying
   `font:inherit` — which every button and select in the pack does — cannot pick it up. Asserting the
   container is unchanged is asserting the guard itself, not a symptom of it. */
ok('the face is never applied to the card container (so font:inherit controls cannot inherit it)',
   faces.sans.container === faces.undefined.container && faces.serif.container === faces.undefined.container,
   `container stays ${faces.undefined.container} under every fontStyle`);
ok('mathematical notation keeps its own face under every fontStyle',
   ['undefined', 'theme', 'serif', 'sans'].every((k) => faces[k].math === 'LM Math'),
   'math resolves LM Math in all four');

/* NON-VACUITY 2. If the face were applied to the container instead of the text classes, the control guard
   above would still read "unchanged" unless it is actually sensitive. Prove it is. */
const faceCtl = await page.evaluate(async () => {
  const st = document.createElement('style');
  st.textContent = '.tp-slide .tp-lcard[data-tp-face="sans"]{font-family:var(--tp-face-sans);}';
  document.head.appendChild(st);
  LESSON = { meta: { theme: 'mathematics' }, slides: [{ type: 'page', blocks: [
    { type: 'text', title: 'T', body: ['b'], icon: 'key', fontStyle: 'sans' }] }] };
  document.documentElement.dataset.theme = 'mathematics'; go(0);
  await document.fonts.ready;
  const c = document.querySelector('#slide .tp-lcard');
  const fam = getComputedStyle(c).fontFamily.split(',')[0].replace(/['"]/g, '');
  st.remove();
  return fam;
});
ok('control: the container check would fail if the face were put on the container',
   faceCtl === 'Inter', `injecting the container rule moves it to ${faceCtl}`);

// ══ D. CLOSED VOCABULARIES — report, never reinterpret ═════════════════════════════════════════════════
const enums = await page.evaluate(() => {
  const probe = (block) => { LESSON = { meta: { theme: 'mathematics' }, slides: [{ type: 'page', blocks: [block] }] };
    document.documentElement.dataset.theme = 'mathematics'; go(0);
    const c = document.querySelector('#slide .tp-lcard');
    return { n: c ? +c.dataset.tpLcardErrors : -1, text: c ? (c.querySelector('.tp-lcard-err') || {}).textContent || '' : '',
             img: !!(c && c.querySelector('img')), face: c ? c.dataset.tpFace || '' : '', iconSvg: !!(c && c.querySelector('.tp-lcard-kicker svg')) }; };
  const good = { type: 'text', title: 'T', body: ['b'], icon: 'key', fontStyle: 'serif' };
  return {
    good: probe(good),
    badIconUrl: probe({ ...good, icon: 'https://cdn.example.com/i.png' }),
    badIconData: probe({ ...good, icon: 'data:image/png;base64,AAAA' }),
    badIconPath: probe({ ...good, icon: 'assets/icon.svg' }),
    badIconName: probe({ ...good, icon: 'unicorn' }),
    badFace: probe({ ...good, fontStyle: 'Helvetica' }),
  };
});
mark('enums');
ok('a valid icon and fontStyle report nothing', enums.good.n === 0 && enums.good.iconSvg && enums.good.face === 'serif');
for (const [k, label] of [['badIconUrl', 'an https:// icon'], ['badIconData', 'a data: icon'],
                          ['badIconPath', 'a path icon'], ['badIconName', 'an unknown icon name']]) {
  ok(`${label} is reported and never rendered`, enums[k].n >= 1 && enums[k].img === false,
     `${enums[k].n} error(s), <img> emitted: ${enums[k].img}`);
}
ok('an unsupported fontStyle is reported and falls back to the theme',
   enums.badFace.n >= 1 && enums.badFace.face === '', `${enums.badFace.n} error(s), face attr "${enums.badFace.face}"`);

/* NON-VACUITY 3. The firewall property is that an authored icon never reaches tpIc. Show tpIc WOULD have
   emitted an <img> for the same string — i.e. the allow-list is what stops it, not tpIc being harmless. */
const sinkCtl = await page.evaluate(() => tpIc('https://cdn.example.com/i.png', 15));
ok('control: tpIc itself would emit an <img> for that URL (the allow-list is what prevents it)',
   /^<img/.test(sinkCtl), sinkCtl.slice(0, 60));

const ambig = await page.evaluate(({ L }) => { LESSON = JSON.parse(JSON.stringify(L));
  document.documentElement.dataset.theme = 'mathematics';
  const out = {};
  for (let i = 0; i < LESSON.slides.length; i++) { go(i);
    const f = document.querySelector('#slide .tp-fig'); if (!f) continue;
    out[i] = { n: +f.dataset.tpFigErrors, text: (f.querySelector('.tp-fig-err') || {}).textContent || '',
               card: !!document.querySelector('#slide .tp-figl-text .tp-lcard'),
               plain: !!(document.querySelector('#slide .tp-figl-text') && !document.querySelector('#slide .tp-figl-text .tp-lcard')) }; }
  return out; }, { L: lesson });
mark('ambiguity');
const both = ambig[9];
ok('a figure carrying BOTH text and companion reports the ambiguity',
   both && both.n >= 1 && /BOTH `text` and `companion`/.test(both.text), both ? `${both.n} error(s)` : 'slide not found');
ok('…and resolves to the legacy `text`, the shape existing lessons use', both && both.plain === true && both.card === false);

// ══ E. LAYOUT — alignment, the prose-CONTENT contract, stacking ════════════════════════════════════════
const layout = await page.evaluate(({ L }) => {
  LESSON = JSON.parse(JSON.stringify(L)); document.documentElement.dataset.theme = 'mathematics';
  const dieWidth = (i) => { go(i); const w = document.querySelector('#slide .tp-figl'); if (!w) return null;
    const h = w.parentElement; let died = null;
    for (let px = 1300; px >= 400; px -= 1) { h.style.width = px + 'px'; h.style.maxWidth = px + 'px'; figFitAll();
      if (w.dataset.figLayout !== 'beside') { died = px; break; } }
    h.style.width = ''; h.style.maxWidth = ''; figFitAll(); return died; };
  const at = (i, px) => { go(i); const w = document.querySelector('#slide .tp-figl');
    const h = w.parentElement; h.style.width = px + 'px'; h.style.maxWidth = px + 'px'; figFitAll();
    const slot = w.querySelector('.tp-figl-text');
    const r = { mode: w.dataset.figLayout, align: getComputedStyle(w).alignItems,
                slotW: slot ? slot.offsetWidth : 0, wrapW: w.offsetWidth,
                chrome: Math.round(figProseChrome(w)) };
    h.style.width = ''; h.style.maxWidth = ''; figFitAll(); return r; };
  const out = { geoCard: dieWidth(4), graphCard: dieWidth(5), graphPlain: dieWidth(8),
                besideAt1200: at(5, 1200), stackedAt700: at(5, 700),
                minStage: { graph: figMinStageWidth({ figure: 'graph' }), geometry: figMinStageWidth({ figure: 'geometry' }) },
                proseFloor: FIG_BESIDE_MIN_PROSE_CONTENT, gap: FIG_BESIDE_GAP };
  /* NON-VACUITY 4. Inflate the card's own chrome so the PROSE floor, not the figure minimum, becomes the
     binding constraint. If the contract were still comparing the raw column — the defect this commit
     fixes — this number would not move, and an uncarded companion would move with it. */
  const st = document.createElement('style');
  st.textContent = '.tp-slide .tp-lcard{padding-left:160px !important;padding-right:160px !important;}';
  document.head.appendChild(st);
  go(5); out.inflatedChrome = Math.round(figProseChrome(document.querySelector('#slide .tp-figl')));
  out.graphCardInflated = dieWidth(5);
  out.graphPlainInflated = dieWidth(8);
  st.remove();
  return out; }, { L: lesson });
mark('layout');
ok('beside siblings are top-aligned, never stretched to equal height',
   layout.besideAt1200.align === 'start' || layout.besideAt1200.align === 'flex-start', layout.besideAt1200.align);
ok('the figure stage minima are unchanged',
   layout.minStage.graph === 340 && layout.minStage.geometry === 420,
   `graph ${layout.minStage.graph} · geometry ${layout.minStage.geometry}`);
ok('the companion card\'s chrome is MEASURED, not assumed',
   layout.besideAt1200.chrome > 0, `${layout.besideAt1200.chrome}px of padding + borders`);
ok('an uncarded companion measures zero chrome (the measurement is per-companion)',
   layout.graphPlain === layout.graphCard,
   `plain and carded both leave beside at ${layout.graphPlain}px — the figure minimum still binds`);
note(`transition points: graph leaves beside at ${layout.graphCard}px available, geometry at ${layout.geoCard}px`);
ok('the correction did not move the transition points (the figure minimum is still binding)',
   layout.graphCard === 755 && layout.geoCard === 915,
   `graph ${layout.graphCard} (expected 755) · geometry ${layout.geoCard} (expected 915)`);
ok('control: the prose-CONTENT floor can drive the layout — it is not inert',
   layout.graphCardInflated !== null && layout.graphCardInflated > layout.graphCard,
   `inflating the card chrome to ${layout.inflatedChrome}px moves the graph transition ${layout.graphCard} → ${layout.graphCardInflated}`);
ok('control: inflating the CARD chrome leaves an uncarded companion alone',
   layout.graphPlainInflated === layout.graphPlain,
   `plain stays at ${layout.graphPlainInflated}px while the carded one moves`);
ok('a stacked companion recovers the full available width',
   layout.stackedAt700.mode === 'stacked' && layout.stackedAt700.slotW > layout.stackedAt700.wrapW * 0.9,
   `${layout.stackedAt700.mode}, slot ${layout.stackedAt700.slotW}px of ${layout.stackedAt700.wrapW}px`);

// ══ F. THE CHIP PAIR — contrast, in every designed theme ═══════════════════════════════════════════════
const chip = await page.evaluate(({ themes }) => {
  const lum = (c) => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((x) => { x /= 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  return themes.map((t) => { LESSON = { meta: { theme: t }, slides: [{ type: 'page', blocks: [
      { type: 'text', title: 'T', body: ['b'], icon: 'key', chip: 'SSS congruence test' }] }] };
    document.documentElement.dataset.theme = t; go(0);
    const el = document.querySelector('#slide .tp-lcard-chip');
    if (!el) return { theme: t, ratio: null };
    const cs = getComputedStyle(el);
    return { theme: t, ratio: +ratio(cs.color, cs.backgroundColor).toFixed(2), text: el.textContent.trim() }; });
}, { themes: THEMES });
mark('chip');
const chipBad = chip.filter((c) => c.ratio === null || c.ratio < 4.5);
ok('the chip label clears WCAG AA on its own tint in every designed theme', chipBad.length === 0,
   chipBad.length ? 'fails: ' + chipBad.map((c) => `${c.theme} ${c.ratio}`).join(', ')
                  : chip.map((c) => `${c.theme} ${c.ratio}:1`).join(' · '));

// ══ report ════════════════════════════════════════════════════════════════════════════════════════════
const EXPECTED = ['baseline', 'collision', 'slots', 'shared', 'faces', 'enums', 'ambiguity', 'layout', 'chip'];
const skipped = EXPECTED.filter((k) => !ran.has(k));
if (skipped.length) { ok('every section ran', false, 'never executed: ' + skipped.join(', ')); }

console.log(results.join('\n'));
if (pageErrs.length) console.log(`\n⚠ ${pageErrs.length} page error(s): ${pageErrs.slice(0, 4).join(' | ')}`);
const pass = results.filter((r) => r.startsWith('PASS')).length;
const fail = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${fail ? '✗' : '✓'} learning card: ${pass}/${pass + fail} checks`);
await browser.close(); server.close();
process.exit(failed || pageErrs.length ? 1 : 0);
