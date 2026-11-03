import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import assert from 'node:assert/strict';import {test} from 'node:test';
import {fullPlayerGates,verifyGateEvidence} from './gate-evidence.mjs';

test('Package uses the established full player gate identities',()=>{
  const gates=fullPlayerGates();assert.equal(gates.length,55);
  for(const name of ['validate','verify-response-store','verify-corpus-identity','verify-mathematics-calculator','verify-mathematics-graph-ux'])assert.ok(gates.includes(name));
});
for(const defect of ['none','empty','omitted','duplicate','failed','wrong-head','wrong-application'])test('Gate evidence: '+defect,()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g03-gates-')),logs=path.join(dir,'logs');fs.mkdirSync(logs);
  const required=fullPlayerGates(),head='review-head',app='review-app';
  const results=required.map(name=>({name,status:0}));
  const run={head,headAfter:head,exactHeadUnchanged:true,appSha256:app,appSha256After:app,trackedStatusBefore:'',trackedStatusAfter:'',gates:required.length,failures:0};
  if(defect==='empty')results.length=0;
  if(defect==='omitted')results.pop();
  if(defect==='duplicate')results[1]={...results[0]};
  if(defect==='failed')results[0].status=1;
  if(defect==='wrong-head')run.head='other-head';
  if(defect==='wrong-application')run.appSha256After='other-app';
  const resultFile=path.join(logs,'results.json'),infoFile=path.join(logs,'run-info.json');
  try{
    fs.writeFileSync(resultFile,JSON.stringify(results));fs.writeFileSync(infoFile,JSON.stringify(run));
    if(defect==='none')assert.equal(verifyGateEvidence(dir,required,head,app).results.length,required.length);
    else assert.throws(()=>verifyGateEvidence(dir,required,head,app));
  }finally{fs.unlinkSync(resultFile);fs.unlinkSync(infoFile);fs.rmdirSync(logs);fs.rmdirSync(dir);}
});
