/* BCOS 统一 API v8.2 */
(function() {
    'use strict';
    window.BCOS = window.BCOS || {};
    BCOS.version = '8.2.0';
    // 内核
    BCOS.vfs = {
        list: function(p) { return window._bcosVFS ? window._bcosVFS.list(p) : null; },
        read: function(p) { return window._bcosVFS ? window._bcosVFS.read(p) : null; },
        write: function(p, c) { return window._bcosVFS ? window._bcosVFS.write(p, c) : false; },
    };
    // 壁纸
    BCOS.wallpaper = {
        set: function(f) { if (window._bcosSetWallpaper) window._bcosSetWallpaper(f); },
        current: function() { try { return localStorage.getItem('bcosCustomBg'); } catch(e) { return null; } },
    };
    console.log('[BCOS API] v8.2 统一接口就绪');
})();
