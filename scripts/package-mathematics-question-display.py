"""Package existing exact-head C1 evidence; never generate substitute captures."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import shutil
import subprocess
import zipfile


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def read(file):
    return json.loads(file.read_text(encoding='utf-8'))


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['gallery', 'focused', 'regression', 'review', 'micro', 'output']:
        parser.add_argument('--' + name, required=True, type=Path)
    args = parser.parse_args()
    head = git('rev-parse', 'HEAD')
    require(not git('status', '--porcelain', '--untracked-files=no'), 'Tracked source must be clean.')
    gallery, focused = read(args.gallery / 'results.json'), read(args.focused / 'results.json')
    regression = read(args.regression / 'logs/run-info.json')
    review, micro = read(args.review), read(args.micro / 'results.json')
    app_hash = digest(Path('lesson-studio.html'))
    for name, receipt in [('gallery', gallery), ('focused', focused)]:
        require(receipt.get('head') == head and receipt.get('applicationSha256') == app_hash,
                name + ' does not cover the current application/head.')
        require(receipt.get('passed') and not receipt.get('errors'), name + ' verification failed.')
    require(regression.get('head') == head and regression.get('appSha256') == app_hash
            and regression.get('exactHeadUnchanged') and regression.get('failures') == 0,
            'Full regression must pass on the unchanged exact head.')
    require(review.get('head') == head and review.get('draft') is True
            and review.get('unmerged') is True and review.get('unresolvedThreads') == 0
            and review.get('codeRabbitExactHeadClean') is True and review.get('ciGreen') is True,
            'Final human-inspected CodeRabbit/CI receipt is incomplete.')
    require(micro.get('head') == head and micro.get('appSha256') == app_hash
            and micro.get('passed') and not micro.get('errors'), 'Micro compatibility gate must pass.')
    base = 'f5cc39d4a9e9076a0064e528b9e2eadf6649d885'
    protected = ['lessons', 'examples', 'assets', 'src/graph-response', 'src/mathematics/artwork-packs',
                 'src/mathematics/micro-lesson', 'src/humanities', 'src/map', 'supabase', '.github']
    changed_protected = git('diff', '--name-only', base, head, '--', *protected)
    require(not changed_protected, 'Protected source changed: ' + changed_protected)
    for capture in gallery['captures']:
        file = args.gallery / capture['file']
        require(digest(file) == capture['sha256'], 'Capture changed: ' + capture['file'])
    args.output.mkdir(parents=True, exist_ok=True)
    prefix = 'mathematics-question-display-c1-' + head[:7]
    version = 1
    while (args.output / (prefix + '-review-v' + str(version) + '.zip')).exists() or (
            args.output / (prefix + '-extracted-v' + str(version))).exists():
        version += 1
    root = args.output / (prefix + '-extracted-v' + str(version))
    root.mkdir()  # Exclusive allocation; existing review evidence is never overwritten.
    for source, target in [(args.gallery, 'gallery'), (args.focused, 'focused'),
                           (args.regression, 'regression'), (args.micro, 'micro')]:
        shutil.copytree(source, root / target)
    shutil.copy2(args.review, root / 'EXACT-HEAD-REVIEW.json')
    shutil.copytree('src/mathematics/question-display', root / 'source')
    shutil.copy2('tests/widgets/mathematics-question-display/lesson.json', root / 'source/fixture.json')
    shutil.copy2('docs/review/mathematics-question-display-c1/README.md', root / 'README.md')
    (root / 'source/change.patch').write_text(git('diff', '--binary', base, head), encoding='utf-8')
    receipt = dict(head=head, applicationSha256=app_hash, draft=True, unmerged=True,
                   deployed=False, published=False, captureCount=len(gallery['captures']),
                   focusedChecks=len(focused['checks']), regressionGates=regression['gates'],
                   protectedBase=base, protectedChanges=[], version=version)
    (root / 'PACKAGE.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    cards = ''.join('<figure><a href="gallery/{0}"><img loading="lazy" src="gallery/{0}" alt="{1}"></a>'
                    '<figcaption>{1}</figcaption></figure>'.format(
                        html.escape(c['file'], quote=True), html.escape(c['group'] + ' · ' + c['state']))
                    for c in gallery['captures'])
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Mathematics C1 integrated review</title><style>body{margin:24px;font:17px/1.5 system-ui;color:#142b31;background:#f4faf7}
a{color:#006b5d}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,450px),1fr));gap:24px}
figure{margin:0;padding:12px;background:white;border:1px solid #cbded3}img{width:100%;height:auto}figcaption{padding:8px}</style>
<h1>Mathematics C1 — integrated application review</h1><p>Exact head <code>HEAD</code>. Draft; no merge, deployment or lesson publication.</p>
<p>CAPTURES real captures. Open an image for full resolution. Native 200% uses browser zoom, DPR 2 and CSS zoom 1.</p>
<p>Runnable learner fixtures: <a href="gallery/exports/paper.html">Paper</a> · <a href="gallery/exports/typed.html">Typed</a> ·
<a href="gallery/exports/pen.html">Pen</a>. Use the lesson outline to open the skill and Answer Hub. These are synthetic verification fixtures.</p>
<p><a href="README.md">Scope and limits</a> · <a href="EXACT-HEAD-REVIEW.json">Review/CI receipt</a> ·
<a href="regression/logs/run-info.json">Full regression</a> · <a href="focused/results.json">Authoring/release checks</a> ·
<a href="gallery/results.json">Capture measurements</a> · <a href="source/fixture.json">Canonical fixture</a></p><main>CARDS</main></html>'''
    (root / 'index.html').write_text(page.replace('HEAD', head).replace('CAPTURES', str(len(gallery['captures'])))
                                   .replace('CARDS', cards), encoding='utf-8')
    # Hash every payload file, then independently verify both extracted and ZIP bytes.
    manifest = {p.relative_to(root).as_posix(): digest(p) for p in sorted(root.rglob('*')) if p.is_file()}
    (root / 'SHA256-MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    archive = args.output / (prefix + '-review-v' + str(version) + '.zip')
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED) as z:
        for file in sorted(root.rglob('*')):
            if file.is_file():
                z.write(file, file.relative_to(root).as_posix())
    with zipfile.ZipFile(archive) as z:
        require(z.testzip() is None, 'ZIP CRC failed.')
        for file, expected in manifest.items():
            require(digest(root / file) == expected and hashlib.sha256(z.read(file)).hexdigest() == expected,
                    'Manifest verification failed: ' + file)
    integrity = dict(zip=str(archive.resolve()), sha256=digest(archive), crc='passed',
                     manifestFiles=len(manifest), manifest='passed', gallery=str((root / 'index.html').resolve()))
    archive.with_suffix('.integrity.json').write_text(json.dumps(integrity, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(integrity, indent=2))


if __name__ == '__main__':
    main()
