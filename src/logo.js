/*
 * T-7r4V3x — logo : un carré de 2×2 tuiles déjà résolu (les bords en contact sont égaux), dessiné en SVG
 * avec les couleurs du thème courant (variables --tile-N). Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */

// [nord, est, sud, ouest] ; A=haut-gauche, B=haut-droite, C=bas-gauche, D=bas-droite.
export const LOGO_TILES = [
  { x: 4, y: 4, v: [1, 2, 3, 0] },
  { x: 52, y: 4, v: [4, 5, 6, 2] },
  { x: 4, y: 52, v: [3, 7, 8, 9] },
  { x: 52, y: 52, v: [6, 1, 0, 7] },
];

const SIZE = 44;

/** Marque SVG (chaîne) ; couleurs via var(--tile-N) pour suivre le thème. */
export function logoSvg() {
  const parts = [];
  for (const { x, y, v } of LOGO_TILES) {
    const [n, e, s, w] = v;
    const c = (i) => `var(--tile-${i})`;
    const h = SIZE / 2;
    const cx = x + h;
    const cy = y + h;
    const tri = (pts, fill) => `<polygon points="${pts}" fill="${fill}"/>`;
    parts.push(
      tri(`${x},${y} ${x + SIZE},${y} ${cx},${cy}`, c(n)),
      tri(`${x + SIZE},${y} ${x + SIZE},${y + SIZE} ${cx},${cy}`, c(e)),
      tri(`${x},${y + SIZE} ${x + SIZE},${y + SIZE} ${cx},${cy}`, c(s)),
      tri(`${x},${y} ${x},${y + SIZE} ${cx},${cy}`, c(w)),
      `<rect x="${x}" y="${y}" width="${SIZE}" height="${SIZE}" rx="5" fill="none" stroke="var(--bg)" stroke-width="2"/>`,
    );
  }
  return `<svg viewBox="0 0 100 100" role="img" aria-label="T-7r4V3x" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}
