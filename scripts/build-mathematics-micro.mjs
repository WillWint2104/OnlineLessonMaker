import fs from 'node:fs';
const file='lesson-studio.html',start='/* MATHEMATICS_MICRO_START */',end='/* MATHEMATICS_MICRO_END */';
let app=fs.readFileSync(file,'utf8');const block=start+'\n'+fs.readFileSync('src/mathematics/micro-lesson/micro.js','utf8')+'\n'+end;
const at=app.indexOf(start);
if(at>=0){const stop=app.indexOf(end,at);if(stop<0)throw Error('Missing micro block end marker; application was not written.');app=app.slice(0,at)+block+app.slice(stop+end.length);}
else{const anchor='function lpFrontPages(){';if(app.includes(end)||!app.includes(anchor))throw Error('Missing micro insertion anchor or unmatched end marker; application was not written.');app=app.replace(anchor,()=>block+'\n'+anchor);}
fs.writeFileSync(file,app);
