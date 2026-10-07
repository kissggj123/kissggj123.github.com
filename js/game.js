function initMonopoly() {
        migrateSaveKey();
        migrateSettings();
        const saved = safeGetItem(CONFIG.MONO_SAVE_KEY, '');
        if (saved) {
            try { mono = JSON.parse(saved); validateMono(); }
            catch(e) { newMonopolyGame(); }
        } else {
            newMonopolyGame();
        }
        // Load card inventory
        const invSaved = safeGetItem(CONFIG.SAVE_KEY, '');
        if (invSaved) {
            try { cardInventory = JSON.parse(invSaved) || []; } catch(e) { cardInventory = []; }
        }
        // Load news state
        const savedNews = safeGetItem('bunny_news_state', '');
        if (savedNews) {
            try { newsState = JSON.parse(savedNews); } catch(e) {}
        }
        // Restore monoEff functions lost during JSON serialization
        restoreAllCardFunctions();
        godModeActive = safeGetItem('godModeActive', '') === 'true';
        if (godModeActive) {
            const gi = document.getElementById('god-indicator');
            if (gi) gi.classList.add('show');
            const gp = document.getElementById('god-panel');
            if (gp) gp.style.display = '';
        }
        renderEvents();
        logEvent('兔可可王国 ' + CONFIG.VERSION + ' 已启动', 'info');

        // Resume pending AI action if interrupted by page refresh
        // Critical: if it's AI's turn and game has started, ALWAYS resume to prevent stuck state
        if (mono.started && mono.currentPlayer !== 0 && !mono.players[mono.currentPlayer]?.bankrupt) {
            // If trade was pending, skip trade and continue AI turn
            if (mono.pendingTrade) { mono.pendingTrade = false; }
            const aliveCount = mono.players.filter(p => !p.bankrupt).length;
            if (aliveCount > 1) {
                _startWatchdog(); // Start watchdog for resumed AI turn
                if (mono.pendingAction === 'movePlayer') {
                    // Dice already rolled, need to move player
                    const diceTotal = mono.dice[0] + mono.dice[1];
                    setTimeout(() => { try { movePlayer(mono.currentPlayer, diceTotal); } catch(e) { console.error('[Resume movePlayer Error]', e); _clearWatchdog(); nextTurn(); } }, 800);
                } else if (mono.pendingAction === 'triggerTile') {
                    // Position already updated, need to trigger tile effect
                    setTimeout(() => { try { triggerTile(mono.currentPlayer); } catch(e) { console.error('[Resume triggerTile Error]', e); _clearWatchdog(); nextTurn(); } }, 800);
                } else {
                    // Default: start AI turn from beginning (covers null/undefined pendingAction from old saves)
                    setTimeout(() => { try { aiTurn(); } catch(e) { console.error('[Resume aiTurn Error]', e); _clearWatchdog(); nextTurn(); } }, 800);
                }
            }
        }
        // Reset stuck rolling state
        if (mono.rolling) {
            mono.rolling = false;
            mono.pendingAction = null;
            saveMonopoly();
        }
    }

    function validateMono() {
        if (!mono || !mono.tiles || !mono.players) { newMonopolyGame(); return; }
        if (mono.turn === undefined) mono.turn = 1;
        if (mono.currentPlayer === undefined) mono.currentPlayer = 0;
        // Validate tile count matches current map configuration
        const expectedTiles = MONO_REGIONS.reduce((sum, r) => sum + r.tileCount, 0);
        if (mono.tiles.length !== expectedTiles) {
            // Map configuration changed — try to preserve player data but rebuild tiles
            console.warn(`[validateMono] Tile count mismatch: save has ${mono.tiles.length}, expected ${expectedTiles}. Rebuilding tiles.`);
            const oldTiles = mono.tiles;
            mono.tiles = generateAllTiles();
            // Recalculate properties array for new tiles
            if (mono.properties) {
                const newProps = mono.tiles.map(t => t.type === 'property' ? {owner:-1, level:0, mortgaged:false} : null);
                for (let i = 0; i < Math.min(oldTiles.length, mono.tiles.length); i++) {
                    if (mono.properties[i] && newProps[i]) {
                        newProps[i].owner = mono.properties[i].owner ?? -1;
                        newProps[i].level = mono.properties[i].level ?? 0;
                        newProps[i].mortgaged = mono.properties[i].mortgaged ?? false;
                    }
                }
                mono.properties = newProps;
            }
            // Reset player positions to valid range
            mono.players.forEach(p => {
                if (p.pos >= mono.tiles.length) p.pos = 0;
            });
            // Persist rebuilt tiles to localStorage so mismatch warning only runs once
            saveMonopoly();
        }
        mono.players.forEach(p => {
            if (p.shield === undefined || p.shield === true) p.shield = p.shield === true ? 1 : 0; if (p.shield === false) p.shield = 0;
            if (p.lucky === undefined || p.lucky === true) p.lucky = p.lucky === true ? 1 : 0; if (p.lucky === false) p.lucky = 0;
            if (p.speed === undefined) p.speed = 0;
            if (p.doubleDice === undefined || p.doubleDice === true) p.doubleDice = p.doubleDice === true ? 1 : 0; if (p.doubleDice === false) p.doubleDice = 0;
            if (p.consecutiveDoubles === undefined) p.consecutiveDoubles = 0;
            if (p.diceMultiplier === undefined) p.diceMultiplier = parseInt(safeGetItem('diceMultiplierPref', '1')) || 1;
            if (p.jailFree === undefined) p.jailFree = false;
            if (p.jailTurns === undefined) p.jailTurns = 0;
            if (p.banned === undefined) p.banned = 0;
            if (p.hospital === undefined) p.hospital = 0;
            if (p.taxFree === undefined) p.taxFree = 0;
            if (p.mirror === undefined || p.mirror === true) p.mirror = p.mirror === true ? 1 : 0; if (p.mirror === false) p.mirror = 0;
            if (p.confused === undefined) p.confused = 0;
            if (p.rentDouble === undefined) p.rentDouble = 0;
            if (p.interestFree === undefined) p.interestFree = 0;
            // Hacker/item race effect fields
            if (p.blackoutTurns === undefined) p.blackoutTurns = 0;
            if (p.empTurns === undefined) p.empTurns = 0;
            if (p.hologramTurns === undefined) p.hologramTurns = 0;
            if (p.signalJamTurns === undefined) p.signalJamTurns = 0;
            if (p.slipTurns === undefined) p.slipTurns = 0;
            if (p.vehicleDiscount === undefined) p.vehicleDiscount = 0;
            if (p.vehicleDiscountTurns === undefined) p.vehicleDiscountTurns = 0;
            if (p.firewallTurns === undefined) p.firewallTurns = 0;
            if (p.virusTurns === undefined) p.virusTurns = 0;
            if (p.cloneActive === undefined) p.cloneActive = false;
            if (p.quantumTarget === undefined) p.quantumTarget = -1;
            if (p.quantumTurns === undefined) p.quantumTurns = 0;
            if (p.overclockNext === undefined) p.overclockNext = false;
            if (p.lockdownTurns === undefined) p.lockdownTurns = 0;
            if (p.cards === undefined) p.cards = [];
            if (p.loans === undefined) p.loans = [];
            if (p.credit === undefined) p.credit = 100;
            if (p.vehicle === undefined) p.vehicle = null;
            if (!p.vehicles) p.vehicles = []; // Vehicle inventory for unlimited ownership
            if (p.isHuman === undefined) p.isHuman = false;
            if (p.personality === undefined) p.personality = 'balanced';
            if (p.stocks === undefined) p.stocks = 0;
            if (p.stockAvgCost === undefined) p.stockAvgCost = 0;
            // Migrate to multi-stock holdings
            migrateStockHoldings(p);
            if (!p.stats) p.stats = {
                propertiesBought: 0, purchaseSpent: 0,
                upgradesDone: 0, upgradeSpent: 0,
                rentIncomeTotal: 0, rentPaidTotal: 0,
                rentLog: [], stockProfit: 0, stockTrades: 0,
            };
            if (p.stats.propertiesBought === undefined) p.stats.propertiesBought = 0;
            if (p.stats.purchaseSpent === undefined) p.stats.purchaseSpent = 0;
            if (p.stats.upgradesDone === undefined) p.stats.upgradesDone = 0;
            if (p.stats.upgradeSpent === undefined) p.stats.upgradeSpent = 0;
            if (p.stats.rentIncomeTotal === undefined) p.stats.rentIncomeTotal = 0;
            if (p.stats.rentPaidTotal === undefined) p.stats.rentPaidTotal = 0;
            if (!Array.isArray(p.stats.rentLog)) p.stats.rentLog = [];
            if (p.stats.stockProfit === undefined) p.stats.stockProfit = 0;
            if (p.stats.stockTrades === undefined) p.stats.stockTrades = 0;
            // Safety: round any decimal money values from old saves
            p.money = Math.round(p.money);
            p.stats.stockProfit = Math.round(p.stats.stockProfit);
            // Round any decimal avgCost in stock holdings
            if (p.stockHoldings) p.stockHoldings.forEach(h => { if (h.avgCost) h.avgCost = Math.round(h.avgCost); });
        });
        if (mono.stockMarket === undefined) mono.stockMarket = 100;
        // Era system removed: always unlock all regions
        mono.unlockedEras = MONO_REGIONS.length - 1;
        if (mono.voluntaryVisit === undefined) mono.voluntaryVisit = false;
        if (mono.pendingAction === undefined) mono.pendingAction = null;
        if (mono.pendingTrade === undefined) mono.pendingTrade = false;
        if (mono.autoSaveTurn === undefined) mono.autoSaveTurn = 0;
        if (!mono.humanStats) {
            mono.humanStats = {
                buyProperty: 0, buyStock: 0, buyVehicle: 0, useCard: 0,
                takeLoan: 0, upgradeProperty: 0, mortgageProperty: 0,
                stockPicks: {}, vehiclePicks: {}, humanMoneyHistory: [],
                humanWins: 0, humanGames: 0,
            };
        }
        if (!mono.eventLog) mono.eventLog = [];
        // Sanitize existing eventLog entries from old saves (fix [object Object] / undefined)
        mono.eventLog = mono.eventLog.map(e => {
            if (typeof e !== 'object' || e === null) return { type:'unknown', player:'未知', action:'', result:'', turn:0, time:0 };
            const sFn = (v) => {
                if (v === null || v === undefined) return '';
                if (typeof v === 'object') { try { return JSON.stringify(v); } catch(_) { return String(v); } }
                return String(v);
            };
            return {
                type: sFn(e.type) || 'unknown',
                player: sFn(e.player) || '未知',
                action: sFn(e.action) || '',
                result: sFn(e.result),
                turn: (typeof e.turn === 'number') ? e.turn : 0,
                time: e.time || 0,
            };
        });
        // Initialize multi-stock system (10 stocks)
        if (!mono.stockPrices || mono.stockPrices.length < STOCK_TYPES.length) {
            mono.stockPrices = STOCK_TYPES.map(s => s.basePrice);
        }
        if (mono.stockLastUpdate === undefined) mono.stockLastUpdate = Date.now();
        if (mono.properties === undefined) {
            mono.properties = mono.tiles.map(t => t.type === 'property' ? {owner:-1, level:0} : null);
        }
        // Ensure mortgaged flag exists on all properties
        mono.properties.forEach(prop => {
            if (prop && prop.mortgaged === undefined) prop.mortgaged = false;
        });
        // Initialize dynamic economy state if missing
        if (!mono.economy) {
            mono.economy = calculateEconomyState();
        }
    }

    /* Migrate old single-stock holdings to multi-stock format */
    function migrateStockHoldings(p) {
        if (p.stockHoldings && p.stockHoldings.length > 0) return; // Already migrated
        p.stockHoldings = STOCK_TYPES.map(s => ({shares: 0, avgCost: 0, leverage: 1, isShort: false}));
        // Migrate old stocks to stock 0 (胡萝卜农业)
        if (p.stocks > 0) {
            p.stockHoldings[0].shares = p.stocks;
            p.stockHoldings[0].avgCost = p.stockAvgCost || mono.stockPrices[0];
            p.stockHoldings[0].leverage = 1;
            p.stockHoldings[0].isShort = false;
        }
    }

    /* Calculate overall market index from individual stock prices */
    function getStockIndex() {
        if (!mono.stockPrices || mono.stockPrices.length === 0) return mono.stockMarket || 100;
        const avg = mono.stockPrices.reduce((s, p) => s + p, 0) / mono.stockPrices.length;
        // Normalize to base 100 (average of base prices)
        const baseAvg = STOCK_TYPES.reduce((s, st) => s + st.basePrice, 0) / STOCK_TYPES.length;
        return Math.floor((avg / baseAvg) * 100);
    }

    /* Refresh stock prices based on volatility and economy (called every 30s or per turn) */
    function refreshStockPrices() {
        if (!mono.stockPrices) return;
        const economy = mono.economy || calculateEconomyState();
        const inflation = economy.inflation || 0.03;
        const prosperity = economy.prosperity || 1.0;
        const blackSwanChance = economy.blackSwanChance || 0.02;
        const timeVolMult = economy.stockVolatilityMult || 1.0; // Real-time volatility modifier
        // Black swan event: random crash on a random stock (20-40% drop)
        let blackSwanStock = -1;
        let blackSwanCrash = 0;
        if (Math.random() < blackSwanChance) {
            blackSwanStock = Math.floor(Math.random() * STOCK_TYPES.length);
            blackSwanCrash = 0.20 + Math.random() * 0.20; // 20-40% crash
        }
        mono.stockPrices = mono.stockPrices.map((price, i) => {
            const stock = STOCK_TYPES[i];
            let change = (Math.random() - 0.5) * 2 * stock.volatility * timeVolMult; // Apply time multiplier
            // Trend influence (reduced for realism)
            if (stock.trend === 'growth') change += 0.01;
            else if (stock.trend === 'cyclical') change += (prosperity - 1) * 0.03;
            else if (stock.trend === 'volatile') change += (Math.random() - 0.5) * 0.05;
            // Inflation drift
            change += inflation * 0.2;
            // News system: general stock trend
            if (economy.newsStockTrend) change += economy.newsStockTrend;
            // News system: sector-specific boost
            if (economy.newsSectorBoosts && economy.newsSectorBoosts[i]) change += economy.newsSectorBoosts[i];
            // News system: sector-specific drop
            if (economy.newsSectorDrops && economy.newsSectorDrops[i]) change += economy.newsSectorDrops[i];
            // Black swan crash
            if (i === blackSwanStock) change -= blackSwanCrash;
            let newPrice = price * (1 + change);
            // Clamp to 25%-250% of base price (tighter range)
            newPrice = Math.max(stock.basePrice * 0.25, Math.min(stock.basePrice * 2.5, newPrice));
            return Math.floor(newPrice);
        });
        mono.stockMarket = getStockIndex();
        mono.stockLastUpdate = Date.now();
        // Log black swan event
        if (blackSwanStock >= 0) {
            const stockNm = STOCK_TYPES[blackSwanStock].nm;
            const stockIc = STOCK_TYPES[blackSwanStock].ic;
            monoLog(`🦢 黑天鹅事件！${stockIc} ${stockNm} 暴跌 ${Math.round(blackSwanCrash * 100)}%！`, 'error');
        }
        // Check for margin calls after price update
        checkMarginCalls();
    }

    /* Get player's total stock portfolio P/L (profit/loss) */
    function getStockPortfolioValue(p) {
        if (!p.stockHoldings) return 0;
        let total = 0;
        for (let i = 0; i < STOCK_TYPES.length; i++) {
            const h = p.stockHoldings[i];
            const price = mono.stockPrices[i];
            const lev = h.leverage || 1;
            if (h.isShort) {
                total += (h.avgCost - price) * h.shares * lev;
            } else {
                total += (price - h.avgCost) * h.shares * lev;
            }
        }
        return Math.floor(total);
    }

    /* Get player's total stock position count */
    function getTotalStockShares(p) {
        if (!p.stockHoldings) return 0;
        return p.stockHoldings.reduce((s, h) => s + h.shares, 0);
    }

    /* Check and force-liquidate positions that breach margin (爆仓) */
    function checkMarginCalls() {
        const liquidated = [];
        for (let pi = 0; pi < mono.players.length; pi++) {
            const p = mono.players[pi];
            if (p.bankrupt || !p.stockHoldings) continue;
            for (let si = 0; si < STOCK_TYPES.length; si++) {
                const h = p.stockHoldings[si];
                if (h.shares <= 0) continue;
                const price = mono.stockPrices[si];
                const lev = h.leverage || 1;
                // Calculate unrealized P/L
                const unrealizedPnL = h.isShort
                    ? (h.avgCost - price) * h.shares * lev
                    : (price - h.avgCost) * h.shares * lev;
                // Margin paid = avgCost * shares / leverage
                const marginPaid = Math.ceil(h.avgCost * h.shares / lev);
                // Force liquidate if loss exceeds 80% of margin (margin call)
                if (unrealizedPnL < -marginPaid * 0.8) {
                    // Force close position
                    const marginReturn = Math.max(0, Math.round(marginPaid + unrealizedPnL));
                    p.money += marginReturn;
                    p.stats.stockProfit += Math.round(unrealizedPnL);
                    const stockNm = STOCK_TYPES[si].nm;
                    liquidated.push(`${p.ic} ${stockNm} ${h.isShort ? '空仓' : '多仓'} ${h.shares}股 (x${lev})`);
                    monoLog(`💥 ${p.ic} ${stockNm} 爆仓！强制平仓 ${h.shares} 股 (x${lev}杠杆)，亏损 💰${Math.abs(Math.floor(unrealizedPnL))}`, 'error');
                    h.shares = 0; h.avgCost = 0; h.leverage = 1;
                }
            }
        }
        return liquidated;
    }

    /* ==================== Real-Time System ==================== */
    // Real-world time affects all game mechanics: economy, stock market, events, rent, etc.
    // Time phases: dawn(5-8), morning(8-12), noon(12-14), afternoon(14-18), evening(18-22), night(22-5)
    // Weekday vs weekend also affects market behavior

    const TIME_PHASES = [
        { name: '黎明', icon: '🌅', start: 5, end: 8,
          economyMod: { inflation: -0.005, stockVolatility: 0.8, rentMult: 0.95, eventChance: 1.1 },
          desc: '市场冷清，波动降低' },
        { name: '上午', icon: '🏢', start: 8, end: 12,
          economyMod: { inflation: 0.002, stockVolatility: 1.2, rentMult: 1.0, eventChance: 1.0 },
          desc: '交易活跃，波动增加' },
        { name: '午间', icon: '☀️', start: 12, end: 14,
          economyMod: { inflation: 0.001, stockVolatility: 0.9, rentMult: 1.05, eventChance: 0.9 },
          desc: '午休时段，市场平稳' },
        { name: '下午', icon: '📊', start: 14, end: 18,
          economyMod: { inflation: 0.003, stockVolatility: 1.3, rentMult: 1.0, eventChance: 1.1 },
          desc: '交易高峰，波动最大' },
        { name: '傍晚', icon: '🌆', start: 18, end: 22,
          economyMod: { inflation: -0.001, stockVolatility: 1.0, rentMult: 1.1, eventChance: 1.2 },
          desc: '收市时段，事件增多' },
        { name: '深夜', icon: '🌙', start: 22, end: 5,
          economyMod: { inflation: -0.003, stockVolatility: 0.6, rentMult: 0.9, eventChance: 1.3 },
          desc: '深夜交易，黑天鹅高发' },
    ];

    function getCurrentTimePhase() {
        const hour = new Date().getHours();
        for (const phase of TIME_PHASES) {
            if (phase.start <= phase.end) {
                if (hour >= phase.start && hour < phase.end) return phase;
            } else {
                // Wrap-around phase (e.g., 22-5)
                if (hour >= phase.start || hour < phase.end) return phase;
            }
        }
        return TIME_PHASES[1]; // default to morning
    }

    function isWeekend() {
        const day = new Date().getDay();
        return day === 0 || day === 6;
    }

    function getTimeSystemState() {
        const phase = getCurrentTimePhase();
        const weekend = isWeekend();
        const mod = phase.economyMod;
        return {
            phase: phase.name,
            phaseIcon: phase.icon,
            phaseDesc: phase.desc,
            hour: new Date().getHours(),
            minute: new Date().getMinutes(),
            isWeekend: weekend,
            isDaytime: phase.name !== '深夜',
            // Multipliers applied to various game systems
            inflationDelta: mod.inflation + (weekend ? -0.002 : 0),
            stockVolatilityMult: mod.stockVolatility * (weekend ? 0.7 : 1),
            rentMultiplier: mod.rentMult,
            eventChanceMult: mod.eventChance * (weekend ? 1.2 : 1),
            blackSwanBonus: phase.name === '深夜' ? 0.03 : (phase.name === '傍晚' ? 0.01 : 0),
        };
    }

    function getRealtimeEconomyModifiers() {
        const ts = getTimeSystemState();
        return ts;
    }

    /* ==================== Dynamic Economy Engine ==================== */
    function calculateEconomyState() {
        const totalMoney = mono.players.reduce((s, p) => s + Math.max(0, p.money), 0);
        const avgMoney = totalMoney / Math.max(1, mono.players.filter(p => !p.bankrupt).length);
        const bankruptCount = mono.players.filter(p => p.bankrupt).length;
        // Era system removed: use game progress (turn) for scaling instead
        const progressFactor = Math.min(1, mono.turn / 100);
        // Real-time system modifiers
        const ts = getTimeSystemState();
        // News system effects
        const newsEffects = getActiveNewsEffects();

        return {
            inflation: Math.max(0, 0.03 + (avgMoney / 50000) * 0.05 + (Math.random() - 0.5) * 0.02 + ts.inflationDelta + newsEffects.inflation),
            loanRateBase: Math.max(0.02, 0.06 + (mono.turn / 100) * 0.04 + (Math.random() - 0.5) * 0.03 + newsEffects.loanRateDelta),
            mortgageRatio: 0.5 + (Math.random() - 0.5) * 0.15,
            creditMultiplier: Math.max(50, 100 + (progressFactor * 100) + (Math.random() - 0.5) * 30),
            maxDebtRatio: Math.max(0.3, 0.6 + (Math.random() - 0.5) * 0.2),
            rentMultiplier: Math.max(0.1, (0.9 + (mono.turn / 200) + (Math.random() - 0.5) * 0.3) * ts.rentMultiplier * newsEffects.rentMultiplier),
            propertyPriceMultiplier: Math.max(0.5, 1 + (progressFactor * 0.5) + (0.03 + (avgMoney / 50000) * 0.05)),
            blackSwanChance: Math.min(0.15, 0.02 + bankruptCount * 0.01 + ts.blackSwanBonus),
            timePhase: ts.phase,
            timePhaseIcon: ts.phaseIcon,
            isWeekend: ts.isWeekend,
            stockVolatilityMult: Math.max(0.1, Math.min(3, ts.stockVolatilityMult * newsEffects.volatility)),
            eventChanceMult: ts.eventChanceMult,
            newsStockTrend: newsEffects.stockTrend,
            newsSectorBoosts: newsEffects.sectorBoosts,
            newsSectorDrops: newsEffects.sectorDrops,
            newsVehiclePriceMod: newsEffects.vehiclePriceMod,
        };
    }

    /* ==================== News & TV System ==================== */
    // News events that affect game world parameters (passive or player-spread)
    const NEWS_EVENTS = [
        { id: 'bull_market', icon: '🐂', title: '牛市来袭！', desc: '投资者信心高涨，股市全线上涨',
          effects: { stockTrend: 0.08, inflation: 0.005 }, duration: 3, weight: 8, type: 'market' },
        { id: 'bear_market', icon: '🐻', title: '熊市降临', desc: '市场恐慌蔓延，股市全面下跌',
          effects: { stockTrend: -0.08, inflation: -0.005 }, duration: 3, weight: 8, type: 'market' },
        { id: 'inflation_spike', icon: '📈', title: '通胀飙升', desc: '物价飞涨，货币购买力下降',
          effects: { inflation: 0.02, rentMultiplier: 1.08 }, duration: 2, weight: 6, type: 'economy' },
        { id: 'deflation', icon: '📉', title: '通缩压力', desc: '物价下跌，经济萎缩',
          effects: { inflation: -0.015, rentMultiplier: 0.92 }, duration: 2, weight: 5, type: 'economy' },
        { id: 'property_boom', icon: '🏠', title: '地产热潮', desc: '房地产市场火爆，租金上涨',
          effects: { rentMultiplier: 1.15, inflation: 0.01 }, duration: 3, weight: 7, type: 'economy' },
        { id: 'rate_hike', icon: '🏦', title: '央行加息', desc: '贷款利率上调，借贷成本增加',
          effects: { loanRateDelta: 0.015, inflation: -0.008 }, duration: 3, weight: 6, type: 'economy' },
        { id: 'rate_cut', icon: '💰', title: '央行降息', desc: '贷款利率下调，刺激经济',
          effects: { loanRateDelta: -0.015, inflation: 0.008 }, duration: 3, weight: 6, type: 'economy' },
        { id: 'tech_breakthrough', icon: '🚀', title: '航天科技突破', desc: '航天科技公司重大突破，股价暴涨',
          effects: { stockSectorBoost: { id: 6, boost: 0.15 } }, duration: 2, weight: 5, type: 'sector' },
        { id: 'pharma_boom', icon: '💊', title: '医药行业利好', desc: '新药获批，医药股大涨',
          effects: { stockSectorBoost: { id: 4, boost: 0.12 } }, duration: 2, weight: 5, type: 'sector' },
        { id: 'game_craze', icon: '🎮', title: '游戏产业爆发', desc: '全民游戏热潮，娱乐股飙升',
          effects: { stockSectorBoost: { id: 5, boost: 0.15 } }, duration: 2, weight: 4, type: 'sector' },
        { id: 'energy_crisis', icon: '⚡', title: '能源危机', desc: '能源价格飙升，电力股大涨',
          effects: { stockSectorBoost: { id: 2, boost: 0.12 }, inflation: 0.015 }, duration: 3, weight: 5, type: 'sector' },
        { id: 'trade_war', icon: '⚔️', title: '贸易战升级', desc: '全球贸易受阻，市场动荡',
          effects: { stockTrend: -0.06, inflation: 0.015, volatility: 1.3 }, duration: 4, weight: 5, type: 'world' },
        { id: 'peace_treaty', icon: '🕊️', title: '和平协议签署', desc: '市场信心恢复，股市上涨',
          effects: { stockTrend: 0.06, inflation: -0.008, volatility: 0.8 }, duration: 3, weight: 4, type: 'world' },
        { id: 'natural_disaster', icon: '🌪️', title: '自然灾害', desc: '工业区遭受灾害，生产受阻',
          effects: { stockSectorDrop: { id: 3, drop: -0.1 }, inflation: 0.015 }, duration: 2, weight: 4, type: 'world' },
        { id: 'gold_rush', icon: '⛏️', title: '淘金热', desc: '资源类股票暴涨，通胀微升',
          effects: { stockTrend: 0.05, inflation: 0.008 }, duration: 2, weight: 5, type: 'world' },
        { id: 'car_recall', icon: '🚗', title: '载具安全事件', desc: '载具安全大检查，市场价格波动',
          effects: { vehiclePriceMod: 1.1, inflation: 0.005 }, duration: 2, weight: 3, type: 'world' },
        { id: 'festival', icon: '🎉', title: '盛大节日', desc: '消费激增，经济繁荣',
          effects: { inflation: 0.008, rentMultiplier: 1.05, stockTrend: 0.03 }, duration: 2, weight: 4, type: 'world' },
        { id: 'epidemic', icon: '🦠', title: '流感季节', desc: '医药股受益，娱乐股受挫',
          effects: { stockSectorBoost: { id: 4, boost: 0.1 }, stockSectorDrop: { id: 5, drop: -0.08 } }, duration: 3, weight: 4, type: 'world' },
    ];

    let newsState = {
        active: [],       // [{ newsId, turnsLeft, effects }]
        history: [],      // [{ newsId, turn, time, spreadBy }]
        passiveCooldown: 0,
        spreadCost: 500,
    };

    // Aggregate all active news effects into a single modifier object
    function getActiveNewsEffects() {
        const effects = {
            stockTrend: 0,
            inflation: 0,
            rentMultiplier: 1,
            loanRateDelta: 0,
            volatility: 1,
            vehiclePriceMod: 1,
            sectorBoosts: {},
            sectorDrops: {},
        };
        for (const active of newsState.active) {
            const news = NEWS_EVENTS.find(n => n.id === active.newsId);
            if (!news) continue;
            const e = news.effects;
            if (e.stockTrend) effects.stockTrend += e.stockTrend;
            if (e.inflation) effects.inflation += e.inflation;
            if (e.rentMultiplier) effects.rentMultiplier *= e.rentMultiplier;
            if (e.loanRateDelta) effects.loanRateDelta += e.loanRateDelta;
            if (e.volatility) effects.volatility *= e.volatility;
            if (e.vehiclePriceMod) effects.vehiclePriceMod *= e.vehiclePriceMod;
            if (e.stockSectorBoost) effects.sectorBoosts[e.stockSectorBoost.id] = (effects.sectorBoosts[e.stockSectorBoost.id] || 0) + e.stockSectorBoost.boost;
            if (e.stockSectorDrop) effects.sectorDrops[e.stockSectorDrop.id] = (effects.sectorDrops[e.stockSectorDrop.id] || 0) + e.stockSectorDrop.drop;
        }
        return effects;
    }

    // Decrement active news timers, remove expired
    function tickNews() {
        newsState.active = newsState.active.filter(a => {
            a.turnsLeft--;
            return a.turnsLeft > 0;
        });
        if (newsState.passiveCooldown > 0) newsState.passiveCooldown--;
    }

    // Random passive news generation (called each turn)
    function generatePassiveNews() {
        if (newsState.passiveCooldown > 0) return null;
        if (!mono.started) return null;
        // Limit maximum active news to prevent unbounded stacking
        if (newsState.active.length >= 5) return null;
        const ts = getTimeSystemState();
        const baseChance = 0.12 * ts.eventChanceMult;
        if (Math.random() > baseChance) return null;
        // Weighted random selection
        const totalWeight = NEWS_EVENTS.reduce((s, n) => s + n.weight, 0);
        let r = Math.random() * totalWeight;
        let selected = NEWS_EVENTS[0];
        for (const n of NEWS_EVENTS) {
            r -= n.weight;
            if (r <= 0) { selected = n; break; }
        }
        // Prevent duplicate: skip if same news already active
        if (newsState.active.some(a => a.newsId === selected.id)) return null;
        newsState.active.push({
            newsId: selected.id,
            turnsLeft: selected.duration,
            effects: selected.effects,
        });
        newsState.history.push({
            newsId: selected.id,
            turn: mono.turn,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            spreadBy: '📺 电视台',
        });
        if (newsState.history.length > 50) newsState.history.shift();
        newsState.passiveCooldown = 2 + Math.floor(Math.random() * 3);
        monoLog(`📺 ${selected.icon} ${selected.title}：${selected.desc}`, 'info');
        recordGameEvent('news_passive', '📺 电视台', selected.title, selected.desc);
        renderNewsTicker();
        return selected;
    }

    // Player actively spreads news (costs coins)
    function spreadNews(newsIndex) {
        const p = mono.players[0];
        if (!p || p.bankrupt) return;
        const cost = newsState.spreadCost;
        if (p.money < cost) {
            monoLog(`散播新闻需要 💰${cost}，资金不足！`, 'error');
            return;
        }
        const news = NEWS_EVENTS[newsIndex];
        if (!news) return;
        // Prevent duplicate active news and enforce max limit
        if (newsState.active.some(a => a.newsId === news.id)) {
            monoLog(`📰 ${news.title} 已在传播中，无法重复散播`, 'error');
            return;
        }
        if (newsState.active.length >= 5) {
            monoLog(`📰 当前新闻过多，等待部分新闻过期后再散播`, 'error');
            return;
        }
        p.money -= cost;
        newsState.active.push({
            newsId: news.id,
            turnsLeft: news.duration + 1,
            effects: news.effects,
        });
        newsState.history.push({
            newsId: news.id,
            turn: mono.turn,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            spreadBy: '📢 你散播',
        });
        if (newsState.history.length > 50) newsState.history.shift();
        monoLog(`📢 你散播了新闻：${news.icon} ${news.title}，花费 💰${cost}`, 'success');
        recordGameEvent('news_spread', '📢 兔可可', `散播 ${news.title}`, `花费 ${cost}💰`);
        closeModal();
        renderMonopoly();
    }

    // Render news ticker bar in monopoly view
    function renderNewsTicker() {
        const ticker = document.getElementById('news-ticker');
        if (!ticker) return;
        if (!mono.started || newsState.active.length === 0) {
            ticker.style.display = 'none';
            return;
        }
        ticker.style.display = 'flex';
        const items = newsState.active.map(a => {
            const news = NEWS_EVENTS.find(n => n.id === a.newsId);
            if (!news) return '';
            return `<span style="display:inline-flex;align-items:center;gap:.2rem;padding:0 .5rem;border-right:1px solid var(--border);">
                ${news.icon} ${news.title} <span style="font-size:.6rem;color:var(--text2);">(${a.turnsLeft}回合)</span>
            </span>`;
        }).join('');
        ticker.innerHTML = `<span style="color:var(--accent);font-weight:700;padding-right:.3rem;">📺</span><div style="overflow:hidden;white-space:nowrap;flex:1;">${items}</div>`;
    }

    // Full news modal with active, spread, and history
    function showNewsModal() {
        const modal = document.getElementById('modal-content');
        if (!modal) return;
        const activeHtml = newsState.active.length === 0
            ? '<div style="text-align:center;color:var(--text2);padding:1rem;">当前无活跃新闻</div>'
            : newsState.active.map(a => {
                const news = NEWS_EVENTS.find(n => n.id === a.newsId);
                if (!news) return '';
                return `<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem;background:var(--card2);border-radius:8px;margin-bottom:.3rem;">
                    <span style="font-size:1.5rem;">${news.icon}</span>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:.85rem;color:var(--accent);">${news.title}</div>
                        <div style="font-size:.7rem;color:var(--text2);">${news.desc}</div>
                    </div>
                    <span style="font-size:.7rem;color:var(--warn);">剩余 ${a.turnsLeft} 回合</span>
                </div>`;
            }).join('');
        const spreadCost = newsState.spreadCost;
        const spreadHtml = NEWS_EVENTS.map((n, i) =>
            `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem;background:var(--card2);border-radius:6px;margin-bottom:.2rem;cursor:pointer;" onclick="spreadNews(${i})">
                <span style="font-size:1.2rem;">${n.icon}</span>
                <div style="flex:1;">
                    <div style="font-size:.8rem;font-weight:700;">${n.title}</div>
                    <div style="font-size:.65rem;color:var(--text2);">${n.desc}</div>
                </div>
                <span style="font-size:.7rem;color:var(--accent);font-weight:700;">💰${spreadCost}</span>
            </div>`
        ).join('');
        const historyHtml = newsState.history.length === 0
            ? '<div style="text-align:center;color:var(--text2);padding:.5rem;">暂无新闻历史</div>'
            : newsState.history.slice(-10).reverse().map(h => {
                const news = NEWS_EVENTS.find(n => n.id === h.newsId);
                if (!news) return '';
                return `<div style="display:flex;align-items:center;gap:.4rem;padding:.3rem 0;border-bottom:1px solid var(--border);">
                    <span>${news.icon}</span>
                    <span style="flex:1;font-size:.75rem;">${news.title}</span>
                    <span style="font-size:.65rem;color:var(--text2);">${h.spreadBy}</span>
                    <span style="font-size:.65rem;color:var(--text2);">第${h.turn}回合</span>
                </div>`;
            }).join('');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">📺 新闻电视台</div>
            <div style="font-size:.75rem;color:var(--text2);margin-bottom:.5rem;">新闻事件可影响整个世界的经济参数（通胀、股市、租金、利率等）。被动新闻由电视台随机播报，也可花费💰主动散播。</div>
            <div style="font-weight:700;font-size:.85rem;margin-bottom:.3rem;">📡 当前活跃新闻</div>
            <div style="margin-bottom:.75rem;">${activeHtml}</div>
            <div style="font-weight:700;font-size:.85rem;margin-bottom:.3rem;">📢 散播新闻（花费💰${spreadCost}）</div>
            <div style="max-height:200px;overflow-y:auto;margin-bottom:.75rem;">${spreadHtml}</div>
            <div style="font-weight:700;font-size:.85rem;margin-bottom:.3rem;">📜 新闻历史</div>
            <div style="max-height:150px;overflow-y:auto;">${historyHtml}</div>
            <button class="btn" style="width:100%;margin-top:.5rem;" onclick="closeModal()">关闭</button>
        `;
        document.getElementById('modal-overlay').classList.add('show');
    }

    /* Calculate maximum money cap: price/rent must not exceed 20% of the wealthiest active player's money */
    function getMaxMoneyCap() {
        if (!mono || !mono.players) return 2000;
        const alive = mono.players.filter(p => !p.bankrupt);
        if (alive.length === 0) return 2000;
        const maxMoney = Math.max(...alive.map(p => p.money || 0));
        return Math.max(500, Math.floor(maxMoney * 0.20));
    }

    /* Dynamic rent calculation with standard Monopoly set bonuses, level escalation, & mortgage check */
    function calculateRent(tile, prop) {
        if (!tile || !prop || prop.mortgaged || prop.owner < 0) return 0;
        const owner = prop.owner;
        const regionId = tile.region;

        // Level multipliers: Lv0=1.0x, Lv1=1.8x, Lv2=3.2x, Lv3=5.5x, Lv4=8.5x, Lv5=13.0x
        const levelMultipliers = [1.0, 1.8, 3.2, 5.5, 8.5, 13.0];
        const lvl = Math.min(5, Math.max(0, prop.level || 0));
        const levelMult = levelMultipliers[lvl];

        const baseRent = Math.floor((tile.price || 1000) * 0.12 * levelMult);

        // Region monopoly calculation
        const regionProperties = mono.tiles.filter(t => t.type === 'property' && t.region === regionId);
        const ownedInRegion = regionProperties.filter(t => mono.properties[t.id] && mono.properties[t.id].owner === owner && !mono.properties[t.id].mortgaged).length;
        const totalInRegion = regionProperties.length;

        let setMultiplier = 1.0;
        if (totalInRegion > 0 && ownedInRegion === totalInRegion) {
            // Full Set Monopoly! Double base rent for Lv0, +50% for improved
            setMultiplier = lvl === 0 ? 2.0 : 1.5;
        } else if (ownedInRegion > 1) {
            // Partial region set bonus (+15% per extra owned property in region)
            setMultiplier = 1.0 + (ownedInRegion - 1) * 0.15;
        }

        const economy = mono.economy || { inflation: 0.03, rentMultiplier: 1 };
        const inflationMultiplier = 1 + (economy.inflation || 0.03);
        const rentMultiplier = economy.rentMultiplier || 1;

        // Player active buffs
        const ownerPlayer = mono.players[owner];
        let buffMultiplier = 1.0;
        if (ownerPlayer) {
            if (ownerPlayer.rentDouble > 0) buffMultiplier *= 2.0;
            if (ownerPlayer.hologramTurns > 0) buffMultiplier *= 1.5;
        }

        let calculatedRent = Math.max(0, Math.floor(baseRent * setMultiplier * inflationMultiplier * rentMultiplier * buffMultiplier));
        // Dynamic Price Cap: rent multiplier / total rent capped at 20% of wealthiest player's money
        const cap = getMaxMoneyCap();
        return Math.min(calculatedRent, cap);
    }


    function generateAllTiles() {
        const tiles = [];
        let tileId = 0;
        // Get map size preference and calculate region tile counts
        const mapSizePref = safeGetItem('mapSizePref', 'medium');
        const targetTotal = MAP_SIZE_PRESETS[mapSizePref]?.total || 156;
        const scaleRatio = targetTotal / 1248;
        // Calculate region counts proportional to target total
        const regionCounts = MONO_REGIONS.map(r => Math.max(8, Math.floor(r.tileCount * scaleRatio)));
        const totalTiles = regionCounts.reduce((s, c) => s + c, 0);
        // Property tiles are placed at fixed intervals; remaining slots filled with random non-property types
        // Property ratio: ~40% of total tiles are properties
        const propertyCount = Math.floor(totalTiles * 0.4);
        // Generate fixed property positions evenly distributed
        const propertyPositions = new Set();
        for (let p = 0; p < propertyCount; p++) {
            propertyPositions.add(Math.floor((p + 0.5) * totalTiles / propertyCount));
        }
        // Pool of non-property tile types for random fill
        const nonPropertyTypes = ['card', 'bonus', 'penalty', 'event', 'bank', 'stock', 'teleport', 'auction', 'upgrade', 'jail', 'casino'];

        for (let r = 0; r < MONO_REGIONS.length; r++) {
            const region = MONO_REGIONS[r];
            const names = REGION_PROPERTY_NAMES[r];
            const count = regionCounts[r];
            for (let i = 0; i < count; i++) {
                const isVeryFirst = tileId === 0;
                let type;
                if (isVeryFirst) {
                    type = 'start';
                } else if (propertyPositions.has(tileId)) {
                    // Fixed property slot
                    type = 'property';
                } else {
                    // Random non-property type from the pool
                    type = nonPropertyTypes[Math.floor(Math.random() * nonPropertyTypes.length)];
                }
                const tile = {
                    id: tileId++,
                    region: r,
                    type: type,
                    ic: TILE_TYPES[type].ic,
                    nm: type === 'property' ? names[Math.floor(Math.random()*names.length)] : TILE_TYPES[type].nm,
                    desc: TILE_TYPES[type].desc,
                };
                if (type === 'property') {
                    tile.price = Math.floor(region.priceMin + Math.random() * (region.priceMax - region.priceMin));
                    tile.rent = Math.floor(tile.price * 0.12); // Base rent Lv0
                }
                if (type === 'bonus') tile.val = Math.floor(region.priceMin * 0.8 + Math.random() * region.priceMin * 0.6);
                if (type === 'penalty') tile.val = Math.floor(region.priceMin * 0.5 + Math.random() * region.priceMin * 0.4);
                tiles.push(tile);
            }
        }
        // Add shortcut tiles at proportional intervals based on map size (2-6 shortcuts depending on map size)
        const shortcutCount = Math.max(2, Math.min(6, Math.floor(tiles.length / 30)));
        const shortcutPositions = [];
        for (let s = 0; s < shortcutCount; s++) {
            shortcutPositions.push(Math.floor((s + 0.5) * tiles.length / shortcutCount));
        }
        for (const pos of shortcutPositions) {
            if (pos < tiles.length && tiles[pos].type !== 'start') {
                // Only replace non-property tiles with shortcuts; if it's a property, skip
                if (tiles[pos].type === 'property') continue;
                const targetPos = (pos + Math.floor(tiles.length * 0.15) + Math.floor(Math.random() * 20)) % tiles.length;
                tiles[pos] = {
                    ...tiles[pos],
                    type: 'shortcut',
                    ic: TILE_TYPES.shortcut.ic,
                    nm: TILE_TYPES.shortcut.nm,
                    desc: TILE_TYPES.shortcut.desc,
                    shortcutTarget: targetPos, // Forward jump target
                };
            }
        }
        return tiles;
    }

    // Randomize tile content after a player completes a full loop (passes start)
    function randomizeTilesAfterLoop(playerIdx) {
        const p = mono.players[playerIdx];
        if (!p) return;
        // Only randomize non-start, non-property-owned tiles
        // Randomize ~15% of tiles each loop for variety
        const total = mono.tiles.length;
        const randomizeCount = Math.floor(total * 0.15);
        const shuffled = [...Array(total).keys()].sort(() => Math.random() - 0.5);
        let randomized = 0;
        for (const idx of shuffled) {
            if (randomized >= randomizeCount) break;
            const tile = mono.tiles[idx];
            const prop = mono.properties[idx];
            // Skip start tile and owned properties
            if (tile.type === 'start') continue;
            if (tile.type === 'property' && prop && prop.owner >= 0) continue;
            // Randomize tile type and content
            const region = MONO_REGIONS[tile.region] || MONO_REGIONS[0];
            const types = ['property', 'card', 'bonus', 'penalty', 'event', 'bank', 'stock', 'casino', 'auction'];
            const newType = types[Math.floor(Math.random() * types.length)];
            tile.type = newType;
            tile.ic = TILE_TYPES[newType].ic;
            tile.nm = newType === 'property' ? REGION_PROPERTY_NAMES[tile.region][Math.floor(Math.random()*REGION_PROPERTY_NAMES[tile.region].length)] : TILE_TYPES[newType].nm;
            tile.desc = TILE_TYPES[newType].desc;
            if (newType === 'property') {
                tile.price = Math.floor(region.priceMin + Math.random() * (region.priceMax - region.priceMin));
                tile.rent = Math.floor(tile.price * 0.12); // Base rent Lv0
                if (prop) { prop.owner = -1; prop.level = 0; prop.mortgaged = false; }
            }
            if (newType === 'bonus') tile.val = Math.floor(region.priceMin * 0.8 + Math.random() * region.priceMin * 0.6);
            if (newType === 'penalty') tile.val = Math.floor(region.priceMin * 0.5 + Math.random() * region.priceMin * 0.4);
            delete tile.shortcutTarget;
            randomized++;
        }
        // Re-add shortcut tiles after randomization (proportional to map size)
        const shortcutCount = Math.max(2, Math.min(6, Math.floor(total / 30)));
        const shortcutPositions = [];
        for (let s = 0; s < shortcutCount; s++) {
            shortcutPositions.push(Math.floor((s + 0.5) * total / shortcutCount));
        }
        for (const pos of shortcutPositions) {
            if (pos < total && mono.tiles[pos].type !== 'start') {
                const prop = mono.properties[pos];
                if (mono.tiles[pos].type === 'property' && prop && prop.owner >= 0) continue;
                const targetPos = (pos + 30 + Math.floor(Math.random() * 40)) % total;
                mono.tiles[pos] = {
                    ...mono.tiles[pos],
                    type: 'shortcut',
                    ic: TILE_TYPES.shortcut.ic,
                    nm: TILE_TYPES.shortcut.nm,
                    desc: TILE_TYPES.shortcut.desc,
                    shortcutTarget: targetPos,
                };
            }
        }
        monoLog(`🔄 地图刷新！${randomized} 个格子内容已随机变化`, 'event');
    }

    function newMonopolyGame() {
        const tiles = generateAllTiles();
        const totalTiles = tiles.length;
        // All players start on the same tile (position 0 — the start tile)
        const startPos = 0;
        // Player count: use setting or random (4-8)
        const playerCountPref = safeGetItem('playerCountPref', 'random');
        let aiCount;
        if (playerCountPref === 'random') {
            aiCount = 3 + Math.floor(Math.random() * 5); // 3 to 7 AI players
        } else {
            aiCount = Math.max(2, Math.min(11, parseInt(playerCountPref) - 1)); // -1 for human player
        }
        // Shuffle EXTRA_PLAYERS and pick aiCount
        const shuffledAi = [...EXTRA_PLAYERS].sort(() => Math.random() - 0.5);
        const selectedAi = shuffledAi.slice(0, aiCount);
        // Build player list: human first, then random AI players
        const allPlayers = [MONO_PLAYERS_INIT[0], ...selectedAi];
        // Randomize AI personalities each game
        const personalityKeys = Object.keys(AI_PERSONALITIES);
        mono = {
            tiles: tiles,
            players: allPlayers.map((p,i) => ({
                ...p,
                // Randomize personality for AI players each game
                personality: p.isHuman ? undefined : personalityKeys[Math.floor(Math.random() * personalityKeys.length)],
                money: Math.floor(14000 - allPlayers.length * 750), pos: startPos, cards: [],
                shield: 0, lucky: 0, speed: 0, doubleDice: 0,
                mirror: 0, confused: 0, rentDouble: 0, interestFree: 0,
                consecutiveDoubles: 0, // Track consecutive doubles for jail mechanic
                diceMultiplier: parseInt(safeGetItem('diceMultiplierPref', '1')) || 1, // Dice multiplier (1x/2x/3x/4x) with risk
                jailFree: false, jailTurns: 0, banned: 0, hospital: 0,
                taxFree: 0, bankrupt: false,
                blackoutTurns: 0, empTurns: 0, hologramTurns: 0, signalJamTurns: 0, slipTurns: 0,
                vehicleDiscount: 0, vehicleDiscountTurns: 0,
                firewallTurns: 0, virusTurns: 0, cloneActive: false, quantumTarget: -1, quantumTurns: 0, overclockNext: false, lockdownTurns: 0,
                loans: [], credit: 100, vehicle: null, vehicles: [],
                stocks: 0, stockAvgCost: 0,
                stockHoldings: STOCK_TYPES.map(s => ({shares: 0, avgCost: 0, leverage: 1, isShort: false})),
                stats: {
                    propertiesBought: 0, purchaseSpent: 0,
                    upgradesDone: 0, upgradeSpent: 0,
                    rentIncomeTotal: 0, rentPaidTotal: 0,
                    rentLog: [], // {from, to, amount, tileNm, turn}
                    stockProfit: 0, stockTrades: 0,
                },
            })),
            currentPlayer: 0,
            dice: [1, 1],
            rolling: false,
            properties: tiles.map(t => t.type === 'property' ? {owner: -1, level: 0} : null),
            log: [],
            turn: 1,
            unlockedEras: MONO_REGIONS.length - 1, // All regions unlocked from start
            started: false,
            stockMarket: 100,
            stockPrices: STOCK_TYPES.map(s => s.basePrice),
            stockLastUpdate: Date.now(),
            economy: null, // Will be calculated by calculateEconomyState()
            pendingAction: null, // Tracks pending AI action for refresh recovery
            autoSaveTurn: 0, // Last auto-saved turn
            humanStats: {
                // Statistical imitation: track human action frequencies
                buyProperty: 0, buyStock: 0, buyVehicle: 0, useCard: 0,
                takeLoan: 0, upgradeProperty: 0, mortgageProperty: 0,
                // Strategy replication: track specific actions for AI to copy
                stockPicks: {}, // {stockIdx: count} — which stocks human buys
                vehiclePicks: {}, // {vehicleId: count}
                // Difficulty adaptation: track human performance
                humanMoneyHistory: [], // Track human money per turn for trend analysis
                humanWins: 0, humanGames: 0,
            },
            eventLog: [], // Track all game events for display
        };
        // Reset news state for new game
        newsState = { active: [], history: [], passiveCooldown: 0, spreadCost: 500 };
        mono.economy = calculateEconomyState();
        if (godModeActive) mono.players[0].money = 20000; // God mode bonus
        monoLog(`🎲 新游戏开始！${allPlayers.length}位玩家在起点就位`, 'info');
        saveMonopoly();
    }

    // Debounced save: prevents excessive localStorage writes during rapid state changes
    let _saveMonoRafId = null;
    let _saveMonoPending = false;
    function saveMonopoly() {
        // If already scheduled, just mark that there's more data to save
        if (_saveMonoRafId) { _saveMonoPending = true; return; }
        _saveMonoPending = true;
        _saveMonoRafId = requestAnimationFrame(() => {
            _saveMonoRafId = null;
            if (!_saveMonoPending) return;
            _saveMonoPending = false;
            try {
                const data = JSON.stringify(mono);
                localStorage.setItem(CONFIG.MONO_SAVE_KEY, data);
                localStorage.setItem('bunny_news_state', JSON.stringify(newsState));
            } catch(e) {
                console.error('[saveMonopoly] Save failed:', e);
                // Try to free up space by removing old event log entries
                if (mono.eventLog && mono.eventLog.length > 50) {
                    mono.eventLog = mono.eventLog.slice(-50);
                    try { localStorage.setItem(CONFIG.MONO_SAVE_KEY, JSON.stringify(mono)); } catch(e2) {}
                }
            }
        });
    }
    // Force immediate save (for critical moments like game start/end)
    function saveMonopolyNow() {
        if (_saveMonoRafId) { cancelAnimationFrame(_saveMonoRafId); _saveMonoRafId = null; }
        _saveMonoPending = false;
        try {
            localStorage.setItem(CONFIG.MONO_SAVE_KEY, JSON.stringify(mono));
            localStorage.setItem('bunny_news_state', JSON.stringify(newsState));
        } catch(e) {
            console.error('[saveMonopolyNow] Save failed:', e);
        }
    }

    function saveInventory() {
        try {
            localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(cardInventory));
        } catch(e) {
            console.error('[saveInventory] Save failed:', e);
            // If quota exceeded, try trimming inventory
            if (cardInventory.length > 30) {
                cardInventory = cardInventory.slice(-30);
                try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(cardInventory)); } catch(e2) {}
            }
        }
    }

    // Flush pending saves when page is about to close/refresh
    function _flushPendingSaves() {
        if (_saveMonoPending) {
            if (_saveMonoRafId) { cancelAnimationFrame(_saveMonoRafId); _saveMonoRafId = null; }
            _saveMonoPending = false;
            try {
                localStorage.setItem(CONFIG.MONO_SAVE_KEY, JSON.stringify(mono));
                localStorage.setItem('bunny_news_state', JSON.stringify(newsState));
            } catch(e) {}
        }
    }
    window.addEventListener('beforeunload', _flushPendingSaves);
    window.addEventListener('pagehide', _flushPendingSaves);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') _flushPendingSaves();
    });

    function getUnlockedTileCount() {
        // All tiles are always unlocked (era system removed)
        return mono.tiles.length;
    }

    function monoLog(msg, type='info') {
        mono.log.push({msg, type});
        if (mono.log.length > 80) mono.log.shift();
        markDirty('log');
    }

    /* ==================== Monopoly: Rendering ==================== */
    // RAF-based render throttling — coalesce multiple render calls into one frame
    