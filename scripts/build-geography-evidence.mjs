import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
const file='lesson-studio.html',start='/* GEOGRAPHY_EVIDENCE_CSS_START */',end='/* GEOGRAPHY_EVIDENCE_CSS_END */';
let app=fs.readFileSync(file,'utf8');
const block=start+'\n'+fs.readFileSync('src/geography/evidence/composition.css','utf8')+'\n'+end+'\n';
const vendorEnd='<!-- VENDORED-FONTS:END -->';
if(!app.includes(vendorEnd))throw Error('Missing vendored fonts end marker.');
let replaced=false;
if(app.includes(start)){
 const a=app.indexOf(start),b=app.indexOf(end,a);
 if(b<0||app.indexOf(start,a+start.length)>=0)throw Error('Invalid Geography evidence build markers.');
 if(a<app.indexOf(vendorEnd)){
  // Migrate the old insertion once; font regeneration owns the entire vendor block.
  app=app.slice(0,a)+app.slice(b+end.length).replace(/^\r?\n/,'');
 }else{
  app=app.slice(0,a)+block+app.slice(b+end.length).replace(/^\r?\n/,'');
  replaced=true;
 }
}
if(!replaced)app=app.replace(vendorEnd,()=>vendorEnd+'\n<style>\n'+block+'</style>');
if(app.split(start).length!==2||app.split(end).length!==2||app.indexOf(start)<app.indexOf(vendorEnd)||!app.includes(block))throw Error('Invalid Geography evidence replacement.');
// Never truncate the application: prepare a complete same-directory replacement.
const temporary=file+'.'+randomUUID()+'.tmp';
let fd,created=false;
try{
 fd=fs.openSync(temporary,'wx',fs.statSync(file).mode);created=true;
 fs.writeFileSync(fd,app,'utf8');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
 fs.renameSync(temporary,file);
}finally{
 try{if(fd!==undefined)fs.closeSync(fd);}
 finally{if(created)fs.rmSync(temporary,{force:true});}
}
