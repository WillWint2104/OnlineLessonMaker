import fs from 'node:fs';
let app=fs.readFileSync('lesson-studio.html','utf8');
const start='/* MATHEMATICS_VISUAL_SYSTEM_START */',end='/* MATHEMATICS_VISUAL_SYSTEM_END */';
const section=start+'\n'+fs.readFileSync('src/mathematics/visual-system.css','utf8')+'\n'+end;
app=app.replace(/<style id="mathematics-visual-system">[\s\S]*?<\/style>\s*/, '');
const at=app.indexOf(start);
if(at>=0)app=app.slice(0,at)+app.slice(app.indexOf(end,at)+end.length);
app=app.replace('</head>','<style id="mathematics-visual-system">\n'+section+'\n</style>\n</head>');
fs.writeFileSync('lesson-studio.html',app);
