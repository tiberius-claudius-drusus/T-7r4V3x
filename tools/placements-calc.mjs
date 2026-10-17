/*
 * T-7r4V3x — calcul du nombre de placements possibles des tuiles (utilisé par tools/gen-placements.mjs et par les tests ;
 * la page, elle, ne calcule rien : elle lit la table src/placements.js).
 * Copyright (C) 2026 Drusus (Gens Claudia). Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
import { SHAPES, sizesOf, COLORS } from '../src/code.js';
import { TOPOLOGIES } from '../src/geopuzzle.js';

/**
 * Nombre de façons de placer les tuiles d'une configuration sur les cases : pour chaque sorte de tuile (les octogones et
 * les petits carrés ne se mélangent pas), m! dispositions de m tuiles sur m cases ; en mode Insane, chaque tuile a en plus
 * autant d'orientations qu'elle a de côtés (4, 6 ou 8). Les tuiles sont comptées comme distinctes (deux tuiles de mêmes
 * valeurs ne réduisent pas le nombre). Nombre à virgule flottante : 36! x 4^36 reste très en dessous de 1e308.
 */
export function placementCount({ shape, size, insane = false }) {
  const kinds = new Map(); // sorte -> { nombre de tuiles, nombre de côtés }
  if (shape === 'carre') {
    kinds.set('carre', { m: size * size, sides: 4 });
  } else {
    const topo = TOPOLOGIES[shape];
    for (let x = 0; x < topo.width(size); x++) {
      for (let y = 0; y < topo.height(size); y++) {
        if (!topo.isCell(size, x, y)) continue;
        const kind = topo.kind(size, x, y);
        const k = kinds.get(kind) ?? { m: 0, sides: topo.edgeCount(kind) };
        k.m += 1;
        kinds.set(kind, k);
      }
    }
  }
  let total = 1;
  for (const { m, sides } of kinds.values()) {
    for (let i = 2; i <= m; i++) total *= i;
    if (insane) total *= sides ** m;
  }
  return total;
}

const SUPERSCRIPT = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** Écriture à 3 chiffres : 362880 -> « 3.63×10⁵ » (exposant en caractères en exposant). */
export function engineering(value) {
  let exp = Math.floor(Math.log10(value));
  let mant = Math.round((value / 10 ** exp) * 100) / 100;
  if (mant >= 10) { mant /= 10; exp += 1; } // 9.996 -> 10.00 : renormaliser
  return `${mant.toFixed(2)}×10${[...String(exp)].map((c) => SUPERSCRIPT[c]).join('')}`;
}

/** La table complète : clé « forme-taille-mode » (mode 0 = normal, 1 = Insane) -> texte à afficher. */
export function table() {
  const out = {};
  for (const shape of SHAPES) {
    for (const size of sizesOf(shape)) {
      for (const insane of [false, true]) out[`${shape}-${size}-${insane ? 1 : 0}`] = engineering(placementCount({ shape, size, insane }));
    }
  }
  return out;
}
