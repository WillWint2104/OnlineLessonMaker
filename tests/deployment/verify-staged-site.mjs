import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import http from 'node:http';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {checkedPath,excluded,verifyStage} from '../../scripts/stage-pages.mjs';
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Inspect the actual upload-pages-artifact tar, then hash every extracted file. */
export function verifyArtifact(artifact,manifest){
 const run=args=>execFileSync('tar',args,{encoding:'utf8',maxBuffer:40e6}),names=run(['-tf',artifact]).trim().split(/\r?\n/),details=run(['-tvf',artifact]).trim().split(/\r?\n/);
 assert.equal(names.length,details.length,'Archive entry listing is ambiguous');
 const files=[];for(let i=0;i<names.length;i++){
  const type=details[i][0];assert(['-','d'].includes(type),'Archive contains a link or special entry');
  const name=names[i].replace(/^\.\//,'').replace(/\/$/,'');if(!name)continue;
  checkedPath(name);assert(!excluded(name),'Excluded archive path: '+name);if(type==='-')files.push(name);
 }
 assert.deepEqual(files.sort(),manifest.files.map(f=>f.file).sort(),'Archive inventory differs from verified stage');
 const extracted=fs.mkdtempSync(path.join(os.tmpdir(),'olm-pages-archive-'));run(['-xf',artifact,'-C',extracted]);
 for(const f of manifest.files){const file=path.join(extracted,f.file),stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1);assert.equal(stat.size,f.bytes);assert.equal(hash(file),f.sha256,'Archive bytes differ: '+f.file);}
 return {complete:true,filesVerified:files.length,excludedReviewEntries:0,sha256:hash(artifact)};
}

/** Serve only the verified stage, using the actual project Pages base path. */
async function browserChecks(stage,manifest){
 const {chromium}=await import('playwright'),root=fs.realpathSync(stage),prefix='/OnlineLessonMaker/',checks=[],errors=[],requests=[];
 const check=(v,label)=>{assert(v,label);checks.push(label);};
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.glb':'model/gltf-binary'};
 const server=http.createServer((req,res)=>{
  let name;try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}name=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html';checkedPath(name);}catch{res.writeHead(404).end();return;}
  const file=path.join(root,name);if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+prefix;
 const browser=await chromium.launch();try{
  const p=await browser.newPage({viewport:{width:1280,height:960}});p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>{if(r.url().startsWith(base))requests.push({url:r.url().slice(base.length),failure:r.failure()?.errorText});});p.on('dialog',d=>d.accept());await p.route(/^https?:/,r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await p.goto(base);await p.waitForURL(base+'lesson-studio.html');check(await p.locator('#modeSeg').count()===1,'Base-path landing route redirects to the real Lesson Studio');
  for(const name of ['lesson-studio.html','lessons/expanding-two-binomials.html','assets/vendor/model-viewer.min.js','assets/mathematics/algebra-overview.png','interactives/equation-editor.html','docs/lessons/factorising-quadratics/README.md']){
   const response=await p.request.get(base+name);check(response.status()===200,'Preserved route returns 200: '+name);const expected=manifest.files.find(f=>f.file===name);assert(expected);check(createHash('sha256').update(await response.body()).digest('hex')===expected.sha256,'Hosted bytes match source: '+name);
  }
  for(const name of ['docs/review/geography-y9-01/teacher-guide.html','docs/review/geography-y9-01/lesson.json','docs/review/mathematics-micro/lesson.json'])check((await p.request.get(base+name)).status()===404,'Review route absent: '+name);
  await p.goto(base+'lessons/expanding-two-binomials.html');check((await p.locator('body').innerText()).length>100,'Published learner HTML boots from the staged base path');check(await p.locator('script#lesson-data').count()===1,'Published learner retains embedded lesson data');
  const data=await p.evaluate(()=>JSON.parse(JSON.stringify(LESSON)));check(data.meta.title.length>0&&data.slides.length>0,'Published learner data is available');
  await p.goto(base+'lesson-studio.html');await p.locator('#modeSeg [data-mode="edit"]').click();await p.locator('#dataBtn').click();await p.locator('#jsonArea').fill(JSON.stringify(data));await p.locator('#jsonLoad').click();check((await p.locator('#jsonErr').textContent())==='','Existing lesson imports through actual staged authoring');await p.locator('[data-mx-mode="study"]').click();check(await p.locator('.mx-page').count()>0,'Imported learner uses existing staged application');
  await p.goto(base+'interactives/equation-editor.html');check((await p.locator('body').innerText()).length>100,'Existing interactive boots at preserved route');
  check(errors.length===0,'Zero page errors in representative staged browser states');check(requests.length===0,'No failed same-origin application requests');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
 return {checks,pageErrors:errors,failedLocalRequests:requests,basePath:prefix,limitations:['External media blocked for deterministic checks; no school-network, physical-device or remote-classroom-service certification.','This verifies a local staged payload; no production deployment occurred.']};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i++){const key=args[i];assert(['--artifact-only','--stage','--manifest','--artifact','--report'].includes(key),'Unknown option');if(key==='--artifact-only')options[key]=true;else options[key]=args[++i];}
 const manifest=JSON.parse(fs.readFileSync(options['--manifest'],'utf8'));const stage=verifyStage(process.cwd(),options['--stage']);assert.deepEqual(stage,manifest,'Manifest differs from current source/stage validation');
 const archive=verifyArtifact(path.resolve(options['--artifact']),manifest),browser=options['--artifact-only']?undefined:await browserChecks(options['--stage'],manifest);
 const report={head:manifest.head,complete:true,preservedFiles:manifest.preservedFiles,excludedReviewFiles:manifest.excludedReviewFiles,archive,browser};if(options['--report'])fs.writeFileSync(options['--report'],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}
