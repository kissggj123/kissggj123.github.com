// Service Worker - Bunny CC v7.8.1.9360
const CACHE_VERSION = 'v7.8.1.9360';
const CACHE_NAME = `bunny-cc-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bunny-cc-runtime-${CACHE_VERSION}`;
const CORE_ASSETS = [
    '/', '/index.html', '/manifest.json', '/favicon.ico',
    '/icon/16.png', '/icon/32.png', '/icon/48.png', '/icon/64.png',
    '/icon/72.png', '/icon/96.png', '/icon/128.png', '/icon/144.png',
    '/icon/192.png', '/icon/256.png', '/icon/300.png', '/icon/512.png',
    '/icon/1024.png', '/icon/icon.png',
    '/dist/Bunny%20CC_Profile.JPG'
];

// Old cache versions to force-purge (ensures icon refresh)
const OLD_CACHE_PATTERNS = [
    'bunny-cc-v7.8.1.9359', 'bunny-cc-runtime-v7.8.1.9359',
    'bunny-cc-v7.8.1.9358', 'bunny-cc-runtime-v7.8.1.9358',
    'bunny-cc-v7.8.1.9357', 'bunny-cc-runtime-v7.8.1.9357',
    'bunny-cc-v7.8.1.9356', 'bunny-cc-runtime-v7.8.1.9356',
    'bunny-cc-v7.8.1.9355', 'bunny-cc-runtime-v7.8.1.9355',
    'bunny-cc-v7.8.1.9354', 'bunny-cc-runtime-v7.8.1.9354',
    'bunny-cc-v7.8.1.9353', 'bunny-cc-runtime-v7.8.1.9353',
    'bunny-cc-v7.8.1.9352', 'bunny-cc-runtime-v7.8.1.9352',
    'bunny-cc-v7.8.1.9351', 'bunny-cc-runtime-v7.8.1.9351',
    'bunny-cc-v7.8.1.9350', 'bunny-cc-runtime-v7.8.1.9350',
    'bunny-cc-v7.8.1.9349', 'bunny-cc-runtime-v7.8.1.9349',
    'bunny-cc-v7.8.1.9348', 'bunny-cc-runtime-v7.8.1.9348',
    'bunny-cc-v7.8.1.9347', 'bunny-cc-runtime-v7.8.1.9347',
    'bunny-cc-v7.8.0.9320', 'bunny-cc-runtime-v7.8.0.9320',
    'bunny-cc-v7.8.1.9346', 'bunny-cc-runtime-v7.8.1.9346',
    'bunny-cc-v7.8.0.9320', 'bunny-cc-runtime-v7.8.0.9320',
    'bunny-cc-v7.8.0.9321', 'bunny-cc-runtime-v7.8.0.9321',
    'bunny-cc-v7.8.0.9322', 'bunny-cc-runtime-v7.8.0.9322',
    'bunny-cc-v7.8.0.9323', 'bunny-cc-runtime-v7.8.0.9323',
    'bunny-cc-v7.8.0.9324', 'bunny-cc-runtime-v7.8.0.9324',
    'bunny-cc-v7.8.0.9325', 'bunny-cc-runtime-v7.8.0.9325',
    'bunny-cc-v7.8.0.9326', 'bunny-cc-runtime-v7.8.0.9326',
    'bunny-cc-v7.8.0.9327', 'bunny-cc-runtime-v7.8.0.9327',
    'bunny-cc-v7.8.1.9328', 'bunny-cc-runtime-v7.8.1.9328',
    'bunny-cc-v7.8.1.9329', 'bunny-cc-runtime-v7.8.1.9329',
    'bunny-cc-v7.8.1.9330', 'bunny-cc-runtime-v7.8.1.9330',
    'bunny-cc-v7.8.1.9333', 'bunny-cc-runtime-v7.8.1.9333',
    'bunny-cc-v7.8.1.9334', 'bunny-cc-runtime-v7.8.1.9334',
    'bunny-cc-v7.8.1.9338', 'bunny-cc-runtime-v7.8.1.9338',
    'bunny-cc-v7.8.1.9342', 'bunny-cc-runtime-v7.8.1.9342',
    'bunny-cc-v7.8.1.9343', 'bunny-cc-runtime-v7.8.1.9343',
    'bunny-cc-v7.8.1.9344', 'bunny-cc-runtime-v7.8.1.9344',
    'bunny-cc-v7.8.1.9345', 'bunny-cc-runtime-v7.8.1.9345',
    'bunny-cc-v7.8.1.9341', 'bunny-cc-runtime-v7.8.1.9341',
    'bunny-cc-v7.8.1.9340', 'bunny-cc-runtime-v7.8.1.9340',
    'bunny-cc-v7.8.1.9339', 'bunny-cc-runtime-v7.8.1.9339',
    'bunny-cc-v7.8.1.9337', 'bunny-cc-runtime-v7.8.1.9337',
    'bunny-cc-v7.8.1.9336', 'bunny-cc-runtime-v7.8.1.9336',
    'bunny-cc-v7.8.1.9335', 'bunny-cc-runtime-v7.8.1.9335',
    'bunny-cc-v7.8.1.9332', 'bunny-cc-runtime-v7.8.1.9332',
    'bunny-cc-v7.8.1.9331', 'bunny-cc-runtime-v7.8.1.9331',
    'bunny-cc-v7.7.2.9312', 'bunny-cc-runtime-v7.7.2.9312',
    'bunny-cc-v7.7.2.9305', 'bunny-cc-runtime-v7.7.2.9305',
    'bunny-cc-v7.7.2.9306', 'bunny-cc-runtime-v7.7.2.9306',
    'bunny-cc-v7.7.2.9307', 'bunny-cc-runtime-v7.7.2.9307',
    'bunny-cc-v7.7.2.9308', 'bunny-cc-runtime-v7.7.2.9308',
    'bunny-cc-v7.7.2.9310', 'bunny-cc-runtime-v7.7.2.9310',
    'bunny-cc-v7.7.2.9311', 'bunny-cc-runtime-v7.7.2.9311',
    'bunny-cc-v7.7.2.9309', 'bunny-cc-runtime-v7.7.2.9309',
    'bunny-cc-v7.7.1', 'bunny-cc-runtime-v7.7.1',
    'bunny-cc-v7.7.0', 'bunny-cc-runtime-v7.7.0',
    'bunny-cc-v7.6.0', 'bunny-cc-runtime-v7.6.0',
    'bunny-cc-v7.5.0', 'bunny-cc-runtime-v7.5.0',
    'bunny-cc-v7.4.0', 'bunny-cc-runtime-v7.4.0',
    'bunny-cc-v7.3.0', 'bunny-cc-runtime-v7.3.0',
    'bunny-cc-v7.2.0', 'bunny-cc-runtime-v7.2.0',
    'bunny-cc-v7.1.0', 'bunny-cc-runtime-v7.1.0',
    'bunny-cc-v7.0.0', 'bunny-cc-runtime-v7.0.0',
    'bunny-cc-v6.4.0', 'bunny-cc-runtime-v6.4.0',
    'bunny-cc-v6.3.0', 'bunny-cc-runtime-v6.3.0',
    'bunny-cc-v6.2.0', 'bunny-cc-runtime-v6.2.0',
    'bunny-cc-v6.1.0', 'bunny-cc-runtime-v6.1.0',
    'bunny-cc-v6.0.0', 'bunny-cc-runtime-v6.0.0',
    'bunny-cc-v5.2.0', 'bunny-cc-runtime-v5.2.0',
    'bunny-cc-v5.1.0', 'bunny-cc-runtime-v5.1.0',
    'bunny-cc-v5.0.0', 'bunny-cc-runtime-v5.0.0',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                CORE_ASSETS.map(url => cache.add(url).catch(() => {}))
            );
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => Promise.all(
            names.map(n => {
                // Delete any cache that isn't the current version
                if (n !== CACHE_NAME && n !== RUNTIME_CACHE) {
                    return caches.delete(n);
                }
                return null;
            })
        )).then(() => {
            // Force-claim all clients to activate new SW immediately
            return self.clients.claim();
        }).then(() => {
            // Notify all clients to reload for fresh content
            return self.clients.matchAll({ type: 'window' });
        }).then((clients) => {
            clients.forEach(client => {
                client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    let url;
    try { url = new URL(req.url); } catch(e) { return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== self.location.origin) return;

    // Force network-first for icon files (bypass cache to ensure fresh icons)
    if (url.pathname.startsWith('/icon/') || url.pathname === '/favicon.ico' || url.pathname === '/manifest.json') {
        event.respondWith(
            fetch(req).then(resp => {
                if (resp && resp.status === 200) {
                    const clone = resp.clone();
                    caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
                }
                return resp;
            }).catch(() => caches.match(req).then(r => r || new Response('', { status: 504, statusText: 'Gateway Timeout' })))
        );
        return;
    }

    // Navigation requests: network-first with cache fallback
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).then(resp => {
                const clone = resp.clone();
                caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
                return resp;
            }).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
        );
        return;
    }

    // Static assets: stale-while-revalidate
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) {
                fetch(req).then(resp => {
                    if (resp && resp.status === 200)
                        caches.open(RUNTIME_CACHE).then(c => c.put(req, resp.clone()));
                }).catch(() => {});
                return cached;
            }
            return fetch(req).then(resp => {
                if (!resp || resp.status !== 200) return resp;
                const clone = resp.clone();
                caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
                return resp;
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// === Push notifications ===
self.addEventListener('push', (event) => {
    let data = { title: '🐰 兔可可王国', body: '你有一条新消息' };
    try {
        if (event.data) data = event.data.json();
    } catch(e) {
        if (event.data) data.body = event.data.text();
    }
    event.waitUntil(
        self.registration.showNotification(data.title || '🐰 兔可可王国', {
            body: data.body,
            icon: '/icon/192.png',
            badge: '/icon/96.png',
            tag: data.tag || 'bunny-cc-push',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/' },
        })
    );
});

// === Notification click — focus or open the app ===
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Focus existing window if found
            for (const client of clients) {
                if (client.url.includes(self.location.origin)) {
                    return client.focus();
                }
            }
            // Otherwise open new window
            return self.clients.openWindow(targetUrl);
        })
    );
});

// === Periodic background sync (if supported) — refresh cache for offline ===
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'bunny-cc-refresh') {
        event.waitUntil(
            caches.open(RUNTIME_CACHE).then((cache) => {
                return Promise.allSettled(
                    CORE_ASSETS.map(url => fetch(url).then(resp => {
                        if (resp && resp.status === 200) cache.put(url, resp.clone());
                    }).catch(() => {}))
                );
            })
        );
    }
});
