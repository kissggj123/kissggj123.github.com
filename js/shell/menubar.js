/* Phase 2 - 菜单栏 (macOS 通顶) */
(function() {
    'use strict';
    BCOS.menubar = BCOS.menubar || {};
    BCOS.menubar.init = function() {
        if (document.getElementById('bcos-menubar')) return;
        const bar = document.createElement('div');
        bar.id = 'bcos-menubar';
        bar.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">🐰</span><span style="font-weight:700">Bunny Cockpit</span></div>'
            + '<div style="display:flex;align-items:center;gap:14px"><span id="mb-launchpad" style="cursor:pointer;font-size:15px" title="Launchpad">🚀</span><span id="mb-clock" style="font-variant-numeric:tabular-nums"></span></div>';
        document.body.appendChild(bar);
        document.getElementById('mb-launchpad').onclick = function() { BCOS.launchpad.toggle(); };
        function tick() {
            const el = document.getElementById('mb-clock');
            if (el) { const d = new Date(); el.textContent = (d.getMonth()+1) + '月' + d.getDate() + '日 ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); }
        }
        tick(); setInterval(tick, 1000);
        console.log('[Menubar] Phase 2 菜单栏已就绪');
    };
})();
