import fs from 'node:fs';
import path from 'node:path';

/** Same incrementing -v2, -v3 convention as package-artwork-packs.py.
 * Exclusive directory/ZIP creation makes concurrent runs fail safely too. */
export function safeEvidencePath(root,file){
 const absolute=path.resolve(root,file),relative=path.relative(root,absolute);
 if(!relative||path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep)||!['review-delivery','docs'+path.sep+'review'].some(p=>relative.startsWith(p+path.sep)))throw Error('Evidence output must stay under review-delivery/ or docs/review/');
 let at=absolute;while(!fs.existsSync(at))at=path.dirname(at);
 const real=fs.realpathSync(at),realRoot=fs.realpathSync(root),rel=path.relative(realRoot,real);
 if(path.isAbsolute(rel)||rel==='..'||rel.startsWith('..'+path.sep))throw Error('Evidence output escapes repository through a link');
 if(real!==path.resolve(at))throw Error('Evidence output cannot traverse a linked directory');
 return absolute;
}
export function reserveOutputs({root,slug,head,out,zip}){
 const stem=slug.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,90)+'-'+head.slice(0,7)+'-review';
 const occupied=z=>[z,z+'.sha256',z+'.receipt.json'].some(f=>fs.existsSync(f));
 if(zip){zip=safeEvidencePath(root,zip);if(path.extname(zip)!=='.zip'||occupied(zip))throw Error('Explicit archive already exists or is not a .zip: '+zip);}
 for(let i=1;;i++){
  const name=stem+(i===1?'':'-v'+i),directory=safeEvidencePath(root,out||path.join('review-delivery','mathematics-review',name));
  const archive=zip||safeEvidencePath(root,path.join('review-delivery','mathematics-review',name+'.zip'));
  if(archive.startsWith(directory+path.sep)||archive===directory)throw Error('ZIP must be outside the review directory');
  if(fs.existsSync(directory)||occupied(archive)){if(out||zip)throw Error('Explicit evidence path already exists');continue;}
  fs.mkdirSync(path.dirname(directory),{recursive:true});
  try{fs.mkdirSync(directory);}catch(e){if(e.code==='EEXIST'&&!out&&!zip)continue;throw e;}
  return {out:directory,zip:archive};
 }
}
