/* v8.2 core/vfs.js - 虚拟文件系统 (全新) */
(function() {
    'use strict';
    const FS_KEY = 'bcos_vfs_v82';
    let fs = null;
    function _load() {
        if (fs) return fs;
        try {
            fs = JSON.parse(localStorage.getItem(FS_KEY) || 'null');
        } catch(e) { fs = null; }
        if (!fs) {
            fs = {
                '/': {type:'dir', children:['Documents','Pictures','Desktop']},
                '/Documents': {type:'dir', children:['README.txt']},
                '/Documents/README.txt': {type:'file', content:'欢迎使用 Bunny Cockpit OS v8.2\n\n这是全新重写的系统，致敬 iOS 26。'},
                '/Pictures': {type:'dir', children:[]},
                '/Desktop': {type:'dir', children:[]},
            };
            _save();
        }
        return fs;
    }
    function _save() {
        try { localStorage.setItem(FS_KEY, JSON.stringify(fs)); } catch(e) {}
    }
    function _norm(path) {
        if (!path.startsWith('/')) path = '/' + path;
        return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }
    window._bcosVFS = {
        list: function(path) {
            path = _norm(path);
            const node = _load()[path];
            if (!node || node.type !== 'dir') return null;
            return node.children.map(function(name){
                const p = path === '/' ? '/' + name : path + '/' + name;
                const n = _load()[p];
                return {name:name, path:p, type:n?n.type:'unknown'};
            });
        },
        read: function(path) {
            path = _norm(path);
            const node = _load()[path];
            return (node && node.type === 'file') ? node.content : null;
        },
        write: function(path, content) {
            path = _norm(path);
            const parent = path.substring(0, path.lastIndexOf('/')) || '/';
            const name = path.substring(path.lastIndexOf('/')+1);
            const f = _load();
            if (!f[parent] || f[parent].type !== 'dir') return false;
            f[path] = {type:'file', content:content};
            if (!f[parent].children.includes(name)) f[parent].children.push(name);
            _save();
            return true;
        },
        mkdir: function(path) {
            path = _norm(path);
            const parent = path.substring(0, path.lastIndexOf('/')) || '/';
            const name = path.substring(path.lastIndexOf('/')+1);
            const f = _load();
            if (!f[parent] || f[parent].type !== 'dir' || f[path]) return false;
            f[path] = {type:'dir', children:[]};
            f[parent].children.push(name);
            _save();
            return true;
        },
        rm: function(path) {
            path = _norm(path);
            const f = _load();
            if (!f[path] || path === '/') return false;
            const parent = path.substring(0, path.lastIndexOf('/')) || '/';
            const name = path.substring(path.lastIndexOf('/')+1);
            delete f[path];
            const idx = f[parent].children.indexOf(name);
            if (idx >= 0) f[parent].children.splice(idx, 1);
            _save();
            return true;
        },
        exists: function(path) {
            return !!_load()[_norm(path)];
        }
    };
    console.log('[VFS] v8.2 虚拟文件系统已加载');
})();
