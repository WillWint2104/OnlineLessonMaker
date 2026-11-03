import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

// Exercise both builders on disposable copies; never regenerate production fonts.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'y9-build-'));
for(const dir of ['scripts','src/geography/evidence'])fs.mkdirSync(path.join(temp,dir),{recursive:true});
for(const file of ['scripts/build-geography-evidence.mjs','scripts/vendor-fonts.mjs','src/geography/evidence/composition.css'])fs.copyFileSync(path.join(root,file),path.join(temp,file));
const modules=path.resolve(path.dirname(createRequire(import.meta.url).resolve('@fontsource/inter/package.json')),'../..');
fs.cpSync(path.join(modules,'@fontsource'),path.join(temp,'node_modules/@fontsource'),{recursive:true});
const original=fs.readFileSync(path.join(root,'lesson-studio.html'),'utf8');
const app=path.join(temp,'lesson-studio.html'),read=()=>fs.readFileSync(app,'utf8');
const run=file=>execFileSync(process.execPath,['scripts/'+file],{cwd:temp,encoding:'utf8'});
const block=/\/\* GEOGRAPHY_EVIDENCE_CSS_START \*\/[\s\S]*?\/\* GEOGRAPHY_EVIDENCE_CSS_END \*\/\n/;
const checkPosition=()=>{const html=read();assert(html.indexOf('/* GEOGRAPHY_EVIDENCE_CSS_START */')>html.indexOf('<!-- VENDORED-FONTS:END -->'));assert.equal(html.match(/GEOGRAPHY_EVIDENCE_CSS_START/g).length,1);};
fs.writeFileSync(app,original);run('build-geography-evidence.mjs');assert.equal(read(),original);checkPosition();
// The existing font generator's parser expects LF, as in the committed Git blob.
fs.writeFileSync(app,read().replaceAll('\r\n','\n'));
run('vendor-fonts.mjs');checkPosition();const rebuilt=read();run('build-geography-evidence.mjs');assert.equal(read().replaceAll('\r\n','\n'),rebuilt);
const cssBlock=original.match(block)[0];
const absent=original.replace(/\n<style>\n\/\* GEOGRAPHY_EVIDENCE_CSS_START \*\/[\s\S]*?\/\* GEOGRAPHY_EVIDENCE_CSS_END \*\/\n<\/style>/,'');
fs.writeFileSync(app,absent);run('build-geography-evidence.mjs');assert.equal(read(),original);checkPosition();
const legacy=absent.replace('</style>',()=>cssBlock+'</style>');
fs.writeFileSync(app,legacy);run('build-geography-evidence.mjs');assert.equal(read(),original);checkPosition();
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),complete:true,checks:['Existing standalone block is idempotent','Font regeneration retains the evidence CSS','Fresh insertion is outside vendor ownership','Legacy insertion migrates once without other byte changes'],temporaryCopy:temp,sourceUntouched:fs.readFileSync(path.join(root,'lesson-studio.html'),'utf8')===original};
if(process.env.Y9_BUILD_RECEIPT)fs.writeFileSync(process.env.Y9_BUILD_RECEIPT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
