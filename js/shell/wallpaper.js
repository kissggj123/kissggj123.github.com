/* Phase 3 - 壁纸渲染引擎 (完整功能 + 大陆网络优化) */
(function() {
    'use strict';
    BCOS.wallpaper = BCOS.wallpaper || {};
    let manifest = null;
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
    BCOS.wallpaper.list = async function() {
        const m = await BCOS.wallpaper.loadManifest();
        if (!m) return [];
        const wps = m.wallpapers || [];
        // 去重 (按 id)
        const seen = {}, out = [];
        for (const w of wps) {
            if (!seen[w.id]) { seen[w.id] = 1; out.push(w); }
        }
        return out;
    };
    BCOS.wallpaper.set = function(id) {
        try {
            localStorage.setItem('bcosWallpaperId', id);
            BCOS.wallpaper.apply(id);
        } catch(e) {}
    };
    // 应用壁纸 (blur-up 渐进式，大陆网络优化)
    BCOS.wallpaper.apply = async function(id) {
        const list = await BCOS.wallpaper.list();
        const wp = list.find(function(w) { return w.id === id; });
        if (!wp) return;
        const bg = document.getElementById('bcos-desktop-bg');
        if (!bg) return;
        const url = './' + wp.file;
        // 1. 先显示低质量模糊占位 (如果有 edgeColors，用主色)
        const dc = wp.edgeColors && wp.edgeColors.dominant ? wp.edgeColors.dominant : '#0B1026';
        bg.style.background = dc;
        bg.style.filter = 'blur(20px)';
        bg.style.transform = 'translateZ(0) scale(1.05)'; // 防止模糊边缘
        // 2. 预加载原图
        const img = new Image();
        img.onload = function() {
            // 3. 淡入切换到高清
            bg.style.transition = 'filter .6s ease';
            bg.style.backgroundImage = 'url(' + url + ')';
            bg.style.backgroundSize = 'cover';
            bg.style.backgroundPosition = 'center';
            requestAnimationFrame(function() {
                bg.style.filter = 'blur(0)';
                bg.style.transform = 'translateZ(0) scale(1)';
            });
        };
        img.onerror = function() {
            // 失败回退到渐变
            bg.style.filter = 'blur(0)';
            bg.style.background = 'linear-gradient(135deg,#0B1026,#1a2a4a)';
        };
        img.src = url;
    };
    BCOS.wallpaper.restore = async function() {
        try {
            const id = localStorage.getItem('bcosWallpaperId');
            if (id) await BCOS.wallpaper.apply(id);
        } catch(e) {}
    };
    console.log('[Wallpaper] Phase 3 壁纸引擎就绪 (blur-up)');
})();
