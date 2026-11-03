import fs from 'node:fs';
const file='lesson-studio.html',start='/* GEOGRAPHY_EVIDENCE_CSS_START */',end='/* GEOGRAPHY_EVIDENCE_CSS_END */';
let app=fs.readFileSync(file,'utf8');
const block=start+'\n'+fs.readFileSync('src/geography/evidence/composition.css','utf8')+'\n'+end+'\n';
if(app.includes(start)){
 const a=app.indexOf(start),b=app.indexOf(end,a);
 if(b<0||app.indexOf(start,a+start.length)>=0)throw Error('Invalid Geography evidence build markers.');
 app=app.slice(0,a)+block+app.slice(b+end.length).replace(/^\r?\n/,'');
}else{
 if(!app.includes('</style>'))throw Error('Missing application style anchor.');
 app=app.replace('</style>',()=>block+'</style>');
}
fs.writeFileSync(file,app);
