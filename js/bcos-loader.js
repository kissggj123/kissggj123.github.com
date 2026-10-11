/* ===== js/bcos-loader.js — BCOS 动态模块加载器 (A/B 无缝启动) =====
 *
 * 启动流程:
 * 1. 加载包管理器 (bcos-pkg.js 必须已通过 <script> 引入)
 * 2. A/B 切换: staged → active
 * 3. 按 loadOrder 动态加载所有 JS 模块 (IndexedDB active 优先, 否则网络)
 * 4. 按 cssOrder 动态加载所有 CSS
 * 5. 调用 _bcos8Init() 启动桌面
 *
 * ?static=1 可 bypass, 回到传统 <script> 加载 (故障恢复)
 */
(function() {
    'use strict';

    // 进度显示
    function _showProgress(pct, msg) {
        let el = document.getElementById('bcos-loader-progress');
        if (!el) {
            el = document.createElement('div');
            el.id = 'bcos-loader-progress';
            el.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#060814;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#aab6ff;font-family:system-ui;';
            el.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">🐰</div>' +
                '<div style="font-size:18px;font-weight:700;margin-bottom:12px;">Bunny Cockpit OS</div>' +
                '<div style="width:220px;height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;margin-bottom:8px;">' +
                '<div id="bcos-loader-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#7c8cff,#b48cff);border-radius:3px;transition:width .3s;"></div></div>' +
                '<div id="bcos-loader-msg" style="font-size:12px;opacity:.7;"></div>';
            document.body.appendChild(el);
        }
        const bar = document.getElementById('bcos-loader-bar');
        const msgEl = document.getElementById('bcos-loader-msg');
        if (bar) bar.style.width = pct + '%';
        if (msgEl && msg) msgEl.textContent = msg;
    }

    function _hideProgress() {
        const el = document.getElementById('bcos-loader-progress');
        if (el) { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 450); }
    }

    function _loadScript(code) {
        return new Promise((resolve, reject) => {
            try {
                const s = document.createElement('script');
                s.textContent = code;
                s.onload = () => resolve();
                s.onerror = (e) => reject(e);
                document.head.appendChild(s);
                // textContent 脚本同步执行, 直接 resolve
                resolve();
            } catch(e) { reject(e); }
        });
    }

    function _loadCSS(code) {
        const s = document.createElement('style');
        s.textContent = code;
        s.setAttribute('data-bcos-module-css', '1');
        document.head.appendChild(s);
    }

    async function _fetchText(url) {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + url);
        return res.text();
    }

    const _STATIC_JS = ['js/screen.js','js/version.js','js/core.js','js/game.js','js/renderer.js','js/game-logic-a.js','js/game-logic-b.js','js/game-logic-c.js','js/ui.js','js/os.js','js/icons.js','js/os-apps-a.js','js/os-apps-b.js','js/os-apps-c.js','js/wallpaper-data.js','js/wallpaper.js','js/apps.js','js/ui-systems-a.js','js/ui-systems-b.js','js/ui-systems-c.js','js/bcos-8.js','js/kernel-perf.js','js/yumiko.js','js/bcos-cydia.js'];
    const _STATIC_CSS = ['css/base.css','css/ui.css','css/effects.css','css/car-lockscreen-a.css','css/car-lockscreen-b.css','css/rounded-screen.css','css/desktop-modern.css','css/app-drawer.css','css/bcos-8.css','css/aurora-apps.css'];

    async function boot() {
        // ?static=1: 传统模式, 动态注入静态脚本
        if (new URLSearchParams(location.search).has('static')) {
            console.log('[Loader] static 模式');
            _hideProgress();
            for (const f of _STATIC_CSS) {
                const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = f; document.head.appendChild(l);
            }
            for (const f of _STATIC_JS) {
                await new Promise((res, rej) => {
                    const s = document.createElement('script'); s.src = f;
                    s.onload = res; s.onerror = rej; document.head.appendChild(s);
                });
            }
            if (typeof window._bcos8Init === 'function') window._bcos8Init();
            return;
        }

        _showProgress(5, '正在初始化包管理器…');

        // 等待 bcos-pkg.js 就绪
        let tries = 0;
        while (!window._bcosPkgActivateStaged && tries < 50) {
            await new Promise(r => setTimeout(r, 100));
            tries++;
        }
        if (!window._bcosPkgActivateStaged) throw new Error('包管理器未加载');

        // 1. A/B 切换
        _showProgress(10, 'A/B 分区切换…');
        const activated = await window._bcosPkgActivateStaged();
        if (activated > 0) console.log(`[Loader] ${activated} 个模块已切换`);

        // 2. 加载注册表
        _showProgress(15, '正在读取软件源…');
        let registry;
        try {
            registry = await (await fetch('modules.json?_t=' + Date.now(), { cache: 'no-store' })).json();
        } catch(e) {
            throw new Error('无法读取 modules.json: ' + e.message);
        }

        const jsOrder = registry.loadOrder || [];
        const cssOrder = registry.cssOrder || [];
        const total = jsOrder.length + cssOrder.length;
        let done = 0;

        // 3. 加载 CSS
        for (const id of cssOrder) {
            const meta = registry.modules[id];
            if (!meta) continue;
            done++;
            _showProgress(15 + Math.round(done / total * 70), `样式 ${id}…`);
            try {
                let code = await window._bcosPkgLoadActive(id);
                if (!code) {
                    code = await _fetchText(meta.file);
                    await window._bcosPkgSetActive(id, meta, code).catch(() => {});
                }
                _loadCSS(code);
            } catch(e) {
                console.warn(`[Loader] CSS ${id} 加载失败:`, e);
                // 回退: <link> 标签
                const l = document.createElement('link');
                l.rel = 'stylesheet'; l.href = meta.file;
                document.head.appendChild(l);
            }
        }

        // 4. 加载 JS (按顺序, 同步执行保证依赖)
        for (const id of jsOrder) {
            const meta = registry.modules[id];
            if (!meta) continue;
            done++;
            _showProgress(15 + Math.round(done / total * 70), `模块 ${id}…`);
            try {
                let code = await window._bcosPkgLoadActive(id);
                if (!code) {
                    code = await _fetchText(meta.file);
                    await window._bcosPkgSetActive(id, meta, code).catch(() => {});
                }
                await _loadScript(code);
            } catch(e) {
                console.error(`[Loader] JS ${id} 加载失败:`, e);
                throw new Error(`关键模块 ${id} 加载失败: ` + e.message);
            }
        }

        // 5. 启动
        _showProgress(95, '正在启动桌面…');
        _hideProgress();

        // 调用启动函数
        if (typeof window._bcos8Init === 'function') {
            window._bcos8Init();
        } else {
            throw new Error('_bcos8Init 未定义');
        }
    }

    // 页面加载后启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => boot().catch(_bootFail));
    } else {
        boot().catch(_bootFail);
    }

    function _bootFail(e) {
        console.error('[Loader] 启动失败:', e);
        _hideProgress();
        document.body.innerHTML = `<div style="position:fixed;inset:0;background:#060814;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui;padding:20px;text-align:center;z-index:9999999;">
            <div style="font-size:48px;margin-bottom:16px;">😢</div>
            <div style="font-size:18px;font-weight:700;margin-bottom:8px;">启动失败</div>
            <div style="font-size:13px;color:#888;margin-bottom:20px;max-width:400px;">${e.message}</div>
            <button onclick="location.href=location.pathname+'?static=1'" style="background:#7c8cff;border:none;color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">🔄 尝试传统模式启动</button>
        </div>`;
    }
})();
