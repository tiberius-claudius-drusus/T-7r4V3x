/*
 * T-7r4V3x — portage de GNOME Tetravex : interface
 * Copyright (C) 2010-2013 Robert Ancell
 * Copyright (C) 2019 Arnaud Bonatti
 * Copyright (C) 2026 Drusus (Gens Claudia)
 *
 * Ce programme est un logiciel libre ; vous pouvez le redistribuer et/ou le modifier selon les termes de la
 * Licence Publique Générale GNU, version 2 ou (à votre choix) toute version ultérieure. Voir LICENSE.
 *
 * Écrans (accueil, partie, aide, options, à propos), thèmes, sauvegarde. La logique du jeu est dans
 * src/puzzle.js ; les couleurs viennent de src/themes.js ; les textes de src/strings.js.
 */
import { Puzzle } from './src/puzzle.js';
import { GeoPuzzle, GEO_SHAPES, GEO_SIZES, hexDims } from './src/geopuzzle.js';
import { NUMBER_SLOTS, cellBox, gradientFor, regionUnits } from './src/geoview.js';
import { THEMES, apply as applyTheme, normalize as normalizeTheme } from './src/themes.js';
import { t, tHtml, setDictionary } from './src/strings.js';
import { LANGUAGES, CODES, pickLanguage, loadLanguage, directionOf } from './src/lang/index.js';
import { logoSvg } from './src/logo.js';
import { VERSION, RELEASE_DATE } from './src/version.js';
import { ICONS } from './src/icons.js';
import { SHAPES, SIZES, COLORS, makeCode, parseCode, canonicalCode, typeCode, dailyCode, localDate, puzzleFromCode } from './src/code.js';
import { emptyStats, cleanStats, addStarted, addGame, summarize, byShape, recent, bestFor, sizeLabel, gamesFromScores } from './src/stats.js';

const DRAG_THRESHOLD = 6;
const KEY_OPTS = 'tx.opts';
const KEY_SAVE = 'tx.save';
const KEY_SAVE_INSANE = 'tx.save.insane'; // le mode Insane a sa propre partie en cours, indépendante de la partie normale
const DOUBLE_TAP_MS = 400;
const NEAR_CENTRE = 0.28; // part de la largeur de la tuile : un geste qui démarre là tourne selon le déplacement horizontal
const KEY_SCORES = 'tx.scores'; // anciens « meilleurs temps » : repris une fois dans les statistiques
const KEY_STATS = 'tx.stats';

const $ = (id) => document.getElementById(id);
const SCREENS = ['home', 'game', 'help', 'options', 'about', 'stats'];

// --- Stockage local (jamais bloquant : la page marche sans) ---

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function store(key, value) {
  try {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* stockage indisponible : on continue sans */ }
}

// --- Options ---

function cleanOptions(o) {
  const base = normalizeTheme(o || {});
  return {
    shape: SHAPES.includes(o?.shape) ? o.shape : 'carre',
    size: SIZES.includes(o?.size) ? o.size : 3,
    colors: COLORS.includes(o?.colors) ? o.colors : 6,
    insane: o?.insane === true, // mode choisi sur l'accueil (le jeu normal et le jeu Insane ont chacun leur partie en cours)
    family: base.family,
    mode: base.mode,
    lang: o?.lang === 'auto' || CODES.includes(o?.lang) ? o.lang : 'auto',
  };
}
let options = cleanOptions(load(KEY_OPTS));
/** Taille réellement jouée : les formes hexagonale et carré tronqué n'existent qu'en 3, 4 et 5. */
const effectiveSize = (o) => (o.shape === 'carre' ? o.size : Math.min(5, Math.max(3, o.size)));
/** Statistiques ; la première fois, on reprend les anciens meilleurs temps (rien n'est perdu). */
function loadStats() {
  const raw = load(KEY_STATS);
  if (raw) return cleanStats(raw);
  const games = gamesFromScores(load(KEY_SCORES));
  const first = cleanStats({ started: games.length, games });
  if (games.length) store(KEY_STATS, first);
  return first;
}
let stats = loadStats();

/** Annonce pour les lecteurs d'écran (région « live » masquée). */
function announce(message) {
  const live = $('live');
  live.textContent = '';
  setTimeout(() => { live.textContent = message; }, 30);
}

const darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
function applyOptionsTheme() {
  applyTheme({ family: options.family, mode: options.mode }, Boolean(darkQuery?.matches));
}

// --- Textes ---

const anchor = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

/** Liens insérés à la place des {marques} des textes HTML : fabriqués ici, jamais par les traductions. */
function fragmentsFor(key) {
  if (key === 'about.licence') {
    const text = t('about.licence.link').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return { link: anchor('LICENSE', text) };
  }
  if (key === 'about.source') {
    return { files: ['index.html', 'app.js', 'src/puzzle.js'].map((f) => anchor(f, f)).join(', ') };
  }
  return { link: anchor('https://gitlab.gnome.org/GNOME/gnome-tetravex', 'GNOME Tetravex') };
}

function translatePage() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) {
    el.innerHTML = tHtml(el.dataset.i18nHtml, fragmentsFor(el.dataset.i18nHtml));
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = ICONS[el.dataset.icon] ?? '';
  $('foot').textContent = t('foot.line', { version: VERSION, date: RELEASE_DATE });
  renderHomeMode();
  $('about-version').textContent = t('about.version', { version: VERSION, date: RELEASE_DATE });
}

// --- Écrans ---

function show(name) {
  for (const s of SCREENS) $(`s-${s}`).classList.toggle('on', s === name);
  if (name === 'game') { layout(); render(); }
  if (name === 'stats') renderStats();
  $('b-continue').hidden = !hasSave(options.insane);
  updateTimerRunning();
}

function route() {
  let name = location.hash.slice(1) || 'home';
  if (!SCREENS.includes(name)) name = 'home';
  if (name === 'game' && !puzzle) name = 'home';
  show(name);
}
function go(name) {
  if (location.hash.slice(1) === name || (name === 'home' && !location.hash)) route();
  else location.hash = name === 'home' ? '' : name;
}
window.addEventListener('hashchange', route);

// --- Partie ---

let puzzle = null;
let slots = [];
let selected = null;
let rotMode = null; // mode Insane : position de la tuile en mode rotation
let lastTap = null; // pour reconnaître le double toucher
let drag = null;
let elapsedBase = 0; // ms accumulées avant la reprise du chronomètre
let runningSince = null;
let timerHandle = null;

const elapsedMs = () => elapsedBase + (runningSince === null ? 0 : Date.now() - runningSince);

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

const saveKey = (insane) => (insane ? KEY_SAVE_INSANE : KEY_SAVE);
function hasSave(insane = false) {
  const s = load(saveKey(insane));
  if (!(s && s.v === 1 && s.puzzle)) return false;
  try {
    (GEO_SHAPES.includes(s.puzzle.shape) ? GeoPuzzle : Puzzle).fromJSON(s.puzzle);
    return true;
  } catch {
    store(saveKey(insane), null); // sauvegarde d'une ancienne version, impossible à reprendre : on ne la propose plus
    return false;
  }
}
function saveGame() {
  if (!puzzle || puzzle.isSolved()) return;
  store(saveKey(puzzle.insane), { v: 1, puzzle: puzzle.toJSON(), elapsedMs: Math.floor(elapsedMs()) });
}

function timerShouldRun() {
  return Boolean(puzzle) && puzzle.gameInProgress && !puzzle.isSolved()
    && $('s-game').classList.contains('on') && document.visibilityState === 'visible' && !$('menu').open;
}
function updateTimerRunning() {
  const run = timerShouldRun();
  if (run && runningSince === null) {
    runningSince = Date.now();
    timerHandle = setInterval(showTime, 500);
  } else if (!run && runningSince !== null) {
    elapsedBase += Date.now() - runningSince;
    runningSince = null;
    clearInterval(timerHandle);
    timerHandle = null;
  }
  showTime();
}
function showTime() { $('g-time').textContent = formatTime(elapsedMs()); }

function startGame(newPuzzle, elapsed = 0) {
  puzzle = newPuzzle;
  selected = null;
  rotMode = null;
  lastTap = null;
  $('g-mode').hidden = !puzzle.insane;
  showCode();
  elapsedBase = elapsed;
  runningSince = null;
  clearInterval(timerHandle);
  timerHandle = null;
  buildBoards();
  go('game');
  if (location.hash.slice(1) === 'game') { layout(); render(); }
}
/** Nouvelle partie : le puzzle d'un code (la configuration est celle du code) ou un puzzle tiré au hasard dans la configuration choisie. */
function newGame(insane = false, code = null) {
  const next = puzzleFromCode(code ?? makeCode(configOf(insane)));
  store(saveKey(next.insane), null);
  stats = addStarted(stats);
  store(KEY_STATS, stats);
  startGame(next);
}
function continueGame(insane = false) {
  const s = load(saveKey(insane));
  try {
    const data = s.puzzle;
    startGame(GEO_SHAPES.includes(data.shape) ? GeoPuzzle.fromJSON(data) : Puzzle.fromJSON(data), Number(s.elapsedMs) || 0);
  } catch {
    store(saveKey(insane), null);
    newGame(insane);
  }
}

function makeSlot(x, y, className) {
  const slot = document.createElement('div');
  slot.className = className;
  slot.tabIndex = 0;
  slot.setAttribute('role', 'gridcell');
  slot.dataset.x = String(x);
  slot.dataset.y = String(y);
  return slot;
}

function buildBoards() {
  const geo = puzzle.shape !== 'carre';
  const { W, H } = puzzle;
  slots = Array.from({ length: W * 2 }, () => []);
  for (const [board, base] of [[$('target'), 0], [$('tray'), W]]) {
    board.replaceChildren();
    board.classList.toggle('geo', geo);
    board.style.gridTemplateColumns = geo ? '' : `repeat(${W}, var(--cell))`;
    board.style.width = '';
    board.style.height = '';
    if (geo) {
      // cases positionnées à la main (voir layout) ; une seule « rangée » logique pour les lecteurs d'écran
      const row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('role', 'row');
      board.append(row);
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
          if (!puzzle.isCell(base + x, y)) continue;
          const slot = makeSlot(base + x, y, `slot geo k-${puzzle.kindAt(base + x, y)}`);
          row.append(slot);
          slots[base + x][y] = slot;
        }
      }
      continue;
    }
    for (let y = 0; y < H; y++) {
      const row = document.createElement('div'); // rangée logique (ARIA) sans effet sur la mise en page
      row.className = 'row';
      row.setAttribute('role', 'row');
      board.append(row);
      for (let x = 0; x < W; x++) {
        const slot = makeSlot(base + x, y, 'slot');
        row.append(slot);
        slots[base + x][y] = slot;
      }
    }
  }
}

/** Texte lu pour une tuile : ses nombres. */
function tileLabel(tile) {
  if (tile.edges) return t('game.tile.edges', { values: tile.edges.join(', ') });
  return t('game.tile', { n: tile.north, e: tile.east, s: tile.south, w: tile.west });
}

/** Tuile d'un mode hexagonal ou carré tronqué : forme découpée, un secteur de couleur et un nombre par côté. */
function geoTileElement(tile, x, y) {
  const kind = tile.kind;
  const el = document.createElement('div');
  el.className = `tile geo k-${kind}`;
  el.style.background = gradientFor(kind, tile.edges, (v) => `var(--tile-${v % 10})`);
  el.dataset.x = String(x);
  el.dataset.y = String(y);
  el.setAttribute('aria-label', tileLabel(tile));
  el.setAttribute('aria-hidden', 'true'); // le nom accessible est porté par la case (voir render)
  tile.edges.forEach((v, i) => {
    const [px, py] = NUMBER_SLOTS[kind][i];
    const span = document.createElement('span');
    span.className = 'g';
    span.style.left = `${px}%`;
    span.style.top = `${py}%`;
    span.textContent = String(v);
    el.append(span);
  });
  return el;
}

function tileElement(tile, x, y) {
  const { north: n, east: e, south: s, west: w } = tile;
  const c = (v) => `var(--tile-${v % 10})`;
  const el = document.createElement('div');
  el.className = 'tile';
  el.style.background = `conic-gradient(from -45deg, ${c(n)} 0 25%, ${c(e)} 25% 50%, ${c(s)} 50% 75%, ${c(w)} 75% 100%)`;
  el.dataset.x = String(x);
  el.dataset.y = String(y);
  el.setAttribute('aria-label', tileLabel(tile));
  el.setAttribute('aria-hidden', 'true'); // le nom accessible est porté par la case (voir render)
  for (const [cls, v] of [['n', n], ['e', e], ['s', s], ['w', w]]) {
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = String(v);
    el.append(span);
  }
  return el;
}

function render() {
  if (!puzzle) return;
  const { W, H } = puzzle;
  const makeTile = puzzle.shape === 'carre' ? tileElement : geoTileElement;
  let placed = 0;
  for (let x = 0; x < W * 2; x++) {
    for (let y = 0; y < H; y++) {
      const slot = slots[x][y];
      if (!slot) continue; // pas de case à cet endroit (modes hexagonal et carré tronqué)
      slot.replaceChildren();
      slot.classList.remove('refuse');
      const tile = puzzle.getTile(x, y);
      const zone = t(x < W ? 'game.zone' : 'game.tray');
      const cellLabel = t('game.cell', { zone, c: (x % W) + 1, r: y + 1 });
      const isSelected = Boolean(tile && selected && selected.x === x && selected.y === y);
      const isRot = Boolean(tile && rotMode && rotMode.x === x && rotMode.y === y);
      // La case (gridcell) porte tout le nom accessible : nombres de la tuile, sélection, mode rotation.
      slot.setAttribute('aria-label', `${cellLabel}, ${tile ? tileLabel(tile) : t('game.empty')}${isRot ? `. ${t('game.rotmode')}` : ''}`);
      slot.setAttribute('aria-selected', String(isSelected));
      if (tile) {
        const el = makeTile(tile, x, y);
        if (isSelected) el.classList.add('selected');
        if (isRot) {
          el.classList.add('rotmode');
          const glyph = document.createElement('span');
          glyph.className = 'rotglyph';
          glyph.setAttribute('aria-hidden', 'true');
          glyph.textContent = '↻';
          el.append(glyph);
        }
        slot.append(el);
        if (x < W) placed += 1;
      }
    }
  }
  $('g-undo').disabled = !puzzle.canUndo;
  $('g-redo').disabled = !puzzle.canRedo;
  const total = puzzle.targetCount();
  const count = $('g-count');
  count.textContent = `${placed}/${total}`;
  count.setAttribute('aria-label', t('game.placed', { n: placed, total }));
  count.classList.toggle('win', puzzle.isSolved());
}

/**
 * Taille des cases : la plus grande qui tienne dans la place réellement disponible (la zone `#boards` occupe
 * tout ce que la barre, l'état et la consigne laissent). On compare « côte à côte » et « l'un sur l'autre »
 * et on garde la disposition qui donne les plus grandes cases.
 */
function layout() {
  if (!puzzle || !$('s-game').classList.contains('on')) return;
  const { size } = puzzle;
  const box = $('boards');
  const W = box.clientWidth;
  const H = box.clientHeight;
  if (!W || !H) return;
  if (puzzle.shape !== 'carre') { layoutGeo(box, W, H); return; }
  const frame = 4 * (size + 1); // cadre et espacement des cases d'un plateau, en px (approximation)
  const side = Math.min((W - 2 * frame) / (2 * size + 0.5), (H - frame) / size);
  const stack = Math.min((W - frame) / size, (H - 2 * frame) / (2 * size + 0.3));
  const stacked = stack >= side;
  box.classList.toggle('stacked', stacked);
  const cell = Math.floor(Math.max(stacked ? stack : side, 28));
  document.documentElement.style.setProperty('--cell', `${Math.min(cell, 150)}px`);
}

/**
 * Mise en page des modes hexagonal et carré tronqué : même principe que le plateau carré (la plus grande taille
 * de case qui tienne, en comparant « côte à côte » et « l'un sur l'autre »), puis chaque case est placée à la main
 * à partir de la géométrie de src/geoview.js.
 */
function layoutGeo(box, boxW, boxH) {
  const n = puzzle.size;
  const { rw, rh } = regionUnits(puzzle.shape, n);
  const pad = 6; // marge intérieure d'un plateau, en px
  const gap = 2 * pad;
  const side = Math.min((boxW - 2 * gap) / (2 * rw + 0.5), (boxH - gap) / rh);
  const stack = Math.min((boxW - gap) / rw, (boxH - 2 * gap) / (2 * rh + 0.3));
  const stacked = stack >= side;
  box.classList.toggle('stacked', stacked);
  const c = Math.floor(Math.max(24, Math.min(stacked ? stack : side, 150)));
  document.documentElement.style.setProperty('--cell', `${c}px`);
  for (const board of [$('target'), $('tray')]) {
    board.style.width = `${Math.ceil(rw * c) + 2 * pad}px`;
    board.style.height = `${Math.ceil(rh * c) + 2 * pad}px`;
  }
  const { W, H } = puzzle;
  for (let x = 0; x < W * 2; x++) {
    for (let y = 0; y < H; y++) {
      const slot = slots[x][y];
      if (!slot) continue;
      const b = cellBox(puzzle.shape, n, x % W, y);
      slot.style.left = `${pad + b.left * c}px`;
      slot.style.top = `${pad + b.top * c}px`;
      slot.style.width = `${b.width * c}px`;
      slot.style.height = `${b.height * c}px`;
    }
  }
}

function afterMove() {
  selected = null;
  render();
  if (puzzle.isSolved()) {
    updateTimerRunning();
    store(saveKey(puzzle.insane), null); // la sauvegarde du MODE joué, pas toujours celle de la partie normale
    const ms = elapsedMs();
    const lines = [t('game.won'), t('game.wonIn', { time: formatTime(ms) })];
    if (ms > 0) {
      try {
        const result = addGame(stats, { d: localDate(), t: ms, s: puzzle.shape, n: puzzle.size, k: puzzle.colors, i: puzzle.insane ? 1 : 0, c: puzzle.code });
        stats = result.stats;
        store(KEY_STATS, stats);
        if (result.rank === 1) lines.push(t('game.record'));
        else if (result.rank) lines.push(t('game.rank', { rank: result.rank }));
      } catch { /* partie d'une configuration hors liste (très ancienne sauvegarde) : pas de statistique */ }
    }
    if (puzzle.code) lines.push(t('code.is', { code: puzzle.code }));
    $('win-text').textContent = lines.join('\n');
    $('win-text').style.whiteSpace = 'pre-line';
    if (!$('win').open) $('win').showModal();
  } else {
    updateTimerRunning();
    saveGame();
  }
}

function refuse(pos) {
  const slot = slots[pos.x]?.[pos.y];
  if (slot) {
    slot.classList.remove('refuse');
    void slot.offsetWidth; // relance l'animation
    slot.classList.add('refuse');
  }
  announce(t('game.refused'));
}

function tryMove(from, to) {
  if (puzzle.switchTiles(from.x, from.y, to.x, to.y)) {
    rotMode = null;
    afterMove();
    return true;
  }
  render(); // une tuile en vol a été retirée de son plateau : on la remet avant de secouer la case
  refuse(to);
  return false;
}

/** Mode Insane : fait tourner la tuile de `steps` crans (sens horaire si positif) ; refusé si elle ne s'emboîte plus. */
function tryRotate(pos, steps) {
  if (puzzle.rotateTile(pos.x, pos.y, steps)) {
    afterMove();
    return true;
  }
  render(); // remet la tuile droite si elle a été tournée à l'écran pendant le geste (avant refuse : render retire la classe)
  refuse(pos);
  return false;
}

/** Toucher sans glisser : double toucher (mode Insane) = entrer dans / sortir du mode rotation d'une tuile. */
function handleTap(pos) {
  const tile = puzzle.getTile(pos.x, pos.y);
  const moving = selected && (selected.x !== pos.x || selected.y !== pos.y); // ce toucher dépose la tuile sélectionnée
  if (puzzle.insane && tile && !moving) {
    const now = Date.now();
    const double = lastTap && lastTap.x === pos.x && lastTap.y === pos.y && now - lastTap.t < DOUBLE_TAP_MS;
    lastTap = double ? null : { x: pos.x, y: pos.y, t: now };
    if (double) {
      selected = null;
      if (rotMode && rotMode.x === pos.x && rotMode.y === pos.y) {
        rotMode = null;
      } else {
        rotMode = { x: pos.x, y: pos.y };
        announce(t('game.rotmode'));
      }
      render();
      return;
    }
  } else {
    lastTap = null;
  }
  if (rotMode) {
    if (rotMode.x === pos.x && rotMode.y === pos.y) return; // un seul toucher sur la tuile en rotation : rien
    rotMode = null;
  }
  tapAt(pos);
}

function slotAt(clientX, clientY) {
  const slot = document.elementFromPoint(clientX, clientY)?.closest?.('.slot');
  return slot ? { x: Number(slot.dataset.x), y: Number(slot.dataset.y) } : null;
}

/** Toucher sans glisser : sélectionne une tuile, ou la dépose sur la case touchée. */
function tapAt(pos) {
  const tile = puzzle.getTile(pos.x, pos.y);
  if (!selected) {
    if (tile) { selected = pos; render(); }
    return;
  }
  if (selected.x === pos.x && selected.y === pos.y) { selected = null; render(); return; }
  if (!tryMove(selected, pos) && tile) { selected = pos; render(); }
}

const boardsEl = $('boards');
boardsEl.addEventListener('pointerdown', (ev) => {
  if (ev.button !== undefined && ev.button !== 0) return;
  if (drag) {
    if (drag.id !== ev.pointerId && drag.moving) return; // un seul pointeur à la fois pendant un glisser
    endDrag({ pointerId: drag.id }, true); // geste précédent resté sans fin (pointerup perdu) : on l'abandonne
  }
  const slotEl = ev.target.closest('.slot');
  if (!slotEl) return;
  const pos = { x: Number(slotEl.dataset.x), y: Number(slotEl.dataset.y) };
  const tileEl = ev.target.closest('.tile');
  drag = { pos, tileEl, startX: ev.clientX, startY: ev.clientY, moving: false, id: ev.pointerId };
  if (tileEl && rotMode && rotMode.x === pos.x && rotMode.y === pos.y) {
    // Tuile en mode rotation : le geste la fait tourner au lieu de la déplacer.
    const r = tileEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const sides = puzzle.getTile(pos.x, pos.y).sides;
    const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
    drag.rot = {
      cx, cy, sides, last: angle, total: 0, deg: 0,
      near: Math.hypot(ev.clientX - cx, ev.clientY - cy) < NEAR_CENTRE * r.width,
    };
  }
  if (tileEl) boardsEl.setPointerCapture(ev.pointerId);
});
boardsEl.addEventListener('pointermove', (ev) => {
  if (!drag || ev.pointerId !== drag.id || !drag.tileEl) return;
  const dx = ev.clientX - drag.startX;
  const dy = ev.clientY - drag.startY;
  if (drag.rot) {
    const r = drag.rot;
    if (r.near) {
      r.deg = dx * 1.5; // départ près du centre : balayage horizontal, vers la droite = sens horaire
    } else {
      const angle = Math.atan2(ev.clientY - r.cy, ev.clientX - r.cx) * 180 / Math.PI;
      let delta = angle - r.last;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      r.total += delta;
      r.last = angle;
      r.deg = r.total;
    }
    if (!drag.moving && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moving = true;
    drag.tileEl.classList.add('turning');
    drag.tileEl.style.transform = `rotate(${r.deg}deg)`;
    return;
  }
  if (!drag.moving && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
  if (!drag.moving) {
    drag.moving = true;
    drag.tileEl.classList.add('dragging');
    floatTile(drag.tileEl); // hors du plateau : ni découpée par son contour, ni cachée derrière l'autre plateau
  }
  drag.tileEl.style.transform = `translate(${dx}px, ${dy}px)`;
});

/** Sort la tuile de sa case (dont le contour la découperait, et dont le plateau peut passer sous l'autre) pour la déplacer librement sous le doigt. */
function floatTile(el) {
  const r = el.getBoundingClientRect();
  document.body.append(el);
  Object.assign(el.style, {
    position: 'fixed', inset: 'auto', left: `${r.left}px`, top: `${r.top}px`,
    width: `${r.width}px`, height: `${r.height}px`, zIndex: '50',
  });
  el.classList.add('floating');
}
function endDrag(ev, cancelled) {
  if (!drag || ev.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  if (d.tileEl && boardsEl.hasPointerCapture?.(ev.pointerId)) boardsEl.releasePointerCapture(ev.pointerId);
  if (d.rot) {
    if (d.moving) {
      d.tileEl.classList.remove('turning');
      d.tileEl.style.transform = '';
      const steps = cancelled ? 0 : Math.round(d.rot.deg / (360 / d.rot.sides));
      if (steps % d.rot.sides !== 0) tryRotate(d.pos, steps); else render();
    } else if (!cancelled) {
      handleTap(d.pos);
    }
    return;
  }
  if (d.moving && d.tileEl) {
    d.tileEl.classList.remove('dragging');
    d.tileEl.style.transform = '';
    if (d.tileEl.classList.contains('floating')) d.tileEl.remove();
    const to = cancelled ? null : slotAt(ev.clientX, ev.clientY);
    if (to && (to.x !== d.pos.x || to.y !== d.pos.y)) tryMove(d.pos, to); else render(); // reposée sur sa case : rien à refuser
  } else if (!cancelled) {
    handleTap(d.pos);
  }
}
boardsEl.addEventListener('pointerup', (ev) => endDrag(ev, false));
boardsEl.addEventListener('pointercancel', (ev) => endDrag(ev, true));
boardsEl.addEventListener('lostpointercapture', (ev) => endDrag(ev, true)); // sans effet après un pointerup normal (drag déjà nul)

/** Case la plus proche dans la direction d'une flèche (cases de formes variées : on compare les positions à l'écran). */
function geoNeighborSlot(from, dir) {
  const centre = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const c0 = centre(from);
  let best = null;
  let bestDist = Infinity;
  for (const el of document.querySelectorAll('#boards .slot')) {
    if (el === from) continue;
    const c = centre(el);
    const vx = c.x - c0.x;
    const vy = c.y - c0.y;
    const dist = Math.hypot(vx, vy);
    if (dist > 0 && (vx * dir[0] + vy * dir[1]) / dist > 0.5 && dist < bestDist) { best = el; bestDist = dist; }
  }
  return best;
}

boardsEl.addEventListener('keydown', (ev) => {
  const slotEl = ev.target.closest?.('.slot');
  if (!slotEl || !puzzle) return;
  const x = Number(slotEl.dataset.x);
  const y = Number(slotEl.dataset.y);
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (moves[ev.key]) {
    if (puzzle.shape === 'carre') {
      const nx = Math.min(puzzle.W * 2 - 1, Math.max(0, x + moves[ev.key][0]));
      const ny = Math.min(puzzle.H - 1, Math.max(0, y + moves[ev.key][1]));
      slots[nx][ny].focus();
    } else {
      geoNeighborSlot(slotEl, moves[ev.key])?.focus();
    }
    ev.preventDefault();
  } else if ((ev.key === 'r' || ev.key === 'R') && puzzle.insane && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    const tile = puzzle.getTile(x, y);
    if (tile) {
      // Premier cran qui s'emboîte dans le sens demandé (comme le geste, qui peut aller directement à n'importe quel cran).
      let done = false;
      for (let k = 1; k < tile.sides && !done; k++) {
        const steps = ev.shiftKey ? -k : k;
        if (puzzle.canRotate(x, y, steps)) done = tryRotate({ x, y }, steps);
      }
      if (!done) refuse({ x, y });
    }
    slots[x][y].focus();
    ev.preventDefault();
  } else if (ev.key === 'Enter' || ev.key === ' ') {
    rotMode = null;
    tapAt({ x, y });
    slots[x][y].focus();
    ev.preventDefault();
  } else if (ev.key === 'Escape' && (selected || rotMode)) {
    selected = null;
    rotMode = null;
    render();
    slots[x][y].focus();
  }
});

// --- Options ---

function segment(container, values, current, label, onPick) {
  container.replaceChildren();
  for (const v of values) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label(v);
    b.classList.toggle('on', v === current);
    b.setAttribute('aria-pressed', String(v === current));
    b.addEventListener('click', () => onPick(v));
    container.append(b);
  }
}
/** Langue effective (choix ou langue de l'appareil), chargée à la demande, puis page retraduite. */
async function applyLanguage() {
  const code = options.lang === 'auto' ? pickLanguage(navigator.languages ?? [navigator.language]) : options.lang;
  setDictionary(await loadLanguage(code));
  document.documentElement.lang = code;
  document.documentElement.dir = directionOf(code);
  translatePage();
  renderOptions();
  if (puzzle) { render(); showCode(); }
  if ($('s-stats').classList.contains('on')) renderStats();
}

function renderLangSelect() {
  const sel = $('o-lang');
  sel.replaceChildren();
  for (const [value, label] of [['auto', t('opt.lang.auto')], ...LANGUAGES.map((l) => [l.code, l.name])]) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    o.selected = value === options.lang;
    sel.append(o);
  }
}

function renderOptions() {
  renderLangSelect();
  segment($('o-shape'), SHAPES, options.shape, (s) => t(`shape.${s}`), (v) => setOption('shape', v));
  const sizes = options.shape === 'carre' ? SIZES : GEO_SIZES;
  segment($('o-size'), sizes, effectiveSize(options), (v) => {
    const { cols, rows } = options.shape === 'hex' ? hexDims(v) : { cols: v, rows: v };
    return `${cols}×${rows}`;
  }, (v) => setOption('size', v));
  segment($('o-colors'), COLORS, options.colors, (v) => `0–${v - 1}`, (v) => setOption('colors', v));
  segment($('o-family'), Object.keys(THEMES), options.family, (k) => THEMES[k].label, (v) => setOption('family', v));
  segment($('o-mode'), ['auto', 'clair', 'fonce'], options.mode, (m) => t(`opt.mode.${m}`), (v) => setOption('mode', v));
}
/** Sélecteur « Mode normal / Mode Insane » de l'accueil : choisit le mode de « Nouvelle partie » et de « Continuer ». */
function renderHomeMode() {
  segment($('h-mode'), [false, true], options.insane, (v) => (v ? t('help.insane.h') : t('home.mode.normal')), (v) => {
    options = cleanOptions({ ...options, insane: v });
    store(KEY_OPTS, options);
    renderHomeMode();
    $('b-continue').hidden = !hasSave(options.insane);
  });
}
function setOption(key, value) {
  options = cleanOptions({ ...options, [key]: value });
  store(KEY_OPTS, options);
  if (key === 'family' || key === 'mode') applyOptionsTheme();
  if (key === 'lang') applyLanguage();
  else renderOptions();
}

// --- Statistiques ---

function el(tag, text, className) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (className) e.className = className;
  return e;
}
const timeOrDash = (ms) => (ms == null ? '–' : formatTime(ms));
function dayLabel(iso) {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(document.documentElement.lang || undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return iso; }
}
const configLabel = (c) => [t(`shape.${c.shape}`), sizeLabel(c.shape, c.size), c.insane ? t('mode.insane') : null].filter(Boolean).join(' · ');

/** Tableau : en-têtes éventuels, puis des lignes de cellules (texte) ; `classes[i]` = classe de la ligne i. */
function table(headers, rows, classes = [], className = '') {
  const tb = el('table', null, className);
  if (headers) {
    const tr = el('tr');
    for (const h of headers) tr.append(el('th', h));
    tb.append(tr);
  }
  rows.forEach((cells, i) => {
    const tr = el('tr', null, classes[i]);
    for (const c of cells) {
      const td = el('td');
      if (Array.isArray(c)) { td.append(c[0]); td.append(el('small', c[1])); } else td.textContent = c;
      tr.append(td);
    }
    tb.append(tr);
  });
  return tb;
}

function renderStats() {
  const body = $('stats-body');
  body.replaceChildren();
  const games = stats.games;
  $('stats-reset').hidden = games.length === 0 && stats.started === 0;
  if (!games.length) {
    body.append(el('p', t('stats.none')));
    return;
  }
  const all = summarize(games);
  body.append(table(null, [
    [t('stats.won'), String(all.won)],
    [t('stats.started'), String(stats.started)],
    [t('stats.best'), timeOrDash(all.best)],
    [t('stats.avg'), timeOrDash(all.avg)],
  ]));
  body.append(el('h3', t('stats.byshape')));
  const heads = ['', t('stats.col.won'), t('stats.col.best'), t('stats.col.avg')];
  for (const section of byShape(games)) {
    body.append(el('h4', t(`shape.${section.shape}`)));
    const line = (label, r) => [label, String(r.won), timeOrDash(r.best), timeOrDash(r.avg)];
    const rows = [line(t('stats.total'), section.total)];
    const classes = ['total'];
    for (const r of section.rows) {
      rows.push(line(`${r.insane ? `${t('mode.insane')} · ` : ''}${sizeLabel(section.shape, r.size)} · 0–${r.colors - 1}`, r));
      classes.push('');
    }
    body.append(table(heads, rows, classes));
  }
  body.append(el('h3', t('stats.last')));
  body.append(table(null, recent(games).map((g) => [
    dayLabel(g.d),
    g.c ? [configLabel({ shape: g.s, size: g.n, insane: g.i === 1 }), g.c] : configLabel({ shape: g.s, size: g.n, insane: g.i === 1 }),
    formatTime(g.t),
  ]), [], 'recent'));
}

// --- Codes de puzzle, nouvelle partie, puzzle du jour ---

const configOf = (insane) => ({ shape: options.shape, size: effectiveSize(options), colors: options.colors, insane });

/** Affiche (ou masque) le code de la partie sous la barre ; le toucher le copie. */
function showCode() {
  const b = $('g-code');
  const code = puzzle?.code ?? null;
  b.hidden = !code;
  b.classList.remove('copied');
  if (code) {
    b.textContent = t('code.is', { code });
    b.setAttribute('aria-label', `${t('code.copy')} : ${code}`);
  }
}
async function copyCode() {
  const code = puzzle?.code;
  if (!code) return;
  let ok = false;
  try { await navigator.clipboard.writeText(code); ok = true; } catch { /* repli ci-dessous */ }
  if (!ok) {
    const ta = document.createElement('textarea');
    ta.value = code;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  if (ok) {
    announce(t('code.copied'));
    $('g-code').classList.add('copied');
    $('g-code').textContent = t('code.copied');
    setTimeout(showCode, 1500);
  }
}

/** « Nouvelle partie » : aléatoire, puzzle du jour (de la configuration choisie) ou saisie d'un code. */
function askNew() {
  const cfg = configOf(options.insane);
  const code = dailyCode(localDate(), cfg);
  const done = bestFor(stats.games, code);
  $('ng-random').textContent = `${t('new.random')} · ${configLabel(cfg)}`;
  $('ng-daily').textContent = `${t('new.daily')} · ${configLabel(cfg)}${done != null ? ` ✓ ${t('new.dailyDone', { time: formatTime(done) })}` : ''}`;
  $('ng-daily').dataset.code = code;
  $('newgame').showModal();
}
let pendingStart = null;
/** Démarre une partie ; si le mode a déjà une partie en cours, on demande d'abord de l'abandonner. */
function begin(code, insane) {
  const mode = code ? parseCode(code).config.insane : insane;
  if (hasSave(mode)) {
    pendingStart = () => newGame(insane, code);
    $('abandon').showModal();
  } else {
    newGame(insane, code);
  }
}
function askCode() {
  $('code-field').value = '';
  $('code-err').hidden = true;
  $('code-field').removeAttribute('aria-invalid');
  $('codedlg').showModal();
  $('code-field').focus();
}
function playCode() {
  const code = canonicalCode($('code-field').value);
  if (!code) {
    $('code-err').hidden = false;
    $('code-field').setAttribute('aria-invalid', 'true');
    $('code-field').focus();
    return;
  }
  $('codedlg').close();
  begin(code, false);
}

// --- Branchements ---

$('o-lang').addEventListener('change', (ev) => setOption('lang', ev.target.value));
$('b-new').addEventListener('click', askNew);
$('ng-random').addEventListener('click', () => { $('newgame').close(); begin(null, options.insane); });
$('ng-daily').addEventListener('click', () => { $('newgame').close(); begin($('ng-daily').dataset.code, options.insane); });
$('ng-code').addEventListener('click', () => { $('newgame').close(); askCode(); });
$('ng-cancel').addEventListener('click', () => $('newgame').close());
$('code-field').addEventListener('input', (ev) => {
  const v = typeCode(ev.target.value);
  if (v !== ev.target.value) ev.target.value = v;
  $('code-err').hidden = true;
  ev.target.removeAttribute('aria-invalid');
});
$('code-field').addEventListener('paste', (ev) => {
  const text = ev.clipboardData?.getData('text');
  if (!text) return;
  ev.preventDefault();
  ev.target.value = canonicalCode(text) ?? typeCode(text);
  $('code-err').hidden = true;
});
$('code-field').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); playCode(); } });
$('code-play').addEventListener('click', playCode);
$('code-cancel').addEventListener('click', () => $('codedlg').close());
$('abandon-no').addEventListener('click', () => { pendingStart = null; $('abandon').close(); });
$('abandon-yes').addEventListener('click', () => { const go = pendingStart; pendingStart = null; $('abandon').close(); if (go) go(); });
$('g-code').addEventListener('click', copyCode);
$('b-continue').addEventListener('click', () => continueGame(options.insane));
$('b-stats').addEventListener('click', () => go('stats'));
$('stats-reset').addEventListener('click', () => $('confirm').showModal());
$('confirm-no').addEventListener('click', () => $('confirm').close());
$('confirm-yes').addEventListener('click', () => {
  stats = emptyStats();
  store(KEY_STATS, stats); // vide mais présent : sinon les anciens temps seraient repris au prochain démarrage
  store(KEY_SCORES, null);
  $('confirm').close();
  renderStats();
});
$('b-help').addEventListener('click', () => go('help'));
$('b-options').addEventListener('click', () => { renderOptions(); go('options'); });
$('b-about').addEventListener('click', () => go('about'));
for (const b of document.querySelectorAll('button.back')) b.addEventListener('click', () => go('home'));
$('g-menu').addEventListener('click', () => { $('menu').showModal(); updateTimerRunning(); saveGame(); });
$('menu').addEventListener('close', updateTimerRunning); // couvre aussi Échap ; le menu cache le plateau : le chrono s'arrête
$('m-resume').addEventListener('click', () => $('menu').close());
$('m-new').addEventListener('click', () => { $('menu').close(); newGame(puzzle.insane); });
$('m-help').addEventListener('click', () => { $('menu').close(); go('help'); });
$('m-options').addEventListener('click', () => { $('menu').close(); renderOptions(); go('options'); });
$('m-home').addEventListener('click', () => { $('menu').close(); go('home'); });
$('g-undo').addEventListener('click', () => { if (puzzle.undo()) { selected = null; rotMode = null; render(); saveGame(); } });
$('g-redo').addEventListener('click', () => { if (puzzle.redo()) { selected = null; rotMode = null; render(); saveGame(); } });
$('win-again').addEventListener('click', () => { $('win').close(); newGame(puzzle.insane); });
$('win-menu').addEventListener('click', () => { $('win').close(); go('home'); });
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', layout);
document.addEventListener('visibilitychange', () => { updateTimerRunning(); if (document.visibilityState === 'hidden') saveGame(); });
window.addEventListener('pagehide', saveGame);
darkQuery?.addEventListener?.('change', () => { if (options.mode === 'auto') applyOptionsTheme(); });

// --- Installation et hors ligne ---

let installEvent = null;
window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  installEvent = ev;
  $('b-install').hidden = false;
});
window.addEventListener('appinstalled', () => { installEvent = null; $('b-install').hidden = true; });
$('b-install').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice.catch(() => null);
  installEvent = null;
  $('b-install').hidden = true;
});
if ('serviceWorker' in navigator) {
  // Mise à jour : le nouveau service worker prend la main tout de suite (skipWaiting + claim) ; la page déjà ouverte
  // chargerait ensuite ses modules à la demande (langues) depuis le nouveau cache. On la recharge donc, mais jamais en
  // pleine partie (elle est sauvegardée à chaque coup) : au retour hors de l'écran de jeu.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let updated = false;
  const reloadIfIdle = () => { if (updated && !$('s-game').classList.contains('on')) location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) { updated = true; reloadIfIdle(); } });
  window.addEventListener('hashchange', reloadIfIdle);
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* sans service worker : pas de hors ligne */ }); });
}

// --- Démarrage ---

$('logo').innerHTML = logoSvg();
applyOptionsTheme();
applyLanguage().finally(route);
