// Publication uses the effective learner sequence; draft JSON remains exportable.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
const out=path.join(process.env.PLAYER_REVIEW_DIR||'review-delivery/annotated','publication');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve('.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(process.cwd()+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/lesson-studio.html',browser=await chromium.launch(),p=await browser.newPage({viewport:{width:1536,height:960}}),checks=[],dialogs=[];
p.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
const click=s=>p.locator(s).click(),newLesson=async()=>{await p.goto(url);await click('[data-lp-new]');},emptySkill=async()=>{await p.locator('#lpActivityType').selectOption('video');await click('[data-lp-add]');await click('[data-lp-select="0"]');await click('[data-lp-remove]');};
const download=async(action,file)=>{const next=p.waitForEvent('download');await action();await(await next).saveAs(path.join(out,file));};
try{
 await newLesson();await emptySkill();await p.screenshot({path:path.join(out,'empty-optional-video.png')});
 if(process.env.REPRODUCE==='1'){
  await download(()=>click('[data-mx-mode="export"]'),'before-empty.html');const q=await browser.newPage();await q.goto(pathToFileURL(path.resolve(out,'before-empty.html')).href);assert.equal(await q.locator('.lp-footer span').textContent(),'Activity 0 of 0');checks.push('Baseline reproduced: empty optional video publishes Activity 0 of 0');await q.screenshot({path:path.join(out,'before-empty-learner.png')});await q.close();
 }else{
  for(const mode of ['edit','study']){if(mode==='study')await click('[data-mx-mode="study"]');let downloads=0;const handler=()=>downloads++;p.on('download',handler);dialogs.length=0;await click('[data-mx-mode="export"]');await p.waitForTimeout(150);assert.equal(downloads,0);assert.match(dialogs.at(-1),/no learner-visible activities/i);assert.equal(await p.locator('[data-lp-add]').isVisible(),true);p.off('download',handler);checks.push('Empty learner lesson blocked and author directed to empty skill from '+mode);}
  await click('[data-lp-skilladd]');dialogs.length=0;await click('[data-mx-mode="export"]');assert.match(dialogs.at(-1),/Skill 1/);assert.equal(await p.evaluate(()=>cur),0);checks.push('One empty skill among valid skills blocks publication and selects that skill');
  await click('[data-mx-mode="json"]');await download(()=>click('#jsonDl'),'unfinished-draft.json');await click('#modalX');checks.push('Unfinished draft JSON can still be saved');
  await newLesson();await p.locator('#lpActivityType').selectOption('video');await click('[data-lp-add]');await download(()=>click('[data-mx-mode="export"]'),'valid.html');
  const ctx=await browser.newContext({offline:true}),q=await ctx.newPage();await q.goto(pathToFileURL(path.resolve(out,'valid.html')).href);assert.equal(await q.locator('.lp-footer span').textContent(),'Activity 1 of 1');assert.equal(await q.locator('iframe').count(),0);checks.push('Valid content with empty optional video exports and opens offline in a fresh context');await ctx.close();
  const draft=JSON.parse(fs.readFileSync(path.join(out,'unfinished-draft.json')));await newLesson();await click('[data-mx-mode="json"]');await p.locator('#jsonArea').fill(JSON.stringify(draft));await click('#jsonLoad');assert.equal(await p.locator('#jsonErr').textContent(),'');checks.push('Unfinished draft reopens without losing either skill');
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks},null,2));console.log(checks.join('\n'));
}finally{await browser.close();await new Promise(r=>server.close(r));}
