/* =========================================================================
 * service-worker.js — v10「魔塔档案馆」重构版
 * 职责变更：
 *   · 旧版：预缓存整个 bcos 站点（100+ 资产）
 *   · 新版：仅缓存 car.html（车机锁屏）依赖闭包；新站（魔塔 RPG）路径
 *           全部 passthrough —— 不拦截、不缓存，保证游戏资产永远最新。
 *   · 保留 OVERRIDE 热更新机制（car 模块 override）与 push 通知。
 * ========================================================================= */
'use strict';

const VER = 'v10.0.0.rpg1';
const CACHE_NAME = 'bunny-car-' + VER;
const RUNTIME_CACHE = 'bunny-car-rt-' + VER;
const OVERRIDE_CACHE = 'bunny-cc-overrides-v9';   /* 沿用旧热更新缓存（永不自动清除） */

/* car.html 依赖闭包（仅此列表预缓存） */
const CAR_CORE_ASSETS = [
  './',
  './car.html',
  './car.css',
  './modules.json',
  './manifest-car.json',
  './favicon.ico',
  './js/bcos.js',
  './js/bcos-pkg.js',
  './js/bcos-bootstrap.js',
  './js/screen.js',
  './js/version.js',
  './js/car-app-a.js',
  './js/car-app-b.js',
  './icon/192.png',
  './icon/512.png',
  './wallpaper/manifest.json'
];

/* car 运行时允许缓存的路径前缀（stale-while-revalidate） */
const CAR_RUNTIME_PREFIXES = [
  '/wallpaper/',
  '/icon/',
  '/js/screen',
  '/js/version',
  '/js/car-app-',
  '/js/bcos',
  '/car.css',
  '/modules.json'
];

/* ---- 新站（魔塔 RPG）资产：一律直通，绝不缓存 ---- */
function isNewSiteAsset(url) {
  const p = url.pathname;
  return p === '/' || p === '/index.html' ||
    p.startsWith('/css/') ||
    p.startsWith('/data/') ||
    p.startsWith('/tools/') ||
    /\/js\/(engine|story|ai)\.js$/.test(p);
}

/* ==================== install ==================== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.allSettled(CAR_CORE_ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

/* ==================== activate ==================== */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => {
      /* 保留：当前缓存 + 运行时 + 热更新覆盖 */
      if (n === CACHE_NAME || n === RUNTIME_CACHE || n === OVERRIDE_CACHE) return;
      /* 清掉：旧版全量站缓存（bunny-cc-v*）与旧版本 car 缓存 */
      return caches.delete(n);
    }));
    await self.clients.claim();
  })());
});

/* ==================== fetch ==================== */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* 新站资产：直通（不 respondWith → 浏览器直接走网络，零缓存干扰） */
  if (url.origin === location.origin && isNewSiteAsset(url)) return;

  /* 跨域请求：直通 */
  if (url.origin !== location.origin) return;

  /* 热更新覆盖最高优先级（仅对 car 资产生效） */
  event.respondWith((async () => {
    const override = await caches.open(OVERRIDE_CACHE).then(c => c.match(req));
    if (override) return override;

    /* 导航请求：network-first（1500ms 超时）+ 缓存兜底 */
    if (req.mode === 'navigate') {
      try {
        const net = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))
        ]);
        return net;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./car.html')) || (await cache.match('./')) || Response.error();
      }
    }

    /* car 静态资产：stale-while-revalidate */
    const isCarAsset = CAR_RUNTIME_PREFIXES.some(p => url.pathname.includes(p)) ||
      CAR_CORE_ASSETS.some(a => url.pathname.endsWith(a.replace('./', '/')));
    if (isCarAsset) {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const netPromise = fetch(req).then(res => {
        if (res && res.ok) { cache.put(req, res.clone()); }
        return res;
      }).catch(() => null);
      if (cached) { event.waitUntil(netPromise); return cached; }
      const net = await netPromise;
      if (net) return net;
      const rt = await caches.open(RUNTIME_CACHE);
      return (await rt.match(req)) || Response.error();
    }

    /* 其余同源请求：网络优先，成功则入运行时缓存（兜底） */
    try {
      const res = await fetch(req);
      if (res && res.ok && url.pathname.startsWith('/wallpaper/')) {
        const rt = await caches.open(RUNTIME_CACHE);
        rt.put(req, res.clone());
      }
      return res;
    } catch (e) {
      const rt = await caches.open(RUNTIME_CACHE);
      return (await rt.match(req)) || Response.error();
    }
  })());
});

/* ==================== message：SKIP_WAITING / 热更新 ==================== */
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();

  if (data.type === 'OVERRIDE_MODULE' && data.path && data.content !== undefined) {
    event.waitUntil((async () => {
      const cache = await caches.open(OVERRIDE_CACHE);
      const res = new Response(data.content, { headers: { 'Content-Type': data.mime || 'application/javascript' } });
      await cache.put(data.path, res);
      const cs = await self.clients.matchAll({ includeUncontrolled: true });
      cs.forEach(c => c.postMessage({ type: 'OVERRIDE_APPLIED', path: data.path }));
    })());
  }

  if (data.type === 'CLEAR_OVERRIDE' && data.path) {
    event.waitUntil(caches.open(OVERRIDE_CACHE).then(c => c.delete(data.path)));
  }

  if (data.type === 'LIST_OVERRIDES') {
    event.waitUntil((async () => {
      const cache = await caches.open(OVERRIDE_CACHE);
      const keys = await cache.keys();
      const cs = await self.clients.matchAll({ includeUncontrolled: true });
      cs.forEach(c => c.postMessage({ type: 'OVERRIDE_LIST', paths: keys.map(k => k.url) }));
    })());
  }
});

/* ==================== push / notificationclick ==================== */
self.addEventListener('push', event => {
  let payload = { title: '兔可可档案馆', body: '有新的记忆碎片掉落了！' };
  try { if (event.data) payload = Object.assign(payload, event.data.json()); } catch (e) { }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body, icon: './icon/192.png', badge: './icon/192.png', tag: 'bunny-tower'
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
