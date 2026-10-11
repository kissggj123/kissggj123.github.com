/* v8.2 app-terminal.js - 终端 (完整版) */
(function() {
    'use strict';
    const CMDS = {
        help: '可用命令:\n  help - 显示帮助\n  ver - 系统版本\n  clear - 清屏\n  date - 当前日期\n  echo <text> - 输出文本\n  ls [path] - 列出目录\n  cat <file> - 查看文件\n  wallpaper list - 列出壁纸\n  wallpaper set <file> - 设置壁纸\n  open <app> - 打开应用',
        ver: function() { return (window.BCOS_VERSION || 'v8.2.0') + ' · Aurora'; },
        date: function() { return new Date().toString(); },
    };
    window._bcosAppTerminal = {
        id: 'terminal', name: 'Terminal', icon: '💻',
        render: function() {
            return '<div class="app-terminal-v82" style="display:flex;flex-direction:column;height:100%;background:#0a0c1a;color:#d4d4d4;font-family:monospace;font-size:13px"><div class="term-out" id="term-out" style="flex:1;overflow-y:auto;padding:12px"></div><div class="term-in" style="display:flex;padding:8px 12px;border-top:1px solid rgba(255,255,255,.1)"><span style="color:#7c8cff;margin-right:8px">🐰 $</span><input id="term-input" autocomplete="off" spellcheck="false" style="flex:1;background:transparent;border:none;color:#fff;outline:none;font-family:monospace;font-size:13px"></div></div>';
        },
        onOpen: function(win) {
            const out = win.querySelector('#term-out');
            const input = win.querySelector('#term-input');
            _print(out, 'Bunny Cockpit OS v8.2 · 输入 help 查看命令');
            input.focus();
            input.addEventListener('keydown', function(e){
                if (e.key === 'Enter') {
                    const cmd = input.value.trim();
                    _print(out, '<span style="color:#7c8cff">🐰 $</span> ' + _esc(cmd));
                    _exec(out, cmd);
                    input.value = '';
                    out.scrollTop = out.scrollHeight;
                }
            });
            win.addEventListener('click', function(){ input.focus(); });
        }
    };
    function _esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
    function _print(out, html) { out.innerHTML += '<div>' + html + '</div>'; out.scrollTop = out.scrollHeight; }
    function _exec(out, cmd) {
        if (!cmd) return;
        const parts = cmd.split(/\s+/);
        const c = parts[0].toLowerCase();
        if (c === 'clear') { out.innerHTML = ''; return; }
        if (c === 'help') { _print(out, '<pre>' + CMDS.help + '</pre>'); return; }
        if (c === 'ver') { _print(out, CMDS.ver()); return; }
        if (c === 'date') { _print(out, CMDS.date()); return; }
        if (c === 'echo') { _print(out, _esc(parts.slice(1).join(' '))); return; }
        if (c === 'ls') {
            const path = parts[1] || '/';
            if (window._bcosVFS) {
                const list = window._bcosVFS.list(path);
                if (list) _print(out, list.map(function(i){return (i.type==='dir'?'📁 ':'📄 ')+i.name;}).join('<br>'));
                else _print(out, '<span style="color:#f66">目录不存在: '+_esc(path)+'</span>');
            } else _print(out, '<span style="color:#f66">VFS 未加载</span>');
            return;
        }
        if (c === 'cat') {
            if (!parts[1]) { _print(out, '用法: cat <文件>'); return; }
            if (window._bcosVFS) {
                const content = window._bcosVFS.read(parts[1]);
                if (content !== null) _print(out, '<pre>'+_esc(content)+'</pre>');
                else _print(out, '<span style="color:#f66">文件不存在</span>');
            }
            return;
        }
        if (c === 'wallpaper') {
            if (parts[1] === 'list') {
                const wps = window.BUILTIN_WALLPAPERS || [];
                _print(out, wps.map(function(w,i){return (i+1)+'. '+w.name;}).join('<br>') || '无壁纸');
            } else if (parts[1] === 'set' && parts[2]) {
                if (window._bcosSetWallpaper) { window._bcosSetWallpaper(parts[2]); _print(out, '壁纸已设置'); }
            } else _print(out, '用法: wallpaper list | wallpaper set <file>');
            return;
        }
        if (c === 'open') {
            if (parts[1] && window._bcosOpenApp) { window._bcosOpenApp(parts[1]); _print(out, '正在打开 '+parts[1]); }
            else _print(out, '用法: open <应用ID>');
            return;
        }
        _print(out, '<span style="color:#f66">未知命令: '+_esc(c)+' (输入 help)</span>');
    }
    if (!window._bcosV82Apps) window._bcosV82Apps = {};
    window._bcosV82Apps['terminal'] = window._bcosAppTerminal;
    console.log('[App] terminal 完整版已注册');
})();
