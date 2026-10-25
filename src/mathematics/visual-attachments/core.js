/* C2: optional skill-local teaching evidence. Pure data helpers; no new state store. */
const MathVisuals=(()=>{
  const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const list=x=>Array.isArray(x)?x:[];
  const blank=x=>x==null||x==='';
  function definition(skill,id){return list(skill?.visuals).find(v=>v?.id===id);}
  function references(owner,inherited=[]){return [...new Set(list(owner?.visualRefs).filter(id=>typeof id==='string'&&!list(inherited).includes(id)))];}
  function table(skill,owner){return owner?.table||references(owner).map(id=>definition(skill,id)).find(v=>v?.kind==='table'&&Array.isArray(v.head)&&Array.isArray(v.rows)&&v.rows.every(r=>record(r)&&Array.isArray(r.cells)&&r.cells.length===v.head.length));}
  function completed(given,cells){return {...given,rows:list(given.rows).map((r,i)=>({...r,cells:list(r.cells).map((v,j)=>blank(v)?cells?.[i]?.[j]:v)}))};}
  function imageIssue(src){
    if(typeof src!=='string'||!src.trim())return 'Image source is missing.';
    if(/[\u0000-\u0020\\]/.test(src)||src.startsWith('//')||src.includes('#'))return 'Unsafe image source.';
    if(src.startsWith('data:'))return /^data:image\/(png|jpeg|gif|webp|avif|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)?'':'Use a supported base64 image.';
    if(/^[a-z][a-z\d+.-]*:/i.test(src)&&!/^https:\/\//i.test(src))return 'Image must use a local path, upload, or HTTPS.';
    return '';
  }
  function owners(skill){
    const out=[];
    const add=(o,path,kind)=>{if(!record(o))return;out.push({owner:o,path,kind});for(const[p,part]of list(o.parts).entries())add(part,path+'.parts.'+p,'part');};
    for(const[a,activity]of list(skill?.activities).entries()){
      for(const[q,question]of list(activity.questions).entries())add(question,`activities.${a}.questions.${q}`,'question');
      for(const[e,example]of list(activity.examples).entries())add(example,`activities.${a}.examples.${e}`,'example');
      for(const[g,group]of list(activity.workedExamples).entries())for(const[e,example]of list(group.examples).entries())add(example,`activities.${a}.workedExamples.${g}.examples.${e}`,'example');
    }
    for(const[q,question]of list(skill?.questions).entries())add(question,`questions.${q}`,'question');
    for(const[g,group]of list(skill?.groups).entries())for(const[e,example]of list(group.examples).entries())add(example,`groups.${g}.examples.${e}`,'example');
    return out;
  }
  function issues(lesson,figureIssues=()=>[]){
    const errors=[];
    for(const[si,skill]of list(lesson?.slides).entries()){
      const root=`slides.${si}`,ids=new Set(),defs=list(skill.visuals),add=(path,text)=>errors.push(path+': '+text);
      if(skill.visuals!=null&&!Array.isArray(skill.visuals))add(root+'.visuals','Visual definitions must be an array.');
      for(const[vi,v]of defs.entries()){
        const p=root+'.visuals.'+vi;
        if(!record(v)){add(p,'Visual must be an object.');continue;}
        if(typeof v.id!=='string'||!/^[a-z][\w-]*$/i.test(v.id)||['__proto__','constructor','prototype'].includes(v.id)||ids.has(v.id))add(p,'Visual needs a unique stable ID.');ids.add(v.id);
        if(!['figure','table','image'].includes(v.kind))add(p,`Visual ${v.id}: unsupported payload ${v.kind}.`);
        if(v.completionCells!=null||v.answerVisuals!=null)add(p,`Visual ${v.id}: model values belong in answer-controlled question data.`);
        if(typeof v.description!=='string'||v.description.trim().length<20||v.description.trim().split(/\s+/).length<4)add(p,`Visual ${v.id}: describe the mathematical givens and relationships.`);
        if(v.kind==='figure'){
          if(!record(v.figure))add(p,`Visual ${v.id}: missing figure payload.`);
          else for(const error of figureIssues(v.figure))add(p,`Visual ${v.id}: ${error}`);
        }
        if(v.kind==='image'){const error=imageIssue(v.src);if(error)add(p,`Visual ${v.id}: ${error}`);if(typeof v.alt!=='string'||!v.alt.trim())add(p,`Visual ${v.id}: image alternative text is required.`);}
        if(v.kind==='table'&&(!list(v.head).length||!list(v.rows).length||v.rows.some(r=>!record(r)||!Array.isArray(r.cells)||r.cells.length!==v.head.length)))add(p,`Visual ${v.id}: table rows must match the headings.`);
      }
      for(const {owner:o,path}of owners(skill)){
        const p=root+'.'+path,who=o.id||path;
        if(o.visualRefs!=null&&(!Array.isArray(o.visualRefs)||o.visualRefs.some(id=>typeof id!=='string')))add(p,`Question/example ${who}: visualRefs must be ID strings.`);
        if(list(o.visualRefs).length!==new Set(list(o.visualRefs)).size)add(p,`Question/example ${who}: duplicate visual reference.`);
        for(const id of list(o.visualRefs))if(!definition(skill,id))add(p,`Question/example ${who}: missing visual ${id}.`);
        if(o.answerVisuals==null)continue;
        if(!record(o.answerVisuals)){add(p,`Question ${who}: answerVisuals must contain final/worked arrays.`);continue;}
        for(const kind of ['final','worked']){
          const entries=o.answerVisuals[kind];
          if(entries!=null&&!Array.isArray(entries)){add(p,`Question ${who}: ${kind} visuals must be an array.`);continue;}
          const seen=new Set();
          for(const entry of list(entries)){
            if(!record(entry)||typeof entry.ref!=='string'){add(p,`Question ${who}: ${kind} visual needs a ref.`);continue;}
            const v=entry.ref==='@questionTable'?o.table:definition(skill,entry.ref);
            if(seen.has(entry.ref))add(p,`Question ${who}: duplicate ${kind} visual ${entry.ref}.`);seen.add(entry.ref);
            if(!v){add(p,`Question ${who}: ${kind} visual ${entry.ref} cannot resolve.`);continue;}
            if(entry.completionCells!=null){
              const c=entry.completionCells,rows=list(v.rows);
              if((v.kind&&v.kind!=='table')||!Array.isArray(c)||c.length!==rows.length||rows.some((r,i)=>!Array.isArray(c[i])||c[i].length!==list(v.head).length||c[i].some((x,j)=>!blank(r.cells?.[j])&&!blank(x)&&String(x)!==String(r.cells[j])||blank(r.cells?.[j])&&blank(x)||x!=null&&!['string','number'].includes(typeof x))))add(p,`Question ${who}: ${kind} table ${entry.ref} completion shape/values must match givens and fill every blank.`);
            }
          }
        }
      }
    }
    return errors;
  }
  function stripAnswers(lesson){
    const policy=lesson.meta?.answerPolicy;
    function strip(o,inheritedGroup){
      const group=o.graphResponse?policy?.groups?.[o.releaseGroup]:inheritedGroup;
      for(const kind of ['final','worked']){
        const access=group?.[kind]||policy?.[kind]||'autonomous';
        const hidden=access==='hidden'||access==='teacher'&&(group?.[kind]==='teacher'||(policy?.fallback?.[kind]||'hidden')==='hidden');
        if(hidden&&record(o.answerVisuals)){delete o.answerVisuals[kind];if(!Object.keys(o.answerVisuals).length)delete o.answerVisuals;}
      }
      for(const part of list(o.parts))if(record(part))strip(part,group);
    }
    for(const skill of list(lesson.slides))for(const {owner,kind}of owners(skill))if(kind!=='part')strip(owner);
    return lesson;
  }
  return {definition,references,table,completed,imageIssue,owners,issues,stripAnswers};
})();
if(typeof module!=='undefined')module.exports=MathVisuals;
