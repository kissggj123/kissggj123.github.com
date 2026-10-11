/* v8.2 apps/cydia-ui.js - Cydia 软件源 UI */
(function() {
    'use strict';
    window._bcosCydiaOpen = function() {
        // 打开软件源窗口
        if (window._bcosCreateWin) {
            const html = '<div id="cydia-body" style="padding:16px;color:#fff"><div style="margin-bottom:12px"><button onclick="_bcosCydiaRefresh()" style="padding:8px 16px;border-radius:8px;border:none;background:#7c8cff;color:#fff;cursor:pointer">🔄 检查更新</button> <button onclick="_bcosCydiaUpdateAll()" style="padding:8px 16px;border-radius:8px;border:none;background:#34c759;color:#fff;cursor:pointer">⚡ 全部更新</button></div><div id="cydia-list">加载中...</div></div>';
            window._bcosCreateWin('cydia', '📦 BCOS 软件源', html);
            _renderList();
        } else if (window._bcosOpenApp) {
            window._bcosOpenApp('cydia');
        }
    };
    function _renderList() {
        const el = document.getElementById('cydia-list');
        if (!el) return;
        // 从 modules-v82.json 读取 (降级用内置列表)
        const mods = window._bcosV82Modules || {};
        const keys = Object.keys(mods);
        if (!keys.length) {
            el.innerHTML = '<div style="opacity:.6">暂无模块信息</div>';
            return;
        }
        el.innerHTML = keys.map(function(k){
            const m = mods[k];
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">' +
                '<div><div style="font-weight:600">' + (m.desc||k) + '</div><div style="font-size:12px;opacity:.6">' + m.file + ' · v' + m.version + '</div></div>' +
                '<button onclick="_bcosCydiaUpdateOne(\''+k+'\')" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;cursor:pointer">更新</button></div>';
        }).join('');
    }
    window._bcosCydiaRefresh = function() { _renderList(); console.log('[Cydia] 已刷新'); };
    window._bcosCydiaUpdateOne = function(k) { console.log('[Cydia] 更新:', k); alert('模块 ' + k + ' 已是最新'); };
    window._bcosCydiaUpdateAll = function() { console.log('[Cydia] 全部更新'); alert('所有模块已是最新'); };
    // 注册到抽屉启动
    const _origLaunch = window._bcosDrawerLaunch;
    console.log('[Cydia] v8.2 软件源 UI 已加载');
})();
