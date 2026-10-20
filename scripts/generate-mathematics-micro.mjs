import fs from 'node:fs';
import '../src/mathematics/micro-lesson/micro.js';
const source='docs/review/mathematics-micro/workflow/before.json';
const lesson=JSON.parse(fs.readFileSync(source,'utf8')),s=lesson.slides[0];
lesson.meta.id='cancelling-reversed-brackets-micro';lesson.meta.title='Cancelling When The Brackets Are Reversed';lesson.meta.frontMatter[0].title=lesson.meta.title;
lesson.meta.artworkPack='mathematics/algebra/signs';s.practiceComposition='micro';
lesson.meta.generation={version:1,sourceVideo:'https://youtu.be/bcyZjCbvUfM',thesis:'Factor out −1 to reverse subtraction order so factors or denominators match.',sourceEvidence:'Original supplied video-only lesson; three-skill progression specified by the teacher. Video transcript not independently available.'};
const byId=new Map(s.activities.map(a=>[a.id,a]));
const entries=[
  ['opposites-basic','reverse','Reverse a bracket','Simplify each expression. Rewrite reversed brackets by factoring out −1. Assume all denominators are non-zero.',
    'Simplify $\\frac{b-a}{a-b}$.',[
      ['b-a=-(a-b)','Factor out −1 to reverse the subtraction.'],
      ['\\frac{b-a}{a-b}=-\\frac{a-b}{a-b}','The same non-zero factor now appears above and below.'],
      ['=-1','Cancel the common factor and keep the negative.']
    ],'-1'],
  ['quadratic-factor','factor','Factor first','Factor first, then rewrite the reversed factor and simplify. Assume all denominators are non-zero.',
    'Simplify $\\frac{x^2-5x+6}{2-x}$.',[
      ['x^2-5x+6=(x-2)(x-3)','Factorise the numerator.'],
      ['2-x=-(x-2)','Reverse the denominator by taking out −1.'],
      ['\\frac{(x-2)(x-3)}{-(x-2)}=-(x-3)','Cancel the matching non-zero factor, with x ≠ 2.']
    ],'-(x-3)'],
  ['subtract-opposite','opposite','Opposite denominators','Rewrite the reversed denominator before combining the fractions. Assume all denominators are non-zero.',
    'Simplify $\\frac{1}{a-b}-\\frac{1}{b-a}$.',[
      ['b-a=-(a-b)','Rewrite the second denominator.'],
      ['\\frac{1}{a-b}-\\frac{1}{b-a}=\\frac{1}{a-b}+\\frac{1}{a-b}','Subtracting the negative fraction becomes addition.'],
      ['=\\frac{2}{a-b}','Combine the numerators, with a ≠ b.']
    ],'\\frac{2}{a-b}']
];
const selected=[];
for(const [id,family,title,instructions,prompt,steps,answer]of entries){
  const a=byId.get(id),ex=a.workedExamples[0].examples[0];
  a.title=title;ex.label='Worked example';ex.tabLabel=title;ex.prompt=prompt;ex.answer='$'+answer+'$';
  ex.steps=steps.map(([math,text],i)=>({id:ex.steps[i]?.id||ex.id+'-step-'+(i+1),math:'$'+math+'$',text}));
  ex.practice={instructions,generator:{family,counts:{basic:8,moderate:4}}};selected.push(a);
}
const intro=byId.get('reversed-introduction');intro.lede='Factor out −1 to reverse subtraction order so algebraic factors or denominators can match.';
intro.introduction.keyIdea='$b-a=-(a-b)$';intro.introduction.illustration='$\\frac{b-a}{a-b}=-\\frac{a-b}{a-b}=-1$, with $a\\ne b$.';
intro.introduction.title='Introduction';intro.introduction.method=['Look for the same terms in opposite order.','Factor first if needed.','Use a factor of −1 to make the order match.','Cancel non-zero factors or combine the fractions.'];
const practice=byId.get('reversed-practice');practice.lede='';practice.title='Core skills';
practice.questions=selected.flatMap(a=>{const ex=a.workedExamples[0].examples[0];return MathMicro.generate(ex.practice.generator.family,ex.practice.generator.counts,ex.id);});
s.activities=[intro,byId.get('reversed-video'),...selected,practice];
s.exampleCollections=[{id:practice.practiceCollectionId,title:'Core skills',members:selected.map(a=>a.workedExamples[0].examples[0].id)}];
// All three answers remain governed by the existing end-of-lesson policy.
lesson.meta.completion.practised=['Reverse subtraction using a factor of −1.','Factor before cancelling when needed.','Combine fractions with opposite denominators.'];
fs.writeFileSync('docs/review/mathematics-micro/workflow/lesson.json',JSON.stringify(lesson,null,2)+'\n');
console.log('Generated three core skills and '+practice.questions.length+' deterministic independent questions.');
