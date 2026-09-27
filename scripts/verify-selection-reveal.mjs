// Measure selection alone, before fill() can scroll an editing control into view.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const out=path.join(process.env.PLAYER_REVIEW_DIR||'review-delivery/annotated','selection');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve('.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(process.cwd()+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(),p=await browser.newPage({viewport:{width:1536,height:960}}),checks=[];p.setDefaultTimeout(10000);p.on('dialog',d=>d.accept());
const click=s=>p.locator(s).click(),mx=z=>click('[data-mxsel="'+z+'"]'),data=()=>p.evaluate(()=>JSON.parse(JSON.stringify(LESSON)));
const eb='slides.0.activities.0.workedExamples.0.examples.0';
const measure=async(bind,label)=>{const b=await p.locator('[data-bind="'+bind+'"]').boundingBox(),panel=await p.locator('#inspector').boundingBox();const visible=b.y>=Math.max(0,panel.y)&&b.y+b.height<=Math.min(960,panel.y+panel.height);checks.push({label,visible,bounds:b});return visible;};
try{
 await p.goto('http://127.0.0.1:'+server.address().port+'/lesson-studio.html');await click('#modeSeg [data-mode="edit"]');await click('#dataBtn');const lesson=JSON.parse(fs.readFileSync('docs/review/shared-player/physics.json'));lesson.slides[0].activities[0].questions[0].parts=['Explain the sampled intervals.','Explain the limitation.'];await p.locator('#jsonArea').fill(JSON.stringify(lesson));await click('#jsonLoad');await click('[data-lp-part="worked"]');await mx('mx.g.0');await mx('mx.e.0.0');await mx('mx.s.0.0.0');
 if(process.env.REPRODUCE==='1'){assert.equal(await measure(eb+'.steps.0.math','Baseline step selected'),false);await p.screenshot({path:path.join(out,'before-step-selected.png')});}
 else{
  for(const top of [0,600,2000]){
   await mx('mx.e.0.0');await p.locator('#inspector').evaluate((e,y)=>e.scrollTop=y,top);await mx('mx.s.0.0.0');assert.ok(await measure(eb+'.steps.0.math','Step from scroll '+top));assert.ok(await measure(eb+'.steps.0.text','Matched explanation from scroll '+top));
   const unchanged=await data(),scroll=await p.locator('#inspector').evaluate(e=>e.scrollTop),field=p.locator('[data-bind="'+eb+'.steps.0.text"]'),original=await field.inputValue();await field.press('Control+End');await field.press('Space');assert.equal(await field.inputValue(),original+' ');assert.equal(await p.locator('#inspector').evaluate(e=>e.scrollTop),scroll);assert.equal(await p.evaluate(()=>document.activeElement.dataset.bind),eb+'.steps.0.text');await field.fill(original);assert.deepEqual(await data(),unchanged);checks.push({label:'Typing from scroll '+top,focusKept:true,scrollKept:true});
   await mx('mx.v.0.0.0');assert.ok(await measure(eb+'.visual.0.stub','Table from scroll '+top));
  }
  await mx('mx.g.0');await click('[data-mxadd="f.0"]');await mx('mx.f.0');assert.ok(await measure('slides.0.activities.0.workedExamples.0.relations.0.figure.domain.xMin','Graph domain'));
  await click('[data-lp-part="questions"]');await click('[data-lp-partselect="1"]');assert.ok(await measure('slides.0.activities.0.questions.0.parts.1','Question part b'));
  await p.screenshot({path:path.join(out,'after-question-part-selected.png')});
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify(checks));
}finally{await browser.close();await new Promise(r=>server.close(r));}
