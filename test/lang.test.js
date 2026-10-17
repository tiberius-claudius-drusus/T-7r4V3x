/*
 * T-7r4V3x — tests des traductions : mêmes clés, mêmes {marques}, pas de HTML, registre cohérent avec les fichiers.
 * Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { FR, t, tHtml, setDictionary } from '../src/strings.js';
import { LANGUAGES, CODES, pickLanguage, directionOf, loadLanguage } from '../src/lang/index.js';

const marks = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const others = CODES.filter((c) => c !== 'fr');

test('le registre : codes uniques, 20 langues, noms renseignés, français en premier', () => {
  assert.equal(new Set(CODES).size, CODES.length);
  assert.equal(CODES.length, 20);
  assert.equal(CODES[0], 'fr');
  for (const l of LANGUAGES) assert.ok(l.name && l.name.length > 1, `nom manquant : ${l.code}`);
});

test('chaque langue du registre a son fichier, et aucun fichier n\'est oublié du registre', () => {
  const files = readdirSync(new URL('../src/lang/', import.meta.url))
    .filter((f) => f.endsWith('.js') && f !== 'index.js').map((f) => f.slice(0, -3)).sort();
  assert.deepEqual(files, [...others].sort());
});

for (const code of others) {
  test(`langue ${code} : mêmes clés, mêmes marques, texte brut, bien traduite`, async () => {
    const dict = (await import(`../src/lang/${code}.js`)).default;
    assert.deepEqual(Object.keys(dict).sort(), Object.keys(FR).sort(), 'clés différentes du français');
    let same = 0;
    for (const [key, value] of Object.entries(dict)) {
      assert.equal(typeof value, 'string', `${code}/${key}`);
      assert.ok(value.trim().length > 0, `${code}/${key} : vide`);
      assert.equal(marks(value), marks(FR[key]), `${code}/${key} : marques {…} différentes`);
      assert.ok(!/[<>]/.test(value), `${code}/${key} : balisage interdit`);
      if (value === FR[key]) same += 1;
    }
    assert.ok(same < Object.keys(FR).length * 0.25, `${code} : trop de textes identiques au français (${same})`);
  });
}

test('pickLanguage : correspondance exacte, langue de base, portugais, repli français', () => {
  assert.equal(pickLanguage(['pt-BR', 'en']), 'pt-br');
  assert.equal(pickLanguage(['pt']), 'pt-pt');
  assert.equal(pickLanguage(['zh-CN']), 'zh');
  assert.equal(pickLanguage(['en-GB', 'fr']), 'en');
  assert.equal(pickLanguage(['xx', 'yy']), 'fr');
  assert.equal(pickLanguage([]), 'fr');
});

test('directionOf : arabe de droite à gauche, le reste de gauche à droite', () => {
  assert.equal(directionOf('ar'), 'rtl');
  assert.equal(directionOf('fr'), 'ltr');
  assert.equal(directionOf('ja'), 'ltr');
});

test('loadLanguage : repli sur le français pour un code inconnu', async () => {
  assert.equal(await loadLanguage('xx'), FR);
  assert.equal((await loadLanguage('en'))['home.new'], 'New game');
});

test('t() : langue courante, repli sur le français pour une clé absente', async () => {
  setDictionary(await loadLanguage('en'));
  assert.equal(t('game.placed', { n: 2, total: 9 }), '2 of 9 in place');
  setDictionary({ 'home.new': 'X' });
  assert.equal(t('home.new'), 'X');
  assert.equal(t('home.help'), FR['home.help']);
  setDictionary(null);
  assert.equal(t('home.new'), FR['home.new']);
});

test('tHtml : le texte est échappé, les fragments fournis par le code sont insérés', () => {
  const dict = { k: 'a <b> & {link} c' };
  assert.equal(tHtml('k', { link: '<a href="x">y</a>' }, dict), 'a &lt;b&gt; &amp; <a href="x">y</a> c');
  assert.equal(tHtml('inconnue<'), 'inconnue&lt;');
});
