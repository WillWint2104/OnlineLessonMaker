import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'http://localhost:8099/lesson-studio.html';
// tiny solid-red 2x2 PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP8z8Dwn4EIwDiqEAAh4wMBdrYZNwAAAABJRU5ErkJggg==';
const results = [];
const ok = (n, c, extra='') => { results.push(`${c?'✓':'✗'} ${n}${extra?'  '+extra:''}`); if(!c) process.exitCode=1; };

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if(m.type()==='error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });

// helper: run app code in page (engine vars are module-scoped, so drive via DOM + exposed UI)
const enterEdit = () => page.click('[data-mode="edit"]');
const sel = s => page.$(s);
const exists = async s => !!(await page.$(s));

await enterEdit();
await page.waitForTimeout(150);

// ---- COVER (slide 0) ----
// select the hero media zone
await page.click('#slide .hero');
await page.waitForTimeout(100);
ok('cover: media block renders in panel', await exists('#inspector .mblock'));

// set hero image via URL field
await page.fill('#inspector [data-mediaurl]', PNG);
await page.dispatchEvent('#inspector [data-mediaurl]', 'input');
await page.waitForTimeout(100);
// re-select (panel rebuilt on renderCanvas? no — renderCanvas only; thumbnail not yet). Force reselect to refresh panel.
await page.click('#slide .hero'); await page.waitForTimeout(100);
ok('cover: URL sets hero bg (has-img, default not behind gradient)', await exists('#slide .hero.has-img'));
ok('cover: media thumbnail now shown', await exists('#inspector .mthumb'));

// toggle "Behind the gradient"
await page.click('#inspector [data-herobg]');
await page.waitForTimeout(120);
ok('cover: heroBg on → hero-bg class + hero-img element', await exists('#slide .hero.hero-bg') && await exists('#slide .hero-img'));

// overlay slider changes veil opacity
await page.$eval('#inspector [data-overlay]', el => { el.value='0.30'; el.dispatchEvent(new Event('input',{bubbles:true})); });
await page.waitForTimeout(100);
const veilOp = await page.$eval('#slide .hero-veil', el => el.style.opacity);
ok('cover: overlay slider drives veil opacity', Math.abs(parseFloat(veilOp)-0.30)<1e-6, `opacity=${veilOp}`);

// fit → contain
await page.click('#inspector [data-fit="contain"]');
await page.waitForTimeout(100);
let st = await page.$eval('#slide .hero-img', el => el.getAttribute('style'));
ok('cover: fit=contain applied to hero img', /object-fit:contain/.test(st), st);

// zoom slider
await page.click('#slide .hero'); await page.waitForTimeout(80); // refresh panel to get fresh slider
await page.$eval('#inspector [data-zoom]', el => { el.value='2'; el.dispatchEvent(new Event('input',{bubbles:true})); });
await page.waitForTimeout(100);
st = await page.$eval('#slide .hero-img', el => el.getAttribute('style'));
ok('cover: zoom scales hero img', /scale\(2\)/.test(st), st);

// focus preset (top-left = 0,0)
await page.click('#slide .hero'); await page.waitForTimeout(80);
await page.click('#inspector [data-fx="0"][data-fy="0"]');
await page.waitForTimeout(100);
st = await page.$eval('#slide .hero-img', el => el.getAttribute('style'));
ok('cover: focus preset sets object-position', /object-position:0\.0% 0\.0%/.test(st), st);

// focus DRAG on the pad (regression: grid buttons used to cover the pad and block dragging)
await page.click('#slide .hero'); await page.waitForTimeout(80);
const pad = await page.$('#inspector .mfocus');
const box = await pad.boundingBox();
await page.mouse.move(box.x + box.width*0.8, box.y + box.height*0.25);
await page.mouse.down();
await page.mouse.move(box.x + box.width*0.8, box.y + box.height*0.25, {steps:3});
await page.mouse.up();
await page.waitForTimeout(120);
st = await page.$eval('#slide .hero-img', el => el.getAttribute('style'));
ok('cover: dragging focus pad sets object-position (~80% 25%)', /object-position:7[5-9]\.\d% 2[3-7]\.\d%|object-position:80\.0% 25\.0%/.test(st), st);

// Remove clears
await page.click('#slide .hero'); await page.waitForTimeout(80);
await page.click('#inspector .mthumb-acts [data-clearmedia]');
await page.waitForTimeout(120);
ok('cover: Remove clears hero image', !(await exists('#slide .hero.has-img')) && !(await exists('#slide .hero-img')));
ok('cover: empty drop state shown after remove', await exists('#inspector .mdrop'));

// ---- DROP simulation on panel drop area (DataTransfer file) ----
await page.click('#slide .hero'); await page.waitForTimeout(80);
const dropped = await page.evaluate(async (png) => {
  const z = document.querySelector('#inspector [data-mediadrop]');
  if(!z) return 'no-drop-target';
  // build a File from the data URL
  const res = await fetch(png); const blob = await res.blob();
  const file = new File([blob], 'x.png', {type:'image/png'});
  const dt = new DataTransfer(); dt.items.add(file);
  const ev = new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:dt});
  z.dispatchEvent(ev);
  return 'dropped';
}, PNG);
await page.waitForTimeout(200);
const coverBgIsData = await page.evaluate(() => {
  const el = document.querySelector('#slide .hero');
  const cssVar = getComputedStyle(el).getPropertyValue('--cover-img') || '';
  const img = document.querySelector('#slide .hero-img');
  return (cssVar.includes('data:image')) || (img && img.src.startsWith('data:image'));
});
ok('cover: dropping image FILE on panel embeds inline (data URL)', dropped==='dropped' && coverBgIsData, `drop=${dropped}`);

// screenshot (a) cover with image behind gradient + media block
await page.click('#inspector [data-herobg]').catch(()=>{}); // ensure heroBg on
await page.waitForTimeout(120);
if(!(await exists('#slide .hero.hero-bg'))){ await page.click('#inspector [data-herobg]').catch(()=>{}); await page.waitForTimeout(120); }
await page.screenshot({ path: 'screenshots/media-a-cover.png' });

// ---- SLIDE IMAGE (slide 7 = 'image') ----
await page.evaluate(()=>{ document.querySelectorAll('#nav [data-go]')[7]?.click(); });
await page.waitForTimeout(150);
await page.click('#slide .frame').catch(()=>{});
await page.waitForTimeout(100);
ok('image slide: media block renders', await exists('#inspector .mblock'));
await page.fill('#inspector [data-mediaurl]', PNG);
await page.dispatchEvent('#inspector [data-mediaurl]', 'input');
await page.waitForTimeout(100);
await page.click('#slide .frame'); await page.waitForTimeout(100);
await page.click('#inspector [data-fit="contain"]'); await page.waitForTimeout(80);
await page.click('#slide .frame'); await page.waitForTimeout(80);
await page.click('#inspector [data-fx="1"][data-fy="0"]'); await page.waitForTimeout(100);
let ist = await page.$eval('#slide .frame img', el => el.getAttribute('style')).catch(()=>'');
ok('image slide: fit+focus applied to img', /object-fit:contain/.test(ist) && /object-position:100\.0% 0\.0%/.test(ist), ist);
await page.screenshot({ path: 'screenshots/media-c-slideimage.png' });

// screenshot (b) empty drop state — go to a fresh image-bearing slide and clear
await page.click('#slide .frame'); await page.waitForTimeout(80);
if(await exists('#inspector .mthumb-acts [data-clearmedia]')){ await page.click('#inspector .mthumb-acts [data-clearmedia]'); await page.waitForTimeout(120); }
await page.click('#slide .frame'); await page.waitForTimeout(80);
await page.screenshot({ path: 'screenshots/media-b-empty.png' });

// ---- EXTERNAL embed (slide 4) media block + fallback link field ----
await page.evaluate(()=>{ document.querySelectorAll('#nav [data-go]')[4]?.click(); });
await page.waitForTimeout(150);
await page.click('#slide .ex-img').catch(()=>{});
await page.waitForTimeout(100);
ok('external: image media block renders', await exists('#inspector .mblock'));
const hasUrlField = await page.evaluate(()=>!!document.querySelector('#inspector [data-bind$=".url"]'));
const hasFallback = await page.evaluate(()=>!!document.querySelector('#inspector [data-bind$=".sourceUrl"]'));
// note: url/sourceUrl fields live in the fields section, visible regardless of zone
ok('external: activity URL + source fallback fields present', hasUrlField && hasFallback, `url=${hasUrlField} fallback=${hasFallback}`);

// ---- EXPORT self-contained ----
await page.evaluate(()=>{ document.querySelectorAll('#nav [data-go]')[0]?.click(); });
await page.waitForTimeout(120);
const exportInfo = await page.evaluate(() => {
  let captured = null;
  const RealBlob = window.Blob;
  window.Blob = function(parts, opts){ if(opts && opts.type==='text/html') captured = parts.join(''); return new RealBlob(parts, opts); };
  const realClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){};
  const realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:stub'; URL.revokeObjectURL = () => {};
  try { document.getElementById('exportBtn').click(); } finally {
    HTMLAnchorElement.prototype.click = realClick; window.Blob = RealBlob;
    URL.createObjectURL = realCreate; URL.revokeObjectURL = realRevoke;
  }
  const flat = (captured||'').replace(/\n/g,' ');
  return {
    hasDataUrl: flat.includes('data:image/png'),
    studyBody: /<body class="study"/.test(flat),
    inspectorStripped: /id="inspector"[^>]*>\s*<\/(div|aside|section|nav)>/.test(flat),
    paletteStripped: /id="palette"[^>]*>\s*<\/(div|aside|section|nav)>/.test(flat),
    thirdParty: /(src|href)="https?:\/\/(?!localhost)/i.test(flat),
    len: (captured||'').length
  };
});
ok('export: dropped image embedded inline (data URL) in exported file', exportInfo.hasDataUrl, `len=${exportInfo.len}`);
ok('export: body=study, inspector+palette stripped', exportInfo.studyBody && exportInfo.inspectorStripped && exportInfo.paletteStripped, JSON.stringify(exportInfo));
ok('export: no third-party http(s) src/href in exported file', !exportInfo.thirdParty);

await browser.close();
fs.writeFileSync('screenshots/media-verify.txt', results.join('\n')+'\n\nPage errors:\n'+(errs.join('\n')||'(none)'));
console.log(results.join('\n'));
console.log('\nPage errors: '+(errs.length?('\n'+errs.join('\n')):'(none)'));
