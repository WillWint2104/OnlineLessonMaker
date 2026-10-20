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
          const [a,b]=pairs[i%pairs.length],k=level==='basic'?1+Math.floor(i/8):2+Math.floor(i/4),d=level==='basic'?1:1+i%2;
          const top=b+'-'+a,bottom=a+'-'+b;
          expression=frac(mul(k,top),mul(d,bottom));answer=k%d===0?String(-k/d):'-'+frac(String(k),String(d));
          working=[math(top+'=-('+bottom+')'),math(expression+'=-'+frac(mul(k,bottom),mul(d,bottom))),math('='+answer),math(bottom+'\\ne0')].join('\n');
          proof={family,a,b,k,d};
        }else if(family==='factor'){
          const pairs=[[2,3],[1,4],[3,5],[2,5],[1,6],[4,7],[3,8],[5,9]];
          const r=pairs[i%8][0]+Math.floor(i/8)*2,s=pairs[i%8][1]+Math.floor(i/8)*3,square=level==='moderate'&&i%2===1,other=square?-r:s;
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
    return qs;
  }
  /** Decorative local SVGs are generated from a finite pack/role catalogue; no formula or answer text. */
  function image(pack,role){
    const variant=packs.findIndex(([id])=>id===pack);if(variant<0)return null;
    const phase={overview:0,outcomes:1,completion:2}[role];if(phase==null)return null;
    const shapes=Array.from({length:6},(_,i)=>{const x=380+i*78,y=350-(i%3)*70-phase*20;
      return variant===1?`<path d="M${x} ${y}l70 -110v210l-70 110z" fill="${i%2?'#087c70':'#9edfcc'}" opacity=".75"/>`:variant===2?`<rect x="${x}" y="${y}" width="65" height="${100+i*16}" rx="5" fill="${i%2?'#0a8275':'#9edfcc'}"/>`:`<path d="M${x} ${y}l50 -25 50 25v100l-50 25-50-25z" fill="${i%2?'#159a86':'#b0e9d7'}"/>`;}).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><defs><linearGradient id="bg"><stop stop-color="#f7fffc"/><stop offset="1" stop-color="#c9eee1"/></linearGradient><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#329c89" stroke-opacity=".12"/></pattern></defs><rect width="960" height="600" fill="url(#bg)"/><rect width="960" height="600" fill="url(#grid)"/><circle cx="710" cy="230" r="180" fill="none" stroke="#148b78" stroke-dasharray="6 9" opacity=".3"/>${shapes}<path d="M280 520L900 130" stroke="#0a8275" stroke-opacity=".2" fill="none"/><circle cx="820" cy="100" r="7" fill="#087c70"/></svg>`;
    return {src:'data:image/svg+xml;base64,'+btoa(svg),alt:'',fit:'cover',focus:{x:.68,y:.5}};
  }
  /** Lint only recognised generated rational families; never rewrite arbitrary prose. */
  function lint(question){
    if(!families.some(([id])=>id===question.generation?.family))return;
    for(const key of ['stem','answer','workedAnswer'])if(typeof question[key]==='string'&&question[key].includes('/'))throw Error('Generated rational expressions need stacked fraction notation in '+key+'.');
    if(!/\$[^$]*\\frac\{/.test(question.stem))throw Error('Generated rational question needs an explicit math fraction.');
  }
  return {packs,families,generate,image,lint};
})();
