/*
 * T-7r4V3x — portage de GNOME Tetravex
 * Copyright (C) 2010-2013 Robert Ancell
 * Copyright (C) 2019 Arnaud Bonatti
 * Copyright (C) 2026 Drusus (Gens Claudia)
 *
 * Ce programme est un logiciel libre ; vous pouvez le redistribuer et/ou le modifier selon les termes de la
 * Licence Publique Générale GNU, version 2 ou (à votre choix) toute version ultérieure.
 * Il est distribué sans aucune garantie. Voir le fichier LICENSE.
 *
 * Logique du jeu, sans interface. Plateau de 2*size colonnes sur size lignes :
 *   - colonnes [0, size)      : zone de jeu (cible), où les tuiles doivent s'emboîter ;
 *   - colonnes [size, 2*size) : réserve, où les tuiles sont mélangées au départ.
 * Coordonnées (x, y) : x = colonne, y = ligne, origine en haut à gauche.
 */

/** Code de puzzle conservé tel quel dans une sauvegarde (forme « XXXX-XXXX-XXXX ») ; null sinon. Voir src/code.js. */
export const savedCode = (c) => (typeof c === 'string' && /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(c) ? c : null);

export class Tile {
  /** @param {number} x colonne de la solution @param {number} y ligne de la solution */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.north = 0;
    this.west = 0;
    this.east = 0;
    this.south = 0;
  }

  /** Nombre de côtés (mode Insane : un cran de rotation = 360 / sides degrés). */
  get sides() { return 4; }

  /** Rotation de `steps` quarts de tour dans le sens horaire : la valeur du haut passe à droite, etc. */
  rotate(steps) {
    const k = ((steps % 4) + 4) % 4;
    const old = [this.north, this.east, this.south, this.west];
    const next = [];
    old.forEach((v, i) => { next[(i + k) % 4] = v; });
    [this.north, this.east, this.south, this.west] = next;
  }
}

export class Puzzle {
  /**
   * @param {number} size côté du carré (nombre de tuiles par côté)
   * @param {number} colors nombre de valeurs possibles sur un bord (0 .. colors-1)
   * @param {{random?: () => number, insane?: boolean}} [options] source d'aléa injectable (tests reproductibles) ;
   *   `insane` : mode Insane, les tuiles peuvent tourner (elles sont mélangées avec une rotation au hasard)
   */
  constructor(size, colors, { random = Math.random, state = null, insane = false, code = null } = {}) {
    if (!Number.isInteger(size) || size < 1) throw new RangeError('size doit être un entier >= 1');
    if (!Number.isInteger(colors) || colors < 1) throw new RangeError('colors doit être un entier >= 1');
    this.size = size;
    this.colors = colors;
    // Interface commune avec GeoPuzzle (modes hexagonal et carré tronqué) : forme et dimensions d'une région.
    this.shape = 'carre';
    this.insane = state ? Boolean(state.insane) : Boolean(insane);
    this.code = savedCode(state ? state.code : code); // code du puzzle (rejouable), voir src/code.js
    this.W = size;
    this.H = size;
    this._random = random;
    this.board = [];
    this._history = [];
    this._redo = [];
    this._lastMoveId = 0;
    this.gameInProgress = false;
    if (state) {
      this._restore(state);
      return;
    }
    // Comme l'amont : on recommence tant que la réserve est déjà une solution valide.
    do {
      this._initBoard();
      if (this.insane) this._scrambleRotations();
    } while (this.isSolvedRight());
  }

  /** État sérialisable (JSON) : tuiles et position de chacune ; l'historique d'annulation n'est pas conservé. */
  toJSON() {
    const tiles = [];
    const index = new Map();
    for (let x = 0; x < this.size * 2; x++) {
      for (let y = 0; y < this.size; y++) {
        const t = this.board[x][y];
        if (t) {
          index.set(t, tiles.length);
          tiles.push([t.x, t.y, t.north, t.east, t.south, t.west]);
        }
      }
    }
    const cells = this.board.map((col) => col.map((t) => (t ? index.get(t) : -1)));
    return { size: this.size, colors: this.colors, tiles, cells, started: this.gameInProgress, insane: this.insane, code: this.code };
  }

  /** Reconstruit une partie sauvegardée ; lève une erreur si l'état est incohérent. */
  static fromJSON(data, options = {}) {
    if (!data || typeof data !== 'object') throw new TypeError('état invalide');
    return new Puzzle(data.size, data.colors, { ...options, state: data });
  }

  _restore(state) {
    const { size, colors } = this;
    const { tiles, cells } = state;
    if (!Array.isArray(tiles) || tiles.length !== size * size) throw new RangeError('nombre de tuiles invalide');
    if (!Array.isArray(cells) || cells.length !== size * 2) throw new RangeError('plateau invalide');
    const built = tiles.map((t) => {
      if (!Array.isArray(t) || t.length !== 6) throw new TypeError('tuile invalide');
      const [x, y, n, e, s, w] = t;
      if (![x, y].every((v) => Number.isInteger(v) && v >= 0 && v < size)) throw new RangeError('solution hors plateau');
      if (![n, e, s, w].every((v) => Number.isInteger(v) && v >= 0 && v < colors)) throw new RangeError('valeur hors limites');
      const tile = new Tile(x, y);
      Object.assign(tile, { north: n, east: e, south: s, west: w });
      return tile;
    });
    const seen = new Set();
    this.board = cells.map((col) => {
      if (!Array.isArray(col) || col.length !== size) throw new RangeError('colonne invalide');
      return col.map((i) => {
        if (i === -1) return null;
        if (!Number.isInteger(i) || i < 0 || i >= built.length || seen.has(i)) throw new RangeError('index de tuile invalide');
        seen.add(i);
        return built[i];
      });
    });
    if (seen.size !== built.length) throw new RangeError('tuiles absentes du plateau');
    this.gameInProgress = Boolean(state.started);
  }

  _int(n) {
    return Math.floor(this._random() * n);
  }

  _initBoard() {
    const { size, colors } = this;
    this.board = Array.from({ length: size * 2 }, () => new Array(size).fill(null));
    const solution = Array.from({ length: size }, (_, x) =>
      Array.from({ length: size }, (_, y) => new Tile(x, y)));
    // Bords horizontaux (nord/sud) puis verticaux (ouest/est), tirés au hasard.
    for (let x = 0; x < size; x++) {
      for (let y = 0; y <= size; y++) {
        const n = this._int(colors);
        if (y >= 1) solution[x][y - 1].south = n;
        if (y < size) solution[x][y].north = n;
      }
    }
    for (let x = 0; x <= size; x++) {
      for (let y = 0; y < size; y++) {
        const n = this._int(colors);
        if (x >= 1) solution[x - 1][y].east = n;
        if (x < size) solution[x][y].west = n;
      }
    }
    // Ramasse les tuiles et les place au hasard dans la réserve.
    const tiles = solution.flat();
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const [tile] = tiles.splice(this._int(tiles.length), 1);
        this.board[x + size][y] = tile;
      }
    }
  }

  /** Mode Insane : chaque tuile de la réserve reçoit une rotation au hasard. */
  _scrambleRotations() {
    for (let x = this.size; x < this.size * 2; x++) {
      for (let y = 0; y < this.size; y++) this.board[x][y].rotate(this._int(4));
    }
  }

  /** Rotation possible ? Mode Insane seulement ; dans la zone de jeu, la tuile doit rester emboîtée avec ses voisines. */
  canRotate(x, y, steps = 1) {
    const tile = this.insane && this._inside(x, y) ? this.board[x][y] : null;
    if (!tile || ((steps % 4) + 4) % 4 === 0) return false;
    if (x >= this.size) return true;
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
    this._history.push({ rot: true, x, y, steps, moveId: 0 });
    this._redo = [];
    return true;
  }

  /** Toutes les cases du plateau carré existent (interface commune avec GeoPuzzle). */
  isCell(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < this.size * 2 && y >= 0 && y < this.size;
  }

  /** Nombre de cases de la zone de jeu, donc de tuiles. */
  targetCount() {
    return this.size * this.size;
  }

  /** @returns {Tile|null} */
  getTile(x, y) {
    return this.board[x]?.[y] ?? null;
  }

  /** @returns {{x: number, y: number}|null} */
  getTileLocation(tile) {
    for (let x = 0; x < this.size * 2; x++) {
      for (let y = 0; y < this.size; y++) {
        if (this.board[x][y] === tile) return { x, y };
      }
    }
    return null;
  }

  /** Deux cases adjacentes de la zone de jeu s'emboîtent-elles (ou l'une est vide) ? */
  _pairFits(ax, ay, bx, by) {
    const a = this.board[ax][ay];
    const b = this.board[bx][by];
    if (!a || !b) return true;
    if (bx === ax + 1) return a.east === b.west;
    if (bx === ax - 1) return b.east === a.west;
    if (by === ay + 1) return a.south === b.north;
    return b.south === a.north;
  }

  /** La case (x, y) de la zone de jeu est-elle cohérente avec ses voisines de la zone de jeu ? */
  _cellFits(x, y) {
    if (x >= this.size || !this.board[x][y]) return true;
    if (x > 0 && !this._pairFits(x, y, x - 1, y)) return false;
    if (x < this.size - 1 && !this._pairFits(x, y, x + 1, y)) return false;
    if (y > 0 && !this._pairFits(x, y, x, y - 1)) return false;
    if (y < this.size - 1 && !this._pairFits(x, y, x, y + 1)) return false;
    return true;
  }

  _swap(x0, y0, x1, y1) {
    const t0 = this.board[x0][y0];
    this.board[x0][y0] = this.board[x1][y1];
    this.board[x1][y1] = t0;
  }

  /** Un échange est autorisé s'il laisse la zone de jeu cohérente (jamais de tuile mal emboîtée). */
  canSwitch(x0, y0, x1, y1) {
    if (!this._inside(x0, y0) || !this._inside(x1, y1)) return false;
    if (x0 === x1 && y0 === y1) return false;
    if (!this.board[x0][y0] && !this.board[x1][y1]) return false;
    this._swap(x0, y0, x1, y1);
    const ok = this._cellFits(x0, y0) && this._cellFits(x1, y1);
    this._swap(x0, y0, x1, y1);
    return ok;
  }

  _inside(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < this.size * 2 && y >= 0 && y < this.size;
  }

  /** @returns {boolean} true si l'échange a eu lieu */
  switchTiles(x0, y0, x1, y1) {
    if (!this.canSwitch(x0, y0, x1, y1)) return false;
    this._switchRaw(x0, y0, x1, y1, 0);
    return true;
  }

  _switchRaw(x0, y0, x1, y1, moveId, undoing = false) {
    this._swap(x0, y0, x1, y1);
    this.gameInProgress = true;
    if (!undoing) {
      this._history.push({ x0, y0, x1, y1, moveId });
      this._redo = [];
    }
  }

  /** Victoire : toute la zone de jeu est remplie (les tuiles n'y entrent que si elles s'emboîtent). */
  isSolved() {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (!this.board[x][y]) return false;
      }
    }
    return true;
  }

  /** La réserve forme-t-elle déjà un carré valide ? (tuiles toutes présentes et emboîtées) */
  isSolvedRight() {
    const { size } = this;
    for (let x = size; x < 2 * size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.board[x][y];
        if (!t) return false;
        if (x > size && this.board[x - 1][y].east !== t.west) return false;
        if (y > 0 && this.board[x][y - 1].south !== t.north) return false;
      }
    }
    return true;
  }

  // --- Déplacement d'un bloc entier (flèches du clavier dans l'amont) ---

  _blockMove(leftBoard, dx, dy) {
    const { size } = this;
    const baseX = leftBoard ? 0 : size;
    // Il faut une rangée libre côté d'arrivée, et au moins une tuile qui puisse bouger.
    const edgeFree = (cx, cy) => {
      for (let i = 0; i < size; i++) {
        const x = baseX + (dx !== 0 ? cx : i);
        const y = dy !== 0 ? cy : i;
        if (this.board[x][y]) return false;
      }
      return true;
    };
    const edge = dx < 0 || dy < 0 ? 0 : size - 1;
    if (!edgeFree(edge, edge)) return false;
    let any = false;
    for (let x = 0; x < size && !any; x++) {
      for (let y = 0; y < size && !any; y++) {
        if (this.board[baseX + x][y]) any = true;
      }
    }
    if (!any) return false;
    this._lastMoveId += 1;
    const id = this._lastMoveId;
    const xs = dx > 0 ? [...Array(size).keys()].reverse() : [...Array(size).keys()];
    const ys = dy > 0 ? [...Array(size).keys()].reverse() : [...Array(size).keys()];
    for (const y of ys) {
      for (const x of xs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
        if (!this.board[baseX + x][y]) continue;
        this._switchRaw(baseX + x, y, baseX + nx, ny, id);
      }
    }
    return true;
  }

  moveUp(leftBoard) { return this._blockMove(leftBoard, 0, -1); }
  moveDown(leftBoard) { return this._blockMove(leftBoard, 0, 1); }
  moveLeft(leftBoard) { return this._blockMove(leftBoard, -1, 0); }
  moveRight(leftBoard) { return this._blockMove(leftBoard, 1, 0); }

  // --- Annuler / rétablir ---

  get canUndo() { return this._history.length > 0; }
  get canRedo() { return this._redo.length > 0; }

  _popGroup(stack) {
    const last = stack[stack.length - 1];
    const group = [];
    while (stack.length && (last.moveId === 0 ? group.length === 0 : stack[stack.length - 1].moveId === last.moveId)) {
      group.push(stack.pop());
    }
    return group;
  }

  undo() {
    if (!this.canUndo) return false;
    const group = this._popGroup(this._history);
    for (const m of group) this._unapply(m);
    this._redo.push(...group);
    return true;
  }

  redo() {
    if (!this.canRedo) return false;
    const group = this._popGroup(this._redo);
    for (const m of group) this._apply(m);
    this._history.push(...group);
    return true;
  }

  _apply(m) {
    if (m.rot) this.board[m.x][m.y].rotate(m.steps); else this._swap(m.x0, m.y0, m.x1, m.y1);
  }

  _unapply(m) {
    if (m.rot) this.board[m.x][m.y].rotate(-m.steps); else this._swap(m.x0, m.y0, m.x1, m.y1);
  }
}
