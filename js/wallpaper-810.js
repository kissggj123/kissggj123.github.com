/* v8.1.0 wallpaper - ported from 7.8.6 stable logic */
(function() {
    'use strict';
    function _ensureBg() {
        let bg = document.getElementById('bcos-desktop-bg');
        // 必须是 body 直接子节点且 position:fixed, 否则重建
        // (旧桌面容器内嵌套的同 ID 元素容器隐藏时 0×0 不可见)
        if (bg && bg.parentElement === document.body && bg.style.position === 'fixed') return bg;
        if (bg) bg.removeAttribute('id');
        bg = document.createElement('div');
        bg.id = 'bcos-desktop-bg';
        bg.className = 'bcos-desktop-wallpaper';
        bg.style.cssText = 'position:fixed;inset:0;z-index:-5;background:linear-gradient(135deg,#0B1026 0%,#1a2a4a 50%,#0B1026 100%);background-size:cover;background-position:center;background-repeat:no-repeat;';
        document.body.insertBefore(bg, document.body.firstChild);
        console.log('[WP810] #bcos-desktop-bg created');
        return bg;
    }
    window._bcosApplyDesktopTheme = function() {
        const bg = _ensureBg();
        if (!bg) return;
        let customBg = null;
        try { customBg = localStorage.getItem('bcosCustomBg'); } catch(e) {}
        if (customBg) {
            if (window.BUILTIN_WALLPAPERS) {
                const wp = window.BUILTIN_WALLPAPERS.find(w => w.file === customBg);
                if (wp && wp.b64) {
                    if (window.wpBlobCache && window.wpBlobCache[wp.file]) {
                        bg.style.background = 'url(' + window.wpBlobCache[wp.file] + ') center/cover no-repeat';
                        console.log('[WP810] blob cache');
                        return;
                    }
                    if (window.loadWallpaperBlob) {
                        if (window.WP_PLACEHOLDER && window.WP_PLACEHOLDER[wp.file]) {
                            bg.style.background = 'url(' + window.WP_PLACEHOLDER[wp.file] + ') center/cover no-repeat';
                        }
                        window.loadWallpaperBlob(wp, null, null).then(function(blob) {
                            if (!window.wpBlobCache) window.wpBlobCache = {};
                            const url = URL.createObjectURL(blob);
                            window.wpBlobCache[wp.file] = url;
                            try {
                                if (localStorage.getItem('bcosCustomBg') === customBg) {
                                    bg.style.background = 'url(' + url + ') center/cover no-repeat';
                                    console.log('[WP810] full res applied');
                                }
                            } catch(e) {}
                        }).catch(function(e){ console.error('[WP810]', e); });
                        return;
                    }
                }
            }
            bg.style.background = 'url(' + customBg + ') center/cover no-repeat';
            console.log('[WP810] file path');
        } else {
            bg.style.background = 'linear-gradient(135deg,#0B1026 0%,#1a2a4a 50%,#0B1026 100%)';
        }
    };
    window._bcosDesktopSetWallpaper = function(file) {
        try { localStorage.setItem('bcosCustomBg', file); } catch(e) {}
        window._bcosApplyDesktopTheme();
    };
    console.log('[WP810] loaded');
})();
