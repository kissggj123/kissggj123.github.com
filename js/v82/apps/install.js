/* v8.2 apps/install.js - 应用安装接口 */
(function() {
    'use strict';
    window._bcosInstallApp = function(app) {
        if (!app || !app.id) return false;
        try {
            const list = JSON.parse(localStorage.getItem('bcos_custom_apps')||'[]');
            const i = list.findIndex(function(a){ return a.id === app.id; });
            const e = {id:app.id, icon:app.icon||'📦', name:app.name||app.id, url:app.url||''};
            if (i>=0) list[i]=e; else list.push(e);
            localStorage.setItem('bcos_custom_apps', JSON.stringify(list));
            const d = document.getElementById('bcos-app-drawer');
            if (d && d.classList.contains('open') && window._bcosRenderDrawerApps) window._bcosRenderDrawerApps('');
            console.log('[Install] ✅', app.id);
            return true;
        } catch(e) { return false; }
    };
    window._bcosUninstallApp = function(id) {
        try {
            const list = JSON.parse(localStorage.getItem('bcos_custom_apps')||'[]').filter(function(a){return a.id!==id;});
            localStorage.setItem('bcos_custom_apps', JSON.stringify(list));
            return true;
        } catch(e) { return false; }
    };
    console.log('[Install] v8.2 安装接口已加载');
})();
