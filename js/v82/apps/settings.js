/* v8.2 apps/settings.js - 设置 (壁纸UI) */
(function() {
    'use strict';
    // 壁纸设置面板 HTML (供设置应用调用)
    window._bcosWallpaperPanelHTML = function() {
        const wps = window.BUILTIN_WALLPAPERS || [];
        const cur = localStorage.getItem('bcosCustomBg') || '';
        let html = '<div class="wp-grid">';
        wps.forEach(function(w) {
            const sel = (w.file === cur) ? ' sel' : '';
            const thumb = (window.WP_PLACEHOLDER && window.WP_PLACEHOLDER[w.file]) || w.file;
            html += '<div class="wp-tile' + sel + '" data-file="' + w.file + '">' +
                '<img src="' + thumb + '" loading="lazy"><span>' + w.name + '</span></div>';
        });
        html += '</div>';
        return html;
    };
    // 绑定壁纸点击事件
    window._bcosBindWallpaperTiles = function(container) {
        container.querySelectorAll('.wp-tile').forEach(function(tile) {
            tile.onclick = function() {
                const f = tile.getAttribute('data-file');
                if (window._bcosSetWallpaper) window._bcosSetWallpaper(f);
                container.querySelectorAll('.wp-tile').forEach(function(t){ t.classList.remove('sel'); });
                tile.classList.add('sel');
            };
        });
    };
    console.log('[Settings] v8.2 设置模块已加载');
})();
