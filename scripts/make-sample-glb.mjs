#!/usr/bin/env node
// Dev-only: emits assets/vendor/sample-cube.glb — a tiny (~1 KB) self-contained
// glTF 2.0 binary (a clay-coloured double-sided cube). Used as the seed model3d
// slide's sample so the 3D slide needs no external host. Regenerate with:
//   node scripts/make-sample-glb.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets', 'vendor', 'sample-cube.glb');

// 8 unit-cube corners
const positions = new Float32Array([
  -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5, 0.5,  0.5, -0.5, 0.5,  0.5,
]);
// 12 triangles (material is doubleSided, so winding is not critical)
const indices = new Uint16Array([
  4, 5, 6, 6, 7, 4,   0, 3, 2, 2, 1, 0,   0, 7, 3, 7, 0, 4,
  1, 2, 6, 6, 5, 1,   3, 7, 6, 6, 2, 3,   0, 1, 5, 5, 4, 0,
]);

const posBytes = Buffer.from(positions.buffer);
const idxBytes = Buffer.from(indices.buffer);
const bin = Buffer.concat([posBytes, idxBytes]); // 96 + 72 = 168, 4-byte aligned

const gltf = {
  asset: { version: '2.0', generator: 'Lesson Studio make-sample-glb' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
  materials: [{
    name: 'clay',
    pbrMetallicRoughness: { baseColorFactor: [0.66, 0.28, 0.16, 1], metallicFactor: 0, roughnessFactor: 0.8 },
    doubleSided: true,
  }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
    { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
    { buffer: 0, byteOffset: posBytes.length, byteLength: idxBytes.length, target: 34963 },
  ],
  buffers: [{ byteLength: bin.length }],
};

const pad = (buf, fill) => {
  const rem = buf.length % 4;
  return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(4 - rem, fill)]);
};
const jsonChunk = pad(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20); // pad with spaces
const binChunk = pad(bin, 0x00);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // 'glTF'
header.writeUInt32LE(2, 4);          // version
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8); // total length

const jsonHead = Buffer.alloc(8);
jsonHead.writeUInt32LE(jsonChunk.length, 0);
jsonHead.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binHead = Buffer.alloc(8);
binHead.writeUInt32LE(binChunk.length, 0);
binHead.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

const glb = Buffer.concat([header, jsonHead, jsonChunk, binHead, binChunk]);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, glb);
console.log(`✓ Wrote ${path.relative(root, out)} (${glb.length} bytes)`);
