/* Phase 2 - 菜单栏 (macOS 通顶 + 状态栏) */
(function() {
    'use strict';
    BCOS.menubar = BCOS.menubar || {};
    BCOS.menubar.init = function() {
        if (document.getElementById('bcos-menubar')) return;
        const bar = document.createElement('div');
        bar.id = 'bcos-menubar';
        bar.innerHTML = '<div style="display:flex;align-items:center;gap:8px">'
            + '<span style="font-size:16px;filter:drop-shadow(0 2px 6px rgba(124,140,255,.4))">🐰</span>'
            + '<span style="font-weight:700">Bunny Cockpit</span></div>'
            + '<div style="display:flex;align-items:center;gap:14px">'
            + '<span id="mb-battery" style="font-size:12px;opacity:.9" title="电池">🔋</span>'
            + '<span id="mb-wifi" style="font-size:14px" title="网络">📶</span>'
            + '<span id="mb-launchpad" style="cursor:pointer;font-size:15px" title="Launchpad">🚀</span>'
            + '<span id="mb-clock" style="font-variant-numeric:tabular-nums;font-size:13px"></span></div>';
        document.body.appendChild(bar);
        document.getElementById('mb-launchpad').onclick = function() { BCOS.launchpad.toggle(); };
        // 电池状态
        try {
            if (navigator.getBattery) {
                navigator.getBattery().then(function(b) {
                    const update = function() {
                        const el = document.getElementById('mb-battery');
                        if (el) el.textContent = '🔋' + Math.round(b.level * 100) + '%';
                    };
                    update(); b.addEventListener('levelchange', update);
                });
            }
        } catch(e) {}
        // 时钟
        function tick() {
            const el = document.getElementById('mb-clock');
            if (el) {
                const d = new Date();
                const days = ['日','一','二','三','四','五','六'];
                el.textContent = (d.getMonth()+1) + '月' + d.getDate() + '日 周' + days[d.getDay()] + ' '
                    + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
            }
        }
        tick(); setInterval(tick, 1000);
        console.log('[Menubar] 菜单栏+状态栏已就绪');
    };
})();
