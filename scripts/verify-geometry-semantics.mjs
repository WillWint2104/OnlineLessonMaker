#!/usr/bin/env node
/* Stage 3c — SEMANTIC LEGALITY of geometry annotations.
 *
 * Twice in this stage a check passed while the thing it named was broken, because it asserted against the
 * engine's own assumption instead of the requirement (a radius against the engine's clamp rather than the
 * arm; a fill against the SVG element rather than the ink). So this file deliberately re-derives every
 * predicate from the RAW painted coordinates — the polygon's vertices and the angle's two arms — and never
 * calls the engine's own figGeomInside / figGeomInSector. If the engine's idea of "inside" is wrong, these
 * assertions must still fail.
 *
 *   angle label   → centre inside the swept wedge, and inside the polygon for an interior angle
 *   side label    → centre in the exterior half-plane of its own edge
 *   vertex label  → centre outside the polygon it names
 *
 * Usage:  node scripts/verify-geometry-semantics.mjs [--lesson <path>]
 *         CHROMIUM_PATH=/opt/pw-browsers/chromium  (escape hatch for a sandboxed browser)
 * Exits non-zero on the first semantic violation.  */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const LESSON = process.argv.includes('--lesson')
  ? process.argv[process.argv.indexOf('--lesson') + 1]
  : join(ROOT, 'tests/visual/lessons/figure-geometry-baseline.json');
const BOXES = [ {W:520,H:360,padL:40,padR:18,padT:16,padB:30},      // inline card
                {W:900,H:560,padL:56,padR:26,padT:24,padB:42} ];    // a focused-sized board

const MIME = {'.html':'text/html','.json':'application/json','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary'};
const server = createServer((req,res)=>{
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try { res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'}).end(readFileSync(f)); }
  catch { res.writeHead(404).end('nope'); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const PORT = server.address().port;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
const page = await browser.newPage({viewport:{width:1440,height:900}});
await page.route('**/*', r => r.request().url().startsWith(`http://127.0.0.1:${PORT}`) || r.request().url().startsWith('data:') ? r.continue() : r.abort());
await page.goto(`http://127.0.0.1:${PORT}/lesson-studio.html`, {waitUntil:'load'});

const lesson = JSON.parse(readFileSync(LESSON,'utf8'));
const out = await page.evaluate(({lesson, boxes}) => {
  // ── predicates, re-derived here from raw geometry ───────────────────────────
  const inPoly = (ring,x,y) => { let inside=false;                       // even-odd ray cast
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){ const [ax,ay]=ring[i],[bx,by]=ring[j];
      if(((ay>y)!==(by>y)) && (x < (bx-ax)*(y-ay)/((by-ay)||1e-12)+ax)) inside=!inside; }
    return inside; };
  const wrapPi = a => { const t=Math.atan2(Math.sin(a),Math.cos(a)); return t<-Math.PI+1e-9?Math.PI:t; };
  // inside the wedge PVQ: the bearing to the point lies between the two ARMS, on the short sweep
  const inWedge = (v,p,q,x,y) => { const al=Math.atan2(p[1]-v[1],p[0]-v[0]), be=Math.atan2(q[1]-v[1],q[0]-v[0]);
    const d=wrapPi(be-al), rel=wrapPi(Math.atan2(y-v[1],x-v[0])-al), e=1e-7;
    return d>=0 ? (rel>=-e && rel<=d+e) : (rel<=e && rel>=d-e); };
  // exterior half-plane of edge a→b, "exterior" decided by probing the polygon itself
  const outHalf = (a,b,ring,x,y) => { const mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
    const ex=b[0]-a[0], ey=b[1]-a[1], m=Math.hypot(ex,ey)||1; let nx=-ey/m, ny=ex/m;
    if(ring && inPoly(ring, mx+nx*4, my+ny*4)){ nx=-nx; ny=-ny; }
    return (x-mx)*nx + (y-my)*ny > 0; };

  const rows=[], fails=[];
  boxes.forEach(box=>{
    lesson.slides.forEach((sl,si)=>(sl.blocks||[]).forEach(bl=>{
      if(bl.type!=='figure' || bl.figure!=='geometry') return;
      const M = figGeometry(bl, box);
      (M.labels||[]).forEach(L=>{
        const S=L.sem; if(!S) return;
        const cx=L.box.x+L.box.w/2, cy=L.box.y+L.box.h/2;
        let ok=true, why='';
        if(S.k==='angle'){
          if(!inWedge(S.v,S.p,S.q,cx,cy)){ ok=false; why='outside its own wedge'; }
          else if(S.ring && !inPoly(S.ring,cx,cy)){ ok=false; why='outside the polygon whose interior angle it measures'; }
        } else if(S.k==='side'){
          if(!outHalf(S.a,S.b,S.ring,cx,cy)){ ok=false; why='on the interior side of the edge it measures'; }
        } else if(S.k==='vertex'){
          if(S.ring && inPoly(S.ring,cx,cy)){ ok=false; why='inside the polygon it names'; }
        }
        if(L.relaxed) why += (why?' ':'')+'(engine reported a relaxed placement)';
        rows.push({box:box.W+'x'+box.H, fig:bl.title||('slide '+si), k:S.k, text:L.text, ok, why});
        if(!ok) fails.push(`${box.W}x${box.H} · ${bl.title} · ${S.k} "${L.text}" — ${why}`);
      });
    }));
  });
  return {rows, fails};
}, {lesson, boxes:BOXES});

await browser.close(); server.close();

const byKind = {};
out.rows.forEach(r => { byKind[r.k] = byKind[r.k] || {n:0, bad:0}; byKind[r.k].n++; if(!r.ok) byKind[r.k].bad++; });
console.log(`semantic legality — ${LESSON.replace(ROOT+'/','')} across ${BOXES.length} box sizes\n`);
Object.keys(byKind).sort().forEach(k => {
  const b = byKind[k];
  console.log(`  ${(k+' labels').padEnd(16)} ${String(b.n-b.bad).padStart(3)}/${String(b.n).padEnd(3)} in their allowed region ${b.bad?'✗':'✓'}`);
});
if(out.fails.length){
  console.log('\n✗ ' + out.fails.length + ' semantic violation(s):');
  out.fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`\n✓ ${out.rows.length}/${out.rows.length} annotations are in their allowed region`);
