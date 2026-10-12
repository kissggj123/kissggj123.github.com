/* 内置应用 - 系统设置 (macOS Ventura 风格) */
(function() {
    'use strict';
    BCOS.apps = BCOS.apps || {};
    BCOS.apps.settings = {
        id: 'settings', name: '系统设置',
        open: function() {
            const html = '<div style="display:flex;height:100%">'
                + '<div style="width:180px;background:rgba(255,255,255,.04);padding:12px;border-right:1px solid rgba(255,255,255,.08)">'
                + '<div class="st-nav" data-p="wallpaper" style="padding:10px;border-radius:10px;cursor:pointer;background:rgba(124,140,255,.2)">🖼️ 壁纸</div>'
                + '<div class="st-nav" data-p="appearance" style="padding:10px;border-radius:10px;cursor:pointer">🎨 外观</div>'
                + '<div class="st-nav" data-p="about" style="padding:10px;border-radius:10px;cursor:pointer">ℹ️ 关于</div></div>'
                + '<div style="flex:1;padding:20px;overflow:auto" id="st-main"></div></div>';
            const w = BCOS.window.open('settings', '⚙️ 系统设置', html);
            const show = function(pane) {
                const main = w.querySelector('#st-main');
                w.querySelectorAll('.st-nav').forEach(function(n) { n.style.background = n.dataset.p === pane ? 'rgba(124,140,255,.2)' : 'none'; });
                if (pane === 'wallpaper') {
                    main.innerHTML = '<h3 style="margin-bottom:16px">桌面壁纸</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px" id="wp-grid"></div>';
                    // 占位：实际壁纸列表由 wallpaper 服务提供
                    main.querySelector('#wp-grid').innerHTML = '<div style="padding:20px;opacity:.5">壁纸服务 Phase 3 接入</div>';
                } else if (pane === 'appearance') {
                    main.innerHTML = '<h3 style="margin-bottom:16px">外观</h3><div style="opacity:.6">深色模式 (默认)<br>Liquid Glass 开启</div>';
                } else {
                    main.innerHTML = '<div style="text-align:center;padding:32px"><div style="font-size:48px">🐰</div><div style="font-size:20px;font-weight:700;margin:12px 0">Bunny Cockpit OS</div><div style="opacity:.5">' + BCOS.system.version() + '</div></div>';
                }
            };
            w.querySelectorAll('.st-nav').forEach(function(n) { n.onclick = function() { show(n.dataset.p); }; });
            show('wallpaper');
        }
    };
})();
