// Signed, scoped reader capabilities can be checked before any database lookup.
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=text=>Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export function createReaderTokens(secret){
 const key=crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 return {
  async issue(code,lesson,expiresAt){
   const nonce=encode(crypto.getRandomValues(new Uint8Array(16))),payload=encode(new TextEncoder().encode(JSON.stringify([code,lesson,Date.parse(expiresAt),nonce])));
   const signature=await crypto.subtle.sign('HMAC',await key,new TextEncoder().encode(payload));
   return payload+'.'+encode(new Uint8Array(signature));
  },
  async verify(token,code,lesson){
   try{
    if(typeof token!=='string'||token.length>1500)return null;
    const parts=token.split('.');if(parts.length!==2||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)&&encode(decode(p))===p))return null;
    if(!await crypto.subtle.verify('HMAC',await key,decode(parts[1]),new TextEncoder().encode(parts[0])))return null;
    const claims=JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if(!Array.isArray(claims)||claims.length!==4||claims[0]!==code||claims[1]!==lesson||!Number.isFinite(claims[2])||typeof claims[3]!=='string'||claims[3].length!==22)return null;
    return {expiresAt:claims[2]};
   }catch{return null;}
  }
 };
}
