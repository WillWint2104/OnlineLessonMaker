// One sequential pipeline; every gate has its own log. No shared-output concurrent runs.
import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
let corpusRef=process.env.CORPUS_REF;
if(!corpusRef)for(const candidate of ['origin/main','main']){
 try{execFileSync('git',['rev-parse','--verify',candidate+'^{commit}'],{stdio:'ignore'});corpusRef=candidate;break;}catch{}
}
if(!corpusRef)throw Error('No corpus reference; set CORPUS_REF to a commit or branch.');
const dir=(process.env.PLAYER_REVIEW_DIR||'docs/review/shared-player')+'/logs';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/run-info.json',JSON.stringify({started:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,corpusRef:execFileSync('git',['rev-parse',corpusRef],{encoding:'utf8'}).trim(),appSha256:createHash('sha256').update(fs.readFileSync('lesson-studio.html')).digest('hex')},null,2));
const gates=process.argv.slice(2).length?process.argv.slice(2):['validate','verify-shared-player','verify-activity-surfaces','verify-activity-authoring','verify-skill-page','verify-composition-grid','verify-figure-container','verify-figure-render','verify-geometry-semantics','verify-label-placement','verify-learning-card','verify-measure-surface','verify-mx-authoring','verify-notes-examples','verify-quadratics-authoring','verify-response-store','verify-responsive-shell','verify-type-interaction','verify-workbook','verify-lesson-page','verify-media','verify-newtypes','verify-pack-fixes','verify-theme-pack','verify-interactive','verify-infographic','verify-corpus-identity'];
const results=[];
let failures=0;
for(const name of gates){
 const args=['scripts/'+name+'.mjs',...(name==='verify-corpus-identity'?['--ref',corpusRef]:[])];
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024,env:{...process.env,BASE:'http://127.0.0.1:8099',URL:'http://127.0.0.1:8099/lessons/case-file-6-investigating-the-remains.html'}});
 fs.writeFileSync(dir+'/'+name+'.log',(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):''));
 const result={name,status:r.status,error:r.error?.message};const at=results.findIndex(x=>x.name===name);if(at<0)results.push(result);else results[at]=result;if(r.status!==0)failures++;console.log(JSON.stringify(result));
}
fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2));
process.exitCode=failures?1:0;
