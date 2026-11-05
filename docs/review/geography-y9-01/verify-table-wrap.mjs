import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const out=process.env.Y9_WRAP_OUT;assert(out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const lesson=JSON.parse(fs.readFileSync(root+'/docs/review/geography-y9-01/lesson.json'));
const heading='Population living in rapidly growing outer metropolitan neighbourhoods across the selected Australian capital city regions';
const text='This geographically located observation describes a long comparison between outer metropolitan communities and established inner urban neighbourhoods using the supplied population evidence.';
const a=lesson.slides.flatMap(s=>s.activities).find(a=>a.id==='table-investigation');
const skill=lesson.slides.find(s=>s.activities.includes(a));
Object.assign(skill.visuals.find(v=>v.id==='city-table'),{stub:'Place',head:[heading,'Population','Annual growth'],rows:[{label:'Example region',cells:[text,'12,345,678','23.45%']}]});
const errors=[],checks=[],measurements=[],captures=[];
const shot=async(p,n)=>{await p.screenshot({path:out+'/'+n+'.png'});captures.push(n+'.png');};
async function test(p,label){
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(pathToFileURL(root+'/lesson-studio.html').href);
 await p.locator('#modeSeg [data-mode="edit"]').click();await p.locator('#dataBtn').click();await p.locator('#jsonArea').fill(JSON.stringify(lesson));await p.locator('#jsonLoad').click();assert.equal(await p.locator('#jsonErr').textContent(),'');
 await p.locator('[data-mx-mode="study"]').dispatchEvent('click');await p.evaluate(()=>lpNavigate(2,'table-investigation'));await p.evaluate(()=>document.fonts.ready);
 const result=await p.locator('.mx-tbl').first().evaluate(t=>{const wrap=t.closest('.mx-tblwrap'),a=t.closest('.lp-activity');return {container:{width:a.clientWidth,name:getComputedStyle(a).containerName},viewport:innerWidth,dpr:devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom,wrapWidth:wrap.clientWidth,tableWidth:t.getBoundingClientRect().width,documentOverflow:document.documentElement.scrollWidth-innerWidth,cells:[...t.querySelectorAll('tr:first-child th:nth-child(2),td')].map(e=>{const r=document.createRange();r.selectNodeContents(e);return {text:e.textContent,width:e.getBoundingClientRect().width,textWidth:r.getBoundingClientRect().width,lines:new Set([...r.getClientRects()].map(r=>r.y)).size,whiteSpace:getComputedStyle(e).whiteSpace};})};});
 assert(result.cells[0].text===heading&&result.cells[1].text===text,'Probe must exercise the authored long-text visual, not the original ABS table');
 measurements.push({label,...result});await p.locator('.mx-tblwrap').first().scrollIntoViewIfNeeded();await shot(p,label);
 fs.writeFileSync(out+'/measurements.json',JSON.stringify(measurements,null,2));
 {
  assert(result.cells[0].lines>1&&result.cells[1].lines>1,'Long heading and text cell wrap');checks.push(label+' heading and text wrap');
  assert(result.cells.slice(0,2).every(c=>c.textWidth<=result.wrapWidth));checks.push(label+' full text fits within table viewport');
  assert(result.cells.slice(2).every(c=>c.lines===1));checks.push(label+' numerical values remain unbroken');
  assert(result.documentOverflow<=1);checks.push(label+' no whole-page horizontal overflow');
 }
}
const b=await chromium.launch();try{for(const width of [1280,1024]){const p=await b.newPage({viewport:{width,height:1000}});await test(p,String(width));await p.close();}}finally{await b.close();}
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'y9-wrap-zoom-'));fs.mkdirSync(profile+'/Default');fs.writeFileSync(profile+'/Default/Preferences',JSON.stringify({partition:{default_zoom_level:{x:Math.log(2)/Math.log(1.2)}}}));
const z=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,args:['--window-size=1536,1000']});try{await test(z.pages()[0],'native200');assert(Math.abs(measurements.at(-1).dpr-2)<.02);checks.push('Native browser 200%, without CSS zoom/deviceScaleFactor');}finally{await z.close();}
assert.equal(errors.length,0);fs.writeFileSync(out+'/table-wrap.json',JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),appSha256:createHash('sha256').update(fs.readFileSync(root+'/lesson-studio.html')).digest('hex'),complete:true,checks,measurements,captures,pageErrors:errors},null,2));console.log(JSON.stringify({out,measurements,checks:checks.length,pageErrors:errors}));
