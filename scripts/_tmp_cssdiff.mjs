import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const root='/home/user/OnlineLessonMaker';
const SCR='/tmp/claude-0/-home-user-OnlineLessonMaker/ae472c36-28eb-5a76-b18c-552774c8ad85/scratchpad';
const MIME={'.html':'text/html','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);
  let p=u.startsWith('/scratch/')?path.join(SCR,u.slice(9)):path.join(root,u==='/'?'/lesson-studio.html':u);
  if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(fs.readFileSync(p));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
const PROPS=['display','position','top','left','right','bottom','width','height','flex','overflow','overflowX','overflowY','minHeight','maxWidth','background-color','color','fontFamily','fontSize','lineHeight','padding','margin','border','borderRadius','boxShadow','zIndex','visibility','opacity','transform','gap','alignItems','justifyContent','flexDirection','flexWrap','textAlign','verticalAlign'];
const LESSONS=[];
for(const f of fs.readdirSync(path.join(root,'tests/visual/lessons'))) LESSONS.push(['fx/'+f, JSON.parse(fs.readFileSync(path.join(root,'tests/visual/lessons',f),'utf8'))]);
for(const f of fs.readdirSync(path.join(root,'lessons')).filter(x=>x.endsWith('.json')).slice(0,6)) LESSONS.push(['ls/'+f, JSON.parse(fs.readFileSync(path.join(root,'lessons',f),'utf8'))]);
const THEMES=['@own','imperium','microhistory','geolearn','mathematics','scholarmath'];
async function sweep(file){
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('request',()=>{});
  await page.route('**/*',(r)=>{const u=r.request().url(); if(u.startsWith(`http://127.0.0.1:${port}`)) r.continue(); else r.abort();});
  await page.goto(`http://127.0.0.1:${port}/${file}`,{waitUntil:'load'});
  const out={};
  for(const [name,L] of LESSONS){
    for(const th of THEMES){
      const n=(L.slides||[]).length;
      for(let i=0;i<n;i++){
        const key=`${name}|${th}|${i}`;
        try{
          out[key]=await page.evaluate(({L,th,i,PROPS})=>{
            LESSON=JSON.parse(JSON.stringify(L)); LESSON.meta=LESSON.meta||{}; if(th!=='@own') LESSON.meta.theme=th;
            cur=0; setTheme(LESSON.meta.theme||'plain'); render(); go(i);
            const s=document.getElementById('slide'); const rows=[];
            const walk=(el,pathStr)=>{ const cs=getComputedStyle(el);
              rows.push(pathStr+'|'+el.tagName+'.'+(el.className&&el.className.baseVal!==undefined?el.className.baseVal:String(el.className||''))+'|'+PROPS.map(p=>cs[p]).join('~'));
              [...el.children].forEach((c,k)=>walk(c,pathStr+'/'+k)); };
            [...s.children].forEach((c,k)=>walk(c,String(k)));
            return rows.join('\n');
          },{L,th,i,PROPS});
        }catch(e){ out[key]='ERR '+String(e.message||'').split('\n')[0].replace(/:\d+:\d+/g,'').replace(/old\.html|lesson-studio\.html/g,'X'); }
      }
    }
  }
  await page.close(); return out;
}
const A=await sweep('lesson-studio.html');
const B=await sweep('scratch/old.html');
let diffs=0;
for(const k of Object.keys(A)){
  if(A[k]!==B[k]){ diffs++;
    if(diffs<=8){
      const a=(A[k]||'').split('\n'), b=(B[k]||'').split('\n');
      console.log('### DIFF',k, 'lines new/old', a.length, b.length);
      for(let i=0;i<Math.max(a.length,b.length);i++) if(a[i]!==b[i]){ console.log('  NEW:',(a[i]||'').slice(0,220)); console.log('  OLD:',(b[i]||'').slice(0,220)); }
    }
  }
}

let errs=0; for(const k of Object.keys(A)) if(String(A[k]).startsWith('ERR')) { errs++; if(errs<6) console.log('ERRUNIT',k,A[k].slice(0,160)); }
console.log('TOTAL units', Object.keys(A).length, 'diffs', diffs, 'errs', errs);
for(const k of ['fx/mathematics-shell.json|mathematics|0','fx/mathematics-shell.json|mathematics|1','fx/mathematics-shell.json|mathematics|2']) if(A[k]) console.log('SAMPLE',k, String(A[k]).split('\n').length,'rows', String(A[k]).slice(0,300));

await browser.close(); server.close();
