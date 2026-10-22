/* Author-time generation and reusable artwork. No questions are generated during learner rendering. */
globalThis.MathMicro=(()=>{
  const packs=[['mathematics/algebra/general','Algebra · structures'],['mathematics/algebra/signs','Algebra · reflections'],['mathematics/algebra/factorisation','Algebra · factors']];
  const families=[['reverse','Reverse a bracket'],['factor','Factor first'],['opposite','Opposite denominators']];
  const math=s=>'$'+s+'$',frac=(n,d)=>'\\frac{'+n+'}{'+d+'}';
  const signed=(n,term='')=>n===0?'':(n<0?' - ':' + ')+(Math.abs(n)===1&&term?'':Math.abs(n))+term;
  const poly=(r,s)=>'x^2'+signed(-(r+s),'x')+signed(r*s);
  const linear=n=>'x'+signed(-n);
  const mul=(k,s)=>k===1?s:k+'('+s+')';
  /** Generate a stable prefix of realised questions; regeneration is an explicit author action. */
  function generate(family,counts,archetypeId){
    if(!families.some(([id])=>id===family))throw Error('Choose a supported rational-expression family.');
    if(typeof archetypeId!=='string'||!archetypeId.trim())throw Error('A stable example id is required.');
    const qs=[];
    for(const level of ['basic','moderate']){
      const count=counts?.[level];if(!Number.isInteger(count)||count<0||count>24)throw Error('Question counts must be whole numbers from 0 to 24.');
      for(let i=0;i<count;i++){
        let expression,answer,working,proof;
        if(family==='reverse'){
          const pairs=[['a','b'],['x','5'],['p','q'],['y','3'],['m','n'],['t','7'],['u','v'],['z','4']];
          const [a,b]=pairs[i%pairs.length],k=level==='basic'?1+Math.floor(i/8):4+Math.floor(i/4),d=level==='basic'?1:1+i%2;
          const top=b+'-'+a,bottom=a+'-'+b;
          expression=frac(mul(k,top),mul(d,bottom));answer=k%d===0?String(-k/d):'-'+frac(String(k),String(d));
          working=[math(top+'=-('+bottom+')'),math(expression+'=-'+frac(mul(k,bottom),mul(d,bottom))),math('='+answer),math(bottom+'\\ne0')].join('\n');
          proof={family,a,b,k,d};
        }else if(family==='factor'){
          const pairs=[[2,3],[1,4],[3,5],[2,5],[1,6],[4,7],[3,8],[5,9]];
          const r=level==='moderate'?i+2:pairs[i%8][0]+Math.floor(i/8)*2,s=level==='moderate'?i+3:pairs[i%8][1]+Math.floor(i/8)*3;
          const square=level==='moderate'&&i%2===1,other=square?-r:level==='moderate'?-s:s;
          const top=poly(r,other),den=r+'-x';expression=frac(top,den);answer='-('+linear(other)+')';
          working=[math(top+'=('+linear(r)+')('+linear(other)+')'),math(den+'=-('+linear(r)+')'),math(expression+'=-('+linear(other)+')'),math('x\\ne'+r)].join('\n');
          proof={family,r,s:other};
        }else{
          const pairs=[['a','b'],['x','y'],['p','q'],['m','n']], [a,b]=pairs[i%4];
          const p=level==='basic'?1+Math.floor(i/4):3+Math.floor(i/4),q=level==='basic'?1:2+i%3,subtract=i%2===0;
          const d=a+'-'+b,rev=b+'-'+a,n=p+(subtract?q:-q);
          expression=frac(String(p),d)+(subtract?' - ':' + ')+frac(String(q),rev);
          answer=n===0?'0':frac(String(n),d);
          working=[math(rev+'=-('+d+')'),math(expression+'='+frac(String(p),d)+(subtract?' + ':' - ')+frac(String(q),d)),math('='+answer),math(a+'\\ne '+b)].join('\n');
          proof={family,a,b,p,q,subtract};
        }
        qs.push({id:archetypeId+'-'+level+'-'+(i+1),archetypeId,level,presentation:'compact',stem:math(expression),answer:math(answer),workedAnswer:working,generation:proof});
      }
    }
    if(new Set(qs.map(q=>q.stem)).size!==qs.length)throw Error('Generated questions must have distinct stems.');
    return qs;
  }
  /** Compatibility adapter; Mathematics generation stays independent of artwork lookup. */
  function image(pack,role){return ArtworkPacks.image(pack,role);}
  /** Lint only recognised generated rational families; never rewrite arbitrary prose. */
  function lint(question){
    if(!families.some(([id])=>id===question.generation?.family))return;
    for(const key of ['stem','answer','workedAnswer'])if(typeof question[key]==='string'&&question[key].includes('/'))throw Error('Generated rational expressions need stacked fraction notation in '+key+'.');
    if(!/\$[^$]*\\frac\{/.test(question.stem))throw Error('Generated rational question needs an explicit math fraction.');
  }
  return {packs,families,generate,image,lint};
})();
