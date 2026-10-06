/* Mathematics decides availability; themes describe presentation, not subject permissions. */
const LESSON_UTILITIES=Object.freeze({mathematics:Object.freeze({aliases:['mathematics','maths','math'],calculator:true})});
function lessonUtilityProfile(meta=LESSON.meta){
  const subject=String(meta?.subject||'').trim().toLowerCase();
  return Object.values(LESSON_UTILITIES).find(profile=>profile.aliases.includes(subject))||null;
}
function mathCalculatorAvailable(){return !!lessonUtilityProfile()?.calculator&&LESSON.meta.mathematicsTools?.calculator?.enabled!==false;}
let MATH_UTILITY=null;
function mathUtilityClose(){if(MATH_UTILITY?.dialog.open)MATH_UTILITY.dialog.close();}
function mathUtilityOpen(opener){
  if(!mathCalculatorAvailable())return;
  if(!MATH_UTILITY){
    const dialog=document.createElement('dialog');dialog.className='math-utility-dialog';
    dialog.setAttribute('aria-labelledby','math-utility-title');
    dialog.innerHTML='<header class="math-utility-bar"><b id="math-utility-title">Calculator</b><button type="button" data-math-expand aria-label="Expand calculator">Expand</button><button type="button" data-math-close aria-label="Close calculator">×</button></header><div class="math-instrument"></div><p class="math-utility-status" role="status" aria-live="polite"></p>';
    const host=dialog.querySelector('.math-instrument'),root=host.attachShadow({mode:'open'});
    root.innerHTML='<div id="calc-p" tabindex="0"></div>';
    MATH_UTILITY={lesson:LESSON,dialog,root,opener,calculator:null};document.body.append(dialog);
    const utility=MATH_UTILITY;
    dialog.querySelector('[data-math-close]').onclick=mathUtilityClose;
    dialog.querySelector('[data-math-expand]').onclick=()=>MATH_UTILITY.calculator?.expand();
    // Native modal inertness protects all background controls. These bubble handlers also isolate keys.
    dialog.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.key==='Escape'){
        event.preventDefault();if(!MATH_UTILITY.calculator?.escapePanel())mathUtilityClose();return;
      }
      if(event.key==='Tab'&&!event.defaultPrevented){
        const items=[...dialog.querySelectorAll('button'),...root.querySelectorAll('button,input,select,textarea,[tabindex="0"]')]
          .filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
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
}
function mathUtilitySync(){
  if(MATH_UTILITY?.lesson!==LESSON){mathUtilityClose();MATH_UTILITY?.dialog.remove();MATH_UTILITY=null;}
  if(!mathCalculatorAvailable()){mathUtilityClose();}
  document.querySelectorAll('[data-math-calculator]').forEach(button=>button.remove());
  if(mathCalculatorAvailable()){
    const bar=document.querySelector('#slide .mx-top')||document.querySelector('.top');
    const button=document.createElement('button');button.type='button';button.className='math-utility-launcher';
    button.dataset.mathCalculator='';button.textContent='Calculator';button.setAttribute('aria-haspopup','dialog');
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
