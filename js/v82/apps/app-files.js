/* v8.2 app-files.js - 文件管理器 (重写) */
(function() {
    'use strict';
    window._bcosAppFiles = {
        id: 'files', name: 'Files', icon: '📂',
        render: function() {
            return '<div class="app-files-v82"><div class="files-toolbar"><button onclick="_bcosFilesUp()">⬆️ 上级</button><span id="files-path">/</span></div><div class="files-list" id="files-list"></div></div>';
        },
        onOpen: function(win) { _renderFiles(win, '/'); }
    };
    function _renderFiles(win, path) {
        const list = win.querySelector('#files-list');
        const p = win.querySelector('#files-path');
        if (p) p.textContent = path;
        // 演示数据 (实际应接 VFS)
        const items = [
            {name:'Documents', type:'dir', icon:'📁'},
            {name:'Pictures', type:'dir', icon:'🖼️'},
            {name:'README.txt', type:'file', icon:'📄'},
        ];
        list.innerHTML = items.map(function(it){
            return '<div class="file-item" data-name="'+it.name+'"><span>'+it.icon+'</span><span>'+it.name+'</span></div>';
        }).join('');
    }
    window._bcosFilesUp = function() { console.log('[Files] 上级目录'); };
    if (!window._bcosV82Apps) window._bcosV82Apps = {};
    window._bcosV82Apps['files'] = window._bcosAppFiles;
    console.log('[App] files 已注册');
})();
