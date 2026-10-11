/* v8.1.0 应用安装接口 - 供应用商店/自定义上传调用 */
(function() {
    'use strict';
    // 安装应用 (写入 localStorage, 抽屉下次打开自动显示)
    window._bcosInstallApp = function(app) {
        if (!app || !app.id) { console.error('[Install] 缺少 id'); return false; }
        try {
            const key = 'bcos_custom_apps';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const idx = list.findIndex(function(a) { return a.id === app.id; });
            const entry = { id: app.id, icon: app.icon || '📦', name: app.name || app.id, url: app.url || '', custom: true };
            if (idx >= 0) list[idx] = entry;
            else list.push(entry);
            localStorage.setItem(key, JSON.stringify(list));
            console.log('[Install] ✅ 已安装:', app.id);
            // 如果抽屉开着，立即刷新
            const d = document.getElementById('bcos-app-drawer');
            if (d && d.classList.contains('open') && window._bcosRenderDrawerApps) {
                window._bcosRenderDrawerApps('');
            }
            return true;
        } catch(e) { console.error('[Install]', e); return false; }
    };
    // 卸载应用
    window._bcosUninstallApp = function(id) {
        try {
            const key = 'bcos_custom_apps';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = list.filter(function(a) { return a.id !== id; });
            localStorage.setItem(key, JSON.stringify(filtered));
            console.log('[Install] 已卸载:', id);
            const d = document.getElementById('bcos-app-drawer');
            if (d && d.classList.contains('open') && window._bcosRenderDrawerApps) {
                window._bcosRenderDrawerApps('');
            }
            return true;
        } catch(e) { return false; }
    };
    console.log('[Install810] 应用安装接口已加载');
})();
