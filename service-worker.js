// Service Worker - Bunny CC v7.8.5.9440 (GitHub Pages & Custom Domain Optimized)
const CACHE_VERSION = 'v7.8.5.9440';
const CACHE_NAME = `bunny-cc-${CACHE_VERSION}`;
const RUNTIME_CACHE = `bunny-cc-runtime-${CACHE_VERSION}`;

// GitHub Pages scope resolution (supports custom domains, github.io root, and repo subpaths)
const SCOPE_BASE = self.registration ? self.registration.scope : self.location.href.replace(/service-worker\.js.*$/, '');
const RELATIVE_CORE_ASSETS = [
    '',
    'index.html',
    'car.html',
    'car.css',
    'manifest.json',
    'manifest-car.json',
    'favicon.ico',
    'dist/Bunny CC_Profile.JPG',
    'icon/16.png', 'icon/32.png', 'icon/48.png', 'icon/64.png',
    'icon/72.png', 'icon/96.png', 'icon/128.png', 'icon/144.png',
    'icon/192.png', 'icon/256.png', 'icon/300.png', 'icon/512.png',
    'icon/1024.png', 'icon/icon.png',
    'wallpaper/manifest.json',
    'wallpaper/placeholders.json',
    'wallpaper/Starlight210128.opt.jpg',
    'wallpaper/Starlight210128.min.b64.p1',
    'wallpaper/Starlight210128.min.b64.p2',
    'wallpaper/Starlight210128.min.b64.p3',
    'wallpaper/Starlight210128.min.b64.p4',
    'wallpaper/1126942.opt.jpg',
    'wallpaper/1126942.min.b64.p1',
    'wallpaper/1126942.min.b64.p2',
    'wallpaper/1126942.min.b64.p3',
    'wallpaper/IMG_2833.opt.jpg',
    'wallpaper/IMG_2833.min.b64.p1',
    'wallpaper/IMG_2833.min.b64.p2',
    'wallpaper/IMG_2833.min.b64.p3',
    'wallpaper/IMG_2833.min.b64.p4',
    'wallpaper/1204143.opt.jpg',
    'wallpaper/177002252600796.opt.jpg',
    'wallpaper/177002254500-200.opt.jpg',
    'wallpaper/2560x1600-61829-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.opt.jpg',
    'wallpaper/2560x1600-61834-May-It-Takes-Two-Cody-It-Takes-TwoCody-It-Takes.opt.jpg',
    'wallpaper/61b5bd7f37541.opt.jpg',
    'wallpaper/61b5bd7f375412.opt.jpg',
    'wallpaper/8736.opt.jpg',
    'wallpaper/9f794a9a-d3cb-46ec-9dcd-6bbfc0bff027.opt.jpg',
    'wallpaper/hollow_knight.opt.jpg',
    'wallpaper/hollow_knight_2.opt.jpg',
];
const CORE_ASSETS = RELATIVE_CORE_ASSETS.map(path => new URL(path, SCOPE_BASE).href);

// Old cache versions to force-purge (ensures icon refresh & cache invalidation)
const OLD_CACHE_PATTERNS = [
    'bunny-cc-v7.8.4.9430', 'bunny-cc-runtime-v7.8.4.9430',
    'bunny-cc-v7.8.4.9420', 'bunny-cc-runtime-v7.8.4.9420',
    'bunny-cc-v7.8.3.9393', 'bunny-cc-runtime-v7.8.3.9393',
    'bunny-cc-v7.8.3.9392', 'bunny-cc-runtime-v7.8.3.9392',
    'bunny-cc-v7.8.3.9391', 'bunny-cc-runtime-v7.8.3.9391',
    'bunny-cc-v7.8.3.9390', 'bunny-cc-runtime-v7.8.3.9390',
    'bunny-cc-v7.8.1.9367', 'bunny-cc-runtime-v7.8.1.9367',
    'bunny-cc-v7.8.1.9366', 'bunny-cc-runtime-v7.8.1.9366',
    'bunny-cc-v7.8.1.9365', 'bunny-cc-runtime-v7.8.1.9365',
    'bunny-cc-v7.8.1.9364', 'bunny-cc-runtime-v7.8.1.9364',
    'bunny-cc-v7.8.1.9363', 'bunny-cc-runtime-v7.8.1.9363',
    'bunny-cc-v7.8.1.9362', 'bunny-cc-runtime-v7.8.1.9362',
    'bunny-cc-v7.8.1.9361', 'bunny-cc-runtime-v7.8.1.9361',
    'bunny-cc-v7.8.1.9360', 'bunny-cc-runtime-v7.8.1.9360',
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

    // Force network-first for icon files, manifest and favicon (bypass cache to ensure fresh icons)
    const pathname = url.pathname;
    if (pathname.includes('/icon/') || pathname.endsWith('/favicon.ico') || pathname.endsWith('/manifest.json')) {
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

    // Navigation requests: Fast network-with-timeout (1500ms) with instant cache fallback
    // In mainland China without proxy, GitHub Pages connections often stall for 15-30s.
    // By timing out after 1.5s and immediately serving the cached index/car HTML,
    // we eliminate the white-screen freeze completely while allowing background updates!
    if (req.mode === 'navigate') {
        event.respondWith(
            new Promise((resolve) => {
                let resolved = false;
                const timeoutId = setTimeout(async () => {
                    if (!resolved) {
                        resolved = true;
                        const cached = await caches.match(req);
                        if (cached) return resolve(cached);
                        const fallbackUrl = (pathname.endsWith('car.html') || pathname.includes('/car'))
                            ? new URL('car.html', SCOPE_BASE).href
                            : new URL('index.html', SCOPE_BASE).href;
                        const fallback = await caches.match(fallbackUrl);
                        if (fallback) return resolve(fallback);
                        const rootFallback = await caches.match(SCOPE_BASE);
                        if (rootFallback) return resolve(rootFallback);
                    }
                }, 1500);

                fetch(req).then(resp => {
                    clearTimeout(timeoutId);
                    if (!resolved) {
                        resolved = true;
                        const clone = resp.clone();
                        caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
                        resolve(resp);
                    } else {
                        // Background update runtime cache
                        const clone = resp.clone();
                        caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
                    }
                }).catch(async (err) => {
                    clearTimeout(timeoutId);
                    if (!resolved) {
                        resolved = true;
                        const cached = await caches.match(req);
                        if (cached) return resolve(cached);
                        const fallbackUrl = (pathname.endsWith('car.html') || pathname.includes('/car'))
                            ? new URL('car.html', SCOPE_BASE).href
                            : new URL('index.html', SCOPE_BASE).href;
                        const fallback = await caches.match(fallbackUrl);
                        if (fallback) return resolve(fallback);
                        const rootFallback = await caches.match(SCOPE_BASE);
                        if (rootFallback) return resolve(rootFallback);
                        resolve(new Response('Offline - No cache available', { status: 503 }));
                    }
                });
            })
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
    const iconUrl = new URL('icon/192.png', SCOPE_BASE).href;
    const badgeUrl = new URL('icon/96.png', SCOPE_BASE).href;
    event.waitUntil(
        self.registration.showNotification(data.title || '🐰 兔可可王国', {
            body: data.body,
            icon: iconUrl,
            badge: badgeUrl,
            tag: data.tag || 'bunny-cc-push',
            vibrate: [200, 100, 200],
            data: { url: data.url ? new URL(data.url, SCOPE_BASE).href : SCOPE_BASE },
        })
    );
});

// === Notification click — focus or open the app ===
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || SCOPE_BASE;
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
