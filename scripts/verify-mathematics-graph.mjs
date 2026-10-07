import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const ref=fs.readFileSync('assets/vendor/hgl-graph/graph-reference.html');
assert.equal(createHash('sha256').update(ref).digest('hex'),'f9fd53f26dfaaf04f330c47bccbaccaa8fe54722dfe0e49b7bf300f8e8e8cb9a');
const core=fs.readFileSync('assets/vendor/hgl-graph/foundation.generated.js','utf8'),integration=fs.readFileSync('src/graph-response/graph-response.js','utf8'),app=fs.readFileSync('lesson-studio.html','utf8');
assert.ok(app.includes(core));assert.ok(app.includes(integration));assert.ok(!/(?<![.\w])eval\s*\(|new\s+Function\s*\(/.test(core.replace(/\/\*[^]*?\*\/|\/\/[^\n]*/g,'')));
const box=vm.createContext({crypto:{randomUUID:()=>String(Math.random())},console});vm.runInContext(core+'\n'+integration,box);const call=expression=>vm.runInContext(expression,box);
for(const [expr,x,y]of [['2x+1',2,5],['(x-1)^2-3',1,-3],['x²−4',-2,0],['1/x',-2,-.5],['-x^2',2,-4],['2^-3',0,.125],['sqrt(x)',4,2],['sin(pi/2)',0,1]]){const result=call('GR_HGL.compile('+JSON.stringify(expr)+')');assert.equal(result.error,null,expr);assert.ok(Math.abs(result.eval(x)-y)<1e-9,expr);}
for(const expr of ['alert(1)','window','constructor(1)','x;1','x+','(x+1','x=1'])assert.ok(call('GR_HGL.compile('+JSON.stringify(expr)+').error'),expr);
assert.ok(!Number.isFinite(call("GR_HGL.compile('1/x').eval(0)")));console.log('PASS supplied parser precedence, Unicode, implicit multiplication, domains and hostile/malformed input');
const lesson=JSON.parse(fs.readFileSync('docs/review/mathematics-m3/workflow/graph-response-lesson.json'));box.fixture=lesson;
call('fixture.slides[0].activities.at(-1).questions.forEach(grConfigValidate)');
for(const mutate of ['q.releaseGroup="__proto__"','q.releaseGroup="constructor"','q.graphResponse.axes.xMax=q.graphResponse.axes.xMin','q.graphResponse.axes.snap=-1','q.graphResponse.axes.xStep=0','q.graphResponse.axes.aspect="giant"','q.graphResponse.tools=["teacherPlotter"]','q.graphAnswer.objects=[{type:"function",expr:"alert(1)"}]','q.graphResponse.table={rows:[{id:"r",x:[1],y:0}]}','q.graphResponse.table={rows:[{id:"r",x:0,y:0},{id:"r",x:1,y:1}]}'])assert.throws(()=>call('(()=>{const q=grCopy(fixture.slides[0].activities.at(-1).questions[0]);'+mutate+';grConfigValidate(q)})()'));
console.log('PASS authored configuration rejects degenerate ranges, unsafe models, unsupported tools and duplicate row identities');
const linked=call('grLinked({rows:[{id:"a",x:"",y:"2"},{id:"b",x:"1",y:"bad"},{id:"c",x:".5",y:"-2"}]})');assert.equal(linked.length,1);assert.equal(linked[0].x,.5);assert.equal(linked[0].y,-2);
console.log('PASS blank/invalid table coordinates are not coerced to zero; fractional signed values retain identity');
const packageOut=call('grStudentData(grCopy(fixture))');for(const q of packageOut.slides[0].activities.at(-1).questions){assert.equal(q.graphAnswer.objects.length,0);assert.equal(q.workedAnswer,undefined);assert.equal(q.graphAnswer.table.length,0);assert.equal(q.answer,undefined);}
console.log('PASS deferred teacher group answers and working are stripped from learner publication');
const autonomousOut=call('(()=>{const out=grCopy(fixture);out.meta.answerPolicy.groups={};return grStudentData(out)})()');for(const [i,q]of autonomousOut.slides[0].activities.at(-1).questions.entries()){assert.equal(JSON.stringify(q.graphAnswer),JSON.stringify(lesson.slides[0].activities.at(-1).questions[i].graphAnswer));assert.equal(q.workedAnswer,lesson.slides[0].activities.at(-1).questions[i].workedAnswer);}
console.log('PASS autonomous publication preserves authored models, working and completed tables');
assert.ok(!integration.includes('localStorage'));assert.ok(!integration.includes('iframe'));assert.ok(!integration.includes('fetch('));assert.ok(!integration.includes('WIDGET_STATE'));
console.log('PASS no second response store, teacher-builder UI, browser persistence, iframe or remote backend');
