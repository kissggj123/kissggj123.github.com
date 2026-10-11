function _bcosResolvePath(path) {
        if (!path || path === '~' || path === '') return '~';
        if (path === '/') return '~';
        // Normalize: remove leading ~, handle relative paths
        let base = _bcosCwd === '~' ? '' : _bcosCwd.replace(/^~\/?/, '');
        let target;
        if (path.startsWith('~/')) target = path.slice(2);
        else if (path.startsWith('~')) target = path.slice(1);
        else if (path.startsWith('/')) target = path.slice(1);
        else target = (base ? base + '/' : '') + path;
        // Resolve . and ..
        const parts = target.split('/').filter(p => p && p !== '.');
        const resolved = [];
        for (const p of parts) {
            if (p === '..') { resolved.pop(); continue; }
            resolved.push(p);
        }
        return resolved.length === 0 ? '~' : '~/' + resolved.join('/');
    }

    function _bcosGetNodeAtPath(path) {
        const parts = path.replace(/^~\/?/, '').split('/').filter(Boolean);
        let node = { type: 'dir', children: _bcosFS };
        for (const p of parts) {
            if (!node.children || !node.children[p]) return null;
            node = node.children[p];
        }
        return node;
    }

    function _bcosGetVFSNodeAndParent(rawPath) {
        const resolved = _bcosResolvePath(rawPath);
        const parts = resolved.replace(/^~\/?/, '').split('/').filter(Boolean);
        if (parts.length === 0) return { parent: null, name: '', node: { type: 'dir', children: _bcosFS }, resolved };
        const name = parts.pop();
        const parentPath = parts.length === 0 ? '~' : '~/' + parts.join('/');
        const parentNode = _bcosGetNodeAtPath(parentPath);
        const targetNode = parentNode && parentNode.children ? parentNode.children[name] : null;
        return { parent: parentNode, name, node: targetNode, resolved };
    }

    function _bcosGetPromptPath() {
        if (_bcosCwd === '~') return '~';
        // Show shortened path for prompt
        return _bcosCwd;
    }

    let _bcosActiveOutput = null;

    function _bcosPrint(html) {
        let out = _bcosActiveOutput;
        if (out && !out.isConnected) { _bcosActiveOutput = null; out = null; }
        if (!out) out = document.getElementById('bcos-output');
        if (!out || !out.isConnected) return;
        const line = document.createElement('div');
        line.innerHTML = html;
        out.appendChild(line);
        const screen = document.getElementById('bcos-screen');
        if (screen && screen.isConnected) screen.scrollTop = screen.scrollHeight;
        else out.scrollTop = out.scrollHeight;
    }

    function _bcosLevenshtein(a, b) {
        const m = a.length, n = b.length;
        if (m === 0) return n;
        if (n === 0) return m;
        // Space-optimized: use two 1D arrays instead of 2D matrix
        let prev = new Array(n + 1);
        let curr = new Array(n + 1);
        for (let j = 0; j <= n; j++) prev[j] = j;
        for (let i = 1; i <= m; i++) {
            curr[0] = i;
            for (let j = 1; j <= n; j++) {
                curr[j] = a[i-1] === b[j-1] ? prev[j-1] : 1 + Math.min(prev[j], curr[j-1], prev[j-1]);
            }
            let tmp = prev; prev = curr; curr = tmp;
        }
        return prev[n];
    }

    function _bcosFuzzy(input, candidates) {
        if (!input) return null;
        if (candidates.includes(input)) return input;
        const prefix = candidates.filter(c => c.startsWith(input));
        if (prefix.length === 1) return prefix[0];
        let best = null, bestDist = Infinity;
        const inputLen = input.length;
        for (const c of candidates) {
            // Skip candidates too different in length to have distance <= 2
            if (Math.abs(c.length - inputLen) > 2) continue;
            const d = _bcosLevenshtein(input, c); if (d < bestDist && d <= 2) { bestDist = d; best = c; }
        }
        return best;
    }

    function _bcosAutocomplete(input) {
        const val = input.value;
        if (!val) return;
        const parts = val.split(/\s+/);
        if (parts.length <= 1) {
            const cmds = Object.keys(_bcosGetCommands());
            const matches = cmds.filter(c => c.startsWith(val.toLowerCase()));
            if (matches.length === 1) input.value = matches[0] + ' ';
            else if (matches.length > 1) _bcosPrint('<span class="bcos-dim">' + matches.join('  ') + '</span>');
        } else {
            const cmdName = parts[0].toLowerCase();
            const prefix = parts[parts.length - 1].toLowerCase();
            // For path-based commands (cd, ls, cat, rm, touch, mkdir), complete from filesystem
            const pathCmds = ['cd', 'ls', 'cat', 'rm', 'touch', 'mkdir', 'mk', 'open'];
            if (pathCmds.indexOf(cmdName) !== -1) {
                // Resolve the directory to search in
                let searchDir, filePrefix;
                const lastPart = parts[parts.length - 1];
                if (lastPart.includes('/')) {
                    const lastSlash = lastPart.lastIndexOf('/');
                    const dirPart = lastPart.slice(0, lastSlash);
                    filePrefix = lastPart.slice(lastSlash + 1).toLowerCase();
                    const resolved = _bcosResolvePath(dirPart);
                    searchDir = _bcosGetNodeAtPath(resolved);
                } else {
                    filePrefix = lastPart.toLowerCase();
                    searchDir = _bcosGetNodeAtPath(_bcosCwd);
                }
                if (searchDir && searchDir.type === 'dir' && searchDir.children) {
                    const childNames = Object.keys(searchDir.children).filter(n => n.toLowerCase().startsWith(filePrefix));
                    if (childNames.length === 1) {
                        const child = searchDir.children[childNames[0]];
                        const suffix = child.type === 'dir' ? '/' : '';
                        parts[parts.length - 1] = (lastPart.includes('/') ? lastPart.slice(0, lastPart.lastIndexOf('/') + 1) : '') + childNames[0] + suffix;
                        input.value = parts.join(' ');
                    } else if (childNames.length > 1 && childNames.length <= 20) {
                        _bcosPrint('<span class="bcos-dim">' + childNames.join('  ') + '</span>');
                    }
                    return;
                }
            }
            // Fallback: match repo names
            const matches = _bcosRepos.filter(r => r[0].toLowerCase().startsWith(prefix));
            if (matches.length === 1) { parts[parts.length - 1] = matches[0][0]; input.value = parts.join(' '); }
            else if (matches.length > 1 && matches.length <= 20) _bcosPrint('<span class="bcos-dim">' + matches.map(r => r[0]).join('  ') + '</span>');
        }
    }

    function _bcosGetCommands() {
        return {
            help: () => {
                _bcosPrint('<span class="bcos-info">bcos ' + _BCOS_VER + ' — Available Commands:</span>');
                _bcosPrint('  <span class="bcos-success">help</span>          Show this help message');
                _bcosPrint('  <span class="bcos-success">ls [path|lang]</span> List directory contents or repos by language');
                _bcosPrint('  <span class="bcos-success">cat &lt;repo&gt;</span>     Show repository details');
                _bcosPrint('  <span class="bcos-success">open &lt;repo&gt;</span>    Open repository on GitHub');
                _bcosPrint('  <span class="bcos-success">search &lt;query&gt;</span> Search repositories');
                _bcosPrint('  <span class="bcos-success">find &lt;query&gt;</span>   Alias for search');
                _bcosPrint('  <span class="bcos-success">langs</span>         List all languages');
                _bcosPrint('  <span class="bcos-success">stats</span>         Show repository statistics');
                _bcosPrint('  <span class="bcos-success">recent [n]</span>    Show n most recent repos (default: 10)');
                _bcosPrint('  <span class="bcos-success">popular [n]</span>   Show n most starred repos (default: 10)');
                _bcosPrint('  <span class="bcos-success">tree</span>          Show repo tree by language');
                _bcosPrint('  <span class="bcos-success">neofetch</span>      Show system info');
                _bcosPrint('  <span class="bcos-success">desktop</span>       Launch desktop environment');
                _bcosPrint('  <span class="bcos-success">clear</span>         Clear terminal');
                _bcosPrint('  <span class="bcos-success">history</span>       Show command history');
                _bcosPrint('  <span class="bcos-success">man &lt;cmd&gt;</span>     Manual for command');
                _bcosPrint('  <span class="bcos-success">whoami</span>        Print current user');
                _bcosPrint('  <span class="bcos-success">uname [-a]</span>    System information');
                _bcosPrint('  <span class="bcos-success">gpu</span>           GPU acceleration report');
                _bcosPrint('  <span class="bcos-success">date</span>          Current date/time');
                _bcosPrint('  <span class="bcos-success">echo &lt;text&gt;</span>   Print text');
                _bcosPrint('  <span class="bcos-success">pwd</span>           Print working directory');
                _bcosPrint('  <span class="bcos-success">cd &lt;dir&gt;</span>      Change directory (e.g. cd me, cd desktop, cd ..)');
                _bcosPrint('  <span class="bcos-success">anniversary</span>   Show anniversary milestones & countdown (alias: anni)');
                _bcosPrint('  <span class="bcos-success">car</span>           Launch car browser fullscreen lockscreen (alias: lock)');
                _bcosPrint('  <span class="bcos-success">exit</span>          Exit bcos');
                _bcosPrint('<span class="bcos-info">─── File System ───</span>');
                _bcosPrint('  <span class="bcos-success">mkdir &lt;name&gt;</span>  Create a directory in virtual FS');
                _bcosPrint('  <span class="bcos-success">mk &lt;name&gt;</span>     Alias for mkdir');
                _bcosPrint('  <span class="bcos-success">touch &lt;name&gt;</span>  Create an empty file (supports paths)');
                _bcosPrint('  <span class="bcos-success">rm &lt;name&gt;</span>     Remove a file or directory');
                _bcosPrint('  <span class="bcos-success">cat &lt;path&gt;</span>    Show file content or repository details');
                _bcosPrint('  <span class="bcos-success">./&lt;app&gt;</span>       Run desktop app (e.g. ./texteditor)');
                _bcosPrint('  <span class="bcos-success">ls [path|lang]</span> List directory, virtual FS, or repos by language');
                _bcosPrint('<span class="bcos-info">─── System Control ───</span>');
                _bcosPrint('  <span class="bcos-success">theme [id]</span>    Switch theme (no arg = list)');
                _bcosPrint('  <span class="bcos-success">font [80-200|pixel]</span> Set font scale or toggle pixel font');
                _bcosPrint('  <span class="bcos-success">tabbar [mode]</span> Set tab bar (always|auto|hidden)');
                _bcosPrint('  <span class="bcos-success">sidebar [mode]</span> Set sidebar (auto|hide|open|collapsed)');
                _bcosPrint('  <span class="bcos-success">mouse</span>         Toggle mouse effect');
                _bcosPrint('  <span class="bcos-success">select</span>        Toggle text selection');
                _bcosPrint('  <span class="bcos-success">avatar [type]</span> Set avatar (emoji|photo)');
                _bcosPrint('  <span class="bcos-success">mapsize [size]</span> Set map size (small|medium|standard)');
                _bcosPrint('  <span class="bcos-success">players [n]</span>  Set player count (random|4|6|8)');
                _bcosPrint('  <span class="bcos-success">fullscreen</span>    Toggle fullscreen');
                _bcosPrint('  <span class="bcos-success">egg</span>           Toggle egg click trigger');
                _bcosPrint('  <span class="bcos-success">notify</span>        Enable push notifications');
                _bcosPrint('  <span class="bcos-success">dice [1-4]</span>   Set dice multiplier (1x|2x|3x|4x)');
                _bcosPrint('  <span class="bcos-success">settings</span>      Show all current settings');
                _bcosPrint('  <span class="bcos-success">goto [view]</span>  Navigate to (home|settings|monopoly|logs)');
                _bcosPrint('  <span class="bcos-success">default [view]</span> Set default page (home|monopoly|bcos|desktop)');
                _bcosPrint('  <span class="bcos-success">install</span>       PWA install guide / prompt');
                _bcosPrint('<span class="bcos-info">─── Save Management ───</span>');
                _bcosPrint('  <span class="bcos-success">saves</span>         List all save slots');
                _bcosPrint('  <span class="bcos-success">save [1-3]</span>    Save game to slot');
                _bcosPrint('  <span class="bcos-success">load [1-3]</span>    Load game from slot');
                _bcosPrint('<span class="bcos-info">─── Package Manager ───</span>');
                _bcosPrint('  <span class="bcos-success">bcos update</span>   Refresh browser storage (clear cache & reload)');
                _bcosPrint('  <span class="bcos-success">bcos upgrade</span>  View all installed module packages');
                _bcosPrint('  <span class="bcos-success">bcos version</span>  Show bcos version info');
                _bcosPrint('<span class="bcos-dim">Tip: TAB=autocomplete | Up/Down=history | Ctrl+L=clear</span>');
            },
            ls: (args) => {
                const arg = args[0] || '';
                // Helper: list a directory node's children
                function listDir(node) {
                    if (node.type === 'file') { _bcosPrint('<span class="bcos-repo-name">' + _bcosEscape(arg || _bcosCwd) + '</span>'); return; }
                    const children = Object.keys(node.children);
                    if (children.length === 0) { _bcosPrint('<span class="bcos-info">total 0</span>'); _bcosPrint('<span class="bcos-dim">(empty)</span>'); return; }
                    _bcosPrint('<span class="bcos-info">total ' + children.length + '</span>');
                    children.forEach(name => {
                        const child = node.children[name];
                        const isExec = child.executable;
                        const icon = child.type === 'dir' ? '📁' : (isExec ? '⚙️' : '📄');
                        const color = child.type === 'dir' ? '#00aaff' : (isExec ? '#00ff41' : '#e0e0e0');
                        const suffix = child.type === 'dir' ? '/' : (isExec ? '*' : '');
                        _bcosPrint(icon + ' <span style="color:' + color + ';">' + _bcosEscape(name) + '</span>' + suffix);
                    });
                }
                // If arg provided, try path resolution first, then language filter
                if (arg) {
                    if (arg === '--all' || arg === '-a') {
                        // Show everything at root
                    } else {
                        const resolved = _bcosResolvePath(arg);
                        const node = _bcosGetNodeAtPath(resolved);
                        if (node) { listDir(node); return; }
                        // Not a path — try language filter
                        let repos = [..._bcosRepos].filter(r => r[2].toLowerCase() === arg.toLowerCase());
                        if (repos.length > 0) {
                            _bcosPrint('<span class="bcos-info">── Repositories (' + repos.length + ') ──</span>');
                            repos.forEach(r => {
                                const lc = _bcosLangColors[r[2]] || '#e0e0e0';
                                const fb = r[7] ? ' <span class="bcos-repo-fork">[fork]</span>' : '';
                                const st = r[3] > 0 ? ' <span class="bcos-repo-stars">*' + r[3] + '</span>' : '';
                                _bcosPrint('<span class="bcos-repo-name">' + _bcosEscape(r[0]) + '</span>' + fb + ' — <span style="color:' + lc + ';">' + _bcosEscape(r[2]) + '</span>' + st + ' <span class="bcos-repo-date">' + _bcosEscape(r[5]) + '</span>');
                            });
                            return;
                        }
                        _bcosPrint('<span class="bcos-warn">No repositories found for: ' + _bcosEscape(arg) + '</span>');
                        return;
                    }
                }
                // No arg (or --all): list cwd if not root, otherwise show FS + repos
                if (_bcosCwd !== '~' && !arg) {
                    const node = _bcosGetNodeAtPath(_bcosCwd);
                    if (node) { listDir(node); return; }
                }
                // Root: show virtual FS + repos
                const fsEntries = Object.keys(_bcosFS);
                if (fsEntries.length > 0) {
                    _bcosPrint('<span class="bcos-info">── Virtual File System ──</span>');
                    fsEntries.forEach(name => {
                        const node = _bcosFS[name];
                        const icon = node.type === 'dir' ? '📁' : '📄';
                        const color = node.type === 'dir' ? '#00aaff' : '#e0e0e0';
                        const childCount = node.type === 'dir' ? Object.keys(node.children).length : 0;
                        _bcosPrint(icon + ' <span style="color:' + color + ';">' + _bcosEscape(name) + '/</span> <span class="bcos-dim">' + childCount + ' item(s)</span>');
                    });
                }
                let repos = [..._bcosRepos];
                _bcosPrint('<span class="bcos-info">── Repositories (' + repos.length + ') ──</span>');
                repos.forEach(r => {
                    const lc = _bcosLangColors[r[2]] || '#e0e0e0';
                    const fb = r[7] ? ' <span class="bcos-repo-fork">[fork]</span>' : '';
                    const st = r[3] > 0 ? ' <span class="bcos-repo-stars">*' + r[3] + '</span>' : '';
                    _bcosPrint('<span class="bcos-repo-name">' + _bcosEscape(r[0]) + '</span>' + fb + ' — <span style="color:' + lc + ';">' + _bcosEscape(r[2]) + '</span>' + st + ' <span class="bcos-repo-date">' + _bcosEscape(r[5]) + '</span>');
                });
            },
            cat: (args) => {
                if (!args[0]) { _bcosPrint('<span class="bcos-error">cat: missing operand</span>'); _bcosPrint('<span class="bcos-dim">Usage: cat &lt;repository-name | file-path&gt;</span>'); return; }
                // Check virtual FS files first (e.g. me/readme.md, me/edit.lock)
                const rawName = args[0].replace(/^\.\//, '');
                // Try cwd-aware path resolution first
                let vfsFile = null;
                const resolved = _bcosResolvePath(rawName);
                const resolvedNode = _bcosGetNodeAtPath(resolved);
                if (resolvedNode && resolvedNode.type === 'file') {
                    vfsFile = resolvedNode;
                }
                // Fallback: try root-relative path (backward compat)
                if (!vfsFile) {
                    const parts = rawName.split('/');
                    if (parts.length === 1 && _bcosFS[parts[0]] && _bcosFS[parts[0]].type === 'file') {
                        vfsFile = _bcosFS[parts[0]];
                    } else if (parts.length > 1) {
                        const fileName = parts.pop();
                        let dir = _bcosFS;
                        for (const p of parts) {
                            if (!dir[p] || dir[p].type !== 'dir') { dir = null; break; }
                            dir = dir[p].children;
                        }
                        if (dir && dir[fileName] && dir[fileName].type === 'file') {
                            vfsFile = dir[fileName];
                        }
                    }
                }
                if (vfsFile) {
                    if (rawName.includes('edit.lock') || rawName.includes('edit_lock')) {
                        if (vfsFile.systemCreated) {
                            _bcosPrint('<span class="bcos-warn">' + _bcosEscape(vfsFile.content || '') + '</span>');
                        } else {
                            _bcosPrint('<span class="bcos-dim">' + _bcosEscape(vfsFile.content || '(empty file)') + '</span>');
                        }
                    } else {
                        const lines = (vfsFile.content || '(empty file)').split('\n');
                        lines.forEach(line => _bcosPrint('<span class="bcos-info">' + _bcosEscape(line) + '</span>'));
                    }
                    return;
                }
                const repo = _bcosRepos.find(r => r[0].toLowerCase() === args[0].toLowerCase());
                if (!repo) {
                    const matches = _bcosRepos.filter(r => r[0].toLowerCase().includes(args[0].toLowerCase()));
                    if (matches.length === 1) { _bcosGetCommands().cat([matches[0][0]]); return; }
                    _bcosPrint('<span class="bcos-error">cat: ' + _bcosEscape(args[0]) + ': No such repository</span>');
                    if (matches.length > 0) _bcosPrint('<span class="bcos-suggestion">Did you mean: ' + matches.slice(0,5).map(r => _bcosEscape(r[0])).join(', ') + '?</span>');
                    return;
                }
                const lc = _bcosLangColors[repo[2]] || '#e0e0e0';
                _bcosPrint('<span class="bcos-info">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>');
                _bcosPrint('  <span class="bcos-success">Repository:</span> ' + _bcosEscape(repo[0]));
                _bcosPrint('  <span class="bcos-success">Description:</span> ' + (repo[1] ? _bcosEscape(repo[1]) : '<span class="bcos-dim">// No description</span>'));
                _bcosPrint('  <span class="bcos-success">Language:</span> <span style="color:' + lc + ';">' + _bcosEscape(repo[2]) + '</span>');
                _bcosPrint('  <span class="bcos-success">Stars:</span> * ' + repo[3] + '    <span class="bcos-success">Forks:</span> ' + repo[4]);
                _bcosPrint('  <span class="bcos-success">Updated:</span> ' + _bcosEscape(repo[5]));
                _bcosPrint('  <span class="bcos-success">Size:</span> ' + (repo[8] >= 1024 ? (repo[8]/1024).toFixed(1) + ' MB' : repo[8] + ' KB'));
                _bcosPrint('  <span class="bcos-success">Type:</span> ' + (repo[7] ? 'Fork' : 'Original'));
                if (repo[9]) {
                    const safeHp = _bcosEscape(repo[9]).replace(/'/g, '&#39;');
                    _bcosPrint('  <span class="bcos-success">Homepage:</span> <span class="bcos-link" onclick="window.open(\'' + safeHp + '\',\'_blank\')">' + _bcosEscape(repo[9]) + '</span>');
                }
                const safeUrl = _bcosEscape(repo[6]).replace(/'/g, '&#39;');
                _bcosPrint('  <span class="bcos-success">URL:</span> <span class="bcos-link" onclick="window.open(\'' + safeUrl + '\',\'_blank\')">' + _bcosEscape(repo[6]) + '</span>');
                _bcosPrint('<span class="bcos-info">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>');
            },
            open: (args) => {
                if (!args[0]) { _bcosPrint('<span class="bcos-error">open: missing operand</span>'); return; }
                const repo = _bcosRepos.find(r => r[0].toLowerCase() === args[0].toLowerCase());
                if (!repo) { _bcosPrint('<span class="bcos-error">open: ' + _bcosEscape(args[0]) + ': Repository not found</span>'); return; }
                _bcosPrint('<span class="bcos-info">Opening ' + _bcosEscape(repo[0]) + '...</span>');
                window.open(repo[6], '_blank');
            },
            search: (args) => {
                if (!args[0]) { _bcosPrint('<span class="bcos-error">search: missing query</span>'); return; }
                const q = args.join(' ').toLowerCase();
                const results = _bcosRepos.filter(r => r[0].toLowerCase().includes(q) || (r[1]||'').toLowerCase().includes(q));
                if (results.length === 0) { _bcosPrint('<span class="bcos-warn">No results for: ' + _bcosEscape(q) + '</span>'); return; }
                _bcosPrint('<span class="bcos-info">Found ' + results.length + ' repositories:</span>');
                results.forEach(r => {
                    const fb = r[7] ? ' <span class="bcos-repo-fork">[fork]</span>' : '';
                    _bcosPrint('  <span class="bcos-repo-name">' + _bcosEscape(r[0]) + '</span>' + fb + ' — <span class="bcos-dim">' + (r[1] ? _bcosEscape(r[1].substring(0,60)) : 'No description') + '</span>');
                });
            },
            find: (args) => _bcosGetCommands().search(args),
            langs: () => {
                const lm = {}; _bcosRepos.forEach(r => { lm[r[2]] = (lm[r[2]] || 0) + 1; });
                const sorted = Object.entries(lm).sort((a,b) => b[1] - a[1]);
                _bcosPrint('<span class="bcos-info">Languages (' + sorted.length + ' total):</span>');
                sorted.forEach(([lang, count]) => {
                    const c = _bcosLangColors[lang] || '#e0e0e0';
                    const bar = '#'.repeat(Math.ceil(count / 3));
                    _bcosPrint('  <span style="color:' + c + ';">*</span> ' + lang.padEnd(14) + ' ' + String(count).padStart(3) + ' <span class="bcos-dim">' + bar + '</span>');
                });
            },
            stats: () => {
                const t = _bcosRepos.length, o = _bcosRepos.filter(r => !r[7]).length, f = t - o;
                const ts = _bcosRepos.reduce((s,r) => s + r[3], 0), tf = _bcosRepos.reduce((s,r) => s + r[4], 0);
                const lc = new Set(_bcosRepos.map(r => r[2])).size;
                const oldest = _bcosRepos.reduce((a,b) => a[5] < b[5] ? a : b);
                const newest = _bcosRepos.reduce((a,b) => a[5] > b[5] ? a : b);
                const sz = _bcosRepos.reduce((s,r) => s + (r[8]||0), 0);
                _bcosPrint('<span class="bcos-info">===== bcos Repository Statistics =====</span>');
                _bcosPrint('  Total Repositories: <span class="bcos-success">' + t + '</span>');
                _bcosPrint('  Original Repos:     <span class="bcos-success">' + o + '</span>');
                _bcosPrint('  Forked Repos:       <span class="bcos-success">' + f + '</span>');
                _bcosPrint('  Total Stars:        <span class="bcos-success">* ' + ts + '</span>');
                _bcosPrint('  Total Forks:        <span class="bcos-success">' + tf + '</span>');
                _bcosPrint('  Languages:          <span class="bcos-success">' + lc + '</span>');
                _bcosPrint('  Total Size:         <span class="bcos-success">' + (sz/1024/1024).toFixed(2) + ' GB</span>');
                _bcosPrint('  Oldest Repo:        <span class="bcos-dim">' + _bcosEscape(oldest[0]) + ' (' + oldest[5] + ')</span>');
                _bcosPrint('  Newest Repo:        <span class="bcos-dim">' + _bcosEscape(newest[0]) + ' (' + newest[5] + ')</span>');
            },
            neofetch: () => {
                const t = _bcosRepos.length, lc = new Set(_bcosRepos.map(r => r[2])).size;
                const ts = _bcosRepos.reduce((s,r) => s + r[3], 0);
                const gpuShort = _gpuInfo.renderer.length > 30 ? _gpuInfo.renderer.substring(0, 30) + '...' : _gpuInfo.renderer;
                _bcosPrint('<pre style="color:#00ff41;font-size:13px;line-height:1.3;">' +
'     (\\(\\     <span style="color:#00aaff;">bcos@bunny</span>\n' +
'    ( -.-)    <span style="color:#e0e0e0;">-----------</span>\n' +
'    /&gt;🐰&gt;     <span style="color:#e0e0e0;">OS:</span> bcos ' + _BCOS_VER + ' (Bunny OS)\n' +
'              <span style="color:#e0e0e0;">Host:</span> GitHub Archive Edition\n' +
'              <span style="color:#e0e0e0;">Kernel:</span> 177.0-repo\n' +
'              <span style="color:#e0e0e0;">Shell:</span> bsh 1.0.0\n' +
'              <span style="color:#e0e0e0;">Terminal:</span> bcos-term\n' +
'              <span style="color:#e0e0e0;">CPU:</span> Bunny Core (4) @ 2.8GHz\n' +
'              <span style="color:#e0e0e0;">GPU:</span> ' + _bcosEscape(gpuShort) + '\n' +
'              <span style="color:#e0e0e0;">GPU Accel:</span> ' + (_gpuInfo.gpuAccelerated ? '✓ Enabled' : 'Disabled') + (_gpuInfo.isAppleSilicon ? ' (Apple Silicon)' : '') + '\n' +
'              <span style="color:#e0e0e0;">Memory:</span> ' + t + ' repos / ' + lc + ' langs\n' +
'              <span style="color:#e0e0e0;">Disk:</span> ' + t + ' entries\n' +
'              <span style="color:#e0e0e0;">Uptime:</span> since 2014-11-09\n' +
'              <span style="color:#e0e0e0;">Stars:</span> * ' + ts + '\n' +
'              <span style="color:#e0e0e0;">Theme:</span> Dark Bunny\n' +
'              <span style="color:#e0e0e0;">Icons:</span> Bunny-Flat</pre>');
            },
            clear: () => { const o = document.getElementById('bcos-output'); if (o) o.innerHTML = ''; },
            cls: () => { const o = document.getElementById('bcos-output'); if (o) o.innerHTML = ''; },
            desktop: () => _bcosLaunchDesktop(),
            exit: () => closeBcosOS(),
            logout: () => closeBcosOS(),
            whoami: () => _bcosPrint('bunny'),
            uname: (args) => { _bcosPrint(args[0] === '-a' ? 'bcos ' + _BCOS_VER + ' (Bunny OS) #177 SMP ' + new Date().toString() + ' x86_64 GNU/Bunny' : 'bcos'); },
            date: () => _bcosPrint(new Date().toString()),
            echo: (args) => _bcosPrint(_bcosEscape(args.join(' '))),
            history: () => { _bcos.history.forEach((c, i) => _bcosPrint('  ' + String(i+1).padStart(3) + '  ' + _bcosEscape(c))); },
            man: (args) => {
                if (!args[0]) { _bcosPrint('<span class="bcos-error">man: What manual page do you want?</span>'); return; }
                const mans = {
                    help: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    help - show available commands\n\nSYNOPSIS\n    help</span>',
                    ls: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    ls - list directory contents\n\nSYNOPSIS\n    ls [PATH|LANGUAGE]\n\nDESCRIPTION\n    List contents of current directory or specified path.\n    At root (~), also lists all repositories.\n    Can filter repos by language.\n\nEXAMPLES\n    ls              List current directory\n    ls me           List me/ folder contents\n    ls desktop      List desktop apps\n    ls C#           Filter repos by language</span>',
                    cat: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    cat - show file content or repository details\n\nSYNOPSIS\n    cat &lt;REPO_NAME | FILE_PATH&gt;\n\nEXAMPLES\n    cat YumikoToys         Show repo details\n    cat me/readme.md       Show file content\n    cat me/edit.lock       Show edit.lock content</span>',
                    open: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    open - open repo on GitHub\n\nSYNOPSIS\n    open &lt;REPO_NAME&gt;</span>',
                    search: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    search - search repositories\n\nSYNOPSIS\n    search &lt;QUERY&gt;</span>',
                    neofetch: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    neofetch - display system info\n\nSYNOPSIS\n    neofetch</span>',
                    desktop: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    desktop - launch desktop environment\n\nSYNOPSIS\n    desktop\n\nDESCRIPTION\n    Switch to GUI mode. Use \'exit\' in desktop to return.</span>',
                    touch: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    touch - create an empty file\n\nSYNOPSIS\n    touch &lt;FILENAME&gt;\n\nDESCRIPTION\n    Create an empty file in the virtual file system.\n    Supports multi-level paths.\n\nEXAMPLES\n    touch notes.txt       Create file in root\n    touch me/readme.md    Create file in me/ folder</span>',
                    mkdir: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    mkdir - create a directory\n\nSYNOPSIS\n    mkdir &lt;DIRNAME&gt;\n\nDESCRIPTION\n    Create a directory in the virtual file system.\n    Supports multi-level paths.\n\nEXAMPLES\n    mkdir projects        Create dir in root\n    mkdir me/notes        Create dir in me/ folder</span>',
                    rm: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    rm - remove a file or directory\n\nSYNOPSIS\n    rm &lt;NAME&gt;\n\nDESCRIPTION\n    Remove a file or directory from the virtual FS.\n    Use rm -rf / at your own risk.</span>',
                    cd: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    cd - change directory\n\nSYNOPSIS\n    cd [DIR]\n\nDESCRIPTION\n    Change the current working directory.\n    Uses ~ as home directory shorthand.\n\nEXAMPLES\n    cd              Go to home\n    cd me           Go to me/ folder\n    cd desktop      Go to desktop/ folder\n    cd ..           Go up one level\n    cd ~/repos      Go to repos/ from anywhere</span>',
                    pwd: '<span class="bcos-info">BCOS(1)  bcos Manual  BCOS(1)\n\nNAME\n    pwd - print working directory\n\nSYNOPSIS\n    pwd</span>',
                };
                if (mans[args[0]]) _bcosPrint(mans[args[0]]); else _bcosPrint('<span class="bcos-error">man: No manual entry for ' + _bcosEscape(args[0]) + '</span>');
            },
            pwd: () => _bcosPrint(_bcosCwd === '~' ? '/home/bunny' : '/home/bunny/' + _bcosCwd.replace(/^~\/?/, '')),
            cd: (args) => {
                const target = args[0] || '~';
                const resolved = _bcosResolvePath(target);
                const node = _bcosGetNodeAtPath(resolved);
                if (!node) {
                    _bcosPrint('<span class="bcos-error">cd: ' + _bcosEscape(target) + ': No such file or directory</span>');
                    return;
                }
                if (node.type !== 'dir') {
                    _bcosPrint('<span class="bcos-error">cd: ' + _bcosEscape(target) + ': Not a directory</span>');
                    return;
                }
                _bcosCwd = resolved;
                // Update prompt path in all terminal instances
                const promptPath = document.querySelector('#bcos-input-line .bcos-prompt-path');
                if (promptPath) promptPath.textContent = _bcosGetPromptPath();
                const mtPromptPath = document.getElementById('bcos-mt-prompt-path');
                if (mtPromptPath) mtPromptPath.textContent = _bcosGetPromptPath();
            },
            tree: () => {
                const lm = {}; _bcosRepos.forEach(r => { if (!lm[r[2]]) lm[r[2]] = []; lm[r[2]].push(r); });
                _bcosPrint('<span class="bcos-info">.</span>');
                const langs = Object.entries(lm).sort((a,b) => b[1].length - a[1].length);
                langs.forEach(([lang, repos], i) => {
                    const isLast = i === langs.length - 1;
                    const c = _bcosLangColors[lang] || '#e0e0e0';
                    _bcosPrint('<span style="color:' + c + ';">' + (isLast ? '`-- ' : '|-- ') + _bcosEscape(lang) + '/ (' + repos.length + ')</span>');
                    repos.slice(0, 5).forEach((r, j) => {
                        const rl = j === Math.min(repos.length, 5) - 1;
                        _bcosPrint('<span class="bcos-dim">' + (isLast ? '    ' : '|   ') + (rl ? '`-- ' : '|-- ') + '</span><span class="bcos-repo-name">' + _bcosEscape(r[0]) + '</span>' + (r[3] > 0 ? ' <span class="bcos-repo-stars">*' + r[3] + '</span>' : ''));
                    });
                    if (repos.length > 5) _bcosPrint('<span class="bcos-dim">' + (isLast ? '    ' : '|   ') + '`-- ... ' + (repos.length - 5) + ' more</span>');
                });
            },
            recent: (args) => {
                const n = parseInt(args[0]) || 10;
                const s = [..._bcosRepos].sort((a,b) => b[5].localeCompare(a[5])).slice(0, n);
                _bcosPrint('<span class="bcos-info">Recent ' + s.length + ' repositories:</span>');
                s.forEach(r => _bcosPrint('  <span class="bcos-repo-date">' + _bcosEscape(r[5]) + '</span>  <span class="bcos-repo-name">' + _bcosEscape(r[0]) + '</span>  <span class="bcos-dim">' + _bcosEscape(r[2]) + '</span>'));
            },
            popular: (args) => {
                const n = parseInt(args[0]) || 10;
                const s = [..._bcosRepos].sort((a,b) => b[3] - a[3]).slice(0, n);
                _bcosPrint('<span class="bcos-info">Top ' + s.length + ' starred repositories:</span>');
                s.forEach((r, i) => _bcosPrint('  ' + String(i+1).padStart(2) + '. <span class="bcos-repo-stars">*' + r[3] + '</span>  <span class="bcos-repo-name">' + _bcosEscape(r[0]) + '</span>  <span class="bcos-dim">' + _bcosEscape(r[2]) + '</span>'));
            },
            // === System control commands ===
            theme: (args) => {
                const curId = document.documentElement.getAttribute('data-theme') || 'bunny';
                const curTheme = CONFIG.THEMES.find(t => t.id === curId);
                if (!args[0]) {
                    _bcosPrint('<span class="bcos-info">===== Current Theme =====</span>');
                    _bcosPrint('  Active: <span style="color:' + (curTheme?.colors[1]||'#FF6B9D') + ';font-weight:bold;">' + (curTheme?.name || curId) + '</span> (' + curId + ')');
                    _bcosPrint('<span class="bcos-info">─── All Themes (' + CONFIG.THEMES.length + ') ───</span>');
                    CONFIG.THEMES.forEach((t, i) => {
                        const isCur = t.id === curId;
                        _bcosPrint('  ' + String(i+1).padStart(2) + '. ' + (isCur ? '▸' : ' ') + ' <span style="color:' + t.colors[1] + ';">' + t.name + '</span> (' + t.id + ')' + (isCur ? ' <span class="bcos-success">← current</span>' : ''));
                    });
                    _bcosPrint('<span class="bcos-dim">Usage: theme &lt;id|name|number&gt;</span>');
                    return;
                }
                const q = args[0].toLowerCase();
                let target = CONFIG.THEMES.find(t => t.id === q) ||
                             CONFIG.THEMES.find(t => t.name.toLowerCase().includes(q)) ||
                             CONFIG.THEMES[parseInt(q) - 1];
                if (!target) { _bcosPrint('<span class="bcos-error">theme: Unknown theme: ' + _bcosEscape(args[0]) + '</span>'); return; }
                setTheme(target.id);
                _bcosPrint('<span class="bcos-success">✓ Theme switched to: ' + target.name + ' (' + target.id + ')</span>');
                _bcosApplyThemeStyle();
            },
            font: (args) => {
                if (!args[0]) {
                    _bcosPrint('<span class="bcos-info">Font scale: ' + (safeGetItem('fontScale','100')) + '%</span>');
                    _bcosPrint('<span class="bcos-dim">Usage: font &lt;80-200|pixel&gt;</span>');
                    return;
                }
                if (args[0] === 'pixel' || args[0] === 'mono') { togglePixelFont(); _bcosPrint('<span class="bcos-success">✓ Pixel font: ' + (pixelFontEnabled ? 'ON' : 'OFF') + '</span>'); return; }
                const pct = parseInt(args[0]);
                if (isNaN(pct) || pct < 80 || pct > 200) { _bcosPrint('<span class="bcos-error">font: Invalid scale. Range: 80-200</span>'); return; }
                setFontScale(pct);
                _bcosPrint('<span class="bcos-success">✓ Font scale set to: ' + pct + '%</span>');
            },
            tabbar: (args) => {
                const modes = ['always', 'auto-collapse', 'hidden'];
                if (!args[0]) { _bcosPrint('<span class="bcos-info">Tab bar mode: ' + (safeGetItem('tabBarMode','always')) + '</span>'); _bcosPrint('<span class="bcos-dim">Usage: tabbar &lt;always|auto|hidden&gt;</span>'); return; }
                const m = args[0] === 'auto' ? 'auto-collapse' : args[0];
                if (!modes.includes(m)) { _bcosPrint('<span class="bcos-error">tabbar: Invalid mode. Options: always, auto, hidden</span>'); return; }
                setTabBarMode(m);
                _bcosPrint('<span class="bcos-success">✓ Tab bar: ' + m + '</span>');
            },
            sidebar: (args) => {
                const modes = ['auto', 'auto-hide', 'locked-open', 'locked-collapsed'];
                if (!args[0]) { _bcosPrint('<span class="bcos-info">Sidebar mode: ' + (safeGetItem('sidebarCollapsed','auto')) + '</span>'); _bcosPrint('<span class="bcos-dim">Usage: sidebar &lt;auto|hide|open|collapsed&gt;</span>'); return; }
                const map = { auto: 'auto', hide: 'auto-hide', open: 'locked-open', collapsed: 'locked-collapsed' };
                const m = map[args[0]] || args[0];
                if (!modes.includes(m)) { _bcosPrint('<span class="bcos-error">sidebar: Invalid mode. Options: auto, hide, open, collapsed</span>'); return; }
                setSidebarMode(m);
                _bcosPrint('<span class="bcos-success">✓ Sidebar: ' + m + '</span>');
            },
            mouse: () => { toggleMouseBunny(); _bcosPrint('<span class="bcos-success">✓ Mouse effect: ' + (safeGetItem('mouseBunny','1') === '1' ? 'ON' : 'OFF') + '</span>'); },
            select: () => { toggleTextSelect(); _bcosPrint('<span class="bcos-success">✓ Text selection: ' + (document.body.classList.contains('no-select') ? 'DISABLED' : 'ENABLED') + '</span>'); },
            avatar: (args) => {
                if (!args[0]) { _bcosPrint('<span class="bcos-dim">Usage: avatar &lt;emoji|photo&gt;</span>'); return; }
                if (args[0] !== 'emoji' && args[0] !== 'photo') { _bcosPrint('<span class="bcos-error">avatar: Invalid option. Use: emoji or photo</span>'); return; }
                setSidebarAvatar(args[0]);
                _bcosPrint('<span class="bcos-success">✓ Avatar: ' + args[0] + '</span>');
            },
            mapsize: (args) => {
                const sizes = ['small', 'medium', 'standard'];
                if (!args[0]) { _bcosPrint('<span class="bcos-info">Map size: ' + (safeGetItem('mapSizePref','medium')) + '</span>'); _bcosPrint('<span class="bcos-dim">Usage: mapsize &lt;small|medium|standard&gt;</span>'); return; }
                if (!sizes.includes(args[0])) { _bcosPrint('<span class="bcos-error">mapsize: Invalid size. Options: small, medium, standard</span>'); return; }
                setMapSize(args[0]); _bcosPrint('<span class="bcos-success">✓ Map size: ' + args[0] + ' (next game)</span>'); },
            players: (args) => {
                if (!args[0]) { _bcosPrint('<span class="bcos-info">Player count: ' + (safeGetItem('playerCountPref','random')) + '</span>'); _bcosPrint('<span class="bcos-dim">Usage: players &lt;random|4|6|8&gt;</span>'); return; }
                setPlayerCount(args[0] === 'random' ? 'random' : parseInt(args[0]));
                _bcosPrint('<span class="bcos-success">✓ Players: ' + _bcosEscape(args[0]) + ' (next game)</span>');
            },
            fullscreen: () => { toggleFullscreen(); _bcosPrint('<span class="bcos-success">✓ Fullscreen toggled</span>'); },
            egg: () => { toggleEggClickTrigger(); _bcosPrint('<span class="bcos-success">✓ Egg click trigger: ' + (safeGetItem('eggClickTrigger','1') === '1' ? 'ON' : 'OFF') + '</span>'); },
            save: (args) => {
                const slot = parseInt(args[0]) - 1;
                if (isNaN(slot) || slot < 0 || slot >= 3) { _bcosPrint('<span class="bcos-error">save: Invalid slot. Usage: save &lt;1-3&gt;</span>'); return; }
                if (typeof mono === 'undefined' || !mono.players) { _bcosPrint('<span class="bcos-error">save: No active game to save</span>'); return; }
                saveToSlot(slot);
                _bcosPrint('<span class="bcos-success">✓ Game saved to slot ' + (slot+1) + '</span>');
            },
            load: (args) => {
                const slot = parseInt(args[0]) - 1;
                if (isNaN(slot) || slot < 0 || slot >= 3) { _bcosPrint('<span class="bcos-error">load: Invalid slot. Usage: load &lt;1-3&gt;</span>'); return; }
                const meta = getSaveSlotMeta(slot);
                if (!meta) { _bcosPrint('<span class="bcos-error">load: Slot ' + (slot+1) + ' is empty</span>'); return; }
                _bcosPrint('<span class="bcos-info">Loading slot ' + (slot+1) + '...</span>');
                closeBcosOS();
                navigateTo('monopoly');
                setTimeout(() => loadSaveSlot(slot), 300);
            },
            saves: () => {
                for (let i = 0; i < 3; i++) {
                    const meta = getSaveSlotMeta(i);
                    if (meta) {
                        _bcosPrint('  <span class="bcos-success">Slot ' + (i+1) + '</span>: Turn ' + meta.turn + ' | ' + (meta.players?.length||0) + ' players | ' + new Date(meta.savedAt).toLocaleString('zh-CN'));
                    } else {
                        _bcosPrint('  <span class="bcos-dim">Slot ' + (i+1) + '</span>: <span class="bcos-dim">empty</span>');
                    }
                }
            },
            settings: () => {
                const curTheme = CONFIG.THEMES.find(t => t.id === (document.documentElement.getAttribute('data-theme')||'bunny'));
                const notifyStatus = !('Notification' in window) ? 'unsupported' : Notification.permission;
                const dvLabel = { home: '🏠 首页', monopoly: '🎲 大富翁', anniversary: '💕 纪念日', settings: '⚙️ 设置', bcos: '🖥️ bcos终端', 'bcos-desktop': '🖥️ bcos桌面' }[safeGetItem('defaultView','home')] || safeGetItem('defaultView','home');
                _bcosPrint('<span class="bcos-info">===== All Settings =====</span>');
                _bcosPrint('<span class="bcos-info">─── Appearance ───</span>');
                _bcosPrint('  Theme:       <span class="bcos-success">' + (curTheme?.name||'bunny') + '</span> (' + (document.documentElement.getAttribute('data-theme')||'bunny') + ')');
                _bcosPrint('  Font scale:  <span class="bcos-success">' + (safeGetItem('fontScale','100')) + '%</span>');
                _bcosPrint('  Pixel font:  <span class="bcos-success">' + (pixelFontEnabled?'ON':'OFF') + '</span>');
                _bcosPrint('  Avatar:      <span class="bcos-success">' + (safeGetItem('sidebarAvatar','emoji')) + '</span>');
                _bcosPrint('<span class="bcos-info">─── Layout ───</span>');
                _bcosPrint('  Tab bar:     <span class="bcos-success">' + (safeGetItem('tabBarMode','always')) + '</span>');
                _bcosPrint('  Sidebar:     <span class="bcos-success">' + (safeGetItem('sidebarCollapsed','auto')) + '</span>');
                _bcosPrint('<span class="bcos-info">─── Behavior ───</span>');
                _bcosPrint('  Mouse fx:    <span class="bcos-success">' + (safeGetItem('mouseBunny','1')==='1'?'ON':'OFF') + '</span>');
                _bcosPrint('  Text select: <span class="bcos-success">' + (document.body.classList.contains('no-select')?'DISABLED':'ENABLED') + '</span>');
                _bcosPrint('  Egg click:   <span class="bcos-success">' + (safeGetItem('eggClickTrigger','1')==='1'?'ON':'OFF') + '</span>');
                _bcosPrint('  Notify:      <span class="bcos-success">' + notifyStatus + '</span>');
                _bcosPrint('  Fullscreen:  <span class="bcos-success">' + (!!document.fullscreenElement?'ON':'OFF') + '</span>');
                _bcosPrint('<span class="bcos-info">─── Game ───</span>');
                _bcosPrint('  Map size:    <span class="bcos-success">' + (safeGetItem('mapSizePref','medium')) + '</span>');
                _bcosPrint('  Players:     <span class="bcos-success">' + (safeGetItem('playerCountPref','random')) + '</span>');
                _bcosPrint('  Dice mult:   <span class="bcos-success">' + (safeGetItem('diceMultiplierPref','1')) + 'x</span>');
                _bcosPrint('<span class="bcos-info">─── Navigation ───</span>');
                _bcosPrint('  Default view:<span class="bcos-success"> ' + dvLabel + '</span>');
                _bcosPrint('<span class="bcos-dim">Tip: Use corresponding commands to change any setting.</span>');
            },
            notify: async () => {
                if (!('Notification' in window)) { _bcosPrint('<span class="bcos-error">notify: Notifications not supported in this browser</span>'); return; }
                if (Notification.permission === 'granted') { _bcosPrint('<span class="bcos-success">✓ Notifications already enabled</span>'); return; }
                if (Notification.permission === 'denied') { _bcosPrint('<span class="bcos-error">notify: Permission denied. Please enable in browser settings.</span>'); return; }
                const perm = await Notification.requestPermission();
                if (perm === 'granted') {
                    _bcosPrint('<span class="bcos-success">✓ Notifications enabled</span>');
                    try { const reg = await navigator.serviceWorker.ready; reg.showNotification('🐰 bcos', { body: 'Notifications activated!', icon: '/icon/192.png' }); } catch(e) {}
                } else {
                    _bcosPrint('<span class="bcos-warn">Notification permission denied</span>');
                }
            },
            install: () => {
                const standalone = isStandaloneMode();
                if (standalone) { _bcosPrint('<span class="bcos-success">✓ Already running in PWA mode</span>'); return; }
                if (_deferredPrompt) { _deferredPrompt.prompt(); _deferredPrompt.userChoice.then(r => { _bcosPrint('<span class="bcos-success">✓ PWA install: ' + r.outcome + '</span>'); _deferredPrompt = null; }); return; }
                const ua = navigator.userAgent;
                const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
                const isAndroid = /Android/i.test(ua);
                const isMacSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua);
                _bcosPrint('<span class="bcos-info">===== PWA Install Guide =====</span>');
                if (isIOS) { _bcosPrint('  iOS: Safari → Share ↗ → Add to Home Screen'); }
                else if (isAndroid) { _bcosPrint('  Android: Chrome menu ⋮ → Install app'); }
                else if (isMacSafari) { _bcosPrint('  macOS Safari: File → Add to Dock'); }
                else { _bcosPrint('  Desktop: Click install icon in address bar'); }
                _bcosPrint('<span class="bcos-dim">Or use Chrome/Edge for one-click install prompt.</span>');
            },
            dice: (args) => {
                const mults = [1, 2, 3, 4];
                if (!args[0]) { _bcosPrint('<span class="bcos-info">Dice multiplier: ' + (safeGetItem('diceMultiplierPref','1')) + 'x</span>'); _bcosPrint('<span class="bcos-dim">Usage: dice &lt;1|2|3|4&gt;  (2x=25% fail, 3x=35%, 4x=45%)</span>'); return; }
                const v = parseInt(args[0]);
                if (!mults.includes(v)) { _bcosPrint('<span class="bcos-error">dice: Invalid multiplier. Options: 1, 2, 3, 4</span>'); return; }
                safeSetItem('diceMultiplierPref', String(v));
                if (typeof mono !== 'undefined' && mono.players && mono.players[0] && mono.currentPlayer === 0 && !mono.rolling) { mono.players[0].diceMultiplier = v; renderMonopoly(); }
                _bcosPrint('<span class="bcos-success">✓ Dice multiplier: ' + v + 'x</span>');
            },
            goto: (args) => {
                const views = { home: 'home', settings: 'settings', monopoly: 'monopoly', game: 'monopoly', anniversary: 'anniversary', logs: 'logs', carlock: 'carlock', car: 'carlock', lock: 'carlock' };
                const v = views[args[0]?.toLowerCase()];
                if (!v) { _bcosPrint('<span class="bcos-error">goto: Unknown view. Options: home, settings, monopoly, anniversary, logs, carlock</span>'); return; }
                if (v === 'carlock') { showBcosCarLockscreen(); return; }
                closeBcosOS(); navigateTo(v);
            },
            default: (args) => {
                const opts = { home: 'home', monopoly: 'monopoly', anniversary: 'anniversary', settings: 'settings', bcos: 'bcos', 'bcos-desktop': 'bcos-desktop', desktop: 'bcos-desktop', terminal: 'bcos', carlock: 'carlock', car: 'carlock' };
                if (!args[0]) { _bcosPrint('<span class="bcos-info">Default view: ' + (safeGetItem('defaultView','home')) + '</span>'); _bcosPrint('<span class="bcos-dim">Usage: default &lt;home|monopoly|anniversary|settings|bcos|desktop|carlock&gt;</span>'); return; }
                const v = opts[args[0].toLowerCase()];
                if (!v) { _bcosPrint('<span class="bcos-error">default: Invalid option. Choices: home, monopoly, anniversary, settings, bcos, desktop, carlock</span>'); return; }
                setDefaultView(v);
                _bcosPrint('<span class="bcos-success">✓ Default view set to: ' + v + '</span>');
            },
            bcos: (args) => {
                const sub = args[0]?.toLowerCase();
                if (!sub) {
                    _bcosPrint('<span class="bcos-info">bcos — Bunny OS Package Manager</span>');
                    _bcosPrint('  <span class="bcos-success">bcos update</span>     Refresh browser storage (clear cache & reload)');
                    _bcosPrint('  <span class="bcos-success">bcos upgrade</span>    View all installed module packages');
                    _bcosPrint('  <span class="bcos-success">bcos version</span>    Show bcos version info');
                    return;
                }
                if (sub === 'update') {
                    _bcosPrint('<span class="bcos-warn">⏳ Refreshing browser storage...</span>');
                    const _doUpdate = async () => {
                        try {
                            _bcosPrint('<span class="bcos-dim">  - Clearing caches...</span>');
                            if ('caches' in window) {
                                const names = await caches.keys();
                                for (const n of names) await caches.delete(n);
                                _bcosPrint('<span class="bcos-dim">  - Cleared ' + names.length + ' cache(s)</span>');
                            }
                            _bcosPrint('<span class="bcos-dim">  - Unregistering service worker...</span>');
                            if ('serviceWorker' in navigator) {
                                const regs = await navigator.serviceWorker.getRegistrations();
                                for (const r of regs) await r.unregister();
                            }
                            _bcosPrint('<span class="bcos-dim">  - Clearing localStorage (preserving saves)...</span>');
                            const _keepKeys = ['mono_save_0', 'mono_save_1', 'mono_save_2', 'mono_save_meta_0', 'mono_save_meta_1', 'mono_save_meta_2', 'cardInventory', 'defaultView', 'theme', 'fontScale', 'pixelFont', 'tabBarMode', 'sidebarCollapsed', 'mouseBunny', 'textSelectDisabled', 'sidebarAvatar', 'mapSizePref', 'playerCountPref', 'diceMultiplierPref', 'eggClickTrigger', 'stockSelectedIdx', 'stockSelectedLeverage'];
                            const _allKeys = Object.keys(localStorage);
                            let cleared = 0;
                            _allKeys.forEach(k => { if (!_keepKeys.includes(k)) { localStorage.removeItem(k); cleared++; } });
                            _bcosPrint('<span class="bcos-dim">  - Cleared ' + cleared + ' localStorage key(s)</span>');
                            _bcosPrint('<span class="bcos-success">✓ Storage refreshed! Reloading in 1.5s...</span>');
                            setTimeout(() => window.location.reload(), 1500);
                        } catch(err) {
                            _bcosPrint('<span class="bcos-error">  - Error during update: ' + _bcosEscape(err.message) + '</span>');
                            _bcosPrint('<span class="bcos-warn">  - Forcing reload anyway in 1.5s...</span>');
                            setTimeout(() => window.location.reload(), 1500);
                        }
                    };
                    _doUpdate();
                    return;
                }
                if (sub === 'upgrade' || sub === 'packages' || sub === 'modules') {
                    const modules = [
                        { name: 'bcos-core',        ver: _BCOS_VER, desc: 'Core system kernel & shell' },
                        { name: 'bcos-terminal',     ver: _BCOS_VER, desc: 'Terminal emulator with fuzzy matching' },
                        { name: 'bcos-desktop',      ver: _BCOS_VER, desc: 'Desktop environment & window manager' },
                        { name: 'bcos-repos',        ver: '177.0', desc: 'GitHub repository archive (177 repos)' },
                        { name: 'bcos-theme',        ver: '1.2.0', desc: '12 theme-adaptive desktop wallpapers & icons' },
                        { name: 'bcos-files',        ver: _BCOS_VER, desc: 'File manager for repository browsing' },
                        { name: 'bcos-vfs',          ver: _BCOS_VER, desc: 'Virtual file system (mkdir/touch/rm/cat)' },
                        { name: 'bcos-monitor',      ver: _BCOS_VER, desc: 'System performance monitor' },
                        { name: 'bcos-commands',     ver: '1.1.0', desc: 'System control commands (theme/font/save/etc)' },
                        { name: 'bcos-defaultview',  ver: _BCOS_VER, desc: 'Default page on visit configuration' },
                        { name: 'bcos-help',         ver: _BCOS_VER, desc: 'Help system & manual pages' },
                        { name: 'bcos-boot',         ver: _BCOS_VER, desc: 'Boot sequence & logo renderer' },
                        { name: 'bcos-windowmgr',    ver: _BCOS_VER, desc: 'Window drag, focus, z-index management' },
                    ];
                    _bcosPrint('<span class="bcos-info">===== bcos Installed Modules (' + modules.length + ') =====</span>');
                    modules.forEach(m => {
                        _bcosPrint('  <span class="bcos-success">' + m.name.padEnd(20) + '</span> <span class="bcos-dim">v' + m.ver.padEnd(7) + '</span> ' + m.desc);
                    });
                    _bcosPrint('<span class="bcos-dim">All packages are up to date. 🐰</span>');
                    return;
                }
                if (sub === 'version' || sub === 'ver' || sub === '-v') {
                    _bcosPrint('bcos ' + _BCOS_VER + ' (Bunny OS)');
                    _bcosPrint('Kernel: 177.0-repo | Shell: bsh 1.0.0');
                    _bcosPrint('Theme engine: v1.2.0 (12 themes)');
                    _bcosPrint('Build: ' + CONFIG.VERSION);
                    return;
                }
                _bcosPrint('<span class="bcos-error">bcos: Unknown subcommand: ' + _bcosEscape(sub) + '</span>');
                _bcosPrint('<span class="bcos-dim">Usage: bcos &lt;update|upgrade|version&gt;</span>');
            },
            sudo: () => _bcosPrint('<span class="bcos-warn">bcos: bunny is not in the sudoers file. This incident will be reported.</span>'),
            rm: (args) => {
                if (args[0] === '-rf' && (args[1] === '/' || args[1] === '/*')) {
                    _bcosPrint('<span class="bcos-warn">bcos: Nice try! The bunny prevented destruction.</span>');
                    return;
                }
                const raw = args.filter(a => !a.startsWith('-')).join(' ');
                if (!raw) {
                    _bcosPrint('<span class="bcos-error">rm: missing operand</span>');
                    _bcosPrint('<span class="bcos-dim">Usage: rm &lt;name&gt;</span>');
                    return;
                }
                const info = _bcosGetVFSNodeAndParent(raw);
                if (!info.parent || !info.parent.children || !info.parent.children[info.name]) {
                    _bcosPrint('<span class="bcos-error">rm: ' + _bcosEscape(raw) + ': No such file or directory</span>');
                    return;
                }
                if (info.name === 'edit.lock' || info.name === 'edit_lock') {
                    _bcosEggState.systemEditLock = false;
                    _bcosEggState.eggTriggered = false;
                    _bcosEggState.userCreatedEditLock = false;
                }
                delete info.parent.children[info.name];
                _bcosPrint('<span class="bcos-success">✓ Removed: ' + _bcosEscape(info.resolved.replace(/^~\/?/, '')) + '</span>');
            },
            mkdir: (args) => {
                const raw = args.filter(a => !a.startsWith('-')).join(' ');
                if (!raw) {
                    _bcosPrint('<span class="bcos-error">mkdir: missing operand</span>');
                    _bcosPrint('<span class="bcos-dim">Usage: mkdir &lt;name&gt;</span>');
                    return;
                }
                const info = _bcosGetVFSNodeAndParent(raw);
                if (!info.parent || info.parent.type !== 'dir') {
                    _bcosPrint('<span class="bcos-error">mkdir: cannot create directory \'' + _bcosEscape(raw) + '\': No such file or directory</span>');
                    return;
                }
                if (info.parent.children[info.name]) {
                    _bcosPrint('<span class="bcos-error">mkdir: ' + _bcosEscape(raw) + ': File exists</span>');
                    return;
                }
                info.parent.children[info.name] = { type: 'dir', children: {} };
                if (info.name === 'edit.lock' || info.name === 'edit_lock') {
                    _bcosEggState.userCreatedEditLock = true;
                }
                _bcosPrint('<span class="bcos-success">✓ Created directory: ' + _bcosEscape(info.resolved.replace(/^~\/?/, '')) + '</span>');
            },
            mk: (args) => _bcosGetCommands().mkdir(args),
            touch: (args) => {
                const raw = args.filter(a => !a.startsWith('-')).join(' ');
                if (!raw) {
                    _bcosPrint('<span class="bcos-error">touch: missing operand</span>');
                    _bcosPrint('<span class="bcos-dim">Usage: touch &lt;name&gt;</span>');
                    return;
                }
                const info = _bcosGetVFSNodeAndParent(raw);
                if (!info.parent || info.parent.type !== 'dir') {
                    _bcosPrint('<span class="bcos-error">touch: cannot touch \'' + _bcosEscape(raw) + '\': No such file or directory</span>');
                    return;
                }
                if (!info.parent.children[info.name]) {
                    info.parent.children[info.name] = { type: 'file', content: '' };
                    if (info.name === 'edit.lock' || info.name === 'edit_lock') {
                        _bcosEggState.userCreatedEditLock = true;
                    }
                }
                _bcosPrint('<span class="bcos-success">✓ Touched: ' + _bcosEscape(info.resolved.replace(/^~\/?/, '')) + '</span>');
            },
            vim: () => _bcosPrint('<span class="bcos-dim">bcos: vim is not installed. Try \'echo\' instead.</span>'),
            nano: () => _bcosPrint('<span class="bcos-dim">bcos: nano is not installed. Try \'echo\' instead.</span>'),
            apt: (args) => _bcosPrint(args[0] === 'install' || args[0] === 'update' ? '<span class="bcos-dim">bcos: All 177 packages are already installed!</span>' : '<span class="bcos-dim">bcos: apt 1.0.0 | Usage: apt [install|update|search]</span>'),
            git: () => _bcosPrint('<span class="bcos-dim">bcos: You ARE the git! 177 repos belong to you.</span>'),
            vi: () => _bcosPrint('<span class="bcos-dim">bcos: vi is not installed.</span>'),
            python: () => _bcosPrint('<span class="bcos-dim">bcos: python is not installed in bcos.</span>'),
            setting: () => _bcosGetCommands().settings(),
            bc: () => _bcosPrint('🐰'),
            gpu: () => {
                _bcosPrint('<span class="bcos-info">===== bcos GPU Acceleration Report =====</span>');
                _bcosPrint('');
                _bcosPrint('  <span class="bcos-success">[Hardware]</span>');
                _bcosPrint('    Vendor:    ' + _bcosEscape(_gpuInfo.vendor));
                _bcosPrint('    Renderer:  ' + _bcosEscape(_gpuInfo.renderer));
                _bcosPrint('    Apple Silicon: ' + (_gpuInfo.isAppleSilicon ? '<span class="bcos-success">✓ Yes (M-series unified memory)</span>' : '<span class="bcos-dim">No</span>'));
                _bcosPrint('    HW Accel:  ' + (_gpuInfo.gpuAccelerated ? '<span class="bcos-success">✓ Enabled</span>' : '<span class="bcos-error">Disabled</span>'));
                _bcosPrint('');
                _bcosPrint('  <span class="bcos-success">[bcos GPU Optimizations]</span>');
                // Check which GPU optimizations are active
                const overlay = document.getElementById('bcos-overlay');
                const wins = overlay ? overlay.querySelectorAll('.bcos-window') : [];
                let gpuLayers = 0, willChangeCount = 0;
                wins.forEach(w => {
                    const cs = getComputedStyle(w);
                    if (cs.willChange && cs.willChange !== 'auto') willChangeCount++;
                    if (cs.transform && cs.transform !== 'none') gpuLayers++;
                });
                _bcosPrint('    Window Drag:      <span class="bcos-success">translate3d() — GPU composited</span>');
                _bcosPrint('    Window Layers:    ' + gpuLayers + ' <span class="bcos-dim">window(s) on GPU layers</span>');
                _bcosPrint('    will-change hints: ' + willChangeCount + ' <span class="bcos-dim">element(s) promoted</span>');
                _bcosPrint('    Desktop Wallpaper: <span class="bcos-success">translateZ(0) — GPU layer</span>');
                _bcosPrint('    Taskbar:           <span class="bcos-success">translateZ(0) — GPU layer</span>');
                _bcosPrint('    Boot Animation:    <span class="bcos-success">opacity+transform — GPU tween</span>');
                _bcosPrint('    Icon Press:        <span class="bcos-success">scale(0.92) — GPU spring</span>');
                _bcosPrint('    Close Button:      <span class="bcos-success">scale(1.15) — GPU hover</span>');
                _bcosPrint('');
                _bcosPrint('  <span class="bcos-success">[Game GPU Pipeline]</span>');
                _bcosPrint('    Trail Canvas:      <span class="bcos-success">2D context + GPU composite</span>');
                _bcosPrint('    Ring Canvas:       <span class="bcos-success">translateZ(0) + will-change</span>');
                _bcosPrint('    Map Strip:         <span class="bcos-success">translateZ(0) virtual scroll</span>');
                _bcosPrint('    Player Dots:       <span class="bcos-success">translateZ(0) per-dot</span>');
                _bcosPrint('    Particles:         <span class="bcos-success">GPU transform/opacity only</span>');
                _bcosPrint('    Mobile Bloom:      <span class="bcos-success">GPU transform — no box-shadow</span>');
                _bcosPrint('');
                _bcosPrint('  <span class="bcos-success">[Render Architecture]</span>');
                _bcosPrint('    API:       <span class="bcos-dim">' + (_gpuInfo.isAppleSilicon ? 'Metal → Apple GPU' : 'WebGL → Browser GPU') + '</span>');
                _bcosPrint('    Compositor: <span class="bcos-dim">Browser-managed (Chrome/Safari)</span>');
                _bcosPrint('    Strategy:   <span class="bcos-dim">Dirty flags + RAF coalescing</span>');
                _bcosPrint('    Map Render: <span class="bcos-dim">O(1) position→player lookup</span>');
                _bcosPrint('');
                _bcosPrint('<span class="bcos-dim">Tip: bcos GPU optimizations are automatically active. No manual toggle needed.</span>');
            },
            anniversary: (args) => {
                const sub = (args[0] || '').toLowerCase();
                if (sub === 'car' || sub === 'lock' || sub === 'lockscreen') {
                    showBcosCarLockscreen();
                    return;
                }
                if (sub === 'gui') {
                    if (_bcos.mode === 'desktop') {
                        _bcosOpenApp('anniversary');
                        _bcosPrint('<span class="bcos-success">✓ Opened Anniversary GUI window</span>');
                    } else {
                        _bcosPrint('<span class="bcos-warn">Switch to desktop mode first (\'desktop\') to open GUI window.</span>');
                    }
                    return;
                }
                if (sub === 'add') {
                    const name = args[1];
                    const date = args[2];
                    const icon = args[3] || '💖';
                    if (!name || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        _bcosPrint('<span class="bcos-error">Usage: anniversary add &lt;name&gt; &lt;YYYY-MM-DD&gt; [icon]</span>');
                        _bcosPrint('<span class="bcos-dim">Example: anniversary add 提车日 2024-11-05 🚗</span>');
                        return;
                    }
                    _bcosAddCustomAnniversary(name, date, icon);
                    _bcosPrint('<span class="bcos-success">✓ Added anniversary: ' + _bcosEscape(name) + ' (' + date + ')</span>');
                    return;
                }
                if (sub === 'del' || sub === 'rm') {
                    const target = args.slice(1).join(' ').toLowerCase();
                    if (!target) {
                        _bcosPrint('<span class="bcos-error">Usage: anniversary del &lt;name|id&gt;</span>');
                        return;
                    }
                    const removed = _bcosRemoveCustomAnniversary(target);
                    if (removed) {
                        _bcosPrint('<span class="bcos-success">✓ Removed anniversary: ' + _bcosEscape(target) + '</span>');
                    } else {
                        _bcosPrint('<span class="bcos-warn">Anniversary not found: ' + _bcosEscape(target) + '</span>');
                    }
                    return;
                }
                const textLines = _bcosGenerateAnniversaryText().split('\n');
                textLines.forEach(l => {
                    if (l.includes('✓') || l.includes('达成')) _bcosPrint('<span class="bcos-success">' + _bcosEscape(l) + '</span>');
                    else if (l.includes('🎯') || l.includes('下一个')) _bcosPrint('<span class="bcos-info">' + _bcosEscape(l) + '</span>');
                    else if (l.includes('🐰') || l.includes('💕')) _bcosPrint('<span style="color:#ff6b9d;font-weight:bold;">' + _bcosEscape(l) + '</span>');
                    else _bcosPrint('<span class="bcos-dim">' + _bcosEscape(l) + '</span>');
                });
                _bcosPrint('<span class="bcos-info">Commands:</span> <span class="bcos-success">car</span> (车机全屏锁屏) | <span class="bcos-success">anniversary gui</span> | <span class="bcos-success">anniversary add &lt;name&gt; &lt;date&gt;</span> | <span class="bcos-success">anniversary del &lt;name&gt;</span>');
            },
            anni: (args) => _bcosGetCommands().anniversary(args),
            monopoly: () => {
                if (_bcos.mode === 'desktop') {
                    _bcosOpenApp('monopoly');
                    _bcosPrint('<span class="bcos-success">✓ Launched: Monopoly Kingdom</span>');
                } else {
                    _bcosLaunchDesktop();
                    setTimeout(() => _bcosOpenApp('monopoly'), 300);
                }
            },
            mono: (args) => _bcosGetCommands().monopoly(args),
            game: (args) => _bcosGetCommands().monopoly(args),
            settings: () => {
                if (_bcos.mode === 'desktop') {
                    _bcosOpenApp('settings');
                    _bcosPrint('<span class="bcos-success">✓ Opened: System Settings</span>');
                } else {
                    _bcosLaunchDesktop();
                    setTimeout(() => _bcosOpenApp('settings'), 300);
                }
            },
            pref: (args) => _bcosGetCommands().settings(args),
            config: (args) => _bcosGetCommands().settings(args),
            logs: () => {
                if (_bcos.mode === 'desktop') {
                    _bcosOpenApp('logs');
                    _bcosPrint('<span class="bcos-success">✓ Opened: System Logs</span>');
                } else {
                    _bcosLaunchDesktop();
                    setTimeout(() => _bcosOpenApp('logs'), 300);
                }
            },
            log: (args) => _bcosGetCommands().logs(args),
            changelog: (args) => _bcosGetCommands().logs(args),
            carlock: () => { showBcosCarLockscreen(); },
            car: () => { showBcosCarLockscreen(); },
            lock: () => { showBcosCarLockscreen(); },
            lockscreen: () => { showBcosCarLockscreen(); },
            screensaver: () => { showBcosCarLockscreen(); },
            app: (args) => {
                const a = (args[0] || '').toLowerCase();
                const appMap = {
                    'texteditor': 'texteditor', 'editor': 'texteditor', 'browser': 'browser',
                    'files': 'files', 'monitor': 'monitor', 'about': 'about', 'terminal': 'terminal', 'me': 'me',
                    'anniversary': 'anniversary', 'anni': 'anniversary',
                    'monopoly': 'monopoly', 'mono': 'monopoly', 'game': 'monopoly',
                    'settings': 'settings', 'pref': 'settings', 'config': 'settings',
                    'logs': 'logs', 'log': 'logs', 'changelog': 'logs',
                    'carlock': 'carlock', 'car': 'carlock', 'lock': 'carlock', 'lockscreen': 'carlock'
                };
                const target = appMap[a];
                if (!target) {
                    _bcosPrint('<span class="bcos-error">app: Unknown application: ' + _bcosEscape(a) + '</span>');
                    _bcosPrint('<span class="bcos-dim">Available apps: terminal, files, monitor, browser, anniversary, monopoly, settings, logs, carlock, texteditor, about</span>');
                    return;
                }
                if (target === 'carlock') { showBcosCarLockscreen(); return; }
                if (_bcos.mode === 'desktop') _bcosOpenApp(target);
                else { _bcosLaunchDesktop(); setTimeout(() => _bcosOpenApp(target), 300); }
            }
        };
    }

    function _bcosExec(cmd) {
        const parts = cmd.split(/\s+/);
        const name = parts[0].toLowerCase();
        const args = parts.slice(1);
        const cmds = _bcosGetCommands();
        // Support ./ prefix for running desktop apps (e.g. ./texteditor, ./browser)
        if (name.startsWith('./')) {
            const appName = name.slice(2);
            const appMap = {
                'texteditor': 'texteditor', 'editor': 'texteditor', 'browser': 'browser',
                'files': 'files', 'monitor': 'monitor', 'about': 'about', 'terminal': 'terminal', 'me': 'me',
                'anniversary': 'anniversary', 'anni': 'anniversary',
                'monopoly': 'monopoly', 'mono': 'monopoly', 'game': 'monopoly',
                'settings': 'settings', 'pref': 'settings', 'config': 'settings',
                'logs': 'logs', 'log': 'logs', 'changelog': 'logs',
                'carlock': 'carlock', 'car': 'carlock', 'lock': 'carlock', 'lockscreen': 'carlock'
            };
            const app = appMap[appName];
            if (app) {
                if (app === 'carlock') {
                    showBcosCarLockscreen();
                    _bcosPrint('<span class="bcos-success">✓ Launched: Car Lock Screen</span>');
                    return;
                }
                if (_bcos.mode !== 'desktop') {
                    _bcosLaunchDesktop();
                    setTimeout(() => _bcosOpenApp(app), 300);
                } else {
                    _bcosOpenApp(app);
                    _bcosPrint('<span class="bcos-success">✓ Launched: ' + _bcosEscape(appName) + '</span>');
                }
                return;
            }
            _bcosPrint('<span class="bcos-cmd-not-found">bcos: ' + _bcosEscape(name) + ': No such application</span>');
            _bcosPrint('<span class="bcos-dim">Available: ./texteditor ./browser ./files ./monitor ./anniversary ./monopoly ./settings ./logs ./carlock ./about</span>');
            return;
        }
        if (cmds[name]) {
            try {
                const result = cmds[name](args);
                if (result && typeof result.then === 'function') {
                    result.catch(err => _bcosPrint('<span class="bcos-cmd-not-found">bcos: error: ' + _bcosEscape(err.message) + '</span>'));
                }
                _bcosEggCheck();
            } catch(err) {
                _bcosPrint('<span class="bcos-cmd-not-found">bcos: error: ' + _bcosEscape(err.message) + '</span>');
            }
        }
        else {
            const match = _bcosFuzzy(name, Object.keys(cmds));
            _bcosPrint('<span class="bcos-cmd-not-found">bcos: command not found: ' + _bcosEscape(name) + '</span>');
            if (match) _bcosPrint('<span class="bcos-suggestion">Did you mean \'' + match + '\'? Type \'' + match + ' --help\' for usage.</span>');
            _bcosPrint('<span class="bcos-dim">Type \'help\' for available commands.</span>');
        }
    }

    function _bcosHandleKey(e) {
        const input = e.target;
        if (e.key === 'Enter') {
            const cmd = input.value;
            _bcos.history.push(cmd);
            if (_bcos.history.length > 100) _bcos.history.shift();
            _bcos.histIdx = _bcos.history.length;
            _bcosPrint('<span class="bcos-prompt-user">bcos</span><span class="bcos-prompt-symbol">@</span><span class="bcos-prompt-host">bunny</span><span class="bcos-prompt-symbol">:</span><span class="bcos-prompt-path">' + _bcosGetPromptPath() + '</span><span class="bcos-prompt-symbol">$</span> ' + _bcosEscape(cmd));
            input.value = '';
            if (cmd.trim()) _bcosExec(cmd.trim());
        } else if (e.key === 'ArrowUp') { e.preventDefault(); if (_bcos.histIdx > 0) { _bcos.histIdx--; input.value = _bcos.history[_bcos.histIdx]; } }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (_bcos.histIdx < _bcos.history.length - 1) { _bcos.histIdx++; input.value = _bcos.history[_bcos.histIdx]; } else { _bcos.histIdx = _bcos.history.length; input.value = ''; } }
        else if (e.key === 'Tab') { e.preventDefault(); _bcosAutocomplete(input); }
        else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); const o = document.getElementById('bcos-output'); if (o) o.innerHTML = ''; }
    }

    let _bcosBooting = false;
    async function _bcosBoot(ov) {
        if (!ov) return;
        if (_bcosBooting) return;
        _bcosBooting = true;
        try {
        ov.classList.add('active');
        ov.innerHTML = '<div id="bcos-screen"><div id="bcos-output"></div><div id="bcos-input-line" style="display:none;"><span class="bcos-prompt-user">bcos</span><span class="bcos-prompt-symbol">@</span><span class="bcos-prompt-host">bunny</span><span class="bcos-prompt-symbol">:</span><span class="bcos-prompt-path">' + _bcosGetPromptPath() + '</span><span class="bcos-prompt-symbol">$&nbsp;</span><input id="bcos-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" /></div></div>';
        _bcos.mode = 'terminal';
        const out = document.getElementById('bcos-output');
        if (!out) { _bcosBooting = false; return; }
        const screen = document.getElementById('bcos-screen');
        const msgs = [
            ['[    0.000000] Booting bcos (Bunny OS) ' + _BCOS_VER + '...', 180],
            ['[    0.000234] CPU: Bunny Core ' + (navigator.hardwareConcurrency || 8) + ' threads @ ' + ((navigator.deviceMemory || 16) * 100) + 'MHz', 120],
            ['[    0.000456] Memory: ' + (navigator.deviceMemory || 16) + 'GB detected', 100],
            ['[    0.000678] Platform: ' + (navigator.platform || 'Unknown') + ' | Agent: ' + (navigator.userAgent.split(') ')[0].split('(').pop() || 'unknown'), 100],
            ['[    0.000789] Kernel command line: bcos.enable_oobe=1 bcos.theme=auto bcos.gpu=1', 90],
            ['[    0.000891] Initializing bunny kernel...', 120],
            ['[    0.000912] <span class="bcos-boot-ok">[ OK ]</span> Set up monotonic clock', 70],
            ['[    0.000934] <span class="bcos-boot-ok">[ OK ]</span> Initialized security module (bunny-secure.ko)', 80],
            ['[    0.001023] <span class="bcos-boot-ok">[ OK ]</span> Registered random entropy source', 70],
            ['[    0.001234] Loading device drivers...', 100],
            ['[    0.001456] <span class="bcos-boot-ok">[ OK ]</span> bunny-input.ko: keyboard/mouse input driver', 90],
            ['[    0.001567] <span class="bcos-boot-ok">[ OK ]</span> bunny-display.ko: GPU compositor driver', 90],
            ['[    0.001678] <span class="bcos-boot-ok">[ OK ]</span> bunny-net.ko: network stack (bunny:// protocol)', 90],
            ['[    0.001789] <span class="bcos-boot-ok">[ OK ]</span> bunny-fs.ko: virtual filesystem driver', 90],
            ['[    0.001812] <span class="bcos-boot-ok">[ OK ]</span> bunny-audio.ko: sound subsystem (Web Audio API)', 80],
            ['[    0.001834] <span class="bcos-boot-ok">[ OK ]</span> bunny-power.ko: power management (sleep/wake)', 80],
            ['[    0.001890] Mounting filesystems...', 100],
            ['[    0.001912] <span class="bcos-boot-ok">[ OK ]</span> Mounted / (rootfs)', 80],
            ['[    0.001934] <span class="bcos-boot-ok">[ OK ]</span> Mounted /me (personal files)', 80],
            ['[    0.001956] <span class="bcos-boot-ok">[ OK ]</span> Mounted /desktop (applications)', 80],
            ['[    0.001978] <span class="bcos-boot-ok">[ OK ]</span> Mounted /tmp (temporary files)', 70],
            ['[    0.001990] <span class="bcos-boot-ok">[ OK ]</span> Mounted /var (variable data)', 70],
            ['[    0.002012] <span class="bcos-dim">[ INFO ]</span> Filesystem check: all volumes clean', 80],
            ['[    0.002045] <span class="bcos-boot-ok">[ OK ]</span> Recovered 0 orphaned inodes', 70],
            ['[    0.002345] Loading GitHub archive module...', 100],
            ['[    0.002456] Fetching repository index from github.com/canguromio...', 120],
            ['[    0.002567] <span class="bcos-dim">[ INFO ]</span> Establishing TLS connection to api.github.com...', 90],
            ['[    0.002678] <span class="bcos-boot-ok">[ OK ]</span> TLS handshake complete (cipher: ECDHE-RSA-AES256-GCM)', 80],
            ['[    0.002789] <span class="bcos-boot-ok">[ OK ]</span> Received repository manifest (177 entries)', 90],
            ['[    0.003001] <span class="bcos-dim">[ INFO ]</span> Parsing repository metadata...', 80],
            ['[    0.003234] <span class="bcos-boot-ok">[ OK ]</span> Indexed 177 repositories', 70],
            ['[    0.003456] <span class="bcos-boot-ok">[ OK ]</span> Categorized 21 programming languages', 70],
            ['[    0.003567] <span class="bcos-boot-ok">[ OK ]</span> Computed 5168 total stars across all repos', 70],
            ['[    0.003678] <span class="bcos-boot-ok">[ OK ]</span> Built repository search index (fuzzy match enabled)', 70],
            ['[    0.003789] <span class="bcos-boot-ok">[ OK ]</span> Mounted /repos filesystem (177 entries)', 80],
            ['[    0.003890] <span class="bcos-boot-ok">[ OK ]</span> Started GitHub Archive Service', 80],
            ['[    0.003912] <span class="bcos-boot-ok">[ OK ]</span> Loaded language support (21 languages)', 80],
            ['[    0.004012] <span class="bcos-dim">[ INFO ]</span> Initializing window manager...', 80],
            ['[    0.004123] <span class="bcos-boot-ok">[ OK ]</span> Compositor: double-buffered rendering enabled', 80],
            ['[    0.004234] <span class="bcos-boot-ok">[ OK ]</span> Window manager: drag/resize/focus/snap ready', 80],
            ['[    0.004345] Starting system services...', 100],
            ['[    0.004456] <span class="bcos-boot-ok">[ OK ]</span> Started bcos Terminal Service (bsh 1.0.0)', 80],
            ['[    0.004567] <span class="bcos-boot-ok">[ OK ]</span> Started bcos Desktop Environment (bwmtk 1.0)', 80],
            ['[    0.004678] <span class="bcos-boot-ok">[ OK ]</span> Started bcos Browser (bunny:// protocol handler)', 80],
            ['[    0.004789] <span class="bcos-boot-ok">[ OK ]</span> Started bcos File Manager (browse 177 repos)', 80],
            ['[    0.004890] <span class="bcos-boot-ok">[ OK ]</span> Started bcos System Monitor (real-time stats)', 80],
            ['[    0.004901] <span class="bcos-boot-ok">[ OK ]</span> Started bcos Text Editor (syntax highlighter, 7 langs)', 80],
            ['[    0.005012] <span class="bcos-boot-ok">[ OK ]</span> Started Theme Engine v1.2.0 (12 themes)', 80],
            ['[    0.005045] <span class="bcos-boot-ok">[ OK ]</span> Started OOBE Welcome Service', 70],
            ['[    0.005067] <span class="bcos-boot-ok">[ OK ]</span> Started Notification Daemon', 70],
            ['[    0.005089] <span class="bcos-boot-ok">[ OK ]</span> Started Power Management Daemon', 70],
            ['[    0.005123] <span class="bcos-boot-ok">[ OK ]</span> Started Session D-Bus', 70],
            ['[    0.005234] Loading user preferences...', 80],
            ['[    0.005345] <span class="bcos-boot-ok">[ OK ]</span> User profile: bunny@bunny-os', 70],
            ['[    0.005456] <span class="bcos-boot-ok">[ OK ]</span> Shell history: ' + (_bcos.history.length || 0) + ' entries', 70],
            ['[    0.005567] <span class="bcos-boot-ok">[ OK ]</span> Desktop wallpaper: theme default', 70],
            ['[    0.005678] <span class="bcos-boot-ok">[ OK ]</span> Loaded keymap: us (qwerty)', 70],
            ['[    0.005789] <span class="bcos-boot-ok">[ OK ]</span> Session initialized — uptime counter started', 70],
            ['[    0.005890] Running startup scripts...', 80],
            ['[    0.005912] <span class="bcos-boot-ok">[ OK ]</span> /etc/bunny/rc.local: initialized me/ folder', 70],
            ['[    0.005934] <span class="bcos-boot-ok">[ OK ]</span> /etc/bunny/welcome.sh: OOBE check passed', 70],
            ['[    0.005956] <span class="bcos-boot-ok">[ OK ]</span> /etc/bunny/compositor.conf: GPU acceleration enabled', 70],
            ['[    0.005978] <span class="bcos-boot-ok">[ OK ]</span> /etc/bunny/theme.conf: applied current theme', 70],
            ['[    0.006000] <span class="bcos-dim">[ INFO ]</span> All services started successfully', 100],
            ['[    0.006023] <span class="bcos-dim">[ INFO ]</span> Boot time: 0.006s — 63 services loaded', 80],
            ['[    0.006111] <span class="bcos-boot-ok">[ OK ]</span> Reached target System Ready', 300],
        ];
        for (const [html, delay] of msgs) {
            const line = document.createElement('div');
            line.className = 'bcos-boot-line';
            line.innerHTML = html;
            out.appendChild(line);
            if (screen) screen.scrollTop = screen.scrollHeight;
            await new Promise(r => setTimeout(r, delay));
        }
        await new Promise(r => setTimeout(r, 300));
        out.innerHTML = '<pre class="bcos-logo">' + _BCOS_BUNNY_ART + '</pre><div class="bcos-welcome">Welcome to bcos ' + _BCOS_VER + ' (Bunny OS)</div><div class="bcos-welcome">GitHub Repository Archive — 177 repositories loaded</div><div class="bcos-last-login">Last login: ' + new Date().toLocaleString('en-US') + '</div><div class="bcos-dim">Type \'help\' for commands, \'desktop\' for GUI mode.</div><br>';
        if (screen) screen.scrollTop = screen.scrollHeight;
        const inputLine = document.getElementById('bcos-input-line');
        const input = document.getElementById('bcos-input');
        if (!inputLine || !input) { _bcosBooting = false; return; }
        inputLine.style.display = 'flex';
        input.focus();
        input.removeEventListener('keydown', _bcosHandleKey);
        input.addEventListener('keydown', _bcosHandleKey);
        if (screen && !screen._bcosClickBound) {
            screen._bcosClickBound = true;
            screen.addEventListener('click', () => { if (_bcos.mode === 'terminal') { const inp = document.getElementById('bcos-input'); if (inp) inp.focus(); } });
        }
        // Show OOBE on first access / version update (terminal mode)
        _bcosShowOOBE(ov);
        } catch(err) { console.error('bcos boot error:', err); }
        finally { _bcosBooting = false; }
    }


    let _bcosCtxMenu = null;
    let _bcosCtxMenuBound = false;
    let _bcosTouchTimer = null;

    function _bcosGetMenubarAvatarHTML() {
        try {
            const type = localStorage.getItem('bcos_menubar_avatar_type') || 'photo';
            if (type === 'emoji') {
                const em = localStorage.getItem('bcos_menubar_avatar_emoji') || '🐰';
                return `<span style="font-size:16px;line-height:1;display:inline-block;">${em}</span>`;
            } else if (type === 'apple') {
                return `<span style="font-size:16px;line-height:1;display:inline-block;"></span>`;
            } else {
                return `<img class="bcos-menubar-avatar-img" src="./dist/Bunny CC_Profile.JPG" alt="兔可可" onerror="this.onerror=null;this.parentElement.innerHTML='🐰';" />`;
            }
        } catch(e) {
            return '🐰';
        }
    }

    function _bcosCycleMenubarAvatar(e) {
        if (e) { e.stopPropagation(); if (e.preventDefault) e.preventDefault(); }
        const current = localStorage.getItem('bcos_menubar_avatar_type') || 'photo';
        const next = current === 'photo' ? 'emoji' : (current === 'emoji' ? 'apple' : 'photo');
        localStorage.setItem('bcos_menubar_avatar_type', next);
        const btn = document.getElementById('bcos-apple-btn');
        if (btn) btn.innerHTML = _bcosGetMenubarAvatarHTML();
        const names = { photo: '🐰 兔可可写真照片', emoji: '✨ 萌兔专属Emoji', apple: ' 经典Apple标志' };
        showToast(`顶栏图标已切换为: ${names[next] || next}`);
    }

    function _bcosGetContextMenuHTML() {
        const avatarMode = (typeof safeGetItem === 'function' ? safeGetItem('sidebarAvatar', 'emoji') : localStorage.getItem('sidebarAvatar')) || 'emoji';
        const isPhoto = avatarMode === 'photo';
        const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        const menubarType = localStorage.getItem('bcos_menubar_avatar_type') || 'photo';
        const menubarBadge = menubarType === 'apple' ? '' : (menubarType === 'emoji' ? 'Emoji' : '照片');
        return `
            <div class="bcos-ctx-header">
                <span>🐰 BCOS COCKPIT OS</span>
                <span class="bcos-ctx-ver">${CONFIG.VERSION}</span>
            </div>
            
            <div class="bcos-ctx-group-title">文件与创作</div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosNewTextFile();_bcosHideCtxMenu()">
                <span class="ctx-icon">📄</span>
                <span class="ctx-text">新建文例文档</span>
                <span class="ctx-shortcut">New</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosOpenApp('texteditor');_bcosHideCtxMenu()">
                <span class="ctx-icon">📝</span>
                <span class="ctx-text">Code Studio 代码编辑</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosOpenApp('appstore');_bcosHideCtxMenu()">
                <span class="ctx-icon">🛍️</span>
                <span class="ctx-text">BCOS 应用商店</span>
                <span class="ctx-badge">Store</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosOpenApp('terminal');_bcosHideCtxMenu()">
                <span class="ctx-icon">💻</span>
                <span class="ctx-text">BCOS 终端控制台</span>
                <span class="ctx-shortcut">~</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();showBcosCarLockscreen();_bcosHideCtxMenu()">
                <span class="ctx-icon">🚗</span>
                <span class="ctx-text">进入车机锁屏</span>
                <span class="ctx-badge">HUD</span>
            </div>

            <div class="bcos-ctx-separator"></div>

            <div class="bcos-ctx-group-title">个性化与外观</div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosCycleDesktopWallpaper();_bcosHideCtxMenu()">
                <span class="ctx-icon">🖼️</span>
                <span class="ctx-text">轮换下一张壁纸</span>
                <span class="ctx-shortcut">Wall</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosCycleDesktopTheme();_bcosHideCtxMenu()">
                <span class="ctx-icon">🎨</span>
                <span class="ctx-text">切换氛围主题</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosCycleMenubarAvatar(event);_bcosHideCtxMenu()">
                <span class="ctx-icon">🐰</span>
                <span class="ctx-text">顶栏图标风格</span>
                <span class="ctx-badge">${menubarBadge}</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosToggleAvatarCtx();_bcosHideCtxMenu()">
                <span class="ctx-icon">${isPhoto ? '📷' : '🐰'}</span>
                <span class="ctx-text">伴侣头像模式</span>
                <span class="ctx-badge" id="ctx-avatar-badge">${isPhoto ? '照片' : 'Emoji'}</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosOpenApp('settings');_bcosHideCtxMenu()">
                <span class="ctx-icon">⚙️</span>
                <span class="ctx-text">系统偏好设置</span>
            </div>

            <div class="bcos-ctx-separator"></div>

            <div class="bcos-ctx-group-title">桌面与系统</div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosRefreshDesktop();_bcosHideCtxMenu()">
                <span class="ctx-icon">🔄</span>
                <span class="ctx-text">刷新桌面</span>
                <span class="ctx-shortcut">F5</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosResetDesktopIcons();_bcosHideCtxMenu()">
                <span class="ctx-icon">🧩</span>
                <span class="ctx-text">恢复默认桌面图标</span>
                <span class="ctx-shortcut">Reset</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosToggleFullscreen();_bcosHideCtxMenu()">
                <span class="ctx-icon">⛶</span>
                <span class="ctx-text">${isFull ? '退出全屏模式' : '进入全屏模式'}</span>
                <span class="ctx-badge" style="color:${isFull ? '#00ff41' : '#aaa'};">${isFull ? '全屏开启' : '窗口模式'}</span>
            </div>
            <div class="bcos-context-menu-item" onclick="event.stopPropagation();event.preventDefault();_bcosOpenApp('about');_bcosHideCtxMenu()">
                <span class="ctx-icon">ℹ️</span>
                <span class="ctx-text">关于 BCOS</span>
            </div>
            <div class="bcos-context-menu-item ctx-danger" onclick="event.stopPropagation();event.preventDefault();closeBcosOS();_bcosHideCtxMenu()">
                <span class="ctx-icon">⏻</span>
                <span class="ctx-text">关机 / 返回主页</span>
            </div>
        `;
    }

    function _bcosShowContextMenuAt(x, y, htmlOverride) {
        let host = document.getElementById('bcos-desktop') || document.getElementById('bcos-overlay') || document.body;
        if (!_bcosCtxMenu || _bcosCtxMenu.parentNode !== host) {
            if (_bcosCtxMenu && _bcosCtxMenu.parentNode) _bcosCtxMenu.remove();
            _bcosCtxMenu = document.createElement('div');
            _bcosCtxMenu.className = 'bcos-context-menu';
            host.appendChild(_bcosCtxMenu);
        }
        _bcosCtxMenu.innerHTML = htmlOverride || _bcosGetContextMenuHTML();
        _bcosCtxMenu.style.display = 'block';
        _bcosCtxMenu.style.left = '0px';
        _bcosCtxMenu.style.top = '0px';
        const w = _bcosCtxMenu.offsetWidth || 240;
        const h = _bcosCtxMenu.offsetHeight || 380;
        if (x + w > window.innerWidth) x = Math.max(10, window.innerWidth - w - 10);
        if (y + h > window.innerHeight) y = Math.max(10, window.innerHeight - h - 10);
        _bcosCtxMenu.style.left = x + 'px';
        _bcosCtxMenu.style.top = y + 'px';
    }

    function _bcosInitContextMenu() {
        if (_bcosCtxMenuBound) return;
        _bcosCtxMenuBound = true;
        document.addEventListener('contextmenu', (e) => {
            const ov = document.getElementById('bcos-overlay');
            if (!ov?.classList.contains('bcos-desktop-mode')) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            e.preventDefault();
            const iconEl = e.target.closest ? e.target.closest('.bcos-desktop-icon') : null;
            if (iconEl && iconEl.dataset && iconEl.dataset.iconId) {
                _bcosShowIconMenuAt(e.clientX, e.clientY, iconEl);
                return;
            }
            _bcosShowContextMenuAt(e.clientX, e.clientY);
        });

        let touchStartPos = null;
        document.addEventListener('touchstart', (e) => {
            const ov = document.getElementById('bcos-overlay');
            if (!ov?.classList.contains('bcos-desktop-mode')) return;
            if (e.touches.length !== 1) return;
            const target = e.target;
            if (target.closest('.bcos-window') || target.closest('.bcos-taskbar') || target.closest('.bcos-context-menu')) return;
            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            const touchIconEl = target.closest('.bcos-desktop-icon');
            clearTimeout(_bcosTouchTimer);
            _bcosTouchTimer = setTimeout(() => {
                if (touchIconEl && touchIconEl.dataset && touchIconEl.dataset.iconId && touchIconEl.isConnected) {
                    _bcosShowIconMenuAt(touchStartPos.x, touchStartPos.y, touchIconEl);
                } else {
                    _bcosShowContextMenuAt(touchStartPos.x, touchStartPos.y);
                }
            }, 550);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (_bcosTouchTimer && touchStartPos && e.touches.length === 1) {
                const dx = Math.abs(e.touches[0].clientX - touchStartPos.x);
                const dy = Math.abs(e.touches[0].clientY - touchStartPos.y);
                if (dx > 10 || dy > 10) clearTimeout(_bcosTouchTimer);
            }
        }, { passive: true });

        document.addEventListener('touchend', () => { clearTimeout(_bcosTouchTimer); }, { passive: true });
        document.addEventListener('touchcancel', () => { clearTimeout(_bcosTouchTimer); }, { passive: true });

        document.addEventListener('click', (e) => {
            if (_bcosCtxMenu && !_bcosCtxMenu.contains(e.target)) _bcosHideCtxMenu();
        });
    }
    function _bcosHideCtxMenu() { if (_bcosCtxMenu) _bcosCtxMenu.style.display = 'none'; }

    // ============================================================================
    // BCOS Desktop Icon Manager — drag to move / rename / delete (persisted)
    // ============================================================================
    