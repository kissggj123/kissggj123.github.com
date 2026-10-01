import re

with open('index.html', 'r') as f:
    content = f.read()

css = """
            .bcos-context-menu { position: fixed; background: #2a2a2a; border: 1px solid #444; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,.6); padding: 4px 0; z-index: 999999; display: none; min-width: 150px; font-size: 13px; color: #fff; user-select: none; }
            .bcos-context-menu-item { padding: 8px 16px; cursor: pointer; transition: background .1s; display: flex; align-items: center; gap: 8px; }
            .bcos-context-menu-item:hover { background: var(--accent); color: #000; }
"""

# Insert CSS
pattern = re.compile(r"            \.bcos-window-resize \{")
if pattern.search(content):
    content = pattern.sub(css + "            .bcos-window-resize {", content)

js = """
    let _bcosCtxMenu = null;
    function _bcosInitContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            if (!document.getElementById('bcos-overlay')?.classList.contains('bcos-desktop-mode')) return;
            e.preventDefault();
            if (!_bcosCtxMenu) {
                _bcosCtxMenu = document.createElement('div');
                _bcosCtxMenu.className = 'bcos-context-menu';
                _bcosCtxMenu.innerHTML = `
                    <div class="bcos-context-menu-item" onclick="_bcosOpenApp('settings');_bcosHideCtxMenu()"><span>🎨</span>更换壁纸</div>
                    <div class="bcos-context-menu-item" onclick="showBcosCarLockscreen();_bcosHideCtxMenu()"><span>🚗</span>车机锁屏</div>
                    <div class="bcos-context-menu-item" onclick="_bcosOpenApp('terminal');_bcosHideCtxMenu()"><span>💻</span>终端</div>
                    <div style="height:1px;background:#444;margin:4px 0;"></div>
                    <div class="bcos-context-menu-item" onclick="_bcosOpenApp('about');_bcosHideCtxMenu()"><span>ℹ️</span>关于 BCOS</div>
                `;
                document.body.appendChild(_bcosCtxMenu);
            }
            _bcosCtxMenu.style.display = 'block';
            let x = e.clientX, y = e.clientY;
            if (x + _bcosCtxMenu.offsetWidth > window.innerWidth) x = window.innerWidth - _bcosCtxMenu.offsetWidth - 2;
            if (y + _bcosCtxMenu.offsetHeight > window.innerHeight) y = window.innerHeight - _bcosCtxMenu.offsetHeight - 2;
            _bcosCtxMenu.style.left = x + 'px';
            _bcosCtxMenu.style.top = y + 'px';
        });
        document.addEventListener('click', () => { if (_bcosCtxMenu) _bcosCtxMenu.style.display = 'none'; });
    }
    function _bcosHideCtxMenu() { if (_bcosCtxMenu) _bcosCtxMenu.style.display = 'none'; }
"""

# Insert JS
js_pattern = re.compile(r"    let _bcosEscHandler = null;")
if js_pattern.search(content):
    content = js_pattern.sub(js + "    let _bcosEscHandler = null;", content)

# Init Context Menu in _bcosLaunchDesktop
init_pattern = re.compile(r"        _bcosBindEsc\(\);")
if init_pattern.search(content):
    content = init_pattern.sub("        _bcosBindEsc();\n        if (typeof _bcosInitContextMenu === 'function') _bcosInitContextMenu();", content)

with open('index.html', 'w') as f:
    f.write(content)
