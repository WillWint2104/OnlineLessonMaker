import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8088';
const URL = `${BASE}/lesson-studio.html`;
const OUT = process.env.OUT || 'screenshots/casefile6-external.png';
const EMBED = 'interactives/tutankhamun-ct-scan.html';

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };

// title + slide count from the embedded lesson data
const info = await page.evaluate(() => {
  const d = JSON.parse(document.querySelector('#lesson-data').textContent);
  return { title: d.meta.title, n: d.slides.length, extIdx: d.slides.findIndex(s => s.type === 'external') };
});
ok('lesson title is "Case File 6 — Investigating the Remains"', info.title === 'Case File 6 — Investigating the Remains', `title="${info.title}"`);
ok('lesson has 11 slides', info.n === 11, `n=${info.n}`);

// navigate to the external (CT investigation) slide
await page.evaluate((i) => { document.querySelectorAll('#nav [data-go]')[i]?.click(); }, info.extIdx);
await page.waitForTimeout(500);

const ext = await page.evaluate((embed) => {
  const slide = document.querySelector('#slide');
  const ifr = slide.querySelector('.ex-img iframe');
  const launch = [...slide.querySelectorAll('[data-launch]')];
  const launchBtn = launch.find(b => (b.dataset.launch || '').includes('tutankhamun-ct-scan'));
  return {
    hasIframe: !!ifr,
    iframeSrc: ifr ? ifr.getAttribute('src') : '',
    iframeIsEmbed: !!ifr && ifr.getAttribute('src').includes(embed),
    title: slide.querySelector('.ex-title')?.textContent?.trim() || '',
    launchLabel: launchBtn ? launchBtn.textContent.trim() : '',
    launchTarget: launchBtn ? launchBtn.dataset.launch : '',
  };
}, EMBED);

ok('external slide title rendered', /Virtual Autopsy/i.test(ext.title), `title="${ext.title}"`);
ok('external slide embeds the interactive inline (iframe)', ext.iframeIsEmbed, `src=${ext.iframeSrc}`);
ok('"Open ↗" fallback button present and points at the interactive', /↗/.test(ext.launchLabel) && ext.launchTarget.includes(EMBED), `label="${ext.launchLabel}" target=${ext.launchTarget}`);

// confirm the embedded interactive actually rendered inside the iframe — only meaningful when
// the iframe is SAME-ORIGIN with the page (i.e. on the live github.io deploy). Locally the
// iframe points at the absolute github.io URL (cross-origin / unreachable from a localhost test),
// so this assertion is skipped there and verified on the live run.
const sameOrigin = (() => { try { return new URL(ext.iframeSrc).origin === new URL(BASE).origin; } catch { return false; } })();
if (sameOrigin) {
  const frameOk = await page.evaluate(() => {
    const ifr = document.querySelector('#slide .ex-img iframe');
    try {
      const doc = ifr.contentDocument; if (!doc) return { reachable: false };
      const t = doc.body ? doc.body.innerText : '';
      return { reachable: true, hasVerdict: /THE VERDICT/i.test(t), hasBundleErr: /\[bundle\] error/i.test(t) };
    } catch (e) { return { reachable: false, err: String(e) }; }
  });
  ok('embedded interactive rendered inside iframe (THE VERDICT, no bundle error)',
     frameOk.reachable && frameOk.hasVerdict && !frameOk.hasBundleErr, JSON.stringify(frameOk));
} else {
  results.push(`• (skipped iframe-content check — iframe is cross-origin to ${BASE}; verified on live deploy)`);
}

await page.screenshot({ path: OUT });
await browser.close();
console.log(results.join('\n'));
console.log('\nPage errors: ' + (errs.length ? '\n' + errs.join('\n') : '(none)'));
console.log('Screenshot: ' + OUT);
console.log(process.exitCode === 1 ? '\nFAILED.' : '\nALL PASSED.');
