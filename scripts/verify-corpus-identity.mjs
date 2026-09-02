#!/usr/bin/env node
// CORPUS RENDER BYTE-IDENTITY — the committed, reproducible form of the "legacy corpus renders
// 250/250 byte-identical" claim that #146, #147 and #149 each made from a throwaway script.
//
//   node scripts/verify-corpus-identity.mjs                 # working tree vs origin/main
//   node scripts/verify-corpus-identity.mjs --ref HEAD~1    # vs any other git ref
//   node scripts/verify-corpus-identity.mjs --themes imperium,scholarmath --max-diffs 5
//
// WHAT IT PROVES. Every committed lesson in examples/ and lessons/, re-skinned to each of the five
// pack themes, rendered slide by slide through the app's OWN render() — and the resulting
// `#slide.innerHTML` compared byte for byte between the working tree's lesson-studio.html and the
// reference ref's. BOTH THE ENGINE AND THE LESSON JSON come from their own revision: reading the
// working tree's lesson files for both sides would render the new data twice and report a genuine
// content change as identical, and the lesson list is unioned across the two revisions so a lesson
// added or deleted on one side is compared rather than skipped. A change that is meant to leave existing lessons alone (an engine addition, a
// new block type, a placement fix that no committed lesson exercises) must come back all-identical;
// anything else names the exact lesson / theme / slide that moved.
//
// DETERMINISM. The corpus contains video slides that pull remote poster thumbnails, which settle at
// different moments and made 1-4 units differ per run purely on timing. Every non-local request is
// ABORTED in both pages, so a render is a pure function of the engine and the lesson JSON. Both
// sides are driven by one browser instance under identical conditions.
//
// EXIT CODE. 0 when every unit matches, 1 on any mismatch or setup failure — so it is usable as a
// gate. It is NOT wired into CI: it needs Playwright + Chromium, which only the (informational,
// non-gating) screenshots workflow installs, and changing what gates merge is a maintainer call.
//
// NOT A BENCHMARK. Solve/render timing is reported for orientation only and never fails the run —
// a wall-clock number from one shared runner is not a repeatable benchmark, and treating it as a
// threshold would make the suite flaky. Introduce a real methodology before asserting on it.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const THEMES = arg('themes', 'imperium,microhistory,geolearn,mathematics,scholarmath')
  .split(',').map((s) => s.trim()).filter(Boolean);
const MAX_DIFFS = Number(arg('max-diffs', 12));
// CHROMIUM_PATH is an escape hatch for sandboxes that ship a prebuilt Chromium instead of
// Playwright's own download; unset, it launches exactly as the other harnesses do.
const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};

// Resolve the reference ref. Default origin/main, falling back to main for a checkout with no remote.
let REF = arg('ref', '');
// lesson-studio.html is ~1.6MB, well past execFileSync's 1MB default maxBuffer — without this the
// `git show` below fails with ENOBUFS and looks exactly like a missing file.
const GIT_MAX = 256 * 1024 * 1024;
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: GIT_MAX }).trim();
const gitRaw = (...a) => execFileSync('git', a, { cwd: root, maxBuffer: GIT_MAX });
if (!REF) {
  for (const candidate of ['origin/main', 'main']) {
    try { git('rev-parse', '--verify', `${candidate}^{commit}`); REF = candidate; break; } catch { /* try next */ }
  }
}
if (!REF) { console.error('✗ no reference ref — pass --ref <git-ref>'); process.exit(1); }
let refSha;
try { refSha = git('rev-parse', '--short', REF); }
catch { console.error(`✗ cannot resolve ref "${REF}"`); process.exit(1); }

// The corpus: every committed lesson in either directory, taken from BOTH revisions and unioned.
// Each side must render ITS OWN lesson JSON — reading the working tree's copy for both would make a
// change to a lesson file invisible (both sides render the new data and report identical), and a
// lesson added or deleted on one side would never be compared at all.
const isLesson = (p) => /^(examples|lessons)\/[^/]+\.json$/.test(p);
const wtCorpus = [];
for (const dir of ['examples', 'lessons']) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs).filter((n) => n.endsWith('.json'))) wtCorpus.push(`${dir}/${f}`);
}
let refCorpus = [];
try { refCorpus = git('ls-tree', '-r', '--name-only', REF, '--', 'examples/', 'lessons/').split('\n').filter(isLesson); }
catch { /* ref may predate either directory — an empty list is a valid answer */ }
const corpus = [...new Set([...refCorpus, ...wtCorpus])].sort();
if (!corpus.length) { console.error('✗ no lessons found in examples/ or lessons/ on either side'); process.exit(1); }
const onlyRef = refCorpus.filter((f) => !wtCorpus.includes(f));
const onlyWt = wtCorpus.filter((f) => !refCorpus.includes(f));

// Each revision's lesson JSON, read once. `null` means the lesson does not exist on that side, which
// is a difference in its own right rather than a reason to skip it.
const lessonsAt = (readOne) => {
  const map = Object.create(null);
  for (const rel of corpus) { try { map[rel] = JSON.parse(readOne(rel)); } catch { map[rel] = null; } }
  return map;
};
const refLessons = lessonsAt((rel) => gitRaw('show', `${REF}:${rel}`).toString('utf8'));
const wtLessons = lessonsAt((rel) => fs.readFileSync(path.join(root, rel), 'utf8'));

// Stage both builds side by side. file:// keeps this independent of any local server; the app
// inlines its fonts as data: URIs, so the only cross-origin fetches are the ones we abort anyway.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'corpus-identity-'));
const refFile = path.join(tmp, 'ref.html');
const wtFile = path.join(tmp, 'working.html');
try { fs.writeFileSync(refFile, gitRaw('show', `${REF}:lesson-studio.html`)); }
catch (e) {
  console.error(`✗ cannot read lesson-studio.html at ${REF} — ${String(e.message || e).split('\n')[0]}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
fs.copyFileSync(path.join(root, 'lesson-studio.html'), wtFile);

const browser = await chromium.launch(launchOpts);

// Render the whole corpus in one build, using THAT revision's lesson JSON. Returns
// { "lesson|theme|slide": innerHTML }; a lesson absent on this side contributes no keys, so the
// comparison below reports its units as absent rather than silently matching.
async function renderAll(file, label, lessons) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  // Determinism gate — see the header. Anything not already in the file is aborted.
  await page.route('**/*', (r) => {
    const u = r.request().url();
    return (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
  });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof render === 'function' && document.getElementById('slide'));
  const out = {};
  const started = Date.now();
  for (const rel of corpus) {
    const lesson = lessons[rel];
    if (!lesson || !Array.isArray(lesson.slides)) continue;
    for (const theme of THEMES) {
      Object.assign(out, await page.evaluate(({ lesson, theme, rel }) => {
        LESSON = JSON.parse(JSON.stringify(lesson));
        LESSON.meta = LESSON.meta || {};
        LESSON.meta.theme = theme;
        TP_RUNTIME = {};
        const res = {};
        for (let i = 0; i < LESSON.slides.length; i++) {
          cur = i; render();
          res[`${rel}|${theme}|${i}`] = document.getElementById('slide').innerHTML;
        }
        return res;
      }, { lesson, theme, rel }));
    }
  }
  const ms = Date.now() - started;
  await page.close();
  return { out, errs, ms, label };
}

const A = await renderAll(refFile, `${REF} (${refSha})`, refLessons);
const B = await renderAll(wtFile, 'working tree', wtLessons);
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });

// Compare. Key sets must match too — a slide appearing or vanishing is a difference.
const keys = [...new Set([...Object.keys(A.out), ...Object.keys(B.out)])].sort();
const diffs = keys.filter((k) => A.out[k] !== B.out[k]);
const same = keys.length - diffs.length;

console.log(`corpus: ${corpus.length} lesson(s) × ${THEMES.length} theme(s) = ${keys.length} render units`);
if (onlyRef.length) console.log(`  only in ${REF}: ${onlyRef.join(', ')}`);
if (onlyWt.length) console.log(`  only in the working tree: ${onlyWt.join(', ')}`);
console.log(`reference: ${A.label}   ·   subject: working tree`);
console.log(`render time: ${A.ms}ms / ${B.ms}ms (informational — not a benchmark, never fails the run)`);
for (const r of [A, B]) if (r.errs.length) console.log(`⚠ ${r.label}: ${r.errs.length} page error(s) — ${r.errs[0].slice(0, 120)}`);

if (!diffs.length) {
  console.log(`\n✓ ${same}/${keys.length} render units byte-identical`);
  process.exit(0);
}
console.log(`\n✗ ${diffs.length}/${keys.length} render units DIFFER (${same} identical)`);
for (const k of diffs.slice(0, MAX_DIFFS)) {
  const [lesson, theme, slide] = k.split('|');
  const a = A.out[k], b = B.out[k];
  const detail = a === undefined ? 'absent in reference'
    : b === undefined ? 'absent in working tree'
    : `${a.length} → ${b.length} chars`;
  console.log(`  ✗ ${lesson}  theme=${theme}  slide=${slide}  (${detail})`);
}
if (diffs.length > MAX_DIFFS) console.log(`  … and ${diffs.length - MAX_DIFFS} more (raise with --max-diffs)`);
process.exit(1);
