/* ============================================================
 * BCOS Kernel v9.0.0 — 统一 API 内核
 * ------------------------------------------------------------
 * 全局唯一命名空间 window.BCOS, 所有模块经此注册/通信/加载。
 * 设计原则: 单文件 < 128KB · 纯 CSS+JS · 热更新 · 动态注入
 *
 *  API 速览:
 *  BCOS.version                      内核版本
 *  BCOS.module.register(id, def)     注册模块 {version,desc,deps,api,init}
 *  BCOS.module.get(id) / list()      查询模块
 *  BCOS.event.on/once/off/emit       事件总线 (document 级 bcos:* 事件, 与旧事件互通)
 *  BCOS.storage.get/set/remove       统一本地存储 (JSON 自动序列化)
 *  BCOS.loader.js/css/text/url       动态加载 (可被 SW 覆盖缓存拦截)
 *  BCOS.loader.bootFromRegistry()    从 modules.json 动态引导整个系统
 *  BCOS.pkg.check/hotInstall/...     Cydia 式包管理 (A/B 无缝热更新)
 *  BCOS.theme.setWallpaper/apply     壁纸与主题 (惰性绑定旧全局)
 *  BCOS.ui.openApp/createWin/toast   窗口与提示
 *  BCOS.app.register/install/list    应用注册与安装
 *  BCOS.source.open()                软件源 (Cydia UI)
 *  BCOS.kernel.boot/markReady/onReady 启动编排
 * ============================================================ */
(function() {
'use strict';

const VERSION = '9.0.0';
const REGISTRY_URL = 'modules.json';

/* ---------- 事件总线 (基于 document 事件, 与旧 bcos:* 事件互通) ---------- */
const _subWraps = new Map(); // 原函数 -> 包装函数 (支持 off)
const EventBus = {
    on(name, fn) {
        let w = _subWraps.get(fn);
        if (!w) { w = function(e) { fn(e && e.detail !== undefined ? e.detail : e); }; _subWraps.set(fn, w); }
        document.addEventListener('bcos:' + name, w);
        return () => EventBus.off(name, fn);
    },
    once(name, fn) {
        const w = function(e) { EventBus.off(name, fn); fn(e && e.detail !== undefined ? e.detail : e); };
        document.addEventListener('bcos:' + name, w);
    },
    off(name, fn) {
        const w = _subWraps.get(fn);
        if (w) document.removeEventListener('bcos:' + name, w);
    },
    emit(name, detail) {
        try { document.dispatchEvent(new CustomEvent('bcos:' + name, { detail: detail })); }
        catch (e) { console.error('[BCOS.event] emit 失败:', name, e); }
    }
};

/* ---------- 统一存储 ---------- */
const Storage = {
    get(key, def) {
        try {
            const v = localStorage.getItem('bcos.' + key);
            return v === null ? def : JSON.parse(v);
        } catch (e) { return def; }
    },
    set(key, val) {
        try {
            localStorage.setItem('bcos.' + key, JSON.stringify(val));
            EventBus.emit('storage:changed', { key: key, value: val });
            return true;
        } catch (e) { console.error('[BCOS.storage] 写入失败:', key, e); return false; }
    },
    remove(key) { try { localStorage.removeItem('bcos.' + key); } catch (e) {} },
    raw: localStorage
};

/* ---------- 模块注册表 ---------- */
const _modules = new Map(); // id -> entry
const ModuleRegistry = {
    register(id, def) {
        def = def || {};
        if (_modules.has(id)) { console.warn('[BCOS.module] 重复注册, 跳过:', id); return _modules.get(id).api; }
        const entry = {
            id: id,
            version: def.version || '0.0.0',
            desc: def.desc || '',
            deps: def.deps || [],
            api: def.api || {},
            init: def.init || null,
            state: 'registered',
            registeredAt: Date.now()
        };
        _modules.set(id, entry);
        EventBus.emit('module:registered', { id: id });
        return entry.api;
    },
    get(id) { return _modules.get(id) || null; },
    list() { return Array.from(_modules.values()); },
    markLoaded(id) { const m = _modules.get(id); if (m) m.state = 'loaded'; EventBus.emit('module:loaded', { id: id }); },
    // 记录注册表里的被动模块 (legacy 全局脚本, 未经 register 但已被加载)
    record(id, meta) {
        if (_modules.has(id)) return;
        _modules.set(id, {
            id: id, version: (meta && meta.version) || '?', desc: (meta && meta.desc) || '',
            deps: [], api: {}, init: null, state: 'loaded', passive: true, registeredAt: Date.now()
        });
    }
};

/* ---------- 动态加载器 ---------- */
const _jsLoaded = new Set();
const _cssLoaded = new Set();
function _fetchText(url, bust) {
    const u = bust ? url + (url.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now() : url;
    return fetch(u, { cache: bust ? 'no-store' : 'default' }).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + url);
        return r.text();
    });
}
const Loader = {
    /** 加载 JS 模块: fetch 文本 → 内联注入 (可被 SW 覆盖缓存拦截) */
    js(id, url) {
        if (_jsLoaded.has(id)) return Promise.resolve(false);
        return _fetchText(url).then(function(code) {
            const s = document.createElement('script');
            s.textContent = code;
            s.setAttribute('data-bcos-module', id);
            document.head.appendChild(s);
            _jsLoaded.add(id);
            console.log('[BCOS.loader] ✅ JS:', id, '(' + code.length + 'B)');
            ModuleRegistry.record(id, null);
            return true;
        });
    },
    /** 加载 CSS 模块 */
    css(id, url) {
        if (_cssLoaded.has(id)) return Promise.resolve(false);
        return _fetchText(url).then(function(code) {
            const s = document.createElement('style');
            s.textContent = code;
            s.setAttribute('data-bcos-module-css', id);
            document.head.appendChild(s);
            _cssLoaded.add(id);
            console.log('[BCOS.loader] ✅ CSS:', id, '(' + code.length + 'B)');
            ModuleRegistry.record(id, null);
            return true;
        }).catch(function(e) {
            // 回退 link 标签
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = url;
            document.head.appendChild(l);
            _cssLoaded.add(id);
            console.warn('[BCOS.loader] ⚠️ CSS 内联失败, 回退 link:', id, e.message);
            return false;
        });
    },
    /** 网络强刷取文本 (绕过缓存, 用于检查更新) */
    text(url) { return _fetchText(url, true); },
    /** 从注册表引导整个系统 (动态模式主入口) */
    bootFromRegistry() {
        return _fetchText(REGISTRY_URL).then(function(txt) {
            const reg = JSON.parse(txt);
            window._bcosRegistry = reg;
            console.log('[BCOS.loader] 注册表 v' + reg.version + ' · ' + Object.keys(reg.modules).length + ' 模块');
            // 预登记所有模块
            Object.keys(reg.modules).forEach(function(k) { ModuleRegistry.record(k, reg.modules[k]); });
            // CSS 先行
            const cssOrder = reg.cssOrder || [];
            const jsOrder = reg.loadOrder || [];
            return cssOrder.reduce(function(p, id) {
                const m = reg.modules[id];
                return p.then(function() { return m ? Loader.css(id, m.file) : null; });
            }, Promise.resolve()).then(function() {
                // JS 严格按序
                return jsOrder.reduce(function(p, id) {
                    const m = reg.modules[id];
                    return p.then(function() {
                        if (!m) return null;
                        // IndexedDB 缓存优先 (A/B 分区)
                        if (window._bcosPkgLoadActive) {
                            return window._bcosPkgLoadActive(id, m).then(function(code) {
                                if (code) {
                                    if (_jsLoaded.has(id)) return true; // 防重入
                                    const s = document.createElement('script');
                                    s.textContent = code;
                                    s.setAttribute('data-bcos-module', id);
                                    document.head.appendChild(s);
                                    _jsLoaded.add(id);
                                    console.log('[BCOS.loader] 📦 IDB:', id);
                                    return true;
                                }
                                return Loader.js(id, m.file).then(function(ok) {
                                    if (ok && window._bcosPkgSetActive) {
                                        return _fetchText(m.file).then(function(c2) {
                                            return window._bcosPkgSetActive(id, m, c2);
                                        }).catch(function() {});
                                    }
                                });
                            });
                        }
                        return Loader.js(id, m.file);
                    });
                }, Promise.resolve());
            });
        });
    }
};

/* ---------- 包管理 (Cydia 式热更新, 委托 bcos-pkg.js + SW 覆盖) ---------- */
function _registry() {
    if (window._bcosRegistry) return Promise.resolve(window._bcosRegistry);
    return _fetchText(REGISTRY_URL, true).then(function(txt) {
        const reg = JSON.parse(txt);
        window._bcosRegistry = reg;
        return reg;
    });
}
const Pkg = {
    /** 检查更新: 返回 {registry, updates, total} */
    check() {
        return _registry().then(function(reg) {
            return window._bcosPkgCheck ? window._bcosPkgCheck() : { registry: reg, updates: [], total: Object.keys(reg.modules).length };
        });
    },
    /** 热安装: 下载 → SW 覆盖缓存 → IDB 记录; 返回 {id, code, activate()} */
    hotInstall(id) {
        return _registry().then(function(reg) {
            const meta = reg.modules[id];
            if (!meta) throw new Error('未知模块: ' + id);
            const contentType = /\.css$/.test(meta.file) ? 'text/css' : 'application/javascript';
            return _fetchText(meta.file, true).then(function(code) {
                const fullUrl = new URL(meta.file, location.href).href;
                const swReady = (navigator.serviceWorker && navigator.serviceWorker.controller)
                    ? navigator.serviceWorker.ready.then(function(swreg) {
                        return new Promise(function(resolve, reject) {
                            const t = setTimeout(function() { reject(new Error('SW 响应超时')); }, 10000);
                            const h = function(e) {
                                if (e.data && e.data.type === 'MODULE_OVERRIDDEN' && e.data.url === fullUrl) {
                                    clearTimeout(t);
                                    navigator.serviceWorker.removeEventListener('message', h);
                                    resolve();
                                }
                            };
                            navigator.serviceWorker.addEventListener('message', h);
                            swreg.active.postMessage({ type: 'OVERRIDE_MODULE', url: fullUrl, code: code, contentType: contentType });
                        });
                    })
                    : Promise.resolve();
                return swReady.then(function() {
                    if (window._bcosPkgDownload) { try { window._bcosPkgDownload(id, meta); } catch (e) {} }
                    return {
                        id: id, code: code, contentType: contentType,
                        activate: function() { return Pkg.hotActivate(id, code, contentType); }
                    };
                });
            });
        });
    },
    /** 热激活: 不刷新页面直接替换运行中的模块代码 */
    hotActivate(id, code, contentType) {
        if (contentType === 'text/css' || /\.css$/.test(id)) {
            document.querySelectorAll('style[data-bcos-module-css="' + id + '"]').forEach(function(s) { s.remove(); });
            const s = document.createElement('style');
            s.textContent = code;
            s.setAttribute('data-bcos-module-css', id);
            document.head.appendChild(s);
        } else {
            const s = document.createElement('script');
            s.textContent = code;
            s.setAttribute('data-bcos-module-js', id);
            document.head.appendChild(s);
        }
        EventBus.emit('module:hot-updated', { id: id });
        console.log('[BCOS.pkg] ⚡ 已热激活:', id);
    },
    /** 激活所有待重启的 A/B 分区模块 */
    activateStaged() { return window._bcosPkgActivateStaged ? window._bcosPkgActivateStaged() : Promise.resolve(0); },
    /** 回滚到服务器版本 */
    rollback(id) {
        return _registry().then(function(reg) {
            const meta = reg.modules[id];
            if (!meta || !navigator.serviceWorker || !navigator.serviceWorker.controller) return false;
            const fullUrl = new URL(meta.file, location.href).href;
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_OVERRIDE', url: fullUrl });
            return true;
        });
    }
};

/* ---------- 高层门面 (惰性绑定旧全局, 保证兼容) ---------- */
const Theme = {
    setWallpaper(f) { if (window._bcosSetWallpaper) return window._bcosSetWallpaper(f); console.warn('[BCOS.theme] 未就绪'); },
    apply() { if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme(); },
    get current() { try { return localStorage.getItem('bcosCustomBg'); } catch (e) { return null; } }
};
const UI = {
    openApp(id) { if (window._bcosOpenApp) return window._bcosOpenApp(id); },
    createWin(id, title, html) { if (window._bcosCreateWin) return window._bcosCreateWin(id, title, html); },
    toast(msg) { if (window.showToast) window.showToast(msg); else console.log('[toast]', msg); },
    openDrawer() { if (window._bcosOpenAppDrawer) window._bcosOpenAppDrawer(); },
    closeDrawer() { if (window._bcosCloseAppDrawer) window._bcosCloseAppDrawer(); }
};
const App = {
    register(app) { return window._bcosInstallApp ? window._bcosInstallApp(app) : false; },
    uninstall(id) { return window._bcosUninstallApp ? window._bcosUninstallApp(id) : false; },
    list() { return window._bcosCollectDrawerApps ? window._bcosCollectDrawerApps() : []; },
    registerV82(app) {
        if (!window._bcosV82Apps) window._bcosV82Apps = {};
        window._bcosV82Apps[app.id] = app;
        ModuleRegistry.record('app:' + app.id, { version: '1.0.0', desc: app.name });
        return app;
    }
};

/* ---------- 内核启动编排 ---------- */
const _readyCallbacks = [];
let _ready = false;
const Kernel = {
    version: VERSION,
    bootTime: Date.now(),
    /** 执行旧初始化链 (v82 boot.js 提供) */
    initChain() { if (window._bcosInitChain) window._bcosInitChain(); },
    markReady(mode) {
        if (_ready) return;
        _ready = true;
        const ms = Date.now() - Kernel.bootTime;
        console.log('[BCOS] ✅ 内核就绪 (' + (mode || 'static') + ', ' + ms + 'ms)');
        EventBus.emit('kernel:ready', { mode: mode, ms: ms });
        _readyCallbacks.splice(0).forEach(function(cb) { try { cb(); } catch (e) {} });
    },
    onReady(cb) { if (_ready) cb(); else _readyCallbacks.push(cb); },
    get ready() { return _ready; }
};

/* ---------- 软件源入口 ---------- */
const Source = {
    open() {
        if (window._bcosV82Apps && window._bcosV82Apps['cydia']) return UI.openApp('cydia');
        if (window._bcosCydiaOpen) return window._bcosCydiaOpen();
        UI.openApp('cydia');
    }
};

/* ---------- 挂载全局命名空间 ---------- */
window.BCOS = {
    version: VERSION,
    kernel: Kernel,
    module: ModuleRegistry,
    event: EventBus,
    storage: Storage,
    loader: Loader,
    pkg: Pkg,
    theme: Theme,
    ui: UI,
    app: App,
    source: Source
};
console.log('[BCOS] 内核 v' + VERSION + ' 已挂载 (统一API: BCOS.*)');
})();
