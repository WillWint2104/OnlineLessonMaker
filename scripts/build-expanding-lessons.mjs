// Split the actual teacher-authored combined test; retain skill/example identity.
import fs from 'node:fs';
const original=JSON.parse(fs.readFileSync('docs/lessons/expanding/source-combined.json'));
const defs=[
 {slug:'expanding-two-binomials',skill:0,sets:[
  [[[1,2],[1,4]],[[1,3],[1,5]],[[1,1],[1,7]],[[1,4],[1,6]],[[1,5],[1,8]],[[1,7],[1,9]]],
  [[[1,-2],[1,5]],[[1,-3],[1,4]],[[1,-1],[1,6]],[[1,4],[1,-3]],[[1,-7],[1,9]],[[1,-8],[1,5]]],
  [[[2,1],[1,-3]],[[2,3],[1,-4]],[[3,1],[1,-2]],[[3,2],[1,-3]],[[2,3],[3,-4]],[[3,2],[2,-5]]]
 ]},
 {slug:'expanding-binomial-trinomial',skill:1,sets:[
  [[[1,1],[1,2,3]],[[1,2],[1,1,2]],[[1,3],[1,2,1]],[[1,1],[1,3,4]],[[1,4],[1,5,6]],[[1,5],[1,4,7]]],
  [[[1,-1],[1,2,-3]],[[1,-2],[1,1,-4]],[[1,-3],[1,1,-2]],[[1,-2],[1,3,-1]],[[1,-5],[1,4,-6]],[[1,-4],[1,5,-7]]],
  [[[2,-1],[1,1,2]],[[2,-3],[1,2,1]],[[3,-1],[1,1,3]],[[3,-2],[1,2,4]],[[2,-3],[2,-1,4]],[[3,-2],[2,-3,5]]]
 ]}
];
function polynomial(coeff){return coeff.map((c,i)=>{const p=coeff.length-i-1;if(!c)return '';const t=(Math.abs(c)===1&&p?'':Math.abs(c))+(p?'_x_'+(p>1?'^'+p:''):'');return (c<0?' − ':' + ')+t;}).filter(Boolean).join('').replace(/^ \+ /,'').replace(/^ − /,'−');}
function expand(a,b){const result=Array(a.length+b.length-1).fill(0);a.forEach((v,i)=>b.forEach((w,j)=>result[i+j]+=v*w));return result;}
function image(title){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750"><rect width="1200" height="750" fill="#edf5f3"/><g stroke="#8ab4ad" stroke-width="2">${Array.from({length:12},(_,i)=>`<path d="M${i*100} 0v750"/>`).join('')}${Array.from({length:8},(_,i)=>`<path d="M0 ${i*100}h1200"/>`).join('')}</g><rect x="160" y="150" width="880" height="450" rx="24" fill="#fff" stroke="#365d63" stroke-width="4"/><text x="600" y="285" font-family="Georgia,serif" font-size="52" text-anchor="middle" fill="#142c32">Algebra</text><text x="600" y="410" font-family="Georgia,serif" font-size="60" text-anchor="middle" fill="#006b62">(x + 2)(x + 5)</text><text x="600" y="515" font-family="sans-serif" font-size="32" text-anchor="middle" fill="#142c32">${title}</text></svg>`;return {src:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),alt:'Decorative algebra grid with the expression (x + 2)(x + 5).'};}
for(const def of defs){
 const skill=structuredClone(original.slides[def.skill]),collection=skill.exampleCollections[0],worked=skill.activities.filter(a=>a.workedExamples),practice=skill.activities.find(a=>a.id.endsWith('-practice')),guided=skill.activities.find(a=>a.id.endsWith('-guided'));
 skill.activities=skill.activities.filter(a=>!a.id.endsWith('-guided'));practice.title='Practice';practice.practiceCollectionId=collection.id;practice.lede='Practise each worked-example archetype, starting with close repetition.';practice.practiceNote='Work in your exercise book. Complete Basic before Moderate, then deliberately reveal that group’s answers.';
 practice.questions=def.sets.flatMap((set,k)=>set.map(([a,b],j)=>{const expression='('+polynomial(a)+')('+polynomial(b)+')';return {id:skill.id+'-'+['positive','signs','coefficients'][k]+'-q'+(j+1),stem:'Expand and simplify '+expression+'.',archetypeId:worked[k].workedExamples[0].examples[0].id,level:j<4?'basic':'moderate',answer:polynomial(expand(a,b))};}));
 // Keep the scaffold as one independent Basic question, inside Practice.
 const scaffold=practice.questions.find(q=>q.stem===guided.questions[0].stem);if(scaffold){scaffold.id=guided.questions[0].id;scaffold.parts=structuredClone(guided.questions[0].parts);scaffold.workedAnswer=def.skill===0?'(_x_ + 4)(_x_ − 3)\n= _x_^2 − 3_x_ + 4_x_ − 12\n= _x_^2 + _x_ − 12':'(_x_ + 1)(_x_^2 + 2_x_ + 3)\n= _x_^3 + 2_x_^2 + 3_x_ + _x_^2 + 2_x_ + 3\n= _x_^3 + 3_x_^2 + 5_x_ + 3';}
 const lesson={meta:{...structuredClone(original.meta),id:def.slug,title:skill.title,description:skill.description,frontMatter:[{id:'lesson-overview',kind:'overview',title:skill.title,description:skill.description,image:image('Distribute every term')},{id:'lesson-outcomes',kind:'outcomes',title:'What you will learn',description:'By the end of this lesson, you should be able to:',intentions:[def.skill===0?'Expand the product of two binomials.':'Expand a binomial by a trinomial.','Keep negative signs attached to their terms.','Multiply coefficients and collect like terms.'],image:image('Model → practise → check')}],completion:{description:'Review any archetype that needs more practice. Finishing the pages is not a claim of assessed mastery.',image:image('Keep building competence')}},slides:[skill]};
 const dir='lessons/'+def.slug;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/lesson.json',JSON.stringify(lesson,null,2)+'\n');
 console.log(def.slug+': '+practice.questions.length+' independent questions; existing example IDs retained');
}
