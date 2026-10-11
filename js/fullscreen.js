/* ===== js/fullscreen.js — 沉浸式全屏管理器 (v8.0.2) ===== */
(function() {
    'use strict';
    let _intentionalExit = false;
    let _hasEntered = false;
    let _promptEl = null;
    function _isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }
    function _enterFullscreen() {
        if (_isFullscreen()) return Promise.resolve();
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!req) return Promise.reject(new Error('不支持全屏'));
        console.log('[Fullscreen] 请求进入全屏…');
        return req.call(el).then(() => {
            _hasEntered = true; _intentionalExit = false;
            console.log('[Fullscreen] ✅ 已进入全屏');
            _hidePrompt();
        }).catch(e => console.warn('[Fullscreen] 进入失败:', e.message));
    }
    function _exitFullscreen() {
        _intentionalExit = true;
        console.log('[Fullscreen] 用户主动退出全屏');
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        _hidePrompt();
    }
    function _showPrompt() {
        if (_promptEl || _intentionalExit) return;
        _promptEl = document.createElement('div');
        _promptEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:999999;' +
            'background:rgba(20,20,30,.92);backdrop-filter:blur(12px);border:1px solid rgba(124,140,255,.4);' +
            'border-radius:14px;padding:10px 18px;display:flex;align-items:center;gap:12px;' +
            'font-size:13px;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,.5);cursor:pointer;';
        _promptEl.innerHTML = '<span>🖥️</span><span>点击重新进入沉浸式全屏</span>';
        _promptEl.onclick = () => _enterFullscreen();
        document.body.appendChild(_promptEl);
        setTimeout(_hidePrompt, 8000);
    }
    function _hidePrompt() { if (_promptEl) { _promptEl.remove(); _promptEl = null; } }
    function _onFirstGesture() {
        console.log('[Fullscreen] 首次手势, 进入全屏');
        _enterFullscreen();
        document.removeEventListener('pointerdown', _onFirstGesture);
        document.removeEventListener('keydown', _onFirstGesture);
    }
    function _onFullscreenChange() {
        const fs = _isFullscreen();
        console.log('[Fullscreen] 状态:', fs ? '进入' : '退出', _intentionalExit ? '(主动)' : '(被动)');
        if (!fs && _hasEntered && !_intentionalExit) setTimeout(_showPrompt, 500);
        if (fs) _intentionalExit = false;
    }
    function _init() {
        if (_isFullscreen()) _hasEntered = true;
        document.addEventListener('pointerdown', _onFirstGesture);
        document.addEventListener('keydown', _onFirstGesture);
        document.addEventListener('fullscreenchange', _onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', _onFullscreenChange);
        console.log('[Fullscreen] 已初始化, 等待首次手势');
    }
    window._bcosFullscreen = {
        enter: _enterFullscreen, exit: _exitFullscreen,
        toggle: () => _isFullscreen() ? _exitFullscreen() : _enterFullscreen(),
        isFullscreen: _isFullscreen
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
    else _init();
})();
