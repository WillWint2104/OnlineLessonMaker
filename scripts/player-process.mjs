// Observe immediately after spawn, including failures that never emit exit.
export function observePlayer(child) {
 let finished=false,stopping=false;
 const completion=new Promise((resolve,reject)=>{
  const done=()=>{finished=true;resolve();};
  child.once('error',error=>stopping?reject(error):done());child.once('exit',done);
 });
 return async()=>{
  if(finished)return;
  stopping=true;
  child.kill();
  let timer;
  try{await Promise.race([completion,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Player server did not stop within five seconds')),5000);})]);}
  finally{clearTimeout(timer);}
 };
}
