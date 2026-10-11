/* ===== js/wallpaper-mgr.js — 壁纸管理器 (v8.0.2 重写) ===== */
(function() {
    'use strict';
    function _getLayer() { return document.getElementById('bg-layer'); }
    function _hideOverlays(hide) {
        ['bg-pattern', 'bg-grid', 'bg-glow'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = hide ? 'none' : '';
        });
    }
    window._bcosWallpaperSet = function(imgUrl) {
        console.log('[Wallpaper] 设置:', imgUrl);
        const layer = _getLayer();
        if (!layer) { console.error('[Wallpaper] #bg-layer 不存在!'); return false; }
        layer.style.setProperty('background-image', `url("${imgUrl}")`, 'important');
        layer.style.setProperty('background-size', 'cover', 'important');
        layer.style.setProperty('background-position', 'center', 'important');
        layer.style.setProperty('background-repeat', 'no-repeat', 'important');
        _hideOverlays(true);
        const img = new Image();
        img.onload = () => console.log('[Wallpaper] ✅ 显示成功');
        img.onerror = () => console.error('[Wallpaper] ❌ 图片加载失败:', imgUrl);
        img.src = imgUrl;
        try { localStorage.setItem('bcosCustomBg', imgUrl); } catch(e) {}
        return true;
    };
    window._bcosWallpaperClear = function() {
        const layer = _getLayer();
        if (!layer) return;
        layer.style.removeProperty('background-image');
        _hideOverlays(false);
        try { localStorage.removeItem('bcosCustomBg'); } catch(e) {}
        console.log('[Wallpaper] 已清除');
    };
    window._bcosWallpaperRestore = function() {
        const wp = localStorage.getItem('bcosCustomBg');
        if (wp) {
            console.log('[Wallpaper] 恢复:', wp);
            const cache = window.wpBlobCache || {};
            const url = (cache[wp] && cache[wp].startsWith('blob:')) ? cache[wp] : wp;
            window._bcosWallpaperSet(url);
        } else console.log('[Wallpaper] 无保存的壁纸');
    };
    console.log('[Wallpaper] 管理器已加载');
})();
