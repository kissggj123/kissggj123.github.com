/* v8.2 core/fullscreen.js - 沉浸式全屏 */
(function() {
    'use strict';
    let entered = false;
    function _enter() {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!req || entered) return;
        try {
            const p = req.call(el);
            if (p && p.catch) p.catch(function(){});
            entered = true;
            console.log('[FS] 已进入全屏');
        } catch(e) {}
    }
    function _onGesture() {
        _enter();
        document.removeEventListener('pointerdown', _onGesture);
        document.removeEventListener('keydown', _onGesture);
    }
    // 首次用户手势进入全屏
    document.addEventListener('pointerdown', _onGesture);
    document.addEventListener('keydown', _onGesture);
    document.addEventListener('fullscreenchange', function() {
        entered = !!document.fullscreenElement;
        // 被动退出时显示提示
        if (!entered) {
            let tip = document.getElementById('bcos-fs-tip');
            if (!tip) {
                tip = document.createElement('div');
                tip.id = 'bcos-fs-tip';
                tip.textContent = '🖥️ 点击重新进入沉浸式全屏';
                tip.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(20,24,48,.9);color:#fff;padding:10px 20px;border-radius:12px;font-size:13px;cursor:pointer;backdrop-filter:blur(20px);';
                tip.onclick = function() { _enter(); tip.remove(); };
                document.body.appendChild(tip);
                setTimeout(function(){ if (tip.parentNode) tip.remove(); }, 8000);
            }
        }
    });
    window._bcosFullscreen = {
        enter: _enter,
        exit: function() { if (document.exitFullscreen) document.exitFullscreen(); },
        toggle: function() { entered ? this.exit() : _enter(); },
        isFullscreen: function() { return entered; }
    };
    console.log('[FS] v8.2 全屏模块已加载');
})();
