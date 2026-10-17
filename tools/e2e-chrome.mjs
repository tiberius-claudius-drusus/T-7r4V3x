#!/usr/bin/env node
/*
 * T-7r4V3x — banc d'essai de bout en bout dans Chrome (sans interface, piloté par DevTools).
 * Copyright (C) 2026 Drusus (Gens Claudia). Licence : GPL-2.0-or-later (voir LICENSE.txt).
 *
 * Ce que ne couvrent pas les tests unitaires (`npm test`) : l'interface réelle — gestes (glisser, double toucher,
 * balayage circulaire, deuxième doigt), clavier, chronomètre, sauvegardes, classements, accueil, affichage selon le thème.
 * Chaque défaut trouvé par l'audit de code de Claudius y a son contrôle (sur l'ancien code 0.9.3, 17 de ces contrôles
 * échouent), ainsi que les codes de puzzle, le puzzle du jour, l'abandon d'une partie et les statistiques.
 *
 * Usage :  npm run e2e                      (ou : node tools/e2e-chrome.mjs [--shots dossier])
 * Chrome :  variable d'environnement CHROME, sinon les emplacements usuels (Windows, macOS, Linux).
 * Aucun fichier du dépôt n'est modifié ; profil Chrome temporaire supprimé à la fin. Code de sortie 1 si un contrôle échoue.
 *
 * Pièges connus (voir aussi les commentaires ci-dessous) :
 *  - l'application sauvegarde sa partie en quittant la page : poser un état de test par `reloadWith`, jamais par
 *    `localStorage.setItem` suivi d'un `reload` (la page sortante écraserait l'état) ;
 *  - LICENSE.txt est servi en text/plain par le serveur de test (le type MIME de .txt est déclaré ci-dessous) ;
 *  - `Input.dispatch*Event` est asynchrone : laisser une courte pause avant de lire le DOM.
 */
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotsArg = process.argv.indexOf('--shots');
const SHOTS = shotsArg > -1 ? path.resolve(process.argv[shotsArg + 1] ?? 'e2e-shots') : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) {
  console.error('Chrome introuvable : définir la variable CHROME (chemin de l\'exécutable).');
  process.exit(2);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const freePort = () => new Promise((resolve) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const DEBUG_PORT = await freePort();
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 't7-e2e-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=430,860',
  '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function cleanup() {
  try { ws.close(); } catch { /* déjà fermé */ }
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
  else chrome.kill();
  server.close();
  setTimeout(() => { try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch { /* verrouillé : sans importance */ } process.exit(process.exitCode ?? 0); }, 800);
}

let targets;
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json(); if (targets.some((t) => t.type === 'page')) break; } catch { /* Chrome démarre */ }
  await sleep(200);
}
const page = targets?.find((t) => t.type === 'page');
if (!page) { console.error('Chrome n\'a pas démarré.'); process.exit(2); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0;
const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result.result.value;
};
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const shot = async (name) => {
  if (!SHOTS) return;
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64'));
};
const results = [];
const check = (name, ok, info = '') => { results.push([ok, name, info]); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ` ${info}` : ''}`); };
const section = async (title, fn) => {
  console.log(`\n== ${title}`);
  try { await fn(); } catch (e) { check(`${title} : exception`, false, String(e.message).slice(0, 300)); }
};

async function dblclick(x, y) {
  await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y);
  await sleep(80);
  await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y);
  await sleep(80);
}
async function drag(a, b, hold = false) {
  await mouse('mousePressed', a.x, a.y);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12, { buttons: 1 }); await sleep(15); }
  if (hold) return;
  await mouse('mouseReleased', b.x, b.y);
  await sleep(250);
}
const trayTile = (i = 0) => ev(`(() => { const t = document.querySelectorAll('#tray .tile')[${i}]; if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, label: t.getAttribute('aria-label'), cls: t.className }; })()`);
async function circle(cx, cy, r, fromDeg, toDeg) {
  const rad = (d) => (d * Math.PI) / 180;
  await mouse('mousePressed', cx + r * Math.cos(rad(fromDeg)), cy + r * Math.sin(rad(fromDeg)));
  const n = 12;
  for (let i = 1; i <= n; i++) {
    const a = fromDeg + ((toDeg - fromDeg) * i) / n;
    await mouse('mouseMoved', cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a)), { buttons: 1 });
    await sleep(15);
  }
  await mouse('mouseReleased', cx + r * Math.cos(rad(toDeg)), cy + r * Math.sin(rad(toDeg)));
  await sleep(150);
}
const centreOf = (sel, i = 0) => ev(`(() => { const e = document.querySelectorAll(${JSON.stringify(sel)})[${i}]; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);

const gotoPage = async (url) => {
  await send('Page.navigate', { url });
  for (let i = 0; i < 50; i++) { await sleep(150); try { if ((await ev('location.href')).startsWith(url.split('?')[0])) break; } catch { /* navigation en cours */ } }
  await sleep(250);
};
/** Recharge l'application avec un localStorage préparé : { clé: valeur JSON } et options (tx.opts). */
const reloadWith = async (store, opts) => {
  // On quitte d'abord l'application (elle sauvegarde la partie en cours en partant), PUIS on prépare le stockage.
  await gotoPage(`${BASE}/sw.js`);
  await ev(`localStorage.clear(); ${Object.entries(store).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(JSON.stringify(v))});`).join(' ')} localStorage.setItem('tx.opts', ${JSON.stringify(JSON.stringify(opts))});`);
  await gotoPage(`${BASE}/index.html`);
  await sleep(900);
};

await send('Runtime.enable');
await send('Page.enable');
await section('Accueil, mode Insane, gestes de rotation, trois formes, sauvegardes, classements', async () => {
  await reloadWith({}, {});
  // --- accueil
  const home = await ev(`({ modes: [...document.querySelectorAll('#h-mode button')].map((b) => b.textContent), on: [...document.querySelectorAll('#h-mode button')].map((b) => b.classList.contains('on')), cont: document.getElementById('b-continue').hidden, contLabel: document.getElementById('b-continue').textContent, foot: document.getElementById('foot').textContent, nbBoutonsNouvelle: document.querySelectorAll('.menu button').length })`);
  check('sélecteur de mode : Mode normal / Mode Insane', home.modes.join('|') === 'Mode normal|Mode Insane' && home.on[0] === true, JSON.stringify(home.modes));
  check('Continuer caché sans partie, libellé « Continuer »', home.cont === true && home.contLabel === 'Continuer', home.contLabel);
  check('pied de page', /^v\d+\.\d+\.\d+ - développé par Drusus - \d{4}-\d\d-\d\d - GPL2\+$/.test(home.foot), home.foot);
  await shot('0-accueil');

  // --- partie Insane carrée (3x3 par défaut)
  await ev(`[...document.querySelectorAll('#h-mode button')][1].click(); (() => { document.getElementById('b-new').click(); document.getElementById('ng-random').click(); if (document.getElementById('abandon').open) document.getElementById('abandon-yes').click(); })()`);
  await sleep(600);
  check('badge Insane visible en partie', await ev(`!document.getElementById('g-mode').hidden`));
  let tile = await trayTile(0);
  check('tuiles dans la réserve', !!tile, JSON.stringify(tile));
  const parse = (label) => label.match(/haut (\d+), droite (\d+), bas (\d+), gauche (\d+)/).slice(1).map(Number);
  const before = parse(tile.label);
  await shot('1-insane-carre');

  // double toucher -> mode rotation
  await dblclick(tile.x, tile.y);
  tile = await trayTile(0);
  check('double toucher : mode rotation', tile.cls.includes('rotmode'), tile.cls);

  // rotation en cercle d'un quart de tour horaire (de 0° à 90°, départ à droite du centre)
  await circle(tile.x, tile.y, tile.w * 0.4, 0, 90);
  tile = await trayTile(0);
  const after = parse(tile.label);
  // horaire : haut -> droite, donc nouveau haut = ancien gauche
  check('quart de tour horaire', after[0] === before[3] && after[1] === before[0] && after[2] === before[1] && after[3] === before[2], `${before} -> ${after}`);
  check('mode rotation conservé', tile.cls.includes('rotmode'));

  // sens inverse : deux crans anti-horaires
  await circle(tile.x, tile.y, tile.w * 0.4, 0, -180);
  tile = await trayTile(0);
  const after2 = parse(tile.label);
  check('demi-tour anti-horaire', after2[0] === after[2] && after2[1] === after[3] && after2[2] === after[0] && after2[3] === after[1], `${after} -> ${after2}`);

  // balayage horizontal depuis le centre (fallback), vers la droite = horaire, ~60px*1.5=90°
  await circle(tile.x, tile.y, 0, 0, 0).catch(() => {});
  await mouse('mousePressed', tile.x, tile.y);
  for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', tile.x + i * 8, tile.y, { buttons: 1 }); await sleep(15); }
  await mouse('mouseReleased', tile.x + 64, tile.y);
  await sleep(150);
  tile = await trayTile(0);
  const after3 = parse(tile.label);
  check('balayage horizontal depuis le centre', after3.join() !== after2.join(), `${after2} -> ${after3}`);

  // annuler : l'historique de rotation
  check('annuler actif', await ev(`!document.getElementById('g-undo').disabled`));
  await ev(`document.getElementById('g-undo').click()`);
  await sleep(100);

  // sortie du mode rotation par double toucher
  tile = await trayTile(0);
  check('annuler quitte le mode rotation', !tile.cls.includes('rotmode'), tile.cls);
  await dblclick(tile.x, tile.y);
  tile = await trayTile(0);
  check('double toucher : réentrée', tile.cls.includes('rotmode'), tile.cls);
  await dblclick(tile.x, tile.y);
  tile = await trayTile(0);
  check('double toucher : sortie du mode rotation', !tile.cls.includes('rotmode'), tile.cls);

  // clavier R / Maj+R
  const b4 = parse((await trayTile(0)).label);
  await ev(`(() => { const s = document.querySelector('#tray .slot'); s.focus(); s.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true })); })()`);
  await sleep(100);
  const k1 = parse((await trayTile(0)).label);
  check('clavier R : quart de tour horaire', k1[1] === b4[0] && k1[0] === b4[3], `${b4} -> ${k1}`);
  await ev(`(() => { const s = document.querySelector('#tray .slot'); s.focus(); s.dispatchEvent(new KeyboardEvent('keydown', { key: 'R', shiftKey: true, bubbles: true })); })()`);
  await sleep(100);
  const k2 = parse((await trayTile(0)).label);
  check('clavier Maj+R : retour', k2.join() === b4.join(), `${k1} -> ${k2}`);

  // sauvegardes séparées
  check('sauvegarde Insane écrite, pas la normale', await ev(`!!localStorage.getItem('tx.save.insane') && !localStorage.getItem('tx.save')`));
  check('sauvegarde contient insane:true', await ev(`JSON.parse(localStorage.getItem('tx.save.insane')).puzzle.insane === true`));

  // --- retour à l'accueil, partie normale en parallèle
  await ev(`location.hash = ''`);
  await sleep(300);
  check('accueil : le mode Insane est resté sélectionné, Continuer visible', await ev(`document.querySelectorAll('#h-mode button')[1].classList.contains('on') && !document.getElementById('b-continue').hidden`));
  await ev(`document.querySelectorAll('#h-mode button')[0].click()`);
  check('mode normal sans partie : Continuer caché', await ev(`document.getElementById('b-continue').hidden`));
  await shot('0b-accueil-normal');
  await ev(`[...document.querySelectorAll('#h-mode button')][0].click(); (() => { document.getElementById('b-new').click(); document.getElementById('ng-random').click(); if (document.getElementById('abandon').open) document.getElementById('abandon-yes').click(); })()`);
  await sleep(500);
  check('partie normale : pas de badge', await ev(`document.getElementById('g-mode').hidden`));
  tile = await trayTile(0);
  await dblclick(tile.x, tile.y);
  tile = await trayTile(0);
  check('partie normale : double toucher sans effet', !tile.cls.includes('rotmode'), tile.cls);
  await ev(`(() => { const s = document.querySelector('#tray .slot'); s.focus(); s.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true })); })()`);
  check('partie normale : R sans effet', parse((await trayTile(0)).label).join() === parse(tile.label).join());
  // déplace une tuile pour forcer une sauvegarde normale
  const s0 = await ev(`(() => { const t = document.querySelector('#tray .tile'); const r = t.getBoundingClientRect(); const c = document.querySelector('#target .slot').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, tx: c.left + c.width / 2, ty: c.top + c.height / 2 }; })()`);
  await mouse('mousePressed', s0.x, s0.y);
  for (let i = 1; i <= 10; i++) { await mouse('mouseMoved', s0.x + ((s0.tx - s0.x) * i) / 10, s0.y + ((s0.ty - s0.y) * i) / 10, { buttons: 1 }); await sleep(10); }
  await mouse('mouseReleased', s0.tx, s0.ty);
  await sleep(200);
  check('les deux sauvegardes coexistent', await ev(`!!localStorage.getItem('tx.save.insane') && !!localStorage.getItem('tx.save')`));
  check('la normale n\'est pas Insane', await ev(`!JSON.parse(localStorage.getItem('tx.save')).puzzle.insane`));

  // reprise de la partie Insane depuis l'accueil
  await ev(`location.hash = ''`);
  await sleep(300);
  await ev(`[...document.querySelectorAll('#h-mode button')][1].click(); document.getElementById('b-continue').click()`);
  await sleep(500);
  check('reprise Insane : badge visible', await ev(`!document.getElementById('g-mode').hidden`));
  await shot('2-reprise-insane');

  // --- hexagonal Insane (options -> forme hex)
  await ev(`location.hash = 'options'`);
  await sleep(300);
  await ev(`[...document.querySelectorAll('#o-shape button')][1].click()`);
  await sleep(200);
  await ev(`location.hash = ''`);
  await sleep(300);
  await ev(`[...document.querySelectorAll('#h-mode button')][1].click(); (() => { document.getElementById('b-new').click(); document.getElementById('ng-random').click(); if (document.getElementById('abandon').open) document.getElementById('abandon-yes').click(); })()`);
  await sleep(700);
  tile = await trayTile(0);
  check('hex Insane : tuile présente', !!tile && tile.cls.includes('k-hex'), tile && tile.cls);
  const hexBefore = tile.label;
  await dblclick(tile.x, tile.y);
  tile = await trayTile(0);
  check('hex Insane : mode rotation', tile.cls.includes('rotmode'));
  await circle(tile.x, tile.y, tile.w * 0.3, 0, 60);
  tile = await trayTile(0);
  check('hex Insane : un cran de 60° change la tuile', tile.label !== hexBefore, `${hexBefore} -> ${tile.label}`);
  await shot('3-hex-insane');

  // --- oct
  await ev(`location.hash = 'options'`);
  await sleep(300);
  await ev(`[...document.querySelectorAll('#o-shape button')][2].click()`);
  await sleep(200);
  await ev(`location.hash = ''`);
  await sleep(300);
  await ev(`[...document.querySelectorAll('#h-mode button')][1].click(); (() => { document.getElementById('b-new').click(); document.getElementById('ng-random').click(); if (document.getElementById('abandon').open) document.getElementById('abandon-yes').click(); })()`);
  await sleep(700);
  tile = await trayTile(0);
  check('oct Insane : tuile présente', !!tile, tile && tile.cls);
  await dblclick(tile.x, tile.y);
  tile = await trayTile(0);
  const octBefore = tile.label;
  await circle(tile.x, tile.y, tile.w * 0.3, 0, 45);
  tile = await trayTile(0);
  check('oct Insane : un cran de 45° change la tuile', tile.label !== octBefore, `${octBefore} -> ${tile.label}`);
  await shot('4-oct-insane');

  // --- statistiques : reprise des anciens temps (migration), puis tableau par forme
  await reloadWith({ 'tx.scores': { '3x3/6': [{ ms: 9000, date: '2026-10-16' }], 'insane:hex:4x3/6': [{ ms: 12000, date: '2026-10-16' }], 'hex:3x3/6': [{ ms: 1000, date: '2026-10-10' }] } }, { shape: 'carre', size: 3, colors: 6, insane: false, family: 'epure', mode: 'clair', lang: 'fr' });
  await ev(`location.hash = 'stats'`);
  await sleep(300);
  const sections = await ev(`[...document.querySelectorAll('#stats-body h4')].map((h) => h.textContent)`);
  const stat = await ev(`[...document.querySelectorAll('#stats-body table')][0].innerText.replace(/\\s+/g, ' ')`);
  check('statistiques : formes jouées (anciens temps repris, plateau disparu écarté)', sections.join('|') === 'Carré|Hexagonal', JSON.stringify(sections));
  check('statistiques : 2 parties reprises', /Parties gagnées 2/.test(stat), stat);
  const hexTable = await ev(`[...document.querySelectorAll('#stats-body table')][2].innerText.replace(/\\s+/g, ' ')`);
  check('statistiques : ligne Insane 4×3 en hexagonal', /Insane · 4×3 · 0–5/.test(hexTable), hexTable);
  await shot('5-statistiques');
});
await section('Glisser-déposer : tuile refusée (hexagonal) et tuile en vol (thème à fond flou)', async () => {
  const count = () => ev(`document.querySelectorAll('#boards .tile').length`);
  const centre = (sel, i = 0) => ev(`(() => { const e = document.querySelectorAll(${JSON.stringify(sel)})[${i}]; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  async function drag(a, b, hold = false) {
    await mouse('mousePressed', a.x, a.y);
    for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12, { buttons: 1 }); await sleep(15); }
    if (hold) return;
    await mouse('mouseReleased', b.x, b.y);
    await sleep(250);
  }

  // ---- A : hexagonal normal, on place une tuile puis on en lâche une autre où elle ne rentre pas
  await reloadWith({}, { shape: 'hex', size: 3, colors: 10 });
  await ev(`(() => { document.getElementById('b-new').click(); document.getElementById('ng-random').click(); if (document.getElementById('abandon').open) document.getElementById('abandon-yes').click(); })()`);
  await sleep(700);
  const total = await count();
  check('hex : toutes les tuiles affichées au départ', total === 12, String(total));
  // première tuile -> case 0 du plateau de jeu (toujours acceptée : zone vide)
  await drag(await centre('#tray .slot', 0), await centre('#target .slot', 0));
  check('hex : première tuile posée', (await count()) === 12, String(await count()));
  // essaie plusieurs tuiles sur la case voisine jusqu'à un refus
  let lost = null;
  for (let i = 0; i < 11; i++) {
    const before = await count();
    const tiles = await ev(`document.querySelectorAll('#tray .tile').length`);
    if (!tiles) break;
    const src = await ev(`(() => { const t = document.querySelectorAll('#tray .tile')[0]; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await drag(src, await centre('#target .slot', 1));
    const after = await count();
    if (after !== before) { lost = `${before} -> ${after}`; break; }
  }
  check('hex : refus d\'un dépôt sans perdre la tuile', lost === null, lost ?? 'aucune tuile perdue');
  await shot('a-hex-apres-refus');

  // ---- B : carré, tuile glissée de la zone de jeu vers la réserve (autre plateau)
  await reloadWith({}, { shape: 'carre', size: 3, colors: 10, family: 'aurora', mode: 'clair' });
  await ev(`(() => { document.getElementById('b-new').click(); document.getElementById('ng-random').click(); if (document.getElementById('abandon').open) document.getElementById('abandon-yes').click(); })()`);
  await sleep(700);
  await drag(await centre('#tray .slot', 0), await centre('#target .slot', 0));
  // reprend la tuile posée et la tient au-dessus de la réserve
  await drag(await centre('#target .slot', 0), await centre('#tray .slot', 4), true);
  await shot('b-carre-vol-vers-reserve');
  const hidden = await ev(`(() => { const t = document.querySelector('.tile.dragging'); if (!t) return 'pas de tuile en vol'; const r = t.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; t.style.pointerEvents = 'auto'; const top = document.elementFromPoint(x, y); t.style.pointerEvents = ''; return top === t || t.contains(top) ? 'visible' : 'masquée par ' + (top && top.className); })()`);
  check('carré : la tuile en vol reste au-dessus de la réserve', hidden === 'visible', hidden);
  await mouse('mouseReleased', 0, 0);

});
await section('Audit de Claudius : G1, M1-M4, F2-F5, F7, F8, F10', async () => {
  // partie 2x2 construite : tuiles = [x, y, n, e, s, w] ; cells[x][y] = index ou -1
  const save = (tiles, cells, insane, elapsedMs = 5000) => ({ v: 1, elapsedMs, puzzle: { size: 2, colors: 5, tiles, cells, started: true, insane } });
  const ZERO = [[0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0]];
  const NEARLY_WON = [[0, 1], [2, -1], [3, -1], [-1, -1]]; // zone de jeu : 3 tuiles posées ; réserve : 1
  const OPT = (insane) => ({ shape: 'carre', size: 2, colors: 5, insane, family: 'epure', mode: 'clair', lang: 'fr' });
  const clickContinue = () => ev(`document.getElementById('b-continue').click()`);
  const slotLabel = (zone, i) => ev(`document.querySelectorAll('#${zone} .slot')[${i}].getAttribute('aria-label')`);

  // ---------- G1 : victoire Insane, la partie normale sauvegardée survit ----------
  await reloadWith({ 'tx.save.insane': save(ZERO, NEARLY_WON, true), 'tx.save': save(ZERO, NEARLY_WON, false) }, OPT(true));
  await clickContinue();
  await sleep(500);
  check('G1 : reprise Insane (badge)', await ev(`!document.getElementById('g-mode').hidden`));
  await drag(await centreOf('#tray .slot', 0), await centreOf('#target .slot', 3));
  check('G1 : victoire détectée', await ev(`document.getElementById('win').open`));
  check('G1 : la partie normale est intacte', await ev(`!!localStorage.getItem('tx.save')`));
  check('G1 : la sauvegarde Insane est effacée', await ev(`localStorage.getItem('tx.save.insane') === null`));
  const gameIns = await ev(`JSON.stringify(JSON.parse(localStorage.getItem('tx.stats')).games.map((g) => g.i))`);
  check('G1 : la partie gagnée est comptée en Insane dans les statistiques', gameIns === '[1]', gameIns);
  const dateOk = await ev(`(() => { const d = JSON.parse(localStorage.getItem('tx.stats')).games.at(-1).d; const now = new Date(); const loc = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'); return d === loc ? 'ok' : d + ' != ' + loc; })()`);
  check('F7 : date du temps = date locale', dateOk === 'ok', dateOk);
  await ev(`document.getElementById('win-menu').click()`);
  await sleep(300);
  check('G1 : accueil, mode Insane : Continuer caché', await ev(`document.querySelectorAll('#h-mode button')[1].classList.contains('on') && document.getElementById('b-continue').hidden`));

  // ---------- F8 : sauvegarde d'une ancienne version ----------
  await reloadWith({ 'tx.save': { v: 1, elapsedMs: 1000, puzzle: { shape: 'hex', size: 3, colors: 6, tiles: [], cells: [], started: true } } }, OPT(false));
  check('F8 : « Continuer » caché pour une sauvegarde irrécupérable', await ev(`document.getElementById('b-continue').hidden`));
  check('F8 : la sauvegarde morte est purgée', await ev(`localStorage.getItem('tx.save') === null`));

  // ---------- F10 : anciens temps hexagonaux (plateaux disparus) non repris ----------
  await reloadWith({ 'tx.scores': { 'hex:3x3/6': [{ ms: 1000, date: '2026-10-10' }], 'hex:4x3/6': [{ ms: 2000, date: '2026-10-16' }] } }, OPT(false));
  await ev(`location.hash = 'stats'`);
  await sleep(300);
  const heads = await ev(`[...document.querySelectorAll('#stats-body table')].map((t) => t.innerText.replace(/\\s+/g, ' '))`);
  check('F10 : seul le plateau hexagonal existant est repris', heads.some((h) => h.includes('4×3')) && !heads.some((h) => h.includes('3×3')), JSON.stringify(heads));

  // ---------- M4 / F3 / F4 / M3 : parties construites ----------
  // t0 = (0,0) : n0 e1 s2 w3 ; t1 voisine de droite : west = 1 (M4 : aucune rotation ne rentre) ou 3 (F3 : il faut 2 crans)
  const mk = (west1) => save([[0, 0, 0, 1, 2, 3], [1, 0, 0, 0, 0, west1], [0, 1, 1, 1, 1, 1], [1, 1, 2, 2, 2, 2]], [[0, -1], [1, -1], [2, 3], [-1, -1]], true);
  await reloadWith({ 'tx.save.insane': mk(1) }, OPT(true));
  await clickContinue();
  await sleep(500);
  const pressKey = (idx, zone, key, shift = false) => ev(`(() => { const s = document.querySelectorAll('#${zone} .slot')[${idx}]; s.focus(); s.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, shiftKey: ${shift}, bubbles: true })); })()`);
  const lbl = async () => ev(`document.querySelector('#target .tile').getAttribute('aria-label')`);
  const lab0 = await lbl();
  await pressKey(0, 'target', 'r');
  await sleep(120);
  check('M4 : rotation refusée → la case secoue (classe refuse conservée)', await ev(`document.querySelectorAll('#target .slot')[0].classList.contains('refuse')`));
  check('M4 : la tuile n\'a pas tourné', (await lbl()) === lab0, await lbl());
  // M3 : nom accessible de la case
  const al = await slotLabel('target', 0);
  check('M3 : la case annonce les nombres de la tuile', /haut 0, droite 1, bas 2, gauche 3/.test(al), al);
  check('M3 : la tuile est masquée aux lecteurs d\'écran', await ev(`document.querySelector('#target .tile').getAttribute('aria-hidden') === 'true'`));
  check('M3 : aria-selected présent', await ev(`document.querySelector('#target .slot').getAttribute('aria-selected') === 'false'`));
  // F4 : mode rotation puis Échap
  const t0c = await centreOf('#target .tile', 0);
  await dblclick(t0c.x, t0c.y);
  check('F4 : mode rotation armé', await ev(`!!document.querySelector('.tile.rotmode')`));
  check('M3 : le mode rotation est annoncé dans le nom de la case', (await slotLabel('target', 0)).includes('Mode rotation'));
  await pressKey(0, 'target', 'Escape');
  check('F4 : Échap quitte le mode rotation', await ev(`!document.querySelector('.tile.rotmode')`));
  // F3 : il faut deux crans
  await reloadWith({ 'tx.save.insane': mk(3) }, OPT(true));
  await clickContinue();
  await sleep(500);
  await pressKey(0, 'target', 'r');
  await sleep(150);
  const l3 = await lbl();
  check('F3 : R saute au premier cran qui s\'emboîte (2 crans)', /haut 2, droite 3, bas 0, gauche 1/.test(l3), l3);

  // ---------- F5 : le menu suspend le chrono ----------
  await reloadWith({ 'tx.save.insane': save(ZERO, NEARLY_WON, true, 5000) }, OPT(true));
  await clickContinue();
  await sleep(1600); // le chrono avance
  const tA = await ev(`document.getElementById('g-time').textContent`);
  await ev(`document.getElementById('g-menu').click()`);
  await sleep(300);
  const tB = await ev(`document.getElementById('g-time').textContent`);
  await sleep(2200);
  const tC = await ev(`document.getElementById('g-time').textContent`);
  check('F5 : chrono figé pendant que le menu est ouvert', tB === tC, `${tA} -> ${tB} -> ${tC}`);
  await ev(`document.getElementById('m-resume').click()`);
  await sleep(2200);
  const tD = await ev(`document.getElementById('g-time').textContent`);
  check('F5 : chrono reprend à la fermeture du menu', tD !== tC, `${tC} -> ${tD}`);
  await ev(`document.getElementById('g-menu').click()`);
  await sleep(200);
  await mouse('mouseMoved', 5, 5);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(2200);
  const tE = await ev(`document.getElementById('g-time').textContent`);
  check('F5 : chrono reprend aussi après Échap', tE !== tD, `${tD} -> ${tE}`);

  // ---------- F2 : reposer une tuile sur sa propre case ----------
  await reloadWith({ 'tx.save.insane': save(ZERO, NEARLY_WON, true) }, OPT(true));
  await clickContinue();
  await sleep(500);
  const own = await centreOf('#tray .slot', 0);
  await mouse('mousePressed', own.x, own.y);
  for (let i = 1; i <= 6; i++) { await mouse('mouseMoved', own.x + i * 6, own.y + i * 4, { buttons: 1 }); await sleep(15); }
  await mouse('mouseMoved', own.x, own.y, { buttons: 1 });
  await mouse('mouseReleased', own.x, own.y);
  await sleep(150);
  check('F2 : tuile reposée sur sa case → pas de refus', await ev(`!document.querySelector('.slot.refuse')`));

  // ---------- M2 : sélectionner B puis double toucher A ----------
  await reloadWith({}, OPT(true));
  await ev(`(() => { document.getElementById('b-new').click(); document.getElementById('ng-random').click(); if (document.getElementById('abandon').open) document.getElementById('abandon-yes').click(); })()`);
  await sleep(600);
  const a = await centreOf('#tray .slot', 0);
  const b = await centreOf('#tray .slot', 1);
  await mouse('mousePressed', a.x, a.y); await mouse('mouseReleased', a.x, a.y);
  await sleep(80);
  await dblclick(b.x, b.y);
  check('M2 : double toucher après une sélection n\'arme pas le mode rotation sur la mauvaise tuile', await ev(`!document.querySelector('.tile.rotmode')`));

  // ---------- M1 : deuxième doigt pendant un glisser ----------
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await reloadWith({ 'tx.save.insane': save(ZERO, NEARLY_WON, true) }, OPT(true));
  await clickContinue();
  await sleep(500);
  const p1 = await centreOf('#target .slot', 0);
  const p2 = await centreOf('#target .slot', 1);
  const to = await centreOf('#target .slot', 3);
  await ev(`window.__pe = []; for (const t of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']) document.getElementById('boards').addEventListener(t, (e) => window.__pe.push(t + ':' + e.pointerId + ':' + e.pointerType));`);
  const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await touch('touchStart', [{ x: p1.x, y: p1.y, id: 1 }]);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: p1.x + ((to.x - p1.x) * i) / 6, y: p1.y + ((to.y - p1.y) * i) / 6, id: 1 }]); await sleep(15); }
  await sleep(150);
  const flying = await ev(`document.querySelectorAll('body > .tile.floating').length`);
  await touch('touchStart', [{ x: to.x, y: to.y, id: 1 }, { x: p2.x, y: p2.y, id: 2 }]);
  await sleep(60);
  await touch('touchEnd', [{ x: p2.x, y: p2.y, id: 2 }]);
  await sleep(60);
  await touch('touchEnd', []);
  await sleep(300);
  check('M1 : une tuile était bien en vol', flying === 1, flying + ' ' + JSON.stringify((await ev('window.__pe')).slice(0, 14)));
  check('M1 : aucune tuile fantôme collée au <body> après le deuxième doigt', await ev(`document.querySelectorAll('body > .tile.floating').length === 0`), String(await ev(`document.querySelectorAll('body > .tile.floating').length`)));
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });


});

await section('Nouvelle partie : codes de puzzle, puzzle du jour, abandon, statistiques', async () => {
  const mod = (expr) => ev(`(async () => { const m = await import('/src/code.js'); return (${expr}); })()`);
  const trayLabels = () => ev(`[...document.querySelectorAll('#tray .slot')].map((s) => s.getAttribute('aria-label')).join('|')`);
  const home = () => ev(`location.hash = ''`);
  const codeOnScreen = () => ev(`document.getElementById('g-code').hidden ? null : document.getElementById('g-code').textContent.replace(/^.*: /, '')`);

  // -- le dialogue « Nouvelle partie »
  await reloadWith({}, { shape: 'hex', size: 4, colors: 6, insane: false, family: 'epure', mode: 'clair', lang: 'fr' });
  await ev(`document.getElementById('b-new').click()`);
  await sleep(200);
  const ng = await ev(`({ open: document.getElementById('newgame').open, random: document.getElementById('ng-random').textContent, daily: document.getElementById('ng-daily').textContent, code: document.getElementById('ng-code').textContent })`);
  check('dialogue : aléatoire, puzzle du jour, code', ng.open && /Partie aléatoire · Hexagonal · 6×4/.test(ng.random) && /Puzzle du jour · Hexagonal · 6×4/.test(ng.daily) && /code/i.test(ng.code), JSON.stringify(ng));
  await shot('6-dialogue-nouvelle-partie');

  // -- une partie aléatoire porte un code, affiché sous la barre
  await ev(`document.getElementById('ng-random').click()`);
  await sleep(600);
  const code1 = await codeOnScreen();
  check('le code du puzzle est affiché sous la barre', /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(code1 ?? ''), String(code1));
  const parsed = await mod(`m.parseCode(${JSON.stringify(code1)})?.config`);
  check('le code porte la configuration jouée (hexagonal 6×4, 6 valeurs, normal)', parsed && parsed.shape === 'hex' && parsed.size === 4 && parsed.colors === 6 && parsed.insane === false, JSON.stringify(parsed));
  const labels1 = await trayLabels();
  await shot('7-partie-avec-code');
  const gc = await centreOf('#g-code'); // vrai clic : la copie exige un geste de l'utilisateur
  await mouse('mousePressed', gc.x, gc.y); await mouse('mouseReleased', gc.x, gc.y);
  await sleep(400);
  check('toucher le code le copie (retour visuel)', await ev(`document.getElementById('g-code').classList.contains('copied')`));

  // -- saisir ce code redonne exactement le même plateau (saisie en minuscules, sans tirets)
  await home();
  await sleep(300);
  await ev(`document.getElementById('b-new').click(); document.getElementById('ng-code').click()`);
  await sleep(200);
  check('dialogue de saisie ouvert', await ev(`document.getElementById('codedlg').open`));
  await ev(`(() => { const f = document.getElementById('code-field'); f.value = ${JSON.stringify(code1.toLowerCase().replace(/-/g, ''))}; f.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  check('la saisie se met en forme (XXXX-XXXX-XXXX)', (await ev(`document.getElementById('code-field').value`)) === code1, await ev(`document.getElementById('code-field').value`));
  await ev(`document.getElementById('code-play').click()`);
  await sleep(600);
  check('le même code redonne le même plateau', (await trayLabels()) === labels1 && (await codeOnScreen()) === code1);

  // -- un code faux est refusé sans rien lancer
  await home();
  await sleep(300);
  await ev(`document.getElementById('b-new').click(); document.getElementById('ng-code').click()`);
  await sleep(200);
  const wrong = code1.slice(0, 5) + (code1[5] === 'A' ? 'B' : 'A') + code1.slice(6);
  await ev(`(() => { const f = document.getElementById('code-field'); f.value = ${JSON.stringify(wrong)}; f.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('code-play').click(); })()`);
  await sleep(200);
  check('code invalide : message, dialogue conservé, rien lancé', await ev(`!document.getElementById('code-err').hidden && document.getElementById('codedlg').open && location.hash === ''`));
  await ev(`document.getElementById('code-cancel').click()`);

  // -- le code d'une autre configuration lance cette configuration, quel que soit le réglage de l'accueil
  const insaneOct = await mod(`m.makeCode({ shape: 'oct', size: 4, colors: 8, insane: true })`);
  await ev(`document.getElementById('b-new').click(); document.getElementById('ng-code').click()`);
  await sleep(200);
  await ev(`(() => { const f = document.getElementById('code-field'); f.value = ${JSON.stringify(insaneOct)}; f.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('code-play').click(); })()`);
  await sleep(600);
  check('un code Insane carré tronqué lance une partie Insane carré tronqué', await ev(`!document.getElementById('g-mode').hidden && !!document.querySelector('#tray .tile.k-oct')`) && (await codeOnScreen()) === insaneOct);

  // -- puzzle du jour : même code à chaque ouverture, et c'est celui qui est joué
  await home();
  await sleep(300);
  const daily = await mod(`m.dailyCode(m.localDate(), { shape: 'hex', size: 4, colors: 6, insane: false })`);
  await ev(`document.getElementById('b-new').click()`);
  await sleep(200);
  check('puzzle du jour : code du jour attaché au bouton', (await ev(`document.getElementById('ng-daily').dataset.code`)) === daily);
  await ev(`document.getElementById('ng-daily').click()`);
  await sleep(600);
  check('puzzle du jour : la partie porte le code du jour', (await codeOnScreen()) === daily);
  const dailyLabels = await trayLabels();
  await home();
  await sleep(200);
  await ev(`document.getElementById('b-new').click(); document.getElementById('ng-daily').click()`);
  await sleep(600);
  check('puzzle du jour : même plateau à chaque fois', (await trayLabels()) === dailyLabels);

  // -- abandon : une partie en cours (sauvegardée) demande confirmation
  await ev(`(() => { const t = document.querySelector('#tray .tile'); })()`);
  const src = await centreOf('#tray .slot', 0);
  const dst = await centreOf('#target .slot', 0);
  await drag(src, dst); // un coup : la partie est sauvegardée
  await home();
  await sleep(300);
  check('« Continuer » proposé après un coup', await ev(`!document.getElementById('b-continue').hidden`));
  await ev(`document.getElementById('b-new').click(); document.getElementById('ng-random').click()`);
  await sleep(200);
  check('abandon : confirmation demandée', await ev(`document.getElementById('abandon').open`));
  await ev(`document.getElementById('abandon-no').click()`);
  await sleep(200);
  check('abandon refusé : on reste à l\'accueil, la partie est conservée', await ev(`location.hash === '' && !document.getElementById('b-continue').hidden && !!localStorage.getItem('tx.save')`));
  await ev(`document.getElementById('b-new').click(); document.getElementById('ng-random').click(); document.getElementById('abandon-yes').click()`);
  await sleep(600);
  const code2 = await codeOnScreen();
  check('abandon accepté : nouvelle partie, nouveau code', !!code2 && code2 !== daily && (await ev(`location.hash === '#game'`)));

  // -- statistiques : parties commencées comptées, partie gagnée enregistrée avec son code
  const started = await ev(`JSON.parse(localStorage.getItem('tx.stats')).started`);
  check('parties commencées comptées', started >= 5, String(started));
  const win = {
    v: 1, elapsedMs: 5000,
    puzzle: { size: 2, colors: 5, tiles: [[0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0]], cells: [[0, 1], [2, -1], [3, -1], [-1, -1]], started: true, insane: false, code: await mod(`m.makeCode({ shape: 'carre', size: 2, colors: 5, insane: false }, '7K3F9A2')`) },
  };
  await reloadWith({ 'tx.save': win, 'tx.stats': { v: 1, started: 3, games: [{ d: '2026-10-15', t: 61000, s: 'carre', n: 2, k: 5, i: 0, c: null }] } }, { shape: 'carre', size: 2, colors: 5, insane: false, family: 'epure', mode: 'clair', lang: 'fr' });
  await ev(`document.getElementById('b-continue').click()`);
  await sleep(500);
  await drag(await centreOf('#tray .slot', 0), await centreOf('#target .slot', 3));
  check('victoire : le code du puzzle est rappelé dans le message', await ev(`document.getElementById('win').open && document.getElementById('win-text').textContent.includes(${JSON.stringify(win.puzzle.code)})`), await ev(`document.getElementById('win-text').textContent`));
  const rec = await ev(`document.getElementById('win-text').textContent`);
  check('victoire : premier temps de la configuration = record', /record/i.test(rec), rec);
  await ev(`document.getElementById('win-menu').click()`);
  await sleep(300);
  await ev(`location.hash = 'stats'`);
  await sleep(300);
  const st = await ev(`document.getElementById('stats-body').innerText.replace(/\\s+/g, ' ')`);
  check('statistiques : 2 parties gagnées, 3 commencées', /Parties gagnées 2/.test(st) && /Parties commencées 3/.test(st), st);
  check('statistiques : la dernière partie affiche son code', st.includes(win.puzzle.code), st);
  await shot('8-statistiques-apres-victoire');
  // réinitialisation : vide, et les anciens temps ne reviennent pas
  await ev(`document.getElementById('stats-reset').click()`);
  await sleep(200);
  await ev(`document.getElementById('confirm-yes').click()`);
  await sleep(200);
  check('statistiques effacées', await ev(`/Aucune partie gagnée/.test(document.getElementById('stats-body').innerText) && document.getElementById('stats-reset').hidden`));
});

const failed = results.filter((r) => !r[0]).length;
console.log(`\n${failed} échec(s) sur ${results.length} contrôle(s)`);
process.exitCode = failed ? 1 : 0;
cleanup();
