/* Phase 3 - 壁纸引擎 (两阶段 + 横竖屏自适应) */
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
    // 横竖屏自适应：返回合适的 background-size
    function adaptiveSize(wp) {
        const isPortraitScreen = window.innerHeight > window.innerWidth;
        const isLandscapeWp = wp.orientation === 'landscape';
        if (isPortraitScreen && isLandscapeWp) {
            return 'auto 100%';  // 竖屏看横图：高度填满，左右可裁
        }
        return 'cover';
    }
    BCOS.wallpaper.apply = async function(id) {
        const list = await BCOS.wallpaper.list();
        const wp = list.find(function(w) { return w.id === id; });
        if (!wp) return;
        const bg = document.getElementById('bcos-desktop-bg');
        if (!bg) return;
        const optUrl = './' + wp.file;
        const dc = wp.edgeColors && wp.edgeColors.dominant ? wp.edgeColors.dominant : '#0B1026';
        bg.style.transition = 'none';
        bg.style.background = dc;
        bg.style.backgroundImage = 'none';
        bg.style.filter = 'blur(24px)';
        bg.style.transform = 'translateZ(0) scale(1.06)';
        showProgress(true);
        const img1 = new Image();
        img1.onload = function() {
            bg.style.transition = 'filter .5s ease';
            bg.style.backgroundImage = 'url(' + optUrl + ')';
            bg.style.backgroundSize = adaptiveSize(wp);
            bg.style.backgroundPosition = 'center';
            bg.style.filter = 'blur(8px)';
            const pf = document.getElementById('bcos-wp-progress');
            if (pf) pf.querySelector('.wp-prog-fill').style.width = '60%';
            requestAnimationFrame(function() {
                bg.style.transition = 'filter .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1)';
                bg.style.filter = 'blur(0)';
                bg.style.transform = 'translateZ(0) scale(1)';
                const pf2 = document.getElementById('bcos-wp-progress');
                if (pf2) pf2.querySelector('.wp-prog-fill').style.width = '100%';
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
    // 屏幕旋转时重新适配
    window.addEventListener('resize', function() {
        try {
            const id = localStorage.getItem('bcosWallpaperId');
            const bg = document.getElementById('bcos-desktop-bg');
            if (id && bg && bg.style.backgroundImage && bg.style.backgroundImage !== 'none') {
                BCOS.wallpaper.list().then(function(list) {
                    const wp = list.find(function(w) { return w.id === id; });
                    if (wp) bg.style.backgroundSize = adaptiveSize(wp);
                });
            }
        } catch(e) {}
    });
    // 全屏预览
    BCOS.wallpaper.previewFullscreen = async function(id) {
        const list = await BCOS.wallpaper.list();
        const wp = list.find(function(w) { return w.id === id; });
        if (!wp) return;
        let ov = document.getElementById('bcos-wp-fullscreen');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'bcos-wp-fullscreen';
            ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:none;align-items:center;justify-content:center;cursor:zoom-out';
            ov.innerHTML = '<img style="max-width:100%;max-height:100%;object-fit:contain;transform:translateZ(0)">'
                + '<div style="position:absolute;top:20px;right:20px;color:#fff;font-size:14px;background:rgba(0,0,0,.6);padding:8px 16px;border-radius:10px"></div>';
            document.body.appendChild(ov);
            ov.onclick = function() { ov.style.display = 'none'; };
            document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && ov.style.display === 'flex') ov.style.display = 'none'; });
        }
        ov.querySelector('img').src = './' + wp.file;
        ov.querySelector('div').textContent = wp.name || wp.id;
        ov.style.display = 'flex';
    };
    BCOS.wallpaper.restore = async function() {
        try {
            const id = localStorage.getItem('bcosWallpaperId');
            if (id) await BCOS.wallpaper.apply(id);
        } catch(e) {}
    };
    console.log('[Wallpaper] 两阶段+自适应引擎就绪');
})();
