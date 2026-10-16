/*
 * T-7r4V3x — cohérence de la version : src/version.js et CHANGELOG.md. Licence : GPL-2.0-or-later (voir LICENSE).
 * (Le nom de cache du service worker rejoindra ce test au jalon 3.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION, RELEASE_DATE } from '../src/version.js';

test('la version et la date correspondent à la première entrée du CHANGELOG', () => {
  const log = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  const m = log.match(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/m);
  assert.ok(m, 'aucune entrée de version dans CHANGELOG.md');
  assert.equal(m[1], VERSION);
  assert.equal(m[2], RELEASE_DATE);
});

test('package.json porte la même version', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, VERSION);
});
