import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Read the established runner's literal inventory without importing/executing its pipeline.
// A runner format change fails closed until this bounded package adapter is updated.
export function fullPlayerGates(){
  const source=fs.readFileSync('scripts/verify-player-suite.mjs','utf8');
  const defaults=source.match(/const gates=.*?:(\[[^\n]+\]);/);
  const additions=source.match(/if\(fullSuite\)gates\.splice\(1,0,([^;]+)\);/);
  assert.ok(defaults&&additions,'Cannot read established player gate inventory');
  const gates=JSON.parse(defaults[1].replaceAll("'",'"'));
  gates.splice(1,0,...JSON.parse('['+additions[1].replaceAll("'",'"')+']'));
  assert.ok(gates.length>0&&new Set(gates).size===gates.length,'Invalid player gate inventory');
  return gates;
}
export const mathematicsGates=['verify-mathematics-question-display','verify-mathematics-visual-attachments','verify-mathematics-graph-integration','verify-mathematics-graph-layout','verify-mathematics-choices','verify-mathematics-matching','verify-mathematics-notation','verify-mathematics-structural-notation','verify-mathematics-micro','verify-mathematics-acceptance'];

export function verifyGateEvidence(dir,required,head,appSha256){
  const results=JSON.parse(fs.readFileSync(path.join(dir,'logs/results.json')));
  const run=JSON.parse(fs.readFileSync(path.join(dir,'logs/run-info.json')));
  assert.ok(Array.isArray(results)&&results.length===required.length,'Incomplete regression gate set');
  const names=new Set(results.map(r=>r.name));
  assert.ok(names.size===results.length&&required.every(name=>names.has(name))&&results.every(r=>r.status===0),'Missing, duplicate or failed regression gate');
  assert.ok(run.head===head&&run.headAfter===head&&run.exactHeadUnchanged&&run.appSha256===appSha256&&run.appSha256After===appSha256&&!run.trackedStatusBefore&&!run.trackedStatusAfter&&run.gates===required.length&&run.failures===0,'Regressions must pass at this exact unchanged clean head');
  return {results,run};
}
