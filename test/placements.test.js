/*
 * T-7r4V3x — la table des placements possibles (src/placements.js) correspond au calcul, et la page sait la lire.
 * Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLACEMENTS } from '../src/placements.js';
import { placementCount, engineering, table } from '../tools/placements-calc.mjs';
import { makeCode, puzzleFromCode, SHAPES, sizesOf, COLORS } from '../src/code.js';

test('le calcul : n! en mode normal, avec les orientations en Insane, par sorte de tuile sur le plateau tronqué', () => {
  assert.equal(placementCount({ shape: 'carre', size: 2 }), 24); // 4!
  assert.equal(placementCount({ shape: 'carre', size: 3 }), 362880); // 9!
  assert.equal(placementCount({ shape: 'carre', size: 3, insane: true }), 362880 * 4 ** 9);
  assert.equal(placementCount({ shape: 'hex', size: 3 }), 479001600); // 12 hexagones
  assert.equal(placementCount({ shape: 'oct', size: 3 }), 362880 * 24); // 9 octogones et 4 petits carrés
  assert.equal(placementCount({ shape: 'oct', size: 3, insane: true }), 362880 * 8 ** 9 * 24 * 4 ** 4);
});

test('8/4gone : octogones × carrés', () => {
  assert.equal(placementCount({ shape: 'dam', size: 3 }), 120 * 24); // 5! × 4!
  assert.equal(placementCount({ shape: 'dam', size: 3, insane: true }), 120 * 8 ** 5 * 24 * 4 ** 4);
  assert.equal(placementCount({ shape: 'dam', size: 5 }), 6227020800 * 479001600); // 13! × 12!
});

test('l\'écriture à trois chiffres', () => {
  assert.equal(engineering(362880), '3.63×10⁵');
  assert.equal(engineering(24), '2.40×10¹');
  assert.equal(engineering(999960), '1.00×10⁶'); // l'arrondi change l'exposant
});

test('la table de la page est à jour (sinon : node tools/gen-placements.mjs)', () => {
  assert.deepEqual(PLACEMENTS, table());
});

test('chaque configuration jouable a son entrée dans la table', () => {
  for (const shape of SHAPES) {
    for (const size of sizesOf(shape)) {
      for (const insane of [false, true]) {
        const p = puzzleFromCode(makeCode({ shape, size, colors: COLORS[0], insane }));
        const v = PLACEMENTS[`${p.shape}-${p.size}-${p.insane ? 1 : 0}`];
        assert.match(v, /^\d\.\d\d×10[⁰¹²³⁴-⁹]+$/, `${shape} ${size} ${insane}`);
      }
    }
  }
});
