const CACHE_NAME = 'smart-class-6-pwa-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// The current app uses these online resources. When the app is first opened
// with internet, the service worker attempts to cache them so they can be
// served later while offline. The app itself does not depend on a server for
// its saved data: localStorage remains on the device.
const OPTIONAL_REMOTE_ASSETS = [
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);

    await Promise.allSettled(
      OPTIONAL_REMOTE_ASSETS.map(async url => {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) await cache.put(url, response.clone());
        } catch (_) {}
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const url = new URL(request.url);
        const sameOrigin = url.origin === self.location.origin;
        const knownRemote = OPTIONAL_REMOTE_ASSETS.includes(request.url);
        if (sameOrigin || knownRemote) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
      }
      return response;
    } catch (_) {
      if (request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
