/** Inspect the real active learner surface; self-contained for Playwright evaluate.
 * Offscreen scrollable content is included; hidden/closed content is not a display failure. */
export function inspectMathematicsRendering({label='',kind='',fields={}}={}){
 const root=document.querySelector('dialog.lp-answer-hub[open]')||document.querySelector('.mx-page');
 if(!root)return {label,surface:'none',questionIds:[],issues:[]};
 const surface=root.matches('dialog')?'Answer Hub':'learner page',issues=[];
 const rendered=e=>{if(!e.getClientRects().length||['hidden','collapse'].includes(getComputedStyle(e).visibility))return false;for(let parent=e.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open&&!parent.querySelector(':scope > summary')?.contains(e))return false;return true;};
 function add(element,diagnostic,code){const owner=element.closest('[data-book-answer],[data-book-question]'),questionId=owner?.getAttribute('data-book-answer')||owner?.getAttribute('data-book-question')||null;
  const field=kind==='worked'&&!element.closest('summary')?(fields[questionId]?.worked||'workedAnswer'):kind==='final'?(fields[questionId]?.final||'answer'):'stem';
  issues.push({label,surface,questionId,field:questionId?field:'learnerContent',code,diagnostic});
 }
 for(const e of root.querySelectorAll('.md-notation-error,merror'))if(rendered(e))add(e,e.textContent.trim()||'Mathematical rendering error.','notation-diagnostic');
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const node=walker.currentNode,e=node.parentElement;if(!e||e.closest('math,code,pre,.md-notation-error,script,style')||!rendered(e))continue;
  const leaked=node.data.match(/\\(?:frac|times|pm|neq?|int|lim|sum|prod|begin|end|mathbb|vec|operatorname)\b/g);
  if(leaked)add(e,'Visible unrendered mathematical command: '+[...new Set(leaked)].join(', '),'raw-math-command');
 }
 return {label,surface,questionIds:[...root.querySelectorAll('[data-book-answer],[data-book-question]')].filter(rendered).map(e=>e.getAttribute('data-book-answer')||e.getAttribute('data-book-question')),issues};
}
