/* v8.2 core/theme.js - 主题与壁纸 (移植 7.8.6 稳定逻辑) */
(function() {
    'use strict';
    const DEFAULT_BG = 'linear-gradient(135deg,#0B1026 0%,#1a2a4a 50%,#0B1026 100%)';
    function _ensureBg() {
        let bg = document.getElementById('bcos-desktop-bg');
        if (!bg) {
            bg = document.createElement('div');
            bg.id = 'bcos-desktop-bg';
            bg.style.cssText = 'position:fixed;inset:0;z-index:-5;background:' + DEFAULT_BG + ';background-size:cover;background-position:center;background-repeat:no-repeat;';
            document.body.insertBefore(bg, document.body.firstChild);
        }
        return bg;
    }
    window._bcosThemeInit = function() {
        console.log('[Theme] 初始化');
        window._bcosApplyDesktopTheme();
    };
    // 7.8.6 移植: 渐进式壁纸加载
    window._bcosApplyDesktopTheme = function() {
        const bg = _ensureBg();
        let customBg = null;
        try { customBg = localStorage.getItem('bcosCustomBg'); } catch(e) {}
        if (customBg) {
            if (window.BUILTIN_WALLPAPERS) {
                const wp = window.BUILTIN_WALLPAPERS.find(w => w.file === customBg);
                if (wp && wp.b64) {
                    if (window.wpBlobCache && window.wpBlobCache[wp.file]) {
                        bg.style.background = 'url(' + window.wpBlobCache[wp.file] + ') center/cover no-repeat';
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
                                }
                            } catch(e) {}
                        }).catch(function(e){ console.error('[Theme]', e); });
                        return;
                    }
                }
            }
            bg.style.background = 'url(' + customBg + ') center/cover no-repeat';
        } else {
            bg.style.background = DEFAULT_BG;
        }
    };
    window._bcosSetWallpaper = function(file) {
        try { localStorage.setItem('bcosCustomBg', file); } catch(e) {}
        window._bcosApplyDesktopTheme();
        console.log('[Theme] 壁纸已设置:', file);
    };
    // 兼容旧接口
    window._bcosDesktopSetWallpaper = window._bcosSetWallpaper;
    console.log('[Theme] v8.2 主题模块已加载');
})();
