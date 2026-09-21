#!/usr/bin/env node
// THE ONE-OWNER CHECK for the composition numbers the application carries.
//
//   node scripts/verify-composition-grid.mjs
//
// WHY THIS EXISTS. `lesson-studio.html` now places a graph on the approved `visual.explanation/down-8`
// stage: twelve columns, 24px gutters, media on columns 3-10, the reading beneath at the same eight,
// prose never wider than the 760px measure, and `down-12` for a plane much wider than it is tall. Those
// numbers are NOT the app's to invent - they are the master grid and the pattern catalogue, which live in
// docs/atlas/composition/src/{grid.json,patterns.json} and docs/atlas/worked-examples/src/atlas.json.
//
// A copy in the app is unavoidable (the app is one self-contained file with no build step and cannot read
// those files at runtime), so the copy has to be POLICED. This is the same defect atlas.json records
// against itself under `_bands`: "they were hardcoded in that module while this file declared them, so
// retuning the grammar silently changed nothing - the grammar and the code were two owners of one
// decision." Retune the catalogue here and this check goes red until the app follows.
//
// IT ASSERTS AGREEMENT, NOT VALUES. Nothing below names 12, 24, 8, 3, 760, 1152 or 0.4 as a constant of
// its own; every expectation is read out of the catalogue and every actual is read out of the app. A
// check that pinned the numbers itself would be a THIRD owner, and the first retune would have to edit
// three files instead of failing in one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const app = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');

const GRID = rd('docs/atlas/composition/src/grid.json');
const PATTERNS = rd('docs/atlas/composition/src/patterns.json');
const ATLAS = rd('docs/atlas/worked-examples/src/atlas.json').mediaGeometry;

let pass = 0, fail = 0;
const ok = (what, cond, detail) => {
  if (cond) { pass++; console.log(`PASS ${what}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`FAIL ${what}${detail ? '  ' + detail : ''}`); }
};

/* THE APP'S DECLARED CONSTANTS, read out of the file rather than restated. If a name is renamed or
   deleted the lookup returns null and every check that needs it fails loudly, which is the point. */
const konst = (name) => {
  const m = app.match(new RegExp(`\\b${name}\\s*=\\s*(-?[0-9.]+)`));
  return m ? Number(m[1]) : null;
};
const K = {};
for (const n of ['MX_GRID_COLS', 'MX_GRID_GUTTER', 'MX_MEDIA_SPAN', 'MX_MEDIA_START', 'MX_MEASURE',
                 'MX_STAGE_MIN', 'MX_WIDE_BELOW', 'MX_WIDE_SPAN', 'MX_WIDE_START', 'MX_WIDE_READ_START']) K[n] = konst(n);

console.log('--- the master grid ---');
const D = GRID.surfaces.desktop;
ok('the app counts the columns the master grid declares', K.MX_GRID_COLS === D.columns,
   `app ${K.MX_GRID_COLS}, grid.json desktop ${D.columns}`);
ok('and uses the same gutter', K.MX_GRID_GUTTER === D.gutter,
   `app ${K.MX_GRID_GUTTER}px, grid.json ${D.gutter}px`);
ok('and treats the desktop surface itself as the threshold for the desktop composition',
   K.MX_STAGE_MIN === D.width, `app MX_STAGE_MIN ${K.MX_STAGE_MIN}px, grid.json desktop width ${D.width}px`);
ok('and sets prose at the declared reading measure', K.MX_MEASURE === GRID.readingMeasure.px,
   `app ${K.MX_MEASURE}px, grid.json readingMeasure ${GRID.readingMeasure.px}px`);
/* The measure is not an independent number: on this grid it IS eight columns. span(n) = n*colW +
   (n-1)*gutter, and grid.json publishes the resulting column edges, so the two can be checked against
   each other rather than both taken on trust. */
const span = (n) => GRID.columns.desktop[n - 1];
ok('and the measure is exactly the media span on that grid - not a typographic number that happens to match',
   span(K.MX_MEDIA_SPAN) === K.MX_MEASURE && K.MX_MEDIA_SPAN <= GRID.readingMeasure.maxSpan.desktop,
   `span(${K.MX_MEDIA_SPAN}) = ${span(K.MX_MEDIA_SPAN)}px, measure ${K.MX_MEASURE}px, prose ceiling ${GRID.readingMeasure.maxSpan.desktop} columns`);

console.log('\n--- visual.explanation, the approved subdesigns ---');
const SUBS = PATTERNS['visual.explanation'].subdesigns;
const sub = (id, surface) => SUBS.find((s) => s.id === id && s.surface === surface);
/* An `areas` row is the subdesign's own drawing of itself. Reading the media's first and last column out
   of it is how the app's START is checked against the catalogue without the catalogue having to publish a
   start - `slotAnchor: center` plus a span is what it actually declares. */
const cells = (s, slot) => {
  const row = s.areas.find((a) => a.split(/\s+/).includes(slot));
  return row ? row.split(/\s+/) : [];
};
const first = (s, slot) => cells(s, slot).indexOf(slot) + 1;
const width = (s, slot) => cells(s, slot).filter((c) => c === slot).length;

const d8 = sub('down-8', 'desktop');
ok('down-8 exists in the catalogue and is the centred stage', !!d8 && d8.slotAnchor === 'center',
   d8 ? `slotSpan ${d8.slotSpan}, anchor ${d8.slotAnchor}` : 'MISSING');
ok('the app gives the media the span down-8 declares', !!d8 && K.MX_MEDIA_SPAN === d8.slotSpan,
   `app ${K.MX_MEDIA_SPAN}, catalogue ${d8 && d8.slotSpan}`);
ok('and starts it on the column down-8 draws it on', !!d8 && K.MX_MEDIA_START === first(d8, 'media'),
   `app column ${K.MX_MEDIA_START}, areas row starts at ${d8 && first(d8, 'media')}`);
ok('and the drawing agrees with its own slotSpan', !!d8 && width(d8, 'media') === d8.slotSpan,
   d8 ? `${width(d8, 'media')} media cells, slotSpan ${d8.slotSpan}` : 'MISSING');
ok('and the reading sits beneath the media on the same columns - the centred spine', !!d8 &&
   first(d8, 'interpretation') === first(d8, 'media') && width(d8, 'interpretation') === width(d8, 'media'),
   d8 ? `media ${first(d8, 'media')}+${width(d8, 'media')}, interpretation ${first(d8, 'interpretation')}+${width(d8, 'interpretation')}` : 'MISSING');

const d12 = sub('down-12', 'desktop');
ok('down-12 exists and takes the full grid', !!d12 && d12.slotAnchor === 'full',
   d12 ? `slotSpan ${d12.slotSpan}, anchor ${d12.slotAnchor}` : 'MISSING');
ok('the app gives the wide plane the span down-12 declares', !!d12 && K.MX_WIDE_SPAN === d12.slotSpan && K.MX_WIDE_SPAN === D.columns,
   `app ${K.MX_WIDE_SPAN}, catalogue ${d12 && d12.slotSpan}, grid ${D.columns}`);
ok('and starts both the media and the reading at the left edge, as down-12 draws them', !!d12 &&
   K.MX_WIDE_START === first(d12, 'media') && K.MX_WIDE_READ_START === first(d12, 'interpretation'),
   d12 ? `app media ${K.MX_WIDE_START} / reading ${K.MX_WIDE_READ_START}, areas media ${first(d12, 'media')} / interpretation ${first(d12, 'interpretation')}` : 'MISSING');
ok('and the reading still returns to the measure beneath a full-width plane',
   !!d12 && width(d12, 'interpretation') === K.MX_MEDIA_SPAN,
   d12 ? `${width(d12, 'interpretation')} columns = ${span(width(d12, 'interpretation'))}px` : 'MISSING');
/* The app only ever places the media on one of these two. A third desktop subdesign appearing in the
   catalogue is a change the app has not been taught, and silently rendering it as down-8 would be the
   drift this file exists to catch. */
const desktopSubs = SUBS.filter((s) => s.surface === 'desktop').map((s) => s.id).sort();
ok('and these are the ONLY desktop subdesigns the catalogue approves - the app knows no others',
   desktopSubs.length === 2 && desktopSubs.join(',') === 'down-12,down-8', `catalogue: ${desktopSubs.join(' · ') || 'none'}`);

console.log('\n--- the geometry band that chooses between them ---');
/* The shipping grammar classifies by height/width from the authored domain. `wide` is everything below
   the landscape band, and that band - not a number of this file's - is what the app must be reading. */
ok('the app splits down-8 from down-12 on the shipping grammar\'s own landscape band',
   K.MX_WIDE_BELOW === ATLAS.bands.landscapeAbove,
   `app MX_WIDE_BELOW ${K.MX_WIDE_BELOW}, atlas.json landscapeAbove ${ATLAS.bands.landscapeAbove}`);
ok('and that band is the boundary of the class down-12 is approved for', !!d12 && d12.aspects.includes('wide'),
   d12 ? `down-12 aspects: ${d12.aspects.join(', ')} · atlas wide = ${ATLAS.classes.wide}` : 'MISSING');
ok('and the classes below it are the ones down-8 is approved for', !!d8 &&
   ['portrait', 'balanced', 'landscape'].every((a) => d8.aspects.includes(a)),
   d8 ? `down-8 aspects: ${d8.aspects.join(', ')}` : 'MISSING');
/* THE CONTROL. If the app's threshold were read as width/height instead of height/width, or inverted,
   every plane in the lesson would land in the wrong subdesign while all the equality checks above still
   passed. The band is a ratio below 1, and the classification must be the LOW side. */
ok('CONTROL: the band is read as height/width, so the wide class is the LOW side of it',
   K.MX_WIDE_BELOW > 0 && K.MX_WIDE_BELOW < 1 && /<\s*MX_WIDE_BELOW/.test(app),
   `${K.MX_WIDE_BELOW} and the app tests "< MX_WIDE_BELOW"`);

console.log('\n--- the copy cannot hide ---');
/* Every constant above is published to CSS as a custom property on .mx-wex, because the stylesheet is
   where the placement actually happens. A constant that stopped being published would leave the CSS on
   its fallback and this check green while the page changed - so the publication is asserted too. */
for (const [prop, name] of [['--mx-cols', 'MX_GRID_COLS'], ['--mx-gutter', 'MX_GRID_GUTTER'],
     ['--mx-media-span', 'MX_MEDIA_SPAN'], ['--mx-media-start', 'MX_MEDIA_START'],
     ['--mx-measure', 'MX_MEASURE'], ['--mx-stage-min', 'MX_STAGE_MIN']]) {
  ok(`${prop} is published from ${name}, never re-typed`,
     new RegExp(`${prop}:\\$\\{${name}\\}`).test(app), '');
}
ok('and the CSS reads the placement properties rather than repeating their values',
   ['--mx-cols', '--mx-gutter', '--mx-media-span', '--mx-media-start', '--mx-measure']
     .every((p) => new RegExp(`var\\(${p}`).test(app)), 'each appears as var(...) in the stylesheet');
/* --mx-stage-min is the one that is NOT a CSS placement value: it is the threshold the script tests
   before it decides which subdesign to emit, and it is read back off the element with mxWexProp so a
   theme could move the surface without the script's copy of the number becoming the truth. Asserting
   var(--mx-stage-min) would have been asserting a thing that must not exist. */
ok('and the surface threshold is read back off the element, not held only in the script',
   /mxWexProp\(\s*root\s*,\s*'--mx-stage-min'\s*,\s*MX_STAGE_MIN\s*\)/.test(app),
   'mxFootStage reads --mx-stage-min with MX_STAGE_MIN only as its fallback');

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
