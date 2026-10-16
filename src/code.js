/*
 * T-7r4V3x — codes de puzzle (« empreintes de plateau »), générateur à graine, puzzle du jour
 * Copyright (C) 2026 Drusus (Gens Claudia). Licence : GPL-2.0-or-later (voir LICENSE).
 *
 * Idée reprise de 1-5731N (Gens Claudia) : un puzzle est entièrement déterminé par un petit code, ce qui permet de le
 * rejouer, de le partager, et d'en tirer un « puzzle du jour » identique pour tous.
 *
 * Un code tient en 12 symboles de l'alphabet de Crockford (sans I, L, O, U), affichés en trois groupes de quatre :
 *
 *     V V | C C | S S S S S S S | K        ex. « 012G-7K3F-9A2X »
 *     version | configuration | graine (35 bits) | somme de contrôle
 *
 *  - version : 2 chiffres, la version de l'ALGORITHME de génération (voir plus bas) ;
 *  - configuration (2 symboles, 9 bits) : forme (carré, hexagonal, carré tronqué), taille, nombre de valeurs, mode Insane.
 *    Le code porte donc sa propre configuration : le jouer rejoue exactement ce plateau, quelles que soient les options ;
 *  - graine : alimente le générateur pseudo-aléatoire du plateau ;
 *  - somme de contrôle : détecte une faute de frappe (un symbole faux, deux symboles voisins échangés) au lieu de jouer en
 *    silence un autre puzzle.
 *
 * RÈGLE D'OR : un code ne doit JAMAIS changer de puzzle. Le plateau dépend de l'algorithme de `Puzzle` / `GeoPuzzle`
 * (ordre des tirages dans `_initBoard` / `_init`, `_scrambleRotations`, `hexDims`…) et du générateur ci-dessous. Si l'un d'eux
 * doit changer, on crée la version 2 (CODE_VERSION) et on GARDE la version 1 appelable ; sinon les codes déjà partagés
 * donneraient d'autres puzzles. Les tests de `test/code.test.js` figent des puzzles de référence pour le détecter.
 */
import { Puzzle } from './puzzle.js';
import { GeoPuzzle, GEO_SIZES } from './geopuzzle.js';

export const CODE_VERSION = 1;
export const SHAPES = ['carre', 'hex', 'oct']; // plateau carré classique, hexagonal, carré tronqué
export const SIZES = [2, 3, 4, 5, 6]; // tailles du plateau carré
export const COLORS = [3, 5, 6, 8, 10];
export const sizesOf = (shape) => (shape === 'carre' ? SIZES : GEO_SIZES);

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford : pas de I, L, O, U (pas de confusions à la saisie)
const SEED_LENGTH = 7;
const CODE_LENGTH = 2 + 2 + SEED_LENGTH + 1;

// --- configuration <-> entier (9 bits : forme 2, taille 3, valeurs 3, Insane 1) ---

/** Entier 0..767 de la configuration { shape, size, colors, insane }, ou null si elle n'existe pas. */
export function configIndex({ shape, size, colors, insane = false }) {
  const s = SHAPES.indexOf(shape);
  if (s < 0) return null;
  const z = sizesOf(shape).indexOf(size);
  const k = COLORS.indexOf(colors);
  if (z < 0 || k < 0) return null;
  return ((s * 8 + z) * 8 + k) * 2 + (insane ? 1 : 0);
}

export function configFromIndex(n) {
  if (!Number.isInteger(n) || n < 0 || n >= 1024) return null;
  const insane = (n & 1) === 1;
  const k = (n >> 1) & 7;
  const z = (n >> 4) & 7;
  const s = n >> 7;
  const shape = SHAPES[s];
  if (!shape || k >= COLORS.length || z >= sizesOf(shape).length) return null;
  return { shape, size: sizesOf(shape)[z], colors: COLORS[k], insane };
}

// --- générateur pseudo-aléatoire à graine (entiers 32 bits seulement : même suite dans tous les moteurs JavaScript) ---

/** Chaîne -> quatre mots de 32 bits (cyrb128, domaine public, bryc). */
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Générateur sfc32 alimenté par un texte ; renvoie une fonction de valeurs dans [0, 1). */
export function seeded(text) {
  let [a, b, c, d] = cyrb128(text);
  const next = () => {
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) next(); // chauffe
  return next;
}

// --- format du code ---

const symbolsOf = (text) => [...text].map((ch) => ALPHABET.indexOf(ch));

/** Somme de contrôle de 11 symboles : somme pondérée (poids 1..11) modulo 31, premier nombre premier sous 32. */
function checksum(eleven) {
  const sum = symbolsOf(eleven).reduce((acc, v, i) => acc + (i + 1) * v, 0);
  return ALPHABET[sum % 31];
}

function randomSeed() {
  const buf = new Uint8Array(SEED_LENGTH);
  try {
    globalThis.crypto.getRandomValues(buf);
  } catch {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return [...buf].map((b) => ALPHABET[b & 31]).join('');
}

function assemble(version, index, seed) {
  const body = `${String(version).padStart(2, '0')}${ALPHABET[index >> 5]}${ALPHABET[index & 31]}${seed}`;
  const full = body + checksum(body);
  return `${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8)}`;
}

/** Code d'une configuration ; la graine est tirée au hasard si elle n'est pas donnée. */
export function makeCode(config, seed = randomSeed()) {
  const index = configIndex(config);
  if (index === null) throw new RangeError('configuration inconnue');
  if (!/^[0-9A-HJKMNP-TV-Z]{7}$/.test(seed)) throw new RangeError('graine invalide');
  return assemble(CODE_VERSION, index, seed);
}

/**
 * « 012G-7K3F-9A2X » (aussi en minuscules, sans tirets, avec espaces ; O lu 0, I et L lus 1) -> { version, config, seed }
 * ou null (mauvaise longueur, symbole inconnu, somme de contrôle fausse, version ou configuration inconnue).
 */
export function parseCode(text) {
  const s = String(text ?? '').toUpperCase().replace(/[\s\-_.]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== CODE_LENGTH || !/^[0-9][0-9][0-9A-Z]+$/.test(s) || symbolsOf(s).includes(-1)) return null;
  if (checksum(s.slice(0, -1)) !== s.slice(-1)) return null;
  const version = Number(s.slice(0, 2));
  if (version !== CODE_VERSION) return null; // seules les versions de l'algorithme encore disponibles
  const index = ALPHABET.indexOf(s[2]) * 32 + ALPHABET.indexOf(s[3]);
  const config = configFromIndex(index);
  if (!config) return null;
  return { version, index, config, seed: s.slice(4, 4 + SEED_LENGTH) };
}

/** Forme canonique d'un code saisi de n'importe quelle façon, ou null. */
export function canonicalCode(text) {
  const c = parseCode(text);
  return c ? assemble(c.version, c.index, c.seed) : null;
}

/** Saisie en cours : « 012g7k3f9a » -> « 012G-7K3F-9A » (pour le champ de saisie). */
export function typeCode(text) {
  const s = String(text ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, CODE_LENGTH);
  return [s.slice(0, 4), s.slice(4, 8), s.slice(8)].filter(Boolean).join('-');
}

// --- puzzle du jour ---

/** AAAA-MM-JJ est-il un vrai jour du calendrier ? (2026-02-30 est refusé) */
export function validDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof d === 'string' ? d : '');
  if (!m) return false;
  const [y, mo, da] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const x = new Date(Date.UTC(y, mo - 1, da));
  return x.getUTCFullYear() === y && x.getUTCMonth() === mo - 1 && x.getUTCDate() === da;
}

/** Date de l'appareil, dans son fuseau (le puzzle du jour change à minuit heure locale). */
export function localDate(now = new Date()) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Code du puzzle du jour : dérivé de la date ET de la configuration (forme, taille, valeurs, Insane), donc identique pour
 * tous ceux qui jouent la même configuration le même jour.
 */
export function dailyCode(dateText, config) {
  if (!validDate(dateText)) throw new RangeError('date invalide');
  const index = configIndex(config);
  if (index === null) throw new RangeError('configuration inconnue');
  const w = cyrb128(`t7-daily-${dateText}-${index}`);
  let seed = '';
  for (let i = 0; i < 6; i++) seed += ALPHABET[(w[0] >>> (27 - 5 * i)) & 31];
  seed += ALPHABET[(w[1] >>> 27) & 31];
  return assemble(CODE_VERSION, index, seed);
}

// --- le puzzle d'un code ---

/** Reconstruit exactement le plateau d'un code (le puzzle porte son code : `puzzle.code`). Lève une erreur si le code est invalide. */
export function puzzleFromCode(text) {
  const c = parseCode(text);
  if (!c) throw new RangeError('code de puzzle invalide');
  const { shape, size, colors, insane } = c.config;
  const options = { random: seeded(`t7-puzzle-${c.version}-${c.index}-${c.seed}`), insane, code: assemble(c.version, c.index, c.seed) };
  return shape === 'carre' ? new Puzzle(size, colors, options) : new GeoPuzzle(shape, size, colors, options);
}
