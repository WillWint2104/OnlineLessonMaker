import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {chromium} from 'playwright';

const root=process.cwd(),fixtures='tests/widgets/mathematics-visual-attachments',out=path.resolve(process.env.C2_REVIEW_DIR||'review-delivery/c2/focused');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const catalogue=read(fixtures+'/catalogue.json').filter(c=>!process.env.C2_FAMILIES||process.env.C2_FAMILIES.split(',').includes(c.id));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),started:new Date().toISOString(),applicationSha256:hash(fs.readFileSync('lesson-studio.html')),checks:[],captures:[],measurements:[],pageErrors:[],exports:[],negative:[],assets:[],limitations:['Synthetic fixtures are not approved lesson publications.','Browser accessibility and pen controls do not certify physical stylus or screen-reader output.']};
fs.mkdirSync(out+'/captures',{recursive:true});fs.mkdirSync(out+'/exports',{recursive:true});
const check=(name,passed)=>{report.checks.push({name,passed:!!passed});assert.ok(passed,name);};
const server=http.createServer((req,res)=>{let f;try{f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.js':'text/javascript','.woff2':'font/woff2','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port;
let browser,zoom;
async function watch(p){p.on('pageerror',e=>report.pageErrors.push({url:p.url(),error:e.message}));p.on('dialog',async d=>{report.lastDialog=d.message();await d.accept();});await p.route(/^https?:/,r=>r.request().url().startsWith(origin)?r.continue():r.abort());}
async function load(p,lesson){const size=p.viewportSize();if(size&&size.width<1000)await p.setViewportSize({width:1536,height:960});await p.goto(origin+'/lesson-studio.html');await p.locator('#modeSeg [data-mode="edit"]').click();await p.locator('#dataBtn').focus();await p.keyboard.press('Enter');await p.locator('#jsonArea').fill(JSON.stringify(lesson));await p.locator('#jsonLoad').click();assert.equal(await p.locator('#jsonErr').textContent(),'');await p.evaluate(()=>document.querySelector('#modeSeg [data-mode="study"]').click());if(size&&size.width<1000)await p.setViewportSize(size);}
async function go(p,id,kind='practice'){await p.evaluate(({id,kind})=>lpNavigate(0,kind+'-'+id),{id,kind});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(80);}
async function shot(p,id,state,width){
  await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.mv-evidence img')].map(i=>i.decode().catch(()=>{})));});
  await p.evaluate(()=>new Promise(requestAnimationFrame));
  const headers=await p.locator('.mv-evidence .mx-tbl th').evaluateAll(cells=>cells.flatMap(cell=>{
    const words=[],walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode;if(node.parentElement.closest('mjx-container'))continue;
      for(const match of node.textContent.matchAll(/[A-Za-z]{3,}/g)){
        const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
        const lines=[...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>Math.round(r.top));
        words.push({word:match[0],lines:[...new Set(lines)]});
      }
    }
    return words;
  }));
  if(headers.length){report.measurements.push({id,state,width,headerWords:headers});check(`Table header words stay intact ${width} ${id} ${state}`,headers.every(h=>h.lines.length<=1));}
  if(await p.locator('.lp-answer-body [data-tp-fig-kind="geometry"]').count()){
    const edges=await p.locator('.lp-answer-body .tp-fig-stage .tp-fig-poly,.lp-answer-body .tp-fig-stage .tp-fig-seg').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return {stroke:s.stroke,strokeOpacity:+s.strokeOpacity,opacity:+s.opacity,width:parseFloat(s.strokeWidth)};}));
    check(`Model geometry has painted edges ${width} ${id} ${state}`,edges.length>0&&edges.every(e=>e.stroke!=='none'&&e.stroke!=='transparent'&&!/(?:,|\/)\s*0(?:\.0+)?\)$/.test(e.stroke)&&e.strokeOpacity>0&&e.opacity>0&&e.width>0));
  }
  const metrics=await p.evaluate(()=>{const page=document.querySelector('.mx-page'),hub=document.querySelector('.lp-answer-hub');return {width:innerWidth,height:innerHeight,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom,documentWidth:document.documentElement.scrollWidth,pageWidth:page?.clientWidth,pageScroll:page?.scrollWidth,hub:hub?{top:hub.getBoundingClientRect().top,bottom:hub.getBoundingClientRect().bottom}:null,images:[...document.querySelectorAll('.mv-evidence img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,width:i.getBoundingClientRect().width,alt:i.alt})),tables:[...document.querySelectorAll('.mv-evidence .mx-tblwrap,[data-mx-table]')].map(t=>({width:t.clientWidth,scroll:t.scrollWidth,tab:t.tabIndex})),evidence:document.querySelectorAll('.mv-evidence').length};});
  report.measurements.push({id,state,width,...metrics});
  if(metrics.pageScroll>metrics.pageWidth+2)report.overflowNodes=await p.locator('.mx-page *').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().right>innerWidth+2).map(e=>({tag:e.tagName,cls:e.className,width:e.clientWidth,scroll:e.scrollWidth,min:getComputedStyle(e).minWidth,display:getComputedStyle(e).display})).slice(0,25));
  check(`No document/ancestor overflow ${width} ${id} ${state}`,metrics.documentWidth<=metrics.width+2&&(!metrics.pageWidth||metrics.pageScroll<=metrics.pageWidth+2));check(`Hub bounded ${width} ${id} ${state}`,!metrics.hub||metrics.hub.top>=-1&&metrics.hub.bottom<=metrics.height+1);check(`Images loaded ${width} ${id} ${state}`,metrics.images.every(i=>i.loaded));
  const file=`captures/${width}-${id}-${state}.png`;
  if(width==='native-200'){const c=await p.context().newCDPSession(p),data=await c.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});fs.writeFileSync(out+'/'+file,Buffer.from(data.data,'base64'));await c.detach();}else await p.screenshot({path:out+'/'+file});
  report.captures.push({id,state,width,file,sha256:hash(fs.readFileSync(out+'/'+file))});
}
async function exported(p,name){const event=p.waitForEvent('download');await p.evaluate(()=>document.getElementById('exportBtn').click());const file=out+'/exports/'+name+'.html';await(await event).saveAs(file);const html=fs.readFileSync(file,'utf8'),lesson=JSON.parse(html.match(/<script[^>]*id="lesson-data"[^>]*>([\s\S]*?)<\/script>/)[1]);report.exports.push({file:path.relative(out,file),sha256:hash(Buffer.from(html))});return {lesson,file,html};}
async function family(p,c,width){
  const lesson=read(fixtures+'/'+c.id+'.json'),sk=lesson.slides[0],q=sk.activities[1].questions[0],refs=q.visualRefs;
  delete sk.practiceComposition;await load(p,lesson);check('Preflight '+width+' '+c.id,await p.evaluate(()=>{mvPreflight(LESSON);lpValidatePublication(LESSON);return true;}));await go(p,c.id,'example');await shot(p,c.id,'ordinary-example',width);
  sk.practiceComposition='micro';await load(p,lesson);await go(p,c.id);await shot(p,c.id,'micro-example',width);check('Micro example owns visible evidence '+width+' '+c.id,await p.locator('.lp-micro-example .mv-evidence').count()>0);
  await p.locator('[data-book-question]').first().scrollIntoViewIfNeeded();await shot(p,c.id,'question',width);check('Question owns its givens '+width+' '+c.id,await p.locator('[data-book-question] .mv-evidence,[data-book-question] [data-mx-table]').count()>0);
  const expand=p.locator('[data-book-question] [data-figx-open]').first();if(await expand.count()){
    await expand.focus();await p.keyboard.press('Enter');await p.waitForTimeout(100);
    const edges=await p.locator('#figfocus svg .tp-fig-poly,#figfocus svg .tp-fig-seg').evaluateAll(es=>es.map(e=>({stroke:getComputedStyle(e).stroke,box:e.getBBox().width+e.getBBox().height})));
    report.expandedProbe=await p.evaluate(()=>({root:document.getElementById('figfocus').outerHTML.slice(0,2600),tokens:[...document.querySelectorAll('#ffSlide,.mx-figskin')].map(e=>({cls:e.className,inline:e.getAttribute('style'),primary:getComputedStyle(e).getPropertyValue('--primary')}))}));report.expandedEdges=edges;
    // Graphs use other curve primitives; the geometry fixtures must have actual painted edge paths.
    if(sk.visuals[0].figure.figure==='geometry')check('Expanded painted geometry '+width+' '+c.id,edges.length>0&&edges.every(e=>e.stroke!=='none'&&e.box>0));
    await p.locator('#figfocus button:visible').last().focus();await p.keyboard.press('Tab');check('Expanded Tab stays contained '+width+' '+c.id,await p.locator('#figfocus').evaluate(e=>e.contains(document.activeElement)));
    await p.locator('#figfocus button:visible').first().focus();await p.keyboard.press('Shift+Tab');check('Expanded Shift+Tab stays contained '+width+' '+c.id,await p.locator('#figfocus').evaluate(e=>e.contains(document.activeElement)));
    await shot(p,c.id,'expanded',width);await p.keyboard.press('Escape');check('Expansion returns focus '+width+' '+c.id,await expand.evaluate(e=>e===document.activeElement));
  }
  await p.locator('[data-book-hub]').click();await p.locator('[data-book-kind="final"]').click();await shot(p,c.id,'final',width);check('Final evidence in existing Hub '+width+' '+c.id,await p.locator('.lp-answer-body .mv-evidence').count()>0);await p.locator('[data-book-kind="worked"]').click();await shot(p,c.id,'worked',width);await p.locator('[data-book-close]').click();
  if(['function-table','wide-table','data-tables'].includes(c.id)){
    lesson.meta.responseMode='typed';await load(p,lesson);await go(p,c.id);const input=p.locator('[data-book-question] input.mx-cell').first();await input.fill('17');await input.dispatchEvent('input');await go(p,c.id,'example');await go(p,c.id);check('Response identity retained '+width+' '+c.id,await input.inputValue()==='17');await input.scrollIntoViewIfNeeded();await shot(p,c.id,'typed-response',width);
    lesson.meta.responseMode='pen';await load(p,lesson);await go(p,c.id);await shot(p,c.id,'pen-response',width);
  }
  if(width==='1536'){
    await p.evaluate(()=>{document.querySelector('#modeSeg [data-mode="edit"]').click();LP_EDIT.part='questions';LP_EDIT.index=0;renderInspector();});await shot(p,c.id,'inspector',width);
    const json=p.locator('[data-mx-mode="json"]');if(await json.isVisible())await json.click();else{await p.locator('#dataBtn').focus();await p.keyboard.press('Enter');}const [download]=await Promise.all([p.waitForEvent('download'),p.locator('#jsonDl').click()]);const file=out+'/exports/'+c.id+'-authoring.json';await download.saveAs(file);check('JSON authoring round trip '+c.id,isDeepStrictEqual(read(file),lesson));
  }
}
try{
  browser=await chromium.launch();const p=await browser.newPage({viewport:{width:1536,height:960}});await watch(p);
  for(const width of [1536,1024,390]){await p.setViewportSize({width,height:width===390?844:960});for(const c of catalogue){await family(p,c,String(width));console.log('Captured '+width+' '+c.id);}}
  if(!process.env.C2_SKIP_ZOOM){const profile=fs.mkdtempSync(path.join(os.tmpdir(),'c2-native-'));report.zoomProfile=profile;fs.mkdirSync(profile+'/Default');fs.writeFileSync(profile+'/Default/Preferences',JSON.stringify({partition:{default_zoom_level:{x:Math.log(2)/Math.log(1.2)}}}));zoom=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:['--window-size=1536,960']});const zp=zoom.pages()[0];await watch(zp);for(const c of catalogue)await family(zp,c,'native-200');check('Native browser 200% without CSS emulation',await zp.evaluate(()=>devicePixelRatio===2&&getComputedStyle(document.documentElement).zoom==='1'));}
  await p.setViewportSize({width:1536,height:960});const base=read(fixtures+'/function-table.json');
  const cases=[['missing-reference',d=>d.slides[0].activities[1].questions[0].visualRefs=['missing-visual']],['duplicate-id',d=>d.slides[0].visuals.push(structuredClone(d.slides[0].visuals[0]))],['unsupported',d=>d.slides[0].visuals[0].kind='new-engine'],['bad-completion',d=>d.slides[0].activities[1].questions[0].answerVisuals.final[0].completionCells=[['wrong']]],['deleted-shared',d=>d.slides[0].visuals=[]],['unhelpful-description',d=>d.slides[0].visuals[0].description='Triangle diagram']];
  cases.push(['falsy-answer-model',d=>d.slides[0].activities[1].questions[0].answerVisuals=false],['non-array-references',d=>d.slides[0].activities[1].questions[0].visualRefs=7],['null-answer-entry',d=>d.slides[0].activities[1].questions[0].answerVisuals.final=[null]],['non-array-answer-entries',d=>d.slides[0].activities[1].questions[0].answerVisuals.final='invalid draft']);
  for(const[name,mutate]of cases){const d=structuredClone(base);mutate(d);await load(p,d);const error=await p.evaluate(()=>{try{lpValidatePublication(LESSON);return '';}catch(e){return e.message;}});report.negative.push({name,error});check('Editable invalid draft blocks publication: '+name,error.includes('slides.0')&&await p.evaluate(()=>LESSON.meta.id.includes('function-table')));await p.evaluate(()=>{lpNavigate(0,'practice-function-table');document.querySelector('#modeSeg [data-mode="edit"]').click();LP_EDIT.part='questions';LP_EDIT.index=0;renderInspector();});check('Malformed draft still has a usable inspector: '+name,await p.locator('[data-mv-diagnostics]').count()===1);}
  const badGeometry=read(fixtures+'/triangle.json');badGeometry.slides[0].visuals[0].figure={figure:'geometry',construction:'triangleSSS',params:{a:1,b:2,c:4},objects:[{type:'polygon',vertices:['A','B','C']}]};await load(p,badGeometry);check('Impossible required geometry blocks publication',await p.evaluate(()=>{try{mvPreflight(LESSON);return false;}catch(e){return /triangle|inequality|nothing to draw/i.test(e.message);}}));
  for(const scenario of ['null-uncheck','malformed-table-seed','repair-reference-list']){
    const d=structuredClone(base),q=d.slides[0].activities[1].questions[0],id=d.slides[0].visuals[0].id;
    if(scenario==='null-uncheck')q.answerVisuals.final.unshift(null);
    if(scenario==='malformed-table-seed'){q.visualRefs=[id];delete d.slides[0].visuals[0].rows;q.answerVisuals.final=[];}
    if(scenario==='repair-reference-list')q.visualRefs=7;
    await load(p,d);await go(p,'function-table');await p.evaluate(()=>{document.querySelector('#modeSeg [data-mode="edit"]').click();LP_EDIT.part='questions';LP_EDIT.index=0;renderInspector();});
    const selector=scenario==='repair-reference-list'?'[data-mv-select="slides.0.activities.1.questions.0"]':`[data-mv-model="slides.0.activities.1.questions.0"][data-mv-kind="final"][data-mv-id="${scenario==='null-uncheck'?'@questionTable':id}"]`,control=p.locator(selector);
    await control.locator('xpath=ancestor::details[1]/summary').click();if(scenario==='null-uncheck')await control.uncheck();else await control.check();
    const result=await p.evaluate(()=>{const q=LESSON.slides[0].activities[1].questions[0];return {refs:q.visualRefs,models:q.answerVisuals.final};});
    check('Malformed draft remains repairable through real controls: '+scenario,scenario==='null-uncheck'?result.models.length===0:scenario==='malformed-table-seed'?result.models.some(m=>m.ref===id&&!m.completionCells):Array.isArray(result.refs)&&result.refs.includes(id));
  }
  for(const final of ['autonomous','hidden'])for(const worked of ['autonomous','hidden']){
    const d=structuredClone(base),q=d.slides[0].activities[1].questions[0];d.meta.answerPolicy={final,worked};q.answerVisuals.final[0].completionCells=[['C2_FINAL_ONLY_VALUE','1','3','5']];q.answerVisuals.worked[0].completionCells=[['C2_WORKED_ONLY_VALUE','1','3','5']];q.parts[0].answerVisuals=structuredClone(q.answerVisuals);q.parts[0].table=q.table;
    q.parts[0].parts=[{id:'nested-release',prompt:'Use the same table.',finalAnswer:'C2_NESTED_FINAL_ONLY',workedAnswer:'C2_NESTED_WORKED_ONLY',table:structuredClone(q.table),answerVisuals:structuredClone(q.answerVisuals)}];
    await load(p,d);const exportedData=await exported(p,`release-${final}-${worked}`),text=JSON.stringify(exportedData.lesson);check('Final export model projection '+final+'/'+worked,text.includes('C2_FINAL_ONLY_VALUE')===(final==='autonomous'));check('Worked export model projection '+final+'/'+worked,text.includes('C2_WORKED_ONLY_VALUE')===(worked==='autonomous'));check('Nested final text stripped independently '+final+'/'+worked,text.includes('C2_NESTED_FINAL_ONLY')===(final==='autonomous'));check('Nested worked text stripped independently '+final+'/'+worked,text.includes('C2_NESTED_WORKED_ONLY')===(worked==='autonomous'));
  }
  const graphFixture=read('docs/review/mathematics-m3/workflow/graph-response-lesson.json').slides.flatMap(s=>s.activities||[]).flatMap(a=>a.questions||[]).find(q=>q.graphResponse);
  for(const access of ['hidden','teacher']){
    const d=structuredClone(base),q=d.slides[0].activities[1].questions[0];q.graphResponse=structuredClone(graphFixture.graphResponse);q.graphAnswer=structuredClone(graphFixture.graphAnswer);q.releaseGroup='c2-projection-probe';q.answerVisuals.final[0].completionCells=[['C2_GROUP_RESTRICTED','1','3','5']];q.answerVisuals.worked=structuredClone(q.answerVisuals.final);d.meta.answerPolicy={final:'autonomous',worked:'autonomous',fallback:{final:'autonomous',worked:'autonomous'},groups:{'c2-projection-probe':{final:access,worked:access}}};await load(p,d);const result=await exported(p,'graph-group-'+access);check('Existing graph '+access+' group strips C2 models from real learner export',!JSON.stringify(result.lesson).includes('C2_GROUP_RESTRICTED'));
  }
  await load(p,base);await go(p,'function-table');
  const scrollAttributes=await p.evaluate(()=>{const wrap=document.querySelector('[data-mx-table]');for(const key of ['tabindex','role','aria-label'])wrap.removeAttribute(key);wrap.style.width='80px';mxFitTables(document);const narrow={tab:wrap.getAttribute('tabindex'),role:wrap.getAttribute('role')};wrap.style.width='100%';mxFitTables(document);const wide={tab:wrap.getAttribute('tabindex'),role:wrap.getAttribute('role'),label:wrap.getAttribute('aria-label')};wrap.setAttribute('tabindex','-1');wrap.setAttribute('role','group');wrap.setAttribute('aria-label','Authored table name');wrap.style.width='80px';mxFitTables(document);wrap.style.width='100%';mxFitTables(document);return {narrow,wide,preserved:{tab:wrap.getAttribute('tabindex'),role:wrap.getAttribute('role'),label:wrap.getAttribute('aria-label')}};});
  check('Scrolling attributes are removed when available width grows',scrollAttributes.narrow.tab==='0'&&scrollAttributes.narrow.role==='region'&&scrollAttributes.wide.tab===null&&scrollAttributes.wide.role===null&&scrollAttributes.wide.label===null);check('Authored table focus/role/name survive width changes',scrollAttributes.preserved.tab==='-1'&&scrollAttributes.preserved.role==='group'&&scrollAttributes.preserved.label==='Authored table name');
  for(const id of ['sector','solid']){const d=read(fixtures+'/'+id+'.json');await load(p,d);const result=await exported(p,id+'-offline');const v=result.lesson.slides[0].visuals[0];check('Required local asset embedded with hash '+id,v.src.startsWith('data:image/svg+xml;base64,')&&result.lesson.meta.visualAssetManifest?.[0]?.sha256===hash(fs.readFileSync(fixtures+'/assets/'+(id==='sector'?'sector':'cuboid')+'.svg')));report.assets.push(...result.lesson.meta.visualAssetManifest);await p.route(/^https?:/,r=>r.abort());await p.goto('file:///'+result.file.replaceAll('\\','/'));await go(p,id);check('Independent export renders required asset offline '+id,await p.locator('.mv-evidence img').first().evaluate(e=>e.complete&&e.naturalWidth>0));await p.unroute(/^https?:/);await p.route(/^https?:/,r=>r.request().url().startsWith(origin)?r.continue():r.abort());}
  // Real inspector edits: one definition, multiple consumers, and unchanged stable question IDs.
  const edited=read(fixtures+'/triangle.json');await load(p,edited);await go(p,'triangle');
  await p.evaluate(()=>{document.querySelector('#modeSeg [data-mode="edit"]').click();LP_EDIT.part='questions';LP_EDIT.index=0;renderInspector();});
  await p.getByText('Shared skill visuals (1)',{exact:true}).click();await p.locator('summary').filter({hasText:/^Right triangle ABC · figure$/}).click();
  const description=p.locator('[data-bind="slides.0.visuals.0.description"]');await description.fill('Triangle ABC is right angled at A, with perpendicular sides AB = 4 cm and AC = 3 cm; BC is the unknown hypotenuse c.');await description.dispatchEvent('change');
  check('Shared description edit reaches real question preview',await p.locator('[data-book-question] .mv-description').textContent()==='Triangle ABC is right angled at A, with perpendicular sides AB = 4 cm and AC = 3 cm; BC is the unknown hypotenuse c.');
  const refs=p.locator('details.mv-author').filter({has:p.locator('[data-mv-select="slides.0.activities.1.questions.0"]')});
  await refs.locator(':scope > summary').click();await p.locator('[data-mv-select="slides.0.activities.1.questions.0"]').uncheck();check('Actual reference deselection removes question evidence only',await p.locator('[data-book-question] .mv-evidence').count()===0&&await p.locator('.lp-micro-example .mv-evidence').count()===1);
  await refs.locator(':scope > summary').click();await p.locator('[data-mv-select="slides.0.activities.1.questions.0"]').check();check('Actual reference selection restores shared evidence',await p.locator('[data-book-question] .mv-evidence').count()===1);
  await shot(p,'triangle','edited-inspector','1536');check('Question/example IDs survive actual edits',await p.evaluate(()=>LESSON.slides[0].activities[1].questions[0].id==='triangle-q1'&&LESSON.slides[0].activities[0].workedExamples[0].examples[0].id==='method-triangle'));
  // Existing upload handler feeds the same visual src field; exported bytes must match.
  const sector=read(fixtures+'/sector.json');await load(p,sector);await go(p,'sector');await p.evaluate(()=>{document.querySelector('#modeSeg [data-mode="edit"]').click();renderInspector();});await p.getByText('Shared skill visuals (1)',{exact:true}).click();
  await p.locator('[data-mv-upload]').locator('xpath=ancestor::details[1]/summary').click();await p.locator('[data-mv-upload]').setInputFiles(fixtures+'/assets/sector.svg');await p.waitForFunction(()=>LESSON.slides[0].visuals[0].src.startsWith('data:'));
  check('Actual image upload preserves description and alt',await p.evaluate(()=>LESSON.slides[0].visuals[0].description.includes('90 degrees')&&!!LESSON.slides[0].visuals[0].alt));const upload=await exported(p,'uploaded-sector');check('Uploaded byte identity survives export',upload.lesson.meta.visualAssetManifest[0].sha256===hash(fs.readFileSync(fixtures+'/assets/sector.svg')));
  for(const[name,src]of [['missing-asset','tests/widgets/mathematics-visual-attachments/assets/missing.svg'],['unsafe-svg','data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64')],['malformed-svg','data:image/svg+xml;base64,'+Buffer.from('<svg><broken>').toString('base64')],['invalid-raster','data:image/png;base64,AAAA']]){
    const d=structuredClone(sector);d.slides[0].visuals[0].src=src;await load(p,d);const error=await p.evaluate(async()=>{try{await mvEmbedAssets(lpBookStudentData(LESSON));return '';}catch(e){return e.message;}});report.negative.push({name,error});check('Required asset safely blocks export '+name,error.length>0);
  }
  // Parent/child sharing and a nested answer model use the same registry, not duplicated evidence.
  const nested=read(fixtures+'/triangle.json'),nq=nested.slides[0].activities[1].questions[0];nq.parts[0].visualRefs=['triangle-given-0'];nq.parts[0].parts=[{id:'nested-part',prompt:'Use the same triangle.',finalAnswer:'5 cm',workedAnswer:'Use Pythagoras.',visualRefs:['triangle-given-0'],answerVisuals:{final:[{ref:'triangle-given-0'}],worked:[{ref:'triangle-given-0'}]}}];await load(p,nested);await go(p,'triangle');check('Inherited references deduplicate through nested parts',await p.locator('[data-book-question] .mv-evidence').count()===1);await p.locator('[data-book-hub]').click();check('Nested answer evidence is rendered',await p.locator('.lp-answer-body .mv-evidence').count()===2);await p.locator('[data-book-close]').click();
  check('Zero asynchronous page exceptions',report.pageErrors.length===0);
}catch(e){report.failure=e.stack;throw e;}finally{report.finished=new Date().toISOString();report.applicationSha256After=hash(fs.readFileSync('lesson-studio.html'));report.captureCount=report.captures.length;fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2));await browser?.close();await zoom?.close();await new Promise(ok=>server.close(ok));console.log(JSON.stringify({checks:report.checks.length,captures:report.captureCount,pageErrors:report.pageErrors,failure:report.failure,output:out}));}
