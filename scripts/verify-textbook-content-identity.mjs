// Keep the reviewed mathematics and stable identities while extending practice.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const reviewed='d9157b08533226c4fbbdadddc7bb3d633f74fde4';
const files=['lessons/expanding-two-binomials/lesson.json','lessons/expanding-binomial-trinomial/lesson.json'];
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=files.map(sha);
execFileSync(process.execPath,['scripts/build-expanding-textbook.mjs']);
assert.deepEqual(files.map(sha),before,'Content generator must be idempotent');
const checks=[];
for(const file of files){
 const old=JSON.parse(execFileSync('git',['show',reviewed+':'+file],{encoding:'utf8'})),current=JSON.parse(fs.readFileSync(file));
 const practice=l=>l.slides[0].activities.find(a=>a.practiceCollectionId);
 assert.equal(practice(current).questions.length,63);
 const ids=practice(current).questions.map(q=>q.id);assert.equal(new Set(ids).size,63);
 for(const q of practice(old).questions){const fresh=practice(current).questions.find(x=>x.id===q.id);assert.ok(fresh,q.id);for(const field of ['id','stem','level','archetypeId','answer','workedAnswer'])assert.deepEqual(fresh[field],q[field],q.id+' '+field);}
 assert.deepEqual(current.meta.answerPolicy,old.meta.answerPolicy);
 assert.deepEqual(current.slides[0].activities.filter(a=>a.workedExamples),old.slides[0].activities.filter(a=>a.workedExamples));
 assert.deepEqual(current.slides[0].video,old.slides[0].video);
 checks.push(file+': all 60 reviewed question IDs/expressions/finals/working preserved; model examples, policies and videos unchanged');
}
const out=process.env.PLAYER_REVIEW_DIR||'docs/review/mathematics-m1-2';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/reviewed-content-identity.json',JSON.stringify({reviewedCommit:reviewed,builderIdempotent:true,checks,sourceFiles:files.map(file=>({file,sha256:sha(file)}))},null,2)+'\n');
console.log(checks.join('\n'));
