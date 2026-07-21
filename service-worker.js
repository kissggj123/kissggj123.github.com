// Service Worker - Bunny CC 兔可可之城
// Version: 1.2.0 NEXUS_TAB

const CACHE_NAME = 'bunny-cc-nexus-v1.2.0';
const RUNTIME_CACHE = 'bunny-cc-runtime-v1.2.0';

// 核心静态资产 - 安装时缓存
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/img/logo.svg',
    '/icon/192.png',
    '/icon/300.png',
    '/icon/logo.svg',
    '/favicon.ico',
    // CDN 资源
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://fonts.googleapis.com/css2?family=VT323&display=swap',
    'https://fonts.gstatic.com/s/vt323/v15/pxiKyp4_oDkzvihvLwz.woff2'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[BunnyCC SW] Caching core assets');
                // 使用 addAll 缓存核心资产，允许部分失败
                return Promise.allSettled(
                    CORE_ASSETS.map(url =>
                        cache.add(url).catch(err =>
                            console.warn(`[BunnyCC SW] Failed to cache: ${url}`, err)
                        )
                    )
                );
            })
            .then(() => {
                console.log('[BunnyCC SW] Skip waiting on install');
                return self.skipWaiting();
            })
    );
});

// 激活 Service Worker，清除旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[BunnyCC SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[BunnyCC SW] Claiming clients');
            return self.clients.claim();
        })
    );
});

// 网络优先策略（适用于导航请求），缓存优先（适用于静态资产）
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // 跳过非 GET 请求
    if (request.method !== 'GET') return;

    // 跳过 chrome-extension 和其他特殊协议
    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    // 导航请求：网络优先，失败时回退到缓存
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    const responseToCache = networkResponse.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(request)
                        .then((cachedResponse) => {
                            return cachedResponse || caches.match('/index.html');
                        });
                })
        );
        return;
    }

    // 同源静态资产：缓存优先
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // 后台更新缓存
                        fetch(request).then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(RUNTIME_CACHE).then((cache) => {
                                    cache.put(request, networkResponse.clone());
                                });
                            }
                        }).catch(() => {});
                        return cachedResponse;
                    }
                    return fetch(request).then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        const responseToCache = networkResponse.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                        return networkResponse;
                    }).catch(() => {
                        // 离线回退
                        if (request.destination === 'image') {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0c0a1d"/><text x="32" y="36" font-size="32" text-anchor="middle" fill="#ec4899">🐰</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        }
                    });
                })
        );
        return;
    }

    // 跨域请求（CDN 等）：缓存优先，失败时尝试网络
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                return cachedResponse || fetch(request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    // 只缓存 GET 请求的成功响应
                    const responseToCache = networkResponse.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return networkResponse;
                }).catch(() => cachedResponse);
            })
    );
});

// 消息通信 - 支持前端触发更新
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
