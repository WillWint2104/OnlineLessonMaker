import { chromium } from '/home/user/OnlineLessonMaker/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [app, lesson, outDir, tag] = process.argv.slice(2);
const L = JSON.parse(fs.readFileSync(lesson,'utf8'));
fs.mkdirSync(outDir,{recursive:true});
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

async function shoot(page,i,name,sel){
  await page.evaluate(n=>go(n), i);
  await sleep(320);
  await page.evaluate(()=>{ document.querySelectorAll('.tp-animwait').forEach(e=>{e.classList.remove('tp-animwait');e.classList.add('tp-animin');}); });
  await sleep(260);
  const el = await page.$(sel||'.tp-fig');
  if(!el){ console.log('  ! no element for',name); return; }
  await el.screenshot({ path:`${outDir}/${name}.png` });
  console.log('  ✓',name);
}

const page = await b.newPage({ viewport:{width:1280,height:900}, deviceScaleFactor:2 });
await page.goto('http://127.0.0.1:8099/'+app, { waitUntil:'load' });
await page.evaluate(d=>{ LESSON=d; LESSON.meta=LESSON.meta||{}; cur=0; TP_RUNTIME={}; render(); }, L);
await sleep(400);
const n = await page.evaluate(()=>LESSON.slides.length);
for(let i=0;i<n;i++) await shoot(page,i,`${tag}-${i}-${L.slides[i].title.replace(/\W+/g,'-').toLowerCase()}`);

// focused phone geometry: last-but-one scene, expanded
const ph = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:3 });
await ph.goto('http://127.0.0.1:8099/'+app, { waitUntil:'load' });
await ph.evaluate(d=>{ LESSON=d; LESSON.meta=LESSON.meta||{}; cur=0; TP_RUNTIME={}; render(); }, L);
await sleep(400);
await ph.evaluate(()=>go(1)); await sleep(320);
await ph.evaluate(()=>{ document.querySelectorAll('.tp-animwait').forEach(e=>{e.classList.remove('tp-animwait');e.classList.add('tp-animin');}); });
await sleep(200);
const exp = await ph.$('.tp-fig-expand');
if(exp){ await exp.click(); await sleep(600);
  await ph.screenshot({ path:`${outDir}/${tag}-phone-focused.png` }); console.log('  ✓ phone-focused'); }
else console.log('  ! no expand button');
await b.close();
