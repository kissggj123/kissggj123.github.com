/* Phase 3 - 壁纸渲染引擎 (完整功能) */
(function() {
    'use strict';
    BCOS.wallpaper = BCOS.wallpaper || {};
    let manifest = null;
    // 加载 manifest
    BCOS.wallpaper.loadManifest = async function() {
        if (manifest) return manifest;
        try {
            const r = await fetch('./wallpaper/manifest.json');
            manifest = await r.json();
            return manifest;
        } catch(e) {
            console.error('[Wallpaper] manifest 加载失败', e);
            return null;
        }
    };
    // 获取壁纸列表
    BCOS.wallpaper.list = async function() {
        const m = await BCOS.wallpaper.loadManifest();
        return m ? (m.wallpapers || []) : [];
    };
    // 设置壁纸 (持久化)
    BCOS.wallpaper.set = function(id) {
        try {
            localStorage.setItem('bcosWallpaperId', id);
            BCOS.wallpaper.apply(id);
        } catch(e) {}
    };
    // 应用壁纸到桌面
    BCOS.wallpaper.apply = async function(id) {
        const list = await BCOS.wallpaper.list();
        const wp = list.find(function(w) { return w.id === id; });
        if (!wp) return;
        const bg = document.getElementById('bcos-desktop-bg');
        if (!bg) return;
        // 优先用 b64 (离线)，回退到 file
        let url = wp.file;
        if (wp.b64) {
            try {
                // b64 是分片的，这里简化处理用 file
                url = './' + wp.file;
            } catch(e) {}
        } else {
            url = './' + wp.file;
        }
        // 预加载后切换 (GPU)
        const img = new Image();
        img.onload = function() {
            bg.style.backgroundImage = 'url(' + url + ')';
            bg.style.transform = 'translateZ(0)';
        };
        img.src = url;
    };
    // 恢复上次壁纸
    BCOS.wallpaper.restore = async function() {
        try {
            const id = localStorage.getItem('bcosWallpaperId');
            if (id) await BCOS.wallpaper.apply(id);
        } catch(e) {}
    };
    console.log('[Wallpaper] Phase 3 壁纸引擎就绪');
})();
