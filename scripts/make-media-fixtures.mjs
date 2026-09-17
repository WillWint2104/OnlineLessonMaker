/* ── THE MEDIA FIXTURES, GENERATED ────────────────────────────────────────────────────────────────
   The slot-fit atlas needs objects of every shape a lesson can carry, and it needs the SAME objects
   next month, so they are generated here and committed. Nothing is downloaded: no third-party host
   may serve lesson media, and a fixture fetched from the internet would not be a regression asset.

   There is no ffmpeg in this environment, so the clip is drawn on a canvas in Chromium and captured
   with MediaRecorder. Run:  node scripts/make-media-fixtures.mjs
   It rewrites docs/atlas/media/*.png and clip-16x9.webm in place; diagram-portrait.svg is authored
   by hand and is not touched. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'docs/atlas/media');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

/* A deterministic photographic-weight raster: a sky gradient, a ground band, a parabolic arch with
   its hangers, and a burnt-in label naming the fixture and its true pixel size — so every inspector
   proof says which object it is looking at and at what raster resolution. */
const SCENES = [
  ['image-portrait-3x4.png', 900, 1200, 'The arch', '#253c54', '#7e96a0'],
  ['image-square-1x1.png', 1100, 1100, 'The dish', '#2e2c4e', '#96848c'],
  ['image-landscape-16x9.png', 1600, 900, 'The span', '#1a363e', '#969e8c'],
  ['clip-16x9-poster.png', 1280, 720, 'Tracing the path', '#1e2a42', '#808c98'],
];
for (const [name, w, h, title, top, bot] of SCENES) {
  const b64 = await page.evaluate(({ w, h, title, top, bot, name }) => {
    const c = document.getElementById('c'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const gy = Math.round(h * 0.78);
    x.fillStyle = '#262e2b'; x.fillRect(0, gy, w, h - gy);
    const a = (gy - h * 0.20) / ((w / 2) ** 2);
    const yOf = (px) => gy - (gy - h * 0.20) + a * (px - w / 2) ** 2;
    x.strokeStyle = '#f6f3ec'; x.lineWidth = Math.max(3, w / 200);
    x.beginPath(); for (let px = 0; px <= w; px += 2) px ? x.lineTo(px, yOf(px)) : x.moveTo(px, yOf(px));
    x.stroke();
    x.strokeStyle = '#d6d1c6'; x.lineWidth = Math.max(1, w / 480);
    for (let i = 1; i < 12; i++) {
      const px = w * i / 12; x.beginPath(); x.moveTo(px, yOf(px)); x.lineTo(px, gy); x.stroke();
    }
    x.fillStyle = '#b4b0a6'; x.fillRect(0, gy, w, Math.max(2, h / 300));
    x.fillStyle = '#fff'; x.font = `${Math.max(15, Math.round(w / 34))}px system-ui, sans-serif`;
    x.fillText(title, Math.round(w * 0.055), Math.round(h * 0.055) + Math.round(w / 34));
    x.fillStyle = '#e2e8e5'; x.font = `${Math.max(11, Math.round(w / 56))}px system-ui, sans-serif`;
    x.fillText(`${name}  ·  ${w}×${h}px raster`, Math.round(w * 0.055),
      Math.round(h * 0.055) + Math.round(w / 34) + Math.round(w / 30));
    return c.toDataURL('image/png').split(',')[1];
  }, { w, h, title, top, bot, name });
  fs.writeFileSync(path.join(OUT, name), Buffer.from(b64, 'base64'));
  console.log(`${name.padEnd(28)} ${w}×${h}  ${(fs.statSync(path.join(OUT, name)).size / 1024).toFixed(0)} KB`);
}

/* the clip: 4 seconds at 25fps, a point traced along the curve */
const vid = await page.evaluate(async () => {
  const c = document.getElementById('c'); c.width = 1280; c.height = 720;
  const x = c.getContext('2d');
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('no webm encoder in this browser');
  const rec = new MediaRecorder(c.captureStream(25), { mimeType: mime, videoBitsPerSecond: 900000 });
  const parts = []; rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
  const done = new Promise((r) => { rec.onstop = r; });
  rec.start();
  const N = 100, yOf = (px) => 562 - (430 - 430 * ((px - 640) / 640) ** 2);
  for (let f = 0; f < N; f++) {
    const k = f / (N - 1);
    const g = x.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, '#1e2a42'); g.addColorStop(1, '#7d8a98');
    x.fillStyle = g; x.fillRect(0, 0, 1280, 720);
    x.fillStyle = '#262e2b'; x.fillRect(0, 562, 1280, 158);
    x.strokeStyle = 'rgba(246,243,236,.30)'; x.lineWidth = 3;
    x.beginPath(); for (let q = 0; q <= 1280; q += 4) q ? x.lineTo(q, yOf(q)) : x.moveTo(q, yOf(q));
    x.stroke();
    const px = 1280 * k;
    x.strokeStyle = '#f6f3ec'; x.lineWidth = 5; x.beginPath();
    for (let q = 0; q <= px; q += 4) q ? x.lineTo(q, yOf(q)) : x.moveTo(q, yOf(q));
    x.stroke();
    x.fillStyle = '#e9b44c'; x.beginPath(); x.arc(px, yOf(px), 13, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.font = '600 38px system-ui, sans-serif';
    x.fillText('Tracing the path', 70, 92);
    x.fillStyle = '#e2e8e5'; x.font = '22px system-ui, sans-serif';
    x.fillText(`clip-16x9.webm  ·  1280×720  ·  ${f + 1}/${N}`, 70, 128);
    await new Promise((r) => setTimeout(r, 40));
  }
  rec.stop(); await done;
  const buf = await new Blob(parts, { type: mime }).arrayBuffer();
  let s = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
});
fs.writeFileSync(path.join(OUT, 'clip-16x9.webm'), Buffer.from(vid, 'base64'));
console.log(`clip-16x9.webm               1280×720  ${(fs.statSync(path.join(OUT, 'clip-16x9.webm')).size / 1024).toFixed(0)} KB`);
await browser.close();
