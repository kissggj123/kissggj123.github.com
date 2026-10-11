/* v8.1.0 drawer - built-in app registry */
(function() {
    'use strict';
    const BUILTIN_APPS = [
        { id: 'appstore', icon: '🛍️', name: 'App Store' },
        { id: 'terminal', icon: '🐰', name: 'Terminal' },
        { id: 'files', icon: '🌸', name: 'Files' },
        { id: 'monitor', icon: '💖', name: 'Monitor' },
        { id: 'browser', icon: '🌐', name: 'Browser' },
        { id: 'anniversary', icon: '💕', name: '纪念日' },
        { id: 'monopoly', icon: '🎲', name: '大富翁' },
        { id: 'settings', icon: '⚙️', name: '系统设置' },
        { id: 'logs', icon: '📜', name: '运行日志' },
        { id: 'carlock', icon: '🚗', name: '车机锁屏' },
        { id: 'texteditor', icon: '📝', name: 'Code Studio' },
        { id: 'about', icon: '🎀', name: 'About' },
        { id: 'me', icon: '📁', name: 'me' },
        { id: 'cydia', icon: '📦', name: 'BCOS 软件源' },
    ];
    window._bcosCollectDrawerApps = function() {
        const apps = [];
        const seen = new Set();
        try {
            const customs = JSON.parse(localStorage.getItem('bcos_custom_apps') || '[]');
            customs.forEach(function(a) {
                if (a && a.id && !seen.has(a.id)) {
                    seen.add(a.id);
                    apps.push({ id: a.id, icon: a.icon || '📦', name: a.name || a.id, custom: true });
                }
            });
        } catch(e) {}
        BUILTIN_APPS.forEach(function(a) {
            if (!seen.has(a.id)) {
                seen.add(a.id);
                apps.push(a);
            }
        });
        console.log('[Drawer810] collected ' + apps.length + ' apps');
        return apps;
    };
    window._bcosRenderDrawerApps = function(filter) {
        const apps = window._bcosCollectDrawerApps();
        const grid = document.getElementById('bcos-drawer-grid');
        if (!grid) return;
        const q = (filter || '').toLowerCase();
        const filtered = apps.filter(function(a) {
            return !q || a.name.toLowerCase().includes(q) || a.id.includes(q);
        });
        grid.innerHTML = filtered.map(function(a) {
            return '<div class="bcos-drawer-app" onclick="_bcosDrawerLaunch(\'' + a.id + '\')">' +
                '<div class="bcos-drawer-icon">' + a.icon + '</div>' +
                '<div class="bcos-drawer-label">' + a.name + '</div></div>';
        }).join('');
    };
    window._bcosDrawerFilter = function(q) { window._bcosRenderDrawerApps(q); };
    window._bcosDrawerLaunch = function(id) {
        if (id === 'carlock') {
            if (typeof showBcosCarLockscreen === 'function') showBcosCarLockscreen();
            return;
        }
        if (typeof _bcosOpenApp === 'function') _bcosOpenApp(id);
    };
    window._bcosOpenAppDrawer = function() {
        let d = document.getElementById('bcos-app-drawer');
        if (!d) {
            d = document.createElement('div');
            d.id = 'bcos-app-drawer';
            d.innerHTML = '<div class="bcos-drawer-search"><input placeholder="搜索应用…" oninput="_bcosDrawerFilter(this.value)"></div>' +
                '<div class="bcos-drawer-grid" id="bcos-drawer-grid"></div>';
            document.body.appendChild(d);
        }
        d.classList.add('open');
        window._bcosRenderDrawerApps('');
    };
    window._bcosCloseAppDrawer = function() {
        const d = document.getElementById('bcos-app-drawer');
        if (d) d.classList.remove('open');
    };
    window._bcosToggleAppDrawer = function() {
        const d = document.getElementById('bcos-app-drawer');
        if (d && d.classList.contains('open')) window._bcosCloseAppDrawer();
        else window._bcosOpenAppDrawer();
    };
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') window._bcosCloseAppDrawer();
    });
    console.log('[Drawer810] loaded');
})();
