let _renderRAFId = null;
    let _renderPending = false;
    // Dirty flags — skip sub-renderers when their data hasn't changed
    let _dirtyFlags = { players: true, map: true, ring: true, dice: true, cards: true, inventory: true, log: true, stats: true, stock: true, overview: true, buff: true, news: true };
    // Measured actual tile width for accurate overview bar sync (updated after each map render)
    let _actualTileWidth = 72;
    function markDirty(flags) { if (typeof flags === 'string') flags = [flags]; if (Array.isArray(flags)) flags.forEach(f => { if (f in _dirtyFlags) _dirtyFlags[f] = true; }); }
    // Pre-computed lookup sets for O(1) buff classification
    const POSITIVE_BUFF_FIELDS = new Set(['shield','lucky','mirror','doubleDice','speed','rentDouble','interestFree','taxFree','hologramTurns']);
    // Cached ring tile type colors — avoid recreating object per render
    const RING_TYPE_COLORS = {start:'#FFD700', property:'#FF6B9D', bank:'#4CAF50', stock:'#2196F3', bonus:'#34D399', penalty:'#F87171', card:'#A78BFA', teleport:'#00BCD4', shortcut:'#FF9800', jail:'#9E9E9E', hospital:'#E91E63', casino:'#FF6B35'};
    // === ACT-style Buff Bar — shows active card effects for all players ===
    const BUFF_DEFS = [
        { field:'shield', type:'num', icon:'🛡️', name:'护盾' },
        { field:'lucky', type:'num', icon:'🍀', name:'幸运' },
        { field:'mirror', type:'num', icon:'🪞', name:'镜像' },
        { field:'doubleDice', type:'num', icon:'🎲', name:'双倍骰' },
        { field:'speed', type:'num', icon:'🚀', name:'加速' },
        { field:'jailTurns', type:'num_gt0', icon:'⛓️', name:'监禁' },
        { field:'banned', type:'num_gt0', icon:'🚫', name:'封印' },
        { field:'hospital', type:'num_gt0', icon:'🏥', name:'医院' },
        { field:'rentDouble', type:'num_gt0', icon:'🏘️', name:'收租令' },
        { field:'interestFree', type:'num_gt0', icon:'💳', name:'免息' },
        { field:'confused', type:'num_gt0', icon:'😵', name:'混乱' },
        { field:'taxFree', type:'num_gt0', icon:'🧾', name:'免税' },
        // Hacker/item race effects
        { field:'blackoutTurns', type:'num_gt0', icon:'⚡', name:'停电' },
        { field:'empTurns', type:'num_gt0', icon:'💥', name:'EMP' },
        { field:'hologramTurns', type:'num_gt0', icon:'🎭', name:'伪装' },
        { field:'signalJamTurns', type:'num_gt0', icon:'📡', name:'干扰' },
        { field:'slipTurns', type:'num_gt0', icon:'🍌', name:'香蕉皮' },
        { field:'firewallTurns', type:'num_gt0', icon:'🧱', name:'防火墙' },
        { field:'virusTurns', type:'num_gt0', icon:'🦠', name:'病毒' },
        { field:'cloneActive', type:'bool', icon:'👤', name:'分身' },
        { field:'quantumTurns', type:'num_gt0', icon:'⚛️', name:'量子' },
        { field:'overclockNext', type:'bool', icon:'🔧', name:'超频' },
        { field:'lockdownTurns', type:'num_gt0', icon:'🌐', name:'封锁' },
    ];
    // Debuff fields that should be shown for ALL players (not just current)
    const DEBUFF_FIELDS = ['jailTurns','banned','hospital','confused'];

    function getPlayerBuffs(p) {
        const buffs = [];
        // Vehicle bonus
        if (p.vehicle) {
            const vdef = VEHICLE_POOL.find(v => v.id === p.vehicle.id);
            if (vdef && vdef.bonus) {
                const b = vdef.bonus;
                let vIcon = vdef.ic, vLabel = vdef.nm;
                if (b.type === 'speed') { vLabel = `移动+${b.val}`; }
                else if (b.type === 'rentDiscount') { vLabel = `租金-${Math.round(b.val*100)}%`; }
                else if (b.type === 'rentImmune') { vLabel = `${Math.round(b.val*100)}%免租`; }
                else if (b.type === 'allInOne') { vLabel = `全能+${b.val}`; }
                buffs.push({ icon: vdef.ic, name: `${vdef.nm} (${vLabel})`, badge: null, isVehicle: true });
            }
        }
        // Vehicle discount buff
        if (p.vehicleDiscount && p.vehicleDiscount > 0) {
            buffs.push({ icon: '🏷️', name: `载具折扣 💰${p.vehicleDiscount}（${p.vehicleDiscountTurns || 0}回合）`, badge: p.vehicleDiscountTurns || null, isVehicle: true });
        }
        // Card effect buffs
        for (const def of BUFF_DEFS) {
            const val = p[def.field];
            if (def.type === 'bool' && val) {
                buffs.push({ icon: def.icon, name: def.name, badge: null });
            } else if (def.type === 'num' && val && val > 0) {
                buffs.push({ icon: def.icon, name: def.name, badge: val });
            } else if (def.type === 'num_gt0' && val && val > 0) {
                buffs.push({ icon: def.icon, name: def.name, badge: val });
            }
        }
        return buffs;
    }

    function renderBuffBar() {
        const bar = document.getElementById('buff-bar');
        if (!bar || !mono || !mono.players || !mono.players[0]) return;
        const humanP = mono.players[0];
        const parts = [];
        // 1. Human player's own buffs (green border)
        const humanBuffs = getPlayerBuffs(humanP);
        if (humanBuffs.length > 0) {
            parts.push(humanBuffs.map(b =>
                `<div class="buff-icon ${b.isVehicle ? 'buff-vehicle' : ''}" title="${b.nm}">${b.icon}${b.badge !== null ? `<span class="buff-badge">${b.badge}</span>` : ''}</div>`
            ).join(''));
        }
        // 2. Other players' buffs and debuffs — show ALL active effects for AI players
        for (let i = 1; i < mono.players.length; i++) {
            const ap = mono.players[i];
            if (!ap || ap.bankrupt) continue;
            const otherEffects = [];
            for (const def of BUFF_DEFS) {
                const val = ap[def.field];
                if (def.type === 'num' && val && val > 0) {
                    otherEffects.push({ icon: def.icon, name: `${ap.nm}: ${def.name}`, badge: val, playerIcon: ap.ic, isDebuff: !POSITIVE_BUFF_FIELDS.has(def.field) });
                } else if (def.type === 'num_gt0' && val && val > 0) {
                    otherEffects.push({ icon: def.icon, name: `${ap.nm}: ${def.name}`, badge: val, playerIcon: ap.ic, isDebuff: true });
                }
            }
            if (otherEffects.length > 0) {
                parts.push(otherEffects.map(b =>
                    `<div class="buff-icon ${b.isDebuff ? 'buff-debuff' : 'buff-vehicle'}" title="${b.name}">${b.playerIcon}<span class="buff-badge ${b.isDebuff ? 'buff-badge-debuff' : ''}">${b.badge}</span></div>`
                ).join(''));
            }
        }
        if (parts.length === 0) {
            bar.innerHTML = '';
            bar.style.minHeight = '0';
        } else {
            bar.style.minHeight = '28px';
            bar.innerHTML = parts.join('');
        }
    }

    function renderMonopoly() {
        markDirtyAll();
        if (_renderRAFId) return; // Already scheduled — coalesce
        _renderPending = true;
        _renderRAFId = requestAnimationFrame(() => {
            _renderRAFId = null;
            if (!_renderPending) return;
            _renderPending = false;
            _doRenderMonopoly();
        });
    }
    function markDirtyAll() { for (const k in _dirtyFlags) _dirtyFlags[k] = true; }
    // Lightweight partial render — only update dirty sub-components
    function renderMonopolyPartial(flags) {
        markDirty(flags);
        if (_renderRAFId) return; // Already scheduled — coalesce
        _renderPending = true;
        _renderRAFId = requestAnimationFrame(() => {
            _renderRAFId = null;
            if (!_renderPending) return;
            _renderPending = false;
            _doRenderMonopoly();
        });
    }
    function _doRenderMonopoly() {
        _perfMonitor.beginRender();
        if (!mono) { initMonopoly(); }
        const eraBar = document.getElementById('mono-era-badge');
        const eraRegion = document.getElementById('mono-era-region');
        const eraProgress = document.getElementById('mono-era-progress');
        const advanceBtn = document.getElementById('mono-advance-btn');
        const stockEl = document.getElementById('mono-stock');

        // Era system removed: hide era UI, show all regions as open
        if (eraBar) eraBar.textContent = '全岛开放';
        if (eraRegion) eraRegion.textContent = '兔可可王国';
        if (stockEl) {
            stockEl.textContent = mono.stockMarket.toFixed(0);
            stockEl.style.color = mono.stockMarket >= 100 ? 'var(--good)' : 'var(--bad)';
        }

        // Era progress bar: always full (all regions unlocked)
        if (eraProgress) eraProgress.style.width = '100%';
        if (advanceBtn) advanceBtn.style.display = 'none';

        // Update real-time system display
        const ts = getTimeSystemState();
        const timePhaseEl = document.getElementById('mono-time-phase');
        const timeWeatherEl = document.getElementById('mono-time-weather');
        if (timePhaseEl) {
            timePhaseEl.textContent = `${ts.phaseIcon} ${ts.phase} ${String(ts.hour).padStart(2,'0')}:${String(ts.minute).padStart(2,'0')} ${ts.isWeekend ? '🗓️ 周末' : '🗓️ 工作日'}`;
        }
        if (timeWeatherEl) {
            const vol = Math.round(ts.stockVolatilityMult * 100);
            const evChance = Math.round(ts.eventChanceMult * 100);
            timeWeatherEl.textContent = `📊 波动${vol}% · 🎲 事件${evChance}% · 🦢${(ts.blackSwanBonus*100).toFixed(0)}%`;
        }

        // Update news ticker
        if (_dirtyFlags.news) { renderNewsTicker(); _dirtyFlags.news = false; }

        if (_dirtyFlags.players) { renderMonoPlayers(); _dirtyFlags.players = false; }
        if (_dirtyFlags.ring) { renderMonoRing(); _dirtyFlags.ring = false; }
        if (_dirtyFlags.map) { renderMonoMap(); _dirtyFlags.map = false; }
        renderMonoDice(); // lightweight, always render
        if (_dirtyFlags.cards) { renderMonoCards(); _dirtyFlags.cards = false; }
        if (_dirtyFlags.inventory) { renderMonoInventory(); _dirtyFlags.inventory = false; }
        if (_dirtyFlags.log) { renderMonoLog(); _dirtyFlags.log = false; }
        if (_dirtyFlags.stats) { renderMonoStats(); _dirtyFlags.stats = false; }
        if (_dirtyFlags.stock) { renderStockPortfolio(); _dirtyFlags.stock = false; }
        if (_dirtyFlags.overview) { renderMonoOverview(); _dirtyFlags.overview = false; }
        if (_dirtyFlags.buff) { renderBuffBar(); _dirtyFlags.buff = false; }
        // Clear any stale player card tooltip after re-render (DOM elements replaced, mouseleave lost)
        hidePlayerCardTooltip();
    }

    function renderMonoPlayers() {
        const el = document.getElementById('mono-players');
        if (!el) return;
        const gameOver = mono.players.filter(p => !p.bankrupt).length <= 1;
        el.innerHTML = mono.players.map((p, i) => {
            const active = i === mono.currentPlayer && !gameOver;
            const personalityNm = p.isHuman ? '玩家' : (AI_PERSONALITIES[p.personality]?.nm || 'AI');
            const statusIcons = [];
            if (p.shield > 0) statusIcons.push(`🛡️${p.shield>1?p.shield:''}`);
            if (p.lucky > 0) statusIcons.push(`🍀${p.lucky>1?p.lucky:''}`);
            if (p.speed) statusIcons.push(`🚀${p.speed}`);
            if (p.jailTurns > 0) statusIcons.push('🔒');
            if (p.taxFree > 0) statusIcons.push('🧾');
            if (p.vehicle) statusIcons.push(p.vehicle.ic);
            const cardCount = p.cards.length;
            return `<div class="mono-player ${active?'active':''}" ${p.bankrupt?'style="opacity:.4;"':''} onclick="locatePlayer(${i})" onmouseenter="showPlayerCardTooltip(${i}, event)" onmouseleave="hidePlayerCardTooltip()" title="点击定位 | 悬停查看手牌">
                <div class="mp-ic">${p.ic}</div>
                <div class="mp-name">${p.nm}</div>
                <div class="mp-money">💰${p.money}</div>
                <div class="mp-status">${statusIcons.join('')}${cardCount > 0 ? ` 🃏${cardCount}` : ''}</div>
                <div class="mp-personality">${personalityNm}</div>
            </div>`;
        }).join('');
    }

    /* Player card hover tooltip */
    function showPlayerCardTooltip(playerIdx, event) {
        const p = mono.players[playerIdx];
        if (!p || p.bankrupt) return;
        hidePlayerCardTooltip(); // Remove any existing tooltip
        _scheduleTooltipAutoDismiss(); // Safety: auto-dismiss after 8s
        const tooltip = document.createElement('div');
        tooltip.id = 'player-card-tooltip';
        tooltip.style.cssText = 'position:fixed;z-index:10000;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:.6rem;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:280px;max-height:320px;overflow-y:auto;font-size:.75rem;pointer-events:none;';

        let cardsHtml = '';
        if (p.cards.length === 0) {
            cardsHtml = '<div style="color:var(--text2);text-align:center;padding:.5rem;">无手牌</div>';
        } else {
            cardsHtml = p.cards.map(c => {
                const rarityColor = RARITY_COLORS[c.rarity] || 'var(--text)';
                return `<div style="display:flex;align-items:center;gap:.3rem;padding:.25rem;border-left:3px solid ${rarityColor};background:var(--card2);border-radius:4px;margin-bottom:.2rem;">
                    <span style="font-size:1rem;">${c.ic}</span>
                    <div style="flex:1;">
                        <div style="font-weight:700;color:${rarityColor};font-size:.7rem;">${c.n}</div>
                        <div style="font-size:.6rem;color:var(--text2);">${c.desc || ''}</div>
                    </div>
                </div>`;
            }).join('');
        }

        const personalityNm = p.isHuman ? '玩家' : (AI_PERSONALITIES[p.personality]?.nm || 'AI');
        tooltip.innerHTML = `
            <div style="font-weight:800;margin-bottom:.3rem;border-bottom:1px solid var(--border);padding-bottom:.3rem;">
                ${p.ic} ${p.nm} <span style="font-size:.65rem;color:var(--text2);">(${personalityNm})</span>
            </div>
            <div style="font-size:.65rem;color:var(--text2);margin-bottom:.3rem;">💰 ${p.money} | 🃏 ${p.cards.length}张手牌${p.vehicle ? ` | ${p.vehicle.ic} ${p.vehicle.nm}` : ''}</div>
            <div>${cardsHtml}</div>
        `;
        document.body.appendChild(tooltip);

        // Position tooltip near cursor
        const rect = tooltip.getBoundingClientRect();
        let x = event.clientX + 12;
        let y = event.clientY + 12;
        if (x + rect.width > window.innerWidth) x = event.clientX - rect.width - 12;
        if (y + rect.height > window.innerHeight) y = event.clientY - rect.height - 12;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    function hidePlayerCardTooltip() {
        const tooltip = document.getElementById('player-card-tooltip');
        if (tooltip) tooltip.remove();
    }

    // Global safety: dismiss tooltip on any click outside player cards
    document.addEventListener('click', function(e) {
        const tooltip = document.getElementById('player-card-tooltip');
        if (!tooltip) return;
        // If click is not on a player card, remove tooltip
        const playerCard = e.target.closest('.mono-player');
        if (!playerCard) hidePlayerCardTooltip();
    }, true);

    // Safety timeout: auto-dismiss tooltip after 8 seconds if it somehow persists
    let _tooltipSafetyTimer = null;
    function _scheduleTooltipAutoDismiss() {
        if (_tooltipSafetyTimer) clearTimeout(_tooltipSafetyTimer);
        _tooltipSafetyTimer = setTimeout(function() {
            hidePlayerCardTooltip();
        }, 8000);
    }

    function locatePlayer(idx) {
        const p = mono.players[idx];
        if (!p || p.bankrupt) return;

        // 1. Scroll horizontal map to player position
        const strip = document.getElementById('mono-map-strip');
        const scroll = document.getElementById('mono-map-scroll');
        if (strip && scroll) {
            let targetTile = null;
            let tileCount = 0;
            for (const child of strip.children) {
                if (child.classList.contains('mono-tile-cell')) {
                    if (tileCount === p.pos) { targetTile = child; break; }
                    tileCount++;
                }
            }
            if (targetTile) {
                const scrollLeft = targetTile.offsetLeft - scroll.offsetWidth / 2 + targetTile.offsetWidth / 2;
                scroll.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
                targetTile.classList.add('highlighted');
                setTimeout(() => targetTile.classList.remove('highlighted'), 2500);
            }
        }

        // 2. Pulse player dot on ring minimap
        const ring = document.getElementById('mono-map-ring');
        if (ring) {
            const dots = ring.querySelectorAll('.mono-ring-dot');
            let visibleIdx = 0;
            mono.players.forEach((pl, pi) => {
                if (pl.bankrupt) return;
                if (pi === idx) {
                    const dot = dots[visibleIdx];
                    if (dot) {
                        dot.style.transition = 'transform 0.3s ease';
                        dot.style.transform = 'translate(-50%,-50%) scale(1.5)';
                        setTimeout(() => { if (dot) dot.style.transform = 'translate(-50%,-50%) scale(1)'; }, 300);
                        setTimeout(() => { if (dot) dot.style.transform = 'translate(-50%,-50%) scale(1.5)'; }, 600);
                        setTimeout(() => { if (dot) dot.style.transform = 'translate(-50%,-50%) scale(1)'; }, 900);
                    }
                }
                visibleIdx++;
            });
        }

        // 3. If fullscreen map is open, redraw
        const fsOverlay = document.getElementById('fs-map-overlay');
        if (fsOverlay && fsOverlay.style.display !== 'none') {
            renderFsMap();
        }

        // 4. Show player info tooltip
        showPlayerInfoTooltip(idx);

        monoLog(`📍 定位到 ${p.ic} ${p.nm} 所在位置`, 'info');
    }

    function showPlayerInfoTooltip(idx) {
        const p = mono.players[idx];
        if (!p) return;
        const existing = document.getElementById('player-locate-tooltip');
        if (existing) existing.remove();

        const tooltip = document.createElement('div');
        tooltip.id = 'player-locate-tooltip';
        tooltip.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);z-index:800;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem 1.5rem;box-shadow:0 8px 32px rgba(0,0,0,.3);text-align:center;animation:fadeIn .3s ease;max-width:300px;';

        const personalityNm = p.isHuman ? '玩家' : (AI_PERSONALITIES[p.personality]?.nm || 'AI');
        const statusIcons = [];
        if (p.shield > 0) statusIcons.push(`🛡️${p.shield>1?p.shield:''}`);
        if (p.lucky > 0) statusIcons.push(`🍀${p.lucky>1?p.lucky:''}`);
        if (p.jailTurns > 0) statusIcons.push('🔒');
        if (p.vehicle) statusIcons.push(p.vehicle.ic);

        tooltip.innerHTML = `
            <div style="font-size:2rem;margin-bottom:.3rem;">${p.ic}</div>
            <div style="font-weight:800;font-size:1rem;color:${p.color};">${p.nm}</div>
            <div style="font-size:.7rem;color:var(--text2);margin-bottom:.3rem;">${personalityNm} | 第${positionToRegion(p.pos)}区</div>
            <div style="font-size:.85rem;font-weight:700;">💰 ${p.money}</div>
            <div style="font-size:.7rem;color:var(--text2);margin-top:.2rem;">📍 位置 ${p.pos} ${statusIcons.join(' ')}</div>
        `;
        document.body.appendChild(tooltip);

        setTimeout(() => {
            tooltip.style.transition = 'opacity .3s ease';
            tooltip.style.opacity = '0';
            setTimeout(() => tooltip.remove(), 300);
        }, 1500);
    }

    function renderMonoRing() {
        const ring = document.getElementById('mono-map-ring');
        if (!ring) return;
        const total = mono.tiles.length;
        if (total === 0) return;
        const center = ring.querySelector('.mono-map-ring-inner');
        const rect = ring.getBoundingClientRect();
        // Skip rendering if ring not visible (e.g., different tab active)
        if (rect.width < 10 || rect.height < 10) return;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const radius = Math.min(cx, cy) - 10;

        // Use a single canvas for tile dots instead of 1248+ DOM elements
        let ringCanvas = ring.querySelector('#mono-ring-canvas');
        if (!ringCanvas) {
            ringCanvas = document.createElement('canvas');
            ringCanvas.id = 'mono-ring-canvas';
            ringCanvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
            ring.insertBefore(ringCanvas, ring.firstChild);
        }
        const dpr = window.devicePixelRatio || 1;
        ringCanvas.width = rect.width * dpr;
        ringCanvas.height = rect.height * dpr;
        ringCanvas.style.width = rect.width + 'px';
        ringCanvas.style.height = rect.height + 'px';
        const ctx = ringCanvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw all tile positions as small dots on canvas
        for (let i = 0; i < total; i++) {
            const tile = mono.tiles[i];
            if (!tile) continue;
            const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            const color = RING_TYPE_COLORS[tile.type] || '#888';
            if (tile.type === 'shortcut') {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
                ctx.fill();
            } else {
                ctx.fillStyle = color + '4D'; // 30% opacity
                ctx.fillRect(x - 1, y - 1, 2, 2);
            }
        }

        // Draw shortcut arcs on canvas — scan actual shortcut tiles instead of hardcoded positions
        var shortcutPositions = [];
        for (var sc = 0; sc < total; sc++) {
            if (mono.tiles[sc] && mono.tiles[sc].type === 'shortcut') shortcutPositions.push(sc);
        }
        ctx.strokeStyle = 'rgba(255,152,0,.3)';
        ctx.setLineDash([3, 3]);
        for (var si = 0; si < shortcutPositions.length; si++) {
            var spos = shortcutPositions[si];
            var stile = mono.tiles[spos];
            if (!stile || stile.type !== 'shortcut') continue;
            var target = stile.shortcutTarget || ((spos + 50) % total);
            var startAngle = (spos / total) * 2 * Math.PI - Math.PI / 2;
            var endAngle = (target / total) * 2 * Math.PI - Math.PI / 2;
            var x1 = cx + radius * Math.cos(startAngle);
            var y1 = cy + radius * Math.sin(startAngle);
            var x2 = cx + radius * Math.cos(endAngle);
            var y2 = cy + radius * Math.sin(endAngle);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Draw region boundary markers on canvas — use actual tile region transitions
        let prevRegion = -1;
        for (let i = 0; i < total; i++) {
            const tile = mono.tiles[i];
            if (!tile) continue;
            if (tile.region !== prevRegion) {
                prevRegion = tile.region;
                const region = MONO_REGIONS[tile.region] || { color: '#999' };
                const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);
                ctx.fillStyle = region.color;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        // Draw player dots — use DOM for interactivity (only ~8 elements)
        ring.querySelectorAll('.mono-ring-dot').forEach(d => d.remove());
        mono.players.forEach((p, i) => {
            if (p.bankrupt) return;
            const angle = (p.pos / total) * 2 * Math.PI - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            const dot = document.createElement('div');
            dot.className = 'mono-ring-dot' + (i === mono.currentPlayer ? ' current' : '');
            dot.setAttribute('data-player', i);
            dot.style.background = p.color;
            dot.style.color = p.color;
            dot.style.left = x + 'px';
            dot.style.top = y + 'px';
            dot.title = `${p.ic} ${p.nm} | 位置:${p.pos} | 💰${p.money}`;
            dot.onclick = () => locatePlayer(i);
            ring.appendChild(dot);
        });

        // Update center text
        if (center) {
            const cp = mono.players[mono.currentPlayer];
            if (cp) {
                center.innerHTML = `<div style="font-size:.65rem;"><div style="font-size:1.2rem;">${cp.ic}</div><div>${cp.nm}</div><div style="color:var(--accent);">💰${cp.money}</div><div style="font-size:.55rem;color:var(--text2);">第${positionToRegion(cp.pos)}区</div></div>`;
            }
        }
    }

    function renderMonoOverview() {
        var canvas = document.getElementById('mono-overview-canvas');
        if (!canvas || !mono || !mono.tiles) return;
        var rect = canvas.getBoundingClientRect();
        if (rect.width < 10) return;
        var dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);
        var total = mono.tiles.length;
        var tileW = rect.width / total;
        var typeColors = {start:'#FFD700', property:'#FF6B9D', bank:'#4CAF50', stock:'#2196F3', bonus:'#34D399', penalty:'#F87171', card:'#A78BFA', teleport:'#00BCD4', shortcut:'#FF9800', jail:'#9E9E9E', hospital:'#E91E63', casino:'#FF6B35'};
        for (var i = 0; i < total; i++) {
            var tile = mono.tiles[i];
            if (!tile) continue;
            ctx.fillStyle = typeColors[tile.type] || '#888';
            ctx.fillRect(i * tileW, 0, Math.max(1, tileW), rect.height);
        }
        var shortcutPositions = [];
        for (var sc2 = 0; sc2 < 6; sc2++) { shortcutPositions.push(Math.floor((sc2 + 0.5) * total / 6)); }
        for (var pi = 0; pi < shortcutPositions.length; pi++) {
            if (shortcutPositions[pi] < total) {
                ctx.fillStyle = '#FF9800';
                ctx.fillRect(shortcutPositions[pi] * tileW + tileW/2 - 1, 0, 3, rect.height);
            }
        }
        mono.players.forEach(function(p) {
            if (p.bankrupt) return;
            // Center marker on the tile, not left edge
            var markerX = p.pos * tileW + tileW / 2;
            ctx.fillStyle = p.color;
            ctx.fillRect(markerX - 1, 0, 3, rect.height);
            // Add a small dot at top for visibility
            ctx.beginPath();
            ctx.arc(markerX, rect.height / 2, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
        updateOverviewViewport();
    }

    function updateOverviewViewport() {
        var scroll = document.getElementById('mono-map-scroll');
        var viewport = document.getElementById('mono-overview-viewport');
        var bar = document.getElementById('mono-overview-bar');
        if (!scroll || !viewport || !bar || !mono || !mono.tiles) return;
        // Use actual tile width for consistent proportional mapping
        // This avoids mismatch when virtual scroll spacers don't perfectly match actual tile widths
        var total = mono.tiles.length;
        var tw = _actualTileWidth || 72;
        var totalContentWidth = total * tw;
        var visibleWidth = scroll.offsetWidth;
        var maxScroll = totalContentWidth - visibleWidth;
        if (maxScroll <= 0) {
            viewport.style.left = '0%';
            viewport.style.width = '100%';
            return;
        }
        // Clamp scrollLeft to valid range (virtual scroll may cause slight overshoot)
        var sLeft = Math.max(0, Math.min(scroll.scrollLeft, maxScroll));
        // Viewport position = left edge of visible area as fraction of total
        var leftPct = sLeft / totalContentWidth;
        var viewPct = visibleWidth / totalContentWidth;
        viewport.style.left = (leftPct * 100) + '%';
        viewport.style.width = (viewPct * 100) + '%';
    }

    function initOverviewBar() {
        var bar = document.getElementById('mono-overview-bar');
        var scroll = document.getElementById('mono-map-scroll');
        if (!bar || !scroll) return;
        bar.addEventListener('click', function(e) {
            var rect = bar.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var pct = x / rect.width;
            // Use actual tile width for consistent scroll target calculation
            var total = (mono && mono.tiles) ? mono.tiles.length : 156;
            var tw = _actualTileWidth || 72;
            var totalContentWidth = total * tw;
            var targetScroll = pct * totalContentWidth - scroll.offsetWidth / 2;
            scroll.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
        });
        // Update viewport on scroll with throttle
        var _scrollRAF = null;
        scroll.addEventListener('scroll', function() {
            if (_scrollRAF) return;
            _scrollRAF = requestAnimationFrame(function() {
                updateOverviewViewport();
                _scrollRAF = null;
            });
        });
    }
    document.addEventListener('DOMContentLoaded', initOverviewBar);

    // ===== Fullscreen Map =====
    var _fsMapState = { scale: 1, offsetX: 0, offsetY: 0 };

    function openFsMap() {
        // Close modal first to prevent overlap
        closeModal();
        var overlay = document.getElementById('fs-map-overlay');
        if (!overlay) return;
        overlay.style.display = 'block';
        _fsMapState.scale = 1;
        _fsMapState.offsetX = 0;
        _fsMapState.offsetY = 0;
        renderFsMap();
    }

    function closeFsMap() {
        var overlay = document.getElementById('fs-map-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    function renderFsMap() {
        var canvas = document.getElementById('fs-map-canvas');
        if (!canvas || !mono || !mono.tiles) return;
        var overlay = document.getElementById('fs-map-overlay');
        if (overlay.style.display === 'none') return;
        var dpr = window.devicePixelRatio || 1;
        var w = window.innerWidth;
        var h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2 + _fsMapState.offsetX, h / 2 + _fsMapState.offsetY);
        ctx.scale(_fsMapState.scale, _fsMapState.scale);
        var total = mono.tiles.length;
        var radius = Math.min(w, h) / 2 - 40;
        var typeColors = {start:'#FFD700', property:'#FF6B9D', bank:'#4CAF50', stock:'#2196F3', bonus:'#34D399', penalty:'#F87171', card:'#A78BFA', teleport:'#00BCD4', shortcut:'#FF9800', jail:'#9E9E9E', hospital:'#E91E63', casino:'#FF6B35'};
        for (var i = 0; i < total; i++) {
            var tile = mono.tiles[i];
            if (!tile) continue;
            var angle = (i / total) * 2 * Math.PI - Math.PI / 2;
            var x = radius * Math.cos(angle);
            var y = radius * Math.sin(angle);
            ctx.fillStyle = typeColors[tile.type] || '#888';
            ctx.beginPath();
            ctx.arc(x, y, tile.type === 'shortcut' ? 4 : 2, 0, 2 * Math.PI);
            ctx.fill();
        }
        // Region labels
        var tileAcc = 0;
        for (var r = 0; r < MONO_REGIONS.length; r++) {
            var region = MONO_REGIONS[r];
            tileAcc += region.tileCount;
            var midTile = tileAcc - region.tileCount / 2;
            var midAngle = (midTile / total) * 2 * Math.PI - Math.PI / 2;
            var lx = (radius + 20) * Math.cos(midAngle);
            var ly = (radius + 20) * Math.sin(midAngle);
            ctx.fillStyle = region.color;
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(region.name, lx, ly);
        }
        // Shortcut arcs
        var shortcutPositions = [];
        for (var sc3 = 0; sc3 < 6; sc3++) { shortcutPositions.push(Math.floor((sc3 + 0.5) * total / 6)); }
        for (var si2 = 0; si2 < shortcutPositions.length; si2++) {
            var spos2 = shortcutPositions[si2];
            if (spos2 >= total) continue;
            var stile2 = mono.tiles[spos2];
            if (!stile2 || stile2.type !== 'shortcut') continue;
            var target2 = stile2.shortcutTarget || ((spos2 + 50) % total);
            var sAngle = (spos2 / total) * 2 * Math.PI - Math.PI / 2;
            var eAngle = (target2 / total) * 2 * Math.PI - Math.PI / 2;
            ctx.strokeStyle = 'rgba(255,152,0,.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, radius, sAngle, eAngle, target2 < spos2);
            ctx.stroke();
            ctx.setLineDash([]);
            var tx = radius * Math.cos(eAngle);
            var ty = radius * Math.sin(eAngle);
            ctx.fillStyle = '#FF9800';
            ctx.beginPath();
            ctx.arc(tx, ty, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
        // Players
        mono.players.forEach(function(p, i) {
            if (p.bankrupt) return;
            var pAngle = (p.pos / total) * 2 * Math.PI - Math.PI / 2;
            var px = radius * Math.cos(pAngle);
            var py = radius * Math.sin(pAngle);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, i === mono.currentPlayer ? 8 : 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.ic, px, py);
        });
        ctx.restore();
        var info = document.getElementById('fs-map-info');
        if (info) {
            var cp = mono.players[mono.currentPlayer];
            info.textContent = '🗺️ 全景地图 | ' + (cp ? cp.ic + ' ' + cp.nm : '') + ' 回合 ' + mono.turn + ' | 缩放: ' + _fsMapState.scale.toFixed(1) + 'x';
        }
    }

    // Pan and zoom
    (function initFsMapInteraction() {
        var canvas = document.getElementById('fs-map-canvas');
        if (!canvas) return;
        var isDragging = false;
        var lastX = 0, lastY = 0;
        canvas.addEventListener('mousedown', function(e) {
            isDragging = true; lastX = e.clientX; lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            _fsMapState.offsetX += e.clientX - lastX;
            _fsMapState.offsetY += e.clientY - lastY;
            lastX = e.clientX; lastY = e.clientY;
            renderFsMap();
        });
        document.addEventListener('mouseup', function() {
            isDragging = false; canvas.style.cursor = 'grab';
        });
        canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            var delta = e.deltaY > 0 ? 0.9 : 1.1;
            _fsMapState.scale = Math.max(0.5, Math.min(5, _fsMapState.scale * delta));
            renderFsMap();
        });
        var lastTouchDist = 0;
        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                isDragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                var dx = e.touches[0].clientX - e.touches[1].clientX;
                var dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: true });
        canvas.addEventListener('touchmove', function(e) {
            if (e.touches.length === 1 && isDragging) {
                _fsMapState.offsetX += e.touches[0].clientX - lastX;
                _fsMapState.offsetY += e.touches[0].clientY - lastY;
                lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
                renderFsMap();
            } else if (e.touches.length === 2) {
                var dx2 = e.touches[0].clientX - e.touches[1].clientX;
                var dy2 = e.touches[0].clientY - e.touches[1].clientY;
                var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                if (lastTouchDist > 0) {
                    var scale = dist / lastTouchDist;
                    _fsMapState.scale = Math.max(0.5, Math.min(5, _fsMapState.scale * scale));
                    renderFsMap();
                }
                lastTouchDist = dist;
            }
        }, { passive: true });
        canvas.addEventListener('touchend', function() {
            isDragging = false; lastTouchDist = 0;
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeFsMap();
        });
    })();

    function positionToRegion(pos) {
        let acc = 0;
        for (let r = 0; r < MONO_REGIONS.length; r++) {
            acc += MONO_REGIONS[r].tileCount;
            if (pos < acc) return r + 1;
        }
        return MONO_REGIONS.length;
    }

    function renderMonoMap() {
        const el = document.getElementById('mono-map-strip');
        if (!el) return;
        const unlockedCount = getUnlockedTileCount();
        const total = mono.tiles.length;
        const cp = mono.players[mono.currentPlayer];
        const currentPos = cp ? cp.pos : 0;

        // Virtual scrolling: only render tiles near the current player position ± visible window
        // This dramatically reduces DOM nodes for large maps (156/312 tiles)
        var TILE_WIDTH = 72; // approx width including gap, will be measured after render
        const scroll = document.getElementById('mono-map-scroll');
        const visibleWidth = (scroll ? scroll.offsetWidth : 800);
        const visibleCount = Math.ceil(visibleWidth / TILE_WIDTH) + 8; // buffer on both sides
        const startIdx = Math.max(0, currentPos - Math.floor(visibleCount / 2));
        const endIdx = Math.min(total, startIdx + visibleCount + 10);

        let h = '';
        // Placeholder spacer for tiles before the visible window (preserves scroll position)
        if (startIdx > 0) {
            h += `<div style="width:${startIdx * TILE_WIDTH}px;flex-shrink:0;height:1px;"></div>`;
        }

        let currentRegion = -1;
        // Pre-build position→players map to avoid O(tiles × players) filter calls
        const posMap = new Map();
        for (const p of mono.players) {
            if (p.bankrupt) continue;
            if (!posMap.has(p.pos)) posMap.set(p.pos, []);
            posMap.get(p.pos).push(p);
        }
        for (let i = startIdx; i < endIdx; i++) {
            const tile = mono.tiles[i];
            if (!tile) continue;
            // Add region divider when entering a new region
            if (tile.region !== currentRegion) {
                currentRegion = tile.region;
                const region = MONO_REGIONS[currentRegion];
                h += `<div class="region-divider" style="background:${region.color};">${region.name}</div>`;
            }
            const isUnlocked = i < unlockedCount;
            const players = posMap.get(i) || [];
            const isCurrent = currentPos === i;
            const prop = mono.properties[i];
            const ownedClass = prop && prop.owner >= 0 ? 'owned' : '';
            const lockedClass = isUnlocked ? '' : 'locked';
            const ownerDot = prop && prop.owner >= 0
                ? `<div class="tile-owner" style="background:${mono.players[prop.owner].color};"></div>` : '';
            const mortgageTag = prop && prop.mortgaged
                ? `<div style="position:absolute;top:2px;left:2px;font-size:.5rem;">🔒</div>` : '';
            const pins = players.map(p => `<span style="color:${p.color}">${p.ic}</span>`).join('');
            const levelStr = prop && prop.level > 0 ? `<div class="tile-level">Lv${prop.level}</div>` : '';
            const priceStr = tile.price ? `<div class="tile-cost">💰${tile.price}</div>` : '';
            h += `<div class="mono-tile-cell ${isCurrent?'current':''} ${ownedClass} ${lockedClass}" onclick="showTileDetail(${i})">
                <div class="tile-ic">${tile.ic}</div>
                <div class="tile-nm">${tile.nm}</div>
                ${priceStr}${levelStr}
                ${ownerDot}${mortgageTag}
                <div class="tile-pins">${pins}</div>
                <div class="tile-tooltip"><strong>${tile.ic} ${tile.nm}</strong><br>${tile.desc}${tile.price?`<br>💰 买价:${tile.price} 租金:${tile.rent}`:''}${prop&&prop.owner>=0?`<br>归属:${mono.players[prop.owner].ic} ${mono.players[prop.owner].nm}`:''}${prop&&prop.mortgaged?'<br>🔒 已抵押':''}</div>
            </div>`;
        }
        // Placeholder spacer for tiles after the visible window
        if (endIdx < total) {
            h += `<div style="width:${(total - endIdx) * TILE_WIDTH}px;flex-shrink:0;height:1px;"></div>`;
        }
        el.innerHTML = h;

        // Measure actual tile width from rendered DOM for accurate overview sync
        const firstTile = el.querySelector('.mono-tile-cell');
        if (firstTile) {
            _actualTileWidth = firstTile.offsetWidth + 3; // include gap (matches .mono-map-strip gap: 3px)
        }

        // Auto-scroll to current player position
        const currentTile = el.querySelector('.mono-tile-cell.current');
        if (scroll && currentTile) {
            const scrollLeft = currentTile.offsetLeft - scroll.offsetWidth / 2 + currentTile.offsetWidth / 2;
            scroll.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        }
        // Update overview after map render
        if (typeof renderMonoOverview === 'function') renderMonoOverview();
    }

    /* ---- Tile detail modal: click any tile to inspect & jump ---- */
    function showTileDetail(idx) {
        const tile = mono.tiles[idx];
        if (!tile) return;
        const prop = mono.properties[idx];
        const region = MONO_REGIONS[tile.region] || { name: '未知', color: '#999' };
        const isUnlocked = idx < getUnlockedTileCount();
        const ownerInfo = prop && prop.owner >= 0
            ? `<div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.2rem 0;">
                <span>🏠 归属</span><span style="font-weight:700;color:${mono.players[prop.owner].color};">${mono.players[prop.owner].ic} ${mono.players[prop.owner].nm}</span>
              </div>` : '';
        const levelInfo = prop && prop.level > 0
            ? `<div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.2rem 0;">
                <span>🏗️ 等级</span><span style="font-weight:700;color:var(--good);">Lv ${prop.level}</span>
              </div>` : '';
        const mortgageInfo = prop && prop.mortgaged
            ? `<div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.2rem 0;">
                <span>🔒 抵押状态</span><span style="font-weight:700;color:var(--warn);">已抵押（不收租金）</span>
              </div>` : '';
        const priceInfo = tile.price
            ? `<div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.2rem 0;">
                <span>💰 买价</span><span style="font-weight:700;">💰${tile.price}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.2rem 0;">
                <span>💸 租金</span><span style="font-weight:700;color:var(--bad);">💰${tile.rent}</span>
              </div>` : '';
        const lockedWarn = !isUnlocked
            ? '<div style="font-size:.75rem;color:var(--warn);padding:.3rem 0;">🔒 尚未解锁，推进时代后开放</div>' : '';

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">${tile.ic} ${tile.nm}</div>
            <div style="text-align:center;padding:.3rem 0;">
                <span style="font-size:.7rem;padding:.15rem .5rem;border-radius:10px;background:${region.color};color:#fff;">${region.name}</span>
                <span style="font-size:.7rem;color:var(--text2);margin-left:.3rem;">第 ${idx + 1} 格</span>
            </div>
            <div style="margin:.5rem 0;padding:.5rem;background:var(--card2);border-radius:8px;">
                <div style="font-size:.8rem;color:var(--text2);line-height:1.6;padding:.2rem 0;">${tile.desc}</div>
                ${priceInfo}${levelInfo}${mortgageInfo}${ownerInfo}
            </div>
            ${lockedWarn}
            <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                <button class="btn btn-primary" style="flex:1;" onclick="locateTile(${idx})">📍 定位到此格</button>
                <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function locateTile(idx) {
        closeModal();
        const strip = document.getElementById('mono-map-strip');
        const scroll = document.getElementById('mono-map-scroll');
        if (!strip || !scroll) return;
        let tileCount = 0;
        let targetTile = null;
        for (const child of strip.children) {
            if (child.classList.contains('mono-tile-cell')) {
                if (tileCount === idx) { targetTile = child; break; }
                tileCount++;
            }
        }
        if (targetTile) {
            const scrollLeft = targetTile.offsetLeft - scroll.offsetWidth / 2 + targetTile.offsetWidth / 2;
            scroll.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
            targetTile.classList.add('highlighted');
            setTimeout(() => targetTile.classList.remove('highlighted'), 3000);
            monoLog(`📍 定位到 ${mono.tiles[idx].ic} ${mono.tiles[idx].nm}`, 'info');
        }
        _perfMonitor.endRender();
    }

    function renderMonoDice() {
        const el = document.getElementById('mono-dice-area');
        if (!el) return;
        const cp = mono.players[mono.currentPlayer];
        const isHumanTurn = mono.currentPlayer === 0 && !mono.rolling && !cp?.bankrupt;
        const gameOver = mono.players.filter(p => !p.bankrupt).length <= 1;
        let h = `<div class="mono-dice">
            <span class="mono-dice-num">${mono.dice[0]}</span>
            <span style="color:var(--text2);font-size:1rem;">+</span>
            <span class="mono-dice-num">${mono.dice[1]}</span>
            <span style="color:var(--text2);font-size:1rem;">=</span>
            <span class="mono-dice-num">${mono.dice[0]+mono.dice[1]}</span>
        </div>`;
        if (gameOver) {
            const winner = mono.players.find(p => !p.bankrupt);
            h += `<div style="color:var(--good);font-weight:800;margin-top:.5rem;">🏆 ${winner?.ic} ${winner?.nm} 获胜！</div>`;
        } else if (isHumanTurn) {
            if (cp.jailTurns > 0) {
                h += `<div style="color:var(--bad);font-weight:700;margin-top:.3rem;text-align:center;">🔒 处于监禁受罚中 (剩余 ${cp.jailTurns} 回合)</div>`;
                h += `<button class="btn btn-primary" style="margin-top:.4rem;width:100%;" onclick="showJailOptionsModal()">⚖️ 应对监狱处分 (保释/出狱卡/越狱/放弃)</button>`;
            } else if (cp.banned > 0 || cp.hospital > 0) {
                const statusName = cp.banned > 0 ? `🚫 处于封印中 (剩 ${cp.banned} 回合)` : `🏥 在医院治疗中 (剩 ${cp.hospital} 回合)`;
                h += `<div style="color:var(--bad);font-weight:700;margin-top:.3rem;text-align:center;">${statusName}</div>`;
                h += `<button class="btn btn-secondary" style="margin-top:.4rem;width:100%;" onclick="rollDice()">⏳ 结束受罚回合 (等待解禁)</button>`;
            } else {
                // Dice multiplier selector (2x/3x/4x with risk)
                const curMult = cp.diceMultiplier || 1;
                const multBtns = [
                    { v: 1, label: '1x', risk: '安全', color: 'var(--text2)' },
                    { v: 2, label: '2x', risk: '25%失败', color: 'var(--accent)' },
                    { v: 3, label: '3x', risk: '35%失败', color: '#e8a838' },
                    { v: 4, label: '4x', risk: '45%失败', color: 'var(--bad)' },
                ];
                h += `<div style="display:flex;gap:.3rem;justify-content:center;margin-top:.4rem;flex-wrap:wrap;">`;
                multBtns.forEach(m => {
                    const active = curMult === m.v;
                    h += `<button class="btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}" style="font-size:.65rem;padding:.25rem .5rem;min-width:42px;" onclick="setDiceMultiplier(${m.v})" title="倍率${m.label}: ${m.risk}">${m.label}</button>`;
                });
                h += `</div>`;
                if (curMult > 1) {
                    const riskInfo = multBtns.find(m => m.v === curMult);
                    h += `<div style="font-size:.55rem;color:var(--bad);margin-top:.2rem;text-align:center;">⚠️ ${riskInfo.risk}：掷骰失败则原地不动</div>`;
                    h += `<div style="font-size:.55rem;color:var(--text2);margin-top:.15rem;text-align:center;">📌 已记忆 ×${curMult}</div>`;
                }
                // Consecutive doubles indicator
                if (cp.consecutiveDoubles > 0) {
                    h += `<div style="font-size:.6rem;color:#e8a838;margin-top:.2rem;text-align:center;">🎲 连续双数：${cp.consecutiveDoubles}/3（再出双数进监狱！）</div>`;
                }
                h += `<button class="btn btn-primary" style="margin-top:.5rem;width:100%;" onclick="rollDice()">🎲 掷骰子${curMult > 1 ? ` (×${curMult})` : ''}</button>`;
            }
            // Auto-pilot toggle button ALWAYS rendered so player can control autopilot anytime
            const apOn = mono.autoPilot === true;
            h += `<button class="btn ${apOn ? 'btn-primary' : 'btn-secondary'}" style="margin-top:.3rem;font-size:.7rem;width:100%;" onclick="toggleAutoPilot()">${apOn ? '🤖 托管中... (点击关闭)' : '🤖 开启全自动托管'}</button>`;
            if (apOn) {
                h += `<div style="font-size:.55rem;color:var(--accent);margin-top:.15rem;text-align:center;">自动交易·升级·用卡·掷骰·解禁</div>`;
            }
        } else if (mono.rolling) {
            h += `<div style="color:var(--text2);margin-top:.3rem;text-align:center;">🎲 掷骰中...</div>`;
            h += `<button class="btn btn-secondary btn-sm" style="margin-top:.4rem;width:100%;font-size:.68rem;padding:.3rem;" onclick="forceSkipCurrentPlayer()">⏭️ 强制恢复卡死回合</button>`;
        } else {
            h += `<div style="color:var(--text2);margin-top:.3rem;text-align:center;">${cp?.ic} ${cp?.nm} 思考中...</div>`;
            h += `<button class="btn btn-secondary btn-sm" style="margin-top:.4rem;width:100%;font-size:.68rem;padding:.3rem;" onclick="forceSkipCurrentPlayer()">⏭️ 跳过 ${cp?.nm} (恢复游戏)</button>`;
        }
        // Auto-save indicator & manual skip recovery button
        if (mono.autoSaveTurn > 0) {
            h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:.4rem;">
                <span style="font-size:.6rem;color:var(--text2);opacity:.7;">💾 已自动存档 (第${mono.autoSaveTurn}回合)</span>
                <button class="btn btn-sm btn-secondary" style="font-size:.55rem;padding:.1rem .3rem;" onclick="forceSkipCurrentPlayer()" title="跳过当前卡住的回合">⏭️ 跳过回合</button>
            </div>`;
        }
        el.innerHTML = h;
    }

    function setDiceMultiplier(v) {
        const p = mono.players[0];
        if (!p || mono.currentPlayer !== 0 || mono.rolling) return;
        p.diceMultiplier = v;
        safeSetItem('diceMultiplierPref', String(v));
        renderMonopoly();
    }

    /* ==================== Auto-Pilot System (全自动托管) ==================== */
    