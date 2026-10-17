/*
 * Tetravex PWA — tests de la logique du jeu. Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Puzzle } from '../src/puzzle.js';

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const allTiles = (p) => {
  const out = [];
  for (let x = 0; x < p.size * 2; x++) for (let y = 0; y < p.size; y++) if (p.getTile(x, y)) out.push(p.getTile(x, y));
  return out;
};

test('paramètres invalides refusés', () => {
  assert.throws(() => new Puzzle(0, 5), RangeError);
  assert.throws(() => new Puzzle(3, 0), RangeError);
  assert.throws(() => new Puzzle(2.5, 3), RangeError);
});

test('le plateau de départ : zone de jeu vide, réserve pleine, tuiles uniques', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const p = new Puzzle(3, 5, { random: seeded(seed) });
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) assert.equal(p.getTile(x, y), null);
    for (let x = 3; x < 6; x++) for (let y = 0; y < 3; y++) assert.notEqual(p.getTile(x, y), null);
    assert.equal(new Set(allTiles(p)).size, 9);
    assert.equal(p.isSolved(), false);
    assert.equal(p.isSolvedRight(), false);
  }
});

test('les bords de la solution se correspondent (puzzle toujours résoluble)', () => {
  const p = new Puzzle(4, 6, { random: seeded(42) });
  const sol = [];
  for (const t of allTiles(p)) (sol[t.x] ??= [])[t.y] = t;
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      if (x < 3) assert.equal(sol[x][y].east, sol[x + 1][y].west);
      if (y < 3) assert.equal(sol[x][y].south, sol[x][y + 1].north);
    }
  }
});

test('les valeurs des bords restent dans [0, colors)', () => {
  const p = new Puzzle(3, 4, { random: seeded(7) });
  for (const t of allTiles(p)) {
    for (const v of [t.north, t.south, t.east, t.west]) assert.ok(v >= 0 && v < 4);
  }
});

test('tuile placée à sa position de solution : acceptée ; toutes placées : victoire', () => {
  const p = new Puzzle(3, 5, { random: seeded(11) });
  for (const tile of allTiles(p)) {
    const from = p.getTileLocation(tile);
    assert.ok(p.switchTiles(from.x, from.y, tile.x, tile.y), 'une tuile à sa place doit toujours être acceptée');
  }
  assert.equal(p.isSolved(), true);
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) {
    assert.equal(p.getTile(x, y).x, x);
    assert.equal(p.getTile(x, y).y, y);
  }
});

test("une tuile qui ne s'emboîte pas est refusée dans la zone de jeu", () => {
  const p = new Puzzle(2, 9, { random: seeded(5) });
  // Pose la tuile (0,0) à sa place, puis cherche une tuile qui ne peut pas aller en (1,0).
  const t00 = allTiles(p).find((t) => t.x === 0 && t.y === 0);
  const f = p.getTileLocation(t00);
  assert.ok(p.switchTiles(f.x, f.y, 0, 0));
  let refused = 0;
  for (const tile of allTiles(p)) {
    const loc = p.getTileLocation(tile);
    if (loc.x < 2) continue;
    const fits = tile.west === t00.east;
    assert.equal(p.canSwitch(loc.x, loc.y, 1, 0), fits);
    if (!fits) refused++;
  }
  assert.ok(refused > 0, 'le test doit rencontrer au moins un refus (graine fixe)');
});

test('échanges impossibles : même case, deux cases vides, hors plateau', () => {
  const p = new Puzzle(3, 5, { random: seeded(3) });
  assert.equal(p.canSwitch(3, 0, 3, 0), false);
  assert.equal(p.canSwitch(0, 0, 1, 0), false); // deux cases vides
  assert.equal(p.canSwitch(-1, 0, 3, 0), false);
  assert.equal(p.canSwitch(3, 0, 6, 0), false);
  assert.equal(p.switchTiles(0, 0, 1, 0), false);
});

test('annuler et rétablir un échange', () => {
  const p = new Puzzle(3, 5, { random: seeded(11) });
  const tile = allTiles(p)[0];
  const from = p.getTileLocation(tile);
  assert.ok(p.switchTiles(from.x, from.y, tile.x, tile.y));
  assert.equal(p.getTile(tile.x, tile.y), tile);
  assert.ok(p.canUndo);
  assert.ok(p.undo());
  assert.equal(p.getTile(tile.x, tile.y), null);
  assert.equal(p.getTileLocation(tile).x, from.x);
  assert.ok(p.canRedo);
  assert.ok(p.redo());
  assert.equal(p.getTile(tile.x, tile.y), tile);
  assert.equal(p.undo() && p.undo(), false); // un seul coup dans l'historique
});

test('déplacer le bloc de la réserve : bloqué tant que la réserve est pleine', () => {
  const p = new Puzzle(3, 5, { random: seeded(2) });
  assert.equal(p.moveLeft(false), false);
  assert.equal(p.moveUp(false), false);
});

test("déplacer un bloc partiel : les tuiles glissent d'une case, annulé en un seul coup", () => {
  const p = new Puzzle(3, 5, { random: seeded(11) });
  // Vide la première colonne de la réserve (x = 3) en posant ces tuiles à leur place.
  for (const y of [0, 1, 2]) {
    const tile = p.getTile(3, y);
    assert.ok(p.switchTiles(3, y, tile.x, tile.y), 'une tuile à sa place est toujours acceptée');
  }
  assert.deepEqual([0, 1, 2].map((y) => p.getTile(3, y)), [null, null, null]);
  const col4 = [0, 1, 2].map((y) => p.getTile(4, y));
  assert.ok(p.moveLeft(false));
  assert.deepEqual([0, 1, 2].map((y) => p.getTile(3, y)), col4);
  assert.deepEqual([0, 1, 2].map((y) => p.getTile(5, y)), [null, null, null]);
  assert.ok(p.undo()); // un seul coup d'annulation pour tout le bloc déplacé
  assert.deepEqual([0, 1, 2].map((y) => p.getTile(4, y)), col4);
  assert.deepEqual([0, 1, 2].map((y) => p.getTile(3, y)), [null, null, null]);
});
