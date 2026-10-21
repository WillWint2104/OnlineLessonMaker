"""Package one completed real-renderer review; verify local links, extraction and hashes."""
from pathlib import Path
from urllib.parse import urlsplit,unquote
from html.parser import HTMLParser
import hashlib,json,shutil,subprocess,sys,tempfile,zipfile

review=Path(sys.argv[1]).resolve();archive=Path(sys.argv[2]).resolve()
if archive.is_relative_to(review):raise RuntimeError('ZIP output must be outside the reviewed directory')
report=json.loads((review/'results.json').read_text(encoding='utf-8'))
if not report.get('passed'):raise RuntimeError('Refusing to package a failed/incomplete review')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()!=report['head']:raise RuntimeError('Review source HEAD is stale')
for name,key in [('lesson.json','sourceSha256'),('learner.html','learnerSha256'),('authoring-roundtrip.json','authoringRoundtripSha256')]:
 if sha(review/name)!=report[key]:raise RuntimeError('Artifact changed after review: '+name)
for capture in report['captures']:
 if sha(review/capture['file'])!=capture['sha256']:raise RuntimeError('Capture changed after review')
assets=review/'assets'
asset_tree='\n'.join(sorted(p.relative_to(assets).as_posix()+' '+sha(p)for p in assets.rglob('*')if p.is_file()))
if hashlib.sha256(asset_tree.encode()).hexdigest()!=report['assetTreeSha256']:raise RuntimeError('Assets changed after review')
archive.parent.mkdir(parents=True,exist_ok=True)
stage=Path(tempfile.mkdtemp(prefix=archive.stem+'-',dir=archive.parent));payload=stage/'payload';payload.mkdir()
files=['index.html','lesson.json','learner.html','authoring-roundtrip.json','results.json','README.md']+[c['file']for c in report['captures']]
if(review/'EXPECTATIONS.json').exists():files.append('EXPECTATIONS.json')
for name in files:
 relative=Path(name)
 if relative.is_absolute()or'..'in relative.parts:raise RuntimeError('Unsafe review path: '+name)
 original=review/relative;target=payload/relative
 if not original.is_file()or not original.stat().st_size:raise RuntimeError('Missing/empty review file: '+name)
 target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(original,target)
 if sha(original)!=sha(target):raise RuntimeError('Copy mismatch: '+name)
shutil.copytree(review/'assets',payload/'assets')
for original in(review/'assets').rglob('*'):
 if original.is_file()and sha(original)!=sha(payload/'assets'/original.relative_to(review/'assets')):raise RuntimeError('Asset copy mismatch')
class LocalReferences(HTMLParser):
 def __init__(self):super().__init__();self.references=[]
 def handle_starttag(self,tag,attrs):self.references.extend(value for key,value in attrs if key in['src','href']and value)
links=0
for document in[payload/'index.html',payload/'learner.html']:
 parsed=LocalReferences();parsed.feed(document.read_text(encoding='utf-8'))
 for ref in parsed.references:
  url=urlsplit(ref)
  if url.scheme or not url.path or ref.startswith('#'):continue
  target=(document.parent/unquote(url.path)).resolve()
  if not target.is_relative_to(payload)or not target.is_file():raise RuntimeError('Unresolved local document link: '+ref)
  links+=1
manifest=payload/'SHA256SUMS.txt'
manifest.write_text(''.join(sha(p)+'  '+p.relative_to(payload).as_posix()+'\n'for p in sorted(payload.rglob('*'))if p.is_file()and p!=manifest),encoding='utf-8')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for p in sorted(payload.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(payload).as_posix())
extracted=stage/'extracted'
with zipfile.ZipFile(archive)as z:
 if z.testzip()is not None:raise RuntimeError('Archive CRC failed')
 z.extractall(extracted)
for line in(extracted/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
 digest,name=line.split('  ',1)
 if sha(extracted/name)!=digest:raise RuntimeError('Extracted manifest mismatch: '+name)
receipt={'head':report['head'],'zip':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive),'captureCount':len(report['captures']),'localLinksResolved':links,'sourceCopyHashes':'matched','extraction':'CRC and SHA-256 manifest passed','extracted':str(extracted)}
archive.with_suffix('.zip.sha256').write_text(receipt['sha256']+'  '+archive.name+'\n',encoding='utf-8')
archive.with_suffix('.zip.receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt))
