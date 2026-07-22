/* KitchenLogic OS — service worker.
   Must live next to index.html in the GitHub Pages repo.
   index.html registers it as ./sw.js?v=<build-id>; the query string versions
   the cache, so pushing a new build automatically clears the old cache.
   Strategy: network-first for page navigations (updates show fast),
   cache-first for everything else (fonts, images). */

var CACHE = 'kl-cache-' + (self.location.search || 'v1');

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.add('./').catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  // Network-first for navigations so a new build shows on next load.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var clone = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        return r;
      }).catch(function () {
        return caches.match(e.request).then(function (r) {
          return r || caches.match('./') || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Cache-first for static assets.
  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var clone = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});
