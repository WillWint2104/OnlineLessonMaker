import fs from 'node:fs';
const appPath=new URL('../lesson-studio.html',import.meta.url);
let app=fs.readFileSync(appPath,'utf8');
const newline=app.includes('\r\n')?'\r\n':'\n';
for(const [type,file] of [['CSS','activity.css'],['JS','activity.js']]){
  const start='/* GEOGRAPHY_ATLAS_'+type+'_START */',end='/* GEOGRAPHY_ATLAS_'+type+'_END */';
  const a=app.indexOf(start),b=app.indexOf(end,a);
  if(a<0||b<a||app.indexOf(start,a+start.length)>=0||app.indexOf(end,b+end.length)>=0)throw Error('Invalid Atlas '+type+' embedding markers.');
  const source=fs.readFileSync(new URL('../src/geography/atlas/'+file,import.meta.url),'utf8').trimEnd().replace(/\r?\n/g,newline);
  app=app.slice(0,a)+start+newline+source+newline+app.slice(b);
}
fs.writeFileSync(appPath,app);
