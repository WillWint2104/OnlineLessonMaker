"""Build and extract-verify the actual tested M3 review package. No regression rerun."""
import argparse, hashlib, json, shutil, subprocess, tempfile, zipfile
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

parser=argparse.ArgumentParser()
parser.add_argument('verification',type=Path)
args=parser.parse_args()
root=Path.cwd().resolve()
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
status=subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],text=True).strip()
if status:raise RuntimeError('Packaging requires clean tracked source.')
verification=args.verification.resolve()
info=json.loads((verification/'logs/run-info.json').read_text(encoding='utf-8'))
if info['head']!=head or info.get('failures')!=0 or not info.get('exactHeadUnchanged'):raise RuntimeError('Exact-head receipt is missing, stale or failed.')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if sha(root/'lesson-studio.html')!=info['appSha256']:raise RuntimeError('App differs from tested source.')
out=root/'review-delivery'
out.mkdir(parents=True,exist_ok=True)
stage=Path(tempfile.mkdtemp(prefix='m3-package-',dir=out))
payload=stage/'payload'
payload.mkdir()
def copy(source,relative):
    target=payload/relative
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source,target)
    if sha(source)!=sha(target):raise RuntimeError('Copy mismatch '+str(source))
for relative in ['lesson-studio.html','CHANGELOG.md','scripts/build-graph-response.mjs','scripts/create-graph-response-fixture.mjs','scripts/verify-mathematics-graph.mjs','scripts/verify-mathematics-graph-ux.mjs','scripts/graph-review-gallery.mjs','scripts/package-graph-review.py']:
    copy(root/relative,relative)
for folder in ['assets','src/graph-response']:
    for p in (root/folder).rglob('*'):
        if p.is_file():copy(p,p.relative_to(root))
review=Path('docs/review/mathematics-m3')
for name in ['README.md','SCHEMA.md','workflow/graph-response-lesson.json']:
    copy(root/review/name,review/name)
for p in (root/review/'references').glob('*.png'):copy(p,review/'references'/p.name)
# Final exact-head captures/export/recording supersede all draft-run results.
focused=verification/'mathematics-m3'
for p in focused.rglob('*'):
    if not p.is_file():continue
    rel=p.relative_to(focused)
    if p.suffix=='.webm' and p.name!='graph-response-walkthrough.webm':continue
    if p.name=='last-state.png':continue
    copy(p,review/rel)
for p in (verification/'logs').glob('*'):copy(p,Path('verification/logs')/p.name)
if (verification/'review-receipt.json').exists():copy(verification/'review-receipt.json','verification/review-receipt.json')
receipt={**info,'focusedChecks':len(json.loads((focused/'results.json').read_text(encoding='utf-8'))['checks']),'packageSourceCommit':head,'mergeStatus':'draft; unmerged; visual/functional approval required','remoteRelease':'not deployed; local display preview only'}
(payload/'EXACT-HEAD-VERIFICATION.json').write_text(json.dumps(receipt,indent=2)+'\n')
guide=f'''# READ ME FIRST — Mathematics M3 Graph Response

Source commit: `{head}`. This is the actual implementation under review, not a handoff or static mock-up. The draft PR must remain unmerged until visual/functional approval.

1. Open `docs/review/mathematics-m3/index.html` for the gallery, original-resolution PNGs and browser recording.
2. Open `lesson-studio.html`, choose JSON, and import `docs/review/mathematics-m3/workflow/graph-response-lesson.json`. Study → Practice contains five real graph responses. Edit exposes the question inspector. Local release preview affects this display only.
3. Open `docs/review/mathematics-m3/workflow/published-graph-response.html` for the independently exported learner lesson. Its JSON deliberately uses autonomous answer access so the model/working/table/attempt hub can be inspected offline. The separate verification JSON retains teacher-group locks.
4. Try a line drag, a turning-point parabola drag, linked table edits, separate sketch strokes, Expand/return, Undo/Redo, the Answer Hub and authored axes/tools/models/release groups.

Direct file opening is verified. If your browser restricts local files, serve the extracted ZIP root with a local HTTP server (for example `python -m http.server 8138`) and open the gallery path on that server. Keep the extracted directory structure. The application and learner graph interface use local/embedded assets; external source links and reference-file CDN dependencies are not claimed to work offline.

Recording: `docs/review/mathematics-m3/workflow/graph-response-walkthrough.webm`. Captures and screenshot index are in the gallery folder. The supplied four mockups are in `references/`. Schema and HGL reuse audit are linked from the gallery; prototype source is `src/graph-response/`, with the original HGL reference and reproducible extraction in `assets/vendor/hgl-graph/`.

`EXACT-HEAD-VERIFICATION.json` identifies the clean, unchanged tested source. Full gate logs and focused results are included. Draft-run metadata is excluded. `SHA256SUMS.txt` covers every payload file except itself; `PACKAGING-VERIFICATION.json` records extraction, link, non-empty media and source-copy checks. This integrity check does not rerun application tests.

Limits: session memory only, no automatic marking, no remote teacher release/Supabase deployment and no full HGL teacher-builder UI. Teacher-video setup, tablet question-reference work and curriculum expansion remain deferred. M1/M2 architecture and production lessons are unchanged.
'''
(payload/'READ-ME-FIRST.md').write_text(guide,encoding='utf-8')
subprocess.run(['node',str(root/'scripts/graph-review-gallery.mjs'),str(payload/review)],check=True)
class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('src','href','poster') and value:self.links.append(value)
def check_links(base):
    checked=[]
    for file in [base/review/'index.html',base/'lesson-studio.html',base/review/'workflow/published-graph-response.html']:
        parser=Links();parser.feed(file.read_text(encoding='utf-8'))
        for link in parser.links:
            url=urlparse(link)
            if url.scheme or url.netloc or not url.path or url.path.startswith('/'):continue
            target=(file.parent/unquote(url.path)).resolve()
            if not target.exists():raise RuntimeError(f'Broken local link: {file.relative_to(base)} -> {link}')
            checked.append(str(target.relative_to(base)))
    return checked
links=check_links(payload)
media=[p for p in (payload/review).rglob('*') if p.suffix in ('.png','.webm')]
if any(p.stat().st_size==0 for p in media):raise RuntimeError('Empty capture/recording.')
packaging={'sourceCommit':head,'appMatchesExactHead':True,'copiedFilesMatchOriginals':True,'localLinksChecked':len(links),'nonEmptyMedia':len(media),'source':'final exact-head captures and exports only','archiveExtraction':'verified after creation; all payload SHA-256 values match'}
(payload/'PACKAGING-VERIFICATION.json').write_text(json.dumps(packaging,indent=2)+'\n')
files=sorted(p for p in payload.rglob('*') if p.is_file())
manifest=''.join(sha(p)+'  '+p.relative_to(payload).as_posix()+'\n' for p in files)
(payload/'SHA256SUMS.txt').write_text(manifest,encoding='utf-8')
archive=out/f'mathematics-m3-{head[:7]}-review.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in sorted(payload.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(payload).as_posix())
extracted=stage/'extracted'
with zipfile.ZipFile(archive) as z:
    if z.testzip():raise RuntimeError('ZIP CRC verification failed.')
    z.extractall(extracted)
for p in payload.rglob('*'):
    if p.is_file() and sha(p)!=sha(extracted/p.relative_to(payload)):raise RuntimeError('Extracted hash mismatch.')
check_links(extracted)
archive.with_suffix('.zip.sha256').write_text(sha(archive)+'  '+archive.name+'\n')
print(json.dumps({'zip':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive),'files':len(files)+1,'localLinksChecked':len(links),'extracted':str(extracted)},indent=2))
