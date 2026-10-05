// M1.2 reuses the original teacher models and the existing authored lesson format.
import fs from 'node:fs';
const slugs=['expanding-two-binomials','expanding-binomial-trinomial'];
function poly(cs){return cs.map((c,i)=>c?(c<0?' − ':' + ')+(Math.abs(c)===1&&i<cs.length-1?'':Math.abs(c))+(i<cs.length-1?'_x_'+(i<cs.length-2?'^'+(cs.length-i-1):''):''):'').join('').replace(/^ \+ /,'').replace(/^ − /,'−');}
function sum(ts){return ts.map((t,i)=>t.startsWith('−')?(i?' − ':'−')+t.slice(1).trim():(i?' + ':'')+t).join('');}
for(const [index,slug]of slugs.entries()){
 const file='lessons/'+slug+'/lesson.json',l=JSON.parse(fs.readFileSync(file)),sk=l.slides[0],a=sk.activities.find(a=>a.practiceCollectionId),c=sk.exampleCollections[0],old=a.questions;
 // Preserve all existing question identities; extend each pathway to the authored review target.
 const extra=index===0?[
 [[[1,6],[1,7]],[[1,2],[1,9]],[[1,3],[1,8]],[[1,4],[1,9]],[[1,8],[1,11]],[[1,9],[1,12]]],
 [[[1,-4],[1,7]],[[1,-5],[1,3]],[[1,-6],[1,2]],[[1,-3],[1,-5]],[[1,-9],[1,11]],[[1,-12],[1,7]]],
 [[[2,5],[1,2]],[[3,-2],[1,4]],[[4,1],[1,-2]],[[5,-3],[1,2]],[[4,-5],[3,7]],[[5,4],[2,-9]]]
 ]:[
 [[[1,2],[1,3,1]],[[1,3],[1,1,4]],[[1,4],[1,2,3]],[[1,2],[1,4,5]],[[1,6],[1,7,4]],[[1,7],[1,6,8]]],
 [[[1,-3],[1,2,-4]],[[1,-4],[1,3,-2]],[[1,-2],[1,-1,3]],[[1,-1],[1,-3,-4]],[[1,-7],[1,6,-5]],[[1,-6],[1,7,-8]]],
 [[[2,1],[1,3,2]],[[3,-2],[1,1,4]],[[4,1],[1,-2,3]],[[5,-3],[1,2,1]],[[4,-3],[3,-2,5]],[[5,-4],[2,-3,7]]]
 ];
 const additions=index===0?[
 [[[1,1],[1,5]],[[1,2],[1,6]],[[1,3],[1,6]],[[1,5],[1,7]],[[1,6],[1,13]],[[1,7],[1,14]],[[1,8],[1,15]],[[1,11],[1,13]]],
 [[[1,-2],[1,7]],[[1,-4],[1,6]],[[1,-1],[1,-5]],[[1,-5],[1,-7]],[[1,-10],[1,13]],[[1,-11],[1,8]],[[1,-7],[1,-12]],[[1,-9],[1,-14]]],
 [[[2,3],[1,5]],[[3,4],[1,-1]],[[4,-3],[1,2]],[[5,2],[1,-4]],[[2,-7],[3,5]],[[3,5],[4,-2]],[[5,-6],[2,-3]],[[4,7],[3,8]]]
 ]:[
 [[[1,1],[1,4,2]],[[1,2],[1,2,5]],[[1,3],[1,3,2]],[[1,4],[1,1,5]],[[1,8],[1,5,9]],[[1,9],[1,8,6]],[[1,6],[1,9,7]],[[1,10],[1,7,8]]],
 [[[1,-1],[1,3,-2]],[[1,-2],[1,4,-3]],[[1,-3],[1,-2,4]],[[1,-4],[1,-1,-2]],[[1,-8],[1,5,-9]],[[1,-9],[1,8,-6]],[[1,-6],[1,-9,7]],[[1,-10],[1,-7,-8]]],
 [[[2,3],[1,2,4]],[[3,1],[1,-1,2]],[[4,-2],[1,3,-1]],[[5,-1],[1,-2,3]],[[2,-5],[3,4,-7]],[[3,4],[2,-5,6]],[[4,-7],[3,-1,8]],[[5,6],[2,7,-3]]]
 ];
 const parse=t=>{const cs=Array(index===0?2:3).fill(0);for(const term of t.replaceAll('_x_','x').replaceAll('−','-').replaceAll(/\s/g,'').match(/[+-]?[^+-]+/g)||[]){const m=/^([+-]?)(\d*)x(?:\^(\d+))?$/.exec(term);if(m)cs[cs.length-1-(+m[3]||1)]=(m[1]==='-'?-1:1)*(m[2]?+m[2]:1);else cs.at(-1);if(!m)cs[cs.length-1]=+term;}return cs;};
 a.questions=c.members.flatMap((id,k)=>{
  const previous=old.filter(q=>q.archetypeId===id),make=([u,v],level,suffix)=>({id:sk.id+'-'+id+'-'+suffix,stem:'Expand and simplify ('+poly(u)+')('+poly(v)+').',archetypeId:id,level});
  const baseline=[...previous.filter(q=>q.level==='basic').slice(0,4),...extra[k].slice(0,4).map((f,j)=>previous.find(q=>q.id===sk.id+'-'+id+'-new-foundation-'+(j+1))||make(f,'basic','new-foundation-'+(j+1))),...additions[k].slice(0,4).map((f,j)=>previous.find(q=>q.id===sk.id+'-'+id+'-m12-foundation-'+(j+1))||make(f,'basic','m12-foundation-'+(j+1))),...previous.filter(q=>q.level==='moderate').slice(0,2),...extra[k].slice(4).map((f,j)=>previous.find(q=>q.id===sk.id+'-'+id+'-new-moderate-'+(j+1))||make(f,'moderate','new-moderate-'+(j+1))),...additions[k].slice(4).map((f,j)=>previous.find(q=>q.id===sk.id+'-'+id+'-m12-moderate-'+(j+1))||make(f,'moderate','m12-moderate-'+(j+1)))];
  // The existing negative binomial scaffold leads its family; no identity or expression changes.
  if(index===0&&k===1){const at=baseline.findIndex(q=>q.id==='binomial-guided-question');baseline.unshift(...baseline.splice(at,1));const third=baseline.findIndex(q=>q.id==='binomial-products-signs-q3');baseline.splice(2,0,...baseline.splice(third,1));}
  return baseline.map((q,j)=>{
   const f=q.stem.match(/\(([^()]*)\)\(([^()]*)\)/),u=parse(f[1]).slice(-2),v=parse(f[2]),answer=Array(u.length+v.length-1).fill(0),terms=[];
   u.forEach((x,i)=>v.forEach((y,j)=>{answer[i+j]+=x*y;const degree=u.length+v.length-2-i-j;terms.push(poly([x*y,...Array(degree).fill(0)]));}));
   q.answer=poly(answer);q.workedAnswer=sum(u.map((x,i)=>poly([x,...Array(1-i).fill(0)])+'('+poly(v)+')'))+'\n= '+sum(terms)+'\n= '+q.answer;
   if((index===0&&k===1||index===1&&k===0)&&q.level==='basic'){
    if(j<3){q.presentation='multipart';q.group='Structured practice';q.parts=index===0?['Write the distributed form.','Expand both products.','Collect like terms.','State the simplified expression.']:['Distribute _x_ across the trinomial.','Distribute '+poly([u[1]])+' across the trinomial.','Write all six products.','Collect like terms.'];}
    else{q.presentation='compact';q.group='Independent practice';delete q.parts;}
   }else if(!q.presentation)q.presentation='compact';
   return q;
  });
 });
 l.meta.practiceLayout='textbook';l.meta.answerPolicy={final:index===0?'end':'autonomous',worked:'end',fallback:{final:'hidden',worked:'hidden'}};l.meta.completion={...l.meta.completion,description:'You have practised '+l.meta.title.toLowerCase()+'. Review your answers and return to any pattern that needs more practice.',practised:['Distribute every term across the second bracket.','Keep signs attached to their terms.','Collect like terms to simplify the result.'],...(index===0?{nextLesson:{title:'Expanding a binomial by a trinomial',url:'expanding-binomial-trinomial.html'}}:{})};// Remove only the rejected generated artwork; later supplied assets remain authored.
 for(const page of [...l.meta.frontMatter,l.meta.completion])if(/^Decorative (interlocking algebra blocks|algebra grid)/.test(page.image?.alt||''))delete page.image;
 a.practiceNote='Work in your exercise book. Choose Foundation or Moderate.';a.lede='';
 fs.writeFileSync(file,JSON.stringify(l,null,2)+'\n');console.log(slug+': '+a.questions.length+' independently numbered questions with authored working');
}
