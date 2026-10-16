/*
 * T-7r4V3x — statistiques : une liste de parties gagnées, résumée par forme, taille et mode.
 * Copyright (C) 2026 Drusus (Gens Claudia). Licence : GPL-2.0-or-later (voir LICENSE).
 *
 * Fonctions pures sur une valeur JSON ; le stockage est fait par app.js. Remplace les « meilleurs temps » (scores.js) : on
 * garde chaque partie gagnée { d: date, t: ms, s: forme, n: taille, k: valeurs, i: 0|1 (Insane), c: code ou null }, et tous
 * les chiffres (meilleur temps, moyenne, par forme) en sont tirés. Les anciens temps (clé `tx.scores`) sont repris une fois.
 */
import { hexDims, GEO_SIZES } from './geopuzzle.js';
import { SHAPES, COLORS, canonicalCode, sizesOf } from './code.js';

export const MAX_GAMES = 2000; // parties gardées (les plus récentes)
export const RANKED = 5; // « Classement n° k » n'est annoncé que dans les cinq meilleurs temps de la configuration

export const emptyStats = () => ({ v: 1, started: 0, games: [] });

const validDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

function cleanGame(g) {
  if (!g || typeof g !== 'object') return null;
  if (!Number.isFinite(g.t) || g.t < 0 || !validDay(g.d)) return null;
  if (!SHAPES.includes(g.s) || !sizesOf(g.s).includes(g.n) || !COLORS.includes(g.k)) return null;
  return { d: g.d, t: Math.round(g.t), s: g.s, n: g.n, k: g.k, i: g.i ? 1 : 0, c: canonicalCode(g.c) };
}

/** Statistiques valides à partir d'une valeur éventuellement corrompue (stockage local). */
export function cleanStats(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.games)) return emptyStats();
  const games = raw.games.map(cleanGame).filter(Boolean).slice(-MAX_GAMES);
  const started = Number.isInteger(raw.started) && raw.started >= 0 ? raw.started : 0;
  return { v: 1, started: Math.max(started, games.length), games };
}

/** Une partie commence. */
export const addStarted = (stats) => ({ ...stats, started: stats.started + 1 });

const sameConfig = (a, b) => a.s === b.s && a.n === b.n && a.k === b.k && a.i === b.i;

/**
 * Enregistre une partie gagnée. Renvoie les nouvelles statistiques et le rang du temps parmi ceux de la même configuration
 * (1 = record), ou null s'il n'est pas dans les RANKED meilleurs. À égalité, l'ancien temps garde la meilleure place.
 */
export function addGame(stats, game) {
  const g = cleanGame(game);
  if (!g) throw new RangeError('partie invalide');
  const better = stats.games.filter((x) => sameConfig(x, g) && x.t <= g.t).length;
  const games = [...stats.games, g].slice(-MAX_GAMES);
  return { stats: { ...stats, started: Math.max(stats.started, games.length), games }, rank: better < RANKED ? better + 1 : null };
}

/** { won, best, avg } d'une liste de parties (best et avg valent null s'il n'y en a pas). */
export function summarize(games) {
  if (!games.length) return { won: 0, best: null, avg: null };
  const ts = games.map((g) => g.t);
  return { won: games.length, best: Math.min(...ts), avg: ts.reduce((a, b) => a + b, 0) / ts.length };
}

/**
 * Par forme (carré, hexagonal, carré tronqué) : le total de la forme et une ligne par configuration jouée
 * (mode, taille, valeurs). Les formes jamais jouées sont omises.
 */
export function byShape(games) {
  const out = [];
  for (const shape of SHAPES) {
    const mine = games.filter((g) => g.s === shape);
    if (!mine.length) continue;
    const keys = [...new Set(mine.map((g) => `${g.i}/${g.n}/${g.k}`))];
    const rows = keys.map((key) => {
      const [i, n, k] = key.split('/').map(Number);
      return { insane: i === 1, size: n, colors: k, ...summarize(mine.filter((g) => g.i === i && g.n === n && g.k === k)) };
    });
    rows.sort((a, b) => Number(a.insane) - Number(b.insane) || a.size - b.size || a.colors - b.colors);
    out.push({ shape, total: summarize(mine), rows });
  }
  return out;
}

/** Les n dernières parties gagnées, la plus récente d'abord. */
export const recent = (games, n = 10) => games.slice(-n).reverse();

/** Meilleur temps (ms) d'un puzzle donné par son code (ex. le puzzle du jour), ou null. */
export function bestFor(games, code) {
  const c = canonicalCode(code);
  const times = c ? games.filter((g) => g.c === c).map((g) => g.t) : [];
  return times.length ? Math.min(...times) : null;
}

/** Libellé de taille d'une configuration : « 4×3 » (hexagonal : colonnes × lignes). */
export function sizeLabel(shape, size) {
  const { cols, rows } = shape === 'hex' ? hexDims(size) : { cols: size, rows: size };
  return `${cols}×${rows}`;
}

// --- reprise des anciens « meilleurs temps » (tx.scores : { « [insane:][hex:|oct:]CxL/valeurs » : [{ ms, date }] }) ---

const LEGACY_KEY = /^(insane:)?(?:(hex|oct):)?(\d+)x(\d+)\/(\d+)$/;

/** Parties équivalentes aux anciens temps (ceux des plateaux qui n'existent plus sont laissés de côté). */
export function gamesFromScores(table) {
  const games = [];
  if (!table || typeof table !== 'object') return games;
  for (const [key, list] of Object.entries(table)) {
    const m = LEGACY_KEY.exec(key);
    if (!m || !Array.isArray(list)) continue;
    const [, insane, shape = 'carre', cols, rows, colors] = m;
    let size = Number(cols);
    if (shape === 'hex') size = GEO_SIZES.find((n) => hexDims(n).cols === Number(cols) && hexDims(n).rows === Number(rows));
    else if (cols !== rows) continue;
    for (const e of list) {
      const g = cleanGame({ d: String(e?.date), t: e?.ms, s: shape, n: size, k: Number(colors), i: insane ? 1 : 0, c: null });
      if (g) games.push(g);
    }
  }
  return games.sort((a, b) => a.d.localeCompare(b.d));
}

