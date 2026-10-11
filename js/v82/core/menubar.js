/* v8.2 core/menubar.js - macOS式通顶菜单栏 */
(function() {
    'use strict';
    window._bcosMenubarInit = function() {
        console.log('[Menubar] 初始化');
        if (document.getElementById('bcos-menubar-v82')) return;
        const bar = document.createElement('div');
        bar.id = 'bcos-menubar-v82';
        bar.innerHTML =
            '<div class="mb-left"><span class="mb-logo">🐰</span><span class="mb-title">Bunny Cockpit OS</span></div>' +
            '<div class="mb-right">' +
            '<span id="mb-drawer" title="应用抽屉" style="cursor:pointer">🚀</span>' +
            '<span id="mb-cc" title="控制中心" style="cursor:pointer">🎛️</span>' +
            '<span id="mb-clock"></span>' +
            '</div>';
        document.body.appendChild(bar);
        document.getElementById('mb-drawer').onclick = function() {
            if (window._bcosToggleAppDrawer) window._bcosToggleAppDrawer();
        };
        document.getElementById('mb-cc').onclick = function() {
            if (window._bcos8ToggleCC) window._bcos8ToggleCC();
        };
        _updateClock();
        setInterval(_updateClock, 1000);
        console.log('[Menubar] ✅ 已渲染');
    };
    function _updateClock() {
        const el = document.getElementById('mb-clock');
        if (!el) return;
        const d = new Date();
        el.textContent = d.getMonth()+1 + '月' + d.getDate() + '日 ' +
            String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }
    console.log('[Menubar] v8.2 菜单栏模块已加载');
})();
