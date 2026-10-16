/*
 * T-7r4V3x — portage de GNOME Tetravex : modes « hexagonal » et « carré tronqué »
 * Copyright (C) 2026 Drusus (Gens Claudia)
 *
 * Ce programme est un logiciel libre ; vous pouvez le redistribuer et/ou le modifier selon les termes de la
 * Licence Publique Générale GNU, version 2 ou (à votre choix) toute version ultérieure. Voir LICENSE.
 * Règles reprises de GNOME Tetravex (Robert Ancell 2010-2013, Arnaud Bonatti 2019, Tetravex Contributors) : on
 * place des tuiles dont les côtés en contact doivent porter le même nombre ; les tuiles ne tournent pas, sauf en
 * mode Insane (rotation par crans : voir `rotate`, `canRotate`, `rotateTile`).
 *
 * Deux pavages, chacun défini par une « topologie » (quelles cases existent, de quelle forme, et quel côté de
 * quelle case touche quel côté de quelle autre) :
 *
 *   hex : pavage hexagonal, hexDims(N) = colonnes × lignes d'hexagones ; les colonnes impaires sont décalées d'une demi-hauteur
 *         vers le bas. Côtés (6), dans le sens horaire depuis le haut : N, NE, SE, S, SW, NW.
 *   oct : pavage carré tronqué (4.8.8), N×N octogones et (N-1)×(N-1) petits carrés dans les creux. En coordonnées
 *         « fines » (x, y) sur (2N-1)×(2N-1) : octogone si x et y sont pairs, petit carré si x et y sont impairs.
 *         Côtés de l'octogone (8) : N, NE, E, SE, S, SW, W, NW. Côtés du petit carré (4) : NE, SE, SW, NW.
 *         Un octogone ne se place que sur un octogone, un petit carré que sur un petit carré.
 *
 * Comme pour le jeu carré, le plateau comporte deux régions de même forme : la zone de jeu (colonnes [0, W)) et
 * la réserve (colonnes [W, 2W)), où les tuiles sont mélangées au départ.
 */
import { savedCode } from './puzzle.js';

export const GEO_SHAPES = ['hex', 'oct'];
export const GEO_SIZES = [3, 4, 5];

/**
 * Dimensions du pavage hexagonal pour une taille donnée : colonnes × lignes. Les colonnes décalées rendent la région
 * plus haute que large à nombre égal, donc on ajoute des colonnes pour garder un plateau à peu près carré
 * (3 → 4×3, 4 → 6×4, 5 → 7×5). Les autres tailles (tests) restent n×n.
 */
const HEX_DIMS = { 3: [4, 3], 4: [6, 4], 5: [7, 5] };
export const hexDims = (n) => {
  const [cols, rows] = HEX_DIMS[n] ?? [n, n];
  return { cols, rows };
};

const HEX = {
  id: 'hex',
  width: (n) => hexDims(n).cols,
  height: (n) => hexDims(n).rows,
  isCell: (n, x, y) => x >= 0 && x < hexDims(n).cols && y >= 0 && y < hexDims(n).rows,
  kind: () => 'hex',
  edgeCount: () => 6,
  neighbor(n, x, y, e) {
    // colonnes impaires décalées vers le bas (odd-q) ; [dx, dy] pour N, NE, SE, S, SW, NW
    const d = (x & 1)
      ? [[0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]
      : [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]];
    const nx = x + d[e][0];
    const ny = y + d[e][1];
    return HEX.isCell(n, nx, ny) ? { x: nx, y: ny, e: (e + 3) % 6 } : null;
  },
};

// octogone : N, NE, E, SE, S, SW, W, NW -> [dx, dy, côté voisin]
const OCT_FROM_OCT = [[0, -2, 4], [1, -1, 2], [2, 0, 6], [1, 1, 3], [0, 2, 0], [-1, 1, 0], [-2, 0, 2], [-1, -1, 1]];
// petit carré : NE, SE, SW, NW -> [dx, dy, côté voisin de l'octogone]
const OCT_FROM_SQ = [[1, -1, 5], [1, 1, 7], [-1, 1, 1], [-1, -1, 3]];

const OCT = {
  id: 'oct',
  width: (n) => 2 * n - 1,
  height: (n) => 2 * n - 1,
  isCell(n, x, y) {
    const w = 2 * n - 1;
    return x >= 0 && x < w && y >= 0 && y < w && (x & 1) === (y & 1);
  },
  kind: (n, x) => ((x & 1) ? 'sq' : 'oct'),
  edgeCount: (kind) => (kind === 'oct' ? 8 : 4),
  neighbor(n, x, y, e) {
    const t = (x & 1) ? OCT_FROM_SQ[e] : OCT_FROM_OCT[e];
    const nx = x + t[0];
    const ny = y + t[1];
    return OCT.isCell(n, nx, ny) ? { x: nx, y: ny, e: t[2] } : null;
  },
};

export const TOPOLOGIES = { hex: HEX, oct: OCT };

export class GeoTile {
  /** @param {number} x colonne de la solution @param {number} y ligne de la solution */
  constructor(x, y, kind, count) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.edges = new Array(count).fill(null);
  }

  /** Nombre de côtés (mode Insane : un cran de rotation = 360 / sides degrés). */
  get sides() { return this.edges.length; }

  /** Rotation de `steps` crans dans le sens horaire : la valeur du côté i passe au côté i + steps. */
  rotate(steps) {
    const n = this.edges.length;
    const k = ((steps % n) + n) % n;
    const next = new Array(n);
    this.edges.forEach((v, i) => { next[(i + k) % n] = v; });
    this.edges = next;
  }
}

export class GeoPuzzle {
  /**
   * @param {'hex'|'oct'} shape
   * @param {number} size taille (hex : voir hexDims ; oct : nombre d'octogones par côté)
   * @param {number} colors nombre de valeurs possibles sur un côté (0 .. colors-1)
   * @param {{random?: () => number, state?: object|null}} [options]
   */
  constructor(shape, size, colors, { random = Math.random, state = null, insane = false, code = null } = {}) {
    const topo = TOPOLOGIES[shape];
    if (!topo) throw new RangeError('forme inconnue');
    if (!Number.isInteger(size) || size < 2 || size > 8) throw new RangeError('size doit être un entier entre 2 et 8');
    if (!Number.isInteger(colors) || colors < 1) throw new RangeError('colors doit être un entier >= 1');
    this.shape = shape;
    this.insane = state ? Boolean(state.insane) : Boolean(insane);
    this.code = savedCode(state ? state.code : code); // code du puzzle (rejouable), voir src/code.js
    this.size = size;
    this.colors = colors;
    this.topo = topo;
    this.W = topo.width(size);
    this.H = topo.height(size);
    this._random = random;
    this._history = [];
    this._redo = [];
    this.gameInProgress = false;
    this.board = Array.from({ length: this.W * 2 }, () => new Array(this.H).fill(null));
    if (state) {
      this._restore(state);
      return;
    }
    do {
      this._init();
      if (this.insane) this._scrambleRotations();
    } while (this.isSolvedRight());
  }

  _int(n) {
    return Math.floor(this._random() * n);
  }

  /** Cases d'une région, en coordonnées locales. */
  _regionCells() {
    const out = [];
    for (let x = 0; x < this.W; x++) {
      for (let y = 0; y < this.H; y++) {
        if (this.topo.isCell(this.size, x, y)) out.push([x, y]);
      }
    }
    return out;
  }

  _init() {
    const { topo, size } = this;
    const cells = this._regionCells();
    const sol = new Map();
    for (const [x, y] of cells) {
      const kind = topo.kind(size, x, y);
      sol.set(`${x},${y}`, new GeoTile(x, y, kind, topo.edgeCount(kind)));
    }
    // Chaque côté partagé reçoit une valeur commune ; les côtés du bord, une valeur libre.
    for (const [x, y] of cells) {
      const tile = sol.get(`${x},${y}`);
      for (let e = 0; e < tile.edges.length; e++) {
        if (tile.edges[e] !== null) continue;
        const v = this._int(this.colors);
        tile.edges[e] = v;
        const nb = topo.neighbor(size, x, y, e);
        if (nb) sol.get(`${nb.x},${nb.y}`).edges[nb.e] = v;
      }
    }
    // Mélange dans la réserve, séparément pour chaque sorte de tuile.
    this.board = Array.from({ length: this.W * 2 }, () => new Array(this.H).fill(null));
    const byKind = new Map();
    for (const tile of sol.values()) {
      if (!byKind.has(tile.kind)) byKind.set(tile.kind, []);
      byKind.get(tile.kind).push(tile);
    }
    for (const [x, y] of cells) {
      const pool = byKind.get(topo.kind(size, x, y));
      const [tile] = pool.splice(this._int(pool.length), 1);
      this.board[x + this.W][y] = tile;
    }
  }

  /** Mode Insane : chaque tuile de la réserve reçoit une rotation au hasard. */
  _scrambleRotations() {
    for (let x = this.W; x < this.W * 2; x++) {
      for (let y = 0; y < this.H; y++) {
        const tile = this.board[x][y];
        if (tile) tile.rotate(this._int(tile.sides));
      }
    }
  }

  /** Rotation possible ? Mode Insane seulement ; dans la zone de jeu, la tuile doit rester emboîtée avec ses voisines. */
  canRotate(x, y, steps = 1) {
    const tile = this.insane && this.isCell(x, y) ? this.board[x][y] : null;
    if (!tile || ((steps % tile.sides) + tile.sides) % tile.sides === 0) return false;
    if (x >= this.W) return true;
    tile.rotate(steps);
    const ok = this._cellFits(x, y);
    tile.rotate(-steps);
    return ok;
  }

  /** @returns {boolean} true si la rotation a eu lieu */
  rotateTile(x, y, steps = 1) {
    if (!this.canRotate(x, y, steps)) return false;
    this.board[x][y].rotate(steps);
    this.gameInProgress = true;
    this._history.push({ rot: true, x, y, steps });
    this._redo = [];
    return true;
  }

  /** Une case existe-t-elle à cette position (coordonnées globales) ? */
  isCell(x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= this.W * 2 || y < 0 || y >= this.H) return false;
    return this.topo.isCell(this.size, x % this.W, y);
  }

  /** Sorte de la case : 'hex', 'oct' ou 'sq' (null si la case n'existe pas). */
  kindAt(x, y) {
    return this.isCell(x, y) ? this.topo.kind(this.size, x % this.W, y) : null;
  }

  getTile(x, y) {
    return this.board[x]?.[y] ?? null;
  }

  getTileLocation(tile) {
    for (let x = 0; x < this.W * 2; x++) {
      for (let y = 0; y < this.H; y++) if (this.board[x][y] === tile) return { x, y };
    }
    return null;
  }

  /** Nombre de cases de la zone de jeu (donc de tuiles). */
  targetCount() {
    return this._regionCells().length;
  }

  /** Voisin du côté `e` de la case (x, y), dans la même région : { x, y, e } ou null. */
  neighborOf(x, y, e) {
    const ox = x >= this.W ? this.W : 0;
    const nb = this.topo.neighbor(this.size, x - ox, y, e);
    return nb ? { x: nb.x + ox, y: nb.y, e: nb.e } : null;
  }

  /** La tuile de la case (x, y) s'emboîte-t-elle avec ses voisines occupées ? */
  _cellFits(x, y) {
    const tile = this.board[x][y];
    if (!tile) return true;
    for (let e = 0; e < tile.edges.length; e++) {
      const nb = this.neighborOf(x, y, e);
      if (!nb) continue;
      const other = this.board[nb.x][nb.y];
      if (other && other.edges[nb.e] !== tile.edges[e]) return false;
    }
    return true;
  }

  _swap(x0, y0, x1, y1) {
    const t0 = this.board[x0][y0];
    this.board[x0][y0] = this.board[x1][y1];
    this.board[x1][y1] = t0;
  }

  /** Échange autorisé : mêmes sortes de case, au moins une tuile, zone de jeu cohérente après l'échange. */
  canSwitch(x0, y0, x1, y1) {
    if (!this.isCell(x0, y0) || !this.isCell(x1, y1)) return false;
    if (x0 === x1 && y0 === y1) return false;
    if (this.kindAt(x0, y0) !== this.kindAt(x1, y1)) return false;
    if (!this.board[x0][y0] && !this.board[x1][y1]) return false;
    this._swap(x0, y0, x1, y1);
    const ok = (x0 >= this.W || this._cellFits(x0, y0)) && (x1 >= this.W || this._cellFits(x1, y1));
    this._swap(x0, y0, x1, y1);
    return ok;
  }

  /** @returns {boolean} true si l'échange a eu lieu */
  switchTiles(x0, y0, x1, y1) {
    if (!this.canSwitch(x0, y0, x1, y1)) return false;
    this._swap(x0, y0, x1, y1);
    this.gameInProgress = true;
    this._history.push({ x0, y0, x1, y1 });
    this._redo = [];
    return true;
  }

  /** Victoire : toute la zone de jeu est remplie (les tuiles n'y entrent que si elles s'emboîtent). */
  isSolved() {
    for (let x = 0; x < this.W; x++) {
      for (let y = 0; y < this.H; y++) {
        if (this.isCell(x, y) && !this.board[x][y]) return false;
      }
    }
    return true;
  }

  /** La réserve forme-t-elle déjà une solution valide ? */
  isSolvedRight() {
    for (let x = this.W; x < this.W * 2; x++) {
      for (let y = 0; y < this.H; y++) {
        if (!this.isCell(x, y)) continue;
        if (!this.board[x][y] || !this._cellFits(x, y)) return false;
      }
    }
    return true;
  }

  get canUndo() { return this._history.length > 0; }
  get canRedo() { return this._redo.length > 0; }

  undo() {
    const m = this._history.pop();
    if (!m) return false;
    if (m.rot) this.board[m.x][m.y].rotate(-m.steps); else this._swap(m.x0, m.y0, m.x1, m.y1);
    this._redo.push(m);
    return true;
  }

  redo() {
    const m = this._redo.pop();
    if (!m) return false;
    if (m.rot) this.board[m.x][m.y].rotate(m.steps); else this._swap(m.x0, m.y0, m.x1, m.y1);
    this._history.push(m);
    return true;
  }

  /** État sérialisable (JSON) ; l'historique d'annulation n'est pas conservé. */
  toJSON() {
    const tiles = [];
    const index = new Map();
    for (let x = 0; x < this.W * 2; x++) {
      for (let y = 0; y < this.H; y++) {
        const t = this.board[x][y];
        if (t) {
          index.set(t, tiles.length);
          tiles.push([t.x, t.y, ...t.edges]);
        }
      }
    }
    const cells = this.board.map((col) => col.map((t) => (t ? index.get(t) : -1)));
    return { shape: this.shape, size: this.size, colors: this.colors, tiles, cells, started: this.gameInProgress, insane: this.insane, code: this.code };
  }

  static fromJSON(data, options = {}) {
    if (!data || typeof data !== 'object') throw new TypeError('état invalide');
    return new GeoPuzzle(data.shape, data.size, data.colors, { ...options, state: data });
  }

  _restore(state) {
    const { topo, size, colors, W, H } = this;
    const { tiles, cells } = state;
    const total = this.targetCount();
    if (!Array.isArray(tiles) || tiles.length !== total) throw new RangeError('nombre de tuiles invalide');
    if (!Array.isArray(cells) || cells.length !== W * 2) throw new RangeError('plateau invalide');
    const built = tiles.map((t) => {
      if (!Array.isArray(t) || t.length < 3) throw new TypeError('tuile invalide');
      const [x, y, ...edges] = t;
      if (!topo.isCell(size, x, y)) throw new RangeError('solution hors plateau');
      const kind = topo.kind(size, x, y);
      if (edges.length !== topo.edgeCount(kind)) throw new RangeError('nombre de côtés invalide');
      if (!edges.every((v) => Number.isInteger(v) && v >= 0 && v < colors)) throw new RangeError('valeur hors limites');
      const tile = new GeoTile(x, y, kind, edges.length);
      tile.edges = edges;
      return tile;
    });
    const seen = new Set();
    this.board = cells.map((col, x) => {
      if (!Array.isArray(col) || col.length !== H) throw new RangeError('colonne invalide');
      return col.map((i, y) => {
        if (i === -1) return null;
        if (!this.isCell(x, y)) throw new RangeError('tuile sur une case inexistante');
        if (!Number.isInteger(i) || i < 0 || i >= built.length || seen.has(i)) throw new RangeError('index de tuile invalide');
        if (built[i].kind !== this.kindAt(x, y)) throw new RangeError('tuile sur une case de sorte différente');
        seen.add(i);
        return built[i];
      });
    });
    if (seen.size !== built.length) throw new RangeError('tuiles absentes du plateau');
    this.gameInProgress = Boolean(state.started);
  }
}
