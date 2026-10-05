import {createClassHandler} from './core.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
async function db(path:string,options:RequestInit={}){const r=await fetch(url+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers}});if(!r.ok){if(r.status===409)return null;throw Error('Database request failed');}const text=await r.text();return text?JSON.parse(text):true;}
const store={
 isTeacher:async(id:string)=>(await db('olm_teachers?user_id=eq.'+encodeURIComponent(id)+'&select=user_id')).length===1,
 insert:async(row:unknown)=>!!await db('olm_class_sessions',{method:'POST',body:JSON.stringify(row)}),
 find:async(code:string,lesson:string)=>(await db('olm_class_sessions?code=eq.'+code+'&lesson_id=eq.'+encodeURIComponent(lesson)+'&select=*'))[0],
 update:async(id:string,row:unknown)=>db('olm_class_sessions?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(row)}),
 rateLimit:async(request:Request,action:string)=>{const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown',digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+Deno.env.get('RATE_LIMIT_SALT'))),hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join(''),bucket=Math.floor(Date.now()/60000)+':'+(action==='read'?'read':'write')+':'+hash;return await db('rpc/olm_class_rate_limit',{method:'POST',body:JSON.stringify({bucket_key:bucket,max_hits:action==='read'?1200:60})});}
};
const authenticate=async(authorization:string)=>{if(!authorization.startsWith('Bearer '))return null;const r=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}});if(!r.ok)return null;return (await r.json()).id||null;};
const origins=(Deno.env.get('CLASS_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean);
Deno.serve(createClassHandler({store,authenticate,origins}));
