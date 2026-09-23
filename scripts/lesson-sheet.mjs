#!/usr/bin/env node
/* ── THE QUADRATICS LESSON, AS ONE PICTURE PER SURFACE ───────────────────────────────────────────
   Two renderers now draw this lesson, and both are here side by side:

     · `lesson-render.mjs` reads docs/atlas/lesson/quadratics.lesson.json — the authored lesson, in
       the frozen worked-examples grammar, in every tab and view state it declares;
     · `composition-atlas.mjs` lays the same four subtopics out through the composition catalogue's
       page patterns (page 20, the subtopics shell).

   They used to disagree about how wide a graph is: the lesson renderer sized figures from an
   authored `mediaSize` band and painted 683px and 1000px planes, widths the master grid does not
   have. Both now take the width from the same approved subdesign, so the two halves of this sheet
   should show the same graph at the same span. That agreement is the thing to look at.

   It stitches EXISTING renders rather than re-rendering, so the sheet cannot disagree with the
   pages it is made of. Clean only: no inspector overlay and no adversarial payload — those exist to
   prove the contract and would answer a different question. Every page is scaled by the same factor,
   so widths stay comparable between pages and between the two halves.

   Desktop 1152 and tablet 834, which are the active development targets. The phone renders are
   still produced by both scripts and still checked by their controls; they are not assembled here.  */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMP = path.join(root, 'docs/atlas/composition');
const OUT = path.join(root, 'docs/atlas/lesson');
fs.mkdirSync(OUT, { recursive: true });

const LESSON = JSON.parse(fs.readFileSync(path.join(OUT, 'quadratics.lesson.json'), 'utf8'));
const LREPORT = JSON.parse(fs.readFileSync(path.join(OUT, 'lesson-report.json'), 'utf8'));
const PAGES = JSON.parse(fs.readFileSync(path.join(COMP, 'src/pages.json'), 'utf8'));
const SHELL = PAGES.find((p) => p.shell === 'subtopics');
if (!SHELL) throw new Error('the catalogue has no subtopics shell to read the lesson out of');

/* the subtopic a render belongs to, in AUTHORED order — read from the lesson, never from the
   filenames, so a state that stopped being rendered goes missing loudly instead of quietly */
const ORDER = [];
for (const item of LESSON.page.collection.items) {
  const s = (x) => String(x).toLowerCase().replace(/\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const views = item.body && item.body.views ? item.body.views.items : null;
  if (views) for (const v of views) ORDER.push({ key: `${s(item.label)}-${s(v.label)}`, topic: item.label, view: v.label });
  else ORDER.push({ key: s(item.label), topic: item.label, view: null });
}

const SURFACES = [{ id: 'desktop', w: 1152, scale: 0.46 }, { id: 'tablet', w: 834, scale: 0.62 }];
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const t = (x) => esc(x).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\^([-−]?[0-9A-Za-z]+)/g, '<sup>$1</sup>');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const S of SURFACES) {
  /* HALF ONE · the authored lesson, in the order the lesson declares it */
  const authored = ORDER.map((o) => {
    const file = path.join(OUT, `lesson-${o.key}-${S.id}.png`);
    if (!fs.existsSync(file)) throw new Error(`the lesson declares the state "${o.key}" and there is `
      + `no ${S.id} render of it — run scripts/lesson-render.mjs`);
    const r = LREPORT.find((x) => x.state === o.key && x.surfaceName === S.id);
    const figs = r && r.figs.length
      ? r.figs.map((f) => `${f.subdesign} · slotSpan ${f.slotSpan} = ${f.plane}px`).join(' · ')
      : (r ? [...new Set(r.resolved)].filter((x) => x.includes('.')).join(' · ') : '');
    return { file, n: t(o.topic), sub: o.view ? `the “${t(o.view)}” representation` : 'subtopic', note: figs };
  });

  /* HALF TWO · the same four subtopics through the composition catalogue */
  const shell = ORDER.map((o) => {
    const file = path.join(COMP, `20-shell-subtopics-${o.key}-${S.id}.png`);
    return fs.existsSync(file)
      ? { file, n: t(o.topic), sub: o.view ? `the “${t(o.view)}” representation` : 'subtopic', note: 'page 20 · subtopics shell' }
      : null;
  }).filter(Boolean);
  if (!shell.length) throw new Error(`no ${S.id} renders of the catalogue's subtopics shell — run scripts/composition-atlas.mjs`);

  const card = (c) => `<figure><figcaption><b>${c.n}</b> <span class="s">${c.sub}</span>`
    + (c.note ? `<span>${esc(c.note)}</span>` : '') + `</figcaption>`
    + `<img src="file://${c.file}"></figure>`;
  const docPath = path.join(OUT, `_sheet-${S.id}.html`);
  fs.writeFileSync(docPath, `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#eceeed;font:13px/1.5 ui-monospace,Menlo,monospace;color:#1d2b25;}
    h1{margin:0;padding:16px 26px;background:#111;color:#fff;font:600 14px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.05em;}
    h1 span{color:#8fd3b0;}
    h2{margin:0;padding:13px 26px;background:#1d2b25;color:#cfe5d8;font:600 12px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.07em;}
    h2 em{font-style:normal;color:#8c9e94;font-weight:400;text-transform:none;letter-spacing:0;}
    .grid{display:flex;flex-wrap:wrap;gap:22px;padding:22px 26px 34px;align-items:flex-start;}
    figure{margin:0;width:${Math.round(S.w * S.scale)}px;}
    figcaption{margin:0 0 8px;font:600 12px/1.45 ui-monospace,Menlo,monospace;color:#1d2b25;}
    figcaption .s,figcaption span{display:block;font-weight:400;color:#5d6f67;letter-spacing:.03em;}
    img{display:block;width:100%;border:1px solid #c9d2cd;background:#fff;}
    </style><h1>THE QUADRATICS LESSON — <span>${S.id} ${S.w}px</span> · ${t(LESSON.page.title)} · ${esc(LESSON.stage)}</h1>
    <h2>1 · THE AUTHORED LESSON <em>— quadratics.lesson.json through the frozen grammar, every state it declares (${authored.length})</em></h2>
    <div class="grid">${authored.map(card).join('')}</div>
    <h2>2 · THE SAME FOUR SUBTOPICS THROUGH THE COMPOSITION CATALOGUE <em>— page patterns on the master grid (${shell.length})</em></h2>
    <div class="grid">${shell.map(card).join('')}</div>`);
  const pg = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + docPath, { waitUntil: 'load' });
  await pg.evaluate(() => Promise.all([].slice.call(document.images)
    .map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  await pg.waitForTimeout(250);
  const bb = await (await pg.$('body')).boundingBox();
  await pg.setViewportSize({ width: 1400, height: Math.min(30000, Math.ceil(bb.height) + 4) });
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: path.join(OUT, `QUADRATICS-LESSON__${S.id}.png`), fullPage: true });
  await pg.close();
  fs.unlinkSync(docPath);
  console.log(`${S.id.padEnd(8)} ${authored.length} authored + ${shell.length} catalogue → QUADRATICS-LESSON__${S.id}.png`);
  for (const c of authored) console.log(`   ${path.basename(c.file).padEnd(50)} ${c.note}`);
}
await browser.close();
console.log(`\nwrote ${path.relative(root, OUT)}`);
