/* v8.2 core/desktop.js - 桌面 (仅壁纸 + me文件夹) */
(function() {
    'use strict';
    window._bcosDesktopInit = function() {
        console.log('[Desktop] 初始化');
        // 壁纸由 theme.js 处理
        // 只保留 me 文件夹，应用图标由抽屉管理
        _renderMe();
    };
    function _renderMe() {
        if (document.getElementById('bcos-me-folder')) return;
        const me = document.createElement('div');
        me.id = 'bcos-me-folder';
        me.innerHTML = '<div style="font-size:48px">📁</div><div style="color:#fff;font-size:12px;margin-top:4px;text-shadow:0 1px 4px rgba(0,0,0,.6)">me</div>';
        me.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:10;display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:12px;';
        me.onclick = function() { if (window._bcosOpenApp) window._bcosOpenApp('me'); };
        document.body.appendChild(me);
        console.log('[Desktop] me 文件夹已渲染');
    }
    console.log('[Desktop] v8.2 桌面模块已加载');
})();
