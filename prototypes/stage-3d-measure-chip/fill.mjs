import { chromium } from '/home/user/OnlineLessonMaker/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [app,lesson,tag]=process.argv.slice(2);
const L=JSON.parse(fs.readFileSync(lesson,'utf8'));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://127.0.0.1:8099/'+app,{waitUntil:'load'});
await p.evaluate(d=>{LESSON=d;LESSON.meta=LESSON.meta||{};cur=0;TP_RUNTIME={};render();},L);
const s=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<L.slides.length;i++){
  await p.evaluate(n=>go(n),i); await s(300);
  const r=await p.evaluate(()=>{const svg=document.querySelector('.tp-fig svg');if(!svg)return null;
    const vb=svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const g=svg.querySelector('polygon'); if(!g)return null;
    const pts=g.getAttribute('points').trim().split(/\s+/).map(t=>t.split(',').map(Number));
    const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]);
    return {w:(Math.max(...xs)-Math.min(...xs))/vb[2],h:(Math.max(...ys)-Math.min(...ys))/vb[3]};});
  if(r) console.log(`${tag} ${i} ${String(L.slides[i].title).padEnd(26)} shape fills ${(r.w*100).toFixed(0)}% x ${(r.h*100).toFixed(0)}% of canvas`);
}
await b.close();
