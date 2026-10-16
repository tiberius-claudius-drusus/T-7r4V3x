/*
 * T-7r4V3x — tests des modes hexagonal et carré tronqué. Licence : GPL-2.0-or-later (voir LICENSE).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeoPuzzle, TOPOLOGIES, GEO_SHAPES, GEO_SIZES, hexDims } from '../src/geopuzzle.js';

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
  for (let x = 0; x < p.W * 2; x++) for (let y = 0; y < p.H; y++) if (p.getTile(x, y)) out.push(p.getTile(x, y));
  return out;
};

for (const shape of GEO_SHAPES) {
  for (const n of GEO_SIZES) {
    const topo = TOPOLOGIES[shape];
    const cells = [];
    for (let x = 0; x < topo.width(n); x++) for (let y = 0; y < topo.height(n); y++) if (topo.isCell(n, x, y)) cells.push([x, y]);

    test(`${shape} ${n}×${n} : nombre de cases`, () => {
      assert.equal(cells.length, shape === 'hex' ? hexDims(n).cols * hexDims(n).rows : n * n + (n - 1) * (n - 1));
    });

    test(`${shape} ${n}×${n} : chaque contact est réciproque et sans auto-contact`, () => {
      for (const [x, y] of cells) {
        const kind = topo.kind(n, x, y);
        for (let e = 0; e < topo.edgeCount(kind); e++) {
          const nb = topo.neighbor(n, x, y, e);
          if (!nb) continue;
          assert.ok(topo.isCell(n, nb.x, nb.y), 'le voisin doit exister');
          assert.ok(nb.x !== x || nb.y !== y, 'pas d\'auto-contact');
          const back = topo.neighbor(n, nb.x, nb.y, nb.e);
          assert.deepEqual(back, { x, y, e }, `${shape} (${x},${y}) côté ${e}`);
        }
      }
    });
  }
}

test('hexagonal : une case intérieure a 6 voisins, un hexagone d\'angle 2 ou 3', () => {
  const t = TOPOLOGIES.hex;
  const count = (x, y) => [0, 1, 2, 3, 4, 5].filter((e) => t.neighbor(5, x, y, e)).length; // 7×5
  assert.equal(count(2, 2), 6);
  assert.equal(count(1, 2), 6);
  assert.deepEqual([3, 4, 5].map((n) => hexDims(n)), [{ cols: 4, rows: 3 }, { cols: 6, rows: 4 }, { cols: 7, rows: 5 }]);
  assert.ok([2, 3].includes(count(0, 0)));
});

test('carré tronqué : octogone intérieur à 8 voisins, petit carré toujours à 4 octogones', () => {
  const t = TOPOLOGIES.oct;
  const count = (x, y) => [0, 1, 2, 3, 4, 5, 6, 7].filter((e) => t.neighbor(4, x, y, e)).length;
  assert.equal(count(2, 2), 8);
  assert.equal(count(0, 0), 3); // octogone d'angle : E, S et le petit carré SE
  for (let x = 1; x < 7; x += 2) for (let y = 1; y < 7; y += 2) {
    assert.equal([0, 1, 2, 3].filter((e) => t.neighbor(4, x, y, e)).length, 4);
    assert.equal(t.kind(4, x, y), 'sq');
  }
});

test('paramètres invalides refusés', () => {
  assert.throws(() => new GeoPuzzle('triangle', 3, 5), RangeError);
  assert.throws(() => new GeoPuzzle('hex', 1, 5), RangeError);
  assert.throws(() => new GeoPuzzle('hex', 3, 0), RangeError);
});

for (const shape of GEO_SHAPES) {
  for (const n of GEO_SIZES) {
    test(`${shape} ${n} : départ valide (réserve pleine, zone vide, tuiles uniques, jamais déjà résolu)`, () => {
      for (const seed of [1, 2, 3, 4]) {
        const p = new GeoPuzzle(shape, n, 5, { random: seeded(seed) });
        const tiles = allTiles(p);
        assert.equal(tiles.length, p.targetCount());
        assert.equal(new Set(tiles).size, tiles.length);
        for (let x = 0; x < p.W; x++) for (let y = 0; y < p.H; y++) assert.equal(p.getTile(x, y), null);
        for (let x = p.W; x < p.W * 2; x++) for (let y = 0; y < p.H; y++) {
          assert.equal(p.getTile(x, y) !== null, p.isCell(x, y), `réserve (${x},${y})`);
          if (p.getTile(x, y)) assert.equal(p.getTile(x, y).kind, p.kindAt(x, y));
        }
        assert.equal(p.isSolved(), false);
        assert.equal(p.isSolvedRight(), false);
      }
    });

    test(`${shape} ${n} : toujours résoluble (les côtés de la solution se correspondent)`, () => {
      const p = new GeoPuzzle(shape, n, 6, { random: seeded(n * 10) });
      const bySolution = new Map(allTiles(p).map((t) => [`${t.x},${t.y}`, t]));
      for (const tile of bySolution.values()) {
        for (let e = 0; e < tile.edges.length; e++) {
          const nb = p.topo.neighbor(p.size, tile.x, tile.y, e);
          if (nb) assert.equal(bySolution.get(`${nb.x},${nb.y}`).edges[nb.e], tile.edges[e]);
          assert.ok(tile.edges[e] >= 0 && tile.edges[e] < 6);
        }
      }
    });

    test(`${shape} ${n} : poser chaque tuile à sa place est toujours accepté et mène à la victoire`, () => {
      const p = new GeoPuzzle(shape, n, 5, { random: seeded(77 + n) });
      for (const tile of allTiles(p)) {
        const from = p.getTileLocation(tile);
        assert.ok(p.switchTiles(from.x, from.y, tile.x, tile.y), 'une tuile à sa place est toujours acceptée');
      }
      assert.equal(p.isSolved(), true);
      for (let x = 0; x < p.W; x++) for (let y = 0; y < p.H; y++) if (p.isCell(x, y)) {
        assert.deepEqual([p.getTile(x, y).x, p.getTile(x, y).y], [x, y]);
      }
    });
  }
}

test('hexagonal : une tuile qui ne s\'emboîte pas est refusée', () => {
  const p = new GeoPuzzle('hex', 4, 9, { random: seeded(5) });
  const t00 = allTiles(p).find((t) => t.x === 0 && t.y === 0);
  const f = p.getTileLocation(t00);
  assert.ok(p.switchTiles(f.x, f.y, 0, 0));
  let refused = 0;
  for (const tile of allTiles(p)) {
    const loc = p.getTileLocation(tile);
    if (loc.x < p.W) continue;
    const nb = p.topo.neighbor(4, 0, 0, 3); // le voisin du bas, côté S de la case (0,0)
    const fits = tile.edges[0] === t00.edges[3]; // le côté N du nouveau voisin doit égaler le côté S de t00
    assert.equal(p.canSwitch(loc.x, loc.y, nb.x, nb.y), fits);
    if (!fits) refused += 1;
  }
  assert.ok(refused > 0, 'au moins un refus (graine fixe)');
});

test('carré tronqué : un octogone ne va pas sur un petit carré, ni l\'inverse', () => {
  const p = new GeoPuzzle('oct', 3, 5, { random: seeded(9) });
  const octTile = allTiles(p).find((t) => t.kind === 'oct');
  const sqTile = allTiles(p).find((t) => t.kind === 'sq');
  const o = p.getTileLocation(octTile);
  const s = p.getTileLocation(sqTile);
  assert.equal(p.canSwitch(o.x, o.y, 1, 1), false); // (1,1) : petit carré de la zone de jeu
  assert.equal(p.canSwitch(s.x, s.y, 0, 0), false); // (0,0) : octogone de la zone de jeu
  assert.equal(p.canSwitch(o.x, o.y, 0, 1), false); // (0,1) : n'existe pas
  assert.equal(p.switchTiles(s.x, s.y, 0, 0), false);
});

test('échanges impossibles : même case, deux cases vides, hors plateau', () => {
  const p = new GeoPuzzle('hex', 3, 5, { random: seeded(3) });
  const W = p.W; // 4 colonnes en 3
  assert.equal(p.canSwitch(W, 0, W, 0), false);
  assert.equal(p.canSwitch(0, 0, 1, 0), false);
  assert.equal(p.canSwitch(-1, 0, W, 0), false);
  assert.equal(p.canSwitch(W, 0, 2 * W, 0), false);
});

test('annuler et rétablir un échange', () => {
  const p = new GeoPuzzle('oct', 3, 5, { random: seeded(11) });
  const tile = allTiles(p)[0];
  const from = p.getTileLocation(tile);
  assert.ok(p.switchTiles(from.x, from.y, tile.x, tile.y));
  assert.equal(p.getTile(tile.x, tile.y), tile);
  assert.ok(p.canUndo && p.undo());
  assert.equal(p.getTile(tile.x, tile.y), null);
  assert.ok(p.canRedo && p.redo());
  assert.equal(p.getTile(tile.x, tile.y), tile);
  assert.equal(p.undo() && p.undo(), false);
});

for (const shape of GEO_SHAPES) {
  test(`${shape} : aller-retour JSON, partie restaurée jouable`, () => {
    const p = new GeoPuzzle(shape, 3, 6, { random: seeded(21) });
    const tile = allTiles(p)[2];
    const from = p.getTileLocation(tile);
    p.switchTiles(from.x, from.y, tile.x, tile.y);
    const copy = GeoPuzzle.fromJSON(JSON.parse(JSON.stringify(p)));
    assert.equal(copy.shape, shape);
    assert.deepEqual(copy.toJSON(), p.toJSON());
    assert.equal(copy.gameInProgress, true);
    for (const t of allTiles(copy)) {
      const f = copy.getTileLocation(t);
      if (f.x >= copy.W) assert.ok(copy.switchTiles(f.x, f.y, t.x, t.y));
    }
    assert.equal(copy.isSolved(), true);
  });
}

test('états invalides refusés', () => {
  const base = JSON.parse(JSON.stringify(new GeoPuzzle('oct', 3, 4, { random: seeded(3) })));
  const bad = (mutate) => {
    const s = JSON.parse(JSON.stringify(base));
    mutate(s);
    assert.throws(() => GeoPuzzle.fromJSON(s));
  };
  assert.throws(() => GeoPuzzle.fromJSON(null));
  bad((s) => { s.tiles.pop(); });
  bad((s) => { s.cells.pop(); });
  bad((s) => { s.tiles[0][2] = 99; });
  bad((s) => { s.tiles[0] = s.tiles[0].slice(0, 4); });
  bad((s) => { s.shape = 'hex'; });
  bad((s) => { s.cells[0][1] = 0; }); // une case inexistante ne peut pas porter une tuile
  bad((s) => { const [a, b] = [s.cells[5][0], s.cells[5][2]]; s.cells[5][0] = b; s.cells[5][2] = b; void a; });
});
