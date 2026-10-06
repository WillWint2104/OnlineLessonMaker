/* Mathematics decides availability; themes describe presentation, not subject permissions. */
const LESSON_UTILITIES=Object.freeze({mathematics:Object.freeze({aliases:['mathematics','maths','math'],calculator:true})});
function lessonUtilityProfile(meta=LESSON.meta){
  const subject=String(meta?.subject||'').trim().toLowerCase();
  return Object.values(LESSON_UTILITIES).find(profile=>profile.aliases.includes(subject))||null;
}
function mathCalculatorAvailable(){return !!lessonUtilityProfile()?.calculator&&LESSON.meta.mathematicsTools?.calculator?.enabled!==false;}
let MATH_UTILITY=null;
const mathCalculatorIcon='<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M7 6h10v4H7zM7 14h2m3 0h2m3 0h1M7 18h2m3 0h2m3 0h1"/></svg>';
function mathUtilityClose(){if(MATH_UTILITY?.dialog.open)MATH_UTILITY.dialog.close();}
function mathUtilityOpen(opener){
  if(!mathCalculatorAvailable())return;
  if(!MATH_UTILITY){
    const dialog=document.createElement('dialog');dialog.className='math-utility-dialog';
    dialog.setAttribute('aria-labelledby','math-utility-title');
    dialog.innerHTML='<header class="math-utility-bar"><span class="ms" aria-hidden="true">calculate</span><b id="math-utility-title">Calculator</b><span class="math-drag-cue" aria-hidden="true">⠿</span><button type="button" data-math-expand aria-label="Expand calculator">Expand</button><button type="button" data-math-close aria-label="Close calculator">×</button></header><div class="math-utility-modebar"><button type="button" data-math-mode aria-label="Select calculator mode">Calculate ▾</button><span data-math-shift></span></div><div class="math-instrument"></div><p class="math-utility-status" role="status" aria-live="polite"></p>';
    const host=dialog.querySelector('.math-instrument'),root=host.attachShadow({mode:'open'});
    dialog.querySelector('.math-utility-bar>.ms').outerHTML='<span class="math-calculator-icon">'+mathCalculatorIcon+'</span>';
    dialog.querySelector('.math-utility-bar b').after(dialog.querySelector('[data-math-mode]'));
    dialog.querySelector('.math-utility-modebar').remove();
    root.innerHTML='<div id="calc-p" tabindex="0"></div>';
    MATH_UTILITY={lesson:LESSON,dialog,root,opener,calculator:null,position:null};document.body.append(dialog);
    const utility=MATH_UTILITY;
    dialog.querySelector('[data-math-close]').onclick=mathUtilityClose;
    dialog.querySelector('[data-math-expand]').onclick=()=>MATH_UTILITY.calculator?.expand();
    dialog.querySelector('[data-math-mode]').onclick=()=>MATH_UTILITY.calculator?.picker();
    const clampPosition=()=>{
        host.style.setProperty('--olm-body-height',host.clientHeight+'px');
      const rect=dialog.getBoundingClientRect(),margin=6;
      const position=utility.position||{x:Math.max(margin,innerWidth-rect.width-24),y:Math.max(margin,Math.min(88,innerHeight-rect.height-margin))};
      dialog.style.left=Math.max(margin,Math.min(position.x,innerWidth-rect.width-margin))+'px';
      dialog.style.top=Math.max(margin,Math.min(position.y,innerHeight-rect.height-margin))+'px';
    };
    utility.place=clampPosition;
    const bar=dialog.querySelector('.math-utility-bar');let drag=null;
    bar.addEventListener('pointerdown',event=>{
      if(innerWidth<=600||event.button!==0||event.target.closest('button'))return;
      event.preventDefault();const rect=dialog.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX-rect.left,y:event.clientY-rect.top};
      bar.setPointerCapture(event.pointerId);bar.classList.add('dragging');
    });
    bar.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      utility.position={x:event.clientX-drag.x,y:event.clientY-drag.y};clampPosition();
    });
    const endDrag=()=>{drag=null;bar.classList.remove('dragging');};
    bar.addEventListener('pointerup',endDrag);bar.addEventListener('pointercancel',endDrag);
    utility.resize=()=>{if(dialog.open)clampPosition();};window.addEventListener('resize',utility.resize);
    // Dismiss a subpanel before Calculate's root listener consumes Escape to clear input.
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&utility.calculator?.escapePanel()){
        event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
    // Native modal inertness protects all background controls. These bubble handlers also isolate keys.
    dialog.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.key==='Escape'){
        event.preventDefault();if(!MATH_UTILITY.calculator?.escapePanel())mathUtilityClose();return;
      }
      if(event.key==='Tab'&&!event.defaultPrevented){
        const items=[...dialog.querySelectorAll('button'),...root.querySelectorAll('button,input,select,textarea,[tabindex="0"]')]
          .filter(el=>!el.disabled&&!el.closest('[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
        const focused=root.activeElement||document.activeElement,index=items.indexOf(focused);
        if(items.length){event.preventDefault();items[(index+(event.shiftKey?-1:1)+items.length)%items.length].focus();}
      }
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();mathUtilityClose();});
    dialog.addEventListener('close',()=>{
      utility.calculator?.close();
      const button=utility.opener;
      if(button?.isConnected)button.focus({preventScroll:true});
    });
    try{
      MATH_UTILITY.calculator=createHglCalculator(root,{
        close:mathUtilityClose,
        status:message=>{dialog.querySelector('.math-utility-status').textContent=message;},
        expanded:value=>{
          dialog.classList.toggle('math-utility-expanded',value);
          dialog.querySelector('[data-math-expand]').textContent=value?'Reduce':'Expand';
          dialog.querySelector('[data-math-expand]').setAttribute('aria-label',value?'Restore calculator':'Expand calculator');
          if(dialog.open)clampPosition();
        },
        mode:(label,picker)=>{
          dialog.dataset.calculatorMode=label.toLowerCase();
          dialog.querySelector('[data-math-expand]').classList.toggle('math-expand-grid',label==='Spreadsheet');
          const button=dialog.querySelector('[data-math-mode]');button.textContent=label+' ▾';button.setAttribute('aria-label','Select calculator mode; current mode '+label);button.setAttribute('aria-expanded',String(picker));
          if(dialog.open)clampPosition();
        }
      });
    }catch(error){
      root.replaceChildren();dialog.querySelector('.math-utility-status').textContent='Calculator unavailable. Close this window to continue the lesson.';
      dialog.querySelector('[data-math-expand]').hidden=true;
      console.warn('Calculator initialization failed:',error);
    }
  }
  MATH_UTILITY.opener=opener;
  const dialog=MATH_UTILITY.dialog;dialog.classList.remove('math-utility-expanded');
  dialog.querySelector('[data-math-expand]').textContent='Expand';
  dialog.showModal();
  try{MATH_UTILITY.calculator?.open();}catch(error){
    dialog.querySelector('.math-utility-status').textContent='Calculator unavailable. Close this window to continue the lesson.';
    console.warn('Calculator opening failed:',error);
  }
  if(!MATH_UTILITY.calculator)dialog.querySelector('[data-math-close]').focus();
  MATH_UTILITY.place();
}
function mathUtilitySync(){
  if(MATH_UTILITY?.lesson!==LESSON){mathUtilityClose();if(MATH_UTILITY)window.removeEventListener('resize',MATH_UTILITY.resize);MATH_UTILITY?.dialog.remove();MATH_UTILITY=null;}
  if(!mathCalculatorAvailable()){mathUtilityClose();}
  document.querySelectorAll('[data-math-calculator]').forEach(button=>button.remove());
  if(mathCalculatorAvailable()){
    const bar=document.querySelector('#slide .mx-top')||document.querySelector('.top');
    const button=document.createElement('button');button.type='button';button.className='math-utility-launcher';
    button.dataset.mathCalculator='';button.innerHTML=mathCalculatorIcon+'<span class="math-launch-label">Calculator</span>';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label','Open calculator');button.title='Calculator';
    button.onclick=()=>mathUtilityOpen(button);
    const space=bar?.querySelector('.mx-top-sp');if(space)space.after(button);else bar?.insertBefore(button,bar.querySelector('#modeSeg'));
  }
  mathUtilityAuthor();
}
function mathUtilityAuthor(){
  const inspector=document.getElementById('inspector');inspector?.querySelector('[data-math-settings]')?.remove();
  if(authorMode()==='edit'&&lessonUtilityProfile()?.calculator&&inspector){
    const section=document.createElement('div');section.className='isec';section.dataset.mathSettings='';
    section.innerHTML='<h3>Mathematics tools</h3><label><input type="checkbox" data-math-enabled> Calculator available</label>';
    const checkbox=section.querySelector('input');checkbox.checked=mathCalculatorAvailable();
    checkbox.onchange=()=>{
      LESSON.meta.mathematicsTools={...LESSON.meta.mathematicsTools,calculator:{enabled:checkbox.checked}};
      renderSlide();document.querySelector('[data-math-enabled]')?.focus({preventScroll:true});
    };
    inspector.append(section);
  }
}
