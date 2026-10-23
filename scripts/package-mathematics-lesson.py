"""Package one completed real-renderer review; verify local links, extraction and hashes."""
from pathlib import Path
from urllib.parse import urlsplit,unquote
from html.parser import HTMLParser
import hashlib,json,math,shutil,subprocess,sys,tempfile,zipfile

root=Path.cwd().resolve()
review=Path(sys.argv[1]).resolve();archive=Path(sys.argv[2]).resolve()
for candidate in [review,archive]:
 if not any(candidate.is_relative_to(root/base) and candidate != root/base for base in ['review-delivery','docs/review']):raise RuntimeError('Evidence paths must remain in repository review directories')
for name in [archive,Path(str(archive)+'.sha256'),Path(str(archive)+'.receipt.json')]:
 if name.exists():raise RuntimeError('Refusing to overwrite prior evidence: '+str(name))
if archive.is_relative_to(review):raise RuntimeError('ZIP output must be outside the reviewed directory')
report=json.loads((review/'results.json').read_text(encoding='utf-8'))
if not report.get('passed') or report.get('reviewMode')!='complete' or not report.get('acceptance',{}).get('checksComplete') or report.get('errors'):raise RuntimeError('Refusing to package a smoke/failed/incomplete review as a complete candidate')
numeric=report.get('numericalVerification',{})
if report['acceptance'].get('issues') or report.get('structure',{}).get('issues') or not numeric.get('complete') or numeric.get('unverified') or any(numeric.get(k) for k in ['failed','unsupported','insufficient']):raise RuntimeError('Review coverage is incomplete')
if not numeric.get('records') or any(r.get('status')!='verified-by-sampling' or r.get('valid',0)<16 or r['valid']/max(1,r.get('attempted',0))<.6 for r in numeric['records']):raise RuntimeError('Insufficient valid numerical coverage')
zoom=report.get('nativeZoom',{});dpr=zoom.get('dpr')
if not all(w in report.get('widths',[]) for w in [1536,1024,390]) or not isinstance(dpr,(int,float)) or isinstance(dpr,bool) or not math.isfinite(dpr) or abs(dpr-2)>=.02 or zoom.get('cssZoom') not in ['1','normal'] or not report.get('roundTrip'):raise RuntimeError('Responsive/native-200/import-export-reopen checks incomplete')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()!=report['head']:raise RuntimeError('Review source HEAD is stale')
if report.get('trackedSourceDirty') or subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],text=True).strip():raise RuntimeError('Complete candidate requires clean tracked source')
for name,digest in report['sourceHashes'].items():
 if not (root/name).resolve().is_relative_to(root) or sha(root/name)!=digest:raise RuntimeError('Review source changed: '+name)
if report.get('expectations',{}).get('sha256')!=sha(review/'EXPECTATIONS.json'):raise RuntimeError('Expectations identity mismatch')
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
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for p in sorted(payload.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(payload).as_posix())
extracted=stage/'extracted'
with zipfile.ZipFile(archive)as z:
 if z.testzip()is not None:raise RuntimeError('Archive CRC failed')
 z.extractall(extracted)
for line in(extracted/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
 digest,name=line.split('  ',1)
 if sha(extracted/name)!=digest:raise RuntimeError('Extracted manifest mismatch: '+name)
receipt={'format':2,'completeReviewCandidate':True,'humanApproval':'PENDING','reviewMode':report['reviewMode'],'acceptanceOutcome':'verified-complete-review-candidate','input':report['input'],'sourceSha256':report['sourceSha256'],'applicationSha256':report['applicationSha256'],'expectations':report['expectations'],'sourceHashes':report['sourceHashes'],'questionCount':report['questionCount'],'skillCounts':report['skillCounts'],'answerCoverage':report['answerCoverage'],'numericalVerification':{key:report['numericalVerification'][key] for key in ['attempted','valid','excluded','unsupported','failed','insufficient','complete']},'head':report['head'],'zip':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive),'captureCount':len(report['captures']),'localLinksResolved':links,'sourceCopyHashes':'matched','extraction':'CRC and SHA-256 manifest passed','extracted':str(extracted)}
with archive.with_suffix('.zip.sha256').open('x',encoding='utf-8') as f:f.write(receipt['sha256']+'  '+archive.name+'\n')
with archive.with_suffix('.zip.receipt.json').open('x',encoding='utf-8') as f:f.write(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
