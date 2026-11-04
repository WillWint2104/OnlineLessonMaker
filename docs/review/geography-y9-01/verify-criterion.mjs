import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Verify the single approved rubric exception against the frozen starting candidate.
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..');
const start='83b62eeda3013d4e1ac720b60d020cff6731f725';
const old='Names eastern/south-eastern concentration, a contrasting broad interior region and a supported exception such as the south-west.';
const approved='Describes a located population concentration and identifies a map-supported exception to an east-coast-only pattern, such as the south-western concentration.';
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:30_000_000}).trimEnd();
const baseline=file=>execFileSync('git',['show',start+':docs/review/geography-y9-01/'+file],{cwd:root});
const read=file=>fs.readFileSync(path.join(dir,file));
const checks=[],check=(ok,name)=>{assert(ok,name);checks.push(name);};
const guide=read('teacher-guide.html').toString('utf8'),generator=read('review-documents.mjs').toString('utf8');
const normalize=s=>s.replaceAll('\r\n','\n');
check(guide.split(approved).length===2&&generator.split(approved).length===2,'Exact approved criterion appears once in guide and generator');
check(!guide.includes(old),'Superseded independent criterion is absent');
assert.equal(normalize(guide.replace(approved,old)),normalize(baseline('teacher-guide.html').toString('utf8')));check(true,'Every other teacher-guide byte and rubric row is preserved apart from repository EOL conversion');
for(const file of ['lesson.json','refinement-content.json','source-register.json','source-register.html','design-and-publication-notes.json','design-and-publication-notes.html','sources/population-map-2024.jpg','sources/city-data.json']){
 const actual=read(file),before=baseline(file);
 check(actual.equals(before)||(!file.endsWith('.jpg')&&normalize(actual.toString('utf8'))===normalize(before.toString('utf8'))),file+' preserved against frozen starting head');
}
const lesson=JSON.parse(read('lesson.json')),refinement=JSON.parse(read('refinement-content.json'));
const activities=lesson.slides.flatMap(s=>s.activities),map=activities.find(a=>a.id==='map-investigation');
check(map.questions.flatMap(q=>q.parts).some(p=>/contrast.*broad interior/.test(p)),'Earlier Source A investigation retains its explicit interior contrast');
const independent=activities.find(a=>a.id==='independent').questions[0];
check(/located distribution pattern.*exception/.test(independent.parts[0]),'Independent task retains located pattern and exception requirement');
check(/concentrations in eastern and south-eastern Australia/.test(refinement.core.model)&&/separate south-western concentration/.test(refinement.core.model),'Unchanged core model provides the located concentration and map-supported exception required by the revised criterion');
check(!/interior/.test(approved)&&refinement.core.model.split(/\s+/).length>=60&&refinement.core.model.split(/\s+/).length<=90,'Revised criterion adds no separate interior contrast or core word burden');
const outputs=['teacher-guide.html','source-register.html','source-register.json','design-and-publication-notes.html','design-and-publication-notes.json'];
const before=outputs.map(read);
execFileSync(process.execPath,[path.join(dir,'review-documents.mjs'),'--teacher-guide-only'],{cwd:root,stdio:'pipe'});
check(outputs.every((file,i)=>read(file).equals(before[i])),'Teacher-only generation reproduces the guide and preserves every other current resource byte-identically');
execFileSync(process.execPath,[path.join(dir,'review-documents.mjs')],{cwd:root,stdio:'pipe'});
check(outputs.every((file,i)=>read(file).equals(before[i])),'Full regeneration also preserves every accepted output byte-identically');
const report={head:git(['rev-parse','HEAD']),startingHead:start,complete:true,approvedCriterion:approved,checks,limits:'Content assertions supplement the explicit human pedagogical decision; they do not automate historical or classroom assessment.'};
if(process.env.Y9_OUT){fs.mkdirSync(process.env.Y9_OUT,{recursive:true});fs.writeFileSync(path.join(process.env.Y9_OUT,'criterion-verification.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({head:report.head,complete:true,checks:checks.length}));
