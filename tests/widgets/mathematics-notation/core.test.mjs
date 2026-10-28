import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';
await import('../../../src/mathematics/question-display/core.js');
const app=fs.readFileSync('lesson-studio.html','utf8'),parser=fs.readFileSync('src/mathematics/notation/parser.js','utf8'),baseline=JSON.parse(fs.readFileSync('tests/widgets/mathematics-notation/baseline-trees.json','utf8'));
function engine(source,prelude=''){const a=source.indexOf('const TPMath=(function(){'),b=source.indexOf('/* engine-level aliases',a),box=vm.createContext({});assert.ok(a>=0&&b>a);vm.runInContext(prelude+'\n'+source.slice(a,b)+'\nglobalThis.engine=TPMath;',box);return box.engine;}
const E=engine(app,parser),M=globalThis.MathDisplay,plain=x=>JSON.parse(JSON.stringify(x)),values=row=>row.filter(n=>n.t==='ch').map(n=>n.v).join('');
test('Existing supported lesson-fixture mathematical spans retain baseline trees',()=>{
  const files=fs.readdirSync('tests',{recursive:true}).filter(f=>f.endsWith('.json')&&!f.split(path.sep).join('/').startsWith('widgets/mathematics-notation/')).map(f=>'tests/'+f);
  let count=0;
  function walk(v){if(typeof v==='string'){for(const {math} of M.spans(v).spans){if(M.diagnoseMath(math,baseline.syntax).length||!Object.hasOwn(baseline.trees,math))continue;assert.deepEqual(plain(E.tree(math)),baseline.trees[math],math);count++;}}else if(v&&typeof v==='object')Object.values(v).forEach(walk);}
  for(const file of files){const lesson=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(lesson.slides))walk(lesson);}
  assert.ok(count>100,'A real existing lesson-fixture corpus was compared: '+count);
});
const legacy=['x^2+1','x_{n+1}','\\frac{1}{2}','\\frac{\\frac12}{3}','\\sqrt[3]{-8}','\\sin\\left(x\\right)','\\cos(x)','\\frac{d^2y}{dx^2}','\\left(2x+1\\right)^2','a\\le b','15\\%','\\{x\\in R\\}','(x-2)^2','\\left. x\\right.'];
for(const s of legacy)test('Baseline tree retained: '+s,()=>assert.deepEqual(plain(E.tree(s)),baseline.trees[s]));
for(const [s,op,lo,hi] of [['\\sum_{k=1}^{5}k^2','∑','k=1','5'],['\\prod^{4}_{k=1}k','∏','k=1','4'],['\\int_0^2 x\\,dx','∫','0','2'],['\\int 2x\\,dx','∫','',''],['\\int_{-2}^{3}(x+1)\\,dx','∫','−2','3']])test('Operator bounds: '+s,()=>{const n=E.tree(s)[0];assert.equal(n.t,'large');assert.equal(n.op,op);assert.equal(values(n.lo),lo);assert.equal(values(n.hi),hi);assert.deepEqual(M.diagnoseMath(s,E.syntax),[]);});
for(const s of ['\\lim_{x\\to3}\\frac{x^2-9}{x-3}','\\lim_{x\\to0^{+}}\\frac1x','\\lim_{x\\to0^{-}}\\frac1x','\\lim_{n\\to\\infty}\\frac1n'])test('Real limit node: '+s,()=>{const n=E.tree(s)[0];assert.equal(n.t,'lim');assert.ok(n.under.some(n=>n.v==='→'));assert.deepEqual(M.diagnoseMath(s,E.syntax),[]);});
test('One-sided marker belongs to target inside approach',()=>{const n=E.tree('\\lim_{x\\to0^{+}}\\frac1x')[0];assert.equal(n.under.at(-1).t,'sup');assert.equal(values(n.under.at(-1).exp),'+');});
test('Integral body owns the integrand and differential, leaving equality outside',()=>{
  const tree=E.tree('\\int_0^2 x\\,dx=2');assert.equal(values(tree[0].body),'x\u2009dx');assert.equal(values(tree.slice(1)),'=2');
});
test('Limit body owns its nested fraction',()=>{
  const tree=E.tree('\\lim_{x\\to3}\\frac{x^2-9}{x-3}=6');assert.equal(tree[0].body[0].t,'frac');assert.equal(values(tree.slice(1)),'=6');
});
for(const s of ['\\int_0^1\\,','\\int_0^1{\\,}','\\sum_{i=1}^n\\,\\,','\\prod_{i=1}^n()','\\lim_{x\\to0}\\,','\\int_0^1\\'])test('Empty or spacing-only body is invalid: '+s,()=>{
  assert.ok(M.diagnoseMath(s,E.syntax).some(e=>e.message.includes('following')));assert.throws(()=>E.tree(s),{name:'SyntaxError'});
});
test('Spacing followed by mathematical content is valid',()=>{
  const tree=E.tree('\\int_0^1\\,x');assert.equal(values(tree[0].body),'\u2009x');assert.deepEqual(M.diagnoseMath('\\int_0^1\\,x',E.syntax),[]);
});
for(const body of ['+','-','\\pm','\\times','\\div','\\cdot','.','(+)','{−}','\\sqrt{+}','\\frac{+}{-}','{^2}','{_i}'])test('Punctuation without a value is not an integrand: '+body,()=>{
  const s='\\int_0^1 '+body;assert.ok(M.diagnoseMath(s,E.syntax).some(e=>e.message.includes('following')));assert.throws(()=>E.tree(s),{name:'SyntaxError'});
});
for(const name of ['le','leq','ge','geq','ne','neq','approx','equiv'])test('Escaped relation preserves the operator-body boundary: '+name,()=>{
  const bad='\\int_0^1\\'+name+'2';assert.ok(M.diagnoseMath(bad,E.syntax).some(e=>e.message.includes('following')));assert.throws(()=>E.tree(bad),{name:'SyntaxError'});
  const good='\\sum_{k=1}^{5}k\\'+name+'2',tree=E.tree(good);assert.equal(values(tree[0].body),'k');assert.equal(tree.length,3);assert.deepEqual(M.diagnoseMath(good,E.syntax),[]);
});
for(const body of ['0','-1','\\infty','\\pi','\\sqrt{2}','\\frac{1}{2}','\\sin(x)','(x+1)','x^2'])test('A real value or expression remains a valid integrand: '+body,()=>{
  const s='\\int_0^1 '+body;assert.ok(E.tree(s)[0].body.length);assert.deepEqual(M.diagnoseMath(s,E.syntax),[]);
});
for(const s of ['\\int_{+}^1 x','\\int_0^{+}x','\\sum_{+}^{5}x','\\prod_1^{-}x','\\lim_{x\\to+}x','\\lim_{+\\to0}x','\\int_0^1\\sqrt[3]{+}','\\int_0^1\\frac{x}{+}','\\int_0^1\\sin(+)'])test('Modifiers and signs cannot supply a missing mathematical value: '+s,()=>{
  assert.ok(M.diagnoseMath(s,E.syntax).length);assert.throws(()=>E.tree(s),{name:'SyntaxError'});
});
test('Parenthesised complete limit approach remains valid',()=>assert.deepEqual(M.diagnoseMath('\\lim_{(x\\to0)}x',E.syntax),[]));

for(const approach of ['(\\to0)+x','(x\\to)+0','\\frac{\\to0}{x}+x','\\frac{x\\to}{2}+0','x^{\\to0}+x','x^{x\\to}+0','\\sqrt{\\to0}+x','\\sqrt{x\\to}+0','\\sqrt[\\to0]{x}+x','x_{x\\to}+0','((\\to0))+x'])test('Limit arrow operands must exist in their own nested row: '+approach,()=>{
  const s='\\lim_{'+approach+'}x',errors=M.diagnoseMath(s,E.syntax);assert.ok(errors.some(e=>e.message.includes('mathematical target')&&e.offset===1));assert.throws(()=>E.tree(s),{name:'SyntaxError'});
});
for(const approach of ['(x\\to0)+x','\\frac{x\\to0}{2}','x^{n\\to0}','\\sqrt{x\\to0}','((x\\to0))'])test('Complete nested limit approach retains its local operands: '+approach,()=>assert.deepEqual(M.diagnoseMath('\\lim_{'+approach+'}x',E.syntax),[]));

for(const s of ['\\sin\\left(\\right)','\\sin( )','\\sin(\\,)','\\sin\\left(\\,\\right)','\\sin(\\cos\\left(\\right))','\\frac{\\left.\\right.}{2}','\\frac{1}{\\left.\\,\\right.}'])test('Decorators and spacing cannot supply an empty mathematical group: '+s,()=>assert.ok(M.diagnoseMath(s,E.syntax).some(e=>e.message.includes('Empty mathematical'))));
for(const s of ['\\sin\\left(0\\right)','\\sin\\left(\\frac{1}{2}\\right)','\\sin(\\cos\\left(x\\right))'])test('Existing decorated function with a real argument remains valid: '+s,()=>assert.deepEqual(M.diagnoseMath(s,E.syntax),[]));

for(const operator of ['\\sum_{i=1}^{2}i','\\prod_{i=1}^{2}i','\\int_0^1 x\\,dx','\\int x\\,dx','\\lim_{x\\to0}x'])test('Whole operator closure and following siblings survive nested serialization: '+operator,()=>{
  for(const suffix of ['+3','-y','=3','^2','_{n}','\\le2','\\times x','+\\int_0^1 t\\,dt'])for(const wrap of [s=>s,s=>'\\frac{'+s+'}{2}',s=>'('+s+')',s=>'\\sum_{j=1}^{3}('+s+')']){
    const source=wrap('{'+operator+'}'+suffix),tree=E.tree(source),latex=E.latex(tree);assert.deepEqual(M.diagnoseMath(latex,E.syntax),[],source);assert.deepEqual(plain(E.tree(latex)),plain(tree),source+' -> '+latex);assert.equal(E.latex(latex),latex,source);
  }
});
for(const body of ['\\theta x','\\pi x','\\alpha y','2\\pi x','\\sin(x)\\times x'])test('Existing command separators survive integral serialization: '+body,()=>{
  const source='\\int '+body+'\\,dx',tree=E.tree(source),latex=E.latex(tree);assert.deepEqual(plain(E.tree(latex)),plain(tree));assert.deepEqual(M.diagnoseMath(latex,E.syntax),[]);
});
test('Nested sums keep distinct bounds',()=>{const tree=E.tree('\\sum_{i=1}^{3}(\\sum_{j=1}^{i}j)');assert.equal(tree[0].t,'large');assert.equal(tree[0].body[0].t,'fence');assert.equal(values(tree[0].body[0].body[0].hi),'i');});
for(const s of ['\\int_0^1 x\\,dx','\\int 2x\\,dx','\\sum_{k=1}^{5}k^2','\\prod_{k=1}^{4}k','\\lim_{x\\to0^{+}}\\frac1x','\\frac{d^2y}{dx^2}'])test('Canonical serialization is stable: '+s,()=>{const latex=E.latex(s);assert.equal(E.latex(latex),latex);});
test('Thin space is retained as spacing, not comma',()=>{const tree=E.tree('x\\,dx');assert.ok(tree.some(n=>n.v==='\u2009'));assert.ok(!tree.some(n=>n.v===','));assert.equal(E.latex(tree),'x\\,dx');});
for(const s of ['\\int x\\,dx','\\int x^2\\,dx','\\int f(x)\\,dx','\\int \\theta\\,d\\theta','\\int \\sin(x)\\,dx'])test('Unbounded integral command survives serialization: '+s,()=>{
  const latex=E.latex(s),tree=E.tree(latex);assert.equal(tree[0].t,'large');assert.equal(tree[0].op,'∫');assert.ok(tree[0].body.length);assert.equal(E.latex(latex),latex);assert.deepEqual(M.diagnoseMath(latex,E.syntax),[]);
});
test('Existing Type unbounded operator followed by a sibling variable keeps its command boundary',()=>{
  const latex=E.latex([E.N.large('∫'),E.N.ch('x')]);assert.ok(latex.startsWith('\\int '));assert.equal(values(E.tree(latex)[0].body),'x');
});
for(const s of ['\\sum','\\sum_{k=1} k','\\prod^4 k','\\int_0 x','\\int^2 x','\\int_{}^2 x','\\int_^2 x','\\sum_{i=1}_{j=1}^{5}i','\\prod_{i=1}^{3}^{4}i','\\lim x','\\lim_{} x','\\lim_{x=0}x','\\lim_{\\to0}x','\\lim_{x\\to}x','\\lim_{x\\to0}^{2}x','\\sum_{i=1}^{5}','\\int_0^1=2','x\\;dx'])test('Operator publication error: '+s,()=>{const errors=M.diagnoseMath(s,E.syntax);assert.ok(errors.length,s);assert.ok(errors.every(e=>e.offset>=1&&e.message));assert.throws(()=>E.tree(s));});
for(const s of ['\\int_{0}^{1}\\frac{x}{2','\\sum_{i=1}^{5}\\frac1{}','\\begin{pmatrix}1&2\\end{pmatrix}','\\vec{x}','\\limsup_{n\\to\\infty}x','\\operatorname{foo}(x)','x$$y'])test('Generic invalid/unsupported remains diagnosed: '+s,()=>assert.ok(M.diagnoseMath(s,E.syntax).length));
test('Original source offset survives left/right normalization',()=>{const s='\\left( x+\\sum_i x\\right)';const e=M.diagnoseMath(s,E.syntax).find(e=>e.message.includes('lower and upper'));assert.equal(e.offset,s.indexOf('\\sum')+1);});
for(const s of ['\\sum_{i=1}^{5}i','\\int_0^1x','\\lim_{x\\to0}x','\\frac{1}{\\sum_{i=1}^{5}i}'])test('No silently fabricated numerical result: '+s,()=>{const c=E.compile(s);assert.ok(c.error.includes('display-only'));assert.ok(Number.isNaN(c.eval(2)));});
test('Existing matrix AST cannot silently evaluate its neighbours',()=>{const c=E.compile([E.N.matrix(),E.N.ch('2')]);assert.ok(c.error);assert.ok(Number.isNaN(c.eval(1)));});
for(const [s,x,expected] of [['2x+1',2,5],['(x-1)^2',3,4],['\\frac{x}{2}',4,2],['\\sin(0)',0,0]])test('Scalar evaluator retained: '+s,()=>{const c=E.compile(s);assert.equal(c.error,null);assert.equal(c.eval(x),expected);});
test('Independent mathematics, not parser evaluation',()=>{const F=x=>x*x/2;assert.equal(F(2)-F(0),2);assert.equal(Array.from({length:5},(_,i)=>(i+1)**2).reduce((a,b)=>a+b,0),55);assert.equal([1,2,3,4].reduce((a,b)=>a*b,1),24);for(const x of [2.99,3.01])assert.ok(Math.abs((x*x-9)/(x-3)-6)<.011);const coefficients=[0,0,0,0,1],derivative=c=>c.slice(1).map((v,i)=>v*(i+1));assert.deepEqual(derivative(derivative(coefficients)),[0,0,12]);});
