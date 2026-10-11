/* ==================== App Drawer / 应用抽屉 ==================== */
function _bcosCollectDrawerApps() {
    // 从桌面图标 (已隐藏) 收集应用列表, 保证与系统一致
    // + 合并 localStorage 中的自定义/商店应用 (确保完整显示)
    const apps = [];
    const seen = new Set();
    // 自定义应用优先 (商店安装的)
    try {
        const customs = JSON.parse(localStorage.getItem('bcos_custom_apps') || '[]');
        customs.forEach(a => {
            if (a && a.id && !seen.has(a.id)) {
                seen.add(a.id);
                apps.push({ id: a.id, icon: a.icon || '📦', name: a.name || a.id, custom: true });
            }
        });
    } catch(e) {}
    document.querySelectorAll('.bcos-desktop-icons .bcos-desktop-icon').forEach(el => {
        const oc = el.getAttribute('onclick') || '';
        let id = '';
        const m = oc.match(/_bcosOpenApp\('([\w-]+)'\)/);
        if (m) id = m[1];
        else if (oc.indexOf('showBcosCarLockscreen') >= 0) id = 'carlock';
        // v8.0.1 修复: JS 赋值的 onclick (el.onclick = ...) 不会出现在 attribute 中, 从 ID 提取
        if (!id) {
            const idAttr = el.getAttribute('id') || '';
            const im = idAttr.match(/^bcos-desk-icon-([\w-]+)$/);
            if (im) id = im[1];
        }
        // 再从内部的 data 属性或文本兜底
        if (!id && el.dataset && el.dataset.appId) id = el.dataset.appId;
        if (!id || seen.has(id)) return;
        seen.add(id);
        const em = el.querySelector('.bcos-desktop-icon-emoji');
        const lb = el.querySelector('.bcos-desktop-icon-label');
        apps.push({ id, icon: em ? em.innerHTML : '📦', name: lb ? lb.textContent.trim() : id });
    });
    return apps;
}
function _bcosRenderDrawerApps(filter) {
    const grid = document.getElementById('bcos-drawer-grid');
    if (!grid) return;
    const q = (filter || '').trim().toLowerCase();
    const apps = _bcosCollectDrawerApps().filter(a =>
        !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
    if (!apps.length) {
        grid.innerHTML = '<div class="bcos-drawer-empty">没有找到匹配的应用 🐰</div>';
        return;
    }
    grid.innerHTML = apps.map((a, i) => {
        const running = typeof _bcos !== 'undefined' && _bcos.wins && !!_bcos.wins[a.id];
        return `<div class="bcos-drawer-app${running ? ' running' : ''}" style="transition-delay:${Math.min(i * 22, 440)}ms" onclick="_bcosDrawerLaunch('${a.id}')">` +
        `<div class="bcos-drawer-app-icon">${a.icon}</div>` +
        `<div class="bcos-drawer-app-name">${a.name.replace(/</g, '&lt;')}</div>` +
        (running ? '<div class="bcos-drawer-app-running-dot"></div>' : '') + `</div>`;
    }).join('');
}
function _bcosDrawerFilter(q) { _bcosRenderDrawerApps(q); }
function _bcosDrawerLaunch(id) {
    _bcosCloseAppDrawer();
    setTimeout(() => {
        if (id === 'carlock') { if (typeof showBcosCarLockscreen === 'function') showBcosCarLockscreen(); }
        else if (typeof _bcosOpenApp === 'function') _bcosOpenApp(id);
    }, 120);
}
function _bcosOpenAppDrawer() {
    const d = document.getElementById('bcos-app-drawer');
    if (!d) return;
    const s = document.getElementById('bcos-drawer-search');
    if (s) s.value = '';
    _bcosRenderDrawerApps('');
    d.classList.add('open');
    setTimeout(() => { const si = document.getElementById('bcos-drawer-search'); if (si && window.innerWidth > 768) si.focus(); }, 350);
}
function _bcosCloseAppDrawer() {
    const d = document.getElementById('bcos-app-drawer');
    if (d) d.classList.remove('open');
}
function _bcosToggleAppDrawer() {
    const d = document.getElementById('bcos-app-drawer');
    if (d && d.classList.contains('open')) _bcosCloseAppDrawer();
    else _bcosOpenAppDrawer();
}
// ESC 关闭抽屉
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const d = document.getElementById('bcos-app-drawer');
        if (d && d.classList.contains('open')) _bcosCloseAppDrawer();
    }
});
