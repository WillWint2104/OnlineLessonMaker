// Production uses connected controls; page evaluation only reads data/geometry or scrolls.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

// PR #158's prepared-input authoring replay is historical. Current collections use
// the current acceptance/export workflow, never reconstruct from the old draft.
const canonical=JSON.parse(fs.readFileSync('lessons/factorising-quadratics/lesson.json','utf8'));
if(canonical.slides.some(s=>s.exampleCollections?.length)){
 if(process.argv.includes('--produce'))throw Error('The PR #158 preparation input is superseded. Use node scripts/verify-worked-collections.mjs --publish to export the current lesson without replacing its content or IDs.');
 await import('./verify-worked-collections.mjs');
 process.exit(0);
}

const produce=process.argv.includes('--produce'),root='docs/lessons/factorising-quadratics';
const out=process.env.FACTORISING_OUT||'review-delivery/factorising-verification';
const finalJson='lessons/factorising-quadratics/lesson.json',finalHtml='lessons/factorising-quadratics.html';
fs.mkdirSync(out,{recursive:true});
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const source=read(produce?root+'/production-input.json':finalJson);
const app=fs.readFileSync('lesson-studio.html'),hash=b=>createHash('sha256').update(b).digest('hex');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),mode:produce?'production':'verification',appSha256:hash(app),inputSha256:hash(Buffer.from(JSON.stringify(source))),checks:[],captures:[],errors:[]};
report.source=execFileSync('git',['status','--porcelain','--','lesson-studio.html','scripts/produce-factorising-lesson.mjs',finalJson,finalHtml,root+'/production-input.json'],{encoding:'utf8'}).trim()?'working tree based on '+report.head:report.head;
const server=http.createServer((req,res)=>{
 const f=path.resolve('.'+decodeURIComponent(req.url.split('?')[0]));
 if(!f.startsWith(process.cwd()+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(f));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();let ctx=await browser.newContext({viewport:{width:1536,height:960}}),p=await ctx.newPage();
const setup=async()=>{p.setDefaultTimeout(12000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>report.errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('file:')?r.continue():r.abort());};
await setup();
const check=(v,m)=>{assert.ok(v,m);report.checks.push(m);};
const click=s=>p.locator(s).click(),fill=(key,v)=>p.locator('[data-bind="'+key+'"]').fill(v),mx=z=>click('[data-mxsel="'+z+'"]');
const data=()=>p.evaluate(()=>JSON.parse(JSON.stringify(LESSON)));
const load=async lesson=>{await p.goto(origin+'/lesson-studio.html');await click('#modeSeg [data-mode="edit"]');await click('#dataBtn');await p.locator('#jsonArea').fill(JSON.stringify(lesson));await click('#jsonLoad');assert.equal(await p.locator('#jsonErr').textContent(),'');};
const shot=async name=>{const file=path.join(out,name+'.png');fs.mkdirSync(path.dirname(file),{recursive:true});await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:file});report.captures.push(name+'.png');};
const download=async(action,name)=>{const next=p.waitForEvent('download');await action();const file=path.resolve(out,name);await(await next).saveAs(file);return file;};
const saveJson=async name=>{await click('[data-mx-mode="json"]');const file=await download(()=>click('#jsonDl'),name);await click('#modalX');return file;};
const selectActivity=async(i,index)=>{await click('[data-lp-go="'+i+'"]');await click('[data-lp-select="'+index+'"]');};
try{
 await load(source);check(true,'Prepared teaching content imported through JSON controls');
 if(produce){
  const expected=structuredClone(source);
  for(const i of [0,1]){
   await click('[data-lp-go="'+i+'"]');await p.locator('#lpActivityType').selectOption('video');await click('[data-lp-add]');
   await fill('slides.'+i+'.activities.6.title',i?'Optional video: non-monic quadratics':'Optional video: monic quadratics');
   const skill=(await data()).slides[i],video=skill.activities[6];
   assert.equal(video.optionalVideo,true);assert.equal(skill.video.url,'');expected.slides[i].activities.push(video);
   await shot('authoring/video-skill-'+(i+1));
  }
  assert.deepEqual(await data(),expected);check(true,'One real optional-video activity added via the activity picker in each skill; URLs remain empty');
  await selectActivity(0,1);await mx('mx.g.0');await mx('mx.e.0.0');await mx('mx.s.0.0.3');
  await click('[data-mxmove="s.0.0:3:-1"]');
  const steps=expected.slides[0].activities[1].workedExamples[0].examples[0].steps;
  [steps[2],steps[3]]=[steps[3],steps[2]];
  assert.deepEqual(await data(),expected);check(true,'Comparison moved before selected-pair verification through the outline, with its table intact');
  await mx('mx.s.0.0.2');await mx('mx.w.0.0.2.0');
  await fill('slides.0.activities.1.workedExamples.0.examples.0.steps.2.visual.0.stub','Positive factor pair');
  steps[2].visual[0].stub='Positive factor pair';
  await shot('authoring/candidate-table');
  await mx('mx.s.0.0.3');const sb='slides.0.activities.1.workedExamples.0.examples.0.steps.3';
  await fill(sb+'.math','3 × 4 = 12\n3 + 4 = 7');steps[3].math='3 × 4 = 12\n3 + 4 = 7';
  await fill(sb+'.text','The table shows that 3 and 4 have the required sum. Verify their product and sum before writing the brackets.');steps[3].text='The table shows that 3 and 4 have the required sum. Verify their product and sum before writing the brackets.';
  assert.deepEqual(await data(),expected);await shot('authoring/working-and-explanation');check(true,'Mathematical working, matched explanation and candidate-table heading edited through their actual fields');
 }
 await click('[data-mx-mode="study"]');await shot('authoring/preview');
 const before=await data(),draft=await saveJson('first-export.json');assert.deepEqual(read(draft),before);
 await ctx.close();ctx=await browser.newContext({viewport:{width:1536,height:960}});p=await ctx.newPage();await setup();await load(read(draft));
 assert.deepEqual(await data(),before);check(true,'Preview → downloaded JSON → fresh-context reopen preserves the complete lesson and video activities');
 await selectActivity(0,4);await click('[data-lp-partselect="0"]');
 const key='slides.0.activities.4.questions.0.parts.0';
 const finalWording='Choose the pair with sum 8 and explain why the other supplied pair fails.';
 const change=produce?finalWording:'Use your completed sums to justify the selected pair.';
 await fill(key,change);check((await data()).slides[0].activities[4].questions[0].parts[0]===change,'Reopened guided-completion wording edited through the connected question-part control');
 if(!produce)await fill(key,before.slides[0].activities[4].questions[0].parts[0]);
 await shot('authoring/reopened-completion');
 const final=await data(),json=await saveJson('lesson.json');assert.deepEqual(read(json),final);
 if(!produce)assert.deepEqual(final,source);
 await click('[data-mx-mode="study"]');
 const html=await download(()=>click('[data-mx-mode="export"]'),'factorising-quadratics.html');
 if(produce){fs.mkdirSync(path.dirname(finalJson),{recursive:true});fs.copyFileSync(json,finalJson);fs.copyFileSync(html,finalHtml);}
 const published=produce?html:path.resolve(finalHtml);
 await ctx.close();ctx=await browser.newContext({offline:true,viewport:{width:1536,height:960}});p=await ctx.newPage();await setup();
 await p.goto(pathToFileURL(path.resolve(html)).href);assert.deepEqual(await data(),final);check(true,'Fresh offline learner export preserves all authored data');
 if(!produce){await p.goto(pathToFileURL(published).href);assert.deepEqual(await data(),source);check(true,'Committed learner HTML contains exactly the final editable JSON');}
 const sequence=final.slides.flatMap((s,i)=>s.activities.filter(a=>!a.optionalVideo).map(a=>({skill:i,activity:a})));
 assert.equal(sequence.length,12);
 for(const viewport of [{width:1536,height:960},{width:1024,height:768},{width:390,height:844}]){
  await p.setViewportSize(viewport);await p.goto(pathToFileURL(path.resolve(published)).href);
  for(const [index,{skill,activity}]of sequence.entries()){
   assert.equal(await p.locator('.lp-title').textContent(),activity.title);
   assert.equal(await p.locator('.lp-footer span').textContent(),'Activity '+(index%6+1)+' of 6');
   assert.equal(await p.locator('.lp').getAttribute('data-mx-response'),'paper');
   assert.equal(await p.locator('.mx-work,[data-mx-mode],iframe').count(),0);
   if(activity.notes)assert.ok(!(await p.locator('.lp-activity').textContent()).includes('_'),activity.id+' notation has no unrendered markup');
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.querySelector('.mx-page').scrollWidth>document.querySelector('.mx-page').clientWidth+1);assert.equal(overflow,false,activity.id+' '+viewport.width);
   const pairs=await p.locator('.mx-annotated>.mx-step').evaluateAll(es=>es.map(e=>{const m=e.querySelector('.mx-stepm'),a=e.querySelector('.mx-annotation');if(!m||!a)return true;const mb=m.getBoundingClientRect(),ab=a.getBoundingClientRect();return m.scrollWidth<=m.clientWidth+1&&(e.clientWidth>=760?ab.x>=mb.right-1:ab.y>=mb.bottom-1);}));assert.ok(pairs.every(Boolean),activity.id+' pair layout');
   if(activity.id.endsWith('completion')){assert.equal(await p.locator('.mx-annotated,.mx-wexres').count(),0);assert.ok(await p.locator('.mx-blank').count()>0);}
   const dimensions=await p.locator('.mx-page').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight}));
   const capture=viewport.width!==390||['monic-positive','nonmonic-negative'].includes(activity.id);
   let part=0;
   for(let top=0;top<dimensions.scroll;top+=Math.max(1,Math.floor(dimensions.height*0.85))){
    await p.locator('.mx-page').evaluate((e,y)=>e.scrollTop=y,top);
    if(capture)await shot('screenshots/'+viewport.width+'/'+String(index+1).padStart(2,'0')+'-'+activity.id+'-'+(++part));
    if(top+dimensions.height>=dimensions.scroll)break;
   }
   await p.locator('.mx-page').evaluate(e=>e.scrollTop=e.scrollHeight);
   const bottom=await p.locator('.lp-activity').boundingBox(),footer=await p.locator('.lp-footer').boundingBox();assert.ok(bottom.y+bottom.height<=footer.y+1,activity.id+' end reachable');
   if(activity.id.endsWith('practice')){
    const last=p.locator('.mx-sk-qs .mx-item').last(),b=await last.boundingBox();assert.ok(b&&b.y+b.height<=footer.y+1,activity.id+' final question reachable');
    await shot('screenshots/'+viewport.width+'/'+activity.id+'-end');
   }
   check(true,viewport.width+': '+activity.title+' — complete scroll, paper mode, paired reflow and reachable end');
   await click('[data-lp-move="1"]');
  }
  assert.equal(await p.locator('.lp-title').textContent(),'End of lesson');check(true,viewport.width+': all twelve learner activities reach lesson end; empty optional videos are skipped');
 }
 assert.ok(!report.errors.length,report.errors.join('\n'));report.finalJsonSha256=hash(fs.readFileSync(json));report.learnerSha256=hash(fs.readFileSync(published));
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(report.checks.length+' checks; '+report.captures.length+' readable captures');
}finally{await ctx.close();await browser.close();await new Promise(r=>server.close(r));}
