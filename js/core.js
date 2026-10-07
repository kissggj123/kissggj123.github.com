
    /* ==================== Resilience Polyfills & Helpers ==================== */
    if (typeof Element !== 'undefined' && !Element.prototype.remove) {
        Element.prototype.remove = function() {
            if (this.parentNode) this.parentNode.removeChild(this);
        };
    }
    function isStandaloneMode() {
        try {
            return (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator && window.navigator.standalone) || false;
        } catch(e) { return false; }
    }
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
    window.safeSetItem = safeSetItem;
    window.safeGetItem = safeGetItem;
    window.safeRemoveItem = safeRemoveItem;

    /* ==================== Config ==================== */
    const CONFIG = {
        VERSION: 'v7.8.6.9482',
        SAVE_KEY: 'bunny_cc_v7.7.2.9293',
        MONO_SAVE_KEY: 'bunny_mono_v6',
        START_DATE: '2024/03/12 00:00:00',
        GOD_MODE_CLICKS: 7,
        CARD_COOLDOWN_MS: 60000,
        THEMES: [
            { id: 'bunny', name: '棉花糖兔', colors: ['#FFF0F5','#FF6B9D','#FFB5BA'] },
            { id: 'forest', name: '森林兔窝', colors: ['#F0F7EE','#4CAF50','#A5D6A7'] },
            { id: 'ocean', name: '海洋蓝', colors: ['#E8F4FD','#0EA5E9','#7DD3FC'] },
            { id: 'starlight', name: '星空紫', colors: ['#1a1a2e','#a78bfa','#C4B5FD'] },
            { id: 'cyber', name: '赛博朋克', colors: ['#0c0a1d','#fbbf24','#ec4899'] },
            { id: 'sunset', name: '日落橙', colors: ['#FFF3E0','#FF6B35','#FFB74D'] },
            { id: 'mint', name: '薄荷绿', colors: ['#E8F5E9','#26A69A','#80CBC4'] },
            { id: 'rose', name: '玫瑰金', colors: ['#FCE4EC','#E91E63','#F48FB1'] },
            { id: 'aurora', name: '极光绿', colors: ['#0B1026','#06FFA5','#5B21B6'] },
            { id: 'galaxy', name: '银河紫', colors: ['#0F0C29','#C084FC','#60A5FA'] },
            { id: 'candy', name: '糖果粉', colors: ['#FFF8E7','#FF4081','#FFD740'] },
            { id: 'matrix', name: '矩阵绿', colors: ['#000000','#00FF41','#003B00'] },
        ],
        GOD_MODE_PUBLIC_KEY: {
            kty: 'EC', crv: 'P-256',
            x: 'aDWwzlvQjrXrOzIny62Ey1_Lrr0cA6hmJ-sNZ1Dz6bU',
            y: 'q6i-Uwx6KiWEAbvkNio6b71M9FQ62bdM1aclPQZF7uc',
            key_ops: ['verify'], ext: true
        }
    };

    /* ==================== Monopoly Game Data ==================== */
    // 6 regions, each with theme color and price range. Total tiles: 112+192+208+224+240+272 = 1248 (312×4)
    const MONO_REGIONS = [
        {id:0, name:'胡萝卜草原', eraName:'草原时代', color:'#FFD700', priceMin:500, priceMax:1500, tileCount:112},
        {id:1, name:'草莓森林', eraName:'森林时代', color:'#FF69B4', priceMin:1500, priceMax:3000, tileCount:192},
        {id:2, name:'星光湖畔', eraName:'湖畔时代', color:'#7DD3FC', priceMin:3000, priceMax:6000, tileCount:208},
        {id:3, name:'彩虹山谷', eraName:'彩虹时代', color:'#A78BFA', priceMin:6000, priceMax:12000, tileCount:224},
        {id:4, name:'水晶海湾', eraName:'水晶时代', color:'#22D3EE', priceMin:12000, priceMax:25000, tileCount:240},
        {id:5, name:'天空之城', eraName:'天空时代', color:'#FBBF24', priceMin:25000, priceMax:50000, tileCount:272},
    ];

    const TILE_TYPES = {
        start:    {ic:'🏁', nm:'起点',   desc:'经过时获得起始奖金 2000💰'},
        property: {ic:'🏠', nm:'地产',   desc:'可购买，他人经过需付租金'},
        card:     {ic:'🎴', nm:'抽卡格', desc:'抽取一张随机卡牌'},
        bonus:    {ic:'💎', nm:'奖励格', desc:'获得随机奖励'},
        penalty:  {ic:'💸', nm:'惩罚格', desc:'税收、陷阱等，失去资金'},
        event:    {ic:'❓', nm:'随机事件', desc:'触发随机事件'},
        teleport: {ic:'🔄', nm:'传送格', desc:'随机传送到其他位置'},
        bank:     {ic:'🏦', nm:'银行格', desc:'可申请贷款或还款'},
        stock:    {ic:'📈', nm:'股市格', desc:'随机涨跌影响资金'},
        auction:  {ic:'🔨', nm:'拍卖格', desc:'竞拍地产'},
        upgrade:  {ic:'⬆️', nm:'升级格', desc:'升级已有地产'},
        jail:     {ic:'🔒', nm:'监狱格', desc:'暂停一回合'},
        casino:   {ic:'🎰', nm:'赌场格', desc:'进入赌场娱乐'},
        shortcut: {ic:'✈️', nm:'捷径',   desc:'飞行棋式捷径，前进到指定位置'},
    };

    const REGION_PROPERTY_NAMES = [
        ['胡萝卜田','萝卜市集','草原小屋','向日葵农庄','蒲公英花园','三叶草草坪','风车牧场','雏菊小径'],
        ['草莓小屋','蓝莓农场','蘑菇屋','松果塔','浆果市集','森林树屋','萤火虫小径','橡树庄园'],
        ['星光别墅','月光公馆','湖畔公寓','银河观景台','倒影花园','水晶码头','涟漪水岸','极光阁'],
        ['彩虹桥','七彩宫殿','光谱大厦','棱镜画廊','色彩乐园','霞光塔','极光穹顶','虹彩庭院'],
        ['水晶宫','钻石海岸','珍珠湾','宝石塔','琥珀别墅','珊瑚礁','翡翠庄园','琉璃殿'],
        ['天空之城','云端宫殿','星辰塔','彩虹之门','天界神殿','银河要塞','永恒之巅','苍穹圣所'],
    ];

    // Card pool — shared between home draw and monopoly card tiles
    const CARD_POOL = [
        // Common
        {id:'funds_boost', ic:'💰', n:'财富祝福', desc:'获得 2000💰', rarity:'common', monoEff:(p)=>{p.money+=2000;return '+2000💰'}},
        {id:'speed_boost', ic:'🚀', n:'加速冲刺', desc:'下回合多走3步', rarity:'common', monoEff:(p)=>{p.speed=(p.speed||0)+3;return '下回合 +3 步（叠加）'}},
        {id:'shield', ic:'🛡️', n:'护盾', desc:'免疫下次负面效果（可叠加）', rarity:'common', monoEff:(p)=>{p.shield=(p.shield||0)+1;return `护盾已激活（${p.shield}层）`}},
        {id:'lucky', ic:'🍀', n:'幸运', desc:'下次正面效果翻倍（可叠加）', rarity:'common', monoEff:(p)=>{p.lucky=(p.lucky||0)+1;return `幸运已激活（${p.lucky}层）`}},
        {id:'heal', ic:'💊', n:'治疗', desc:'恢复 1500💰', rarity:'common', monoEff:(p)=>{p.money+=1500;return '+1500💰'}},
        // Uncommon
        {id:'swap', ic:'🔄', n:'交换', desc:'与随机玩家交换位置', rarity:'uncommon', monoEff:(p,mono)=>{
            const others=mono.players.filter(o=>o!==p&&!o.bankrupt);
            if(others.length){const t=others[Math.floor(Math.random()*others.length)];[p.pos,t.pos]=[t.pos,p.pos];return `与 ${t.nm} 交换了位置`;}
            return '没有可交换的对手';
        }},
        {id:'steal', ic:'🦹', n:'偷取', desc:'从最近玩家偷取 800💰', rarity:'uncommon', monoEff:(p,mono)=>{
            const total=getUnlockedTileCount();
            const targets=mono.players.filter(o=>o!==p&&!o.bankrupt).map(o=>({p:o,d:Math.min(Math.abs(o.pos-p.pos),total-Math.abs(o.pos-p.pos))})).sort((a,b)=>a.d-b.d);
            if(targets.length){targets[0].p.money=Math.max(0,targets[0].p.money-800);p.money+=800;return `从 ${targets[0].p.nm} 偷取了 800💰`;}
            return '没有可偷取的对手';
        }},
        {id:'double_dice', ic:'🎲', n:'双倍骰子', desc:'下回合掷骰点数翻倍（可叠加）', rarity:'uncommon', monoEff:(p)=>{p.doubleDice=(p.doubleDice||0)+1;return `下回合骰子翻倍（${p.doubleDice}层）`}},
        {id:'jail_free', ic:'🔑', n:'出狱卡', desc:'免于监狱惩罚', rarity:'uncommon', monoEff:(p)=>{p.jailFree=true;return '出狱卡已准备好'}},
        // Rare
        {id:'mega_funds', ic:'💎', n:'天降横财', desc:'获得 5000💰', rarity:'rare', monoEff:(p)=>{p.money+=5000;return '+5000💰'}},
        {id:'tax_free', ic:'🧾', n:'免税卡', desc:'下3回合免付租金', rarity:'rare', monoEff:(p)=>{p.taxFree=3;return '免税 3 回合'}},
        {id:'upgrade_free', ic:'⬆️', n:'免费升级', desc:'随机地产免费升级', rarity:'rare', monoEff:(p,mono)=>{
            const owned=mono.tiles.filter(t=>t.type==='property'&&mono.properties[t.id]?.owner===mono.players.indexOf(p));
            if(owned.length){const t=owned[Math.floor(Math.random()*owned.length)];if((mono.properties[t.id]?.level||0)<5){mono.properties[t.id].level=(mono.properties[t.id]?.level||0)+1;return `${t.nm} 升级到 Lv.${mono.properties[t.id].level}`;}return `${t.nm} 已满级`;}
            return '没有可升级的地产';
        }},
        {id:'card_boost_double', ic:'✨', n:'双重强化', desc:'强化手牌中任意 2 张卡牌效果', rarity:'rare', monoEff:(p,mono)=>{
            if (!p.cards || p.cards.length === 0) return '手牌为空，无卡可强化';
            const targets = p.cards.filter(c => c.id !== 'card_boost_double');
            if (targets.length === 0) return '没有其他手牌可供强化';
            const boostedNames = [];
            const poolCopy = [...targets];
            const count = Math.min(2, poolCopy.length);
            for (let i = 0; i < count; i++) {
                const randIdx = Math.floor(Math.random() * poolCopy.length);
                const c = poolCopy.splice(randIdx, 1)[0];
                c.enhanced = true;
                boostedNames.push(c.n);
            }
            if (typeof renderMonopoly === 'function') renderMonopoly();
            return `成功强化 2 张手牌效果: ${boostedNames.join('、')}`;
        }},
        {id:'card_short_market', ic:'📈', n:'股市拉升', desc:'使随机股票价格大幅拉升 40%', rarity:'rare', monoEff:(p,mono)=>{
            if (!mono.stockPrices) return '股市未初始化';
            const idx = Math.floor(Math.random() * STOCK_TYPES.length);
            const oldP = mono.stockPrices[idx];
            mono.stockPrices[idx] = Math.min(STOCK_TYPES[idx].basePrice * 3, Math.floor(oldP * 1.4));
            mono.stockMarket = getStockIndex();
            return `${STOCK_TYPES[idx].nm} 股价暴涨 40% (💰${oldP} → 💰${mono.stockPrices[idx]})`;
        }},
        {id:'card_insurance_shield', ic:'🏰', n:'地产圣盾', desc:'全场名下地产获得 5 回合强效保全', rarity:'legendary', monoEff:(p)=>{
            p.propertyInsuranceTurns = (p.propertyInsuranceTurns || 0) + 5;
            return `地产圣盾已激活（剩 ${p.propertyInsuranceTurns} 回合），免疫所有破坏贬值`;
        }},
        // Legendary
        {id:'god_bless', ic:'✨', n:'神之祝福', desc:'资金+3000，获护盾与幸运', rarity:'legendary', monoEff:(p)=>{p.money+=3000;p.shield=(p.shield||0)+1;p.lucky=(p.lucky||0)+1;return '+3000💰, 护盾+幸运'}},
        {id:'teleport_home', ic:'🎯', n:'回归起点', desc:'传送回起点并获奖金', rarity:'legendary', monoEff:(p,mono)=>{p.pos=0;p.money+=2000;return '回到起点 +2000💰'}},
        // Curse cards (target other players)
        {id:'curse_jail', ic:'⛓️', n:'禁锢咒', desc:'将对手送进监狱', rarity:'uncommon', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了禁锢咒`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了禁锢咒！`;}
            target.jailTurns=(target.jailTurns||0)+2;return `将 ${target.nm} 送入监狱 2 回合（共 ${target.jailTurns} 回合）`;
        }},
        {id:'curse_ban', ic:'🚫', n:'封印咒', desc:'禁止对手下回合交易', rarity:'rare', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了封印咒`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了封印咒！`;}
            target.banned=(target.banned||0)+1;return `封印了 ${target.nm} 的交易能力（共 ${target.banned} 回合）`;
        }},
        {id:'curse_hospital', ic:'🏥', n:'重病咒', desc:'对手进入医院暂停1回合', rarity:'uncommon', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了重病咒`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了重病咒！`;}
            target.hospital=(target.hospital||0)+1;return `${target.nm} 被送进医院暂停（共 ${target.hospital} 回合）`;
        }},
        {id:'curse_drain', ic:'🧛', n:'吸血咒', desc:'吸取对手2000💰', rarity:'rare', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了吸血咒`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了吸血咒！`;}
            const drain=Math.min(2000,target.money);target.money-=drain;p.money+=drain;return `从 ${target.nm} 吸取了 ${drain}💰`;
        }},
        {id:'curse_backtrack', ic:'⏪', n:'回退咒', desc:'对手后退5格', rarity:'uncommon', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了回退咒`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了回退咒！`;}
            const total=getUnlockedTileCount();target.pos=(target.pos-5+total)%total;return `${target.nm} 被回退了 5 格`;
        }},
        {id:'curse_downgrade', ic:'📉', n:'贬值咒', desc:'对手随机房产降级', rarity:'rare', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了贬值咒`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了贬值咒！`;}
            const ti=mono.players.indexOf(target);
            const owned=mono.tiles.filter(t=>t.type==='property'&&mono.properties[t.id]?.owner===ti&&(mono.properties[t.id]?.level||0)>0);
            if(owned.length){const t=owned[Math.floor(Math.random()*owned.length)];mono.properties[t.id].level=Math.max(0, (mono.properties[t.id]?.level||1)-1);return `${target.nm} 的 ${t.nm} 降级了`;}
            return `${target.nm} 没有可降级的房产`;
        }},
        // === New cards: tactical & strategic ===
        {id:'rent_double', ic:'🏘️', n:'收租令', desc:'下回合经过你的地产的玩家租金翻倍', rarity:'rare', monoEff:(p)=>{p.rentDouble=1;return '收租令已激活，租金翻倍 1 回合'}},
        {id:'freeze', ic:'❄️', n:'冰冻咒', desc:'指定对手跳过下回合', rarity:'rare', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了冰冻咒`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了冰冻咒！`;}
            target.hospital=(target.hospital||0)+1;return `${target.nm} 被冰冻，跳过下回合（共 ${target.hospital} 回合）`;
        }},
        {id:'mirror', ic:'🪞', n:'镜像反射', desc:'下回合反弹所有负面效果（可叠加）', rarity:'legendary', monoEff:(p)=>{p.mirror=(p.mirror||0)+1;return `镜像反射已激活（${p.mirror}层）`}},
        {id:'teleport_random', ic:'🌀', n:'随机传送', desc:'传送到地图随机位置', rarity:'uncommon', monoEff:(p,mono)=>{
            const total=getUnlockedTileCount();p.pos=Math.floor(Math.random()*total);return `传送到了第 ${p.pos} 格`;
        }},
        {id:'interest_free', ic:'💳', n:'免息卡', desc:'下回合贷款免利息', rarity:'uncommon', monoEff:(p)=>{p.interestFree=1;return '下回合贷款免息'}},
        {id:'stock_tip', ic:'📊', n:'内幕消息', desc:'获得随机股票 5 股', rarity:'rare', monoEff:(p,mono)=>{
            if(!p.stockHoldings) return '股票系统未初始化';
            const si=Math.floor(Math.random()*STOCK_TYPES.length);
            const h=p.stockHoldings[si];const price=mono.stockPrices[si];
            h.avgCost=h.shares>0?Math.round((h.avgCost*h.shares+price*5)/(h.shares+5)):price;
            h.shares+=5;h.isShort=false;
            return `获得 5 股 ${STOCK_TYPES[si].nm}`;
        }},
        {id:'curse_confuse', ic:'😵', n:'混乱咒', desc:'对手下回合随机移动方向', rarity:'uncommon', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了混乱咒`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了混乱咒！`;}
            target.confused=1;return `${target.nm} 陷入混乱，下回随机移动`;
        }},
        {id:'gold_rush', ic:'🪙', n:'淘金热', desc:'获得当前回合数 × 100💰', rarity:'legendary', monoEff:(p,mono)=>{const amt=mono.turn*100;p.money+=amt;return `淘金热 +${amt}💰`}},
        // === Hacker / Item Race cards (global effects, inspired by Cyberpunk 2077 / Watch Dogs / Mario Kart) ===
        {id:'blackout', ic:'⚡', n:'停电', desc:'所有对手下回合载具失效', rarity:'rare', isHacker:true, monoEff:(p,mono)=>{
            let count=0;
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                o.blackoutTurns=1;count++;
            }});
            return count>0 ? `⚡ 停电！${count}名对手下回合载具失效` : '⚡ 所有对手被防火墙抵消';
        }},
        {id:'data_hack', ic:'💾', n:'数据劫持', desc:'从所有对手各偷500💰', rarity:'rare', isHacker:true, monoEff:(p,mono)=>{
            let total=0,count=0;
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                if(o.shield>0){o.shield--;return;}
                const amt=Math.min(500,o.money);o.money-=amt;total+=amt;count++;
            }});
            p.money+=total;
            return count>0 ? `💾 数据劫持成功！从${count}名对手共偷取 ${total}💰` : '💾 所有对手被防火墙/护盾抵消';
        }},
        {id:'emp_blast', ic:'💥', n:'EMP脉冲', desc:'对手下回合掷骰减半', rarity:'legendary', isHacker:true, monoEff:(p,mono)=>{
            let count=0;
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                o.empTurns=1;count++;
            }});
            return count>0 ? `💥 EMP脉冲释放！${count}名对手下回合骰子减半` : '💥 所有对手被防火墙抵消';
        }},
        {id:'hologram', ic:'🎭', n:'全息伪装', desc:'3回合租金+50%', rarity:'rare', isHacker:true, monoEff:(p)=>{
            p.hologramTurns=3;return `🎭 全息伪装激活！3回合内租金+50%`;
        }},
        {id:'signal_jam', ic:'📡', n:'信号干扰', desc:'对手2回合禁炒股', rarity:'rare', isHacker:true, monoEff:(p,mono)=>{
            let count=0;
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                o.signalJamTurns=2;count++;
            }});
            return count>0 ? `📡 信号干扰！${count}名对手2回合内无法交易股票` : '📡 所有对手被防火墙抵消';
        }},
        {id:'banana_peel', ic:'🍌', n:'香蕉皮', desc:'对手20%概率多走3格', rarity:'uncommon', isHacker:true, monoEff:(p,mono)=>{
            let count=0;
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                if(Math.random()<0.2){o.slipTurns=1;count++;}
            }});
            return count>0?`🍌 ${count}名对手踩到香蕉皮！`:`🍌 香蕉皮已放置（无人踩中）`;
        }},
        {id:'blue_shell', ic:'🐢', n:'蓝龟壳', desc:'攻击最富对手2000💰', rarity:'legendary', isHacker:true, monoEff:(p,mono)=>{
            const targets=mono.players.filter(o=>o!==p&&!o.bankrupt).sort((a,b)=>b.money-a.money);
            if(targets.length){const t=targets[0];
            if(t.firewallTurns>0){t.firewallTurns--;return `🧱 ${t.nm} 的防火墙抵消了蓝龟壳`;}
            if(t.shield>0){t.shield--;return `🐢 蓝龟壳被 ${t.nm} 的护盾抵消！`;}
            const loss=Math.min(2000,t.money);t.money-=loss;
            return `🐢 蓝龟壳命中最富有的 ${t.nm}！造成 ${loss}💰 损伤`;}
            return '🐢 没有可攻击的对手';
        }},
        {id:'system_crash', ic:'🖥️', n:'系统崩溃', desc:'对手混乱+封印', rarity:'legendary', isHacker:true, monoEff:(p,mono)=>{
            let count=0;
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                if(o.shield>0){o.shield--;}else{o.confused=(o.confused||0)+1;o.banned=(o.banned||0)+1;count++;}
            }});
            return count>0 ? `🖥️ 系统崩溃！${count}名对手陷入混乱+封印` : '🖥️ 所有对手被防火墙抵消';
        }},
        // === New hacker/item cards (v9306) ===
        {id:'gps_spoof', ic:'🛰️', n:'GPS欺骗', desc:'对手传送随机位置', rarity:'rare', isHacker:true, monoEff:(p,mono)=>{
            let count=0; const total=getUnlockedTileCount();
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                if(o.cloneActive){o.cloneActive=false;return;}
                o.pos=Math.floor(Math.random()*total);count++;
            }});
            return count>0 ? `🛰️ GPS欺骗！${count}名对手被传送到随机位置` : '🛰️ 所有对手被防火墙/分身抵消';
        }},
        {id:'virus_implant', ic:'🦠', n:'病毒植入', desc:'最富对手3回合-300/回合', rarity:'rare', isHacker:true, monoEff:(p,mono)=>{
            const targets=mono.players.filter(o=>o!==p&&!o.bankrupt).sort((a,b)=>b.money-a.money);
            if(!targets.length) return '🦠 没有可感染的目标';
            const t=targets[0];
            if(t.firewallTurns>0){t.firewallTurns--;return `🧱 ${t.nm} 的防火墙抵消了病毒`;}
            if(t.cloneActive){t.cloneActive=false;return `👤 ${t.nm} 的虚拟分身吸收了病毒`;}
            t.virusTurns=3;
            return `🦠 病毒植入 ${t.nm}！3回合每回合-300💰`;
        }},
        {id:'firewall', ic:'🧱', n:'防火墙', desc:'2回合免疫骇客攻击', rarity:'rare', isHacker:true, monoEff:(p)=>{
            p.firewallTurns=2;
            return `🧱 防火墙激活！2回合内免疫骇客攻击`;
        }},
        {id:'virtual_clone', ic:'👤', n:'虚拟分身', desc:'吸收一个负面效果', rarity:'rare', isHacker:true, monoEff:(p)=>{
            p.cloneActive=true;
            return `👤 虚拟分身创建！将吸收下一个负面效果`;
        }},
        {id:'darknet_trade', ic:'🕸️', n:'暗网交易', desc:'与随机AI换1张手牌', rarity:'rare', isHacker:true, monoEff:(p,mono)=>{
            const targets=mono.players.filter(o=>o!==p&&!o.bankrupt&&o.cards&&o.cards.length>0);
            if(!targets.length) return '🕸️ 没有可交易的手牌';
            if(!p.cards||p.cards.length===0) return '🕸️ 你没有手牌可交换';
            const t=targets[Math.floor(Math.random()*targets.length)];
            const myCard=p.cards[Math.floor(Math.random()*p.cards.length)];
            const theirCard=t.cards[Math.floor(Math.random()*t.cards.length)];
            p.cards.splice(p.cards.indexOf(myCard),1,theirCard);
            t.cards.splice(t.cards.indexOf(theirCard),1,myCard);
            return `🕸️ 暗网交易！与 ${t.nm} 交换了手牌`;
        }},
        {id:'quantum_link', ic:'⚛️', n:'量子纠缠', desc:'与最富对手2回合共享损益', rarity:'legendary', isHacker:true, monoEff:(p,mono)=>{
            const targets=mono.players.filter(o=>o!==p&&!o.bankrupt).sort((a,b)=>b.money-a.money);
            if(!targets.length) return '⚛️ 没有可纠缠的目标';
            const t=targets[0];
            if(t.firewallTurns>0){t.firewallTurns--;return `🧱 ${t.nm} 的防火墙抵消了量子纠缠`;}
            p.quantumTarget=mono.players.indexOf(t);
            p.quantumTurns=2;
            t.quantumTarget=mono.players.indexOf(p);
            t.quantumTurns=2;
            return `⚛️ 量子纠缠！与 ${t.nm} 2回合内共享收益与损失`;
        }},
        {id:'overclock', ic:'🔧', n:'超频', desc:'下回合骰子翻倍', rarity:'legendary', isHacker:true, monoEff:(p,mono)=>{
            p.overclockNext=true;
            let count=0;
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                const loss=Math.min(500,o.money);o.money-=loss;count++;
            }});
            return `🔧 超频激活！下回合骰子翻倍，${count}名对手各-500💰`;
        }},
        {id:'zone_lockdown', ic:'🌐', n:'区域封锁', desc:'对手下回合禁购地产', rarity:'uncommon', isHacker:true, monoEff:(p,mono)=>{
            let count=0;
            mono.players.forEach(o=>{if(o!==p&&!o.bankrupt){
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                o.lockdownTurns=1;count++;
            }});
            return count>0 ? `🌐 区域封锁！${count}名对手下回合无法购买地产` : '🌐 所有对手被防火墙抵消';
        }},
        // === Forced Movement Cards: drag opponents to your properties for rent ===
        {id:'summon_rent', ic:'🧲', n:'引力召唤', desc:'将指定对手传送到你的最高级地产并收租', rarity:'rare', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了引力召唤`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了引力召唤！`;}
            if(target.firewallTurns>0){target.firewallTurns--;return `${target.nm} 的防火墙抵消了引力召唤`;}
            const pi=mono.players.indexOf(p);
            const owned=mono.tiles.map((t,i)=>({t,i})).filter(({t,i})=>t.type==='property'&&mono.properties[i]?.owner===pi&&(mono.properties[i]?.level||0)>=0&&!mono.properties[i]?.mortgaged);
            if(owned.length===0) return '没有可召唤到的地产';
            // Pick the highest-level property (best rent)
            owned.sort((a,b)=>(mono.properties[b.i].level||0)-(mono.properties[a.i].level||0));
            const dest=owned[0];
            target.pos=dest.i;
            // Calculate rent immediately
            const rent=calculateRent(dest.t,mono.properties[dest.i]);
            const actualRent=Math.min(rent,target.money);
            target.money-=actualRent;
            p.money+=actualRent;
            target.stats.rentPaidTotal+=actualRent;
            p.stats.rentIncomeTotal+=actualRent;
            p.stats.rentLog.push({from:target.nm,fromIc:target.ic,to:p.nm,amount:actualRent,tileNm:dest.t.nm,turn:mono.turn});
            if(p.stats.rentLog.length>50) p.stats.rentLog.shift();
            checkBankruptcy(target);
            return `🧲 将 ${target.nm} 召唤到 ${dest.t.nm}，收取租金 ${actualRent}💰`;
        }},
        {id:'mass_summon', ic:'🌀', n:'万有引力', desc:'所有对手被传送到你的随机地产并收租', rarity:'legendary', monoEff:(p,mono)=>{
            const pi=mono.players.indexOf(p);
            const owned=mono.tiles.map((t,i)=>({t,i})).filter(({t,i})=>t.type==='property'&&mono.properties[i]?.owner===pi&&!mono.properties[i]?.mortgaged);
            if(owned.length===0) return '没有可传送的地产';
            let count=0,totalRent=0;
            mono.players.forEach(o=>{
                if(o===p||o.bankrupt) return;
                if(o.shield>0){o.shield--;return;}
                if(o.firewallTurns>0){o.firewallTurns--;return;}
                if(o.mirror>0){o.mirror--;return;}
                const dest=owned[Math.floor(Math.random()*owned.length)];
                o.pos=dest.i;
                const rent=calculateRent(dest.t,mono.properties[dest.i]);
                const actualRent=Math.min(rent,o.money);
                o.money-=actualRent;
                p.money+=actualRent;
                o.stats.rentPaidTotal+=actualRent;
                p.stats.rentIncomeTotal+=actualRent;
                p.stats.rentLog.push({from:o.nm,fromIc:o.ic,to:p.nm,amount:actualRent,tileNm:dest.t.nm,turn:mono.turn});
                totalRent+=actualRent;
                count++;
                checkBankruptcy(o);
            });
            if(p.stats.rentLog.length>50) p.stats.rentLog.shift();
            return count>0 ? `🌀 万有引力！${count}名对手被传送至你的地产，共收租 ${totalRent}💰` : '🌀 所有对手被护盾/防火墙/镜像抵消';
        }},
        {id:'magnetic_field', ic:'🧭', n:'磁场牵引', desc:'50%概率将附近对手牵引到你的地产', rarity:'rare', monoEff:(p,mono)=>{
            const pi=mono.players.indexOf(p);
            const owned=mono.tiles.map((t,i)=>({t,i})).filter(({t,i})=>t.type==='property'&&mono.properties[i]?.owner===pi&&!mono.properties[i]?.mortgaged);
            if(owned.length===0) return '没有可牵引到的地产';
            const total=getUnlockedTileCount();
            let count=0,totalRent=0;
            mono.players.forEach(o=>{
                if(o===p||o.bankrupt) return;
                // Check if opponent is within 8 tiles of any of your properties
                const nearby=owned.some(({i})=>{
                    const dist=Math.min(Math.abs(o.pos-i),total-Math.abs(o.pos-i));
                    return dist<=8;
                });
                if(nearby&&Math.random()<0.5){
                    if(o.shield>0){o.shield--;return;}
                    if(o.firewallTurns>0){o.firewallTurns--;return;}
                    if(o.mirror>0){o.mirror--;return;}
                    // Pull to nearest owned property
                    let nearest=owned[0],minDist=Infinity;
                    owned.forEach(({i})=>{
                        const d=Math.min(Math.abs(o.pos-i),total-Math.abs(o.pos-i));
                        if(d<minDist){minDist=d;nearest=owned.find(x=>x.i===i);}
                    });
                    o.pos=nearest.i;
                    const rent=calculateRent(nearest.t,mono.properties[nearest.i]);
                    const actualRent=Math.min(rent,o.money);
                    o.money-=actualRent;
                    p.money+=actualRent;
                    o.stats.rentPaidTotal+=actualRent;
                    p.stats.rentIncomeTotal+=actualRent;
                    p.stats.rentLog.push({from:o.nm,fromIc:o.ic,to:p.nm,amount:actualRent,tileNm:nearest.t.nm,turn:mono.turn});
                    totalRent+=actualRent;
                    count++;
                    checkBankruptcy(o);
                }
            });
            if(p.stats.rentLog.length>50) p.stats.rentLog.shift();
            return count>0 ? `🧭 磁场牵引！${count}名对手被拉至你的地产，收租 ${totalRent}💰` : '🧭 磁场未捕获到对手';
        }},
        {id:'tax_audit', ic:'📋', n:'税务稽查', desc:'对手必须向你支付所有地产总值的10%', rarity:'legendary', isCurse:true, monoEff:(p,mono,target)=>{
            if(target.shield>0){target.shield--;return `${target.nm} 的护盾抵消了税务稽查`;}
            if(target.mirror>0){target.mirror--;return `${target.nm} 的镜像反射了税务稽查！`;}
            if(target.firewallTurns>0){target.firewallTurns--;return `${target.nm} 的防火墙抵消了税务稽查`;}
            const ti=mono.players.indexOf(target);
            let totalValue=0;
            mono.tiles.forEach((t,i)=>{
                if(t.type==='property'&&mono.properties[i]?.owner===ti&&!mono.properties[i]?.mortgaged){
                    totalValue+=t.price*(1+(mono.properties[i].level||0)*0.3);
                }
            });
            const tax=Math.floor(totalValue*0.1);
            const actualTax=Math.min(tax,target.money);
            target.money-=actualTax;
            p.money+=actualTax;
            checkBankruptcy(target);
            return `📋 税务稽查！${target.nm} 缴纳地产税 ${actualTax}💰`;
        }},
    ];
    const RARITY_COLORS = {common:'var(--text2)', uncommon:'var(--good)', rare:'#3b82f6', legendary:'#a78bfa'};
    const RARITY_WEIGHTS = {common:40, uncommon:30, rare:20, legendary:10};

    // Restore monoEff functions on card objects after JSON deserialization
    // JSON.stringify drops functions, so cards loaded from localStorage lose their effects
    const CARD_POOL_BY_ID = {};
    CARD_POOL.forEach(c => { CARD_POOL_BY_ID[c.id] = c; });

    function restoreCardFunctions(card) {
        if (!card || !card.id) return card;
        const template = CARD_POOL_BY_ID[card.id];
        if (template && typeof template.monoEff === 'function') {
            card.monoEff = template.monoEff;
        }
        return card;
    }

    function restoreAllCardFunctions() {
        // Restore cards in all players' hands
        if (mono && mono.players) {
            mono.players.forEach(p => {
                if (p.cards && Array.isArray(p.cards)) {
                    p.cards.forEach(restoreCardFunctions);
                }
            });
        }
        // Restore cards in inventory
        if (cardInventory && Array.isArray(cardInventory)) {
            cardInventory.forEach(restoreCardFunctions);
        }
    }

    // 15+ random events
    const MONO_EVENTS = [
        // Common (weight 3) — minor gold effects
        {nm:'金币雨', ic:'🌧️', desc:'所有玩家获得 1000💰', rarity:'common', eff:(mono,p)=>{mono.players.forEach(pl=>{if(!pl.bankrupt)pl.money+=1000})}},
        {nm:'地震', ic:'🌋', desc:'当前玩家失去 1000💰', rarity:'common', eff:(mono,p)=>{p.money-=1000}},
        {nm:'节日庆典', ic:'🎉', desc:'所有玩家获得 500💰', rarity:'common', eff:(mono,p)=>{mono.players.forEach(pl=>{if(!pl.bankrupt)pl.money+=500})}},
        {nm:'小偷出没', ic:'🦹', desc:'当前玩家失去 800💰', rarity:'common', eff:(mono,p)=>{p.money-=800}},
        {nm:'招商引资', ic:'💼', desc:'当前玩家获得 1500💰', rarity:'common', eff:(mono,p)=>{p.money+=1500}},
        {nm:'人口迁移', ic:'🚶', desc:'当前玩家获得 800💰', rarity:'common', eff:(mono,p)=>{p.money+=800}},
        {nm:'流星雨', ic:'☄️', desc:'所有玩家失去 300💰', rarity:'common', eff:(mono,p)=>{mono.players.forEach(pl=>{if(!pl.bankrupt)pl.money-=300})}},
        {nm:'投资回报', ic:'💼', desc:'当前玩家每处房产收入 200💰', rarity:'common', eff:(mono,p)=>{const pi=mono.players.indexOf(p);let cnt=0;mono.tiles.forEach((t,i)=>{if(t.type==='property'&&mono.properties[t.id]?.owner===pi){p.money+=200;cnt++;}});if(cnt===0)p.money+=200;}},
        {nm:'快递到达', ic:'📦', desc:'当前玩家获得载具加成或金币', rarity:'common', eff:(mono,p)=>{if(Math.random()<0.3){p.speed=2;}else{p.money+=1200;}}},
        // Uncommon (weight 2) — moderate effects
        {nm:'牛市', ic:'📈', desc:'当前玩家资金 +10%', rarity:'uncommon', eff:(mono,p)=>{p.money+=Math.floor(p.money*0.1)}},
        {nm:'熊市', ic:'📉', desc:'当前玩家资金 -10%', rarity:'uncommon', eff:(mono,p)=>{p.money-=Math.floor(p.money*0.1)}},
        {nm:'税务稽查', ic:'🧾', desc:'所有玩家缴纳 600💰', rarity:'uncommon', eff:(mono,p)=>{mono.players.forEach(pl=>{if(!pl.bankrupt)pl.money-=600})}},
        {nm:'物价波动', ic:'📊', desc:'当前玩家资金随机波动±15%', rarity:'uncommon', eff:(mono,p)=>{p.money=Math.max(0,Math.floor(p.money*(1+(Math.random()-0.5)*0.3)))}},
        {nm:'科技突破', ic:'🔬', desc:'当前玩家随机地产升级', rarity:'uncommon', eff:(mono,p)=>{
            const pi=mono.players.indexOf(p);
            const owned=mono.tiles.filter(t=>t.type==='property'&&mono.properties[t.id]?.owner===pi&&(mono.properties[t.id]?.level||0)<5);
            if(owned.length){const t=owned[Math.floor(Math.random()*owned.length)];mono.properties[t.id].level=(mono.properties[t.id]?.level||0)+1;}
        }},
        {nm:'神秘商人', ic:'🧙', desc:'当前玩家获得一张随机卡牌', rarity:'uncommon', eff:(mono,p)=>{p.cards.push(drawWeightedCard())}},
        {nm:'节日礼花', ic:'🎆', desc:'所有玩家获得随机卡牌', rarity:'uncommon', eff:(mono,p)=>{mono.players.forEach(pl=>{if(!pl.bankrupt)pl.cards.push(drawWeightedCard())})}},
        // Rare (weight 1) — big rewards or effects
        {nm:'宝藏发现', ic:'🗺️', desc:'当前玩家获得 3000💰', rarity:'rare', eff:(mono,p)=>{p.money+=3000}},
        {nm:'自然灾害', ic:'🌪️', desc:'当前玩家随机地产降级', rarity:'rare', eff:(mono,p)=>{
            const pi=mono.players.indexOf(p);
            const owned=mono.tiles.filter(t=>t.type==='property'&&mono.properties[t.id]?.owner===pi&&(mono.properties[t.id]?.level||0)>0);
            if(owned.length){const t=owned[Math.floor(Math.random()*owned.length)];mono.properties[t.id].level=Math.max(0, (mono.properties[t.id]?.level||1)-1);}
        }},
        {nm:'幸运转盘', ic:'🎡', desc:'当前玩家随机获得金钱或卡牌', rarity:'rare', eff:(mono,p)=>{if(Math.random()<0.5){const amt=500+Math.floor(Math.random()*3000);p.money+=amt;}else{p.cards.push(drawWeightedCard())}}},
        {nm:'黑市拍卖', ic:'🏪', desc:'当前玩家随机获得一张诅咒卡', rarity:'rare', eff:(mono,p)=>{const curses=CARD_POOL.filter(c=>c.isCurse);if(curses.length)p.cards.push({...curses[Math.floor(Math.random()*curses.length)]})}},
        // Legendary (weight 0.3) — game-changing
        {nm:'彩票中奖', ic:'🎰', desc:'当前玩家获得 5000💰', rarity:'legendary', eff:(mono,p)=>{p.money+=5000}},
        {nm:'宝藏猎人', ic:'🗝️', desc:'当前玩家获得一张稀有卡牌', rarity:'legendary', eff:(mono,p)=>{const rare=CARD_POOL.filter(c=>c.rarity==='rare'||c.rarity==='legendary');p.cards.push({...rare[Math.floor(Math.random()*rare.length)]})}},
        // === New events: more variety ===
        {nm:'经济危机', ic:'💼', desc:'所有玩家失去 5% 资金', rarity:'uncommon', eff:(mono,p)=>{mono.players.forEach(pl=>{if(!pl.bankrupt)pl.money-=Math.floor(pl.money*0.05)})}},
        {nm:'股市暴涨', ic:'🚀', desc:'所有股价上涨 15%', rarity:'rare', eff:(mono,p)=>{if(mono.stockPrices)mono.stockPrices=mono.stockPrices.map(pr=>Math.floor(pr*1.15));mono.stockMarket=getStockIndex()}},
        {nm:'股市崩盘', ic:'💥', desc:'所有股价下跌 20%', rarity:'rare', eff:(mono,p)=>{if(mono.stockPrices)mono.stockPrices=mono.stockPrices.map(pr=>Math.max(1,Math.floor(pr*0.8)));mono.stockMarket=getStockIndex()}},
        {nm:'免费抽卡日', ic:'🎁', desc:'所有玩家免费抽取 2 张卡牌', rarity:'uncommon', eff:(mono,p)=>{mono.players.forEach(pl=>{if(!pl.bankrupt){for(let i=0;i<2;i++)pl.cards.push(drawWeightedCard())}})}},
        {nm:'地产大亨', ic:'👑', desc:'当前玩家随机地产升 2 级', rarity:'rare', eff:(mono,p)=>{const pi=mono.players.indexOf(p);const owned=mono.tiles.filter(t=>t.type==='property'&&mono.properties[t.id]?.owner===pi&&(mono.properties[t.id]?.level||0)<4);if(owned.length){const t=owned[Math.floor(Math.random()*owned.length)];mono.properties[t.id].level=Math.min(5,(mono.properties[t.id]?.level||0)+2);}}},
        {nm:'慈善晚宴', ic:'🤝', desc:'最富有玩家向最穷玩家捐赠 2000💰', rarity:'uncommon', eff:(mono,p)=>{const sorted=[...mono.players].filter(pl=>!pl.bankrupt).sort((a,b)=>b.money-a.money);if(sorted.length>=2){sorted[0].money-=2000;sorted[sorted.length-1].money+=2000}}},
        {nm:'黄金时代', ic:'🌟', desc:'所有玩家获得 5% 资金加成', rarity:'legendary', eff:(mono,p)=>{mono.players.forEach(pl=>{if(!pl.bankrupt)pl.money+=Math.floor(pl.money*0.05)})}},
        {nm:'载具展览', ic:'🏎️', desc:'获得1500💰或载具折扣（可叠加，5回合过期）', rarity:'uncommon', eff:(mono,p)=>{
            // Dynamic probability: base 40% discount / 60% coins, varies ±15% based on economy
            const economy = mono.economy || {};
            const discountChance = Math.max(0.25, Math.min(0.55, 0.4 + (Math.random() - 0.5) * 0.3 + (economy.inflation || 0.03) * 0.5));
            if(Math.random() < discountChance){
                const discount = 800 + Math.floor(Math.random()*1200);
                p.vehicleDiscount = (p.vehicleDiscount || 0) + discount;
                p.vehicleDiscountTurns = 5; // Expires in 5 turns, refreshable
                return `🏎️ 载具折扣 💰${discount}！（累计 💰${p.vehicleDiscount}，${p.vehicleDiscountTurns}回合内有效）`;
            } else {
                p.money += 1500;
                return `🏎️ 获得 💰1500！`;
            }
        }},
        {nm:'遗产继承', ic:'📜', desc:'当前玩家获得 4000💰', rarity:'legendary', eff:(mono,p)=>{p.money+=4000}},
    ];
    const EVENT_RARITY_WEIGHTS = { common: 3, uncommon: 2, rare: 1, legendary: 0.3 };

    /* Weighted random event selection */
    function pickRandomEvent() {
        const weighted = [];
        for (const ev of MONO_EVENTS) {
            const w = EVENT_RARITY_WEIGHTS[ev.rarity] || 1;
            for (let i = 0; i < w * 10; i++) weighted.push(ev);
        }
        return weighted[Math.floor(Math.random() * weighted.length)];
    }

    const MONO_PLAYERS_INIT = [
        {ic:'🐰', nm:'兔可可', color:'var(--accent)', isHuman:true},
        {ic:'🦊', nm:'小狐', color:'#FF9800', personality:'aggressive'},
        {ic:'🐱', nm:'咪咪', color:'#3b82f6', personality:'conservative'},
        {ic:'🐼', nm:'团团', color:'#4CAF50', personality:'balanced'},
    ];
    const EXTRA_PLAYERS = [
        // Era 1 players (forest)
        {ic:'🦉', nm:'夜枭', color:'#8B5CF6', personality:'balanced'},
        {ic:'🐧', nm:'波波', color:'#0EA5E9', personality:'conservative'},
        // Era 2 players (lake)
        {ic:'🦄', nm:'彩虹', color:'#EC4899', personality:'aggressive'},
        {ic:'🐲', nm:'龙龙', color:'#10B981', personality:'balanced'},
        // Era 3 players (rainbow)
        {ic:'🦊', nm:'小狐', color:'#F59E0B', personality:'aggressive'},
        {ic:'🐙', nm:'八爪', color:'#06B6D4', personality:'balanced'},
        // Era 4 players (crystal)
        {ic:'🦋', nm:'蝶舞', color:'#A78BFA', personality:'conservative'},
        {ic:'🐢', nm:'龟叔', color:'#84CC16', personality:'conservative'},
        // Era 5 players (sky) + extras for 16 total
        {ic:'🦅', nm:'苍鹰', color:'#EF4444', personality:'aggressive'},
        {ic:'🦜', nm:'彩鹦', color:'#3B82F6', personality:'balanced'},
        {ic:'🐝', nm:'小蜜', color:'#FBBF24', personality:'balanced'},
        {ic:'🦔', nm:'刺刺', color:'#78716C', personality:'conservative'},
    ];
    const AI_PERSONALITIES = {
        aggressive:   {nm:'激进', buyChance:0.70, cardUseChance:0.65, loanChance:0.7, upgradeChance:0.6, attackLeaderBias:0.75},
        conservative: {nm:'保守', buyChance:0.35, cardUseChance:0.30, loanChance:0.2, upgradeChance:0.25, attackLeaderBias:0.45},
        balanced:     {nm:'平衡', buyChance:0.50, cardUseChance:0.50, loanChance:0.4, upgradeChance:0.4, attackLeaderBias:0.60},
    };

    /* ==================== AI Learning System ==================== */
    // Records human player actions for AI to learn from
    function recordHumanAction(action, data) {
        if (!mono.humanStats) {
            mono.humanStats = {
                buyProperty: 0, buyStock: 0, buyVehicle: 0, useCard: 0,
                takeLoan: 0, upgradeProperty: 0, mortgageProperty: 0,
                stockPicks: {}, vehiclePicks: {}, humanMoneyHistory: [],
                humanWins: 0, humanGames: 0,
            };
        }
        if (!mono.eventLog) mono.eventLog = [];
        const hs = mono.humanStats;
        switch(action) {
            case 'buyProperty': hs.buyProperty++; break;
            case 'buyStock':
                hs.buyStock++;
                if (data && data.stockIdx !== undefined) {
                    hs.stockPicks[data.stockIdx] = (hs.stockPicks[data.stockIdx] || 0) + 1;
                }
                break;
            case 'buyVehicle':
                hs.buyVehicle++;
                if (data && data.vehicleId) {
                    hs.vehiclePicks[data.vehicleId] = (hs.vehiclePicks[data.vehicleId] || 0) + 1;
                }
                break;
            case 'useCard': hs.useCard++; break;
            case 'takeLoan': hs.takeLoan++; break;
            case 'upgradeProperty': hs.upgradeProperty++; break;
            case 'mortgageProperty': hs.mortgageProperty++; break;
        }
    }

    // Records game events (all players) for event log display
    function recordGameEvent(type, player, action, result) {
        if (!mono.eventLog) mono.eventLog = [];
        // Sanitize all fields to prevent [object Object] and undefined display
        const sanitize = (v) => {
            if (v === null || v === undefined) return '';
            if (typeof v === 'object') {
                try { return JSON.stringify(v); } catch(e) { return String(v); }
            }
            return String(v);
        };
        mono.eventLog.push({
            type: sanitize(type) || 'unknown',
            player: sanitize(player) || '未知',
            action: sanitize(action) || '',
            result: sanitize(result),
            turn: (typeof mono?.turn === 'number') ? mono.turn : 0,
            time: Date.now(),
        });
        // Keep last 200 events to avoid memory bloat
        if (mono.eventLog.length > 200) mono.eventLog.shift();
    }

    // Records human player's money each turn for trend analysis
    function recordHumanMoneyTurn() {
        if (!mono.humanStats) return;
        const p = mono.players[0];
        if (!p || p.bankrupt) return;
        mono.humanStats.humanMoneyHistory.push({turn: mono.turn, money: p.money});
        // Keep last 30 turns to avoid memory bloat
        if (mono.humanStats.humanMoneyHistory.length > 30) {
            mono.humanStats.humanMoneyHistory.shift();
        }
    }

    // Returns AI difficulty multiplier based on human performance (0.7 ~ 1.4)
    function getAIDifficulty() {
        if (!mono.humanStats || !mono.humanStats.humanMoneyHistory || mono.humanStats.humanMoneyHistory.length < 3) {
            return 1.0; // Default difficulty
        }
        const history = mono.humanStats.humanMoneyHistory;
        const recent = history.slice(-5);
        const avgMoney = recent.reduce((s, h) => s + h.money, 0) / recent.length;
        // If human is doing well (lots of money), AI gets harder
        // If human is struggling, AI gets easier
        if (avgMoney > 30000) return 1.4; // Human is rich — AI gets aggressive
        if (avgMoney > 20000) return 1.2;
        if (avgMoney > 10000) return 1.0;
        if (avgMoney > 5000) return 0.85;
        return 0.7; // Human is struggling — AI takes it easy
    }

    // Returns the most popular stock the human player buys (for AI strategy replication)
    function getHumanFavoriteStock() {
        if (!mono.humanStats || !mono.humanStats.stockPicks) return -1;
        const entries = Object.entries(mono.humanStats.stockPicks);
        if (entries.length === 0) return -1;
        entries.sort((a, b) => b[1] - a[1]);
        return parseInt(entries[0][0]);
    }

    // Returns the most popular vehicle the human player buys
    function getHumanFavoriteVehicle() {
        if (!mono.humanStats || !mono.humanStats.vehiclePicks) return null;
        const entries = Object.entries(mono.humanStats.vehiclePicks);
        if (entries.length === 0) return null;
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0];
    }

    /* Vehicle system: each vehicle gives unique bonuses */
    const VEHICLE_POOL = [
        {id:'scooter',  ic:'🛴', nm:'胡萝卜滑板车', price:2000,  bonus:{type:'speed', val:1, label:'移动+1'},          desc:'轻便灵活，每回合移动多1步'},
        {id:'bike',     ic:'🚲', nm:'兔兔自行车',   price:3600,  bonus:{type:'speed', val:2, label:'移动+2'},          desc:'环保出行，每回合移动多2步'},
        {id:'car',      ic:'🚗', nm:'胡萝卜跑车',   price:7200,  bonus:{type:'rentDiscount', val:0.2, label:'租金-20%'}, desc:'风驰电掣，经过他人地产租金减免20%'},
        {id:'tank',     ic:'🚜', nm:'胡萝卜坦克',   price:10800, bonus:{type:'rentImmune', val:0.15, label:'15%免租'},   desc:'坚不可摧，15%概率免疫一次租金'},
        {id:'rocket',   ic:'🚀', nm:'兔兔火箭',     price:20000, bonus:{type:'speed', val:3, label:'移动+3'},          desc:'一飞冲天，每回合移动多3步'},
        {id:'ufo',      ic:'🛸', nm:'UFO飞碟',      price:50000, bonus:{type:'rentDiscount', val:0.5, label:'租金-50%'}, desc:'外星科技，经过他人地产租金减免50%'},
        {id:'dragon',   ic:'🐉', nm:'胡萝卜巨龙',   price:100000, bonus:{type:'allInOne', val:3, label:'全能加成'},       desc:'传说神兽，移动+3且租金减免50%且15%免租'},
    ];

    /* Stock market: 10 stock types with varying volatility */
    const STOCK_TYPES = [
        {id:0, ic:'🥕', nm:'胡萝卜农业',  basePrice:50,  volatility:0.035, trend:'stable',    desc:'稳健蓝筹，低波动，适合长期持有'},
        {id:1, ic:'🏰', nm:'城堡地产',    basePrice:120, volatility:0.055, trend:'stable',    desc:'地产龙头，分红稳定，中等波动'},
        {id:2, ic:'⚡', nm:'能源电力',    basePrice:80,  volatility:0.07,  trend:'cyclical',  desc:'周期性强，经济好时大涨，差时大跌'},
        {id:3, ic:'🔧', nm:'工业制造',    basePrice:100, volatility:0.045, trend:'stable',    desc:'工业基础，波动适中'},
        {id:4, ic:'💊', nm:'医药健康',    basePrice:150, volatility:0.035, trend:'growth',    desc:'防御性强，熊市抗跌，稳步增长'},
        {id:5, ic:'🎮', nm:'游戏娱乐',    basePrice:200, volatility:0.10,  trend:'growth',    desc:'高成长高波动，暴涨暴跌'},
        {id:6, ic:'🚀', nm:'航天科技',    basePrice:300, volatility:0.13,  trend:'growth',    desc:'高风险高回报，波动极大'},
        {id:7, ic:'🛒', nm:'零售消费',    basePrice:60,  volatility:0.025, trend:'stable',    desc:'日常消费，最低波动，适合保守投资'},
        {id:8, ic:'🏦', nm:'金融银行',    basePrice:180, volatility:0.08,  trend:'cyclical',  desc:'与经济周期强相关，波动较大'},
        {id:9, ic:'🔮', nm:'神秘宝石',    basePrice:500, volatility:0.15,  trend:'volatile',  desc:'投机性极强，巨幅波动，赌徒最爱'},
    ];
    const STOCK_LEVERAGES = [1, 2, 3, 5]; // Tighter leverage: removed 10x
    const STOCK_COMMISSION_RATE = 0.004; // 0.4% transaction fee
    const STOCK_SLIPPAGE_RATE = 0.003; // 0.3% slippage per trade
    const STOCK_REFRESH_INTERVAL = 30000; // 30 seconds

    // Debounce utility
    function debounce(fn, ms) {
        let timer = null;
        return function() {
            const args = arguments;
            const ctx = this;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
        };
    }

    /* ==================== State ==================== */
    let mono = null;
    let godModeActive = false;
    let titleClicks = 0;
    let avatarClickCount = 0;
    let currentView = 'home';
    let mouseBunnyEnabled = true;
    let pixelFontEnabled = false;
    let cardInventory = [];
    let eventLog = [];
    let cooldownInterval = null;

    // Performance monitor for About panel — uses RAF for accurate FPS measurement
    const _perfMonitor = {
        _frames: 0,
        _lastTime: performance.now(),
        _rafLast: performance.now(),
        fps: 60,
        renderMs: 0,
        _renderStart: 0,
        _rafId: null,
        _activeRAF: false,
        beginRender() { this._renderStart = performance.now(); },
        endRender() { this.renderMs = Math.round((performance.now() - this._renderStart) * 10) / 10; },
        // RAF-based FPS loop — more accurate than setInterval, works on mobile
        rafLoop() {
            const now = performance.now();
            this._rafLast = now;
            this._frames++;
            if (now - this._lastTime >= 500) {
                this.fps = Math.round(this._frames * 1000 / (now - this._lastTime));
                this._frames = 0;
                this._lastTime = now;
            }
            this._rafId = requestAnimationFrame(() => this.rafLoop());
        },
        startRAF() {
            if (this._activeRAF) return;
            this._activeRAF = true;
            this._rafLast = performance.now();
            this._lastTime = performance.now();
            this._frames = 0;
            this.rafLoop();
        }
    };
    // Start RAF-based FPS monitoring immediately
    _perfMonitor.startRAF();
    // Pause FPS monitoring when tab is hidden to save CPU/GPU
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            if (_perfMonitor._rafId) { cancelAnimationFrame(_perfMonitor._rafId); _perfMonitor._rafId = null; _perfMonitor._activeRAF = false; }
        } else {
            if (document.getElementById('bcos-car-lockscreen')) return;
            _perfMonitor.startRAF();
        }
    });

    // === Platform detection + Performance adaptive config ===
    const _isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (_isMobile) document.documentElement.classList.add('touch-device');
    const _isStandalone = isStandaloneMode();
    const _perfConfig = {
        modalLockMs: _isMobile ? 200 : 80,
        clickGuardMs: _isMobile ? 250 : 0,
        transitionMs: _isMobile ? 0.25 : 0.15,
        trailEnabled: true,
        trailParticleCount: _isMobile ? 3 : 8,
        trailMaxPoints: _isMobile ? 30 : 50,
        renderThrottleMs: _isMobile ? 16 : 8,
        _fpsHistory: [],
        _lowPerfMode: false,
        adapt() {
            if (document.hidden) return; // Don't adapt when tab/window is hidden
            const fps = _perfMonitor.fps;
            this._fpsHistory.push(fps);
            if (this._fpsHistory.length > 10) this._fpsHistory.shift();
            const avgFps = this._fpsHistory.reduce((a,b)=>a+b,0) / this._fpsHistory.length;
            if (avgFps < 30) {
                this._lowPerfMode = true;
                this.trailParticleCount = 0;
                this.trailMaxPoints = 15;
                this.transitionMs = 0.1;
                document.documentElement.classList.add('low-perf');
            } else if (avgFps > 50 && this._lowPerfMode) {
                this._lowPerfMode = false;
                this.trailParticleCount = _isMobile ? 3 : 8;
                this.trailMaxPoints = _isMobile ? 30 : 50;
                this.transitionMs = _isMobile ? 0.25 : 0.15;
                document.documentElement.classList.remove('low-perf');
            }
            document.documentElement.style.setProperty('--transition',
                this.transitionMs + 's cubic-bezier(.4,0,.2,1)');
        }
    };
    setInterval(() => _perfConfig.adapt(), 3000);
    document.documentElement.style.setProperty('--transition',
        _perfConfig.transitionMs + 's cubic-bezier(.4,0,.2,1)');

    // GPU info detection — uses WEBGL_debug_renderer_info to get GPU vendor and renderer
    const _gpuInfo = { vendor: '检测中...', renderer: '检测中...', isAppleSilicon: false, gpuAccelerated: false };
    (function detectGPU() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) {
                _gpuInfo.vendor = '不支持WebGL';
                _gpuInfo.renderer = 'N/A';
                return;
            }
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                _gpuInfo.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '未知';
                _gpuInfo.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '未知';
            } else {
                _gpuInfo.vendor = gl.getParameter(gl.VENDOR) || '未知';
                _gpuInfo.renderer = gl.getParameter(gl.RENDERER) || '未知';
            }
            // Detect Apple Silicon (M1/M2/M3/M4)
            const rendererLower = _gpuInfo.renderer.toLowerCase();
            _gpuInfo.isAppleSilicon = rendererLower.includes('apple') && (
                rendererLower.includes('m1') || rendererLower.includes('m2') ||
                rendererLower.includes('m3') || rendererLower.includes('m4') ||
                rendererLower.includes('apple gpu') || rendererLower.includes('apple m')
            );
            // Also check vendor for Apple
            if (_gpuInfo.vendor.toLowerCase().includes('apple')) {
                _gpuInfo.isAppleSilicon = true;
                if (rendererLower.includes('apple gpu') || rendererLower === 'apple') {
                    _gpuInfo.renderer = 'Apple Silicon GPU';
                }
            }
            // Check for hardware acceleration via context attributes
            const ctxAttribs = gl.getContextAttributes();
            _gpuInfo.gpuAccelerated = ctxAttribs ? (ctxAttribs.antialias || ctxAttribs.powerPreference === 'high-performance') : true;
        } catch(e) {
            _gpuInfo.vendor = '检测失败';
            _gpuInfo.renderer = 'N/A';
        }
    })();

    /* ==================== Init ==================== */
    function tryAutoFullscreen() {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
            try {
                const p = req.call(el);
                if (p && typeof p.catch === 'function') p.catch(() => {});
            } catch(e) {}
        }
    }
    const enterFsOnFirstGesture = () => {
        window.removeEventListener('click', enterFsOnFirstGesture);
        window.removeEventListener('touchstart', enterFsOnFirstGesture);
        window.removeEventListener('keydown', enterFsOnFirstGesture);
    };
    window.addEventListener('click', enterFsOnFirstGesture, { once: true, passive: true });
    window.addEventListener('touchstart', enterFsOnFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', enterFsOnFirstGesture, { once: true, passive: true });

    window.onload = () => {
        const safe = (fn) => { try { fn(); } catch(e) { console.error(e); } };
        safe(loadFontScale);
        safe(loadTheme);
        safe(loadTextSelectPref);
        safe(initMonopoly);
        safe(initCardSystem);
        safe(initPWA);
        safe(initThemeGrid);
        safe(renderChangelog);
        safe(initMouseTrail);
        safe(initAvatarEffect);
        safe(initMobileTouchBloom);
        safe(startLoop);
        safe(() => {
            const sp = new URLSearchParams(window.location.search);
            const isCar = sp.has('car') || sp.get('mode') === 'car' || sp.has('lock') || sp.has('lockscreen') || sp.get('bcos') === 'car';
            if (isCar) {
                setTimeout(() => showBcosCarLockscreen(), 100);
            } else {
                setTimeout(() => showBcosOS(), 100);
            }

        });
    };

    function applyDefaultView() {
        const dv = safeGetItem('defaultView', 'home');
        if (dv === 'home') return;
        if (dv === 'monopoly') navigateTo('monopoly');
        else if (dv === 'anniversary') navigateTo('anniversary');
        else if (dv === 'logs') navigateTo('logs');
        else if (dv === 'settings') navigateTo('settings');
        else if (dv === 'bcos') setTimeout(() => showBcosOS(), 200);
        else if (dv === 'bcos-desktop' || dv === 'desktop') setTimeout(() => { showBcosOS(); setTimeout(() => { if (_bcos.mode === 'terminal' || _bcos.mode === 'boot') _bcosLaunchDesktop(); }, 600); }, 200);
        else if (dv === 'carlock') setTimeout(() => showBcosCarLockscreen(), 200);
    }

    function setDefaultView(v) {
        safeSetItem('defaultView', v);
        showToast('默认页面已更新', 'success');
    }

    /* ==================== Save Migration ==================== */
    function migrateSaveKey() {
        // Migrate card inventory from previous version keys
        const prevKeys = ['bunny_cc_v7.6.0', 'bunny_cc_v7.5.0', 'bunny_cc_v7.4.0', 'bunny_cc_v7.3.0', 'bunny_cc_v7.2.0', 'bunny_cc_v7.1.0', 'bunny_cc_v7.0.0', 'bunny_cc_v6.4.0', 'bunny_cc_v6.3.0', 'bunny_cc_v6.2.0', 'bunny_cc_v6.1.0', 'bunny_cc_v6.0.0'];
        for (const k of prevKeys) {
            try {
                const oldData = localStorage.getItem(k);
                if (oldData && !localStorage.getItem(CONFIG.SAVE_KEY)) {
                    localStorage.setItem(CONFIG.SAVE_KEY, oldData);
                    console.log('Migrated card inventory from', k);
                    break;
                }
            } catch(e) {}
        }
        // v6.0.0 uses a completely different data structure (monopoly, not city)
        // Old city saves are incompatible, so clean them up
        const oldCityKeys = ['bunny_cc_v5.2.0','bunny_cc_v5.1.0','bunny_cc_v5.0.0','bunny_cc_v4.3.0','bunny_cc_v1.2.0','bunny_cc_v1.1.0','bunny_cc_v1.0.0'];
        oldCityKeys.forEach(k => { try { if (localStorage.getItem(k)) localStorage.removeItem(k); } catch(e){} });
        // Old monopoly save (v1) is also incompatible with expanded map
        try { if (localStorage.getItem('bunny_mono_v1')) localStorage.removeItem('bunny_mono_v1'); } catch(e){}
    }

    /* ==================== Settings Migration ==================== */
    // Migrates old/legacy preference keys to current key names and normalizes values
    function migrateSettings() {
        const migrations = [
            // Old tab bar keys → tabBarMode
            { oldKeys: ['bunny_tab_bar_hidden', 'tabBarHidden', 'hideTabBar'], newKey: 'tabBarMode',
              transform: (v) => v === '1' || v === 'true' || v === 'yes' ? 'hidden' : 'always' },
            { oldKeys: ['bunny_tab_bar_mode'], newKey: 'tabBarMode', transform: (v) => v },
            // Old sidebar keys → sidebarCollapsed
            { oldKeys: ['bunny_sidebar_collapsed', 'sidebarHidden'], newKey: 'sidebarCollapsed',
              transform: (v) => v === '1' || v === 'true' ? 'locked-collapsed' : 'auto' },
            // Old theme key
            { oldKeys: ['bunny_theme', 'bunny_cc_theme'], newKey: 'theme', transform: (v) => v },
            // Old mouse trail toggle
            { oldKeys: ['bunny_mouse_trail', 'mouseTrail'], newKey: 'mouseBunny',
              transform: (v) => v === '0' || v === 'false' ? '0' : '1' },
            // Old font scale key
            { oldKeys: ['bunny_font_scale', 'fontScaleVal'], newKey: 'fontScale', transform: (v) => v },
            // Old map size key
            { oldKeys: ['bunny_map_size'], newKey: 'mapSizePref', transform: (v) => v },
            // Old text select key
            { oldKeys: ['bunny_text_select'], newKey: 'textSelectDisabled',
              transform: (v) => v === '0' || v === 'false' ? '0' : '1' },
            // Old pixel font key
            { oldKeys: ['bunny_pixel_font'], newKey: 'pixelFont', transform: (v) => v },
            // Old dice multiplier key
            { oldKeys: ['bunny_dice_mult'], newKey: 'diceMultiplierPref', transform: (v) => v },
            // Old egg click trigger key
            { oldKeys: ['bunny_egg_click'], newKey: 'eggClickTrigger', transform: (v) => v },
            // Old sidebar avatar key
            { oldKeys: ['bunny_sidebar_avatar'], newKey: 'sidebarAvatar', transform: (v) => v },
            // Old player count key
            { oldKeys: ['bunny_player_count'], newKey: 'playerCountPref', transform: (v) => v },
        ];
        let migrated = 0;
        for (const m of migrations) {
            try {
                // Skip if new key already exists
                if (localStorage.getItem(m.newKey) !== null) continue;
                for (const oldKey of m.oldKeys) {
                    const oldVal = localStorage.getItem(oldKey);
                    if (oldVal !== null) {
                        const newVal = m.transform(oldVal);
                        localStorage.setItem(m.newKey, newVal);
                        localStorage.removeItem(oldKey);
                        console.log(`[Settings Migration] ${oldKey}="${oldVal}" → ${m.newKey}="${newVal}"`);
                        migrated++;
                        break;
                    }
                }
            } catch(e) {}
        }
        // Also normalize tabBarMode values: old 'hide' → 'hidden'
        try {
            const tbm = localStorage.getItem('tabBarMode');
            if (tbm === 'hide' || tbm === 'collapsed') {
                localStorage.setItem('tabBarMode', 'hidden');
                migrated++;
            }
        } catch(e) {}
        // Normalize sidebarCollapsed: old 'collapsed' → 'locked-collapsed'
        try {
            const sbc = localStorage.getItem('sidebarCollapsed');
            if (sbc === 'collapsed' || sbc === 'hidden') {
                localStorage.setItem('sidebarCollapsed', 'locked-collapsed');
                migrated++;
            }
            if (sbc === 'expanded' || sbc === 'open') {
                localStorage.setItem('sidebarCollapsed', 'locked-open');
                migrated++;
            }
        } catch(e) {}
        if (migrated > 0) console.log(`[Settings Migration] ${migrated} setting(s) migrated`);
    }

    /* ==================== Monopoly: Initialization ==================== */
    