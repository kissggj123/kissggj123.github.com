/* 内置应用 - 终端 */
(function() {
    'use strict';
    BCOS.apps = BCOS.apps || {};
    BCOS.apps.terminal = {
        id: 'terminal', name: '终端',
        open: function() {
            const html = '<div style="display:flex;flex-direction:column;height:100%;background:#0a0c1a;font-family:monospace">'
                + '<div id="t-out" style="flex:1;overflow-y:auto;padding:12px;font-size:13px;line-height:1.6;color:#d4d4d4"></div>'
                + '<div style="display:flex;padding:10px 12px;border-top:1px solid rgba(255,255,255,.1)"><span style="color:#7c8cff;margin-right:8px">❯</span><input id="t-in" style="flex:1;background:transparent;border:none;color:#fff;outline:none;font-family:monospace;font-size:13px" autocomplete="off" spellcheck="false"></div></div>';
            const w = BCOS.window.open('terminal', '💻 终端', html);
            const out = w.querySelector('#t-out'), input = w.querySelector('#t-in');
            const print = function(h) { out.innerHTML += '<div>' + h + '</div>'; out.scrollTop = out.scrollHeight; };
            const esc = function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); };
            print('BCOS Terminal · 输入 help');
            input.focus();
            input.addEventListener('keydown', function(e) {
                if (e.key !== 'Enter') return;
                const cmd = input.value.trim();
                print('<span style="color:#7c8cff">❯</span> ' + esc(cmd));
                run(cmd); input.value = '';
            });
            w.addEventListener('click', function() { input.focus(); });
            function run(cmd) {
                if (!cmd) return;
                const p = cmd.split(/\s+/), c = p[0].toLowerCase();
                if (c === 'clear') { out.innerHTML = ''; return; }
                if (c === 'help') { print('help · ver · date · echo · ls · cat · clear'); return; }
                if (c === 'ver') { print(BCOS.system.version()); return; }
                if (c === 'date') { print(new Date().toString()); return; }
                if (c === 'echo') { print(esc(p.slice(1).join(' '))); return; }
                if (c === 'ls') {
                    const l = BCOS.vfs.list(p[1] || '/');
                    print(l ? l.map(function(i) { return (i.type === 'dir' ? '📁 ' : '📄 ') + i.name; }).join('<br>') : '无此目录');
                    return;
                }
                if (c === 'cat') {
                    const t = BCOS.vfs.read(p[1] || '');
                    print(t !== null ? '<pre>' + esc(t) + '</pre>' : '无此文件');
                    return;
                }
                print('<span style="color:#f66">未知命令: ' + esc(c) + '</span>');
            }
        }
    };
})();
