function toggleAutoPilot() {
        if (!mono || !mono.started) { monoLog('游戏未开始', 'error'); return; }
        mono.autoPilot = !mono.autoPilot;
        saveMonopoly();
        renderMonopoly();
        if (mono.autoPilot) {
            monoLog('🤖 全自动托管已开启！将自动交易·升级·用卡·掷骰', 'success');
            showToast('🤖 托管已开启', 'success');
            // If it's our turn, start auto-pilot immediately
            if (mono.currentPlayer === 0 && !mono.rolling) {
                setTimeout(() => executeAutoPilot(), 500);
            }
        } else {
            monoLog('🤖 全自动托管已关闭', 'info');
            showToast('🤖 托管已关闭', 'info');
        }
    }

    function executeAutoPilot() {
        if (!mono || !mono.autoPilot || mono.currentPlayer !== 0 || mono.rolling) return;
        const p = mono.players[0];
        if (!p || p.bankrupt) { mono.autoPilot = false; return; }

        // Auto-handle jail for player 0 in AutoPilot
        if (p.jailTurns > 0) {
            if (p.jailFree) {
                if (typeof window.useJailCardAndRoll === 'function') window.useJailCardAndRoll();
            } else if (p.money >= 500) {
                if (typeof window.payBailAndRoll === 'function') window.payBailAndRoll();
            } else {
                if (typeof window.tryDoubleEscape === 'function') window.tryDoubleEscape();
            }
            return;
        }

        // Step 0: Auto-transfer inventory cards to hand & auto-buy vehicle / draw cards if wealthy
        if (typeof cardInventory !== 'undefined' && Array.isArray(cardInventory) && cardInventory.length > 0) {
            while (cardInventory.length > 0 && p.cards.length < 8) {
                const card = cardInventory.shift();
                restoreCardFunctions(card);
                p.cards.push(card);
                monoLog(`🤖 托管自动将背包卡牌 [${card.ic} ${card.n}] 放置到手牌`, 'info');
            }
            if (typeof saveInventory === 'function') saveInventory();
        }
        // Auto-draw card if wealthy & hand has space
        if (p.cards.length < 6 && p.money >= 5000) {
            const drawn = drawWeightedCard();
            p.money -= 800;
            p.cards.push(drawn);
            monoLog(`🤖 托管自动抽取神级卡牌 [${drawn.ic} ${drawn.n}] (-800💰)`, 'success');
        }
        // Auto-buy vehicle for speed & rent discounts if wealthy
        if (!p.vehicle && p.money >= 4000 && typeof VEHICLES !== 'undefined' && VEHICLES.length > 0) {
            const vehicle = VEHICLES[Math.min(1, VEHICLES.length - 1)];
            if (p.money >= vehicle.price) {
                p.money -= vehicle.price;
                p.vehicle = vehicle;
                monoLog(`🤖 托管自动购入高级载具 [${vehicle.ic} ${vehicle.nm}] (-💰${vehicle.price})`, 'success');
            }
        }
        // Auto-broadcast positive news (News Station feature)
        if (p.money >= 4000 && typeof newsState !== 'undefined' && newsState.active.length === 0 && typeof NEWS_EVENTS !== 'undefined' && NEWS_EVENTS.length > 0) {
            const positiveNews = NEWS_EVENTS.find(n => n.id === 'boom' || n.id === 'bull');
            if (positiveNews) {
                p.money -= 500;
                newsState.active.push({ newsId: positiveNews.id, turnsLeft: positiveNews.duration + 1, effects: positiveNews.effects });
                monoLog(`🤖 托管自动播报新闻 [📺 ${positiveNews.title}] (-500💰)`, 'success');
            }
        }
        // Auto-hire Wizard/Hacker Service against wealthy opponents
        if (p.money >= 6000 && typeof hireHackerService === 'function') {
            const aliveOpponents = mono.players.filter((pl, i) => i !== 0 && !pl.bankrupt);
            if (aliveOpponents.length > 0) {
                const leader = aliveOpponents.reduce((a, b) => (a.money || 0) > (b.money || 0) ? a : b);
                if (leader && (leader.money > p.money || leader.stats?.propertiesBought > 2)) {
                    hireHackerService('freeze', mono.players.indexOf(leader));
                    monoLog(`🤖 托管自动请巫师/黑客客制封印 ${leader.nm} 的核心资产`, 'event');
                }
            }
        }

        // Step 1: Auto-use strategic cards with profit maximization
        if (p.cards && p.cards.length > 0) {
            const curseCards = p.cards.map((c, i) => c.isCurse ? i : -1).filter(i => i >= 0);
            const forceMoveCards = p.cards.map((c, i) => (c.id === 'summon_rent' || c.id === 'mass_summon' || c.id === 'magnetic_field' || c.id === 'tax_audit') ? i : -1).filter(i => i >= 0);
            const defensiveCards = p.cards.map((c, i) => (c.id === 'shield' || c.id === 'mirror') ? i : -1).filter(i => i >= 0);
            const profitBoostCards = p.cards.map((c, i) => (c.id === 'funds_boost' || c.id === 'mega_funds' || c.id === 'god_bless' || c.id === 'card_boost_double' || c.id === 'card_short_market' || c.id === 'upgrade_free') ? i : -1).filter(i => i >= 0);
            const aiOwnsProperties = mono.tiles.some((t, i) => t.type === 'property' && mono.properties[i]?.owner === 0);
            
            // Use up to 2 cards strategically for max ROI
            const cardsToUse = Math.min(p.cards.length, 2);
            for (let round = 0; round < cardsToUse; round++) {
                let cardIdx = -1;
                // Priority 1: Instant money / boost cards
                if (profitBoostCards.length > 0) {
                    cardIdx = profitBoostCards.shift();
                }
                // Priority 2: Forced movement cards if we own properties
                else if (aiOwnsProperties && forceMoveCards.length > 0) {
                    cardIdx = forceMoveCards.shift();
                }
                // Priority 3: Defensive cards if we don't have shield
                else if (p.shield === 0 && defensiveCards.length > 0 && Math.random() < 0.5) {
                    cardIdx = defensiveCards.shift();
                }
                // Priority 4: Curse cards to attack leader
                else if (curseCards.length > 0) {
                    cardIdx = curseCards.shift();
                }
                if (cardIdx < 0 || cardIdx >= p.cards.length) break;
                const card = p.cards[cardIdx];
                p.cards.splice(cardIdx, 1);
                // Adjust remaining indices
                curseCards.forEach((v, i) => { if (v > cardIdx) curseCards[i]--; });
                forceMoveCards.forEach((v, i) => { if (v > cardIdx) forceMoveCards[i]--; });
                defensiveCards.forEach((v, i) => { if (v > cardIdx) defensiveCards[i]--; });
                profitBoostCards.forEach((v, i) => { if (v > cardIdx) profitBoostCards[i]--; });
                restoreCardFunctions(card);
                if (card.monoEff) {
                    if (card.isCurse) {
                        const targets = mono.players.filter((pl, i) => i !== 0 && !pl.bankrupt);
                        if (targets.length > 0) {
                            // Target the wealthiest opponent
                            const target = targets.reduce((a, b) => (a.money || 0) > (b.money || 0) ? a : b);
                            const effResult = card.monoEff(p, mono, target) || '';
                            recordGameEvent('card_curse', `${p.ic} ${p.nm}`, `对 ${target.nm} 施放 ${card.ic} ${card.n}`, effResult);
                            monoLog(`🤖 自动使用 ${card.ic} ${card.n} → ${target.nm} — ${effResult}`, 'event');
                        }
                    } else {
                        const effResult = card.monoEff(p, mono) || '';
                        recordGameEvent('card_use', `${p.ic} ${p.nm}`, `使用 ${card.ic} ${card.n}`, effResult);
                        monoLog(`🤖 自动使用 ${card.ic} ${card.n}${effResult ? ' — ' + effResult : ''}`, 'info');
                    }
                }
            }
            saveMonopoly();
            renderMonopolyPartial(['players', 'cards', 'buff', 'log']);
        }

        // Step 2: Auto-trade stocks (buy low, sell high) — with commission & slippage matching manual trading
        let _apStockTraded = false;
        if (p.stockHoldings && mono.stockPrices) {
            // Auto-sell: check all holdings for profit-taking (≥20% gain)
            for (let i = 0; i < p.stockHoldings.length; i++) {
                const h = p.stockHoldings[i];
                if (!h || h.shares <= 0 || !h.avgCost || h.avgCost <= 0) continue;
                const price = mono.stockPrices[i];
                const profitRatio = h.isShort ? (h.avgCost - price) / h.avgCost : (price - h.avgCost) / h.avgCost;
                if (profitRatio >= 0.20) {
                    const amount = h.shares;
                    const lev = h.leverage || 1;
                    if (h.isShort) {
                        const profit = Math.round((h.avgCost - price) * amount * lev);
                        const marginReturn = Math.ceil(h.avgCost * amount / lev);
                        p.money += marginReturn + profit;
                        p.stats.stockProfit += profit;
                        // Commission on sale value
                        const commission = Math.ceil(price * amount * STOCK_COMMISSION_RATE);
                        p.money -= commission;
                        // Slippage: selling pushes price down
                        const sellSlippage = 1 - amount * 0.005 - STOCK_SLIPPAGE_RATE * Math.min(amount, 20);
                        mono.stockPrices[i] = Math.max(STOCK_TYPES[i].basePrice * 0.25, Math.floor(mono.stockPrices[i] * sellSlippage));
                        monoLog(`🤖 自动止盈做空 ${amount} 股 ${STOCK_TYPES[i].ic}，+💰${profit}（手续费${commission}）`, 'success');
                        h.shares = 0; h.avgCost = 0; h.leverage = 1; h.isShort = false;
                    } else {
                        const profit = Math.round((price - h.avgCost) * amount * lev);
                        const marginReturn = Math.ceil(h.avgCost * amount / lev);
                        p.money += marginReturn + profit;
                        p.stats.stockProfit += profit;
                        // Commission on sale value
                        const commission = Math.ceil(price * amount * STOCK_COMMISSION_RATE);
                        p.money -= commission;
                        // Slippage: selling pushes price down
                        const sellSlippage = 1 - amount * 0.005 - STOCK_SLIPPAGE_RATE * Math.min(amount, 20);
                        mono.stockPrices[i] = Math.max(STOCK_TYPES[i].basePrice * 0.25, Math.floor(mono.stockPrices[i] * sellSlippage));
                        monoLog(`🤖 自动止盈卖出 ${amount} 股 ${STOCK_TYPES[i].ic}，+💰${profit}（手续费${commission}）`, 'success');
                        h.shares = 0; h.avgCost = 0; h.leverage = 1;
                    }
                    p.stats.stockTrades++;
                    mono.stockMarket = getStockIndex();
                    _apStockTraded = true;
                }
            }
            // Auto-buy: find the best discounted stock (price < 80% of base)
            let bestBuyIdx = -1, bestRatio = Infinity;
            for (let i = 0; i < STOCK_TYPES.length; i++) {
                const stock = STOCK_TYPES[i];
                const price = mono.stockPrices[i];
                const h = p.stockHoldings[i];
                const ratio = price / stock.basePrice;
                if (h.shares > 0 || h.isShort) continue;
                if (ratio < bestRatio && ratio < 0.80 && p.money > price * 10) {
                    bestRatio = ratio;
                    bestBuyIdx = i;
                }
            }
            if (bestBuyIdx >= 0) {
                const price = mono.stockPrices[bestBuyIdx];
                const amount = Math.floor(p.money * 0.15 / price);
                if (amount > 0) {
                    const margin = Math.ceil(price * amount);
                    const h = p.stockHoldings[bestBuyIdx];
                    h.avgCost = h.shares > 0 ? Math.round((h.avgCost * h.shares + price * amount) / (h.shares + amount)) : price;
                    h.shares += amount;
                    h.isShort = false;
                    h.leverage = 1;
                    p.money -= margin;
                    // Commission on margin
                    const commission = Math.ceil(margin * STOCK_COMMISSION_RATE);
                    p.money -= commission;
                    // Slippage: buying pushes price up
                    const buySlippage = 1 + amount * 0.005 + STOCK_SLIPPAGE_RATE * Math.min(amount, 20);
                    mono.stockPrices[bestBuyIdx] = Math.min(STOCK_TYPES[bestBuyIdx].basePrice * 2.5, Math.floor(mono.stockPrices[bestBuyIdx] * buySlippage));
                    p.stats.stockTrades++;
                    monoLog(`🤖 自动买入 ${amount} 股 ${STOCK_TYPES[bestBuyIdx].ic}（折扣${Math.round((1-bestRatio)*100)}%，手续费${commission}）`, 'info');
                    mono.stockMarket = getStockIndex();
                    _apStockTraded = true;
                }
            }
            if (_apStockTraded) { saveMonopoly(); renderMonopolyPartial(['players', 'log']); }
        }

        // Step 3: Auto-roll dice after a short delay
        setTimeout(() => {
            if (mono.autoPilot && mono.currentPlayer === 0 && !mono.rolling) {
                rollDice();
            }
        }, 600);
    }

    // Auto-pilot hook for modals: auto-handle buy/upgrade/skip decisions
    function autoPilotHandleModal() {
        if (!mono || !mono.autoPilot || mono.currentPlayer !== 0) return false;
        const p = mono.players[0];
        if (p.jailTurns > 0) {
            if (p.jailFree) { if (typeof window.useJailCardAndRoll === 'function') window.useJailCardAndRoll(); }
            else if (p.money >= 500) { if (typeof window.payBailAndRoll === 'function') window.payBailAndRoll(); }
            else { if (typeof window.tryDoubleEscape === 'function') window.tryDoubleEscape(); }
            return true;
        }
        const tile = mono.tiles[p.pos];
        if (!tile) return false;

        // Auto-buy property: Maximize ROI and Region Monopolies
        if (tile.type === 'property' && (mono.properties[p.pos]?.owner === -1 || mono.properties[p.pos]?.owner === undefined)) {
            const prop = mono.properties[p.pos];
            const cost = tile.price;
            // Check if buying completes or expands a region monopoly
            const regionId = tile.region;
            const regProps = mono.tiles.filter(t => t.type === 'property' && t.region === regionId);
            const ownedInReg = regProps.filter(t => mono.properties[t.id]?.owner === 0).length;
            const isMonopolyPiece = regProps.length > 0 && (ownedInReg + 1 >= regProps.length * 0.5);

            // Buy if affordable and (is a monopoly piece OR cost <= 60% of money OR cost < 5000)
            if (prop && p.money >= cost && (isMonopolyPiece || cost < p.money * 0.6 || cost < 5000)) {
                prop.owner = 0;
                p.money -= cost;
                p.stats.propertiesBought = (p.stats.propertiesBought || 0) + 1;
                p.stats.purchaseSpent = (p.stats.purchaseSpent || 0) + cost;
                recordHumanAction('buyProperty');
                monoLog(`🤖 自动智购 ${tile.nm} (-💰${cost})${isMonopolyPiece ? ' 🔥[套系垄断首选]' : ''}`, 'success');
                closeModal();
                saveMonopoly();
                renderMonopoly();
                if (!checkGameOver()) nextTurn();
                return true;
            }
            monoLog(`🤖 自动跳过购买 ${tile.nm}（保留运营资金）`, 'info');
            skipBuy();
            return true;
        }
        // Auto-upgrade: upgrade the most valuable property owned
        if (tile.type === 'upgrade') {
            const owned = [];
            for (let i = 0; i < mono.tiles.length; i++) {
                if (mono.tiles[i].type === 'property' && mono.properties[i]?.owner === 0 && (mono.properties[i]?.level || 0) < 5) {
                    owned.push(i);
                }
            }
            if (owned.length > 0) {
                owned.sort((a, b) => mono.tiles[b].price - mono.tiles[a].price);
                const tileIdx = owned[0];
                const cost = Math.floor(mono.tiles[tileIdx].price * 0.3);
                if (p.money >= cost) {
                    upgradeProperty(tileIdx, cost);
                    return true;
                }
            }
            skipBuy();
            return true;
        }
        // Auto-handle Bank modal: pay off high interest debt if wealthy
        if (tile.type === 'bank') {
            if (p.money >= 8000 && p.debt > 0 && typeof repayLoan === 'function') {
                repayLoan(Math.min(p.debt, Math.floor(p.money * 0.4)));
                monoLog(`🤖 托管自动还清银行还款 (-💰${p.debt})`, 'success');
            }
            skipBuy();
            return true;
        }
        // Auto-handle Stock, Auction, Casino, Event & Info modals (All Screenshot features fully automated)
        if (tile.type === 'auction') {
            skipBuy();
            return true;
        }
        if (tile.type === 'stock') {
            if (typeof closeStockModal === 'function') closeStockModal();
            else skipBuy();
            return true;
        }
        if (tile.type === 'casino') {
            if (p.money >= 10000 && typeof betCasino === 'function') {
                betCasino(500, 'big'); // Smart casino bet
                monoLog('🤖 托管在赌场小试身手 (投注 500💰)', 'info');
            } else {
                leaveCasino();
            }
            return true;
        }
        // Auto-close card draw and event modals (effects already applied)
        if (tile.type === 'card' || tile.type === 'event') {
            closeModal();
            saveMonopoly();
            if (!checkGameOver()) nextTurn();
            return true;
        }
        return false;
    }

    function renderMonoCards() {
        const el = document.getElementById('mono-cards');
        if (!el) return;
        const p = mono.players[0];
        if (!p || !p.cards || p.cards.length === 0) {
            el.innerHTML = '<div style="font-size:.7rem;color:var(--text2);">暂无手牌</div>';
            return;
        }
        el.innerHTML = p.cards.map((c, i) =>
            `<div class="mono-card-item${c.enhanced ? ' enhanced' : ''}" style="${c.enhanced ? 'border:1.5px solid #FFD700;box-shadow:0 0 10px rgba(255,215,0,0.6);background:rgba(255,215,0,0.15);' : ''}" onclick="monoUseCard(${i})" title="${c.desc}${c.enhanced ? ' (✨ 已强化效果倍增)' : ''}">
                <span>${c.ic}</span>
                <span style="font-size:.5rem;font-weight:700;color:${RARITY_COLORS[c.rarity]||'#fff'};">${c.n}${c.enhanced ? '✨' : ''}</span>
                <span class="mc-desc">${c.enhanced ? '✨【已强化】' + c.desc : c.desc}</span>
            </div>`
        ).join('');
    }

    function renderMonoInventory() {
        const el = document.getElementById('mono-inventory');
        if (!el) return;
        if (cardInventory.length === 0) {
            el.innerHTML = '<div style="font-size:.7rem;color:var(--text2);">背包为空，去首页抽卡吧！</div>';
            return;
        }
        el.innerHTML = '<div style="font-size:.65rem;color:var(--text2);margin-bottom:.2rem;">单击查看 · 双击快速移到手牌</div>' +
            cardInventory.map((c, i) =>
            `<div class="mono-card-item" onclick="handleCardInventoryClick(${i})" title="${c.desc}">
                <span>${c.ic}</span>
                <span style="font-size:.5rem;font-weight:700;color:${RARITY_COLORS[c.rarity]};">${c.n}</span>
                <span class="mc-desc">${c.desc}</span>
            </div>`
        ).join('');
    }

    function renderMonoLog() {
        const el = document.getElementById('mono-log');
        if (!el) return;
        el.innerHTML = mono.log.slice(-8).map(l =>
            `<div class="log-line ${l.type}">${l.msg}</div>`
        ).join('');
        el.scrollTop = el.scrollHeight;
    }

    function renderMonoStats() {
        const propEl = document.getElementById('mono-property-stats');
        const rentEl = document.getElementById('mono-rent-stats');
        if (!propEl && !rentEl) return;
        const p = mono.players[0];
        if (!p || !p.stats) return;
        const s = p.stats;

        // Count owned properties
        let ownedCount = 0, totalLevels = 0, propValue = 0;
        const myProps = []; // {idx, tile, prop}
        mono.tiles.forEach((t, i) => {
            const prop = mono.properties[i];
            if (t.type === 'property' && prop && prop.owner === 0) {
                ownedCount++;
                totalLevels += prop.level;
                propValue += t.price * (prop.level + 1);
                myProps.push({ idx: i, tile: t, prop });
            }
        });

        if (propEl) {
            // Build clickable property list
            const propListHtml = myProps.length > 0
                ? myProps.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;padding:.25rem .4rem;background:var(--card2);border-radius:6px;cursor:pointer;margin-top:.2rem;transition:all var(--transition);" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='transparent'" onclick="locateTile(${p.idx})">
                    <span style="font-size:.75rem;">${p.tile.ic} ${p.tile.nm} ${p.prop.level > 0 ? `<span style="color:var(--good);font-size:.65rem;">Lv${p.prop.level}</span>` : ''}</span>
                    <span style="font-size:.7rem;color:var(--accent);font-weight:700;">💰${p.tile.price}</span>
                </div>`).join('')
                : '<div style="font-size:.7rem;color:var(--text2);padding:.3rem 0;">还没有购买任何房产</div>';

            propEl.innerHTML = `
                <div class="stat-row"><span class="stat-label">🏠 持有地产</span><span class="stat-value">${ownedCount} 块</span></div>
                <div class="stat-row"><span class="stat-label">🏗️ 总升级数</span><span class="stat-value">Lv ${totalLevels}</span></div>
                <div class="stat-row"><span class="stat-label">🛒 购买次数</span><span class="stat-value">${s.propertiesBought}</span></div>
                <div class="stat-row"><span class="stat-label">💸 购买花费</span><span class="stat-value">💰${s.purchaseSpent}</span></div>
                <div class="stat-row"><span class="stat-label">⬆️ 升级次数</span><span class="stat-value">${s.upgradesDone}</span></div>
                <div class="stat-row"><span class="stat-label">💸 升级花费</span><span class="stat-value">💰${s.upgradeSpent}</span></div>
                <div class="stat-row"><span class="stat-label">💎 地产总值</span><span class="stat-value" style="color:var(--good);">💰${propValue}</span></div>
                <div class="mono-section-title" style="margin-top:.5rem;font-size:.7rem;">📋 我的房产明细（点击跳转）</div>
                ${propListHtml}
            `;
        }

        if (rentEl) {
            // Rent log: show who paid rent to me
            const recentRenters = s.rentLog.slice(-6).reverse();
            // Aggregate rent by payer
            const rentByPayer = {};
            s.rentLog.forEach(r => {
                if (!rentByPayer[r.from]) rentByPayer[r.from] = { ic: r.fromIc, total: 0, count: 0 };
                rentByPayer[r.from].total += r.amount;
                rentByPayer[r.from].count++;
            });
            const payerList = Object.entries(rentByPayer).map(([nm, d]) =>
                `<div style="display:flex;justify-content:space-between;align-items:center;padding:.2rem 0;">
                    <span style="font-size:.75rem;">${d.ic} ${nm} <span style="color:var(--text2);font-size:.6rem;">(${d.count}次)</span></span>
                    <span style="font-size:.75rem;font-weight:700;color:var(--good);">+💰${d.total}</span>
                </div>`
            ).join('');

            rentEl.innerHTML = `
                <div class="stat-row"><span class="stat-label">💰 租金总收入</span><span class="stat-value" style="color:var(--good);">💰${s.rentIncomeTotal}</span></div>
                <div class="stat-row"><span class="stat-label">💸 租金总支出</span><span class="stat-value" style="color:var(--bad);">💰${s.rentPaidTotal}</span></div>
                <div class="stat-row"><span class="stat-label">📊 净租金收益</span><span class="stat-value" style="color:${s.rentIncomeTotal - s.rentPaidTotal >= 0 ? 'var(--good)' : 'var(--bad)'};">💰${s.rentIncomeTotal - s.rentPaidTotal}</span></div>
                ${payerList ? '<div class="mono-section-title" style="margin-top:.5rem;font-size:.7rem;">👥 谁路过了你的房子</div>' + payerList : '<div style="font-size:.7rem;color:var(--text2);padding:.3rem 0;">还没有人付过租金</div>'}
            `;
        }
    }

    function renderStockPortfolio() {
        const el = document.getElementById('mono-stock-portfolio');
        if (!el) return;
        const p = mono.players[0];
        if (!p) return;
        const totalShares = getTotalStockShares(p);
        const plValue = getStockPortfolioValue(p);
        if (totalShares > 0) {
            el.innerHTML = `持有 ${totalShares} 股 | 盈亏 ${plValue >= 0 ? '+' : ''}💰${plValue} | <span style="color:var(--accent);text-decoration:underline;cursor:pointer;" onclick="openStockExchange()">点击交易</span>`;
        } else {
            el.innerHTML = `<span style="color:var(--text2);">无持仓 | </span><span style="color:var(--accent);text-decoration:underline;cursor:pointer;" onclick="openStockExchange()">点击交易</span>`;
        }
    }

    function showJailOptionsModal() {
        const p = mono.players[0];
        const canPay = p.money >= 500;
        const hasCard = p.jailFree;

        showModal(`<div class="modal-title">🔒 处于监禁中</div>
            <div style="text-align:center;padding:.5rem 0;">
                <div style="font-size:2.5rem;">⚖️</div>
                <div style="font-weight:700;">请选择本回合出狱方式</div>
                <div style="font-size:.75rem;color:var(--text2);margin-top:.2rem;">剩余监禁回合：${p.jailTurns} | 你的资金：💰${p.money}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:.4rem;margin-top:.5rem;">
                <button class="btn btn-primary" onclick="payBailAndRoll()" ${!canPay ? 'disabled' : ''}>💵 支付保释金 (💰500)</button>
                <button class="btn btn-primary" onclick="useJailCardAndRoll()" ${!hasCard ? 'disabled' : ''}>🔑 使用出狱卡</button>
                <button class="btn btn-secondary" onclick="tryDoubleEscape()">🎲 尝试掷双数越狱 (不消耗金币)</button>
                <button class="btn btn-secondary" onclick="stayInJailPass()">⏳ 放弃本回合 (等待自然解禁)</button>
            </div>`);
    }

    window.payBailAndRoll = function() {
        const p = mono.players[0];
        if (p.money < 500) return;
        p.money -= 500;
        p.jailTurns = 0;
        monoLog(`💵 支付 500💰 保释金成功出狱！`, 'success');
        closeModal();
        rollDice();
    };

    window.useJailCardAndRoll = function() {
        const p = mono.players[0];
        if (!p.jailFree) return;
        p.jailFree = false;
        p.jailTurns = 0;
        monoLog(`🔑 使用出狱卡成功出狱！`, 'success');
        closeModal();
        rollDice();
    };

    window.tryDoubleEscape = function() {
        const p = mono.players[0];
        closeModal();
        mono.rolling = true;
        renderMonopoly();
        mono.dice = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
        if (mono.dice[0] === mono.dice[1]) {
            p.jailTurns = 0;
            monoLog(`🎲 成功掷出双数 [${mono.dice[0]},${mono.dice[1]}]！免费出狱！`, 'success');
            showToast('🎲 掷出双数！免费出狱！', 'success');
            const total = mono.dice[0] + mono.dice[1];
            movePlayer(0, total);
        } else {
            p.jailTurns = Math.max(0, p.jailTurns - 1);
            monoLog(`🔒 未能掷出双数 [${mono.dice[0]},${mono.dice[1]}]，越狱失败，暂停一回合（剩${p.jailTurns}回合）`, 'error');
            showToast('越狱失败！未掷出双数', 'error');
            mono.rolling = false;
            saveMonopoly();
            renderMonopoly();
            setTimeout(() => nextTurn(), 600);
        }
    };

    window.stayInJailPass = function() {
        const p = mono.players[0];
        p.jailTurns = Math.max(0, p.jailTurns - 1);
        monoLog(`🔒 ${p.nm} 在监狱中，暂停一回合（剩${p.jailTurns}回合）`, 'error');
        closeModal();
        saveMonopoly();
        nextTurn();
    };

    /* ==================== Monopoly: Turn Logic ==================== */
    function rollDice() {
        if (mono.rolling || mono.currentPlayer !== 0) return;
        const p = mono.players[0];
        if (p.bankrupt) { nextTurn(); return; }
        // Jail check: present choice to pay bail, use card, or try rolling doubles
        if (p.jailTurns > 0) {
            showJailOptionsModal();
            return;
        }
        // Banned check (seal curse)
        if (p.banned > 0) {
            p.banned--;
            monoLog(`🚫 ${p.nm} 被封印，暂停一回合（剩${p.banned}回合）`, 'error');
            saveMonopoly();
            nextTurn();
            return;
        }
        // Hospital check
        if (p.hospital > 0) {
            p.hospital--;
            monoLog(`🏥 ${p.nm} 在医院治疗，暂停一回合（剩${p.hospital}回合）`, 'error');
            saveMonopoly();
            nextTurn();
            return;
        }
        mono.rolling = true;
        mono.started = true;
        renderMonopoly();
        if (typeof _triggerMobileDiceAnim === 'function') _triggerMobileDiceAnim();

        let rolls = 0;
        const interval = setInterval(() => {
            mono.dice = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
            renderMonopoly();
            rolls++;
            if (rolls >= 8) {
                clearInterval(interval);
                const isDouble = mono.dice[0] === mono.dice[1];
                let total = mono.dice[0] + mono.dice[1];
                // Lucky 7 Combo Skill
                if (mono.dice[0] + mono.dice[1] === 7) {
                    p.money += 800;
                    monoLog('🎯 触发「幸运 7」点数神技！获得 +800💰 现金红利', 'success');
                    if (Math.random() < 0.35 && p.cards.length < 8) {
                        const newCard = drawWeightedCard();
                        p.cards.push(newCard);
                        monoLog(`🎁 幸运 7 额外赠送手牌: ${newCard.ic} ${newCard.n}`, 'success');
                    }
                }
                const extra = p.speed || 0;
                if (extra) p.speed = 0;
                if (p.doubleDice > 0) { total *= 2; p.doubleDice--; monoLog('🎲 双倍骰子卡激活！', 'success'); }
                // Overclock: double dice (v9306)
                if (p.overclockNext) { total *= 2; p.overclockNext = false; monoLog('🔧 超频激活！骰子翻倍！', 'success'); }
                // EMP effect: halve dice total
                if (p.empTurns > 0) { total = Math.ceil(total / 2); monoLog('💥 EMP脉冲效果！骰子减半', 'error'); }
                // Slip (banana peel): add 3 extra steps
                if (p.slipTurns > 0) { total += 3; p.slipTurns = 0; monoLog('🍌 踩到香蕉皮！多走3步', 'event'); }
                // Vehicle speed bonus (disabled by blackout)
                const vehicleSpeed = (p.blackoutTurns > 0) ? 0 : getVehicleBonus(p, 'speed');
                if (vehicleSpeed) { total += vehicleSpeed; monoLog(`${p.vehicle.ic} 载具加速 +${vehicleSpeed}`, 'success'); }
                if (p.blackoutTurns > 0 && p.vehicle) { monoLog('⚡ 停电！载具加成失效', 'error'); }

                // Dice multiplier with risk
                const mult = p.diceMultiplier || 1;
                if (mult > 1) {
                    const failChance = mult === 2 ? 0.25 : mult === 3 ? 0.35 : 0.45;
                    if (Math.random() < failChance) {
                        monoLog(`💥 倍率掷骰失败！×${mult} 风险触发，原地不动`, 'error');
                        // Keep diceMultiplier — player's choice is remembered per design spec
                        mono.rolling = false;
                        saveMonopoly();
                        renderMonopoly();
                        setTimeout(() => nextTurn(), 500);
                        return;
                    }
                    total *= mult;
                    monoLog(`⚡ 倍率成功！步数 ×${mult} = ${total}`, 'success');
                }
                // p.diceMultiplier = 1; // Removed: keep memory

                // Consecutive doubles tracking (jail on 3rd double)
                if (isDouble) {
                    p.consecutiveDoubles = (p.consecutiveDoubles || 0) + 1;
                    if (p.consecutiveDoubles >= 3) {
                        monoLog(`🚔 ${p.nm} 连续3次双数！直接进监狱！`, 'error');
                        p.jailTurns = 2;
                        p.consecutiveDoubles = 0;
                        p.pos = mono.tiles.findIndex(t => t.type === 'jail');
                        if (p.pos < 0) p.pos = 0;
                        mono.rolling = false;
                        saveMonopoly();
                        renderMonopoly();
                        setTimeout(() => nextTurn(), 500);
                        return;
                    }
                    p._extraTurn = true; // Grant extra turn
                    monoLog(`🎲 双数！${p.consecutiveDoubles}/3 — 获得额外回合`, 'success');
                } else {
                    p.consecutiveDoubles = 0;
                }

                // Confused effect — random direction
                if (p.confused > 0) {
                    p.confused--;
                    if (Math.random() < 0.5) { total = -total; monoLog('😵 混乱效果触发！反向移动', 'error'); }
                }
                movePlayer(0, total + extra);
            }
        }, 80);
    }

    function movePlayer(playerIdx, steps) {
        const p = mono.players[playerIdx];
        if (!p || p.bankrupt) { nextTurn(); return; }
        const oldPos = p.pos;
        const total = getUnlockedTileCount();
        // Handle backward movement (confused effect) — wrap around correctly
        let newPos = (p.pos + steps) % total;
        if (newPos < 0) newPos += total; // Fix JS modulo for negative numbers

        // === Passing Rent: charge reduced rent for tiles passed through (not landed on) ===
        if (steps > 0 && !(p.taxFree > 0)) {
            const economy = mono.economy || calculateEconomyState();
            const rentMultiplier = economy.rentMultiplier || 1;
            for (let s = 1; s <= Math.abs(steps); s++) {
                const passPos = (oldPos + s) % total;
                if (passPos === newPos) continue; // Skip destination — handled by triggerTile
                const passTile = mono.tiles[passPos];
                const passProp = mono.properties[passPos];
                if (!passTile || !passProp || passTile.type !== 'property') continue;
                if (passProp.owner < 0 || passProp.owner === playerIdx || passProp.mortgaged) continue;
                const owner = mono.players[passProp.owner];
                if (!owner || owner.bankrupt) continue;
                // 35% chance to collect passing rent — mixed system
                if (Math.random() > 0.35) continue;
                // Passing rent = 30% of normal rent
                const baseRent = Math.floor(passTile.price * (0.12 + (passProp.level || 0) * 0.02));
                const passRent = Math.max(0, Math.floor(baseRent * 0.3 * rentMultiplier * (0.8 + Math.random() * 0.4)));
                if (passRent <= 0) continue;
                // Shield blocks passing rent
                if (p.shield > 0) { p.shield--; monoLog(`🛡️ ${p.nm} 护盾抵消过路费！`, 'success'); continue; }
                // Mirror reflects passing rent
                if (p.mirror > 0) {
                    p.mirror--;
                    owner.money -= passRent;
                    p.money += passRent;
                    monoLog(`🪞 ${p.nm} 经过 ${passTile.nm}，镜像反射过路费给 ${owner.nm}`, 'event');
                    checkBankruptcy(owner);
                    continue;
                }
                // Vehicle rent immunity
                const immuneChance = (p.blackoutTurns > 0) ? 0 : getVehicleBonus(p, 'rentImmune');
                if (immuneChance && Math.random() < immuneChance) continue;
                const actualRent = Math.min(passRent, p.money);
                p.money -= actualRent;
                owner.money += actualRent;
                p.stats.rentPaidTotal += actualRent;
                owner.stats.rentIncomeTotal += actualRent;
                monoLog(`${p.ic} 经过 ${passTile.nm}，向 ${owner.ic} 付过路费 ${actualRent}💰`, 'info');
                checkBankruptcy(p);
                if (p.bankrupt) break;
            }
        }

        p.pos = newPos;

        // Pass start bonus (only when moving forward past start)
        if (steps > 0) {
            const laps = Math.floor((oldPos + steps) / total);
            if (laps > 0) {
                const bonus = 2000 * laps;
                p.money += bonus;
                monoLog(`${p.ic} ${p.nm} 经过起点，获得 ${bonus}💰`, 'success');
                // Randomize tiles after completing a full loop
                randomizeTilesAfterLoop(playerIdx);
            }
        }

        mono.rolling = false;
        monoLog(`${p.ic} ${p.nm} 移动 ${steps} 步 → ${mono.tiles[p.pos].nm}`, 'info');
        mono.pendingAction = 'triggerTile';
        saveMonopoly();
        renderMonopoly();
        // Delay animation trigger to ensure DOM is updated after RAF render
        setTimeout(() => { if (typeof _triggerMobilePlayerMoveAnim === 'function') _triggerMobilePlayerMoveAnim(playerIdx); }, 20);
        setTimeout(() => { try { triggerTile(playerIdx); } catch(e) { console.error('[triggerTile Error]', e); if (mono.currentPlayer !== 0) { _clearWatchdog(); nextTurn(); } } }, 400);
    }

    function triggerTile(playerIdx) {
        const p = mono.players[playerIdx];
        if (!p || p.bankrupt) { nextTurn(); return; }
        const tile = mono.tiles[p.pos];
        if (!tile) { nextTurn(); return; }
        // Clear pending action — tile trigger has started
        mono.pendingAction = null;
        saveMonopoly();

        // Auto-pilot: automatically handle tile events for human player
        if (mono.autoPilot && playerIdx === 0) {
            // For tiles that show modals, auto-handle them
            const modalTypes = ['property', 'bank', 'stock', 'auction', 'upgrade', 'casino', 'card', 'event'];
            if (modalTypes.includes(tile.type)) {
                setTimeout(() => {
                    if (mono.autoPilot && playerIdx === 0) {
                        autoPilotHandleModal();
                    }
                }, 500);
            }
        }

        switch(tile.type) {
            case 'start':
                p.money += 1000;
                monoLog(`${p.ic} 到达起点 +1000💰`, 'success');
                break;
            case 'bonus': {
                let bonus = tile.val || 1000;
                if (p.lucky > 0) { bonus *= 2; p.lucky--; monoLog(`🍀 幸运翻倍！`, 'success'); }
                p.money += bonus;
                recordGameEvent('bonus', `${p.ic} ${p.nm}`, '奖励格', `获得 ${bonus}💰`);
                monoLog(`${p.ic} 获得 ${bonus}💰`, 'success');
                break;
            }
            case 'penalty':
                if (p.shield > 0) { p.shield--; monoLog(`🛡️ ${p.nm} 护盾抵消伤害！`, 'success'); recordGameEvent('penalty', `${p.ic} ${p.nm}`, '惩罚格', '护盾抵消'); break; }
                p.money -= (tile.val || 800);
                recordGameEvent('penalty', `${p.ic} ${p.nm}`, '惩罚格', `失去 ${tile.val||800}💰`);
                monoLog(`${p.ic} 失去 ${tile.val||800}💰`, 'error');
                checkBankruptcy(p);
                break;
            case 'card': {
                const card = drawWeightedCard();
                p.cards.push(card);
                recordGameEvent('card_draw', `${p.ic} ${p.nm}`, `抽到 ${card.ic} ${card.n}`, card.desc);
                monoLog(`${p.ic} 抽到 ${card.ic} ${card.n} — ${card.desc}`, 'success');
                if (playerIdx === 0) {
                    showCardDrawModal(card, p);
                    return;
                }
                break;
            }
            case 'event': {
                const ev = pickRandomEvent();
                const effResult = ev.eff(mono, p) || '';
                checkBankruptcy(p);
                const rarityTag = ev.rarity === 'legendary' ? '✨传说' : ev.rarity === 'rare' ? '💎稀有' : ev.rarity === 'uncommon' ? '🔵不凡' : '';
                recordGameEvent('event', `${p.ic} ${p.nm}`, `${rarityTag} ${ev.ic} ${ev.nm}`, effResult || ev.desc);
                monoLog(`🎲 随机事件: ${rarityTag} ${ev.ic} ${ev.nm} — ${effResult || ev.desc}`, 'info');
                if (playerIdx === 0) {
                    showEventModal(ev, p, effResult);
                    return;
                } else {
                    // Show brief toast for AI events
                    showToast(`🎲 ${p.ic} ${p.nm}: ${ev.ic} ${ev.nm}`, 'info');
                }
                break;
            }
            case 'teleport':
                p.pos = Math.floor(Math.random() * getUnlockedTileCount());
                monoLog(`🔄 ${p.nm} 传送到 ${mono.tiles[p.pos].nm}`, 'info');
                break;
            case 'bank':
                if (playerIdx === 0) {
                    showBankModal();
                    return; // Don't auto-end turn, wait for modal
                } else {
                    aiBankDecision(p);
                }
                break;
            case 'stock': {
                // Refresh stock prices when landing on stock tile
                refreshStockPrices();
                // Dividend for long-position holders when index is high
                if (p.stockHoldings && mono.stockMarket > 120) {
                    let totalDividend = 0;
                    let totalShares = 0;
                    for (let si = 0; si < STOCK_TYPES.length; si++) {
                        const h = p.stockHoldings[si];
                        if (h.shares > 0 && !h.isShort) {
                            const div = Math.floor(h.shares * mono.stockPrices[si] * 0.03 * (mono.stockMarket / 100));
                            totalDividend += div;
                            totalShares += h.shares;
                        }
                    }
                    if (totalDividend > 0) {
                        p.money += totalDividend;
                        p.stats.stockProfit += totalDividend;
                        monoLog(`${p.ic} 📈 分红收益 +${totalDividend}💰 (持有${totalShares}股)`, 'success');
                    }
                }
                if (playerIdx === 0) {
                    showStockModal();
                    return; // Wait for player to trade
                } else {
                    aiStockDecision(p);
                }
                break;
            }
            case 'auction':
                if (handleAuction(playerIdx)) return; // Modal shown, wait for player
                break;
            case 'upgrade':
                if (handleUpgradeTile(playerIdx)) return; // Modal shown, wait for player
                break;
            case 'jail':
                if (p.jailFree) {
                    p.jailFree = false;
                    recordGameEvent('jail', `${p.ic} ${p.nm}`, '监狱格', '使用出狱卡免于监禁');
                    monoLog(`${p.ic} 使用出狱卡，免于监禁`, 'success');
                } else {
                    if (p.cloneActive) { p.cloneActive = false; monoLog(`👤 ${p.nm} 的虚拟分身吸收了监禁效果！`, 'success'); }
                    else { p.jailTurns = 1; recordGameEvent('jail', `${p.ic} ${p.nm}`, '监狱格', '被关进监狱暂停一回合'); monoLog(`${p.ic} 被关进监狱，暂停一回合`, 'error'); }
                }
                break;
            case 'casino':
                monoLog(`${p.ic} 🎰 来到赌场格！`, 'info');
                if (playerIdx === 0) {
                    showCasino(true);
                    return; // Wait for player to finish
                } else {
                    // AI gambles — simple bet
                    const aiBet = Math.min(p.money, CASINO_MIN_BET * (1 + Math.floor(Math.random() * 3)));
                    if (aiBet >= CASINO_MIN_BET && Math.random() < 0.4) {
                        const diceTotal = Math.floor(Math.random() * 16) + 3;
                        const aiWon = diceTotal >= 11;
                        if (aiWon) {
                            p.money += aiBet;
                            monoLog(`${p.ic} 🎰 赌场赢了 +💰${aiBet}`, 'success');
                        } else {
                            p.money -= aiBet;
                            monoLog(`${p.ic} 🎰 赌场输了 -💰${aiBet}`, 'info');
                        }
                    }
                }
                break;
            case 'shortcut': {
                // Flight chess-style shortcut: jump forward to target position
                const target = tile.shortcutTarget || ((p.pos + 50) % getUnlockedTileCount());
                const jumped = (target - p.pos + getUnlockedTileCount()) % getUnlockedTileCount();
                monoLog(`✈️ ${p.ic} 发现捷径！飞行前进 ${jumped} 格`, 'success');
                p.pos = target;
                saveMonopoly();
                renderMonopoly();
                // Trigger the landing tile after shortcut
                setTimeout(() => { try { triggerTile(playerIdx); } catch(e) { console.error('[Shortcut triggerTile Error]', e); if (mono.currentPlayer !== 0) { _clearWatchdog(); nextTurn(); } } }, 400);
                return; // Don't proceed to normal nextTurn
            }
            case 'property': {
                if (!mono.properties[p.pos]) {
                    mono.properties[p.pos] = { owner: -1, level: 0, mortgaged: false };
                }
                const prop = mono.properties[p.pos];
                if (prop.owner === -1 || prop.owner === undefined) {
                    if (playerIdx === 0 && p.money >= tile.price) {
                        showBuyModal(p.pos);
                        return; // Wait for player decision
                    } else if (playerIdx !== 0) {
                        const personality = AI_PERSONALITIES[p.personality];
                        const aiDiff = getAIDifficulty(); // AI learning: difficulty adaptation
                        if (p.money >= tile.price && p.lockdownTurns === 0 && Math.random() < personality.buyChance * aiDiff) {
                            prop.owner = playerIdx;
                            p.money -= tile.price;
                            p.stats.propertiesBought = (p.stats.propertiesBought || 0) + 1;
                            p.stats.purchaseSpent = (p.stats.purchaseSpent || 0) + tile.price;
                            monoLog(`${p.ic} 购买了 ${tile.nm}`, 'success');
                        }
                    }
                } else if (prop.owner !== playerIdx && prop.owner >= 0) {
                    // Mortgaged properties don't collect rent
                    if (prop.mortgaged) {
                        monoLog(`🏠 ${tile.nm} 已被抵押，免租金通过`, 'info');
                    } else if (p.taxFree > 0) {
                        p.taxFree--;
                        monoLog(`🧾 ${p.nm} 免税卡生效，免付租金`, 'success');
                    } else {
                        let rent = calculateRent(tile, prop);
                        const owner = mono.players[prop.owner];
                        if (owner.rentDouble > 0) {
                            monoLog(`🏘️ ${owner.nm} 的收租令加持！租金倍增`, 'event');
                        }
                        if (owner.hologramTurns > 0) {
                            monoLog(`🎭 ${owner.nm} 的全息伪装加持！租金+50%`, 'event');
                        }
                        // Blackout: vehicle bonuses disabled
                        const rentDiscount = (p.blackoutTurns > 0) ? 0 : getVehicleBonus(p, 'rentDiscount');
                        if (rentDiscount) {
                            rent = Math.floor(rent * (1 - rentDiscount));
                            monoLog(`${p.vehicle.ic} 载具减免租金 ${Math.round(rentDiscount*100)}%`, 'success');
                        }
                        // Vehicle rent immunity chance (disabled by blackout)
                        const immuneChance = (p.blackoutTurns > 0) ? 0 : getVehicleBonus(p, 'rentImmune');
                        if (immuneChance && Math.random() < immuneChance) {
                            monoLog(`${p.vehicle.ic} 载具免疫本次租金！`, 'success');
                            break;
                        }
                        if (p.shield > 0) { p.shield--; monoLog(`🛡️ 护盾抵消租金！`, 'success'); break; }
                        // Mirror reflection — bounce negative effect back
                        if (p.mirror > 0) {
                            p.mirror--;
                            owner.money -= rent;
                            p.money += rent;
                            monoLog(`🪞 ${p.nm} 镜像反射！租金反弹给 ${owner.nm}`, 'event');
                            checkBankruptcy(owner);
                            break;
                        }
                        p.money -= rent;
                        owner.money += rent;
                        // Track rent stats
                        p.stats.rentPaidTotal += rent;
                        owner.stats.rentIncomeTotal += rent;
                        owner.stats.rentLog.push({
                            from: p.nm, fromIc: p.ic,
                            to: owner.nm,
                            amount: rent, tileNm: tile.nm,
                            turn: mono.turn,
                        });
                        if (owner.stats.rentLog.length > 50) owner.stats.rentLog.shift();
                        monoLog(`${p.ic} 向 ${owner.ic} 付租金 ${rent}💰 (${tile.nm})`, 'error');
                        checkBankruptcy(p);
                    }
                }
                break;
            }
        }

        saveMonopoly();
        renderMonopoly();
        if (!checkGameOver()) nextTurn();
    }

    function autoLiquidateAssets(p) {
        const pi = mono.players.indexOf(p);
        if (pi < 0) return;
        const economy = mono.economy || { mortgageRatio: 0.5 };
        const mortgageRatio = economy.mortgageRatio || 0.5;

        // 1. Sell stock holdings
        if (p.stockHoldings) {
            for (let si = 0; si < STOCK_TYPES.length; si++) {
                const h = p.stockHoldings[si];
                if (h.shares > 0) {
                    const price = mono.stockPrices ? mono.stockPrices[si] : 100;
                    const lev = h.leverage || 1;
                    const marginReturn = Math.ceil(h.avgCost * h.shares / lev);
                    const pnl = Math.round(h.isShort ? (h.avgCost - price) * h.shares * lev : (price - h.avgCost) * h.shares * lev);
                    const total = Math.max(0, marginReturn + pnl);
                    p.money += total;
                    h.shares = 0; h.avgCost = 0;
                    monoLog(`📈 ${p.ic} 变卖 ${STOCK_TYPES[si].nm} 筹集 💰${total}`, 'warn');
                    if (p.money >= 0) return;
                }
            }
        }

        // 2. Sell property levels (houses/hotels)
        for (let i = 0; i < mono.tiles.length; i++) {
            if (mono.tiles[i].type === 'property' && mono.properties[i] && mono.properties[i].owner === pi && mono.properties[i].level > 0) {
                while (mono.properties[i].level > 0 && p.money < 0) {
                    mono.properties[i].level--;
                    const refund = Math.floor(mono.tiles[i].price * 0.15);
                    p.money += refund;
                    monoLog(`🏚️ ${p.ic} 拆卸 ${mono.tiles[i].nm} 房屋筹集 💰${refund}`, 'warn');
                    if (p.money >= 0) return;
                }
            }
        }

        // 3. Mortgage properties
        for (let i = 0; i < mono.tiles.length; i++) {
            if (mono.tiles[i].type === 'property' && mono.properties[i] && mono.properties[i].owner === pi && !mono.properties[i].mortgaged) {
                mono.properties[i].mortgaged = true;
                const val = Math.floor(mono.tiles[i].price * mortgageRatio);
                p.money += val;
                monoLog(`🔒 ${p.ic} 抵押 ${mono.tiles[i].nm} 筹集 💰${val}`, 'warn');
                if (p.money >= 0) return;
            }
        }

        // 4. Sell active vehicle and garage vehicles
        if (p.vehicle) {
            const refund = Math.floor((VEHICLE_POOL.find(v => v.id === p.vehicle.id) || {price:0}).price * 0.3);
            p.money += refund;
            p.vehicle = null;
            monoLog(`🚗 ${p.ic} 出售载具筹集 💰${refund}`, 'warn');
            if (p.money >= 0) return;
        }
        // Sell garage vehicles
        if (p.vehicles && p.vehicles.length > 0) {
            for (let vi = p.vehicles.length - 1; vi >= 0; vi--) {
                const v = p.vehicles[vi];
                const refund = Math.floor((VEHICLE_POOL.find(vp => vp.id === v.id) || {price:0}).price * 0.3);
                p.money += refund;
                monoLog(`🚗 ${p.ic} 出售车库载具筹集 💰${refund}`, 'warn');
                p.vehicles.splice(vi, 1);
                if (p.money >= 0) return;
            }
        }
    }

    function checkBankruptcy(p) {
        if (!p || p.bankrupt) return;
        // Bankruptcy rule: money <= 0 triggers asset liquidation & loans. If still <= 0, declare bankruptcy!
        if (p.money <= 0) {
            // First attempt auto-liquidation of assets (stocks, buildings, mortgage properties, vehicles)
            autoLiquidateAssets(p);

            // If still <= 0, try emergency bank loan
            if (p.money <= 0) {
                const propValue = getPlayerPropertyValue(p);
                const economy = mono.economy || calculateEconomyState();
                if (propValue > 0 && p.credit > 30) {
                    const loanAmount = Math.abs(p.money) + 1000;
                    p.money += loanAmount;
                    p.loans.push({amount: loanAmount, remaining: 5, rate: economy.loanRateBase + 0.02 + (100 - p.credit) * 0.001, type: 'mortgage'});
                    p.credit = Math.max(10, p.credit - 20);
                    monoLog(`${p.ic} 紧急贷款 ${loanAmount}💰，信用下降`, 'warn');
                }
            }

            // If money is STILL <= 0 after all liquidations & emergency loans, declare bankruptcy!
            if (p.money <= 0) {
                p.money = 0;
                p.bankrupt = true;
                const pi = mono.players.indexOf(p);
                monoLog(`☠️ ${p.ic} ${p.nm} 资金归零资不抵债，宣布破产！`, 'error');
                // Release all properties so other players can land on and buy them
                mono.properties.forEach((prop, idx) => {
                    if (prop && prop.owner === pi) {
                        prop.owner = -1;
                        prop.level = 0;
                        prop.mortgaged = false;
                        if (mono.tiles[idx]) mono.tiles[idx].owner = null;
                    }
                });
                // Release vehicle
                p.vehicle = null;
                p.vehicles = [];
                // Clear stocks
                if (p.stockHoldings) p.stockHoldings.forEach(h => { h.shares = 0; h.avgCost = 0; });
                // Clear all debts
                p.loans = [];
                // Clear all status effects
                p.shield = 0; p.lucky = 0; p.speed = 0; p.mirror = 0;
                p.confused = 0; p.banned = 0; p.hospital = 0; p.jailTurns = 0;
                p.rentDouble = 0; p.interestFree = 0; p.taxFree = 0; p.doubleDice = 0;
                p.blackoutTurns = 0; p.empTurns = 0; p.hologramTurns = 0; p.signalJamTurns = 0; p.slipTurns = 0; p.vehicleDiscount = 0; p.vehicleDiscountTurns = 0;
                p.firewallTurns = 0; p.virusTurns = 0; p.cloneActive = false; p.quantumTarget = -1; p.quantumTurns = 0; p.overclockNext = false; p.lockdownTurns = 0;
                p.cards = []; // Clear hand cards on bankruptcy
                p._extraTurn = false; // Clear extra turn flag
                monoLog(`💀 ${p.ic} ${p.nm} 破产离场！所有地产资产已全数释放，可供其他玩家购买`, 'error');
            }
        }
    }

    function getPlayerPropertyValue(p) {
        if (!p || !mono || !mono.players || !mono.properties) return 0;
        const pi = mono.players.indexOf(p);
        if (pi < 0) return 0;
        let total = 0;
        mono.tiles.forEach((t, i) => {
            if (t && t.type === 'property' && mono.properties[i]?.owner === pi) {
                total += (t.price || 0) * ((mono.properties[i]?.level || 0) + 1);
            }
        });
        return total;
    }

    function checkGameOver() {
        const alive = mono.players.filter(p => !p.bankrupt);
        if (alive.length <= 1 && mono.started) {
            mono.started = false;
            monoLog(`🏆 ${alive[0]?.ic} ${alive[0]?.nm} 获胜！`, 'success');
            logEvent(`🏆 大富翁游戏结束 — ${alive[0]?.nm} 获胜！`, 'success');
            renderMonopoly();
            return true;
        }
        return false;
    }

    /* ==================== Monopoly: Buy Property ==================== */
    function showBuyModal(pos) {
        const tile = mono.tiles[pos];
        const p = mono.players[0];
        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🏠 购买地产？</div>
            <div style="text-align:center;padding:1rem 0;">
                <div style="font-size:2rem;">${tile.ic}</div>
                <div style="font-weight:800;font-size:1.1rem;">${tile.nm}</div>
                <div style="font-size:.8rem;color:var(--text2);margin-top:.25rem;">${tile.desc}</div>
                <div style="margin-top:.5rem;font-size:.9rem;">买价：💰${tile.price} | 基础租金：💰${tile.rent}</div>
                <div style="font-size:.8rem;color:var(--text2);">你的资金：💰${p.money}</div>
            </div>
            <div style="display:flex;gap:.5rem;justify-content:center;margin-top:1rem;">
                <button class="btn btn-primary" onclick="buyProperty(${pos})">✅ 购买</button>
                <button class="btn btn-secondary" onclick="skipBuy()">❌ 跳过</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function buyProperty(pos) {
        const tile = mono.tiles[pos];
        const p = mono.players[0];
        if (p.lockdownTurns > 0) { monoLog('🌐 区域封锁中！无法购买地产', 'error'); showToast('🌐 区域封锁中！', 'error'); closeModal(); skipBuy(); return; }
        if (p.money < tile.price) { monoLog('资金不足！', 'error'); showToast('资金不足！', 'error'); closeModal(); skipBuy(); return; }
        mono.properties[pos].owner = 0;
        p.money -= tile.price;
        p.stats.propertiesBought++;
        p.stats.purchaseSpent += tile.price;
        recordHumanAction('buyProperty');
        monoLog(`🐰 购买了 ${tile.nm}！(-💰${tile.price})`, 'success');
        showToast(`✓ 购买 ${tile.nm}！-💰${tile.price}`, 'success');
        closeModal();
        saveMonopoly();
        renderMonopoly();
        if (!checkGameOver()) nextTurn();
    }

    function skipBuy() {
        closeModal();
        const p = mono.players[mono.turn];
        if (p && !p.bankrupt) {
            const tile = mono.map[p.pos];
            if (tile && tile.type === 'property' && !tile.owner && tile.price > 0) {
                monoLog(`📢 ${p.nm} 放弃原价购买 [${tile.nm}]，发领地公开竞拍！`, 'info');
                startEnhancedAuction(p.pos, mono.turn);
                return;
            }
        }
        saveMonopoly();
        if (!checkGameOver()) nextTurn();
    }

    /* ==================== Monopoly: Bank & Loans ==================== */
    function showBankModal() {
        const p = mono.players[0];
        const propValue = getPlayerPropertyValue(p);
        const totalDebt = p.loans.reduce((s, l) => s + l.amount, 0);
        const economy = mono.economy || calculateEconomyState();
        const mortgageRatio = economy.mortgageRatio;
        const maxLoan = Math.max(0, Math.floor(propValue * mortgageRatio) - totalDebt); // Dynamic mortgage ratio
        const creditLoanMax = Math.floor(p.credit * economy.creditMultiplier); // Dynamic credit multiplier
        const loanRate = economy.loanRateBase + (100 - p.credit) * 0.001;
        const creditRate = loanRate + 0.04; // Credit loans are higher rate
        const nextPayment = p.loans.length > 0 ? p.loans[0] : null;
        const nextPayAmount = nextPayment ? Math.floor(nextPayment.amount * nextPayment.rate / 5) + Math.floor(nextPayment.amount / 5) : 0;

        // Build loan list
        let loanListHtml = '';
        if (p.loans.length > 0) {
            loanListHtml = '<div style="margin-top:.5rem;padding:.5rem;background:var(--card2);border-radius:8px;">';
            p.loans.forEach((l, i) => {
                const pay = Math.floor(l.amount * l.rate / 5) + Math.floor(l.amount / 5);
                const canFull = p.money >= l.amount;
                const canPartial = p.money >= pay;
                const extendFee = Math.floor(l.amount * 0.05);
                loanListHtml += `<div style="padding:.3rem 0;${i < p.loans.length-1 ? 'border-bottom:1px solid var(--border);' : ''}">
                    <div style="font-size:.75rem;">${l.type === 'credit' ? '💳' : '🏠'} 💰${l.amount} @ ${(l.rate*100).toFixed(1)}% (${l.remaining}回合)</div>
                    <div style="display:flex;gap:.2rem;margin-top:.2rem;">
                        <button class="btn btn-sm btn-secondary" style="flex:1;" onclick="showPartialRepay(${i})" ${!canPartial ? 'disabled' : ''}>部分还</button>
                        <button class="btn btn-sm btn-primary" style="flex:1;" onclick="repaySingleLoan(${i})" ${!canFull ? 'disabled' : ''}>全还💰${l.amount}</button>
                        <button class="btn btn-sm btn-secondary" style="flex:1;" onclick="extendLoan(${i})" ${p.money < extendFee ? 'disabled' : ''} title="延期2回合，费用💰${extendFee}">延期+2</button>
                    </div>
                </div>`;
            });
            loanListHtml += '</div>';
        }

        // Build mortgage list: owned properties that can be mortgaged or unmortgaged
        const myProps = [];
        mono.tiles.forEach((t, i) => {
            const prop = mono.properties[i];
            if (t.type === 'property' && prop && prop.owner === 0) {
                myProps.push({ idx: i, tile: t, prop });
            }
        });
        let mortgageHtml = '';
        if (myProps.length > 0) {
            mortgageHtml = `<div style="margin-top:.5rem;padding:.5rem;background:var(--card2);border-radius:8px;"><div style="font-size:.7rem;color:var(--text2);margin-bottom:.3rem;">🏠 房产抵押（获得买价${Math.round(mortgageRatio*100)}%，赎回需${Math.round(mortgageRatio*100+5)}%）</div>`;
            myProps.forEach(({ idx, tile, prop }) => {
                const mortgageValue = Math.floor(tile.price * mortgageRatio);
                const unmortgageCost = Math.floor(tile.price * (mortgageRatio + 0.05));
                if (prop.mortgaged) {
                    mortgageHtml += `<div style="display:flex;justify-content:space-between;font-size:.7rem;padding:.2rem 0;align-items:center;">
                        <span>🔒 ${tile.ic} ${tile.nm}</span>
                        <button class="btn btn-sm btn-secondary" onclick="unmortgageProperty(${idx})" ${p.money < unmortgageCost ? 'disabled' : ''}>赎回 💰${unmortgageCost}</button>
                    </div>`;
                } else {
                    mortgageHtml += `<div style="display:flex;justify-content:space-between;font-size:.7rem;padding:.2rem 0;align-items:center;">
                        <span>${tile.ic} ${tile.nm}</span>
                        <button class="btn btn-sm btn-secondary" onclick="mortgageProperty(${idx})">抵押 💰${mortgageValue}</button>
                    </div>`;
                }
            });
            mortgageHtml += '</div>';
        }

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🏦 兔兔银行</div>
            <div style="text-align:center;padding:.5rem 0;">
                <div style="font-size:.9rem;">你的资金：💰${p.money}</div>
                <div style="font-size:.8rem;color:var(--text2);">信用评分：${p.credit} ${p.credit >= 80 ? '⭐' : p.credit >= 50 ? '👍' : '⚠️'}</div>
                <div style="font-size:.8rem;color:var(--text2);">地产总值：💰${propValue}</div>
                <div style="font-size:.8rem;color:var(--text2);">当前负债：💰${totalDebt}</div>
                <div style="font-size:.7rem;color:var(--text2);margin-top:.15rem;">通胀率：${(economy.inflation*100).toFixed(1)}% | 基准利率：${(economy.loanRateBase*100).toFixed(1)}%</div>
                <div style="font-size:.8rem;color:var(--accent);margin-top:.25rem;">可贷额度：💰${maxLoan} (抵押率${Math.round(mortgageRatio*100)}%)</div>
                ${nextPayment ? `<div style="font-size:.7rem;color:var(--warn);margin-top:.15rem;">下回合还款：💰${nextPayAmount}</div>` : ''}
            </div>
            ${loanListHtml}
            ${mortgageHtml}
            <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.75rem;">
                <button class="btn btn-primary" onclick="showBankMortgagePanel()" ${maxLoan<=0?'disabled':''}>🏠 批量抵押贷款 (可贷💰${maxLoan})</button>
                <button class="btn btn-primary" onclick="showCreditLoanPanel()" ${p.credit<40?'disabled':''}>💳 信用贷 (最高💰${creditLoanMax}, 无需抵押)</button>
                <button class="btn btn-secondary" onclick="repayLoan()" ${totalDebt<=0||p.money<totalDebt?'disabled':''}>💰 还清所有贷款 (需💰${totalDebt})</button>
                <button class="btn btn-secondary" onclick="closeBankModal()">离开银行</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    /* Bulk mortgage panel: select multiple properties to mortgage at once */
    function showBankMortgagePanel() {
        const p = mono.players[0];
        const economy = mono.economy || calculateEconomyState();
        const mortgageRatio = economy.mortgageRatio;
        const totalDebt = p.loans.reduce((s, l) => s + l.amount, 0);
        const propValue = getPlayerPropertyValue(p);

        // Get unmortgaged properties owned by player
        const myProps = [];
        mono.tiles.forEach((t, i) => {
            const prop = mono.properties[i];
            if (t.type === 'property' && prop && prop.owner === 0 && !prop.mortgaged) {
                myProps.push({ idx: i, tile: t, prop, mortgageValue: Math.floor(t.price * mortgageRatio) });
            }
        });

        if (myProps.length === 0) {
            monoLog('无可抵押的房产', 'error');
            return;
        }

        const maxLoan = Math.max(0, Math.floor(propValue * mortgageRatio) - totalDebt);
        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🏠 批量抵押房产</div>
            <div style="text-align:center;padding:.3rem 0;font-size:.8rem;color:var(--text2);">
                抵押率：${Math.round(mortgageRatio*100)}% | 当前负债：💰${totalDebt} | 最大可贷：💰${maxLoan}
            </div>
            <div style="max-height:300px;overflow-y:auto;margin:.5rem 0;padding:.5rem;background:var(--card2);border-radius:8px;">
                ${myProps.map(({ idx, tile, mortgageValue }) => `
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:.75rem;padding:.3rem 0;border-bottom:1px solid var(--border);">
                        <label style="display:flex;align-items:center;gap:.3rem;cursor:pointer;">
                            <input type="checkbox" class="mortgage-checkbox" data-idx="${idx}" data-value="${mortgageValue}" onchange="updateMortgageSummary()">
                            <span>${tile.ic} ${tile.nm} 💰${tile.price}</span>
                        </label>
                        <span style="color:var(--accent);">可贷 💰${mortgageValue}</span>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;padding:.5rem;background:var(--card);border-radius:8px;font-size:.85rem;">
                <span>已选 <strong id="mortgage-count">0</strong> 处</span>
                <span>可贷 <strong id="mortgage-total" style="color:var(--accent);">💰0</strong></span>
            </div>
            <div style="display:flex;gap:.5rem;margin-top:.75rem;">
                <button class="btn btn-secondary" style="flex:1;" onclick="selectAllMortgage()">全选</button>
                <button class="btn btn-primary" style="flex:2;" onclick="confirmBulkMortgage()">确认抵押贷款</button>
                <button class="btn btn-secondary" style="flex:1;" onclick="showBankModal()">返回</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function updateMortgageSummary() {
        const checkboxes = document.querySelectorAll('.mortgage-checkbox:checked');
        let total = 0;
        checkboxes.forEach(cb => { total += parseInt(cb.dataset.value); });
        const countEl = document.getElementById('mortgage-count');
        const totalEl = document.getElementById('mortgage-total');
        if (countEl) countEl.textContent = checkboxes.length;
        if (totalEl) totalEl.textContent = '💰' + total;
    }

    function selectAllMortgage() {
        document.querySelectorAll('.mortgage-checkbox').forEach(cb => cb.checked = true);
        updateMortgageSummary();
    }

    function confirmBulkMortgage() {
        const p = mono.players[0];
        const economy = mono.economy || calculateEconomyState();
        const mortgageRatio = economy.mortgageRatio;
        const rate = economy.loanRateBase + (100 - p.credit) * 0.001;
        const checkboxes = document.querySelectorAll('.mortgage-checkbox:checked');
        if (checkboxes.length === 0) {
            monoLog('请选择至少一处房产', 'error');
            return;
        }
        let totalLoan = 0;
        const selectedIndices = [];
        checkboxes.forEach(cb => {
            const idx = parseInt(cb.dataset.idx);
            const value = parseInt(cb.dataset.value);
            totalLoan += value;
            selectedIndices.push(idx);
        });
        // Mark properties as mortgaged
        selectedIndices.forEach(idx => {
            mono.properties[idx].mortgaged = true;
        });
        p.money += totalLoan;
        p.loans.push({ amount: totalLoan, remaining: 5, rate, type: 'mortgage' });
        p.credit = Math.max(10, p.credit - 5);
        monoLog(`🏦 批量抵押 ${selectedIndices.length} 处房产，获得 💰${totalLoan}，利率 ${(rate*100).toFixed(1)}%`, 'info');
        showBankModal();
        saveMonopoly();
    }

    function takeLoan(amount) {
        const p = mono.players[0];
        if (amount <= 0) { monoLog('无地产可做抵押', 'error'); return; }
        // Check existing debt to prevent infinite loans
        const economy = mono.economy || calculateEconomyState();
        const propValue = getPlayerPropertyValue(p);
        const totalDebt = p.loans.reduce((s, l) => s + l.amount, 0);
        const realMaxLoan = Math.max(0, Math.floor(propValue * economy.mortgageRatio) - totalDebt);
        if (amount > realMaxLoan) {
            monoLog(`贷款额度超出！当前可贷：💰${realMaxLoan}`, 'error');
            showBankModal();
            return;
        }
        const rate = economy.loanRateBase + (100 - p.credit) * 0.001;
        p.money += amount;
        p.loans.push({amount, remaining: 5, rate, type: 'mortgage'});
        p.credit = Math.max(10, p.credit - 5);
        recordHumanAction('takeLoan');
        monoLog(`🏦 兔可可贷款 ${amount}💰，利率 ${(rate*100).toFixed(1)}%`, 'info');
        showBankModal(); // Refresh modal instead of closing
        saveMonopoly();
    }

    /* Partial repayment panel: pay a custom amount to reduce loan principal */
    function showPartialRepay(loanIdx) {
        const p = mono.players[0];
        const loan = p.loans[loanIdx];
        if (!loan) return;
        const minPay = Math.max(100, Math.floor(loan.amount * 0.1));
        const maxPay = Math.min(loan.amount, p.money);
        const suggested = Math.min(maxPay, Math.floor(loan.amount / 2));

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">💰 部分还款</div>
            <div style="text-align:center;padding:.4rem 0;">
                <div style="font-size:.9rem;">贷款余额：💰${loan.amount}</div>
                <div style="font-size:.8rem;color:var(--text2);">利率 ${(loan.rate*100).toFixed(1)}% | 剩余 ${loan.remaining} 回合</div>
                <div style="font-size:.8rem;color:var(--accent);">你的资金：💰${p.money}</div>
            </div>
            <div style="padding:.5rem;background:var(--card2);border-radius:8px;margin-top:.3rem;">
                <div style="font-size:.75rem;color:var(--text2);margin-bottom:.3rem;">还款金额：💰<strong id="repay-amt-val" style="color:var(--accent);">${suggested}</strong></div>
                <input type="range" id="repay-slider" min="${minPay}" max="${maxPay}" value="${suggested}" step="50" style="width:100%;accent-color:var(--accent);" oninput="document.getElementById('repay-amt-val').textContent=this.value">
                <div style="display:flex;justify-content:space-between;font-size:.6rem;color:var(--text2);">
                    <span>最低 💰${minPay}</span><span>最高 💰${maxPay}</span>
                </div>
            </div>
            <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                <button class="btn btn-secondary" style="flex:1;" onclick="showBankModal()">取消</button>
                <button class="btn btn-primary" style="flex:2;" onclick="confirmPartialRepay(${loanIdx})">确认部分还款</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function confirmPartialRepay(loanIdx) {
        const p = mono.players[0];
        const loan = p.loans[loanIdx];
        if (!loan) return;
        const slider = document.getElementById('repay-slider');
        const amount = parseInt(slider ? slider.value : 0);
        if (amount < 100 || amount > p.money || amount > loan.amount) {
            monoLog('还款金额无效', 'error'); return;
        }
        p.money -= amount;
        loan.amount -= amount;
        // Credit recovery proportional to repayment
        const creditGain = Math.floor(amount / 2000) + 2;
        p.credit = Math.min(100 + Math.floor(amount / 1000), p.credit + creditGain);
        monoLog(`💰 部分还款 💰${amount}，贷款余额降至 💰${loan.amount}，信用+${creditGain}`, 'success');
        // Remove loan if fully repaid
        if (loan.amount <= 0) {
            p.loans.splice(loanIdx, 1);
            monoLog(`✓ 该笔贷款已还清`, 'success');
        }
        showBankModal();
        saveMonopoly();
    }

    /* Extend loan term by 2 rounds for a fee (5% of loan amount) */
    function extendLoan(loanIdx) {
        const p = mono.players[0];
        const loan = p.loans[loanIdx];
        if (!loan) return;
        const fee = Math.floor(loan.amount * 0.05);
        if (p.money < fee) { monoLog('资金不足以支付延期费', 'error'); return; }
        p.money -= fee;
        loan.remaining += 2;
        p.credit = Math.max(10, p.credit - 5);
        monoLog(`⏳ 贷款延期 2 回合，费用 💰${fee}，信用-5`, 'warn');
        showBankModal();
        saveMonopoly();
    }

    /* Credit loan panel: choose custom loan amount */
    function showCreditLoanPanel() {
        const p = mono.players[0];
        const economy = mono.economy || calculateEconomyState();
        const creditLoanMax = Math.floor(p.credit * economy.creditMultiplier);
        if (creditLoanMax <= 0) { monoLog('信用评分不足，无法申请信用贷', 'error'); return; }
        const rate = economy.loanRateBase + 0.04 + (100 - p.credit) * 0.002;
        const minLoan = 500;

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">💳 信用贷款</div>
            <div style="text-align:center;padding:.4rem 0;">
                <div style="font-size:.8rem;color:var(--text2);">信用评分：${p.credit} | 当前资金：💰${p.money}</div>
                <div style="font-size:.75rem;color:var(--text2);">利率 ${(rate*100).toFixed(1)}% | 3回合还清</div>
                <div style="font-size:.7rem;color:var(--warn);">注意：信用贷利率高于抵押贷，请量力而行</div>
            </div>
            <div style="padding:.5rem;background:var(--card2);border-radius:8px;margin-top:.3rem;">
                <div style="font-size:.75rem;color:var(--text2);margin-bottom:.3rem;">贷款金额：💰<strong id="credit-amt-val" style="color:var(--accent);">${creditLoanMax}</strong></div>
                <input type="range" id="credit-slider" min="${minLoan}" max="${creditLoanMax}" value="${creditLoanMax}" step="100" style="width:100%;accent-color:var(--accent);" oninput="document.getElementById('credit-amt-val').textContent=this.value">
                <div style="display:flex;justify-content:space-between;font-size:.6rem;color:var(--text2);">
                    <span>最低 💰${minLoan}</span><span>最高 💰${creditLoanMax}</span>
                </div>
            </div>
            <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                <button class="btn btn-secondary" style="flex:1;" onclick="showBankModal()">取消</button>
                <button class="btn btn-primary" style="flex:2;" onclick="confirmCreditLoan()">确认贷款</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function confirmCreditLoan() {
        const p = mono.players[0];
        const economy = mono.economy || calculateEconomyState();
        const creditLoanMax = Math.floor(p.credit * economy.creditMultiplier);
        const slider = document.getElementById('credit-slider');
        const amount = parseInt(slider ? slider.value : creditLoanMax);
        if (amount < 500 || amount > creditLoanMax) {
            monoLog('贷款金额无效', 'error'); return;
        }
        const rate = economy.loanRateBase + 0.04 + (100 - p.credit) * 0.002;
        p.money += amount;
        p.loans.push({amount, remaining: 3, rate, type: 'credit'});
        p.credit = Math.max(10, p.credit - 15);
        monoLog(`💳 信用贷款 💰${amount}，利率 ${(rate*100).toFixed(1)}%，3回合还清`, 'info');
        showBankModal();
        saveMonopoly();
    }

    /* Credit loan: no collateral, based on credit score, shorter term */
    function takeCreditLoan() {
        const p = mono.players[0];
        const economy = mono.economy || calculateEconomyState();
        const creditLoanMax = Math.floor(p.credit * economy.creditMultiplier);
        if (creditLoanMax <= 0) { monoLog('信用评分不足，无法申请信用贷', 'error'); return; }
        const rate = economy.loanRateBase + 0.04 + (100 - p.credit) * 0.002; // Higher rate than mortgage
        p.money += creditLoanMax;
        p.loans.push({amount: creditLoanMax, remaining: 3, rate, type: 'credit'});
        p.credit = Math.max(10, p.credit - 15);
        monoLog(`💳 信用贷款 ${creditLoanMax}💰，利率 ${(rate*100).toFixed(1)}%，3回合还清`, 'info');
        showBankModal();
        saveMonopoly();
    }

    function repaySingleLoan(idx) {
        const p = mono.players[0];
        const loan = p.loans[idx];
        if (!loan || p.money < loan.amount) { monoLog('资金不足', 'error'); return; }
        p.money -= loan.amount;
        p.loans.splice(idx, 1);
        // Credit recovery: allow exceeding 100 based on loan amount
        p.credit = Math.min(100 + Math.floor(loan.amount / 1000), p.credit + 5 + Math.floor(loan.amount / 2000));
        monoLog(`💰 还清一笔贷款 💰${loan.amount}，信用恢复至 ${p.credit}`, 'success');
        showBankModal();
        saveMonopoly();
    }

    function repayLoan() {
        const p = mono.players[0];
        const totalDebt = p.loans.reduce((s, l) => s + l.amount, 0);
        if (p.money < totalDebt) { monoLog('资金不足以偿还全部贷款', 'error'); return; }
        const loansCleared = p.loans.length;
        p.money -= totalDebt;
        p.loans = [];
        // Credit recovery: allow exceeding 100 based on total repaid
        p.credit = Math.min(100 + Math.floor(totalDebt / 1000), p.credit + 10 + Math.floor(totalDebt / 2000));
        monoLog(`💰 兔可可还清 ${loansCleared} 笔贷款 (💰${totalDebt})，信用恢复至 ${p.credit}`, 'success');
        showBankModal(); // Refresh modal instead of closing
        saveMonopoly();
        renderMonopoly();
    }

    function closeBankModal() {
        closeModal();
        if (mono.voluntaryVisit) { mono.voluntaryVisit = false; return; }
        if (!checkGameOver()) nextTurn();
    }

    /* ---- Voluntary bank entry (doesn't consume turn) ---- */
    function openBank() {
        if (mono.currentPlayer !== 0) { monoLog('等待其他玩家行动...', 'info'); return; }
        mono.voluntaryVisit = true;
        showBankModal();
    }

    function aiBankDecision(p) {
        const personality = AI_PERSONALITIES[p.personality];
        const propValue = getPlayerPropertyValue(p);
        const economy = mono.economy || calculateEconomyState();
        const totalDebt = p.loans.reduce((s, l) => s + l.amount, 0);
        const maxLoan = Math.max(0, Math.floor(propValue * economy.mortgageRatio) - totalDebt); // Dynamic mortgage ratio
        if (totalDebt > 0 && p.money > totalDebt * 1.5) {
            p.money -= totalDebt;
            p.loans = [];
            p.credit = Math.min(100 + Math.floor(totalDebt / 1000), p.credit + 10);
            monoLog(`${p.ic} 还清贷款`, 'info');
        } else if (p.money < 2000 && maxLoan > 0 && Math.random() < personality.loanChance) {
            const rate = economy.loanRateBase + (100 - p.credit) * 0.001;
            p.money += maxLoan;
            p.loans.push({amount: maxLoan, remaining: 5, rate, type: 'mortgage'});
            p.credit = Math.max(10, p.credit - 10);
            monoLog(`${p.ic} 申请贷款 ${maxLoan}💰`, 'info');
        }
    }

    /* ---- Property mortgage system ---- */
    /* ==================== Vehicle System ==================== */
    function getVehicleBonus(p, bonusType) {
        if (!p.vehicle) return 0;
        const v = p.vehicle;
        if (v.bonus.type === 'allInOne') {
            if (bonusType === 'speed') return v.bonus.val;
            if (bonusType === 'rentDiscount') return 0.5;
            if (bonusType === 'rentImmune') return 0.15;
        }
        if (v.bonus.type === bonusType) return v.bonus.val;
        return 0;
    }

    function showVehicleShop() {
        if (mono.currentPlayer !== 0) { monoLog('等待其他玩家行动...', 'info'); return; }
        const p = mono.players[0];
        const currentVehicle = p.vehicle;
        const ownedIds = (p.vehicles || []).map(v => v.id);
        // Apply news vehicle price modifier
        const economy = mono.economy || calculateEconomyState();
        const vehiclePriceMod = economy.newsVehiclePriceMod || 1;

        let vehicleListHtml = VEHICLE_POOL.map(v => {
            const isOwned = ownedIds.includes(v.id);
            const isEquipped = currentVehicle && currentVehicle.id === v.id;
            const displayPrice = Math.floor(v.price * vehiclePriceMod);
            const affordable = p.money >= displayPrice;
            return `<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem;background:var(--card2);border-radius:8px;margin-bottom:.4rem;${isEquipped?'border:1px solid var(--accent);':''}">
                <div style="font-size:1.5rem;">${v.ic}</div>
                <div style="flex:1;">
                    <div style="font-size:.8rem;font-weight:700;">${v.nm} ${isEquipped?'<span style="color:var(--good);">✓已装备</span>':isOwned?'<span style="color:var(--text2);">📦已拥有</span>':''}</div>
                    <div style="font-size:.65rem;color:var(--text2);">${v.desc}</div>
                    <div style="font-size:.65rem;color:var(--accent);">加成：${v.bonus.label}</div>
                </div>
                <div style="text-align:right;">
                    ${isEquipped ? '<span style="font-size:.6rem;color:var(--good);font-weight:700;">当前装备</span>' :
                      isOwned ? `<button class="btn btn-sm btn-primary" style="font-size:.65rem;" onclick="switchVehicle('${v.id}')">装备</button>` :
                      `<div style="font-size:.75rem;font-weight:700;color:${affordable?'var(--accent)':'var(--bad)'};margin-bottom:.2rem;">💰${displayPrice}${vehiclePriceMod !== 1 ? ` <span style="font-size:.6rem;color:var(--warn);">(${(vehiclePriceMod*100).toFixed(0)}%)</span>` : ''}</div>
                       <button class="btn btn-sm btn-primary" style="font-size:.65rem;" onclick="buyVehicle('${v.id}')" ${!affordable?'disabled':''}>购买</button>`}
                </div>
            </div>`;
        }).join('');

        const ownedCount = ownedIds.length;
        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🚗 载具商店</div>
            <div style="text-align:center;padding:.5rem 0;">
                <div style="font-size:.9rem;">你的资金：💰${p.money}</div>
                ${p.vehicleDiscount > 0 ? `<div style="font-size:.75rem;color:var(--good);margin-top:.2rem;">🏷️ 载具折扣：💰${p.vehicleDiscount}（购买时抵扣，${p.vehicleDiscountTurns || 0}回合后过期）</div>` : ''}
                <div style="font-size:.75rem;color:var(--text2);margin-top:.2rem;">车库：${ownedCount} 辆载具 ${ownedCount > 0 ? '（可随时切换装备）' : ''}</div>
                ${currentVehicle ? `<div style="font-size:.8rem;color:var(--accent);margin-top:.2rem;">当前装备：${currentVehicle.ic} ${currentVehicle.nm}</div>
                <div style="font-size:.7rem;color:var(--text2);">加成：${currentVehicle.bonus.label}</div>` : '<div style="font-size:.8rem;color:var(--text2);">暂未装备载具</div>'}
            </div>
            ${vehicleListHtml}
            <div style="display:flex;gap:.5rem;margin-top:.75rem;">
                ${currentVehicle ? `<button class="btn btn-secondary" onclick="sellVehicle()">出售当前载具 (💰${Math.floor(currentVehicle.price * 0.5)})</button>` : ''}
                <button class="btn btn-secondary" onclick="closeVehicleShop()">离开商店</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function buyVehicle(vehicleId) {
        const p = mono.players[0];
        const v = VEHICLE_POOL.find(x => x.id === vehicleId);
        if (!v) { monoLog('载具不存在', 'error'); return; }
        if (!p.vehicles) p.vehicles = [];
        // Check if already owned (before any price calculation)
        if (p.vehicles.some(ov => ov.id === vehicleId)) { monoLog('已拥有该载具', 'info'); return; }
        // Apply news vehicle price modifier and player vehicle discount
        const economy = mono.economy || calculateEconomyState();
        let actualPrice = Math.floor(v.price * (economy.newsVehiclePriceMod || 1));
        let discountApplied = 0;
        if (p.vehicleDiscount && p.vehicleDiscount > 0) {
            discountApplied = Math.min(p.vehicleDiscount, actualPrice);
            actualPrice -= discountApplied;
        }
        if (p.money < actualPrice) { monoLog('资金不足', 'error'); return; }
        // Only consume discount after purchase is confirmed
        if (discountApplied > 0) {
            p.vehicleDiscount -= discountApplied;
            monoLog(`🏷️ 载具折扣抵扣 💰${discountApplied}，剩余折扣 💰${p.vehicleDiscount}`, 'info');
        }
        p.money -= actualPrice;
        p.vehicles.push({...v});
        // Auto-equip if player has no current vehicle
        if (!p.vehicle) {
            p.vehicle = {...v};
            monoLog(`🚗 购买并装备 ${v.ic} ${v.nm}！${v.bonus.label}`, 'success');
        } else {
            monoLog(`🚗 购买 ${v.ic} ${v.nm}！已存入车库（可在商店切换装备）`, 'success');
        }
        recordHumanAction('buyVehicle', {vehicleId: vehicleId});
        saveMonopoly();
        renderMonopoly();
        showVehicleModal(v);
    }

    function switchVehicle(vehicleId) {
        const p = mono.players[0];
        if (!p.vehicles) return;
        const v = p.vehicles.find(x => x.id === vehicleId);
        if (!v) { monoLog('未拥有该载具', 'error'); return; }
        p.vehicle = {...v};
        monoLog(`🔄 切换装备：${v.ic} ${v.nm}！${v.bonus.label}`, 'success');
        showVehicleShop();
        saveMonopoly();
        renderMonopoly();
    }

    function sellVehicle() {
        const p = mono.players[0];
        if (!p.vehicle) { monoLog('没有载具可出售', 'error'); return; }
        const refund = Math.floor(p.vehicle.price * 0.5);
        p.money += refund;
        const soldNm = p.vehicle.nm;
        const soldId = p.vehicle.id;
        // Remove from vehicles array
        if (p.vehicles) {
            p.vehicles = p.vehicles.filter(v => v.id !== soldId);
        }
        monoLog(`📉 出售载具 ${soldNm} +${refund}💰`, 'info');
        // Auto-equip next available vehicle
        if (p.vehicles && p.vehicles.length > 0) {
            p.vehicle = {...p.vehicles[0]};
            monoLog(`🔄 自动装备：${p.vehicle.ic} ${p.vehicle.nm}`, 'info');
        } else {
            p.vehicle = null;
        }
        showVehicleShop();
        saveMonopoly();
        renderMonopoly();
    }

    function showVehicleModal(v) {
        showModal(`<div style="text-align:center;padding:1rem;">
            <div style="font-size:3rem;margin-bottom:.5rem;animation:bounceIn .5s;">${v.ic}</div>
            <h3 style="color:var(--accent);">${v.nm}</h3>
            <p style="color:var(--text2);margin:.5rem 0;">${v.desc}</p>
            <div style="background:var(--card2);padding:.5rem;border-radius:8px;margin:.5rem 0;">
                <div style="font-size:.8rem;color:var(--accent);">✨ ${v.bonus.label}</div>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="closeModal(); showVehicleShop();">开始驾驶！</button>
        </div>`);
    }

    function closeVehicleShop() {
        closeModal();
    }

    /* AI vehicle purchase logic */
    function aiVehicleDecision(p) {
        if (!p.vehicles) p.vehicles = [];
        const ownedIds = p.vehicles.map(v => v.id);
        const personality = AI_PERSONALITIES[p.personality];
        // Apply news vehicle price modifier
        const economy = mono.economy || calculateEconomyState();
        const vehiclePriceMod = economy.newsVehiclePriceMod || 1;
        // AI may buy a new vehicle (not already owned)
        if (p.money > 15000 && Math.random() < (personality.buyChance * 0.3)) {
            const affordable = VEHICLE_POOL.filter(v => Math.floor(v.price * vehiclePriceMod) <= p.money * 0.4 && !ownedIds.includes(v.id));
            if (affordable.length > 0) {
                const pick = affordable[Math.floor(Math.random() * Math.min(3, affordable.length))];
                p.money -= Math.floor(pick.price * vehiclePriceMod);
                p.vehicles.push({...pick});
                // Equip if none equipped, or if it's better
                if (!p.vehicle || pick.price > (p.vehicle.price || 0)) {
                    p.vehicle = {...pick};
                }
                monoLog(`${p.ic} 购买了 ${pick.ic} ${pick.nm}`, 'info');
            }
        }
        // AI may switch to a better vehicle from garage
        if (p.vehicles.length > 1 && p.vehicle && Math.random() < 0.1) {
            const best = p.vehicles.reduce((a, b) => (b.price > a.price ? b : a));
            if (best.id !== p.vehicle.id) {
                p.vehicle = {...best};
                monoLog(`${p.ic} 切换装备 ${best.ic} ${best.nm}`, 'info');
            }
        }
    }

    /* ==================== Property mortgage system ==================== */
    function mortgageProperty(idx) {
        const p = mono.players[0];
        const tile = mono.tiles[idx];
        const prop = mono.properties[idx];
        if (!tile || !prop || prop.owner !== 0 || prop.mortgaged) return;
        const economy = mono.economy || calculateEconomyState();
        const value = Math.floor(tile.price * economy.mortgageRatio);
        prop.mortgaged = true;
        p.money += value;
        recordHumanAction('mortgageProperty');
        monoLog(`🏠 抵押 ${tile.ic} ${tile.nm}，获得 💰${value}`, 'info');
        showBankModal();
        saveMonopoly();
    }

    function unmortgageProperty(idx) {
        const p = mono.players[0];
        const tile = mono.tiles[idx];
        const prop = mono.properties[idx];
        if (!tile || !prop || !prop.mortgaged) return;
        const economy = mono.economy || calculateEconomyState();
        const cost = Math.floor(tile.price * (economy.mortgageRatio + 0.05));
        if (p.money < cost) { monoLog('资金不足以赎回', 'error'); return; }
        prop.mortgaged = false;
        p.money -= cost;
        monoLog(`🔑 赎回 ${tile.ic} ${tile.nm}，花费 💰${cost}`, 'success');
        showBankModal();
        saveMonopoly();
    }

    /* ==================== Monopoly: Stock Market (10 Stocks + Leverage + Short) ==================== */
    