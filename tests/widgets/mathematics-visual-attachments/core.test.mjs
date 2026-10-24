import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context=vm.createContext({module:{exports:{}}});vm.runInContext(fs.readFileSync('src/mathematics/visual-attachments/core.js','utf8'),context);const v=context.module.exports;
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const base=JSON.parse(fs.readFileSync('tests/widgets/mathematics-visual-attachments/function-table.json','utf8'));
check('Valid registry, existing table model and meaningful description',()=>assert.deepEqual([...v.issues(base)],[]));
check('Legacy lesson without opt-in remains untouched',()=>{const d={meta:{},slides:[{id:'legacy',activities:[{questions:[{id:'q',figure:{old:'semantics'}}]}]}]};assert.deepEqual([...v.issues(d)],[]);assert.equal(v.stripAnswers(d),d);});
for(const[name,mutate]of [
 ['duplicate ID',d=>d.slides[0].visuals.push(structuredClone(d.slides[0].visuals[0]))],
 ['missing reference',d=>d.slides[0].activities[1].questions[0].visualRefs=['missing']],
 ['duplicate reference',d=>d.slides[0].activities[1].questions[0].visualRefs=['function-table-given-0','function-table-given-0']],
 ['bad registry shape',d=>d.slides[0].visuals='wrong'],
 ['unsupported payload',d=>d.slides[0].visuals[0].kind='html'],
 ['missing description',d=>delete d.slides[0].visuals[0].description],
 ['model in givens',d=>d.slides[0].visuals[0].completionCells=[['secret']]],
 ['malformed completion',d=>d.slides[0].activities[1].questions[0].answerVisuals.final[0].completionCells=[['x']]],
 ['overwritten given',d=>d.slides[0].activities[1].questions[0].answerVisuals.final[0].completionCells=[['-1','99','3','5']]],
 ['unfilled model blank',d=>d.slides[0].activities[1].questions[0].answerVisuals.final[0].completionCells=[['','1','3','5']]],
 ['broken answer reference',d=>d.slides[0].activities[1].questions[0].answerVisuals.final[0].ref='gone']
])check(name+' is diagnosed without mutating draft',()=>{const d=structuredClone(base);mutate(d);const before=JSON.stringify(d);assert.ok(v.issues(d).length>0);assert.equal(JSON.stringify(d),before);});
check('Child reference extends parent without inherited duplicate',()=>assert.deepEqual([...v.references({visualRefs:['triangle','extra','extra']},['triangle'])],['extra']));
check('Completion keeps given cells and unknown metadata',()=>{const t={head:['a','b'],rows:[{label:'r',cells:['7','']}],unknown:{keep:true}},c=v.completed(t,[['7','9']]);assert.equal(c.rows[0].cells[0],'7');assert.equal(c.rows[0].cells[1],'9');assert.equal(c.unknown,t.unknown);assert.equal(t.rows[0].cells[1],'');});
for(const final of ['autonomous','end','hidden','teacher'])for(const worked of ['autonomous','hidden'])check('Independent nested answer projection '+final+'/'+worked,()=>{const d=structuredClone(base),q=d.slides[0].activities[1].questions[0];d.meta.answerPolicy={final,worked};q.parts[0].parts=[{id:'nested',answerVisuals:structuredClone(q.answerVisuals)}];v.stripAnswers(d);for(const o of [q,q.parts[0].parts[0]]){assert.equal(!!o.answerVisuals?.final,['autonomous','end'].includes(final));assert.equal(!!o.answerVisuals?.worked,worked==='autonomous');}assert.ok(d.slides[0].visuals.length);});
for(const src of ['javascript:alert(1)','data:text/html;base64,AAAA','data:image/svg+xml,<svg/>','//host/image.svg','file:///C:/image.svg','https://a/x.svg#part'])check('Unsafe source rejected '+src,()=>assert.ok(v.imageIssue(src)));
for(const src of ['assets/sector.svg','https://example.org/figure.png','data:image/png;base64,AAAA'])check('Supported image source '+src,()=>assert.equal(v.imageIssue(src),''));
console.log(JSON.stringify({checks:count}));
