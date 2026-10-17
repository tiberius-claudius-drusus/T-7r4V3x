/*
 * T-7r4V3x — textes de l'interface. Le français (ci-dessous) est la langue de référence et le repli ; les autres
 * langues sont des modules `src/lang/<code>.js` de même forme, chargés à la demande (voir src/lang/index.js).
 * Aucun balisage HTML dans les textes : les liens sont fabriqués par le code et insérés à la place des {marques}.
 * Licence : GPL-2.0-or-later (voir LICENSE.txt).
 */
export const FR = {
  'home.sub': 'GNOME Tetravex, en poche',
  'home.new': 'Nouvelle partie',
  'home.continue': 'Continuer',
  'home.mode.normal': 'Mode normal',
  'home.install': 'Installer l\'application',
  'home.stats': 'Statistiques',
  'home.help': 'Aide',
  'home.options': 'Options',
  'home.about': 'À propos',
  'foot.line': 'v{version} - développé par Drusus - {date} - GPL2+',
  'foot.inspired': 'Inspiré de {link}',
  'common.back': 'Retour',
  'common.cancel': 'Annuler',
  'stats.title': 'Statistiques',
  'stats.none': 'Aucune partie gagnée pour l\'instant : terminez une partie !',
  'stats.reset': 'Effacer les statistiques',
  'stats.confirm': 'Effacer toutes les statistiques ?',
  'stats.yes': 'Effacer',
  'game.menu': 'Menu',
  'game.undo': 'Annuler',
  'game.redo': 'Rétablir',
  'game.placed': '{n} sur {total} en place',
  'game.won': 'Bravo, toutes les tuiles sont en place !',
  'game.wonIn': 'Terminé en {time}',
  'game.record': 'Nouveau record !',
  'game.rank': 'Classement : n° {rank}',
  'game.again': 'Rejouer',
  'game.refused': 'Cette tuile ne s\'emboîte pas ici.',
  'game.zone': 'Zone de jeu',
  'game.tray': 'Réserve de tuiles',
  'game.cell': '{zone}, colonne {c}, ligne {r}',
  'game.empty': 'vide',
  'game.tile': 'Tuile : haut {n}, droite {e}, bas {s}, gauche {w}',
  'game.time': 'Temps',
  'menu.title': 'Menu',
  'menu.resume': 'Reprendre',
  'menu.new': 'Nouvelle partie',
  'menu.help': 'Aide',
  'menu.options': 'Options',
  'menu.home': 'Accueil',
  'help.title': 'Aide',
  'help.goal.h': 'But du jeu',
  'help.goal.p': 'Placez toutes les tuiles dans la zone de jeu de façon que les nombres des côtés en contact soient égaux.',
  'help.play.h': 'Comment jouer',
  'help.play.1': 'Faites glisser une tuile de la réserve vers une case de la zone de jeu.',
  'help.play.2': 'Une tuile qui ne s\'emboîte pas avec ses voisines est refusée : la case secoue.',
  'help.play.3': 'Vous pouvez aussi toucher une tuile pour la sélectionner, puis toucher la case voulue.',
  'help.play.4': 'Au clavier : flèches pour changer de case, Entrée ou Espace pour prendre et poser, Échap pour annuler la sélection.',
  'help.tip.h': 'Conseils',
  'help.tip.1': 'Commencez par les tuiles dont les nombres sont les plus rares : elles n\'ont qu\'une place possible.',
  'help.tip.2': 'Moins de valeurs différentes (Options) rend la partie plus longue : beaucoup de tuiles s\'emboîtent partout.',
  'help.install.h': 'Installer et jouer hors ligne',
  'help.install.1': 'Android (Chrome) : bouton « Installer l\'application » de l\'accueil, ou menu du navigateur › Installer l\'application.',
  'help.install.2': 'iPhone (Safari) : bouton Partager › Sur l\'écran d\'accueil.',
  'help.install.3': 'Une fois la page chargée, le jeu fonctionne sans connexion ; les parties en cours sont conservées sur l\'appareil.',
  'opt.title': 'Options',
  'opt.size': 'Taille du plateau',
  'opt.colors': 'Valeurs différentes',
  'opt.family': 'Thème',
  'opt.mode': 'Apparence',
  'opt.mode.auto': 'Automatique',
  'opt.mode.clair': 'Clair',
  'opt.mode.fonce': 'Foncé',
  'opt.lang': 'Langue',
  'opt.lang.auto': 'Automatique (selon l\'appareil)',
  'opt.note': 'Les changements de taille et de valeurs s\'appliquent à la prochaine nouvelle partie.',
  'about.title': 'À propos',
  'about.what': 'T-7r4V3x est un portage en JavaScript, sous forme d\'application web, du jeu GNOME Tetravex.',
  'about.origin': 'Jeu d\'origine : {link} — © Robert Ancell 2010–2013, Arnaud Bonatti 2019, Tetravex Contributors 1998–2025.',
  'about.port': 'Portage : Drusus.',
  'about.licence': 'Licence : {link}. Ce programme est un logiciel libre ; vous pouvez le redistribuer et le modifier. Il est distribué sans aucune garantie.',
  'about.licence.link': 'GNU General Public License, version 2 ou ultérieure',
  'about.source': 'Code source : les fichiers de cette page ({files}…) sont les sources complètes.',
  'about.version': 'Version {version} — {date}',
  'opt.shape': 'Forme du plateau',
  'shape.carre': 'Carré',
  'shape.hex': 'Hexagonal',
  'shape.oct': 'Carré tronqué',
  'game.tile.edges': 'Tuile : nombres {values} (dans le sens horaire depuis le haut)',
  'help.shape.h': 'Formes de plateau',
  'help.shape.hex': 'Hexagonal : chaque tuile est un hexagone à 6 côtés ; les colonnes sont décalées d\'une demi-hauteur.',
  'help.shape.oct': 'Carré tronqué : des octogones à 8 côtés et de petits carrés à 4 côtés ; chaque sorte de tuile ne va que sur sa sorte de case.',
  'mode.insane': 'Insane',
  'help.insane.h': 'Mode Insane',
  'help.insane.1': 'Les tuiles peuvent tourner : double-touchez une tuile pour passer en mode rotation (repère ↻), puis balayez-la en cercle autour de son centre (ou glissez à gauche / à droite) ; à la souris, maintenez le clic. La tuile s\'arrête sur le cran le plus proche.',
  'help.insane.2': 'Dans la zone de jeu, une rotation qui désemboîte la tuile est refusée. Au clavier : R tourne la tuile de la case active dans le sens horaire, Maj+R dans l\'autre sens.',
  'help.insane.3': 'Une partie Insane est sauvegardée à part de la partie normale, avec ses propres meilleurs temps : vous pouvez jouer l\'une sans finir l\'autre.',
  'game.rotmode': 'Mode rotation : balayez la tuile pour la faire tourner, double-touchez pour terminer.',
  'stats.won': 'Parties gagnées',
  'stats.started': 'Parties commencées',
  'stats.best': 'Meilleur temps',
  'stats.avg': 'Temps moyen',
  'stats.byshape': 'Par forme',
  'stats.last': 'Dernières parties',
  'stats.total': 'Total',
  'stats.col.won': 'Gagnées',
  'stats.col.best': 'Meilleur',
  'stats.col.avg': 'Moyen',
  'new.random': 'Partie aléatoire',
  'new.daily': 'Puzzle du jour',
  'new.dailyDone': 'terminé en {time}',
  'new.code': 'Jouer avec un code',
  'code.prompt': 'Code du puzzle',
  'code.play': 'Jouer',
  'code.invalid': 'Code invalide : vérifiez la saisie.',
  'code.copy': 'Copier le code du puzzle',
  'code.copied': 'Code copié',
  'code.is': 'Code du puzzle : {code}',
  'dlg.abandon': 'Une partie est déjà en cours dans ce mode. L\'abandonner ?',
  'dlg.yesNew': 'Abandonner',
  'help.code.h': 'Codes de puzzle et puzzle du jour',
  'help.code.1': 'Chaque partie a un code (sous la barre du haut, et à la fin de la partie) : toucher le code le copie. Le code contient la forme, la taille, les valeurs et le mode : le saisir (Nouvelle partie › Jouer avec un code) rejoue exactement le même plateau, pour le partager ou le retenter.',
  'help.code.2': 'Le puzzle du jour est le même pour tous ceux qui jouent la même configuration (forme, taille, valeurs, mode) le même jour ; il change à minuit, heure de l\'appareil.',
  'help.code.3': 'Les statistiques sont rangées par forme, taille et mode. Elles restent sur l\'appareil.',
};

/** Langue courante ; le français sert de repli pour toute clé absente d'une traduction. */
let current = FR;
export function setDictionary(dict) {
  current = dict && typeof dict === 'object' ? dict : FR;
}

const fill = (s, params) => s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));

/** Texte avec remplacement des {nom} ; clé inconnue partout → la clé elle-même (visible, donc corrigeable). */
export function t(key, params = {}, dict = null) {
  const d = dict ?? current;
  const s = d[key] ?? FR[key];
  return s === undefined ? key : fill(s, params);
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Comme t() pour un texte inséré en HTML : le texte est échappé, puis chaque {marque} est remplacée par le
 * fragment HTML fourni (liens construits par le code, jamais par les traductions).
 */
export function tHtml(key, fragments = {}, dict = null) {
  const d = dict ?? current;
  const s = d[key] ?? FR[key];
  if (s === undefined) return escapeHtml(key);
  return escapeHtml(s).replace(/\{(\w+)\}/g, (m, k) => (k in fragments ? fragments[k] : m));
}
