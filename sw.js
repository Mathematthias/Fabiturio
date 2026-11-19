/* Service Worker: legt das ganze Spiel beim ersten Aufruf ab, danach laeuft es
   ohne Netz. Wird nur ueber https oder localhost aktiv.

   Seit 2026-11-17 gilt: MIT NETZ IMMER FRISCH. Jede Seite kommt zuerst vom Server
   (der Browser fragt nur nach, ob sich etwas geaendert hat) und wandert in den
   Speicher; ohne Netz - oder wenn der Server laenger als drei Sekunden schweigt -
   kommt sie aus dem Speicher. Vorher kam alles zuerst aus dem Speicher: Nach einem
   Upload spielte man beim ersten Aufruf noch die alte Fassung.
   Neue Fassung = neue VERSION, dann raeumt der Worker den alten Speicher weg. */
const VERSION = 'fab-2026-11-19-a7b98a70';
const DATEIEN = [
  './', './index.html', './kapitel1.html', './kapitel2.html', './kapitel3.html', './kapitel4.html', './kapitel5.html',
  './steigerbuch_k3.pdf', './auswertung.html',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './apple-touch-icon.png', './favicon.png'
];
const GEDULD = 3000;      // Millisekunden, bis statt des Servers der Speicher antwortet

self.addEventListener('install', e => {
  // cache: 'reload' - am Zwischenspeicher des Browsers vorbei, sonst landet dort Abgelegtes im neuen Speicher
  // Jede Datei einzeln: Fehlt eine im Repo (ein Kapitel ist noch nicht hochgeladen), darf das den neuen Worker
  // nicht aufhalten. Mit addAll scheiterte sonst die ganze Installation, und die Geraete blieben fuer immer
  // bei der alten Fassung (so geschehen am 2026-11-17: kapitel4.html und kapitel5.html lagen nicht im Repo).
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(DATEIEN.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function ausSpeicher(req) {
  return caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(new Promise(fertig => {
    let erledigt = false;
    const antworte = r => { if (!erledigt) { erledigt = true; clearTimeout(uhr); fertig(r); } };
    const uhr = setTimeout(() => antworte(ausSpeicher(e.request)), GEDULD);
    fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const kopie = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, kopie));
          antworte(res);
        } else antworte(ausSpeicher(e.request).then(hit => hit || res));
      })
      .catch(() => antworte(ausSpeicher(e.request)));
  }));
});
