#!/usr/bin/env node
// A0 — THE LESSON RESPONSE STORE. Stable-id identity, typed payloads, a deterministic bundle, and the
// submission seam.
//
//   node scripts/verify-response-store.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-response-store.mjs
//
// WHY THIS EXISTS. The pre-existing runtime (TP_RUNTIME) is keyed by `cur`, the slide INDEX. That is
// correct for per-slide ephemera and WRONG for a bundle that will be submitted: reorder the lesson and a
// student's ink rebinds to whatever page now sits at that index. Every assertion below is about identity
// surviving things that change position, and about the bundle being safe to hand to an adapter.
//
// The two controls the maintainer asked for are C1 (index keying really does reattribute — so the fix is
// not solving an imaginary problem) and C2 (removing the duplicate-id audit really does let two pages
// share state). A green run without those proves only that the harness executed.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.mjs': 'text/javascript',
  '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.png': 'image/png', '.svg': 'image/svg+xml' };

const results = [];
let failed = false;
const ok = (n, c, extra = '') => { results.push(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? '  ' + extra : ''}`); if (!c) failed = true; };
const note = (s) => results.push('     · ' + s);
const ran = new Set();

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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrs = [];
page.on('pageerror', (e) => pageErrs.push(String(e)));
await page.goto(base + 'lesson-studio.html', { waitUntil: 'load' });

/* A lesson whose pages carry authored ids, deliberately NOT in array order, so an index-keyed store and an
   id-keyed store disagree the moment anything moves. */
const L = { meta: { title: 'A0', theme: 'mathematics', submission: 'none' }, slides: [
  { type: 'page', id: 'intro',    title: 'Intro',    blocks: [] },
  { type: 'page', id: 'practice', title: 'Practice', blocks: [],
    questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }] },
  { type: 'page', id: 'review',   title: 'Review',   blocks: [] },
] };

// ══ 1. Identity survives navigation and reordering ═════════════════════════════════════════════════════
ran.add('identity');
const ident = await page.evaluate(({ L }) => {
  LESSON = JSON.parse(JSON.stringify(L)); tpRespReset(LESSON); go(0);
  tpRespSet('practice', 'q1', 'text', 'x = 3');
  go(2); go(0); go(1);                                    // navigate away and back
  const afterNav = tpRespGet('practice', 'q1');
  /* Reorder the lesson so `practice` moves from index 1 to index 0. An index-keyed store loses this. */
  const moved = JSON.parse(JSON.stringify(LESSON));
  moved.slides = [moved.slides[1], moved.slides[0], moved.slides[2]];
  LESSON = moved; go(0);
  const afterReorder = tpRespGet('practice', 'q1');
  const wrongPage = tpRespGet('intro', 'q1');
  return { afterNav, afterReorder, wrongPage };
}, { L });
ok('a response survives navigating away and back',
   ident.afterNav && ident.afterNav.value === 'x = 3', JSON.stringify(ident.afterNav));
ok('a response is NOT reattributed when the page array is reordered',
   ident.afterReorder && ident.afterReorder.value === 'x = 3', JSON.stringify(ident.afterReorder));
ok('…and does not leak onto the page that took its old index', ident.wrongPage === null);

/* CONTROL 1 — the defect is real. Drive the SAME reorder through the index-keyed runtime and show the
   value follows the position rather than the page. Without this, the two assertions above prove nothing. */
const ctl1 = await page.evaluate(({ L }) => {
  LESSON = JSON.parse(JSON.stringify(L)); TP_RUNTIME = {}; go(1);
  tpRT().ans.q1 = 'x = 3';                                // index-keyed, exactly as legacy pages store
  const beforeIdx = TP_RUNTIME[1] && TP_RUNTIME[1].ans.q1;
  const moved = JSON.parse(JSON.stringify(LESSON));
  moved.slides = [moved.slides[1], moved.slides[0], moved.slides[2]];
  LESSON = moved; go(0);
  return { beforeIdx, atPracticeNow: (TP_RUNTIME[0] && TP_RUNTIME[0].ans.q1) || null,
           strandedAtOldIndex: (TP_RUNTIME[1] && TP_RUNTIME[1].ans.q1) || null };
}, { L });
ok('control: index keying DOES reattribute under the same reorder',
   ctl1.beforeIdx === 'x = 3' && ctl1.atPracticeNow === null && ctl1.strandedAtOldIndex === 'x = 3',
   `the answer stays at index 1 while the page moved to index 0`);

// ══ 2. Collisions are reported, never silently shared ══════════════════════════════════════════════════
ran.add('collisions');
const dup = await page.evaluate(() => {
  const dupPage = { meta: { theme: 'mathematics' }, slides: [
    { type: 'page', id: 'same', title: 'A' }, { type: 'page', id: 'same', title: 'B' } ] };
  const dupResp = { meta: { theme: 'mathematics' }, slides: [
    { type: 'page', id: 'p', questions: [{ id: 'q1' }, { id: 'q1' }] } ] };
  const clean = { meta: { theme: 'mathematics' }, slides: [
    { type: 'page', id: 'a', questions: [{ id: 'q1' }, { id: 'q2' }] },
    { type: 'page', id: 'b', questions: [{ id: 'q1' }] } ] };
  return { dupPage: tpRespAudit(dupPage), dupResp: tpRespAudit(dupResp), clean: tpRespAudit(clean) };
});
ok('a duplicate PAGE id is reported', dup.dupPage.length === 1 && /duplicate page id "same"/.test(dup.dupPage[0]),
   dup.dupPage[0] || '(nothing reported)');
ok('a duplicate RESPONSE id within a page is reported',
   dup.dupResp.length === 1 && /duplicate response id "q1"/.test(dup.dupResp[0]), dup.dupResp[0] || '(nothing reported)');
ok('the same response id on DIFFERENT pages is legal', dup.clean.length === 0,
   dup.clean.length ? dup.clean.join(' · ') : 'no false positive');
ok('no runtime suffixing — the reported ids are the authored ones',
   /"same"/.test(dup.dupPage[0] || '') && !/same-1|same_2/.test(dup.dupPage[0] || ''));

/* CONTROL 2 — with the audit bypassed, two pages sharing an id really do share state. */
const ctl2 = await page.evaluate(() => {
  LESSON = { meta: { theme: 'mathematics' }, slides: [
    { type: 'page', id: 'same' }, { type: 'page', id: 'same' } ] };
  TP_RESP = {}; TP_RESP_ERRORS = [];                      // bypass the audit
  tpRespSet('same', 'q1', 'text', 'from page A');
  const readFromB = tpRespGet('same', 'q1');
  return { shared: readFromB && readFromB.value };
});
ok('control: without the audit, duplicate ids DO share one response slot',
   ctl2.shared === 'from page A', 'which is exactly what the audit exists to report');

// ══ 3. Payloads stay typed ═════════════════════════════════════════════════════════════════════════════
ran.add('kinds');
const kinds = await page.evaluate(({ L }) => {
  LESSON = JSON.parse(JSON.stringify(L)); tpRespReset(LESSON);
  tpRespSet('practice', 'q1', 'text', 'x = 3');
  tpRespSet('practice', 'q2', 'ink', [{ e: false, w: 5, p: [{ x: 1, y: 2, pr: 0.5 }] }]);
  tpRespSet('practice', 'q3', 'graph', { points: [[2, 4], [-2, 4]], equation: 'y=x^2' });
  const bad = tpRespSet('practice', 'q9', 'sketch', 'nope');   // not in RESP_KINDS
  const b = tpRespBundle();
  return { kinds: Object.keys(b.pages.practice).map(k => b.pages.practice[k].kind),
           bad, badStored: tpRespGet('practice', 'q9'),
           ink: b.pages.practice.q2.value, graph: b.pages.practice.q3.value,
           coexist: !!(b.pages.practice.q2 && b.pages.practice.q3) };
}, { L });
ok('typed, ink and graph payloads remain distinguishable',
   JSON.stringify(kinds.kinds) === '["text","ink","graph"]', kinds.kinds.join(', '));
ok('an ink payload survives intact', Array.isArray(kinds.ink) && kinds.ink[0].p[0].pr === 0.5);
ok('a graph payload coexists with written work on one page', kinds.coexist);
ok('an unknown kind is rejected rather than stored', kinds.bad === false && kinds.badStored === null);

// ══ 4. The bundle is deterministic and detached ════════════════════════════════════════════════════════
ran.add('bundle');
const bundle = await page.evaluate(({ L }) => {
  LESSON = JSON.parse(JSON.stringify(L)); tpRespReset(LESSON);
  /* Insert in a deliberately unsorted order; a deterministic bundle must not depend on it. */
  tpRespSet('review', 'zz', 'text', 'last');
  tpRespSet('practice', 'q3', 'text', 'c');
  tpRespSet('practice', 'q1', 'text', 'a');
  tpRespSet('intro', 'note', 'text', 'first');
  const a = JSON.stringify(tpRespBundle()), b = JSON.stringify(tpRespBundle());
  const snap = tpRespBundle();
  snap.pages.practice.q1.value = 'MUTATED';                // try to corrupt live state through the bundle
  snap.pages.practice.q2 = { kind: 'text', value: 'INJECTED' };
  const live = tpRespGet('practice', 'q1'), injected = tpRespGet('practice', 'q2');
  let serialisable = true; try { JSON.parse(JSON.stringify(tpRespBundle())); } catch { serialisable = false; }
  const keys = Object.keys(JSON.parse(a).pages);
  return { stable: a === b, sorted: JSON.stringify(keys) === JSON.stringify(keys.slice().sort()),
           liveValue: live && live.value, injected, serialisable, keys };
}, { L });
ok('bundle() is deterministic across repeated calls', bundle.stable);
ok('bundle() key order is sorted, not insertion order', bundle.sorted, bundle.keys.join(', '));
ok('mutating the returned bundle does not mutate live state',
   bundle.liveValue === 'a' && bundle.injected === null, `live q1 still "${bundle.liveValue}"`);
ok('bundle() is JSON-serialisable', bundle.serialisable);

// ══ 5. clear() and the adapter seam ════════════════════════════════════════════════════════════════════
ran.add('lifecycle');
const life = await page.evaluate(({ L }) => {
  LESSON = JSON.parse(JSON.stringify(L)); tpRespReset(LESSON);
  tpRespSet('practice', 'q1', 'text', 'x = 3');
  const before = Object.keys(tpRespBundle().pages).length;
  tpRespReset(LESSON);
  const after = Object.keys(tpRespBundle().pages).length;
  tpRespSet('practice', 'q1', 'text', 'again');
  const snap = tpRespBundle();
  const a = tpSubmitAdapter();
  const r = a.collect(snap);
  const unchanged = JSON.stringify(tpRespBundle()) === JSON.stringify(snap);
  return { before, after, adapter: a.id, result: r, unchanged,
           defaulted: (() => { LESSON.meta.submission = 'does-not-exist'; return tpSubmitAdapter().id; })() };
}, { L });
ok('clear() removes all lesson responses', life.before === 1 && life.after === 0, `${life.before} → ${life.after} pages`);
ok('the "none" adapter accepts a bundle with no side effects',
   life.adapter === 'none' && life.result.ok === true && life.result.delivered === false && life.unchanged);
ok('an unknown submission adapter falls back to "none" rather than throwing', life.defaulted === 'none');

// ══ 6. Legacy is untouched ═════════════════════════════════════════════════════════════════════════════
ran.add('legacy');
const legacy = await page.evaluate(() => {
  const noIds = { meta: { theme: 'mathematics' }, slides: [{ type: 'page', title: 'legacy' }, { type: 'text' }] };
  const errs = tpRespAudit(noIds);
  LESSON = noIds; tpRespReset(LESSON); go(0);
  TP_RUNTIME = {}; tpRT().ans.legacyField = 'still works';
  return { errs: errs.length, runtime: tpRT().ans.legacyField,
           respEmpty: Object.keys(tpRespBundle().pages).length === 0 };
});
ok('a page with no authored id does not participate and reports nothing', legacy.errs === 0 && legacy.respEmpty);
ok('the legacy index-keyed runtime still works alongside the new store', legacy.runtime === 'still works');

const EXPECTED = ['identity', 'collisions', 'kinds', 'bundle', 'lifecycle', 'legacy'];
const skipped = EXPECTED.filter((k) => !ran.has(k));
if (skipped.length) ok('every section ran', false, 'never executed: ' + skipped.join(', '));

console.log(results.join('\n'));
if (pageErrs.length) console.log(`\n⚠ ${pageErrs.length} page error(s): ${pageErrs.slice(0, 4).join(' | ')}`);
const pass = results.filter((r) => r.startsWith('PASS')).length;
const fail = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${fail ? '✗' : '✓'} response store: ${pass}/${pass + fail} checks`);
await browser.close(); server.close();
process.exit(failed || pageErrs.length ? 1 : 0);
