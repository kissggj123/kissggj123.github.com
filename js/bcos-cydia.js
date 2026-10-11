/* ===== js/bcos-cydia.js — Cydia 风格软件源 (模块包管理 UI) ===== */
function _bcosRenderCydiaApp(content) {
    content.style.padding = '0';
    content.style.overflow = 'auto';
    content.innerHTML = `<div style="max-width:620px;margin:0 auto;padding:16px;">
        <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:44px;margin-bottom:8px;">📦</div>
            <div style="font-size:20px;font-weight:800;color:#f2f4ff;">BCOS 软件源</div>
            <div style="font-size:11px;color:rgba(242,244,255,.5);margin-top:4px;">Cydia 式模块管理 · A/B 无缝更新</div>
            <div id="cydia-status" style="font-size:11px;color:#aab6ff;margin-top:8px;">正在连接软件源…</div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
            <button onclick="_bcosCydiaCheck()" style="flex:1;background:linear-gradient(135deg,#7c8cff,#9a7cff);border:none;color:#fff;padding:10px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">🔄 检查更新</button>
            <button onclick="_bcosCydiaUpdateAll()" id="cydia-update-all" style="flex:1;background:rgba(52,199,89,.15);border:1px solid rgba(52,199,89,.4);color:#34c759;padding:10px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;display:none;">⚡ 全部更新</button>
        </div>
        <div id="cydia-list"></div>
        <div style="margin-top:14px;background:rgba(255,193,7,.08);border:1px solid rgba(255,193,7,.25);border-radius:12px;padding:12px;font-size:11px;color:#ffc107;line-height:1.6;">
            💡 <b>A/B 无缝更新</b>：下载的更新存入 B 分区，下次启动时自动切换，无需重装 PWA，更新过程不中断使用。
        </div>
    </div>`;
    _bcosCydiaCheck();
}
window._bcosCydiaCheck = async function() {
    const st = document.getElementById('cydia-status');
    const list = document.getElementById('cydia-list');
    const allBtn = document.getElementById('cydia-update-all');
    if (st) st.textContent = '正在检查…';
    if (list) list.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">⏳</div>';
    try {
        const { registry, updates, total } = await window._bcosPkgCheck();
        // 初始化已安装记录
        await window._bcosPkgInitInstalled(registry);
        const pending = await window._bcosPkgPending();
        if (st) st.innerHTML = `软件源 v${registry.version} · ${total} 个模块` + (pending.length ? ` · <span style="color:#ff9500;">${pending.length} 个待重启激活</span>` : '');
        if (allBtn) allBtn.style.display = updates.length ? '' : 'none';
        if (!updates.length) {
            list.innerHTML = '<div style="text-align:center;padding:30px;color:#34c759;font-size:14px;">✅ 所有模块已是最新</div>';
            return;
        }
        list.innerHTML = updates.map(u => `
            <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:700;color:#f2f4ff;">${u.id}</div>
                        <div style="font-size:11px;color:#888;margin-top:2px;">${u.desc || ''}</div>
                        <div style="font-size:11px;margin-top:4px;">
                            <span style="color:#888;">${u.installedVersion}</span>
                            <span style="color:#aab6ff;margin:0 6px;">→</span>
                            <span style="color:#34c759;font-weight:700;">${u.version}</span>
                            ${u.staged ? '<span style="color:#ff9500;margin-left:6px;">⏳ 待激活</span>' : ''}
                            ${u.critical ? '<span style="color:#ff453a;margin-left:6px;">🔴 核心</span>' : ''}
                        </div>
                    </div>
                    <button onclick="${u.staged ? `_bcosCydiaActivate('${u.id}')` : `_bcosCydiaInstall('${u.id}')`}"
                        style="background:${u.staged ? 'rgba(52,199,89,.15)' : 'rgba(124,140,255,.15)'};border:1px solid ${u.staged ? 'rgba(52,199,89,.4)' : 'rgba(124,140,255,.4)'};color:${u.staged ? '#34c759' : '#fff'};padding:8px 14px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">
                        ${u.staged ? '⚡ 立即激活' : '⬇️ 更新'}
                    </button>
                </div>
                <div id="cydia-prog-${u.id}" style="display:none;margin-top:8px;font-size:11px;color:#aab6ff;">下载中…</div>
            </div>`).join('');
        // 保存 registry 供安装用
        window._bcosCydiaReg = registry;
    } catch(e) {
        if (st) st.textContent = '❌ 连接失败: ' + e.message;
        if (list) list.innerHTML = '<div style="text-align:center;color:#ff6b62;padding:20px;">无法连接软件源，请检查网络</div>';
    }
};
window._bcosCydiaInstall = async function(id) {
    const prog = document.getElementById('cydia-prog-' + id);
    if (prog) { prog.style.display = ''; prog.textContent = '⬇️ 下载中…'; }
    try {
        const meta = window._bcosCydiaReg.modules[id];
        await window._bcosPkgDownload(id, meta);
        if (typeof showToast === 'function') showToast('✅ ' + id + ' 已下载到 B 分区，重启后生效');
        _bcosCydiaCheck();
    } catch(e) {
        if (prog) prog.textContent = '❌ ' + e.message;
    }
};
window._bcosCydiaActivate = async function(id) {
    if (!confirm(`立即激活 ${id}？\n\n将热替换当前运行的模块，无需重启。\n核心模块建议重启后生效。`)) return;
    try {
        const pending = await window._bcosPkgPending();
        const mod = pending.find(m => m.id === id);
        if (!mod || !mod.staged) { alert('未找到待激活的模块'); return; }
        const code = mod.staged.code;
        const isCSS = mod.file.endsWith('.css');
        if (isCSS) {
            // 热替换 CSS: 移除旧 style, 注入新
            document.querySelectorAll('style[data-bcos-module-css]').forEach(s => s.remove());
            // 重新注入所有 active CSS (简化: 只注入这一个, 标记)
            const s = document.createElement('style');
            s.textContent = code;
            s.setAttribute('data-bcos-module-css', '1');
            s.setAttribute('data-module-id', id);
            document.head.appendChild(s);
        } else {
            // 热替换 JS: 重新执行代码 (覆盖全局函数)
            const s = document.createElement('script');
            s.textContent = code;
            document.head.appendChild(s);
        }
        // 标记为 active
        await window._bcosPkgActivateStaged();
        if (typeof showToast === 'function') showToast(`⚡ ${id} 已热激活`);
        _bcosCydiaCheck();
    } catch(e) {
        alert('激活失败: ' + e.message);
    }
};
window._bcosCydiaUpdateAll = async function() {
    if (!window._bcosCydiaReg) return;
    const { updates } = await window._bcosPkgCheck();
    const pending = updates.filter(u => !u.staged);
    if (!pending.length) { if (typeof showToast === 'function') showToast('已是最新'); return; }
    if (typeof showToast === 'function') showToast(`⚡ 正在并行下载 ${pending.length} 个模块…`);
    // 并行下载
    await Promise.allSettled(pending.map(u => window._bcosPkgDownload(u.id, window._bcosCydiaReg.modules[u.id])));
    if (typeof showToast === 'function') showToast('✅ 全部已下载，重启后生效');
    _bcosCydiaCheck();
};
