/* Phase 2 - 窗口管理器 (macOS 风格, GPU) */
(function() {
    'use strict';
    let zTop = 100;
    BCOS.window = BCOS.window || {};
    BCOS.window.open = function(id, title, html) {
        // 关闭已存在的
        const old = document.getElementById('win-' + id);
        if (old) { old.style.zIndex = ++zTop; old.style.display = 'flex'; return old; }
        const w = document.createElement('div');
        w.id = 'win-' + id;
        w.className = 'bcos-window';
        w.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%) translateZ(0);width:min(700px,92vw);height:min(480px,80vh);z-index:' + (++zTop);
        w.innerHTML = '<div class="win-titlebar"><div class="win-traffic"><i class="close" data-a="close"></i><i class="min" data-a="min"></i><i class="max" data-a="max"></i></div><span style="font-size:13px;font-weight:600">' + title + '</span></div><div style="flex:1;overflow:auto">' + html + '</div>';
        document.body.appendChild(w);
        // 按钮
        w.querySelector('[data-a="close"]').onclick = function(e) { e.stopPropagation(); w.remove(); };
        w.querySelector('[data-a="min"]').onclick = function(e) { e.stopPropagation(); w.style.display = 'none'; };
        w.querySelector('[data-a="max"]').onclick = function(e) {
            e.stopPropagation();
            if (w.dataset.max === '1') {
                w.dataset.max = ''; w.style.cssText += ';left:50%;top:50%;transform:translate(-50%,-50%) translateZ(0);width:min(700px,92vw);height:min(480px,80vh)';
            } else {
                w.dataset.max = '1'; w.style.cssText += ';left:8px;top:42px;transform:translateZ(0);width:calc(100vw - 16px);height:calc(100vh - 50px)';
            }
        };
        // 拖动 (GPU: transform)
        const bar = w.querySelector('.win-titlebar');
        let sx, sy, ox, oy, dragging = false;
        bar.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'I') return;
            dragging = true; sx = e.clientX; sy = e.clientY;
            const r = w.getBoundingClientRect(); ox = r.left; oy = r.top;
            w.style.transform = 'translateZ(0)'; w.style.left = ox + 'px'; w.style.top = oy + 'px';
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            w.style.left = (ox + e.clientX - sx) + 'px';
            w.style.top = Math.max(34, oy + e.clientY - sy) + 'px';
        });
        document.addEventListener('mouseup', function() { dragging = false; });
        w.addEventListener('mousedown', function() { w.style.zIndex = ++zTop; });
        return w;
    };
    console.log('[Window] Phase 2 窗口管理器就绪 (GPU)');
})();
