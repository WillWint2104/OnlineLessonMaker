/* Pure question-display data helpers. No DOM, response state, storage or independent renderer. */
globalThis.MathDisplay = (() => {
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k), record=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
  const lf=s=>String(s).replace(/\r\n/g,'\n');
  function outerRelation(s){
    if(typeof s!=='string')return null;
    const stack=[];let bar=false;
    for(let i=0;i<s.length;i++){
      let c=s[i];
      if(c==='\\'){
        const token=/^\\([A-Za-z]+|.)/.exec(s.slice(i));if(!token)return null;
        const rel={le:'≤',leq:'≤',ge:'≥',geq:'≥',ne:'≠',neq:'≠'}[token[1]];
        if(rel&&!stack.length&&!bar)return {at:i,length:token[0].length,relation:rel};
        if(['{','(','['].includes(token[1]))stack.push(token[1]);
        if(['}',')',']'].includes(token[1])&&stack.pop()!==({'}':'{',')':'(',']':'['}[token[1]]))return null;
        i+=token[0].length-1;continue;
      }
      if(c==='|'){if(s[i+1]==='|')return null;bar=!bar;continue;}
      if('{(['.includes(c))stack.push(c);
      else if('})]'.includes(c)){if(stack.pop()!==({'}':'{',')':'(',']':'['}[c]))return null;}
      else if(!stack.length&&!bar&&'=<>≤≥≠'.includes(c))return {at:i,length:1,relation:c};
    }return null;
  }
  function diagnoseMath(value,syntax){
    const s=String(value),errors=[],commands=new Set(syntax.commands),functions=new Set(syntax.functions);let i=0;
    const error=(offset,message)=>errors.push({offset:offset+1,message});
    const space=()=>{while(/\s/.test(s[i]||'')&&i<s.length)i++;};
    function argument(at){space();if(i>=s.length||'}])'.includes(s[i])){error(at,'Missing mathematical argument.');return;}if(s[i]==='{'){const start=i++;row('}',start);if(i===start+2)error(start,'Empty mathematical argument.');}else if(s[i]==='\\')command();else i++;}
    function command(){const at=i++;if(i>=s.length){error(at,'Incomplete command.');return;}const m=/^[A-Za-z]+/.exec(s.slice(i));if(!m){if(s[i]==='\\')error(at,'Use authored lines, not a multiline TeX command.');i++;return;}const name=m[0];i+=name.length;
      if(!commands.has(name)){error(at,'Unsupported command \\'+name+'.');return;}
      if(name==='frac'){argument(at);argument(at);}
      else if(name==='sqrt'){space();if(s[i]==='['){const start=i++;row(']',start);}argument(at);}
      else if(functions.has(name)){space();if(s[i]==='{'||s[i]==='('){const start=i++,end=s[start]==='{'?'}':')';row(end,start);}else error(at,'Function \\'+name+' needs a grouped argument.');}
    }
    function row(end,start=0){const before=i;while(i<s.length){const c=s[i];if(c===end){i++;if(i===before+1)error(start,'Empty mathematical group.');return;}if('}])'.includes(c)){error(i,'Unmatched closing delimiter.');i++;continue;}if(c==='\\'){command();continue;}if('{(['.includes(c)){const at=i++;row({'{':'}','(':')','[':']'}[c],at);continue;}if(c==='^'||c==='_'){const at=i++;argument(at);continue;}if(c==='$')error(i,'Math-only expressions must not contain dollar delimiters.');i++;}if(end)error(start,'Missing closing '+end+'.');}
    row();return errors;
  }
  function spans(text){const s=String(text),out=[];const adjacent=s.indexOf('$$');if(adjacent>=0)return {spans:out,unclosed:-1,adjacent};let start=-1;for(let i=0;i<s.length;i++){if(s[i]==='\\'){i++;continue;}if(s[i]==='$'){if(start<0)start=i;else{out.push({math:s.slice(start+1,i),offset:start+1});start=-1;}}}return {spans:out,unclosed:start};}
  function fallback(solution){if(!record(solution)||!Array.isArray(solution.steps))return '';return solution.steps.flatMap(s=>record(s)?[typeof s.math==='string'?'$'+s.math+'$':null,typeof s.text==='string'?s.text:null].filter(x=>x!==null):[]).join('\n');}
  function questions(lesson,visit){for(const [i,s]of (lesson.slides||[]).entries()){for(const [j,q]of (s.questions||[]).entries())visit(q,`slides.${i}.questions.${j}`);for(const [j,a]of (s.activities||[]).entries())for(const [k,q]of (a.questions||[]).entries())visit(q,`slides.${i}.activities.${j}.questions.${k}`);}}
  function solutionIssues(value,path,ids=new Set()){
    const errors=[],add=(p,m)=>errors.push({path:p,message:m});if(!record(value)||!Array.isArray(value.steps)||!value.steps.length){add(path,'Structured working needs a non-empty steps array.');return errors;}
    for(const k of Object.keys(value))if(k!=='steps')add(path+'.'+k,'Unsupported structured solution field.');
    const ended=new Set();let group=null;
    value.steps.forEach((s,i)=>{const p=path+'.steps.'+i;if(!record(s)){add(p,'Step must be a record.');return;}for(const k of Object.keys(s))if(!['id','math','text','alignmentGroup'].includes(k))add(p+'.'+k,'Unsupported step field; use one canonical math expression.');
      if(typeof s.id!=='string'||!s.id.trim()||ids.has(s.id))add(p+'.id','Step needs a unique stable ID within its question.');else ids.add(s.id);
      if(s.math==null&&s.text==null)add(p,'Step needs mathematical working or explanatory text.');
      for(const k of ['math','text','alignmentGroup'])if(s[k]!=null&&(typeof s[k]!=='string'||!s[k].trim()))add(p+'.'+k,k+' must be non-empty text.');
      if(typeof s.math==='string'&&/[\n\r$]/.test(s.math))add(p+'.math','Use one math-only expression without outer dollars or newlines.');
      if(s.alignmentGroup!=null&&typeof s.math!=='string')add(p+'.alignmentGroup','Alignment requires a mathematical expression.');
      if(group!==s.alignmentGroup){if(group)ended.add(group);group=s.alignmentGroup;if(group&&ended.has(group))add(p+'.alignmentGroup','Use a new group ID for a separate derivation.');}
    });return errors;
  }
  function issues(lesson,syntax){const out=[],mathLesson=/math/i.test(lesson.meta?.subject||'')||(lesson.slides||[]).some(s=>s.practiceComposition==='micro');
    function scan(v,path,raw=false){if(typeof v!=='string')return;let pieces;if(raw){pieces=[{math:v,offset:0}];}else{const parsed=spans(v);pieces=parsed.spans;if(parsed.adjacent!=null)out.push({path,offset:parsed.adjacent+1,message:'Display-math dollar delimiters are unsupported; use single dollar delimiters.'});if(parsed.unclosed>=0)out.push({path,offset:parsed.unclosed+1,message:'Unclosed mathematical dollar delimiter.'});}
      for(const piece of pieces)for(const e of diagnoseMath(piece.math,syntax))out.push({...e,path,offset:e.offset+piece.offset});}
    function walk(v,path,force=false){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(['id','archetypeId','alignmentGroup','url','src','sourceUrl','href','endpoint','publishableKey','responseMode','type','kind','theme','subject','family','releaseGroup','artworkPack','generation'].includes(k))continue;if(typeof x==='string'){if(k==='math'){const legacy=!path.includes('.workedSolution.steps.')&&!v.alignmentGroup&&!x.includes('$')&&!/\\[A-Za-z]/.test(x);scan(legacy?x.replace(/_([^_\n]+)_/g,'$1'):x,path+'.'+k,!x.includes('$'));}else if(mathLesson||force)scan(x,path+'.'+k);}else walk(x,path+'.'+k,force);}}
    if(mathLesson)walk(lesson,'lesson');
    questions(lesson,(q,path)=>{if(!record(q))return;const ids=new Set();for(const [o,p]of [[q,path],...(q.parts||[]).map((part,i)=>[part,path+'.parts.'+i])])if(record(o)&&own(o,'workedSolution')){const errs=solutionIssues(o.workedSolution,p+'.workedSolution',ids);out.push(...errs);const scope=/^slides\.(\d+)\.activities\.(\d+)\.questions\./.exec(path);if(lesson.meta?.practiceLayout!=='textbook'||!scope||!lesson.slides[+scope[1]].activities[+scope[2]].practiceCollectionId)out.push({path:p,message:'Structured working is supported on textbook practice questions and their parts.'});if(q.graphResponse)out.push({path:p,message:'Graph questions retain their existing graph-answer model; structured ordinary working is not supported there.'});if(!mathLesson)walk(o.workedSolution,p+'.workedSolution',true);if(typeof o.workedAnswer==='string'&&lf(o.workedAnswer)!==lf(fallback(o.workedSolution)))out.push({path:p,message:'Legacy and structured working disagree. Choose which version to keep before publishing.'});}
      if(q.workedSolution&&(q.parts||[]).some(p=>record(p)&&p.workedSolution))out.push({path,message:'Keep structured working at question or part scope, not an overlapping parent aggregate.'});
    });return out;
  }
  function normalize(lesson,syntax){const out=JSON.parse(JSON.stringify(lesson)),notices=[];if(issues(out,syntax).length)return {lesson:out,notices};questions(out,(q,path)=>{for(const [o,p]of [[q,path],...(q.parts||[]).map((part,i)=>[part,path+'.parts.'+i])])if(record(o)&&o.workedSolution&&typeof o.workedAnswer==='string'&&!solutionIssues(o.workedSolution,p).length&&lf(o.workedAnswer)===lf(fallback(o.workedSolution))){delete o.workedAnswer;notices.push(p+': removed redundant generated legacy working.');}});return {lesson:out,notices};}
  return {outerRelation,diagnoseMath,spans,fallback,questions,solutionIssues,issues,normalize};
})();
