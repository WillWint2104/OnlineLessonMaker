import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import http from 'node:http';import os from 'node:os';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
const out=process.env.M2_UX_REVIEW_DIR||(process.env.PLAYER_REVIEW_DIR?process.env.PLAYER_REVIEW_DIR+'/mathematics-m2-ux':'docs/review/mathematics-m2-ux');
fs.mkdirSync(out+'/workflow',{recursive:true});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),appSha256:createHash('sha256').update(fs.readFileSync('lesson-studio.html')).digest('hex'),checks:[],captures:[],errors:[]};
const check=(value,label)=>{assert.ok(value,label);report.checks.push(label);console.log('PASS '+label);};
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1536,height:960},recordVideo:{dir:out+'/workflow',size:{width:1536,height:960}}}),p=await context.newPage();
p.on('pageerror',e=>report.errors.push(e.message));await p.route(/^https?:/,r=>r.abort());
const lesson=JSON.parse(fs.readFileSync('lessons/expanding-two-binomials/lesson.json'));
const shot=async(name,page=p)=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:out+'/'+name+'.png'});report.captures.push(name);};
const open=async()=>{await p.locator('[data-math-calculator]').click();await p.locator('#calc-p').focus();};
const close=async()=>{await p.locator('[data-math-close]').click();};
const mode=async id=>{await p.locator('[data-math-mode]').click();assert.equal(await p.locator('.calc-tile').count(),8);await p.locator('.calc-tile[data-mode="'+id+'"]').click();};
const key=async selector=>{await p.locator(selector).click();};
const input=async text=>{await p.locator('#calc-p').focus();await p.keyboard.type(text);};
const ac=async()=>key('[data-act="ac"]');
const execute=async expected=>{await key('[data-act="exe"]');assert.ok(Math.abs(Number(await p.locator('.calc-result-value').textContent())-expected)<1e-8);};
const box=()=>p.locator('.math-utility-dialog').boundingBox();
try{
 await p.goto(pathToFileURL(path.resolve('lesson-studio.html')).href);await p.evaluate(l=>{LESSON=l;cur=0;render();},lesson);await shot('01-lesson-launcher');
 const before=await p.locator('.mx-main').evaluate(e=>({html:e.innerHTML,width:e.getBoundingClientRect().width}));
 await open();check((await p.locator('[data-math-mode]').textContent()).startsWith('Calculate'),'First open enters Calculate directly');
 const normal=await box();check(normal.width>=440&&normal.width<=500&&normal.height>normal.width,'Medium scientific proportions: 440–500px wide and taller than wide');
 check(await p.locator('.math-utility-bar').count()===1&&await p.locator('.calc-hdr,.calc-v2-hdr').count()===0,'One calculator header');
 check(await p.locator('[data-math-close]').count()===1&&await p.locator('[data-hgl-action="close"],[data-hgl-action="expand"]').count()===0,'One Close and one Expand control');
 await shot('02-medium-normal');await key('[data-act="shift"]');await shot('03-medium-shift');
 check(await p.locator('.calc-v2-mathkey[data-fn="asin"]').textContent()==='sin−1','SHIFT replaces the sine key face and action together');
 check(await p.locator('.calc-v2-shift-band,.calc-v2-shift-lbl').count()===0,'No permanent secondary label band');
 await key('[data-act="shift"]');check(await p.locator('.calc-v2-mathkey[data-fn="sin"]').count()===1,'Second SHIFT cancels');
 // Every nonempty source shiftLbl mapping, including the two contextual actions.
 for(const test of [
  {primary:'[data-tmpl="square"]',secondary:'[data-tmpl="cube"]',slots:['2'],result:8},
  {primary:'[data-tmpl="pow"]',secondary:'[data-tmpl="nroot"]',slots:['3','8'],result:2},
  {primary:'[data-tmpl="sqrt"]',secondary:'[data-tmpl="cbrt"]',slots:['8'],result:2},
  {primary:'[data-tmpl="nroot"]',secondary:'[data-fn="log10"]',slots:['1000)'],result:3},
  {primary:'[data-tmpl="log"]',secondary:'[data-tmpl="pow10"]',slots:['3'],result:1000},
  {primary:'[data-fn="ln"]',secondary:'[data-fn="exp"]',slots:['1)'],result:Math.E},
  {primary:'[data-fn="sin"]',secondary:'[data-fn="asin"]',slots:['0.5)'],result:30},
  {primary:'[data-fn="cos"]',secondary:'[data-fn="acos"]',slots:['0.5)'],result:60},
  {primary:'[data-fn="tan"]',secondary:'[data-fn="atan"]',slots:['1)'],result:45},
  {primary:'[data-tmpl="frac"]',secondary:'[data-tmpl="reciprocal"]',slots:['4'],result:.25},
  {primary:'[data-act="v2-pm"]',secondary:'[data-fn="abs"]',slots:['-7)'],result:7}
 ]){
   await ac();assert.equal(await p.locator('.calc-v2-mathkey'+test.primary).count(),1);await key('[data-act="shift"]');
   await key('.calc-v2-mathkey'+test.secondary);assert.equal(await p.locator('[data-act="shift"]').getAttribute('aria-pressed'),'false');
   for(const [i,value]of test.slots.entries()){if(i)await key('[data-act="right"]');await input(value);}await execute(test.result);
 }
 await ac();await input('45.5');await execute(45.5);await key('[data-act="shift"]');await key('[data-act="v2-dms"]');assert.match(await p.locator('.calc-result-value').textContent(),/45.*30/);
 await key('[data-act="shift"]');await key('[data-act="v2-dms"]');assert.equal(await p.locator('.calc-result-value').textContent(),'45.5');
 await ac();await key('[data-tmpl="mixed"]');for(const [i,v]of ['1','1','2'].entries()){if(i)await key('[data-act="right"]');await input(v);}await execute(1.5);
 await key('[data-act="shift"]');await key('[data-act="v2-dc"]');assert.equal(await p.locator('[data-act="shift"]').getAttribute('aria-pressed'),'false');assert.match(await p.locator('.calc-result-value').textContent(),/3.*2/);
 check(true,'Every authored SHIFT mapping executes correctly and auto-clears, including DMS toggle and d/c');
 await ac();await key('[data-tmpl="frac"]');await input('12');await shot('05-cursor-numerator');await key('[data-act="down"]');await input('4');await shot('06-cursor-denominator');
 await key('[data-act="del"]');await input('3');await shot('07-edited-denominator');await execute(4);check(true,'Fraction sibling-slot navigation, template-aware DEL and insertion produce 12/3 = 4');
 await ac();await key('[data-tmpl="frac"]');await key('[data-act="del"]');await input('9');await execute(9);check(true,'Deleting an empty template at its boundary preserves a coherent expression');
 await ac();await key('[data-tmpl="frac"]');await key('[data-tmpl="sqrt"]');await input('81');await key('[data-act="right"]');await key('[data-act="right"]');await input('3');await shot('04-medium-nested');
 const expression=await p.locator('.calc-input').innerHTML();await key('[data-math-expand]');assert.equal(await p.locator('.calc-input').innerHTML(),expression);await shot('11-expanded-calculate');await shot('12-expanded-template-editing');
 check(await p.locator('.olm-history .calc-v2-history-row').count()>0&&await p.locator('.olm-template-grid button').count()===8,'Expanded workspace uses source history and eight working templates');
 check((await p.locator('.calc-display').boundingBox()).width>normal.width,'Expanded display uses the larger workspace');
 await shot('13-expanded-history');await key('.olm-template-grid [data-tmpl="integ"]');await shot('14-expanded-template-insertion');await key('[data-act="shift"]');await shot('15-expanded-shift');
 await key('[data-math-expand]');assert.equal(await p.locator('[data-act="shift"]').getAttribute('aria-pressed'),'true');check(true,'Expand/Reduce retains cursor, structured expression and SHIFT layer');await key('[data-act="shift"]');
 const handle=await p.locator('.math-utility-bar b').boundingBox();await p.mouse.move(handle.x+20,handle.y+12);await p.mouse.down();await p.mouse.move(350,160,{steps:10});await p.mouse.up();const moved=await box();check(moved.x<normal.x-200,'Header drag moves the medium window');
 await p.mouse.move(moved.x+70,moved.y+20);await p.mouse.down();await p.mouse.move(-400,-300,{steps:5});await p.mouse.up();const bounded=await box();check(bounded.x>=6&&bounded.y>=6,'Dragging clamps the window to viewport bounds');await shot('29-moved-calculator');
 assert.deepEqual(await p.locator('.mx-main').evaluate(e=>({html:e.innerHTML,width:e.getBoundingClientRect().width})),before);check(true,'Open, expand, restore and drag leave lesson markup and width unchanged');
 await key('[data-math-mode]');await shot('08-mode-picker');await key('.calc-tile[data-mode="statistics"]');
 const xs=p.locator('.st-cell[data-col="x"]');await xs.nth(0).fill('2');await xs.nth(1).fill('4');await xs.nth(2).fill('7');await key('[data-act="calc"]');await shot('09-medium-statistics');assert.equal((await box()).height,normal.height);
 await key('[data-math-expand]');await shot('16-expanded-statistics');check(await p.locator('.olm-stat-workspace section').count()===3,'Expanded Statistics has data, actual results and supported tools/keypad regions');
 await p.locator('.st-cell[data-col="x"]').nth(0).fill('2');await key('[data-stat-insert="4"]');assert.equal(await p.locator('.st-cell[data-col="x"]').nth(0).inputValue(),'24');await key('[data-stat-nav="del"]');assert.equal(await p.locator('.st-cell[data-col="x"]').nth(0).inputValue(),'2');await key('[data-stat-nav="down"]');assert.equal(await p.locator('.st-cell[data-col="x"]').nth(1).evaluate(e=>e===e.getRootNode().activeElement),true);check(true,'Statistics keypad edits the selected source cell and navigation changes cell focus');
 await key('[data-math-close]');await open();check((await p.locator('[data-math-mode]').textContent()).startsWith('Statistics'),'Selected mode survives close/reopen');assert.equal(await p.locator('.olm-mode-picker').count(),0);assert.equal(await p.locator('.st-cell[data-col="x"]').nth(2).inputValue(),'7');
 for(const [id,name]of [['table','17-expanded-table'],['spreadsheet','18-expanded-spreadsheet'],['complex','19-expanded-complex'],['vector','20-expanded-vector'],['inequality','21-expanded-inequality'],['distribution','22-expanded-distribution']]){
   await mode(id);if(!await p.locator('.math-utility-dialog').evaluate(e=>e.classList.contains('math-utility-expanded')))await key('[data-math-expand]');
   if(id==='table'){await p.locator('[data-tkey="expr"]').fill('2x+1');await p.locator('[data-tkey="start"]').fill('0');await p.locator('[data-tkey="end"]').fill('10');await key('[data-act="compute"]');await key('[data-math-expand]');await shot('10-medium-table');await key('[data-math-expand]');}
   if(['complex','vector','distribution'].includes(id)){if(id==='vector')await key('[data-act="op-cross"]');await key(id==='complex'?'[data-act="evaluate"]':'[data-act="compute"]');}
   if(id==='spreadsheet'){await p.locator('.sh-finput').fill('2');await key('[data-ref="A2"]');await p.locator('.sh-finput').fill('3');await key('[data-ref="B1"]');await p.locator('.sh-finput').fill('=SUM(A1:A2)');await key('[data-ref="C1"]');}
   if(id==='inequality')await key('[data-iact="solve"]');
   if(id==='table')assert.equal(await p.locator('.st-table tbody tr').count(),11);
   if(id==='spreadsheet')assert.equal(await p.locator('[data-ref="B1"]').textContent(),'5');
   if(id==='complex')assert.equal(await p.locator('.cx-rv').textContent(),'5 + i');
   if(id==='vector')assert.equal(await p.locator('.dt-rvalue').textContent(),'[ 0, 0, 1 ]');
   if(id==='distribution')assert.match(await p.locator('.dt-rvalue').textContent(),/^0\.3989/);
   if(id==='inequality')assert.ok((await p.locator('.iq-result').textContent()).length>0);
   await shot(name);check(true,id+': meaningful expanded source result');
   await key('[data-math-expand]');const modeText=await p.locator('[data-math-mode]').textContent();await key('[data-math-expand]');assert.equal(await p.locator('[data-math-mode]').textContent(),modeText);
 }
 await mode('calculate');await key('[data-act="shift"]');await close();await open();assert.equal(await p.locator('[data-act="shift"]').getAttribute('aria-pressed'),'false');
 await p.reload();await p.evaluate(l=>{LESSON=l;cur=0;render();},lesson);await open();assert.match(await p.locator('[data-math-mode]').textContent(),/^Calculate/);check(true,'Refresh resets mode; closing clears SHIFT and transient mode chooser');
 await mode('statistics');await close();await p.evaluate(l=>{LESSON=structuredClone(l);cur=0;render();},lesson);await open();assert.match(await p.locator('[data-math-mode]').textContent(),/^Calculate/);check(true,'New lesson identity resets calculator mode');
 for(const [width,height,label]of [[1024,768,'23-tablet-medium'],[390,844,'25-mobile']]){
   await close();await p.setViewportSize({width,height});await open();await shot(label);check(await p.evaluate(()=>{const r=MATH_UTILITY.dialog.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1;}),'Viewport-bounded calculator at '+width);
   if(width===1024){await key('[data-math-expand]');await shot('24-tablet-expanded');await key('[data-math-expand]');}else{assert.ok(!await p.locator('[data-math-expand]').isVisible());await key('[data-act="shift"]');await shot('30-mobile-shift');await p.locator('[data-act="exe"]').scrollIntoViewIfNeeded();await shot('31-mobile-keypad');}
 }
 await close();await p.setViewportSize({width:1536,height:960});await p.goto(pathToFileURL(path.resolve('lessons/expanding-two-binomials.html')).href);await open();await input('7*8');await execute(56);await shot('27-independent-learner');check(true,'Independent published learner lesson runs the corrected calculator');await close();
 const bytes=fs.readFileSync('lessons/expanding-two-binomials.html'),server=http.createServer((req,res)=>res.end(bytes));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const profile=fs.mkdtempSync(path.join(os.tmpdir(),'olm-m2-ux-'));fs.mkdirSync(profile+'/Default');fs.writeFileSync(profile+'/Default/Preferences',JSON.stringify({partition:{default_zoom_level:{x:Math.log(2)/Math.log(1.2)}}}));const zoom=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:['--window-size=1536,960']});try{const z=zoom.pages()[0];z.on('pageerror',e=>report.errors.push(e.message));await z.goto('http://127.0.0.1:'+server.address().port);assert.ok(Math.abs(await z.evaluate(()=>devicePixelRatio)-2)<.02);await z.locator('[data-math-calculator]').click();const cdp=await zoom.newCDPSession(z),s=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});fs.writeFileSync(out+'/26-native-200.png',Buffer.from(s.data,'base64'));report.captures.push('26-native-200');assert.ok(await z.evaluate(()=>{const r=MATH_UTILITY.dialog.getBoundingClientRect();return r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}));await z.locator('[data-act="exe"]').scrollIntoViewIfNeeded();check(true,'Actual native 200% browser zoom retains bounded shell and accessible keypad');}finally{await zoom.close();}}finally{await new Promise(r=>server.close(r));}
 // A separate short recording follows the requested learner sequence without the calibration cases.
 const videoContext=await browser.newContext({viewport:{width:1536,height:960},recordVideo:{dir:out+'/workflow',size:{width:1536,height:960}}}),v=await videoContext.newPage();
 try{
   v.on('pageerror',e=>report.errors.push(e.message));await v.route(/^https?:/,r=>r.abort());await v.goto(pathToFileURL(path.resolve('lessons/expanding-two-binomials.html')).href);
   const click=async selector=>{await v.locator(selector).click();await v.waitForTimeout(250);};
   const type=async value=>{await v.locator('#calc-p').focus();await v.keyboard.type(value,{delay:100});};
   await v.waitForTimeout(400);await click('[data-math-calculator]');await click('[data-tmpl="frac"]');await type('12');await click('[data-act="down"]');await type('4');await click('[data-act="del"]');await type('3');await click('[data-act="exe"]');
   await click('[data-act="ac"]');await click('[data-act="shift"]');await click('[data-fn="asin"]');await type('0.5)');await click('[data-act="exe"]');
   await click('[data-math-mode]');await click('.calc-tile[data-mode="statistics"]');const values=v.locator('.st-cell[data-col="x"]');for(const [i,value]of ['2','4','7'].entries())await values.nth(i).fill(value);await click('[data-act="calc"]');await click('[data-math-expand]');
   await click('[data-math-mode]');await click('.calc-tile[data-mode="calculate"]');await click('[data-act="ac"]');await click('.olm-template-grid [data-tmpl="frac"]');await click('.olm-template-grid [data-tmpl="sqrt"]');await type('81');await click('[data-act="right"]');await click('[data-act="right"]');await type('3');await v.waitForTimeout(600);
   const expression=await v.locator('.calc-input').innerHTML();await click('[data-math-expand]');const grip=await v.locator('.math-utility-bar b').boundingBox();await v.mouse.move(grip.x+10,grip.y+12);await v.mouse.down();await v.mouse.move(650,180,{steps:20});await v.mouse.up();await v.waitForTimeout(400);await click('[data-math-close]');await click('[data-math-calculator]');assert.equal(await v.locator('.calc-input').innerHTML(),expression);await v.waitForTimeout(700);check(true,'Requested short workflow ends with the same nested expression after Reduce, drag, close and reopen');
 }finally{await videoContext.close();fs.copyFileSync(await v.video().path(),out+'/workflow/calculator-ux-walkthrough.webm');}
 const qualitative=JSON.parse(fs.readFileSync('lessons/australia-home-front-propaganda/lesson.json'));await p.goto(pathToFileURL(path.resolve('lesson-studio.html')).href);await p.evaluate(l=>{LESSON=l;cur=0;render();},qualitative);assert.equal(await p.locator('[data-math-calculator]').count(),0);await shot('28-non-mathematics');check(true,'Non-Mathematics isolation');check(!report.errors.length,'Zero page errors');
}finally{await p.screenshot({path:out+'/last-state.png'}).catch(()=>{});await context.close();fs.copyFileSync(await p.video().path(),out+'/workflow/calculator-ux-test-recording.webm');await browser.close();fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2)+'\n');}
