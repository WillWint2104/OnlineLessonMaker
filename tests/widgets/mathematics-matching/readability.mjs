// Actual matching host: measure readable content, not just whole-page containment.
export async function verifyMatchingReadability({page, fixture, load, check, capture=async()=>{}, record=()=>{}, prefix=''}) {
 const scenarios=[['normal',false,false],['long-label',true,false],['long-math',false,true],['combined',true,true]];
 for(const [name,labels,math] of scenarios){
  const lesson=structuredClone(fixture),q=lesson.slides[0].activities[1].questions[0];
  if(name!=='normal')q.presentation='compact';
  if(labels){q.matching.sources[0].label='SOURCEIDENTITY16';q.matching.targets[0].label='TARGETIDENTITY16';}
  if(math)q.matching.sources[0].text='$\\frac{123456789x+987654321}{123456789}+\\sqrt{x^2+123456789}$';
  await load(page,lesson);
  const field=page.locator('[data-mmq=match-equations]'),row=field.locator('.mmq-row').first(),select=row.locator('select'),text=row.locator('.mmq-text');
  await select.selectOption('match-equations-target-1');await field.scrollIntoViewIfNeeded();
  const dimensions=await row.evaluate(row=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},label=row.querySelector('b'),text=row.querySelector('.mmq-text'),controls=row.querySelector('.mmq-controls'),selected=row.querySelector('[data-mmq-selected]'),math=text.querySelector('math');
   return {row:rect(row),label:{...rect(label),lineHeight:parseFloat(getComputedStyle(label).lineHeight),scrollWidth:label.scrollWidth,clientWidth:label.clientWidth},text:{...rect(text),clientWidth:text.clientWidth,scrollWidth:text.scrollWidth,overflowX:getComputedStyle(text).overflowX},controls:rect(controls),select:rect(row.querySelector('select')),clear:rect(row.querySelector('button')),selected:{...rect(selected),scrollWidth:selected.scrollWidth,clientWidth:selected.clientWidth},math:math?rect(math):null,pageOverflow:document.documentElement.scrollWidth-innerWidth,viewport:{width:innerWidth,dpr:devicePixelRatio,zoom:getComputedStyle(document.documentElement).zoom}};
  });
  const label=prefix+name;record({name:label,...dimensions});
  check(label+' readable source width',dimensions.text.width>=Math.min(220,dimensions.row.width-10),dimensions);
  check(label+' source label remains intact',dimensions.label.height<=dimensions.label.lineHeight+1&&dimensions.label.scrollWidth<=dimensions.label.clientWidth+1,dimensions.label);
  check(label+' controls do not obscure source',dimensions.controls.y>=dimensions.text.bottom-1||dimensions.controls.x>=dimensions.text.right-1,dimensions);
  check(label+' controls and content contained',dimensions.controls.right<=dimensions.row.right+1&&dimensions.text.right<=dimensions.row.right+1&&dimensions.pageOverflow<=1,dimensions);
  check(label+' readable native control size',dimensions.select.width>=80&&dimensions.select.height>=43&&dimensions.clear.height>=35,dimensions);
  if(labels)check(label+' complete selected target description',await row.locator('[data-mmq-selected]').innerText()==='Target TARGETIDENTITY16'&&dimensions.selected.scrollWidth<=dimensions.selected.clientWidth+1,dimensions.selected);
  await text.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');check(label+' source keyboard focus',await text.evaluate(e=>document.activeElement===e&&e.tabIndex===0&&getComputedStyle(e).outlineStyle!=='none'));
  await row.evaluate(e=>e.scrollIntoView({block:'center'}));await capture(page,label);
  if(math){
   check(label+' long mathematics uses local scrolling',dimensions.text.scrollWidth>dimensions.text.clientWidth+1&&dimensions.text.overflowX==='auto',dimensions.text);
   await page.keyboard.press('End');await page.waitForTimeout(200);
   // Chromium's native scroll-region keys expose the complete unbreakable expression.
   let scrolled=await text.evaluate(e=>e.scrollLeft);
   if(!scrolled){await page.keyboard.press('Control+End');await page.waitForTimeout(200);scrolled=await text.evaluate(e=>e.scrollLeft);}
   if(!scrolled){for(let i=0;i<15;i++)await page.keyboard.press('ArrowRight');await page.waitForTimeout(200);scrolled=await text.evaluate(e=>e.scrollLeft);}
   const extent=await text.evaluate(e=>({left:e.scrollLeft,client:e.clientWidth,scroll:e.scrollWidth}));
   check(label+' keyboard can inspect mathematical end',scrolled>0&&extent.left+extent.client>=extent.scroll-1,extent);await capture(page,label+'-scrolled');
  }
  await select.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  check(label+' keyboard changes match',await select.inputValue()==='match-equations-target-2');
  await page.evaluate(()=>{lpNavigate(0,'example-choice');lpNavigate(0,'practice-choice');});
  check(label+' navigation retains match',await page.locator('[data-mmq=match-equations] select').first().inputValue()==='match-equations-target-2');
  await page.evaluate(()=>renderSlide());check(label+' rerender retains match',await page.locator('[data-mmq=match-equations] select').first().inputValue()==='match-equations-target-2');
  const viewport=page.viewportSize();if(viewport){await page.setViewportSize({...viewport,width:viewport.width-64});check(label+' resizing retains match',await page.locator('[data-mmq=match-equations] select').first().inputValue()==='match-equations-target-2');await page.setViewportSize(viewport);}
  await page.locator('[data-mmq=match-equations] [data-mmq-clear]').first().click();check(label+' clear remains available',await page.locator('[data-mmq=match-equations] select').first().inputValue()==='');
 }
}
