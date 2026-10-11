function _bcosGetInstalledAppIds() {
    try {
        const stored = localStorage.getItem('bcos_installed_apps');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return ['calculator', 'weather', 'notes', 'radio'];
}

function _bcosSetInstalledAppIds(ids) {
    try {
        localStorage.setItem('bcos_installed_apps', JSON.stringify(ids));
    } catch(e) {}
    if (typeof _bcosRenderDock === 'function') _bcosRenderDock();
    if (typeof _bcosUpdateDock === 'function') _bcosUpdateDock();
    _bcosSyncDesktopAppIcons();
}

function _bcosGetCustomApps() {
    try {
        const stored = localStorage.getItem('bcos_custom_apps');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [];
}

function _bcosSaveCustomApps(apps) {
    try {
        localStorage.setItem('bcos_custom_apps', JSON.stringify(apps));
    } catch(e) {}
}

function _bcosSyncDesktopAppIcons() {
    const desktopIcons = document.querySelector('.bcos-desktop-icons');
    if (!desktopIcons) return;
    const installed = _bcosGetInstalledAppIds();
    const customs = _bcosGetCustomApps();
    
    // Check extra apps to inject
    const extraAppDefs = [
        { id: 'calculator', name: '计算器', icon: '🧮' },
        { id: 'weather', name: '天气看板', icon: '🌤️' },
        { id: 'notes', name: '便签', icon: '📌' },
        { id: 'radio', name: '兔兔电台', icon: '📻' },
        { id: 'snake', name: '贪吃蛇', icon: '🐍' },
        { id: 'paint', name: '像素画板', icon: '🎨' }
    ];

    extraAppDefs.forEach(app => {
        let el = document.getElementById('bcos-desk-icon-' + app.id);
        if (installed.includes(app.id)) {
            if (!el) {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'bcos-desktop-icon';
                iconDiv.id = 'bcos-desk-icon-' + app.id;
                iconDiv.onclick = () => _bcosOpenApp(app.id);
                iconDiv.innerHTML = `<div class="bcos-desktop-icon-emoji">${app.icon}</div><div class="bcos-desktop-icon-label">${_bcosEscape(app.name)}</div>`;
                desktopIcons.appendChild(iconDiv);
            }
        } else {
            if (el) { if (typeof el.remove === 'function') el.remove(); else if (el.parentNode) el.parentNode.removeChild(el); }
        }
    });

    customs.forEach(c => {
        let el = document.getElementById('bcos-desk-icon-' + c.id);
        if (installed.includes(c.id)) {
            if (!el) {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'bcos-desktop-icon';
                iconDiv.id = 'bcos-desk-icon-' + c.id;
                iconDiv.onclick = () => _bcosOpenApp(c.id);
                iconDiv.innerHTML = `<div class="bcos-desktop-icon-emoji">${_bcosEscape(c.icon || '📦')}</div><div class="bcos-desktop-icon-label">${_bcosEscape(c.name)}</div>`;
                desktopIcons.appendChild(iconDiv);
            }
        } else {
            if (el) { if (typeof el.remove === 'function') el.remove(); else if (el.parentNode) el.parentNode.removeChild(el); }
        }
    });

    // Tag new icons for the desktop icon manager (drag / rename / delete) and re-apply saved layout
    if (typeof _bcosTagDesktopIcons === 'function') {
        _bcosTagDesktopIcons();
        _bcosApplyDesktopIconState();
    }
}

// --- macOS BCOS Anniversary App ---
_bcosAnniAppTimer = null;

function _bcosRenderAnniversaryApp(content) {
    content.style.padding = '0';
    content.style.overflow = 'hidden';
    content.style.height = '100%';
    content.innerHTML = `
        <div class="bcos-anni-container" id="bcos-anni-app-root">
            <div class="bcos-anni-hero">
                <div style="font-size:12px;font-weight:700;color:var(--accent,#ff6b9d);letter-spacing:2px;margin-bottom:4px;">🐰 BUNNY COCKPIT ANNIVERSARY</div>
                <div class="bcos-anni-big-days" id="bcos-anni-days-val">--</div>
                <div class="bcos-anni-unit">DAYS IN HARMONY · 累计相伴</div>
                <div class="bcos-anni-subtime" id="bcos-anni-time-val">-- 时 -- 分 -- 秒 .---</div>
                <div class="bcos-anni-since">兔可可相伴始于 2024/03/12 · 虚拟纪元</div>
            </div>

            <div class="bcos-anni-actions">
                <button class="bcos-anni-btn primary" onclick="showBcosCarLockscreen()">🚗 开启车机全屏锁屏</button>
                <button class="bcos-anni-btn" onclick="copyCarScreenUrl()">📋 复制车机专属链接</button>
                <button class="bcos-anni-btn" onclick="_bcosOpenAddAnniversaryModal()">➕ 添加自定义纪念日</button>
            </div>

            <div id="bcos-anni-next-box"></div>

            <div>
                <div class="bcos-anni-section-title">🎯 历程里程碑成就树</div>
                <div class="bcos-anni-ms-list" id="bcos-anni-ms-container"></div>
            </div>

            <div>
                <div class="bcos-anni-section-title">💖 自定义纪念日与特别约定</div>
                <div class="bcos-anni-ms-list" id="bcos-anni-custom-container"></div>
            </div>

            <!-- In-Window Add Anniversary Modal (Never calls prompt, preserves Fullscreen) -->
            <div id="bcos-anni-modal" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:999;align-items:center;justify-content:center;padding:1rem;">
                <div style="background:#1e2433;border:1px solid rgba(255,107,157,0.4);box-shadow:0 16px 40px rgba(0,0,0,0.6);border-radius:14px;padding:1.4rem;width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px;color:#fff;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="margin:0;font-size:16px;color:#ff6b9d;display:flex;align-items:center;gap:6px;">💖 添加自定义纪念日</h3>
                        <button onclick="_bcosCloseAddAnniversaryModal()" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:18px;line-height:1;">✕</button>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#cbd5e1;margin-bottom:4px;display:block;">纪念日名称</label>
                        <input type="text" id="bcos-anni-input-name" placeholder="例如: 恋爱纪念日、提车日、生日" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#fff;font-size:13px;outline:none;box-sizing:border-box;" />
                    </div>
                    <div>
                        <label style="font-size:12px;color:#cbd5e1;margin-bottom:4px;display:block;">纪念日日期</label>
                        <input type="date" id="bcos-anni-input-date" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#fff;font-size:13px;outline:none;box-sizing:border-box;" />
                    </div>
                    <div>
                        <label style="font-size:12px;color:#cbd5e1;margin-bottom:4px;display:block;">图标选择 (Emoji)</label>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;" id="bcos-anni-emoji-picker">
                            <span class="bcos-anni-emoji-opt active" onclick="_bcosSelectAnniEmoji('💖')">💖</span>
                            <span class="bcos-anni-emoji-opt" onclick="_bcosSelectAnniEmoji('🚗')">🚗</span>
                            <span class="bcos-anni-emoji-opt" onclick="_bcosSelectAnniEmoji('🎂')">🎂</span>
                            <span class="bcos-anni-emoji-opt" onclick="_bcosSelectAnniEmoji('💍')">💍</span>
                            <span class="bcos-anni-emoji-opt" onclick="_bcosSelectAnniEmoji('🌸')">🌸</span>
                            <span class="bcos-anni-emoji-opt" onclick="_bcosSelectAnniEmoji('✈️')">✈️</span>
                            <span class="bcos-anni-emoji-opt" onclick="_bcosSelectAnniEmoji('🐾')">🐾</span>
                            <span class="bcos-anni-emoji-opt" onclick="_bcosSelectAnniEmoji('🌟')">🌟</span>
                        </div>
                        <input type="hidden" id="bcos-anni-selected-emoji" value="💖" />
                    </div>
                    <div style="display:flex;gap:10px;margin-top:6px;">
                        <button onclick="_bcosSubmitAddAnniversary()" style="flex:1;background:var(--accent,#ff6b9d);color:#fff;border:none;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">✓ 确认保存</button>
                        <button onclick="_bcosCloseAddAnniversaryModal()" style="background:rgba(255,255,255,0.1);color:#eee;border:none;padding:8px 14px;border-radius:6px;font-size:13px;cursor:pointer;">取消</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    _bcosUpdateAnniversaryApp();
    if (_bcosAnniAppTimer) clearInterval(_bcosAnniAppTimer);
    _bcosAnniAppTimer = setInterval(_bcosUpdateAnniversaryApp, 100);
}

function _bcosOpenAddAnniversaryModal() {
    const modal = document.getElementById('bcos-anni-modal');
    if (modal) {
        modal.style.display = 'flex';
        const dateInp = document.getElementById('bcos-anni-input-date');
        if (dateInp && !dateInp.value) {
            const now = new Date();
            dateInp.value = now.toISOString().split('T')[0];
        }
        const nameInp = document.getElementById('bcos-anni-input-name');
        if (nameInp) nameInp.focus();
    }
}

function _bcosCloseAddAnniversaryModal() {
    const modal = document.getElementById('bcos-anni-modal');
    if (modal) modal.style.display = 'none';
}

function _bcosSelectAnniEmoji(emoji) {
    const inp = document.getElementById('bcos-anni-selected-emoji');
    if (inp) inp.value = emoji;
    document.querySelectorAll('#bcos-anni-emoji-picker .bcos-anni-emoji-opt').forEach(el => {
        el.classList.toggle('active', el.textContent.trim() === emoji);
    });
}

function _bcosSubmitAddAnniversary() {
    const name = (document.getElementById('bcos-anni-input-name')?.value || '').trim();
    const date = (document.getElementById('bcos-anni-input-date')?.value || '').trim();
    const icon = document.getElementById('bcos-anni-selected-emoji')?.value || '💖';
    if (!name) {
        showToast('⚠️ 请输入纪念日名称');
        return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        showToast('⚠️ 请选择有效日期');
        return;
    }
    _bcosAddCustomAnniversary(name, date, icon);
    _bcosCloseAddAnniversaryModal();
    _bcosUpdateAnniversaryApp();
    showToast(`✓ 已添加纪念日: ${icon} ${name}`);
}

function _bcosUpdateAnniversaryApp() {
    if (document.hidden) return;
    const root = document.getElementById('bcos-anni-app-root');
    if (!root) {
        if (_bcosAnniAppTimer) { clearInterval(_bcosAnniAppTimer); _bcosAnniAppTimer = null; }
        return;
    }
    const data = _bcosGetAnniversaryData();
    const daysEl = document.getElementById('bcos-anni-days-val');
    const timeEl = document.getElementById('bcos-anni-time-val');
    if (daysEl && daysEl.textContent !== String(data.days)) daysEl.textContent = data.days;
    const timeStr = `${data.hours} 时 ${data.mins} 分 ${data.secs} 秒 .${data.ms}`;
    if (timeEl && timeEl.textContent !== timeStr) timeEl.textContent = timeStr;

    const nextBox = document.getElementById('bcos-anni-next-box');
    if (nextBox) {
        const nextKey = data.nextMilestone ? `${data.nextMilestone.label}_${data.nextMilestone.remainDays}_${data.nextPercent}` : 'none';
        if (nextBox.dataset.lastRenderKey !== nextKey) {
            nextBox.dataset.lastRenderKey = nextKey;
            if (data.nextMilestone) {
                nextBox.innerHTML = `
                    <div style="background:rgba(255,107,157,0.1);border:1px solid rgba(255,107,157,0.3);border-radius:12px;padding:.8rem 1rem;">
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:.8rem;">
                            <span style="color:#ff6b9d;font-weight:700;">🎯 下一个里程碑: ${data.nextMilestone.label}</span>
                            <span style="color:#00ff41;font-weight:700;">还剩 ${data.nextMilestone.remainDays} 天 (${data.nextPercent}%)</span>
                        </div>
                        <div style="height:7px;background:rgba(255,255,255,0.12);border-radius:4px;overflow:hidden;margin-top:.5rem;">
                            <div style="height:100%;width:${data.nextPercent}%;background:linear-gradient(90deg,#a78bfa,#ff6b9d);border-radius:4px;transition:width 0.4s ease;"></div>
                        </div>
                    </div>`;
            } else {
                nextBox.innerHTML = `
                    <div style="background:rgba(0,255,65,0.1);border:1px solid rgba(0,255,65,0.3);border-radius:12px;padding:.8rem 1rem;text-align:center;color:#00ff41;font-weight:700;font-size:.85rem;">
                        🏆 兔可可所有既定里程碑全满贯达成！
                    </div>`;
            }
        }
    }

    const msContainer = document.getElementById('bcos-anni-ms-container');
    if (msContainer && !msContainer._rendered) {
        msContainer.innerHTML = data.milestones.map(m => {
            const tag = m.reached ? '✅' : (data.nextMilestone === m ? '🎯' : '⏳');
            const stat = m.reached ? '<span style="color:#00ff41;font-weight:600;">已达成</span>' : `剩 ${m.remainDays} 天`;
            return `<div class="bcos-anni-ms-item ${m.reached ? 'reached' : (data.nextMilestone === m ? 'next' : '')}">
                <span>${tag} ${m.label}</span>
                <span style="opacity:.85;font-variant-numeric:tabular-nums;">${m.dateStr} (${stat})</span>
            </div>`;
        }).join('');
        msContainer._rendered = true;
    }

    const customContainer = document.getElementById('bcos-anni-custom-container');
    if (customContainer) {
        if (data.custom.length === 0) {
            customContainer.innerHTML = '<div style="color:#888;font-size:.8rem;padding:.8rem;text-align:center;background:rgba(255,255,255,0.03);border-radius:8px;">暂无自定义纪念日，点击上方【➕ 添加自定义纪念日】创建</div>';
        } else {
            customContainer.innerHTML = data.custom.map(c => {
                const statusStr = c.isPast ? `已相伴 ${c.daysDiff} 天` : `倒计时还有 ${c.daysDiff} 天`;
                return `<div class="bcos-anni-ms-item" style="border-left:3px solid var(--accent,#ff6b9d);">
                    <span style="font-weight:600;">${c.icon || '💖'} ${c.name}</span>
                    <div style="display:flex;align-items:center;gap:.6rem;">
                        <span style="opacity:.85;font-variant-numeric:tabular-nums;">${c.date} (${statusStr})</span>
                        <button onclick="_bcosDeleteCustomAnniversary('${c.id}')" title="删除纪念日" style="background:rgba(255,107,107,0.15);border:none;color:#ff6b6b;cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px;">✕</button>
                    </div>
                </div>`;
            }).join('');
        }
    }
}

function _bcosDeleteCustomAnniversary(id) {
    _bcosRemoveCustomAnniversary(id);
    _bcosUpdateAnniversaryApp();
    showToast('已删除纪念日');
}

// --- macOS BCOS App Store ---
const BCOS_CATALOG = [
    { id: 'calculator', name: '科学计算器', icon: '🧮', cat: 'tools', desc: '标准算术、三角函数、平方根与记忆运算', size: '24 KB', featured: true },
    { id: 'weather', name: '座舱天气看板', icon: '🌤️', cat: 'tools', desc: '实时舱外气象、温度、湿度、风力与24小时走势模拟', size: '36 KB', featured: true },
    { id: 'notes', name: '桌面便利贴', icon: '📌', cat: 'tools', desc: '多彩随手记便签，自动本地持久化同步与即时编辑', size: '18 KB', featured: true },
    { id: 'radio', name: '兔兔电台 Lo-Fi', icon: '📻', cat: 'games', desc: 'Web Audio 治愈系合成音效（雨声、篝火、咖啡厅）与白噪音', size: '42 KB', featured: true },
    { id: 'snake', name: '复古像素贪吃蛇', icon: '🐍', cat: 'games', desc: '怀旧60FPS像素掌机贪吃蛇，支持键盘方向键与触控摇杆', size: '32 KB', featured: false },
    { id: 'paint', name: '像素画板 Studio', icon: '🎨', cat: 'games', desc: '16x16 / 24x24 创意像素涂鸦画板，调色盘与 PNG 导出', size: '28 KB', featured: false }
];

function _bcosRenderAppStore(content) {
    content.style.padding = '0';
    content.style.overflow = 'hidden';
    content.style.height = '100%';
    content.innerHTML = `
        <div class="bcos-store-wrap">
            <div class="bcos-store-nav">
                <div class="bcos-store-tab active" onclick="_bcosSwitchStoreTab('featured', this)">🌟 精选推荐</div>
                <div class="bcos-store-tab" onclick="_bcosSwitchStoreTab('tools', this)">🚀 工具与效率</div>
                <div class="bcos-store-tab" onclick="_bcosSwitchStoreTab('games', this)">🎮 娱乐与游戏</div>
                <div class="bcos-store-tab" onclick="_bcosSwitchStoreTab('studio', this)">📤 应用工坊 (上传)</div>
                <div class="bcos-store-tab" onclick="_bcosSwitchStoreTab('installed', this)">📦 已安装管理</div>
            </div>
            <div class="bcos-store-content" id="bcos-store-body"></div>
        </div>
    `;
    _bcosShowStoreTab('featured');
}

function _bcosSwitchStoreTab(tabKey, tabEl) {
    document.querySelectorAll('.bcos-store-tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');
    _bcosShowStoreTab(tabKey);
}

function _bcosShowStoreTab(tabKey) {
    const body = document.getElementById('bcos-store-body');
    if (!body) return;
    window._bcosStoreCurTab = tabKey;
    const installed = _bcosGetInstalledAppIds();
    const customs = _bcosGetCustomApps();

    if (tabKey === 'studio') {
        body.innerHTML = `
            <div style="max-width:620px;margin:0 auto;display:flex;flex-direction:column;gap:1rem;">
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:1.2rem;">
                    <h3 style="margin:0 0 .5rem;color:var(--accent,#ff6b9d);font-size:16px;">📤 自定义应用工坊 (本地预处理)</h3>
                    <p style="margin:0 0 1rem;font-size:12px;color:#94a3b8;line-height:1.5;">支持上传本地单文件 HTML/JS 网页应用。与壁纸上传相同，应用将在浏览器本地直接解析、沙盒化预处理并保存于系统 IndexedDB/本地存储，安全且离线秒开。</p>
                    
                    <div style="display:flex;gap:10px;margin-bottom:12px;">
                        <input type="file" id="bcos-custom-app-file" accept=".html,.htm,.txt,.json,.js" style="display:none;" onchange="_bcosHandleCustomAppUpload(event)">
                        <button onclick="document.getElementById('bcos-custom-app-file').click()" class="bcos-store-btn" style="background:var(--accent,#ff6b9d);padding:8px 16px;font-size:13px;">📁 选择应用文件 (.html/.js)</button>
                        <button onclick="_bcosLoadAppSample()" class="bcos-store-btn" style="background:rgba(255,255,255,0.1);padding:8px 14px;font-size:12px;">💡 载入时钟示例代码</button>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <input type="text" id="bcos-custom-app-name" maxlength="60" oninput="this.dataset.auto='0'" placeholder="应用名称 (如: 霓虹数字时钟)" style="flex:1;min-width:180px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#fff;font-size:13px;outline:none;" />
                            <button onclick="_bcosShortenAppNameInput()" class="bcos-store-btn" title="把过长的名称智能截取为简短应用名" style="background:rgba(255,255,255,0.1);padding:6px 10px;font-size:12px;white-space:nowrap;">✂️ 短名</button>
                            <input type="text" id="bcos-custom-app-icon" oninput="this.dataset.auto='0'" placeholder="图标Emoji (如: ⏱️)" style="width:120px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#fff;font-size:13px;outline:none;" />
                        </div>
                        <div style="padding:6px 8px;background:rgba(0,0,0,0.25);border-radius:6px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                            <span style="font-size:11px;color:#94a3b8;margin-right:2px;">✨ 快捷选取图标:</span>
                            ${['⏱️','🎮','📱','🎵','🎨','📊','🧮','📝','🌐','💬','📷','🔋','🧭','🕹️','📦','🚀','⚡','💡','💎','🐱','🐰','🦊','🐼','🤖','🚗','🌤️','📁','🔒','⚙️','🛠️','🎯'].map(em => `<button type="button" onclick="_bcosSelectCustomAppIcon('${em}')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:4px;padding:2px 5px;cursor:pointer;font-size:13px;line-height:1;transition:all 0.15s;" title="使用图标 ${em}">${em}</button>`).join('')}
                        </div>
                        <textarea id="bcos-custom-app-code" oninput="_bcosAutoFillAppMeta()" placeholder="在此直接粘贴 HTML/CSS/JS 代码..." style="width:100%;height:140px;background:#0d1117;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#a5d6ff;font-family:monospace;font-size:12px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
                        <div style="display:flex;gap:10px;justify-content:flex-end;">
                            <button onclick="_bcosTestRunCustomApp()" class="bcos-store-btn" style="background:rgba(255,255,255,0.12);">👁️ 本地测试运行</button>
                            <button onclick="_bcosInstallCustomApp()" class="bcos-store-btn" style="background:#007aff;">✓ 预处理并安装到桌面与Dock</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    let appList = [];
    if (tabKey === 'featured') {
        appList = BCOS_CATALOG.filter(a => a.featured);
    } else if (tabKey === 'tools') {
        appList = BCOS_CATALOG.filter(a => a.cat === 'tools');
    } else if (tabKey === 'games') {
        appList = BCOS_CATALOG.filter(a => a.cat === 'games');
    } else if (tabKey === 'installed') {
        appList = BCOS_CATALOG.filter(a => installed.includes(a.id));
        customs.forEach(c => {
            if (installed.includes(c.id)) {
                appList.push({ id: c.id, name: c.name, icon: c.icon || '📦', desc: '用户本地工坊创建的自定义应用', size: c.size || '32 KB', isCustom: true });
            }
        });
    }

    if (appList.length === 0) {
        body.innerHTML = '<div style="text-align:center;color:#64748b;padding:3rem;font-size:13px;">暂无该分类应用</div>';
        return;
    }

    body.innerHTML = `
        <div class="bcos-store-grid">
            ${appList.map(app => {
                const isInst = installed.includes(app.id);
                return `
                    <div class="bcos-store-card" id="store-card-${app.id}">
                        <div class="bcos-store-card-header">
                            <div class="bcos-store-icon">${app.icon}</div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;font-size:14px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${app.name}</div>
                                <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${app.size || '20 KB'} · ${app.cat === 'games' ? '娱乐游戏' : '实用工具'}</div>
                            </div>
                            <button class="bcos-store-btn ${isInst ? 'installed' : ''}" id="store-btn-${app.id}" onclick="_bcosStoreAction('${app.id}', this)">
                                ${isInst ? '打开' : '获取'}
                            </button>
                        </div>
                        <div style="font-size:12px;color:#cbd5e1;line-height:1.4;margin-top:4px;">
                            ${app.desc}
                        </div>
                        ${isInst ? `
                            <div style="display:flex;justify-content:flex-end;margin-top:2px;">
                                <span onclick="_bcosUninstallApp('${app.id}')" style="font-size:11px;color:#ef4444;cursor:pointer;opacity:0.8;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">卸载应用</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function _bcosStoreAction(appId, btn) {
    const installed = _bcosGetInstalledAppIds();
    if (installed.includes(appId)) {
        _bcosOpenApp(appId);
        return;
    }

    // Simulate download & local installation progress
    btn.disabled = true;
    btn.style.width = '64px';
    let progress = 0;
    const timer = setInterval(() => {
        progress += 25;
        if (progress <= 90) {
            btn.textContent = progress + '%';
        } else {
            clearInterval(timer);
            btn.textContent = '打开';
            btn.disabled = false;
            btn.classList.add('installed');
            installed.push(appId);
            _bcosSetInstalledAppIds(installed);
            showToast(`✓ 应用安装成功！已添加至桌面与快捷Dock`);
            _bcosShowStoreTab(document.querySelector('.bcos-store-tab.active')?.textContent.includes('已安装') ? 'installed' : 'featured');
        }
    }, 180);
}

function _bcosUninstallApp(appId) {
    if (_bcos.wins[appId]) _bcosCloseWin(appId);
    if (String(appId).indexOf('custom_app_') === 0) {
        // Custom apps are removed entirely, otherwise they become orphans that can never be re-installed
        _bcosSaveCustomApps(_bcosGetCustomApps().filter(a => a.id !== appId));
        try {
            const st = _bcosIconStateLoad();
            if (st.icons[appId]) { delete st.icons[appId]; _bcosIconStateSave(st); }
        } catch(e) {}
    }
    let installed = _bcosGetInstalledAppIds();
    installed = installed.filter(id => id !== appId);
    _bcosSetInstalledAppIds(installed);
    showToast('已卸载应用并移出桌面');
    _bcosShowStoreTab('installed');
}

// ---- Custom app helpers: name / icon extraction, short names, code normalisation ----
function _bcosCleanAppName(s) {
    return String(s == null ? '' : s).replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function _bcosLeadingEmoji(str) {
    str = String(str || '');
    try {
        const re = new RegExp('^(?:\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?)*)', 'u');
        const m = str.match(re);
        if (m) return m[0];
    } catch(e) {
        const m2 = str.match(/^(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF])\uFE0F?/);
        if (m2) return m2[0];
    }
    return '';
}

function _bcosCharUnits(ch) {
    // CJK / full-width / emoji count as 2 display units, everything else as 1
    if (/[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/.test(ch)) return 2;
    if (ch.length > 1 || /[\u2600-\u27BF]/.test(ch)) return 2;
    return 1;
}

// Smart short name: cut at title separators ("霓虹时钟 - 在线工具箱 | xx" -> "霓虹时钟") and cap the display width
function _bcosShortAppName(raw, maxUnits) {
    maxUnits = maxUnits || 20;
    let s = _bcosCleanAppName(raw);
    if (!s) return '';
    const first = (s.split(/\s+[-–—·•]\s+|\s*[|｜—–]\s*|\s*[：:]\s+/)[0] || '').trim();
    if (first) s = first;
    let out = '', w = 0;
    const chars = Array.from(s);
    for (let i = 0; i < chars.length; i++) {
        const u = _bcosCharUnits(chars[i]);
        if (w + u > maxUnits) { out = out.replace(/\s+$/, '') + '…'; break; }
        out += chars[i];
        w += u;
    }
    return out;
}

function _bcosExtractAppMeta(code, fileName) {
    code = String(code || '');
    let title = '';
    const m = code.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (m) title = m[1];
    if (!title.trim()) {
        const og = code.match(/<meta[^>]+(?:property|name)=["'](?:og:title|application-name|apple-mobile-web-app-title)["'][^>]*content=["']([^"']+)["']/i);
        if (og) title = og[1];
    }
    if (title) {
        try { const t = document.createElement('textarea'); t.innerHTML = title; title = t.value; } catch(e) {}
    }
    if (!title.trim() && fileName) title = String(fileName).replace(/\.[^/.]+$/, '').replace(/[_]+/g, ' ');
    title = _bcosCleanAppName(title);
    let icon = '';
    const em = _bcosLeadingEmoji(title);
    if (em) { icon = em; title = title.slice(em.length).trim(); }
    return { name: _bcosShortAppName(title) || '未命名应用', fullName: title, icon: icon || '⚡' };
}

// Raw .js files / bare scripts are wrapped into a minimal HTML document so they can run inside the sandbox iframe
function _bcosNormalizeAppCode(code, fileName) {
    code = String(code || '');
    const looksLikeHtml = /<\s*(!doctype|html|head|body|div|span|canvas|svg|style|script|main|section|button|p|h[1-6]|ul|table|form|input|img|a)\b/i.test(code);
    const isJsFile = fileName && /\.m?js$/i.test(fileName);
    if (isJsFile || !looksLikeHtml) {
        return '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0b0f19;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,sans-serif}</style></head>\n<body>\n<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n<\/script>\n</body>\n</html>';
    }
    return code;
}

function _bcosAutoFillAppMeta() {
    const nameInp = document.getElementById('bcos-custom-app-name');
    const iconInp = document.getElementById('bcos-custom-app-icon');
    const codeInp = document.getElementById('bcos-custom-app-code');
    if (!codeInp || codeInp.value.trim().length < 20) return;
    const nameFree = nameInp && (!nameInp.value || nameInp.dataset.auto === '1');
    const iconFree = iconInp && (!iconInp.value || iconInp.dataset.auto === '1');
    if (!nameFree && !iconFree) return;
    const meta = _bcosExtractAppMeta(codeInp.value, '');
    if (nameFree) { nameInp.value = meta.name; nameInp.dataset.auto = '1'; }
    if (iconFree) { iconInp.value = meta.icon; iconInp.dataset.auto = '1'; }
}

function _bcosSelectCustomAppIcon(em) {
    const iconInp = document.getElementById('bcos-custom-app-icon');
    if (iconInp) {
        iconInp.value = em;
        iconInp.dataset.auto = '0';
        showToast('已选取图标: ' + em);
    }
}

function _bcosShortenAppNameInput() {
    const nameInp = document.getElementById('bcos-custom-app-name');
    if (!nameInp) return;
    const short = _bcosShortAppName(nameInp.value);
    if (!short) { showToast('⚠️ 请先输入应用名称'); return; }
    nameInp.value = short;
    showToast('✂️ 已截取短应用名：' + short);
}

function _bcosHandleCustomAppUpload(e) {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const text = _bcosNormalizeAppCode(String(evt.target.result || ''), file.name);
        const nameInp = document.getElementById('bcos-custom-app-name');
        const iconInp = document.getElementById('bcos-custom-app-icon');
        const codeInp = document.getElementById('bcos-custom-app-code');
        if (codeInp) codeInp.value = text;
        // A fresh upload ALWAYS refreshes name & icon from the new file (they used to keep the previous app's values)
        const meta = _bcosExtractAppMeta(text, file.name);
        if (nameInp) { nameInp.value = meta.name; nameInp.dataset.auto = '1'; nameInp.dataset.full = meta.fullName; }
        if (iconInp) { iconInp.value = meta.icon; iconInp.dataset.auto = '1'; }
        try { input.value = ''; } catch(_) {} // allow re-selecting the same file
        showToast('✓ 代码文件已读取，应用名称：' + meta.name);
    };
    reader.onerror = () => {
        try { input.value = ''; } catch(_) {}
        showToast('⚠️ 文件读取失败，请重试');
    };
    reader.readAsText(file);
}

function _bcosLoadAppSample() {
    const nameInp = document.getElementById('bcos-custom-app-name');
    const iconInp = document.getElementById('bcos-custom-app-icon');
    const codeInp = document.getElementById('bcos-custom-app-code');
    if (nameInp) nameInp.value = '霓虹极简时钟';
    if (iconInp) iconInp.value = '⏱️';
    if (codeInp) {
        codeInp.value = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { margin: 0; background: #050811; color: #ff6b9d; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: monospace; }
#time { font-size: 3.5rem; font-weight: bold; text-shadow: 0 0 20px #ff6b9d; }
#date { font-size: 1.2rem; color: #a78bfa; margin-top: 10px; }
</style>
</head>
<body>
<div id="time">--:--:--</div>
<div id="date">--</div>
<script>
function update() {
    const d = new Date();
    document.getElementById('time').textContent = d.toTimeString().split(' ')[0];
    document.getElementById('date').textContent = d.toLocaleDateString();
}
setInterval(update, 1000); update();
<\/script>
</body>
</html>`;
    }
}

function _bcosTestRunCustomApp() {
    const code = document.getElementById('bcos-custom-app-code')?.value || '';
    if (!code.trim()) { showToast('⚠️ 代码内容不能为空'); return; }
    const win = window.open('', '_blank');
    if (win) { win.document.write(_bcosNormalizeAppCode(code)); win.document.close(); }
}

function _bcosInstallCustomApp() {
    const nameInp = document.getElementById('bcos-custom-app-name');
    const iconInp = document.getElementById('bcos-custom-app-icon');
    const codeInp = document.getElementById('bcos-custom-app-code');
    const rawCode = codeInp ? codeInp.value : '';
    if (!rawCode.trim()) { showToast('⚠️ 请输入或上传应用代码'); return; }
    const code = _bcosNormalizeAppCode(rawCode);

    const meta = _bcosExtractAppMeta(code, '');
    const fullName = _bcosCleanAppName(nameInp ? nameInp.value : '') || meta.fullName || meta.name;
    const name = _bcosShortAppName(fullName) || meta.name;
    const shortened = name !== fullName;
    let icon = (iconInp ? iconInp.value : '').trim();
    icon = _bcosLeadingEmoji(icon) || Array.from(icon)[0] || meta.icon || '📦';

    const appId = 'custom_app_' + Date.now();
    const newApp = {
        id: appId,
        name: name,
        fullName: fullName,
        icon: icon,
        code: code,
        size: Math.max(1, Math.round(code.length / 1024)) + ' KB',
        date: new Date().toLocaleDateString()
    };

    const customs = _bcosGetCustomApps();
    customs.push(newApp);
    _bcosSaveCustomApps(customs);

    const installed = _bcosGetInstalledAppIds();
    installed.push(appId);
    _bcosSetInstalledAppIds(installed);

    // Reset the workshop form so the next upload never inherits this app's name / icon / code
    if (nameInp) { nameInp.value = ''; nameInp.dataset.auto = ''; nameInp.dataset.full = ''; }
    if (iconInp) { iconInp.value = ''; iconInp.dataset.auto = ''; }
    if (codeInp) codeInp.value = '';
    const fileInp = document.getElementById('bcos-custom-app-file');
    if (fileInp) { try { fileInp.value = ''; } catch(_) {} }

    showToast(shortened ? `✓ 已安装【${name}】（完整名称已截取为短名）` : `✓ 自定义应用【${name}】已成功安装至 BCOS！`);
    _bcosOpenApp(appId);
}

function _bcosRenderCustomApp(content, appId) {
    const customs = _bcosGetCustomApps();
    const app = customs.find(a => a.id === appId);
    if (!app) {
        content.innerHTML = '<div style="color:#ef4444;padding:1rem;">应用未找到或已被移除</div>';
        return;
    }
    content.style.padding = '0';
    content.style.overflow = 'hidden';
    content.style.height = '100%';
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.sandbox = 'allow-scripts allow-forms allow-same-origin';
    iframe.srcdoc = app.code;
    content.appendChild(iframe);
    // Mouse events inside the iframe do not bubble to the host page, so bring the window to front when it gains focus
    const onWinBlur = () => {
        if (!iframe.isConnected) { window.removeEventListener('blur', onWinBlur); return; }
        setTimeout(() => {
            if (document.activeElement === iframe && _bcos.wins[appId] && _bcos.activeWin !== appId) _bcosFocusWin(appId);
        }, 0);
    };
    window.addEventListener('blur', onWinBlur);
}

// ============================================================================
// BCOS Native Companion Apps
// ============================================================================

// 1. Calculator
function _bcosRenderCalculator(content) {
    content.style.padding = '0';
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.background = '#181b28';
    content.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;padding:12px;box-sizing:border-box;">
            <div id="bcos-calc-display" style="background:#0e111a;border-radius:10px;padding:14px 16px;text-align:right;border:1px solid rgba(255,255,255,0.08);margin-bottom:12px;">
                <div id="bcos-calc-expr" style="font-size:12px;color:#94a3b8;min-height:16px;"></div>
                <div id="bcos-calc-val" style="font-size:28px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;">0</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:1;">
                <button class="bcos-store-btn" style="background:#334155;" onclick="_bcosCalcOp('C')">C</button>
                <button class="bcos-store-btn" style="background:#334155;" onclick="_bcosCalcOp('±')">±</button>
                <button class="bcos-store-btn" style="background:#334155;" onclick="_bcosCalcOp('%')">%</button>
                <button class="bcos-store-btn" style="background:#f59e0b;" onclick="_bcosCalcOp('/')">÷</button>

                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('7')">7</button>
                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('8')">8</button>
                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('9')">9</button>
                <button class="bcos-store-btn" style="background:#f59e0b;" onclick="_bcosCalcOp('*')">×</button>

                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('4')">4</button>
                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('5')">5</button>
                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('6')">6</button>
                <button class="bcos-store-btn" style="background:#f59e0b;" onclick="_bcosCalcOp('-')">-</button>

                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('1')">1</button>
                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('2')">2</button>
                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('3')">3</button>
                <button class="bcos-store-btn" style="background:#f59e0b;" onclick="_bcosCalcOp('+')">+</button>

                <button class="bcos-store-btn" style="background:#1e293b;grid-column:span 2;" onclick="_bcosCalcNum('0')">0</button>
                <button class="bcos-store-btn" style="background:#1e293b;" onclick="_bcosCalcNum('.')">.</button>
                <button class="bcos-store-btn" style="background:#007aff;" onclick="_bcosCalcOp('=')">=</button>
            </div>
        </div>
    `;
    window._bcosCalcState = { cur: '0', prev: null, op: null, reset: false };
}

function _bcosCalcNum(digit) {
    const s = window._bcosCalcState || { cur: '0', reset: false };
    const valEl = document.getElementById('bcos-calc-val');
    if (s.reset || s.cur === '0') {
        s.cur = digit === '.' ? '0.' : digit;
        s.reset = false;
    } else {
        if (digit === '.' && s.cur.includes('.')) return;
        s.cur += digit;
    }
    if (valEl) valEl.textContent = s.cur;
}

function _bcosCalcOp(op) {
    const s = window._bcosCalcState || { cur: '0' };
    const valEl = document.getElementById('bcos-calc-val');
    const exprEl = document.getElementById('bcos-calc-expr');
    if (op === 'C') {
        s.cur = '0'; s.prev = null; s.op = null; s.reset = false;
        if (valEl) valEl.textContent = '0';
        if (exprEl) exprEl.textContent = '';
        return;
    }
    if (op === '±') {
        s.cur = String(-parseFloat(s.cur) || 0);
        if (valEl) valEl.textContent = s.cur;
        return;
    }
    if (op === '%') {
        s.cur = String(parseFloat(s.cur) / 100);
        if (valEl) valEl.textContent = s.cur;
        return;
    }
    if (op === '=') {
        if (s.op && s.prev !== null) {
            const a = parseFloat(s.prev), b = parseFloat(s.cur);
            let res = 0;
            if (s.op === '+') res = a + b;
            else if (s.op === '-') res = a - b;
            else if (s.op === '*') res = a * b;
            else if (s.op === '/') res = b !== 0 ? a / b : 'Error';
            if (exprEl) exprEl.textContent = `${a} ${s.op} ${b} =`;
            s.cur = String(res);
            s.prev = null;
            s.op = null;
            s.reset = true;
            if (valEl) valEl.textContent = s.cur;
        }
        return;
    }
    s.prev = s.cur;
    s.op = op;
    s.reset = true;
    if (exprEl) exprEl.textContent = `${s.cur} ${op}`;
}

// 2. Weather
// 2. Weather HUD with Free Open-Meteo API
let _bcosWeatherCity = 'shanghai';
let _bcosWeatherCached = null;

function _bcosWmoCodeText(code) {
    code = Number(code);
    if (code === 0) return { t: '晴朗', i: '☀️' };
    if (code === 1 || code === 2) return { t: '多云', i: '🌤️' };
    if (code === 3) return { t: '阴天', i: '☁️' };
    if (code === 45 || code === 48) return { t: '有雾', i: '🌫️' };
    if (code >= 51 && code <= 55) return { t: '毛毛雨', i: '🌦️' };
    if (code >= 61 && code <= 65) return { t: '降雨', i: '🌧️' };
    if (code >= 71 && code <= 77) return { t: '降雪', i: '🌨️' };
    if (code >= 80 && code <= 82) return { t: '阵雨', i: '🌧️' };
    if (code >= 95) return { t: '雷阵雨', i: '⛈️' };
    return { t: '多云', i: '🌤️' };
}

function _bcosRenderWeather(content) {
    if (!content) return;
    content.style.padding = '0';
    content.style.height = '100%';
    content.style.background = 'linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%)';
    content.style.color = '#fff';
    content.style.overflowY = 'auto';

    const cities = {
        shanghai: { name: '上海 · 嘉定创新港', lat: 31.2304, lon: 121.4737 },
        beijing: { name: '北京 · 朝阳', lat: 39.9042, lon: 116.4074 },
        guangzhou: { name: '广州 · 天河', lat: 23.1291, lon: 113.2644 },
        shenzhen: { name: '深圳 · 南山', lat: 22.5431, lon: 114.0579 },
        hangzhou: { name: '杭州 · 西湖', lat: 30.2741, lon: 120.1551 },
        chengdu: { name: '成都 · 锦江', lat: 30.5728, lon: 104.0668 },
        wuhan: { name: '武汉 · 武昌', lat: 30.5928, lon: 114.3055 },
        xian: { name: '西安 · 雁塔', lat: 34.3416, lon: 108.9398 }
    };

    const curCity = cities[_bcosWeatherCity] || cities.shanghai;

    content.innerHTML = `
        <div style="padding:14px;display:flex;flex-direction:column;gap:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
            <!-- Top Controls -->
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <select id="bcos-weather-city-sel" onchange="_bcosWeatherChangeCity(this.value)" style="background:rgba(0,0,0,0.4);color:#93c5fd;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:4px 8px;font-size:12px;outline:none;">
                    ${Object.keys(cities).map(k => `<option value="${k}" ${k === _bcosWeatherCity ? 'selected' : ''}>${cities[k].name}</option>`).join('')}
                </select>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:10px;color:#94a3b8;" id="bcos-weather-status">● 实时联网 (Open-Meteo)</span>
                    <button onclick="_bcosWeatherFetch(true)" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">🔄 刷新</button>
                </div>
            </div>

            <!-- Main Temperature Card -->
            <div id="bcos-weather-hero" style="text-align:center;padding:10px 0;">
                <div style="font-size:13px;color:#93c5fd;font-weight:600;">${curCity.name}</div>
                <div id="bcos-weather-temp" style="font-size:3.6rem;font-weight:900;margin:4px 0;line-height:1;font-variant-numeric:tabular-nums;">--°C</div>
                <div id="bcos-weather-desc" style="font-size:13px;color:#cbd5e1;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <span>正在获取实时天气...</span>
                </div>
            </div>

            <!-- Metrics Grid -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:8px 6px;text-align:center;">
                    <div style="font-size:10px;color:#94a3b8;">湿度</div>
                    <div id="bcos-weather-humidity" style="font-size:14px;font-weight:700;margin-top:2px;">--%</div>
                </div>
                <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:8px 6px;text-align:center;">
                    <div style="font-size:10px;color:#94a3b8;">风速</div>
                    <div id="bcos-weather-wind" style="font-size:14px;font-weight:700;margin-top:2px;">-- m/s</div>
                </div>
                <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:8px 6px;text-align:center;">
                    <div style="font-size:10px;color:#94a3b8;">气压</div>
                    <div id="bcos-weather-pressure" style="font-size:14px;font-weight:700;margin-top:2px;">-- hPa</div>
                </div>
                <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:8px 6px;text-align:center;">
                    <div style="font-size:10px;color:#94a3b8;">体感</div>
                    <div id="bcos-weather-apparent" style="font-size:14px;font-weight:700;margin-top:2px;">--°</div>
                </div>
            </div>

            <!-- 24-Hour Forecast Timeline -->
            <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;display:flex;justify-content:space-between;">
                    <span>24小时逐时天气走势预测</span>
                    <span>数据源: Open-Meteo WMO</span>
                </div>
                <div id="bcos-weather-hourly" style="display:flex;justify-content:space-between;text-align:center;font-size:11px;overflow-x:auto;padding-bottom:4px;">
                    <div style="color:#64748b;">正在加载预报...</div>
                </div>
            </div>
        </div>
    `;

    _bcosWeatherFetch(false);
}

function _bcosWeatherChangeCity(cityKey) {
    _bcosWeatherCity = cityKey;
    _bcosWeatherFetch(true);
}

function _bcosWeatherFetch(force) {
    const cities = {
        shanghai: { name: '上海 · 嘉定创新港', lat: 31.2304, lon: 121.4737 },
        beijing: { name: '北京 · 朝阳', lat: 39.9042, lon: 116.4074 },
        guangzhou: { name: '广州 · 天河', lat: 23.1291, lon: 113.2644 },
        shenzhen: { name: '深圳 · 南山', lat: 22.5431, lon: 114.0579 },
        hangzhou: { name: '杭州 · 西湖', lat: 30.2741, lon: 120.1551 },
        chengdu: { name: '成都 · 锦江', lat: 30.5728, lon: 104.0668 },
        wuhan: { name: '武汉 · 武昌', lat: 30.5928, lon: 114.3055 },
        xian: { name: '西安 · 雁塔', lat: 34.3416, lon: 108.9398 }
    };
    const cur = cities[_bcosWeatherCity] || cities.shanghai;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cur.lat}&longitude=${cur.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,weather_code&timezone=auto`;

    const statusEl = document.getElementById('bcos-weather-status');

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.current) throw new Error('Invalid data');
            _bcosWeatherApplyData(data, cur);
            if (statusEl) statusEl.textContent = '● 实时在线 (Open-Meteo)';
            try { localStorage.setItem('bcos_weather_cache_' + _bcosWeatherCity, JSON.stringify(data)); } catch(e) {}
        })
        .catch(err => {
            console.warn('Open-Meteo fetch failed, using fallback:', err);
            if (statusEl) statusEl.textContent = '○ 离线模式 (缓存数据)';
            // Fallback to cache or realistic values
            try {
                const cached = JSON.parse(localStorage.getItem('bcos_weather_cache_' + _bcosWeatherCity));
                if (cached) { _bcosWeatherApplyData(cached, cur); return; }
            } catch(e) {}
            // Mock fallback
            const cabinTemp = localStorage.getItem('car_cabin_temp') || '22';
            _bcosWeatherApplyData({
                current: {
                    temperature_2m: cabinTemp,
                    apparent_temperature: cabinTemp,
                    relative_humidity_2m: 58,
                    wind_speed_10m: 3.2,
                    surface_pressure: 1014,
                    weather_code: 1
                },
                hourly: {
                    temperature_2m: [cabinTemp, cabinTemp, +cabinTemp + 1, +cabinTemp + 2, +cabinTemp + 1, cabinTemp, cabinTemp - 1, cabinTemp - 2],
                    weather_code: [1, 1, 0, 0, 1, 2, 2, 0]
                }
            }, cur);
        });
}

function _bcosWeatherApplyData(data, city) {
    const cur = data.current || {};
    const tempEl = document.getElementById('bcos-weather-temp');
    const descEl = document.getElementById('bcos-weather-desc');
    const humEl = document.getElementById('bcos-weather-humidity');
    const windEl = document.getElementById('bcos-weather-wind');
    const pressEl = document.getElementById('bcos-weather-pressure');
    const appEl = document.getElementById('bcos-weather-apparent');
    const hourlyEl = document.getElementById('bcos-weather-hourly');

    const wmo = _bcosWmoCodeText(cur.weather_code != null ? cur.weather_code : 1);

    if (tempEl) tempEl.textContent = Math.round(cur.temperature_2m != null ? cur.temperature_2m : 22) + '°C';
    if (descEl) descEl.innerHTML = `<span>${wmo.i} ${wmo.t}</span><span>·</span><span>空气质量 优 (AQI 22)</span>`;
    if (humEl) humEl.textContent = (cur.relative_humidity_2m || 58) + '%';
    if (windEl) windEl.textContent = (cur.wind_speed_10m ? cur.wind_speed_10m.toFixed(1) : '3.2') + ' m/s';
    if (pressEl) pressEl.textContent = Math.round(cur.surface_pressure || 1014) + ' hPa';
    if (appEl) appEl.textContent = Math.round(cur.apparent_temperature != null ? cur.apparent_temperature : cur.temperature_2m) + '°';

    // 24h Hourly Forecast
    if (hourlyEl && data.hourly && data.hourly.temperature_2m) {
        const temps = data.hourly.temperature_2m;
        const codes = data.hourly.weather_code || [];
        const nowH = new Date().getHours();
        let itemsHtml = '';
        for (let i = 0; i < 7; i++) {
            const h = (nowH + i * 3) % 24;
            const label = i === 0 ? '现在' : `${String(h).padStart(2,'0')}:00`;
            const t = Math.round(temps[i * 3] != null ? temps[i * 3] : temps[0]);
            const c = _bcosWmoCodeText(codes[i * 3] != null ? codes[i * 3] : 1);
            itemsHtml += `
                <div style="flex:1;min-width:44px;">
                    <div style="color:#94a3b8;">${label}</div>
                    <div style="margin:4px 0;font-size:16px;">${c.i}</div>
                    <div style="font-weight:700;">${t}°</div>
                </div>
            `;
        }
        hourlyEl.innerHTML = itemsHtml;
    }
}

// 3. Notes
// 3. Notes
function _bcosRenderNotes(content) {
    content.style.padding = '0';
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.background = '#141824';
    content.style.color = '#fff';

    function getNotes() {
        try {
            return JSON.parse(localStorage.getItem('bcos_notes') || '[]');
        } catch(e) { return []; }
    }
    function saveNotes(notes) {
        localStorage.setItem('bcos_notes', JSON.stringify(notes));
    }

    const notes = getNotes();
    if (notes.length === 0) {
        notes.push({ id: 1, title: '兔可可座舱便签', text: '欢迎使用 BCOS 便签！随时在此记录座舱灵感、纪念日备忘与备忘清单。', color: '#fef08a' });
        saveNotes(notes);
    }

    content.innerHTML = `
        <div style="padding:8px 12px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#94a3b8;font-weight:600;">📌 便签清单 (${notes.length})</span>
            <button onclick="_bcosAddNewNote()" class="bcos-store-btn" style="padding:4px 10px;font-size:11px;">+ 新建便签</button>
        </div>
        <div id="bcos-notes-container" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;"></div>
    `;

    function renderNoteItems() {
        const wrap = document.getElementById('bcos-notes-container');
        if (!wrap) return;
        const curNotes = getNotes();
        wrap.innerHTML = curNotes.map(n => `
            <div style="background:${n.color || '#fef08a'};color:#1e293b;border-radius:10px;padding:10px;box-shadow:0 4px 12px rgba(0,0,0,0.3);position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <input type="text" value="${n.title}" onchange="_bcosUpdateNote(${n.id}, 'title', this.value)" style="background:none;border:none;font-weight:700;font-size:13px;color:#0f172a;outline:none;width:80%;" />
                    <button onclick="_bcosDeleteNote(${n.id})" style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:12px;font-weight:bold;">✕</button>
                </div>
                <textarea onchange="_bcosUpdateNote(${n.id}, 'text', this.value)" style="width:100%;height:60px;background:none;border:none;font-family:inherit;font-size:12px;color:#334155;outline:none;resize:none;box-sizing:border-box;">${n.text}</textarea>
            </div>
        `).join('');
    }

    window._bcosAddNewNote = () => {
        const nList = getNotes();
        const colors = ['#fef08a', '#fbcfe8', '#bae6fd', '#bbf7d0'];
        nList.unshift({ id: Date.now(), title: '新便签', text: '', color: colors[nList.length % colors.length] });
        saveNotes(nList);
        renderNoteItems();
    };

    window._bcosUpdateNote = (id, key, val) => {
        const nList = getNotes();
        const item = nList.find(n => n.id === id);
        if (item) { item[key] = val; saveNotes(nList); }
    };

    window._bcosDeleteNote = (id) => {
        let nList = getNotes();
        nList = nList.filter(n => n.id !== id);
        saveNotes(nList);
        renderNoteItems();
    };

    renderNoteItems();
}

// 4. Radio (Web Audio synthesizer)
let _bcosAudioCtx = null;
let _bcosRadioPlaying = false;
let _bcosRadioOsc = null;

function _bcosRenderRadio(content) {
    content.style.padding = '0';
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.background = '#090b14';
    content.style.color = '#fff';
    content.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.4rem;text-align:center;">
            <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#ff6b9d,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 0 24px rgba(255,107,157,0.4);margin-bottom:1rem;" id="bcos-radio-avatar">
                📻
            </div>
            <div style="font-weight:700;font-size:16px;color:#fff;">兔兔治愈 Lo-Fi 电台</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;" id="bcos-radio-status">伴听环境白噪音 · 舒缓静心</div>

            <div style="display:flex;align-items:center;gap:12px;margin-top:1.5rem;">
                <button id="bcos-radio-play-btn" onclick="_bcosToggleRadio()" class="bcos-store-btn" style="padding:10px 24px;font-size:14px;background:var(--accent,#ff6b9d);">
                    ▶ 播放静心白噪音
                </button>
            </div>
            
            <div style="display:flex;gap:12px;margin-top:1.2rem;font-size:11px;color:#64748b;">
                <span>🌧️ 柔和细雨</span>
                <span>·</span>
                <span>🔥 温暖壁炉</span>
                <span>·</span>
                <span>☕ 晚间咖啡</span>
            </div>
        </div>
    `;
}

function _bcosToggleRadio() {
    const btn = document.getElementById('bcos-radio-play-btn');
    const status = document.getElementById('bcos-radio-status');
    const avatar = document.getElementById('bcos-radio-avatar');

    if (!_bcosRadioPlaying) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            _bcosAudioCtx = new AudioCtx();
            
            // Generate gentle warm white/pink noise buffer
            const bufferSize = _bcosAudioCtx.sampleRate * 2;
            const buffer = _bcosAudioCtx.createBuffer(1, bufferSize, _bcosAudioCtx.sampleRate);
            const output = buffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                output[i] = (b0 + b1 + b2 + white * 0.1) * 0.04;
            }
            const whiteNoise = _bcosAudioCtx.createBufferSource();
            whiteNoise.buffer = buffer;
            whiteNoise.loop = true;

            const filter = _bcosAudioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, _bcosAudioCtx.currentTime);

            whiteNoise.connect(filter);
            filter.connect(_bcosAudioCtx.destination);
            whiteNoise.start(0);
            _bcosRadioOsc = whiteNoise;
            _bcosRadioPlaying = true;

            if (btn) btn.textContent = '⏸ 暂停播放';
            if (status) status.textContent = '🎶 正在播放 · 细雨与壁炉白噪音';
            if (avatar) avatar.style.animation = 'bcosPulse 2s infinite ease-in-out';
            showToast('📻 兔兔电台已启动伴听');
        } catch(e) {
            showToast('⚠️ 音频引擎初始化受限');
        }
    } else {
        if (_bcosRadioOsc) {
            try { _bcosRadioOsc.stop(); } catch(e) {}
            _bcosRadioOsc = null;
        }
        if (_bcosAudioCtx) {
            try { _bcosAudioCtx.close(); } catch(e) {}
            _bcosAudioCtx = null;
        }
        _bcosRadioPlaying = false;
        if (btn) btn.textContent = '▶ 播放静心白噪音';
        if (status) status.textContent = '伴听环境白噪音 · 舒缓静心';
        if (avatar) avatar.style.animation = 'none';
        showToast('电台已暂停');
    }
}

window._bcosRadioStop = () => {
    if (_bcosRadioPlaying) _bcosToggleRadio();
};

// 5. Retro Snake Game
let _bcosSnakeTimer = null;
function _bcosRenderSnake(content) {
    content.style.padding = '0';
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.alignItems = 'center';
    content.style.justifyContent = 'center';
    content.style.background = '#0a0d14';
    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;width:280px;color:#fff;font-size:12px;margin-bottom:6px;font-weight:700;">
            <span>得分: <span id="snake-score" style="color:#00ff41;">0</span></span>
            <span>最高分: <span id="snake-high" style="color:#f59e0b;">0</span></span>
        </div>
        <canvas id="bcos-snake-cvs" width="280" height="280" style="background:#111827;border:2px solid #374151;border-radius:8px;"></canvas>
        <div style="display:grid;grid-template-columns:repeat(3,44px);gap:6px;margin-top:10px;">
            <div></div>
            <button class="bcos-store-btn" onclick="_bcosSnakeMove(0,-1)">▲</button>
            <div></div>
            <button class="bcos-store-btn" onclick="_bcosSnakeMove(-1,0)">◀</button>
            <button class="bcos-store-btn" onclick="_bcosSnakeMove(0,1)">▼</button>
            <button class="bcos-store-btn" onclick="_bcosSnakeMove(1,0)">▶</button>
        </div>
    `;

    const cvs = document.getElementById('bcos-snake-cvs');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const grid = 14;
    let snake = [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}];
    let dir = {x: 1, y: 0};
    let food = {x: 12, y: 12};
    let score = 0;
    let high = parseInt(localStorage.getItem('bcos_snake_high') || '0', 10);
    document.getElementById('snake-high').textContent = high;

    function resetFood() {
        food.x = Math.floor(Math.random() * (cvs.width / grid));
        food.y = Math.floor(Math.random() * (cvs.height / grid));
    }

    function step() {
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.x >= cvs.width / grid || head.y < 0 || head.y >= cvs.height / grid || snake.some(s => s.x === head.x && s.y === head.y)) {
            // Game Over
            if (score > high) {
                high = score;
                localStorage.setItem('bcos_snake_high', high);
                document.getElementById('snake-high').textContent = high;
            }
            snake = [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}];
            dir = {x: 1, y: 0};
            score = 0;
            document.getElementById('snake-score').textContent = score;
            resetFood();
            return;
        }

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            document.getElementById('snake-score').textContent = score;
            resetFood();
        } else {
            snake.pop();
        }

        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // Draw food
        ctx.fillStyle = '#ff6b9d';
        ctx.beginPath();
        ctx.arc(food.x * grid + grid/2, food.y * grid + grid/2, grid/2.2, 0, Math.PI*2);
        ctx.fill();

        // Draw snake
        ctx.fillStyle = '#00ff41';
        snake.forEach((s, idx) => {
            if (idx === 0) ctx.fillStyle = '#06FFA5';
            else ctx.fillStyle = '#00ff41';
            ctx.fillRect(s.x * grid + 1, s.y * grid + 1, grid - 2, grid - 2);
        });
    }

    if (_bcosSnakeTimer) clearInterval(_bcosSnakeTimer);
    _bcosSnakeTimer = setInterval(step, 110);

    const _bcosSnakeMove = (dx, dy) => {
        if (dir.x !== -dx || dir.y !== -dy) {
            dir = {x: dx, y: dy};
        }
    };
    window._bcosSnakeMove = _bcosSnakeMove;

    if (window._bcosSnakeKey) document.removeEventListener('keydown', window._bcosSnakeKey);
    window._bcosSnakeKey = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') _bcosSnakeMove(0, -1);
        else if (e.key === 'ArrowDown' || e.key === 's') _bcosSnakeMove(0, 1);
        else if (e.key === 'ArrowLeft' || e.key === 'a') _bcosSnakeMove(-1, 0);
        else if (e.key === 'ArrowRight' || e.key === 'd') _bcosSnakeMove(1, 0);
    };
    document.addEventListener('keydown', window._bcosSnakeKey);
}

window._bcosSnakeStop = () => {
    if (_bcosSnakeTimer) { clearInterval(_bcosSnakeTimer); _bcosSnakeTimer = null; }
    if (window._bcosSnakeKey) document.removeEventListener('keydown', window._bcosSnakeKey);
};

// 6. Pixel Paint Studio
function _bcosRenderPaint(content) {
    content.style.padding = '0';
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.background = '#131722';
    content.innerHTML = `
        <div style="padding:6px 10px;background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <input type="color" id="paint-color" value="#ff6b9d" style="width:28px;height:28px;border:none;border-radius:4px;cursor:pointer;background:none;" />
            <button class="bcos-store-btn" onclick="_bcosPaintClear()">清空画布</button>
            <button class="bcos-store-btn" onclick="_bcosPaintExport()">导出图片 (PNG)</button>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:10px;">
            <canvas id="bcos-paint-cvs" width="288" height="288" style="background:#ffffff;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.5);cursor:crosshair;"></canvas>
        </div>
    `;

    const cvs = document.getElementById('bcos-paint-cvs');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const gridSize = 16;
    const cellSize = cvs.width / gridSize;
    let isDrawing = false;

    function draw(e) {
        if (!isDrawing) return;
        const rect = cvs.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = Math.floor((clientX - rect.left) / cellSize);
        const y = Math.floor((clientY - rect.top) / cellSize);
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const color = document.getElementById('paint-color')?.value || '#ff6b9d';
            ctx.fillStyle = color;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    cvs.onmousedown = (e) => { isDrawing = true; draw(e); };
    cvs.onmousemove = draw;
    window.onmouseup = () => { isDrawing = false; };

    cvs.ontouchstart = (e) => { isDrawing = true; draw(e); e.preventDefault(); };
    cvs.ontouchmove = (e) => { draw(e); e.preventDefault(); };
    cvs.ontouchend = () => { isDrawing = false; };

    window._bcosPaintClear = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cvs.width, cvs.height);
    };

    window._bcosPaintExport = () => {
        const link = document.createElement('a');
        link.download = 'pixel_art_' + Date.now() + '.png';
        link.href = cvs.toDataURL('image/png');
        link.click();
        showToast('✓ 像素画已导出下载！');
    };
}


    function copyCarScreenUrl() {
        const basePath = window.location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '') + '/';
        const url = window.location.origin + basePath + 'car.html';
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                showToast('✓ 车机专属链接已复制到剪贴板！');
            }).catch(() => {
                prompt('车机专属链接（可长按复制）:', url);
            });
        } else {
            prompt('车机专属链接（可长按复制）:', url);
        }
    }

