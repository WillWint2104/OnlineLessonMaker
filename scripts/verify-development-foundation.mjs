// Read-only coordination checks. No agent dispatch, app registration or runtime code.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const ownership=read('docs/development/ownership.json');
const backlog=read('docs/development/backlog.json');
const states=new Set(['QUEUED','ACTIVE','BLOCKED','STAGED-REVIEW','INTEGRATION','MERGE-CANDIDATE','MERGED','DEFERRED']);
const safe=p=>typeof p==='string'&&p&&!p.includes('\\')&&!p.startsWith('/')&&!p.split('/').includes('..');
const base=p=>p.endsWith('/**')?p.slice(0,-3):p;
const overlaps=(a,b)=>a===b||(a.endsWith('/**')&&(base(b)===base(a)||base(b).startsWith(base(a)+'/')))||(b.endsWith('/**')&&(base(a)===base(b)||base(a).startsWith(base(b)+'/')));
function verify(b){
 assert.equal(b.version,1); assert.equal(ownership.version,1);
 assert.equal(b.activation,'HUMAN_APPROVAL_REQUIRED_NO_DISPATCH');
 assert.equal(b.limits.featureBuilders,3);assert.equal(b.limits.projectsAwaitingDesignReview,2);
 const byId=new Map();
 for(const t of b.tasks){assert.ok(!byId.has(t.id),'Duplicate task ID');byId.set(t.id,t);}
 for(const t of b.tasks){
  assert.ok(states.has(t.state),'Invalid task state');assert.ok(Number.isInteger(t.priority)&&t.priority>=0&&t.priority<=2,'Invalid priority');
  assert.ok(['feature','integration'].includes(t.lane),'Invalid lane');
  assert.ok(t.allowedPaths?.length&&t.allowedPaths.every(safe)&&t.protectedPaths?.every(safe),'Unsafe/missing paths');
  assert.ok(safe(t.card)&&fs.existsSync(path.join(root,t.card)),'Missing task card');
  assert.ok(['A','B','C','D'].includes(t.reviewStage),'Missing review stage');
  assert.ok(Array.isArray(t.dependencies)&&t.dependencies.every(d=>byId.has(d)&&d!==t.id),'Unknown/self dependency');
  assert.ok(Array.isArray(t.approvedDependencies)&&t.approvedDependencies.every(d=>t.dependencies.includes(d)),'Invalid dependency approval');
  if(t.state==='BLOCKED')assert.ok(t.blocker,'Missing blocker');
  if(['ACTIVE','INTEGRATION','MERGE-CANDIDATE'].includes(t.state)){
   assert.ok(t.branch?.startsWith('codex/')&&t.owner&&t.worktree&&t.startingCommit,'Missing active checkout ownership');
   assert.ok(t.dependencies.every(d=>t.approvedDependencies.includes(d)||byId.get(d).state==='MERGED'),'Unaccepted dependency');
  }
  if(t.lane==='feature'){
   const area=ownership.areas.find(a=>a.id===t.stream);assert.ok(area,'Unknown owned stream');
   for(const p of t.allowedPaths){
    assert.ok([area.source,area.tests,`docs/review/${t.stream}-${t.id}/**`].some(a=>overlaps(a,p)&&base(p).startsWith(base(a))),'Feature allowed path outside its area');
    assert.ok(!ownership.protectedPaths.some(a=>overlaps(a,p)),'Feature allowed path overlaps protected area');
   }
  }
 }
 const visited=new Set(),pending=new Set();
 function visit(id){assert.ok(!pending.has(id),'Dependency cycle');if(visited.has(id))return;pending.add(id);for(const d of byId.get(id).dependencies)visit(d);pending.delete(id);visited.add(id);}
 for(const id of byId.keys())visit(id);
 const active=b.tasks.filter(t=>t.lane==='feature'&&t.state==='ACTIVE');
 assert.ok(active.length<=b.limits.featureBuilders,'Feature-builder capacity exceeded');
 const reviews=new Set(b.tasks.filter(t=>t.waitingForHuman).map(t=>t.project));assert.ok(reviews.size<=b.limits.projectsAwaitingDesignReview,'Human-review capacity exceeded');
 const occupied=b.tasks.filter(t=>['ACTIVE','INTEGRATION'].includes(t.state));
 const reserved=b.tasks.filter(t=>t.worktree&&!['MERGED','DEFERRED'].includes(t.state));
 const trees=new Set();for(const t of reserved){const key=path.resolve(t.worktree).toLowerCase();assert.ok(!trees.has(key),'Shared writable worktree');trees.add(key);}
 for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++)assert.ok(!occupied[i].allowedPaths.some(a=>occupied[j].allowedPaths.some(b=>overlaps(a,b))),'Overlapping active ownership');
 for(const a of ownership.areas)assert.ok(fs.existsSync(path.join(root,a.instructions)),'Missing scoped instructions');
}
verify(backlog);
if(process.argv.includes('--self-test')){
 const reject=(label,change,pattern)=>{const b=structuredClone(backlog);change(b);assert.throws(()=>verify(b),pattern);console.log('PASS guard: '+label);};
 reject('duplicate IDs',b=>b.tasks.push(structuredClone(b.tasks[1])),/Duplicate task/);
 reject('dependency cycles',b=>b.tasks[0].dependencies=['MAP-001'],/Dependency cycle/);
 reject('protected central edits',b=>b.tasks[1].allowedPaths.push('lesson-studio.html'),/outside its area|protected area/);
 reject('unaccepted dependencies',b=>Object.assign(b.tasks[1],{state:'ACTIVE',branch:'codex/test',worktree:'C:/test/history',startingCommit:ownership.baseline,owner:'test'}),/Unaccepted dependency/);
 reject('review saturation',b=>{b.tasks[1].waitingForHuman=true;b.tasks[2].waitingForHuman=true;},/Human-review capacity/);
 reject('four builders',b=>{b.tasks=b.tasks.slice(1);for(const t of b.tasks)Object.assign(t,{state:'ACTIVE',dependencies:[],approvedDependencies:[],branch:'codex/'+t.id,worktree:'C:/test/'+t.id,owner:'test',startingCommit:ownership.baseline});b.tasks.push({...structuredClone(b.tasks[0]),id:'DATA-001',stream:'data',allowedPaths:['src/data/**'],worktree:'C:/test/data',project:'data'});},/Feature-builder capacity/);
 reject('shared writable checkout',b=>{b.tasks=b.tasks.slice(1,3);for(const t of b.tasks)Object.assign(t,{state:'ACTIVE',dependencies:[],approvedDependencies:[],branch:'codex/'+t.id,worktree:'C:/test/shared',owner:'test',startingCommit:ownership.baseline});},/Shared writable/);
}
if(process.argv.includes('--setup')){
 const changed=execFileSync('git',['diff','--name-only',ownership.baseline,'--'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 const allowed=backlog.tasks.find(t=>t.id==='FOUND-001').allowedPaths;
 assert.ok(changed.every(p=>allowed.some(a=>a===p||(a.endsWith('/**')&&p.startsWith(base(a)+'/')))),'Setup changed an unowned/runtime file');
 for(const file of ['lesson-studio.html','lessons/expanding-two-binomials.html','lessons/expanding-binomial-trinomial.html','lessons/factorising-quadratics.html','lessons/straight-lines.html']){
  const before=execFileSync('git',['show',ownership.baseline+':'+file],{cwd:root,maxBuffer:32*1024*1024});
  const after=fs.readFileSync(path.join(root,file));assert.ok(before.equals(after),'Frozen runtime differs: '+file);
 }
 console.log('PASS setup diff ownership and frozen runtime byte identity');
}
console.log(JSON.stringify({tasks:backlog.tasks.length,activeFeatureBuilders:backlog.tasks.filter(t=>t.lane==='feature'&&t.state==='ACTIVE').length,projectsWaitingForHuman:new Set(backlog.tasks.filter(t=>t.waitingForHuman).map(t=>t.project)).size,dispatch:'disabled; explicit human authority required'}));
