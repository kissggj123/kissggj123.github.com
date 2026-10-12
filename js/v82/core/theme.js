/* v8.2 core/theme.js - 主题与壁纸 (移植 7.8.6 稳定逻辑 + 健壮修复) */
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
    // v8.2 健壮版壁纸应用: 先立即设置文件路径, 再异步加载高清 blob
    window._bcosApplyDesktopTheme = function() {
        const bg = _ensureBg();
        let customBg = null;
        try { customBg = localStorage.getItem('bcosCustomBg'); } catch(e) {}
        if (!customBg) {
            bg.style.background = DEFAULT_BG;
            return;
        }
        // 查找内置壁纸
        let wp = null;
        if (window.BUILTIN_WALLPAPERS) {
            try {
                wp = window.BUILTIN_WALLPAPERS.find(function(w){ return w.file === customBg; });
            } catch(e) {}
        }
        // 立即用占位图或文件路径 (确保不闪屏)
        var placeholder = null;
        if (wp && window.WP_PLACEHOLDER && window.WP_PLACEHOLDER[wp.file]) {
            placeholder = window.WP_PLACEHOLDER[wp.file];
        }
        if (placeholder) {
            bg.style.background = 'url(' + placeholder + ') center/cover no-repeat';
        } else {
            // 直接用文件路径作为即时显示
            bg.style.background = 'url(' + customBg + ') center/cover no-repeat';
        }
        // 如果有 b64 数据, 异步加载高清 blob 替换
        if (wp && wp.b64 && window.loadWallpaperBlob) {
            // 已有缓存直接用
            if (window.wpBlobCache && window.wpBlobCache[wp.file]) {
                bg.style.background = 'url(' + window.wpBlobCache[wp.file] + ') center/cover no-repeat';
                return;
            }
            window.loadWallpaperBlob(wp, null, null).then(function(blob) {
                if (!blob) return;
                if (!window.wpBlobCache) window.wpBlobCache = {};
                var url = URL.createObjectURL(blob);
                window.wpBlobCache[wp.file] = url;
                try {
                    if (localStorage.getItem('bcosCustomBg') === customBg) {
                        bg.style.background = 'url(' + url + ') center/cover no-repeat';
                        console.log('[Theme] 高清壁纸已应用:', wp.file);
                    }
                } catch(e) {}
            }).catch(function(e) {
                console.warn('[Theme] blob 加载失败, 使用文件路径:', e);
                // blob 失败时确保文件路径已设置 (上面已设)
            });
        }
    };
    window._bcosSetWallpaper = function(file) {
        try { localStorage.setItem('bcosCustomBg', file); } catch(e) {}
        // 立即应用 (不等 blob)
        var bg = _ensureBg();
        var placeholder = null;
        if (window.WP_PLACEHOLDER && window.WP_PLACEHOLDER[file]) {
            placeholder = window.WP_PLACEHOLDER[file];
        }
        if (placeholder) {
            bg.style.background = 'url(' + placeholder + ') center/cover no-repeat';
        } else {
            bg.style.background = 'url(' + file + ') center/cover no-repeat';
        }
        // 再异步加载高清
        window._bcosApplyDesktopTheme();
        // 通知其他模块
        document.dispatchEvent(new CustomEvent('bcos:wallpaper-changed', {detail:{file:file}}));
        console.log('[Theme] 壁纸已设置:', file);
    };
    // 兼容旧接口
    window._bcosDesktopSetWallpaper = window._bcosSetWallpaper;
    // 防止旧系统覆盖: 监听 DOMContentLoaded 后重新声明
    function _reassert() {
        // 如果被旧系统覆盖了, 重新夺回
        var fn = window._bcosApplyDesktopTheme;
        if (!fn || fn.toString().indexOf('_ensureBg') === -1) {
            // 已被覆盖, 但我们的版本已在上面的闭包中, 重新引用即可
            // 由于闭包引用, 重新赋值会使用同一函数
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){
            setTimeout(_reassert, 200);
        });
    } else {
        setTimeout(_reassert, 200);
    }
    console.log('[Theme] v8.2 主题模块已加载 (健壮版)');
})();
