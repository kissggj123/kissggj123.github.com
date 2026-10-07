function initCardSystem() {
        renderCardDrawArea();
        // Resume cooldown if it was active before page refresh
        const lastDraw = parseInt(safeGetItem('lastCardDraw', '0')) || 0;
        if (Date.now() - lastDraw < CONFIG.CARD_COOLDOWN_MS) {
            startCooldownTimer();
        }
    }

    function canDrawCard() {
        const lastDraw = parseInt(safeGetItem('lastCardDraw', '0')) || 0;
        return Date.now() - lastDraw >= CONFIG.CARD_COOLDOWN_MS;
    }

    function startCooldownTimer() {
        if (cooldownInterval) clearInterval(cooldownInterval);
        const tick = () => {
            const btn = document.getElementById('draw-btn');
            if (!btn) return;
            const lastDraw = parseInt(safeGetItem('lastCardDraw', '0')) || 0;
            const remaining = CONFIG.CARD_COOLDOWN_MS - (Date.now() - lastDraw);
            if (remaining <= 0) {
                clearInterval(cooldownInterval);
                cooldownInterval = null;
                btn.disabled = false;
                btn.innerHTML = '🎴 抽卡 (10张)';
                return;
            }
            const secs = Math.ceil(remaining / 1000);
            btn.disabled = true;
            btn.innerHTML = `⏳ 冷却中 ${secs}s`;
        };
        tick();
        cooldownInterval = setInterval(tick, 1000);
    }

    function drawWeightedCard() {
        const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        let rarity = 'common';
        for (const [r, w] of Object.entries(RARITY_WEIGHTS)) {
            if (roll < w) { rarity = r; break; }
            roll -= w;
        }
        const pool = CARD_POOL.filter(c => c.rarity === rarity);
        // Fallback: if pool is empty for some reason, use all cards
        const actualPool = pool.length > 0 ? pool : CARD_POOL;
        const card = actualPool[Math.floor(Math.random() * actualPool.length)];
        if (!card) return { ...CARD_POOL[0] }; // Ultimate fallback
        return { ...card };
    }

    function drawCards() {
        if (!canDrawCard()) return;
        safeSetItem('lastCardDraw', Date.now().toString());
        const drawn = [];
        for (let i = 0; i < 10; i++) {
            const card = drawWeightedCard();
            if (card) drawn.push(card);
        }
        if (drawn.length === 0) {
            logEvent('🃏 抽卡失败，请重试', 'error');
            return;
        }
        // Add to inventory with smart capacity management
        const wasFull = cardInventory.length >= 50;
        cardInventory.push(...drawn);
        if (cardInventory.length > 50) {
            // When inventory is full, randomly replace some old cards (30% chance per replacement)
            if (wasFull && Math.random() < 0.5) {
                // Random replacement mode: keep new cards, randomly replace some old ones
                const newCards = drawn.slice();
                const overflow = cardInventory.length - 50;
                // Randomly remove overflow old cards (from the first 50-originalCount cards)
                const oldCardIndices = [];
                for (let i = 0; i < cardInventory.length - drawn.length && i < overflow + 5; i++) {
                    oldCardIndices.push(i);
                }
                // Shuffle and remove overflow count
                oldCardIndices.sort(() => Math.random() - 0.5);
                const toRemove = oldCardIndices.slice(0, overflow).sort((a, b) => b - a);
                toRemove.forEach(idx => cardInventory.splice(idx, 1));
                logEvent(`🎒 背包已满！${overflow} 张旧卡牌被随机替换`, 'event');
            } else {
                // Default: keep most recent 50
                cardInventory = cardInventory.slice(-50);
            }
        }
        saveInventory();
        // Pre-draw shuffle effect on the draw button
        const drawBtn = document.getElementById('draw-btn');
        if (drawBtn) {
            drawBtn.style.animation = 'none';
            drawBtn.offsetHeight; // Force reflow
            drawBtn.style.animation = 'btnPulse .3s ease';
        }
        // Show drawn cards with staggered deal animation
        const el = document.getElementById('card-draw-area');
        if (el) {
            const legendaryCount = drawn.filter(c => c.rarity === 'legendary').length;
            const headerText = legendaryCount > 0 
                ? `✨ 本次抽卡结果 — 🌟 ${legendaryCount} 张传说！`
                : '✨ 本次抽卡结果';
            el.innerHTML = '<div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.4rem;' + (legendaryCount > 0 ? 'animation:cardGlow 1s ease;' : '') + '">' + headerText + '</div>' +
                '<div class="inventory-grid">' + drawn.map((c, i) => {
                    const isLegendary = c.rarity === 'legendary';
                    const dealClass = isLegendary ? 'card-legendary' : 'card-dealt';
                    const delay = (i * 50).toFixed(0);
                    return `<div class="inventory-card ${dealClass}" title="${c.n}：${c.desc}" style="border-color:${RARITY_COLORS[c.rarity]};animation-delay:${delay}ms;">
                        <div class="ic-icon">${c.ic}</div>
                        <div class="ic-name" style="color:${RARITY_COLORS[c.rarity]};">${c.n}</div>
                        <div class="ic-desc">${c.desc}</div>
                        ${c.isHacker ? '<div class="ic-hacker-badge">⚔️</div>' : ''}
                    </div>`;
                }).join('') + '</div>';
            // Trigger legendary particle burst
            if (legendaryCount > 0) {
                setTimeout(() => spawnLegendaryBurst(el), 300);
            }
        }
        renderCardInventory();
        const legendaryCount2 = drawn.filter(c => c.rarity === 'legendary').length;
        logEvent(`🃏 抽到 ${drawn.length} 张卡牌${legendaryCount2 > 0 ? `（含 ${legendaryCount2} 张传说卡！）` : ''}`, 'info');
        startCooldownTimer();
    }

    // Particle burst for legendary card draws
    function spawnLegendaryBurst(container) {
        try {
            const rect = container.getBoundingClientRect();
            const burst = document.createElement('div');
            burst.style.cssText = 'position:fixed;left:' + (rect.left + rect.width/2) + 'px;top:' + (rect.top + rect.height/2) + 'px;width:4px;height:4px;border-radius:50%;background:#FFD700;box-shadow:0 0 12px 4px rgba(255,215,0,0.6);pointer-events:none;z-index:9999;opacity:0;';
            document.body.appendChild(burst);
            burst.animate([
                { opacity: 1, transform: 'scale(1)' },
                { opacity: 0, transform: 'scale(20) translate(0, -60px)' }
            ], { duration: 800, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }).onfinish = () => burst.remove();
        } catch(e) {}
    }

    function renderCardDrawArea() {
        const el = document.getElementById('card-draw-area');
        if (!el) return;
        if (cardInventory.length > 0) {
            el.innerHTML = `<div style="font-size:.7rem;color:var(--text2);margin-bottom:.3rem;">🎒 背包：${cardInventory.length}/50 张卡牌${cardInventory.length > 15 ? ' <span style="color:var(--accent);cursor:pointer;text-decoration:underline;" onclick="showFullInventory()">查看全部</span>' : ''}</div>`;
        } else {
            el.innerHTML = '';
        }
        renderCardInventory();
    }

    /* Full inventory modal with rarity filtering */
    function showFullInventory() {
        const rarities = ['all', 'common', 'uncommon', 'rare', 'legendary'];
        const rarityLabels = {all: '全部', common: '普通', uncommon: '稀有', rare: '珍贵', legendary: '传说'};
        let currentFilter = 'all';

        function renderFiltered() {
            const filtered = currentFilter === 'all' ? cardInventory : cardInventory.filter(c => c.rarity === currentFilter);
            const gridHtml = filtered.length > 0
                ? '<div class="inventory-grid">' + filtered.map(c => {
                    const idx = cardInventory.indexOf(c);
                    return `<div class="inventory-card" onclick="handleCardInventoryClick(${idx})" title="${c.n}：${c.desc}" style="border-color:${RARITY_COLORS[c.rarity]};">
                        <div class="ic-icon">${c.ic}</div>
                        <div class="ic-name" style="color:${RARITY_COLORS[c.rarity]};">${c.n}</div>
                        <div class="ic-desc">${c.desc}</div>
                        ${c.isHacker ? '<div class="ic-hacker-badge">⚔️</div>' : ''}
                    </div>`;
                }).join('') + '</div>'
                : '<div style="text-align:center;color:var(--text2);padding:1rem;">没有该稀有度的卡牌</div>';

            const filterHtml = rarities.map(r =>
                `<button class="btn btn-sm ${r === currentFilter ? 'btn-primary' : 'btn-secondary'}" style="margin-right:.2rem;margin-bottom:.2rem;" onclick="filterInventory('${r}')">${rarityLabels[r]}</button>`
            ).join('');

            const modal = document.getElementById('modal-content');
            modal.innerHTML = `
                <div class="modal-drag-handle"></div>
                <div class="modal-title">🎒 卡牌背包 (${cardInventory.length}/50)</div>
                <div style="margin-bottom:.5rem;">${filterHtml}</div>
                <div style="max-height:400px;overflow-y:auto;">${gridHtml}</div>
                <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="closeModal()">关闭</button>`;
            document.getElementById('modal-overlay').classList.add('show');
        }

        window.filterInventory = function(rarity) {
            currentFilter = rarity;
            renderFiltered();
        };
        renderFiltered();
    }

    /* Card detail popup: only allow move to hand */
    function showCardDetailPopup(invIdx) {
        const card = cardInventory[invIdx];
        if (!card) return;
        const inGame = mono && mono.started;
        const isMyTurn = inGame && mono.currentPlayer === 0 && !mono.rolling;
        const p = inGame ? mono.players[0] : null;
        const handFull = p ? p.cards.length >= 8 : false;

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🃏 卡牌详情</div>
            <div style="text-align:center;padding:.8rem 0;">
                <div style="font-size:3rem;margin-bottom:.4rem;">${card.ic}</div>
                <div style="font-weight:800;font-size:1.2rem;color:${RARITY_COLORS[card.rarity]};">${card.n}</div>
                <div style="font-size:.7rem;font-weight:700;color:${RARITY_COLORS[card.rarity]};margin-bottom:.5rem;">${card.rarity ? card.rarity.toUpperCase() : 'COMMON'}</div>
                <div style="color:var(--text2);font-size:.85rem;line-height:1.6;padding:0 .5rem;">${card.desc}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:.4rem;margin-top:.5rem;">
                <button class="btn btn-primary" onclick="carryCard(${invIdx})" ${!inGame || handFull ? 'disabled' : ''}>
                    ${!inGame ? '⚠️ 请先开始游戏' : handFull ? '✋ 手牌已满（8/8）' : '📋 移到手牌'}
                </button>
                <button class="btn btn-secondary" onclick="showFullInventory()">返回背包</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    /* Use card directly from inventory (without carrying to hand first) */
    function useCardFromInventory(invIdx) {
        const card = cardInventory[invIdx];
        if (!card) return;
        if (mono.currentPlayer !== 0 || mono.rolling) { monoLog('当前无法使用卡牌', 'error'); return; }
        const p = mono.players[0];

        // Curse cards need target selection
        if (card.isCurse) {
            const targets = mono.players.filter((pl, i) => i !== 0 && !pl.bankrupt);
            if (targets.length === 0) { monoLog('没有可施咒的对手', 'error'); return; }
            // Show target selection, store invIdx for use
            const targetHtml = targets.map(t => {
                const tIdx = mono.players.indexOf(t);
                return `<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:.3rem;" onclick="executeCurseFromInventory(${invIdx}, ${tIdx})">${t.ic} ${t.nm} (💰${t.money})</button>`;
            }).join('');
            showModal(`<div class="modal-title">${card.ic} ${card.n}</div>
                <div style="text-align:center;font-size:.8rem;color:var(--text2);padding:.5rem 0;">${card.desc}</div>
                <div style="font-size:.75rem;color:var(--accent);margin-bottom:.3rem;">选择施咒目标：</div>
                ${targetHtml}
                <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="showCardDetailPopup(${invIdx})">取消</button>`);
            return;
        }

        // Normal card: remove from inventory and use immediately
        cardInventory.splice(invIdx, 1);
        // Ensure monoEff function exists (restore from pool if lost during serialization)
        restoreCardFunctions(card);
        let effResult = '';
        if (card.monoEff) effResult = card.monoEff(p, mono) || '';
        recordHumanAction('useCard');
        recordGameEvent('card_use', `${p.ic} ${p.nm}`, `使用 ${card.ic} ${card.n}`, effResult);
        monoLog(`🃏 兔可可 直接使用背包 ${card.ic} ${card.n}${effResult ? ' — ' + effResult : card.desc ? ' — ' + card.desc : ''}`, 'success');
        // Force synchronous render so money/state updates are visible immediately on mobile
        saveInventory();
        saveMonopoly();
        if (_renderRAFId) { cancelAnimationFrame(_renderRAFId); _renderRAFId = null; }
        _renderPending = false;
        _doRenderMonopoly();
        renderCardDrawArea();
        showCardUseModal(card, effResult);
    }

    /* Execute curse from inventory (after target selection) */
    function executeCurseFromInventory(invIdx, targetIdx) {
        const card = cardInventory[invIdx];
        const p = mono.players[0];
        const target = mono.players[targetIdx];
        if (!card || !target || target.bankrupt) return;
        cardInventory.splice(invIdx, 1);
        // Ensure monoEff function exists (restore from pool if lost during serialization)
        restoreCardFunctions(card);
        let effResult = '';
        if (card.monoEff) effResult = card.monoEff(p, mono, target) || '';
        recordHumanAction('useCard');
        recordGameEvent('card_curse', `${p.ic} ${p.nm}`, `对 ${target.nm} 施放 ${card.ic} ${card.n}`, effResult);
        monoLog(`🔥 兔可可 对 ${target.nm} 施放 ${card.ic} ${card.n} — ${effResult}`, 'event');
        saveInventory();
        saveMonopoly();
        // Force synchronous render so money/state updates are visible immediately on mobile
        if (_renderRAFId) { cancelAnimationFrame(_renderRAFId); _renderRAFId = null; }
        _renderPending = false;
        _doRenderMonopoly();
        renderCardDrawArea();
        showCurseHitEffect(target, card);
    }

    function renderCardInventory() {
        const el = document.getElementById('card-inventory-area');
        if (!el) return;
        if (cardInventory.length === 0) {
            el.innerHTML = '<div style="font-size:.75rem;color:var(--text2);text-align:center;">背包空空如也，抽点卡牌吧！</div>';
            return;
        }
        el.innerHTML = '<div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.4rem;">🎒 卡牌背包（单击查看详情 · 双击快速移到手牌）</div>' +
            '<div class="inventory-grid">' + cardInventory.map((c, i) =>
                `<div class="inventory-card" onclick="handleCardInventoryClick(${i})" title="${c.n}：${c.desc}" style="border-color:${RARITY_COLORS[c.rarity]};">
                    <div class="ic-icon">${c.ic}</div>
                    <div class="ic-name" style="color:${RARITY_COLORS[c.rarity]};">${c.n}</div>
                    <div class="ic-desc">${c.desc}</div>
                    ${c.isHacker ? '<div class="ic-hacker-badge">⚔️</div>' : ''}
                </div>`
            ).join('') + '</div>';
    }

    /* ==================== Theme System ==================== */
    function loadTheme() {
        const t = safeGetItem('theme', 'bunny');
        document.documentElement.setAttribute('data-theme', t);
        pixelFontEnabled = safeGetItem('pixelFont', '0') === '1';
        if (pixelFontEnabled) document.documentElement.classList.add('font-pixel');
        const ft = document.getElementById('font-toggle');
        if (ft && pixelFontEnabled) ft.classList.add('on');
        mouseBunnyEnabled = safeGetItem('mouseBunny', '1') !== '0';
        const mt = document.getElementById('mouse-toggle');
        if (mt) { if (mouseBunnyEnabled) mt.classList.add('on'); else mt.classList.remove('on'); }
        const ect = document.getElementById('egg-click-toggle');
        if (ect) { if (safeGetItem('eggClickTrigger', '1') !== '0') ect.classList.add('on'); else ect.classList.remove('on'); }
        // Load sidebar avatar preference
        loadSidebarAvatar();
    }

    // Sidebar avatar: switch between emoji and photo
    function loadSidebarAvatar() {
        const mode = safeGetItem('sidebarAvatar', 'emoji');
        applySidebarAvatar(mode);
    }
    function applySidebarAvatar(mode) {
        const container = document.getElementById('sidebar-avatar-container');
        const emojiBtn = document.getElementById('avatar-emoji-btn');
        const photoBtn = document.getElementById('avatar-photo-btn');
        if (!container) return;
        if (mode === 'photo') {
            container.className = 'bunny-icon avatar-photo';
            container.innerHTML = '<img src="./dist/Bunny CC_Profile.JPG" alt="兔可可" draggable="false" onerror="this.parentElement.className=\'bunny-icon\';this.parentElement.textContent=\'🐰\'">';
            if (emojiBtn) emojiBtn.classList.remove('btn-primary');
            if (photoBtn) photoBtn.classList.add('btn-primary');
        } else {
            container.className = 'bunny-icon';
            container.textContent = '🐰';
            if (emojiBtn) emojiBtn.classList.add('btn-primary');
            if (photoBtn) photoBtn.classList.remove('btn-primary');
        }
    }
    
    // Global exports for Settings & Preferences
    window.setSidebarAvatar = typeof setSidebarAvatar !== 'undefined' ? setSidebarAvatar : window.setSidebarAvatar;
    window.togglePixelFont = typeof togglePixelFont !== 'undefined' ? togglePixelFont : window.togglePixelFont;
    window.toggleMouseBunny = typeof toggleMouseBunny !== 'undefined' ? toggleMouseBunny : window.toggleMouseBunny;
    window.setTabBarMode = typeof setTabBarMode !== 'undefined' ? setTabBarMode : window.setTabBarMode;
    window.setSidebarMode = typeof setSidebarMode !== 'undefined' ? setSidebarMode : window.setSidebarMode;
    window.setFontScale = typeof setFontScale !== 'undefined' ? setFontScale : window.setFontScale;
    window.toggleTextSelect = typeof toggleTextSelect !== 'undefined' ? toggleTextSelect : window.toggleTextSelect;

    function setSidebarAvatar(mode) {
        safeSetItem('sidebarAvatar', mode);
        applySidebarAvatar(mode);
        if (typeof updateLockscreenAvatar === 'function') {
            updateLockscreenAvatar(mode);
        } else if (typeof window.updateLockscreenAvatar === 'function') {
            window.updateLockscreenAvatar(mode);
        }
    }
    window.setSidebarAvatar = setSidebarAvatar;

    function initThemeGrid() {
        const el = document.getElementById('theme-grid');
        if (!el) return;
        const current = safeGetItem('theme', 'bunny');
        el.innerHTML = CONFIG.THEMES.map(t =>
            `<div class="theme-card ${t.id === current ? 'active' : ''}" onclick="setTheme('${t.id}')">
                <div class="theme-preview" style="background:linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]}, ${t.colors[2]});"></div>
                <div class="theme-name">${t.name}</div>
            </div>`
        ).join('');
    }

    /* ---- Safe localStorage wrapper (prevents silent quota/failure) ---- */
    function safeSetItem(key, value) {
        try { localStorage.setItem(key, value); return true; }
        catch(e) { console.warn('[localStorage] Failed to save:', key, e); return false; }
    }
    function safeGetItem(key, fallback) {
        try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
        catch(e) { return fallback; }
    }
    function safeRemoveItem(key) {
        try { localStorage.removeItem(key); return true; }
        catch(e) { console.warn('[localStorage] Failed to remove:', key, e); return false; }
    }

    function setTheme(id) {
        if (!CONFIG.THEMES.find(t => t.id === id)) return;
        safeSetItem('theme', id);
        document.documentElement.setAttribute('data-theme', id);
        initThemeGrid();
        if (typeof _invalidateTrailCache === 'function') _invalidateTrailCache();
        if (typeof _invalidateBloomCache === 'function') _invalidateBloomCache();
        logEvent(`🎨 切换主题：${CONFIG.THEMES.find(t => t.id === id)?.name || id}`, 'info');
    }

    function togglePixelFont() {
        pixelFontEnabled = !pixelFontEnabled;
        safeSetItem('pixelFont', pixelFontEnabled ? '1' : '0');
        document.documentElement.classList.toggle('font-pixel', pixelFontEnabled);
        const ft = document.getElementById('font-toggle');
        if (ft) ft.classList.toggle('on', pixelFontEnabled);
    }

    /* ---- Custom font scale: persisted multiplier 0.8 ~ 2.0 ---- */
    // Uses requestAnimationFrame batching to avoid layout thrashing
    let _fontScaleRafId = null;
    function setFontScale(pct) {
        const scale = Math.max(0.8, Math.min(2.0, pct / 100));
        if (_fontScaleRafId) cancelAnimationFrame(_fontScaleRafId);
        _fontScaleRafId = requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--font-scale', scale);
            _fontScaleRafId = null;
        });
        safeSetItem('fontScale', String(pct));
        const valEl = document.getElementById('font-scale-val');
        if (valEl) valEl.textContent = pct + '%';
    }

    /* ---- Map size & player count settings ---- */
    const MAP_SIZE_PRESETS = {
        small: { name: '小型', total: 78, label: '小型(78)' },
        medium: { name: '中型', total: 156, label: '中型(156)' },
        standard: { name: '标准', total: 312, label: '标准(312)' },
    };
    function setMapSize(size) {
        safeSetItem('mapSizePref', size);
        const preset = MAP_SIZE_PRESETS[size] || MAP_SIZE_PRESETS.medium;
        const valEl = document.getElementById('map-size-val');
        if (valEl) valEl.textContent = preset.label;
    }
    function setPlayerCount(count) {
        if (count !== 'random') count = parseInt(count);
        safeSetItem('playerCountPref', String(count));
        const valEl = document.getElementById('player-count-val');
        if (valEl) valEl.textContent = count === 'random' ? '随机(4-8)' : count + '人';
    }
    function loadGameSettings() {
        const mapSize = safeGetItem('mapSizePref', 'medium');
        const playerCount = safeGetItem('playerCountPref', 'random');
        const mapEl = document.getElementById('map-size-val');
        if (mapEl) { const p = MAP_SIZE_PRESETS[mapSize] || MAP_SIZE_PRESETS.medium; mapEl.textContent = p.label; }
        const pcEl = document.getElementById('player-count-val');
        if (pcEl) { const pc = playerCount === 'random' ? '随机(4-8)' : playerCount + '人'; pcEl.textContent = pc; }
    }
    function loadFontScale() {
        const saved = parseInt(safeGetItem('fontScale', '100')) || 100;
        setFontScale(saved);
        const slider = document.getElementById('font-scale-slider');
        if (slider) slider.value = saved;
        const tbSelect = document.getElementById('tabbar-mode-select');
        if (tbSelect) tbSelect.value = safeGetItem('tabBarMode', 'always');
        const sbSelect = document.getElementById('sidebar-mode-select');
        if (sbSelect) sbSelect.value = safeGetItem('sidebarCollapsed', 'auto');
        const dvSelect = document.getElementById('default-view-select');
        if (dvSelect) dvSelect.value = safeGetItem('defaultView', 'home');
        loadGameSettings();
    }

    function toggleMouseBunny() {
        mouseBunnyEnabled = !mouseBunnyEnabled;
        safeSetItem('mouseBunny', mouseBunnyEnabled ? '1' : '0');
        const mt = document.getElementById('mouse-toggle');
        if (mt) mt.classList.toggle('on', mouseBunnyEnabled);
        if (!mouseBunnyEnabled) {
            trailPoints = [];
            if (trailCtx && trailCanvas) trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
            if (fxCtx && fxCanvas) fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        } else {
            restartTrailRAF(); // Resume RAF loop when re-enabled
        }
    }

    /* ---- Text selection toggle ---- */
    let textSelectDisabled = true;
    function loadTextSelectPref() {
        textSelectDisabled = safeGetItem('textSelectDisabled', '1') !== '0';
        applyTextSelect();
    }
    function applyTextSelect() {
        document.body.classList.toggle('no-select', textSelectDisabled);
        const t = document.getElementById('text-select-toggle');
        if (t) t.classList.toggle('on', textSelectDisabled);
    }
    function toggleTextSelect() {
        textSelectDisabled = !textSelectDisabled;
        safeSetItem('textSelectDisabled', textSelectDisabled ? '1' : '0');
        applyTextSelect();
        logEvent(textSelectDisabled ? '📝 已禁用文本选中' : '📝 已启用文本选中', 'info');
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    /* ==================== Navigation ==================== */
    // ===== Sidebar auto-collapse / auto-hide =====
    let _sidebarCollapseTimer = null;
    let _sidebarMode = safeGetItem('sidebarCollapsed', 'auto');
    // Modes: 'auto' (collapse to icons after 5s), 'auto-hide' (fully hide, click to restore),
    //        'locked-open', 'locked-collapsed'

    function initSidebarCollapse() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const pin = document.getElementById('sidebar-pin');

        function applyMode() {
            sidebar.classList.remove('collapsed', 'auto-hidden');
            if (pin) { pin.classList.remove('locked'); pin.textContent = '📌'; }
            if (_sidebarMode === 'locked-collapsed') {
                sidebar.classList.add('collapsed');
                if (pin) { pin.classList.add('locked'); pin.textContent = '📍'; }
            } else if (_sidebarMode === 'locked-open') {
                if (pin) { pin.classList.add('locked'); pin.textContent = '📍'; }
            } else if (_sidebarMode === 'auto-hide') {
                // Start auto-hide timer
                startAutoHideTimer();
            } else {
                // 'auto' mode
                checkFontScaleCollapse();
            }
        }

        function startAutoHideTimer() {
            if (_sidebarCollapseTimer) clearTimeout(_sidebarCollapseTimer);
            _sidebarCollapseTimer = setTimeout(function() {
                if (_sidebarMode === 'auto-hide') {
                    sidebar.classList.add('auto-hidden');
                } else if (_sidebarMode === 'auto') {
                    sidebar.classList.add('collapsed');
                }
            }, 5000);
        }

        sidebar.addEventListener('mouseenter', function() {
            if (_sidebarCollapseTimer) { clearTimeout(_sidebarCollapseTimer); _sidebarCollapseTimer = null; }
            // In 'auto' mode, hover expands — even if collapsed by font scale
            if (_sidebarMode === 'auto') {
                sidebar.classList.remove('collapsed');
                sidebar.classList.add('_hover-expanded');
            }
        });

        sidebar.addEventListener('mouseleave', function() {
            if (sidebar.classList.contains('_hover-expanded')) {
                sidebar.classList.remove('_hover-expanded');
            }
            if (_sidebarMode !== 'auto' && _sidebarMode !== 'auto-hide') return;
            startAutoHideTimer();
        });

        // Re-check font scale when mouse leaves — may need to re-collapse
        sidebar.addEventListener('mouseleave', function() {
            if (_sidebarMode === 'auto') {
                // Small delay to let hover state settle
                setTimeout(function() {
                    if (!sidebar.matches(':hover')) {
                        checkFontScaleCollapse();
                    }
                }, 50);
            }
        });

        // In 'auto-hide' mode, click on the collapsed sidebar strip to restore
        sidebar.addEventListener('click', function(e) {
            if (_sidebarMode === 'auto-hide' && sidebar.classList.contains('auto-hidden')) {
                sidebar.classList.remove('auto-hidden');
                startAutoHideTimer();
            }
        }, true); // capture phase to catch clicks early

        function checkFontScaleCollapse() {
            if (_sidebarMode !== 'auto') return;
            // Don't re-collapse if currently hovered (user is actively interacting)
            if (sidebar.matches(':hover')) return;
            const scale = parseFloat(safeGetItem('fontScale', '100')) || 100;
            if (scale >= 110) sidebar.classList.add('collapsed');
            else sidebar.classList.remove('collapsed');
        }

        window.addEventListener('storage', function(e) {
            if (e.key === 'fontScale') checkFontScaleCollapse();
        });
        const origSetFontScale = window.setFontScale;
        if (origSetFontScale) {
            window.setFontScale = function(pct) {
                origSetFontScale(pct);
                checkFontScaleCollapse();
            };
        }
        // Apply initial mode without transition to prevent layout shift on page load
        sidebar.classList.add('no-transition');
        applyMode();
        // Force reflow to apply the collapsed state immediately
        void sidebar.offsetHeight;
        // Re-enable transitions on next frame
        requestAnimationFrame(function() {
            sidebar.classList.remove('no-transition');
        });
    }

    function toggleSidebarPin() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const pin = document.getElementById('sidebar-pin');
        if (_sidebarMode === 'auto') {
            if (sidebar.classList.contains('collapsed')) {
                _sidebarMode = 'locked-collapsed';
            } else {
                _sidebarMode = 'locked-open';
            }
        } else {
            _sidebarMode = 'auto';
        }
        safeSetItem('sidebarCollapsed', _sidebarMode);
        if (_sidebarMode === 'locked-collapsed') {
            sidebar.classList.add('collapsed');
            if (pin) { pin.classList.add('locked'); pin.textContent = '📍'; }
        } else if (_sidebarMode === 'locked-open') {
            sidebar.classList.remove('collapsed');
            if (pin) { pin.classList.add('locked'); pin.textContent = '📍'; }
        } else {
            if (pin) { pin.classList.remove('locked'); pin.textContent = '📌'; }
            const scale = parseFloat(safeGetItem('fontScale', '100')) || 100;
            if (scale >= 110) sidebar.classList.add('collapsed');
            else sidebar.classList.remove('collapsed');
        }
    }

    document.addEventListener('DOMContentLoaded', initSidebarCollapse);

    function setSidebarMode(mode) {
        _sidebarMode = mode;
        safeSetItem('sidebarCollapsed', mode);
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        sidebar.classList.remove('collapsed', 'auto-hidden');
        const pin = document.getElementById('sidebar-pin');
        if (pin) { pin.classList.remove('locked'); pin.textContent = '📌'; }
        if (mode === 'locked-collapsed') {
            sidebar.classList.add('collapsed');
            if (pin) { pin.classList.add('locked'); pin.textContent = '📍'; }
        } else if (mode === 'locked-open') {
            if (pin) { pin.classList.add('locked'); pin.textContent = '📍'; }
        } else if (mode === 'auto-hide') {
            if (_sidebarCollapseTimer) clearTimeout(_sidebarCollapseTimer);
            _sidebarCollapseTimer = setTimeout(function() {
                sidebar.classList.add('auto-hidden');
            }, 5000);
        } else {
            // 'auto'
            const scale = parseFloat(safeGetItem('fontScale', '100')) || 100;
            if (scale >= 110) sidebar.classList.add('collapsed');
        }
        const select = document.getElementById('sidebar-mode-select');
        if (select) select.value = mode;
    }

    // ===== Tab bar collapse/hide =====
    let _tabBarMode = safeGetItem('tabBarMode', 'always');
    let _tabBarCollapseTimer = null;

    function initTabBarMode() {
        const tabBar = document.querySelector('.tab-bar');
        const fab = document.getElementById('tab-fab');
        if (!tabBar) return;

        function applyMode() {
            if (_tabBarMode === 'hidden') {
                tabBar.classList.add('hidden');
                tabBar.classList.remove('collapsed');
                if (fab) fab.classList.add('show');
            } else if (_tabBarMode === 'auto-collapse') {
                tabBar.classList.remove('hidden');
                if (fab) fab.classList.remove('show');
                startAutoCollapseTimer();
            } else {
                tabBar.classList.remove('hidden', 'collapsed');
                if (fab) fab.classList.remove('show');
            }
        }

        function startAutoCollapseTimer() {
            if (_tabBarCollapseTimer) clearTimeout(_tabBarCollapseTimer);
            _tabBarCollapseTimer = setTimeout(function() {
                if (_tabBarMode === 'auto-collapse') tabBar.classList.add('collapsed');
            }, 3000);
        }

        tabBar.addEventListener('touchstart', function() {
            if (_tabBarMode === 'auto-collapse') {
                tabBar.classList.remove('collapsed');
                startAutoCollapseTimer();
            }
        }, { passive: true });

        tabBar.addEventListener('click', function() {
            if (_tabBarMode === 'auto-collapse') startAutoCollapseTimer();
        });

        applyMode();
        window._applyTabBarMode = applyMode;
    }

    function toggleTabBar() {
        const tabBar = document.querySelector('.tab-bar');
        if (!tabBar) return;
        if (_tabBarMode === 'hidden') {
            showTabBar();
        } else if (tabBar.classList.contains('collapsed')) {
            tabBar.classList.remove('collapsed');
        } else {
            tabBar.classList.add('collapsed');
        }
    }

    function showTabBar() {
        const tabBar = document.querySelector('.tab-bar');
        const fab = document.getElementById('tab-fab');
        if (!tabBar) return;
        tabBar.classList.remove('hidden');
        if (fab) fab.classList.remove('show');
        if (_tabBarMode === 'hidden') {
            if (_tabBarCollapseTimer) clearTimeout(_tabBarCollapseTimer);
            _tabBarCollapseTimer = setTimeout(function() {
                tabBar.classList.add('hidden');
                if (fab) fab.classList.add('show');
            }, 3000);
        }
    }

    function setTabBarMode(mode) {
        _tabBarMode = mode;
        safeSetItem('tabBarMode', mode);
        if (window._applyTabBarMode) window._applyTabBarMode();
        const select = document.getElementById('tabbar-mode-select');
        if (select) select.value = mode;
    }

    document.addEventListener('DOMContentLoaded', initTabBarMode);

    function navigateTo(view) {
        closeModal(); // Close any open modals when switching views
        currentView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById('view-' + view);
        if (target) target.classList.add('active');
        // Update sidebar nav items
        document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
        // Update mobile tab bar
        document.querySelectorAll('.tab-item').forEach(t => t.classList.toggle('active', t.dataset.view === view));
        // Render on demand
        if (view === 'monopoly') renderMonopoly();
        if (view === 'anniversary') renderAnniversary();
        if (view === 'logs') renderEvents();
        if (view === 'settings' && godModeActive) renderGodPanel();
        if (view === 'settings') renderSaveSlots();
        if (view === 'settings' && typeof updateNotifyBtn === 'function') updateNotifyBtn();
    }

    function handleLogoClick() {
        navigateTo('home');
        titleClicks++;
        if (titleClicks >= CONFIG.GOD_MODE_CLICKS) {
            titleClicks = 0;
            const gp = document.getElementById('god-panel');
            if (gp) gp.style.display = '';
            navigateTo('settings');
            renderGodPanel();
            logEvent('✨ 上帝模式入口已开启', 'god');
        }
    }

    // About version click — also triggers God Mode entry (same as logo click)
    let aboutClickCount = 0;
    function handleAboutClick() {
        aboutClickCount++;
        const av = document.getElementById('about-version');
        if (!av) return;
        // Subtle visual feedback on each click
        av.style.transition = 'transform .2s';
        av.style.transform = 'scale(0.97)';
        setTimeout(() => av.style.transform = '', 200);
        if (aboutClickCount >= CONFIG.GOD_MODE_CLICKS) {
            aboutClickCount = 0;
            const gp = document.getElementById('god-panel');
            if (gp) gp.style.display = '';
            renderGodPanel();
            logEvent('✨ 通过关于版本触发了上帝模式入口', 'god');
        }
    }

    /* ==================== Anniversary & Milestones ==================== */
    const MILESTONES = [
        { days: 100, label: '100天纪念' },
        { days: 180, label: '180天纪念 (半周年)' },
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
        { days: 10000, label: '10000天 (万日之约)' },
    ];

    function formatDate(date) {
        return date.getFullYear() + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + String(date.getDate()).padStart(2, '0');
    }

    function renderAnniversary() {
        const start = new Date(CONFIG.START_DATE);
        const now = new Date();
        const diff = now - start;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);

        const daysEl = document.getElementById('anni-days');
        const timeEl = document.getElementById('anni-time');
        if (daysEl) daysEl.textContent = days;
        if (timeEl) timeEl.textContent = `${hours} 时 ${mins} 分 ${secs} 秒`;

        // Milestones with dates
        const el = document.getElementById('anni-milestones');
        if (el) {
            el.innerHTML = MILESTONES.map(m => {
                const date = new Date(start.getTime() + m.days * 86400000);
                const dateStr = formatDate(date);
                const reached = days >= m.days;
                const remain = m.days - days;
                return `<div class="milestone-item">
                    <div class="milestone-dot ${reached ? 'reached' : ''}"></div>
                    <div class="milestone-text">
                        ${m.label}
                        <div class="milestone-date">📅 ${dateStr}</div>
                        <div class="milestone-remain" style="color:${reached ? 'var(--good)' : 'var(--text2)'};">${reached ? '✅ 已达成' : `还有 ${remain} 天`}</div>
                    </div>
                </div>`;
            }).join('');
        }

        // Next milestone box
        const nextEl = document.getElementById('anni-next-milestone');
        if (nextEl) {
            const next = MILESTONES.find(m => days < m.days);
            if (next) {
                const nextDate = new Date(start.getTime() + next.days * 86400000);
                const remain = next.days - days;
                nextEl.innerHTML = `<div style="font-size:.75rem;color:var(--text2);">下一个纪念日</div>
                    <div class="nm-date">${next.label}</div>
                    <div style="font-size:.8rem;color:var(--text2);">📅 ${formatDate(nextDate)}</div>
                    <div class="nm-countdown">还有 ${remain} 天</div>`;
            } else {
                nextEl.innerHTML = `<div class="nm-date">🏆 所有里程碑已达成！</div>`;
            }
        }
    }

    /* ==================== Event Log ==================== */
    function logEvent(msg, type = 'info') {
        const now = new Date();
        const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
        eventLog.unshift({ time, msg, type });
        if (eventLog.length > 100) eventLog.pop();
        if (currentView === 'logs') renderEvents();
    }

    /* ==================== Toast & Loading ==================== */
    function showToast(msg, type = 'info') {
        const lockEl = document.getElementById('bcos-car-lockscreen');
        if (lockEl && lockEl.style.display !== 'none' && typeof showCarToast === 'function') {
            showCarToast(msg);
            return;
        }
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-text">${msg}</div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function showLoading(text = '读取中...') {
        const overlay = document.getElementById('load-overlay');
        const textEl = document.getElementById('load-text');
        if (textEl) textEl.textContent = text;
        if (overlay) overlay.classList.add('show');
    }

    function hideLoading() {
        const overlay = document.getElementById('load-overlay');
        if (overlay) overlay.classList.remove('show');
    }

    function renderEvents() {
        const el = document.getElementById('events-list');
        if (!el) return;
        if (eventLog.length === 0) {
            el.innerHTML = '<div style="color:var(--text2);text-align:center;padding:1rem;">暂无事件</div>';
            return;
        }
        el.innerHTML = eventLog.map(e =>
            `<div class="event-item">
                <div class="event-time">${e.time}</div>
                <div class="event-text event-${e.type}">${e.msg}</div>
            </div>`
        ).join('');
    }

    /* ==================== God Mode (ECDSA, no city references) ==================== */
    function renderGodPanel() {
        const el = document.getElementById('god-content');
        if (!el) return;
        if (godModeActive) {
            el.innerHTML = `
                <div class="god-status success show">✨ 上帝模式已激活！</div>
                <div style="font-size:.8rem;color:var(--text2);text-align:center;line-height:1.8;margin:.5rem 0;">
                    🎁 大富翁初始资金翻倍（20000💰）<br>
                    💰 首次激活赠送 10000💰
                </div>
                <div style="display:flex;flex-direction:column;gap:.4rem;margin-top:.75rem;">
                    <button class="btn btn-primary btn-sm" onclick="godRandomBonus()">🎲 随机加成</button>
                    <button class="btn btn-secondary btn-sm" onclick="godBlessAll()">💖 全员祝福</button>
                    <button class="btn btn-danger btn-sm" onclick="deactivateGodMode()">❌ 关闭上帝模式</button>
                </div>`;
            return;
        }
        const challenge = safeGetItem('godChallenge', '') || generateChallenge();
        el.innerHTML = `
            <div style="font-size:.8rem;color:var(--text2);margin-bottom:.5rem;text-align:center;line-height:1.6;">
                输入激活码以解锁上帝模式<br>使用私钥对挑战码进行 ECDSA-SHA256 签名
            </div>
            <div class="god-challenge-box">
                <div style="font-size:.7rem;color:var(--text2);margin-bottom:.25rem;">挑战码 Challenge (32字符 hex)</div>
                <div class="god-code-display">${challenge}</div>
                <button class="btn btn-secondary btn-sm" onclick="generateChallenge();renderGodPanel();">🔄 刷新挑战码</button>
            </div>
            <div class="god-status" id="god-status"></div>
            <input type="text" class="god-input" id="god-input" placeholder="粘贴 128 字符 hex 签名..." style="margin-bottom:.5rem;">
            <button class="btn btn-primary" style="width:100%;" onclick="verifyGodMode()">🔓 验证激活</button>`;
    }

    function generateChallenge() {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        const challenge = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        safeSetItem('godChallenge', challenge);
        return challenge;
    }

    async function verifyGodMode() {
        const challenge = safeGetItem('godChallenge', '');
        const input = document.getElementById('god-input');
        const status = document.getElementById('god-status');
        if (!challenge || !input || !status) return;
        const sigHex = input.value.trim();
        if (!sigHex) {
            status.textContent = '请输入签名';
            status.className = 'god-status error show';
            return;
        }
        try {
            const key = await crypto.subtle.importKey(
                'jwk', CONFIG.GOD_MODE_PUBLIC_KEY,
                { name: 'ECDSA', namedCurve: 'P-256' },
                false, ['verify']
            );
            const enc = new TextEncoder().encode(challenge);
            const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g).map(h => parseInt(h, 16)));
            const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sigBytes, enc);
            if (valid) {
                godModeActive = true;
                safeSetItem('godModeActive', 'true');
                const gi = document.getElementById('god-indicator');
                if (gi) gi.classList.add('show');
                // Show god panel immediately (not hidden)
                const gp = document.getElementById('god-panel');
                if (gp) gp.style.display = '';
                status.textContent = '✨ 激活成功！上帝模式已开启';
                status.className = 'god-status success show';
                logEvent('✨ 上帝模式已激活！', 'god');
                showToast('✨ 上帝模式已激活！+10000💰', 'god');
                // Apply immediate effects to current game
                if (mono && mono.players && mono.players[0]) {
                    mono.players[0].money += 10000;
                    saveMonopoly();
                    renderMonopoly();
                }
                renderGodPanel(); // Render immediately, no delay
            } else {
                status.textContent = '❌ 签名验证失败';
                status.className = 'god-status error show';
            }
        } catch (e) {
            status.textContent = '❌ 验证出错：' + e.message;
            status.className = 'god-status error show';
        }
    }

    function deactivateGodMode() {
        godModeActive = false;
        safeRemoveItem('godModeActive');
        const gi = document.getElementById('god-indicator');
        if (gi) gi.classList.remove('show');
        renderGodPanel();
        logEvent('上帝模式已关闭', 'info');
        showToast('上帝模式已关闭', 'info');
    }

    /* ---- God Mode bonus functions ---- */
    function godRandomBonus() {
        if (!godModeActive || !mono?.players?.[0]) return;
        const p = mono.players[0];
        const bonuses = [
            () => { const amt = 3000 + Math.floor(Math.random() * 7000); p.money += amt; return `💰 获得 ${amt} 金币`; },
            () => { const amt = 5 + Math.floor(Math.random() * 20); const si = Math.floor(Math.random() * STOCK_TYPES.length); const h = p.stockHoldings[si]; h.avgCost = h.shares > 0 ? (h.avgCost * h.shares + mono.stockPrices[si] * amt) / (h.shares + amt) : mono.stockPrices[si]; h.shares += amt; return `📈 获赠 ${amt} 股 ${STOCK_TYPES[si].nm}`; },
            () => { p.shield = (p.shield||0)+1; return `🛡️ 获得护盾保护`; },
            () => { p.lucky = (p.lucky||0)+1; return `🍀 获得幸运加成`; },
            () => { p.doubleDice = (p.doubleDice||0)+1; return `🎲 下次掷骰双倍`; },
            () => { p.jailFree = true; return `🔑 获得出狱卡`; },
            () => { p.taxFree = 3; return `🧾 获得 3 回合免税`; },
            () => { const amt = 20 + Math.floor(Math.random() * 30); p.stats.stockProfit += amt; p.money += amt; return `💎 神秘宝藏 ${amt} 金币`; },
            () => { const v = VEHICLE_POOL[Math.floor(Math.random() * VEHICLE_POOL.length)]; p.vehicle = {...v}; return `🚗 神赐载具 ${v.ic} ${v.nm}！`; },
            () => { p.credit = 100; return `💯 信用评分恢复满分`; },
        ];
        const bonus = bonuses[Math.floor(Math.random() * bonuses.length)];
        const msg = bonus();
        saveMonopoly();
        renderMonopoly();
        monoLog(`✨ 上帝恩赐：${msg}`, 'god');
        showToast(`✨ ${msg}`, 'god');
        showModal(`<div style="text-align:center;padding:1rem;"><div style="font-size:2.5rem;margin-bottom:.5rem;">✨</div><h3 style="color:var(--accent);">上帝恩赐</h3><p style="color:var(--text2);margin:.5rem 0;">${msg}</p><button class="btn btn-primary" style="width:100%;" onclick="closeModal()">感谢恩赐</button></div>`);
    }

    function godBlessAll() {
        if (!godModeActive || !mono?.players) return;
        mono.players.forEach(p => {
            if (!p.bankrupt) {
                p.money += 5000;
                p.credit = Math.min(100, p.credit + 20);
            }
        });
        saveMonopoly();
        renderMonopoly();
        monoLog('💖 上帝祝福全员：每人 +5000💰，信用 +20', 'god');
        showModal(`<div style="text-align:center;padding:1rem;"><div style="font-size:2.5rem;margin-bottom:.5rem;">💖</div><h3 style="color:var(--accent);">全员祝福</h3><p style="color:var(--text2);margin:.5rem 0;">所有玩家获得 5000💰 和 20 信用评分</p><button class="btn btn-primary" style="width:100%;" onclick="closeModal()">感谢祝福</button></div>`);
    }

    function godTimeAccelerate() {
        if (!godModeActive || !mono) return;
        advanceEra();
        monoLog('⏩ 上帝加速时代推进', 'god');
    }

    /* ==================== Save Slot Management (3 slots) ==================== */
    