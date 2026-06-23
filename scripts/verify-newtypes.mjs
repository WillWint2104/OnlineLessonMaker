import { chromium } from 'playwright';
import { readFileSync } from 'fs';

// Verifies the new typed-answer + outro pack types (sourceAnalysis, guidedResponse, outro)
// in BOTH themes, loading the worked-example lessons via the in-app JSON loader:
//   per-task / per-paragraph reveal gating, session-kept answers across navigation,
//   internal scroll, Focus reading modal (open + Esc-close + focus return), a11y
//   labels + aria-live region, and outro score-tile hiding.
const BASE = process.env.BASE || 'http://localhost:8285';
const URL = `${BASE}/lesson-studio.html`;
const browser = await chromium.launch();
const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };

const examples = {
  imperium: JSON.parse(readFileSync('examples/imperium-questions.json', 'utf8')),
  microhistory: JSON.parse(readFileSync('examples/microhistory-questions.json', 'utf8')),
};

for (const theme of ['imperium', 'microhistory']) {
  const lesson = examples[theme];
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  // load the worked example via the in-app loader path
  await page.evaluate((d) => { LESSON = d; cur = 0; TP_RUNTIME = {}; render(); }, lesson);
  await page.click('#presentBtn'); await page.waitForTimeout(300);

  const idx = (t) => lesson.slides.findIndex((s) => s.type === t && (t !== 'guidedResponse' || s.mode === 'extended'));
  const saIdx = lesson.slides.findIndex((s) => s.type === 'sourceAnalysis');
  const grShortIdx = lesson.slides.findIndex((s) => s.type === 'guidedResponse' && s.mode === 'short');
  const grExtIdx = lesson.slides.findIndex((s) => s.type === 'guidedResponse' && s.mode === 'extended');
  const outroIdx = lesson.slides.findIndex((s) => s.type === 'outro');

  // sourceAnalysis renders + a11y baseline
  await page.evaluate((i) => go(i), saIdx); await page.waitForTimeout(300);
  const sa = await page.evaluate(() => ({
    type: document.querySelector('.tp-slide')?.dataset.tpType,
    tasks: document.querySelectorAll('.tp-task').length,
    labels: [...document.querySelectorAll('textarea[data-tp-field]')].every((t) => !!document.querySelector(`label[for="${t.id}"]`)),
    live: !!document.querySelector('[aria-live="polite"][data-tp-live]'),
    sticky: getComputedStyle(document.querySelector('.tp-srccol')).position === 'sticky',
    scroll: getComputedStyle(document.querySelector('.tp-main')).overflowY,
  }));
  ok(`${theme}/sourceAnalysis renders (${sa.tasks} tasks)`, sa.type === 'sourceAnalysis' && sa.tasks >= 2);
  ok(`${theme}/sourceAnalysis: every textarea has a <label>`, sa.labels);
  ok(`${theme}/sourceAnalysis: aria-live region present`, sa.live);
  ok(`${theme}/sourceAnalysis: source column sticky`, sa.sticky);
  ok(`${theme}/sourceAnalysis: canvas-internal scroll`, sa.scroll === 'auto' || sa.scroll === 'scroll');

  // reveal gating: blocked before attempt, works after
  const blocked = await page.evaluate(() => { const b = document.querySelector('[data-tp-reveal]'); b.click(); return !document.querySelector('[data-tp-model]').classList.contains('tp-shown'); });
  const afterType = await page.evaluate(() => { const ta = document.querySelector('textarea[data-tp-field]'); ta.value = 'attempt text'; ta.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-tp-reveal]').click(); return document.querySelector('[data-tp-model]').classList.contains('tp-shown'); });
  ok(`${theme}/sourceAnalysis: model gated until attempt`, blocked && afterType);

  // session-kept: navigate away and back, answer + revealed state persist
  await page.evaluate((i) => go(i), grShortIdx); await page.waitForTimeout(200);
  await page.evaluate((i) => go(i), saIdx); await page.waitForTimeout(200);
  const persist = await page.evaluate(() => ({ val: document.querySelector('textarea[data-tp-field]').value, shown: document.querySelector('[data-tp-model]').classList.contains('tp-shown') }));
  ok(`${theme}/sourceAnalysis: answer + reveal survive navigation (session-kept)`, persist.val === 'attempt text' && persist.shown);

  // guidedResponse short: submit gate + reveal + readonly
  await page.evaluate((i) => go(i), grShortIdx); await page.waitForTimeout(250);
  const grs = await page.evaluate(() => { const ta = document.querySelector('textarea[data-tp-field]'); ta.value = 'answer'; ta.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-tp-reveal]').click(); return { shown: document.querySelector('[data-tp-model]').classList.contains('tp-shown'), readonly: ta.hasAttribute('readonly'), crit: document.querySelectorAll('.tp-crit li').length }; });
  ok(`${theme}/guidedResponse short: submit reveals model + criteria + locks box`, grs.shown && grs.readonly && grs.crit >= 1);

  // guidedResponse extended: per-paragraph reveal + Focus modal (open, Esc, focus return)
  await page.evaluate((i) => go(i), grExtIdx); await page.waitForTimeout(250);
  const paras = await page.evaluate(() => document.querySelectorAll('.tp-para').length);
  ok(`${theme}/guidedResponse extended: paragraph boxes render (${paras})`, paras >= 2);
  const modal = await page.evaluate(() => {
    const trigger = document.querySelector('[data-tp-focus-open]'); trigger.focus(); trigger.click();
    const ov = document.querySelector('[data-tp-overlay]');
    const opened = !ov.hidden;
    const dialog = ov.getAttribute('role') === 'dialog' && ov.getAttribute('aria-modal') === 'true';
    const focusInside = ov.contains(document.activeElement);
    ov.querySelector('[data-tp-focus-close]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const closed = ov.hidden;
    const focusBack = document.activeElement === trigger;
    return { opened, dialog, focusInside, closed, focusBack };
  });
  ok(`${theme}/guidedResponse extended: Focus modal role=dialog+aria-modal`, modal.dialog);
  ok(`${theme}/guidedResponse extended: Focus modal opens, focus moves in`, modal.opened && modal.focusInside);
  ok(`${theme}/guidedResponse extended: Esc closes + focus returns to trigger`, modal.closed && modal.focusBack);

  // outro: score-tile hiding (imperium example has 3 tiles, microhistory has 2)
  await page.evaluate((i) => go(i), outroIdx); await page.waitForTimeout(250);
  const tiles = await page.evaluate(() => document.querySelectorAll('.tp-stat').length);
  const expected = (lesson.slides[outroIdx].stats || []).length;
  ok(`${theme}/outro renders ${expected} stat tiles (hides absent score gracefully)`, tiles === expected);

  ok(`${theme}: no page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log(process.exitCode === 1 ? '\nFAILED.' : '\nALL PASSED.');
