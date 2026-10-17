/*
 * T-7r4V3x — géométrie d'affichage des modes hexagonal et carré tronqué (formes, positions, dégradés).
 * Copyright (C) 2026 Drusus (Gens Claudia). Licence : GPL-2.0-or-later (voir LICENSE.txt).
 *
 * Toutes les longueurs sont en « unités de c » : c = hauteur d'un hexagone, ou côté de la boîte d'un octogone (largeur d'un octogone).
 * L'interface multiplie par la valeur de c (en pixels) qu'elle a calculée pour tenir dans l'écran.
 */

import { hexDims } from './geopuzzle.js';

const SQRT3 = Math.sqrt(3);
const SQRT2 = Math.SQRT2;

/** Nombre de côtés d'une sorte de case. */
export const EDGE_COUNT = { hex: 6, oct: 8, sq: 4, sq4: 4 };

/** Contours (en pourcentage de la boîte de la case), pour `clip-path: polygon(...)`. */
const T = (2 - SQRT2) / 2 * 100; // retrait des coins d'un octogone régulier : 29,289 %
export const POLYGONS = {
  hex: [[25, 0], [75, 0], [100, 50], [75, 100], [25, 100], [0, 50]],
  oct: [[T, 0], [100 - T, 0], [100, T], [100, 100 - T], [100 - T, 100], [T, 100], [0, 100 - T], [0, T]],
  sq: [[50, 0], [100, 50], [50, 100], [0, 50]],
  sq4: [[0, 0], [100, 0], [100, 100], [0, 100]], // carré droit du 8/4gone
};

/**
 * Emplacement du nombre de chaque côté (en % de la boîte, centre du chiffre), dans l'ordre des côtés :
 * hex : N, NE, SE, S, SW, NW ; oct : N, NE, E, SE, S, SW, W, NW ; sq : NE, SE, SW, NW ; sq4 : N, E, S, W.
 */
export const NUMBER_SLOTS = {
  hex: [[50, 14], [74, 28], [74, 72], [50, 86], [26, 72], [26, 28]],
  oct: [[50, 11], [76, 24], [89, 50], [76, 76], [50, 89], [24, 76], [11, 50], [24, 24]],
  sq: [[64, 36], [64, 64], [36, 64], [36, 36]],
  sq4: [[50, 22], [78, 50], [50, 78], [22, 50]], // N, E, S, W
};

/** Premier angle (degrés) et ouverture du secteur de chaque côté dans le dégradé conique de la tuile. */
const SECTORS = {
  hex: { from: -30, span: 60 },
  oct: { from: -22.5, span: 45 },
  sq: { from: 0, span: 90 },
  sq4: { from: -45, span: 90 },
};

/** Fond d'une tuile : un secteur de couleur par côté (dégradé conique centré sur la tuile). */
export function gradientFor(kind, values, colorOf) {
  const { from, span } = SECTORS[kind];
  const stops = values.map((v, i) => `${colorOf(v)} ${i * span}deg ${(i + 1) * span}deg`);
  return `conic-gradient(from ${from}deg, ${stops.join(', ')})`;
}

/** Contour CSS d'une sorte de case. */
export function polygonCss(kind) {
  return `polygon(${POLYGONS[kind].map(([x, y]) => `${+x.toFixed(3)}% ${+y.toFixed(3)}%`).join(', ')})`;
}

const HEX_W = 2 / SQRT3; // largeur d'un hexagone dont la hauteur vaut 1
const HEX_DX = 0.75 * HEX_W; // écart entre deux colonnes
const SQ_D = 2 - SQRT2; // diagonale du petit carré quand le côté de la boîte de l'octogone vaut 1
const DAM_U = 1 / SQRT2; // 8/4gone : pas de la grille (deux octogones voisins en biais se touchent : distance des centres = largeur d'un octogone = 1)
const DAM_S = SQRT2 - 1; // côté du carré (= côté de l'octogone) quand la largeur de l'octogone vaut 1

/** Taille d'une région (zone de jeu ou réserve), en unités de c. */
export function regionUnits(shape, n) {
  if (shape === 'hex') {
    const { cols, rows } = hexDims(n);
    return { rw: (cols - 1) * HEX_DX + HEX_W, rh: rows + 0.5 };
  }
  if (shape === 'oct') return { rw: n, rh: n };
  if (shape === 'dam') return { rw: (n - 1) * DAM_U + 1, rh: (n - 1) * DAM_U + 1 };
  throw new RangeError('forme inconnue');
}

/** Boîte de la case (fx, fy) d'une région, en unités de c, relative au coin haut-gauche de la région. */
export function cellBox(shape, n, fx, fy) {
  if (shape === 'hex') {
    return { left: fx * HEX_DX, top: fy + ((fx & 1) ? 0.5 : 0), width: HEX_W, height: 1 };
  }
  if (shape === 'oct') {
    if (fx & 1) {
      const cx = (fx + 1) / 2;
      const cy = (fy + 1) / 2;
      return { left: cx - SQ_D / 2, top: cy - SQ_D / 2, width: SQ_D, height: SQ_D };
    }
    return { left: fx / 2, top: fy / 2, width: 1, height: 1 };
  }
  if (shape === 'dam') {
    const cx = 0.5 + fx * DAM_U;
    const cy = 0.5 + fy * DAM_U;
    if ((fx + fy) & 1) return { left: cx - DAM_S / 2, top: cy - DAM_S / 2, width: DAM_S, height: DAM_S };
    return { left: fx * DAM_U, top: fy * DAM_U, width: 1, height: 1 };
  }
  throw new RangeError('forme inconnue');
}

/** Centre d'une case, en unités de c (utile aux tests et à la navigation au clavier). */
export function cellCenter(shape, n, fx, fy) {
  const b = cellBox(shape, n, fx, fy);
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}
