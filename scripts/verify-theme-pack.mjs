import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';

// Verifies the imperium + microhistory themed slide pack: loads each worked-example lesson
// through the in-app "⌗ JSON → Load JSON" path, then asserts every slide type renders, fonts
// apply, image placeholders show, knowledgeCheck gates Continue, no external requests are made,
// and the existing themes still render through the original engine (not the pack).
const BASE = process.env.BASE || 'http://localhost:8275';
const URL = `${BASE}/lesson-studio.html`;
const OUT = 'screenshots/theme-pack';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };
const isExternal = (u) => !u.startsWith(BASE) && !/^(data|blob|about):/i.test(u) && /^https?:\/\//i.test(u);

const TYPES = ['title', 'outcomes', 'text', 'imageText', 'infographic', 'video', 'knowledgeCheck'];
const MARK = { title: '.tp-htitle', outcomes: '.tp-objs,.tp-objl', text: '.tp-doc .tp-lead', imageText: '.tp-llcard,.tp-itgrid', infographic: '.tp-ig-map,.tp-mapcard', video: '.tp-vframe,.tp-player', knowledgeCheck: '[data-tp-kc]' };

async function runTheme(theme, file, fontNeedle) {
  const json = readFileSync(file, 'utf8');
  const page = await browser.newPage({ viewport: { width: 1440, height: 840 } });
  const external = [], errs = [];
  page.on('request', (r) => { if (isExternal(r.url())) external.push(r.url()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });

  // load via the real JSON panel path (#jsonLoad handler), filling the textarea it reads
  await page.evaluate((j) => { const m = document.querySelector('#modal'); if (m) m.hidden = false; document.querySelector('#jsonArea').value = j; document.querySelector('#jsonLoad').click(); }, json);
  await page.waitForTimeout(400);
  const err = await page.evaluate(() => document.querySelector('#jsonErr')?.textContent || '');
  ok(`${theme}: JSON loaded without error`, !err, err);

  const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  ok(`${theme}: theme applied`, themeAttr === theme, `data-theme=${themeAttr}`);
  const n = await page.evaluate(() => LESSON.slides.length);
  ok(`${theme}: 7 slides loaded`, n === 7, `n=${n}`);

  await page.click('#presentBtn');
  await page.waitForTimeout(300);

  for (let i = 0; i < TYPES.length; i++) {
    await page.evaluate((idx) => go(idx), i);
    await page.waitForTimeout(350);
    const r = await page.evaluate((sel) => {
      const root = document.querySelector('.tp-slide');
      const hit = sel.split(',').some((s) => document.querySelector(s.trim()));
      const ph = !!document.querySelector('.tp-ph-tag, .tp-phmark, .tp-map-ph, .tp-vph, .tp-left-ph');
      return { hasRoot: !!root, hit, ph };
    }, MARK[TYPES[i]]);
    ok(`${theme}/${TYPES[i]}: renders via pack`, r.hasRoot && r.hit);
    // image-slot types per theme (microhistory outcomes is text-only — no image slot by design)
    const phTypes = theme === 'imperium'
      ? ['title', 'outcomes', 'imageText', 'infographic', 'video', 'knowledgeCheck']
      : ['title', 'imageText', 'infographic', 'video', 'knowledgeCheck'];
    if (phTypes.includes(TYPES[i]))
      ok(`${theme}/${TYPES[i]}: image placeholder shown`, r.ph);
    await page.screenshot({ path: `${OUT}/${theme}-${TYPES[i]}.png` });
  }

  // font applied (display font on a heading)
  const font = await page.evaluate(() => {
    const el = document.querySelector('.tp-htitle,.tp-dtitle,.tp-vtitle,.tp-vtitle2,.tp-qh1,.tp-kc-title');
    return el ? getComputedStyle(el).fontFamily : '';
  });
  ok(`${theme}: display font ${fontNeedle} applied`, font.includes(fontNeedle), `font=${font}`);

  // knowledgeCheck gating (slide index 6)
  await page.evaluate(() => go(6));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => document.querySelector('[data-tp-continue]').disabled);
  await page.evaluate(() => { const c = [...document.querySelectorAll('[data-tp-opt]')].find((o) => o.dataset.tpCorrect === '1'); c && c.click(); });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => document.querySelector('[data-tp-continue]').disabled);
  const fbShown = await page.evaluate(() => !!document.querySelector('.tp-feedback:not([hidden])'));
  ok(`${theme}/knowledgeCheck: Continue gated until correct`, before === true && after === false, `${before}->${after}`);
  ok(`${theme}/knowledgeCheck: feedback revealed on answer`, fbShown);
  // wrong answer does NOT enable / keeps retry
  await page.evaluate(() => go(6)); await page.waitForTimeout(250);
  await page.evaluate(() => { const w = [...document.querySelectorAll('[data-tp-opt]')].find((o) => o.dataset.tpCorrect !== '1'); w && w.click(); });
  await page.waitForTimeout(200);
  const afterWrong = await page.evaluate(() => document.querySelector('[data-tp-continue]').disabled);
  ok(`${theme}/knowledgeCheck: wrong answer keeps Continue disabled`, afterWrong === true);

  ok(`${theme}: zero external requests`, external.length === 0, external.slice(0, 3).join(', '));
  ok(`${theme}: no page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

await runTheme('imperium', 'examples/imperium-sample.json', 'Playfair Display');
await runTheme('microhistory', 'examples/microhistory-sample.json', 'Courier Prime');

// regression: an existing theme still renders through the ORIGINAL engine (not the pack)
{
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { LESSON = { meta: { title: 'X', theme: 'egypt' }, slides: [{ type: 'cover', tag: 'Section', title: 'Old Kingdom', sub: 'Intro' }] }; cur = 0; render(); });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ pack: !!document.querySelector('.tp-slide'), cover: !!document.querySelector('#slide .cover') }));
  ok('existing theme (egypt) unaffected — renders via engine, not the pack', !r.pack && r.cover, JSON.stringify(r));
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log('\nScreenshots in ' + OUT);
console.log(process.exitCode === 1 ? '\nFAILED.' : '\nALL PASSED.');
