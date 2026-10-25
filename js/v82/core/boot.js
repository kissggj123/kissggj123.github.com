/* v9 core/boot.js — v82 初始化链 (由 bcos-bootstrap.js 编排) */
(function() {
    'use strict';
    // 统一初始化链: 静态/动态两种模式都走这里
    window._bcosInitChain = function() {
        console.log('[Boot] 初始化核心模块...');
        if (window._bcosThemeInit) window._bcosThemeInit();
        if (window._bcosDesktopInit) window._bcosDesktopInit();
        if (window._bcosMenubarInit) window._bcosMenubarInit();
        if (window._bcosWindowInit) window._bcosWindowInit();
        if (window._bcosDrawerInit) window._bcosDrawerInit();
        if (window._bcosClockInit) window._bcosClockInit();
        try { localStorage.setItem('bcos_booted_v82', '1'); } catch(e) {}
        console.log('[Boot] ✅ v82 初始化链完成');
    };
    // bootstrap 接管时不再自启 (避免双重初始化)
    if (window.__BCOS_BOOTSTRAP__) return;
    console.log('[Boot] v82 静态模式启动...');
    window._bcosBootTime = Date.now();
    function _boot() {
        window._bcosInitChain();
        if (window.BCOS && BCOS.kernel.markReady) BCOS.kernel.markReady('static');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _boot);
    } else {
        setTimeout(_boot, 50);
    }
})();
