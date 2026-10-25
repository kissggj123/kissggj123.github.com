/* v8.2 core/theme.js - 主题与壁纸 (健壮版: 修复 !important 覆盖问题) */
(function() {
    'use strict';
    const DEFAULT_BG = 'linear-gradient(135deg,#0B1026 0%,#1a2a4a 50%,#0B1026 100%)';
    function _ensureBg() {
        let bg = document.getElementById('bcos-desktop-bg');
        // 校验已存在元素: 必须是 body 直接子节点且 position:fixed
        // (旧桌面容器内嵌套的同 ID 元素仅带 background 内联样式, 容器隐藏时 0×0 不可见)
        if (bg && bg.parentElement === document.body && bg.style.position === 'fixed') return bg;
        if (bg) bg.removeAttribute('id'); // 让出 ID, 旧元素原地保留不影响旧桌面结构
        bg = document.createElement('div');
        bg.id = 'bcos-desktop-bg';
        bg.className = 'bcos-desktop-wallpaper';
        bg.style.cssText = 'position:fixed;inset:0;z-index:-5;background-size:cover;background-position:center;background-repeat:no-repeat;';
        document.body.insertBefore(bg, document.body.firstChild);
        // 迁移误挂进隐藏容器的组件 (如 Aurora 桌面时钟)
        const clock = document.getElementById('bcos-desk-clock');
        if (clock && clock.parentElement !== bg) bg.appendChild(clock);
        return bg;
    }
    // 使用 !important 设置背景, 确保覆盖 CSS 规则 (如 bcos-8.css 的 radial-gradient)
    function _setBg(bg, value) {
        bg.style.setProperty('background', value, 'important');
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
            _setBg(bg, DEFAULT_BG);
            return;
        }
        // 查找内置壁纸
        var wp = null;
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
            _setBg(bg, 'url(' + placeholder + ') center/cover no-repeat');
        } else {
            _setBg(bg, 'url(' + customBg + ') center/cover no-repeat');
        }
        // 如果有 b64 数据, 异步加载高清 blob 替换
        if (wp && wp.b64 && window.loadWallpaperBlob) {
            if (window.wpBlobCache && window.wpBlobCache[wp.file]) {
                _setBg(bg, 'url(' + window.wpBlobCache[wp.file] + ') center/cover no-repeat');
                return;
            }
            window.loadWallpaperBlob(wp, null, null).then(function(blob) {
                if (!blob) return;
                if (!window.wpBlobCache) window.wpBlobCache = {};
                var url = URL.createObjectURL(blob);
                window.wpBlobCache[wp.file] = url;
                try {
                    if (localStorage.getItem('bcosCustomBg') === customBg) {
                        _setBg(bg, 'url(' + url + ') center/cover no-repeat');
                        console.log('[Theme] 高清壁纸已应用:', wp.file);
                    }
                } catch(e) {}
            }).catch(function(e) {
                console.warn('[Theme] blob 加载失败, 使用文件路径:', e);
            });
        }
    };
    window._bcosSetWallpaper = function(file) {
        try { localStorage.setItem('bcosCustomBg', file); } catch(e) {}
        var bg = _ensureBg();
        var placeholder = null;
        if (window.WP_PLACEHOLDER && window.WP_PLACEHOLDER[file]) {
            placeholder = window.WP_PLACEHOLDER[file];
        }
        if (placeholder) {
            _setBg(bg, 'url(' + placeholder + ') center/cover no-repeat');
        } else {
            _setBg(bg, 'url(' + file + ') center/cover no-repeat');
        }
        window._bcosApplyDesktopTheme();
        document.dispatchEvent(new CustomEvent('bcos:wallpaper-changed', {detail:{file:file}}));
        console.log('[Theme] 壁纸已设置:', file);
    };
    window._bcosDesktopSetWallpaper = window._bcosSetWallpaper;
    console.log('[Theme] v8.2 主题模块已加载 (健壮版 !important fix)');
})();
