import fs from 'node:fs';
let app=fs.readFileSync('lesson-studio.html','utf8');
for(const[type,files,anchor]of [['js',['core.js','host.js'],'function mxParts(x){'],['css',['style.css'],'</style>']]){
  const start=type==='js'?'/* MATHEMATICS_VISUAL_ATTACHMENTS_START */':'/* MATHEMATICS_VISUAL_ATTACHMENTS_CSS_START */',end=start.replace('_START','_END');
  const block=start+'\n'+files.map(f=>fs.readFileSync('src/mathematics/visual-attachments/'+f,'utf8')).join('\n')+'\n'+end+'\n';
  if(app.includes(start)){const a=app.indexOf(start),b=app.indexOf(end,a);if(b<0||app.indexOf(start,a+start.length)>=0)throw Error('Invalid C2 build markers.');app=app.slice(0,a)+block+app.slice(b+end.length).replace(/^\r?\n/,'');}
  else {if(!app.includes(anchor))throw Error('Missing C2 '+type+' anchor.');app=app.replace(anchor,()=>block+anchor);}
}
fs.writeFileSync('lesson-studio.html',app);
