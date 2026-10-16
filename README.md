# T-7r4V3x

**T-7r4V3x** (« Tetravex » en l33t) est un portage en JavaScript de **GNOME Tetravex** sous forme d'application web progressive (PWA), jouable sur mobile et sur PC.

> Portage conçu, écrit et testé par **Drusus**, agent de la Gens Claudia, sous la supervision de l'Auctor. Voir « Crédits » plus bas.

## Origine et licence

T-7r4V3x est un portage de [GNOME Tetravex](https://gitlab.gnome.org/GNOME/gnome-tetravex) (Copyright © Robert Ancell 2010–2013, Arnaud Bonatti 2019, Tetravex Contributors 1998–2025), publié sous **GNU General Public License, version 2 ou ultérieure**.
Le portage est distribué sous la même licence : voir `LICENSE`. Détail de l'origine : `NOTICE.md`.

## Crédits

**Drusus est l'auteur de ce portage.** Drusus est un *Legatus* de la Gens Claudia, c'est-à-dire un agent d'intelligence artificielle qui travaille sur sa propre machine et avec sa propre mémoire, pour un opérateur humain. Le portage est son travail, de bout en bout :

- la reprise des règles de GNOME Tetravex et la logique du jeu (`src/puzzle.js`) ;
- les deux formes de plateau ajoutées au jeu d'origine, hexagonale et carré tronqué (`src/geopuzzle.js`, `src/geoview.js`), et le mode Insane, où les tuiles tournent ;
- l'interface, les gestes tactiles, souris et clavier, l'accessibilité, les quatre familles de thèmes, claires et foncées (dont Gens Claudia et 源氏 Uji Minamoto) ;
- l'application web installable et son fonctionnement hors ligne (`sw.js`, manifeste) ;
- les 20 langues de l'interface ;
- les codes de puzzle, le puzzle du jour et les statistiques (`src/code.js`, `src/stats.js`) ;
- les 152 tests unitaires et le banc d'essai de bout en bout dans Chrome (`tools/e2e-chrome.mjs`).

Autres contributions :

- **L'Auctor** a supervisé le projet.
- **Claudius**, Primus inter Pares de la Gens Claudia, a relu l'ensemble du code. Il a aussi publié ce dépôt sur GitHub.
- **Les auteurs de GNOME Tetravex**, dont le jeu est à l'origine de ce portage : Robert Ancell (2010–2013), Arnaud Bonatti (2019) et les Tetravex Contributors (1998–2025). Voir `NOTICE.md`.

Les traductions ont été écrites par Drusus. Aucune n'a encore été relue par une personne dont c'est la langue, en particulier l'arabe, l'hindi et le latin : les corrections sont bienvenues.

## But du jeu original 

Réordonner les tuiles dans un carré pour que les nombres des côtés en contact soient égaux.

## Modes de jeu

- **Carré** : le plateau classique de GNOME Tetravex, de 2×2 à 6×6.
- **Hexagonal** : tuiles hexagonales à 6 nombres, 4×3, 6×4 ou 7×5 (colonnes × lignes), la deuxième colonne décalée d'une demi-hauteur vers le bas.
- **Carré tronqué** : octogones (8 nombres) et petits carrés (4 nombres), 3×3, 4×4 ou 5×5 octogones ; chaque sorte de tuile ne va que sur sa sorte de case.
- **Insane** (avec n'importe quelle forme) : les tuiles peuvent tourner. Double toucher une tuile pour passer en mode rotation
  (repère ↻), puis la balayer en cercle autour de son centre (souris : clic maintenu) ; au clavier, R et Maj+R. Dans la zone de
  jeu, une rotation qui désemboîte la tuile est refusée. Une partie Insane est sauvegardée à part de la partie normale, avec ses
  propres meilleurs temps.

## Codes de puzzle, puzzle du jour, statistiques

- **Code de puzzle** (idée de 1-5731N) : chaque partie a un code `012G-7K3F-9A2H`, affiché sous la barre du haut (le toucher le copie)
  et rappelé à la victoire. Il contient la forme, la taille, le nombre de valeurs, le mode Insane et une graine ; le saisir
  (Nouvelle partie › Jouer avec un code) rejoue exactement le même plateau. Une somme de contrôle détecte les fautes de frappe.
  Le détail du format et la règle « un code ne change jamais de puzzle » sont dans `src/code.js` ; `test/code.test.js` fige
  des puzzles de référence.
- **Puzzle du jour** : dérivé de la date locale et de la configuration choisie (forme, taille, valeurs, mode), donc identique pour
  tous ceux qui jouent la même configuration le même jour ; il change à minuit.
- **Statistiques** (remplacent les « meilleurs temps ») : parties gagnées et commencées, meilleur temps, moyenne, par forme puis
  par taille et mode, dernières parties avec leur code. Les anciens meilleurs temps sont repris une fois au premier lancement.

## État

Version 1.0.0 : logique du jeu testée, interface en écrans avec thèmes et 20 langues, PWA installable et utilisable hors ligne, trois formes de plateau, mode Insane, codes de puzzle, puzzle du jour et statistiques.
Voir `docs/PLAN.md` et `CHANGELOG.md`.

## Développer

Aucune étape de construction n'est requise : les modules sont des modules ES natifs.

```
npm test            # tests unitaires (node --test), sans navigateur
npm run e2e         # banc d'essai de bout en bout dans Chrome (voir ci-dessous)
```

`npm run e2e` (`tools/e2e-chrome.mjs`) pilote un Chrome sans interface par DevTools : il sert le dépôt sur un port libre,
joue les gestes réels (glisser, double toucher, balayage circulaire, deuxième doigt), le clavier, le chronomètre, les
sauvegardes et les classements, dans les trois formes et les deux modes. Il demande Chrome (variable d'environnement
`CHROME` si l'exécutable n'est pas à un emplacement usuel), ne modifie aucun fichier du dépôt, et accepte
`--shots dossier` pour enregistrer des captures d'écran. Il n'est pas déployé (hors de `FILES` du service worker).
