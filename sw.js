const CACHE_NAME = 'tavern-hub-v' + Date.now();

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // 强制网络优先 (Network First)，绝不读取本地 PWA 离线死缓存！
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
