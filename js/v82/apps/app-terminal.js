/* v8.2 app-terminal.js - 终端 (重写) */
(function() {
    'use strict';
    window._bcosAppTerminal = {
        id: 'terminal', name: 'Terminal', icon: '💻',
        render: function() {
            return '<div class="app-terminal-v82"><div class="term-out" id="term-out"></div><div class="term-in"><span>🐰 $</span><input id="term-input" autocomplete="off" spellcheck="false"></div></div>';
        },
        onOpen: function(win) {
            const out = win.querySelector('#term-out');
            const input = win.querySelector('#term-input');
            _print(out, 'Bunny Cockpit OS v8.2 · 输入 help 查看命令');
            input.focus();
            input.addEventListener('keydown', function(e){
                if (e.key === 'Enter') {
                    const cmd = input.value.trim();
                    _print(out, '🐰 $ ' + cmd);
                    _exec(out, cmd);
                    input.value = '';
                }
            });
            win.addEventListener('click', function(){ input.focus(); });
        }
    };
    function _print(out, html) {
        out.innerHTML += '<div>' + html + '</div>';
        out.scrollTop = out.scrollHeight;
    }
    function _exec(out, cmd) {
        const parts = cmd.split(' ');
        const c = parts[0].toLowerCase();
        if (c === 'help') _print(out, '可用命令: help, ver, clear, date, wallpaper [list]');
        else if (c === 'ver') _print(out, window.BCOS_VERSION || 'v8.2.0');
        else if (c === 'clear') out.innerHTML = '';
        else if (c === 'date') _print(out, new Date().toString());
        else if (c === 'wallpaper' && parts[1] === 'list') {
            const wps = window.BUILTIN_WALLPAPERS || [];
            _print(out, '壁纸 (' + wps.length + '): ' + wps.map(function(w){return w.name;}).join(', '));
        }
        else if (c === '') {}
        else _print(out, '<span style="color:#f66">未知命令: ' + c + '</span>');
    }
    if (!window._bcosV82Apps) window._bcosV82Apps = {};
    window._bcosV82Apps['terminal'] = window._bcosAppTerminal;
    console.log('[App] terminal 已注册');
})();
