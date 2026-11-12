import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const root=process.cwd(),out=path.resolve(process.env.ATLAS_OUT||'review-delivery/atlas-stage1-check');
const fixtures='docs/review/geography-atlas-stage1/fixtures/';
const baseline=execFileSync('git',['show','a51bb82abbe2e7870ba860e29796f6057a2ec216:lesson-studio.html'],{maxBuffer:25*1024*1024});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const fixturesByName={map:read(fixtures+'megacity.json'),table:read(fixtures+'population.json')};
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  appSha256:hash(fs.readFileSync('lesson-studio.html')),checks:[],captures:[],errors:[],comparisons:[],complete:false};
const shots=path.join(out,'captures'),exports=path.join(out,'exports');
for(const dir of [shots,exports])fs.mkdirSync(dir,{recursive:true});
function check(condition,label){assert.ok(condition,label);report.checks.push(label);console.log('PASS '+label);}

const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://127.0.0.1');
  if(url.pathname==='/baseline.html'){response.setHeader('Content-Type','text/html');response.end(baseline);return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
  response.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const setup=async page=>{
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('dialog',dialog=>{console.log('Browser dialog '+dialog.message());return dialog.dismiss();});
  await page.route(/^https?:/,route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  page.setDefaultTimeout(10000);
};
async function importLesson(page,data,application='lesson-studio.html'){
  await page.goto(origin+'/'+application,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#modeSeg [data-mode="edit"]').click();
  await page.locator('#dataBtn').click();
  await page.locator('#jsonArea').fill(JSON.stringify(data));
  await page.locator('#jsonLoad').click();
  return (await page.locator('#jsonErr').textContent())||'';
}
async function study(page){
  await page.locator('[data-mx-mode="study"]').click();
  await page.evaluate(()=>document.fonts.ready);
}
async function shot(page,name,details={}){
  await page.mouse.move(0,0);
  const file=path.join(shots,name+'.png');
  if(details.dpr===2){
    const cdp=await page.context().newCDPSession(page);
    try{
      const surface=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
      const pixels=Buffer.from(surface.data,'base64');
      assert.ok(Math.abs(pixels.readUInt32BE(16)-details.width*details.dpr)<=2,'Capture includes the full native browser width');
      fs.writeFileSync(file,pixels);
    }finally{
      await cdp.detach();
    }
  }else await page.screenshot({path:file,animations:'disabled'});
  report.captures.push({file:'captures/'+name+'.png',...details});
}
async function save(page,control,file){
  const wait=page.waitForEvent('download');
  await page.locator(control).click();
  await (await wait).saveAs(file);
}
async function inspect(page,mode='inspect'){
  const opener=page.locator('[data-ga-root] [data-ev-'+mode+']');
  await opener.press('Enter');
  const dialog=page.locator('.ev-dialog');
  await dialog.waitFor({state:'visible'});
  if(mode==='inspect'){
    await page.waitForFunction(()=>document.querySelector('.ev-dialog')?.evViewer?.world.getItemCount()===1);
    await page.locator('[data-ev-command="in"]').click();
    await page.locator('.ev-stage').press('ArrowRight');
  }else check((await dialog.innerText()).includes('Rights / licence'),'Host source details retain licensing');
  return async()=>{
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'detached'});
    check(await opener.evaluate(element=>element===document.activeElement),'Host source dialog returns keyboard focus');
  };
}
async function learner(page,name,size,native=false){
  const fixture=fixturesByName[name];
  if(!native){
    check(!await importLesson(page,fixture),name+' '+size+' imports through the real authoring JSON dialog');
    await study(page);
    check(await page.locator('[data-ga-host] [data-mx-mode="edit"]').isVisible(),'Study retains the authorised Edit control '+name+' '+size);
  }
  await page.goto(pathToFileURL(path.join(exports,name+'-learner.html')).href,{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(()=>document.fonts.ready);

  const host=page.locator('[data-ga-host]');
  const root=page.locator('[data-ga-root]');
  const metrics=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom}));
  if(native)check(metrics.dpr===2&&['1','normal'].includes(metrics.cssZoom),'Native Chromium 200% '+name);
  check(await root.count()===1&&await page.locator('[data-lp-layout="geography-investigation"]').count()===1,'Geography-owned dispatch '+name+' '+size);
  check(await page.locator('.lp[data-mx-response="paper"]').count()===1,'Host remains in paper mode '+name+' '+size);
  check(await page.locator('#slide .mx-wb,#slide .mx-work,#slide button[data-mx-view], [data-ga-root] :is(input,textarea,canvas)').count()===0,'Paper view omits editors and extra workbook '+name+' '+size);
  check(await root.locator('.ga-intro').evaluate(element=>{
    const source=element.nextElementSibling;
    return source.matches('.ga-source')&&element.querySelector('.ga-knowledge')?.checkVisibility()&&source.querySelector('.ga-credit')?.checkVisibility();
  }),'Visible teaching before source with interpretation and attribution '+name+' '+size);
  check(await page.evaluate(()=>Object.keys(tpRespBundle().pages).length===0),'Paper activity leaves the response store empty '+name+' '+size);
  check(await root.evaluate(element=>element.scrollWidth<=element.clientWidth+1),'No whole activity horizontal overflow '+name+' '+size);
  const layout=await host.evaluate(element=>{
    const bounds=selector=>element.querySelector(selector).getBoundingClientRect();
    const evidence=bounds(element.querySelector('.ga-map')?'.ga-map':'.ga-table');
    const questions=bounds('.ga-questions'),source=bounds('.ga-source');
    const stage=document.getElementById('stage'),content=element.querySelector('.ga-page'),footer=element.querySelector('.ga-activity-nav');
    return {evidence:Math.round(evidence.width),questions:Math.round(questions.width),stacked:questions.top>=source.bottom-1,
      outlineClosed:!element.querySelector('#ga-outline').matches(':popover-open'),rail:!!element.querySelector('.mx-nav'),
      footerInFlow:getComputedStyle(footer).position==='static'&&footer.getBoundingClientRect().top>=Math.max(source.bottom,questions.bottom),
      documentScroll:getComputedStyle(stage).overflowY==='auto'&&getComputedStyle(content).overflowY==='visible',
      noOverflow:stage.scrollWidth<=stage.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1};
  });
  const measure={...metrics,...layout};
  check(layout.outlineClosed&&!layout.rail&&layout.footerInFlow&&layout.documentScroll&&layout.noOverflow,'Atlas has on-demand outline and one natural scroll surface '+name+' '+size);
  check(size==='1536'?layout.evidence>=925&&layout.evidence<=995&&layout.questions>=385&&!layout.stacked:
    size==='1280'?layout.evidence>=775&&layout.questions>=345&&!layout.stacked:layout.stacked&&Math.abs(layout.evidence-layout.questions)<=2,
    'Evidence and question proportions '+name+' '+size);
  await shot(page,size+'-'+name+'-composition',{...measure,state:'learner composition with drawer open'});
  const outline=host.locator('#ga-outline'), outlineButton=host.locator('[popovertarget="ga-outline"]').first();
  const source=host.locator('.ga-source'),beforeOutline=await source.boundingBox();
  await outlineButton.press('Enter');
  check(await outline.isVisible()&&await outline.locator('[aria-current="step"]').count()===1,'On-demand outline shows the active canonical activity '+name+' '+size);
  assert.deepEqual(await source.boundingBox(),beforeOutline);
  if(name==='map'&&size==='1536')await shot(page,'1536-map-outline',{...measure,state:'on-demand lesson outline'});
  await page.keyboard.press('Escape');
  check(await outline.isHidden()&&await outlineButton.evaluate(element=>element===document.activeElement),'Outline closes with Escape and restores keyboard focus '+name+' '+size);
  if(name==='map'){
    const map=root.locator('.ga-map img');
    await map.evaluate(img=>img.decode());
    check(await map.evaluate(img=>img.naturalWidth===1440&&img.naturalHeight===600),'Authentic accepted map aspect ratio '+size);
    await root.locator('[data-ga-location]').first().press('Enter');
    check((await root.locator('[data-ga-reading]').innerText()).includes('23.64°N'),'Authored Dhaka coordinate and reading '+size);
    await map.scrollIntoViewIfNeeded();
    await shot(page,size+'-map-evidence',{...measure,state:'map evidence and selected city'});
    if(native){
      await root.locator('.ga-credit').scrollIntoViewIfNeeded();
      await shot(page,size+'-map-attribution',{...measure,state:'map attribution and interpretation'});
    }
    const dismiss=await inspect(page);
    await shot(page,size+'-map-inspect',{...metrics,state:'host source inspection'});
    await dismiss();
    check(await root.locator('[data-ga-location][aria-pressed="true"]').count()===1,'Map selection survives host inspection '+size);
  }else{
    assert.deepEqual(await root.locator('table tbody tr').allTextContents(),fixture.slides[0].visuals[0].rows.map(r=>r.label+r.cells.join('')));
    await root.locator('.ga-table').focus();
    await page.keyboard.press('ArrowRight');
    check(await root.isVisible(),'Data table uses canonical rows and retains activity during arrow scrolling '+size);
    await shot(page,size+'-table-evidence',{...measure,state:'population table'});
    const dismiss=await inspect(page,'details');
    if(size==='1536')await shot(page,'1536-table-source-details',{...metrics,state:'source provenance'});
    await dismiss();
  }
  const q=fixture.slides[0].activities[0].questions[0];
  await root.locator('[data-ga-move="1"]').press('Enter');
  const active=root.locator('[data-ga-task]:visible');
  check(await active.getAttribute('data-question-id')===q.id&&(await active.locator('h3').innerText()).includes(q.parts[1].prompt),'Canonical question part and ID '+name+' '+size);
  check(await active.locator('h3').evaluate(element=>document.activeElement===element),'Question part receives keyboard focus '+name+' '+size);
  await active.locator('summary').press('Enter');
  await shot(page,size+'-'+name+'-question-help',{...metrics,state:'question part and optional Help'});
  const launcher=host.locator('[data-ga-open]');
  await root.locator('[data-ga-close]').press('Enter');
  check(await root.locator('#ga-questions').isHidden()&&await launcher.evaluate(element=>element===document.activeElement),'Closing the drawer restores launcher focus '+name+' '+size);
  await launcher.press('Enter');
  check(await active.isVisible()&&(await active.locator('h3').innerText()).includes(q.parts[1].prompt),'Reopening preserves the active part '+name+' '+size);
  if(name==='map')check(await root.locator('[data-ga-location][aria-pressed="true"]').count()===1,'Question and drawer actions preserve map selection '+size);
  await page.locator('[data-lp-move="1"]').press('Enter');
  check(await root.count()===0,'Shared Finish lesson navigation remains active '+name+' '+size);
  await page.locator('[data-lp-move="-1"]').press('Enter');
  check((await active.locator('h3').innerText()).includes(q.parts[1].prompt),'Returning through host navigation restores the activity part '+name+' '+size);
  if(name==='map')check(await root.locator('[data-ga-location][aria-pressed="true"]').count()===1,'Returning restores activity-owned view state '+size);
}
async function workflow(page,name){
  const data=fixturesByName[name],a=data.slides[0].activities[0],q=a.questions[0];
  check(!await importLesson(page,data),'Real Edit mode opens '+name);
  check(await page.locator('[data-ga-host]').count()===0&&await page.locator('[data-ga-root]').count()===1,'Authoring keeps the existing editor shell with Atlas preview '+name);
  const select=page.locator('#inspector select[data-bind$=".investigation.sourceRef"]');
  check(await select.inputValue()===a.investigation.sourceRef,'Inspector exposes canonical shared source '+name);
  await shot(page,'authoring-'+name,{state:'authoring'});
  const lede=page.locator('#inspector textarea[data-bind="slides.0.activities.0.lede"]');
  const updated=a.lede+' Compare the evidence carefully.';
  const help=q.parts[1].guidance+' Use one detail from the source.';
  await page.locator('#inspector [data-ga-help="0:1"]').fill(help);
  await page.locator('#inspector [data-ga-help="0:1"]').press('Tab');
  await lede.fill(updated);
  await page.locator('[data-mx-mode="json"]').click();
  const json=path.join(exports,name+'-authoring-roundtrip.json');
  await save(page,'#jsonDl',json);
  const saved=read(json),expected=structuredClone(data);
  expected.slides[0].activities[0].lede=updated;
  expected.slides[0].activities[0].questions[0].parts[1].guidance=help;
  assert.deepEqual(saved,expected);
  check(true,'Actual JSON download preserves every field except the authored introduction and Help edits '+name);
  check(!await importLesson(page,saved),'Downloaded JSON reimports via real UI '+name);
  assert.deepEqual(await page.evaluate(()=>LESSON),saved);
  await study(page);
  check((await page.locator('.ga-purpose').innerText()).includes('Compare the evidence carefully.'),'Reopened edit appears in the learner introduction '+name);
  assert.equal(await importLesson(page,data),'');
  await study(page);
  const exported=path.join(exports,name+'-learner.html');
  await save(page,'[data-mx-mode="export"]',exported);
  const html=fs.readFileSync(exported,'utf8');
  const lesson=JSON.parse(html.match(/<script[^>]*id="lesson-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const redacted=lesson.slides[0].activities[0].questions[0];
  check(['teacherNote','answer','workedAnswer'].every(field=>!Object.hasOwn(redacted,field)&&!html.includes(q[field])),'Actual learner HTML strips teacher fields '+name);
  if(name==='map'){
    const embedded=lesson.slides[0].visuals[0].src;
    check(embedded.startsWith('data:image/png;base64,')&&hash(Buffer.from(embedded.split(',')[1],'base64'))===hash(fs.readFileSync(fixtures+'atlas-map.png')),'Offline learner export contains exact accepted source pixels');
  }
  await page.goto(pathToFileURL(exported).href,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('[data-ga-root]').waitFor({state:'visible'});
  check(await page.locator('.ga-credit').isVisible()&&await page.locator('[data-mx-mode="edit"]').count()===0,'Offline learner reopen retains source credit and learner-only controls '+name);
  const dismiss=await inspect(page,name==='map'?'inspect':'details');
  await dismiss();
  await page.locator('[data-ga-move="1"]').press('Enter');
  check((await page.locator('[data-ga-task]:visible h3').innerText()).includes(q.parts[1].prompt),'Offline learner questions still work '+name);
  await shot(page,'offline-'+name,{state:'offline learner export'});
}

async function mixedNavigation(page){
  const lesson=structuredClone(fixturesByName.map),skill=lesson.slides[0];
  const atlas=skill.activities[0],second={id:'conclusion',title:'Reflect on the evidence',notes:[{body:'Explain the limits of the evidence.'}]};
  skill.activities.push(second);
  check(!await importLesson(page,lesson),'Atlas imports with an unflagged activity in the same skill');
  await study(page);
  const outline=page.locator('#ga-outline'),next=page.locator('[data-lp-move="1"]');
  check((await next.innerText()).includes(second.title)&&(await page.locator('.ga-activity-nav span').innerText())==='Activity 1 of 2','Atlas displays the next canonical activity and progress');
  await page.locator('[data-ga-location]').first().press('Enter');
  await page.locator('[data-ga-move="1"]').press('Enter');
  await page.locator('[popovertarget="ga-outline"]').first().press('Enter');
  await outline.locator('[data-lp-go="0:conclusion"]').press('Enter');
  check(await page.locator('[data-ga-host]').count()===0&&(await page.locator('#lpTitle').innerText())===second.title,'Outline uses host navigation and the unflagged activity retains its original shell');
  await page.locator('[data-lp-move="-1"]').press('Enter');
  check(await page.locator('[data-ga-host]').count()===1&&await page.locator('[data-ga-location][aria-pressed="true"]').count()===1&&
    (await page.locator('[data-ga-task]:visible h3').innerText()).includes(atlas.questions[0].parts[1].prompt),
    'Returning from an unflagged activity restores Atlas location and question part');
  check(await page.locator('#stage').evaluate(stage=>stage.scrollTop===0),'Host navigation resets Atlas document scroll');
  await next.press('Enter');
  check((await page.locator('#lpTitle').innerText())===second.title,'Contextual Next follows canonical activity order');
}
async function compatibility(browser){
  const math=read('docs/review/adding-fractions-algebraic-denominators/lesson.json');
  const mathGraph=read('docs/review/mathematics-m3/workflow/graph-response-lesson.json');
  const history=JSON.parse(fs.readFileSync('docs/review/evidence-viewer/workflow/classroom-history.html','utf8')
    .match(/<script[^>]*id="lesson-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const g03=read('tests/widgets/geography-g03/fixtures/year-9-urbanisation.json');
  for(const [name,data,prep] of [
    ['mathematics-practice',math,async p=>p.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities.find(a=>a.questions?.length)?.id))],
    ['mathematics-answer-hub',math,async p=>{await p.evaluate(()=>{LP_STATE.end=true;LP_STATE.front=null;renderSlide();});await p.locator('[data-book-hub]').click();await p.locator('[data-book-kind="worked"]').click();}],
    ['mathematics-graph',mathGraph,async p=>p.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities.find(a=>a.questions?.some(q=>q.graphResponse))?.id))],
    ['history-source-viewer',history,async p=>{await p.evaluate(()=>lpNavigate(0,'read-source'));await p.locator('[data-ev-details]').first().click();}],
    ['g03',g03,async p=>p.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities.find(a=>a.layout==='geography-notes').id))]
  ]){
    const renders=[];
    for(const app of ['baseline.html','lesson-studio.html']){
      const page=await browser.newPage({viewport:{width:1536,height:1024}});
      try{
        await setup(page);
        assert.equal(await importLesson(page,data,app),'');
        await study(page);
        await prep(page);
        check(await page.locator('[data-ga-root]').count()===0,'Original rendering route '+name+' '+app);
        const png=await page.screenshot({animations:'disabled'});
        const filename='comparison-'+name+'-'+(app==='baseline.html'?'baseline':'candidate')+'.png';
        fs.writeFileSync(path.join(shots,filename),png);
        renders.push({file:'captures/'+filename,sha256:hash(png)});
      }finally{await page.close();}
    }
    report.comparisons.push({name,images:renders,equal:renders[0].sha256===renders[1].sha256});
    check(renders[0].sha256===renders[1].sha256,'Pixel-identical baseline and candidate '+name);
  }
}
const browser=await chromium.launch({channel:'chromium',headless:true});
let nativeContext,profile;
try{
  for(const [width,height] of [[1536,1024],[1280,800],[1024,768]]){
    const page=await browser.newPage({viewport:{width,height}});
    await setup(page);
    if(width===1536){
      for(const name of ['map','table'])await workflow(page,name);
    }
    for(const name of ['map','table'])await learner(page,name,String(width));
    if(width===1536){
      await mixedNavigation(page);
      for(const [key,value] of [['subject','History'],['responseMode','typed'],['responseMode','pen'],['responseMode','both']]){
        const invalid=structuredClone(fixturesByName.map);invalid.meta[key]=value;
        const message=await importLesson(page,invalid);
        check(/requires a Geography lesson with paper responses|responseMode must be/.test(message),'Unsupported opt-in is rejected '+key+'='+value);
      }
      const withoutRef=structuredClone(fixturesByName.map);
      delete withoutRef.slides[0].activities[0].questions[0].parts[0].visualRefs;
      check(/attached to a question or part/.test(await importLesson(page,withoutRef)),'Unattached visual cannot become public through Atlas dispatch');
      const ordinary=structuredClone(fixturesByName.table);
      delete ordinary.slides[0].activities[0].investigation;
      delete ordinary.slides[0].activities[0].layout;
      assert.equal(await importLesson(page,ordinary),'');
      await study(page);
      check(await page.locator('[data-ga-root]').count()===0,'Unconfigured Geography remains on the original renderer');
      await page.locator('[data-mx-mode="edit"]').click();
      await page.locator('[data-ga-author="on"]').click();
      await page.locator('#inspector [data-bind$=".investigation.sourceRef"]').selectOption(ordinary.slides[0].visuals[0].id);
      await study(page);
      check(await page.locator('[data-ga-root] table').isVisible(),'Real inspector opt-in and source selection activate the Geography layout');
    }
    await page.close();
  }
  profile=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-stage1-native-'));
  fs.mkdirSync(path.join(profile,'Default'));
  fs.writeFileSync(path.join(profile,'Default','Preferences'),JSON.stringify({partition:{default_zoom_level:{x:Math.log(2)/Math.log(1.2)}}}));
  nativeContext=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:['--window-size=1536,1024']});
  const nativePage=await nativeContext.newPage();
  await setup(nativePage);
  for(const name of ['map','table'])await learner(nativePage,name,'native200',true);
  await compatibility(browser);
  assert.deepEqual(report.errors,[]);
  report.complete=true;
}finally{
  await nativeContext?.close();
  if(profile)fs.rmSync(profile,{recursive:true,force:true});
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(report.checks.length+' checks, '+report.captures.length+' captures, '+report.comparisons.length+' comparisons, '+report.errors.length+' page errors');
