const SAVE_SLOTS = 3;
    function getSaveSlotKey(slot) { return `bunny_mono_save_slot_${slot}`; }
    function getSaveSlotMeta(slot) {
        try {
            const raw = safeGetItem(getSaveSlotKey(slot), '');
            if (!raw) return null;
            const data = JSON.parse(raw);
            return {
                turn: data.turn || 0,
                players: (data.players || []).map(p => ({ ic: p.ic, nm: p.nm, money: p.money, bankrupt: p.bankrupt })),
                unlockedEras: data.unlockedEras || 0,
                savedAt: data._savedAt || 0,
            };
        } catch(e) { return null; }
    }

    function renderSaveSlots() {
        const el = document.getElementById('save-slots');
        if (!el) return;
        let h = '';
        for (let i = 0; i < SAVE_SLOTS; i++) {
            const meta = getSaveSlotMeta(i);
            const regionLabel = meta ? '全岛' : '';
            const time = meta?.savedAt ? new Date(meta.savedAt).toLocaleString('zh-CN', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}) : '';
            const playersSummary = meta?.players?.length
                ? meta.players.map(p => `${p.ic}${p.money}💰`).join(' ')
                : '';
            h += `<div style="background:var(--card2);border-radius:var(--radius-sm);padding:.7rem;border:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;">
                    <strong style="font-size:.85rem;color:var(--accent);">📄 存档 ${i+1}</strong>
                    ${meta ? `<span style="font-size:.65rem;color:var(--text2);">${time}</span>` : '<span style="font-size:.65rem;color:var(--text2);opacity:.5;">空槽位</span>'}
                </div>
                ${meta ? `
                    <div style="font-size:.7rem;color:var(--text2);line-height:1.5;margin-bottom:.5rem;">
                        ${regionLabel} · 第${meta.turn}回合<br>
                        ${playersSummary}
                    </div>
                    <div style="display:flex;gap:.4rem;">
                        <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="loadSaveSlot(${i})">📂 读取</button>
                        <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="saveToSlot(${i})">💾 覆盖</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteSaveSlot(${i})">🗑️</button>
                    </div>
                ` : `
                    <button class="btn btn-primary btn-sm" style="width:100%;" onclick="saveToSlot(${i})">💾 保存到此处</button>
                `}
            </div>`;
        }
        el.innerHTML = h;
    }

    function saveToSlot(slot) {
        if (!mono) { showToast('无游戏数据可保存', 'error'); return; }
        try {
            showLoading('保存中...');
            setTimeout(() => {
                const data = JSON.parse(JSON.stringify(mono));
                data._savedAt = Date.now();
                data._cardInventory = JSON.parse(JSON.stringify(cardInventory));
                safeSetItem(getSaveSlotKey(slot), JSON.stringify(data));
                logEvent(`✓ 游戏已保存到存档 ${slot+1}`, 'success');
                showToast(`✓ 已保存到存档 ${slot+1}`, 'success');
                renderSaveSlots();
                hideLoading();
            }, 400);
        } catch(e) {
            hideLoading();
            showToast('保存失败: ' + e.message, 'error');
            logEvent('保存失败: ' + e.message, 'error');
        }
    }

    function loadSaveSlot(slot) {
        showLoading('读取存档中...');
        setTimeout(() => {
            try {
                const raw = safeGetItem(getSaveSlotKey(slot), '');
                if (!raw) { hideLoading(); showToast('该存档为空', 'error'); return; }
                const data = JSON.parse(raw);
                if (!data.tiles || !data.players) { hideLoading(); showToast('存档损坏', 'error'); return; }
                // Attempt tile count migration instead of refusing
                const expected = MONO_REGIONS.reduce((sum, r) => sum + r.tileCount, 0);
                if (data.tiles.length !== expected) {
                    console.warn(`[loadSaveSlot] Tile count mismatch: save=${data.tiles.length}, expected=${expected}. Migrating...`);
                    const oldTiles = data.tiles;
                    const oldProps = data.properties;
                    // Rebuild tiles with current map configuration
                    data.tiles = generateAllTiles();
                    // Rebuild properties array, preserving old ownership where positions overlap
                    data.properties = data.tiles.map(t => t.type === 'property' ? {owner:-1, level:0, mortgaged:false} : null);
                    if (oldProps) {
                        for (let i = 0; i < Math.min(oldProps.length, data.properties.length); i++) {
                            if (oldProps[i] && data.properties[i]) {
                                data.properties[i].owner = oldProps[i].owner ?? -1;
                                data.properties[i].level = oldProps[i].level ?? 0;
                                data.properties[i].mortgaged = oldProps[i].mortgaged ?? false;
                            }
                        }
                    }
                    // Reset player positions to valid range
                    data.players.forEach(p => {
                        if (p.pos >= data.tiles.length) p.pos = 0;
                    });
                    logEvent(`📂 存档迁移：地图从${oldTiles.length}格→${data.tiles.length}格，玩家数据已保留`, 'info');
                }
                delete data._savedAt;
                mono = data;
                if (data._cardInventory) {
                    cardInventory = data._cardInventory;
                    saveInventory();
                }
                validateMono();
                saveMonopoly();
                renderMonopoly();
                hideLoading();
                showToast(`✓ 已读取存档 ${slot+1} — 全岛 第${mono.turn}回合`, 'success');
                logEvent(`✓ 已读取存档 ${slot+1} — 全岛 第${mono.turn}回合`, 'success');
                navigateTo('monopoly');
            } catch(e) {
                hideLoading();
                showToast('读取失败: ' + e.message, 'error');
                logEvent('读取失败: ' + e.message, 'error');
            }
        }, 600);
    }

    function deleteSaveSlot(slot) {
        if (!confirm(`确定删除存档 ${slot+1} 吗？`)) return;
        safeRemoveItem(getSaveSlotKey(slot));
        showToast(`存档 ${slot+1} 已删除`, 'info');
        logEvent(`存档 ${slot+1} 已删除`, 'info');
        renderSaveSlots();
    }

    /* ==================== Avatar Click Effects (Upgraded Epic) ==================== */
    function initAvatarEffect() {
        const avatar = document.getElementById('avatar-img');
        if (!avatar) return;
        // Prevent long-press context menu on mobile (causes white corner flash)
        avatar.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
        avatar.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
        // Also prevent on the container
        const container = document.querySelector('.avatar-container');
        if (container) {
            container.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
        }
        avatar.addEventListener('click', (e) => {
            const rect = avatar.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            avatarClickCount++;
            // Every click: particle burst
            spawnAvatarParticles(x, y, 12);
            // Avatar shake animation
            avatar.style.animation = 'none';
            void avatar.offsetWidth; // Force reflow
            avatar.style.animation = 'avatarShake .4s ease';
            // Every 7th click: epic multi-layer effect
            if (avatarClickCount % CONFIG.GOD_MODE_CLICKS === 0) {
                triggerEpicEffect(x, y);
            }
        });
    }

    function spawnAvatarParticles(x, y, count) {
        const colors = ['#FF6B9D', '#FFD700', '#4CAF50', '#0EA5E9', '#a78bfa', '#FF6B35', '#E91E63', '#26A69A'];
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'avatar-burst';
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 40 + Math.random() * 50;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            const size = 4 + Math.random() * 6;
            const c = colors[Math.floor(Math.random() * colors.length)];
            p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${c};border-radius:50%;--tx:${tx}px;--ty:${ty}px;animation:sparkle .8s ease forwards;`;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 800);
        }
    }

    function triggerEpicEffect(x, y) {
        const overlay = document.getElementById('epic-overlay');
        if (!overlay) return;
        overlay.style.display = 'block';
        overlay.innerHTML = '';

        // 1. Background flash
        const flash = document.createElement('div');
        flash.style.cssText = 'position:absolute;inset:0;background:#fff;animation:epicFlash 1s ease;';
        overlay.appendChild(flash);

        // 2. Multi-rainbow rings (5 layers, different colors)
        const ringColors = ['#FF6B9D', '#FFB347', '#FFEAA7', '#55EFC4', '#74B9FF'];
        ringColors.forEach((c, i) => {
            const ring = document.createElement('div');
            ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:40px;height:40px;border-radius:50%;border:4px solid ${c};transform:translate(-50%,-50%);animation:epicRing 1.5s ease ${i * 0.12}s forwards;`;
            overlay.appendChild(ring);
        });

        // 3. Full-screen fireworks (60 particles from center outward)
        const fwColors = ['#FF6B9D', '#FFD700', '#4CAF50', '#0EA5E9', '#a78bfa', '#FF6B35', '#E91E63', '#26A69A', '#FFEB3B'];
        for (let i = 0; i < 60; i++) {
            const p = document.createElement('div');
            const angle = (i / 60) * Math.PI * 2 + Math.random() * 0.3;
            const dist = 100 + Math.random() * 250;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            const size = 6 + Math.random() * 8;
            const c = fwColors[Math.floor(Math.random() * fwColors.length)];
            p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${c};--tx:${tx}px;--ty:${ty}px;animation:epicFirework 1.8s ease forwards;box-shadow:0 0 8px ${c};`;
            overlay.appendChild(p);
        }

        // 4. Text effect — "✨ 兔可可的祝福降临！✨" scales up and fades
        const text = document.createElement('div');
        text.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);font-size:1.4rem;font-weight:800;color:var(--accent);text-shadow:0 0 20px var(--accent),0 0 40px var(--accent);white-space:nowrap;animation:epicText 2s ease forwards;z-index:10;`;
        text.textContent = '✨ 兔可可的祝福降临！✨';
        overlay.appendChild(text);

        // 5. Extra particle burst at center
        spawnAvatarParticles(x, y, 20);

        // 6. Trail sparkles for 2 seconds (8 bursts every 250ms)
        let trailCount = 0;
        const trailInterval = setInterval(() => {
            spawnAvatarParticles(
                x + (Math.random() - 0.5) * 120,
                y + (Math.random() - 0.5) * 120,
                5
            );
            trailCount++;
            if (trailCount >= 8) clearInterval(trailInterval);
        }, 250);

        // Clean up epic overlay after 2.5s
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
        }, 2500);

        // 7. === Egg Whiteout Mode ===
        // Whiteout: fade in 500ms then persist until painting ends
        // Activate ink-persistence mode for mouse trail
        eggInkPersistMode = true;
        eggInkPersistStart = performance.now();
        lastMouseMoveTime = performance.now();

        // Disable all interactions: text selection, image drag, button clicks
        document.body.classList.add('egg-painting');
        const eggBlock = document.getElementById('egg-block');
        if (eggBlock) eggBlock.style.display = 'block';

        // Show control bar
        const eggFab = document.getElementById('egg-fab');
        if (eggFab) { eggFab.style.display = 'flex'; }
        const eggPanel = document.getElementById('egg-fab-panel');
        if (eggPanel) { eggPanel.style.display = 'none'; }

        // Start countdown timer
        startEggTimer(30);

        const whiteout = document.getElementById('egg-whiteout');
        if (whiteout) {
            whiteout.style.display = 'block';
            whiteout.style.opacity = '0';
            whiteout.style.animation = 'eggWhiteout 500ms ease forwards';
            // Force reflow to start animation
            void whiteout.offsetWidth;
        }

        // Whiteout persists until endEggPainting() — no auto-hide timer
        _eggPanelOpen = false; // Reset FAB panel state

        logEvent('✨ 兔可可的祝福降临！华丽彩蛋触发！', 'god');
    }

    // === Egg Painting Control Functions ===
    let eggWhiteoutTimer = null;
    let eggCountdownTimer = null;
    let eggTimeLeft = 30;

    // Start the egg painting countdown timer
    function startEggTimer(initialSeconds) {
        eggTimeLeft = initialSeconds;
        updateEggTimerDisplay();
        if (eggCountdownTimer) clearInterval(eggCountdownTimer);
        eggCountdownTimer = setInterval(() => {
            if (eggTimeLeft > 0) {
                eggTimeLeft--;
                updateEggTimerDisplay();
            } else {
                // Timer reached 0 — switch to free mode (ink persists)
                clearInterval(eggCountdownTimer);
                eggCountdownTimer = null;
                const timerEl = document.getElementById('egg-fab-timer');
                if (timerEl) { timerEl.textContent = '🎨'; timerEl.style.color = '#00FF88'; }
            }
        }, 1000);
    }

    // Update the timer display element
    function updateEggTimerDisplay() {
        const timerEl = document.getElementById('egg-fab-timer');
        if (!timerEl) return;
        if (eggTimeLeft > 0) {
            timerEl.textContent = String(eggTimeLeft);
            timerEl.style.background = eggTimeLeft > 20 ? '#34D399' : eggTimeLeft > 10 ? '#FBBF24' : '#F87171';
        } else {
            timerEl.textContent = '∞';
            timerEl.style.background = '#34D399';
        }
    }

    // Extend egg painting time by 10 seconds
    function extendEggPainting() {
        // Add 10 seconds to the timer (max 99s)
        eggTimeLeft = Math.min(99, eggTimeLeft + 10);
        // If timer was in free mode (0), restart it
        if (!eggCountdownTimer && eggTimeLeft > 0) {
            startEggTimer(eggTimeLeft);
        } else {
            updateEggTimerDisplay();
        }
        // Whiteout already persists — no need to extend animation
        // Refresh ink persist mode — keep ink active
        eggInkPersistMode = true;
        lastMouseMoveTime = performance.now();
        // Show feedback
        const btn = document.getElementById('egg-btn-extend');
        if (btn) {
            const origText = btn.textContent;
            btn.textContent = '✅ 已延长!';
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => { btn.textContent = origText; btn.style.transform = ''; }, 1200);
        }
    }

    // Save egg painting screenshot
    function saveEggScreenshot() {
        const trailCanvasEl = document.getElementById('trail-canvas');
        if (!trailCanvasEl || !trailCtx) return;
        try {
            // Create a composite canvas with white background + trail
            const composite = document.createElement('canvas');
            composite.width = trailCanvasEl.width;
            composite.height = trailCanvasEl.height;
            const ctx = composite.getContext('2d');
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, composite.width, composite.height);
            // Draw trail on top
            ctx.drawImage(trailCanvasEl, 0, 0);
            // Download
            const link = document.createElement('a');
            link.download = `兔可可彩蛋_${new Date().toISOString().slice(0,10)}.png`;
            link.href = composite.toDataURL('image/png');
            link.click();
            // Feedback
            const btn = document.getElementById('egg-btn-save');
            if (btn) {
                const origText = btn.textContent;
                btn.textContent = '✅ 已保存!';
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => { btn.textContent = origText; btn.style.transform = ''; }, 1500);
            }
        } catch(e) {
            console.error('Screenshot save failed:', e);
            const btn = document.getElementById('egg-btn-save');
            if (btn) { btn.textContent = '❌ 保存失败'; setTimeout(() => { btn.textContent = '📸 保存截图'; }, 1500); }
        }
    }

    // End egg painting mode
    function endEggPainting() {
        eggInkPersistMode = false;
        if (inkPersistEndTimer) { clearTimeout(inkPersistEndTimer); inkPersistEndTimer = null; }
        if (eggWhiteoutTimer) { clearTimeout(eggWhiteoutTimer); eggWhiteoutTimer = null; }
        if (eggCountdownTimer) { clearInterval(eggCountdownTimer); eggCountdownTimer = null; }
        // Re-enable interactions
        document.body.classList.remove('egg-painting');
        const eggBlock = document.getElementById('egg-block');
        if (eggBlock) eggBlock.style.display = 'none';
        const eggControls = document.getElementById('egg-controls');
        if (eggControls) eggControls.style.display = 'none';
        const eggFab = document.getElementById('egg-fab');
        if (eggFab) {
            eggFab.style.display = 'none';
            // Reset FAB position to default
            eggFab.style.left = '';
            eggFab.style.top = '';
            eggFab.style.right = '20px';
            eggFab.style.bottom = 'calc(var(--tab-h,0px) + var(--safe-bottom,0px) + 20px)';
        }
        // Reset FAB panel and drag state
        _eggPanelOpen = false;
        _isDraggingEggFab = false;
        const whiteout = document.getElementById('egg-whiteout');
        if (whiteout) { whiteout.style.display = 'none'; whiteout.style.animation = ''; }
        // Clear trail canvas gradually
        const trailCanvasEl = document.getElementById('trail-canvas');
        if (trailCanvasEl && trailCtx) {
            let fadeFrames = 0;
            const fadeMax = 30;
            const fadeInk = () => {
                if (fadeFrames >= fadeMax) {
                    trailCtx.clearRect(0, 0, trailCanvasEl.width, trailCanvasEl.height);
                    return;
                }
                trailCtx.globalCompositeOperation = 'destination-out';
                trailCtx.fillStyle = 'rgba(0,0,0,0.15)';
                trailCtx.fillRect(0, 0, trailCanvasEl.width, trailCanvasEl.height);
                trailCtx.globalCompositeOperation = 'source-over';
                fadeFrames++;
                requestAnimationFrame(fadeInk);
            };
            fadeInk();
        }
    }

    // === Attach egg button event listeners (runs once on page load) ===
    function initEggControls() {
        const btnExtend = document.getElementById('egg-btn-extend');
        const btnSave = document.getElementById('egg-btn-save');
        const btnEnd = document.getElementById('egg-btn-end');
        if (btnExtend) {
            btnExtend.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); extendEggPainting(); });
            btnExtend.addEventListener('touchend', function(e) { e.preventDefault(); e.stopPropagation(); extendEggPainting(); }, { passive: false });
        }
        if (btnSave) {
            btnSave.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); saveEggScreenshot(); });
            btnSave.addEventListener('touchend', function(e) { e.preventDefault(); e.stopPropagation(); saveEggScreenshot(); }, { passive: false });
        }
        if (btnEnd) {
            btnEnd.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); endEggPainting(); });
            btnEnd.addEventListener('touchend', function(e) { e.preventDefault(); e.stopPropagation(); endEggPainting(); }, { passive: false });
        }
    }
    // Initialize egg controls after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEggControls);
    } else {
        initEggControls();
    }

    // ===== Rapid click egg trigger (Android developer mode style) =====
    // Uses pointerdown for instant response (faster than click/touchstart)
    // 7 consecutive rapid taps anywhere triggers the egg (like Android dev mode)
    const _eggClickTimestamps = [];
    const EGG_CLICK_COUNT = 7;
    const EGG_CLICK_WINDOW_MS = 2800; // 7 taps within 2.8s (avg 400ms between taps)
    const EGG_COOLDOWN_MS = 5 * 60 * 1000;

    function isEggClickTriggerEnabled() {
        return safeGetItem('eggClickTrigger', '1') !== '0';
    }

    function checkEggCooldown() {
        if (godModeActive) return false;
        const cooldownEnd = parseInt(safeGetItem('eggCooldown', '0')) || 0;
        return Date.now() < cooldownEnd;
    }

    function triggerEggByClick() {
        if (!isEggClickTriggerEnabled()) return;
        if (checkEggCooldown()) {
            monoLog('🎮 连点触发彩蛋 — 冷却中', 'info');
            return;
        }
        safeSetItem('eggCooldown', String(Date.now() + EGG_COOLDOWN_MS));
        logEvent('🎮 连点触发彩蛋！', 'god');
        triggerEggWhiteout();
    }

    function recordEggClick(timestamp) {
        if (!isEggClickTriggerEnabled()) return;
        _eggClickTimestamps.push(timestamp);
        // Keep only recent timestamps within the window
        while (_eggClickTimestamps.length > 0 && timestamp - _eggClickTimestamps[0] > EGG_CLICK_WINDOW_MS) {
            _eggClickTimestamps.shift();
        }
        // Keep max count to prevent overflow
        while (_eggClickTimestamps.length > EGG_CLICK_COUNT) _eggClickTimestamps.shift();
        if (_eggClickTimestamps.length >= EGG_CLICK_COUNT) {
            triggerEggByClick();
            _eggClickTimestamps.length = 0;
        }
    }

    // Use pointerdown for instant response (works for both mouse and touch)
    document.addEventListener('pointerdown', function(e) {
        if (!isEggClickTriggerEnabled()) return;
        // Single closest() call with combined selector for performance
        const skip = e.target.closest('#egg-fab, #avatar-img, .mono-card-item, .inventory-card, .inventory-grid, #card-inventory-area, #card-draw-area, .card-grid, .modal-overlay, .modal-content, .btn, .mono-tile-cell, .stock-row, .buff-icon, .mono-player, .mono-log, .game-card, input, select, textarea, a, button, label, .tab-btn, .toggle');
        if (skip) return;
        // Clear any text selection that might interfere with rapid clicks
        if (e.target.closest('.bunny-icon, #sidebar-avatar-container')) {
            window.getSelection().removeAllRanges();
            return; // Don't count avatar clicks toward easter egg
        }
        recordEggClick(Date.now());
    }, { passive: true });

    // Text selection on sidebar avatar is now handled by global body.no-select CSS class.
    // The previous non-passive pointerdown/mousedown/selectstart/dblclick handlers that called
    // e.preventDefault() were REMOVED because they blocked click events on rapid taps,
    // preventing handleLogoClick() and the avatar particle burst effect from firing.
    // Only keep contextmenu prevention for the avatar image (long-press on mobile)
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.bunny-icon') || e.target.closest('#sidebar-avatar-container')) {
            e.preventDefault();
        }
    });

    function triggerEggWhiteout() {
        eggInkPersistMode = true;
        eggInkPersistStart = performance.now();
        lastMouseMoveTime = performance.now();
        document.body.classList.add('egg-painting');
        const eggBlock = document.getElementById('egg-block');
        if (eggBlock) eggBlock.style.display = 'block';
        const eggFab = document.getElementById('egg-fab');
        if (eggFab) eggFab.style.display = 'flex';
        const eggPanel = document.getElementById('egg-fab-panel');
        if (eggPanel) eggPanel.style.display = 'none';
        startEggTimer(30);
        const whiteout = document.getElementById('egg-whiteout');
        if (whiteout) {
            whiteout.style.display = 'block';
            whiteout.style.opacity = '0';
            whiteout.style.animation = 'eggWhiteout 500ms ease forwards';
            void whiteout.offsetWidth;
        }
        // Whiteout persists until endEggPainting() — no auto-hide timer
        _eggPanelOpen = false; // Reset FAB panel state
        logEvent('✨ 连点触发彩蛋！华丽白屏降临！', 'god');
    }

    function toggleEggClickTrigger() {
        const enabled = safeGetItem('eggClickTrigger', '1') !== '0';
        safeSetItem('eggClickTrigger', enabled ? '0' : '1');
        const toggle = document.getElementById('egg-click-toggle');
        if (toggle) toggle.classList.toggle('on', !enabled);
    }

    // Global FAB panel state — must be accessible from endEggPainting
    let _eggPanelOpen = false;

    // FAB toggle panel and drag
    (function setupEggFab() {
        const fabBtn = document.getElementById('egg-fab-btn');
        const fabPanel = document.getElementById('egg-fab-panel');
        if (!fabBtn || !fabPanel) return;
        let isDragging = false;
        let dragStartX = 0, dragStartY = 0;
        let fabStartX = 0, fabStartY = 0;

        fabBtn.addEventListener('click', function() {
            if (!isDragging) {
                _eggPanelOpen = !_eggPanelOpen;
                fabPanel.style.display = _eggPanelOpen ? 'flex' : 'none';
                if (_eggPanelOpen) fabPanel.style.animation = 'fadeIn .2s ease';
            }
            isDragging = false;
        });

        function onStart(e) {
            const touch = e.touches ? e.touches[0] : e;
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            const fab = document.getElementById('egg-fab');
            if (fab) {
                const rect = fab.getBoundingClientRect();
                fabStartX = rect.left;
                fabStartY = rect.top;
            }
            isDragging = false;
        }

        function onMove(e) {
            if (!dragStartX) return;
            // Only allow FAB drag during egg painting mode
            if (!eggInkPersistMode) { dragStartX = 0; return; }
            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - dragStartX;
            const dy = touch.clientY - dragStartY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                isDragging = true;
                _isDraggingEggFab = true;
                trailPoints = []; // Clear trail to prevent rabbit head from following FAB
                const fab = document.getElementById('egg-fab');
                if (fab) {
                    fab.style.left = Math.max(0, Math.min(window.innerWidth - 56, fabStartX + dx)) + 'px';
                    fab.style.top = Math.max(0, Math.min(window.innerHeight - 56, fabStartY + dy)) + 'px';
                    fab.style.right = 'auto';
                    fab.style.bottom = 'auto';
                }
            }
        }

        fabBtn.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', function() {
            _isDraggingEggFab = false;
            dragStartX = 0; // Reset drag start coordinates
            dragStartY = 0;
            setTimeout(() => { isDragging = false; }, 50);
        });
        fabBtn.addEventListener('touchstart', onStart, { passive: true });
        document.addEventListener('touchmove', onMove, { passive: true });
        document.addEventListener('touchend', function() {
            _isDraggingEggFab = false;
            dragStartX = 0; // Reset drag start coordinates
            dragStartY = 0;
            setTimeout(() => { isDragging = false; }, 50);
        });
    })();

    /* ==================== Mobile Touch Bloom — Theme-Specific, Independent from PC Trail ==================== */
    // Lightweight CSS-only bloom effect at touch points, no Canvas/RAF overhead
    // Each theme gets a unique bloom emoji + color for visual identity
    let _bloomColorCache = null;
    let _bloomColorTheme = null;
    let _bloomEmojiCache = null;
    let _bloomEmojiTheme = null;

    // Theme → bloom emoji mapping (matches signature particle aesthetic)
    const MOBILE_BLOOM_EMOJI = {
        bunny:    ['🐾', '💕', '🐰'],
        forest:   ['🍂', '🌰', '🌿'],
        ocean:    ['🫧', '🐟', '🌊'],
        starlight:['✨', '🌙', '⭐'],
        cyber:    ['⚡', '🔷', '💫'],
        sunset:   ['☀️', '🔥', '🌅'],
        mint:     ['🍃', '🫧', '💧'],
        rose:     ['🦋', '🌸', '🌷'],
        aurora:   ['❄️', '💫', '🌌'],
        galaxy:   ['⭐', '🌠', '💫'],
        candy:    ['🍭', '🍬', '🌟'],
        matrix:   ['0', '1', '💚'],
    };

    function _getBloomColor() {
        const theme = document.documentElement.getAttribute('data-theme') || '';
        if (_bloomColorCache && _bloomColorTheme === theme) return _bloomColorCache;
        _bloomColorTheme = theme;
        const cs = getComputedStyle(document.documentElement);
        _bloomColorCache = (cs.getPropertyValue('--accent') || '').trim() || '#FF6B9D';
        return _bloomColorCache;
    }

    function _getBloomEmoji() {
        const theme = document.documentElement.getAttribute('data-theme') || 'bunny';
        if (_bloomEmojiCache && _bloomEmojiTheme === theme) return _bloomEmojiCache;
        _bloomEmojiTheme = theme;
        const pool = MOBILE_BLOOM_EMOJI[theme] || MOBILE_BLOOM_EMOJI.bunny;
        _bloomEmojiCache = pool;
        return pool;
    }

    function _invalidateBloomCache() { _bloomColorCache = null; _bloomColorTheme = null; _bloomEmojiCache = null; _bloomEmojiTheme = null; }

    function initMobileTouchBloom() {
        if (!_isMobile) return; // Only on touch devices
        let _lastBloomTime = 0;
        const BLOOM_THROTTLE_MS = 80; // Throttle to prevent too many blooms
        const BLOOM_SIZE = 40;

        function spawnBloom(x, y) {
            const now = performance.now();
            if (now - _lastBloomTime < BLOOM_THROTTLE_MS) return;
            _lastBloomTime = now;
            const color = _getBloomColor();
            const emojiPool = _getBloomEmoji();

            // Main bloom circle
            const bloom = document.createElement('div');
            bloom.className = 'touch-bloom';
            bloom.style.left = x + 'px';
            bloom.style.top = y + 'px';
            bloom.style.width = BLOOM_SIZE + 'px';
            bloom.style.height = BLOOM_SIZE + 'px';
            bloom.style.background = `radial-gradient(circle, ${color}40 0%, ${color}10 50%, transparent 70%)`;
            bloom.style.border = `1.5px solid ${color}60`;
            document.body.appendChild(bloom);

            // Theme-specific emoji particle (20% chance — lightweight)
            if (Math.random() < 0.2 && !_perfConfig._lowPerfMode) {
                const emoji = document.createElement('div');
                emoji.style.cssText = `position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:9999;font-size:${Math.random()*8+12}px;opacity:0;transform:translate(-50%,-50%);will-change:transform,opacity;`;
                emoji.textContent = emojiPool[Math.floor(Math.random() * emojiPool.length)];
                document.body.appendChild(emoji);
                const dx = (Math.random() - 0.5) * 60;
                const dy = -Math.random() * 40 - 10;
                requestAnimationFrame(() => {
                    emoji.style.transition = 'transform .6s ease-out, opacity .6s ease-out';
                    emoji.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.5) rotate(${(Math.random()-.5)*360}deg)`;
                    emoji.style.opacity = '0';
                });
                setTimeout(() => { if (emoji.parentNode) emoji.parentNode.removeChild(emoji); }, 700);
            }

            // Auto-remove bloom after animation
            setTimeout(() => { if (bloom.parentNode) bloom.parentNode.removeChild(bloom); }, 650);
        }

        // Listen to touchstart for bloom at touch point
        document.addEventListener('touchstart', (e) => {
            if (!e.touches[0]) return;
            // Don't spawn bloom on FAB or egg controls
            const t = e.target;
            if (t.closest('#egg-fab') || t.closest('#egg-whiteout') || t.closest('.egg-painting')) return;
            spawnBloom(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        // Also bloom on pointerdown for hybrid devices
        document.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'touch') return;
            if (e.target.closest('#egg-fab') || e.target.closest('#egg-whiteout')) return;
            spawnBloom(e.clientX, e.clientY);
        }, { passive: true });
    }

    /* ==================== Mobile Player Move Animation Trigger ==================== */
    // Called after renderMonopoly to add one-shot bounce on the current player's dot
    function _triggerMobilePlayerMoveAnim(playerIdx) {
        if (!_isMobile || _perfConfig._lowPerfMode) return;
        const dot = document.querySelector(`.mono-ring-dot[data-player="${playerIdx}"]`);
        if (!dot) return;
        dot.classList.remove('player-moved');
        // Force reflow to restart animation
        void dot.offsetWidth;
        dot.classList.add('player-moved');
        setTimeout(() => dot.classList.remove('player-moved'), 600);
    }

    /* ==================== Mobile Dice Roll Animation Trigger ==================== */
    function _triggerMobileDiceAnim() {
        if (!_isMobile || _perfConfig._lowPerfMode) return;
        const diceEl = document.querySelector('.mono-dice-num');
        if (!diceEl) return;
        diceEl.classList.remove('rolling');
        void diceEl.offsetWidth;
        diceEl.classList.add('rolling');
        setTimeout(() => diceEl.classList.remove('rolling'), 500);
    }

    /* ==================== Mouse Trail — Gorgeous Edition (v5.2华丽版 + v6.0像素兔子) ==================== */
    // Combines the smooth-curve + particle-system algorithm from v5.2
    // with the 8-theme system and pixel rabbit head from v6.0
    