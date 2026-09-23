// Local-only static review server; no build, external host, or deployment.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), port=Number(process.env.PORT||8099);
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.glb':'model/gltf-binary'};
http.createServer((req,res)=>{
 if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/lesson-studio.html':req.url.split('?')[0]));}catch{res.writeHead(400);return res.end();}
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end('Not found');}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('Local review: http://127.0.0.1:'+port));
