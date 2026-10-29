import os from'node:os';import path from'node:path';import{spawnSync}from'node:child_process';
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';
await import('../../../src/mathematics/question-display/core.js');
const M=globalThis.MathDisplay,app=fs.readFileSync('lesson-studio.html','utf8');
const engineStart=app.indexOf('const TPMath=(function(){'),engineEnd=app.indexOf('/* engine-level aliases',engineStart),context=vm.createContext({});
vm.runInContext(fs.readFileSync('src/mathematics/notation/parser.js','utf8')+'\n'+app.slice(engineStart,engineEnd)+'\nglobalThis.actualSyntax=TPMath.syntax;',context);
const syntax=context.actualSyntax;
for(const [math,lhs,rhs]of [['2x+3=7','2x+3','7'],['x^{i=1}=4','x^{i=1}','4'],['\\frac{x=1}{2}=y','\\frac{x=1}{2}','y'],['(x=1)+2=3','(x=1)+2','3'],['y=5-3=2','y','5-3=2'],['\\abs(x=1)=2','\\abs(x=1)','2'],['x\\le2','x','2'],['|x=1|=2','|x=1|','2']])test('Principal relation: '+math,()=>{const p=M.outerRelation(math);assert.equal(math.slice(0,p.at),lhs);assert.equal(math.slice(p.at+p.length),rhs);});
for(const math of ['x^2+1','\\frac{x=1}{2}','(x=1)','x_{n=2}','||x=2||'])test('Readable unaligned fallback: '+math,()=>assert.equal(M.outerRelation(math),null));
for(const math of ['-8+3\\times4','\\frac{\\frac{1}{2}+\\frac{1}{3}}{\\frac{5}{6}}','\\sqrt[3]{-8}','u_n','x^{n+1}','\\sin(x)','\\sin\\left(x\\right)','x\\le2','15\\%','\\int_0^1 x dx'])test('Accepted notation: '+math,()=>assert.deepEqual(M.diagnoseMath(math,syntax),[]));
for(const math of ['\\unsupportedaccent{x}','\\operatorname{LCM}(2,3)','\\begin{unsupportedmatrix}1\\end{unsupportedmatrix}','\\frac{1}{2','\\frac{1}{}','x^','\\sqrt[]{}','\\sin x','\\sin\\left x','(x+1','x+1)'])test('Useful notation error: '+math,()=>{const errors=M.diagnoseMath(math,syntax);assert.ok(errors.length);assert.ok(errors.every(e=>e.offset>=1&&e.message));});
const fixture=JSON.parse(fs.readFileSync('tests/widgets/mathematics-question-display/lesson.json'));const q=l=>l.slides[0].activities.at(-1).questions[0];
test('Canonical fixture has no publication issues',()=>assert.deepEqual(M.issues(fixture,syntax),[]));
test('Exact compatibility duplicate normalises without rewriting canonical math or source',()=>{const l=structuredClone(fixture);q(l).workedAnswer=M.fallback(q(l).workedSolution).replace(/\n/g,'\r\n');const n=M.normalize(l,syntax);assert.ok(!('workedAnswer'in q(n.lesson)));assert.ok(n.notices.length);assert.ok(q(l).workedAnswer);assert.deepEqual(q(n.lesson).workedSolution,q(l).workedSolution);});
test('Conflict preserved and publication diagnosed',()=>{const l=structuredClone(fixture);q(l).workedAnswer='$x=99$';assert.ok(M.issues(l,syntax).some(e=>/disagree/.test(e.message)));assert.equal(q(M.normalize(l,syntax).lesson).workedAnswer,'$x=99$');});
test('Missing/duplicate IDs across parts are diagnosed',()=>{const l=structuredClone(fixture);delete q(l).workedSolution.steps[0].id;q(l).workedSolution.steps[1].id=q(l).workedSolution.steps[2].id;assert.ok(M.issues(l,syntax).filter(e=>e.path.endsWith('.id')).length>=2);});
test('No separately editable segments, no outer dollar or multiline canonical math',()=>{for(const patch of [{left:'x'},{math:'$x=2$'},{math:'x=2\nx=3'}]){const l=structuredClone(fixture);Object.assign(q(l).workedSolution.steps[0],patch);assert.ok(M.issues(l,syntax).length);}});
test('Unknown commands carry exact field path and one-based character',()=>{const l=structuredClone(fixture);q(l).stem='Solve $\\unknown x$.';const e=M.issues(l,syntax).find(e=>/Unsupported command/.test(e.message));assert.equal(e.path,'lesson.slides.0.activities.1.questions.0.stem');assert.equal(e.offset,8);});
test('Legacy strings are retained, not migrated',()=>{const l=structuredClone(fixture);delete q(l).workedSolution;q(l).workedAnswer='$2x=4$\n$x=2$';assert.deepEqual(M.normalize(l,syntax).lesson,l);});
test('Prose-only steps need no artificial equation',()=>assert.deepEqual(M.solutionIssues({steps:[{id:'proof',text:'The sum is even.'}]},'solution'),[]));
for(const slug of ['expanding-two-binomials','expanding-binomial-trinomial','factorising-quadratics'])test('Legacy italic-underscore syntax stays valid: '+slug,()=>{const l=JSON.parse(fs.readFileSync('lessons/'+slug+'/lesson.json'));assert.deepEqual(M.issues(l,syntax),[]);});
test('Invalid duplicate remains intact as an editable draft',()=>{const l=structuredClone(fixture);q(l).workedSolution.steps[0].math='\\unknown{x}';q(l).workedAnswer=M.fallback(q(l).workedSolution);assert.deepEqual(M.normalize(l,syntax).lesson,l);});

test('Generated block is idempotent and incomplete markers cannot corrupt the app',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'math-display-build-')),script=path.resolve('scripts/build-mathematics-question-display.mjs');
 try{fs.mkdirSync(path.join(dir,'src/mathematics/question-display'),{recursive:true});for(const file of ['core.js','host.js'])fs.copyFileSync('src/mathematics/question-display/'+file,path.join(dir,'src/mathematics/question-display',file));const target=path.join(dir,'lesson-studio.html'),run=()=>spawnSync(process.execPath,[script],{cwd:dir,encoding:'utf8'});
 fs.writeFileSync(target,'function mxWorking(value){}');assert.equal(run().status,0);const once=fs.readFileSync(target,'utf8');assert.equal(run().status,0);assert.equal(fs.readFileSync(target,'utf8'),once);
 for(const broken of ['/* MATHEMATICS_QUESTION_DISPLAY_END */function mxWorking(value){}','/* MATHEMATICS_QUESTION_DISPLAY_START */']){fs.writeFileSync(target,broken);assert.notEqual(run().status,0);assert.equal(fs.readFileSync(target,'utf8'),broken);}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Unsupported non-textbook structured scope is publication-blocking, not silently ignored',()=>{const l=structuredClone(fixture);l.meta.practiceLayout='legacy';assert.ok(M.issues(l,syntax).some(e=>e.message.includes('supported on textbook')));});

test('Doubled-dollar notation cannot bypass preflight',()=>{const l=structuredClone(fixture);q(l).workedAnswer='$$\\bogus$$';assert.ok(M.issues(l,syntax).some(e=>e.message.includes('Display-math')));});
test('Malformed bare worked-example math is checked without reinterpreting legacy italics',()=>{const l=structuredClone(fixture);const step=l.slides[0].activities[0].workedExamples[0].examples[0].steps[0];delete step.alignmentGroup;step.math='x^{2';assert.ok(M.issues(l,syntax).some(e=>e.path.endsWith('.math')));});

test('Escaped literal dollar before inline maths remains valid',()=>{const l=structuredClone(fixture);q(l).stem='Value: \\$$x$';assert.deepEqual(M.issues(l,syntax),[]);assert.equal(M.spans(q(l).stem).spans[0].math,'x');});
