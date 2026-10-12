/* v8.2 apps/drawer.js - 应用抽屉 (健壮版 v2) */
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
        {id:'music',icon:'🎵',name:'音乐'},{id:'weather',icon:'☀️',name:'天气'},
        {id:'calculator',icon:'🔢',name:'计算器'},{id:'notes',icon:'🗒️',name:'备忘录'},
    ];
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
    // boot.js 调用
    window._bcosDrawerInit = function() {
        console.log('[Drawer] v8.2 初始化');
        _ensureDrawerElement();
    };
    // 确保抽屉 DOM 存在 (使用 v82 结构, 兼容旧元素)
    function _ensureDrawerElement() {
        let d = document.getElementById('bcos-app-drawer');
        if (!d) {
            d = document.createElement('div');
            d.id = 'bcos-app-drawer';
            d.innerHTML = '<div class="drawer-search"><input id="drawer-q" placeholder="搜索应用..." autocomplete="off"></div><div class="drawer-grid" id="drawer-grid"></div>';
            document.body.appendChild(d);
            const q = document.getElementById('drawer-q');
            if (q) q.addEventListener('input', function(e){ window._bcosRenderDrawerApps(e.target.value); });
            d.addEventListener('click', function(e){ if (e.target === d) window._bcosCloseAppDrawer(); });
        } else if (!document.getElementById('drawer-grid')) {
            // 旧系统已创建但结构不同, 重建内容
            d.innerHTML = '<div class="drawer-search"><input id="drawer-q" placeholder="搜索应用..." autocomplete="off"></div><div class="drawer-grid" id="drawer-grid"></div>';
            const q = document.getElementById('drawer-q');
            if (q) q.addEventListener('input', function(e){ window._bcosRenderDrawerApps(e.target.value); });
            d.addEventListener('click', function(e){ if (e.target === d) window._bcosCloseAppDrawer(); });
        }
        return d;
    }
    window._bcosToggleAppDrawer = function() {
        const d = _ensureDrawerElement();
        if (d.classList.contains('open')) {
            window._bcosCloseAppDrawer();
        } else {
            window._bcosOpenAppDrawer();
        }
    };
    window._bcosOpenAppDrawer = function() {
        const d = _ensureDrawerElement();
        d.classList.add('open');
        const q = document.getElementById('drawer-q');
        if (q) q.value = '';
        window._bcosRenderDrawerApps('');
        console.log('[Drawer] ✅ opened, apps:', window._bcosCollectDrawerApps().length);
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
    // 桌面双击打开 (修复: bg 在 z-index:-5 无法接收事件, 改为监听 body 双击且排除 UI 元素)
    let _lastTap = 0;
    document.addEventListener('dblclick', function(e){
        // 排除点击在窗口、侧边栏、菜单栏、抽屉上的情况
        if (e.target.closest('.bcos-win-v82, .sidebar, #bcos-menubar-v82, #bcos-app-drawer, .modal-overlay, .card, nav')) return;
        window._bcosOpenAppDrawer();
    });
    // 移动端双击桌面打开
    document.addEventListener('touchend', function(e){
        if (e.target.closest('.bcos-win-v82, .sidebar, #bcos-menubar-v82, #bcos-app-drawer, .modal-overlay, .card, nav')) return;
        const now = Date.now();
        if (now - _lastTap < 400) {
            window._bcosOpenAppDrawer();
            _lastTap = 0;
        } else {
            _lastTap = now;
        }
    }, {passive:true});
    // 监听应用变更事件 (实时更新)
    document.addEventListener('bcos:apps-changed', function() {
        const d = document.getElementById('bcos-app-drawer');
        if (d && d.classList.contains('open') && window._bcosRenderDrawerApps) {
            window._bcosRenderDrawerApps('');
            console.log('[Drawer] 实时刷新 (apps-changed)');
        }
    });
    console.log('[Drawer] v8.2 抽屉模块已加载 (健壮版 v2)');
})();
