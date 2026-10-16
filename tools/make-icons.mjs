/*
 * T-7r4V3x — génère les icônes PNG de l'application (sans dépendance) : le logo (carré 2×2 résolu) aux
 * couleurs du thème « Épuré clair ». Usage : node tools/make-icons.mjs
 * Licence : GPL-2.0-or-later (voir LICENSE).
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { resolve } from '../src/themes.js';
import { LOGO_TILES } from '../src/logo.js';

const vars = resolve('epure', 'clair');
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const BG = hex(vars['--bg']);
const COLORS = Array.from({ length: 10 }, (_, i) => hex(vars[`--tile-${i}`]));
const TILE = 44;
const SS = 3; // sur-échantillonnage 3×3 : bords lissés

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Couleur du point (u, v) en coordonnées du logo (0..100). */
function sample(u, v) {
  for (const { x, y, v: val } of LOGO_TILES) {
    if (u >= x && u < x + TILE && v >= y && v < y + TILE) {
      const dx = u - x - TILE / 2;
      const dy = v - y - TILE / 2;
      const [n, e, s, w] = val;
      if (Math.abs(dy) > Math.abs(dx)) return COLORS[dy < 0 ? n : s];
      return COLORS[dx > 0 ? e : w];
    }
  }
  return BG;
}

function render(size, padding) {
  const area = size * (1 - 2 * padding);
  const off = size * padding;
  const k = 100 / area;
  const rgb = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0; let g = 0; let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample((px + (sx + 0.5) / SS - off) * k, (py + (sy + 0.5) / SS - off) * k);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const i = (py * size + px) * 3;
      rgb[i] = Math.round(r / (SS * SS));
      rgb[i + 1] = Math.round(g / (SS * SS));
      rgb[i + 2] = Math.round(b / (SS * SS));
    }
  }
  return encodePng(size, size, rgb);
}

const OUT = new URL('../', import.meta.url);
for (const [name, size, padding] of [
  ['icon-180.png', 180, 0.1],
  ['icon-192.png', 192, 0.08],
  ['icon-512.png', 512, 0.08],
  ['icon-maskable-512.png', 512, 0.2], // zone de sécurité des icônes « masquables » : le logo reste au centre
]) {
  writeFileSync(new URL(name, OUT), render(size, padding));
  console.log('écrit', name);
}
