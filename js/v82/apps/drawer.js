/* v8.2 apps/drawer.js - 应用抽屉 (健壮版) */
(function() {
    'use strict';
    const BUILTIN = [
        {id:'appstore',icon:'🛍️',name:'App Store'},{id:'terminal',icon:'💻',name:'Terminal'},
        {id:'files',icon:'📂',name:'Files'},{id:'monitor',icon:'📊',name:'Monitor'},
        {id:'browser',icon:'🌐',name:'Browser'},{id:'anniversary',icon:'💕',name:'纪念日'},
        {id:'monopoly',icon:'🎲',name:'大富翁'},{id:'settings',icon:'⚙️',name:'系统设置'},
        {id:'logs',icon:'📜',name:'运行日志'},{id:'carlock',icon:'🚗',name:'车机锁屏'},
        {id:'texteditor',icon:'📝',name:'Code Studio'},{id:'about',icon:'🎀',name:'About'},
        {id:'me',icon:'📁',name:'me'},{id:'cydia',icon:'📦',name:'BCOS 软件源'},
        {id:'yumiko',icon:'🔧',name:'上帝工具箱'},
    ];
    // 确保全局可用
    window._bcosDrawerApps = BUILTIN;
    window._bcosCollectDrawerApps = function() {
        const apps = [], seen = new Set();
        try {
            const customs = JSON.parse(localStorage.getItem('bcos_custom_apps')||'[]');
            for (let i=0; i<customs.length; i++) {
                const a = customs[i];
                if (a && a.id && !seen.has(a.id)) { seen.add(a.id); apps.push(a); }
            }
        } catch(e) {}
        for (let i=0; i<BUILTIN.length; i++) {
            const a = BUILTIN[i];
            if (!seen.has(a.id)) { seen.add(a.id); apps.push(a); }
        }
        return apps;
    };
    window._bcosToggleAppDrawer = function() {
        console.log('[Drawer] toggle');
        const d = document.getElementById('bcos-app-drawer');
        if (d && d.classList.contains('open')) {
            d.classList.remove('open');
            console.log('[Drawer] closed');
        } else {
            window._bcosOpenAppDrawer();
        }
    };
    window._bcosOpenAppDrawer = function() {
        console.log('[Drawer] open');
        let d = document.getElementById('bcos-app-drawer');
        if (!d) {
            d = document.createElement('div');
            d.id = 'bcos-app-drawer';
            d.innerHTML = '<div class="drawer-search"><input id="drawer-q" placeholder="搜索应用..." autocomplete="off"></div><div class="drawer-grid" id="drawer-grid"></div>';
            document.body.appendChild(d);
            const q = document.getElementById('drawer-q');
            if (q) q.addEventListener('input', function(e){ window._bcosRenderDrawerApps(e.target.value); });
            d.addEventListener('click', function(e){ if (e.target === d) window._bcosCloseAppDrawer(); });
        }
        d.classList.add('open');
        const q = document.getElementById('drawer-q');
        if (q) q.value = '';
        window._bcosRenderDrawerApps('');
        console.log('[Drawer] ✅ opened');
    };
    window._bcosCloseAppDrawer = function() {
        const d = document.getElementById('bcos-app-drawer');
        if (d) d.classList.remove('open');
    };
    window._bcosRenderDrawerApps = function(filter) {
        const grid = document.getElementById('drawer-grid');
        if (!grid) { console.warn('[Drawer] grid not found'); return; }
        const q = (filter||'').toLowerCase();
        const apps = window._bcosCollectDrawerApps().filter(function(a){
            return !q || (a.name && a.name.toLowerCase().includes(q)) || (a.id && a.id.includes(q));
        });
        let html = '';
        for (let i=0; i<apps.length; i++) {
            const a = apps[i];
            html += '<div class="drawer-app" data-id="' + a.id + '"><div class="drawer-icon">' + a.icon + '</div><div class="drawer-label">' + a.name + '</div></div>';
        }
        grid.innerHTML = html;
        const els = grid.querySelectorAll('.drawer-app');
        for (let i=0; i<els.length; i++) {
            (function(el){
                el.addEventListener('click', function(){
                    window._bcosDrawerLaunch(el.getAttribute('data-id'));
                });
            })(els[i]);
        }
        console.log('[Drawer] rendered ' + apps.length + ' apps');
    };
    window._bcosDrawerLaunch = function(id) {
        console.log('[Drawer] launch:', id);
        window._bcosCloseAppDrawer();
        if (id === 'carlock' && window.showBcosCarLockscreen) { window.showBcosCarLockscreen(); return; }
        if (window._bcosOpenApp) { window._bcosOpenApp(id); return; }
        console.warn('[Drawer] _bcosOpenApp not available for:', id);
    };
    // ESC 关闭
    document.addEventListener('keydown', function(e){
        if (e.key === 'Escape') window._bcosCloseAppDrawer();
    });
    // 双击桌面打开
    document.addEventListener('dblclick', function(e){
        if (e.target.id === 'bcos-desktop-bg') window._bcosOpenAppDrawer();
    });
    console.log('[Drawer] v8.2 抽屉模块已加载 (健壮版)');
})();
