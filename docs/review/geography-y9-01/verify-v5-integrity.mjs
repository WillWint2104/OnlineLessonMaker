import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..'),main=path.resolve(root,'../../..');
const old='d4b4ae446c0a292c8af96663a59335f28a7d59e7',base='ec352e01cbb1098b9ce76c01b1b5bfe9bba3366a';
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:30_000_000}).trimEnd();
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),checks=[];
const check=(ok,name)=>{assert(ok,name);checks.push(name);};
const before=JSON.parse(git(['show',old+':docs/review/geography-y9-01/lesson.json']));
const actual=JSON.parse(fs.readFileSync(dir+'/lesson.json')),normal=structuredClone(actual);
const ids=['worked','map-investigation','table-investigation','guided','independent'];
for(const s of normal.slides)for(const a of s.activities){
 if(ids.includes(a.id)){check(a.layout==='geography-evidence',a.id+' explicitly opts in');delete a.layout;}
 if(a.id==='map-investigation')a.practiceNote=a.practiceNote.replace('Read the four questions for this map first','Read the four questions below the map first');
}
assert.deepEqual(normal,before);checks.push('Entire accepted v4 lesson deep-equal apart from five layout values and one spatial instruction');
const preserved=['teacher-guide.html','source-register.json','source-register.html','refinement-content.json','sources/population-map-2024.jpg','sources/city-data.json'];
for(const f of preserved){const prior=fs.readFileSync(main+'/review-delivery/geography-y9-01-d4b4ae4-review-v4/'+f);check(createHash('sha256').update(prior).digest('hex')===hash(dir+'/'+f),f+' byte-identical to accepted v4');}
const protectedFiles=[];
for(const f of git(['ls-tree','-r','--name-only',base]).split('\n')){
 if(f==='lesson-studio.html')continue;
 check(hash(root+'/'+f)===hash(main+'/'+f),'Protected baseline byte identity: '+f);
 protectedFiles.push({file:f,sha256:hash(root+'/'+f)});
}
let app=fs.readFileSync(root+'/lesson-studio.html','utf8').replaceAll('\r\n','\n');
const css=fs.readFileSync(root+'/src/geography/evidence/composition.css','utf8').replaceAll('\r\n','\n');
check(app.includes('/* GEOGRAPHY_EVIDENCE_CSS_START */\n'+css+'\n/* GEOGRAPHY_EVIDENCE_CSS_END */'),'Embedded CSS matches dedicated source');
app=app.replace(/\/\* GEOGRAPHY_EVIDENCE_CSS_START \*\/[\s\S]*?\/\* GEOGRAPHY_EVIDENCE_CSS_END \*\/\n/,'');
app=app.replace("      if(a.layout==='geography-evidence'&&!/^geography$/i.test(d.meta.subject||''))throw Error('Geography evidence layout requires a Geography lesson.');\n",'');
app=app.replace("const allowed=[...(a.layout==='geography-evidence'?['layout']:[]),","const allowed=[");
app=app.replace('${!front&&!end&&a?.layout===\'geography-evidence\'&&/^geography$/i.test(m.subject||\'\')?\' data-lp-layout="geography-evidence"\':\'\'}','');
check(app.trimEnd()===git(['show',base+':lesson-studio.html']).replaceAll('\r\n','\n'),'Only scoped CSS, exact opt-in validation and wrapper attribute differ in central application');
const frozen=main+'/review-delivery/geography-y9-01-d4b4ae4-review-v4',manifest=JSON.parse(fs.readFileSync(frozen+'/MANIFEST.json'));
for(const f of manifest.files)check(hash(frozen+'/'+f.file)===f.sha256,'Frozen v4 payload: '+f.file);
const zips=fs.readdirSync(main+'/review-delivery').filter(f=>f.endsWith('.zip')).map(file=>({file,sha256:hash(main+'/review-delivery/'+file)}));
check(zips.find(z=>z.file==='geography-y9-01-d4b4ae4-review-v4.zip')?.sha256==='46deb39e537b3b3c493d7fb650e2d2cb6d05548cc68185fd26d6c1db5f40dbd4','Original v4 ZIP preserved');
const out=path.resolve(process.env.Y9_OUT||root+'/review-delivery/y9-01-v5-integrity');fs.mkdirSync(out,{recursive:true});
const report={head:git(['rev-parse','HEAD']),complete:true,checks,base,acceptedContentHead:old,protectedFiles,historicalZips:zips,lessonChanges:'Five explicit layout opt-ins; spatial wording below the map Ã¢â€ â€™ for this map. All accepted geographical content, calculations, models, IDs and evidence unchanged.',centralDelta:'Scoped CSS, Geography-only layout validation and enumerated wrapper attribute only',noMergeDeployPublication:true};
fs.writeFileSync(out+'/v5-integrity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:checks.length,protectedFiles:protectedFiles.length,historicalZips:zips.length,complete:true}));
