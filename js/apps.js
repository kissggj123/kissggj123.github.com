function _bcosRenderMeFolder(content) {
        _bcosInitMeFolder();
        content.style.padding = '0';
        content.innerHTML = '<div style="background:#1a1a1a;padding:.3rem;font-size:12px;color:#888;border-bottom:1px solid #333;">📁 /home/bunny/me</div><div id="bcos-me-list" style="overflow-y:auto;height:calc(100% - 30px);"></div>';
        const list = document.getElementById('bcos-me-list');
        const dt = _bcosGetDesktopTheme();
        const children = Object.keys(_bcosFS.me.children);
        if (children.length === 0) {
            list.innerHTML = '<div style="color:#666;padding:1rem;text-align:center;font-size:12px;">(empty folder)</div>';
        }
        children.forEach(name => {
            const child = _bcosFS.me.children[name];
            const item = document.createElement('div');
            item.className = 'bcos-file-item';
            const icon = child.type === 'dir' ? '📁' : '📄';
            item.innerHTML = '<span>' + icon + '</span><span class="bcos-file-name">' + _bcosEscape(name) + '</span><span class="bcos-file-meta">' + (child.type === 'dir' ? 'dir' : 'file') + '</span>';
            item.onclick = () => {
                if (child.type === 'file') {
                    if (name === 'edit.lock' || name === 'edit_lock') {
                        _bcosOpenEditLock(name);
                    } else {
                        _bcosTeOpenVfsFile(name, child, name);
                    }
                }
            };
            list.appendChild(item);
        });
        // Add text editor shortcut
        const teItem = document.createElement('div');
        teItem.className = 'bcos-file-item';
        teItem.innerHTML = '<span>' + dt.icons.editor + '</span><span class="bcos-file-name">texteditor</span><span class="bcos-file-meta">app</span>';
        teItem.onclick = () => _bcosOpenApp('texteditor');
        list.appendChild(teItem);
    }
    function _bcosOpenEditLock(name) {
        // Check if this is a user-created file (via terminal touch/mkdir) — show as normal file
        const file = _bcosFS.me.children[name];
        if (file && !file.systemCreated) {
            _bcosTeOpenVfsFile(name, file, name);
            return;
        }
        // System-created edit.lock shows garbage content (easter egg)
        const winId = 'bcos-win-editlock';
        if (document.getElementById(winId)) {
            const w = document.getElementById(winId);
            w.style.zIndex = ++_bcos.winZ;
            document.querySelectorAll('.bcos-window').forEach(win => win.classList.remove('active-window'));
            w.classList.add('active-window');
            return;
        }
        const container = document.getElementById('bcos-windows');
        if (!container) return;
        const win = document.createElement('div');
        win.className = 'bcos-window active-window'; win.id = winId; win.style.zIndex = ++_bcos.winZ;
        const isMobile = window.innerWidth <= 768;
        const winW = isMobile ? Math.min(360, window.innerWidth - 12) : 360;
        const winH = isMobile ? Math.min(240, window.innerHeight - 80) : 240;
        const cx = isMobile ? 6 : Math.max(10, Math.min(100+Math.random()*60, window.innerWidth - winW - 20));
        const cy = isMobile ? 24 : Math.max(10, Math.min(60+Math.random()*60, window.innerHeight - winH - 60));
        win.style.cssText += `left:0;top:0;width:${winW}px;height:${winH}px;transform:translate3d(${cx}px, ${cy}px, 0);`;
        win._bcosTX = cx; win._bcosTY = cy;
        win._bcosOrigW = winW; win._bcosOrigH = winH;
        const garbage = Array.from({length: 12}, () => Array.from({length: 32}, () => String.fromCharCode(33 + Math.floor(Math.random() * 94))).join('')).join('\n');
        win.innerHTML = `<div class="bcos-window-titlebar" onmousedown="_bcosDragStart('${winId}',event)" ontouchstart="_bcosTouchDragStart('${winId}',event)"><div class="bcos-window-controls"><button class="bcos-window-btn bcos-window-close" title="关闭" ontouchstart="event.stopPropagation(); event.preventDefault(); _bcosCloseCatWin('${winId}')" onmousedown="event.stopPropagation(); _bcosCloseCatWin('${winId}')" onclick="event.stopPropagation(); _bcosCloseCatWin('${winId}')"></button></div><span class="bcos-window-title">🔒 ${_bcosEscape(name)}</span><div style="width:24px;"></div></div><div class="bcos-window-content" style="padding:.5rem;font-family:monospace;font-size:10px;color:#f44;overflow:auto;word-break:break-all;">${_bcosEscape(garbage)}</div>`;
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

    // === Syntax highlighter for TextEditor ===
    function _bcosSyntaxHL(code, lang) {
        try {
        // Escape first
        var html = _bcosEscape(code);
        var tokens = [];
        // Protect function: extract matched content, replace with placeholder
        function protect(match, wrapper) {
            var idx = tokens.length;
            tokens.push(wrapper.replace('%s', match));
            return '\x00T' + idx + '\x00';
        }
        // Optimized single-pass keyword highlighter
        function highlightKeywords(html, keywords, color) {
            var pattern = '\\b(' + keywords.map(function(k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\b';
            return html.replace(new RegExp(pattern, 'g'), function(m) { return protect(m, '<span style="color:' + color + ';">%s</span>'); });
        }
        // Common string highlighting (shared by multiple languages)
        function highlightStrings(html) {
            html = html.replace(/(&#39;|')(.*?)(&#39;|')/g, function(m) { return protect(m, '<span style="color:#ce9178;">%s</span>'); });
            html = html.replace(/(&quot;|&#34;)(.*?)(&quot;|&#34;)/g, function(m) { return protect(m, '<span style="color:#ce9178;">%s</span>'); });
            return html;
        }
        // Common number highlighting
        function highlightNumbers(html) {
            return html.replace(/\b(\d+\.?\d*)\b/g, function(m) { return protect(m, '<span style="color:#b5cea8;">%s</span>'); });
        }
        if (lang === 'html') {
            // HTML comments
            html = html.replace(/&lt;!--[\s\S]*?--&gt;/g, function(m) { return protect(m, '<span style="color:#6a9955;">%s</span>'); });
            // Tags
            html = html.replace(/(&lt;\/?)([\w\-]+)/g, function(m, p1, p2) { return protect(p1, '<span style="color:#808080;">%s</span>') + protect(p2, '<span style="color:#569cd6;">%s</span>'); });
            // Attributes
            html = html.replace(/([\w\-]+)(=)(&quot;|&#34;|'|&#39;)/g, function(m, attr, eq, q) { return protect(attr, '<span style="color:#9cdcfe;">%s</span>') + protect(eq, '<span style="color:#d4d4d4;">%s</span>') + protect(q, '<span style="color:#ce9178;">%s</span>'); });
            // Attribute values
            html = html.replace(/(&quot;|&#34;)([^&]*?)(&quot;|&#34;)/g, function(m, q1, val, q2) { return protect(q1, '<span style="color:#ce9178;">%s</span>') + protect(val, '<span style="color:#ce9178;">%s</span>') + protect(q2, '<span style="color:#ce9178;">%s</span>'); });
        } else if (lang === 'js' || lang === 'json' || lang === 'ts') {
            // Comments
            html = html.replace(/\/\/[^\n]*/g, function(m) { return protect(m, '<span style="color:#6a9955;">%s</span>'); });
            html = html.replace(/\/\*[\s\S]*?\*\//g, function(m) { return protect(m, '<span style="color:#6a9955;">%s</span>'); });
            // Strings
            html = highlightStrings(html);
            // Template literals (backtick strings)
            html = html.replace(/`([^`]*)`/g, function(m) { return protect(m, '<span style="color:#ce9178;">%s</span>'); });
            // Keywords — single regex pass instead of loop
            var jsKw = lang === 'ts'
                ? ['var','let','const','function','return','if','else','for','while','do','switch','case','break','continue','new','delete','typeof','instanceof','in','of','this','class','extends','super','import','export','default','try','catch','finally','throw','async','await','yield','void','null','undefined','true','false','NaN','interface','type','enum','namespace','declare','abstract','readonly','as','is','keyof','never','unknown','any','string','number','boolean','symbol','bigint','public','private','protected','static','get','set']
                : ['var','let','const','function','return','if','else','for','while','do','switch','case','break','continue','new','delete','typeof','instanceof','in','of','this','class','extends','super','import','export','default','try','catch','finally','throw','async','await','yield','void','null','undefined','true','false','NaN'];
            html = highlightKeywords(html, jsKw, '#c586c0');
            // Numbers
            html = highlightNumbers(html);
            // Function calls
            html = html.replace(/([a-zA-Z_$][\w$]*)(\s*\()/g, function(m, name, paren) { return protect(name, '<span style="color:#dcdcaa;">%s</span>') + paren; });
        } else if (lang === 'css') {
            // Comments
            html = html.replace(/\/\*[\s\S]*?\*\//g, function(m) { return protect(m, '<span style="color:#6a9955;">%s</span>'); });
            // Selectors
            html = html.replace(/^([\.#]?[\w\-]+(?:\s*[>+~]\s*[\w\-]+)*)/gm, function(m) { return protect(m, '<span style="color:#d7ba7d;">%s</span>'); });
            // Properties
            html = html.replace(/^(\s+)([\w\-]+)(\s*:)/gm, function(m, sp, prop, colon) { return sp + protect(prop, '<span style="color:#9cdcfe;">%s</span>') + colon; });
            // Values
            html = html.replace(/:\s*([^;]+);/g, function(m, val) { return ': ' + protect(val, '<span style="color:#ce9178;">%s</span>') + ';'; });
            // At-rules
            html = html.replace(/^(@[\w\-]+)/gm, function(m) { return protect(m, '<span style="color:#c586c0;">%s</span>'); });
        } else if (lang === 'py') {
            // Comments
            html = html.replace(/#[^\n]*/g, function(m) { return protect(m, '<span style="color:#6a9955;">%s</span>'); });
            // Strings
            html = highlightStrings(html);
            // Triple-quoted strings
            html = html.replace(/(&#39;&#39;&#39;|&quot;&quot;&quot;)([\s\S]*?)\1/g, function(m) { return protect(m, '<span style="color:#ce9178;">%s</span>'); });
            // Keywords — single regex pass
            var pyKw = ['def','class','return','if','elif','else','for','while','break','continue','import','from','as','try','except','finally','raise','with','lambda','yield','global','nonlocal','pass','del','in','not','and','or','is','None','True','False','self','print','async','await','assert','async def'];
            html = highlightKeywords(html, pyKw, '#c586c0');
            // Numbers
            html = highlightNumbers(html);
            // Function definitions
            html = html.replace(/(def\s+)([\w]+)(\s*\()/g, function(m, kw, name, paren) { return kw + protect(name, '<span style="color:#dcdcaa;">%s</span>') + paren; });
        } else if (lang === 'sh') {
            // Comments
            html = html.replace(/#[^\n]*/g, function(m) { return protect(m, '<span style="color:#6a9955;">%s</span>'); });
            // Strings
            html = highlightStrings(html);
            // Keywords — single regex pass
            var shKw = ['if','then','else','elif','fi','for','do','done','while','case','esac','function','return','echo','export','local','read','unset','source','alias','exit','cd','ls','cat','grep','sed','awk','mkdir','rm','cp','mv','touch','chmod','chown','sudo','printf','test','set','shift','eval','exec','trap','wait','jobs','kill','bg','fg','nohup'];
            html = highlightKeywords(html, shKw, '#c586c0');
            // Variables ($VAR, ${VAR})
            html = html.replace(/(\$[a-zA-Z_]\w*)/g, function(m) { return protect(m, '<span style="color:#9cdcfe;">%s</span>'); });
            html = html.replace(/(\$\{[^}]+\})/g, function(m) { return protect(m, '<span style="color:#9cdcfe;">%s</span>'); });
        } else if (lang === 'md') {
            // Headers
            html = html.replace(/^(#{1,6}\s.+)$/gm, function(m) { return protect(m, '<span style="color:#569cd6;font-weight:bold;">%s</span>'); });
            // Bold
            html = html.replace(/\*\*(.+?)\*\*/g, function(m) { return protect(m, '<span style="color:#fff;font-weight:bold;">%s</span>'); });
            // Italic
            html = html.replace(/\*(.+?)\*/g, function(m) { return protect(m, '<span style="color:#dcdcaa;">%s</span>'); });
            // Links
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(m) { return protect(m, '<span style="color:#3794ff;">%s</span>'); });
            // Code
            html = html.replace(/`([^`]+)`/g, function(m) { return protect(m, '<span style="color:#ce9178;background:rgba(255,255,255,.05);">%s</span>'); });
            // List items
            html = html.replace(/^(\s*[\-\*]\s)/gm, function(m) { return protect(m, '<span style="color:#c586c0;">%s</span>'); });
        } else {
            // Generic: comments and strings
            html = html.replace(/\/\/[^\n]*/g, function(m) { return protect(m, '<span style="color:#6a9955;">%s</span>'); });
            html = html.replace(/(&#39;|')(.*?)(&#39;|')/g, function(m) { return protect(m, '<span style="color:#ce9178;">%s</span>'); });
            html = html.replace(/(&quot;|&#34;)(.*?)(&quot;|&#34;)/g, function(m) { return protect(m, '<span style="color:#ce9178;">%s</span>'); });
        }
        // Restore tokens
        html = html.replace(/\x00T(\d+)\x00/g, function(m, i) { return tokens[parseInt(i)]; });
        // Trailing newline fix
        if (code.endsWith('\n')) html += '\n';
        return html;
        } catch(e) { return _bcosEscape(code); }
    }

    // === Text Editor app ===

// ============================================================================
// macOS BCOS Code Studio Pro (Advanced Text & Code Editor)
// ============================================================================

let _bcosTeTabs = [];
let _bcosTeActiveId = null;
_bcosTeHlTimer = null;
let _bcosTeSplitMode = 'split'; // 'edit', 'split', 'preview'

function _bcosRenderTextEditor(content) {
    _bcosInitMeFolder();
    content.style.padding = '0';
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.background = '#141724';
    content.style.color = '#d4d4d4';

    // Initialize default tabs if empty
    if (_bcosTeTabs.length === 0) {
        const readmeContent = typeof _bcosGetDefaultReadme === 'function' ? _bcosGetDefaultReadme() : '# Welcome to BCOS\n\nEdit anything here.';
        _bcosTeTabs = [
            { id: 'tab_readme', name: 'readme.md', path: 'me/readme.md', content: readmeContent, dirty: false, lang: 'md' },
            { id: 'tab_script', name: 'cockpit_app.js', path: 'me/cockpit_app.js', content: '// 兔可可智能座舱扩展脚本\nconsole.log("Cockpit System Ready.");\n\nfunction getStatus() {\n    return { soc: "88%", driveMode: "Sport+", temp: 22 };\n}\n', dirty: false, lang: 'js' }
        ];
        _bcosTeActiveId = 'tab_readme';
    }

    content.innerHTML = `
        <div class="bcos-te-wrap" style="position:relative;">
            <!-- Tabs Bar -->
            <div class="bcos-te-tabs" id="bcos-te-tabs-bar"></div>

            <!-- Toolbar -->
            <div class="bcos-te-bar">
                <button class="bcos-te-btn" onclick="_bcosTeNewTab()" title="新建标签页">📄 新建</button>
                <button class="bcos-te-btn" onclick="_bcosTeOpenFilePrompt()" title="打开文件">📂 打开</button>
                <button class="bcos-te-btn" onclick="_bcosTeSaveActive()" title="保存到系统">💾 保存</button>
                <button class="bcos-te-btn" onclick="_bcosTeExportFile()" title="导出到本地电脑">⬇️ 导出</button>
                <label class="bcos-te-btn" style="cursor:pointer;" title="从电脑导入文件">
                    📤 导入
                    <input type="file" id="bcos-te-import-inp" multiple style="display:none;" onchange="_bcosTeImportFile(event)">
                </label>
                <div style="width:1px;height:16px;background:rgba(255,255,255,0.1);margin:0 2px;"></div>
                <button class="bcos-te-btn" onclick="_bcosTeToggleSplit()" id="bcos-te-split-btn" title="切换编辑/分栏/预览">👁️ 分栏预览</button>
                <button class="bcos-te-btn" onclick="_bcosTeToggleSearch()" title="查找与替换 (Ctrl+F)">🔍 查找</button>
                <button class="bcos-te-btn" onclick="_bcosTeFormatCode()" title="代码自动排版">🧹 排版</button>

                <div style="margin-left:auto;display:flex;align-items:center;gap:6px;">
                    <select id="bcos-te-lang-sel" class="bcos-te-btn" onchange="_bcosTeChangeLang(this.value)" style="background:#0d0f17;cursor:pointer;">
                        <option value="auto">🔍 Auto</option>
                        <option value="md">Markdown</option>
                        <option value="js">JavaScript</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="json">JSON</option>
                        <option value="py">Python</option>
                        <option value="sh">Shell</option>
                        <option value="text">Plain Text</option>
                    </select>
                    <span id="bcos-te-status-msg" style="font-size:11px;color:#00ff41;padding-right:6px;"></span>
                </div>
            </div>

            <!-- In-Editor Search & Replace Bar -->
            <div id="bcos-te-search-bar" style="display:none;padding:4px 8px;background:#0d111a;border-bottom:1px solid rgba(255,255,255,0.08);align-items:center;gap:6px;font-size:11px;">
                <span>🔍</span>
                <input type="text" id="bcos-te-find-inp" placeholder="查找..." style="background:#1e2433;border:1px solid #334155;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;width:120px;outline:none;" />
                <button class="bcos-te-btn" onclick="_bcosTeFind(1)">▼ 下一个</button>
                <button class="bcos-te-btn" onclick="_bcosTeFind(-1)">▲ 上一个</button>
                <span id="bcos-te-find-count" style="color:#94a3b8;font-size:10px;"></span>
                <span style="color:#64748b;">|</span>
                <input type="text" id="bcos-te-replace-inp" placeholder="替换为..." style="background:#1e2433;border:1px solid #334155;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;width:100px;outline:none;" />
                <button class="bcos-te-btn" onclick="_bcosTeReplace(false)">替换</button>
                <button class="bcos-te-btn" onclick="_bcosTeReplace(true)">全部替换</button>
                <button class="bcos-te-btn" onclick="_bcosTeToggleSearch()" style="margin-left:auto;color:#ef4444;">✕</button>
            </div>

            <!-- Main Editor Body with Split View -->
            <div class="bcos-te-body" id="bcos-te-body-area">
                <div id="bcos-te-editor-container" style="flex:1;display:flex;position:relative;overflow:hidden;height:100%;">
                    <div class="bcos-te-gutter" id="bcos-te-gutter">1</div>
                    <div style="position:relative;flex:1;overflow:hidden;height:100%;">
                        <pre class="bcos-te-highlight" id="bcos-te-highlight" aria-hidden="true"></pre>
                        <textarea class="bcos-te-textarea" id="bcos-te-textarea" placeholder="在此输入代码或文本..." spellcheck="false"></textarea>
                    </div>
                </div>
                <div class="bcos-te-preview-pane active" id="bcos-te-preview-pane"></div>
            </div>

            <!-- Status Bar -->
            <div class="bcos-te-statusbar">
                <span id="bcos-te-pos">行 1, 列 1</span>
                <div style="display:flex;gap:12px;">
                    <span id="bcos-te-length">0 字符 · 1 行</span>
                    <span>UTF-8</span>
                    <span id="bcos-te-lang-badge">Markdown</span>
                </div>
            </div>
        </div>
    `;

    _bcosTeRenderTabs();
    _bcosTeBindEvents();
    _bcosTeLoadActiveTab();

    // Drag & drop local files straight into the editor
    const wrapEl = content.querySelector('.bcos-te-wrap');
    if (wrapEl) {
        wrapEl.addEventListener('dragover', (ev) => {
            if (ev.dataTransfer && Array.from(ev.dataTransfer.types || []).indexOf('Files') >= 0) ev.preventDefault();
        });
        wrapEl.addEventListener('drop', (ev) => {
            if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
                ev.preventDefault();
                Array.from(ev.dataTransfer.files).forEach(f => _bcosTeReadLocalFile(f));
            }
        });
    }
}

function _bcosTeRenderTabs() {
    const tabsBar = document.getElementById('bcos-te-tabs-bar');
    if (!tabsBar) return;
    tabsBar.innerHTML = _bcosTeTabs.map(tab => {
        const isActive = tab.id === _bcosTeActiveId;
        return `
            <div class="bcos-te-tab ${isActive ? 'active' : ''}" onclick="_bcosTeSelectTab('${tab.id}')">
                <span>${_bcosEscape(tab.name)}${tab.dirty ? ' ●' : ''}</span>
                <span class="bcos-te-tab-close" onclick="_bcosTeCloseTab('${tab.id}', event)">✕</span>
            </div>
        `;
    }).join('') + '<button class="bcos-te-btn" onclick="_bcosTeNewTab()" style="margin:4px 8px;padding:2px 8px;font-size:12px;">+</button>';
}

function _bcosTeSelectTab(tabId) {
    _bcosTeSaveCurState();
    _bcosTeActiveId = tabId;
    _bcosTeRenderTabs();
    _bcosTeLoadActiveTab();
}

function _bcosTeSaveCurState() {
    const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
    const ta = document.getElementById('bcos-te-textarea');
    if (tab && ta) {
        tab.content = ta.value;
    }
}

function _bcosTeLoadActiveTab() {
    const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
    if (!tab) return;
    const ta = document.getElementById('bcos-te-textarea');
    const langSel = document.getElementById('bcos-te-lang-sel');
    const langBadge = document.getElementById('bcos-te-lang-badge');
    if (ta) {
        ta.value = tab.content;
    }
    if (langSel) langSel.value = tab.lang || 'auto';
    if (langBadge) langBadge.textContent = (tab.lang || 'text').toUpperCase();
    _bcosTeUpdateHighlight();
    _bcosTeUpdatePreview();
    _bcosTeUpdateStatus();
}

function _bcosTeLangFromName(name) {
    const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    const ext = m ? m[1] : '';
    const map = {
        md: 'md', markdown: 'md', js: 'js', mjs: 'js', cjs: 'js', ts: 'js', jsx: 'js', tsx: 'js',
        html: 'html', htm: 'html', xml: 'html', svg: 'html', css: 'css', json: 'json',
        py: 'py', sh: 'sh', bash: 'sh', zsh: 'sh', txt: 'text', log: 'text'
    };
    return map[ext] || 'text';
}

function _bcosTeNewTab(name, content, lang) {
    _bcosTeSaveCurState();
    const id = 'tab_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    if (!name) {
        let n = 1, cand = 'untitled.md';
        while (_bcosTeTabs.some(t => t.name === cand)) { n++; cand = 'untitled-' + n + '.md'; }
        name = cand;
    }
    const newTab = {
        id: id,
        name: name,
        path: 'me/' + name,
        content: content !== undefined ? content : '',
        dirty: false,
        lang: lang || _bcosTeLangFromName(name) || 'md'
    };
    _bcosTeTabs.push(newTab);
    _bcosTeActiveId = id;
    _bcosTeRenderTabs();
    _bcosTeLoadActiveTab();
    return newTab;
}

// Open (or focus) a file in Code Studio. Launches the window when needed and reuses an existing tab for the same path.
function _bcosTeOpenContent(name, content, opts) {
    opts = opts || {};
    const path = opts.path || ('me/' + name);
    _bcosOpenApp('texteditor');
    if (!document.getElementById('bcos-te-textarea')) {
        if (typeof showToast === 'function') showToast('⚠️ 请先进入 BCOS 桌面再打开文件');
        return false;
    }
    const existing = _bcosTeTabs.find(t => t.path === path);
    if (existing) {
        _bcosTeSaveCurState();
        if (opts.force || !existing.dirty) { existing.content = content; existing.dirty = false; }
        _bcosTeActiveId = existing.id;
        _bcosTeRenderTabs();
        _bcosTeLoadActiveTab();
    } else {
        const tab = _bcosTeNewTab(name, content, opts.lang);
        tab.path = path;
    }
    return true;
}

// Open a VFS file object ({type:'file', content}) from the "me" tree
function _bcosTeOpenVfsFile(name, file, relPath) {
    let text = '';
    try { text = String(file && file.content != null ? file.content : ''); } catch(e) { text = ''; }
    return _bcosTeOpenContent(name, text, { path: 'me/' + (relPath || name) });
}

function _bcosTeReadLocalFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('⚠️ 文件过大（>5MB），已跳过：' + file.name); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
        const text = String(evt.target.result == null ? '' : evt.target.result);
        if (text.indexOf('\u0000') !== -1) { showToast('⚠️ 不支持打开二进制文件：' + file.name); return; }
        if (_bcosTeOpenContent(file.name, text, { path: 'local/' + file.name, force: true })) {
            showToast('✓ 已打开文件: ' + file.name);
        }
    };
    reader.onerror = () => showToast('⚠️ 文件读取失败：' + file.name);
    reader.readAsText(file);
}

// ---- "📂 打开" file picker (VFS browser + local file chooser) ----
let _bcosTeOpenDir = [];

function _bcosTeVfsDirAt(stack) {
    let node = _bcosFS.me;
    for (let i = 0; i < stack.length; i++) {
        const c = node.children && node.children[stack[i]];
        if (!c || c.type !== 'dir') return null;
        node = c;
    }
    return node;
}

function _bcosTeCloseOpenDialog() {
    const dlg = document.getElementById('bcos-te-open-dlg');
    if (dlg) dlg.remove();
}

function _bcosTeOpenFilePrompt() {
    const wrap = document.querySelector('.bcos-te-wrap');
    if (!wrap) return;
    if (document.getElementById('bcos-te-open-dlg')) { _bcosTeCloseOpenDialog(); return; }
    _bcosInitMeFolder();
    const dlg = document.createElement('div');
    dlg.id = 'bcos-te-open-dlg';
    dlg.style.cssText = 'position:absolute;inset:0;z-index:30;background:rgba(8,10,18,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;';
    dlg.innerHTML = '<div style="width:min(440px,100%);max-height:100%;display:flex;flex-direction:column;background:#161a28;border:1px solid rgba(255,255,255,.14);border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.6);overflow:hidden;">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);"><strong style="font-size:13px;color:#fff;flex:1;">📂 打开文件</strong><button class="bcos-te-btn" onclick="_bcosTeCloseOpenDialog()" style="color:#ef4444;">✕</button></div>' +
        '<div id="bcos-te-open-path" style="padding:6px 12px;font-size:11px;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,.06);font-family:monospace;"></div>' +
        '<div id="bcos-te-open-list" style="flex:1;min-height:120px;max-height:260px;overflow-y:auto;padding:6px;"></div>' +
        '<div style="padding:8px 12px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px;align-items:center;">' +
        '<label class="bcos-te-btn" style="cursor:pointer;">💻 从电脑选择文件…<input type="file" multiple style="display:none;" onchange="_bcosTeImportFile(event);_bcosTeCloseOpenDialog();"></label>' +
        '<span style="font-size:10px;color:#64748b;flex:1;text-align:right;">也可直接把文件拖入编辑器</span></div></div>';
    dlg.addEventListener('mousedown', (e) => { if (e.target === dlg) _bcosTeCloseOpenDialog(); });
    wrap.appendChild(dlg);
    _bcosTeOpenDir = [];
    _bcosTeRenderOpenList();
}

function _bcosTeRenderOpenList() {
    const list = document.getElementById('bcos-te-open-list');
    const pathEl = document.getElementById('bcos-te-open-path');
    if (!list || !pathEl) return;
    let dir = _bcosTeVfsDirAt(_bcosTeOpenDir);
    if (!dir) { _bcosTeOpenDir = []; dir = _bcosFS.me; }
    pathEl.textContent = '/home/bunny/me' + (_bcosTeOpenDir.length ? '/' + _bcosTeOpenDir.join('/') : '');
    list.innerHTML = '';
    const mkRow = (icon, label, meta, onclick) => {
        const row = document.createElement('div');
        row.className = 'bcos-file-item';
        row.innerHTML = '<span>' + icon + '</span><span class="bcos-file-name">' + _bcosEscape(label) + '</span><span class="bcos-file-meta">' + _bcosEscape(meta) + '</span>';
        row.onclick = onclick;
        list.appendChild(row);
    };
    if (_bcosTeOpenDir.length) {
        mkRow('⬆️', '..', '上一级', () => { _bcosTeOpenDir.pop(); _bcosTeRenderOpenList(); });
    }
    const names = Object.keys(dir.children || {}).sort((a, b) => {
        const da = dir.children[a].type === 'dir' ? 0 : 1, db = dir.children[b].type === 'dir' ? 0 : 1;
        return da - db || a.localeCompare(b);
    });
    if (!names.length && !_bcosTeOpenDir.length) {
        list.insertAdjacentHTML('beforeend', '<div style="color:#64748b;padding:1rem;text-align:center;font-size:12px;">(空文件夹)</div>');
    }
    names.forEach(n => {
        const c = dir.children[n];
        if (c.type === 'dir') {
            mkRow('📁', n, '目录', () => { _bcosTeOpenDir.push(n); _bcosTeRenderOpenList(); });
        } else {
            let size = '';
            try { size = String(c.content == null ? '' : c.content).length + ' 字符'; } catch(e) {}
            mkRow('📄', n, size, () => _bcosTeOpenVfsEntry(n));
        }
    });
}

function _bcosTeOpenVfsEntry(name) {
    const dir = _bcosTeVfsDirAt(_bcosTeOpenDir);
    const file = dir && dir.children && dir.children[name];
    if (!file || file.type !== 'file') return;
    _bcosTeCloseOpenDialog();
    if (name === 'edit.lock' || name === 'edit_lock') { _bcosOpenEditLock(name); return; }
    const rel = _bcosTeOpenDir.concat([name]).join('/');
    if (_bcosTeOpenVfsFile(name, file, rel)) showToast('✓ 已打开文件: ' + name);
}

function _bcosTeCloseTab(tabId, e) {
    if (e) e.stopPropagation();
    if (_bcosTeTabs.length <= 1) {
        showToast('⚠️ 至少保留一个活动标签页');
        return;
    }
    const idx = _bcosTeTabs.findIndex(t => t.id === tabId);
    _bcosTeTabs.splice(idx, 1);
    if (_bcosTeActiveId === tabId) {
        _bcosTeActiveId = _bcosTeTabs[Math.max(0, idx - 1)].id;
    }
    _bcosTeRenderTabs();
    _bcosTeLoadActiveTab();
}

function _bcosTeBindEvents() {
    const ta = document.getElementById('bcos-te-textarea');
    const hl = document.getElementById('bcos-te-highlight');
    const gutter = document.getElementById('bcos-te-gutter');
    if (!ta) return;

    ta.addEventListener('input', () => {
        const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
        if (tab) {
            tab.content = ta.value;
            if (!tab.dirty) {
                tab.dirty = true;
                _bcosTeRenderTabs();
            }
        }
        _bcosTeDebouncedUpdate();
    });

    ta.addEventListener('scroll', () => {
        if (hl) {
            hl.scrollTop = ta.scrollTop;
            hl.scrollLeft = ta.scrollLeft;
        }
        if (gutter) gutter.scrollTop = ta.scrollTop;
    });

    ta.addEventListener('click', _bcosTeUpdateStatus);
    ta.addEventListener('keyup', _bcosTeUpdateStatus);

    // Shortcut Ctrl+F / Cmd+F & Ctrl+S / Cmd+S
    ta.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            _bcosTeToggleSearch();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            _bcosTeSaveActive();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + 4;
            ta.dispatchEvent(new Event('input'));
        }
    });
}

function _bcosTeDebouncedUpdate() {
    if (_bcosTeHlTimer) clearTimeout(_bcosTeHlTimer);
    _bcosTeHlTimer = setTimeout(() => {
        _bcosTeUpdateHighlight();
        _bcosTeUpdatePreview();
        _bcosTeUpdateStatus();
    }, 80);
}

function _bcosTeUpdateHighlight() {
    const ta = document.getElementById('bcos-te-textarea');
    const hl = document.getElementById('bcos-te-highlight');
    const gutter = document.getElementById('bcos-te-gutter');
    if (!ta || !hl) return;

    const code = ta.value;
    const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
    let lang = tab?.lang || 'text';
    if (lang === 'auto') {
        if (tab?.name?.endsWith('.js')) lang = 'js';
        else if (tab?.name?.endsWith('.html')) lang = 'html';
        else if (tab?.name?.endsWith('.css')) lang = 'css';
        else if (tab?.name?.endsWith('.json')) lang = 'json';
        else if (tab?.name?.endsWith('.py')) lang = 'py';
        else if (tab?.name?.endsWith('.md')) lang = 'md';
        else lang = 'text';
    }

    if (typeof _bcosSyntaxHL === 'function') {
        hl.innerHTML = _bcosSyntaxHL(code, lang);
    } else {
        hl.textContent = code;
    }

    if (gutter) {
        const count = code.split('\n').length;
        let nums = '';
        for (let i = 1; i <= count; i++) nums += i + '\n';
        gutter.textContent = nums;
    }
}

function _bcosTeUpdatePreview() {
    const preview = document.getElementById('bcos-te-preview-pane');
    const ta = document.getElementById('bcos-te-textarea');
    if (!preview || !ta) return;
    const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
    if (!tab) return;

    if (typeof _bcosSimpleMarkdown === 'function') {
        preview.innerHTML = _bcosSimpleMarkdown(ta.value);
    } else {
        preview.textContent = ta.value;
    }
}

function _bcosTeUpdateStatus() {
    const ta = document.getElementById('bcos-te-textarea');
    const pos = document.getElementById('bcos-te-pos');
    const len = document.getElementById('bcos-te-length');
    if (!ta) return;

    const val = ta.value;
    const selStart = ta.selectionStart || 0;
    const textBefore = val.substring(0, selStart);
    const lines = textBefore.split('\n');
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length + 1;

    if (pos) pos.textContent = `行 ${lineNum}, 列 ${colNum}`;
    if (len) len.textContent = `${val.length} 字符 · ${val.split('\n').length} 行`;
}

function _bcosTeToggleSplit() {
    const editor = document.getElementById('bcos-te-editor-container');
    const preview = document.getElementById('bcos-te-preview-pane');
    const btn = document.getElementById('bcos-te-split-btn');
    if (!editor || !preview) return;

    if (_bcosTeSplitMode === 'split') {
        // Switch to preview only
        _bcosTeSplitMode = 'preview';
        editor.style.display = 'none';
        preview.style.display = 'block';
        if (btn) btn.textContent = '👁️ 仅预览';
    } else if (_bcosTeSplitMode === 'preview') {
        // Switch to edit only
        _bcosTeSplitMode = 'edit';
        editor.style.display = 'flex';
        preview.style.display = 'none';
        if (btn) btn.textContent = '✏️ 仅编辑';
    } else {
        // Switch to split
        _bcosTeSplitMode = 'split';
        editor.style.display = 'flex';
        preview.style.display = 'block';
        if (btn) btn.textContent = '👁️ 分栏预览';
    }
}

function _bcosTeToggleSearch() {
    const bar = document.getElementById('bcos-te-search-bar');
    if (!bar) return;
    const isShowing = bar.style.display === 'flex';
    bar.style.display = isShowing ? 'none' : 'flex';
    if (!isShowing) {
        const inp = document.getElementById('bcos-te-find-inp');
        if (inp) { inp.focus(); inp.select(); }
    }
}

let _bcosTeFindIndex = -1;
function _bcosTeFind(dir) {
    const ta = document.getElementById('bcos-te-textarea');
    const inp = document.getElementById('bcos-te-find-inp');
    const countEl = document.getElementById('bcos-te-find-count');
    if (!ta || !inp || !inp.value) return;

    const kw = inp.value;
    const text = ta.value;
    const lowerText = text.toLowerCase();
    const lowerKw = kw.toLowerCase();
    const matches = [];
    let pos = lowerText.indexOf(lowerKw);
    while (pos !== -1) {
        matches.push(pos);
        pos = lowerText.indexOf(lowerKw, pos + lowerKw.length || pos + 1);
    }

    if (matches.length === 0) {
        if (countEl) countEl.textContent = '0/0';
        return;
    }

    if (dir === 1) _bcosTeFindIndex = (_bcosTeFindIndex + 1) % matches.length;
    else if (dir === -1) _bcosTeFindIndex = (_bcosTeFindIndex - 1 + matches.length) % matches.length;
    else _bcosTeFindIndex = 0;

    const matchPos = matches[_bcosTeFindIndex];
    ta.selectionStart = matchPos;
    ta.selectionEnd = matchPos + kw.length;
    ta.focus();

    if (countEl) countEl.textContent = `(${_bcosTeFindIndex + 1}/${matches.length})`;
}

function _bcosTeReplace(all) {
    const ta = document.getElementById('bcos-te-textarea');
    const findInp = document.getElementById('bcos-te-find-inp');
    const replaceInp = document.getElementById('bcos-te-replace-inp');
    if (!ta || !findInp || !findInp.value) return;

    const kw = findInp.value;
    const repl = replaceInp.value || '';
    if (all) {
        ta.value = ta.value.split(kw).join(repl);
        showToast('✓ 已完成全部替换');
    } else {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        if (ta.value.substring(start, end).toLowerCase() === kw.toLowerCase()) {
            ta.value = ta.value.substring(0, start) + repl + ta.value.substring(end);
            ta.selectionStart = ta.selectionEnd = start + repl.length;
        }
        _bcosTeFind(1);
    }
    ta.dispatchEvent(new Event('input'));
}

function _bcosTeSaveActive() {
    const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
    const ta = document.getElementById('bcos-te-textarea');
    if (!tab || !ta) return;

    _bcosInitMeFolder();
    tab.content = ta.value;
    tab.dirty = false;
    const relParts = String(tab.path || ('me/' + tab.name)).replace(/^(me|local)\//, '').split('/').filter(Boolean);
    const fileName = relParts.pop() || tab.name;
    let parentDir = _bcosFS.me;
    for (let i = 0; i < relParts.length; i++) {
        const seg = parentDir.children && parentDir.children[relParts[i]];
        if (seg && seg.type === 'dir') parentDir = seg; else { parentDir = _bcosFS.me; break; }
    }
    parentDir.children[fileName] = { type: 'file', content: ta.value };
    _bcosTeRenderTabs();
    if (typeof _bcosFinderRefreshUI === 'function') _bcosFinderRefreshUI();
    const statusMsg = document.getElementById('bcos-te-status-msg');
    if (statusMsg) {
        statusMsg.textContent = '✓ 已保存到 VFS';
        setTimeout(() => { if (statusMsg) statusMsg.textContent = ''; }, 2000);
    }
    showToast(`✓ 已保存: ${tab.name} (${ta.value.length} 字节)`);
}

function _bcosTeExportFile() {
    const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
    const ta = document.getElementById('bcos-te-textarea');
    if (!tab || !ta) return;

    const blob = new Blob([ta.value], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = tab.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`✓ 文件已导出下载: ${tab.name}`);
}

function _bcosTeImportFile(e) {
    const files = Array.from((e.target && e.target.files) || []);
    if (!files.length) return;
    try { e.target.value = ''; } catch(_) {} // allow picking the same file again
    files.forEach(f => _bcosTeReadLocalFile(f));
}

function _bcosTeFormatCode() {
    const ta = document.getElementById('bcos-te-textarea');
    const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
    if (!ta) return;

    const val = ta.value.trim();
    if (tab && (tab.lang === 'json' || tab.name.endsWith('.json'))) {
        try {
            const parsed = JSON.parse(val);
            ta.value = JSON.stringify(parsed, null, 2);
            ta.dispatchEvent(new Event('input'));
            showToast('✓ JSON 格式化排版完成');
        } catch(e) {
            showToast('⚠️ JSON 语法解析错误，无法格式化');
        }
    } else {
        // Normalize line breaks and tabs
        ta.value = val.replace(/\r\n/g, '\n');
        ta.dispatchEvent(new Event('input'));
        showToast('✓ 基础代码规整完成');
    }
}

function _bcosTeChangeLang(val) {
    const tab = _bcosTeTabs.find(t => t.id === _bcosTeActiveId);
    if (tab) {
        tab.lang = val;
        const langBadge = document.getElementById('bcos-te-lang-badge');
        if (langBadge) langBadge.textContent = (val || 'text').toUpperCase();
        _bcosTeUpdateHighlight();
    }
}


        // === Simple Markdown renderer for TextEditor Apply (non-egg mode) ===
    function _bcosSimpleMarkdown(md) {
        try {
        // If content looks like HTML (starts with < or <!DOCTYPE), render with sanitization
        var trimmed = md.replace(/^\s+/, '');
        if (trimmed.charAt(0) === '<' || /^<!DOCTYPE/i.test(trimmed)) {
            // Sanitize: strip <script> tags, event handler attributes, and javascript: URLs
            var sanitized = String(md)
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
                .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
                .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
                .replace(/(href|src)\s*=\s*["']?\s*javascript:/gi, '$1="');
            return '<div style="font-family:sans-serif;padding:0;background:#0d1117;min-height:100%;">' + sanitized + '</div>';
        }
        // Markdown mode: extract code blocks first to protect them from escaping
        var codeBlocks = [];
        var html = md.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m, lang, code) {
            codeBlocks.push({ code: code, lang: lang });
            return '\x00CODEBLOCK' + (codeBlocks.length - 1) + '\x00';
        });
        var inlineCodes = [];
        html = html.replace(/`([^`]+)`/g, function(m, code) {
            inlineCodes.push(code);
            return '\x00INLINECODE' + (inlineCodes.length - 1) + '\x00';
        });
        // Now escape HTML in the remaining text
        html = _bcosEscape(html);
        // Restore code blocks with syntax highlighting
        html = html.replace(/\x00CODEBLOCK(\d+)\x00/g, function(m, i) {
            var block = codeBlocks[parseInt(i)];
            var highlighted = block.lang ? _bcosSyntaxHL(block.code, block.lang) : _bcosEscape(block.code);
            return '<pre style="background:#1a1a2e;border:1px solid #333;border-radius:4px;padding:.5rem;overflow:auto;font-family:monospace;font-size:12px;color:#e0e0e0;margin:.5rem 0;">' + highlighted + '</pre>';
        });
        html = html.replace(/\x00INLINECODE(\d+)\x00/g, function(m, i) {
            return '<code style="background:#1a1a2e;padding:.1rem .3rem;border-radius:3px;font-family:monospace;font-size:.85em;color:#00ff41;">' + _bcosEscape(inlineCodes[parseInt(i)]) + '</code>';
        });
        // Headers (process from longest to shortest)
        html = html.replace(/^###### (.+)$/gm, '<h6 style="color:#a78bfa;margin:.3rem 0;">$1</h6>');
        html = html.replace(/^##### (.+)$/gm, '<h5 style="color:#a78bfa;margin:.3rem 0;">$1</h5>');
        html = html.replace(/^#### (.+)$/gm, '<h4 style="color:#a78bfa;margin:.3rem 0;">$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3 style="color:#FF6B9D;margin:.3rem 0;">$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2 style="color:#FF6B9D;margin:.4rem 0;">$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1 style="color:#FF6B9D;margin:.4rem 0;font-size:1.5rem;">$1</h1>');
        // Bold, italic, strikethrough
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;">$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong style="color:#fff;">$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/~~(.+?)~~/g, '<del style="color:#666;">$1</del>');
        // Images ![alt](src) — MUST come before links to avoid partial match
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;margin:.3rem 0;">');
        // Links [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#00aaff;text-decoration:underline;" target="_blank">$1</a>');
        // Blockquotes
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #FF6B9D;padding-left:.5rem;color:#888;margin:.3rem 0;">$1</blockquote>');
        // Task lists
        html = html.replace(/^[\-\*] \[x\] (.+)$/gim, '<li style="margin-left:1rem;color:#e0e0e0;list-style:none;">✅ $1</li>');
        html = html.replace(/^[\-\*] \[ \] (.+)$/gim, '<li style="margin-left:1rem;color:#e0e0e0;list-style:none;">⬜ $1</li>');
        // Unordered lists
        html = html.replace(/^[\-\*] (.+)$/gm, '<li style="margin-left:1rem;color:#e0e0e0;list-style:disc;">$1</li>');
        // Ordered lists
        html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:1rem;color:#e0e0e0;list-style:decimal;">$1</li>');
        // Tables
        html = html.replace(/^(\|.+\|)\n(\|[\s\-:|]+\|)\n((?:\|.+\|\n?)+)/gm, function(m, header, sep, body) {
            var headers = header.split('|').filter(function(c) { return c.trim(); }).map(function(c) { return '<th style="padding:.3rem .5rem;border:1px solid #333;color:#FF6B9D;text-align:left;">' + c.trim() + '</th>'; }).join('');
            var rows = body.trim().split('\n').map(function(row) {
                var cells = row.split('|').filter(function(c) { return c.trim() || c === ''; }).map(function(c) { return '<td style="padding:.3rem .5rem;border:1px solid #333;color:#e0e0e0;">' + c.trim() + '</td>'; }).join('');
                return '<tr>' + cells + '</tr>';
            }).join('');
            return '<table style="border-collapse:collapse;margin:.5rem 0;width:100%;"><thead><tr>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table>';
        });
        // Horizontal rules
        html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #333;margin:.5rem 0;">');
        // Line breaks (double newline = paragraph)
        html = html.replace(/\n\n/g, '</p><p style="margin:.3rem 0;color:#e0e0e0;line-height:1.5;">');
        html = '<div style="font-family:sans-serif;padding:1rem;background:#0d1117;color:#e0e0e0;min-height:100%;line-height:1.5;"><p style="margin:.3rem 0;color:#e0e0e0;">' + html + '</p></div>';
        return html;
        } catch(e) { return '<div style="font-family:sans-serif;padding:1rem;background:#0d1117;color:#f44;">Markdown render error: ' + _bcosEscape(e.message) + '</div>'; }
    }

    // === OOBE (Out-of-Box Experience) ===
    // Version-tracked: shows OOBE whenever bcos version changes
    function _bcosShowOOBE(ov) {
        const lastOOBEVersion = safeGetItem('bcos_oobe_version', '');
        if (lastOOBEVersion === _BCOS_VER) return; // Already seen this version
        const dt = _bcosGetDesktopTheme();
        const curLog = (typeof CHANGELOG !== 'undefined' && CHANGELOG[0]) ? CHANGELOG[0] : null;
        const whatsNewHtml = curLog ? ('<div style="background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:.5rem .7rem;text-align:left;max-height:135px;overflow-y:auto;font-size:11px;line-height:1.5;margin-top:.6rem;">' +
            '<div style="font-weight:bold;color:' + dt.accent + ';margin-bottom:.3rem;">🌟 ' + curLog.ver + ' · ' + curLog.title + '</div>' +
            curLog.items.map(it => '<div style="margin-bottom:.2rem;">' + it + '</div>').join('') +
            '</div>') : '';

        const steps = [
            { title: '🐰 Welcome to bcos ' + _BCOS_VER, body: 'You are now running <b style="color:' + dt.accent + ';">Bunny OS</b> ' + _BCOS_VER + '.<br>A Linux-style web operating system in your browser.' + whatsNewHtml },
            { title: '⌨️ Terminal', body: 'The <b style="color:#00ff41;">Terminal</b> is your command center.<br><br>Type <code style="background:#1a1a1a;padding:.1rem .3rem;border-radius:3px;color:#00ff41;">help</code> to see all available commands.<br><br>Try <code style="background:#1a1a1a;padding:.1rem .3rem;border-radius:3px;color:#00ff41;">ls</code>, <code style="background:#1a1a1a;padding:.1rem .3rem;border-radius:3px;color:#00ff41;">neofetch</code>, or <code style="background:#1a1a1a;padding:.1rem .3rem;border-radius:3px;color:#00ff41;">cat YumikoToys</code>.' },
            { title: '📁 Files', body: 'The <b style="color:#00ff41;">File Manager</b> lets you browse 177 GitHub repositories.<br><br>Click any repo to see details, or double-click to open it on GitHub.<br><br>You can also use <code style="background:#1a1a1a;padding:.1rem .3rem;border-radius:3px;color:#00ff41;">ls</code> in the terminal.' },
            { title: '🖥️ Desktop', body: 'Your desktop has apps:<br><br>🐰 Terminal &nbsp; 🌸 Files &nbsp; 💖 Monitor<br>🌐 Browser &nbsp; 🎀 About<br><br>Use the <b style="color:' + dt.accent + ';">🐰 bcos</b> button in the taskbar to open the start menu.' },
        ];
        _bcosOOBEStep = 0;
        const overlay = document.createElement('div');
        overlay.id = 'bcos-oobe-overlay';
        overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;';
        function renderStep() {
            const s = steps[_bcosOOBEStep];
            const isLast = _bcosOOBEStep === steps.length - 1;
            overlay.innerHTML = '<div style="background:#1a1a1a;border:1px solid ' + dt.accent + ';border-radius:8px;padding:1.5rem;max-width:390px;text-align:center;color:#e0e0e0;font-family:inherit;">' +
                '<h2 style="color:' + dt.accent + ';margin:0 0 .8rem;font-size:1.1rem;">' + s.title + '</h2>' +
                '<div style="font-size:13px;line-height:1.6;margin-bottom:1rem;">' + s.body + '</div>' +
                '<div style="display:flex;gap:.3rem;justify-content:center;margin-bottom:.5rem;">' +
                steps.map((_, i) => '<div style="width:8px;height:8px;border-radius:50%;background:' + (i === _bcosOOBEStep ? dt.accent : '#333') + ';"></div>').join('') +
                '</div>' +
                '<button id="bcos-oobe-next" style="background:' + dt.accent + ';border:none;color:#fff;padding:.4rem 1.2rem;border-radius:4px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:bold;">' + (isLast ? 'Start using bcos' : 'Next →') + '</button>' +
                '</div>';
            var nextBtn = overlay && overlay.querySelector ? overlay.querySelector('#bcos-oobe-next') : null;
            if (nextBtn) nextBtn.onclick = () => {
                _bcosOOBEStep++;
                if (_bcosOOBEStep >= steps.length) {
                    safeSetItem('bcos_oobe_version', _BCOS_VER);
                    overlay.remove();
                } else {
                    renderStep();
                }
            };
        }
        ov.appendChild(overlay);
        renderStep();
    }

    // Event log modal — shows all events triggered during the game
    function showEventLogModal() {
        const events = mono.eventLog || [];
        const modal = document.getElementById('modal-content');
        if (events.length === 0) {
            modal.innerHTML = `<div class="modal-drag-handle"></div><div class="modal-title">📜 本局事件记录</div>
                <div style="text-align:center;padding:2rem;color:var(--text2);">暂无事件记录</div>
                <button class="btn btn-primary" style="width:100%;" onclick="closeModal()">关闭</button>`;
            document.getElementById('modal-overlay').classList.add('show');
            return;
        }
        // Group events by type for stats
        const typeLabels = { card_draw: '🎴 抽卡', card_use: '🃏 使用卡牌', card_curse: '🔥 诅咒攻击', event: '🎲 随机事件', penalty: '💸 惩罚', bonus: '💎 奖励', jail: '🔒 监狱', trade: '🤝 交易', news_passive: '📺 被动新闻', news_spread: '📢 散播新闻' };
        const typeCounts = {};
        events.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
        const statsHtml = Object.entries(typeCounts).map(([t, c]) =>
            `<span style="display:inline-block;background:var(--card2);border-radius:12px;padding:.2rem .6rem;margin:.15rem;font-size:.7rem;">${typeLabels[t] || t}: ${c}</span>`
        ).join('');
        // Show last 50 events (most recent first)
        const recentEvents = events.slice(-50).reverse();
        const eventsHtml = recentEvents.map(e => {
            const turn = (typeof e.turn === 'number' && e.turn > 0) ? e.turn : '?';
            const timeStr = `第${turn}回合`;
            const playerName = e.player || '未知';
            const actionText = e.action || '';
            const resultText = (typeof e.result === 'string') ? e.result : (e.result ? JSON.stringify(e.result) : '');
            return `<div style="padding:.4rem;border-left:3px solid var(--accent);background:var(--card2);border-radius:0 6px 6px 0;margin-bottom:.3rem;font-size:.75rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:700;">${playerName}</span>
                    <span style="font-size:.6rem;color:var(--text2);">${timeStr}</span>
                </div>
                <div style="color:var(--text);margin-top:.15rem;">${actionText}</div>
                ${resultText ? `<div style="font-size:.65rem;color:var(--text2);margin-top:.1rem;">${resultText}</div>` : ''}
            </div>`;
        }).join('');
        modal.innerHTML = `<div class="modal-drag-handle"></div><div class="modal-title">📜 本局事件记录 (${events.length})</div>
            <div style="padding:.4rem 0;">
                <div style="margin-bottom:.5rem;">${statsHtml}</div>
                <div style="max-height:400px;overflow-y:auto;">${eventsHtml}</div>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="closeModal()">关闭</button>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    // Generic modal helper
    function showModal(htmlContent) {
        const modal = document.getElementById('modal-content');
        modal.innerHTML = htmlContent;
        document.getElementById('modal-overlay').classList.add('show');
        _lockModal(); // Set lock immediately for consistent modal protection
    }

    // Card use modal (player uses card from hand — does NOT end turn)
    function showCardUseModal(card, effResult) {
        const modal = document.getElementById('modal-content');
        const descText = effResult || card.desc || '';
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🃏 卡牌发动</div>
            <div style="text-align:center;padding:1rem 0;">
                <div style="font-size:3rem;margin-bottom:.5rem;">${card.ic}</div>
                <div style="font-weight:800;font-size:1.2rem;color:var(--accent);">${card.n}</div>
                <div style="font-size:.7rem;font-weight:700;color:${RARITY_COLORS[card.rarity]};margin-bottom:.5rem;">${card.rarity.toUpperCase()}</div>
                <div style="color:var(--text2);font-size:.9rem;line-height:1.6;">${descText}</div>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="closeModal()">确定</button>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    // Event modal (random event triggers — ends turn after closing)
    function showEventModal(ev, p, effResult) {
        const rarityLabels = { common: '普通', uncommon: '不凡', rare: '稀有', legendary: '传说' };
        const rarityColors = { common: 'var(--text2)', uncommon: '#3b82f6', rare: '#a855f7', legendary: '#f59e0b' };
        const rarityLabel = rarityLabels[ev.rarity] || '普通';
        const rarityColor = rarityColors[ev.rarity] || 'var(--text2)';
        const resultText = effResult || '事件已触发';
        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🎲 随机事件</div>
            <div style="text-align:center;padding:1rem 0;">
                <div style="font-size:3rem;margin-bottom:.5rem;">${ev.ic}</div>
                <div style="font-size:.65rem;font-weight:700;color:${rarityColor};margin-bottom:.3rem;">${rarityLabel.toUpperCase()}</div>
                <h3 style="margin-bottom:.5rem;color:var(--accent);">${ev.nm}</h3>
                <p style="color:var(--text2);font-size:.9rem;line-height:1.6;">${ev.desc}</p>
                <div style="margin-top:.8rem;padding:.6rem 1rem;background:rgba(34,197,94,.12);border-radius:10px;border:2px solid rgba(34,197,94,.4);font-size:.95rem;color:#22c55e;font-weight:700;">✨ ${resultText}</div>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="closeEventModal()">确定</button>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function closeEventModal() {
        closeModal();
        saveMonopoly();
        renderMonopoly();
        if (!checkGameOver()) nextTurn();
    }

    // Card draw modal (player lands on card tile — ends turn after closing)
    function showCardDrawModal(card, p) {
        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🃏 抽到卡牌</div>
            <div style="text-align:center;padding:1rem 0;">
                <div style="font-size:3rem;margin-bottom:.5rem;">${card.ic}</div>
                <div style="font-weight:800;font-size:1.2rem;color:var(--accent);">${card.n}</div>
                <div style="font-size:.7rem;font-weight:700;color:${RARITY_COLORS[card.rarity]};margin-bottom:.5rem;">${card.rarity.toUpperCase()}</div>
                <div style="color:var(--text2);font-size:.9rem;line-height:1.6;">${card.desc}</div>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="closeCardDrawModal()">确定</button>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function closeCardDrawModal() {
        closeModal();
        saveMonopoly();
        renderMonopoly();
        if (!checkGameOver()) nextTurn();
    }

    /* ==================== Card Draw System (with Cooldown) ==================== */
    