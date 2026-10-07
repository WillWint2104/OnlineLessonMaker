"""Package final exact-head Mathematics evidence; no application test rerun."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib, json, shutil, subprocess, sys, tempfile, zipfile

root = Path.cwd().resolve()
verification = Path(sys.argv[1]).resolve()
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
info = json.loads((verification / 'logs/run-info.json').read_text(encoding='utf-8'))
assert info['head'] == head and info['exactHeadUnchanged'] and info['failures'] == 0
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(root / 'lesson-studio.html') == info['appSha256']
subprocess.run([sys.executable, 'scripts/package-graph-review.py', str(verification)], check=True)
base = root / 'review-delivery' / f'mathematics-m3-{head[:7]}-review.zip'
stage = Path(tempfile.mkdtemp(prefix='mathematics-final-', dir=root / 'review-delivery'))
payload = stage / 'payload'
with zipfile.ZipFile(base) as z:
    z.extractall(payload)
copies = {}
def copy(source, relative):
    target = payload / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    assert sha(source) == sha(target)
    copies[str(relative).replace('\\', '/')] = sha(source)

for name in ['mathematics-visual-system', 'mathematics-m3-plane']:
    folder = verification / name
    result = json.loads((folder / 'results.json').read_text(encoding='utf-8'))
    assert result['head'] == head and result['appSha256'] == info['appSha256'] and not result['errors']
    for p in folder.rglob('*'):
        if p.is_file():
            copy(p, Path('docs/review') / name / p.relative_to(folder))
    copy(root / 'docs/review' / name / 'README.md', Path('docs/review') / name / 'README.md')
copy(root / 'docs/review/mathematics-visual-system/EXTENSIONS.md', 'docs/review/mathematics-visual-system/EXTENSIONS.md')
for folder in ['src/mathematics']:
    for p in (root / folder).rglob('*'):
        if p.is_file():
            copy(p, p.relative_to(root))
for name in ['build-mathematics-visual-system.mjs', 'verify-mathematics-visual-system.mjs', 'verify-graph-plane.mjs', 'package-mathematics-visual-system.py', 'verify-player-suite.mjs']:
    copy(root / 'scripts' / name, Path('scripts') / name)
guide = f'''# Mathematics final visual-system review — {head[:7]}

Source commit: `{head}`. Built on final M3 `f4d523991db5075032c7ef82bcc101bc735c2075`, with accepted visual reference `e755258216347e440dd509298b39856a4e1bad18` reapplied. Draft PR #169 remains unmerged. No deployment. Final visual/functional approval is required.

Start with **docs/review/mathematics-visual-system/index.html**. It contains the real full lesson, ordinary answers, multipart answers, worked rows, graph answers, authoring and desktop/tablet/mobile/native 200% captures. Each PNG is original resolution.

Runnable learner lessons: `docs/review/mathematics-visual-system/workflow/algebra-learner.html` and `graph-learner.html`. Editable JSON is beside them: `algebra-lesson.json`, `graph-lesson.json`, plus the authoring round-trip records. Open `lesson-studio.html`, choose JSON and import the corresponding lesson; Edit opens the actual inspector. Structured part answers and extra extent questions are labelled review fixtures. Production lesson JSON and supplied image bytes/focal settings are unchanged.

Additional evidence: `docs/review/mathematics-m3/index.html` has the complete M3 interaction/authoring/release workflow and `workflow/graph-response-walkthrough.webm`; `docs/review/mathematics-m3-plane/index.html` has shared-plane fixtures and measured glyph placement. Source, schema and HGL reuse audit are included. `docs/review/mathematics-visual-system/EXTENSIONS.md` describes compatible multipart/extent fields and deferred graph reading/intersection/comparison hooks.

Open files directly after extraction, preserving folders. If your browser restricts local files, serve the extracted ZIP root, e.g. `python -m http.server 8138`, then visit the gallery path. Embedded/local application assets are included. Authored YouTube links are retained, but remote requests were blocked for deterministic captures; video playback and remote source/CDN links are not claimed to work offline.

Exact-head regression: {info['gates']}/{info['gates']} gates passed on clean, unchanged tracked source. `EXACT-HEAD-VERIFICATION.json`, focused results and `verification/logs/` identify this final head. `verification/review-receipt.json` records GitHub/CodeRabbit state. No historical checkpoint receipts are presented as final results.

Limits: session-only learner responses, no automatic marking, no Supabase deployment, no new graph-reading tools. Teacher-video setup, tablet question-reference enhancement and curriculum expansion remain outside this pass. SHA256SUMS.txt covers all payload files except itself; PACKAGING-VERIFICATION.json records extraction/link/media/copy integrity.
'''
(payload / 'READ-ME-FIRST.md').write_text(guide, encoding='utf-8')
receipt = {**info, 'packageSourceCommit': head, 'mergeStatus': 'draft; unmerged; approval required', 'reviewFolders': ['mathematics-visual-system', 'mathematics-m3', 'mathematics-m3-plane']}
(payload / 'EXACT-HEAD-VERIFICATION.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls = []
    def handle_starttag(self, tag, attrs):
        self.urls.extend(v for k, v in attrs if k in ['href', 'src', 'poster'] and v)
def links(base):
    count = 0
    files = [base / 'lesson-studio.html', *list((base / 'docs/review').rglob('index.html')), *list((base / 'docs/review').rglob('workflow/*.html'))]
    for file in files:
        parser = Links(); parser.feed(file.read_text(encoding='utf-8'))
        for url in parser.urls:
            u = urlsplit(url)
            if u.scheme or u.netloc or not u.path or u.path.startswith('/'):
                continue
            target = (file.parent / unquote(u.path)).resolve()
            assert target.is_relative_to(base.resolve()) and target.exists(), (file, url)
            count += 1
    return count
for relative, digest in copies.items():
    assert sha(payload / relative) == digest
count = links(payload)
media = [p for p in (payload / 'docs/review').rglob('*') if p.suffix in ['.png', '.webm']]
assert media and all(p.stat().st_size > 0 for p in media)
(payload / 'PACKAGING-VERIFICATION.json').write_text(json.dumps({'sourceCommit': head, 'localLinksChecked': count, 'nonEmptyMedia': len(media), 'copiedFileHashes': copies, 'archiveExtraction': 'CRC and extracted SHA-256 values verified', 'scope': 'packaging integrity only'}, indent=2), encoding='utf-8')
manifest = payload / 'SHA256SUMS.txt'
manifest.write_text(''.join(sha(p) + '  ' + p.relative_to(payload).as_posix() + '\n' for p in sorted(payload.rglob('*')) if p.is_file() and p != manifest), encoding='utf-8')
archive = root / 'review-delivery' / f'mathematics-final-{head[:7]}-review.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in sorted(payload.rglob('*')):
        if p.is_file(): z.write(p, p.relative_to(payload).as_posix())
extracted = stage / 'extracted'
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    z.extractall(extracted)
for p in payload.rglob('*'):
    if p.is_file(): assert sha(p) == sha(extracted / p.relative_to(payload))
assert links(extracted) == count
archive.with_suffix('.zip.sha256').write_text(sha(archive) + '  ' + archive.name + '\n', encoding='utf-8')
print(json.dumps({'zip': str(archive), 'bytes': archive.stat().st_size, 'sha256': sha(archive), 'extracted': str(extracted), 'localLinksChecked': count}, indent=2))
