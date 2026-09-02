#!/usr/bin/env node
// Theme/slide screenshot harness. Renders lesson-studio.html across THEMES × SLIDES
// with Playwright and writes one full-page PNG per (theme, slide) into screenshots/.
//
//   node scripts/shots.mjs
//   THEMES=egypt,ww1 SLIDES=0,1,9 node scripts/shots.mjs
//
// Web-fonts and 3D only load with internet; offline they fall back — that's expected
// for a local run (see docs/CHECKING.md). The CI `screenshots` workflow has internet,
// so its artifact shows real fonts and 3D.
//
// The harness LOADS A LESSON rather than screenshotting whatever the app happens to ship with.
// It used to rely on the app's embedded `#lesson-data`, but that has been an EMPTY lesson
// (`"slides": []`) since #89 (2026-07-03) — so every theme reported "slide N is out of range
// (0 slides)" and the run wrote zero PNGs while still exiting 0. `upload-artifact` skips an
// empty directory with only a warning, so the CI `screenshots` job stayed green with no
// artifact attached, for two months, while the PR template asked reviewers to skim it. The
// count assertion at the bottom is what stops that recurring.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const appPath = path.join(root, 'lesson-studio.html');
const outDir = path.join(root, 'screenshots');

if (!fs.existsSync(appPath)) {
  console.error(`✗ lesson-studio.html not found at ${appPath}`);
  process.exit(1);
}

const THEMES = (process.env.THEMES || 'imperium,microhistory,geolearn')
  .split(',').map((s) => s.trim()).filter(Boolean);
// Default indices: 0 cover · 1 outcomes · 2 artifact · 5 notes · 9 source-6B · 11 complete
const SLIDES = (process.env.SLIDES || '0,1,2,5,9,11')
  .split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 0);

const pad = (n) => String(n).padStart(2, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Start clean so stale shots never linger.
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// LESSON=<path> overrides the lesson; otherwise each theme uses its own sample where one exists
// (examples/<theme>-sample.json) and falls back to FALLBACK_LESSON re-skinned to that theme.
const FALLBACK_LESSON = 'examples/imperium-sample.json';
const lessonFor = (theme) => {
  const own = path.join(root, 'examples', `${theme}-sample.json`);
  return process.env.LESSON ? path.resolve(root, process.env.LESSON)
    : fs.existsSync(own) ? own : path.join(root, FALLBACK_LESSON);
};

// CHROMIUM_PATH is an escape hatch for sandboxes that ship a prebuilt Chromium instead of
// Playwright's own download; unset (CI, and a normal `npx playwright install chromium`
// checkout) it launches exactly as before.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
// networkidle is deliberate: it lets web fonts and model-viewer settle so the CI artifact shows
// real type and 3D rather than fallbacks. Offline it simply resolves once the blocked requests
// give up — measured at ~1s, so it is not the reason a local run used to produce nothing.
await page.goto(pathToFileURL(appPath).href, { waitUntil: 'networkidle' });

let written = 0;

for (const theme of THEMES) {
  const lessonPath = lessonFor(theme);
  if (!fs.existsSync(lessonPath)) {
    console.warn(`  ⚠ ${theme}: no lesson at ${path.relative(root, lessonPath)} — skipped`);
    continue;
  }
  const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
  const slideCount = await page.evaluate(({ d, t }) => {
    LESSON = d; LESSON.meta = LESSON.meta || {}; LESSON.meta.theme = t;
    cur = 0; TP_RUNTIME = {}; render();
    return LESSON.slides.length;
  }, { d: lesson, t: theme });
  await page.evaluate((t) => setTheme(t), theme);
  const themeDir = path.join(outDir, theme);
  fs.mkdirSync(themeDir, { recursive: true });

  for (const i of SLIDES) {
    if (i >= slideCount) {
      console.warn(`  ⚠ ${theme}: slide ${i} is out of range (${slideCount} slides) — skipped`);
      continue;
    }
    await page.evaluate((n) => go(n), i);
    await sleep(250);
    const type = await page.evaluate((n) => LESSON.slides[n].type, i);
    const file = path.join(themeDir, `${pad(i)}-${type}.png`);
    await page.screenshot({ path: file, fullPage: true });
    written++;
  }
  console.log(`  ✓ ${theme} — ${path.relative(root, lessonPath)} (${SLIDES.filter((i) => i < slideCount).length} of ${slideCount} slides)`);
}

await browser.close();
console.log(`\nWrote ${written} screenshot(s) to ${path.relative(root, outDir)}/`);
// A screenshot harness that writes nothing must FAIL. Exiting 0 with an empty directory is how
// this went unnoticed for two months — see the header.
if (!written) {
  console.error('✗ no screenshots were written — the harness rendered nothing, which is a failure, not a pass');
  process.exit(1);
}
