// A deliberate late failure must leave both existing publications byte-identical.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.resolve(process.env.PLAYER_REVIEW_DIR||'docs/review/mathematics-m1-1');
fs.mkdirSync(root+'/scratchpad',{recursive:true});
const fixture=fs.mkdtempSync(root+'/scratchpad/publication-rollback-');
fs.mkdirSync(fixture+'/scripts');fs.mkdirSync(fixture+'/lessons');
fs.copyFileSync(root+'/lesson-studio.html',fixture+'/lesson-studio.html');
fs.copyFileSync(root+'/scripts/verify-mathematics-textbook.mjs',fixture+'/scripts/verify-mathematics-textbook.mjs');
fs.cpSync(root+'/assets',fixture+'/assets',{recursive:true});
const slugs=['expanding-two-binomials','expanding-binomial-trinomial'],originals=[];
for(const [i,slug]of slugs.entries()){
 fs.mkdirSync(fixture+'/lessons/'+slug);
 const lesson=JSON.parse(fs.readFileSync(root+'/lessons/'+slug+'/lesson.json'));
 if(i===0)lesson.meta.title+=' — publication rollback calibration';
 else lesson.slides[0].activities.find(a=>a.practiceCollectionId).questions[0].answer='999';
 fs.writeFileSync(fixture+'/lessons/'+slug+'/lesson.json',JSON.stringify(lesson));
 const bytes=fs.readFileSync(root+'/lessons/'+slug+'.html');originals.push(bytes);fs.writeFileSync(fixture+'/lessons/'+slug+'.html',bytes);
}
const result=spawnSync(process.execPath,['scripts/verify-mathematics-textbook.mjs','--publish'],{cwd:fixture,env:{...process.env,PLAYER_REVIEW_DIR:fixture+'/evidence'},encoding:'utf8',timeout:600000,maxBuffer:4e6});
assert.notEqual(result.status,0,'Corrupted second lesson must fail');
assert.ok(result.stdout.includes('Actual native 200% zoom'),'First lesson must finish before the deliberate failure');
for(const [i,slug]of slugs.entries())assert.ok(fs.readFileSync(fixture+'/lessons/'+slug+'.html').equals(originals[i]),slug+' publication changed after failed checks');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/publication-rollback.json',JSON.stringify({appSha256:createHash('sha256').update(fs.readFileSync(root+'/lesson-studio.html')).digest('hex'),deliberateFailure:true,firstLessonFinished:true,bothPublicationFilesUnchanged:true,fixture:'Isolated scratch copy; canonical lesson/application files untouched'},null,2));
console.log('PASS: deliberate second-lesson failure preserves both publication files');
