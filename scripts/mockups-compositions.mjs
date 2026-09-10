#!/usr/bin/env node
// THE COMPOSITION MOCKUP PACK — the visual API specification for the Mathematics worked-example
// compositions.
//
//   node scripts/mockups-compositions.mjs [outDir]
//
// These are NOT drawings, and that is the point of building them this way:
//
//   · every colour, font, radius and rule weight comes from `lesson-studio.html`'s own `.mx` token
//     block, lifted verbatim at build time, so a mockup cannot show a colour the app does not have;
//   · every coordinate plane in the pack is the SHIPPED ENGINE'S OWN OUTPUT, solved against the exact
//     column the mockup gives it — so "the graph keeps its natural, equal-unit scale in this slot" is
//     a rendered fact in the reference image, not a promise about one;
//   · the geometry each mockup asserts (track widths, gaps, floors, measures) is written once in
//     `src/spec.json` and drawn twice: as the layout itself, and — in the `-spec` variant — as the
//     annotation over it. A reference image and its dimensions cannot drift apart.
//
// The pack is the maintainer's approved design; `docs/mockups/compositions/README.md` is its contract.
// The app is not changed by this script and does not read anything in `docs/mockups/`.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/mockups/compositions/src');
const OUT = path.resolve(process.argv[2] || path.join(root, 'docs/mockups/compositions'));
fs.mkdirSync(OUT, { recursive: true });

const APP = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');
const SPEC = JSON.parse(fs.readFileSync(path.join(SRC, 'spec.json'), 'utf8'));
const KIT = fs.readFileSync(path.join(SRC, 'kit.css'), 'utf8');


const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

/* THE APP'S OWN MATERIAL — ALL OF IT, TAKEN FROM THE BROWSER RATHER THAN FROM A REGEX. The pack needs
   lesson-studio.html's complete stylesheet: its design tokens, its vendored font faces, its theme mapping
   and — the part that matters most here — the Figure Engine's own `.tp-fig*` rules, which is what makes a
   plane in a mockup the app's plane rather than a picture of one. Slicing `<style>…</style>` out of the
   text does NOT work: the file's own comments mention the tag, so the blocks mis-pair and whole rule sets
   go missing silently — the first build of this pack lost every grid, axis and curve stroke that way and
   still produced plausible-looking images. So the stylesheet is read back from the CSSOM of the loaded
   app, which is the parsed truth, and the kit is appended AFTER it. */
const APP_CSS = await (async () => {
  const p = await browser.newPage();
  await p.goto(base, { waitUntil: 'load' });
  const css = await p.evaluate(() => [].slice.call(document.styleSheets)
    .map((sh) => { try { return [].slice.call(sh.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } })
    .join('\n'));
  await p.close();
  return css;
})();
for (const [re, what] of [[/\.tp-slide \.tp-fig-grid/, 'the figure grid rule'], [/@font-face/, 'the vendored faces'],
                          [/\.mx-figskin\.tp-slide/, 'the page family\u2019s figure token mapping'], [/\.mx *\{/, 'the .mx token block']])
  if (!re.test(APP_CSS)) throw new Error('the lifted stylesheet is missing ' + what);
console.log(`lifted ${Math.round(APP_CSS.length / 1024)}KB of the app's own stylesheet`);

/* A PLANE, SOLVED AT THE WIDTH THE MOCKUP GIVES IT. The figure block is mounted inside the app's own
   `#slide`, in a viewport box of exactly the mockup's column, and the engine is asked to re-solve —
   which is the same path a real page takes when a composition hands a figure its slot. What comes back
   is the painted result, and `report` prints its px-per-unit so the pack can state the scale it shows. */
const figPage = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
await figPage.goto(base, { waitUntil: 'load' });
const figures = JSON.parse(fs.readFileSync(path.join(SRC, 'figures.json'), 'utf8'));
const solved = {};
for (const [key, f] of Object.entries(figures)) {
  if (key.startsWith('_')) continue;                     /* the file's own note, not a plane */
  const r = await figPage.evaluate(async ({ key, f }) => {
    const host = document.createElement('div');
    host.className = 'mx';
    host.style.cssText = `position:absolute;left:-4000px;top:0;width:${f.w}px;`;
    host.innerHTML = `<div class="mx-part" data-mx-part="figure" data-fig-viewport
      style="position:relative;width:${f.w}px;height:${f.h}px;"><div class="mx-figstage"><div
      class="mx-figskin tp-slide"></div></div></div>`;
    document.querySelector('#slide').appendChild(host);
    host.querySelector('.mx-figskin').innerHTML = fragFigure(mxFigPolicy(f.figure), 'mk-' + key);
    figFitAll();
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const fig = host.querySelector('.tp-fig');
    const svg = fig.querySelector('.tp-fig-svg');
    const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
    const rect = svg.getBoundingClientRect();
    const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
    const val = (t) => parseFloat(t.textContent.replace('−', '-'));
    const per = (anchor, at) => { const a = labs.filter((t) => t.getAttribute('text-anchor') === anchor)
        .map((t) => ({ v: val(t), px: +t.getAttribute(at) })).filter((o) => isFinite(o.v));
      if (a.length < 2) return null; a.sort((m, n) => m.v - n.v);
      const d = a[a.length - 1].v - a[0].v; return d ? Math.abs((a[a.length - 1].px - a[0].px) / d) : null; };
    const kx = rect.width / vb[2], ky = rect.height / vb[3];
    const ux = per('middle', 'x'), uy = per('end', 'y');
    const html = fig.outerHTML;
    host.remove();
    return { html, slot: [f.w, f.h], box: [Math.round(rect.width), Math.round(rect.height)],
      x: ux == null ? null : +(ux * kx).toFixed(2), y: uy == null ? null : +(uy * ky).toFixed(2) };
  }, { key, f });
  r.ratio = (r.x && r.y) ? +(r.x / r.y).toFixed(3) : null;
  solved[key] = r;
  console.log(`figure ${key}: ${r.box[0]}×${r.box[1]} · ${r.x} px per x-unit / ${r.y} per y-unit · ratio ${r.ratio}`);
}
await figPage.close();

/* THE ANNOTATION LAYER. Every measurement printed on a `-spec` image is substituted from spec.json —
   the same entries that become the kit's custom properties and therefore drive the layout itself. A
   dimension label cannot claim a width the mockup does not have, because both come from one line. */
const dims = (html) => html.replace(/\{\{SPEC:([a-zA-Z]+)\}\}/g, (m, k) => {
  if (!(k in SPEC.labels)) throw new Error('no spec label for ' + k);
  return SPEC.labels[k];
});

const page = (fragment, opts) => `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
:root{--mk-surface-w:${opts.surface}px;
${Object.entries(SPEC.tokens).map(([k, v]) => `  --mk-${k}:${v};`).join('\n')}}
${KIT}
</style></head><body class="mx${opts.narrow ? ' mk-narrow' : ''}"><div class="mk-page">
<div class="mk-caption"><span class="mk-caption-k">${opts.kicker}</span>${opts.caption}</div>
<div class="mk-surface"${opts.spec ? ' data-mk-spec' : ''}>${fragment}</div>
</div></body></html>`;

const shot = async (name, fragment, opts) => {
  const p = await browser.newPage({ viewport: { width: opts.surface + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  let html = dims(fragment);
  /* The slot is the one the plane was SOLVED in, and the app's own rules place the plane inside it —
     the pack neither positions nor scales a figure itself. */
  const skin = (f) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport style="position:relative;`
    + `width:${f.slot[0]}px;height:${f.slot[1]}px"><div class="mx-figstage"><div class="mx-figskin tp-slide">`
    + f.html + '</div></div></div>';
  for (const [key, f] of Object.entries(solved)) html = html.split(`{{FIG:${key}}}`).join(skin(f));
  const left = html.match(/\{\{FIG:([a-z0-9-]+)\}\}/i);
  if (left) throw new Error(`${name}: no solved figure for ${left[1]}`);
  const doc = page(html, opts);
  if (process.env.MK_DUMP) fs.writeFileSync(path.join(OUT, name + '.debug.html'), doc);
  await p.setContent(doc, { waitUntil: 'load' });
  await p.waitForTimeout(450);
  const el = await p.$('.mk-page');
  const box = await el.boundingBox();
  await p.setViewportSize({ width: opts.surface + 120, height: Math.ceil(box.height) + 8 });
  await p.waitForTimeout(200);
  await (await p.$('.mk-page')).screenshot({ path: path.join(OUT, name + '.png') });
  if (errs.length) throw new Error(`${name}: ${errs[0]}`);
  console.log('  ' + name);
  await p.close();
};

const DESKTOP = SPEC.reference.desktopSurface, NARROW = SPEC.reference.narrowSurface;
const MID = SPEC.reference.midSurface;
const frag = (f) => fs.readFileSync(path.join(SRC, f + '.html'), 'utf8');

console.log('\nrendering the pack');
for (const m of SPEC.mockups) {
  const opts = { surface: m.surface === 'narrow' ? NARROW : m.surface === 'mid' ? MID : DESKTOP,
    narrow: m.surface === 'narrow', kicker: m.kicker, caption: m.caption };
  await shot(m.name, frag(m.fragment), opts);
  if (m.spec) await shot(m.name + '-spec', frag(m.fragment), Object.assign({}, opts, { spec: true }));
}

await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
console.log('planes, px per x-unit / y-unit (ratio): '
  + Object.entries(solved).filter(([, f]) => f.ratio).map(([k, f]) => `${k} ${f.x}/${f.y} (${f.ratio})`).join(' · '));
