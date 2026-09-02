import { chromium } from '/home/user/OnlineLessonMaker/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const L=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1280,height:900}});
await p.goto('http://127.0.0.1:8099/lesson-studio.html',{waitUntil:'load'});
await p.evaluate(d=>{LESSON=d;LESSON.meta=LESSON.meta||{};cur=0;TP_RUNTIME={};render();},L);
await new Promise(r=>setTimeout(r,400));
await p.evaluate(()=>go(1)); await new Promise(r=>setTimeout(r,350));
const r=await p.evaluate(()=>{
  const rc=document.querySelector('rect.tp-fig-gpill'), tx=rc.nextElementSibling;
  const un=document.querySelector('.tp-fig-gunit');
  const cs=e=>getComputedStyle(e);
  return { bg:cs(rc).fill, border:cs(rc).stroke, ink:cs(tx).fill,
           surface:cs(document.querySelector('.tp-fig svg')).backgroundColor,
           card:cs(document.querySelector('.tp-fig')).backgroundColor,
           angleInk:cs(document.querySelector('.tp-fig-gmeas')).fill };
});
const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
const lum=c=>{const a=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
const cr=(x,y)=>{const l1=lum(rgb(x)),l2=lum(rgb(y));const[a,b2]=l1>l2?[l1,l2]:[l2,l1];return ((a+.05)/(b2+.05)).toFixed(2);};
console.log('chip bg      ',r.bg);
console.log('chip border  ',r.border);
console.log('chip ink     ',r.ink);
console.log('angle ink    ',r.angleInk);
console.log('card surface ',r.card);
console.log('');
console.log('contrast  ink on chip bg        ', cr(r.ink,r.bg), '(WCAG AA normal text needs 4.5)');
console.log('contrast  ink on card surface   ', cr(r.ink,r.card));
console.log('contrast  chip bg vs card       ', cr(r.bg,r.card), '(fill is a HINT, not the signal)');
await b.close();
