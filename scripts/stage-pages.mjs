// Build a byte-preserving Pages payload from committed paths; never publish review inputs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:40e6});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inside=(parent,child)=>{const relative=path.relative(parent,child);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));};

/** Reject ambiguous filesystem paths before joining them to either root. */
export function checkedPath(file){
 assert(typeof file==='string'&&file&&file===path.posix.normalize(file)&&!file.startsWith('/')&&!/[\\:\x00-\x1f\x7f]/.test(file)&&!file.split('/').some(p=>p==='.'||p==='..'),'Non-canonical payload path');
 return file;
}

/** Apply the review boundary and the existing Pages action's Git exclusions. */
export function excluded(file){
 checkedPath(file);const parts=file.toLowerCase().split('/');
 return parts.includes('.git')||parts.includes('.github')||(parts[0]==='docs'&&parts[1]==='review');
}

/** Read the immutable committed inventory, retaining checkout bytes for copying. */
function inventory(root){
 assert.equal(fs.realpathSync(git(root,['rev-parse','--show-toplevel']).trim()),root,'Source must be a Git checkout root');
 assert.equal(git(root,['status','--porcelain','--untracked-files=no']).trim(),'','Tracked source must be clean');
 const entries=git(root,['ls-tree','-rz','--full-tree','HEAD']).split('\0').filter(Boolean).map(row=>{
  const tab=row.indexOf('\t'),[mode,type]=row.slice(0,tab).split(' ');return {file:checkedPath(row.slice(tab+1)),mode,type};
 }).sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
 const selected=entries.filter(e=>!excluded(e.file)),seen=new Set();
 for(const required of ['index.html','lesson-studio.html'])assert(selected.some(e=>e.file===required),'Missing public entry point: '+required);
 for(const e of selected){
  assert(e.type==='blob'&&['100644','100755'].includes(e.mode),'Links/submodules are not deployable: '+e.file);
  const key=e.file.toLowerCase();assert(!seen.has(key),'Case-alias collision: '+e.file);seen.add(key);
 }
 return {head:git(root,['rev-parse','HEAD']).trim(),entries,selected};
}

/** Refuse symlink ancestors, hard-linked files and files escaping their source root. */
function regularFile(root,file){
 let current=root;
 for(const [index,part] of file.split('/').entries()){
  current=path.join(current,part);const stat=fs.lstatSync(current);
  assert(!stat.isSymbolicLink(),'Symlinks are not deployable: '+file);
  assert(index===file.split('/').length-1?stat.isFile()&&stat.nlink===1:stat.isDirectory(),'Unsafe payload entry: '+file);
 }
 assert(inside(root,fs.realpathSync(current)),'Payload escapes its root');return current;
}

/** Enumerate actual staged files, rejecting links and excluded paths, including empty directories. */
function stagedFiles(root,relative=''){
 const files=[];
 for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
  const file=relative?relative+'/'+entry.name:entry.name;checkedPath(file);assert(!excluded(file),'Excluded path in staging: '+file);
  const stat=fs.lstatSync(path.join(root,file));assert(!stat.isSymbolicLink(),'Link in staging');
  if(stat.isDirectory())files.push(...stagedFiles(root,file));
  else {assert(stat.isFile()&&stat.nlink===1,'Non-regular file in staging');files.push(file);}
 }
 return files.sort();
}

/** Independently reconcile exact source/stage inventories and every SHA-256. */
export function verifyStage(source,output){
 assert(!fs.lstatSync(output).isSymbolicLink(),'Stage root cannot be a symlink');
 const root=fs.realpathSync(source),stage=fs.realpathSync(output);assert(!inside(root,stage)&&!inside(stage,root),'Stage must be outside the source checkout');
 const before=inventory(root),actual=stagedFiles(stage),expected=before.selected.map(e=>e.file);assert.deepEqual(actual,expected,'Staged file inventory differs from source');
 const files=before.selected.map(e=>{
  const original=fs.readFileSync(regularFile(root,e.file)),copy=fs.readFileSync(regularFile(stage,e.file));
  assert(original.equals(copy),'Staged bytes differ: '+e.file);return {file:e.file,bytes:copy.length,sha256:sha(copy)};
 });
 assert.equal(git(root,['rev-parse','HEAD']).trim(),before.head,'Source head changed while validating');
 assert.equal(git(root,['status','--porcelain','--untracked-files=no']).trim(),'','Source changed while validating');
 return {head:before.head,complete:true,sourceFiles:before.entries.length,excludedReviewFiles:before.entries.filter(e=>e.file.toLowerCase().startsWith('docs/review/')).length,excludedGitFiles:before.entries.filter(e=>excluded(e.file)&&!e.file.toLowerCase().startsWith('docs/review/')).length,preservedFiles:files.length,totalBytes:files.reduce((n,f)=>n+f.bytes,0),files};
}

/** Create a fresh external directory; an existing/stale output always fails closed. */
export function stagePages(source,output){
 const root=fs.realpathSync(source),parent=fs.realpathSync(path.dirname(path.resolve(output))),stage=path.join(parent,path.basename(output));
 assert(!inside(root,stage)&&!inside(stage,root),'Stage must be outside the source checkout');
 const before=inventory(root);fs.mkdirSync(stage); // Exclusive: never delete or reuse a caller's directory.
 for(const e of before.selected){
  const file=regularFile(root,e.file),destination=path.join(stage,e.file);fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(file,destination,fs.constants.COPYFILE_EXCL);
 }
 const report=verifyStage(root,stage);assert.equal(report.head,before.head,'Source head changed during staging');return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){assert(['--source','--output','--manifest'].includes(args[i])&&args[i+1]&&!options[args[i]],'Usage: --output PATH --manifest PATH [--source CHECKOUT]');options[args[i]]=args[i+1];}
  assert(options['--output']&&options['--manifest'],'Output and manifest paths are required');
  const target=p=>path.join(fs.realpathSync(path.dirname(path.resolve(p))),path.basename(p));
  const source=fs.realpathSync(options['--source']||process.cwd()),output=target(options['--output']),manifest=target(options['--manifest']);
  assert(!inside(source,manifest)&&!inside(output,manifest),'Manifest must be outside source and payload');
  const report=stagePages(source,output);fs.writeFileSync(manifest,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({head:report.head,sourceFiles:report.sourceFiles,preservedFiles:report.preservedFiles,excludedReviewFiles:report.excludedReviewFiles,excludedGitFiles:report.excludedGitFiles,complete:true}));
 }catch(error){console.error('Pages staging failed: '+error.message);process.exitCode=1;}
}
