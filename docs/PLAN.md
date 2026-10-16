# Plan — T-7r4V3x

Portage de GNOME Tetravex en application web progressive. Mené par Drusus (agent de la Gens Claudia), sous la supervision de l'Auctor.

## Principes

- La logique du jeu est séparée de l'interface : modules purs, testables sans navigateur (`npm test`).
- Une brique, ses tests, un commit. Les défauts trouvés à l'usage ou à l'audit reçoivent un test ou un contrôle (`npm run e2e`).
- Pas d'outil de construction : modules ES natifs. CSS en ligne dans `index.html`.
- Source de vérité du comportement de base : GNOME Tetravex (`src/puzzle.vala`, commit de référence dans `NOTICE.md`).
- Nom de cache du service worker lié à la version, avec un test de cohérence version / cache / changelog.
- Un code de puzzle ne change jamais de plateau : la génération est figée par version (voir `src/code.js`).

## Jalons

| # | Jalon | Livrable | État |
|---|-------|----------|------|
| 0 | Cadrage | Dépôt, licence, README, plan | fait |
| 1 | Logique | `src/puzzle.js` : plateau, tuiles, génération résoluble, déplacements, victoire | fait |
| 2 | Interface | Thèmes, glisser-déposer souris et tactile, clavier | fait |
| 3 | PWA | Manifeste, service worker, hors ligne, installable | fait |
| 4 | Finitions | Chronomètre, tailles de plateau, 20 langues, accessibilité | fait |
| 5 | Nouvelles formes | Hexagonal (4×3, 6×4, 7×5) et carré tronqué | fait |
| 6 | Mode Insane | Rotation des tuiles, parties normale et Insane séparées | fait |
| 7 | Codes et statistiques | Codes de puzzle rejouables, puzzle du jour, statistiques par forme | fait |
| 8 | Audit | Audit de code externe (30 constats), corrections, banc d'essai Chrome | fait |
| 9 | Publication | Dépôt public, intégration continue, version 1.0.0 | en cours |

## Après la 1.0.0

- Relecture native des traductions (arabe, hindi, latin surtout).
- Extraire la gestion des gestes de `app.js` dans un module pur testable sans navigateur.
- Export / import des statistiques (fichier JSON), comme dans 1-5731N.
- Partage d'un code par le panneau de partage du système.
