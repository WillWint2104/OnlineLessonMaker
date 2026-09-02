import { chromium } from '/home/user/OnlineLessonMaker/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [app, lesson] = process.argv.slice(2);
const L = JSON.parse(fs.readFileSync(lesson,'utf8'));
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport:{width:1280,height:900} });
const errs=[]; page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:8099/'+app,{waitUntil:'load'});
await page.evaluate(d=>{ LESSON=d; LESSON.meta=LESSON.meta||{}; cur=0; TP_RUNTIME={}; render(); }, L);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const GAP=6;
for(let i=0;i<L.slides.length;i++){
  await page.evaluate(n=>go(n), i); await sleep(320);
  const r = await page.evaluate(()=>{
    const svg=document.querySelector('.tp-fig svg'); if(!svg) return null;
    const vb=svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const poly=svg.querySelector('polygon');
    const pts=poly?poly.getAttribute('points').trim().split(/\s+/).map(s=>s.split(',').map(Number)):[];
    const chips=[...svg.querySelectorAll('rect.tp-fig-gpill')].map(rc=>{
      const t=rc.nextElementSibling;
      return { x:+rc.getAttribute('x'), y:+rc.getAttribute('y'), w:+rc.getAttribute('width'), h:+rc.getAttribute('height'),
               text:t?t.textContent:'', ink:t?t.getComputedTextLength():0 };
    });
    const errBox=document.querySelector('.tp-fig-errors,.tp-fig-err');
    return { vb, pts, chips, W:vb[2], H:vb[3], err:errBox?errBox.textContent.trim():'' };
  });
  if(!r){ console.log(`${i}: no figure`); continue; }
  // box-to-segment clearance against every polygon edge
  const ptSeg=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;let t=L2?((px-ax)*dx+(py-ay)*dy)/L2:0;t=t<0?0:t>1?1:t;return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));};
  const boxSeg=(B,a,b2)=>{ let m=Infinity;
    for(let u=0;u<=1;u+=0.02){ for(const [cx,cy] of [[B.x+u*B.w,B.y],[B.x+u*B.w,B.y+B.h],[B.x,B.y+u*B.h],[B.x+B.w,B.y+u*B.h]])
      m=Math.min(m,ptSeg(cx,cy,a[0],a[1],b2[0],b2[1])); } return m; };
  const inPoly=(P,x,y)=>{let c=false;for(let k=0,j=P.length-1;k<P.length;j=k++){const A=P[k],B2=P[j];
    if(((A[1]>y)!==(B2[1]>y))&&(x<(B2[0]-A[0])*(y-A[1])/((B2[1]-A[1])||1e-12)+A[0]))c=!c;}return c;};
  let minC=Infinity, off=0, inside=0, wrongSide=0, over=[];
  for(const c of r.chips){
    const cx=c.x+c.w/2, cy=c.y+c.h/2;
    for(let k=0;k<r.pts.length;k++) minC=Math.min(minC,boxSeg(c,r.pts[k],r.pts[(k+1)%r.pts.length]));
    if(c.x<2||c.y<2||c.x+c.w>r.W-2||c.y+c.h>r.H-2) off++;
    if(r.pts.length>2&&inPoly(r.pts,cx,cy)) inside++;
    // nearest edge = the one it measures; must be on the exterior side of THAT edge line
    let best=null,bd=Infinity;
    for(let k=0;k<r.pts.length;k++){const A=r.pts[k],B2=r.pts[(k+1)%r.pts.length];const d=boxSeg(c,A,B2);if(d<bd){bd=d;best=[A,B2];}}
    if(best){const mid=[(best[0][0]+best[1][0])/2,(best[0][1]+best[1][1])/2];
      const e=[best[1][0]-best[0][0],best[1][1]-best[0][1]],n=[-e[1],e[0]];
      const nl=Math.hypot(n[0],n[1]); const un=[n[0]/nl,n[1]/nl];
      const outward = r.pts.length>2 ? (inPoly(r.pts,mid[0]+un[0]*4,mid[1]+un[1]*4)?[-un[0],-un[1]]:un) : un;
      if((cx-mid[0])*outward[0]+(cy-mid[1])*outward[1] <= 0) wrongSide++;}
    over.push(+(c.w-2*7-c.ink).toFixed(1));
  }
  console.log(`${i} ${String(L.slides[i].title).padEnd(28)} chips=${String(r.chips.length).padStart(2)} minClear=${minC===Infinity?'-':minC.toFixed(1)} offCanvas=${off} interior=${inside} wrongSide=${wrongSide} slackPx=[${over.join(',')}]${r.err?' ERR:'+r.err.slice(0,70):''}`);
}
console.log('console errors:', errs.length, errs.slice(0,2).join(' || '));
await b.close();
