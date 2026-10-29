/* Existing TPMath string grammar, with bounded canonical operator support. No renderer or evaluator. */
globalThis.TPMathNotation=(()=>{
  const operators=['sum','prod','int','lim'];
  const commands=[...operators,'begin','end','vec','overline','mathbb','text','cup','cap','notin'];
  const symbols={cup:'∪',cap:'∩',notin:'∉'},sets={R:'ℝ',Z:'ℤ',Q:'ℚ',N:'ℕ',C:'ℂ'};
  const usesStructures=value=>/\\[{}]/.test(String(value??''))||/\[[^\[\]]*\)|\([^()]*\]/.test(String(value??''))||/\\(?:begin|end|vec|overline|mathbb|text|cup|cap|notin)(?![A-Za-z])/.test(String(value??''))||(/[([]/.test(String(value??''))&&String(value??'').replace(/\\,/g,'').includes(','));
  function run(str,N,CMD,FNS,REL){
    const original=String(str==null?'':str),strict=usesStructures(original),map=[];let s='',last=0,condition=false;
    const literalText=[...original.matchAll(/\\text\s*\{[^{}]*\}/g)].map(m=>[m.index,m.index+m[0].length]);
    for(const match of original.matchAll(/\\(?:left|right)(?![a-zA-Z])\s*\.?/g)){if(literalText.some(([a,b])=>match.index>=a&&match.index<b))continue;for(let j=last;j<match.index;j++){map.push(j);s+=original[j];}last=match.index+match[0].length;}
    for(let j=last;j<original.length;j++){map.push(j);s+=original[j];}map.push(original.length);
    let i=0;const literalBraces=[];const errors=[],error=(at,message)=>errors.push({offset:map[at]+1,message});
    const space=()=>{while(i<s.length&&/\s/.test(s[i]))i++;};
    const hasOperand=row=>row.some(n=>{
      if(Array.isArray(n))return hasOperand(n);
      if(n.t==='ch')return /[\p{L}\p{N}∞]/u.test(n.v);
      if(n.t==='frac')return hasOperand(n.num)&&hasOperand(n.den);
      if(n.t==='sqrt'||n.t==='nroot')return hasOperand(n.rad);
      if(n.t==='fn')return hasOperand(n.arg);
      if(['fence','large','lim'].includes(n.t))return hasOperand(n.body);
      if(n.t==='matrix')return n.rows.some(r=>r.some(hasOperand));
      if(n.t==='acc')return hasOperand(n.base);
      return false;
    });
    function operator(name,at){
      const values={_:null,'^':null},raw={};space();
      while(s[i]==='_'||s[i]==='^'){
        const marker=s[i++],start=i;if(values[marker]!==null)error(i-1,'Duplicate '+(marker==='_'?'lower':'upper')+' limit.');
        space();const from=i;if(i>=s.length||'^_}])'.includes(s[i])){values[marker]=[];raw[marker]='';error(start,'Missing '+(marker==='_'?'lower':'upper')+' limit.');continue;}values[marker]=group();raw[marker]=s.slice(from,i);
        if(!values[marker].length)error(start,'Empty '+(marker==='_'?'lower':'upper')+' limit.');space();
      }
      for(const marker of ['_','^'])if(values[marker]?.length&&!hasOperand(values[marker]))error(at,'Operator limit needs a mathematical value, not punctuation alone.');
      if(name==='lim'){
        if(values._===null||!values._.length)error(at,'Limit needs a nonempty lower approach.');
        if(values['^']!==null)error(at,'A limit approach belongs below lim, without an upper bound.');
        const approach=(raw._||'').replace(/^\{([\s\S]*)\}$/,'$1'),arrows=[...approach.matchAll(/\\(?:to|rightarrow)(?![A-Za-z])|→/g)];
        if(arrows.length!==1||!approach.slice(0,arrows[0]?.index).trim()||!approach.slice((arrows[0]?.index||0)+(arrows[0]?.[0].length||0)).trim())error(at,'Limit approach needs a variable, one arrow and a target.');
        const validateApproach=terms=>{
          const arrow=terms.findIndex(n=>n.t==='ch'&&n.v==='→');
          if(arrow>=0&&(!hasOperand(terms.slice(0,arrow))||!hasOperand(terms.slice(arrow+1))))error(at,'Limit approach needs a variable and a mathematical target.');
          for(const n of terms)if(Array.isArray(n))validateApproach(n);else for(const child of Object.values(n))if(Array.isArray(child))validateApproach(child);
        };
        validateApproach(values._||[]);
      }else if(name==='int'){
        if((values._===null)!==(values['^']===null))error(at,'Integral needs both bounds or neither.');
      }else if(values._===null||values['^']===null)error(at,'Bounded '+name+' needs lower and upper limits.');
      const body=row(null,true);
      if(!hasOperand(body))error(at,'Operator needs a following mathematical expression.');
      return name==='lim'?N.lim(values._||[],body):N.large({sum:'∑',prod:'∏',int:'∫'}[name],values._||[],values['^']||[],body);
    }
    const chNode=c=>N.ch(c==='-'?'−':c);
    function required(at,script=false){space();const start=i;if(i>=s.length||'}])&'.includes(s[i])||s.startsWith('\\end',i)){error(at,'Missing mathematical argument.');return [];}const result=group();if(strict&&(script?!result.some(n=>n.t!=='ch'||n.v.trim()):!hasOperand(result)))error(start,'Empty mathematical argument.');return result;}
    function environment(at){
      space();const match=/^\{([A-Za-z]+)\}/.exec(s.slice(i));if(!match){error(at,'Environment needs a braced name.');return N.matrix([[[]]]);}i+=match[0].length;
      const env=match[1];if(!['pmatrix','vmatrix','cases'].includes(env))error(at,'Unsupported environment '+env+'.');
      const rows=[];let cells=[],closed=false;
      while(i<s.length){
        const wasCondition=condition;condition=env==='cases'&&cells.length===1;
        const cell=row(null,false,true);condition=wasCondition;cells.push(cell);
        if(!hasOperand(cell)&&!(env==='cases'&&cells.length===2&&cell.some(n=>n.t==='text'&&n.value.trim())))error(at,'Environment cells need a nonempty expression'+(env==='cases'?' or condition.':'.'));
        space();
        if(s[i]==='&'){i++;continue;}
        if(s.startsWith('\\\\',i)){i+=2;rows.push(cells);cells=[];continue;}
        if(s.startsWith('\\end',i)){
          const end=/^\\end\s*\{([A-Za-z]+)\}/.exec(s.slice(i));
          if(end){i+=end[0].length;closed=true;if(end[1]!==env)error(at,'Mismatched environment: expected '+env+', found '+end[1]+'.');}else{error(i,'Malformed environment closing command.');i=s.length;}
          break;
        }
        // A malformed cell must not trap the parser at a stray delimiter.
        if(i<s.length){error(i,'Unexpected delimiter in environment.');i++;}else break;
      }
      if(cells.length)rows.push(cells);
      if(!closed)error(at,'Missing closing environment '+env+'.');
      if(env==='cases'&&rows.some(r=>r.length!==2))error(at,'Each cases row needs an expression and a condition.');
      else if(rows.some(r=>r.length!==rows[0].length))error(at,'Matrix rows must have equal column counts.');
      if(env==='vmatrix'&&rows.length!==rows[0]?.length)error(at,'A determinant must be square.');
      const node=N.matrix(rows);if(env!=='pmatrix')node.environment=env;return node;
    }
    function group(){
      while(s[i]===' ')i++;
      if(s[i]==='{'){const at=i++;const r=row('}');if(s[i]==='}')i++;else if(strict)error(at,'Missing closing }.');return r;}
      if(s[i]==='\\'){ const t=[]; cmd(t); return t; }
      if(i<s.length){ return [chNode(s[i++])]; }
      return [];
    }
    function cmd(out){
      const at=i++;                                             /* past backslash */
      if(!/[a-zA-Z]/.test(s[i]||'')){ const c=s[i++];if(strict){if(c==='{')literalBraces.push(at);if(c==='}'&&literalBraces.pop()===undefined)error(at,'Unmatched escaped set brace.');if(c==='\\')error(at,'Row separators belong inside environments.');if(c===undefined)error(at,'Incomplete command.');} if([';',':','!'].includes(c))error(at,'Unsupported spacing command; use \\, for a thin space.');if(c!==undefined) out.push(N.ch(c===','?'\u2009':c)); return; }   /* \{ \$ \, → literal */
      let name=''; while(i<s.length && /[a-zA-Z]/.test(s[i])) name+=s[i++];
      if(operators.includes(name)){out.push(operator(name,at));return;}
      if(name==='begin'){out.push(environment(at));return;}
      if(name==='end'){error(at,'Closing environment without an opening environment.');return;}
      if(name==='vec'||name==='overline'){out.push(N.acc(name==='vec'?'→':'‾',required(at)));return;}
      if(name==='mathbb'){space();const v=/^\{([RZQNC])\}/.exec(s.slice(i));if(!v){error(at,'mathbb requires one supported number-set letter: R, Z, Q, N or C.');if(s[i]==='{')group();return;}i+=v[0].length;out.push(N.ch(sets[v[1]]));return;}
      if(name==='text'){
        space();const v=/^\{([^{}\\$]*)\}/.exec(s.slice(i));
        if(!condition)error(at,'Literal text is supported only in a cases condition.');
        if(!v){error(at,'Text conditions need braced literal text without nested commands.');if(s[i]==='{')group();return;}
        i+=v[0].length;if(!v[1].trim())error(at,'Text condition must not be empty.');out.push({t:'text',value:v[1]});return;
      }
      if(Object.prototype.hasOwnProperty.call(symbols,name)){out.push(N.ch(symbols[name]));return;}
      if(name==='frac'){ out.push(N.frac(strict?required(at):group(),strict?required(at):group())); return; }
      if(name==='sqrt'){space();if(s[i]==='['){const start=i++;const idx=row(']');if(s[i]===']')i++;else if(strict)error(start,'Missing closing ].');if(strict&&!hasOperand(idx))error(start,'Empty root index.');out.push(N.nroot(idx,strict?required(at):group()));}else out.push(N.sqrt(strict?required(at):group()));return;}
      if(FNS.has(name)){space();if(s[i]==='('){const start=i++;const arg=row(')');if(s[i]===')')i++;else if(strict)error(start,'Missing closing ).');if(strict&&!hasOperand(arg))error(start,'Empty mathematical function argument.');out.push(N.fn(name,arg));}else if(s[i]==='{'){out.push(N.fn(name,strict?required(at):group()));}else{if(strict)error(at,'Function needs a grouped argument.');for(const ch of name)out.push(N.ch(ch));}return;}
      if(Object.prototype.hasOwnProperty.call(CMD,name)){ out.push(N.ch(CMD[name])); return; }
      if(strict)error(at,'Unsupported command \\'+name+'.');
      for(const ch of name) out.push(N.ch(ch));                /* legacy nonstructural command fallback */
    }
    function row(end,operatorBody=false,cell=false){
      const out=[];
      while(i<s.length){
        const c=s[i];
        if(cell&&(c==='&'||s.startsWith('\\\\',i)||s.startsWith('\\end',i)))break;
        if(operatorBody&&(c==='&'||s.startsWith('\\\\',i)||s.startsWith('\\end',i)))break;
        if(operatorBody&&(c===')'||REL.has(c)))break;
        if(operatorBody&&c==='\\'){const name=/^\\([A-Za-z]+)/.exec(s.slice(i))?.[1];if(name&&REL.has(CMD[name]))break;}
        if(end && c===end) break;
        if(c==='}'||c===']'||c===')'&&strict){if(end||operatorBody||cell)break;if(strict)error(i,'Unmatched closing delimiter.');i++;continue;}
        if(c===' '||c==='\t'||c==='\n'){ i++; continue; }
        if(c==='\\'){ cmd(out); continue; }
        if(c==='^'){const at=i++;out.push(N.sup(strict?required(at,true):group()));continue;}
        if(c==='_'){const at=i++;out.push(N.sub(strict?required(at,true):group()));continue;}
        if(c==='{'){const at=i++;const inner=row('}');if(s[i]==='}')i++;else if(strict)error(at,'Missing closing }.');if(strict&&!inner.length)error(at,'Empty mathematical group.');out.push(...inner);continue;}
        if(c==='('||c==='['){
          const at=i++,expected=c==='('?')':']',body=row(expected),close=s[i];
          const commas=body.map((n,k)=>n.t==='ch'&&n.v===','?k:-1).filter(k=>k>=0);
          const interval=commas.length===1&&hasOperand(body.slice(0,commas[0]))&&hasOperand(body.slice(commas[0]+1))&&!body.some(n=>n.t==='ch'&&REL.has(n.v));
          if(close===expected||(interval&&(close===')'||close===']')))i++;
          else if(strict)error(at,'Missing closing '+expected+' (mixed fences require exactly two interval endpoints).');
          if(strict&&!body.length)error(at,'Empty mathematical group.');
          out.push(N.fence(c,interval&&[')',']'].includes(close)?close:expected,body));continue;
        }
        if(strict&&(c==='&'||c==='$'))error(i,'Unexpected '+c+' outside its mathematical structure.');
        i++; out.push(chNode(c));
      }
      return out;
    }
    const tree=row(null);if(strict)for(const at of literalBraces)error(at,'Missing closing escaped set brace.');return {tree,errors};
  }
  function issues(value,N,CMD,FNS,REL){return run(value,N,CMD,FNS,REL).errors;}
  function parse(value,N,CMD,FNS,REL){const result=run(value,N,CMD,FNS,REL);if(result.errors.length)throw new SyntaxError(result.errors.map(e=>e.message+' (character '+e.offset+')').join(' '));return result.tree;}
  const operatorPattern=new RegExp('\\\\(?:'+commands.join('|')+')(?![A-Za-z])');
  const usesOperators=value=>operatorPattern.test(String(value??''));
  return {commands,parse,issues,usesOperators,usesStructures};
})();
