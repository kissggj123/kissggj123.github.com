/* 内置应用 - 文本编辑 */
(function() {
    'use strict';
    BCOS.apps = BCOS.apps || {};
    BCOS.apps.textedit = {
        id: 'textedit', name: '文本编辑',
        open: function() { this.openWith('/Documents/未命名.txt', ''); },
        openWith: function(path, content) {
            const html = '<div style="display:flex;flex-direction:column;height:100%">'
                + '<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;gap:8px;align-items:center"><span style="font-size:12px;opacity:.6">' + path + '</span><span style="flex:1"></span><button id="te-save" style="padding:6px 16px;border-radius:8px;border:none;background:#7c8cff;color:#fff;cursor:pointer">保存</button></div>'
                + '<textarea id="te-text" style="flex:1;padding:16px;background:transparent;color:#fff;font-family:monospace;font-size:14px;border:none;resize:none;outline:none">' + String(content).replace(/</g,'&lt;') + '</textarea></div>';
            const w = BCOS.window.open('textedit', '📝 文本编辑', html);
            w.querySelector('#te-save').onclick = function() {
                const t = w.querySelector('#te-text').value;
                if (BCOS.vfs.write(path, t)) alert('已保存');
            };
        }
    };
})();
