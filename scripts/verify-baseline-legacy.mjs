// Reproduce failed legacy gates against the verified starting app without changing the checkout.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync,spawn} from 'node:child_process';
const root=process.cwd(), ref='2189477ef628e002a18323fe1e0ee1234e3b68bb';
const html=execFileSync('git',['show',ref+':lesson-studio.html'],{encoding:'utf8',maxBuffer:8*1024*1024});
const server=http.createServer((req,res)=>{
 if(req.url==='/lesson-studio.html'){res.setHeader('Content-Type','text/html');return res.end(html);}
 if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}
 const file=path.resolve(root,'.'+req.url.split('?')[0]);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const temp='scripts/.baseline-legacy.tmp.mjs';
try{
 const results=[];
 for(const [name,signature] of [['media',"waiting for locator('#slide .hero')"],['newtypes',"reading 'focus'"],['pack-fixes',"reading 'click'"],['theme-pack',"reading 'disabled'"],['infographic',"waiting for locator('.ig-bar')"]]){
  const base=`http://127.0.0.1:${server.address().port}`;
  // Historical reproduction uses the original failing tests, not today's corrected harnesses.
  fs.writeFileSync(temp,execFileSync('git',['show','0c3a8e1:scripts/verify-'+name+'.mjs'],{encoding:'utf8'}).replace('http://localhost:8099',base));
  const proc=spawn(process.execPath,[temp],{env:{...process.env,BASE:base}});let output='';proc.stdout.on('data',d=>output+=d);proc.stderr.on('data',d=>output+=d);
  const code=await new Promise(r=>proc.on('close',r));
  fs.writeFileSync('docs/review/shared-player/logs/baseline-'+name+'.log','Base '+ref+'\n'+output);
  const confirmed=code!==0&&output.includes(signature);const result={name,code,confirmed,signature};results.push(result);console.log(JSON.stringify(result));
 }
 fs.writeFileSync('docs/review/shared-player/logs/baseline-results.json',JSON.stringify(results,null,2));
 process.exitCode=results.every(r=>r.confirmed)?0:1;
}finally{fs.unlinkSync(temp);server.close();}
