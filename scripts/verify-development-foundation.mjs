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
const base=p=>p.endsWith('/**')?p.slice(0,-3):p;
// Ownership supports exact repository paths and terminal directory /** only.
const safe=p=>typeof p==='string'&&p.length>0&&p===p.trim()&&!/[\\:\x00-\x1f]/.test(p)&&!p.startsWith('/')&&!/[*?\[\]{}]/.test(base(p))&&base(p).split('/').every(s=>s&&s!=='.'&&s!=='..');
const overlaps=(a,b)=>a===b||(a.endsWith('/**')&&(base(b)===base(a)||base(b).startsWith(base(a)+'/')))||(b.endsWith('/**')&&(base(a)===base(b)||base(a).startsWith(base(b)+'/')));
const setupDiffArgs=['diff','--no-renames','--name-only',ownership.baseline,'--'];
const setupPathsAllowed=(changed,allowed)=>changed.every(p=>allowed.some(a=>a===p||(a.endsWith('/**')&&p.startsWith(base(a)+'/'))));
// Pre-existing local evidence/scratch is preserved, not granted task edit ownership.
const preservedUntracked=['docs/review/**','review-delivery/**','scratchpad/**','scripts/apply-mathematics-consolidation.py','scripts/package-mathematics-visual-alignment.py'];
const setupChangedPaths=(tracked,untracked)=>[...tracked,...untracked.filter(p=>!setupPathsAllowed([p],preservedUntracked))];
function verify(b){
 assert.equal(b.version,1); assert.equal(ownership.version,1);
 assert.equal(b.activation,'HUMAN_APPROVAL_REQUIRED_NO_DISPATCH');
 assert.equal(b.limits.featureBuilders,3);assert.equal(b.limits.projectsAwaitingDesignReview,2);
 assert.ok(Array.isArray(b.approvedLaunches)&&b.approvedLaunches.every(v=>typeof v==='string'&&v.length>0),'Missing explicit launch approval record');
 assert.ok(ownership.protectedPaths.every(safe)&&ownership.areas.every(a=>[a.source,a.tests,a.instructions].every(safe)),'Unsupported ownership pattern');
 const byId=new Map();
 for(const t of b.tasks){assert.ok(!byId.has(t.id),'Duplicate task ID');byId.set(t.id,t);}
 for(const t of b.tasks){
  assert.ok(states.has(t.state),'Invalid task state');assert.ok(Number.isInteger(t.priority)&&t.priority>=0&&t.priority<=2,'Invalid priority');
  assert.ok(['feature','integration'].includes(t.lane),'Invalid lane');
  assert.ok(t.allowedPaths?.length&&t.allowedPaths.every(safe)&&t.protectedPaths?.every(safe),'Unsupported ownership pattern or missing paths');
  assert.ok(safe(t.card)&&fs.existsSync(path.join(root,t.card)),'Missing task card');
  assert.ok(['A','B','C','D'].includes(t.reviewStage),'Missing review stage');
  assert.ok(Array.isArray(t.dependencies)&&t.dependencies.every(d=>byId.has(d)&&d!==t.id),'Unknown/self dependency');
  assert.ok(Array.isArray(t.approvedDependencies)&&t.approvedDependencies.every(d=>t.dependencies.includes(d)),'Invalid dependency approval');
  if(t.state==='BLOCKED')assert.ok(t.blocker,'Missing blocker');
  const initialFeature=['HIST-001','SOURCE-001','MAP-001'].includes(t.id);
  if(initialFeature)assert.equal(t.launchGate,'HUMANITIES-STAGE-A','Missing Humanities launch gate');
  if(['ACTIVE','INTEGRATION','MERGE-CANDIDATE'].includes(t.state)){
   assert.ok(t.branch?.startsWith('codex/')&&t.owner&&t.worktree&&t.startingCommit,'Missing active checkout ownership');
   assert.ok(t.dependencies.every(d=>t.approvedDependencies.includes(d)||byId.get(d).state==='MERGED'),'Unaccepted dependency');
   if(initialFeature){
    assert.equal(byId.get('FOUND-001')?.state,'MERGED','Foundation must actually be merged');
    assert.ok(b.approvedLaunches.includes(t.launchGate),'Explicit human Stage A launch approval required');
   }
  }
  if(t.lane==='feature'){
   const area=ownership.areas.find(a=>a.id===t.stream);assert.ok(area,'Unknown owned stream');
   for(const p of t.allowedPaths){
    assert.ok([area.source,area.tests,`docs/review/${t.stream}-${t.id}/**`].some(a=>overlaps(a,p)&&base(p).startsWith(base(a))),'Feature allowed path outside its area');
    assert.ok(!ownership.protectedPaths.some(a=>overlaps(a,p)),'Feature allowed path overlaps protected area');
   }
   if(['SOURCE-001','MAP-001'].includes(t.id)){
    const gate=t.implementationGate;
    assert.ok(gate?.checkpoint==='HIST-001:A'&&byId.has('HIST-001'),'Missing History implementation gate');
    if(t.reviewStage==='A')assert.ok(t.allowedPaths.every(p=>p===`docs/review/${t.stream}-${t.id}/**`),'Stage A research cannot own implementation paths');
    else assert.ok(b.approvedCheckpoints?.includes(gate.checkpoint)&&gate.scopeReconciledWith===gate.checkpoint,'History Stage A approval and reconciled V1 scope required');
   }
  }
 }
 const visited=new Set(),pending=new Set();
 function visit(id){assert.ok(!pending.has(id),'Dependency cycle');if(visited.has(id))return;pending.add(id);for(const d of byId.get(id).dependencies)visit(d);pending.delete(id);visited.add(id);}
 for(const id of byId.keys())visit(id);
 const active=b.tasks.filter(t=>t.lane==='feature'&&t.state==='ACTIVE');
 assert.ok(active.length<=b.limits.featureBuilders,'Feature-builder capacity exceeded');
 const reviews=new Set(b.tasks.filter(t=>t.waitingForHuman).map(t=>t.project));assert.ok(reviews.size<=b.limits.projectsAwaitingDesignReview,'Human-review capacity exceeded');
 // DEFERRED is a pause, not release: a retained checkout continues reserving paths.
 const reserved=b.tasks.filter(t=>t.worktree&&t.state!=='MERGED'&&!t.ownershipReleased);
 for(const t of b.tasks.filter(t=>t.ownershipReleased))assert.ok(!t.worktree&&!t.branch,'Released ownership must clear branch/worktree');
 const trees=new Set();for(const t of reserved){const key=path.resolve(t.worktree).toLowerCase();assert.ok(!trees.has(key),'Shared writable worktree');trees.add(key);}
 for(let i=0;i<reserved.length;i++)for(let j=i+1;j<reserved.length;j++)assert.ok(!reserved[i].allowedPaths.some(a=>reserved[j].allowedPaths.some(b=>overlaps(a,b))),'Overlapping reserved ownership');
 for(const a of ownership.areas)assert.ok(fs.existsSync(path.join(root,a.instructions)),'Missing scoped instructions');
}
verify(backlog);
if(process.argv.includes('--self-test')){
 const reject=(label,change,pattern)=>{const b=structuredClone(backlog);change(b);assert.throws(()=>verify(b),pattern);console.log('PASS guard: '+label);};
 const launchFixture=b=>{b.tasks[0].state='MERGED';b.tasks[0].waitingForHuman=false;b.approvedLaunches=['HUMANITIES-STAGE-A'];};
 reject('duplicate IDs',b=>b.tasks.push(structuredClone(b.tasks[1])),/Duplicate task/);
 reject('dependency cycles',b=>b.tasks[0].dependencies=['MAP-001'],/Dependency cycle/);
 reject('protected central edits',b=>b.tasks[1].allowedPaths.push('lesson-studio.html'),/outside its area|protected area/);
 reject('unaccepted dependencies',b=>Object.assign(b.tasks[1],{state:'ACTIVE',branch:'codex/test',worktree:'C:/test/history',startingCommit:ownership.baseline,owner:'test'}),/Unaccepted dependency/);
 reject('review saturation',b=>{b.tasks[1].waitingForHuman=true;b.tasks[1].project='history-independent';b.tasks[2].waitingForHuman=true;b.tasks[2].project='source-independent';},/Human-review capacity/);
 reject('four builders',b=>{launchFixture(b);for(const t of b.tasks.slice(1))Object.assign(t,{state:'ACTIVE',branch:'codex/'+t.id,worktree:'C:/test/'+t.id,owner:'test',startingCommit:ownership.baseline});b.tasks.push({...structuredClone(b.tasks[1]),id:'DATA-001',stream:'data',allowedPaths:['src/data/**'],worktree:'C:/test/data',project:'data'});},/Feature-builder capacity/);
 reject('shared writable checkout',b=>{launchFixture(b);b.tasks=b.tasks.slice(0,3);for(const t of b.tasks.slice(1))Object.assign(t,{state:'ACTIVE',branch:'codex/'+t.id,worktree:'C:/test/shared',owner:'test',startingCommit:ownership.baseline});},/Shared writable/);
 for(const p of ['src/humanities/*.js','src/humanities/lesson-*.js','src/**/lesson.js','**','src/humanities/file?.js'])reject('unsupported wildcard '+p,b=>b.tasks[1].allowedPaths.push(p),/Unsupported ownership pattern/);
 for(const state of ['ACTIVE','STAGED-REVIEW','INTEGRATION','MERGE-CANDIDATE','BLOCKED','DEFERRED'])reject(state+' retains path reservation',b=>{
  launchFixture(b);
  const first=structuredClone(b.tasks[1]),second=structuredClone(first);
  b.tasks=[b.tasks[0],first,second];second.id='HIST-002';second.project='history-second';first.allowedPaths=['src/humanities/**'];second.allowedPaths=['src/humanities/**'];
  for(const [i,t]of [first,second].entries())Object.assign(t,{state:i?'ACTIVE':state,dependencies:[],approvedDependencies:[],branch:'codex/history-'+i,worktree:'C:/test/history-'+i,owner:'test',startingCommit:ownership.baseline,blocker:state==='BLOCKED'?'dependency':'',waitingForHuman:false});
 },/Overlapping reserved ownership/);
 for(const id of ['HIST-001','SOURCE-001','MAP-001']){
  const activate=b=>Object.assign(b.tasks.find(t=>t.id===id),{state:'ACTIVE',approvedDependencies:['FOUND-001'],branch:'codex/'+id,worktree:'C:/test/'+id,owner:'test',startingCommit:ownership.baseline});
  reject(id+' cannot bypass staged foundation with dependency/launch approval',b=>{b.approvedLaunches=['HUMANITIES-STAGE-A'];activate(b);},/Foundation must actually be merged/);
  reject(id+' cannot launch after merge without explicit human approval',b=>{b.tasks[0].state='MERGED';activate(b);b.approvedCheckpoints=['HIST-001:A'];},/Explicit human Stage A launch/);
 }
 const concurrent=structuredClone(backlog);launchFixture(concurrent);
 for(const t of concurrent.tasks.slice(1))Object.assign(t,{state:'ACTIVE',branch:'codex/'+t.id,worktree:'C:/test/'+t.id,owner:'test',startingCommit:ownership.baseline});
 verify(concurrent);console.log('PASS guard: three concurrent Stage A streams after merge AND explicit launch');
 reject('Stage A implementation creep',b=>b.tasks[2].allowedPaths.push('src/evidence-viewer/**'),/Stage A research/);
 reject('Stage B before History approval',b=>b.tasks[2].reviewStage='B',/History Stage A approval/);
 reject('Stage B without reconciled scope',b=>{b.approvedCheckpoints=['HIST-001:A'];b.tasks[2].reviewStage='B';},/History Stage A approval/);
 const accepted=structuredClone(backlog);accepted.approvedCheckpoints=['HIST-001:A'];
 for(const t of accepted.tasks.filter(t=>['SOURCE-001','MAP-001'].includes(t.id))){t.reviewStage='B';t.implementationGate.scopeReconciledWith='HIST-001:A';t.allowedPaths=structuredClone(t.stageBAllowedPaths);}
 verify(accepted);console.log('PASS guard: reconciled Stage B scope after History approval');
 assert.ok(setupDiffArgs.includes('--no-renames'));assert.equal(setupPathsAllowed(['src/graph-response/extent.js','docs/development/extent.js'],backlog.tasks[0].allowedPaths),false);console.log('PASS guard: protected rename source cannot hide behind allowed destination');
 assert.equal(setupPathsAllowed(setupChangedPaths([],['src/widgets/unowned.js']),backlog.tasks[0].allowedPaths),false);console.log('PASS guard: untracked unowned source cannot bypass setup check');
 assert.equal(setupPathsAllowed(setupChangedPaths([],['docs/development/new.md']),backlog.tasks[0].allowedPaths),true);console.log('PASS guard: untracked owned setup file is permitted');
 assert.deepEqual(setupChangedPaths([],['review-delivery/prior.zip','scratchpad/prior.txt','docs/review/prior/results.json']),[]);console.log('PASS guard: preserved local evidence is excluded without runtime exemption');
}
if(process.argv.includes('--setup')){
 const tracked=execFileSync('git',setupDiffArgs,{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 const untracked=execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).split('\0').filter(Boolean);
 const changed=setupChangedPaths(tracked,untracked);
 const allowed=backlog.tasks.find(t=>t.id==='FOUND-001').allowedPaths;
 assert.ok(setupPathsAllowed(changed,allowed),'Setup changed an unowned/runtime file');
 for(const file of ['lesson-studio.html','lessons/expanding-two-binomials.html','lessons/expanding-binomial-trinomial.html','lessons/factorising-quadratics.html','lessons/straight-lines.html']){
  const before=execFileSync('git',['show',ownership.baseline+':'+file],{cwd:root,maxBuffer:32*1024*1024});
  const after=fs.readFileSync(path.join(root,file));assert.ok(before.equals(after),'Frozen runtime differs: '+file);
 }
 console.log('PASS setup diff ownership and frozen runtime byte identity');
}
console.log(JSON.stringify({tasks:backlog.tasks.length,activeFeatureBuilders:backlog.tasks.filter(t=>t.lane==='feature'&&t.state==='ACTIVE').length,projectsWaitingForHuman:new Set(backlog.tasks.filter(t=>t.waitingForHuman).map(t=>t.project)).size,dispatch:'disabled; explicit human authority required'}));
