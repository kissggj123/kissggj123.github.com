let _stockRefreshTimer = null;
    let _selectedStockIdx = parseInt(safeGetItem('stockSelectedIdx', '0')) || 0;
    let _selectedLeverage = parseInt(safeGetItem('stockSelectedLeverage', '1')) || 1;

    function showStockModal() {
        const p = mono.players[0];
        const isMyTurn = mono.currentPlayer === 0;
        const portfolioValue = getStockPortfolioValue(p);
        const stockIndex = getStockIndex();
        // Count total positions
        let totalShares = 0;
        p.stockHoldings.forEach(h => totalShares += h.shares);

        // Auto-refresh if 30s passed
        if (Date.now() - (mono.stockLastUpdate || 0) > STOCK_REFRESH_INTERVAL) {
            refreshStockPrices();
        }

        const stockListHtml = STOCK_TYPES.map((s, i) => {
            const price = mono.stockPrices[i];
            const changePct = ((price - s.basePrice) / s.basePrice * 100).toFixed(1);
            const isUp = price >= s.basePrice;
            const holding = p.stockHoldings[i];
            const hasPosition = holding.shares > 0;
            const posValue = holding.isShort
                ? Math.floor((holding.avgCost - price) * holding.shares)
                : Math.floor(price * holding.shares);
            const posIcon = holding.isShort ? '🔻' : '📈';
            const trendIcon = s.trend === 'growth' ? '🚀' : s.trend === 'cyclical' ? '🔄' : s.trend === 'volatile' ? '🎲' : '📊';

            return `<div style="padding:.4rem;background:var(--card2);border-radius:8px;margin-top:.3rem;border-left:3px solid ${isUp ? 'var(--good)' : 'var(--bad)'};${_selectedStockIdx === i ? 'box-shadow:0 0 0 2px var(--accent);' : ''}${_selectedStockIdx === i ? 'position:relative;' : ''}">
                ${_selectedStockIdx === i ? '<div style="position:absolute;right:.3rem;top:50%;transform:translateY(-50%);color:var(--accent);font-size:.8rem;">▶</div>' : ''}
                <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="selectStock(${i})">
                    <div>
                        <span style="font-size:1.1rem;">${s.ic}</span>
                        <span style="font-size:.8rem;font-weight:700;">${s.nm}</span>
                        <span style="font-size:.6rem;color:var(--text2);">${trendIcon}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:700;font-size:.85rem;" data-stock-idx="${i}" data-stock-field="price">💰${price}</div>
                        <div style="font-size:.6rem;color:${isUp ? 'var(--good)' : 'var(--bad)'};" data-stock-idx="${i}" data-stock-field="change">${isUp ? '+' : ''}${changePct}%</div>
                    </div>
                </div>
                ${hasPosition ? `<div style="font-size:.65rem;color:var(--text2);margin-top:.15rem;padding-left:.2rem;">
                    ${posIcon} ${holding.shares}股 @ 💰${Math.floor(holding.avgCost)} ${holding.leverage > 1 ? `(x${holding.leverage}杠杆)` : ''} | 市值💰${posValue}
                </div>` : ''}
            </div>`;
        }).join('');

        // Selected stock detail
        const selStock = STOCK_TYPES[_selectedStockIdx];
        const selPrice = mono.stockPrices[_selectedStockIdx];
        const selHolding = p.stockHoldings[_selectedStockIdx];
        const maxBuy = Math.floor(p.money / selPrice);
        const leverageHtml = STOCK_LEVERAGES.map(lev =>
            `<button class="btn btn-sm ${_selectedLeverage === lev ? 'btn-primary' : 'btn-secondary'}" style="flex:1;font-size:.7rem;" onclick="selectLeverage(${lev})" ${!isMyTurn ? 'disabled' : ''}>${lev}x</button>`
        ).join('');

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">📊 股票交易所</div>
            <div style="text-align:center;padding:.3rem 0;">
                <div style="font-weight:800;font-size:1.1rem;color:var(--accent);">兔兔指数 ${stockIndex}</div>
                <div style="font-size:.65rem;color:var(--text2);">💰现金：${p.money} | 📊持仓：${totalShares}股 | 💵市值：💰${portfolioValue}</div>
                ${!isMyTurn ? '<div style="font-size:.7rem;color:var(--warn);margin-top:.15rem;">⚠️ 非你的回合，仅可查看</div>' : ''}
            </div>
            <div style="max-height:180px;overflow-y:auto;">${stockListHtml}</div>
            <div style="margin-top:.4rem;padding:.5rem;background:var(--card);border-radius:8px;border:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <span style="font-size:1.2rem;">${selStock.ic}</span>
                        <span style="font-weight:700;font-size:.85rem;">${selStock.nm}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800;">💰${selPrice}</div>
                    </div>
                </div>
                <div style="font-size:.65rem;color:var(--text2);margin-top:.15rem;">${selStock.desc}</div>
                ${selHolding.shares > 0 ? `<div style="font-size:.65rem;margin-top:.15rem;color:${selHolding.isShort ? 'var(--bad)' : 'var(--accent)'};">
                    ${selHolding.isShort ? '🔻做空' : '📈做多'} ${selHolding.shares}股 @ 💰${Math.floor(selHolding.avgCost)} ${selHolding.leverage > 1 ? `x${selHolding.leverage}` : ''}
                </div>` : ''}
                <div style="font-size:.65rem;color:var(--text2);margin-top:.15rem;">杠杆倍数：</div>
                <div style="display:flex;gap:.2rem;margin-top:.2rem;">${leverageHtml}</div>
                <div style="display:flex;gap:.3rem;margin-top:.3rem;">
                    <input type="number" id="stock-amount" min="1" max="${maxBuy}" value="1" style="flex:1;padding:.3rem;border:1px solid var(--border);border-radius:6px;background:var(--card2);color:var(--text);font-size:.8rem;" placeholder="数量" ${!isMyTurn ? 'disabled' : ''}>
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('stock-amount').value=${Math.max(1,maxBuy)}" ${!isMyTurn ? 'disabled' : ''}>最大</button>
                </div>
                <div style="display:flex;gap:.3rem;margin-top:.3rem;">
                    <button class="btn btn-primary" style="flex:1;font-size:.75rem;" onclick="buyStockMulti(${_selectedStockIdx}, ${_selectedLeverage})" ${maxBuy<1||!isMyTurn?'disabled':''}>📈做多</button>
                    <button class="btn btn-danger" style="flex:1;font-size:.75rem;" onclick="shortSellStock(${_selectedStockIdx}, ${_selectedLeverage})" ${maxBuy<1||!isMyTurn?'disabled':''}>🔻做空</button>
                </div>
                <div style="display:flex;gap:.3rem;margin-top:.2rem;">
                    <button class="btn btn-secondary" style="flex:1;font-size:.7rem;" onclick="sellStockMulti(${_selectedStockIdx})" ${selHolding.shares<=0||!isMyTurn?'disabled':''}>卖出/平仓</button>
                    <button class="btn btn-secondary" style="flex:1;font-size:.7rem;" onclick="closeStockModal()">离开</button>
                </div>
                <div style="font-size:.6rem;color:var(--text2);margin-top:.3rem;padding-top:.3rem;border-top:1px solid var(--border);">
                    💼 手续费 ${(STOCK_COMMISSION_RATE*100).toFixed(1)}% | 📉 滑点 ${(STOCK_SLIPPAGE_RATE*100).toFixed(1)}%/笔 | 🦢 黑天鹅事件随机触发
                </div>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');

        // Start auto-refresh timer if not running
        if (!_stockRefreshTimer && mono.started) {
            _stockRefreshTimer = setInterval(() => {
                if (mono.started && document.getElementById('modal-overlay').classList.contains('show')) {
                    // Only refresh prices if the stock modal is currently visible
                    const stockListContainer = document.querySelector('#modal-content > div[style*="max-height"]');
                    if (!stockListContainer) return;
                    // Check if user is typing in an input field — don't rebuild if so
                    const activeEl = document.activeElement;
                    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
                    // Lightweight update: refresh prices and update only price DOM, don't rebuild modal
                    refreshStockPrices();
                    // Update each stock price element in-place
                    STOCK_TYPES.forEach((s, i) => {
                        const price = mono.stockPrices[i];
                        const changePct = ((price - s.basePrice) / s.basePrice * 100).toFixed(1);
                        const isUp = price >= s.basePrice;
                        // Find price elements by data attribute
                        const priceEls = stockListContainer.querySelectorAll(`[data-stock-idx="${i}"]`);
                        priceEls.forEach(el => {
                            if (el.dataset.stockField === 'price') {
                                el.textContent = '💰' + price;
                            } else if (el.dataset.stockField === 'change') {
                                el.textContent = (isUp ? '+' : '') + changePct + '%';
                                el.style.color = isUp ? 'var(--good)' : 'var(--bad)';
                            }
                        });
                    });
                }
            }, STOCK_REFRESH_INTERVAL);
        }
    }

    window.selectStock = function(idx) { 
        _selectedStockIdx = idx; 
        safeSetItem('stockSelectedIdx', String(idx));
        showStockModal(); 
    };
    window.selectLeverage = function(lev) { 
        _selectedLeverage = lev; 
        safeSetItem('stockSelectedLeverage', String(lev));
        showStockModal(); 
    };

    function buyStockMulti(stockIdx, leverage) {
        const p = mono.players[0];
        if (p.signalJamTurns > 0) { monoLog('📡 信号干扰中！无法交易股票', 'error'); return; }
        const price = mono.stockPrices[stockIdx];
        const amount = parseInt(document.getElementById('stock-amount')?.value) || 1;
        // Leverage: player pays margin = price * amount / leverage, but P/L is amplified by leverage
        const margin = Math.ceil(price * amount / leverage);
        if (p.money < margin) { monoLog('保证金不足！', 'error'); return; }
        const h = p.stockHoldings[stockIdx];
        // If already shorting this stock, buying reduces short position
        if (h.isShort && h.shares > 0) {
            if (amount >= h.shares) {
                // Close short and go long with remainder
                const closeShares = h.shares;
                const shortProfit = Math.round((h.avgCost - price) * closeShares * h.leverage);
                const shortMarginReturn = Math.floor(h.avgCost * closeShares / h.leverage);
                p.money += shortProfit + shortMarginReturn;
                p.stats.stockProfit += shortProfit;
                const remaining = amount - closeShares;
                h.shares = remaining;
                h.avgCost = price;
                h.isShort = false;
                h.leverage = leverage;
                const remainMargin = Math.ceil(price * remaining / leverage);
                p.money -= remainMargin;
                monoLog(`📈 平仓做空并做多 ${remaining} 股 ${STOCK_TYPES[stockIdx].nm} @ 💰${price} (x${leverage})`, 'success');
            } else {
                h.shares -= amount;
                const shortProfit = Math.round((h.avgCost - price) * amount * h.leverage);
                const shortMarginReturn = Math.floor(h.avgCost * amount / h.leverage);
                p.money += shortProfit + shortMarginReturn;
                p.stats.stockProfit += shortProfit;
                monoLog(`📈 部分平仓做空 ${amount} 股，盈利 💰${Math.floor(shortProfit)}`, 'success');
            }
        } else {
            // Normal buy or add to long position — leverage means player pays margin only
            const prevMargin = h.shares > 0 ? Math.ceil(h.avgCost * h.shares / h.leverage) : 0;
            const totalMargin = prevMargin + margin;
            const totalShares = h.shares + amount;
            // Weighted avg cost (stored as actual price for P/L calc, leverage handled at sell time)
            h.avgCost = h.shares > 0 ? Math.round((h.avgCost * h.shares + price * amount) / totalShares) : price;
            h.shares = totalShares;
            h.leverage = leverage;
            h.isShort = false;
            p.money -= margin;
            monoLog(`📈 买入 ${amount} 股 ${STOCK_TYPES[stockIdx].ic} ${STOCK_TYPES[stockIdx].nm} @ 💰${price} (x${leverage}杠杆)，保证金 💰${margin}`, 'success');
        }
        p.stats.stockTrades++;
        // Price impact: buying pushes price up slightly (slippage increases impact)
        const slippageImpact = 1 + amount * 0.005 + STOCK_SLIPPAGE_RATE * Math.min(amount, 20);
        mono.stockPrices[stockIdx] = Math.min(STOCK_TYPES[stockIdx].basePrice * 2.5, Math.floor(mono.stockPrices[stockIdx] * slippageImpact));
        mono.stockMarket = getStockIndex();
        // Transaction fee (commission)
        const commission = Math.ceil(margin * STOCK_COMMISSION_RATE);
        p.money -= commission;
        if (commission > 0) monoLog(`💼 交易手续费 -💰${commission}`, 'info');
        recordHumanAction('buyStock', {stockIdx: stockIdx});
        showStockModal();
        saveMonopoly();
    }

    function shortSellStock(stockIdx, leverage) {
        const p = mono.players[0];
        const price = mono.stockPrices[stockIdx];
        const amount = parseInt(document.getElementById('stock-amount')?.value) || 1;
        // Short selling with leverage: margin = price * amount / leverage (50% base * 2/leverage)
        const margin = Math.ceil(price * amount / leverage);
        if (p.money < margin) { monoLog(`保证金不足（需💰${margin}）！`, 'error'); return; }
        const h = p.stockHoldings[stockIdx];
        // If already long, shorting reduces long position
        if (!h.isShort && h.shares > 0) {
            if (amount >= h.shares) {
                const closeShares = h.shares;
                const longProfit = Math.round((price - h.avgCost) * closeShares * h.leverage);
                const longMarginReturn = Math.ceil(h.avgCost * closeShares / h.leverage);
                p.money += longProfit + longMarginReturn;
                p.stats.stockProfit += longProfit;
                const remaining = amount - closeShares;
                h.shares = remaining;
                h.avgCost = price;
                h.isShort = true;
                h.leverage = leverage;
                const remainMargin = Math.ceil(price * remaining / leverage);
                p.money -= remainMargin;
                monoLog(`🔻 平仓做多并做空 ${remaining} 股 ${STOCK_TYPES[stockIdx].nm} @ 💰${price} (x${leverage})`, 'info');
            } else {
                h.shares -= amount;
                const longProfit = Math.round((price - h.avgCost) * amount * h.leverage);
                const longMarginReturn = Math.ceil(h.avgCost * amount / h.leverage);
                p.money += longProfit + longMarginReturn;
                p.stats.stockProfit += longProfit;
                monoLog(`📈 部分平仓做多 ${amount} 股，盈利 💰${Math.floor(longProfit)}`, 'success');
            }
        } else {
            // Open or add to short position
            h.avgCost = h.shares > 0 ? Math.round((h.avgCost * h.shares + price * amount) / (h.shares + amount)) : price;
            h.shares += amount;
            h.leverage = leverage;
            h.isShort = true;
            p.money -= margin;
            monoLog(`🔻 做空 ${amount} 股 ${STOCK_TYPES[stockIdx].ic} ${STOCK_TYPES[stockIdx].nm} @ 💰${price} (x${leverage}杠杆)，保证金 💰${margin}`, 'info');
        }
        p.stats.stockTrades++;
        // Price impact: short selling pushes price down slightly (slippage increases impact)
        const shortSlippageImpact = 1 - amount * 0.005 - STOCK_SLIPPAGE_RATE * Math.min(amount, 20);
        mono.stockPrices[stockIdx] = Math.max(STOCK_TYPES[stockIdx].basePrice * 0.25, Math.floor(mono.stockPrices[stockIdx] * shortSlippageImpact));
        mono.stockMarket = getStockIndex();
        // Transaction fee (commission)
        const commission = Math.ceil(margin * STOCK_COMMISSION_RATE);
        p.money -= commission;
        if (commission > 0) monoLog(`💼 交易手续费 -💰${commission}`, 'info');
        showStockModal();
        saveMonopoly();
    }

    function sellStockMulti(stockIdx) {
        const p = mono.players[0];
        if (p.signalJamTurns > 0) { monoLog('📡 信号干扰中！无法交易股票', 'error'); return; }
        const h = p.stockHoldings[stockIdx];
        if (h.shares <= 0) return;
        const price = mono.stockPrices[stockIdx];
        const amount = Math.min(h.shares, parseInt(document.getElementById('stock-amount')?.value) || h.shares);
        const lev = h.leverage || 1;
        if (h.isShort) {
            // Close short position: P/L amplified by leverage, margin returned based on avgCost
            const profit = Math.round((h.avgCost - price) * amount * lev);
            const marginReturn = Math.ceil(h.avgCost * amount / lev);
            p.money += marginReturn + profit;
            p.stats.stockProfit += profit;
            h.shares -= amount;
            if (h.shares === 0) { h.avgCost = 0; h.leverage = 1; }
            monoLog(`📉 平仓做空 ${amount} 股 ${STOCK_TYPES[stockIdx].nm} @ 💰${price} (x${lev})，${profit >= 0 ? '盈利' : '亏损'} 💰${Math.abs(profit)}`, profit >= 0 ? 'success' : 'error');
        } else {
            // Close long position: P/L amplified by leverage, margin returned + profit
            const profit = Math.round((price - h.avgCost) * amount * lev);
            const marginReturn = Math.ceil(h.avgCost * amount / lev);
            p.money += marginReturn + profit;
            p.stats.stockProfit += profit;
            h.shares -= amount;
            if (h.shares === 0) { h.avgCost = 0; h.leverage = 1; }
            monoLog(`📉 卖出 ${amount} 股 ${STOCK_TYPES[stockIdx].ic} ${STOCK_TYPES[stockIdx].nm} @ 💰${price} (x${lev})，${profit >= 0 ? '盈利' : '亏损'} 💰${Math.abs(profit)}`, profit >= 0 ? 'success' : 'error');
        }
        p.stats.stockTrades++;
        // Price impact: selling pushes price down (slippage increases impact)
        const sellSlippageImpact = 1 - amount * 0.005 - STOCK_SLIPPAGE_RATE * Math.min(amount, 20);
        mono.stockPrices[stockIdx] = Math.max(STOCK_TYPES[stockIdx].basePrice * 0.25, Math.floor(mono.stockPrices[stockIdx] * sellSlippageImpact));
        mono.stockMarket = getStockIndex();
        // Transaction fee (commission on sale value)
        const saleValue = price * amount;
        const commission = Math.ceil(saleValue * STOCK_COMMISSION_RATE);
        p.money -= commission;
        if (commission > 0) monoLog(`💼 交易手续费 -💰${commission}`, 'info');
        showStockModal();
        saveMonopoly();
    }

    function closeStockModal() {
        if (_stockRefreshTimer) { clearInterval(_stockRefreshTimer); _stockRefreshTimer = null; }
        closeModal();
        saveMonopoly();
        renderMonopoly();
        if (mono.voluntaryVisit) { mono.voluntaryVisit = false; return; }
        if (!checkGameOver()) nextTurn();
    }

    /* ---- Voluntary stock exchange entry (doesn't consume turn) ---- */
    function openStockExchange() {
        mono.voluntaryVisit = true;
        showStockModal();
    }

    function aiStockDecision(p) {
        if (!p.stockHoldings || p.stockHoldings.length === 0) return;
        if (p.signalJamTurns > 0) return; // Signal jam prevents stock trading
        const personality = AI_PERSONALITIES[p.personality];
        const difficulty = getAIDifficulty();

        // === Phase 1: Auto-sell — scan all holdings for take-profit / stop-loss ===
        const takeProfitThreshold = p.personality === 'aggressive' ? 1.25 : p.personality === 'conservative' ? 1.10 : 1.15;
        const stopLossThreshold = p.personality === 'aggressive' ? 0.75 : p.personality === 'conservative' ? 0.88 : 0.82;
        for (let i = 0; i < p.stockHoldings.length; i++) {
            const h = p.stockHoldings[i];
            if (!h || h.shares <= 0) continue;
            if (!h.avgCost || h.avgCost <= 0) continue; // Guard against division by zero
            const stock = STOCK_TYPES[i];
            const price = mono.stockPrices[i];

            if (h.isShort) {
                // Short position: profit when price drops, loss when price rises
                const profitRatio = (h.avgCost - price) / h.avgCost;
                const lossRatio = (price - h.avgCost) / h.avgCost;
                if (profitRatio >= (takeProfitThreshold - 1) || lossRatio >= (1 - stopLossThreshold)) {
                    const closeShares = h.shares;
                    const profit = Math.round((h.avgCost - price) * closeShares * (h.leverage || 1));
                    const marginReturn = Math.ceil(h.avgCost * closeShares / (h.leverage || 1));
                    p.money += marginReturn + profit;
                    p.stats.stockProfit += profit;
                    p.stats.stockTrades++;
                    const action = profit >= 0 ? '止盈' : '止损';
                    monoLog(`${p.ic} 📉 ${action}平仓做空 ${closeShares} 股 ${stock.ic}，${profit>=0?'盈利':'亏损'} 💰${Math.abs(profit)}`, profit>=0?'success':'error');
                    h.shares = 0; h.avgCost = 0; h.leverage = 1; h.isShort = false;
                    mono.stockPrices[i] = Math.min(stock.basePrice * 3, Math.floor(price * (1 + closeShares * 0.005)));
                    mono.stockMarket = getStockIndex();
                }
            } else {
                // Long position: profit when price rises, loss when price drops
                const profitRatio = (price - h.avgCost) / h.avgCost;
                const lossRatio = (h.avgCost - price) / h.avgCost;
                if (profitRatio >= (takeProfitThreshold - 1) || lossRatio >= (1 - stopLossThreshold)) {
                    const soldShares = h.shares;
                    const profit = Math.round((price - h.avgCost) * soldShares * (h.leverage || 1));
                    const marginReturn = Math.ceil(h.avgCost * soldShares / (h.leverage || 1));
                    p.money += marginReturn + profit;
                    p.stats.stockProfit += profit;
                    p.stats.stockTrades++;
                    const action = profit >= 0 ? '止盈' : '止损';
                    monoLog(`${p.ic} 📉 ${action}卖出 ${soldShares} 股 ${stock.ic}，${profit>=0?'盈利':'亏损'} 💰${Math.abs(profit)}`, profit>=0?'success':'error');
                    h.shares = 0; h.avgCost = 0; h.leverage = 1;
                    mono.stockPrices[i] = Math.max(stock.basePrice * 0.2, Math.floor(price * (1 - soldShares * 0.005)));
                    mono.stockMarket = getStockIndex();
                }
            }
        }

        // === Phase 2: Smart buy — find the best stock opportunity ===
        const humanFavStock = getHumanFavoriteStock();
        // Strategy replication: 20% chance to follow human's favorite stock
        if (humanFavStock >= 0 && Math.random() < 0.2) {
            const si = humanFavStock;
            const stock = STOCK_TYPES[si];
            const price = mono.stockPrices[si];
            const h = p.stockHoldings[si];
            if (price < stock.basePrice * 0.9 && p.money > price * 5 && !h.isShort) {
                const amount = Math.floor(Math.min(p.money * 0.12, p.money) / price);
                if (amount > 0) {
                    const margin = Math.ceil(price * amount);
                    if (p.money >= margin) {
                        h.avgCost = h.shares > 0 ? Math.round((h.avgCost * h.shares + price * amount) / (h.shares + amount)) : price;
                        h.shares += amount;
                        h.isShort = false;
                        h.leverage = 1;
                        p.money -= margin;
                        p.stats.stockTrades++;
                        mono.stockPrices[si] = Math.min(stock.basePrice * 3, Math.floor(price * (1 + amount * 0.005)));
                        mono.stockMarket = getStockIndex();
                        monoLog(`${p.ic} 📈 跟随买入 ${amount} 股 ${stock.ic}`, 'info');
                    }
                }
            }
            return;
        }

        // Scan all stocks to find the best buy opportunity (lowest price/basePrice ratio)
        let bestBuyIdx = -1;
        let bestBuyRatio = Infinity;
        for (let i = 0; i < STOCK_TYPES.length; i++) {
            const stock = STOCK_TYPES[i];
            const price = mono.stockPrices[i];
            const h = p.stockHoldings[i];
            const ratio = price / stock.basePrice;
            // Skip if already holding long, or if price is above base
            if (h.isShort || h.shares > 0) continue;
            if (ratio < bestBuyRatio && ratio < 0.85) {
                bestBuyRatio = ratio;
                bestBuyIdx = i;
            }
        }

        if (bestBuyIdx >= 0 && p.money > mono.stockPrices[bestBuyIdx] * 5) {
            const stock = STOCK_TYPES[bestBuyIdx];
            const price = mono.stockPrices[bestBuyIdx];
            const h = p.stockHoldings[bestBuyIdx];
            const buyChance = personality.buyChance * 0.5 * difficulty;
            if (Math.random() < buyChance) {
                // Invest more aggressively when discount is deeper
                const investRatio = Math.min(0.2, 0.1 + (1 - bestBuyRatio) * 0.5);
                const amount = Math.floor(Math.min(p.money * investRatio, p.money) / price);
                if (amount > 0) {
                    const margin = Math.ceil(price * amount);
                    if (p.money >= margin) {
                        h.avgCost = h.shares > 0 ? Math.round((h.avgCost * h.shares + price * amount) / (h.shares + amount)) : price;
                        h.shares += amount;
                        h.isShort = false;
                        h.leverage = 1;
                        p.money -= margin;
                        p.stats.stockTrades++;
                        mono.stockPrices[bestBuyIdx] = Math.min(stock.basePrice * 3, Math.floor(price * (1 + amount * 0.005)));
                        mono.stockMarket = getStockIndex();
                        monoLog(`${p.ic} 📈 智能买入 ${amount} 股 ${stock.ic}（折扣${Math.round((1-bestBuyRatio)*100)}%）`, 'info');
                    }
                }
            }
            return;
        }

        // === Phase 3: Aggressive AI may short sell overvalued stocks ===
        if (p.personality === 'aggressive' && Math.random() < 0.3) {
            let bestShortIdx = -1;
            let bestShortRatio = 0;
            for (let i = 0; i < STOCK_TYPES.length; i++) {
                const stock = STOCK_TYPES[i];
                const price = mono.stockPrices[i];
                const h = p.stockHoldings[i];
                const ratio = price / stock.basePrice;
                if (h.shares > 0 && !h.isShort) continue;
                if (ratio > bestShortRatio && ratio > 1.3) {
                    bestShortRatio = ratio;
                    bestShortIdx = i;
                }
            }
            if (bestShortIdx >= 0 && p.money > mono.stockPrices[bestShortIdx] * 3) {
                const stock = STOCK_TYPES[bestShortIdx];
                const price = mono.stockPrices[bestShortIdx];
                const h = p.stockHoldings[bestShortIdx];
                const amount = Math.floor(Math.min(p.money * 0.1, p.money) / price);
                if (amount > 0) {
                    const margin = Math.ceil(price * amount);
                    if (p.money >= margin) {
                        h.avgCost = h.shares > 0 ? Math.round((h.avgCost * h.shares + price * amount) / (h.shares + amount)) : price;
                        h.shares += amount;
                        h.isShort = true;
                        h.leverage = 1;
                        p.money -= margin;
                        p.stats.stockTrades++;
                        monoLog(`${p.ic} 🔻 智能做空 ${amount} 股 ${stock.ic}（溢价${Math.round((bestShortRatio-1)*100)}%）`, 'info');
                    }
                }
            }
        }
    }

    /* ==================== Monopoly: Enhanced Auction ==================== */
    // Auction state — tracks current bidding session
    let auctionState = null;

    function handleAuction(playerIdx) {
        const p = mono.players[playerIdx];
        // Find a random unowned property in unlocked tiles
        const unlockedCount = getUnlockedTileCount();
        const unowned = [];
        for (let i = 0; i < unlockedCount; i++) {
            if (mono.tiles[i].type === 'property' && (mono.properties[i]?.owner === -1 || mono.properties[i]?.owner === undefined)) {
                unowned.push(i);
            }
        }
        if (unowned.length === 0) {
            monoLog(`${p.ic} 拍卖会取消 — 无可拍地产`, 'info');
            return false;
        }
        const tileIdx = unowned[Math.floor(Math.random() * unowned.length)];
        const tile = mono.tiles[tileIdx];
        startEnhancedAuction(tileIdx, playerIdx);
        // Check if auction actually started (startEnhancedAuction may bail if no participants can afford deposit)
        if (!auctionState) {
            monoLog(`${p.ic} 拍卖取消 — 无人能负担保证金`, 'info');
            return false;
        }
        return true; // Auction started — modal shown or AI rounds running
    }

    // Voluntary auction access from action bar (doesn't consume turn)
    function openAuctionHouse() {
        const p = mono.players[0];
        const isMyTurn = mono.currentPlayer === 0;
        const unlockedCount = getUnlockedTileCount();
        const unowned = [];
        for (let i = 0; i < unlockedCount; i++) {
            if (mono.tiles[i].type === 'property' && (mono.properties[i]?.owner === -1 || mono.properties[i]?.owner === undefined)) {
                unowned.push(i);
            }
        }
        if (unowned.length === 0) {
            showModal(`<div class="modal-title">🔨 拍卖行</div>
                <div style="text-align:center;padding:1rem;color:var(--text2);">暂时没有可拍卖的地产</div>
                <button class="btn btn-secondary" style="width:100%;" onclick="closeModal()">关闭</button>`);
            return;
        }
        // Show list of available properties for auction
        const listHtml = unowned.slice(0, 10).map(idx => {
            const t = mono.tiles[idx];
            const startPrice = Math.floor(t.price * 0.5);
            const deposit = Math.floor(startPrice * 0.1);
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.4rem;background:var(--card2);border-radius:6px;margin-top:.3rem;">
                <div>
                    <span style="font-size:1.1rem;">${t.ic}</span>
                    <span style="font-size:.8rem;font-weight:700;">${t.nm}</span>
                    <div style="font-size:.65rem;color:var(--text2);">起拍 💰${startPrice} | 保证金 💰${deposit}</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="startEnhancedAuction(${idx}, 0, true)" ${!isMyTurn || p.money < deposit ? 'disabled' : ''}>参拍</button>
            </div>`;
        }).join('');
        showModal(`<div class="modal-title">🔨 拍卖行</div>
            <div style="font-size:.7rem;color:var(--text2);margin-bottom:.3rem;">竞拍需缴纳 10% 保证金，落败没收，违约没收</div>
            <div style="font-size:.75rem;text-align:center;padding:.2rem;">你的资金：💰${p.money} ${!isMyTurn ? '| ⚠️ 非你的回合' : ''}</div>
            ${listHtml}
            <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="closeModal()">离开</button>`);
    }

    function startEnhancedAuction(tileIdx, playerIdx, voluntary = false) {
        const tile = mono.tiles[tileIdx];
        const startPrice = Math.floor(tile.price * 0.5);
        const deposit = Math.floor(startPrice * 0.1);
        const economy = mono.economy || { inflation: 0.03 };
        // Dynamic starting price with economy influence
        const dynamicStart = Math.floor(startPrice * (1 + economy.inflation * 0.5 + Math.random() * 0.1));

        // Initialize auction state
        auctionState = {
            tileIdx: tileIdx,
            tile: tile,
            startPrice: dynamicStart,
            deposit: Math.floor(dynamicStart * 0.1),
            currentBid: dynamicStart,
            highestBidder: -1,
            participants: [],
            round: 1,
            maxRounds: 3,
            voluntary: voluntary,
            initiatedBy: playerIdx,
            passedPlayers: new Set(),
        };

        // Collect participants — all non-bankrupt players who can afford the deposit
        mono.players.forEach((pl, i) => {
            if (!pl.bankrupt && pl.money >= auctionState.deposit) {
                auctionState.participants.push(i);
            }
        });

        if (auctionState.participants.length === 0) {
            monoLog('拍卖取消 — 无足够资金参与者', 'info');
            closeModal();
            return;
        }

        // Charge deposits from all participants
        auctionState.participants.forEach(idx => {
            mono.players[idx].money -= auctionState.deposit;
        });
        monoLog(`🔨 拍卖开始：${tile.ic} ${tile.nm} | 起拍价 💰${auctionState.startPrice} | ${auctionState.participants.length}人参拍(各缴保证金💰${auctionState.deposit})`, 'info');

        if (playerIdx === 0) {
            showAuctionBiddingUI();
        } else {
            // AI initiates — run AI auction rounds automatically
            setTimeout(() => runAIAuctionRounds(), 600);
        }
    }

    function showAuctionBiddingUI() {
        if (!auctionState) return;
        const p = mono.players[0];
        if (mono.autoPilot) {
            // AutoPilot decision for auction
            const increment = Math.floor(auctionState.currentBid * 0.1);
            const tile = auctionState.tile;
            const regionProps = mono.tiles.filter(t => t.type === 'property' && t.region === tile.region);
            const ownedInRegion = regionProps.filter(t => mono.properties[t.id]?.owner === 0).length;
            const isMonopolyPiece = regionProps.length > 0 && (ownedInRegion + 1 >= regionProps.length * 0.5);
            const maxBid = isMonopolyPiece ? tile.price * 1.5 : tile.price * 1.0;
            
            if (p.money >= auctionState.currentBid + increment && auctionState.currentBid + increment <= maxBid) {
                setTimeout(() => placeAuctionBid(increment), 400);
            } else {
                setTimeout(() => passAuctionRound(), 400);
            }
            return;
        }
        const isParticipant = auctionState.participants.includes(0);
        const increment = Math.floor(auctionState.currentBid * 0.1);
        const canBid = isParticipant && p.money >= auctionState.currentBid + increment;

        const participantsHtml = auctionState.participants.map(idx => {
            const pl = mono.players[idx];
            const isHighest = auctionState.highestBidder === idx;
            return `<span style="display:inline-block;padding:.15rem .5rem;border-radius:4px;background:${isHighest ? 'var(--accent)' : 'var(--card2)'};color:${isHighest ? '#fff' : 'var(--text)'};font-size:.7rem;margin:.1rem;">${pl.ic}${idx === 0 ? '🐰' : pl.nm}${isHighest ? '👑' : ''}</span>`;
        }).join('');

        const bidOptions = [
            { label: `+10% (💰${increment})`, amt: increment },
            { label: `+20% (💰${increment * 2})`, amt: increment * 2 },
            { label: `+50% (💰${Math.floor(increment * 5)})`, amt: Math.floor(increment * 5) },
        ];

        const bidButtonsHtml = canBid ? bidOptions.map(opt => 
            `<button class="btn btn-primary btn-sm" style="flex:1;min-width:70px;" onclick="placeAuctionBid(${opt.amt})">${opt.label}</button>`
        ).join('') : '<div style="font-size:.7rem;color:var(--text2);text-align:center;">资金不足或非参拍者</div>';

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🔨 地产拍卖 — 第${auctionState.round}轮</div>
            <div style="text-align:center;padding:.4rem 0;">
                <div style="font-size:2rem;">${auctionState.tile.ic}</div>
                <div style="font-weight:800;">${auctionState.tile.nm}</div>
                <div style="font-size:.7rem;color:var(--text2);">${auctionState.tile.desc}</div>
            </div>
            <div style="display:flex;justify-content:space-around;padding:.4rem;background:var(--card2);border-radius:6px;margin-top:.3rem;">
                <div style="text-align:center;"><div style="font-size:.6rem;color:var(--text2);">起拍价</div><div style="font-weight:700;">💰${auctionState.startPrice}</div></div>
                <div style="text-align:center;"><div style="font-size:.6rem;color:var(--text2);">当前最高</div><div style="font-weight:700;color:var(--accent);">💰${auctionState.currentBid}</div></div>
                <div style="text-align:center;"><div style="font-size:.6rem;color:var(--text2);">市场价</div><div style="font-weight:700;">💰${auctionState.tile.price}</div></div>
            </div>
            <div style="margin-top:.4rem;">${participantsHtml}</div>
            <div style="font-size:.7rem;color:var(--text2);text-align:center;margin-top:.2rem;">你的资金：💰${p.money} | 保证金已缴：💰${auctionState.deposit}</div>
            <div style="display:flex;gap:.3rem;justify-content:center;margin-top:.5rem;flex-wrap:wrap;">
                ${bidButtonsHtml}
            </div>
            <div style="display:flex;gap:.3rem;margin-top:.3rem;">
                <button class="btn btn-secondary" style="flex:1;" onclick="passAuctionRound()">本轮跳过</button>
                <button class="btn btn-secondary" style="flex:1;" onclick="forfeitAuction()">放弃竞拍</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function placeAuctionBid(increment) {
        if (!auctionState) return;
        const p = mono.players[0];
        const newBid = auctionState.currentBid + increment;
        if (p.money < newBid) { monoLog('资金不足！', 'error'); return; }
        auctionState.currentBid = newBid;
        auctionState.highestBidder = 0;
        auctionState.passedPlayers.clear(); // Reset passes when someone bids
        monoLog(`🐰 出价 💰${newBid}`, 'info');
        // AI responds
        setTimeout(() => aiAuctionResponse(), 500);
    }

    function passAuctionRound() {
        if (!auctionState) return;
        auctionState.passedPlayers.add(0);
        monoLog(`🐰 本轮跳过`, 'info');
        checkAuctionRoundEnd();
    }

    function forfeitAuction() {
        if (!auctionState) return;
        // Remove player from participants — deposit already forfeited
        const idx = auctionState.participants.indexOf(0);
        if (idx >= 0) {
            auctionState.participants.splice(idx, 1);
            monoLog(`🐰 放弃竞拍，保证金 💰${auctionState.deposit} 被没收`, 'error');
        }
        if (auctionState.participants.length <= 1) {
            finishAuction();
        } else {
            checkAuctionRoundEnd();
        }
    }

    function aiAuctionResponse() {
        if (!auctionState) return;
        const aiBidders = auctionState.participants.filter(idx => idx !== 0);
        for (const idx of aiBidders) {
            const ai = mono.players[idx];
            const personality = AI_PERSONALITIES[ai.personality] || { buyChance: 0.5 };
            const bidIncrement = Math.floor(auctionState.currentBid * 0.1);

            const tile = auctionState.tile;
            const regionProps = mono.tiles.filter(t => t.type === 'property' && t.region === tile.region);
            const ownedInRegion = regionProps.filter(t => mono.properties[t.id] && mono.properties[t.id]?.owner === idx).length;
            const isSetCompleter = ownedInRegion >= regionProps.length - 1;
            const isSetBlocker = regionProps.some(t => {
                const owner = mono.properties[t.id]?.owner;
                if (owner >= 0 && owner !== idx) {
                    const ownerCount = regionProps.filter(rt => mono.properties[rt.id]?.owner === owner).length;
                    return ownerCount >= regionProps.length - 1;
                }
                return false;
            });

            const maxRatio = (isSetCompleter || isSetBlocker) ? 0.85 : 0.6;
            const aiMaxBid = Math.floor(ai.money * maxRatio);
            const bidMultiplier = isSetCompleter ? 1.8 : isSetBlocker ? 1.4 : 1.0;
            const belowMarket = (tile.price * bidMultiplier) > auctionState.currentBid;
            const bidChance = personality.buyChance * (belowMarket ? 1.4 : 0.4);

            if (Math.random() < bidChance && ai.money >= auctionState.currentBid + bidIncrement && auctionState.currentBid + bidIncrement <= aiMaxBid) {
                auctionState.currentBid += bidIncrement;
                auctionState.highestBidder = idx;
                auctionState.passedPlayers.clear();
                monoLog(`${ai.ic} ${ai.nm} 加价到 💰${auctionState.currentBid}`, 'info');
            } else {
                auctionState.passedPlayers.add(idx);
            }
        }
        showAuctionBiddingUI();
        checkAuctionRoundEnd();
    }

    function checkAuctionRoundEnd() {
        if (!auctionState) return;
        // If all remaining participants passed, or only one participant left
        const activeParticipants = auctionState.participants.filter(idx => !auctionState.passedPlayers.has(idx));
        if (activeParticipants.length <= 1 || auctionState.passedPlayers.size >= auctionState.participants.length) {
            finishAuction();
            return;
        }
        auctionState.round++;
        if (auctionState.round > auctionState.maxRounds) {
            finishAuction();
        } else {
            // Continue to next round — reset passes for new round
            if (auctionState.passedPlayers.size >= auctionState.participants.length - 1) {
                finishAuction();
            }
        }
    }

    function runAIAuctionRounds() {
        if (!auctionState) return;
        // AI-only auction — auto-bid through rounds
        for (let round = 1; round <= auctionState.maxRounds; round++) {
            auctionState.round = round;
            auctionState.passedPlayers.clear();
            for (const idx of auctionState.participants) {
                const ai = mono.players[idx];
                const personality = AI_PERSONALITIES[ai.personality] || { buyChance: 0.5 };
                const bidIncrement = Math.floor(auctionState.currentBid * 0.1);

                const tile = auctionState.tile;
                const regionProps = mono.tiles.filter(t => t.type === 'property' && t.region === tile.region);
                const ownedInRegion = regionProps.filter(t => mono.properties[t.id] && mono.properties[t.id].owner === idx).length;
                const isSetCompleter = ownedInRegion >= regionProps.length - 1;
                const isSetBlocker = regionProps.some(t => {
                    const owner = mono.properties[t.id]?.owner;
                    if (owner >= 0 && owner !== idx) {
                        const ownerCount = regionProps.filter(rt => mono.properties[rt.id]?.owner === owner).length;
                        return ownerCount >= regionProps.length - 1;
                    }
                    return false;
                });

                const maxRatio = (isSetCompleter || isSetBlocker) ? 0.85 : 0.6;
                const aiMaxBid = Math.floor(ai.money * maxRatio);
                const bidMultiplier = isSetCompleter ? 1.8 : isSetBlocker ? 1.4 : 1.0;
                const belowMarket = (tile.price * bidMultiplier) > auctionState.currentBid;
                const bidChance = personality.buyChance * (belowMarket ? 1.4 : 0.4);

                if (Math.random() < bidChance && ai.money >= auctionState.currentBid + bidIncrement && auctionState.currentBid + bidIncrement <= aiMaxBid) {
                    auctionState.currentBid += bidIncrement;
                    auctionState.highestBidder = idx;
                    auctionState.passedPlayers.clear();
                } else {
                    auctionState.passedPlayers.add(idx);
                }
            }
            if (auctionState.passedPlayers.size >= auctionState.participants.length) break;
        }
        finishAuction();
    }

    function finishAuction() {
        if (!auctionState) return;
        const tile = auctionState.tile;
        const winnerIdx = auctionState.highestBidder;
        const winningBid = auctionState.currentBid;
        const deposit = auctionState.deposit;

        if (winnerIdx < 0 || auctionState.participants.length === 0) {
            // No one bid — return deposits
            auctionState.participants.forEach(idx => {
                mono.players[idx].money += deposit;
            });
            monoLog(`🔨 拍卖流拍：${tile.ic} ${tile.nm} — 无人出价，保证金退还`, 'info');
        } else {
            const winner = mono.players[winnerIdx];
            // Winner pays winning bid minus deposit already paid
            const remaining = winningBid - deposit;
            if (winner.money >= remaining) {
                winner.money -= remaining;
                mono.properties[auctionState.tileIdx].owner = winnerIdx;
                if (winnerIdx === 0) {
                    winner.stats.propertiesBought++;
                    winner.stats.purchaseSpent += winningBid;
                }
                monoLog(`🔨 ${winner.ic} ${winnerIdx === 0 ? '🐰' : winner.nm} 拍得 ${tile.nm}，成交价 💰${winningBid}（含保证金💰${deposit}）`, 'success');
            } else {
                // Winner can't afford — default! Deposit forfeited, property goes to next highest
                monoLog(`🔨 ${winner.ic} ${winner.nm} 违约！保证金 💰${deposit} 被没收`, 'error');
                auctionState.participants = auctionState.participants.filter(idx => idx !== winnerIdx);
                if (auctionState.participants.length > 0) {
                    // Re-run with remaining participants
                    auctionState.highestBidder = -1;
                    auctionState.currentBid = auctionState.startPrice;
                    auctionState.round = 1;
                    auctionState.passedPlayers = new Set();
                    // If human player is still a participant, show bidding UI; otherwise auto-run
                    if (auctionState.participants.includes(0)) {
                        showAuctionBiddingUI();
                    } else {
                        setTimeout(() => runAIAuctionRounds(), 300);
                    }
                    return;
                }
            }
        }
        const wasVoluntary = auctionState.voluntary;
        auctionState = null;
        closeModal();
        saveMonopoly();
        renderMonopoly();
        if (!checkGameOver() && !wasVoluntary) {
            nextTurn();
        }
    }

    /* ==================== Monopoly: Upgrade Tile ==================== */
    function handleUpgradeTile(playerIdx) {
        const p = mono.players[playerIdx];
        const pi = playerIdx;
        const owned = [];
        for (let i = 0; i < mono.tiles.length; i++) {
            if (mono.tiles[i].type === 'property' && mono.properties[i].owner === pi && mono.properties[i].level < 5) {
                owned.push(i);
            }
        }

        if (playerIdx === 0) {
            // Always show modal for human player — even if no upgradeable properties
            const modal = document.getElementById('modal-content');
            if (owned.length === 0) {
                modal.innerHTML = `
                    <div class="modal-drag-handle"></div>
                    <div class="modal-title">⬆️ 地产升级</div>
                    <div style="text-align:center;padding:1rem 0;">
                        <div style="font-size:2.5rem;">🏚️</div>
                        <div style="font-weight:700;margin-top:.3rem;">没有可升级的地产</div>
                        <div style="font-size:.8rem;color:var(--text2);margin-top:.2rem;">购买地产后才能使用升级格</div>
                        <div style="font-size:.8rem;color:var(--text2);">你的资金：💰${p.money}</div>
                    </div>
                    <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="skipBuy()">继续</button>`;
            } else {
                // Show ALL upgradeable properties as a list — player picks which to upgrade
                const listHtml = owned.map(idx => {
                    const t = mono.tiles[idx];
                    const prop = mono.properties[idx];
                    const cost = Math.floor(t.price * 0.3);
                    const canAfford = p.money >= cost;
                    return `<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem;background:var(--card2);border-radius:6px;margin-bottom:.3rem;${!canAfford?'opacity:.5;':''}">
                        <span style="font-size:1.5rem;">${t.ic}</span>
                        <div style="flex:1;">
                            <div style="font-size:.8rem;font-weight:700;">${t.nm} <span style="color:var(--text2);font-weight:400;">Lv.${prop.level}→${prop.level+1}</span></div>
                            <div style="font-size:.7rem;color:var(--text2);">💰${cost}</div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="upgradeProperty(${idx},${cost})" ${!canAfford?'disabled':''}>⬆️ 升级</button>
                    </div>`;
                }).join('');
                modal.innerHTML = `
                    <div class="modal-drag-handle"></div>
                    <div class="modal-title">⬆️ 地产升级</div>
                    <div style="text-align:center;font-size:.8rem;color:var(--text2);padding:.3rem 0;">选择要升级的地产 | 你的资金：💰${p.money}</div>
                    <div style="max-height:50vh;overflow-y:auto;">${listHtml}</div>
                    <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="skipBuy()">跳过</button>`;
            }
            document.getElementById('modal-overlay').classList.add('show');
            return true; // Modal shown — always pause for player
        } else {
            // AI: pick the property with highest price (best ROI for rent increase)
            if (owned.length === 0) return false;
            // Sort by tile price descending — upgrade the most valuable first
            owned.sort((a, b) => mono.tiles[b].price - mono.tiles[a].price);
            const personality = AI_PERSONALITIES[p.personality];
            const aiDiff = getAIDifficulty();
            // AI may upgrade multiple properties if it has lots of money
            for (const tileIdx of owned) {
                const tile = mono.tiles[tileIdx];
                const cost = Math.floor(tile.price * 0.3);
                if (p.money >= cost && Math.random() < personality.upgradeChance * aiDiff) {
                    p.money -= cost;
                    mono.properties[tileIdx].level++;
                    p.stats.upgradesDone++;
                    p.stats.upgradeSpent += cost;
                    monoLog(`${p.ic} 升级 ${tile.nm} 到 Lv.${mono.properties[tileIdx].level}`, 'success');
                }
            }
            return false;
        }
    }

    function upgradeProperty(tileIdx, cost) {
        const p = mono.players[0];
        if (p.money < cost) { monoLog('资金不足！', 'error'); return; }
        p.money -= cost;
        mono.properties[tileIdx].level++;
        p.stats.upgradesDone++;
        p.stats.upgradeSpent += cost;
        recordHumanAction('upgradeProperty');
        monoLog(`🐰 升级 ${mono.tiles[tileIdx].nm} 到 Lv.${mono.properties[tileIdx].level} (-💰${cost})`, 'success');
        closeModal();
        saveMonopoly();
        renderMonopoly();
        if (!checkGameOver()) nextTurn();
    }

    /* ==================== Monopoly: Use Card (renamed to monoUseCard) ==================== */
    function monoUseCard(cardIdx) {
        const p = mono.players[0];
        if (mono.currentPlayer !== 0 || p.bankrupt) return;
        if (mono.rolling) return; // Can't use during roll
        const card = p.cards[cardIdx];
        if (!card) return;
        // Ensure monoEff function exists (restore from pool if lost during serialization)
        restoreCardFunctions(card);
        // Curse cards need target selection
        if (card.isCurse) {
            showCurseTargetModal(cardIdx, card);
            return;
        }
        p.cards.splice(cardIdx, 1);
        let effResult = '';
        if (card.monoEff) effResult = card.monoEff(p, mono) || '';
        if (card.enhanced) {
            if (card.id === 'funds_boost' || card.id === 'heal' || card.id === 'mega_funds' || card.id === 'god_bless') {
                p.money += 2000;
                effResult += ' (✨ 强化金币 +2000💰)';
            } else if (card.id === 'speed_boost') {
                p.speed = (p.speed || 0) + 3;
                effResult += ' (✨ 强化步数 +3)';
            } else {
                effResult += ' (✨ 强化卡牌效果倍增生效)';
            }
        }
        recordHumanAction('useCard');
        recordGameEvent('card_use', `${p.ic} ${p.nm}`, `使用 ${card.ic} ${card.n}`, effResult);
        monoLog(`🃏 兔可可 使用 ${card.ic} ${card.n}${effResult ? ' — ' + effResult : card.desc ? ' — ' + card.desc : ''}`, 'success');
        // Render FIRST so card disappears immediately, THEN show modal
        saveMonopoly();
        renderMonopoly();
        showCardUseModal(card, effResult);
    }

    /* Curse card target selection */
    function showCurseTargetModal(cardIdx, card) {
        const targets = mono.players.filter((p, i) => i !== 0 && !p.bankrupt);
        if (targets.length === 0) { monoLog('没有可施咒的对手', 'error'); return; }
        const targetHtml = targets.map(t => `<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:.3rem;" onclick="executeCurse(${cardIdx}, ${mono.players.indexOf(t)})">${t.ic} ${t.nm} (💰${t.money})</button>`).join('');
        showModal(`<div class="modal-title">${card.ic} ${card.n}</div>
            <div style="text-align:center;font-size:.8rem;color:var(--text2);padding:.5rem 0;">${card.desc}</div>
            <div style="font-size:.75rem;color:var(--accent);margin-bottom:.3rem;">选择施咒目标：</div>
            ${targetHtml}
            <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="closeModal()">取消</button>`);
    }

    function executeCurse(cardIdx, targetIdx) {
        const p = mono.players[0];
        const card = p.cards[cardIdx];
        const target = mono.players[targetIdx];
        if (!card || !target || target.bankrupt) return;
        // Ensure monoEff function exists (restore from pool if lost during serialization)
        restoreCardFunctions(card);
        p.cards.splice(cardIdx, 1);
        let effResult = '';
        if (card.monoEff) effResult = card.monoEff(p, mono, target) || '';
        recordHumanAction('useCard');
        recordGameEvent('card_curse', `${p.ic} ${p.nm}`, `对 ${target.nm} 施放 ${card.ic} ${card.n}`, effResult);
        monoLog(`🔥 兔可可 对 ${target.nm} 施放 ${card.ic} ${card.n} — ${effResult}`, 'event');
        // Render FIRST so card disappears immediately and game state updates
        saveMonopoly();
        renderMonopoly();
        // Then show hit effect animation
        showCurseHitEffect(target, card);
    }

    /* Visual hit effect for curse cards */
    function showCurseHitEffect(target, card) {
        const effect = document.createElement('div');
        effect.style.cssText = `position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;pointer-events:none;animation:curseFade 2s ease forwards;`;
        effect.innerHTML = `<div style="text-align:center;animation:curseHit 0.8s ease;">
            <div style="font-size:4rem;">${card.ic}</div>
            <div style="font-size:1.5rem;font-weight:800;color:var(--bad);margin-top:.5rem;">${target.nm}</div>
            <div style="font-size:1.2rem;color:var(--accent);margin-top:.3rem;">${card.n}</div>
        </div>`;
        // Add CSS animation if not exists
        if (!document.getElementById('curse-effect-style')) {
            const style = document.createElement('style');
            style.id = 'curse-effect-style';
            style.textContent = `@keyframes curseHit{0%{transform:scale(0) rotate(-180deg);opacity:0}50%{transform:scale(1.3) rotate(0);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes curseFade{0%{opacity:1}70%{opacity:1}100%{opacity:0}}`;
            document.head.appendChild(style);
        }
        document.body.appendChild(effect);
        setTimeout(() => {
            effect.remove();
            showModal(`<div style="text-align:center;padding:1rem;">
                <div style="font-size:2.5rem;margin-bottom:.5rem;">${card.ic}</div>
                <h3 style="color:var(--bad);">诅咒命中！</h3>
                <p style="color:var(--text2);margin:.5rem 0;">${target.ic} ${target.nm} 被 ${card.n} 击中</p>
                <button class="btn btn-primary" style="width:100%;" onclick="closeModal()">确定</button>
            </div>`);
        }, 1500);
    }

    /* ==================== Monopoly: Carry Card from Inventory ==================== */
    function carryCard(invIdx) {
        if (!mono) return;
        const p = mono.players[0];
        if (p.cards.length >= 8) { monoLog('手牌已满（最多8张）', 'error'); return; }
        const card = cardInventory[invIdx];
        if (!card) return;
        // Remove from inventory first
        cardInventory.splice(invIdx, 1);
        // Restore monoEff function (lost during JSON serialization)
        restoreCardFunctions(card);
        // Add to hand
        p.cards.push(card);
        monoLog(`🎒 携带 ${card.ic} ${card.n} 到游戏中`, 'success');
        showToast(`✓ ${card.n} 已移至手牌`, 'success');
        closeModal();
        saveInventory();
        saveMonopoly();
        // Re-render both inventory and game board immediately — force synchronous render
        // (renderMonopoly uses RAF throttle which may delay after closeModal)
        if (_renderRAFId) { cancelAnimationFrame(_renderRAFId); _renderRAFId = null; }
        _renderPending = false;
        _doRenderMonopoly();
        renderCardDrawArea();
    }

    // Double-click quick carry — bypasses detail popup
    let _lastCardClickTime = 0;
    let _lastCardClickIdx = -1;
    function handleCardInventoryClick(invIdx) {
        const now = Date.now();
        if (invIdx === _lastCardClickIdx && (now - _lastCardClickTime) < 400) {
            // Double click — quick carry
            _lastCardClickTime = 0;
            _lastCardClickIdx = -1;
            const p = mono?.players?.[0];
            if (p && p.cards.length < 8) {
                carryCard(invIdx);
            } else {
                monoLog('手牌已满或游戏未开始', 'error');
            }
        } else {
            _lastCardClickTime = now;
            _lastCardClickIdx = invIdx;
            // Single click — show detail popup after small delay (let double-click chance pass)
            setTimeout(function() {
                if (_lastCardClickIdx === invIdx && _lastCardClickTime > 0) {
                    _lastCardClickTime = 0;
                    _lastCardClickIdx = -1;
                    showCardDetailPopup(invIdx);
                }
            }, 350);
        }
    }

    /* ==================== Monopoly: Card Shop ==================== */
    const CARD_PRICE_BASE = { common: 500, uncommon: 1500, rare: 4000, legendary: 10000, curse: 2000 };
    let cardShopStock = [];

    function getCardPrice(rarity) {
        const economy = mono.economy || { inflation: 0.03 };
        const base = CARD_PRICE_BASE[rarity] || 500;
        const randomFactor = 0.8 + Math.random() * 0.4;
        return Math.floor(base * (1 + economy.inflation) * randomFactor);
    }

    function refreshCardShopStock() {
        cardShopStock = [];
        const stockCount = 4 + Math.floor(Math.random() * 3); // 4-6 cards
        for (let i = 0; i < stockCount; i++) {
            const card = drawWeightedCard();
            card.shopPrice = getCardPrice(card.rarity);
            cardShopStock.push(card);
        }
    }

    function showCardShop() {
        if (cardShopStock.length === 0) refreshCardShopStock();
        const p = mono.players[0];
        const isMyTurn = mono.currentPlayer === 0;
        const modal = document.getElementById('modal-content');
        const shopHtml = cardShopStock.map((c, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.4rem;background:var(--card2);border-radius:6px;margin-top:.3rem;border-left:3px solid ${RARITY_COLORS[c.rarity]};">
                <div>
                    <span style="font-size:1.2rem;">${c.ic}</span>
                    <span style="font-size:.8rem;font-weight:700;color:${RARITY_COLORS[c.rarity]};">${c.n}</span>
                    <div style="font-size:.65rem;color:var(--text2);">${c.desc}</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="buyShopCard(${i})" ${!isMyTurn || p.money < c.shopPrice || p.cards.length >= 8 ? 'disabled' : ''}>💰${c.shopPrice}</button>
            </div>
        `).join('');
        const sellHtml = p.cards.length > 0 ? p.cards.map((c, i) => {
            const sellPrice = Math.floor((CARD_PRICE_BASE[c.rarity] || 500) * (0.3 + Math.random() * 0.3));
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.3rem;background:var(--card2);border-radius:6px;margin-top:.2rem;">
                <span style="font-size:.75rem;"><span style="font-size:1rem;">${c.ic}</span> ${c.n}</span>
                <button class="btn btn-secondary btn-sm" onclick="sellCardToShop(${i}, ${sellPrice})" ${!isMyTurn ? 'disabled' : ''}>卖 💰${sellPrice}</button>
            </div>`;
        }).join('') : '<div style="font-size:.7rem;color:var(--text2);text-align:center;padding:.5rem;">没有可出售的手牌</div>';

        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🃏 卡牌商店</div>
            <div style="text-align:center;font-size:.8rem;color:var(--text2);padding:.3rem 0;">你的资金：💰${p.money} | 手牌：${p.cards.length}/8 ${!isMyTurn ? '| ⚠️ 非你的回合，仅可查看' : ''}</div>
            <div style="font-size:.75rem;font-weight:700;color:var(--accent);margin-top:.5rem;">🛒 购买卡牌（加入手牌）</div>
            ${shopHtml}
            <div style="font-size:.75rem;font-weight:700;color:var(--accent);margin-top:.75rem;">💰 出售手牌（回收价随机）</div>
            ${sellHtml}
            <div style="display:flex;gap:.5rem;margin-top:.75rem;">
                <button class="btn btn-secondary" style="flex:1;" onclick="refreshCardShopStock();showCardShop();">🔄 刷新库存</button>
                <button class="btn btn-secondary" style="flex:1;" onclick="closeModal()">离开</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function buyShopCard(idx) {
        const p = mono.players[0];
        const card = cardShopStock[idx];
        if (!card || p.money < card.shopPrice) { monoLog('资金不足', 'error'); return; }
        if (p.cards.length >= 8) { monoLog('手牌已满', 'error'); return; }
        p.money -= card.shopPrice;
        p.cards.push({...card});
        cardShopStock.splice(idx, 1);
        monoLog(`🃏 购买 ${card.ic} ${card.n}，花费 💰${card.shopPrice}`, 'success');
        showCardShop();
        saveMonopoly();
    }

    function sellCardToShop(idx, price) {
        const p = mono.players[0];
        const card = p.cards[idx];
        if (!card) return;
        p.cards.splice(idx, 1);
        p.money += price;
        monoLog(`💰 出售 ${card.ic} ${card.n}，获得 💰${price}`, 'success');
        showCardShop();
        saveMonopoly();
    }

    /* ==================== Monopoly: Wizard System ==================== */
    function showWizard() {
        const p = mono.players[0];
        const economy = mono.economy || calculateEconomyState();
        const progressMultiplier = 1 + Math.min(1, mono.turn / 100) * 0.5;
        const divinationCost = Math.floor(500 * progressMultiplier + Math.random() * 200);
        const wishCost = Math.floor(5000 * progressMultiplier + Math.random() * 1000);
        const curseCost = Math.floor(2000 * progressMultiplier + Math.random() * 500);
        const isMyTurn = mono.currentPlayer === 0;

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🧙 神秘巫师</div>
            <div style="text-align:center;font-size:.8rem;color:var(--text2);padding:.3rem 0;">你的资金：💰${p.money} ${!isMyTurn ? '| ⚠️ 非你的回合' : ''}</div>
            <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem;">
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;border-left:3px solid #3b82f6;">
                    <div style="font-size:.85rem;font-weight:700;">🔮 占卜 (💰${divinationCost})</div>
                    <div style="font-size:.7rem;color:var(--text2);">随机揭示：下N步格子/股市趋势/对手手牌</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="wizardDivination(${divinationCost})" ${!isMyTurn || p.money < divinationCost ? 'disabled' : ''}>占卜</button>
                </div>
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;border-left:3px solid #a78bfa;">
                    <div style="font-size:.85rem;font-weight:700;">⭐ 许愿 (💰${wishCost})</div>
                    <div style="font-size:.7rem;color:var(--text2);">随机获得：稀有卡牌/载具/升级/双倍租金/大额金币</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="wizardWish(${wishCost})" ${!isMyTurn || p.money < wishCost ? 'disabled' : ''}>许愿</button>
                </div>
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;border-left:3px solid #ef4444;">
                    <div style="font-size:.85rem;font-weight:700;">💀 诅咒 (💰${curseCost})</div>
                    <div style="font-size:.7rem;color:var(--text2);">对指定对手施放随机诅咒（比卡牌诅咒更强）</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="wizardCurse(${curseCost})" ${!isMyTurn || p.money < curseCost ? 'disabled' : ''}>施咒</button>
                </div>
                <button class="btn btn-secondary" onclick="closeModal()">离开</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function wizardDivination(cost) {
        const p = mono.players[0];
        if (p.money < cost) { monoLog('资金不足', 'error'); return; }
        p.money -= cost;
        const revealType = Math.floor(Math.random() * 3);
        let result = '';
        if (revealType === 0) {
            // Preview next tiles
            const total = getUnlockedTileCount();
            const previews = [];
            for (let i = 1; i <= 3; i++) {
                const pos = (p.pos + i) % total;
                previews.push(`${mono.tiles[pos].ic} ${mono.tiles[pos].nm}`);
            }
            result = `🔮 未来3步：${previews.join(' → ')}`;
        } else if (revealType === 1) {
            // Stock trend prediction
            const trend = mono.stockMarket >= 100 ? '上涨' : '下跌';
            const confidence = 60 + Math.floor(Math.random() * 40);
            result = `📊 股市预测：${trend}趋势（置信度${confidence}%）`;
        } else {
            // Reveal opponent hand
            const opponents = mono.players.filter((pl, i) => i !== 0 && !pl.bankrupt && pl.cards.length > 0);
            if (opponents.length > 0) {
                const target = opponents[Math.floor(Math.random() * opponents.length)];
                result = `🃏 ${target.ic} ${target.nm} 的手牌：${target.cards.map(c => `${c.ic}${c.n}`).join(', ')}`;
            } else {
                result = `🔮 占卜失败，对手均无手牌`;
            }
        }
        monoLog(`🧙 占卜结果：${result}`, 'info');
        showModal(`<div class="modal-title">🔮 占卜结果</div>
            <div style="text-align:center;padding:1rem;font-size:.9rem;line-height:1.8;">${result}</div>
            <button class="btn btn-primary" style="width:100%;" onclick="showWizard()">返回</button>`);
        saveMonopoly();
    }

    function wizardWish(cost) {
        const p = mono.players[0];
        if (p.money < cost) { monoLog('资金不足', 'error'); return; }
        p.money -= cost;
        const wishType = Math.floor(Math.random() * 6);
        let result = '';
        switch (wishType) {
            case 0: { // Rare/legendary card
                const rarity = Math.random() < 0.3 ? 'legendary' : 'rare';
                const pool = CARD_POOL.filter(c => c.rarity === rarity);
                const card = pool[Math.floor(Math.random() * pool.length)];
                if (p.cards.length < 8) { p.cards.push({...card}); result = `🃏 获得 ${rarity === 'legendary' ? '传说' : '珍贵'} 卡牌 ${card.ic} ${card.n}`; }
                else { result = `🃏 手牌已满，获得 ${card.n} 但无法携带`; }
                break;
            }
            case 1: { // Vehicle
                const affordableVehicles = VEHICLE_POOL.filter(v => v.price <= 20000);
                const v = affordableVehicles[Math.floor(Math.random() * affordableVehicles.length)];
                p.vehicle = v;
                result = `🚗 获得载具 ${v.ic} ${v.nm}`;
                break;
            }
            case 2: { // Property upgrade
                const myProps = mono.tiles.filter((t, i) => t.type === 'property' && mono.properties[i].owner === 0 && mono.properties[i].level < 3);
                if (myProps.length > 0) {
                    const target = myProps[Math.floor(Math.random() * myProps.length)];
                    const idx = mono.tiles.indexOf(target);
                    mono.properties[idx].level++;
                    result = `⬆️ ${target.ic} ${target.nm} 免费升级至 Lv${mono.properties[idx].level}`;
                } else { result = `⬆️ 没有可升级的房产`; }
                break;
            }
            case 3: { // Double rent next turn
                p.doubleDice = (p.doubleDice||0)+1;
                result = `🎲 下回合骰子翻倍`;
                break;
            }
            case 4: { // Big money
                const reward = 3000 + Math.floor(Math.random() * 5000);
                p.money += reward;
                result = `💰 天降横财 +${reward}💰`;
                break;
            }
            case 5: { // Lucky + shield
                p.lucky = (p.lucky||0)+1; p.shield = (p.shield||0)+1;
                result = `🍀 获得幸运+护盾`;
                break;
            }
        }
        monoLog(`🧙 许愿结果：${result}`, 'success');
        showModal(`<div class="modal-title">⭐ 许愿结果</div>
            <div style="text-align:center;padding:1rem;font-size:1.1rem;font-weight:700;color:var(--accent);">${result}</div>
            <button class="btn btn-primary" style="width:100%;" onclick="showWizard()">返回</button>`);
        saveMonopoly();
    }

    function wizardCurse(cost) {
        const p = mono.players[0];
        if (p.money < cost) { monoLog('资金不足', 'error'); return; }
        const targets = mono.players.filter((pl, i) => i !== 0 && !pl.bankrupt);
        if (targets.length === 0) { monoLog('没有可施咒的对手', 'error'); return; }
        p.money -= cost;
        // Store pending cost for when target is selected
        window._wizardCurseCost = cost;
        const targetHtml = targets.map(t => `<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:.3rem;" onclick="executeWizardCurse(${mono.players.indexOf(t)})">${t.ic} ${t.nm} (💰${t.money})</button>`).join('');
        showModal(`<div class="modal-title">💀 巫师诅咒</div>
            <div style="text-align:center;font-size:.8rem;color:var(--text2);padding:.3rem 0;">选择施咒目标（比卡牌诅咒更强+1回合）</div>
            ${targetHtml}
            <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="showWizard()">取消</button>`);
    }

    function executeWizardCurse(targetIdx) {
        const p = mono.players[0];
        const target = mono.players[targetIdx];
        if (!target || target.bankrupt) return;
        const curses = [
            {ic:'⛓️', n:'强效禁锢', eff:() => { target.jailTurns = 2; return '被禁锢2回合'; }},
            {ic:'🚫', n:'强效封印', eff:() => { target.banned = 3; return '被封印3回合'; }},
            {ic:'🏥', n:'强效住院', eff:() => { target.hospital = 2; return '住院2回合'; }},
            {ic:'📉', n:'财富诅咒', eff:() => { const loss = Math.floor(target.money * 0.2); target.money -= loss; return `失去 ${loss}💰`; }},
            {ic:'🔙', n:'强效回退', eff:() => { const total = getUnlockedTileCount(); target.pos = (target.pos - 8 + total) % total; return '回退8格'; }},
        ];
        const curse = curses[Math.floor(Math.random() * curses.length)];
        const result = curse.eff();
        monoLog(`🧙 巫师对 ${target.nm} 施放 ${curse.ic} ${curse.n} — ${result}`, 'event');
        showCurseHitEffect(target, curse);
        saveMonopoly();
    }

    /* ==================== Monopoly: Market & Trading ==================== */
    