import { chromium } from 'playwright';

// Gate: the Tutankhamun CT-scan bundle must render correctly SERVED OVER HTTP
// (it fails on file://). Asserts no bundle error, real region labels (not
// {{ t.label }} placeholders), and zero requests leaving localhost.
const BASE = process.env.BASE || 'http://localhost:8077';
const URL = `${BASE}/interactives/tutankhamun-ct-scan.html`;
const OUT = process.env.OUT || 'screenshots/interactive-tut.png';
const LABELS = ['FULL BODY', 'SKULL', 'LEFT THIGH', 'LEFT FOOT', 'THE VERDICT'];

const allowHost = (u) => {
  try { const h = new URL(u); return (h.protocol !== 'http:' && h.protocol !== 'https:') || h.host === new URL(BASE).host; }
  catch { return true; } // data:, blob:, about: → not external
};

const browser = await chromium.launch();
const page = await browser.newPage();
const external = [];
const errs = [];
page.on('request', (r) => { if (!allowHost(r.url())) external.push(r.url()); });
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

const resp = await page.goto(URL, { waitUntil: 'networkidle' });
const status = resp ? resp.status() : 0;
// in-browser Babel compiles at runtime — wait for React to paint the verdict tab label
await page.waitForFunction(() => /THE VERDICT/i.test(document.body.innerText), { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(500);

const body = await page.evaluate(() => document.body.innerText);
const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };

ok(`HTTP 200 served`, status === 200, `status=${status}`);
ok(`no "[bundle] error" text in body`, !/\[bundle\] error/i.test(body));
ok(`no "{{ t.label }}" placeholders in body`, !/\{\{\s*t\.label\s*\}\}/.test(body) && !/\{\{/.test(body));
for (const L of LABELS) ok(`region tab label present: "${L}"`, body.includes(L));
ok(`zero external network requests`, external.length === 0, external.length ? external.join(', ') : '(all localhost/inline)');

await page.screenshot({ path: OUT, fullPage: false });
await browser.close();

console.log(results.join('\n'));
console.log('\nPage errors: ' + (errs.length ? '\n' + errs.join('\n') : '(none)'));
console.log('Screenshot: ' + OUT);
if (process.exitCode === 1) console.log('\nGATE FAILED — do not merge.');
else console.log('\nGATE PASSED.');
