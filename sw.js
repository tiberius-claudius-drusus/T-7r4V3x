/*
 * T-7r4V3x — service worker : fonctionnement hors ligne.
 * Copyright (C) 2026 Drusus (Gens Claudia). Licence : GPL-2.0-or-later (voir LICENSE.txt).
 *
 * Mise en cache de tous les fichiers à l'installation, puis « cache d'abord ». Le nom du cache porte la version :
 * une nouvelle version crée un nouveau cache et supprime les anciens. VERSION doit rester égale à src/version.js
 * (test test/pwa.test.js). Un service worker classique ne peut pas importer ce module : la valeur est répétée ici.
 */
'use strict';

const VERSION = '1.0.1';
const CACHE = `t7r4v3x-${VERSION}`;
const FILES = [
  './',
  'index.html',
  'app.js',
  'manifest.webmanifest',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'LICENSE.txt',
  'src/code.js',
  'src/geopuzzle.js',
  'src/geoview.js',
  'src/icons.js',
  'src/lang/index.js',
  'src/lang/ar.js',
  'src/lang/de.js',
  'src/lang/en.js',
  'src/lang/es.js',
  'src/lang/hi.js',
  'src/lang/id.js',
  'src/lang/it.js',
  'src/lang/ja.js',
  'src/lang/ko.js',
  'src/lang/la.js',
  'src/lang/nl.js',
  'src/lang/pl.js',
  'src/lang/pt-br.js',
  'src/lang/pt-pt.js',
  'src/lang/ru.js',
  'src/lang/tr.js',
  'src/lang/uk.js',
  'src/lang/vi.js',
  'src/lang/zh.js',
  'src/logo.js',
  'src/puzzle.js',
  'src/stats.js',
  'src/strings.js',
  'src/themes.js',
  'src/version.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('t7r4v3x-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit
      || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
