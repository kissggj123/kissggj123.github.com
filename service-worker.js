// Service Worker 文件名：service-worker.js

// 定义缓存名称和要缓存的静态资产列表
const CACHE_NAME = 'xp7-charge-calculator-v4.2.0'; // 更新缓存版本
const urlsToCache = [
    '/',
    '/xpeng.html', // 指向您的主HTML文件
    '/manifest.json', // PWA 清单文件
    'https://cdn.tailwindcss.com', // Tailwind CSS CDN
    'https://cdn.jsdelivr.net/npm/chart.js', // Chart.js CDN
    'https://fonts.googleapis.com/css2?family=VT323&display=swap', // Google Fonts CSS
    'https://fonts.gstatic.com/s/vt323/v15/pxiKyp4_oDkzvihvLwz.woff2' // VT323 font file
];

// 安装 Service Worker 并缓存所有静态资产
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                // 使用 addAll 来缓存所有文件，确保原子性
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Failed to open cache or add all URLs:', error);
            })
    );
});

// 激活 Service Worker，清除旧的缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 拦截网络请求，实现缓存优先策略
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 如果缓存中存在请求，则直接返回缓存的响应
                if (response) {
                    return response;
                }
                // 否则，从网络中获取资源
                return fetch(event.request)
                    .then((networkResponse) => {
                        // 检查响应是否有效
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        // 克隆响应，因为响应流只能被消费一次
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache); // 将新的资源添加到缓存
                            });
                        return networkResponse;
                    })
                    .catch(() => {
                        // 如果网络请求失败且没有缓存，可以返回一个离线页面
                        // 这里可以根据您的需求添加一个离线页面
                        console.log('Network request failed and no cache found for:', event.request.url);
                        // For API calls, if no cache and offline, returning null might be better
                        // For static assets, you could serve an offline fallback
                        if (event.request.mode === 'navigate') {
                            // Example: return caches.match('/offline.html');
                            // For this app, simply let it fail gracefully
                            return new Response('<h1>离线页面</h1><p>请检查您的网络连接。</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
                        }
                        return null; // For other types of requests (e.g., data fetching)
                    });
            })
    );
});
