/* ============================================================
 * BCOS Bootstrap v9.0.0 — 启动编排器 (动态加载注入主入口)
 * ------------------------------------------------------------
 * 职责:
 *  1. A/B 分区激活 (待重启的模块更新)
 *  2. 从 modules.json 注册表动态加载 全部 CSS+JS
 *     (IndexedDB 缓存优先 → Service Worker 覆盖 → 网络)
 *  3. 合成 DOMContentLoaded (兼容监听该事件的 legacy 模块)
 *  4. 按序执行初始化: Aurora 外壳 → v82 初始化链
 *  5. 标记内核就绪, 移除启动屏
 * 依赖: js/bcos.js (内核) + js/bcos-pkg.js (包管理), 均为静态前置。
 * ============================================================ */
(function() {
'use strict';
window.__BCOS_BOOTSTRAP__ = true;
const _t0 = Date.now();

/* ---------- 启动屏控制 ---------- */
function _splash(msg) {
    const el = document.getElementById('bcos-splash-text');
    if (el) el.textContent = msg || '加载模块…';
}
function _hideSplash() {
    const el = document.getElementById('bcos-splash');
    if (el) { el.classList.add('done'); setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 600); }
}

/* ---------- 失败兜底界面 ---------- */
function _fatal(err) {
    console.error('[Bootstrap] 💥 启动失败:', err);
    _hideSplash();
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:#0B1026;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;padding:24px;z-index:9999999;text-align:center;';
    d.innerHTML =
        '<div style="font-size:40px;margin-bottom:12px">🐰💥</div>' +
        '<div style="font-size:20px;font-weight:800;margin-bottom:8px">BCOS 启动失败</div>' +
        '<div style="font-size:12px;color:#ff9c9c;margin-bottom:6px;max-width:560px;word-break:break-all">' + (err && err.message ? err.message : err) + '</div>' +
        '<div style="font-size:11px;color:#8892b0;margin-bottom:20px">请检查网络后重试, 或使用静态完整版</div>' +
        '<div style="display:flex;gap:10px">' +
        '<button onclick="location.reload()" style="background:#7c8cff;border:none;color:#fff;padding:12px 24px;border-radius:10px;cursor:pointer;font-weight:700">🔄 重试</button>' +
        '<button onclick="location.href=\'./index-v82-static.html\'" style="background:transparent;border:1px solid #8892b0;color:#8892b0;padding:12px 24px;border-radius:10px;cursor:pointer">📦 静态完整版</button>' +
        '</div>';
    document.body.appendChild(d);
}

/* ---------- 主流程 (防重入: 合成 DCL 会再次触发自己的监听器) ---------- */
let _booted = false;
async function _boot() {
    if (_booted) { console.warn('[Bootstrap] 忽略重复触发'); return; }
    _booted = true;
    try {
        _splash('激活模块分区…');
        // 1. A/B 无缝更新: 上次下载的 staged 模块切换为 active
        try { if (window._bcosPkgActivateStaged) { const n = await window._bcosPkgActivateStaged(); if (n > 0) console.log('[Bootstrap] A/B 切换:', n, '个模块已激活'); } } catch (e) { console.warn('[Bootstrap] A/B 检查失败:', e); }

        // 2. 注册表驱动动态加载全部模块
        _splash('加载系统模块…');
        await BCOS.loader.bootFromRegistry();
        console.log('[Bootstrap] 模块加载完成 in ' + (Date.now() - _t0) + 'ms');

        // 3. 合成 DOMContentLoaded — 动态注入的模块错过了真实事件
        //    (先移除自身监听, 防止合成事件导致二次引导)
        try {
            document.removeEventListener('DOMContentLoaded', _boot);
            const evt = new Event('DOMContentLoaded', { bubbles: true, cancelable: true });
            document.dispatchEvent(evt);
        } catch (e) { console.warn('[Bootstrap] 合成 DCL 失败:', e); }

        // 4. Aurora 外壳 (bcos-8.js 自启动被 bootstrap 接管, 此处按静态模式时序手动触发)
        if (window._bcos8AutoInitHook) { try { window._bcos8AutoInitHook(); } catch (e) { console.error('[Bootstrap] Aurora 启动失败:', e); } }

        // 5. v82 初始化链 (theme → desktop → menubar → window → drawer → clock)
        BCOS.kernel.initChain();

        // 6. 就绪
        BCOS.kernel.markReady('dynamic');
        _hideSplash();
    } catch (e) {
        _fatal(e);
    }
}

/* ---------- SW 更新提示 ---------- */
if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'SW_UPDATED') {
            console.log('[Bootstrap] SW 已更新到', e.data.version);
            BCOS.event.emit('sw:updated', e.data);
        }
    });
}

/* ---------- 启动 ---------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
} else {
    // 脚本在 body 末尾, 正常情况下 readyState=loading; complete 说明被延迟执行
    setTimeout(_boot, 0);
}
})();
