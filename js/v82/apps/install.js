/* v8.2 apps/install.js - 应用安装接口 (实时更新版) */
(function() {
    'use strict';
    const KEY = 'bcos_custom_apps';
    // 通知所有监听者应用列表已变更
    function _notifyChange() {
        document.dispatchEvent(new CustomEvent('bcos:apps-changed'));
        // 兼容: 如果抽屉开着也直接刷新
        const d = document.getElementById('bcos-app-drawer');
        if (d && d.classList.contains('open') && window._bcosRenderDrawerApps) {
            window._bcosRenderDrawerApps('');
        }
        // 兼容: 刷新 App Store 列表
        if (window._bcosStoreRefresh) window._bcosStoreRefresh();
    }
    window._bcosInstallApp = function(app) {
        if (!app || !app.id) { console.error('[Install] 缺少 id'); return false; }
        try {
            const list = JSON.parse(localStorage.getItem(KEY)||'[]');
            const i = list.findIndex(function(a){ return a.id === app.id; });
            const e = {id:app.id, icon:app.icon||'📦', name:app.name||app.id, url:app.url||'', custom:true};
            if (i>=0) list[i]=e; else list.push(e);
            localStorage.setItem(KEY, JSON.stringify(list));
            console.log('[Install] ✅ 已安装:', app.id);
            _notifyChange();
            return true;
        } catch(e) { console.error('[Install]', e); return false; }
    };
    window._bcosUninstallApp = function(id) {
        try {
            const list = JSON.parse(localStorage.getItem(KEY)||'[]').filter(function(a){return a.id!==id;});
            localStorage.setItem(KEY, JSON.stringify(list));
            console.log('[Install] 已卸载:', id);
            _notifyChange();
            return true;
        } catch(e) { return false; }
    };
    // 监听其他标签页的 storage 事件 (跨页实时同步)
    window.addEventListener('storage', function(e) {
        if (e.key === KEY) {
            _notifyChange();
            console.log('[Install] 检测到跨页应用变更');
        }
    });
    console.log('[Install] v8.2 安装接口已加载 (实时更新版)');
})();
