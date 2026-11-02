// Run only after final focused/full-player/Mathematics evidence exists. Outputs stay versioned.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';
const dir=path.resolve(process.env.G03_PACKAGE_TEST_DIR||'review-delivery/geography-g03/package-tests');
assert.equal(fs.existsSync(dir),false,'Use a fresh package-test output directory');fs.mkdirSync(dir,{recursive:true});
const player=path.resolve(process.env.PLAYER_REVIEW_DIR||'review-delivery/geography-g03/regression'),report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cases:[]};
const validResults=JSON.parse(fs.readFileSync(player+'/logs/results.json')),validInfo=JSON.parse(fs.readFileSync(player+'/logs/run-info.json'));
const invoke=(evidence,out)=>spawnSync(process.execPath,['tests/widgets/geography-g03/package.mjs'],{encoding:'utf8',env:{...process.env,PLAYER_REVIEW_DIR:evidence,G03_PACKAGE:out}});
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
