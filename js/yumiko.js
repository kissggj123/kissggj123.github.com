/* ===== js/yumiko.js — YumikoToys 上帝模式工具箱 (v8.0.1) ===== */
    // ===== YumikoToys 上帝模式工具箱 =====
    function _bcosRenderYumikoToys(content) {
        content.style.padding = '0';
        content.style.overflow = 'auto';
        const perf = (window._bcosPerf && window._bcosPerf.report) ? window._bcosPerf.report() : { fps: '—', longTasks: '—', mem: '—' };
        const card = (title, inner) => `<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px;margin-bottom:12px;"><div style="font-size:13px;font-weight:700;margin-bottom:10px;color:#f2f4ff;">${title}</div>${inner}</div>`;
        const tgl = (id, label, checked, fn) => `<label style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12.5px;cursor:pointer;"><span>${label}</span><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="${fn}(this.checked)" style="width:38px;height:22px;accent-color:#7c8cff;cursor:pointer;"></label>`;
        const btn = (label, fn, color) => `<button onclick="${fn}" style="background:${color || 'rgba(124,140,255,.15)'};border:1px solid rgba(124,140,255,.4);color:#fff;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;margin:4px 4px 4px 0;">${label}</button>`;

        content.innerHTML = `<div style="padding:16px;max-width:600px;margin:0 auto;">
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:44px;margin-bottom:8px;">🧰</div>
                <div style="font-size:20px;font-weight:800;background:linear-gradient(135deg,#aab6ff,#d8b8ff 50%,#ffb6d9);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">YumikoToys</div>
                <div style="font-size:11px;color:rgba(242,244,255,.5);margin-top:4px;">上帝模式 · 系统调教工具箱 · v8.0.1</div>
            </div>
            ${card('⚡ 实时性能', `
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
                    <div style="background:rgba(0,0,0,.3);border-radius:10px;padding:10px;"><div style="font-size:22px;font-weight:800;color:#7c8cff;" id="yumiko-fps">${perf.fps}</div><div style="font-size:10px;color:#888;">FPS</div></div>
                    <div style="background:rgba(0,0,0,.3);border-radius:10px;padding:10px;"><div style="font-size:22px;font-weight:800;color:#34c759;">${perf.mem}</div><div style="font-size:10px;color:#888;">JS 内存</div></div>
                    <div style="background:rgba(0,0,0,.3);border-radius:10px;padding:10px;"><div style="font-size:22px;font-weight:800;color:#ff9500;">${perf.longTasks}</div><div style="font-size:10px;color:#888;">长任务</div></div>
                </div>
                <div style="margin-top:8px;">${btn('🔄 刷新数据', '_bcosRenderYumikoToys(document.querySelector(\'[data-yumiko]\')) || location.reload()', 'rgba(52,199,89,.15)')}</div>
            `)}
            ${card('🎨 视觉特效', `
                ${tgl('yumiko-motion', '🌊 全局动效 (Motion Design)', !document.body.classList.contains('bcos-no-motion'), '_bcosYumikoToggleMotion')}
                ${tgl('yumiko-party', '🎉 派对模式 (10秒)', false, '_bcosYumikoToggleParty')}
                <div style="margin-top:8px;">
                    ${btn('🌈 彩虹窗口', '_bcosPartyMode()')}
                    ${btn('✨ 彩蛋: Konami', 'showToast(\'↑↑↓↓←→←→BA\')')}
                </div>
            `)}
            ${card('🧹 缓存与存储', `
                <div style="margin-bottom:8px;">
                    ${btn('🗑️ 清空全部缓存', '_bcosForceUpdate()', 'rgba(255,69,58,.15)')}
                    ${btn('📊 存储详情', '_bcosOpenApp(\'settings\')')}
                </div>
                <div style="font-size:11px;color:#888;" id="yumiko-storage">计算中…</div>
            `)}
            ${card('🔧 开发者', `
                ${btn('📜 打开控制台日志', '_bcosOpenApp(\'logs\')')}
                ${btn('📊 活动监视器', '_bcosOpenApp(\'monitor\')')}
                ${btn('🔄 硬重载', 'location.reload(true)')}
                ${btn('💾 导出 localStorage', '_bcosYumikoExportStorage()', 'rgba(52,199,89,.15)')}
            `)}
            <div style="text-align:center;font-size:10px;color:rgba(242,244,255,.3);margin-top:8px;">⚠️ 上帝模式：操作不可撤销，请谨慎</div>
        </div>`;
        content.querySelector(':scope > div').setAttribute('data-yumiko', '1');
        // 异步计算存储
        setTimeout(() => {
            const el = document.getElementById('yumiko-storage');
            if (el) {
                let total = 0;
                try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); total += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch(e) {}
                el.textContent = `localStorage: ${(total / 1024).toFixed(1)} KB / ~5120 KB (${(total / 5120 / 10.24).toFixed(1)}%)`;
            }
        }, 100);
    }
    window._bcosYumikoToggleMotion = function(on) {
        document.body.classList.toggle('bcos-no-motion', !on);
        try { localStorage.setItem('bcos_no_motion', on ? '0' : '1'); } catch(e) {}
    };
    window._bcosYumikoToggleParty = function(on) {
        if (on && window._bcosPartyMode) window._bcosPartyMode();
    };
    window._bcosYumikoExportStorage = function() {
        try {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); data[k] = localStorage.getItem(k); }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'bcos-localStorage-backup.json';
            a.click();
            if (typeof showToast === 'function') showToast('✅ 已导出 localStorage 备份');
        } catch(e) { alert('导出失败: ' + e.message); }
    };
