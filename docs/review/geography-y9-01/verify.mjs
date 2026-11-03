import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..');
const out=path.resolve(process.env.Y9_OUT||path.join(root,'review-delivery/y9-01-run-v1'));
assert(!fs.existsSync(out),'Use a fresh versioned output directory');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(out+'/captures');
const fixture=JSON.parse(fs.readFileSync(dir+'/lesson.json')),hash=b=>createHash('sha256').update(b).digest('hex');
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baseline:'ec352e01cbb1098b9ce76c01b1b5bfe9bba3366a',appSha256:hash(fs.readFileSync(root+'/lesson-studio.html')),lessonSha256:hash(fs.readFileSync(dir+'/lesson.json')),checks:[],captures:[],pageErrors:[],measurements:[],exports:[],complete:false};
fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));
const check=(ok,label)=>{assert.ok(ok,label);report.checks.push(label);};
const setup=p=>{p.on('pageerror',e=>report.pageErrors.push(e.message));p.on('dialog',d=>d.accept());p.setDefaultTimeout(15000);};
async function load(p,l,native=false){await p.goto(pathToFileURL(root+'/lesson-studio.html').href);for(const s of ['#modeSeg [data-mode="edit"]','#dataBtn']){if(native)await p.locator(s).dispatchEvent('click');else await p.locator(s).click();}await p.locator('#jsonArea').fill(JSON.stringify(l));if(native)await p.locator('#jsonLoad').dispatchEvent('click');else await p.locator('#jsonLoad').click();check(!await p.locator('#jsonErr').textContent(),'Real JSON editor accepts '+l.meta.id);if(native)await p.locator('[data-mx-mode="study"]').dispatchEvent('click');else await p.locator('[data-mx-mode="study"]').click();}
async function save(p,selector,name){const wait=p.waitForEvent('download');await p.locator(selector).click();await(await wait).saveAs(out+'/'+name);return fs.readFileSync(out+'/'+name);}
async function go(p,i,id){await p.evaluate(([i,id])=>lpNavigate(i,id),[i,id]);await p.evaluate(()=>document.fonts.ready);}
async function shot(p,name){const c=await p.context().newCDPSession(p);try{const x=await c.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});fs.writeFileSync(out+'/captures/'+name+'.png',Buffer.from(x.data,'base64'));report.captures.push('captures/'+name+'.png');}finally{await c.detach();}}
async function contain(p,label){const m=await p.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom,documentOverflow:document.documentElement.scrollWidth-innerWidth,pageOverflow:document.querySelector('.mx-page').scrollWidth-document.querySelector('.mx-page').clientWidth}));report.measurements.push({label,...m});check(m.documentOverflow<=1&&m.pageOverflow<=1,label+' has no page-level horizontal overflow');}
const browser=await chromium.launch();
try{
 const p=await browser.newPage({viewport:{width:1536,height:1000}});setup(p);await load(p,fixture);
 check(await p.evaluate(()=>LESSON.meta.responseMode)==='paper','Candidate explicitly uses supported paper response mode');
 assert.deepEqual(await p.evaluate(()=>LESSON.slides.map(s=>s.id)),fixture.slides.map(s=>s.id));check(true,'Skill IDs survive real import');
 await p.locator('[data-mx-mode="json"]').click();const json=JSON.parse(await save(p,'#jsonDl','lesson-roundtrip.json'));await p.locator('#modalX').click();assert.deepEqual(json,fixture);check(true,'Actual author JSON download retains complete lesson, provenance and all IDs');
 await load(p,json);assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(LESSON))),fixture);check(true,'Downloaded JSON reopens without changes');
 const html=await save(p,'[data-mx-mode="export"]','Y9-01-learner.html');report.exports.push({file:'Y9-01-learner.html',sha256:hash(html),policy:'hidden',bytes:html.length});
 await p.close();
 const ctx=await browser.newContext({offline:true,viewport:{width:1536,height:1000}}),q=await ctx.newPage();setup(q);await q.goto(pathToFileURL(out+'/Y9-01-learner.html').href);
 check(await q.locator('[data-mx-mode="edit"]').count()===0,'Actual standalone export has no authoring controls');
 check(!(await q.evaluate(()=>JSON.stringify(LESSON))).includes('Y9-01 TEACHER ONLY'),'Teacher notes stripped from actual learner data');
 check(!(await q.evaluate(()=>LESSON.meta.answerPolicy.final==='autonomous')),'Practice answers are not autonomous in the candidate');
 await shot(q,'1536-overview');await q.locator('.lp-footer [data-lp-move="1"]').focus();await q.keyboard.press('Enter');check((await q.locator('.mx-page').innerText()).includes('What successful geographical reasoning'),'Keyboard Next opens Outcomes');await shot(q,'1536-outcomes');
 const activities=fixture.slides.flatMap((s,i)=>s.activities.map(a=>({i,a})));
 for(const width of [1536,1280,1024]){
  await q.setViewportSize({width,height:1000});
  for(const {i,a} of activities){
   await go(q,i,a.id);await contain(q,width+' '+a.id);
   check(await q.locator('[data-mx-typed]:visible, .mx-wb:visible').count()===0,width+' '+a.id+' does not offer an untested typed workbook');
   if(a.layout==='geography-notes'){assert.deepEqual(await q.locator('.geo-g03-notes li').allTextContents(),a.keyNotes);check(true,width+' '+a.id+' ordered essential notes retained');}
   for(const img of await q.locator('.mx-page img').all())check(await img.evaluate(e=>e.complete&&e.naturalWidth>0),width+' '+a.id+' embedded evidence loads offline');
   check(await q.locator('.mx-page merror:visible,.mx-page .md-notation-error:visible').count()===0,width+' '+a.id+' has no visible notation diagnostic');
   if(a.id==='worked'){const text=await q.locator('.mx-page').innerText();check(!text.includes('Your task')&&!text.includes('Example 1'),width+' worked comparison avoids the generic two-column task presentation');const table=q.locator('.mx-tbl').first();(report.compositionMeasurements??=[]).push({width,tableWidth:(await table.boundingBox()).width,headings:await table.locator('tr').first().innerText()});}
   if(a.id==='independent')check((await q.locator('.mx-page').innerText()).includes('60–90 words'),width+' actual independent task presents the shorter core and optional extension');
   await shot(q,width+'-'+a.id);
   const scroll=await q.locator('.mx-page').evaluate(e=>e.scrollHeight>e.clientHeight+40);if(scroll){await q.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);await shot(q,width+'-'+a.id+'-lower');}
  }
 }
 await q.setViewportSize({width:1536,height:1000});await go(q,2,'map-investigation');
 check(await q.locator('[data-book-hub]:visible').count()===0,'No practice model answer access before completion');
 // Use the existing image inspection affordance, never a replacement map UI.
 const controls=await q.locator('.mx-page button').evaluateAll(es=>es.map(e=>({text:e.textContent,title:e.title,aria:e.getAttribute('aria-label'),html:e.outerHTML.slice(0,220)})));
 report.mapControls=controls;
 const imageButton=q.locator('.mx-page [data-ev-inspect]').first();
 if(await imageButton.count()){await imageButton.click();await q.locator('.ev-loading').waitFor({state:'hidden'});await shot(q,'1536-map-inspection');check(await q.locator('dialog[open]').count()>0,'Map opens through existing evidence inspector');await q.locator('.ev-stage').focus();await q.keyboard.press('+');await q.keyboard.press('ArrowRight');await q.locator('[data-ev-task]').click();check((await q.locator('[data-ev-task-panel]').innerText()).includes('Write in your exercise book'),'Existing inspection drawer retains paper investigation task');await shot(q,'1536-map-inspection-task');await q.keyboard.press('Escape');check(await imageButton.evaluate(e=>e===document.activeElement),'Closing map inspector restores keyboard focus');await q.locator('[data-ev-details]').first().click();check((await q.locator('.ev-detail-text').innerText()).includes('creativecommons.org/licenses/by/4.0'),'Source details retain adapted-map licence and modelling limits');await shot(q,'1536-source-details');await q.keyboard.press('Escape');}
 else {throw Error('Required existing map inspection control is missing');}
 await go(q,4,'reflection');await q.locator('[data-lp-move="1"]').click();check((await q.locator('.mx-page').innerText()).includes('Lesson complete'),'Shared final Next reaches Completion');await shot(q,'1536-completion');
 check(await q.locator('[data-book-hub]:visible').count()===0,'Candidate remains teacher-withheld even after completion');
 check(!(await q.evaluate(()=>JSON.stringify(LESSON))).includes('Forty multiplied by 1.2'),'Candidate standalone data contains no withheld worked model');
 await q.locator('[data-lp-front="overview"]').first().click();await q.locator('.lp-footer [data-lp-move="1"]').click();await q.locator('.lp-footer [data-lp-move="1"]').click();
 for(const {a} of activities){check((await q.locator('#lpTitle').innerText())===a.title,'Real sequential Next reaches '+a.id);await q.locator('.lp-footer [data-lp-move="1"]').focus();await q.keyboard.press('Enter');}
 check((await q.locator('.mx-page').innerText()).includes('Lesson complete'),'Entire learner journey traverses through actual shared keyboard Next controls');
 await ctx.close();
 // Exercise real exports for each existing answer policy; inspect the reopened data and UI.
 const e=await browser.newPage({viewport:{width:1280,height:900}});setup(e);
 for(const policy of ['hidden','teacher','autonomous','end']){
  const l=structuredClone(fixture);l.meta.answerPolicy={final:policy,worked:policy,fallback:{final:'hidden',worked:'hidden'}};await load(e,l);const bytes=await save(e,'[data-mx-mode="export"]','policy-'+policy+'.html');
  const c=await browser.newContext({offline:true}),r=await c.newPage();setup(r);await r.goto(pathToFileURL(out+'/policy-'+policy+'.html').href);
  const data=await r.evaluate(()=>JSON.parse(JSON.stringify(LESSON))),qs=data.slides.flatMap(s=>s.activities).flatMap(a=>a.questions||[]);
  check(qs.length===6,policy+' export retains all six multi-part paper tasks');
  check(qs.every(q=>!q.teacherNote),policy+' export strips teacher notes');
  if(['hidden','teacher'].includes(policy)){check(qs.every(q=>!('answer'in q)&&!('workedAnswer'in q)),policy+' actual export strips every withheld final/worked key');check(!bytes.includes(Buffer.from('Forty multiplied by 1.2')),policy+' export bytes omit withheld worked-answer phrase');}
  else check(qs.every(q=>q.answer&&q.workedAnswer),policy+' authorised offline answer keys retained');
  check(await r.evaluate(()=>mcHubAny('final'))===(policy==='autonomous'),policy+' pre-completion final-answer visibility follows existing policy');
  report.exports.push({file:'policy-'+policy+'.html',policy,sha256:hash(bytes),bytes:bytes.length});await c.close();
 }
 await e.close();
 // Compatibility: production code unchanged, plus actual existing fixtures on this same application.
 const m=await browser.newPage({viewport:{width:1280,height:900}});setup(m);
 const maths=JSON.parse(fs.readFileSync(root+'/docs/review/adding-fractions-algebraic-denominators/lesson.json'));await load(m,maths);await go(m,0,'like-denominators');check(await m.locator('.mx-page mfrac').count()>0,'Existing Mathematics stacked fractions still render');check(await m.locator('.geo-g03').count()===0,'Mathematics does not opt into G03');await shot(m,'compatibility-mathematics');
 const history=JSON.parse(fs.readFileSync(root+'/lessons/australia-home-front-propaganda/lesson.json'));await load(m,history);await go(m,0,'read-source');check(await m.locator('[data-mx-statepanel="read-source-read"] img').count()>0,'Existing History source composition retained');await m.locator('[data-mx-state="read-source-model"]').click();check(await m.locator('[data-mx-statepanel="read-source-model"] .mx-step').count()===4,'Existing History prose worked analysis retained');await shot(m,'compatibility-history');await m.close();
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'y9-01-native200-'));fs.mkdirSync(profile+'/Default');fs.writeFileSync(profile+'/Default/Preferences',JSON.stringify({partition:{default_zoom_level:{x:Math.log(2)/Math.log(1.2)}}}));
 const z=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:['--window-size=1536,1000']});
 try{const p=z.pages()[0];setup(p);await p.goto(pathToFileURL(out+'/Y9-01-learner.html').href);const metrics=await p.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom}));report.native200=metrics;check(Math.abs(metrics.dpr-2)<.02&&['1','normal'].includes(metrics.cssZoom),'Genuine native Chromium 200%, no CSS zoom or deviceScaleFactor');for(const {i,a} of activities){await go(p,i,a.id);await contain(p,'native200 '+a.id);await shot(p,'native200-'+a.id);if(await p.locator('.mx-tblwrap').count()){await p.locator('.mx-tblwrap').first().scrollIntoViewIfNeeded();await shot(p,'native200-'+a.id+'-table-in-view');const table=p.locator('.mx-tblwrap').first();if(await table.evaluate(e=>e.scrollWidth>e.clientWidth+1)){await table.focus();await table.evaluate(e=>e.scrollLeft=e.scrollWidth);check(await table.evaluate(e=>e.scrollLeft>0),'Native 200% '+a.id+' table scroll reaches rightmost column locally');await shot(p,'native200-'+a.id+'-table-scrolled-right');await table.evaluate(e=>e.scrollLeft=0);}}await p.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);await shot(p,'native200-'+a.id+'-lower');}await p.locator('[data-lp-move="-1"]').focus();await p.keyboard.press('Enter');check(await p.locator('#lpTitle').evaluate(e=>e===document.activeElement),'Native 200% shared keyboard Previous restores visible destination focus');await go(p,2,'map-investigation');await p.locator('[data-ev-inspect]').first().click();await p.locator('.ev-loading').waitFor({state:'hidden'});await shot(p,'native200-map-inspection');await p.locator('.ev-stage').focus();await p.keyboard.press('+');await p.keyboard.press('ArrowRight');await p.keyboard.press('0');await p.keyboard.press('Escape');check(await p.locator('[data-ev-inspect]').first().evaluate(e=>e===document.activeElement),'Native 200% map keyboard controls close with restored focus');}finally{await z.close();}
 check(report.pageErrors.length===0,'Zero browser page errors, listeners attached before all navigation');report.complete=true;
}catch(err){report.failure=String(err.stack||err);process.exitCode=1;}finally{await browser.close();fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify({out,complete:report.complete,checks:report.checks.length,captures:report.captures.length,pageErrors:report.pageErrors,failure:report.failure,limits:report.limitations}));
