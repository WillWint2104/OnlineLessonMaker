param([string]$SourceCommit = 'HEAD', [string]$ReceiptsDirectory = 'review-delivery/m1-1-postmerge-receipts')
$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $workspace
$commit = (& git rev-parse $SourceCommit).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve source commit.' }
if ($commit -ne (& git rev-parse HEAD).Trim()) { throw 'Package only the checked-out verified source commit.' }
& git diff --quiet HEAD --
if ($LASTEXITCODE -ne 0) { throw 'Tracked working tree must be clean before packaging.' }
$short = $commit.Substring(0,7)
$delivery = Join-Path $workspace 'review-delivery'
$stage = Join-Path $delivery ('m1-1-package-' + [guid]::NewGuid().ToString())
$extract = Join-Path $delivery ('m1-1-extract-' + [guid]::NewGuid().ToString())
$archive = Join-Path $delivery "mathematics-m1-1-$short-review.zip"
if (Test-Path -LiteralPath $archive) { throw "Archive already exists: $archive" }
New-Item -ItemType Directory -Path $stage,$extract -Force | Out-Null
$files = @(& git ls-files) | Where-Object {
  $_ -eq 'lesson-studio.html' -or $_ -match '^assets/' -or
  $_ -match '^docs/review/mathematics-m1-1/' -or $_ -match '^docs/lessons/expanding/' -or
  $_ -match '^lessons/expanding-(two-binomials|binomial-trinomial)(/|\.html$)' -or
  $_ -match '^supabase/' -or $_ -match '^scripts/(build-expanding-textbook|build-mathematics-textbook-review|verify-mathematics-textbook|verify-class-session|verify-class-session-browser)\.mjs$'
}
foreach ($file in $files) {
  $destination = Join-Path $stage $file
  New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $workspace $file) -Destination $destination
}
$receiptCount = 0
if (Test-Path -LiteralPath $ReceiptsDirectory -PathType Container) {
  foreach ($receipt in Get-ChildItem -LiteralPath $ReceiptsDirectory -File | Where-Object Extension -eq '.json') {
    $destination = Join-Path $stage ('docs/review/mathematics-m1-1/verification/post-merge/' + $receipt.Name)
    New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
    Copy-Item -LiteralPath $receipt.FullName -Destination $destination
    if ((Get-FileHash -LiteralPath $receipt.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash) { throw 'Copied receipt differs.' }
    $receiptCount++
  }
}
$guide = @"
# Mathematics M1.1 — start here

Source commit: $commit

This is implemented M1.1, using the existing player. Optional Supabase service code is prepared, not deployed; see supabase/README.md. Class-session captures and records use test authentication/database adapters. M2 calculator and M3 sketch integration have not started.

1. Open docs/review/mathematics-m1-1/index.html for the actual desktop/tablet/narrow/native-200%-zoom screenshots and review documentation.
2. Open lessons/expanding-two-binomials.html or lessons/expanding-binomial-trinomial.html for the independent learner lessons.
3. Open lesson-studio.html to edit. Select Edit, open JSON, paste the matching lessons/<lesson-name>/lesson.json and Load. Practice's inspector edits archetype, level, width, final/worked answers, teacher notes, duplication and ordering. Study previews; Export publishes. In Overview, edit independent final/worked answer policies, fallback and completion metadata. Teacher notes are private to author JSON. For genuinely protected delivery, host only the stripped student HTML; never host teacher source/answer keys. End-of-lesson mode is local pacing, not security.

The published lessons embed their data, fonts and illustrations and open directly from disk. The editable app's local vendor assets are included with relative paths. For arbitrary local asset paths, serve this extracted root, for example python -m http.server 8138, then open http://127.0.0.1:8138/docs/review/mathematics-m1-1/index.html.

The supplied YouTube URLs are external dependencies. The automated checks verify their authored surfaces and navigation with external requests blocked; they do not prove playback, school firewall access or offline remote-video availability. There is no new recording. Screenshots are actual renders. Edited demonstration files contain authoring-test changes and are distinct from the canonical 18-question lessons.

Review documentation and verification receipts: docs/review/mathematics-m1-1/. Post-merge receipts, when available, are in verification/post-merge/ and were retrieved after the identified source commit; they are evidence records, not later application files. Original combined teacher JSON and the 72-answer key: docs/lessons/expanding/. Each canonical lesson contains three archetypes with eight Foundation and four Moderate independent problems per archetype; retained guided substeps count as one problem.

SHA256SUMS.txt records all payload files except itself. PACKAGE-VERIFICATION.json records the packaging checks. This is a review package, not another application implementation or a claim of formal tablet/assistive-technology certification.
"@
Set-Content -LiteralPath (Join-Path $stage 'READ-ME-FIRST.md') -Value $guide -Encoding utf8
# Validate the gallery's actual static local references before and after extraction.
function Test-GalleryLinks([string]$root) {
  $gallery = Join-Path $root 'docs/review/mathematics-m1-1/index.html'
  $html = Get-Content -Raw -LiteralPath $gallery
  $references = [regex]::Matches($html, '(?:src|href)="([^"]+)"')
  foreach ($match in $references) {
    $reference = $match.Groups[1].Value
    if ($reference -match '^(?:https?:|data:|#)') { continue }
    $target = [IO.Path]::GetFullPath((Join-Path (Split-Path $gallery) $reference))
    if (-not $target.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Local gallery reference leaves package.' }
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Missing gallery reference: $reference" }
    if ((Get-Item -LiteralPath $target).Length -eq 0) { throw "Empty gallery reference: $reference" }
  }
  return $references.Count
}
$links = Test-GalleryLinks $stage
foreach ($file in $files) {
  if ((Get-FileHash -LiteralPath (Join-Path $stage $file) -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath (Join-Path $workspace $file) -Algorithm SHA256).Hash) { throw "Copied file differs: $file" }
}
Set-Content -LiteralPath (Join-Path $stage 'PACKAGE-VERIFICATION.json') -Value (@{sourceCommit=$commit;sourceFiles=$files.Count;postMergeReceipts=$receiptCount;localGalleryReferences=$links;copiedFilesMatch=$true;verification='Archive extraction and every SHA-256 checked after ZIP creation; no application-regression run by packaging.'} | ConvertTo-Json) -Encoding utf8
$manifest = @(Get-ChildItem -LiteralPath $stage -Recurse -File | Sort-Object FullName | ForEach-Object {
  $relative = [IO.Path]::GetRelativePath($stage,$_.FullName).Replace('\','/')
  (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() + '  ' + $relative
})
Set-Content -LiteralPath (Join-Path $stage 'SHA256SUMS.txt') -Value $manifest -Encoding utf8
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($stage,$archive,[IO.Compression.CompressionLevel]::Optimal,$false)
[IO.Compression.ZipFile]::ExtractToDirectory($archive,$extract)
$extractedLinks = Test-GalleryLinks $extract
foreach ($line in $manifest) {
  $relative = $line.Substring(66)
  $actual = (Get-FileHash -LiteralPath (Join-Path $extract $relative) -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $line.Substring(0,64)) { throw "Archive hash differs: $relative" }
}
if ((Get-ChildItem -LiteralPath $extract -Recurse -File).Count -ne $manifest.Count + 1) { throw 'Unexpected archive file count.' }
foreach ($slug in @('expanding-two-binomials','expanding-binomial-trinomial')) {
  if (-not (Test-Path -LiteralPath (Join-Path $extract "lessons/$slug.html")) -or -not (Test-Path -LiteralPath (Join-Path $extract "lessons/$slug/lesson.json"))) { throw 'Learner HTML or editable JSON missing.' }
}
@{path=$archive;bytes=(Get-Item -LiteralPath $archive).Length;sha256=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant();payloadFiles=$manifest.Count;localGalleryReferences=$extractedLinks;extracted=$true;allHashesMatch=$true} | ConvertTo-Json
