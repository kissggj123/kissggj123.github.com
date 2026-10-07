let _modalLockUntil = 0;

    function _isModalLocked() { return performance.now() < _modalLockUntil; }
    function _lockModal() { _modalLockUntil = performance.now() + _perfConfig.modalLockMs; }

    // Unified modal show: closes any existing overlay first, then opens
    function showModalContent(htmlContent) {
        // Close any existing overlays to prevent stacking
        closeModal();
        // Close fullscreen map if open
        const fsOverlay = document.getElementById('fs-map-overlay');
        if (fsOverlay) fsOverlay.style.display = 'none';
        // Set content and show
        const modal = document.getElementById('modal-content');
        modal.innerHTML = htmlContent;
        document.getElementById('modal-overlay').classList.add('show');
        _lockModal();
    }

    // Global click guard: suppresses synthetic click events after touch during modal lock
    // This prevents the mobile touch+click double-fire that causes overlapping panels
    (function initModalClickGuard() {
        let _lastTouchEnd = 0;
        document.addEventListener('touchend', function() { _lastTouchEnd = performance.now(); }, { passive: true, capture: true });
        // Intercept clicks that happen within the dynamic window of a touchend AND while modal is locked (mobile only)
        document.addEventListener('click', function(e) {
            if (!_isMobile) return; // PC doesn't need click guard
            // If modal is locked and this click is a synthetic follow-up from a touch event, suppress it
            if (_isModalLocked() && _lastTouchEnd > 0 && performance.now() - _lastTouchEnd < _perfConfig.clickGuardMs) {
                // Only suppress clicks OUTSIDE the modal content (ghost clicks hitting underlying buttons)
                // Allow clicks inside the modal so users can interact with buttons (close, confirm, etc.)
                const modalOverlay = document.getElementById('modal-overlay');
                if (modalOverlay && modalOverlay.contains(e.target)) return;
                // Check if target is a modal-opening button
                const target = e.target.closest('[onclick]');
                if (target) {
                    const handler = target.getAttribute('onclick') || '';
                    if (/show|open|spread|buy|sell|switch|confirm|repay|draw|useCard|carryCard|locateTile|equip|roll/i.test(handler)) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }
            }
        }, { capture: true });

        // Auto-lock whenever modal becomes visible (catches all modal-opening paths)
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            new MutationObserver(function(mutations) {
                for (const m of mutations) {
                    if (m.attributeName === 'class' && modalOverlay.classList.contains('show')) {
                        if (!_isModalLocked()) _lockModal();
                        break;
                    }
                }
            }).observe(modalOverlay, { attributes: true, attributeFilter: ['class'] });
        }
    })();

    function closeModal(e) {
        if (e && e.target !== e.currentTarget) return;
        const ov = document.getElementById('modal-overlay');
        if (ov) ov.classList.remove('show');
        _modalLockUntil = 0; // Clear lock immediately so next modal can open without delay
        // Reset modal transform (from bottom-sheet swipe)
        const modal = document.getElementById('modal-content');
        if (modal) modal.style.transform = '';
        if (_stockRefreshTimer) {
            clearInterval(_stockRefreshTimer);
            _stockRefreshTimer = null;
        }
        // If AI trade modal was dismissed, unblock AI turn
        if (mono && mono.started && mono.pendingTrade && mono.currentPlayer !== 0) {
            mono.pendingTrade = false;
            setTimeout(() => nextTurn(), 400);
        }
    }

    // Bottom Sheet swipe-to-close for mobile
    let _bsTouchStartY = 0;
    (function initBsSwipe() {
        document.addEventListener('touchstart', function(e) {
            const overlay = document.getElementById('modal-overlay');
            if (!overlay.classList.contains('show')) { _bsTouchStartY = 0; return; }
            const handle = overlay.querySelector('.modal-drag-handle');
            if (handle && (e.target === handle || e.target.closest('.modal-drag-handle'))) {
                _bsTouchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        document.addEventListener('touchmove', function(e) {
            if (document.getElementById('bcos-car-lockscreen')) return;
            if (_bsTouchStartY === 0) return;
            const deltaY = e.touches[0].clientY - _bsTouchStartY;
            if (deltaY > 0) {
                const modal = document.querySelector('#modal-content .modal') || document.getElementById('modal-content');
                if (modal) modal.style.transform = 'translateY(' + deltaY + 'px)';
            }
        }, { passive: true });

        document.addEventListener('touchend', function(e) {
            if (_bsTouchStartY === 0) return;
            const deltaY = e.changedTouches[0].clientY - _bsTouchStartY;
            const modal = document.querySelector('#modal-content .modal') || document.getElementById('modal-content');
            if (deltaY > 100) {
                closeModal();
            }
            if (modal) modal.style.transform = '';
            _bsTouchStartY = 0;
        }, { passive: true });
    })();

    // About modal with game statistics and performance data
    function showAboutModal() {
        // Gather game statistics
        const p = mono.players[0];
        const activePlayers = mono.players.filter(pl => !pl.bankrupt).length;
        const totalProps = mono.properties.filter(pr => pr && pr.owner >= 0).length;
        const myProps = mono.properties.filter((pr, i) => pr && pr.owner === 0).length;
        const totalTiles = mono.tiles.length;
        const economy = mono.economy || {};
        const hs = mono.humanStats || {};

        // Performance data — with mobile-safe fallbacks
        const perfData = {
            fps: (typeof _perfMonitor?.fps === 'number' && _perfMonitor.fps > 0) ? _perfMonitor.fps : 'N/A',
            memoryMB: (performance.memory) ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : '不可用',
            renderMs: (_perfMonitor?.renderMs !== undefined && _perfMonitor.renderMs >= 0) ? _perfMonitor.renderMs : 'N/A',
            domNodes: document.querySelectorAll('*').length,
        };

        // Calculate game duration
        const gameDuration = mono.started ? `${mono.turn} 回合` : '未开始';

        // Human action stats
        const totalActions = (hs.buyProperty||0) + (hs.buyStock||0) + (hs.buyVehicle||0) +
                             (hs.useCard||0) + (hs.takeLoan||0) + (hs.upgradeProperty||0) + (hs.mortgageProperty||0);

        const aiDiff = getAIDifficulty();
        const diffLabel = aiDiff >= 1.3 ? '挑战' : aiDiff >= 1.1 ? '困难' : aiDiff >= 0.9 ? '普通' : '简单';

        const modal = document.getElementById('modal-content');
        modal.innerHTML = `
            <div class="modal-drag-handle"></div>
            <div class="modal-title">ℹ️ 关于 — 游戏信息</div>
            <div style="padding:.5rem 0;">

                <!-- Game Stats Section -->
                <div style="background:var(--card2);border-radius:8px;padding:.6rem;margin-bottom:.5rem;">
                    <div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.4rem;">📊 游戏统计</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;font-size:.7rem;">
                        <div>🎮 游戏回合：<span style="color:var(--accent);font-weight:700;">${gameDuration}</span></div>
                        <div>👥 存活玩家：<span style="color:var(--accent);font-weight:700;">${activePlayers}/${mono.players.length}</span></div>
                        <div>🗺️ 地图格子：<span style="color:var(--accent);font-weight:700;">${totalTiles}</span></div>
                        <div>🏠 已购地产：<span style="color:var(--accent);font-weight:700;">${totalProps}</span></div>
                        <div>🐰 你的地产：<span style="color:var(--good);font-weight:700;">${myProps}</span></div>
                        <div>💰 你的资金：<span style="color:var(--good);font-weight:700;">💰${p?.money || 0}</span></div>
                        <div>📈 通胀率：<span style="color:var(--accent);">${((economy.inflation||0.03)*100).toFixed(1)}%</span></div>
                        <div>🏦 基准利率：<span style="color:var(--accent);">${((economy.loanRateBase||0.06)*100).toFixed(1)}%</span></div>
                    </div>
                </div>

                <!-- Real-Time System -->
                <div style="background:var(--card2);border-radius:8px;padding:.6rem;margin-bottom:.5rem;">
                    <div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.4rem;">🕐 现实时间系统</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;font-size:.7rem;">
                        <div>当前时段：<span style="color:var(--accent);font-weight:700;">${economy.timePhaseIcon || '🏢'} ${economy.timePhase || '上午'}</span></div>
                        <div>星期：<span style="color:var(--accent);font-weight:700;">${economy.isWeekend ? '周末' : '工作日'}</span></div>
                        <div>📊 股市波动：<span style="color:var(--accent);">${((economy.stockVolatilityMult||1)*100).toFixed(0)}%</span></div>
                        <div>🏠 租金系数：<span style="color:var(--accent);">${((economy.rentMultiplier||1)).toFixed(2)}x</span></div>
                        <div>🎲 事件概率：<span style="color:var(--accent);">${((economy.eventChanceMult||1)*100).toFixed(0)}%</span></div>
                        <div>🦢 黑天鹅：<span style="color:var(--bad);">${((economy.blackSwanChance||0.02)*100).toFixed(1)}%</span></div>
                    </div>
                    <div style="font-size:.65rem;color:var(--text2);margin-top:.3rem;">💡 现实时间影响所有游戏机制 — 不同时段经济、股市、事件、租金均不同</div>
                </div>

                <!-- Human Action Stats -->
                <div style="background:var(--card2);border-radius:8px;padding:.6rem;margin-bottom:.5rem;">
                    <div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.4rem;">🎯 玩家行为分析</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;font-size:.7rem;">
                        <div>🏠 购买地产：<span style="font-weight:700;">${hs.buyProperty||0} 次</span></div>
                        <div>📈 股票交易：<span style="font-weight:700;">${hs.buyStock||0} 次</span></div>
                        <div>🚗 购买载具：<span style="font-weight:700;">${hs.buyVehicle||0} 次</span></div>
                        <div>🃏 使用卡牌：<span style="font-weight:700;">${hs.useCard||0} 次</span></div>
                        <div>🏦 贷款次数：<span style="font-weight:700;">${hs.takeLoan||0} 次</span></div>
                        <div>⬆️ 升级地产：<span style="font-weight:700;">${hs.upgradeProperty||0} 次</span></div>
                        <div>🏠 抵押地产：<span style="font-weight:700;">${hs.mortgageProperty||0} 次</span></div>
                        <div>📊 总操作数：<span style="font-weight:700;">${totalActions}</span></div>
                    </div>
                </div>

                <!-- AI Difficulty -->
                <div style="background:var(--card2);border-radius:8px;padding:.6rem;margin-bottom:.5rem;">
                    <div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.4rem;">🤖 AI 学习系统</div>
                    <div style="font-size:.7rem;">
                        <div>当前难度等级：<span style="color:${aiDiff >= 1.1 ? 'var(--bad)' : aiDiff >= 0.9 ? 'var(--accent)' : 'var(--good)'};font-weight:700;">${diffLabel}</span> (×${aiDiff.toFixed(2)})</div>
                        <div style="margin-top:.2rem;color:var(--text2);">AI 根据你的资金状况动态调整难度</div>
                        ${hs.humanMoneyHistory && hs.humanMoneyHistory.length > 0 ?
                            `<div style="margin-top:.2rem;color:var(--text2);">最近资金趋势：💰${hs.humanMoneyHistory[hs.humanMoneyHistory.length-1].money}</div>` : ''}
                    </div>
                </div>

                <!-- Performance Data -->
                <div style="background:var(--card2);border-radius:8px;padding:.6rem;margin-bottom:.5rem;">
                    <div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.4rem;">⚡ 性能数据</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;font-size:.7rem;">
                        <div>🎯 帧率(FPS)：<span style="color:${typeof perfData.fps === 'number' && perfData.fps >= 50 ? 'var(--good)' : typeof perfData.fps === 'number' && perfData.fps >= 30 ? 'var(--warn)' : 'var(--bad)'};font-weight:700;">${perfData.fps}</span></div>
                        <div>💾 内存占用：<span style="font-weight:700;">${perfData.memoryMB}</span></div>
                        <div>⏱️ 渲染耗时：<span style="font-weight:700;">${perfData.renderMs} ms</span></div>
                        <div>🌐 DOM节点：<span style="font-weight:700;">${perfData.domNodes}</span></div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;font-size:.7rem;margin-top:.3rem;padding-top:.3rem;border-top:1px solid var(--border);">
                        <div>🖥️ GPU厂商：<span style="font-weight:700;color:var(--accent);">${_gpuInfo.vendor}</span></div>
                        <div>🎮 GPU型号：<span style="font-weight:700;color:var(--accent);font-size:.65rem;">${_gpuInfo.renderer.length > 40 ? _gpuInfo.renderer.substring(0, 40) + '...' : _gpuInfo.renderer}</span></div>
                        <div>🍎 Apple芯片：<span style="font-weight:700;color:${_gpuInfo.isAppleSilicon ? 'var(--good)' : 'var(--text2)'};">${_gpuInfo.isAppleSilicon ? '✓ 是' : '否'}</span></div>
                        <div>⚡ GPU加速：<span style="font-weight:700;color:${_gpuInfo.gpuAccelerated ? 'var(--good)' : 'var(--bad)'};">${_gpuInfo.gpuAccelerated ? '✓ 已启用' : '未启用'}</span></div>
                    </div>
                    <div style="font-size:.6rem;color:var(--text2);margin-top:.3rem;">💡 GPU硬件加速已应用于Canvas、动画、弹窗等元素。Apple M系列芯片自动检测并启用GPU合成层。</div>
                </div>

                <!-- Event Stats -->
                <div style="background:var(--card2);border-radius:8px;padding:.6rem;margin-bottom:.5rem;">
                    <div style="font-size:.8rem;font-weight:700;color:var(--accent);margin-bottom:.4rem;">📜 本局事件统计</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem;font-size:.7rem;">
                        <div>🎴 总抽卡次数：<span style="font-weight:700;">${(mono.eventLog||[]).filter(e=>e.type==='card_draw').length}</span></div>
                        <div>🃏 卡牌使用：<span style="font-weight:700;">${(mono.eventLog||[]).filter(e=>e.type==='card_use'||e.type==='card_curse').length}</span></div>
                        <div>🎲 随机事件：<span style="font-weight:700;">${(mono.eventLog||[]).filter(e=>e.type==='event').length}</span></div>
                        <div>💸 惩罚触发：<span style="font-weight:700;">${(mono.eventLog||[]).filter(e=>e.type==='penalty').length}</span></div>
                        <div>💎 奖励触发：<span style="font-weight:700;">${(mono.eventLog||[]).filter(e=>e.type==='bonus').length}</span></div>
                        <div>📊 总事件数：<span style="font-weight:700;">${(mono.eventLog||[]).length}</span></div>
                    </div>
                    <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:.4rem;font-size:.65rem;" onclick="closeModal();showEventLogModal();">📜 查看详细事件记录</button>
                </div>

                <!-- Version Info -->
                <div style="text-align:center;font-size:.65rem;color:var(--text2);padding:.3rem 0;">
                    BunnyBot 大富翁 ${CONFIG.VERSION} | 环形岛屿 · 全功能地产交易 · 智能AI引擎 · 资产清算救济
                </div>

                <button class="btn btn-primary" style="width:100%;margin-top:.5rem;" onclick="closeModal()">关闭</button>
            </div>
        `;
        document.getElementById('modal-overlay').classList.add('show');
    }

    // === BCOS (Bunny OS) — Linux-style OS ===
    // === BCOS (Bunny OS) — Linux-style OS Terminal ===
    const _bcosRepos = [
  ["kissggj123.github.com","\u5154\u53ef\u53ef\u7eaa\u5ff5\u65e5","HTML",0,0,"2026-10-01","https://github.com/kissggj123/kissggj123.github.com",false,165561,"https://so.menglolita.com/"],
  ["Asahi-Steam-M1","\u5728M1\u4e0a\u901a\u8fc7Fedora Asahi Remix\u6e38\u73a9Steam\u6e38\u620f","N/A",1,0,"2026-09-16","https://github.com/kissggj123/Asahi-Steam-M1",false,46,""],
  ["NIO-Dash-iOS","\u851a\u6765\u8f66\u8f86\u770b\u677f \u2014 macOS \u83dc\u5355\u680f\u5e94\u7528\uff0c\u81ea\u52a8\u62c9\u53d6\u8f66\u51b5\u4e0e\u6362\u7535\u8bb0\u5f55","Swift",0,0,"2026-08-31","https://github.com/kissggj123/NIO-Dash-iOS",true,4113,""],
  ["YumikoToys","\u4e00\u6b3e\u73b0\u4ee3\u5316\u7684 macOS \u684c\u9762\u5ba0\u7269\u4e0e AI \u52a9\u624b\u5e94\u7528 | A modern macOS desktop pet & AI assistant app","Swift",0,0,"2026-08-31","https://github.com/kissggj123/YumikoToys",false,63954,""],
  ["kissggj123","A British Angora rabbit breeder","N/A",0,0,"2026-08-03","https://github.com/kissggj123/kissggj123",false,15,""],
  ["poke-tui","\ud83c\udf34 Chat with your Poke AI assistant from the terminal","N/A",0,0,"2026-06-06","https://github.com/kissggj123/poke-tui",true,51,""],
  ["Perler_beads","\u5154\u53ef\u53ef\u7684\u62fc\u8c46\u4e16\u754c - \u62fc\u8c46\u8bbe\u8ba1\u5668","Dart",0,0,"2026-03-28","https://github.com/kissggj123/Perler_beads",false,1997,""],
  ["pv-tool","Automaticly generate kinetic typography","N/A",0,0,"2026-03-28","https://github.com/kissggj123/pv-tool",true,301,"https://pv.pixjam.cn"],
  ["scrcpy-mobile","Ported scrcpy for mobile platforms, to remotely control Android devices on your iPhone or Android phone.","N/A",0,0,"2026-03-25","https://github.com/kissggj123/scrcpy-mobile",true,145847,""],
  ["Puked","\u5410\u69fd\uff0c\u81ea\u52a8\u9a7e\u9a76\u4ea7\u54c1\u7ecf\u7406\u5bf9\u6807\u4e13\u7528 App\uff0c\u8bb0\u5f55\u5404\u79cd\u8d1f\u4f53\u9a8c\u4e8b\u4ef6","Dart",0,0,"2026-03-08","https://github.com/kissggj123/Puked",true,13019,"https://hkgood.github.io/Puked/"],
  ["Puked-Callback","Replay the Json from Puked App","N/A",0,0,"2026-01-20","https://github.com/kissggj123/Puked-Callback",true,8880,""],
  ["Twist","A Light Script For You To Setup Shadowsocks-libev Server with High-Speed Connections","Shell",3,37,"2025-06-10","https://github.com/kissggj123/Twist",false,389,"https://so.menglolita.com"],
  ["XpengDashcamPro","A desktop application designed for viewing Xpeng dashcam footage, with support for integrating and displaying vehicle CAN bus data.","N/A",0,0,"2025-03-16","https://github.com/kissggj123/XpengDashcamPro",true,12582,""],
  ["Ryujinx","Experimental Switch emulator written in C#","C#",0,0,"2025-03-03","https://github.com/kissggj123/Ryujinx",true,1797,""],
  ["WindowTabs-Plus","\u4e00\u4e2a\u53ef\u4ee5\u63d0\u4f9b\u591a\u9009\u9879\u5361\u7684\u6269\u5c55\u5de5\u5177","C#",1,0,"2024-10-08","https://github.com/kissggj123/WindowTabs-Plus",true,82191,""],
  ["open-deepnude","Open source reverse-engineered clone of DeepNude","Python",0,0,"2024-10-02","https://github.com/kissggj123/open-deepnude",true,490,""],
  ["SOSCSRPG","Scott's Open Source C# RPG","C#",0,0,"2024-09-07","https://github.com/kissggj123/SOSCSRPG",true,109,""],
  ["DeepNewdsForAndroid","DeepNudes & deep nudes Android Source Code","Java",0,0,"2024-08-21","https://github.com/kissggj123/DeepNewdsForAndroid",true,76559,""],
  ["whilom","\ud83e\ude84  keep your mac awake even when the lid is closed https://insanj.github.io/whilom/","N/A",0,0,"2024-08-18","https://github.com/kissggj123/whilom",true,10616,"https://insanj.github.io/whilom/"],
  ["yuzu","NS\u81ea\u5236\u7a0b\u5e8f\u6a21\u62df\u5668","C++",0,0,"2024-05-01","https://github.com/kissggj123/yuzu",true,18936,""],
  ["awesome-shizuku","Awesome list of Android apps making use of Shizuku","N/A",0,0,"2023-10-28","https://github.com/kissggj123/awesome-shizuku",true,114,""],
  ["wysiwyg.js","wysiwyg contenteditable editor (lightweight + cross browser)","JavaScript",0,0,"2023-10-02","https://github.com/kissggj123/wysiwyg.js",true,1053,"http://wysiwygjs.github.io/"],
  ["hackp5g9","\u672c\u9879\u76ee\u53ef\u4ee5\u5e2e\u52a9\u5c0f\u9e4fP5\u548c\u5c0f\u9e4fG9\u5f00\u542fadb\u548c\u7f51\u7edcadb","N/A",0,0,"2023-09-09","https://github.com/kissggj123/hackp5g9",true,262,""],
  ["ArcPy-multiexport","The tool is an automated multi-process image export tool implemented using the built-in ArcPy library provided by ArcGIS","Python",0,0,"2023-09-02","https://github.com/kissggj123/ArcPy-multiexport",false,39,""],
  ["YumikoToys-MTMR","MTMR\u89c4\u5219","N/A",0,0,"2023-06-10","https://github.com/kissggj123/YumikoToys-MTMR",false,926,""],
  ["Dress","\u597d\u8036  \u662f\u5973\u88c5","Ruby",0,0,"2023-02-25","https://github.com/kissggj123/Dress",true,907127,""],
  ["YumikoToys-Lite","\u4e00\u4e2aWindows&macOS\u5408\u76d6\u4e0d\u4f11\u7720\u5de5\u5177","C#",0,0,"2023-01-18","https://github.com/kissggj123/YumikoToys-Lite",false,37551,""],
  ["NXPlay","Multimedia player for Nintendo Switch (audio only, video soon)","C++",0,0,"2022-12-06","https://github.com/kissggj123/NXPlay",true,1695,""],
  ["YumikoToys-Browser","A lightweight Android browser with modern navigation","N/A",0,0,"2022-08-10","https://github.com/kissggj123/YumikoToys-Browser",true,15272,"http://acrdevelopment.org"],
  ["holoiso","SteamOS 3 (Holo) archiso configuration","N/A",1,0,"2022-05-04","https://github.com/kissggj123/holoiso",true,106,""],
  ["TidGi-Desktop","TidGi is an privatcy-in-mind, automated, auto-git-backup, freely-deployed Tiddlywiki knowledgement Desktop app, with local REST API. \u300c \u592a\u8bb0 \u300d\u662f\u4e00\u4e2a\u57fa\u4e8e\u300c \u592a\u5fae TiddlyWiki \u300d\u7684\u77e5\u8bc6\u7ba1\u7406\u684c\u9762\u5e94\u7528\uff0c\u80fd\u4fdd\u62a4\u9690\u79c1\u5185\u5bb9\u3001\u9ad8\u7ea7\u81ea\u52a8\u5316\u3001\u81ea\u52a8Git\u4e91\u5907\u4efd\u3001\u90e8\u7f72\u4e3a\u535a\u5ba2\uff0c\u4e14\u53ef\u901a\u8fc7RESTAPI\u4e0eAnki\u7b49\u5e94\u7528\u8fde\u63a5\u3002\uff08\u8fed\u4ee3\u5f00\u53d1\u4e2d\u6b22\u8fce\u8bd5\u7528\uff0c\u5f00\u53d1\u8fdb\u5ea6\u89c1\u4e0b\u65b9\u94fe\u63a5\uff09(Under active development, see website below for details) ","N/A",0,0,"2022-03-23","https://github.com/kissggj123/TidGi-Desktop",true,45943,"https://github.com/tiddly-gittly/TidGi-Desktop/projects"],
  ["Rules","Rules / \u89c4\u5219\uff1aSurge / Shadowrocket / Quantumult","N/A",0,0,"2022-01-25","https://github.com/kissggj123/Rules",true,4974,""],
  ["fullstack","React/ApolloGraphQL/Node/Mongo demo written in Typescript","TypeScript",0,0,"2021-11-15","https://github.com/kissggj123/fullstack",true,1242,""],
  ["Twist-v2","A light script for you to setup shadowsocks-libev server with high-speed connections and newest powerful features","N/A",0,0,"2021-11-12","https://github.com/kissggj123/Twist-v2",true,96,"https://unbinilium.github.io/Twist"],
  ["UGame","A launcher made to compile all of my games in one place, keep a collection of them all, and launch those on PC!","C#",0,0,"2021-08-23","https://github.com/kissggj123/UGame",false,53118,""],
  ["Touch-Bar-Visualizer","A music visualizer created to run on the touch bar of a mac computer.","N/A",0,0,"2021-07-29","https://github.com/kissggj123/Touch-Bar-Visualizer",true,3890,""],
  ["MTMR-presets","\ud83d\udc88 [My TouchBar My rules] Share your preset!","N/A",0,0,"2021-07-26","https://github.com/kissggj123/MTMR-presets",true,8208,"https://github.com/toxblh/mtmr"],
  ["PowerScheme","This app allows you to quickly select power plans. If you need to restore the default settings for power schemes.","N/A",0,0,"2021-07-06","https://github.com/kissggj123/PowerScheme",true,251,""],
  ["PowerSwitcher","Power plan switcher for Windows 10. Heavily inspired by EarTrumpet.","N/A",0,0,"2021-07-02","https://github.com/kissggj123/PowerSwitcher",true,13242,""],
  ["vMixUTC","Customizable controller for vMix","N/A",0,0,"2021-06-17","https://github.com/kissggj123/vMixUTC",true,18343,""],
  ["surface-pro-7-opencore","A proposal OpenCore configuration for run macOS on Surface Pro 7","N/A",0,0,"2021-06-13","https://github.com/kissggj123/surface-pro-7-opencore",true,90362,""],
  ["surfacepro7-oc","surfacepro7-hackintosh","N/A",0,0,"2021-06-13","https://github.com/kissggj123/surfacepro7-oc",true,16320,""],
  ["jd-base","","JavaScript",0,0,"2021-06-04","https://github.com/kissggj123/jd-base",true,448,""],
  ["EdgeWebBrowser","Experimental C# Windows Forms WebBrowser based on Edge","N/A",0,0,"2021-05-19","https://github.com/kissggj123/EdgeWebBrowser",true,396,""],
  ["Funkin","","N/A",0,0,"2021-05-18","https://github.com/kissggj123/Funkin",true,473144,""],
  ["YumikoAnime","\u57fa\u4e8eairAnime\u5f00\u6e90\u9879\u76ee\u505a\u7684\u6570\u636e\u66f4\u65b0\u5de5\u5177","C#",2,0,"2021-05-11","https://github.com/kissggj123/YumikoAnime",false,23018,""],
  ["New_JD-FreeFuck-Fix","github_SuperManito_JD-FreeFuck","Shell",0,0,"2021-04-25","https://github.com/kissggj123/New_JD-FreeFuck-Fix",true,25080,""],
  ["JD-FreeFuck-Fix","\u300aJD\u8585\u7f8a\u6bdb\u300b\u4e00\u952e\u90e8\u7f72 For Linux","Shell",0,0,"2021-04-24","https://github.com/kissggj123/JD-FreeFuck-Fix",true,25551,"https://github.com/kissggj123/JD-FreeFuck"],
  ["OpenWrt-AC1750","","Shell",0,0,"2021-04-14","https://github.com/kissggj123/OpenWrt-AC1750",false,5,""],
  ["SteamTools","  \u300cSteam++\u300d\u662f\u4e00\u4e2a\u5305\u542b\u591a\u79cdSteam\u5de5\u5177\u529f\u80fd\u7684\u5de5\u5177\u7bb1\u3002","N/A",0,0,"2021-02-20","https://github.com/kissggj123/SteamTools",true,10344,""],
  ["one_click_script","\u4e00\u952e\u5b89\u88c5 trojan v2ray xray. Install v2ray / xray (VLESS) and trojan (trojan-go) script","N/A",0,0,"2021-02-16","https://github.com/kissggj123/one_click_script",true,369054,""],
  ["fancyss_history_package","\u79d1\u5b66\u4e0a\u7f51\u63d2\u4ef6\u7684\u79bb\u7ebf\u5b89\u88c5\u5305\u50a8\u5b58\u5728\u8fd9\u91cc","N/A",0,0,"2021-02-14","https://github.com/kissggj123/fancyss_history_package",true,1938832,""],
  ["qqrobot","","N/A",0,0,"2021-01-26","https://github.com/kissggj123/qqrobot",false,2587,""],
  ["DesignerProtect","autosave and backup photoshop,sai,sa2 editing files.photoshop backup,sai backup","N/A",0,0,"2020-10-22","https://github.com/kissggj123/DesignerProtect",true,8658,""],
  ["spotify-downloader","Download Spotify playlists with albumart and meta-tags","Python",0,0,"2020-09-29","https://github.com/kissggj123/spotify-downloader",true,286,""],
  ["MenglolitaHost","\u4fee\u6539Host\u7684\u5c0f\u5de5\u5177","C#",8,6,"2020-09-09","https://github.com/kissggj123/MenglolitaHost",false,67392,""],
  ["Panda-Learning","\u5b66\u4e60\u5f3a\u56fd xuexiqiangguo  \u5168\u7f51\u6700\u597d\u7528\u5b66\u4e60\u5f3a\u56fd\u52a9\u624b\uff1aPanda_Learning \u840c\u840c\u7684\u718a\u732b\u5e2e\u4f60\u641e\u5b9a\u5b66\u4e60\u5f3a\u56fd","N/A",0,0,"2020-09-08","https://github.com/kissggj123/Panda-Learning",true,838500,""],
  ["wangEditor","wangEditor \u2014\u2014 \u8f7b\u91cf\u7ea7web\u5bcc\u6587\u672c\u6846","JavaScript",0,0,"2020-09-08","https://github.com/kissggj123/wangEditor",true,12673,"http://wangEditor.github.io/"],
  ["MoRecall","\u4e00\u4e2a\u652f\u6301QQ/TIM\u64a4\u56de\u7684\u7a0b\u5e8f","C#",3,0,"2020-08-02","https://github.com/kissggj123/MoRecall",false,54518,""],
  ["UTM","Virtual machines for iOS","N/A",0,0,"2020-07-02","https://github.com/kissggj123/UTM",true,1939,"https://getutm.app"],
  ["big-sur-plz","","N/A",0,0,"2020-06-24","https://github.com/kissggj123/big-sur-plz",true,3,""],
  ["macOS-BigSur-Patcher","macOS Big Sur Patcher ","Objective-C",0,0,"2020-06-23","https://github.com/kissggj123/macOS-BigSur-Patcher",true,190611,"https://so.menglolita.com"],
  ["PowerToys","Windows system utilities to maximize productivity","N/A",0,0,"2020-06-08","https://github.com/kissggj123/PowerToys",true,204446,""],
  ["Wapp","\u5fae\u4fe1\u7b54\u9898\u5c0f\u7a0b\u5e8f\uff0c\u53ef\u7528\u4e8e\u5185\u90e8\u8003\u6838\uff0c\u8003\u8bd5\u9884\u7ea6\uff0c\u5185\u90e8\u8bc4\u5206\u7b49\uff0c\u4f7f\u7528\u5c0f\u7a0b\u5e8f\u81ea\u5e26\u4e91\u73af\u5883","N/A",0,0,"2020-05-18","https://github.com/kissggj123/Wapp",true,1441,""],
  ["ArchWSL","ArchLinux as a WSL Instance. Supports multiple install.","N/A",0,0,"2020-04-28","https://github.com/kissggj123/ArchWSL",true,274,"https://git.io/archwsl"],
  ["Sandboxie","Open Source Sandboxie","N/A",0,0,"2020-04-16","https://github.com/kissggj123/Sandboxie",true,2462,""],
  ["saigon","iOS 10.2.1 Jailbreak?","C",0,0,"2020-03-21","https://github.com/kissggj123/saigon",true,8855,""],
  ["sandcastle-buildroot","Buildroot for Sandcastle.","N/A",0,0,"2020-03-09","https://github.com/kissggj123/sandcastle-buildroot",true,105907,""],
  ["projectsandcastle","Supporting tools for Android/Linux on the iPhone","N/A",0,0,"2020-03-06","https://github.com/kissggj123/projectsandcastle",true,29080,""],
  ["Tensorflow2-Tutorial","Tensorflow 2.0 toy examples","N/A",0,0,"2020-02-29","https://github.com/kissggj123/Tensorflow2-Tutorial",true,11,""],
  ["VirusBroadcast","A java virus broadcast simulation","N/A",0,0,"2020-02-07","https://github.com/kissggj123/VirusBroadcast",true,61,""],
  ["0","","N/A",0,0,"2020-01-16","https://github.com/kissggj123/0",true,426,""],
  ["Hippy","A cross platform framework designed for Web developer. Introduction video - https://v.qq.com/x/page/i3038urj2mt.html","N/A",0,0,"2019-12-30","https://github.com/kissggj123/Hippy",true,59922,""],
  ["Downloader","A library for resuming and multi-part/multi-threaded downloads in .NET written in C#","N/A",0,0,"2019-12-18","https://github.com/kissggj123/Downloader",true,519,""],
  ["evil-huawei","Evil Huawei - \u534e\u4e3a\u4f5c\u8fc7\u7684\u6076","N/A",0,0,"2019-12-06","https://github.com/kissggj123/evil-huawei",true,14672,"https://evil-huawei.github.io/evil-huawei/"],
  ["EpicSurvivalGameSeries","Third-person Survival Game for Unreal Engine 4.","N/A",0,0,"2019-12-03","https://github.com/kissggj123/EpicSurvivalGameSeries",true,1359805,"https://www.tomlooman.com/survival-sample-game-for-ue4/"],
  ["monopoly","A realtime multiplayer javascript-based monopoly game","N/A",0,0,"2019-11-20","https://github.com/kissggj123/monopoly",true,32189,""],
  ["rpg","Online Role Playing Game (based on Laravel 5)","N/A",0,0,"2019-11-20","https://github.com/kissggj123/rpg",true,3123,""],
  ["cockpit","Add content management functionality to any site - plug & play / headless / api-first CMS","N/A",0,0,"2019-11-18","https://github.com/kissggj123/cockpit",true,22041,"http://getcockpit.com"],
  ["ScreenToGif","\ud83c\udfac ScreenToGif allows you to record a selected area of your screen, edit and save it as a gif or video.","N/A",0,0,"2019-11-08","https://github.com/kissggj123/ScreenToGif",true,16842,"http://www.screentogif.com"],
  ["iptv","\u770bHBO\u76f4\u64ad + \u96c6\u5404\u5e7f\u7535\u76f4\u64ad\u6e90 + \u4e00\u952e\u7ba1\u7406 IPTV \u76f4\u64ad\u9891\u9053\u811a\u672c mpeg ts => hls","N/A",0,0,"2019-11-06","https://github.com/kissggj123/iptv",true,1960,""],
  ["AutoGetFeaturesCefSharpBrowserDesktopPC",":1st_place_medal: :new:  :zap:   :+1:   :cn: Chinese + :egypt: Egypt | Example Custom Windows Desktop PC for Project Supported  C# ( CefSharp Web Browser )  More CefSharp Version Auto Get Fast Chromium Web Browser (http://createbrowser.github.io/)","N/A",0,0,"2019-10-31","https://github.com/kissggj123/AutoGetFeaturesCefSharpBrowserDesktopPC",true,30123,"https://createbrowser.github.io/AutoGetFeaturesCefSharpBrowserDesktopPC/PayPal.html"],
  ["WristBilibili","\u8155\u4e0a\u54d4\u54e9 \u5728\u667a\u80fd\u624b\u8868\u4e0a\u96c6\u6210\u4e00\u4e2a\u6709\u7b80\u5355\u529f\u80fd\u7684\u54d4\u54e9\u54d4\u54e9/bilibili/b\u7ad9\u5ba2\u6237\u7aef","N/A",0,0,"2019-10-31","https://github.com/kissggj123/WristBilibili",true,2974,"https://luern0313.cn"],
  ["ipwndfu","open-source jailbreaking tool for many iOS devices","N/A",0,0,"2019-09-30","https://github.com/kissggj123/ipwndfu",true,1892,""],
  ["MOBS","\u4e00\u6b3e\u57fa\u4e8eChromium\u5f00\u53d1\u7684\u8f7b\u4fbf\u6d4f\u89c8\u5668","C#",4,0,"2019-08-27","https://github.com/kissggj123/MOBS",false,41717,""],
  ["Notepads","A modern, stylish text editor with minimum design.","C#",0,0,"2019-08-21","https://github.com/kissggj123/Notepads",true,19564,""],
  ["search","\u4e00\u4e2a\u7cbe\u7f8e\u7684\u6d4f\u89c8\u5668\u4e3b\u9875\uff0c\u641c\u7d22\u5f15\u64ce\u91c7\u7528\u5fc5\u5e94\uff0c\u641c\u7d22\u5efa\u8bae\u7531\u795e\u9a6c\u641c\u7d22\u63d0\u4f9b","HTML",0,0,"2019-07-23","https://github.com/kissggj123/search",true,2556,""],
  ["sou","\u7b80\u5355\u641c\u7d22\u2014\u2014\u7528\u60ef\u4e86\u5404\u79cd\u5bfc\u822a\u9996\u9875\uff0c\u6ee1\u5c4f\u5e55\u5c3d\u662f\u5404\u79cd\u4e0d\u538c\u5176\u70e6\u7684\u5e7f\u544a\u548c\u8d44\u8baf\uff1b\u5c1d\u8bd5\u81ea\u5df1\u5199\u4e2a\u81ea\u5df1\u7684\u4e3b\u9875\uff0c\u8fd9\u5df2\u7ecf\u662f\u7b2c\u56db\u7248\u4e86\u3002","PHP",0,0,"2019-07-03","https://github.com/kissggj123/sou",true,2144,"https://5iux.cn/"],
  ["onedrive-sample-apibrowser-dotnet","OneDrive API Browser Sample for Desktop","C#",0,0,"2019-06-19","https://github.com/kissggj123/onedrive-sample-apibrowser-dotnet",true,72,""],
  ["Gta-5-in-Unity","Gta 5 made in Unity","ASP",0,0,"2019-06-06","https://github.com/kissggj123/Gta-5-in-Unity",true,108780,"https://nickwasused.com"],
  ["Java-RPG-Maker-MV-Decrypter","You can decrypt whole RPG-Maker MV Directories with this Program, it also has a GUI.","Java",0,0,"2019-05-05","https://github.com/kissggj123/Java-RPG-Maker-MV-Decrypter",true,311,""],
  ["TalesOfEvilSword_Finished","\u4e00\u6b3e\u7531Unity 3D\u5236\u4f5c\u7684ARPG\u7684\u52a8\u4f5c\u7c7b\u6e38\u620f","C#",0,0,"2019-04-26","https://github.com/kissggj123/TalesOfEvilSword_Finished",true,206819,""],
  ["DarkSouls_Work","\uff3bUnity\uff3d\u300a\u9ed1\u6697\u4e4b\u9b42\u300b\u590d\u523b\u9879\u76ee","C#",0,1,"2019-04-26","https://github.com/kissggj123/DarkSouls_Work",false,47163,""],
  ["DarkSoul","\u6a21\u4eff\u9ed1\u9b42","C#",0,0,"2019-04-26","https://github.com/kissggj123/DarkSoul",true,272461,""],
  ["RunGame","\u8dd1\u9177\u6e38\u620f\uff0c\u57fa\u4e8e\u865a\u5e7bC++\u5f00\u53d1\uff0c\u6b63\u5728\u5236\u4f5c\u3002\u3002\u3002","C++",0,0,"2019-04-26","https://github.com/kissggj123/RunGame",true,213,""],
  ["ARPG","\u865a\u5e7b\u9879\u76ee","C++",0,0,"2019-04-26","https://github.com/kissggj123/ARPG",true,54432,""],
  ["UnityDarkSourceCopy","Unity\u4eff\u9ed1\u9b42","C#",0,0,"2019-04-26","https://github.com/kissggj123/UnityDarkSourceCopy",true,78503,""],
  ["Unity3DTraining","Unity3D\u7684\u7ec3\u4e60\u9879\u76ee","C#",0,0,"2019-04-26","https://github.com/kissggj123/Unity3DTraining",true,742531,""],
  ["scigen","An automatic paper generator","TeX",0,0,"2019-04-24","https://github.com/kissggj123/scigen",true,622,""],
  ["huginn","Create agents that monitor and act on your behalf.  Your agents are standing by!","Ruby",0,0,"2019-04-24","https://github.com/kissggj123/huginn",true,7647,""],
  ["weibo-rss","\u628a\u67d0\u4eba\u7684\u5fae\u535a\u8f6c\u6362\u4e3aRSS Feed","JavaScript",0,0,"2019-04-24","https://github.com/kissggj123/weibo-rss",true,117,"https://api.izgq.net/weibo/"],
  ["weibo2linenotify","\u8ddf\u670b\u53cb\u9592\u804a\u5f8c\u8a66\u8457\u505a\u505a\u770b\u7684\u529f\u80fd\uff0c\u8b80\u53d6\u5fae\u535a\u7684RSS\uff0c\u900f\u904eLineNotify\u670d\u52d9\u8ffd\u8e64","PHP",0,0,"2019-04-24","https://github.com/kissggj123/weibo2linenotify",true,31,""],
  ["DesktopBridgeToUWP-Samples","This repo contains the samples that demonstrate the usage patterns for the Desktop Conversion extensions.","N/A",0,0,"2019-04-23","https://github.com/kissggj123/DesktopBridgeToUWP-Samples",true,61262,""],
  ["Windows-appsample-rssreader","An RSS aggregator sample for the Universal Windows Platform.","C#",0,0,"2019-04-23","https://github.com/kissggj123/Windows-appsample-rssreader",true,652,""],
  ["bnetlauncher","Launcher utility to help start battle.net games with the steam overlay.","C#",0,0,"2019-04-22","https://github.com/kissggj123/bnetlauncher",true,343,"http://madalien.com/stuff/bnetlauncher/"],
  ["Playnite","Open source video game library manager with support for 3rd party libraries like Steam, GOG, Origin, Battle.net and Uplay. Including game emulation support, providing one unified interface for your games.","C#",0,0,"2019-04-22","https://github.com/kissggj123/Playnite",true,34246,"https://playnite.link"],
  ["go-bilibili","\u54d4\u54e9\u54d4\u54e9 bilibili \u7f51\u7ad9\u540e\u53f0\u5de5\u7a0b \u6e90\u7801","Go",0,0,"2019-04-22","https://github.com/kissggj123/go-bilibili",true,0,""],
  ["ss-panel-v3-mod_Uim","\u57fa\u4e8ess-panel-v3-mod\u7684 UI \u4fee\u6539\u7248","Smarty",0,0,"2019-04-04","https://github.com/kissggj123/ss-panel-v3-mod_Uim",true,65029,""],
  ["xstyle","A declarative, reactive framework that extends CSS","JavaScript",0,0,"2019-04-04","https://github.com/kissggj123/xstyle",true,1246,"http://kriszyp.github.com/xstyle"],
  ["bilibili-helper","\u54d4\u54e9\u54d4\u54e9 (bilibili.com) \u8f85\u52a9\u5de5\u5177\uff0c\u53ef\u4ee5\u66ff\u6362\u64ad\u653e\u5668\u3001\u53bb\u5e7f\u544a\u3001\u63a8\u9001\u901a\u77e5\u5e76\u8fdb\u884c\u4e00\u4e9b\u5feb\u6377\u64cd\u4f5c","JavaScript",0,0,"2019-04-03","https://github.com/kissggj123/bilibili-helper",true,9245,"https://bilibili-helper.github.io"],
  ["bye-flash-hello-html5","\u5929\u671d\u67d0\u4e9b\u89c6\u9891\u7f51\u7ad9\u4f7f\u7528HTML5\u64ad\u653e\u89c6\u9891\u7684\u6cb9\u7334\u811a\u672c","JavaScript",0,0,"2019-03-28","https://github.com/kissggj123/bye-flash-hello-html5",true,37,"https://greasyfork.org/zh-CN/scripts/30879-bye-flash-hello-html5-%E5%86%8D%E8%A7%81flash-%E4%BD%A0%E5%A5%BDhtml5"],
  ["ChromeAppHeroes","\ud83c\udf08Chrome\u63d2\u4ef6\u82f1\u96c4\u699c, \u4e3a\u4f18\u79c0\u7684Chrome\u63d2\u4ef6\u5199\u4e00\u672c\u4e2d\u6587\u8bf4\u660e\u4e66, \u8ba9Chrome\u63d2\u4ef6\u82f1\u96c4\u4eec\u9020\u798f\u4eba\u7c7b~  ChromePluginHeroes, Write a Chinese manual for the excellent Chrome plugin, let the Chrome plugin heroes benefit the human~","Python",0,0,"2019-03-28","https://github.com/kissggj123/ChromeAppHeroes",true,23813,"https://zhaoolee.gitbooks.io/chrome/content/"],
  ["DMSkin-for-WPF","WPF Borderless Window | Custom Controls & Styles | MVVM Support","C#",0,0,"2019-03-16","https://github.com/kissggj123/DMSkin-for-WPF",true,56264,"http://www.dmskin.com"],
  ["DMSkin-CloudMusic","\u7f51\u6613\u4e91\u97f3\u4e50-\u7528WPF\u6765\u505a\u7f51\u6613\u4e91\u97f3\u4e50\u5ba2\u6237\u7aef\u4f1a\u600e\u4e48\u6837?","C#",0,0,"2019-03-16","https://github.com/kissggj123/DMSkin-CloudMusic",true,4947,""],
  ["bilimini","\u85cf\u8d77\u6765\uff01\u54d4\u54e9\u54d4\u54e9","JavaScript",0,0,"2019-03-06","https://github.com/kissggj123/bilimini",true,3423,""],
  ["spring12","\u6625\u8282\u5341\u4e8c\u54cd","C",0,0,"2019-03-02","https://github.com/kissggj123/spring12",true,18,""],
  ["RSSHub","\ud83c\udf70 \u4e07\u7269\u7686\u53ef RSS","JavaScript",0,0,"2019-03-01","https://github.com/kissggj123/RSSHub",true,4858,"https://docs.rsshub.app"],
  ["Love-Bangumi","\u4e00\u4e2a\u53ef\u4ee5\u8ba9\u4f60\u53ef\u4ee5\u66f4\u52a0\u79d1\u5b66\u5730\u8865\u756a\u7684\u8f6f\u4ef6\u3002/ A software which can be used to watch bangumi more comfortably.","C#",0,0,"2019-03-01","https://github.com/kissggj123/Love-Bangumi",true,6280,"https://wuhan5.cc/love-bangumi/"],
  ["irreader","irreader \u7f51\u7a7a\u9605\u8bfb\u5668\uff0c\u8ba2\u9605\u4f60\u7684\u8ba2\u9605\u3002","HTML",0,0,"2019-03-01","https://github.com/kissggj123/irreader",true,25938,"http://irreader.netqon.com"],
  ["bilibili2rss","\u5229\u7528 RSS \u8ba2\u9605 B \u7ad9 UP\u4e3b","PHP",0,0,"2019-03-01","https://github.com/kissggj123/bilibili2rss",true,4,""],
  ["bangumi-data","Raw data for Japanese Anime","JavaScript",0,0,"2019-03-01","https://github.com/kissggj123/bangumi-data",true,6032,""],
  ["bangumi-list","\u5927\u9646\u7248\u6743\u65b0\u756a\u64ad\u653e\u5730\u5740\u805a\u5408\u7ad9 V2","JavaScript",0,0,"2019-03-01","https://github.com/kissggj123/bangumi-list",true,959,"http://bgmlist.com/"],
  ["GirlDress","\u770b\u5230\u5973\u88c5\u7684\u9879\u76ee\u7684issue\u5efa\u8bae\u59b9\u5b50\u5efa\u4e00\u4e2a\u7537\u88c5\u7684\u9879\u76ee\uff0c\u4f46\u662f\u8003\u8651\u5230github\u7684\u5973\u6027\u7528\u6237 \u6570\u91cf\u8c8c\u4f3c\u5e76\u4e0d\u80fd\u8fbe\u5230\u5973\u88c5\u7684\u6548\u679c2333\u603b\u4e4b\u5148\u5efa\u4e00\u4e2a\u3002","N/A",0,0,"2019-02-24","https://github.com/kissggj123/GirlDress",true,14836,""],
  ["Story-for-Typecho","Typecho Theme Story - \u7231\u4e0a\u4f60\u6211\u7684\u6545\u4e8b","PHP",0,0,"2019-02-21","https://github.com/kissggj123/Story-for-Typecho",true,114,"https://yumoe.com/"],
  ["airAnime","\u4e00\u6b3e\u4e0d\u9519\u7684\u8f7b\u91cf\u5316\u96c6\u5408\u756a\u5267\u641c\u7d22\u7a0b\u5e8f\uff0c\u57fa\u4e8e PHP 7.0+","PHP",0,0,"2019-02-21","https://github.com/kissggj123/airAnime",true,5484,"http://airanime.applinzi.com/"],
  ["Moricolor-for-Typecho","Typecho Theme Moricolor - \u68ee\u4e4b\u8272","JavaScript",0,0,"2019-02-21","https://github.com/kissggj123/Moricolor-for-Typecho",true,2387,"https://null.yumoe.com/2-0/"],
  ["meidou","\u6a31\u82b1\u5e84\u7684\u5ba0\u7269\u5973\u5b69AI\u5973\u4ec6\u9171\u5b9e\u4f53\u5316\uff0c\u5973\u4ec6\u59b9\u6296\u9171\uff0c\u7f8e\u8c46\u9171\uff0c\u6682\u65f6\u7684\u76ee\u6807\u662f\u684c\u9762\u52a9\u624b","Python",0,0,"2019-02-18","https://github.com/kissggj123/meidou",true,8616,""],
  ["Musish","Apple Music...ish ","JavaScript",0,0,"2019-01-29","https://github.com/kissggj123/Musish",true,4593,"https://musi.sh"],
  ["USBCopyer","\ud83d\ude09 \u7528\u4e8e\u5728\u63d2\u4e0aU\u76d8\u540e\u81ea\u52a8\u6309\u9700\u590d\u5236\u8be5U\u76d8\u7684\u6587\u4ef6\u3002\u201d\u5907\u4efd&\u5077U\u76d8\u6587\u4ef6\u7684\u795e\u5668\u201d\uff08\u5199\u4f5cUSBCopyer\uff0c\u8bfb\u4f5cUSBCopier\uff09","C#",0,0,"2019-01-21","https://github.com/kissggj123/USBCopyer",true,2245,"https://kenvix.com/post/usbcopyer/"],
  ["Mosaic","\u7528\u591a\u5f20\u5c0f\u56fe\u6784\u6210\u5927\u56fe\uff0c\u6bcf\u4e2a\u5c0f\u56fe\u4f5c\u4e3a\u5927\u56fe\u7684\u67d0\u4e2a\u50cf\u7d20\u70b9\u3002\u6700\u540e\u5f62\u6210\u4e00\u79cd\u9a6c\u8d5b\u514b\u7684\u6548\u679c(\u6216\u8005\u8bf4\u662f\u8499\u592a\u5947\u6548\u679c?)","MATLAB",0,0,"2019-01-12","https://github.com/kissggj123/Mosaic",true,13662,""],
  ["-Hidden-Tear","\u5168\u7403\u9996\u6b3e\u5f00\u6e90\u52d2\u7d22\u8f6f\u4ef6-\u2013-Hidden-Tear","C#",1,0,"2019-01-01","https://github.com/kissggj123/-Hidden-Tear",true,270,""],
  ["Darkest-Dungeon-Unity","Darkest Dungeon port in Unity. Almost completely identical to the original. Platforms: PC/Android.","C#",0,0,"2018-12-26","https://github.com/kissggj123/Darkest-Dungeon-Unity",true,184227,""],
  ["UE4Cleaner","\u865a\u5e7b4\u6e05\u7406\u7f13\u5b58\u7684\u5c0f\u5de5\u5177","C#",0,0,"2018-09-25","https://github.com/kissggj123/UE4Cleaner",false,398,""],
  ["TegraRcmGUI","C++ GUI for TegraRcmSmash (payload loader for Nintendo Switch)","C++",0,0,"2018-09-02","https://github.com/kissggj123/TegraRcmGUI",true,583,""],
  ["NSPower","NSPower - Switch title installer/manager (evolution of eNXhop)","C++",0,0,"2018-08-03","https://github.com/kissggj123/NSPower",true,189,""],
  ["ReiNX","WIP modular Switch custom firmware","C",0,0,"2018-07-31","https://github.com/kissggj123/ReiNX",true,991,""],
  ["DNSset-win","DNS\u8bbe\u7f6e\u5de5\u5177 \u5c1d\u8bd5\u652f\u6301\u4e86dnscrypt","C#",0,0,"2018-07-30","https://github.com/kissggj123/DNSset-win",false,1082,""],
  ["MagiskManager","Companion Android application for Magisk","Java",0,0,"2018-07-30","https://github.com/kissggj123/MagiskManager",true,8594,""],
  ["hekate","Nintendo Switch Bootloader - CTCaer mod","C",0,0,"2018-07-24","https://github.com/kissggj123/hekate",true,1053,""],
  ["dns-over-tls","Quick DNS-over-TLS Proxy prototype using C# / .NET Core / .NET Framework / UWP / Windows Services","C#",0,0,"2018-07-16","https://github.com/kissggj123/dns-over-tls",true,100,""],
  ["dnscrypt-win-client","Windows front end for DNSCrypt Proxy","C#",0,0,"2018-07-16","https://github.com/kissggj123/dnscrypt-win-client",true,1843,""],
  ["reactos","A free Windows-compatible Operating System","C",0,0,"2018-07-14","https://github.com/kissggj123/reactos",true,457733,""],
  ["Pinguy-Builder","Tool to remaster *buntu systems","Python",0,0,"2018-07-14","https://github.com/kissggj123/Pinguy-Builder",true,126745,""],
  ["Offline-PS4-Remote-Play","Enjoy playing on your PS4 from your computer (WLAN/Ad-hoc) without the need of an Internet connection.","C#",0,0,"2018-06-24","https://github.com/kissggj123/Offline-PS4-Remote-Play",true,1290,""],
  ["Starup-Game-Python","\u6587\u5b57\u5192\u9669\u6e38\u620f\uff1a\u5357\u5c71\u542f\u793a\u5f55","Python",0,0,"2018-05-19","https://github.com/kissggj123/Starup-Game-Python",true,14,""],
  ["WinHtmlEditor","one html editor for winform(.net)","C#",0,0,"2018-05-08","https://github.com/kissggj123/WinHtmlEditor",true,5797,"http://tewuapple.github.io/WinHtmlEditor/"],
  ["markdown-here","Google Chrome, Firefox, and Thunderbird extension that lets you write email in Markdown and render it before sending.","JavaScript",0,0,"2018-05-08","https://github.com/kissggj123/markdown-here",true,16142,"http://markdown-here.com"],
  ["Edi","Edi - The open source text editor IDE based on AvalonDock and AvalonEdit","C#",0,0,"2018-04-26","https://github.com/kissggj123/Edi",true,14831,"https://dirkster99.github.io/Edi/"],
  ["Edi-Setup","Holds all necessary files to build a setup via WiX Toolset","Batchfile",0,0,"2018-04-26","https://github.com/kissggj123/Edi-Setup",true,6523,""],
  ["ChaturbateRecorder","","Python",0,0,"2018-04-23","https://github.com/kissggj123/ChaturbateRecorder",true,22,""],
  ["VoiceControlAssistant","\u8bed\u97f3\u63a7\u5236\u2014\u2014\u201c\u7ed9\u6211\u64ad\u653e\u70b9\u97f3\u4e50\u201d\uff0c\u201c\u7ea2\u70e7\u9c7c\u600e\u4e48\u505a\u201d\uff0c\u201c\u4eca\u5929\u5929\u6c14\u600e\u4e48\u6837\u201d\uff0c\u201c\u6253\u5f00\u6dd8\u5b9d\u201d\uff0c\u201c\u4eca\u665a11\u70b9\u5e2e\u6211\u5173\u7535\u8111\u201d","C#",0,0,"2018-03-21","https://github.com/kissggj123/VoiceControlAssistant",true,274,""],
  ["WiFi-Assistant","\u7528\u81ea\u5e26\u65e0\u7ebf\u7f51\u5361\u5171\u4eabWiFi\u7684\u5de5\u5177\uff0c\u62e5\u6709\u5b9a\u65f6\u5173\u673a\u529f\u80fd","C++",0,2,"2018-03-12","https://github.com/kissggj123/WiFi-Assistant",false,40320,""],
  ["mastodon","Your self-hosted, globally interconnected microblogging community","Ruby",0,0,"2018-03-02","https://github.com/kissggj123/mastodon",true,55088,"https://joinmastodon.org"],
  ["ZeroNet","ZeroNet - Decentralized websites using Bitcoin crypto and BitTorrent network","Python",0,0,"2018-03-02","https://github.com/kissggj123/ZeroNet",true,9468,"https://zeronet.io"],
  ["pegaswitch","PegaSwitch is an exploit toolkit for the Nintendo Switch","JavaScript",0,0,"2017-11-22","https://github.com/kissggj123/pegaswitch",true,1372,"https://pegaswit.ch/"],
  ["libtransistor","Open source toolchain for Switch development","C++",0,0,"2017-11-22","https://github.com/kissggj123/libtransistor",true,203,""],
  ["SharpBrowser","A full featured web-browser built using C# and CefSharp","C#",0,0,"2017-10-18","https://github.com/kissggj123/SharpBrowser",true,66233,""],
  ["XposedInstaller","Materialised Xposed Installer","Java",0,0,"2017-10-09","https://github.com/kissggj123/XposedInstaller",true,17887,""],
  ["1-2-Switch","1-2-Switch recreation project using Microsoft Small Basic.","N/A",0,0,"2017-09-26","https://github.com/kissggj123/1-2-Switch",true,170,""],
  ["savegame-editors","A compilation of console savegame editors made with HTML5 technologies.","JavaScript",0,0,"2017-09-19","https://github.com/kissggj123/savegame-editors",true,5077,"http://www.marcrobledo.com/savegame-editors/"],
  ["arcore-android-sdk","Google ARCore SDK for Android","N/A",0,0,"2017-08-31","https://github.com/kissggj123/arcore-android-sdk",true,831,"https://developers.google.com/ar"],
  ["CageTheUnicorn","Debugging/emulating environment for Switch code","Python",0,0,"2017-08-21","https://github.com/kissggj123/CageTheUnicorn",true,473,""],
  ["shadowsocks-rss","ShadowsocksR update rss, SSR organization https://github.com/shadowsocksr","N/A",0,0,"2017-08-07","https://github.com/kissggj123/shadowsocks-rss",true,402,"https://twitter.com/breakwa11"],
  ["shadowsocksr-csharp","","C#",1,0,"2017-08-07","https://github.com/kissggj123/shadowsocksr-csharp",true,7017,""],
  ["Nintendo_Switch_Reverse_Engineering","A look at inner workings of Joycon and Nintendo Switch","C",0,0,"2017-08-03","https://github.com/kissggj123/Nintendo_Switch_Reverse_Engineering",true,31264,""],
  ["LoungeChairAPI","","C#",0,1,"2017-08-03","https://github.com/kissggj123/LoungeChairAPI",false,15,""],
  ["LoungeChair","","C#",1,0,"2017-08-02","https://github.com/kissggj123/LoungeChair",true,16,""],
  ["xposed_art_n","ART module for a built-in enabled Xposed firmware based on AOSP 7","C++",0,0,"2017-08-01","https://github.com/kissggj123/xposed_art_n",true,5762,""],
  ["imewlconverter","\u4e00\u6b3e\u5f00\u6e90\u514d\u8d39\u7684\u8f93\u5165\u6cd5\u8bcd\u5e93\u8f6c\u6362\u7a0b\u5e8f","C#",0,0,"2017-06-06","https://github.com/kissggj123/imewlconverter",true,55380,""],
  ["Wenli.IEM","This is a simple C# version of the IEM, support for bubi input, pinyin input. \u8fd9\u662f\u4e00\u4e2a\u7b80\u5355C# \u7248\u8f93\u5165\u6cd5\uff0c\u652f\u6301\u4e94\u7b14\u8f93\u5165\u3001\u62fc\u97f3\u8f93\u5165\u3002","C#",0,0,"2017-06-06","https://github.com/kissggj123/Wenli.IEM",true,2711,""],
  ["meow","\u732b\u306e\u8f93\u5165\u6cd5\uff0c\u55b5\uff01","C++",0,0,"2017-06-06","https://github.com/kissggj123/meow",true,364,""],
  ["EternalRocks","EternalRocks worm","N/A",0,0,"2017-05-31","https://github.com/kissggj123/EternalRocks",true,20677,""],
  ["Go-Hosts","Go Hosts","N/A",0,0,"2017-05-11","https://github.com/kissggj123/Go-Hosts",true,119,"https://play.google.com/store/apps/details?id=com.lerist.go_hosts"],
  ["Route","A Script for you to setup VPN Server and Create Connection With your devices","N/A",1,0,"2017-03-05","https://github.com/kissggj123/Route",false,39,""],
  ["BaiduPanDownload","\u767e\u5ea6\u7f51\u76d8\u4e0d\u9650\u901f\u4e0b\u8f7d\u5de5\u5177","C#",0,0,"2016-12-18","https://github.com/kissggj123/BaiduPanDownload",true,248,""],
  ["setup-ipsec-vpn","Scripts to build your own IPsec VPN server, with IPsec/L2TP and Cisco IPsec on Ubuntu, Debian and CentOS","Shell",0,0,"2016-07-08","https://github.com/kissggj123/setup-ipsec-vpn",true,375,""],
  ["MineTraft","\u81ea\u5236MC\uff0c\u76ee\u524d\u5f00\u653eLinux\u5e73\u53f0","C",0,0,"2015-05-28","https://github.com/kissggj123/MineTraft",false,6721,""],
  ["WireLurkerCleaner-","","N/A",0,0,"2014-11-09","https://github.com/kissggj123/WireLurkerCleaner-",false,0,""]
    ];

    const _bcosLangColors = {
        'C#': '#178600', 'JavaScript': '#f1e05a', 'Python': '#3572A5', 'C++': '#f34b7d',
        'C': '#555555', 'Java': '#b07219', 'HTML': '#e34c26', 'Shell': '#89e051',
        'PHP': '#4F5D95', 'Ruby': '#701516', 'Swift': '#F05138', 'Dart': '#00B4AB',
        'TypeScript': '#3178c6', 'Objective-C': '#438eff', 'Go': '#00ADD8', 'ASP': '#6a40fd',
        'TeX': '#3D6117', 'Smarty': '#f0c040', 'MATLAB': '#e16737', 'Batchfile': '#C1F12E',
        'N/A': '#00ff41'
    };
    const _BCOS_VER = CONFIG.VERSION;
    const _BCOS_BUNNY_ART = `    /\\___/\\
   (  o o  )
   (  =^=  )
   /       \\
  /  ANGORA  \\
 /    RABBIT   \\
/_______________\\
   ||     ||
   ||     ||
   "_     _"`;
    let _bcosFS = {
        'me': { type: 'dir', children: {} },
        'repos': { type: 'dir', children: {} },
        'desktop': { type: 'dir', children: {
            'texteditor': { type: 'file', content: 'ELF 64-bit executable', executable: true },
            'browser': { type: 'file', content: 'ELF 64-bit executable', executable: true },
            'files': { type: 'file', content: 'ELF 64-bit executable', executable: true },
            'monitor': { type: 'file', content: 'ELF 64-bit executable', executable: true },
            'about': { type: 'file', content: 'ELF 64-bit executable', executable: true },
            'terminal': { type: 'file', content: 'ELF 64-bit executable', executable: true },
            'anniversary': { type: 'file', content: 'ELF 64-bit executable', executable: true },
            'carlock': { type: 'file', content: 'ELF 64-bit executable', executable: true },
        }}
    };
    // Root and me virtual file for anniversary
    _bcosFS['anniversary.txt'] = { type: 'file', get content() { return _bcosGenerateAnniversaryText(); } };
    // desktop/me references the same me folder
    _bcosFS.desktop.children.me = _bcosFS.me;
    let _bcosCwd = '~'; // Current working directory for cd command
    let _bcosEggState = { browseCount: 0, lastBrowseTime: 0, eggTriggered: false, systemEditLock: false, userCreatedEditLock: false };
    let _bcosMonitorTimer = null;
    let _bcosOOBEStep = 0;
    let _bcosTeHlTimer = null;
    let _bcos = { history: [], histIdx: -1, mode: 'boot', winZ: 100, wins: {}, clockInterval: null };

        function _bcosInjectCSS() {
        // 模块化拆分: 样式已移至 css/car-lockscreen-a.css 与 css/car-lockscreen-b.css, 通过 <link> 预加载; 保留空实现以兼容历史调用点
        return;
    }

    function _bcosApplyThemeStyle() {
        const ov = document.getElementById('bcos-overlay');
        if (!ov || !ov.classList.contains('active')) return;
        const theme = document.documentElement.getAttribute('data-theme') || 'bunny';
        const t = CONFIG.THEMES.find(t => t.id === theme);
        if (!t) return;
        const c1 = t.colors[0], c2 = t.colors[1], c3 = t.colors[2];
        ov.style.background = c1.startsWith('#') && c1.length <= 7 ? c1 : '#0a0a0a';
        if (theme === 'matrix' || theme === 'starlight' || theme === 'aurora' || theme === 'galaxy' || theme === 'cyber') {
            ov.style.background = '#0a0a0a';
        }
        const out = document.getElementById('bcos-output');
        if (out) out.style.color = c2;
        if (_bcos.mode === 'desktop') {
            _bcosLaunchDesktop();
        }
    }

    function _bcosEscape(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&#34;'); }

    // ===== Path resolution for cd/ls/pwd commands =====
    