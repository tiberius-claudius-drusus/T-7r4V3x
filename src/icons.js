/*
 * T-7r4V3x — pictogrammes des boutons (SVG en ligne, trait = couleur du texte du bouton).
 * Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
const wrap = (body) =>
  `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export const ICONS = {
  menu: wrap('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  undo: wrap('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  redo: wrap('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
  close: wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
};
