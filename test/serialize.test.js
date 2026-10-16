/*
 * T-7r4V3x — tests de la sauvegarde / restauration d'une partie. Licence : GPL-2.0-or-later (voir LICENSE).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Puzzle } from '../src/puzzle.js';

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

const layout = (p) => p.board.map((col) => col.map((t) => (t ? [t.x, t.y, t.north, t.east, t.south, t.west] : null)));

test('aller-retour JSON : même plateau, même état', () => {
  const p = new Puzzle(3, 6, { random: seeded(21) });
  const tile = p.getTile(3, 0);
  p.switchTiles(3, 0, tile.x, tile.y);
  const copy = Puzzle.fromJSON(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(layout(copy), layout(p));
  assert.equal(copy.size, 3);
  assert.equal(copy.colors, 6);
  assert.equal(copy.gameInProgress, true);
});

test('une partie restaurée reste jouable et gagnable', () => {
  const p = new Puzzle(2, 4, { random: seeded(8) });
  const copy = Puzzle.fromJSON(JSON.parse(JSON.stringify(p)));
  const tiles = [];
  for (let x = 0; x < 4; x++) for (let y = 0; y < 2; y++) if (copy.getTile(x, y)) tiles.push(copy.getTile(x, y));
  for (const tile of tiles) {
    const from = copy.getTileLocation(tile);
    assert.ok(copy.switchTiles(from.x, from.y, tile.x, tile.y));
  }
  assert.equal(copy.isSolved(), true);
});

test('états invalides refusés', () => {
  const base = JSON.parse(JSON.stringify(new Puzzle(2, 4, { random: seeded(3) })));
  const bad = (mutate) => {
    const s = JSON.parse(JSON.stringify(base));
    mutate(s);
    assert.throws(() => Puzzle.fromJSON(s));
  };
  assert.throws(() => Puzzle.fromJSON(null));
  bad((s) => { s.tiles.pop(); });
  bad((s) => { s.cells[0][0] = 99; });
  bad((s) => { s.cells[2][0] = s.cells[2][1] = s.cells[3][0]; });
  bad((s) => { s.tiles[0][2] = 77; });
  bad((s) => { s.cells.pop(); });
  bad((s) => { s.tiles[0][0] = -1; });
});
