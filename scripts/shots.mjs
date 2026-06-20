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

const THEMES = (process.env.THEMES || 'neutral,egypt,rome,wellbeing,ww1')
  .split(',').map((s) => s.trim()).filter(Boolean);
// Default indices: 0 cover · 1 outcomes · 2 artifact · 5 notes · 9 source-6B · 11 complete
const SLIDES = (process.env.SLIDES || '0,1,2,5,9,11')
  .split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 0);

const pad = (n) => String(n).padStart(2, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Start clean so stale shots never linger.
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
await page.goto(pathToFileURL(appPath).href, { waitUntil: 'networkidle' });

const slideCount = await page.evaluate(() => LESSON.slides.length);
let written = 0;

for (const theme of THEMES) {
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
  console.log(`  ✓ ${theme} (${SLIDES.filter((i) => i < slideCount).length} slides)`);
}

await browser.close();
console.log(`\nWrote ${written} screenshot(s) to ${path.relative(root, outDir)}/`);
