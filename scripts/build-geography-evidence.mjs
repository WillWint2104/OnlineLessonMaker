import fs from 'node:fs';
const file='lesson-studio.html',start='/* GEOGRAPHY_EVIDENCE_CSS_START */',end='/* GEOGRAPHY_EVIDENCE_CSS_END */';
let app=fs.readFileSync(file,'utf8');
const block=start+'\n'+fs.readFileSync('src/geography/evidence/composition.css','utf8')+'\n'+end+'\n';
const vendorEnd='<!-- VENDORED-FONTS:END -->';
if(app.includes(start)){
 const a=app.indexOf(start),b=app.indexOf(end,a);
 if(b<0||app.indexOf(start,a+start.length)>=0)throw Error('Invalid Geography evidence build markers.');
 if(a<app.indexOf(vendorEnd)){
  // Migrate the old insertion once; font regeneration owns the entire vendor block.
  app=app.slice(0,a)+app.slice(b+end.length).replace(/^\r?\n/,'');
 }else{
  app=app.slice(0,a)+block+app.slice(b+end.length).replace(/^\r?\n/,'');
  fs.writeFileSync(file,app);
  process.exit(0);
 }
}
if(!app.includes(vendorEnd))throw Error('Missing vendored fonts end marker.');
app=app.replace(vendorEnd,()=>vendorEnd+'\n<style>\n'+block+'</style>');
fs.writeFileSync(file,app);
