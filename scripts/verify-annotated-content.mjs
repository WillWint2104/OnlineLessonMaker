// Independent arithmetic and polynomial checks of the authored examples, separate from layout.
import fs from 'node:fs';import assert from 'node:assert/strict';
const root='docs/review/annotated-solutions/',lesson=JSON.parse(fs.readFileSync(root+'factorising.json')),physics=JSON.parse(fs.readFileSync(root+'physics.json')),checks=[];
const check=(v,m)=>{assert.ok(v,m);checks.push(m);};
// Tiny polynomial arithmetic used only by this test, not a factoring solver or application dependency.
const add=(a,b)=>Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||0)+(b[i]||0));
const mul=(a,b)=>{const c=Array(a.length+b.length-1).fill(0);a.forEach((x,i)=>b.forEach((y,j)=>c[i+j]+=x*y));return c;};
function polynomial(source){
 const s=source.replaceAll('_x_','x').replaceAll('−','-').replaceAll('×','*').replace(/\s/g,'');const tokens=s.match(/\d+|x|[()+*^\-]/g)||[];assert.equal(tokens.join(''),s,'Unsupported test expression '+source);let i=0;
 const atom=()=>{let a;if(tokens[i]==='-'){i++;return mul([-1],atom());}if(tokens[i]==='+'){i++;return atom();}if(tokens[i]==='('){i++;a=sum();assert.equal(tokens[i++],')');}else if(tokens[i]==='x'){i++;a=[0,1];}else{assert.match(tokens[i]||'',/^\d+$/);a=[+tokens[i++]];}if(tokens[i]==='^'){i++;const n=+tokens[i++];assert.ok(Number.isInteger(n)&&n>=0&&n<=4);const base=a;a=[1];for(let k=0;k<n;k++)a=mul(a,base);}return a;};
 const product=()=>{let a=atom();while(tokens[i]==='*'||tokens[i]==='('||tokens[i]==='x'||/^\d+$/.test(tokens[i]||'')){if(tokens[i]==='*')i++;a=mul(a,atom());}return a;};
 const sum=()=>{let a=product();while(tokens[i]==='+'||tokens[i]==='-'){const sign=tokens[i++]==='+'?1:-1;a=add(a,mul([sign],product()));}return a;};
 const result=sum();assert.equal(i,tokens.length);while(result.length>1&&result.at(-1)===0)result.pop();return result;
}
const examples=lesson.slides.flatMap(s=>s.activities.flatMap(a=>(a.workedExamples||[]).flatMap(g=>g.examples)));
for(const [ex,expected,product,sum]of [[examples[0],[12,7,1],12,7],[examples[1],[-20,1,1],-20,1],[examples[2],[3,-11,6],18,-11]]){
 const candidates=ex.steps.flatMap(s=>s.visual||[]).find(p=>p.kind==='table');assert.ok(candidates);
 const pairs=candidates.rows.map(row=>{const [a,b]=row[0].replaceAll('−','-').match(/-?\d+/g).map(Number);assert.equal(a*b,product);assert.equal(a+b,Number(row[2].replaceAll('−','-')));assert.equal(a*b,Number(row[1].replaceAll('−','-')));return [a,b];});
 const magnitudes=[];for(let d=1;d*d<=Math.abs(product);d++)if(Math.abs(product)%d===0)magnitudes.push([d,Math.abs(product)/d]);assert.deepEqual(pairs.map(p=>p.map(Math.abs)),magnitudes);assert.equal(pairs.filter(([a,b])=>a+b===sum).length,1);checks.push(ex.id+': all distinct candidates, products, sums and selected pair checked arithmetically');
 let count=0;for(const step of ex.steps)for(const line of step.math.split('\n')){if(!line.includes('_x_'))continue;for(const expression of line.split('=').filter(x=>x.trim())){assert.deepEqual(polynomial(expression),expected,ex.id+': '+expression);count++;}}
 check(count>=4,ex.id+': every authored algebraic transformation and expansion has the original polynomial coefficients');
}
const e=physics.slides[0].activities[0].workedExamples[0].examples[0],rows=e.visual[0].rows.map(r=>r.map(Number));assert.deepEqual(rows,[[0,0],[1,3],[2,6],[3,9],[4,12]]);
const distance={value:rows.at(-1)[1],dimensions:[1,0]},time={value:rows.at(-1)[0]-rows[0][0],dimensions:[0,1]},speed={value:distance.value/time.value,dimensions:distance.dimensions.map((n,i)=>n-time.dimensions[i])};assert.deepEqual(speed,{value:3,dimensions:[1,-1]});checks.push('Synthetic cumulative-distance measurements give 12 metres / 4 seconds = 3 metres per second (length × time⁻¹)');
// Parse the authored quantities, then compare their numeric values and dimensions with the measurements.
const quantity=text=>{const match=text.trim().match(/^(\d+(?:\.\d+)?)\s+(m|s)(?:\/(m|s))?$/);assert.ok(match,'Supported quantity: '+text);const units={m:[1,0],s:[0,1]},num=units[match[2]],den=units[match[3]]||[0,0];return {value:+match[1],dimensions:num.map((n,i)=>n-den[i])};};
const substitution=e.steps.find(s=>s.id==='motion-substitution').math.split('\n'),fractions=substitution[0].split('=')[1].trim().split('/');
assert.deepEqual(quantity(fractions[0].replace(/[()]/g,'')),distance);assert.deepEqual(quantity(fractions[1].replace(/[()]/g,'')),time);assert.deepEqual(quantity(substitution[1].replace(/^\s*=\s*/,'')),speed);checks.push('Authored substitution and result carry the measured values and the derived speed dimensions');
const out=process.env.PLAYER_REVIEW_DIR||'review-delivery/annotated';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/content-results.json',JSON.stringify({checks,manualReview:'Read the paired explanations as well: distance is not displacement; interval averages do not establish instantaneous speed. Numeric/dimensional checks alone cannot validate pedagogy.'},null,2));console.log(checks.join('\n'));
