/** Reusable Mathematics-specific expectations; never applied to Geography reviews. */
export function reviewExpectations(lesson,expected={}){
 const checks=[],issues=[],coveredNotes=[],check=(ok,name)=>{checks.push({name,pass:!!ok});if(!ok)issues.push(name);};
 const activities=(lesson.slides||[]).flatMap(s=>s.activities||[]),questions=activities.flatMap(a=>a.questions||[]),examples=activities.flatMap(a=>(a.workedExamples||[]).flatMap(g=>g.examples||[]));
 const ids=questions.map(q=>q.id),allIds=[];function collect(x){if(x&&typeof x==='object'){if(Object.hasOwn(x,'id'))allIds.push(x.id);Object.values(x).forEach(collect);}}collect(lesson);
 check(ids.every(id=>typeof id==='string'&&id.trim())&&allIds.length===new Set(allIds).size,'Stable nonempty unique authored question IDs');
 if(expected.questionIds)check(Array.isArray(expected.questionIds)&&JSON.stringify([...ids].sort())===JSON.stringify([...expected.questionIds].sort()),'All expected question IDs retained');
 if(expected.questionCount!=null)check(questions.length===expected.questionCount,'Expected realised question count');
 const present=x=>typeof x==='string'&&!!x.trim(),answerCoverage={total:questions.length,final:questions.filter(q=>present(q.answer)).length,worked:questions.filter(q=>present(q.workedAnswer)).length,exampleTotal:examples.length,exampleFinal:examples.filter(e=>present(e.answer)).length,exampleWorked:examples.filter(e=>Array.isArray(e.steps)&&e.steps.length&&e.steps.every(s=>present(s.math))).length};
 if(expected.requireFullAnswers)check(questions.length>0&&answerCoverage.final===questions.length&&answerCoverage.worked===questions.length&&answerCoverage.exampleFinal===examples.length&&answerCoverage.exampleWorked===examples.length,'Full final-answer and worked-answer coverage');
 for(const [id,counts]of Object.entries(expected.coreSkillCounts||{})){for(const [level,n]of Object.entries(counts))check(Number.isInteger(n)&&n>=0&&questions.filter(q=>q.archetypeId===id&&q.level===level).length===n,id+': expected '+level+' practice count');}
 if(expected.coreSkillCounts)check(questions.every(q=>Object.hasOwn(expected.coreSkillCounts,q.archetypeId)&&Object.hasOwn(expected.coreSkillCounts[q.archetypeId],q.level)),'Every question belongs to an expected instructional skill/level');
 for(const [id,intent]of Object.entries(expected.skillIntents||{})){const ex=examples.find(e=>e.id===id);check(!!ex&&ex.tabLabel===intent.tabLabel&&(!intent.instructionsInclude||ex.practice?.instructions?.includes(intent.instructionsInclude)),id+': instructional skill intent');}
 for(const token of expected.forbiddenText||[])check(!JSON.stringify(lesson).includes(token),'No forbidden authored notation: '+token);
 if(expected.videoUrl)check((lesson.slides||[]).some(s=>s.video?.url===expected.videoUrl),'Authoritative video URL retained');
 if(expected.twoStepExample){const ex=examples.find(e=>e.id===expected.twoStepExample);check(ex?.steps?.length===2&&!ex.steps.some(s=>s.math.replace(/[\s$]/g,'')==='a=a'),'Same-denominator example has useful two-step working');}
 const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
 for(const fact of expected.exampleFacts||[]){const ex=examples.find(e=>e.id===fact.exampleId),index=ex?.steps?.findIndex(s=>s.id===fact.stepId),parts=[...String(ex?.prompt||'').matchAll(/\\frac\{(\d+)\}\{(\d*)([a-z])\}/g)];let correct=false;
  if(fact.kind==='lowest-common-denominator'&&index>=0&&parts.length===2&&parts[0][3]===parts[1][3]){const a=+(parts[0][2]||1),b=+(parts[1][2]||1),lcd=a*b/gcd(a,b);correct=ex.steps[index].math==='$'+(lcd===1?'':lcd)+parts[0][3]+'$';}
  check(correct,fact.exampleId+': expected worked-example mathematical fact '+fact.stepId);if(correct)coveredNotes.push(fact.exampleId+':worked:'+index);
 }
 for(const [id,rule]of Object.entries(expected.fractionSkills||{})){
  const qs=questions.filter(q=>q.archetypeId===id);check(qs.length>0,id+': fraction skill exists');
  for(const q of qs){const parts=[...String(q.stem).matchAll(/\\frac\{(\d+)\}\{(\d*)([a-z])\}/g)];
   const shape=parts.length===2&&parts[0][3]===parts[1][3]&&/^\$\\frac\{\d+\}\{\d*[a-z]\}\s*[+-]\s*\\frac\{\d+\}\{\d*[a-z]\}\$$/.test(q.stem);
   check(shape,q.id+': supported two-fraction skill form');if(!shape)continue;
   const [p1,p2]=parts,n1=+p1[1],d1=+(p1[2]||1),n2=+p2[1],d2=+(p2[2]||1),variable=p1[3];
   if(rule.inputsReduced)check(gcd(n1,d1)===1&&gcd(n2,d2)===1,q.id+': reduced starting fractions');
   if(rule.denominators)check(rule.denominators==='same'?d1===d2:rule.denominators==='different'&&d1!==d2,q.id+': denominator skill intent');
   const lcd=d1*d2/gcd(d1,d2),n=n1*lcd/d1+(q.stem.includes(' - ')?-1:1)*n2*lcd/d2;
   if(rule.resultRequiresReduction)check(n!==0&&gcd(n,lcd)>1,q.id+': combined result requires cancellation');
   if(rule.lowestCommonDenominator)for(const [i,line]of String(q.workedAnswer).split('\n').entries())if(line.startsWith('Lowest common denominator: ')){const correct=line==='Lowest common denominator: $'+(lcd===1?'':lcd)+variable+'$';check(correct,q.id+': correct lowest common denominator');if(correct)coveredNotes.push(q.id+':worked:'+i);}
  }
 }
 return {checks,issues,coveredNotes,questionIds:ids,questionCount:questions.length,skillCounts:Object.fromEntries(Object.keys(expected.coreSkillCounts||{}).map(id=>[id,Object.fromEntries(['basic','moderate','advanced'].map(level=>[level,questions.filter(q=>q.archetypeId===id&&q.level===level).length]))])),answerCoverage};
}

/** Candidate status is evidence completeness, never publication/human approval. */
export function completeAcceptance({mode,expected,structure,numerical,widths,nativeZoom,roundTrip,errors,trackedSourceDirty}){
 const issues=[...structure.issues];
 if(!expected.questionIds?.length||expected.questionCount!==expected.questionIds.length)issues.push('Explicit expected stable question IDs/count required');
 if(!expected.requireFullAnswers)issues.push('Full answer expectations required');
 if(!Object.keys(expected.coreSkillCounts||{}).length||!Object.keys(expected.skillIntents||{}).length)issues.push('Explicit practice counts and instructional-skill intent required');
 if(!numerical?.complete)issues.push('Numerical coverage incomplete; inspect unsupported, insufficient and unverified material');
 if(![1536,1024,390].every(w=>widths.includes(w)))issues.push('Required responsive widths not all inspected');
 if(!nativeZoom||Math.abs(nativeZoom.dpr-2)>=.02||!['1','normal'].includes(nativeZoom.cssZoom))issues.push('Native 200% browser inspection required');
 if(!roundTrip)issues.push('Actual import/export/reopen required');
 if(errors.length)issues.push('Page errors present');
 if(trackedSourceDirty)issues.push('Clean exact-head source required for complete candidate');
 const checksComplete=mode==='complete'&&issues.length===0;
 return {outcome:checksComplete?'package-pending':mode==='smoke'?'smoke-only':'incomplete',checksComplete,completeCandidate:false,archiveIntegrity:'pending',issues,requiresHumanApproval:true};
}
