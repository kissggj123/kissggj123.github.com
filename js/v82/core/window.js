/* v8.2 core/window.js - Aurora 22px圆角毛玻璃窗口 */
(function() {
    'use strict';
    let zTop = 100;
    window._bcosWindowInit = function() { console.log('[Window] 初始化'); };
    // 打开应用窗口 (兼容 7.8.6 的 _bcosOpenApp 调用)
    const _origOpen = window._bcosOpenApp;
    window._bcosOpenApp = function(id) {
        console.log('[Window] 打开:', id);
        // 如果 7.8.6 有实现，优先用它的内容，只套 Aurora 皮肤
        if (_origOpen && _origOpen !== window._bcosOpenApp) {
            return _origOpen(id);
        }
        // 否则创建空窗口
        _createWin(id, id, '<div style="padding:20px;color:#fff">应用: ' + id + '</div>');
    };
    function _createWin(id, title, html) {
        let w = document.getElementById('win-' + id);
        if (w) { w.style.zIndex = ++zTop; w.style.display = 'flex'; return; }
        w = document.createElement('div');
        w.id = 'win-' + id;
        w.className = 'bcos-win-v82';
        w.innerHTML =
            '<div class="win-bar"><span class="win-title">' + title + '</span>' +
            '<span class="win-btns"><i data-a="min">—</i><i data-a="max">□</i><i data-a="close">×</i></span></div>' +
            '<div class="win-body">' + html + '</div>';
        w.style.zIndex = ++zTop;
        document.body.appendChild(w);
        // 按钮
        w.querySelector('[data-a="close"]').onclick = function() { w.style.display = 'none'; };
        w.querySelector('[data-a="min"]').onclick = function() { w.style.display = 'none'; };
        w.querySelector('[data-a="max"]').onclick = function() { w.classList.toggle('max'); };
        // 拖动
        const bar = w.querySelector('.win-bar');
        let sx, sy, ox, oy, drag = false;
        bar.onmousedown = function(e) {
            if (e.target.tagName === 'I') return;
            drag = true; sx = e.clientX; sy = e.clientY;
            ox = w.offsetLeft; oy = w.offsetTop;
            document.onmousemove = function(e) {
                if (!drag) return;
                w.style.left = (ox + e.clientX - sx) + 'px';
                w.style.top = Math.max(34, oy + e.clientY - sy) + 'px';
                w.style.transform = 'none';
            };
            document.onmouseup = function() { drag = false; document.onmousemove = null; };
        };
        w.onmousedown = function() { w.style.zIndex = ++zTop; };
    }
    window._bcosCreateWin = _createWin;
    console.log('[Window] v8.2 窗口模块已加载');
})();
