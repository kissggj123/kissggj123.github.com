// Service Worker - Bunny CC 兔可可之城
// Version: 1.2.2 NEXUS_TAB_TRON

const CACHE_NAME = 'bunny-cc-nexus-v1.2.2';
const RUNTIME_CACHE = 'bunny-cc-runtime-v1.2.2';

// 核心静态资产 - 仅缓存同源资源
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/img/logo.svg',
    '/icon/192.png',
    '/icon/300.png',
    '/icon/logo.svg',
    '/favicon.ico'
];

// 安装 Service Worker - 仅缓存同源核心资产
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[BunnyCC SW] Caching same-origin core assets');
                return Promise.allSettled(
                    CORE_ASSETS.map(url =>
                        cache.add(url).catch(err =>
                            console.warn(`[BunnyCC SW] Failed to cache: ${url}`, err.message)
                        )
                    )
                );
            })
            .then(() => {
                console.log('[BunnyCC SW] Install complete, skipping waiting');
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
            console.log('[BunnyCC SW] Activated, claiming clients');
            return self.clients.claim();
        })
    );
});

// 请求策略：
// - 导航请求：网络优先，失败回退缓存
// - 同源静态资产：缓存优先，后台更新
// - 跨域 CDN 请求：直接透传，不拦截 (避免 opaque response 错误)
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // 仅处理 GET 请求
    if (request.method !== 'GET') return;

    let url;
    try {
        url = new URL(request.url);
    } catch (e) {
        return;
    }

    // 跳过非 HTTP(S) 协议
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    // 跨域请求：直接透传，不拦截 (避免 opaque response 错误)
    if (url.origin !== self.location.origin) return;

    // 导航请求：网络优先，失败回退到缓存或 index.html
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

    // 同源静态资产：缓存优先，后台更新 (stale-while-revalidate)
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
                // 缓存未命中，从网络获取
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
                    // 离线时为图片提供 SVG 占位符
                    if (request.destination === 'image') {
                        return new Response(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#050a14"/><text x="32" y="36" font-size="28" text-anchor="middle">🐰</text></svg>',
                            { headers: { 'Content-Type': 'image/svg+xml' } }
                        );
                    }
                });
            })
    );
});

// 消息通信 - 支持前端触发更新
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
