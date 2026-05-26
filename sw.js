const CACHE_NAME = 'work-time-recorder-v1';
const urlsToCache = [
  '/work-time-recorder/',
  '/work-time-recorder/index.html',
  '/work-time-recorder/style.css',
  '/work-time-recorder/script.js',
  '/work-time-recorder/manifest.json'
];

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
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
        });
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截 - Stale-While-Revalidate（优先返回缓存，同时后台更新）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cached) => {
        const fetched = fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached);
        return cached || fetched;
      });
    })
  );
});