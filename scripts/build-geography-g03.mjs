import fs from 'node:fs';
let app=fs.readFileSync('lesson-studio.html','utf8');
for(const [type,file,anchor] of [['CSS','notes.css','</style>'],['JS','notes.js','function mxSkillPage(s,i){']]){
  const start=`/* GEOGRAPHY_G03_${type}_START */`,end=`/* GEOGRAPHY_G03_${type}_END */`;
  const block=start+'\n'+fs.readFileSync('src/geography/g03/'+file,'utf8')+'\n'+end+'\n';
  if(app.includes(start)){
    const a=app.indexOf(start),b=app.indexOf(end,a);
    if(b<0||app.indexOf(start,a+start.length)>=0)throw Error('Invalid G03 build markers.');
    app=app.slice(0,a)+block+app.slice(b+end.length).replace(/^\r?\n/,'');
  }else{if(!app.includes(anchor))throw Error('Missing G03 embedding anchor.');app=app.replace(anchor,()=>block+anchor);}
}
fs.writeFileSync('lesson-studio.html',app);
