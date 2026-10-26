import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const root=process.cwd(),out=path.resolve(process.env.G03_OUT||'review-delivery/geography-g03/current');
fs.mkdirSync(out,{recursive:true});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),appSha256:createHash('sha256').update(fs.readFileSync('lesson-studio.html')).digest('hex'),trackedStatus:execFileSync('git',['status','--porcelain','-uno'],{encoding:'utf8'}).trim(),checks:[],captures:[],errors:[],zoom:[]};
const check=(c,name)=>{assert.ok(c,name);report.checks.push(name);console.log('PASS '+name);};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(fs.readFileSync(f));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch(),fixtures=['year-10-wellbeing','year-9-urbanisation'];
const setup=p=>{p.on('pageerror',e=>report.errors.push(e.message));p.setDefaultTimeout(12000);};
const load=async(p,lesson)=>{await p.goto(base+'/lesson-studio.html');await p.locator('#modeSeg [data-mode="edit"]').click();await p.locator('#dataBtn').click();await p.locator('#jsonArea').fill(JSON.stringify(lesson));await p.locator('#jsonLoad').click();check(!(await p.locator('#jsonErr').textContent()),'Valid JSON imports through shared editor: '+lesson.meta.id);};
const save=async(p,selector,file)=>{const event=p.waitForEvent('download');await p.locator(selector).click();await(await event).saveAs(path.join(out,file));};
const shot=async(p,name)=>{const cdp=await p.context().newCDPSession(p);try{const r=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));}finally{await cdp.detach();}report.captures.push(name+'.png');};
const containment=async(p,label)=>{const m=await p.evaluate(()=>{const main=document.querySelector('.mx-page'),a=document.querySelector('.lp-activity');return {page:document.documentElement.scrollWidth<=innerWidth+1,main:main.scrollWidth<=main.clientWidth+1,content:a.scrollWidth<=a.clientWidth+1,width:innerWidth};});check(m.page&&m.main&&m.content,label+' no horizontal clipping/overflow');};
try{
 for(const name of fixtures){
  const fixture=JSON.parse(fs.readFileSync('tests/widgets/geography-g03/fixtures/'+name+'.json'));
  const p=await browser.newPage({viewport:{width:1536,height:1000}});setup(p);await load(p,fixture);
  await p.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities[0].id));
  check(await p.locator('.geo-g03').count()===1,name+' uses G03 inside actual shared player');
  check(await p.locator('.geo-g03-notes li').count()===3,name+' three essential notes');
  check(await p.locator('.geo-g03-visual img').evaluate(e=>e.complete&&e.naturalWidth>0),name+' local meaningful diagram renders');
  check(await p.locator('.mx-work').count()===0&&await p.locator('.geo-g03-check').count()===0,name+' no compulsory question/workspace');
  const ab='slides.0.activities.0',nb=ab+'.keyNotes.0';
  const original=fixture.slides[0].activities[0].keyNotes[0];
  await p.locator(`[data-bind="${nb}"]`).fill(original+' Edited in the shared inspector.');
  check((await p.evaluate(()=>LESSON.slides[0].activities[0].keyNotes[0])).endsWith('shared inspector.'),name+' inspector writes key notes');
  await p.locator(`[data-bind="${nb}"]`).fill(original);
  await p.locator(`[data-journey-array="${ab}.keyNotes:0:1"]`).click();
  check(await p.evaluate(()=>LESSON.slides[0].activities[0].keyNotes[1])===original,name+' shared ordering preserves note text');
  await p.locator(`[data-journey-array="${ab}.keyNotes:1:-1"]`).click();
  await p.locator('[data-mx-mode="json"]').click();await save(p,'#jsonDl',name+'.json');await p.locator('#modalX').click();
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,name+'.json'))),fixture);check(true,name+' authored JSON preserves all supported fields and provenance');
  await p.locator('[data-mx-mode="study"]').click();
  await save(p,'[data-mx-mode="export"]',name+'.html');
  await p.close();
  const context=await browser.newContext({viewport:{width:1536,height:1000},offline:true}),q=await context.newPage();setup(q);
  await q.goto(pathToFileURL(path.join(out,name+'.html')).href);await q.evaluate(()=>document.fonts.ready);await q.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities[0].id));
  check(await q.locator('.geo-g03').count()===1,name+' exported standalone learner opens offline');
  check(await q.locator('[data-mx-mode="edit"]').count()===0,name+' learner export has no author controls');
  const exported=await q.evaluate(()=>JSON.parse(JSON.stringify(LESSON)));
  check(JSON.stringify(exported.slides)===JSON.stringify(fixture.slides),name+' publication retains authored explanation, local visual and note fields');
  for(const [label,width,height]of [['desktop',1536,1000],['tablet',1024,768],['mobile',390,844]]){
   await q.setViewportSize({width,height});await q.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities[0].id));await q.locator('.mx-page').evaluate(e=>e.scrollTop=0);await containment(q,name+' '+label);await shot(q,name+'-'+label);
   await q.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);check(await q.locator('.geo-g03-notes').isVisible(),name+' '+label+' essential notes reachable');await shot(q,name+'-'+label+'-notes');
  }
  await q.setViewportSize({width:1536,height:1000});
  const next=q.locator('[data-lp-move="1"]');await next.focus();await q.keyboard.press('Enter');
  check(await q.locator('.geo-g03-visual').count()===0,name+' keyboard Next reaches no-image example without an empty slot');
  check(await q.locator('#lpTitle').evaluate(e=>e===document.activeElement),name+' navigation focus moves to heading');
  await shot(q,name+'-no-image');await q.locator('[data-lp-move="-1"]').click();
  check(await q.locator('.geo-g03-visual').count()===1,name+' Previous restores original concept');
  await context.close();
 }
 const p=await browser.newPage({viewport:{width:1536,height:1000}});setup(p);
 const fixture=JSON.parse(fs.readFileSync('tests/widgets/geography-g03/fixtures/year-10-wellbeing.json'));
 await load(p,fixture);
 check(await p.evaluate(()=>{const a=LESSON.slides[0].activities[0],before=JSON.stringify(a);geoG03Render({...a,title:'<script>bad()</script>',notes:[{body:'<img src=x onerror=bad()>'}],keyNotes:['<svg onload=bad()>']},0);const html=geoG03Render({...a,notes:[{body:'<script>bad()</script>'}]},0);return !html.includes('<script>')&&JSON.stringify(a)===before;}),'Authored text is escaped and rendering does not mutate JSON');
 check(await p.evaluate(()=>{const a=structuredClone(LESSON.slides[0].activities[0]);a.keyNotes={bad:true};try{geoG03Validate(a);return false;}catch{return true;}}),'Invalid key-note shape is rejected');
 check(await p.evaluate(()=>{const a=structuredClone(LESSON.slides[0].activities[0]);a.image.alt='';try{geoG03Validate(a,true);return false;}catch{return true;}}),'Missing visual alternative text blocks publication');
 await p.evaluate(()=>{const a=LESSON.slides[0].activities[0];a.image.src='/missing-g03-image.png';lpNavigate(0,a.id);});
 await p.waitForFunction(()=>!document.querySelector('.geo-g03-unavailable').hidden);
 check(await p.locator('.geo-g03-notes li').count()===3,'Unavailable visual keeps explanation, description and essential notes');
 await p.evaluate(()=>{const a=LESSON.slides[0].activities[0];delete a.image;a.questions=[{id:'hdi-optional-check',stem:'Why can a national average conceal differences?',parts:['Explain using the notes.']}];renderSlide();});
 check(await p.locator('.geo-g03-check').count()===1&&await p.locator('.mx-work').count()===1,'Optional check uses existing questions and shared response workspace');
 await p.close();
 for(const factor of [1,2]){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'g03-native-zoom-'));fs.mkdirSync(path.join(profile,'Default'));fs.writeFileSync(path.join(profile,'Default/Preferences'),JSON.stringify({partition:{default_zoom_level:{x:Math.log(factor)/Math.log(1.2)}}}));
  const ctx=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:['--window-size=1536,1000']});
  try{const p=ctx.pages()[0];setup(p);for(const name of fixtures){await p.goto(pathToFileURL(path.join(out,name+'.html')).href);await p.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities[0].id));const metrics=await p.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom}));check(Math.abs(metrics.dpr-factor)<.02&&['1','normal'].includes(metrics.cssZoom),name+' native '+factor*100+'% browser zoom');await containment(p,name+' native '+factor*100+'%');await shot(p,name+'-native-'+factor*100);await p.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);await shot(p,name+'-native-'+factor*100+'-notes');report.zoom.push({name,factor,metrics});}}finally{await ctx.close();}
 }
 check(report.errors.length===0,'Zero browser page errors');
 report.headAfter=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 check(report.headAfter===report.head,'Source commit unchanged during review');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
 console.log('G03 complete: '+report.checks.length+' checks, '+report.captures.length+' screenshots.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
