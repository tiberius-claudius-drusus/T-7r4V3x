/*
 * T-7r4V3x — cohérence entre la topologie (qui touche qui) et la géométrie d'affichage. Licence : GPL-2.0-or-later.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPOLOGIES, GEO_SHAPES, SIZES_OF } from '../src/geopuzzle.js';
import { EDGE_COUNT, POLYGONS, NUMBER_SLOTS, cellBox, cellCenter, regionUnits, gradientFor, polygonCss } from '../src/geoview.js';

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('les contours et les emplacements de nombres correspondent au nombre de côtés', () => {
  for (const kind of Object.keys(EDGE_COUNT)) {
    assert.equal(POLYGONS[kind].length, EDGE_COUNT[kind]);
    assert.equal(NUMBER_SLOTS[kind].length, EDGE_COUNT[kind]);
    for (const [x, y] of [...POLYGONS[kind], ...NUMBER_SLOTS[kind]]) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100);
  }
});

test('le dégradé d\'une tuile a un secteur par côté', () => {
  const g = gradientFor('hex', [0, 1, 2, 3, 4, 5], (v) => `var(--tile-${v})`);
  assert.match(g, /^conic-gradient\(from -30deg, /);
  assert.equal((g.match(/var\(--tile-/g) || []).length, 6);
  assert.match(gradientFor('oct', [0, 1, 2, 3, 4, 5, 6, 7], String), /from -22\.5deg/);
  assert.match(gradientFor('sq', [1, 2, 3, 4], String), /from 0deg/);
  assert.match(polygonCss('sq'), /^polygon\(50% 0%, 100% 50%, 50% 100%, 0% 50%\)$/);
});

for (const shape of GEO_SHAPES) {
  for (const n of SIZES_OF[shape]) {
    test(`${shape} ${n} : les cases voisines (topologie) sont géométriquement voisines (affichage)`, () => {
      const topo = TOPOLOGIES[shape];
      const W = topo.width(n);
      for (let x = 0; x < W; x++) for (let y = 0; y < topo.height(n); y++) {
        if (!topo.isCell(n, x, y)) continue;
        const kind = topo.kind(n, x, y);
        const c0 = cellCenter(shape, n, x, y);
        for (let e = 0; e < EDGE_COUNT[kind]; e++) {
          const nb = topo.neighbor(n, x, y, e);
          if (!nb) continue;
          const c1 = cellCenter(shape, n, nb.x, nb.y);
          const dist = Math.hypot(c1.x - c0.x, c1.y - c0.y);
          if (shape === 'hex') assert.ok(near(dist, 1), `hex (${x},${y}) côté ${e} : distance ${dist}`);
          else if (kind === 'oct' && topo.kind(n, nb.x, nb.y) === 'oct') assert.ok(near(dist, 1));
          else assert.ok(near(dist, Math.SQRT1_2), `oct/sq (${x},${y}) côté ${e} : distance ${dist}`);
          // le côté e doit regarder vers le voisin : le nombre du côté e est du côté du voisin
          const slot = NUMBER_SLOTS[kind][e];
          const b = cellBox(shape, n, x, y);
          const sx = b.left + (slot[0] / 100) * b.width;
          const sy = b.top + (slot[1] / 100) * b.height;
          const toSlot = Math.hypot(c1.x - sx, c1.y - sy);
          const toCenter = Math.hypot(c1.x - c0.x, c1.y - c0.y);
          assert.ok(toSlot < toCenter, `${shape} (${x},${y}) côté ${e} : le nombre ne regarde pas le voisin`);
        }
      }
    });

    test(`${shape} ${n} : toutes les cases tiennent dans la région annoncée`, () => {
      const topo = TOPOLOGIES[shape];
      const { rw, rh } = regionUnits(shape, n);
      for (let x = 0; x < topo.width(n); x++) for (let y = 0; y < topo.height(n); y++) {
        if (!topo.isCell(n, x, y)) continue;
        const b = cellBox(shape, n, x, y);
        assert.ok(b.left >= -1e-9 && b.top >= -1e-9, 'pas de débordement à gauche ni en haut');
        assert.ok(b.left + b.width <= rw + 1e-9 && b.top + b.height <= rh + 1e-9, `${shape} (${x},${y}) déborde`);
      }
    });
  }
}

test('hexagonal : la deuxième colonne est décalée d\'une demi-hauteur, la troisième comme la première', () => {
  const a = cellBox('hex', 4, 0, 1);
  const b = cellBox('hex', 4, 1, 1);
  const c = cellBox('hex', 4, 2, 1);
  assert.ok(near(b.top - a.top, 0.5));
  assert.ok(near(c.top, a.top));
});

test('carré tronqué : octogones et petits carrés respectent les alignements horizontaux et verticaux', () => {
  // octogones alignés sur une même ligne / colonne ; petits carrés centrés entre quatre octogones
  assert.ok(near(cellBox('oct', 3, 0, 0).top, cellBox('oct', 3, 2, 0).top));
  assert.ok(near(cellBox('oct', 3, 0, 0).left, cellBox('oct', 3, 0, 2).left));
  const sq = cellCenter('oct', 3, 1, 1);
  const o = [[0, 0], [2, 0], [0, 2], [2, 2]].map(([x, y]) => cellCenter('oct', 3, x, y));
  assert.ok(near(sq.x, (o[0].x + o[1].x) / 2) && near(sq.y, (o[0].y + o[2].y) / 2));
});

test('formes inconnues refusées', () => {
  assert.throws(() => regionUnits('triangle', 3), RangeError);
  assert.throws(() => cellBox('triangle', 3, 0, 0), RangeError);
});
