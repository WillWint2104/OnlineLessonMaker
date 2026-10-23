/** Review tooling only. Uses the unchanged application's parser/evaluator; not symbolic proof.
 * Self-contained so the identical function can run against TPMath in the real browser. */
export function reviewNumerical({lesson,config={}},runtime){
 const {tree,compile}=runtime||{tree:globalThis.tpMathTree,compile:globalThis.tpMathCompile};
 const minValid=Math.max(16,config.minValid||16),minFraction=Math.max(.6,config.minValidFraction||.6);
 const totals={attempted:0,valid:0,excluded:0,unsupported:0,failed:0};
 const report={...totals,records:[],unverified:[],restrictions:[],questions:0,examples:0,limitation:'Deterministic numerical sampling is not a formal symbolic proof. Domain restrictions constrain samples; their necessity and completeness are not proved.'};
 const covered=new Set(config.coveredNotes||[]),pool=[-101,-27,-7,-2,-.5,0,.5,1,2,7,27,101];
 function samples(variables){const equal=[0,1,-1,2,-2,.5,-.5,27];return Array.from({length:48},(_,i)=>Object.fromEntries(variables.map(v=>{let value;if(i<equal.length)value=equal[i];else{let h=2166136261;for(const ch of v+':'+i){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}value=pool[h%pool.length];}return [v,value];})));}
 const allowedCommands=new Set(['frac','sqrt','left','right','times','cdot','div','sin','cos','tan','ln','log','abs','pi']);
 function parse(text){
  const clean=String(text).replaceAll('$','').trim();
  if(!clean||clean.length>4000||[...clean.matchAll(/\\([a-zA-Z]+)/g)].some(m=>!allowedCommands.has(m[1])))throw Error('Unsupported expression/command');
  // Reject characters the pragmatic renderer might otherwise silently ignore.
  if(/[^0-9a-zA-Z\\{}()[\].+\-*/^\sπ−×÷·]/u.test(clean))throw Error('Unsupported mathematical notation');
  const row=tree(clean),variables=new Set();
  function inspect(nodes){if(!Array.isArray(nodes)||!nodes.length)throw Error('Empty expression');for(const n of nodes){
   if(n.t==='ch'){if(!/^[0-9a-zA-Z.+\-*/π−×÷·]$/u.test(n.v))throw Error('Unsupported mathematical token');if(/^[a-zA-Z]$/.test(n.v)&&n.v!=='e')variables.add(n.v);}
   else if(n.t==='frac'){inspect(n.num);inspect(n.den);}else if(n.t==='sup')inspect(n.exp);
   else if(n.t==='sqrt')inspect(n.rad);else if(n.t==='nroot'){inspect(n.idx);inspect(n.rad);}
   else if(n.t==='fence'){if(!['(','[','|'].includes(n.l))throw Error('Unsupported fence');inspect(n.body);}
   else if(n.t==='fn'){if(!['sin','cos','tan','ln','log','abs'].includes(n.name))throw Error('Unsupported function');inspect(n.arg);}
   else throw Error('Unsupported expression node '+n.t);
  }}inspect(row);return {row,variables:[...variables]};
 }
 function evaluate(parsed,scope){
  function substitute(nodes){return nodes.flatMap(n=>{if(n.t==='ch'&&Object.hasOwn(scope,n.v))return tree('('+scope[n.v]+')');const copy={...n};for(const k of ['num','den','exp','rad','idx','body','arg'])if(Array.isArray(n[k]))copy[k]=substitute(n[k]);return [copy];});}
  const c=compile(substitute(parsed.row,scope));if(c.error)throw Error(c.error);return c.eval(0);
 }
 function item(id,stem,answer,lines,kind){
  const explicit=s=>typeof s==='string'&&/^\$[^$]+\$$/.test(s.trim());
  if(!explicit(stem)||!explicit(answer)){report.unverified.push({id,kind,reason:'Not an explicit mathematical stem/final pair'});return;}
  const pairs=[{left:stem,right:answer,location:'final'}],restrictions=[];
  for(const [i,line]of lines.entries()){
   const location='worked:'+i,key=id+':'+location;
   if(covered.has(key))continue; // Already checked by an explicit pedagogical expectation.
   if(!explicit(line)){if(String(line||'').includes('$')&&!covered.has(key))report.unverified.push({id,location,reason:'Mathematics in explanatory text is outside equality checking',text:line});continue;}
   const terms=line.replaceAll('$','').split('=');
   if(terms.length>1){for(const right of terms.slice(1))pairs.push({left:terms[0].trim()||stem,right,location});}
   else if(/\\(?:neq|ne)(?![a-zA-Z])/.test(line)){const sides=line.replaceAll('$','').split(/\\(?:neq|ne)(?![a-zA-Z])/);if(sides.length===2)restrictions.push({left:sides[0],right:sides[1],location});else report.unverified.push({id,location,reason:'Unsupported domain restriction',text:line});}
   else report.unverified.push({id,location,reason:'Mathematics without an explicit equality',text:line});
  }
  const constraints=[];for(const r of restrictions){try{constraints.push({...r,a:parse(r.left),b:parse(r.right)});report.restrictions.push({id,...r,status:'sample-domain-filter-only'});}catch(e){report.unverified.push({id,...r,reason:e.message});}}
  for(const pair of pairs){const record={id,kind,...pair,...totals,examples:[]};let a,b;
   try{a=parse(pair.left);b=parse(pair.right);}catch(e){record.attempted=48;record.unsupported=48;record.reason=e.message;record.status='unsupported';report.records.push(record);continue;}
   const vars=[...new Set([...a.variables,...b.variables,...constraints.flatMap(r=>[...r.a.variables,...r.b.variables])])].sort();
   for(const scope of samples(vars)){record.attempted++;try{
    if(constraints.some(r=>{const x=evaluate(r.a,scope),y=evaluate(r.b,scope);return !Number.isFinite(x)||!Number.isFinite(y)||x===y;})){record.excluded++;if(record.examples.length<8)record.examples.push({scope,outcome:'excluded',reason:'Authored domain restriction'});continue;}
    const x=evaluate(a,scope),y=evaluate(b,scope);
    if(!Number.isFinite(x)||!Number.isFinite(y)){record.excluded++;if(record.examples.length<8)record.examples.push({scope,outcome:'excluded',reason:'Non-finite evaluation outside expression domain'});continue;}
    record.valid++;if(Math.abs(x-y)>1e-9*Math.max(1,Math.abs(x),Math.abs(y))){record.failed++;if(record.examples.length<8)record.examples.push({scope,left:x,right:y,outcome:'failed'});}
   }catch(e){record.unsupported++;record.reason=e.message;}}
   record.status=record.failed?'invalid':record.unsupported?'unsupported':record.valid<minValid||record.valid/record.attempted<minFraction?'insufficient':'verified-by-sampling';
   record.minimumValid=minValid;record.minimumValidFraction=minFraction;report.records.push(record);
  }
 }
 for(const slide of lesson.slides||[])for(const a of slide.activities||[]){for(const q of a.questions||[]){report.questions++;item(q.id,q.stem,q.answer,String(q.workedAnswer||'').split('\n'),'question');}
  for(const g of a.workedExamples||[])for(const ex of g.examples||[]){report.examples++;item(ex.id,ex.prompt?.match(/\$[^$]+\$/)?.[0],ex.answer,[...(ex.steps||[]),...(ex.support?.steps||[])].map(s=>s.math),'example');}}
 for(const r of report.records)for(const k of Object.keys(totals))report[k]+=r[k];
 report.insufficient=report.records.filter(r=>r.status==='insufficient').length;
 report.checked=report.records.filter(r=>r.kind==='question'&&r.status==='verified-by-sampling').reduce((n,r)=>n+r.valid,0);
 report.exampleComparisons=report.records.filter(r=>r.kind==='example'&&r.status==='verified-by-sampling').reduce((n,r)=>n+r.valid,0);
 // Retain useful report keys from the former reviewer, with explicit reasons rather than silent skips.
 const omitted=kind=>{const entries=[...report.unverified.filter(r=>r.kind===kind||!r.kind&&report.records.some(p=>p.id===r.id&&p.kind===kind)),...report.records.filter(r=>r.kind===kind&&r.status!=='verified-by-sampling').map(r=>({id:r.id,reason:r.reason||r.status}))];return [...new Map(entries.map(r=>[r.id,{id:r.id,reason:r.reason}])).values()];};
 report.skipped=omitted('question');report.skippedExamples=omitted('example');
 report.examplesChecked=new Set(report.records.filter(r=>r.kind==='example'&&!report.skippedExamples.some(s=>s.id===r.id)).map(r=>r.id)).size;
 report.complete=report.records.length>0&&!report.unverified.length&&report.records.every(r=>r.status==='verified-by-sampling');
 return report;
}
