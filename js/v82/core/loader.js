/* v8.2 core/loader.js - 动态模块加载器 (热更新) */
(function() {
    'use strict';
    const loaded = new Set();
    // 动态加载 JS 模块
    window._bcosLoadModule = function(name, url) {
        return new Promise(function(resolve, reject){
            if (loaded.has(name)) { resolve(false); return; } // 已加载
            const s = document.createElement('script');
            s.src = url + '?v=' + Date.now(); // 防缓存，用于热更新
            s.onload = function(){ loaded.add(name); console.log('[Loader] ✅', name); resolve(true); };
            s.onerror = function(){ console.error('[Loader] ❌', name); reject(new Error(name)); };
            document.head.appendChild(s);
        });
    };
    // 动态加载 CSS
    window._bcosLoadCSS = function(name, url) {
        return new Promise(function(resolve){
            if (loaded.has('css:'+name)) { resolve(false); return; }
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = url + '?v=' + Date.now();
            l.onload = function(){ loaded.add('css:'+name); resolve(true); };
            document.head.appendChild(l);
        });
    };
    // 热更新：重新加载模块
    window._bcosHotUpdate = function(name, url) {
        loaded.delete(name);
        return window._bcosLoadModule(name, url).then(function(){
            console.log('[Loader] 🔥 热更新完成:', name);
            // 触发更新事件
            document.dispatchEvent(new CustomEvent('bcos:module-updated', {detail:{name:name}}));
        });
    };
    // 从注册表批量加载
    window._bcosLoadFromRegistry = function(registryUrl) {
        return fetch(registryUrl).then(function(r){return r.json();}).then(function(reg){
            window._bcosV82Modules = reg.modules;
            const order = reg.loadOrder || Object.keys(reg.modules);
            const promises = order.map(function(k){
                const m = reg.modules[k];
                if (!m || m.loaded) return Promise.resolve();
                return window._bcosLoadModule(k, m.file).catch(function(){});
            });
            return Promise.all(promises);
        });
    };
    console.log('[Loader] v8.2 动态加载器已就绪');
})();
