/* ===== js/bcos-8.js — BCOS 8.0 "Aurora" Shell JS =====
 * 启动屏 / 桌面时钟小组件 / 控制中心
 */

/* ---------- 启动屏 ---------- */
function _bcos8ShowBoot() {
    if (document.getElementById('bcos-boot')) return;
    const ver = (window.BCOS_VERSION || 'v8.0.8901');
    const el = document.createElement('div');
    el.id = 'bcos-boot';
    el.innerHTML =
        '<div class="bcos-boot-logo">🐰</div>' +
        '<div class="bcos-boot-title">Bunny Cockpit OS</div>' +
        '<div class="bcos-boot-ver">' + ver.toUpperCase() + ' · AURORA</div>' +
        '<div class="bcos-boot-bar"><div class="bcos-boot-bar-fill" id="bcos-boot-fill"></div></div>' +
        '<div class="bcos-boot-tip" id="bcos-boot-tip">正在唤醒兔可可…</div>';
    document.body.appendChild(el);
    const tips = ['正在唤醒兔可可…', '正在校准座舱…', '正在连接星云…', '正在铺设极光…'];
    let p = 0, ti = 0;
    const fill = document.getElementById('bcos-boot-fill');
    const tip = document.getElementById('bcos-boot-tip');
    const iv = setInterval(() => {
        p = Math.min(100, p + 8 + Math.random() * 14);
        if (fill) fill.style.width = p + '%';
        if (tip && ti < tips.length - 1 && p > (ti + 1) * 25) { ti++; tip.textContent = tips[ti]; }
        if (p >= 100) {
            clearInterval(iv);
            setTimeout(() => el.classList.add('done'), 350);
            setTimeout(() => el.remove(), 1200);
        }
    }, 220);
}

/* ---------- 桌面时钟小组件 ---------- */
function _bcos8RenderDeskClock() {
    if (document.getElementById('bcos-desk-clock')) return;
    const bg = document.getElementById('bcos-desktop-bg');
    if (!bg) return;
    const el = document.createElement('div');
    el.id = 'bcos-desk-clock';
    el.innerHTML = '<div class="bcos-desk-clock-time" id="bcos-desk-clock-time">--:--</div>' +
                   '<div class="bcos-desk-clock-date" id="bcos-desk-clock-date"></div>';
    bg.appendChild(el);
    const upd = () => {
        const n = new Date();
        const t = document.getElementById('bcos-desk-clock-time');
        const d = document.getElementById('bcos-desk-clock-date');
        if (t) t.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
        if (d) {
            const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            d.textContent = (n.getMonth() + 1) + '月' + n.getDate() + '日 ' + days[n.getDay()];
        }
    };
    upd();
    setInterval(upd, 15000);
}

/* ---------- 控制中心 ---------- */
function _bcos8ToggleCC() {
    const cc = document.getElementById('bcos-control-center');
    if (cc) cc.classList.toggle('open');
}
function _bcos8CloseCC() {
    const cc = document.getElementById('bcos-control-center');
    if (cc) cc.classList.remove('open');
}
function _bcos8RenderCC() {
    if (document.getElementById('bcos-control-center')) return;
    const overlay = document.getElementById('bcos-overlay') || document.body;
    const el = document.createElement('div');
    el.id = 'bcos-control-center';
    el.innerHTML =
        '<div class="bcos-cc-title">控制中心</div>' +
        '<div class="bcos-cc-grid">' +
        '<div class="bcos-cc-tile" onclick="_bcosOpenApp(\'settings\');_bcos8CloseCC()">' +
            '<div class="bcos-cc-tile-icon">⚙️</div><div><div class="bcos-cc-tile-label">系统设置</div><div class="bcos-cc-tile-sub">偏好与更新</div></div></div>' +
        '<div class="bcos-cc-tile" onclick="showBcosCarLockscreen();_bcos8CloseCC()">' +
            '<div class="bcos-cc-tile-icon">🚗</div><div><div class="bcos-cc-tile-label">座舱锁屏</div><div class="bcos-cc-tile-sub">进入车机</div></div></div>' +
        '<div class="bcos-cc-tile" onclick="_bcosToggleAppDrawer();_bcos8CloseCC()">' +
            '<div class="bcos-cc-tile-icon">🚀</div><div><div class="bcos-cc-tile-label">应用抽屉</div><div class="bcos-cc-tile-sub">所有应用</div></div></div>' +
        '<div class="bcos-cc-tile" onclick="_bcosForceUpdate()">' +
            '<div class="bcos-cc-tile-icon">🔄</div><div><div class="bcos-cc-tile-label">强制刷新</div><div class="bcos-cc-tile-sub">清除缓存重启</div></div></div>' +
        '<div class="bcos-cc-tile" onclick="_bcosOpenApp(\'terminal\');_bcos8CloseCC()">' +
            '<div class="bcos-cc-tile-icon">💻</div><div><div class="bcos-cc-tile-label">终端</div><div class="bcos-cc-tile-sub">bcos@bunny</div></div></div>' +
        '<div class="bcos-cc-tile" onclick="_bcosOpenApp(\'monitor\');_bcos8CloseCC()">' +
            '<div class="bcos-cc-tile-icon">📊</div><div><div class="bcos-cc-tile-label">监视器</div><div class="bcos-cc-tile-sub">系统状态</div></div></div>' +
        '<div class="bcos-cc-slider-row"><div class="bcos-cc-tile-label" style="margin-bottom:4px">🔆 屏幕亮度</div>' +
            '<input class="bcos-cc-slider" type="range" min="40" max="100" value="100" oninput="document.getElementById(\'bcos-overlay\').style.filter=\'brightness(\'+(this.value/100)+\')\'"></div>' +
        '</div>';
    // 挂到 overlay 内, 避免被桌面容器裁剪
    const host = document.getElementById('bcos-overlay');
    (host || document.body).appendChild(el);
    // 点击外部关闭
    document.addEventListener('click', (e) => {
        const c = document.getElementById('bcos-control-center');
        if (c && c.classList.contains('open') &&
            !e.target.closest('#bcos-control-center') && !e.target.closest('#bcos-cc-toggle')) {
            _bcos8CloseCC();
        }
    });
}
function _bcos8InjectCCToggle() {
    const right = document.querySelector('.bcos-menubar-right');
    if (!right) return;
    if (!document.getElementById('bcos-cc-toggle')) {
        const t = document.createElement('div');
        t.id = 'bcos-cc-toggle';
        t.title = '控制中心';
        t.textContent = '🎛️';
        t.onclick = (e) => { e.stopPropagation(); _bcos8ToggleCC(); };
        right.prepend(t);
    }
    // 应用抽屉入口 (Dock 已移除)
    if (!document.getElementById('bcos-drawer-toggle')) {
        const d = document.createElement('div');
        d.id = 'bcos-drawer-toggle';
        d.title = '应用抽屉';
        d.textContent = '🚀';
        d.style.cssText = 'cursor:pointer;padding:4px 8px;border-radius:9px;font-size:14px;';
        d.onmouseover = () => d.style.background = 'rgba(255,255,255,.12)';
        d.onmouseout = () => d.style.background = 'none';
        d.onclick = (e) => { e.stopPropagation(); _bcosToggleAppDrawer(); };
        const cc = document.getElementById('bcos-cc-toggle');
        if (cc) cc.after(d); else right.prepend(d);
    }
}

/* ---------- 初始化 (桌面加载后调用) ---------- */
function _bcos8Init() {
    window._bcosBootTime = Date.now();
    _bcos8ShowBoot();
    _bcos8RenderDeskClock();
    _bcos8RenderCC();
    _bcos8InjectCCToggle();
}
