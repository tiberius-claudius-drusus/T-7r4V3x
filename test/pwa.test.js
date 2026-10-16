/*
 * T-7r4V3x — cohérence PWA : manifeste, service worker, icônes, version. Licence : GPL-2.0-or-later (voir LICENSE).
 * Garde-fou contre le « cache périmé » : version de sw.js = version de src/version.js, et tout fichier utile est
 * dans la liste de mise en cache.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { VERSION } from '../src/version.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const sw = read('sw.js');
const files = [...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

test('la version du service worker est celle de src/version.js', () => {
  assert.equal(sw.match(/const VERSION = '([^']+)'/)[1], VERSION);
  assert.match(sw, /const CACHE = `t7r4v3x-\$\{VERSION\}`/);
});

test('chaque fichier mis en cache existe', () => {
  for (const f of files) {
    if (f === './') continue;
    assert.ok(existsSync(new URL(f, root)), `fichier absent : ${f}`);
  }
});

test('tous les fichiers de src/ et les fichiers de la page sont mis en cache', () => {
  for (const f of readdirSync(new URL('src/', root)).filter((n) => n.endsWith('.js'))) {
    assert.ok(files.includes(`src/${f}`), `src/${f} absent de la liste de cache`);
  }
  for (const f of readdirSync(new URL('src/lang/', root)).filter((n) => n.endsWith('.js'))) {
    assert.ok(files.includes(`src/lang/${f}`), `src/lang/${f} absent de la liste de cache`);
  }
  for (const f of ['index.html', 'app.js', 'manifest.webmanifest', 'LICENSE']) {
    assert.ok(files.includes(f), `${f} absent de la liste de cache`);
  }
});

test('les modules importés par app.js sont mis en cache', () => {
  for (const m of read('app.js').matchAll(/from '\.\/([^']+)'/g)) {
    assert.ok(files.includes(m[1]), `${m[1]} importé par app.js mais absent du cache`);
  }
});

test('le manifeste est valide et ses icônes existent', () => {
  const mf = JSON.parse(read('manifest.webmanifest'));
  assert.equal(mf.name, 'T-7r4V3x');
  assert.equal(mf.display, 'standalone');
  assert.ok(mf.start_url && mf.scope);
  assert.ok(mf.icons.some((i) => i.sizes === '192x192'));
  assert.ok(mf.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
  for (const i of mf.icons) assert.ok(existsSync(new URL(i.src, root)), `icône absente : ${i.src}`);
});

test('les icônes sont de vrais PNG aux bonnes dimensions', () => {
  for (const [name, size] of [['icon-180.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]]) {
    const b = readFileSync(new URL(name, root));
    assert.deepEqual([...b.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${name} : signature PNG`);
    assert.equal(b.readUInt32BE(16), size, `${name} : largeur`);
    assert.equal(b.readUInt32BE(20), size, `${name} : hauteur`);
  }
});

test('la page déclare le manifeste (avec identifiants) et enregistre le service worker', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest" crossorigin="use-credentials">/);
  assert.match(html, /<link rel="apple-touch-icon" href="icon-180\.png">/);
  assert.match(read('app.js'), /serviceWorker\.register\('sw\.js'\)/);
});
