/* Uses the existing mxPart/figure/table/response/export host. No separate widget lifecycle. */
function mvFigureIssues(f){
  if(!f||!Array.isArray(f.objects))return ['Figure objects must be an array.'];
  if(!['geometry','graph'].includes(f.figure))return ['Unsupported figure type; use an authored image.'];
  if(f.figure==='geometry'&&f.construction==='circle')return ['Circle/sector evidence requires an authored image in C2.'];
  if(f.figure==='geometry'&&(f.objects||[]).some(o=>!o||!['points','polygon','segment','angle','rightAngle','sideLabel'].includes(o.type)))return ['Unsupported geometry object; use supported primitives or an authored image.'];
  try{const stage=figFigStage(f,FIG_BOX0);return stage.M.errors||[];}catch(e){return ['Invalid figure: '+e.message];}
}
function mvPreflight(lesson){const errors=MathVisuals.issues(lesson,mvFigureIssues);if(errors.length)throw Error(errors.join('\n'));}
function mvSkill(owner){return LESSON.slides.find(s=>MathVisuals.owners(s).some(x=>x.owner===owner))||LESSON.slides[cur];}
function mvUsers(skill,id){const arr=x=>Array.isArray(x)?x:[];return MathVisuals.owners(skill).filter(x=>arr(x.owner.visualRefs).includes(id)||['final','worked'].some(kind=>arr(x.owner.answerVisuals?.[kind]).some(e=>e?.ref===id)));}
function mvChildParts(owner,key,skill,inherited){
  return (Array.isArray(owner.parts)?owner.parts:[]).map((pt,k)=>`<div class="mx-part"><b class="mx-pl">(${esc(pt?.label||String.fromCharCode(97+k))})</b><div>${mxM(lpBookPartText(pt))}${mvRefs(pt,key+'-'+k,{skill,inherited})}${pt&&typeof pt==='object'?mvChildParts(pt,key+'-'+k,skill,[...inherited,...MathVisuals.references(pt)]):''}</div></div>`).join('');
}
let MV_RENDER_ID=0;
function mvVisual(v,key,body,readOnly=false){
  const id='mv-description-'+(++MV_RENDER_ID),description=String(v.description||''),caption=String(v.caption||'');
  let html=body??mxPart(v,key);
  if(v.kind==='table'&&!html.includes('role="region"'))html=html.replace('<div class="mx-tblwrap"','<div class="mx-tblwrap" tabindex="0" role="region" aria-label="Data table; scroll horizontally if needed"');
  html=html.replace(/loading="lazy"/g,'loading="eager"');
  // Model evidence is inline in the existing modal; avoid an unwired nested expansion control.
  if(readOnly)html=html.replace(/<button class="tp-fig-expand"/g,'<button hidden disabled class="tp-fig-expand"');
  // Accessible descriptions follow the figure into its existing expanded workspace.
  if(v.kind==='figure')html=html.replace(/<svg\b/g,`<svg aria-describedby="${id}"`);
  return `<section class="mv-evidence" data-mv-ref="${esc(v.id||key)}" aria-describedby="${id}">${html}<p id="${id}" class="mv-description">${esc(description)}</p>${caption?`<p class="mv-caption">${mxM(caption)}</p>`:''}</section>`;
}
function mvRefs(owner,key,options={}){
  const skill=options.skill||mvSkill(owner);
  return MathVisuals.references(owner,options.inherited).map(id=>{
    const v=MathVisuals.definition(skill,id);
    if(!v)return `<p class="mv-error" role="status">Required visual ${esc(id)} is unavailable. Ask the author to repair this question.</p>`;
    try{return mvVisual(v,key+'-'+id,v===options.responseTable?options.tableHtml:undefined);}catch{return `<p class="mv-error" role="status">Required visual ${esc(id)} is invalid. Repair its definition in Edit mode.</p>`;}
  }).join('');
}
function mvAnswer(owner,kind,skill=mvSkill(owner)){
  if(!lpBookAllowed(kind))return '';
  return (Array.isArray(owner.answerVisuals?.[kind])?owner.answerVisuals[kind]:[]).map((entry,i)=>{
    if(!entry||typeof entry!=='object'||Array.isArray(entry))return '<p class="mv-error" role="status">Answer visual unavailable.</p>';
    const given=entry.ref==='@questionTable'?{...owner.table,kind:'table',id:'question-table',description:'The completed table uses the original headings and given values.'}:MathVisuals.definition(skill,entry.ref);
    if(!given)return '<p class="mv-error" role="status">Answer visual unavailable.</p>';
    try{const v=entry.completionCells?MathVisuals.completed(given,entry.completionCells):given;return mvVisual(v,'answer-'+owner.id+'-'+kind+'-'+i,undefined,true);}catch{return '<p class="mv-error" role="status">Answer visual is invalid. Repair its definition in Edit mode.</p>';}
  }).join('');
}
function mvFitAnswers(panel){for(const figure of panel.querySelectorAll('.mv-evidence .tp-fig'))figInlineSolve(figure);}
function mvHubTheme(dialog){
  const source=document.querySelector('#slide .mx');if(!source)return;
  const style=getComputedStyle(source);
  for(const property of style)if(property.startsWith('--mx-'))dialog.style.setProperty(property,style.getPropertyValue(property));
}
const MV_SCROLL_ATTRIBUTES=new WeakMap();
function mvTableScrollAttributes(wrap,scrolls){
  if(scrolls){
    const added=MV_SCROLL_ATTRIBUTES.get(wrap)||[];
    for(const[name,value]of [['tabindex','0'],['role','region'],['aria-label','Data table; scroll horizontally if needed']])if(!wrap.hasAttribute(name)){wrap.setAttribute(name,value);added.push([name,value]);}
    MV_SCROLL_ATTRIBUTES.set(wrap,added);
  }else{
    for(const[name,value]of MV_SCROLL_ATTRIBUTES.get(wrap)||[])if(wrap.getAttribute(name)===value)wrap.removeAttribute(name);
    MV_SCROLL_ATTRIBUTES.delete(wrap);
  }
}
function mvReferenceForm(owner,path,skill=LESSON.slides[cur]){
  const defs=Array.isArray(skill.visuals)?skill.visuals.filter(v=>v&&typeof v==='object'):[],selected=Array.isArray(owner.visualRefs)?owner.visualRefs:[];
  return `<details class="isec mv-author"><summary>Required question visuals</summary><p>Shared skill givens. Displayed after the prompt, before subparts and response.</p>${defs.map(v=>`<label><input type="checkbox" data-mv-select="${esc(path)}" data-mv-id="${esc(v.id)}" ${selected.includes(v.id)?'checked':''}> ${esc(v.label||v.id)} · ${esc(v.kind)}</label>`).join('')||'<p>No shared visuals yet. Add one below.</p>'}${selected.filter(id=>!defs.some(v=>v.id===id)).map(id=>`<p class="mv-error">Missing visual ${esc(id)} <button type="button" data-mv-unref="${esc(path)}" data-mv-id="${esc(id)}">Remove broken reference</button></p>`).join('')}</details>`;
}
function mvPartEditor(path,v,index){try{return v.kind==='figure'&&v.figure?.figure==='geometry'?blockFigureForm(index,{type:'figure',...v.figure},null,path+'.figure'):mxPartForm(path,v,null);}catch{return '<p class="mv-error">This payload is malformed. Repair its JSON; the draft is preserved.</p>';}}
function mvTableShape(v){return v&&Array.isArray(v.head)&&Array.isArray(v.rows)&&v.rows.every(r=>r&&Array.isArray(r.cells)&&r.cells.length===v.head.length);}
function mvModelForm(owner,path){
  const skill=mvSkill(owner),refs=MathVisuals.references(owner),tables=refs.map(id=>MathVisuals.definition(skill,id)).filter(v=>v?.kind==='table'&&mvTableShape(v));
  if(mvTableShape(owner.table))tables.push({...owner.table,id:'@questionTable',label:'Question table'});
  const options=[...new Set([...refs,...tables.map(t=>t.id)])];
  return `<details class="isec mv-author"><summary>Answer visuals and completed tables</summary><p>Final and worked models follow their separate answer policies. Givens remain shared.</p>${['final','worked'].map(kind=>`<h4>${kind==='final'?'Final answer':'Worked solution'}</h4>${options.map(id=>{const entries=Array.isArray(owner.answerVisuals?.[kind])?owner.answerVisuals[kind]:[],at=entries.findIndex(e=>e?.ref===id),table=tables.find(t=>t.id===id);return `<label><input type="checkbox" data-mv-model="${esc(path)}" data-mv-kind="${kind}" data-mv-id="${esc(id)}" ${at>=0?'checked':''}> ${esc(table?.label||id)}</label>${at>=0&&table?`<div class="mx-tblwrap" tabindex="0" role="region" aria-label="${kind} completion editor"><table class="mx-tbl"><tr><th>Row</th>${table.head.map(h=>`<th scope="col">${mxM(h)}</th>`).join('')}</tr>${table.rows.map((r,ri)=>`<tr><th scope="row">${mxM(r.label||'')}</th>${r.cells.map((c,ci)=>`<td>${c!=null&&c!==''?mxM(c):`<input class="ii" aria-label="${kind} ${esc(r.label||'row '+(ri+1))}, ${esc(table.head[ci])}" data-bind="${path}.answerVisuals.${kind}.${at}.completionCells.${ri}.${ci}" value="${esc(entries[at].completionCells?.[ri]?.[ci]??'')}">`}</td>`).join('')}</tr>`).join('')}</table></div>`:''}`;}).join('')}`).join('')}</details>`;
}
function mvLibraryForm(skill,index){
  const defs=Array.isArray(skill.visuals)?skill.visuals:[],base='slides.'+index;
  return `<details class="isec mv-author"><summary>Shared skill visuals (${defs.length})</summary><p>Define givens once. Each question/example chooses its own references.</p>${defs.map((v,i)=>{if(!v||typeof v!=='object')return '<p class="mv-error">Malformed shared visual '+i+'; repair in JSON.</p>';const path=base+'.visuals.'+i,uses=mvUsers(skill,v.id).map(x=>x.owner.id||x.path);return `<details><summary>${esc(v.label||v.id)} · ${esc(v.kind)}</summary><p>Used by: ${esc(uses.join(', ')||'none')}</p><p>Stable visual ID: <code>${esc(v.id)}</code></p>${inA('Mathematical description — givens and relationships',path+'.description',v.description||'')}${inA('Caption (optional)',path+'.caption',v.caption||'')}${v.kind==='image'?`<label>Choose image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" data-mv-upload="${path}.src"></label><p data-mv-upload-status role="status"></p>`:''}${mvPartEditor(path,v,index)}<button type="button" data-mv-delete="${i}">Delete shared visual (references will need repair)</button></details>`;}).join('')}<label>Visual type<select data-mv-new-kind><option value="figure">Existing Figure Engine</option><option value="table">Table</option><option value="image">Image</option></select></label><button type="button" data-mv-add>Add shared visual</button><p class="mv-error" data-mv-diagnostics>${esc(MathVisuals.issues({slides:[skill]},mvFigureIssues).join('\n'))}</p></details>`;
}
function mvWireEditor(){
  const ins=document.getElementById('inspector');if(!ins)return;
  const refresh=()=>renderSlide(),skill=LESSON.slides[cur];
  ins.querySelector('[data-mv-add]')?.addEventListener('click',()=>{const kind=ins.querySelector('[data-mv-new-kind]').value,v=mxPartSeed(kind);v.id='visual-'+crypto.randomUUID();v.description='';(skill.visuals=Array.isArray(skill.visuals)?skill.visuals:[]).push(v);refresh();});
  ins.querySelectorAll('[data-mv-upload]').forEach(el=>el.onchange=()=>{const file=el.files?.[0];if(file)embedImageToSlot(el.dataset.mvUpload,file,el.parentElement.nextElementSibling);});
  ins.querySelectorAll('[data-mv-delete]').forEach(b=>b.onclick=()=>{const v=skill.visuals[+b.dataset.mvDelete],uses=mvUsers(skill,v.id);if(confirm('Delete '+v.id+'? '+uses.length+' question/example references may need repair.')){skill.visuals.splice(+b.dataset.mvDelete,1);refresh();}});
  ins.querySelectorAll('[data-mv-select],[data-mv-unref]').forEach(el=>el.addEventListener(el.matches('button')?'click':'change',()=>{const o=getP(LESSON,el.dataset.mvSelect||el.dataset.mvUnref);if(!o)return;const refs=new Set(o.visualRefs||[]);el.checked?refs.add(el.dataset.mvId):refs.delete(el.dataset.mvId);o.visualRefs=[...refs];refresh();}));
  ins.querySelectorAll('[data-mv-model]').forEach(el=>el.onchange=()=>{const o=getP(LESSON,el.dataset.mvModel),kind=el.dataset.mvKind,id=el.dataset.mvId;if(!o)return;o.answerVisuals=o.answerVisuals&&typeof o.answerVisuals==='object'&&!Array.isArray(o.answerVisuals)?o.answerVisuals:{};const entries=o.answerVisuals[kind]=Array.isArray(o.answerVisuals[kind])?o.answerVisuals[kind]:[];if(el.checked){const t=id==='@questionTable'?o.table:MathVisuals.definition(skill,id);entries.push({ref:id,...(t?.head?{completionCells:t.rows.map(r=>r.cells.map(c=>c??''))}:{})});}else o.answerVisuals[kind]=entries.filter(e=>e.ref!==id);refresh();});
}
async function mvEmbedAssets(out){
  const manifest=[];
  for(const [si,skill]of (out.slides||[]).entries())for(const v of skill.visuals||[])if(v.kind==='image'){
    const issue=MathVisuals.imageIssue(v.src);if(issue)throw Error('Visual '+v.id+': '+issue);
    const source=v.src;let data;
    try{data=source.startsWith('data:')?source:await fetchDataURI(new URL(source,document.baseURI).href,8000);}catch(error){throw Error('Visual '+v.id+' ('+source+'): '+error.message);}
    const response=await fetch(data),blob=await response.blob();
    if(!['image/png','image/jpeg','image/gif','image/webp','image/avif','image/svg+xml'].includes(blob.type))throw Error('Visual '+v.id+': unsupported image content.');
    if(blob.size>10*1024*1024)throw Error('Visual '+v.id+': image exceeds 10 MiB.');
    if(blob.type==='image/svg+xml'){
      const text=await blob.text(),xml=new DOMParser().parseFromString(text,'image/svg+xml');
      if(xml.querySelector('parsererror')||xml.documentElement.localName!=='svg'||xml.querySelector('script,foreignObject,style,iframe,object,embed,animate,set,animateTransform,animateMotion')||[...xml.querySelectorAll('*')].some(n=>[...n.attributes].some(a=>/^on/i.test(a.name)||/url\s*\(/i.test(a.value)||['href','xlink:href','src'].includes(a.name))))throw Error('Visual '+v.id+': unsafe or malformed SVG. Use a static self-contained image.');
    }
    // Decode raster bytes as well; MIME alone cannot prove that an upload is a valid image.
    const image=new Image();image.src=data;try{await image.decode();}catch{throw Error('Visual '+v.id+': image cannot be decoded.');}
    const bytes=await blob.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    manifest.push({skill:skill.id||si,visual:v.id,mime:blob.type,bytes:blob.size,sha256:hash,source:source.startsWith('data:')?'embedded upload':source});v.src=data;
  }
  if(manifest.length){out.meta=out.meta||{};out.meta.visualAssetManifest=manifest;}
  return out;
}
