/*
 * T-7r4V3x — tests du registre de thèmes et des textes. Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES, resolve, normalize, pickVariant, apply } from '../src/themes.js';
import { FR, t } from '../src/strings.js';
import { logoSvg, LOGO_TILES } from '../src/logo.js';

const REQUIRED = ['--bg', '--fg', '--muted', '--acc', '--theme-color', '--btn-bg', '--btn-fg', '--btn-bd', '--btn-active',
  '--btn-radius', '--board-bg', '--board-radius', '--cell-bg', '--cell-radius', '--tile-radius', '--tile-shadow',
  '--dialog-bg', '--dialog-bd', '--dialog-veil', '--rule', '--bg-image', '--bf', '--bw', '--ui-font',
  '--board-bd', '--cell-bd', '--tile-inner', '--tile-ink', '--h-variant', '--h1-spacing', '--h2-spacing', '--h2-transform',
  ...Array.from({ length: 10 }, (_, i) => `--tile-${i}`)];

test('chaque variante de chaque thème définit toutes les variables requises', () => {
  for (const [fam, def] of Object.entries(THEMES)) {
    for (const variant of Object.keys(def.variants)) {
      const vars = resolve(fam, variant);
      for (const key of REQUIRED) assert.ok(vars[key] !== undefined, `${fam}/${variant} : ${key} manquante`);
    }
  }
});

/** Rapport de contraste WCAG entre deux couleurs #rrggbb (null si la valeur n'est pas un #rrggbb). */
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return null;
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('lisibilité : contrastes minimaux (WCAG) pour chaque thème', () => {
  const failures = [];
  for (const [fam, def] of Object.entries(THEMES)) {
    for (const variant of Object.keys(def.variants)) {
      const v = resolve(fam, variant);
      const name = `${fam}/${variant}`;
      const checks = [
        ['texte / fond', contrast(v['--fg'], v['--bg']), 7],
        ['texte secondaire / fond', contrast(v['--muted'], v['--bg']), 4.5],
        ['accent / fond (titres)', contrast(v['--acc'], v['--bg']), 3],
        ['bouton : texte / fond', contrast(v['--btn-fg'], v['--btn-bg']), 7],
        ['bouton principal : fond / accent', contrast(v['--bg'], v['--acc']), 4.5],
      ];
      for (const [what, ratio, min] of checks) {
        if (ratio === null) continue; // valeur non hexadécimale (dégradé, transparence) : non évaluable ici
        if (ratio < min) failures.push(`${name} — ${what} : ${ratio.toFixed(2)} < ${min}`);
      }
      // Les chiffres des tuiles (blancs avec ombre) doivent rester lisibles sur chacune des 10 couleurs.
      for (let i = 0; i < 10; i++) {
        const ratio = contrast(v['--tile-ink'], v[`--tile-${i}`]);
        if (ratio !== null && ratio < 2.2) failures.push(`${name} — chiffre sur --tile-${i} : ${ratio.toFixed(2)} < 2.2`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('le thème foncé hérite du clair et le redéfinit', () => {
  const clair = resolve('epure', 'clair');
  const fonce = resolve('epure', 'fonce');
  assert.notEqual(clair['--bg'], fonce['--bg']);
  assert.equal(clair['--btn-radius'], fonce['--btn-radius']);
});

test('héritage entre familles et protection contre les boucles', () => {
  assert.equal(resolve('aurora', 'fonce')['--tile-0'], resolve('epure', 'fonce')['--tile-0']);
  assert.deepEqual(resolve('inconnu', 'clair'), {});
});

test('normalize et pickVariant', () => {
  assert.deepEqual(normalize({ family: 'x', mode: 'y' }), { family: 'epure', mode: 'auto' });
  assert.deepEqual(normalize(undefined), { family: 'epure', mode: 'auto' });
  assert.equal(pickVariant('auto', true), 'fonce');
  assert.equal(pickVariant('auto', false), 'clair');
  assert.equal(pickVariant('clair', true), 'clair');
});

test('apply pose les variables et la couleur de la barre du navigateur', () => {
  const set = {};
  const root = { style: { setProperty: (k, v) => { set[k] = v; } }, dataset: {} };
  const meta = { value: '', setAttribute(_, v) { this.value = v; } };
  const doc = { querySelector: () => meta };
  const r = apply({ family: 'aurora', mode: 'auto' }, true, root, doc);
  assert.deepEqual(r, { family: 'aurora', variant: 'fonce' });
  assert.equal(root.dataset.theme, 'aurora-fonce');
  assert.equal(set['--bg'], '#17142b');
  assert.equal(meta.value, '#17142b');
});

test('toutes les clés de texte utilisées par la page existent', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const keys = new Set();
  for (const m of html.matchAll(/data-i18n(?:-html|-aria|-title)?="([^"]+)"/g)) keys.add(m[1]);
  for (const m of app.matchAll(/\bt\('([a-z]+\.[A-Za-z.]+)'/g)) keys.add(m[1]);
  for (const mode of ['auto', 'clair', 'fonce']) keys.add(`opt.mode.${mode}`);
  for (const k of keys) assert.ok(k in FR, `texte manquant : ${k}`);
});

test('tous les pictogrammes demandés par la page existent', async () => {
  const { ICONS } = await import('../src/icons.js');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const m of html.matchAll(/data-icon="([^"]+)"/g)) assert.ok(m[1] in ICONS, `pictogramme manquant : ${m[1]}`);
});

test('t() remplace les paramètres et rend la clé si inconnue', () => {
  assert.equal(t('game.placed', { n: 4, total: 9 }), '4 sur 9 en place');
  assert.equal(t('cle.inconnue'), 'cle.inconnue');
});

test('le logo est un carré 2×2 résolu (bords en contact égaux)', () => {
  const [a, b, c, d] = LOGO_TILES.map((x) => x.v);
  assert.equal(a[1], b[3]); // est de A = ouest de B
  assert.equal(a[2], c[0]); // sud de A = nord de C
  assert.equal(b[2], d[0]);
  assert.equal(c[1], d[3]);
  assert.match(logoSvg(), /^<svg /);
});
