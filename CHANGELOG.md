# Changelog — T-7r4V3x

Format : une entrée par version, la plus récente en premier. La première entrée doit correspondre à
`src/version.js` et `package.json` (test `test/version.test.js`).

## [1.0.1] - 2026-10-17

Correction. Le lien « Licence » de l'écran « À propos » téléchargeait le fichier au lieu de l'afficher : un fichier sans extension
est servi en `application/octet-stream` (constaté sur GitHub Pages après la publication de la 1.0.0). Le fichier de licence est
maintenant `LICENSE.txt`, servi en `text/plain` ; GitHub le reconnaît toujours comme la licence du dépôt. Les références
(lien, liste du service worker, README, NOTICE, en-têtes des fichiers) sont mises à jour. Aucun autre changement de comportement.

## [1.0.0] - 2026-10-16

Première version publiée. Le projet a vécu en `0.y.z` pendant son développement (historique ci-dessous) ; cette version ne
change aucun comportement par rapport à la 0.10.0.

### Contenu
- GNOME Tetravex en application web progressive : jouable sur mobile et sur PC, installable, utilisable hors ligne.
- Trois formes de plateau (carré de 2×2 à 6×6, hexagonal, carré tronqué) et un mode **Insane** où les tuiles tournent.
- **Codes de puzzle** rejouables, **puzzle du jour**, **statistiques** par forme, taille et mode.
- Quatre familles de thèmes (clair, foncé, automatique), 20 langues, clavier et lecteurs d'écran.
- Tests unitaires (`npm test`) et banc d'essai de bout en bout dans Chrome (`npm run e2e`) ; intégration continue GitHub.
- Licence GNU GPL version 2 ou ultérieure, comme GNOME Tetravex dont il est le portage.

## [0.10.0] - 2026-10-16

### Ajouté
- **Codes de puzzle** : chaque partie a un code `012G-7K3F-9A2H` (version du générateur, configuration, graine, somme de
  contrôle) qui la détermine entièrement. Affiché sous la barre du haut (le toucher le copie) et rappelé à la victoire. Le
  saisir rejoue exactement le même plateau, avec sa propre configuration (forme, taille, valeurs, mode Insane), quels que
  soient les réglages ; une faute de frappe est détectée au lieu de lancer un autre puzzle. Module `src/code.js` (générateur à
  graine, format, puzzle du jour), les sauvegardes conservent le code.
- **« Nouvelle partie »** ouvre un choix : partie aléatoire, **puzzle du jour**, ou **saisie d'un code**. Une partie en cours
  dans le mode concerné demande confirmation avant d'être abandonnée.
- **Puzzle du jour** : dérivé de la date locale et de la configuration choisie ; identique pour tous ceux qui jouent la même
  configuration le même jour ; marqué ✓ avec le temps quand il est terminé.
- Aide complétée (codes, puzzle du jour, statistiques) ; 31 textes en plus dans les 20 langues.
- `tools/e2e-chrome.mjs` : contrôles des codes, du puzzle du jour, de l'abandon et des statistiques (86 contrôles).

### Modifié
- **Les « meilleurs temps » deviennent des statistiques** : parties gagnées et commencées, meilleur temps et moyenne, par
  forme puis par taille / valeurs / mode, dix dernières parties avec leur code. Chaque partie gagnée est conservée (2000
  dernières) ; les anciens meilleurs temps (`tx.scores`, plateaux hexagonaux d'avant 0.8.1 exceptés) sont repris une fois dans
  `tx.stats`. L'écran passe de `#scores` à `#stats`.
- Le rang « Classement n° k » à la victoire se calcule toujours dans la configuration jouée (cinq meilleurs temps).

### Algorithme figé
- La génération de plateau est désormais la **version 1** des codes : ne plus modifier l'ordre des tirages de `Puzzle`,
  `GeoPuzzle`, `_scrambleRotations` ou `hexDims` sans créer la version 2 (voir `src/code.js` et les puzzles de référence de
  `test/code.test.js`).

## [0.9.4] - 2026-10-16

Corrections issues de l'audit de code de Claudius (Gens Claudia) ; chaque défaut a été reproduit dans Chrome avant
correction (17 contrôles en échec sur l'ancien code, tous passés ensuite).

### Corrigé
- **Victoire en mode Insane** : elle effaçait la sauvegarde de la partie *normale* et laissait celle de la partie Insane
  (qui ramenait à un coup de la victoire, et permettait de remplir le classement avec le même temps). On efface maintenant
  la sauvegarde du mode joué.
- **Deuxième doigt pendant un glisser** : une tuile « fantôme » restait collée à l'écran. Un seul pointeur est actif à la
  fois pendant un glisser, et la perte de capture annule le geste.
- **Double toucher après une sélection** : le premier toucher n'arme plus le mode rotation quand il dépose la tuile
  sélectionnée.
- **Lecteurs d'écran** : le nom de chaque case annonce désormais les nombres de la tuile, la sélection (`aria-selected`) et
  le mode rotation ; la tuile elle-même est masquée aux lecteurs d'écran.
- **Rotation refusée** : la case secoue enfin (le rafraîchissement annulait l'animation).
- Plusieurs chronomètres cumulés après « Nouvelle partie » depuis le menu.
- Tuile reposée sur sa propre case : n'est plus annoncée comme refusée.
- Clavier : R / Maj+R saute au premier cran qui s'emboîte (le geste pouvait déjà atteindre ces orientations) ; Échap quitte
  le mode rotation, Entrée / Espace aussi.
- « Continuer » ne s'affiche plus pour une sauvegarde impossible à reprendre (ancienne version) ; elle est purgée.
- Date d'un temps : date locale (une partie gagnée à 0 h 30 n'est plus datée de la veille).
- Textes : « le carré est complet » / « dans le carré » remplacés par des formulations valables pour toutes les formes
  (20 langues). Latin relu par Claudius (7 corrections).
- Les anciens temps hexagonaux 3×3, 4×4, 5×5 (plateaux qui n'existent plus) ne sont plus affichés (ils restent stockés).

### Ajouté
- `tools/e2e-chrome.mjs` (`npm run e2e`) : banc d'essai de bout en bout dans Chrome sans interface, 62 contrôles (dont un par
  constat de l'audit). Outil de développement, non déployé ; `npm test` reste sans navigateur.

### Modifié
- Le menu suspend le chronomètre (il cache le plateau) ; il reprend à la fermeture, Échap compris.
- Mise à jour du service worker : la page est rechargée une fois le nouveau service worker actif, jamais en pleine partie
  (au retour hors de l'écran de jeu), pour ne pas mélanger deux versions.

## [0.9.3] - 2026-10-16

### Corrigé
- Pied de page de l'accueil : la deuxième ligne « Inspiré de GNOME Tetravex » (avec son lien) est rétablie, et la date de la
  première ligne s'affiche en AAAA-MM-JJ.

## [0.9.2] - 2026-10-16

### Modifié
- Accueil : un sélecteur « Mode normal / Mode Insane » en tête remplace les boutons doublés ; « Nouvelle partie » et
  « Continuer » (ex « Continuer la partie ») s'appliquent au mode choisi, qui est mémorisé. « Continuer » n'apparaît que s'il
  y a une partie en cours dans ce mode.
- Pied de page : « vX.Y.Z - développé par Drusus - AA-MM-JJ - GPL2+ » (le crédit à GNOME Tetravex reste dans « À propos »).

## [0.9.1] - 2026-10-16

### Corrigé
- Hexagonal et carré tronqué : une tuile lâchée sur une case qui la refuse disparaissait de l'écran jusqu'au prochain
  rafraîchissement ; elle revient maintenant à sa place et la case secoue.
- Thèmes à fond flou (Aurora) : une tuile glissée de la zone de jeu vers la réserve passait derrière la réserve ; la tuile
  en vol est désormais sortie des plateaux pour toutes les formes et reste au-dessus.

## [0.9.0] - 2026-10-16

### Ajouté
- **Mode Insane** : les tuiles peuvent tourner, avec les trois formes de plateau. Un cran de rotation vaut 90° (carré, petit
  carré), 60° (hexagone) ou 45° (octogone). La réserve est mélangée avec des rotations au hasard ; la partie reste toujours
  résoluble.
  - **Double toucher** sur une tuile : mode rotation (repère ↻) ; double toucher de nouveau pour en sortir.
  - **Balayage** : en cercle autour du centre de la tuile, ou de gauche à droite si le geste commence près du centre ; à la
    souris, clic maintenu. La tuile s'arrête sur le cran le plus proche au relâchement.
  - **Clavier** : R tourne la tuile de la case active dans le sens horaire, Maj+R dans l'autre sens.
  - Dans la zone de jeu, une rotation qui désemboîte la tuile est refusée (la case secoue), comme un échange.
  - Annuler / rétablir couvrent les rotations.
- **Parties séparées** : accueil avec « Nouvelle partie · Insane » et « Continuer la partie · Insane » ; la partie Insane est
  sauvegardée à part (`tx.save.insane`) et la partie normale reste jouable sans finir l'autre. Le badge INSANE s'affiche en partie.
- Meilleurs temps Insane dans des classements à part (clés `insane:…`), après les classements normaux.
- Aide et 20 langues complétées (6 nouveaux textes).

## [0.8.1] - 2026-10-16

### Modifié
- Mode hexagonal : plateaux de 4×3, 6×4 et 7×5 hexagones (colonnes × lignes) au lieu de 3×3, 4×4 et 5×5 — les colonnes
  décalées rendent le plateau plus haut que large, les colonnes en plus le ramènent à peu près au carré.
- Meilleurs temps du mode hexagonal : nouvelles clés (`hex:4x3/6`, etc.) ; les anciens temps 3×3, 4×4 et 5×5 restent
  affichés tels quels. Une partie hexagonale sauvegardée avec l'ancienne taille est remplacée par une nouvelle partie.

## [0.8.0] - 2026-10-16

### Ajouté
- Deux modes de jeu en plus du plateau carré, choisis dans Options › « Forme du plateau » :
  - **Hexagonal** : tuiles hexagonales à 6 nombres, colonnes de 3, 4 ou 5 hexagones, la deuxième colonne décalée d'une
    demi-hauteur vers le bas, la troisième comme la première.
  - **Carré tronqué** : octogones (8 nombres) et petits carrés (4 nombres) dans les creux, en 3×3, 4×4 ou 5×5 octogones,
    alignements horizontaux et verticaux respectés ; un octogone ne se place que sur un octogone, un petit carré que sur un
    petit carré.
- `src/geopuzzle.js` (topologies, génération toujours résoluble, échanges, annulation, sauvegarde) et `src/geoview.js`
  (formes, positions, dégradés) ; leurs tests, dont la cohérence entre la topologie et la géométrie d'affichage.
- Meilleurs temps séparés par forme ; aide et 20 langues complétées (8 nouveaux textes).
- Le plateau carré ne change pas (mêmes règles, mêmes sauvegardes, mêmes scores).

## [0.7.2] - 2026-10-16

### Modifié
- Le thème « Uji Minamoto » s'affiche uniquement en idéogrammes : « 源氏 » (la graphie occidentale est retirée).

## [0.7.1] - 2026-10-16

### Modifié
- Le thème « Uji Minamoto » s'affiche avec son nom japonais : « 源氏 Uji Minamoto ».

## [0.7.0] - 2026-10-16

### Ajouté
- Thème « Uji Minamoto » (quatrième famille), d'après la tuile du portail Inter Gentes : « Nuit indigo » (foncé, fond
  dégradé bleu nuit, filets indigo) et « Washi » (clair, papier japonais) ; tuiles aux couleurs traditionnelles
  (shu, ai, matsuba, yamabuki, daidai, ayame, asagi, sakura, moegi, sumi).
- Variable de thème `--h2-transform` (casse des titres de section).

### Modifié
- Thème « Gens Claudia » refondu sur le style de la tuile du portail : fond dégradé brun-or, filets bronze, texte or
  pâle, Georgia, titres de section en majuscules espacées ; variantes « Parchemin » (accent bronze) et « Nuit de bronze ».
- Sélecteur de thème en grille de deux colonnes (quatre familles).

## [0.6.0] - 2026-10-16

### Ajouté
- Thème « Gens Claudia » (troisième famille) : variantes « Parchemin » (clair) et « Nuit de marbre » (foncé) ; pigments
  antiques pour les tuiles, coins presque droits (tesselles), filets dorés autour des plateaux et des cases, liseré
  intérieur des tuiles, titres en petites capitales espacées, police à empattements du système.
- Nouvelles variables de thème (`--board-bd`, `--cell-bd`, `--tile-inner`, `--h-variant`, `--h1-spacing`, `--h2-spacing`),
  définies pour tous les thèmes.
- Test de lisibilité : rapports de contraste minimaux (WCAG) vérifiés pour chaque variante de chaque thème.

### Corrigé
- Contrastes trop faibles relevés par ce test dans les thèmes existants : texte secondaire et accent d'« Épuré clair »,
  accent d'« Aurora clair », jaune des tuiles des thèmes foncés (chiffres illisibles) ; mêmes ajustements pour
  « Gens Claudia ».

## [0.5.0] - 2026-10-16

### Ajouté
- 20 langues, les mêmes que 1-5731N : français, anglais, espagnol, allemand, italien, portugais (Portugal et Brésil),
  russe, arabe, chinois, coréen, japonais, hindi, turc, néerlandais, polonais, ukrainien, indonésien, vietnamien, latin.
  Sélecteur dans les options (« automatique » suit la langue de l'appareil), chargement à la demande, sens de lecture
  de droite à gauche pour l'arabe, hors ligne comme le reste.
- `test/lang.test.js` : mêmes clés et mêmes {marques} dans chaque langue, pas de balisage, registre cohérent avec les fichiers.

### Modifié
- Les textes ne contiennent plus de HTML : les liens sont fabriqués par le code (`tHtml`) et insérés à la place des {marques}.
- Un texte absent d'une traduction retombe sur le français.

### À relire
- Les traductions sont de premier jet : une relecture par des locuteurs natifs reste souhaitable, en particulier pour
  l'arabe, le hindi, le latin et les termes techniques (« tuile », « réserve »).

## [0.4.1] - 2026-10-15

### Modifié
- Page « À propos » : la mention du portage est réduite à « Portage : Drusus. ».

## [0.4.0] - 2026-10-15

### Ajouté
- Meilleurs temps : cinq meilleurs temps par configuration (taille × nombre de valeurs), écran dédié, effacement avec
  confirmation ; la fenêtre de fin indique le record ou le rang obtenu (`src/scores.js`, `test/scores.test.js`).
- Accessibilité : grilles avec rangées ARIA et libellé de chaque case (zone, colonne, ligne, vide ou non),
  annonce vocale d'un placement refusé, animation remplacée par un contour si l'on réduit les animations.

## [0.3.0] - 2026-10-15

### Ajouté
- PWA : manifeste, service worker (hors ligne, cache nommé d'après la version), icônes 180/192/512 et icône masquable,
  générées par `tools/make-icons.mjs`.
- Bouton « Installer l'application » sur l'accueil quand le navigateur le propose ; aide pour Android et iPhone.
- `test/pwa.test.js` : cohérence version / cache, liste des fichiers mis en cache, manifeste, icônes.

## [0.2.3] - 2026-10-15

### Modifié
- Le compteur « 3/9 » passe à droite, à côté des boutons annuler / rétablir.
- La consigne en bas de l'écran de partie est supprimée (elle est dans l'aide) : plus de place pour les plateaux.
- Coins beaucoup moins arrondis (3 à 5 px) pour les tuiles, les cases et les plateaux, dans tous les thèmes.

## [0.2.2] - 2026-10-15

### Modifié
- Le compteur de tuiles en place s'affiche sous la forme « 3/9 » dans la barre de titre ; la ligne d'état est supprimée,
  ce qui rend de la hauteur aux plateaux.

## [0.2.1] - 2026-10-15

### Modifié
- Écran de partie : bouton « menu » à icône (burger) qui ouvre un menu (reprendre, nouvelle partie, aide, options,
  accueil) ; boutons annuler / rétablir à icône.
- Les deux plateaux sont agrandis : la taille des cases est calculée sur la place réellement disponible, en choisissant
  la disposition (côte à côte ou l'un sur l'autre) qui donne les plus grandes cases.
- La consigne est en bas de page.

## [0.2.0] - 2026-10-15

### Ajouté
- Structure en écrans à la manière de 1-5731N : accueil, partie, aide, options, à propos (navigation par `#hash`,
  bouton « retour » du navigateur pris en charge).
- Thèmes par variables CSS (`src/themes.js`) : familles « Épuré » et « Aurora », variantes clair/foncé, mode automatique
  selon le système.
- Options (taille, valeurs, thème, apparence) mémorisées dans le stockage local.
- Sauvegarde automatique de la partie, bouton « Continuer », chronomètre, fenêtre de fin de partie.
- Logo : carré 2×2 résolu, aux couleurs du thème.
- Textes centralisés (`src/strings.js`), prêts pour d'autres langues.
- Sérialisation de `Puzzle` (`toJSON` / `fromJSON`), avec validation.

### Modifié
- Politique de contenu (CSP) dans la page ; feuille de style entièrement pilotée par les variables du thème.

## [0.1.0] - 2026-10-15

### Ajouté
- Logique du jeu (`src/puzzle.js`) et 10 tests ; premier écran de jeu (DOM/CSS, Pointer Events, clavier).
