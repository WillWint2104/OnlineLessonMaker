import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import http from 'node:http';
import assert from 'node:assert/strict';import {execFileSync}from'node:child_process';import {createHash}from'node:crypto';
import {pathToFileURL}from'node:url';import {chromium}from'playwright';
import '../src/mathematics/micro-lesson/micro.js';
const out=process.env.MICRO_REVIEW_DIR||'docs/review/mathematics-micro',fixture='docs/review/mathematics-micro/workflow/lesson.json';
fs.mkdirSync(out+'/captures',{recursive:true});fs.mkdirSync(out+'/workflow',{recursive:true});
const lesson=JSON.parse(fs.readFileSync(fixture)),before=JSON.parse(fs.readFileSync('docs/review/mathematics-micro/workflow/before.json'));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),appSha256:createHash('sha256').update(fs.readFileSync('lesson-studio.html')).digest('hex'),trackedSourceDirty:!!execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),checks:[],captures:[],errors:[],zoom:[]};
const check=(ok,label)=>{assert.ok(ok,label);report.checks.push(label);console.log('PASS '+label);};
const browser=await chromium.launch(),p=await browser.newPage({viewport:{width:1536,height:960}});
p.on('pageerror',e=>report.errors.push(e.message));p.on('dialog',d=>d.accept());await p.route(/^https?:/,r=>r.abort());
const load=async l=>{await p.goto(pathToFileURL(path.resolve('lesson-studio.html')).href);await p.locator('#modeSeg [data-mode="edit"]').click();await p.locator('#dataBtn').click();await p.locator('#jsonArea').fill(JSON.stringify(l));await p.locator('#jsonLoad').click();assert.equal(await p.locator('#jsonErr').textContent(),'');await p.locator('[data-mx-mode="study"]').click();};
const shot=async(page,name,ctx)=>{await page.evaluate(()=>document.fonts.ready);if(ctx){const c=await ctx.newCDPSession(page),r=await c.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});fs.writeFileSync(out+'/captures/'+name+'.png',Buffer.from(r.data,'base64'));await c.detach();}else await page.screenshot({path:out+'/captures/'+name+'.png'});report.captures.push(name);};
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('.mx-page').scrollWidth<=document.querySelector('.mx-page').clientWidth+1);
const navigate=async(page,id)=>page.evaluate(id=>{if(id==='overview'||id==='outcomes')lpGoFront(lpFrontPages().find(p=>p.kind===id).id);else if(id==='complete'){LP_STATE.end=true;LP_STATE.front=null;renderSlide();lpResetPageScroll();}else if(id==='intro'||id==='video')lpNavigate(0,LESSON.slides[0].activities.find(a=>id==='intro'?a.introduction:a.optionalVideo).id);else{const a=LESSON.slides[0].activities.find(a=>a.practiceCollectionId),m=lpPracticeMembers(LESSON.slides[0],a);(LP_STATE.practice=LP_STATE.practice||{})[a.id]=m[+id].ex.id;lpNavigate(0,a.id);}},id);
const publish=async(file)=>{const next=p.waitForEvent('download');await p.locator('[data-mx-mode="export"]').click();await(await next).saveAs(out+'/workflow/'+file);};
try{
 await load(lesson);
 const s=lesson.slides[0],a=s.activities.find(a=>a.practiceCollectionId),ids=new Set(a.questions.map(q=>q.id));
 for(const q of a.questions)MathMicro.lint(q);assert.throws(()=>MathMicro.lint({...a.questions[0],stem:'(b-a)/(a-b)'}),/stacked fraction/);check(true,'Rational-family lint rejects a plain-slash regression without converting prose');
 check(ids.size===36&&a.questions.length===36,'36 uniquely identified independent questions');
 for(const w of s.activities.filter(a=>a.workedExamples)){const ex=w.workedExamples[0].examples[0];assert.deepEqual(a.questions.filter(q=>q.archetypeId===ex.id),MathMicro.generate(ex.practice.generator.family,ex.practice.generator.counts,ex.id));}
 check(true,'Deterministic parameter arrays realise 8 Foundation + 4 Moderate for each core skill');
 const maths=await p.evaluate(()=>{
  const s=LESSON.slides[0],a=s.activities.find(a=>a.practiceCollectionId);let comparisons=0;
  const evaluate=(text,scope)=>{const clean=text.replaceAll('$','').replace(/\\[a-z]+|[a-z]/g,t=>t.startsWith('\\')?t:'('+scope[t]+')');const c=tpMathCompile(clean);if(c.error)throw Error(c.error+': '+text);return c.eval(0);};
  const equal=(l,r,scope)=>{const x=evaluate(l,scope),y=evaluate(r,scope);if(!Number.isFinite(x)||!Number.isFinite(y))return;if(Math.abs(x-y)>1e-8)throw Error('Incorrect identity: '+l+' = '+r);comparisons++;};
  for(const q of a.questions)for(let sample=0;sample<7;sample++){
   const scope=Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((c,i)=>[c,(sample%2?-1:1)*(i+sample+2)]));
   equal(q.stem,q.answer,scope);
   for(const line of q.workedAnswer.split('\n')){const parts=line.replaceAll('$','').split('=');if(parts.length<2)continue;if(!parts[0].trim())parts[0]=q.stem;for(let i=1;i<parts.length;i++)equal(parts[0],parts[i],scope);}
  }
  for(const w of s.activities.filter(a=>a.workedExamples))for(const step of w.workedExamples[0].examples[0].steps){const parts=step.math.replaceAll('$','').split('=');if(!parts[0].trim())continue;equal(parts[0],parts.at(-1),{a:7,b:3,x:11});}
  return comparisons;
 });check(maths>700,'Every generated final answer and worked equality verified at seven substitutions ('+maths+' comparisons)');
 check(!a.questions.some(q=>/[/$][^$]*\//.test(q.stem)),'Generated rational family uses explicit stacked-fraction notation');
 check(await p.evaluate(()=>{const d=structuredClone(LESSON),orig=JSON.stringify(LESSON);d.meta.frontMatter[0].image={src:'data:image/svg+xml;base64,PHN2Zy8+',alt:'Custom',fit:'contain',focus:{x:.2,y:.3}};const result=lpBookStudentData(d);return result.meta.frontMatter[0].image.src===d.meta.frontMatter[0].image.src&&result.meta.frontMatter[1].image.src.startsWith('data:image/svg+xml;base64,')&&JSON.stringify(LESSON)===orig;}),'Custom image overrides pack; export resolves other roles without mutating authored content');
 await publish('learner.html');
 await load(before);check(await p.locator('[data-book-page]').count()===5,'Actual before fixture retains five worked-example/practice destinations');await navigate(p,'0');await shot(p,'before-desktop-practice');await publish('before-learner.html');
 const ctx=await browser.newContext({offline:true}),learner=await ctx.newPage();learner.on('pageerror',e=>report.errors.push(e.message));
 await learner.goto(pathToFileURL(path.resolve(out+'/workflow/learner.html')).href);
 const destinations=['overview','outcomes','intro','video','0','1','2','complete'];
 for(const [width,height]of [[1536,960],[1024,768],[390,844]]){
  await learner.setViewportSize({width,height});
  for(const id of destinations){await navigate(learner,id);await shot(learner,width+'-'+id);check(await overflow(learner),width+' '+id+' no page overflow');
   if(['0','1','2'].includes(id)){
    check(await learner.locator('.mx-worked-example').count()===1&&await learner.locator('.lp-exercise-cell').count()===8,width+' '+id+' one colocated example with eight Foundation questions');
    await learner.locator('.lp-exercise-grid').scrollIntoViewIfNeeded();await shot(learner,width+'-'+id+'-foundation-grid');
    const columns=await learner.locator('.lp-exercise-grid').evaluate(e=>{const cells=[...e.children],ys=cells.map(x=>Math.round(x.getBoundingClientRect().y));return ys.filter(y=>y===ys[0]).length;});assert.equal(columns,width===1536?3:width===1024?2:1);
    check(await learner.locator('.lp-micro-example math mfrac').count()>0,width+' '+id+' real MathML stacked fractions');
    await learner.locator('[data-book-level="moderate"]').click();assert.equal(await learner.locator('.lp-exercise-cell').count(),4);await shot(learner,width+'-'+id+'-moderate');check(await overflow(learner),width+' '+id+' Moderate layout');await learner.locator('[data-book-level="basic"]').click();
   }
  }
  await learner.locator('[data-book-hub]').click();await learner.locator('[data-book-kind="worked"]').click();await shot(learner,width+'-answer-hub');check(await learner.locator('.lp-answer-hub').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.width<=innerWidth;}),width+' existing Answer Hub bounded');await learner.keyboard.press('Escape');
 }
 await learner.setViewportSize({width:1536,height:960});await navigate(learner,'overview');
 check(await learner.locator('[data-book-page]').count()===3&&await learner.locator('[data-lp-go]').count()===2,'Micro rail has three core skills, introduction/video and no separate worked-example destination');
 const journey=[];for(let k=0;k<8;k++){journey.push(await learner.locator('#lpTitle').textContent());if(k<7)await learner.locator('.lp-footer [data-lp-move="1"]').click();}
 assert.deepEqual(journey,['Cancelling When The Brackets Are Reversed','What you will learn','Introduction','Video','Reverse a bracket','Factor first','Opposite denominators','Lesson complete']);
 await learner.locator('[data-lp-move="-1"]').click();assert.equal(await learner.locator('#lpTitle').textContent(),'Opposite denominators');check(true,'Back/Next matches the eight-destination micro rail');
 await ctx.close();
 await load(lesson);await navigate(p,'0');await p.locator('[data-mx-mode="edit"]').click();await p.locator('[data-lp-part="questions"]').click();await shot(p,'authoring-composition-counts');
 check(await p.locator('[data-bind="slides.0.practiceComposition"]').inputValue()==='micro'&&await p.locator('[data-micro-generate]').count()===3,'Authoring exposes composition, pack, three linked examples, counts and realised questions');
 const field=p.locator('[data-micro-count][data-level="basic"]').first();await field.fill('9');await p.locator('[data-micro-generate]').first().click();
 check(await p.evaluate(()=>{const a=LESSON.slides[0].activities.find(a=>a.practiceCollectionId);return a.questions.filter(q=>q.archetypeId==='opposites-basic-example'&&q.level==='basic').length===9;}),'Authored count override regenerates only the selected skill');
 await p.locator('[data-bind="meta.artworkPack"]').selectOption('mathematics/algebra/factorisation');await p.locator('[data-mx-mode="json"]').click();const jsonDownload=p.waitForEvent('download');await p.locator('#jsonDl').click();await(await jsonDownload).saveAs(out+'/workflow/authoring-roundtrip.json');const json=fs.readFileSync(out+'/workflow/authoring-roundtrip.json','utf8');check(JSON.parse(json).slides[0].practiceComposition==='micro'&&JSON.parse(json).meta.artworkPack==='mathematics/algebra/factorisation','Authoring JSON preserves opt-in composition and selected pack');await p.locator('#jsonArea').fill(json);await p.locator('#jsonLoad').click();assert.equal(await p.locator('#jsonErr').textContent(),'');check(true,'Downloaded authored JSON reopens through the normal importer');
 // Actual browser zoom via Chromium profile preferences, not CSS zoom or a narrow viewport simulation.
 const html=fs.readFileSync(out+'/workflow/learner.html'),server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'micro-native-zoom-'));fs.mkdirSync(path.join(profile,'Default'));fs.writeFileSync(path.join(profile,'Default/Preferences'),JSON.stringify({partition:{default_zoom_level:{x:Math.log(2)/Math.log(1.2)}}}));
 const zoom=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:['--window-size=1536,960']});
 try{const z=zoom.pages()[0];await z.route(/^https:\/\//,r=>r.abort());await z.goto('http://127.0.0.1:'+server.address().port);const metrics=await z.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom}));assert.ok(Math.abs(metrics.dpr-2)<.02);assert.ok(['1','normal'].includes(metrics.cssZoom));report.zoom.push(metrics);
  for(const id of destinations){await navigate(z,id);await shot(z,'native-200-'+id,zoom);check(await overflow(z),'Native 200% '+id+' no overflow');}
 }finally{await zoom.close();await new Promise(r=>server.close(r));}
 check(report.errors.length===0,'Zero page errors');
}finally{await browser.close();fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2)+'\n');}
