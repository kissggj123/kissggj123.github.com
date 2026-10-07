function showMarketModal() {
        const p = mono.players[0];
        const isMyTurn = mono.currentPlayer === 0;
        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🏪 二手交易市场</div>
            <div style="text-align:center;font-size:.8rem;color:var(--text2);padding:.3rem 0;">你的资金：💰${p.money} ${!isMyTurn ? '| ⚠️ 非你的回合' : ''}</div>
            <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem;">
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;">
                    <div style="font-size:.85rem;font-weight:700;">🃏 卡牌交易</div>
                    <div style="font-size:.7rem;color:var(--text2);">挂卖手牌卡牌，AI有概率购买</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="showCardMarket()" ${!isMyTurn || p.cards.length === 0 ? 'disabled' : ''}>挂卖卡牌</button>
                </div>
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;">
                    <div style="font-size:.85rem;font-weight:700;">🚗 载具交易</div>
                    <div style="font-size:.7rem;color:var(--text2);">出售载具，折价50-70%</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="showVehicleMarket()" ${!isMyTurn || !p.vehicle ? 'disabled' : ''}>出售载具</button>
                </div>
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;">
                    <div style="font-size:.85rem;font-weight:700;">🤝 玩家交易</div>
                    <div style="font-size:.7rem;color:var(--text2);">向AI玩家发起交易提案</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="showTradeProposal()" ${!isMyTurn ? 'disabled' : ''}>发起交易</button>
                </div>
                <button class="btn btn-secondary" onclick="closeModal()">离开市场</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function showCardMarket() {
        const p = mono.players[0];
        const cardHtml = p.cards.map((c, i) => {
            const suggested = getCardPrice(c.rarity);
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.3rem;background:var(--card2);border-radius:6px;margin-top:.2rem;">
                <span style="font-size:.75rem;"><span style="font-size:1rem;">${c.ic}</span> ${c.n}</span>
                <button class="btn btn-secondary btn-sm" onclick="listCardForSale(${i}, ${suggested})">挂卖 💰${suggested}</button>
            </div>`;
        }).join('');
        showModal(`<div class="modal-title">🃏 挂卖卡牌</div>
            <div style="font-size:.7rem;color:var(--text2);margin-bottom:.3rem;">建议价为系统定价，挂卖后AI有概率购买</div>
            ${cardHtml}
            <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="showMarketModal()">返回</button>`);
    }

    function listCardForSale(idx, price) {
        const p = mono.players[0];
        const card = p.cards[idx];
        if (!card) return;
        // AI decides to buy or not
        const aiBuyers = mono.players.filter((pl, i) => i !== 0 && !pl.bankrupt && pl.money >= price);
        if (aiBuyers.length > 0 && Math.random() < 0.6) {
            const buyer = aiBuyers[Math.floor(Math.random() * aiBuyers.length)];
            if (buyer.cards.length < 8) {
                p.cards.splice(idx, 1);
                p.money += price;
                buyer.money -= price;
                buyer.cards.push({...card});
                monoLog(`🤝 ${buyer.ic} ${buyer.nm} 购买了你的 ${card.ic} ${card.n}，获得 💰${price}`, 'success');
                showToast(`✓ ${buyer.nm} 购买了 ${card.n}`, 'success');
            } else {
                monoLog(`🤝 没有AI愿意购买 ${card.n}`, 'info');
            }
        } else {
            monoLog(`🤝 没有AI愿意购买 ${card.n}`, 'info');
        }
        showMarketModal();
        saveMonopoly();
    }

    function showVehicleMarket() {
        const p = mono.players[0];
        if (!p.vehicle) { monoLog('没有载具可出售', 'error'); return; }
        const v = p.vehicle;
        const basePrice = VEHICLE_POOL.find(vp => vp.id === v.id)?.price || 0;
        const sellPrice = Math.floor(basePrice * (0.5 + Math.random() * 0.2));
        showModal(`<div class="modal-title">🚗 出售载具</div>
            <div style="text-align:center;padding:1rem;">
                <div style="font-size:2.5rem;">${v.ic}</div>
                <div style="font-weight:700;">${v.nm}</div>
                <div style="font-size:.8rem;color:var(--text2);margin-top:.3rem;">原价 💰${basePrice}</div>
                <div style="font-size:1.2rem;color:var(--accent);margin-top:.5rem;">回收价 💰${sellPrice}</div>
            </div>
            <button class="btn btn-primary" style="width:100%;" onclick="sellVehicleToMarket(${sellPrice})">确认出售</button>
            <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;" onclick="showMarketModal()">返回</button>`);
    }

    function sellVehicleToMarket(price) {
        const p = mono.players[0];
        if (!p.vehicle) return;
        const v = p.vehicle;
        p.money += price;
        p.vehicle = null;
        monoLog(`🚗 出售 ${v.ic} ${v.nm}，获得 💰${price}`, 'success');
        showMarketModal();
        saveMonopoly();
    }

    function showTradeProposal() {
        const p = mono.players[0];
        const opponents = mono.players.filter((pl, i) => i !== 0 && !pl.bankrupt);
        if (opponents.length === 0) { monoLog('没有可交易的对手', 'error'); return; }
        const targetHtml = opponents.map(t => {
            const idx = mono.players.indexOf(t);
            const offerCards = t.cards.length > 0 ? t.cards.map(c => `${c.ic}${c.n}`).join(', ') : '无手牌';
            const vehicleStr = t.vehicle ? `${t.vehicle.ic}${t.vehicle.nm}` : '无载具';
            return `<div style="padding:.4rem;background:var(--card2);border-radius:6px;margin-top:.3rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span>${t.ic} ${t.nm} (💰${t.money})</span>
                    <button class="btn btn-primary btn-sm" onclick="proposeTrade(${idx})">发起交易</button>
                </div>
                <div style="font-size:.65rem;color:var(--text2);">手牌：${offerCards} | 载具：${vehicleStr}</div>
            </div>`;
        }).join('');
        showModal(`<div class="modal-title">🤝 选择交易对象</div>
            <div style="font-size:.7rem;color:var(--text2);margin-bottom:.3rem;">用卡牌/载具/金币交换对方的卡牌/载具/金币，支持多轮还价</div>
            ${targetHtml}
            <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="showMarketModal()">返回</button>`);
    }

    /* Trade negotiation state */
    let tradeNegotiation = null;

    function proposeTrade(targetIdx) {
        const p = mono.players[0];
        const target = mono.players[targetIdx];
        if (!target || target.bankrupt) return;
        const myCards = p.cards.length > 0 ? p.cards.map((c, i) => `<option value="card_${i}">${c.ic} ${c.n} (${c.rarity})</option>`).join('') : '';
        const targetCards = target.cards.length > 0 ? target.cards.map((c, i) => `<option value="card_${i}">${c.ic} ${c.n} (${c.rarity})</option>`).join('') : '';
        const myVehicleOpt = p.vehicle ? `<option value="vehicle">🚗 ${p.vehicle.ic} ${p.vehicle.nm}</option>` : '';
        const targetVehicleOpt = target.vehicle ? `<option value="vehicle">🚗 ${target.vehicle.ic} ${target.vehicle.nm}</option>` : '';

        // Property options
        const myProps = mono.tiles.map((t, i) => ({t, i})).filter(({t, i}) => t.type === 'property' && mono.properties[i].owner === 0);
        const targetProps = mono.tiles.map((t, i) => ({t, i})).filter(({t, i}) => t.type === 'property' && mono.properties[i].owner === targetIdx);

        const myPropOpt = myProps.length > 0 ? myProps.map(({t, i}) => `<option value="prop_${i}">🏠 ${t.nm} (💰${t.price})</option>`).join('') : '';
        const targetPropOpt = targetProps.length > 0 ? targetProps.map(({t, i}) => `<option value="prop_${i}">🏠 ${t.nm} (💰${t.price})</option>`).join('') : '';

        // Reset negotiation state
        tradeNegotiation = { targetIdx, round: 0, maxRounds: 3 };

        showModal(`<div class="modal-title">🤝 与 ${target.ic} ${target.nm} 交易</div>
            <div style="font-size:.65rem;color:var(--text2);margin-bottom:.3rem;">💡 提示：给出价值越高，AI越可能接受。可交易地产、卡牌、载具与现金。</div>
            <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                <div style="flex:1;padding:.5rem;background:var(--card2);border-radius:8px;">
                    <div style="font-size:.75rem;font-weight:700;color:var(--accent);">你给出</div>
                    <select id="give-property" style="width:100%;margin-top:.3rem;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                        <option value="none">不选地产</option>
                        ${myPropOpt}
                    </select>
                    <select id="give-card" style="width:100%;margin-top:.3rem;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                        <option value="none">不选卡牌</option>
                        ${myCards}
                    </select>
                    <select id="give-vehicle" style="width:100%;margin-top:.3rem;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                        <option value="none">不选载具</option>
                        ${myVehicleOpt}
                    </select>
                    <input type="number" id="give-money" placeholder="金币" min="0" max="${p.money}" style="width:100%;margin-top:.3rem;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                </div>
                <div style="flex:1;padding:.5rem;background:var(--card2);border-radius:8px;">
                    <div style="font-size:.75rem;font-weight:700;color:var(--accent);">你想要</div>
                    <select id="want-property" style="width:100%;margin-top:.3rem;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                        <option value="none">不选地产</option>
                        ${targetPropOpt}
                    </select>
                    <select id="want-card" style="width:100%;margin-top:.3rem;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                        <option value="none">不选卡牌</option>
                        ${targetCards}
                    </select>
                    <select id="want-vehicle" style="width:100%;margin-top:.3rem;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                        <option value="none">不选载具</option>
                        ${targetVehicleOpt}
                    </select>
                    <input type="number" id="want-money" placeholder="金币" min="0" max="${target.money}" style="width:100%;margin-top:.3rem;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:.5rem;" onclick="submitTradeOffer()">提交提案</button>
            <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;" onclick="showMarketModal()">返回</button>`);
    }

    /* Calculate trade value of items including properties with region monopoly strategic bonus */
    function getTradeValue(player, propVal, cardVal, vehicleVal, money, evaluatorPlayerIdx = -1) {
        let val = money || 0;
        if (propVal && propVal !== 'none') {
            const tileIdx = parseInt(propVal.split('_')[1]);
            const tile = mono.tiles[tileIdx];
            const prop = mono.properties[tileIdx];
            if (tile && prop) {
                let pVal = Math.floor(tile.price * (1 + (prop.level || 0) * 0.3));
                if (evaluatorPlayerIdx >= 0) {
                    // Check if acquiring this property completes a region set for the evaluator
                    const regionProps = mono.tiles.filter(t => t.type === 'property' && t.region === tile.region);
                    const ownedByEvaluator = regionProps.filter(t => mono.properties[t.id].owner === evaluatorPlayerIdx).length;
                    if (ownedByEvaluator >= regionProps.length - 1) {
                        pVal = Math.floor(pVal * 1.8); // Strategic bonus for completing a set
                    }
                }
                val += pVal;
            }
        }
        if (cardVal && cardVal !== 'none') {
            const cardIdx = parseInt(cardVal.split('_')[1]);
            if (player.cards && player.cards[cardIdx]) {
                val += CARD_PRICE_BASE[player.cards[cardIdx].rarity] || 500;
            }
        }
        if (vehicleVal === 'vehicle' && player.vehicle) {
            const vp = VEHICLE_POOL.find(v => v.id === player.vehicle.id);
            val += vp ? vp.price : 0;
        }
        return val;
    }

    /* Execute a trade with given parameters */
    function doExecuteTrade(targetIdx, givePropVal, giveCardVal, giveVehicleVal, giveMoney, wantPropVal, wantCardVal, wantVehicleVal, wantMoney) {
        const p = mono.players[0];
        const target = mono.players[targetIdx];

        // Transfer properties
        if (givePropVal && givePropVal !== 'none') {
            const tileIdx = parseInt(givePropVal.split('_')[1]);
            mono.properties[tileIdx].owner = targetIdx;
            monoLog(`🏠 转移地产 ${mono.tiles[tileIdx].nm} 给 ${target.nm}`, 'info');
        }
        if (wantPropVal && wantPropVal !== 'none') {
            const tileIdx = parseInt(wantPropVal.split('_')[1]);
            mono.properties[tileIdx].owner = 0;
            monoLog(`🏠 从 ${target.nm} 获得地产 ${mono.tiles[tileIdx].nm}`, 'success');
        }
        // Transfer cards
        if (giveCardVal && giveCardVal !== 'none') {
            const cardIdx = parseInt(giveCardVal.split('_')[1]);
            const card = p.cards[cardIdx];
            p.cards.splice(cardIdx, 1);
            if (target.cards.length < 8) target.cards.push({...card});
        }
        if (wantCardVal && wantCardVal !== 'none') {
            const cardIdx = parseInt(wantCardVal.split('_')[1]);
            const card = target.cards[cardIdx];
            target.cards.splice(cardIdx, 1);
            if (p.cards.length < 8) p.cards.push({...card});
        }
        // Transfer vehicles
        if (giveVehicleVal === 'vehicle' && p.vehicle) {
            const tmp = p.vehicle;
            p.vehicle = target.vehicle || null;
            target.vehicle = tmp;
        } else if (wantVehicleVal === 'vehicle' && target.vehicle) {
            const tmp = target.vehicle;
            target.vehicle = p.vehicle || null;
            p.vehicle = tmp;
        }
        // Transfer money
        if (giveMoney > 0) { p.money -= giveMoney; target.money += giveMoney; }
        if (wantMoney > 0) { target.money -= wantMoney; p.money += wantMoney; }
    }

    function submitTradeOffer() {
        const p = mono.players[0];
        const targetIdx = tradeNegotiation.targetIdx;
        const target = mono.players[targetIdx];
        if (!target || target.bankrupt) { showMarketModal(); return; }

        const givePropVal = document.getElementById('give-property')?.value || 'none';
        const giveCardVal = document.getElementById('give-card')?.value || 'none';
        const giveVehicleVal = document.getElementById('give-vehicle')?.value || 'none';
        const giveMoney = parseInt(document.getElementById('give-money')?.value) || 0;
        const wantPropVal = document.getElementById('want-property')?.value || 'none';
        const wantCardVal = document.getElementById('want-card')?.value || 'none';
        const wantVehicleVal = document.getElementById('want-vehicle')?.value || 'none';
        const wantMoney = parseInt(document.getElementById('want-money')?.value) || 0;

        if (givePropVal === 'none' && giveCardVal === 'none' && giveVehicleVal === 'none' && giveMoney === 0) {
            monoLog('请提供交易内容', 'error'); return;
        }
        if (wantPropVal === 'none' && wantCardVal === 'none' && wantVehicleVal === 'none' && wantMoney === 0) {
            monoLog('请选择想要的回报', 'error'); return;
        }
        if (giveMoney > p.money) { monoLog('资金不足', 'error'); return; }
        if (wantMoney > target.money) { monoLog('对方资金不足', 'error'); return; }

        const giveValue = getTradeValue(p, givePropVal, giveCardVal, giveVehicleVal, giveMoney, targetIdx);
        const wantValue = getTradeValue(target, wantPropVal, wantCardVal, wantVehicleVal, wantMoney, 0);

        tradeNegotiation.round++;
        const personality = AI_PERSONALITIES[target.personality] || { buyChance: 0.5 };

        // AI evaluates the offer
        const ratio = wantValue / Math.max(1, giveValue);
        const acceptChance = Math.max(0.05, 1 - ratio) * (target.personality === 'aggressive' ? 1.2 : target.personality === 'conservative' ? 0.8 : 1);

        if (Math.random() < acceptChance && target.money >= wantMoney) {
            // AI accepts
            doExecuteTrade(targetIdx, givePropVal, giveCardVal, giveVehicleVal, giveMoney, wantPropVal, wantCardVal, wantVehicleVal, wantMoney);
            monoLog(`🤝 ${target.ic} ${target.nm} 接受了交易！(第${tradeNegotiation.round}轮)`, 'success');
            showToast(`✓ 交易成功`, 'success');
            tradeNegotiation = null;
            showMarketModal();
            saveMonopoly();
            renderMonopoly();
        } else if (tradeNegotiation.round < tradeNegotiation.maxRounds) {
            // AI generates counter-offer
            showCounterOffer(targetIdx, givePropVal, giveCardVal, giveVehicleVal, giveMoney, wantPropVal, wantCardVal, wantVehicleVal, wantMoney, giveValue, wantValue);
        } else {
            // Max rounds reached, AI walks away
            monoLog(`🤝 ${target.ic} ${target.nm} 谈判破裂（已达${tradeNegotiation.maxRounds}轮上限）`, 'error');
            showToast(`${target.nm} 谈判破裂`, 'error');
            tradeNegotiation = null;
            showMarketModal();
            saveMonopoly();
        }
    }

    function showCounterOffer(targetIdx, givePropVal, giveCardVal, giveVehicleVal, giveMoney, wantPropVal, wantCardVal, wantVehicleVal, wantMoney, giveValue, wantValue) {
        const p = mono.players[0];
        const target = mono.players[targetIdx];
        const personality = AI_PERSONALITIES[target.personality] || { buyChance: 0.5 };

        let counterType = '';
        let counterDesc = '';
        let adjustedGiveMoney = giveMoney;
        let adjustedWantMoney = wantMoney;

        // Decide counter strategy based on value gap
        const gap = wantValue - giveValue;
        if (gap > 0) {
            // AI is getting less than giving — ask for more money from player
            const extra = Math.floor(gap * (target.personality === 'aggressive' ? 1.1 : 0.9));
            adjustedGiveMoney = Math.min(p.money, giveMoney + extra);
            counterType = 'request_more';
            counterDesc = `需要你额外支付 💰${extra} 金币`;
        } else {
            // AI is getting more than giving — offer less money back
            const reduce = Math.floor(Math.abs(gap) * 0.5);
            adjustedWantMoney = Math.max(0, wantMoney - reduce);
            counterType = 'offer_less';
            counterDesc = `只愿意支付 💰${adjustedWantMoney} 金币（减少${reduce}）`;
        }

        // Build counter-offer summary
        let giveSummary = [];
        if (givePropVal && givePropVal !== 'none') giveSummary.push(`🏠${mono.tiles[parseInt(givePropVal.split('_')[1])]?.nm || '地产'}`);
        if (giveCardVal && giveCardVal !== 'none') giveSummary.push(`${p.cards[parseInt(giveCardVal.split('_')[1])]?.ic}卡牌`);
        if (giveVehicleVal === 'vehicle') giveSummary.push('载具');
        if (adjustedGiveMoney > 0) giveSummary.push(`💰${adjustedGiveMoney}`);

        let wantSummary = [];
        if (wantPropVal && wantPropVal !== 'none') wantSummary.push(`🏠${mono.tiles[parseInt(wantPropVal.split('_')[1])]?.nm || '地产'}`);
        if (wantCardVal && wantCardVal !== 'none') wantSummary.push(`${target.cards[parseInt(wantCardVal.split('_')[1])]?.ic}卡牌`);
        if (wantVehicleVal === 'vehicle') wantSummary.push('载具');
        if (adjustedWantMoney > 0) wantSummary.push(`💰${adjustedWantMoney}`);

        showModal(`<div class="modal-title">🤝 ${target.ic} ${target.nm} 的还价</div>
            <div style="text-align:center;padding:.5rem;background:var(--card2);border-radius:8px;margin-bottom:.5rem;">
                <div style="font-size:.8rem;color:var(--text2);">${target.ic} 摇了摇头...</div>
                <div style="font-size:.75rem;margin-top:.3rem;color:var(--warn);">「${counterDesc}」</div>
                <div style="font-size:.6rem;color:var(--text2);margin-top:.2rem;">谈判第 ${tradeNegotiation.round}/${tradeNegotiation.maxRounds} 轮</div>
            </div>
            <div style="display:flex;gap:.5rem;margin-top:.3rem;">
                <div style="flex:1;padding:.4rem;background:var(--card2);border-radius:6px;text-align:center;">
                    <div style="font-size:.7rem;font-weight:700;color:var(--accent);">你需给出</div>
                    <div style="font-size:.75rem;margin-top:.2rem;">${giveSummary.join(' + ') || '无'}</div>
                </div>
                <div style="flex:1;padding:.4rem;background:var(--card2);border-radius:6px;text-align:center;">
                    <div style="font-size:.7rem;font-weight:700;color:var(--accent);">你将获得</div>
                    <div style="font-size:.75rem;margin-top:.2rem;">${wantSummary.join(' + ') || '无'}</div>
                </div>
            </div>
            <div style="display:flex;gap:.3rem;margin-top:.5rem;">
                <button class="btn btn-primary" style="flex:1;font-size:.75rem;" onclick="acceptCounterOffer('${givePropVal}','${giveCardVal}','${giveVehicleVal}',${adjustedGiveMoney},'${wantPropVal}','${wantCardVal}','${wantVehicleVal}',${adjustedWantMoney})">✓ 接受还价</button>
                <button class="btn btn-secondary" style="flex:1;font-size:.75rem;" onclick="rejectCounterOffer()">✗ 拒绝还价</button>
            </div>
            <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;font-size:.7rem;" onclick="showMarketModal()">放弃交易</button>`);
    }

    window.acceptCounterOffer = function(givePropVal, giveCardVal, giveVehicleVal, giveMoney, wantPropVal, wantCardVal, wantVehicleVal, wantMoney) {
        if (!tradeNegotiation) return;
        const targetIdx = tradeNegotiation.targetIdx;
        const target = mono.players[targetIdx];
        const p = mono.players[0];

        if (giveMoney > p.money) { monoLog('资金不足，无法接受还价', 'error'); return; }
        if (wantMoney > target.money) { monoLog('对方资金不足', 'error'); return; }

        doExecuteTrade(targetIdx, givePropVal, giveCardVal, giveVehicleVal, giveMoney, wantPropVal, wantCardVal, wantVehicleVal, wantMoney);
        monoLog(`🤝 你接受了 ${target.nm} 的还价，交易达成！`, 'success');
        showToast(`✓ 交易成功`, 'success');
        tradeNegotiation = null;
        showMarketModal();
        saveMonopoly();
        renderMonopoly();
    };

    window.rejectCounterOffer = function() {
        const targetIdx = tradeNegotiation.targetIdx;
        const target = mono.players[targetIdx];
        if (tradeNegotiation.round < tradeNegotiation.maxRounds) {
            // Player can modify and resubmit
            monoLog(`🤝 你拒绝了还价，可以修改提案重新提交`, 'info');
            proposeTrade(targetIdx);
        } else {
            monoLog(`🤝 谈判破裂（已达${tradeNegotiation.maxRounds}轮上限）`, 'error');
            tradeNegotiation = null;
            showMarketModal();
        }
    };

    /* AI-initiated trade proposal to player */
    function aiInitiateTrade(aiIdx) {
        const ai = mono.players[aiIdx];
        const p = mono.players[0];
        if (!ai || ai.bankrupt || ai.cards.length === 0) return;

        // AI picks a card it wants to offer and what it wants in return
        const offerCardIdx = Math.floor(Math.random() * ai.cards.length);
        const offerCard = ai.cards[offerCardIdx];
        const offerCardVal = CARD_PRICE_BASE[offerCard.rarity] || 500;

        // AI wants either money or one of player's cards
        const wantMoney = Math.floor(offerCardVal * (0.7 + Math.random() * 0.3));
        let wantCardIdx = -1;
        if (p.cards.length > 0 && Math.random() < 0.4) {
            // Pick a player card of similar or lower value
            const candidates = p.cards.map((c, i) => ({c, i})).filter(({c}) => (CARD_PRICE_BASE[c.rarity] || 500) <= offerCardVal * 1.2);
            if (candidates.length > 0) {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                wantCardIdx = pick.i;
            }
        }

        const wantCardLabel = wantCardIdx >= 0 ? `${p.cards[wantCardIdx].ic} ${p.cards[wantCardIdx].n}` : `💰${wantMoney}`;

        showModal(`<div class="modal-title">🤝 ${ai.ic} ${ai.nm} 向你发起交易</div>
            <div style="text-align:center;padding:.5rem;background:var(--card2);border-radius:8px;margin-bottom:.5rem;">
                <div style="font-size:.8rem;">${ai.ic} 想用 <span style="color:var(--accent);font-weight:700;">${offerCard.ic} ${offerCard.n} (${offerCard.rarity})</span></div>
                <div style="font-size:.75rem;margin-top:.2rem;">交换你的 <span style="color:var(--accent);font-weight:700;">${wantCardLabel}</span></div>
            </div>
            <div style="display:flex;gap:.3rem;margin-top:.5rem;">
                <button class="btn btn-primary" style="flex:1;" onclick="acceptAiTrade(${aiIdx},${offerCardIdx},${wantCardIdx},${wantMoney})">✓ 接受</button>
                <button class="btn btn-danger" style="flex:1;" onclick="rejectAiTrade(${aiIdx})">✗ 拒绝</button>
            </div>
            <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;font-size:.7rem;" onclick="counterAiTrade(${aiIdx},${offerCardIdx},${wantCardIdx},${wantMoney})">🔄 还价</button>`);
        // Pause AI turn — wait for player response
        mono.pendingTrade = true;
    }

    /* Resume AI turn after trade response */
    function continueAiTurn(idx) {
        const p = mono.players[idx];
        if (!p || p.bankrupt) { nextTurn(); return; }
        const personality = AI_PERSONALITIES[p.personality];

        // Use card? Smart selection — synced with aiTurn logic for consistency
        if (p.cards.length > 0) {
            const aiDiff = getAIDifficulty();
            const effectiveCardChance = personality.cardUseChance * aiDiff;
            const alivePlayers = mono.players.filter(pl => !pl.bankrupt);
            const leader = alivePlayers.reduce((a, b) => (a.money + (a.stats?.propertiesBought || 0) * 1000) > (b.money + (b.stats?.propertiesBought || 0) * 1000) ? a : b);
            const humanIsLeader = leader === mono.players[0] && idx !== 0;
            const aggressionBonus = humanIsLeader ? 0.2 : 0;
            const maxCards = (p.personality === 'aggressive' && p.cards.length > 2) ? 2 : 1;
            for (let cardRound = 0; cardRound < maxCards && p.cards.length > 0; cardRound++) {
                if (Math.random() > effectiveCardChance + aggressionBonus) break;
                let cardIdx = -1;
                const curseCards = p.cards.map((c, i) => c.isCurse ? i : -1).filter(i => i >= 0);
                const hackerCards = p.cards.map((c, i) => c.isHacker ? i : -1).filter(i => i >= 0);
                const defensiveCards = p.cards.map((c, i) => (c.id === 'shield' || c.id === 'mirror' || c.id === 'tax_free') ? i : -1).filter(i => i >= 0);
                const forceMoveCards = p.cards.map((c, i) => (c.id === 'summon_rent' || c.id === 'mass_summon' || c.id === 'magnetic_field' || c.id === 'tax_audit') ? i : -1).filter(i => i >= 0);
                const aiOwnsProperties = mono.tiles.some((t, i) => t.type === 'property' && mono.properties[i].owner === idx);
                // Decision tree (same as aiTurn):
                if (aiOwnsProperties && forceMoveCards.length > 0 && Math.random() < 0.65) {
                    cardIdx = forceMoveCards[Math.floor(Math.random() * forceMoveCards.length)];
                } else if (p.money < 3000 && curseCards.length > 0) {
                    const drainCards = curseCards.filter(ci => p.cards[ci].id === 'curse_drain' || p.cards[ci].id === 'tax_audit' || p.cards[ci].id === 'summon_rent');
                    if (drainCards.length > 0) cardIdx = drainCards[Math.floor(Math.random() * drainCards.length)];
                } else if (p.shield === 0 && defensiveCards.length > 0 && Math.random() < 0.4) {
                    cardIdx = defensiveCards[Math.floor(Math.random() * defensiveCards.length)];
                } else if (humanIsLeader && (curseCards.length > 0 || hackerCards.length > 0) && Math.random() < (personality.attackLeaderBias || 0.5)) {
                    const attackCards = [...curseCards, ...hackerCards];
                    cardIdx = attackCards[Math.floor(Math.random() * attackCards.length)];
                } else if (curseCards.length > 0 && Math.random() < 0.7) {
                    cardIdx = curseCards[Math.floor(Math.random() * curseCards.length)];
                } else {
                    cardIdx = Math.floor(Math.random() * p.cards.length);
                }
                if (cardIdx < 0) break;
                const card = p.cards[cardIdx];
                p.cards.splice(cardIdx, 1);
                restoreCardFunctions(card);
                if (card.monoEff) {
                    if (card.isCurse) {
                        const targets = mono.players.filter((pl, i) => i !== idx && !pl.bankrupt);
                        if (targets.length > 0) {
                            let target;
                            const r = Math.random();
                            if (r < (personality.attackLeaderBias || 0.5)) {
                                target = humanIsLeader ? mono.players[0] : leader;
                                if (target === p || target.bankrupt) target = targets.reduce((a, b) => a.money > b.money ? a : b);
                            } else if (r < (personality.attackLeaderBias || 0.5) + 0.25 && targets.includes(mono.players[0])) {
                                target = mono.players[0];
                            } else {
                                if (card.id === 'curse_drain' || card.id === 'tax_audit' || card.id === 'summon_rent') {
                                    target = targets.reduce((a, b) => a.money > b.money ? a : b);
                                } else {
                                    target = targets[Math.floor(Math.random() * targets.length)];
                                }
                            }
                            const effResult = card.monoEff(p, mono, target) || '';
                            recordGameEvent('card_curse', `${p.ic} ${p.nm}`, `对 ${target.nm} 施放 ${card.ic} ${card.n}`, effResult);
                            monoLog(`🔥 ${p.ic} 对 ${target.nm} 施放 ${card.ic} ${card.n} — ${effResult}`, 'event');
                            if (target === mono.players[0]) showToast(`🔥 被 ${p.nm} 施放 ${card.ic} ${card.n}！`, 'error');
                        }
                    } else {
                        const effResult = card.monoEff(p, mono) || '';
                        recordGameEvent('card_use', `${p.ic} ${p.nm}`, `使用 ${card.ic} ${card.n}`, effResult);
                        monoLog(`${p.ic} 使用 ${card.ic} ${card.n}${effResult ? ' — ' + effResult : ''}`, 'info');
                    }
                }
            }
            renderMonopolyPartial(['players', 'cards', 'buff', 'log']);
        }

        mono.dice = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
        let total = mono.dice[0] + mono.dice[1];
        const isAiDouble = mono.dice[0] === mono.dice[1];
        const extra = p.speed || 0;
        if (extra) p.speed = 0;
        if (p.doubleDice > 0) { total *= 2; p.doubleDice--; }
        if (p.overclockNext) { total *= 2; p.overclockNext = false; monoLog(`🔧 ${p.ic} 超频激活！骰子翻倍`, 'success'); }
        if (p.empTurns > 0) { total = Math.ceil(total / 2); }
        if (p.slipTurns > 0) { total += 3; p.slipTurns = 0; }
        const aiVehicleSpeed = (p.blackoutTurns > 0) ? 0 : getVehicleBonus(p, 'speed');
        if (aiVehicleSpeed) total += aiVehicleSpeed;

        // AI consecutive doubles tracking (same as aiTurn)
        if (isAiDouble) {
            p.consecutiveDoubles = (p.consecutiveDoubles || 0) + 1;
            if (p.consecutiveDoubles >= 3) {
                monoLog(`🚔 ${p.nm} 连续3次双数！进监狱！`, 'error');
                p.jailTurns = 2;
                p.consecutiveDoubles = 0;
                p.pos = mono.tiles.findIndex(t => t.type === 'jail');
                if (p.pos < 0) p.pos = 0;
                saveMonopoly();
                renderMonopoly();
                setTimeout(() => nextTurn(), 600);
                return;
            }
            p._extraTurn = true;
            monoLog(`🎲 ${p.ic} 双数！获得额外回合`, 'success');
        } else {
            p.consecutiveDoubles = 0;
        }

        // Confused effect — random direction (same as aiTurn)
        if (p.confused > 0) {
            p.confused--;
            if (Math.random() < 0.5) { total = -total; monoLog(`😵 ${p.nm} 混乱效果触发！反向移动`, 'error'); }
        }

        renderMonopolyPartial(['players', 'map', 'dice', 'log']);
        monoLog(`${p.ic} 掷出 ${total}${extra?`+${extra}`:''}`, 'info');

        mono.pendingAction = 'movePlayer';
        saveMonopoly();
        setTimeout(() => { try { movePlayer(idx, total + extra); } catch(e) { console.error('[AI movePlayer Error]', e); _clearWatchdog(); nextTurn(); } }, 600);
    }

    window.acceptAiTrade = function(aiIdx, offerCardIdx, wantCardIdx, wantMoney) {
        const ai = mono.players[aiIdx];
        const p = mono.players[0];
        const card = ai.cards[offerCardIdx];
        if (!card) { closeModal(); mono.pendingTrade = false; continueAiTurn(aiIdx); return; }
        if (p.cards.length >= 8) { monoLog('手牌已满，无法接受', 'error'); closeModal(); mono.pendingTrade = false; continueAiTurn(aiIdx); return; }

        ai.cards.splice(offerCardIdx, 1);
        if (wantCardIdx >= 0 && p.cards[wantCardIdx]) {
            const pc = p.cards[wantCardIdx];
            p.cards.splice(wantCardIdx, 1);
            if (ai.cards.length < 8) ai.cards.push({...pc});
        } else if (wantMoney > 0) {
            if (p.money < wantMoney) { monoLog('资金不足', 'error'); ai.cards.push({...card}); closeModal(); mono.pendingTrade = false; continueAiTurn(aiIdx); return; }
            p.money -= wantMoney;
            ai.money += wantMoney;
        }
        p.cards.push({...card});
        monoLog(`🤝 你接受了 ${ai.nm} 的交易，获得 ${card.ic} ${card.n}`, 'success');
        showToast(`✓ 获得 ${card.n}`, 'success');
        mono.pendingTrade = false;
        closeModal();
        renderMonopoly();
        saveMonopoly();
        continueAiTurn(aiIdx);
    };

    window.rejectAiTrade = function(aiIdx) {
        const ai = mono.players[aiIdx];
        monoLog(`🤝 你拒绝了 ${ai.nm} 的交易提议`, 'info');
        mono.pendingTrade = false;
        closeModal();
        continueAiTurn(aiIdx);
    };

    window.counterAiTrade = function(aiIdx, offerCardIdx, wantCardIdx, wantMoney) {
        const ai = mono.players[aiIdx];
        const p = mono.players[0];
        const card = ai.cards[offerCardIdx];
        if (!card) { closeModal(); mono.pendingTrade = false; continueAiTurn(aiIdx); return; }
        // AI may accept counter with 40% chance, or reject
        if (Math.random() < 0.4) {
            // AI accepts counter — same card, less money
            const reducedMoney = Math.floor(wantMoney * 0.6);
            if (p.cards.length >= 8) { monoLog('手牌已满', 'error'); closeModal(); mono.pendingTrade = false; continueAiTurn(aiIdx); return; }
            ai.cards.splice(offerCardIdx, 1);
            if (wantCardIdx >= 0 && p.cards[wantCardIdx]) {
                const pc = p.cards[wantCardIdx];
                p.cards.splice(wantCardIdx, 1);
                if (ai.cards.length < 8) ai.cards.push({...pc});
            } else if (reducedMoney > 0) {
                p.money -= reducedMoney;
                ai.money += reducedMoney;
            }
            p.cards.push({...card});
            monoLog(`🤝 ${ai.nm} 接受了你的还价！获得 ${card.ic} ${card.n}`, 'success');
            showToast(`✓ 还价成功`, 'success');
        } else {
            monoLog(`🤝 ${ai.nm} 拒绝了你的还价`, 'info');
            showToast(`${ai.nm} 拒绝还价`, 'info');
        }
        mono.pendingTrade = false;
        closeModal();
        renderMonopoly();
        saveMonopoly();
        continueAiTurn(aiIdx);
    };

    /* ==================== Casino Animation CSS ==================== */
    const casinoAnimStyle = document.createElement('style');
    casinoAnimStyle.textContent = `
    @keyframes casino-reel-spin {
        0% { transform: translateY(0); }
        100% { transform: translateY(-200px); }
    }
    @keyframes casino-reel-bounce {
        0% { transform: translateY(0); }
        30% { transform: translateY(-12px); }
        50% { transform: translateY(0); }
        70% { transform: translateY(-6px); }
        100% { transform: translateY(0); }
    }
    @keyframes casino-wheel-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(1080deg); }
    }
    @keyframes casino-dice-roll {
        0% { transform: rotate(0deg) scale(1); }
        25% { transform: rotate(90deg) scale(1.2); }
        50% { transform: rotate(180deg) scale(0.9); }
        75% { transform: rotate(270deg) scale(1.1); }
        100% { transform: rotate(360deg) scale(1); }
    }
    @keyframes casino-pulse {
        0%, 100% { opacity: 0.4; transform: scale(0.95); }
        50% { opacity: 1; transform: scale(1.05); }
    }
    .casino-reel-container {
        height: 60px; overflow: hidden; position: relative;
        background: var(--card2); border-radius: 8px; border: 2px solid var(--border);
    }
    .casino-reel-spinning {
        animation: casino-reel-spin 0.15s linear infinite;
    }
    .casino-reel-result {
        animation: casino-reel-bounce 0.5s ease-out;
    }
    .casino-wheel-spinning {
        animation: casino-wheel-spin 1.5s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
    }
    .casino-dice-rolling {
        animation: casino-dice-roll 0.3s ease-in-out infinite;
    }
    .casino-loading-text {
        animation: casino-pulse 1s ease-in-out infinite;
    }
    `;
    document.head.appendChild(casinoAnimStyle);

    /* ==================== Monopoly: Casino System ==================== */
    const CASINO_MIN_BET = 100;
    const ROULETTE_NUMBERS = Array.from({length: 37}, (_, i) => i); // 0-36
    const ROULETTE_RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const SLOT_SYMBOLS = ['🐰', '🥕', '💎', '👑', '🍀', '⭐'];
    const SLOT_PAYOUTS = { '🐰': 50, '🥕': 20, '💎': 100, '👑': 200, '🍀': 30, '⭐': 80 };
    let casinoFromTile = false; // Tracks if casino was entered from a tile

    function showCasino(fromTile = false) {
        casinoFromTile = fromTile;
        const p = mono.players[0];
        const isMyTurn = mono.currentPlayer === 0;
        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">🎰 兔兔赌场</div>
            <div style="text-align:center;font-size:.8rem;color:var(--text2);padding:.3rem 0;">你的资金：💰${p.money} ${!isMyTurn ? '| ⚠️ 非你的回合' : ''}</div>
            <div style="font-size:.7rem;color:var(--text2);text-align:center;margin-bottom:.5rem;">最低下注 💰${CASINO_MIN_BET} | 纯虚拟娱乐，不涉及真实货币</div>
            <div style="display:flex;flex-direction:column;gap:.5rem;">
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;border-left:3px solid #ef4444;">
                    <div style="font-size:.85rem;font-weight:700;">🎡 轮盘赌</div>
                    <div style="font-size:.7rem;color:var(--text2);">押红/黑/单/双/数字，赔率最高 35:1</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="showRoulette()" ${!isMyTurn || p.money < CASINO_MIN_BET ? 'disabled' : ''}>进入轮盘</button>
                </div>
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;border-left:3px solid #f59e0b;">
                    <div style="font-size:.85rem;font-weight:700;">🎰 老虎机</div>
                    <div style="font-size:.7rem;color:var(--text2);">三个相同图案即赢，赔率最高 200:1</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="showSlots()" ${!isMyTurn || p.money < CASINO_MIN_BET ? 'disabled' : ''}>拉老虎机</button>
                </div>
                <div style="padding:.6rem;background:var(--card2);border-radius:8px;border-left:3px solid #10b981;">
                    <div style="font-size:.85rem;font-weight:700;">🎲 骰子大小</div>
                    <div style="font-size:.7rem;color:var(--text2);">押大(11-18)或小(3-10)，三骰摇奖，赔率 1:1</div>
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.3rem;" onclick="showDiceGame()" ${!isMyTurn || p.money < CASINO_MIN_BET ? 'disabled' : ''}>摇骰子</button>
                </div>
                <button class="btn btn-secondary" onclick="leaveCasino()">离开赌场</button>
            </div>`;
        document.getElementById('modal-overlay').classList.add('show');
    }

    function leaveCasino() {
        const fromTile = casinoFromTile;
        casinoFromTile = false;
        closeModal();
        if (fromTile) {
            saveMonopoly();
            renderMonopoly();
            if (!checkGameOver()) nextTurn();
        }
    }

    // ===== Roulette =====
    function showRoulette() {
        const p = mono.players[0];
        showModal(`<div class="modal-title">🎡 轮盘赌</div>
            <div style="text-align:center;font-size:.7rem;color:var(--text2);">资金：💰${p.money} | 最低下注：💰${CASINO_MIN_BET}</div>
            <div style="margin-top:.5rem;">
                <div style="font-size:.8rem;font-weight:700;margin-bottom:.3rem;">下注金额</div>
                <input type="number" id="roulette-bet" min="${CASINO_MIN_BET}" max="${p.money}" value="${CASINO_MIN_BET}" style="width:100%;padding:.4rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.8rem;">
            </div>
            <div style="margin-top:.5rem;">
                <div style="font-size:.8rem;font-weight:700;margin-bottom:.3rem;">下注类型</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;">
                    <button class="btn btn-sm" style="background:#ef4444;color:#fff;" onclick="playRoulette('red')">🔴 红 (1:1)</button>
                    <button class="btn btn-sm" style="background:#1a1a1a;color:#fff;" onclick="playRoulette('black')">⚫ 黑 (1:1)</button>
                    <button class="btn btn-sm btn-secondary" onclick="playRoulette('odd')">单数 (1:1)</button>
                    <button class="btn btn-sm btn-secondary" onclick="playRoulette('even')">双数 (1:1)</button>
                    <button class="btn btn-sm btn-secondary" onclick="playRoulette('low')">小 1-18 (1:1)</button>
                    <button class="btn btn-sm btn-secondary" onclick="playRoulette('high')">大 19-36 (1:1)</button>
                </div>
                <div style="margin-top:.3rem;">
                    <div style="font-size:.75rem;color:var(--text2);margin-bottom:.2rem;">押单个数字 (赔率 35:1)：</div>
                    <input type="number" id="roulette-number" min="0" max="36" value="0" style="width:100%;padding:.3rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.7rem;">
                    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:.2rem;" onclick="playRoulette('number')">押数字</button>
                </div>
            </div>
            <button class="btn btn-secondary" style="width:100%;margin-top:.5rem;" onclick="showCasino(casinoFromTile)">返回赌场</button>`);
    }

    function playRoulette(betType) {
        const p = mono.players[0];
        const bet = parseInt(document.getElementById('roulette-bet')?.value) || 0;
        const numChoice = parseInt(document.getElementById('roulette-number')?.value) || 0;
        if (bet < CASINO_MIN_BET) { monoLog(`最低下注 💰${CASINO_MIN_BET}`, 'error'); return; }
        if (bet > p.money) { monoLog('资金不足', 'error'); return; }

        p.money -= bet;
        // Spin the wheel
        const result = Math.floor(Math.random() * 37); // 0-36
        const isRed = ROULETTE_RED.includes(result);
        const isBlack = result !== 0 && !isRed;

        // Show spinning animation first
        showModal(`<div class="modal-title">🎡 轮盘赌</div>
            <div style="text-align:center;padding:1.5rem;">
                <div style="font-size:4rem;display:inline-block;" class="casino-wheel-spinning">🎡</div>
                <div style="font-size:.9rem;color:var(--text2);margin-top:.5rem;" class="casino-loading-text">轮盘旋转中...</div>
            </div>`);

        // Reveal result after animation
        setTimeout(() => {
            let won = false;
            let payout = 0;
            let desc = '';

            if (betType === 'red') { won = isRed; payout = bet * 2; desc = '红'; }
            else if (betType === 'black') { won = isBlack; payout = bet * 2; desc = '黑'; }
            else if (betType === 'odd') { won = result !== 0 && result % 2 === 1; payout = bet * 2; desc = '单数'; }
            else if (betType === 'even') { won = result !== 0 && result % 2 === 0; payout = bet * 2; desc = '双数'; }
            else if (betType === 'low') { won = result >= 1 && result <= 18; payout = bet * 2; desc = '小(1-18)'; }
            else if (betType === 'high') { won = result >= 19 && result <= 36; payout = bet * 2; desc = '大(19-36)'; }
            else if (betType === 'number') { won = result === numChoice; payout = bet * 36; desc = `数字${numChoice}`; }

            const colorLabel = result === 0 ? '🟢' : (isRed ? '🔴' : '⚫');
            if (won) {
                p.money += payout;
                monoLog(`🎡 轮盘开出 ${result} ${colorLabel} — 押${desc}赢！获得 💰${payout - bet}`, 'success');
            } else {
                monoLog(`🎡 轮盘开出 ${result} ${colorLabel} — 押${desc}输，损失 💰${bet}`, 'info');
            }

            const resultHtml = `<div style="text-align:center;padding:1rem;">
                <div style="font-size:3rem;animation:casino-reel-bounce .5s ease-out;">🎡</div>
                <div style="font-size:2rem;font-weight:800;color:${isRed ? '#ef4444' : result === 0 ? '#10b981' : '#fff'};animation:casino-reel-bounce .5s ease-out .1s;">${result} ${colorLabel}</div>
                <div style="font-size:.9rem;margin-top:.3rem;color:${won ? 'var(--accent)' : 'var(--text2)'};font-weight:700;">${won ? `🎉 赢了！+💰${payout - bet}` : `💔 输了 -💰${bet}`}</div>
            </div>`;

            showModal(`${resultHtml}
                <div style="font-size:.75rem;color:var(--text2);text-align:center;">当前资金：💰${p.money}</div>
                <button class="btn btn-primary" style="width:100%;margin-top:.5rem;" onclick="showRoulette()" ${p.money < CASINO_MIN_BET ? 'disabled' : ''}>再来一局</button>
                <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;" onclick="showCasino(casinoFromTile)">返回赌场</button>`);
            saveMonopoly();
            renderMonopoly();
        }, 1500);
    }

    // ===== Slot Machine =====
    function showSlots() {
        const p = mono.players[0];
        const payoutInfo = Object.entries(SLOT_PAYOUTS).map(([s, p]) => `${s}×3 = ${p}:1`).join(' | ');
        showModal(`<div class="modal-title">🎰 老虎机</div>
            <div style="text-align:center;font-size:.7rem;color:var(--text2);">资金：💰${p.money} | 最低下注：💰${CASINO_MIN_BET}</div>
            <div style="text-align:center;font-size:.65rem;color:var(--text2);margin-top:.2rem;">${payoutInfo}</div>
            <div style="margin-top:.5rem;">
                <div style="font-size:.8rem;font-weight:700;margin-bottom:.3rem;">下注金额</div>
                <input type="number" id="slots-bet" min="${CASINO_MIN_BET}" max="${p.money}" value="${CASINO_MIN_BET}" style="width:100%;padding:.4rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.8rem;">
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:.5rem;" onclick="playSlots()">🎰 拉杆！</button>
            <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;" onclick="showCasino(casinoFromTile)">返回赌场</button>`);
    }

    function playSlots() {
        const p = mono.players[0];
        const bet = parseInt(document.getElementById('slots-bet')?.value) || 0;
        if (bet < CASINO_MIN_BET) { monoLog(`最低下注 💰${CASINO_MIN_BET}`, 'error'); return; }
        if (bet > p.money) { monoLog('资金不足', 'error'); return; }

        p.money -= bet;
        // Spin 3 reels
        const reels = [
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
            SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        ];

        // Show spinning animation first
        const reelStrip = SLOT_SYMBOLS.join('') + SLOT_SYMBOLS.join('');
        showModal(`<div class="modal-title">🎰 老虎机</div>
            <div style="display:flex;justify-content:center;gap:.5rem;padding:1.5rem;">
                <div class="casino-reel-container" style="width:50px;"><div class="casino-reel-spinning" style="font-size:2rem;line-height:60px;text-align:center;">${reelStrip}</div></div>
                <div class="casino-reel-container" style="width:50px;"><div class="casino-reel-spinning" style="font-size:2rem;line-height:60px;text-align:center;">${reelStrip}</div></div>
                <div class="casino-reel-container" style="width:50px;"><div class="casino-reel-spinning" style="font-size:2rem;line-height:60px;text-align:center;">${reelStrip}</div></div>
            </div>
            <div style="text-align:center;font-size:.9rem;color:var(--text2);" class="casino-loading-text">🎰 转动中...</div>`);

        // Reveal result after animation
        setTimeout(() => {
            let won = false;
            let payout = 0;
            let msg = '';

            if (reels[0] === reels[1] && reels[1] === reels[2]) {
                won = true;
                const multiplier = SLOT_PAYOUTS[reels[0]];
                payout = bet * multiplier;
                msg = `🎉 三连 ${reels[0]}！赔率 ${multiplier}:1 → +💰${payout - bet}`;
            } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
                won = true;
                payout = Math.floor(bet * 1.5);
                msg = `✨ 两连 ${reels[0]} → 回本 +💰${payout - bet}`;
            } else {
                msg = `💔 没有中奖 -💰${bet}`;
            }

            if (won) {
                p.money += payout;
                monoLog(`🎰 老虎机 ${reels.join(' ')} — ${msg}`, 'success');
            } else {
                monoLog(`🎰 老虎机 ${reels.join(' ')} — ${msg}`, 'info');
            }

            const reelColor = won ? 'var(--accent)' : 'var(--text2)';
            showModal(`<div class="modal-title">🎰 老虎机结果</div>
                <div style="display:flex;justify-content:center;gap:.5rem;padding:1.5rem;">
                    <span class="casino-reel-result" style="font-size:2.5rem;display:inline-block;">${reels[0]}</span>
                    <span class="casino-reel-result" style="font-size:2.5rem;display:inline-block;animation-delay:.1s;">${reels[1]}</span>
                    <span class="casino-reel-result" style="font-size:2.5rem;display:inline-block;animation-delay:.2s;">${reels[2]}</span>
                </div>
                <div style="text-align:center;font-size:.9rem;color:${reelColor};font-weight:700;">${msg}</div>
                <div style="font-size:.75rem;color:var(--text2);text-align:center;margin-top:.3rem;">当前资金：💰${p.money}</div>
                <button class="btn btn-primary" style="width:100%;margin-top:.5rem;" onclick="showSlots()" ${p.money < CASINO_MIN_BET ? 'disabled' : ''}>再来一局</button>
                <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;" onclick="showCasino(casinoFromTile)">返回赌场</button>`);
            saveMonopoly();
            renderMonopoly();
        }, 1500);
    }

    // ===== Dice Game (Sic Bo) =====
    function showDiceGame() {
        const p = mono.players[0];
        showModal(`<div class="modal-title">🎲 骰子大小</div>
            <div style="text-align:center;font-size:.7rem;color:var(--text2);">资金：💰${p.money} | 最低下注：💰${CASINO_MIN_BET}</div>
            <div style="font-size:.7rem;color:var(--text2);text-align:center;margin-top:.2rem;">三骰之和：3-10=小 | 11-18=大 | 赔率 1:1 | 豹子通杀</div>
            <div style="margin-top:.5rem;">
                <div style="font-size:.8rem;font-weight:700;margin-bottom:.3rem;">下注金额</div>
                <input type="number" id="dice-bet" min="${CASINO_MIN_BET}" max="${p.money}" value="${CASINO_MIN_BET}" style="width:100%;padding:.4rem;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:4px;font-size:.8rem;">
            </div>
            <div style="display:flex;gap:.5rem;margin-top:.5rem;">
                <button class="btn btn-primary" style="flex:1;font-size:1rem;" onclick="playDiceGame('small')">🎲 小 (3-10)</button>
                <button class="btn btn-primary" style="flex:1;font-size:1rem;" onclick="playDiceGame('big')">🎲 大 (11-18)</button>
            </div>
            <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;" onclick="showCasino(casinoFromTile)">返回赌场</button>`);
    }

    function playDiceGame(betSide) {
        const p = mono.players[0];
        const bet = parseInt(document.getElementById('dice-bet')?.value) || 0;
        if (bet < CASINO_MIN_BET) { monoLog(`最低下注 💰${CASINO_MIN_BET}`, 'error'); return; }
        if (bet > p.money) { monoLog('资金不足', 'error'); return; }

        p.money -= bet;
        // Roll 3 dice
        const dice = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
        ];
        const total = dice[0] + dice[1] + dice[2];
        const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
        const isBig = total >= 11 && total <= 18;
        const isSmall = total >= 3 && total <= 10;

        // Show rolling animation first
        showModal(`<div class="modal-title">🎲 骰子大小</div>
            <div style="display:flex;justify-content:center;gap:.5rem;padding:1.5rem;">
                <span class="casino-dice-rolling" style="font-size:2.5rem;display:inline-block;">🎲</span>
                <span class="casino-dice-rolling" style="font-size:2.5rem;display:inline-block;animation-delay:.1s;">🎲</span>
                <span class="casino-dice-rolling" style="font-size:2.5rem;display:inline-block;animation-delay:.2s;">🎲</span>
            </div>
            <div style="text-align:center;font-size:.9rem;color:var(--text2);" class="casino-loading-text">骰子滚动中...</div>`);

        // Reveal result after animation
        setTimeout(() => {
            let won = false;
            let payout = 0;
            let msg = '';

            if (isTriple) {
                msg = `💔 豹子 ${dice[0]}-${dice[1]}-${dice[2]} 通杀！损失 💰${bet}`;
            } else if ((betSide === 'big' && isBig) || (betSide === 'small' && isSmall)) {
                won = true;
                payout = bet * 2;
                msg = `🎉 掷出 ${total} 点 — 押${betSide === 'big' ? '大' : '小'}赢！+💰${payout - bet}`;
            } else {
                msg = `💔 掷出 ${total} 点 — 押${betSide === 'big' ? '大' : '小'}输，损失 💰${bet}`;
            }

            if (won) {
                p.money += payout;
                monoLog(`🎲 骰子 ${dice.join('-')} = ${total} — ${msg}`, 'success');
            } else {
                monoLog(`🎲 骰子 ${dice.join('-')} = ${total} — ${msg}`, 'info');
            }

            const diceHtml = dice.map((d, i) => `<span class="casino-reel-result" style="font-size:2.5rem;display:inline-block;animation-delay:${i*.1}s;">${['', '⚀','⚁','⚂','⚃','⚄','⚅'][d]}</span>`).join('');

            showModal(`<div class="modal-title">🎲 骰子结果</div>
                <div style="display:flex;justify-content:center;gap:.5rem;padding:1rem;">
                    ${diceHtml}
                </div>
                <div style="text-align:center;font-size:.9rem;font-weight:700;">总和：${total} ${isTriple ? '(豹子!)' : isBig ? '(大)' : '(小)'}</div>
                <div style="text-align:center;font-size:.9rem;color:${won ? 'var(--accent)' : 'var(--text2)'};margin-top:.3rem;font-weight:700;">${msg}</div>
                <div style="font-size:.75rem;color:var(--text2);text-align:center;margin-top:.2rem;">当前资金：💰${p.money}</div>
                <button class="btn btn-primary" style="width:100%;margin-top:.5rem;" onclick="showDiceGame()" ${p.money < CASINO_MIN_BET ? 'disabled' : ''}>再来一局</button>
                <button class="btn btn-secondary" style="width:100%;margin-top:.3rem;" onclick="showCasino(casinoFromTile)">返回赌场</button>`);
            saveMonopoly();
            renderMonopoly();
        }, 1200);
    }

    /* ==================== Monopoly: Next Turn & AI ==================== */
    // Watchdog: detects stuck AI turns and forces recovery
    let _aiWatchdog = null;
    function _startWatchdog() {
        _clearWatchdog();
        _aiWatchdog = setTimeout(() => {
            console.warn('[Watchdog] Turn stuck detected — forcing recovery to nextTurn()');
            _aiWatchdog = null;
            if (mono && mono.started) {
                const p = mono.players[mono.currentPlayer];
                const name = p ? `${p.ic} ${p.nm}` : 'AI';
                monoLog(`🛡️ [看门狗救济] 检测到 ${name} 回合思考超时，已自动卡死修复恢复游戏`, 'warn');
                if (typeof showToast === 'function') showToast(`🛡️ 看门狗已解锁 ${name} 超时卡死`, 'info');
                mono.pendingAction = null;
                mono.rolling = false;
                mono.pendingTrade = false; // Clear trade state to prevent stuck
                closeModal();
                saveMonopoly();
                renderMonopoly();
                nextTurn();
            }
        }, 8000); // 8s max for turn deadlock recovery (auto recovery)
    }
    function _clearWatchdog() {
        if (_aiWatchdog) { clearTimeout(_aiWatchdog); _aiWatchdog = null; }
    }

    /* Manual emergency skip for stuck player turns */
    window.forceSkipCurrentPlayer = function() {
        if (!mono || !mono.started) return;
        const cp = mono.players[mono.currentPlayer];
        const name = cp ? `${cp.ic} ${cp.nm}` : '当前玩家';
        _clearWatchdog();
        mono.rolling = false;
        mono.pendingAction = null;
        mono.pendingTrade = false;
        closeModal();
        monoLog(`⚡ 手动强制跳过 ${name} 的回合`, 'warn');
        if (typeof showToast === 'function') showToast(`⚡ 已强制跳过 ${name} 的回合`, 'info');
        saveMonopoly();
        renderMonopoly();
        nextTurn();
    };

    // Passive rent: each turn, property owners have a chance to collect small rent from NPC visitors
    // Landmark Dividends & Commercial Empire Synergy
    function processLandmarkDividends() {
        if (!mono || !mono.started) return;
        mono.players.forEach((p, pi) => {
            if (!p || p.bankrupt) return;
            let landmarkCount = 0;
            MONO_REGIONS.forEach((r, ri) => {
                const regProperties = mono.tiles.filter(t => t.type === 'property' && t.region === (ri + 1));
                if (regProperties.length > 0) {
                    const owned = regProperties.filter(t => mono.properties[t.id] && mono.properties[t.id].owner === pi).length;
                    if (owned === regProperties.length) landmarkCount++;
                }
            });
            const maxLvCount = mono.tiles.filter(t => t.type === 'property' && mono.properties[t.id] && mono.properties[t.id].owner === pi && mono.properties[t.id].level >= 5).length;
            const totalLandmarks = landmarkCount + Math.floor(maxLvCount / 2);
            if (totalLandmarks > 0 && mono.turn % 2 === 0) {
                const dividend = totalLandmarks * 1200;
                p.money += dividend;
                monoLog(`🏛️ ${p.ic} ${p.nm} 获得地标大楼商业分红 +${dividend}💰 (${totalLandmarks}处商业巨擘)`, 'success');
            }
            if (p.propertyInsuranceTurns > 0) p.propertyInsuranceTurns--;
        });
    }

    function processPassiveRent() {
        if (!mono.started) return;
        processLandmarkDividends();
        const economy = mono.economy || calculateEconomyState();
        const rentMultiplier = economy.rentMultiplier || 1;
        for (let i = 0; i < mono.tiles.length; i++) {
            const tile = mono.tiles[i];
            const prop = mono.properties[i];
            if (!tile || !prop || tile.type !== 'property' || prop.owner < 0 || prop.mortgaged) continue;
            const owner = mono.players[prop.owner];
            if (!owner || owner.bankrupt) continue;
            // 15% chance per property per turn to collect passive rent (increased from 8%)
            if (Math.random() < 0.15) {
                const baseRent = Math.floor(tile.price * (0.12 + (prop.level || 0) * 0.02));
                const passiveRent = Math.floor(baseRent * 0.35 * rentMultiplier * (0.8 + Math.random() * 0.4));
                if (passiveRent > 0) {
                    owner.money += passiveRent;
                    owner.stats.rentIncomeTotal += passiveRent;
                }
            }
        }
    }

    function nextTurn() {
        _clearWatchdog(); // Previous turn completed successfully
        // Check for extra turn from doubles
        const curP = mono.players[mono.currentPlayer];
        if (curP && curP._extraTurn && !curP.bankrupt) {
            curP._extraTurn = false;
            mono.pendingAction = null;
            saveMonopoly();
            renderMonopoly();
            if (mono.currentPlayer === 0 && mono.started) {
                notifyMyTurn();
                if (mono.autoPilot) { setTimeout(() => executeAutoPilot(), 800); }
            }
            if (mono.currentPlayer !== 0 && mono.started) {
                mono.pendingAction = 'aiTurn';
                saveMonopoly();
                _startWatchdog();
                setTimeout(() => { try { aiTurn(); } catch(e) { console.error('[AI Turn Error]', e); _clearWatchdog(); nextTurn(); } }, 900);
            }
            return;
        }
        const total = mono.players.length;
        let next = mono.currentPlayer;
        for (let i = 0; i < total; i++) {
            next = (next + 1) % total;
            if (!mono.players[next].bankrupt) break;
        }
        mono.currentPlayer = next;
        mono.turn++;
        // Record human money for AI difficulty adaptation
        recordHumanMoneyTurn();
        // News system: tick timers and possibly generate passive news
        tickNews();
        generatePassiveNews();
        // Recalculate dynamic economy state each turn (includes news effects)
        mono.economy = calculateEconomyState();
        processPassiveRent();
        // Random stock market fluctuation each turn (influenced by economy)
        const economyInfluence = (mono.economy.inflation - 0.03) * 50;
        const fluct = (Math.random() - 0.45) * 15 + economyInfluence;
        mono.stockMarket = Math.max(50, Math.min(200, mono.stockMarket + fluct));
        // Auto-advance era if conditions met
        if (canAdvanceEra()) {
            advanceEra();
        }
        // Process loans for the new player
        processLoans(mono.players[next]);
        // Decrement active status effects for the new player (they expire at start of their turn)
        const newP = mono.players[next];
        if (newP.rentDouble > 0) newP.rentDouble--;
        if (newP.blackoutTurns > 0) newP.blackoutTurns--;
        if (newP.empTurns > 0) newP.empTurns--;
        if (newP.hologramTurns > 0) newP.hologramTurns--;
        if (newP.signalJamTurns > 0) newP.signalJamTurns--;
        if (newP.slipTurns > 0) newP.slipTurns--;
        // Vehicle discount expiration
        if (newP.vehicleDiscountTurns > 0) {
            newP.vehicleDiscountTurns--;
            if (newP.vehicleDiscountTurns === 0 && newP.vehicleDiscount > 0) {
                monoLog(`🏷️ ${newP.ic} 载具折扣已过期（💰${newP.vehicleDiscount}）`, 'info');
                newP.vehicleDiscount = 0;
            }
        }
        // Hacker skill status effects (v9306)
        if (newP.firewallTurns > 0) newP.firewallTurns--;
        if (newP.virusTurns > 0) {
            newP.virusTurns--;
            const loss = Math.min(300, newP.money);
            newP.money -= loss;
            monoLog(`🦠 ${newP.ic} 病毒效果：-${loss}💰（剩${newP.virusTurns}回合）`, 'error');
            if (newP.quantumTurns > 0 && newP.quantumTarget >= 0) {
                const qt = mono.players[newP.quantumTarget];
                if (qt && !qt.bankrupt) { qt.money += loss; monoLog(`⚛️ 量子纠缠：${qt.ic} 获得 ${loss}💰`, 'event'); }
            }
        }
        if (newP.quantumTurns > 0) {
            newP.quantumTurns--;
            if (newP.quantumTurns === 0) { newP.quantumTarget = -1; monoLog(`⚛️ ${newP.ic} 量子纠缠结束`, 'info'); }
        }
        if (newP.lockdownTurns > 0) newP.lockdownTurns--;
        // Check if player went bankrupt from status effects or loans during turn processing
        if (newP.money < 0) {
            checkBankruptcy(newP);
            if (newP.bankrupt && !checkGameOver()) {
                // Skip to next player if this one went bankrupt during turn start
                setTimeout(() => nextTurn(), 300);
                return;
            }
        }
        // Auto-save each turn
        mono.pendingAction = null;
        mono.autoSaveTurn = mono.turn;
        saveMonopoly();
        saveInventory();
        renderMonopoly();

        // Push notification & auto-prompt when it becomes the human player's turn
        if (mono.currentPlayer === 0 && mono.started) {
            notifyMyTurn();
            if (mono.players[0].jailTurns > 0) {
                if (mono.autoPilot) {
                    setTimeout(() => executeAutoPilot(), 600);
                } else {
                    setTimeout(() => showJailOptionsModal(), 500);
                }
            } else if (mono.autoPilot) {
                setTimeout(() => executeAutoPilot(), 800);
            }
        }

        if (mono.currentPlayer !== 0 && mono.started) {
            mono.pendingAction = 'aiTurn';
            saveMonopoly();
            _startWatchdog();
            setTimeout(() => { try { aiTurn(); } catch(e) { console.error('[AI Turn Error]', e); _clearWatchdog(); nextTurn(); } }, 900);
        }
    }

    function processLoans(p) {
        if (!p || !p.loans || p.loans.length === 0) return;
        // Interest-free card: skip interest this turn
        if (p.interestFree > 0) {
            p.interestFree--;
            monoLog(`💳 ${p.nm} 免息卡生效，本轮贷款免息`, 'success');
            // Only pay principal, no interest
            let principalPayment = 0;
            p.loans.forEach(l => {
                principalPayment += Math.floor(l.amount / 5);
                l.remaining--;
            });
            if (p.money >= principalPayment) {
                p.money -= principalPayment;
                p.loans = p.loans.filter(l => l.remaining > 0);
            } else {
                p.money = Math.max(0, p.money);
                p.loans.forEach(l => l.remaining = Math.max(l.remaining, 1) + 1);
            }
            return;
        }
        let totalPayment = 0;
        let deferred = false;
        p.loans.forEach(l => {
            const payment = Math.floor(l.amount * l.rate / 5) + Math.floor(l.amount / 5);
            totalPayment += payment;
            l.remaining--;
        });
        // Grace period: if player can't afford the full payment, pay what's possible and extend
        if (p.money < totalPayment) {
            const affordable = Math.max(0, p.money);
            const shortfall = totalPayment - affordable;
            p.money -= affordable;
            // Extend loans that couldn't be fully paid: add 1 round, reduce principal by affordable portion
            if (shortfall > 0 && p.loans.length > 0) {
                let remainingShortfall = shortfall;
                p.loans.forEach(l => {
                    if (remainingShortfall <= 0) return;
                    const payment = Math.floor(l.amount * l.rate / 5) + Math.floor(l.amount / 5);
                    // Restore remaining and extend
                    l.remaining = Math.max(l.remaining, 1) + 1; // Add grace round
                    remainingShortfall -= payment;
                });
                deferred = true;
            }
            if (affordable > 0) {
                monoLog(`${p.ic} 部分还款 ${affordable}💰（宽限延期）`, 'warn');
            }
            if (deferred) {
                monoLog(`⏳ ${p.ic} 贷款还款不足，已延期（信用-10）`, 'warn');
                p.credit = Math.max(10, p.credit - 10);
            }
            // Only bankrupt if money is deeply negative (beyond grace)
            if (p.money < -500) {
                checkBankruptcy(p);
            }
        } else {
            p.money -= totalPayment;
            p.loans = p.loans.filter(l => l.remaining > 0);
            if (totalPayment > 0) {
                monoLog(`${p.ic} 偿还贷款 ${totalPayment}💰`, 'info');
            }
        }
    }

    function aiTurn() {
        const idx = mono.currentPlayer;
        const p = mono.players[idx];
        if (!p || p.bankrupt) { nextTurn(); return; }
        // Clear pending action — AI turn has started
        mono.pendingAction = null;
        saveMonopoly();

        // Jail check
        if (p.jailTurns > 0) {
            p.jailTurns--;
            monoLog(`🔒 ${p.nm} 在监狱中，暂停一回合`, 'error');
            saveMonopoly();
            nextTurn();
            return;
        }
        // Banned check (seal curse)
        if (p.banned > 0) {
            p.banned--;
            monoLog(`🚫 ${p.nm} 被封印，暂停一回合`, 'error');
            saveMonopoly();
            nextTurn();
            return;
        }
        // Hospital check
        if (p.hospital > 0) {
            p.hospital--;
            monoLog(`🏥 ${p.nm} 在医院治疗，暂停一回合`, 'error');
            saveMonopoly();
            nextTurn();
            return;
        }

        const personality = AI_PERSONALITIES[p.personality];

        // AI might buy a vehicle
        aiVehicleDecision(p);

        // AI might propose a trade to the human player (15% chance if AI has cards)
        if (idx !== 0 && p.cards.length > 0 && mono.players[0] && !mono.players[0].bankrupt && Math.random() < 0.15) {
            aiInitiateTrade(idx);
            // Pause AI turn — resume after player responds via continueAiTurn()
            return;
        }

        // Use card? AI uses smart card selection strategy
        if (p.cards.length > 0) {
            const aiDiff = getAIDifficulty();
            const effectiveCardChance = personality.cardUseChance * aiDiff;
            // Identify the leader ( wealthiest player ) for strategic targeting
            const alivePlayers = mono.players.filter(pl => !pl.bankrupt);
            const leader = alivePlayers.reduce((a, b) => (a.money + (a.stats?.propertiesBought || 0) * 1000) > (b.money + (b.stats?.propertiesBought || 0) * 1000) ? a : b);
            const isLeader = leader === p;
            const humanIsLeader = leader === mono.players[0] && idx !== 0;
            // If human is leading, AI is more aggressive
            const aggressionBonus = humanIsLeader ? 0.2 : 0;
            // AI may use 1-2 cards per turn if aggressive
            const maxCards = (p.personality === 'aggressive' && p.cards.length > 2) ? 2 : 1;
            for (let cardRound = 0; cardRound < maxCards && p.cards.length > 0; cardRound++) {
                if (Math.random() > effectiveCardChance + aggressionBonus) break;
                // Smart card selection: prioritize based on game state
                let cardIdx = -1;
                const curseCards = p.cards.map((c, i) => c.isCurse ? i : -1).filter(i => i >= 0);
                const hackerCards = p.cards.map((c, i) => c.isHacker ? i : -1).filter(i => i >= 0);
                const defensiveCards = p.cards.map((c, i) => (c.id === 'shield' || c.id === 'mirror' || c.id === 'tax_free') ? i : -1).filter(i => i >= 0);
                const forceMoveCards = p.cards.map((c, i) => (c.id === 'summon_rent' || c.id === 'mass_summon' || c.id === 'magnetic_field' || c.id === 'tax_audit') ? i : -1).filter(i => i >= 0);
                const aiOwnsProperties = mono.tiles.some((t, i) => t.type === 'property' && mono.properties[i]?.owner === idx);
                // Decision tree:
                // 1. If AI owns properties and has forced movement cards → use them (high priority)
                if (aiOwnsProperties && forceMoveCards.length > 0 && Math.random() < 0.65) {
                    cardIdx = forceMoveCards[Math.floor(Math.random() * forceMoveCards.length)];
                }
                // 2. If AI is low on money and has drain/steal cards → use them
                else if (p.money < 3000 && curseCards.length > 0) {
                    const drainCards = curseCards.filter(ci => p.cards[ci].id === 'curse_drain' || p.cards[ci].id === 'tax_audit' || p.cards[ci].id === 'summon_rent');
                    if (drainCards.length > 0) cardIdx = drainCards[Math.floor(Math.random() * drainCards.length)];
                }
                // 3. If AI is being threatened (low shield, opponents have cards) → use defensive
                else if (p.shield === 0 && defensiveCards.length > 0 && Math.random() < 0.4) {
                    cardIdx = defensiveCards[Math.floor(Math.random() * defensiveCards.length)];
                }
                // 4. If human is leader → prefer curse/hacker attack cards
                else if (humanIsLeader && (curseCards.length > 0 || hackerCards.length > 0) && Math.random() < (personality.attackLeaderBias || 0.5)) {
                    const attackCards = [...curseCards, ...hackerCards];
                    cardIdx = attackCards[Math.floor(Math.random() * attackCards.length)];
                }
                // 5. Default: prefer curse cards (70%), then any card
                else if (curseCards.length > 0 && Math.random() < 0.7) {
                    cardIdx = curseCards[Math.floor(Math.random() * curseCards.length)];
                } else {
                    cardIdx = Math.floor(Math.random() * p.cards.length);
                }
                if (cardIdx < 0) break;
                const card = p.cards[cardIdx];
                p.cards.splice(cardIdx, 1);
                restoreCardFunctions(card);
                if (card.monoEff) {
                    if (card.isCurse) {
                        // Smart targeting: target the leader 60%, human 25%, random 15%
                        const targets = mono.players.filter((pl, i) => i !== idx && !pl.bankrupt);
                        if (targets.length > 0) {
                            let target;
                            const r = Math.random();
                            if (r < (personality.attackLeaderBias || 0.5)) {
                                // Target the leader (or human if human is leader)
                                target = humanIsLeader ? mono.players[0] : leader;
                                if (target === p || target.bankrupt) target = targets.reduce((a, b) => a.money > b.money ? a : b);
                            } else if (r < (personality.attackLeaderBias || 0.5) + 0.25 && targets.includes(mono.players[0])) {
                                target = mono.players[0];
                            } else {
                                // For drain-type cards, always target wealthiest
                                if (card.id === 'curse_drain' || card.id === 'tax_audit' || card.id === 'summon_rent') {
                                    target = targets.reduce((a, b) => a.money > b.money ? a : b);
                                } else {
                                    target = targets[Math.floor(Math.random() * targets.length)];
                                }
                            }
                            const effResult = card.monoEff(p, mono, target) || '';
                            recordGameEvent('card_curse', `${p.ic} ${p.nm}`, `对 ${target.nm} 施放 ${card.ic} ${card.n}`, effResult);
                            monoLog(`🔥 ${p.ic} 对 ${target.nm} 施放 ${card.ic} ${card.n} — ${effResult}`, 'event');
                            if (target === mono.players[0]) {
                                showToast(`🔥 被 ${p.nm} 施放 ${card.ic} ${card.n}！`, 'error');
                            }
                        }
                    } else {
                        const effResult = card.monoEff(p, mono) || '';
                        recordGameEvent('card_use', `${p.ic} ${p.nm}`, `使用 ${card.ic} ${card.n}`, effResult);
                        monoLog(`${p.ic} 使用 ${card.ic} ${card.n}${effResult ? ' — ' + effResult : ''}`, 'info');
                    }
                }
            }
            renderMonopolyPartial(['players', 'cards', 'buff', 'log']);
        }

        mono.dice = [Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)];
        let total = mono.dice[0] + mono.dice[1];
        const isAiDouble = mono.dice[0] === mono.dice[1];
        const extra = p.speed || 0;
        if (extra) p.speed = 0;
        if (p.doubleDice > 0) { total *= 2; p.doubleDice--; }
        if (p.overclockNext) { total *= 2; p.overclockNext = false; }
        if (p.empTurns > 0) { total = Math.ceil(total / 2); }
        if (p.slipTurns > 0) { total += 3; p.slipTurns = 0; }
        // AI vehicle speed bonus
        const aiVehicleSpeed = (p.blackoutTurns > 0) ? 0 : getVehicleBonus(p, 'speed');
        if (aiVehicleSpeed) total += aiVehicleSpeed;

        // AI dice multiplier (aggressive AI may use 2x occasionally)
        if (p.personality === 'aggressive' && Math.random() < 0.2 && p.money > 5000) {
            const aiMult = Math.random() < 0.5 ? 2 : 3;
            const failChance = aiMult === 2 ? 0.25 : 0.35;
            if (Math.random() < failChance) {
                monoLog(`💥 ${p.ic} 倍率掷骰失败！(×${aiMult})`, 'error');
                mono.rolling = false;
                saveMonopoly();
                renderMonopolyPartial(['players', 'dice', 'log']);
                setTimeout(() => nextTurn(), 600);
                return;
            }
            total *= aiMult;
            monoLog(`⚡ ${p.ic} 倍率成功！×${aiMult}`, 'success');
        }

        // AI consecutive doubles tracking
        if (isAiDouble) {
            p.consecutiveDoubles = (p.consecutiveDoubles || 0) + 1;
            if (p.consecutiveDoubles >= 3) {
                monoLog(`🚔 ${p.nm} 连续3次双数！进监狱！`, 'error');
                p.jailTurns = 2;
                p.consecutiveDoubles = 0;
                p.pos = mono.tiles.findIndex(t => t.type === 'jail');
                if (p.pos < 0) p.pos = 0;
                saveMonopoly();
                renderMonopoly();
                setTimeout(() => nextTurn(), 600);
                return;
            }
            p._extraTurn = true;
            monoLog(`🎲 ${p.ic} 双数！获得额外回合`, 'success');
        } else {
            p.consecutiveDoubles = 0;
        }

        // Confused effect — random direction for AI too
        if (p.confused > 0) {
            p.confused--;
            if (Math.random() < 0.5) { total = -total; monoLog(`😵 ${p.nm} 混乱效果触发！反向移动`, 'error'); }
        }
        // perf: consider batching — this is the final render before AI movePlayer; kept for dice visibility
        renderMonopolyPartial(['players', 'map', 'dice', 'log']);
        monoLog(`${p.ic} 掷出 ${total}${extra?`+${extra}`:''}`, 'info');

        mono.pendingAction = 'movePlayer';
        saveMonopoly();
        setTimeout(() => { try { movePlayer(idx, total + extra); } catch(e) { console.error('[AI movePlayer Error]', e); _clearWatchdog(); nextTurn(); } }, 600);
    }

    /* ==================== Monopoly: Era Advancement (DISABLED — all islands open from start) ==================== */
    function canAdvanceEra() {
        return false; // Era system removed — all regions open from game start
    }

    function advanceEra() {
        return; // Era system removed — no-op
    }

    /* ==================== Modal Helpers ==================== */
    // Global modal lock: prevents overlapping modals from touch+click double-fire
    