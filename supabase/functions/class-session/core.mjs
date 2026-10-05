// Dependency-free handler shared by the Edge Function and local contract tests.
export function createClassHandler({store,authenticate,now=()=>Date.now(),code=()=>String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0'),readerToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join(''),origins=[]}){
 return async function handle(request){
  const origin=request.headers.get('origin')||'',allowed=origins.includes(origin),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
  const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowed)return respond({error:'Origin not allowed.'},403);if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return respond({error:'POST required.'},405);
  try{
   const text=await request.text();if(text.length>2_000_000)return respond({error:'Payload too large.'},413);const data=JSON.parse(text),{action,lessonId}=data;
   if(typeof lessonId!=='string'||!lessonId||lessonId.length>200)return respond({error:'Invalid lesson identity.'},400);
   if(!['start','release','end','join','read'].includes(action))return respond({error:'Unknown action.'},400);
   if(action!=='read'&&!await store.rateLimit(request,action))return respond({error:'Too many requests. Try again shortly.'},429);
   let teacher=null;if(['start','release','end'].includes(action)){teacher=await authenticate(request.headers.get('authorization')||'');if(!teacher||!await store.isTeacher(teacher))return respond({error:'Teacher authentication required.'},401);}
   if(action==='start'){
    const answers=data.answers;if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).length>1000)return respond({error:'Invalid answer bundle.'},400);
    const bundle=Object.create(null);for(const [id,q]of Object.entries(answers)){if(id.length>500||!q||typeof q.answer!=='string'||typeof q.workedAnswer!=='string'||q.answer.length>20000||q.workedAnswer.length>50000)return respond({error:'Invalid answer content.'},400);bundle[id]={answer:q.answer,workedAnswer:q.workedAnswer};}
    const expiresAt=new Date(now()+4*60*60*1000).toISOString();for(let attempt=0;attempt<8;attempt++){const c=code(),token=readerToken();if(await store.insert({code:c,reader_token:token,teacher_id:teacher,lesson_id:lessonId,answer_state:'locked',answer_bundle:bundle,expires_at:expiresAt}))return respond({code:c,readerToken:token,active:true,state:'locked',expiresAt});}return respond({error:'Unable to allocate a class code.'},503);
   }
   if(typeof data.code!=='string'||!/^\d{6}$/.test(data.code))return respond({error:'Invalid class code.'},400);
   let session=await store.find(data.code,lessonId);
   const active=!!session&&Date.parse(session.expires_at)>now();
   if(action==='read'){
    const reader=active&&typeof data.readerToken==='string'&&data.readerToken===session.reader_token;
    if(!await store.rateLimit(request,reader?'read':'guess',reader?session.reader_token:null))return respond({error:'Too many requests. Try again shortly.'},429);
    if(active&&!reader)return respond({error:'Join this class before polling.'},401);
   }
   if(!active)return respond({code:data.code,active:false,state:'locked',answers:{}});
   if(['release','end'].includes(action)){
    if(session.teacher_id!==teacher)return respond({error:'Only this session’s teacher can change it.'},403);
    if(action==='end'){await store.update(session.id,{answer_state:'locked',answer_bundle:{},expires_at:new Date(now()).toISOString()});return respond({code:data.code,active:false,state:'locked',answers:{}});}
    if(!['locked','finals','worked'].includes(data.state))return respond({error:'Invalid release state.'},400);
    session={...session,answer_state:data.state};await store.update(session.id,{answer_state:data.state});
   }
   const answers=Object.create(null);if(session.answer_state!=='locked')for(const [id,q]of Object.entries(session.answer_bundle))answers[id]=session.answer_state==='worked'?{answer:q.answer,workedAnswer:q.workedAnswer}:{answer:q.answer};
   return respond({code:data.code,readerToken:session.reader_token,active:true,state:session.answer_state,expiresAt:session.expires_at,answers});
  }catch{return respond({error:'Class service unavailable. Use the authored fallback.'},503);}
 };
}
