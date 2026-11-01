import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {reviewNumerical} from '../../scripts/lib/mathematics-review-numerical.mjs';
import {reviewExpectations,completeAcceptance} from '../../scripts/lib/mathematics-review-expectations.mjs';
import {reserveOutputs,safeEvidencePath} from '../../scripts/lib/mathematics-review-output.mjs';

const app=fs.readFileSync('lesson-studio.html','utf8'),context=vm.createContext({});
vm.runInContext(fs.readFileSync('src/mathematics/notation/parser.js','utf8'),context);
vm.runInContext(app.slice(app.indexOf('const TPMath=(function(){'),app.indexOf('function tpMathTree('))+';globalThis.runtime=TPMath;',context);
const runtime=context.runtime,fixture=(stem,answer,workedAnswer='')=>({slides:[{activities:[{questions:[{id:'identity',stem,answer,workedAnswer}]}]}]}),run=l=>reviewNumerical({lesson:l},runtime);
const inputs=['docs/review/mathematics-micro/workflow/lesson.json','docs/review/adding-fractions-algebraic-denominators/lesson.json'];
const lessons=inputs.map(p=>JSON.parse(fs.readFileSync(p))),expects=inputs.map(p=>JSON.parse(fs.readFileSync(path.join(path.dirname(p),'EXPECTATIONS.json'))));

test('false identity cannot exploit a constant difference between sampled variables',()=>{const l=fixture('$(x-y)^2$','$1$');const r=run(l);assert.equal(r.complete,false);assert.ok(r.failed>0);assert.equal(r.attempted,48);assert.ok(r.records[0].examples.some(e=>e.scope.x===e.scope.y));assert.deepEqual(run(l),r);});
test('periodic false identity cannot exploit integer-only or half-integer-only samples',()=>{const r=run(fixture('$\\sin(2\\pi x)$','$0$'));assert.equal(r.complete,false);assert.ok(r.failed>0);});
test('restricted difference of squares excludes x=27 and retains sufficient valid coverage',()=>{for(const restriction of ['','$x\\ne27$']){const r=run(fixture('$\\frac{x^2-729}{x-27}$','$x+27$',restriction));assert.equal(r.complete,true);assert.ok(r.excluded>0);assert.ok(r.valid>=16);assert.equal(r.failed,0);assert.equal(r.attempted,r.valid+r.excluded+r.unsupported);assert.ok(r.records[0].examples.some(e=>e.scope.x===27&&e.outcome==='excluded'));}});
test('all excluded and mostly excluded comparisons never pass',()=>{for(const stem of ['$\\frac{1}{x-x}$','$\\sqrt{-x^2}$']){const r=run(fixture(stem,stem));assert.equal(r.complete,false);assert.ok(r.insufficient>0);assert.ok(r.excluded>r.valid);}});
test('unsupported notation is distinct from false identities and excluded domain samples',()=>{const r=run(fixture('$\\operatorname{lcm}(a,b)$','$a$'));assert.equal(r.complete,false);assert.equal(r.unsupported,48);assert.equal(r.excluded,0);assert.equal(r.failed,0);assert.equal(r.records[0].status,'unsupported');});
test('mixed prose mathematics remains explicitly unverified',()=>{const r=run(fixture('$x$','$x$','Claim about $x$'));assert.equal(r.complete,false);assert.equal(r.unverified.length,1);});
test('unchanged fixtures satisfy reusable counts, skill intent, answers and numerical coverage',()=>{for(let i=0;i<lessons.length;i++){const l=lessons[i],before=JSON.stringify(l),s=reviewExpectations(l,expects[i]);assert.deepEqual(s.issues,[]);assert.equal(s.questionCount,36);const n=reviewNumerical({lesson:l,config:{coveredNotes:s.coveredNotes}},runtime);assert.equal(n.complete,true,JSON.stringify({unverified:n.unverified,records:n.records.filter(r=>r.status!=='verified-by-sampling')}));assert.equal(JSON.stringify(l),before);assert.ok(n.valid>1000);}});

// Exact three historical input defects, recovered by comparing the supplied original
// download with the approved fixture. No lesson is regenerated or edited by these tests.
for(const [id,stem] of [
 ['like-denominators-example-moderate-2','$\\frac{9}{2x} + \\frac{4}{2x}$'],
 ['like-denominators-example-moderate-4','$\\frac{12}{4p} - \\frac{7}{4p}$'],
 ['common-denominator-example-basic-6','$\\frac{1}{3p} + \\frac{3}{6p}$']
])test('negative calibration: historical unreduced input '+id,()=>{const l=structuredClone(lessons[1]),q=l.slides.flatMap(s=>s.activities.flatMap(a=>a.questions||[])).find(q=>q.id===id);q.stem=stem;assert.ok(reviewExpectations(l,expects[1]).issues.includes(id+': reduced starting fractions'));});
test('intentionally unreduced fractions are permitted without opt-in reduced-input expectation',()=>{const l=structuredClone(lessons[1]),q=l.slides.flatMap(s=>s.activities.flatMap(a=>a.questions||[])).find(q=>q.id==='like-denominators-example-moderate-2');q.stem='$\\frac{18}{10x} + \\frac{8}{10x}$';const e=structuredClone(expects[1]);e.fractionSkills['like-denominators-example'].inputsReduced=false;const structure=reviewExpectations(l,e);assert.deepEqual(structure.issues,[]);assert.equal(reviewNumerical({lesson:l,config:{coveredNotes:structure.coveredNotes}},runtime).complete,true);});
test('missing answers, changed IDs, counts and instructional intent fail named checks',()=>{for(const [mutate,fragment]of [
 [l=>delete l.slides.flatMap(s=>s.activities.flatMap(a=>a.questions||[]))[0].answer,'Full final-answer'],
 [l=>l.slides.flatMap(s=>s.activities.flatMap(a=>a.questions||[]))[0].id='changed','expected question IDs'],
 [l=>l.slides.flatMap(s=>s.activities.flatMap(a=>a.questions||[]))[0].level='advanced','practice count'],
 [l=>l.slides.flatMap(s=>s.activities.flatMap(a=>(a.workedExamples||[]).flatMap(g=>g.examples)))[0].tabLabel='Unrelated','instructional skill intent']
 ]){const l=structuredClone(lessons[1]);mutate(l);assert.ok(reviewExpectations(l,expects[1]).issues.some(x=>x.includes(fragment)));}});
test('structural smoke success cannot masquerade as complete review',()=>{const good={mode:'complete',expected:expects[1],structure:{issues:[]},numerical:{complete:true},widths:[1536,1024,390],nativeZoom:{dpr:2,cssZoom:'1'},roundTrip:true,errors:[],trackedSourceDirty:false,rendering:{inspections:[{}],issues:[]}};assert.equal(completeAcceptance(good).checksComplete,true);assert.equal(completeAcceptance(good).completeCandidate,false);for(const change of [{mode:'smoke'},{expected:{}},{numerical:{complete:false}},{nativeZoom:null},{widths:[1536]},{roundTrip:false},{trackedSourceDirty:true}])assert.equal(completeAcceptance({...good,...change}).checksComplete,false);});
test('default output allocations increment and explicit paths cannot overwrite evidence',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'math-review-paths-'));try{const args={root,slug:'lesson',head:'abcdef0123'},a=reserveOutputs(args);fs.writeFileSync(path.join(a.out,'previous'),'retain');fs.writeFileSync(a.zip,'archive');const b=reserveOutputs(args);assert.notEqual(a.out,b.out);assert.match(b.out,/-v2$/);assert.equal(fs.readFileSync(a.zip,'utf8'),'archive');assert.throws(()=>reserveOutputs({...args,out:a.out}));assert.throws(()=>reserveOutputs({...args,zip:a.zip}));for(const output of ['../escape','src/review','lesson-studio.html','docs/development/replace'])assert.throws(()=>safeEvidencePath(root,output));}finally{assert.equal(path.dirname(root),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(root).startsWith('math-review-paths-'));fs.rmSync(root,{recursive:true});}});

test('legacy simplify-result expectation remains enforced without new rule fields',()=>{const l=structuredClone(lessons[1]),e=structuredClone(expects[1]);delete e.fractionSkills;const q=l.slides.flatMap(s=>s.activities.flatMap(a=>a.questions||[])).find(q=>q.archetypeId===e.simplifyResultArchetype);q.stem='$\\frac{2}{4x} + \\frac{1}{6x}$';assert.ok(reviewExpectations(l,e).issues.includes(q.id+': reduced starting fractions'));});

test('configured LCD instruction requires present and correct evidence',()=>{for(const skill of ['common-denominator-example','simplify-result-example']){const l=structuredClone(lessons[1]),q=l.slides.flatMap(s=>s.activities.flatMap(a=>a.questions||[])).find(q=>q.archetypeId===skill);q.workedAnswer=q.workedAnswer.split('\n').filter(s=>!s.startsWith('Lowest common denominator: ')).join('\n');assert.ok(reviewExpectations(l,expects[1]).issues.includes(q.id+': worked answer states lowest common denominator'));}});
test('missing, nonnumeric or nonfinite DPR cannot pass native-200 acceptance',()=>{for(const dpr of [undefined,NaN,Infinity,'2',null]){const r=completeAcceptance({mode:'complete',expected:expects[1],structure:{issues:[]},numerical:{complete:true},widths:[1536,1024,390],nativeZoom:{cssZoom:'1',dpr},roundTrip:true,errors:[],trackedSourceDirty:false,rendering:{inspections:[{}],issues:[]}});assert.equal(r.checksComplete,false);assert.ok(r.issues.includes('Native 200% browser inspection required'));}});

test('rendered diagnostic alone prevents otherwise complete acceptance',()=>{const good={mode:'complete',expected:expects[1],structure:{issues:[]},numerical:{complete:true},widths:[1536,1024,390],nativeZoom:{dpr:2,cssZoom:'1'},roundTrip:true,errors:[],trackedSourceDirty:false,rendering:{inspections:[{}],issues:[]}};assert.equal(completeAcceptance(good).checksComplete,true);const bad=completeAcceptance({...good,rendering:{inspections:[{}],issues:[{questionId:'simplify-result-example-basic-1',field:'workedAnswer',diagnostic:'Math-only expressions must not contain dollar delimiters.'}]}});assert.equal(bad.checksComplete,false);assert.equal(bad.completeCandidate,false);assert.match(bad.issues.join(' '),/rendering failures/);assert.equal(completeAcceptance({...good,rendering:undefined}).checksComplete,false);});

test('isolated production notation dependency diagnoses malformed and unsupported input',()=>{assert.ok(runtime.syntax.notationIssues('\\begin{pmatrix}1 & 2 \\\\ 3\\end{pmatrix}').length);assert.ok(runtime.syntax.notationIssues('\\int_0 x').length);assert.equal(run(fixture('$\\operatorname{lcm}(a,b)$','$a$')).complete,false);assert.equal(typeof context.document,'undefined');});
