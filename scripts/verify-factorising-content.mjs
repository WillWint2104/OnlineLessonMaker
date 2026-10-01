// Content arithmetic only: no application solver or renderer changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='docs/lessons/factorising-quadratics',file='lessons/factorising-quadratics/lesson.json';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const lesson=read(file),keys=read(root+'/practice-key.json'),checks=[];
const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
const add=(a,b)=>Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||0)+(b[i]||0));
const multiply=(a,b)=>{const c=Array(a.length+b.length-1).fill(0);a.forEach((v,i)=>b.forEach((w,j)=>c[i+j]+=v*w));return c;};
function polynomial(source){
 const s=source.replaceAll('_x_','x').replaceAll('−','-').replaceAll('×','*').replace(/\s/g,'');
 const tokens=s.match(/\d+|x|[()+*^\-]/g)||[];assert.equal(tokens.join(''),s,'Unsupported expression: '+source);let i=0;
 const atom=()=>{let a;
  if(tokens[i]==='-'){i++;return multiply([-1],atom());}
  if(tokens[i]==='+'){i++;return atom();}
  if(tokens[i]==='('){i++;a=sum();assert.equal(tokens[i++],')');}
  else if(tokens[i]==='x'){i++;a=[0,1];}
  else{assert.match(tokens[i]||'',/^\d+$/);a=[+tokens[i++]];}
  if(tokens[i]==='^'){i++;const n=+tokens[i++];assert.ok(Number.isInteger(n)&&n>=0&&n<=4);const base=a;a=[1];for(let k=0;k<n;k++)a=multiply(a,base);}
  return a;
 };
 const product=()=>{let a=atom();while(tokens[i]==='*'||tokens[i]==='('||tokens[i]==='x'||/^\d+$/.test(tokens[i]||'')){if(tokens[i]==='*')i++;a=multiply(a,atom());}return a;};
 const sum=()=>{let a=product();while(tokens[i]==='+'||tokens[i]==='-'){const sign=tokens[i++]==='+'?1:-1;a=add(a,multiply([sign],product()));}return a;};
 const result=sum();assert.equal(i,tokens.length);while(result.length>1&&result.at(-1)===0)result.pop();return result;
}
assert.equal(lesson.slides.length,2);assert.equal(lesson.meta.responseMode,'paper');
assert.deepEqual(lesson.slides.map(s=>s.title),['Factorising monic quadratics','Factorising non-monic quadratics']);
for(const s of lesson.slides){assert.equal(s.activities.length,7);assert.equal(s.activities.filter(a=>a.optionalVideo).length,1);assert.deepEqual(s.video,{url:''});}
check(!/reviewFixture|synthetic|test values|implementation notes|Verified candidate|Temporary/.test(JSON.stringify(lesson)),'Two classroom skills, paper default, one empty optional-video activity each, no fixture labels');
const activities=lesson.slides.flatMap(s=>s.activities),questions=activities.flatMap(a=>a.questions||[]);
for(const a of activities.filter(a=>a.workedExamples)){
 const ex=a.workedExamples[0].examples[0],expected=polynomial(ex.prompt.match(/^Factorise (.+)\.$/)[1]);
 const [c,b,leading]=expected,product=leading*c;
 if(ex.solutionLayout==='paired-table'){
  assert.ok(!/_[mnabc]_/.test(JSON.stringify(ex)));assert.ok(ex.steps.every(st=>!st.note&&st.text.split('.').filter(Boolean).length<=1));
  const support=ex.support;assert.ok(support&&support.steps.length===3);const table=support.steps[1].visual[0];
  const pairs=table.rows.map(row=>{const [m,n]=row[0].replaceAll('−','-').match(/-?\d+/g).map(Number);assert.equal(m*n,product);assert.equal(Number(row[1].replaceAll('−','-')),product);assert.equal(Number(row[2].replaceAll('−','-')),m+n);return [m,n];});
  const magnitude=[];for(let d=1;d*d<=Math.abs(product);d++)if(Math.abs(product)%d===0)magnitude.push([d,Math.abs(product)/d]);assert.deepEqual(pairs.map(p=>p.map(Math.abs)),magnitude);
  const selected=pairs[Number(support.steps[1].selectedRow)];assert.equal(selected[0]+selected[1],b);
  const generated=support.steps[0].math.split('\n');for(const line of generated){const quotient=line.match(/^(\d+) ÷ (\d+) = (\d+) → \((\d+), (\d+)\)$/);if(quotient){const [,n,d,q,u,v]=quotient.map(Number);assert.equal(n,Math.abs(product));assert.equal(n,d*q);assert.equal(u,d);assert.equal(v,q);}else{const rem=line.match(/^(\d+) = (\d+) × (\d+) \+ (\d+)$/);assert.ok(rem);const [,n,d,q,r]=rem.map(Number);assert.equal(n,d*q+r);assert.ok(r>0&&r<d);}}
  let algebra=0;for(const st of [...ex.steps,...support.steps])for(const line of st.math.split('\n')){if(line.includes('_x_')){for(const expr of line.split('=').filter(x=>x.trim())){assert.deepEqual(polynomial(expr),expected);algebra++;}}else if(line.includes('=')&&!line.includes('→')&&!line.includes('÷')){const values=line.split('=').map(polynomial);values.forEach(v=>assert.deepEqual(v,values[0]));}}
  ex.answer.split('=').forEach(expr=>assert.deepEqual(polynomial(expr),expected));assert.ok(algebra>=4);assert.equal(ex.steps.at(-1).id,a.id+'-check');
  if(leading!==1)assert.ok(ex.steps.filter(st=>st.id.includes('-factor-')).length===3,'Split, group and shared-factor extraction retained');
  const collection=lesson.slides.find(s=>s.activities.includes(a)).exampleCollections[0];assert.ok(collection.members.includes(ex.id));
  check(true,a.id+': concise signed numeric solution, stable collection membership and no caution/helper variables');check(true,a.id+': exhaustive optional candidates, selected row, every algebraic equality, expansion and conclusion verified');continue;
 }
 const order=['target','generate','compare','verify','factor-0','check'].map(s=>ex.steps.findIndex(x=>x.id===a.id+'-'+s));
 check(order.every((v,i)=>v>=0&&(!i||v>order[i-1])),a.id+': generate → compare → verify → factorise → expand');
 const first=ex.steps[0].math.replaceAll('−','-');
 assert.equal(Number(first.match(/_m_ × _n_ = (-?\d+)/)[1]),product);assert.equal(Number(first.match(/_m_ \+ _n_ = (-?\d+)/)[1]),b);
 const t=ex.steps[order[2]].visual[0];
 const candidates=t.rows.map(row=>{const [m,n]=row[0].replaceAll('−','-').match(/-?\d+/g).map(Number);assert.equal(m*n,product);assert.equal(Number(row[1].replaceAll('−','-')),product);assert.equal(Number(row[2].replaceAll('−','-')),m+n);return [m,n];});
 const magnitudes=[];for(let d=1;d*d<=Math.abs(product);d++)if(Math.abs(product)%d===0)magnitudes.push([d,Math.abs(product)/d]);
 assert.deepEqual(candidates.map(p=>p.map(Math.abs)),magnitudes);assert.equal(candidates.filter(([m,n])=>m+n===b).length,1);
 const verification=ex.steps[order[3]].math.split('\n');assert.equal(verification.length,2);
 assert.deepEqual(polynomial(verification[0].split('=')[0]),[product]);assert.deepEqual(polynomial(verification[1].split('=')[0]),[b]);
 for(const line of ex.steps[order[1]].math.split('\n')){
  const d=line.match(/^(\d+) ÷ (\d+) = (\d+) → \((\d+), (\d+)\)$/);
  if(d){const [,n,k,q,u,v]=d.map(Number);assert.equal(n,Math.abs(product));assert.equal(n/k,q);assert.equal(u,k);assert.equal(v,q);}
  else{const r=line.match(/^(\d+) = (\d+) × (\d+) \+ (\d+)$/);assert.ok(r);const [,n,k,q,rem]=r.map(Number);assert.equal(n,k*q+rem);assert.ok(rem>0&&rem<k);}
 }
 let algebraLines=0;
 for(const st of ex.steps){
  for(const line of st.math.split('\n')){
   if(line.includes('_x_')){for(const expression of line.split('=').filter(x=>x.trim())){assert.deepEqual(polynomial(expression),expected,a.id+': '+expression);algebraLines++;}}
   else if(line.includes('=')&&!line.includes('→')&&!line.includes('_')){const values=line.split('=').map(polynomial);for(const v of values)assert.deepEqual(v,values[0]);}
  }
 }
 assert.ok(algebraLines>=4);check(true,a.id+': exhaustive candidates, arithmetic, selected pair and every algebraic transformation independently checked');
}
for(const a of activities.filter(a=>a.id.endsWith('completion'))){
 const q=a.questions[0];assert.match(q.stem,/candidate pairs are supplied/i);assert.match(q.stem,/Complete the sums/);
 assert.ok(q.table.rows.every(r=>r.cells[1]===''));assert.ok(!a.workedExamples&&!a.examples);
 assert.ok(!/answer|model|solution/i.test(Object.keys(q).join(',')));check(true,a.id+': supplied candidates, blank sums and no solved counterpart');
}
const plain=s=>s.replaceAll('_x_','x').replaceAll('^2','²');
let guide='# Teacher answers — factorising quadratics\n\nKeep this guide separate from the learner lesson. Equivalent factor orderings are correct. Students should show their chosen pair and factorisation, including splitting and grouping for non-monic quadratics. Detailed searching and expansion are optional support unless a task explicitly requests them; an answer alone does not demonstrate the method.\n\n## Guided completion\n\nMonic: the sums are 16 and 8. Select 3 and 5: x² + 8x + 15 = (x + 3)(x + 5).\n\nNon-monic: a = 2, b = 9, c = 10, so ac = 20. The sums are 21, 12 and 9. Select 4 and 5. One valid chain is 2x² + 9x + 10 = 2x² + 4x + 5x + 10 = 2x(x + 2) + 5(x + 2) = (2x + 5)(x + 2).\n\n## Independent practice\n';
for(const [id,answers]of Object.entries(keys)){
 const q=questions.find(q=>q.id===id);assert.ok(q);assert.equal(q.parts.length,answers.length);
 guide+='\n### '+id.replaceAll('-',' ')+'\n\n';
 for(let i=0;i<answers.length;i++){assert.deepEqual(polynomial(q.parts[i]),polynomial(answers[i]),id+' part '+i);guide+=String.fromCharCode(97+i)+'. '+plain(q.parts[i])+' = '+plain(answers[i])+'\n\n';}
 check(true,id+': all '+answers.length+' practice factors expand to the actual questions');
}
const pureQuestions=questions.filter(q=>q.parts?.every(p=>/^[-−\d_x_+ ^]+$/.test(p)));assert.equal(pureQuestions.length,Object.keys(keys).length);
const guided=[['monic-completion','_x_^2 + 8_x_ + 15','(_x_ + 3)(_x_ + 5)'],['nonmonic-completion','2_x_^2 + 9_x_ + 10','(2_x_ + 5)(_x_ + 2)']];
for(const [id,expression,factors]of guided){assert.ok(activities.find(a=>a.id===id).questions[0].stem.includes(expression));assert.deepEqual(polynomial(expression),polynomial(factors));}
for(const [id,expression,wrong,correct]of [
 ['monic-practice-explain','_x_^2 − _x_ − 12','(_x_ − 3)(_x_ + 4)','(_x_ − 4)(_x_ + 3)'],
 ['nonmonic-practice-explain','3_x_^2 + 8_x_ + 4','(3_x_ + 4)(_x_ + 1)','(3_x_ + 2)(_x_ + 2)']
]){const stem=questions.find(q=>q.id===id).stem;assert.ok(stem.includes(expression)&&stem.includes(wrong));const original=polynomial(expression),bad=polynomial(wrong);assert.notEqual(bad[1],original[1]);assert.equal(bad[0],original[0]);assert.equal(bad[2],original[2]);assert.deepEqual(polynomial(correct),original);guide+='\n### '+id.replaceAll('-',' ')+'\n\nThe proposed product has linear coefficient '+bad[1]+' instead of '+original[1]+'. Correct factorisation: '+plain(correct)+'.\n';}
for(const [id,area,width,length,x,unit]of [
 ['monic-practice-area','_x_^2 + 10_x_ + 21','_x_ + 3','_x_ + 7',2,'cm'],
 ['nonmonic-practice-area','2_x_^2 + 7_x_ + 6','_x_ + 2','2_x_ + 3',3,'m']
]){
 const question=questions.find(q=>q.id===id),stem=question.stem;assert.ok(stem.includes(area)&&stem.includes(width)&&stem.includes(unit+'²')&&stem.includes('_x_ > 0'));assert.ok(question.parts.at(-1).includes('_x_ = '+x));
 assert.deepEqual(multiply(polynomial(width),polynomial(length)),polynomial(area));
 const value=p=>p.reduce((v,c,i)=>v+c*x**i,0),w=value(polynomial(width)),l=value(polynomial(length)),perimeter=2*(w+l);
 assert.ok(w>0&&l>0);assert.equal(w*l,value(polynomial(area)));check(true,id+': area factors, positive dimensions and perimeter derived with consistent length units');
 guide+='\n### '+id.replaceAll('-',' ')+'\n\nArea = ('+plain(width)+')('+plain(length)+') '+unit+'². Length = ('+plain(length)+') '+unit+'. At x = '+x+', width = '+w+' '+unit+' and length = '+l+' '+unit+', so perimeter = 2('+w+' + '+l+') = '+perimeter+' '+unit+'.\n';
}
check(true,'Guided answers and error-analysis corrections expand correctly; teacher answers are separate from learner data');
if(process.argv.includes('--write-guide'))fs.writeFileSync(root+'/TEACHER-ANSWERS.md',guide);
else assert.equal(fs.readFileSync(root+'/TEACHER-ANSWERS.md','utf8'),guide,'Teacher answer guide matches verified calculations');
const out=process.env.FACTORISING_OUT||(process.env.PLAYER_REVIEW_DIR?process.env.PLAYER_REVIEW_DIR+'/factorising':'review-delivery/factorising-verification');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/content-results.json',JSON.stringify({lessonSha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),checks,limit:'Arithmetic and schema checks supplement human reading of the explanations and classroom suitability.'},null,2)+'\n');
console.log(checks.length+' content checks passed');
