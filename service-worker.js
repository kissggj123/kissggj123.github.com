// Service Worker - Bunny CC
const CACHE_NAME = 'bunny-cc-v4.3.0-final';
const RUNTIME_CACHE = 'bunny-cc-runtime-v4.3.0';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/icon/192.png', '/favicon.ico'];

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
            names.map(n => (n !== CACHE_NAME && n !== RUNTIME_CACHE) ? caches.delete(n) : null)
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    let url;
    try { url = new URL(req.url); } catch(e) { return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== self.location.origin) return;

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
