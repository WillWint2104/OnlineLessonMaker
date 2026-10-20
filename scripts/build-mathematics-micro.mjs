import fs from 'node:fs';
const file='lesson-studio.html',start='/* MATHEMATICS_MICRO_START */',end='/* MATHEMATICS_MICRO_END */';
let app=fs.readFileSync(file,'utf8');const block=start+'\n'+fs.readFileSync('src/mathematics/micro-lesson/micro.js','utf8')+'\n'+end;
const at=app.indexOf(start);
if(at>=0)app=app.slice(0,at)+block+app.slice(app.indexOf(end,at)+end.length);
else app=app.replace('function lpFrontPages(){',()=>block+'\nfunction lpFrontPages(){');
fs.writeFileSync(file,app);
