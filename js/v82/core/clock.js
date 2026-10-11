/* v8.2 core/clock.js - 桌面时钟小组件 */
(function() {
    'use strict';
    window._bcosClockInit = function() {
        if (document.getElementById('bcos-desk-clock')) return;
        const c = document.createElement('div');
        c.id = 'bcos-desk-clock';
        c.style.cssText = 'position:fixed;top:50px;right:20px;z-index:5;color:#fff;text-align:right;pointer-events:none;text-shadow:0 2px 12px rgba(0,0,0,.5);';
        c.innerHTML = '<div id="bcos-clock-time" style="font-size:42px;font-weight:200;letter-spacing:2px"></div><div id="bcos-clock-date" style="font-size:13px;opacity:.8"></div>';
        document.body.appendChild(c);
        _tick();
        setInterval(_tick, 1000);
    };
    function _tick() {
        const d = new Date();
        const t = document.getElementById('bcos-clock-time');
        const dt = document.getElementById('bcos-clock-date');
        if (t) t.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
        if (dt) {
            const w = ['日','一','二','三','四','五','六'][d.getDay()];
            dt.textContent = (d.getMonth()+1) + '月' + d.getDate() + '日 星期' + w;
        }
    }
    // boot.js 会调用，兼容
    if (window._bcosBootTime) window._bcosClockInit();
    console.log('[Clock] v8.2 时钟模块已加载');
})();
