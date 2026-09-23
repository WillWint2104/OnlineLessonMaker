/* ── THE ADOPTION SCAN — WHAT THE BLUEPRINT LAYER WOULD CHANGE IN THE SHIPPING CATALOGUE ──────────
   Not a gate and not wired into CI. It exists to turn "adopt the Composition Blueprint layer" from a
   sentence into a finite list someone can rule on, one line per shipping subdesign.

   WHAT IT COMPARES, AND WHAT IT DOES NOT. For each approved subdesign it derives the column runs the
   shipping `areas` give, derives the runs each blueprint of the same pattern would give at that
   surface, and reports whether any blueprint matches. That is ROW GEOMETRY ONLY.

   AN `identical` LINE IS NOT "NOTHING CHANGES". The two layers SELECT differently — the shipping
   catalogue keys on (surface, aspect class), the blueprint layer on (presentationRole, geometryClass,
   surface) — so a subdesign whose rows match a blueprint exactly may still be chosen for different
   objects afterwards. The selection change is reported separately at the end, because it is the part
   that cannot be settled inside the catalogue: it has to be AUTHORED, page by page, on the block that
   carries the object.

   THE TAIL USED TO ASSERT — IN A HARDCODED SENTENCE — THAT NO SHIPPING PAGE DECLARED A
   presentationRole, and it kept saying so after every page had been given one, because it read what
   the PATTERN admits and never what the PAGE authored. A report that cannot observe the thing it
   reports on is a report that will eventually be wrong without changing. It now reads the role off
   each media block, and it walks a SHELL's nested instances too — the subtopics shell holds the whole
   lesson and was skipped entirely, so the pages that matter most were the ones missing from the list.

   Run: node scripts/adoption-scan.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const CAT = rd('docs/atlas/composition/src/patterns.json');
const BP = rd('docs/atlas/composition-proof/src/blueprints.json');
const SPANS = rd('docs/atlas/slot-span/src/spans.json');
const P = CAT.patterns || CAT;
const cols = (surface, rung, spineSpan) => rung === 'spine' ? spineSpan : BP.soloLadder[surface][rung];

/* the column runs a row actually gives, named — the one representation both layers can be put into */
const runsOfAreas = (areas) => areas.map((a) => {
  const tk = a.trim().split(/\s+/), out = [];
  tk.forEach((x, i) => {
    if (x === '.') return;
    const last = out[out.length - 1];
    if (last && last.n === x && last.to === i) last.to = i + 1; else out.push({ n: x, from: i, to: i + 1 });
  });
  return out.map((z) => `${z.n}:${z.from + 1}-${z.to}`).join(' ');
}).join(' | ');

const runsOfBlueprint = (bp, surface) => {
  if (!bp.rows[surface]) return null;
  const sp = bp.spine[surface], N = SPANS.surfaces[surface].columns;
  return bp.rows[surface].map((r) => {
    if (r.horizontal.mode === 'solo') {
      const c = cols(surface, r.horizontal.preferred, sp.span);
      const from = sp.align === 'centre' ? (N - c) / 2 + 1 : 1;
      return `${r.region}:${from}-${from + c - 1}`;
    }
    const sk = SPANS.surfaces[surface].splits[r.horizontal.split];
    return r.horizontal.regions.map((w, i) => w ? `${w}:${sk.regions[i][0]}-${sk.regions[i][1]}` : null)
      .filter(Boolean).join(' ');
  }).join(' | ');
};

const same = [], differs = [];
console.log('THE ADOPTION SCAN — every shipping subdesign against the blueprint layer\n');
for (const [pid, p] of Object.entries(P)) {
  if (!p.subdesigns) continue;
  const B = BP.patterns[pid];
  console.log(`── ${pid}`);
  if (!B) { console.log('     no blueprint pattern at all'); continue; }
  for (const sd of p.subdesigns) {
    const ship = runsOfAreas(sd.areas);
    const cands = Object.entries(B.blueprints).map(([b, bp]) => [b, runsOfBlueprint(bp, sd.surface)])
      .filter(([, s]) => s);
    const hit = cands.find(([, s]) => s === ship);
    if (hit) { same.push([pid, sd.id, sd.surface, hit[0]]); console.log(`     ${sd.id.padEnd(9)} ${sd.surface.padEnd(8)} rows match \`${hit[0]}\``); }
    else {
      differs.push([pid, sd.id, sd.surface, ship, cands]);
      console.log(`     ${sd.id.padEnd(9)} ${sd.surface.padEnd(8)} DIFFERS`);
      console.log(`         shipping  ${ship}`);
      for (const [b, s] of cands) console.log(`         ${b.padEnd(22)} ${s}`);
    }
  }
}

console.log(`\n${same.length} subdesign(s) match a blueprint's rows · ${differs.length} differ\n`);
console.log('THE SELECTION CHANGE, which no row comparison can show');
console.log('  The shipping catalogue selects by (surface, aspect class). The blueprint layer selects by');
console.log('  (presentationRole, geometryClass, surface), so adoption is not catalogue-only: every page');
console.log('  carrying media has to AUTHOR a role on the block that carries the object. What each one');
console.log('  declares today:');
const PAGES = rd('docs/atlas/composition/src/pages.json');

/* EVERY PATTERN INSTANCE ON A PAGE, INCLUDING THE ONES A SHELL HOLDS. A shell is not a pattern — it
   holds a tree of them — and walking only the top level skipped the subtopics shell, which is where
   the actual lesson lives. */
const instances = (node, out = []) => {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const x of node) instances(x, out); return out; }
  if (node.pattern && node.slots) out.push(node);
  for (const k of ['body', 'items', 'alternate']) if (node[k]) instances(node[k], out);
  return out;
};
/* the blocks a slot holds, whether the slot is a plain list or a disclosure group */
const blocksOf = (c) => !c ? [] : Array.isArray(c) ? c : (c.items || []).flatMap((i) => i.blocks || []);

let unauthored = 0;
for (const e of (PAGES.pages || PAGES)) {
  for (const inst of instances(e)) {
    const B = BP.patterns[inst.pattern];
    const mediaSlot = B && B.mediaSlot;
    if (!mediaSlot || !inst.slots[mediaSlot]) continue;
    const roles = B.admits ? B.admits.roles : null;
    const forced = roles && roles.length === 1;
    for (const b of blocksOf(inst.slots[mediaSlot])) {
      if (!b.figure) continue;
      const got = b.presentationRole || null;
      if (!got && !forced) unauthored++;
      console.log(`    page ${String(e.n).padEnd(3)} ${inst.pattern.padEnd(20)} ${String(b.figure).padEnd(11)}`
        + ` admits ${(roles ? roles.join('/') : '—').padEnd(32)}`
        + (got ? `authored \`${got}\`` + (roles && !roles.includes(got) ? '  ✗ NOT ADMITTED' : '')
          : forced ? 'forced by `admits`, no authoring needed' : '✗ NOT AUTHORED'));
    }
  }
}
console.log(unauthored
  ? `\n  ${unauthored} media block(s) still need a role authored.`
  : '\n  Every media block that needs a role has one.');
