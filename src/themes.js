/*
 * T-7r4V3x — portage de GNOME Tetravex : registre de thèmes
 * Copyright (C) 2026 Drusus (Gens Claudia). Licence : GPL-2.0-or-later (voir LICENSE.txt).
 *
 * Un THÈME est une famille (« Épuré », « Aurora »…) qui propose des VARIANTES (« clair », « foncé »).
 * Chaque variante = des variables CSS posées sur la page. Aucune couleur n'est écrite en dur dans le code
 * de l'interface : tout passe par ces variables (principe repris de 1-5731N). Une variante peut hériter
 * d'une autre (`base: 'clair'` dans la même famille, ou `base: 'epure/clair'`).
 */

const TILE_LIGHT = ['#c0392b', '#2e8b57', '#c9a400', '#2f5fb3', '#d9731a', '#7d3c98', '#138d9c', '#c2185b', '#6b8e23', '#6d6d6d'];
const TILE_DARK = ['#e0584a', '#3fae74', '#b8960f', '#5b8aea', '#f0903a', '#a45fc4', '#2eb3c4', '#e0407f', '#8fb43a', '#9a9a9a'];

// « Gens Claudia » : pigments antiques (rouge pompéien, bleu égyptien, vert malachite, ocre, terre de Sienne,
// pourpre, turquoise, rose antique, olive, bronze), éclaircis pour le fond sombre.
const TILE_CLAUDIA_LIGHT = ['#a8322d', '#2c6fa0', '#3f7f5a', '#c79a2a', '#b5622f', '#6a2f6e', '#2b8f94', '#b04a6b', '#6b7b2a', '#7b6f5f'];
const TILE_CLAUDIA_DARK = ['#c4493f', '#4a8fc4', '#55a077', '#b88e1c', '#d27a45', '#8a4a90', '#40aab0', '#cc6385', '#8c9c3a', '#9a8d7a'];

// « Uji Minamoto » : couleurs traditionnelles japonaises (shu, ai, matsuba, yamabuki, daidai, ayame, asagi, sakura,
// moegi, sumi), éclaircies pour le fond sombre.
const TILE_MINAMOTO_LIGHT = ['#c8402a', '#2f5f9c', '#3a8456', '#c9972a', '#d9772c', '#7a4a8c', '#2b8f9a', '#c4607e', '#7a8f2a', '#6b6f78'];
const TILE_MINAMOTO_DARK = ['#e8603f', '#5a8ad0', '#55a875', '#c89a28', '#e88a3e', '#9a68b0', '#40aab5', '#d87a96', '#98ad3a', '#9a9ea8'];

const tileVars = (palette) => Object.fromEntries(palette.map((c, i) => [`--tile-${i}`, c]));

export const THEMES = {
  epure: {
    label: 'Épuré',
    variants: {
      clair: {
        label: 'Clair',
        vars: {
          '--bg': '#f5f6f8', '--fg': '#1d2330', '--muted': '#5f697b', '--acc': '#2860d6', '--theme-color': '#f5f6f8',
          '--btn-bg': '#ffffff', '--btn-fg': '#1d2330', '--btn-bd': '#d6dae2', '--btn-active': '#e7ebf4',
          '--btn-radius': '12px', '--btn-shadow': 'none',
          '--board-bg': '#dfe3ea', '--board-radius': '8px', '--board-gap': '3px',
          '--cell-bg': '#ffffff', '--cell-ok': '#e6f0ff', '--cell-radius': '3px',
          '--tile-radius': '3px', '--tile-shadow': '0 1px 3px rgba(20,32,60,.35)', '--tile-ink': '#ffffff',
          '--dialog-bg': '#ffffff', '--dialog-bd': '#d6dae2', '--dialog-veil': 'rgba(29,35,48,.38)',
          '--rule': '#e1e4ea', '--bg-image': 'none', '--bf': 'none', '--bw': '1px',
          '--ui-font': "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
          '--board-bd': 'transparent', '--cell-bd': 'transparent', '--tile-inner': 'transparent',
          '--h-variant': 'normal', '--h1-spacing': '.06em', '--h2-spacing': 'normal', '--h2-transform': 'none',
          ...tileVars(TILE_LIGHT),
        },
      },
      fonce: {
        label: 'Foncé',
        base: 'clair',
        vars: {
          '--bg': '#12161f', '--fg': '#e8ebf2', '--muted': '#8d96aa', '--acc': '#6d9bff', '--theme-color': '#12161f',
          '--btn-bg': '#1c2230', '--btn-fg': '#e8ebf2', '--btn-bd': '#2d3548', '--btn-active': '#27304a',
          '--board-bg': '#0b0e15', '--cell-bg': '#1a2030', '--cell-ok': '#1d2a4a',
          '--tile-shadow': '0 1px 3px rgba(0,0,0,.6)',
          '--dialog-bg': '#1c2230', '--dialog-bd': '#2d3548', '--dialog-veil': 'rgba(0,0,0,.55)', '--rule': '#2d3548',
          ...tileVars(TILE_DARK),
        },
      },
    },
  },
  aurora: {
    label: 'Aurora',
    variants: {
      clair: {
        label: 'Clair',
        base: 'epure/clair',
        vars: {
          '--bg': '#e8edfb', '--theme-color': '#e8edfb', '--fg': '#1b2142', '--muted': '#5d6791', '--acc': '#4659e0',
          '--bg-image': 'linear-gradient(135deg,#d6e4ff 0%,#ece3ff 48%,#ffe3ee 100%)',
          '--bf': 'blur(14px) saturate(1.4)',
          '--btn-bg': 'rgba(255,255,255,.55)', '--btn-bd': 'rgba(255,255,255,.9)', '--btn-active': 'rgba(255,255,255,.85)',
          '--btn-radius': '16px', '--btn-shadow': '0 4px 18px rgba(80,90,170,.14)',
          '--board-bg': 'rgba(255,255,255,.38)', '--board-radius': '10px', '--board-gap': '4px',
          '--cell-bg': 'rgba(255,255,255,.62)', '--cell-ok': 'rgba(120,140,255,.28)', '--cell-radius': '5px',
          '--tile-radius': '5px', '--tile-shadow': '0 3px 14px rgba(80,90,170,.3)',
          '--dialog-bg': 'rgba(255,255,255,.82)', '--dialog-bd': 'rgba(255,255,255,.95)', '--dialog-veil': 'rgba(60,70,130,.32)',
          '--rule': 'rgba(120,130,190,.28)',
        },
      },
      fonce: {
        label: 'Foncé',
        base: 'epure/fonce',
        vars: {
          '--bg': '#17142b', '--theme-color': '#17142b', '--fg': '#ece9ff', '--muted': '#9a94c4', '--acc': '#8f9cff',
          '--bg-image': 'linear-gradient(135deg,#1a1840 0%,#2a1a4a 50%,#3a1a38 100%)',
          '--bf': 'blur(14px) saturate(1.3)',
          '--btn-bg': 'rgba(255,255,255,.08)', '--btn-bd': 'rgba(255,255,255,.18)', '--btn-active': 'rgba(255,255,255,.18)',
          '--btn-radius': '16px', '--btn-shadow': '0 4px 18px rgba(0,0,0,.3)',
          '--board-bg': 'rgba(255,255,255,.06)', '--board-radius': '10px', '--board-gap': '4px',
          '--cell-bg': 'rgba(255,255,255,.1)', '--cell-ok': 'rgba(143,156,255,.3)', '--cell-radius': '5px',
          '--tile-radius': '5px', '--tile-shadow': '0 3px 14px rgba(0,0,0,.5)',
          '--dialog-bg': 'rgba(34,30,66,.88)', '--dialog-bd': 'rgba(255,255,255,.18)', '--dialog-veil': 'rgba(5,3,20,.6)',
          '--rule': 'rgba(255,255,255,.14)',
        },
      },
    },
  },
  /*
   * Gens Claudia — style de la tuile « Gens Claudia » du portail Inter Gentes : fonds dégradés brun-or,
   * filets bronze, Georgia, titres en majuscules espacées. « Parchemin » en est la version claire.
   */
  claudia: {
    label: 'Gens Claudia',
    variants: {
      clair: {
        label: 'Parchemin',
        base: 'epure/clair',
        vars: {
          '--bg': '#f3ead7', '--fg': '#2a1d14', '--muted': '#6e5f4b', '--acc': '#7a5a1c', '--theme-color': '#f3ead7',
          '--btn-bg': '#fbf5e6', '--btn-fg': '#2a1d14', '--btn-bd': '#c9b27c', '--btn-active': '#eadfc2',
          '--btn-radius': '3px',
          '--board-bg': '#e4d9c0', '--board-radius': '3px', '--board-gap': '3px', '--board-bd': '#8a7040',
          '--cell-bg': '#fbf5e6', '--cell-ok': '#f0e2b8', '--cell-radius': '1px', '--cell-bd': 'rgba(138,112,64,.45)',
          '--tile-radius': '1px', '--tile-shadow': '0 1px 2px rgba(42,29,20,.45)', '--tile-ink': '#fff9ec',
          '--tile-inner': 'rgba(255,249,236,.45)',
          '--dialog-bg': '#fbf5e6', '--dialog-bd': '#8a7040', '--dialog-veil': 'rgba(42,29,20,.45)', '--rule': '#d9c9a3',
          '--ui-font': "Georgia,'Times New Roman',serif",
          '--h-variant': 'normal', '--h1-spacing': '.12em', '--h2-spacing': '.12em', '--h2-transform': 'uppercase',
          ...tileVars(TILE_CLAUDIA_LIGHT),
        },
      },
      fonce: {
        label: 'Nuit de bronze',
        base: 'claudia/clair',
        vars: {
          '--bg': '#1e1810', '--bg-image': 'linear-gradient(160deg,#1e1810 0%,#2c2218 100%)',
          '--fg': '#e8d8a0', '--muted': '#b09868', '--acc': '#d8b45c', '--theme-color': '#1e1810',
          '--btn-bg': '#2c2010', '--btn-fg': '#e8d8a0', '--btn-bd': '#5c4a28', '--btn-active': '#3c2e18',
          '--board-bg': '#2c2010', '--board-bd': '#5c4a28',
          '--cell-bg': '#3c2e18', '--cell-ok': '#4f3d1e', '--cell-bd': 'rgba(138,112,64,.55)',
          '--tile-shadow': '0 1px 3px rgba(0,0,0,.7)', '--tile-inner': 'rgba(255,249,236,.35)',
          '--dialog-bg': '#2c2218', '--dialog-bd': '#5c4a28', '--dialog-veil': 'rgba(0,0,0,.6)', '--rule': '#5c4a28',
          ...tileVars(TILE_CLAUDIA_DARK),
        },
      },
    },
  },
  /*
   * Uji Minamoto — style de la tuile « Uji Minamoto » du portail Inter Gentes : bleu nuit et indigo, Georgia.
   * « Washi » (papier japonais) en est la version claire.
   */
  minamoto: {
    label: '源氏',
    variants: {
      clair: {
        label: 'Washi',
        base: 'epure/clair',
        vars: {
          '--bg': '#eef1f6', '--fg': '#0c1424', '--muted': '#4a5a78', '--acc': '#2a3a5c', '--theme-color': '#eef1f6',
          '--btn-bg': '#ffffff', '--btn-fg': '#0c1424', '--btn-bd': '#b8c4d8', '--btn-active': '#dde4f0',
          '--btn-radius': '6px',
          '--board-bg': '#d8e0ee', '--board-radius': '6px', '--board-gap': '3px', '--board-bd': '#2a3a5c',
          '--cell-bg': '#f7f9fc', '--cell-ok': '#d5e1f5', '--cell-radius': '2px', '--cell-bd': 'rgba(42,58,92,.3)',
          '--tile-radius': '2px', '--tile-shadow': '0 1px 3px rgba(12,20,36,.4)', '--tile-ink': '#ffffff',
          '--tile-inner': 'rgba(255,255,255,.4)',
          '--dialog-bg': '#ffffff', '--dialog-bd': '#2a3a5c', '--dialog-veil': 'rgba(12,20,36,.45)', '--rule': '#cdd6e6',
          '--ui-font': "Georgia,'Times New Roman',serif",
          '--h-variant': 'normal', '--h1-spacing': '.04em', '--h2-spacing': '.04em', '--h2-transform': 'none',
          ...tileVars(TILE_MINAMOTO_LIGHT),
        },
      },
      fonce: {
        label: 'Nuit indigo',
        base: 'minamoto/clair',
        vars: {
          '--bg': '#0d1018', '--bg-image': 'linear-gradient(160deg,#0d1018 0%,#141824 100%)',
          '--fg': '#b8d0f0', '--muted': '#6a8ab8', '--acc': '#6f9ad8', '--theme-color': '#0d1018',
          '--btn-bg': '#14203a', '--btn-fg': '#b8d0f0', '--btn-bd': '#2a3a5c', '--btn-active': '#1c2c52',
          '--board-bg': '#14203a', '--board-bd': '#2a3a5c',
          '--cell-bg': '#0f1730', '--cell-ok': '#1c2c52', '--cell-bd': 'rgba(74,106,154,.5)',
          '--tile-shadow': '0 1px 3px rgba(0,0,0,.7)', '--tile-inner': 'rgba(255,255,255,.3)',
          '--dialog-bg': '#141824', '--dialog-bd': '#2a3a5c', '--dialog-veil': 'rgba(0,0,0,.6)', '--rule': '#2a3a5c',
          ...tileVars(TILE_MINAMOTO_DARK),
        },
      },
    },
  },
};

export const DEFAULT_FAMILY = 'epure';
export const MODES = ['auto', 'clair', 'fonce'];

/** Variables CSS d'une variante, héritage `base` résolu (protégé contre les boucles). */
export function resolve(family, variant, seen = new Set()) {
  const fam = THEMES[family];
  const v = fam?.variants?.[variant];
  if (!v) return {};
  const key = `${family}/${variant}`;
  if (seen.has(key)) return { ...v.vars };
  seen.add(key);
  let base = {};
  if (v.base) {
    const [bf, bv] = v.base.includes('/') ? v.base.split('/') : [family, v.base];
    base = resolve(bf, bv, seen);
  }
  return { ...base, ...v.vars };
}

/** Choix valides à partir d'un choix éventuellement corrompu (stockage local). */
export function normalize({ family, mode } = {}) {
  return {
    family: THEMES[family] ? family : DEFAULT_FAMILY,
    mode: MODES.includes(mode) ? mode : 'auto',
  };
}

/** Variante (clair/foncé) effective pour un mode donné et la préférence du système. */
export function pickVariant(mode, prefersDark) {
  if (mode === 'clair' || mode === 'fonce') return mode;
  return prefersDark ? 'fonce' : 'clair';
}

/** Pose les variables sur l'élément racine et met à jour la couleur de la barre du navigateur. */
export function apply(choice, prefersDark, root = document.documentElement, doc = document) {
  const { family, mode } = normalize(choice);
  const variant = pickVariant(mode, prefersDark);
  const vars = resolve(family, variant);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.theme = `${family}-${variant}`;
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta && vars['--theme-color']) meta.setAttribute('content', vars['--theme-color']);
  return { family, variant };
}
