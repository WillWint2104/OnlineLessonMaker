#!/usr/bin/env node
/* THE AUTHORING WORKFLOW, PHOTOGRAPHED — the editor as an author actually meets it.
   node scripts/shots-mx-authoring.mjs
   Boots a blank mathematics document, then drives the real palette, outline and fields, capturing each
   step. Same path as scripts/verify-mx-authoring.mjs asserts; this is what it looks like. */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'docs/atlas/authoring'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml' };
const APP = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');
const BLANK = APP.replace(/(<script id="lesson-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1\n${JSON.stringify({ meta:{ title:'Quadratic relationships', theme:'mathematics' }, slides:[] }, null, 2)}\n$2`);
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/authoring.html') { r.writeHead(200,{'Content-Type':'text/html'}); return r.end(BLANK); }
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'}); r.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(`${origin}/authoring.html`, { waitUntil: 'load' });
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
await p.waitForTimeout(500);
/* every capture states the mode it was taken in, read off the page — a demonstration image whose mode is
   guessed from the picture is how "Study looks selected while the inspector is open" becomes a defect
   report about a screenshot rather than about the product */
const shot = async (n, label) => { await p.waitForTimeout(400);
  const m = await p.evaluate(() => ({ mode, on: ([].slice.call(document.querySelectorAll('#modeSeg button'))
    .find((b) => b.classList.contains('on')) || {}).dataset?.mode,
    inspector: (document.querySelector('#inspector') || {}).innerHTML ? 'open' : 'closed' }));
  await p.screenshot({ path: path.join(OUT, `AUTHOR-${n}.png`) });
  console.log(`  ${n.padEnd(11)} [mode=${m.mode} · segment=${m.on} · inspector ${m.inspector}]  ${label}`); };
console.log('the authoring workflow:');
await shot('1-empty', 'an empty mathematics lesson, Edit mode — the palette offers the page');
await p.click('#palette [data-ptype="workedExamples"]');
await shot('2-created', 'one click: a real workedExamples page, seeded and already painting');
const set = async (zone, label, value) => {
  await p.evaluate((z) => { selZone = z; renderSlide(); }, zone); await p.waitForTimeout(200);
  await p.evaluate(({ label, value }) => { const ins = document.querySelector('#inspector');
    const l = [].slice.call(ins.querySelectorAll('label')).find((x) => x.textContent.indexOf(label) === 0);
    const el = l && l.nextElementSibling; if (el) { el.value = value; el.dispatchEvent(new Event('input', { bubbles:true })); } }, { label, value });
  await p.waitForTimeout(250); };
await set('mx.g.0', 'Tab title', 'Substitution');
await set('mx.g.0', 'Lede', 'Three values of _x_, chosen because each one goes wrong in a different way.');
await shot('3-group', 'editing the group — the tab title lands in the page as you type');
await set('mx.e.0.0', 'Example title', 'A negative value');
await set('mx.e.0.0', 'Question', 'Use the rule _y_ = _x_^2 to find _y_ when _x_ = −4.');
await set('mx.e.0.0', 'Answer', '_y_ = 16, so (−4, 16) lies on the curve.');
await shot('4-example', 'the question and the answer');
await set('mx.s.0.0.0', 'What this step does', 'Substitute the given value. Keep the brackets — the whole of −4 is squared.');
await set('mx.s.0.0.0', 'Mathematics', '_y_ = (−4)^2');
await p.evaluate(() => { const bn = document.querySelector('[data-mxadd="s.0.0"]'); if (bn) bn.click(); });
await p.waitForTimeout(300);
await set('mx.s.0.0.1', 'What this step does', 'Evaluate. A negative multiplied by a negative gives a positive.');
await set('mx.s.0.0.1', 'Mathematics', '_y_ = (−4)(−4) = 16');
await shot('5-steps', 'two worked steps, the notation set as mathematics');
await p.evaluate(() => { selZone = null; renderSlide(); });
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="study"]').click());
await p.waitForTimeout(600);
await shot('6-study', 'the same page in Study — what the student sees');
await b.close(); server.close();
console.log(`\nwrote ${path.relative(root, OUT)}`);
