const GEO_ATLAS_LAYOUT='geography-investigation';
const geoAtlasRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const geoAtlasText=value=>typeof value==='string'&&!!value.trim();
const geoAtlasSubject=meta=>/^geography$/i.test(String(meta?.subject||'').trim());
function geoAtlasSources(skill,a){
  const refs=new Set((a.questions||[]).flatMap(q=>[q,...(Array.isArray(q.parts)?q.parts:[])].flatMap(owner=>MathVisuals.references(owner))));
  return (Array.isArray(skill.visuals)?skill.visuals:[]).filter(v=>['image','table'].includes(v?.kind)&&refs.has(v.id));
}
const geoAtlasSource=(skill,a)=>geoAtlasSources(skill,a).find(v=>v.id===a.investigation?.sourceRef);

function geoAtlasValidate(skill,a,meta,publication=false){
  if(a.layout!==GEO_ATLAS_LAYOUT)return;
  const fail=message=>{throw Error('Geography investigation '+a.id+': '+message);};
  if(!geoAtlasSubject(meta)||meta.responseMode!=='paper')fail('requires a Geography lesson with paper responses.');
  const config=a.investigation;
  if(!geoAtlasRecord(config)||Object.keys(config).some(k=>!['sourceRef','map'].includes(k))
    ||typeof config.sourceRef!=='string')fail('needs a source reference.');
  if(a.introduction||a.video||a.optionalVideo||a.workedExamples?.length||a.examples?.length||a.practiceCollectionId||a.workspace)
    fail('use notes, shared evidence and paper questions in this layout.');
  const source=geoAtlasSource(skill,a);
  if((publication||config.sourceRef)&&!source)fail('choose a shared image or data table attached to a question or part.');
  if(a.questions?.some(q=>q.type==='table'||q.table||q.choice||q.matching||q.graphResponse||
    (q.parts||[]).some(p=>!geoAtlasText(lpBookPartText(p))||p?.parts?.length||
      (p?.guidance!=null&&typeof p.guidance!=='string'))||
    (q.guidance!=null&&typeof q.guidance!=='string')))fail('use written questions with plain or labelled parts and optional text guidance.');
  if(publication){
    if(!a.questions?.length)fail('add a question before publishing.');
    if(![source.label,source.description,source.sourceMetadata?.date,source.sourceMetadata?.attribution].every(geoAtlasText))
      fail('add a source label, interpretation limits, date or measure, and attribution.');
    if(source.kind==='image'&&(!evSrc(source.src)||!source.alt?.trim()||source.evidence?.inspect!==true))
      fail('the image requires alternative text and source inspection.');
    if(source.kind==='table'&&source.rows?.some(row=>row.cells?.some(cell=>cell==null||cell==='')))
      fail('the evidence table needs complete given values.');
  }
  const map=config.map;
  if(map==null)return;
  if((source&&source.kind!=='image')||!geoAtlasRecord(map)||Object.keys(map).some(k=>!['equator','locations'].includes(k))||
    !geoAtlasPercent(map.equator)||!Array.isArray(map.locations)||map.locations.length>12)
    fail('location readings require image evidence, an Equator position and up to twelve locations.');
  const names=new Set();
  for(const p of map.locations){
    if(!geoAtlasRecord(p)||!geoAtlasText(p.name)||!geoAtlasText(p.country)||names.has(p.name)||
      !geoAtlasPercent(p.x)||!geoAtlasPercent(p.y)||!Number.isFinite(p.latitude)||Math.abs(p.latitude)>90||
      !Number.isFinite(p.longitude)||Math.abs(p.longitude)>180)
      fail('each location needs a unique name, country, position and coordinates.');
    names.add(p.name);
  }
}
function geoAtlasPercent(value){return Number.isFinite(value)&&value>=0&&value<=100;}
function geoAtlasActive(skill,a,meta){
  if(!a||a.layout!==GEO_ATLAS_LAYOUT)return false;
  try{geoAtlasValidate(skill,a,meta);return true;}catch{return false;}
}

function GeoContentIntro(a,skill,position){
  const notes=a.notes||[];
  const body=n=>tpRich(n.body)+(n.source?' <small>'+esc(n.source)+'</small>':'');
  return `<section class="ga-intro" aria-labelledby="lpTitle">
    <p class="ga-stage">Skill ${position+1} · ${esc(skill.title)}</p>
    <h1 id="lpTitle" class="lp-title" tabindex="-1">${esc(a.title)}</h1>
    ${a.lede?`<p class="ga-purpose">${tpRich(a.lede)}</p>`:''}
    ${notes.length?`<section class="ga-knowledge" aria-label="Teaching notes">
      <h2>${esc(a.notesTitle||'Key concepts')}</h2>
      <div class="ga-note-grid">${notes.map(n=>n.term||n.title?
        `<dl><dt>${tpRich(n.term||n.title)}</dt><dd>${body(n)}</dd></dl>`:
        `<p class="ga-explanation">${body(n)}</p>`).join('')}</div>
    </section>`:''}
    ${a.practiceNote?`<p class="ga-guidance">${tpRich(a.practiceNote)}</p>`:''}
  </section>`;
}

function GeoEvidenceSurface(v,config,key){
  if(!v)return '<p class="ga-missing" role="status">Source unavailable. Choose shared evidence in Edit mode.</p>';
  const m=v.sourceMetadata||{},image=v.kind==='image',src=image?evSrc(v.src):'';
  const map=config.map,inspect=image&&src&&v.evidence?.inspect===true;
  EV_SOURCES.set(key,image?v:{...v,alt:v.description});
  const media=image?`<div class="ga-map">
    ${src?`<img data-ev-image src="${esc(src)}" alt="${esc(v.alt||'Source image')}">`:'<p>Source image unavailable.</p>'}
    ${src&&map?map.locations.map((p,i)=>`<button type="button" class="ga-location" data-ga-location="${i}" style="--ga-x:${p.x}%;--ga-y:${p.y}%" aria-label="Read coordinates for ${esc(p.name)}" aria-pressed="false"></button>`).join(''):''}
    ${src&&map?`<svg class="ga-guide" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" hidden><line y2="${map.equator}"></line></svg>`:''}
    </div>${src&&map?.locations.length?`<div class="ga-reading"><p class="ga-reading-label">Location reading</p><div data-ga-reading role="status">Select a highlighted city to read its coordinates.</div><button type="button" data-ga-clear hidden>Clear selection</button></div>`:''}`:
    `<div class="ga-table" tabindex="0" role="region" aria-label="Source data table"><table aria-labelledby="ga-source-title"><thead><tr><th scope="col">${esc(v.stub||'Category')}</th>${(v.head||[]).map(t=>`<th scope="col">${esc(t)}</th>`).join('')}</tr></thead>
      <tbody>${(v.rows||[]).map(row=>`<tr><th scope="row">${esc(row.label||'')}</th>${(row.cells||[]).map(t=>`<td>${esc(t??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `<section class="ga-source ev-source" aria-labelledby="ga-source-title">
    <header class="ga-source-header"><div><h2 id="ga-source-title">${esc(v.label||m.title||'Source')}</h2>${m.date?`<p>${esc(m.date)}</p>`:''}</div>
      <div class="ga-actions">${inspect?`<button type="button" data-ev-inspect="${esc(key)}">Inspect source</button>`:''}<button type="button" data-ev-details="${esc(key)}">Source details</button></div>
    </header>
    ${media}<p class="ev-status" aria-live="polite"></p>
    <footer class="ga-credit">${v.description?`<p>${esc(v.description)}</p>`:''}${v.caption?`<p>${esc(v.caption)}</p>`:''}${m.attribution?`<p>${esc(m.attribution)}</p>`:''}</footer>
  </section>`;
}

function geoAtlasSteps(a){
  return (a.questions||[]).flatMap((q,j)=>(q.parts?.length?q.parts:[null]).map((p,i)=>{
    const label=p==null?'':p?.label||String.fromCharCode(97+i);
    return {key:JSON.stringify([q.id,i]),id:q.id,label,caption:q.parts?.length?`Part ${label}`:`Question ${j+1}`,
      stem:p==null?'':q.stem,text:p==null?q.stem:lpBookPartText(p),guidance:p?.guidance||q.guidance||''};
  }));
}
function GeoQuestionWorkspace(a,steps){
  return `<aside class="ga-questions" id="ga-questions" aria-labelledby="ga-questions-title">
    <header class="ga-question-bar"><div><h2 id="ga-questions-title">${esc(a.questionsTitle||'Investigation questions')}</h2>
    <p><span data-ga-count></span>${steps.length?' · ':''}Exercise book</p></div>
    <button type="button" data-ga-close>Close</button></header>
    ${steps.length?`<div class="ga-steps" role="group" aria-label="Jump to a question part">${steps.map((s,i)=>`<button type="button" data-ga-step="${i}" aria-pressed="false">${esc(s.caption)}</button>`).join('')}</div>
      ${steps.map((s,i)=>`<section class="ga-task" data-ga-task="${i}" data-question-id="${esc(s.id)}" hidden>
        ${s.stem?`<p class="ga-stem">${tpRich(s.stem)}</p>`:''}
        <h3 tabindex="-1">${s.label?`<span>(${esc(s.label)})</span>`:''}${tpRich(s.text)}</h3>
        <p class="ga-paper">Write your answer in your exercise book or on your worksheet.</p>
        ${s.guidance?`<details class="ga-help"><summary>Need help?</summary><p>${tpRich(s.guidance)}</p></details>`:''}
      </section>`).join('')}
      <footer class="ga-question-nav"><button type="button" data-ga-move="-1">← Previous</button><button type="button" data-ga-move="1">Next question →</button></footer>`:
      '<p class="ga-missing">Add a question in Edit mode.</p>'}
  </aside>`;
}
function geoAtlasRender(skill,a,index){
  return `<div class="ga-atlas" data-ga-root>
    <div class="ga-learning"><div class="ga-launch"><button type="button" data-ga-open aria-controls="ga-questions" aria-expanded="true">Questions</button></div>
      ${GeoContentIntro(a,skill,index)}${GeoEvidenceSurface(geoAtlasSource(skill,a),a.investigation,'atlas-'+a.id)}
    </div>${GeoQuestionWorkspace(a,geoAtlasSteps(a))}
  </div>`;
}

let geoAtlasDispose;
function geoAtlasMount(root,a,state){
  const controller=new AbortController();
  const {signal}=controller;
  const steps=geoAtlasSteps(a),tasks=[...root.querySelectorAll('[data-ga-task]')],tabs=[...root.querySelectorAll('[data-ga-step]')];
  const panel=root.querySelector('#ga-questions'),launch=root.querySelector('[data-ga-open]');
  const previous=root.querySelector('[data-ga-move="-1"]'),next=root.querySelector('[data-ga-move="1"]');
  const locations=a.investigation.map?.locations||[];
  const reading=root.querySelector('[data-ga-reading]'),guide=root.querySelector('.ga-guide');
  const clear=root.querySelector('[data-ga-clear]');
  let index=Math.max(0,steps.findIndex(s=>s.key===state.part));
  function showStep(want,focus=false){
    if(want<0||want>=steps.length)return;
    index=want;
    state.part=steps[index].key;
    tasks.forEach((task,i)=>{task.hidden=i!==index;tabs[i].setAttribute('aria-pressed',String(i===index));});
    previous.disabled=index===0;next.disabled=index===steps.length-1;
    root.querySelector('[data-ga-count]').textContent=`Question ${index+1} of ${steps.length}`;
    if(focus)tasks[index].querySelector('h3').focus();
  }
  function showDrawer(open,focus=false){
    state.open=open;
    panel.hidden=!open;
    root.dataset.gaClosed=String(!open);
    launch.setAttribute('aria-expanded',String(open));
    if(focus)(open?tasks[index]?.querySelector('h3')||panel.querySelector('[data-ga-close]'):launch).focus();
  }
  function selectPlace(place){
    if(!reading||!guide)return;
    state.place=place?.name;
    for(const button of root.querySelectorAll('[data-ga-location]')){
      button.setAttribute('aria-pressed',String(locations[Number(button.dataset.gaLocation)]===place));
    }

    guide.toggleAttribute('hidden',!place);
    clear.hidden=!place;
    if(!place){reading.textContent='Select a highlighted city to read its coordinates.';return;}
    const line=guide.querySelector('line');
    line.setAttribute('x1',place.x);line.setAttribute('x2',place.x);line.setAttribute('y1',place.y);
    const coord=(value,positive,negative)=>Math.abs(value).toFixed(2)+'°'+(value<0?negative:positive);
    reading.innerHTML=`<strong>${esc(place.name)}</strong><span>${esc(place.country)}</span><dl>
      <div><dt>Latitude</dt><dd>${coord(place.latitude,'N','S')}</dd></div>
      <div><dt>Longitude</dt><dd>${coord(place.longitude,'E','W')}</dd></div>
      <div><dt>Relative to the Equator</dt><dd>${place.latitude===0?'On the Equator':coord(place.latitude,' north',' south')}</dd></div></dl>`;
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||!root.contains(button))return;
    if(button.hasAttribute('data-ga-open'))showDrawer(true,true);
    else if(button.hasAttribute('data-ga-close'))showDrawer(false,true);
    else if(button.dataset.gaStep!=null)showStep(Number(button.dataset.gaStep),true);
    else if(button.dataset.gaMove!=null)showStep(index+Number(button.dataset.gaMove),true);
    else if(button.dataset.gaLocation!=null)selectPlace(locations[Number(button.dataset.gaLocation)]);
    else if(button.hasAttribute('data-ga-clear')){
      const active=root.querySelector('[data-ga-location][aria-pressed="true"]');
      selectPlace(null);active?.focus({preventScroll:true});
    }
  },{signal});
  root.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight'].includes(event.key)&&event.target.closest('.ga-table,.ga-questions,.ga-map'))event.stopPropagation();
  },{signal});
  showStep(index);
  showDrawer(state.open!==false);
  selectPlace(locations.find(p=>p.name===state.place));
  return ()=>controller.abort();
}

function geoAtlasInspector(skill,a,base,skillPath){
  const config=geoAtlasRecord(a.investigation)?a.investigation:{};
  const source=geoAtlasSource(skill,a),sourcePath=skillPath+'.visuals.'+(skill.visuals||[]).indexOf(source);
  const path=base+'.investigation';
  const map=config.map;
  const num=(label,key,value,min,max)=>`<label>${esc(label)}<input class="ii" type="number" min="${min}" max="${max}" step="any" data-ga-number="${esc(key)}" value="${esc(value??'')}"></label>`;
  return `<section class="isec"><h3>Geography investigation</h3>
    <p>Exercise-book responses. Use Introduction and Explanation for teaching notes, and Questions for the authored prompts. Attach a shared visual to a question or part before choosing it here.</p>
    ${inSel('Investigation source',path+'.sourceRef',config.sourceRef||'',[['','Choose shared evidence'],...geoAtlasSources(skill,a).map(v=>[v.id,v.label||v.id])])}
    ${source?`${inT('Source label',sourcePath+'.label',source.label)}${inT('Source date and measure',sourcePath+'.sourceMetadata.date',source.sourceMetadata?.date)}${inA('Essential interpretation limits',sourcePath+'.description',source.description)}${inA('Concise attribution',sourcePath+'.sourceMetadata.attribution',source.sourceMetadata?.attribution)}${inA('Rights and licence',sourcePath+'.sourceMetadata.rights',source.sourceMetadata?.rights)}${inA('Technical source details',sourcePath+'.sourceMetadata.notes',source.sourceMetadata?.notes)}`:''}
    ${inA('Teaching guidance before evidence',base+'.practiceNote',a.practiceNote)}
    ${(a.questions||[]).map((q,i)=>inA('Optional Help for question '+(i+1),base+'.questions.'+i+'.guidance',q.guidance)+
      (q.parts||[]).map((p,j)=>`<label>Optional Help for question ${i+1}, part ${j+1}<textarea class="ia" data-ga-help="${i}:${j}">${esc(p?.guidance||'')}</textarea></label>`).join('')).join('')}
    ${map?`${num('Equator position (% from top)',path+'.map.equator',map.equator,0,100)}
      ${map.locations.map((p,i)=>{const b=path+'.map.locations.'+i;return `<fieldset><legend>Location ${i+1}</legend>${inT('Place name',b+'.name',p.name)}${inT('Country',b+'.country',p.country)}
        ${num('Position from left (%)',b+'.x',p.x,0,100)}${num('Position from top (%)',b+'.y',p.y,0,100)}
        ${num('Latitude',b+'.latitude',p.latitude,-90,90)}${num('Longitude',b+'.longitude',p.longitude,-180,180)}
        <button type="button" data-ga-remove-location="${i}">Remove location</button></fieldset>`;}).join('')}
      <button type="button" data-ga-author="add-location"${map.locations.length>=12?' disabled':''}>Add location</button>
      <button type="button" data-ga-author="remove-map">Remove location readings</button>`:
      source?.kind==='image'?'<button type="button" data-ga-author="map">Add location readings</button>':''}
    <button type="button" data-ga-author="off">Use standard activity layout</button>
  </section>`;
}
function geoAtlasAuthorWire(ins,a){
  ins.querySelectorAll('[data-ga-author],[data-ga-remove-location]').forEach(button=>button.onclick=()=>{
    const action=button.dataset.gaAuthor;
    if(action==='on'){a.layout=GEO_ATLAS_LAYOUT;a.investigation={sourceRef:''};}
    else if(action==='off'){delete a.layout;delete a.investigation;}
    else if(action==='map')a.investigation.map={equator:50,locations:[]};
    else if(action==='remove-map')delete a.investigation.map;
    else if(action==='add-location')a.investigation.map.locations.push({name:'New location',country:'Country',x:50,y:50,latitude:0,longitude:0});
    else a.investigation.map.locations.splice(Number(button.dataset.gaRemoveLocation),1);
    renderSlide();
  });
  ins.querySelectorAll('[data-ga-number]').forEach(input=>input.onchange=()=>{
    if(!Number.isFinite(input.valueAsNumber)||!input.checkValidity())return;
    lpSet(input.dataset.gaNumber,input.valueAsNumber);renderCanvas();
  });
  ins.querySelectorAll('[data-ga-help]').forEach(input=>input.onchange=()=>{
    const [i,j]=input.dataset.gaHelp.split(':').map(Number),parts=a.questions[i].parts,p=parts[j];
    if(typeof p==='string'&&input.value)parts[j]={prompt:p,guidance:input.value};
    else if(geoAtlasRecord(p)){
      if(input.value)p.guidance=input.value;
      else delete p.guidance;
    }
    renderCanvas();
  });
  ins.querySelector('[data-bind$=".investigation.sourceRef"]')?.addEventListener('change',()=>renderInspector());
}
