import fs from 'node:fs';
const file='lesson-studio.html',start='/* ARTWORK_PACKS_START */',end='/* ARTWORK_PACKS_END */';
const app=fs.readFileSync(file,'utf8'),source=fs.readFileSync('src/artwork/packs.js','utf8');
const block=start+'\n'+source+'\n'+end,at=app.indexOf(start);
let result;
if(at>=0){
 const stop=app.indexOf(end,at);
 if(stop<0||app.indexOf(start,at+start.length)>=0||app.indexOf(end,stop+end.length)>=0)throw Error('Invalid artwork markers; no application written.');
 result=app.slice(0,at)+block+app.slice(stop+end.length);
}else{
 const anchor='/* MATHEMATICS_MICRO_START */';
 if(app.includes(end)||!app.includes(anchor))throw Error('Missing artwork insertion anchor; no application written.');
 result=app.replace(anchor,()=>block+'\n'+anchor);
}
fs.writeFileSync(file,result);
