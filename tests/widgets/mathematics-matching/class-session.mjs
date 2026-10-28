import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createClassHandler} from '../../../supabase/functions/class-session/core.mjs';

// Exercise the real start payload and unchanged handler, with local auth/storage adapters.
export async function verifyMatchingClass({browser,fixture,load,check,errors}) {
  const clone=o=>JSON.parse(JSON.stringify(o)),policies=['autonomous','end','hidden','teacher'];
  for(const [final,worked,pages] of [['teacher','teacher'],['hidden','teacher'],['teacher','hidden'],['end','end'],['autonomous','autonomous'],['teacher','teacher',true]]) {
    const l=clone(fixture),a=l.slides[0].activities[1],base=clone(a.questions[0]),legacy=clone(a.questions.find(q=>q.choice));
    const questions=[{...clone(base),id:'global-matching',releaseGroup:undefined}],groups={};
    for(const f of policies)for(const w of policies){const id='group-'+f+'-'+w;questions.push({...clone(base),id,releaseGroup:id});groups[id]={final:f,worked:w};}
    a.questions=[...questions,legacy];l.meta.answerPolicy={final,worked,groups,fallback:{final:'hidden',worked:'hidden'}};
    for(const q of questions)q.parts=[{id:q.id+'-reason',label:'a',prompt:'Explain your match.',finalAnswer:'PART_FINAL_'+q.id+' $\\frac{2}{3}+x^2$',workedAnswer:'PART_WORK_'+q.id+' $x^2=16$'}];
    delete questions[0].workedSolution;delete questions[0].workedAnswer;
    if(!pages)questions[0].parts[0].answerVisuals={worked:[{ref:'matching-values'}]};
    if(pages){delete l.slides[0].practiceComposition;delete l.slides[0].visuals;for(const q of a.questions){delete q.workedSolution;delete q.visualRefs;}for(const q of questions.slice(1))q.workedAnswer='TOP_WORK '+q.id+' $x=4$';legacy.workedAnswer='LEGACY_CHOICE_WORK $x=4$';}
    l.meta.classSession={endpoint:'https://class.example/functions/v1/class-session',publishableKey:'public-test-key'};
    const rows=[],store={rateLimit:async()=>true,isTeacher:async id=>id==='teacher',insert:async row=>{rows.push({...row,id:'row'});return true;},find:async(code,id)=>rows.find(r=>r.code===code&&r.lesson_id===id),update:async(id,change)=>Object.assign(rows.find(r=>r.id===id),change)};
    const handler=createClassHandler({store,authenticate:async token=>token==='Bearer test-token'?'teacher':null,code:()=> '482731',origins:['null']});
    const context=await browser.newContext({viewport:{width:1280,height:960},acceptDownloads:true}),teacher=await context.newPage(),student=await context.newPage();
    for(const page of [teacher,student])page.on('pageerror',e=>errors.push(e.message));
    await context.route(/^https?:/,async route=>{const req=route.request();if(req.url().includes('/auth/v1/token'))return route.fulfill({json:{access_token:'test-token'}});if(req.url()!==l.meta.classSession.endpoint)return route.abort();const r=await handler(new Request(req.url(),{method:req.method(),headers:req.headers(),body:req.postData()}));return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()});});
    try {
      await load(teacher,l);
      const download=teacher.waitForEvent('download');await teacher.locator('[data-mx-mode=export]').click();
      const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'c4b-class-')),'learner.html');await(await download).saveAs(file);
      // Author mode/local previews must not cause hidden group answers to enter the payload.
      await teacher.evaluate(()=>{document.body.classList.add('present');for(const q of LESSON.slides[0].activities[1].questions)if(q.releaseGroup)GR_RELEASE.set(q.releaseGroup,{final:true,worked:true});lpBookRefresh();});
      await teacher.locator('[data-book-class]').click();await teacher.locator('[data-class-email]').fill('teacher@example.test');await teacher.locator('[data-class-password]').fill('local-test');await teacher.locator('[data-class-start]').click();await teacher.waitForFunction(()=>LP_BOOK.session?.active);
      const expected=(q,kind)=>{const group=groups[q.releaseGroup]?.[kind],p=group||(kind==='final'?final:worked);return ['autonomous','end'].includes(p)||p==='teacher'&&!group;};
      for(const q of questions)for(const kind of ['final','worked']){const key=kind==='final'?'answer':'workedAnswer';check('class '+final+'/'+worked+' '+q.id+' '+kind+' upload policy',!!rows[0].answer_bundle[q.id][key]===expected(q,kind));}
      for(const kind of ['final','worked'])check('class '+final+'/'+worked+' '+kind+' part payload retained only when authorised',questions.every(q=>rows[0].answer_bundle[q.id][kind==='final'?'answer':'workedAnswer'].includes('PART_'+(kind==='final'?'FINAL_':'WORK_')+q.id)===expected(q,kind)));
      check('class '+final+'/'+worked+' legacy choice payload unchanged',!!rows[0].answer_bundle[legacy.id].answer&&!!rows[0].answer_bundle[legacy.id].workedAnswer);
      await student.goto(pathToFileURL(file).href);await student.evaluate(()=>lpNavigate(0,'practice-choice'));
      await student.locator('[data-book-class]').click();await student.locator('[data-class-code-input]').fill('482731');await student.locator('[data-class-join]').click();await student.waitForFunction(()=>LP_BOOK.session?.active);
      check('class '+final+'/'+worked+' locked response contains no answers',await student.evaluate(()=>Object.keys(LP_BOOK.session.answers).length===0));
      for(const state of ['finals','worked']){
        await teacher.locator('[data-class-state]').selectOption(state);await teacher.locator('[data-class-release]').click();
        // Join again through the UI to read the real handler immediately, without a polling delay.
        await student.locator('[data-class-join]').click();await student.waitForFunction(s=>LP_BOOK.session?.state===s,state);
        const answers=await student.evaluate(()=>LP_BOOK.session.answers);
        for(const q of questions)for(const kind of ['final','worked'])check('class '+final+'/'+worked+' '+state+' '+q.id+' '+kind+' delivered policy',!!answers[q.id]?.[kind==='final'?'answer':'workedAnswer']===(expected(q,kind)&&(kind==='final'||state==='worked')));
        for(const kind of ['final','worked'])check('class '+final+'/'+worked+' '+state+' '+kind+' delivered part policy',questions.every(q=>(answers[q.id]?.[kind==='final'?'answer':'workedAnswer']||'').includes('PART_'+(kind==='final'?'FINAL_':'WORK_')+q.id)===(expected(q,kind)&&(kind==='final'||state==='worked'))));
        if(final==='teacher')check('global teacher matching model remains available after '+state,await student.evaluate(()=>mmVisible(LESSON.slides[0].activities[1].questions[0],'final')));
        check('withheld groups remain locked after global '+state,await student.evaluate(()=>LESSON.slides[0].activities[1].questions.filter(q=>q.releaseGroup?.includes('teacher')).every(q=>['final','worked'].every(k=>LESSON.meta.answerPolicy.groups[q.releaseGroup][k]!=='teacher'||!mmVisible(q,k)))));
        if(state==='worked'&&!pages&&['autonomous','end'].includes(worked)){if(worked==='end')await student.evaluate(()=>{LP_BOOK.completed=true;lpBookRefresh();});await student.locator('[data-book-close]').click();await student.locator('[data-book-hub]').click();await student.locator('[data-book-kind=worked]').click();const card=student.locator('[data-book-answer=global-matching]');check(worked+' remote part working appears only once',await card.innerText().then(t=>t.split('PART_WORK_global-matching').length-1===1));check(worked+' remote solution retains the local C2 part table',await card.locator('table').count()===1);await student.locator('[data-book-close]').click();await student.locator('[data-book-class]').click();}
        if(pages){await student.locator('[data-book-close]').click();await student.locator('[data-book-hub]').click();await student.locator('[data-book-kind='+ (state==='finals'?'final':'worked')+']').click();const card=student.locator('[data-book-answer=global-matching]'),choice=student.locator('[data-book-answer='+legacy.id+']');check('pages remote '+state+' maths rendered without micro/figures/structured flag',await card.locator('math msup').count()>0&&await card.locator('.md-notation-error').count()===0&&!await card.innerText().then(t=>t.includes('$')));check('pages remote '+state+' part content rendered',await card.innerText().then(t=>t.includes(state==='finals'?'PART_FINAL_global-matching':'PART_WORK_global-matching')));check('pages remote '+state+' shared choice maths renders',await choice.locator('math').count()>0&&!await choice.innerText().then(t=>t.includes('$')));await student.locator('[data-book-close]').click();await student.locator('[data-book-class]').click();}
      }
      await teacher.locator('[data-class-state]').selectOption('locked');await teacher.locator('[data-class-release]').click();await student.locator('[data-class-join]').click();await student.waitForFunction(()=>LP_BOOK.session?.state==='locked');check('class '+final+'/'+worked+' relock empties remote cache',await student.evaluate(()=>Object.keys(LP_BOOK.session.answers).length===0));
    } finally {await context.close();}
  }
}
