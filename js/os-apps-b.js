let _bcosFinderPath = 'me';
    let _bcosFinderHist = ['me'];
    let _bcosFinderHistIdx = 0;
    let _bcosFinderFilter = '';

    function _bcosVfsResolveNode(pathStr) {
        _bcosInitMeFolder();
        pathStr = (pathStr || 'me').trim().replace(/^\/+/, '');
        if (!pathStr || pathStr === '~' || pathStr === 'home/bunny') {
            return {
                type: 'dir',
                path: '~',
                displayName: '主目录 (~)',
                children: {
                    'me': _bcosFS.me,
                    'desktop': _bcosFS.desktop,
                    'repos': { type: 'dir', children: {}, isRepos: true },
                    'anniversary.txt': _bcosFS['anniversary.txt']
                }
            };
        }
        if (pathStr === '/' || pathStr === 'root') {
            return {
                type: 'dir',
                path: '/',
                displayName: '根目录 (/)',
                children: {
                    'home': { type: 'dir', children: { 'bunny': { type: 'dir', children: _bcosFS } } },
                    'bin': { type: 'dir', children: { 'sh': { type: 'file', content: '#!/bin/sh' } } },
                    'etc': { type: 'dir', children: { 'hostname': { type: 'file', content: 'bcos-cockpit\n' } } }
                }
            };
        }
        if (pathStr === 'repos' || pathStr === 'home/bunny/repos') {
            return { type: 'dir', path: 'repos', displayName: '代码仓 (GitHub Repos)', isRepos: true, children: {} };
        }
        if (pathStr === 'desktop' || pathStr === 'home/bunny/desktop') {
            return { type: 'dir', path: 'desktop', displayName: '桌面 (Desktop)', children: _bcosFS.desktop.children };
        }
        // Subpath inside me folder
        const parts = pathStr.replace(/^(me|home\/bunny\/me)\/?/, '').split('/').filter(Boolean);
        let cur = _bcosFS.me;
        for (let i = 0; i < parts.length; i++) {
            const sub = cur.children && cur.children[parts[i]];
            if (sub && sub.type === 'dir') cur = sub; else return null;
        }
        return { type: 'dir', path: 'me' + (parts.length ? '/' + parts.join('/') : ''), displayName: parts.length ? parts[parts.length - 1] : '文稿 (Documents)', children: cur.children };
    }

    function _bcosFileIcon(name, isDir) {
        if (isDir) return '📁';
        const ext = String(name).toLowerCase().split('.').pop();
        const map = {
            md: '📝', markdown: '📝', txt: '📄', log: '📄',
            js: '⚙️', mjs: '⚙️', json: '📋', ts: '⚙️',
            html: '🌐', htm: '🌐', css: '🎨', svg: '🖼️',
            png: '🖼️', jpg: '🖼️', jpeg: '🖼️', lock: '🔒'
        };
        return map[ext] || '📄';
    }

    function _bcosRenderFileManager(content) {
        if (!content) return;
        content.style.padding = '0';
        content.style.height = '100%';
        content.style.overflow = 'hidden';

        content.innerHTML = `
            <div style="display:flex;height:100%;width:100%;background:#141724;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;user-select:none;-webkit-user-select:none;">
                <!-- Left Sidebar -->
                <div style="width:160px;background:rgba(18,22,34,0.95);border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;padding:10px 6px;box-sizing:border-box;flex-shrink:0;">
                    <div style="font-size:10px;font-weight:700;color:#64748b;padding:4px 8px;letter-spacing:0.5px;">个人收藏</div>
                    <div class="bcos-finder-side-item" id="bcos-finder-side-me" onclick="_bcosFinderNavigate('me')">
                        <span>📁</span><span>文稿</span>
                    </div>
                    <div class="bcos-finder-side-item" id="bcos-finder-side-desktop" onclick="_bcosFinderNavigate('desktop')">
                        <span>🖥️</span><span>桌面</span>
                    </div>
                    <div class="bcos-finder-side-item" id="bcos-finder-side-home" onclick="_bcosFinderNavigate('~')">
                        <span>🏠</span><span>主目录</span>
                    </div>
                    <div class="bcos-finder-side-item" id="bcos-finder-side-repos" onclick="_bcosFinderNavigate('repos')">
                        <span>📦</span><span>代码仓</span>
                    </div>
                    <div class="bcos-finder-side-item" id="bcos-finder-side-root" onclick="_bcosFinderNavigate('/')">
                        <span>💾</span><span>系统根目录</span>
                    </div>
                    <div style="font-size:10px;font-weight:700;color:#64748b;padding:14px 8px 4px;letter-spacing:0.5px;">存储卷</div>
                    <div class="bcos-finder-side-item" style="cursor:default;opacity:0.8;">
                        <span>💽</span><span style="font-size:11px;">BCOS 虚拟盘</span>
                    </div>
                </div>

                <!-- Main File Area -->
                <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#161a28;">
                    <!-- Toolbar -->
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(22,26,40,0.92);border-bottom:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;">
                        <div style="display:flex;gap:4px;">
                            <button class="bcos-finder-tb-btn" onclick="_bcosFinderHistory(-1)" title="后退">‹</button>
                            <button class="bcos-finder-tb-btn" onclick="_bcosFinderHistory(1)" title="前进">›</button>
                        </div>
                        <div id="bcos-finder-path-bar" style="flex:1;min-width:140px;font-size:12px;color:#94a3b8;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <button class="bcos-finder-tb-btn" onclick="_bcosFinderNewDoc()" title="在当前文件夹新建文本文档">➕ 新建文档</button>
                            <button class="bcos-finder-tb-btn" onclick="_bcosFinderNewFolderPrompt()" title="新建文件夹">📁 新文件夹</button>
                            <label class="bcos-finder-tb-btn" style="cursor:pointer;" title="从电脑选择文件上传到当前文件夹">
                                📤 上传
                                <input type="file" multiple style="display:none;" onchange="_bcosFinderHandleUpload(event)">
                            </label>
                            <input type="text" id="bcos-finder-search-inp" placeholder="🔍 搜索..." oninput="_bcosFinderOnSearch(this.value)" style="width:80px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:3px 7px;font-size:11px;color:#fff;outline:none;">
                        </div>
                    </div>

                    <!-- File List Container -->
                    <div id="bcos-finder-body" style="flex:1;overflow-y:auto;padding:8px 10px;"></div>

                    <!-- Status Bar -->
                    <div id="bcos-finder-statusbar" style="padding:4px 12px;background:rgba(18,22,34,0.98);border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#64748b;display:flex;justify-content:space-between;align-items:center;">
                        <span id="bcos-finder-status-count">0 个项目</span>
                        <span>BCOS Virtual File System · 关联 Code Studio 编辑器</span>
                    </div>
                </div>
            </div>
        `;

        // Allow drag and drop files directly onto finder
        const wrapEl = content.firstElementChild;
        if (wrapEl) {
            wrapEl.addEventListener('dragover', (ev) => {
                if (ev.dataTransfer && Array.from(ev.dataTransfer.types || []).indexOf('Files') >= 0) ev.preventDefault();
            });
            wrapEl.addEventListener('drop', (ev) => {
                if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
                    ev.preventDefault();
                    Array.from(ev.dataTransfer.files).forEach(f => _bcosFinderImportLocalFile(f));
                }
            });
        }

        _bcosFinderRefreshUI();
    }

    function _bcosFinderNavigate(pathStr, recordHistory) {
        _bcosFinderPath = pathStr || 'me';
        _bcosFinderFilter = '';
        const searchInp = document.getElementById('bcos-finder-search-inp');
        if (searchInp) searchInp.value = '';
        if (recordHistory !== false) {
            _bcosFinderHist = _bcosFinderHist.slice(0, _bcosFinderHistIdx + 1);
            _bcosFinderHist.push(_bcosFinderPath);
            _bcosFinderHistIdx = _bcosFinderHist.length - 1;
        }
        _bcosFinderRefreshUI();
    }

    function _bcosFinderHistory(dir) {
        const nextIdx = _bcosFinderHistIdx + dir;
        if (nextIdx >= 0 && nextIdx < _bcosFinderHist.length) {
            _bcosFinderHistIdx = nextIdx;
            _bcosFinderNavigate(_bcosFinderHist[_bcosFinderHistIdx], false);
        }
    }

    function _bcosFinderOnSearch(val) {
        _bcosFinderFilter = String(val || '').trim().toLowerCase();
        _bcosFinderRefreshUI();
    }

    function _bcosFinderRefreshUI() {
        const bodyEl = document.getElementById('bcos-finder-body');
        const pathEl = document.getElementById('bcos-finder-path-bar');
        const countEl = document.getElementById('bcos-finder-status-count');
        if (!bodyEl) return;

        // Update sidebar highlights
        ['me', 'desktop', 'home', 'repos', 'root'].forEach(k => {
            const el = document.getElementById('bcos-finder-side-' + k);
            if (!el) return;
            const target = (k === 'home' ? '~' : (k === 'root' ? '/' : k));
            el.classList.toggle('active', _bcosFinderPath === target);
        });

        // Repos virtual directory
        if (_bcosFinderPath === 'repos') {
            if (pathEl) pathEl.innerHTML = '<span>📁 /home/bunny/repos</span> <span style="color:#64748b;">(GitHub 代码仓)</span>';
            const repos = _bcosRepos.filter(r => !_bcosFinderFilter || r[0].toLowerCase().includes(_bcosFinderFilter) || (r[2] || '').toLowerCase().includes(_bcosFinderFilter));
            if (countEl) countEl.textContent = `${repos.length} 个代码仓`;
            bodyEl.innerHTML = repos.map(r => {
                const lc = _bcosLangColors[r[2]] || '#e0e0e0';
                return `
                    <div class="bcos-finder-entry" onclick="_bcosOpenCatWindow(_bcosRepos.find(x => x[0] === '${_bcosEscape(r[0])}'))" ondblclick="window.open('${_bcosEscape(r[6])}','_blank')">
                        <span style="font-size:18px;">${r[7] ? '📂' : '📦'}</span>
                        <div style="flex:1;overflow:hidden;line-height:1.3;">
                            <div style="font-size:13px;font-weight:600;color:${lc};">${_bcosEscape(r[0])}</div>
                            <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r[1] ? _bcosEscape(r[1]) : '无描述'}</div>
                        </div>
                        <div style="font-size:11px;color:#64748b;text-align:right;">
                            <div>★ ${r[3]} · ${r[2] || 'Text'}</div>
                            <div>${_bcosEscape(r[5])}</div>
                        </div>
                    </div>
                `;
            }).join('') || '<div style="color:#64748b;padding:2rem;text-align:center;font-size:13px;">无匹配代码仓</div>';
            return;
        }

        const node = _bcosVfsResolveNode(_bcosFinderPath);
        if (!node || node.type !== 'dir') {
            bodyEl.innerHTML = '<div style="color:#ef4444;padding:2rem;text-align:center;">文件夹未找到: ' + _bcosEscape(_bcosFinderPath) + '</div>';
            return;
        }

        const displayPath = (_bcosFinderPath === '~' ? '/home/bunny' : (_bcosFinderPath === '/' ? '/' : '/home/bunny/' + _bcosFinderPath));
        if (pathEl) pathEl.innerHTML = `<span>📁 ${displayPath}</span>`;

        let entries = Object.keys(node.children || {}).map(name => {
            const item = node.children[name];
            const isDir = item.type === 'dir';
            let size = isDir ? '目录' : (String(item.content == null ? '' : item.content).length + ' 字节');
            return { name: name, isDir: isDir, item: item, size: size };
        });

        if (_bcosFinderFilter) {
            entries = entries.filter(e => e.name.toLowerCase().includes(_bcosFinderFilter));
        }

        entries.sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        if (countEl) countEl.textContent = `${entries.length} 个项目`;

        let html = '';
        if (_bcosFinderPath !== 'me' && _bcosFinderPath !== '~' && _bcosFinderPath !== '/') {
            const parentPath = _bcosFinderPath.split('/').slice(0, -1).join('/') || 'me';
            html += `
                <div class="bcos-finder-entry" onclick="_bcosFinderNavigate('${parentPath}')" style="color:#94a3b8;">
                    <span style="font-size:18px;">⬆️</span>
                    <span style="font-size:13px;font-weight:600;">.. (返回上一级)</span>
                </div>
            `;
        }

        if (!entries.length) {
            html += '<div style="color:#64748b;padding:2rem;text-align:center;font-size:13px;">(文件夹为空，可点击上方「➕ 新建文档」或拖入文件)</div>';
        } else {
            entries.forEach(e => {
                const icon = _bcosFileIcon(e.name, e.isDir);
                const safeName = _bcosEscape(e.name);
                html += `
                    <div class="bcos-finder-entry"
                         onclick="_bcosFinderClickEntry('${_bcosEscape(e.name)}', ${e.isDir})"
                         oncontextmenu="_bcosFinderContextMenu(event, '${_bcosEscape(e.name)}', ${e.isDir}); return false;">
                        <span style="font-size:18px;">${icon}</span>
                        <span style="flex:1;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeName}</span>
                        <span style="font-size:11px;color:#64748b;">${e.size}</span>
                    </div>
                `;
            });
        }
        bodyEl.innerHTML = html;
    }

    function _bcosFinderClickEntry(name, isDir) {
        if (isDir) {
            const nextPath = (_bcosFinderPath === '~' || _bcosFinderPath === '/') ? name : (_bcosFinderPath + '/' + name);
            _bcosFinderNavigate(nextPath);
            return;
        }
        // File click: open directly in Code Studio
        const node = _bcosVfsResolveNode(_bcosFinderPath);
        const fileObj = node && node.children && node.children[name];
        if (!fileObj) return;

        // Easter eggs
        if (name === 'edit.lock' || name === 'edit_lock') {
            _bcosOpenEditLock(name);
            return;
        }

        // Executable apps in desktop
        if (fileObj.executable && _bcosFinderPath === 'desktop') {
            _bcosOpenApp(name);
            return;
        }

        // Associated text/code file -> open directly in Code Studio!
        const fullRel = _bcosFinderPath + '/' + name;
        _bcosTeOpenVfsFile(name, fileObj, fullRel);
        showToast('✓ 已在 Code Studio 中打开: ' + name);
    }

    function _bcosFinderContextMenu(e, name, isDir) {
        e.stopPropagation();
        e.preventDefault();
        const node = _bcosVfsResolveNode(_bcosFinderPath);
        const item = node && node.children && node.children[name];
        if (!item) return;

        _bcosDesktopDialog({
            title: (isDir ? '📁 文件夹: ' : '📄 文件: ') + name,
            message: '请选择对此项目的操作：',
            okText: isDir ? '打开文件夹' : '在记事本中打开',
            onOk: () => {
                _bcosFinderClickEntry(name, isDir);
            }
        });
    }

    function _bcosFinderNewDoc() {
        _bcosDesktopDialog({
            title: '新建文稿',
            message: '请输入新建文本文档的文件名（如 note.md 或 app.js）：',
            input: 'untitled.md',
            okText: '创建并编辑',
            onOk: (val) => {
                val = _bcosCleanAppName(val);
                if (!val) val = 'untitled.md';
                const node = _bcosVfsResolveNode(_bcosFinderPath);
                if (!node || node.type !== 'dir') return;
                node.children[val] = { type: 'file', content: '# ' + val + '\n\n' };
                _bcosFinderRefreshUI();
                _bcosTeOpenVfsFile(val, node.children[val], _bcosFinderPath + '/' + val);
                showToast('✓ 已新建文件并打开: ' + val);
            }
        });
    }

    function _bcosFinderNewFolderPrompt() {
        _bcosDesktopDialog({
            title: '新建文件夹',
            message: '请输入新文件夹名称：',
            input: '新建文件夹',
            okText: '创建',
            onOk: (val) => {
                val = _bcosCleanAppName(val);
                if (!val) return;
                const node = _bcosVfsResolveNode(_bcosFinderPath);
                if (!node || node.type !== 'dir') return;
                if (node.children[val]) { showToast('⚠️ 该名称已存在'); return; }
                node.children[val] = { type: 'dir', children: {} };
                _bcosFinderRefreshUI();
                showToast('✓ 已创建文件夹: ' + val);
            }
        });
    }

    function _bcosFinderImportLocalFile(file) {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('⚠️ 文件过大（>5MB）：' + file.name); return; }
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = String(evt.target.result || '');
            const node = _bcosVfsResolveNode(_bcosFinderPath);
            if (node && node.type === 'dir') {
                node.children[file.name] = { type: 'file', content: text };
                _bcosFinderRefreshUI();
                showToast('✓ 已导入文件至 VFS: ' + file.name);
            }
        };
        reader.readAsText(file);
    }

    function _bcosFinderHandleUpload(e) {
        const files = Array.from((e.target && e.target.files) || []);
        if (!files.length) return;
        try { e.target.value = ''; } catch(_) {}
        files.forEach(f => _bcosFinderImportLocalFile(f));
    }

    function _bcosEggCheck() {
        const now = Date.now();
        if (now - _bcosEggState.lastBrowseTime > 2340) {
            _bcosEggState.browseCount++;
        }
        _bcosEggState.lastBrowseTime = now;
        if (_bcosEggState.browseCount >= 7 && !_bcosEggState.eggTriggered && !_bcosEggState.userCreatedEditLock) {
            _bcosEggState.eggTriggered = true;
            _bcosEggState.systemEditLock = true;
            if (!_bcosFS.me.children.edit_lock && !_bcosFS.me.children['edit.lock']) {
                _bcosFS.me.children.edit_lock = { type: 'file', content: '0x' + Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join(''), systemCreated: true };
            }
        }
    }
    function _bcosOpenCatWindow(repo) {
        _bcosEggCheck();
        const winId = 'bcos-win-cat-' + repo[0].replace(/[^a-zA-Z0-9]/g,'');
        if (document.getElementById(winId)) {
            const w = document.getElementById(winId);
            w.style.zIndex = ++_bcos.winZ;
            document.querySelectorAll('.bcos-window').forEach(win => win.classList.remove('active-window'));
            w.classList.add('active-window');
            return;
        }
        const lc = _bcosLangColors[repo[2]] || '#e0e0e0';
        const container = document.getElementById('bcos-windows');
        if (!container) return;
        const win = document.createElement('div');
        win.className = 'bcos-window active-window'; win.id = winId; win.style.zIndex = ++_bcos.winZ;
        const isMobile = window.innerWidth <= 768;
        const winW = isMobile ? Math.min(380, window.innerWidth - 12) : 380;
        const winH = isMobile ? Math.min(320, window.innerHeight - 80) : 320;
        const cx = isMobile ? 6 : Math.max(10, Math.min(80+Math.random()*60, window.innerWidth - winW - 20));
        const cy = isMobile ? 24 : Math.max(10, Math.min(50+Math.random()*60, window.innerHeight - winH - 60));
        win.style.cssText += `left:0;top:0;width:${winW}px;height:${winH}px;transform:translate3d(${cx}px, ${cy}px, 0);`;
        win._bcosTX = cx; win._bcosTY = cy;
        win._bcosOrigW = winW; win._bcosOrigH = winH;
        const safeRepoUrl = _bcosEscape(repo[6]);
        const safeLang = _bcosEscape(repo[2]);
        win.innerHTML = `<div class="bcos-window-titlebar" onmousedown="_bcosDragStart('${winId}',event)" ontouchstart="_bcosTouchDragStart('${winId}',event)"><div class="bcos-window-controls"><button class="bcos-window-btn bcos-window-close" title="关闭" ontouchstart="event.stopPropagation(); event.preventDefault(); _bcosCloseCatWin('${winId}')" onmousedown="event.stopPropagation(); _bcosCloseCatWin('${winId}')" onclick="event.stopPropagation(); _bcosCloseCatWin('${winId}')"></button></div><span class="bcos-window-title">📄 ${_bcosEscape(repo[0])}</span><div style="width:24px;"></div></div><div class="bcos-window-content" style="padding:.6rem;font-size:12px;">
            <div style="margin-bottom:.3rem;"><span style="color:#00ff41;">Repo:</span> ${_bcosEscape(repo[0])}</div>
            <div style="margin-bottom:.3rem;"><span style="color:#00ff41;">Desc:</span> ${repo[1]?_bcosEscape(repo[1].substring(0,80)):'<span style="color:#666;">// None</span>'}</div>
            <div style="margin-bottom:.3rem;"><span style="color:#00ff41;">Lang:</span> <span style="color:${lc};">${safeLang}</span></div>
            <div style="margin-bottom:.3rem;"><span style="color:#00ff41;">Stars:</span> ★ ${repo[3]} | <span style="color:#00ff41;">Forks:</span> ⑂ ${repo[4]}</div>
            <div style="margin-bottom:.3rem;"><span style="color:#00ff41;">Updated:</span> ${_bcosEscape(repo[5])}</div>
            <div style="margin-bottom:.3rem;"><span style="color:#00ff41;">Size:</span> ${repo[8]>=1024?(repo[8]/1024).toFixed(1)+' MB':repo[8]+' KB'}</div>
            <div style="margin-bottom:.3rem;"><span style="color:#00ff41;">Type:</span> ${repo[7]?'Fork':'Original'}</div>
            <div style="margin-top:.5rem;"><button style="background:#1a1a1a;border:1px solid #00ff41;color:#00ff41;padding:.3rem .6rem;cursor:pointer;font-family:inherit;font-size:11px;" onclick="window.open('${safeRepoUrl}','_blank')">🌐 Open on GitHub</button></div>
        </div>`;
        container.appendChild(win);
        document.querySelectorAll('.bcos-window').forEach(w => { if (w !== win) w.classList.remove('active-window'); });
        win.addEventListener('mousedown', () => {
            win.style.zIndex = ++_bcos.winZ;
            document.querySelectorAll('.bcos-window').forEach(w => w.classList.remove('active-window'));
            win.classList.add('active-window');
        });
        win.addEventListener('touchstart', () => {
            win.style.zIndex = ++_bcos.winZ;
            document.querySelectorAll('.bcos-window').forEach(w => w.classList.remove('active-window'));
            win.classList.add('active-window');
        }, { passive: true });
    }

    function _bcosRenderMonitor(content) {
        content.style.padding = '.5rem';
        content.innerHTML = '<div id="bcos-monitor-root" style="font-size:12px;color:#e0e0e0;"></div>';
        const root = document.getElementById('bcos-monitor-root');
        const t = _bcosRepos.length, o = _bcosRepos.filter(r=>!r[7]).length, f = t-o;
        const lc = new Set(_bcosRepos.map(r=>r[2])).size;
        const ts = _bcosRepos.reduce((s,r)=>s+r[3],0), tf = _bcosRepos.reduce((s,r)=>s+r[4],0);
        const lm = {}; _bcosRepos.forEach(r=>{lm[r[2]]=(lm[r[2]]||0)+1;});
        const topLangs = Object.entries(lm).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([l,c])=>{const col=_bcosLangColors[l]||'#e0e0e0';return `<div style="color:${col};font-size:11px;">● ${_bcosEscape(l)}: ${c}</div>`;}).join('');
        // Pre-compute static values once
        const cpuCores = navigator.hardwareConcurrency || 4;
        const devMem = navigator.deviceMemory || (4 + Math.floor(Math.random()*8));
        const gpuShort = _gpuInfo.renderer.length > 28 ? _gpuInfo.renderer.substring(0, 28) + '...' : _gpuInfo.renderer;
        let netType = 'GitHub Archive', netEff = '—';
        if (navigator.connection) {
            netType = navigator.connection.effectiveType || netType;
            netEff = navigator.connection.downlink ? navigator.connection.downlink + ' Mbps' : netEff;
        }
        // ---- 模块化状态检测 (v7.8.6.9482+): 检查 6 CSS + 19 JS 模块实际加载情况 ----
        const _bcosModCss = ['base','ui','effects','car-lockscreen-a','car-lockscreen-b','rounded-screen'];
        const _bcosModJs = ['screen','core','game','renderer','game-logic-a','game-logic-b','game-logic-c','ui','os','icons','os-apps-a','os-apps-b','os-apps-c','wallpaper-data','wallpaper','apps','ui-systems-a','ui-systems-b','ui-systems-c'];
        const _loadedCss = new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map(l => (l.getAttribute('href')||'').split('/').pop().replace(/\.css(\?.*)?$/,'')));
        const _loadedJs = new Set([...document.querySelectorAll('script[src]')].map(s => (s.getAttribute('src')||'').split('/').pop().replace(/\.js(\?.*)?$/,'')));
        const _modDot = (name, ok) => `<span title="${name}${ok?' ✓':' ✗ 404'}" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ok?'#00ff41':'#f44'};margin:1px;"></span>`;
        const _cssDots = _bcosModCss.map(n => _modDot('css/'+n+'.css', _loadedCss.has(n))).join('');
        const _jsDots = _bcosModJs.map(n => _modDot('js/'+n+'.js', _loadedJs.has(n))).join('');
        const _cssOk = _bcosModCss.filter(n => _loadedCss.has(n)).length;
        const _jsOk = _bcosModJs.filter(n => _loadedJs.has(n)).length;
        const _modHtml = `<div style="background:#0a0a0a;padding:.4rem;border-radius:3px;margin-bottom:.3rem;">`
            + `<div style="color:#888;font-size:10px;">📦 Modules: <span style="color:${_cssOk===6?'#00ff41':'#f44'};">CSS ${_cssOk}/6</span> · <span style="color:${_jsOk===19?'#00ff41':'#f44'};">JS ${_jsOk}/19</span></div>`
            + `<div style="margin-top:.25rem;"><div style="color:#666;font-size:9px;">CSS</div><div>${_cssDots}</div></div>`
            + `<div style="margin-top:.2rem;"><div style="color:#666;font-size:9px;">JS</div><div>${_jsDots}</div></div>`
            + `${(_cssOk<6||_jsOk<19)?'<div style="color:#f44;font-size:10px;margin-top:.2rem;">⚠️ 有模块缺失（悬停红点查看文件名）</div>':''}</div>`;
        // Build structure once with placeholder elements for dynamic data
        root.innerHTML = `<div style="text-align:center;margin-bottom:.5rem;color:#00ff41;font-weight:bold;">📊 bcos System Monitor</div>
        <div style="background:#0a0a0a;padding:.4rem;border-radius:3px;margin-bottom:.3rem;"><div id="bcos-mon-cpu" style="color:#888;font-size:10px;"></div><div style="background:#1a1a1a;height:8px;border-radius:4px;margin-top:.2rem;"><div id="bcos-mon-cpu-bar" style="height:8px;border-radius:4px;"></div></div></div>
        <div style="background:#0a0a0a;padding:.4rem;border-radius:3px;margin-bottom:.3rem;"><div id="bcos-mon-mem" style="color:#888;font-size:10px;"></div><div style="background:#1a1a1a;height:8px;border-radius:4px;margin-top:.2rem;"><div id="bcos-mon-mem-bar" style="height:8px;border-radius:4px;"></div></div></div>
        <div style="background:#0a0a0a;padding:.4rem;border-radius:3px;margin-bottom:.3rem;"><div style="color:#888;font-size:10px;">Repo Memory: ${t} repos / ${lc} langs</div><div style="background:#1a1a1a;height:8px;border-radius:4px;margin-top:.2rem;"><div style="background:#00aaff;height:8px;width:67%;border-radius:4px;"></div></div></div>
        <div style="background:#0a0a0a;padding:.4rem;border-radius:3px;margin-bottom:.3rem;"><div id="bcos-mon-dom" style="color:#888;font-size:10px;"></div><div style="background:#1a1a1a;height:8px;border-radius:4px;margin-top:.2rem;"><div id="bcos-mon-dom-bar" style="height:8px;border-radius:4px;"></div></div></div>
        <div style="background:#0a0a0a;padding:.4rem;border-radius:3px;margin-bottom:.3rem;"><div style="color:#888;font-size:10px;">GPU: ${_bcosEscape(gpuShort)}</div><div style="background:#1a1a1a;height:8px;border-radius:4px;margin-top:.2rem;"><div style="background:${_gpuInfo.gpuAccelerated ? '#00ff41' : '#f44'};height:8px;width:${_gpuInfo.gpuAccelerated ? 80 : 20}%;border-radius:4px;"></div></div><div style="color:${_gpuInfo.gpuAccelerated ? '#00ff41' : '#f44'};font-size:10px;margin-top:.2rem;">● ${_gpuInfo.gpuAccelerated ? 'GPU Accelerated' : 'No GPU accel'}${_gpuInfo.isAppleSilicon ? ' (Apple Silicon)' : ''}</div></div>
        <div style="background:#0a0a0a;padding:.4rem;border-radius:3px;margin-bottom:.3rem;"><div style="color:#888;font-size:10px;">Network: ${netType} ${netEff!=='—'?'| '+netEff:''}</div><div style="color:#00ff41;font-size:10px;margin-top:.2rem;">● Connected</div></div>
        ${_modHtml}
        <div style="border-top:1px solid #333;margin-top:.3rem;padding-top:.3rem;">
            <div style="color:#00ff41;font-size:11px;">Repository Stats:</div>
            <div style="color:#e0e0e0;font-size:11px;">Total: ${t} | Original: ${o} | Forks: ${f}</div>
            <div style="color:#e0e0e0;font-size:11px;">Stars: ★ ${ts} | Forks: ⑂ ${tf} | Langs: ${lc}</div>
        </div>
        <div style="border-top:1px solid #333;margin-top:.3rem;padding-top:.3rem;">
            <div style="color:#00ff41;font-size:11px;">Top Languages:</div>
            ${topLangs}
        </div>
        <div style="color:#666;font-size:9px;margin-top:.3rem;text-align:center;">Updates every 2s</div>`;
        // Cache DOM refs for targeted updates (avoids full innerHTML rebuild)
        const cpuEl = document.getElementById('bcos-mon-cpu');
        const cpuBar = document.getElementById('bcos-mon-cpu-bar');
        const memEl = document.getElementById('bcos-mon-mem');
        const memBar = document.getElementById('bcos-mon-mem-bar');
        const domEl = document.getElementById('bcos-mon-dom');
        const domBar = document.getElementById('bcos-mon-dom-bar');
        function _bcosMonitorUpdate() {
            if (!root || !root.isConnected) { if (_bcosMonitorTimer) { clearInterval(_bcosMonitorTimer); _bcosMonitorTimer = null; } return; }
            const cpuLoad = Math.round(15 + Math.random() * 35);
            if (cpuEl) {
                cpuEl.textContent = 'CPU: ' + cpuCores + ' cores @ ' + (2.0+Math.random()*1.5).toFixed(1) + 'GHz (' + cpuLoad + '%)';
                cpuBar.style.background = cpuLoad > 80 ? '#f44' : '#00ff41';
                cpuBar.style.width = cpuLoad + '%';
            }
            let memUsed = 0, memTotal = 0, memPct = 0;
            if (performance.memory) {
                memUsed = Math.round(performance.memory.usedJSHeapSize / 1048576);
                memTotal = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
                memPct = Math.min(100, Math.round(memUsed / memTotal * 100));
            } else {
                memUsed = Math.round(50 + Math.random() * 200);
                memTotal = Math.round(devMem * 1024 * 0.6);
                memPct = Math.min(100, Math.round(memUsed / memTotal * 100));
            }
            if (memEl) {
                memEl.textContent = 'Device Memory: ' + devMem + ' GB | JS Heap: ' + memUsed + ' / ' + memTotal + ' MB (' + memPct + '%)';
                memBar.style.background = memPct > 80 ? '#f44' : '#00aaff';
                memBar.style.width = memPct + '%';
            }
            // Count DOM nodes only within bcos overlay (much cheaper than document.querySelectorAll('*'))
            const bcosOv = document.getElementById('bcos-overlay');
            const domNodes = bcosOv ? bcosOv.querySelectorAll('*').length : 0;
            if (domEl) {
                domEl.textContent = 'DOM Nodes: ' + domNodes;
                domBar.style.background = '#ffaa00';
                domBar.style.width = Math.min(100, Math.round(domNodes/30)) + '%';
            }
        }
        _bcosMonitorUpdate();
        if (_bcosMonitorTimer) clearInterval(_bcosMonitorTimer);
        _bcosMonitorTimer = setInterval(_bcosMonitorUpdate, 2000);
    }

    function _bcosRenderAbout(content) {
        content.style.padding = '.6rem';
        content.innerHTML = `<div style="font-size:12px;color:#e0e0e0;text-align:center;">
            <pre style="color:#00ff41;font-size:10px;line-height:1.2;">${_BCOS_BUNNY_ART}</pre>
            <div style="margin-top:.5rem;color:#00ff41;font-weight:bold;">bcos ${_BCOS_VER}</div>
            <div style="color:#888;">Bunny OS</div>
            <div style="margin-top:.5rem;">GitHub Repository Archive</div>
            <div>${_bcosRepos.length} repositories | ${new Set(_bcosRepos.map(r=>r[2])).size} languages</div>
            <div style="margin-top:.5rem;color:#666;">Powered by Bunny Core</div>
            <div style="color:#666;">© 2014-${new Date().getFullYear()} kissggj123</div>
            <div style="margin-top:.6rem;border-top:1px solid #333;padding-top:.5rem;text-align:left;">
                <div style="color:#00ff41;font-size:11px;font-weight:bold;margin-bottom:.3rem;">📦 模块化架构 <span style="color:#888;font-weight:normal;">v7.8.6.9482</span></div>
                <div style="color:#aaa;font-size:10px;line-height:1.6;">
                    <div>🏗️ <b style="color:#e0e0e0;">index.html</b> 由 1.5MB 单文件拆分为 <b style="color:#00ff41;">19 JS + 6 CSS</b> 独立模块</div>
                    <div style="margin-top:.25rem;color:#888;">— JS 模块 —</div>
                    <div>🖥️ screen.js <span style="color:#666;">屏幕检测</span> · 🧩 core.js <span style="color:#666;">核心/配置/状态</span></div>
                    <div>🎮 game.js <span style="color:#666;">大富翁初始化</span> · 🎨 renderer.js <span style="color:#666;">渲染模块</span></div>
                    <div>🎲 game-logic-a/b/c.js <span style="color:#666;">游戏逻辑（托管/股票/赌场）</span></div>
                    <div>🪟 ui.js <span style="color:#666;">UI 模块</span> · 💻 os.js <span style="color:#666;">终端</span> · 🎯 icons.js <span style="color:#666;">图标模块</span></div>
                    <div>📱 os-apps-a/b/c.js <span style="color:#666;">系统应用</span> · 🖼️ wallpaper-data.js + wallpaper.js <span style="color:#666;">壁纸管理</span></div>
                    <div>📝 apps.js <span style="color:#666;">应用</span> · ⚙️ ui-systems-a/b/c.js <span style="color:#666;">UI 系统</span></div>
                    <div style="margin-top:.25rem;color:#888;">— CSS 模块 —</div>
                    <div>🎨 base.css <span style="color:#666;">基础</span> · 🧱 ui.css <span style="color:#666;">组件</span> · ✨ effects.css <span style="color:#666;">动效</span></div>
                    <div>🚗 car-lockscreen-a/b.css <span style="color:#666;">车机锁屏</span> · ⭕ rounded-screen.css <span style="color:#666;">圆角屏适配</span></div>
                    <div style="margin-top:.25rem;color:#666;font-size:9px;">详见仓库根目录 MODULES.md（含 4 处无损提取审计）</div>
                </div>
            </div>
            <div style="margin-top:.5rem;"><button style="background:#1a1a1a;border:1px solid #00ff41;color:#00ff41;padding:.3rem .6rem;cursor:pointer;font-family:inherit;font-size:11px;border-radius:4px;" onclick="window.open('https://github.com/kissggj123/Bunny-Cockpit-OS','_blank')">🌐 View on GitHub</button></div>
        </div>`;
    }

    // === Browser app ===
    let _bcosBrowserHTML = null;
    let _bcosBrowserCurrentURL = 'bunny://kingdom';
    const _bcosBookmarks = [
        { name: '🐰 Kingdom', url: 'bunny://kingdom', type: 'internal' },
        { name: '💕 Anniversary', url: 'bunny://anniversary', type: 'internal' },
        { name: '🐙 GitHub', url: 'bunny://github', type: 'internal' },
        { name: '🔍 BunnySearch', url: 'bunny://search', type: 'internal' },
        { name: '📖 BunnyWiki', url: 'bunny://wiki', type: 'internal' },
        { name: '🛒 BunnyShop', url: 'bunny://shop', type: 'internal' },
        { name: '📰 BunnyNews', url: 'bunny://news', type: 'internal' },
        { name: '🎮 BunnyPlay', url: 'bunny://play', type: 'internal' },
    ];
    function _bcosGetBookmarkPage(url) {
        if (url === 'bunny://github') {
            var topRepos = _bcosRepos.slice().sort((a,b) => b[3] - a[3]).slice(0, 6);
            var repoList = topRepos.map(r => {
                var lc = _bcosLangColors[r[2]] || '#e0e0e0';
                var safeName = _bcosEscape(r[0]);
                var safeDesc = r[1] ? _bcosEscape(r[1].substring(0,60)) : '<span style="color:#666;">No description</span>';
                var safeUrl = _bcosEscape(r[6]).replace(/'/g, '&#39;');
                return '<div style="border:1px solid #30363d;border-radius:6px;padding:.6rem;margin-bottom:.4rem;background:#0d1117;">' +
                    '<div style="display:flex;align-items:center;gap:.3rem;">' +
                    '<span style="color:#58a6ff;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;" onclick="window.open(\'' + safeUrl + '\',\'_blank\')">' + safeName + '</span>' +
                    '<span style="color:#8b949e;font-size:10px;border:1px solid #30363d;border-radius:12px;padding:0 .4rem;">' + (r[7] ? 'fork' : 'public') + '</span>' +
                    '</div>' +
                    '<div style="color:#8b949e;font-size:11px;margin:.2rem 0;">' + safeDesc + '</div>' +
                    '<div style="display:flex;align-items:center;gap:.6rem;font-size:10px;color:#8b949e;">' +
                    '<span style="color:' + lc + ';">● ' + _bcosEscape(r[2]) + '</span>' +
                    (r[3] > 0 ? '<span>★ ' + r[3] + '</span>' : '') +
                    (r[4] > 0 ? '<span>⑂ ' + r[4] + '</span>' : '') +
                    '<span>' + _bcosEscape(r[5]) + '</span>' +
                    '</div></div>';
            }).join('');
            return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;background:#0d1117;color:#c9d1d9;min-height:100%;">' +
                '<div style="background:#161b22;border-bottom:1px solid #30363d;padding:.5rem .8rem;display:flex;align-items:center;gap:.5rem;">' +
                '<span style="font-size:16px;">🐙</span>' +
                '<span style="color:#58a6ff;font-size:13px;font-weight:600;">kissggj123</span>' +
                '<span style="color:#8b949e;font-size:12px;">/ Repositories</span>' +
                '<span style="margin-left:auto;background:#238636;color:#fff;font-size:10px;padding:.15rem .5rem;border-radius:4px;cursor:pointer;" onclick="window.open(\'https://github.com/kissggj123?tab=repositories\',\'_blank\')">Open real GitHub ↗</span>' +
                '</div>' +
                '<div style="display:flex;padding:.8rem;gap:.8rem;">' +
                '<div style="width:120px;flex-shrink:0;text-align:center;">' +
                '<div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#FF6B9D,#a78bfa);margin:0 auto .3rem;display:flex;align-items:center;justify-content:center;font-size:24px;">🐰</div>' +
                '<div style="color:#58a6ff;font-size:12px;font-weight:600;">CanguroMIO</div>' +
                '<div style="color:#8b949e;font-size:10px;">kissggj123</div>' +
                '<div style="color:#8b949e;font-size:10px;margin-top:.3rem;">🐰 Angora Rabbit Caretaker</div>' +
                '</div>' +
                '<div style="flex:1;min-width:0;">' +
                '<div style="display:flex;gap:.5rem;margin-bottom:.5rem;flex-wrap:wrap;">' +
                '<span style="background:#21262d;border:1px solid #30363d;border-radius:12px;padding:.1rem .5rem;font-size:10px;color:#8b949e;">📦 ' + _bcosRepos.length + ' repos</span>' +
                '<span style="background:#21262d;border:1px solid #30363d;border-radius:12px;padding:.1rem .5rem;font-size:10px;color:#8b949e;">★ ' + _bcosRepos.reduce((s,r)=>s+r[3],0) + ' stars</span>' +
                '<span style="background:#21262d;border:1px solid #30363d;border-radius:12px;padding:.1rem .5rem;font-size:10px;color:#8b949e;">⑂ ' + _bcosRepos.reduce((s,r)=>s+r[4],0) + ' forks</span>' +
                '</div>' +
                '<div style="color:#8b949e;font-size:10px;margin-bottom:.5rem;">Top repositories by stars:</div>' +
                repoList +
                '<div style="text-align:center;margin-top:.5rem;"><span style="color:#58a6ff;font-size:10px;cursor:pointer;text-decoration:underline;" onclick="window.open(\'https://github.com/kissggj123?tab=repositories\',\'_blank\')">View all ' + _bcosRepos.length + ' repositories on GitHub ↗</span></div>' +
                '</div></div>' +
                '<div style="text-align:center;padding:.5rem;color:#484f58;font-size:9px;border-top:1px solid #30363d;">Simulated GitHub page | Data from GitHub API | Click repo names to visit real GitHub</div>' +
                '</div>';
        }
        if (url === 'bunny://search') {
            return '<div style="font-family:sans-serif;text-align:center;padding:2rem;background:linear-gradient(135deg,#1a1a2e,#16213E);color:#fff;min-height:100%;">' +
                '<h1 style="color:#FF6B9D;font-size:1.8rem;margin-bottom:1rem;">🔍 BunnySearch</h1>' +
                '<div style="max-width:320px;margin:0 auto 1rem;"><div style="display:flex;gap:.3rem;">' +
                '<input type="text" placeholder="Search bunny stuff..." style="flex:1;background:#1a1a1a;border:1px solid #333;color:#fff;padding:.5rem .8rem;border-radius:20px;font-size:13px;outline:none;" onkeydown="if(event.key===\'Enter\'){var r=document.getElementById(\'bs-result\');r.style.display=\'block\';r.innerHTML=\'<div style=\\\'color:#00ff41;margin-top:1rem;\\\'>&gt; Searching for: \'+this.value+\'</div><div style=\\\'color:#a78bfa;margin-top:.5rem;\\\'>&gt; Found 3 results about \'+this.value+\'</div><div style=\\\'color:#888;font-size:12px;margin-top:.3rem;\\\'>&gt; 🐰 Bunny Kingdom has info about \'+this.value+\'</div><div style=\\\'color:#888;font-size:12px;\\\'>&gt; 📖 BunnyWiki article: \'+this.value+\'</div><div style=\\\'color:#888;font-size:12px;\\\'>&gt; 🛒 BunnyShop products matching \'+this.value+\'</div>\';}" />' +
                '<button onclick="var r=document.getElementById(\'bs-result\');r.style.display=\'block\';var i=this.previousElementSibling;r.innerHTML=\'<div style=\\\'color:#00ff41;margin-top:1rem;\\\'>&gt; Searching for: \'+i.value+\'</div><div style=\\\'color:#a78bfa;margin-top:.5rem;\\\'>&gt; Found 3 results</div>\';" style="background:#FF6B9D;border:none;color:#fff;padding:.5rem 1rem;border-radius:20px;cursor:pointer;font-size:13px;">Search</button>' +
                '</div></div>' +
                '<div id="bs-result" style="display:none;text-align:left;max-width:320px;margin:0 auto;"></div>' +
                '<div style="margin-top:2rem;color:#666;font-size:.7rem;">🐰 The bunny search engine | Powered by bcos</div>' +
                '</div>';
        }
        if (url === 'bunny://wiki') {
            return '<div style="font-family:sans-serif;padding:1.5rem;background:linear-gradient(135deg,#0d1117,#161b22);color:#e0e0e0;min-height:100%;">' +
                '<h1 style="color:#FF6B9D;font-size:1.4rem;text-align:center;margin-bottom:1rem;">📖 BunnyWiki</h1>' +
                '<div style="background:#161b22;border:1px solid #333;border-radius:6px;padding:1rem;margin-bottom:.8rem;">' +
                '<h2 style="color:#00ff41;font-size:1rem;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">🐰 Angora Rabbit (Tap to expand)</h2>' +
                '<div style="display:none;color:#a0a0a0;font-size:12px;line-height:1.6;margin-top:.5rem;">The Angora rabbit is a variety of domestic rabbit bred for its long, soft wool. The British Angora is one of the oldest breeds, known for its compact body and silky fur. 兔可可 is a British-derived Angora rabbit with dual pedigree, born on 2024.3.12.</div>' +
                '</div>' +
                '<div style="background:#161b22;border:1px solid #333;border-radius:6px;padding:1rem;margin-bottom:.8rem;">' +
                '<h2 style="color:#00aaff;font-size:1rem;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">🌿 Bunny Diet (Tap to expand)</h2>' +
                '<div style="display:none;color:#a0a0a0;font-size:12px;line-height:1.6;margin-top:.5rem;">A healthy bunny diet consists of 80% hay, 10% fresh vegetables, 5% pellets, and 5% treats. Always provide fresh water. Avoid chocolate, onions, and avocado.</div>' +
                '</div>' +
                '<div style="background:#161b22;border:1px solid #333;border-radius:6px;padding:1rem;margin-bottom:.8rem;">' +
                '<h2 style="color:#ffaa00;font-size:1rem;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">🏠 Bunny Housing (Tap to expand)</h2>' +
                '<div style="display:none;color:#a0a0a0;font-size:12px;line-height:1.6;margin-top:.5rem;">Bunnies need at least 12 square feet of floor space. They should be kept indoors with plenty of ventilation. Provide hiding spots, toys, and a litter box.</div>' +
                '</div>' +
                '<div style="background:#161b22;border:1px solid #333;border-radius:6px;padding:1rem;margin-bottom:.8rem;">' +
                '<h2 style="color:#a78bfa;font-size:1rem;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">💻 bcos OS (Tap to expand)</h2>' +
                '<div style="display:none;color:#a0a0a0;font-size:12px;line-height:1.6;margin-top:.5rem;">bcos (Bunny OS) is a Linux-style terminal operating system running entirely in the browser. It features 30+ commands, a desktop environment, 12 theme-adaptive wallpapers, and an archive of 177 GitHub repositories.</div>' +
                '</div>' +
                '<p style="color:#666;font-size:.65rem;text-align:center;margin-top:1rem;">📖 BunnyWiki — The Free Bunny Encyclopedia</p>' +
                '</div>';
        }
        if (url === 'bunny://shop') {
            return '<div style="font-family:sans-serif;padding:1.5rem;background:linear-gradient(135deg,#FFF0F5,#FFE4E1);color:#333;min-height:100%;">' +
                '<h1 style="color:#FF6B9D;font-size:1.4rem;text-align:center;margin-bottom:1rem;">🛒 BunnyShop</h1>' +
                '<p style="text-align:center;color:#888;font-size:12px;margin-bottom:1rem;">Premium supplies for your furry friend</p>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;max-width:300px;margin:0 auto;">' +
                '<div style="background:#fff;border-radius:8px;padding:.8rem;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,.1);">' +
                '<div style="font-size:2rem;">🐰</div><div style="color:#333;font-size:11px;font-weight:bold;">Angora Plush</div><div style="color:#FF6B9D;font-size:13px;font-weight:bold;">¥128</div>' +
                '<button onclick="this.textContent=\'✓ Added!\';this.style.background=\'#4CAF50\';" style="background:#FF6B9D;color:#fff;border:none;padding:.2rem .5rem;border-radius:4px;cursor:pointer;font-size:10px;margin-top:.3rem;">Add to Cart</button>' +
                '</div>' +
                '<div style="background:#fff;border-radius:8px;padding:.8rem;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,.1);">' +
                '<div style="font-size:2rem;">🥕</div><div style="color:#333;font-size:11px;font-weight:bold;">Organic Carrots</div><div style="color:#FF6B9D;font-size:13px;font-weight:bold;">¥38</div>' +
                '<button onclick="this.textContent=\'✓ Added!\';this.style.background=\'#4CAF50\';" style="background:#FF6B9D;color:#fff;border:none;padding:.2rem .5rem;border-radius:4px;cursor:pointer;font-size:10px;margin-top:.3rem;">Add to Cart</button>' +
                '</div>' +
                '<div style="background:#fff;border-radius:8px;padding:.8rem;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,.1);">' +
                '<div style="font-size:2rem;">🏡</div><div style="color:#333;font-size:11px;font-weight:bold;">Bunny House XL</div><div style="color:#FF6B9D;font-size:13px;font-weight:bold;">¥468</div>' +
                '<button onclick="this.textContent=\'✓ Added!\';this.style.background=\'#4CAF50\';" style="background:#FF6B9D;color:#fff;border:none;padding:.2rem .5rem;border-radius:4px;cursor:pointer;font-size:10px;margin-top:.3rem;">Add to Cart</button>' +
                '</div>' +
                '<div style="background:#fff;border-radius:8px;padding:.8rem;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,.1);">' +
                '<div style="font-size:2rem;">🧸</div><div style="color:#333;font-size:11px;font-weight:bold;">Chew Toy Set</div><div style="color:#FF6B9D;font-size:13px;font-weight:bold;">¥68</div>' +
                '<button onclick="this.textContent=\'✓ Added!\';this.style.background=\'#4CAF50\';" style="background:#FF6B9D;color:#fff;border:none;padding:.2rem .5rem;border-radius:4px;cursor:pointer;font-size:10px;margin-top:.3rem;">Add to Cart</button>' +
                '</div>' +
                '</div>' +
                '<p style="color:#888;font-size:.65rem;text-align:center;margin-top:1rem;">🛒 Free shipping on orders over ¥99 | BunnyShop</p>' +
                '</div>';
        }
        if (url === 'bunny://news') {
            var newsDate = new Date().toLocaleDateString('en-US');
            return '<div style="font-family:sans-serif;padding:1.5rem;background:linear-gradient(135deg,#0d1117,#161b22);color:#e0e0e0;min-height:100%;">' +
                '<h1 style="color:#FF6B9D;font-size:1.4rem;text-align:center;margin-bottom:1rem;">📰 BunnyNews</h1>' +
                '<div style="border-bottom:1px solid #333;padding-bottom:.8rem;margin-bottom:.8rem;">' +
                '<div style="color:#888;font-size:10px;">' + newsDate + ' | 🐰 Kingdom</div>' +
                '<h2 style="color:#00ff41;font-size:.95rem;margin:.3rem 0;">兔可可 Celebrates Another Beautiful Day</h2>' +
                '<p style="color:#a0a0a0;font-size:12px;line-height:1.5;">The star Angora rabbit of the kingdom, 兔可可 (CoCo), was spotted enjoying fresh hay and binkying around the garden. "Another perfect day," said the happy caretaker.</p>' +
                '</div>' +
                '<div style="border-bottom:1px solid #333;padding-bottom:.8rem;margin-bottom:.8rem;">' +
                '<div style="color:#888;font-size:10px;">' + newsDate + ' | 💻 Tech</div>' +
                '<h2 style="color:#00aaff;font-size:.95rem;margin:.3rem 0;">bcos OS Reaches Version ' + _BCOS_VER + '</h2>' +
                '<p style="color:#a0a0a0;font-size:12px;line-height:1.5;">The browser-based operating system bcos has been updated with new features including a virtual file system, browser app, and more. 177 repositories are now archived.</p>' +
                '</div>' +
                '<div style="border-bottom:1px solid #333;padding-bottom:.8rem;margin-bottom:.8rem;">' +
                '<div style="color:#888;font-size:10px;">' + newsDate + ' | 🏆 Achievement</div>' +
                '<h2 style="color:#ffaa00;font-size:.95rem;margin:.3rem 0;">GitHub Profile Reaches 177 Repositories</h2>' +
                '<p style="color:#a0a0a0;font-size:12px;line-height:1.5;">CanguroMIO\'s GitHub profile has reached an impressive 177 repositories spanning multiple languages including C#, Python, Swift, and more.</p>' +
                '</div>' +
                '<div style="padding-bottom:.8rem;">' +
                '<div style="color:#888;font-size:10px;">' + newsDate + ' | 🌿 Lifestyle</div>' +
                '<h2 style="color:#a78bfa;font-size:.95rem;margin:.3rem 0;">Top 5 Bunny Care Tips for Summer</h2>' +
                '<p style="color:#a0a0a0;font-size:12px;line-height:1.5;">1. Keep them cool 2. Fresh water always 3. Groom regularly 4. Provide shade 5. Watch for heat stress. Stay fluffy, stay safe!</p>' +
                '</div>' +
                '<p style="color:#666;font-size:.65rem;text-align:center;margin-top:1rem;">📰 BunnyNews — Daily fluff, daily news</p>' +
                '</div>';
        }
        if (url === 'bunny://play') {
            return '<div style="font-family:sans-serif;padding:1.5rem;background:linear-gradient(135deg,#1a0B2E,#0c0a1d);color:#e0e0e0;min-height:100%;text-align:center;">' +
                '<h1 style="color:#fbbf24;font-size:1.4rem;margin-bottom:1rem;">🎮 BunnyPlay</h1>' +
                '<p style="color:#888;font-size:12px;margin-bottom:1.5rem;">Mini games for bunny lovers</p>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;max-width:280px;margin:0 auto;">' +
                '<div onclick="alert(\'🐰 Catch the Bunny!\\n\\nA bunny appears! You caught it! 🥕+10\');" style="background:#161b22;border:1px solid #fbbf24;border-radius:8px;padding:1rem;cursor:pointer;"><div style="font-size:2rem;">🐰</div><div style="color:#fbbf24;font-size:11px;margin-top:.3rem;">Catch Bunny</div></div>' +
                '<div onclick="alert(\'🥕 Feed the Bunny!\\n\\nYou fed CoCo a carrot! Happiness +20 🐰\');" style="background:#161b22;border:1px solid #00ff41;border-radius:8px;padding:1rem;cursor:pointer;"><div style="font-size:2rem;">🥕</div><div style="color:#00ff41;font-size:11px;margin-top:.3rem;">Feed Bunny</div></div>' +
                '<div onclick="alert=\'🏡 Bunny Race!\\n\\nReady... Set... Go!\\n\\n🐰 CoCo wins! 🏆\');" style="background:#161b22;border:1px solid #00aaff;border-radius:8px;padding:1rem;cursor:pointer;"><div style="font-size:2rem;">🏎️</div><div style="color:#00aaff;font-size:11px;margin-top:.3rem;">Bunny Race</div></div>' +
                '<div onclick="alert(\'🎵 Bunny Music!\\n\\n🎵 Now playing: Sweet Bunny Dreams\\n🎶 🐰💤\');" style="background:#161b22;border:1px solid #a78bfa;border-radius:8px;padding:1rem;cursor:pointer;"><div style="font-size:2rem;">🎵</div><div style="color:#a78bfa;font-size:11px;margin-top:.3rem;">Bunny Music</div></div>' +
                '</div>' +
                '<div style="margin-top:1.5rem;color:#666;font-size:.65rem;">🎮 BunnyPlay — Play with bunnies anytime</div>' +
                '</div>';
        }
        if (url === 'bunny://anniversary') {
            var anniStart = new Date(CONFIG.START_DATE);
            var anniNow = new Date();
            var anniDiff = anniNow - anniStart;
            var anniDays = Math.floor(anniDiff / 86400000);
            var anniHours = Math.floor((anniDiff % 86400000) / 3600000);
            var anniMins = Math.floor((anniDiff % 3600000) / 60000);
            var anniSecs = Math.floor((anniDiff % 60000) / 1000);

            var anniDefaultText = '在虚拟纪元的曙光中，兔可可王国从一片数字草原上崛起。这不是现实中的城市，而是一座由爱与想象构筑的永恒之国。\n兔可可是这个王国的灵魂化身——一位超越了现实边界的安哥拉兔，从像素中诞生，在数据中成长，最终成为万民爱戴的永恒市长。\n每一栋建筑都是一段记忆，每一位市民都是一个故事，而兔可可的温柔与柔软绒毛，是这座虚拟王国最真实的魔法。';

            var anniSavedContent = safeGetItem('bcos_anniversary_content', '');
            var anniDisplayContent = _bcosEggState.eggTriggered && anniSavedContent ? anniSavedContent : anniDefaultText;

            var anniMilestonesHTML = MILESTONES.map(function(m) {
                var md = new Date(anniStart.getTime() + m.days * 86400000);
                var mdStr = md.getFullYear() + '/' + String(md.getMonth() + 1).padStart(2, '0') + '/' + String(md.getDate()).padStart(2, '0');
                var reached = anniDays >= m.days;
                var remain = m.days - anniDays;
                return '<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,.05);">' +
                    '<div style="width:8px;height:8px;border-radius:50%;background:' + (reached ? '#00ff41' : '#333') + ';flex-shrink:0;"></div>' +
                    '<div style="flex:1;">' +
                    '<div style="color:' + (reached ? '#00ff41' : '#aaa') + ';font-size:11px;">' + m.label + '</div>' +
                    '<div style="color:#666;font-size:10px;">' + mdStr + '</div>' +
                    '</div>' +
                    '<div style="font-size:10px;color:' + (reached ? '#00ff41' : '#666') + ';">' + (reached ? '✅' : remain + ' 天') + '</div>' +
                    '</div>';
            }).join('');

            var anniNext = MILESTONES.find(function(m) { return anniDays < m.days; });
            var anniNextHTML = '';
            if (anniNext) {
                var nd = new Date(anniStart.getTime() + anniNext.days * 86400000);
                var nr = anniNext.days - anniDays;
                anniNextHTML = '<div style="background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.3);border-radius:8px;padding:.6rem;margin:.5rem 0;text-align:center;">' +
                    '<div style="color:#888;font-size:10px;">下一个纪念日</div>' +
                    '<div style="color:#FF6B9D;font-size:13px;font-weight:bold;margin:.2rem 0;">' + anniNext.label + '</div>' +
                    '<div style="color:#666;font-size:10px;">' + nd.getFullYear() + '/' + String(nd.getMonth() + 1).padStart(2, '0') + '/' + String(nd.getDate()).padStart(2, '0') + '</div>' +
                    '<div style="color:#00ff41;font-size:12px;font-weight:bold;margin-top:.2rem;">还有 ' + nr + ' 天</div>' +
                    '</div>';
            } else {
                anniNextHTML = '<div style="background:rgba(0,255,65,.1);border:1px solid rgba(0,255,65,.3);border-radius:8px;padding:.6rem;text-align:center;">' +
                    '<div style="color:#00ff41;font-size:13px;font-weight:bold;">🏆 所有里程碑已达成！</div>' +
                    '</div>';
            }

            var anniEditBtn = _bcosEggState.eggTriggered ?
                '<button onclick="_bcosEditAnniversary()" style="background:#FF6B9D;color:#fff;border:none;padding:.4rem 1rem;border-radius:4px;cursor:pointer;font-size:11px;margin-top:.5rem;">✏️ 编辑纪念日内容</button>' : '';

            var anniContentHTML = _bcosEscape(anniDisplayContent).replace(/\n/g, '<br>');

            return '<div style="font-family:sans-serif;padding:1.5rem;background:linear-gradient(135deg,#1a1a2e,#16213E);color:#e0e0e0;min-height:100%;">' +
                '<h1 style="color:#FF6B9D;font-size:1.4rem;text-align:center;margin-bottom:.5rem;">💕 兔可可纪念日</h1>' +
                '<div style="text-align:center;margin:1rem 0;">' +
                '<div style="color:#888;font-size:11px;margin-bottom:.3rem;">🐰 兔可可已经到来</div>' +
                '<div id="bcos-anni-days" style="font-size:2.5rem;font-weight:800;color:#00ff41;line-height:1;">' + anniDays + '</div>' +
                '<div style="color:#888;font-size:.8rem;">天</div>' +
                '<div id="bcos-anni-time" style="font-size:1rem;font-weight:700;color:#a78bfa;margin-top:.5rem;">' + anniHours + ' 时 ' + anniMins + ' 分 ' + anniSecs + ' 秒</div>' +
                '<div style="color:#666;font-size:.7rem;margin-top:.3rem;">起始日期：2024/03/12</div>' +
                '</div>' +
                anniNextHTML +
                '<div style="background:rgba(255,255,255,.05);border-radius:8px;padding:.8rem;margin:.5rem 0;">' +
                '<div style="color:#FF6B9D;font-size:12px;font-weight:bold;margin-bottom:.5rem;">🎯 里程碑</div>' +
                anniMilestonesHTML +
                '</div>' +
                '<div style="background:rgba(255,255,255,.05);border-radius:8px;padding:.8rem;margin:.5rem 0;">' +
                '<div style="color:#FF6B9D;font-size:12px;font-weight:bold;margin-bottom:.5rem;">📖 兔可可王国传承</div>' +
                '<div id="bcos-anni-content" style="color:#aaa;font-size:11px;line-height:1.8;">' + anniContentHTML + '</div>' +
                anniEditBtn +
                '</div>' +
                '<div style="text-align:center;color:#666;font-size:.65rem;margin-top:1rem;">💕 Bunny Kingdom Anniversary | bcos ' + _BCOS_VER + '</div>' +
                '</div>';
        }
        return _bcosGetDefaultBrowserContent();
    }
    function _bcosGetDefaultBrowserContent() {
        return '<div style="text-align:center;padding:2rem;font-family:sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213E);color:#fff;min-height:100%;">' +
            '<h1 style="color:#FF6B9D;font-size:2rem;margin-bottom:.5rem;">🐰 Bunny Kingdom 🐰</h1>' +
            '<p style="color:#a78bfa;font-size:1.1rem;">Welcome to the Angora Rabbit Kingdom</p>' +
            '<div style="background:rgba(255,255,255,.1);border-radius:8px;padding:1rem;margin:1rem auto;max-width:300px;">' +
            '<p style="color:#00ff41;">A magical place where bunnies roam free</p>' +
            '<p style="color:#ffaa00;">Established: 2014</p>' +
            '<p style="color:#00aaff;">Population: 177 bunnies</p>' +
            '</div>' +
            '<p style="color:#888;font-size:.8rem;">Powered by bcos ' + _BCOS_VER + '</p>' +
            '</div>';
    }
    function _bcosGetDefaultReadme() {
        return '<div style="font-family:sans-serif;text-align:center;padding:1.5rem;color:#e0e0e0;background:linear-gradient(135deg,#0d1117,#161b22);min-height:100%;">' +
            '<h1 style="color:#FF6B9D;font-size:1.6rem;margin-bottom:.3rem;">Hi 🐰, I\'m CanguroMIO</h1>' +
            '<h3 style="color:#a78bfa;font-size:.85rem;font-weight:normal;line-height:1.6;margin-bottom:1rem;">🐰2024.3.12<br>有一只英系双血统安哥拉兔 | 英系の二重血統のアンゴラウサギ | A British-derived Angora rabbit with dual pedigree<br>兔可可 | CoCo | ココ |<br>它的铲屎官 | Caretaker | お世話係です</h3>' +
            '<div style="background:rgba(255,255,255,.06);border-radius:8px;padding:.8rem;margin:.5rem auto;max-width:280px;">' +
            '<p style="color:#00ff41;font-size:.75rem;">👁️ Profile views: loading...</p>' +
            '<p style="color:#ffaa00;font-size:.75rem;">🏆 GitHub trophies: loading...</p>' +
            '<p style="color:#00aaff;font-size:.75rem;">🐦 Twitter: @menglolitabd</p>' +
            '</div>' +
            '<h3 style="color:#FF6B9D;font-size:.9rem;margin:.8rem 0 .3rem;">Connect with me:</h3>' +
            '<p style="color:#00aaff;font-size:.75rem;">🐦 Twitter @menglolitabd</p>' +
            '<h3 style="color:#FF6B9D;font-size:.9rem;margin:.8rem 0 .3rem;">Languages and Tools:</h3>' +
            '<div style="display:flex;flex-wrap:wrap;gap:.3rem;justify-content:center;max-width:300px;margin:0 auto .8rem;">' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#58a6ff;">Arduino</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#ff9900;">AWS</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#008ad7;">Azure</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#4eaa25;">Bash</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#178600;">C#</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#2496ed;">Docker</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#512bd4;">.NET</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#4285f4;">GCP</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#f05032;">Git</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#e34f26;">HTML5</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#000;">IFTTT</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#fcc624;">Linux</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#4479a1;">MySQL</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#777bb4;">PHP</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#3776ab;">Python</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#ee4c2c;">PyTorch</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#f7b500;">Sketch</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#f05138;">Swift</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#0e1128;">Unreal</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#42b883;">Vue.js</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#000;">wxWidgets</span>' +
            '<span style="background:#1a1a2e;border:1px solid #333;border-radius:3px;padding:.15rem .4rem;font-size:.65rem;color:#3498db;">Xamarin</span>' +
            '</div>' +
            '<p style="color:#888;font-size:.65rem;margin-top:.8rem;">📄 GitHub Stats: 177 repos | ⭐ Total stars | 📊 Top languages</p>' +
            '<p style="color:#666;font-size:.6rem;margin-top:.3rem;">Source: github.com/kissggj123 | bcos ' + _BCOS_VER + '</p>' +
            '</div>';
    }
    function _bcosGetEggReadme() {
        // Dynamically extract real page elements from document.body
        var themeCards = [];
        document.querySelectorAll('.theme-card, [onclick*="setTheme"]').forEach(function(el) {
            var txt = el.textContent.trim().replace(/\s+/g, ' ');
            if (txt && txt.length < 30 && themeCards.indexOf(txt) === -1) themeCards.push(txt);
        });
        if (themeCards.length === 0) {
            themeCards = ['棉花糖兔','森林兔窝','海洋蓝','星空紫','赛博金','日落橙','薄荷绿','玫瑰金','极光绿','银河紫','糖果粉','矩阵绿'];
        }

        var navItems = [];
        document.querySelectorAll('.sidebar .nav-item, .bottom-nav .nav-item').forEach(function(el) {
            var txt = el.textContent.trim().replace(/\s+/g, ' ');
            if (txt && navItems.indexOf(txt) === -1) navItems.push(txt);
        });
        if (navItems.length === 0) {
            navItems = ['🏠 首页', '🎲 大富翁', '💕 纪念日', '⚙️ 设置', '📜 日志', '🖥️ bcos终端', '🖥️ bcos桌面'];
        }

        var prefTitles = [];
        document.querySelectorAll('#view-settings .card-title, #view-settings label').forEach(function(el) {
            var txt = el.textContent.trim().replace(/\s+/g, ' ');
            if (txt && txt.length < 40 && prefTitles.indexOf(txt) === -1) prefTitles.push(txt);
        });

        var themeGridHtml = themeCards.map(function(t) {
            return '<div class="item"><label>主题皮肤卡片</label><span class="node-val">' + _bcosEscape(t) + '</span></div>';
        }).join('\n        ');

        var navGridHtml = navItems.map(function(n) {
            return '<div class="item"><label>导航菜单选项</label><span class="node-val">' + _bcosEscape(n) + '</span></div>';
        }).join('\n        ');

        var prefGridHtml = (prefTitles.length > 0 ? prefTitles : ['⚙️ 偏好设置', '🎨 主题选择', '字体大小缩放', '萝卜跟随光标']).map(function(p) {
            return '<div class="item"><label>设置与偏好项</label><span class="node-val">' + _bcosEscape(p) + '</span></div>';
        }).join('\n        ');

        return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <title>兔可可王国 🐰 | Bunny CC DevTools Inspector</title>\n  <style>\n    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:0;line-height:1.6;}\n    header{background:linear-gradient(135deg,#FF6B9D 0%,#a78bfa 100%);color:#fff;padding:1.2rem;text-align:center;box-shadow:0 4px 20px rgba(255,107,157,0.3);}\n    h1{margin:0;font-size:1.8rem;font-weight:800;letter-spacing:1px;}\n    .sub{font-size:.85rem;opacity:.95;margin-top:.3rem;}\n    nav{background:#161b22;border-bottom:1px solid #30363d;padding:.6rem;display:flex;justify-content:center;gap:.6rem;flex-wrap:wrap;}\n    .container{max-width:680px;margin:1.2rem auto;padding:0 1rem;}\n    .card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:1.2rem;margin-bottom:1.2rem;box-shadow:0 8px 24px rgba(0,0,0,0.3);}\n    .card-title{color:#FF6B9D;font-size:1.1rem;margin-top:0;margin-bottom:.8rem;border-bottom:1px solid rgba(255,107,157,0.2);padding-bottom:.4rem;display:flex;align-items:center;gap:.5rem;}\n    .badge{background:rgba(0,255,65,0.15);color:#00ff41;font-size:.75rem;padding:.2rem .5rem;border-radius:20px;font-weight:bold;border:1px solid rgba(0,255,65,0.3);}\n    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem;}\n    .item{background:rgba(255,255,255,0.03);border:1px solid #30363d;padding:.6rem .8rem;border-radius:8px;font-size:.85rem;}\n    .item label{display:block;color:#8b949e;font-size:.75rem;margin-bottom:.2rem;}\n    .node-val{color:#e6edf3;font-weight:600;}\n    footer{text-align:center;padding:1.5rem;color:#8b949e;font-size:.8rem;border-top:1px solid #30363d;}\n  </style>\n</head>\n<body>\n  <header>\n    <h1>🐰 兔可可王国</h1>\n    <div class="sub">BunnyBot 大富翁 | 环形岛屿 · 全功能地产交易 · 智能AI引擎 · 资产清算救济</div>\n  </header>\n  \n  <main class="container">\n    <section class="card">\n      <h2 class="card-title">🧭 侧边栏与导航菜单节点</h2>\n      <div class="grid">\n        ' + navGridHtml + '\n      </div>\n    </section>\n\n    <section class="card">\n      <h2 class="card-title">🎨 主题选择选项节点</h2>\n      <div class="grid">\n        ' + themeGridHtml + '\n      </div>\n    </section>\n\n    <section class="card">\n      <h2 class="card-title">⚙️ 偏好设置选项节点</h2>\n      <div class="grid">\n        ' + prefGridHtml + '\n      </div>\n    </section>\n\n    <section class="card">\n      <h2 class="card-title">🐰 棉花糖兔个人资料 <span class="badge">英系双血统安哥拉兔</span></h2>\n      <div class="grid">\n        <div class="item"><label>主要称呼</label><span class="node-val">兔可可 | CoCo | ココ</span></div>\n        <div class="item"><label>居住地点</label><span class="node-val">扎根上海</span></div>\n        <div class="item"><label>守护铲屎官</label><span class="node-val">Caretaker | お世話係です</span></div>\n        <div class="item"><label>起始日期</label><span class="node-val">2024/03/12</span></div>\n      </div>\n      <p style="margin-top:.8rem;font-size:.85rem;color:#8b949e;">每一天都是值得纪念的日子。在虚拟纪元中建造属于你的兔可可王国。</p>\n    </section>\n\n    <section class="card">\n      <h2 class="card-title">🎲 大富翁核心玩法与功能节点</h2>\n      <div class="grid">\n        <div class="item"><label>地图模式</label><span class="node-val">环形岛屿 · 6区域1248格超大地图</span></div>\n        <div class="item"><label>地产交易</label><span class="node-val">全功能地产交易系统 (地产+卡牌+载具+现金)</span></div>\n        <div class="item"><label>AI 智能</label><span class="node-val">智能 AI 引擎 (集套打压与抢拍评估)</span></div>\n        <div class="item"><label>清算救济</label><span class="node-val">阶梯式资产清算救济 (股票/拆房/抵押/载具)</span></div>\n        <div class="item"><label>卡牌系统</label><span class="node-val">4张强制移动卡牌 + 预警护盾 + 镜像反射</span></div>\n        <div class="item"><label>特色玩法</label><span class="node-val">赌场老虎机与轮盘 + 股市做多做空</span></div>\n      </div>\n    </section>\n\n    <section class="card">\n      <h2 class="card-title">ℹ️ 关于作者与系统版本节点</h2>\n      <p style="font-size:.85rem;margin:.3rem 0;"><strong>兔可可之城</strong> v7.8.3.9385 | 大富翁王国扩展版</p>\n      <p style="font-size:.8rem;color:#8b949e;margin:0;">作者：CanguroMIO | kissggj123 | Powered by Bunny CC</p>\n    </section>\n  </main>\n\n  <footer>\n    <p>BunnyBot 大富翁 v7.8.3.9385 | 环形岛屿 · 全功能地产交易 · 智能AI引擎 · 资产清算救济</p>\n    <p>© CanguroMIO | kissggj123 | 兔可可纪念日 2024/03/12</p>\n  </footer>\n</body>\n</html>';
    }
    var _bcosEggReplacements = [];
    function _bcosExtractDiffRules(defaultHtml, currentHtml) {
        if (!defaultHtml || !currentHtml || defaultHtml === currentHtml) return [];
        try {
            var d1 = document.createElement('div'); d1.innerHTML = defaultHtml;
            var d2 = document.createElement('div'); d2.innerHTML = currentHtml;
            var w1 = document.createTreeWalker(d1, NodeFilter.SHOW_TEXT, null, false);
            var w2 = document.createTreeWalker(d2, NodeFilter.SHOW_TEXT, null, false);
            var t1 = [], t2 = [];
            while (w1.nextNode()) { var txt = w1.currentNode.textContent.trim(); if (txt) t1.push(txt); }
            while (w2.nextNode()) { var txt = w2.currentNode.textContent.trim(); if (txt) t2.push(txt); }
            var rules = [];
            for (var i = 0; i < Math.min(t1.length, t2.length); i++) {
                if (t1[i] && t2[i] && t1[i] !== t2[i]) {
                    rules.push({ find: t1[i], replace: t2[i], exact: true });
                }
            }
            return rules;
        } catch(e) { return []; }
    }
    function _bcosEggPreview(html) {
        _bcosBrowserHTML = html;
        _bcosBrowserCurrentURL = 'bunny://live-preview';
        var _urlBar = document.getElementById('bcos-url-bar');
        if (_urlBar) _urlBar.textContent = _bcosBrowserCurrentURL;
        _bcosBrowserRefresh();
        if (!_bcos.wins['browser']) _bcosOpenApp('browser');
        else _bcosFocusWin('browser');
        // Add "apply to real page" button to browser view
        setTimeout(function() {
            var existingBar = document.getElementById('bcos-egg-applybar');
            if (existingBar) existingBar.remove();
            var view = document.getElementById('bcos-browser-view');
            if (view && _bcos.wins['browser']) {
                var applyBar = document.createElement('div');
                applyBar.id = 'bcos-egg-applybar';
                applyBar.style.cssText = 'position:sticky;bottom:0;left:0;right:0;background:rgba(26,26,46,.95);border-top:1px solid #FF6B9D;padding:.4rem;text-align:center;z-index:100;';
                applyBar.innerHTML = '<button onclick="_bcosEggApplyReal()" style="background:#FF6B9D;color:#fff;border:none;padding:.3rem .8rem;border-radius:4px;cursor:pointer;font-size:11px;font-family:sans-serif;">✨ 应用到真实页面</button>';
                view.appendChild(applyBar);
            }
        }, 100);
    }
    function _bcosEggApplyReal() {
        // Auto-pull find/replace input values if present
        var findInput = document.getElementById('bcos-te-find');
        var replaceInput = document.getElementById('bcos-te-replace');
        if (findInput && findInput.value.trim()) {
            var f = findInput.value.trim();
            var r = replaceInput ? replaceInput.value : '';
            if (!_bcosEggReplacements.some(function(rule) { return rule.find === f; })) {
                _bcosEggReplacements.push({ find: f, replace: r });
            }
        }
        // Auto-extract diff rules between default pseudo-code and current texteditor content / browser preview
        var ta = document.getElementById('bcos-te-textarea');
        var currentCode = (ta && ta.value) ? ta.value : (_bcosBrowserHTML || '');
        var diffRules = _bcosExtractDiffRules(_bcosGetEggReadme(), currentCode);
        diffRules.forEach(function(dr) {
            if (!_bcosEggReplacements.some(function(rule) { return rule.find === dr.find; })) {
                _bcosEggReplacements.push(dr);
            }
        });

        if (_bcosEggReplacements.length === 0) {
            alert('没有检测到文本修改或替换规则。请在伪代码中直接修改任意文字，或使用查找/替换框。');
            return;
        }
        let count = 0;
        const bcosOverlay = document.getElementById('bcos-overlay');
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                // Skip nodes inside bcos overlay to avoid modifying terminal/browser UI
                let parent = node.parentElement;
                while (parent) {
                    if (parent === bcosOverlay) return NodeFilter.FILTER_REJECT;
                    parent = parent.parentElement;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }, null);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function(node) {
            let text = node.textContent;
            let trimmed = text.trim();
            let changed = false;
            _bcosEggReplacements.forEach(function(r) {
                if (!r.find) return;
                // Priority 1: Full exact text node match (prevents accidental sub-word replacement)
                if (trimmed === r.find) {
                    text = text.replace(trimmed, r.replace);
                    changed = true;
                }
                // Priority 2: Substring match (with phrase protection for compound terms like "偏好设置")
                else if (!r.exact && text.indexOf(r.find) !== -1) {
                    if (r.find === '设置' && (text.indexOf('偏好设置') !== -1 || text.indexOf('系统设置') !== -1)) {
                        return; // Protect compound phrases from accidental single-word replacement
                    }
                    text = text.split(r.find).join(r.replace);
                    changed = true;
                }
            });
            if (changed) { node.textContent = text; count++; }
        });
        // Also replace in input values and attributes
        document.querySelectorAll('[placeholder], [title], [aria-label]').forEach(function(el) {
            if (bcosOverlay && bcosOverlay.contains(el)) return;
            _bcosEggReplacements.forEach(function(r) {
                if (!r.find) return;
                if (el.placeholder && el.placeholder.indexOf(r.find) !== -1) {
                    el.placeholder = el.placeholder.split(r.find).join(r.replace);
                }
                if (el.title && el.title.indexOf(r.find) !== -1) {
                    el.title = el.title.split(r.find).join(r.replace);
                }
            });
        });
        alert('已成功应用到真实页面！更新了 ' + count + ' 个 DOM 文本节点。\n\n刷新页面可恢复原始内容。');
        // Close bcos browser & overlay to show real page
        if (_bcos.wins['browser']) _bcosCloseWin('browser');
        closeBcosOS();
    }
    function _bcosInitMeFolder() {
        if (!_bcosFS.me.children.readme_md && !_bcosFS.me.children['readme.md']) {
            _bcosFS.me.children['readme.md'] = { type: 'file', content: _bcosGetDefaultReadme() };
        }
        if (!_bcosFS.me.children['anniversary.txt']) {
            _bcosFS.me.children['anniversary.txt'] = { type: 'file', get content() { return _bcosGenerateAnniversaryText(); } };
        }
        if (!_bcosFS['anniversary.txt']) {
            _bcosFS['anniversary.txt'] = { type: 'file', get content() { return _bcosGenerateAnniversaryText(); } };
        }
    }
    function _bcosRenderBrowser(content) {
        content.style.padding = '0';
        if (!_bcosBrowserHTML) _bcosBrowserHTML = _bcosGetDefaultBrowserContent();
        var bookmarksBar = _bcosBookmarks.map(function(bm) {
            return '<button class="bcos-bm-btn" data-url="' + bm.url + '" data-type="' + bm.type + '" style="background:#1a1a1a;border:1px solid #333;color:#aaa;cursor:pointer;font-size:10px;padding:.15rem .35rem;border-radius:3px;white-space:nowrap;transition:all .15s;" onmouseover="this.style.background=\'#2a2a2a\';this.style.color=\'#fff\';" onmouseout="this.style.background=\'#1a1a1a\';this.style.color=\'#aaa\';" onclick="_bcosBrowserNavigate(\'' + bm.url + '\',\'' + bm.type + '\')">' + bm.name + '</button>';
        }).join('');
        content.innerHTML = '<div style="background:#2a2a2a;padding:.3rem .5rem;font-size:11px;color:#888;border-bottom:1px solid #333;display:flex;align-items:center;gap:.3rem;">' +
            '<span style="color:#00ff41;">🔒</span><span id="bcos-url-bar" style="flex:1;background:#1a1a1a;padding:.2rem .4rem;border-radius:3px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _bcosBrowserCurrentURL + '</span>' +
            '<button onclick="_bcosBrowserRefresh()" style="background:#1a1a1a;border:1px solid #333;color:#888;cursor:pointer;font-size:11px;padding:.1rem .3rem;border-radius:3px;">⟳</button>' +
            '</div>' +
            '<div style="background:#222;padding:.2rem .3rem;border-bottom:1px solid #333;display:flex;gap:.2rem;overflow-x:auto;flex-wrap:nowrap;">' + bookmarksBar + '</div>' +
            '<div id="bcos-browser-view" style="height:calc(100% - 56px);overflow:auto;"></div>';
        const view = document.getElementById('bcos-browser-view');
        if (view) {
            view.innerHTML = _bcosBrowserHTML;
            // Intercept link clicks to prevent file:// navigation
            view.addEventListener('click', function(e) {
                var link = e.target.closest('a');
                if (!link) return;
                var href = link.getAttribute('href');
                if (!href || href === '#') { e.preventDefault(); return; }
                if (href.indexOf('bunny://') === 0) {
                    e.preventDefault();
                    _bcosBrowserNavigate(href, 'internal');
                } else if (href.indexOf('http://') !== 0 && href.indexOf('https://') !== 0 && href.indexOf('mailto:') !== 0) {
                    // Block relative/file:// links
                    e.preventDefault();
                }
            });
        }
    }
    var _bcosAnniversaryTimer = null;
    function _bcosBrowserNavigate(url, type) {
        if (_bcosAnniversaryTimer) { clearInterval(_bcosAnniversaryTimer); _bcosAnniversaryTimer = null; }
        var oldApplyBar = document.getElementById('bcos-egg-applybar');
        if (oldApplyBar) oldApplyBar.remove();
        _bcosBrowserCurrentURL = url;
        var urlBar = document.getElementById('bcos-url-bar');
        if (urlBar) urlBar.textContent = url;
        if (url === 'bunny://kingdom') {
            _bcosBrowserHTML = _bcosGetDefaultBrowserContent();
        } else {
            _bcosBrowserHTML = _bcosGetBookmarkPage(url);
        }
        _bcosBrowserRefresh();
        if (url === 'bunny://anniversary') _bcosStartAnniversaryTimer();
    }
    function _bcosStartAnniversaryTimer() {
        if (_bcosAnniversaryTimer) clearInterval(_bcosAnniversaryTimer);
        _bcosAnniversaryTimer = setInterval(function() {
            var daysEl = document.getElementById('bcos-anni-days');
            if (!daysEl) { clearInterval(_bcosAnniversaryTimer); _bcosAnniversaryTimer = null; return; }
            var start = new Date(CONFIG.START_DATE);
            var now = new Date();
            var diff = now - start;
            var d = Math.floor(diff / 86400000);
            var h = Math.floor((diff % 86400000) / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            daysEl.textContent = d;
            var timeEl = document.getElementById('bcos-anni-time');
            if (timeEl) timeEl.textContent = h + ' 时 ' + m + ' 分 ' + s + ' 秒';
        }, 1000);
    }
    function _bcosEditAnniversary() {
        var current = safeGetItem('bcos_anniversary_content', '');
        if (!current) {
            current = '在虚拟纪元的曙光中，兔可可王国从一片数字草原上崛起。这不是现实中的城市，而是一座由爱与想象构筑的永恒之国。\n兔可可是这个王国的灵魂化身——一位超越了现实边界的安哥拉兔，从像素中诞生，在数据中成长，最终成为万民爱戴的永恒市长。\n每一栋建筑都是一段记忆，每一位市民都是一个故事，而兔可可的温柔与柔软绒毛，是这座虚拟王国最真实的魔法。';
        }
        var winId = 'bcos-win-anni-edit';
        if (document.getElementById(winId)) {
            var ew = document.getElementById(winId);
            ew.style.zIndex = ++_bcos.winZ;
            document.querySelectorAll('.bcos-window').forEach(function(w){ w.classList.remove('active-window'); });
            ew.classList.add('active-window');
            return;
        }
        var container = document.getElementById('bcos-windows');
        if (!container) return;
        var win = document.createElement('div');
        win.className = 'bcos-window active-window'; win.id = winId; win.style.zIndex = ++_bcos.winZ;
        var isMobile = window.innerWidth <= 768;
        var winW = isMobile ? Math.min(380, window.innerWidth - 12) : 380;
        var winH = isMobile ? Math.min(320, window.innerHeight - 80) : 320;
        var cx = isMobile ? 6 : Math.max(10, Math.min(80+Math.random()*60, window.innerWidth - winW - 20));
        var cy = isMobile ? 24 : Math.max(10, Math.min(50+Math.random()*40, window.innerHeight - winH - 60));
        win.style.cssText += 'left:0;top:0;width:' + winW + 'px;height:' + winH + 'px;transform:translate3d(' + cx + 'px,' + cy + 'px,0);';
        win._bcosTX = cx; win._bcosTY = cy;
        win._bcosOrigW = winW; win._bcosOrigH = winH;
        win.innerHTML = '<div class="bcos-window-titlebar" onmousedown="_bcosDragStart(\'' + winId + '\',event)" ondblclick="_bcosToggleMaximize(\'' + winId + '\',event)" ontouchstart="_bcosTouchDragStart(\'' + winId + '\',event)"><div class="bcos-window-controls"><button class="bcos-window-btn bcos-window-close" title="关闭" ontouchstart="event.stopPropagation(); event.preventDefault(); _bcosCloseCatWin(\'' + winId + '\')" onmousedown="event.stopPropagation(); _bcosCloseCatWin(\'' + winId + '\')" onclick="event.stopPropagation(); _bcosCloseCatWin(\'' + winId + '\')"></button></div><span class="bcos-window-title">✏️ 编辑纪念日内容</span><div style="width:24px;"></div></div>' +
            '<div class="bcos-window-content" style="padding:.5rem;display:flex;flex-direction:column;height:calc(100% - 32px);">' +
            '<textarea id="bcos-anni-edit-textarea" style="flex:1;background:#1a1a2e;color:#e0e0e0;border:1px solid #333;border-radius:4px;padding:.5rem;font-size:12px;line-height:1.6;resize:none;outline:none;font-family:sans-serif;">' + _bcosEscape(current) + '</textarea>' +
            '<div style="display:flex;gap:.4rem;margin-top:.4rem;justify-content:flex-end;">' +
            '<button onclick="_bcosSaveAnniversary()" style="background:var(--accent,#FF6B9D);color:#fff;border:none;padding:.3rem .8rem;border-radius:4px;cursor:pointer;font-size:11px;">保存</button>' +
            '<button onclick="_bcosCloseCatWin(\'' + winId + '\')" style="background:#333;color:#aaa;border:1px solid #444;padding:.3rem .8rem;border-radius:4px;cursor:pointer;font-size:11px;">取消</button>' +
            '</div></div>';
        container.appendChild(win);
        document.querySelectorAll('.bcos-window').forEach(function(w){ if (w !== win) w.classList.remove('active-window'); });
        win.addEventListener('mousedown', function() {
            win.style.zIndex = ++_bcos.winZ;
            document.querySelectorAll('.bcos-window').forEach(function(w){ w.classList.remove('active-window'); });
            win.classList.add('active-window');
        });
        win.addEventListener('touchstart', function() {
            win.style.zIndex = ++_bcos.winZ;
            document.querySelectorAll('.bcos-window').forEach(function(w){ w.classList.remove('active-window'); });
            win.classList.add('active-window');
        }, { passive: true });
    }
    function _bcosSaveAnniversary() {
        var ta = document.getElementById('bcos-anni-edit-textarea');
        if (!ta) return;
        var content = ta.value.trim();
        if (!content) { content = ''; }
        safeSetItem('bcos_anniversary_content', content);
        var win = document.getElementById('bcos-win-anni-edit');
        if (win) _bcosCloseCatWin('bcos-win-anni-edit');
        _bcosBrowserNavigate('bunny://anniversary', 'internal');
    }
    function _bcosBrowserRefresh() {
        const view = document.getElementById('bcos-browser-view');
        if (view) view.innerHTML = _bcosBrowserHTML || _bcosGetDefaultBrowserContent();
    }

    // === BCOS Anniversary App & Car Lockscreen System ===
    let _bcosAnniAppTimer = null;
    let _carLockTimer = null;
    let _carWakeLockObj = null;
    let _carFadeTimer = null;

    async function _carAcquireWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                _carWakeLockObj = await navigator.wakeLock.request('screen');
                _carWakeLockObj.addEventListener('release', () => { _carWakeLockObj = null; });
            } catch(e) {}
        }
    }

    function _bcosGetCustomAnniversaries() {
        try {
            return JSON.parse(safeGetItem('bcos_custom_anniversaries', '[]'));
        } catch(e) { return []; }
    }

    function _bcosSaveCustomAnniversaries(list) {
        safeSetItem('bcos_custom_anniversaries', JSON.stringify(list));
    }

    function _bcosAddCustomAnniversary(name, date, icon) {
        const list = _bcosGetCustomAnniversaries();
        list.push({ id: 'c_' + Date.now(), name, date, icon: icon || '💖' });
        _bcosSaveCustomAnniversaries(list);
    }

    function _bcosRemoveCustomAnniversary(target) {
        const list = _bcosGetCustomAnniversaries();
        const initialLen = list.length;
        const filtered = list.filter(item => item.id !== target && item.name.toLowerCase() !== target.toLowerCase());
        if (filtered.length !== initialLen) {
            _bcosSaveCustomAnniversaries(filtered);
            return true;
        }
        return false;
    }

    function _bcosGetAnniversaryData() {
        const start = new Date(CONFIG.START_DATE);
        const now = new Date();
        const diff = now - start;
        const days = Math.floor(diff / 86400000);
        const exactDays = (diff / 86400000).toFixed(3);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        const ms = Math.floor((diff % 1000) / 100);

        const mList = (typeof MILESTONES !== 'undefined' ? MILESTONES : [
            { days: 100, label: '100天纪念' },
            { days: 180, label: '180天纪念' },
            { days: 300, label: '300天纪念' },
            { days: 365, label: '一周年 (365天)' },
            { days: 500, label: '500天纪念' },
            { days: 730, label: '两周年 (730天)' },
            { days: 1000, label: '1000天纪念 (千日里程碑)' },
            { days: 1095, label: '三周年 (1095天)' },
            { days: 1461, label: '四周年 (1461天)' },
            { days: 1500, label: '1500天纪念' },
            { days: 1826, label: '五周年 (1826天)' },
            { days: 2000, label: '2000天纪念' },
            { days: 3652, label: '十周年 (3652天)' },
            { days: 10000, label: '10000天 (万日之约)' }
        ]).map(m => {
            const mDate = new Date(start.getTime() + m.days * 86400000);
            const reached = days >= m.days;
            const remainDays = m.days - days;
            const dateStr = formatDate(mDate);
            return { ...m, date: mDate, dateStr, reached, remainDays };
        });

        const nextMilestone = mList.find(m => !m.reached) || null;
        let nextRemainStr = '';
        let nextPercent = 100;
        if (nextMilestone) {
            const prevMilestone = [...mList].reverse().find(m => m.reached);
            const prevDays = prevMilestone ? prevMilestone.days : 0;
            const totalSpan = nextMilestone.days - prevDays;
            const curProgress = days - prevDays;
            nextPercent = Math.min(100, Math.max(0, Math.round((curProgress / totalSpan) * 100)));
            nextRemainStr = `还有 ${nextMilestone.remainDays} 天`;
        }

        const custom = _bcosGetCustomAnniversaries().map(c => {
            const cDate = new Date(c.date + ' 00:00:00');
            const cDiff = now - cDate;
            const isPast = cDiff >= 0;
            const cDays = Math.abs(Math.floor(cDiff / 86400000));
            return { ...c, isPast, daysDiff: cDays };
        });

        return {
            start, now, days, exactDays, hours, mins, secs, ms,
            milestones: mList, nextMilestone, nextRemainStr, nextPercent, custom
        };
    }

    function _bcosGenerateAnniversaryText() {
        const d = _bcosGetAnniversaryData();
        const lines = [
            '====================================================',
            '  🐰 兔可可王国 · 虚拟纪元纪念日守护系统 (bcos)',
            '====================================================',
            `起始日期: 2024/03/12 00:00:00 (上海)`,
            `已伴岁月: ${d.days} 天 ${d.hours} 时 ${d.mins} 分 ${d.secs} 秒 (${d.exactDays} 天)`,
            ''
        ];
        if (d.nextMilestone) {
            lines.push(`🎯 下一个里程碑: ${d.nextMilestone.label} (${d.nextMilestone.dateStr})`);
            lines.push(`   还有: ${d.nextMilestone.remainDays} 天 [达成进度: ${d.nextPercent}%]`);
        } else {
            lines.push('🏆 所有里程碑已全数达成！');
        }
        lines.push('');
        lines.push('── 历程里程碑成就树 ──');
        d.milestones.forEach(m => {
            const tag = m.reached ? '[✓ 已达成]' : '[  进行中]';
            const rem = m.reached ? '已达成' : `剩 ${m.remainDays} 天`;
            lines.push(`  ${tag} ${m.label.padEnd(20, ' ')} ${m.dateStr} (${rem})`);
        });
        if (d.custom.length > 0) {
            lines.push('');
            lines.push('── 自定义纪念日 ──');
            d.custom.forEach(c => {
                const rel = c.isPast ? `已过 ${c.daysDiff} 天` : `倒计时 ${c.daysDiff} 天`;
                lines.push(`  ${c.icon || '💖'} ${c.name}: ${c.date} (${rel})`);
            });
        }
        lines.push('====================================================');
        lines.push('💡 提示: 输入 \'car\' 立即启动车机全屏锁屏与屏保模式');
        return lines.join('\n');
    }


// ============================================================================
// BCOS Modern Anniversary App & Store Suite
// ============================================================================

// --- App Store & Custom App Persistence Helpers ---
