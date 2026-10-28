/* Existing TPMath string grammar, with bounded canonical operator support. No renderer or evaluator. */
globalThis.TPMathNotation=(()=>{
  const commands=['sum','prod','int','lim'];
  function run(str,N,CMD,FNS){
    const original=String(str==null?'':str),map=[];let s='',last=0;
    for(const match of original.matchAll(/\\(?:left|right)(?![a-zA-Z])\s*\.?/g)){for(let j=last;j<match.index;j++){map.push(j);s+=original[j];}last=match.index+match[0].length;}
    for(let j=last;j<original.length;j++){map.push(j);s+=original[j];}map.push(original.length);
    let i=0;const errors=[],error=(at,message)=>errors.push({offset:map[at]+1,message});
    const space=()=>{while(i<s.length&&/\s/.test(s[i]))i++;};
    function operator(name,at){
      const values={_:null,'^':null},raw={};space();
      while(s[i]==='_'||s[i]==='^'){
        const marker=s[i++],start=i;if(values[marker]!==null)error(i-1,'Duplicate '+(marker==='_'?'lower':'upper')+' limit.');
        space();const from=i;if(i>=s.length||'^_}])'.includes(s[i])){values[marker]=[];raw[marker]='';error(start,'Missing '+(marker==='_'?'lower':'upper')+' limit.');continue;}values[marker]=group();raw[marker]=s.slice(from,i);
        if(!values[marker].length)error(start,'Empty '+(marker==='_'?'lower':'upper')+' limit.');space();
      }
      if(name==='lim'){
        if(values._===null||!values._.length)error(at,'Limit needs a nonempty lower approach.');
        if(values['^']!==null)error(at,'A limit approach belongs below lim, without an upper bound.');
        const approach=(raw._||'').replace(/^\{([\s\S]*)\}$/,'$1'),arrows=[...approach.matchAll(/\\(?:to|rightarrow)(?![A-Za-z])|→/g)];
        if(arrows.length!==1||!approach.slice(0,arrows[0]?.index).trim()||!approach.slice((arrows[0]?.index||0)+(arrows[0]?.[0].length||0)).trim())error(at,'Limit approach needs a variable, one arrow and a target.');
      }else if(name==='int'){
        if((values._===null)!==(values['^']===null))error(at,'Integral needs both bounds or neither.');
      }else if(values._===null||values['^']===null)error(at,'Bounded '+name+' needs lower and upper limits.');
      let next=i;while(next<s.length&&/\s/.test(s[next]))next++;
      if(next>=s.length||'}])=<>≤≥'.includes(s[next]))error(at,'Operator needs a following mathematical expression.');
      return name==='lim'?N.lim(values._||[]):N.large({sum:'∑',prod:'∏',int:'∫'}[name],values._||[],values['^']||[]);
    }
    const chNode=c=>N.ch(c==='-'?'−':c);
    function group(){
      while(s[i]===' ')i++;
      if(s[i]==='{'){ i++; const r=row('}'); if(s[i]==='}')i++; return r; }
      if(s[i]==='\\'){ const t=[]; cmd(t); return t; }
      if(i<s.length){ return [chNode(s[i++])]; }
      return [];
    }
    function cmd(out){
      const at=i++;                                             /* past backslash */
      if(!/[a-zA-Z]/.test(s[i]||'')){ const c=s[i++]; if([';',':','!'].includes(c))error(at,'Unsupported spacing command; use \\, for a thin space.');if(c!==undefined) out.push(N.ch(c===','?'\u2009':c)); return; }   /* \{ \$ \, → literal */
      let name=''; while(i<s.length && /[a-zA-Z]/.test(s[i])) name+=s[i++];
      if(commands.includes(name)){out.push(operator(name,at));return;}
      if(name==='frac'){ out.push(N.frac(group(),group())); return; }
      if(name==='sqrt'){ while(s[i]===' ')i++; if(s[i]==='['){ i++; const idx=row(']'); if(s[i]===']')i++; out.push(N.nroot(idx,group())); } else out.push(N.sqrt(group())); return; }
      if(FNS.has(name)){ while(s[i]===' ')i++; if(s[i]==='('){ i++; const arg=row(')'); if(s[i]===')')i++; out.push(N.fn(name,arg)); } else if(s[i]==='{'){ out.push(N.fn(name,group())); } else { for(const ch of name) out.push(N.ch(ch)); } return; }
      if(CMD[name]!==undefined){ out.push(N.ch(CMD[name])); return; }
      for(const ch of name) out.push(N.ch(ch));                /* unknown command → literal letters */
    }
    function row(end){
      const out=[];
      while(i<s.length){
        const c=s[i];
        if(end && c===end) break;
        if(c==='}'||c===']') break;
        if(c===' '||c==='\t'||c==='\n'){ i++; continue; }
        if(c==='\\'){ cmd(out); continue; }
        if(c==='^'){ i++; out.push(N.sup(group())); continue; }
        if(c==='_'){ i++; out.push(N.sub(group())); continue; }
        if(c==='{'){ i++; const inner=row('}'); if(s[i]==='}')i++; for(const nn of inner) out.push(nn); continue; }
        if(c==='('){ i++; const body=row(')'); if(s[i]===')')i++; out.push(N.fence('(',')',body)); continue; }   /* brackets → fence nodes so the lifted toks/compile group correctly */
        if(c==='['){ i++; const body=row(']'); if(s[i]===']')i++; out.push(N.fence('[',']',body)); continue; }
        i++; out.push(chNode(c));
      }
      return out;
    }
    const tree=row(null);return {tree,errors};
  }
  const probe=new Proxy({}, {get:()=>()=>({t:'probe'})});
  function issues(value){return run(value,probe,{},new Set()).errors;}
  function parse(value,N,CMD,FNS){const result=run(value,N,CMD,FNS);if(result.errors.length)throw new SyntaxError(result.errors.map(e=>e.message+' (character '+e.offset+')').join(' '));return result.tree;}
  const operatorPattern=new RegExp('\\\\(?:'+commands.join('|')+')(?![A-Za-z])');
  const usesOperators=value=>operatorPattern.test(String(value??''));
  return {commands,parse,issues,usesOperators};
})();
