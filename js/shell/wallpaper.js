/* Phase 3 - 壁纸引擎 (两阶段: 优化版→原版) */
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
        } catch(e) { return null; }
    };
    BCOS.wallpaper.list = async function() {
        const m = await BCOS.wallpaper.loadManifest();
        if (!m) return [];
        const seen = {}, out = [];
        for (const w of (m.wallpapers || [])) {
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
    function showProgress(show) {
        let bar = document.getElementById('bcos-wp-progress');
        if (show && !bar) {
            bar = document.createElement('div');
            bar.id = 'bcos-wp-progress';
            bar.innerHTML = '<div class="wp-prog-fill"></div>';
            bar.style.cssText = 'position:fixed;top:34px;left:0;right:0;height:3px;z-index:9500;background:rgba(255,255,255,.1);opacity:0;transition:opacity .3s';
            bar.querySelector('.wp-prog-fill').style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#7c8cff,#b48cff);transition:width .2s;box-shadow:0 0 12px #7c8cff';
            document.body.appendChild(bar);
        }
        if (bar) {
            bar.style.opacity = show ? '1' : '0';
            if (show) bar.querySelector('.wp-prog-fill').style.width = '5%';
        }
    }
    // 两阶段加载
    BCOS.wallpaper.apply = async function(id) {
        const list = await BCOS.wallpaper.list();
        const wp = list.find(function(w) { return w.id === id; });
        if (!wp) return;
        const bg = document.getElementById('bcos-desktop-bg');
        if (!bg) return;
        const optUrl = './' + wp.file;  // 优化版 (opt.jpg)
        const dc = wp.edgeColors && wp.edgeColors.dominant ? wp.edgeColors.dominant : '#0B1026';
        // 阶段0: 主色占位
        bg.style.transition = 'none';
        bg.style.background = dc;
        bg.style.backgroundImage = 'none';
        bg.style.filter = 'blur(24px)';
        bg.style.transform = 'translateZ(0) scale(1.06)';
        showProgress(true);
        // 阶段1: 优化版 (浏览器渐进式渲染)
        const img1 = new Image();
        img1.onload = function() {
            // 优化版显示
            bg.style.transition = 'filter .5s ease';
            bg.style.backgroundImage = 'url(' + optUrl + ')';
            bg.style.backgroundSize = 'cover';
            bg.style.backgroundPosition = 'center';
            bg.style.filter = 'blur(8px)';  // 轻微模糊，表示还在加载高清
            document.getElementById('bcos-wp-progress').querySelector('.wp-prog-fill').style.width = '60%';
            // 阶段2: 原版 (这里 opt.jpg 即原版，如有更高清则在此加载)
            // 目前 opt.jpg 已是最高清，直接去模糊完成
            requestAnimationFrame(function() {
                bg.style.transition = 'filter .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1)';
                bg.style.filter = 'blur(0)';
                bg.style.transform = 'translateZ(0) scale(1)';
                document.getElementById('bcos-wp-progress').querySelector('.wp-prog-fill').style.width = '100%';
            });
            setTimeout(function() { showProgress(false); }, 800);
        };
        img1.onerror = function() {
            bg.style.filter = 'blur(0)';
            bg.style.transform = 'translateZ(0) scale(1)';
            bg.style.background = 'linear-gradient(135deg,#0B1026,#1a2a4a)';
            showProgress(false);
        };
        img1.src = optUrl;
    };
    BCOS.wallpaper.restore = async function() {
        try {
            const id = localStorage.getItem('bcosWallpaperId');
            if (id) await BCOS.wallpaper.apply(id);
        } catch(e) {}
    };
    console.log('[Wallpaper] 两阶段引擎就绪');
})();
