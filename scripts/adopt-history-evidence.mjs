import fs from 'node:fs';
const file='lessons/australia-home-front-propaganda/lesson.json',lesson=JSON.parse(fs.readFileSync(file));let count=0;
for(const skill of lesson.slides)for(const a of skill.activities)for(const group of a.workedExamples||[])for(const ex of group.examples||[])if(ex.visual?.length===1&&ex.visual[0].kind==='image'&&ex.visual[0].sourceMetadata){ex.visual[0].evidence={inspect:true,task:ex.prompt||ex.question||a.lede||'Inspect the source, then return to the inquiry task.',...(ex.visual[0].evidence||{})};count++;}
fs.writeFileSync(file,JSON.stringify(lesson,null,2)+'\n');console.log({individualSourceInstances:count,existingComparisonsUnchanged:true});
