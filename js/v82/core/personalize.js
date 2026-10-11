/* v8.2 core/personalize.js - 个性化设置 */
(function() {
    'use strict';
    const KEY = 'bcos_personalize_v82';
    const defaults = {
        accent: '#7c8cff',      // 主题色
        clockShow: true,        // 显示桌面时钟
        dockPos: 'bottom',      // 抽屉位置偏好
    };
    function _get() {
        try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY)||'{}')); }
        catch(e) { return Object.assign({}, defaults); }
    }
    function _set(patch) {
        try { localStorage.setItem(KEY, JSON.stringify(Object.assign(_get(), patch))); } catch(e) {}
        _apply();
    }
    function _apply() {
        const p = _get();
        // 应用主题色
        document.documentElement.style.setProperty('--bcos-accent', p.accent);
        // 时钟显示
        const clock = document.getElementById('bcos-desk-clock');
        if (clock) clock.style.display = p.clockShow ? '' : 'none';
    }
    window._bcosPersonalize = {
        get: _get,
        set: _set,
        apply: _apply,
        // 预设主题色
        presets: ['#7c8cff','#ff6b6b','#4ecdc4','#ffe66d','#a8e6cf','#ff8b94'],
    };
    // 启动时应用
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _apply);
    } else { setTimeout(_apply, 100); }
    console.log('[Personalize] v8.2 个性化模块已加载');
})();
