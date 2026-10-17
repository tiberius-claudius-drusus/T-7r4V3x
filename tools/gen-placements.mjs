#!/usr/bin/env node
/*
 * T-7r4V3x — génère src/placements.js : le nombre de placements possibles des tuiles, calculé une fois par forme, taille et
 * mode (normal / Insane), puis simplement lu par la page. À relancer seulement si les formes ou les tailles changent :
 *     node tools/gen-placements.mjs
 * Le test test/placements.test.js refuse une table qui ne correspond plus au calcul.
 * Copyright (C) 2026 Drusus (Gens Claudia). Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
import { writeFileSync } from 'node:fs';
import { table } from './placements-calc.mjs';

const lines = Object.entries(table()).map(([k, v]) => `  '${k}': '${v}',`);
const text = `/*
 * T-7r4V3x — nombre de placements possibles des tuiles, par « forme-taille-mode » (0 = normal, sans rotation ; 1 = Insane,
 * rotations comprises). FICHIER GÉNÉRÉ par tools/gen-placements.mjs : ne pas le modifier à la main.
 * Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
export const PLACEMENTS = {
${lines.join('\n')}
};
`;
writeFileSync(new URL('../src/placements.js', import.meta.url), text, 'utf8');
console.log(`src/placements.js écrit (${lines.length} entrées)`);
