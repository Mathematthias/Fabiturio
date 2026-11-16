/* Service Worker: legt das ganze Spiel beim ersten Aufruf ab, danach laeuft es
   ohne Netz. Neue Fassung = neue VERSION, dann raeumt der Worker den alten
   Speicher weg. Wird nur ueber https oder localhost aktiv. */
const VERSION = 'fab-2026-11-16-b74c268d';
const DATEIEN = [
  './', './index.html', './kapitel1.html', './kapitel2.html', './kapitel3.html',
  './steigerbuch_k3.pdf', './auswertung.html',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './apple-touch-icon.png', './favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Erst der Speicher, dann das Netz: das Spiel startet auch im Funkloch.
   Was aus dem Netz kommt, wandert in den Speicher fuer das naechste Mal. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)
    .then(res => {
      if (res && res.ok && res.type === 'basic') {
        const kopie = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, kopie));
      }
      return res;
    })
    .catch(() => caches.match('./index.html'))));
});
