#!/usr/bin/env node
// THE RENDERED-INTERACTION GATE for the Mathematics Type workspace.
//
//   node scripts/verify-type-interaction.mjs
//
// Stage B2 shipped a Type surface whose payload was provably correct and which a student could not use:
// the equation went to the end of the page whatever the caret was doing, Insert sat below the fold on a
// 13-inch laptop, and the editor could not be left by keyboard. Every state gate was green throughout.
// This gate is the answer to that: it asserts what a student can DO with keyboard, pointer and focus in
// the rendered page. Keys are pressed, not dispatched; focus is read, not assumed.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;
const FIX = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-shell.json'), 'utf8'));
const LEGACY = JSON.parse(fs.readFileSync(path.join(root, 'lessons/closing-the-gap-geolearn.json'), 'utf8'));
const PRACTICE = FIX.slides.findIndex((s) => s.type === 'practice');
const NOTES = FIX.slides.findIndex((s) => s.type === 'notes');
const VIDEO = FIX.slides.findIndex((s) => s.type === 'videoShell');

let pass = 0, fail = 0; const sections = new Set(); let section = '';
const mark = (s) => { section = s; sections.add(s); };
const ok = (what, cond, detail) => {
  if (cond) { pass++; console.log(`PASS ${what}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`FAIL ${what}${detail ? '  ' + detail : ''}`); }
};
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const pageErrs = [];
const open = async ({ w = 1536, h = 1024, lesson = FIX, slide = PRACTICE, type = true } = {}) => {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => pageErrs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, s }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(s); }, { L: lesson, s: slide });
  await p.waitForTimeout(400);
  if (type) { await p.click('[data-mx-resp="type"]'); await p.waitForTimeout(300); }
  return p;
};
// What has the focus, named the way a person would name it.
const who = (p) => p.evaluate(() => {
  const a = document.activeElement; if (!a) return 'nothing';
  const d = a.dataset || {};
  if (d.mxTyped !== undefined) return 'the typed page';
  if (d.tpEqfield !== undefined) return 'the equation field';
  if (d.mxEqok !== undefined) return 'Insert';
  if (d.mxEqcancel !== undefined) return 'Cancel';
  if (d.mxTsel) return d.mxTsel === 'eq' ? 'the Equation button' : 'the Text button';
  if (d.mxSheet) return 'page tab ' + d.mxSheet;
  if (d.mxSheetAdd !== undefined) return 'Add page';
  if (d.mxView) return 'Expand';
  if (a.classList.contains('mx-eq')) return 'the equation';
  if (a.classList.contains('tp-eqsym')) return 'a symbol button';
  if (a.classList.contains('tp-eqst')) return 'a structure button';
  if (a === document.body) return 'BODY';
  return a.tagName.toLowerCase() + '.' + String(a.className || '').split(' ')[0];
});
const openBar = async (p) => { await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(250); await p.click('[data-tp-eqfield]'); };
const keys = async (p, ks) => { for (const k of ks) { await p.keyboard.press(k); await p.waitForTimeout(35); } };
const blocks = (p) => p.evaluate(() => tpRespGet('practice-equations', 'workbook').value.pages[0].text);

// ══ 1. an equation goes where the student is writing ══════════════════════════════════════════════
mark('caret');
{
  const p = await open();
  await p.click('[data-mx-typed]'); await p.keyboard.type('First, ');
  await openBar(p); await keys(p, ['x', '^', '2']);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(250);
  await p.keyboard.type(' is the rule. Halving gives ');
  await openBar(p); await keys(p, ['1', '/', '2']);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(250);
  await p.keyboard.type(' of it.');
  await p.evaluate(() => document.querySelector('[data-mx-typed]').blur()); await p.waitForTimeout(200);
  const t = await blocks(p);
  const shape = t.map((b) => b.t).join('+');
  const flat = (v) => String(v).replace(/\u00a0/g, ' ');   // a contenteditable keeps a trailing space as &nbsp;
  ok('an equation is placed at the caret and the prose carries on after it',
     shape === 'p+eq+p+eq+p' && /^First, $/.test(flat(t[0].v)) && /^ is the rule\. Halving gives $/.test(flat(t[2].v))
     && /^ of it\.$/.test(flat(t[4].v)),
     `${shape} — "${flat(t[0].v)}" ⟦eq⟧ "${flat(t[2].v)}" ⟦eq⟧ "${flat(t[4].v)}"`);
  ok('CONTROL: appending to the end of the page would have put both equations last',
     t.findIndex((b) => b.t === 'eq') < t.length - 1 && t[t.length - 1].t === 'p',
     `the last block is prose (${t[t.length - 1].t}), not an equation`);
  // authored order survives leaving the page and coming back
  const before = JSON.stringify(t);
  await p.evaluate(() => { go(0); }); await p.waitForTimeout(300);
  await p.evaluate(() => { go(4); }); await p.waitForTimeout(450);
  const after = JSON.stringify(await blocks(p));
  const shown = await p.evaluate(() => { const el = document.querySelector('[data-mx-typed]');
    return { text: el.textContent.replace(/\s+/g, ' ').trim(), chips: el.querySelectorAll('.mx-eq').length,
      rendered: el.querySelectorAll('.mx-eq math').length }; });
  ok('and the order is the same after leaving the page and coming back',
     before === after && shown.chips === 2 && shown.rendered === 2,
     `${shown.chips} equations rendered in "${shown.text}"`);
  // re-opening one continues it rather than typing in front of it
  await p.evaluate(() => document.querySelectorAll('.mx-eq')[0].click()); await p.waitForTimeout(300);
  await keys(p, ['ArrowRight', '+', '1']);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(300);
  const chips = await p.evaluate(() => [].slice.call(document.querySelectorAll('.mx-eq')).map((e) => e.textContent.replace(/\s/g, '')));
  ok('re-opening an equation continues it, and leaves the others alone',
     chips[0] === 'x2+1' && chips.length === 2, `chips read ${chips.join(' and ')}`);
  ok('CONTROL: a caret left at the start of the row would have read "+1x2"', chips[0] !== '+1x2', `it reads "${chips[0]}"`);
  // Clicking an equation leaves the selection INSIDE it; the next Insert must not land there.
  await p.evaluate(() => { mxTypedWrite(document.querySelector('[data-mx-typed]'), []); });
  await p.click('[data-mx-typed]'); await p.keyboard.type('working ');
  await openBar(p); await keys(p, ['9']); await p.click('[data-mx-eqok]'); await p.waitForTimeout(250);
  await p.click('.mx-eq'); await p.waitForTimeout(280);
  await p.keyboard.press('Escape'); await p.waitForTimeout(220);
  await openBar(p); await keys(p, ['7']); await p.click('[data-mx-eqok]'); await p.waitForTimeout(250);
  await p.keyboard.type('TAIL'); await p.waitForTimeout(250);
  const two = await blocks(p);
  ok('an equation you clicked on survives writing the next one',
     two.filter((x) => x.t === 'eq').length === 2 && /TAIL/.test(two[two.length - 1].v || ''),
     two.map((x) => x.t === 'p' ? JSON.stringify(String(x.v).replace(/\u00a0/g, ' ')) : '⟦eq⟧').join(' '));
  ok('CONTROL: a caret recorded inside the chip would have deleted it and nested the new one in its place',
     (await p.evaluate(() => document.querySelectorAll('.mx-eq .mx-eq').length)) === 0
     && (await p.evaluate(() => document.querySelectorAll('.mx-eq').length)) === 2,
     'two equations, neither inside the other');
  await p.close();
}
// ══ 2. the editor can be entered, worked and LEFT, by keyboard ════════════════════════════════════
mark('focus');
{
  const p = await open();
  await p.click('[data-mx-typed]'); await p.keyboard.type('working ');
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(250);
  ok('opening the editor puts the keyboard in it', (await who(p)) === 'the equation field', await who(p));
  const fwd = []; for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); await p.waitForTimeout(70); fwd.push(await who(p)); }
  ok('Tab leaves the editor forward and reaches its actions',
     fwd[0] !== 'the equation field' && fwd.indexOf('Insert') >= 0,
     fwd.join(' → '));
  await p.click('[data-tp-eqfield]'); await p.waitForTimeout(100);
  const back = []; for (let i = 0; i < 2; i++) { await p.keyboard.press('Shift+Tab'); await p.waitForTimeout(70); back.push(await who(p)); }
  ok('Shift-Tab leaves it backward, onto the page it came from',
     back[0] === 'the typed page', back.join(' → '));
  ok('CONTROL: the ribbon is two stops, not forty — Tab reaches Insert within four presses',
     fwd.indexOf('Insert') >= 0 && fwd.indexOf('Insert') <= 3, `Insert at press ${fwd.indexOf('Insert') + 1}`);
  // Escape returns to whatever opened it — the button, or the equation being edited
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(250);
  await p.keyboard.press('Escape'); await p.waitForTimeout(220);
  const esc1 = await who(p);
  const shut = await p.evaluate(() => document.querySelector('[data-mx-eqbar]').hasAttribute('hidden'));
  await openBar(p); await keys(p, ['9']); await p.click('[data-mx-eqok]'); await p.waitForTimeout(250);
  await p.click('.mx-eq'); await p.waitForTimeout(280);
  await p.keyboard.press('Escape'); await p.waitForTimeout(220);
  const esc2 = await who(p);
  ok('Escape closes the editor and hands the focus back to whatever opened it',
     shut && esc1 === 'the Equation button' && esc2 === 'the equation',
     `from the button → ${esc1}; from an equation → ${esc2}`);
  ok('CONTROL: it is the OPENER, not just "somewhere sensible" — the two differ',
     esc1 !== esc2, `${esc1} vs ${esc2}`);
  // Insert leaves the student writing again, after the object
  await openBar(p); await keys(p, ['7']); await p.click('[data-mx-eqok]'); await p.waitForTimeout(250);
  const afterInsert = await who(p);
  await p.keyboard.type('TAIL'); await p.waitForTimeout(200);
  const t = await blocks(p);
  ok('Insert puts the student back on the page, writing after the equation',
     afterInsert === 'the typed page' && /TAIL/.test(t[t.length - 1].v) && t[t.length - 2].t === 'eq',
     `focus on ${afterInsert}; "${t[t.length - 1].v.trim()}" follows the equation`);
  await p.close();
}
{
  const p = await open();
  await p.click('[data-mx-typed]'); await p.keyboard.type('one');
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(220);
  await p.click('[data-mx-eqcancel]'); await p.waitForTimeout(220);
  const c = await who(p);
  await p.click('[data-mx-sheet-add]'); await p.waitForTimeout(320);
  const a = await who(p);
  await p.click('[data-mx-sheet="w1"]'); await p.waitForTimeout(320);
  const s = await who(p);
  ok('no control that replaces or hides its own container drops the focus on the floor',
     c !== 'BODY' && a !== 'BODY' && s !== 'BODY',
     `Cancel → ${c} · Add page → ${a} · page tab → ${s}`);
  await p.close();
}
{
  // On a narrow layout the view switch really does hide a whole region, taking the focused control with it.
  const p = await open({ w: 900, h: 1100 });
  await p.click('.mx-viewsw [data-mx-view="workbook"]'); await p.waitForTimeout(400);
  const e1 = await who(p);
  await p.click('.mx-tool[data-mx-view="workbook"]'); await p.waitForTimeout(350);
  const onExpand = await who(p);
  await p.click('.mx-viewsw [data-mx-view="questions"]'); await p.waitForTimeout(400);
  const gone = await p.evaluate(() => { const b = document.querySelector('.mx-tool[data-mx-view="workbook"]');
    return !b || b.offsetParent === null; });
  const e2 = await who(p);
  ok('leaving the Workbook view leaves a usable place to carry on from',
     e1 !== 'BODY' && e2 !== 'BODY', `Workbook → ${e1} · Expand → ${onExpand} · Questions → ${e2}`);
  ok('CONTROL: the control that had the focus is hidden by then, so BODY is what happens otherwise',
     gone === true, 'the Expand button is no longer displayed');
  await p.close();
}
// ══ 3. arrow keys belong to whatever is being edited ══════════════════════════════════════════════
mark('keys');
{
  const p = await open();
  const at = () => p.evaluate(() => cur);
  const probe = async (where, focus) => {
    await focus(); const b0 = await at();
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(160); const r = await at();
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(160); const l = await at();
    if (r !== b0 || l !== b0) { await p.evaluate((n) => go(n), b0); await p.waitForTimeout(300); }
    return { where, held: r === b0 && l === b0, trace: `${b0}→${r}→${l}` };
  };
  await p.click('[data-mx-typed]'); await p.keyboard.type('prose ');
  await openBar(p); await keys(p, ['5']);
  const inside = [];
  inside.push(await probe('the typed page', async () => { await p.click('[data-mx-typed]'); }));
  inside.push(await probe('the equation field', async () => { await p.click('[data-tp-eqfield]'); }));
  inside.push(await probe('a symbol button', async () => { await p.evaluate(() => document.querySelector('.tp-eqsym').focus()); }));
  inside.push(await probe('a structure button', async () => { await p.evaluate(() => document.querySelector('.tp-eqst').focus()); }));
  inside.push(await probe('Insert', async () => { await p.evaluate(() => document.querySelector('[data-mx-eqok]').focus()); }));
  await p.evaluate(() => document.querySelector('[data-mx-eqok]').click()); await p.waitForTimeout(280);
  inside.push(await probe('a placed equation', async () => { await p.evaluate(() => document.querySelector('.mx-eq').focus()); }));
  inside.push(await probe('a question answer box', async () => { await p.evaluate(() => { const i = document.querySelector('.mx-content input'); if (i) i.focus(); }); }));
  ok('an arrow key never pages the lesson out from under something being edited',
     inside.every((x) => x.held), inside.map((x) => `${x.where}: ${x.held ? 'held' : 'NAVIGATED ' + x.trace}`).join(' · '));
  const outside = [];
  outside.push(await probe('a workbook page tab', async () => { await p.evaluate(() => document.querySelector('.mx-ptab').focus()); }));
  outside.push(await probe('nothing in particular', async () => { await p.evaluate(() => document.activeElement.blur()); }));
  ok('CONTROL: on the lesson surface the same key still turns the page',
     outside.every((x) => !x.held), outside.map((x) => `${x.where}: ${x.trace}`).join(' · '));
  await p.close();
}
{
  // the same boundary, on the legacy editor that shares the primitive
  const p = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  p.on('pageerror', (e) => pageErrs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(() => { insertSlide('graphQuestion', LESSON.slides.length); insertSlide('text', LESSON.slides.length);
    go(LESSON.slides.findIndex((s) => s.type === 'graphQuestion')); });
  await p.waitForTimeout(600);
  const has = await p.evaluate(() => !!document.querySelector('[data-tp-eqfield]'));
  if (has) {
    const b0 = await p.evaluate(() => cur);
    await p.click('[data-tp-eqfield]'); await p.keyboard.press('x'); await p.waitForTimeout(80);
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250);
    const held = await p.evaluate(() => cur);
    await p.evaluate(() => { document.activeElement.blur(); document.body.focus(); });
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
    const moved = await p.evaluate(() => cur);
    ok('the same boundary covers graphQuestion, which shares the primitive',
       held === b0 && moved !== held, `in its field ${b0}→${held}; on the page ${held}→${moved}`);
  } else ok('the same boundary covers graphQuestion, which shares the primitive', false, 'no graphQuestion editor rendered');
  await p.close();
}
// ══ 4. repeated use does not accumulate ══════════════════════════════════════════════════════════
mark('repeat');
{
  const p = await open();
  await p.click('[data-mx-typed]'); await p.keyboard.type('start ');
  for (let i = 0; i < 5; i++) { await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(140);
    await p.click('[data-mx-eqcancel]'); await p.waitForTimeout(140); }
  await openBar(p); await keys(p, ['a', 'b', 'c']);
  const afterCancels = await p.evaluate(() => document.querySelector('[data-tp-eqfield]').textContent.replace(/\s/g, ''));
  await p.click('[data-mx-eqcancel]'); await p.waitForTimeout(200);
  for (let i = 0; i < 5; i++) { await openBar(p); await keys(p, [String(i)]); await p.click('[data-mx-eqok]'); await p.waitForTimeout(200); }
  await openBar(p); await keys(p, ['z', 'z']);
  const afterInserts = await p.evaluate(() => document.querySelector('[data-tp-eqfield]').textContent.replace(/\s/g, ''));
  const chips = await p.evaluate(() => document.querySelectorAll('.mx-eq').length);
  await p.click('[data-mx-eqcancel]'); await p.waitForTimeout(150);
  ok('after ten trips through the editor each key still arrives once',
     afterCancels === 'abc' && afterInserts === 'zz',
     `"abc" reads "${afterCancels}" after 5 cancels; "zz" reads "${afterInserts}" after 5 more inserts`);
  ok('CONTROL: a listener left behind per visit would have read "aaaaaabbbbbbcccccc" by now',
     afterCancels.length === 3 && chips === 5, `${chips} equations placed, field holds ${afterCancels.length} characters`);
  // a blank line is one blank line, before and after the page is read back
  await p.evaluate(() => { mxTypedWrite(document.querySelector('[data-mx-typed]'), []); });
  await p.click('[data-mx-typed]'); await p.keyboard.type('one');
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.keyboard.type('two');
  await p.waitForTimeout(200);
  const b1 = await p.evaluate(() => tpRespGet('practice-equations', 'workbook').value.pages[0].text.map((x) => x.v).join(''));
  await p.click('[data-mx-sheet-add]'); await p.waitForTimeout(250);
  await p.click('[data-mx-sheet="w1"]'); await p.waitForTimeout(300);
  const brs = await p.evaluate(() => document.querySelector('[data-mx-typed]').querySelectorAll('br').length);
  ok('a blank line is still one blank line after the page is re-rendered from the store',
     b1 === 'one\n\ntwo' && brs === 2, `stored ${JSON.stringify(b1)}, re-rendered with ${brs} breaks`);
  ok('CONTROL: counting the block break and the <br> inside it would have given three',
     b1 !== 'one\n\n\ntwo', 'it did not');
  await p.close();
}
// ══ 5. short laptops ═════════════════════════════════════════════════════════════════════════════
mark('viewport');
for (const [w, h] of [[1280, 760], [1366, 720], [1280, 680], [1024, 640]]) {
  const p = await open({ w, h });
  await p.evaluate(() => { if (document.querySelector('.mx').dataset.mxFit === 'solo') mxSetView('workbook'); });
  await p.waitForTimeout(400);
  await p.click('[data-mx-typed]'); await p.keyboard.type('working');
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(350);
  const r = await p.evaluate(() => {
    const names = { '.mx-wsbar': 'toolbar', '[data-mx-typed]': 'text surface', '.tp-eqsymwell': 'symbols',
      '[data-mx-eqok]': 'Insert', '[data-mx-eqcancel]': 'Cancel', '.mx-pagetabs': 'page tabs' };
    const out = []; const vh = window.innerHeight;
    for (const [sel, nm] of Object.entries(names)) { const e = document.querySelector(sel);
      if (!e) { out.push(nm + ': ABSENT'); continue; }
      e.scrollIntoView({ block: 'nearest' });
      const b = e.getBoundingClientRect();
      if (!(b.top >= -1 && b.bottom <= vh + 1)) out.push(`${nm}: ${Math.round(b.top)}..${Math.round(b.bottom)} of ${vh}`); }
    return out;
  });
  ok(`with the editor open at ${w}x${h}, every control is reachable by ordinary scrolling`,
     r.length === 0, r.length ? 'out of reach — ' + r.join(', ') : 'toolbar, page, symbols, Insert, Cancel and tabs');
  await p.close();
}
{
  const p = await open({ w: 1280, h: 760 });
  await p.evaluate(() => mxSetView('workbook')); await p.waitForTimeout(350);
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(350);
  const forced = await p.evaluate(async () => {
    const btn = document.querySelector('[data-mx-eqok]');
    const now = Math.round(btn.getBoundingClientRect().bottom);
    const st = document.createElement('style');
    st.textContent = '.mx-wb .mx-sheet{min-height:340px!important;}';   // the writing floor, still applied
    document.head.appendChild(st);
    await new Promise((r) => requestAnimationFrame(r));
    const then = Math.round(document.querySelector('[data-mx-eqok]').getBoundingClientRect().bottom);
    st.remove(); return { now, then, vh: window.innerHeight };
  });
  ok('CONTROL: holding the writing floor open is exactly what put Insert below the fold',
     forced.now <= forced.vh && forced.then > forced.vh,
     `Insert at ${forced.now} now, ${forced.then} with the floor, in a ${forced.vh}px viewport`);
  await p.close();
}
// ══ 6. what assistive technology is told ═════════════════════════════════════════════════════════
mark('semantics');
{
  const p = await open({ type: false });
  const named = (sel) => p.evaluate((sel) => [].slice.call(document.querySelectorAll(sel)).map((e) => ({
    name: (e.getAttribute('aria-label') || (e.textContent || '').trim().replace(/\s+/g, ' ')).slice(0, 60),
    pressed: e.getAttribute('aria-pressed'), current: e.getAttribute('aria-current'), role: e.getAttribute('role') })), sel);
  const modes = await named('[data-mx-resp]');
  const ink = await named('.mx-wsbar .mx-tool');
  const tabs = await named('.mx-ptab');
  ok('Write and Type say which one is on', modes.length === 2 && modes.every((m) => m.name && m.pressed) && modes.filter((m) => m.pressed === 'true').length === 1,
     modes.map((m) => `${m.name}=${m.pressed}`).join(' · '));
  ok('the ink tools are named and say which is selected',
     ink.every((t) => t.name) && ink.filter((t) => t.pressed === 'true').length >= 1,
     ink.map((t) => t.name + (t.pressed ? '=' + t.pressed : '')).join(' · '));
  ok('the workbook page tabs name themselves and mark the current one',
     tabs.every((t) => t.name) && tabs.filter((t) => t.current === 'true').length === 1,
     tabs.map((t) => t.name + (t.current ? ' (current)' : '')).join(' · '));
  await p.click('[data-mx-resp="type"]'); await p.waitForTimeout(300);
  const type = await named('.mx-wsbar .mx-tool');
  ok('the Type tools are named, and Text/Equation say which is active',
     type.every((t) => t.name) && type.filter((t) => t.pressed === 'true').length >= 1,
     type.map((t) => t.name + (t.pressed ? '=' + t.pressed : '')).join(' · '));
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(300);
  const field = (await named('[data-tp-eqfield]'))[0];
  const bar = (await named('[data-mx-eqbar]'))[0];
  const groups = await named('.tp-eqsymwell,.tp-eqstructs');
  const acts = await named('[data-mx-eqok],[data-mx-eqcancel]');
  ok('the equation field is a named text box, not an anonymous styled span',
     field && field.role === 'textbox' && field.name && field.name.length > 8
     && (await p.evaluate(() => document.querySelector('[data-tp-eqfield]').getAttribute('tabindex') === '0')),
     `role=${field && field.role}, tabindex 0, "${field && field.name}"`);
  ok('the editor and its two ribbons are named groups', bar && bar.name && groups.length === 2 && groups.every((g) => g.name && g.role === 'toolbar'),
     `${bar && bar.name}: ${groups.map((g) => g.name).join(' + ')}`);
  ok('Insert and Cancel are named', acts.length === 2 && acts.every((a) => a.name), acts.map((a) => a.name).join(' · '));
  await p.click('[data-tp-eqfield]'); await p.keyboard.press('4'); await p.waitForTimeout(60);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(300);
  const chip = (await named('.mx-eq'))[0];
  ok('a placed equation is announced as something operable, and says what it holds',
     chip && chip.role === 'button' && /4/.test(chip.name), `role=${chip && chip.role}, "${chip && chip.name}"`);
  ok('CONTROL: role="math" alone would have announced it as static text with no hint it can be opened',
     chip.role !== 'math', `it is ${chip.role}`);
  const slots = await p.evaluate(() => { document.querySelector('[data-mx-tsel="eq"]').click();
    const f = document.querySelector('[data-tp-eqfield]'); f.focus();
    f.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    const ph = document.querySelector('[data-tp-eqfield] mtext.ph'); if (!ph) return null;
    const on = getComputedStyle(ph).borderTopStyle;
    ph.classList.remove('ph'); const off = getComputedStyle(ph).borderTopStyle; ph.classList.add('ph');
    return { on, off, n: document.querySelectorAll('[data-tp-eqfield] mtext.ph').length }; });
  ok('an empty slot in a fraction is visible', slots && slots.on === 'dotted' && slots.n === 2, slots ? `${slots.n} slots, ${slots.on}` : 'none found');
  ok('CONTROL: unstyled, the slot has no border and there is nothing to aim at', slots && slots.off === 'none', slots ? slots.off : 'n/a');
  await p.close();
  const n = await open({ w: 900, h: 1100 });
  const sw = await n.evaluate(() => [].slice.call(document.querySelectorAll('.mx-viewsw button'))
    .map((e) => ((e.getAttribute('aria-label') || e.textContent) || '').trim() + '=' + e.getAttribute('aria-pressed')));
  ok('the narrow Questions / Workbook switch says which region is showing',
     sw.length === 2 && sw.filter((x) => /=true$/.test(x)).length === 1, sw.join(' · '));
  await n.close();
}
// ══ 7. the Type styles reach nothing else ════════════════════════════════════════════════════════
mark('isolation');
{
  // `.mx .mx-work .mx-wb.tp-slide` is deliberately absent: it is one half of a rule SHARED with the Notes
  // figure host (HANDOFF §8b), so removing it would change Notes for a reason that is not leakage.
  const TYPE_ONLY = ['.mx-typed', '.mx-page-w', '.mx-eq', '.mx-eqbar', '.mx-eqwrap', '.mx-eqfield',
    '.mx-eqribbon', '.mx-eqact', '.mx-eqok', '.mx-wb-type', 'data-mx-eq'];
  const sign = (p) => p.evaluate(() => [].slice.call(document.querySelectorAll('#slide *')).map((e) => {
    const r = e.getBoundingClientRect(), c = getComputedStyle(e);
    return [e.tagName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height),
      c.display, c.position, c.color, c.backgroundColor, c.fontSize].join('|'); }).join('\n'));
  const strip = (p, sels) => p.evaluate((sels) => { let n = 0;
    [].slice.call(document.styleSheets).forEach((sh) => { let rules; try { rules = sh.cssRules; } catch (e) { return; }
      for (let i = rules.length - 1; i >= 0; i--) { const t = rules[i].selectorText || '';
        if (t && sels.some((s) => t.indexOf(s) >= 0)) { sh.deleteRule(i); n++; } } });
    return n; }, sels);
  const CASES = [['Practice — Write', { type: false }], ['Practice — Type', { type: true }],
    ['Notes', { slide: NOTES, type: false }], ['Video', { slide: VIDEO, type: false }],
    ['legacy geolearn text', { lesson: LEGACY, slide: LEGACY.slides.findIndex((x) => x.type === 'text'), type: false }],
    ['legacy geolearn video', { lesson: LEGACY, slide: LEGACY.slides.findIndex((x) => x.type === 'video'), type: false }]];
  const moved = [];
  for (const [name, opt] of CASES) {
    const p = await open(opt); await p.waitForTimeout(350);
    const before = await sign(p); const n = await strip(p, TYPE_ONLY);
    await p.waitForTimeout(300); const after = await sign(p);
    moved.push({ name, n, changed: before !== after });
    await p.close();
  }
  const type = moved.find((m) => /Type/.test(m.name));
  const others = moved.filter((m) => !/Type/.test(m.name));
  ok('deleting every Type-only rule changes the Type surface and nothing else',
     type.changed && others.every((m) => !m.changed),
     `${type.n} rules removed · Type changed · ${others.map((m) => m.name).join(', ')} identical`);
  ok('CONTROL: the same deletion visibly moves the Type surface, so "identical" means something',
     type.changed, `Practice — Type changed under ${type.n} deletions`);
  await (async () => {
    const p = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
    p.on('pageerror', (e) => pageErrs.push(String(e)));
    await p.goto(base, { waitUntil: 'load' });
    await p.evaluate(() => { insertSlide('graphQuestion', LESSON.slides.length);
      go(LESSON.slides.findIndex((s) => s.type === 'graphQuestion')); });
    await p.waitForTimeout(600);
    const before = await sign(p); const n = await strip(p, TYPE_ONLY);
    await p.waitForTimeout(300); const after = await sign(p);
    ok('and it does not reach graphQuestion, which uses the same maths primitive',
       (await p.evaluate(() => !!document.querySelector('[data-tp-eqfield]'))) && before === after,
       `${n} rules removed → identical`);
    await p.close();
  })();
}
const SECTIONS = ['caret', 'focus', 'keys', 'repeat', 'viewport', 'semantics', 'isolation'];
ok('every section ran', SECTIONS.every((s) => sections.has(s)), `${sections.size} sections`);
ok('no page error while typing, editing or navigating', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | ') || 'none');
await browser.close(); server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
