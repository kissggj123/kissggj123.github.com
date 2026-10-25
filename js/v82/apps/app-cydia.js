/* v9 apps/app-cydia.js — BCOS 软件源 (Cydia 式包管理 · 热更新) */
(function() {
'use strict';

function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

window._bcosAppCydia = {
    id: 'cydia', name: 'BCOS 软件源', icon: '📦',
    render: function() {
        return '<div id="cydia9-root" style="padding:16px;color:#fff;font-size:13px;height:100%;overflow:auto;box-sizing:border-box">' +
            '<div style="text-align:center;margin-bottom:14px">' +
            '<div style="font-size:38px">📦</div>' +
            '<div style="font-size:18px;font-weight:800;margin-top:4px">BCOS 软件源</div>' +
            '<div style="font-size:11px;opacity:.55;margin-top:2px">Cydia 式模块管理 · A/B 无缝热更新</div>' +
            '<div id="cydia9-status" style="font-size:11px;color:#aab6ff;margin-top:8px">正在连接软件源…</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-bottom:12px">' +
            '<button id="cydia9-check" style="flex:1;background:linear-gradient(135deg,#7c8cff,#9a7cff);border:none;color:#fff;padding:10px;border-radius:12px;font-weight:700;cursor:pointer">🔄 检查更新</button>' +
            '<button id="cydia9-update-all" style="flex:1;background:rgba(52,199,89,.15);border:1px solid rgba(52,199,89,.4);color:#34c759;padding:10px;border-radius:12px;font-weight:700;cursor:pointer;display:none">⚡ 全部更新</button>' +
            '</div>' +
            '<div id="cydia9-list"><div style="text-align:center;opacity:.5;padding:24px">⏳</div></div>' +
            '<div style="margin-top:12px;background:rgba(255,193,7,.08);border:1px solid rgba(255,193,7,.25);border-radius:12px;padding:10px;font-size:11px;color:#ffc107;line-height:1.7">' +
            '💡 <b>热更新说明</b>:更新经由 Service Worker 覆盖注入,立即激活可热替换运行中代码,失败自动回退,不影响启动。核心模块建议重启后生效。</div>' +
            '</div>';
    },
    onOpen: function(win) {
        const root = document.getElementById('cydia9-root');
        if (!root) return;
        root.querySelector('#cydia9-check').onclick = function() { _check(); };
        root.querySelector('#cydia9-update-all').onclick = function() { _updateAll(); };
        _check();
    }
};

function _toast(m) { if (window.showToast) window.showToast(m); else console.log('[Cydia]', m); }

async function _check() {
    const st = document.getElementById('cydia9-status');
    const list = document.getElementById('cydia9-list');
    const allBtn = document.getElementById('cydia9-update-all');
    if (st) st.textContent = '正在检查…';
    if (list) list.innerHTML = '<div style="text-align:center;opacity:.5;padding:24px">⏳</div>';
    try {
        const result = await BCOS.pkg.check();
        const reg = result.registry || (window._bcosRegistry || { modules: {} });
        const updates = result.updates || [];
        let pendingCount = 0;
        try { pendingCount = (await window._bcosPkgPending()).length; } catch (e) {}
        if (st) st.innerHTML = '软件源 v' + _esc(reg.version || '?') + ' · ' + Object.keys(reg.modules).length + ' 个模块' +
            (pendingCount ? ' · <span style="color:#ff9500">' + pendingCount + ' 个待激活</span>' : '');
        if (allBtn) allBtn.style.display = updates.length ? '' : 'none';
        if (!updates.length) {
            list.innerHTML = '<div style="text-align:center;padding:28px;color:#34c759;font-weight:700">✅ 所有模块已是最新</div>';
            return;
        }
        list.innerHTML = updates.map(function(u) {
            return '<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;margin-bottom:10px">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:700">' + _esc(u.id) + (u.critical ? ' <span style="color:#ff453a;font-size:11px">🔴 核心</span>' : '') + '</div>' +
                '<div style="font-size:11px;opacity:.6;margin-top:2px">' + _esc(u.desc || '') + '</div>' +
                '<div style="font-size:11px;margin-top:4px"><span style="opacity:.6">' + _esc(u.installedVersion || 'none') + '</span>' +
                ' <span style="color:#aab6ff;margin:0 6px">→</span> <span style="color:#34c759;font-weight:700">' + _esc(u.version) + '</span>' +
                (u.staged ? ' <span style="color:#ff9500;margin-left:6px">⏳ 待激活</span>' : '') + '</div>' +
                '</div>' +
                '<button data-act="' + (u.staged ? 'activate' : 'install') + '" data-id="' + _esc(u.id) + '" style="background:' + (u.staged ? 'rgba(52,199,89,.15)' : 'rgba(124,140,255,.15)') + ';border:1px solid ' + (u.staged ? 'rgba(52,199,89,.4)' : 'rgba(124,140,255,.4)') + ';color:' + (u.staged ? '#34c759' : '#fff') + ';padding:8px 14px;border-radius:10px;font-weight:600;cursor:pointer;white-space:nowrap">' +
                (u.staged ? '⚡ 激活' : '⬇️ 更新') + '</button>' +
                '</div>' +
                '<div id="cydia9-prog-' + _esc(u.id) + '" style="display:none;margin-top:8px;font-size:11px;color:#aab6ff"></div>' +
                '</div>';
        }).join('');
        list.querySelectorAll('button[data-act]').forEach(function(btn) {
            btn.onclick = function() {
                const id = btn.getAttribute('data-id');
                if (btn.getAttribute('data-act') === 'activate') _activateOne(id); else _installOne(id);
            };
        });
    } catch (e) {
        if (st) st.textContent = '❌ 连接失败: ' + e.message;
        if (list) list.innerHTML = '<div style="text-align:center;color:#ff6b62;padding:24px">无法连接软件源,请检查网络</div>';
    }
}

async function _installOne(id) {
    const prog = document.getElementById('cydia9-prog-' + id);
    if (prog) { prog.style.display = ''; prog.textContent = '⬇️ 下载中…'; }
    try {
        const pkg = await BCOS.pkg.hotInstall(id);
        if (prog) prog.textContent = '📦 已注入 SW 覆盖缓存';
        const ok = confirm('已下载 ' + id + '\n\n⚡ 立即热激活 (不刷新页面)?\n核心模块建议选择"否",重启后自动生效。');
        if (ok) {
            pkg.activate();
            if (prog) prog.textContent = '⚡ 已热激活';
            _toast('⚡ ' + id + ' 已热激活');
        } else {
            if (prog) prog.textContent = '✅ 已下载,重启后生效';
            _toast('✅ ' + id + ' 将在重启后生效');
        }
        _check();
    } catch (e) {
        if (prog) prog.textContent = '❌ ' + e.message;
        _toast('❌ ' + id + ': ' + e.message);
    }
}

async function _activateOne(id) {
    try {
        const pending = await window._bcosPkgPending();
        const mod = pending.find(function(m) { return m.id === id; });
        if (!mod || !mod.staged) { _toast('未找到待激活模块'); return; }
        const isCSS = /\.css$/.test(mod.file || '');
        BCOS.pkg.hotActivate(id, mod.staged.code, isCSS ? 'text/css' : 'application/javascript');
        await window._bcosPkgActivateStaged();
        _toast('⚡ ' + id + ' 已热激活');
        _check();
    } catch (e) { _toast('❌ 激活失败: ' + e.message); }
}

async function _updateAll() {
    try {
        const result = await BCOS.pkg.check();
        const updates = (result.updates || []).filter(function(u) { return !u.staged; });
        if (!updates.length) { _toast('已是最新'); return; }
        _toast('⚡ 正在并行下载 ' + updates.length + ' 个模块…');
        const reg = result.registry || window._bcosRegistry;
        await Promise.allSettled(updates.map(function(u) {
            return window._bcosPkgDownload ? window._bcosPkgDownload(u.id, reg.modules[u.id]) : Promise.reject(new Error('pkg 未就绪'));
        }));
        _toast('✅ 全部已下载,重启后生效');
        _check();
    } catch (e) { _toast('❌ ' + e.message); }
}

// 监听模块热更新事件 → 状态栏提示
document.addEventListener('bcos:module:hot-updated', function(e) {
    console.log('[Cydia] 模块热更新:', e.detail && e.detail.id);
});

// 注册到 v82 应用表 (抽屉/统一启动入口)
if (window.BCOS) BCOS.app.registerV82(window._bcosAppCydia);
if (!window._bcosV82Apps) window._bcosV82Apps = {};
window._bcosV82Apps['cydia'] = window._bcosAppCydia;
console.log('[Cydia] v9 软件源应用已注册 (BCOS.pkg 热更新)');
})();
