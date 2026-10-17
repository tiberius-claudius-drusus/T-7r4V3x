/*
 * T-7r4V3x — tests des statistiques. Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStats, cleanStats, addStarted, addGame, summarize, byShape, recent, bestFor, sizeLabel, gamesFromScores, MAX_GAMES, RANKED,
} from '../src/stats.js';
import { makeCode } from '../src/code.js';

const game = (over = {}) => ({ d: '2026-10-16', t: 10000, s: 'carre', n: 3, k: 6, i: 0, c: null, ...over });

test('statistiques vides, et valeur corrompue → statistiques vides', () => {
  assert.deepEqual(emptyStats(), { v: 1, started: 0, games: [] });
  for (const bad of [null, undefined, 3, 'x', [], {}, { games: 'x' }]) assert.deepEqual(cleanStats(bad), emptyStats(), String(bad));
});

test('cleanStats écarte les parties invalides et garde les bonnes', () => {
  const good = game({ c: makeCode({ shape: 'carre', size: 3, colors: 6, insane: false }, '7K3F9A2') });
  const s = cleanStats({
    started: 'beaucoup',
    games: [good, game({ t: -1 }), game({ d: 'hier' }), game({ s: 'triangle' }), game({ n: 9 }), game({ k: 7 }), null, 5, game({ i: 7, t: 1234.6, c: 'pas un code' })],
  });
  assert.equal(s.games.length, 2);
  assert.deepEqual(s.games[0], good);
  assert.deepEqual(s.games[1], game({ i: 1, t: 1235, c: null }));
  assert.equal(s.started, 2, 'au moins autant de parties commencées que de gagnées');
  assert.deepEqual(cleanStats(s), s, 'idempotent');
});

test('le nombre de parties gardées est borné (les plus récentes)', () => {
  const many = Array.from({ length: MAX_GAMES + 50 }, (_, i) => game({ t: i }));
  const s = cleanStats({ started: 0, games: many });
  assert.equal(s.games.length, MAX_GAMES);
  assert.equal(s.games[0].t, 50);
  let t = emptyStats();
  for (let i = 0; i < MAX_GAMES + 3; i++) t = addGame(t, game({ t: i })).stats;
  assert.equal(t.games.length, MAX_GAMES);
});

test('addStarted / addGame : compteurs, rang du temps dans sa configuration', () => {
  let s = addStarted(addStarted(emptyStats()));
  assert.equal(s.started, 2);
  let r = addGame(s, game({ t: 30000 }));
  assert.equal(r.rank, 1, 'premier temps = record');
  s = r.stats;
  r = addGame(s, game({ t: 20000 })); s = r.stats;
  assert.equal(r.rank, 1);
  r = addGame(s, game({ t: 25000 })); s = r.stats;
  assert.equal(r.rank, 2);
  r = addGame(s, game({ t: 25000 })); s = r.stats;
  assert.equal(r.rank, 3, 'à égalité, l\'ancien temps garde la meilleure place');
  for (const t of [1000, 2000]) s = addGame(s, game({ t })).stats; // 6 temps
  r = addGame(s, game({ t: 99999 }));
  assert.equal(r.rank, null, `hors des ${RANKED} meilleurs`);
  // une autre configuration a son propre classement
  assert.equal(addGame(s, game({ t: 99999, i: 1 })).rank, 1);
  assert.equal(addGame(s, game({ t: 99999, s: 'hex', n: 4 })).rank, 1);
  assert.equal(addGame(s, game({ t: 99999, n: 4 })).rank, 1);
  assert.equal(addGame(s, game({ t: 99999, k: 8 })).rank, 1);
  assert.ok(r.stats.started >= r.stats.games.length);
  assert.throws(() => addGame(s, game({ s: 'cube' })), RangeError);
});

test('summarize : parties gagnées, meilleur temps, moyenne', () => {
  assert.deepEqual(summarize([]), { won: 0, best: null, avg: null });
  assert.deepEqual(summarize([game({ t: 10000 }), game({ t: 30000 }), game({ t: 20000 })]), { won: 3, best: 10000, avg: 20000 });
});

test('byShape : une section par forme jouée, une ligne par configuration, triées', () => {
  const games = [
    game({ s: 'hex', n: 4, t: 5000 }), game({ s: 'hex', n: 4, t: 7000 }), game({ s: 'hex', n: 3, t: 3000, i: 1 }),
    game({ s: 'carre', n: 3, t: 9000 }), game({ s: 'carre', n: 4, t: 8000 }), game({ s: 'carre', n: 3, t: 1000, i: 1 }), game({ s: 'carre', n: 3, k: 3, t: 4000 }),
  ];
  const out = byShape(games);
  assert.deepEqual(out.map((o) => o.shape), ['carre', 'hex'], 'formes jamais jouées omises, ordre carré / hexagonal / carré tronqué');
  assert.deepEqual(out[0].total, { won: 4, best: 1000, avg: (9000 + 8000 + 1000 + 4000) / 4 });
  assert.deepEqual(out[0].rows.map((r) => [r.insane, r.size, r.colors, r.won]), [[false, 3, 3, 1], [false, 3, 6, 1], [false, 4, 6, 1], [true, 3, 6, 1]]);
  assert.deepEqual(out[1].rows.map((r) => [r.insane, r.size, r.won, r.best, r.avg]), [[false, 4, 2, 5000, 6000], [true, 3, 1, 3000, 3000]]);
  assert.deepEqual(byShape([]), []);
});

test('recent : les dernières parties, la plus récente d\'abord', () => {
  const games = Array.from({ length: 15 }, (_, i) => game({ t: i * 1000 }));
  assert.deepEqual(recent(games).map((g) => g.t), [14, 13, 12, 11, 10, 9, 8, 7, 6, 5].map((x) => x * 1000));
  assert.deepEqual(recent(games, 2).map((g) => g.t), [14000, 13000]);
  assert.deepEqual(recent([]), []);
});

test('bestFor : meilleur temps d\'un puzzle donné par son code (puzzle du jour terminé)', () => {
  const code = makeCode({ shape: 'carre', size: 3, colors: 6, insane: false }, '7K3F9A2');
  const other = makeCode({ shape: 'carre', size: 3, colors: 6, insane: false }, '7K3F9A3');
  const games = [game({ c: code, t: 9000 }), game({ c: code, t: 7000 }), game({ c: other, t: 1000 }), game({ t: 500 })];
  assert.equal(bestFor(games, code), 7000);
  assert.equal(bestFor(games, code.toLowerCase().replace(/-/g, '')), 7000, 'code saisi autrement');
  assert.equal(bestFor(games, other), 1000);
  assert.equal(bestFor(games, makeCode({ shape: 'oct', size: 3, colors: 6, insane: false })), null);
  assert.equal(bestFor(games, 'pas un code'), null);
});

test('sizeLabel : colonnes × lignes', () => {
  assert.equal(sizeLabel('carre', 4), '4×4');
  assert.equal(sizeLabel('oct', 5), '5×5');
  assert.equal(sizeLabel('hex', 3), '4×3');
  assert.equal(sizeLabel('hex', 4), '6×4');
  assert.equal(sizeLabel('hex', 5), '7×5');
});

test('reprise des anciens meilleurs temps : formes, Insane, hexagonal en colonnes × lignes, plateaux disparus laissés de côté', () => {
  const old = {
    '3x3/6': [{ ms: 9000, date: '2026-10-14' }, { ms: 12000, date: '2026-10-12' }],
    'insane:3x3/6': [{ ms: 20000, date: '2026-10-16' }],
    'hex:4x3/6': [{ ms: 7000, date: '2026-10-15' }],
    'hex:7x5/10': [{ ms: 8000, date: '2026-10-15' }],
    'hex:3x3/6': [{ ms: 1000, date: '2026-10-10' }], // avant 0.8.1 : plateau disparu
    'oct:4x4/5': [{ ms: 6000, date: '2026-10-16' }],
    'oct:4x3/5': [{ ms: 6000, date: '2026-10-16' }], // incohérent
    'n/importe/quoi': [{ ms: 1, date: '2026-10-16' }],
    '5x5/7': [{ ms: 1, date: '2026-10-16' }], // 7 valeurs : n'existe pas
  };
  const games = gamesFromScores(old);
  assert.equal(games.length, 6);
  assert.deepEqual(games.map((g) => g.d), ['2026-10-12', '2026-10-14', '2026-10-15', '2026-10-15', '2026-10-16', '2026-10-16'], 'triées par date');
  assert.ok(games.find((g) => g.s === 'hex' && g.n === 3 && g.t === 7000), 'hex:4x3 → taille 3');
  assert.ok(games.find((g) => g.s === 'hex' && g.n === 5 && g.k === 10), 'hex:7x5 → taille 5');
  assert.ok(games.find((g) => g.i === 1 && g.t === 20000));
  assert.ok(games.every((g) => g.c === null));
  assert.deepEqual(cleanStats({ games }).games, games);
  for (const bad of [null, undefined, 3, 'x']) assert.deepEqual(gamesFromScores(bad), []);
});
