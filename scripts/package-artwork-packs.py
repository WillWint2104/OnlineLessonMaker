"""Package only successful, hash-bound artwork evidence; never overwrite an archive."""
import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

root = Path.cwd()
review = Path('docs/review/artwork-packs')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
report = json.loads((review / 'results.json').read_text(encoding='utf-8'))

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

assert report['passed'] and not report['errors']
assert report['head'] == head and not report['trackedSourceDirty']
assert not subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], text=True).strip()
assert digest(root / 'lesson-studio.html') == report['applicationSha256']
for capture in report['captures']:
    assert digest(review / capture['file']) == capture['sha256']

delivery = root / 'review-delivery'
delivery.mkdir(exist_ok=True)
archive = delivery / f'artwork-packs-{head[:7]}-review.zip'
iteration = 2
while archive.exists():
    archive = delivery / f'artwork-packs-{head[:7]}-review-v{iteration}.zip'
    iteration += 1

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = []
    def handle_starttag(self, tag, attributes):
        self.values += [value for key, value in attributes if value and key in ('src', 'href')]

with tempfile.TemporaryDirectory(prefix='artwork-package-', dir=delivery) as temporary:
    stage = Path(temporary) / 'stage'
    stage.mkdir()
    files = [Path('lesson-studio.html'), Path('docs/artwork-packs.md'), Path('docs/development/tasks/ART-001.md'), Path('scripts/build-artwork-packs.mjs'), Path('scripts/build-mathematics-micro.mjs'), Path('scripts/verify-artwork-packs.mjs'), Path('scripts/package-artwork-packs.py'), Path('src/artwork/packs.js'), Path('src/mathematics/micro-lesson/micro.js')]
    for directory in [review, Path('assets')]:
        files += [p for p in directory.rglob('*') if p.is_file()]
    for file in files:
        target = stage / file
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, target)
        assert digest(target) == digest(file)
    (stage / 'READ-ME-FIRST.md').write_text(f'''# Artwork pack review — {head}

Open docs/review/artwork-packs/index.html for actual application captures and runnable learner exports. The six exports and editable JSON live in workflow/; screenshots in captures/. AUDIT.md records the baseline; docs/artwork-packs.md contains IDs, fallback and generation guidance. results.json and logs/ contain actual verification receipts, not inferred passes.

Open lesson-studio.html, choose Edit → JSON and import a workflow/*.json to exercise authoring. The role preview, upload/URL, crop/focal controls and Use pack image are the real application. Source and local assets retain their relative paths. Direct file opening works; alternatively serve this extracted root with python -m http.server 8099.

Artwork is embedded procedural SVG, with no remote image dependency. External video/media playback is separate and is not claimed offline. Existing legacy PNG artwork and production lessons were not modified. No other subject packs, backend deployment or new renderer are included. This is a visual-review candidate, not a merge/deployment receipt.
''', encoding='utf-8')
    links = Links()
    links.feed((stage / review / 'index.html').read_text(encoding='utf-8'))
    resolved = 0
    for value in links.values:
        url = urlsplit(value)
        if url.scheme or url.netloc or not url.path:
            continue
        target = (stage / review / unquote(url.path)).resolve()
        assert target.is_relative_to(stage.resolve()) and target.is_file(), value
        resolved += 1
    manifest = {p.relative_to(stage).as_posix(): digest(p) for p in stage.rglob('*') if p.is_file()}
    (stage / 'SHA256-MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    with zipfile.ZipFile(archive, 'x', zipfile.ZIP_DEFLATED) as package:
        for file in stage.rglob('*'):
            if file.is_file():
                package.write(file, file.relative_to(stage).as_posix())
    extracted = Path(temporary) / 'extracted'
    with zipfile.ZipFile(archive) as package:
        assert package.testzip() is None
        package.extractall(extracted)
    for name, expected in manifest.items():
        assert digest(extracted / name) == expected, name
    receipt = {'head': head, 'zip': str(archive), 'bytes': archive.stat().st_size, 'sha256': digest(archive), 'captures': len(report['captures']), 'manifestFiles': len(manifest), 'localLinksResolved': resolved, 'originalsMatch': True, 'extraction': 'CRC and SHA-256 manifest passed'}
    Path(str(archive) + '.sha256').write_text(receipt['sha256'] + '  ' + archive.name + '\n', encoding='ascii')
    Path(str(archive) + '.receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt))
