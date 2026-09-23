#!/usr/bin/env node
/* ── THE SPACE STUDY, AS ONE PICTURE ─────────────────────────────────────────────────────────────
   Assembles the four arrangements side by side at one scale so they can be compared directly, with
   the measured numbers under each. Stitches the existing renders rather than re-rendering, so the
   sheet cannot disagree with the pages it is made of. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(root, 'docs/atlas/space-study');
const R = JSON.parse(fs.readFileSync(path.join(DIR, 'space-study.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const kind of ['clean', 'overlay']) {
  const card = (a) => {
    const dead = a.side ? a.verticalHole * a.readingSlot : a.unusedColumns * a.blockHeight;
    return `<figure><figcaption><b>${esc(a.label)}</b><span>${esc(a.status)}</span>
      <table>
        <tr><td>media slot</td><td>${a.mediaSpan} col · ${a.mediaSlot}px</td></tr>
        <tr><td>plane</td><td>${esc(a.plane)}</td></tr>
        <tr><td>reading slot</td><td>${a.readSpan} col · ${a.readingSlot}px · ${a.readingHeight}px tall</td></tr>
        <tr class="k"><td>block height</td><td>${a.blockHeight}px</td></tr>
        <tr class="${a.unusedColumns ? 'bad' : ''}"><td>unused columns</td><td>${a.unusedColumns}px</td></tr>
        <tr class="${a.verticalHole ? 'bad' : ''}"><td>vertical hole</td><td>${a.verticalHole ? a.verticalHole + 'px under the ' + a.holeUnder : 'none'}</td></tr>
        <tr><td>nearest label to curve</td><td>${a.nearestLabelToCurve}px</td></tr>
      </table></figcaption><img src="file://${path.join(DIR, a.id + '__' + kind + '.png')}"></figure>`;
  };
  const doc = path.join(DIR, `_sheet-${kind}.html`);
  fs.writeFileSync(doc, `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#eceeed;font:13px/1.5 ui-monospace,Menlo,monospace;color:#1d2b25;}
    h1{margin:0;padding:16px 26px;background:#111;color:#fff;font:600 14px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.05em;}
    h1 span{color:#8fd3b0;}
    h2{margin:0;padding:11px 26px;background:#1d2b25;color:#cfe5d8;font:400 12px/1.6 ui-monospace,Menlo,monospace;}
    .grid{display:flex;flex-wrap:nowrap;gap:20px;padding:20px 26px 30px;align-items:flex-start;}
    figure{margin:0;width:560px;flex:0 0 auto;}
    figcaption{margin:0 0 8px;font:600 12px/1.45 ui-monospace,Menlo,monospace;}
    figcaption span{display:block;font-weight:400;color:#5d6f67;margin:2px 0 6px;}
    table{border-collapse:collapse;width:100%;font:400 11.5px/1.5 ui-monospace,Menlo,monospace;margin-bottom:8px;}
    td{padding:1px 0;color:#41524a;} td:first-child{color:#7b8a83;width:52%;}
    tr.k td{font-weight:700;color:#0d1a14;} tr.bad td{color:#b03a22;font-weight:700;}
    img{display:block;width:100%;border:1px solid #c9d2cd;background:#fff;}
    </style><h1>THE SPACE STUDY — <span>the real Symmetry lesson, desktop ${R.width}px, ${kind}</span> · four arrangements over one twelve-column grid</h1>
    <h2>figure <b>${esc(R.figure)}</b> · domain x[${R.domain.xMin}, ${R.domain.xMax}] y[${R.domain.yMin}, ${R.domain.yMax}] · aspect ${R.aspect} · class <b>${esc(R.geometryClass)}</b> · column ${R.column}px · gutter ${R.gutter}px · reading measure ${R.readingMeasure}px — same figure, same domain, same four paragraphs in every panel</h2>
    <div class="grid">${R.arrangements.map(card).join('')}</div>`);
  const pg = await browser.newPage({ viewport: { width: 2400, height: 1000 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + doc, { waitUntil: 'load' });
  await pg.evaluate(() => Promise.all([].slice.call(document.images)
    .map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  await pg.waitForTimeout(250);
  const bb = await (await pg.$('body')).boundingBox();
  await pg.setViewportSize({ width: Math.ceil(bb.width) + 4, height: Math.min(30000, Math.ceil(bb.height) + 4) });
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: path.join(DIR, `SPACE-STUDY__${kind}.png`), fullPage: true });
  await pg.close();
  fs.unlinkSync(doc);
  console.log(`wrote SPACE-STUDY__${kind}.png`);
}
await browser.close();
