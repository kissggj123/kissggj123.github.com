/* v8.2 app-settings.js - 系统设置 (重写) */
(function() {
    'use strict';
    window._bcosAppSettings = {
        id: 'settings',
        name: '系统设置',
        icon: '⚙️',
        render: function() {
            return '<div class="app-settings-v82">' +
                '<div class="set-sidebar">' +
                '<div class="set-item active" data-pane="wallpaper">🖼️ 壁纸</div>' +
                '<div class="set-item" data-pane="theme">🎨 主题</div>' +
                '<div class="set-item" data-pane="about">ℹ️ 关于</div>' +
                '</div>' +
                '<div class="set-main" id="set-main"></div>' +
                '</div>';
        },
        onOpen: function(win) {
            const main = win.querySelector('#set-main');
            // 默认显示壁纸
            _showWallpaper(main);
            win.querySelectorAll('.set-item').forEach(function(item){
                item.onclick = function() {
                    win.querySelectorAll('.set-item').forEach(function(i){i.classList.remove('active');});
                    item.classList.add('active');
                    const pane = item.getAttribute('data-pane');
                    if (pane === 'wallpaper') _showWallpaper(main);
                    else if (pane === 'theme') _showTheme(main);
                    else if (pane === 'about') _showAbout(main);
                };
            });
        }
    };
    function _showWallpaper(main) {
        main.innerHTML = '<h3>桌面壁纸</h3><div id="wp-container"></div>';
        if (window._bcosWpPickerOpen) window._bcosWpPickerOpen('wp-container');
    }
    function _showTheme(main) {
        main.innerHTML = '<h3>主题</h3><p style="opacity:.6">Aurora 深色主题（默认）</p>';
    }
    function _showAbout(main) {
        const v = window.BCOS_VERSION || 'v8.2.0';
        main.innerHTML = '<h3>关于</h3><div style="text-align:center;padding:20px"><div style="font-size:48px">🐰</div><div style="font-size:20px;font-weight:700;margin:8px 0">Bunny Cockpit OS</div><div style="opacity:.6">' + v + ' · Aurora</div></div>';
    }
    // 注册到应用中心
    if (!window._bcosV82Apps) window._bcosV82Apps = {};
    window._bcosV82Apps['settings'] = window._bcosAppSettings;
    console.log('[App] settings 已注册');
})();
