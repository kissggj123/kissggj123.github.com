/* Phase 2 - 菜单栏 (按 7.8.6/8.0 旧版样式) */
(function() {
    'use strict';
    BCOS.menubar = BCOS.menubar || {};
    BCOS.menubar.init = function() {
        if (document.getElementById('bcos-menubar')) return;
        const bar = document.createElement('div');
        bar.id = 'bcos-menubar';
        // 左：logo + 菜单项；右：电池 + 时间（含星期+秒）
        bar.innerHTML = '<div style="display:flex;align-items:center;gap:18px">'
            + '<span id="mb-avatar" style="display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:13px;cursor:default">'
            + '<span id="mb-avatar-icon" style="font-size:15px">🐰</span>Bunny Cockpit OS</span>'
            + '<span class="mb-item" data-app="about" style="cursor:pointer;font-size:13px;opacity:.9">关于</span>'
            + '<span class="mb-item" data-app="store" style="cursor:pointer;font-size:13px;opacity:.9">应用商店</span>'
            + '<span class="mb-item" data-app="settings" style="cursor:pointer;font-size:13px;opacity:.9">设置</span>'
            + '<span class="mb-item" data-app="about" style="cursor:pointer;font-size:13px;opacity:.9">本机</span>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:12px;font-size:12px">'
            + '<span id="mb-fullscreen" style="cursor:pointer;opacity:.85;display:inline-flex" title="全屏"></span>'
            + '<span id="mb-launchpad" style="cursor:pointer;display:inline-flex" title="Launchpad"></span>'
            + '<span id="mb-battery" style="opacity:.9">🔋--%</span>'
            + '<span id="mb-clock" style="font-variant-numeric:tabular-nums;opacity:.9"></span>'
            + '</div>';
        document.body.appendChild(bar);
        // 菜单项点击
        bar.querySelectorAll('.mb-item').forEach(function(el) {
            el.style.padding = '4px 6px';
            el.style.borderRadius = '6px';
            el.onmouseover = function() { el.style.background = 'rgba(255,255,255,.12)'; };
            el.onmouseout = function() { el.style.background = 'none'; };
            el.onclick = function() {
                const app = el.dataset.app;
                if (app === 'settings' && BCOS.apps && BCOS.apps.settings) BCOS.apps.settings.open();
                else if (app === 'about' && BCOS.apps && BCOS.apps.settings) BCOS.apps.settings.open();
                // store 待 Phase 4
            };
        });
        document.getElementById('mb-launchpad').onclick = function() { BCOS.launchpad.toggle(); };
        document.getElementById('mb-fullscreen').onclick = function() {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen().catch(function(){});
        };
        // 电池
        try {
            if (navigator.getBattery) {
                navigator.getBattery().then(function(b) {
                    const upd = function() {
                        const el = document.getElementById('mb-battery');
                        if (el) el.textContent = '🔋' + Math.round(b.level * 100) + '%';
                    };
                    upd(); b.addEventListener('levelchange', upd);
                });
            }
        } catch(e) {}
        // 时钟：周日 10月11日 20:21:17
        function tick() {
            const el = document.getElementById('mb-clock');
            if (!el) return;
            const d = new Date();
            const days = ['周日','周一','周二','周三','周四','周五','周六'];
            el.textContent = days[d.getDay()] + ' ' + (d.getMonth()+1) + '月' + d.getDate() + '日 '
                + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
        }
        tick(); setInterval(tick, 1000);
        BCOS.menubar.updateAvatar();
        // 填充 SF 图标
        try {
            if (window.BCOS_ICONS) {
                document.getElementById('mb-fullscreen').innerHTML = BCOS_ICONS.fullscreen;
                document.getElementById('mb-launchpad').innerHTML = BCOS_ICONS.rocket;
            }
        } catch(e) {}
        console.log('[Menubar] 旧版样式菜单栏已就绪');
    };
    BCOS.menubar.updateAvatar = function() {
        const el = document.getElementById('mb-avatar-icon');
        if (!el) return;
        let av = '🐰';
        try { av = localStorage.getItem('bcosAvatar') || '🐰'; } catch(e) {}
        if (av.startsWith('data:')) {
            el.innerHTML = '<img src="' + av + '" style="width:18px;height:18px;border-radius:50%;object-fit:cover">';
        } else {
            el.textContent = av;
        }
    };
})();
