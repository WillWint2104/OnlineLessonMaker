// Real UI fixtures share one stylesheet. Optional SURFACE_REF captures the unchanged baseline.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const ref=process.env.SURFACE_REF, out=process.env.SURFACE_OUT||(process.env.PLAYER_REVIEW_DIR?path.join(process.env.PLAYER_REVIEW_DIR,'surface-variations'):'docs/review/shared-surfaces/variations');
fs.mkdirSync(out,{recursive:true});
const app=ref?execFileSync('git',['show',ref+':lesson-studio.html'],{maxBuffer:8e6}):fs.readFileSync('lesson-studio.html');
const server=http.createServer((req,res)=>{
 const file=path.resolve('.'+decodeURIComponent(req.url.split('?')[0]));
 if(req.url==='/lesson-studio.html'){res.setHeader('Content-Type','text/html');return res.end(app);}
 if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch(),p=await browser.newPage({viewport:{width:1536,height:960}});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=!ref&&execFileSync('git',['status','--porcelain','--','lesson-studio.html'],{encoding:'utf8'}).trim();
const report={ref:ref||(dirty?'working-tree (uncommitted, based on '+head+')':head),appSha256:createHash('sha256').update(app).digest('hex'),checks:[],captures:[],errors:[]};
const check=(ok,message)=>{assert.ok(ok,message);report.checks.push(message);};
p.on('pageerror',e=>report.errors.push(e.message));
await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
const read=n=>JSON.parse(fs.readFileSync('docs/review/shared-player/'+n+'.json'));
const load=async L=>{
 const viewport=p.viewportSize();await p.setViewportSize({width:1536,height:960});
 await p.goto(origin+'/lesson-studio.html');await p.locator('#modeSeg [data-mode="edit"]').click();
 await p.locator('#dataBtn').click();await p.locator('#jsonArea').fill(JSON.stringify(L));await p.locator('#jsonLoad').click();
 check(!(await p.locator('#jsonErr').textContent()),'UI import '+L.meta.title);
 await p.locator('[data-mx-mode="study"]').click();
 await p.setViewportSize(viewport);
 if(viewport.width<900&&await p.locator('.mx-scrim').isVisible())await p.locator('[data-rp-navtoggle]').first().click();
 await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
};
const practice=async()=>{
 if(!await p.locator('[data-lp-go="0:monic-practice"]').isVisible())await p.locator('[data-rp-navtoggle]').first().click();
 await p.locator('[data-lp-go="0:monic-practice"]').click();
};
const shot=async name=>{await p.screenshot({path:path.join(out,name+'.png')});report.captures.push({name,viewport:p.viewportSize()});};
const bounds=async selector=>p.locator(selector).first().boundingBox();
async function whiteContent(label){
 check(await p.evaluate(()=>[...document.querySelectorAll('.lp-title,.lp-location,.mx-stem,.mx-sk-ask,.mx-itembd p,.mx-stept')].every(el=>{
  for(let n=el;n&&!n.classList.contains('mx-page');n=n.parentElement){const c=getComputedStyle(n).backgroundColor;if(c==='rgb(255, 255, 255)')return true;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent')return false;}return false;
 })),label+' instructional text has a white ancestor');
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.mx-page').scrollWidth<=document.querySelector('.mx-page').clientWidth+1),label+' no horizontal page overflow');
}
async function lastPrompt(label){
 const parts=p.locator('.mx-sk-qs .mx-parts .mx-part');
 const targets=[p.locator('.mx-sk-qs>.mx-item').last(),...await parts.all()];
 for(const target of targets){await target.scrollIntoViewIfNeeded();const b=await target.boundingBox(),f=await bounds('.lp-footer');check(b.y+b.height<=f.y+1,label+' question/subpart reachable above footer');}
}
try{
 for(const width of [1536,1024,768]){
  await p.setViewportSize({width,height:width===1536?960:768});
  for(const subject of ['qualitative','physics']){
   await load(read(subject));if(!ref){await whiteContent(subject+' '+width);
    if(subject==='physics'&&width===1536){const working=await bounds('.mx-wexsec'),table=await bounds('.mx-wexaside');check(table.x>=working.x+working.width,'supporting table aligns beside working at reading width');check(Math.abs(table.y-working.y)<2,'working and supporting table top aligned');}
   }await shot(subject+'-'+width);
   await p.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);await shot(subject+'-'+width+'-end');
  }
  for(const mode of ['paper','typed','pen']){
   const L=read('factorising');L.meta.responseMode=mode;await load(L);await practice();
   await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
   if(!ref){await whiteContent(mode+' '+width);await lastPrompt(mode+' '+width);}
   await p.locator('.mx-page').evaluate(e=>e.scrollTop=0);await shot(mode+'-'+width);
   if(!ref&&mode!=='paper'){
    check(await p.locator('.mx-wb').evaluate(e=>getComputedStyle(e).overflow==='hidden'&&getComputedStyle(e).borderRadius==='12px'),'workbook uses the shared surface edge');
    const q=await bounds('.mx-content'),w=await bounds('.mx-work');
    if(width===1536){check(Math.abs(q.y-w.y)<1,'digital panes top aligned');check(q.width-56>=440&&w.width>=420,'digital panes retain usable minimum widths');}
    else check(w.y>=q.y+q.height,'tablet panes stack before narrowing');
    check(w.height>=420&&w.height<=600,'workbook has independent useful height');
    await p.locator('.mx-pagetabs').scrollIntoViewIfNeeded();let tabs=await bounds('.mx-pagetabs'),footer=await bounds('.lp-footer');check(tabs.y+tabs.height<=footer.y,'page controls reachable');await shot(mode+'-'+width+'-workspace');
    await p.locator('.mx-work [data-mx-view="workbook"]').click();check(await p.locator('.mx-content').isHidden(),'Expand preserves existing workspace view');
    await p.locator('.lp-response-view [data-mx-view="questions"]').click();check(await p.locator('.mx-content').isVisible(),'questions reachable after Expand');
   }
  }
 }
 await p.setViewportSize({width:1536,height:960});
 const long=read('qualitative');long.meta.title='Long source variation';long.slides[0].activities[0].notes[0].body=('This longer fictional source asks students to distinguish a stated intention from evidence that the event occurred. ').repeat(18);
 await load(long);if(!ref){await whiteContent('long source');const b=await bounds('.lp-activity');check(b.width<=842,'reading surface follows 760px measure plus padding');}await shot('long-source');
 const short=read('qualitative');short.meta.title='Short source variation';short.slides[0].activities[0].notes=[{term:'Notice',body:'The room is planned for Saturday.'}];short.slides[0].activities[0].questions=[{id:'short-q',stem:'What remains uncertain?'}];
 await load(short);if(!ref)await whiteContent('short source');await shot('short-source');
 const varied=read('factorising'),act=varied.slides[0].activities.find(a=>a.id==='monic-practice');
 varied.meta.title='Long expressions variation';act.questions=Array.from({length:12},(_,i)=>({id:'long-'+i,stem:'Expand, simplify, and explain which terms cancel.',parts:['_x_^2 + 7_x_ + 12','(2_x_ + 3)(_x_ - 4) + (5_x_ - 6)(_x_ + 7) - (3_x_ + 2)(_x_ - 5)']}));
 for(const [width,height,label] of [[1024,768,'tablet'],[768,480,'200-percent-reflow'],[390,844,'phone']]){
  await p.setViewportSize({width,height});await load(varied);await practice();
  if(width<900&&await p.locator('.mx-scrim').isVisible())await p.locator('[data-rp-navtoggle]').first().click();
  if(!ref){await whiteContent(label);await lastPrompt(label);}
  await p.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);await shot('long-practice-'+label+'-end');
  await p.locator('[data-lp-move="-1"]').click();
  check(await p.evaluate(()=>document.querySelector('.mx-page').scrollTop===0&&document.activeElement.classList.contains('lp-title')),'navigation resets heading at '+label);
 }
 // Short viewports must accommodate the entire digital workbook, including its controls.
 for(const mode of ['typed','pen']){
  await p.setViewportSize({width:768,height:480});const L=read('factorising');L.meta.responseMode=mode;await load(L);await practice();
  if(!ref){
   await p.locator('.mx-work').scrollIntoViewIfNeeded();
   const w=await bounds('.mx-work'),page=await bounds('.mx-page'),footer=await bounds('.lp-footer'),sheet=await bounds('.mx-sheet');
   check(w.y>=page.y-1&&w.y+w.height<=footer.y+1,mode+' whole workbook fits short viewport');
   check(sheet.height>=140,mode+' short viewport retains useful writing area');
   for(const selector of ['.mx-wsbar','.mx-pagetabs']){const b=await bounds(selector);check(b.y>=page.y-1&&b.y+b.height<=footer.y+1,mode+' short viewport controls visible '+selector);}
  }
  await shot(mode+'-short-viewport');
 }
 // A real figure-bearing composition continues to use the existing geometry/figure engine.
 const graph=read('physics'),groups=JSON.parse(fs.readFileSync('docs/atlas/lesson/quadratics.app.json')).slides[0].groups;
 graph.meta.title='Figure composition variation';graph.slides[0].activities[0].workedExamples=[groups.find(g=>JSON.stringify(g).includes('"kind":"figure"'))];
 await p.setViewportSize({width:1536,height:960});await load(graph);await p.locator('[data-mx-state="visual"]:visible').click();if(!ref){check(await p.locator('[data-lp-arrangement="media"]').count()===1,'figure role selects wider media span');check(await p.locator('.tp-fig-svg:visible').count()>0,'existing figure renderer remains visible');}await shot('figure-composition');
 // Export and author preview use the same surface. The published document opens in a fresh offline context.
 await load(read('factorising'));await p.locator('[data-mx-mode="edit"]').click();if(!ref)check(await p.locator('.lp-activity').count()===1,'author preview shares activity surface');await shot('author-preview');
 await p.locator('[data-mx-mode="study"]').click();const download=p.waitForEvent('download');await p.locator('[data-mx-mode="export"]').click();const exported=path.resolve(out,'published-factorising.html');await(await download).saveAs(exported);
 const ctx=await browser.newContext({offline:true,viewport:{width:1536,height:960}}),fresh=await ctx.newPage();fresh.on('pageerror',e=>report.errors.push(e.message));await fresh.goto(pathToFileURL(exported).href);
 if(!ref)check(await fresh.locator('.lp-activity').count()===1,'independent offline publication shares surface');
 check(await fresh.locator('[data-mx-mode]').count()===0,'publication omits author controls');
 await fresh.screenshot({path:path.join(out,'published-opening.png')});
 await ctx.close();check(!report.errors.length,'no browser errors');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(report.checks.length+' surface checks passed');
}finally{await browser.close();await new Promise(r=>server.close(r));}
