import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.BASE || 'http://localhost:8267';
const URL = `${BASE}/lesson-studio.html`;
const OUTDIR = 'screenshots/infographic';
mkdirSync(OUTDIR, { recursive: true });

// Wellbeing "homelessness" dataset — three infographic slides exercising all variants.
const SLIDES = [
  { type: 'cover', tag: 'Wellbeing', title: 'Youth homelessness', sub: 'What does the data tell us about young people without a safe home?' },
  { type: 'infographic', heading: 'The scale of it', eyebrow: 'By the numbers', variant: 'stat',
    intro: 'A snapshot of how many young people are affected — and the toll it takes.',
    source: 'Source: AIHW, Specialist Homelessness Services 2022–23 (illustrative).',
    figures: [
      { label: 'Young people seeking help each year', value: '40,000', color: 'primary', icon: 'people' },
      { label: 'Are aged 15–24', value: '24', unit: '%', color: 'secondary', icon: 'home' },
      { label: 'Change in demand since 2019', value: '', pct: 14, delta: '+14%', color: 'tertiary', icon: 'alert' } ] },
  { type: 'infographic', heading: 'Why young people leave home', eyebrow: 'Causes', variant: 'bar',
    intro: 'The main reasons young people first present as homeless.',
    source: 'Source: AIHW SHS client survey (illustrative).',
    figures: [
      { label: 'Family & domestic violence', pct: 45, color: 'primary' },
      { label: 'Relationship / family breakdown', pct: 34, color: 'secondary' },
      { label: 'Housing affordability stress', pct: 14, color: 'tertiary' },
      { label: 'Mental health', pct: 13, color: 'primary' } ] },
  { type: 'infographic', heading: 'Where they stay', eyebrow: 'Composition', variant: 'donut',
    intro: 'A safe bed is rare — most young people make do with unstable arrangements.',
    source: 'Source: AIHW SHS accommodation data (illustrative).',
    centerLabel: '100%|of those surveyed',
    figures: [ { label: 'placeholder', parts: [
      { label: 'Overcrowded dwelling', pct: 44, color: 'primary' },
      { label: 'Supported accommodation', pct: 18, color: 'secondary' },
      { label: 'Couch-surfing', pct: 15, color: 'tertiary' },
      { label: 'Sleeping rough', pct: 7, color: 'primary' },
      { label: 'Other / unknown', pct: 16, color: 'secondary' } ] } ] },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);

const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };

// inject the dataset and set the Terra Anima (wellbeing) theme
await page.evaluate((slides) => {
  LESSON.slides = JSON.parse(JSON.stringify(slides));
  LESSON.meta = LESSON.meta || {}; LESSON.meta.title = 'Youth homelessness';
  LESSON.meta.theme = 'wellbeing'; setTheme('wellbeing');
  cur = 0; renderNav(); renderSlide();
}, SLIDES);
await page.waitForTimeout(200);

// confirm theme applied
const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
ok('wellbeing (Terra Anima) theme applied', theme === 'wellbeing', `data-theme=${theme}`);

// enter Present mode
await page.click('#presentBtn');
await page.waitForTimeout(300);
ok('present mode active', await page.evaluate(() => document.body.classList.contains('present')));

async function goSlide(i) { await page.evaluate((n) => go(n), i); await page.waitForTimeout(900); }

// --- STAT (slide 1) ---
await goSlide(1);
const stat = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.ig-stat')];
  return { n: cards.length, nums: cards.map(c => c.querySelector('.ig-num')?.innerText.replace(/\s+/g, ' ').trim()),
           delta: !!document.querySelector('.ig-delta'), icon: !!document.querySelector('.ig-icon svg'),
           focusable: cards.every(c => c.getAttribute('tabindex') === '0') };
});
ok('stat: 3 cards rendered', stat.n === 3, JSON.stringify(stat.nums));
ok('stat: numbers present as text', stat.nums.some(t => /40,000/.test(t)));
ok('stat: delta + icon drawn', stat.delta && stat.icon);
ok('stat: cards keyboard-focusable', stat.focusable);
await page.screenshot({ path: `${OUTDIR}/stat.png` });

// tooltip via keyboard focus (not pointer)
await page.evaluate(() => document.querySelector('.ig-stat')?.focus());
await page.waitForTimeout(400);
const statTip = await page.evaluate(() => { const t = document.querySelector('.ig-tip.show'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : ''; });
ok('stat: focus reveals tooltip', /40,000/.test(statTip), `tip="${statTip}"`);
await page.screenshot({ path: `${OUTDIR}/stat-tooltip.png` });

// --- BAR (slide 2) ---
await goSlide(2);
const bar = await page.evaluate(() => {
  const bars = [...document.querySelectorAll('.ig-bar')];
  return { n: bars.length, vals: bars.map(b => b.querySelector('.ig-bar-val')?.textContent.trim()),
           fillWidths: bars.map(b => getComputedStyle(b.querySelector('.ig-fill')).width),
           trackWidths: bars.map(b => getComputedStyle(b.querySelector('.ig-track')).width) };
});
ok('bar: 4 bars rendered', bar.n === 4, JSON.stringify(bar.vals));
ok('bar: percentages shown as text', bar.vals.join(',').includes('45%') && bar.vals.join(',').includes('13%'));
const fillsScaled = bar.fillWidths.every((w, i) => parseFloat(w) > 0 && parseFloat(w) <= parseFloat(bar.trackWidths[i]) + 1);
ok('bar: fills are non-zero and within track', fillsScaled, JSON.stringify(bar.fillWidths));
await page.screenshot({ path: `${OUTDIR}/bar.png` });

// hover a bar → tooltip
await page.hover('.ig-bar');
await page.waitForTimeout(400);
const barTip = await page.evaluate(() => { const t = document.querySelector('.ig-tip.show'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : ''; });
ok('bar: hover reveals tooltip', /45%/.test(barTip), `tip="${barTip}"`);
const dimmed = await page.evaluate(() => document.querySelector('.ig-bars').classList.contains('has-active'));
ok('bar: active highlight dims siblings', dimmed);
await page.screenshot({ path: `${OUTDIR}/bar-tooltip.png` });

// --- DONUT (slide 3) ---
await goSlide(3);
const donut = await page.evaluate(() => {
  const segs = [...document.querySelectorAll('.ig-seg')];
  return { segs: segs.length, legend: document.querySelectorAll('.ig-legend li[data-seg]').length,
           center: document.querySelector('.ig-center b')?.textContent || '',
           svgAria: document.querySelector('.ig-ring')?.getAttribute('aria-label') || '',
           legPct: [...document.querySelectorAll('.ig-leg-pct')].map(e => e.textContent.trim()) };
});
ok('donut: 5 segments drawn', donut.segs === 5);
ok('donut: legend has 5 items with %', donut.legend === 5 && donut.legPct.includes('44%'));
ok('donut: centre label present', donut.center === '100%', `center="${donut.center}"`);
ok('donut: SVG has aria-label', /Overcrowded/.test(donut.svgAria));
await page.screenshot({ path: `${OUTDIR}/donut.png` });

// focus a legend item → tooltip + pair highlight
await page.evaluate(() => document.querySelector('.ig-legend li[data-seg]')?.focus());
await page.waitForTimeout(400);
const donutTip = await page.evaluate(() => { const t = document.querySelector('.ig-tip.show'); return t ? t.innerText.replace(/\s+/g, ' ').trim() : ''; });
ok('donut: focus reveals tooltip', /44%/.test(donutTip), `tip="${donutTip}"`);
await page.screenshot({ path: `${OUTDIR}/donut-tooltip.png` });

// --- reduced motion: load animation skipped, reveal still works ---
const rmPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await rmPage.emulateMedia({ reducedMotion: 'reduce' });
await rmPage.goto(URL, { waitUntil: 'networkidle' });
await rmPage.evaluate((slides) => {
  LESSON.slides = JSON.parse(JSON.stringify(slides)); LESSON.meta.theme = 'wellbeing'; setTheme('wellbeing');
  cur = 0; renderNav(); renderSlide();
}, SLIDES);
await rmPage.click('#presentBtn');
await rmPage.evaluate(() => go(2));
await rmPage.waitForTimeout(300);
const rmAnim = await rmPage.evaluate(() => getComputedStyle(document.querySelector('.ig-fill')).animationName);
ok('reduced-motion: load animation suppressed', rmAnim === 'none', `animationName=${rmAnim}`);
await rmPage.hover('.ig-bar');
await rmPage.waitForTimeout(300);
const rmTip = await rmPage.evaluate(() => !!document.querySelector('.ig-tip.show'));
ok('reduced-motion: hover reveal still works', rmTip);
await rmPage.close();

// --- no external hosts introduced ---
const hosts = await page.evaluate(() => {
  const urls = [];
  document.querySelectorAll('.ig-slide [src],.ig-slide [href]').forEach(e => { const u = e.getAttribute('src') || e.getAttribute('href'); if (u) urls.push(u); });
  return urls.filter(u => /^https?:\/\//i.test(u));
});
ok('infographic introduces no external hosts', hosts.length === 0, JSON.stringify(hosts));

await browser.close();
console.log(results.join('\n'));
console.log('\nPage errors: ' + (errs.length ? '\n' + errs.join('\n') : '(none)'));
console.log('Screenshots in ' + OUTDIR);
console.log(process.exitCode === 1 ? '\nFAILED.' : '\nALL PASSED.');
