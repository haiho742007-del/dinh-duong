/* Service Worker – sinh tự động khi build (vite.config.ts). Không sửa tệp sw.js trong dist. */
/* eslint-disable no-restricted-globals */
const CACHE_PREFIX = 'nd-app-';
const VERSION = "1.0.0-1673e4c9ca";
const APP_VERSION = "1.0.0";
const CACHE_NAME = CACHE_PREFIX + VERSION;
const PRECACHE = [
  "./",
  "./assets/index-BDrgQtFf.css",
  "./assets/index-DerlV9Xj.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-32.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest"
];

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  // cache.addAll là nguyên khối: một tệp lỗi thì cài đặt thất bại và bản cũ vẫn chạy.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE.map((p) => new Request(scopeUrl(p), { cache: 'reload' }))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CHECK_CACHE') {
    const port = event.ports && event.ports[0];
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const missing = [];
      for (const p of PRECACHE) {
        const hit = await cache.match(scopeUrl(p));
        if (!hit) missing.push(p);
      }
      const reply = { type: 'CACHE_STATUS', version: VERSION, appVersion: APP_VERSION, total: PRECACHE.length, missing };
      if (port) port.postMessage(reply);
      else if (event.source) event.source.postMessage(reply);
    })();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Ứng dụng một trang dùng định tuyến hash: mọi điều hướng trả về index.html đã cache.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = (await cache.match(scopeUrl('./index.html'))) || (await cache.match(scopeUrl('./')));
        if (cached) return cached;
        return fetch(req);
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      return fetch(req);
    })(),
  );
});
