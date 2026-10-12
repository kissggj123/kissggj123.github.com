/* 内置应用 - Finder (文件管理器) */
(function() {
    'use strict';
    BCOS.apps = BCOS.apps || {};
    BCOS.apps.finder = {
        id: 'finder', name: 'Finder',
        open: function() {
            const html = '<div style="display:flex;height:100%"><div style="width:160px;background:rgba(255,255,255,.04);padding:12px;border-right:1px solid rgba(255,255,255,.08)">'
                + '<div style="padding:8px;font-size:13px;opacity:.7">个人收藏</div>'
                + '<div class="fd-nav" data-p="/" style="padding:8px;border-radius:8px;cursor:pointer">📁 根目录</div>'
                + '<div class="fd-nav" data-p="/Documents" style="padding:8px;border-radius:8px;cursor:pointer">📄 文稿</div>'
                + '<div class="fd-nav" data-p="/Pictures" style="padding:8px;border-radius:8px;cursor:pointer">🖼️ 图片</div></div>'
                + '<div style="flex:1;padding:16px;overflow:auto" id="fd-main"></div></div>';
            const w = BCOS.window.open('finder', '📁 Finder', html);
            const render = function(path) {
                const main = w.querySelector('#fd-main');
                const items = BCOS.vfs.list(path) || [];
                main.innerHTML = '<div style="font-size:12px;opacity:.5;margin-bottom:12px">' + path + '</div>'
                    + (items.length ? items.map(function(it) {
                        return '<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;cursor:pointer" onmouseover="this.style.background=\'rgba(255,255,255,.06)\'" onmouseout="this.style.background=\'none\'" ondblclick="BCOS.apps.finder._open(\'' + it.path + '\')">'
                            + '<span style="font-size:24px">' + (it.type === 'dir' ? '📁' : '📄') + '</span><span>' + it.name + '</span></div>';
                    }).join('') : '<div style="opacity:.4;text-align:center;padding:40px">空文件夹</div>');
                w.querySelectorAll('.fd-nav').forEach(function(n) {
                    n.onclick = function() { render(n.dataset.p); };
                });
            };
            BCOS.apps.finder._open = function(path) {
                if (BCOS.vfs.list(path)) render(path);
                else { const c = BCOS.vfs.read(path); if (c !== null && BCOS.apps.textedit) BCOS.apps.textedit.openWith(path, c); }
            };
            render('/');
        }
    };
})();
