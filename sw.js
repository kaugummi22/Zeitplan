// Zeitplan: die App selbst (nicht Ihre Daten) wird auf dem Gerät zwischengespeichert, damit sie auch ohne Internet startet.
// Immer zuerst aus dem Netz (neueste Version), nur ohne Verbindung aus dem Zwischenspeicher.
var CACHE = 'zeitplan-app-v1';
var SHELL = ['./', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon.ico'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).catch(function () {}));
});
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  var base = new URL('./', self.registration.scope).pathname;
  var rel = url.pathname.slice(base.length);
  if (url.pathname.indexOf(base) !== 0 || rel.indexOf('pdf/') === 0 || rel.indexOf('umfrage/') === 0) return; // PDF-App und Abstimmungsseite nicht zwischenspeichern
  var key = req.mode === 'navigate' || rel === '' || rel === 'index.html' ? './' : req;
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      if (res.ok && (key === './' || SHELL.indexOf(rel) >= 0)) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(key === './' ? new Request(base) : req, cp); }); }
      return res;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) { return c.match(key === './' ? new Request(base) : req, { ignoreSearch: key === './' }); }).then(function (r) { return r || Response.error(); });
    })
  );
});
