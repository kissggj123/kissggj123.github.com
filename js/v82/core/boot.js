/* v8.2 core/boot.js - 启动序列 */
(function() {
    'use strict';
    console.log('[Boot] v8.2 启动...');
    window._bcosBootTime = Date.now();
    // 首次启动标记
    const isFirst = !localStorage.getItem('bcos_booted_v82');
    if (isFirst) {
        console.log('[Boot] 首次启动');
        // 显示启动屏由 theme.js 处理
    }
    // 按序初始化
    function _boot() {
        console.log('[Boot] 初始化核心模块...');
        if (window._bcosThemeInit) window._bcosThemeInit();
        if (window._bcosDesktopInit) window._bcosDesktopInit();
        if (window._bcosMenubarInit) window._bcosMenubarInit();
        if (window._bcosWindowInit) window._bcosWindowInit();
        if (window._bcosDrawerInit) window._bcosDrawerInit();
        if (window._bcosClockInit) window._bcosClockInit();
        try { localStorage.setItem('bcos_booted_v82', '1'); } catch(e) {}
        console.log('[Boot] ✅ v8.2 启动完成 in ' + (Date.now() - window._bcosBootTime) + 'ms');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _boot);
    } else {
        setTimeout(_boot, 50);
    }
})();
