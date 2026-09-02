import { chromium } from '/home/user/OnlineLessonMaker/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const SP=process.argv[2];
const b64=f=>'data:image/png;base64,'+fs.readFileSync(`${SP}/shots/${f}.png`).toString('base64');
const pairs=[['0-345-triangle','3-4-5 triangle'],['1-crowded-pentagon','Crowded pentagon']];
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [k,title] of pairs){
  const html=`<html><body style="margin:0;font:14px system-ui;background:#fff">
  <div style="padding:18px 20px 8px"><div style="font:700 17px system-ui">${title} — current bare measurements vs prototype chips</div></div>
  <div style="display:flex;gap:14px;padding:0 20px 20px">
   <div style="flex:1"><div style="font:600 13px system-ui;color:#555;padding:0 0 6px">BEFORE — bare text</div><img src="${b64('bare-'+k)}" style="width:100%;border:1px solid #e2e2e2;border-radius:8px"></div>
   <div style="flex:1"><div style="font:600 13px system-ui;color:#555;padding:0 0 6px">AFTER — measurement chip</div><img src="${b64('pill-'+k)}" style="width:100%;border:1px solid #e2e2e2;border-radius:8px"></div>
  </div></body></html>`;
  const p=await br.newPage({viewport:{width:1900,height:820},deviceScaleFactor:2});
  await p.setContent(html,{waitUntil:'load'});
  await p.screenshot({path:`${SP}/shots/compare-${k}.png`,fullPage:true});
  console.log('✓ compare-'+k);
}
await br.close();
