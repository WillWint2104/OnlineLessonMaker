/* Finite procedural baseline artwork; data URIs need no image host or runtime fetch. */
globalThis.ArtworkPacks=(()=>{
  const catalogue=Object.freeze([
    {id:'global/general',label:'Global · neutral structures',variant:3},
    {id:'mathematics/general',label:'Mathematics · general',variant:0},
    {id:'mathematics/algebra/general',label:'Algebra · structures',variant:0},
    {id:'mathematics/algebra/signs',label:'Algebra · reflections',variant:1},
    {id:'mathematics/algebra/factorisation',label:'Algebra · factors',variant:2},
    {id:'mathematics/algebra/fractions',label:'Algebra · fractions',variant:4}
  ].map(Object.freeze));
  const roles=Object.freeze(['overview','outcomes','completion']);
  const packs=Object.freeze(catalogue.map(({id,label})=>Object.freeze([id,label])));
  function valid(request){return typeof request==='string'&&request.length<=128&&/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)+$/.test(request);}
  /** Missing requests stay opt-out; missing topics ascend through broader general packs. */
  function resolve(request){
    if(request==null||request==='')return null;
    if(!valid(request))throw Error('Artwork pack must be a namespaced pack ID.');
    const parts=request.split('/'),chain=[request];
    for(let length=parts.length-1;length>=1;length--)chain.push(parts.slice(0,length).join('/')+'/general');
    chain.push('global/general');
    const candidates=[...new Set(chain)],entry=catalogue.find(item=>item.id===candidates.find(id=>catalogue.some(pack=>pack.id===id)));
    return {requested:request,id:entry.id,chain:candidates};
  }
  /** Decorative local SVGs are generated from a finite pack/role catalogue; no formula or answer text. */
  function legacyImage(variant,role){
    const phase={overview:0,outcomes:1,completion:2}[role];if(phase==null)return null;
    const shapes=Array.from({length:6},(_,i)=>{const x=380+i*78,y=350-(i%3)*70-phase*20;
      return variant===1?`<path d="M${x} ${y}l70 -110v210l-70 110z" fill="${i%2?'#087c70':'#9edfcc'}" opacity=".75"/>`:variant===2?`<rect x="${x}" y="${y}" width="65" height="${100+i*16}" rx="5" fill="${i%2?'#0a8275':'#9edfcc'}"/>`:`<path d="M${x} ${y}l50 -25 50 25v100l-50 25-50-25z" fill="${i%2?'#159a86':'#b0e9d7'}"/>`;}).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><defs><linearGradient id="bg"><stop stop-color="#f7fffc"/><stop offset="1" stop-color="#c9eee1"/></linearGradient><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#329c89" stroke-opacity=".12"/></pattern></defs><rect width="960" height="600" fill="url(#bg)"/><rect width="960" height="600" fill="url(#grid)"/><circle cx="710" cy="230" r="180" fill="none" stroke="#148b78" stroke-dasharray="6 9" opacity=".3"/>${shapes}<path d="M280 520L900 130" stroke="#0a8275" stroke-opacity=".2" fill="none"/><circle cx="820" cy="100" r="7" fill="#087c70"/></svg>`;
    return {src:'data:image/svg+xml;base64,'+btoa(svg),alt:'',fit:'cover',focus:{x:.68,y:.5}};
  }
  /** New baseline variants reuse the established grid, palette and abstract geometry. */
  function image(request,role){
    if(!roles.includes(role))return null;
    const resolved=resolve(request);if(!resolved)return null;
    const entry=catalogue.find(pack=>pack.id===resolved.id);
    if(entry.variant<3)return legacyImage(entry.variant,role);
    const phase=roles.indexOf(role);
    let base=legacyImage(0,role),svg=atob(base.src.split(',')[1]);
    const before=svg.indexOf('<circle cx="710"'),after=svg.indexOf('<path d="M280 520');
    const shapes=entry.variant===3?
      Array.from({length:5},(_,i)=>`<rect x="${390+i*70}" y="${160+(i%2)*65-phase*12}" width="52" height="${180+i*18}" rx="3" fill="${i%2?'#b0e9d7':'#159a86'}" opacity=".65"/>`).join(''):
      Array.from({length:4},(_,row)=>Array.from({length:row+2},(_,column)=>`<rect x="${360+column*(460/(row+2))}" y="${155+row*78-phase*10}" width="${460/(row+2)-8}" height="48" rx="3" fill="${(column+row)%3?'#b0e9d7':'#159a86'}" opacity=".8"/>`).join('')).join('');
    svg=svg.slice(0,before)+'<circle cx="710" cy="230" r="180" fill="none" stroke="#148b78" stroke-dasharray="6 9" opacity=".3"/>'+shapes+svg.slice(after);
    return {...base,src:'data:image/svg+xml;base64,'+btoa(svg)};
  }
  return Object.freeze({catalogue,packs,roles,valid,resolve,image});
})();
