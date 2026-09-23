import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=process.cwd(), out=path.join(root,'docs/review/shared-player');
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(p));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();const errors=[];let assertions=0;
function check(value,msg){assert.ok(value,msg);assertions++;console.log('PASS '+msg);}
const p=await browser.newPage({viewport:{width:1536,height:960}});
p.on('pageerror',e=>errors.push(e.message));
await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
const load=async (L,reload=true)=>{
 if(reload){await p.goto(origin+'/lesson-studio.html');await p.locator('#modeSeg [data-mode="edit"]').click();await p.locator('#dataBtn').click();}
 else await p.locator('[data-mx-mode="json"]').click();
 await p.locator('#jsonArea').fill(JSON.stringify(L));await p.locator('#jsonLoad').click();
 check(!(await p.locator('#jsonErr').textContent()),'JSON import '+L.meta.title);
 await p.locator('[data-mx-mode="study"]').click();
};
const shot=async name=>{await p.screenshot({path:path.join(out,name+'.png')});};
const read=n=>JSON.parse(fs.readFileSync(path.join(out,n+'.json')));
try{
 const L=read('factorising');
 for(const [w,h,name] of [[1536,960,'desktop'],[1024,768,'tablet']]){
  await p.setViewportSize({width:w,height:h});await load(L);
  check(await p.locator('.lp').count()===1,'neutral shared player at '+name);
  check(await p.locator('.mx-sk-vmissing').count()===0,'missing video omitted for learner');
  await shot(name+'-01-opening');
  await p.locator('[data-lp-move="1"]').click();await shot(name+'-02-working');
  check(await p.locator('.mx-wexex').count()===1,'one complete example per authored activity');
  check(await p.evaluate(()=>{const q=document.querySelector('.mx-wexask').getBoundingClientRect(),w=document.querySelector('.mx-wexwork').getBoundingClientRect();return w.top>=q.bottom-1;}),'question precedes working, no empty parallel column');
  await p.locator('.mx-wexanswer,.mx-wexans').first().count();
  await p.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);await shot(name+'-02b-working-end');
  await p.locator('[data-lp-go="0:monic-practice"]').click();await shot(name+'-03-practice');
  check(await p.evaluate(()=>document.activeElement.classList.contains('lp-title')&&document.querySelector('.mx-page').scrollTop===0),'activity navigation resets reading position and focuses heading');
  check(await p.locator('.lp input,.lp canvas,.lp [contenteditable="true"]').count()===0,'paper has no digital response surfaces');
  await p.locator('[data-lp-move="1"]').click();check((await p.locator('.lp-location').textContent()).includes('Skill 2'),'next crosses skills');
  await p.locator('[data-lp-go="1:nonmonic-practice"]').click();await p.locator('[data-lp-move="1"]').click();
  check((await p.locator('.lp-title').textContent())==='End of lesson','explicit end state');
  await p.locator('[data-lp-move="-1"]').click();check((await p.locator('.lp-title').textContent())!=='End of lesson','revisit from end');
 }
 for(const name of ['qualitative','physics']){await p.setViewportSize({width:1536,height:960});await load(read(name));await shot(name);check(await p.locator('.mx-sk-notes').count()>0,'shared explanation '+name);await p.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);await shot(name+'-end');}
 const alternate=structuredClone(L);alternate.meta.colors={accent:'#73533d'};alternate.meta.theme='ww1';await load(alternate);
 check(await p.locator('.lp').count()===1&&await p.locator('.mx-wb').count()===0,'cosmetic theme cannot change capabilities or policy');
 await p.locator('[data-mx-mode="present"]').click();await p.locator('.lp-title').click();
 check((await p.locator('.lp-title').textContent())==='Reverse the expansion','Present content click cannot skip activities');
 await p.locator('[data-lp-move="1"]').click();check((await p.locator('.lp-title').textContent())==='Both signs positive','Present uses the same activity navigation');await p.locator('#presentExit').click();
 const bad=structuredClone(L);bad.slides[0].activities[0].unsupportedWidget={};
 await p.locator('[data-mx-mode="json"]').click();await p.locator('#jsonArea').fill(JSON.stringify(bad));await p.locator('#jsonLoad').click();
 check((await p.locator('#jsonErr').textContent()).includes('Unsupported activity field'),'invalid component rejected before import');await p.keyboard.press('Escape');
 const three=structuredClone(L);const third=structuredClone(three.slides[0]);third.id='third';third.activities=third.activities.map(a=>({...a,id:'third-'+a.id,questions:a.questions?.map(q=>({...q,id:'third-'+q.id}))}));three.slides.push(third);await load(three);
 check(await p.locator('.mx-navitem').count()===3,'three skills from JSON');
 await load(L);await p.setViewportSize({width:390,height:844});await shot('phone');
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'phone has no document horizontal overflow');await p.setViewportSize({width:1536,height:960});
 for(const responseMode of ['typed','pen']){
  await load({...L,meta:{...L.meta,responseMode}});await p.locator('[data-lp-go="0:monic-practice"]').click();
  check(await p.locator('.mx-wb').count()===1,responseMode+' workbook');
  if(responseMode==='typed'){
   const cells=p.locator('.mx-cell');for(let i=0;i<await cells.count();i++)await cells.nth(i).fill(String(i+11));
   await p.locator('[data-mx-typed]').fill('My retained working');
   await p.locator('[data-lp-go="0:monic-explain"]').click();await p.locator('[data-lp-go="0:monic-practice"]').click();
   check((await p.locator('[data-mx-typed]').textContent()).includes('retained'),'typed responses survive navigation');
   check(JSON.stringify(await p.locator('.mx-cell').evaluateAll(es=>es.map(e=>e.value)))===JSON.stringify(['11','12','13','14']),'table row responses remain distinct');
   await p.locator('.mx-wb [data-mx-view="workbook"]').click();await p.locator('.mx-viewsw [data-mx-view="questions"]').click();
   check(await p.locator('.mx-sk-qs').isVisible(),'expanded workbook can return to questions');
  }
  if(responseMode==='pen'){
   const box=await p.locator('.mx-wbcanvas').boundingBox();await p.mouse.move(box.x+30,box.y+30);await p.mouse.down();await p.mouse.move(box.x+120,box.y+90,{steps:8});await p.mouse.up();
   const before=await p.evaluate(()=>JSON.stringify(TP_RESP));await p.locator('[data-lp-go="0:monic-explain"]').click();await p.locator('[data-lp-go="0:monic-practice"]').click();check(await p.evaluate(b=>JSON.stringify(TP_RESP)===b,before),'pen stroke state survives navigation');
  }
  await shot(responseMode);await load(L,false);check(await p.locator('.mx-wb').count()===0,responseMode+' → paper load resets policy');
 }
 await load(L);await p.locator('[data-mx-mode="edit"]').click();
 await p.locator('[data-lp-add]').click();await p.locator('[data-bind$=".activities.7.title"]').count();
 const field=p.locator('#inspector [data-bind$=".title"]').last();await field.fill('UI-authored explanation');
 await p.locator('#inspector [data-bind$=".notes.0.body"]').fill('Content written through the inspector.');
 await p.locator('[data-lp-reorder="-1"]').click();
 check(await p.evaluate(()=>LESSON.slides[0].activities.at(-2).title==='UI-authored explanation'),'UI add / edit / reorder');
 await p.locator('[data-lp-skillmove="1"]').click();check(await p.evaluate(()=>LESSON.slides[1].id==='monic'),'UI skill reorder');
 await shot('authoring');
 await p.locator('[data-mx-mode="study"]').click();check((await p.locator('.lp-title').textContent())==='UI-authored explanation','preview shares renderer');
 const authored=await p.evaluate(()=>JSON.stringify(LESSON));
 await p.locator('[data-mx-mode="json"]').click();const jsonDownload=p.waitForEvent('download');await p.locator('#jsonDl').click();await (await jsonDownload).saveAs(path.join(out,'authored-roundtrip.json'));
 await p.locator('#jsonArea').fill(fs.readFileSync(path.join(out,'authored-roundtrip.json'),'utf8'));await p.locator('#jsonLoad').click();
 check(await p.evaluate(expected=>JSON.stringify(LESSON)===expected,authored),'JSON export/reimport preserves all authored content and identities');
 const downloadPromise=p.waitForEvent('download');await p.locator('[data-mx-mode="export"]').click();const download=await downloadPromise;
 await download.saveAs(path.join(out,'published-authoring.html'));
 const fresh=await browser.newPage();await fresh.goto(origin+'/docs/review/shared-player/published-authoring.html');
 check(await fresh.locator('.lp').count()===1,'independent published learner entry');
 check(await fresh.evaluate(expected=>JSON.stringify(LESSON)===expected,authored),'published HTML preserves authored content and identities');
 check(await fresh.locator('[data-mx-mode]').count()===0,'published controls absent');await fresh.screenshot({path:path.join(out,'independent.png')});await fresh.close();
 await load(L);const d=p.waitForEvent('download');await p.locator('[data-mx-mode="export"]').click();await (await d).saveAs(path.join(out,'published-factorising.html'));
 const longest=L.slides.flatMap((s,i)=>s.activities.map(a=>({i,a,n:(a.workedExamples||[]).reduce((n,g)=>n+g.examples.reduce((n,e)=>n+e.steps.length,0),0)}))).sort((a,b)=>b.n-a.n)[0];
 for(const [w,h,name] of [[1536,960,'desktop'],[1024,768,'tablet']]){
  await p.setViewportSize({width:w,height:h});await p.locator(`[data-lp-go="${longest.i}"]`).click();await p.locator(`[data-lp-go="${longest.i}:${longest.a.id}"]`).click();await shot(name+'-longest');await p.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);await shot(name+'-longest-end');
  check(!(await p.locator('.mx-page').innerText()).match(/_[a-zA-Z]+_/),'longest example has no raw notation markers');
 }
 const video=structuredClone(L);video.slides[0].video.url='https://www.youtube.com/watch?v=ABCDEFGHIJK';await load(video);await p.locator('[data-lp-go="0:monic-video"]').click();
 check((await p.locator('iframe').getAttribute('src')).includes('/embed/ABCDEFGHIJK'),'safe video URL normalized (playback blocked deliberately)');
 await p.goto(origin+'/lesson-studio.html');await p.locator('[data-lp-new]').click();
 check(await p.locator('#inspector [data-lp-add]').count()===1,'new activity lesson starts in graphical editor');
 check(await p.evaluate(()=>LESSON.meta.responseMode==='paper'&&!!LESSON.meta.id),'new lesson has stable id and paper default');
 check(errors.length===0,'no browser errors: '+errors.join('; '));
 console.log(assertions+' assertions passed');
}finally{await browser.close();server.close();}
