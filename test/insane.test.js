/*
 * T-7r4V3x — tests du mode Insane (rotation des tuiles). Licence : GPL-2.0-or-later (voir LICENSE).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Puzzle, Tile } from '../src/puzzle.js';
import { GeoPuzzle, GeoTile, GEO_SHAPES, GEO_SIZES } from '../src/geopuzzle.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const tilesOf = (p) => {
  const out = [];
  for (let x = 0; x < p.W * 2; x++) for (let y = 0; y < p.H; y++) if (p.board[x]?.[y]) out.push(p.board[x][y]);
  return out;
};
const firstTrayCell = (p) => {
  for (let x = p.W; x < p.W * 2; x++) for (let y = 0; y < p.H; y++) if (p.board[x]?.[y]) return { x, y };
  return null;
};

test('Tile : un quart de tour horaire fait passer le haut à droite, quatre quarts ramènent à l\'identique', () => {
  const t = new Tile(0, 0);
  Object.assign(t, { north: 1, east: 2, south: 3, west: 4 });
  t.rotate(1);
  assert.deepEqual([t.north, t.east, t.south, t.west], [4, 1, 2, 3]);
  t.rotate(-1);
  assert.deepEqual([t.north, t.east, t.south, t.west], [1, 2, 3, 4]);
  t.rotate(4);
  assert.deepEqual([t.north, t.east, t.south, t.west], [1, 2, 3, 4]);
  t.rotate(-5);
  assert.deepEqual([t.north, t.east, t.south, t.west], [2, 3, 4, 1]);
});

test('GeoTile : rotation de k crans, n crans ramènent à l\'identique, sens inverse', () => {
  for (const n of [4, 6, 8]) {
    const t = new GeoTile(0, 0, 'x', n);
    t.edges = Array.from({ length: n }, (_, i) => i);
    t.rotate(1);
    assert.equal(t.edges[1], 0);
    assert.equal(t.edges[0], n - 1);
    t.rotate(-1);
    assert.deepEqual(t.edges, Array.from({ length: n }, (_, i) => i));
    t.rotate(n);
    assert.deepEqual(t.edges, Array.from({ length: n }, (_, i) => i));
    assert.equal(t.sides, n);
  }
});

test('partie normale : aucune rotation possible', () => {
  const p = new Puzzle(3, 5, { random: seeded(1) });
  assert.equal(p.insane, false);
  const c = firstTrayCell(p);
  assert.equal(p.canRotate(c.x, c.y), false);
  assert.equal(p.rotateTile(c.x, c.y), false);
  const g = new GeoPuzzle('hex', 3, 5, { random: seeded(1) });
  const gc = firstTrayCell(g);
  assert.equal(g.rotateTile(gc.x, gc.y), false);
});

test('Insane : le mélange fait tourner des tuiles, mais la partie reste résoluble (mêmes multiensembles de côtés)', () => {
  const sort = (p) => tilesOf(p).map((t) => (t.edges ?? [t.north, t.east, t.south, t.west]).join()).length;
  const calm = new Puzzle(4, 6, { random: seeded(7) });
  const wild = new Puzzle(4, 6, { random: seeded(7), insane: true });
  assert.equal(sort(calm), sort(wild));
  assert.equal(wild.insane, true);
  // même graine : les tuiles de départ sont les mêmes, mais au moins une a tourné
  const key = (t) => [t.north, t.east, t.south, t.west].join();
  const a = tilesOf(calm).map(key).join('|');
  const b = tilesOf(wild).map(key).join('|');
  assert.notEqual(a, b);
});

test('rotation dans la réserve : toujours permise, annulable et rétablissable', () => {
  const p = new Puzzle(3, 5, { random: seeded(3), insane: true });
  const c = firstTrayCell(p);
  const tile = p.getTile(c.x, c.y);
  const before = [tile.north, tile.east, tile.south, tile.west];
  assert.equal(p.rotateTile(c.x, c.y, 1), true);
  assert.equal(p.canUndo, true);
  assert.ok(p.undo());
  assert.deepEqual([tile.north, tile.east, tile.south, tile.west], before);
  assert.ok(p.redo());
  assert.notDeepEqual([tile.north, tile.east, tile.south, tile.west], before);
  assert.equal(p.rotateTile(c.x, c.y, 4), false, 'un tour complet ne change rien et n\'est pas un coup');
});

test('rotation dans la zone de jeu : refusée si elle désemboîte la tuile', () => {
  const p = new Puzzle(2, 2, { random: seeded(5), insane: true });
  // On construit la solution à la main : 2×2 avec toutes les valeurs différentes.
  p.board = Array.from({ length: 4 }, () => new Array(2).fill(null));
  const mk = (x, y, n, e, s, w) => Object.assign(new Tile(x, y), { north: n, east: e, south: s, west: w });
  p.board[0][0] = mk(0, 0, 0, 1, 2, 0);
  p.board[1][0] = mk(1, 0, 0, 0, 3, 1);
  p.board[0][1] = mk(0, 1, 2, 4, 0, 0);
  p.board[1][1] = mk(1, 1, 3, 0, 0, 4);
  assert.equal(p._cellFits(0, 0), true);
  assert.equal(p.canRotate(0, 0, 1), false);
  assert.equal(p.rotateTile(0, 0, 1), false);
  assert.equal(p.canRotate(0, 0, 2), false);
  // tuile seule dans la zone de jeu (voisines vides) : tout est permis
  p.board[1][0] = null; p.board[0][1] = null; p.board[1][1] = null;
  assert.equal(p.canRotate(0, 0, 1), true);
});

test('sauvegarde : le mode Insane et les rotations survivent à toJSON / fromJSON', () => {
  for (const mk of [
    () => new Puzzle(3, 5, { random: seeded(9), insane: true }),
    ...GEO_SHAPES.flatMap((shape) => GEO_SIZES.map((n) => () => new GeoPuzzle(shape, n, 6, { random: seeded(9), insane: true }))),
  ]) {
    const p = mk();
    const c = firstTrayCell(p);
    p.rotateTile(c.x, c.y, 1);
    const json = JSON.parse(JSON.stringify(p.toJSON()));
    assert.equal(json.insane, true);
    const q = (p.shape === 'carre' ? Puzzle : GeoPuzzle).fromJSON(json);
    assert.equal(q.insane, true);
    assert.deepEqual(q.toJSON(), p.toJSON());
  }
  const normal = new Puzzle(3, 5, { random: seeded(9) });
  assert.equal(Puzzle.fromJSON(JSON.parse(JSON.stringify(normal.toJSON()))).insane, false);
  const old = normal.toJSON();
  delete old.insane; // sauvegarde d'avant le mode Insane
  assert.equal(Puzzle.fromJSON(old).insane, false);
});

test('GeoPuzzle Insane : rotation en zone de jeu refusée si elle ne s\'emboîte pas, annuler la restitue', () => {
  const p = new GeoPuzzle('hex', 3, 4, { random: seeded(21), insane: true });
  // Remplit la zone de jeu avec les tuiles qui s'emboîtent, par essais d'échanges depuis la réserve.
  const trays = [];
  for (let x = p.W; x < p.W * 2; x++) for (let y = 0; y < p.H; y++) if (p.isCell(x, y)) trays.push([x, y]);
  let placed = 0;
  for (const [tx, ty] of trays) {
    const tile = p.getTile(tx, ty);
    if (!tile) continue;
    search:
    for (let x = 0; x < p.W; x++) {
      for (let y = 0; y < p.H; y++) {
        if (!p.isCell(x, y) || p.getTile(x, y)) continue;
        for (let r = 0; r < tile.sides; r++) {
          if (p.canSwitch(tx, ty, x, y)) { p.switchTiles(tx, ty, x, y); placed += 1; break search; }
          p.rotateTile(tx, ty, 1);
        }
      }
    }
  }
  assert.ok(placed >= 2, 'au moins deux tuiles placées');
  // Pour une tuile placée qui a une voisine, une rotation qui ne s'emboîte pas est refusée sans rien changer.
  let refused = 0;
  for (let x = 0; x < p.W; x++) {
    for (let y = 0; y < p.H; y++) {
      const tile = p.getTile(x, y);
      if (!tile) continue;
      const before = tile.edges.join();
      for (let k = 1; k < tile.sides; k++) {
        const can = p.canRotate(x, y, k);
        const done = p.rotateTile(x, y, k);
        assert.equal(can, done);
        if (!done) { refused += 1; assert.equal(tile.edges.join(), before); } else { assert.ok(p.undo()); assert.equal(tile.edges.join(), before); }
      }
    }
  }
  assert.ok(refused > 0);
});
