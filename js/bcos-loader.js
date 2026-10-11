/* ===== js/bcos-loader.js — 动态注入调试版 (v8.0.2) =====
 *
 * 用法: 访问 https://so.menglolita.com/?dynamic=1
 * 全程在 F12 控制台输出日志, 方便除错
 *
 * 流程:
 * 1. [Loader] 启动, 检查 ?dynamic=1
 * 2. [Loader] 等待 bcos-pkg.js
 * 3. [Loader] A/B 切换 staged→active
 * 4. [Loader] 读取 modules.json
 * 5. [Loader] 逐个加载 CSS (IndexedDB 优先 → 网络)
 * 6. [Loader] 逐个加载 JS (IndexedDB 优先 → 网络), 按序执行
 * 7. [Loader] 调用 _bcos8Init()
 */
(function() {
    'use strict';
    const LOG = (msg, data) => console.log(`[Loader] ${msg}`, data || '');

    // 只在 ?dynamic=1 时运行
    if (!new URLSearchParams(location.search).has('dynamic')) {
        LOG('未检测到 ?dynamic=1, 跳过动态注入 (走静态加载)');
        return;
    }
    LOG('🚀 动态注入模式启动');

    function _loadScript(code, id) {
        LOG(`执行 JS 模块: ${id} (${code.length} 字节)`);
        const s = document.createElement('script');
        s.textContent = code;
        s.setAttribute('data-dynamic-module', id);
        document.head.appendChild(s);
        LOG(`✅ JS 模块已注入: ${id}`);
    }

    function _loadCSS(code, id) {
        LOG(`注入 CSS 模块: ${id} (${code.length} 字节)`);
        const s = document.createElement('style');
        s.textContent = code;
        s.setAttribute('data-dynamic-module', id);
        document.head.appendChild(s);
        LOG(`✅ CSS 模块已注入: ${id}`);
        // v8.0.2 fix: base.css 加载后确保 body 有背景 (防白屏)
        if (id === 'base-css') {
            setTimeout(() => {
                const bg = getComputedStyle(document.body).backgroundColor;
                if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
                    LOG('⚠️ body 背景透明, 设置兜底深色');
                    document.body.style.background = '#060814';
                }
            }, 100);
        }
    }

    async function _fetchText(url) {
        LOG(`🌐 网络获取: ${url}`);
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
        const text = await res.text();
        LOG(`✅ 网络获取成功: ${url} (${text.length} 字节)`);
        return text;
    }

    async function boot() {
        try {
            LOG('步骤1: 等待包管理器…');
            let tries = 0;
            while (!window._bcosPkgActivateStaged && tries < 50) {
                await new Promise(r => setTimeout(r, 100));
                tries++;
                if (tries % 10 === 0) LOG(`等待包管理器… (${tries * 100}ms)`);
            }
            if (!window._bcosPkgActivateStaged) throw new Error('包管理器未加载 (bcos-pkg.js)');
            LOG('✅ 包管理器就绪');

            LOG('步骤2: A/B 分区切换…');
            const activated = await window._bcosPkgActivateStaged();
            LOG(`✅ A/B 切换完成, 激活 ${activated} 个模块`);

            LOG('步骤3: 读取 modules.json…');
            const regRes = await fetch('modules.json?_t=' + Date.now(), { cache: 'no-store' });
            if (!regRes.ok) throw new Error('modules.json HTTP ' + regRes.status);
            const registry = await regRes.json();
            LOG(`✅ 注册表读取成功`, { version: registry.version, js: registry.loadOrder.length, css: registry.cssOrder.length });

            const jsOrder = registry.loadOrder || [];
            const cssOrder = registry.cssOrder || [];
            LOG(`步骤4: 开始加载 ${cssOrder.length} 个 CSS + ${jsOrder.length} 个 JS`);

            // CSS
            for (let i = 0; i < cssOrder.length; i++) {
                const id = cssOrder[i];
                const meta = registry.modules[id];
                if (!meta) { LOG(`⚠️ CSS ${id} 无元数据, 跳过`); continue; }
                LOG(`--- CSS [${i+1}/${cssOrder.length}] ${id} ---`);
                try {
                    let code = await window._bcosPkgLoadActive(id);
                    if (code) {
                        LOG(`📦 从 IndexedDB 加载: ${id}`);
                    } else {
                        LOG(`📦 IndexedDB 无缓存, 走网络: ${id}`);
                        code = await _fetchText(meta.file);
                        try { await window._bcosPkgSetActive(id, meta, code); LOG(`💾 已缓存到 IndexedDB: ${id}`); }
                        catch(e) { LOG(`⚠️ 缓存失败: ${id}`, e.message); }
                    }
                    _loadCSS(code, id);
                } catch(e) {
                    LOG(`❌ CSS ${id} 失败:`, e.message);
                    // 回退到 link 标签
                    const l = document.createElement('link');
                    l.rel = 'stylesheet'; l.href = meta.file;
                    document.head.appendChild(l);
                    LOG(`🔄 已回退到 <link>: ${id}`);
                }
            }

            // JS (按序)
            for (let i = 0; i < jsOrder.length; i++) {
                const id = jsOrder[i];
                const meta = registry.modules[id];
                if (!meta) { LOG(`⚠️ JS ${id} 无元数据, 跳过`); continue; }
                LOG(`--- JS [${i+1}/${jsOrder.length}] ${id} ---`);
                try {
                    let code = await window._bcosPkgLoadActive(id);
                    if (code) {
                        LOG(`📦 从 IndexedDB 加载: ${id}`);
                    } else {
                        LOG(`📦 IndexedDB 无缓存, 走网络: ${id}`);
                        code = await _fetchText(meta.file);
                        try { await window._bcosPkgSetActive(id, meta, code); LOG(`💾 已缓存到 IndexedDB: ${id}`); }
                        catch(e) { LOG(`⚠️ 缓存失败: ${id}`, e.message); }
                    }
                    _loadScript(code, id);
                } catch(e) {
                    LOG(`❌ JS ${id} 失败:`, e.message);
                    throw new Error(`关键模块 ${id} 加载失败: ${e.message}`);
                }
            }

            LOG('步骤5: 所有模块加载完成, 启动桌面…');
            if (typeof window._bcos8Init === 'function') {
                LOG('调用 _bcos8Init()');
                window._bcos8Init();
                LOG('✅ _bcos8Init() 已调用');
            } else {
                throw new Error('_bcos8Init 未定义! 检查 bcos-8.js 是否正确加载');
            }
        } catch(e) {
            LOG('💥 动态注入失败:', e.message);
            LOG('堆栈:', e.stack);
            document.body.innerHTML = `<div style="position:fixed;inset:0;background:#1a0000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;padding:20px;z-index:9999999;">
                <div style="font-size:24px;margin-bottom:12px;">💥 动态注入失败</div>
                <div style="font-size:13px;color:#ff8888;margin-bottom:8px;max-width:600px;word-break:break-all;">${e.message}</div>
                <div style="font-size:11px;color:#888;margin-bottom:20px;max-width:600px;">查看 F12 控制台的 [Loader] 日志定位问题</div>
                <button onclick="location.href=location.pathname" style="background:#7c8cff;border:none;color:#fff;padding:12px 24px;border-radius:8px;cursor:pointer;">返回静态模式</button>
            </div>`;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
