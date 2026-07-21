# PWA + 移动端适配 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在原版 index.html (8b718be) 基础上，以最小侵入方式添加 PWA 支持、移动端底部 Tab 栏导航和响应式适配，不破坏任何已有游戏逻辑。

**Architecture:** 从 git 历史 `8b718be` 恢复原始 347 行 index.html，仅在 `<head>` 添加 PWA meta 标签，在 `<style>` 末尾追加移动端 CSS，在 `</body>` 前添加 Tab 栏 HTML + SW 注册 JS。所有原始 JS 逻辑（`deepMerge`、`generateNewCityState`、`validateLoadedCity`、`renderBudgetPanel` 等）保持原样不动。

**Tech Stack:** 原生 HTML/CSS/JS, Tailwind CSS (CDN), Chart.js (CDN), PWA (manifest.json + service-worker.js), CSS `@media (display-mode: standalone)`

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `index.html` | 从 8b718be 恢复 + 增量修改 | 主应用，包含所有 UI + JS |
| `manifest.json` | 修改 | PWA 清单，修复图标尺寸 |
| `service-worker.js` | 修改 | SW，跨域请求透传 |

---

### Task 1: 恢复原始 index.html

**Files:**
- Modify: `index.html` (从 git 8b718be 完整恢复)

- [ ] **Step 1: 从 git 恢复原始文件**

```bash
cd /Users/yumikotoys/.trae-cn/work/6a5f5556becd98e7808ee935/gh-pages-sync
git show 8b718be:index.html > index.html
```

- [ ] **Step 2: 验证文件行数和关键函数**

Run:
```bash
wc -l index.html
grep -c "function validateLoadedCity" index.html
grep -c "function generateNewCityState" index.html
grep -c "function renderBudgetPanel" index.html
grep -c "deepMerge" index.html
```

Expected: 347 lines, 1 each for all functions, 2 for deepMerge

- [ ] **Step 3: 验证原版 taxRate 和 budget 键名**

Run:
```bash
grep -o "taxRate:{[^}]*}" index.html
grep -o "budget:{[^}]*}" index.html
```

Expected:
- `taxRate:{res:9,com:10,ind:8,office:11}`
- `budget:{services:100,education:100,health:100,safety:100,transport:100,garbage:100,maintenance:100}`

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "revert: restore original index.html from 8b718be

Restores original 347-line file with correct:
- deepMerge() recursive validation in validateLoadedCity
- Correct taxRate keys (res/com/ind/office)
- Correct budget keys (services/education/health/safety/transport/garbage/maintenance)
- Original LCARS pink/gold theme (#ec4899 + #fbbf24 + #0c0a1d)
- Noto Sans SC as default font
- All game logic unchanged"
```

---

### Task 2: 添加 PWA Meta 标签

**Files:**
- Modify: `index.html` (在 `<head>` 的 `<style>` 标签前插入)

- [ ] **Step 1: 在 `<link rel="preconnect"...>` 行之后插入 PWA meta 标签**

在 `index.html` 第 9 行（`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` 之后）插入：

```html
    <!-- PWA -->
    <meta name="theme-color" content="#0c0a1d">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Bunny CC">
    <link rel="apple-touch-icon" href="/icon/192.png">
    <link rel="manifest" href="/manifest.json">
```

- [ ] **Step 2: 验证 meta 标签已插入**

Run:
```bash
grep -c "mobile-web-app-capable\|apple-mobile-web-app-capable\|manifest.json\|theme-color" index.html
```

Expected: 4

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add PWA meta tags to head"
```

---

### Task 3: 添加移动端 CSS

**Files:**
- Modify: `index.html` (在 `</style>` 标签前追加 CSS)

- [ ] **Step 1: 在 `</style>` 前追加移动端 CSS**

在 `index.html` 的 `</style>` 标签前（约第 77 行）插入：

```css
        /* ===== PWA Mobile Adaptation ===== */
        :root { --safe-bottom: env(safe-area-inset-bottom, 0px); }
        #bottom-tab-bar {
            position:fixed; bottom:0; left:0; right:0; z-index:300;
            display:none; align-items:center; justify-content:space-around;
            height:calc(54px + var(--safe-bottom)); padding-bottom:var(--safe-bottom);
            background:rgba(12,10,29,0.85);
            backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
            border-top:1px solid rgba(var(--glow-rgb),0.25);
        }
        .tab-item {
            display:flex; flex-direction:column; align-items:center; gap:2px;
            flex:1; height:100%; padding-top:6px;
            color:var(--text-muted-color); font-size:0.5rem; cursor:pointer;
            transition:color .2s ease;
        }
        .tab-item svg { width:1.1rem; height:1.1rem; }
        .tab-item.active { color:rgb(var(--accent-rgb)); }
        @media (display-mode: standalone) {
            #bottom-tab-bar { display:flex; }
            .lcars-sidebar { display:none; }
            .lcars-container { height:calc(100vh - 54px - var(--safe-bottom)); }
        }
        @media (max-width: 768px) {
            .lcars-container { padding:0.5rem; gap:0.5rem; height:calc(100vh - 54px - var(--safe-bottom)); }
            .lcars-sidebar { display:none; }
            #bottom-tab-bar { display:flex; }
            .lcars-content-panel { padding:0.75rem; gap:0.75rem; }
        }
```

- [ ] **Step 2: 验证 CSS 已插入**

Run:
```bash
grep -c "bottom-tab-bar\|tab-item\|display-mode: standalone" index.html
```

Expected: 3+

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add mobile CSS with bottom tab bar (PWA standalone only)"
```

---

### Task 4: 添加底部 Tab 栏 HTML 和 SW 注册

**Files:**
- Modify: `index.html` (在 `</body>` 前插入)

- [ ] **Step 1: 在 `</body>` 标签前插入 Tab 栏 HTML 和 JS**

在 `index.html` 的 `</body>` 标签前（约第 343 行）插入：

```html
    <!-- Bottom Tab Bar (PWA/Mobile only) -->
    <nav id="bottom-tab-bar">
        <div class="tab-item active" data-tab="home" onclick="tabBarNavigate('home')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
            <span>HOME</span>
        </div>
        <div class="tab-item" data-tab="city" onclick="tabBarNavigate('city')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v13H3V4z"/><path d="M6 7h2v2H6zM10 7h2v2h-2zM6 11h2v2H6zM10 11h2v2h-2z"/></svg>
            <span>CITY</span>
        </div>
        <div class="tab-item" data-tab="logs" onclick="tabBarNavigate('logs')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z"/></svg>
            <span>LOGS</span>
        </div>
        <div class="tab-item" data-tab="theme" onclick="tabBarNavigate('theme')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14V4a6 6 0 010 12z"/></svg>
            <span>THEME</span>
        </div>
        <div class="tab-item" data-tab="perf" onclick="tabBarNavigate('perf')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z"/><path d="M10 3a1 1 0 011 1v10a1 1 0 11-2 0V4a1 1 0 011-1z"/><path d="M17 3a1 1 0 011 1v10a1 1 0 11-2 0V4a1 1 0 011-1z"/></svg>
            <span>PERF</span>
        </div>
    </nav>
    <script>
    function tabBarNavigate(tab){
        document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));
        const el=document.querySelector('.tab-item[data-tab="'+tab+'"]');
        if(el)el.classList.add('active');
        ['city-management-modal','changelog-modal','theme-modal','performance-modal'].forEach(id=>toggleModal(id,false));
        if(tab==='city')toggleModal('city-management-modal',true);
        else if(tab==='logs')toggleModal('changelog-modal',true);
        else if(tab==='theme')toggleModal('theme-modal',true);
        else if(tab==='perf')toggleModal('performance-modal',true);
    }
    if('serviceWorker' in navigator){
        window.addEventListener('load',function(){
            navigator.serviceWorker.register('/service-worker.js').catch(function(){});
        });
    }
    </script>
```

- [ ] **Step 2: 验证 Tab 栏 HTML 已插入**

Run:
```bash
grep -c "bottom-tab-bar\|tabBarNavigate\|serviceWorker" index.html
```

Expected: 3+

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add bottom tab bar HTML + SW registration"
```

---

### Task 5: 更新 manifest.json

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: 写入正确的 manifest.json**

```json
{
    "name": "Bunny CC 兔可可之城",
    "short_name": "BunnyCC",
    "description": "兔可可之城 - 赛博朋克像素城市建造模拟。",
    "start_url": "/index.html",
    "scope": "/",
    "display": "standalone",
    "display_override": ["standalone", "minimal-ui"],
    "background_color": "#0c0a1d",
    "theme_color": "#0c0a1d",
    "orientation": "any",
    "lang": "zh-CN",
    "icons": [
        {
            "src": "/icon/192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "/icon/192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "maskable"
        },
        {
            "src": "/icon/128.png",
            "sizes": "128x128",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "/icon/96.png",
            "sizes": "96x96",
            "type": "image/png",
            "purpose": "any"
        }
    ],
    "version": "1.1.1"
}
```

- [ ] **Step 2: 验证 JSON 合法性**

Run:
```bash
python3 -c "import json; json.load(open('manifest.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "fix: correct manifest.json with proper icon sizes and BunnyCC config"
```

---

### Task 6: 更新 service-worker.js

**Files:**
- Modify: `service-worker.js`

- [ ] **Step 1: 写入简化的 SW（跨域透传）**

```javascript
// Service Worker - Bunny CC
const CACHE_NAME = 'bunny-cc-v1.1.1';
const RUNTIME_CACHE = 'bunny-cc-runtime-v1.1.1';
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
    // 跨域请求直接透传，不拦截
    if (url.origin !== self.location.origin) return;

    // 导航请求：网络优先
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

    // 同源静态资产：缓存优先
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
```

- [ ] **Step 2: 验证 SW 语法**

Run:
```bash
node -c service-worker.js
```

Expected: 无输出（语法正确）

- [ ] **Step 3: Commit**

```bash
git add service-worker.js
git commit -m "fix: simplify SW - cross-origin passthrough, no opaque responses"
```

---

### Task 7: 推送并线上验证

- [ ] **Step 1: Push 所有 commits**

```bash
export https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 all_proxy=socks5://127.0.0.1:7897
git push origin master
```

- [ ] **Step 2: 等待 35 秒后验证 HTTP 状态**

Run:
```bash
sleep 35
curl -sI https://so.menglolita.com/index.html | head -3
curl -sI https://so.menglolita.com/manifest.json | head -3
curl -sI https://so.menglolita.com/service-worker.js | head -3
```

Expected: 全部 200

- [ ] **Step 3: 验证原版数据逻辑已恢复**

Run:
```bash
curl -s https://so.menglolita.com/index.html | grep -o "deepMerge" | head -1
curl -s https://so.menglolita.com/index.html | grep -o "taxRate:{res:9,com:10,ind:8,office:11}" | head -1
curl -s https://so.menglolita.com/index.html | grep -o "budget:{services:100" | head -1
```

Expected: 每条都有输出

- [ ] **Step 4: 验证 PWA 和 Tab 栏已添加**

Run:
```bash
curl -s https://so.menglolita.com/index.html | grep -c "mobile-web-app-capable"
curl -s https://so.menglolita.com/index.html | grep -c "bottom-tab-bar"
curl -s https://so.menglolita.com/index.html | grep -c "display-mode: standalone"
curl -s https://so.menglolita.com/index.html | grep -c "tabBarNavigate"
```

Expected: 全部 >= 1

- [ ] **Step 5: 浏览器验证（用户手动）**

用户在浏览器打开 https://so.menglolita.com/ 并检查：
1. Console 无 TypeError（特别是 `Cannot read properties of undefined` 或 `Cannot convert undefined or null to object`）
2. 原版粉色 LCARS 主题正常显示
3. 桌面浏览器底部无 Tab 栏
4. 移动端或 PWA 模式底部显示 Tab 栏
5. 点击 Tab 栏可切换模态框
6. 城市存档可正常加载，预算面板可渲染
7. 兔可可纪念日倒计时正常显示

---

## 验证清单

- [ ] Console 零 TypeError
- [ ] 原版 LCARS 粉金主题
- [ ] Noto Sans SC 默认字体
- [ ] deepMerge 数据加载逻辑
- [ ] taxRate 键名 res/com/ind/office
- [ ] budget 键名 services/education/health/safety/transport/garbage/maintenance
- [ ] PWA meta 标签
- [ ] Tab 栏仅在 PWA/移动端显示
- [ ] SW 跨域请求不拦截
- [ ] 兔可可纪念日倒计时正常
