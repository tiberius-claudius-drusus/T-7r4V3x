/*
 * T-7r4V3x — tests des codes de puzzle, du générateur à graine et du puzzle du jour. Licence : GPL-2.0-or-later (voir LICENSE.txt).
 *
 * Les « puzzles de référence » ci-dessous FIGENT l'algorithme de génération de la version 1 : si l'un d'eux échoue, un
 * changement a modifié le plateau d'un code existant. Ne pas « corriger » la valeur attendue : créer la version 2 du code
 * (CODE_VERSION) et garder la version 1 appelable (voir l'en-tête de src/code.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CODE_VERSION, SHAPES, COLORS, sizesOf, configIndex, configFromIndex, makeCode, parseCode, canonicalCode, typeCode,
  validDate, localDate, dailyCode, puzzleFromCode, seeded,
} from '../src/code.js';
import { Puzzle } from '../src/puzzle.js';
import { GeoPuzzle } from '../src/geopuzzle.js';

const signature = (puzzle) => {
  let h = 0x811c9dc5; // FNV-1a sur le JSON du plateau
  for (const ch of JSON.stringify(puzzle.toJSON())) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
};

const allConfigs = () => SHAPES.flatMap((shape) => sizesOf(shape).flatMap((size) => COLORS.flatMap((colors) => [false, true].map((insane) => ({ shape, size, colors, insane })))));

test('configuration <-> entier : aller-retour pour les 130 configurations, aucune autre n\'existe', () => {
  const seen = new Set();
  for (const c of allConfigs()) {
    const i = configIndex(c);
    assert.ok(Number.isInteger(i) && i >= 0 && i < 1024);
    assert.ok(!seen.has(i), 'indices distincts');
    seen.add(i);
    assert.deepEqual(configFromIndex(i), c);
  }
  assert.equal(seen.size, (5 + 3 + 3 + 2) * 5 * 2); // 130 : carré 5 tailles, hexagonal 3, carré tronqué 3, 8/4gone 2
  let valid = 0;
  for (let i = 0; i < 1024; i++) if (configFromIndex(i)) valid += 1;
  assert.equal(valid, seen.size);
  assert.equal(configIndex({ shape: 'hex', size: 6, colors: 6 }), null);
  assert.equal(configIndex({ shape: 'carre', size: 3, colors: 7 }), null);
  assert.equal(configIndex({ shape: 'triangle', size: 3, colors: 6 }), null);
});

test('makeCode / parseCode : aller-retour pour toutes les configurations', () => {
  for (const c of allConfigs()) {
    const code = makeCode(c);
    assert.match(code, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    const p = parseCode(code);
    assert.deepEqual(p.config, c);
    assert.equal(p.version, CODE_VERSION);
    assert.equal(canonicalCode(code), code);
  }
});

test('saisie tolérante : minuscules, sans tirets, avec espaces, O lu 0, I et L lus 1', () => {
  const code = makeCode({ shape: 'carre', size: 3, colors: 6, insane: false }, '7K3F9A2');
  assert.equal(code, '010M-7K3F-9A2H');
  for (const typed of [code.toLowerCase(), code.replace(/-/g, ''), code.replace(/-/g, ' '), ` ${code} `, code.replace(/0/g, 'O'), code.replace(/1/g, 'l')]) {
    assert.equal(canonicalCode(typed), code, typed);
  }
});

test('somme de contrôle : un symbole faux ou deux symboles voisins échangés sont refusés', () => {
  const code = makeCode({ shape: 'hex', size: 4, colors: 6, insane: true }, 'ABCDEFG').replace(/-/g, '');
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let single = 0;
  let accepted = 0;
  for (let pos = 0; pos < code.length; pos++) {
    for (const ch of alphabet) {
      if (ch === code[pos]) continue;
      single += 1;
      if (canonicalCode(code.slice(0, pos) + ch + code.slice(pos + 1)) !== null) accepted += 1;
    }
  }
  // un symbole faux : seules quelques substitutions de la case « version » ou de configuration restent valides par hasard
  // (par exemple 0 <-> Z dans la somme modulo 31) ; la somme de contrôle doit en refuser l'immense majorité
  assert.ok(accepted / single < 0.01, `${accepted}/${single} fautes acceptées`);
  let swapped = 0;
  for (let pos = 0; pos < code.length - 1; pos++) {
    if (code[pos] === code[pos + 1]) continue;
    const t = code.slice(0, pos) + code[pos + 1] + code[pos] + code.slice(pos + 2);
    if (canonicalCode(t) !== null) swapped += 1;
  }
  assert.equal(swapped, 0, 'échanges de voisins non détectés');
});

test('codes invalides : mauvaise longueur, symbole inconnu, version inconnue, configuration inexistante, valeurs absurdes', () => {
  const ok = makeCode({ shape: 'carre', size: 3, colors: 6, insane: false }, '7K3F9A2');
  for (const bad of ['', null, undefined, 42, ok.slice(0, -1), `${ok}0`, ok.replace('7', 'U'), '0000-0000-0000', 'ZZZZ-ZZZZ-ZZZZ', '999M-7K3F-9A2H']) {
    assert.equal(parseCode(bad), null, String(bad));
    assert.equal(canonicalCode(bad), null);
  }
  assert.throws(() => makeCode({ shape: 'carre', size: 9, colors: 6 }), RangeError);
  assert.throws(() => makeCode({ shape: 'carre', size: 3, colors: 6 }, 'abc'), RangeError);
  assert.throws(() => puzzleFromCode('pas un code'), RangeError);
});

test('typeCode : mise en forme pendant la saisie', () => {
  assert.equal(typeCode(''), '');
  assert.equal(typeCode('012g'), '012G');
  assert.equal(typeCode('012g7k'), '012G-7K');
  assert.equal(typeCode('012g7k3f9a2h'), '012G-7K3F-9A2H');
  assert.equal(typeCode('012g-7k3f 9a2h EXTRA'), '012G-7K3F-9A2H');
});

test('le générateur à graine est reproductible, bien réparti et propre à sa graine', () => {
  const a = seeded('graine');
  const b = seeded('graine');
  const first = Array.from({ length: 50 }, () => a());
  assert.deepEqual(first, Array.from({ length: 50 }, () => b()));
  assert.ok(first.every((v) => v >= 0 && v < 1));
  const other = seeded('autre graine');
  assert.notDeepEqual(first, Array.from({ length: 50 }, () => other()));
  const r = seeded('moyenne');
  const mean = Array.from({ length: 20000 }, () => r()).reduce((x, y) => x + y, 0) / 20000;
  assert.ok(Math.abs(mean - 0.5) < 0.01, `moyenne ${mean}`);
});

test('un code redonne exactement le même plateau, et deux graines donnent deux plateaux', () => {
  const code = makeCode({ shape: 'hex', size: 4, colors: 6, insane: false }, 'ABCDEFG');
  assert.equal(signature(puzzleFromCode(code)), signature(puzzleFromCode(code)));
  assert.deepEqual(puzzleFromCode(code).toJSON(), puzzleFromCode(code.toLowerCase()).toJSON());
  const other = makeCode({ shape: 'hex', size: 4, colors: 6, insane: false }, 'ABCDEFH');
  assert.notEqual(signature(puzzleFromCode(code)), signature(puzzleFromCode(other)));
});

test('le puzzle d\'un code a la forme, la taille, les valeurs et le mode du code, et porte son code', () => {
  for (const c of allConfigs().filter((_, i) => i % 7 === 0)) {
    const code = makeCode(c);
    const p = puzzleFromCode(code);
    assert.equal(p.shape, c.shape);
    assert.equal(p.size, c.size);
    assert.equal(p.colors, c.colors);
    assert.equal(p.insane, c.insane);
    assert.equal(p.code, code);
    assert.ok(p instanceof (c.shape === 'carre' ? Puzzle : GeoPuzzle));
    assert.equal(JSON.parse(JSON.stringify(p.toJSON())).code, code, 'le code survit à la sauvegarde');
    const back = (c.shape === 'carre' ? Puzzle : GeoPuzzle).fromJSON(JSON.parse(JSON.stringify(p.toJSON())));
    assert.equal(back.code, code);
  }
});

test('une sauvegarde sans code ou avec un code absurde reste jouable (code = null)', () => {
  const p = new Puzzle(3, 5, { random: seeded('x') });
  assert.equal(p.code, null);
  const json = p.toJSON();
  delete json.code;
  assert.equal(Puzzle.fromJSON(json).code, null);
  assert.equal(Puzzle.fromJSON({ ...json, code: '<script>' }).code, null);
});

// ---- puzzles de référence : figent l'algorithme de la version 1 ----
const REFERENCE = [
  ['010M-7K3F-9A2H', 'ff02ce0', 'carré 3×3, 6 valeurs'],
  ['0119-0123-456M', 'c2287b07', 'carré 4×4, 10 valeurs, Insane'],
  ['014M-ABCD-EFGD', 'e90845f', 'hexagonal 6×4, 6 valeurs'],
  ['0157-HJKM-NPQF', 'c3b0986e', 'hexagonal 7×5, 8 valeurs, Insane'],
  ['0182-RSTV-WXYR', 'c81c2900', 'carré tronqué 3×3, 5 valeurs'],
  ['0199-ZZZZ-ZZZ3', '6d3198c6', 'carré tronqué 5×5, 10 valeurs, Insane'],
  ['01C2-7K3F-9A2C', '91d9d13', '8/4gone 3×3, 5 valeurs'],
  ['01CS-ZZZZ-ZZZE', 'e16990d8', '8/4gone 5×5, 10 valeurs, Insane'],
];
for (const [code, expected, label] of REFERENCE) {
  test(`puzzle de référence (version 1) : ${label}`, () => {
    assert.notEqual(parseCode(code), null, 'le code de référence doit rester valide');
    assert.equal(signature(puzzleFromCode(code)), expected, `le plateau du code ${code} a changé : voir l'en-tête du fichier`);
  });
}

test('validDate / localDate', () => {
  assert.ok(validDate('2026-10-16') && validDate('2028-02-29'));
  for (const bad of ['2026-02-30', '2026-13-01', '2026-10-1', '16/10/2026', '', null, 20261016]) assert.equal(validDate(bad), false, String(bad));
  assert.equal(localDate(new Date(2026, 9, 16, 0, 30)), '2026-10-16'); // 0 h 30 locale : le jour local, pas la veille UTC
  assert.equal(localDate(new Date(2026, 9, 16, 23, 59)), '2026-10-16');
});

test('puzzle du jour : stable, propre à la date et à la configuration, rejouable', () => {
  const cfg = { shape: 'carre', size: 3, colors: 6, insane: false };
  assert.equal(dailyCode('2026-10-16', cfg), '010M-6CRE-PDWF');
  assert.equal(dailyCode('2026-10-16', cfg), dailyCode('2026-10-16', cfg));
  assert.equal(dailyCode('2026-10-16', { ...cfg, insane: true }), '010N-B5PQ-JENK');
  assert.equal(dailyCode('2026-10-17', cfg), '010M-SE85-8KNC');
  const codes = new Set();
  for (let d = 1; d <= 28; d++) codes.add(dailyCode(`2026-02-${String(d).padStart(2, '0')}`, cfg));
  assert.equal(codes.size, 28, 'un puzzle différent chaque jour');
  const p = puzzleFromCode(dailyCode('2026-10-16', cfg));
  assert.deepEqual({ shape: p.shape, size: p.size, colors: p.colors, insane: p.insane }, cfg);
  assert.throws(() => dailyCode('2026-02-30', cfg), RangeError);
  assert.throws(() => dailyCode('2026-10-16', { shape: 'x', size: 3, colors: 6 }), RangeError);
});

test('les codes tirés au hasard sont variés et valides', () => {
  const cfg = { shape: 'oct', size: 4, colors: 8, insane: true };
  const codes = new Set(Array.from({ length: 200 }, () => makeCode(cfg)));
  assert.ok(codes.size > 195);
  for (const c of codes) assert.deepEqual(parseCode(c).config, cfg);
});
