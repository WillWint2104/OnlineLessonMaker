import { chromium } from 'playwright';

// Verify a standalone exported lesson page: cover title, slide count, and the
// external slide embedding the CT interactive inline with an "Open ↗" fallback.
// URL is passed via env (so it works for both a local server and the live deploy).
const URL = process.env.URL || 'http://localhost:8090/lessons/case-file-6-investigating-the-remains.html';
const OUT = process.env.OUT || 'screenshots/case6-lesson.png';
const EMBED = 'interactives/tutankhamun-ct-scan.html';

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const resp = await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };

ok('HTTP 200', (resp ? resp.status() : 0) === 200, `status=${resp ? resp.status() : 0}`);

const info = await page.evaluate(() => {
  const d = JSON.parse(document.querySelector('#lesson-data').textContent);
  return { title: d.meta.title, n: d.slides.length, extIdx: d.slides.findIndex(s => s.type === 'external') };
});
ok('cover/lesson reads "Investigating the Remains"', /Investigating the Remains/i.test(info.title), `title="${info.title}"`);
ok('lesson has 11 slides', info.n === 11, `n=${info.n}`);

// cover slide visible text contains the title phrase
const coverText = await page.evaluate(() => document.querySelector('#slide')?.innerText || '');
ok('cover slide renders the title text', /Investigating the Remains/i.test(coverText));

// navigate to external (CT investigation) slide
await page.evaluate((i) => { document.querySelectorAll('#nav [data-go]')[i]?.click(); }, info.extIdx);
await page.waitForTimeout(700);

const ext = await page.evaluate((embed) => {
  const slide = document.querySelector('#slide');
  const ifr = slide.querySelector('.ex-img iframe');
  const launch = [...slide.querySelectorAll('[data-launch]')].find(b => (b.dataset.launch || '').includes('tutankhamun-ct-scan'));
  return {
    iframeSrc: ifr ? ifr.getAttribute('src') : '',
    isEmbed: !!ifr && ifr.getAttribute('src').includes(embed),
    launchLabel: launch ? launch.textContent.trim() : '',
    launchTarget: launch ? launch.dataset.launch : '',
  };
}, EMBED);
ok('CT slide embeds the interactive inline (iframe)', ext.isEmbed, `src=${ext.iframeSrc}`);
ok('"Open ↗" fallback present, points at the interactive', /↗/.test(ext.launchLabel) && ext.launchTarget.includes(EMBED), `label="${ext.launchLabel}"`);

// same-origin iframe content (only on the live github.io deploy)
const same = (() => { try { return new URL(ext.iframeSrc).origin === new URL(URL).origin; } catch { return false; } })();
if (same) {
  const f = await page.evaluate(() => {
    const ifr = document.querySelector('#slide .ex-img iframe');
    try { const t = ifr.contentDocument?.body?.innerText || ''; return { ok: /THE VERDICT/i.test(t) && !/\[bundle\] error/i.test(t) }; }
    catch (e) { return { ok: false, err: String(e) }; }
  });
  ok('embedded interactive rendered inside iframe (THE VERDICT)', f.ok, JSON.stringify(f));
} else {
  results.push(`• (iframe-content check skipped — cross-origin to page; checked on live same-origin run)`);
}

await page.screenshot({ path: OUT });
await browser.close();
console.log(results.join('\n'));
console.log('\nScreenshot: ' + OUT);
console.log(process.exitCode === 1 ? '\nFAILED.' : '\nALL PASSED.');
