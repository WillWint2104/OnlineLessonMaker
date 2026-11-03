// Run only after final focused/full-player/Mathematics evidence exists. Outputs stay versioned.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';
const dir=path.resolve(process.env.G03_PACKAGE_TEST_DIR||'review-delivery/geography-g03/package-tests');
assert.equal(fs.existsSync(dir),false,'Use a fresh package-test output directory');fs.mkdirSync(dir,{recursive:true});
const player=path.resolve(process.env.PLAYER_REVIEW_DIR||'review-delivery/geography-g03/regression'),focused=path.resolve(process.env.G03_OUT||'review-delivery/geography-g03/current'),report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cases:[]};
const validResults=JSON.parse(fs.readFileSync(player+'/logs/results.json')),validInfo=JSON.parse(fs.readFileSync(player+'/logs/run-info.json'));
const invoke=(evidence,out,extra={})=>spawnSync(process.execPath,['tests/widgets/geography-g03/package.mjs'],{encoding:'utf8',env:{...process.env,...extra,PLAYER_REVIEW_DIR:evidence,G03_PACKAGE:out}});
for(const kind of ['missing','empty','omitted','failed']){
  const evidence=path.join(dir,'evidence-'+kind),out=path.join(dir,'must-not-exist-'+kind);
  if(kind!=='missing'){
    fs.mkdirSync(evidence+'/logs',{recursive:true});const results=structuredClone(validResults);
    if(kind==='empty')results.length=0;if(kind==='omitted')results.pop();if(kind==='failed')results[0].status=1;
    fs.writeFileSync(evidence+'/logs/results.json',JSON.stringify(results));fs.writeFileSync(evidence+'/logs/run-info.json',JSON.stringify(validInfo));
  }
  const run=invoke(evidence,out);assert.notEqual(run.status,0);assert.equal(fs.existsSync(out),false);
  assert.match(run.stderr,kind==='missing'?/Shared regression evidence missing/:/regression gate/i);
  report.cases.push({case:kind,expectedFailure:true,outputCreated:false,exit:run.status});
}
const mismatch=path.join(dir,'fixture-mismatch'),mismatchOut=path.join(dir,'must-not-exist-fixture-mismatch');
fs.mkdirSync(mismatch+'/integration',{recursive:true});fs.copyFileSync(focused+'/results.json',mismatch+'/results.json');
const integration=JSON.parse(fs.readFileSync(focused+'/integration/results.json'));integration.fixtureSha256='not-the-tested-fixture';
fs.writeFileSync(mismatch+'/integration/results.json',JSON.stringify(integration));
const rejected=invoke(player,mismatchOut,{G03_OUT:mismatch});assert.notEqual(rejected.status,0);assert.equal(fs.existsSync(mismatchOut),false);assert.match(rejected.stderr,/same exact head and fixture/);
report.cases.push({case:'fixture-mismatch',expectedFailure:true,outputCreated:false,exit:rejected.status});
for(const kind of ['incomplete-focused','focused-errors','integration-errors','empty-captures','missing-capture','outside-capture','directory-capture','absolute-capture']){
  const evidence=path.join(dir,kind),out=path.join(dir,'must-not-exist-'+kind);
  fs.mkdirSync(evidence+'/integration',{recursive:true});
  const focus=JSON.parse(fs.readFileSync(focused+'/results.json')),extra=JSON.parse(fs.readFileSync(focused+'/integration/results.json'));
  if(kind==='incomplete-focused')focus.complete=false;
  if(kind==='focused-errors')focus.errors=['Deliberate page error'];
  if(kind==='integration-errors')extra.errors=['Deliberate page error'];
  if(kind==='empty-captures'){focus.captures=[];extra.captures=[];}
  if(kind==='missing-capture'){focus.captures=['missing.png'];extra.captures=[];}
  if(kind==='outside-capture'){focus.captures=[path.relative(evidence,path.join(focused,'results.json'))];extra.captures=[];}
  if(kind==='directory-capture'){focus.captures=['integration'];extra.captures=[];}
  if(kind==='absolute-capture'){focus.captures=[path.join(focused,'results.json')];extra.captures=[];}
  fs.writeFileSync(evidence+'/results.json',JSON.stringify(focus));fs.writeFileSync(evidence+'/integration/results.json',JSON.stringify(extra));
  const run=invoke(player,out,{G03_OUT:evidence});assert.notEqual(run.status,0);assert.equal(fs.existsSync(out),false);
  assert.match(run.stderr,kind.startsWith('focused-')||kind==='incomplete-focused'?/completed, error-free/:kind==='integration-errors'?/integration evidence/:/capture evidence/);
  report.cases.push({case:kind,expectedFailure:true,outputCreated:false,exit:run.status});
}
for(const [script,evidence]of [['verify',focused],['integration',focused]]){
  const before=fs.readFileSync(path.join(evidence,script==='verify'?'results.json':'integration/results.json'));
  const run=spawnSync(process.execPath,['tests/widgets/geography-g03/'+script+'.mjs'],{encoding:'utf8',env:{...process.env,G03_OUT:evidence}});
  assert.notEqual(run.status,0);assert.match(run.stderr,/previous review evidence is preserved/);
  assert.deepEqual(fs.readFileSync(path.join(evidence,script==='verify'?'results.json':'integration/results.json')),before);
  report.cases.push({case:script+'-preserves-existing-output',passed:true});
}
const probe='src/geography/g03/g03-untracked-package-probe-'+randomUUID()+'.txt';
fs.writeFileSync(probe,'This is deliberately not part of HEAD.',{flag:'wx'});
try{
  const out=path.join(dir,'success-with-untracked-probe'),run=invoke(player,out);assert.equal(run.status,0,run.stderr);
  assert.equal(fs.existsSync(path.join(out,'source',probe)),false,'Untracked source must never enter exact-head package');
  const files=execFileSync('git',['ls-tree','-r','--name-only','HEAD','--','src/geography/g03','tests/widgets/geography-g03','docs/review/geography-g03','scripts/build-geography-g03.mjs'],{encoding:'utf8'}).trim().split('\n');
  const hash=b=>createHash('sha256').update(b).digest('hex');for(const f of files)assert.equal(hash(fs.readFileSync(path.join(out,'source',f))),hash(execFileSync('git',['show','HEAD:'+f])),f);
  report.cases.push({case:'untracked-source-excluded',passed:true,trackedSourceFilesVerified:files.length});
}finally{fs.unlinkSync(probe);}
fs.writeFileSync(dir+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
