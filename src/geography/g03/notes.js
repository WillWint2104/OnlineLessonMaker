/* G03 is a stateless reading composition inside the shared skill/activity player.
   The host owns title, introduction, navigation, questions, response identity and lifecycle. */
/** Validate opt-in reading content; publication additionally requires usable teaching assets. */
function geoG03Validate(a, publication=false){
  if(a.layout!=='geography-notes')return;
  if(!Array.isArray(a.keyNotes)||a.keyNotes.some(n=>typeof n!=='string'))throw Error('G03 key notes must be an ordered text array.');
  if(a.image!=null&&(typeof a.image!=='object'||Array.isArray(a.image)))throw Error('G03 visual must use the shared image object.');
  for(const key of ['src','alt','caption','source','sourceUrl','rights'])if(a.image?.[key]!=null&&typeof a.image[key]!=='string')throw Error('G03 visual '+key+' must be text.');
  if(publication){
    if(!a.notes?.some(n=>n.body?.trim())||!a.keyNotes.some(n=>n.trim()))throw Error('G03 needs an explanation and essential notes before publication.');
    if(a.image?.src&&(!lpImageSource(a.image)||!a.image.alt?.trim()))throw Error('G03 visual needs a safe source and meaningful alternative text before publication.');
    if(a.image?.sourceUrl&&!safeUrl(a.image.sourceUrl,'link'))throw Error('G03 visual citation needs a safe link.');
  }
}
/** Render authored explanations, one optional visual and key notes without mutating host data. */
function geoG03Render(a,i){
  const notes=Array.isArray(a.notes)?a.notes:[], keys=Array.isArray(a.keyNotes)?a.keyNotes:[];
  const media=a.image, src=media&&lpImageSource(media), usable=src&&media.alt?.trim();
  const citation=media?.sourceUrl?safeUrl(media.sourceUrl,'link'):'';
  const visual=media?.src?`<figure class="geo-g03-visual">${usable?`<img data-g03-image src="${esc(src)}" alt="${esc(media.alt)}" decoding="async">`:''}
    <p class="geo-g03-unavailable" role="note"${usable?' hidden':''}>Visual unavailable. ${esc(media.alt||'A description is needed before this visual can be published.')}</p>
    ${media.caption||media.source?`<figcaption>${esc(media.caption||'')}${media.source?` <span class="geo-g03-citation">${citation?`<a href="${esc(citation)}" target="_blank" rel="noopener noreferrer">${esc(media.source)}</a>`:esc(media.source)}</span>`:''}</figcaption>`:''}</figure>`:'';
  const questions=Array.isArray(a.questions)&&a.questions.length?`<section class="geo-g03-check" aria-label="Check your understanding"><h2>Check your understanding</h2>${mxQuestionList(a.questions,tpRespId(a)||('slide-'+i))}</section>`:'';
  return `<div class="geo-g03" data-g03-version="1"><section class="geo-g03-explanation" aria-label="Concept explanation">${notes.map(n=>`<div>${n.term||n.title?`<h2>${esc(n.term||n.title)}</h2>`:''}<p>${esc(n.body||'')}</p>${n.source?`<p class="geo-g03-source">${esc(n.source)}</p>`:''}</div>`).join('')}</section>
    ${visual}<section class="geo-g03-notes" aria-label="Key notes to record"><h2>Key notes to record</h2>${keys.length?`<ol>${keys.map(n=>`<li>${esc(n)}</li>`).join('')}</ol>`:'<p>No key notes authored yet.</p>'}</section>${questions}</div>`;
}
/** Return inspector fields bound to the existing activity object and shared list editor. */
function geoG03Inspector(a,path){
  const image=a.image||{};
  return `<div class="isec"><h3>G03 concept visual (optional)</h3><p>Use one purposeful visual. Leave the source empty for a text-only page.</p>${inT('Visual source',path+'.image.src',image.src||'')}${inT('Alternative text',path+'.image.alt',image.alt||'')}${inA('Caption',path+'.image.caption',image.caption||'')}${inT('Source credit',path+'.image.source',image.source||'')}${inT('Source link',path+'.image.sourceUrl',image.sourceUrl||'')}${inT('Rights / provenance',path+'.image.rights',image.rights||'')}</div>${lpListForm('Key note to record',path+'.keyNotes',a.keyNotes)}<p class="ihint">Aim for two or three essential notes. Explanation items above remain editable using the shared controls.</p>`;
}
/** Attach DOM-local image fallbacks; detached host DOM owns the listeners' lifetime. */
function geoG03Wire(root){
  root.querySelectorAll('[data-g03-image]').forEach(img=>{
    const unavailable=()=>{img.hidden=true;const fallback=img.parentElement.querySelector('.geo-g03-unavailable');if(fallback)fallback.hidden=false;};
    img.addEventListener('error',unavailable,{once:true});
    if(img.complete&&!img.naturalWidth)unavailable();
  });
}
