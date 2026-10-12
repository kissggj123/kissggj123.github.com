/* Phase 2 - 菜单栏 (macOS 通顶 + 状态栏) */
(function() {
    'use strict';
    BCOS.menubar = BCOS.menubar || {};
    BCOS.menubar.init = function() {
        if (document.getElementById('bcos-menubar')) return;
        const bar = document.createElement('div');
        bar.id = 'bcos-menubar';
        bar.innerHTML = '<div style="display:flex;align-items:center;gap:8px">'
            + '<span id="mb-avatar" style="font-size:16px;filter:drop-shadow(0 2px 6px rgba(124,140,255,.4));display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;overflow:hidden;border-radius:50%">🐰</span>'
            + '<span style="font-weight:700">Bunny Cockpit</span></div>'
            + '<div style="display:flex;align-items:center;gap:14px">'
            + '<span id="mb-battery" style="font-size:12px;opacity:.9" title="电池">🔋</span>'
            + '<span id="mb-wifi" style="font-size:14px" title="网络">📶</span>'
            + '<span id="mb-fullscreen" style="cursor:pointer;font-size:14px" title="全屏">⛶</span>'
            + '<span id="mb-launchpad" style="cursor:pointer;font-size:15px" title="Launchpad">🚀</span>'
            + '<span id="mb-clock" style="font-variant-numeric:tabular-nums;font-size:13px"></span></div>';
        document.body.appendChild(bar);
        document.getElementById('mb-launchpad').onclick = function() { BCOS.launchpad.toggle(); };
        document.getElementById('mb-fullscreen').onclick = function() {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen().catch(function(e) {
                    console.log('[Menubar] 全屏失败', e);
                });
            }
        };
        // 全屏状态变化时更新图标
        document.addEventListener('fullscreenchange', function() {
            const el = document.getElementById('mb-fullscreen');
            if (el) el.textContent = document.fullscreenElement ? '⛶' : '⛶';
            if (el) el.style.opacity = document.fullscreenElement ? '1' : '.7';
        });
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
        BCOS.menubar.updateAvatar();
        };
    BCOS.menubar.updateAvatar = function() {
        const el = document.getElementById('mb-avatar');
        if (!el) return;
        let av = '🐰';
        try { av = localStorage.getItem('bcosAvatar') || '🐰'; } catch(e) {}
        if (av.startsWith('data:')) {
            el.innerHTML = '<img src="' + av + '" style="width:100%;height:100%;object-fit:cover">';
        } else {
            el.textContent = av;
        }
    };
})();
