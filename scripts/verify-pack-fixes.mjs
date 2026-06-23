import { chromium } from 'playwright';
import { readFileSync } from 'fs';

// Verifies the three pack bug-fixes by loading the worked-example lessons (both themes)
// exactly as the in-app ⌗ JSON panel would:
//   1. Editable images — every slide that supplies an image path renders a loaded <img>;
//      slides with no image still show the gradient placeholder.
//   2. Title layout — title slides render the title hero (no video play button), both themes.
//   3. Single-slide quiz — guidedResponse mode:"quiz" reveals each answer after an attempt.
const BASE = process.env.BASE || 'http://localhost:8290';
const URL = `${BASE}/lesson-studio.html`;
const browser = await chromium.launch();
const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };

// mirrors the engine's tpSrc(): accept a bare path string OR an object carrying src/image
const tpSrc = (v) => (v && typeof v === 'object') ? String(v.src || v.image || '').trim() : String(v || '').trim();
// the image field for each pack type (null = type has no image slot)
const imgField = (s) => {
  switch (s.type) {
    case 'title': case 'outcomes': case 'video': return tpSrc(s.image);
    case 'imageText': return tpSrc(s.image);
    case 'infographic': return tpSrc(s.map && s.map.image);
    case 'knowledgeCheck': return tpSrc(s.artifact && s.artifact.image);
    case 'text': return tpSrc(s.sidebar && s.sidebar.image);
    case 'sourceAnalysis': return tpSrc(s.source && s.source.image);
    default: return '';
  }
};

const files = ['imperium-sample', 'microhistory-sample', 'imperium-questions', 'microhistory-questions'];
for (const name of files) {
  const lesson = JSON.parse(readFileSync(`examples/${name}.json`, 'utf8'));
  const theme = lesson.meta.theme;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/sample-image/.test(m.text())) errs.push(m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate((d) => { LESSON = d; cur = 0; TP_RUNTIME = {}; render(); }, lesson);

  let imgWithPath = 0, imgPlaceholders = 0, imgBad = 0;
  for (let i = 0; i < lesson.slides.length; i++) {
    const s = lesson.slides[i];
    const expected = imgField(s);
    await page.evaluate((idx) => go(idx), i);
    await page.waitForTimeout(120);
    const dom = await page.evaluate(() => {
      const im = document.querySelector('.tp-slide img.tp-img-real');
      const ph = !!document.querySelector('.tp-slide .tp-ph-tag, .tp-slide .tp-phmark, .tp-slide .tp-saph, .tp-slide .tp-map-ph, .tp-slide .tp-left-ph');
      return { src: im ? im.getAttribute('src') : null, loaded: im ? (im.complete && im.naturalWidth > 0) : false, ph };
    });
    if (expected) {
      if (dom.src === expected && dom.loaded) imgWithPath++;
      else { imgBad++; results.push(`✗ ${name} slide ${i} (${s.type}): supplied image not rendered (want ${expected}, got ${dom.src} loaded=${dom.loaded})`); process.exitCode = 1; }
    } else if (s.type !== 'guidedResponse' && s.type !== 'outro' && (s.type === 'title' || s.type === 'imageText' || s.type === 'video' || s.type === 'infographic' || s.type === 'knowledgeCheck' || s.type === 'text' || s.type === 'sourceAnalysis')) {
      if (dom.ph && !dom.src) imgPlaceholders++;
    }
  }
  ok(`${name}: supplied images render + load (${imgWithPath} slots)`, imgWithPath >= 1 && imgBad === 0);
  ok(`${name}: empty image slots fall back to placeholder (${imgPlaceholders})`, imgPlaceholders >= 1);

  // title layout (not video)
  const ti = lesson.slides.findIndex((s) => s.type === 'title');
  await page.evaluate((i) => go(i), ti); await page.waitForTimeout(150);
  const title = await page.evaluate(() => ({ type: document.querySelector('.tp-slide')?.dataset.tpType, play: !!document.querySelector('.tp-playover, .tp-vplay, .tp-playbtn'), hero: !!document.querySelector('.tp-htitle') }));
  ok(`${name}: title renders title hero, no video play button`, title.type === 'title' && title.hero && !title.play);

  // quiz (only in the -questions examples)
  const qi = lesson.slides.findIndex((s) => s.type === 'guidedResponse' && s.mode === 'quiz');
  if (qi >= 0) {
    await page.evaluate((i) => go(i), qi); await page.waitForTimeout(150);
    const quiz = await page.evaluate(() => {
      const n = document.querySelectorAll('.tp-quizitem').length;
      const btn = document.querySelector('.tp-quizitem [data-tp-reveal]');
      btn.click();
      const blocked = !document.querySelector('.tp-quizitem [data-tp-model]').classList.contains('tp-shown');
      const ta = document.querySelector('.tp-quizitem textarea[data-tp-field]'); ta.value = 'my answer'; ta.dispatchEvent(new Event('input', { bubbles: true }));
      btn.click();
      return { n, blocked, shown: document.querySelector('.tp-quizitem [data-tp-model]').classList.contains('tp-shown'), exp: btn.getAttribute('aria-expanded'), live: !!document.querySelector('[data-tp-live]') };
    });
    ok(`${name}: quiz — ${quiz.n} questions, answer revealed only after attempt, on one slide`, quiz.n >= 2 && quiz.blocked && quiz.shown);
    ok(`${name}: quiz — accessible (aria-expanded + live region)`, quiz.exp === 'true' && quiz.live);
  }

  ok(`${name}: no page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

await browser.close();
console.log(results.join('\n'));
console.log(process.exitCode === 1 ? '\nFAILED.' : '\nALL PASSED.');
