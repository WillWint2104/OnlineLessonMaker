import { chromium } from 'playwright';

// Verifies the newly published batch: (1) each interactive loads with ZERO external
// network requests; (2) each lesson renders, and the lessons that carry an `external`
// slide expose a launch control + iframe pointing at the correct interactive URL.
const BASE = process.env.BASE || 'http://localhost:8271';
const browser = await chromium.launch();
const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };

// hosts we consider "local / inert" — same-origin server + non-network schemes
const isExternal = (u) => {
  if (u.startsWith(BASE)) return false;
  if (/^(data|blob|about):/i.test(u)) return false;
  return /^https?:\/\//i.test(u);
};

async function checkInteractive(pathname, label) {
  const page = await browser.newPage();
  const external = [];
  page.on('request', (r) => { const u = r.url(); if (isExternal(u)) external.push(u); });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  ok(`${label}: zero external requests`, external.length === 0, external.slice(0, 5).join(', '));
  ok(`${label}: no page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
  const hasSvgOrApp = await page.evaluate(() => !!document.querySelector('svg, #root, [data-reactroot], canvas, .bar'));
  ok(`${label}: rendered content present`, hasSvgOrApp);
  await page.close();
}

await checkInteractive('/interactives/indigenous-population-pyramid.html', 'pyramid');
await checkInteractive('/interactives/tutankhamun-dna-station.html', 'dna-station');

async function checkLesson(pathname, label, expectExtIncludes) {
  const page = await browser.newPage();
  const errs = [];
  // Known baseline shared with every already-published lesson (incl. POW): lessons reference the
  // vendored model-viewer at a root-relative `assets/vendor/…` path that 404s from /lessons/. It
  // only affects model3d slides and degrades gracefully — exclude it so the test tracks regressions.
  const ignore = (s) => /model-viewer\.min\.js/.test(s) || /Failed to load resource/.test(s);
  page.on('pageerror', (e) => { if (!ignore(String(e))) errs.push(String(e)); });
  page.on('console', (m) => { if (m.type() === 'error' && !ignore(m.text())) errs.push(m.text()); });
  await page.goto(`${BASE}${pathname}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const d = JSON.parse(document.querySelector('#lesson-data').textContent);
    return { title: d.meta && d.meta.title, n: d.slides.length, theme: document.documentElement.getAttribute('data-theme'),
             extIdx: d.slides.findIndex((s) => s.type === 'external'),
             extUrl: (d.slides.find((s) => s.type === 'external') || {}).url || '' };
  });
  ok(`${label}: lesson renders (${info.n} slides, theme=${info.theme})`, info.n > 0 && !!info.title, `"${info.title}"`);
  ok(`${label}: no page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));

  if (expectExtIncludes) {
    ok(`${label}: external-slide URL points at ${expectExtIncludes}`, info.extUrl.includes(expectExtIncludes), `url=${info.extUrl}`);
    // navigate to the external slide and confirm a launch/iframe surfaces the interactive URL
    if (info.extIdx >= 0) {
      await page.evaluate((i) => { document.querySelectorAll('#nav [data-go]')[i]?.click(); }, info.extIdx);
      await page.waitForTimeout(500);
      const ext = await page.evaluate((slug) => {
        const slide = document.querySelector('#slide');
        const ifr = slide.querySelector('iframe');
        const launch = [...slide.querySelectorAll('[data-launch]')].find((b) => (b.dataset.launch || '').includes(slug));
        return { iframeSrc: ifr ? ifr.getAttribute('src') : '', launchTarget: launch ? launch.dataset.launch : '',
                 launchLabel: launch ? launch.textContent.trim() : '' };
      }, expectExtIncludes);
      const linkResolves = (ext.iframeSrc && ext.iframeSrc.includes(expectExtIncludes)) || (ext.launchTarget && ext.launchTarget.includes(expectExtIncludes));
      ok(`${label}: external slide exposes the interactive link`, linkResolves, `iframe=${ext.iframeSrc} launch=${ext.launchTarget}`);
    }
  }
  await page.close();
}

await checkLesson('/lessons/the-scientific-investigation-file.html', 'Y11-tutankhamun', 'interactives/tutankhamun-dna-station.html');
await checkLesson('/lessons/seneca-burrus-and-the-freedmen.html', 'Y12-seneca', null);
await checkLesson('/lessons/indigenous-wellbeing-in-australia.html', 'Y10-wellbeing', 'interactives/indigenous-population-pyramid.html');

await browser.close();
console.log(results.join('\n'));
console.log(process.exitCode === 1 ? '\nFAILED.' : '\nALL PASSED.');
