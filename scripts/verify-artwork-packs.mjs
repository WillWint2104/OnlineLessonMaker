// Real authoring/export/render evidence for the bounded artwork integration.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import '../src/artwork/packs.js';
const baseline='fc27e03f2251b63aeac21cda10fc9cd4d1fa7cdb';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const out=process.env.ART_PACK_REVIEW_DIR||'docs/review/artwork-packs';
fs.mkdirSync(out+'/captures',{recursive:true});fs.mkdirSync(out+'/workflow',{recursive:true});
const appPath=path.resolve('lesson-studio.html'),appBytes=fs.readFileSync(appPath);
const report={head:git('rev-parse','HEAD'),baseline,applicationSha256:sha(appBytes),trackedSourceDirty:!!git('status','--porcelain','--untracked-files=no'),checks:[],captures:[],errors:[],packs:ArtworkPacks.packs,passed:false};
const check=(value,label)=>{assert.ok(value,label);report.checks.push(label);console.log('PASS '+label);};
const legacy=vm.createContext({btoa});vm.runInContext(execFileSync('git',['show',baseline+':src/mathematics/micro-lesson/micro.js'],{encoding:'utf8'}),legacy);
for(const [id]of legacy.MathMicro.packs)for(const role of ArtworkPacks.roles)assert.equal(JSON.stringify(ArtworkPacks.image(id,role)),JSON.stringify(legacy.MathMicro.image(id,role)));
check(true,'All nine existing procedural pack/role outputs remain byte-identical');
for(const [request,resolved]of [['mathematics/algebra/fractions','mathematics/algebra/fractions'],['mathematics/algebra/unlisted','mathematics/algebra/general'],['mathematics/geometry/unlisted','mathematics/general'],['unlisted/topic','global/general']])assert.equal(ArtworkPacks.resolve(request).id,resolved);
for(const request of [null,undefined,''])assert.equal(ArtworkPacks.image(request,'overview'),null);
for(const request of ['../escape','https://host/image','mathematics//bad',{},42])assert.throws(()=>ArtworkPacks.resolve(request));
assert.equal(ArtworkPacks.image('global/general','bad-role'),null);
check(true,'Exact pack, broader domain, Mathematics general, global fallback, opt-out and malformed-ID behaviour');
for(const [id]of ArtworkPacks.packs){const images=ArtworkPacks.roles.map(role=>ArtworkPacks.image(id,role).src);assert.equal(new Set(images).size,3);for(const src of images){const svg=Buffer.from(src.split(',')[1],'base64').toString();assert.ok(!/<(?:text|image|script|foreignObject)\b|https?:\/\/(?!www.w3.org\/2000\/svg)/i.test(svg));}}
check(true,'All six finite packs have three distinct local formula-free procedural roles');
check(!git('diff',baseline,'--','lessons','assets','src/graph-response','src/mathematics/visual-system.css','.github'),'Protected production lessons, PNGs, visual-system, calculator/vendor and graph files unchanged');
const baseLesson=JSON.parse(fs.readFileSync('docs/review/adding-fractions-algebraic-denominators/lesson.json','utf8'));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1536,height:960}});
async function watch(p){p.on('pageerror',e=>report.errors.push(e.message));p.on('dialog',d=>d.accept());await p.route(/^https?:/,r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());}
async function load(lesson){await page.goto(pathToFileURL(appPath).href);await page.locator('#modeSeg [data-mode="edit"]').click();await page.locator('#dataBtn').click();await page.locator('#jsonArea').fill(JSON.stringify(lesson));await page.locator('#jsonLoad').click();assert.equal(await page.locator('#jsonErr').textContent(),'');}
async function nav(p,role){await p.evaluate(role=>{if(role==='completion'){LP_STATE.end=true;LP_STATE.front=null;renderSlide();lpResetPageScroll();}else lpGoFront(lpFrontPages().find(p=>p.kind===role).id);},role);}
async function download(selector,file){const waiting=page.waitForEvent('download');await page.locator(selector).click();await(await waiting).saveAs(out+'/workflow/'+file);}
async function shot(p,name,context){await p.evaluate(()=>document.fonts.ready);const file='captures/'+name+'.png';if(context){const cdp=await context.newCDPSession(p);try{const value=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});fs.writeFileSync(out+'/'+file,Buffer.from(value.data,'base64'));}finally{await cdp.detach();}}else await p.screenshot({path:out+'/'+file});report.captures.push({file,name,sha256:sha(fs.readFileSync(out+'/'+file))});}
async function inspect(p,role,id){
 await nav(p,role);
 await p.locator('.mx-page [data-lp-image]:visible').waitFor();
 await p.waitForFunction(()=>[...document.querySelectorAll('.mx-page [data-lp-image]')].every(image=>image.complete&&image.naturalWidth===960));
 const image=p.locator('.mx-page [data-lp-image]:visible').first();assert.equal(await image.getAttribute('src'),ArtworkPacks.image(id,role).src);
 const state=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1||document.querySelector('.mx-page').scrollWidth>document.querySelector('.mx-page').clientWidth+1,fit:getComputedStyle(document.querySelector('.mx-page [data-lp-image]')).objectFit,focus:document.querySelector('.mx-page [data-lp-image]').style.objectPosition}));
 assert.ok(!state.overflow);assert.equal(state.fit,'cover');assert.equal(state.focus,'68% 50%');
 await image.scrollIntoViewIfNeeded();
}
function gallery(){
 const groups=['1536','1024','390','native-200','authoring','fallback'];
 fs.writeFileSync(out+'/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Artwork pack review</title><style>body{font:18px/1.5 system-ui;max-width:1450px;margin:auto;padding:24px;background:#f6faf8;color:#132e29}a{color:#00695d}section,header{background:white;border:1px solid #dbe9e2;border-radius:12px;padding:24px;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:18px}figure{margin:0;min-width:0}img{width:100%;height:auto}nav{display:flex;flex-wrap:wrap;gap:16px}</style><header><h1>Global + Mathematics baseline artwork</h1><p>Actual exported learner application, six packs and three roles. Existing white/mint procedural visual system. Source head <code>${report.head}</code>.</p>${report.passed?'':'<p role="alert">Verification incomplete or failed: inspect results.json.</p>'}<nav><a href="README.md">Opening guide</a><a href="AUDIT.md">Before-change audit</a><a href="../../artwork-packs.md">Catalogue and contract</a><a href="results.json">Verification</a></nav><p>Phone/native captures scroll the actual page to bring artwork into view; they are not substitute mock-ups. Video playback is blocked during review and not claimed offline.</p><nav>${groups.map(group=>`<a href="#${group}">${group}</a>`).join('')}</nav><h2>Runnable learner exports and editable JSON</h2>${ArtworkPacks.packs.map(([id])=>{const slug=id.replaceAll('/','-');return `<p>${id}: <a href="workflow/${slug}.html">Learner</a> · <a href="workflow/${slug}.json">Authoring JSON</a></p>`;}).join('')}</header>${groups.map(group=>`<section id="${group}"><h2>${group}</h2><div class="grid">${report.captures.filter(c=>c.name.startsWith(group+'-')).map(c=>`<figure><a href="${c.file}"><img loading="lazy" src="${c.file}" alt="${c.name}"></a><figcaption>${c.name}</figcaption></figure>`).join('')}</div></section>`).join('')}</html>`);
}
try{
 await watch(page);
 const publications=[];
 for(const [id]of ArtworkPacks.packs){
  const lesson=structuredClone(baseLesson),slug=id.replaceAll('/','-');lesson.meta.artworkPack=id;
  if(id.startsWith('global/')){lesson.meta.subject='General';for(const slide of lesson.slides)delete slide.practiceComposition;}
  await load(lesson);
  await page.locator('[data-mx-mode="json"]').click();await download('#jsonDl',slug+'.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(out+'/workflow/'+slug+'.json','utf8')),lesson);
  await page.locator('#jsonArea').fill(fs.readFileSync(out+'/workflow/'+slug+'.json','utf8'));await page.locator('#jsonLoad').click();assert.equal(await page.locator('#jsonErr').textContent(),'');
  await page.locator('[data-mx-mode="study"]').click();await download('[data-mx-mode="export"]',slug+'.html');
  publications.push({id,slug});check(true,id+': actual authoring download/reopen and learner export');
 }
 for(const [width,height]of [[1536,960],[1024,768],[390,844]]){
  await page.setViewportSize({width,height});
  for(const {id,slug}of publications){await page.goto(pathToFileURL(path.resolve(out,'workflow',slug+'.html')).href);for(const role of ArtworkPacks.roles){await inspect(page,role,id);await shot(page,width+'-'+slug+'-'+role);}check(true,id+': all three offline learner roles load and fit at '+width);}
 }
 // Native browser zoom via Chromium preferences; listener is installed before navigation.
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'art-pack-zoom-'));
 fs.mkdirSync(profile+'/Default');fs.writeFileSync(profile+'/Default/Preferences',JSON.stringify({partition:{default_zoom_level:{x:Math.log(2)/Math.log(1.2)}}}));
 const server=http.createServer((request,response)=>{const name=new URL(request.url,'http://localhost').pathname.slice(1);if(!publications.some(p=>p.slug+'.html'===name)){response.writeHead(404);response.end();return;}response.setHeader('Content-Type','text/html; charset=utf-8');response.end(fs.readFileSync(out+'/workflow/'+name));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let context;
 try{context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:['--window-size=1536,960']});const p=context.pages()[0];await watch(p);
  for(const {id,slug}of publications){await p.goto('http://127.0.0.1:'+server.address().port+'/'+slug+'.html');const metrics=await p.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom}));assert.ok(Math.abs(metrics.dpr-2)<.02);assert.ok(['1','normal'].includes(metrics.cssZoom));report.nativeZoom=metrics;for(const role of ArtworkPacks.roles){await inspect(p,role,id);await shot(p,'native-200-'+slug+'-'+role,context);}check(true,id+': all three roles at genuine native 200%');}
 }finally{await context?.close();await new Promise(resolve=>server.close(resolve));const real=fs.realpathSync(profile);assert.equal(path.dirname(real),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(real).startsWith('art-pack-zoom-'));fs.rmSync(real,{recursive:true,force:true});}
 await page.setViewportSize({width:1536,height:960});await load(baseLesson);
 await page.locator('[data-bind="meta.artworkPack"]').selectOption('mathematics/algebra/fractions');
 await page.locator('[data-artwork-preview] summary').click();
 assert.equal(await page.locator('[data-artwork-preview] img').count(),3);
 await page.locator('[data-artwork-preview]').scrollIntoViewIfNeeded();await shot(page,'authoring-resolved-three-role-preview');
 await page.locator('[data-bind="meta.frontMatter.0.image.src"]').fill(ArtworkPacks.image('global/general','overview').src);
 await page.locator('[data-bind="meta.frontMatter.0.image.alt"]').fill('Custom neutral artwork');
 await page.locator('[data-bind="meta.frontMatter.0.image.fit"]').selectOption('contain');
 await page.locator('[data-bind="meta.frontMatter.0.image.focus.x"]').fill('0.25');
 const overridden=await page.evaluate(()=>lpRoleImage('overview',LESSON.meta.frontMatter[0].image));
 assert.equal(overridden.src,ArtworkPacks.image('global/general','overview').src);assert.equal(overridden.alt,'Custom neutral artwork');assert.equal(overridden.fit,'contain');assert.equal(+overridden.focus.x,.25);
 await page.locator('[data-mx-mode="json"]').click();await download('#jsonDl','custom-override.json');
 const overrideJSON=JSON.parse(fs.readFileSync(out+'/workflow/custom-override.json','utf8'));assert.equal(overrideJSON.meta.frontMatter[0].image.src,overridden.src);
 await page.locator('#jsonArea').fill(JSON.stringify(overrideJSON));await page.locator('#jsonLoad').click();
 await page.locator('[data-mx-mode="study"]').click();await download('[data-mx-mode="export"]','custom-override.html');
 await page.goto(pathToFileURL(path.resolve(out,'workflow/custom-override.html')).href);
 assert.equal(await page.locator('.mx-page [data-lp-image]:visible').getAttribute('src'),overridden.src);assert.equal(await page.locator('.mx-page [data-lp-image]:visible').getAttribute('alt'),overridden.alt);await shot(page,'authoring-custom-override-learner');
 await load(overrideJSON);await page.locator('[data-journey-clear="meta.frontMatter.0.image.src"]').click();
 const restored=await page.evaluate(()=>lpRoleImage('overview',LESSON.meta.frontMatter[0].image));assert.equal(restored.src,ArtworkPacks.image('mathematics/algebra/fractions','overview').src);assert.equal(restored.fit,'contain');assert.equal(+restored.focus.x,.25);
 await shot(page,'authoring-cleared-override-returns-to-pack');
 check(true,'Custom source, alt, contain and focal settings survive JSON/reopen/publication; clearing source returns to pack and retains authored crop');
 await load(baseLesson);await page.evaluate(src=>{LESSON.meta.frontMatter[0].image=src;renderInspector();},overridden.src);await page.locator('[data-journey-clear="meta.frontMatter.0.image.src"]').click();assert.equal(await page.evaluate(()=>lpRoleImage('overview',LESSON.meta.frontMatter[0].image).src),ArtworkPacks.image(baseLesson.meta.artworkPack,'overview').src);check(true,'Defensive legacy string-image editing clears safely; importer still requires structured role images');
 const unknown=structuredClone(baseLesson);unknown.meta.artworkPack='mathematics/algebra/unlisted';await load(unknown);assert.ok((await page.locator('[data-artwork-preview]').textContent()).includes('Overview'));assert.ok((await page.locator('#inspector').textContent()).includes('resolves to'));await shot(page,'fallback-authored-unknown-topic');
 await page.locator('[data-mx-mode="study"]').click();for(const role of ArtworkPacks.roles){await inspect(page,role,'mathematics/algebra/general');await shot(page,'fallback-'+role);}check(true,'Unknown topic accepted, authored ID preserved and all real roles resolve to broader pack');
 const missing=structuredClone(baseLesson);delete missing.meta.artworkPack;await load(missing);await page.locator('[data-mx-mode="study"]').click();assert.equal(await page.locator('.mx-page [data-lp-image]:visible').count(),0);check(true,'Lesson without artworkPack acquires no implicit global image');
 check(!report.errors.length,'Zero page errors with pre-navigation listeners');
 check(sha(fs.readFileSync(appPath))===report.applicationSha256&&git('rev-parse','HEAD')===report.head,'Application and source head unchanged during focused verification');
 report.passed=true;
}catch(error){report.failure=String(error.stack||error);process.exitCode=1;}finally{await browser.close();gallery();fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({head:report.head,passed:report.passed,checks:report.checks.length,captures:report.captures.length,errors:report.errors.length,failure:report.failure}));
