import fs from 'node:fs';
const dir='docs/review/shared-player';fs.mkdirSync(dir,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const old=read('docs/atlas/lesson/factoring-quadratics.app.json');
const monic=read('docs/atlas/lesson/factorising-skills.app.json').slides[0];
const find=id=>old.slides.find(s=>s.id===id);
const prefix=(qs,p)=>qs.map((q,i)=>({...q,id:p+'-'+(q.id||i)}));
const skills=['monic','nonmonic'].map((id,k)=>{
  const g=k?find('wex-nonmonic').groups:monic.workedExamples;
  return {type:'skill',id,title:k?'Factorising non-monic quadratics':'Factorising monic quadratics',video:{url:''},activities:[
    {id:id+'-explain',title:k?'Split the middle term':'Reverse the expansion',notes:k?find('notes').concepts:monic.notes},
    {id:id+'-video',title:'Watch and connect the method',optionalVideo:true},
    ...g.flatMap(group=>group.examples.map(ex=>{
      const split=group.examples.length>1;
      return {id:id+'-'+ex.id,title:ex.label,lede:split?group.lede:undefined,
        workedExamples:[{...group,title:split?ex.label:group.title,lede:split?'':group.lede,examples:[ex]}]};
    })),
    {id:id+'-practice',title:'Practise and check by expanding',questions:prefix(k?find('practice-nonmonic').questions:monic.questions,id)}
  ]};
});
const meta=(id,title,subject)=>({id,title,subject,theme:'neutral',player:'activities',responseMode:'paper'});
const factor={meta:meta('factorising-quadratics','Factorising quadratics','Mathematics'),slides:skills};
// Legacy `_bx_` tokens are not supported by mxM; preserve the algebra using single-variable tokens.
fs.writeFileSync(dir+'/factorising.json',JSON.stringify(factor,null,2).replace(/_([a-zA-Z]{2,})_/g,(_,letters)=>[...letters].map(c=>'_'+c+'_').join('')));
const qualitative={meta:meta('source-analysis-demo','Reading a source critically','History'),slides:[{type:'skill',id:'analyse-source',title:'Distinguish evidence from inference',video:{url:''},activities:[{id:'source-context',title:'What can this notice establish?',lede:'Synthetic classroom material — this is not a historical quotation.',notes:[{term:'Source A · fictional community notice',body:'The town committee plans to open a new reading room on Saturday. Volunteers are asked to bring books and help arrange the furniture.'},{term:'Read the limits of the evidence',body:'The notice states a plan and requests help. It does not establish whether the room opened, how many volunteers attended, or who could use it.'}],questions:[{id:'source-evidence',stem:'Identify two statements supported directly by the notice.'},{id:'source-inference',stem:'What additional evidence would you need to establish whether the reading room opened? Explain why.'}]}]}]};
fs.writeFileSync(dir+'/qualitative.json',JSON.stringify(qualitative,null,2));
const physics={meta:meta('motion-demo','Reading motion data','Physics'),slides:[{type:'skill',id:'constant-speed',title:'Connect data and speed',video:{url:''},activities:[{id:'motion-calculate',title:'From measurements to average speed',lede:'Synthetic test data for an object moving along a straight track.',notes:[{term:'Prediction',body:'The distance increases by the same amount each second. Predict what this suggests about the motion.'}],workedExamples:[{id:'motion-group',type:'sequence',title:'Calculate and interpret',examples:[{id:'motion-example',label:'Average speed',prompt:'An object travels 12 m in 4 s. Find its average speed.',steps:[{id:'motion-step1',text:'Average speed is distance divided by elapsed time.',math:'12 ÷ 4 = 3'}],answer:'Average speed = 3 m/s',visual:[{kind:'table',stub:'Time (s)',head:['Distance (m)'],rows:[['0','0'],['1','3'],['2','6'],['3','9'],['4','12']]}]}]}],questions:[{id:'motion-reason',stem:'Does the average speed alone prove that the object moved at constant speed? Explain what further measurements would help.'}]}]}]};
fs.writeFileSync(dir+'/physics.json',JSON.stringify(physics,null,2));
