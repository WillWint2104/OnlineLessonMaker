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
  open() {
    CALC_STATE.mode='home'; CALC_STATE.calcView='basic'; CALC_STATE.activePanel=null;
    CALC_STATE.shift=false; CALC_STATE.alpha=false; CALC_STATE.fullscreen=false;
    _calcCatalogSetQuery('');
    document.getElementById('calc-p').classList.add('on');
    calcMount(); root.querySelector('.calc-tile')?.focus({preventScroll:true});
  },
  close() { document.getElementById('calc-p').classList.remove('on'); },
  escapePanel() {
    if(!CALC_STATE.activePanel) return false;
    CALC_STATE.activePanel=null; calcRenderUI(); document.getElementById('calc-p').focus(); return true;
  }
};
