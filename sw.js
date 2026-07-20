const CACHE_NAME = 'work-time-recorder-v17';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/config.js',
  '/vendor/cloudbase.js',
  '/auth.js',
  '/data-store.js',
  '/sync-engine.js',
  '/cloud-ui.js',
  '/script.js',
  '/manifest.json'
];

const NETWORK_FIRST_PATHS = new Set([
  '/',
  '/index.html',
  '/config.js',
  '/auth.js',
  '/cloud-ui.js',
  '/sync-engine.js',
  '/data-store.js',
  '/script.js'
]);

function shouldUseNetworkFirst(url) {
  return NETWORK_FIRST_PATHS.has(url.pathname);
}

async function cacheResponse(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return;
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// HTML/JS 走 network-first，避免开发时缓存旧版本
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (shouldUseNetworkFirst(url)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          await cacheResponse(event.request, response);
          return response;
        } catch (err) {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          throw err;
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      try {
        const response = await fetch(event.request);
        await cacheResponse(event.request, response);
        return response;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })()
  );
});
