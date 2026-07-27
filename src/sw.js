/**
 * Utrecht Voor Jou — Service Worker
 *
 * Lets someone look up a benefit at the counter with no signal, after having
 * opened it earlier on library Wi-Fi. Deliberately modest: the shell is
 * precached, pages are cached as they are visited. Precaching all 468 generated
 * pages is not an option because each one embeds the whole catalog.
 *
 * Written to dist/sw.js by scripts/build.js, which substitutes CACHE_VERSION so
 * every deploy retires the previous cache.
 */

const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = 'utrecht-voor-jou-' + CACHE_VERSION;

// Resolved against the service worker location, which is the site root even on
// a GitHub Pages project subpath.
const SHELL = [
  './',
  './css/styles.css',
  './js/catalog.js',
  './js/checker.js',
  './js/i18n-selector.js',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // A single missing shell entry must not abort the install, or the whole
      // worker never activates.
      .then(cache => Promise.allSettled(SHELL.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: prefer the network so a corrected benefit is seen immediately, and
  // fall back to the cached copy when there is no connection.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('./'))
        )
    );
    return;
  }

  // Assets: serve from cache at once, refresh in the background.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
