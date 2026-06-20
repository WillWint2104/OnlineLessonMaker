#!/usr/bin/env node
// Validates the app and every published lesson. Hard-fails on broken JSON or
// invalid engine JavaScript; warns on firewall/storage guardrails.
//
//   node scripts/validate.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const targets = [];
if (fs.existsSync('lesson-studio.html')) targets.push('lesson-studio.html');
if (fs.existsSync('lessons')) {
  for (const f of fs.readdirSync('lessons')) {
    if (f.endsWith('.html')) targets.push(path.join('lessons', f));
  }
}
if (targets.length === 0) {
  console.error('✗ No lesson-studio.html or lessons/*.html found.');
  process.exit(1);
}

let failed = false;
const warn = (m) => console.warn('  ⚠ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); failed = true; };
const ok   = (m) => console.log('  ✓ ' + m);

for (const file of targets) {
  console.log(`\n• ${file}`);
  const html = fs.readFileSync(file, 'utf8');

  // 1) lesson-data JSON must parse and have a slides array
  const data = html.match(/<script id="lesson-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!data) {
    fail('missing <script id="lesson-data">');
  } else {
    try {
      const parsed = JSON.parse(data[1]);
      if (!Array.isArray(parsed.slides)) throw new Error('"slides" array missing');
      ok(`lesson JSON OK (${parsed.slides.length} slides)`);
    } catch (e) {
      fail(`lesson JSON invalid — ${e.message}`);
    }
  }

  // 2) the engine (last <script>…</script>) must be syntactically valid JS
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (scripts.length === 0) {
    fail('no inline engine <script> found');
  } else {
    const tmp = path.join(os.tmpdir(), `engine-${process.pid}-${Date.now()}.js`);
    fs.writeFileSync(tmp, scripts[scripts.length - 1]);
    try {
      execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
      ok('engine script syntax OK');
    } catch (e) {
      fail('engine script syntax error:\n' + (e.stderr?.toString() || e.message));
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  // 3) guardrail: no browser storage (app is intentionally stateless)
  if (/\b(localStorage|sessionStorage)\b/.test(html)) {
    warn('uses localStorage/sessionStorage — the app is meant to be stateless; confirm this is intended');
  }

  // 4) firewall guardrail: third-party runtime hosts in <script>/<link>.
  //    HARD FAIL for the app (lesson-studio.html must be self-contained so a
  //    published lesson makes zero third-party requests); WARNING for
  //    lessons/*.html (teachers may legitimately embed external video/images).
  const hosts = new Set();
  for (const m of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:\/\/[^"']+)"/g)) {
    try { hosts.add(new URL(m[1]).host); } catch { /* ignore */ }
  }
  if (hosts.size) {
    const list = [...hosts].join(', ');
    if (file === 'lesson-studio.html') {
      fail(`third-party runtime host(s) in <script>/<link>: ${list} — the app must be self-contained (vendor it; see HANDOFF §8)`);
    } else {
      warn(`third-party runtime hosts referenced (verify school firewall / consider vendoring): ${list}`);
    }
  }
}

if (failed) {
  console.error('\nValidation FAILED.');
  process.exit(1);
}
console.log('\nAll checks passed.');
