/* Phase 3 - 壁纸渲染引擎 (完整功能 + 体验优化) */
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
    // 进度条 UI
    function showProgress(show) {
        let bar = document.getElementById('bcos-wp-progress');
        if (show && !bar) {
            bar = document.createElement('div');
            bar.id = 'bcos-wp-progress';
            bar.innerHTML = '<div class="wp-prog-fill"></div>';
            bar.style.cssText = 'position:fixed;top:34px;left:0;right:0;height:3px;z-index:9500;background:rgba(255,255,255,.1);opacity:0;transition:opacity .3s';
            bar.querySelector('.wp-prog-fill').style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#7c8cff,#b48cff);transition:width .2s ease;box-shadow:0 0 12px #7c8cff';
            document.body.appendChild(bar);
        }
        if (bar) {
            bar.style.opacity = show ? '1' : '0';
            if (show) bar.querySelector('.wp-prog-fill').style.width = '0%';
        }
        return bar;
    }
    function setProgress(pct) {
        const bar = document.getElementById('bcos-wp-progress');
        if (bar) bar.querySelector('.wp-prog-fill').style.width = pct + '%';
    }
    // 应用壁纸 (blur-up + 进度条 + 过渡)
    BCOS.wallpaper.apply = async function(id) {
        const list = await BCOS.wallpaper.list();
        const wp = list.find(function(w) { return w.id === id; });
        if (!wp) return;
        const bg = document.getElementById('bcos-desktop-bg');
        if (!bg) return;
        const url = './' + wp.file;
        const dc = wp.edgeColors && wp.edgeColors.dominant ? wp.edgeColors.dominant : '#0B1026';
        // 占位
        bg.style.transition = 'none';
        bg.style.background = dc;
        bg.style.backgroundImage = 'none';
        bg.style.filter = 'blur(24px)';
        bg.style.transform = 'translateZ(0) scale(1.06)';
        // 进度条
        const bar = showProgress(true);
        setProgress(10);
        // fetch 带进度
        try {
            const resp = await fetch(url);
            const total = parseInt(resp.headers.get('content-length') || '0', 10);
            const reader = resp.body.getReader();
            const chunks = [];
            let received = 0;
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                if (total) setProgress(10 + Math.round(received / total * 80));
            }
            setProgress(95);
            const blob = new Blob(chunks);
            const objUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = function() {
                bg.style.transition = 'filter .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1)';
                bg.style.backgroundImage = 'url(' + objUrl + ')';
                bg.style.backgroundSize = 'cover';
                bg.style.backgroundPosition = 'center';
                setProgress(100);
                requestAnimationFrame(function() {
                    bg.style.filter = 'blur(0)';
                    bg.style.transform = 'translateZ(0) scale(1)';
                });
                setTimeout(function() { showProgress(false); }, 600);
            };
            img.onerror = function() {
                bg.style.filter = 'blur(0)';
                bg.style.transform = 'translateZ(0) scale(1)';
                bg.style.background = 'linear-gradient(135deg,#0B1026,#1a2a4a)';
                showProgress(false);
            };
            img.src = objUrl;
        } catch(e) {
            // fetch 失败，回退到直接 Image
            const img = new Image();
            img.onload = function() {
                bg.style.transition = 'filter .8s ease';
                bg.style.backgroundImage = 'url(' + url + ')';
                bg.style.backgroundSize = 'cover';
                bg.style.backgroundPosition = 'center';
                bg.style.filter = 'blur(0)';
                bg.style.transform = 'translateZ(0) scale(1)';
                showProgress(false);
            };
            img.src = url;
        }
    };
    BCOS.wallpaper.restore = async function() {
        try {
            const id = localStorage.getItem('bcosWallpaperId');
            if (id) await BCOS.wallpaper.apply(id);
        } catch(e) {}
    };
    console.log('[Wallpaper] 壁纸引擎就绪 (进度条+过渡)');
})();
