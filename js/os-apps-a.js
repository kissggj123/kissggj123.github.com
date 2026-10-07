function _bcosRefreshStoreIfOpen() {
        if (!document.getElementById('bcos-store-body')) return;
        const tab = window._bcosStoreCurTab || 'featured';
        if (tab === 'studio') return; // never wipe the upload form
        _bcosShowStoreTab(tab);
    }

    function _bcosDeleteDesktopIcon(id) {
        const el = _bcosIconEl(id);
        if (!el) return;
        const lb = el.querySelector('.bcos-desktop-icon-label');
        const name = lb ? lb.textContent : id;
        const kind = _bcosIconKind(id);
        const msg = kind === 'custom' ? '将永久删除该自定义应用及其本地数据，此操作无法撤销。'
            : (kind === 'store' ? '将卸载该应用并移出桌面与 Dock，可随时从应用商店重新获取。'
            : '该图标将从桌面移除（应用本身不受影响），可在桌面右键菜单中选择「恢复默认桌面图标」找回。');
        _bcosDesktopDialog({
            title: '删除「' + name + '」？',
            message: msg,
            okText: kind === 'system' ? '移除' : '删除',
            danger: true,
            onOk: () => {
                const st = _bcosIconStateLoad();
                if (kind === 'system') {
                    (st.icons[id] || (st.icons[id] = {})).hidden = true;
                    _bcosIconStateSave(st);
                    _bcosApplyDesktopIconState();
                } else {
                    if (_bcos.wins[id]) _bcosCloseWin(id);
                    if (kind === 'custom') _bcosSaveCustomApps(_bcosGetCustomApps().filter(a => a.id !== id));
                    delete st.icons[id];
                    _bcosIconStateSave(st);
                    _bcosSetInstalledAppIds(_bcosGetInstalledAppIds().filter(x => x !== id));
                    _bcosRefreshStoreIfOpen();
                }
                showToast('🗑️ 已删除：' + name);
            }
        });
    }

    function _bcosNewTextFile() {
        _bcosOpenApp('texteditor');
        if (document.getElementById('bcos-te-textarea') && typeof _bcosTeNewTab === 'function') {
            _bcosTeNewTab();
            showToast('📄 已新建文本文档并打开 Code Studio');
        }
    }

    function _bcosCycleDesktopWallpaper() {
        const wps = window.BUILTIN_WALLPAPERS || [];
        if (!wps.length) return;
        const curBg = localStorage.getItem('bcosCustomBg');
        const curIdx = wps.findIndex(w => w.file === curBg);
        const nextWp = wps[(curIdx + 1) % wps.length];
        localStorage.setItem('bcosCustomBg', nextWp.file);
        if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
        showToast(`🖼️ 桌面壁纸切换为: ${nextWp.name}`);
    }

    function _bcosCycleDesktopTheme() {
        const themeList = ['bunny', 'dark', 'light', 'cyber', 'candy', 'matrix'];
        const cur = document.documentElement.getAttribute('data-theme') || 'bunny';
        const curIdx = themeList.indexOf(cur);
        const next = themeList[(curIdx + 1) % themeList.length];
        if (typeof setTheme === 'function') setTheme(next);
        else document.documentElement.setAttribute('data-theme', next);
        if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
        const dt = _bcosGetDesktopTheme();
        showToast(`🎨 桌面主题已切换为: ${dt.label || next}`);
    }

    function _bcosToggleAvatarCtx() {
        const cur = (typeof safeGetItem === 'function' ? safeGetItem('sidebarAvatar', 'emoji') : localStorage.getItem('sidebarAvatar')) || 'emoji';
        const next = cur === 'photo' ? 'emoji' : 'photo';
        if (typeof setSidebarAvatar === 'function') setSidebarAvatar(next);
        else if (typeof window.setSidebarAvatar === 'function') window.setSidebarAvatar(next);
        else {
            localStorage.setItem('sidebarAvatar', next);
            if (typeof updateLockscreenAvatar === 'function') updateLockscreenAvatar(next);
            else if (typeof window.updateLockscreenAvatar === 'function') window.updateLockscreenAvatar(next);
        }
        showToast(next === 'photo' ? '🐰 伴侣头像已切换为写真照片' : '🐰 伴侣头像已切换为 Emoji');
    }

    function _bcosRefreshDesktop() {
        if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
        const icons = document.querySelector('.bcos-desktop-icons');
        if (icons) {
            icons.style.animation = 'none';
            icons.offsetHeight;
            icons.style.animation = 'bcosCtxFadeIn .2s ease';
        }
        showToast('🔄 BCOS 桌面已刷新');
    }

    function _bcosToggleFullscreen() {
        try {
            const doc = document;
            const docEl = document.documentElement;
            const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
            if (!isFull) {
                const rfs = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
                if (rfs) rfs.call(docEl).catch(err => console.warn('Request fullscreen prevented:', err));
            } else {
                const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
                if (efs) efs.call(doc).catch(err => console.warn('Exit fullscreen prevented:', err));
            }
        } catch(e) {
            console.warn('Fullscreen error:', e);
        }
    }
    let _bcosEscHandler = null;
    function _bcosBindEsc() {
        if (_bcosEscHandler) return;
        _bcosEscHandler = (e) => {
            if (e.key === 'Escape') {
                if (_bcosCtxMenu && _bcosCtxMenu.style.display !== 'none') {
                    _bcosHideCtxMenu();
                    return;
                }
                const anniModal = document.getElementById('bcos-anni-modal');
                if (anniModal && anniModal.style.display !== 'none') {
                    anniModal.style.display = 'none';
                    return;
                }
                const appleMenu = document.getElementById('bcos-apple-menu');
                if (appleMenu && appleMenu.classList.contains('show')) {
                    _bcosCloseAppleMenu();
                    return;
                }
            }
        };
        document.addEventListener('keydown', _bcosEscHandler);
    }
    function _bcosUnbindEsc() {
        if (_bcosEscHandler) { document.removeEventListener('keydown', _bcosEscHandler); _bcosEscHandler = null; }
    }

    function showBcosOS() {
        closeModal();
        _bcosInjectCSS();
        _bcosActiveOutput = null;
        let ov = document.getElementById('bcos-overlay');
        if (!ov) { ov = document.createElement('div'); ov.id = 'bcos-overlay'; document.body.appendChild(ov); }
        if (_bcos.clockInterval) { clearInterval(_bcos.clockInterval); _bcos.clockInterval = null; }
        _bcos.history = []; _bcos.histIdx = -1; _bcos.mode = 'boot'; _bcos.winZ = 100; _bcos.wins = {}; _bcos.activeWin = null;
        ov.classList.add('active');
        _bcosInitMeFolder();
        // Show boot animation, then launch desktop
        _bcosBootAnimation(ov).then(() => {
            _bcosLaunchDesktop();
        });
    }

    function closeBcosOS(forceExitFullscreen) {
        if (forceExitFullscreen === true) {
            const doc = window.document;
            const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
            if (efs && doc.fullscreenElement) {
                efs.call(doc).catch(()=>{});
            }
        }
        
        const ov = document.getElementById('bcos-overlay');
        if (ov) { 
            ov.classList.remove('bcos-desktop-mode');
            ov.innerHTML = `
                <div style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;z-index:999999;">
                    <img src="./dist/Bunny CC_Profile.JPG" style="width:120px;height:120px;border-radius:50%;object-fit:cover;box-shadow:0 0 20px rgba(255,255,255,0.2);margin-bottom:2rem;border:3px solid #333;" onerror="this.src=''" alt="avatar"/>
                    <h2 style="margin:0 0 2rem;font-weight:400;color:#aaa;">System Halted.</h2>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
                        <button onclick="tryAutoFullscreen();showBcosOS();" style="padding:10px 24px;background:transparent;color:#fff;border:1px solid #555;border-radius:6px;font-size:15px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">
                            ⏻ Reboot (重新开机)
                        </button>
                        <button onclick="navigateTo('home');" style="padding:10px 24px;background:rgba(255,107,157,0.2);color:#ff6b9d;border:1px solid rgba(255,107,157,0.4);border-radius:6px;font-size:15px;cursor:pointer;">
                            🏠 返回经典视图
                        </button>
                    </div>
                </div>`;
        }
        _bcosUnbindEsc();
    }

    const _bcosThemeDesktop = {
        bunny:    { wallpaper: 'linear-gradient(135deg,#FFF0F5 0%,#FFB5BA 50%,#FF6B9D 100%)', grid: 'rgba(255,107,157,.06)', accent: '#FF6B9D', icons: { terminal: '🐰', files: '🌸', monitor: '💖', about: '🎀', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#FF6B9D', label: '棉花糖兔' },
        forest:   { wallpaper: 'linear-gradient(135deg,#F0F7EE 0%,#A5D6A7 50%,#4CAF50 100%)', grid: 'rgba(76,175,80,.06)', accent: '#4CAF50', icons: { terminal: '🌿', files: '🍃', monitor: '🌳', about: '🦌', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#2E7D32', label: '森林兔窝' },
        ocean:    { wallpaper: 'linear-gradient(135deg,#E8F4FD 0%,#7DD3FC 50%,#0EA5E9 100%)', grid: 'rgba(14,165,233,.06)', accent: '#0EA5E9', icons: { terminal: '🐚', files: '🌊', monitor: '🐬', about: '🐟', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#0284C7', label: '海洋蓝' },
        starlight:{ wallpaper: 'linear-gradient(135deg,#1a1a2e 0%,#16213E 50%,#0F3460 100%)', grid: 'rgba(167,139,250,.08)', accent: '#a78bfa', icons: { terminal: '⭐', files: '🌌', monitor: '🔮', about: '🌙', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#0F0F23', label: '星空紫' },
        cyber:    { wallpaper: 'linear-gradient(135deg,#0c0a1d 0%,#1a0B2E 50%,#0c0a1d 100%)', grid: 'rgba(251,191,36,.06)', accent: '#fbbf24', icons: { terminal: '⚡', files: '💾', monitor: '🔥', about: '🤖', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#0c0a1d', label: '赛博朋克' },
        sunset:   { wallpaper: 'linear-gradient(135deg,#FFF3E0 0%,#FFB74D 50%,#FF6B35 100%)', grid: 'rgba(255,107,53,.06)', accent: '#FF6B35', icons: { terminal: '🌅', files: '🌵', monitor: '🔥', about: '🏜️', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#E55100', label: '日落橙' },
        mint:     { wallpaper: 'linear-gradient(135deg,#E8F5E9 0%,#80CBC4 50%,#26A69A 100%)', grid: 'rgba(38,166,154,.06)', accent: '#26A69A', icons: { terminal: '🍵', files: '🌱', monitor: '🫧', about: '🍃', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#00695C', label: '薄荷绿' },
        rose:     { wallpaper: 'linear-gradient(135deg,#FCE4EC 0%,#F48FB1 50%,#E91E63 100%)', grid: 'rgba(233,30,99,.06)', accent: '#E91E63', icons: { terminal: '🌹', files: '💝', monitor: '💎', about: '🦩', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#AD1457', label: '玫瑰金' },
        aurora:   { wallpaper: 'linear-gradient(135deg,#0B1026 0%,#1a2a4a 50%,#0B1026 100%)', grid: 'rgba(6,255,165,.08)', accent: '#06FFA5', icons: { terminal: '🌌', files: '✨', monitor: '🛸', about: '🦊', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#0B1026', label: '极光绿' },
        galaxy:   { wallpaper: 'linear-gradient(135deg,#0F0C29 0%,#302B63 50%,#24243E 100%)', grid: 'rgba(192,132,252,.08)', accent: '#C084FC', icons: { terminal: '🌠', files: '🪐', monitor: '🔭', about: '🌑', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#0F0C29', label: '银河紫' },
        candy:    { wallpaper: 'linear-gradient(135deg,#FFF8E7 0%,#FFD740 50%,#FF4081 100%)', grid: 'rgba(255,64,129,.06)', accent: '#FF4081', icons: { terminal: '🍬', files: '🍭', monitor: '🧁', about: '🍰', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#C2185B', label: '糖果粉' },
        matrix:   { wallpaper: 'linear-gradient(135deg,#000000 0%,#001500 50%,#000000 100%)', grid: 'rgba(0,255,65,.08)', accent: '#00FF41', icons: { terminal: '💻', files: '📡', monitor: '📟', about: '🟢', github: '🌐', browser: '🌐', me: '📁', editor: '📝' }, taskbarBg: '#000000', label: '矩阵绿' },
    };

    function _bcosGetDesktopTheme() {
        const id = document.documentElement.getAttribute('data-theme') || 'bunny';
        return _bcosThemeDesktop[id] || _bcosThemeDesktop.bunny;
    }



    window._bcosApplyDesktopTheme = function() {
        const bg = document.getElementById('bcos-desktop-bg');
        const overlay = document.getElementById('bcos-overlay');
        const taskbar = overlay ? overlay.querySelector('.bcos-taskbar') : null;
        const dt = _bcosGetDesktopTheme();
        if (overlay && dt) {
            overlay.style.setProperty('--bcos-accent', dt.accent);
            overlay.style.setProperty('--bcos-taskbar-bg', dt.taskbarBg);
        }
        if (taskbar && dt) {
            taskbar.style.background = dt.taskbarBg;
        }
        if (typeof _bcosRenderDock === 'function') _bcosRenderDock();
        if (typeof _bcosUpdateDock === 'function') _bcosUpdateDock();
        if (!bg) return;
        let customBg = localStorage.getItem('bcosCustomBg');
        if (customBg) {
            if (window.BUILTIN_WALLPAPERS) {
                const wp = window.BUILTIN_WALLPAPERS.find(w => w.file === customBg);
                if (wp && wp.b64) {
                    if (window.wpBlobCache && window.wpBlobCache[wp.file]) {
                        bg.style.background = `url(${window.wpBlobCache[wp.file]}) center/cover no-repeat`;
                    } else if (window.loadWallpaperBlob) {
                        if (window.WP_PLACEHOLDER && window.WP_PLACEHOLDER[wp.file]) {
                            bg.style.background = `url(${window.WP_PLACEHOLDER[wp.file]}) center/cover no-repeat`;
                        }
                        window.loadWallpaperBlob(wp, null, null).then(blob => {
                            if (!window.wpBlobCache) window.wpBlobCache = {};
                            const url = URL.createObjectURL(blob);
                            window.wpBlobCache[wp.file] = url;
                            if (localStorage.getItem('bcosCustomBg') === customBg) {
                                bg.style.background = `url(${url}) center/cover no-repeat`;
                            }
                        }).catch(e => console.error(e));
                    }
                    return;
                }
            }
            bg.style.background = `url(${customBg}) center/cover no-repeat`;
        } else {
            bg.style.background = dt.wallpaper;
        }
    };

    // ===== BCOS Boot Animation =====
    async function _bcosBootAnimation(ov) {
        return new Promise(resolve => {
            const dt = _bcosGetDesktopTheme();
            const bootHtml = `<div id="bcos-boot-screen">
                <img class="bcos-boot-logo" src="./dist/Bunny CC_Profile.JPG" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="BCOS"/>
                <div style="display:none;width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#06FFA5);align-items:center;justify-content:center;font-size:2.5rem;margin-bottom:1.5rem;">🐰</div>
                <div class="bcos-boot-title">BCOS</div>
                <div class="bcos-boot-ver">Bunny OS · v7.8.6</div>
                <div class="bcos-boot-progress-wrap">
                    <div class="bcos-boot-progress-bar" id="bcos-boot-bar"></div>
                </div>
                <div class="bcos-boot-status" id="bcos-boot-status">Initializing kernel...</div>
                <div class="bcos-boot-dots">
                    <div class="bcos-boot-dot"></div>
                    <div class="bcos-boot-dot"></div>
                    <div class="bcos-boot-dot"></div>
                </div>
            </div>`;
            ov.innerHTML = bootHtml;

            const bar = document.getElementById('bcos-boot-bar');
            const status = document.getElementById('bcos-boot-status');

            function setProgress(pct, msg) {
                if (bar) bar.style.width = pct + '%';
                if (status) status.textContent = msg;
            }

            const steps = [
                { pct: 10,  msg: 'Initializing kernel...', delay: 80 },
                { pct: 22,  msg: 'Mounting file system...', delay: 120 },
                { pct: 35,  msg: 'Loading wallpaper engine...', delay: 100 },
                { pct: 50,  msg: 'Preloading wallpapers from cache...', delay: 150 },
                { pct: 65,  msg: 'Starting window manager...', delay: 100 },
                { pct: 78,  msg: 'Loading user preferences...', delay: 80 },
                { pct: 90,  msg: 'Starting desktop...', delay: 100 },
                { pct: 100, msg: 'Ready.', delay: 200 },
            ];

            // Run background tasks in parallel while showing animation
            const bgTasks = [];
            
            // Task 1: Fetch wallpaper manifest
            if (window.fetchWallpaperManifest) {
                bgTasks.push(new Promise(r => {
                    try { window.fetchWallpaperManifest(false); } catch(e) {}
                    setTimeout(r, 500);
                }));
            }

            // Task 2: Pre-warm IndexedDB
            if (typeof openWallpaperDB !== 'undefined') {
                bgTasks.push(openWallpaperDB().catch(() => {}));
            }

            // Task 3: Load custom bg from cache if needed
            bgTasks.push(new Promise(r => {
                const customBg = localStorage.getItem('bcosCustomBg');
                if (customBg && window.BUILTIN_WALLPAPERS && window.loadWallpaperBlob && window.wpBlobCache) {
                    const wp = window.BUILTIN_WALLPAPERS.find(w => w.file === customBg);
                    if (wp && wp.b64 && !window.wpBlobCache[wp.file]) {
                        window.loadWallpaperBlob(wp, null, null).then(blob => {
                            window.wpBlobCache[wp.file] = URL.createObjectURL(blob);
                            r();
                        }).catch(r);
                        return;
                    }
                }
                r();
            }));

            // Animate progress steps
            let stepIdx = 0;
            let totalDelay = 0;
            steps.forEach((step, i) => {
                totalDelay += step.delay;
                setTimeout(() => {
                    setProgress(step.pct, step.msg);
                    if (i === steps.length - 1) {
                        // Animation done - wait for bg tasks then finish
                        Promise.allSettled(bgTasks).then(() => {
                            setTimeout(() => {
                                const bootScreen = document.getElementById('bcos-boot-screen');
                                if (bootScreen) {
                                    bootScreen.classList.add('fade-out');
                                    setTimeout(() => {
                                        if (bootScreen.parentNode) bootScreen.remove();
                                        resolve();
                                    }, 600);
                                } else {
                                    resolve();
                                }
                            }, 150);
                        });
                    }
                }, totalDelay);
            });
        });
    }

    const BCOS_DOCK_ITEMS = [
        { id: 'appstore', name: 'App Store (应用商店)', icon: '🛍️' },
        { id: 'terminal', name: '终端 (Terminal)', icon: '💻' },
        { id: 'files', name: '访达 (Finder)', icon: '📁' },
        { id: 'browser', name: 'Safari 浏览器', icon: '🌐' },
        { id: 'settings', name: '系统偏好设置', icon: '⚙️' },
        { id: 'carlock', name: '座舱锁屏 (Car Lock)', icon: '🚗' },
        { id: 'anniversary', name: '兔可可纪念日', icon: '💕' },
        { id: 'monopoly', name: '大富翁模拟经营', icon: '🎲' },
        { id: 'monitor', name: '活动监视器', icon: '📊' },
        { id: 'texteditor', name: 'Code Studio 代码编辑', icon: '📝' },
        { id: 'logs', name: '控制台运行日志', icon: '📜' },
        { id: 'about', name: '关于这台 BCOS', icon: 'ℹ️' }
    ];

    function _bcosRenderDock() {
        const dock = document.getElementById('bcos-dock');
        if (!dock) return;
        const dt = _bcosGetDesktopTheme();
        const installed = typeof _bcosGetInstalledAppIds === 'function' ? _bcosGetInstalledAppIds() : [];
        const customs = typeof _bcosGetCustomApps === 'function' ? _bcosGetCustomApps() : [];

        let items = [...BCOS_DOCK_ITEMS];
        const extraDefs = [
            { id: 'calculator', name: '科学计算器', icon: '🧮' },
            { id: 'weather', name: '座舱天气看板', icon: '🌤️' },
            { id: 'notes', name: '桌面便签', icon: '📌' },
            { id: 'radio', name: '兔兔电台', icon: '📻' },
            { id: 'snake', name: '复古贪吃蛇', icon: '🐍' },
            { id: 'paint', name: '像素画板', icon: '🎨' }
        ];
        extraDefs.forEach(app => {
            if (installed.includes(app.id) && !items.some(i => i.id === app.id)) {
                items.push(app);
            }
        });
        customs.forEach(c => {
            if (installed.includes(c.id) && !items.some(i => i.id === c.id)) {
                items.push({ id: c.id, name: c.name, icon: c.icon || '📦' });
            }
        });

        const now = new Date();
        const calMonth = (now.getMonth() + 1) + '月';
        const calDay = now.getDate();
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dayStr = days[now.getDay()];
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        const dockHtml = items.map(item => {
            const icon = (dt && dt.icons && dt.icons[item.id]) ? dt.icons[item.id] : item.icon;
            const isOpen = !!_bcos.wins[item.id];
            const isActive = _bcos.activeWin === item.id;
            const cls = 'bcos-dock-item' + (isOpen ? ' open' : '') + (isActive ? ' active' : '');
            return `<div class="${cls}" id="bcos-dock-${item.id}" onclick="_bcosDockClick('${item.id}')" title="${item.name}">
                <div class="bcos-dock-tooltip">${item.name}</div>
                <div class="bcos-dock-icon-box">${icon}</div>
                <div class="bcos-dock-dot"></div>
            </div>`;
        }).join('');

        const clockWidgetHtml = `
            <div class="bcos-dock-divider"></div>
            <div class="bcos-dock-clock-widget" id="bcos-dock-clock-widget" onclick="_bcosOpenApp('settings')" title="点击打开系统设置与日期">
                <div class="bcos-dock-cal-box">
                    <div class="bcos-dock-cal-month" id="bcos-dock-cal-m">${calMonth}</div>
                    <div class="bcos-dock-cal-day" id="bcos-dock-cal-d">${calDay}</div>
                </div>
                <div class="bcos-dock-clock-text hide-on-mobile">
                    <div class="bcos-dock-clock-time" id="bcos-dock-clock-t">${hh}:${mm}:${ss}</div>
                    <div class="bcos-dock-clock-date" id="bcos-dock-clock-dt">${calMonth}${calDay}日 ${dayStr}</div>
                </div>
            </div>
        `;

        dock.innerHTML = dockHtml + clockWidgetHtml;
    }

    function _bcosUpdateDock() {
        const dock = document.getElementById('bcos-dock');
        if (!dock) return;
        const allDockItems = dock.querySelectorAll('.bcos-dock-item');
        allDockItems.forEach(el => {
            const id = el.id.replace('bcos-dock-', '');
            const isOpen = !!_bcos.wins[id];
            const isActive = _bcos.activeWin === id;
            el.classList.toggle('open', isOpen);
            el.classList.toggle('active', isActive);
        });

        const appTitleEl = document.getElementById('bcos-menubar-appname');
        if (appTitleEl) {
            const titleMap = {
                appstore: 'App Store', calculator: 'Calculator', weather: 'Weather HUD', notes: 'Notes',
                radio: 'Lo-Fi Radio', snake: 'Snake', paint: 'Pixel Paint',
                terminal: 'Terminal', files: 'Finder', monitor: 'Activity Monitor', about: 'About BCOS',
                browser: 'Safari', me: 'Finder', texteditor: 'Code Studio Pro', anniversary: 'Anniversary',
                monopoly: 'Monopoly', settings: 'System Settings', logs: 'Console'
            };
            let title = 'Bunny Cockpit OS';
            if (_bcos.activeWin) {
                if (titleMap[_bcos.activeWin]) {
                    title = titleMap[_bcos.activeWin];
                } else if (String(_bcos.activeWin).indexOf('custom_app_') === 0) {
                    const customs = (typeof _bcosGetCustomApps === 'function') ? _bcosGetCustomApps() : [];
                    const a = customs.find(x => x.id === _bcos.activeWin);
                    title = (a && a.name) ? a.name : 'Custom App';
                } else {
                    title = _bcos.activeWin;
                }
            }
            appTitleEl.textContent = title;
        }
    }

    function _bcosDockClick(app) {
        if (app === 'carlock' || app === 'car' || app === 'lock') {
            showBcosCarLockscreen();
            return;
        }
        const winId = _bcos.wins[app];
        if (winId) {
            const win = document.getElementById(winId);
            if (win) {
                if (_bcos.activeWin === app && win.style.display !== 'none') {
                    _bcosMinimizeWin(app);
                } else {
                    _bcosFocusWin(app);
                }
                return;
            }
        }
        _bcosOpenApp(app);
    }
    function _bcosToggleAppleMenu(e) {
        if (e) e.stopPropagation();
        const menu = document.getElementById('bcos-apple-menu');
        const btn = document.getElementById('bcos-apple-btn');
        if (menu) {
            menu.classList.toggle('show');
            if (btn) btn.classList.toggle('active', menu.classList.contains('show'));
        }
    }

    function _bcosCloseAppleMenu() {
        const menu = document.getElementById('bcos-apple-menu');
        const btn = document.getElementById('bcos-apple-btn');
        if (menu) menu.classList.remove('show');
        if (btn) btn.classList.remove('active');
    }

    function _bcosLaunchDesktop() {
        if (_bcos.clockInterval) clearInterval(_bcos.clockInterval);
        _bcos.mode = 'desktop';
        const ov = document.getElementById('bcos-overlay');
        ov.classList.add('bcos-desktop-mode'); // Enable carrot cursor
        const dt = _bcosGetDesktopTheme();
        const meX = 60 + Math.random() * 80;
        const meY = 40 + Math.random() * 60;
        ov.innerHTML = `<div id="bcos-desktop">
            <!-- macOS Top Menu Bar -->
            <div class="bcos-menubar" id="bcos-menubar">
                <div class="bcos-menubar-left">
                    <div class="bcos-menubar-apple bcos-menubar-avatar-btn" id="bcos-apple-btn" onclick="_bcosToggleAppleMenu(event)" oncontextmenu="_bcosCycleMenubarAvatar(event);return false;" title="兔可可系统菜单 (右键快速切换图标样式)">${_bcosGetMenubarAvatarHTML()}</div>
                    <div class="bcos-menubar-appname" id="bcos-menubar-appname">Bunny Cockpit OS</div>
                    <div class="bcos-menubar-item hide-on-mobile" onclick="_bcosOpenApp('about')">关于</div>
                    <div class="bcos-menubar-item hide-on-mobile" onclick="_bcosOpenApp('appstore')">应用商店</div>
                    <div class="bcos-menubar-item hide-on-mobile" onclick="_bcosOpenApp('settings')">设置</div>
                    <div class="bcos-menubar-item hide-on-mobile" onclick="showBcosCarLockscreen()">车机</div>
                </div>
                <div class="bcos-menubar-right">
                    <div class="bcos-menubar-status-item" id="bcos-menubar-battery" onclick="_bcosOpenApp('settings')" title="车辆与电池状态">⚡ 88%</div>
                    <div class="bcos-menubar-status-item" onclick="_bcosToggleFullscreen()" title="切换全屏">⛶</div>
                    <div class="bcos-menubar-clock" id="bcos-clock">--:--</div>
                </div>
            </div>

            <!-- macOS Apple Menu Dropdown -->
            <div class="bcos-apple-menu" id="bcos-apple-menu">
                <div class="bcos-apple-menu-item" onclick="_bcosCycleMenubarAvatar(event); _bcosCloseAppleMenu();">
                    <span>🐰</span><span>切换顶栏图标样式 (照片/Emoji/经典)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('appstore'); _bcosCloseAppleMenu();">
                    <span>🛍️</span><span>应用商店 (App Store)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('about'); _bcosCloseAppleMenu();">
                    <span>ℹ️</span><span>关于这台 BCOS (About)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('settings'); _bcosCloseAppleMenu();">
                    <span>⚙️</span><span>系统偏好设置 (Settings)</span>
                </div>
                <div class="bcos-apple-menu-sep"></div>
                <div class="bcos-apple-menu-item" onclick="showBcosCarLockscreen(); _bcosCloseAppleMenu();">
                    <span>🚗</span><span>进入座舱锁屏 (Car Lock Screen)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('terminal'); _bcosCloseAppleMenu();">
                    <span>💻</span><span>终端控制台 (Terminal)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('files'); _bcosCloseAppleMenu();">
                    <span>📁</span><span>访达 / 文件管理 (Finder)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('monitor'); _bcosCloseAppleMenu();">
                    <span>📊</span><span>活动监视器 (Activity Monitor)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('browser'); _bcosCloseAppleMenu();">
                    <span>🌐</span><span>Safari 浏览器 (Browser)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('anniversary'); _bcosCloseAppleMenu();">
                    <span>💕</span><span>兔可可纪念日 (Anniversary)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('monopoly'); _bcosCloseAppleMenu();">
                    <span>🎲</span><span>大富翁模拟经营 (Monopoly)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('texteditor'); _bcosCloseAppleMenu();">
                    <span>📝</span><span>Code Studio 代码编辑器</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosOpenApp('logs'); _bcosCloseAppleMenu();">
                    <span>📜</span><span>控制台运行日志 (Console Logs)</span>
                </div>
                <div class="bcos-apple-menu-sep"></div>
                <div class="bcos-apple-menu-item" onclick="_bcosToggleFullscreen(); _bcosCloseAppleMenu();">
                    <span>⛶</span><span>切换全屏模式 (Fullscreen)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="_bcosBackToTerminal(); _bcosCloseAppleMenu();">
                    <span>⌨️</span><span>返回纯命令行终端 (Terminal CLI)</span>
                </div>
                <div class="bcos-apple-menu-item" onclick="closeBcosOS(); _bcosCloseAppleMenu();">
                    <span>⏻</span><span>退出 BCOS 返回经典视图 (Exit)</span>
                </div>
            </div>

            <!-- Wallpaper and Icons -->
            <div class="bcos-desktop-wallpaper" id="bcos-desktop-bg" style="background:${dt.wallpaper};">
                <div class="bcos-desktop-icons">
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('appstore')"><div class="bcos-desktop-icon-emoji">🛍️</div><div class="bcos-desktop-icon-label">App Store</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('terminal')"><div class="bcos-desktop-icon-emoji">${dt.icons.terminal}</div><div class="bcos-desktop-icon-label">Terminal</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('files')"><div class="bcos-desktop-icon-emoji">${dt.icons.files}</div><div class="bcos-desktop-icon-label">Files</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('monitor')"><div class="bcos-desktop-icon-emoji">${dt.icons.monitor}</div><div class="bcos-desktop-icon-label">Monitor</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('browser')"><div class="bcos-desktop-icon-emoji">${dt.icons.browser}</div><div class="bcos-desktop-icon-label">Browser</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('anniversary')"><div class="bcos-desktop-icon-emoji">${dt.icons.anniversary||'💕'}</div><div class="bcos-desktop-icon-label">纪念日</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('monopoly')"><div class="bcos-desktop-icon-emoji">🎲</div><div class="bcos-desktop-icon-label">大富翁</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('settings')"><div class="bcos-desktop-icon-emoji">⚙️</div><div class="bcos-desktop-icon-label">系统设置</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('logs')"><div class="bcos-desktop-icon-emoji">📜</div><div class="bcos-desktop-icon-label">运行日志</div></div>
                    <div class="bcos-desktop-icon" onclick="showBcosCarLockscreen()"><div class="bcos-desktop-icon-emoji">${dt.icons.car||'🚗'}</div><div class="bcos-desktop-icon-label">车机锁屏</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('texteditor')"><div class="bcos-desktop-icon-emoji">${dt.icons.editor||'📝'}</div><div class="bcos-desktop-icon-label">Code Studio</div></div>
                    <div class="bcos-desktop-icon" onclick="_bcosOpenApp('about')"><div class="bcos-desktop-icon-emoji">${dt.icons.about}</div><div class="bcos-desktop-icon-label">About</div></div>
                </div>
                <div class="bcos-desktop-icon" style="position:absolute;right:${meX}px;top:${meY + 32}px;" onclick="_bcosOpenApp('me')"><div class="bcos-desktop-icon-emoji">${dt.icons.me}</div><div class="bcos-desktop-icon-label">me</div></div>
                <div id="bcos-windows"></div>
            </div>

            <!-- macOS Floating Dock -->
            <div class="bcos-dock-wrap">
                <div class="bcos-dock" id="bcos-dock"></div>
            </div>
        </div>`;
        _bcosRenderDock();
        _bcosUpdateDock();
        if (typeof _bcosSyncDesktopAppIcons === 'function') _bcosSyncDesktopAppIcons();
        _bcosUpdateClock();
        _bcos.clockInterval = setInterval(_bcosUpdateClock, 1000);
        const bg = document.getElementById('bcos-desktop-bg');
        if (bg) {
            bg.addEventListener('touchmove', e => {
                if (e.target === bg) e.preventDefault();
            }, {passive:false});
            bg.addEventListener('click', () => {
                _bcosCloseAppleMenu();
                const m = document.getElementById('bcos-start-menu'); if (m) m.classList.remove('show');
            });
        }
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#bcos-apple-menu') && !e.target.closest('#bcos-apple-btn')) {
                _bcosCloseAppleMenu();
            }
        });
        _bcosBindEsc();
        if (typeof _bcosInitContextMenu === 'function') _bcosInitContextMenu();
        _bcosShowOOBE(ov);
        if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
    }
    function _bcosUpdateClock() {
        const n = new Date();
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const shortDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dayStr = days[n.getDay()];
        const shortDay = shortDays[n.getDay()];
        const month = n.getMonth() + 1;
        const date = n.getDate();
        const hh = String(n.getHours()).padStart(2, '0');
        const mm = String(n.getMinutes()).padStart(2, '0');
        const ss = String(n.getSeconds()).padStart(2, '0');

        // 1. macOS Top Menubar Clock
        const c = document.getElementById('bcos-clock');
        if (c) {
            c.textContent = `${shortDay} ${month}月${date}日 ${hh}:${mm}:${ss}`;
        }

        // 2. Dock Live Calendar & Clock Widget
        const dockM = document.getElementById('bcos-dock-cal-m');
        if (dockM) dockM.textContent = month + '月';
        const dockD = document.getElementById('bcos-dock-cal-d');
        if (dockD) dockD.textContent = date;
        const dockT = document.getElementById('bcos-dock-clock-t');
        if (dockT) dockT.textContent = `${hh}:${mm}:${ss}`;
        const dockDt = document.getElementById('bcos-dock-clock-dt');
        if (dockDt) dockDt.textContent = `${month}月${date}日 ${shortDay}`;
        const dockWidget = document.getElementById('bcos-dock-clock-widget');
        if (dockWidget) dockWidget.title = `${n.getFullYear()}年${month}月${date}日 ${dayStr} ${hh}:${mm}:${ss} (点击打开设置)`;

        // 3. Menubar Battery Status
        const b = document.getElementById('bcos-menubar-battery') || document.getElementById('bcos-taskbar-battery');
        if (b) {
            const soc = localStorage.getItem('car_soc') || '88';
            b.textContent = '⚡ ' + soc + '%';
        }
    }
    function _bcosToggleStartMenu() { _bcosToggleAppleMenu(); }
    function _bcosBackToTerminal() {
        if (_bcos.clockInterval) { clearInterval(_bcos.clockInterval); _bcos.clockInterval = null; }
        if (_bcosMonitorTimer) { clearInterval(_bcosMonitorTimer); _bcosMonitorTimer = null; }
        _bcos.wins = {}; _bcos.activeWin = null; _bcos.mode = 'terminal';
        _bcosActiveOutput = null; // Clear stale desktop terminal reference
        const ov = document.getElementById('bcos-overlay');
        if (!ov) return;
        ov.classList.remove('bcos-desktop-mode'); // Disable carrot cursor
        // Lightweight switch: restore terminal UI without replaying boot sequence
        // Preserve command history and output if terminal was previously active
        const prevHistory = _bcos.history || [];
        ov.innerHTML = '<div id="bcos-screen"><div id="bcos-output"></div><div id="bcos-input-line" style="display:flex;"><span class="bcos-prompt-user">bcos</span><span class="bcos-prompt-symbol">@</span><span class="bcos-prompt-host">bunny</span><span class="bcos-prompt-symbol">:</span><span class="bcos-prompt-path">' + _bcosGetPromptPath() + '</span><span class="bcos-prompt-symbol">$&nbsp;</span><input id="bcos-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" /></div></div>';
        const out = document.getElementById('bcos-output');
        if (out) {
            out.innerHTML = '<pre class="bcos-logo">' + _BCOS_BUNNY_ART + '</pre><div class="bcos-welcome">Welcome back to bcos ' + _BCOS_VER + ' (Bunny OS)</div><div class="bcos-welcome">GitHub Repository Archive — 177 repositories loaded</div><div class="bcos-dim">Type \'help\' for commands, \'desktop\' for GUI mode.</div><br>';
        }
        const input = document.getElementById('bcos-input');
        const screen = document.getElementById('bcos-screen');
        if (input) {
            _bcos.history = prevHistory; _bcos.histIdx = prevHistory.length;
            input.removeEventListener('keydown', _bcosHandleKey);
            input.addEventListener('keydown', _bcosHandleKey);
            input.focus();
        }
        if (screen && !screen._bcosClickBound) {
            screen._bcosClickBound = true;
            screen.addEventListener('click', () => { if (_bcos.mode === 'terminal') { const inp = document.getElementById('bcos-input'); if (inp) inp.focus(); } });
        }
        _bcosBindEsc();
        if (typeof _bcosInitContextMenu === 'function') _bcosInitContextMenu();
    }

    function _bcosOpenApp(app) {
        if (app === 'carlock' || app === 'car' || app === 'lock') {
            showBcosCarLockscreen();
            return;
        }
        if (_bcos.wins[app]) { _bcosFocusWin(app); return; }
        const apps = {
            appstore: { t: '🛍️ BCOS App Store — 兔可可应用商店', w: 820, h: 560 },
            calculator: { t: '🧮 科学计算器 — Calculator', w: 340, h: 480 },
            weather: { t: '🌤️ 座舱天气看板 — Weather HUD', w: 480, h: 440 },
            notes: { t: '📌 桌面便利贴 — Sticky Notes', w: 400, h: 420 },
            radio: { t: '📻 兔兔电台 Lo-Fi — Radio Station', w: 440, h: 380 },
            snake: { t: '🐍 复古像素贪吃蛇 — Snake Adventure', w: 440, h: 500 },
            paint: { t: '🎨 像素画板 Studio — Pixel Paint', w: 540, h: 480 },
            terminal: { t: 'Terminal — bcos@bunny', w: 520, h: 360 },
            files: { t: 'File Manager — bcos', w: 520, h: 400 },
            monitor: { t: 'System Monitor — bcos', w: 460, h: 360 },
            about: { t: 'About bcos', w: 420, h: 360 },
            browser: { t: 'Browser — bcos', w: 560, h: 420 },
            me: { t: 'me — File Explorer', w: 400, h: 320 },
            texteditor: { t: '📝 Code Studio Pro — 文本代码编辑', w: 720, h: 500 },
            anniversary: { t: '💕 兔可可纪念日 — Anniversary', w: 640, h: 520 },
            monopoly: { t: '🎲 大富翁模拟经营 — Monopoly Kingdom', w: 880, h: 580 },
            settings: { t: '⚙️ 系统设置 — System Settings', w: 720, h: 520 },
            logs: { t: '📜 系统运行日志 — System Logs', w: 680, h: 480 }
        };
        let cfg = apps[app];
        if (!cfg && app.startsWith('custom_app_')) {
            const customs = typeof _bcosGetCustomApps === 'function' ? _bcosGetCustomApps() : [];
            const found = customs.find(c => c.id === app);
            if (found) {
                cfg = { t: `${_bcosEscape(found.icon || '📦')} ${_bcosEscape(found.name)} — Custom App`, w: 680, h: 500 };
            }
        }
        if (!cfg) return;

        const winId = 'bcos-win-' + app;
        const container = document.getElementById('bcos-windows');
        if (!container) return;
        const win = document.createElement('div');
        win.className = 'bcos-window active-window'; win.id = winId; win.style.zIndex = ++_bcos.winZ;
        const offset = (Object.keys(_bcos.wins).length * 28) % 180;
        const isMobile = window.innerWidth <= 768;
        const maxW = isMobile ? Math.min(cfg.w, window.innerWidth - 12) : Math.min(cfg.w, Math.max(340, window.innerWidth - 24));
        const maxH = isMobile ? Math.min(cfg.h, window.innerHeight - 96) : Math.min(cfg.h, Math.max(280, window.innerHeight - 90));
        const leftX = isMobile ? 6 : Math.max(12, Math.min(36 + offset, Math.max(12, window.innerWidth - maxW - 20)));
        const topY = isMobile ? 34 : Math.max(38, Math.min(42 + offset, Math.max(38, window.innerHeight - maxH - 64)));
        if (!isMobile) {
            win.style.cssText += `left:0;top:0;width:${maxW}px;height:${maxH}px;transform:translate3d(${leftX}px, ${topY}px, 0);`;
        }
        win._bcosTX = leftX; win._bcosTY = topY;
        win._bcosOrigW = maxW; win._bcosOrigH = maxH;
        win.innerHTML = `<div class="bcos-window-titlebar" onmousedown="_bcosDragStart('${winId}',event)" ontouchstart="_bcosTouchDragStart('${winId}',event)" ondblclick="_bcosToggleMaximize('${winId}',event)"><div class="bcos-window-controls"><button class="bcos-window-btn bcos-win-btn-close" title="关闭" onmousedown="event.stopPropagation(); _bcosCloseWin('${app}')" ontouchstart="event.stopPropagation(); event.preventDefault(); _bcosCloseWin('${app}')" onclick="event.stopPropagation(); _bcosCloseWin('${app}')"></button><button class="bcos-window-btn bcos-win-btn-min" title="最小化" onmousedown="event.stopPropagation(); _bcosMinimizeWin('${app}')" ontouchstart="event.stopPropagation(); event.preventDefault(); _bcosMinimizeWin('${app}')" onclick="event.stopPropagation(); _bcosMinimizeWin('${app}')"></button><button class="bcos-window-btn bcos-win-btn-max" title="最大化" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation(); event.preventDefault(); _bcosToggleMaximize('${winId}',event,true)" onclick="event.stopPropagation(); _bcosToggleMaximize('${winId}',event,true)"></button></div><span class="bcos-window-title">${cfg.t}</span><div style="width:48px;"></div></div><div class="bcos-window-content" id="${winId}-content"></div><div class="bcos-window-resize" onmousedown="_bcosResizeStart('${winId}',event)"></div>`;
        container.appendChild(win);
        _bcos.wins[app] = winId;
        _bcos.activeWin = app;
        document.querySelectorAll('.bcos-window').forEach(w => { if (w !== win) w.classList.remove('active-window'); });
        win.addEventListener('mousedown', () => _bcosFocusWin(app));
        win.addEventListener('touchstart', () => _bcosFocusWin(app), { passive: true });
        const content = document.getElementById(winId + '-content');
        try {
            if (app === 'terminal') _bcosRenderDesktopTerminal(content);
            else if (app === 'files') _bcosRenderFileManager(content);
            else if (app === 'monitor') _bcosRenderMonitor(content);
            else if (app === 'about') _bcosRenderAbout(content);
            else if (app === 'browser') _bcosRenderBrowser(content);
            else if (app === 'me') _bcosRenderMeFolder(content);
            else if (app === 'texteditor') _bcosRenderTextEditor(content);
            else if (app === 'anniversary') _bcosRenderAnniversaryApp(content);
            else if (app === 'monopoly') _bcosRenderMonopolyApp(content);
            else if (app === 'settings') _bcosRenderSettingsApp(content);
            else if (app === 'logs') _bcosRenderLogsApp(content);
            else if (app === 'appstore') _bcosRenderAppStore(content);
            else if (app === 'calculator') _bcosRenderCalculator(content);
            else if (app === 'weather') _bcosRenderWeather(content);
            else if (app === 'notes') _bcosRenderNotes(content);
            else if (app === 'radio') _bcosRenderRadio(content);
            else if (app === 'snake') _bcosRenderSnake(content);
            else if (app === 'paint') _bcosRenderPaint(content);
            else if (app.startsWith('custom_app_')) _bcosRenderCustomApp(content, app);
        } catch(err) {
            if (content) content.innerHTML = '<div style="color:#f44;padding:.5rem;font-size:12px;">Error loading app: ' + _bcosEscape(err.message) + '</div>';
            console.error('bcos app render error:', err);
        }
        _bcosUpdateTaskbar();
        if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme();
    }

    function _bcosFocusWin(app) {
        const w = document.getElementById(_bcos.wins[app]);
        if (!w) return;
        if (w.style.display === 'none') w.style.display = 'flex';
        w.style.zIndex = ++_bcos.winZ;
        _bcos.activeWin = app;
        document.querySelectorAll('.bcos-window').forEach(win => win.classList.remove('active-window'));
        w.classList.add('active-window');
        _bcosUpdateTaskbar();
    }
    function _bcosMinimizeWin(app) {
        const w = document.getElementById(_bcos.wins[app]);
        if (!w) return;
        w.style.display = 'none';
        w.classList.remove('active-window');
        if (_bcos.activeWin === app) _bcos.activeWin = null;
        _bcosUpdateTaskbar();
    }
    function _bcosClickTaskbarItem(app) {
        const w = document.getElementById(_bcos.wins[app]);
        if (!w) return;
        if (_bcos.activeWin === app && w.style.display !== 'none') {
            _bcosMinimizeWin(app);
        } else {
            _bcosFocusWin(app);
        }
    }
    function _bcosCloseWin(app) {
        const w = document.getElementById(_bcos.wins[app]);
        if (w) w.remove();
        delete _bcos.wins[app];
        if (_bcos.activeWin === app) _bcos.activeWin = null;
        if (app === 'terminal') _bcosActiveOutput = null;
        if (app === 'monitor' && _bcosMonitorTimer) { clearInterval(_bcosMonitorTimer); _bcosMonitorTimer = null; }
        if (app === 'anniversary' && typeof _bcosAnniAppTimer !== 'undefined' && _bcosAnniAppTimer) { clearInterval(_bcosAnniAppTimer); _bcosAnniAppTimer = null; }
        if (app === 'browser') { var ab = document.getElementById('bcos-egg-applybar'); if (ab) ab.remove(); if (_bcosAnniversaryTimer) { clearInterval(_bcosAnniversaryTimer); _bcosAnniversaryTimer = null; } }
        if (app === 'texteditor') { if (_bcosTeHlTimer) { clearTimeout(_bcosTeHlTimer); _bcosTeHlTimer = null; } }
        if (app === 'radio') { if (window._bcosRadioStop) window._bcosRadioStop(); }
        if (app === 'snake') { if (window._bcosSnakeStop) window._bcosSnakeStop(); }
        if (app === 'monopoly') {
            const el = document.getElementById('view-monopoly');
            if (el && el._origParent) {
                el.style.display = '';
                el.classList.remove('active');
                if (el._origNextSibling) el._origParent.insertBefore(el, el._origNextSibling);
                else el._origParent.appendChild(el);
                el._origParent = null;
            }
        }
        if (app === 'settings') {
            const el = document.getElementById('view-settings');
            if (el && el._origParent) {
                el.style.display = '';
                el.classList.remove('active');
                if (el._origNextSibling) el._origParent.insertBefore(el, el._origNextSibling);
                else el._origParent.appendChild(el);
                el._origParent = null;
            }
        }
        if (app === 'logs') {
            const el = document.getElementById('view-logs');
            if (el && el._origParent) {
                el.style.display = '';
                el.classList.remove('active');
                if (el._origNextSibling) el._origParent.insertBefore(el, el._origNextSibling);
                else el._origParent.appendChild(el);
                el._origParent = null;
            }
        }
        _bcosUpdateTaskbar();
    }
    function _bcosCloseCatWin(winId) { const w = document.getElementById(winId); if (w) w.remove(); }
    function _bcosUpdateTaskbar() {
        _bcosUpdateDock();
        const b = document.getElementById('bcos-taskbar-items');
        if (!b) return;
        const labels = {
            appstore: 'App Store', calculator: '计算器', weather: '天气', notes: '便签',
            radio: '电台', snake: '贪吃蛇', paint: '画板',
            terminal: 'Terminal', files: 'Files', monitor: 'Monitor', about: 'About',
            browser: 'Browser', me: 'me', texteditor: 'Code Studio', anniversary: '纪念日',
            monopoly: '大富翁', settings: '设置', logs: '日志'
        };
        b.innerHTML = Object.keys(_bcos.wins).map(a => `<div class="bcos-taskbar-item${_bcos.activeWin===a?' active':''}" onclick="_bcosClickTaskbarItem('${a}')">${labels[a]||a}</div>`).join('');
    }
    function _bcosCloseCatWin(winId) { const w = document.getElementById(winId); if (w) w.remove(); }
    function _bcosUpdateTaskbar() {
        _bcosUpdateDock();
        const b = document.getElementById('bcos-taskbar-items');
        if (!b) return;
        const labels = {
            terminal: 'Terminal', files: 'Files', monitor: 'Monitor', about: 'About',
            browser: 'Browser', me: 'me', texteditor: 'Editor', anniversary: '纪念日',
            monopoly: '大富翁', settings: '设置', logs: '日志'
        };
        b.innerHTML = Object.keys(_bcos.wins).map(a => `<div class="bcos-taskbar-item${_bcos.activeWin===a?' active':''}" onclick="_bcosClickTaskbarItem('${a}')">${labels[a]||a}</div>`).join('');
    }

    function _bcosRenderMonopolyApp(content) {
        content.style.padding = '0';
        content.style.overflow = 'auto';
        content.style.height = '100%';
        const host = document.createElement('div');
        host.id = 'bcos-mono-host';
        host.style.padding = '.8rem';
        host.style.color = 'var(--text)';
        const el = document.getElementById('view-monopoly');
        if (el) {
            if (!el._origParent) {
                el._origParent = el.parentNode;
                el._origNextSibling = el.nextSibling;
            }
            el.style.display = 'block';
            el.classList.add('active');
            host.appendChild(el);
        }
        content.appendChild(host);
        if (typeof renderMonopoly === 'function') renderMonopoly();
    }

    // ============================================================================
    // BCOS System Settings (系统设置) — macOS Ventura / Sonoma Reference UI
    // ============================================================================
    // ============================================================================
    // Vehicle profile (brand / model / edition / VIN) — selectable or fully custom
    // ============================================================================
    const _BCOS_VEHICLE_BRANDS = [
        { id: 'nio', en: 'NIO', cn: '蔚来', models: ['ET5', 'ET5T', 'ET7', 'ET9', 'ES6', 'ES7', 'ES8', 'EC6', 'EC7'] },
        { id: 'onvo', en: 'ONVO', cn: '乐道', models: ['L60', 'L90'] },
        { id: 'xpeng', en: 'XPENG', cn: '小鹏', models: ['P7+', 'P7', 'P5', 'G6', 'G7', 'G9', 'X9', 'MONA M03'] },
        { id: 'li', en: 'Li Auto', cn: '理想', models: ['L6', 'L7', 'L8', 'L9', 'MEGA', 'i6', 'i8'] },
        { id: 'tesla', en: 'Tesla', cn: '特斯拉', models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'] },
        { id: 'byd', en: 'BYD', cn: '比亚迪', models: ['汉', '唐', '海豹', '宋 PLUS', '秦 PLUS', '腾势 Z9', '仰望 U8'] },
        { id: 'zeekr', en: 'ZEEKR', cn: '极氪', models: ['001', '007', '009', '7X', 'X'] },
        { id: 'xiaomi', en: 'Xiaomi', cn: '小米', models: ['SU7', 'SU7 Ultra', 'YU7'] },
        { id: 'aito', en: 'AITO', cn: '问界', models: ['M5', 'M7', 'M8', 'M9'] },
        { id: 'avatr', en: 'AVATR', cn: '阿维塔', models: ['11', '12', '07'] },
        { id: 'smart', en: 'smart', cn: '精灵', models: ['#1', '#3', '#5'] },
        { id: 'mini', en: 'MINI', cn: 'MINI', models: ['Cooper SE', 'Countryman SE'] }
    ];
    const _BCOS_VEHICLE_KEY = 'bcos_vehicle_profile_v1';
    function _bcosGetVehicle() {
        let v = null;
        try { v = JSON.parse(localStorage.getItem(_BCOS_VEHICLE_KEY) || 'null'); } catch(e) {}
        v = v && typeof v === 'object' ? v : {};
        return {
            brand: v.brand || 'nio',
            model: v.model || 'ET7',
            customBrand: v.customBrand || '',
            customModel: v.customModel || '',
            edition: (typeof v.edition === 'string') ? v.edition : '兔可可专属定制版',
            vin: v.vin || ''
        };
    }
    function _bcosVehicleInfo() {
        const v = _bcosGetVehicle();
        const b = _BCOS_VEHICLE_BRANDS.find(x => x.id === v.brand);
        const brandEn = b ? b.en : (v.customBrand.trim() || '自定义品牌');
        const brandCn = b ? b.cn : (v.customBrand.trim() || '自定义品牌');
        const model = (v.model === '__custom' || !b || b.models.indexOf(v.model) < 0) ? (v.customModel.trim() || (b ? '' : '')) : v.model;
        const edition = v.edition.trim();
        const code = (brandEn + '-' + model).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase() || 'CUSTOM';
        return {
            brandEn: brandEn, brandCn: brandCn, model: model, edition: edition,
            nameEn: (brandEn + ' ' + model).trim(),
            nameCn: (brandCn + ' ' + model).trim(),
            vin: v.vin.trim() || ('BUNNY-2026-' + code)
        };
    }
    function _bcosSetVehicle(patch) {
        const v = Object.assign(_bcosGetVehicle(), patch || {});
        if (patch && patch.brand && patch.brand !== '__custom') {
            const b = _BCOS_VEHICLE_BRANDS.find(x => x.id === patch.brand);
            if (b && b.models.indexOf(v.model) < 0) v.model = b.models[0];
        }
        try { localStorage.setItem(_BCOS_VEHICLE_KEY, JSON.stringify(v)); } catch(e) {}
        if (typeof _bcosRenderSettingsRightPane === 'function') _bcosRenderSettingsRightPane();
    }
    function _bcosResetVehicle() {
        try { localStorage.removeItem(_BCOS_VEHICLE_KEY); } catch(e) {}
        if (typeof _bcosRenderSettingsRightPane === 'function') _bcosRenderSettingsRightPane();
    }
    window._bcosGetVehicle = _bcosGetVehicle; window._bcosVehicleInfo = _bcosVehicleInfo;
    window._bcosSetVehicle = _bcosSetVehicle; window._bcosResetVehicle = _bcosResetVehicle;

    let _bcosSettingsActiveTab = 'general';

    function _bcosRenderSettingsApp(content) {
        window._bcosRenderSettingsApp = _bcosRenderSettingsApp;
        if (!content) return;
        content.id = 'bcos-settings-host';
        content.style.padding = '0';
        content.style.overflow = 'hidden';
        content.style.height = '100%';
        content.style.background = '#181b26';
        content.style.color = '#e2e8f0';

        const customBg = localStorage.getItem('bcosCustomBg') || '';
        const curAvatar = localStorage.getItem('sidebarAvatar') || 'emoji';
        const isPixel = localStorage.getItem('pixelFont') === '1' || document.body.classList.contains('pixel-font');
        const isMouse = localStorage.getItem('mouseBunny') !== '0';
        const curSoc = localStorage.getItem('car_soc') || '88';
        const curTemp = localStorage.getItem('car_cabin_temp') || '22';
        const fontScale = localStorage.getItem('fontScale') || '100';

        const tabs = [
            { id: 'wifi', icon: '📶', bg: '#007aff', title: 'Wi-Fi 网络', sub: '无线网络与座舱互联' },
            { id: 'battery', icon: '🔋', bg: '#34c759', title: '车辆与能耗', sub: '动力电池与座舱续航' },
            { id: 'general', icon: '⚙️', bg: '#8e8e93', title: '通用', sub: '系统偏好、更新与存储' },
            { id: 'appearance', icon: '🎨', bg: '#ff2d55', title: '外观与主题', sub: '桌面氛围主题与强调色' },
            { id: 'desktop_dock', icon: '🖥️', bg: '#5856d6', title: '桌面与程序坞', sub: '锁屏壁纸与 Dock 栏' },
            { id: 'displays', icon: '☀️', bg: '#ff9500', title: '显示器', sub: '全局缩放与显示形态' },
            { id: 'about', icon: 'ℹ️', bg: '#007aff', title: '关于本系统', sub: '硬件参数与系统内核' }
        ];

        content.innerHTML = `
            <div style="display:flex;height:100%;width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;user-select:none;-webkit-user-select:none;">
                <!-- Left Sidebar -->
                <div style="width:210px;background:rgba(20,24,36,0.96);border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;padding:12px 8px;box-sizing:border-box;flex-shrink:0;">
                    <!-- Search Bar -->
                    <div style="margin-bottom:12px;position:relative;">
                        <input type="text" id="bcos-settings-search" placeholder="🔍 搜索" oninput="_bcosSettingsFilter(this.value)" style="width:100%;box-sizing:border-box;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:6px 10px;font-size:12px;color:#fff;outline:none;">
                    </div>

                    <!-- Apple / Bunny Cockpit Account Card -->
                    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);margin-bottom:12px;cursor:pointer;" onclick="_bcosSwitchSettingsTab('about')">
                        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ff6b9d,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(255,107,157,0.3);">🐰</div>
                        <div style="line-height:1.2;overflow:hidden;">
                            <div style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">兔可可</div>
                            <div style="font-size:10px;color:#94a3b8;">Cockpit Account</div>
                        </div>
                    </div>

                    <!-- Sidebar Categories -->
                    <div id="bcos-settings-nav" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:3px;">
                        ${tabs.map(t => `
                            <div class="bcos-settings-nav-item ${t.id === _bcosSettingsActiveTab ? 'active' : ''}" id="bcos-set-nav-${t.id}" onclick="_bcosSwitchSettingsTab('${t.id}')" style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;cursor:pointer;transition:all 0.15s;${t.id === _bcosSettingsActiveTab ? 'background:#007aff;color:#fff;font-weight:600;' : 'color:#cbd5e1;'}">
                                <div style="width:24px;height:24px;border-radius:6px;background:${t.bg};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${t.icon}</div>
                                <span style="font-size:13px;">${t.title}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Right Content Pane -->
                <div id="bcos-settings-pane" style="flex:1;overflow-y:auto;padding:18px 24px;box-sizing:border-box;-webkit-overflow-scrolling:touch;"></div>
            </div>
        `;

        _bcosRenderSettingsRightPane();
    }

    window._bcosSwitchSettingsTab = function(tabId) {
        _bcosSettingsActiveTab = tabId;
        const nav = document.getElementById('bcos-settings-nav');
        if (nav) {
            nav.querySelectorAll('.bcos-settings-nav-item').forEach(el => {
                const isActive = el.id === 'bcos-set-nav-' + tabId;
                el.style.background = isActive ? '#007aff' : 'transparent';
                el.style.color = isActive ? '#fff' : '#cbd5e1';
                el.style.fontWeight = isActive ? '600' : 'normal';
            });
        }
        _bcosRenderSettingsRightPane();
    };

    window._bcosSettingsFilter = function(kw) {
        kw = String(kw || '').trim().toLowerCase();
        const nav = document.getElementById('bcos-settings-nav');
        if (!nav) return;
        nav.querySelectorAll('.bcos-settings-nav-item').forEach(el => {
            const txt = el.textContent.toLowerCase();
            el.style.display = (!kw || txt.includes(kw)) ? 'flex' : 'none';
        });
    };

    function _bcosRenderSettingsRightPane() {
        const pane = document.getElementById('bcos-settings-pane');
        if (!pane) return;

        const customBg = localStorage.getItem('bcosCustomBg') || '';
        const curAvatar = localStorage.getItem('sidebarAvatar') || 'emoji';
        const isPixel = localStorage.getItem('pixelFont') === '1' || document.body.classList.contains('pixel-font');
        const isMouse = localStorage.getItem('mouseBunny') !== '0';
        const curSoc = localStorage.getItem('car_soc') || '88';
        const curTemp = localStorage.getItem('car_cabin_temp') || '22';
        const fontScale = localStorage.getItem('fontScale') || '100';

        const card = (inner) => `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 16px;margin-bottom:14px;">${inner}</div>`;
        const row = (label, rightControl, desc) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);gap:12px;flex-wrap:wrap;">
                <div>
                    <div style="font-size:13px;font-weight:600;color:#f1f5f9;">${label}</div>
                    ${desc ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${desc}</div>` : ''}
                </div>
                <div>${rightControl}</div>
            </div>
        `;
        const hero = (icon, title, desc) => `
            <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px 0 16px;">
                <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#007aff,#5856d6);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 8px 24px rgba(0,122,255,0.35);margin-bottom:8px;">${icon}</div>
                <div style="font-size:17px;font-weight:700;color:#fff;">${title}</div>
                <div style="font-size:12px;color:#94a3b8;max-width:400px;margin-top:2px;">${desc}</div>
            </div>
        `;

        let html = '';

        if (_bcosSettingsActiveTab === 'appearance') {
            html += hero('🎨', '外观与主题', '自定义桌面氛围色彩、强调色、字体风格与交互光效');
            
            // Themes
            let themeDots = '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
            for (const [id, t] of Object.entries(_bcosThemeDesktop)) {
                const current = document.documentElement.getAttribute('data-theme') || 'bunny';
                const border = current === id ? `3px solid ${t.accent}` : '3px solid transparent';
                themeDots += `<div onclick="setTheme('${id}'); if(window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme(); _bcosRenderSettingsRightPane();" style="width:40px;height:40px;border-radius:10px;background:${t.wallpaper};cursor:pointer;border:${border};box-shadow:0 3px 8px rgba(0,0,0,.4);" title="${t.label}"></div>`;
            }
            themeDots += '</div>';

            html += card(`
                <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:10px;">桌面强调色与氛围</div>
                ${themeDots}
            `);

            html += card(`
                ${row('🐰 侧边栏头像风格', `
                    <button onclick="window.setSidebarAvatar && window.setSidebarAvatar('emoji'); _bcosRenderSettingsRightPane();" style="background:${curAvatar==='emoji'?'#007aff':'rgba(255,255,255,0.1)'};color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;margin-right:6px;">🐰 Emoji</button>
                    <button onclick="window.setSidebarAvatar && window.setSidebarAvatar('photo'); _bcosRenderSettingsRightPane();" style="background:${curAvatar==='photo'?'#007aff':'rgba(255,255,255,0.1)'};color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;">📷 照片</button>
                `, '切换侧边栏兔可可头像为萌趣 Emoji 或纪念写真')}
                ${row('👾 像素字体模式', `
                    <button onclick="window.togglePixelFont && window.togglePixelFont(); _bcosRenderSettingsRightPane();" style="background:${isPixel?'#34c759':'rgba(255,255,255,0.1)'};color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">${isPixel?'✅ 已开启':'❌ 已关闭'}</button>
                `, '全系统应用采用 8-bit 复古像素点阵字效')}
                ${row('✨ 鼠标光效跟随', `
                    <button onclick="window.toggleMouseBunny && window.toggleMouseBunny(); _bcosRenderSettingsRightPane();" style="background:${isMouse?'#34c759':'rgba(255,255,255,0.1)'};color:#fff;border:none;padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">${isMouse?'✅ 已开启':'❌ 已关闭'}</button>
                `, '指针移动时产生柔和发光粒子拖尾轨迹')}
            `);
        } else if (_bcosSettingsActiveTab === 'desktop_dock') {
            html += hero('🖥️', '桌面与程序坞', '管理桌面图标排列、壁纸图库以及 Dock 栏');

            // Built-in wallpapers
            let wpGrid = '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));gap:8px;margin-bottom:10px;">';
            if (window.BUILTIN_WALLPAPERS) {
                window.BUILTIN_WALLPAPERS.forEach(w => {
                    const thumbSrc = (window.wpBlobCache && window.wpBlobCache[w.file]) || (window.WP_PLACEHOLDER && window.WP_PLACEHOLDER[w.file]) || w.file;
                    const isActive = (customBg === w.file);
                    wpGrid += `<div onclick="localStorage.setItem('bcosCustomBg', '${w.file}'); if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme(); _bcosRenderSettingsRightPane();" style="cursor:pointer;border-radius:8px;position:relative;overflow:hidden;border:${isActive ? '2px solid #007aff' : '1px solid rgba(255,255,255,0.1)'};aspect-ratio:16/9;background:#222 url(${thumbSrc}) center/cover no-repeat;" title="${w.name}">
                        <div style="background:rgba(0,0,0,0.65);color:#fff;font-size:9px;padding:2px 4px;position:absolute;bottom:0;width:100%;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.name}</div>
                    </div>`;
                });
            }
            wpGrid += `<div onclick="localStorage.removeItem('bcosCustomBg'); if (window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme(); _bcosRenderSettingsRightPane();" style="cursor:pointer;border-radius:8px;border:1px dashed rgba(255,255,255,0.25);aspect-ratio:16/9;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#888;font-size:11px;">🔄 默认主题</div></div>`;

            html += card(`
                <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px;">壁纸图库 (随车机同步)</div>
                ${wpGrid}
                <div style="display:flex;gap:8px;margin-top:10px;">
                    <input type="text" id="bcos-custom-bg-input" value="${!window.BUILTIN_WALLPAPERS?.find(w=>w.file===customBg) ? customBg : ''}" placeholder="或输入自定义壁纸图片 URL (HTTPS)" style="flex:1;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;outline:none;">
                    <button onclick="const val = document.getElementById('bcos-custom-bg-input').value.trim(); if(val) localStorage.setItem('bcosCustomBg', val); else localStorage.removeItem('bcosCustomBg'); if(window._bcosApplyDesktopTheme) window._bcosApplyDesktopTheme(); _bcosRenderSettingsRightPane(); showToast('✓ 壁纸已更新');" style="background:#007aff;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">应用</button>
                </div>
            `);

            html += card(`
                ${row('🧩 恢复默认桌面图标', `<button onclick="_bcosResetDesktopIcons(); _bcosRenderSettingsRightPane();" style="background:rgba(255,255,255,0.1);color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;">重置排列</button>`, '重置桌面图标自由拖动位置并恢复网格流式排列')}
                ${row('📱 移动端 Tab 栏模式', `
                    <select onchange="if(window.setTabBarMode) setTabBarMode(this.value)" style="background:rgba(0,0,0,0.5);color:#fff;border:1px solid #444;padding:4px 8px;border-radius:6px;font-size:12px;"><option value="always">始终显示</option><option value="auto-collapse">自动折叠</option><option value="hidden">隐藏</option></select>
                `, '车载中控与移动端浏览器底部快捷导航栏')}
            `);
        } else if (_bcosSettingsActiveTab === 'displays') {
            html += hero('☀️', '显示器与视口', '调整座舱屏幕全局字体缩放与屏幕形态自适应');
            html += card(`
                ${row('🔤 全局字体缩放', `
                    <div style="display:flex;align-items:center;gap:10px;">
                        <input type="range" min="80" max="200" step="5" value="${fontScale}" oninput="if(window.setFontScale) setFontScale(this.value); this.nextElementSibling.textContent=this.value+'%';" style="width:120px;accent-color:#007aff;">
                        <span style="color:#007aff;font-weight:bold;width:40px;text-align:right;font-size:13px;">${fontScale}%</span>
                    </div>
                `, '无缝调整整个座舱系统的文字与组件排版比例')}
                ${row('🖥️ 屏幕形态自适应', `
                    <select onchange="if(window.setScreenGeometry) setScreenGeometry(this.value)" style="background:rgba(0,0,0,0.5);color:#fff;border:1px solid #444;padding:4px 8px;border-radius:6px;font-size:12px;">
                        <option value="auto">🤖 智能自动识别</option>
                        <option value="standard">💻 标准横屏 (16:9)</option>
                        <option value="ultrawide">📏 贯穿超宽屏 (21:9+)</option>
                        <option value="circular">⚪ MINI 圆形 OLED (1:1)</option>
                        <option value="portrait">📱 垂直竖屏 (9:16)</option>
                    </select>
                `, '切换座舱几何形态渲染模式')}
            `);
        } else if (_bcosSettingsActiveTab === 'battery') {
            const _vh = _bcosGetVehicle(), _vi = _bcosVehicleInfo();
            const _vb = _BCOS_VEHICLE_BRANDS.find(x => x.id === _vh.brand);
            const _selSty = "background:rgba(0,0,0,0.5);color:#fff;border:1px solid #555;padding:5px 8px;border-radius:6px;font-size:12px;max-width:170px;";
            const _inSty = "background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:5px 8px;border-radius:6px;font-size:12px;outline:none;width:150px;box-sizing:border-box;user-select:text;-webkit-user-select:text;";
            const _brandOpts = _BCOS_VEHICLE_BRANDS.map(b => `<option value="${b.id}" ${_vh.brand === b.id ? 'selected' : ''}>${b.cn} ${b.en !== b.cn ? b.en : ''}</option>`).join('') + `<option value="__custom" ${_vb ? '' : 'selected'}>✏️ 自定义品牌…</option>`;
            const _modelOpts = (_vb ? _vb.models.map(m => `<option value="${_bcosEscape(m)}" ${_vh.model === m ? 'selected' : ''}>${_bcosEscape(m)}</option>`).join('') : '') + `<option value="__custom" ${(!_vb || _vb.models.indexOf(_vh.model) < 0) ? 'selected' : ''}>✏️ 自定义车型…</option>`;
            const _customBrandRow = _vb ? '' : row('品牌名称', `<input type="text" style="${_inSty}" value="${_bcosEscape(_vh.customBrand)}" placeholder="例如：广汽埃安" onchange="_bcosSetVehicle({customBrand:this.value})">`, '输入自定义品牌中文/英文名');
            const _customModelRow = (!_vb || _vb.models.indexOf(_vh.model) < 0) ? row('车型名称', `<input type="text" style="${_inSty}" value="${_bcosEscape(_vh.customModel)}" placeholder="例如：Hyper GT" onchange="_bcosSetVehicle({customModel:this.value})">`, '输入自定义车型名称') : '';
            html += hero('🔋', '车辆动力与能耗', `${_bcosEscape(_vi.brandCn)} ${_bcosEscape(_vi.model)} ${_bcosEscape(_vi.edition)} · 实时电量遥测与温控`);
            html += card(`
                ${row('🚘 车辆品牌', `<select style="${_selSty}" onchange="_bcosSetVehicle({brand:this.value})">${_brandOpts}</select>`, '选择内置品牌，或自定义输入')}
                ${_customBrandRow}
                ${row('🚗 车型', `<select style="${_selSty}" onchange="_bcosSetVehicle({model:this.value})">${_modelOpts}</select>`, '随品牌联动，也可自定义车型')}
                ${_customModelRow}
                ${row('🏷️ 版本名称', `<input type="text" style="${_inSty}" value="${_bcosEscape(_vh.edition)}" placeholder="如：兔可可专属定制版" onchange="_bcosSetVehicle({edition:this.value})">`, '显示在车辆识别信息中，可留空')}
                ${row('🔖 车辆识别码 VIN', `<input type="text" style="${_inSty}width:190px;font-family:monospace;" value="${_bcosEscape(_vh.vin)}" placeholder="${_bcosEscape(_vi.vin)}" onchange="_bcosSetVehicle({vin:this.value})">`, '留空则按品牌车型自动生成')}
                ${row('♻️ 恢复默认车辆', `<button onclick="_bcosResetVehicle()" style="background:rgba(255,255,255,0.1);color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;">恢复 NIO ET7</button>`, '重置品牌、车型、版本与 VIN')}
            `);
            html += card(`
                ${row('⚡ 动力电池 SOC', `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:16px;font-weight:700;color:#34c759;">${curSoc}%</span>
                        <input type="range" min="10" max="100" value="${curSoc}" oninput="localStorage.setItem('car_soc', this.value); this.previousElementSibling.textContent=this.value+'%'; _bcosUpdateClock();" style="width:100px;accent-color:#34c759;">
                    </div>
                `, '当前动力电池剩余电量')}
                ${row('🛣️ 预估剩余续航', '<span style="font-weight:700;color:#fff;">680 km (WLTP)</span>', '基于当前能耗与环境温度智能估算')}
                ${row('❄️ 座舱空调设定', `
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button onclick="let t = Math.max(16, +${curTemp} - 1); localStorage.setItem('car_cabin_temp', t); _bcosRenderSettingsRightPane();" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;">-</button>
                        <span style="font-weight:700;color:#007aff;">${curTemp}°C</span>
                        <button onclick="let t = Math.min(30, +${curTemp} + 1); localStorage.setItem('car_cabin_temp', t); _bcosRenderSettingsRightPane();" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;">+</button>
                    </div>
                `, '智能双温区座舱恒温系统')}
            `);
        } else if (_bcosSettingsActiveTab === 'wifi') {
            html += hero('📶', 'Wi-Fi 与车机互联', '智能座舱 5G NSA/SA 双模聚合与高速车载热点');
            html += card(`
                ${row('车载 Wi-Fi 热点', '<span style="color:#34c759;font-weight:600;">已连接 · Bunny-Cockpit-5G</span>', 'IP: 192.168.4.1 (5.8 GHz)')}
                ${row('网络延迟', '<span style="font-family:monospace;color:#34c759;">18 ms (极佳)</span>', '座舱边缘云端链路状态')}
                ${row('蓝牙互联', '<span style="color:#007aff;">iPhone 16 Pro (免提与音频流)</span>', 'Bluetooth 5.4 低延迟音频传输')}
            `);
        } else if (_bcosSettingsActiveTab === 'about') {
            html += hero('ℹ️', '关于本系统', 'Bunny Cockpit OS · 兔可可智能座舱系统');
            html += card(`
                ${row('系统版本', '<span style="font-family:monospace;color:#00ff41;font-weight:bold;">' + CONFIG.VERSION + '</span>', 'Build 20261005 · Official Release')}
                ${row('计算芯片', '<span style="color:#fff;">Bunny M3 HyperDrive (8-Core AI)</span>', '车载车规级智能计算平台')}
                ${row('高速显存', '<span style="color:#fff;">16 GB LPDDR5X (Unified)</span>', '高带宽硬件加速显存')}
                ${row('系统内核', '<span style="font-family:monospace;color:#94a3b8;">BCOS Darwin 24.1.0 aarch64</span>', 'POSIX 兼容虚拟环境')}
                ${(function(){ const vi = _bcosVehicleInfo(); return row('车辆识别', '<span style="color:#fff;">' + _bcosEscape(vi.nameEn + (vi.edition ? ' · ' + vi.edition : '')) + '</span>', 'VIN: ' + _bcosEscape(vi.vin)); })()}
            `);
        } else {
            // General
            html += hero('⚙️', '通用偏好', '管理存储空间、软件更新与系统基础首选项');
            html += card(`
                ${row('💾 BCOS 虚拟存储', '<span style="color:#34c759;font-weight:600;">12.8 MB / 512 MB</span>', '包含文稿、离线缓存与应用商店安装包')}
                ${row('🔄 软件更新', '<span style="color:#34c759;font-weight:600;">✓ 已是最新版本 (' + CONFIG.VERSION + ')</span>', '支持 Service Worker 离线热更新')}
                ${row('🌐 系统语言', '<span style="color:#fff;">简体中文 (中国大陆)</span>', 'Apple SF Pro / PingFang SC 智能回退')}
                ${row('⏰ 日期与时间', '<span style="color:#007aff;">网络时间自动对时 (已同步)</span>', '精确到秒，实时更新 Dock 与菜单栏时钟')}
            `);
        }

        pane.innerHTML = html;
    }

    function _bcosRenderLogsApp(content) {
        content.style.padding = '0';
        content.style.overflow = 'auto';
        content.style.height = '100%';
        const host = document.createElement('div');
        host.id = 'bcos-logs-host';
        host.style.padding = '.8rem';
        host.style.color = 'var(--text)';
        const el = document.getElementById('view-logs');
        if (el) {
            if (!el._origParent) {
                el._origParent = el.parentNode;
                el._origNextSibling = el.nextSibling;
            }
            el.style.display = 'block';
            el.classList.add('active');
            host.appendChild(el);
        }
        content.appendChild(host);
        if (typeof renderEvents === 'function') renderEvents();
    }
    function _bcosBeginInteract() { const ov = document.getElementById('bcos-overlay'); if (ov) ov.classList.add('bcos-win-interacting'); }
    function _bcosEndInteract() { const ov = document.getElementById('bcos-overlay'); if (ov) ov.classList.remove('bcos-win-interacting'); }
    function _bcosDragStart(winId, e) {
        if (e.target.classList.contains('bcos-window-btn') || e.target.closest('.bcos-window-controls')) return;
        const win = document.getElementById(winId); if (!win) return;
        // Maximized windows are pinned: starting a drag here would overwrite the saved restore geometry
        // and swallow the second click of a double-click, leaving the titlebar in a broken state.
        if (win.classList.contains('maximized')) return;
        document.querySelectorAll('.bcos-window').forEach(w => w.classList.remove('active-window'));
        win.classList.add('active-window');
        const r = win.getBoundingClientRect();
        win._bcosTX = r.left; win._bcosTY = r.top;
        win.style.left = '0'; win.style.top = '0';
        win.style.transform = `translate3d(${win._bcosTX}px, ${win._bcosTY}px, 0)`;
        const ox = e.clientX - win._bcosTX, oy = e.clientY - win._bcosTY;
        function mv(ev) {
            // Button released outside the page / over an iframe: finish the drag instead of sticking to the cursor
            if (ev.buttons === 0) { up(); return; }
            const isMobile = window.innerWidth <= 768;
            if (isMobile) return;
            const curW = win.offsetWidth || 300;
            const minX = -curW + 60;
            const maxX = Math.max(0, window.innerWidth - 60);
            const minY = 30; // Cannot drag above macOS top menubar
            const maxY = Math.max(30, window.innerHeight - 60);
            win._bcosTX = Math.max(minX, Math.min(maxX, ev.clientX - ox));
            win._bcosTY = Math.max(minY, Math.min(maxY, ev.clientY - oy));
            win.style.transform = `translate3d(${win._bcosTX}px, ${win._bcosTY}px, 0)`;
        }
        function up() {
            document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
            window.removeEventListener('blur', up);
            _bcosEndInteract();
        }
        _bcosBeginInteract();
        document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
        window.addEventListener('blur', up);
        e.preventDefault();
    }
    function _bcosTouchDragStart(winId, e) {
        if (window.innerWidth <= 768) return; // Prevent swipe/touch conflicts on mobile
        if (e.target.classList.contains('bcos-window-btn') || e.target.closest('.bcos-window-controls')) return;
        const win = document.getElementById(winId); if (!win || !e.touches[0]) return;
        if (win.classList.contains('maximized')) return;
        document.querySelectorAll('.bcos-window').forEach(w => w.classList.remove('active-window'));
        win.classList.add('active-window');
        const r = win.getBoundingClientRect();
        win._bcosTX = r.left; win._bcosTY = r.top;
        win.style.left = '0'; win.style.top = '0';
        win.style.transform = `translate3d(${win._bcosTX}px, ${win._bcosTY}px, 0)`;
        const t = e.touches[0]; const ox = t.clientX - win._bcosTX, oy = t.clientY - win._bcosTY;
        function mv(ev) {
            if (!ev.touches[0]) return;
            const touch = ev.touches[0];
            const curW = win.offsetWidth || 300;
            const minX = -curW + 60;
            const maxX = Math.max(0, window.innerWidth - 60);
            const minY = 30;
            const maxY = Math.max(30, window.innerHeight - 60);
            win._bcosTX = Math.max(minX, Math.min(maxX, touch.clientX - ox));
            win._bcosTY = Math.max(minY, Math.min(maxY, touch.clientY - oy));
            win.style.transform = `translate3d(${win._bcosTX}px, ${win._bcosTY}px, 0)`;
        }
        function up() { document.removeEventListener('touchmove',mv); document.removeEventListener('touchend',up); }
        document.addEventListener('touchmove',mv,{passive:false}); document.addEventListener('touchend',up); e.preventDefault();
    }

    // === Window maximize/restore on double-click titlebar ===
    function _bcosToggleMaximize(winId, e, fromButton) {
        if (window.innerWidth <= 768) return;
        // Double-click on the traffic-light cluster must not toggle; the green button itself passes fromButton=true
        if (!fromButton && e && e.target && e.target.closest && e.target.closest('.bcos-window-controls')) return;
        const win = document.getElementById(winId); if (!win) return;
        if (win.classList.contains('maximized')) {
            // Restore from the geometry captured right before maximizing (never from the maximized rect)
            const g = win._bcosRestoreGeom || { x: win._bcosTX || 36, y: win._bcosTY || 42, w: win._bcosOrigW || 640, h: win._bcosOrigH || 420 };
            win.classList.remove('maximized');
            const x = Math.max(-g.w + 60, Math.min(g.x, Math.max(0, window.innerWidth - 60)));
            const y = Math.max(30, Math.min(g.y, Math.max(30, window.innerHeight - 60)));
            win._bcosTX = x; win._bcosTY = y;
            win._bcosOrigW = g.w; win._bcosOrigH = g.h;
            win.style.left = '0'; win.style.top = '0';
            win.style.width = g.w + 'px';
            win.style.height = g.h + 'px';
            win.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            win._bcosRestoreGeom = null;
        } else {
            // Save current position before maximizing
            const r = win.getBoundingClientRect();
            win._bcosRestoreGeom = { x: r.left, y: r.top, w: r.width, h: r.height };
            win._bcosTX = r.left; win._bcosTY = r.top;
            win._bcosOrigW = r.width; win._bcosOrigH = r.height;
            win.classList.add('maximized');
        }
        win.style.zIndex = ++_bcos.winZ;
    }

    // === Window resize via bottom-right handle ===
    function _bcosResizeStart(winId, e) {
        if (window.innerWidth <= 768) return;
        const win = document.getElementById(winId); if (!win) return;
        if (win.classList.contains('maximized')) return;
        e.stopPropagation(); e.preventDefault();
        const r = win.getBoundingClientRect();
        const startX = e.clientX, startY = e.clientY;
        const startW = r.width, startH = r.height;
        function mv(ev) {
            if (ev.buttons === 0) { up(); return; }
            let nw = Math.max(280, startW + (ev.clientX - startX));
            let nh = Math.max(180, startH + (ev.clientY - startY));
            win.style.width = nw + 'px';
            win.style.height = nh + 'px';
            win._bcosOrigW = nw; win._bcosOrigH = nh;
        }
        function up() {
            document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
            window.removeEventListener('blur', up);
            _bcosEndInteract();
        }
        _bcosBeginInteract();
        document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
        window.addEventListener('blur', up);
    }

    function _bcosRenderDesktopTerminal(content) {
        content.style.padding = '0';
        content.innerHTML = `<div class="bcos-mini-terminal" id="bcos-mt-out" style="height:calc(100% - 32px);"></div><div style="display:flex;align-items:center;gap:2px;padding:.3rem;background:#0a0a0a;border-top:1px solid #222;"><span style="color:#00ff41;font-weight:bold;font-size:12px;">bcos@bunny:<span id="bcos-mt-prompt-path">${_bcosGetPromptPath()}</span>$</span><input class="bcos-mini-terminal-input" id="bcos-mt-in" type="text" autocomplete="off" /></div>`;
        const out = document.getElementById('bcos-mt-out');
        out.innerHTML = '<div style="color:#00ff41;">bcos ' + _BCOS_VER + ' Desktop Terminal</div><div style="color:#666;">Type \'help\' for commands.</div><br>';
        const input = document.getElementById('bcos-mt-in'); input.focus();
        let mh = [], mi = -1;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value; mh.push(cmd); if (mh.length > 50) mh.shift(); mi = mh.length;
                const echoDiv = document.createElement('div');
                echoDiv.innerHTML = '<span style="color:#00ff41;font-weight:bold;">bcos@bunny:' + _bcosGetPromptPath() + '$</span> ' + _bcosEscape(cmd);
                out.appendChild(echoDiv);
                input.value = '';
                if (!cmd.trim()) return;
                const parts = cmd.trim().split(/\s+/), name = parts[0].toLowerCase(), args = parts.slice(1);
                if (name === 'exit' || name === 'close') { _bcosCloseWin('terminal'); return; }
                _bcosActiveOutput = out;
                try {
                    const cmds = _bcosGetCommands();
                    if (cmds[name]) {
                        if (name === 'desktop') { _bcosPrint('<span style="color:#fa0;">bcos: Already in desktop mode.</span>'); }
                        else if (name === 'clear' || name === 'cls') { out.innerHTML = ''; }
                        else {
                            const result = cmds[name](args);
                            if (result && typeof result.then === 'function') {
                                result.then(() => { if (out.isConnected) out.scrollTop = out.scrollHeight; }).catch(err => { _bcosPrint('<span style="color:#f44;">bcos: error: ' + _bcosEscape(err.message) + '</span>'); });
                                _bcosEggCheck();
                                return;
                            }
                            _bcosEggCheck();
                        }
                    }
                    else { _bcosPrint('<span style="color:#f44;">bcos: command not found: ' + _bcosEscape(name) + '</span>'); const m = _bcosFuzzy(name, Object.keys(cmds)); if (m) _bcosPrint('<span style="color:#fa0;">Did you mean \'' + m + '\'?</span>'); }
                } catch(err) { _bcosPrint('<span style="color:#f44;">bcos: error: ' + _bcosEscape(err.message) + '</span>'); }
                // Don't clear _bcosActiveOutput here — keep it pointing to this terminal's output
                // It will be cleared when the terminal window is closed via _bcosCloseWin
                if (out.isConnected) out.scrollTop = out.scrollHeight;
            } else if (e.key === 'ArrowUp') { e.preventDefault(); if (mi > 0) { mi--; input.value = mh[mi]; } }
            else if (e.key === 'ArrowDown') { e.preventDefault(); if (mi < mh.length-1) { mi++; input.value = mh[mi]; } else { mi = mh.length; input.value = ''; } }
            else if (e.key === 'Tab') { e.preventDefault(); _bcosAutocomplete(input); }
            else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
        });
    }

    // ============================================================================
    // BCOS macOS Finder (访达 / 文件管理器) — Full VFS integration & Code Studio sync
    // ============================================================================
    