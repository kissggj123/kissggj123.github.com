// Service Worker - Bunny CC v6.1.0
const CACHE_VERSION = 'v6.1.0';
const CACHE_NAME = `bunny-cc-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bunny-cc-runtime-${CACHE_VERSION}`;
const CORE_ASSETS = [
    '/', '/index.html', '/manifest.json', '/favicon.ico',
    '/icon/16.png', '/icon/32.png', '/icon/48.png', '/icon/64.png',
    '/icon/72.png', '/icon/96.png', '/icon/128.png', '/icon/144.png',
    '/icon/192.png', '/icon/256.png', '/icon/300.png', '/icon/512.png',
    '/icon/1024.png', '/icon/icon.png'
];

// Old cache versions to force-purge (ensures icon refresh)
const OLD_CACHE_PATTERNS = [
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
            // Notify all clients to reload for fresh icons
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
            }).catch(() => caches.match(req).then(r => r || fetch(req)))
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
