// Additional real-player integration checks; run after verify.mjs in the same G03_OUT.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const input=path.resolve(process.env.G03_OUT||'review-delivery/geography-g03/current');
const out=path.join(input,'integration');
assert.equal(fs.existsSync(out),false,'Use a fresh integration output; previous review evidence is preserved.');
fs.mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const fixturePath='tests/widgets/geography-g03/fixtures/year-9-urbanisation.json',fixtureBytes=fs.readFileSync(fixturePath);
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),appSha256:hash(fs.readFileSync('lesson-studio.html')),fixtureSha256:hash(fixtureBytes),checks:[],captures:[],errors:[],exports:[],complete:false,limits:['Local application and offline exports only; no live classroom endpoint or physical-device certification.']};
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
const check=(ok,label)=>{assert.ok(ok,label);report.checks.push(label);console.log('PASS '+label);};
const browser=await chromium.launch();
const setup=p=>{p.on('pageerror',e=>report.errors.push(e.message));p.setDefaultTimeout(15000);};
const p=await browser.newPage({viewport:{width:1280,height:900}});setup(p);
const year9=JSON.parse(fixtureBytes);
const load=async lesson=>{
  await p.goto(pathToFileURL(path.resolve('lesson-studio.html')).href);
  await p.locator('#modeSeg [data-mode="edit"]').click();await p.locator('#dataBtn').click();
  await p.locator('#jsonArea').fill(JSON.stringify(lesson));await p.locator('#jsonLoad').click();
  check(!(await p.locator('#jsonErr').textContent()),'Integration fixture imports through real authoring');
  await p.locator('[data-mx-mode="study"]').click();
  await p.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities[0].id));
};
const shot=async(name,bottom=false)=>{
  await p.evaluate(()=>document.fonts.ready);
  await p.locator('.mx-page').evaluate((e,b)=>e.scrollTop=b?e.scrollHeight:0,bottom);
  await p.screenshot({path:path.join(out,name+'.png')});report.captures.push('integration/'+name+'.png');
};
const contain=async label=>check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('.mx-page').scrollWidth<=document.querySelector('.mx-page').clientWidth+1),label+' contained in shared scroll surface');
const open=async name=>{await p.goto(pathToFileURL(path.join(input,name+'.html')).href);await p.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities[0].id));};
const optional=structuredClone(year9);
optional.slides[0].activities[0].questions=[{id:'urbanisation-review-optional',stem:'Can urban population grow without urbanisation?',parts:['Use the illustrative numbers from the next concept to explain your answer.'],answer:'G03-FINAL-REVIEW-KEY: Yes; both populations can grow while the urban share stays constant.',workedAnswer:'G03-WORKED-REVIEW-KEY: 48 out of 120 is still 40%.',teacherNote:'G03-TEACHER-ONLY-REVIEW'}];
try{
  await open('year-9-urbanisation');await contain('1280 Year 9');
  await shot('year-9-1280-concept');await shot('year-9-1280-notes',true);
  check(await p.locator('.geo-g03-notes li').count()===3,'Year 9 retains three authored notes');
  await p.locator('[data-lp-move="1"]').focus();await p.keyboard.press('Enter');
  check(await p.locator('.geo-g03-visual').count()===0,'Text-only concept has no empty visual');
  check(await p.locator('#lpTitle').evaluate(e=>e===document.activeElement&&getComputedStyle(e).outlineStyle!=='none'),'Keyboard destination focus remains visible');
  await shot('year-9-1280-text-only-focus');
  await p.setViewportSize({width:1024,height:768});await contain('1024 text-only');await shot('year-9-1024-text-only');
  await p.setViewportSize({width:1280,height:900});await load(optional);
  check(await p.locator('.geo-g03-check').count()===1&&await p.locator('.mx-work').count()===1,'Optional question reuses shared question and workbook');
  const response='The urban count rises while the urban share remains unchanged.';
  await p.locator('[data-mx-typed]').fill(response);
  await p.locator('[data-lp-move="1"]').click();await p.locator('[data-lp-move="-1"]').click();
  check((await p.locator('[data-mx-typed]').innerText()).includes(response),'Typed optional response survives Next and Previous');
  await p.setViewportSize({width:1024,height:768});
  check((await p.locator('[data-mx-typed]').innerText()).includes(response),'Typed optional response survives responsive resize');
  await contain('1024 optional response');await p.setViewportSize({width:1280,height:900});
  await shot('year-9-1280-optional');await shot('year-9-1280-optional-lower',true);
  await p.setViewportSize({width:1536,height:1000});await shot('year-9-1536-optional');
  await p.setViewportSize({width:1280,height:900});
  const failed=structuredClone(year9);failed.slides[0].activities[0].image.src='./missing-g03-review-image.png';await load(failed);
  await p.locator('.geo-g03-unavailable').waitFor({state:'visible'});
  check((await p.locator('.geo-g03-unavailable').innerText()).includes('Illustrative comparison'),'Failed visual exposes authored alternative');
  check(await p.locator('.geo-g03-notes li').count()===3,'Failed visual retains essential notes');
  check(await p.locator('.geo-g03-citation a').getAttribute('href')===year9.slides[0].activities[0].image.sourceUrl,'Source citation retained with failed image');
  await contain('Failed visual');await shot('year-9-1280-image-fallback');
  await open('year-10-wellbeing');await contain('HDI compatibility');await shot('year-10-1280-compatibility');await shot('year-10-1280-notes',true);
  const shellFont=await p.locator('.lp-footer').evaluate(e=>getComputedStyle(e).fontFamily);
  const plain=structuredClone(year9);for(const a of plain.slides[0].activities){delete a.layout;delete a.keyNotes;delete a.image;}
  await load(plain);
  check(await p.locator('.lp-footer').evaluate(e=>getComputedStyle(e).fontFamily)===shellFont,'G03 leaves the shared navigation font unchanged');
  const shared=structuredClone(year9),activity=shared.slides[0].activities[0];
  activity.notes=[{term:'Area in km^2',body:'Compare 2 km^2 with 3 km^2. Scale 10^12. The visit is on 15/11. Costs rise from $100 to $200. **Urban share $\\frac{40}{100}$**. <script>window.g03Unsafe=true</script>'}];
  shared.slides[0].visuals=[{id:'g03-unrelated-table',kind:'table',label:'Unrelated context',description:'An unrelated table supplies the formatting-context regression.',stub:'Group',head:['Count'],rows:[{label:'Urban',cells:['40']}]}];
  activity.workedExamples=[{id:'g03-shared-group',type:'extended',examples:[{id:'g03-shared-example',label:'Retained shared calculation',prompt:'Find the urban share when 40 of 100 residents are urban.',steps:[{id:'g03-shared-step',math:'40/100=0.4',text:'Divide the urban count by the whole population.'}],answer:'40%'}]}];
  activity.video={url:'https://www.youtube.com/watch?v=aqz-KE-bpKQ',title:'G03 existing video fixture'};
  await load(shared);
  check(await p.locator('.geo-g03-explanation sup').count()===4&&await p.locator('.geo-g03-explanation sup').last().innerText()==='12','G03 formats complete bare exponents without changing their meaning');
  check(await p.locator('.geo-g03-explanation mfrac').count()===1&&await p.locator('.geo-g03-explanation b math').count()===1,'Delimited fractions retain their authored rich-text wrapper');
  check((await p.locator('.geo-g03-explanation').innerText()).includes('15/11. Costs rise from $100 to $200.'),'Explanation dates and currency remain prose even alongside shared visuals');
  check(await p.locator('.geo-g03-explanation script').count()===0&&await p.evaluate(()=>!window.g03Unsafe),'Prose formatter escapes authored HTML');
  const textCases=[
    {text:'$$x$$',math:0,contains:'$$x$$'},
    {text:'$$$x$$$',math:0,contains:'$$$x$$$'},
    {text:'$x$ then $$y$$ then $z$',math:2,contains:'$$y$$'},
    {text:'On 15/11 costs range from $100 to $200.',math:0,contains:'$100 to $200'},
    {text:'Cost $100 and ratio $\\frac{40}{100}$.',math:1,fractions:1,contains:'$100'},
    {text:'$100 $x^2$',math:1,contains:'$100'},
    {text:'Cost $200. $x^2$',math:1,contains:'$200.'},
    {text:'$x^2$ and $\\frac{40}{100}$',math:2,fractions:1},
    {text:'10^12 and 10^{12} and 10^-12 and 10^n',math:0,powers:['12','12','-12','n']},
    {text:'10^1.5 and 10^12abc',math:0,powers:[],contains:'10^1.5 and 10^12abc'},
    {text:'<script>alert(1)</script> $x$',math:1,contains:'<script>'},
    {text:'\\$100 plus $x$',math:1,contains:'$100'},
    {text:'$2 sin(x)$',math:1},
    {text:'$abc def$',math:1},
    {text:'$\\unknown{1}$',math:0,contains:'\\unknown'},
    {text:'$40$ people',math:1},
    {text:'$100$200',math:0,contains:'$100$200'},
    {text:'Urban share $40/100$ with a cost of $100 to $200.',math:1,contains:'$100 to $200'},
    {text:'Costs $100 per km^2 and $200 per km^2.',math:0,powers:['2','2'],contains:'$100 per km'},
    {text:'$\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}$',math:1},
    {text:'$\\int_0^1 x\\,dx$',math:1},
    {text:'$2\\times abc$',math:1},
    {text:'**The share is $x$**',math:1,boldMath:1},
    {text:'==The share is $x$==',math:1,highlightMath:1},
    {text:'[[The share is $\\frac{40}{100}$]]',math:1,noteMath:1},
    {text:'**One $x$** and **two $y$**',math:2,boldMath:2},
    {text:'**Cost $100 and ratio $\\frac{40}{100}$**',math:1,boldMath:1,contains:'$100'},
    {text:'$**100** and $x$',math:1,contains:'$100'},
    {text:'\uE000G03MATH0\uE001 $x$',math:1,contains:'\uE000G03MATH0\uE001'}
  ];
  for(const sample of textCases){
    const result=await p.evaluate(text=>{const e=document.createElement('div');e.innerHTML=geoG03Text(text);return {text:e.textContent,math:e.querySelectorAll('math').length,fractions:e.querySelectorAll('mfrac').length,powers:[...e.querySelectorAll('sup')].map(s=>s.textContent),boldMath:e.querySelectorAll('b math').length,highlightMath:e.querySelectorAll('.tp-hl math').length,noteMath:e.querySelectorAll('.tp-noteclause math').length,unsafe:e.querySelectorAll('script,img').length};},sample.text);
    check(result.math===sample.math&&(!sample.contains||result.text.includes(sample.contains))&&(sample.fractions==null||result.fractions===sample.fractions)&&(!sample.powers||JSON.stringify(result.powers)===JSON.stringify(sample.powers))&&['boldMath','highlightMath','noteMath'].every(k=>sample[k]==null||result[k]===sample[k])&&!result.unsafe,'Actual prose/math renderer case: '+sample.text);
  }
  check((await p.locator('[data-mx-example="g03-shared-example"]').innerText()).includes('Divide the urban count'),'Shared worked example accepted by inspector remains visible');
  check(await p.locator('iframe[title="G03 existing video fixture"]').count()===1,'Shared activity video accepted by inspector remains visible');
  const publicationIssue=await p.evaluate(()=>{try{lpValidatePublication(LESSON);return '';}catch(e){return e.message;}});
  check(!publicationIssue,'Shared-content prose fixture passes publication preflight: '+publicationIssue);
  const sharedDownload=p.waitForEvent('download');await p.locator('[data-mx-mode="export"]').click();
  const sharedFile=path.join(out,'shared-content.html');await(await sharedDownload).saveAs(sharedFile);
  const sharedContext=await browser.newContext({offline:true}),sharedPage=await sharedContext.newPage();setup(sharedPage);
  try{
    await sharedPage.goto(pathToFileURL(sharedFile).href);await sharedPage.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities[0].id));
    check(await sharedPage.locator('.geo-g03-explanation sup').count()===4&&await sharedPage.locator('.geo-g03-explanation mfrac').count()===1&&await sharedPage.locator('.geo-g03-explanation b math').count()===1,'Complete exponents and rich-text maths survive actual standalone export/reopen');
    check((await sharedPage.locator('.geo-g03-explanation').innerText()).includes('15/11. Costs rise from $100 to $200.'),'Standalone export preserves explanation dates and currency');
    check(await sharedPage.locator('[data-mx-example="g03-shared-example"]').count()===1&&await sharedPage.locator('iframe[title="G03 existing video fixture"]').count()===1,'Standalone G03 retains authored shared example and video embed');
    check(await sharedPage.evaluate(()=>LESSON.slides[0].activities[0].workedExamples[0].examples[0].id)==='g03-shared-example','Shared rendering preserves authored example identity');
    report.exports.push({file:'integration/shared-content.html',sha256:hash(fs.readFileSync(sharedFile)),scope:'Shared notation/example/video regression; embed presence only, no video-playback certification.'});
  }finally{await sharedContext.close();}
  // Export actual optional-question lessons. End answers stay embedded by explicit user policy;
  // hidden/teacher-withheld answers must be absent, including from the document source.
  for(const policy of ['hidden','teacher','end','autonomous']){
    const lesson=structuredClone(optional);lesson.meta.answerPolicy={final:policy,worked:policy,fallback:{final:'hidden',worked:'hidden'}};
    await load(lesson);const wait=p.waitForEvent('download');await p.locator('[data-mx-mode="export"]').click();
    const file=path.join(out,'optional-'+policy+'.html');await(await wait).saveAs(file);
    const context=await browser.newContext({offline:true}),q=await context.newPage();setup(q);
    try{
      await q.goto(pathToFileURL(file).href);await q.evaluate(()=>lpNavigate(0,LESSON.slides[0].activities[0].id));
      const data=await q.evaluate(()=>({question:LESSON.slides[0].activities[0].questions[0],allowed:['final','worked'].map(k=>lpBookAllowed(k))}));
      const withheld=['hidden','teacher'].includes(policy),source=fs.readFileSync(file,'utf8');
      check(!!data.question.answer===!withheld&&!!data.question.workedAnswer===!withheld,policy+' export projects optional answer fields correctly');
      check(!source.includes('G03-TEACHER-ONLY-REVIEW'),policy+' export strips teacher note');
      if(withheld)check(!source.includes('G03-FINAL-REVIEW-KEY')&&!source.includes('G03-WORKED-REVIEW-KEY'),policy+' withheld answers absent from actual export bytes');
      check(data.allowed.every(x=>x===(policy==='autonomous')),policy+' learner respects initial release state');
      await q.evaluate(()=>{LP_BOOK.completed=true;LP_STATE.end=true;renderSlide();});
      check(await q.evaluate(()=>['final','worked'].every(k=>lpBookAllowed(k)))===!withheld,policy+' completion honours existing release policy');
      check(await q.locator('[data-mx-mode="edit"]').count()===0,policy+' export has no author controls');
      report.exports.push({file:'integration/'+path.basename(file),policy,sha256:hash(fs.readFileSync(file)),withheld});
    }finally{await context.close();}
  }
  check(report.errors.length===0,'Zero integration page errors');report.complete=true;
}finally{
  await browser.close();report.headAfter=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(report.errors.length||report.headAfter!==report.head){report.complete=false;process.exitCode=1;}
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({complete:report.complete,checks:report.checks.length,captures:report.captures.length,errors:report.errors}));
}
