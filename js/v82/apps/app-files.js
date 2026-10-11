/* v8.2 app-files.js - 文件管理器 (VFS完整版) */
(function() {
    'use strict';
    let curPath = '/';
    window._bcosAppFiles = {
        id: 'files', name: 'Files', icon: '📂',
        render: function() {
            return '<div style="display:flex;flex-direction:column;height:100%;color:#fff"><div style="display:flex;gap:8px;padding:10px;border-bottom:1px solid rgba(255,255,255,.1);align-items:center"><button onclick="_bcosFilesUp()" style="padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;cursor:pointer">⬆️</button><span id="files-path" style="font-family:monospace;font-size:13px">/</span><span style="flex:1"></span><button onclick="_bcosFilesNew()" style="padding:6px 12px;border-radius:6px;border:none;background:#7c8cff;color:#fff;cursor:pointer">+ 新建</button></div><div id="files-list" style="flex:1;overflow-y:auto;padding:8px"></div></div>';
        },
        onOpen: function(win) { curPath = '/'; _render(win); }
    };
    function _render(win) {
        win = win || document;
        const list = (win.querySelector || win.getElementById.bind(win))('#files-list');
        // 简化：用 document
        const listEl = document.getElementById('files-list');
        const pathEl = document.getElementById('files-path');
        if (!listEl) return;
        if (pathEl) pathEl.textContent = curPath;
        if (!window._bcosVFS) { listEl.innerHTML = '<div style="opacity:.6;padding:16px">VFS 未加载</div>'; return; }
        const items = window._bcosVFS.list(curPath) || [];
        if (!items.length) { listEl.innerHTML = '<div style="opacity:.6;padding:16px;text-align:center">空文件夹</div>'; return; }
        listEl.innerHTML = items.map(function(it){
            const icon = it.type === 'dir' ? '📁' : '📄';
            return '<div class="file-item" data-path="'+it.path+'" data-type="'+it.type+'" style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer" onmouseover="this.style.background=\'rgba(255,255,255,.06)\'" onmouseout="this.style.background=\'none\'" ondblclick="_bcosFilesOpen(\''+it.path+'\')"><span style="font-size:20px">'+icon+'</span><span>'+it.name+'</span></div>';
        }).join('');
    }
    window._bcosFilesUp = function() {
        if (curPath === '/') return;
        curPath = curPath.substring(0, curPath.lastIndexOf('/')) || '/';
        _render();
    };
    window._bcosFilesOpen = function(path) {
        if (!window._bcosVFS) return;
        // 如果是目录，进入
        const items = window._bcosVFS.list(path);
        if (items) { curPath = path; _render(); return; }
        // 如果是文件，查看内容
        const content = window._bcosVFS.read(path);
        if (content !== null) alert('文件内容:\n\n' + content.substring(0, 500));
    };
    window._bcosFilesNew = function() {
        const name = prompt('文件名:');
        if (!name) return;
        const path = (curPath === '/' ? '' : curPath) + '/' + name;
        if (window._bcosVFS && window._bcosVFS.write(path, '')) _render();
    };
    window._bcosFilesRefresh = _render;
    if (!window._bcosV82Apps) window._bcosV82Apps = {};
    window._bcosV82Apps['files'] = window._bcosAppFiles;
    console.log('[App] files VFS版已注册');
})();
