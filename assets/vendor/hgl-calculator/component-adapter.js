// Integration shell only. The evaluator and modes are generated from calculator-reference.html.
const hostDocument = root.ownerDocument;
const window = {}; // HGL's one-time wiring flags belong to this instance, not the application.
const document = {
  getElementById: id => root.getElementById(id),
  querySelector: selector => root.querySelector(selector),
  querySelectorAll: selector => root.querySelectorAll(selector),
  addEventListener: (...args) => root.addEventListener(...args),
  createElement: tag => hostDocument.createElement(tag),
  execCommand: command => hostDocument.execCommand(command),
  body: root.querySelector('#calc-p'), documentElement: root.host
};
function scheduleAutosave() {} // Lesson utilities are session memory, never authored data or storage.
function autosaveOnStrokeCommit() {}
function showToast(message) { callbacks.status?.(String(message)); }
function toast(message) { showToast(message); }
function togCalc() { callbacks.close(); }
root.addEventListener('keydown',event=>{
  if(event.key==='Delete'&&CALC_STATE.mode==='calculate'&&!event.target.matches('input,textarea')){
    event.preventDefault();event.stopImmediatePropagation();calcInputBackspace();_afterInput();
  }
});

/* SOURCE_MODULES */

// Presentation adapter: use the source-authored primary/secondary action and label together.
function olmScientificKey(key){
  const primary={html:key.html,fn:key.fn,tmpl:key.tmpl,ins:key.ins,act:key.act};
  const secondary=key.shiftLbl?{
    html:key.act==='v2-dms'?'DMS ↔ decimal':key.shiftLbl,
    fn:key.shiftFn||(key.act==='v2-pm'?'abs':undefined),
    tmpl:key.shiftTmpl,act:key.shiftAct||(key.act==='v2-dms'?key.act:undefined)
  }:null;
  const active=CALC_STATE.shift&&secondary?secondary:primary;
  const action=['fn','tmpl','ins','act'].find(name=>active[name]!==undefined);
  if(!action)throw Error('Scientific key lacks its audited active action');
  const label=hostDocument.createElement('span');label.innerHTML=active.html;
  const accessible=({sqrt:'Square root',nroot:'Nth root',frac:'Fraction',mixed:'Mixed fraction',pow:'Power',square:'Square',cube:'Cube',cbrt:'Cube root',reciprocal:'Reciprocal',pow10:'Ten to the power',log:'Logarithm with base'}[active.tmpl])||({asin:'Inverse sine',acos:'Inverse cosine',atan:'Inverse tangent',exp:'Exponential',ln:'Natural logarithm',log10:'Base ten logarithm',abs:'Absolute value'}[active.fn])||label.textContent.trim();
  return '<button class="ck calc-v2-mathkey" type="button" data-'+action+'="'+_escCalc(active[action])+'" aria-label="'+_escCalc(accessible)+'">'+active.html+'</button>';
}
let olmPicker=false;
const sourceGoMode=calcGoMode;
calcGoMode=function(mode){olmPicker=false;CALC_STATE.shift=false;CALC_STATE.activePanel=null;sourceGoMode(mode);};
calcGoHome=function(){olmPicker=!olmPicker;CALC_STATE.shift=false;calcRenderUI();};
const sourceFullscreen=calcToggleFullscreen;
calcToggleFullscreen=function(){olmPicker=false;sourceFullscreen();};

function olmWorkspace(panel){
  const wrap=panel.querySelector('.calc-wrap');if(!wrap)return;
  const angles=wrap.querySelector('.calc-v2-seg');
  if(angles){angles.classList.add('olm-angle');wrap.prepend(angles);}
  wrap.querySelectorAll('.calc-v2-hdr,.calc-hdr').forEach(header=>header.remove());
  wrap.classList.toggle('olm-expanded',CALC_STATE.fullscreen);
  const pad=wrap.querySelector('.calc-v2-keypad');
  if(pad&&!CALC_STATE.activePanel){
    const action=pad.querySelector('.calc-v2-action'),utility=pad.querySelector('.calc-v2-utility');
    if(!CALC_STATE.fullscreen){
      for(const id of ['v2-history','v2-vars']){const button=action.querySelector('[data-act="'+id+'"]');button.className='ck calc-v2-pill';utility.append(button);}
      action.querySelector('[data-act="v2-copy"]').closest('.calc-v2-stack').remove();
      action.querySelectorAll('.calc-v2-stack').forEach(stack=>{if(!stack.children.length)stack.remove();});
      utility.querySelector('[data-act="v2-help"]').remove();
    }
    if(CALC_STATE.fullscreen){
      const upper=hostDocument.createElement('div');upper.className='olm-workspace-upper';
      const history=hostDocument.createElement('section');history.className='olm-history';
      history.setAttribute('aria-label','Calculation history');history.innerHTML=_calcRenderHistoryPanel(CALC_STATE);
      history.querySelector('[data-act="v2-history"]')?.remove();
      const editing=hostDocument.createElement('section');editing.className='olm-edit';
      editing.innerHTML='<h3>Edit & navigate</h3>';editing.append(action);
      const templates=hostDocument.createElement('section');templates.className='olm-templates';
      templates.innerHTML='<h3>Insert template</h3><div class="olm-template-grid">'+[
        ['frac','Fraction'],['pow','Power'],['sqrt','Square root'],['nroot','Nth root'],
        ['sum','Summation'],['prod','Product'],['integ','Integral'],['deriv','Derivative']
      ].map(([id,label])=>'<button type="button" class="ck" data-tmpl="'+id+'">'+label+'</button>').join('')+'</div>';
      upper.append(history,editing,templates);pad.insertBefore(upper,utility);
      const lower=hostDocument.createElement('div');lower.className='olm-workspace-lower';
      lower.append(pad.querySelector('.calc-v2-math'),pad.querySelector('.calc-v2-numpad'));pad.append(lower);
    }
    // Home/End act on the existing input model; no second expression editor.
    const nav=hostDocument.createElement('div');nav.className='olm-cursor-ends';
    nav.innerHTML='<button class="ck" data-olm-nav="home" type="button">Home</button><button class="ck" data-olm-nav="end" type="button">End</button>';
    action.append(nav);
    utility.querySelector('[data-act="v2-home"]')?.remove();
    const catalog=utility.querySelector('[data-act="v2-catalog"]');catalog.textContent=CALC_STATE.fullscreen?'Functions & templates':'Catalog';catalog.setAttribute('aria-label','Functions and templates');
  }
  if(CALC_STATE.mode==='statistics'&&CALC_STATE.fullscreen){
    const workspace=hostDocument.createElement('div');workspace.className='olm-stat-workspace';
    const data=hostDocument.createElement('section');data.innerHTML='<h3>Data entry</h3>';data.append(wrap.querySelector('.st-table'));
    const results=hostDocument.createElement('section');results.innerHTML='<h3>Statistics results</h3>';results.append(wrap.querySelector('.st-results'));
    const tools=hostDocument.createElement('section');tools.className='olm-stat-tools';tools.innerHTML='<h3>Statistics tools</h3><button class="st-btn" data-act="mode-1var">1-variable summary</button><button class="st-btn" data-act="mode-2var">Regression & correlation</button><button class="st-btn st-btn-p" data-act="calc">Calculate results</button><p>Enter values in the table. Use two-variable mode for a linear regression and correlation.</p><div class="olm-stat-nav">'+[['left','←'],['right','→'],['up','↑'],['down','↓'],['del','DEL']].map(([action,label])=>'<button type="button" data-stat-nav="'+action+'" aria-label="'+({left:'Previous cell',right:'Next cell',up:'Cell above',down:'Cell below',del:'Delete in selected cell'}[action])+'">'+label+'</button>').join('')+'</div><div class="olm-stat-keypad">'+['7','8','9','4','5','6','1','2','3','0','.','−'].map(value=>'<button type="button" data-stat-insert="'+value+'">'+value+'</button>').join('')+'</div>';
    workspace.append(data,results,tools);wrap.append(workspace);
  }
  if(olmPicker){
    const picker=hostDocument.createElement('section');picker.className='olm-mode-picker';
    picker.setAttribute('aria-label','Calculator modes');
    const source=hostDocument.createElement('div');source.innerHTML=_calcRenderHome();
    picker.innerHTML='<h3>Select calculator mode</h3>';picker.append(source.querySelector('.calc-tile-grid'));wrap.append(picker);
  }
  callbacks.mode?.(CALC_MODES.find(mode=>mode.id===CALC_STATE.mode)?.label||'Calculate',olmPicker);
}
root.addEventListener('click',event=>{
  const control=event.target.closest('[data-olm-nav]');if(!control)return;
  CALC_INPUT.cursor={path:[],pos:control.dataset.olmNav==='home'?0:CALC_INPUT.atoms.length};
  _afterInput();document.getElementById('calc-p').focus({preventScroll:true});
});
let olmStatsCell=null;
root.addEventListener('focusin',event=>{if(event.target.matches('.st-cell'))olmStatsCell={row:event.target.dataset.row,col:event.target.dataset.col};});
root.addEventListener('click',event=>{
  const button=event.target.closest('[data-stat-insert],[data-stat-nav]');if(!button)return;
  const cell=olmStatsCell&&root.querySelector('.st-cell[data-row="'+olmStatsCell.row+'"][data-col="'+olmStatsCell.col+'"]');
  if(!cell){showToast('Select a data-entry cell first.');return;}
  const action=button.dataset.statNav;
  if(action&&action!=='del'){
    const cells=[...root.querySelectorAll('.st-cell')],index=cells.indexOf(cell),step=action==='left'?-1:action==='right'?1:action==='up'?-2:2;
    cells[Math.max(0,Math.min(cells.length-1,index+step))].focus();return;
  }
  let start=cell.selectionStart??cell.value.length,end=cell.selectionEnd??start;
  if(action==='del'&&start===end)start=Math.max(0,start-1);
  cell.setRangeText(action==='del'?'':button.dataset.statInsert==='−'?'-':button.dataset.statInsert,start,end,'end');
  cell.dispatchEvent(new Event('input',{bubbles:true}));cell.focus();
});

// Fixed action mapping replaces the standalone's inline global handlers; never evaluate attributes.
root.addEventListener('click', event => {
  const control = event.target.closest('[data-hgl-action]');
  if(!control) return;
  const actions = {home:calcGoHome, expand:calcToggleFullscreen, close:togCalc, clear:calcClearHistory};
  if(Object.prototype.hasOwnProperty.call(actions,control.dataset.hglAction)) actions[control.dataset.hglAction]();
});
root.addEventListener('input', event => {
  if(event.target.matches('.calc-v2-catalog-search')) _calcCatalogOnSearch(event);
});
const _hglRender = calcRenderUI;
calcRenderUI = function() {
  const focused=root.activeElement;
  const selector=focused?.matches('button') ? [...focused.attributes].filter(a=>a.name.startsWith('data-'))
    .map(a=>'['+a.name+'="'+CSS.escape(a.value)+'"]').join('') : null;
  _hglRender();
  const panel = document.getElementById('calc-p');
  olmWorkspace(panel);
  panel.tabIndex = 0;
  panel.setAttribute('aria-label','Calculator input; type numbers and operators, Escape clears the expression');
  root.querySelectorAll('button').forEach(button => {
    button.type = 'button';
    if(button.title && !button.hasAttribute('aria-label')) button.setAttribute('aria-label',button.title);
  });
  root.querySelectorAll('.calc-v2-dbtn[data-act]').forEach(button => button.setAttribute('aria-label',
    ({up:'Previous history or upper slot',down:'Next history or lower slot',left:'Move input cursor left',right:'Move input cursor right','v2-ok':'Evaluate'})[button.dataset.act]));
  callbacks.expanded?.(CALC_STATE.fullscreen);
  // Restore focus synchronously after the source replaced its UI. A capture-phase microtask can run
  // before the target's click handler and would leave subsequent keyboard input on the background.
  if(focused&&!focused.isConnected){
    const replacement=selector&&root.querySelector(selector);
    (replacement?.getClientRects().length?replacement:panel).focus({preventScroll:true});
  }
};
return {
  expand() { calcToggleFullscreen(); },
  picker() { calcGoHome(); },
  open() {
    if(CALC_STATE.mode==='home')CALC_STATE.mode='calculate';
    olmPicker=false; CALC_STATE.calcView='basic'; CALC_STATE.activePanel=null;
    CALC_STATE.shift=false; CALC_STATE.alpha=false; CALC_STATE.fullscreen=false;
    _calcCatalogSetQuery('');
    document.getElementById('calc-p').classList.add('on');
    calcMount(); document.getElementById('calc-p').focus({preventScroll:true});
  },
  close() { CALC_STATE.shift=false;olmPicker=false;document.getElementById('calc-p').classList.remove('on'); },
  escapePanel() {
    if(olmPicker){olmPicker=false;calcRenderUI();return true;}
    if(!CALC_STATE.activePanel) return false;
    CALC_STATE.activePanel=null; calcRenderUI(); document.getElementById('calc-p').focus(); return true;
  }
};
