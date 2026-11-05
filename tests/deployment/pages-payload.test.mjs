import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import test from 'node:test';import {execFileSync} from 'node:child_process';
import {stagePages,verifyStage,checkedPath,excluded} from '../../scripts/stage-pages.mjs';
import {verifyArtifact} from './verify-staged-site.mjs';
import {fileURLToPath} from 'node:url';
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['pipe','pipe','pipe']});
/** A committed miniature site exercises publication behaviour without real teacher data. */
function fixture(){
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'olm-pages-test-')),source=parent+'/source';fs.mkdirSync(source);git(source,['init','-q']);git(source,['config','core.autocrlf','false']);git(source,['config','core.symlinks','false']);
 const files={'index.html':'<a href="lesson-studio.html">Studio</a>','lesson-studio.html':'<h1>Studio</h1>','lessons/example.html':'<h1>Published</h1>','assets/font.woff2':'font-bytes','interactives/tool.html':'<h1>Tool</h1>','docs/lessons/example/README.md':'Supported teacher resource','docs/review/geography-y9-01/teacher-guide.html':'TEST_ONLY_WITHHELD','docs/review/new/deep/future.json':'TEST_ONLY_WITHHELD','.github/workflows/private.yml':'Not a website file','.gitignore':'ignored.txt\n'};
 for(const [name,text]of Object.entries(files)){fs.mkdirSync(path.dirname(source+'/'+name),{recursive:true});fs.writeFileSync(source+'/'+name,text);}commit(source);return {parent,source,output:parent+'/stage',files};
}
function commit(source){git(source,['add','-A']);git(source,['-c','user.name=Pages test fixture','-c','user.email=pages-test@example.invalid','commit','-qm','Fixture']);}

test('Copies the committed site byte-for-byte; excludes nested reviews/Git internals and ignores untracked files',()=>{
 const f=fixture();fs.writeFileSync(f.source+'/ignored.txt','UNTRACKED_TEST');const r=stagePages(f.source,f.output);assert.equal(r.excludedReviewFiles,2);assert.equal(r.excludedGitFiles,1);assert.equal(r.preservedFiles,7);
 for(const file of r.files)assert(fs.readFileSync(f.source+'/'+file.file).equals(fs.readFileSync(f.output+'/'+file.file)));
 assert(!fs.existsSync(f.output+'/docs/review'));assert(!fs.existsSync(f.output+'/.github'));assert(!fs.existsSync(f.output+'/ignored.txt'));
 assert(fs.existsSync(f.output+'/docs/lessons/example/README.md'));assert.deepEqual(verifyStage(f.source,f.output),r);
});
test('Fresh output is mandatory; stale payloads and inside-checkout destinations cannot be reused',()=>{
 const f=fixture();fs.mkdirSync(f.output);fs.writeFileSync(f.output+'/stale.html','old');assert.throws(()=>stagePages(f.source,f.output));assert.equal(fs.readFileSync(f.output+'/stale.html','utf8'),'old');assert.throws(()=>stagePages(f.source,f.source+'/site'));
});
test('Rejects path aliases and excludes case variants of the review boundary',()=>{
 for(const name of ['../docs/review/a','docs//review/a','docs\\review\\a','/docs/review/a','C:/docs/review/a','docs/../review/a','a\nfile'])assert.throws(()=>checkedPath(name));
 assert(excluded('Docs/Review/nested/answer.json'));assert(!excluded('docs/lessons/review-notes.md'));
});
test('Rejects tracked symlinks even when Windows stores the link as a regular file',()=>{
 const f=fixture(),name='alias.html';fs.writeFileSync(f.source+'/'+name,'docs/review/geography-y9-01/teacher-guide.html');git(f.source,['add',name]);const blob=git(f.source,['hash-object',name]).trim();git(f.source,['update-index','--cacheinfo','120000,'+blob+','+name]);git(f.source,['-c','user.name=Pages test fixture','-c','user.email=pages-test@example.invalid','commit','-qm','Link fixture']);assert.throws(()=>stagePages(f.source,f.output),/Links\/submodules/);
});
test('Rejects hard-linked aliases of excluded files',()=>{
 const f=fixture();fs.linkSync(f.source+'/docs/review/geography-y9-01/teacher-guide.html',f.source+'/alias.html');commit(f.source);assert.throws(()=>stagePages(f.source,f.output),/Unsafe payload/);
});
test('Dirty tracked source and changed staged bytes fail verification',()=>{
 const f=fixture();stagePages(f.source,f.output);fs.appendFileSync(f.output+'/index.html','changed');assert.throws(()=>verifyStage(f.source,f.output),/Staged bytes differ/);fs.appendFileSync(f.source+'/index.html','changed');assert.throws(()=>stagePages(f.source,f.parent+'/new-stage'),/Tracked source must be clean/);
});
test('Injected nested review directories and unexpected files fail validation',()=>{
 const f=fixture();stagePages(f.source,f.output);fs.mkdirSync(f.output+'/docs/review/new',{recursive:true});assert.throws(()=>verifyStage(f.source,f.output),/Excluded path/);
 const g=fixture();stagePages(g.source,g.output);fs.writeFileSync(g.output+'/unexpected.txt','extra');assert.throws(()=>verifyStage(g.source,g.output),/inventory differs/);
});
test('A copied-directory symlink cannot bypass post-copy validation',t=>{
 const f=fixture();stagePages(f.source,f.output);try{fs.symlinkSync(f.source+'/docs/review',f.output+'/alias',process.platform==='win32'?'junction':'dir');}catch(e){if(['EPERM','EACCES'].includes(e.code)){t.skip('Physical symlink creation unavailable; tracked-link mode rejection covered separately');return;}throw e;}assert.throws(()=>verifyStage(f.source,f.output),/Link in staging/);
});
test('Actual uploadable tar matches staged inventory/hashes and rejects a tar containing review files',()=>{
 const f=fixture(),r=stagePages(f.source,f.output),archive=f.parent+'/artifact.tar';
 const tar=process.platform==='win32'&&fs.existsSync('C:/Program Files/Git/usr/bin/tar.exe')?'C:/Program Files/Git/usr/bin/tar.exe':'tar';
 const gnu=execFileSync(tar,['--version'],{encoding:'utf8'}).includes('GNU tar');
 execFileSync(tar,[...(gnu?['--dereference','--hard-dereference',...(process.platform==='win32'?['--force-local']:[])]:[]),'--directory',f.output,'-cf',archive,'--exclude=.git','--exclude=.github','.']);assert.equal(verifyArtifact(archive,r).filesVerified,r.preservedFiles);
 const bad=f.parent+'/bad.tar';execFileSync('tar',['-cf',bad,'-C',f.source,'docs/review']);assert.throws(()=>verifyArtifact(bad,r),/Excluded archive path/);
});
test('Workflow guards keep failed staging from upload/deploy and propose manual main-only releases',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),workflow=fs.readFileSync(root+'/.github/workflows/deploy-pages.yml','utf8');
 assert(workflow.includes('workflow_dispatch:')&&!/^  push:/m.test(workflow));assert(workflow.includes("github.ref == 'refs/heads/main'"));assert(!workflow.includes('continue-on-error')&&!workflow.includes('always()'));
 assert(workflow.indexOf('node scripts/stage-pages.mjs')<workflow.indexOf('actions/upload-pages-artifact@v3'));assert(workflow.indexOf('Verify actual Pages upload archive')<workflow.indexOf('actions/deploy-pages@v4'));assert(workflow.includes('path: ${{ runner.temp }}/olm-pages'));
});
