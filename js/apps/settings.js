/* 内置应用 - 系统设置 (完整功能) */
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
            const show = async function(pane) {
                const main = w.querySelector('#st-main');
                w.querySelectorAll('.st-nav').forEach(function(n) { n.style.background = n.dataset.p === pane ? 'rgba(124,140,255,.2)' : 'none'; });
                if (pane === 'wallpaper') {
                    main.innerHTML = '<h3 style="margin-bottom:16px;font-size:16px">桌面壁纸</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px" id="wp-grid"><div style="opacity:.5">加载中...</div></div>';
                    const list = await BCOS.wallpaper.list();
                    const grid = main.querySelector('#wp-grid');
                    const curId = (() => { try { return localStorage.getItem('bcosWallpaperId'); } catch(e) { return null; } })();
                    grid.innerHTML = list.map(function(wp) {
                        const sel = wp.id === curId ? 'outline:2px solid #7c8cff;outline-offset:2px;' : '';
                        const thumb = './' + (wp.file || '');
                        return '<div class="wp-item" data-id="' + wp.id + '" style="cursor:pointer;border-radius:12px;overflow:hidden;position:relative;' + sel + '">'
                            + '<div style="aspect-ratio:16/10;background:url(' + thumb + ') center/cover,#1a2a4a"></div>'
                            + '<div style="padding:8px;font-size:11px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (wp.name || wp.id) + '</div>'
                            + '<button class="wp-full" data-id="' + wp.id + '" style="position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:8px;border:none;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;font-size:14px" title="全屏预览">⛶</button></div>';
                    }).join('') || '<div style="opacity:.5">无壁纸</div>';
                    grid.querySelectorAll('.wp-item').forEach(function(el) {
                        el.onclick = function(e) {
                            if (e.target.classList.contains('wp-full')) return;
                            BCOS.wallpaper.set(el.dataset.id);
                            show('wallpaper');
                        };
                    });
                    grid.querySelectorAll('.wp-full').forEach(function(btn) {
                        btn.onclick = function(e) {
                            e.stopPropagation();
                            BCOS.wallpaper.previewFullscreen(btn.dataset.id);
                        };
                    });
                } else if (pane === 'appearance') {
                    main.innerHTML = '<h3 style="margin-bottom:16px;font-size:16px">外观</h3>'
                        + '<div style="display:flex;gap:12px">'
                        + '<div style="flex:1;padding:20px;border-radius:14px;background:rgba(255,255,255,.06);text-align:center;cursor:pointer;border:2px solid #7c8cff"><div style="font-size:32px">🌙</div><div style="margin-top:8px;font-size:13px">深色</div></div>'
                        + '<div style="flex:1;padding:20px;border-radius:14px;background:rgba(255,255,255,.03);text-align:center;opacity:.4"><div style="font-size:32px">☀️</div><div style="margin-top:8px;font-size:13px">浅色 (待开发)</div></div>'
                        + '</div><div style="margin-top:16px;font-size:12px;opacity:.5">Liquid Glass 毛玻璃效果已开启 · GPU 加速</div>';
                } else {
                    main.innerHTML = '<div style="text-align:center;padding:32px"><div style="font-size:56px">🐰</div><div style="font-size:20px;font-weight:700;margin:12px 0">Bunny Cockpit OS</div><div style="opacity:.5;font-size:13px">' + BCOS.system.version() + '</div><div style="margin-top:16px;font-size:12px;opacity:.4">Phase 2+3 · Aurora</div></div>';
                }
            };
            w.querySelectorAll('.st-nav').forEach(function(n) { n.onclick = function() { show(n.dataset.p); }; });
            show('wallpaper');
        }
    };
})();
